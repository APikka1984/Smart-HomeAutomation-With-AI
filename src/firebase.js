// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRGbce2bJgKusvgYR7x0HrtrTs9OHCRkY",
  authDomain: "homeautomation-c1f34.firebaseapp.com",
  projectId: "homeautomation-c1f34",
  storageBucket: "homeautomation-c1f34.firebasestorage.app",
  messagingSenderId: "1044729122668",
  appId: "1:1044729122668:web:c54ebc2157d9dfd5e22d49",
  measurementId: "G-NT56JQDW4R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;