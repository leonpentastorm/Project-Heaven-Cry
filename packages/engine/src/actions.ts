// The basic actions of a fight, as data the client prints (engine review 4, finding 1): what each costs this unit,
// whether it can be done now, and the engine's reason when it can't. weaponActions() (combat.ts) does this for what a
// weapon grants; this module does it for everything else that is not a technique, a Call, a perk, a prayer or magic:
// Move, Sprint, Disengage, Prone, Shove, Shoot an object, Pick up, a door, a stim, the song, the rules 1.3 conditions
// (Burning, Grappled, Disarmed), Hide, Analyze, Pull free and reloading both guns.
//
//   basicActions(cb, u, { c, g })          every row the unit has: { id, label, ap, cost, text, why, tab }
//   basicCost(cb, u, id, picks, { c, g })  the AP of the action picked, with its target (a stim on a Downed ally is 2)
//   moveOptions(g, cb, unitId, how)        the tiles a Move, Sprint, Disengage (or a Sneak on the area map) may end on,
//                                          each with the AP the engine would take, and why nothing is offered
//   reachOf(cb, u, what) / reachTiles()    where an attack, a Shove or Analyze reaches from here (the red area)
//
// Names, texts and base costs are data/actions.json. A cost is the base, then the items (effects/cost.ts price), by the same id
// the action's own function uses; test/actions.test.ts runs every action through the reducer and fails when the AP it
// took is not the AP its row showed. THE CLIENT HOLDS NO COST, NO RANGE AND NO LEGALITY OF ITS OWN: a new basic action
// is an entry in data/actions.json and a row here (docs/design/handoffs/client-boundary-1.md, "How to add an action").
import './datatext'; // fills the texts' {=placeholders} before any data is read
import actionsJ from '../../../data/actions.json';
import type { Character } from './character';
import { isMedicChar } from './character';
import { WEAPON } from './data';
import { type Combat, type Unit, type AttackMode, isMelee, attackApCost, effectiveRange, analyzeCost, analyzeRange, stimAp, reloadBothAp, reloadOffAp, reloadHands, loadMagazine, clearJam, coverOffAp, canJam, moveBlock, moveHowBlock, movePlan,
  sprintTiles, apForTiles, paths, movePaths, meleeReachOf, opticBands, MAX_RANGE_BANDS, lineOfSight, dist, objectsOf, type MoveHow } from './combat';
import { price, whyNot, needs, creditFor, setAp } from './effects/cost';
import { COST_SITE_IDS, type CostSite } from './effects/stats';
import { emitStory } from './effects/hooks';
import { STIM_HEAL } from './effects/mending';
import { condOn } from './magic';
import { hideBlock } from './tactics';
import { musicTraitOf, songOf, SONG_AP } from './music';
import { PILE, PICKUP_AP, isPile } from './containers';
import { preview, dryRun } from './preview';

export interface ActionDef { id: string; name: string; tab: 'move' | 'attack' | 'utility'; type: string; ap: number | null; text: string; adjudication: string; site?: string; rule?: string; cost?: string; pick?: string; [k: string]: any }
/** data/actions.json, by id. */
export const ACTIONS: ActionDef[] = (actionsJ as any).items;
export const ACTION: Record<string, ActionDef> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export interface BasicAction {
  id: string; label: string; tab: 'move' | 'attack' | 'utility';
  /** The AP it takes now (a Move: for one tile; a stim: for an ally who is up). */
  ap: number;
  /** The cost as the row prints it: "2 AP", "1–2 AP", "1 AP / 3 tiles". Always there: no row is without its price. */
  cost: string;
  text: string;
  /** The engine's refusal now, or null: it can be used. */
  why: string | null;
}
export interface ActionCtx { c?: Character | null; g?: any }

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const apText = (n: number) => n + ' AP';
/** The base AP of a basic action (data/actions.json), then the items that change it. */
let CB: Combat | null = null; // the fight the rows are being made for (basicActions sets it)
const priced = (u: Unit, id: string, base?: number): number => price({ cb: CB, u }, id, base).ap;
/** The one refusal sentence when the unit can't pay n AP (as: the reducer action, for a repeat's credit). */
const need = (u: Unit, n: number, as?: any) => whyNot(CB, u, n, { as });
const charOf = (u: Unit, x: ActionCtx): Character | null => x.c || (x.g && u.charId && !u.companion ? x.g.characters?.[u.charId] || null : null);
/** Whom the unit could pull free now (rules 1.12): itself, an ally next to it, or a weapon left in someone next to it. */
export function pullFreeTargets(cb: Combat | null, u: Unit): Unit[] {
  if (!cb) return [];
  return cb.units.filter((v) => v.nailed && v.hp > 0 && (v.id === u.id || (dist(u.pos, v.pos) <= 1 && (v.side === u.side || !!v.nailed.weapon))));
}
/** A pile this side can see, on the unit's tile or next to it (Pick up's reach). */
export const pileInReach = (cb: Combat | null, u: Unit) => (cb ? objectsOf(cb).filter((o) => isPile(o) && !o.hidden && (o.items || []).length && dist(u.pos, o.pos) <= 1).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos))[0] || null : null);

/** The AP of a move of this kind, where it is one number (a Sprint, a Disengage); a Move's first tile otherwise. */
export function moveAp(u: Unit, how: 'move' | 'sprint' | 'disengage'): number {
  return how === 'move' ? apForTiles(1, u.bank || 0, u.movement || 1) : priced(u, how);
}
/** A stim's two prices for this unit: on an ally who is up, and on a Downed one (stabilise). */
const stimPrices = (u: Unit, medic: boolean, cb: Combat | null = CB) => ({ up: stimAp(u, { downed: false } as Unit, medic, cb), down: stimAp(u, { downed: true } as Unit, medic, cb) });

/** Every basic action this unit has now, in list order, each with the engine's cost and reason. Rows that only show
 * when they apply (Put out the fire, Break free, Recover, Pull free, Play my song, Reload both, Hide) are left out
 * otherwise. cb may be null (a card outside a fight): the rows that need the fight to rule on them carry no reason. */
export function basicActions(cb: Combat | null, u: Unit, x: ActionCtx = {}): BasicAction[] { const was = CB; CB = cb; try { return rowsOf(cb, u, x); } finally { CB = was; } }
function rowsOf(cb: Combat | null, u: Unit, x: ActionCtx): BasicAction[] {
  if (!u) return [];
  const c = charOf(u, x), w: any = WEAPON[u.weapon], out: BasicAction[] = [];
  const row = (id: string, ap: number, why: string | null, o: { label?: string; cost?: string; text?: string; tokens?: Record<string, string | number> } = {}) => {
    const d = ACTION[id.replace(/-tac$/, '')];
    out.push({ id, label: o.label || d.name, tab: d.tab, ap, cost: fill(o.cost || d.cost || apText(ap), { movement: u.movement, ...(o.tokens || {}) }), text: fill(o.text || d.text, { movement: u.movement, ap, ...(o.tokens || {}) }), why });
  };
  // ----- movement -----
  const blk = moveBlock(u);
  for (const how of ['move', 'sprint', 'disengage'] as const) {
    const ap = moveAp(u, how);
    row(how, ap, blk || moveHowBlock(u, how) || need(u, ap, { type: 'combat/move', how }), { tokens: { sprint_tiles: sprintTiles(u) }, ...(how === 'sprint' && u.noSprint ? { text: ACTION.sprint.text_blocked } : {}) });
  }
  { const d = ACTION.prone, ap = priced(u, 'prone'); row('prone', ap, need(u, ap), { label: u.prone ? d.name_alt : d.name }); }
  // ----- attack -----
  { const ap = priced(u, 'shove'); row('shove', ap, need(u, ap)); }
  { const ap = coverAp(u); row('cover', ap, need(u, ap)); }
  // ----- utility -----
  { const ts = pullFreeTargets(cb, u), t = ts[0];
    if (t) { const d = ACTION.pullfree, ap = priced(u, 'pullfree', t.nailed!.ap), self = t.id === u.id, ally = t.side === u.side;
      row('pullfree', ap, need(u, ap), { label: self ? d.name : ally ? d.name_ally : d.name_weapon, text: self ? d.text : ally ? d.text_ally : d.text_weapon, tokens: { target: t.name } }); } }
  const pickAp = priced(u, 'pickup'); row('pickup', pickAp, u.side === 'pc' && !u.charId ? 'Only a player character can pick things up.' : cb && !pileInReach(cb, u) ? 'Nothing on the ground next to you.' : need(u, pickAp));
  { const ap = priced(u, 'door'); row('door', ap, need(u, ap)); }
  { const d = ACTION.stim, p = stimPrices(u, isMedicChar(c)), lo = Math.min(p.up, p.down), hi = Math.max(p.up, p.down);
    row('stim', p.up, c && c.stims <= 0 ? 'No stims left.' : need(u, lo), { cost: lo === hi ? apText(lo) : lo + '–' + hi + ' AP', tokens: { ap_downed: d.ap_downed, ap_downed_medic: d.ap_downed_medic, stim_heal: STIM_HEAL, stims_left: c ? ' (' + c.stims + ' left)' : '' } }); }
  if (c && musicTraitOf(c) && songOf(c)) { const ap = priced(u, 'song'); row('song', ap, need(u, ap)); }
  if (condOn(u, 'burning')) { const ap = priced(u, 'extinguish'); row('extinguish', ap, need(u, ap)); }
  if (condOn(u, 'grappled')) { const ap = priced(u, 'escape'); row('escape', ap, need(u, ap)); }
  if (condOn(u, 'disarmed') || condOn(u, 'lowered')) { const d = ACTION.recover, dis = condOn(u, 'disarmed'), ap = priced(u, 'recover', dis ? d.ap! : d.ap_lowered); row('recover', ap, need(u, ap), { label: dis ? d.name : d.name_alt }); }
  out.push(...reloadBothRows(cb, u, x));
  if (!u.hidden && u.side === 'pc') { const ap = priced(u, 'hide'); row('hide', ap, (cb ? hideBlock(cb, u) : null) || need(u, ap)); }
  { const ap = analyzeCost(u, CB); row('analyze', ap, need(u, ap), { tokens: { analyze_range: analyzeRange(u) } }); }
  // A unit with a fixed action list (the drone: move and a plain shot) has only those.
  return u.allowedActions ? out.filter((a) => u.allowedActions!.includes(a.id)) : out;
}
/** Shoot an object: the weapon's shot (a strike for a melee weapon), priced through the items, at least 1 AP. */
function coverAp(u: Unit): number { const w = WEAPON[u.weapon]; return w ? Math.max(1, price({ cb: CB, u }, 'break', attackApCost(w, isMelee(w) ? 'melee' : 'shot')).ap) : 2; }
/** Reload both guns (two guns in hand): the speed reload, and the tactical one when both take magazines. The refusal is
 * the engine's own (reloadHands, tried on a copy). */
export function reloadBothRows(cb: Combat | null, u: Unit, x: ActionCtx = {}): BasicAction[] {
  const w: any = WEAPON[u.weapon], ow: any = u.offWeapon ? WEAPON[u.offWeapon] : null;
  if (!w || !ow || w.magazine == null || ow.magazine == null) return [];
  const d = ACTION.reload2, ap = reloadBothAp(u, cb), tac = ap + PILE.tactical_reload_extra_ap, loose = ow.reload === 'loose';
  // (with no fight at hand, a card on the area map: a bare one around the unit, enough for the engine to rule on the guns)
  const fight = cb || ({ name: 'card', units: [u], order: [u.id], turn: 0, round: 1, log: [], fx: [], notes: [], objects: [], glyphs: [], zones: [], map: { id: 'card', w: 3, h: 3, solid: [] } } as any as Combat);
  const whyOf = (tactical: boolean, _n: number) => dryRun(x.g || null, fight, u.id, (c2, u2) => reloadHands(c2, u2, 'both', tactical)).err;
  const out: BasicAction[] = [{ id: 'reload2', label: d.name + (loose ? '' : ' (speed)'), tab: d.tab, ap, cost: apText(ap) + (loose ? '' : ' · the magazines drop'), text: d.text, why: whyOf(false, ap) }];
  if (!loose && w.reload !== 'loose' && Array.isArray(u.mags)) out.push({ id: 'reload2-tac', label: d.name_tactical, tab: d.tab, ap: tac, cost: apText(tac) + ' · the magazines go in your pack', text: d.text_tactical, why: whyOf(true, tac) });
  return out;
}

/** Reload the off-hand gun alone (two guns in hand; Leon, live 0.23.0: reloading one gun must not block the other):
 * the speed reload, and the tactical one for a magazine gun. Each gun that is not full can be reloaded for its own AP.
 * The refusal is the engine's own (reloadHands, tried on a copy). */
export function reloadOffRows(cb: Combat | null, u: Unit, x: ActionCtx = {}): BasicAction[] {
  const ow: any = u.offWeapon ? WEAPON[u.offWeapon] : null;
  if (!ow || ow.magazine == null || !ow.reload) return [];
  const ap = reloadOffAp(u, cb), tac = ap + PILE.tactical_reload_extra_ap, loose = ow.reload === 'loose', unit = ow.reload_unit || 'magazine';
  const fight = cb || ({ name: 'card', units: [u], order: [u.id], turn: 0, round: 1, log: [], fx: [], notes: [], objects: [], glyphs: [], zones: [], map: { id: 'card', w: 3, h: 3, solid: [] } } as any as Combat);
  const whyOf = (tactical: boolean) => dryRun(x.g || null, fight, u.id, (c2, u2) => reloadHands(c2, u2, 'off', tactical)).err;
  const now = ' ' + (u.offAmmo ?? 0) + ' / ' + ow.magazine + ' loaded now.';
  if (loose) return [{ id: 'reload-off', label: 'Load the off-hand gun', tab: 'attack', ap, cost: apText(ap), text: 'Top up the off-hand gun from loose rounds. Nothing drops.' + now, why: whyOf(false) }];
  return [{ id: 'reload-off', label: 'Reload (speed)', tab: 'attack', ap, cost: apText(ap) + ' · the ' + unit + ' drops', text: 'Swap in the off-hand gun\'s fullest spare ' + unit + '. The one in the gun drops onto your tile with its rounds still in it.' + now, why: whyOf(false) },
    { id: 'reload-off-tac', label: 'Reload (tactical)', tab: 'attack', ap: tac, cost: apText(tac) + ' · the ' + unit + ' goes in your pack', text: 'Swap in the off-hand gun\'s fullest spare ' + unit + '. The one in the gun goes back in your pack with its rounds still in it.' + now, why: whyOf(true) }];
}

/** The off-hand weapon's own Clear jam and Shoot an object (two weapons in hand; lead's call for Leon, live 0.23.0: a
 * jammed off-hand gun could never be cleared): the main hand's rule and price, on the off-hand weapon (its jam, its
 * rounds, its range and damage). Clear jam is listed for an off-hand gun that can jam; the refusal is the engine's own
 * (clearJam, tried on a copy). */
export function offHandRows(cb: Combat | null, u: Unit, x: ActionCtx = {}): BasicAction[] {
  const ow: any = u.offWeapon ? WEAPON[u.offWeapon] : null; if (!ow) return [];
  const out: BasicAction[] = [], d = ACTION.cover, was = CB; CB = cb;
  try {
    const ap = coverOffAp(u, cb);
    out.push({ id: 'cover-off', label: d.name, tab: d.tab, ap, cost: apText(ap), text: 'With the off-hand ' + ow.name + ': ' + d.text.replace(/your weapon's/, 'its'), why: need(u, ap, { type: 'combat/shoot-cover', hand: 'off' }) });
    const hd: any = ow.handling || {};
    if (canJam(ow) || (hd.grant || []).includes('clear')) {
      const c = price({ cb, u }, 'clear_jam', undefined, { hand: 'off' }).ap;
      const fight = cb || ({ name: 'card', units: [u], order: [u.id], turn: 0, round: 1, log: [], fx: [], notes: [], objects: [], glyphs: [], zones: [], map: { id: 'card', w: 3, h: 3, solid: [] } } as any as Combat);
      const why = !u.offJammed ? 'Not jammed.' : dryRun(x.g || null, fight, u.id, (c2, u2) => clearJam(c2, u2, 'off')).err;
      out.push({ id: 'clear-off', label: 'Clear jam', tab: 'attack', ap: c, cost: apText(c), text: 'The off-hand ' + ow.name + ': a jammed gun can\'t fire until cleared. Clearing resets Heat.', why });
    }
  } finally { CB = was; }
  return out;
}

/** Load loose rounds into a spare magazine: how many rounds go in now and the AP that takes (the engine's own
 * loadMagazine, tried on a copy), or null when nothing can be loaded. */
export function loadPlan(g: any, cb: Combat | null, u: Unit): { rounds: number; ap: number } | null {
  if (!cb || !u || !u.mags || !u.loose) return null;
  const r = dryRun(g || null, cb, u.id, (c2, u2) => loadMagazine(c2, u2));
  return r.err || !r.u ? null : { rounds: (u.loose || 0) - (r.u.loose || 0), ap: r.ap };
}
/** The AP the picked basic action takes, with what was picked (a stim's ally; the pinned unit to free). Null when `id`
 * is not a basic action (a technique, a Call, a perk, magic and a prayer have their own previews). */
export function basicCost(cb: Combat | null, u: Unit, id: string, picks: { targetId?: string | null } = {}, x: ActionCtx = {}): number | null {
  if (!u || !id || (id !== 'load' && !ACTION[id.replace(/-tac$/, '')])) return null; // not a basic action: nothing is worked out
  const t = picks.targetId && cb ? cb.units.find((v) => v.id === picks.targetId) || null : null;
  if (id === 'stim') { const p = stimPrices(u, isMedicChar(charOf(u, x)), cb); return t ? (t.downed ? p.down : p.up) : p.up; }
  if (id === 'load') return loadPlan(x.g, cb, u)?.ap ?? null;
  if (id === 'pullfree') { const ts = pullFreeTargets(cb, u), n = (t && ts.includes(t) ? t : ts[0])?.nailed; return n ? price({ cb, u }, 'pullfree', n.ap).ap : null; }
  const r = basicActions(cb, u, x).find((a) => a.id === id);
  return r ? r.ap : null;
}

// ---------- where a move may end ----------
export interface MoveOptions {
  /** Tile → what the engine would take for a move that ends there. Only tiles the engine would accept. */
  tiles: Record<string, { ap: number; tiles: number }>;
  /** Why no tile is offered (the unit can't move this way now), or null. */
  why: string | null;
  /** AP lent to this move (Encore, a Brief): already counted in what is offered. */
  lend: number;
}
/** Every tile a Move, Sprint or Disengage may end on, as moveUnit() would rule on each: the route, the price after the
 * items ('move_cost'), one Sprint a turn, Fear, Threatened, an item's ban. `world`: a move on the area map, where
 * 'sneak' costs 1 AP a tile on top ('world_move_cost'). Asked on a throwaway copy with the copy's own dice: nothing is
 * spent, counted or rolled on the live fight. mods: the switches set on the move. */
export function moveOptions(g: any, cb: Combat, unitId: string, how: MoveHow = 'move', o: { mods?: string[] | null; world?: boolean } = {}): MoveOptions {
  return preview(g, cb, (c, sg) => {
    const u = c.units.find((x) => x.id === unitId), out: MoveOptions = { tiles: {}, why: null, lend: 0 };
    if (!u) { out.why = 'No unit.'; return out; }
    const walk = how === 'sneak' ? 'move' : how;
    const blanket = moveBlock(u) || moveHowBlock(u, walk); if (blanket) { out.why = blanket; return out; }
    out.lend = o.world ? 0 : creditFor(u, { type: 'combat/move', how: walk }, c); // a repeat's credit (Encore) and a Brief's: movePlan counts them too
    const base = paths(c, u.pos, u.id), ch = sg && u.charId ? sg.characters?.[u.charId] : null;
    // Items count uses and keep notes as they price a move: every tile is asked from the same start.
    const bag = () => JSON.stringify({ u: c.units.map((v) => [v.ps, v.uses, (v as any).tech]), c: sg ? Object.values(sg.characters || {}).map((k: any) => k.uses) : null, ps: sg?.story?.ps, rng: sg?.rng });
    const start = bag(), own = u.ap, ap0 = own + out.lend, reset = () => { const b = JSON.parse(start); c.units.forEach((v, i) => { v.ps = b.u[i][0]; v.uses = b.u[i][1]; (v as any).tech = b.u[i][2]; });
      if (sg && b.c) Object.values(sg.characters || {}).forEach((k: any, i) => { k.uses = b.c[i]; }); if (sg?.story) sg.story.ps = b.ps; if (sg?.rng && b.rng) sg.rng.state = b.rng.state; c.log.length = 0; delete c.logSee; setAp(u, own); };
    let first: string | null = null, dirty = false;
    for (const k of Object.keys(base.dist)) {
      if (k === u.pos) continue;
      if (dirty) { reset(); dirty = false; }
      try {
        const P = o.world ? movePaths(c, u, k, how, base) : undefined;
        let extra = 0;
        if (o.world && sg && ch) { const wm: any = emitStory(sg, 'world_move_cost', { c: ch, u, tiles: P!.dist[k], how, extra: how === 'sneak' ? P!.dist[k] : 0, g: sg, preview: true }); extra = Math.max(0, wm.extra); }
        else if (o.world && how === 'sneak') extra = P!.dist[k];
        const pl = movePlan(c, u, k, walk, { preview: true, base, ...(P ? { via: P } : {}) });
        dirty = bag() !== start;
        if (typeof pl === 'string') { if (!first && !/^Can't reach|^Too far|^Disengage moves|^Needs/.test(pl)) first = pl; continue; }
        if (pl.ap + extra > ap0) continue;
        out.tiles[k] = { ap: Math.round((pl.ap + extra) * 100) / 100, tiles: pl.tiles };
      } catch (e: any) { dirty = true; if (!first) first = String((e && e.message) || e); } // an item's refusal in words (Wall Run)
    }
    if (!Object.keys(out.tiles).length) out.why = first || needs(how === 'move' || how === 'sneak' ? moveAp(u, 'move') : moveAp(u, walk));
    return out;
  }, { mods: o.mods });
}

// ---------- where an action reaches ----------
export type ReachWhat = AttackMode | 'shove' | 'analyze' | 'cover' | 'overwatch' | 'paired';
export interface Reach { /** tiles from the unit, as far as it goes */ max: number; /** the range band's width in tiles (0: no bands: melee, Analyze) */ band: number; /** it needs line of sight to the tile */ los: boolean; melee: boolean }
/** How far an attack, a Shove or Analyze reaches from where the unit stands, before the target's own cover and sight
 * rule on it (previewAttack does that for a unit). The rule is previewAttack's (meleeReachOf, the range bands, the
 * optic); the red area a screen draws comes from here. o.step: tiles a technique moves the unit before it strikes
 * (Lunge, Charge); o.fists: the strike is made with the bare hand whatever is held (a gun's butt, a shield). */
export function reachOf(cb: Combat | null, u: Unit, what: ReachWhat, o: { step?: number; fists?: boolean } = {}): Reach {
  const w = WEAPON[u.weapon];
  if (what === 'analyze') return { max: analyzeRange(u), band: 0, los: true, melee: false };
  if (what === 'shove') return { max: 1, band: 0, los: false, melee: true };
  const meleeW = !!w && isMelee(w), mode: AttackMode = what === 'cover' || what === 'overwatch' || what === 'paired' ? (meleeW ? 'melee' : 'shot') : what;
  if (mode === 'melee' || (meleeW && mode !== 'thrown')) {
    const reach = o.fists ? 1 : meleeReachOf(u, 'melee');
    return { max: reach + Math.max(0, o.step || 0), band: 0, los: false, melee: true };
  }
  // Optics only help against units; shooting an object (shootCover) has no optic term.
  const eff = effectiveRange(w), bands = MAX_RANGE_BANDS + (what === 'cover' ? 0 : opticBands(u, mode));
  return { max: eff * bands, band: eff, los: true, melee: false };
}
/** The tiles that reach covers, each with its range band (0: the first, where there is no penalty). */
export function reachTiles(cb: Combat, u: Unit, what: ReachWhat, o: { step?: number; fists?: boolean } = {}): Map<string, number> {
  const r = reachOf(cb, u, what, o), out = new Map<string, number>(), solid = new Set(cb.map.solid);
  for (let y = 0; y < cb.map.h; y++) for (let x = 0; x < cb.map.w; x++) {
    const k = x + ',' + y; if (k === u.pos || solid.has(k)) continue;
    const d = dist(u.pos, k);
    if (d <= r.max && (!r.los || lineOfSight(cb, u.pos, k))) out.set(k, r.band ? Math.max(0, Math.ceil(d / r.band) - 1) : 0);
  }
  return out;
}
