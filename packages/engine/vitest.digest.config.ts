// The roll digest run (test/helpers/roll-digest.ts): the whole suite with every die tapped. Not used by `npm run check`.
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { setupFiles: ['./test/helpers/roll-digest.ts'] } });
