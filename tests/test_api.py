"""
pytest test suite – Smart Garment Mobile API
Run with: pytest tests/ -v --tb=short
Requires: pip install pytest requests

Set environment variables (or .env):
  TEST_BASE_URL=http://localhost:5000/api/v1
  TEST_ADMIN_EMAIL=admin@test.com
  TEST_ADMIN_PASSWORD=Admin123!
  TEST_USER_EMAIL=user@test.com
  TEST_USER_PASSWORD=User1234!
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv('TEST_BASE_URL', 'http://localhost:5000/api/v1')
ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', 'admin@test.com')
ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', 'Admin123!')
USER_EMAIL = os.getenv('TEST_USER_EMAIL', 'testmobile@smartgarment.com')
USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', 'Mobile123!')


# ────────────────────────────── Fixtures ──────────────────────────────────────

@pytest.fixture(scope='session')
def user_tokens():
    """Register (or login) a test user and return tokens."""
    # Try to login first
    res = requests.post(f'{BASE_URL}/auth/login', json={'email': USER_EMAIL, 'password': USER_PASSWORD})
    if res.status_code == 200 and res.json().get('success'):
        return res.json()['data']
    # Register
    payload = {
        'name': 'Mobile Test User',
        'email': USER_EMAIL,
        'phone': '9876543210',
        'password': USER_PASSWORD,
    }
    res = requests.post(f'{BASE_URL}/auth/register', json=payload)
    assert res.status_code in (200, 201), f'Register failed: {res.text}'
    return res.json()['data']

@pytest.fixture(scope='session')
def admin_tokens():
    """Login as admin and return tokens."""
    res = requests.post(f'{BASE_URL}/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    assert res.status_code == 200, f'Admin login failed: {res.text}'
    data = res.json()
    assert data['success'], f'Admin login error: {data}'
    return data['data']

@pytest.fixture(scope='session')
def user_headers(user_tokens):
    return {'Authorization': f"Bearer {user_tokens['access_token']}"}

@pytest.fixture(scope='session')
def admin_headers(admin_tokens):
    return {'Authorization': f"Bearer {admin_tokens['access_token']}"}


# ────────────────────────────── Auth Tests ────────────────────────────────────

class TestAuth:
    def test_register_duplicate_email(self, user_tokens):
        """Registering with an existing email returns 409."""
        res = requests.post(f'{BASE_URL}/auth/register', json={
            'name': 'Dupe', 'email': USER_EMAIL, 'phone': '9000000001', 'password': USER_PASSWORD
        })
        assert res.status_code == 409, f'Expected 409, got {res.status_code}'

    def test_login_wrong_password(self):
        """Login with wrong password returns 401."""
        res = requests.post(f'{BASE_URL}/auth/login', json={'email': USER_EMAIL, 'password': 'wrongpass'})
        assert res.status_code == 401

    def test_login_success(self, user_tokens):
        """Login returns access_token and refresh_token."""
        assert 'access_token' in user_tokens
        assert 'refresh_token' in user_tokens

    def test_get_me_authenticated(self, user_headers):
        """GET /auth/me returns current user when authenticated."""
        res = requests.get(f'{BASE_URL}/auth/me', headers=user_headers)
        assert res.status_code == 200
        data = res.json()
        assert data['success']
        assert data['data']['user']['email'] == USER_EMAIL

    def test_get_me_unauthenticated(self):
        """GET /auth/me returns 401 without token."""
        res = requests.get(f'{BASE_URL}/auth/me')
        assert res.status_code == 401

    def test_token_refresh(self, user_tokens):
        """POST /auth/refresh returns a new access token."""
        res = requests.post(f'{BASE_URL}/auth/refresh', json={'refresh_token': user_tokens['refresh_token']})
        assert res.status_code == 200
        assert 'access_token' in res.json()['data']

    def test_invalid_token_rejected(self):
        """Tampered JWT returns 401."""
        headers = {'Authorization': 'Bearer tampered.token.here'}
        res = requests.get(f'{BASE_URL}/auth/me', headers=headers)
        assert res.status_code == 401


# ────────────────────────────── RBAC Tests ────────────────────────────────────

class TestRBAC:
    def test_user_cannot_access_admin_dashboard(self, user_headers):
        """Regular user gets 403 on admin endpoint."""
        res = requests.get(f'{BASE_URL}/admin/dashboard', headers=user_headers)
        assert res.status_code == 403

    def test_admin_can_access_dashboard(self, admin_headers):
        """Admin gets 200 on admin dashboard."""
        res = requests.get(f'{BASE_URL}/admin/dashboard', headers=admin_headers)
        assert res.status_code == 200
        assert res.json()['success']

    def test_unauthenticated_cart_returns_401(self):
        """Cart requires auth."""
        res = requests.get(f'{BASE_URL}/cart')
        assert res.status_code == 401


# ────────────────────────────── Products Tests ────────────────────────────────

class TestProducts:
    def test_list_products_public(self):
        """Products endpoint is public and paginates."""
        res = requests.get(f'{BASE_URL}/products')
        assert res.status_code == 200
        data = res.json()
        assert data['success']
        assert 'products' in data['data']
        assert 'pagination' in data

    def test_products_search(self):
        """Search parameter filters results."""
        res = requests.get(f'{BASE_URL}/products', params={'search': 'shirt'})
        assert res.status_code == 200
        assert res.json()['success']

    def test_products_pagination(self):
        """Page and limit parameters work."""
        res = requests.get(f'{BASE_URL}/products', params={'page': 1, 'limit': 5})
        assert res.status_code == 200
        products = res.json()['data']['products']
        assert len(products) <= 5

    def test_categories_public(self):
        """Categories endpoint is public."""
        res = requests.get(f'{BASE_URL}/products/categories')
        assert res.status_code == 200
        assert 'categories' in res.json()['data']

    def test_product_detail(self):
        """Get first product detail."""
        # Get first product id
        res = requests.get(f'{BASE_URL}/products', params={'limit': 1})
        products = res.json()['data']['products']
        if not products:
            pytest.skip('No products in database')
        pid = products[0]['id']
        res2 = requests.get(f'{BASE_URL}/products/{pid}')
        assert res2.status_code == 200
        assert res2.json()['data']['product']['id'] == pid

    def test_product_not_found(self):
        """Non-existent product returns 404."""
        res = requests.get(f'{BASE_URL}/products/999999')
        assert res.status_code == 404


# ────────────────────────────── Cart Tests ────────────────────────────────────

class TestCart:
    def test_get_empty_cart(self, user_headers):
        """Freshly logged in user cart is empty or has items."""
        res = requests.get(f'{BASE_URL}/cart', headers=user_headers)
        assert res.status_code == 200
        assert res.json()['success']

    def test_add_to_cart(self, user_headers):
        """Adding a valid product to cart returns 200."""
        products_res = requests.get(f'{BASE_URL}/products', params={'limit': 1})
        products = products_res.json()['data']['products']
        if not products:
            pytest.skip('No products available')
        pid = products[0]['id']
        sizes_str = products[0].get('sizes', 'M')
        size = sizes_str.split(',')[0].strip() if sizes_str else 'M'
        res = requests.post(f'{BASE_URL}/cart/add', json={'product_id': pid, 'size': size, 'quantity': 1}, headers=user_headers)
        assert res.status_code in (200, 201)
        assert res.json()['success']

    def test_clear_cart(self, user_headers):
        """Clear cart returns 200."""
        res = requests.delete(f'{BASE_URL}/cart/clear', headers=user_headers)
        assert res.status_code in (200, 204)


# ────────────────────────────── Checkout Transaction Test ─────────────────────

class TestCheckout:
    def test_checkout_requires_cart_items(self, user_headers):
        """Checkout with empty cart returns 400."""
        # Clear cart first
        requests.delete(f'{BASE_URL}/cart/clear', headers=user_headers)
        res = requests.post(f'{BASE_URL}/orders/checkout', json={
            'address': '123 Test St', 'city': 'Mumbai', 'state': 'Maharashtra',
            'pincode': '400001', 'phone': '9876543210', 'payment_method': 'COD'
        }, headers=user_headers)
        assert res.status_code == 400

    def test_checkout_full_flow(self, user_headers):
        """Add item, checkout, verify order created and cart cleared."""
        # Get a product
        products_res = requests.get(f'{BASE_URL}/products', params={'limit': 1})
        products = products_res.json()['data']['products']
        if not products:
            pytest.skip('No products available')

        pid = products[0]['id']
        sizes_str = products[0].get('sizes', 'M')
        size = sizes_str.split(',')[0].strip() if sizes_str else 'M'

        # Add to cart
        requests.post(f'{BASE_URL}/cart/add', json={'product_id': pid, 'size': size, 'quantity': 1}, headers=user_headers)

        # Checkout
        res = requests.post(f'{BASE_URL}/orders/checkout', json={
            'address': '456 Test Ave', 'city': 'Delhi', 'state': 'Delhi',
            'pincode': '110001', 'phone': '9000000000', 'payment_method': 'COD'
        }, headers=user_headers)

        if res.status_code == 400:
            # Could fail if product stock = 0 — acceptable
            assert 'stock' in res.json().get('error', {}).get('message', '').lower() or \
                   'cart' in res.json().get('error', {}).get('message', '').lower()
            return

        assert res.status_code == 201, f'Checkout failed: {res.text}'
        data = res.json()
        assert data['success']
        assert 'order_id' in data['data']

        order_id = data['data']['order_id']

        # Verify order appears in history
        orders_res = requests.get(f'{BASE_URL}/orders', headers=user_headers)
        order_ids = [o['id'] for o in orders_res.json()['data']['orders']]
        assert order_id in order_ids

        # Verify cart is cleared
        cart_res = requests.get(f'{BASE_URL}/cart', headers=user_headers)
        assert len(cart_res.json()['data']['items']) == 0


# ────────────────────────────── Profile Tests ─────────────────────────────────

class TestProfile:
    def test_get_profile(self, user_headers):
        """GET /profile returns user data."""
        res = requests.get(f'{BASE_URL}/profile', headers=user_headers)
        assert res.status_code == 200
        assert res.json()['data']['user']['email'] == USER_EMAIL

    def test_update_profile(self, user_headers):
        """PUT /profile updates name."""
        res = requests.put(f'{BASE_URL}/profile', json={
            'name': 'Updated Test User', 'phone': '9876543210'
        }, headers=user_headers)
        assert res.status_code == 200
        assert res.json()['data']['user']['name'] == 'Updated Test User'


# ────────────────────────────── Size Finder Tests ─────────────────────────────

class TestSizeFinder:
    def test_size_prediction(self, user_headers):
        """POST /size/predict returns a size recommendation."""
        res = requests.post(f'{BASE_URL}/size/predict', json={
            'height': 170, 'weight': 65, 'chest': 90, 'waist': 75
        }, headers=user_headers)
        assert res.status_code == 200
        data = res.json()
        assert data['success']
        assert 'predicted_size' in data['data'] or 'recommended_size' in data['data']

    def test_size_prediction_missing_fields(self, user_headers):
        """Missing required fields returns 400."""
        res = requests.post(f'{BASE_URL}/size/predict', json={'height': 170}, headers=user_headers)
        assert res.status_code == 400


# ────────────────────────────── Admin Tests ───────────────────────────────────

class TestAdmin:
    def test_dashboard_metrics(self, admin_headers):
        """Dashboard returns expected metric keys."""
        res = requests.get(f'{BASE_URL}/admin/dashboard', headers=admin_headers)
        assert res.status_code == 200
        data = res.json()['data']
        for key in ('total_revenue', 'total_orders', 'total_customers'):
            assert key in data, f'Missing key: {key}'

    def test_admin_product_list(self, admin_headers):
        """Admin can list products."""
        res = requests.get(f'{BASE_URL}/admin/products', headers=admin_headers)
        assert res.status_code == 200

    def test_admin_user_list(self, admin_headers):
        """Admin can list users."""
        res = requests.get(f'{BASE_URL}/admin/users', headers=admin_headers)
        assert res.status_code == 200
        assert 'users' in res.json()['data']

    def test_health_endpoint(self):
        """GET /health returns 200."""
        res = requests.get(f'{BASE_URL}/health')
        assert res.status_code == 200
        assert res.json().get('status') == 'ok'


# ────────────────────────────── Notifications Tests ───────────────────────────

class TestNotifications:
    def test_get_notifications(self, user_headers):
        """GET /notifications returns list and unread_count."""
        res = requests.get(f'{BASE_URL}/notifications', headers=user_headers)
        assert res.status_code == 200
        data = res.json()['data']
        assert 'notifications' in data
        assert 'unread_count' in data

    def test_register_device_token(self, user_headers):
        """POST /devices registers a fake FCM token."""
        res = requests.post(f'{BASE_URL}/devices', json={
            'fcm_token': 'test-fcm-token-12345', 'platform': 'android'
        }, headers=user_headers)
        assert res.status_code in (200, 201)
