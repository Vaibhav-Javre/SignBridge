/**
 * Camera Controller & Canvas Overlay Renderer
 * Manages getUserMedia stream, high-speed frame capture, FPS calculation,
 * and drawing the green bounding box and 21 MediaPipe hand landmarks
 * with 60 FPS smooth lerp interpolation for zero-jitter rendering.
 */

// MediaPipe 21 Hand Landmarks bone connections
export const HAND_CONNECTIONS = [
  // Palm
  [0, 1], [0, 5], [9, 13], [13, 17], [5, 9], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20]
];

export class CameraController {
  constructor(videoElement, canvasElement, options = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext("2d") : null;
    this.stream = null;
    this.isActive = false;
    this.status = "idle"; // 'idle' | 'requesting' | 'running' | 'detecting' | 'detected' | 'no_hand' | 'denied' | 'error'
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.animationFrameId = null;
    this.listeners = new Set();
    this.mirror = true;

    // Raw model targets
    this.targetLandmarks = null;
    this.targetBbox = null;
    // Smoothed visual representations (60fps interpolation)
    this.smoothLandmarks = null;
    this.smoothBbox = null;
    this.noHandCounter = 0;

    // Inference scheduling (Fast ~10-12 FPS real-time pipeline, zero backlog)
    this.isInferring = false;
    this.inferenceInterval = options.inferenceInterval || 90;
    this.lastInferenceTime = 0;
    this.onFrameInference = options.onFrameInference || null;

    // Reusable offscreen canvas for zero GC allocation during frame capture (matches model 320x240)
    this.captureCanvas = document.createElement("canvas");
    this.captureCanvas.width = 320;
    this.captureCanvas.height = 240;
    this.captureCtx = this.captureCanvas.getContext("2d", { willReadFrequently: true });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(status, details = {}) {
    this.status = status;
    this.listeners.forEach(fn => fn({ status, fps: this.fps, ...details }));
  }

  async start() {
    if (this.isActive) return true;

    this.notify("requesting", { message: "Requesting camera permissions..." });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notify("error", { message: "Camera API is not supported in this browser." });
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play().then(resolve);
        };
      });

      this.isActive = true;
      this.resizeCanvas();
      window.addEventListener("resize", this.handleResize);

      this.notify("running", { message: "Camera active and tracking" });
      this.loop();
      return true;
    } catch (err) {
      this.isActive = false;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.notify("denied", { message: "Camera access was denied. Please allow camera permissions in your browser bar." });
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        this.notify("error", { message: "No compatible camera device found on this system." });
      } else {
        this.notify("error", { message: `Camera error: ${err.message || "Unable to start video feed"}` });
      }
      return false;
    }
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    window.removeEventListener("resize", this.handleResize);

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.targetLandmarks = null;
    this.targetBbox = null;
    this.smoothLandmarks = null;
    this.smoothBbox = null;
    this.fps = 0;
    this.notify("idle", { message: "Camera stopped" });
  }

  handleResize = () => {
    this.resizeCanvas();
  };

  resizeCanvas() {
    if (!this.canvas || !this.video) return;
    const rect = this.video.getBoundingClientRect();
    if (rect.width && rect.height) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  /**
   * Ultra-fast JPEG frame capture (360x270 @ 0.65 JPEG)
   * Small payload (~12KB) transfers to Python backend in < 2ms!
   */
  captureFrameBase64() {
    if (!this.isActive || !this.video.videoWidth) return null;

    const w = this.captureCanvas.width;
    const h = this.captureCanvas.height;

    this.captureCtx.save();
    if (this.mirror) {
      this.captureCtx.translate(w, 0);
      this.captureCtx.scale(-1, 1);
    }
    this.captureCtx.drawImage(this.video, 0, 0, w, h);
    this.captureCtx.restore();

    return this.captureCanvas.toDataURL("image/jpeg", 0.65);
  }

  setLandmarksAndBbox(landmarks, bbox) {
    if (landmarks && landmarks.length >= 21) {
      this.targetLandmarks = landmarks;
      this.targetBbox = bbox;
      this.noHandCounter = 0;
    } else {
      this.noHandCounter++;
      // Fade out after 2 consecutive empty frames to prevent sudden flashing
      if (this.noHandCounter >= 2) {
        this.targetLandmarks = null;
        this.targetBbox = null;
        this.smoothLandmarks = null;
        this.smoothBbox = null;
      }
    }
  }

  loop = () => {
    if (!this.isActive) return;

    const now = performance.now();
    this.frameCount++;

    // Calculate rendering FPS
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.notify(this.status, { fps: this.fps });
    }

    // Draw smoothed 60 FPS overlay on canvas
    this.drawOverlay();

    // Trigger AI inference tick at maximum continuous throughput (zero delay backlog)
    if (this.onFrameInference && !this.isInferring) {
      this.lastInferenceTime = now;
      const frameData = this.captureFrameBase64();
      if (frameData) {
        this.isInferring = true;
        this.onFrameInference(frameData).finally(() => {
          this.isInferring = false;
        });
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  drawOverlay() {
    if (!this.ctx || !this.canvas) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    if (!this.targetLandmarks || this.targetLandmarks.length === 0) return;

    // Smooth Lerp Interpolation for 60fps buttery movement
    const lerp = 0.55;
    if (!this.smoothLandmarks || this.smoothLandmarks.length !== this.targetLandmarks.length) {
      this.smoothLandmarks = this.targetLandmarks.map(p => [p[0], p[1]]);
    } else {
      for (let i = 0; i < this.targetLandmarks.length; i++) {
        this.smoothLandmarks[i][0] += (this.targetLandmarks[i][0] - this.smoothLandmarks[i][0]) * lerp;
        this.smoothLandmarks[i][1] += (this.targetLandmarks[i][1] - this.smoothLandmarks[i][1]) * lerp;
      }
    }

    // Smooth Bbox interpolation
    if (this.targetBbox) {
      let tb = [];
      if (Array.isArray(this.targetBbox)) {
        tb = this.targetBbox;
      } else if (typeof this.targetBbox.x === "number") {
        const x = this.targetBbox.x <= 1 ? this.targetBbox.x : this.targetBbox.x / 640;
        const y = this.targetBbox.y <= 1 ? this.targetBbox.y : this.targetBbox.y / 480;
        const w = this.targetBbox.width <= 1 ? this.targetBbox.width : this.targetBbox.width / 640;
        const h = this.targetBbox.height <= 1 ? this.targetBbox.height : this.targetBbox.height / 480;
        tb = [x, y, x + w, y + h];
      }

      if (tb.length === 4) {
        if (!this.smoothBbox) {
          this.smoothBbox = [...tb];
        } else {
          for (let i = 0; i < 4; i++) {
            this.smoothBbox[i] += (tb[i] - this.smoothBbox[i]) * lerp;
          }
        }
      }
    }

    const scaleX = width;
    const scaleY = height;

    // 1. Draw High-Tech Bounding Box
    if (this.smoothBbox) {
      this.ctx.save();
      const [x1, y1, x2, y2] = this.smoothBbox;
      const bx = x1 * width;
      const by = y1 * height;
      const bw = (x2 - x1) * width;
      const bh = (y2 - y1) * height;

      if (bw > 10 && bh > 10) {
        // Glowing Neon AI Box
        this.ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);
        this.ctx.strokeRect(bx, by, bw, bh);

        // Solid Cyberpunk Corner Brackets
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = "#34D399";
        this.ctx.lineWidth = 3.5;
        const cornerSize = Math.min(22, bw * 0.22);

        // Top-Left
        this.ctx.beginPath();
        this.ctx.moveTo(bx, by + cornerSize);
        this.ctx.lineTo(bx, by);
        this.ctx.lineTo(bx + cornerSize, by);
        this.ctx.stroke();

        // Top-Right
        this.ctx.beginPath();
        this.ctx.moveTo(bx + bw - cornerSize, by);
        this.ctx.lineTo(bx + bw, by);
        this.ctx.lineTo(bx + bw, by + cornerSize);
        this.ctx.stroke();

        // Bottom-Left
        this.ctx.beginPath();
        this.ctx.moveTo(bx, by + bh - cornerSize);
        this.ctx.lineTo(bx, by + bh);
        this.ctx.lineTo(bx + cornerSize, by + bh);
        this.ctx.stroke();

        // Bottom-Right
        this.ctx.beginPath();
        this.ctx.moveTo(bx + bw - cornerSize, by + bh);
        this.ctx.lineTo(bx + bw, by + bh);
        this.ctx.lineTo(bx + bw, by + bh - cornerSize);
        this.ctx.stroke();

        // Badge Pill
        this.ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
        this.ctx.beginPath();
        const tagW = 110;
        const tagH = 22;
        const tagY = Math.max(0, by - tagH - 4);
        this.ctx.roundRect ? this.ctx.roundRect(bx, tagY, tagW, tagH, 4) : this.ctx.fillRect(bx, tagY, tagW, tagH);
        this.ctx.fill();

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 11px system-ui, sans-serif";
        this.ctx.fillText("● HAND TRACKED", bx + 8, tagY + 15);
      }
      this.ctx.restore();
    }

    // 2. Draw Skeleton Bones
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(99, 102, 241, 0.9)"; // Indigo Accent
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = "round";

    HAND_CONNECTIONS.forEach(([i, j]) => {
      const p1 = this.smoothLandmarks[i];
      const p2 = this.smoothLandmarks[j];
      if (p1 && p2) {
        const x1 = p1[0] * scaleX;
        const y1 = p1[1] * scaleY;
        const x2 = p2[0] * scaleX;
        const y2 = p2[1] * scaleY;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    });

    // 3. Draw Landmark Joints (21 Points)
    this.smoothLandmarks.forEach((pt, index) => {
      const x = pt[0] * scaleX;
      const y = pt[1] * scaleY;

      const isTip = [4, 8, 12, 16, 20].includes(index);
      const isWrist = index === 0;

      this.ctx.beginPath();
      this.ctx.arc(x, y, isTip ? 5.5 : (isWrist ? 6 : 3.5), 0, 2 * Math.PI);

      if (isTip) {
        this.ctx.fillStyle = "#06B6D4"; // Cyan Tip
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 1.8;
        this.ctx.fill();
        this.ctx.stroke();
      } else if (isWrist) {
        this.ctx.fillStyle = "#F59E0B"; // Amber Wrist
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 1.8;
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = "#818CF8"; // Soft Purple/Indigo
        this.ctx.fill();
      }
    });

    this.ctx.restore();
  }
}
