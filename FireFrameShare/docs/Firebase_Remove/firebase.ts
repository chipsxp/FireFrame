// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_AUTH_LINK.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET_LINK.firebasestorage.app",
  messagingSenderId: "ITS_A_MAGICAL_PLACE",
  appId: "MORE_JIBBERISH_ID_FROM_DASHBOARD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulators in development (only if explicitly enabled)
if (
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
) {
  // Only connect to emulators if not already connected
  try {
    console.log("Connecting to Firebase emulators...");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectAuthEmulator(auth, "http://localhost:9099");
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("✅ Connected to Firebase emulators");
  } catch (error) {
    // Emulators already connected or not available
    console.log("Firebase emulators connection skipped:", error);
  }
} else {
  console.log("🔥 Using production Firebase services");
}

export default app;
