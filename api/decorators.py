from functools import wraps
from flask import request, g
from api.utils import decode_access_token, api_response

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return api_response(
                error={"code": "UNAUTHORIZED", "message": "Missing Authorization header"},
                status_code=401
            )
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return api_response(
                error={"code": "UNAUTHORIZED", "message": "Authorization header must be Bearer token"},
                status_code=401
            )
        
        token = parts[1]
        payload, err = decode_access_token(token)
        if err:
            return api_response(
                error={"code": "UNAUTHORIZED", "message": err},
                status_code=401
            )
        
        g.current_user = {
            "id": payload["user_id"],
            "email": payload["email"],
            "role": payload["role"]
        }
        return f(*args, **kwargs)
    return decorated

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = getattr(g, 'current_user', None)
            if not current_user:
                return api_response(
                    error={"code": "UNAUTHORIZED", "message": "Authentication required"},
                    status_code=401
                )
            if current_user.get('role') != required_role:
                return api_response(
                    error={"code": "FORBIDDEN", "message": f"Requires {required_role} role permission"},
                    status_code=403
                )
            return f(*args, **kwargs)
        return decorated
    return decorator
