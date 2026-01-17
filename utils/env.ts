// Safe environment variable accessor to prevent "process is not defined" crashes
export const getEnv = (key: string): string | undefined => {
  // 1. Try process.env (Standard Node/Webpack/CRA)
  try {
    if (typeof process !== 'undefined' && process.env) {
       return process.env[key];
    }
  } catch (e) {}

  // 2. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       return import.meta.env[key] || import.meta.env[`VITE_${key}`] || import.meta.env[`REACT_APP_${key}`];
    }
  } catch (e) {}
  
  return undefined;
};