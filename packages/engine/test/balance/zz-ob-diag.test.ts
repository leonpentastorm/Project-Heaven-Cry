// @ts-nocheck
import { it } from 'vitest';
import { rifle, pattern } from './magic-measure';
import { runFight } from './sim';
it('diag', () => {
  const y = rifle(6, 12);
  for (const extra of [{}, { alt: 'A' }, { alt: 'Z' }, { q: 1 }]) { const r = pattern('peak', 'outburst', 'normal', 6, 36, { feel: true, feelings: 'all', ...extra }, /^Release /, y, 'sim_range_soldier', 1); console.log('[d]', JSON.stringify(extra), r.casts, r.perCast, r.apPerCast, r.pctRifle); }
  const f = runFight({ pcs: [{ build: 'outburst', variant: 'normal', level: 6, opts: { feel: true, feelings: 'all', alt: 'A' } }], foes: [{ tier: 'sim_range_soldier' }], map: 'open', seed: 'SIM-x-1', maxRounds: 1 }, { log: true });
  console.log('[d] ' + (f.log || []).slice(-14).join('\n[d] '));
}, 600000);
