
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

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
  limit,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { LeaderboardEntry, SessionStats, GlobalGameStats } from '../types';

// --- Configuration ---

const cleanEnv = (val: string | undefined | null) => {
    if (!val) return '';
    return val.replace(/^['"]|['"]$/g, '').trim();
};

const getEnv = (key: string): string => {
    let val = '';
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const env = (import.meta as any).env;
        val = env[`VITE_${key}`] || env[`FIREBASE_${key}`] || env[key] || '';
    }
    if (!val && typeof process !== 'undefined' && process.env) {
        val = process.env[`VITE_${key}`] || process.env[`FIREBASE_${key}`] || process.env[key] || '';
    }
    return cleanEnv(val);
};

const apiKey = getEnv('FIREBASE_API_KEY') || 'AIzaSyBllwH83gpDoLAeo_XnnMDu4mmWVzBJOkA';
const authDomain = getEnv('FIREBASE_AUTH_DOMAIN') || 'tacotyper.firebaseapp.com';
const projectId = getEnv('FIREBASE_PROJECT_ID') || 'tacotyper';
const storageBucket = getEnv('FIREBASE_STORAGE_BUCKET') || 'tacotyper.firebasestorage.app';
const messagingSenderId = getEnv('FIREBASE_MESSAGING_SENDER_ID') || '781290974991';
const appId = getEnv('FIREBASE_APP_ID') || '1:781290974991:web:eb9fd32f2a8e1a14a5187a';

export const isFirebaseConfigured = Boolean(apiKey && apiKey.length > 5 && projectId);

let app: any = null;
let authExport: any = null;
let dbExport: any = null;
let storageExport: any = null;

if (isFirebaseConfigured) {
    try {
        const firebaseConfig = {
            apiKey,
            authDomain,
            projectId,
            storageBucket,
            messagingSenderId,
            appId
        };
        app = initializeApp(firebaseConfig);
        authExport = getAuth(app);
        dbExport = getFirestore(app);
        storageExport = getStorage(app);
    } catch (e) {
        console.warn("Firebase initialization failed:", e);
        app = null;
        authExport = null;
        dbExport = null;
        storageExport = null;
    }
}

export const isFirebaseReady = () => Boolean(authExport && dbExport);
export const auth = authExport;
export const db = dbExport;
export const storage = storageExport;

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
    lastChatPartner?: string; // ID of the last person chatted with
}

export interface FriendRequest {
    id?: string;
    from: string; // UID
    fromName: string;
    to: string; // UID
    status: 'pending' | 'accepted' | 'rejected';
    timestamp: any;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId?: string; // Optional if channel based
    channelId?: string;  // For group/global chats
    text: string;
    audioURL?: string; // Optional audio URL
    timestamp: any;
    read: boolean;
    senderName?: string; // Useful for global chat
}

// --- Auth Functions ---

export const onAuthStateChanged = (
    _authObj: any, 
    nextOrObserver: (user: User | null) => void, 
    _error?: (error: any) => void
) => {
    if (!authExport) {
        const savedGuest = localStorage.getItem('taco_guest_user');
        if (savedGuest) {
            try {
                const parsed = JSON.parse(savedGuest);
                nextOrObserver(parsed);
                return () => {};
            } catch {
                localStorage.removeItem('taco_guest_user');
            }
        }
        nextOrObserver(null);
        return () => {};
    }
    return firebaseOnAuthStateChanged(authExport, nextOrObserver, _error);
};

export const signInAsGuest = async (guestName: string = 'Chef Guest'): Promise<User> => {
    const guestUser: any = {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: guestName,
        email: null,
        photoURL: null,
        isAnonymous: true
    };
    localStorage.setItem('taco_guest_user', JSON.stringify(guestUser));
    return guestUser as User;
};

export const signInWithGoogle = async () => {
    if (!authExport || !isFirebaseConfigured) {
        throw new Error("Firebase Auth is not configured. Please set your Firebase API keys in environment settings, or play as Guest.");
    }
    const provider = new GoogleAuthProvider();
    try {
        const originalOpen = window.open;
        let result;
        try {
            // Intercept window.open so the browser creates a new Chrome tab rather than a separate popup window
            window.open = function(url?: string | URL, target?: string, features?: string) {
                return originalOpen.call(window, url, target || '_blank');
            };
            result = await signInWithPopup(authExport, provider);
        } finally {
            window.open = originalOpen;
        }

        const user = result.user;

        if (dbExport) {
            // Sync Auth to Firestore
            const userRef = doc(dbExport, "users", user.uid);
            const userSnap = await getDoc(userRef);

            const timestamp = serverTimestamp();

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    displayName: user.displayName || '',
                    username: '', 
                    usernameLower: '',
                    email: user.email,
                    photoURL: user.photoURL,
                    friends: [],
                    createdAt: timestamp,
                    lastLogin: timestamp
                });
            } else {
                await updateDoc(userRef, {
                    uid: user.uid,
                    displayName: user.displayName || '',
                    email: user.email,
                    photoURL: user.photoURL,
                    lastLogin: timestamp
                });
            }
        }
        return user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logout = async () => {
    localStorage.removeItem('taco_guest_user');
    if (authExport) {
        try {
            await signOut(authExport);
        } catch (e) {
            console.error("Error signing out:", e);
        }
    }
    window.location.reload();
};

// --- User Profile ---

const getLocalUserProfile = (uid: string): UserProfile | null => {
    const local = localStorage.getItem(`profile_${uid}`);
    if (local) {
        try { return JSON.parse(local); } catch { return null; }
    }
    return null;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!dbExport || uid.startsWith('guest_')) {
        return getLocalUserProfile(uid);
    }
    try {
        const userRef = doc(dbExport, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return snap.data() as UserProfile;
        }
        return getLocalUserProfile(uid);
    } catch (e: any) {
        // Fall back gracefully to local storage on missing permissions or offline
        return getLocalUserProfile(uid);
    }
};

export const saveUsername = async (uid: string, username: string) => {
    // Always persist to local storage first for offline & guest resilience
    const existing = localStorage.getItem(`profile_${uid}`);
    let parsed: any = {};
    if (existing) { try { parsed = JSON.parse(existing); } catch {} }
    parsed.username = username;
    parsed.usernameLower = username.toLowerCase();
    localStorage.setItem(`profile_${uid}`, JSON.stringify(parsed));

    if (uid.startsWith('guest_')) {
        try {
            const guestStr = localStorage.getItem('taco_guest_user');
            if (guestStr) {
                const guestObj = JSON.parse(guestStr);
                guestObj.displayName = username;
                localStorage.setItem('taco_guest_user', JSON.stringify(guestObj));
            }
        } catch {}
        return;
    }

    if (!dbExport) return;
    try {
        const userRef = doc(dbExport, "users", uid);
        await setDoc(userRef, {
            username: username,
            usernameLower: username.toLowerCase()
        }, { merge: true });
    } catch (e: any) {
        console.warn("Could not save username to Firestore (saved locally):", e?.message || e);
    }
};

// --- Friend System ---

export const fetchActiveUsers = async (currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean, photoURL?: string}[]> => {
    if (!dbExport) return [];
    try {
        const currentUserRef = doc(dbExport, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.exists() ? (currentUserSnap.data() as UserProfile) : null;
        const myFriends = currentUserData?.friends || [];

        const usersRef = collection(dbExport, "users");
        const q = query(usersRef, orderBy("lastLogin", "desc"), limit(100));
        
        const querySnapshot = await getDocs(q);
        const results: any[] = [];

        querySnapshot.forEach((d) => {
            const uid = d.id;
            if (uid === currentUid) return;

            const data = d.data();
            const display = data.username || data.displayName || "Unknown Chef";

            if (display) {
                results.push({
                    uid,
                    username: display,
                    photoURL: data.photoURL,
                    isFriend: myFriends.includes(uid),
                    hasPending: false 
                });
            }
        });

        return results;
    } catch {
        // Silently fall back for guest users or missing permissions
        return [];
    }
};

export const searchUsers = async (searchTerm: string, currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]> => {
    if (!searchTerm || searchTerm.trim().length === 0 || !dbExport) return [];
    
    const lowerTerm = searchTerm.toLowerCase().trim();
    const results: any[] = [];
    
    try {
        const currentUserRef = doc(dbExport, "users", currentUid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data() as UserProfile;
        const myFriends = currentUserData?.friends || [];

        const usersRef = collection(dbExport, "users");
        const q = query(
            usersRef, 
            where("usernameLower", ">=", lowerTerm),
            where("usernameLower", "<=", lowerTerm + '\uf8ff'),
            limit(10)
        );

        const querySnapshot = await getDocs(q);

        for (const d of querySnapshot.docs) {
            const uid = d.id;
            if (uid === currentUid) continue; 

            const data = d.data();
            if (!data.username) continue; 

            const isFriend = myFriends.includes(uid);
            
            results.push({
                uid,
                username: data.username,
                isFriend,
                hasPending: false
            });
        }
    } catch (e) {
        console.error("Error searching users", e);
    }

    return results;
};

export const sendFriendRequest = async (fromUid: string, toUid: string) => {
    if (!dbExport) return false;
    try {
        const senderProfile = await getUserProfile(fromUid);
        if (!senderProfile) return false;

        const requestsRef = collection(dbExport, "requests");
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
    if (!dbExport) return [];
    try {
        const requestsRef = collection(dbExport, "requests");
        const q = query(
            requestsRef,
            where("to", "==", uid),
            where("status", "==", "pending")
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as FriendRequest[];
    } catch {
        return [];
    }
};

export const acceptFriendRequest = async (currentUid: string, fromUid: string) => {
    if (!dbExport) return false;
    try {
        const meRef = doc(dbExport, "users", currentUid);
        const themRef = doc(dbExport, "users", fromUid);

        await updateDoc(meRef, { friends: arrayUnion(fromUid) });
        await updateDoc(themRef, { friends: arrayUnion(currentUid) });

        const requestsRef = collection(dbExport, "requests");
        const q = query(
            requestsRef, 
            where("from", "==", fromUid), 
            where("to", "==", currentUid),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(dbExport, "requests", docSnap.id));
        }

        return true;
    } catch (e) {
        console.error("Error accepting friend", e);
        return false;
    }
};

// --- Stats & Leaderboard (Firestore Implementation) ---

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    if (!dbExport || !user || !user.uid || user.uid.startsWith('guest_')) return;
    try {
        const userRef = doc(dbExport, "users", user.uid);
        await updateDoc(userRef, {
            gamesHistory: arrayUnion({
                date: new Date().toISOString(),
                score,
                mode,
                levelReached: level
            })
        });
    } catch (e) {
        // Silently skip if offline or insufficient permissions
    }
};

export const saveSpeedTestStats = async (user: User, wpm: number, accuracy: number) => {
    if (!dbExport || !user || !user.uid || user.uid.startsWith('guest_')) return;
    try {
        const userRef = doc(dbExport, "users", user.uid);
        await updateDoc(userRef, {
            speedTestHistory: arrayUnion({
                date: new Date().toISOString(),
                wpm,
                accuracy
            })
        });
    } catch (e) {
        // Silently skip if offline or insufficient permissions
    }
};

// --- Global Stats Tracking ---

export const incrementGamePlays = async (gameKey: 'taco_typer' | 'iq_test' | 'minesweeper' | 'wordle' | 'angle' | 'spelling_bee' | 'tic_tac_toe' | 'connect_4' | 'gun_game' | 'color_memory' | 'particle_physics' | 'more_less' | 'fruit_merge' | 'checkers' | 'dots_and_boxes' | 'snake' | 'brick_breaker' | 'flappy_flyer' | 'game_2048' | 'ultimate_tictactoe' | 'simon' | 'quick_draw' | 'finger_sumo' | 'pong' | 'knife_flip' | 'reversi' | 'battleship' | 'nim' | 'tower_stacker' | 'tetris' | string) => {
    const key = `play_count_${gameKey}`;
    const curr = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(curr + 1));

    if (!dbExport) return;
    const statsRef = doc(dbExport, "system", "global_stats");
    const field = `${gameKey}_plays`;
    
    try {
        await updateDoc(statsRef, {
            [field]: increment(1)
        });
    } catch (e: any) {
        if (e.code === 'not-found') {
             await setDoc(statsRef, {
                 [field]: 1
             }, { merge: true });
        }
    }
};

export const getGlobalGameStats = async (): Promise<GlobalGameStats> => {
    const fallback: GlobalGameStats = {
        taco_typer_plays: parseInt(localStorage.getItem('play_count_taco_typer') || '0', 10),
        iq_test_plays: parseInt(localStorage.getItem('play_count_iq_test') || '0', 10),
        minesweeper_plays: parseInt(localStorage.getItem('play_count_minesweeper') || '0', 10),
        wordle_plays: parseInt(localStorage.getItem('play_count_wordle') || '0', 10),
        angle_plays: parseInt(localStorage.getItem('play_count_angle') || '0', 10),
        spelling_bee_plays: parseInt(localStorage.getItem('play_count_spelling_bee') || '0', 10),
        tic_tac_toe_plays: parseInt(localStorage.getItem('play_count_tic_tac_toe') || '0', 10),
        connect_4_plays: parseInt(localStorage.getItem('play_count_connect_4') || '0', 10),
        gun_game_plays: parseInt(localStorage.getItem('play_count_gun_game') || '0', 10),
        color_memory_plays: parseInt(localStorage.getItem('play_count_color_memory') || '0', 10),
        particle_physics_plays: parseInt(localStorage.getItem('play_count_particle_physics') || '0', 10),
        fruit_merge_plays: parseInt(localStorage.getItem('play_count_fruit_merge') || '0', 10),
        checkers_plays: parseInt(localStorage.getItem('play_count_checkers') || '0', 10),
        dots_and_boxes_plays: parseInt(localStorage.getItem('play_count_dots_and_boxes') || '0', 10),
        snake_plays: parseInt(localStorage.getItem('play_count_snake') || '0', 10),
        brick_breaker_plays: parseInt(localStorage.getItem('play_count_brick_breaker') || '0', 10),
        game_2048_plays: parseInt(localStorage.getItem('play_count_game_2048') || '0', 10),
        ultimate_tictactoe_plays: parseInt(localStorage.getItem('play_count_ultimate_tictactoe') || '0', 10),
        simon_plays: parseInt(localStorage.getItem('play_count_simon') || '0', 10),
        quick_draw_plays: parseInt(localStorage.getItem('play_count_quick_draw') || '0', 10),
        finger_sumo_plays: parseInt(localStorage.getItem('play_count_finger_sumo') || '0', 10),
        pong_plays: parseInt(localStorage.getItem('play_count_pong') || '0', 10),
        knife_flip_plays: parseInt(localStorage.getItem('play_count_knife_flip') || '0', 10),
        reversi_plays: parseInt(localStorage.getItem('play_count_reversi') || '0', 10),
        battleship_plays: parseInt(localStorage.getItem('play_count_battleship') || '0', 10),
        nim_plays: parseInt(localStorage.getItem('play_count_nim') || '0', 10),
        tower_stacker_plays: parseInt(localStorage.getItem('play_count_tower_stacker') || '0', 10),
        tetris_plays: parseInt(localStorage.getItem('play_count_tetris') || '0', 10)
    };
    if (!dbExport) return fallback;
    try {
        const statsRef = doc(dbExport, "system", "global_stats");
        const snap = await getDoc(statsRef);
        if (snap.exists()) {
            return snap.data() as GlobalGameStats;
        }
        return fallback;
    } catch {
        return fallback;
    }
};

export const resetGlobalGameStats = async () => {
    const keys = ['taco_typer', 'iq_test', 'minesweeper', 'wordle', 'angle', 'spelling_bee', 'tic_tac_toe', 'connect_4', 'gun_game', 'color_memory', 'particle_physics', 'more_less'];
    keys.forEach(k => localStorage.setItem(`play_count_${k}`, '0'));

    if (!dbExport) return true;
    const statsRef = doc(dbExport, "system", "global_stats");
    try {
        await setDoc(statsRef, {
            taco_typer_plays: 0,
            iq_test_plays: 0,
            minesweeper_plays: 0,
            wordle_plays: 0,
            angle_plays: 0,
            spelling_bee_plays: 0,
            tic_tac_toe_plays: 0,
            connect_4_plays: 0,
            gun_game_plays: 0,
            color_memory_plays: 0,
            particle_physics_plays: 0,
            more_less_plays: 0
        });
        return true;
    } catch {
        return false;
    }
};

// --- Leaderboard ---

export const isAscendingMetric = (mode: string): boolean => {
    return (
        mode === 'competitive' ||
        mode.startsWith('minesweeper') ||
        mode.startsWith('ultimate_tictactoe') ||
        mode.startsWith('reversi') ||
        mode.startsWith('checkers') ||
        mode === 'connect_4-time' ||
        mode === 'connect_4' ||
        (mode.startsWith('quick_draw') && mode.endsWith('-time'))
    );
};

// Helper to identify guest player
export const isGuestPlayer = (uid?: string | null, username?: string | null): boolean => {
    if (!uid && !username) return true;
    if (uid && (uid.startsWith('guest_') || uid.startsWith('guest#') || uid === 'guest')) return true;
    if (username) {
        const lower = username.toLowerCase().trim();
        if (lower.startsWith('guest#') || lower.startsWith('guest_') || lower.startsWith('chef guest') || lower === 'guest' || lower === 'guest chef' || lower === 'player') {
            return true;
        }
    }
    return false;
};

// Helper to track unique user or guest number
export const getUserTrackingKey = (uid?: string | null, username?: string | null): string => {
    if (username && username.toLowerCase().trim().startsWith('guest#')) {
        return username.toLowerCase().trim();
    }
    if (uid) return uid.toLowerCase().trim();
    if (username) return username.toLowerCase().trim();
    return 'unknown_player';
};

// Filter entries so that signed-in users have at most 3 entries and specific guests have at most 1 entry
export const filterLeaderboardEntries = (entries: LeaderboardEntry[], isTimeBased: boolean, maxListLimit: number = 25): LeaderboardEntry[] => {
    // Sort all candidate entries by best score/time first
    const sorted = [...entries].sort((a, b) => {
        const valA = a.sortValue ?? (isTimeBased ? Infinity : -Infinity);
        const valB = b.sortValue ?? (isTimeBased ? Infinity : -Infinity);
        return isTimeBased ? valA - valB : valB - valA;
    });

    const userCounts = new Map<string, number>();
    const filtered: LeaderboardEntry[] = [];

    for (const entry of sorted) {
        const isGuest = isGuestPlayer(entry.uid, entry.username);
        const maxAllowed = isGuest ? 1 : 3;
        const key = getUserTrackingKey(entry.uid, entry.username);
        const count = userCounts.get(key) || 0;

        if (count < maxAllowed) {
            filtered.push(entry);
            userCounts.set(key, count + 1);
            if (filtered.length >= maxListLimit) {
                break;
            }
        }
    }

    return filtered;
};

export const saveLeaderboardScore = async (
    user: User, 
    username: string, 
    score: number, 
    title: string, 
    stats: SessionStats, 
    mode: string,
    extra?: { accuracy?: number }
) => {
    const isTimeBased = isAscendingMetric(mode);
    let sortValue = score;
    
    if (isTimeBased) {
        sortValue = score; 
    } else if (mode === 'standard' || mode === 'infinite' || mode === 'universal') {
        sortValue = ((stats.levelReached || 1) * 1000) + score; 
    } else {
        sortValue = score;
    }

    const safeUid = user?.uid || localStorage.getItem('taco_guest_uid') || 'guest_' + Math.random().toString(36).substring(2, 9);
    const safeUsername = username || user?.displayName || localStorage.getItem('taco_guest_name') || 'Player';
    const isGuest = isGuestPlayer(safeUid, safeUsername) || user?.isAnonymous;
    const maxAllowedForUser = isGuest ? 1 : 3;

    // 1. Immediately cache locally with user limits so plays always appear immediately
    try {
        const localLB: LeaderboardEntry[] = JSON.parse(localStorage.getItem(`lb_${mode}`) || '[]');
        const newEntry: LeaderboardEntry = {
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            uid: safeUid,
            username: safeUsername,
            score: score,
            title: title,
            stats: stats,
            timestamp: Date.now(),
            mode: mode,
            levelReached: stats.levelReached,
            sortValue: sortValue,
            accuracy: extra?.accuracy || null
        };

        localLB.push(newEntry);
        const filtered = filterLeaderboardEntries(localLB, isTimeBased, 25);
        localStorage.setItem(`lb_${mode}`, JSON.stringify(filtered));
    } catch (err) {
        console.warn("Local leaderboard update warning:", err);
    }

    // Trigger immediate UI refresh for any mounted LeaderboardWidget
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('leaderboard_updated', { detail: { mode } }));
    }

    if (!dbExport) return;

    // 2. Persist to Firestore in an isolated try-catch
    try {
        await addDoc(collection(dbExport, "leaderboard"), {
            uid: safeUid,
            username: safeUsername,
            score: score,
            title: title,
            stats: stats,
            timestamp: serverTimestamp(),
            mode: mode,
            levelReached: stats.levelReached,
            sortValue: sortValue,
            accuracy: extra?.accuracy || null
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('leaderboard_updated', { detail: { mode } }));
        }
    } catch (e) {
        console.warn("Firestore save score warning (playing in guest/local mode):", e);
    }

    // 3. Clean up excess user records in Firestore: max 3 for signed-in, max 1 for guest
    try {
        const lbRef = collection(dbExport, "leaderboard");
        const q = query(
            lbRef,
            where("uid", "==", safeUid),
            where("mode", "==", mode)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.docs.length > maxAllowedForUser) {
            const docs = [...snapshot.docs];
            docs.sort((a, b) => {
                const valA = a.data().sortValue ?? (isTimeBased ? Infinity : -Infinity);
                const valB = b.data().sortValue ?? (isTimeBased ? Infinity : -Infinity);
                return isTimeBased ? valA - valB : valB - valA;
            });
            const docsToDelete = docs.slice(maxAllowedForUser);
            for (const docSnap of docsToDelete) {
                try {
                    await deleteDoc(doc(dbExport, "leaderboard", docSnap.id));
                } catch {}
            }
        }
    } catch (e) {
        // Non-fatal cleanup notice
    }
};

export const deleteLeaderboardEntry = async (id: string) => {
    if (!dbExport) return false;
    try {
        await deleteDoc(doc(dbExport, "leaderboard", id));
        return true;
    } catch { return false; }
};

export const getLocalLeaderboard = (mode: string = 'competitive'): LeaderboardEntry[] => {
    const isTimeBased = isAscendingMetric(mode);
    try {
        const list = JSON.parse(localStorage.getItem(`lb_${mode}`) || '[]');
        return filterLeaderboardEntries(list, isTimeBased, 25);
    } catch {
        return [];
    }
};

export const getLeaderboard = async (mode: string = 'competitive'): Promise<LeaderboardEntry[]> => {
    const isTimeBased = isAscendingMetric(mode);
    const local = getLocalLeaderboard(mode);

    if (!dbExport) return local;

    try {
        const lbRef = collection(dbExport, "leaderboard");
        
        // Single field query by mode: DOES NOT require composite index, executes fast and reliably!
        const fetchPromise = (async () => {
            const q = query(
                lbRef, 
                where("mode", "==", mode),
                limit(100)
            );
            return await getDocs(q);
        })();

        // 10s safety timeout for slow initial connection
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));

        // Background handler: if fetch finishes (even after a delay), update cache & UI
        fetchPromise.then((snapshot) => {
            if (!snapshot || snapshot.empty) return;
            const candidateEntries: LeaderboardEntry[] = [];
            const seenIds = new Set<string>();
            snapshot.forEach(d => {
                const data = d.data() as any;
                const sortVal = data.sortValue !== undefined 
                    ? data.sortValue 
                    : (isTimeBased ? (data.score ?? Infinity) : (data.score ?? -Infinity));
                candidateEntries.push({ id: d.id, ...data, sortValue: sortVal } as LeaderboardEntry);
                seenIds.add(d.id);
            });
            const currentLocal = getLocalLeaderboard(mode);
            currentLocal.forEach(loc => {
                if (!seenIds.has(loc.id)) {
                    candidateEntries.push(loc);
                    seenIds.add(loc.id);
                }
            });
            const filtered = filterLeaderboardEntries(candidateEntries, isTimeBased, 25);
            try {
                localStorage.setItem(`lb_${mode}`, JSON.stringify(filtered));
            } catch {}
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('leaderboard_updated', { detail: { mode, entries: filtered } }));
            }
        }).catch((err) => {
            console.warn("Leaderboard fetch notice:", err);
        });

        const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

        if (!snapshot) {
            return local;
        }

        const candidateEntries: LeaderboardEntry[] = [];
        const seenIds = new Set<string>();
        
        snapshot.forEach(d => {
            const data = d.data() as any;
            const sortVal = data.sortValue !== undefined 
                ? data.sortValue 
                : (isTimeBased ? (data.score ?? Infinity) : (data.score ?? -Infinity));
            candidateEntries.push({ id: d.id, ...data, sortValue: sortVal } as LeaderboardEntry);
            seenIds.add(d.id);
        });

        // Merge with local scores so immediate player scores always show up
        local.forEach(loc => {
            if (!seenIds.has(loc.id)) {
                candidateEntries.push(loc);
                seenIds.add(loc.id);
            }
        });

        const filtered = filterLeaderboardEntries(candidateEntries, isTimeBased, 25);
        try {
            localStorage.setItem(`lb_${mode}`, JSON.stringify(filtered));
        } catch {}
        return filtered;
    } catch (e) {
        console.warn("Notice fetching leaderboard, using local cache:", e);
        return local;
    }
};

// --- Chat System ---

const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const saveLastChatPartner = async (currentUid: string, partnerUid: string) => {
    if (!dbExport) return;
    try {
        const userRef = doc(dbExport, "users", currentUid);
        await updateDoc(userRef, { lastChatPartner: partnerUid });
    } catch (e) {
        console.error("Error saving last chat partner", e);
    }
};

export const uploadVoiceMessage = async (blob: Blob, chatId: string): Promise<string | null> => {
    try {
        if (!storageExport) return null;
        const filename = `voice/${chatId}/${Date.now()}.webm`;
        const storageRef = ref(storageExport, filename);
        const snapshot = await uploadBytes(storageRef, blob);
        return await getDownloadURL(snapshot.ref);
    } catch (e) {
        console.error("Error uploading voice message", e);
        return null;
    }
};

export const sendMessage = async (senderId: string, receiverId: string, content: string, type: 'text' | 'audio' = 'text', audioURL?: string) => {
    if (!content.trim() && type === 'text') return;
    if (!dbExport) return;
    const chatId = getChatId(senderId, receiverId);
    
    try {
        await addDoc(collection(dbExport, "messages"), {
            chatId,
            senderId,
            receiverId,
            text: type === 'text' ? content.trim() : '🎤 Voice Message',
            audioURL: type === 'audio' ? audioURL : null,
            timestamp: serverTimestamp(),
            read: false
        });
    } catch (e) {
        console.error("Error sending message:", e);
    }
};

export const sendChannelMessage = async (senderId: string, channelId: string, content: string, senderName: string) => {
    if (!content.trim() || !dbExport) return;
    
    try {
        await addDoc(collection(dbExport, "messages"), {
            chatId: channelId,
            senderId,
            senderName,
            text: content.trim(),
            timestamp: serverTimestamp(),
            read: true
        });
    } catch (e) {
        console.error("Error sending channel message:", e);
    }
};

export const deleteMessage = async (messageId: string, audioURL?: string) => {
    if (!dbExport) return;
    try {
        if (audioURL && storageExport) {
             const fileRef = ref(storageExport, audioURL);
             await deleteObject(fileRef).catch(err => {
                 if (err.code !== 'storage/object-not-found') console.error("Error deleting audio file:", err);
             });
        }
        await deleteDoc(doc(dbExport, "messages", messageId));
    } catch (e) {
        console.error("Error deleting message:", e);
    }
};

export const subscribeToChat = (currentUid: string, partnerUid: string, callback: (messages: ChatMessage[]) => void) => {
    const chatId = getChatId(currentUid, partnerUid);
    return subscribeToChannel(chatId, callback, currentUid);
};

export const subscribeToChannel = (channelId: string, callback: (messages: ChatMessage[]) => void, currentUid?: string) => {
    if (!dbExport) return () => {};
    const messagesRef = collection(dbExport, "messages");
    
    const q = query(
        messagesRef, 
        where("chatId", "==", channelId)
    );

    return onSnapshot(q, (snapshot) => {
        const msgs: ChatMessage[] = [];

        snapshot.docs.forEach(d => {
            const data = d.data();
            msgs.push({
                id: d.id,
                ...data
            } as ChatMessage);
        });
        
        msgs.sort((a, b) => {
            const getT = (t: any) => t ? (t.toMillis ? t.toMillis() : (t.seconds ? t.seconds * 1000 : Date.now())) : Date.now();
            return getT(a.timestamp) - getT(b.timestamp);
        });

        if (currentUid) {
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data.receiverId === currentUid && !data.read) {
                    updateDoc(d.ref, { read: true });
                }
            });
        }

        const recentMsgs = msgs.length > 50 ? msgs.slice(msgs.length - 50) : msgs;
        callback(recentMsgs);
    }, (error) => {
        console.warn("Could not subscribe to chat stream (check Firestore rules for 'messages'):", error?.message || error);
    });
};

export const subscribeToGlobalUnread = (currentUid: string, currentPartnerId: string | null, callback: (hasUnread: boolean) => void) => {
    if (!dbExport) return () => {};
    const messagesRef = collection(dbExport, "messages");
    
    const q = query(
        messagesRef,
        where("receiverId", "==", currentUid),
        limit(50) 
    );

    return onSnapshot(q, (snapshot) => {
        let hasUnreadFromOthers = false;

        snapshot.docs.forEach(d => {
            const data = d.data();
            if (data.read === false && data.senderId !== currentPartnerId) {
                hasUnreadFromOthers = true;
            }
        });
        
        callback(hasUnreadFromOthers);
    }, () => {
        callback(false);
    });
};

