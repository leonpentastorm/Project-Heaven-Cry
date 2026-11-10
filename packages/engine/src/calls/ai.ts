// Calls (rules 1.13): the enemy AI's Call step. An enemy has no skill points: its tier lists the Calls it has and one
// level that stands in for the points (enemies.json `calls`, `call_level`). Only an officer-like tier has a list (an
// elite, a boss), and it makes one Call a turn at most, only while another of its side still stands, where it would
// have made a plain attack, when the Call's own score beats the plain attack's (5). Planning is pure: it reads previews only, so the intent a player reads (Analyze,
// the Trickster's Read) is what the enemy then does.
import { type Combat, type Unit, alive, enemyStep, sideSees } from '../combat';
import { isGhost, perceivedFoes } from '../illusion';
import type { CallArgs } from './types';
import { CALL, CALL_RULES } from './data';
import { callHandler, previewCall, useCall, aiCallScore, callsThisTurn } from './core';

interface Pick { id: string; args: CallArgs; score: number; target: Unit }
/** The Call this enemy would make now, or null (an attack, a technique, a move or nothing is better). */
export function aiCall(cb: Combat, u: Unit): Pick | null {
  if (u.side !== 'foe' || u.charId || u.companion || !u.calls?.length || !alive(u) || callsThisTurn(cb, u) >= CALL_RULES.enemy.per_turn) return null;
  const foes = perceivedFoes(cb, u).filter((v) => !isGhost(v) && alive(v) && sideSees(cb, u.side, v));
  const own = cb.units.filter((v) => v.side === u.side && alive(v));
  if (own.length < 2) return null; // an officer Calls while it leads someone: alone, it just fights
  let best: Pick | null = null;
  for (const id of u.calls) {
    const def = CALL[id], h = callHandler(id); if (!def || !h?.ai) continue;
    const pool = def.aim === 'enemy' ? foes : def.aim === 'ally' ? own.filter((v) => v !== u) : own;
    for (const v of pool) {
      const s = aiCallScore(cb, u, id, { targetId: v.id }); if (s.score <= CALL_RULES.enemy.beats || (best && s.score <= best.score)) continue;
      const pv = previewCall(cb, u, id, s.args); if (!pv.ok || pv.ap > u.ap) continue;
      best = { id, args: s.args, score: s.score, target: v };
    }
  }
  return best;
}
enemyStep({
  plan(cb, u) { const p = aiCall(cb, u); return p ? { text: 'call ' + CALL[p.id].name + (CALL[p.id].aim === 'enemy' ? ' at ' : ' to ') + p.target.name, targetId: p.target.id } : null; },
  act(cb, rng, u) { const p = aiCall(cb, u); return !!p && useCall(cb, u, p.id, p.args, rng) === null; },
}, true);
