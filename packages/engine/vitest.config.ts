import { defineConfig } from 'vitest/config';

// test/helpers/setup.ts runs before every test file: it freezes what apply() shares between states (the campaign, the
// archive's lines, the zone maps), so a write in place fails loudly at the line that does it.
// testTimeout: vitest's 5 s is too short for the balance targets and a few whole-game tests when the machine is busy
// (they passed alone and timed out in a full run). A test that hangs still fails; a timed assertion states its own limit.
export default defineConfig({ test: { setupFiles: ['test/helpers/setup.ts'], testTimeout: 30_000 } });
