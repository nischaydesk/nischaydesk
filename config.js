// NischayDesk Cloud Configuration (Compat Mode Bridge)
const firebaseConfig = {
  apiKey: "AIzaSyCIZ3G_mJ2NdQxwFPSMKyQ5qSwt1Y_5w-U",
  authDomain: "nischaydesk.firebaseapp.com",
  projectId: "nischaydesk",
  storageBucket: "nischaydesk.firebasestorage.app",
  messagingSenderId: "204191555286",
  appId: "1:204191555286:web:dac02d45e0be4c13117377",
  measurementId: "G-WXM8RJ080H"
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
    if (typeof firebase !== 'undefined') {
      const hasRealKeys = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_ACTUAL');
      if (hasRealKeys) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        window.NischayConfig.authInstance = firebase.auth();
        window.NischayConfig.dbInstance = firebase.firestore();
        window.NischayConfig.isCloudReady = true;
        console.log("⚡ [NischayDesk] Google Firebase Cloud Engine Active & Connected!");
      }
    }
  } catch (error) {
    console.error("❌ [NischayDesk] Cloud Initialization Error:", error);
  }
})();
