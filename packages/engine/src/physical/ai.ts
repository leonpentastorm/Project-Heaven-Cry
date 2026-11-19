// Physical 2.0 (rules 1.12): the enemy AI's technique step. An enemy has the free techniques, what its weapon lends
// and its tier's list (enemies.json `techniques`, on the unit as u.techs). Where it would make a plain attack it asks
// each technique's handler how much it wants it (`ai`: a plain attack is 5) and uses the best one that beats that.
// Planning is pure: it reads previews only, so the intent a player Analyzes is what the enemy then does.
import { type Combat, type Unit, type AimWhy, alive, enemyStep, enemyOpening, enemyAimWeight, refOf, sideSees, enemyPreference, noteEnemyAim, doctrineOf, alliesOn, tauntedBy, finishing, say, paths, apForTiles, moveUnit, moveBlock, toggleProne, unitSees, lineOfSight, sightBlockers, effectiveRange, attackApCost, isMelee, dist } from '../combat';
import { ENEMY_AI, WEAPON } from '../data';
import { onHook } from '../effects/hooks';
import { uses } from '../effects/uses';
import { apFor } from '../effects/cost';
import { pressureState, atCover } from './pressure';
import { foesOf } from '../kit';
import { isGhost, perceivedFoes } from '../illusion';
import { condOn } from '../magic';
import type { TechArgs } from './types';
import { TECHNIQUE } from './data';
import { usable, handlerOf, previewTechnique, useTechnique, aiScore, canAnswer, answerKind } from './core';
import { baitRole } from '../ai-sigil';
import { holdersOf, ifFails } from '../effects/hooks';
import { canReact } from '../tactics';
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
  // Rules 1.61 (the opening volley): a tier's `technique_spread` lowers its want for a target its side has already
  // attacked this round, by that share for each other attacker, so a line of Soldiers lays its techniques across the
  // squad as its plain fire does (rules 1.25). Never against a Taunt or a Challenge: a taunted enemy keeps its want.
  // Rules 1.61 item 4964, focus memory: and x 1 / (1 + memory x attackers), unless the target is nearly finished.
  const d = doctrineOf(u), spread = tauntedBy(u) ? 0 : d.techSpread, memory = tauntedBy(u) ? 0 : d.memory;
  const want = (score: number, t: Unit | null | undefined) => {
    if (!t || (!spread && !memory)) return score;
    const n = alliesOn(cb, u, t); if (!n) return score;
    return score * Math.pow(1 - spread, n) / (finishing(t) ? 1 : 1 + memory * n);
  };
  let best: Pick | null = null, raw: { score: number; target: Unit | null } | null = null;
  for (const hand of ['main', 'off'] as const) for (const { id } of usable(cb, u, hand)) {
    const def = TECHNIQUE[id], h = handlerOf(id); if (!h?.ai || def.group === 'answer') continue;
    const tries: TechArgs[] = def.aim.startsWith('enemy') ? foes.map((v) => ({ hand, targetId: v.id })) : [{ hand }];
    for (const a0 of tries) {
      const s0 = aiScore(cb, u, id, a0), tgt = s0.args.targetId ? cb.units.find((x) => x.id === s0.args.targetId) || null : null, s = { ...s0, score: want(s0.score, tgt) };
      const rawOk = s0.score > PLAIN_ATTACK_SCORE && (!raw || s0.score > raw.score);
      if (!rawOk && (s.score <= PLAIN_ATTACK_SCORE || (best && s.score <= best.score))) continue;
      const pv = previewTechnique(cb, u, id, s.args); if (!pv.ok || !canPay(cb, u, pv.ap)) continue;
      if (rawOk) raw = { score: s0.score, target: tgt };
      if (s.score <= PLAIN_ATTACK_SCORE || (best && s.score <= best.score)) continue;
      best = { id, args: s.args, score: s.score, target: tgt }; if (pref.why && best.target && best.target === foes[0]) best.why = pref.why;
    }
  }
  // the intent says why it switched (rules 1.61 item 4964): its side's fire turned it off the target it wanted most
  if (best && best.target && raw && raw.target && raw.target !== best.target && alliesOn(cb, u, raw.target) > alliesOn(cb, u, best.target)) best.why = 'spread';
  return best;
}
enemyStep({
  plan(cb, u) { const p = aiTechnique(cb, u); return p ? { text: 'use ' + TECHNIQUE[p.id].name + (p.target ? ' on ' + p.target.name : ''), ...(p.target ? { targetId: p.target.id } : {}), ...(p.why ? { why: p.why } : {}) } : null; },
  act(cb, rng, u) { const p = aiTechnique(cb, u); if (!p || useTechnique(cb, u, p.id, p.args, rng) !== null) return false; if (p.target) noteEnemyAim(cb, u, p.target, p.why); return true; },
});

// Rules 1.79 items 6700 to 6702 (enemies.json ai.pressure): an enemy acts on its Pressure. Before its first action of a
// turn ('enemy_action_start', step 0) a Broken enemy reaches the covered tile fewest of its foes can see (within this
// turn's AP), or, with none in reach, drops Prone and stays down this turn: that is its first action (techniques.json
// rules.pressure.states.broken: "it must reach cover or drop Prone first"). Already against cover, it stays there this
// turn. A Suppressed enemy not against cover first takes a covered tile within `suppressed_cover_tiles` that keeps a
// line on someone it sees, if it can still shoot after; and it walks at most `suppressed_move_tiles` a move this turn.
// The log says so (the block's lines). Never an ordered enemy (a Command decides) nor a player's unit.
type Fill = (k: string) => boolean;
const coverAt = (cb: Combat, u: Unit, k: string) => atCover(cb, { ...u, pos: k } as Unit); // Pressure's own cover test (pressure.ts), on a tile
/** THE walk to cover under fire: the covered tile within maxTiles (and apLeft of walking AP) that ok() allows, the
 * fewest foes' eyes on it first, then the nearest (o.near: false, any tile of the walk alike: Shift's short slide), then
 * the first by its key; with the eyes on it. Pressure's Broken and Suppressed enemies (below) and the technique Shift's
 * own AI (physical/ranged/sets.ts) walk by it. */
export function coverWalk(cb: Combat, u: Unit, maxTiles: number, apLeft: number, ok: Fill, o: { near?: boolean } = {}): { to: string; eyes: number } | null {
  const P = paths(cb, u.pos, u.id), foes = foesOf(cb, u);
  let best: string | null = null, bs = Infinity, be = 0;
  for (const [k, tiles] of Object.entries(P.dist)) {
    if (k === u.pos || tiles <= 0 || tiles > maxTiles || apForTiles(tiles, u.bank, u.movement) > apLeft || !coverAt(cb, u, k) || !ok(k)) continue;
    const eyes = foes.filter((v) => unitSees(cb, v, k, undefined, u)).length, sc = eyes * 100 + (o.near === false ? 0 : tiles);
    if (sc < bs || (sc === bs && best != null && k < best)) { bs = sc; best = k; be = eyes; }
  }
  return best == null ? null : { to: best, eyes: be };
}
/** Rules 1.79 items 6700 to 6702 and 1.83 item 7106: what Pressure makes an enemy do first this turn, worked out without
 * doing it (the hook below does it; the Read, combat.ts enemyIntent, foresees it): Broken, a walk to cover (`to`) or a
 * drop flat (`prone`), or already in cover (`hold`: it holds there and fights on); Suppressed, a slide to cover
 * (`slide`, `to`), or nothing first (`short`: it only walks short). null: Pressure moves it no way this turn. Pure. */
export type PressurePlan = { state: 'broken'; act: 'hold' | 'prone' | 'cover'; to?: string } | { state: 'suppressed'; act: 'short' | 'slide'; to?: string };
export function pressurePlan(cb: Combat, u: Unit): PressurePlan | null {
  const PA = ENEMY_AI.pressure;
  if (!PA || PA.on === false || cb.window || !u || u.side !== 'foe' || u.charId || u.companion || !alive(u) || condOn(u, 'commanded')) return null;
  const s = pressureState(u); if (s !== 'broken' && s !== 'suppressed') return null;
  const here = atCover(cb, u), canMove = !moveBlock(u);
  if (s === 'broken') {
    if (here) return { state: s, act: 'hold' };
    const to = canMove ? coverWalk(cb, u, Infinity, apFor(cb, u), () => true)?.to ?? null : null;
    return to ? { state: s, act: 'cover', to } : { state: s, act: 'prone' };
  }
  if (here || !canMove || u.prone) return { state: s, act: 'short' };
  const w = WEAPON[u.weapon]; if (!w) return { state: s, act: 'short' };
  const melee = isMelee(w), left = apFor(cb, u) - attackApCost(w, melee ? 'melee' : 'shot');
  const seen = foesOf(cb, u, { seenBySide: u.side }), reach = melee ? 1 : effectiveRange(w), walls = sightBlockers(cb);
  const to = coverWalk(cb, u, PA.suppressed_cover_tiles, left, (k) => seen.some((v) => dist(k, v.pos) <= reach && lineOfSight(cb, k, v.pos, false, walls)))?.to ?? null;
  return to ? { state: s, act: 'slide', to } : { state: s, act: 'short' };
}
onHook('enemy_action_start', (ctx: any, cb: Combat) => {
  const u: Unit = ctx.u, PA = ENEMY_AI.pressure;
  if (ctx.skip || ctx.step !== 0) return;
  const p = pressurePlan(cb, u); if (!p || !PA) return;
  const line = (k: keyof typeof PA.lines) => say(cb, PA.lines[k].replace(/\{name\}/g, u.name));
  const A = uses({ key: 'ai', u, c: null, cb, g: undefined } as any); // the AI's counters on the unit (combat.ts reads them: aiUses)
  const short = (tiles: number) => { (u as any).aiShort = tiles; A.take('per_turn', 1, 'ai:short'); };
  if (p.state === 'broken') {
    short(0); // it holds where it gets to this turn
    if (p.act === 'hold') return;
    if (p.act === 'cover' && p.to) { line('broken_cover'); if (!moveUnit(cb, u, p.to, ctx.rng)) { ctx.skip = true; return; } }
    if (!u.prone && toggleProne(cb, u) === null) { A.take('per_turn', 1, 'ai:down'); line('broken_prone'); ctx.skip = true; }
    else if (u.prone) A.take('per_turn', 1, 'ai:down');
    return;
  }
  short(PA.suppressed_move_tiles);
  if (p.act === 'slide' && p.to) { line('suppressed_cover'); if (!moveUnit(cb, u, p.to, ctx.rng)) ctx.skip = true; }
});
// Rules 1.83 item 7106: the Read foresees it (the intent names the move to cover, or the drop flat, as its first act)
enemyOpening((cb, u) => {
  const p = pressurePlan(cb, u); if (!p) return null;
  if (p.act === 'cover' && p.to) return { kind: 'move', text: 'break and run for cover at ' + refOf(p.to), to: p.to };
  if (p.act === 'prone') return { kind: 'wait', text: 'throw itself flat and stay down' };
  if (p.act === 'slide' && p.to) return { kind: 'move', text: 'keep its head down and slide into cover at ' + refOf(p.to), to: p.to };
  return null;
});

// Rules 1.83 item 7107: the bait reads Answers. A target that holds an Answer ready against a melee blow (an Answer
// technique of the attack kind it can use now, or an item Answer: an effect whose `if` names `answer_on`, its own
// predicates about the holder holding) and has a reaction left draws the bait's blow first: a bait tier's melee unit
// counts it as `ai.bait.answer_lure` of its max HP more hurt while a stronger ally stands; the stronger melee ally counts
// it as `answer_hold` less while a bait has still to act this round (ai-sigil.ts baitRole, the one reading of the roles).
/** Does t hold an Answer ready against a melee blow from u, as far as u's side can see (t seen)? Pure. */
export function answerReady(cb: Combat, u: Unit, t: Unit): boolean {
  if (!alive(t) || !sideSees(cb, u.side, t) || !canReact(cb, t, 'attack')) return false;
  for (const hand of ['main', 'off'] as const) for (const { id } of usable(cb, t, hand)) if (TECHNIQUE[id]?.group === 'answer' && answerKind(id) === 'attack' && canAnswer(cb, t, id, u)) return true;
  for (const h of holdersOf({ u: t, cb })) for (const e of h.info.effects || []) {
    const c = e?.if; if (!c || c.answer_on == null) continue;
    const self = Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith('self_') || k === 'answer_on'));
    if (!ifFails({ ...h, u: t, cb }, self)) return true;
  }
  return false;
}
enemyAimWeight((cb, u, t, mode) => {
  const B: any = ENEMY_AI.bait; if (mode !== 'melee' || !B || B.on === false || !(B.answer_hold > 0 || B.answer_lure > 0)) return 0;
  const role = baitRole(cb, u); if (!role || !answerReady(cb, u, t)) return 0;
  return role === 'hold' ? Number(B.answer_hold) || 0 : -(Number(B.answer_lure) || 0);
});
