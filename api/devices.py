from flask import Blueprint, request, g
from api.utils import api_response
from api.decorators import jwt_required

devices_bp = Blueprint('devices', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@devices_bp.route('', methods=['POST'])
@jwt_required
def register_device():
    """Register or update FCM device token for push notifications."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form
    fcm_token = data.get('fcm_token', '').strip()
    platform = data.get('platform', 'unknown').strip().lower()

    if not fcm_token:
        return api_response(error={"code": "VALIDATION_ERROR", "message": "fcm_token is required"}, status_code=400)

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        # Delete existing token entry if it exists, then insert new one
        # This approach works in both MySQL and SQLite
        cursor.execute("DELETE FROM device_tokens WHERE fcm_token = %s", (fcm_token,))
        cursor.execute(
            """INSERT INTO device_tokens (user_id, fcm_token, platform)
               VALUES (%s, %s, %s)""",
            (user_id, fcm_token, platform)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Device registered successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@devices_bp.route('/<path:token>', methods=['DELETE'])
@jwt_required
def unregister_device(token):
    """Unregister FCM device token."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM device_tokens WHERE fcm_token = %s AND user_id = %s", (token, user_id))
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Device unregistered successfully"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
