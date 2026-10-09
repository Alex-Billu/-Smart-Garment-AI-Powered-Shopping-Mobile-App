from flask import Blueprint, request, g
from api.utils import api_response, sanitize_db_list
from api.decorators import jwt_required

notifications_bp = Blueprint('notifications', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

@notifications_bp.route('', methods=['GET'])
@jwt_required
def get_notifications():
    """Fetch user's notifications list and unread count."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM notifications WHERE user_id = %s ORDER BY id DESC LIMIT 50",
            (user_id,)
        )
        notifications = cursor.fetchall()

        cursor.execute(
            "SELECT COUNT(*) as unread FROM notifications WHERE user_id = %s AND is_read = 0",
            (user_id,)
        )
        row = cursor.fetchone()
        unread_count = row.get('unread', 0) if isinstance(row, dict) else (row[0] if row else 0)
        cursor.close()
        conn.close()

        return api_response(
            data={
                "notifications": sanitize_db_list(notifications),
                "unread_count": unread_count
            }
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required
def mark_as_read(notification_id):
    """Mark a single notification as read."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s", (notification_id, user_id))
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Notification marked as read"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required
def mark_all_as_read():
    """Mark all notifications as read for current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "All notifications marked as read"})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
