import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000';
  return {
    build: {
      rollupOptions: {
        output: {
          // Keep JS filenames stable to avoid hash-mismatch 404s after deploy.
          entryFileNames: 'assets/[name].js',
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'vendor-react') return 'assets/vendor-react.js';
            if (chunkInfo.name === 'vendor-ui') return 'assets/vendor-ui.js';
            return 'assets/[name].js';
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-ui';
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3005,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
