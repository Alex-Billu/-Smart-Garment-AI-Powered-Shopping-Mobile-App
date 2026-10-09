from flask import Blueprint, request, g
from api.utils import api_response, sanitize_db_dict, sanitize_db_list
from api.decorators import jwt_required

reviews_bp = Blueprint('reviews', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@reviews_bp.route('', methods=['POST'])
@jwt_required
def create_review():
    """Submit a review for a product."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form

    product_id = data.get('product_id', type=int)
    rating = data.get('rating', type=int)
    review_text = data.get('review', '').strip()

    if not product_id or not rating or rating < 1 or rating > 5:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "product_id and rating (1-5) are required"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM products WHERE id = %s", (product_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return api_response(error={"code": "NOT_FOUND", "message": "Product not found"}, status_code=404)

        cursor.execute(
            """INSERT INTO reviews (user_id, product_id, rating, review)
               VALUES (%s, %s, %s, %s)""",
            (user_id, product_id, rating, review_text)
        )
        review_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM reviews WHERE id = %s", (review_id,))
        new_review = cursor.fetchone()
        cursor.close()
        conn.close()

        return api_response(
            data={"message": "Review submitted successfully", "review": sanitize_db_dict(new_review)},
            status_code=201
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@reviews_bp.route('/my', methods=['GET'])
@jwt_required
def get_my_reviews():
    """List reviews written by current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT r.*, p.name as product_name, p.image as product_image
               FROM reviews r
               JOIN products p ON r.product_id = p.id
               WHERE r.user_id = %s ORDER BY r.id DESC""",
            (user_id,)
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

@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required
def delete_my_review(review_id):
    """Delete a review written by current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM reviews WHERE id = %s AND user_id = %s", (review_id, user_id))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()

        if affected == 0:
            return api_response(error={"code": "NOT_FOUND", "message": "Review not found or unauthorized"}, status_code=404)

        return api_response(data={"message": "Review deleted successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
