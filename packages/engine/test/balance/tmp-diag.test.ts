// @ts-nocheck
import { it } from 'vitest';
import { runFight } from './sim';
it('diag', () => {
  for (const map of ['open', 'cover']) for (let i = 0; i < 3; i++) {
    const r = runFight({ pcs: ['opt_gun', 'tank', 'sigil', 'calls'].map((b) => ({ build: b, variant: 'normal', level: 6 })), foes: ['boss', 'soldier', 'soldier'].map((t) => ({ tier: t })), map, seed: 'DEF-sigil-boss-6-' + map + '-' + i, maxRounds: 20 });
    console.log(map, i, 'rounds', r.rounds, 'firstDmg', r.firstDmgRound, 'kills', JSON.stringify(r.kills.map((k) => k.tier + '@' + k.round)), 'foeLostTurns', r.foeLostTurns, '/', r.foeTurns);
    for (const p of r.pcs) console.log('   ', p.build, 'turns', p.turns, 'dmg/turn', Math.round(p.dmg / Math.max(1, p.turns)), 'hit%', Math.round(100 * p.hits / Math.max(1, p.attacks)), 'atk', p.attacks, 'ap', JSON.stringify(p.apSpent), 'unspent', p.apUnspent, 'down', p.downedRound, 'taken', p.taken, 'turnDmg', JSON.stringify(p.turnDmg));
  }
});
