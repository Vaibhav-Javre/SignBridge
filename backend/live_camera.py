"""
SignBridge Standalone Live Camera Recognition
Direct OpenCV + MediaPipe Video Mode + Random Forest Classifier
Zero-latency desktop window with 30+ FPS real-time feedback.
"""

import cv2
import numpy as np
import joblib
import time
import os

from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import mediapipe as mp

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
RF_MODEL_PATH = os.path.join(MODELS_DIR, "signbridge_random_forest.pkl")
HAND_MODEL_PATH = os.path.join(MODELS_DIR, "hand_landmarker.task")

CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

PROCESS_WIDTH = 320
PROCESS_HEIGHT = 240

DETECT_EVERY = 2
PREDICT_EVERY = 1

# ============================================================
# LOAD RANDOM FOREST
# ============================================================

print("=" * 60)
print("Loading Random Forest...")
model = joblib.load(RF_MODEL_PATH)
print("Random Forest loaded.")
print("Classes:", len(model.classes_))

# ============================================================
# LOAD MEDIAPIPE
# ============================================================

print("Loading MediaPipe in VIDEO Mode...")
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
print("MediaPipe loaded.")
print("=" * 60)

# ============================================================
# FEATURE EXTRACTION
# ============================================================

def extract_features_from_hand(hand_landmarks):
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

# ============================================================
# CAMERA
# ============================================================

print("Opening camera...")
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("Trying default camera backend...")
    cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Camera could not open.")
    exit(1)

print("Camera started.")
print("Press Q or ESC to quit.")

# ============================================================
# VARIABLES
# ============================================================

frame_count = 0
timestamp_ms = 0
last_box = None
last_prediction = "Detecting..."
last_confidence = 0.0
last_landmarks = None
hand_found = False
prediction_count = 0

fps_timer = time.perf_counter()
fps_counter = 0
display_fps = 0.0

# ============================================================
# LIVE LOOP
# ============================================================

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1

    # Mirror horizontally for natural interaction
    frame = cv2.flip(frame, 1)

    if frame_count % DETECT_EVERY == 0:
        small_frame = cv2.resize(
            frame,
            (PROCESS_WIDTH, PROCESS_HEIGHT),
            interpolation=cv2.INTER_LINEAR
        )
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_small
        )

        timestamp_ms += 33
        result = detector.detect_for_video(mp_image, timestamp_ms)

        if len(result.hand_landmarks) > 0:
            hand = result.hand_landmarks[0]
            hand_found = True
            last_landmarks = hand

            h, w = frame.shape[:2]
            x_coords = [int(lm.x * w) for lm in hand]
            y_coords = [int(lm.y * h) for lm in hand]

            x_min = max(0, min(x_coords) - 25)
            y_min = max(0, min(y_coords) - 25)
            x_max = min(w - 1, max(x_coords) + 25)
            y_max = min(h - 1, max(y_coords) + 25)
            last_box = (x_min, y_min, x_max, y_max)

            prediction_count += 1
            if prediction_count % PREDICT_EVERY == 0:
                features = extract_features_from_hand(hand)
                X = features.reshape(1, -1)

                probabilities = model.predict_proba(X)[0]
                best_index = np.argmax(probabilities)
                last_prediction = model.classes_[best_index]
                last_confidence = probabilities[best_index] * 100
        else:
            hand_found = False
            last_box = None
            last_landmarks = None
            last_prediction = "No Hand"
            last_confidence = 0.0

    # Draw Box & Landmarks
    if hand_found and last_box is not None:
        x_min, y_min, x_max, y_max = last_box
        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)

        label = f"{last_prediction.upper()} {last_confidence:.1f}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        cv2.rectangle(frame, (x_min, max(0, y_min - th - 15)), (x_min + tw + 12, y_min), (0, 255, 0), -1)
        cv2.putText(frame, label, (x_min + 6, y_min - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2, cv2.LINE_AA)

        if last_landmarks is not None:
            h, w = frame.shape[:2]
            for lm in last_landmarks:
                cv2.circle(frame, (int(lm.x * w), int(lm.y * h)), 4, (255, 0, 0), -1)
    else:
        cv2.putText(frame, "No Hand Detected", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)

    # Calculate FPS
    fps_counter += 1
    elapsed = time.perf_counter() - fps_timer
    if elapsed >= 1.0:
        display_fps = fps_counter / elapsed
        fps_counter = 0
        fps_timer = time.perf_counter()

    cv2.putText(frame, f"FPS: {display_fps:.1f}", (20, CAMERA_HEIGHT - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

    cv2.imshow("SignBridge - Live Recognition", frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord("q") or key == 27:
        break

cap.release()
cv2.destroyAllWindows()
print("SignBridge stopped.")
