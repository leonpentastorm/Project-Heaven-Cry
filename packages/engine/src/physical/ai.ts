// Physical 2.0 (rules 1.12): the enemy AI's technique step. An enemy has the free techniques, what its weapon lends
// and its tier's list (enemies.json `techniques`, on the unit as u.techs). Where it would make a plain attack it asks
// each technique's handler how much it wants it (`ai`: a plain attack is 5) and uses the best one that beats that.
// Planning is pure: it reads previews only, so the intent a player Analyzes is what the enemy then does.
import { type Combat, type Unit, type AimWhy, alive, enemyStep, sideSees, enemyPreference, noteEnemyAim } from '../combat';
import { isGhost, perceivedFoes } from '../illusion';
import { condOn } from '../magic';
import type { TechArgs } from './types';
import { TECHNIQUE } from './data';
import { usable, handlerOf, previewTechnique, useTechnique, aiScore } from './core';
import { canPay } from '../effects/cost';

export const PLAIN_ATTACK_SCORE = 5;
interface Pick { id: string; args: TechArgs; score: number; target: Unit | null; /** why this target, when it is the one a plain attack would take and that was a choice (rules 1.23 the healer; rules 1.25 its doctrine) */ why?: AimWhy }
/** The technique this enemy would use now, or null (a plain attack, a move or nothing is better). */
export function aiTechnique(cb: Combat, u: Unit): Pick | null {
  // a tier with no list (a minion) keeps to plain attacks, whatever its weapon would lend
  if (u.side !== 'foe' || u.charId || !u.techs?.length || !alive(u) || condOn(u, 'disarmed') || condOn(u, 'lowered')) return null;
  // Between targets a technique wants equally it takes the one a plain attack would (combat.ts enemyPreference: its
  // Taunter, its tier's fire doctrine, rules 1.25, the most hurt, the squad's healer by its tier's weight, rules 1.23;
  // the likeliest hit). It used to take the first character in the fight's list (item 1315; fixed in the bug sweep of
  // 12 Nov 2026).
  const pref = enemyPreference(cb, u, perceivedFoes(cb, u).filter((v) => !isGhost(v) && alive(v) && sideSees(cb, u.side, v)));
  const foes = pref.order;
  let best: Pick | null = null;
  for (const hand of ['main', 'off'] as const) for (const { id } of usable(cb, u, hand)) {
    const def = TECHNIQUE[id], h = handlerOf(id); if (!h?.ai || def.group === 'answer') continue;
    const tries: TechArgs[] = def.aim.startsWith('enemy') ? foes.map((v) => ({ hand, targetId: v.id })) : [{ hand }];
    for (const a0 of tries) {
      const s = aiScore(cb, u, id, a0); if (s.score <= PLAIN_ATTACK_SCORE || (best && s.score <= best.score)) continue;
      const pv = previewTechnique(cb, u, id, s.args); if (!pv.ok || !canPay(cb, u, pv.ap)) continue;
      best = { id, args: s.args, score: s.score, target: s.args.targetId ? cb.units.find((x) => x.id === s.args.targetId) || null : null }; if (pref.why && best.target && best.target === foes[0]) best.why = pref.why;
    }
  }
  return best;
}
enemyStep({
  plan(cb, u) { const p = aiTechnique(cb, u); return p ? { text: 'use ' + TECHNIQUE[p.id].name + (p.target ? ' on ' + p.target.name : ''), ...(p.target ? { targetId: p.target.id } : {}), ...(p.why ? { why: p.why } : {}) } : null; },
  act(cb, rng, u) { const p = aiTechnique(cb, u); if (!p || useTechnique(cb, u, p.id, p.args, rng) !== null) return false; if (p.target) noteEnemyAim(cb, u, p.target, p.why); return true; },
});
