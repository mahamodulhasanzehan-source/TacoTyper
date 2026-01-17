import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import LoginScreen from './components/LoginScreen';
import Game from './components/Game';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Listen to Auth state
  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthChecked(true);
            setIsLoading(false);
        });
        return () => unsubscribe();
    } else {
        setAuthChecked(true);
    }
  }, []);

  const handleLogin = async () => {
      setIsLoading(true);
      await signInWithGoogle();
      // Auth listener handles the rest
  };

  const handleLogout = async () => {
      await logout();
  };

  // While checking auth status
  if (!authChecked) {
      return (
          <div className="flex w-full h-screen bg-black items-center justify-center">
              <div className="loading-spinner"></div>
          </div>
      );
  }

  // If not logged in, show Login Screen
  if (!user) {
      return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;
  }

  // If logged in, show the Game
  return <Game user={user} onLogout={handleLogout} />;
}