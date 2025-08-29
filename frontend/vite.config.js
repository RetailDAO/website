import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), // React Fast Refresh for HMR
  ],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections for WSL2 compatibility
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Matches your backend port
        changeOrigin: true,
        secure: false,
        // No rewrite needed - frontend already uses /api/v1 paths
      },
      '/health': {
        target: 'http://localhost:8000', // Health endpoint
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000', // WebSocket proxy
        ws: true, // Enable WebSocket proxying
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild', // Use esbuild for minification
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'], // Split React for better caching
          recharts: ['recharts'], // Split Recharts
        },
      },
    },
  },
  test: {
    environment: 'jsdom', // For React component testing
    globals: true, // Avoid importing vi from vitest
    setupFiles: './src/setupTests.js', // Vitest setup file
    css: true, // Include Tailwind CSS in tests
  },
  css: {
    postcss: './postcss.config.js', // Reference PostCSS config for Tailwind
  },
});