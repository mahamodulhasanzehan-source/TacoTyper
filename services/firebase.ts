
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { LeaderboardEntry, SessionStats } from '../types';

// --- Configuration ---

// Helper to clean environment variables (strip quotes if they were added by the build tool)
const cleanEnv = (val: string | undefined) => {
    if (!val) return '';
    // Remove surrounding quotes (single or double) and trim whitespace
    return val.replace(/^['"]|['"]$/g, '').trim();
};

// Direct access ensures the bundler can replace 'process.env' correctly with the defined object
// We check for the specific keys provided in the Vercel screenshot first
const apiKey = cleanEnv(process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY);
const authDomain = cleanEnv(process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN);
const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID);
const storageBucket = cleanEnv(process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET);
const messagingSenderId = cleanEnv(process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const appId = cleanEnv(process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID);

if (!apiKey) {
    console.error("CRITICAL: Firebase API Key is missing. Please check Vercel Environment Variables.");
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

// Initialize Firebase only if we have a config, otherwise we risk crashing hard immediately.
// However, getting Auth will fail if app is not initialized.
let app;
let authExport;
let dbExport;

try {
    app = initializeApp(firebaseConfig);
    authExport = getAuth(app);
    dbExport = getFirestore(app);
} catch (e) {
    console.error("Firebase Initialization Failed:", e);
    // Provide a dummy fallback so imports don't crash the entire bundle execution immediately
    // The app will likely still fail when trying to use auth, but it allows the error UI to potentially render
    authExport = {} as any;
    dbExport = {} as any;
}

export const auth = authExport;
export const db = dbExport;

// --- Types ---
export type User = FirebaseUser;

export interface UserProfile {
    username: string;
    usernameLower: string; // Helper for case-insensitive search
    email?: string;
    photoURL?: string;
    friends: string[]; // List of UIDs
    gamesHistory?: any[];
    speedTestHistory?: any[];
    maxWPM?: number;
    displayName?: string;
    uid?: string;
}

export interface FriendRequest {
    id?: string;
    from: string; // UID
    fromName: string;
    to: string; // UID
    status: 'pending' | 'accepted' | 'rejected';
    timestamp: any;
}

// --- Auth Functions ---

export const onAuthStateChanged = (
    _authObj: any, 
    nextOrObserver: (user: User | null) => void, 
    _error?: (error: any) => void
) => {
    if (!auth) return () => {};
    return firebaseOnAuthStateChanged(auth, nextOrObserver, _error);
};

export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Sync Auth to Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        const timestamp = serverTimestamp();

        if (!userSnap.exists()) {
            // Create new profile with requested fields
            await setDoc(userRef, {
                uid: user.uid,               // Saved as requested
                displayName: user.displayName || '', // Saved as requested
                username: '', 
                usernameLower: '',
                email: user.email,
                photoURL: user.photoURL,     // Saved as requested
                friends: [],
                createdAt: timestamp,
                lastLogin: timestamp
            });
        } else {
            // Update existing login info and ensure basic info is fresh
            await updateDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || '',
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: timestamp
            });
        }
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.reload();
};

// --- User Profile ---

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data() as UserProfile;
        }
        return null;
    } catch (e) {
        console.error("Error fetching profile", e);
        return null;
    }
};

export const saveUsername = async (uid: string, username: string) => {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
        username: username,
        usernameLower: username.toLowerCase() // Save lower case for searching
    }, { merge: true });
};

// --- Friend System ---

export const fetchActiveUsers = async (currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]> => {
    try {
        // 1. Get current user's friends to check status
        const currentUserRef = doc(db, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data() as UserProfile;
        const myFriends = currentUserData?.friends || [];

        // 2. Get last 100 active users (so the list is populated initially)
        const usersRef = collection(db, "users");
        // We order by lastLogin to show active people first
        const q = query(usersRef, orderBy("lastLogin", "desc"), limit(100));
        
        const querySnapshot = await getDocs(q);
        const results: any[] = [];

        querySnapshot.forEach((doc) => {
            const uid = doc.id;
            if (uid === currentUid) return; // Skip self

            const data = doc.data();
            // Use username if set, otherwise fallback to displayName, otherwise "Unknown Chef"
            const display = data.username || data.displayName || "Unknown Chef";

            if (display) {
                results.push({
                    uid,
                    username: display,
                    isFriend: myFriends.includes(uid),
                    hasPending: false 
                });
            }
        });

        return results;
    } catch (e) {
        console.error("Error fetching active users", e);
        return [];
    }
};

export const searchUsers = async (searchTerm: string, currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]> => {
    // Deprecated for UI use in favor of client-side filtering of fetchActiveUsers, 
    // but kept for specific queries if needed later.
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    
    const lowerTerm = searchTerm.toLowerCase().trim();
    const results: any[] = [];
    
    const currentUserRef = doc(db, "users", currentUid);
    const currentUserSnap = await getDoc(currentUserRef);
    const currentUserData = currentUserSnap.data() as UserProfile;
    const myFriends = currentUserData?.friends || [];

    const usersRef = collection(db, "users");
    const q = query(
        usersRef, 
        where("usernameLower", ">=", lowerTerm),
        where("usernameLower", "<=", lowerTerm + '\uf8ff'),
        limit(10)
    );

    const querySnapshot = await getDocs(q);

    for (const doc of querySnapshot.docs) {
        const uid = doc.id;
        if (uid === currentUid) continue; 

        const data = doc.data();
        if (!data.username) continue; 

        const isFriend = myFriends.includes(uid);
        
        results.push({
            uid,
            username: data.username,
            isFriend,
            hasPending: false
        });
    }

    return results;
};

export const sendFriendRequest = async (fromUid: string, toUid: string) => {
    try {
        const senderProfile = await getUserProfile(fromUid);
        if (!senderProfile) return false;

        const requestsRef = collection(db, "requests");
        const q = query(
            requestsRef, 
            where("from", "==", fromUid), 
            where("to", "==", toUid),
            where("status", "==", "pending")
        );
        const existing = await getDocs(q);
        if (!existing.empty) return false;

        await addDoc(requestsRef, {
            from: fromUid,
            fromName: senderProfile.username || senderProfile.displayName || "Unknown",
            to: toUid,
            status: 'pending',
            timestamp: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error sending request", e);
        return false;
    }
};

export const getFriendRequests = async (uid: string): Promise<FriendRequest[]> => {
    const requestsRef = collection(db, "requests");
    const q = query(
        requestsRef,
        where("to", "==", uid),
        where("status", "==", "pending")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as FriendRequest[];
};

export const acceptFriendRequest = async (currentUid: string, fromUid: string) => {
    try {
        const meRef = doc(db, "users", currentUid);
        const themRef = doc(db, "users", fromUid);

        await updateDoc(meRef, { friends: arrayUnion(fromUid) });
        await updateDoc(themRef, { friends: arrayUnion(currentUid) });

        const requestsRef = collection(db, "requests");
        const q = query(
            requestsRef, 
            where("from", "==", fromUid), 
            where("to", "==", currentUid),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        
        snapshot.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "requests", docSnap.id));
        });

        return true;
    } catch (e) {
        console.error("Error accepting friend", e);
        return false;
    }
};

// --- Stats & Leaderboard (Firestore Implementation) ---

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        gamesHistory: arrayUnion({
            date: new Date().toISOString(),
            score,
            mode,
            levelReached: level
        })
    });
};

export const saveSpeedTestStats = async (user: User, wpm: number, accuracy: number) => {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        speedTestHistory: arrayUnion({
            date: new Date().toISOString(),
            wpm,
            accuracy
        })
    });
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
    let sortValue = score;
    if (mode === 'competitive') {
         sortValue = score; 
    } else if (mode !== 'speed-test') {
         sortValue = (stats.levelReached * 1000) + score; 
    }

    await addDoc(collection(db, "leaderboard"), {
        uid: user.uid,
        username: username,
        score: score,
        title: title,
        stats: stats,
        timestamp: serverTimestamp(),
        mode: mode,
        levelReached: stats.levelReached,
        sortValue: sortValue,
        accuracy: extra?.accuracy || null
    });
};

export const deleteLeaderboardEntry = async (id: string) => {
    try {
        await deleteDoc(doc(db, "leaderboard", id));
        return true;
    } catch { return false; }
};

export const getLeaderboard = async (mode: string = 'competitive'): Promise<LeaderboardEntry[]> => {
    const lbRef = collection(db, "leaderboard");
    
    let q;
    
    if (mode === 'competitive') {
        q = query(
            lbRef, 
            where("mode", "==", mode),
            orderBy("sortValue", "asc"),
            limit(20)
        );
    } else {
        q = query(
            lbRef, 
            where("mode", "==", mode),
            orderBy("sortValue", "desc"),
            limit(20)
        );
    }

    const snapshot = await getDocs(q);
    
    const entries: LeaderboardEntry[] = [];
    const seenUsers = new Set();
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!seenUsers.has(data.uid)) {
            entries.push({ id: doc.id, ...data } as any);
            seenUsers.add(data.uid);
        }
    });

    return entries.slice(0, 10);
};
