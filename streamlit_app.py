"""
SignBridge AI - Real-Time Hand Gesture & Sign Recognition
Streamlit Community Cloud Deployment (100% Free Hosting)

Features:
- WebRTC real-time browser webcam streaming
- MediaPipe HandLandmarker Video Tracking
- 19 HaGRID Gestures with Random Forest Classifier
- Indian English & Marathi (मराठी) Pronunciation
- Repeat Option & Instant Speech Feedback
"""

import os
import time
import queue
import cv2
import joblib
import numpy as np
import streamlit as st
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase, RTCConfiguration, WebRtcMode
import av

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ============================================================
# PAGE CONFIG & MODERN DARK THEME
# ============================================================
st.set_page_config(
    page_title="SignBridge AI - Sign Language & Gesture Recognition",
    page_icon="🤟",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #6366F1 0%, #10B981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 0px;
    }
    .sub-header {
        color: #94A3B8;
        font-size: 1rem;
        margin-bottom: 24px;
    }
    .metric-card {
        background: rgba(18, 25, 45, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        margin-bottom: 12px;
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: 800;
        color: #10B981;
    }
    .metric-label {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: #94A3B8;
        letter-spacing: 0.05em;
    }
    .badge-pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.2);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.4);
    }
</style>
""", unsafe_allow_html=True)

# ============================================================
# GESTURE VOCABULARY & TRANSLATIONS
# ============================================================
GESTURE_INFO = {
    "call": {"en": "Call", "mr": "कॉल करा", "tts_en": "Please call me or initiate contact.", "tts_mr": "कृपया मला कॉल करा किंवा संपर्क साधा."},
    "dislike": {"en": "Dislike", "mr": "नापसंत", "tts_en": "I do not agree or dislike this.", "tts_mr": "मला हे आवडले नाही किंवा मी असहमत आहे."},
    "fist": {"en": "Fist", "mr": "मुठी", "tts_en": "Fist sign: hold, grip, or firm acknowledgment.", "tts_mr": "मुठीची खूण: पकड किंवा दृढ निश्चय."},
    "four": {"en": "Four", "mr": "चार", "tts_en": "Count of four.", "tts_mr": "चार संख्या."},
    "like": {"en": "Like", "mr": "पसंत / छान", "tts_en": "I like this, good, or approved.", "tts_mr": "मला हे खूप आवडले, छान किंवा उत्तम."},
    "mute": {"en": "Mute", "mr": "शांत रहा", "tts_en": "Please mute or maintain silence.", "tts_mr": "कृपया शांतता राखा किंवा आवाज बंद करा."},
    "no_gesture": {"en": "No Hand", "mr": "हात ओळखला नाही", "tts_en": "No gesture detected.", "tts_mr": "कोणतीही खूण आढळली नाही."},
    "ok": {"en": "OK", "mr": "ठीक आहे", "tts_en": "OK, everything is fine.", "tts_mr": "ठीक आहे, सर्व काही ठीक आहे."},
    "one": {"en": "One", "mr": "एक", "tts_en": "Number one, first, or pointing.", "tts_mr": "क्रमांक एक किंवा पहिला."},
    "palm": {"en": "Palm / Hello", "mr": "नमस्कार / हात", "tts_en": "Open palm: hello, show, or present.", "tts_mr": "नमस्कार, उघडा हात किंवा स्वागत."},
    "peace": {"en": "Peace / Two", "mr": "शांती / दोन", "tts_en": "Peace, victory, or two.", "tts_mr": "शांती किंवा विजय खूण."},
    "peace_inverted": {"en": "Peace Inverted", "mr": "उलटी शांती", "tts_en": "Inverted peace sign.", "tts_mr": "उलटी शांती खूण."},
    "rock": {"en": "Rock On", "mr": "रॉक ऑन", "tts_en": "Rock on, celebration, or horn sign.", "tts_mr": "रॉक ऑन, उत्सव किंवा अभिनंदन."},
    "stop": {"en": "Stop", "mr": "थांबा", "tts_en": "Stop, please halt or pause.", "tts_mr": "कृपया येथे थांबा किंवा थांबण्याची खूण."},
    "stop_inverted": {"en": "Stop Inverted", "mr": "उलटा थांबा", "tts_en": "Stop gesture, inverted orientation.", "tts_mr": "उलटी थांबा खूण."},
    "three": {"en": "Three", "mr": "तीन", "tts_en": "Count of three.", "tts_mr": "तीन संख्या."},
    "three2": {"en": "Three (Variant)", "mr": "तीन पर्याय", "tts_en": "Number three, variant.", "tts_mr": "क्रमांक तीन, दुसरा प्रकार."},
    "two_up": {"en": "Two Up", "mr": "दोन बोटे वर", "tts_en": "Two fingers up, parallel.", "tts_mr": "दोन बोटे सरळ वर."},
    "two_up_inverted": {"en": "Two Up Inverted", "mr": "दोन बोटे खाली", "tts_en": "Two fingers pointing downwards.", "tts_mr": "दोन बोटे खाली."}
}

# ============================================================
# MODEL LOADING (CACHED)
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RF_MODEL_PATH = os.path.join(BASE_DIR, "models", "signbridge_random_forest.pkl")
HAND_MODEL_PATH = os.path.join(BASE_DIR, "models", "hand_landmarker.task")

@st.cache_resource
def load_models():
    """Loads and caches both models in memory once."""
    if not os.path.exists(RF_MODEL_PATH):
        st.error(f"Random Forest model not found at: {RF_MODEL_PATH}")
        return None, None
    if not os.path.exists(HAND_MODEL_PATH):
        st.error(f"MediaPipe task model not found at: {HAND_MODEL_PATH}")
        return None, None

    rf_model = joblib.load(RF_MODEL_PATH)

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

    # Warmup
    dummy = np.zeros((240, 320, 3), dtype=np.uint8)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=dummy)
    detector.detect_for_video(mp_img, 33)

    return rf_model, detector

rf_model, detector = load_models()

def extract_features_from_hand(hand_landmarks):
    """Exact model normalization: scale = np.max(np.abs(points))"""
    points = np.array([[lm.x, lm.y] for lm in hand_landmarks], dtype=np.float32)
    wrist = points[0]
    points = points - wrist
    scale = np.max(np.abs(points))
    if scale > 0:
        points = points / scale
    return points.flatten()

# Thread-safe queue for predictions
result_queue = queue.Queue(maxsize=1)

# Hand skeletal bones connections
HAND_CONNECTIONS = [
    [0, 1], [0, 5], [9, 13], [13, 17], [5, 9], [0, 17],
    [1, 2], [2, 3], [3, 4],
    [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16],
    [17, 18], [18, 19], [19, 20]
]

class SignBridgeVideoProcessor(VideoProcessorBase):
    def __init__(self):
        self.timestamp_ms = 0
        self.frame_count = 0

    def recv(self, frame: av.VideoFrame) -> av.VideoFrame:
        img = frame.to_ndarray(format="bgr24")
        img = cv2.flip(img, 1)  # Mirror horizontally
        h, w = img.shape[:2]

        self.frame_count += 1
        # Process every frame for fluid tracking
        small_frame = cv2.resize(img, (320, 240), interpolation=cv2.INTER_LINEAR)
        rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)

        self.timestamp_ms += 33
        result = detector.detect_for_video(mp_image, self.timestamp_ms)

        pred_gesture = "no_gesture"
        confidence = 0.0

        if result.hand_landmarks and len(result.hand_landmarks) > 0:
            hand = result.hand_landmarks[0]

            # Bounding box
            xs = [int(lm.x * w) for lm in hand]
            ys = [int(lm.y * h) for lm in hand]
            x_min = max(0, min(xs) - 20)
            y_min = max(0, min(ys) - 20)
            x_max = min(w - 1, max(xs) + 20)
            y_max = min(h - 1, max(ys) + 20)

            # Draw green bounding box
            cv2.rectangle(img, (x_min, y_min), (x_max, y_max), (16, 185, 129), 2)

            # Draw bones
            for p1_idx, p2_idx in HAND_CONNECTIONS:
                pt1 = (int(hand[p1_idx].x * w), int(hand[p1_idx].y * h))
                pt2 = (int(hand[p2_idx].x * w), int(hand[p2_idx].y * h))
                cv2.line(img, pt1, pt2, (241, 102, 99), 2)

            # Draw joints
            for idx, lm in enumerate(hand):
                pt = (int(lm.x * w), int(lm.y * h))
                color = (212, 182, 6) if idx in [4, 8, 12, 16, 20] else (250, 165, 96)
                cv2.circle(img, pt, 5, color, -1)

            # Random Forest Inference
            features = extract_features_from_hand(hand)
            probs = rf_model.predict_proba(features.reshape(1, -1))[0]
            best_idx = int(np.argmax(probs))
            pred_gesture = str(rf_model.classes_[best_idx])
            confidence = float(probs[best_idx])

            # Draw tag
            label = f"{pred_gesture.upper()} {confidence*100:.1f}%"
            cv2.putText(img, label, (x_min, max(25, y_min - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (16, 185, 129), 2, cv2.LINE_AA)

        # Push prediction to UI
        if not result_queue.full():
            result_queue.put({"gesture": pred_gesture, "confidence": confidence})

        return av.VideoFrame.from_ndarray(img, format="bgr24")

# ============================================================
# SIDEBAR SETTINGS & VOICE SELECTION
# ============================================================
st.sidebar.image("https://raw.githubusercontent.com/feathericons/feather/master/icons/activity.svg", width=40)
st.sidebar.title("SignBridge Control")

# Language Selector: Indian English vs Marathi
selected_lang = st.sidebar.selectbox(
    "🌐 Output & Voice Language",
    ["🇮🇳 English (India)", "🇮🇳 मराठी (Marathi)"],
    index=0
)
lang_key = "mr" if "मराठी" in selected_lang else "en"
voice_lang_code = "mr-IN" if lang_key == "mr" else "en-IN"

# Pronunciation Options
st.sidebar.markdown("---")
st.sidebar.subheader("🔊 Speech Settings")
auto_speak = st.sidebar.checkbox("Auto-Pronounce on Detect", value=True)
repeat_speak = st.sidebar.checkbox("Repeat Option (Every 2.5s)", value=False)

st.sidebar.markdown("---")
st.sidebar.markdown("**⚡ Model Specifications**")
st.sidebar.markdown("- **Hand Landmarker**: MediaPipe Video Tasks")
st.sidebar.markdown("- **Classifier**: Random Forest (19 HaGRID classes)")
st.sidebar.markdown("- **Host**: Streamlit Community Cloud (Free 1GB RAM)")

# ============================================================
# MAIN UI LAYOUT
# ============================================================
st.markdown('<h1 class="main-header">SignBridge AI</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Real-Time Indian Sign Language & Hand Gesture Recognition with Indian English and Marathi Speech</p>', unsafe_allow_html=True)

col_video, col_result = st.columns([1.3, 0.9])

with col_video:
    st.subheader("📹 Live Camera Feed")
    # WebRTC Real-Time Streamer (Works in Cloud Browsers)
    rtc_config = RTCConfiguration({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]})
    
    webrtc_ctx = webrtc_streamer(
        key="signbridge-stream",
        mode=WebRtcMode.SENDRECV,
        rtc_configuration=rtc_config,
        video_processor_factory=SignBridgeVideoProcessor,
        media_stream_constraints={"video": {"width": 640, "height": 480}, "audio": False},
        async_processing=True
    )

with col_result:
    st.subheader("🎯 Recognition Dashboard")
    
    current_pred = "no_gesture"
    current_conf = 0.0

    try:
        data = result_queue.get_nowait()
        current_pred = data["gesture"]
        current_conf = data["confidence"]
    except queue.Empty:
        pass

    info = GESTURE_INFO.get(current_pred, GESTURE_INFO["no_gesture"])
    display_title = info[lang_key]
    speech_phrase = info[f"tts_{lang_key}"]

    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">DETECTED GESTURE ({selected_lang})</div>
        <div class="metric-value">{display_title}</div>
        <span class="badge-pill">Confidence: {current_conf*100:.1f}%</span>
    </div>
    """, unsafe_allow_html=True)

    # Confidence progress bar
    st.progress(min(1.0, max(0.0, current_conf)))

    # Manual Pronounce / Repeat Button
    st.markdown("###")
    if st.button("🔊 Pronounce / Repeat Text", use_container_width=True):
        st.components.v1.html(f"""
        <script>
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance("{speech_phrase}");
            u.lang = "{voice_lang_code}";
            window.speechSynthesis.speak(u);
        </script>
        """, height=0)

    # Auto-Pronounce Script injection
    if auto_speak and current_pred != "no_gesture" and current_conf >= 0.55:
        st.components.v1.html(f"""
        <script>
            if (!window._lastSpoken || window._lastSpoken !== "{current_pred}" || {str(repeat_speak).lower()}) {{
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance("{speech_phrase}");
                u.lang = "{voice_lang_code}";
                window.speechSynthesis.speak(u);
                window._lastSpoken = "{current_pred}";
            }}
        </script>
        """, height=0)

# ============================================================
# VOCABULARY ACCORDION (19 GESTURES)
# ============================================================
st.markdown("---")
with st.expander("📚 Supported Gesture Classes & Vocabulary (19 HaGRID Signs)"):
    cols = st.columns(4)
    for idx, (gid, gdata) in enumerate(GESTURE_INFO.items()):
        if gid == "no_gesture":
            continue
        with cols[idx % 4]:
            st.markdown(f"**{gdata['en']}** / *{gdata['mr']}*")
            st.caption(gdata[f"tts_{lang_key}"])
