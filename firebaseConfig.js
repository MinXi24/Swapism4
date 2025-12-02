// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Import Auth
import { getDatabase } from "firebase/database"; // Import Database

const firebaseConfig = {
  apiKey: "AIzaSyB1oByjPNmy7KLqrveFLf19R0lv4CE6Zuc",
  authDomain: "wardrobe-plug-fyp.firebaseapp.com",
  databaseURL: "https://wardrobe-plug-fyp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wardrobe-plug-fyp",
  storageBucket: "wardrobe-plug-fyp.firebasestorage.app",
  messagingSenderId: "765114897708",
  appId: "1:765114897708:web:cd02ddd24f472c865b8889",
  measurementId: "G-FD68JJ870G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getDatabase(app); // Realtime Database
const auth = getAuth(app);   // Authentication

// Export them to use in other files
export { app, auth, db };

console.log("🔥 Firebase has been initialized successfully!");