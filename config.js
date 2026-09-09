/* ==========================================================================
   NischayDesk Cloud Configuration (Compat Mode Bridge)
   Engineered & Maintained by Prince Kumar
   ========================================================================== */

// 1. आपका नया और असली Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB3M_FVIR3QabrxdGWwP1VUdA1VEGiRGW8",
  authDomain: "nischaydesk-95783.firebaseapp.com",
  projectId: "nischaydesk-95783",
  storageBucket: "nischaydesk-95783.firebasestorage.app",
  messagingSenderId: "252942149944",
  appId: "1:252942149944:web:f7882836dc788d0ba179cd",
  measurementId: "G-ZM573D4X41"
};

// 2. Global Containers
window.NischayConfig = {
  isCloudReady: false,
  authInstance: null,
  dbInstance: null,
  platformVersion: "2.0.4 Enterprise",
  founder: "Prince Kumar"
};

// 3. Cloud Backend Initializer
(function initCloudBackend() {
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      window.NischayConfig.authInstance = firebase.auth();
      window.NischayConfig.dbInstance = firebase.firestore();
      window.NischayConfig.isCloudReady = true;
      console.log("⚡ [NischayDesk] Google Firebase Cloud Connected Successfully!");
    }
  } catch (error) {
    console.error("❌ [NischayDesk] Cloud Initialization Error:", error);
  }
})();
