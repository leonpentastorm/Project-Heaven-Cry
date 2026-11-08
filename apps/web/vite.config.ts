import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
// The ONNX runtime's files (its WebGPU+WASM binary is served from this site: game/voiceRuntime.ts), never from a CDN.
const ORT_DIST = dirname(createRequire(import.meta.url).resolve('onnxruntime-web'));
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@engine': r('../../packages/engine/src/index.ts'), '@ort': ORT_DIST } },
  server: { fs: { allow: [r('../..')] }, proxy: { '/room': { target: 'http://127.0.0.1:8787', ws: true } } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 3000 },
});
