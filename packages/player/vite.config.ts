import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // https://github.com/vitejs/vite/issues/17334
  optimizeDeps: {
    exclude: ['quickjs-emscripten'],
  },
});
