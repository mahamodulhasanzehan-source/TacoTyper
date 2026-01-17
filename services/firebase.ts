import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getEnv } from '../utils/env';

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

let app;
let auth: any;
let db: any;
let provider: any;
let isInitialized = false;

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        provider = new GoogleAuthProvider();
        isInitialized = true;
    } else {
        console.warn("Firebase configuration missing. Check environment variables.");
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
}

export { auth };

export const signInWithGoogle = async () => {
    if (!isInitialized) {
        alert("Configuration Error: Firebase Environment Variables are missing or incorrect.\n\nIf you are on Vercel, ensure variables are added in Project Settings.");
        return;
    }
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error signing in", error);
    }
};

export const logout = async () => {
    if (!isInitialized) return;
    await signOut(auth);
};

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    if (!isInitialized || !user) return;
    
    const userRef = doc(db, "users", user.uid);
    const date = new Date().toISOString();

    try {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            lastPlayed: date,
        }, { merge: true });

        await updateDoc(userRef, {
            gamesHistory: arrayUnion({
                date,
                score,
                mode,
                levelReached: level
            })
        });
    } catch (e) {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            lastPlayed: date,
            gamesHistory: [{
                date,
                score,
                mode,
                levelReached: level
            }]
        }, { merge: true });
    }
};

export const saveSpeedTestStats = async (user: User, wpm: number, accuracy: number) => {
    if (!isInitialized || !user) return;
    
    const userRef = doc(db, "users", user.uid);
    const date = new Date().toISOString();

    try {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            lastPlayed: date,
            maxWPM: wpm
        }, { merge: true });

        await updateDoc(userRef, {
            speedTestHistory: arrayUnion({
                date,
                wpm,
                accuracy
            })
        });
    } catch (e) {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            lastPlayed: date,
            speedTestHistory: [{
                date,
                wpm,
                accuracy
            }]
        }, { merge: true });
    }
};