
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

export const saveLeaderboardScore = async (user: User, username: string, score: number, title: string, stats: SessionStats, mode: string) => {
    if (!isInitialized || !db) return;
    try {
        // Calculate Sort Value
        // Competitive: Level * 1,000,000 + Score (Max 10k). This ensures Level 4 > Level 3.
        // Others: Just Score.
        let sortValue = score;
        if (mode === 'competitive') {
            sortValue = (stats.levelReached * 1000000) + score;
        }

        await addDoc(collection(db, "leaderboard"), {
            uid: user.uid,
            username: username,
            score: score,
            title: title,
            stats: stats,
            timestamp: Date.now(),
            mode: mode,
            levelReached: stats.levelReached,
            sortValue: sortValue
        });
    } catch (e) {
        console.error("Error saving score", e);
    }
};

export const getLeaderboard = async (mode: string = 'competitive'): Promise<LeaderboardEntry[]> => {
    if (!isInitialized || !db) return [];
    try {
        // Fetch top 50 scores for the mode, ordered by sortValue
        // If sortValue doesn't exist (old data), it might be excluded, which is fine for new feature.
        const q = query(
            collection(db, "leaderboard"), 
            where("mode", "==", mode),
            orderBy("sortValue", "desc"), 
            limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const entries: LeaderboardEntry[] = [];
        const userEntryCounts: Record<string, number> = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const uid = data.uid;
            
            // Limit to 3 entries per user
            if (!userEntryCounts[uid]) userEntryCounts[uid] = 0;
            if (userEntryCounts[uid] < 3) {
                userEntryCounts[uid]++;
                entries.push({
                    id: doc.id,
                    uid: data.uid,
                    username: data.username,
                    score: data.score,
                    title: data.title,
                    stats: data.stats,
                    timestamp: data.timestamp,
                    levelReached: data.levelReached || 1,
                    mode: data.mode
                });
            }
        });

        // Return top 10 after filtering
        return entries.slice(0, 10);
    } catch (e) {
        console.error("Error fetching leaderboard", e);
        // Fallback for missing index error during dev: try sorting by score if sortValue fails
        // But for this request, assuming we can't create indexes, we might need client-side sort if this fails.
        // However, standard orderBy usually requires an index for compound queries. 
        // Single field orderBy ("sortValue") with where ("mode") requires an index.
        // If it fails, return empty array.
        return [];
    }
};
