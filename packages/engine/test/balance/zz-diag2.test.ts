// @ts-nocheck
import { it } from 'vitest';
import { runFight } from './sim';
it('foe actions', () => {
  for (const tier of ['soldier', 'elite', 'boss']) {
    const cnt: any = {}; let taken = 0, ft = 0;
    for (let i = 0; i < 6; i++) { const r = runFight({ pcs: [{ build: 'tank', variant: 'normal', level: 6 }], foes: [{ tier }], map: 'open', seed: 'ZZ' + tier + i, maxRounds: 6 }, { log: true });
      taken += r.pcs[0].taken; ft += r.foeTurns;
      for (const l of r.log || []) { const m = /(fires a burst|Burst|Suppress|opens up|Rake|shoots|Aimed|Mag Dump|Dead Centre|Pin Down|Stopping)/.exec(l); if (m && /Soldier|Elite|Boss/.test(l)) cnt[m[1]] = (cnt[m[1]] || 0) + 1; }
      if (i === 0) console.log((r.log || []).filter((l) => /Soldier|Elite|Boss/.test(l)).slice(0, 14).join('\n'));
    }
    console.log(tier, JSON.stringify(cnt), 'taken/foeTurn', (taken / ft).toFixed(1));
  }
}, 600000);
