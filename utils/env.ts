export const getEnv = (key: string): string | undefined => {
  // Safe helper to check global scope
  const getGlobal = () => {
    try { return (window as any); } catch (e) { return {}; }
  };

  const g = getGlobal();

  // 1. Try process.env (Node/Webpack)
  try {
    if (g.process && g.process.env && g.process.env[key]) {
      return g.process.env[key];
    }
  } catch (e) {}

  // 2. Try import.meta.env (Vite)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || import.meta.env[`VITE_${key}`] || import.meta.env[`REACT_APP_${key}`];
    }
  } catch (e) {}

  return undefined;
};