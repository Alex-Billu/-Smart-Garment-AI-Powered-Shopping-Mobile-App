# Smart Garment – Architecture & Setup Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌────────────────┐         ┌───────────────────────────┐   │
│  │  Web Browser   │         │  React Native / Expo App  │   │
│  │  (Jinja HTML)  │         │  (iOS + Android)          │   │
│  └───────┬────────┘         └────────────┬──────────────┘   │
└──────────┼──────────────────────────────┼───────────────────┘
           │  HTTP (session cookie)        │ HTTP (JWT Bearer)
           │  WebSocket (authenticated)    │ WebSocket (JWT)
           │                              │
┌──────────▼──────────────────────────────▼───────────────────┐
│                    NGINX REVERSE PROXY                      │
│  Rate limits: 30r/min (API), 10r/min (auth)                 │
│  Static files served directly; /socket.io/ upgraded to WS   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│               Flask Backend (Gunicorn + Gevent)             │
│                                                             │
│  ┌─────────────────────┐   ┌───────────────────────────┐    │
│  │  Web Routes (Jinja)  │   │  REST API /api/v1/        │   │
│  │  session auth        │   │  JWT auth (15min access)  │   │
│  │  /login /cart /admin │   │  /auth /products /cart    │   │
│  │  (UNCHANGED)         │   │  /orders /profile /admin  │   │
│  └──────────┬──────────┘   └─────────────┬─────────────┘    │
│             │                            │                  │
│  ┌──────────▼────────────────────────────▼─────────────┐    │
│  │             Flask-SocketIO (event bus)               │   │
│  │   Rooms: user_<id>, role_admin, role_user, guest     │   │
│  │   Events: order.*, product.*, cart.*, review.*       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────┐   ┌──────────────────────────────┐  │
│  │  ML Size Predictor │   │  Firebase Admin (FCM Push)   │  │
│  │  Random Forest     │   │  order_status → customer     │  │
│  │  models/*.pkl      │   │  new_order → admin           │  │
│  └────────────────────┘   └──────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                MySQL 8.0 (or SQLite fallback)               │
│  users · products · cart · orders · order_items · reviews   │
│  size_predictions · refresh_tokens · password_resets        │
│  device_tokens · notifications                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
smart_garment/
├── app.py                    Flask entry-point (web + API registration)
├── database.sql              Original schema
├── requirements.txt          Pinned Python dependencies
├── pytest.ini                pytest configuration
├── Dockerfile                Production Docker image
├── docker-compose.yml        MySQL + Flask + Nginx stack
├── .env.example              Environment variable template
│
├── api/                      Mobile REST API Blueprint
│   ├── __init__.py           Blueprint registry
│   ├── utils.py              JWT, api_response(), rate limiting
│   ├── decorators.py         @jwt_required, @role_required
│   ├── auth.py               POST /auth/register|login|refresh|logout…
│   ├── products.py           GET /products, /products/:id, /categories
│   ├── cart.py               GET/POST/PUT/DELETE /cart
│   ├── orders.py             POST /orders/checkout, GET /orders
│   ├── profile.py            GET/PUT /profile
│   ├── reviews.py            POST/GET/DELETE /reviews
│   ├── size.py               POST /size/predict, GET /size/history
│   ├── admin.py              /admin/dashboard|products|orders|users|reviews
│   ├── devices.py            POST/DELETE /devices
│   ├── notifications.py      GET /notifications, POST /notifications/:id/read
│   └── realtime.py           SocketIO + Firebase FCM dispatcher
│
├── migrations/
│   └── 001_mobile_tables.sql refresh_tokens, password_resets, device_tokens, notifications
│
├── nginx/
│   └── nginx.conf            Rate limiting, WS upgrade, static serving
│
├── tests/
│   ├── test_api.py           Full API pytest suite
│   └── test_realtime.py      Sync scenario tests
│
├── shared/
│   └── openapi.json          OpenAPI 3.0 spec
│
├── docs/                     This directory
│   ├── ARCHITECTURE.md       This file
│   ├── AUTH_FLOW.md          JWT authentication flow
│   ├── PUSH_SETUP.md         Firebase FCM setup guide
│   └── SETUP_GUIDE.md        Developer setup instructions
│
└── mobile/                   Expo React Native app
    ├── app/                  Expo Router file-based routes
    │   ├── _layout.tsx       Root layout (providers, socket)
    │   ├── (auth)/           login, register, forgot-password, reset-password
    │   ├── (tabs)/           index (home), shop, cart, size-finder, profile
    │   ├── (admin)/          dashboard, products, orders, users, reviews
    │   ├── product/[id].tsx  Product detail
    │   ├── orders/           index + [id] detail
    │   ├── order-success/[id].tsx
    │   ├── checkout.tsx
    │   ├── notifications.tsx
    │   ├── my-reviews.tsx
    │   ├── size-history.tsx
    │   └── settings.tsx
    └── src/
        ├── api/client.ts     Axios + JWT interceptor + auto-refresh
        ├── services/index.ts All API service functions
        ├── store/            Zustand: authStore, cartStore, settingsStore, offlineQueueStore
        ├── hooks/            useAuth, useSocket, useNetworkStatus, useQueries
        ├── components/       Button, Input, Card, ProductCard, Badge, Skeleton,
        │                     EmptyState, ErrorState, Modal, Toast, Rating, Chart,
        │                     OrderComponents, OfflineBanner
        ├── theme/index.ts    Light/dark color tokens, typography, spacing
        ├── offline/          storage.ts, syncEngine.ts
        ├── realtime/         socketClient.ts
        ├── notifications/    setup.ts (Expo push + FCM registration)
        └── utils/index.ts    formatPrice, formatDate, validators, helpers
```

---

## Quick Start

### Option A: Local Development (No Docker)

**Prerequisites:** Python 3.11+, MySQL 8.0, Node.js 18+

```bash
# 1. Backend
cd "d:\DEVA CAPSTONE\smart_garment"
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env         # edit DB credentials, JWT secrets
# Note: If MySQL is not configured, the app will automatically fall back to SQLite.
mysql -u root -p < database.sql
mysql -u root -p smart_garment_db < migrations/001_mobile_tables.sql
python app.py                  # → http://localhost:5000

# 2. Mobile (new terminal)
cd mobile
npm install
npx expo start                 # Scan QR with Expo Go OR press 'a' for Android emulator
```

### Option B: Docker (Full Stack)

```bash
cd "d:\DEVA CAPSTONE\smart_garment"
copy .env.example .env
docker-compose up --build -d
docker-compose logs -f backend  # watch logs
```

---

## Physical Device ↔ Flask

For a physical phone to reach your local Flask server:

1. Find your PC's LAN IP: `ipconfig` → IPv4 Address (e.g. `192.168.1.105`)
2. Edit `mobile/src/constants/config.ts`:
   ```ts
   export const API_BASE_URL = 'http://192.168.1.105:5000/api/v1';
   ```
3. Or use the `EXPO_PUBLIC_API_URL` env variable:
   ```bash
   EXPO_PUBLIC_API_URL=http://192.168.1.105:5000/api/v1 npx expo start
   ```
4. Phone and PC must be on the **same Wi-Fi network**
5. Windows Firewall: allow inbound TCP port 5000

### Android Emulator URL
```
http://10.0.2.2:5000/api/v1   (maps to host localhost)
```

---

## Running Tests

### Backend (pytest)
```bash
# In smart_garment/ with venv active and Flask running
pip install pytest requests
pytest tests/ -v               # all tests
pytest tests/test_api.py -v    # API only
pytest tests/test_realtime.py -v # Sync scenarios
```

### Mobile (Jest)
```bash
cd mobile
npm test                       # run once
npm test -- --watch            # watch mode
npm test -- --coverage         # with coverage report
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Flask session secret |
| `JWT_SECRET` | ✅ | JWT signing key |
| `DB_HOST` | ✅ | MySQL host |
| `DB_NAME` | ✅ | Database name |
| `DB_USER` | ✅ | Database user |
| `DB_PASSWORD` | ✅ | Database password |
| `FIREBASE_CREDENTIALS_PATH` | ⚠️ | Path to Firebase service account JSON |
| `MAIL_SERVER` | ⚠️ | SMTP server for password reset |
| `MAIL_USERNAME` | ⚠️ | SMTP username |
| `MAIL_PASSWORD` | ⚠️ | SMTP app password |
| `FLASK_ENV` | ℹ️ | `development` or `production` |

---

## API Authentication Flow

```
1. POST /api/v1/auth/login  { email, password }
   → { access_token (JWT, 15min), refresh_token (30days, hashed in DB) }

2. Include in every request:
   Authorization: Bearer <access_token>

3. On 401 Unauthorized:
   POST /api/v1/auth/refresh  { refresh_token }
   → { access_token (new) }

4. Logout:
   POST /api/v1/auth/logout  { refresh_token }
   → refresh_token invalidated in DB

5. Logout all devices:
   POST /api/v1/auth/logout-all
   → all tokens for user invalidated
```

---

## Real-Time Event Reference

| Event | Emitted by | Room | Description |
|-------|-----------|------|-------------|
| `order.created` | API + web | `user_<id>`, `role_admin` | New order placed |
| `order.status_changed` | Admin API | `user_<id>`, `role_admin` | Status updated |
| `product.created` | Admin API | broadcast | New product added |
| `product.updated` | Admin API | broadcast | Product changed/stock low |
| `product.deleted` | Admin API | broadcast | Product removed |
| `cart.updated` | Cart API | `user_<id>` | Cart modified |
| `review.created` | Reviews API | broadcast | New review |
| `review.deleted` | Admin/user API | broadcast | Review removed |
| `notification.new` | push system | `user_<id>` | In-app toast trigger |

---

## Production Deployment Checklist

- [ ] Generate strong `SECRET_KEY` and `JWT_SECRET` (32+ random bytes)
- [ ] Set `FLASK_ENV=production`
- [ ] Run `migrations/001_mobile_tables.sql` on production DB
- [ ] Set up Firebase project → download `firebase-service-account.json`
- [ ] Set `FIREBASE_CREDENTIALS_PATH` in production `.env`
- [ ] Configure SMTP for password reset emails
- [ ] Enable HTTPS in `nginx/nginx.conf` (uncomment SSL server block)
- [ ] Obtain SSL certificates (Let's Encrypt: `certbot --nginx`)
- [ ] Set `EXPO_PUBLIC_API_URL` to production HTTPS URL in `eas.json`
- [ ] Update `app.json` bundle IDs, app name, version
- [ ] Run `eas build --profile production --platform android`
- [ ] Run `eas submit --platform android` to submit to Play Store
