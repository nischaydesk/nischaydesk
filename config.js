/* ==========================================================================
   NischayDesk Backend Cloud Configuration (Firebase / Firestore)
   Engineered by Prince Kumar
   ========================================================================== */

/**
 * Global Firebase Configuration
 * नोट: जब तुम Firebase Console (console.firebase.google.com) पर फ्री प्रोजेक्ट बनाओगे,
 * तो वहाँ से मिलने वाली अपनी असली Keys को यहाँ नीचे रिप्लेस कर देना।
 */
const firebaseConfig = {
  apiKey: "AIzaSy_YOUR_ACTUAL_FIREBASE_API_KEY_HERE",
  authDomain: "nischaydesk-portal.firebaseapp.com",
  projectId: "nischaydesk-portal",
  storageBucket: "nischaydesk-portal.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Global App State & Database Containers
window.NischayConfig = {
  isCloudReady: false,
  authInstance: null,
  dbInstance: null,
  platformVersion: "2.0.4 Enterprise",
  founder: "Prince Kumar"
};

(function initCloudBackend() {
  try {
    // Check if Firebase Library is loaded
    // @ts-ignore
    if (typeof firebase !== 'undefined') {
      // Validate if dummy keys or real keys are present
      const hasRealKeys = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_ACTUAL');

      if (hasRealKeys) {
        // @ts-ignore
        if (!firebase.apps.length) {
          // @ts-ignore
          firebase.initializeApp(firebaseConfig);
        }
        // @ts-ignore
        window.NischayConfig.authInstance = firebase.auth();
        // @ts-ignore
        window.NischayConfig.dbInstance = firebase.firestore();
        window.NischayConfig.isCloudReady = true;

        console.log("⚡ [NischayDesk] Google Firebase Cloud Engine Active & Connected!");
      } else {
        console.warn("⚠️ [NischayDesk] Real Firebase API keys not detected. Running in Intelligent Local-Sync Mode.");
      }
    }
  } catch (error) {
    console.error("❌ [NischayDesk] Cloud Initialization Error:", error);
  }
})();
