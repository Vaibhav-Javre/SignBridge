/**
 * SignBridge Supported Gesture Classes (19 HaGRID Predefined Classes)
 * Includes Indian English and Marathi (मराठी) names & speech texts.
 */

export const GESTURE_CLASSES = [
  {
    id: "call",
    name: "Call",
    nameMr: "कॉल करा",
    tag: "call",
    category: "Communication",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    description: "Thumb and pinky extended resembling a phone receiver, other fingers folded.",
    speechText: "Please call me or initiate contact.",
    speechTextMr: "कृपया मला कॉल करा किंवा संपर्क साधा.",
    sampleConfidence: 0.982
  },
  {
    id: "dislike",
    name: "Dislike",
    nameMr: "नापसंत",
    tag: "dislike",
    category: "Feedback",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.33 2.33 0 0 1-2.33 2H17"></path></svg>`,
    description: "Closed fist with thumb extended downwards indicating negative feedback or disagreement.",
    speechText: "I do not agree or dislike this.",
    speechTextMr: "मला हे आवडले नाही किंवा मी असहमत आहे.",
    sampleConfidence: 0.976
  },
  {
    id: "fist",
    name: "Fist",
    nameMr: "मुठी",
    tag: "fist",
    category: "Action",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"></circle><path d="M12 9v6"></path><path d="M9 12h6"></path></svg>`,
    description: "All five fingers clenched tightly into the palm forming a solid fist.",
    speechText: "Fist sign: hold, grip, or firm acknowledgment.",
    speechTextMr: "मुठीची खूण: पकड किंवा दृढ निश्चय.",
    sampleConfidence: 0.965
  },
  {
    id: "four",
    name: "Four",
    nameMr: "चार",
    tag: "four",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v9h10"></path><path d="M17 3v18"></path></svg>`,
    description: "Four fingers extended upward (index, middle, ring, pinky) with thumb tucked inward.",
    speechText: "Count of four.",
    speechTextMr: "चार संख्या.",
    sampleConfidence: 0.988
  },
  {
    id: "like",
    name: "Like",
    nameMr: "पसंत / छान",
    tag: "like",
    category: "Feedback",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
    description: "Closed hand with thumb pointed upward signifying approval, yes, or positive feedback.",
    speechText: "I like this, good, or approved.",
    speechTextMr: "मला हे खूप आवडले, छान किंवा उत्तम.",
    sampleConfidence: 0.991
  },
  {
    id: "mute",
    name: "Mute",
    nameMr: "शांत रहा",
    tag: "mute",
    category: "Directive",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
    description: "Index finger held over lips or horizontal slash gesture indicating silence or mute.",
    speechText: "Please mute or maintain silence.",
    speechTextMr: "कृपया शांतता राखा किंवा आवाज बंद करा.",
    sampleConfidence: 0.959
  },
  {
    id: "no_gesture",
    name: "No Gesture",
    nameMr: "हात ओळखला नाही",
    tag: "no_gesture",
    category: "System",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`,
    description: "Hand at rest, transitioning, or in an undefined position not matching trained classes.",
    speechText: "No specific gesture detected.",
    speechTextMr: "कोणतीही खूण आढळली नाही.",
    sampleConfidence: 0.942
  },
  {
    id: "ok",
    name: "OK",
    nameMr: "ठीक आहे",
    tag: "ok",
    category: "Communication",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="4"></circle><path d="M14 6v8"></path><path d="M17 9v5"></path><path d="M20 11v3"></path><path d="M8 12v9"></path></svg>`,
    description: "Thumb and index finger form a circle while the remaining three fingers are extended upward.",
    speechText: "OK, everything is fine.",
    speechTextMr: "ठीक आहे, सर्व काही ठीक आहे.",
    sampleConfidence: 0.974
  },
  {
    id: "one",
    name: "One",
    nameMr: "एक",
    tag: "one",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><path d="M8 7l4-4"></path><path d="M8 21h8"></path></svg>`,
    description: "Index finger pointing straight upward with the thumb and other three fingers folded.",
    speechText: "Number one, first, or pointing.",
    speechTextMr: "क्रमांक एक किंवा पहिला.",
    sampleConfidence: 0.985
  },
  {
    id: "palm",
    name: "Palm",
    nameMr: "नमस्कार / हात",
    tag: "palm",
    category: "Directive",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"></path><path d="M14 10V4a2 2 0 0 0-4 0v6"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M6 14v1a7 7 0 0 0 14 0v-4a2 2 0 0 0-4 0"></path></svg>`,
    description: "Open flat hand facing forward with all fingers relaxed and extended.",
    speechText: "Open palm: hello, show, or present.",
    speechTextMr: "नमस्कार, उघडा हात किंवा स्वागत.",
    sampleConfidence: 0.979
  },
  {
    id: "peace",
    name: "Peace",
    nameMr: "शांती / दोन",
    tag: "peace",
    category: "Communication",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13V5a1.5 1.5 0 0 1 3 0v8"></path><path d="M12 9V3a1.5 1.5 0 0 1 3 0v9"></path><path d="M9 13a4 4 0 0 0 8 0v-3a2 2 0 0 0-4 0"></path><line x1="7" y1="13" x2="7" y2="21"></line></svg>`,
    description: "Index and middle fingers extended forming a 'V' shape with palm facing outward.",
    speechText: "Peace, victory, or two.",
    speechTextMr: "शांती किंवा विजय खूण.",
    sampleConfidence: 0.987
  },
  {
    id: "peace_inverted",
    name: "Peace Inverted",
    nameMr: "उलटी शांती",
    tag: "peace_inverted",
    category: "Communication",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V3a1.5 1.5 0 0 1 3 0v8"></path><path d="M12 8V2a1.5 1.5 0 0 1 3 0v8"></path><path d="M6 15a6 6 0 0 0 12 0v-5"></path></svg>`,
    description: "Index and middle fingers in a 'V' shape with the back of the hand facing the camera.",
    speechText: "Inverted peace sign.",
    speechTextMr: "उलटी शांती खूण.",
    sampleConfidence: 0.963
  },
  {
    id: "rock",
    name: "Rock",
    nameMr: "रॉक ऑन",
    tag: "rock",
    category: "Communication",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V4a1.5 1.5 0 0 1 3 0v7"></path><path d="M17 11V5a1.5 1.5 0 0 1 3 0v10"></path><path d="M7 11a4 4 0 0 0 8 0"></path><path d="M7 15v6h10v-6"></path></svg>`,
    description: "Index finger and pinky extended upward while middle and ring fingers are held down.",
    speechText: "Rock on, celebration, or horn sign.",
    speechTextMr: "रॉक ऑन, उत्सव किंवा अभिनंदन.",
    sampleConfidence: 0.971
  },
  {
    id: "stop",
    name: "Stop",
    nameMr: "थांबा",
    tag: "stop",
    category: "Directive",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>`,
    description: "Vertical open hand with palm facing the camera in an authoritative halt motion.",
    speechText: "Stop, please halt or pause.",
    speechTextMr: "कृपया येथे थांबा किंवा थांबण्याची खूण.",
    sampleConfidence: 0.993
  },
  {
    id: "stop_inverted",
    name: "Stop Inverted",
    nameMr: "उलटा थांबा",
    tag: "stop_inverted",
    category: "Directive",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
    description: "Vertical hand held in reverse orientation or downward halt orientation.",
    speechText: "Stop gesture, inverted orientation.",
    speechTextMr: "उलटी थांबा खूण.",
    sampleConfidence: 0.958
  },
  {
    id: "three",
    name: "Three",
    nameMr: "तीन",
    tag: "three",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10l-6 7a5 5 0 1 1-1 8"></path></svg>`,
    description: "Thumb, index, and middle fingers extended (classic European/HaGRID style 3).",
    speechText: "Count of three.",
    speechTextMr: "तीन संख्या.",
    sampleConfidence: 0.978
  },
  {
    id: "three2",
    name: "Three (Variant)",
    nameMr: "तीन पर्याय",
    tag: "three2",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v12"></path><path d="M12 2v13"></path><path d="M16 4v11"></path><path d="M6 18c0 2 2 3 6 3s6-1 6-3"></path></svg>`,
    description: "Index, middle, and ring fingers extended upward with thumb holding pinky down.",
    speechText: "Number three, alternative variant.",
    speechTextMr: "क्रमांक तीन, दुसरा प्रकार.",
    sampleConfidence: 0.969
  },
  {
    id: "two_up",
    name: "Two Up",
    nameMr: "दोन बोटे वर",
    tag: "two_up",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 22V7a2 2 0 0 1 4 0v15"></path><path d="M13 22V5a2 2 0 0 1 4 0v17"></path></svg>`,
    description: "Index and middle fingers parallel and pointing straight up with fingers joined.",
    speechText: "Two fingers up, parallel.",
    speechTextMr: "दोन बोटे सरळ वर.",
    sampleConfidence: 0.984
  },
  {
    id: "two_up_inverted",
    name: "Two Up Inverted",
    nameMr: "दोन बोटे खाली",
    tag: "two_up_inverted",
    category: "Numbers",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v15a2 2 0 0 0 4 0V2"></path><path d="M13 2v17a2 2 0 0 0 4 0V2"></path></svg>`,
    description: "Two fingers pointing downward or inverted parallel position.",
    speechText: "Two fingers pointing downwards.",
    speechTextMr: "दोन बोटे खाली.",
    sampleConfidence: 0.961
  }
];

export const CATEGORIES = [
  "All",
  "Communication",
  "Feedback",
  "Numbers",
  "Directive",
  "Action"
];
