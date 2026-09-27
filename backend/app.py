"""
SignBridge Python Backend - Ultra Low-Latency ML Engine
Integrated with MediaPipe Hand Landmarker (RunningMode.VIDEO)
and Random Forest Classifier trained on HaGRID.

Features:
- vision.RunningMode.VIDEO with continuous temporal tracking (~10ms detection)
- Exact model feature extraction: scale = np.max(np.abs(points))
- High-speed 320x240 processing
- Zero-delay single-pass prediction (model.predict_proba)
"""

import os
import sys
import time
import base64
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import cv2
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import mediapipe as mp  # type: ignore
    from mediapipe.tasks import python  # type: ignore
    from mediapipe.tasks.python import vision  # type: ignore
except ImportError:
    mp = None  # type: ignore
    python = None  # type: ignore
    vision = None  # type: ignore

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration and Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
RF_MODEL_PATH = os.path.join(MODELS_DIR, "signbridge_random_forest.pkl")
HAND_MODEL_PATH = os.path.join(MODELS_DIR, "hand_landmarker.task")

PROCESS_WIDTH = 320
PROCESS_HEIGHT = 240

# Global Model holders
model = None
detector = None
timestamp_ms = 0

print("=" * 60)
print("[SignBridge] Loading Random Forest Classifier...")
if os.path.exists(RF_MODEL_PATH):
    model = joblib.load(RF_MODEL_PATH)
    print(f"[SignBridge] Random Forest loaded successfully. Classes: {len(model.classes_)}")
else:
    print(f"[SignBridge] ERROR: Model not found at {RF_MODEL_PATH}")

print("[SignBridge] Loading MediaPipe HandLandmarker (RunningMode.VIDEO)...")
if os.path.exists(HAND_MODEL_PATH) and python is not None:
    base_options = python.BaseOptions(model_asset_path=HAND_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    detector = vision.HandLandmarker.create_from_options(options)
    print("[SignBridge] MediaPipe HandLandmarker loaded successfully in VIDEO mode.")
    
    # Warmup
    try:
        dummy = np.zeros((PROCESS_HEIGHT, PROCESS_WIDTH, 3), dtype=np.uint8)
        mp_dummy = mp.Image(image_format=mp.ImageFormat.SRGB, data=dummy)
        detector.detect_for_video(mp_dummy, 33)
        timestamp_ms = 33
        print("[SignBridge] MediaPipe warm-up complete.")
    except Exception as e:
        print(f"[SignBridge] Warm-up note: {e}")
else:
    print(f"[SignBridge] ERROR: Hand landmarker task not found at {HAND_MODEL_PATH}")

print("=" * 60)

def extract_features_from_hand(hand_landmarks):
    """
    Exact feature extraction matching model training:
    1. Wrist-relative translation
    2. Scale normalization: scale = np.max(np.abs(points))
    3. Flatten into 42 features
    """
    points = np.array(
        [[lm.x, lm.y] for lm in hand_landmarks],
        dtype=np.float32
    )

    # Wrist
    wrist = points[0]

    # Wrist-relative
    points = points - wrist

    # Scale normalization
    scale = np.max(np.abs(points))

    if scale > 0:
        points = points / scale

    return points.flatten()

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "SignBridge Ultra-Fast ML Engine",
        "rf_model_loaded": model is not None,
        "mediapipe_loaded": detector is not None,
        "mode": "VIDEO_STREAM",
        "classes_count": len(model.classes_) if model is not None else 0,
        "classes": list(model.classes_) if model is not None else []
    })

@app.route("/api/predict", methods=["POST"])
def predict():
    global timestamp_ms
    start_time = time.perf_counter()

    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image' in payload"}), 400

    try:
        # 1. Fast base64 decode
        img_b64 = data["image"]
        if "," in img_b64:
            img_b64 = img_b64.split(",", 1)[1]

        img_bytes = base64.b64decode(img_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400

        # Resize to 320x240 for ultra-fast MediaPipe inference
        h, w = frame.shape[:2]
        if w != PROCESS_WIDTH or h != PROCESS_HEIGHT:
            small_frame = cv2.resize(frame, (PROCESS_WIDTH, PROCESS_HEIGHT), interpolation=cv2.INTER_LINEAR)
        else:
            small_frame = frame

        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)

        timestamp_ms += 33

        # MediaPipe Video Mode tracking
        result = detector.detect_for_video(mp_image, timestamp_ms)

        if not result.hand_landmarks or len(result.hand_landmarks) == 0:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
            return jsonify({
                "gesture": "no_gesture",
                "confidence": 0.0,
                "text": "No Hand Detected",
                "landmarks": None,
                "bbox": None,
                "latency_ms": latency_ms
            })

        hand = result.hand_landmarks[0]
        landmarks_2d = [[lm.x, lm.y] for lm in hand]

        # Calculate Bounding Box
        xs = [lm.x for lm in hand]
        ys = [lm.y for lm in hand]
        pad = 0.04
        min_x = max(0.0, min(xs) - pad)
        max_x = min(1.0, max(xs) + pad)
        min_y = max(0.0, min(ys) - pad)
        max_y = min(1.0, max(ys) + pad)
        bbox = [round(min_x, 4), round(min_y, 4), round(max_x, 4), round(max_y, 4)]

        # Extract normalized 42 features
        features = extract_features_from_hand(hand)
        X = features.reshape(1, -1)

        # Single-pass Random Forest
        probabilities = model.predict_proba(X)[0]
        best_index = int(np.argmax(probabilities))
        predicted_gesture = str(model.classes_[best_index])
        confidence = float(probabilities[best_index])

        latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return jsonify({
            "gesture": predicted_gesture,
            "confidence": round(confidence, 3),
            "text": predicted_gesture.replace("_", " ").upper(),
            "landmarks": [[round(pt[0], 4), round(pt[1], 4)] for pt in landmarks_2d],
            "bbox": bbox,
            "latency_ms": latency_ms
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n[SignBridge] Starting Ultra-Fast Server on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
