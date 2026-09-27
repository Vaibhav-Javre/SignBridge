/**
 * Speech Service: Indian English & Marathi Web Speech API
 * - Prioritizes Indian English (en-IN) voices (Neerja, Ravi, Heera, Google en-IN)
 * - Full support for Marathi (mr-IN) voices (Aarohi, Google Marathi, Devanagari fallback)
 * - Chromium garbage collection protection
 * - Interaction audio context auto-unlock
 */

if (typeof window !== "undefined") {
  window._speechUtteranceRef = null;
}

class SpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    this.isSpeaking = false;
    this.lastSpokenText = "";
    this.lastSpokenTime = 0;
    this.listeners = new Set();
    this.currentLanguage = "en-IN"; // Default to Indian English
    this.voice = null;
    this.isUnlocked = false;

    this.initVoices();
    this.setupUnlockOnInteraction();
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode === "mr-IN" || langCode === "mr" ? "mr-IN" : "en-IN";
    this.selectBestVoice();
    this.notify("language_changed", { language: this.currentLanguage });
    console.log(`[SpeechService] Language set to ${this.currentLanguage} with voice:`, this.voice?.name || "System Default");
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      try {
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;
        this.selectBestVoice();
      } catch (e) {
        console.warn("[SpeechService] Error loading voices:", e);
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  selectBestVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    if (this.currentLanguage === "mr-IN") {
      // 1. Marathi specific voices (e.g. Microsoft Aarohi, Google मराठी, mr-IN)
      let marathiVoice = voices.find(
        v => v.lang.startsWith("mr") || 
             v.name.toLowerCase().includes("marathi") || 
             v.name.includes("मराठी") ||
             v.name.toLowerCase().includes("aarohi")
      );

      // 2. Fallback to Hindi (hi-IN) voice if Marathi voice is not installed on Windows
      // (Devanagari phonetics are nearly identical and pronounce Marathi cleanly)
      if (!marathiVoice) {
        marathiVoice = voices.find(
          v => v.lang.startsWith("hi") || 
               v.name.toLowerCase().includes("hindi") ||
               v.name.toLowerCase().includes("swara") ||
               v.name.toLowerCase().includes("kalpana")
        );
      }

      // 3. Fallback to Indian English or first available
      this.voice = marathiVoice || voices.find(v => v.lang.includes("IN")) || voices[0];

    } else {
      // Indian English (en-IN)
      // Look for Microsoft Neerja, Ravi, Heera, Google English (India)
      const indianVoice = voices.find(
        v => (v.lang === "en-IN" || v.lang === "en_IN") ||
             (v.lang.startsWith("en") && (
               v.name.toLowerCase().includes("india") ||
               v.name.toLowerCase().includes("neerja") ||
               v.name.toLowerCase().includes("ravi") ||
               v.name.toLowerCase().includes("heera") ||
               v.name.toLowerCase().includes("prabhat")
             ))
      );

      this.voice = indianVoice || voices.find(v => v.lang.startsWith("en")) || voices[0];
    }
  }

  setupUnlockOnInteraction() {
    if (typeof window === "undefined") return;

    const unlock = () => {
      if (this.isUnlocked || !this.synth) return;
      try {
        this.synth.resume();
        this.isUnlocked = true;
      } catch (e) {
        // ignore
      }
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
  }

  isSupported() {
    return !!this.synth;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(status, details = {}) {
    this.listeners.forEach(fn => fn({ status, language: this.currentLanguage, ...details }));
  }

  speak(text, force = false) {
    if (!this.isSupported()) {
      this.notify("unsupported", { text });
      return false;
    }

    const cleanText = text ? text.trim() : "";
    if (!cleanText) return false;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      if (this.synth.speaking && force) {
        this.synth.cancel();
      }

      // Re-check voice for selected language
      if (!this.voice) {
        this.selectBestVoice();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.currentLanguage; // 'en-IN' or 'mr-IN'

      if (this.voice) {
        utterance.voice = this.voice;
      }
      
      utterance.rate = this.currentLanguage === "mr-IN" ? 0.95 : 1.0; // slightly natural pace
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window._speechUtteranceRef = utterance;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.lastSpokenText = cleanText;
        this.lastSpokenTime = Date.now();
        this.notify("speaking", { text: cleanText });
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        window._speechUtteranceRef = null;
        this.notify("idle", { text: cleanText });
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("[SpeechService] Speech error:", e.error);
        }
        this.isSpeaking = false;
        window._speechUtteranceRef = null;
        this.notify("idle", { text: cleanText });
      };

      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.warn("[SpeechService] Exception during speak:", err);
      this.isSpeaking = false;
      return false;
    }
  }

  cancel() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
      this.isSpeaking = false;
      window._speechUtteranceRef = null;
      this.notify("idle");
    }
  }
}

export const speechService = new SpeechService();
