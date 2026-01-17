import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import LoginScreen from './components/LoginScreen';
import Game from './components/Game';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // 1. Safety Timeout: If Firebase hangs, force show login screen after 2 seconds
      const safetyTimeout = setTimeout(() => {
        if (mounted && !authChecked) {
          console.warn("Auth check timed out. Forcing login screen.");
          setAuthChecked(true);
          setIsLoading(false);
        }
      }, 2000);

      // 2. Check Firebase
      if (auth) {
        try {
            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                if (mounted) {
                    clearTimeout(safetyTimeout);
                    setUser(currentUser);
                    setAuthChecked(true);
                    setIsLoading(false);
                }
            }, (error) => {
                console.error("Auth Error:", error);
                if (mounted) {
                    clearTimeout(safetyTimeout);
                    setAuthChecked(true);
                    setIsLoading(false);
                }
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Auth initialization threw error:", e);
            if (mounted) {
                clearTimeout(safetyTimeout);
                setAuthChecked(true);
                setIsLoading(false);
            }
        }
      } else {
        // Firebase not configured or failed to init
        console.warn("Auth service not available.");
        if (mounted) {
            clearTimeout(safetyTimeout);
            setAuthChecked(true);
            setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
      setIsLoading(true);
      if (!auth) {
          alert("Login Service Unavailable. Please check configuration.");
          setIsLoading(false);
          return;
      }
      try {
        await signInWithGoogle();
        // Listener updates state
      } catch (error) {
        console.error("Login failed", error);
        alert("Login failed. See console.");
        setIsLoading(false);
      }
  };

  const handleLogout = async () => {
      await logout();
      setUser(null);
  };

  // Render Logic
  if (isLoading) {
      return (
          <div className="flex w-full h-screen bg-black items-center justify-center text-white flex-col gap-4">
              <div className="loading-spinner"></div>
              <div className="text-xs text-gray-500">Loading Kitchen...</div>
          </div>
      );
  }

  if (!user) {
      return <LoginScreen onLogin={handleLogin} isLoading={false} />;
  }

  return <Game user={user} onLogout={handleLogout} />;
}