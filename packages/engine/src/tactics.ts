// Shared combat subsystems (rules 1.3, lane 0B): the pieces several perks, traits and class moves stand on.
// Reactions counted per round; combat Hidden, ambush and spotting; surrender and subdue; persuade, threaten and parley
// mid-fight; throwing and blasts; special ammo and damage types; the target-specific damage bucket; prayer and
// Blessings; companions; class resources; Burning put out, grapples broken, weapons recovered.
// Every number here is provisional (spec 14, items 82 onward). Deterministic: dice come from the rng passed in.
import { WEAPON, RULES, ENEMY, type WeaponDef } from './data';
import patronsJ from '../../../data/patrons.json';
import enemiesJ from '../../../data/enemies.json';
import { type Character, mod, prayerCooldown } from './character';
import { type Combat, type Unit, type Term, dist, key, xy, refOf, lineOfSight, unitSees, emitFx, fxFell, hurtUnit, sightFx, damageObject, objectsOf, alive, sightBlockers, standable, unitFromEnemy } from './combat';
import { type Rng, d20 } from './rng';
import { applyCond, condOn, condSource, endCond, harm, heal, shiftMana, manaOf, isCondition, unitSave, unitDebuff } from './magic';
import { emit, statQuery, charOfUnit, boundGame, heldOfUnit } from './effects/hooks';
import { grantShield, tendHook } from './effects/damage';
import { actionAp } from './effects/core';
import { note } from './effects/narrator';
import { sessionN } from './effects/uses';
import { makeObject } from './objects';
import { residueFlag } from './feelings';

// ---------- damage types, special ammo, the damage bucket ----------
export interface AmmoType { id: string; damage_mult?: number; ignores_armor?: boolean; armor_mult?: number; applies?: string; damage_type?: string; meter_per_hit?: number }
export const AMMO_TYPES: Record<string, AmmoType> = Object.fromEntries(((RULES.weapons_rules?.ammo_types || []) as AmmoType[]).map((a) => [a.id, a]));
/** Ammo-type ids as players say them (armour_piercing ≡ armor_piercing). */
export const ammoId = (t: string | null | undefined) => (!t ? null : t === 'armour_piercing' || t === 'ap' ? 'armor_piercing' : t === 'hp' ? 'hollow_point' : t);
/** A weapon's damage type (weapons.json damage_type; physical by default) after its ammo (Enhanced rounds: elemental). */
export function damageTypeOf(w: WeaponDef | undefined, ammo?: string | null): string {
  const a = AMMO_TYPES[ammoId(ammo) || ''];
  return a?.damage_type || (w as any)?.damage_type || 'physical';
}
/** Is the weapon explosive (grenades, launchers, satchels: weapons.json explosive, or an area radius)? */
export const isExplosive = (w: WeaponDef | undefined) => !!w && (!!(w as any).explosive || (w.properties || []).some((p) => /^area_radius_\d+$/.test(p)));
/** A weapon's blast radius (area_radius_N), or 0. */
export const radiusOf = (w: WeaponDef | undefined) => { const p = (w?.properties || []).find((x) => /^area_radius_\d+$/.test(x)); return p ? +p.split('_').pop()! : 0; };
/** Silent weapons don't reveal a Hidden attacker (spec: bows; the suppressor). */
export const isSilent = (u: Unit) => { const w = WEAPON[u.weapon]; return (w?.properties || []).includes('silent') || !!(w as any)?.phys?.props?.includes('silent') || (u.mods || []).includes('mod_suppressor'); }; // rules 1.12: the Silent property counts
/** Target-specific damage bonuses stack additively and are capped at ×2.0 in all (plan 6a-1, provisional): True Name,
 * Judgement Day, Case Closed, Weak Point, Deliver the Sinner, Holy Ordnance, Moon Hunter, Humanity First, Ork Steel
 * each push {v: 0.15, label} (the bonus as a fraction) into ctx.vs on 'damage_out'. Situational self-multipliers
 * (Pain Eater, Brightest Light, the Ambush multiplier, Weakened) stay multiplicative in ctx.mults. */
export const VS_CAP = 1.0;
export function stackDamage(mults: Term[], vs: Term[]): { mult: number; vsMult: number; total: number } {
  const mult = mults.reduce((t, m) => t * m.v, 1), vsMult = 1 + Math.min(VS_CAP, Math.max(-0.9, vs.reduce((t, x) => t + x.v, 0)));
  return { mult, vsMult, total: mult * vsMult };
}

// ---------- reactions (spec: one per round; items may add) ----------
/** Reactions a unit gets each round: 1, + items (stat 'reactions'); none while Suppressed, Stunned or out of the fight. */
export function maxReactions(u: Unit, cb?: Combat | null): number {
  if (!alive(u) || condOn(u, 'suppressed') || condOn(u, 'stunned') || u.skipTurn) return 0;
  if (cb && residueFlag(cb, u, 'no_reaction')) return 0; // rules 1.8: Dread underfoot
  return Math.max(0, 1 + statQuery({ u }, 'reactions').add);
}
export function reactionsUsed(cb: Combat, u: Unit): number {
  if (u.reactUsed && u.reactUsed.r === cb.round) return u.reactUsed.n;
  return u.reactedRound === cb.round ? 1 : 0; // old saves
}
const ownReact = (cb: Combat, u: Unit) => reactionsUsed(cb, u) < maxReactions(u, cb);
/** Many Hands (Camaraderie Mastered, perk-runtime E-H1): an ally whose reactions are spent may spend a holder's who can
 * see them (alive, same side, not the same unit). The first such holder in unit order. */
export function reactionDonor(cb: Combat, u: Unit): Unit | null {
  if (!alive(u) || maxReactions(u, cb) <= 0) return null; // Stunned, Suppressed: no reaction to take anyone's
  return cb.units.find((v) => v !== u && v.side === u.side && alive(v) && !v.companion && heldOfUnit(v).perks.some((p) => p.id === 'many_hands') && ownReact(cb, v) && unitSees(cb, v, u.pos)) || null;
}
export const canReact = (cb: Combat, u: Unit) => ownReact(cb, u) || !!reactionDonor(cb, u);
/** Spend a reaction now; false when none is left. */
export function useReaction(cb: Combat, u: Unit): boolean {
  if (!ownReact(cb, u)) {
    const d = reactionDonor(cb, u); if (!d) return false;
    d.reactUsed = { r: cb.round, n: reactionsUsed(cb, d) + 1 }; d.reactedRound = cb.round;
    cb.log.push(u.name + ' reacts on ' + d.name + '\'s reaction (Many Hands).'); return true;
  }
  u.reactUsed = { r: cb.round, n: reactionsUsed(cb, u) + 1 }; u.reactedRound = cb.round; return true;
}
/** Give a used reaction back (Many Hands shares one; a refused reaction). */
export function refundReaction(cb: Combat, u: Unit) { const n = reactionsUsed(cb, u); if (n > 0) u.reactUsed = { r: cb.round, n: n - 1 }; if (n <= 1) delete u.reactedRound; }

// ---------- combat Hidden (spec: Helpful states; rules 1.3) ----------
export const TIER_NOTICE: Record<string, number> = { minion: 0, soldier: 2, elite: 4, boss: 6 };
/** Does any unit of the other side see this tile (range, light, line of sight)? */
export const seenByFoes = (cb: Combat, u: Unit) => cb.units.some((v) => v.side !== u.side && alive(v) && !v.hidden && unitSees(cb, v, u.pos));
/** Become Hidden (not while Marked). Each entry gives one ambush. Returns a log suffix. */
export function hide(cb: Combat, u: Unit, why = ''): string {
  if (condOn(u, 'marked')) return ' · ' + u.name + ' is Marked and can\'t hide';
  if (u.hidden) return '';
  u.hidden = true; u.hideEntry = (u.hideEntry || 0) + 1;
  for (const side of ['pc', 'foe']) if (side !== u.side) ((cb.lastSeen ||= {})[side] ||= {})[u.id] = u.pos;
  emit(cb, 'hide', { u, why, cb });
  sightFx(cb, null, { [u.id]: 'hide' }); // presentation: it fades from the eyes of a side that saw it
  return ' · ' + u.name + ' is Hidden' + (why ? ' (' + why + ')' : '');
}
/** Stop being Hidden (spotted, an attack that isn't silent, damage taken, an enemy ending its turn next to you). */
export function reveal(cb: Combat, u: Unit, why: string): string {
  if (!u.hidden) return '';
  u.hidden = false;
  for (const side of Object.keys(cb.lastSeen || {})) delete cb.lastSeen![side][u.id];
  cb.log.push(u.name + ' is revealed (' + why + ').');
  emit(cb, 'spotted', { u, why, cb });
  sightFx(cb, null, { [u.id]: 'reveal' }); // presentation: it shimmers into the sight of a side that can see its tile
  return ' · revealed';
}
/** The Hide action (2 AP, provisional): only out of every enemy's sight, never while Marked. */
export function hideAction(cb: Combat, u: Unit): string | null {
  if (u.hidden) return 'Already Hidden.';
  if (condOn(u, 'marked')) return 'Marked: you can\'t hide.';
  if (seenByFoes(cb, u)) return 'An enemy can see you: get out of sight first.';
  const ap = actionAp({ u }, 'hide', 2).ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  u.ap -= ap; cb.log.push(u.name + ' goes to ground' + hide(cb, u) + '.'); emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'hide' });
  return null;
}
/** An ambush: the first attack from each Hidden entry (spec item 41; plan 6a-8): crit on 19-20, × the Ambush multiplier. */
export const ambushReady = (u: Unit) => !!u.hidden && (u.ambushUsed || 0) < (u.hideEntry || 1);
/** Spotting, at the end of a unit's turn (rules 1.3): it rolls d20 + its notice (enemies by tier, PCs Vigilant) against
 * 10 + each Hidden enemy's Ingenuity modifier + Stealth, for every one whose tile it can see; ending next to one finds
 * it outright. 'spot' {by, u, die, mod, tn, cancel} lets items change it. */
export function spotHidden(cb: Combat, rng: Rng, by: Unit) {
  if (!alive(by)) return;
  for (const u of cb.units) {
    if (u.side === by.side || !u.hidden || u.dead) continue;
    if (dist(u.pos, by.pos) <= 1) { reveal(cb, u, by.name + ' is right next to them'); continue; }
    if (!unitSees(cb, by, u.pos)) continue;
    const m = by.side === 'foe' ? TIER_NOTICE[by.tier || 'minion'] ?? 0 : mod(by.vigilant || 0) + (by.sk?.vigilant || 0);
    const ctx: any = emit(cb, 'spot', { by, u, die: d20(rng), mod: m, tn: 10 + (u.ingMod ?? -2) + (u.stealth || 0) + (u.sk?.ingenuity || 0), cancel: false, cb, rng });
    if (ctx.cancel) continue;
    const ok = ctx.die === 20 || (ctx.die !== 1 && ctx.die + ctx.mod >= ctx.tn);
    cb.log.push(by.name + ' looks for ' + u.name + ': d20 ' + ctx.die + ' ' + (ctx.mod >= 0 ? '+' : '−') + Math.abs(ctx.mod) + ' vs ' + ctx.tn + (ok ? ' · spotted' : ' · nothing'));
    if (ok) reveal(cb, u, 'spotted by ' + by.name);
  }
}

// ---------- surrender and subdue (rules 1.3) ----------
/** May this unit surrender at all? Not a Boss, not a machine, robot or turret, not tagged no_surrender, once per fight. */
export function canSurrender(t: Unit): boolean {
  return t.side === 'foe' && alive(t) && t.tier !== 'boss' && !['machine', 'robot', 'turret', 'drone'].includes(t.kind || '') && !(t.tags || []).includes('no_surrender') && !t.surrenderTried;
}
/** It gives up: out of the fight, not a target, counted as defeated; no kill credit and no mana rise. 'on_surrender'. */
export function surrender(cb: Combat, t: Unit, by: Unit | null, why: string): string {
  t.surrendered = true; t.overwatch = null; t.hidden = false; t.ap = 0; (t.tags ||= []).includes('prisoner') || t.tags!.push('prisoner');
  emitFx(cb, 'down', { unit: t.id, at: t.pos, dead: false, surrendered: true });
  emit(cb, 'on_surrender', { t, by, why, cb });
  return ' · ' + t.name + ' SURRENDERS (' + why + ')';
}
/** The surrender save (plan 6a-3: one per enemy a fight): a Heart save against 12 + the speaker's Heart debuff
 * strength, only for an enemy at half HP or less, or with every ally down. A failed save surrenders. */
export function trySurrender(cb: Combat, rng: Rng, by: Unit, t: Unit, tnAdd = 0): string {
  if (!canSurrender(t)) return ' · ' + t.name + (t.surrenderTried ? ' has already refused' : ' won\'t surrender');
  const alone = !cb.units.some((v) => v !== t && v.side === t.side && alive(v));
  if (t.hp > t.maxHp / 2 && !alone) return ' · ' + t.name + ' isn\'t beaten enough to listen';
  t.surrenderTried = true;
  const r = d20(rng), m = unitSave(t, 'heart'), tn = 12 + unitDebuff(by, 'heart') + tnAdd, held = r === 20 || (r !== 1 && r + m >= tn);
  const roll = ' (Heart save d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs ' + tn + ')';
  return held ? ' · ' + t.name + ' refuses' + roll : surrender(cb, t, by, 'talked down' + roll);
}
/** A non-lethal blow that takes the last HP subdues a foe instead of killing it (damage src.nonlethal). */
export function subdue(cb: Combat | null, t: Unit) { t.subdued = true; t.surrendered = true; t.dead = false; t.downed = false; t.hp = 0; if (cb) emit(cb, 'on_surrender', { t, by: null, why: 'subdued', cb }); }

// ---------- persuade, threaten, parley mid-fight (spec action table: 2 AP) ----------
export const HEARING = 8;
/** Talk in a fight: Persuade (Eloquence: a Left Brain Debuff against a Brain save), Threaten (Intimidation: Shaken
 * against a Body save), Parley (offer terms: the surrender save, and the words go to the Narrator). 'parley' {u, t,
 * kind, text, tnAdd, cancel, result} lets items change it (Overruled, Crowd-Pleaser, Lay Down Arms…). */
export function parley(cb: Combat, rng: Rng, u: Unit, t: Unit, kind: 'persuade' | 'threaten' | 'parley', text = ''): string | null {
  if (!t || t.dead || t.surrendered || t.side === u.side) return 'Pick an enemy who can hear you.';
  if (dist(u.pos, t.pos) > HEARING) return 'Too far to be heard (' + HEARING + ' tiles).';
  const ap = actionAp({ u }, 'parley', 2).ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const ctx: any = emit(cb, 'parley', { u, t, kind, text, tnAdd: 0, cancel: null as string | null, result: '', cb, rng });
  if (ctx.cancel) return ctx.cancel;
  u.ap -= ap;
  const said = text ? ' "' + text.slice(0, 200) + '"' : '';
  let out = '';
  if (kind === 'persuade') out = applyCond(cb, rng, u, t, 'ldebuff', undefined, 'brain', { tnAdd: ctx.tnAdd });
  else if (kind === 'threaten') out = applyCond(cb, rng, u, t, 'shaken', undefined, 'body', { tnAdd: ctx.tnAdd });
  else out = trySurrender(cb, rng, u, t, ctx.tnAdd);
  cb.log.push(u.name + (kind === 'persuade' ? ' works on ' : kind === 'threaten' ? ' threatens ' : ' offers terms to ') + t.name + said + out + (ctx.result || '') + '.');
  if (text) (cb.notes ||= []).push(u.name + ' (round ' + cb.round + ', ' + kind + ' at ' + t.name + '):' + said);
  return null;
}

// ---------- throwing and blasts (spec: Throw 2 AP; Thrown weapons) ----------
export const throwRangeOf = (u: Unit) => u.throwRange ?? 6;
/** Throw a grenade (or place a satchel) at a tile: in range and line of sight; 2 AP (items change it: 'throw'). */
export function throwItem(cb: Combat, rng: Rng, u: Unit, item: string, tile: string): string | null {
  const w = WEAPON[item]; if (!w || w.category !== 'thrown') return 'That isn\'t something to throw.';
  if (!((u.throwables?.[item] ?? 0) > 0)) return 'You carry no ' + w.name.toLowerCase() + '.';
  const placed = (w.properties || []).includes('placed'), range = placed ? 1 : throwRangeOf(u);
  const [x, y] = xy(tile); if (x < 0 || y < 0 || x >= cb.map.w || y >= cb.map.h) return 'Off the map.';
  if (dist(u.pos, tile) > range) return placed ? 'Place it on your tile or next to you.' : 'Out of throwing range (' + range + ' tiles).';
  if (tile !== u.pos && !lineOfSight(cb, u.pos, tile)) return 'No line of sight to throw there.';
  // 'throw' {u, item, tile, ap, radius, cancel, caughtBy, preview} (mutable): cancel stops the blast (and any fire it
  // leaves); caughtBy names who caught it, for the log (hooks gap C1).
  const ctx: any = emit(cb, 'throw', { u, item, tile, ap: actionAp({ u }, 'throw', 2).ap, radius: radiusOf(w), cancel: false, caughtBy: null, preview: false, cb, rng });
  if (u.ap < ctx.ap) return 'Needs ' + ctx.ap + ' AP.';
  u.ap -= ctx.ap; u.throwables![item]--;
  emitFx(cb, 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: item, cat: 'thrown', mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true });
  cb.log.push(u.name + (placed ? ' places a ' : ' throws a ') + w.name.toLowerCase() + ' at ' + refOf(tile) + (ctx.cancel ? (ctx.caughtBy ? ' · ' + ctx.caughtBy.name + ' catches it' : ' · it never goes off') : blast(cb, rng, u, tile, item, ctx.radius)) + '.');
  if (u.hidden && !isSilent(u)) reveal(cb, u, 'threw ' + w.name.toLowerCase());
  return null;
}
const tilesWithin = (cb: Combat, at: string, r: number) => { const [x0, y0] = xy(at), out: string[] = []; for (let x = x0 - r; x <= x0 + r; x++) for (let y = y0 - r; y <= y0 + r; y++) if (x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h) out.push(key(x, y)); return out; };
/** A thrown item goes off on a tile (credited to the thrower: kills, bleed, the barrels it sets off). */
export function blast(cb: Combat, rng: Rng, by: Unit | null, tile: string, item: string, radius = radiusOf(WEAPON[item])): string {
  const w = WEAPON[item], who = cb.units.filter((v) => !v.dead && !v.surrendered && dist(v.pos, tile) <= radius);
  emitFx(cb, 'explode', { at: tile, radius, what: item });
  let out = '';
  switch (item) {
    case 'smoke_grenade': {
      cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'veil', tiles: tilesWithin(cb, tile, radius), words: ['smoke'], by: by?.id || '', side: by?.side || 'pc', left: 2, mult: 1, who: by?.name || '' }];
      return ' · smoke fills ' + radius + ' tiles around ' + refOf(tile) + ' for 2 rounds';
    }
    case 'flashbang': for (const v of who) out += applyCond(cb, rng, by, v, 'blinded', 1, 'body'); return out || ' · nobody caught in it';
    case 'bot_scrambler': {
      for (const v of who) {
        if (['robot', 'machine', 'turret', 'drone'].includes(v.kind || '') || v.companion === 'drone') out += applyCond(cb, rng, by, v, 'stunned', 1, 'body', { skipSave: true });
        if (WEAPON[v.weapon]?.category === 'mana') { v.jammed = true; out += ' · ' + v.name + '\'s mana arm jams'; }
      }
      cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'scramble' as any, tiles: tilesWithin(cb, tile, radius), words: ['scramble'], by: by?.id || '', side: by?.side || 'pc', left: 2, mult: 1, who: by?.name || '' }];
      return (out || ' · nothing electronic caught in it') + ' · Sigils cost +1 AP there for 2 rounds';
    }
    default: {
      const dmg = typeof w?.damage === 'number' ? w.damage : 0;
      for (const v of who) { out += hurtUnit(v, dmg, false, cb, 'explosion', by); if (!v.dead && (w?.properties || []).includes('applies_burning')) out += applyCond(cb, rng, by, v, 'burning', undefined, 'body', { skipSave: true }); }
      for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && dist(o.pos, tile) <= radius) out += damageObject(cb, o.pos, dmg, 0, by);
      if ((w?.properties || []).includes('applies_burning') && standable(cb.map, tile)) cb.objects = [...objectsOf(cb), makeObject('fire_' + tile.replace(',', '_') + '_' + cb.round, 'fire', tile)];
      return out || ' · it goes off and finds no one';
    }
  }
}

// ---------- prayer (spec: Patrons and prayer) ----------
// Rules 1.6 (faith.ts): a patron's Hymns are what the older code calls its Blessings (Blessed Shells, Stolen Fire).
export const PATRONS: any[] = ((patronsJ as any).items || []).map((p: any) => ({ ...p, blessings: p.hymns || p.blessings || [] }));
export const PATRON: Record<string, any> = Object.fromEntries(PATRONS.map((p) => [p.id, p]));
/** Devotion, the level (0-10, starts at 3 when the pact is made). Rules 1.6.1: it moves as Devotion XP, only through
 * faith.ts shiftDevotion (the old changeDevotion is gone). */
export const devotionOf = (c: Character) => Math.max(0, Math.min(10, c.devotion ?? 3));
/* Prayer itself is rules 1.6 (faith.ts: combatPray in a fight, faith/pray in the story); the patron's mood is retired. */
/** A Blessing lands: 'blessing_in' {u, t, blessing, power, handled} first (a lane may run it), then the effects the
 * engine knows (heal, Soul damage, shield, a condition, cleanse); the rest goes to the Narrator with its text. */
export function blessing(cb: Combat, rng: Rng, u: Unit, t: Unit, bl: any, power: number): string {
  const ctx: any = emit(cb, 'blessing_in', { u, t, blessing: bl, power, handled: false, out: '', cb, rng });
  if (ctx.handled) return ctx.out || '';
  power = Math.max(0, ctx.power ?? power); // items may change the power (Factory Made, The Old Blood: hooks gap A5/F5)
  let out = '', left = false;
  for (const e of bl.effects || []) {
    if (e.op === 'stat_mod' && e.stat === 'hp' && typeof e.value === 'number') out += e.value > 0 ? heal(t, e.value * power, cb, u, 'blessing') : harm(cb, rng, u, t, -e.value * power, 'soul');
    else if (e.op === 'heal' && typeof e.value === 'number') out += heal(t, e.value * power, cb, u, 'blessing'); // rules 1.6 data
    else if (e.op === 'shield' && typeof e.value === 'number') out += ' · ' + t.name + ' gains a ' + grantShield(cb, t, e.value * power, u) + ' shield';
    else if (e.op === 'stat_mod' && e.stat === 'shield' && typeof e.value === 'number') out += ' · ' + t.name + ' gains a ' + grantShield(cb, t, e.value * power, u) + ' shield';
    else if (e.op === 'condition' && isCondition(e.condition || e.id)) out += applyCond(cb, rng, u, t, e.condition || e.id, e.rounds, undefined, { skipSave: t.side === u.side });
    else if (e.op === 'cleanse') { const ids = Object.keys(t.conds || {}); for (const id of ids) endCond(t, id, cb); out += ' · ' + t.name + ' is cleansed'; if (ids.length) tendHook.f?.(cb, u, t); } // tending others (rules 1.5, 3.3)
    else left = true;
  }
  if (left || bl.adjudication !== 'engine') (cb.notes ||= []).push('BLESSING ' + bl.name + ' (' + u.name + ' → ' + t.name + ', r' + cb.round + ', ×' + Math.round(power * 100) / 100 + '): ' + bl.text + ' — yours to rule');
  return out;
}

// ---------- small actions: put out a fire, break a grapple, recover a weapon ----------
/** Put out Burning (1 AP): yourself or an adjacent ally (spec: Burning). */
export function extinguish(cb: Combat, u: Unit, t: Unit): string | null {
  if (!condOn(t, 'burning')) return t === u ? 'You aren\'t burning.' : t.name + ' isn\'t burning.';
  if (dist(u.pos, t.pos) > 1) return 'Stand next to them.';
  const ap = actionAp({ u }, 'extinguish', 1).ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  u.ap -= ap;
  // FIRE's inflection (rules 1.10, Sigil 1.5): a Mastered FIRE's Burning lasts +1 round past being put out.
  const linger = /^linger:(\d+)/.exec(String(t.condArg?.burning || ''));
  if (linger) { t.conds!.burning = +linger[1]; delete t.condArg!.burning; if (cb.order?.[cb.turn] === t.id) (t.condFresh ||= []).push('burning'); cb.log.push(u.name + ' beats down the fire' + (t === u ? '' : ' on ' + t.name) + ', but it smoulders ' + linger[1] + ' more round' + (linger[1] === '1' ? '' : 's') + ' (a Mastered FIRE).'); return null; }
  endCond(t, 'burning', cb); cb.log.push(u.name + ' puts out the fire' + (t === u ? '' : ' on ' + t.name) + '.'); return null;
}
/** Break a grapple (2 AP): d20 + the better of your Raw Power and Athletics modifiers against d20 + the grappler's. */
export function escapeGrapple(cb: Combat, rng: Rng, u: Unit): string | null {
  if (!condOn(u, 'grappled')) return 'Nothing is holding you.';
  const ap = actionAp({ u }, 'escape', 2).ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  u.ap -= ap;
  const by = cb.units.find((x) => x.id === condSource(u, 'grappled'));
  const mine = Math.max(u.strength ?? 0, mod(u.athleticsPts || 0)), theirs = by ? Math.max(by.strength ?? 0, mod(by.athleticsPts || 0)) : 0;
  const a = d20(rng) + mine, b = d20(rng) + theirs, ok = a > b || !by;
  if (ok) endCond(u, 'grappled', cb);
  cb.log.push(u.name + ' strains against the hold: ' + a + ' vs ' + b + (ok ? ' · breaks free' : ' · still held') + '.');
  return null;
}
/** Recover a dropped or lowered weapon: 2 AP (1 for a lowered one). */
export function recoverWeapon(cb: Combat, u: Unit): string | null {
  const id = condOn(u, 'disarmed') ? 'disarmed' : condOn(u, 'lowered') ? 'lowered' : null; if (!id) return 'Your weapon is in your hand.';
  const ap = actionAp({ u }, 'recover', id === 'disarmed' ? 2 : 1).ap; if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  u.ap -= ap; endCond(u, id, cb); cb.log.push(u.name + (id === 'disarmed' ? ' recovers the weapon.' : ' raises the weapon.')); return null;
}

// ---------- companions (rules 1.3; stat blocks provisional) ----------
export const COMPANION_KINDS: Record<string, any> = Object.fromEntries((((enemiesJ as any).companions || []) as any[]).map((k) => [k.id, k]));
/** A character's companions as PC-side units placed next to it (destroyed at 0 HP, not Downed; HP written back). */
export function companionUnits(cb: Combat | null, c: Character, owner: Unit, taken: Set<string>, rng: Rng, map: { w: number; h: number; solid: string[] }, fixed?: Record<string, string>, only?: string): Unit[] {
  const out: Unit[] = [];
  for (const comp of c.companions || []) {
    const k = COMPANION_KINDS[comp.kind]; if (!k || (only && comp.kind !== only)) continue;
    if (comp.hp != null && comp.hp <= 0) continue; // destroyed: repaired or healed in the story first
    // Where it stood on the area map (fixed: the story's positions, by unit id), else next to the owner.
    const want = fixed?.['cp-' + c.id + '-' + comp.id];
    const [x0, y0] = xy(owner.pos); let at = want && !taken.has(want) && !map.solid.includes(want) ? want : '';
    for (let r = 1; r < 4 && !at; r++) for (let dx = -r; dx <= r && !at; dx++) for (let dy = -r; dy <= r && !at; dy++) { const kk = key(x0 + dx, y0 + dy); if (x0 + dx >= 0 && y0 + dy >= 0 && x0 + dx < map.w && y0 + dy < map.h && !map.solid.includes(kk) && !taken.has(kk)) at = kk; }
    if (!at) continue; taken.add(at);
    const u = unitFromEnemy('cp-' + c.id + '-' + comp.id, comp.name || k.name, 'minion', k.weapon || 'fists', at, rng);
    Object.assign(u, { side: 'pc', tier: undefined, hp: Math.min(k.hp, comp.hp ?? k.hp), maxHp: k.hp, def: k.defense, armour: k.armour, attack: k.attack_bonus, movement: k.movement, strength: k.attack_bonus,
      init: owner.init - 0.5, agility: 1, ctrl: c.id, companion: comp.kind, kind: k.kind || comp.kind, tags: [...(k.tags || [])], short: (comp.name || k.name).slice(0, 2).toUpperCase(), img: comp.img || k.portrait || undefined }); // its own portrait first (the cut-in and the HUD show it)
    u.mags = undefined; // unlimited spares, as enemies carry
    // A fixed action list and a gun that never runs dry (the drone: move and shoot, no reload, no Heat or jams; spec §14
    // item 370), from the stat block.
    if (Array.isArray(k.actions) && k.actions.length) u.allowedActions = [...k.actions];
    if (k.infinite_ammo) u.infiniteAmmo = true;
    // The twin (Twinbound's Call on the area map): half its owner's maximum HP, the owner's Defense, tied to the owner.
    if (comp.kind === 'twin') Object.assign(u, { hp: comp.hp ?? Math.floor(0.5 * owner.maxHp), maxHp: comp.maxHp ?? Math.floor(0.5 * owner.maxHp), def: owner.def, attack: owner.mg?.will ?? 0, init: owner.init - 0.4, short: 'TW', img: comp.img || owner.img, twinOf: owner.id });
    out.push(u);
  }
  void cb;
  return out;
}

// ---------- class resources ----------
/** A class resource's value, and changes within its maximum. Returns what actually changed. */
export const resOf = (u: Unit, id: string) => u.res?.[id] ?? 0;
export function resGain(u: Unit, id: string, n: number): number {
  if (!u.resMax || u.resMax[id] == null) return 0;
  const was = resOf(u, id); (u.res ||= {})[id] = Math.max(0, Math.min(u.resMax[id], was + n)); return u.res[id] - was;
}
export function resSpend(u: Unit, id: string, n: number): boolean { if (resOf(u, id) < n) return false; u.res![id] -= n; return true; }

// ---------- what an enemy carries into a fight (Narrator start_fight, campaign data) ----------
export interface FoeTraits { kind?: string; tags?: string[]; unaware?: boolean; no_surrender?: boolean; hidden?: boolean }
export const KINDS = ['human', 'robot', 'crawler', 'ork', 'upper_realm', 'cursed', 'beast', 'machine', 'turret', 'celestial', 'drone'];
export const FOE_TAGS = ['military', 'hunter', 'humanoid', 'unaware', 'no_surrender', 'lawful', 'prisoner', 'civilian', 'underworld', 'official', 'heretic', 'faithful'];
/** Apply a foe's kind and tags (unknown values dropped; default human and humanoid). Unaware foes sit out round 1. */
export function applyFoeTraits(u: Unit, f: FoeTraits | undefined) {
  const kind = f?.kind && KINDS.includes(f.kind) ? f.kind : u.kind || 'human';
  const tags = [...new Set([...(['human', 'crawler', 'ork', 'upper_realm', 'cursed', 'celestial'].includes(kind) ? ['humanoid'] : []), ...(f?.tags || []).filter((t) => typeof t === 'string' && FOE_TAGS.includes(t)), ...(f?.no_surrender ? ['no_surrender'] : []), ...(f?.unaware ? ['unaware'] : [])])];
  u.kind = kind; u.tags = tags;
  if (f?.unaware) u.waitRound = Math.max(u.waitRound || 0, 2);
  if (f?.hidden) { u.hidden = true; u.hideEntry = 1; }
}
/** Mana from a death (spec: the meter): +5 a person or beast, +2 a robot, machine, turret or drone. */
/** The bots one death releases (spec: the meter; rules.json mana.meter.events): a robot or machine +2, a beast or monster
 * +3, a person +5. */
export const deathMana = (u: Unit): number => {
  const ev = (id: string, d: number) => Number((RULES as any)?.mana?.meter?.events?.find((e: any) => e.event === id)?.delta) || d;
  if (['robot', 'machine', 'turret', 'drone'].includes(u.kind || '') || /drone|robot|automaton|\bbot\b|turret/i.test(u.name)) return ev('robot_destroyed', 2);
  if (u.kind === 'beast' || u.kind === 'monster') return ev('beast_dies', 3);
  return ev('person_dies', 5);
};

void ENEMY; void manaOf; void sightBlockers; void fxFell; void note;
