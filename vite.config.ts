import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid TS error about cwd() not existing on Process interface in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the app logic that relies on it
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // We can also provide a fallback object for other process.env usage
      'process.env': {
         NODE_ENV: JSON.stringify(mode),
         ...Object.keys(env).reduce((acc: any, key) => {
            acc[key] = env[key];
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