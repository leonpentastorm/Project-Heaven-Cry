import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@engine': r('../../packages/engine/src/index.ts') } },
  server: { fs: { allow: [r('../..')] }, proxy: { '/room': { target: 'http://127.0.0.1:8787', ws: true } } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 3000 },
});
