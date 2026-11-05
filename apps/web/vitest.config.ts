import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({ resolve: { alias: { '@engine': r('../../packages/engine/src/index.ts') } }, test: { environment: 'node' } });
