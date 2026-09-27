/**
 * SignBridge Main Application Script
 * Orchestrates camera stream, API service (Live vs Demo Mode),
 * canvas overlay rendering, Web Speech API, and interactive gesture vocabulary.
 */

import { GESTURE_CLASSES, CATEGORIES } from "./gesturesData.js";
import { apiService } from "./apiService.js";
import { speechService } from "./speechService.js";
import { CameraController } from "./cameraController.js";

// DOM Elements
const navbar = document.getElementById("navbar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileDrawer = document.getElementById("mobileDrawer");
const navLinks = document.querySelectorAll(".nav-link");

// Demo Controls
const btnModeDemo = document.getElementById("btnModeDemo");
const btnModeBackend = document.getElementById("btnModeBackend");
const backendUrlInput = document.getElementById("backendUrlInput");
const btnTestBackend = document.getElementById("btnTestBackend");
const backendStatusPill = document.getElementById("backendStatusPill");
const backendStatusText = document.getElementById("backendStatusText");
const alertHelpBtn = document.getElementById("alertHelpBtn");
const backendGuideDrawer = document.getElementById("backendGuideDrawer");
const alertModeBadge = document.getElementById("alertModeBadge");
const alertModeText = document.getElementById("alertModeText");
const inferenceSourceTag = document.getElementById("inferenceSourceTag");

// Camera Elements
const webcamVideo = document.getElementById("webcamVideo");
const landmarkCanvas = document.getElementById("landmarkCanvas");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const placeholderTitle = document.getElementById("placeholderTitle");
const placeholderDesc = document.getElementById("placeholderDesc");
const btnStartCamera = document.getElementById("btnStartCamera");
const btnStartCameraCenter = document.getElementById("btnStartCameraCenter");
const btnStopCamera = document.getElementById("btnStopCamera");
const cameraStatusPill = document.getElementById("cameraStatusPill");
const fpsDisplay = document.getElementById("fpsDisplay");
const streamLiveDot = document.getElementById("streamLiveDot");
const cameraHud = document.getElementById("cameraHud");
const hudLatency = document.getElementById("hudLatency");

// Recognition Panel
const recGestureIcon = document.getElementById("recGestureIcon");
const recGestureName = document.getElementById("recGestureName");
const recGestureCategory = document.getElementById("recGestureCategory");
const recConfidenceValue = document.getElementById("recConfidenceValue");
const recConfidenceBar = document.getElementById("recConfidenceBar");
const confDisclaimer = document.getElementById("confDisclaimer");
const recTextBox = document.getElementById("recTextBox");
const btnClearText = document.getElementById("btnClearText");
const btnSpeak = document.getElementById("btnSpeak");
const autoSpeakCheckbox = document.getElementById("autoSpeakCheckbox");
const repeatSpeakCheckbox = document.getElementById("repeatSpeakCheckbox");
const voiceLanguageSelect = document.getElementById("voiceLanguageSelect");
const speechStatusPill = document.getElementById("speechStatusPill");
const speechStatusText = document.getElementById("speechStatusText");
const quickChipsContainer = document.getElementById("quickChipsContainer");

// Vocabulary Gallery
const gestureGallery = document.getElementById("gestureGallery");
const categoryFilterContainer = document.getElementById("categoryFilterContainer");
const gestureSearchInput = document.getElementById("gestureSearchInput");

// Application State
let activeCategory = "All";
let searchQuery = "";
let currentGestureText = "OK";
let currentLanguage = "en-IN"; // 'en-IN' (Indian English) or 'mr-IN' (Marathi)
let autoSpeak = true;
let repeatSpeak = false;
let lastSpokenGesture = null;
let lastSpokenTime = 0;
const REPEAT_INTERVAL_MS = 2500;

// Initialize Camera Controller with high-speed inference hook (90ms interval = ~11 FPS)
const cameraController = new CameraController(webcamVideo, landmarkCanvas, {
  inferenceInterval: 90,
  onFrameInference: handleFrameInference
});

/* -------------------- 1. Initialize Application -------------------- */
function init() {
  setupNavigation();
  setupDemoModeSwitcher();
  setupBackendControls();
  setupCameraListeners();
  setupSpeechListeners();
  populateQuickChips();
  setupVocabularyFilters();
  renderVocabularyGallery();
  setupScrollSpy();

  // Automatically probe local Python ML backend on startup
  autoDetectBackend();
}

async function autoDetectBackend() {
  const isOnline = await testBackendHealth();
  if (isOnline) {
    setDemoMode(false);
    console.log("[SignBridge] Auto-detected Live ML Backend. Switched to Live Backend Mode.");
  }
}

/* -------------------- 2. Navigation & Mobile Drawer -------------------- */
function setupNavigation() {
  // Navbar scroll background
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Mobile drawer toggle
  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = mobileDrawer.classList.toggle("open");
      mobileMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      mobileDrawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
    });

    // Close mobile drawer on link click
    document.querySelectorAll(".mobile-nav-link").forEach(link => {
      link.addEventListener("click", () => {
        mobileDrawer.classList.remove("open");
        mobileMenuBtn.setAttribute("aria-expanded", "false");
        mobileDrawer.setAttribute("aria-hidden", "true");
      });
    });
  }
}

/* -------------------- 3. Mode Switching: Demo vs Live ML Backend -------------------- */
function setupDemoModeSwitcher() {
  btnModeDemo.addEventListener("click", () => {
    setDemoMode(true);
  });

  btnModeBackend.addEventListener("click", () => {
    setDemoMode(false);
  });

  if (alertHelpBtn && backendGuideDrawer) {
    alertHelpBtn.addEventListener("click", () => {
      const isHidden = backendGuideDrawer.hasAttribute("hidden");
      if (isHidden) {
        backendGuideDrawer.removeAttribute("hidden");
        alertHelpBtn.textContent = "Hide Backend Instructions ▴";
      } else {
        backendGuideDrawer.setAttribute("hidden", "");
        alertHelpBtn.textContent = "How to Connect Backend? ▾";
      }
    });
  }
}

function setDemoMode(isDemo) {
  apiService.setDemoMode(isDemo);

  if (isDemo) {
    btnModeDemo.classList.add("active");
    btnModeDemo.setAttribute("aria-checked", "true");
    btnModeBackend.classList.remove("active");
    btnModeBackend.setAttribute("aria-checked", "false");

    alertModeBadge.textContent = "DEMO MODE ACTIVE";
    alertModeBadge.style.background = "#38BDF8";
    alertModeText.innerHTML = `Currently using sample gesture data and simulated landmarks for presentation. Connect local Python backend with <code>signbridge_random_forest.pkl</code> for live ML inference.`;
    inferenceSourceTag.textContent = "Demo Mode (Simulated AI)";
    inferenceSourceTag.style.color = "#38BDF8";
    confDisclaimer.textContent = "* Note: Model confidence is simulated for demonstration.";
  } else {
    btnModeBackend.classList.add("active");
    btnModeBackend.setAttribute("aria-checked", "true");
    btnModeDemo.classList.remove("active");
    btnModeDemo.setAttribute("aria-checked", "false");

    alertModeBadge.textContent = "LIVE BACKEND MODE";
    alertModeBadge.style.background = "#10B981";
    alertModeText.innerHTML = `Live ML inference requested. Sending webcam frames to <code>${apiService.baseUrl}/api/predict</code>.`;
    inferenceSourceTag.textContent = "Live Python Model (Flask)";
    inferenceSourceTag.style.color = "#10B981";
    confDisclaimer.textContent = "* Live Random Forest model confidence from local Python service.";

    // Automatically probe backend connectivity
    testBackendHealth();
  }
}

/* -------------------- 4. Backend Connectivity Testing -------------------- */
function setupBackendControls() {
  backendUrlInput.addEventListener("change", (e) => {
    apiService.setBaseUrl(e.target.value.trim());
  });

  btnTestBackend.addEventListener("click", () => {
    testBackendHealth();
  });
}

async function testBackendHealth() {
  const dot = backendStatusPill.querySelector(".status-indicator-dot");
  dot.className = "status-indicator-dot checking";
  backendStatusText.textContent = "Pinging...";

  apiService.setBaseUrl(backendUrlInput.value.trim());
  const result = await apiService.checkHealth();

  if (result.connected) {
    dot.className = "status-indicator-dot online";
    const modelLoaded = result.data?.rf_model_loaded ? "Model Ready" : "Waiting for .pkl";
    backendStatusText.textContent = `Online (${modelLoaded})`;
    backendStatusPill.title = JSON.stringify(result.data, null, 2);
    return true;
  } else {
    dot.className = "status-indicator-dot offline";
    backendStatusText.textContent = "Offline (Click Help)";
    backendStatusPill.title = result.error || "Connection failed";
    return false;
  }
}

/* -------------------- 5. Camera & Overlay Management -------------------- */
function setupCameraListeners() {
  const startHandler = async () => {
    placeholderTitle.textContent = "Connecting Camera...";
    placeholderDesc.textContent = "Please grant browser permission when prompted.";
    btnStartCamera.disabled = true;
    btnStartCameraCenter.disabled = true;

    const ok = await cameraController.start();
    if (!ok) {
      btnStartCamera.disabled = false;
      btnStartCameraCenter.disabled = false;
    }
  };

  btnStartCamera.addEventListener("click", startHandler);
  btnStartCameraCenter.addEventListener("click", startHandler);

  btnStopCamera.addEventListener("click", () => {
    cameraController.stop();
  });

  cameraController.subscribe(({ status, fps, message }) => {
    if (fpsDisplay) {
      fpsDisplay.textContent = `${fps} FPS`;
    }

    if (status === "running") {
      cameraPlaceholder.classList.add("hidden");
      btnStartCamera.disabled = true;
      btnStopCamera.disabled = false;
      streamLiveDot.classList.add("active");
      cameraStatusPill.textContent = "Tracking Active";
      cameraStatusPill.style.color = "#34D399";
      cameraHud.style.display = "flex";
    } else if (status === "idle") {
      cameraPlaceholder.classList.remove("hidden");
      placeholderTitle.textContent = "Camera Is Disconnected";
      placeholderDesc.textContent = "Click 'Start Camera' to enable real-time hand gesture tracking via your webcam.";
      btnStartCamera.disabled = false;
      btnStartCameraCenter.disabled = false;
      btnStopCamera.disabled = true;
      streamLiveDot.classList.remove("active");
      cameraStatusPill.textContent = "Camera Idle";
      cameraStatusPill.style.color = "";
      cameraHud.style.display = "none";
    } else if (status === "denied") {
      cameraPlaceholder.classList.remove("hidden");
      placeholderTitle.textContent = "Camera Access Denied";
      placeholderDesc.textContent = message || "Please check your browser URL bar and enable camera permissions.";
      btnStartCamera.disabled = false;
      btnStartCameraCenter.disabled = false;
      btnStopCamera.disabled = true;
      cameraStatusPill.textContent = "Permission Denied";
      cameraStatusPill.style.color = "#F43F5E";
    } else if (status === "error") {
      cameraPlaceholder.classList.remove("hidden");
      placeholderTitle.textContent = "Camera Connection Error";
      placeholderDesc.textContent = message || "Could not start camera feed.";
      btnStartCamera.disabled = false;
      btnStartCameraCenter.disabled = false;
      btnStopCamera.disabled = true;
      cameraStatusPill.textContent = "Camera Error";
      cameraStatusPill.style.color = "#F43F5E";
    }
  });
}

/* -------------------- 6. Frame Inference Processing Loop -------------------- */
async function handleFrameInference(frameBase64) {
  // Call modular API service
  const prediction = await apiService.predictFrame(frameBase64);

  if (!prediction || (!prediction.success && !prediction.isSimulated)) {
    // If backend connection fails while in Backend Mode, notify
    if (!apiService.isDemoMode) {
      cameraStatusPill.textContent = "Backend Offline";
      cameraStatusPill.style.color = "#F43F5E";
    }
    return;
  }

  // Update canvas overlay with returned landmarks and bounding box
  if (prediction.landmarks) {
    cameraController.setLandmarksAndBbox(prediction.landmarks, prediction.bbox);
    cameraStatusPill.textContent = prediction.gesture === "no_gesture" ? "No Hand Detected" : "Gesture Detected";
    cameraStatusPill.style.color = prediction.gesture === "no_gesture" ? "#F59E0B" : "#34D399";
  } else {
    cameraController.setLandmarksAndBbox(null, null);
    cameraStatusPill.textContent = "No Hand Detected";
    cameraStatusPill.style.color = "#94A3B8";
  }

  // Update telemetry HUD
  if (hudLatency && prediction.latencyMs) {
    hudLatency.textContent = `${prediction.latencyMs} ms`;
  }

  // Update Recognition UI
  applyRecognitionResult(prediction);
}

// Temporal smoothing for rock-solid gesture recognition without flickering
const gestureHistory = [];
const HISTORY_SIZE = 3;

function getStabilizedGestureId(gestureId, confidence) {
  if (!gestureId || gestureId === "no_gesture") {
    gestureHistory.push({ id: "no_gesture", conf: confidence });
    if (gestureHistory.length > HISTORY_SIZE) gestureHistory.shift();
    const countNoGesture = gestureHistory.filter(i => i.id === "no_gesture").length;
    return countNoGesture >= 2 ? "no_gesture" : (gestureHistory[0]?.id || "no_gesture");
  }

  gestureHistory.push({ id: gestureId, conf: confidence });
  if (gestureHistory.length > HISTORY_SIZE) gestureHistory.shift();

  // Find consensus
  const tally = {};
  gestureHistory.forEach(i => { tally[i.id] = (tally[i.id] || 0) + 1; });
  let topId = gestureId;
  let topCount = 0;
  for (const [id, count] of Object.entries(tally)) {
    if (count > topCount) {
      topCount = count;
      topId = id;
    }
  }

  return topCount >= 2 ? topId : gestureId;
}

function applyRecognitionResult(result) {
  const stableId = result.gesture;

  const gestureClass = GESTURE_CLASSES.find(g => g.id === stableId) || {
    id: stableId,
    name: (stableId || "no_gesture").replace(/_/g, " ").toUpperCase(),
    category: "Classification",
    speechText: `Detected ${stableId}`,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`
  };

  // Language-aware display and speech text
  const displayName = currentLanguage === "mr-IN" 
    ? (gestureClass.nameMr || gestureClass.name)
    : gestureClass.name.toUpperCase();

  const toPronounce = currentLanguage === "mr-IN"
    ? (gestureClass.speechTextMr || gestureClass.speechText || displayName)
    : (gestureClass.speechText || gestureClass.name);

  // Update Gesture result card
  recGestureName.textContent = displayName;
  recGestureCategory.textContent = currentLanguage === "mr-IN"
    ? `${gestureClass.category === "Communication" ? "संवाद" : gestureClass.category === "Numbers" ? "संख्या" : gestureClass.category === "Feedback" ? "अभिप्राय" : gestureClass.category} • HaGRID मॉडेल`
    : `${gestureClass.category} • HaGRID Predefined Class`;
  recGestureIcon.innerHTML = gestureClass.icon;

  // Update Confidence
  const pct = Math.min(100, Math.max(0, Math.round((result.confidence || 0.95) * 1000) / 10));
  recConfidenceValue.textContent = `${pct}%`;
  recConfidenceBar.style.width = `${pct}%`;

  // Update Recognized Text Screen
  currentGestureText = displayName;
  recTextBox.textContent = currentGestureText;

  // Auto-pronounce: Pronounce ONCE when gesture is detected, pronounce new one when it changes.
  // Optional repeat if "Repeat Option" is toggled ON.
  if (gestureClass.id && gestureClass.id !== "no_gesture" && (result.confidence >= 0.50 || result.isSimulated)) {
    const now = Date.now();
    const isNewGesture = gestureClass.id !== lastSpokenGesture;

    if (autoSpeak) {
      if (isNewGesture) {
        // Pronounce ONCE when gesture is detected or changes
        lastSpokenGesture = gestureClass.id;
        lastSpokenTime = now;
        speechService.speak(toPronounce, true);
      } else if (repeatSpeak && (now - lastSpokenTime >= REPEAT_INTERVAL_MS)) {
        // Repeat Option: re-pronounce periodically while holding the same gesture
        lastSpokenTime = now;
        speechService.speak(toPronounce, true);
      }
    }
  } else if (gestureClass.id === "no_gesture") {
    // When no hand is in frame for > 500ms, reset lastSpokenGesture
    if (Date.now() - lastSpokenTime > 500) {
      lastSpokenGesture = null;
    }
  }
}

/* -------------------- 7. Speech Service Integration -------------------- */
function setupSpeechListeners() {
  btnSpeak.addEventListener("click", () => {
    const textToSpeak = recTextBox.textContent.trim() || currentGestureText;
    if (textToSpeak && textToSpeak !== "—") {
      const item = GESTURE_CLASSES.find(g => 
        g.name.toUpperCase() === textToSpeak.toUpperCase() || 
        g.nameMr === textToSpeak ||
        g.id === lastSpokenGesture
      );
      const toPronounce = currentLanguage === "mr-IN"
        ? (item?.speechTextMr || textToSpeak)
        : (item?.speechText || textToSpeak);
      speechService.speak(toPronounce, true);
    }
  });

  btnClearText.addEventListener("click", () => {
    recTextBox.textContent = "—";
    currentGestureText = "";
    lastSpokenGesture = null;
  });

  autoSpeakCheckbox.addEventListener("change", (e) => {
    autoSpeak = e.target.checked;
    if (!autoSpeak) {
      speechService.cancel();
    }
  });

  if (repeatSpeakCheckbox) {
    repeatSpeakCheckbox.addEventListener("change", (e) => {
      repeatSpeak = e.target.checked;
      if (repeatSpeak && currentGestureText && currentGestureText !== "—") {
        const item = GESTURE_CLASSES.find(g => 
          g.name.toUpperCase() === currentGestureText.toUpperCase() || 
          g.nameMr === currentGestureText
        );
        const toPronounce = currentLanguage === "mr-IN"
          ? (item?.speechTextMr || currentGestureText)
          : (item?.speechText || currentGestureText);
        speechService.speak(toPronounce, true);
      }
    });
  }

  // Language Selector (Indian English vs Marathi)
  if (voiceLanguageSelect) {
    voiceLanguageSelect.addEventListener("change", (e) => {
      currentLanguage = e.target.value;
      speechService.setLanguage(currentLanguage);

      // Translate currently displayed gesture if active
      if (lastSpokenGesture) {
        const item = GESTURE_CLASSES.find(g => g.id === lastSpokenGesture);
        if (item) {
          const newName = currentLanguage === "mr-IN" ? item.nameMr : item.name.toUpperCase();
          currentGestureText = newName;
          recTextBox.textContent = newName;
          recGestureName.textContent = newName;
        }
      }
    });
  }

  speechService.subscribe(({ status, text }) => {
    if (status === "speaking") {
      speechStatusPill.classList.add("speaking");
      speechStatusText.textContent = "Speaking...";
    } else if (status === "idle") {
      speechStatusPill.classList.remove("speaking");
      speechStatusText.textContent = "Ready to speak";
    } else if (status === "unsupported") {
      speechStatusText.textContent = "Speech API not available";
    }
  });
}

/* -------------------- 8. Supported Gestures Quick Chips -------------------- */
function populateQuickChips() {
  quickChipsContainer.innerHTML = "";
  GESTURE_CLASSES.forEach((gesture) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-btn";
    chip.textContent = gesture.name;
    chip.dataset.id = gesture.id;

    chip.addEventListener("click", () => {
      // Highlight active chip
      document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      // Trigger instant simulation in Demo Mode
      const sample = apiService.getSimulatedPrediction(gesture.id);
      applyRecognitionResult(sample);

      // If camera canvas is active, render simulated skeleton immediately
      if (cameraController.isActive) {
        cameraController.setLandmarksAndBbox(sample.landmarks, sample.bbox);
      }
    });

    quickChipsContainer.appendChild(chip);
  });
}

/* -------------------- 9. Current Gesture Vocabulary Gallery -------------------- */
function setupVocabularyFilters() {
  categoryFilterContainer.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `cat-pill ${cat === activeCategory ? "active" : ""}`;
    pill.textContent = cat;

    pill.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      renderVocabularyGallery();
    });

    categoryFilterContainer.appendChild(pill);
  });

  gestureSearchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderVocabularyGallery();
  });
}

function renderVocabularyGallery() {
  gestureGallery.innerHTML = "";

  const filtered = GESTURE_CLASSES.filter((g) => {
    const matchesCat = activeCategory === "All" || g.category === activeCategory;
    const matchesSearch = !searchQuery || 
      g.name.toLowerCase().includes(searchQuery) ||
      g.tag.toLowerCase().includes(searchQuery) ||
      g.description.toLowerCase().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    gestureGallery.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        No gestures match your search "${searchQuery}".
      </div>
    `;
    return;
  }

  filtered.forEach((gesture) => {
    const card = document.createElement("div");
    card.className = "gesture-item-card";

    card.innerHTML = `
      <div class="g-card-top">
        <div class="g-icon-circle">
          ${gesture.icon}
        </div>
        <span class="g-cat-badge">${gesture.category}</span>
      </div>
      <h3 class="g-title">${gesture.name}</h3>
      <p class="g-desc">${gesture.description}</p>
      <div class="g-card-footer">
        <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Class: ${gesture.tag}</span>
        <button type="button" class="g-test-btn" data-id="${gesture.id}">
          Test in Demo →
        </button>
      </div>
    `;

    // "Test in Demo" button click
    const testBtn = card.querySelector(".g-test-btn");
    testBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      testGestureInDemo(gesture.id);
    });

    card.addEventListener("click", () => {
      testGestureInDemo(gesture.id);
    });

    gestureGallery.appendChild(card);
  });
}

function testGestureInDemo(gestureId) {
  // Smooth scroll up to demo section
  const demoSection = document.getElementById("demo");
  demoSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // Activate chip in Demo Studio
  const chips = document.querySelectorAll(".chip-btn");
  chips.forEach(chip => {
    if (chip.dataset.id === gestureId) {
      chip.classList.add("active");
      chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } else {
      chip.classList.remove("active");
    }
  });

  // Apply simulated prediction
  const sample = apiService.getSimulatedPrediction(gestureId);
  applyRecognitionResult(sample);

  // If camera is active, render landmarks
  if (cameraController.isActive) {
    cameraController.setLandmarksAndBbox(sample.landmarks, sample.bbox);
  }
}

/* -------------------- 10. Scroll Spy for Navbar Links -------------------- */
function setupScrollSpy() {
  const sections = document.querySelectorAll("section[id]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navLinks.forEach(link => {
          if (link.getAttribute("href") === `#${id}`) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(sec => observer.observe(sec));
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", init);
