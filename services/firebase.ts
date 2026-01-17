import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

// CONFIGURATION:
// Try to get variables from both process.env (Webpack/Create-React-App) and import.meta.env (Vite)
// explicitly to ensure the bundler can replace them.

const getEnv = (key: string) => {
    let val = '';
    // 1. Try Vite (import.meta.env)
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            val = import.meta.env[`VITE_${key}`] || import.meta.env[key];
        }
    } catch (e) {}

    if (val) return val;

    // 2. Try Node/CRA (process.env)
    try {
        if (process && process.env) {
            val = process.env[`REACT_APP_${key}`] || process.env[key] || process.env[`VITE_${key}`] || '';
        }
    } catch (e) {}
    
    return val;
};

// Explicitly list keys for bundler find-and-replace optimization
const rawConfig = {
    apiKey:            getEnv('FIREBASE_API_KEY'),
    authDomain:        getEnv('FIREBASE_AUTH_DOMAIN'),
    projectId:         getEnv('FIREBASE_PROJECT_ID'),
    storageBucket:     getEnv('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
    appId:             getEnv('FIREBASE_APP_ID')
};

let app;
let auth: any = null;
let db: any = null;
let provider: any = null;
let isInitialized = false;

if (rawConfig.apiKey) {
    try {
        app = initializeApp(rawConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        provider = new GoogleAuthProvider();
        isInitialized = true;
        console.log("Firebase initialized.");
    } catch (e) {
        console.error("Firebase init failed:", e);
    }
} else {
    console.warn("Firebase Config Missing. Login will not work.");
}

export { auth };

export const signInWithGoogle = async () => {
    if (!isInitialized || !auth) {
        // Allow bypass for testing if no keys (Optional: Remove if strict auth required)
        console.error("Sign In Error: Firebase not configured.");
        alert("Configuration Error: Firebase API Keys are missing.\n\nPlease check your .env file or Vercel Environment Variables.");
        return;
    }
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error signing in", error);
        throw error;
    }
};

export const logout = async () => {
    if (!isInitialized || !auth) return;
    await signOut(auth);
};

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    if (!isInitialized || !db || !user) return;
    
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
        // Silent fail
    }
};

export const saveSpeedTestStats = async (user: User, wpm: number, accuracy: number) => {
    if (!isInitialized || !db || !user) return;
    
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
        // Silent fail
    }
};