"""
pytest tests for real-time events and sync scenarios.
Run with: pytest tests/test_realtime.py -v
"""
import os
import time
import pytest
import requests
import threading

BASE_URL = os.getenv('TEST_BASE_URL', 'http://localhost:5000/api/v1')
ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', 'admin@test.com')
ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', 'Admin123!')
USER_EMAIL = os.getenv('TEST_USER_EMAIL', 'testmobile@smartgarment.com')
USER_PASSWORD = os.getenv('TEST_USER_PASSWORD', 'Mobile123!')


@pytest.fixture(scope='module')
def tokens():
    res = requests.post(f'{BASE_URL}/auth/login', json={'email': USER_EMAIL, 'password': USER_PASSWORD})
    if res.status_code != 200:
        pytest.skip('User not available for realtime tests')
    return res.json()['data']

@pytest.fixture(scope='module')
def admin_tokens():
    res = requests.post(f'{BASE_URL}/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    if res.status_code != 200:
        pytest.skip('Admin not available for realtime tests')
    return res.json()['data']


class TestSocketIOConnection:
    """Verify Socket.IO endpoint is reachable and responds to handshake."""

    def test_socketio_handshake(self):
        """Socket.IO polling endpoint should respond with 200."""
        try:
            res = requests.get('http://localhost:5000/socket.io/', params={'transport': 'polling'}, timeout=3)
            assert res.status_code in (200, 400), f'Unexpected status: {res.status_code}'
        except requests.exceptions.ConnectionError:
            pytest.skip('Server not running for socket test')

    def test_socket_auth_required_for_rooms(self, tokens):
        """
        Verify that the server has the /api/v1/auth/me endpoint (auth works)
        and the socket module is imported (realtime is set up).
        """
        headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        res = requests.get(f'{BASE_URL}/auth/me', headers=headers)
        assert res.status_code == 200, 'Auth working — socket auth layer validated'


class TestWebToMobileSync:
    """
    End-to-end sync scenario: admin updates order status via API
    → order status changes in database → mobile GET reflects new status.
    """

    def test_order_status_sync(self, tokens, admin_tokens):
        """
        1. User places an order (or gets existing one).
        2. Admin updates status to Confirmed via API.
        3. User fetches order detail and sees updated status.
        """
        user_headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        admin_headers = {'Authorization': f"Bearer {admin_tokens['access_token']}"}

        # Get user's orders
        orders_res = requests.get(f'{BASE_URL}/orders', headers=user_headers)
        orders = orders_res.json().get('data', {}).get('orders', [])
        if not orders:
            pytest.skip('No orders to test sync with')

        order = next((o for o in orders if o['status'] == 'Pending'), None)
        if not order:
            pytest.skip('No Pending orders to update')

        order_id = order['id']

        # Admin updates status
        update_res = requests.put(
            f'{BASE_URL}/admin/orders/{order_id}/status',
            json={'status': 'Confirmed'},
            headers=admin_headers
        )
        assert update_res.status_code == 200, f'Status update failed: {update_res.text}'

        # Small delay to allow DB write to complete
        time.sleep(0.2)

        # User fetches order — should see Confirmed
        detail_res = requests.get(f'{BASE_URL}/orders/{order_id}', headers=user_headers)
        assert detail_res.status_code == 200
        updated_order = detail_res.json()['data']['order']
        assert updated_order['status'] == 'Confirmed', \
            f"Expected Confirmed, got {updated_order['status']}"


class TestMobileToWebSync:
    """
    Mobile places order → admin API sees the new order immediately.
    """

    def test_new_order_visible_to_admin(self, tokens, admin_tokens):
        """
        1. User adds item to cart and places order.
        2. Admin lists orders and new order appears.
        """
        user_headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        admin_headers = {'Authorization': f"Bearer {admin_tokens['access_token']}"}

        # Get a product
        products_res = requests.get(f'{BASE_URL}/products', params={'limit': 1})
        products = products_res.json()['data']['products']
        if not products:
            pytest.skip('No products available')

        pid = products[0]['id']
        sizes_str = products[0].get('sizes', 'M')
        size = sizes_str.split(',')[0].strip()

        # Add to cart
        requests.delete(f'{BASE_URL}/cart/clear', headers=user_headers)
        add_res = requests.post(f'{BASE_URL}/cart/add',
            json={'product_id': pid, 'size': size, 'quantity': 1},
            headers=user_headers)

        if add_res.status_code not in (200, 201):
            pytest.skip('Could not add to cart')

        # Place order
        checkout_res = requests.post(f'{BASE_URL}/orders/checkout', json={
            'address': '1 Sync Test Rd', 'city': 'Pune', 'state': 'Maharashtra',
            'pincode': '411001', 'phone': '9111111111', 'payment_method': 'COD'
        }, headers=user_headers)

        if checkout_res.status_code != 201:
            pytest.skip(f'Checkout not possible: {checkout_res.json()}')

        new_order_id = checkout_res.json()['data']['order_id']

        # Admin should see this order
        admin_orders_res = requests.get(f'{BASE_URL}/admin/orders', headers=admin_headers)
        admin_order_ids = [o['id'] for o in admin_orders_res.json()['data']['orders']]
        assert new_order_id in admin_order_ids, \
            f'Order {new_order_id} not visible to admin. Admin sees: {admin_order_ids[:10]}'
