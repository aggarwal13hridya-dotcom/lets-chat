// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRNXd2Ii4tNrjsPtZm_iAYyApihJDn0-M",
  authDomain: "let-s-chat-a4be8.firebaseapp.com",
  projectId: "let-s-chat-a4be8",
  storageBucket: "let-s-chat-a4be8.appspot.com",
  messagingSenderId: "984878221933",
  appId: "1:984878221933:web:335f4bd1b8a165ff288d64",
  measurementId: "G-RLZZGEQ2MM",
  databaseURL: "https://let-s-chat-a4be8-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app); // ✅ Now Realtime Database is set up!

export { auth, provider, db };
export default app;
