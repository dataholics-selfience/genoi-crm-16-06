import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

function copyRedirectsPlugin() {
  return {
    name: 'copy-redirects',
    closeBundle() {
      const redirectsSrc = resolve(__dirname, '_redirects');
      const redirectsDest = resolve(__dirname, 'dist', '_redirects');
      if (fs.existsSync(redirectsSrc)) {
        fs.copyFileSync(redirectsSrc, redirectsDest);
        console.log('✅ _redirects copiado para dist/');
      } else {
        console.warn('⚠️ Arquivo _redirects não encontrado na raiz.');
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyRedirectsPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
});
