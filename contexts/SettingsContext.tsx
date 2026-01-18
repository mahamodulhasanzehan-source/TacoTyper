
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  fastBoot: boolean;
  theme: 'taco' | 'dark' | 'neon';
  neonColor: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isAdmin: boolean;
  setIsAdmin: (status: boolean) => void;
}

const defaultSettings: Settings = {
  fastBoot: false,
  theme: 'taco',
  neonColor: '#00ff00' // Default Neon Green
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  isAdmin: false,
  setIsAdmin: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('taco_app_settings');
      if (stored) {
        // Migration: If loading old settings with reducedMotion, it will just be ignored by the new type
        const parsed = JSON.parse(stored);
        setSettings({ 
            ...defaultSettings, 
            ...parsed,
            // Ensure neonColor exists if upgrading from old version
            neonColor: parsed.neonColor || '#00ff00' 
        });
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('taco_app_settings', JSON.stringify(settings));

    // Reset Classes
    document.body.classList.remove('theme-dark', 'theme-neon');
    document.documentElement.style.removeProperty('--color-neon');

    // Apply Theme
    if (settings.theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else if (settings.theme === 'neon') {
      document.body.classList.add('theme-neon');
      document.documentElement.style.setProperty('--color-neon', settings.neonColor);
    }

  }, [settings, loaded]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isAdmin, setIsAdmin }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
