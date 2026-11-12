// @ts-nocheck (a recording tool; see harness.ts)
// THE COSTS TABLES of engine foundations 2 (docs/design/handoffs/engine-foundations-2-costs.md): what every action
// TAKES. Where a damage line holds amounts and a rules line holds dice, a costs line holds the AP and every resource
// before and after: AP, banked AP, the magazine, spare magazines and loose rounds, Heat, charge, cores, Flux, MP, Strain,
// the held Outburst's stage, Momentum, Guard, Supplies, toxins, throwables, spare parts, stims, Echo, the mana in the
// air. Two readings of the same fights:
//
//   costs-<section>.json         the STATE line. `P1 ap9>7 mg.mp200>180` is what the action took and gave. After it, for
//                                an action through the reducer:
//                                  short:  the same action with 0 AP (the refusal sentence, or `free`)
//                                  again:  the same action a second time in the same turn, AP refilled (a use limit)
//                                  next:   the same action on the unit's next turn (a once-a-turn limit is back)
//                                  later:  the same action three rounds on (a cooldown is back)
//                                A refactor of costs or counters must leave every one as it is; a line that moves is a
//                                behaviour change and is listed in the hand-off.
//   costs-<section>.marks.json   the MARKS: the counters and flags the engine keeps (use cells, per-item state,
//                                technique state, reactions used, "this turn" flags). WHERE a counter is kept may
//                                change when counters move to one store, so this file is re-recorded then
//                                (GOLDEN_RECORD=marks) and a reviewer reads the diff. WHAT a limit allows is in the
//                                state line (again / next / later), which must not move.
//
// The sections: the damage tables' own actions read this way (techniques, Sigil, the Outburst, prayers, every item's
// action, the shelved moves, the special cases), and the PAD (below): every basic action, every Call, every Sigil and
// Outburst action and every technique through the reducer at a turn's real AP, and the same pad for every holder of an
// item that changes a cost or grants AP (only the lines that differ from the same sheet without it).
//
// Record on purpose only:  GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs       (both files)
//                          GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs   (the marks only)
import { expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALSO, A, W, HIT, label, copy, act, run, tryAct, fightSpec, place, turn, pcs, foes, charOf, units } from './harness';
import { SECTIONS, SHOOTER, CASTER, EVEN, TECH_WEAPONS, itemFight, hooksOf, tiersOf, heartFight, PRAY_TRIES } from './record';

// ---------------------------------------------------------------------------------------------- the reading
const flat = (o: any, pre: string, out: Record<string, string>, depth = 0) => {
  if (o == null || o === false || o === 0 || o === '') return;
  if (typeof o !== 'object') { out[pre] = typeof o === 'number' ? String(Math.round(o * 1000) / 1000) : String(o); return; }
  if (Array.isArray(o)) { if (o.length) out[pre] = o.every((x) => x == null || typeof x !== 'object') ? o.join('/') : JSON.stringify(o).slice(0, 120); return; }
  if (depth > 4) { out[pre] = JSON.stringify(o).slice(0, 120); return; }
  for (const k of Object.keys(o).sort()) flat(o[k], pre ? pre + '.' + k : k, out, depth + 1);
};
const RES = ['ap', 'bank', 'ammo', 'offAmmo', 'heat', 'loose', 'offLoose', 'mags', 'offMags', 'parts', 'apNext', 'apDebt', 'throwables', 'res', 'quiver'];
const MG = ['charge', 'cores', 'coresMade', 'flux', 'mp', 'strain', 'freePumps', 'debt'];
const MARK = ['uses', 'ps', 'tech', 'reactUsed', 'reactedRound', 'prayedRound', 'shotsThisTurn', 'firstShotTurn', 'firstShotDone', 'sprinted', 'attackedTurn', 'openerUsed', 'moved', 'apGained', 'apTurnTotal', 'faith', 'call', 'quickRound', 'owShots', 'hideEntry', 'ambushUsed', 'chain', 'edgeWord', 'freeReload'];
const MG_MARK = ['freeUsed', 'firstUsed', 'cast', 'calmFight', 'calmTend', 'lockRound'];
function snapCost(cb: any, g: any) {
  const res: Record<string, Record<string, string>> = {}, marks: Record<string, Record<string, string>> = {}, names: Record<string, string> = {};
  if (!cb) return { res, marks, names };
  for (const u of cb.units) {
    const l = label(cb, u), r: Record<string, string> = {}, m: Record<string, string> = {};
    for (const k of RES) flat(u[k], k, r);
    if (u.mg) { for (const k of MG) flat(u.mg[k], 'mg.' + k, r); if (u.mg.held) r['mg.held'] = 'stage' + u.mg.held.stage; for (const k of MG_MARK) flat(u.mg[k], 'mg.' + k, m); }
    for (const k of MARK) flat(u[k], k, m);
    res[u.id] = r; marks[u.id] = m; names[u.id] = l;
  }
  const air: Record<string, string> = {}; flat(cb.mana, 'mana', air); res['~air'] = air; names['~air'] = 'air';
  let i = 0;
  for (const c of Object.values(g?.characters || {}) as any[]) {
    const r: Record<string, string> = {}, m: Record<string, string> = {}; i++;
    flat(c.echo, 'echo', r); flat(c.stims, 'stims', r); flat(c.essence, 'essence', r);
    flat(c.uses, 'uses', m); flat(c.miracleSession, 'miracleSession', m);
    res['~' + c.id] = r; marks['~' + c.id] = m; names['~' + c.id] = 'C' + i;
  }
  const st: Record<string, string> = {}; flat(g?.story?.ps, 'ps', st); marks['~story'] = st; names['~story'] = 'story';
  return { res, marks, names };
}
function diffMaps(b: Record<string, Record<string, string>>, a: Record<string, Record<string, string>>, names: Record<string, string>, names0: Record<string, string>): string {
  const out: string[] = [];
  for (const id of Object.keys(a)) {
    const was = b[id], now = a[id]; if (!was) { const v = Object.entries(now).map(([k, x]) => k + x).join(' '); out.push(names[id] + ' new' + (v ? ' ' + v : '')); continue; }
    const p: string[] = [];
    for (const k of Object.keys(now)) if (!(k in was)) p.push(k + '0>' + now[k]); else if (was[k] !== now[k]) p.push(k + was[k] + '>' + now[k]);
    for (const k of Object.keys(was)) if (!(k in now)) p.push(k + was[k] + '>0');
    if (p.length) out.push(names[id] + ' ' + p.sort().join(' '));
  }
  for (const id of Object.keys(b)) if (!(id in a)) out.push(names0[id] + ' gone');
  return out.join('; ');
}
const SEP = ' ## ';
const read1 = (before: any, cb: any, g: any) => { const now = snapCost(cb, g); return (diffMaps(before.res, now.res, now.names, before.names) || '-') + SEP + (diffMaps(before.marks, now.marks, now.names, before.names) || '-'); };
const why = (e: any) => String(e?.message ?? e).replace(/\s+/g, ' ').slice(0, 110);
const isRule = (e: any) => e instanceof A.RuleError || e?.name === 'RuleError';
/** The same action on g (a state the caller owns), read as a state line only: what it took, or why it was refused. */
function retry(g: any, action: any, d: any, seed: number): string {
  g.rng.state = seed; const before = snapCost(g.combat, g);
  try { const g2 = dice0(d, () => A.apply(g, action, 'host')); return read1(before, g2.combat, g2).split(SEP)[0]; } catch (e: any) { return (isRule(e) ? 'NO ' : 'THREW ') + why(e); }
}
import { dice as dice0 } from './harness';
let LITE = false;
/** A reducer action read whole: what it took; then with no AP, a second time, next turn and three rounds on. */
function readAct(before: any, g0: any, g1: any, action: any, d: any, seed: number): string {
  const [state, marks] = read1(before, g1.combat, g1).split(SEP);
  if (LITE || !action?.unitId || !g1.combat) return state + SEP + marks;
  const more: string[] = [];
  { const g = copy(g0), u = units(g).find((x: any) => x.id === action.unitId); if (u) { u.ap = 0; u.bank = 0; const r = retry(g, action, d, seed); more.push('short: ' + (r.startsWith('NO ') ? r.slice(3) : r === '-' ? 'free' : 'free ' + r)); } }
  const mine = (g: any) => g.combat && !g.combat.over && g.combat.order[g.combat.turn] === action.unitId && !units(g).find((x: any) => x.id === action.unitId)?.dead;
  if (mine(g1)) {
    { const g = copy(g1), u = units(g).find((x: any) => x.id === action.unitId); u.ap = 9; more.push('again: ' + retry(g, action, d, seed)); }
    for (const [name, rounds] of [['next', 1], ['later', 3]] as const) {
      const g = copy(g1), u = units(g).find((x: any) => x.id === action.unitId); g.combat.round += rounds;
      try { turn(g, u, 9); more.push(name + ': ' + (g.combat.order[g.combat.turn] === u.id && !u.dead && !u.downed && !u.skipTurn ? retry(g, action, d, seed) : 'no turn')); } catch (e: any) { more.push(name + ': THREW ' + why(e)); }
    }
  }
  return state + ' | ' + more.join(' | ') + SEP + marks;
}
const readRan = (before: any, g: any) => read1(before, g.combat, g);

/** Run f with the costs reading on: act() and run() of the harness return costs lines. */
function reading<T>(f: () => T, lite = false): T {
  const was = LITE; LITE = lite; ALSO.snap = snapCost; ALSO.act = readAct; ALSO.ran = readRan;
  try { return f(); } finally { LITE = was; delete ALSO.snap; delete ALSO.act; delete ALSO.ran; }
}
function split(T: Record<string, string>): { state: Record<string, string>; marks: Record<string, string> } {
  const state: Record<string, string> = {}, marks: Record<string, string> = {};
  for (const [k, v] of Object.entries(T)) {
    if (k.startsWith('#')) continue;
    if (!v.includes(SEP)) { state[k] = v; continue; }
    // a damage section may join several readings with ' | hit ' and the like: keep each one's state, and the marks apart
    const parts = v.split(SEP); state[k] = parts.slice(0, -1).join(' // ').trim(); marks[k] = parts[parts.length - 1];
    if (marks[k] === '-') delete marks[k];
  }
  return { state, marks };
}

// ---------------------------------------------------------------------------------------------- the pad
type Case = [name: string, prep: ((g: any, u: any) => void) | null, tries: (g: any, u: any) => any[]];
const obj = (g: any, o: any) => { g.combat.objects = [...(g.combat.objects || []), o]; };
const setCond = (u: any, id: string, by?: any) => { (u.conds ||= {})[id] = 2; if (by) (u.condBy ||= {})[id] = by.id; };
/** The basic actions of a fight (the reducer's own verbs), each on a copy of g with what it needs put in place. */
const BASIC: Case[] = [
  ['move', null, () => [{ type: 'combat/move', to: '3,8' }]],
  ['move-far', null, () => [{ type: 'combat/move', to: '3,11' }]],
  ['sprint', null, () => [{ type: 'combat/move', to: '3,11', how: 'sprint' }]],
  ['disengage', null, () => [{ type: 'combat/move', to: '3,7', how: 'disengage' }]],
  ['prone', null, () => [{ type: 'combat/prone' }]],
  ['stand', (_g, u) => { u.prone = true; }, () => [{ type: 'combat/prone' }]],
  ['brace', null, () => [{ type: 'combat/brace' }]],
  ['shove', null, (g) => [{ type: 'combat/shove', targetId: foes(g)[0].id }]],
  ['shot', null, (g) => [{ type: 'combat/attack', targetId: foes(g)[1].id, mode: 'shot' }]],
  ['aimed', null, (g) => [{ type: 'combat/attack', targetId: foes(g)[1].id, mode: 'aimed' }]],
  ['melee', null, (g) => [{ type: 'combat/attack', targetId: foes(g)[0].id, mode: 'melee' }]],
  ['burst', null, (g) => [{ type: 'combat/attack', targetId: foes(g)[1].id, mode: 'burst' }]],
  ['auto', null, (g) => [{ type: 'combat/attack', targetId: foes(g)[1].id, mode: 'auto' }]],
  ['overwatch', null, () => [{ type: 'combat/overwatch', mode: 'shot' }, { type: 'combat/overwatch', mode: 'melee' }]],
  ['overwatch-aimed', null, () => [{ type: 'combat/overwatch', mode: 'aimed' }]],
  ['reload', (_g, u) => { u.ammo = 1; }, () => [{ type: 'combat/reload' }]],
  ['reload-tactical', (_g, u) => { u.ammo = 1; }, () => [{ type: 'combat/reload', tactical: true }]],
  ['reload-both', (_g, u) => { u.ammo = 1; if (u.offWeapon) u.offAmmo = 0; }, () => [{ type: 'combat/reload', hand: 'both' }]],
  ['reload-off', (_g, u) => { if (u.offWeapon) u.offAmmo = 0; }, () => [{ type: 'combat/reload', hand: 'off' }]],
  ['load', (_g, u) => { if (u.mags?.length) { u.mags[0] = Math.max(0, u.mags[0] - 4); u.loose = (u.loose || 0) + 6; } }, () => [{ type: 'combat/load' }]],
  ['clear', (_g, u) => { u.jammed = true; u.heat = 3; }, () => [{ type: 'combat/clear' }]],
  ['repair', (_g, u) => { u.parts = 2; if (u.maxDur) u.dur = Math.max(1, Math.floor(u.maxDur / 2)); }, () => [{ type: 'combat/repair' }]],
  ['stim', (g) => { for (const c of Object.values(g.characters) as any[]) c.stims = 2; }, (g) => [{ type: 'combat/stim', targetId: pcs(g)[1].id }]],
  ['stim-downed', (g) => { for (const c of Object.values(g.characters) as any[]) c.stims = 2; const a = pcs(g)[1]; a.hp = 0; a.downed = true; }, (g) => [{ type: 'combat/stim', targetId: pcs(g)[1].id }]],
  ['analyze', null, (g) => [{ type: 'combat/analyze', targetId: foes(g)[1].id }]],
  ['hide', (g, u) => { for (const f of foes(g)) f.pos = (20 + foes(g).indexOf(f)) + ',0'; for (let y = 0; y < 14; y++) g.combat.map = { ...g.combat.map, solid: [...(g.combat.map.solid || []), '10,' + y] }; void u; }, () => [{ type: 'combat/hide' }]],
  ['parley', null, (g) => [{ type: 'combat/parley', targetId: foes(g)[0].id, kind: 'terms', text: 'Lay it down.' }, { type: 'combat/parley', targetId: foes(g)[0].id, kind: 'threaten', text: 'Lay it down.' }]],
  ['extinguish', (_g, u) => setCond(u, 'burning'), () => [{ type: 'combat/extinguish' }]],
  ['extinguish-ally', (g) => setCond(pcs(g)[1], 'burning'), (g) => [{ type: 'combat/extinguish', targetId: pcs(g)[1].id }]],
  ['escape', (g, u) => setCond(u, 'grappled', foes(g)[0]), () => [{ type: 'combat/escape' }]],
  ['recover', (_g, u) => setCond(u, 'disarmed'), () => [{ type: 'combat/recover' }]],
  ['raise', (_g, u) => setCond(u, 'lowered'), () => [{ type: 'combat/recover' }]],
  ['throw', (_g, u) => { u.throwables = { frag_grenade: 2 }; }, (g) => [{ type: 'combat/throw', item: 'frag_grenade', tile: foes(g)[1].pos }]],
  ['door', (g) => obj(g, { id: 'dr', kind: 'door', name: 'Door', pos: '3,7', open: false }), () => [{ type: 'combat/door', tile: '3,7' }]],
  ['shoot-cover', (g) => obj(g, { id: 'bx', kind: 'barricade', name: 'Barricade', pos: '5,8', hp: 30 }), () => [{ type: 'combat/shoot-cover', tile: '5,8' }]],
  ['pickup', (g) => { W(g, () => A.dropToPile(g.combat, '3,7', [{ id: 'stim', item: 'stim', name: 'Stim', qty: 1, kind: 'consumable' }])); }, () => [{ type: 'combat/pickup', tile: '3,7' }]],
  ['pull-free', (g, u) => { u.nailed = { by: foes(g)[0].id, id: 'run_through', ap: 2 }; }, () => [{ type: 'combat/pull-free' }]],
  ['pull-free-ally', (g) => { pcs(g)[1].nailed = { by: foes(g)[0].id, id: 'run_through', ap: 1 }; }, (g) => [{ type: 'combat/pull-free', targetId: pcs(g)[1].id }]],
  ['swap', null, () => [{ type: 'combat/swap' }, { type: 'combat/swap', to: 'off' }]],
  ['skill', null, (g) => [{ type: 'combat/skill', targetId: foes(g)[1].id }, { type: 'combat/skill' }]],
  ['paired', null, (g) => [{ type: 'combat/paired', targetId: foes(g)[0].id }, { type: 'combat/paired', targetId: foes(g)[1].id }]],
  ['attempt', null, () => [{ type: 'combat/attempt', text: 'I kick the lamp over.' }]],
  ['song', null, () => [{ type: 'combat/song' }]],
  ['end-turn', null, () => [{ type: 'combat/end-turn' }]],
];
const SIGIL: Case[] = [
  ['draw', null, (_g, u) => (u.mg?.words || []).slice(0, 3).map((w: string) => ({ type: 'combat/draw', word: w }))],
  ['draw-second', (g, u) => { W(g, () => A.drawGlyph(g.combat, g.rng, u, firstWord(u, 'subject'))); u.pos = '3,7'; u.ap = 9; }, (_g, u) => [{ type: 'combat/draw', word: firstWord(u, 'other') }]],
  ['evoke', (g, u) => spell(g, u), (g) => [foes(g)[1].pos, foes(g)[0].pos, undefined, ...Array.from({ length: 63 }, (_, i) => (i % 9) + ',' + (3 + Math.floor(i / 9)))].flatMap((aim) => ['3,6', '2,6'].map((tile) => ({ type: 'combat/evoke', tile, ...(aim ? { aim } : {}) })))],
  ['scuff', (g, u) => { W(g, () => A.drawGlyph(g.combat, g.rng, u, firstWord(u, 'subject'))); u.ap = 9; }, () => [{ type: 'combat/scuff' }]],
  ['vent', (_g, u) => { if (u.mg) u.mg.flux = 3; }, () => [{ type: 'combat/vent' }]],
  ['core', (_g, u) => { if (u.mg) { u.mg.charge = 1; u.mg.cores = Math.max(1, u.mg.cores); } }, () => [{ type: 'combat/core' }]],
  ['read', (g) => { const f = foes(g)[0]; (g.combat.glyphs ||= []).push({ id: 'gx', pos: '4,7', word: 'fire', side: 'foe', by: f.id, round: g.combat.round }); }, () => [{ type: 'combat/read', tile: '4,7' }]],
];
const firstWord = (u: any, what: 'subject' | 'other'): string => { const ws: string[] = u.mg?.words || []; const subj = ws.find((w) => A.SIGIL_WORD?.[w]?.group === 'subject' || ['fire', 'frost', 'spark', 'force', 'mend', 'ward'].includes(w)) || ws[0]; return what === 'subject' ? subj : ws.find((w) => w !== subj && !(['fire', 'frost', 'spark', 'force', 'mend', 'ward', 'stone', 'venom'].includes(w))) || ws.find((w) => w !== subj) || subj; };
function spell(g: any, u: any) {
  pcs(g)[1].pos = '1,9';
  W(g, () => { const a = u.ap; u.ap = 99; u.pos = '2,6'; A.drawGlyph(g.combat, g.rng, u, firstWord(u, 'subject')); u.pos = '3,6'; A.drawGlyph(g.combat, g.rng, u, firstWord(u, 'other')); u.ap = a; });
  u.ap = 9;
}
const begun = (g: any, u: any, pumps = 0) => { W(g, () => { u.ap = 99; A.beginOutburst(g.combat, g.rng, u, u.mg.designs[0]?.id, undefined, true, {}); for (let i = 0; i < pumps; i++) A.pumpOutburst(g.combat, g.rng, u, null); }); u.ap = 9; };
const SOUL: Case[] = [
  ['begin', null, (_g, u) => [{ type: 'combat/outburst', design: u.mg?.designs?.[0]?.id, hold: true }]],
  ['begin-release', null, (g, u) => [{ type: 'combat/outburst', design: u.mg?.designs?.[0]?.id, aim: foes(g)[1].pos }, { type: 'combat/outburst', design: u.mg?.designs?.[0]?.id, aim: pcs(g)[1].pos }]],
  ['pump', (g, u) => begun(g, u), () => [{ type: 'combat/pump' }]],
  ['pump-second', (g, u) => begun(g, u, 1), () => [{ type: 'combat/pump' }]],
  ['pump-feeling', (g, u) => { begun(g, u); u.mg.feelings = A.FEELINGS.map((x: any) => x.id); }, () => [{ type: 'combat/pump', feeling: 'rage' }]],
  ['revert', (g, u) => begun(g, u, 1), () => [{ type: 'combat/revert' }]],
  ['letgo', (g, u) => begun(g, u, 1), () => [{ type: 'combat/letgo' }]],
  ['steady', (g, u) => begun(g, u, 1), () => [{ type: 'combat/steady' }]],
  ['feed', (g, u) => begun(g, u), () => [{ type: 'combat/feed' }]],
  ['release', (g, u) => begun(g, u, 1), (g) => [{ type: 'combat/release', aim: foes(g)[1].pos }, { type: 'combat/release', aim: pcs(g)[1].pos }, { type: 'combat/release' }]],
  ['heartwatch', (g, u) => begun(g, u, 1), () => [{ type: 'combat/heartwatch', on: true }]],
  ['syphon', (_g, u) => { if (u.mg) u.mg.mp = Math.max(0, Math.floor(u.mg.mpMax / 2)); }, () => [{ type: 'combat/syphon' }]],
  ['crystallise', (g) => { g.combat.mana = 30; }, () => [{ type: 'combat/crystallise' }]],
];
/** Every Call the unit has, at its step; every technique its hands offer; every prayer its patron answers. */
function ownCases(g: any, u: any): Case[] {
  const out: Case[] = [], [f, far] = foes(g), al = pcs(g)[1];
  let calls: any[] = []; try { calls = W(g, () => A.callPad(g.combat, u)); } catch { calls = []; }
  for (const c of calls) out.push(['call/' + c.id, null, () => [{ targetId: far.id }, { targetId: f.id }, { targetId: al.id }, { targetId: u.id }, {}, { tile: '5,6' }, { targetId: al.id, tile: '2,8' }].map((a) => ({ type: 'combat/call', id: c.id, ...a }))]);
  const ids = new Set<string>();
  for (const hand of ['main', 'off']) { let pad: any[] = []; try { pad = W(g, () => A.techniquePad(g.combat, u, hand)); } catch { pad = []; } for (const grp of pad) for (const e of grp.entries || grp.items || []) if (e?.id) ids.add(e.id + (hand === 'off' ? '@off' : '')); }
  for (const x of ids) { const [id, off] = x.split('@'); out.push(['tech/' + x, (_g2, u2) => { if (u2.resMax?.momentum != null) (u2.res ||= {}).momentum = u2.resMax.momentum; }, () => [{ targetId: far.id }, { targetId: f.id }, { targetId: f.id, tile: f.pos }, {}, { tile: '3,8' }, { tile: far.pos }, { allyId: al.id }, { targetId: far.id, opt: 'head' }].map((a) => ({ type: 'combat/technique', id, ...(off ? { hand: 'off' } : {}), ...a }))]); }
  return out;
}
/** Play a list of cases on copies of g for its first PC. A case nobody accepts keeps its first refusal. */
function playPad(T: Record<string, string>, key: string, g0: any, cases: Case[]) {
  for (const [name, prep, tries] of cases) {
    const g = copy(g0), u = pcs(g)[0];
    try { if (prep) prep(g, u); } catch (e: any) { T[key + '/' + name] = 'PREP ' + why(e); continue; }
    let list: any[] = []; try { list = tries(g, u).map((a) => ({ unitId: u.id, ...a })); } catch { list = []; }
    let first = '', done = false;
    for (const a of list) { const r = act(g, a, HIT); if (r.ok) { T[key + '/' + name] = r.line; done = true; break; } first ||= r.line; if (/^THREW/.test(r.line)) break; }
    if (!done) T[key + '/' + name] = first || 'REFUSED (no arguments)';
  }
}
/** The fight of the pad: the item sweep's own (the holder at 3,6, a Soldier beside it, a squadmate, a Soldier 4 tiles off). */
function padFight(spec: any): any {
  const g = itemFight(spec), u = pcs(g)[0];
  if (u.mg) Object.assign(u.mg, { charge: Math.max(u.mg.charge || 0, 9), mp: Math.max(u.mg.mp || 0, 200), cores: Math.max(u.mg.cores || 0, 2) });
  for (const k of Object.keys(u.resMax || {})) (u.res ||= {})[k] = u.resMax[k];
  g.combat.mana = 20;
  return g;
}
const casesFor = (g: any): Case[] => { const u = pcs(g)[0]; return [...BASIC, ...(u.mg?.evoker ? SIGIL : []), ...(u.mg?.emanator ? SOUL : []), ...ownCases(g, u)]; };
/** What a turn gives (the refill, with the items that grant or take AP), and what a kill gives. */
function gives(T: Record<string, string>, key: string, g0: any) {
  T[key + '/turn-start'] = run(g0, (g, cb) => { const u = pcs(g)[0]; u.ap = 0; cb.round += 1; cb.turn = cb.order.indexOf(u.id); A.beginTurn(cb, g.rng); return null; }).line;
  T[key + '/turn-start-stunned'] = run(g0, (g, cb) => { const u = pcs(g)[0]; u.ap = 0; u.stunnedNext = 1; u.dazedNext = 1; cb.round += 1; cb.turn = cb.order.indexOf(u.id); A.beginTurn(cb, g.rng); return null; }).line;
  { const g = copy(g0), u = pcs(g)[0], t = foes(g)[1]; t.hp = 1; t.armour = 0; T[key + '/kill-shot'] = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' }, HIT).line; }
  { const g = copy(g0), u = pcs(g)[0], t = foes(g)[0]; t.hp = 1; t.armour = 0; T[key + '/kill-blow'] = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'melee' }, HIT).line; }
  T[key + '/turn-end'] = run(g0, (g, cb) => { A.endTurn(cb, g.rng); return null; }).line;
}

/** The pad of the plain sheets: a soldier with each kind of weapon, a Sigil caster, a heart. */
export function recordPad(T: Record<string, string>) {
  const sheets: [string, any, ((g: any) => void)?][] = [
    ['rifle', { ...SHOOTER, weapon: 'hellraiser_service_rifle' }], ['pistol', { ...SHOOTER, weapon: 'service_pistol' }], ['lmg', { ...SHOOTER, weapon: 'hellraiser_lmg' }], ['smg', { ...SHOOTER, weapon: 'decrkm_smg' }],
    ['scattergun', { ...SHOOTER, weapon: 'lumeri_scattergun' }], ['bow', { ...SHOOTER, weapon: 'longbow' }], ['thumper', { ...SHOOTER, weapon: 'smetanita_thumper' }],
    ['sabre', { ...SHOOTER, weapon: 'sabre' }], ['fists', { ...SHOOTER, weapon: 'fists' }], ['maul', { ...SHOOTER, weapon: 'maul' }],
    ['two-guns', { ...SHOOTER, weapon: 'service_pistol' }, (g) => { const u = pcs(g)[0]; u.offWeapon = 'service_pistol'; u.offAmmo = 3; u.offMags = [8, 8]; charOf(g, u).offHand = { id: 'service_pistol' }; }],
    ['shield', { ...SHOOTER, weapon: 'sabre' }, (g) => { const u = pcs(g)[0]; u.offItem = 'riot_shield'; charOf(g, u).offHand = { id: 'riot_shield' }; }],
    ['sigil', { ...EVEN(), classId: 'mage', kit: 'sigil' }], ['soul', { ...EVEN(), classId: 'channeler', kit: 'soul' }], ['even', { ...EVEN() }],
    ['caster', { ...CASTER }],
  ];
  for (const [name, spec, more] of sheets) {
    let g: any; try { g = padFight(spec); if (more) more(g); } catch (e: any) { T['pad/' + name + '/setup'] = 'THREW ' + why(e); continue; }
    { const u = pcs(g)[0], c = charOf(g, u); if (name === 'even') { c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7; } }
    playPad(T, 'pad/' + name, g, casesFor(g)); gives(T, 'pad/' + name, g);
  }
  // every technique, each made the only one known, with the first weapon that can make it (the reducer, a turn's 9 AP)
  for (const system of ['melee', 'ranged']) for (const def of (Object.values(A.TECHNIQUE) as any[]).filter((d) => d.system === system)) {
    let done = false;
    for (const wid of TECH_WEAPONS[system]) {
      const g = fightSpec([{ ...SHOOTER, weapon: wid }, { ...SHOOTER }], [{ tier: 'soldier' }, { tier: 'elite' }, { tier: 'soldier' }], { level: 6, seed: 'tech/' + wid });
      const u = pcs(g)[0], [sold, elite, third] = foes(g), melee = A.isMelee ? !!A.WEAPON[wid] && A.meleeArm(A.WEAPON[wid]) && wid !== 'throwing_knives' : false;
      if (def.needs?.shield) { u.offItem = 'riot_shield'; u.offWeapon = 'riot_shield'; charOf(g, u).offHand = { id: 'riot_shield' }; }
      place(g, [[u, melee ? '6,5' : '3,5'], [sold, '7,5'], [third, '8,5'], [elite, '13,13'], [pcs(g)[1], '3,6']]); turn(g, u); u.braced = true;
      const p = A.phys.ensurePhys(charOf(g, u)); p.known = [def.id]; p.ready = { melee: system === 'melee' ? [def.id] : [], ranged: system === 'ranged' ? [def.id] : [] }; p.uncapped = true;
      if (u.resMax?.momentum != null) (u.res ||= {}).momentum = u.resMax.momentum; try { sold.pressure = W(g, () => A.pressureCap(sold)); } catch { /* no Pressure */ }
      if (def.needs?.hidden) { u.hidden = true; u.hideEntry = 1; }
      const ally = pcs(g)[1], tries = [{ targetId: sold.id, tile: sold.pos }, { targetId: sold.id, tile: sold.pos, opt: 'head' }, { targetId: sold.id }, { tile: sold.pos }, {}, { allyId: ally.id }, { allyId: ally.id, targetId: sold.id }, { targetId: sold.id, tile: '8,5' }, { tile: '5,5' }];
      const ok = tries.find((a) => { try { return W(g, () => A.previewTechnique(g.combat, u, def.id, { ...a }, g))?.ok; } catch { return false; } });
      if (!ok) continue;
      T['tech/' + def.id + '/' + wid] = act(g, { type: 'combat/technique', unitId: u.id, id: def.id, ...ok }, HIT).line; done = true; break;
    }
    if (!done) T['tech/' + def.id] = 'REFUSED (no weapon of the table makes it)';
  }
}

const COST_HOOKS = ['stat', 'glyph_cost', 'evoke_cost', 'outburst_cost', 'release_cost', 'move_cost', 'call_cost', 'attack_preview', 'outburst_pump', 'outburst_begin', 'reload', 'swap', 'jam_clear', 'throw', 'hide', 'parley',
  'stim_start', 'turn_start_pre', 'turn_start', 'turn_end', 'on_kill', 'weapon_actions', 'held_turn_start', 'analyze', 'action_done', 'call', 'moved', 'volley_end', 'combat_start', 'round_start'];
/** The pad again for every holder of an item that changes a cost or gives AP: only the lines that differ from the same
 * sheet without the item (so a line here is the item's doing). One reading each (no short / again / next). */
export function recordAskers(T: Record<string, string>, part: 'perks' | 'traits' | 'classes') {
  const bases: Record<string, Record<string, string>> = {};
  const padOf = (spec: any, more?: (g: any) => void): Record<string, string> => { const t: Record<string, string> = {}; const g = padFight(spec); if (more) more(g); playPad(t, '', g, casesFor(g)); gives(t, '', g); return t; };
  const baseOf = (spec: any, more?: (g: any) => void) => (bases[JSON.stringify(spec)] ||= padOf(spec, more));
  const asks = (key: string, tier?: string) => { try { const H = hooksOf(key, tier); return COST_HOOKS.some((h) => H.has(h)); } catch { return true; } };
  const diff = (key: string, base: Record<string, string>, got: Record<string, string>) => { let n = 0; for (const [k, v] of Object.entries(got)) if (base[k] !== v) { T[key + k] = v; n++; } for (const k of Object.keys(base)) if (!(k in got)) { T[key + k] = 'GONE'; n++; } if (!n) T[key + '/#'] = 'no line differs'; };
  if (part === 'perks') for (const p of A.PERKS) for (const tier of tiersOf(p)) {
    if (!asks('perk:' + p.id, tier)) continue;
    const core = A.SKILL[(p.skills || [])[0]]?.core || '', classId = /mind/i.test(core) ? 'mage' : /soul/i.test(core) ? 'channeler' : 'fighter';
    const without = { classId, ...(classId === 'mage' ? { kit: 'sigil' } : classId === 'channeler' ? { kit: 'soul' } : {}) }, key = 'asker/perk/' + p.id + '@' + tier;
    try { diff(key, baseOf(without), padOf({ ...without, perks: { [p.id]: tier } })); } catch (e: any) { T[key + '/setup'] = 'THREW ' + why(e); }
  }
  if (part === 'traits') for (const t of A.TRAITS) {
    if (!asks('trait:' + t.id)) continue; const key = 'asker/trait/' + t.id;
    try { diff(key, baseOf({}), padOf({ traits: [t.id] })); } catch (e: any) { T[key + '/setup'] = 'THREW ' + why(e); }
  }
  if (part === 'classes') for (const cls of Object.keys(A.BASE_CLASS)) for (const [rank, lv, pts] of [['I', 3, 5], ['II', 6, 6], ['III', 12, 9]] as const) {
    const at = A.CLASS[cls].attribute, kit = ['mage', 'trickster', 'infiltrator'].includes(cls) ? 'sigil' : ['channeler', 'bard', 'guardian'].includes(cls) ? 'soul' : 'soldier';
    const without = { level: lv, kit, attrs: { ...EVEN().attrs, [at]: pts } }, key = 'asker/class/' + cls + '@' + rank;
    const faith = (g: any) => { const c = charOf(g, pcs(g)[0]); c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7; };
    try { diff(key, baseOf(without, faith), padOf({ ...without, classId: cls }, faith)); } catch (e: any) { T[key + '/setup'] = 'THREW ' + why(e); }
  }
}

// ---------------------------------------------------------------------------------------------- credit, foes, cooldowns
// Three sections added by the review of engine foundations 2 (hand-off: "Problems found in review and what was done").
// They were recorded on the engine BEFORE the costs refactor (the main line) and then played on the refactored one, so
// a line that differs between the two is a behaviour change, and each such line is listed in the hand-off.
//
//   credit     every action of the pad made by a unit that carries a Brief (1 AP, 2 AP), an Encore for that very action
//              (2 AP) or both, with 0, 1, 2, 3 and 6 AP of its own: what it took from the unit, what is left of the
//              Brief and the Encore, the AP counted as gained, and what the log said of the credit.
//   foes       an enemy's whole turn with each gun, loaded and empty, at 2, 3 and 6 AP: what it spent and where it ended.
//   cooldowns  when a limit comes BACK, round by round: a Hymn after a Hymn, and the AP a kill gives a holder of an AP
//              perk on each of the five rounds after the kill that gave it.
const CREDITS: [string, (g: any, u: any, a: any) => void][] = [
  ['none', () => { /* the same action with the unit's own AP only: what the credits are compared with */ }],
  ['brief1', (_g, u) => { (u.call ||= {}).brief = { cuts: [1] }; }],
  ['brief2', (_g, u) => { (u.call ||= {}).brief = { cuts: [2] }; }],
  ['encore', (_g, u, a) => { const key = A.encoreKey(a); if (key) (u.faith ||= {}).encore = { key, ap: 2, started: true, round: 1 }; }],
  ['both', (_g, u, a) => { (u.call ||= {}).brief = { cuts: [1] }; const key = A.encoreKey(a); if (key) (u.faith ||= {}).encore = { key, ap: 2, started: true, round: 1 }; }],
];
const CREDIT_AP = [0, 1, 2, 3, 6];
const creditLeft = (g: any, id: string): string => { const u = units(g).find((x: any) => x.id === id); return u ? 'brief[' + (u.call?.brief?.cuts || []).join('/') + '] encore[' + (u.faith?.encore ? u.faith.encore.ap : '') + '] gained' + (u.apGained || 0) + ' total' + (u.apTurnTotal ?? '') : 'gone'; };
const creditLog = (g0: any, g1: any): string => (g1.combat?.log || []).slice((g0.combat?.log || []).length).filter((l: string) => /Briefed|Encore/.test(l)).map((l: string) => l.trim()).join(' / ');
function playCredit(T: Record<string, string>, key: string, g0: any, cases: Case[]) {
  for (const [name, prep, tries] of cases) for (const [cname, give] of CREDITS) {
    const parts: string[] = [];
    for (const ap of CREDIT_AP) {
      const g = copy(g0), u = pcs(g)[0];
      try { if (prep) prep(g, u); } catch (e: any) { parts.push('ap' + ap + ': PREP ' + why(e)); continue; }
      let list: any[] = []; try { list = tries(g, u).map((a) => ({ unitId: u.id, ...a })); } catch { list = []; }
      u.ap = ap; u.bank = 0; delete u.apGained; delete u.apTurnTotal;
      let first = '', done = '';
      for (const a of list) {
        const gc = copy(g), uc = units(gc).find((x: any) => x.id === u.id); give(gc, uc, a);
        const r = act(gc, a, HIT); const state = r.line.split(SEP)[0];
        if (r.ok) { done = state + ' => ' + creditLeft(r.g, u.id) + (creditLog(gc, r.g) ? ' "' + creditLog(gc, r.g) + '"' : ''); break; }
        first ||= state; if (/^THREW/.test(r.line)) break;
      }
      parts.push('ap' + ap + ': ' + (done || first || 'REFUSED (no arguments)'));
    }
    T[key + '/' + name + '/' + cname] = parts.join(' | ');
  }
}
export function recordCredit(T: Record<string, string>) {
  const sheets: [string, any, ((g: any) => void)?][] = [
    ['rifle', { ...SHOOTER, weapon: 'hellraiser_service_rifle' }], ['lmg', { ...SHOOTER, weapon: 'hellraiser_lmg' }], ['sabre', { ...SHOOTER, weapon: 'sabre' }],
    ['two-guns', { ...SHOOTER, weapon: 'service_pistol' }, (g) => { const u = pcs(g)[0]; u.offWeapon = 'service_pistol'; u.offAmmo = 3; u.offMags = [8, 8]; u.mags = [8, 8, 8]; charOf(g, u).offHand = { id: 'service_pistol' }; }],
    ['sigil', { ...EVEN(), classId: 'mage', kit: 'sigil' }], ['soul', { ...EVEN(), classId: 'channeler', kit: 'soul' }],
    ['even', { ...EVEN() }, (g) => { const c = charOf(g, pcs(g)[0]); c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7; }],
  ];
  for (const [name, spec, more] of sheets) {
    let g: any; try { g = padFight(spec); if (more) more(g); } catch (e: any) { T['credit/' + name + '/setup'] = 'THREW ' + why(e); continue; }
    playCredit(T, 'credit/' + name, g, casesFor(g));
  }
  // every item action (a perk's, a trait's, a class move's) of three sheets that hold many, with each credit
  for (const [name, spec] of [['fighter', { classId: 'fighter', level: 12, kit: 'soldier' }], ['mage', { classId: 'mage', level: 12, kit: 'sigil' }], ['guardian', { classId: 'guardian', level: 12, kit: 'soul' }]] as const) {
    let g: any; try { g = padFight({ ...spec, attrs: { ...EVEN().attrs, [A.CLASS[spec.classId].attribute]: 9 } }); } catch (e: any) { T['credit/' + name + '/setup'] = 'THREW ' + why(e); continue; }
    const u0 = pcs(g)[0], [f, far] = foes(g), al = pcs(g)[1];
    let rows: any[] = []; try { rows = W(g, () => A.perkActionsFor({ u: u0, c: charOf(g, u0), cb: g.combat, g }, 'combat')); } catch { rows = []; }
    const cases: Case[] = rows.map((e: any) => ['perk/' + e.id + '#' + e.actionId, null, () => [{ targetId: far.id }, { targetId: f.id }, { targetId: al.id }, {}, { tile: '5,6' }, { targetId: f.id, tile: f.pos }, { tile: far.pos }].map((a) => ({ type: 'combat/perk', id: e.id, actionId: e.actionId, ...a }))]);
    if (!cases.length) T['credit/' + name + '/perk'] = 'no item action';
    playCredit(T, 'credit/' + name, g, cases);
  }
}

export function recordFoes(T: Record<string, string>) {
  const guns = (Object.values(A.WEAPON) as any[]).filter((w) => w.magazine != null && w.reload).map((w) => w.id).sort();
  for (const wid of guns) for (const tier of ['soldier', 'elite']) {
    let g: any; try { g = fightSpec([{ ...SHOOTER }, { ...SHOOTER }], [{ tier, weapon: wid }], { level: 6, seed: 'foe/' + wid }); } catch (e: any) { T['foe/' + wid + '/' + tier + '/setup'] = 'THREW ' + why(e); continue; }
    const [u, al] = pcs(g), f = foes(g)[0];
    place(g, [[u, '3,6'], [al, '2,8'], [f, '8,6']]); turn(g, u, 9);
    for (const [aname, ammo] of [['empty', 0], ['one', 1], ['full', null]] as const) for (const ap of [2, 3, 6]) {
      const g1 = copy(g), e0 = foes(g1)[0]; g1.combat.turn = g1.combat.order.indexOf(e0.id); g1.combat.round = 2; delete g1.combat.window; e0.ap = ap; e0.bank = 0; if (ammo != null) e0.ammo = ammo;
      const hp0 = pcs(g1).reduce((t: number, x: any) => t + x.hp, 0);
      let r: any; (ALSO as any).ai = true; try { r = run(g1, (g2, cb) => { A.enemyTurn(cb, g2.rng); return null; }); } finally { delete (ALSO as any).ai; }
      const e1 = r.g ? foes(r.g)[0] : null, log: string[] = r.g ? (r.g.combat.log || []).slice((g1.combat.log || []).length) : [];
      T['foe/' + wid + '/' + tier + '/' + aname + '/ap' + ap] = r.line.split(SEP)[0] + ' => at ' + (e1 ? e1.pos : '?') + ', reloads ' + log.filter((l) => /reloads|loads \d/.test(l)).length + ', squad hp ' + (r.g ? pcs(r.g).reduce((t: number, x: any) => t + x.hp, 0) - hp0 : '?') + ', log lines ' + log.length;
    }
  }
}

export function recordCooldowns(T: Record<string, string>) {
  // a Hymn after a Hymn, at each Devotion that changes the wait: the same Hymn and another one, on each of the next 8 rounds
  for (const patron of Object.keys(A.FAITH_PATRON).sort()) for (const dev of [3, 5, 7, 10]) {
    let g: any; try { g = padFight({ ...EVEN() }); } catch (e: any) { T['cool/hymn/' + patron + '/setup'] = 'THREW ' + why(e); continue; }
    const u = pcs(g)[0], c = charOf(g, u), far = foes(g)[1], al = pcs(g)[1], p = A.FAITH_PATRON[patron];
    c.belief = { kind: 'faithful', patron }; c.patron = patron; c.devotion = dev; try { A.setDevotionXp(c, A.devotionThreshold(dev)); } catch { /* the level field is enough */ }
    const tries = PRAY_TRIES(g, u, far, al);
    for (const h of p.hymns) {
      const first = tryAct(g, { type: 'combat/pray', unitId: u.id, kind: 'hymn', id: h.id }, tries, HIT);
      if (!first.ok) { T['cool/hymn/' + patron + '@' + dev + '/' + h.id] = first.line.split(SEP)[0]; continue; }
      const back: string[] = [];
      for (const other of p.hymns) {
        let at = 'never in 8';
        for (let n = 0; n <= 8; n++) {
          const g2 = copy(first.g), u2 = units(g2).find((x: any) => x.id === u.id); g2.combat.round += n;
          try { if (n) turn(g2, u2, 9); else u2.ap = 9; } catch { at = 'THREW'; break; }
          if (g2.combat.order[g2.combat.turn] !== u2.id || u2.dead || u2.downed) { at = 'no turn at +' + n; break; }
          const r = tryAct(g2, { type: 'combat/pray', unitId: u.id, kind: 'hymn', id: other.id }, PRAY_TRIES(g2, u2, units(g2).find((x: any) => x.id === far.id), units(g2).find((x: any) => x.id === al.id)), HIT);
          if (r.ok) { at = '+' + n; break; } if (!/wait|ago|round/i.test(r.line)) { at = '+' + n + ' (' + r.line.split(SEP)[0].slice(0, 60) + ')'; break; }
        }
        back.push(other.id + ' back ' + at);
      }
      T['cool/hymn/' + patron + '@' + dev + '/' + h.id] = back.join(' | ');
    }
  }
  // the AP perks: the AP of a kill on each of the five rounds after a kill (a shot and a blow)
  const killAp = (g0: any, how: 'shot' | 'melee'): string => {
    const g = copy(g0); { const t = foes(g)[how === 'shot' ? 1 : 0]; t.hp = 1; t.armour = 0; }
    const r0 = act(g, { type: 'combat/attack', unitId: pcs(g)[0].id, targetId: foes(g)[how === 'shot' ? 1 : 0].id, mode: how }, HIT); if (!r0.ok) return r0.line.split(SEP)[0];
    const out = ['+0: ' + r0.line.split(SEP)[0]];
    for (let n = 1; n <= 5; n++) {
      const g2 = copy(r0.g), u2 = pcs(g2)[0]; g2.combat.round += n; g2.combat.over = false;
      try { turn(g2, u2, 6); } catch (e: any) { out.push('+' + n + ': THREW ' + why(e)); continue; }
      const t = foes(g2)[2]; t.hp = 1; t.armour = 0; t.pos = how === 'shot' ? '7,6' : '4,6'; u2.ammo = Math.max(u2.ammo || 0, 5);
      const ap0 = u2.ap, r = act(g2, { type: 'combat/attack', unitId: u2.id, targetId: t.id, mode: how }, HIT);
      const u3 = r.g ? pcs(r.g)[0] : null; out.push('+' + n + ': ' + (r.ok && u3 ? 'ap' + ap0 + '>' + u3.ap + (u3.apNext ? ' next' + u3.apNext : '') : r.line.split(SEP)[0].slice(0, 60)));
    }
    return out.join(' | ');
  };
  const gives = (key: string, tier?: string) => { try { const H = hooksOf(key, tier); return ['on_kill', 'on_hit', 'action_done', 'turn_start', 'turn_start_pre'].some((h) => H.has(h)); } catch { return true; } };
  const both = (key: string, spec: any) => { try { const g = padFight(spec); T[key + '/kill-shot'] = killAp(g, 'shot'); T[key + '/kill-blow'] = killAp(g, 'melee'); } catch (e: any) { T[key + '/setup'] = 'THREW ' + why(e); } };
  both('cool/ap/none', { classId: 'fighter' });
  for (const p of A.PERKS) for (const tier of tiersOf(p)) if (gives('perk:' + p.id, tier)) both('cool/ap/perk/' + p.id + '@' + tier, { classId: 'fighter', perks: { [p.id]: tier } });
  for (const t of A.TRAITS) if (gives('trait:' + t.id)) both('cool/ap/trait/' + t.id, { traits: [t.id] });
}

// ---------------------------------------------------------------------------------------------- the files
export const COST_SECTIONS: Record<string, () => Record<string, string>> = {
  pad: () => { const T = {}; reading(() => recordPad(T)); return T; },
  'askers-perks': () => { const T = {}; reading(() => recordAskers(T, 'perks'), true); return T; },
  'askers-traits': () => { const T = {}; reading(() => recordAskers(T, 'traits'), true); return T; },
  'askers-classes': () => { const T = {}; reading(() => recordAskers(T, 'classes'), true); return T; },
  credit: () => { const T = {}; reading(() => recordCredit(T), true); return T; },
  foes: () => { const T = {}; reading(() => recordFoes(T), true); return T; },
  cooldowns: () => { const T = {}; reading(() => recordCooldowns(T), true); return T; },
  // the damage tables' own actions, read as costs
  ...Object.fromEntries(['techniques', 'sigil', 'outburst', 'faith', 'items-perks', 'items-traits-classes', 'items-shelved', 'special', 'flat', 'weapons'].map((s) => [s, () => { const T = {}; reading(() => { SECTIONS[s](T); }); return T; }])),
};
const fileOf = (name: string) => fileURLToPath(new URL('./' + name + '.json', import.meta.url));
const write = (name: string, t: Record<string, any>) => writeFileSync(fileOf(name), '{\n' + Object.entries(t).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n');
const read = (name: string): Record<string, any> => (existsSync(fileOf(name)) ? JSON.parse(readFileSync(fileOf(name), 'utf8')) : {});
function diffTables(name: string, want: Record<string, string>, got: Record<string, string>, how: string) {
  const diffs: string[] = [];
  for (const k of Object.keys(want)) if (!(k in got)) diffs.push('GONE     ' + k + '\n    was: ' + want[k]); else if (got[k] !== want[k]) diffs.push('CHANGED  ' + k + '\n    was: ' + want[k] + '\n    now: ' + got[k]);
  for (const k of Object.keys(got)) if (!(k in want)) diffs.push('NEW      ' + k + '\n    now: ' + got[k]);
  if (diffs.length) expect.fail('golden table "' + name + '": ' + diffs.length + ' of ' + Object.keys(want).length + ' lines differ from test/golden/' + name + '.json. The first ' + Math.min(10, diffs.length) + ':\n' + diffs.slice(0, 10).join('\n') + '\n(' + how + ')');
  expect(Object.keys(want).length).toBeGreaterThan(0);
}
/** Play a costs section and compare it with its two files (or write them). Returns the number of lines. */
export function goldenCosts(section: string): number {
  const { state, marks } = split(COST_SECTIONS[section]()), rec = process.env.GOLDEN_RECORD, name = 'costs-' + section;
  if (rec === '1') write(name, state);
  const noMarks = !Object.keys(marks).length && !existsSync(fileOf(name + '.marks')); // a section that reads no marks (credit, foes, cooldowns) keeps no marks file
  if (noMarks) { if (rec === '1') console.log('GOLDEN_RECORD: wrote test/golden/' + name + '.json (' + Object.keys(state).length + ' lines)'); }
  else if (rec === '1' || rec === 'marks') { write(name + '.marks', marks); console.log('GOLDEN_RECORD: wrote test/golden/' + name + (rec === '1' ? '.json and ' + name : '') + '.marks.json (' + Object.keys(state).length + ' lines)'); }
  if (rec !== '1') diffTables(name, read(name), state, 'A state line moved: an action takes or gives something else, or a limit allows something else. If that was a ruling, record on purpose (GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-costs) and list the line in the hand-off.');
  if (rec !== '1' && rec !== 'marks' && !noMarks) diffTables(name + '.marks', read(name + '.marks'), marks, 'Only the marks moved (where a counter is kept). If that was meant: GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs');
  return Object.keys(state).length;
}
