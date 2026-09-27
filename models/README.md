# SignBridge ML Models Directory

Place your pre-trained models here:

1. `signbridge_random_forest.pkl`
   - Scikit-learn Random Forest classifier trained on 19 HaGRID classes.
   - Input: 42 numerical features (21 hand landmarks, wrist-relative, scale normalized).

2. `hand_landmarker.task`
   - Google MediaPipe Hand Landmarker task model file.
   - Download from: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker#models
   - Alternatively, `mediapipe.solutions.hands` is supported as automatic fallback in `backend/app.py`.
