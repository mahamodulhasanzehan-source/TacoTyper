
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
// process.env is polyfilled by vite.config.ts
const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: Firebase API Key is missing. Please check your .env file and ensure VITE_FIREBASE_API_KEY is set.");
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
    return firebaseOnAuthStateChanged(auth, nextOrObserver, _error);
};

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Sync Auth to Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create new profile
            // We set username to empty string to trigger the "Identify Yourself" flow in Game.tsx
            await setDoc(userRef, {
                username: '', 
                usernameLower: '',
                email: user.email,
                photoURL: user.photoURL,
                friends: [],
                createdAt: serverTimestamp()
            });
        } else {
            // Update existing login info just in case photo changed, but don't touch username
            await updateDoc(userRef, {
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logout = async () => {
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

export const searchUsers = async (searchTerm: string, currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]> => {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    
    const lowerTerm = searchTerm.toLowerCase().trim();
    const results: any[] = [];
    
    // 1. Get current user's friends to check status
    const currentUserRef = doc(db, "users", currentUid);
    const currentUserSnap = await getDoc(currentUserRef);
    const currentUserData = currentUserSnap.data() as UserProfile;
    const myFriends = currentUserData?.friends || [];

    // 2. Query Firestore by usernameLower
    // Note: Firestore string search is prefix-based.
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
        if (uid === currentUid) continue; // Skip self

        const data = doc.data();
        if (!data.username) continue; // Skip incomplete profiles

        const isFriend = myFriends.includes(uid);
        
        const hasPending = false; 

        results.push({
            uid,
            username: data.username,
            isFriend,
            hasPending
        });
    }

    return results;
};

export const sendFriendRequest = async (fromUid: string, toUid: string) => {
    try {
        // 1. Get sender details for the notification
        const senderProfile = await getUserProfile(fromUid);
        if (!senderProfile) return false;

        // 2. Check if request already exists
        const requestsRef = collection(db, "requests");
        const q = query(
            requestsRef, 
            where("from", "==", fromUid), 
            where("to", "==", toUid),
            where("status", "==", "pending")
        );
        const existing = await getDocs(q);
        if (!existing.empty) return false; // Already requested

        // 3. Create Request Document
        await addDoc(requestsRef, {
            from: fromUid,
            fromName: senderProfile.username,
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
    // Get requests sent TO me that are PENDING
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
        // 1. Add to both friend lists using arrayUnion (atomic operation)
        const meRef = doc(db, "users", currentUid);
        const themRef = doc(db, "users", fromUid);

        await updateDoc(meRef, { friends: arrayUnion(fromUid) });
        await updateDoc(themRef, { friends: arrayUnion(currentUid) });

        // 2. Find and delete/update the request
        const requestsRef = collection(db, "requests");
        const q = query(
            requestsRef, 
            where("from", "==", fromUid), 
            where("to", "==", currentUid),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        
        // Mark as accepted or delete. Let's delete to keep it clean.
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
    // Sort Value Logic
    let sortValue = score;
    if (mode === 'competitive') {
         // Sort asc for time
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
        // For competitive (time), lower is better. ASC sort.
        q = query(
            lbRef, 
            where("mode", "==", mode),
            orderBy("sortValue", "asc"),
            limit(20)
        );
    } else {
        // For others (points), higher is better. DESC sort.
        q = query(
            lbRef, 
            where("mode", "==", mode),
            orderBy("sortValue", "desc"),
            limit(20)
        );
    }

    const snapshot = await getDocs(q);
    
    // Logic to only show top score per user (client side filtering for simplicity)
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
