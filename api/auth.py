import datetime
from flask import Blueprint, request, g
from werkzeug.security import generate_password_hash, check_password_hash
from api.utils import (
    api_response, generate_access_token, generate_refresh_token,
    hash_token, check_rate_limit, sanitize_db_dict,
    REFRESH_TOKEN_EXPIRES_DAYS
)
from api.decorators import jwt_required

auth_bp = Blueprint('auth', __name__)

# Import get_db_connection lazily inside routes to avoid import loops with app.py
def get_db():
    from app import get_db_connection
    return get_db_connection()

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new customer account."""
    data = request.get_json(silent=True) or request.form
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    address = data.get('address', '').strip()
    city = data.get('city', '').strip()
    state = data.get('state', '').strip()
    pincode = data.get('pincode', '').strip()

    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    if not email or '@' not in email:
        errors['email'] = 'Valid email is required'
    if not phone:
        errors['phone'] = 'Phone number is required'
    if not password or len(password) < 6:
        errors['password'] = 'Password must be at least 6 characters'

    if errors:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Invalid registration data", "fields": errors},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "EMAIL_EXISTS", "message": "An account with this email already exists"},
                status_code=409
            )

        hashed_pw = generate_password_hash(password)
        cursor.execute(
            """INSERT INTO users (name, email, phone, password, role, address, city, state, pincode)
               VALUES (%s, %s, %s, %s, 'user', %s, %s, %s, %s)""",
            (name, email, phone, hashed_pw, address, city, state, pincode)
        )
        user_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT id, name, email, phone, role, address, city, state, pincode, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        access_token = generate_access_token(user['id'], user['email'], user['role'])
        refresh_token = generate_refresh_token()
        
        # Save refresh token in DB
        conn2 = get_db()
        if conn2:
            c2 = conn2.cursor()
            exp = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRES_DAYS)
            c2.execute(
                "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                (user['id'], hash_token(refresh_token), exp)
            )
            conn2.commit()
            c2.close()
            conn2.close()

        return api_response(
            data={
                "user": sanitize_db_dict(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": 900
            },
            status_code=201
        )
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate customer/admin user and issue JWT tokens."""
    data = request.get_json(silent=True) or request.form
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    client_ip = request.remote_addr or 'unknown'
    rate_key = f"login:{client_ip}:{email}"
    if not check_rate_limit(rate_key, max_attempts=5, window_seconds=300):
        return api_response(
            error={"code": "TOO_MANY_REQUESTS", "message": "Too many failed login attempts. Please try again in 5 minutes."},
            status_code=429
        )

    if not email or not password:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Email and password are required"},
            status_code=400
        )

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user or not check_password_hash(user['password'], password):
            return api_response(
                error={"code": "INVALID_CREDENTIALS", "message": "Invalid email address or password"},
                status_code=401
            )

        access_token = generate_access_token(user['id'], user['email'], user['role'])
        refresh_token = generate_refresh_token()

        conn2 = get_db()
        if conn2:
            c2 = conn2.cursor()
            exp = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRES_DAYS)
            c2.execute(
                "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                (user['id'], hash_token(refresh_token), exp)
            )
            conn2.commit()
            c2.close()
            conn2.close()

        user_data = {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone'],
            "role": user['role'],
            "address": user.get('address'),
            "city": user.get('city'),
            "state": user.get('state'),
            "pincode": user.get('pincode'),
            "created_at": user.get('created_at')
        }

        return api_response(
            data={
                "user": sanitize_db_dict(user_data),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": 900
            }
        )
    except Exception as e:
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Rotate refresh token and issue new access token."""
    data = request.get_json(silent=True) or request.form
    refresh_token = data.get('refresh_token', '').strip()

    if not refresh_token:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "refresh_token is required"},
            status_code=400
        )

    t_hash = hash_token(refresh_token)
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT rt.*, u.email, u.role FROM refresh_tokens rt
               JOIN users u ON rt.user_id = u.id
               WHERE rt.token_hash = %s AND rt.revoked = 0 AND rt.expires_at > CURRENT_TIMESTAMP""",
            (t_hash,)
        )
        token_rec = cursor.fetchone()

        if not token_rec:
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "INVALID_REFRESH_TOKEN", "message": "Refresh token is invalid, revoked, or expired"},
                status_code=401
            )

        # Revoke old refresh token (rotation)
        cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE id = %s", (token_rec['id'],))

        # Generate new tokens
        user_id = token_rec['user_id']
        email = token_rec['email']
        role = token_rec['role']

        new_access_token = generate_access_token(user_id, email, role)
        new_refresh_token = generate_refresh_token()
        new_exp = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRES_DAYS)

        cursor.execute(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user_id, hash_token(new_refresh_token), new_exp)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(
            data={
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "Bearer",
                "expires_in": 900
            }
        )
    except Exception as e:
        cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Revoke specific refresh token."""
    data = request.get_json(silent=True) or request.form
    refresh_token = data.get('refresh_token', '').strip()

    if refresh_token:
        t_hash = hash_token(refresh_token)
        conn = get_db()
        if conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = %s", (t_hash,))
            conn.commit()
            cursor.close()
            conn.close()

    return api_response(data={"message": "Logged out successfully"})

@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required
def logout_all():
    """Revoke all active refresh tokens for current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()

    return api_response(data={"message": "Logged out of all devices successfully"})

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset token."""
    data = request.get_json(silent=True) or request.form
    email = data.get('email', '').strip().lower()

    if not email:
        return api_response(error={"code": "VALIDATION_ERROR", "message": "Email is required"}, status_code=400)

    client_ip = request.remote_addr or 'unknown'
    if not check_rate_limit(f"forgot:{client_ip}:{email}", max_attempts=3, window_seconds=600):
        return api_response(error={"code": "TOO_MANY_REQUESTS", "message": "Too many requests. Try again later."}, status_code=429)

    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            reset_token = generate_refresh_token()
            token_hash = hash_token(reset_token)
            exp = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            cursor.execute(
                "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                (user['id'], token_hash, exp)
            )
            conn.commit()
            print(f"[AUTH] Password reset token for {email}: {reset_token}")

        cursor.close()
        conn.close()

        # Always return generic message to avoid email enumeration
        return api_response(data={"message": "If an account with that email exists, a password reset link has been processed."})
    except Exception as e:
        cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using reset token."""
    data = request.get_json(silent=True) or request.form
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '')

    if not token or not new_password or len(new_password) < 6:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "Valid token and new password (min 6 chars) are required"},
            status_code=400
        )

    t_hash = hash_token(token)
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT * FROM password_resets 
               WHERE token_hash = %s AND used = 0 AND expires_at > CURRENT_TIMESTAMP""",
            (t_hash,)
        )
        rec = cursor.fetchone()
        if not rec:
            cursor.close()
            conn.close()
            return api_response(
                error={"code": "INVALID_TOKEN", "message": "Invalid, used, or expired password reset token"},
                status_code=400
            )

        hashed_pw = generate_password_hash(new_password)
        cursor.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_pw, rec['user_id']))
        cursor.execute("UPDATE password_resets SET used = 1 WHERE id = %s", (rec['id'],))
        # Revoke all existing refresh tokens for security
        cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = %s", (rec['user_id'],))
        conn.commit()
        cursor.close()
        conn.close()

        return api_response(data={"message": "Password reset successfully. Please login with your new password."})
    except Exception as e:
        cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_me():
    """Fetch profile of current authenticated user."""
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
            return api_response(error={"code": "USER_NOT_FOUND", "message": "User not found"}, status_code=404)

        return api_response(data={"user": sanitize_db_dict(user)})
    except Exception as e:
        cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
