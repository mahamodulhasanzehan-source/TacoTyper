
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the app logic that relies on it
      // CRITICAL: We JSON.stringify values so they are injected as strings, not identifiers.
      
      // Ensure API_KEY is available for Google GenAI SDK, checking both naming conventions
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      
      // Polyfill the rest of process.env object
      'process.env': {
         NODE_ENV: JSON.stringify(mode),
         ...Object.keys(env).reduce((acc: any, key) => {
            acc[key] = JSON.stringify(env[key]);
            return acc;
         }, {})
      }
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
