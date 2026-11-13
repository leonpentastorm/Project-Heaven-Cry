// GIVES BETWEEN CHARACTERS (rules 1.46; docs/design/survival-spec.md rule 47, section 4.2 primitive 13).
//
// One door, `gear/give`, for every hand-over between two characters of the room: a pack entry (a weapon or focus with
// its grade, durability, mods and named property; armour; a mod not fitted; ammunition and cores; items; a plot item)
// or credits. A plain give: the receiver is not asked; the log says who gave what to whom. `giveProblem` is the one
// predicate (the spec's `canGive`): the mode says where (a Survival run: the node kinds of `survival.json give.where`
// and the start; a campaign: out of a fight), and the refusals are in words: in a fight; a boon, a token or the graft
// (`c.relics`); a training; the fitted armour class; a Relic whose property would take the receiver past the run's cap.
// The entry arrives as it was: an instance is never merged into another (packAdd merges only what a pickup merges:
// loose rounds by calibre and type, magazines by gun, plain stacks).
import './datatext';
import svJ from '../../../data/survival.json';
import { WEAPON, ITEM } from './data';
import { type Character, type PackItem, packOf } from './character';
import { packAdd, itemLabel } from './containers';
import { creditsOf, payCredits, earnCredits } from './credits';
import { relicRow, worthOf, runWorth, BOON_CAP } from './run/power';
import type { GameState } from './game';

/** Where a run's gives are made (`survival.json give`): the node kinds with no fight, and before the first node. */
export const GIVE: { where: string[]; at_start: boolean } = (svJ as any).give;
/** A give (rules 1.46): from `charId` to `to`, one of: `idx` (a pack entry, `qty` of a stack or of its magazines),
 * `credits` (an amount), or a thing that is never given, named so the refusal is in words (`relic`, `train`, `armour`). */
export interface GiveAction { type: 'gear/give'; charId: string; to: string; idx?: number; qty?: number; credits?: number; relic?: string; train?: string; armour?: boolean }

/** Why no give can be made in this room now (the mode's where), in words, or null. */
export function giveWhereProblem(g: GameState): string | null {
  if (g.phase === 'combat' && g.combat && !g.combat.over) return 'Hand things over after the fight.';
  const r = g.run;
  if (r && r.state !== 'over') {
    if (r.state === 'fight') return 'Hand things over after the fight.';
    if (!r.at) return GIVE.at_start ? null : 'Gives are made at a node with no fight.';
    const n = r.nodes.find((x) => x.id === r.at), k = n?.kind || '';
    if (!GIVE.where.includes(k)) return 'Gives are made at a node with no fight (a shop, a Forge, a training ground, a shrine, a rest, a cache or a crossroads), not here.';
  }
  return null;
}
const qtyOf = (it: PackItem, q?: number) => { const most = it.mags ? it.mags.length : it.qty; return Math.max(1, Math.min(most, Math.round(q ?? most))); };
/** The part of a pack entry a give of `qty` hands over (a stack's count, or that many of its magazines). */
function partOf(it: PackItem, k: number): PackItem {
  if (it.mags) return { ...it, mags: it.mags.slice(0, k), qty: k, ...(it.magTypes ? { magTypes: it.magTypes.slice(0, k) } : {}) };
  return { ...it, qty: k };
}
/** Why `by` can't make this give, in words, or null (rules 1.46; spec rule 47 and primitive 13). */
export function giveProblem(g: GameState, by: string, a: GiveAction): string | null {
  const c = g.characters[a.charId]; if (!c) return 'No such character.';
  if (c.owner !== by) return 'Only ' + c.name + '\'s player gives what ' + c.name + ' carries.';
  const others = Object.values(g.characters).filter((x) => x.id !== c.id);
  if (!others.length) return 'There is nobody to give to: ' + c.name + ' is alone.';
  const where = giveWhereProblem(g); if (where) return where;
  const to = g.characters[a.to]; if (!to || to.id === c.id) return 'Give it to whom?';
  if (to.dead) return to.name + ' is dead.';
  if (c.dead) return 'The dead give nothing.';
  if (a.relic != null) { const row = relicRow(a.relic); return (row ? row.name : 'A boon') + ' is ' + c.name + '\'s own: boons, tokens and grafts are never given.'; }
  if (a.train != null) return 'Training is ' + c.name + '\'s own: drill, study, practice and Devotion are never given.';
  if (a.armour) return 'The armour class is fitted to ' + c.name + '\'s body, not carried: it is not given.';
  if (a.credits != null) {
    const n = Math.round(Number(a.credits));
    if (!(n >= 1)) return 'Give 1 credit or more.';
    if (n > creditsOf(c)) return c.name + ' has ' + creditsOf(c) + ' credits.';
    return null;
  }
  const it = a.idx == null ? undefined : packOf(c)[a.idx]; if (!it) return 'Nothing there in ' + c.name + '\'s pack.';
  const most = it.mags ? it.mags.length : it.qty;
  if (a.qty != null && !(Math.round(a.qty) >= 1 && Math.round(a.qty) <= most)) return 'Give 1 to ' + most + ' of those.';
  if (it.prop && g.run) { const w = worthOf(it.prop), now = runWorth(to);
    if (now + w > BOON_CAP) return 'The ' + itemLabel(it) + '\'s ' + (relicRow(it.prop)?.name || 'property') + ' (' + w + ') would take ' + to.name + ' past the run\'s cap (' + now + ' of ' + BOON_CAP + ' used).'; }
  return null;
}
/** Make a give (rules 1.46): the credits from one purse to the other, or the pack entry (its part) out of the giver's
 * pack and into the receiver's whole. Returns the log line, or the refusal in words (nothing changes). */
export function giveNow(g: GameState, by: string, a: GiveAction): { ok: string; to: Character; from: Character } | { no: string } {
  const no = giveProblem(g, by, a); if (no) return { no };
  const c = g.characters[a.charId], to = g.characters[a.to];
  if (a.credits != null) {
    const n = Math.round(Number(a.credits)), err = payCredits(c, n); if (err) return { no: err };
    earnCredits(to, n);
    return { ok: c.name + ' gives ' + to.name + ' ' + n + ' credits.', to, from: c };
  }
  const pack = packOf(c).map((x) => ({ ...x })), it = pack[a.idx!], k = qtyOf(it, a.qty), part = partOf(it, k);
  if (it.mags) { const left = it.mags.slice(k); if (left.length) pack[a.idx!] = { ...it, mags: left, qty: left.length, ...(it.magTypes ? { magTypes: it.magTypes.slice(k) } : {}) }; else pack.splice(a.idx!, 1); }
  else if (it.qty > k) pack[a.idx!] = { ...it, qty: it.qty - k }; else pack.splice(a.idx!, 1);
  c.pack = pack;
  const tp = packOf(to).map((x) => ({ ...x }));
  if (part.kind === 'plot') { const ex = tp.find((x) => x.kind === 'plot' && x.id === part.id); if (ex) ex.qty += part.qty; else tp.push(part); }
  else packAdd(tp, part);
  to.pack = tp;
  const label = itemLabel(part) + (part.prop ? ' (' + (relicRow(part.prop)?.name || part.prop) + ')' : '') + ((part.mods || []).length ? ' with ' + part.mods!.length + ' mod' + (part.mods!.length === 1 ? '' : 's') : '');
  return { ok: c.name + ' gives ' + to.name + ' ' + (k > 1 && !part.calibre && !part.mags ? k + ' × ' + itemLabel(part) : label) + '.', to, from: c };
}

// ---------------------------------------------------------------------------------------------- the Give tab's view
/** One line of the Give tab (rules 1.46): the purse, a pack entry (`idx`), something in a hand or worn (`unequip`: put
 * it in the pack first), or a thing never given; for each possible receiver the engine's reason it can't go (null: it
 * can). The client only draws these and sends `action` with `to` (and an amount or a quantity). */
export interface GiveRowV { key: string; kind: 'credits' | 'pack' | 'held' | 'never'; label: string; id: string; rarity: string; qty: number;
  idx?: number; unequip?: string; why: Record<string, string | null>; action: Omit<GiveAction, 'to'> }
/** The Give tab for one player's character: who can receive, and every line with its reasons (rules 1.46). */
export interface GiveViewV { from: { id: string; name: string; credits: number } | null; to: { id: string; name: string; owner: string; portrait: string }[]; rows: GiveRowV[]; none: string | null }
const RARE = (r?: string) => (r && r !== 'standard' ? r.charAt(0).toUpperCase() + r.slice(1) + ' ' : '');
const nameOfId = (id: string): string => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
/** The Give tab's view (rules 1.46) for player `me`'s character (or `charId`). */
export function giveView(g: GameState, me: string, charId?: string | null): GiveViewV {
  const c = (charId && g.characters[charId]) || Object.values(g.characters).find((x) => x.owner === me) || null;
  if (!c) return { from: null, to: [], rows: [], none: 'Bring a character to give.' };
  const to = Object.values(g.characters).filter((x) => x.id !== c.id).map((x) => ({ id: x.id, name: x.name, owner: x.owner, portrait: x.portrait || '' }));
  const none = to.length ? null : 'There is nobody to give to: ' + c.name + ' is alone.';
  const whys = (a: Omit<GiveAction, 'to'>) => Object.fromEntries(to.map((t) => [t.id, giveProblem(g, me, { ...a, to: t.id } as GiveAction)]));
  const rows: GiveRowV[] = [];
  const cr = { type: 'gear/give' as const, charId: c.id, credits: 1 };
  rows.push({ key: 'credits', kind: 'credits', label: 'Credits', id: 'credits', rarity: 'standard', qty: creditsOf(c), why: whys(cr), action: cr });
  packOf(c).forEach((it, idx) => { const a = { type: 'gear/give' as const, charId: c.id, idx };
    rows.push({ key: 'pack:' + idx, kind: 'pack', label: itemLabel(it) + (it.prop ? ' · ' + (relicRow(it.prop)?.name || it.prop) : ''), id: it.weapon || it.item || it.id, rarity: it.rarity || 'standard', qty: it.mags ? it.mags.length : it.qty, idx, why: whys(a), action: a }); });
  const held: [string, string | undefined, string | undefined][] = [['main', c.weapon && c.weapon !== 'fists' ? c.weapon : undefined, c.weaponState?.rarity], ['off', c.offHand?.id, c.offHand?.rarity],
    ...Object.entries(c.worn || {}).map(([slot, id]) => [slot, id, 'standard'] as [string, string, string])];
  for (const [slot, id, rarity] of held) if (id) rows.push({ key: 'held:' + slot, kind: 'held', label: RARE(rarity) + nameOfId(id), id, rarity: rarity || 'standard', qty: 1, unequip: slot,
    why: Object.fromEntries(to.map((t) => [t.id, giveWhereProblem(g) || none])), action: { type: 'gear/give', charId: c.id } });
  for (const id of c.relics || []) { const a = { type: 'gear/give' as const, charId: c.id, relic: id }; rows.push({ key: 'relic:' + id, kind: 'never', label: relicRow(id)?.name || id, id, rarity: 'relic', qty: 1, why: whys(a), action: a }); }
  const tr = { type: 'gear/give' as const, charId: c.id, train: 'drill' };
  rows.push({ key: 'train', kind: 'never', label: 'Trainings (drill, study, practice, Devotion)', id: 'train', rarity: 'standard', qty: 1, why: whys(tr), action: tr });
  if (c.armourClass) { const a = { type: 'gear/give' as const, charId: c.id, armour: true }; rows.push({ key: 'armour', kind: 'never', label: 'Armour class ' + c.armourClass + ' (fitted)', id: 'armour', rarity: 'standard', qty: 1, why: whys(a), action: a }); }
  return { from: { id: c.id, name: c.name, credits: creditsOf(c) }, to, rows, none };
}
