// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCIZ3G_mJ2NdQxwFPSMKyQ5qSwt1Y_5w-U",
  authDomain: "nischaydesk.firebaseapp.com",
  projectId: "nischaydesk",
  storageBucket: "nischaydesk.firebasestorage.app",
  messagingSenderId: "204191555286",
  appId: "1:204191555286:web:dac02d45e0be4c13117377",
  measurementId: "G-WXM8RJ080H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
