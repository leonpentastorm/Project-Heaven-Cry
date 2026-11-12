// Class Roster Revision 3, phase B: the 20 new class moves (data/classes.json, `new: true`; the proposal's section 3;
// spec section 14 items 554 and 559-580). Every number is provisional. Each move runs through apply() in a fight;
// where the text has a story side it is said at the move (Occult Library's tone is learned out of a fight); the rest
// are combat-only (classes.json `surface`).
//
// Engine hooks and helpers these lean on (docs/design/perk-runtime.md, "Class Roster Rev 3"): 'cond_apply' /
// 'cond_landed' (saves, immunity, Shrug It Off), 'forced_move' (Anchor), 'move_step' (Anchor's Disengage OA),
// 'move_cost' (free steps: Duck and Roll, Command), 'attack_target' / 'attack_preview' (Duck and Roll), 'reload' and
// the 'ap_cost:<action>' stats (Speed Loader, Core Change, Bleed the Flux: vent and swapCore price through ventAp /
// coreAp), the new 'vent' hook, 'glyph_cost' / 'glyph_drawn', 'analyze' + combat.ts enemyIntent (Read), illusion.ts
// (False Image, Sleight), 'turn_start_pre' (Silver Tongue), the stat 'rider_stage' (magic.ts riderBonus) and the
// 'strain' hook (Eye of the Storm), 'trap_sprung' (Sabotage's rig), the new 'ai_move_risk' (Anchor in the enemy AI).
import { register, stateOf, uses, note, healUnit, emit, immune, postStory, type Holder, type ActionDef, type ActionArgs } from '../effects';
import { tendHook } from '../effects/damage';
import { RALLY_HEAL, mendFactorOf } from '../effects/mending';
import type { Combat, Unit } from '../combat';
import {
  dist, key, xy, alive, unitSees, lineOfSight, standable, refOf, keyOf as refKey, emitFx, objectsOf, objectsAt, paths, stepsFrom, moveUnit,
  previewAttack, isMelee, moveBlockers, moveBlock, sightCheck, enemyIntent, opportunityStrike,
} from '../combat';
import { type Character, mod, healingMult } from '../character';
import { WEAPON, TONE } from '../data';
import { applyCond, endCond, condOn, unitSave, unitStrength, shiftMana } from '../magic';
type Fam = 'body' | 'brain' | 'heart';
import { d20, type Rng } from '../rng';
import { resOf, resGain, resSpend, canReact, useReaction, hide, seenByFoes, HEARING } from '../tactics';
import { addImage, dropImage, imageOfOwner, imageTurnStart, imagesOf, type FalseImage } from '../illusion';
import { makeObject, kindOf } from '../objects';

// =================================================================================================== helpers
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const myTurn = (h: Holder) => !!h.cb && !!h.u && h.cb.order[h.cb.turn] === h.u.id && !h.cb.window;
const rngOf = (h: Holder, ctx?: any): Rng => ctx?.rng || h.g?.rng || { state: 1 };
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const unitById = (cb: Combat, id?: string | null) => (id ? cb.units.find((x) => x.id === id) || null : null);
const isBoss = (t: Unit) => t.tier === 'boss' || t.kind === 'celestial';
const tileOf = (cb: Combat, t?: string) => (!t ? null : /^\d+,\d+$/.test(t) ? t : refKey(t, cb.map));
const free = (cb: Combat, k: string, not?: Unit) => standable(cb.map, k) && !moveBlockers(cb).has(k) && !cb.units.some((v) => v !== not && !v.dead && v.pos === k);
/** The fight a stat query is asked in (statQuery's holder has no fight when actionAp is called with {u} alone). */
const fightOf = (h: Holder): Combat | null => h.cb || (h.g?.combat && h.u && h.g.combat.units.includes(h.u) ? h.g.combat : null);
/** An off-turn policy set for the fight with a 0-AP action (as lane I's Riposte and Interpose). */
const policy = (h: Holder, def: string): string => stateOf(h).policy || def;
const policyAction = (id: string, label: string, value: string, text: string): ActionDef => ({
  id, label, scope: ['combat'], target: 'none', ap: 0, text,
  available: (h) => (policy(h, 'auto') === value ? 'Already set.' : true),
  run: (h) => { stateOf(h).policy = value; say(h.cb, (h.u?.name || 'Someone') + ': ' + label + '.'); },
});
/** A family save against this unit's move: 'cond_apply' {id, fam} first (an immunity cancels it, items add to the
 * save or its TN), then d20 + the target's save against 12 + the mover's strength with the skill that delivers the move (`via`, rules 1.13). */
function famSave(cb: Combat, rng: Rng, by: Unit, t: Unit, id: string, fam: Fam, via: string): { ok: boolean; cancel: string | null; line: string } {
  const ca: any = emit(cb, 'cond_apply', { by, t, id, fam, rounds: 0, skipSave: false, cancel: false, why: '', tnAdd: 0, saveAdd: 0, cb, rng });
  if (ca.cancel) return { ok: true, cancel: ca.why || 'immune', line: t.name + ' is untouched' + (ca.why ? ' (' + ca.why + ')' : '') };
  if (ca.skipSave) return { ok: false, cancel: null, line: 'no save' };
  const r = d20(rng), m = unitSave(t, fam) + (ca.saveAdd || 0), tn = 12 + unitStrength(by, via) + (ca.tnAdd || 0), ok = r === 20 || (r !== 1 && r + m >= tn);
  return { ok, cancel: null, line: fam + ' save ' + (r + m) + ' vs ' + tn + (r === 1 ? ', natural 1' : r === 20 ? ', natural 20' : '') };
}
/** The tile one step on from `from` past `t` (a push), or null off the map. */
function pushTile(cb: Combat, from: Unit, t: Unit): string | null {
  const [ux, uy] = xy(from.pos), [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ux), ty + Math.sign(ty - uy)), [nx, ny] = xy(to);
  return nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h ? null : to;
}
const MACHINE = ['machine', 'turret', 'drone'];
/** Sabotage's targets: machines, turrets and drones (an enemy named a drone or turret counts; robots are people). */
const machineLike = (t: Unit) => MACHINE.includes(t.kind || '') || /drone|turret/i.test(t.name);
/** Field Fix repairs robots, drones, turrets and machines (a Factory Made squadmate is one). */
const repairable = (t: Unit) => ['robot', ...MACHINE].includes(t.kind || '') || (t.held?.traits || []).includes('factory_made');

// ======================================================================================================== DEFENDER
// ---------- Shrug It Off (rank II, reaction, 1 Guard) ----------
// When you gain Bleeding, Slowed, Weakened or Prone, spend 1 Guard and your reaction: it ends at once. The engine sees
// a condition gained through 'cond_landed' (every condition put on through the rules) and, for a hit's own riders
// (a critical's Bleeding, a weapon skill's knockdown), by comparing before and after the hit. Your own choice to go
// prone is not "gaining" it. Policy: on (default) or off for the fight. Combat only (Guard is a fight resource).
const SHRUG = ['bleeding', 'slowed', 'weakened', 'prone'];
function shrug(h: Holder, id: string) {
  const u = h.u!, cb = h.cb!; if (!inFight(h) || policy(h, 'auto') === 'off' || !alive(u)) return;
  const has = id === 'bleeding' ? !!u.bleed : id === 'prone' ? !!u.prone : condOn(u, id); if (!has) return;
  if (resOf(u, 'guard') < 1 || !canReact(cb, u)) return;
  resSpend(u, 'guard', 1); useReaction(cb, u); endCond(u, id, cb);
  emitFx(cb, 'shrug', { unit: u.id, at: u.pos, cond: id });
  say(cb, u.name + ' shrugs it off: no longer ' + (id === 'bleeding' ? 'Bleeding' : id === 'prone' ? 'prone' : id[0].toUpperCase() + id.slice(1)) + ' (1 Guard, ' + resOf(u, 'guard') + ' left; reaction).');
}
register({
  id: 'defender.shrug_it_off', claims: 'all',
  actions: [policyAction('shrug_off', 'Shrug It Off: off', 'off', 'Spend no Guard on Shrug It Off for the rest of this fight.'), policyAction('shrug_on', 'Shrug It Off: on', 'auto', 'Shrug off Bleeding, Slowed, Weakened and Prone the moment they land on you. This is the default.')],
  on: {
    cond_landed: (ctx, h) => { if (ctx.t === h.u && SHRUG.includes(ctx.id)) shrug(h, ctx.id); },
    attack_target: (ctx, h) => { if (ctx.tgt === h.u && inFight(h)) stateOf(h).pre = { bleed: !!h.u!.bleed, prone: !!h.u!.prone }; },
    on_hit: (ctx, h) => {
      if (ctx.tgt !== h.u) return; const st = stateOf(h), pre = st.pre; st.pre = null; if (!pre) return;
      if (!pre.bleed && h.u!.bleed) shrug(h, 'bleeding');
      if (!pre.prone && h.u!.prone) shrug(h, 'prone');
    },
  },
  brief: () => null,
});

// ---------- Anchor (rank III, passive) ----------
// While Braced (the Defender's Brace or a weapon's): no push, pull, shove or knockback moves you (the 'knockback' and
// 'shove' immunities, and every 'forced_move' is cancelled), and nothing knocks you Prone (a Prone 'cond_apply' is
// cancelled; a hit's knockdown is undone). An enemy that starts its turn next to you and then leaves your reach
// provokes your opportunity attack even when it Disengages (a plain walk away already provokes one: the normal rule);
// it costs your reaction as usual. Items that waive opportunity attacks (Unstoppable, Lunge) still waive it. The enemy
// AI counts that blow when it picks where to walk ('ai_move_risk', +10).
const anchored = (u: Unit | null | undefined) => !!u && !!u.braced && alive(u);
register({
  id: 'defender.anchor', claims: 'all', priority: 50, // before Brace's own forced_move (which unbraces)
  stat: (h, stat) => (anchored(h.u) && (stat === 'immune:knockback' || stat === 'immune:shove') ? 1 : 0),
  on: {
    cond_apply: (ctx, h) => { if (ctx.t === h.u && anchored(h.u) && (ctx.id === 'prone' || ctx.id === 'shoved') && !ctx.cancel) { ctx.cancel = true; ctx.why = 'Anchor'; if (h.cb) emitFx(h.cb, 'anchor', { unit: h.u!.id, at: h.u!.pos, what: ctx.id }); } },
    forced_move: (ctx, h) => {
      if (ctx.u !== h.u || !anchored(h.u) || ctx.cancel || ctx.by === h.u) return;
      ctx.cancel = true; if (h.cb) { emitFx(h.cb, 'anchor', { unit: h.u!.id, at: h.u!.pos, what: ctx.how || 'push' }); say(h.cb, h.u!.name + ' is Anchored: not moved.'); }
    },
    attack_target: (ctx, h) => { if (ctx.tgt === h.u && inFight(h)) stateOf(h).pre = { braced: anchored(h.u), prone: !!h.u!.prone }; },
    on_hit: (ctx, h) => {
      if (ctx.tgt !== h.u) return; const st = stateOf(h), pre = st.pre; st.pre = null;
      if (pre?.braced && !pre.prone && h.u!.prone && !h.u!.dead && !h.u!.downed) { h.u!.prone = false; h.u!.braced = true; emitFx(h.cb!, 'anchor', { unit: h.u!.id, at: h.u!.pos, what: 'prone' }); say(h.cb, h.u!.name + ' is Anchored: stays on their feet.'); }
    },
    turn_start: (ctx, h) => { const me = h.u!, u: Unit = ctx.u; if (!inFight(h) || !u || u.side === me.side) return; (stateOf(h).adj ||= {})[u.id] = alive(me) && dist(u.pos, me.pos) <= 1 ? h.cb!.round : -1; },
    move_step: (ctx, h) => {
      const me = h.u!, cb = h.cb!, u: Unit = ctx.u;
      if (!inFight(h) || ctx.how !== 'disengage' || !u || u.side === me.side || cb.order[cb.turn] !== u.id) return;
      if (stateOf(h).adj?.[u.id] !== cb.round || dist(me.pos, ctx.from) > 1 || dist(me.pos, ctx.at) <= 1) return;
      if (!alive(me) || !canReact(cb, me) || immune({ u }, 'opportunity_attack')) return;
      const rw: any = emit(cb, 'reaction_window', { reactor: me, mover: u, kind: 'opportunity', cancel: false, at: ctx.at, cb, rng: ctx.rng }); if (rw.cancel) return;
      { const at = u.pos; u.pos = ctx.from; const ok = previewAttack(cb, me, u, 'melee', { free: true }).ok; u.pos = at; if (!ok) return; }
      useReaction(cb, me); say(cb, me.name + ' is Anchored: ' + u.name + ' can\'t slip away (opportunity attack).');
      emitFx(cb, 'anchor', { unit: me.id, at: me.pos, what: 'oa', target: u.id });
      opportunityStrike(cb, rngOf(h, ctx), me, u, ctx.from);
    },
    ai_move_risk: (ctx, h) => {
      const me = h.u!, cb = h.cb!, u: Unit = ctx.u; if (!inFight(h) || !alive(me) || u.side === me.side || !canReact(cb, me)) return;
      if (stateOf(h).adj?.[u.id] === cb.round && dist(me.pos, ctx.from) <= 1 && dist(me.pos, ctx.to) > 1) ctx.risk += 10;
    },
  },
  brief: () => null,
});

// ======================================================================================================== FIGHTER
// ---------- Shove (rank I, 1 AP) ----------
// An adjacent enemy: push it 1 tile straight away from you, or knock it Prone (you choose). It makes a Body save
// against 12 + your Raw Power strength; a save, an immunity (Heavyworlder, a Braced Anchor) or a blocked tile and it
// holds. A push into a wall, a unit or the map's edge is refused before anything is spent: knock it Prone instead.
// Not the base Shove (2 AP, an opposed roll), which every character keeps.
register({
  id: 'fighter.shove', claims: 'all',
  actions: [{
    id: 'class_shove', label: 'Shove', scope: ['combat'], target: 'enemy', ap: 1, range: 1, pick: ['push', 'prone'], pickLabel: 'Push it back, or knock it down',
    text: 'Push an enemy next to you 1 tile straight back, or knock it Prone: your choice. It makes a Body save against 12 + your strength with Raw Power, and nothing happens if it succeeds.',
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {};
      const how = args.choice === 'prone' ? 'prone' : 'push';
      if (how === 'prone' && t.prone) return { ok: false, why: t.name + ' is already prone.' };
      if (how === 'push') { const to = pushTile(cb, u, t); if (!to || !free(cb, to, t)) return { ok: false, why: 'There is no free tile behind them to push them into. Knock them Prone instead.' }; return { tiles: [to], lines: ['Push ' + t.name + ' to ' + refOf(to) + ' (Body save vs ' + (12 + unitStrength(u, 'raw_power')) + ').'] }; }
      return { lines: ['Knock ' + t.name + ' Prone (Body save vs ' + (12 + unitStrength(u, 'raw_power')) + ').'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, how = args.choice === 'prone' ? 'prone' : 'push', was = t.pos;
      const im = immune({ u: t }, 'shove') || (how === 'push' ? immune({ u: t }, 'knockback') : null);
      if (im) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ', who doesn\'t budge (' + im + ').'); return; }
      const s = famSave(cb, rng as Rng, u, t, how === 'prone' ? 'prone' : 'shoved', 'body', 'raw_power');
      if (s.ok) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ': ' + (s.cancel ? s.line : 'holds firm (' + s.line + ')') + '.'); return; }
      if (how === 'push') {
        const to = pushTile(cb, u, t);
        const fm: any = to && free(cb, to, t) ? emit(cb, 'forced_move', { u: t, by: u, tiles: 1, to, how: 'shove', cancel: false, cb, rng }) : { cancel: true };
        if (fm.cancel || !to) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ': holds firm.'); return; }
        t.pos = to; t.braced = false;
        emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to, ok: true });
        say(cb, u.name + ' shoves ' + t.name + ' back to ' + refOf(to) + ' (' + s.line + ').'); sightCheck(cb); return;
      }
      t.prone = true; t.braced = false; (t.condAt ||= {}).prone = (cb.condSeq = (cb.condSeq || 0) + 1);
      emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: true, prone: true });
      say(cb, u.name + ' knocks ' + t.name + ' Prone (' + s.line + ').');
      emit(cb, 'cond_landed', { by: u, t, id: 'prone', rounds: 0, cb, rng });
    },
  }],
  brief: () => null,
});

// ---------- Unstoppable (rank III, 1 AP, once a scene) ----------
// Until your next turn starts: Fear, Shaken, Slowed and Pinned don't touch you (new ones are cancelled; ones you carry
// are set aside and come back at your next turn start with the rounds they would have had), no opportunity attack is
// taken against you (the 'opportunity_attack' immunity), and you gain 2 Momentum. Momentum still empties at the end of a
// turn with no attack (the class rule). Combat only.
const UNSTOP = ['fear', 'shaken', 'slowed', 'pinned'];
const unstoppable = (h: Holder) => !!stateOf(h).on;
register({
  id: 'fighter.unstoppable', claims: 'all',
  actions: [{
    id: 'unstoppable', label: 'Unstoppable', scope: ['combat'], target: 'none', ap: 1, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: until your next turn starts, Fear, Shaken, Slowed and Pinned don\'t affect you, and nobody gets an opportunity attack on you. You also gain 2 Momentum.',
    run: (h) => {
      const u = h.u!, cb = h.cb!, st = stateOf(h); st.on = true; st.stash = {};
      const set: string[] = [];
      for (const id of UNSTOP) if (condOn(u, id)) { st.stash[id] = { n: u.conds![id], by: u.condBy?.[id] || null, arg: u.condArg?.[id] || null, via: u.condVia?.[id] || null }; endCond(u, id, cb); set.push(id); }
      const got = resGain(u, 'momentum', 2);
      emitFx(cb, 'unstoppable', { unit: u.id, at: u.pos, ignored: set });
      say(cb, u.name + ' is Unstoppable until their next turn' + (set.length ? ' (' + set.join(', ') + ' set aside)' : '') + (got ? ': +' + got + ' Momentum (' + resOf(u, 'momentum') + ')' : '') + '.');
    },
  }],
  stat: (h, stat) => (stat === 'immune:opportunity_attack' && unstoppable(h) ? 1 : 0),
  on: {
    cond_apply: (ctx, h) => { if (ctx.t === h.u && unstoppable(h) && UNSTOP.includes(ctx.id) && !ctx.cancel) { ctx.cancel = true; ctx.why = 'Unstoppable'; } },
    turn_start: (ctx, h) => {
      if (ctx.u !== h.u) return; const st = stateOf(h); if (!st.on) return; st.on = false;
      const u = h.u!, cb = h.cb!, back: string[] = [];
      for (const [id, v] of Object.entries(st.stash || {}) as [string, any][]) {
        const n = v.n - 1; if (n <= 0 || u.dead) continue; // the tick it would have had at the end of the turn you used it
        applyCond(cb, rngOf(h, ctx), unitById(cb, v.by), u, id, n, undefined, { skipSave: true, ...(v.arg ? { arg: v.arg } : {}), ...(v.via ? { via: v.via } : {}) });
        if (u.condFresh) u.condFresh = u.condFresh.filter((x) => x !== id); back.push(id);
      }
      st.stash = {};
      say(cb, u.name + ' is no longer Unstoppable' + (back.length ? ': ' + back.join(', ') + ' back' : '') + '.');
    },
  },
  brief: () => null,
});

// ======================================================================================================== MARKSMAN
// ---------- Speed Loader (rank I, passive) ----------
// Your first main-hand reload each turn costs 1 AP less, never below 1 (stat 'ap_cost:reload'; a Special Ammo load is a
// reload). The turn's first reload spends it even when it was already 1 AP (a quick-release magazine). The off-hand gun
// (priced with ctx.hand 'off') and the reload of both guns at once (3 AP, its own price) neither get it nor spend it; a
// refused reload (full, nothing to load) spends nothing either (spec item 564).
register({
  id: 'marksman.speed_loader', claims: 'all',
  stat: (h, stat, ctx) => {
    if (stat !== 'ap_cost:reload' || ctx?.hand === 'off') return 0; const cb = fightOf(h); if (!cb || overworld(cb) || !h.u) return 0;
    if (uses({ ...h, cb }).left('per_turn', 1, h.key) <= 0) return 0;
    return -Math.min(1, Math.max(0, (ctx?.base ?? 2) - 1));
  },
  on: { reload: (ctx, h) => { if (ctx.u === h.u && !ctx.both && ctx.hand !== 'off' && inFight(h)) uses(h).take('per_turn', 1, h.key); } }, // the off-hand gun's reload isn't its (spec item 564)
  brief: () => null,
});

// ---------- Duck and Roll (rank II, reaction) ----------
// A ranged weapon attack targets you (the first shot of a volley): before it is rolled, you step 1 tile (free, your
// reaction) to the best tile next to you: out of the attacker's sight if one is (the attack then has no target: it is
// not taken, and the attacker keeps its AP), else into cover from it if you aren't in cover now; that cover counts
// −2 to hit for this attack (the step was late: not the usual −5). The step is a real move (traps, opportunity attacks
// and Overwatch apply). No step that helps: no reaction. Policy: on (default) or off. Spells aren't weapon attacks.
let ducking: Unit | null = null;
function duckTile(cb: Combat, me: Unit, att: Unit, mode: string): { k: string; out: boolean } | null {
  const home = me.pos, next = stepsFrom(cb, me.pos, me.id); // the tiles paths() puts 1 away, without searching the whole map for them
  const covered = (() => { const pv = previewAttack(cb, att, me, mode as any, { free: true }); return pv.ok && !!pv.coverTile; })();
  let best: { k: string; out: boolean } | null = null;
  try {
    for (const k of next) {
      if (objectsAt(cb, k).some((o) => !!kindOf(o).hazard)) continue;
      me.pos = k;
      const pv = previewAttack(cb, att, me, mode as any, { free: true });
      if (!pv.ok && /see|sight/i.test(pv.why || '')) { best = { k, out: true }; break; }
      if (!covered && pv.ok && pv.coverTile && !best) best = { k, out: false };
    }
  } finally { me.pos = home; }
  return best;
}
register({
  id: 'marksman.duck_and_roll', claims: 'all',
  actions: [policyAction('duck_off', 'Duck and Roll: off', 'off', 'No automatic Duck and Roll for the rest of this fight.'), policyAction('duck_on', 'Duck and Roll: on', 'auto', 'Duck and roll whenever a shot comes your way and a step would help. This is the default.')],
  on: {
    attack_target: (ctx, h) => {
      const me = h.u!, cb = h.cb!, st = stateOf(h), att: Unit = ctx.att;
      if (st.duck && (ctx.vi === 0 || st.duck.att !== att.id)) st.duck = null; // a new attack
      if (!inFight(h) || ctx.tgt !== me || att.side === me.side || ctx.vi) return;
      const w = WEAPON[att.weapon]; if (ctx.mode === 'melee' || !w || isMelee(w)) return;
      if (policy(h, 'auto') === 'off' || !alive(me) || moveBlock(me) || !canReact(cb, me)) return;
      const d = duckTile(cb, me, att, ctx.mode); if (!d) return;
      useReaction(cb, me); const from = me.pos;
      ducking = me; let err: string | null; try { err = moveUnit(cb, me, d.k, rngOf(h, ctx), 'move'); } finally { ducking = null; }
      if (err) return;
      st.duck = d.out ? null : { att: att.id };
      emitFx(cb, 'duck', { unit: me.id, from, to: me.pos, by: att.id, out: d.out, cover: !d.out });
      say(cb, me.name + ' ducks and rolls to ' + refOf(me.pos) + (d.out ? ': out of ' + att.name + '\'s sight.' : ': into cover (−2 to hit).'));
    },
    move_cost: (ctx, h) => { if (ducking && ctx.u === h.u && ducking === h.u) { ctx.ap = 0; ctx.free = true; } },
    attack_preview: (ctx, h) => { const d = stateOf(h).duck; if (d && ctx.tgt === h.u && ctx.att?.id === d.att) { ctx.ignoreCover = true; ctx.terms.push({ v: -2, label: 'Duck and Roll' }); } },
    volley_end: (_ctx, h) => { stateOf(h).duck = null; },
    on_hit: (ctx, h) => { if (ctx.tgt === h.u && !ctx.volley) stateOf(h).duck = null; },
    on_miss: (ctx, h) => { if (ctx.tgt === h.u && !ctx.volley) stateOf(h).duck = null; },
    turn_end: (_ctx, h) => { stateOf(h).duck = null; },
  },
  brief: () => null,
});

// ======================================================================================================== INFILTRATOR
// ---------- Vanish (rank I, 1 AP, once a turn) ----------
// If no enemy can see you right now (fog, smoke, full cover, the dark), become Hidden (the shared Hidden: each entry
// gives one ambush). Not while Marked. Combat only (the area map keeps its own stay-hidden rules).
register({
  id: 'infiltrator.vanish', claims: 'all',
  actions: [{
    id: 'vanish', label: 'Vanish', scope: ['combat'], target: 'none', ap: 1, uses: { per: 'per_turn', n: 1 },
    text: 'Once a turn: if no enemy can see you right now (fog, smoke, full cover, darkness), you become Hidden. You can\'t Vanish while you are Marked.',
    available: (h) => { const u = h.u; if (!u || !h.cb) return false; if (u.hidden) return 'Already Hidden.'; if (condOn(u, 'marked')) return 'Marked: you can\'t hide.'; if (seenByFoes(h.cb, u)) return 'An enemy can see you. Get out of sight first.'; return true; },
    run: (h) => { const u = h.u!, cb = h.cb!; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'hide' }); say(cb, u.name + ' vanishes' + hide(cb, u, 'Vanish') + '.'); },
  }],
  brief: () => null,
});

// ---------- Field Fix (rank II, 2 AP) ----------
// An adjacent squadmate (not you: your own jam is Clear Jam): clear their jammed weapon (the Heat goes too, as a clear),
// restore their weapon's durability (the base Field Repair's amount, at least 10% of its maximum, with no spare parts),
// or repair a robot, drone, turret or machine (a Factory Made squadmate too) for exactly 20 (a repair, as Field Repair:
// no healing multipliers, not halved by Plug; a Downed one comes back up). The choice is yours; with none, the first that applies in that order. Combat only.
const FIX = ['clear_jam', 'restore_durability', 'repair_machine'] as const;
function fixable(t: Unit): string[] {
  return FIX.filter((x) => (x === 'clear_jam' ? t.jammed : x === 'restore_durability' ? !!t.maxDur && (t.dur ?? t.maxDur) < t.maxDur : repairable(t) && (t.hp < t.maxHp || t.downed)));
}
register({
  id: 'infiltrator.field_fix', claims: 'all',
  actions: [{
    id: 'field_fix', label: 'Field Fix', scope: ['combat'], target: 'ally', ap: 2, range: 1, pick: [...FIX], pickLabel: 'What to fix',
    text: 'Do one thing for an ally next to you: clear their jammed weapon, restore some of their weapon\'s durability, or repair a robot, drone, turret or machine for 20 HP.',
    preview: (h, args) => {
      const t = unitById(h.cb!, args.targetId); if (!t) return {}; if (t === h.u) return { ok: false, why: 'Field Fix works on a squadmate. For your own jammed weapon, use Clear Jam.' };
      const can = fixable(t), what = args.choice || can[0];
      if (!what) return { ok: false, why: 'Nothing to fix on ' + t.name + '.' };
      if (!can.includes(what)) return { ok: false, why: what === 'clear_jam' ? t.name + '\'s weapon isn\'t jammed.' : what === 'restore_durability' ? t.name + '\'s weapon is in full repair.' : repairable(t) ? t.name + ' is undamaged.' : t.name + ' isn\'t a machine.' };
      return { lines: ['Field Fix: ' + what.replace(/_/g, ' ') + ' on ' + t.name + '.'] };
    },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, what = args.choice || fixable(t)[0];
      if (what === 'clear_jam') { t.jammed = false; t.heat = 0; emitFx(cb, 'clear', { unit: t.id, at: t.pos, dur: 1000, by: u.id }); say(cb, u.name + ' clears ' + t.name + '\'s jam (Field Fix).'); return; }
      if (what === 'restore_durability') {
        const prof = u.proficiency || 0, add = Math.ceil(t.maxDur! * Math.max(0.1, 0.1 + 0.05 * (prof - 3)));
        t.dur = Math.min(t.maxDur!, (t.dur ?? 0) + add); emitFx(cb, 'repair', { unit: u.id, target: t.id, at: t.pos, dur: 1400 });
        say(cb, u.name + ' fixes ' + t.name + '\'s weapon: +' + add + ' durability (' + t.dur + '/' + t.maxDur + ').'); return;
      }
      // A repair, not a heal (as Field Repair): exactly 20, no healing multipliers, not halved by Factory Made's Plug.
      const was = t.downed ? 0 : t.hp, up = !!t.downed; t.hp = Math.min(t.maxHp, was + 20); if (up) { t.downed = false; t.saves = { ok: 0, fail: 0 }; }
      emitFx(cb, 'repair', { unit: u.id, target: t.id, at: t.pos, dur: 1400 }); emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp - was, ...(up ? { revive: true } : {}) });
      say(cb, u.name + ' repairs ' + t.name + ': +' + (t.hp - was) + ' HP' + (up ? ', back up' : '') + ' (' + t.hp + '/' + t.maxHp + ').');
    },
  }],
  brief: () => null,
});

// ---------- Sabotage (rank III, 2 AP) ----------
// Either: an adjacent enemy machine, turret or drone is disabled for 2 rounds (Stunned for 2 of its turns: no actions,
// no reactions), or an adjacent barricade stops blocking the way for 2 rounds, or an adjacent emplaced turret object is
// disabled for 2 rounds (the Narrator runs those: a note says so). Or rig your own tile: the next enemy to step onto it
// takes 30 (armour applies) and its walk stops; it makes a Body save against 12 + your Ingenuity strength or is
// Pinned. Your side never springs it and its walks avoid it; the other side can't see it. One rigged tile at a time
// (a new one replaces the old). Combat only.
register({
  id: 'infiltrator.sabotage', claims: 'all',
  // Three actions, one for each way (each its own grid pick): a machine token, a barricade or turret tile, your tile.
  actions: [
    {
      id: 'sabotage', label: 'Sabotage: disable a machine', scope: ['combat'], target: 'enemy', ap: 2, range: 1,
      text: 'Disable an enemy machine, turret or drone next to you for 2 rounds. It takes no turns and no reactions.',
      preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (!t) return {}; if (!machineLike(t)) return { ok: false, why: t.name + ' isn\'t a machine, turret or drone.' }; return { targets: [t.id], lines: ['Disable ' + t.name + ' for 2 rounds.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
        const line = applyCond(cb, rng as Rng, u, t, 'stunned', 2, undefined, { skipSave: true, via: 'ingenuity' });
        emitFx(cb, 'sabotage', { unit: u.id, target: t.id, at: t.pos, rounds: 2, what: 'machine' });
        say(cb, u.name + ' sabotages ' + t.name + ': disabled for 2 rounds' + line + '.');
      },
    },
    {
      id: 'sabotage_object', label: 'Sabotage: a barricade or turret', scope: ['combat'], target: 'tile', ap: 2,
      text: 'Pick a barricade or an emplaced turret next to you. For 2 rounds, the barricade stops blocking the way, or the turret is disabled.',
      preview: (h, args) => {
        const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile); if (!k) return {};
        const o = objectsAt(cb, k).find((x) => x.kind === 'barricade' || x.kind === 'turret'); if (!o) return { ok: false, why: 'No barricade or turret there.' };
        if (dist(u.pos, k) > 1) return { ok: false, why: 'Get next to it first.' };
        return { tiles: [k], lines: ['Disable the ' + o.name.toLowerCase() + ' for 2 rounds.'] };
      },
      run: (h, args) => {
        const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile)!, o: any = objectsAt(cb, k).find((x) => x.kind === 'barricade' || x.kind === 'turret')!;
        if (o.kind === 'barricade') o.sabotaged = cb.round + 2; else { o.disabled = true; o.disabledUntil = cb.round + 2; note(h, 'The emplaced turret at ' + refOf(k) + ' is disabled until round ' + (cb.round + 2) + ': it takes no action.'); }
        (stateOf(h).objs ||= []).push(o.id);
        emitFx(cb, 'sabotage', { unit: u.id, at: k, rounds: 2, what: o.kind });
        say(cb, u.name + ' sabotages the ' + o.name.toLowerCase() + ' at ' + refOf(k) + ': ' + (o.kind === 'barricade' ? 'it no longer blocks the way' : 'disabled') + ' for 2 rounds.');
      },
    },
    {
      id: 'rig', label: 'Sabotage: rig your tile', scope: ['combat'], target: 'none', ap: 2,
      text: 'Rig your own tile. The next enemy to step on it takes 30 damage and makes a Body save or is Pinned.',
      preview: (h) => { const cb = h.cb!, u = h.u!; if (objectsAt(cb, u.pos).some((o) => !!kindOf(o).trap && !o.resolved && !((o as any).rig === h.key && (o as any).owner === u.id))) return { ok: false, why: 'There is already a trap here.' }; return { tiles: [u.pos], lines: ['Rig ' + refOf(u.pos) + '. The next enemy to step on it takes 30 damage and makes a Body save or is Pinned.'] }; },
      run: (h) => {
        const cb = h.cb!, u = h.u!;
        cb.objects = objectsOf(cb).filter((o) => !((o as any).rig === h.key && (o as any).owner === u.id));
        const id = 'rig' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1);
        cb.objects.push(makeObject(id, 'trap', u.pos, { name: 'Rigged tile', text: 'Rigged by ' + u.name + '.', damage: 30, owner: u.id, side: u.side, rig: h.key, hidden: false } as any));
        emitFx(cb, 'rig', { unit: u.id, at: u.pos, id, only: u.side });
        say(cb, u.name + ' rigs ' + refOf(u.pos) + ' (Sabotage).');
      },
    },
  ],
  on: {
    trap_sprung: (ctx, h) => {
      const o: any = ctx.obj, cb = h.cb!; if (!o || o.rig !== h.key || o.owner !== h.u?.id || !inFight(h)) return;
      const v: Unit = ctx.u; if (v.dead) return;
      say(cb, v.name + ' springs ' + h.u!.name + '\'s rigged tile' + applyCond(cb, rngOf(h, ctx), h.u!, v, 'pinned', undefined, 'body', { via: 'ingenuity' }) + '.');
    },
    round_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb!; if (!st.objs?.length) return;
      for (const o of objectsOf(cb) as any[]) if (st.objs.includes(o.id)) {
        if (o.sabotaged && cb.round >= o.sabotaged) { delete o.sabotaged; say(cb, 'The ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + ' blocks the way again.'); emitFx(cb, 'sabotage_end', { at: o.pos, what: o.kind }); }
        if (o.disabledUntil && cb.round >= o.disabledUntil) { delete o.disabledUntil; delete o.disabled; say(cb, 'The ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + ' comes back online.'); emitFx(cb, 'sabotage_end', { at: o.pos, what: o.kind }); }
      }
      st.objs = st.objs.filter((id: string) => objectsOf(cb).some((o: any) => o.id === id && (o.sabotaged || o.disabledUntil)));
      void ctx;
    },
  },
  brief: () => 'An emplaced turret object the Infiltrator disabled takes no action until the round named.',
});

// ======================================================================================================== MAGE
// ---------- Core Change (rank I, passive) ----------
// Swapping a spent mana core costs 1 AP less, never below 1 (stat 'ap_cost:swap_core'; magic.ts coreAp: 2 → 1).
register({
  id: 'mage.core_change', claims: 'all',
  stat: (h, stat, ctx) => (stat === 'ap_cost:swap_core' ? -Math.min(1, Math.max(0, (ctx?.base ?? 2) - 1)) : 0),
  brief: () => null,
});

// ---------- Bleed the Flux (rank II, passive) ----------
// Venting costs 1 AP less, never below 0 (stat 'ap_cost:vent'; magic.ts ventAp: 1 → 0), and vents 1 more Flux: a Vent
// already empties the Evoker, so the one more is the next Flux you take: the next glyph you draw adds 1 Flux less
// (TWICE 1, not 2), and that point goes into the air then (the meter +1). The credit doesn't stack and lasts the fight.
register({
  id: 'mage.bleed_the_flux', claims: 'all',
  stat: (h, stat, ctx) => (stat === 'ap_cost:vent' ? -Math.min(1, Math.max(0, ctx?.base ?? 1)) : 0),
  on: {
    vent: (ctx, h) => { if (ctx.u !== h.u) return; const st = stateOf(h); if (!st.credit) { st.credit = 1; say(h.cb, h.u!.name + ' bleeds the Flux: the next glyph adds 1 Flux less.'); } },
    glyph_cost: (ctx, h) => { if (ctx.u === h.u && stateOf(h).credit && (ctx.flux || 0) > 0) { ctx.flux -= 1; if (!ctx.preview) stateOf(h).spend = true; } },
    glyph_drawn: (ctx, h) => {
      const st = stateOf(h); if (ctx.u !== h.u || !st.spend || !h.cb) return; st.spend = false; st.credit = 0;
      shiftMana(h.cb, 1, 'bled Flux'); emitFx(h.cb, 'vent', { unit: h.u!.id, at: h.u!.pos, flux: 1, bleed: true });
    },
  },
  brief: () => null,
});

// ======================================================================================================== TRICKSTER
// ---------- Read (rank I, passive) ----------
// Analyze costs 1 AP (the data's action_cost set 1, run by the generic op) and tells you what the target means to do
// on its next turn: combat.ts enemyIntent, the same choices its turn makes, read with a fresh turn's AP and nothing
// rolled or changed. It is kept on the target (readIntent) until its turn ends, and sent as fx 'intent'. An enemy
// already analyzed can't be analyzed again (the Analyze rule), so it is read once.
register({
  id: 'trickster.read', claims: [1],
  on: {
    analyze: (ctx, h) => {
      if (ctx.u !== h.u || !h.cb || !ctx.t) return; const cb = h.cb, t: Unit = ctx.t, it = enemyIntent(cb, t);
      t.readIntent = { ...it, by: h.u!.id, round: cb.round };
      emitFx(cb, 'intent', { unit: h.u!.id, target: t.id, at: t.pos, kind: it.kind, text: it.text, ...(it.targetId ? { targetUnit: it.targetId } : {}), ...(it.to ? { to: it.to } : {}), ...(it.image ? { image: it.image } : {}) });
      say(cb, 'Read: ' + t.name + ' means to ' + it.text + '.');
    },
    turn_end: (ctx, h) => { const t: Unit = ctx.u; if (t?.readIntent && t.readIntent.by === h.u?.id) delete t.readIntent; },
  },
  brief: () => null,
});

// ---------- False Image (rank I, 2 AP, 1 charge) ----------
// A decoy of you on a free tile within 8 + your Sigil range bonus that you can see (the Seal's reach, item 287). Every
// enemy that can see that tile makes a Brain save against 12 + your Brain Power strength; those that fail take it
// for you (illusion.ts: the AI attacks and closes on it, not on you; spells leave you alone). One image at a time; it
// fades at the start of your turn two rounds on, when you fall, or when it is attacked (the attack passes through).
// Needs an Evoker and adds no Flux (it isn't a word). Combat only.
const IMAGE_RANGE = 8;
function evokerWhy(h: Holder): string | null {
  const u = h.u, m = u?.mg; if (!u || !m || !m.evoker) return 'Needs an Evoker in hand.';
  if (u.dead || u.downed) return 'Downed.'; if (condOn(u, 'silenced')) return 'You are Silenced: no magic this round.';
  if (m.lockRound != null && h.cb && h.cb.round <= m.lockRound) return 'Your Evoker overloaded. It is locked until next round.';
  return null;
}
register({
  id: 'trickster.false_image', claims: 'all',
  actions: [{
    id: 'false_image', label: 'False Image', scope: ['combat'], target: 'tile', ap: 2,
    text: 'Costs 1 charge. Needs an Evoker in hand. A decoy of you appears on a free tile you can see within 8 tiles (plus your Sigil range bonus) and lasts 2 rounds. Every enemy that can see it makes a Brain save, and those who fail treat the decoy as you. It fades when it is attacked or when you go down.',
    available: (h) => { if (!h.u) return false; const e = evokerWhy(h); if (e) return e; if ((h.u.mg!.charge || 0) < 1) return 'Needs 1 charge. Swap in a fresh core.'; return true; },
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile); if (!k) return {}; const r = IMAGE_RANGE + (u.mg?.rangeBonus || 0);
      if (k === u.pos) return { ok: false, why: 'Put it on another tile.' };
      if (dist(u.pos, k) > r) return { ok: false, why: 'Out of range (' + r + ' tiles).' };
      if (!unitSees(cb, u, k)) return { ok: false, why: 'You can\'t see that tile.' };
      if (!free(cb, k) || imagesOf(cb).some((i) => i.pos === k)) return { ok: false, why: 'That tile isn\'t free.' };
      return { tiles: [k], sigil: true, lines: ['A False Image at ' + refOf(k) + ': enemies who see it make a Brain save (vs ' + (12 + unitStrength(u, 'brain_power')) + ').'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile)!; u.mg!.charge -= 1; u.mg!.cast = true;
      const img: FalseImage = { id: 'img' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), owner: u.id, pos: k, side: u.side, round: cb.round, fooled: [] };
      const lines: string[] = [];
      for (const e of cb.units) {
        if (e.side === u.side || !alive(e) || !unitSees(cb, e, k)) continue;
        const s = famSave(cb, rng as Rng, u, e, 'false_image', 'brain', 'brain_power');
        if (!s.ok) img.fooled.push(e.id);
        lines.push(e.name + (s.cancel ? ' is untouched (' + s.cancel + ')' : s.ok ? ' sees through it (' + s.line + ')' : ' is fooled (' + s.line + ')'));
      }
      addImage(cb, img);
      say(cb, u.name + ' casts a False Image at ' + refOf(k) + ' (1 charge)' + (lines.length ? ': ' + lines.join(' · ') : ': no enemy sees it') + '.');
    },
  }],
  on: {
    turn_start: (ctx, h) => { if (ctx.u === h.u && h.cb) imageTurnStart(h.cb, h.u!); },
    on_downed: (ctx, h) => { if (ctx.victim === h.u && h.cb) { const i = imageOfOwner(h.cb, h.u!.id); if (i) dropImage(h.cb, i, 'owner down'); } },
  },
  brief: () => null,
});

// ---------- Silver Tongue (rank II, 2 AP) ----------
// An enemy within 6 tiles who can hear you (not a machine, turret or drone: nothing to lie to) makes a Brain save
// against 12 + your Charisma strength, or loses 2 AP on its next turn (a Boss or Celestial 1), through the turn's
// AP (the floor of 2 holds). A second one before that turn doesn't add: the larger stands. Combat only.
register({
  id: 'trickster.silver_tongue', claims: 'all',
  actions: [{
    id: 'silver_tongue', label: 'Silver Tongue', scope: ['combat'], target: 'enemy', ap: 2, range: 6,
    text: 'An enemy within 6 tiles that can hear you makes a Brain save. If it fails, it loses 2 AP on its next turn. A boss or a Celestial loses 1 AP instead. It doesn\'t work on machines, turrets or drones.',
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (!t) return {}; if (machineLike(t)) return { ok: false, why: t.name + ' doesn\'t listen to talk.' }; if (dist(h.u!.pos, t.pos) > Math.min(6, HEARING)) return { ok: false, why: 'Too far to be heard.' }; return { lines: [t.name + ': Brain save vs ' + (12 + unitStrength(h.u!, 'charisma')) + ', or −' + (isBoss(t) ? 1 : 2) + ' AP next turn.'] }; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, s = famSave(cb, rng as Rng, u, t, 'silver_tongue', 'brain', 'charisma'), n = isBoss(t) ? 1 : 2;
      emitFx(cb, 'silver_tongue', { unit: u.id, target: t.id, from: u.pos, to: t.pos, ok: !s.ok, ap: s.ok ? 0 : n });
      if (s.ok) { say(cb, u.name + ' talks at ' + t.name + ': ' + (s.cancel ? s.line : 'it doesn\'t buy it (' + s.line + ')') + '.'); return; }
      const st = stateOf(h), tg = (st.tongue ||= {}); tg[t.id] = Math.max(tg[t.id] || 0, n);
      say(cb, u.name + ' talks ' + t.name + ' round in circles (' + s.line + '): −' + n + ' AP on its next turn.');
    },
  }],
  on: {
    turn_start_pre: (ctx, h) => { const tg = stateOf(h).tongue; const id = ctx.u?.id; if (!tg || !tg[id]) return; ctx.penalties.push({ n: tg[id], why: 'Silver Tongue' }); delete tg[id]; },
  },
  brief: () => null,
});

// ---------- Sleight (rank III, 1 AP, once a scene) ----------
// Swap places with your False Image or a squadmate within 6 tiles who is standing (a Downed one isn't willing or able).
// A swap is no walk: no opportunity attacks, no Overwatch, no traps; both lose Braced. One use a scene between the two
// actions (a squadmate, or the image). Combat only.
const sleightLeft = (h: Holder): true | string => (uses(h).left('per_scene', 1, h.key) > 0 ? true : 'Used until the next scene.');
register({
  id: 'trickster.sleight', claims: 'all',
  // Two actions (a squadmate token, or your image: a button), one use a scene between them.
  actions: [
    {
      id: 'sleight', label: 'Sleight: swap with a squadmate', scope: ['combat'], target: 'ally', ap: 1, range: 6,
      text: 'Once a scene: swap places with a standing ally within 6 tiles. This shares its one use a scene with the False Image swap.',
      available: sleightLeft,
      preview: (h, args) => { const u = h.u!, t = unitById(h.cb!, args.targetId); if (!t) return {}; if (t === u) return { ok: false, why: 'Pick a squadmate.' }; if (!alive(t)) return { ok: false, why: t.name + ' is Downed and can\'t swap.' }; return { tiles: [t.pos], targets: [t.id], lines: ['Swap places with ' + t.name + '.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, from = u.pos, to = t.pos; uses(h).take('per_scene', 1, h.key);
        u.pos = to; t.pos = from; u.braced = false; t.braced = false;
        emitFx(cb, 'swap', { unit: u.id, target: t.id, from, to });
        say(cb, u.name + ' and ' + t.name + ' swap places.');
        emit(cb, 'moved', { u, from, to, tiles: dist(from, to), how: 'swap', forced: false, route: [to], stopped: null, cb, rng });
        emit(cb, 'moved', { u: t, from: to, to: from, tiles: dist(from, to), how: 'swap', forced: false, route: [from], stopped: null, cb, rng });
        sightCheck(cb);
      },
    },
    {
      id: 'sleight_image', label: 'Sleight: swap with your False Image', scope: ['combat'], target: 'none', ap: 1,
      text: 'Once a scene: swap places with your False Image within 6 tiles. This shares its one use a scene with the squadmate swap.',
      available: (h) => { const l = sleightLeft(h); if (l !== true) return l; return h.cb && h.u && imageOfOwner(h.cb, h.u.id) ? true : 'You have no False Image out.'; },
      preview: (h) => {
        const img = imageOfOwner(h.cb!, h.u!.id)!; if (dist(h.u!.pos, img.pos) > 6) return { ok: false, why: 'Your image is out of range (6 tiles).' };
        if (h.cb!.units.some((x) => x !== h.u && !x.dead && x.pos === img.pos)) return { ok: false, why: 'Someone stands on your image.' };
        return { tiles: [img.pos], lines: ['Swap places with your False Image at ' + refOf(img.pos) + '.'] }; },
      run: (h, _args, rng) => {
        const cb = h.cb!, u = h.u!, img = imageOfOwner(cb, u.id)!, from = u.pos, to = img.pos; uses(h).take('per_scene', 1, h.key);
        u.pos = to; img.pos = from; u.braced = false;
        emitFx(cb, 'swap', { unit: u.id, target: img.id, from, to, image: true });
        say(cb, u.name + ' swaps places with the False Image (' + refOf(to) + ').');
        emit(cb, 'moved', { u, from, to, tiles: dist(from, to), how: 'swap', forced: false, route: [to], stopped: null, cb, rng });
        sightCheck(cb);
      },
    },
  ],
  brief: () => null,
});

// ======================================================================================================== BARD
// ---------- Rally (rank III, 2 AP, once a scene) ----------
// Every squadmate within 4 tiles (not you; Downed ones aren't standing to rally) heals 6 × your Healing given × the
// level factor (rules 1.23; it was 20 × Healing given) (×
// their Healing received) and loses Fear and Shaken. Tending others calms your heart once a turn (rules 1.5). No
// Emanator or Supplies needed. Refused with nobody in reach. Combat only.
const rallied = (cb: Combat, u: Unit) => cb.units.filter((t) => t !== u && t.side === u.side && alive(t) && dist(t.pos, u.pos) <= 4);
register({
  id: 'bard.rally', claims: 'all',
  actions: [{
    id: 'rally', label: 'Rally', scope: ['combat'], target: 'none', ap: 2, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: every ally within 4 tiles heals 6 HP × your Healing given, more as you level, and loses Fear and Shaken.',
    preview: (h) => { const ts = rallied(h.cb!, h.u!); if (!ts.length) return { ok: false, why: 'No squadmate within 4 tiles.' }; return { targets: ts.map((t) => t.id), lines: ['Rally ' + ts.map((t) => t.name).join(', ') + ': about ' + Math.floor(20 * (h.c ? healingMult(h.c) : 1)) + ' HP each, and their Fear and Shaken end.'] }; },
    run: (h) => {
      const cb = h.cb!, u = h.u!, mult = h.c ? healingMult(h.c) : 1, ts = rallied(cb, u), parts: string[] = [];
      emitFx(cb, 'rally', { unit: u.id, at: u.pos, radius: 4, targets: ts.map((t) => t.id) });
      for (const t of ts) {
        const r = healUnit(cb, t, RALLY_HEAL * mult * mendFactorOf(u), u, 'rally'), gone = ['fear', 'shaken'].filter((id) => condOn(t, id));
        for (const id of gone) endCond(t, id, cb);
        if (gone.length && !r.restored) tendHook.f?.(cb, u, t);
        emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: r.restored });
        parts.push(t.name + ' +' + r.restored + ' HP' + (gone.length ? ', no longer ' + gone.join(' or ') : ''));
      }
      say(cb, u.name + ' rallies the squad: ' + parts.join(' · ') + '.');
    },
  }],
  brief: () => null,
});

// ======================================================================================================== CHANNELER
// ---------- Iron Heart (rank I, passive) ----------
// Strain limit +1: the data's stat_mod strain_limit, run by the generic op (character.ts strainLimit, the unit's
// mg.strainLimit at the fight's start).
register({ id: 'channeler.iron_heart', brief: () => null });

// ---------- Occult Library (rank II) ----------
// One more ready design (the data's stat_mod ready_designs, generic: character.ts readyDesigns) and one more tone:
// a story action, once (per campaign), out of a fight: learn any element tone you don't know, as from a tutor (no
// Lore Master needed past the first tone's rule (rules 1.8)); it is the scene's one new thing (the magic/learn rule).
const ELEMENT_TONES = () => Object.values(TONE).filter((t: any) => t.element).map((t: any) => t.id as string);
register({
  id: 'channeler.occult_library', claims: [0],
  actions: [{
    id: 'occult_tone', label: 'Occult Library: learn a tone', scope: ['story'], target: 'none', ap: 0, uses: { per: 'per_campaign', n: 1 }, pick: ELEMENT_TONES(), pickLabel: 'The tone',
    text: 'Once only, out of a fight: learn one more Outburst tone of your choice. It counts as the one new thing you can learn this scene.',
    available: (h) => { const c = h.c; if (!c) return false; const kt = c.soulKnown?.tones || []; return ELEMENT_TONES().some((t) => !kt.includes(t)) ? true : 'You know every tone.'; },
    preview: (h, args) => { const c = h.c!, kt = c.soulKnown?.tones || []; if (!args.choice) return { ok: false, why: 'Pick a tone.' }; if (!ELEMENT_TONES().includes(args.choice)) return { ok: false, why: 'No such tone.' }; if (kt.includes(args.choice)) return { ok: false, why: 'You know that tone.' };
      if (h.g?.phase === 'story' && c.learnedScene === h.g?.story?.scene?.n) return { ok: false, why: 'You already learned something new this scene. Only one new thing a scene.' }; return { lines: ['Learn the ' + ((TONE as any)[args.choice]?.name || args.choice) + ' tone.'] }; },
    run: (h, args) => {
      const c = h.c! as Character, k = (c.soulKnown ||= { schools: [], modules: [] }); (k.tones ||= []).push(args.choice!);
      if (h.g?.story?.scene) c.learnedScene = h.g.story.scene.n;
      postStory(h, c.name + ' learns the ' + ((TONE as any)[args.choice!]?.name || args.choice) + ' tone from the occult library in their head.');
    },
  }],
  brief: () => null,
});

// ---------- Eye of the Storm (rank III, 0 AP, once a scene) ----------
// Arm it on your turn: your next Release this turn adds no Strain (any Strain added while it resolves: Heart Surge's
// doubling included; a snap cast's Begin Strain comes before the Release and stays), and its tone's riders count one
// stage higher (stat 'rider_stage'; at most stage 4; a stage-0 release gets stage 1's rider). Unused by the turn's end,
// it is gone (the scene's use spent). Not on a Heart Overwatch or a wild release (they aren't your turn's Release).
const eyeArmed = (h: Holder) => { const a = stateOf(h).armed, cb = h.cb || fightOf(h); return !!a && !!cb && a.round === cb.round && cb.order[cb.turn] === h.u?.id; };
register({
  id: 'channeler.eye_of_the_storm', claims: 'all',
  actions: [{
    id: 'eye_of_the_storm', label: 'Eye of the Storm', scope: ['combat'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene, on your turn: your next Release this turn adds no Strain, and its tone\'s rider counts as one stage higher.',
    available: (h) => { if (!h.u) return false; if (!h.u.mg || !(h.u.mg.designs || []).length) return 'You have no Outbursts.'; if (!myTurn(h)) return 'Only on your turn.'; if (eyeArmed(h)) return 'Already armed.'; return true; },
    run: (h) => { const u = h.u!, cb = h.cb!; stateOf(h).armed = { round: cb.round }; emitFx(cb, 'eye_storm', { unit: u.id, at: u.pos }); say(cb, u.name + ' finds the eye of the storm: the next Release adds no Strain, its rider a stage higher.'); },
  }],
  stat: (h, stat) => (stat === 'rider_stage' && eyeArmed(h) ? 1 : 0),
  on: {
    release_cost: (ctx, h) => { if (ctx.u === h.u && !ctx.preview && eyeArmed(h)) stateOf(h).releasing = true; },
    outburst_release: (ctx, h) => { if (ctx.u === h.u && !ctx.wild && !ctx.reaction && eyeArmed(h)) stateOf(h).releasing = true; },
    strain: (ctx, h) => { if (ctx.u === h.u && stateOf(h).releasing && ctx.n > 0) { say(h.cb, 'Eye of the Storm: the Release adds no Strain (' + ctx.n + ' waived).'); ctx.n = 0; } },
    outburst_after: (ctx, h) => { if (ctx.u === h.u && stateOf(h).releasing) { stateOf(h).armed = null; emitFx(h.cb!, 'eye_storm_spent', { unit: h.u!.id, at: h.u!.pos, riderStage: ctx.riderStage }); } },
    action_done: (ctx, h) => { if (ctx.u === h.u) stateOf(h).releasing = false; },
    turn_end: (ctx, h) => { if (ctx.u === h.u) { const st = stateOf(h); st.armed = null; st.releasing = false; } },
  },
  brief: () => null,
});

// ======================================================================================================== GUARDIAN
// ---------- Command (rank I, 1 AP, once a turn) ----------
// Needs Leadership Squad (Authority 1). A squadmate within 6 tiles (inside hearing), standing and able to move, walks up
// to 2 tiles you pick, now, for no AP (a real walk: opportunity attacks, Overwatch, traps and fear apply; it banks
// nothing). Combat only.
let commanded: Unit | null = null;
const authorityOf = (h: Holder) => h.c?.skills?.authority || 0;
register({
  id: 'guardian.command', claims: 'all',
  actions: [{
    id: 'command', label: 'Command', scope: ['combat'], target: 'ally', ap: 1, range: 6, uses: { per: 'per_turn', n: 1 }, pickLabel: 'The squadmate, then the tile',
    text: 'Once a turn: an ally within 6 tiles moves up to 2 tiles to a tile you pick, right now and for none of their AP. It is a normal move, so it can draw opportunity attacks. Needs 1 point of Authority.',
    available: (h) => (!h.u ? false : authorityOf(h) < 1 ? 'Needs 1 point of Authority.' : true),
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {};
      if (t === u) return { ok: false, why: 'Command a squadmate, not yourself.' };
      const blk = moveBlock(t); if (blk) return { ok: false, why: t.name + ': ' + blk };
      const k = tileOf(cb, args.tile); if (!k) return { ok: false, why: 'Pick the tile they move to (up to 2 tiles).' };
      const P = paths(cb, t.pos, t.id); if (P.dist[k] === undefined || k === t.pos) return { ok: false, why: 'They can\'t reach that tile.' };
      if (P.dist[k] > 2) return { ok: false, why: 'They can move 2 tiles at most.' };
      { const fs = t.condBy?.fear && condOn(t, 'fear') ? unitById(cb, t.condBy.fear) : null; if (fs && !fs.dead && dist(k, fs.pos) < dist(t.pos, fs.pos)) return { ok: false, why: t.name + ' is Afraid of ' + fs.name + '.' }; }
      return { tiles: [k], targets: [t.id], lines: [t.name + ' moves to ' + refOf(k) + ' for none of their AP.'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, k = tileOf(cb, args.tile)!, from = t.pos;
      emitFx(cb, 'command_move', { unit: u.id, target: t.id, from, to: k });
      say(cb, u.name + ' commands ' + t.name + ' to move.');
      commanded = t; let err: string | null; try { err = moveUnit(cb, t, k, rng as Rng, 'move'); } finally { commanded = null; }
      if (err) return err;
    },
  }],
  on: { move_cost: (ctx) => { if (commanded && ctx.u === commanded) { ctx.ap = 0; ctx.free = true; } } },
  brief: () => null,
});

void mod; void lineOfSight; void (null as unknown as ActionArgs);
