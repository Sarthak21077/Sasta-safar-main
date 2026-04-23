import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIR-ykc9h0K3K0gASgvQ6HKZsc-UPbQag",
  authDomain: "sasta-safar-2a24e.firebaseapp.com",
  projectId: "sasta-safar-2a24e",
  storageBucket: "sasta-safar-2a24e.firebasestorage.app",
  messagingSenderId: "87693377761",
  appId: "1:87693377761:web:a11e092938587dc70077a0"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// To use Phone auth across the app we might need RecaptchaVerifier directly in components
