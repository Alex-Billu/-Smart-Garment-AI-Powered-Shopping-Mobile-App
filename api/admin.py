import os
from flask import Blueprint, request, g, current_app
from werkzeug.utils import secure_filename
from api.utils import api_response, sanitize_db_dict, sanitize_db_list, check_rate_limit
from api.decorators import jwt_required, role_required

admin_bp = Blueprint('admin', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required
@role_required('admin')
def get_dashboard_metrics():
    """Fetch administrative metrics, analytics, and overview summary."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        # Total revenue
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status != 'Cancelled'")
        total_revenue = float(cursor.fetchone()['total_revenue'])

        # Total orders count
        cursor.execute("SELECT COUNT(*) as total_orders FROM orders")
        total_orders = cursor.fetchone()['total_orders']

        # Total customers count
        cursor.execute("SELECT COUNT(*) as total_users FROM users WHERE role = 'user'")
        total_users = cursor.fetchone()['total_users']

        # Low stock count (< 10)
        cursor.execute("SELECT COUNT(*) as low_stock FROM products WHERE stock < 10")
        low_stock_count = cursor.fetchone()['low_stock']

        # Orders by status
        cursor.execute("SELECT status, COUNT(*) as count FROM orders GROUP BY status")
        status_counts = {r['status']: r['count'] for r in cursor.fetchall()}

        # Recent 5 orders
        cursor.execute(
            """SELECT o.*, u.name as user_name, u.email as user_email
               FROM orders o JOIN users u ON o.user_id = u.id
               ORDER BY o.id DESC LIMIT 5"""
        )
        recent_orders = cursor.fetchall()

        # Low stock items list
        cursor.execute("SELECT id, name, category, stock, price FROM products WHERE stock < 10 ORDER BY stock ASC LIMIT 5")
        low_stock_items = cursor.fetchall()

        cursor.close()
        conn.close()

        return api_response(
            data={
                "metrics": {
                    "total_revenue": round(total_revenue, 2),
                    "total_orders": total_orders,
                    "total_customers": total_users,
                    "low_stock_count": low_stock_count,
                    "orders_by_status": status_counts
                },
                "recent_orders": sanitize_db_list(recent_orders),
                "low_stock_items": sanitize_db_list(low_stock_items)
            }
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/products', methods=['POST'])
@jwt_required
@role_required('admin')
def create_product():
    """Create a new product catalog item with image upload."""
    name = request.form.get('name', '').strip() or (request.json.get('name') if request.is_json else '')
    category = request.form.get('category', '').strip() or (request.json.get('category') if request.is_json else '')
    description = request.form.get('description', '').strip() or (request.json.get('description') if request.is_json else '')
    price = request.form.get('price', type=float) or (request.json.get('price') if request.is_json else None)
    sizes = request.form.get('sizes', '').strip() or (request.json.get('sizes') if request.is_json else '')
    stock = request.form.get('stock', type=int) or (request.json.get('stock') if request.is_json else 0)

    if not name or not category or price is None or not sizes:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "name, category, price, and sizes are required"},
            status_code=400
        )

    filename = 'default_product.jpg'
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            sec_filename = secure_filename(file.filename)
            filename = f"{int(request.date or 0)}_{sec_filename}"
            upload_path = os.path.join(current_app.root_path, 'static', 'images', filename)
            file.save(upload_path)
    elif request.is_json and request.json.get('image'):
        filename = request.json.get('image')

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO products (name, category, description, price, image, sizes, stock)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (name, category, description, price, filename, sizes, stock)
        )
        product_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        new_product = cursor.fetchone()
        cursor.close()
        conn.close()

        try:
            from api.realtime import notify_product_created
            notify_product_created(sanitize_db_dict(new_product))
        except Exception:
            pass

        return api_response(
            data={"message": "Product created successfully", "product": sanitize_db_dict(new_product)},
            status_code=201
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/products/<int:product_id>', methods=['PUT'])
@jwt_required
@role_required('admin')
def update_product(product_id):
    """Update existing product details."""
    data = request.get_json(silent=True) or request.form
    name = data.get('name', '').strip()
    category = data.get('category', '').strip()
    description = data.get('description', '').strip()
    price = data.get('price', type=float)
    sizes = data.get('sizes', '').strip()
    stock = data.get('stock', type=int)

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
        if not product:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Product not found"}, status_code=404)

        up_name = name if name else product['name']
        up_category = category if category else product['category']
        up_description = description if description else product['description']
        up_price = price if price is not None else product['price']
        up_sizes = sizes if sizes else product['sizes']
        up_stock = stock if stock is not None else product['stock']
        up_image = product['image']

        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                sec_filename = secure_filename(file.filename)
                up_image = f"{int(request.date or 0)}_{sec_filename}"
                upload_path = os.path.join(current_app.root_path, 'static', 'images', up_image)
                file.save(upload_path)

        cursor.execute(
            """UPDATE products SET name = %s, category = %s, description = %s, price = %s, sizes = %s, stock = %s, image = %s
               WHERE id = %s""",
            (up_name, up_category, up_description, up_price, up_sizes, up_stock, up_image, product_id)
        )
        conn.commit()

        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        updated_product = cursor.fetchone()
        cursor.close()
        conn.close()

        try:
            from api.realtime import notify_product_updated
            notify_product_updated(sanitize_db_dict(updated_product))
        except Exception:
            pass

        return api_response(data={"message": "Product updated successfully", "product": sanitize_db_dict(updated_product)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required
@role_required('admin')
def delete_product(product_id):
    """Delete a product item."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()

        if affected == 0:
            return api_response(error={"code": "NOT_FOUND", "message": "Product not found"}, status_code=404)

        try:
            from api.realtime import notify_product_deleted
            notify_product_deleted(product_id)
        except Exception:
            pass

        return api_response(data={"message": "Product deleted successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/orders', methods=['GET'])
@jwt_required
@role_required('admin')
def list_all_orders():
    """List all orders with optional status filter."""
    status_filter = request.args.get('status', '').strip()
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        if status_filter:
            cursor.execute(
                """SELECT o.*, u.name as user_name, u.email as user_email
                   FROM orders o JOIN users u ON o.user_id = u.id
                   WHERE o.status = %s ORDER BY o.id DESC""",
                (status_filter,)
            )
        else:
            cursor.execute(
                """SELECT o.*, u.name as user_name, u.email as user_email
                   FROM orders o JOIN users u ON o.user_id = u.id
                   ORDER BY o.id DESC"""
            )
        orders = cursor.fetchall()
        cursor.close()
        conn.close()

        return api_response(data={"orders": sanitize_db_list(orders)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required
@role_required('admin')
def update_order_status(order_id):
    """Update order status (Pending, Confirmed, Shipped, Delivered, Cancelled)."""
    data = request.get_json(silent=True) or request.form
    new_status = data.get('status', '').strip()
    VALID_STATUSES = {'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'}

    if not new_status or new_status not in VALID_STATUSES:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": f"Valid status is required: {', '.join(VALID_STATUSES)}"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        if not order:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Order not found"}, status_code=404)

        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, order_id))
        conn.commit()

        cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        updated_order = cursor.fetchone()
        cursor.close()
        conn.close()

        try:
            from api.realtime import notify_order_status_changed
            notify_order_status_changed(order_id, updated_order['user_id'], new_status)
        except Exception:
            pass

        return api_response(data={"message": "Order status updated successfully", "order": sanitize_db_dict(updated_order)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/users', methods=['GET'])
@jwt_required
@role_required('admin')
def list_users():
    """List all registered users."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, phone, role, address, city, state, pincode, created_at FROM users ORDER BY id DESC")
        users = cursor.fetchall()
        cursor.close()
        conn.close()

        return api_response(data={"users": sanitize_db_list(users)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required
@role_required('admin')
def delete_user(user_id):
    """Delete a user account."""
    if g.current_user['id'] == user_id:
        return api_response(error={"code": "FORBIDDEN", "message": "You cannot delete your own admin account"}, status_code=403)

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()

        if affected == 0:
            return api_response(error={"code": "NOT_FOUND", "message": "User not found"}, status_code=404)

        return api_response(data={"message": "User account deleted successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/reviews', methods=['GET'])
@jwt_required
@role_required('admin')
def list_all_reviews():
    """List all customer reviews for administrative moderation."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT r.*, u.name as user_name, u.email as user_email, p.name as product_name
               FROM reviews r
               JOIN users u ON r.user_id = u.id
               JOIN products p ON r.product_id = p.id
               ORDER BY r.id DESC"""
        )
        reviews = cursor.fetchall()
        cursor.close()
        conn.close()

        return api_response(data={"reviews": sanitize_db_list(reviews)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@admin_bp.route('/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required
@role_required('admin')
def delete_review(review_id):
    """Delete/moderate a customer review."""
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()

        if affected == 0:
            return api_response(error={"code": "NOT_FOUND", "message": "Review not found"}, status_code=404)

        return api_response(data={"message": "Customer review deleted successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
