import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

// HELPER: Explicitly check all common prefix patterns.
// Bundlers replace `process.env.XYZ` strings at build time. 
// Dynamic access (process.env[key]) fails in bundled apps.
const getEnvVar = (base: string, vite: string, react: string): string => {
  try {
    // @ts-ignore
    return process.env[base] || process.env[vite] || process.env[react] || 
           // @ts-ignore
           (import.meta.env && import.meta.env[base]) || 
           // @ts-ignore
           (import.meta.env && import.meta.env[vite]) || 
           // @ts-ignore
           (import.meta.env && import.meta.env[react]) || "";
  } catch (e) {
    return "";
  }
};

// STATIC CONFIGURATION
// We must statically reference the process.env properties for the bundler to see them.
const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID
};

let app;
let auth: any = null;
let db: any = null;
let provider: any = null;
let isInitialized = false;

// Attempt Initialization
try {
    // Verify we have at least an API Key
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        provider = new GoogleAuthProvider();
        isInitialized = true;
        console.log("Firebase Initialized Successfully");
    } else {
        console.warn("Firebase Config Missing. Environment variables not found.");
        console.log("Debug Config:", JSON.stringify(firebaseConfig, null, 2));
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export { auth };

export const signInWithGoogle = async () => {
    if (!isInitialized || !auth) {
        const msg = "Cannot sign in: Firebase configuration is missing. Please check your environment variables.";
        console.error(msg);
        alert(msg);
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
        console.warn("Failed to save stats", e);
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
        console.warn("Failed to save speed stats", e);
    }
};