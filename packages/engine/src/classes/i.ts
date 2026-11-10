// Lane I: the 13 base classes, every move and class rule (rules 1.3). Marksman, Fighter, Defender, Medic, Assassin,
// Mage, Warden, Scribe, Trickster, Channeler, Guardian, Bard, Hexer.
//
// Class rules that are not data items (the resources Heat, Momentum, Guard, Supplies, Marks/toxins, Flux, Strain) run
// in the shared subsystems (lane 0B: combat.ts, magic.ts, tactics.ts) or on the class's rank I move here (Momentum's
// "tiles toward the target" on Lunge, Interpose on Brace, the three-Mark limit on Mark). Every move runs in combat and,
// where it has one, in the story; what the engine can't judge goes to the Narrator (note / pendRuling / brief).
// Recommended fixes from the audit are marked PROVISIONAL and listed in the spec (section 14, tags I…) and docs/design/perk-runtime.md.
import { isPressed } from '../physical/pressure';
import { register, stateOf, uses, note, pendRuling, postStory, applyDamage, healUnit, grantShield, modOn, armedOf, AP_MAX, emit, charOfUnit, statQuery, holderOf, type Holder, type ActionDef, type ActionArgs } from '../effects';
import { stampOf } from '../effects/uses';
import { weaponProps, ensurePhys } from '../physical/data';
import { loadQuiverWith } from '../physical/ranged/quiver';
import { strikeFromWorld, apLeft } from '../game';
import type { Combat, Unit } from '../combat';
import {
  dist, key, xy, alive, unitSees, sideSees, lineOfSight, standable, refOf, keyOf as refKey, emitFx, objectsOf, paths, moveUnit,
  resolveAttack, previewAttack, attackDamage, attackApCost, isMelee, checkOver, reloadAp, coverTileFor, fxFell, rollInjury,
} from '../combat';
import {
  type Character, mod, healingMult, maxHp, evoChargeNow, mpNow, hasEvoker, hasEmanator, maxSigilWords, sigilCoreSaving, sigilMult, elementalMult, strengthOf,
  classResources, migrateDesign,
} from '../character';
import { WEAPON, SIGIL, SCHOOL, SOUL_REV } from '../data';
import {
  applyCond, endCond, condOn, condSource, unitSave, unitStrength, withVia, harm, heal, shiftMana, manaBand, manaOf, stageMult, isBoon, condSkillMod, condHit, condFamily,
  grammarError, previewEvoke, evoke, evokeMarks, releaseOutburst, addStrain, FLUX_MAX, SPELL_AP, SOUL_REACH, MAX_GLYPHS, SIGIL_REV, compileSpell, findPattern, migrateSigil, strokeOfGlyph, tidyStrokes,
  formOf, outburstArea, riderStage, toneElement, toneOf, designCost, MAX_STAGE, SOUL_AP, planStrike,
  type EvokePreview, type Spell,
} from '../magic';
import { soulStrike, designRolls } from './soul';
import { d20, die, type Rng } from '../rng';
import { resOf, resGain, resSpend, canReact, useReaction, refundReaction, reveal , dropHeldShot } from '../tactics';
import { itemWords, wordCostMods } from '../effects/core';
import { makeObject } from '../objects';

// =================================================================================================== helpers
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const myTurn = (h: Holder) => !!h.cb && !!h.u && h.cb.order[h.cb.turn] === h.u.id && !h.cb.window;
const rngOf = (h: Holder, ctx?: any): Rng => ctx?.rng || h.g?.rng || { state: 1 };
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const tileOf = (cb: Combat, t?: string) => (!t ? null : /^\d+,\d+$/.test(t) ? t : refKey(t, cb.map));
const unitById = (cb: Combat, id?: string | null) => (id ? cb.units.find((x) => x.id === id) || null : null);
const foeOf = (a: Unit, b: Unit) => a.side !== b.side;
const isBoss = (t: Unit) => t.tier === 'boss' || t.kind === 'celestial';
/** Story-level item state (outlives fights: inscriptions, stored spells, a Gift, an Inspire waiting for its roll). */
function keep(h: Holder): Record<string, any> {
  const g = h.g, id = h.c?.id || h.u?.charId; if (!g?.story || !id) return {};
  const ps = ((g.story.ps ||= {})[id] ||= {}); return ((ps.items ||= {})[h.key] ||= {});
}
/** The current rest window ("until the next rest"). */
const restStamp = (h: Holder) => stampOf('per_rest', { g: h.g });
/** A character named in a story action's text, or by id; else null. */
function charNamed(h: Holder, args: ActionArgs): Character | null {
  const all: Character[] = Object.values(h.g?.characters || {});
  const id = args.targetId || args.choice;
  if (id && h.g?.characters?.[id]) return h.g.characters[id];
  const t = String(args.text || args.npc || '').toLowerCase();
  if (t) {
    const full = all.filter((c) => !c.dead && t.includes(c.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length);
    if (full.length) return full[0];
    const first = all.filter((c) => !c.dead && t.includes(c.name.toLowerCase().split(' ')[0]));
    if (first.length === 1) return first[0];
  }
  return null;
}
/** An off-turn policy (Interpose, Riposte, Reactive Plate, Drink It In), set for this fight with a 0-AP action. */
const policy = (h: Holder, def: string): string => stateOf(h).policy || def;
/** A 0-AP action that sets an off-turn policy for the rest of the fight. */
const policyAction = (id: string, label: string, value: string, text: string): ActionDef => ({
  id, label, scope: ['combat'], target: 'none', ap: 0, text,
  available: (h) => (policy(h, 'auto') === value ? 'Already set.' : true),
  run: (h) => { stateOf(h).policy = value; say(h.cb, (h.u?.name || 'Someone') + ': ' + label + '.'); },
});
const fmt = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);

// ---------- the Evoker (Mind classes) ----------
function evokerReady(h: Holder): string | null {
  const u = h.u, m = u?.mg; if (!u || !m || !m.evoker) return 'Needs an Evoker in hand.';
  if (u.dead || u.downed) return 'Downed.';
  if (condOn(u, 'silenced')) return 'Silenced: no magic this round.';
  if (m.lockRound != null && h.cb && h.cb.round <= m.lockRound) return 'Your Evoker is locked after an overload until next round.';
  return null;
}
/** Flux into the Evoker (spec: every word drawn adds 1; above 6 it overloads: 10 damage per Flux over, locked a round,
 * all of it bursts into the air). The same rule as magic.ts flux(), for class moves that add Flux. */
function addFlux(cb: Combat, u: Unit, n: number): string {
  const m = u.mg; if (!m || n <= 0) return '';
  m.flux += n; if (m.flux <= FLUX_MAX) return ' · +' + n + ' Flux (' + m.flux + '/' + FLUX_MAX + ')';
  const over = m.flux - FLUX_MAX, all = m.flux; m.flux = 0; m.lockRound = cb.round;
  emitFx(cb, 'overload', { unit: u.id, at: u.pos }); shiftMana(cb, all, 'an Evoker overloads');
  const r = applyDamage(cb, u, 10 * over, { type: 'overload', shield: true, credit: 'none' }); if (u.hp === 0) fxFell(cb, u);
  return ' · OVERLOAD: the Evoker bursts (' + r.amount + ' damage to ' + u.name + '), locked until next round';
}
// ---------- the Emanator (Soul classes) ----------
function soulReady(h: Holder): string | null {
  const u = h.u, m = u?.mg; if (!u) return 'Only in the field.';
  if (!m) return 'You have no Soul magic (an Emanator, or Outbursts drawn from the air).';
  if (u.dead || u.downed) return 'Downed.';
  if (condOn(u, 'silenced')) return 'Silenced: no magic this round.';
  if (m.held) return 'You are holding an Outburst: release it first.';
  return null;
}
/** A class move cast like an Outburst (Soul cast AP, school base cost × the air × your saving, +20% under a Right Brain
 * Debuff), priced through 'outburst_cost' so items see it (a synthetic design: id "class:<move>"). */
function soulPrice(h: Holder, school: string, baseMp: number, extraStrain = 0): { mp: number; ap: number; range: number; strain: number } {
  const u = h.u!, m = u.mg!, cb = h.cb!;
  const d: any = { id: 'class:' + h.itemId, name: h.info.name, school, modules: [] };
  const mp0 = Math.max(5, Math.round(baseMp * manaBand(manaOf(cb)).soul_cost_mult * (1 - (m.costSave || 0)))) * (condOn(u, 'rdebuff') ? 1.2 : 1);
  const oc: any = emit(cb, 'outburst_cost', { u, design: d, mp: mp0, ap: Math.max(1, m.soulAp || 2), range: SOUL_REACH + (m.soulRange || 0), strain: (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) + (m.emanator ? 0 : 2) + extraStrain, hp: 0, release: true, preview: true, cb, classMove: true });
  return { mp: Math.max(0, Math.round(oc.mp)), ap: Math.max(0, oc.ap), range: oc.range, strain: Math.max(0, oc.strain) };
}
/** Pay a Soul cast: MP (or nothing from the air without an Emanator), the meter drops MP ÷ 10, Strain (and the Mana
 * Short past the limit: the same rule as magic.ts manaShort). */
function soulPay(h: Holder, rng: Rng, p: { mp: number; strain: number }): string {
  const u = h.u!, m = u.mg!, cb = h.cb!;
  if (m.emanator) m.mp -= p.mp; m.cast = true;
  shiftMana(cb, -Math.ceil(p.mp / 10));
  return strainUp(cb, rng, u, p.strain);
}
// Rules 1.5: the engine's addStrain (the 'strain' hook, the automatic Mana Short at 3 over, no roll).
function strainUp(cb: Combat, rng: Rng, u: Unit, n: number): string {
  const m = u.mg; if (!m || n <= 0) return '';
  const out = addStrain(cb, rng, u, n, 'class cast');
  return out || ' · Strain ' + m.strain + '/' + m.strainLimit;
}
const soulAim = (h: Holder, tile: string, range: number): string | null => {
  const u = h.u!, cb = h.cb!;
  if (dist(u.pos, tile) > range) return 'Out of reach (' + range + ' tiles).';
  if (tile !== u.pos && !lineOfSight(cb, u.pos, tile)) return 'No line of sight.';
  return null;
};
const around = (k: string, r: number) => { const [x, y] = xy(k), out: string[] = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push(key(x + i, y + j)); return out; };

/** The fight's view of a class resource; on the story side the character's (Supplies, toxins persist). */
function storyRes(c: Character, id: string): number {
  const r = classResources(c).find((x) => x.id === id); if (!r) return 0;
  return Math.min(r.max, c.res?.[id] ?? r.max);
}
function spendStoryRes(c: Character, id: string): boolean { const n = storyRes(c, id); if (n < 1) return false; (c.res ||= {})[id] = n - 1; return true; }

// ======================================================================================================== MARKSMAN
// Heat (the class resource) is the shared gun rule (lane 0B: bows build none; Recoil applies; jams at the limit).

// ---------- Fire Discipline (rank I, passive) ----------
// Aimed shots add no Heat. Once per turn a Burst costs 2 AP, not 3. With a bow an Aimed shot is +3 to hit, not +2.
register({
  id: 'marksman.fire_discipline', claims: 'all',
  on: {
    // resolveAttack adds +1 Heat to every gun shot after the die: take it off first, so the jam check sees the net.
    attack_roll: (ctx, h) => { if (ctx.att !== h.u || ctx.mode !== 'aimed') return; const w = WEAPON[h.u!.weapon]; if (w?.heat_limit && !isMelee(w)) h.u!.heat -= 1; },
    attack_preview: (ctx, h) => {
      if (ctx.att !== h.u) return;
      const w: any = WEAPON[h.u!.weapon];
      if (ctx.mode === 'burst' && uses(h).left('per_turn', 1, h.key + '#burst') > 0) ctx.ap = Math.min(ctx.ap, 2);
      if (ctx.mode === 'aimed' && /bow/.test(w?.category || '')) ctx.terms.push({ v: 1, label: 'Fire Discipline (bow)' });
    },
    // fireBurst spends the preview's AP (2): the burst's first round spends the once-a-turn use.
    attack_target: (ctx, h) => {
      if (ctx.att !== h.u || ctx.volley !== 'burst' || ctx.vi !== 0 || !h.cb) return;
      if (uses(h).take('per_turn', 1, h.key + '#burst')) h.cb.log.push(h.u!.name + ': Fire Discipline, the burst costs 2 AP.');
    },
  },
  brief: () => null,
});

// ---------- Special Ammo (rank II) ----------
// One magazine (or a quiver of 12 arrows, PROVISIONAL) each of armour-piercing, hollow-point and incendiary, restocked
// at rest (one of each, never stockpiled). Switching type is part of a reload (the reload's AP, no extra cost). Weapons
// with no magazine (flamers, launchers) aren't eligible (PROVISIONAL). The rounds' effects are the shared ammo types
// (rules.json ammo_types: AP ignores armour at ×0.8, hollow-point ×1.3 with armour doubled, incendiary Burning at ×0.9).
const SPECIAL = [['armor_piercing', 'armour-piercing'], ['hollow_point', 'hollow-point'], ['incendiary', 'incendiary']] as const;
export const QUIVER = 12;
/** A Drawn weapon (a bow) has a quiver, and a quiver can't be refilled in a fight (rules 1.12, Weapons 10). */
const isDrawn = (wid: string | null | undefined) => !!wid && weaponProps(wid).includes('drawn');
const QUIVER_WHY = 'A quiver is filled before the fight.';
const ammoOk = (wid: string): string | null => { const w = WEAPON[wid]; if (!w || isMelee(w)) return 'Your weapon takes no rounds.'; if (w.magazine == null || /flame|launcher|thrown/.test(w.category) || !w.ammo) return 'No special rounds for this weapon.'; return null; };
register({
  id: 'marksman.special_ammo', claims: 'all',
  actions: [
    ...SPECIAL.map(([id, name]): ActionDef => ({
      id: 'load_' + id, label: 'Load ' + name, scope: ['combat'], target: 'none', ap: (h) => (h.u ? reloadAp(h.u) : 2),
      text: 'Reload with your ' + name + ' ' + 'magazine (restocked at rest).',
      available: (h) => { if (!h.u) return false; const e = ammoOk(h.u.weapon) || (isDrawn(h.u.weapon) ? QUIVER_WHY : null); if (e) return e; if (uses(h).left('per_rest', 1, h.key + '#' + id) <= 0) return 'Spent: restocked at the next rest.'; return true; },
      run: (h) => {
        const u = h.u!, cb = h.cb!, w = WEAPON[u.weapon]!; uses(h).take('per_rest', 1, h.key + '#' + id);
        // The magazine in the gun goes back to the pouch (a partly spent standard one keeps its rounds; a spent special one is dropped).
        const was = u.ammo, wasType = u.ammoType || null;
        if (w.reload === 'loose') { if (!wasType) u.loose = (u.loose || 0) + was; u.ammo = Math.min(w.magazine!, QUIVER); }
        else { if (u.mags && !wasType && was > 0) u.mags.push(was); u.ammo = w.magazine!; }
        u.ammoType = id; u.jammed = false; stateOf(h).special = id;
        emit(cb, 'reload', { u, ap: 0, cb, special: id });
        emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: w.reload === 'loose' ? 'loose' : 'mag', dur: 1200 });
        say(cb, u.name + ' loads ' + name + ' rounds (' + u.ammo + ').');
      },
    })),
    ...SPECIAL.map(([id, name]): ActionDef => ({
      id: 'story_' + id, label: 'Load ' + name, scope: ['story'], target: 'none', ap: 0,
      available: (h) => { if (!h.c) return false; const e = ammoOk(h.c.weapon); if (e) return e; if (uses(h).left('per_rest', 1, h.key + '#' + id) <= 0) return 'Spent: restocked at the next rest.'; return true; },
      run: (h) => {
        const c = h.c!, w = WEAPON[c.weapon]!; uses(h).take('per_rest', 1, h.key + '#' + id);
        // A Drawn weapon's arrows are its quiver (Physical 2.0, rules 1.12: physical/ranged/quiver.ts): what it held goes
        // back to the pack, and the quiver is the special arrows, typed (review fix: c.loadedType alone was lost).
        if (isDrawn(c.weapon)) { loadQuiverWith(c, c.weapon, {}); c.loaded = Math.min(w.magazine!, QUIVER); c.loadedType = null; ensurePhys(c).quiver[c.weapon] = { [id]: c.loaded }; postStory(h, c.name + ' fills the quiver with ' + name + ' arrows.'); return; }
        c.loaded = w.reload === 'loose' ? Math.min(w.magazine!, QUIVER) : w.magazine!; c.loadedType = id; postStory(h, c.name + ' loads ' + name + ' rounds.');
      },
    })),
  ],
  on: {
    // A normal reload after the special magazine: standard rounds again.
    reload: (ctx, h) => { if (ctx.u !== h.u || ctx.special || ctx.hand === 'off') return; /* the off-hand gun's reload leaves the main gun's rounds alone */ const u = h.u!, w = WEAPON[u.weapon]; if (!u.ammoType || !stateOf(h).special) return;
      if (w?.reload === 'loose' ? (u.loose || 0) > 0 : (u.mags || []).some((n) => n > 0)) { u.ammoType = null; stateOf(h).special = null; } },
  },
  brief: () => null,
});

// ---------- Killzone (rank III) ----------
// Hold two Overwatch shots (twice the shot's AP): one each at the first two different enemies that move into your line,
// both at +2 to hit (only these double holds, PROVISIONAL). The two shots spend one reaction between them (PROVISIONAL).
const kzOf = (h: Holder) => stateOf(h).kz as undefined | { left: number; hit: string[]; mode: 'shot' | 'aimed'; firing?: string | null };
register({
  id: 'marksman.killzone', claims: 'all',
  actions: (['shot', 'aimed'] as const).map((mode): ActionDef => ({
    id: 'overwatch_double' + (mode === 'aimed' ? '_aimed' : ''), label: 'Killzone' + (mode === 'aimed' ? ' (aimed)' : ''), scope: ['combat'], target: 'none',
    ap: (h) => (h.u ? 2 * attackApCost(WEAPON[h.u.weapon], mode) : 4),
    text: 'Hold two ' + (mode === 'aimed' ? 'aimed ' : '') + 'overwatch shots: one each at the first two enemies that move into your line, both +2 to hit.',
    available: (h) => { const u = h.u; if (!u) return false; const w = WEAPON[u.weapon]; if (!w || isMelee(w)) return 'Killzone needs a ranged weapon.'; if (u.overwatch) return 'Already on overwatch.'; if (isPressed(u)) return 'You are Pressed: you can\'t hold a shot.'; return true; },
    run: (h) => { const u = h.u!; u.overwatch = mode; u.owShots = 1; stateOf(h).kz = { left: 2, hit: [], mode, firing: null }; emitFx(h.cb!, 'stance', { unit: u.id, at: u.pos, what: 'overwatch' }); say(h.cb, u.name + ' sets a killzone: two shots held.'); },
  })),
  on: {
    turn_start: (ctx, h) => { if (ctx.u === h.u) delete stateOf(h).kz; },
    reaction_window: (ctx, h) => {
      const kz = kzOf(h); if (!kz || ctx.reactor !== h.u || ctx.kind !== 'overwatch') return;
      if (kz.hit.includes(ctx.mover.id) || kz.left <= 0) { ctx.cancel = true; return; }
      kz.hit.push(ctx.mover.id); kz.left--; kz.firing = ctx.mover.id; h.u!.owShots = 1;
    },
    attack_preview: (ctx, h) => { const kz = kzOf(h); if (kz?.firing && ctx.att === h.u && ctx.tgt?.id === kz.firing) ctx.terms.push({ v: 2, label: 'Killzone' }); },
    // The shot is rolled: the second one stays held for the next enemy (the reaction it took is given back once).
    attack_roll: (ctx, h) => {
      const kz = kzOf(h); if (!kz?.firing || ctx.att !== h.u) return;
      kz.firing = null;
      if (kz.left > 0) { h.u!.overwatch = kz.mode; h.u!.owShots = 1; if (kz.left === 1 && h.cb) refundReaction(h.cb, h.u!); }
    },
  },
  brief: () => null,
});

// ======================================================================================================== FIGHTER
// Momentum (0-5): +1 per melee hit (combat.ts), reset after a turn with no attack (closeTurn) and after the fight (units
// are rebuilt). Lunge's handler adds the other half: +1 per tile closed on the target since the turn began, counted at
// the first melee attack, at most +2 a turn (PROVISIONAL reading of "toward a target"); Lunge's own tiles don't count.
const reachOf = (u: Unit) => { const w: any = WEAPON[u.weapon]; if (!w || !isMelee(w)) return 1; return (w.properties || []).includes('reach_2') || w.id === 'lance' || w.grants?.effect?.op === 'reach' ? (w.grants?.effect?.op === 'reach' ? w.grants.effect.value : 2) : 1; };
const meleeAp = (u: Unit) => attackApCost(isMelee(WEAPON[u.weapon]) ? WEAPON[u.weapon] : WEAPON.fists, 'melee');
/** Where to stand for a Lunge on t: the reachable tile within 2 (path) in melee reach of t, the shortest walk first. */
function lungeTile(cb: Combat, u: Unit, t: Unit): string | null {
  const P = paths(cb, u.pos, u.id), r = reachOf(u);
  if (dist(u.pos, t.pos) <= r) return u.pos;
  const eu = (k: string) => { const [x, y] = xy(k), [tx, ty] = xy(t.pos); return Math.hypot(x - tx, y - ty); };
  const opts = Object.entries(P.dist).filter(([k, n]) => (n as number) <= 2 && k !== u.pos && dist(k, t.pos) <= r && !cb.units.some((v) => !v.dead && v.pos === k)).sort((a, b) => (a[1] as number) - (b[1] as number) || eu(a[0]) - eu(b[0]) || a[0].localeCompare(b[0]));
  return opts.length ? opts[0][0] : null;
}
let lunging: Unit | null = null;
register({
  id: 'fighter.lunge', claims: 'all',
  actions: [{
    id: 'lunge', label: 'Lunge', scope: ['combat'], target: 'enemy', ap: (h) => (h.u ? meleeAp(h.u) : 2),
    text: 'Spend 1 Momentum: move up to 2 tiles and strike in one action (the strike\'s AP; the move provokes no opportunity attacks).',
    available: (h) => { const u = h.u; if (!u) return false; if (resOf(u, 'momentum') < 1) return 'Needs 1 Momentum (melee hits and closing in earn it).'; return true; },
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {};
      const at = lungeTile(cb, u, t); if (!at) return { ok: false, why: 'No tile within 2 puts you in reach.' };
      return { tiles: [at], lines: ['Lunge to ' + refOf(at) + ' and strike ' + t.name + ' (' + meleeAp(u) + ' AP, 1 Momentum).'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, at = lungeTile(cb, u, t); if (!at) return 'No tile within 2 puts you in reach.';
      resSpend(u, 'momentum', 1); const st = stateOf(h); st.lungeFrom = u.pos;
      if (at !== u.pos) { lunging = u; try { const e = moveUnit(cb, u, at, rng as Rng, 'move'); if (e) { resGain(u, 'momentum', 1); return e; } } finally { lunging = null; } }
      if (u.dead || u.downed || t.dead) return null;
      resolveAttack(cb, rng as Rng, u, t, 'melee', null, { noAp: true }); delete st.lungeFrom; checkOver(cb);
    },
  }],
  on: {
    move_cost: (ctx, h) => { if (ctx.u === h.u && lunging === h.u) { ctx.ap = 0; ctx.free = true; ctx.skipOA = true; } },
    turn_start: (ctx, h) => { if (ctx.u !== h.u) return; const st = stateOf(h); st.start = h.u!.pos; st.closed = false; },
    attack_target: (ctx, h) => {
      const u = h.u!; if (ctx.att !== u || !myTurn(h) || u.resMax?.momentum == null) return;
      const melee = ctx.mode === 'melee' || isMelee(WEAPON[u.weapon]); if (!melee) return;
      const st = stateOf(h); if (st.closed || !st.start) return; st.closed = true;
      const from = st.lungeFrom || u.pos, n = Math.min(2, Math.max(0, dist(st.start, ctx.tgt.pos) - dist(from, ctx.tgt.pos)));
      if (n > 0) { const got = resGain(u, 'momentum', n); if (got) say(h.cb, u.name + ' closes in: +' + got + ' Momentum (' + resOf(u, 'momentum') + ').'); }
    },
  },
  brief: () => null,
});

// ---------- Riposte (rank II, reaction) ----------
// A melee attack against you misses (a fumble counts): spend 1 Momentum for a 0-AP melee strike back with your Counter
// bonus to hit. Uses your reaction; a riposte never triggers a riposte (PROVISIONAL). Policy: on (default) or off.
let riposting = false;
register({
  id: 'fighter.riposte', claims: 'all',
  actions: [policyAction('off', 'Riposte off', 'off', 'No automatic Ripostes for the rest of this fight.'), policyAction('on', 'Riposte on', 'auto', 'Riposte every melee miss you can (the default).')],
  on: {
    on_miss: (ctx, h) => {
      const u = h.u!, cb = h.cb!; if (!ctx.melee || ctx.tgt !== u || riposting || !foeOf(ctx.att, u)) return;
      if (policy(h, 'auto') === 'off') return;
      if (!alive(u) || resOf(u, 'momentum') < 1 || !canReact(cb, u) || dist(u.pos, ctx.att.pos) > reachOf(u) || !alive(ctx.att)) return;
      if (!previewAttack(cb, u, ctx.att, 'melee', { free: true, extra: u.counter || 0 }).ok) return;
      resSpend(u, 'momentum', 1); useReaction(cb, u); say(cb, u.name + ' ripostes (1 Momentum).');
      riposting = true; try { resolveAttack(cb, rngOf(h, ctx), u, ctx.att, 'melee', null, { noAp: true, extra: u.counter || 0 }); } finally { riposting = false; }
      checkOver(cb);
    },
  },
  brief: () => null,
});

// ---------- Finisher (rank III, 3 AP) ----------
// Spend all your Momentum (at least 1) on one melee strike: +20% damage per point, up to +100%. Momentum is spent even
// on a miss; a hit then earns the usual +1.
let finishing: { u: Unit; n: number } | null = null;
register({
  id: 'fighter.finisher', claims: 'all',
  actions: [{
    id: 'finisher', label: 'Finisher', scope: ['combat'], target: 'enemy', ap: 3,
    available: (h) => (h.u ? (resOf(h.u, 'momentum') < 1 ? 'Needs at least 1 Momentum.' : true) : false),
    preview: (h, args) => { const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {}; if (dist(u.pos, t.pos) > reachOf(u)) return { ok: false, why: 'Out of melee reach.' };
      const pv = previewAttack(cb, u, t, 'melee', { free: true }); if (!pv.ok) return { ok: false, why: pv.why };
      const n = Math.min(5, resOf(u, 'momentum')); return { lines: ['Finisher: ' + n + ' Momentum, +' + 20 * n + '% damage, ' + pv.pct + '% to hit.'] }; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, n = Math.min(5, resOf(u, 'momentum'));
      u.res!.momentum = 0; say(cb, u.name + ' spends ' + n + ' Momentum on a Finisher.');
      finishing = { u, n }; try { resolveAttack(cb, rng as Rng, u, t, 'melee', null, { noAp: true }); } finally { finishing = null; }
      checkOver(cb);
    },
  }],
  on: { damage_out: (ctx, h) => { if (finishing && finishing.u === h.u && ctx.att === h.u) ctx.mults.push({ v: 1 + 0.2 * finishing.n, label: 'Finisher' }); } },
  brief: () => null,
});

// ======================================================================================================== DEFENDER
// Guard (0-5, lost after the fight) is gained by Brace. Interpose (Brace's handler, a reaction, 0 AP, while you hold
// Guard): an adjacent ally is hit by a weapon attack: spend 1 Guard and take the hit instead (your armour, shield and
// Reactive Plate apply; the attack's critical injury lands on the Defender too: the 'injury' hook). Policy:
// auto (default), only when the hit would Down the ally, or off.

// ---------- Brace (rank I, 2 AP; shown as "Brace (Hold the Line)": the base weapon Brace is a different action) ----------
// Guard + 1 + Durability modifier (at least 1, PROVISIONAL; max 5 in all), Braced: +2 Defense until you move (or are
// pushed, shoved or knocked prone). It also counts as the base weapon Brace (u.braced).
const braceSync = (h: Holder) => { const u = h.u; if (!u) return; const st = stateOf(h); if (st.braceDef && (!u.braced || u.prone)) { st.braceDef = false; u.def -= 2; u.braced = false; } };
let interposing = false;
/** The ally an Interpose just covered (the same attack's injury follows the hit to the Defender). */
let interposed: { t: string; me: string } | null = null;
register({
  id: 'defender.brace', claims: 'all',
  actions: [
    {
      id: 'brace', label: 'Brace (Hold the Line)', scope: ['combat'], target: 'none', ap: 2,
      text: 'Gain Guard 1 + your Durability modifier (at least 1, max 5) and become Braced (+2 Defense) until you move. Interpose while you hold Guard.',
      available: (h) => (h.u ? true : false),
      run: (h) => {
        const u = h.u!, st = stateOf(h), c = h.c, n = Math.max(1, 1 + mod(c?.skills.durability || 0)), got = resGain(u, 'guard', n);
        u.braced = true; if (!st.braceDef) { st.braceDef = true; u.def += 2; }
        emitFx(h.cb!, 'stance', { unit: u.id, at: u.pos, what: 'brace' });
        say(h.cb, u.name + ' braces and holds the line: +' + got + ' Guard (' + resOf(u, 'guard') + '), +2 Defense until they move.');
        emit(h.cb!, 'braced', { u, cb: h.cb }); // 'braced' {u}: the Defender's Brace landed (Adamantile Knight's Bulwark of Will)
      },
    },
    policyAction('interpose_auto', 'Interpose on every hit', 'auto', 'Interpose whenever an adjacent ally is hit and you hold Guard (the default).'),
    policyAction('interpose_down', 'Interpose only to save a Downed ally', 'down', 'Interpose only when the hit would Down the ally.'),
    policyAction('interpose_off', 'Interpose off', 'off', 'Never Interpose this fight.'),
  ],
  on: {
    moved: (ctx, h) => { if (ctx.u === h.u) braceSync(h); },
    forced_move: (ctx, h) => { if (ctx.u === h.u && !ctx.cancel) { h.u!.braced = false; braceSync(h); } },
    cond_landed: (ctx, h) => { if (ctx.t === h.u && ctx.id === 'prone') braceSync(h); },
    turn_start: (ctx, h) => { if (ctx.u === h.u) braceSync(h); },
    attack_preview: (ctx, h) => { if (ctx.tgt === h.u) braceSync(h); },
    damage_in: (ctx, h) => {
      const me = h.u!, cb = h.cb!, t: Unit = ctx.t, src = ctx.src;
      if (ctx.phase !== 'reduce' || interposing || t === me || t.side !== me.side || src?.type !== 'weapon' || !src.by || !foeOf(src.by, t)) return;
      if (!alive(me) || dist(me.pos, t.pos) > 1 || resOf(me, 'guard') < 1 || !canReact(cb, me) || ctx.dmg <= 0) return;
      if (statQuery({ u: t }, 'prey_lock', { by: src.by }).add > 0) return; // Rabbit's Foot: a hunter's or Ork's blow stays on its prey
      const pol = policy(h, 'auto');
      if (pol === 'off' || (pol === 'down' && ctx.dmg < t.hp + (t.shield || 0))) return;
      resSpend(me, 'guard', 1); useReaction(cb, me);
      const d = attackDamage(cb, src.by, me, src.mode || 'shot', charOfUnit(src.by), { crit: !!src.crit, preview: true, ambush: !!src.ambush });
      const dmg = Math.max(1, Math.floor(d.total) - d.armour);
      ctx.dmg = 0;
      interposing = true; let r; try { r = applyDamage(cb, me, dmg, { ...src, shield: true, interposed: true } as any); } finally { interposing = false; }
      emitFx(cb, 'shove', { unit: me.id, target: t.id, from: me.pos, to: me.pos, ok: true, interpose: true });
      say(cb, me.name + ' interposes for ' + t.name + ' (1 Guard, ' + resOf(me, 'guard') + ' left) and takes ' + r.amount + ' damage' + (me.hp === 0 ? ' · Downed' : '') + '.');
      if (me.hp === 0) fxFell(cb, me);
      interposed = { t: t.id, me: me.id };
    },
    // The hit's critical injury goes to the Defender who took it, not the ally (audit problem 3, PROVISIONAL).
    injury: (ctx, h) => {
      const ip = interposed; if (!ip || ctx.t?.id !== ip.t || ip.me !== h.u?.id || ctx.cancel) return; interposed = null;
      ctx.cancel = true; const me = h.u!, cb: Combat = ctx.cb;
      if (!me.dead && !me.downed) say(cb, 'The blow\'s injury lands on ' + me.name + ' (Interpose)' + rollInjury(ctx.rng, me, cb, ctx.by || null) + '.');
    },
    on_hit: () => { interposed = null; }, on_miss: () => { interposed = null; },
  },
  brief: () => null,
});

// ---------- Draw Fire (rank II, 1 AP) ----------
// Spend 1 Guard: an enemy you can see is Taunted (no save; it costs Guard, PROVISIONAL): on its next turn it must attack
// you if it can, else it takes −2 to hit anyone else. Bosses and Celestials choose freely, at −2 against anyone else.
register({
  id: 'defender.draw_fire', claims: 'all',
  actions: [{
    id: 'draw_fire', label: 'Draw Fire', scope: ['combat'], target: 'enemy', ap: 1,
    available: (h) => (h.u ? (resOf(h.u, 'guard') < 1 ? 'Needs 1 Guard (Brace first).' : true) : false),
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (t && !sideSees(h.cb!, h.u!.side, t)) return { ok: false, why: 'You can\'t see them.' }; return {}; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!; resSpend(u, 'guard', 1);
      if (isBoss(t)) { (stateOf(h).boss ||= {})[t.id] = true; say(cb, u.name + ' draws ' + t.name + '\'s fire: −2 to hit anyone else on its next turn (it chooses freely).'); return; }
      say(cb, u.name + ' draws ' + t.name + '\'s fire' + applyCond(cb, rng as Rng, u, t, 'taunted', 1, undefined, { skipSave: true }) + '.');
    },
  }],
  on: {
    attack_preview: (ctx, h) => {
      const me = h.u!, a: Unit = ctx.att; if (ctx.tgt === me || a.side === me.side) return;
      if (condSource(a, 'taunted') === me.id || stateOf(h).boss?.[a.id]) ctx.terms.push({ v: -2, label: 'Taunted by ' + me.name });
    },
    turn_end: (ctx, h) => { const b = stateOf(h).boss; if (b && b[ctx.u.id]) delete b[ctx.u.id]; },
  },
  brief: () => 'Celestials (Narrator-run) honour the −2 against anyone but the Defender.',
});

// ---------- Reactive Plate (rank III, passive; no reaction, PROVISIONAL) ----------
// When you take damage, spend Guard: each point cuts it by 10 (down to 0), after armour and before the shield. Every 3
// Guard lost this way sheds bots: the meter +2. Policy: spend what it takes (default), keep 1 Guard for Interpose, off.
register({
  id: 'defender.reactive_plate', claims: 'all',
  actions: [
    policyAction('plate_all', 'Reactive Plate: spend what it takes', 'auto', 'The plate spends as much Guard as the hit needs (the default).'),
    policyAction('plate_keep1', 'Reactive Plate: keep 1 Guard', 'keep1', 'The plate never spends your last Guard (kept for Interpose).'),
    policyAction('plate_off', 'Reactive Plate: off', 'off', 'The plate spends no Guard this fight.'),
  ],
  on: {
    damage_in: (ctx, h) => {
      const me = h.u!, cb = h.cb!; if (ctx.phase !== 'reduce' || ctx.t !== me || ctx.dmg <= 0) return;
      const pol = policy(h, 'auto'); if (pol === 'off') return;
      const have = resOf(me, 'guard') - (pol === 'keep1' ? 1 : 0); if (have <= 0) return;
      const k = Math.min(have, Math.ceil(ctx.dmg / 10)); if (k <= 0) return;
      resSpend(me, 'guard', k); const was = ctx.dmg; ctx.dmg = Math.max(0, ctx.dmg - 10 * k);
      const st = stateOf(h); st.lost = (st.lost || 0) + k;
      let shed = 0; while (st.lost >= 3) { st.lost -= 3; shed += 2; }
      say(cb, me.name + '\'s plate hardens: ' + k + ' Guard, ' + (was - ctx.dmg) + ' damage stopped.');
      if (shed) shiftMana(cb, shed, 'reactive plate sheds bots');
      emit(cb, 'plate_spent', { u: me, k, cb }); // 'plate_spent' {u, k}: Guard the plate spent (Adamantile Plate's ally shield)
    },
  },
  brief: () => null,
});

// ======================================================================================================== MEDIC
// Supplies (3 + floor(Proficiency ÷ 2)) persist between fights and refill at a long rest (lane 0B).

// ---------- Triage (rank I, 2 AP) ----------
// Heal an adjacent ally 20 × your Healing given multiplier and end their Bleeding; no Supplies. GAMEBREAKING at will:
// PROVISIONAL once per target per turn in a fight, once per ally per scene out of one. Stabilise a Downed ally for 1 AP
// without a stim (that is the point of the move; the base 1-AP Medic stim stays).
const healMultOf = (h: Holder) => (h.c ? healingMult(h.c) : h.u?.mg?.healMult || 1);
function mostHurt(h: Holder): Character | null {
  const all: Character[] = Object.values(h.g?.characters || {});
  return all.filter((c) => !c.dead && c.id !== h.c?.id && c.hp < maxHp(c)).sort((a, b) => a.hp / maxHp(a) - b.hp / maxHp(b))[0] || null;
}
/** Triage's limit: once per ally per turn in a fight; on the area map (out of a fight) once per ally per scene, the
 * same count as the story Triage (spec I12). */
const triPer = (h: Holder) => (h.cb && (h.cb.overworld || h.cb.name === 'overworld') ? 'per_scene' as const : 'per_turn' as const);
const triKey = (h: Holder, t: Unit) => h.key + '#' + (triPer(h) === 'per_scene' ? t.charId || t.id : t.id);
function storyHeal(h: Holder, t: Character, n: number): number { const was = t.hp; t.hp = Math.min(maxHp(t), t.hp + Math.floor(n)); return t.hp - was; }
register({
  id: 'medic.triage', claims: 'all',
  actions: [
    {
      id: 'triage', label: 'Triage', scope: ['combat', 'world'], target: 'ally', ap: 2, range: 1,
      text: 'Heal an adjacent ally 20 × your Healing given and end their Bleeding (once per ally per turn; out of a fight once per ally per scene). No Supplies.',
      preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (!t) return {}; if (t === h.u) return { ok: false, why: 'Triage an ally, not yourself.' }; if (t.downed) return { ok: false, why: 'Downed: Stabilise them (1 AP).' }; if (uses(h).left(triPer(h), 1, triKey(h, t)) <= 0) return { ok: false, why: triPer(h) === 'per_scene' ? 'Already treated this scene.' : 'Already treated this turn.' };
        return { lines: ['Heal ' + t.name + ' about ' + Math.floor(20 * healMultOf(h) * (t.healRecv || 1)) + (t.bleed ? ' and stop the bleeding.' : '.')] }; },
      run: (h, args) => {
        const cb = h.cb!, t = unitById(cb, args.targetId)!; if (t === h.u) return 'Triage an ally, not yourself.';
        if (!uses(h).take(triPer(h), 1, triKey(h, t))) return triPer(h) === 'per_scene' ? 'Already treated this scene.' : 'Already treated this turn.';
        const r = healUnit(cb, t, 20 * healMultOf(h), h.u!, 'triage'), bled = !!t.bleed; endCond(t, 'bleeding', cb);
        emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: r.restored });
        say(cb, h.u!.name + ' triages ' + t.name + ': +' + r.restored + ' HP' + (bled ? ', bleeding stopped' : '') + '.');
      },
    },
    {
      id: 'stabilise', label: 'Stabilise (Triage)', scope: ['combat', 'world'], target: 'ally', ap: 1, range: 1,
      text: 'Stabilise a Downed ally next to you at 1 HP, no stim needed.',
      preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (t && !t.downed) return { ok: false, why: t.name + ' isn\'t Downed.' }; return {}; },
      run: (h, args) => { const cb = h.cb!, t = unitById(cb, args.targetId)!; healUnit(cb, t, 1, h.u!, 'stabilise'); t.bleed = 0; emitFx(cb, 'stim', { unit: h.u!.id, target: t.id, from: h.u!.pos, to: t.pos }); say(cb, h.u!.name + ' stabilises ' + t.name + ' at 1 HP.'); },
    },
    {
      id: 'triage_story', label: 'Triage', scope: ['story'], target: 'none', ap: 0,
      text: 'Patch up an ally (named in what you say, else the most hurt): 20 × your Healing given, once per ally per scene.',
      available: (h) => (mostHurt(h) ? true : 'Nobody is hurt.'),
      run: (h, args) => {
        const t = charNamed(h, args) || mostHurt(h); if (!t) return 'Nobody is hurt.';
        if (t.id === h.c?.id) return 'Triage an ally, not yourself.';
        if (t.hp <= 0) return t.name + ' is Downed: the Narrator rules the treatment (or stim them).';
        if (!uses(h).take('per_scene', 1, h.key + '#' + t.id)) return t.name + ' was already treated this scene.';
        const n = storyHeal(h, t, 20 * healMultOf(h)); postStory(h, h.c!.name + ' triages ' + t.name + ': +' + n + ' HP (' + t.hp + '/' + maxHp(t) + ').');
      },
    },
  ],
  brief: () => null,
});

// ---------- Stim Throw (rank II, 1 AP) ----------
// Spend 1 Supply: an ally within 4 tiles you can see heals 30 × your Healing given and stops Bleeding; a Downed ally is
// stabilised at 1 HP instead (PROVISIONAL; needs sight, ignores the throwing range).
register({
  id: 'medic.stim_throw', claims: 'all',
  actions: [{
    id: 'stim_throw', label: 'Stim Throw', scope: ['combat', 'world'], target: 'ally', ap: 1, range: 4, needsSight: true,
    available: (h) => (h.u ? (resOf(h.u, 'supplies') < 1 ? 'No Supplies left (restocked at rest).' : true) : false),
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (t && t !== h.u && !unitSees(h.cb!, h.u!, t.pos)) return { ok: false, why: 'You can\'t see them.' }; return {}; },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!; resSpend(u, 'supplies', 1);
      emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos });
      if (t.downed) { healUnit(cb, t, 1, u, 'stim'); t.bleed = 0; say(cb, u.name + ' throws a stim to ' + t.name + ': stabilised at 1 HP (' + resOf(u, 'supplies') + ' Supplies left).'); return; }
      const r = healUnit(cb, t, 30 * healMultOf(h), u, 'stim'), bled = !!t.bleed; endCond(t, 'bleeding', cb);
      say(cb, u.name + ' throws a stim to ' + t.name + ': +' + r.restored + ' HP' + (bled ? ', bleeding stopped' : '') + ' (' + resOf(u, 'supplies') + ' Supplies left).');
    },
  }],
  brief: () => null,
});

// ---------- Field Surgery (rank III, out of combat) ----------
// Spend 1 Supply: treat one arm or leg injury, OR clear every Body condition the ally carries (choose one; the data's
// both-at-once is the bug, PROVISIONAL). Robot medics repair machines the same way: the Narrator rules which.
const surgeryTarget = (h: Holder, args: ActionArgs) => charNamed(h, args) || h.c || null;
register({
  id: 'medic.field_surgery', claims: 'all',
  actions: [
    {
      id: 'injury', label: 'Field Surgery: treat an injury', scope: ['story', 'world'], target: 'none', ap: 0,
      text: 'Out of combat, 1 Supply: treat one arm or leg injury of an ally (named in what you say, else yourself).',
      available: (h) => (h.c ? (storyRes(h.c, 'supplies') < 1 ? 'No Supplies left (restocked at rest).' : true) : false),
      run: (h, args) => {
        const t = surgeryTarget(h, args); if (!t) return 'Name who you treat.';
        const i = (t.injuries || []).findIndex((x) => x.loc === 'arm' || x.loc === 'leg'); if (i < 0) return t.name + ' has no arm or leg injury.';
        if (!spendStoryRes(h.c!, 'supplies')) return 'No Supplies left.';
        const [inj] = t.injuries!.splice(i, 1);
        postStory(h, h.c!.name + ' performs field surgery on ' + t.name + ': the ' + (inj.side ? inj.side + ' ' : '') + inj.loc + ' is treated (' + storyRes(h.c!, 'supplies') + ' Supplies left).');
      },
    },
    {
      id: 'conditions', label: 'Field Surgery: clear Body conditions', scope: ['story', 'world'], target: 'none', ap: 0,
      text: 'Out of combat, 1 Supply: clear every Body condition an ally carries (named in what you say, else yourself).',
      available: (h) => (h.c ? (storyRes(h.c, 'supplies') < 1 ? 'No Supplies left (restocked at rest).' : true) : false),
      run: (h, args) => {
        const t = surgeryTarget(h, args); if (!t) return 'Name who you treat.';
        const body = (t.persistentConds || []).filter((x) => condFamily(x.id) === 'body');
        if (!spendStoryRes(h.c!, 'supplies')) return 'No Supplies left.';
        t.persistentConds = (t.persistentConds || []).filter((x) => condFamily(x.id) !== 'body');
        const g = h.g; if (g?.story?.scene?.npcConds?.[t.id]) delete g.story.scene.npcConds[t.id];
        postStory(h, h.c!.name + ' works on ' + t.name + ': ' + (body.length ? body.map((x) => x.id).join(', ') + ' cleared' : 'no lasting Body conditions, but they are seen to') + '.');
        if (/robot|machine|drone/i.test(String(args.text || ''))) pendRuling(g, h.c!, h.key, 'Field Surgery on a machine: rule whether this robot or device counts and what it repairs.');
      },
    },
  ],
  brief: () => 'Robot medics repairing machines: the Narrator rules which machines count.',
});

// ======================================================================================================== ASSASSIN
// Marks: at most 3 enemies Marked by you at once (a 4th Mark lifts the oldest). Marked lasts until the fight ends or the
// Mark moves (PROVISIONAL). Toxin doses: 2 + floor(Ingenuity ÷ 3), persist, refill at a long rest (lane 0B).

// ---------- Mark (rank I, 1 AP) ----------
register({
  id: 'assassin.mark', claims: 'all',
  actions: [{
    id: 'mark', label: 'Mark', scope: ['combat'], target: 'enemy', ap: 1,
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (t && !sideSees(h.cb!, h.u!.side, t) && !t.hidden) return { ok: false, why: 'You can\'t see them.' }; if (t && t.hidden) return { ok: false, why: 'You can\'t see them.' }; return {}; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, st = stateOf(h);
      const list: string[] = (st.marks ||= []).filter((id: string) => { const x = unitById(cb, id); return x && !x.dead && condSource(x, 'marked') === u.id; });
      let lifted = '';
      if (!list.includes(t.id) && list.length >= 3) { const old = unitById(cb, list.shift()!); if (old) { endCond(old, 'marked', cb); lifted = ' (the Mark on ' + old.name + ' lifts: 3 at most)'; } }
      if (!list.includes(t.id)) list.push(t.id); st.marks = list;
      say(cb, u.name + ' marks ' + t.name + applyCond(cb, rng as Rng, u, t, 'marked', undefined, undefined, { skipSave: true }) + lifted + '.');
    },
  }],
  brief: () => null,
});

// ---------- Toxin (rank II, 1 AP) ----------
// Spend 1 dose: your next hit with a blade, dart, thrown weapon or arrow (not bullets, PROVISIONAL) also inflicts
// Weakened, Slowed or Bleeding (your choice; Body save against 12 + your Ingenuity strength: poison, rules 1.13). The coat lasts until
// that hit or the fight's end. Out of combat: coat before the fight (the first fight starts coated).
const TOX = [['weakened', 'Weakened'], ['slowed', 'Slowed'], ['bleeding', 'Bleeding']] as const;
const coatable = (u: Unit) => { const w = WEAPON[u.weapon]; return !!w && (isMelee(w) || /bow|thrown/.test(w.category)); };
register({
  id: 'assassin.toxin', claims: 'all',
  actions: [
    ...TOX.map(([id, name]): ActionDef => ({
      id: 'toxin_' + id, label: 'Toxin: ' + name, scope: ['combat'], target: 'none', ap: 1,
      available: (h) => { const u = h.u; if (!u) return false; if (resOf(u, 'toxins') < 1) return 'No toxin doses left (restocked at rest).'; if (!coatable(u)) return 'Coat a blade, dart or arrow: not a gun.'; return true; },
      run: (h) => { const u = h.u!; resSpend(u, 'toxins', 1); stateOf(h).coat = id; say(h.cb, u.name + ' coats the weapon (' + name + '; ' + resOf(u, 'toxins') + ' doses left).'); },
    })),
    ...TOX.map(([id, name]): ActionDef => ({
      id: 'story_' + id, label: 'Toxin: ' + name, scope: ['story'], target: 'none', ap: 0,
      text: 'Coat your weapon before trouble starts: the next fight opens with the coat on (' + name + ').',
      available: (h) => (h.c ? (storyRes(h.c, 'toxins') < 1 ? 'No toxin doses left (restocked at rest).' : true) : false),
      run: (h) => { if (!spendStoryRes(h.c!, 'toxins')) return 'No doses.'; keep(h).coat = id; postStory(h, h.c!.name + ' coats the weapon with a ' + name.toLowerCase() + ' toxin.'); },
    })),
  ],
  on: {
    combat_start: (ctx, h) => { const k = keep(h); if (k.coat && h.u) { stateOf(h).coat = k.coat; delete k.coat; } },
    on_hit: (ctx, h) => {
      const st = stateOf(h), u = h.u!; if (ctx.att !== u || !st.coat || !coatable(u) || ctx.tgt.dead) return;
      const id = st.coat; delete st.coat;
      const r = d20(rngOf(h, ctx)), m = unitSave(ctx.tgt, 'body'), tn = 12 + unitStrength(u, 'ingenuity'), ok = r === 20 || (r !== 1 && r + m >= tn);
      say(h.cb, 'The toxin on ' + u.name + '\'s weapon: ' + ctx.tgt.name + ' Body save d20 ' + r + ' ' + fmt(m) + ' vs ' + tn + (ok ? ' · resists.' : (applyCond(h.cb!, rngOf(h, ctx), u, ctx.tgt, id, undefined, 'body', { skipSave: true, via: 'ingenuity' }) || ' · takes hold') + '.'));
    },
  },
  brief: () => null,
});

// ---------- Execution (rank III, passive) ----------
// Your hit on a Marked enemy (any of your squad's Marks, PROVISIONAL) that leaves it at or below a quarter of its max HP
// (after the hit's damage, PROVISIONAL) kills it outright. Bosses and Celestials are immune.
register({
  id: 'assassin.execution', claims: 'all',
  on: {
    on_hit: (ctx, h) => {
      const u = h.u!, t: Unit = ctx.tgt, cb = h.cb!; if (ctx.att !== u || t.dead || t.side === u.side || !condOn(t, 'marked') || isBoss(t)) return;
      const by = unitById(cb, condSource(t, 'marked')); if (by && by.side !== u.side) return;
      if (t.hp > t.maxHp / 4) return;
      t.shield = 0; const r = applyDamage(cb, t, Math.max(1, t.hp), { by: u, type: 'execution', shield: false, credit: 'all' });
      if (t.dead || r.killed) { fxFell(cb, t); say(cb, 'EXECUTION: ' + u.name + ' finishes ' + t.name + '.'); }
    },
  },
  brief: () => 'Whether a named NPC counts as a boss (immune) is the Narrator\'s call.',
});

// ======================================================================================================== MAGE
/** How far the Evoker class moves with a picked target reach (Seal, Rewrite): 8 + the Sigil range bonus. Under 1.2 this
 * was PUSH's range; PUSH is a cone in 1.4, so the class keeps the number on its own (PROVISIONAL). */
const MOVE_RANGE = 8;
// Flux is the shared Evoker rule (magic.ts). A Mage, Warden, Scribe or Trickster with no Evoker gets nothing from its
// Sigil moves: the class card should warn (a UI item, see the notes).

/** A caster's Sigil numbers, snapshotted when a stored spell is written (the story ruling reads them). */
interface SigilNums { brain: number; sigilMult: number; elemMult: number; healMult: number }

// ---------- Barrage (rank I, passive) ----------
// The 2-charge damage words cost 1 charge less (the data's word_cost, run by the generic op): FIRE, SHOCK, FREEZE, STONE
// (PROVISIONAL: the fourth 2-charge damage word) and, under 1.4, ACID (item 486, PROVISIONAL); SPARK and GALE already
// cost 1, the floor, so they gain nothing. Each glyph still costs at least 1 charge ("a spell" read as each glyph).
const BARRAGE = ['fire', 'shock', 'freeze', 'stone', 'acid'];
register({
  id: 'mage.barrage', claims: (e) => e?.op !== 'word_cost',
  on: { glyph_cost: (ctx, h) => { if (ctx.u !== h.u || !BARRAGE.includes(ctx.word)) return; ctx.charge = Math.max(1, ctx.charge); } },
  brief: () => null,
});

// ---------- Overcharge (rank II; once a fight, once a scene on the area map) ----------
// Rules 1.4 (spec: Grammar 2; item 437): your next glyph is drawn for no charge and no AP and may go one word past your
// Max Sigil words in the spell it joins, never past 4 glyphs (the 4-glyph cap in sigilwords holds over it); it still
// adds its Flux, and adds nothing to the firing charge. The +1 Max Sigil words (and so +1 glyph on the ground) lasts
// from the moment you Overcharge until that glyph leaves the ground (PROVISIONAL). The bump is marked on the unit's mg
// (mg.overBump), so a unit rebuilt on the area map gets it back once.
function overSync(st: Record<string, any>, u: Unit | null | undefined, cb: Combat | null | undefined) {
  const m: any = u?.mg; if (!m || !cb) return;
  if (st.bumped) { m.overBump = true; delete st.bumped; } // a 1.2 save: its maxWords already carries the +1
  if (st.overId && !(cb.glyphs || []).some((g) => g.id === st.overId)) st.overId = null;
  const on = !!st.over || !!st.overId;
  if (on && !m.overBump) { m.maxWords += 1; m.overBump = true; } else if (!on && m.overBump) { m.maxWords -= 1; m.overBump = false; }
}
const overAction = (scope: 'combat' | 'world'): ActionDef => ({
  id: scope === 'combat' ? 'overcharge' : 'overcharge_world', label: 'Overcharge', scope: [scope], target: 'none', ap: 0, uses: { per: scope === 'combat' ? 'per_combat' : 'per_scene', n: 1 },
  text: 'Your next glyph costs no charge and no AP, and may go one word past your Max Sigil words (never past 4 glyphs). It still adds Flux.',
  available: (h) => { const e = evokerReady(h); if (e) return e; if (stateOf(h).over) return 'Ready: draw the glyph.'; return true; },
  run: (h) => { const st = stateOf(h); st.over = true; overSync(st, h.u, h.cb); say(h.cb, h.u!.name + ' overcharges the Evoker: the next glyph is free, and the spell may hold one word more (never past ' + MAX_GLYPHS + ').'); },
});
register({
  id: 'mage.overcharge', claims: 'all',
  actions: [overAction('combat'), overAction('world')],
  on: {
    glyph_cost: (ctx, h) => {
      const st = stateOf(h); overSync(st, h.u, h.cb); if (ctx.u !== h.u || !st.over) return;
      ctx.ap = 0; ctx.charge = 0;
      if (!ctx.preview && h.cb) { st.over = false; st.overId = 'gl' + ((h.cb.glyphSeq || 0) + 1); }
    },
    evoke_cost: (ctx, h) => { const st = stateOf(h); if (ctx.u === h.u && st.overId && ctx.pattern?.glyphs?.some((g: any) => g.id === st.overId)) ctx.charge = Math.max(1, ctx.charge - 1); },
    evoked: (ctx, h) => { if (ctx.u === h.u) overSync(stateOf(h), h.u, h.cb); },
    turn_start: (ctx, h) => { if (ctx.u === h.u) overSync(stateOf(h), h.u, h.cb); },
    round_start: (ctx, h) => overSync(stateOf(h), h.u, h.cb),
    // The area map rebuilds its units every action: put the +1 back while the Overcharge is live.
    unit_built: (ctx, h) => { if (!ctx.world || !ctx.u?.charId || ctx.u.charId !== (h.c?.id || h.u?.charId)) return; overSync(stateOf({ ...h, u: ctx.u, cb: ctx.cb }), ctx.u, ctx.cb); },
  },
  brief: () => null,
});

// ---------- Payload (rank III, at will) ----------
// Rules 1.4 (item 448): "Evoke with Payload" fires a Line as an Evoke does (same place to stand, same aim), but doubles
// what it covers: a SPREAD radius ×2 (radius 2 → 4), a PUSH cone's length ×2 (3 → 6), both when the spell has both
// (PROVISIONAL); a spell with neither (one target, CONDENSE included) gets one more missile, as one more TWICE would: it
// flies at a target you didn't pick in the area, the nearest of the right kind. A STAY, WAIT or WATCH spell can't carry
// it (what stays isn't doubled). Double Flux: on top of the Flux its glyphs added, the Evoke adds Flux equal to its glyph
// count (PROVISIONAL), which can overload. The reshaping runs on the planner's 'spell_shape' hook, so the preview, the
// fx and the strike all read the same doubled spell.
let payloadOn: string | null = null;
function withPayload<T>(u: Unit, f: () => T): T { const was = payloadOn; payloadOn = u.id; try { return f(); } finally { payloadOn = was; } }
const payloadRefused = (words: string[]) => { const sp = compileSpell(words); return sp.stay || sp.wait || sp.watch ? 'A STAY, WAIT or WATCH spell can\'t carry a Payload: what stays isn\'t doubled.' : null; };
/** What the Payload does to this spell, in words for the preview and the log. */
function payloadWhat(words: string[]): string {
  const sp = compileSpell(words), out: string[] = [];
  if (sp.spread) out.push('SPREAD radius ' + sp.radius + ' → ' + sp.radius * 2);
  if (sp.push) out.push('PUSH cone ' + sp.coneLen + ' → ' + sp.coneLen * 2 + ' tiles');
  if (!sp.spread && !sp.push) out.push('one more missile (' + sp.missiles + ' → ' + (sp.missiles + 1) + ')');
  return out.join(', ');
}
/** The aim when the player gave none, by the spell's kind (as the planner's own auto-aim): a spell that harms goes to the
 * nearest enemy in the area; a Boon or a Working (nothing in it harms) goes on the caster's own tile, the self-target rule
 * (PUSH can't face from there: the nearest ally in the area instead). The planner tells us the area. */
function payloadAim(cb: Combat, u: Unit, tile: string, choice?: string): string | undefined {
  const c = tileOf(cb, choice); if (c) return c;
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return undefined;
  const sp = compileSpell(p.words);
  const pv = withPayload(u, () => previewEvoke(cb, u, tile));
  const near = (mine: boolean) => cb.units.filter((v) => !v.dead && (mine ? v.side === u.side && v !== u : v.side !== u.side) && pv.pickable.includes(v.pos)).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos) || a.id.localeCompare(b.id))[0]?.pos;
  if (sp.harmful) return near(false);
  return sp.push ? near(true) : u.pos;
}
function payloadPlan(cb: Combat, u: Unit, args: ActionArgs): { pv?: EvokePreview; tile?: string; aim?: string; why?: string } {
  const tile = tileOf(cb, args.tile); if (!tile) return { why: 'Pick a glyph of the Line.' };
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return { why: p };
  const no = payloadRefused(p.words); if (no) return { why: no };
  const aim = payloadAim(cb, u, tile, args.choice), pv = withPayload(u, () => previewEvoke(cb, u, tile, aim));
  if (!pv.ok) return { why: pv.why || 'Can\'t fire that.', pv, tile, aim };
  return { pv, tile, aim };
}
const payloadAction = (scope: 'combat' | 'world'): ActionDef => ({
  id: scope === 'combat' ? 'payload' : 'payload_world', label: 'Evoke with Payload', scope: [scope], target: 'tile', ap: 0,
  text: 'Evoke the Line on this tile with double area: a SPREAD radius or a PUSH cone ×2, or one more missile for a one-target spell. The Evoke adds Flux equal to its glyphs. Not for STAY, WAIT or WATCH.',
  preview: (h, args) => {
    const cb = h.cb!, u = h.u!, r = payloadPlan(cb, u, args); if (r.why) return { ok: false, why: r.why, ...(r.pv?.area?.length ? { area: r.pv.area, sigil: true } : {}) };
    const pv = r.pv!, n = pv.pattern!.glyphs.length;
    return { lines: ['Payload: ' + payloadWhat(pv.pattern!.words) + '; ' + pv.targets.length + ' target(s); +' + n + ' Flux on the Evoke.'], ...evokeMarks(pv) };
  },
  run: (h, args, rng) => {
    // The area map: a Payload that reaches a hostile token opens the fight there first, as an Evoke does (the spell is
    // the opening move); one that touches nobody of the other side fires on the map.
    if (overworld(h.cb)) {
      const cb = h.cb!, u = h.u!, r = payloadPlan(cb, u, args); if (r.why) return r.why;
      const npc = r.pv!.targets.map((id) => cb.units.find((x) => x.id === id)).find((x) => x && x.side === 'foe');
      if (npc) { const g = h.g; strikeFromWorld(npc.id, 0, (cbx, att) => payloadRun({ ...h, cb: cbx, u: att }, args, g.rng)); return null; }
    }
    return payloadRun(h, args, rng);
  },
});
function payloadRun(h: Holder, args: ActionArgs, rng: Rng): string | null {
  const cb = h.cb!, u = h.u!, r = payloadPlan(cb, u, args); if (r.why) return r.why;
  const n = r.pv!.pattern!.glyphs.length, what = payloadWhat(r.pv!.pattern!.words);
  const err = withPayload(u, () => evoke(cb, rng as Rng, u, r.tile!, r.aim)); if (err) return err;
  say(cb, 'PAYLOAD: ' + what + addFlux(cb, u, n) + '.');
  checkOver(cb); return null;
}
register({
  id: 'mage.payload', claims: 'all', actions: [payloadAction('combat'), payloadAction('world')],
  on: {
    spell_shape: (ctx, h) => {
      if (ctx.u !== h.u || payloadOn !== h.u?.id) return;
      const sp: Spell = ctx.spell; if (sp.stay || sp.wait || sp.watch) return;
      if (sp.spread) sp.radius *= 2;
      if (sp.push) sp.coneLen *= 2;
      if (!sp.spread && !sp.push) sp.missiles += 1;
    },
  },
  brief: () => null,
});

// ======================================================================================================== WARDEN

// ---------- Raise Cover (rank I) ----------
// You know STAY (the data's unlock_word, run generically). Evoke a lone STAY glyph of yours (no Subject, no second
// glyph; 1 AP, 1 charge) as a cover rune: a two-tile wall of full cover (blocks movement and sight, 40 HP each,
// breakable; PROVISIONAL) on the glyph's tile and the free tile next to it that faces the nearest enemy, for 2 rounds +
// your Sigil duration bonus. Rules 1.4 (spec: "the old classes under the new Sigil rules"): it is the class's one
// exception to the Line. "Lone" is the glyph alone on its tile with no glyph of its side touching it (else it belongs to
// a Line); you drew it standing on it, so you Evoke it from a tile next to it (the rune needs its tile clear). The
// runes are barricades, not Sigil spells: NULL doesn't take them (item 430).
// Rules 1.10: a glyph of a stroke is lone when its stroke holds only it (touching glyphs of other strokes don't matter);
// an old 1.4 glyph keeps the touching test.
const isLoneStay = (cb: Combat, u: Unit, g: any) => g.by === u.id && g.word === 'stay' && (cb.glyphs || []).filter((x) => x.pos === g.pos).length === 1
  && (g.strokeId ? (strokeOfGlyph(cb.glyphs || [], g)?.glyphs.length ?? 1) === 1 : !(cb.glyphs || []).some((x) => x !== g && x.side === g.side && !x.strokeId && dist(x.pos, g.pos) === 1));
function loneStay(cb: Combat, u: Unit): any | null {
  return (cb.glyphs || []).find((g) => dist(u.pos, g.pos) === 1 && isLoneStay(cb, u, g)) || null;
}
const freeTile = (cb: Combat, k: string) => standable(cb.map, k) && !cb.units.some((v) => !v.dead && v.pos === k) && !objectsOf(cb).some((o) => o.pos === k && (o.hp == null || o.hp > 0) && !['rubble', 'poi', 'exit', 'trap'].includes(o.kind));
function runeTiles(cb: Combat, u: Unit, at: string): string[] {
  const foe = cb.units.filter((v) => v.side !== u.side && !v.dead).sort((a, b) => dist(a.pos, at) - dist(b.pos, at))[0];
  const [x, y] = xy(at);
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => key(x + dx, y + dy)).filter((k) => freeTile(cb, k));
  // the second tile runs across the line to the nearest enemy, so the wall faces it
  const score = (k: string) => { if (!foe) return 0; const [fx, fy] = xy(foe.pos), [kx, ky] = xy(k), vx = fx - x, vy = fy - y, wx = kx - x, wy = ky - y; return Math.abs(vx * wx + vy * wy); };
  opts.sort((a, b) => score(a) - score(b) || a.localeCompare(b));
  return [at, ...(opts[0] ? [opts[0]] : [])];
}
register({
  id: 'warden.raise_cover', claims: (e) => e?.op !== 'unlock_word',
  actions: [{
    // In a fight and on the area map (the same number of overworld rounds there: cb.round is the story round).
    id: 'raise_cover', label: 'Raise Cover (cover rune)', scope: ['combat', 'world'], target: 'none', ap: SPELL_AP.evoke,
    text: 'Evoke your lone STAY glyph as a cover rune, from a tile next to it: full cover on its tile and the one beside it.',
    available: (h) => {
      const e = evokerReady(h); if (e) return e; const cb = h.cb, u = h.u!;
      if (!cb || !loneStay(cb, u)) return (cb?.glyphs || []).some((g) => g.pos === u.pos && isLoneStay(cb!, u, g)) ? 'Step off the STAY glyph: you Evoke the rune from a tile next to it.' : 'Draw a lone STAY glyph, then step to a tile next to it.';
      if ((u.mg!.charge || 0) < 1) return 'Needs 1 charge.'; return true;
    },
    run: (h) => {
      const cb = h.cb!, u = h.u!, g = loneStay(cb, u)!; if (cb.units.some((v) => !v.dead && v.pos === g.pos)) return 'Someone stands on the glyph: the rune needs the tile clear.';
      const tiles = runeTiles(cb, u, g.pos), left = 2 + (u.mg!.durBonus || 0), st = stateOf(h);
      u.mg!.charge -= 1; u.mg!.cast = true; cb.glyphs = (cb.glyphs || []).filter((x) => x !== g); tidyStrokes(cb.glyphs);
      const ids: string[] = [];
      for (const k of tiles) { const id = 'rune_' + u.id + '_' + k.replace(',', '_') + '_' + cb.round; ids.push(id); cb.objects = [...objectsOf(cb), makeObject(id, 'barricade', k, { name: 'Cover rune', text: 'A STAY rune standing as full cover.', hp: 40, max: 40 } as any)]; }
      (st.runes ||= []).push({ ids, until: cb.round + left });
      emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: 'rune', tiles: [g.pos], area: tiles, src: g.pos, impact: g.pos, targets: [], words: ['stay'], element: null, stay: true, side: u.side, missiles: [], placed: null, fizzle: false });
      emitFx(cb, 'wall_raised', { tiles, by: u.id, side: u.side, hp: 40, rounds: left, rune: true });
      say(cb, u.name + ' evokes STAY alone: a cover rune stands at ' + tiles.map(refOf).join(' and ') + ' for ' + left + ' rounds (1 charge).');
    },
  }],
  on: {
    round_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb; if (!cb || !st.runes?.length) return;
      const gone = st.runes.filter((r: any) => cb.round >= r.until); if (!gone.length) return;
      const ids = new Set(gone.flatMap((r: any) => r.ids)); cb.objects = objectsOf(cb).filter((o) => !ids.has(o.id));
      st.runes = st.runes.filter((r: any) => cb.round < r.until); say(cb, 'A cover rune of ' + h.u!.name + '\'s fades.');
    },
    // The area map: the runes raised there fade when their overworld round comes.
    world_round_start: (ctx, h) => {
      const g = ctx.g, st = stateOf({ ...h, g }); if (!g?.story || !st.runes?.length) return;
      const gone = st.runes.filter((r: any) => g.story.round >= r.until); if (!gone.length) return;
      const ids = new Set(gone.flatMap((r: any) => r.ids)); g.story.objects = (g.story.objects || []).filter((o: any) => !ids.has(o.id));
      st.runes = st.runes.filter((r: any) => g.story.round < r.until); postStory({ ...h, g }, 'A cover rune fades.', { kind: 'system' });
    },
  },
  brief: () => null,
});

// ---------- Ward (rank II, 2 AP) ----------
// Spend 1-3 charge: an ally within 6 tiles you can see (you too, PROVISIONAL) gains a shield of 10 × charge × your
// Healing given multiplier (the higher shield stands, like the WARD word). +1 Flux per charge. No glyph.
const wardDef = (n: number, self: boolean): ActionDef => ({
  id: 'ward' + n + (self ? '_self' : ''), label: 'Ward ×' + n + (self ? ' (yourself)' : ''), scope: ['combat'], target: self ? 'none' : 'ally', ap: 2, range: 6,
  text: 'Spend ' + n + ' charge: a shield of ' + 10 * n + ' × your Healing given on ' + (self ? 'yourself' : 'an ally within 6') + '. +' + n + ' Flux.',
  available: (h) => { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < n) return 'Needs ' + n + ' charge.'; return true; },
  preview: (h, args) => { if (self) return {}; const t = unitById(h.cb!, args.targetId); if (t && !unitSees(h.cb!, h.u!, t.pos)) return { ok: false, why: 'You can\'t see them.' }; return {}; },
  run: (h, args) => {
    const cb = h.cb!, u = h.u!, t = self ? u : unitById(cb, args.targetId)!; u.mg!.charge -= n; u.mg!.cast = true;
    const v = grantShield(cb, t, 10 * n * healMultOf(h), u); emitFx(cb, 'shield', { target: t.id, at: t.pos, absorbed: 0, gained: v });
    say(cb, u.name + ' wards ' + (t === u ? 'themself' : t.name) + ': a ' + v + ' shield (' + n + ' charge)' + addFlux(cb, u, n) + '.');
  },
});
register({ id: 'warden.ward', claims: 'all', actions: [1, 2, 3].flatMap((n) => [wardDef(n, false), wardDef(n, true)]), brief: () => null });

// ---------- Seal (rank III, 3 AP) ----------
// Spend 2 charge (+2 Flux, PROVISIONAL): a 3×3 zone centred on a tile within 8 + your Sigil range bonus you can see
// (PROVISIONAL), for 2 rounds: an enemy caster standing in it pays double charge for Sigils and double MP for Soul
// spells (PROVISIONAL: the caster's tile counts). Narrator-run casters (Celestials) honour it at the Narrator's word.
const sealAt = (cb: Combat, u: Unit) => (cb.zones || []).filter((z: any) => z.kind === 'seal' && z.side !== u.side && z.tiles.includes(u.pos));
register({
  id: 'warden.seal', claims: 'all',
  actions: [{
    id: 'seal', label: 'Seal', scope: ['combat'], target: 'tile', ap: 3,
    available: (h) => { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < 2) return 'Needs 2 charge.'; return true; },
    preview: (h, args) => { const cb = h.cb!, u = h.u!, t = tileOf(cb, args.tile); if (!t) return {}; const r = MOVE_RANGE + (u.mg?.rangeBonus || 0);
      if (dist(u.pos, t) > r) return { ok: false, why: 'Out of range (' + r + ' tiles).' }; if (t !== u.pos && !lineOfSight(cb, u.pos, t)) return { ok: false, why: 'No line of sight.' }; return { tiles: around(t, 1), sigil: true }; },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = tileOf(cb, args.tile)!; u.mg!.charge -= 2; u.mg!.cast = true;
      cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'seal' as any, tiles: around(t, 1), words: ['seal'], by: u.id, side: u.side, left: 2, mult: 1, who: u.name }];
      emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: 'area', tiles: around(t, 1), area: around(t, 1), src: t, impact: t, targets: [], words: ['seal'], element: null, stay: true, side: u.side, missiles: [], placed: null, fizzle: false });
      say(cb, u.name + ' seals the ground around ' + refOf(t) + ': enemy magic costs double there for 2 rounds (2 charge)' + addFlux(cb, u, 2) + '.');
    },
  }],
  on: {
    glyph_cost: (ctx, h) => { if (h.cb && ctx.u && sealAt(h.cb, ctx.u).some((z: any) => z.by === h.u!.id)) ctx.charge *= 2; },
    evoke_cost: (ctx, h) => { if (h.cb && ctx.u && sealAt(h.cb, ctx.u).some((z: any) => z.by === h.u!.id)) ctx.charge *= 2; },
    outburst_cost: (ctx, h) => { if (h.cb && ctx.u && sealAt(h.cb, ctx.u).some((z: any) => z.by === h.u!.id)) ctx.mp *= 2; },
  },
  brief: () => 'Narrator-run casters inside a Seal pay double charge or MP.',
});

// ======================================================================================================== SCRIBE

// ---------- Quicken (rank I, 2 AP, once a turn) ----------
// Spend 1 charge: an ally within 6 tiles (not you, PROVISIONAL; no sight needed, no Flux) gets +1 AP at the start of
// their next turn. The AP ceiling of 9 holds; it is not perk AP, so the +3 perk cap doesn't count it (PROVISIONAL).
register({
  id: 'scribe.quicken', claims: 'all',
  actions: [{
    id: 'quicken', label: 'Quicken', scope: ['combat'], target: 'ally', ap: 2, range: 6, uses: { per: 'per_turn', n: 1 },
    available: (h) => { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < 1) return 'Needs 1 charge.'; return true; },
    run: (h, args) => { const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!; if (t === u) return 'Quicken an ally, not yourself.';
      u.mg!.charge -= 1; u.mg!.cast = true; const st = stateOf(h); (st.q ||= {})[t.id] = (st.q[t.id] || 0) + 1;
      emitFx(cb, 'stance', { unit: t.id, at: t.pos, what: 'quicken' }); say(cb, u.name + ' quickens ' + t.name + ': +1 AP on their next turn (1 charge).'); },
  }, {
    // The area map (the audit's proposal, PROVISIONAL): an overworld round is everyone's turn at once, so the ally's +1
    // lands on this round's AP straight away (the ceiling of 9 holds). Once a round, as once a turn in a fight.
    id: 'quicken_world', label: 'Quicken', scope: ['world'], target: 'ally', ap: 2, range: 6, uses: { per: 'per_turn', n: 1 },
    text: 'Spend 1 charge: an ally within 6 tiles gets +1 AP this overworld round.',
    available: (h) => { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < 1) return 'Needs 1 charge.'; return true; },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, g = h.g, t = unitById(cb, args.targetId); if (!t || t === u) return 'Quicken an ally, not yourself.';
      const tc = charOfUnit(t); if (!g || !tc) return 'Only a character takes Quicken on the area map.';
      if (g.story.ended?.[tc.id]) return tc.name + ' has ended the turn.';
      const was = apLeft(g, tc), now = Math.min(AP_MAX, was + 1); if (now <= was) return tc.name + ' is at the ceiling of ' + AP_MAX + ' AP.';
      u.mg!.charge -= 1; u.mg!.cast = true; (g.story.ap ||= {})[tc.id] = now;
      emitFx(cb, 'stance', { unit: t.id, at: t.pos, what: 'quicken' }); say(cb, u.name + ' quickens ' + t.name + ': +1 AP this round (' + now + '; 1 charge).');
    },
  }],
  on: {
    turn_start: (ctx, h) => { const q = stateOf(h).q; const n = q?.[ctx.u.id]; if (!n) return; delete q[ctx.u.id];
      const was = ctx.u.ap; ctx.u.ap = Math.min(AP_MAX, ctx.u.ap + n); say(h.cb, ctx.u.name + ' +' + (ctx.u.ap - was) + ' AP (Quicken)' + (ctx.u.ap - was < n ? ': the ceiling of ' + AP_MAX + ' holds' : '') + '.'); },
  },
  brief: () => null,
});

// ---------- Inscribe Gear (rank II; 3 AP in a fight, no AP out of one; 2 charge always, PROVISIONAL) ----------
// Write a sigil on an ally's (or your own) weapon (+10% damage with it) or torso armour (+5 armour value, no change to
// Movement or Dodge; armour or not, PROVISIONAL) until the next rest. One inscription per item. Adjacent in a fight.
interface Inscription { charId: string; kind: 'weapon' | 'armour'; item: string; stamp: string; by: string }
const inscriptions = (h: Holder): Inscription[] => (keep(h).ins ||= []).filter((x: Inscription) => x.stamp === restStamp(h));
/** Every live inscription in the game (any Scribe's), for a character. */
function inscribedOf(g: any, charId: string | undefined): Inscription[] {
  if (!g?.story?.ps || !charId) return [];
  const stamp = stampOf('per_rest', { g });
  return Object.values(g.story.ps as Record<string, any>).flatMap((p: any) => (p?.items?.['class:scribe.inscribe_gear']?.ins || []) as Inscription[]).filter((x) => x.charId === charId && x.stamp === stamp);
}
function inscribe(h: Holder, t: Character, kind: 'weapon' | 'armour', u?: Unit | null): string | null {
  const item = kind === 'weapon' ? t.weapon : 'torso';
  if (inscribedOf(h.g, t.id).some((x) => x.kind === kind && x.item === item)) return 'That ' + (kind === 'weapon' ? 'weapon' : 'armour') + ' already carries an inscription.';
  const k = keep(h); k.ins = [...inscriptions(h), { charId: t.id, kind, item, stamp: restStamp(h), by: h.c?.name || '' }];
  if (u && kind === 'armour') u.armour += 5;
  return null;
}
const inscribeDef = (kind: 'weapon' | 'armour', self: boolean, scope: 'combat' | 'story'): ActionDef => ({
  id: kind + (self ? '_self' : '') + (scope === 'story' ? '_story' : ''), label: 'Inscribe ' + (kind === 'weapon' ? 'a weapon' : 'armour') + (self ? ' (yours)' : ''), scope: scope === 'combat' ? ['combat'] : ['story', 'world'],
  target: self || scope === 'story' ? 'none' : 'ally', ap: scope === 'combat' ? 3 : 0, range: 1,
  text: kind === 'weapon' ? '2 charge: +10% damage with the weapon until the next rest.' : '2 charge: +5 armour value until the next rest.' + (scope === 'story' ? ' Name the ally in what you say (else yourself).' : ''),
  available: (h) => {
    if (scope === 'combat') { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < 2) return 'Needs 2 charge.'; return true; }
    if (!h.c || !hasEvoker(h.c)) return 'Needs an Evoker in hand.'; if (evoChargeNow(h.c) < 2) return 'Needs 2 charge in the core.'; return true;
  },
  run: (h, args) => {
    if (scope === 'combat') {
      const cb = h.cb!, u = h.u!, t = self ? u : unitById(cb, args.targetId)!, tc = charOfUnit(t); if (!tc) return 'Only a character\'s gear takes an inscription.';
      const e = inscribe(h, tc, kind, t); if (e) return e; u.mg!.charge -= 2; u.mg!.cast = true;
      say(cb, u.name + ' inscribes ' + (t === u ? 'their own ' : t.name + '\'s ') + (kind === 'weapon' ? WEAPON[t.weapon]?.name || 'weapon' : 'armour') + ' (' + (kind === 'weapon' ? '+10% damage' : '+5 armour') + ' until the next rest; 2 charge).');
      return;
    }
    const t = charNamed(h, args) || h.c!, e = inscribe(h, t, kind); if (e) return e;
    h.c!.evoCharge = evoChargeNow(h.c!) - 2;
    postStory(h, h.c!.name + ' inscribes ' + (t === h.c ? 'their own ' : t.name + '\'s ') + (kind === 'weapon' ? WEAPON[t.weapon]?.name || 'weapon' : 'armour') + ': ' + (kind === 'weapon' ? '+10% damage' : '+5 armour') + ' until the next rest.');
  },
});
register({
  id: 'scribe.inscribe_gear', claims: 'all',
  actions: [inscribeDef('weapon', false, 'combat'), inscribeDef('weapon', true, 'combat'), inscribeDef('armour', false, 'combat'), inscribeDef('armour', true, 'combat'), inscribeDef('weapon', false, 'story'), inscribeDef('armour', false, 'story')],
  on: {
    combat_start: (ctx, h) => {
      // Once per fight (the first Scribe's handler does it for everyone): inscribed armour.
      const cb = h.cb!; if ((cb as any).inscribed) return; (cb as any).inscribed = true;
      for (const v of cb.units) if (v.charId) for (const x of inscribedOf(h.g, v.charId)) if (x.kind === 'armour') v.armour += 5;
    },
    // The area map rebuilds its units every action: put the inscribed armour back (once, however many Scribes).
    unit_built: (ctx, h) => { if (!ctx.world || ctx._inscribed) return; ctx._inscribed = true; for (const x of inscribedOf(h.g, ctx.u.charId)) if (x.kind === 'armour') ctx.u.armour += 5; },
    damage_out: (ctx, h) => {
      const a: Unit = ctx.att; if (!a?.charId || ctx.spell || ctx.melee && !isMelee(WEAPON[a.weapon])) return;
      if ((ctx.mults as any[]).some((m) => m.label === 'Inscribed')) return; // two Scribes: one inscription counts
      if (inscribedOf(h.g, a.charId).some((x) => x.kind === 'weapon' && x.item === a.weapon)) ctx.mults.push({ v: 1.1, label: 'Inscribed' });
    },
  },
  brief: () => null,
});

// ---------- Stored Spell (rank III) ----------
// Out of combat, write a whole Sigil spell (words you know, at most your Max Sigil words and 4 glyphs, a spell by the
// 1.4 grammar) onto an object, paying its charge and firing charge now. It fades at the next rest. You keep at most
// max(1, Rumination modifier) at once (GAMEBREAKING: the modifier alone is 0 or less for most Scribes; PROVISIONAL).
// Writing is at will within the cap (the data's per_rest conflicts with the cap, PROVISIONAL). Rules 1.4 (spec: "the old
// classes under the new Sigil rules"): it holds words, not a shape. In a fight it goes off for 1 AP from the object's
// tile, the Scribe's own (the Scribe holds it), with its own Reach, all around (no facing): Touch reaches the tiles next
// to it, SEEK flies 8 from it, RELAY hops from it; Bursts, Delivery and KIN as written. It runs through the real planner
// as a two-glyph-hook Stack of virtual glyphs on the holder's tile, so the preview, fx, hooks and strike are an Evoke's,
// with no firing charge (paid when written) and the action's 1 AP. STAY, WAIT and WATCH are refused (they would outlive
// the object). The holder's Evoker must be ready (PROVISIONAL: the Evoker sends the command), and the numbers are the
// Scribe's live ones (the snapshot is kept for the story ruling). For now only the Scribe can trigger it: handing the
// object to an ally needs a runtime hook (see the notes). A 1.2 stored spell keeps its words (its shape is ignored; RETURN
// becomes SEEK); one that no longer makes a spell is dropped when triggered.
interface Stored { id: string; words: string[]; shape?: string; stamp: string; nums: SigilNums; /** The Brain Power strength when it was stored (rules 1.13; older saves hold a per-family record). */ debuff: number | Record<string, number> }
const storedCap = (c: Character) => Math.max(1, mod(c.skills.rumination || 0));
const storedOf = (h: Holder): Stored[] => (keep(h).spells ||= []).filter((x: Stored) => x.stamp === restStamp(h));
const STORE_REFUSED = ['stay', 'wait', 'watch'];
function parseSpell(text: string): string[] {
  const toks = String(text || '').toLowerCase().match(/[a-z]+/g) || [];
  return toks.filter((t) => (SIGIL as any)[t]);
}
/** A stored spell's words under 1.4 (RETURN → SEEK), or why it no longer reads. */
function storedWords(sp: Stored): { words: string[]; why?: string } {
  const words = sp.words.map((w) => (w === 'return' ? 'seek' : w)).filter((w) => (SIGIL as any)[w]);
  const ge = grammarError(words, MAX_GLYPHS); if (ge) return { words, why: 'The stored writing no longer makes a spell (' + ge.charAt(0).toLowerCase() + ge.slice(1, -1) + ').' };
  if (words.some((w) => STORE_REFUSED.includes(w))) return { words, why: 'A STAY, WAIT or WATCH spell can\'t be stored.' };
  return { words };
}
let storedFiring: string | null = null;
/** Run f with the stored spell on the holder's tile as virtual glyphs (their own group: side 'stored', first in the list,
 * so the planner finds them and nothing of the map joins them); they are gone afterwards, whatever happened. */
function withStored<T>(cb: Combat, u: Unit, words: string[], f: () => T): T {
  const vg = words.map((w, i) => ({ id: 'ss' + (i + 1), word: w, pos: u.pos, by: u.id, side: 'stored', left: 1, who: u.name, v: SIGIL_REV } as any));
  const was = storedFiring; migrateSigil(cb); cb.glyphs = [...vg, ...(cb.glyphs || [])]; storedFiring = u.id;
  try { return f(); } finally { storedFiring = was; cb.glyphs = (cb.glyphs || []).filter((g) => !vg.includes(g)); }
}
register({
  id: 'scribe.stored_spell', claims: 'all',
  actions: [
    {
      id: 'write', label: 'Store a spell', scope: ['story', 'world'], target: 'text', ap: 0,
      text: 'Write a Sigil spell onto an object (say its words: "FIRE SEEK SPREAD"); pay its charge now. It fades at the next rest. In a fight it goes off from your tile with its own Reach, all around.',
      available: (h) => { const c = h.c; if (!c || !hasEvoker(c)) return 'Needs an Evoker in hand.'; if (storedOf(h).length >= storedCap(c)) return 'You keep ' + storedCap(c) + ' stored spell(s) at most.'; return true; },
      run: (h, args) => {
        const c = h.c!, words = parseSpell(args.text || ''), known = new Set([...(c.sigils || []), ...itemWords(c)]);
        if (words.length < 2) return 'Name the words (at least two: a Subject and another word).';
        const bad = words.find((w) => !known.has(w)); if (bad) return 'You don\'t know ' + bad.toUpperCase() + '.';
        const ge = grammarError(words, maxSigilWords(c)); if (ge) return ge;
        if (words.some((w) => STORE_REFUSED.includes(w))) return 'A STAY, WAIT or WATCH spell can\'t be stored: it would outlive the object.';
        const wc = wordCostMods(c), cost = words.reduce((t, w) => t + Math.max(0, (SIGIL as any)[w].charge + (wc[w] || 0)), 0) + Math.max(1, words.length - sigilCoreSaving(c));
        if (evoChargeNow(c) < cost) return 'Needs ' + cost + ' charge (' + evoChargeNow(c) + ' in the core).';
        c.evoCharge = evoChargeNow(c) - cost;
        const sp: Stored = { id: 's' + (++h.g.seq), words, stamp: restStamp(h), nums: { brain: mod(c.skills.brain_power || 0), sigilMult: sigilMult(c), elemMult: elementalMult(c), healMult: healingMult(c) },
          debuff: strengthOf(c, 'brain_power') };
        keep(h).spells = [...storedOf(h), sp];
        postStory(h, c.name + ' writes ' + words.map((w) => w.toUpperCase()).join(' · ') + ' onto an object: ' + cost + ' charge. ' + storedOf(h).length + '/' + storedCap(c) + ' stored.');
      },
    },
    {
      id: 'trigger', label: 'Trigger a stored spell', scope: ['combat'], target: 'tile', ap: 1,
      text: 'Set off your oldest stored spell from your tile, with its own Reach, all around: pick the target (1 AP).',
      available: (h) => {
        const sp = storedOf(h)[0]; if (!sp) return 'Nothing stored (write one out of combat).';
        const e = evokerReady(h); if (e) return e; return true;
      },
      preview: (h, args) => {
        const cb = h.cb!, u = h.u!, sp = storedOf(h)[0]; if (!sp) return { ok: false, why: 'Nothing stored.' };
        const sw = storedWords(sp); if (sw.why) return { ok: false, why: sw.why };
        const pv = withStored(cb, u, sw.words, () => previewEvoke(cb, u, u.pos, tileOf(cb, args.tile) || undefined));
        if (!pv.ok) return { ok: false, why: pv.why, ...(pv.area.length ? { area: pv.area, sigil: true } : {}) };
        return { lines: ['Stored ' + sw.words.map((w) => w.toUpperCase()).join(' · ') + ': ' + pv.targets.length + ' target(s)' + (pv.fizzle ? ' · it would fizzle' : '') + '.'], ...evokeMarks(pv) };
      },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, list = storedOf(h), sp = list[0]; if (!sp) return 'Nothing stored.';
        const sw = storedWords(sp); if (sw.why) { keep(h).spells = list.slice(1); say(cb, u.name + '\'s stored spell crumbles: ' + sw.why); return null; }
        const aim = tileOf(cb, args.tile) || undefined;
        const pv = withStored(cb, u, sw.words, () => previewEvoke(cb, u, u.pos, aim)); if (!pv.ok) return pv.why || 'Can\'t set it off there.';
        say(cb, u.name + ' triggers a stored spell (' + sw.words.map((w) => w.toUpperCase()).join(' · ') + ') from ' + refOf(u.pos) + '.');
        // its conditions read the Brain Power strength stored with it (rules 1.13)
        const err = withVia(u, 'brain_power', () => withStored(cb, u, sw.words, () => evoke(cb, rng as Rng, u, u.pos, aim)), typeof sp.debuff === 'number' ? sp.debuff : undefined); if (err) { cb.log.pop(); return err; }
        keep(h).spells = list.slice(1); checkOver(cb); return null;
      },
    },
    {
      id: 'trigger_story', label: 'Trigger a stored spell', scope: ['story'], target: 'none', ap: 0,
      text: 'Set off a stored spell outside a fight (a door ward, a bomb): the Narrator rules the result from its numbers.',
      available: (h) => (storedOf(h).length ? true : 'Nothing stored.'),
      run: (h, args) => {
        const list = storedOf(h), sp = list[0]!; keep(h).spells = list.slice(1);
        const eid = postStory(h, (h.c?.name || '') + ' sets off a stored ' + sp.words.map((w) => w.toUpperCase()).join(' · ') + '.');
        // "(stack)": a stored spell reads as a Stack does under 1.4, all around its tile (the 1.2 saves' word kept).
        pendRuling(h.g, h.c!, h.key, 'Stored spell ' + sp.words.join('+') + ' (stack) set off out of combat: it goes off from the object with its own Reach, all around' + (args.text ? ': "' + args.text.slice(0, 120) + '"' : '') + '. Its numbers: Brain Power ' + fmt(sp.nums.brain) + ' to hit, Sigil ×' + sp.nums.sigilMult.toFixed(2) + ', debuff TN ' + (12 + (typeof sp.debuff === 'number' ? sp.debuff : sp.debuff?.body ?? 0)) + '. Rule what it hits.', eid || undefined);
      },
    },
  ],
  on: {
    // The stored spell's firing charge was paid when it was written; the action pays its 1 AP.
    evoke_cost: (ctx, h) => { if (storedFiring && ctx.u === h.u && storedFiring === h.u?.id && ctx.pattern?.side === 'stored') { ctx.charge = 0; ctx.ap = 0; } },
  },
  brief: () => 'Stored spells set off outside a fight: the Narrator rules the result from the numbers given.',
});

// ======================================================================================================== TRICKSTER

// ---------- Bind (rank I, passive) ----------
// BIND costs 1 charge less (the data's word_cost, generic) and its Body save is against 14 + your Brain Power strength (the
// +2 follows whoever Evokes the pattern, PROVISIONAL). GAMEBREAKING (dead move): rank I also teaches BIND, outside the
// words-known cap (PROVISIONAL; a data delta: unlock_word bind; until then the engine adds the word to the fighter).
register({
  id: 'trickster.bind', claims: (e) => e?.op !== 'word_cost',
  on: {
    combat_start: (ctx, h) => { const m = h.u?.mg; if (m && m.evoker && !m.words.includes('bind')) m.words.push('bind'); },
    unit_built: (ctx, h) => { if (ctx.u !== h.u) return; const m = h.u?.mg; if (m && m.evoker && !m.words.includes('bind')) m.words.push('bind'); }, // the area map too
    // BIND is the Sigil that Pins; Pinned from this Trickster's own spells (an Outburst's Pinned option included: the
    // hook can't tell them apart yet) saves at +2.
    cond_apply: (ctx, h) => { if (ctx.by === h.u && ctx.id === 'pinned') ctx.tnAdd += 2; },
  },
  brief: () => null,
});

// ---------- Blind and Slow (rank II, passive) ----------
// BLIND, SLOW and MUDDLE are learned (outside the cap) and cost 1 charge less (the data, generic). GAMEBREAKING: BLIND
// and SLOW would be free; a glyph's draw costs at least 1 charge (PROVISIONAL), so only MUDDLE really gets cheaper.
register({
  id: 'trickster.blind_and_slow', claims: (e) => e?.op !== 'word_cost' && e?.op !== 'unlock_word',
  on: { glyph_cost: (ctx, h) => { if (ctx.u === h.u && ['blind', 'slow', 'muddle'].includes(ctx.word)) ctx.charge = Math.max(1, ctx.charge); } },
  brief: () => null,
});

// ---------- Rewrite (rank III, 3 AP, once a turn) ----------
// Spend 3 charge (+1 Flux, PROVISIONAL): an enemy within 8 + your Sigil range bonus you can see (PROVISIONAL) makes a
// Brain save (12 + your Brain Power strength). On a failure one helpful state flips into its opposite until it would
// have ended: Braced → Prone; Guarded or Withdrawing (+2 Defense) → −2 Defense; Inspired (+2 to hit) → −2 to hit; a
// shield → that much Sigil damage, at most 30 × your Sigil multiplier (GAMEBREAKING uncapped; PROVISIONAL), armour
// applies; Hidden → revealed and Marked; Overwatch → the held shot and its reaction are lost; Emplaced → Prone. A state
// the engine doesn't know goes to the Narrator. Once a turn (GAMEBREAKING at will; PROVISIONAL). Rules 1.4 adds two
// buffs the SHARPEN and QUICKEN words give (PROVISIONAL): Quickened (+2 AP next turn) → Dazed (−2 AP next turn);
// Sharpened (+3 to hit, ×1.25 on its next attack) → −3 to hit and ×0.8 damage on its next weapon attack (or until the
// end of its next turn, as Sharpened lasts). Reach: 8 tiles + your Sigil range bonus, in sight (the 1.2 PUSH reach, kept
// as a number of the move now that PUSH is a cone).
function flippable(t: Unit): string[] {
  return [t.overwatch || t.watch ? 'overwatch' : '', (t.shield || 0) > 0 ? 'shield' : '', t.braced ? 'braced' : '', condOn(t, 'emplaced') ? 'emplaced' : '', condOn(t, 'guarded') ? 'guarded' : '', condOn(t, 'withdrawing') ? 'withdrawing' : '', condOn(t, 'inspired') ? 'inspired' : '', condOn(t, 'quickened') ? 'quickened' : '', condOn(t, 'sharpened') ? 'sharpened' : '', t.hidden ? 'hidden' : ''].filter(Boolean);
}
register({
  id: 'trickster.rewrite', claims: 'all',
  actions: [
    {
      id: 'rewrite', label: 'Rewrite', scope: ['combat'], target: 'enemy', ap: 3, uses: { per: 'per_turn', n: 1 },
      available: (h) => { const e = evokerReady(h); if (e) return e; if ((h.u!.mg!.charge || 0) < 3) return 'Needs 3 charge.'; return true; },
      preview: (h, args) => { const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {}; const r = MOVE_RANGE + (u.mg?.rangeBonus || 0);
        if (dist(u.pos, t.pos) > r) return { ok: false, why: 'Out of range (' + r + ' tiles).' }; if (!lineOfSight(cb, u.pos, t.pos)) return { ok: false, why: 'No line of sight.' };
        const f = flippable(t); return { lines: [f.length ? 'Flips ' + f[0] + ' (Brain save vs ' + (12 + unitStrength(u, 'brain_power')) + ').' : t.name + ' shows no state the engine knows: the Narrator picks what flips.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, r0 = rng as Rng; u.mg!.charge -= 3; u.mg!.cast = true;
        const r = d20(r0), m = unitSave(t, 'brain'), tn = 12 + unitStrength(u, 'brain_power'), ok = r === 20 || (r !== 1 && r + m >= tn);
        let line = u.name + ' rewrites ' + t.name + ' (Brain save d20 ' + r + ' ' + fmt(m) + ' vs ' + tn + ')';
        if (ok) { say(cb, line + ' · resists' + addFlux(cb, u, 1) + '.'); return; }
        const f = flippable(t)[0], st = stateOf(h);
        switch (f) {
          case 'overwatch': dropHeldShot(cb, t, 'Rewrite'); useReaction(cb, t); line += ' · its held shot is gone'; break;
          case 'shield': { const n = Math.min(t.shield || 0, Math.floor(30 * (u.mg?.sigilMult || 1))); t.shield = 0; line += ' · the shield turns on it' + harm(cb, r0, u, t, n, 'sigil'); break; }
          case 'braced': case 'emplaced': t.braced = false; endCond(t, 'emplaced', cb); line += applyCond(cb, r0, u, t, 'prone', undefined, undefined, { skipSave: true, via: 'brain_power' }); break;
          case 'guarded': case 'withdrawing': { const left = t.conds![f]; endCond(t, f, cb); t.def -= 2; (st.def ||= []).push({ id: t.id, until: cb.round + left }); line += ' · its guard becomes an opening (−2 Defense, ' + left + ' round' + (left === 1 ? '' : 's') + ')'; break; }
          case 'inspired': { const left = t.conds!.inspired; endCond(t, 'inspired', cb); (st.hit ||= []).push({ id: t.id, until: cb.round + left }); line += ' · its nerve turns (−2 to hit, ' + left + ' round' + (left === 1 ? '' : 's') + ')'; break; }
          case 'quickened': endCond(t, 'quickened', cb); t.dazedNext = 1; line += ' · its haste turns to a stagger (Dazed: −2 AP on its next turn)'; break;
          case 'sharpened': endCond(t, 'sharpened', cb); (st.blunt ||= []).push({ id: t.id, until: cb.round + 2 }); line += ' · its edge turns (−3 to hit and ×0.8 damage on its next attack)'; break;
          case 'hidden': line += reveal(cb, t, 'rewritten') + applyCond(cb, r0, u, t, 'marked', undefined, undefined, { skipSave: true, via: 'brain_power' }); break;
          default: line += ' · no state the engine knows: the Narrator rules what flips'; note(h, t.name + ' failed the Rewrite save: pick the opposite of one of its exotic buffs, until it would have ended.');
        }
        say(cb, line + addFlux(cb, u, 1) + '.'); checkOver(cb);
      },
    },
    {
      id: 'rewrite_story', label: 'Rewrite', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Flip a blessing, ward or advantage someone relies on (pick who and what). The engine rolls their Brain save; the Narrator rules the flip.',
      available: (h) => (h.c && hasEvoker(h.c) ? (evoChargeNow(h.c) < 3 ? 'Needs 3 charge in the core.' : true) : 'Needs an Evoker in hand.'),
      run: (h, args) => {
        const c = h.c!; c.evoCharge = evoChargeNow(c) - 3; const r = d20(h.g.rng), tn = 12 + strengthOf(c, 'brain_power'), ok = r === 20 || (r !== 1 && r >= tn);
        const eid = postStory(h, c.name + ' rewrites: "' + String(args.text).slice(0, 160) + '"');
        pendRuling(h.g, c, h.key, 'Rewrite on "' + String(args.text).slice(0, 120) + '": Brain save d20 ' + r + ' + their Rumination modifier vs ' + tn + ' (a plain d20 ' + (ok ? 'already holds' : 'fails without help') + '). On a failure one helpful state flips to its opposite until it ends: rule which.', eid || undefined);
      },
    },
  ],
  on: {
    attack_preview: (ctx, h) => {
      const now = h.cb?.round ?? 0, st = stateOf(h); if (!ctx.att || !ctx.terms) return;
      if ((st.hit || []).some((x: any) => x.id === ctx.att.id && now < x.until)) ctx.terms.push({ v: -2, label: 'Rewritten' });
      if ((st.blunt || []).some((x: any) => x.id === ctx.att.id && now < x.until)) ctx.terms.push({ v: -3, label: 'Rewritten (Sharpened)' });
    },
    damage_out: (ctx, h) => { const now = h.cb?.round ?? 0; if (ctx.att && !ctx.spell && (stateOf(h).blunt || []).some((x: any) => x.id === ctx.att.id && now < x.until)) ctx.mults.push({ v: 0.8, label: 'Rewritten (Sharpened)' }); },
    // The turned edge is spent on that attack, hit or miss.
    on_hit: (ctx, h) => { const st = stateOf(h); if (st.blunt?.length && ctx.att) st.blunt = st.blunt.filter((x: any) => x.id !== ctx.att.id); },
    on_miss: (ctx, h) => { const st = stateOf(h); if (st.blunt?.length && ctx.att) st.blunt = st.blunt.filter((x: any) => x.id !== ctx.att.id); },
    round_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb!; if (!cb) return;
      if (st.blunt?.length) st.blunt = st.blunt.filter((x: any) => cb.round < x.until);
      if (!st.def?.length) return;
      for (const x of st.def.filter((x: any) => cb.round >= x.until)) { const t = unitById(cb, x.id); if (t && !t.dead) t.def += 2; }
      st.def = st.def.filter((x: any) => cb.round < x.until);
    },
  },
  brief: () => 'Rewrite on an exotic buff or in the story: the Narrator picks the opposite.',
});

// ======================================================================================================== CHANNELER
// Strain is the shared Emanator rule (magic.ts). Outburst toggles ride on combat/outburst as mods (Storm Front, Heart
// Surge). One release at a time is being resolved: `rel` names it for the hooks inside releaseAt (cleared by identity).
const isDamageDesign = (d: any) => !!d && (d.school === 'damage' || d.school2 === 'damage') && !(d.modules || []).includes('inverse');
const baseStrain = (cb: Combat) => (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1);
let rel: null | { cb: Combat; u: Unit; at: number; surge?: boolean; status?: boolean; mend?: boolean } = null;
const releasing = (h: Holder, what: 'surge' | 'status' | 'mend') => !!rel && rel.cb === h.cb && rel.u === h.u && !!rel[what] && !!h.cb && h.cb.log.length === rel.at;
function markRelease(h: Holder, ctx: any, what: 'surge' | 'status' | 'mend') {
  if (!rel || rel.cb !== h.cb || rel.u !== h.u || rel.at !== h.cb!.log.length) rel = { cb: h.cb!, u: h.u!, at: h.cb!.log.length };
  rel[what] = true; void ctx;
}

// ---------- Shape (rank I, passive; rules 1.5) ----------
// Your first Pump each turn that would cost AP is free, while the held Outburst is a Damage design (either school).
// Empathy's free Pumps go first; Shape takes the first Pump that still costs AP (item 522, PROVISIONAL). It runs last
// among the Pump's price changes, so a Pump something else already made free doesn't spend it.
register({
  id: 'channeler.shape', claims: 'all', priority: 900,
  on: {
    outburst_pump: (ctx, h) => {
      if (ctx.u !== h.u || !isDamageDesign(ctx.design) || !h.cb) return; const st = stateOf(h);
      if (ctx.preview) { st.shape = ctx.ap > 0 && uses(h).left('per_turn', 1, h.key + '#shape') > 0; if (st.shape) ctx.ap = 0; return; }
      if (st.shape && ctx.ap === 0 && uses(h).take('per_turn', 1, h.key + '#shape')) say(h.cb, 'Shape: the first Pump this turn costs no AP.');
      st.shape = false;
    },
  },
  brief: () => null,
});

// ---------- Storm Front (rank II, once a turn; a toggle on Begin; rules 1.5) ----------
// +10 MP (flat, after the air and your saving), paid at Begin: when the Damage Outburst releases as a Bolt or a Lance,
// once it has landed ('outburst_after'), the storm arcs on to up to 2 more enemies within 2 tiles of the first creature
// it hit (else the first in its area, else the aim),
// nearest first, outside the release's own area: each takes the design's Damage at the release's stage multiplier, one
// roll each where the design rolls (At Once: no roll, half), with its tone's rider at the release's rider stage. The
// area shapes (Wave, Burst, Aura) already reach a crowd: they can't take it (item 523, PROVISIONAL). Enemies only.
const stormable = (d: any) => isDamageDesign(d) && ['bolt', 'lance'].includes(formOf(migrateDesign(d)));
register({
  id: 'channeler.storm_front', claims: 'all',
  toggles: [{ id: 'storm', label: 'Storm Front (+10 MP, arcs to 2 more)', on: ['combat/outburst'],
    available: (h) => (uses(h).left('per_turn', 1, h.key + '#storm') > 0 ? true : 'Once a turn.'),
    preview: () => 'A Bolt or Lance arcs on to up to 2 more enemies within 2 tiles of the first, one roll each, at the stage reached.' }],
  priority: 120,
  on: {
    outburst_cost: (ctx, h) => { if (ctx.u === h.u && !ctx.classMove && modOn(h, 'storm') && stormable(ctx.design)) ctx.mp += 10; },
    outburst_begin: (ctx, h) => { if (ctx.u === h.u && modOn(h, 'storm') && stormable(ctx.design) && uses(h).take('per_turn', 1, h.key + '#storm')) stateOf(h).storm = ctx.design.id; },
    // The preview (rules 1.5 section 7: everyone affected): the arcs it would take, from the first creature in the area
    // (the one it would hit first), with their expected numbers and rolls. A snap cast reads the toggle; a held release
    // the Storm Front paid at Begin.
    outburst_plan: (ctx, h) => {
      const u = h.u!, cb = h.cb!; if (ctx.u !== u || !stormable(ctx.design)) return;
      const held = u.mg?.held?.design === ctx.design.id && stateOf(h).storm === ctx.design.id;
      if (!held && !(modOn(h, 'storm') && uses(h).left('per_turn', 1, h.key + '#storm') > 0)) return;
      const d = migrateDesign(ctx.design), inArea = new Set<string>(ctx.area || []);
      const first: Unit | null = (ctx.targets || []).find((v: Unit) => v !== u) || null, from = first ? first.pos : ctx.aim;
      if (!from) return;
      const more = cb.units.filter((v) => v !== first && v !== u && !v.dead && !v.surrendered && v.side !== u.side && !inArea.has(v.pos) && dist(v.pos, from) <= 2).sort((a, b) => dist(a.pos, from) - dist(b.pos, from) || a.id.localeCompare(b.id)).slice(0, 2);
      for (const t of more) ctx.add(planStrike(cb, u, d, t, ctx.mult, ctx.riderStage, { roll: designRolls(d), bonus: true, via: 'arc', note: 'Storm Front arcs' + (first ? ' from ' + first.name : '') }));
    },
    // After the primary hit (the 'outburst_after' hook): from the first creature the release hit (else the first in
    // its area, else the aim), so the arcs land once the bolt has.
    outburst_after: (ctx, h) => {
      const st = stateOf(h), u = h.u!, cb = h.cb!; if (ctx.u !== u || st.storm !== ctx.design.id) return; st.storm = null;
      const d = migrateDesign(ctx.design), inArea = new Set<string>(ctx.area || []);
      const first: Unit | null = (ctx.hits || [])[0] || (ctx.targets || []).find((v: Unit) => v !== u) || null, from = first ? first.pos : ctx.aim;
      const more = cb.units.filter((v) => v !== first && v !== u && !v.dead && !v.surrendered && v.side !== u.side && !inArea.has(v.pos) && dist(v.pos, from) <= 2).sort((a, b) => dist(a.pos, from) - dist(b.pos, from) || a.id.localeCompare(b.id)).slice(0, 2);
      if (!more.length) { say(cb, 'Storm Front: nobody else within 2 tiles.'); return; }
      const sm = ctx.mult ?? stageMult(ctx.stage), rs = ctx.riderStage ?? riderStage(cb, ctx.stage), rng = rngOf(h, ctx), lines: string[] = [];
      for (const t of more) { emitFx(cb, 'chain', { unit: u.id, from, to: t.pos, target: t.id, element: toneElement(toneOf(d)), storm: true }); lines.push(soulStrike(cb, rng, u, d, t, sm, rs, designRolls(d))); }
      cb.log.push('Storm Front arcs on: ' + lines.join(' · ') + '.');
    },
  },
  brief: () => null,
});

// ---------- Heart Surge (rank III; a toggle on Release or a snap cast; once a turn; rules 1.5) ----------
// The release fires one stage higher: a held Outburst's stage really rises (its tone's rider too); past stage 4, and on a
// snap cast, the multiplier reads one step higher (stage 4: ×2.6, the table's 0.4 step continued; a snap: ×1, stage 1).
// For double the Strain: the Begin's Strain again (1, 2 in Flooded air), added once the release has landed (it can burn
// and short like any Strain). Item 524, PROVISIONAL (1.2's ×2 for +1 Strain is gone: 1.5 already pays for holding).
const SURGE_PAST = 2.6;
register({
  id: 'channeler.heart_surge', claims: 'all',
  toggles: [{ id: 'surge', label: 'Heart Surge (+1 stage at release, double Strain)', on: ['combat/release', 'combat/outburst'],
    available: (h) => (uses(h).left('per_turn', 1, h.key + '#surge') > 0 ? true : 'Once a turn.'), preview: (h) => (h.cb ? '+1 stage at release (past 4: ×' + SURGE_PAST + '); +' + baseStrain(h.cb) + ' Strain after it lands.' : null) }],
  priority: 60,
  on: {
    // A held release: the stage itself rises (the release_cost of the real release, not a preview).
    // The preview (rules 1.5: the same standard as Sigil's) shows the surged stage: ctx.surge true below stage 4, past
    // it the multiplier; nothing is spent.
    outburst_cost: (ctx, h) => { if (ctx.u === h.u && ctx.preview && ctx.release && modOn(h, 'surge') && uses(h).left('per_turn', 1, h.key + '#surge') > 0) ctx.relMult = (ctx.relMult || 1) * stageMult(1) / stageMult(0); },
    release_cost: (ctx, h) => {
      const m0 = h.u?.mg; if (ctx.u === h.u && ctx.preview && m0?.held && modOn(h, 'surge') && uses(h).left('per_turn', 1, h.key + '#surge') > 0) { ctx.surge = m0.held.stage < MAX_STAGE ? true : SURGE_PAST; return; }
      const m = h.u?.mg; if (ctx.u !== h.u || ctx.preview || !m?.held || !modOn(h, 'surge') || !uses(h).take('per_turn', 1, h.key + '#surge')) return;
      const st = stateOf(h); if (m.held.stage < MAX_STAGE) { m.held.stage++; st.surge = 'stage'; } else st.surge = 'past';
      say(h.cb, h.u!.name + '\'s heart surges' + (st.surge === 'stage' ? ': stage ' + m.held.stage + '.' : ' past the full heart.'));
    },
    outburst_begin: (ctx, h) => { if (ctx.u === h.u && !ctx.hold && modOn(h, 'surge') && uses(h).take('per_turn', 1, h.key + '#surge')) { stateOf(h).surge = 'snap'; say(h.cb, h.u!.name + '\'s heart surges.'); } },
    outburst_release: (ctx, h) => {
      const st = stateOf(h); if (ctx.u !== h.u || !st.surge || ctx.wild || ctx.reaction) return;
      if (st.surge === 'snap') ctx.mult = (ctx.mult || 1) * stageMult(Math.min(MAX_STAGE, ctx.stage + 1)) / stageMult(ctx.stage);
      else if (st.surge === 'past') ctx.mult = (ctx.mult || 1) * SURGE_PAST / stageMult(MAX_STAGE);
      st.surge = null; st.owed = (st.owed || 0) + baseStrain(h.cb!); markRelease(h, ctx, 'surge');
    },
    action_done: (ctx, h) => {
      const st = stateOf(h), u = h.u; if (ctx.u !== u || !u || !st.owed || !h.cb) return; const n = st.owed; st.owed = 0; st.surge = null;
      if (!u.dead) say(h.cb, 'Heart Surge: the heart pays for it (+' + n + ' Strain)' + strainUp(h.cb, rngOf(h, ctx), u, n) + '.');
    },
  },
  brief: () => null,
});

// ======================================================================================================== GUARDIAN
// Shields a Guardian makes are tracked (who made the shield on each unit) for Drink It In.
const shieldBy = (h: Holder): Record<string, boolean> => (stateOf(h).shields ||= {});

// ---------- Will Shield (rank I; a Buff-school cast: Soul cast AP, 20 MP base, 1 Strain) ----------
// An ally in Soul reach (4 + range bonus) you can see, or you (PROVISIONAL), gains a shield of 30 × your Healing given
// (× their Healing received) until the fight ends; the higher shield stands. A class cast, so every Guardian has it
// without a design (PROVISIONAL: the plan's Buff option 'shield' for designs needs the design builder; see the notes).
const willShield = (self: boolean): ActionDef => ({
  id: self ? 'will_shield_self' : 'will_shield', label: 'Will Shield' + (self ? ' (yourself)' : ''), scope: ['combat'], target: self ? 'none' : 'ally',
  ap: (h) => (h.u?.mg ? soulPrice(h, 'buff', SCHOOL.buff?.base_cost || 20).ap : 2),
  text: 'A Buff cast: a shield of 30 × your Healing given on ' + (self ? 'yourself' : 'an ally in Soul reach') + ', until the fight ends.',
  available: (h) => { const e = soulReady(h); if (e) return e; const p = soulPrice(h, 'buff', SCHOOL.buff?.base_cost || 20); if (h.u!.mg!.emanator && h.u!.mg!.mp < p.mp) return 'Needs ' + p.mp + ' MP.'; return true; },
  preview: (h, args) => { if (self) return {}; const t = unitById(h.cb!, args.targetId); if (!t) return {}; const p = soulPrice(h, 'buff', SCHOOL.buff?.base_cost || 20); const e = soulAim(h, t.pos, p.range); return e ? { ok: false, why: e } : { lines: ['Will Shield on ' + t.name + ': about ' + Math.floor(30 * healMultOf(h) * (t.healRecv || 1)) + ' (' + p.mp + ' MP, ' + p.strain + ' Strain).'] }; },
  run: (h, args, rng) => {
    const cb = h.cb!, u = h.u!, t = self ? u : unitById(cb, args.targetId)!, p = soulPrice(h, 'buff', SCHOOL.buff?.base_cost || 20);
    const v = grantShield(cb, t, 30 * healMultOf(h), u); shieldBy(h)[t.id] = true;
    emitFx(cb, 'release', { unit: u.id, at: u.pos, to: t.pos, school: 'buff', option: 'shield', stage: 1, wild: false, area: 0, targets: [t.id] });
    say(cb, u.name + ' casts Will Shield on ' + (t === u ? 'themself' : t.name) + ': a ' + v + ' shield (' + p.mp + ' MP' + (u.mg!.emanator ? '' : ' from the air') + ')' + soulPay(h, rng as Rng, p) + '.');
  },
});
register({ id: 'guardian.will_shield', claims: 'all', actions: [willShield(false), willShield(true)], brief: () => null });

// ---------- Drink It In (rank II, a reaction once a round) ----------
// An enemy spell (Outburst, Sigil or a wall's bite) hits a shield you made and the shield takes some of it: gain MP
// equal to the spell's MP cost, or 10 per Sigil word, up to your Max MP (magic.ts puts spellMp / spellWords on the
// damage source). Automatic; policy: off for the fight.
register({
  id: 'guardian.drink_it_in', claims: 'all',
  actions: [policyAction('drink_off', 'Drink It In off', 'off', 'Keep your reaction for something else this fight.'), policyAction('drink_on', 'Drink It In on', 'auto', 'Drink enemy spells that hit your shields (the default).')],
  on: {
    shield_grant: (ctx, h) => { if (ctx.by === h.u && h.u && ctx.n >= (ctx.t.shield || 0)) (stateOf(h).shields ||= {})[ctx.t.id] = true; else if (ctx.by !== h.u && ctx.n > (ctx.t.shield || 0)) { const s = stateOf(h).shields; if (s) delete s[ctx.t.id]; } },
    damage_in: (ctx, h) => {
      const me = h.u!, cb = h.cb!, t: Unit = ctx.t, src = ctx.src;
      if (ctx.phase !== 'shield' || !((t.shield || 0) > 0) || ctx.dmg <= 0 || !stateOf(h).shields?.[t.id]) return;
      if (!src?.by || src.by.side === me.side || !['sigil', 'elemental', 'soul', 'wall'].includes(src.type)) return;
      if (policy(h, 'auto') === 'off' || !alive(me) || !me.mg?.emanator || me.mg.mp >= me.mg.mpMax || !canReact(cb, me)) return;
      useReaction(cb, me);
      // The spell's own price (magic.ts carries it on the damage): an Outburst's MP cost, 10 MP per Sigil word; the old
      // stand-ins (25 for an Outburst, 2 words) only when a source carries neither.
      // Rules 1.5: an elemental Outburst is 'elemental' damage, told from a Sigil by the MP it carries.
      const gain = src.type === 'soul' || src.spellMp != null ? (src.spellMp || SCHOOL.damage?.base_cost || 25) : 10 * (src.spellWords || 2), was = me.mg.mp; me.mg.mp = Math.min(me.mg.mpMax, me.mg.mp + gain);
      emitFx(cb, 'syphon', { unit: me.id, at: me.pos, mp: me.mg.mp - was });
      say(cb, me.name + ' drinks the spell off the shield: +' + (me.mg.mp - was) + ' MP (' + me.mg.mp + '/' + me.mg.mpMax + ').');
    },
  },
  brief: () => null,
});

// ---------- Sanctuary (rank III, once a scene) ----------
// Soul cast AP, 60 MP, 1 extra Strain: a 3×3 zone centred on a tile in Soul reach you can see. Allies inside (you too)
// take half damage until the start of your next turn; it releases at once and can't be held (PROVISIONAL). All damage
// but your own heart's burn (rules 1.5; PROVISIONAL). Out of combat it is the Narrator's (a safe room against a collapse).
register({
  id: 'guardian.sanctuary', claims: 'all',
  actions: [
    {
      id: 'sanctuary', label: 'Sanctuary', scope: ['combat'], target: 'tile', ap: (h) => (h.u?.mg ? soulPrice(h, 'buff', 60, 1).ap : 2), uses: { per: 'per_scene', n: 1 },
      available: (h) => { const e = soulReady(h); if (e) return e; const p = soulPrice(h, 'buff', 60, 1); if (h.u!.mg!.emanator && h.u!.mg!.mp < p.mp) return 'Needs ' + p.mp + ' MP.'; return true; },
      preview: (h, args) => { const t = tileOf(h.cb!, args.tile); if (!t) return {}; const p = soulPrice(h, 'buff', 60, 1), e = soulAim(h, t, p.range); return e ? { ok: false, why: e } : { tiles: around(t, 1), lines: ['Sanctuary on ' + refOf(t) + ' (' + p.mp + ' MP, ' + p.strain + ' Strain).'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = tileOf(cb, args.tile)!, p = soulPrice(h, 'buff', 60, 1);
        cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'sanctuary' as any, tiles: around(t, 1), words: ['sanctuary'], by: u.id, side: u.side, left: 2, mult: 0.5, who: u.name }];
        stateOf(h).zone = cb.zones[cb.zones.length - 1].id;
        emitFx(cb, 'release', { unit: u.id, at: u.pos, to: t, school: 'buff', option: 'sanctuary', stage: 1, wild: false, area: 1, targets: [] });
        say(cb, u.name + ' raises a Sanctuary around ' + refOf(t) + ': allies inside take half damage until ' + u.name + '\'s next turn (' + p.mp + ' MP)' + soulPay(h, rng as Rng, p) + '.');
      },
    },
    {
      id: 'sanctuary_story', label: 'Sanctuary', scope: ['story'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Raise a sanctuary around the party (60 MP): the Narrator rules what it keeps out.',
      available: (h) => (h.c && hasEmanator(h.c) ? (mpNow(h.c) < 60 ? 'Needs 60 MP.' : true) : 'Needs an Emanator in hand.'),
      run: (h, args) => { const c = h.c!; c.mp = mpNow(c) - 60; const eid = postStory(h, c.name + ' raises a Sanctuary' + (args.text ? ': "' + args.text.slice(0, 120) + '"' : '.'));
        pendRuling(h.g, c, h.key, 'Sanctuary out of combat (60 MP paid): a 3×3 safe zone where allies take half damage until the danger passes. Rule what it keeps out.', eid || undefined); },
    },
  ],
  on: {
    damage_in: (ctx, h) => {
      const z: any = (h.cb?.zones || []).find((x: any) => x.id === stateOf(h).zone); if (!z || ctx.phase !== 'reduce') return;
      // Rules 1.5: your own heart's harm (the burn, src.type 'strain'; an old save's Short) isn't halved (item 525).
      const t: Unit = ctx.t; if (t.side !== z.side || !z.tiles.includes(t.pos) || ((ctx.src?.type === 'short' || ctx.src?.type === 'strain') && t === h.u)) return;
      ctx.dmg = Math.ceil(ctx.dmg * 0.5);
    },
    turn_start: (ctx, h) => { if (ctx.u !== h.u) return; const st = stateOf(h); if (!st.zone || !h.cb) return; h.cb.zones = (h.cb.zones || []).filter((x) => x.id !== st.zone); st.zone = null; say(h.cb, h.u!.name + '\'s Sanctuary fades.'); },
  },
  brief: () => 'Sanctuary out of combat: the Narrator rules what it keeps out.',
});

// ======================================================================================================== BARD

// ---------- Inspire (rank I, 1 AP) ----------
// 10 MP, no Strain (without an Emanator: +2 Strain instead, PROVISIONAL): an ally within 6 (not you; no sight needed)
// gets +2 on their next d20 roll: an attack, a save or a check (named "Encouraged" so it never overwrites the Buff
// school's Inspired). One at a time per ally: a second Inspire refreshes, never stacks (PROVISIONAL). Sigil and Soul
// strikes take it too ('spell_roll'). In the story: 10 MP, +2 on the ally's next check.
const encouraged = (g: any): Record<string, string> => (!g ? {} : ((g.story ||= {}).encouraged ||= {}));
const encKey = (u: Unit | null | undefined, c?: Character | null) => c?.id || u?.charId || u?.id || '';
function useEnc(h: Holder, who: string): boolean { const e = encouraged(h.g); if (!e[who] || e[who] !== (h.c?.id || h.u?.charId)) return false; delete e[who]; return true; }
register({
  id: 'bard.inspire', claims: 'all',
  actions: [
    {
      id: 'inspire', label: 'Inspire', scope: ['combat', 'world'], target: 'ally', ap: 1, range: 6,
      available: (h) => { const u = h.u; if (!u) return false; if (condOn(u, 'silenced')) return 'Silenced.'; if (u.mg?.emanator && u.mg.mp < 10) return 'Needs 10 MP.'; if (!u.mg) return 'You have no Soul magic.'; return true; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!; if (t === u) return 'Inspire an ally, not yourself.';
        let out = ''; if (u.mg!.emanator) u.mg!.mp -= 10; else out = strainUp(cb, rng as Rng, u, 2);
        encouraged(h.g)[encKey(t)] = h.c?.id || u.charId || u.id;
        emitFx(cb, 'stance', { unit: t.id, at: t.pos, what: 'inspire' });
        say(cb, u.name + ' inspires ' + t.name + ': +2 on their next roll' + (u.mg!.emanator ? ' (10 MP)' : '') + out + '.');
      },
    },
    {
      id: 'inspire_story', label: 'Inspire', scope: ['story'], target: 'none', ap: 0,
      text: '10 MP: an ally (named in what you say) gets +2 on their next check.',
      available: (h) => (h.c && hasEmanator(h.c) ? (mpNow(h.c) < 10 ? 'Needs 10 MP.' : true) : 'Needs an Emanator in hand.'),
      run: (h, args) => {
        const t = charNamed(h, args); if (!t || t === h.c) return 'Name the ally you inspire.';
        h.c!.mp = mpNow(h.c!) - 10; encouraged(h.g)[t.id] = h.c!.id; postStory(h, h.c!.name + ' inspires ' + t.name + ': +2 on their next check.');
      },
    },
  ],
  on: {
    attack_preview: (ctx, h) => { const who = encKey(ctx.att); if (encouraged(h.g)[who] && encouraged(h.g)[who] === (h.c?.id || h.u?.charId)) ctx.terms.push({ v: 2, label: 'Encouraged' }); },
    attack_roll: (ctx, h) => { useEnc(h, encKey(ctx.att)); },
    spell_roll: (ctx, h) => { if (useEnc(h, encKey(ctx.u))) ctx.add += 2; }, // Sigil and Soul strikes are d20 rolls too
    cond_apply: (ctx, h) => { if (ctx.skipSave || isBoon(ctx.id) || ['marked', 'augment_offline', 'bleeding', 'injured', 'hidden', 'prone'].includes(ctx.id) || ctx.t.side === ctx.by?.side) return; if (useEnc(h, encKey(ctx.t))) ctx.saveAdd += 2; },
  },
  brief: () => null,
});
// Story checks: check_mod reaches every character's handlers; the ally's check takes the +2 here (the Bard's handler).
register({
  id: 'bard.inspire',
  on: { check_mod: (ctx, h) => { const c: Character = ctx.c, e = encouraged(h.g); if (!c || !e[c.id] || e[c.id] !== h.c?.id) return; delete e[c.id]; ctx.add.push({ add: 2, label: 'Encouraged by ' + h.c!.name }); } },
});

// ---------- Mend (rank II) ----------
// Your Buff-school heals heal 40 (not 30) × your Healing given × the stage × the air's Healing multiplier (Thin ×0.75,
// Normal ×1, Rich and Flooded ×1.25; heal() applies the air): an upgrade of every Bard Buff heal, not a separate design
// (PROVISIONAL). The data's AP 0 is the Soul cast AP. Out of combat the area map's casts use the same numbers.
const GIFT_AP = SOUL_AP.begin + SOUL_AP.release, GIFT_STAGE = 1;
const isHealDesign = (d: any) => !!d && (d.school === 'buff' || d.school2 === 'buff') && (!d.option || d.option === 'heal');
register({
  id: 'bard.mend', claims: 'all',
  on: {
    outburst_release: (ctx, h) => { if (ctx.u === h.u && isHealDesign(ctx.design)) markRelease(h, ctx, 'mend'); },
    heal_in: (ctx, h) => { if (ctx.by === h.u && ctx.kind === 'soul' && releasing(h, 'mend')) ctx.n = ctx.n * 40 / 30; },
  },
  brief: () => null,
});

// ---------- Gift (rank III, once a rest) ----------
// Out of combat, hand an ally one of your ready designs (say the ally and the design; else your first design). They
// cast it once with their own AP (rules 1.5: a snap's 3, Begin and Release), on your MP (the design's full price) and
// your Strain (a Begin's), from where they stand, with your numbers; it releases at once at stage 1 (PROVISIONAL). A Gift fails if you are Downed, dead or not in the fight. Hybrid: the
// Narrator rules a Gift cast in the story. In a fight the ally casts it with combat/gift {unitId, aim} (runGift).
export function castGift(cb: Combat, rng: Rng, bard: Unit, ally: Unit, designId: string, aim: string): string | null {
  const m = bard.mg; if (!m || bard.dead || bard.downed) return 'The Gift fails: its giver is down.';
  const d0 = m.designs.find((x) => x.id === designId); if (!d0) return 'That design is gone.';
  const d = migrateDesign(d0), ap = GIFT_AP; if (ally.ap < ap) return 'Needs ' + ap + ' AP.';
  if (formOf(d) !== 'aura' && formOf(d) !== 'wave' && formOf(d) !== 'lance') {
    if (dist(ally.pos, aim) > (d.modules.includes('move') ? 8 : SOUL_REACH) + (m.soulRange || 0)) return 'Out of reach.';
    if (aim !== ally.pos && !d.modules.includes('ether') && !lineOfSight(cb, ally.pos, aim)) return 'No line of sight.';
  } else if (formOf(d) !== 'aura' && aim === ally.pos) return 'Pick a direction (a tile away from them).';
  const cost = designCost(m, d, manaOf(cb)); if (m.emanator && m.mp < cost) return 'The giver has too little MP.';
  ally.ap -= ap; if (m.emanator) m.mp -= cost; shiftMana(cb, -Math.ceil(cost / 10));
  // Cast from the ally's tile with the Bard's numbers: swap positions for the release, then back. Rules 1.5: the Gift
  // goes off at stage 1 (×1), not a snap's stage 0: the Bard filled it before handing it over (item 526, PROVISIONAL).
  const was = bard.pos; bard.pos = ally.pos;
  const held = m.held, apWas = bard.ap;
  try { m.held = { design: d.id, stage: GIFT_STAGE, cost, tone: toneOf(d), form: formOf(d), turns: 0, v: SOUL_REV }; bard.ap = Math.max(bard.ap, SPELL_AP.release); releaseOutburst(cb, rng, bard, formOf(d) === 'aura' ? ally.pos : aim); } finally { bard.pos = was; bard.ap = apWas; m.held = held; }
  cb.log.push(ally.name + ' casts ' + bard.name + '\'s Gift (' + d.name + ').' + strainUp(cb, rng, bard, baseStrain(cb) + (m.emanator ? 0 : 2)));
  return null;
}
/** The ally's cast of a Gift in a fight (combat/gift {unitId, aim}): the Bard in this fight whose Gift (this rest) the
 * ally carries; castGift does the rest. Once: the Gift is spent. */
export function runGift(g: any, cb: Combat, rng: Rng, ally: Unit, aim: string): string | null {
  for (const b of cb.units) {
    if (b === ally || !b.charId) continue; const c = g.characters?.[b.charId]; if (!c) continue;
    const h = holderOf({ u: b, cb, c }, 'class:bard.gift'); if (!h) continue; const k = keep({ ...h, g }), gft = k.gift;
    if (!gft || gft.to !== ally.charId || gft.used || gft.stamp !== restStamp({ ...h, g })) continue;
    const err = castGift(cb, rng, b, ally, gft.design, aim); if (!err) gft.used = true; return err;
  }
  return 'You carry no Gift.';
}
register({
  id: 'bard.gift', claims: 'all',
  actions: [{
    id: 'gift', label: 'Gift a design', scope: ['story', 'world'], target: 'text', ap: 0, uses: { per: 'per_rest', n: 1 },
    text: 'Hand an ally one of your ready designs (say who, and which). They cast it once, on your MP and your Strain.',
    available: (h) => (h.c?.outbursts?.length ? true : 'You have no ready designs.'),
    run: (h, args) => {
      const c = h.c!, t = charNamed(h, args); if (!t || t === c) return 'Name the ally you give it to.';
      const txt = String(args.text || '').toLowerCase(), d = (c.outbursts || []).find((x) => txt.includes(x.name.toLowerCase())) || c.outbursts![0];
      keep(h).gift = { to: t.id, design: d.id, stamp: restStamp(h) };
      const eid = postStory(h, c.name + ' gives ' + t.name + ' a Gift: ' + d.name + '.');
      pendRuling(h.g, c, h.key, t.name + ' carries ' + c.name + '\'s Gift (' + d.name + ', ' + d.school + '): cast once with their AP, on ' + c.name + '\'s MP and Strain. If it is cast in the story, rule it.', eid || undefined);
    },
  }],
  on: {
    combat_start: (ctx, h) => { const gft = keep(h).gift; if (!gft || gft.stamp !== restStamp(h) || !h.cb) return; const t = h.g?.characters?.[gft.to], d = (h.c?.outbursts || []).find((x) => x.id === gft.design);
      if (t && d && !gft.used) h.cb.log.push(t.name + ' carries ' + (h.c?.name || '') + '\'s Gift (' + d.name + '): Cast the Gift on their turn.'); },
  },
  brief: () => 'A Gift cast in the story (or by the ally in a fight, until the engine can) is the Narrator\'s to rule.',
});

// ======================================================================================================== HEXER
// The Status-school release in progress (Mind Fog): marked through `rel`.

// ---------- Dread (rank I, passive) ----------
// Status Outbursts that inflict Fear cost 5 MP less (after the air and your saving, at least 5; the data's +5 meant
// "less", PROVISIONAL), and any Fear you inflict, from any source, lasts 1 round longer. Story Fear (scene-long) is the
// Narrator's: it lasts longer there too.
const isFearDesign = (d: any) => !!d && (d.school === 'status' || d.school2 === 'status') && d.option === 'fear';
register({
  id: 'hexer.dread', claims: 'all',
  on: {
    outburst_cost: (ctx, h) => { if (ctx.u === h.u && isFearDesign(ctx.design)) ctx.mp = Math.max(5, ctx.mp - 5); },
    cond_apply: (ctx, h) => { if (ctx.by === h.u && ctx.id === 'fear') ctx.rounds = (ctx.rounds || 2) + 1; },
  },
  brief: () => 'Fear this Hexer causes in the story lasts longer.',
});

// ---------- Mind Fog (rank II, passive) ----------
// Every Status design can already pick a Brain Debuff (rules 1.2), so the "can inflict" half grants nothing: expanded
// to +2 on the save TN of every condition your Status Outbursts inflict (PROVISIONAL), the Brain Debuffs included.
register({
  id: 'hexer.mind_fog', claims: 'all',
  on: {
    outburst_release: (ctx, h) => { if (ctx.u === h.u && (ctx.design?.school === 'status' || ctx.design?.school2 === 'status')) markRelease(h, ctx, 'status'); },
    cond_apply: (ctx, h) => { if (ctx.by === h.u && releasing(h, 'status')) ctx.tnAdd += 2; },
  },
  brief: () => null,
});

// ---------- Puppet (rank III, once a scene) ----------
// Soul cast AP, 60 MP, 1 extra Strain: a target in Soul reach you can see makes a Heart save (12 + your Will Power debuff
// strength; bosses roll twice and keep the better). The class text wins over conditions.json (Brain, a whole turn):
// on a failure you choose its next ACTION (PROVISIONAL): one move, one attack (on anyone but itself, its allies
// included) or one other action; then it acts as itself with what AP it has left. The engine refuses self-harm by
// attack; harming itself otherwise (walking into fire) is the Narrator's call. In the story the engine rolls the save
// and the Narrator plays out the forced act.
const PUPPET_ACTS = new Set(['moved', 'on_hit', 'on_miss', 'reload']);
register({
  id: 'hexer.puppet', claims: 'all',
  actions: [
    {
      id: 'puppet', label: 'Puppet', scope: ['combat'], target: 'enemy', ap: (h) => (h.u?.mg ? soulPrice(h, 'status', 60, 1).ap : 2), uses: { per: 'per_scene', n: 1 },
      available: (h) => { const e = soulReady(h); if (e) return e; const p = soulPrice(h, 'status', 60, 1); if (h.u!.mg!.emanator && h.u!.mg!.mp < p.mp) return 'Needs ' + p.mp + ' MP.'; return true; },
      preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (!t) return {}; const p = soulPrice(h, 'status', 60, 1), e = soulAim(h, t.pos, p.range); return e ? { ok: false, why: e } : { lines: ['Puppet ' + t.name + ': Heart save vs ' + (12 + unitStrength(h.u!, 'will_power')) + (isBoss(t) ? ' (rolled twice)' : '') + '; ' + p.mp + ' MP.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, p = soulPrice(h, 'status', 60, 1), r0 = rng as Rng;
        const tn = 12 + unitStrength(u, 'will_power'), m = unitSave(t, 'heart'), a = d20(r0), b = isBoss(t) ? d20(r0) : 0, r = Math.max(a, b), ok = r === 20 || (r !== 1 && r + m >= tn);
        let line = u.name + ' reaches for ' + t.name + '\'s strings (Heart save d20 ' + (b ? a + '/' + b : a) + ' ' + fmt(m) + ' vs ' + tn + ')';
        line += ok ? ' · resists' : applyCond(cb, r0, u, t, 'puppeted', 1, 'heart', { skipSave: true, via: 'will_power' }) + ': ' + u.name + ' chooses its next action';
        say(cb, line + ' (' + p.mp + ' MP)' + soulPay(h, r0, p) + '.');
      },
    },
    {
      id: 'puppet_story', label: 'Puppet', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: '60 MP: say who and what they do. The engine rolls their Heart save; the Narrator plays out the forced act.',
      available: (h) => (h.c && hasEmanator(h.c) ? (mpNow(h.c) < 60 ? 'Needs 60 MP.' : true) : 'Needs an Emanator in hand.'),
      run: (h, args) => {
        const c = h.c!; c.mp = mpNow(c) - 60; const r = d20(h.g.rng), tn = 12 + strengthOf(c, 'will_power');
        const eid = postStory(h, c.name + ' reaches for someone\'s strings: "' + String(args.text).slice(0, 160) + '"');
        pendRuling(h.g, c, h.key, 'Puppet: "' + String(args.text).slice(0, 120) + '". Their Heart save: d20 ' + r + ' + their Composure modifier vs ' + tn + ' (a boss rolls again and keeps the better). On a failure they do the one thing asked, never harming themselves directly; rule it.', eid || undefined);
      },
    },
  ],
  on: {
    // One action, then the puppet is itself again (the AI runs the AP it has left).
    moved: (ctx, h) => { if (condSource(ctx.u, 'puppeted') === h.u?.id && !ctx.forced && h.cb && h.cb.order[h.cb.turn] === ctx.u.id) { endCond(ctx.u, 'puppeted', h.cb); say(h.cb, ctx.u.name + ' shakes off the strings.'); } },
    on_hit: (ctx, h) => { if (condSource(ctx.att, 'puppeted') === h.u?.id && h.cb && h.cb.order[h.cb.turn] === ctx.att.id) { endCond(ctx.att, 'puppeted', h.cb); say(h.cb, ctx.att.name + ' shakes off the strings.'); } },
    on_miss: (ctx, h) => { if (condSource(ctx.att, 'puppeted') === h.u?.id && h.cb && h.cb.order[h.cb.turn] === ctx.att.id) { endCond(ctx.att, 'puppeted', h.cb); say(h.cb, ctx.att.name + ' shakes off the strings.'); } },
    reload: (ctx, h) => { if (condSource(ctx.u, 'puppeted') === h.u?.id && h.cb) endCond(ctx.u, 'puppeted', h.cb); },
  },
  brief: () => 'Self-harm by a Puppet (walking into fire, dropping cover) and story Puppets are the Narrator\'s.',
});
void PUPPET_ACTS; void statQuery; void die;
