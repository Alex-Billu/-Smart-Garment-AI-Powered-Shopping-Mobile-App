# Smart Garment – AI-Powered Garment Shopping Website

Smart Garment is a modern fashion e-commerce web application featuring session-based authentication, interactive catalog filtering, shopping cart functionality, review aggregation, checkout tracking, and a secure administrator dashboard. It integrates a Random Forest Classifier trained on physical body measurements to recommend optimal clothing sizes with confidence ratings and BMI estimations.

## Technology Stack
- **Backend:** Python Flask
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5, Font Awesome
- **Database:** MySQL
- **Machine Learning:** Scikit-learn, Pandas, NumPy
- **Graphics/Charts:** Chart.js

---

## Installation & Setup Instructions

Follow these step-by-step instructions to run the application locally on Windows in VS Code:

### 1. Install Python
Make sure Python 3.8+ is installed on your Windows system and added to your environment `PATH`.

### 2. Open Project in VS Code
Launch VS Code and open the `smart_garment` project folder from your local checkout.

### 3. Create and Activate Virtual Environment
Open a terminal in VS Code (PowerShell or Command Prompt) and run:
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows (PowerShell)
venv\Scripts\Activate.ps1

# Activate on Windows (Command Prompt)
venv\Scripts\activate.bat
```

### 4. Install Dependencies
Run the package installer to load the required Python libraries:
```bash
pip install -r requirements.txt
```

### 5. Database Setup (MySQL)
Make sure you have MySQL server installed and running locally.
1. Log in to your MySQL command line client or tool (like phpMyAdmin, MySQL Workbench).
2. Create the target database:
   ```sql
   CREATE DATABASE smart_garment;
   ```
3. Import the schema script:
   - Option A: Execute the queries inside [database.sql](database.sql) manually.
   - Option B: Run in your MySQL shell:
     ```bash
     mysql -u root -p smart_garment < database.sql
     ```
   - Option C: **Automatic Migration**. Our application `app.py` checks and imports the `database.sql` schema automatically on startup if the database is empty!

### 6. Configure Environment Variables
Create a file named `.env` in the root of the project (if not already created) and configure your database parameters:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_garment
SECRET_KEY=dev-secret-key-12345
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```
*Note: Leave `DB_PASSWORD` blank if your local MySQL instance has no password.*
An administrator account is created on startup only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.

### 7. Train the Machine Learning Model
Run the model compiler script to generate the synthetic body measurement dataset and train the Random Forest Classifier:
```bash
python train_model.py
```
This generates the following files:
- `dataset/garment_size_dataset.csv`
- `models/size_predictor.pkl`
- `models/scaler.pkl`

### 8. Run the Flask Web Application
Start the Flask development server:
```bash
python app.py
```

### 9. Open Browser
Open your browser and navigate to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Default Login Credentials

### Customer Login
Create a customer account on the registration page (`/register`), or log in to access your profile.

### Staff/Administrator Login
- **URL:** [http://127.0.0.1:5000/admin/login](http://127.0.0.1:5000/admin/login)
- Sign in with an administrator account configured for your environment.

---

## Troubleshooting Guide

### 1. Database Connection Failure
- **Error:** The page shows "Database Connection Failed".
- **Solution:** Verify that your MySQL Service is running in Windows Services (`services.msc`). Double-check the DB connection credentials in your `.env` file matches your local instance.

### 2. Missing ML Model Error
- **Error:** Redirected to a page saying "AI Sizing Model Offline".
- **Solution:** You need to run `python train_model.py` in your active virtual environment terminal to compile the model file. Once completed, the files will appear in `models/` directory and the Size Finder will begin working immediately.

### 3. "list object has no attribute shape" Error (Fixed)
- **Problem:** When feeding data directly to the scikit-learn models, passing raw lists caused this shape exception.
- **Solution:** This has been resolved. The input list is converted to a Pandas DataFrame with labeled feature columns before calling `scaler.transform()` and `model.predict()`, preventing the shape lookup error completely.

### 4. Sizing Step Validaion Errors (Fixed)
- **Problem:** Traditional HTML numeric inputs with step restraints reject float decimals.
- **Solution:** Sizing inputs use `step="any"` to support freeform float metrics (e.g. waist circumference `33.1` inches).

---

## Mobile API (Phase A–G)

The project now includes a full mobile REST API backend under `api/` and a React Native / Expo client under `mobile/`.

### API Base URL
```
http://localhost:5000/api/v1
```

### Backend Setup (Mobile API additions)

```bash
# Run migration to add mobile tables
mysql -u root -p smart_garment_db < migrations/001_mobile_tables.sql

# Copy environment variables
copy .env.example .env
# Edit .env with your DB credentials and JWT secrets

# Install new dependencies
pip install -r requirements.txt

# Start server
python app.py
```

### Mobile App Setup

```bash
cd mobile
npm install
npx expo start
```

> **Android emulator:** use `http://10.0.2.2:5000/api/v1` as the API base URL.

### API Endpoint Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login (returns JWT pair) |
| POST | `/auth/refresh` | No | Renew access token |
| POST | `/auth/logout` | Yes | Invalidate refresh token |
| POST | `/auth/forgot-password` | No | Send OTP to email |
| POST | `/auth/reset-password` | No | Reset with OTP |
| GET | `/auth/me` | Yes | Current user info |
| GET | `/products` | No | Paginated + filtered product list |
| GET | `/products/:id` | No | Product detail |
| GET | `/products/search` | No | Full-text search |
| GET | `/products/categories` | No | All categories |
| GET/POST | `/cart` | Yes | Get cart / Add item |
| PUT/DELETE | `/cart/:id` | Yes | Update / Remove item |
| DELETE | `/cart` | Yes | Clear cart |
| POST | `/orders/checkout` | Yes | Place order |
| GET | `/orders` | Yes | Order history |
| GET | `/orders/:id` | Yes | Order detail |
| POST | `/orders/:id/cancel` | Yes | Cancel order |
| GET/PUT | `/profile` | Yes | Get / Update profile |
| PUT | `/profile/change-password` | Yes | Change password |
| GET/POST | `/reviews` | Partial | List / Submit review |
| DELETE | `/reviews/:id` | Yes | Delete own review |
| POST | `/size/predict` | Partial | AI size recommendation |
| GET | `/size/history` | Yes | Past predictions |
| GET | `/notifications` | Yes | User notifications |
| PUT | `/notifications/:id/read` | Yes | Mark as read |
| POST | `/devices/register` | Yes | Register FCM token |
| DELETE | `/devices/unregister` | Yes | Remove FCM token |
| GET | `/admin/dashboard` | Admin | Analytics & stats |
| CRUD | `/admin/products` | Admin | Product management |
| GET/PUT | `/admin/orders` | Admin | Order management |
| GET | `/admin/users` | Admin | User management |
| GET/DELETE | `/admin/reviews` | Admin | Review moderation |

### JWT Authentication Flow

```
POST /auth/login → { access_token (15 min), refresh_token (30 days) }
  ↓
Store in AsyncStorage (mobile)
  ↓
Every request → Authorization: Bearer <access_token>
  ↓
On 401 → POST /auth/refresh → new access_token
  ↓
Logout → POST /auth/logout (invalidates refresh_token in DB)
```

### Real-Time Events (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `order.created` | Server → Client | New order placed |
| `order.status_changed` | Server → Client | Order status updated |
| `stock.low` | Server → Admin | Low stock alert |
| `notification` | Server → Client | Generic push event |

### Docker Deployment

```bash
# Build and start MySQL + Flask + Nginx
copy .env.example .env
docker-compose up --build -d
docker-compose logs -f backend
```

### EAS Build (Production APK / App Bundle)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --profile development --platform android   # Debug APK
eas build --profile production --platform android    # App Bundle
```

### Deployment Checklist

- [ ] Set strong `SECRET_KEY` and `JWT_SECRET` in `.env`
- [ ] Run `migrations/001_mobile_tables.sql` on production DB
- [ ] Add `firebase-service-account.json` for FCM push notifications
- [ ] Set `EXPO_PUBLIC_API_URL` to production HTTPS URL before EAS build
- [ ] Enable HTTPS in `nginx/nginx.conf` (uncomment SSL block)
- [ ] Set `FLASK_ENV=production`

