// The roll digest run (test/helpers/roll-digest.ts): the whole suite with every die tapped. Not used by `npm run check`.
import { defineConfig } from 'vitest/config';
// testTimeout: the run is a comparison, not a speed test (a busy machine must not fail it).
export default defineConfig({ test: { setupFiles: ['./test/helpers/roll-digest.ts'], testTimeout: 300000 } });
