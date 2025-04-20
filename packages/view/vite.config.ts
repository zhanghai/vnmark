import camelCase from 'camelcase';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import packageJson from './package.json';

const packageName = packageJson.name.split('/').pop() || packageJson.name;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({ rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: camelCase(packageName, { pascalCase: true }),
      fileName: packageName,
    },
  },
  // https://github.com/vitejs/vite/issues/17334
  optimizeDeps: {
    exclude: ['quickjs-emscripten'],
  },
});
