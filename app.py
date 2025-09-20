# app.py
from flask import Flask, request, jsonify
import pickle
import pandas as pd
import base64
import io
from PIL import Image
import numpy as np

# Load model
with open("rockfall_model.pkl", "rb") as f:
    model, feature_names = pickle.load(f)

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json  # Expecting JSON input from Node.js
    
    # Convert input to DataFrame
    user_data = pd.DataFrame([data], columns=feature_names)
    
    # Make prediction
    prediction = model.predict(user_data)[0]
    probability = model.predict_proba(user_data)[0][1]
    
    return jsonify({
        "prediction": int(prediction),
        "probability": round(float(probability), 4)
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
    
@app.route("/predict_image", methods=["POST"])
def predict_image():
    try:
        payload = request.get_json(force=True)
        image_b64 = payload.get("image_base64")
        if not image_b64:
            return jsonify({"error": "image_base64 is required"}), 400

        # Decode base64 -> PIL image
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("L")  # grayscale
        arr = np.asarray(image, dtype=np.float32) / 255.0

        # Simple heuristic: use edge/variance as proxy for instability visuals
        variance = float(np.var(arr))  # 0..~0.25 typically
        probability = max(0.0, min(1.0, variance * 2.5))  # scale to 0..1 range
        prediction = 1 if probability >= 0.5 else 0

        return jsonify({
            "prediction": int(prediction),
            "probability": round(probability, 4)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
