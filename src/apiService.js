/**
 * SignBridge API Service Layer
 * 
 * Handles communication with the local Python ML backend (Flask/FastAPI).
 * Allows dynamic switching between Live ML Backend Mode and Simulated Demo Mode.
 * NEVER conflates simulated results with live model inference.
 */

import { GESTURE_CLASSES } from "./gesturesData.js";

export class ApiService {
  constructor(baseUrl = "http://localhost:5000") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.isDemoMode = true; // default to demo mode until backend is connected
    this.connectionStatus = "idle"; // 'idle' | 'checking' | 'connected' | 'disconnected'
    this.lastError = null;
    this.demoSequenceIndex = 0;
    this.demoGestureQueue = ["ok", "peace", "like", "stop", "palm", "call", "four", "one"];
  }

  setBaseUrl(url) {
    this.baseUrl = (url || "http://localhost:5000").replace(/\/+$/, "");
  }

  setDemoMode(enabled) {
    this.isDemoMode = !!enabled;
  }

  /**
   * Health check to probe the Python ML backend.
   * Expected: GET /api/health -> { status: "ready", model: "signbridge_random_forest.pkl", classes: 19 }
   */
  async checkHealth() {
    this.connectionStatus = "checking";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.connectionStatus = "connected";
        this.lastError = null;
        return { connected: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      this.connectionStatus = "disconnected";
      this.lastError = err.name === "AbortError" ? "Backend connection timed out (2.5s)" : (err.message || "Failed to fetch");
      return { connected: false, error: this.lastError };
    }
  }

  /**
   * Predicts gesture for the captured frame.
   * In Live Backend Mode: Sends base64 JPEG to POST /api/predict
   * In Demo Mode: Returns clearly labeled simulated data
   */
  async predictFrame(imageDataBase64) {
    if (this.isDemoMode) {
      return this.getSimulatedPrediction();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${this.baseUrl}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          image: imageDataBase64
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend Error (${response.status}): ${errText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        isSimulated: false,
        source: "Python Random Forest Model",
        gesture: data.gesture || "no_gesture",
        confidence: typeof data.confidence === "number" ? data.confidence : 0,
        text: data.text || data.gesture || "Unknown",
        landmarks: data.landmarks || null,
        bbox: data.bbox || null,
        latencyMs: data.latency_ms || null
      };
    } catch (err) {
      clearTimeout(timeoutId);
      this.lastError = err.message;
      return {
        success: false,
        error: err.message,
        isSimulated: false
      };
    }
  }

  /**
   * Demo Mode simulation: Provides realistic landmark coordinates and sample predictions
   * for hackathon evaluator demonstrations when backend is not actively running.
   */
  getSimulatedPrediction(explicitClassId = null) {
    let targetClassId = explicitClassId;
    if (!targetClassId) {
      targetClassId = this.demoGestureQueue[this.demoSequenceIndex % this.demoGestureQueue.length];
      this.demoSequenceIndex++;
    }

    const gestureItem = GESTURE_CLASSES.find(g => g.id === targetClassId) || GESTURE_CLASSES[7]; // default to 'ok'
    const confidence = +(0.93 + Math.random() * 0.06).toFixed(3);

    // Generate realistic 21 landmark hand points centered in frame for canvas visualization
    const landmarks = this.generateSampleLandmarks(targetClassId);
    const bbox = {
      x: 180,
      y: 110,
      width: 280,
      height: 300
    };

    return {
      success: true,
      isSimulated: true,
      source: "Demo Mode (Simulated AI Inference)",
      gesture: gestureItem.tag,
      confidence: confidence,
      text: gestureItem.name.toUpperCase(),
      speechText: gestureItem.speechText,
      landmarks: landmarks,
      bbox: bbox,
      latencyMs: Math.floor(18 + Math.random() * 12)
    };
  }

  /**
   * Generates 21 normalized landmarks (x, y) approximating hand joints for visual demo
   */
  generateSampleLandmarks(gestureType) {
    const jitter = () => (Math.random() - 0.5) * 0.015;
    // Base hand landmark blueprint (21 joints: wrist 0, thumb 1-4, index 5-8, middle 9-12, ring 13-16, pinky 17-20)
    const base = [
      [0.50, 0.82], // 0: Wrist
      [0.44, 0.74], [0.39, 0.65], [0.36, 0.55], [0.35, 0.46], // 1-4: Thumb
      [0.45, 0.53], [0.44, 0.40], [0.43, 0.31], [0.42, 0.22], // 5-8: Index
      [0.50, 0.51], [0.50, 0.37], [0.50, 0.28], [0.50, 0.18], // 9-12: Middle
      [0.55, 0.53], [0.56, 0.41], [0.57, 0.33], [0.58, 0.24], // 13-16: Ring
      [0.60, 0.57], [0.63, 0.47], [0.65, 0.39], [0.67, 0.31]  // 17-20: Pinky
    ];

    // Adjust tip positions according to gesture style for demo realism
    if (gestureType === "fist") {
      base[4] = [0.43, 0.60]; base[8] = [0.46, 0.55]; base[12] = [0.50, 0.54]; base[16] = [0.55, 0.56]; base[20] = [0.60, 0.60];
    } else if (gestureType === "peace") {
      base[4] = [0.45, 0.62]; base[8] = [0.41, 0.20]; base[12] = [0.53, 0.20]; base[16] = [0.56, 0.57]; base[20] = [0.61, 0.62];
    } else if (gestureType === "like") {
      base[4] = [0.38, 0.32]; base[8] = [0.45, 0.60]; base[12] = [0.50, 0.61]; base[16] = [0.55, 0.62]; base[20] = [0.60, 0.64];
    } else if (gestureType === "ok") {
      base[4] = [0.42, 0.43]; base[8] = [0.43, 0.44]; base[12] = [0.50, 0.22]; base[16] = [0.56, 0.27]; base[20] = [0.63, 0.34];
    }

    return base.map(([x, y]) => [+(x + jitter()).toFixed(4), +(y + jitter()).toFixed(4)]);
  }
}

export const apiService = new ApiService();
