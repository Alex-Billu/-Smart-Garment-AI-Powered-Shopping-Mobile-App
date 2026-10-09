from flask import Blueprint, request, g
from api.utils import api_response, sanitize_db_dict, sanitize_db_list
from api.decorators import jwt_required

size_bp = Blueprint('size', __name__)

def get_db():
    from app import get_db_connection
    return get_db_connection()

import os
import pickle
import pandas as pd
from flask import current_app

def get_size_predictor():
    def predict_clothing_size(height_cm, weight_kg, chest_cm, waist_cm):
        model_path = os.path.join(current_app.root_path, 'models', 'size_predictor.pkl')
        scaler_path = os.path.join(current_app.root_path, 'models', 'scaler.pkl')

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            return None, None, "Model files not trained"

        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)

            input_df = pd.DataFrame(
                [[height_cm, weight_kg, chest_cm, waist_cm]],
                columns=['height', 'weight', 'chest', 'waist']
            )
            scaled_features = scaler.transform(input_df)
            predicted_size = model.predict(scaled_features)[0]

            probabilities = model.predict_proba(scaled_features)[0]
            class_list = list(model.classes_)
            class_index = class_list.index(predicted_size)
            confidence = probabilities[class_index] * 100.0

            return predicted_size, confidence, None
        except Exception as e:
            return None, None, str(e)
            
    return predict_clothing_size

@size_bp.route('/predict', methods=['POST'])
@jwt_required
def predict_size():
    """Predict garment size using Random Forest model and calculate BMI."""
    user_id = g.current_user['id']
    data = request.get_json(silent=True) or request.form

    try:
        height = float(data.get('height', 0))
        weight = float(data.get('weight', 0))
        chest = float(data.get('chest', 0))
        waist = float(data.get('waist', 0))
    except (ValueError, TypeError):
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "height, weight, chest, and waist must be numeric values"},
            status_code=400
        )

    fit_preference = data.get('fit_preference', 'Regular').strip()

    if height <= 0 or weight <= 0 or chest <= 0 or waist <= 0:
        return api_response(
            error={"code": "VALIDATION_ERROR", "message": "All body measurements must be greater than zero"},
            status_code=400
        )

    # Calculate BMI
    height_m = height / 100.0
    bmi = round(weight / (height_m * height_m), 2)

    # Invoke ML model predictor
    predict_fn = get_size_predictor()
    predicted_size, confidence, err = predict_fn(height, weight, chest, waist)

    if err or not predicted_size:
        # Rule-based fallback if ML model pickle is not trained yet
        if chest < 88:
            predicted_size = 'S'
        elif chest < 96:
            predicted_size = 'M'
        elif chest < 104:
            predicted_size = 'L'
        elif chest < 112:
            predicted_size = 'XL'
        else:
            predicted_size = 'XXL'
        confidence = 85.0

    # Adjust size according to fit preference if needed
    if fit_preference.lower() == 'slim':
        size_order = ['S', 'M', 'L', 'XL', 'XXL']
        idx = size_order.index(predicted_size) if predicted_size in size_order else 1
        if idx > 0 and chest % 2 != 0:
            predicted_size = size_order[max(0, idx - 1)]
    elif fit_preference.lower() == 'loose':
        size_order = ['S', 'M', 'L', 'XL', 'XXL']
        idx = size_order.index(predicted_size) if predicted_size in size_order else 1
        if idx < len(size_order) - 1:
            predicted_size = size_order[min(len(size_order) - 1, idx + 1)]

    conn = get_db()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO size_predictions
                   (user_id, height, weight, chest, waist, fit_preference, predicted_size, confidence, bmi)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user_id, height, weight, chest, waist, fit_preference, predicted_size, round(confidence, 2), bmi)
            )
            conn.commit()
            pred_id = cursor.lastrowid
            cursor.close()
            conn.close()
        except Exception as e:
            cursor.close()
            conn.close()
            pred_id = None

    return api_response(
        data={
            "predicted_size": predicted_size,
            "confidence": round(confidence, 2),
            "bmi": bmi,
            "height": height,
            "weight": weight,
            "chest": chest,
            "waist": waist,
            "fit_preference": fit_preference
        }
    )

@size_bp.route('/history', methods=['GET'])
@jwt_required
def size_history():
    """Fetch history of size predictions for current user."""
    user_id = g.current_user['id']
    conn = get_db()
    if not conn:
        return api_response(error={"code": "DATABASE_ERROR", "message": "Database connection unavailable"}, status_code=500)

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM size_predictions WHERE user_id = %s ORDER BY id DESC LIMIT 20",
            (user_id,)
        )
        predictions = cursor.fetchall()
        cursor.close()
        conn.close()

        return api_response(data={"predictions": sanitize_db_list(predictions)})
    except Exception as e:
        if cursor:
            cursor.close()
        conn.close()
        return api_response(error={"code": "INTERNAL_ERROR", "message": str(e)}, status_code=500)
