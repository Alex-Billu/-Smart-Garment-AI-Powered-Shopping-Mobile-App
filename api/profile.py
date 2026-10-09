from flask import Blueprint, request, g
from werkzeug.security import check_password_hash, generate_password_hash
from api.utils import api_response, sanitize_db_dict
from api.decorators import jwt_required

profile_bp = Blueprint('profile', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@profile_bp.route('', methods=['GET'])
@jwt_required
def get_profile():
    """Fetch current user's profile details."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, phone, role, address, city, state, pincode, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return api_response(error={"code": "NOT_FOUND", "message": "User profile not found"}, status_code=404)

        return api_response(data={"user": sanitize_db_dict(user)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@profile_bp.route('', methods=['PUT'])
@jwt_required
def update_profile():
    """Update current user's profile details."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    city = data.get('city', '').strip()
    state = data.get('state', '').strip()
    pincode = data.get('pincode', '').strip()

    if not name or not phone:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Name and phone number are required"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """UPDATE users SET name = %s, phone = %s, address = %s, city = %s, state = %s, pincode = %s
               WHERE id = %s""",
            (name, phone, address, city, state, pincode, user_id)
        )
        conn.commit()

        cursor.execute("SELECT id, name, email, phone, role, address, city, state, pincode, created_at FROM users WHERE id = %s", (user_id,))
        updated_user = cursor.fetchone()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Profile updated successfully", "user": sanitize_db_dict(updated_user)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@profile_bp.route('/change-password', methods=['POST'])
@jwt_required
def change_password():
    """Change current user's password."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form

    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password or len(new_password) < 6:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Current password and new password (min 6 chars) are required"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password'], current_password):
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "INVALID_PASSWORD", "message": "Current password is incorrect"},
                status_code=400
            )

        hashed_pw = generate_password_hash(new_password)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_pw, user_id))
        # Revoke existing refresh tokens except active session
        cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Password changed successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
