import { defineConfig } from 'vitest/config';

// test/helpers/setup.ts runs before every test file: it freezes what apply() shares between states (the campaign, the
// archive's lines, the zone maps), so a write in place fails loudly at the line that does it.
export default defineConfig({ test: { setupFiles: ['test/helpers/setup.ts'] } });
