from flask import Blueprint
from api.auth import auth_bp
from api.products import products_bp
from api.cart import cart_bp
from api.orders import orders_bp
from api.profile import profile_bp
from api.reviews import reviews_bp
from api.size import size_bp
from api.admin import admin_bp
from api.devices import devices_bp
from api.notifications import notifications_bp

api_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

api_bp.register_blueprint(auth_bp, url_prefix='/auth')
api_bp.register_blueprint(products_bp, url_prefix='/products')
api_bp.register_blueprint(cart_bp, url_prefix='/cart')
api_bp.register_blueprint(orders_bp, url_prefix='/orders')
api_bp.register_blueprint(profile_bp, url_prefix='/profile')
api_bp.register_blueprint(reviews_bp, url_prefix='/reviews')
api_bp.register_blueprint(size_bp, url_prefix='/size')
api_bp.register_blueprint(admin_bp, url_prefix='/admin')
api_bp.register_blueprint(devices_bp, url_prefix='/devices')
api_bp.register_blueprint(notifications_bp, url_prefix='/notifications')
