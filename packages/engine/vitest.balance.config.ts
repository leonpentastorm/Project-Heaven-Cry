import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

// `npm run balance`: the balance simulator's folder with its readings (BALANCE_MEASURE: each measure prints what it reads;
// rules 1.94, nothing is held to a line) and its "quick run" smoke fights (BALANCE_QUICK: whole simulated fights that
// assert only "it builds") switched on. The engine's default run leaves both out.
export default mergeConfig(base, defineConfig({ test: { env: { BALANCE_QUICK: '1', BALANCE_MEASURE: '1' } } }));
