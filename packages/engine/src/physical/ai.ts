// Physical 2.0 (rules 1.12): the enemy AI's technique step. An enemy has the free techniques, what its weapon lends
// and its tier's list (enemies.json `techniques`, on the unit as u.techs). Where it would make a plain attack it asks
// each technique's handler how much it wants it (`ai`: a plain attack is 5) and uses the best one that beats that.
// Planning is pure: it reads previews only, so the intent a player Analyzes is what the enemy then does.
import { type Combat, type Unit, alive, enemyStep, sideSees } from '../combat';
import { isGhost, perceivedFoes } from '../illusion';
import { condOn } from '../magic';
import type { TechArgs } from './types';
import { TECHNIQUE } from './data';
import { usable, handlerOf, previewTechnique, useTechnique, aiScore } from './core';

export const PLAIN_ATTACK_SCORE = 5;
interface Pick { id: string; args: TechArgs; score: number; target: Unit | null }
/** The technique this enemy would use now, or null (a plain attack, a move or nothing is better). */
export function aiTechnique(cb: Combat, u: Unit): Pick | null {
  // a tier with no list (a minion) keeps to plain attacks, whatever its weapon would lend
  if (u.side !== 'foe' || u.charId || !u.techs?.length || !alive(u) || condOn(u, 'disarmed') || condOn(u, 'lowered')) return null;
  const foes = perceivedFoes(cb, u).filter((v) => !isGhost(v) && alive(v) && sideSees(cb, u.side, v));
  let best: Pick | null = null;
  for (const hand of ['main', 'off'] as const) for (const { id } of usable(cb, u, hand)) {
    const def = TECHNIQUE[id], h = handlerOf(id); if (!h?.ai || def.group === 'answer') continue;
    const tries: TechArgs[] = def.aim.startsWith('enemy') ? foes.map((v) => ({ hand, targetId: v.id })) : [{ hand }];
    for (const a0 of tries) {
      const s = aiScore(cb, u, id, a0); if (s.score <= PLAIN_ATTACK_SCORE || (best && s.score <= best.score)) continue;
      const pv = previewTechnique(cb, u, id, s.args); if (!pv.ok || pv.ap > u.ap) continue;
      best = { id, args: s.args, score: s.score, target: s.args.targetId ? cb.units.find((x) => x.id === s.args.targetId) || null : null };
    }
  }
  return best;
}
enemyStep({
  plan(cb, u) { const p = aiTechnique(cb, u); return p ? { text: 'use ' + TECHNIQUE[p.id].name + (p.target ? ' on ' + p.target.name : ''), ...(p.target ? { targetId: p.target.id } : {}) } : null; },
  act(cb, rng, u) { const p = aiTechnique(cb, u); return !!p && useTechnique(cb, u, p.id, p.args, rng) === null; },
});
