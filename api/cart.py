from flask import Blueprint, request, g
from api.utils import api_response, sanitize_db_list
from api.decorators import jwt_required

cart_bp = Blueprint('cart', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@cart_bp.route('', methods=['GET'])
@jwt_required
def get_cart():
    """Fetch user's active shopping cart items and total."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT c.id as cart_id, c.user_id, c.product_id, c.size, c.quantity,
                      p.name as product_name, p.price, p.image, p.stock, p.category
               FROM cart c
               JOIN products p ON c.product_id = p.id
               WHERE c.user_id = %s ORDER BY c.id DESC""",
            (user_id,)
        )
        items = cursor.fetchall()
        cursor.close()
        conn.close()

        sanitized_items = sanitize_db_list(items)
        subtotal = sum(item['price'] * item['quantity'] for item in sanitized_items)

        return api_response(
            data={
                "items": sanitized_items,
                "summary": {
                    "total_items": sum(item['quantity'] for item in sanitized_items),
                    "subtotal": round(subtotal, 2)
                }
            }
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@cart_bp.route('/add', methods=['POST'])
@jwt_required
def add_to_cart():
    """Add a product item to user's cart."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form
    product_id = data.get('product_id', type=int)
    size = data.get('size', '').strip().upper()
    quantity = data.get('quantity', 1, type=int)

    if not product_id or not size or quantity <= 0:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "product_id, size, and quantity (> 0) are required"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        # Check product stock
        cursor.execute("SELECT id, name, price, stock, sizes FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()

        if not product:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Product not found"}, status_code=404)

        if product['stock'] < quantity:
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "OUT_OF_STOCK", "message": f"Only {product['stock']} items available in stock"},
                status_code=400
            )

        # Check existing item in cart
        cursor.execute(
            "SELECT id, quantity FROM cart WHERE user_id = %s AND product_id = %s AND size = %s",
            (user_id, product_id, size)
        )
        existing = cursor.fetchone()

        if existing:
            new_qty = existing['quantity'] + quantity
            if new_qty > product['stock']:
                cursor.close()
                conn.close()
                return api_response(
                    error={"code": "OUT_OF_STOCK", "message": f"Cannot add. Total cart quantity exceeds stock ({product['stock']})"},
                    status_code=400
                )
            cursor.execute("UPDATE cart SET quantity = %s WHERE id = %s", (new_qty, existing['id']))
            cart_id = existing['id']
        else:
            cursor.execute(
                "INSERT INTO cart (user_id, product_id, size, quantity) VALUES (%s, %s, %s, %s)",
                (user_id, product_id, size, quantity)
            )
            cart_id = cursor.lastrowid

        conn.commit()
        cursor.close()
        conn.close()

        return api_response(
            data={"message": "Item added to cart", "cart_id": cart_id},
            status_code=201
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@cart_bp.route('/update', methods=['PUT'])
@jwt_required
def update_cart_item():
    """Update item quantity or size in cart."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form
    cart_id = data.get('cart_id', type=int)
    quantity = data.get('quantity', type=int)
    size = data.get('size', '').strip().upper() if data.get('size') else None

    if not cart_id:
        return api_response(error={"code": "VALIDATION_ERROR", "message": "cart_id is required"}, status_code=400)

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT c.*, p.stock FROM cart c
               JOIN products p ON c.product_id = p.id
               WHERE c.id = %s AND c.user_id = %s""",
            (cart_id, user_id)
        )
        cart_item = cursor.fetchone()

        if not cart_item:
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Cart item not found"}, status_code=404)

        if quantity is not None:
            if quantity <= 0:
                cursor.execute("DELETE FROM cart WHERE id = %s", (cart_id,))
                conn.commit()
                cursor.close()
                conn.close()
                return api_response(data={"message": "Item removed from cart"})
            elif quantity > cart_item['stock']:
                cursor.close()
                conn.close()
                return api_response(
                    error={"code": "OUT_OF_STOCK", "message": f"Requested quantity exceeds available stock ({cart_item['stock']})"},
                    status_code=400
                )
            cursor.execute("UPDATE cart SET quantity = %s WHERE id = %s", (quantity, cart_id))

        if size:
            cursor.execute("UPDATE cart SET size = %s WHERE id = %s", (size, cart_id))

        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Cart item updated successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@cart_bp.route('/remove/<int:cart_id>', methods=['DELETE'])
@jwt_required
def remove_from_cart(cart_id):
    """Remove single item from cart."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM cart WHERE id = %s AND user_id = %s", (cart_id, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return api_response(data={"message": "Item removed from cart"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@cart_bp.route('/clear', methods=['DELETE'])
@jwt_required
def clear_cart():
    """Clear all items from user's cart."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM cart WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return api_response(data={"message": "Cart cleared successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
