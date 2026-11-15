// @ts-nocheck (a recording tool; see harness.ts)
// THE MODS PINS (build plan 0.29, docs/design/proposals/2026-11-build-plan-0.29.md section 4.1 "P1 pins"; ENGINE-GUIDE
// rule 3 "Pin, then move"). Recorded on feature/0.29 (which holds 0.28.1's Forge fit) BEFORE any mod or recoil code
// moved. EVERY LINE HERE IS TODAY'S BEHAVIOUR, NOT A RULING: a pin says what the engine does, right or wrong (the mods
// report, docs/design/proposals/2026-11-mods-today.md section 5, lists what is wrong with it).
//
// The pins the plan moves ON PURPOSE (re-record them in the commit that moves them, and name them there):
//   lane L1 (Recoil 2.0 + mods to data, plan 4.2):
//     mod/mod_compensator@...           the compensator takes ALL recoil today (shots x 0); it becomes -1 a shot
//     mod/mod_extended_mag@... and the `spares/...` lines   spare magazines stay at the base size today, and a fight
//                                       starts with the base magazine loaded unless c.loaded says more (so on these
//                                       steps only the start line differs)
//     mod/mod_scope@...                 the scope's +1 is named after the weapon skill today (the term's label)
//     mod/mod_suppressor@...            the -2 lands on every non-melee weapon attack of the unit today (a thrown frag
//                                       grenade is untouched); its silence also keeps a gun-melee blow from revealing
//     every recoil term (`recoil`) on a 2nd+ shot, as Recoil 2.0 makes recoil a weapon field
//     mod/mod_foregrip@...              inert today (built: false); Recoil 2.0 redesigns it
//   lane L3 (mods in Survival, plan 10.B5): `offhand/...` (a mod on an off-hand gun does nothing today: the paired
//     shot runs with no mods), `fit/run/gun-nut-extra-mod` (the extra slot's story/perk is refused in a run today) and
//     `fit/story/gun-nut-*`, the off-hand copy
//   lane L6 (melee damage from Strength / Agility, plan 10.B1): `melee/...` (flat across the attribute today, rules 1.26)
// Any other line that moves is a bug in the change, not a reason to record (ENGINE-GUIDE rule 3).
//
// HOW A LINE IS READ. Each step is played on a copy of one fight, the same seed, the same forced dice (harness.ts):
//   pv:<mode>@<tiles>   previewAttack: ap, toHit, pct, the to-hit terms (label:value, the dice breakdown), the damage
//                       (base + flat, the multipliers by name, the total)
//   act:<what>          the reducer action: the damage tap (o: / i: / =>, harness.ts) | what changed on the attacker
//                       (ap, ammo, mags, loose, hidden, heat, shots this turn) and on the target (conditions, bleed)
// `bare/<weapon>/<step>` is the weapon with no mod; `mod/<mod>@<weapon>/<step>` is kept only where it differs from
// bare (the line IS the mod's doing); `mod/<mod>@<weapon>/#same` counts the steps that did not differ (a mod the engine
// does not run shows every step but the start the same: "INERT"). The log twin (golden/mods.log.json) holds the words of each step.
//
//   GOLDEN_RECORD=1 npx vitest run --root packages/engine test/golden-mods      both files, ON PURPOSE ONLY
//   GOLDEN_RECORD=log ...                                                        the words only
import { A, W, copy, HIT, CRIT, place, noShare, turn, tidy, pcs, foes, act as tapAct } from './harness';
import { EVEN } from './record';
import { storyWith } from '../helpers/perkfight';
import { survivalRoom, startRun, ownerOf } from '../helpers/survival';

const MISS = { die: 2, hit: false, spell: true };
const r2 = (v: any) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
const short = (s: any, n = 90) => String(s?.message ?? s).replace(/\s+/g, ' ').slice(0, n);
const isRule = (e: any) => e instanceof A.RuleError || e?.name === 'RuleError';

// ---------- the room and the fight ----------
/** A pack line for an item or a mod (what a shop or a pick puts in the pack). */
const line = (id: string, extra: any = {}) => (A.WEAPON[id] ? { id, name: A.WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...extra } : { id, item: id, name: A.ITEM[id]?.name || id, qty: 1, kind: 'tool', ...extra });
/** Give a line to c1's pack; its index. */
function give(g: any, id: string, extra: any = {}): number { const c = g.characters.c1; c.pack = [...A.packOf(c), line(id, extra)]; return c.pack.length - 1; }
/** Through the reducer; the new state, or the refusal's words. */
function tryApply(g: any, a: any, by = 'host'): { g: any; err: string } {
  try { return { g: A.apply(g, a, by), err: '' }; } catch (e: any) { return { g, err: (isRule(e) ? 'REFUSED ' : 'THREW ') + short(e) }; }
}
export interface Spec { weapon: string; mods?: string[]; attrs?: Record<string, number>; skills?: Record<string, number>; prep?: (g: any) => void }
/** A story room (c1 at level 6, every skill and attribute 5) holding `weapon`, each mod fitted the free way (gear/mod,
 * outside a run); then a fight on the golden ground: the holder P1 at 3,6, a Soldier F1 next to it (4,6), a Soldier F2
 * 4 tiles off (7,6), a Soldier F3 12 tiles off (15,6), a Soldier F4 20 tiles off (23,6). Its turn, 9 AP. */
export function modRoom(spec: Spec): any {
  const base = EVEN();
  const s = storyWith([{ ...base, attrs: { ...base.attrs, ...(spec.attrs || {}) }, skills: { ...base.skills, ...(spec.skills || {}) }, weapon: spec.weapon } as any], 'MODS');
  let g: any = s.g;
  for (const m of spec.mods || []) { const r = tryApply(g, { type: 'gear/mod', charId: 'c1', idx: give(g, m) }); if (r.err) throw new Error('fit ' + m + ' on ' + spec.weapon + ': ' + r.err); g = r.g; }
  spec.prep?.(g);
  return g;
}
export function modFight(spec: Spec): any {
  let g = modRoom(spec);
  const foe = (n: string) => ({ name: n, tier: 'soldier', weapon: 'hellraiser_service_rifle', no_surrender: true });
  g = A.apply(g, { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Mods', map: 'golden', difficulty: 'standard', level: 6, enemies: [foe('Near'), foe('Mid'), foe('Far'), foe('Farthest')] } } }, 'host');
  tidy(g); noShare(g);
  const [u] = pcs(g), [f1, f2, f3, f4] = foes(g);
  place(g, [[u, '3,6'], [f1, '4,6'], [f2, '7,6'], [f3, '15,6'], [f4, '23,6']]); turn(g, u, 9);
  return g;
}
const P = (g: any) => pcs(g)[0];
const TGT: Record<number, number> = { 1: 0, 4: 1, 12: 2, 20: 3 };
const foeAt = (g: any, d: number) => foes(g)[TGT[d]];

// ---------- one step ----------
const termsOf = (ts: any[]) => (ts || []).filter((t) => t).map((t) => t.label + ':' + r2(t.v)).join(',');
function dmgOf(d: any): string {
  if (!d) return '-';
  return r2(d.base) + (d.terms?.length ? '+' + d.terms.map((t: any) => r2(t.v)).join('+') : '') + ' x[' + termsOf(d.mults) + ']' + (d.vs?.length ? ' vs[' + termsOf(d.vs) + ']' : '') + ' =' + r2(d.total) + (d.pierce ? ' pierce' + r2(d.pierce) : '') + ' arm' + r2(d.armour);
}
/** previewAttack on a copy (the game bound): what the to-hit and the damage are before the roll. */
function pv(g0: any, mode: string, d: number, prep?: (u: any, g: any) => void): string {
  const g = copy(g0), cb = g.combat, u = P(g), t = foeAt(g, d); prep?.(u, g);
  try {
    const p = W(g, () => A.previewAttack(cb, u, t, mode));
    return p.ok ? 'ap' + r2(p.ap) + ' hit' + r2(p.toHit) + ' vs' + p.need + ' ' + p.pct + '% [' + termsOf(p.terms) + '] dmg ' + dmgOf(p.dmg) : 'REFUSED ' + short(p.why) + ' (ap' + r2(p.ap) + ')';
  } catch (e: any) { return 'THREW ' + short(e); }
}
const UF = ['ap', 'ammo', 'loose', 'heat', 'shotsThisTurn', 'offAmmo', 'bleed'];
const UB = ['hidden', 'jammed', 'offJammed', 'prone', 'dead', 'downed'];
function uState(u: any): Record<string, string> {
  const s: Record<string, string> = { hp: String(u.hp), conds: Object.keys(u.conds || {}).sort().join('.'), mags: JSON.stringify(u.mags ?? null), mods: (u.mods || []).join('+') };
  for (const k of UF) if (u[k] != null) s[k] = String(r2(u[k]));
  for (const k of UB) if (u[k]) s[k] = '1';
  return s;
}
const lab = (cb: any, u: any) => { const side = cb.units.filter((x: any) => x.side === u.side && !x.companion && !x.summoned), i = side.indexOf(u); return i >= 0 ? (u.side === 'pc' ? 'P' : 'F') + (i + 1) : 'X' + (cb.units.indexOf(u) + 1); };
function uDiff(b: any, a: any): string {
  const out: string[] = [];
  for (const u of a.combat?.units || []) {
    const w = b.combat.units.find((x: any) => x.id === u.id); if (!w) { out.push(lab(a.combat, u) + ' new'); continue; }
    const x = uState(w), y = uState(u), p: string[] = [];
    for (const f of new Set([...Object.keys(x), ...Object.keys(y)])) if (f !== 'hp' && x[f] !== y[f]) p.push(f + ':' + (x[f] ?? '-') + '>' + (y[f] ?? '-'));
    if (p.length) out.push(lab(a.combat, u) + ' ' + p.join(' '));
  }
  return out.join(', ');
}
/** One reducer action on a copy: the tap line | the unit changes; and the words. */
function step(g0: any, mk: (g: any) => any, d: any = HIT, prep?: (g: any) => void, seed = 4242): { line: string; words: string } {
  const g = copy(g0); prep?.(g);
  let a: any; try { a = W(g, () => mk(g)); } catch (e: any) { return { line: 'THREW ' + short(e), words: '' }; }
  if (!a) return { line: 'NO ACTION (the descriptor needs more picks, or is not offered)', words: '' };
  if (typeof a === 'string') return { line: 'REFUSED ' + short(a), words: '' };
  const logAt = g.combat.log.length, r = tapAct(g, a, d, seed);
  if (!r.ok) return { line: r.line, words: '' };
  return { line: r.line + ' | ' + uDiff(g, r.g), words: (r.g.combat?.log || []).slice(logAt).map((l: string) => String(l).slice(0, 220)).join(' / ') };
}
const attack = (mode: string, d: number) => (g: any) => ({ type: 'combat/attack', unitId: P(g).id, targetId: foeAt(g, d).id, mode });
/** A row of the action list (a technique: tq:main:shot, tq:main:burst…), sent as the client sends it, at the target d tiles off. */
const row = (id: string, d: number) => (g: any) => {
  const u = P(g), t = foeAt(g, d), dsc = A.actionsFor(g, u.id, 'host').find((x: any) => x.id === id);
  if (!dsc) return null; if (!dsc.available) return dsc.why || 'not available';
  return A.sendDescriptor(g, u.id, id, { targetId: t.id }, 'host') || A.sendDescriptor(g, u.id, id, { targetId: t.id, tile: t.pos }, 'host') || A.sendDescriptor(g, u.id, id, { tile: t.pos }, 'host');
};
/** The attack rows a unit is offered with its main hand (every ranged and melee technique, the plain ones included). */
const mainRows = (g: any) => A.actionsFor(g, P(g).id, 'host').map((x: any) => x.id).filter((id: string) => /^tq:main:/.test(id) || id === 'melee');

/** Every step of a weapon (the bare weapon's list: a mod is played on the same steps). */
export function stepsFor(g: any): [string, (g: any) => { line: string; words: string }][] {
  const w = A.WEAPON[P(g).weapon], melee = A.meleeArm(w), out: [string, any][] = [];
  // what the fight's unit is built with
  out.push(['start', (x: any) => { const u = P(x); return { line: 'ammo' + u.ammo + ' mags' + JSON.stringify(u.mags ?? null) + ' loose' + (u.loose ?? '-') + ' mods' + (u.mods || []).join('+') + ' ap' + u.ap + ' attack' + u.attack + ' dex' + u.dexterity + ' reloadAp' + W(x, () => A.reloadAp(u, x.combat)) + ' bands(shot)' + A.opticBands(u, 'shot') + ' bands(aimed)' + A.opticBands(u, 'aimed') + ' magSize' + A.magazineSize(u.weapon, u.mods), words: '' }; }]);
  const modes = melee ? ['melee'] : ['shot', 'aimed', ...(w.modes || []).filter((m: string) => m === 'burst' || m === 'auto'), 'melee'];
  for (const m of modes) for (const d of m === 'melee' ? [1] : [4, 12, 20]) {
    out.push(['pv:' + m + '@' + d, (x: any) => ({ line: pv(x, m, d), words: '' })]);
    if (m !== 'melee' && m !== 'thrown') out.push(['pv:' + m + '@' + d + '#2nd', (x: any) => ({ line: pv(x, m, d, (u) => { u.shotsThisTurn = 1; u.dexterity = 0; }), words: '' })]);
  }
  if (!melee) { out.push(['pv:shot@4#4th', (x: any) => ({ line: pv(x, 'shot', 4, (u) => { u.shotsThisTurn = 3; }), words: '' })]); out.push(['pv:shot@4#4th-braced', (x: any) => ({ line: pv(x, 'shot', 4, (u) => { u.shotsThisTurn = 3; u.braced = true; }), words: '' })]); }
  for (const m of modes) { const d = m === 'melee' ? 1 : 4; out.push(['act:' + m + '@' + d, (x: any) => step(x, attack(m, d))]); out.push(['act:' + m + '@' + d + '#crit', (x: any) => step(x, attack(m, d), CRIT)]); out.push(['act:' + m + '@' + d + '#miss', (x: any) => step(x, attack(m, d), MISS)]); }
  if (!melee) {
    out.push(['act:shot@12', (x: any) => step(x, attack('shot', 12))]);
    out.push(['act:shot@4#hidden', (x: any) => step(x, attack('shot', 4), HIT, (y) => { P(y).hidden = true; })]);
    out.push(['act:shot@4#4th', (x: any) => step(x, attack('shot', 4), HIT, (y) => { P(y).shotsThisTurn = 3; })]);
    out.push(['act:reload', (x: any) => step(x, (y) => ({ type: 'combat/reload', unitId: P(y).id }), HIT, (y) => { P(y).ammo = 0; })]);
    out.push(['act:reload-tac', (x: any) => step(x, (y) => A.sendDescriptor(y, P(y).id, 'reload-tac', {}, 'host'), HIT, (y) => { P(y).ammo = 1; })]);
    out.push(['act:empty-all', (x: any) => step(x, (y) => ({ type: 'combat/reload', unitId: P(y).id }), HIT, (y) => { const u = P(y); u.ammo = 0; u.mags = (u.mags || []).map(() => 0); })]);
  } else out.push(['act:melee@1#hidden', (x: any) => step(x, attack('melee', 1), HIT, (y) => { P(y).hidden = true; })]);
  // every attack row the unit is offered (the techniques: each ranged and melee attack kind), at the target 4 off (1 in melee), hidden first
  for (const id of mainRows(g)) {
    const d = /throw/.test(id) ? 4 : melee || id === 'melee' ? 1 : 4;
    out.push(['row:' + id + '@' + d, (x: any) => step(x, row(id, d), HIT, (y) => { P(y).hidden = true; })]);
  }
  // a frag grenade thrown with this weapon in hand (the suppressor's -2 reads every non-melee attack of the unit)
  out.push(['act:throw-frag', (x: any) => step(x, (y) => ({ type: 'combat/throw', unitId: P(y).id, item: 'frag_grenade', tile: foeAt(y, 4).pos }), HIT, (y) => { const c = y.characters.c1, u = P(y); c.pack = [...A.packOf(c), line('frag_grenade')]; u.throwables = { ...(u.throwables || {}), frag_grenade: 1 }; })]);
  return out;
}

/** Where each weapon mod is pinned: a weapon of data that has its slot (the first in this list that does; the list
 * only orders the choice so a mod is pinned where it acts: a short gun for an optic band, a blade for an edge). */
const HOSTS = ['decrkm_smg', 'hellraiser_service_rifle', 'brigade_auto_shotgun', 'spellslinger_pistol', 'war_axe', 'combat_knife', 'fists'];
/** The extra hosts a mod is also pinned on (the report's cases: section 4, section 6). */
const ALSO: Record<string, string[]> = { mod_red_dot: ['frontier_hand_cannon', 'hellraiser_service_rifle'], mod_scope: ['hellraiser_service_rifle'], mod_bayonet: [], mod_weighted: ['combat_knife'], mod_serrated: ['war_axe'] };
const PREFER: Record<string, string> = { mod_suppressor: 'hellraiser_service_rifle', mod_compensator: 'hellraiser_service_rifle', mod_extended_mag: 'hellraiser_service_rifle', mod_quick_release: 'hellraiser_service_rifle', mod_bayonet: 'hellraiser_service_rifle', mod_underslung: 'hellraiser_service_rifle', mod_foregrip: 'decrkm_smg', mod_serrated: 'combat_knife', mod_weighted: 'war_axe', mod_wrapped_grip: 'combat_knife' };
/** The weapon mods of data (category mod, a weapon slot; the quiver's enchantments are pinned on a bow below). */
export const WEAPON_MODS = (): any[] => (Object.values(A.ITEM) as any[]).filter((it) => it.category === 'mod' && it.mod_slot !== 'enchantment').sort((a, b) => (a.id < b.id ? -1 : 1));
const fits = (w: string, m: any) => ((A.WEAPON[w] as any)?.mod_slots || []).includes(m.mod_slot);
export function hostsOf(m: any): string[] {
  const first = [PREFER[m.id], ...HOSTS].find((w) => w && fits(w, m)) || (Object.keys(A.WEAPON) as string[]).find((w) => fits(w, m));
  if (!first) throw new Error(m.id + ': no weapon of data has a ' + m.mod_slot + ' slot');
  return [first, ...(ALSO[m.id] || []).filter((w) => w !== first && fits(w, m))];
}

// ---------- the sections ----------
type Table = { state: Record<string, string>; log: Record<string, string> };
const put = (t: Table, k: string, v: { line: string; words: string }) => { t.state[k] = v.line; t.log[k] = v.words; };
/** Each weapon bare, and each mod on each of its hosts: only the steps that differ. */
export function recordModSteps(t: Table) {
  const bare: Record<string, Record<string, { line: string; words: string }>> = {};
  const play = (spec: Spec) => { const g = modFight(spec), o: Record<string, { line: string; words: string }> = {}; for (const [k, f] of stepsFor(modFight({ weapon: spec.weapon }))) o[k] = f(g); return o; };
  for (const m of WEAPON_MODS()) for (const w of hostsOf(m)) {
    const b = (bare[w] ||= play({ weapon: w }));
    let mine: any; try { mine = play({ weapon: w, mods: [m.id] }); } catch (e: any) { t.state['mod/' + m.id + '@' + w + '/setup'] = 'THREW ' + short(e); t.log['mod/' + m.id + '@' + w + '/setup'] = ''; continue; }
    let same = 0, acts = 0;
    for (const k of Object.keys(b)) if (mine[k].line !== b[k].line || mine[k].words !== b[k].words) { put(t, 'mod/' + m.id + '@' + w + '/' + k, mine[k]); if (k !== 'start') acts++; } else same++;
    // the start line names the mods the unit carries, so it always differs: a mod is inert when nothing else does
    t.state['mod/' + m.id + '@' + w + '/#same'] = same + ' of ' + Object.keys(b).length + ' steps as bare' + (acts ? '' : m.built === false ? ': INERT (built: false)' : ': no step but the start differs (built: true)'); t.log['mod/' + m.id + '@' + w + '/#same'] = '';
  }
  for (const [w, b] of Object.entries(bare)) for (const [k, v] of Object.entries(b)) put(t, 'bare/' + w + '/' + k, v);
  // two mods of one slot together (Gun Nut's extra slot is what allows it in play; fitted here by hand, as extra_mod writes the list)
  for (const [w, ms] of [['frontier_hand_cannon', ['mod_red_dot', 'mod_scope']], ['brigade_auto_shotgun', ['mod_red_dot', 'mod_extended_mag']]] as [string, string[]][]) {
    const g = modFight({ weapon: w, prep: (x) => { x.characters.c1.weaponState = { ...(x.characters.c1.weaponState || {}), mods: ms }; } }), b = bare[w] || play({ weapon: w });
    let same = 0;
    for (const [k, f] of stepsFor(modFight({ weapon: w }))) { const v = f(g); if (v.line !== b[k].line || v.words !== b[k].words) put(t, 'combo/' + ms.join('+') + '@' + w + '/' + k, v); else same++; }
    t.state['combo/' + ms.join('+') + '@' + w + '/#same'] = same + ' steps as bare'; t.log['combo/' + ms.join('+') + '@' + w + '/#same'] = '';
    if (!bare[w]) for (const [k, v] of Object.entries(b)) put(t, 'bare/' + w + '/' + k, v);
  }
}
/** The quiver's enchantments (category mod, slot enchantment): fitted into the worn quiver (gear/mod with quiver 0) of a
 * recurve bow; a shot with and without. */
export function recordEnchantments(t: Table) {
  const ench = (Object.values(A.ITEM) as any[]).filter((it) => it.category === 'mod' && it.mod_slot === 'enchantment').sort((a, b) => (a.id < b.id ? -1 : 1));
  const bowFight = (id?: string) => modFight({ weapon: 'recurve_bow', prep: (g) => { const c = g.characters.c1; A.setQuivers(c, [{ id: A.QUIVER_ITEM, arrows: { standard: 20 } }]); if (id) { const r = tryApply(g, { type: 'gear/mod', charId: 'c1', idx: give(g, id), quiver: 0 }); if (r.err) throw new Error(r.err); Object.assign(g, r.g); } } });
  const steps = (g: any) => ({ 'pv:shot@4': { line: pv(g, 'shot', 4), words: '' }, 'act:shot@4': step(g, attack('shot', 4)), 'act:shot@4#crit': step(g, attack('shot', 4), CRIT) });
  const b = steps(bowFight());
  for (const [k, v] of Object.entries(b)) put(t, 'bare/recurve_bow+quiver/' + k, v);
  for (const e of ench) { let s: any; try { s = steps(bowFight(e.id)); } catch (x: any) { t.state['ench/' + e.id + '/setup'] = 'THREW ' + short(x); t.log['ench/' + e.id + '/setup'] = ''; continue; } for (const [k, v] of Object.entries(s) as any) if (v.line !== b[k].line || v.words !== b[k].words) put(t, 'ench/' + e.id + '/' + k, v); }
}

/** A line for a character's gear: the main hand, its mods, the off hand and its mods, the pack's mods and weapons, credits. */
function gearLine(c: any): string {
  const pk = A.packOf(c).filter((x: any) => (A.ITEM[x.item || x.id] as any)?.category === 'mod' || x.weapon).map((x: any) => (x.item || x.id) + (x.mods?.length ? '{' + x.mods.join('+') + '}' : '') + (x.qty > 1 ? 'x' + x.qty : ''));
  return 'main ' + c.weapon + '{' + (c.weaponState?.mods || []).join('+') + '} off ' + (c.offHand ? c.offHand.id + '{' + (c.offHand.mods || []).join('+') + '}' : '-') + ' pack [' + pk.join(',') + '] credits ' + A.creditsOf(c);
}
const fitLine = (g0: any, a: any, by = 'host') => { const r = tryApply(g0, a, by); return (r.err ? r.err + ' | ' : '') + gearLine(r.g.characters.c1) + (r.g.combat ? ' | ap ' + P(r.g).ap + ' unitMods ' + (P(r.g).mods || []).join('+') : ''); };

/** The fit itself in each mode: free outside a run (a story scene), 1 AP in a fight, a swap, the refusals; at a Forge in a run, for the fee. */
export function recordFits(t: Table) {
  const S = (k: string, v: string) => { t.state['fit/' + k] = v; t.log['fit/' + k] = ''; };
  // a story scene: gear/mod, free
  { const g = modRoom({ weapon: 'hellraiser_service_rifle' }); S('story/before', gearLine(g.characters.c1));
    S('story/gear-mod-red-dot', fitLine(g, { type: 'gear/mod', charId: 'c1', idx: give(g, 'mod_red_dot') }));
    const g2 = modRoom({ weapon: 'hellraiser_service_rifle', mods: ['mod_red_dot'] });
    S('story/swap-to-scope', fitLine(g2, { type: 'gear/mod', charId: 'c1', idx: give(g2, 'mod_scope') }));
    const g3 = modRoom({ weapon: 'hellraiser_service_rifle' });
    S('story/no-slot-edge', fitLine(g3, { type: 'gear/mod', charId: 'c1', idx: give(g3, 'mod_serrated') }));
    const g3b = modRoom({ weapon: 'hellraiser_service_rifle' });
    S('story/not-a-mod', fitLine(g3b, { type: 'gear/mod', charId: 'c1', idx: give(g3b, 'ration_pack') }));
    const g4 = modRoom({ weapon: 'hellraiser_service_rifle' });
    S('story/unbuilt-underslung', fitLine(g4, { type: 'gear/mod', charId: 'c1', idx: give(g4, 'mod_underslung') }));
    const g6 = modRoom({ weapon: 'hellraiser_service_rifle', mods: ['mod_red_dot'], prep: (x) => { x.characters.c1.traits = ['gun_nut']; } }); give(g6, 'mod_scope');
    S('story/gun-nut-extra-mod', fitLine(g6, { type: 'story/perk', charId: 'c1', id: 'gun_nut', actionId: 'extra_mod', choice: 'mod_scope' }));
    S('story/gun-nut-extra-same', (() => { const g7 = modRoom({ weapon: 'hellraiser_service_rifle', mods: ['mod_red_dot'], prep: (x) => { x.characters.c1.traits = ['gun_nut']; } }); give(g7, 'mod_red_dot'); return fitLine(g7, { type: 'story/perk', charId: 'c1', id: 'gun_nut', actionId: 'extra_mod', choice: 'mod_red_dot' }); })());
    const g5 = modRoom({ weapon: 'hellraiser_service_rifle', prep: (x) => { x.characters.c1.traits = ['old_school']; } });
    S('story/old-school-red-dot', fitLine(g5, { type: 'gear/mod', charId: 'c1', idx: give(g5, 'mod_red_dot') }));
  }
  // in a fight: gear/mod is forwarded to combat/swap with the mod, at the gear-change price
  { const g = modFight({ weapon: 'hellraiser_service_rifle', prep: (x) => { give(x, 'mod_red_dot'); give(x, 'mod_scope'); } }), c = g.characters.c1, i = A.packOf(c).findIndex((x: any) => x.id === 'mod_red_dot'), j = A.packOf(c).findIndex((x: any) => x.id === 'mod_scope');
    S('fight/before', gearLine(c) + ' | ap ' + P(g).ap);
    S('fight/gear-mod', fitLine(g, { type: 'gear/mod', charId: 'c1', idx: i }));
    S('fight/combat-swap-mod', fitLine(g, { type: 'combat/swap', unitId: P(g).id, mod: i }));
    const a = A.apply(g, { type: 'combat/swap', unitId: P(g).id, mod: i }, 'host'), j2 = A.packOf(a.characters.c1).findIndex((x: any) => x.id === 'mod_scope');
    S('fight/then-swap-to-scope', fitLine(a, { type: 'combat/swap', unitId: P(a).id, mod: j2 }));
    S('fight/then-shot@20-preview', pv(A.apply(a, { type: 'combat/swap', unitId: P(a).id, mod: j2 }, 'host'), 'shot', 20)); void j;
    const b = A.apply(g, { type: 'combat/swap', unitId: P(g).id, mod: i }, 'host'); S('fight/fitted-red-dot-band', 'bands(shot) ' + A.opticBands(P(b), 'shot') + ' bands(aimed) ' + A.opticBands(P(b), 'aimed'));
  }
  // the Proving Ground's own route (sandbox/equip to 'mod') is the sandbox's: not pinned here (its tests are sandbox's)
  // a Survival run: gear/mod refused; run/fit_mod and run/unfit_mod at a Forge with the fee; a swap; off a Forge refused
  const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
  const visit = (kind: string, seed = 'PHC-0001') => {
    const g0: any = JSON.parse(JSON.stringify(startRun(survivalRoom(seed, DUO as any, { test: true }), seed))), r = g0.run;
    const n = r.nodes.find((x: any) => x.depth === 5 && !x.gate), prev = r.nodes.find((x: any) => x.links.includes(n.id));
    n.kind = kind; r.at = prev.id; r.state = 'map'; for (const c of Object.values(g0.characters) as any[]) c.credits = 1000;
    let g = g0; for (let i = 0; i < DUO.length && g.run.at !== n.id; i++) g = A.apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    return g;
  };
  { const g0 = visit('forge'), fresh = () => JSON.parse(JSON.stringify(g0)); S('run/before', gearLine(g0.characters.c1));
    const m = ['mod_red_dot', 'mod_extended_mag', 'mod_compensator'].find((x) => fits(g0.characters.c1.weapon, A.ITEM[x]));
    { const g = fresh(); S('run/gear-mod-' + m, fitLine(g, { type: 'gear/mod', charId: 'c1', idx: give(g, m) })); }
    const g = fresh(), i = give(g, m);
    S('run/options', A.runOptions(g, 'c1').filter((o: any) => o.group === 'mod').map((o: any) => o.key + ' ' + o.price + (o.why ? ' (' + o.why + ')' : '')).join('; '));
    S('run/fit-mod-' + m, fitLine(g, { type: 'run/fit_mod', charId: 'c1', idx: i }));
    const a = A.apply(g, { type: 'run/fit_mod', charId: 'c1', idx: i }, 'host');
    S('run/fitted-unit', (() => { const u = A.unitFromCharacter(a.characters.c1, '1,1', { state: 1 }); return 'mods ' + (u.mods || []).join('+') + ' bands(shot) ' + A.opticBands(u, 'shot') + ' ammo ' + u.ammo; })());
    S('run/unfit-mod-' + m, fitLine(a, { type: 'run/unfit_mod', charId: 'c1', mod: m }));
    if (m === 'mod_red_dot') { const b = JSON.parse(JSON.stringify(a)), j = give(b, 'mod_scope'); S('run/swap-to-scope', fitLine(b, { type: 'run/fit_mod', charId: 'c1', idx: j })); }
    S('run/unfit-none', fitLine(fresh(), { type: 'run/unfit_mod', charId: 'c1', mod: m }));
    { const poor = fresh(); poor.characters.c1.credits = 1; S('run/fit-poor', fitLine(poor, { type: 'run/fit_mod', charId: 'c1', idx: give(poor, m) })); }
    { const u = fresh(); S('run/fit-unbuilt-underslung', fitLine(u, { type: 'run/fit_mod', charId: 'c1', idx: give(u, 'mod_underslung') })); }
    // Gun Nut's extra slot (story/perk extra_mod, 0 AP): a second optic beside the fitted one, in the run (free today: plan 10.B5)
    { const x = fresh(), c = x.characters.c1; c.traits = [...(c.traits || []), 'gun_nut']; c.weaponState = { ...(c.weaponState || {}), mods: [m] }; give(x, 'mod_scope');
      S('run/gun-nut-extra-mod', fitLine(x, { type: 'story/perk', charId: 'c1', id: 'gun_nut', actionId: 'extra_mod', choice: 'mod_scope' })); }
    const rest = visit('rest'); S('run/fit-off-forge', fitLine(rest, { type: 'run/fit_mod', charId: 'c1', idx: give(rest, m) }));
  }
}

/** A mod on a pack line (a weapon in the pack that carries mods), then equipped: main hand and off hand; and an off-hand gun with a mod in a fight. */
export function recordPackAndOffHand(t: Table) {
  const S = (k: string, v: { line: string; words: string } | string) => { const o = typeof v === 'string' ? { line: v, words: '' } : v; t.state[k] = o.line; t.log[k] = o.words; };
  // a pack line with a red dot on it, equipped to the main hand outside a fight
  { const g = modRoom({ weapon: 'hellraiser_service_rifle' }), i = give(g, 'decrkm_smg', { mods: ['mod_red_dot'], loaded: 30 });
    S('pack/before', gearLine(g.characters.c1));
    S('pack/equip-main', fitLine(g, { type: 'gear/equip', charId: 'c1', idx: i, to: 'main' }));
    const a = A.apply(g, { type: 'gear/equip', charId: 'c1', idx: i, to: 'main' }, 'host');
    S('pack/unequip-main', fitLine(a, { type: 'gear/unequip', charId: 'c1', slot: 'main' }));
  }
  // the same, equipped in a fight (combat/equip) and shot at 12 tiles (the red dot's band)
  { const g = modFight({ weapon: 'hellraiser_service_rifle', prep: (x) => { give(x, 'decrkm_smg', { mods: ['mod_red_dot'], loaded: 30 }); } }), i = A.packOf(g.characters.c1).findIndex((x: any) => x.weapon === 'decrkm_smg');
    S('pack/fight-equip-main', fitLine(g, { type: 'combat/equip', unitId: P(g).id, item: i, to: 'main' }));
    const a = A.apply(g, { type: 'combat/equip', unitId: P(g).id, item: i, to: 'main' }, 'host');
    S('pack/fight-equipped-pv:shot@12', pv(a, 'shot', 12));
    const bare = modFight({ weapon: 'decrkm_smg' }); S('pack/bare-smg-pv:shot@12', pv(bare, 'shot', 12));
  }
  // an off-hand gun carrying a mod: equipped to the off hand (a service pistol in each hand), its shot through the off-hand row
  for (const mods of [[], ['mod_red_dot'], ['mod_suppressor'], ['mod_extended_mag']]) {
    const key = 'offhand/' + (mods.join('+') || 'bare');
    const g0 = modRoom({ weapon: 'service_pistol' }), i = give(g0, 'service_pistol', { mods, loaded: 12 });
    S(key + '/equip-off', fitLine(g0, { type: 'gear/equip', charId: 'c1', idx: i, to: 'off' }));
    const g1 = A.apply(g0, { type: 'gear/equip', charId: 'c1', idx: i, to: 'off' }, 'host');
    const g = modFight({ weapon: 'service_pistol', prep: (x) => { Object.assign(x.characters.c1, { offHand: g1.characters.c1.offHand, pack: g1.characters.c1.pack }); } });
    const u = P(g); S(key + '/unit', 'offWeapon ' + u.offWeapon + ' offAmmo ' + u.offAmmo + ' mods ' + (u.mods || []).join('+'));
    S(key + '/row:tq:off:shot@4', step(g, row('tq:off:shot', 4), HIT, (y) => { P(y).hidden = true; }));
    S(key + '/row:tq:off:shot@12', step(g, row('tq:off:shot', 12)));
    S(key + '/row:tq:main:shot@12', step(g, row('tq:main:shot', 12)));
  }
  // the main hand's suppressor and red dot, the off hand bare: the off-hand shot
  { const g0 = modRoom({ weapon: 'service_pistol', mods: ['mod_suppressor', 'mod_red_dot'] }), i = give(g0, 'service_pistol', { loaded: 12 }), g1 = A.apply(g0, { type: 'gear/equip', charId: 'c1', idx: i, to: 'off' }, 'host');
    const g = modFight({ weapon: 'service_pistol', mods: [], prep: (x) => { Object.assign(x.characters.c1, { weaponState: g1.characters.c1.weaponState, offHand: g1.characters.c1.offHand, pack: g1.characters.c1.pack }); } });
    S('offhand/main-suppressor+red-dot/row:tq:off:shot@4', step(g, row('tq:off:shot', 4), HIT, (y) => { P(y).hidden = true; }));
    S('offhand/main-suppressor+red-dot/row:tq:off:shot@12', step(g, row('tq:off:shot', 12)));
    S('offhand/main-suppressor+red-dot/row:tq:main:shot@12', step(g, row('tq:main:shot', 12)));
  }
  // a mod fitted with the gun in the main hand, then the gun moved to the off hand (combat/swap from off: the hands change)
  { const g = modFight({ weapon: 'service_pistol', mods: ['mod_red_dot'], prep: (x) => { const c = x.characters.c1; c.offHand = { id: 'drifter_revolver', loaded: 6 }; } });
    S('offhand/swap-hands', fitLine(g, { type: 'combat/swap', unitId: P(g).id, from: 'off' }));
  }
}

/** The extended magazine's spare magazines: what the fight's unit starts with, a reload from a spare, the pack after the fight. */
export function recordSpares(t: Table) {
  const S = (k: string, v: { line: string; words: string } | string) => { const o = typeof v === 'string' ? { line: v, words: '' } : v; t.state[k] = o.line; t.log[k] = o.words; };
  for (const mods of [[], ['mod_extended_mag']]) {
    const key = 'spares/' + (mods.join('+') || 'bare') + '@hellraiser_service_rifle';
    const room = modRoom({ weapon: 'hellraiser_service_rifle', mods }), c = room.characters.c1;
    S(key + '/story', 'loaded ' + c.loaded + ' loadedOf ' + A.loadedOf(c) + ' spares ' + JSON.stringify(A.spareMags(c)) + ' magSize ' + A.magazineSize(c.weapon, c.weaponState?.mods));
    const loadedFull = modRoom({ weapon: 'hellraiser_service_rifle', mods, prep: (x) => { x.characters.c1.loaded = 36; } });
    S(key + '/story-loaded-36', 'loadedOf ' + A.loadedOf(loadedFull.characters.c1));
    const g = modFight({ weapon: 'hellraiser_service_rifle', mods });
    const u = P(g); S(key + '/unit', 'ammo ' + u.ammo + ' mags ' + JSON.stringify(u.mags) + ' loose ' + u.loose);
    S(key + '/reload-from-spare', step(g, (y) => ({ type: 'combat/reload', unitId: P(y).id }), HIT, (y) => { P(y).ammo = 0; }));
    S(key + '/reload-full', step(g, (y) => ({ type: 'combat/reload', unitId: P(y).id })));
    S(key + '/load-a-spare', step(g, (y) => A.sendDescriptor(y, P(y).id, 'load', {}, 'host'), HIT, (y) => { const v = P(y); v.mags = [0, 24, 24]; }));
    const g36 = modFight({ weapon: 'hellraiser_service_rifle', mods, prep: (x) => { x.characters.c1.loaded = 36; } });
    S(key + '/unit-loaded-36', 'ammo ' + P(g36).ammo + ' mags ' + JSON.stringify(P(g36).mags));
  }
}

/** Rules 1.26: a melee weapon's damage today does not follow Strength or Agility (lane L6 changes it). A heavy and a light
 * melee weapon, Strength and Agility both 1, 4 and 7 (every skill 5). */
export function recordMelee(t: Table) {
  for (const w of ['war_axe', 'combat_knife']) for (const n of [1, 4, 7]) {
    const g = modFight({ weapon: w, attrs: { strength: n, agility: n } }), k = 'melee/' + w + '/str-agi' + n;
    t.state[k + '/pv'] = pv(g, 'melee', 1); t.log[k + '/pv'] = '';
    const v = step(g, attack('melee', 1)); t.state[k + '/act'] = v.line; t.log[k + '/act'] = v.words;
    t.state[k + '/label'] = 'strength ' + g.characters.c1.attrs.strength + ' agility ' + g.characters.c1.attrs.agility + ' / ' + A.weaponMultLabel(w) + ' / live: ' + (A.weaponMultLabel(w, { live: true }) || '(none)') + ' / mult ' + r2(A.weaponMult(g.characters.c1, w)); t.log[k + '/label'] = '';
  }
}

export function recordMods(): Table {
  const t: Table = { state: {}, log: {} };
  recordModSteps(t); recordEnchantments(t); recordFits(t); recordPackAndOffHand(t); recordSpares(t); recordMelee(t);
  return t;
}
