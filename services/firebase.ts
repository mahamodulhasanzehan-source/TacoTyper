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

export const signInWithGoogle = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser: User = {
        uid: 'user_' + Math.random().toString(36).substr(2, 9),
        displayName: 'Chef ' + Math.floor(Math.random() * 1000),
        email: 'chef@example.com',
        emailVerified: true,
        isAnonymous: false,
        photoURL: null
    };
    
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

const getUsersDB = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS_DATA) || '{}');
    } catch { return {}; }
};

const saveUsersDB = (data: any) => {
    localStorage.setItem(STORAGE_KEY_USERS_DATA, JSON.stringify(data));
};

// --- User Profile ---

export const getUserProfile = async (uid: string) => {
    const users = getUsersDB();
    return users[uid] || null;
};

export const saveUsername = async (uid: string, username: string) => {
    const users = getUsersDB();
    if (!users[uid]) users[uid] = {};
    users[uid].username = username;
    saveUsersDB(users);
};

export const saveGameStats = async (user: User, score: number, mode: string, level: number) => {
    const users = getUsersDB();
    if (!users[user.uid]) users[user.uid] = {};
    
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
    if (!users[user.uid]) users[user.uid] = {};
    
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