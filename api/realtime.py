import os
import json
import logging
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

# Initialize SocketIO instance
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")

# Initialize Firebase Admin SDK if credentials provided in environment
_firebase_initialized = False
firebase_cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
firebase_cred_json = os.getenv('FIREBASE_CREDENTIALS_JSON')

try:
    if firebase_cred_path and os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        print("[FIREBASE] Initialized Firebase Admin from file path.")
    elif firebase_cred_json:
        cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        print("[FIREBASE] Initialized Firebase Admin from JSON env.")
    else:
        print("[FIREBASE] No Firebase credentials found. Push notifications will use in-app DB store and log output.")
except Exception as e:
    print(f"[FIREBASE] Warning: Failed to initialize Firebase Admin: {e}")

def get_db():
    from app import get_db_connection
    return get_db_connection()

# -----------------------------------------------------
# SocketIO Connection Handlers
# -----------------------------------------------------
@socketio.on('connect')
def handle_connect(auth=None):
    """
    Client connection handler.
    Authenticates socket client using JWT token passed in auth dict or query parameter.
    Joins rooms: user_<id> and role_<role>
    """
    token = None
    if isinstance(auth, dict):
        token = auth.get('token')
    if not token:
        token = request.args.get('token')
    if not token and request.headers.get('Authorization'):
        parts = request.headers.get('Authorization').split()
        if len(parts) == 2:
            token = parts[1]

    if not token:
        logger.warning("[SOCKET] Connection attempt without auth token.")
        # Allow connection but place in guest room
        join_room("guest")
        emit('connected', {'status': 'connected', 'user_id': None, 'role': 'guest'})
        return

    from api.utils import decode_access_token
    payload, err = decode_access_token(token)
    if err or not payload:
        logger.warning(f"[SOCKET] Connection auth failed: {err}")
        emit('error', {'message': 'Authentication failed'})
        return False

    user_id = payload['user_id']
    role = payload['role']

    # Join specific user room and role room
    user_room = f"user_{user_id}"
    role_room = f"role_{role}"
    join_room(user_room)
    join_room(role_room)

    print(f"[SOCKET] Client connected: user_id={user_id}, role={role}, joined rooms=[{user_room}, {role_room}]")
    emit('connected', {'status': 'connected', 'user_id': user_id, 'role': role})

@socketio.on('disconnect')
def handle_disconnect():
    print("[SOCKET] Client disconnected")

@socketio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': os.environ.get('PORT', '5000')})

# -----------------------------------------------------
# Helper: Send Push Notification (FCM + DB)
# -----------------------------------------------------
def send_notification(user_id, title, body, data=None):
    """
    1. Saves notification record in `notifications` DB table.
    2. Sends FCM push notification to registered device tokens for user_id.
    3. Emits socket event to user_<user_id> room for immediate UI toast update.
    """
    conn = get_db()
    if not conn:
        return

    cursor = conn.cursor(dictionary=True)
    try:
        # Save in DB
        data_json = json.dumps(data) if data else None
        cursor.execute(
            "INSERT INTO notifications (user_id, title, body, data) VALUES (%s, %s, %s, %s)",
            (user_id, title, body, data_json)
        )
        conn.commit()
        notif_id = cursor.lastrowid

        # Emit socket event to active online user
        socketio.emit('notification.new', {
            'id': notif_id,
            'title': title,
            'body': body,
            'data': data
        }, to=f"user_{user_id}")

        # Fetch FCM tokens for user
        cursor.execute("SELECT fcm_token FROM device_tokens WHERE user_id = %s", (user_id,))
        token_rows = cursor.fetchall()
        cursor.close()
        conn.close()

        fcm_tokens = [r['fcm_token'] for r in token_rows if r['fcm_token']]

        if fcm_tokens:
            if _firebase_initialized:
                try:
                    str_data = {k: str(v) for k, v in (data or {}).items()}
                    message = messaging.MulticastMessage(
                        notification=messaging.Notification(title=title, body=body),
                        data=str_data,
                        tokens=fcm_tokens
                    )
                    response = messaging.send_multicast(message)
                    print(f"[FIREBASE] Sent push to {len(fcm_tokens)} devices. Success count: {response.success_count}")
                except Exception as fe:
                    print(f"[FIREBASE] Error sending push notification: {fe}")
            else:
                print(f"[PUSH LOG] Simulated Push to user {user_id} (tokens: {len(fcm_tokens)}): Title='{title}' Body='{body}'")

    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        print(f"[NOTIFICATION ERROR] {e}")

def send_admin_notification(title, body, data=None):
    """Sends notification to all admin users."""
    conn = get_db()
    if not conn:
        return
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE role = 'admin'")
        admins = cursor.fetchall()
        cursor.close()
        conn.close()

        for admin in admins:
            send_notification(admin['id'], title, body, data)
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        print(f"[ADMIN NOTIFICATION ERROR] {e}")

# -----------------------------------------------------
# Realtime Event Dispatchers
# -----------------------------------------------------
def notify_order_created(order_id, user_id, total_amount):
    """Triggered on new order placement."""
    event_data = {
        'order_id': order_id,
        'user_id': user_id,
        'total_amount': float(total_amount),
        'status': 'Pending'
    }
    # Emit socket events to user and admin room
    socketio.emit('order.created', event_data, to=f"user_{user_id}")
    socketio.emit('order.created', event_data, to="role_admin")

    # Push to admins
    send_admin_notification(
        title="🛒 New Order Received!",
        body=f"Order #{order_id} placed for ₹{total_amount:.2f}",
        data={'type': 'order_created', 'order_id': order_id}
    )

def notify_order_status_changed(order_id, user_id, status):
    """Triggered when admin updates order status."""
    event_data = {
        'order_id': order_id,
        'user_id': user_id,
        'status': status
    }
    socketio.emit('order.status_changed', event_data, to=f"user_{user_id}")
    socketio.emit('order.status_changed', event_data, to="role_admin")

    # Send push notification to customer
    send_notification(
        user_id=user_id,
        title=f"📦 Order #{order_id} Update",
        body=f"Your order status is now: {status}",
        data={'type': 'order_status', 'order_id': order_id, 'status': status}
    )

def notify_product_created(product_dict):
    """Triggered when new product is added."""
    socketio.emit('product.created', {'product': product_dict})

def notify_product_updated(product_dict):
    """Triggered when product details or stock is updated."""
    socketio.emit('product.updated', {'product': product_dict})

    # Check for low stock notification
    if product_dict.get('stock', 99) < 10:
        send_admin_notification(
            title="⚠️ Low Stock Warning",
            body=f"Product '{product_dict.get('name')}' stock is low ({product_dict.get('stock')} left).",
            data={'type': 'low_stock', 'product_id': product_dict.get('id')}
        )

def notify_product_deleted(product_id):
    """Triggered when product is removed."""
    socketio.emit('product.deleted', {'product_id': product_id})

def notify_cart_updated(user_id):
    """Triggered on cart updates."""
    socketio.emit('cart.updated', {'user_id': user_id}, to=f"user_{user_id}")

def notify_review_created(review_dict):
    """Triggered when review is submitted."""
    socketio.emit('review.created', {'review': review_dict})

def notify_review_deleted(review_id):
    """Triggered when review is removed."""
    socketio.emit('review.deleted', {'review_id': review_id})
