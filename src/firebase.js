import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import {
  initializeAuth,
  browserLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRGbce2bJgKusvgYR7x0HrtrTs9OHCRkY",
  authDomain: "homeautomation-c1f34.firebaseapp.com",
  projectId: "homeautomation-c1f34",
  storageBucket: "homeautomation-c1f34.firebasestorage.app",
  messagingSenderId: "1044729122668",
  appId: "1:1044729122668:web:c54ebc2157d9dfd5e22d49",
  measurementId: "G-NT56JQDW4R",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Authentication
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

// Google Authentication
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Firestore
const db = getFirestore(app);

// Analytics
const analytics = getAnalytics(app);

export {
  app,
  auth,
  db,
  googleProvider,
  analytics,
};