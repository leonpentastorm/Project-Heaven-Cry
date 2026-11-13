// FIGMENTS AND THE VISUALIZER (Classes 3.0 step 8, rules 1.34; docs/design/figments-spec.md). Expression's door,
// through Visualization: you picture a thing and the bots build it. A Figment is an owned unit (owned.ts, P9) of turn
// `owner`: no turn of its own, its verbs are rows of its owner's panel, paid from the owner's AP (owned.ts runOwned /
// runDataVerb). Every number is data/figments.json's (and the profile `figment`, the factor `output.factors.figment`,
// the tiers' `owned_weight` and `double_save`).
//
// What this file holds (the system's own rules; everything else is a primitive):
//   the ladder (forms opened, held, designs, traits by Visualization), the projection range, designs (Character.figments)
//   Picture (the verb item `picture`, a lane: its pick list `forms`, its tile, its charge) and the core swap
//   a Figment's block from its form and traits, at its owner's level (HP by hp_mult x damage_mult, the figment profile)
//   the rules around holding: the third held costs AP, a destroyed one Snaps, attention breaks, range, the fight's end
//   the Double's lure (illusion.ts FalseImage with a body: the tiers' double_save), the Blade's Hold (react(), payer)
import './datatext';
import figmentsJ from '../../../data/figments.json';
import type { Combat, Unit } from './combat';
import { say, emitFx, dist, unitSees, refOf, alive, resolveAttack, previewAttack, sightCheck } from './combat';
import type { Character, FigmentDesign } from './character';
import { mod } from './character';
import { ENEMY, enemyLevelRow, RULES } from './data';
import { register, statQuery, charOfUnit } from './effects';
import { onHook } from './effects/hooks';
import { registerPickList } from './effects/actions';
import { price } from './effects/cost';
import { levelFactor } from './effects/output';
import { spawnOwned, unmakeOwned, ownedBy, ownerOf, addOwnedGate } from './owned';
import { condOn, saveAgainst } from './magic';
import { canStand, tileOf } from './kit';
import { addImage, dropImage, imagesOf, type FalseImage } from './illusion';
import { react } from './tactics';
import type { Rng } from './rng';

export const FIG: any = figmentsJ;
export const FORM: Record<string, any> = Object.fromEntries((FIG.forms as any[]).map((f) => [f.id, f]));
export const FIG_TRAIT: Record<string, any> = Object.fromEntries((FIG.traits as any[]).map((t) => [t.id, t]));
const LADDER: any[] = FIG.ladder;

// ---------------------------------------------------------------------------------------------- the ladder
export interface FigLadder { held: number; forms: string[]; designs: number; traits: number; noSnap: boolean }
/** What Visualization at these points opens (figments.json ladder: each row adds or sets from its points up). */
export function ladderAt(points: number): FigLadder {
  const out: FigLadder = { held: 0, forms: [], designs: 0, traits: 0, noSnap: false };
  for (const r of LADDER) {
    if (points < r.points) continue;
    if (r.held != null) out.held = r.held; if (r.designs != null) out.designs = r.designs; if (r.traits != null) out.traits = r.traits;
    if (r.forms) out.forms.push(...r.forms); if (r.no_snap) out.noSnap = true;
  }
  return out;
}
/** A unit's Visualization points (the magic unit's, else its character's). */
export const visPoints = (u: Unit | null | undefined, c?: Character | null): number => u?.mg?.vis ?? (c ?? charOfUnit(u))?.skills?.visualization ?? 0;
/** Is this unit a Figment (its owned record's kind)? */
export const isFigment = (u: Unit | null | undefined): boolean => (u as any)?.owned?.kind === 'figment';
/** The Rigger (class id trickster) holds its moves without the door. */
const isRigger = (u: Unit | null | undefined, c?: Character | null): boolean => (c ?? charOfUnit(u))?.classId === 'trickster';
/** Projection range: base + per point of Visualization; a Rigger without the door projects its Double at no_door. */
export function projectionRange(u: Unit | null | undefined, c?: Character | null): number {
  const p = visPoints(u, c), R = FIG.visualizer.range;
  return p >= 1 ? R.base + R.per_point * p : isRigger(u, c) ? R.no_door : 0;
}
/** How many Figments this holder may hold at once: the ladder's, plus items (the Rigger's `ties_max:owned`), with the door. */
export function heldMax(u: Unit | null | undefined, c?: Character | null): number {
  const p = visPoints(u, c); if (p < 1) return 0;
  return Math.min(FIG.limits.held_most, ladderAt(p).held + statQuery({ u, c: c ?? charOfUnit(u) }, 'ties_max:owned').add);
}
/** How many designs it keeps ready (the ladder's, plus the stat `figment_designs`). */
export function designsMax(c: Character, u?: Unit | null): number { const p = c.skills?.visualization || 0; return p >= 3 ? ladderAt(p).designs + statQuery({ c, u }, 'figment_designs').add : 0; }
/** How many traits a design may carry. */
export const traitsMax = (points: number): number => ladderAt(points).traits;
/** The forms this many points open. */
export const formsOpen = (points: number): string[] => ladderAt(points).forms;

// ---------------------------------------------------------------------------------------------- designs
/** Why this design can't be kept by this character (null: it can). */
export function designWhy(c: Character, d: FigmentDesign): string | null {
  const p = c.skills?.visualization || 0;
  if (!d || !String(d.name || '').trim()) return 'Name the design.';
  if (!FORM[d.form]) return 'No such form.';
  if (!formsOpen(p).includes(d.form)) return FORM[d.form].name + ' needs Visualization ' + FORM[d.form].opens.min + '.';
  const tr = d.traits || [];
  if (tr.some((t) => !FIG_TRAIT[t])) return 'No such trait.';
  if (new Set(tr).size !== tr.length) return 'A trait only once.';
  if (tr.length > traitsMax(p)) return traitsMax(p) ? 'At most ' + traitsMax(p) + ' trait' + (traitsMax(p) > 1 ? 's' : '') + ' a design.' : 'Traits open at Visualization 3.';
  return null;
}
/** Keep a design (out of a fight): replaces one with the same id, refused past the ready count. */
export function setFigmentDesign(c: Character, d: FigmentDesign): string | null {
  const no = designWhy(c, d); if (no) return no;
  const list = [...(c.figments || [])], i = list.findIndex((x) => x.id === d.id);
  if (i < 0 && list.length >= designsMax(c)) return designsMax(c) ? 'You keep ' + designsMax(c) + ' designs ready: drop one first.' : 'Designs open at Visualization 3.';
  const v: FigmentDesign = { id: d.id, name: String(d.name).trim().slice(0, 40), form: d.form, traits: [...(d.traits || [])] };
  if (i < 0) list.push(v); else list[i] = v; c.figments = list; return null;
}
/** Drop a design. */
export function dropFigmentDesign(c: Character, id: string): void { c.figments = (c.figments || []).filter((x) => x.id !== id); }
/** The designs this character can picture now (kept, valid, within the ready count). */
export function readyFigments(c: Character): FigmentDesign[] { return (c.figments || []).filter((d) => !designWhy(c, d)).slice(0, designsMax(c)); }
/** What a choice of Picture names: 'd:<design id>' or a bare form id. */
export function pictureChoice(c: Character | null | undefined, choice: string | null | undefined): { form: string; traits: string[]; name: string } | null {
  if (!c) return null;
  const opts = pictureOptions(c), pick = choice || opts[0]?.id; if (!pick || !opts.some((o) => o.id === pick)) return null;
  if (pick.startsWith('d:')) { const d = readyFigments(c).find((x) => 'd:' + x.id === pick)!; return { form: d.form, traits: [...d.traits], name: d.name }; }
  return { form: pick, traits: [], name: FORM[pick].name };
}
/** Picture's choices: the ready designs, then the bare forms opened (every bare form is always ready). */
export function pictureOptions(c: Character): { id: string; label: string }[] {
  return [...readyFigments(c).map((d) => ({ id: 'd:' + d.id, label: d.name + ' (' + FORM[d.form].name + (d.traits.length ? ' + ' + d.traits.map((t) => FIG_TRAIT[t].name).join(', ') : '') + ')' })),
    ...formsOpen(c.skills?.visualization || 0).map((f) => ({ id: f, label: FORM[f].name }))];
}
/** A design's charge: the form's, +trait_charge a trait, each trait's own `charge` (Hollow −2), never under 1. */
export const figmentCharge = (form: string, traits: string[]): number => Math.max(1, (FORM[form]?.charge || 0) + traits.reduce((s, t) => s + FIG.trait_charge + (FIG_TRAIT[t]?.charge || 0), 0));

// ---------------------------------------------------------------------------------------------- the block and the unit
/** The block op `spawn` makes for a form with these traits, for this owner (spawnOwned levels it by its owner's level:
 * HP by hp_mult, armour by armour_mult, Defense by defense_plus; the damage_mult share of HP and the traits' HP are
 * put in here). */
export function figmentBlock(owner: Unit, form: string, traits: string[], name?: string): any {
  const f = FORM[form], row: any = enemyLevelRow(owner.level ?? 1);
  const hpMult = traits.reduce((m, t) => m * (FIG_TRAIT[t]?.hp_mult ?? 1), 1) * (FIG.level.hp as string[]).filter((k) => k !== 'hp_mult').reduce((m, k) => m * (row[k] ?? 1), 1);
  const lasting = traits.some((t) => FIG_TRAIT[t]?.upkeep === 0);
  return { ...f, name: name || f.name, hp: f.hp * hpMult, defense: typeof f.defense === 'number' ? f.defense : 0, armour: f.armour, attack_bonus: 0,
    movement: (typeof f.movement === 'number' ? f.movement : owner.movement) + traits.reduce((s, t) => s + (FIG_TRAIT[t]?.tiles || 0), 0),
    ...(lasting ? { upkeep: undefined } : {}), lure: f.lure || traits.includes('mirror') };
}
/** What a fresh Figment is after spawnOwned: its owner's Defense (the Double), its accuracy (the owner's Visualization
 * modifier, Keen), its damage (the figment profile at the owner's level, times the Figment factor: Unit.lvlDmg), what it
 * holds (its form's and its traits' items), its sight, its weight in the enemy's choice (Loud). */
function setUp(owner: Unit, u: Unit, form: string, traits: string[], made: number) {
  const f = FORM[form], p = visPoints(owner), prof = RULES.output.profiles.figment;
  if (f.defense === 'owner') u.def = owner.def;
  u.attack = mod(p) + traits.reduce((s, t) => s + (FIG_TRAIT[t]?.roll || 0), 0); u.strength = u.attack;
  u.lvlDmg = Math.round(prof.k * levelFactor(prof.level, owner.level ?? 1) * RULES.output.factors.figment * 1000) / 1000;
  u.kind = 'figment'; u.tier = undefined;
  (u as any).held = { perks: [], traits: [], verbs: ['fig_' + form, ...traits.map((t) => 'figtrait_' + t)] };
  if (f.vision) { u.vision = f.vision + traits.reduce((s, t) => s + (FIG_TRAIT[t]?.vision || 0), 0); }
  if (f.dark_sight) u.darkSight = true; if (f.flies) u.ignoreDifficult = true;
  const w = traits.reduce((s, t) => s + (FIG_TRAIT[t]?.weight || 0), 0); if (w) (u as any).figWeight = w;
  (u as any).figment = { form, traits: [...traits], made, range: traits.reduce((s, t) => s + (FIG_TRAIT[t]?.range || 0), 0) };
}
/** Every Figment this owner has in the fight (standing). */
export const figmentsOf = (cb: Combat, owner: Unit): Unit[] => (cb.ties?.length ? ownedBy(cb, owner).filter((u) => isFigment(u) && cb.units.includes(u) && !u.dead) : []);
/** The Figments in its held count (not the Rigger's Double). */
export const heldFigments = (cb: Combat, owner: Unit): Unit[] => figmentsOf(cb, owner).filter((u) => !(u as any).owned?.free);
/** THE door that makes a Figment: refusal or the unit. o.free: outside the held count (the Rigger's Double, with its
 * lifetime in rounds and no upkeep). Charge is paid by the caller (the action's `res`). */
export function makeFigment(cb: Combat, rng: Rng, owner: Unit, form: string, traits: string[], at: string, o: { name?: string; charge: number; free?: { rounds: number }; mirrorOf?: Unit | null }): Unit | string {
  const block = figmentBlock(owner, form, traits, o.name);
  if (o.free) delete block.upkeep;
  const u = spawnOwned(cb, owner, form, at, rng, { block, spent: { vcharge: o.charge } }); if (typeof u === 'string') return u;
  setUp(owner, u, form, traits, o.charge);
  if (o.free) { (u as any).owned.free = true; (u as any).owned.until = cb.round + o.free.rounds; }
  if (block.lure) lure(cb, rng, owner, u, o.mirrorOf || owner);
  sightCheck(cb);
  return u;
}
/** Unmake a Figment because the owner's attention broke (nothing comes back). */
export function unravel(cb: Combat, u: Unit, why: string): void {
  if (!cb.units.includes(u)) return;
  for (const img of imagesOf(cb).filter((i) => i.body === u.id)) dropImage(cb, img, 'unravelled');
  unmakeOwned(cb, u, { quiet: true }); say(cb, u.name + ' comes apart (' + why + ').');
}

// ---------------------------------------------------------------------------------------------- the Double's lure
/** Rules 1.34, the Double (rules 1.25's doctrine, enemies.json `double_save`): every enemy that sees its tile is fooled
 * (no double_save: Vermin, Minions) or makes a Brain save against 12 + the owner's Visualization strength, the tier's
 * double_save added to its save (and found_out_add once it found a Double out this fight). A fooled enemy sees `as`
 * (the owner, or the Mirror's pick) where the Double stands. */
function lure(cb: Combat, rng: Rng, owner: Unit, body: Unit, as: Unit) {
  const img: FalseImage = { id: 'img' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), owner: as.id, pos: body.pos, side: owner.side, round: cb.round, fooled: [], body: body.id };
  const lines: string[] = [];
  for (const e of cb.units) {
    if (e.side === owner.side || !alive(e) || !unitSees(cb, e, body.pos)) continue;
    const ok = doubleSave(cb, rng, owner, e); if (!ok.fooled) { lines.push(e.name + ' sees through it (' + ok.line + ')'); continue; }
    img.fooled.push(e.id); lines.push(e.name + ' is fooled' + (ok.line ? ' (' + ok.line + ')' : ''));
  }
  addImage(cb, img);
  if (lines.length) say(cb, body.name + ': ' + lines.join(' · ') + '.');
}
/** Does this enemy take the Double for real (its tier's double_save; a found-out enemy saves better)? */
function doubleSave(cb: Combat, rng: Rng, owner: Unit, e: Unit): { fooled: boolean; line: string } {
  const tier: any = e.tier ? (ENEMY as any)[e.tier] : null, ds = tier?.double_save;
  if (ds == null) return { fooled: true, line: '' };
  const found = (cb as any).doubleFound?.[e.id] ? FIG.lure.found_out_add : 0;
  const sv = saveAgainst(cb, rng, owner, e, 'brain', 'double', { via: 'visualization', tnAdd: -(ds + found) });
  return { fooled: !sv.ok && sv.skipped !== 'immune', line: sv.text || '' };
}

// ---------------------------------------------------------------------------------------------- Picture and the core
/** Why this holder can't picture or act through a Figment now (null: it can). */
export function visFocusWhy(u: Unit | null | undefined): string | null {
  if (!u) return 'Not in a fight.';
  if (!u.mg?.visualizer) return 'Needs the Visualizer in hand.';
  if (u.dead || u.downed) return 'Downed.';
  if (condOn(u, 'silenced')) return 'You are Silenced: no Figments this round.';
  return null;
}
/** A tile the holder's side sees (any of its units with eyes: an Eye Figment widens it). */
const sideSeesTile = (cb: Combat, u: Unit, k: string): boolean => cb.units.some((x) => x.side === u.side && !x.dead && !x.downed && (x as any).eyes !== false && unitSees(cb, x, k));
/** Why a Figment can't be made on this tile by this owner (null: it can). */
export function pictureTileWhy(cb: Combat, u: Unit, k: string | null, range = projectionRange(u)): string | null {
  if (!k) return 'Pick a tile.';
  if (dist(u.pos, k) > range) return 'Out of projection range (' + range + ').';
  if (!sideSeesTile(cb, u, k)) return 'Your side can\'t see that tile.';
  if (!canStand(cb, k)) return 'That tile isn\'t free.';
  return null;
}
registerPickList('forms', (h) => (h.c ? pictureOptions(h.c) : []));
register({
  id: 'picture', kind: 'verb',
  actions: [{
    id: 'picture', label: 'Picture', scope: ['combat'], target: 'tile', ap: (h) => price({ cb: h.cb, u: h.u }, 'picture').ap, pick: 'forms', pickLabel: 'What to picture',
    res: (h, args) => { const p = pictureChoice(h.c, args.choice); return p ? { vcharge: figmentCharge(p.form, p.traits) } : null; },
    available: (h) => { const no = visFocusWhy(h.u); if (no) return no; if (h.cb && h.u && heldFigments(h.cb, h.u).length >= heldMax(h.u, h.c)) return 'Hold is full: let one go first.'; return true; },
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, p = pictureChoice(h.c, args.choice); if (!p) return { ok: false, why: 'Pick what to picture.' };
      const k = tileOf(cb, args.tile); const no = pictureTileWhy(cb, u, k); if (no) return { ok: false, why: no };
      return { tiles: [k!], lines: [p.name + ' at ' + refOf(k!) + ': ' + figmentCharge(p.form, p.traits) + ' charge.'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, p = pictureChoice(h.c, args.choice)!, k = tileOf(cb, args.tile)!, n = figmentCharge(p.form, p.traits);
      const f = makeFigment(cb, rng as Rng, u, p.form, p.traits, k, { name: p.name, charge: n }); if (typeof f === 'string') return f;
      emitFx(cb, 'figment', { unit: f.id, owner: u.id, at: k, form: p.form });
      say(cb, u.name + ' pictures ' + (p.name === FORM[p.form].name ? 'a ' + p.name : p.name) + ' at ' + refOf(k) + ' (' + n + ' charge; ' + heldFigments(cb, u).length + '/' + heldMax(u, h.c) + ' held).');
      return null;
    },
  }],
  brief: () => null,
});
register({
  id: 'visualizer_core', kind: 'verb',
  actions: [{
    id: 'visualizer_core', label: 'Load the Visualizer', scope: ['combat'], target: 'none', ap: (h) => price({ cb: h.cb, u: h.u }, 'swap_core').ap, res: { cores: 1 },
    available: (h) => (!h.u?.mg?.visualizer ? 'Needs the Visualizer in hand.' : (h.u.mg.vcharge ?? 0) >= (h.u.mg.vchargeMax ?? 0) ? 'The core is full.' : true),
    run: (h) => { const m = h.u!.mg!; m.vcharge = m.vchargeMax; emitFx(h.cb!, 'core', { unit: h.u!.id, at: h.u!.pos, dur: 1000, focus: 'visualizer' }); say(h.cb!, h.u!.name + ' loads a fresh core into the Visualizer (' + m.vcharge + ' charge).'); return null; },
  }],
  brief: () => null,
});

// ---------------------------------------------------------------------------------------------- holding
// Acting through a Figment: the Visualizer in hand, not Silenced, the Figment within projection range (Let go: always).
addOwnedGate((cb, owner, u, verb) => {
  if (!isFigment(u) || verb === 'let_go') return null;
  const no = visFocusWhy(owner); if (no) return no;
  const r = projectionRange(owner) + ((u as any).figment?.range || 0);
  return dist(owner.pos, u.pos) > r ? 'Out of projection range (' + r + ').' : null;
});
onHook('turn_start_pre', (ctx: any, cb: Combat) => {
  const u: Unit = ctx.u; if (!u || !cb.ties?.length) return;
  // the third held (and more) costs AP that turn; a Snap last turn costs AP
  const kept = heldFigments(cb, u).filter((f) => (f as any).owned?.upkeep).length;
  if (kept >= FIG.upkeep.ap_from) ctx.penalties.push({ n: FIG.upkeep.ap, why: 'holding ' + kept + ' Figments' });
  if ((u as any).figSnap) { ctx.penalties.push({ n: FIG.let_go.snap_ap, why: 'a Figment snapped' }); delete (u as any).figSnap; }
});
onHook('turn_start', (ctx: any, cb: Combat) => {
  const u: Unit = ctx.u; if (!u || !cb.ties?.length) return;
  // a Figment with a lifetime (the Rigger's Double) fades at its owner's turn start in its last round
  for (const f of figmentsOf(cb, u)) { const until = (f as any).owned?.until; if (until != null && cb.round >= until) unravel(cb, f, 'it fades'); }
  // an Elite or a Boss tests a Double again at each of its turn starts; a Boss is never fooled two rounds running
  if (u.side === 'foe' && cb.images?.length) for (const img of imagesOf(cb).filter((i) => i.body && i.fooled.includes(u.id))) {
    const tier: any = u.tier ? (ENEMY as any)[u.tier] : null, owner = cb.units.find((x) => x.id === img.owner);
    if (!tier || tier.double_save == null || !(tier.double_save > 0) || !owner) continue;
    const keep = img.round < cb.round && u.tier === 'boss' ? false : doubleSave(cb, ctx.rng, owner, u).fooled;
    if (!keep) { img.fooled = img.fooled.filter((x) => x !== u.id); say(cb, u.name + ' sees through the Double.'); }
  }
});
onHook('turn_end', (ctx: any, cb: Combat) => {
  const u: Unit = ctx.u; if (!u || !cb.ties?.length) return;
  // a Figment that ends its owner's turn beyond projection range unravels (Tethered: twice its range)
  for (const f of figmentsOf(cb, u)) {
    const tr = (f as any).figment?.range || 0, r = tr ? 2 * (projectionRange(u) + tr) : projectionRange(u);
    if (dist(u.pos, f.pos) > r) unravel(cb, f, 'out of projection range');
  }
});
/** Attention breaks: every Figment of this owner unravels, nothing back. */
function breakAttention(cb: Combat, owner: Unit, why: string) { for (const f of figmentsOf(cb, owner)) unravel(cb, f, why); }
onHook('on_downed', (ctx: any, cb: Combat) => {
  const v: Unit = ctx.victim; if (!v || !cb.ties?.length) return;
  if (isFigment(v)) {
    // destroyed by damage: nothing back, and its owner Snaps (not from Visualization 9); found out by all who saw it
    const owner = ownerOf(cb, v);
    for (const img of imagesOf(cb).filter((i) => i.body === v.id)) dropImage(cb, img, 'destroyed');
    if (owner && !(v as any).owned?.free && !ladderAt(visPoints(owner)).noSnap && !(owner as any).figSnap) { (owner as any).figSnap = true; say(cb, v.name + ' is destroyed: ' + owner.name + '\'s focus snaps (−' + FIG.let_go.snap_ap + ' AP next turn).'); }
    ((cb as any).figGone ||= []).push(v.id); // taken off the board when the blow is done (sweep)
    return;
  }
  if (figmentsOf(cb, v).length) breakAttention(cb, v, v.name + ' is Downed: the focus broke');
});
onHook('cond_landed', (ctx: any, cb: Combat) => { const t: Unit = ctx.t; if (t && ctx.id === 'stunned' && cb.ties?.length && figmentsOf(cb, t).length) breakAttention(cb, t, t.name + ' is Stunned: the focus broke'); });
/** Take destroyed Figments off the board (after the blow that destroyed them). */
function sweep(cb: Combat) {
  const gone: string[] = (cb as any).figGone; if (!gone?.length) return; delete (cb as any).figGone;
  for (const id of gone) { const u = cb.units.find((x) => x.id === id); if (u) unmakeOwned(cb, u, { quiet: true }); }
}
for (const h of ['acted', 'turn_end', 'turn_start', 'round_start'] as const) onHook(h, (_ctx: any, cb: Combat) => sweep(cb));
onHook('combat_end', (_ctx: any, cb: Combat) => {
  // the fight's end unravels every Figment and Scrap Turret; spent charge stays spent
  for (const u of [...cb.units]) if (isFigment(u) || (u as any).owned?.kind === 'machine') unmakeOwned(cb, u, { quiet: true });
});

// ---------------------------------------------------------------------------------------------- the Blade's Hold
// Rules 1.34: the first enemy each round to enter or leave a tile next to a Blade is Cut; that is a reaction of its
// owner's (kind attack, react() with the owner as payer): with none left it does not strike.
onHook('move_step', (ctx: any, cb: Combat) => {
  const m: Unit = ctx.u; if (!m || ctx.skipOW || !cb.ties?.length || m.side === 'pc' && !cb.units.some((x) => x.side !== m.side && isFigment(x))) return;
  for (const b of cb.units) {
    if (b.side === m.side || b.dead || b.downed || !isFigment(b) || !FORM[(b as any).figment?.form]?.hold || (b as any).holdRound === cb.round) continue;
    const before = dist(ctx.from, b.pos) <= 1, after = dist(ctx.at, b.pos) <= 1; if (before === after) continue;
    const owner = ownerOf(cb, b); if (!owner || visFocusWhy(owner) || dist(owner.pos, b.pos) > projectionRange(owner)) continue;
    react(cb, b, { kind: 'attack', payer: owner, event: 'hold:' + b.id + ':' + cb.round }, () => {
      (b as any).holdRound = cb.round;
      const pv = previewAttack(cb, b, m, 'melee'); if (!pv.ok) return;
      say(cb, b.name + ' holds: it cuts ' + m.name + ' (' + owner.name + '\'s reaction).');
      resolveAttack(cb, ctx.rng, b, m, 'melee', null, { noAp: true });
    });
    if (m.dead || m.downed) { ctx.stop = true; return; }
  }
});

// ---------------------------------------------------------------------------------------------- what the screen reads
/** The meter (spec section 9): Figments held / the most, the Visualizer's charge / its core. null: no Visualizer. */
export function figmentMeter(cb: Combat | null | undefined, u: Unit | null | undefined): { held: number; max: number; charge: number; chargeMax: number } | null {
  if (!u?.mg?.vcarry) return null;
  return { held: cb ? heldFigments(cb, u).length : 0, max: heldMax(u), charge: u.mg.vcharge ?? 0, chargeMax: u.mg.vchargeMax ?? 0 };
}
