import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {
    getFirestore,
    collection,
    query,
    getDocs,
    orderBy,
    limit,
    addDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    where,
    getDoc,
    onSnapshot,
    increment,
    arrayUnion
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Singleton pattern for Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Export db and all common firestore methods from the SAME instance
export {
    db,
    messaging,
    getToken,
    onMessage,
    collection,
    query,
    getDocs,
    orderBy,
    limit,
    addDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    where,
    getDoc,
    onSnapshot,
    increment,
    arrayUnion
};

