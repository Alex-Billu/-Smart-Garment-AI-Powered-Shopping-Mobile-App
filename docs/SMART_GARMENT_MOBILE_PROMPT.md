# FULL PROMPT: Smart Garment Mobile App (React Native + Expo)

> **Update Note**: The backend has since been updated with an automatic SQLite fallback (if MySQL is unavailable) and a rule-based fallback for the ML size predictor (if the pickle models are missing or untrained).

Copy everything below this line and paste it into your AI coding tool.

---

You are a senior full-stack engineer and mobile architect. I have an existing, working web application called **"Smart Garment"** (AI-powered garment shopping). Build a complete, production-ready cross-platform mobile app (Android + iOS) using **React Native (Expo, TypeScript)** that runs alongside the web app. The web app must stay fully functional and unchanged. Both apps must run at the same time and share the same backend, database, authentication system, APIs, business logic and image storage.

---

## 1. EXISTING PROJECT (DO NOT BREAK IT)

**Backend:** Python Flask, single file `app.py` (~1,700 lines), server-rendered Jinja templates, MySQL via `mysql-connector-python`, `python-dotenv`, werkzeug pbkdf2 password hashing, Flask session-cookie authentication. Database schema is auto-imported from `database.sql` on startup if the DB is empty.

**ML:** Random Forest size predictor (`train_model.py`, `random_forest_pure.py`, `models/size_predictor.pkl`, `models/scaler.pkl`). Function `predict_clothing_size(height_cm, weight_kg, chest_cm, waist_cm)` returns predicted size, confidence and BMI.

**Frontend (web):** HTML5, CSS3, vanilla JS, Bootstrap 5, Font Awesome, Chart.js. Templates: base, index, login, register, dashboard, products, product_details, cart, checkout, order_success, orders, order_details, profile, reviews, size_finder, prediction_result, and admin templates (login, dashboard, products, add/edit product, orders, users, reviews).

**Database tables:**
- `users(id, name, email, phone, password, role ENUM('user','admin'), address, city, state, pincode, created_at)`
- `products(id, name, category, description, price, image, sizes [comma-separated], stock, created_at)`
- `cart(id, user_id, product_id, size, quantity)`
- `orders(id, user_id, total_amount, address, city, state, pincode, phone, payment_method, status ENUM('Pending','Confirmed','Shipped','Delivered','Cancelled'), created_at)`
- `order_items(id, order_id, product_id, product_name, size, quantity, price)`
- `reviews(id, user_id, product_id, rating 1-5, review, created_at)`
- `size_predictions(id, user_id, height, weight, chest, waist, fit_preference, predicted_size, confidence, bmi, created_at)`

**Existing web routes:**
- Public/customer: `/`, `/login`, `/register`, `/logout`, `/dashboard`, `/size-finder`, `/prediction-result`, `/shop` (search + category/price filters), `/product/<id>`, `/product/<id>/review`, `/cart`, `/cart/add`, `/cart/update-quantity`, `/cart/update-size`, `/cart/remove`, `/checkout`, `/place-order`, `/order-success/<id>`, `/orders`, `/orders/<id>`, `/profile`, `/my-reviews`
- Admin: `/admin/login`, `/admin/dashboard`, `/admin/products`, `/admin/products/add`, `/admin/products/edit/<id>`, `/admin/products/delete/<id>`, `/admin/orders`, `/admin/orders/<id>/status`, `/admin/users`, `/admin/users/delete/<id>`, `/admin/reviews`, `/admin/reviews/delete/<id>`

---

## 2. TARGET ARCHITECTURE

```
Web (existing templates)  ─┐
                           ├─►  Flask Backend (existing + new /api/v1)  ─►  MySQL (existing)
Mobile (React Native)    ──┘            │                │
                                        │                └─► Shared image/file storage
                                        ├─► WebSocket / SSE real-time layer
                                        └─► Firebase Cloud Messaging (push)
```

Required end result: a change made on web (e.g. admin updates an order status, adds a product, deletes a review) appears instantly on mobile, and vice versa (e.g. a customer places an order on mobile and the admin web dashboard updates live).

---

## 3. PROJECT FOLDER STRUCTURE

```
project/
├── backend/        existing Flask app + new api/ blueprint, sockets, push, migrations, tests
├── web/            existing templates/ and static/ (unchanged)
├── mobile/         Expo React Native app
├── shared/         OpenAPI spec, shared TypeScript types, constants, socket event names
├── docs/           architecture, API reference, setup guide, user flows, security notes
└── deployment/     Dockerfile, docker-compose (Flask + MySQL), nginx, gunicorn/eventlet, env examples, EAS config
```

Do not include `venv/`. Provide `.env.example` files only; never hardcode or commit secrets.

---

## 4. PHASE 1: BACKEND (ADDITIVE ONLY)

Add a versioned JSON REST API at `/api/v1/` using a Flask Blueprint split into modules (auth, products, cart, orders, profile, reviews, size, admin, devices, notifications). Reuse the same DB connection helper, validation rules and the ML function. Do NOT modify or remove existing web routes (if a tiny hook is needed in a web route, show the exact diff). Enable CORS for `/api/*` only.

### 4.1 Authentication
- JWT access token (15 min) + rotating refresh token (30 days) stored hashed server-side and revocable.
- Endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me`.
- Password reset: one-time expiring token sent by email (SMTP via .env), single use.
- Accept existing pbkdf2 hashes so current web users can log in on mobile.
- Rate-limit login and reset endpoints; lock out after repeated failures.
- Keep web session auth working untouched.

### 4.2 Role-based access control
- Decorators `@jwt_required` and `@role_required('admin')`.
- Customers can only access their own cart, orders, profile, reviews and predictions.

### 4.3 Customer endpoints
- Products: list (pagination, search, category, price range, sort), detail (with reviews and average rating), categories list.
- Cart: get, add, update quantity, update size, remove, clear.
- Orders: checkout/place order (validate stock and decrement inside a DB transaction), list, detail, cancel (when allowed).
- Profile: get/update, change password.
- Reviews: create, list mine, delete mine.
- Size finder: `POST /size/predict` (measurements to size/confidence/BMI), `GET /size/history`.

### 4.4 Admin endpoints
- Dashboard analytics: revenue, orders by status, top products, new users, low-stock items, recent orders.
- Products: full CRUD with image upload (validate type and size).
- Orders: list/filter, update status.
- Users: list, delete. Reviews: list, delete.

### 4.5 Real-time
- Flask-SocketIO (or SSE) with JWT-authenticated connections and per-user / per-role rooms.
- Events: `product.created|updated|deleted`, `order.created`, `order.status_changed`, `cart.updated`, `review.created|deleted`, `user.updated`.
- Emit events from BOTH the new API routes AND the existing web routes (small post-commit hook), so web and mobile always stay in sync.

### 4.6 Push notifications (FCM)
- Table `device_tokens(id, user_id, fcm_token, platform, created_at)` and `notifications(id, user_id, title, body, data, is_read, created_at)`.
- Endpoints: `POST /devices`, `DELETE /devices/<token>`, `GET /notifications`, `POST /notifications/<id>/read`, `POST /notifications/read-all`.
- Send through `firebase-admin` on: order status change (to customer), new order (to admins), low stock (to admins).

### 4.7 Quality and security
- Standard response format `{ success, data, error: { code, message, fields } }`.
- Input validation on every endpoint, centralized error handler, request logging.
- Parameterized SQL only, security headers, upload validation, HTTPS-ready.
- ETag / If-Modified-Since on list endpoints to cut bandwidth.
- Swagger/OpenAPI docs at `/api/docs`, also exported to `shared/openapi.json`.
- Migrations: a new SQL file creating only new tables (`refresh_tokens`, `password_resets`, `device_tokens`, `notifications`). No destructive changes to existing tables.
- pytest suite for auth, RBAC, cart/checkout transaction and sync events.

---

## 5. PHASE 2: MOBILE APP (REACT NATIVE + EXPO)

Use latest stable Expo SDK, TypeScript strict mode, Expo Router.

### 5.1 Folder structure (`mobile/`)
```
mobile/
├── app/                    Expo Router routes: (auth), (tabs), (admin), modals
├── src/
│   ├── api/                axios client + interceptors (token attach, auto-refresh on 401, retry, timeout)
│   ├── services/           auth, products, cart, orders, profile, reviews, size, admin, notifications, devices
│   ├── store/              Zustand (auth, cart, settings, offline queue)
│   ├── hooks/
│   ├── components/         reusable UI kit (Button, Input, Card, ProductCard, Badge, Skeleton, EmptyState, ErrorState, Modal, Toast, Rating, Chart)
│   ├── theme/              light/dark tokens, typography, spacing
│   ├── offline/            persisted cache, mutation queue, sync engine
│   ├── realtime/           socket client, event to cache-invalidation mapping
│   ├── notifications/      FCM / expo-notifications setup, deep links
│   ├── utils/  types/  constants/
├── __tests__/
├── app.config.ts   eas.json   babel.config.js   tsconfig.json   .env.example
```

### 5.2 Libraries
TanStack Query (server state + cache), Zustand, axios, expo-secure-store (tokens), react-hook-form + zod (validation), react-native-reanimated + gesture-handler (animations), expo-notifications + FCM, expo-image (cached images), expo-image-picker, @react-native-community/netinfo, MMKV or expo-sqlite (offline storage), socket.io-client, victory-native or react-native-gifted-charts (charts), expo-haptics, expo-local-authentication (optional biometric unlock).

### 5.3 Customer screens
Splash, Onboarding, Login, Register, Forgot Password, Reset Password, Home (featured + categories), Shop (search, filters, sort, infinite scroll), Product Details (size picker, reviews, add review), Cart, Checkout, Order Success, Orders list, Order Details (status timeline), AI Size Finder, Size Result, Size History, Profile (edit info, change password), My Reviews, Notifications center, Settings (theme, notification toggles, logout, log out of all devices).

### 5.4 Admin screens (visible only when `role === 'admin'`)
Dashboard (revenue and order charts, low stock), Products (list, add, edit, delete with image picker), Orders (filter, update status), Users, Reviews moderation.

### 5.5 UI / UX
Modern mobile-first design, bottom tabs + stack navigation, skeleton loaders, pull-to-refresh, smooth transitions (fade, spring, shared-element where useful), haptic feedback, empty/error/offline states, accessibility labels, safe-area handling, dark mode, tablet-friendly layouts.

### 5.6 Offline and sync
- Persist and serve from cache: products, categories, cart, orders, profile.
- Queue mutations made offline (cart changes, reviews, profile edits) and auto-sync when connectivity returns, with retry/backoff and conflict handling (server wins for stock/price, with a clear message to the user).
- Offline banner and a visible sync status indicator.
- Checkout requires connectivity (show a clear message).

### 5.7 Real-time
Connect the socket when the app is foregrounded and authenticated; map events to TanStack Query cache invalidation or patching; disconnect in background to save battery; rely on FCM for background alerts and deep-link into the right screen on tap.

### 5.8 Performance and battery
Pagination and infinite scroll, debounced search, image caching and resizing, memoized components, tuned FlatList (`getItemLayout`, `windowSize`, `removeClippedSubviews`), lazy-loaded screens, request deduplication, no polling when sockets are active, minimal background work.

### 5.9 Security (mobile)
Tokens only in secure storage, certificate-ready HTTPS client, no sensitive data in logs, input validation with zod, auto-logout on refresh-token failure, optional biometric lock, no secrets in the bundle.

---

## 6. PHASE 3: BUILD, DEPLOY, DOCS, TESTS

- `eas.json` with profiles: `development`, `preview` (Android **APK**), `production` (Android AAB + iOS).
- `app.config.ts` with bundle IDs, icons, splash, permissions, notification config, placeholders for `google-services.json` and `GoogleService-Info.plist`.
- Docker: `docker-compose.yml` running Flask (gunicorn + eventlet) + MySQL + nginx, with env examples.
- Exact commands to run backend, web and mobile simultaneously, including how a physical phone reaches Flask (LAN IP or tunnel) and how to set `API_BASE_URL`.
- Docs in `docs/`: architecture diagram, API reference, setup guide, auth flow, sync/offline design, push setup (Firebase), release checklist, troubleshooting.
- Tests: pytest (API), Jest + React Native Testing Library (components, services, offline queue), and one end-to-end scenario proving web-to-mobile and mobile-to-web sync.

---

## 7. FEATURE CHECKLIST (ALL MUST BE DELIVERED)

Dashboard, User Management, Authentication (login, signup, password reset, session management, RBAC), Real-Time Data Sync, Notifications, Reports & Analytics, Search & Filters, Profile Management, Settings, Offline Support, API Integration, Security & Encryption.

## 8. DELIVERABLES

1. Complete mobile app source code
2. Reusable API service layer
3. Shared authentication and database integration
4. Production-ready folder structure
5. Android APK build configuration
6. iOS build configuration
7. Deployment and setup documentation
8. Modern UI/UX screens and navigation flow
9. Error handling and validation
10. Performance optimization and testing setup

---

## 9. RULES FOR HOW YOU WORK

1. Write complete, runnable code. No placeholders and no "TODO"s. Put the file path above every file.
2. Never change existing web behavior. Show a diff for every edit to `app.py`.
3. Never hardcode secrets. Provide `.env.example` files only.
4. Work in phases and stop for my confirmation after each:
   - Phase A: backend API + auth + migrations
   - Phase B: real-time + push notifications
   - Phase C: mobile core (api client, auth, navigation, theme, UI kit)
   - Phase D: customer screens
   - Phase E: admin screens
   - Phase F: offline + performance
   - Phase G: build config, deployment, docs, tests
5. If you need `app.py`, `database.sql`, `static/` or `templates/` contents, ask me for them before starting. Then begin Phase A.
6. At the end of each phase, list the files created, how to run and test them, and any assumptions you made.
