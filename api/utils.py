import os
import hashlib
import secrets
import datetime
from decimal import Decimal
from flask import jsonify, request, make_response
import jwt

JWT_SECRET = os.getenv('JWT_SECRET', os.getenv('SECRET_KEY', 'smart-garment-jwt-secret-key-9988'))
ACCESS_TOKEN_EXPIRES_MINUTES = 15
REFRESH_TOKEN_EXPIRES_DAYS = 30

# In-memory rate limiting dictionary for login/reset endpoints
_rate_limit_store = {}

def api_response(data=None, error=None, status_code=200, headers=None):
    """
    Standard response format:
    {
      "success": True/False,
      "data": ... or None,
      "error": { "code": "...", "message": "...", "fields": {...} } or None
    }
    """
    success = error is None
    payload = {
        "success": success,
        "data": data if success else None,
        "error": error if not success else None
    }
    resp = make_response(jsonify(payload), status_code)
    if headers:
        for k, v in headers.items():
            resp.headers[k] = v
    return resp

def hash_token(token: str) -> str:
    """Hashes a raw token string (e.g. refresh token or password reset token)."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def generate_access_token(user_id: int, email: str, role: str) -> str:
    """Generates a 15-minute JWT access token."""
    now = datetime.datetime.utcnow()
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRES_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def generate_refresh_token() -> str:
    """Generates a secure random 64-char refresh token."""
    return secrets.token_hex(32)

def decode_access_token(token: str):
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            return None, "Invalid token type"
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError as e:
        return None, f"Invalid token: {str(e)}"

def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 300) -> bool:
    """
    Returns True if request rate is allowed, False if exceeded.
    """
    now = datetime.datetime.utcnow()
    records = _rate_limit_store.get(key, [])
    # Filter records within the window
    records = [t for t in records if (now - t).total_seconds() < window_seconds]
    if len(records) >= max_attempts:
        _rate_limit_store[key] = records
        return False
    records.append(now)
    _rate_limit_store[key] = records
    return True

def sanitize_db_dict(row):
    """Converts Decimal, datetime, and date values in a dict to standard Python types."""
    if not row:
        return row
    result = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, (datetime.datetime, datetime.date)):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result

def sanitize_db_list(rows):
    """Converts a list of dict rows using sanitize_db_dict."""
    if not rows:
        return []
    return [sanitize_db_dict(r) for r in rows]

def generate_etag(data_str: str) -> str:
    """Generates a strong ETag header from string data."""
    return f'"{hashlib.md5(data_str.encode("utf-8")).hexdigest()}"'


def body_get(data, key, default=None, cast=None):
    """Read a field from JSON (dict) or Flask form (MultiDict)."""
    if data is None:
        return default
    if hasattr(data, 'getlist'):
        kwargs = {'default': default}
        if cast is not None:
            kwargs['type'] = cast
        val = data.get(key, **kwargs)
        return default if val is None or val == '' else val
    val = data.get(key, default)
    if val is None or val == '':
        return default
    if cast is not None:
        try:
            return cast(val)
        except (TypeError, ValueError):
            return default
    return val
