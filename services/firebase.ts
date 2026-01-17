
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, arrayUnion, getDoc, collection, addDoc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { LeaderboardEntry, SessionStats } from '../types';

// CONFIGURATION:
const getEnv = (key: string) => {
    let val = '';
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            val = import.meta.env[`VITE_${key}`] || import.meta.env[key];
        }
    } catch (e) {}

    if (val) return val;

    try {
        if (process && process.env) {
            val = process.env[`REACT_APP_${key}`] || process.env[key] || process.env[`VITE_${key}`] || '';
        }
    } catch (e) {}
    
    return val;
};

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
        console.error("Sign In Error: Firebase not configured.");
        alert("Configuration Error: Firebase API Keys are missing.");
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

// --- User Profile ---

export const getUserProfile = async (uid: string) => {
    if (!isInitialized || !db) return null;
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};

export const saveUsername = async (uid: string, username: string) => {
    if (!isInitialized || !db) return;
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { username }, { merge: true });
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
            speedTestHistory: arrayUnion({ date, wpm, accuracy })
        });
    } catch (e) {}
};

// --- Leaderboard ---

export const saveLeaderboardScore = async (
    user: User, 
    username: string, 
    score: number, 
    title: string, 
    stats: SessionStats, 
    mode: string,
    extra?: { accuracy?: number }
) => {
    if (!isInitialized || !db) return;
    try {
        // Sort Value Logic
        // Competitive/Universal/Infinite: Prioritize Level first (x1000), then Score (0-100)
        // If mode is speed-test, score is WPM directly.
        
        let sortValue = score;
        if (mode !== 'speed-test') {
             // Example: Level 6, Score 100 -> 6100. Level 5, Score 50 -> 5050.
             // This ensures higher level always wins.
             sortValue = (stats.levelReached * 1000) + score; 
        }

        const data: any = {
            uid: user.uid,
            username: username,
            score: score, // This is now 0-100 for non-speed modes
            title: title,
            stats: stats,
            timestamp: Date.now(),
            mode: mode,
            levelReached: stats.levelReached,
            sortValue: sortValue
        };

        if (extra?.accuracy !== undefined) {
            data.accuracy = extra.accuracy;
        }

        await addDoc(collection(db, "leaderboard"), data);
    } catch (e) {
        console.error("Error saving score", e);
    }
};

export const getLeaderboard = async (mode: string = 'competitive'): Promise<LeaderboardEntry[]> => {
    if (!isInitialized || !db) return [];
    try {
        // Query ONLY by mode. Sorting is done in memory to avoid "Missing Index" errors on Firebase.
        // We limit to 100 to keep it lightweight.
        const q = query(
            collection(db, "leaderboard"), 
            where("mode", "==", mode),
            limit(100)
        );
        
        const querySnapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = [];
        const userEntryCounts: Record<string, number> = {};

        // Convert docs to array
        const rawEntries = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as LeaderboardEntry[]; // Temporary cast including internal fields

        // Client-side Sort
        // @ts-ignore
        rawEntries.sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));

        // Filter: Max 3 per user
        for (const data of rawEntries) {
             const uid = data.uid;
             if (!userEntryCounts[uid]) userEntryCounts[uid] = 0;
             if (userEntryCounts[uid] < 3) {
                 userEntryCounts[uid]++;
                 entries.push(data);
             }
        }

        // Return top 10
        return entries.slice(0, 10);
    } catch (e) {
        console.error("Error fetching leaderboard", e);
        return [];
    }
};
