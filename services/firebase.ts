
import { LeaderboardEntry, SessionStats } from '../types';

// Re-export User type for other components
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  photoURL?: string | null;
}

export interface UserProfile {
    username: string;
    friends: string[]; // List of UIDs
    friendRequests: FriendRequest[];
    gamesHistory?: any[];
    speedTestHistory?: any[];
    maxWPM?: number;
}

export interface FriendRequest {
    from: string; // UID
    fromName: string;
    status: 'pending' | 'accepted' | 'rejected';
    timestamp: number;
}

// Mock Auth State
const STORAGE_KEY_USER = 'taco_app_user';
const STORAGE_KEY_LEADERBOARD = 'taco_app_leaderboard';
const STORAGE_KEY_USERS_DATA = 'taco_app_users_data';

// Stub auth object to satisfy function signatures requiring it
export const auth = {
    currentUser: null as User | null
};

// Check local storage for initial user
try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
        auth.currentUser = JSON.parse(stored);
    }
} catch (e) {}

export const onAuthStateChanged = (
    _authObj: any, 
    nextOrObserver: (user: User | null) => void, 
    _error?: (error: any) => void,
    _completed?: () => void
) => {
    // Immediate callback with current state
    nextOrObserver(auth.currentUser);
    
    // Listen for storage changes (cross-tab logout)
    const listener = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY_USER) {
            if (event.newValue) {
                auth.currentUser = JSON.parse(event.newValue);
                nextOrObserver(auth.currentUser);
            } else {
                auth.currentUser = null;
                nextOrObserver(null);
            }
        }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
};

// Helper to get DB
const getUsersDB = (): Record<string, UserProfile> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS_DATA) || '{}');
    } catch { return {}; }
};

const saveUsersDB = (data: Record<string, UserProfile>) => {
    localStorage.setItem(STORAGE_KEY_USERS_DATA, JSON.stringify(data));
};

export const signInWithGoogle = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate a new mock user
    const randomId = Math.floor(Math.random() * 1000);
    const mockUser: User = {
        uid: 'user_' + Math.random().toString(36).substr(2, 9),
        displayName: 'Chef ' + randomId, 
        email: `chef${randomId}@example.com`,
        emailVerified: true,
        isAnonymous: false,
        photoURL: null
    };
    
    // Register user in Mock DB
    // Initialize with EMPTY username to force the "Identify Yourself" screen on first login
    const users = getUsersDB();
    if (!users[mockUser.uid]) {
        users[mockUser.uid] = {
            username: '', // Empty triggers setup screen
            friends: [],
            friendRequests: []
        };
        saveUsersDB(users);
    }

    auth.currentUser = mockUser;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser));
    
    // Force reload to update app state if listener doesn't catch same-window storage event
    window.location.reload(); 
};

export const logout = async () => {
    auth.currentUser = null;
    localStorage.removeItem(STORAGE_KEY_USER);
    window.location.reload();
};

// --- DB Helpers ---

const getDB = (key: string) => {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
};

const saveDB = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- User Profile ---

export const getUserProfile = async (uid: string) => {
    const users = getUsersDB();
    return users[uid] || null;
};

export const saveUsername = async (uid: string, username: string) => {
    const users = getUsersDB();
    if (!users[uid]) {
        users[uid] = {
            username: username,
            friends: [],
            friendRequests: []
        };
    } else {
        users[uid].username = username;
    }
    saveUsersDB(users);
};

// --- Friend System ---

export const searchUsers = async (query: string, currentUid: string): Promise<{uid: string, username: string, isFriend: boolean, hasPending: boolean}[]> => {
    if (!query || query.trim().length === 0) return [];
    
    const users = getUsersDB();
    const currentUser = users[currentUid];
    const results = [];
    
    const lowerQuery = query.toLowerCase().trim();

    for (const [uid, profile] of Object.entries(users)) {
        if (uid === currentUid) continue; // Don't show self
        if (!profile.username) continue; // Skip users without a name
        
        // Match logic: includes search
        if (profile.username.toLowerCase().includes(lowerQuery)) {
            // Check relationship
            const isFriend = currentUser?.friends.includes(uid) || false;
            // Check if THEY sent US a request
            const hasIncoming = currentUser?.friendRequests.some(r => r.from === uid && r.status === 'pending') || false;

            results.push({
                uid,
                username: profile.username,
                isFriend,
                hasPending: hasIncoming
            });
        }
    }
    return results;
};

export const sendFriendRequest = async (fromUid: string, toUid: string) => {
    const users = getUsersDB();
    const targetUser = users[toUid];
    const senderUser = users[fromUid];

    if (!targetUser || !senderUser) return false;

    // Check if already friends
    if (targetUser.friends.includes(fromUid)) return false;

    // Check if request already exists
    if (targetUser.friendRequests.some(r => r.from === fromUid && r.status === 'pending')) return false;

    targetUser.friendRequests.push({
        from: fromUid,
        fromName: senderUser.username,
        status: 'pending',
        timestamp: Date.now()
    });

    saveUsersDB(users);
    return true;
};

export const acceptFriendRequest = async (currentUid: string, fromUid: string) => {
    const users = getUsersDB();
    const currentUser = users[currentUid];
    const senderUser = users[fromUid];

    if (!currentUser || !senderUser) return false;

    // Add to friends lists
    if (!currentUser.friends.includes(fromUid)) currentUser.friends.push(fromUid);
    if (!senderUser.friends.includes(currentUid)) senderUser.friends.push(currentUid);

    // Remove request
    currentUser.friendRequests = currentUser.friendRequests.filter(r => r.from !== fromUid);

    saveUsersDB(users);
    return true;
};

export const getFriendRequests = async (uid: string) => {
    const users = getUsersDB();
    const user = users[uid];
    if (!user) return [];
    return user.friendRequests.filter(r => r.status === 'pending');
};


// --- Stats & Leaderboard ---

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    const users = getUsersDB();
    if (!users[user.uid]) {
         users[user.uid] = { 
             username: user.displayName || 'Chef',
             friends: [],
             friendRequests: []
         };
    }
    
    const u = users[user.uid];
    if (!u.gamesHistory) u.gamesHistory = [];
    
    u.gamesHistory.push({
        date: new Date().toISOString(),
        score,
        mode,
        levelReached: level
    });
    
    saveUsersDB(users);
};

export const saveSpeedTestStats = async (user: User, wpm: number, accuracy: number) => {
    const users = getUsersDB();
    if (!users[user.uid]) {
        users[user.uid] = { 
             username: user.displayName || 'Chef',
             friends: [],
             friendRequests: []
         };
    }
    
    const u = users[user.uid];
    if (!u.speedTestHistory) u.speedTestHistory = [];
    
    u.speedTestHistory.push({
        date: new Date().toISOString(),
        wpm,
        accuracy
    });
    // Track max WPM
    if (!u.maxWPM || wpm > u.maxWPM) u.maxWPM = wpm;
    
    saveUsersDB(users);
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
    let leaderboard = getDB(STORAGE_KEY_LEADERBOARD) as LeaderboardEntry[];
    
    // Sort Value Logic
    let sortValue = score;
    if (mode === 'competitive') {
         sortValue = 1000000 - score; 
    } else if (mode !== 'speed-test') {
         sortValue = (stats.levelReached * 1000) + score; 
    }

    const newEntry: any = {
        id: Math.random().toString(36).substr(2, 9),
        uid: user.uid,
        username: username,
        score: score,
        title: title,
        stats: stats,
        timestamp: Date.now(),
        mode: mode,
        levelReached: stats.levelReached,
        sortValue: sortValue
    };

    if (extra?.accuracy !== undefined) {
        newEntry.accuracy = extra.accuracy;
    }

    leaderboard.push(newEntry);
    saveDB(STORAGE_KEY_LEADERBOARD, leaderboard);
};

export const deleteLeaderboardEntry = async (id: string) => {
    let leaderboard = getDB(STORAGE_KEY_LEADERBOARD) as LeaderboardEntry[];
    leaderboard = leaderboard.filter(e => e.id !== id);
    saveDB(STORAGE_KEY_LEADERBOARD, leaderboard);
    return true;
};

export const getLeaderboard = async (mode: string = 'competitive'): Promise<LeaderboardEntry[]> => {
    let leaderboard = getDB(STORAGE_KEY_LEADERBOARD) as any[];
    
    // Filter by mode
    let entries = leaderboard.filter(e => e.mode === mode);

    // Sort
    entries.sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));

    // Limit per user (max 3)
    const userCounts: Record<string, number> = {};
    const filtered: LeaderboardEntry[] = [];
    
    for (const entry of entries) {
        const uid = entry.uid;
        if (!userCounts[uid]) userCounts[uid] = 0;
        if (userCounts[uid] < 3) {
            userCounts[uid]++;
            filtered.push(entry);
        }
    }

    return filtered.slice(0, 10);
};
