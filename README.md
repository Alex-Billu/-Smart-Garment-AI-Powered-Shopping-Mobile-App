# Smart Garment – AI-Powered Garment Shopping

Smart Garment is a modern fashion e-commerce application that provides a seamless shopping experience. It includes a responsive web interface, a mobile application, and an AI-powered clothing size recommendation system.

## 🏗️ System Architecture

The application follows a standard client-server architecture integrated with an AI micro-component:

- **Client Layer**:
  - **Web Frontend**: Built with HTML, CSS, JavaScript, and Bootstrap 5, rendered using Flask's Jinja2 templates.
  - **Mobile Application**: A cross-platform mobile client built with React Native and Expo.
- **Server Layer (Flask Backend)**:
  - Manages web application routing, session-based authentication, and overall business logic.
  - Exposes standard RESTful API endpoints (under `/api`) for the mobile application.
- **AI Sizing Engine**:
  - Uses a Random Forest Classifier trained with `scikit-learn` to predict clothing sizes based on physical measurements (height, weight, chest, waist).
- **Data Layer (MySQL)**:
  - A relational database handling structured storage for users, product catalogs, shopping carts, orders, and sizing history.

## 📁 Project Structure

```text
smart_garment/
├── api/                # Mobile REST API (Flask blueprints)
├── dataset/            # Datasets for training the AI sizing model
├── migrations/         # Database migration scripts for updates
├── mobile/             # React Native / Expo mobile application
├── models/             # Trained Machine Learning models (.pkl)
├── nginx/              # Nginx web server configuration
├── static/             # Web frontend static assets (CSS, JS, Images)
├── templates/          # Web frontend HTML templates (Jinja2)
├── tests/              # Unit and integration tests
├── app.py              # Main Flask application entry point
├── database.sql        # MySQL Database schema definitions
├── docker-compose.yml  # Docker compose configuration for easy deployment
├── Dockerfile          # Dockerfile for backend Flask service
├── requirements.txt    # Python backend dependencies
└── train_model.py      # Script to train the AI sizing model
```

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.8+** (for the backend)
- **MySQL Server** (for the database)
- **Node.js & npm** (for the mobile application)

### 2. Backend Setup
1. **Virtual Environment:**
   ```bash
   python -m venv venv
   
   # Activate on Windows:
   venv\Scripts\activate
   # Activate on Mac/Linux:
   source venv/bin/activate
   ```
2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Database Configuration:**
   - Create a MySQL database named `smart_garment`.
   - Copy `.env.example` to `.env` and fill in your database credentials (`DB_USER`, `DB_PASSWORD`).
   - *Note: The application will automatically import the schema (`database.sql`) on the first run!*
4. **Train the AI Model:**
   Generate the sizing prediction model by running:
   ```bash
   python train_model.py
   ```
5. **Start the Web Server:**
   ```bash
   python app.py
   ```
   *Access the web app at: [http://127.0.0.1:5000](http://127.0.0.1:5000)*

### 3. Mobile App Setup
If you want to run the React Native mobile app:
1. **Install Node Dependencies:**
   ```bash
   cd mobile
   npm install
   ```
2. **Start the Expo Server:**
   ```bash
   npx expo start
   ```

## 🧠 AI Size Predictor
The application utilizes a **Random Forest Classifier** built with `scikit-learn` to recommend optimal clothing sizes based on a user's physical body measurements. You must run `train_model.py` to generate the necessary `.pkl` files in the `models/` directory before using the Size Finder feature.

## 🐳 Docker Deployment
For an automated setup, you can deploy the backend, database, and web server together using Docker:
```bash
docker-compose up --build -d
```
