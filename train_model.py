import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# Paths
DATASET_DIR = "dataset"
DATASET_PATH = os.path.join(DATASET_DIR, "garment_size_dataset.csv")
MODELS_DIR = "models"
MODEL_PATH = os.path.join(MODELS_DIR, "size_predictor.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.pkl")

def generate_synthetic_data(num_samples=1500):
    """
    Generates a realistic synthetic dataset mapping body measurements to garment sizes.
    """
    print(f"Generating synthetic dataset with {num_samples} samples...")
    np.random.seed(42)
    
    data = []
    
    # Target size centroids (height_cm, weight_kg, chest_cm, waist_cm)
    centroids = {
        'S':  (160.0, 52.0,  84.0,  70.0),
        'M':  (170.0, 65.0,  94.0,  80.0),
        'L':  (178.0, 78.0,  104.0, 90.0),
        'XL': (184.0, 90.0,  114.0, 100.0),
        'XXL':(190.0, 105.0, 124.0, 112.0)
    }
    
    sizes = list(centroids.keys())
    
    for _ in range(num_samples):
        # Pick a random size class to generate around
        assigned_size = np.random.choice(sizes)
        c_height, c_weight, c_chest, c_waist = centroids[assigned_size]
        
        # Add random normal variance to create overlaps and realistic variance
        height = round(np.random.normal(c_height, 6.0), 1)
        weight = round(np.random.normal(c_weight, 8.0), 1)
        chest = round(np.random.normal(c_chest, 6.0), 1)
        waist = round(np.random.normal(c_waist, 6.0), 1)
        
        # Enforce physical minimum bounds
        height = max(100.0, height)
        weight = max(20.0, weight)
        chest = max(20.0, chest)
        waist = max(20.0, waist)
        
        # Re-verify matching size based on a distance metric to keep dataset labels clean but overlapping
        distances = {}
        for sz, (h, w, ch, wa) in centroids.items():
            # Normalized Euclidean distance
            dist = (
                ((height - h) / 10.0) ** 2 +
                ((weight - w) / 15.0) ** 2 +
                ((chest - ch) / 10.0) ** 2 +
                ((waist - wa) / 10.0) ** 2
            )
            distances[sz] = dist
        
        # The closest centroid with a bit of probability noise determines the size label
        best_size = min(distances, key=distances.get)
        
        data.append([height, weight, chest, waist, best_size])
        
    df = pd.DataFrame(data, columns=['height', 'weight', 'chest', 'waist', 'size'])
    
    # Save dataset
    os.makedirs(DATASET_DIR, exist_ok=True)
    df.to_csv(DATASET_PATH, index=False)
    print(f"Dataset saved to '{DATASET_PATH}' successfully.")

def train_and_save_model():
    # 1. Generate dataset if not present
    if not os.path.exists(DATASET_PATH):
        generate_synthetic_data(1500)
    else:
        print(f"Dataset already exists at '{DATASET_PATH}'. Loading...")
        
    # 2. Load dataset
    df = pd.read_csv(DATASET_PATH)
    
    # Features and target
    X = df[['height', 'weight', 'chest', 'waist']]
    y = df['size']
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 3. Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 4. Train Random Forest Classifier
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, min_samples_split=4)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 5. Save model and scaler
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
        
    print(f"Model saved to '{MODEL_PATH}'")
    print(f"Scaler saved to '{SCALER_PATH}'")
    print("Training complete!")

if __name__ == "__main__":
    train_and_save_model()
