// @ts-nocheck (a recording tool; see harness.ts)
// THE ITEM-OPS TABLE (engine foundations 3, item ops: docs/design/handoffs/engine-foundations-3-item-ops.md). Recorded on
// the unmodified engine BEFORE any item was moved from TypeScript into data, so that every item converted afterwards
// has to give the same lines.
//
// The damage and rules tables read an item through the probes that change a number (a shot, a blow, a hit taken). An
// item that gives AP at a turn's start, cancels a push, floors a lethal blow, shortens a condition or makes an action
// cheaper is invisible there. Here every live item (each perk at each tier, each trait, each base class at each rank)
// is put in every SITUATION below, on the same fight as the item sweep (record.ts itemFight), and the line is what
// changed on every unit: HP, shield, AP, banked tiles, tile, conditions, Prone / Hidden / Bleeding / Dazed / Stunned,
// class resources, Sigil and Soul meters, movement, Downed, dead; the fight's order and round; the holder's Echo.
// A line is kept only when it differs from the same situation on the same sheet without the item: the line IS the
// item's doing. Every line has a twin in itemops.log.json: the log lines the situation wrote (the words).
//
//   GOLDEN_RECORD=1 npx vitest run --root packages/engine test/golden-itemops      both files, ON PURPOSE ONLY
//   GOLDEN_RECORD=log ...                                                           the words only
import { A, W, copy, dice, HIT, CRIT, fightSpec, place, turn, units, pcs, foes, charOf } from './harness';
import { EVEN, tiersOf } from './record';

const FLAGS = ['prone', 'hidden', 'downed', 'dead', 'surrendered', 'braced'];
const NUMS = ['bleed', 'dazedNext', 'stunnedNext'];
const r2 = (v: any) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
function unitState(cb: any, u: any): Record<string, string> {
  const s: Record<string, string> = {
    hp: u.hp + '/' + u.maxHp, sh: String(u.shield || 0), ap: String(r2(u.ap)), bank: String(r2(u.bank || 0)), pos: String(u.pos),
    conds: Object.keys(u.conds || {}).sort().map((k) => k + (typeof u.conds[k] === 'object' ? '' : u.conds[k])).join('.'),
    mv: String(r2(u.movement)), res: JSON.stringify(u.res || {}), inj: String((u.injuries || []).length),
  };
  FLAGS.forEach((k) => { if (u[k]) s[k] = '1'; });
  NUMS.forEach((k) => { if (u[k]) s[k] = String(u[k]); });
  if (u.mg) s.mg = [u.mg.charge, u.mg.strain, u.mg.flux, u.mg.mp].map(r2).join('/');
  if (u.apNext) s.apNext = String(u.apNext);
  return s;
}
function snap(g: any) {
  const cb = g.combat, out: Record<string, any> = { order: (cb.order || []).join(','), round: String(cb.round), turn: String(cb.turn), over: cb.over ? '1' : '' };
  for (const u of cb.units) out['u:' + u.id] = unitState(cb, u);
  const c = g.characters?.c1; out.echo = c ? String(c.echo ?? '') : '';
  return { s: out, log: cb.log.length, ids: cb.units.map((u: any) => u.id) };
}
const lab = (cb: any, id: string) => { const u = cb.units.find((x: any) => x.id === id); if (!u) return id; const side = cb.units.filter((x: any) => x.side === u.side && !x.companion && !x.summoned), i = side.indexOf(u); return i >= 0 ? (u.side === 'pc' ? 'P' : 'F') + (i + 1) : 'X' + (cb.units.indexOf(u) + 1); };
function diff(b: any, a: any, cb: any): string {
  const out: string[] = [];
  for (const k of ['order', 'round', 'turn', 'over', 'echo']) if (b.s[k] !== a.s[k]) out.push(k + ':' + b.s[k] + '>' + a.s[k]);
  for (const k of Object.keys(a.s)) {
    if (!k.startsWith('u:')) continue;
    const was = b.s[k], now = a.s[k], l = lab(cb, k.slice(2));
    if (!was) { out.push(l + ' new ' + Object.entries(now).map(([f, v]) => f + v).join(' ')); continue; }
    const p: string[] = [];
    for (const f of new Set([...Object.keys(was), ...Object.keys(now)])) if (was[f] !== now[f]) p.push(f + ':' + (was[f] ?? '-') + '>' + (now[f] ?? '-'));
    if (p.length) out.push(l + ' ' + p.join(' '));
  }
  for (const k of Object.keys(b.s)) if (k.startsWith('u:') && !a.s[k]) out.push(lab(cb, k.slice(2)) + ' gone');
  return out.join(', ');
}
/** Play a situation on a copy of the fight: f gets the copy (the game bound, the dice given). The state line and the words. */
function play(g0: any, f: (g: any, cb: any) => any, d: any = HIT, seed = 4242): { line: string; words: string } {
  const g = copy(g0); g.rng.state = seed;
  const b = snap(g); let err = '';
  try { const r = dice(d, () => W(g, () => f(g, g.combat))); if (typeof r === 'string' && r) err = 'REFUSED ' + r.slice(0, 60); } catch (e: any) { err = (e?.name === 'RuleError' ? 'REFUSED ' : 'THREW ') + String(e?.message || e).replace(/\s+/g, ' ').slice(0, 80); }
  const cb = g.combat; if (!cb) return { line: err || 'over', words: '' };
  const a = snap(g);
  return { line: (err ? err + ' | ' : '') + diff(b, a, cb), words: cb.log.slice(b.log).map((l: string) => String(l).slice(0, 200)).join(' / ') };
}
const reduce = (g: any, action: any) => { const g1 = A.apply(g, action, 'host'); Object.assign(g, g1); return null; };
const unit = (cb: any, i: number, side = 'pc') => cb.units.filter((u: any) => u.side === side && !u.companion)[i];
const P = (cb: any) => unit(cb, 0), Q = (cb: any) => unit(cb, 1), F = (cb: any) => unit(cb, 0, 'foe'), FAR = (cb: any) => unit(cb, 1, 'foe');
/** An enemy's attack (its turn made, its AP given). */
const foeAttack = (cb: any, rng: any, a: any, t: any, mode = 'shot') => { a.ap = 9; cb.turn = cb.order.indexOf(a.id); return A.resolveAttack(cb, rng, a, t, mode, null).refused || null; };
const MISS = { die: 2, hit: false, spell: true };
const COST_SITES = ['attack', 'reload', 'swap_weapon', 'shove', 'break', 'vent', 'swap_core', 'stim', 'stabilise', 'prone', 'stand', 'hide', 'overwatch', 'brace', 'analyze', 'disengage', 'sprint', 'pickup', 'clear', 'load'];

/** THE SITUATIONS: what each one does, on the item sweep's fight (the holder P1 at 3,6 at 60% HP on its own turn with 9
 * AP; the Squadmate P2 at 2,6 at 40%; a Soldier F1 adjacent at 4,6; a second Soldier F2 at 7,6; an Elite F3 at 7,9). */
export const SITUATIONS: [string, (g: any, cb: any) => any, any?][] = [
  ['turn-again', (g, cb) => { cb.round = 2; cb.turn = cb.order.indexOf(P(cb).id); A.beginTurn(cb, g.rng); }],
  ['turn-again-bloodied', (g, cb) => { P(cb).hp = Math.ceil(P(cb).maxHp * 0.3); cb.round = 2; cb.turn = cb.order.indexOf(P(cb).id); A.beginTurn(cb, g.rng); }],
  ['end-turn', (g) => reduce(g, { type: 'combat/end-turn', unitId: P(g.combat).id })],
  ['round', (g, cb) => { for (let i = 0; i < 6 && !cb.over; i++) { const u = cb.units.find((x: any) => x.id === cb.order[cb.turn]); A.endTurn(cb, g.rng); if (u && cb.order[cb.turn] === P(cb).id) break; } }],
  ['shot', (g, cb) => { const u = P(cb); return A.resolveAttack(cb, g.rng, u, FAR(cb), 'shot', charOf(g, u)).refused || null; }],
  ['shot-crit', (g, cb) => { const u = P(cb); return A.resolveAttack(cb, g.rng, u, FAR(cb), 'shot', charOf(g, u)).refused || null; }, CRIT],
  ['shot-miss', (g, cb) => { const u = P(cb); return A.resolveAttack(cb, g.rng, u, FAR(cb), 'shot', charOf(g, u)).refused || null; }, MISS],
  ['blow', (g, cb) => { const u = P(cb); return A.resolveAttack(cb, g.rng, u, F(cb), 'melee', charOf(g, u)).refused || null; }],
  ['blow-miss', (g, cb) => { const u = P(cb); return A.resolveAttack(cb, g.rng, u, F(cb), 'melee', charOf(g, u)).refused || null; }, MISS],
  ['shot-kill', (g, cb) => { const u = P(cb), t = FAR(cb); t.hp = 1; return A.resolveAttack(cb, g.rng, u, t, 'shot', charOf(g, u)).refused || null; }],
  ['blow-kill', (g, cb) => { const u = P(cb), t = F(cb); t.hp = 1; return A.resolveAttack(cb, g.rng, u, t, 'melee', charOf(g, u)).refused || null; }],
  ['shot-primed', (g, cb) => { const u = P(cb), t = FAR(cb); u.hp = Math.ceil(u.maxHp * 0.2); t.hp = Math.ceil(t.maxHp / 5); A.applyCond(cb, g.rng, u, t, 'marked', 2, undefined, { skipSave: true }); return A.resolveAttack(cb, g.rng, u, t, 'shot', charOf(g, u)).refused || null; }],
  ['shot-attack', (g) => reduce(g, { type: 'combat/attack', unitId: P(g.combat).id, targetId: FAR(g.combat).id, mode: 'shot' })],
  ['aimed-attack', (g) => reduce(g, { type: 'combat/attack', unitId: P(g.combat).id, targetId: FAR(g.combat).id, mode: 'aimed' })],
  ['taken', (g, cb) => foeAttack(cb, g.rng, FAR(cb), P(cb))],
  ['taken-crit', (g, cb) => foeAttack(cb, g.rng, FAR(cb), P(cb)), CRIT],
  ['taken-miss', (g, cb) => foeAttack(cb, g.rng, FAR(cb), P(cb)), MISS],
  ['taken-blow', (g, cb) => foeAttack(cb, g.rng, F(cb), P(cb), 'melee')],
  ['taken-lethal', (g, cb) => { P(cb).hp = 3; return foeAttack(cb, g.rng, FAR(cb), P(cb)); }],
  ['taken-twice', (g, cb) => { foeAttack(cb, g.rng, FAR(cb), P(cb)); return foeAttack(cb, g.rng, F(cb), P(cb), 'melee'); }],
  ['taken-blast', (g, cb) => { A.hurtUnit(P(cb), 40, false, cb, 'explosion', F(cb)); }],
  ['taken-fire', (g, cb) => { A.harm(cb, g.rng, F(cb), P(cb), 30, 'elemental', 'fire'); }],
  ['ally-taken', (g, cb) => foeAttack(cb, g.rng, FAR(cb), Q(cb))],
  ['ally-lethal', (g, cb) => { Q(cb).hp = 3; return foeAttack(cb, g.rng, FAR(cb), Q(cb)); }],
  ['ally-kills', (g, cb) => { const q = Q(cb), t = FAR(cb); t.hp = 1; q.ap = 9; cb.turn = cb.order.indexOf(q.id); return A.resolveAttack(cb, g.rng, q, t, 'shot', charOf(g, q)).refused || null; }],
  ...['fear', 'nausea', 'bleeding', 'prone', 'stunned', 'ldebuff', 'weakened', 'slowed', 'shaken', 'blinded'].map((id) => ['cond-in-' + id, (g: any, cb: any) => { A.applyCond(cb, g.rng, F(cb), P(cb), id); }] as [string, any]),
  ['cond-ally-fear', (g, cb) => { A.applyCond(cb, g.rng, F(cb), Q(cb), 'fear'); }],
  ...['shaken', 'weakened', 'ldebuff', 'marked', 'slowed'].map((id) => ['cond-out-' + id, (g: any, cb: any) => { A.applyCond(cb, g.rng, P(cb), F(cb), id); }] as [string, any]),
  ['cond-end', (g, cb) => { A.applyCond(cb, g.rng, F(cb), P(cb), 'weakened', 2, undefined, { skipSave: true }); A.endCond(P(cb), 'weakened', cb); }],
  ['pushed', (g, cb) => { A.displace(cb, g.rng, P(cb), { away: '3,8', tiles: 2 }, { by: F(cb), how: 'push', source: 'golden' }); }],
  ['pulled', (g, cb) => { A.displace(cb, g.rng, P(cb), { toward: FAR(cb).pos, tiles: 2 }, { by: FAR(cb), how: 'pull', source: 'golden' }); }],
  ['heal-in', (g, cb) => { A.healUnit(cb, P(cb), 20, Q(cb), 'stim'); }],
  ['heal-out', (g, cb) => { A.healUnit(cb, Q(cb), 20, P(cb), 'stim'); }],
  ['heal-in-magic', (g, cb) => { A.heal(P(cb), 20, cb, Q(cb), 'soul'); }],
  ['shield-in', (g, cb) => { A.grantShield(cb, P(cb), 20, Q(cb)); }],
  ['shield-out', (g, cb) => { A.grantShield(cb, Q(cb), 20, P(cb)); }],
  ['move', (g) => reduce(g, { type: 'combat/move', unitId: P(g.combat).id, to: '3,9' })],
  ['move-charge', (g) => reduce(g, { type: 'combat/move', unitId: P(g.combat).id, to: '6,6' })],
  ['move-far', (g, cb) => { FAR(cb).pos = '12,6'; return reduce(g, { type: 'combat/move', unitId: P(g.combat).id, to: '11,6' }); }],
  ['reload', (g, cb) => { P(cb).ammo = 0; return reduce(g, { type: 'combat/reload', unitId: P(g.combat).id }); }],
  ['swap', (g, cb) => { { const c = charOf(g, P(cb)); c.weapon = 'service_pistol'; P(cb).weapon = 'service_pistol'; c.offHand = { id: 'service_pistol' }; } return reduce(g, { type: 'combat/swap', unitId: P(g.combat).id, from: 'off' }); }],
  ['prone', (g) => reduce(g, { type: 'combat/prone', unitId: P(g.combat).id })],
  ['hide', (g) => reduce(g, { type: 'combat/hide', unitId: P(g.combat).id })],
  ['shove', (g, cb) => reduce(g, { type: 'combat/shove', unitId: P(g.combat).id, targetId: F(cb).id })],
  ['prices', (g, cb) => { const u = P(cb), out: string[] = []; for (const s of COST_SITES) { try { out.push(s + A.price({ cb, u }, s).ap); } catch { out.push(s + '?'); } } cb.log.push('PRICES ' + out.join(' ')); }],
  // added before batch 2 (the items it moves needed them; recorded on the engine before they moved)
  ['prices2', (g, cb) => { const u = P(cb), out: string[] = []; for (const s of A.COST_SITE_IDS) { if (COST_SITES.includes(s)) continue; try { out.push(s + A.price({ cb, u }, s).ap); } catch { out.push(s + '?'); } } cb.log.push('PRICES ' + out.join(' ')); }],
  ['stats', (g, cb) => { const u = P(cb), out: string[] = []; for (const s of [...Object.keys(A.STATS), 'one_hand_heavy', 'throw_range', 'reactions', 'never_jams', 'push_tiles', 'carry', 'move', 'vision']) { const q = A.statQuery({ u, cb }, s); if (q.add || q.mult !== 1) out.push(s + ':' + q.add + 'x' + q.mult); } cb.log.push('STATS ' + out.join(' ')); }],
  ['glyph-costs', (g, cb) => { const u = P(cb); if (!u.mg) return; const out: string[] = []; for (const w of ['fire', 'shock', 'freeze', 'stone', 'acid', 'spark', 'gale', 'blind', 'slow', 'muddle']) { try { const c = A.glyphCost(cb, u, w, true); out.push(w + ':' + c.ap + '/' + c.charge + '/' + c.flux); } catch { out.push(w + '?'); } } cb.log.push('GLYPHS ' + out.join(' ')); }],
  ...['fear', 'nausea'].map((id) => ['cond-in-' + id + '-nosave', (g: any, cb: any) => { A.applyCond(cb, g.rng, F(cb), P(cb), id, undefined, undefined, { skipSave: true }); }] as [string, any]),
  ['ally-afraid-turn', (g, cb) => { A.applyCond(cb, g.rng, F(cb), Q(cb), 'fear', 2, undefined, { skipSave: true }); cb.turn = cb.order.indexOf(Q(cb).id); A.beginTurn(cb, g.rng); }],
  ['taken-bloodied', (g, cb) => { P(cb).hp = Math.ceil(P(cb).maxHp * 0.3); return foeAttack(cb, g.rng, FAR(cb), P(cb)); }],
  ['taken-then-turn', (g, cb) => { foeAttack(cb, g.rng, FAR(cb), P(cb)); cb.round = 2; cb.turn = cb.order.indexOf(P(cb).id); A.beginTurn(cb, g.rng); }],
];

/** The item sweep's fight (record.ts itemFight), with what a situation needs on the ground: ammo in hand, a second weapon. */
export function opsFight(spec: any) {
  const g = fightSpec([{ ...EVEN(), ...spec }, { name: 'Squadmate', ...EVEN() }], [{ tier: 'soldier', name: 'Soldier' }, { tier: 'soldier', name: 'Far soldier' }, { tier: 'elite', name: 'Elite' }], { level: 6, seed: 'item' });
  const [u, al] = pcs(g), [f, far, el] = foes(g);
  place(g, [[u, '3,6'], [f, '4,6'], [al, '2,6'], [far, '7,6'], [el, '7,9']]); turn(g, u, 9);
  al.hp = Math.ceil(al.maxHp * 0.4); u.hp = Math.ceil(u.maxHp * 0.6);
  return g;
}
/** Every situation on one fight: name → { line, words }. 'start' is the fight itself (what the item changed by being held). */
export function situations(g: any): Record<string, { line: string; words: string }> {
  const out: Record<string, { line: string; words: string }> = {};
  const s = snap(g); out.start = { line: Object.entries(s.s).filter(([k]) => k !== 'echo' || s.s.echo).map(([k, v]) => k + '=' + (typeof v === 'object' ? Object.entries(v).map(([f, x]) => f + x).join(' ') : v)).join('; '), words: '' };
  for (const [name, f, d] of SITUATIONS) out[name] = play(g, f, d);
  return out;
}
/** The live holders: every perk at each tier, every trait, each of the nine classes at each rank. */
export function holders(): { key: string; spec: any; base: any }[] {
  const out: { key: string; spec: any; base: any }[] = [];
  for (const p of A.PERKS) for (const tier of tiersOf(p)) {
    const core = A.SKILL[(p.skills || [])[0]]?.core || '', classId = /mind/i.test(core) ? 'mage' : /soul/i.test(core) ? 'channeler' : 'fighter';
    const base = { classId, ...(classId === 'mage' ? { kit: 'sigil' } : classId === 'channeler' ? { kit: 'soul' } : {}) };
    out.push({ key: 'perk/' + p.id + '@' + tier, spec: { ...base, perks: { [p.id]: tier } }, base });
  }
  for (const t of A.TRAITS) out.push({ key: 'trait/' + t.id, spec: { traits: [t.id] }, base: {} });
  for (const cls of Object.keys(A.BASE_CLASS)) for (const [rank, lv, pts] of [['I', 3, 5], ['II', 6, 6], ['III', 12, 9]] as const) {
    const at = A.CLASS[cls].attribute, kit = ['mage', 'trickster', 'infiltrator'].includes(cls) ? 'sigil' : ['channeler', 'bard', 'guardian'].includes(cls) ? 'soul' : 'soldier';
    const base = { level: lv, kit, attrs: { ...EVEN().attrs, [at]: pts } };
    out.push({ key: 'class/' + cls + '@' + rank, spec: { ...base, classId: cls }, base });
  }
  return out;
}
/** The table: for each holder, each situation whose line differs from the same sheet without the item. */
export function recordItemOps(only?: (key: string) => boolean): { state: Record<string, string>; log: Record<string, string> } {
  const state: Record<string, string> = {}, log: Record<string, string> = {}, bases: Record<string, any> = {};
  const baseOf = (spec: any) => (bases[JSON.stringify(spec)] ||= situations(opsFight(spec)));
  for (const h of holders()) {
    if (only && !only(h.key)) continue;
    const base = baseOf(h.base);
    let mine: any; try { mine = situations(opsFight(h.spec)); } catch (e: any) { state[h.key + '/setup'] = 'THREW ' + String(e?.message || e).slice(0, 80); continue; }
    for (const [k, v] of Object.entries(mine) as [string, any][]) if (v.line !== base[k].line || v.words !== base[k].words) { state[h.key + '/' + k] = v.line; log[h.key + '/' + k] = v.words; }
  }
  return { state, log };
}
