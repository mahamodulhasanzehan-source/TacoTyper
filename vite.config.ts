
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Load env vars from .env files
  const envFiles = loadEnv(mode, '.', '');

  // 2. Combine with system env vars (process.env)
  // This ensures variables defined in Vercel project settings are captured
  const combinedEnv = { ...process.env, ...envFiles };

  // 3. Filter and prepare for injection
  const processEnvValues: Record<string, string> = {};
  
  Object.keys(combinedEnv).forEach(key => {
    // We allow VITE_, FIREBASE_, REACT_APP_, and specific keys like API_KEY
    if (
      key.startsWith('VITE_') || 
      key.startsWith('FIREBASE_') || 
      key.startsWith('REACT_APP_') || 
      key === 'API_KEY' ||
      key === 'NODE_ENV'
    ) {
      // JSON.stringify is crucial to ensure values are treated as strings in the code
      processEnvValues[key] = JSON.stringify(combinedEnv[key]);
    }
  });

  // Default NODE_ENV if missing
  if (!processEnvValues['NODE_ENV']) {
      processEnvValues['NODE_ENV'] = JSON.stringify(mode);
  }

  return {
    plugins: [react()],
    define: {
      // This replaces 'process.env' in the client code with the constructed object literal
      'process.env': processEnvValues
    },
    server: {
      host: true,
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    }
  };
});
