// @ts-nocheck (a measuring tool; see heal-measure.test.ts)
// THE HEAL AND SHIELD PASS (rules 1.20; docs/design/handoffs/heal-shield-pass.md). Three instruments:
//   soldierTurn   the yardstick: what one Soldier of the fight's level takes off the plain rifleman in one of its turns
//                 (after armour, misses counted), measured on the 16 × 11 ground the rules 1.15 table was fitted on.
//                 NOT on the simulator's 26 × 26 ground: an enemy there never fires at a character 13 tiles away
//                 (spec item 1086).
//   inventory     every heal and shield of Sigil, the Outburst and prayer for one reference caster at one level, from
//                 the engine's own numbers (the unit's multipliers, the data's bases, the engine's formulas), next to
//                 what the same source gave before rules 1.20 (the old bases, written down here), as HP and as a
//                 percent of one Soldier-turn.
//   underFire     a pair on the old ground (the plain rifleman who stands and shoots, and a second character) under 1
//                 or 2 Soldiers that never fall: the round the first of the pair goes Down, with the second character
//                 supporting (a policy below) and with the same character standing idle.
// The supporters' policies are here, not in policies.ts: a healing Outburst, a flipped (Inverse) shield, a Sigil boon
// Line (MEND or WARD), and prayer (Health or Protection every turn, the Hymn when it is ready).
import { runFight, MAP_ID, TIER_WEAPON } from './sim';
import { BUILD, BUILDS, LEVELS } from './builds';
import { POLICIES, plain, type Ctx, type Step, type Policy } from './policies';
import {
  MAPS, ENEMY, SIGIL, MODULE, SCHOOL, FEELING, STAGE_MULT, WHISPERS, FAITH_PATRON, bindGame, dist, paths, apForTiles, lineOfSight, standable, canStand,
  previewOutburst, heartReach, planEvoke, glyphCost, previewPrayer, patronOf, blessingPower, devotionNow,
  mendFactor, outburstHeal, inverseShield, shellShield, loveHeal, interventionHeal, BUFF_HEAL, BOON_AREA, CLASS_MOVE_POOL,
} from '../../src';
import { startFight } from './sim';

export const H_LEVELS = LEVELS;
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };

// ---------- the ground and the sandbags ----------
MAPS.sim_old = MAPS.sim_old || { id: 'sim_old', name: 'Open ground (the 1.15 fit)', w: 16, h: 11, solid: [], cover: [], full: [], difficult: [], pcStart: ['2,5', '2,3', '2,7', '1,4', '1,6', '2,1'], foeStart: ['13,5', '13,3', '13,7', '14,4', '14,6', '13,1', '13,9'] };
MAP_ID.old = 'sim_old';
for (const t of ['soldier', 'elite']) if (!ENEMY['sim_bag_' + t]) { ENEMY['sim_bag_' + t] = { ...ENEMY[t], id: 'sim_bag_' + t, name: 'Sandbag (' + t + ' numbers)', hp: 5000 }; TIER_WEAPON['sim_bag_' + t] = TIER_WEAPON[t]; }

/** One Soldier-turn, as measured for the report (60 fights a level, two Soldiers on the rifleman; section 1 of the
 * hand-off). The cheap tests read this table; `soldierTurn` measures it again. */
export const SOLDIER_TURN: Record<number, number> = { 1: 18.5, 3: 21.5, 6: 25.4, 9: 32.4, 12: 37.8, 20: 60.2 };
/** The plain rifleman's max HP at the reference levels (builds.ts 'plain_gun', normal share). */
export const RIFLEMAN_HP: Record<number, number> = { 1: 145, 3: 163, 6: 190, 9: 233, 12: 288, 20: 445 };
export function soldierTurn(level: number, n = 30, soldiers = 2) {
  let taken = 0, ft = 0, lasted = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: [{ build: 'plain_gun', variant: 'normal', level }], foes: Array(soldiers).fill({ tier: 'sim_bag_soldier' }), map: 'old' as any, seed: ['FIRE', 'plain_gun', level, 'soldiers', i].join('-'), maxRounds: 10 }), p = r.pcs[0];
    taken += p.taken; ft += r.foeTurns; lasted += p.downedRound != null ? p.downedRound - 1 : 10; hp = p.maxHp;
  }
  return { level, perTurn: r1(taken / Math.max(1, ft)), lasted: r1(lasted / n), hp, share: Math.round(1000 * taken / Math.max(1, ft) / hp) / 10 };
}

// ---------- the reference supporters (builds.ts shapes; registered once) ----------
const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };
/** The Soul healer: a Bard (Insight), Empathy its main skill. The Mend design every Soul caster starts with; an
 * Inverse design is given to it for the shield rows (an "as if": it has the Camaraderie the module asks for). */
reg({ ...BUILD.outburst, id: 'mender', label: 'Soul healer', main: 'empathy', classId: 'bard', policy: 'ob_heal',
  weights: { empathy: 0.36, will_power: 0.16, camaraderie: 0.12, composure: 0.10, pain_threshold: 0.10, athletics: 0.10, lore_master: 0.06 },
  allin: ['empathy', 'camaraderie', 'implication', 'will_power', 'composure', 'pain_threshold', 'athletics'], spare: ['determination', 'endurance', 'agility'], perks: 'none',
  tweak: (c: any) => { if (!(c.outbursts || []).some((d: any) => d.id === 'aegis')) (c.outbursts ||= []).push({ id: 'aegis', name: 'Aegis', school: 'damage', modules: ['inverse'] }); },
  note: 'Emanator, Bard. Design: the starting Mend (Buff, heal). Empathy first.' });
/** The reference Outburst caster (a Channeler who also heals), with the same Inverse design for the shield rows. */
reg({ ...BUILD.outburst, id: 'outburst_s', label: 'Outburst caster (support)', policy: 'ob_heal',
  tweak: (c: any) => { if (!(c.outbursts || []).some((d: any) => d.id === 'aegis')) (c.outbursts ||= []).push({ id: 'aegis', name: 'Aegis', school: 'damage', modules: ['inverse'] }); } });
/** The reference Sigil caster with the boon words first: MEND and SEEK at creation, then CONDENSE, WARD, CLEANSE. */
reg({ ...BUILD.sigil, id: 'sigil_s', label: 'Sigil caster (support)', policy: 'sigil_boon', sigils: ['mend', 'seek'], words: ['condense', 'ward', 'cleanse', 'fire', 'stone', 'spread', 'shock', 'kin', 'leech', 'chain'] });
/** The Faith build sworn to Mother Ember (Warm Hands, Hearthlight). */
reg({ ...BUILD.faith, id: 'faith_s', label: 'Faith build (Mother Ember)', policy: 'pray_heal', belief: { kind: 'faithful', patron: 'mother_ember' }, perks: 'none' });
/** The Faith build sworn to Nerukhan (Saint's Shield). */
reg({ ...BUILD.faith, id: 'faith_n', label: 'Faith build (Nerukhan)', policy: 'pray_heal', belief: { kind: 'faithful', patron: 'nerukhan' }, perks: 'none' });

// ---------- the supporters' policies ----------
const allowed = (x: Ctx, s: Step | null) => (s && !x.banned.has(JSON.stringify(s.action)) ? s : null);
const side = (x: Ctx) => [x.u, ...x.allies].filter((v: any) => !v.dead);
/** Who to mend: the most wounded of the side (by the share of HP missing), the Downed first. */
const wounded = (x: Ctx) => side(x).filter((v: any) => v.downed || v.hp < v.maxHp - 4).sort((a: any, b: any) => (a.downed ? -1 : a.hp / a.maxHp) - (b.downed ? -1 : b.hp / b.maxHp))[0] || null;
/** Who to shield: whoever of the side holds the smallest shield against `size` (nobody when all hold at least 60% of it). */
const unshielded = (x: Ctx, size: number) => side(x).filter((v: any) => !v.downed && (v.shield || 0) < size * 0.6).sort((a: any, b: any) => (a.shield || 0) - (b.shield || 0) || a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
function walkTo(x: Ctx, t: any, ok: (k: string, apLeft: number) => boolean): Step | null {
  const u = x.u, P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => v.id !== u.id && !v.dead).map((v: any) => v.pos));
  const tiles = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => k !== u.pos && n > 0 && !taken.has(k)).map(([k, n]) => ({ k, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((q) => q.ap <= u.ap).sort((a, b) => a.ap - b.ap || dist(a.k, t.pos) - dist(b.k, t.pos));
  for (const q of tiles.slice(0, 80)) if (ok(q.k, u.ap - q.ap)) return allowed(x, { action: { type: 'combat/move', to: q.k }, kind: 'move', label: 'move' });
  return null;
}
/** The rifleman of the pair: shoots from where he stands, never walks (so the supporter's reach is not the question). */
export const stand: Policy = (x) => { const s = plain(x); return s && s.kind !== 'move' ? s : null; };
export const idle: Policy = () => null;
/** A healing or shielding Outburst. opts.design 'mend' (default) or 'aegis' (the Inverse shield); opts.quick: Release
 * after the turn's free Pump (the 3 AP heal) and cast again with what is left; opts.feel 'none' | 'steady' (default:
 * Rage when the heart has room, then Love, then any feeling that costs nothing). It never pays a feeling in HP. */
export const obHeal: Policy = (x) => {
  const u = x.u, m = u.mg, o = x.opts || {}; if (!m) return null;
  const want = o.design || 'mend', d = m.held ? m.designs.find((q: any) => q.id === m.held.design) : m.designs.find((q: any) => q.id === want) || m.designs.find((q: any) => (want === 'aegis' ? q.modules.includes('inverse') : q.school === 'buff'));
  if (!d) return null;
  const shield = d.modules.includes('inverse'), reach = W(x.g, () => heartReach(m, d));
  const t = shield ? unshielded(x, inverseShield(m, d, 1.6)) : wounded(x);
  if (!m.held) {
    if (!t) return null;
    const pv = W(x.g, () => previewOutburst(x.cb, u, d.id, undefined, false));
    if (!pv.ok || m.strain + pv.strain > m.strainLimit || u.ap < pv.ap + 1) return null;
    if (t !== u && dist(u.pos, t.pos) > reach) { const s = walkTo(x, t, (k, apLeft) => dist(k, t.pos) <= reach && apLeft >= pv.ap + 1 && W(x.g, () => lineOfSight(x.cb, k, t.pos))); if (s) return s; return null; }
    return allowed(x, { action: { type: 'combat/outburst', design: d.id, hold: true }, kind: 'setup', label: 'Begin ' + d.name, seq: 'start' });
  }
  const tt = t || u, stage = m.held.stage || 0, felt = new Set(m.held.felt || []);
  const free = (m.freeUsed || 0) < 1 && ((m.freePumps || 0) > 0 || !m.firstUsed);
  const pumpOk = stage < 4 && (free || u.ap >= 2) && !(o.quick && !free);
  if (pumpOk) {
    const know = (m.feelings || []).filter((f: string) => !felt.has(f)), room = m.strainLimit - m.strain;
    const cost = (f: string) => Number((FEELING[f]?.pour as any)?.strain || 0) + Number((FEELING[f]?.pour as any)?.strain_unless_down || 0), hurts = (f: string) => Number((FEELING[f]?.pour as any)?.self_damage || 0);
    let f: string | null = null;
    if (o.feel !== 'none') f = know.filter((q: string) => !hurts(q) && cost(q) <= Math.min(1, room - 1) && (FEELING[q].step.base || 0) > 0.2 && q !== 'fear' && q !== 'calm').sort((a: string, b: string) => (b === 'love' ? 1 : 0) - (a === 'love' ? 1 : 0) || (FEELING[b].step.base || 0) - (FEELING[a].step.base || 0))[0] || null;
    const s = allowed(x, { action: { type: 'combat/pump', ...(f ? { feeling: f } : {}) }, kind: 'setup', label: 'Pump' + (f ? ' (' + f + ')' : ''), seq: 'part' }) || (f ? allowed(x, { action: { type: 'combat/pump' }, kind: 'setup', label: 'Pump', seq: 'part' }) : null);
    if (s) return s;
  }
  if (u.ap < 1) return null;
  return allowed(x, { action: { type: 'combat/release', aim: tt.pos }, kind: 'spell', label: 'Release ' + d.name, seq: 'end' });
};
/** A Sigil boon Line on an ally. opts.words: the Line (default MEND · SEEK). The Line is walked straight away from the
 * ally and Evoked from its last glyph, which fires back along it. */
export const sigilBoon: Policy = (x) => {
  const u = x.u, m = u.mg, M = x.memo, o = x.opts || {}; if (!m || !m.evoker) return null;
  const words: string[] = (o.words || ['mend', 'seek']).filter((w: string) => (m.words || []).includes(w));
  if (words.length < 2 || !words.some((w) => SIGIL[w]?.group === 'reach') || words.length > (m.maxWords || 2)) return null;
  const ward = words.includes('ward');
  const mine = (k: string) => (x.cb.glyphs || []).some((gl: any) => gl.pos === k && gl.side === u.side), glyphAt = (k: string) => (x.cb.glyphs || []).some((gl: any) => gl.pos === k);
  let plan = M.bplan; if (plan) plan.i = plan.tiles.filter((k: string) => mine(k)).length;
  if (plan && plan.i < plan.drawn) plan = M.bplan = null; // a glyph faded
  const others = x.allies.filter((v: any) => !v.dead && !v.downed);
  const t = plan ? x.cb.units.find((v: any) => v.id === plan.target) : (ward ? others.filter((v: any) => (v.shield || 0) < 8).sort((a: any, b: any) => a.hp / a.maxHp - b.hp / b.maxHp)[0] : others.filter((v: any) => v.hp < v.maxHp - 4).sort((a: any, b: any) => a.hp / a.maxHp - b.hp / b.maxHp)[0]) || null;
  if (!t) return null;
  if (plan && plan.i >= plan.words.length) {
    const pv = W(x.g, () => planEvoke(x.cb, u, plan.tiles[0], t.pos));
    if (pv.ok && !pv.fizzle && (pv.ap ?? 1) <= u.ap) { const s = allowed(x, { action: { type: 'combat/evoke', tile: plan.tiles[0], aim: t.pos }, kind: 'spell', label: 'Evoke ' + plan.words.join('·').toUpperCase(), seq: 'end' }); if (s) { M.bplan = null; return s; } }
    if (/charge|core/i.test(pv.why || '') && m.cores > 0) return allowed(x, { action: { type: 'combat/core' }, kind: 'setup', label: 'swap the core', seq: 'part' });
    if ((pv.ap ?? 1) > u.ap) return null;
    M.bplan = null; return null;
  }
  if (plan) {
    const k = plan.tiles[plan.i];
    if (u.pos !== k) { if (apForTiles(1, u.bank || 0, u.movement) > u.ap) return null; const s = allowed(x, { action: { type: 'combat/move', to: k }, kind: 'setup', label: 'walk the Line', seq: 'part' }); if (s) return s; M.bplan = null; return null; }
    const w = plan.words[plan.i], gc = W(x.g, () => glyphCost(x.cb, u, w, true, u.pos));
    if (((gc.charge || 0) > m.charge || (gc.fail && /charge|core/i.test(gc.fail))) && m.cores > 0) return allowed(x, { action: { type: 'combat/core' }, kind: 'setup', label: 'swap the core', seq: 'part' });
    if (m.flux + (gc.flux || 1) > 6) { const s = allowed(x, { action: { type: 'combat/vent' }, kind: 'setup', label: 'vent Flux', seq: 'part' }); if (s) return s; }
    if (gc.fail) { M.bplan = null; return null; }
    if (gc.ap > u.ap) return null;
    if (plan.i && !plan.sid) { const gl = (x.cb.glyphs || []).filter((q: any) => q.pos === plan.tiles[0] && q.side === u.side).pop(); plan.sid = gl?.strokeId || null; }
    const s = allowed(x, { action: { type: 'combat/draw', word: w, tile: u.pos, stroke: plan.i ? plan.sid || undefined : 'new' }, kind: 'setup', label: 'draw ' + w.toUpperCase(), seq: plan.i ? 'part' : 'start' });
    if (!s) { M.bplan = null; return null; }
    plan.drawn = plan.i + 1; return s;
  }
  const n = words.length, range = 8 + (m.rangeBonus || 0);
  const fit = (k: string): string[] | null => {
    const [kx, ky] = k.split(',').map(Number), [tx, ty] = t.pos.split(',').map(Number), dx = kx - tx, dy = ky - ty;
    if ((!dx && !dy) || !(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) || glyphAt(k)) return null;
    const d = [Math.sign(dx), Math.sign(dy)], tiles = [k];
    for (let i = 1; i < n; i++) { const q = (kx + d[0] * i) + ',' + (ky + d[1] * i); if (!standable(x.cb.map, q) || !W(x.g, () => canStand(x.cb, q, u)) || glyphAt(q)) return null; tiles.push(q); }
    return dist(tiles[n - 1], t.pos) <= range ? tiles : null;
  };
  const here = fit(u.pos);
  if (here && W(x.g, () => lineOfSight(x.cb, u.pos, t.pos))) { M.bplan = { words, tiles: here, i: 0, drawn: 0, sid: null, target: t.id }; return sigilBoon(x); }
  if (M.broom === x.cb.round) return null; M.broom = x.cb.round;
  return walkTo(x, t, (k) => !!fit(k) && W(x.g, () => lineOfSight(x.cb, k, t.pos)));
};
/** Prayer as support. opts.hymn: a Hymn id prayed on the most wounded (default: the patron's first heal or shield Hymn
 * within standing); opts.whisper: 'health' (default) or 'protection', once a turn. What AP is left goes to the weapon. */
export const prayHeal: Policy = (x) => {
  const o = x.opts || {}, p = W(x.g, () => patronOf(x.c)), wid = o.whisper || 'health', shieldW = wid === 'protection';
  const boon = (e: any) => (e?.effects || []).some((f: any) => f.op === 'heal' || f.op === 'shield');
  const tryPray = (kind: string, id: string, t: any, label: string): Step | null => {
    const pv = W(x.g, () => previewPrayer(x.g, x.c.id, kind as any, id, { targetId: t.id, tile: t.pos })); if (!pv.ok || pv.mode !== 'standing') return null;
    return allowed(x, { action: { type: 'combat/pray', kind, id, targetId: t.id, tile: t.pos }, kind: 'prayer', label });
  };
  if (p && o.hymn !== 'none' && x.u.ap >= 3) {
    for (const h of (p.hymns || []).filter((q: any) => (o.hymn ? q.id === o.hymn : boon(q) && (q.target === 'ally')))) {
      const sh = (h.effects || []).some((f: any) => f.op === 'shield'), t = sh ? unshielded(x, 20) : wounded(x); if (!t || t.downed) continue;
      const s = tryPray('hymn', p.id + '.' + h.id, t, 'Hymn: ' + h.name); if (s) return s;
    }
  }
  if (wid !== 'none' && x.memo.wRound !== x.cb.round) {
    const w = (WHISPERS as any[]).find((q) => q.id === wid), t = shieldW ? unshielded(x, 6) : wounded(x);
    if (w && t && !t.downed) { const s = tryPray('whisper', w.id, t, 'Whisper: ' + w.name); if (s) { x.memo.wRound = x.cb.round; return s; } }
  }
  return stand(x);
};
Object.assign(POLICIES, { stand, idle, ob_heal: obHeal, sigil_boon: sigilBoon, pray_heal: prayHeal });

// ---------- the pair under fire ----------
export interface FireRow { what: string; level: number; soldiers: number; n: number; firstDown: number; downBy3: number; neverDown: number; takenPerRound: number; casts: number; shielded: number; errors: number }
/** The rifleman and a second character under `soldiers` Soldiers that never fall, `n` fights of at most 10 rounds.
 * firstDown: the rounds played before the first of the pair went Down (10 when nobody did). */
export function underFire(what: string, second: { build: string; variant: string; policy: string; opts?: any } | { build: string; variant: string; policy: string; opts?: any }[], level: number, soldiers: number, n: number, o: { tier?: string } = {}): FireRow {
  let first = 0, by3 = 0, never = 0, taken = 0, rounds = 0, casts = 0, shielded = 0, errors = 0;
  const seconds = Array.isArray(second) ? second : [second];
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: [{ build: 'plain_gun', variant: 'normal', level, policy: 'stand' }, ...seconds.map((q) => ({ build: q.build, variant: q.variant as any, level, policy: q.policy, ...(q.opts ? { opts: q.opts } : {}) }))],
      foes: Array(soldiers).fill({ tier: o.tier || 'sim_bag_soldier' }), map: 'old' as any, seed: ['HEAL', level, soldiers, i].join('-'), maxRounds: 10 });
    const downs = r.pcs.map((p) => p.downedRound).filter((q) => q != null) as number[], d = downs.length ? Math.min(...downs) : null;
    first += d != null ? d - 1 : 10; if (d != null && d <= 3) by3++; if (d == null) never++;
    taken += r.pcs.reduce((t, p) => t + p.taken, 0); rounds += r.rounds; errors += r.errors.length; shielded += r.pcs.reduce((t, p) => t + p.shieldTaken, 0);
    for (const p of r.pcs.slice(1)) casts += Object.entries(p.actions).filter(([k]) => /^(Release|Evoke|Hymn|Whisper)/.test(k)).reduce((t, [, v]) => t + (v as number), 0);
  }
  return { what, level, soldiers, n, firstDown: r1(first / n), downBy3: pct(by3, n), neverDown: pct(never, n), takenPerRound: r1(taken / Math.max(1, rounds)), casts: r1(casts / n), shielded: r1(shielded / n), errors };
}
export const fireLine = (r: FireRow) => r.what + ' L' + r.level + ' under ' + r.soldiers + ': first Down after ' + r.firstDown + ' rounds · down by round 3 in ' + r.downBy3 + '% · nobody Down in ' + r.neverDown + '% · ' + r.casts + ' casts a fight · ' + r.shielded + ' on shields' + (r.errors ? ' · ERRORS ' + r.errors : '');

// ---------- the inventory ----------
/** What each source gave before rules 1.20 (the bases and shares this pass replaced). */
export const OLD = { mend: 25, ward: 30, buff: 30, bardMend: 40, loveOfPower: 0.35, loneLoveOfPower: 0.2, inverseOfDamage: 0.7, shellOfDamage: 0.35, damageBase: 36, formMult: { wave: 0.7, burst: 0.7, aura: 0.6, lance: 0.8 },
  willShield: 30, health: 15, protection: 15, warmHands: 40, saintsShield: 40, absolution: 30, hearthlight: 10, coin: 10, everyoneHomeShield: 40, intervention: [20, 4] };
/** The stage multipliers the rows use: a plain stage 1 and stage 4; steady (Rage and Love and two plain Pumps, what a
 * new caster holds: 0.8 + 0.5 + 0.3 + 0.2 + 0.2); the early feelings (Rage and three +0.3 feelings, Love among them);
 * the biggest (Rage, Shame, Pride, Abandon: 5 Strain and 8 HP). */
export const SM = { stage1: 1.0, stage4: 1.6, steady: 2.0, early: 2.2, biggest: 3.2 };
export interface InvRow { school: string; what: string; cost: string; targets: string; before: number; now: number; pctBefore: number; pctNow: number; note?: string }
export function unitOf(build: string, variant: string, level: number) {
  const st = startFight({ pcs: [{ build, variant: variant as any, level }], foes: [{ tier: 'soldier' }], map: 'open', seed: 'INV' });
  return { g: st.g, u: st.g.combat.units.find((q: any) => q.side === 'pc'), c: st.g.characters.c1 };
}
const hymnOf = (id: string) => { for (const p of Object.values(FAITH_PATRON) as any[]) for (const h of p.hymns || []) if (h.id === id) return h; return null; };
const ev = (e: any, op: string): number => { const f = (l: any[]): any => { for (const q of l || []) { if (q.op === op && typeof q.value === 'number') return q.value; const n = f(q.effects); if (n != null) return n; } return null; }; return f(e?.effects) ?? 0; };
/** Every heal and shield one reference caster has at one level: before rules 1.20 and now, in HP on a plain target (no
 * Camaraderie or Conscience, Normal air) and as a percent of one Soldier-turn. */
export function inventory(build: string, variant: string, level: number, st = SOLDIER_TURN[level]): InvRow[] {
  const { g, u, c } = unitOf(build, variant, level), m = u.mg || {}, lf = mendFactor(level), rows: InvRow[] = [];
  const add = (school: string, what: string, cost: string, targets: string, before: number, now: number, note?: string) => rows.push({ school, what, cost, targets, before: Math.round(before), now: Math.round(now), pctBefore: pct(before, st), pctNow: pct(now, st), ...(note ? { note } : {}) });
  if (m.evoker || (m.words || []).length) {
    const s = (m.sigilBoon ?? m.sigilMult ?? 1) * (m.healMult || 1), mend = (SIGIL.mend as any).heal, ward = (SIGIL.ward as any).shield, rp = 0.9, cond = 1.5, spread = 0.6;
    add('Sigil', 'MEND · SEEK (2 glyphs)', 'about 4 AP, 5 charge', '1', OLD.mend * s, mend * s * lf);
    add('Sigil', 'MEND · CONDENSE · SEEK (3 glyphs)', 'about 5.5 AP, 6 charge', '1', OLD.mend * cond * s, mend * cond * s * lf);
    add('Sigil', 'MEND · MEND · CONDENSE · SEEK (the full Line)', 'about 6.5 AP over 1.1 to 1.6 turns, 9 charge', '1', OLD.mend * 2 * rp * cond * s, mend * 2 * rp * cond * s * lf);
    add('Sigil', 'MEND · SPREAD · SEEK (each ally within 2 of where it lands)', 'about 5.5 AP, 7 charge', 'each in a 5 × 5', OLD.mend * spread * s, mend * spread * s * lf);
    add('Sigil', 'WARD · SEEK (2 glyphs)', 'about 4 AP, 4 charge', '1', OLD.ward * s, ward * s * lf);
    add('Sigil', 'WARD · WARD · CONDENSE · SEEK (the full Line)', 'about 6.5 AP over 1.1 to 1.6 turns, 7 charge', '1', OLD.ward * 2 * rp * cond * s, ward * 2 * rp * cond * s * lf);
  }
  if (m.emanator || (m.designs || []).length) {
    const mend: any = { id: 'x', school: 'buff', option: 'heal', modules: [] }, aura: any = { ...mend, modules: ['aura'] }, inv: any = { id: 'y', school: 'damage', modules: ['inverse'] }, invWave: any = { ...inv, modules: ['inverse', 'wave'] }, bolt: any = { id: 'z', school: 'damage', modules: [] };
    const hg = m.healMult || 1, sm = m.soulMult || 1, oldDmg = (k: number, f = 1) => OLD.damageBase * sm * k * f;
    const H = (d: any, k: number) => W(g, () => outburstHeal(m, d, k)), L = (d: any, k: number, lone = false, area = false) => W(g, () => loveHeal(m, d, k, lone, area));
    add('Outburst', 'Buff heal, stage 1 (the quick heal)', '3 AP, 20 MP, 1 Strain', '1', OLD.buff * hg * SM.stage1, H(mend, SM.stage1));
    add('Outburst', 'Buff heal, stage 4, plain Pumps', '6 AP, 20 MP, 1 Strain', '1', OLD.buff * hg * SM.stage4, H(mend, SM.stage4));
    add('Outburst', 'Buff heal, steady (Rage and Love: a new caster)', '6 AP, 20 MP, 2 Strain', '1', OLD.buff * hg * SM.steady + oldDmg(SM.steady) * OLD.loveOfPower, H(mend, SM.steady) + L(mend, SM.steady, false, true));
    add('Outburst', 'Buff heal, the early feelings (Rage, Love and two more)', '6 AP, 20 MP, 2 Strain', '1', OLD.buff * hg * SM.early + oldDmg(SM.early) * OLD.loveOfPower, H(mend, SM.early) + L(mend, SM.early, false, true));
    add('Outburst', 'Buff heal, the biggest (Rage, Shame, Pride, Abandon)', '6 AP, 20 MP, 6 Strain, 8 HP', '1', OLD.buff * hg * SM.biggest, H(mend, SM.biggest));
    add('Outburst', 'Buff heal in an Aura, steady (each ally next to you, and you)', '6 AP, 35 MP, 2 Strain', 'each', OLD.buff * hg * SM.steady + oldDmg(SM.steady, OLD.formMult.aura) * OLD.loveOfPower, H(aura, SM.steady) + L(aura, SM.steady, false, true));
    add('Outburst', 'Love on a Damage Outburst: an ally in the shape (steady)', 'a feeling: no AP beyond the Pump', 'each ally in the shape', oldDmg(SM.steady) * OLD.loveOfPower, L(bolt, SM.steady));
    add('Outburst', 'Love on a Damage Outburst, no ally in the shape (steady)', 'a feeling', '1', oldDmg(SM.steady) * OLD.loneLoveOfPower, L(bolt, SM.steady, true));
    add('Outburst', 'Inverse shield, stage 1', '3 AP, 30 MP, 1 Strain', '1', oldDmg(SM.stage1) * OLD.inverseOfDamage, W(g, () => inverseShield(m, inv, SM.stage1)));
    add('Outburst', 'Inverse shield, steady', '6 AP, 30 MP, 2 Strain', '1', oldDmg(SM.steady) * OLD.inverseOfDamage, W(g, () => inverseShield(m, inv, SM.steady)));
    add('Outburst', 'Inverse shield in a Wave, steady', '6 AP, 45 MP, 2 Strain', 'each', oldDmg(SM.steady, OLD.formMult.wave) * OLD.inverseOfDamage, W(g, () => inverseShield(m, invWave, SM.steady)));
    add('Outburst', 'Shell (a shield on you with any Release, steady)', 'a module: 10 MP, a slot', 'you', oldDmg(SM.steady) * OLD.shellOfDamage, W(g, () => shellShield(m, bolt, SM.steady)));
    add('Outburst', 'Drain (a quarter of the HP a steady Damage Outburst takes; it lands 65% of the time)', 'the Damage school at ×0.8', 'you', oldDmg(SM.steady) * 0.8 * 0.25 * 0.65, oldDmg(SM.steady) * 0.8 * 0.25 * 0.65, 'not changed: a share of damage');
    if (BUILD[build].classId === 'bard') { const k = (CLASS_MOVE_POOL['bard.mend'] as any)?.heal_base ?? 9; add('Class', 'Bard, Mend (rank II): the steady Buff heal with it', 'as the heal', '1', (OLD.bardMend * hg * SM.steady + oldDmg(SM.steady) * OLD.loveOfPower), (H(mend, SM.steady) + L(mend, SM.steady, false, true)) * k / BUFF_HEAL, 'from Insight 5 and level 6'); }
    const ws = ev(CLASS_MOVE_POOL['guardian.will_shield'], 'shield') || 12;
    add('Class', 'Guardian, Will Shield (with this caster\'s Healing given)', '3 AP, 20 MP, 1 Strain', '1', OLD.willShield * hg, ws * hg * lf);
  }
  if (c.belief?.patron || c.belief?.kind === 'faithful') {
    const bp = W(g, () => blessingPower(c)), dev = W(g, () => devotionNow(c)), w = (id: string) => (WHISPERS as any[]).find((q) => q.id === id);
    add('Prayer', 'Whisper: Health', '1 AP, once a turn', '1', OLD.health * bp, ev(w('health'), 'heal') * bp * lf);
    add('Prayer', 'Whisper: Protection (a shield)', '1 AP, once a turn', '1', OLD.protection * bp, ev(w('protection'), 'shield') * bp * lf);
    add('Prayer', 'Hymn I: Warm Hands (Mother Ember)', '3 AP, on a cooldown', '1', OLD.warmHands * bp, ev(hymnOf('warm_hands'), 'heal') * bp * lf);
    add('Prayer', 'Hymn I: Saint\'s Shield (Nerukhan)', '3 AP, on a cooldown', '1', OLD.saintsShield * bp, ev(hymnOf('saints_shield'), 'shield') * bp * lf);
    add('Prayer', 'Hymn I: Coin for the Ferry (a Downed ally stands up with)', '3 AP, on a cooldown', '1 Downed', OLD.coin * bp, ev(hymnOf('coin_for_the_ferry'), 'heal') * bp * lf);
    add('Prayer', 'Hymn II: Hearthlight (each ally starting a turn in a 3 × 3, for 3 rounds)', '3 AP, on a cooldown', 'each, each round', OLD.hearthlight * bp, ev(hymnOf('hearthlight'), 'heal') * bp * lf, 'from Devotion 5');
    add('Prayer', 'Hymn III: Absolution (every harmful condition ends, and a heal)', '3 AP, on a cooldown', '1', OLD.absolution * bp, ev(hymnOf('absolution'), 'heal') * bp * lf, 'from Devotion 7');
    add('Prayer', 'Mother Ember\'s intervention (an ally under a quarter HP)', 'no action; once a fight, twice from Devotion 7', '1', (OLD.intervention[0] + OLD.intervention[1] * dev) * bp, W(g, () => interventionHeal(c, bp)), 'Devotion ' + dev);
    add('Prayer', 'Miracle: Everyone Home, the shield on each', 'once a session', 'each', OLD.everyoneHomeShield * bp, ev((FAITH_PATRON.mother_ember as any).miracle, 'shield') * bp * lf, 'the heal to full is not changed');
  }
  return rows;
}
export const invNums = (build: string, variant: string, level: number) => { const { u, c, g } = unitOf(build, variant, level), m = u.mg || {}; return { hp: u.maxHp, sigil: m.sigilMult, soul: m.soulMult, heal: m.healMult, blessing: c.belief ? W(g, () => blessingPower(c)) : null, level: mendFactor(level) }; };
/** One build's inventory at every level, as a table (HP now · percent of a Soldier-turn; before in brackets). */
export function invTable(build: string, variant: string, levels = H_LEVELS): string {
  const per = levels.map((lv) => inventory(build, variant, lv)), n = per[0].length;
  let s = '| Source | Cost | On | ' + levels.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|---|---|' + levels.map(() => '---').join('|') + '|\n';
  for (let i = 0; i < n; i++) { const r = per[0][i]; s += '| ' + r.school + ': ' + r.what + (r.note ? ' (' + r.note + ')' : '') + ' | ' + r.cost + ' | ' + r.targets + ' | ' + per.map((p) => p[i].now + ' · **' + p[i].pctNow + '%** (was ' + p[i].before + ' · ' + p[i].pctBefore + '%)').join(' | ') + ' |\n'; }
  return s;
}
void MODULE; void SCHOOL; void STAGE_MULT; void BOON_AREA;
