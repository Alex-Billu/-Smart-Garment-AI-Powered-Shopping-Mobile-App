import os
import sys
import pickle
import datetime
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, render_template_string
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-12345')

# Configure upload directory
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'images')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Enable CORS for /api/* requests
@app.after_request
def apply_cors_headers(response):
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ETag, If-None-Match'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        if request.method == 'OPTIONS':
            response.status_code = 200
    return response

# Register API v1 Blueprint & SocketIO
from api import api_bp
from api.realtime import socketio
app.register_blueprint(api_bp)
socketio.init_app(app)

# Helper to check allowed file extensions for image upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------------------------------------
# Database Helpers & Initialization
# -----------------------------------------------------
import sqlite3
import re

class SafeStr(str):
    def strftime(self, fmt='%Y-%m-%d %H:%M:%S'):
        try:
            dt = datetime.datetime.fromisoformat(self.replace('Z', ''))
            return dt.strftime(fmt)
        except Exception:
            try:
                dt = datetime.datetime.strptime(self.split('.')[0], '%Y-%m-%d %H:%M:%S')
                return dt.strftime(fmt)
            except Exception:
                return str(self)

def _convert_val(key, val):
    if val is None:
        return None
    if isinstance(val, str) and ('_at' in key or 'date' in key or re.match(r'^\d{4}-\d{2}-\d{2}', val)):
        try:
            return datetime.datetime.fromisoformat(val.replace('Z', ''))
        except Exception:
            try:
                return datetime.datetime.strptime(val.split('.')[0], '%Y-%m-%d %H:%M:%S')
            except Exception:
                return SafeStr(val)
    return val

def _convert_dict(d):
    if not isinstance(d, dict):
        return d
    return {k: _convert_val(k, v) for k, v in d.items()}

class SQLiteCursorWrapper:
    def __init__(self, cursor, is_dict=False):
        self._cursor = cursor
        self.is_dict = is_dict
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, query, params=None):
        sqlite_query = query.replace('%s', '?')
        sqlite_query = re.sub(r'CREATE DATABASE IF NOT EXISTS \w+;?', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'USE \w+;?', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'ENUM\([^)]+\)', 'TEXT', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'INT AUTO_INCREMENT PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'SHOW TABLES LIKE ([^\n;]+)', r'SELECT name FROM sqlite_master WHERE type="table" AND name=\1', sqlite_query, flags=re.IGNORECASE)
        # Strip MySQL-only DDL clauses not supported by SQLite
        sqlite_query = re.sub(r'\bON UPDATE\s+\S+', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r',?\s*FOREIGN KEY\s*\([^)]*\)\s*REFERENCES\s*\w+\s*\([^)]*\)(\s*ON\s+(DELETE|UPDATE)\s+\w+)*', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'\bDEFAULT CHARSET\s*=\s*\w+', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'\bCOLLATE\s*=?\s*\w+', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'\bENGINE\s*=\s*\w+', '', sqlite_query, flags=re.IGNORECASE)
        sqlite_query = re.sub(r'\bUNSIGNED\b', '', sqlite_query, flags=re.IGNORECASE)

        trimmed = sqlite_query.strip()
        if not trimmed:
            return self

        # Determine if this is a DDL statement (schema-setup) vs. a DML/query statement
        first_word = trimmed.split()[0].upper() if trimmed.split() else ''
        is_ddl = first_word in ('CREATE', 'DROP', 'ALTER', 'ATTACH', 'DETACH')

        try:
            if params is None:
                self._cursor.execute(sqlite_query)
            else:
                self._cursor.execute(sqlite_query, params)
        except Exception as e:
            print(f"[SQLite] Query error: {e}")
            print(f"[SQLite] Query was: {sqlite_query!r}")
            if not is_ddl:
                # Re-raise for DML queries (SELECT/INSERT/UPDATE/DELETE) so bugs are visible
                raise
            # For DDL failures (schema setup), continue silently

        self.lastrowid = self._cursor.lastrowid
        self.rowcount = self._cursor.rowcount
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        if self.is_dict and self._cursor.description:
            cols = [d[0] for d in self._cursor.description]
            return _convert_dict(dict(zip(cols, row)))
        return row

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows:
            return []
        if self.is_dict and self._cursor.description:
            cols = [d[0] for d in self._cursor.description]
            return [_convert_dict(dict(zip(cols, r))) for r in rows]
        return rows

    def close(self):
        try:
            self._cursor.close()
        except Exception:
            pass

class SQLiteConnWrapper:
    def __init__(self, db_path='smart_garment.db'):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self.autocommit = False

    def cursor(self, dictionary=False, buffered=False):
        return SQLiteCursorWrapper(self._conn.cursor(), is_dict=dictionary)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def get_db_connection():
    """Establish and return a connection to MySQL, falling back to SQLite if unavailable."""
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'smart_garment'),
            connect_timeout=3
        )
        return conn
    except Exception as e:
        # Fall back to SQLite database
        return SQLiteConnWrapper(os.path.join(app.root_path, 'smart_garment.db'))

def setup_database():
    """Auto-creates the database schema and seeds sample data if needed."""
    try:
        conn = get_db_connection()
        if not conn:
            return
        cursor = conn.cursor(dictionary=True)
        db_name = os.getenv('DB_NAME', 'smart_garment')
        try:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            cursor.execute(f"USE {db_name}")
        except Exception:
            pass

        # Check if users table exists, indicating initialized db
        cursor.execute("SHOW TABLES LIKE 'users'")
        tables_exist = cursor.fetchone()

        if not tables_exist:
            print("Smart Garment: Schema not found. Initializing database.sql...")
            sql_file_path = os.path.join(app.root_path, 'database.sql')
            if os.path.exists(sql_file_path):
                with open(sql_file_path, 'r', encoding='utf-8') as f:
                    sql_commands = f.read()

                # Simple statement parser
                statements = []
                current_statement = []
                for line in sql_commands.split('\n'):
                    trimmed = line.strip()
                    if not trimmed or trimmed.startswith('--') or trimmed.startswith('#'):
                        continue
                    current_statement.append(line)
                    if trimmed.endswith(';'):
                        statements.append(' '.join(current_statement))
                        current_statement = []

                for stmt in statements:
                    try:
                        cursor.execute(stmt)
                    except Error as err:
                        print(f"DB Setup error executing stmt: {stmt[:100]}...\nError: {err}")
                conn.commit()
                print("Smart Garment: Schema loaded and products seeded.")
            else:
                print("Smart Garment Warning: database.sql not found.")

        admin_email = os.getenv('ADMIN_EMAIL')
        admin_password = os.getenv('ADMIN_PASSWORD')
        if admin_email and admin_password:
            cursor.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
            admin_user = cursor.fetchone()
            if not admin_user:
                hashed_pw = generate_password_hash(admin_password)
                cursor.execute(
                    "INSERT INTO users (name, email, phone, password, role) VALUES (%s, %s, %s, %s, %s)",
                    ('System Administrator', admin_email, '', hashed_pw, 'admin')
                )
                conn.commit()

        # Check if mobile tables exist
        cursor.execute("SHOW TABLES LIKE 'refresh_tokens'")
        mobile_tables_exist = cursor.fetchone()
        if not mobile_tables_exist:
            print("Smart Garment: Mobile API tables not found. Running 001_mobile_tables.sql...")
            mig_file_path = os.path.join(app.root_path, 'migrations', '001_mobile_tables.sql')
            if os.path.exists(mig_file_path):
                with open(mig_file_path, 'r', encoding='utf-8') as f:
                    mig_sql = f.read()
                for stmt in [s.strip() for s in mig_sql.split(';') if s.strip() and not s.strip().startswith('--')]:
                    try:
                        cursor.execute(stmt)
                    except Error as err:
                        print(f"Migration error executing stmt: {err}")
                conn.commit()
                print("Smart Garment: Mobile API tables created.")

        cursor.close()
        conn.close()
    except Error as e:
        print(f"Smart Garment database setup failed: {e}")

# Run database configuration setup
setup_database()

# -----------------------------------------------------
# Database Connection Failure Error Screen
# -----------------------------------------------------
def render_db_error_page():
    return render_template_string("""
        {% extends "base.html" %}
        {% block content %}
        <div class="container py-5">
            <div class="alert alert-danger rounded-0 border-0 shadow-sm p-5 text-center">
                <i class="fa-solid fa-triangle-exclamation text-danger fs-1 mb-4"></i>
                <h2 class="fw-bold">Database Connection Failed</h2>
                <p class="text-muted fs-5">We are unable to connect to the MySQL database server. Please check that:</p>
                <ul class="d-inline-block text-start text-muted mt-2 mb-4">
                    <li>Your local MySQL server is currently running.</li>
                    <li>The database <strong>smart_garment</strong> has been created.</li>
                    <li>The credentials in your <strong>.env</strong> configuration file are correct.</li>
                </ul>
                <div>
                    <a href="{{ request.path }}" class="btn btn-luxury"><i class="fa-solid fa-rotate-right me-2"></i>Retry Connection</a>
                </div>
            </div>
        </div>
        {% endblock %}
    """)

# -----------------------------------------------------
# ML Size Recommendation Predictor Helper
# -----------------------------------------------------
def predict_clothing_size(height_cm, weight_kg, chest_cm, waist_cm):
    """
    Loads saved ML classifier models and returns predicted garment size (S, M, L, XL, XXL)
    along with prediction confidence score.
    """
    model_path = os.path.join(app.root_path, 'models', 'size_predictor.pkl')
    scaler_path = os.path.join(app.root_path, 'models', 'scaler.pkl')

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        return None, None, "Model files not trained"

    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)

        # Build DataFrame with explicit feature headers to avoid 'list object shape' errors
        input_df = pd.DataFrame(
            [[height_cm, weight_kg, chest_cm, waist_cm]],
            columns=['height', 'weight', 'chest', 'waist']
        )

        # Run scaling normalization
        scaled_features = scaler.transform(input_df)

        # Predict sizing label
        predicted_size = model.predict(scaled_features)[0]

        # Calculate prediction confidence score
        probabilities = model.predict_proba(scaled_features)[0]
        class_list = list(model.classes_)
        class_index = class_list.index(predicted_size)
        confidence = probabilities[class_index] * 100.0

        return predicted_size, confidence, None
    except Exception as e:
        return None, None, str(e)

# -----------------------------------------------------
# Frontend Views & Routes
# -----------------------------------------------------

@app.route('/')
def home():
    """Renders the storefront index homepage with featured products."""
    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch featured products
        cursor.execute("SELECT * FROM products ORDER BY id DESC LIMIT 4")
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('index.html', products=products)
    except Error as e:
        cursor.close()
        conn.close()
        return render_template('index.html', products=[])

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Customer authentication login page."""
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        conn = get_db_connection()
        if not conn:
            return render_db_error_page()

        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if user and check_password_hash(user['password'], password):
                # Save session details
                session['user_id'] = user['id']
                session['user_name'] = user['name']
                session['user_email'] = user['email']
                session['role'] = user['role']
                
                # Retrieve last predicted size if exists
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor(dictionary=True)
                    cursor.execute("SELECT predicted_size FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (user['id'],))
                    last_pred = cursor.fetchone()
                    if last_pred:
                        session['last_size'] = last_pred['predicted_size']
                    
                    # Update cart count
                    cursor.execute("SELECT SUM(quantity) as total_qty FROM cart WHERE user_id = %s", (user['id'],))
                    c_count = cursor.fetchone()
                    session['cart_count'] = c_count['total_qty'] or 0
                    cursor.close()
                    conn.close()

                flash("Welcome back! Login successful.", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Invalid email address or password.", "error")
        except Error as e:
            flash(f"An error occurred: {e}", "error")

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Customer registration sign up page."""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not name or not email or not phone or not password:
            flash("All registration fields are required.", "error")
            return render_template('register.html')

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template('register.html')

        conn = get_db_connection()
        if not conn:
            return render_db_error_page()

        cursor = conn.cursor(dictionary=True)
        try:
            # Check duplicate email
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                flash("An account is already registered with this email address.", "error")
                cursor.close()
                conn.close()
                return render_template('register.html')

            # Hash password and insert
            hashed_pw = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (name, email, phone, password, role) VALUES (%s, %s, %s, %s, 'user')",
                (name, email, phone, hashed_pw)
            )
            conn.commit()
            cursor.close()
            conn.close()

            flash("Registration successful! Please login below.", "success")
            return redirect(url_for('login'))
        except Error as e:
            cursor.close()
            conn.close()
            flash(f"Database error during registration: {e}", "error")

    return render_template('register.html')

@app.route('/logout')
def logout():
    """Clear session data and sign user out."""
    session.clear()
    flash("You have logged out successfully.", "success")
    return redirect(url_for('home'))

@app.route('/dashboard')
def dashboard():
    """User account landing dashboard."""
    if 'user_id' not in session:
        flash("Please login to access your dashboard.", "info")
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load user's latest prediction details
        cursor.execute("SELECT * FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (session['user_id'],))
        last_prediction = cursor.fetchone()

        # Load recent orders
        cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY id DESC LIMIT 5", (session['user_id'],))
        recent_orders = cursor.fetchall()

        cursor.close()
        conn.close()
        return render_template('dashboard.html', last_prediction=last_prediction, recent_orders=recent_orders)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading dashboard: {e}", "error")
        return redirect(url_for('home'))

@app.route('/size-finder', methods=['GET', 'POST'])
def size_finder():
    """AI Sizing prediction questionnaire form."""
    if 'user_id' not in session:
        flash("Please log in to use the AI Size Finder and save measurements.", "info")
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    last_pred = None
    try:
        cursor.execute("SELECT * FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (session['user_id'],))
        last_pred = cursor.fetchone()
    except Error as e:
        print(f"Error loading last prediction: {e}")
    finally:
        cursor.close()
        conn.close()

    if request.method == 'POST':
        unit = request.form.get('unit_preference', 'metric')
        try:
            height = float(request.form.get('height', '0'))
            weight = float(request.form.get('weight', '0'))
            chest = float(request.form.get('chest', '0'))
            waist = float(request.form.get('waist', '0'))
        except ValueError:
            flash("Please enter valid decimal values for all measurements.", "error")
            return render_template('size_finder.html', last_pred=last_pred)

        fit_pref = request.form.get('fit_preference', 'Regular Fit')

        # Unit boundary checks
        if unit == 'imperial':
            if height < 40 or weight < 20 or chest < 20 or waist < 20:
                flash("Imperial measurements must satisfy: Height >= 40 in, Weight/Chest/Waist >= 20.", "error")
                return render_template('size_finder.html', last_pred=last_pred)
            # Convert units to metric internals (inches -> cm, lbs -> kg)
            height_cm = height * 2.54
            weight_kg = weight * 0.45359237
            chest_cm = chest * 2.54
            waist_cm = waist * 2.54
        else:
            if height < 100 or weight < 20 or chest < 20 or waist < 20:
                flash("Metric measurements must satisfy: Height >= 100 cm, Weight/Chest/Waist >= 20.", "error")
                return render_template('size_finder.html', last_pred=last_pred)
            height_cm = height
            weight_kg = weight
            chest_cm = chest
            waist_cm = waist

        # Run size predictor
        predicted_size, confidence, err_msg = predict_clothing_size(height_cm, weight_kg, chest_cm, waist_cm)

        if err_msg:
            # Model not trained template error
            if "Model files not trained" in err_msg:
                return render_template_string("""
                    {% extends "base.html" %}
                    {% block content %}
                    <div class="container py-5">
                        <div class="alert alert-warning rounded-0 border-0 shadow-sm p-5 text-center">
                            <i class="fa-solid fa-triangle-exclamation text-warning fs-1 mb-4"></i>
                            <h2 class="fw-bold">AI Sizing Model Offline</h2>
                            <p class="text-muted fs-5">The Random Forest size classifier model has not been trained yet. Please run the training script to initialize model files.</p>
                            <div class="mt-4 bg-dark text-white p-3 text-start font-monospace small">
                                # In your VS Code terminal:<br>
                                python train_model.py
                            </div>
                            <div class="mt-4">
                                <a href="{{ url_for('size_finder') }}" class="btn btn-luxury-outline">Back to Finder</a>
                            </div>
                        </div>
                    </div>
                    {% endblock %}
                """)
            flash(f"ML Sizing Error: {err_msg}", "error")
            return render_template('size_finder.html', last_pred=last_pred)

        # Calculate BMI
        height_m = height_cm / 100.0
        bmi = weight_kg / (height_m ** 2)

        # Save to DB
        conn = get_db_connection()
        if not conn:
            return render_db_error_page()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO size_predictions 
                   (user_id, height, weight, chest, waist, fit_preference, predicted_size, confidence, bmi) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (session['user_id'], height_cm, weight_kg, chest_cm, waist_cm, fit_pref, predicted_size, confidence, bmi)
            )
            conn.commit()
            session['last_size'] = predicted_size
            cursor.close()
            conn.close()
            return redirect(url_for('prediction_result'))
        except Error as e:
            cursor.close()
            conn.close()
            flash(f"Error saving prediction to database: {e}", "error")

    return render_template('size_finder.html', last_pred=last_pred)

@app.route('/prediction-result')
def prediction_result():
    """Displays predicted size results and BMI summaries."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load user's latest prediction details
        cursor.execute("SELECT * FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (session['user_id'],))
        prediction = cursor.fetchone()

        if not prediction:
            cursor.close()
            conn.close()
            return redirect(url_for('size_finder'))

        # BMI Category determination
        bmi = prediction['bmi']
        if bmi < 18.5:
            bmi_category = "Underweight"
        elif 18.5 <= bmi < 25.0:
            bmi_category = "Normal"
        elif 25.0 <= bmi < 30.0:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obese"

        # Fetch recommended products in their size
        # Use wildcard matching on comma-separated values, e.g., sizes LIKE '%M%'
        size = prediction['predicted_size']
        cursor.execute(
            """SELECT * FROM products 
               WHERE sizes = %s OR sizes LIKE %s OR sizes LIKE %s OR sizes LIKE %s 
               ORDER BY id DESC LIMIT 4""",
            (size, f"{size},%", f"%,{size}", f"%,{size},%")
        )
        recommended_products = cursor.fetchall()

        cursor.close()
        conn.close()
        return render_template(
            'prediction_result.html',
            prediction=prediction,
            bmi_category=bmi_category,
            recommended_products=recommended_products
        )
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error showing size analysis: {e}", "error")
        return redirect(url_for('dashboard'))

@app.route('/shop')
def shop():
    """E-commerce product catalog browsing portal."""
    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    
    # Categories list
    categories = ["Men's Wear", "Women's Wear", "Inner Wear", "Night Wear", "T-Shirts", "Shirts", "Pants", "Dresses"]

    # Gather filters
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    size = request.args.get('size', '').strip()
    min_price = request.args.get('min_price', '').strip()
    max_price = request.args.get('max_price', '').strip()
    sort = request.args.get('sort', 'newest').strip()

    query = """
        SELECT p.*, COALESCE(AVG(r.rating), 4.5) as avg_rating 
        FROM products p 
        LEFT JOIN reviews r ON p.id = r.product_id 
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (p.name LIKE %s OR p.description LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
    if category:
        query += " AND p.category = %s"
        params.append(category)
    if size:
        # Use LIKE-based size match (works in both MySQL and SQLite)
        # Matches: exact, at start ("S,..."), at end ("...,S"), or in middle ("...,S,...")
        query += " AND (p.sizes = %s OR p.sizes LIKE %s OR p.sizes LIKE %s OR p.sizes LIKE %s)"
        params.append(size)
        params.append(f"{size},%")
        params.append(f"%,{size}")
        params.append(f"%,{size},%")
    if min_price:
        query += " AND p.price >= %s"
        params.append(float(min_price))
    if max_price:
        query += " AND p.price <= %s"
        params.append(float(max_price))

    query += " GROUP BY p.id"

    # Sorting options
    if sort == 'price_asc':
        query += " ORDER BY p.price ASC"
    elif sort == 'price_desc':
        query += " ORDER BY p.price DESC"
    elif sort == 'rating':
        query += " ORDER BY avg_rating DESC"
    else:
        query += " ORDER BY p.id DESC"

    try:
        cursor.execute(query, tuple(params))
        products = cursor.fetchall()
        cursor.close()
        conn.close()

        filters = {
            'search': search, 'category': category, 'size': size,
            'min_price': min_price, 'max_price': max_price, 'sort': sort
        }
        return render_template('products.html', products=products, categories=categories, filters=filters)
    except Exception as e:
        cursor.close()
        conn.close()
        flash(f"Error loading catalog: {e}", "error")
        return redirect(url_for('home'))

@app.route('/product/<int:id>')
def product_details(id):
    """Garment detailed specification view."""
    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load product details
        cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
        product = cursor.fetchone()

        if not product:
            cursor.close()
            conn.close()
            flash("Product not found.", "error")
            return redirect(url_for('shop'))

        # Load reviews list
        cursor.execute(
            """SELECT r.*, u.name as user_name 
               FROM reviews r 
               JOIN users u ON r.user_id = u.id 
               WHERE r.product_id = %s 
               ORDER BY r.created_at DESC""", 
            (id,)
        )
        reviews = cursor.fetchall()

        # Compute average rating
        cursor.execute("SELECT AVG(rating) as avg_r FROM reviews WHERE product_id = %s", (id,))
        avg_r_row = cursor.fetchone()
        avg_rating = avg_r_row['avg_r'] if avg_r_row['avg_r'] else 4.5

        # Check if customer purchased product to allow review submissions
        can_review = False
        if 'user_id' in session:
            cursor.execute(
                """SELECT oi.id 
                   FROM order_items oi 
                   JOIN orders o ON oi.order_id = o.id 
                   WHERE o.user_id = %s AND oi.product_id = %s AND o.status = 'Delivered'""",
                (session['user_id'], id)
            )
            if cursor.fetchone():
                can_review = True

        cursor.close()
        conn.close()
        return render_template('product_details.html', product=product, reviews=reviews, avg_rating=avg_rating, can_review=can_review)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading product details: {e}", "error")
        return redirect(url_for('shop'))

@app.route('/product/<int:id>/review', methods=['POST'])
def submit_review(id):
    """Submits customer reviews on products they have purchased."""
    if 'user_id' not in session:
        flash("Please login to submit product reviews.", "info")
        return redirect(url_for('login'))

    rating = request.form.get('rating')
    review_text = request.form.get('review', '').strip()

    if not rating:
        flash("Please select a rating score.", "error")
        return redirect(url_for('product_details', id=id))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor()
    try:
        # Re-verify purchased history
        cursor.execute(
            """SELECT oi.id 
               FROM order_items oi 
               JOIN orders o ON oi.order_id = o.id 
               WHERE o.user_id = %s AND oi.product_id = %s AND o.status = 'Delivered'""",
            (session['user_id'], id)
        )
        purchased = cursor.fetchone()

        if not purchased:
            cursor.close()
            conn.close()
            flash("You can only submit reviews for products you have purchased and had delivered.", "error")
            return redirect(url_for('product_details', id=id))

        cursor.execute(
            "INSERT INTO reviews (user_id, product_id, rating, review) VALUES (%s, %s, %s, %s)",
            (session['user_id'], id, rating, review_text)
        )
        conn.commit()
        cursor.close()
        conn.close()
        flash("Thank you for your feedback! Review posted successfully.", "success")
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Database error writing review: {e}", "error")

    return redirect(url_for('product_details', id=id))

# -----------------------------------------------------
# Shopping Cart Operations
# -----------------------------------------------------

@app.route('/cart')
def cart():
    """Displays cart items summary."""
    if 'user_id' not in session:
        flash("Please login to access your shopping cart.", "info")
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT c.id as cart_id, c.product_id, c.size, c.quantity, 
                      p.name, p.category, p.price, p.image, p.stock, p.sizes as available_sizes
               FROM cart c 
               JOIN products p ON c.product_id = p.id 
               WHERE c.user_id = %s""",
            (session['user_id'],)
        )
        cart_items = cursor.fetchall()

        # Compute totals
        cart_total = sum(item['price'] * item['quantity'] for item in cart_items)
        
        # Update session cart count
        session['cart_count'] = sum(item['quantity'] for item in cart_items)

        cursor.close()
        conn.close()
        return render_template('cart.html', cart_items=cart_items, cart_total=cart_total)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading cart details: {e}", "error")
        return redirect(url_for('home'))

@app.route('/cart/add', methods=['POST'])
def add_to_cart():
    """Appends garment size item to customer cart database."""
    if 'user_id' not in session:
        flash("Please login to add items to your shopping cart.", "info")
        return redirect(url_for('login'))

    product_id = request.form.get('product_id')
    size = request.form.get('size')
    try:
        qty = int(request.form.get('quantity', 1))
    except ValueError:
        qty = 1

    if not product_id or not size:
        flash("Garment ID and size choice must be specified.", "error")
        return redirect(url_for('shop'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load product details
        cursor.execute("SELECT stock, sizes FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()

        if not product:
            cursor.close()
            conn.close()
            flash("Garment record not found.", "error")
            return redirect(url_for('shop'))

        # Check stock
        if product['stock'] <= 0:
            cursor.close()
            conn.close()
            flash("Sorry, this garment is currently out of stock.", "error")
            return redirect(url_for('shop'))

        # Validate size selection
        if size not in product['sizes'].split(','):
            cursor.close()
            conn.close()
            flash("Selected size is not available for this garment.", "error")
            return redirect(url_for('product_details', id=product_id))

        # Check if item in that size already exists in user's cart
        cursor.execute("SELECT id, quantity FROM cart WHERE user_id = %s AND product_id = %s AND size = %s",
                       (session['user_id'], product_id, size))
        existing_item = cursor.fetchone()

        if existing_item:
            # Check combined stock limits
            new_qty = existing_item['quantity'] + qty
            if new_qty > product['stock']:
                new_qty = product['stock']
            cursor.execute("UPDATE cart SET quantity = %s WHERE id = %s", (new_qty, existing_item['id']))
        else:
            if qty > product['stock']:
                qty = product['stock']
            cursor.execute("INSERT INTO cart (user_id, product_id, size, quantity) VALUES (%s, %s, %s, %s)",
                           (session['user_id'], product_id, size, qty))

        conn.commit()

        # Update cart total count in session
        cursor.execute("SELECT SUM(quantity) as total_qty FROM cart WHERE user_id = %s", (session['user_id'],))
        c_count = cursor.fetchone()
        session['cart_count'] = c_count['total_qty'] or 0

        cursor.close()
        conn.close()
        flash("Garment added to cart successfully.", "success")
        return redirect(url_for('cart'))
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error updating shopping cart: {e}", "error")
        return redirect(url_for('shop'))

@app.route('/cart/update-quantity', methods=['POST'])
def update_cart_quantity():
    """Adjusts item quantity inside cart."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    cart_item_id = request.form.get('cart_item_id')
    try:
        quantity = int(request.form.get('quantity', 1))
    except ValueError:
        quantity = 1

    if not cart_item_id or quantity < 1:
        return redirect(url_for('cart'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Check stock limits
        cursor.execute(
            """SELECT c.id, p.stock 
               FROM cart c 
               JOIN products p ON c.product_id = p.id 
               WHERE c.id = %s AND c.user_id = %s""", 
            (cart_item_id, session['user_id'])
        )
        item = cursor.fetchone()

        if item:
            final_qty = min(quantity, item['stock'])
            cursor.execute("UPDATE cart SET quantity = %s WHERE id = %s", (final_qty, cart_item_id))
            conn.commit()

        cursor.close()
        conn.close()
    except Error as e:
        print(f"Error updating cart quantity: {e}")
        cursor.close()
        conn.close()

    return redirect(url_for('cart'))

@app.route('/cart/update-size', methods=['POST'])
def update_cart_item_size():
    """Switches garment sizing category for cart item."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    cart_item_id = request.form.get('cart_item_id')
    size = request.form.get('size', '').strip()

    if not cart_item_id or not size:
        return redirect(url_for('cart'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Check size availability
        cursor.execute(
            """SELECT c.id, c.product_id, p.sizes 
               FROM cart c 
               JOIN products p ON c.product_id = p.id 
               WHERE c.id = %s AND c.user_id = %s""",
            (cart_item_id, session['user_id'])
        )
        item = cursor.fetchone()

        if item and size in item['sizes'].split(','):
            # Check if user already has an item with this size in cart. Merge if so.
            cursor.execute(
                "SELECT id, quantity FROM cart WHERE user_id = %s AND product_id = %s AND size = %s AND id != %s",
                (session['user_id'], item['product_id'], size, cart_item_id)
            )
            duplicate = cursor.fetchone()

            if duplicate:
                # Merge quantities
                cursor.execute("SELECT quantity FROM cart WHERE id = %s", (cart_item_id,))
                orig = cursor.fetchone()
                # Remove current item, update duplicate
                cursor.execute("DELETE FROM cart WHERE id = %s", (cart_item_id,))
                cursor.execute("UPDATE cart SET quantity = quantity + %s WHERE id = %s", (orig['quantity'], duplicate['id']))
            else:
                cursor.execute("UPDATE cart SET size = %s WHERE id = %s", (size, cart_item_id))
            conn.commit()
            flash(f"Cart size updated to {size}.", "success")
        else:
            flash("Sizing selection unavailable for this garment.", "error")
        cursor.close()
        conn.close()
    except Error as e:
        print(f"Error updating cart size: {e}")
        cursor.close()
        conn.close()

    return redirect(url_for('cart'))

@app.route('/cart/remove', methods=['POST'])
def remove_from_cart():
    """Deletes item from cart database."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    cart_item_id = request.form.get('cart_item_id')

    if not cart_item_id:
        return redirect(url_for('cart'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM cart WHERE id = %s AND user_id = %s", (cart_item_id, session['user_id']))
        conn.commit()

        # Update cart total count in session
        cursor.execute("SELECT SUM(quantity) as total_qty FROM cart WHERE user_id = %s", (session['user_id'],))
        c_count = cursor.fetchone()
        session['cart_count'] = c_count[0] or 0

        cursor.close()
        conn.close()
        flash("Item removed from cart.", "info")
    except Error as e:
        print(f"Error removing cart item: {e}")
        cursor.close()
        conn.close()

    return redirect(url_for('cart'))

# -----------------------------------------------------
# Checkout & Order Placement
# -----------------------------------------------------

@app.route('/checkout')
def checkout():
    """Checkout shipping details form page."""
    if 'user_id' not in session:
        flash("Please log in to complete checkout.", "info")
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load cart details
        cursor.execute(
            """SELECT c.*, p.name, p.price 
               FROM cart c 
               JOIN products p ON c.product_id = p.id 
               WHERE c.user_id = %s""",
            (session['user_id'],)
        )
        cart_items = cursor.fetchall()

        if not cart_items:
            cursor.close()
            conn.close()
            flash("Your cart is empty. Please add items before checking out.", "error")
            return redirect(url_for('shop'))

        # Load user profile to prefill checkout
        cursor.execute("SELECT * FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()

        cart_total = sum(item['price'] * item['quantity'] for item in cart_items)
        cursor.close()
        conn.close()

        return render_template('checkout.html', cart_items=cart_items, cart_total=cart_total, user=user)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading checkout configurations: {e}", "error")
        return redirect(url_for('cart'))

@app.route('/place-order', methods=['POST'])
def place_order():
    """Generates order database records and decrements stock."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    phone = request.form.get('phone', '').strip()
    address = request.form.get('address', '').strip()
    city = request.form.get('city', '').strip()
    state = request.form.get('state', '').strip()
    pincode = request.form.get('pincode', '').strip()
    payment_method = request.form.get('payment_method', 'Cash on Delivery')

    if not name or not email or not phone or not address or not city or not state or not pincode:
        flash("All shipping details fields are required.", "error")
        return redirect(url_for('checkout'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load cart details
        cursor.execute(
            """SELECT c.*, p.name as product_name, p.price, p.stock 
               FROM cart c 
               JOIN products p ON c.product_id = p.id 
               WHERE c.user_id = %s""",
            (session['user_id'],)
        )
        cart_items = cursor.fetchall()

        if not cart_items:
            cursor.close()
            conn.close()
            flash("Your cart is empty.", "error")
            return redirect(url_for('shop'))

        # Verify stock levels for all items first
        for item in cart_items:
            if item['quantity'] > item['stock']:
                flash(f"Sorry, '{item['product_name']}' has only {item['stock']} items available. Please edit your cart.", "error")
                cursor.close()
                conn.close()
                return redirect(url_for('cart'))

        cart_total = sum(item['price'] * item['quantity'] for item in cart_items)

        # 1. Create main order record
        cursor.execute(
            """INSERT INTO orders (user_id, total_amount, address, city, state, pincode, phone, payment_method, status) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')""",
            (session['user_id'], cart_total, address, city, state, pincode, phone, payment_method)
        )
        order_id = cursor.lastrowid

        # 2. Insert items and decrement stock levels
        for item in cart_items:
            cursor.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, size, quantity, price) 
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (order_id, item['product_id'], item['product_name'], item['size'], item['quantity'], item['price'])
            )
            # Update stock
            new_stock = item['stock'] - item['quantity']
            cursor.execute("UPDATE products SET stock = %s WHERE id = %s", (new_stock, item['product_id']))

        # 3. Clear customer cart
        cursor.execute("DELETE FROM cart WHERE user_id = %s", (session['user_id'],))
        conn.commit()
        
        # Reset cart session count
        session['cart_count'] = 0

        # Trigger real-time order creation event & push notification
        try:
            from api.realtime import notify_order_created
            notify_order_created(order_id, session['user_id'], cart_total)
        except Exception:
            pass

        cursor.close()
        conn.close()
        flash("Order placed successfully!", "success")
        return redirect(url_for('order_success', id=order_id))
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error processing checkout order: {e}", "error")
        return redirect(url_for('checkout'))

@app.route('/order-success/<int:id>')
def order_success(id):
    """Displays successful order trace."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load order details ensuring it belongs to the user
        cursor.execute("SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = %s AND o.user_id = %s", (id, session['user_id']))
        order = cursor.fetchone()
        cursor.close()
        conn.close()

        if not order:
            flash("Order record not found.", "error")
            return redirect(url_for('dashboard'))

        return render_template('order_success.html', order=order)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error fetching order success trace: {e}", "error")
        return redirect(url_for('dashboard'))

@app.route('/orders')
def orders():
    """Lists history of all user orders."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY id DESC", (session['user_id'],))
        orders = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('orders.html', orders=orders)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading orders history: {e}", "error")
        return redirect(url_for('dashboard'))

@app.route('/orders/<int:id>')
def order_details(id):
    """Specific order details view."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch order details
        cursor.execute("SELECT * FROM orders WHERE id = %s AND user_id = %s", (id, session['user_id']))
        order = cursor.fetchone()

        if not order:
            cursor.close()
            conn.close()
            flash("Order not found.", "error")
            return redirect(url_for('orders'))

        # Fetch items details
        cursor.execute("SELECT * FROM order_items WHERE order_id = %s", (id,))
        items = cursor.fetchall()

        cursor.close()
        conn.close()
        return render_template('order_details.html', order=order, items=items)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading order details: {e}", "error")
        return redirect(url_for('orders'))

# -----------------------------------------------------
# User Profile Operations
# -----------------------------------------------------

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    """Customer profile edit and measurements page."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        city = request.form.get('city', '').strip()
        state = request.form.get('state', '').strip()
        pincode = request.form.get('pincode', '').strip()

        if not name or not email or not phone:
            flash("Name, email, and phone number are required fields.", "error")
            return redirect(url_for('profile'))

        try:
            # Check duplicate email excluding current user
            cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, session['user_id']))
            if cursor.fetchone():
                flash("Another user is already registered with this email address.", "error")
            else:
                # Update user record
                cursor.execute(
                    """UPDATE users 
                       SET name = %s, email = %s, phone = %s, address = %s, city = %s, state = %s, pincode = %s 
                       WHERE id = %s""",
                    (name, email, phone, address, city, state, pincode, session['user_id'])
                )
                conn.commit()
                session['user_name'] = name
                session['user_email'] = email
                flash("Profile details updated successfully.", "success")
        except Error as e:
            flash(f"Database error updating profile: {e}", "error")

    # Load updated user details
    user = None
    last_prediction = None
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()
        
        cursor.execute("SELECT * FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (session['user_id'],))
        last_prediction = cursor.fetchone()
    except Error as e:
        print(f"Error loading user profile: {e}")
    finally:
        cursor.close()
        conn.close()

    # Renders profile page
    return render_template('profile.html', user=user, last_prediction=last_prediction)

@app.route('/my-reviews')
def my_reviews():
    """Lists reviews written by logged-in user."""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT r.*, p.name as product_name, p.category 
               FROM reviews r 
               JOIN products p ON r.product_id = p.id 
               WHERE r.user_id = %s 
               ORDER BY r.id DESC""",
            (session['user_id'],)
        )
        reviews = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('reviews.html', reviews=reviews)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading review records: {e}", "error")
        return redirect(url_for('dashboard'))

# -----------------------------------------------------
# Administrative Portal Views & Controls
# -----------------------------------------------------

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin portal login routing."""
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        conn = get_db_connection()
        if not conn:
            return render_db_error_page()

        cursor = conn.cursor(dictionary=True)
        try:
            # Check user role and credentials
            cursor.execute("SELECT * FROM users WHERE email = %s AND role = 'admin'", (email,))
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if user and check_password_hash(user['password'], password):
                session['admin_id'] = user['id']
                session['admin_email'] = user['email']
                session['admin_name'] = user['name']
                session['role'] = 'admin'
                flash("Admin authorization login successful.", "success")
                return redirect(url_for('admin_dashboard'))
            else:
                flash("Invalid admin email or password credentials.", "error")
        except Error as e:
            flash(f"Admin login query error: {e}", "error")

    return render_template('admin/admin_login.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    """Administrative main dashboard with metrics and Chart.js endpoints."""
    if session.get('role') != 'admin':
        flash("Unauthorized portal access. Admin credentials required.", "error")
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Helper for safe column extraction
        def safe_val(row, key='count', default=0):
            if row is None:
                return default
            if isinstance(row, dict):
                v = row.get(key)
                return v if v is not None else default
            try:
                v = row[key]
                return v if v is not None else default
            except Exception:
                try:
                    return row[0] if row[0] is not None else default
                except Exception:
                    return default

        # Load Counters
        stats = {}
        cursor.execute("SELECT COUNT(id) as count FROM users WHERE role = 'user'")
        stats['total_users'] = safe_val(cursor.fetchone(), 'count', 0)
        
        cursor.execute("SELECT COUNT(id) as count FROM products")
        stats['total_products'] = safe_val(cursor.fetchone(), 'count', 0)
        
        cursor.execute("SELECT COUNT(id) as count FROM orders")
        stats['total_orders'] = safe_val(cursor.fetchone(), 'count', 0)
        
        cursor.execute("SELECT SUM(total_amount) as total FROM orders WHERE status != 'Cancelled'")
        stats['total_revenue'] = float(safe_val(cursor.fetchone(), 'total', 0.0))
        
        cursor.execute("SELECT COUNT(id) as count FROM reviews")
        stats['total_reviews'] = safe_val(cursor.fetchone(), 'count', 0)

        # Chart 1: Sales and Orders Over Time (Last 7 Days)
        cursor.execute(
            """SELECT DATE(created_at) as date, SUM(total_amount) as sales, COUNT(id) as count 
               FROM orders 
               WHERE status != 'Cancelled' 
               GROUP BY DATE(created_at) 
               ORDER BY date ASC 
               LIMIT 7"""
        )
        chart_rows = cursor.fetchall() or []
        
        # Populate lists dynamically
        sales_labels = []
        sales_values = []
        order_values = []
        
        # Build last 7 days baseline
        for i in range(6, -1, -1):
            day = datetime.date.today() - datetime.timedelta(days=i)
            sales_labels.append(day.strftime('%Y-%m-%d'))
            sales_values.append(0.0)
            order_values.append(0)

        # Merge actual database records into baseline
        for row in chart_rows:
            if not row:
                continue
            r_date = row.get('date') if isinstance(row, dict) else row[0]
            r_sales = row.get('sales') if isinstance(row, dict) else row[1]
            r_count = row.get('count') if isinstance(row, dict) else row[2]
            
            date_str = r_date.strftime('%Y-%m-%d') if isinstance(r_date, (datetime.date, datetime.datetime)) else str(r_date)
            if date_str in sales_labels:
                idx = sales_labels.index(date_str)
                sales_values[idx] = float(r_sales or 0.0)
                order_values[idx] = int(r_count or 0)

        # Chart 2: Category distribution split
        cursor.execute("SELECT category, COUNT(id) as count FROM products GROUP BY category")
        cat_rows = cursor.fetchall() or []
        cat_labels = [row.get('category', '') if isinstance(row, dict) else row[0] for row in cat_rows]
        cat_values = [row.get('count', 0) if isinstance(row, dict) else row[1] for row in cat_rows]

        chart_data = {
            'sales_labels': sales_labels, 'sales_values': sales_values, 'order_values': order_values,
            'cat_labels': cat_labels, 'cat_values': cat_values
        }

        cursor.close()
        conn.close()
        return render_template('admin/admin_dashboard.html', stats=stats, chart_data=chart_data)
    except Exception as e:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        flash(f"Error loading administrative stats: {e}", "error")
        return render_template('admin/admin_dashboard.html', stats={'total_users': 0, 'total_products': 0, 'total_orders': 0, 'total_revenue': 0.0, 'total_reviews': 0}, chart_data={'sales_labels': [], 'sales_values': [], 'order_values': [], 'cat_labels': [], 'cat_values': []})

@app.route('/admin/products')
def admin_products():
    """Lists storefront catalog products for admin CRUD."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products ORDER BY id DESC")
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('admin/admin_products.html', products=products)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading admin products: {e}", "error")
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/products/add', methods=['GET', 'POST'])
def admin_add_product():
    """Admin product addition form handling."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        category = request.form.get('category', '').strip()
        description = request.form.get('description', '').strip()
        try:
            price = float(request.form.get('price', 0))
            stock = int(request.form.get('stock', 0))
        except ValueError:
            flash("Invalid price or stock parameters.", "error")
            return render_template('admin/admin_add_product.html')

        sizes_list = request.form.getlist('sizes')
        sizes_str = ",".join(sizes_list)

        if not name or not category or not sizes_str:
            flash("Product name, category, and size selections are required.", "error")
            return render_template('admin/admin_add_product.html')

        # Handle Image File Upload
        image_filename = 'placeholder.jpg'
        image_file = request.files.get('image')
        if image_file and image_file.filename != '':
            if allowed_file(image_file.filename):
                filename = secure_filename(image_file.filename)
                # Append timestamp to name to keep distinct
                unique_filename = f"{int(datetime.datetime.now().timestamp())}_{filename}"
                image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                image_filename = unique_filename
            else:
                flash("Image file type not allowed.", "error")
                return render_template('admin/admin_add_product.html')

        conn = get_db_connection()
        if not conn:
            return render_db_error_page()

        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO products (name, category, description, price, image, sizes, stock) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (name, category, description, price, image_filename, sizes_str, stock)
            )
            conn.commit()
            cursor.close()
            conn.close()
            flash("Product uploaded successfully.", "success")
            return redirect(url_for('admin_products'))
        except Error as e:
            cursor.close()
            conn.close()
            flash(f"Error saving product to database: {e}", "error")

    return render_template('admin/admin_add_product.html')

@app.route('/admin/products/edit/<int:id>', methods=['GET', 'POST'])
def admin_edit_product(id):
    """Admin product edit form handling."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (id,))
        product = cursor.fetchone()
    except Error as e:
        print(f"Error loading product: {e}")
        product = None

    if not product:
        cursor.close()
        conn.close()
        flash("Product not found.", "error")
        return redirect(url_for('admin_products'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        category = request.form.get('category', '').strip()
        description = request.form.get('description', '').strip()
        try:
            price = float(request.form.get('price', 0))
            stock = int(request.form.get('stock', 0))
        except ValueError:
            flash("Invalid price or stock parameters.", "error")
            cursor.close()
            conn.close()
            return redirect(url_for('admin_edit_product', id=id))

        sizes_list = request.form.getlist('sizes')
        sizes_str = ",".join(sizes_list)

        if not name or not category or not sizes_str:
            flash("Product name, category, and size selections are required.", "error")
            cursor.close()
            conn.close()
            return redirect(url_for('admin_edit_product', id=id))

        image_filename = product['image']
        image_file = request.files.get('image')
        if image_file and image_file.filename != '':
            if allowed_file(image_file.filename):
                filename = secure_filename(image_file.filename)
                unique_filename = f"{int(datetime.datetime.now().timestamp())}_{filename}"
                image_file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                image_filename = unique_filename

        try:
            cursor.execute(
                """UPDATE products 
                   SET name = %s, category = %s, description = %s, price = %s, image = %s, sizes = %s, stock = %s 
                   WHERE id = %s""",
                (name, category, description, price, image_filename, sizes_str, stock, id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            flash("Product updated successfully.", "success")
            return redirect(url_for('admin_products'))
        except Error as e:
            cursor.close()
            conn.close()
            flash(f"Error saving product alterations: {e}", "error")
            return redirect(url_for('admin_edit_product', id=id))

    cursor.close()
    conn.close()
    return render_template('admin/admin_edit_product.html', product=product)

@app.route('/admin/products/delete/<int:id>', methods=['POST'])
def admin_delete_product(id):
    """Deletes product details from catalog."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM products WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        flash("Product deleted successfully.", "info")
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error deleting product: {e}", "error")

    return redirect(url_for('admin_products'))

@app.route('/admin/orders')
def admin_orders():
    """Lists global customer orders trace logs."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        # Load orders join user details
        cursor.execute(
            """SELECT o.*, u.name as customer_name, u.email as customer_email 
               FROM orders o 
               JOIN users u ON o.user_id = u.id 
               ORDER BY o.id DESC"""
        )
        orders = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('admin/admin_orders.html', orders=orders)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading global orders: {e}", "error")
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/orders/<int:id>/status', methods=['POST'])
def admin_update_order_status(id):
    """Transition state flags on customer orders."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    status = request.form.get('status')
    if not status:
        return redirect(url_for('admin_orders'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM orders WHERE id = %s", (id,))
        order_rec = cursor.fetchone()

        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (status, id))
        conn.commit()

        # Trigger real-time order status change event & push notification
        if order_rec:
            try:
                from api.realtime import notify_order_status_changed
                notify_order_status_changed(id, order_rec['user_id'], status)
            except Exception:
                pass

        cursor.close()
        conn.close()
        flash(f"Order status updated to '{status}'.", "success")
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error updating order state: {e}", "error")

    return redirect(url_for('admin_orders'))

@app.route('/admin/users')
def admin_users():
    """Directory log of user accounts."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users ORDER BY role ASC, id DESC")
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('admin/admin_users.html', users=users)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading users log: {e}", "error")
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/users/delete/<int:id>', methods=['POST'])
def admin_delete_user(id):
    """Administrative user account deletions."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    if session.get('admin_id') == id:
        flash("You cannot delete your own admin account.", "error")
        return redirect(url_for('admin_users'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        flash("User account deleted successfully.", "info")
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error deleting user account: {e}", "error")

    return redirect(url_for('admin_users'))

@app.route('/admin/reviews')
def admin_reviews():
    """Administrative customer review listings."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT r.*, u.name as user_name, u.email as user_email, p.name as product_name, p.category 
               FROM reviews r 
               JOIN users u ON r.user_id = u.id 
               JOIN products p ON r.product_id = p.id 
               ORDER BY r.id DESC"""
        )
        reviews = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('admin/admin_reviews.html', reviews=reviews)
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error loading customer reviews: {e}", "error")
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/reviews/delete/<int:id>', methods=['POST'])
def admin_delete_review(id):
    """Deletes/moderates customer reviews."""
    if session.get('role') != 'admin':
        return redirect(url_for('admin_login'))

    conn = get_db_connection()
    if not conn:
        return render_db_error_page()

    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM reviews WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        flash("Customer review deleted successfully.", "info")
    except Error as e:
        cursor.close()
        conn.close()
        flash(f"Error deleting customer review: {e}", "error")

    return redirect(url_for('admin_reviews'))

# -----------------------------------------------------
# Bootstrap Server Run
# -----------------------------------------------------
if __name__ == '__main__':
    # Ensure port 5000 is open and start SocketIO development server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True, use_reloader=False)
