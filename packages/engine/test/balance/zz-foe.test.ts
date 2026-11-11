// @ts-nocheck
import { it } from 'vitest';
import { runFight, runCell, figures, MAP_ID, TIER_WEAPON } from './sim';
import { MAPS, ENEMY } from '../../src';
// the ground the rules 1.15 fit was measured on (16 x 11, the sides 11 tiles apart), kept here for the under-fire rows
MAPS.sim_old = { id: 'sim_old', name: 'Open ground (the 1.15 fit)', w: 16, h: 11, solid: [], cover: [], full: [], difficult: [], pcStart: ['2,5', '2,3', '2,7', '1,4', '1,6', '2,1'], foeStart: ['13,5', '13,3', '13,7', '14,4', '14,6', '13,1', '13,9'] };
MAP_ID.old = 'sim_old';
for (const t of ['soldier', 'elite']) { ENEMY['sim_bag_' + t] = { ...ENEMY[t], id: 'sim_bag_' + t, name: 'Sandbag (' + t + ' numbers)', hp: 5000 }; TIER_WEAPON['sim_bag_' + t] = TIER_WEAPON[t]; }
const FIRE = { soldiers: ['sim_bag_soldier', 'sim_bag_soldier'], mixed: ['sim_bag_elite', 'sim_bag_soldier'] };
it('what enemies deal to the yardstick', () => {
  const N = Number(process.env.N) || 30;
  for (const lv of [1, 3, 6, 9, 12, 20]) {
    let s = 'FIRE L' + lv;
    for (const fire of ['soldiers', 'mixed']) {
      let lasted = 0, taken = 0, ft = 0, fa = 0, fh = 0, by3 = 0;
      for (let i = 0; i < N; i++) { const r = runFight({ pcs: [{ build: 'plain_gun', variant: 'normal', level: lv }], foes: FIRE[fire].map((t) => ({ tier: t })), map: 'old', seed: ['FIRE', 'plain_gun', lv, fire, i].join('-'), maxRounds: 10 }), p = r.pcs[0];
        lasted += p.downedRound != null ? p.downedRound - 1 : 10; if (p.downedRound != null && p.downedRound <= 3) by3++; taken += p.taken; ft += r.foeTurns; fa += p.foeAttacks; fh += p.foeHits; }
      s += ' | ' + fire + ': lasts ' + (lasted / N).toFixed(2) + ' rounds (down by 3: ' + Math.round(100 * by3 / N) + '%) · taken a foe turn ' + (taken / ft).toFixed(1) + ' · foe rolls a turn ' + (fa / ft).toFixed(2) + ' · foe hit ' + Math.round(100 * fh / fa) + '%';
    }
    console.log(s);
    for (const tier of ['soldier', 'elite', 'boss']) { const c = runCell({ build: 'plain_gun', variant: 'normal', level: lv }, tier, 'old', 20, { maxRounds: 8, tag: 'foe' }), f = figures(c);
      console.log('DUEL L' + lv + ' ' + tier + ': taken a foe turn ' + f.takenPerFoeTurn + ' · foe hit ' + f.foeHitPct + '% · a hit ' + f.takenPerFoeHit + ' · foe rolls a turn ' + (c.foeAttacks / Math.max(1, c.foeTurns)).toFixed(2) + ' · won ' + f.winPct + '% · rounds ' + f.rounds); }
  }
}, 3600000);
