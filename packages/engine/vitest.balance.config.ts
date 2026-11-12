import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

// `npm run balance`: the balance simulator's folder with its "quick run" smoke fights switched on (whole simulated
// fights that assert only "it builds"; the engine's default run leaves those three out and runs every target).
export default mergeConfig(base, defineConfig({ test: { env: { BALANCE_QUICK: '1' } } }));
