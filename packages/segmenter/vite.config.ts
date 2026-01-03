import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  build: {
    ssr: './src/index.ts',
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  // https://github.com/vitejs/vite/issues/17334
  optimizeDeps: {
    exclude: ['quickjs-emscripten'],
  },
});
