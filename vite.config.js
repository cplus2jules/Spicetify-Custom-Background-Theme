import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
    },
  },
  // Ensure we serve files from the root
  publicDir: false, 
  build: {
    minify: false,
    lib: {
      entry: 'theme.js',
      formats: ['es'],
      fileName: 'theme',
    },
  },
});
