
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  reducedMotion: boolean; // Renamed from fastBoot
  theme: 'taco' | 'dark' | 'neon';
  neonColor: string;
  animDuration: number; // 0 to 6 seconds
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isAdmin: boolean;
  setIsAdmin: (status: boolean) => void;
}

const defaultSettings: Settings = {
  reducedMotion: false,
  theme: 'taco',
  neonColor: '#00ff00', // Default Neon Green
  animDuration: 1 // Default 1 second
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
        const parsed = JSON.parse(stored);
        
        // MIGRATION LOGIC:
        // If the user had 'fastBoot' enabled previously, map it to 'reducedMotion'
        let isReduced = parsed.reducedMotion;
        if (parsed.fastBoot !== undefined && isReduced === undefined) {
            isReduced = parsed.fastBoot;
        }

        setSettings({ 
            ...defaultSettings, 
            ...parsed,
            reducedMotion: !!isReduced, // Ensure boolean
            neonColor: parsed.neonColor || '#00ff00',
            animDuration: parsed.animDuration !== undefined ? parsed.animDuration : 1
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

    // Apply Animation Duration
    document.documentElement.style.setProperty('--anim-duration', `${settings.animDuration}s`);

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
