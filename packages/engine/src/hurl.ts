// Rules 1.82 item 7010: P14, the object op's `hurl` (momentum-2.0 item 16 and section 8.3; a new engine piece, approved
// by Leon on 20 Nov 2026). Lift a loose object (objects.json `loose.kg`) or a unit next to you and throw it at a tile:
// the action's choice names what is lifted ("o:<object id>" or "u:<unit id>", the pick list `hurlable`), its tile where it
// lands. Every rule of the throw is in the op's row (data): `range` (tiles, or "throw": the unit's throwing range),
// `kg_per_tile` (a tile less for each so many kg), `carry` (no heavier than the holder can carry), `units` (the `if` a unit
// lifted must pass, tested as the target: absent, no unit), `objects` (false: no object), `amount` (the holder's block,
// its per-point parts counting `kg`). What a unit weighs is rules.json combat.hurl. One copy: the Breaker's Hurl and
// Grenadier's Arm both run here (perks/c.ts's own throws are gone).
import type { Combat, Unit } from './combat';
import type { Holder } from './effects/types';
import { RULES } from './data';
import { dist, xy, key, refOf, lineOfSight, standable, objectsOf, hurtUnit, displace, emitFx, damageObject, checkOver } from './combat';
import { kindOf, blocksMove } from './objects';
import { canStand } from './kit';
import { ifFails } from './effects/hooks';
import { charOfUnit } from './effects/hooks';
import { carryLimit, physicalMult } from './character';
import { amountSpecOf } from './effects/amounts';
import { term, amountOf } from './effects/output';
import { throwRangeOf } from './tactics';
import { tilesN, say } from './log';

/** A hurl row (the op `object` with `do: "hurl"`). */
export interface HurlRow { op: 'object'; do: 'hurl'; range?: number | 'throw'; kg_per_tile?: number; carry?: boolean; units?: any; objects?: boolean; amount?: string; label?: string }
const HR: { unit_kg: Record<string, number>; never: string[] } = (RULES as any).combat.hurl;
/** What a unit weighs when lifted (rules.json combat.hurl.unit_kg by tier, a drone, a companion; null: it can't be). */
export function unitKg(t: Unit): number | null {
  if ((HR.never || []).includes(t.tier || '')) return null;
  const k = HR.unit_kg; return t.companion === 'drone' ? k.drone : t.companion ? k.companion : (t.tier && k[t.tier] != null ? k[t.tier] : k.default);
}
/** What a loose object weighs (objects.json `loose.kg`), or null when it is not loose. */
export const objectKg = (o: any): number | null => { const l = (kindOf(o) as any)?.loose; return l && typeof l.kg === 'number' && !o.dead ? l.kg : null; };
/** The hurl row an item holds (in a grant or on its own), or null. */
export function hurlRowOf(h: Holder): HurlRow | null {
  const find = (xs: any[]): any => { for (const e of xs || []) { if (e?.op === 'object' && e.do === 'hurl') return e; const n = find(e?.effects); if (n) return n; } return null; };
  return find(h.info.effects);
}
type Lifted = { kind: 'object'; o: any; kg: number; name: string } | { kind: 'unit'; t: Unit; kg: number; name: string };
function liftedOf(h: Holder, row: HurlRow, choice: string | null | undefined): Lifted | string {
  const u = h.u!, cb = h.cb!, c = String(choice || '');
  if (c.startsWith('o:')) {
    if (row.objects === false) return 'Not an object.';
    const o = objectsOf(cb).find((x: any) => x.id === c.slice(2)); const kg = o ? objectKg(o) : null;
    if (!o || kg == null) return 'Pick a loose object next to you.';
    if (dist(u.pos, o.pos) > 1) return 'Walk up to it first.';
    return { kind: 'object', o, kg, name: 'the ' + String(o.name).toLowerCase() };
  }
  if (c.startsWith('u:')) {
    const t = cb.units.find((x) => x.id === c.slice(2)); if (!t || t === u || t.dead) return 'Pick someone next to you.';
    if (!row.units) return 'Not a unit.';
    if (dist(u.pos, t.pos) > 1) return t.name + ' is not next to you.';
    const kg = unitKg(t); if (kg == null) return 'Nobody throws ' + t.name + '.';
    const k = ifFails(h, row.units, t); if (k) return typeof (row as any).why?.[k] === 'string' ? (row as any).why[k].replace(/\{target\}/g, t.name) : 'Not ' + t.name + ' (' + k.replace(/_/g, ' ') + ').'; // the row's own sentence for the failing predicate
    return { kind: 'unit', t, kg, name: t.name };
  }
  return 'Pick what to throw.';
}
/** How far this holder throws what weighs kg by the row (at least 1). */
const rangeFor = (u: Unit, row: HurlRow, kg: number): number => Math.max(1, (row.range === 'throw' || row.range == null ? throwRangeOf(u) : Number(row.range)) - (row.kg_per_tile ? Math.floor(kg / row.kg_per_tile) : 0));
/** Where a thrown thing comes down: the tile, unless something is there (then the nearest free tile round it), or null. */
function landingOf(cb: Combat, tile: string, l: Lifted): string | null {
  const free = (k: string) => (l.kind === 'unit' ? canStand(cb, k, l.t) : standable(cb.map, k) && !objectsOf(cb).some((x: any) => x !== l.o && x.pos === k && blocksMove(x)) && !cb.units.some((v) => !v.dead && v.pos === k));
  if (free(tile)) return tile;
  const [x, y] = xy(tile); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) { const k = key(x + dx, y + dy); if (free(k)) return k; }
  return null;
}
/** The throw's damage: the holder's amount block the row names (its per-point parts counting kg), × the thrower's
 * physical Stat term; no Level term (as Grenadier's Arm always was). */
const dmgOf = (h: Holder, row: HurlRow, kg: number): number => { const c = h.c || charOfUnit(h.u); return Math.floor(amountOf(amountSpecOf(h.key, row.amount || 'damage'), null, { level: null, mults: [term(c ? physicalMult(c) : 1, 'stat: physical')], counts: { kg } }).raw); };
/** Why this hurl can't be made with this choice and tile (null: it can), and its preview line. */
export function hurlWhy(h: Holder, row: HurlRow, choice: string | null | undefined, tile: string | null | undefined): { why: string | null; line?: string } {
  const u = h.u, cb = h.cb; if (!u || !cb) return { why: 'In a fight.' };
  const l = liftedOf(h, row, choice); if (typeof l === 'string') return { why: l };
  const c = h.c || charOfUnit(u);
  if (row.carry && l.kg > (c ? carryLimit(c) : 0)) return { why: 'Too heavy: about ' + l.kg + ' kg; you can carry ' + Math.floor(c ? carryLimit(c) : 0) + ' kg.' };
  const range = rangeFor(u, row, l.kg);
  if (!tile) return { why: 'Pick where it lands (within ' + tilesN(range) + ').' };
  if (dist(u.pos, tile) > range) return { why: 'Out of range: ' + tilesN(range) + ' for ' + l.kg + ' kg.' };
  if (!lineOfSight(cb, u.pos, tile)) return { why: 'No line of sight to throw there.' };
  if (!landingOf(cb, tile, l)) return { why: 'No room to land there.' };
  const n = dmgOf(h, row, l.kg);
  return { why: null, line: (l.kind === 'unit' ? l.name : 'The ' + l.name.slice(4)) + ' (' + l.kg + ' kg) flies to ' + refOf(tile) + ': ' + n + ' damage to ' + (l.kind === 'unit' ? 'it and to anyone there.' : 'whoever is there, and to it.') };
}
/** The pick list `hurlable`: the loose objects and the units next to the holder its hurl row takes (ids for the choice). */
export function hurlables(h: Holder): { id: string; label: string; off?: string }[] {
  const u = h.u, cb = h.cb, row = hurlRowOf(h); if (!u || !cb || !row) return [];
  const out: { id: string; label: string; off?: string }[] = [];
  if (row.objects !== false) for (const o of objectsOf(cb) as any[]) if (objectKg(o) != null && dist(u.pos, o.pos) <= 1) out.push({ id: 'o:' + o.id, label: o.name + ' (' + refOf(o.pos) + ')' });
  if (row.units) for (const t of cb.units) if (t !== u && !t.dead && dist(u.pos, t.pos) <= 1) { const l = liftedOf(h, row, 'u:' + t.id); out.push({ id: 'u:' + t.id, label: t.name, ...(typeof l === 'string' ? { off: l } : {}) }); }
  return out;
}
/** Make the throw (the op's run): what is lifted lands on the tile (or the nearest free one), it and whoever is there take
 * the row's amount (a unit through the one forced move, displace, how "throw"; an object is moved and then struck, so a
 * barrel that breaks goes off as barrels do). Says it in the log; false when it can't. */
export function hurlRun(h: Holder, row: HurlRow, choice: string | null | undefined, tile: string | null | undefined): undefined | false {
  const u = h.u!, cb = h.cb!; if (!tile || hurlWhy(h, row, choice, tile).why) return false;
  const l = liftedOf(h, row, choice) as Lifted, land = landingOf(cb, tile, l)!, dmg = dmgOf(h, row, l.kg), label = row.label || h.info.name;
  const hit = cb.units.find((v) => !v.dead && v.pos === tile && (l.kind !== 'unit' || v !== l.t)) || null;
  if (l.kind === 'unit') {
    const mv = displace(cb, null, l.t, { tile: land }, { by: u, how: 'throw', source: 'throw' });
    if (!mv.moved) { say(cb, l.t.name + ' won\'t be thrown' + (mv.why ? ' (' + mv.why + ')' : '') + '.'); return undefined; }
    const out = u.name + ' throws ' + l.t.name + ' to ' + refOf(land) + ' (' + label + ')' + hurtUnit(l.t, dmg, false, cb, 'thrown', u) + (hit ? hurtUnit(hit, dmg, false, cb, 'thrown', u) : '') + mv.text;
    say(cb, out + '.'); checkOver(cb); return undefined;
  }
  const was = l.o.pos; l.o.pos = land; emitFx(cb, 'shove', { unit: u.id, target: null, from: was, to: land, ok: true, object: l.o.id });
  const out = u.name + ' hurls ' + l.name + ' to ' + refOf(land) + ' (' + label + ')' + (hit ? hurtUnit(hit, dmg, false, cb, 'thrown', u) : '') + (l.o.hp != null && l.o.hp > 0 ? damageObject(cb, land, dmg, 0, u) : '');
  say(cb, out + '.'); checkOver(cb); return undefined;
}
