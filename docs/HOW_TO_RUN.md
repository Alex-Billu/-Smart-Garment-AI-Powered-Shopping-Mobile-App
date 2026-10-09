# How to Run the Smart Garment Project

This guide covers how to set up and run both the Flask backend and the React Native/Expo frontend on your local development machine.

## Prerequisites

- **Python 3.8+** installed.
- **Node.js (v18+)** and **npm** installed.
- **MySQL server** running locally (optional, the app will automatically fall back to a local SQLite database if MySQL is unavailable).

---

## 1. Setting up the Backend (Flask API)

1. Open your terminal and navigate to the root directory of the project (`d:\DEVA CAPSTONE\smart_garment`).
2. Create a fresh Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
4. Install all required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Ensure your `.env` file is properly configured with your MySQL database credentials (if using MySQL). If not, the app will fall back to a local SQLite database (`smart_garment.db`):
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=smart_garment
   FLASK_ENV=development
   ```
6. Start the Flask server:
   ```bash
   python app.py
   ```
   The API should now be running (typically at `http://localhost:5000` or `http://127.0.0.1:5000`).

---

## 2. Setting up the Frontend (Mobile App)

1. Open a **new** terminal window (keep the backend running in the first one) and navigate to the `mobile` folder:
   ```bash
   cd "d:\DEVA CAPSTONE\smart_garment\mobile"
   ```
2. Install the necessary NPM dependencies:
   ```bash
   npm install
   ```
3. Ensure your Expo environment variables (`.env` file inside the `mobile` directory, if any) correctly point to your local Flask backend.
4. Start the Expo development server:
   ```bash
   npm start
   ```
5. You will see a QR code in the terminal. You can:
   - Scan the QR code using the **Expo Go** app on your physical mobile device.
   - Press `a` in the terminal to launch the app on an Android Emulator.
   - Press `i` to launch it on an iOS Simulator.
   - Press `w` to run it in a web browser.

---

## Troubleshooting

- **Python Path Errors**: If you encounter errors saying the virtual environment path cannot be found, simply delete the existing `venv` folder and recreate it using step 2 from the Backend section.
- **Expo Version Warnings**: If you see version warnings when running `npm start`, you can safely ignore them unless you encounter runtime errors, or you can run `npx expo install --fix` to align dependency versions automatically.
