import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';

// Config matches the keys in your Vercel Screenshot exactly
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app;
let auth: any;
let db: any;
let provider: any;
let isInitialized = false;

try {
    // Only initialize if the API key exists in the environment
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        provider = new GoogleAuthProvider();
        isInitialized = true;
    } else {
        console.warn("Firebase API Key not found in environment variables.");
    }
} catch (e) {
    console.warn("Firebase initialization failed. Check your config.", e);
}

export { auth };

export const signInWithGoogle = async () => {
    if (!isInitialized) {
        alert("Firebase is not configured. Please check your Environment Variables.");
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
        // Save high score (check if existing is lower first ideally, but simple merge for now)
        // We will store a history of games
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
        
        console.log("Game stats saved!");
    } catch (e) {
        // If document doesn't exist, setDoc handles it, but updateDoc might fail if we needed arrayUnion on new doc
        // Fallback for new users
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
            // We can also store max WPM on the main document for easy access
            maxWPM: wpm // Logic needed to only update if higher, but for now simple overwrite
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