from flask import Blueprint, request, g
from api.utils import api_response, sanitize_db_dict, sanitize_db_list
from api.decorators import jwt_required

orders_bp = Blueprint('orders', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@orders_bp.route('/checkout', methods=['POST'])
@jwt_required
def checkout():
    """Place order from cart using DB transaction with stock verification."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form
    address = data.get('address', '').strip()
    city = data.get('city', '').strip()
    state = data.get('state', '').strip()
    pincode = data.get('pincode', '').strip()
    phone = data.get('phone', '').strip()
    payment_method = data.get('payment_method', 'COD').strip()

    errors = {}
    if not address:
        errors['address'] = 'Address is required'
    if not city:
        errors['city'] = 'City is required'
    if not state:
        errors['state'] = 'State is required'
    if not pincode:
        errors['pincode'] = 'Pincode is required'
    if not phone:
        errors['phone'] = 'Phone number is required'

    if errors:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Missing shipping fields", "fields": errors},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    # Disable autocommit for atomic transaction
    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch cart items
        cursor.execute(
            """SELECT c.id as cart_id, c.product_id, c.size, c.quantity, p.name as product_name, p.price, p.stock
               FROM cart c
               JOIN products p ON c.product_id = p.id
               WHERE c.user_id = %s FOR UPDATE""",
            (user_id,)
        )
        cart_items = cursor.fetchall()

        if not cart_items:
            conn.rollback()
            cursor.close()
            conn.close()
            return api_response(error={"code": "EMPTY_CART", "message": "Your cart is empty"}, status_code=400)

        # Validate stock for each item
        total_amount = 0.0
        for item in cart_items:
            if item['stock'] < item['quantity']:
                conn.rollback()
                cursor.close()
                conn.close()
                return api_response(
                    error={
                        "code": "OUT_OF_STOCK",
                        "message": f"Insufficient stock for '{item['product_name']}'. Available: {item['stock']}, Requested: {item['quantity']}"
                    },
                    status_code=400
                )
            total_amount += float(item['price']) * item['quantity']

        # Insert order record
        cursor.execute(
            """INSERT INTO orders (user_id, total_amount, address, city, state, pincode, phone, payment_method, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')""",
            (user_id, total_amount, address, city, state, pincode, phone, payment_method)
        )
        order_id = cursor.lastrowid

        # Insert order_items and update product stock
        for item in cart_items:
            cursor.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, size, quantity, price)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (order_id, item['product_id'], item['product_name'], item['size'], item['quantity'], item['price'])
            )
            cursor.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (item['quantity'], item['product_id'])
            )

        # Clear cart
        cursor.execute("DELETE FROM cart WHERE user_id = %s", (user_id,))

        conn.commit()
        cursor.close()
        conn.close()

        # Try triggering socket / notification emission if available
        try:
            from api.realtime import notify_order_created
            notify_order_created(order_id, user_id, total_amount)
        except Exception:
            pass

        return api_response(
            data={
                "message": "Order placed successfully",
                "order_id": order_id,
                "total_amount": round(total_amount, 2),
                "status": "Pending"
            },
            status_code=201
        )

    except Exception as e:
        conn.rollback()
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@orders_bp.route('', methods=['GET'])
@jwt_required
def list_orders():
    """List all orders placed by current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY id DESC", (user_id,))
        orders = cursor.fetchall()

        sanitized_orders = sanitize_db_list(orders)

        # Attach item counts to orders
        for order in sanitized_orders:
            cursor.execute("SELECT COUNT(*) as item_count, SUM(quantity) as total_qty FROM order_items WHERE order_id = %s", (order['id'],))
            item_stats = cursor.fetchone()
            order['item_count'] = item_stats['item_count'] if item_stats else 0
            order['total_quantity'] = int(item_stats['total_qty']) if item_stats and item_stats['total_qty'] else 0

        cursor.close()
        conn.close()

        return api_response(data={"orders": sanitized_orders})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required
def get_order_detail(order_id):
    """Get detailed information for a specific order."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE id = %s AND user_id = %s", (order_id, user_id))
        order = cursor.fetchone()

        if not order:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Order not found"}, status_code=404)

        cursor.execute(
            """SELECT oi.*, p.image FROM order_items oi
               LEFT JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = %s""",
            (order_id,)
        )
        items = cursor.fetchall()
        cursor.close()
        conn.close()

        sanitized_order = sanitize_db_dict(order)
        sanitized_order['items'] = sanitize_db_list(items)

        return api_response(data={"order": sanitized_order})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@orders_bp.route('/<int:order_id>/cancel', methods=['POST'])
@jwt_required
def cancel_order(order_id):
    """Cancel order if it is in 'Pending' status and restore stock."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    conn.autocommit = False
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE id = %s AND user_id = %s FOR UPDATE", (order_id, user_id))
        order = cursor.fetchone()

        if not order:
            conn.rollback()
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Order not found"}, status_code=404)

        if order['status'] != 'Pending':
            conn.rollback()
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "CANNOT_CANCEL", "message": f"Order with status '{order['status']}' cannot be cancelled"},
                status_code=400
            )

        # Update order status to Cancelled
        cursor.execute("UPDATE orders SET status = 'Cancelled' WHERE id = %s", (order_id,))

        # Restore product stock
        cursor.execute("SELECT product_id, quantity FROM order_items WHERE order_id = %s", (order_id,))
        items = cursor.fetchall()
        for item in items:
            if item['product_id']:
                cursor.execute("UPDATE products SET stock = stock + %s WHERE id = %s", (item['quantity'], item['product_id']))

        conn.commit()
        cursor.close()
        conn.close()

        try:
            from api.realtime import notify_order_status_changed
            notify_order_status_changed(order_id, user_id, 'Cancelled')
        except Exception:
            pass

        return api_response(data={"message": "Order cancelled successfully", "order_id": order_id, "status": "Cancelled"})
    except Exception as e:
        conn.rollback()
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
