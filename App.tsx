
import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, onAuthStateChanged, getUserProfile, saveUsername } from './services/firebase';
import type { User } from './services/firebase';
import Game from './components/Game';
import { SettingsProvider } from './contexts/SettingsContext';

const getOrCreateGuestUser = (): User => {
  let guestUid = localStorage.getItem('taco_guest_uid');
  if (!guestUid) {
    guestUid = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('taco_guest_uid', guestUid);
  }
  let guestName = localStorage.getItem('taco_guest_name');
  if (!guestName) {
    guestName = 'Guest Chef';
  }
  return {
    uid: guestUid,
    displayName: guestName,
    email: null,
    photoURL: null,
    isAnonymous: true,
  } as User;
};

export default function App() {
  const [user, setUser] = useState<User>(() => getOrCreateGuestUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [customUsername, setCustomUsername] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!mounted) return;
        if (currentUser && !currentUser.isAnonymous) {
          setUser(currentUser);
          const profile = await getUserProfile(currentUser.uid);
          if (profile && profile.username) {
            setCustomUsername(profile.username);
          }
        } else {
          setUser(getOrCreateGuestUser());
        }
        setAuthChecked(true);
      }, (error) => {
        console.warn("Auth state notice:", error);
        if (mounted) {
          setUser(getOrCreateGuestUser());
          setAuthChecked(true);
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (e) {
      console.warn("Auth initialization notice:", e);
      if (mounted) {
        setUser(getOrCreateGuestUser());
        setAuthChecked(true);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        const profile = await getUserProfile(loggedUser.uid);
        if (profile && profile.username) {
          setCustomUsername(profile.username);
        } else {
          setNewDisplayName(loggedUser.displayName || '');
          setShowNamePrompt(true);
        }
      }
    } catch (error: any) {
      console.warn("Sign-in notice:", error?.message || error);
    }
  };

  const handleSaveDisplayName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newDisplayName.trim();
    if (!cleanName || !user) return;

    if (!user.isAnonymous) {
      await saveUsername(user.uid, cleanName);
    } else {
      localStorage.setItem('taco_guest_name', cleanName);
    }
    setCustomUsername(cleanName);
    setShowNamePrompt(false);
  };

  const handleLogout = async () => {
    await logout();
    setCustomUsername(null);
    setUser(getOrCreateGuestUser());
  };

  if (!authChecked) {
    return <div className="w-full h-screen bg-black" />;
  }

  return (
    <SettingsProvider>
      <Game 
        user={user} 
        customUsername={customUsername}
        onUpdateUsername={(name: string) => setCustomUsername(name)}
        onLogout={handleLogout} 
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* Post-Google Authentication Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-neutral-900 border-2 border-amber-400/60 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl text-white">
            <h2 className="text-xl md:text-2xl font-bold text-amber-400 mb-2">Welcome, Chef! 🌮</h2>
            <p className="text-neutral-400 text-sm mb-6">
              Choose your public display name for chat and leaderboards:
            </p>
            <form onSubmit={handleSaveDisplayName} className="flex flex-col gap-4">
              <input 
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Enter chef name..."
                maxLength={20}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={!newDisplayName.trim()}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Name
                </button>
                <button
                  type="button"
                  onClick={() => setShowNamePrompt(false)}
                  className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsProvider>
  );
}

