
import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, onAuthStateChanged } from './services/firebase';
import type { User } from './services/firebase';
import LoginScreen from './components/LoginScreen';
import Game from './components/Game';
import { SettingsProvider } from './contexts/SettingsContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // 1. Safety Timeout
      const safetyTimeout = setTimeout(() => {
        if (mounted && !authChecked) {
          console.warn("Auth check timed out. Forcing login screen.");
          setAuthChecked(true);
          setIsLoading(false);
        }
      }, 2000);

      // 2. Check Auth
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
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
      setIsLoading(true);
      try {
        await signInWithGoogle();
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

  if (isLoading) {
      return (
          <div className="flex w-full h-screen bg-black items-center justify-center text-white flex-col gap-4">
              <div className="loading-spinner"></div>
              <div className="text-xs text-gray-500">Loading Kitchen...</div>
          </div>
      );
  }

  return (
    <SettingsProvider>
      {!user ? (
        <LoginScreen onLogin={handleLogin} isLoading={false} />
      ) : (
        <Game user={user} onLogout={handleLogout} />
      )}
    </SettingsProvider>
  );
}
