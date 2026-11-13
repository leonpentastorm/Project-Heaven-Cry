// Class Roster Revision 3, phase B: the 20 new class moves (data/classes.json, `new: true`; the proposal's section 3;
// spec section 14 items 554 and 559-580). Every number is provisional. Each move runs through apply() in a fight;
// where the text has a story side it is said at the move (Occult Library's tone is learned out of a fight); the rest
// are combat-only (classes.json `surface`).
//
// Engine hooks and helpers these lean on (docs/design/perk-runtime.md, "Class Roster Rev 3"): 'cond_apply' /
// 'cond_landed' (saves, immunity, Shrug It Off), 'forced_move' (Anchor), 'move_step' (Anchor's Disengage OA),
// 'move_cost' (free steps: Duck and Roll, Command), 'attack_target' / 'attack_preview' (Duck and Roll), 'reload' and
// the 'ap_cost:<action>' stats (Speed Loader, Core Change, Bleed the Flux: vent and swapCore price through ventAp /
// coreAp), the new 'vent' hook, 'glyph_cost' / 'glyph_drawn', the trigger 'acted' (action analyze) + combat.ts enemyIntent (Read), illusion.ts
// (False Image, Sleight), 'turn_start_pre' (Silver Tongue), the stat 'rider_stage' (magic.ts riderBonus) and the
// 'strain' hook (Eye of the Storm), 'trap_sprung' (Sabotage's rig), the new 'ai_move_risk' (Anchor in the enemy AI).
import { register, stateOf, uses, note, healUnit, emit, immune, postStory, type Holder, type ActionDef, type ActionArgs } from '../effects';
import { itemAmount } from '../effects/amounts';
import { num, effNum } from '../effects/num';
import { levelFactor } from '../effects/output';
import { withAp, resGive } from '../effects/cost';
import { RULES } from '../data';
import { visFocusWhy, pictureTileWhy, projectionRange, figmentsOf, unravel, makeFigment, isFigment, FIG } from '../figments';
import { ownerOf as ownerOfUnit, ownedBy, unmakeOwned, spawnOwned, runDataVerb, OWNED_DATA_VERBS } from '../owned';
import { tendHook } from '../effects/damage';
import { RALLY_HEAL, mendFactorOf, kitHeal } from '../effects/mending';
import type { Combat, Unit } from '../combat';
import {
  dist, key, xy, alive, unitSees, lineOfSight, standable, refOf, keyOf as refKey, emitFx, objectsOf, objectsAt, paths, stepsFrom, moveUnit,
  previewAttack, isMelee, moveBlockers, moveBlock, sightCheck, enemyIntent, opportunityStrike, displace, swapUnits,
  attackEvent, stepEvent, sideSeesUnit, resolveAttack, hurtUnit, fieldRepair, repairWays, repairable, REPAIR_WAYS,
} from '../combat';
import { type Character, mod, healingMult } from '../character';
import { WEAPON, TONE } from '../data';
import { applyCond, endCond, condOn, unitSave, unitStrength, shiftMana, saveAgainst , saveTn } from '../magic';
import { overworld, say, unitById, tileOf, rngOf, canStand, foesOf, alliesOf, unitsIn } from '../kit';
type Fam = 'body' | 'brain' | 'heart';
import { type Rng } from '../rng';
import { resOf, resGain, resSpend, canReact, react, hide, seenByFoes, HEARING } from '../tactics';
import { makeObject, kindOf } from '../objects';
import { setBraced, setDowned } from '../unitstate';
import { condNotFresh } from '../magic';

// =================================================================================================== helpers
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const myTurn = (h: Holder) => !!h.cb && !!h.u && h.cb.order[h.cb.turn] === h.u.id && !h.cb.window;
const isBoss = (t: Unit) => t.tier === 'boss' || t.kind === 'celestial';
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
  const sv = saveAgainst(cb, rng, by, t, fam, id, { via }); // the one save (rolls.ts): this only shapes its answer for the moves below
  if (sv.skipped === 'immune') return { ok: true, cancel: sv.why || 'immune', line: t.name + ' is untouched' + (sv.why ? ' (' + sv.why + ')' : '') };
  if (sv.skipped === 'no_save') return { ok: false, cancel: null, line: 'no save' };
  return { ok: sv.ok, cancel: null, line: sv.text };
}
/** The tile one step on from `from` past `t` (a push), or null off the map. */
function pushTile(cb: Combat, from: Unit, t: Unit): string | null {
  const [ux, uy] = xy(from.pos), [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ux), ty + Math.sign(ty - uy)), [nx, ny] = xy(to);
  return nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h ? null : to;
}
const MACHINE = ['machine', 'turret', 'drone'];
/** Sabotage's targets: machines, turrets and drones (an enemy named a drone or turret counts; robots are people). */
const machineLike = (t: Unit) => MACHINE.includes(t.kind || '') || /drone|turret/i.test(t.name);

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
  if (resOf(u, 'guard') < 1 || !canReact(cb, u, 'protect')) return;
  react(cb, u, { kind: 'protect' }, () => {
    resSpend(u, 'guard', 1); endCond(u, id, cb);
    emitFx(cb, 'shrug', { unit: u.id, at: u.pos, cond: id });
    say(cb, u.name + ' shrugs it off: no longer ' + (id === 'bleeding' ? 'Bleeding' : id === 'prone' ? 'prone' : id[0].toUpperCase() + id.slice(1)) + ' (1 Guard, ' + resOf(u, 'guard') + ' left; reaction).');
  });
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
      if (pre?.braced && !pre.prone && h.u!.prone && !h.u!.dead && !h.u!.downed) { endCond(h.u!, 'prone', h.cb); setBraced(h.u!, true, !!h.u!.guardBrace); emitFx(h.cb!, 'anchor', { unit: h.u!.id, at: h.u!.pos, what: 'prone' }); say(h.cb, h.u!.name + ' is Anchored: stays on their feet.'); }
    },
    turn_start: (ctx, h) => { const me = h.u!, u: Unit = ctx.u; if (!inFight(h) || !u || u.side === me.side) return; (stateOf(h).adj ||= {})[u.id] = alive(me) && dist(u.pos, me.pos) <= 1 ? h.cb!.round : -1; },
    move_step: (ctx, h) => {
      const me = h.u!, cb = h.cb!, u: Unit = ctx.u;
      if (!inFight(h) || ctx.how !== 'disengage' || !u || u.side === me.side || cb.order[cb.turn] !== u.id) return;
      if (stateOf(h).adj?.[u.id] !== cb.round || dist(me.pos, ctx.from) > 1 || dist(me.pos, ctx.at) <= 1) return;
      if (!alive(me) || !canReact(cb, me, 'attack') || immune({ u }, 'opportunity_attack')) return;
      { const at = u.pos; u.pos = ctx.from; const ok = previewAttack(cb, me, u, 'melee', { free: true }).ok; u.pos = at; if (!ok) return; } // (asked before the window now: react() opens it and spends together)
      react(cb, me, { kind: 'attack', event: stepEvent(u), window: { kind: 'opportunity', mover: u, at: ctx.at, rng: ctx.rng } }, () => {
        say(cb, me.name + ' is Anchored: ' + u.name + ' can\'t slip away (opportunity attack).');
        emitFx(cb, 'anchor', { unit: me.id, at: me.pos, what: 'oa', target: u.id });
        opportunityStrike(cb, rngOf(h, ctx), me, u, ctx.from);
      });
    },
    ai_move_risk: (ctx, h) => {
      const me = h.u!, cb = h.cb!, u: Unit = ctx.u; if (!inFight(h) || !alive(me) || u.side === me.side || !canReact(cb, me, 'attack')) return;
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
    id: 'class_shove', label: 'Shove', scope: ['combat'], target: 'enemy', ap: 'data', range: 1, pick: ['push', 'prone'], pickLabel: 'Push it back, or knock it down',
    text: 'Push an enemy next to you 1 tile straight back, or knock it Prone: your choice. It makes a Body save against 12 + your strength with Raw Power, and nothing happens if it succeeds.',
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {};
      const how = args.choice === 'prone' ? 'prone' : 'push';
      if (how === 'prone' && t.prone) return { ok: false, why: t.name + ' is already prone.' };
      if (how === 'push') { const to = pushTile(cb, u, t); if (!to || !canStand(cb, to, t)) return { ok: false, why: 'There is no free tile behind them to push them into. Knock them Prone instead.' }; return { tiles: [to], lines: ['Push ' + t.name + ' to ' + refOf(to) + ' (Body save vs ' + (saveTn(u, 'raw_power')) + ').'] }; }
      return { lines: ['Knock ' + t.name + ' Prone (Body save vs ' + (saveTn(u, 'raw_power')) + ').'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, how = args.choice === 'prone' ? 'prone' : 'push', was = t.pos;
      const im = immune({ u: t }, 'shove') || (how === 'push' ? immune({ u: t }, 'knockback') : null);
      if (im) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ', who doesn\'t budge (' + im + ').'); return; }
      const s = famSave(cb, rng as Rng, u, t, how === 'prone' ? 'prone' : 'shoved', 'body', 'raw_power');
      if (s.ok) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ': ' + (s.cancel ? s.line : 'holds firm (' + s.line + ')') + '.'); return; }
      if (how === 'push') {
        const mv = displace(cb, rng as Rng, t, { away: u.pos, tiles: 1 }, { by: u, how: 'push', source: 'shove' }); // the one forced move (combat.ts)
        if (!mv.moved) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + ': holds firm.'); return; }
        say(cb, u.name + ' shoves ' + t.name + ' back to ' + refOf(mv.to) + ' (' + s.line + ')' + mv.text + '.'); sightCheck(cb); return;
      }
      // the save above was the save: the condition lands with none (and every item is asked once more, as for any condition)
      // the line is said as it lands, before 'cond_landed' (applyCond tells it once): Shrug It Off's line reads after it
      let fell = false;
      const pr = applyCond(cb, rng as Rng, u, t, 'prone', undefined, undefined, { skipSave: true, via: 'raw_power', onLand: () => {
        fell = true; emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: true, prone: true });
        say(cb, u.name + ' knocks ' + t.name + ' Prone (' + s.line + ').');
      } });
      if (!fell) { emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: was, ok: false }); say(cb, u.name + ' shoves ' + t.name + (pr.startsWith(' · ' + t.name + ' ') ? ', who' + pr.slice(3 + t.name.length) : ': ' + pr.replace(/^ · /, '')) + '.'); }
    },
  }],
  brief: () => null,
});

// ---------- Unstoppable (rank III, 1 AP, once a scene) ----------
// Until your next turn starts: Fear, Shaken, Slowed and Pinned don't touch you (new ones are cancelled; ones you carry
// are set aside and come back at your next turn start with the rounds they would have had), no opportunity attack is
// taken against you (the 'opportunity_attack' immunity), and you gain 2 Momentum. Momentum carries from turn to turn
// (nothing drops it at a turn's end). Combat only.
const UNSTOP = ['fear', 'shaken', 'slowed', 'pinned'];
const unstoppable = (h: Holder) => !!stateOf(h).on;
register({
  id: 'fighter.unstoppable', claims: 'all',
  actions: [{
    id: 'unstoppable', label: 'Unstoppable', scope: ['combat'], target: 'none', ap: 'data', uses: { per: 'per_scene', n: 1 },
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
        condNotFresh(u, id); back.push(id);
      }
      st.stash = {};
      say(cb, u.name + ' is no longer Unstoppable' + (back.length ? ': ' + back.join(', ') + ' back' : '') + '.');
    },
  },
  brief: () => null,
});

// ======================================================================================================== MARKSMAN
// ---------- Speed Loader (rank I, passive): written in data only (data/classes.json; run by effects/triggers.ts, engine foundations 3) ----------

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
      if (policy(h, 'auto') === 'off' || !alive(me) || moveBlock(me) || !canReact(cb, me, 'move')) return;
      const d = duckTile(cb, me, att, ctx.mode); if (!d) return;
      react(cb, me, { kind: 'move', event: attackEvent() }, () => { // its step is a reaction's: it provokes nothing (rules 1.28)
        const from = me.pos;
        ducking = me; let err: string | null; try { err = moveUnit(cb, me, d.k, rngOf(h, ctx), 'move'); } finally { ducking = null; }
        if (err) return;
        st.duck = d.out ? null : { att: att.id };
        emitFx(cb, 'duck', { unit: me.id, from, to: me.pos, by: att.id, out: d.out, cover: !d.out });
        say(cb, me.name + ' ducks and rolls to ' + refOf(me.pos) + (d.out ? ': out of ' + att.name + '\'s sight.' : ': into cover (−2 to hit).'));
      });
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
    id: 'vanish', label: 'Vanish', scope: ['combat'], target: 'none', ap: 'data', uses: { per: 'per_turn', n: 1 },
    text: 'Once a turn: if no enemy can see you right now (fog, smoke, full cover, darkness), you become Hidden. You can\'t Vanish while you are Marked.',
    available: (h) => { const u = h.u; if (!u || !h.cb) return false; if (u.hidden) return 'Already Hidden.'; if (condOn(u, 'marked')) return 'Marked: you can\'t hide.'; if (seenByFoes(h.cb, u)) return 'An enemy can see you. Get out of sight first.'; return true; },
    run: (h) => { const u = h.u!, cb = h.cb!; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'hide' }); say(cb, u.name + ' vanishes' + hide(cb, u, 'Vanish') + '.'); },
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
      id: 'sabotage', label: 'Sabotage: disable a machine', scope: ['combat'], target: 'enemy', ap: 'data', range: 1,
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
      id: 'sabotage_object', label: 'Sabotage: a barricade or turret', scope: ['combat'], target: 'tile', ap: 'data',
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
      id: 'rig', label: 'Sabotage: rig your tile', scope: ['combat'], target: 'none', ap: 'data',
      text: 'Rig your own tile. The next enemy to step on it takes 30 damage and makes a Body save or is Pinned.',
      preview: (h) => { const cb = h.cb!, u = h.u!; if (objectsAt(cb, u.pos).some((o) => !!kindOf(o).trap && !o.resolved && !((o as any).rig === h.key && (o as any).owner === u.id))) return { ok: false, why: 'There is already a trap here.' }; return { tiles: [u.pos], lines: ['Rig ' + refOf(u.pos) + '. The next enemy to step on it takes 30 damage and makes a Body save or is Pinned.'] }; },
      run: (h) => {
        const cb = h.cb!, u = h.u!;
        cb.objects = objectsOf(cb).filter((o) => !((o as any).rig === h.key && (o as any).owner === u.id));
        const id = 'rig' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1);
        cb.objects.push(makeObject(id, 'trap', u.pos, { name: 'Rigged tile', text: 'Rigged by ' + u.name + '.', damage: itemAmount('class:infiltrator.sabotage', 'damage'), owner: u.id, side: u.side, rig: h.key, hidden: false } as any));
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
// ---------- Core Change (rank I, passive): written in data only (data/classes.json; run by effects/triggers.ts, engine foundations 3) ----------

// ---------- Bleed the Flux (rank II, passive) ----------
// Venting costs 1 AP less, never below 0 (data: the generic action_cost; magic.ts ventAp: 1 → 0), and vents 1 more Flux: a Vent
// already empties the Evoker, so the one more is the next Flux you take: the next glyph you draw adds 1 Flux less
// (TWICE 1, not 2), and that point goes into the air then (the meter +1). The credit doesn't stack and lasts the fight.
register({
  id: 'mage.bleed_the_flux', claims: [1], // effect 0 (the Vent's AP) is the generic action_cost (engine foundations 3)
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
    acted: (ctx, h) => {
      if (ctx.action !== 'analyze' || ctx.u !== h.u || !h.cb || !ctx.t) return; const cb = h.cb, t: Unit = ctx.t, it = enemyIntent(cb, t);
      t.readIntent = { ...it, by: h.u!.id, round: cb.round };
      emitFx(cb, 'intent', { unit: h.u!.id, target: t.id, at: t.pos, kind: it.kind, text: it.text, ...(it.targetId ? { targetUnit: it.targetId } : {}), ...(it.to ? { to: it.to } : {}), ...(it.image ? { image: it.image } : {}) });
      say(cb, 'Read: ' + t.name + ' means to ' + it.text + '.');
    },
    turn_end: (ctx, h) => { const t: Unit = ctx.u; if (t?.readIntent && t.readIntent.by === h.u?.id) delete t.readIntent; },
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
    id: 'silver_tongue', label: 'Silver Tongue', scope: ['combat'], target: 'enemy', ap: 'data', range: 6,
    text: 'An enemy within 6 tiles that can hear you makes a Brain save. If it fails, it loses 2 AP on its next turn. A boss or a Celestial loses 1 AP instead. It doesn\'t work on machines, turrets or drones.',
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); if (!t) return {}; if (machineLike(t)) return { ok: false, why: t.name + ' doesn\'t listen to talk.' }; if (dist(h.u!.pos, t.pos) > Math.min(6, HEARING)) return { ok: false, why: 'Too far to be heard.' }; return { lines: [t.name + ': Brain save vs ' + (saveTn(h.u!, 'charisma')) + ', or −' + (isBoss(t) ? 1 : 2) + ' AP next turn.'] }; },
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
// Swap places with one of your Figments or a squadmate within 6 tiles who is standing (rules 1.34: a Figment is willing;
// a Downed squadmate isn't willing or able). A swap is no walk: no opportunity attacks, no Overwatch, no traps; both
// lose Braced. Combat only.
const sleightLeft = (h: Holder): true | string => (uses(h).left('per_scene', 1, h.key) > 0 ? true : 'Used until the next scene.');
register({
  id: 'trickster.sleight', claims: 'all',
  actions: [{
    id: 'sleight', label: 'Sleight', scope: ['combat'], target: 'ally', ap: 'data', range: effNum({ key: 'class:trickster.sleight' }, 'grant_action', 'range'),
    text: 'Once a scene: swap places with one of your Figments or a standing ally within range. No opportunity attacks.',
    available: sleightLeft,
    preview: (h, args) => { const u = h.u!, t = unitById(h.cb!, args.targetId); if (!t) return {}; if (t === u) return { ok: false, why: 'Pick a squadmate or a Figment of yours.' }; if (!alive(t)) return { ok: false, why: t.name + ' is Downed and can\'t swap.' }; if ((t as any).owned && ownerOfUnit(h.cb!, t) !== u && !t.charId) return { ok: false, why: t.name + ' isn\'t yours.' }; return { tiles: [t.pos], targets: [t.id], lines: ['Swap places with ' + t.name + '.'] }; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, from = u.pos, to = t.pos; uses(h).take('per_scene', 1, h.key);
      const sw = swapUnits(cb, rng as Rng, u, t, { by: u, source: 'sleight', willing: [u, t], drawn: () => { emitFx(cb, 'swap', { unit: u.id, target: t.id, from, to }); say(cb, u.name + ' and ' + t.name + ' swap places.'); } }); // both chose it
      if (sw.text) say(cb, sw.text.replace(/^ · /, '') + '.');
      emit(cb, 'moved', { u, from, to, tiles: dist(from, to), how: 'swap', forced: false, route: [to], stopped: null, cb, rng });
      emit(cb, 'moved', { u: t, from: to, to: from, tiles: dist(from, to), how: 'swap', forced: false, route: [from], stopped: null, cb, rng });
      sightCheck(cb);
    },
  }],
  brief: () => null,
});

// ======================================================================================================== RIGGER
// Rules 1.34 (Classes 3.0 step 8; docs/design/figments-spec.md section 5). The Rigger's moves need no Visualization
// (a Rigger with Visualization 0 still has them). Each is an action here because what it does is a branch on a unit
// the move finds (a wreck, a Figment, a machine) that no item op names: the ops it would need are listed in the step's
// hand-off (`spawn` with a weapon taken from a wreck, a pile or a barricade; "act now" on an owned unit; a wreck as a
// target). Every number is the move's data (num, itemAmount).

// ---------- Double (rank I, 2 AP, 1 charge; the old False Image key) ----------
// A bare Double appears within projection range (the door's, else no_door), outside the held count, no upkeep, and
// lasts until its owner's turn start `rounds` rounds on. One at a time. Needs the Visualizer in hand.
register({
  id: 'trickster.false_image', claims: 'all',
  actions: [{
    id: 'false_image', label: 'Double', scope: ['combat'], target: 'tile', ap: 'data', res: (h) => ({ vcharge: num(h, 'charge') }),
    text: 'A bare Double of you appears within projection range, outside your held count, with no upkeep. One at a time.',
    available: (h) => { if (!h.u) return false; const no = visFocusWhy(h.u); return no || true; },
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile); if (!k) return {};
      const no = pictureTileWhy(cb, u, k, projectionRange(u, h.c) || num(h, 'range_no_door')); if (no) return { ok: false, why: no };
      return { tiles: [k], lines: ['A Double at ' + refOf(k) + (figmentsOf(cb, u).some((f) => (f as any).owned?.free && (f as any).figment?.form === 'double') ? ' (your Double now fades)' : '') + '.'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile)!;
      for (const f of figmentsOf(cb, u)) if ((f as any).owned?.free && (f as any).figment?.form === 'double') unravel(cb, f, 'a new Double');
      const d = makeFigment(cb, rng as Rng, u, 'double', [], k, { charge: num(h, 'charge'), free: { rounds: num(h, 'rounds') } }); if (typeof d === 'string') return d;
      say(cb, u.name + ' throws a Double at ' + refOf(k) + '.');
      return null;
    },
  }],
  brief: () => null,
});

// ---------- Field Fix (rank I, 2 AP; the Infiltrator's old key) ----------
// The one action field_repair (combat.ts fieldRepair) with no part, no Improvisation gate, a longer reach, and the
// move's own repair amount.
register({
  id: 'infiltrator.field_fix', claims: 'all',
  actions: [{
    id: 'field_fix', label: 'Field Fix', scope: ['combat'], target: 'ally', ap: 'data', range: num({ key: 'class:infiltrator.field_fix' }, 'reach'), pick: [...REPAIR_WAYS], pickLabel: 'What to fix',
    text: 'Field Repair on you or a unit of your side in reach, with no spare part: clear a jam, restore weapon durability, or repair a machine or Figment.',
    preview: (h, args) => {
      const t = unitById(h.cb!, args.targetId); if (!t) return {};
      const can = repairWays(t), what = args.choice || can[0];
      if (!what) return { ok: false, why: 'Nothing to fix on ' + t.name + '.' };
      if (!can.includes(what as any)) return { ok: false, why: what === 'clear_jam' ? t.name + '\'s weapon isn\'t jammed.' : what === 'restore_durability' ? t.name + '\'s weapon is in full repair.' : repairable(t) ? t.name + ' is undamaged.' : t.name + ' isn\'t a machine.' };
      return { lines: ['Field Fix: ' + what.replace(/_/g, ' ') + ' on ' + t.name + '.'] };
    },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
      return withAp(u, Number.POSITIVE_INFINITY, () => fieldRepair(cb, u, { target: t, way: args.choice || null, parts: 0, gate: false, reach: num(h, 'reach'), item: h.key, label: 'Field Fix' }));
    },
  }],
  brief: () => null,
});

// ---------- Salvage (rank II, 1 AP) ----------
// Next to you, one of: a wreck (a destroyed robot, drone, turret or machine of either side) gives `charge` to your
// Visualizer core, each wreck once a fight; one of your Figments is let go with all its charge back; or repair a machine
// or Figment of your side (the move's repair amount). The unit is the first next to you that fits (a wreck not yet
// salvaged; your newest Figment; the most hurt machine or Figment).
const wreckOf = (t: Unit) => t.dead && (repairable(t) || machineLike(t));
function salvageTarget(h: Holder, way: string): Unit | null {
  const cb = h.cb!, u = h.u!, r = num(h, 'reach'), near = [...alliesOf(cb, u, { within: r, dead: true, downed: true }), ...foesOf(cb, u, { within: r, dead: true, downed: true })];
  if (way === 'wreck') return near.find((t) => wreckOf(t) && !uses(h).on(t).used('per_combat')) || null;
  if (way === 'reclaim') return [...figmentsOf(cb, u)].reverse().find((t) => near.includes(t)) || null;
  return near.filter((t) => !t.dead && t.side === u.side && repairable(t) && (t.hp < t.maxHp || t.downed)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}
register({
  id: 'trickster.salvage', claims: 'all',
  actions: [{
    id: 'salvage', label: 'Salvage', scope: ['combat'], target: 'none', ap: 'data', pick: ['wreck', 'reclaim', 'repair'], pickLabel: 'What to salvage',
    text: 'Next to you: charge from a wreck, one of your Figments let go with all its charge back, or a repair.',
    preview: (h, args) => {
      const way = args.choice || 'wreck', t = salvageTarget(h, way);
      if (!t) return { ok: false, why: way === 'wreck' ? 'No wreck next to you (or salvaged already).' : way === 'reclaim' ? 'No Figment of yours next to you.' : 'Nothing of your side next to you needs a repair.' };
      if (way === 'wreck' && !h.u!.mg?.vcarry) return { ok: false, why: 'No Visualizer to charge.' };
      return { targets: [t.id], lines: ['Salvage: ' + way + ' (' + t.name + ').'] };
    },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, way = args.choice || 'wreck', t = salvageTarget(h, way)!;
      if (way === 'wreck') { uses(h).on(t).take('per_combat', 1); const got = resGive(cb, u, 'vcharge', num(h, 'charge'), { c: h.c, why: 'salvage' }); emitFx(cb, 'repair', { unit: u.id, target: t.id, at: t.pos, dur: 1000 }); say(cb, u.name + ' strips the wreck of ' + t.name + ': +' + got + ' Visualizer charge.'); return null; }
      if (way === 'reclaim') { unmakeOwned(cb, t, { refund: true, quiet: true }); say(cb, u.name + ' takes ' + t.name + ' back apart: its charge goes home.'); return null; }
      const n = Math.floor(itemAmount('class:trickster.salvage', 'repair', [{ v: levelFactor('mend', u.level ?? 1), label: 'level' }])), was = t.downed ? 0 : t.hp, up = !!t.downed; t.hp = Math.min(t.maxHp, was + n); if (up) setDowned(t, false);
      emitFx(cb, 'repair', { unit: u.id, target: t.id, at: t.pos, dur: 1400 }); emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp - was, ...(up ? { revive: true } : {}) });
      say(cb, u.name + ' patches ' + t.name + ' with salvage: +' + (t.hp - was) + ' HP (' + t.hp + '/' + t.maxHp + ').'); return null;
    },
  }],
  brief: () => null,
});

// ---------- Overclock (rank II, 1 AP, once a turn) ----------
// A Figment, robot, drone or turret of your side within range that your side sees attacks now, at no AP (its attack of
// up to max_ap AP; the nearest enemy it can reach), and takes `strain`. Never a character (AP for a character is a
// gamma's). The Rigger's "one thing a turn cheaper" (Rev 4 section 2).
const overclockable = (cb: Combat, u: Unit, t: Unit) => !t.charId && !t.dead && !t.downed && t.side === u.side && (isFigment(t) || repairable(t) || machineLike(t)) && !!(t as any).owned;
function overclockVerb(t: Unit): string | null {
  const dv = ((t as any).dataVerbs || []).map((v: string) => OWNED_DATA_VERBS[v]).find((v: any) => v?.attack);
  if (dv) return dv.id;
  const w: any = WEAPON[t.weapon]; return (t as any).owned?.auto?.verb || (w && isMelee(w) ? 'melee' : 'shot');
}
register({
  id: 'trickster.overclock', claims: 'all',
  actions: [{
    id: 'overclock', label: 'Overclock', scope: ['combat'], target: 'ally', ap: 'data', uses: { per: 'per_turn', n: 1 }, range: num({ key: 'class:trickster.overclock' }, 'range'),
    text: 'A Figment or machine of your side in range acts now, at no AP: its attack at the nearest enemy it can reach. It takes strain damage.',
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t) return {};
      if (t.charId) return { ok: false, why: 'Never a squadmate.' }; if (!overclockable(cb, u, t)) return { ok: false, why: t.name + ' isn\'t a Figment or machine of your side.' };
      if (!sideSeesUnit(cb, u.side, t)) return { ok: false, why: 'Your side can\'t see ' + t.name + '.' };
      const foe = overclockFoe(cb, t); if (!foe) return { ok: false, why: t.name + ' has no enemy in reach.' };
      return { targets: [t.id, foe.id], lines: ['Overclock: ' + t.name + ' attacks ' + foe.name + ' now.'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, foe = overclockFoe(cb, t)!, v = overclockVerb(t)!, dv = OWNED_DATA_VERBS[v];
      say(cb, u.name + ' overclocks ' + t.name + '.');
      const no = dv ? runDataVerb(cb, rng as Rng, u, t, dv, { targetId: foe.id, free: num(h, 'max_ap') }) : withAp(t, num(h, 'max_ap'), () => { const pv = previewAttack(cb, t, foe, v as any); if (!pv.ok) return pv.why || 'Not now.'; resolveAttack(cb, rng as Rng, t, foe, v as any, null, { noAp: true }); return null; });
      if (no) return no;
      if (!t.dead) say(cb, t.name + ' strains' + hurtUnit(t, Math.floor(itemAmount('class:trickster.overclock', 'strain', [{ v: levelFactor('deal', u.level ?? 1), label: 'level' }])), true, cb, 'overclock', u) + '.');
      return null;
    },
  }],
  brief: () => null,
});
/** The enemy an overclocked unit attacks: the nearest standing one it can reach with its attack. */
function overclockFoe(cb: Combat, t: Unit): Unit | null {
  const v = overclockVerb(t); if (!v) return null; const dv = OWNED_DATA_VERBS[v];
  const foes = foesOf(cb, t, { hidden: false }).sort((a, b) => dist(t.pos, a.pos) - dist(t.pos, b.pos));
  return foes.find((x) => (dv ? dist(t.pos, x.pos) <= (dv.reach?.tiles ?? 1) && !dv.dash : withAp(t, Number.POSITIVE_INFINITY, () => previewAttack(cb, t, x, v as any).ok))) || null;
}

// ---------- Scrap Turret (rank III, 3 AP, once a scene; was Jury-Rig) ----------
// From a wreck, a pile with a weapon, or a barricade next to you: a turret (an owned unit, turn auto: figments.json
// turret) on a free tile next to it. At each of your turn starts for `rounds` rounds it makes that weapon's plain
// attack (a gun or bow at the nearest enemy it sees in range, a melee weapon at one in its reach; a wreck's or a pile's
// weapon if it has one that is not used up, else the turret block's own), rolling d20 + your Improvisation modifier,
// damage on the weapon profile at your level. One at a time. A machine: Overclock and repairs work on it.
function scrapWeapon(cb: Combat, tile: string): string | null | undefined {
  const wreck = unitsIn(cb, [tile], { dead: true }).find((x) => wreckOf(x)); if (wreck) return WEAPON[wreck.weapon] && !(WEAPON[wreck.weapon] as any).consumable ? wreck.weapon : null;
  const pile = objectsAt(cb, tile).find((o) => o.kind === 'pile'); if (pile) { const w = (pile.items || []).map((x: any) => x.weapon || x.item || x.id).find((id: string) => WEAPON[id] && !(WEAPON[id] as any).consumable && WEAPON[id].category !== 'thrown'); return w || null; }
  if (objectsAt(cb, tile).some((o) => /barricade/.test(o.kind))) return null;
  return undefined; // nothing to build from
}
register({
  id: 'trickster.scrap_turret', claims: 'all',
  actions: [{
    id: 'scrap_turret', label: 'Scrap Turret', scope: ['combat'], target: 'tile', ap: 'data', uses: { per: 'per_scene', n: 1 },
    text: 'From a wreck, a pile with a weapon, or a barricade next to you: a turret that attacks at your turn starts for a few rounds.',
    available: (h) => (h.cb && h.u && ownedBy(h.cb, h.u).some((x) => (x as any).owned?.kind === 'machine' && !x.dead && h.cb!.units.includes(x)) ? 'One turret at a time.' : true),
    preview: (h, args) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile); if (!k) return {};
      if (dist(u.pos, k) > 1) return { ok: false, why: 'Next to you.' };
      if (scrapWeapon(cb, k) === undefined) return { ok: false, why: 'No wreck, pile with a weapon or barricade there.' };
      const at = turretTile(cb, k); if (!at) return { ok: false, why: 'No free tile next to it.' };
      return { tiles: [at], lines: ['A Scrap Turret at ' + refOf(at) + '.'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, k = tileOf(cb, args.tile)!, at = turretTile(cb, k)!, w = scrapWeapon(cb, k) || FIG.turret.weapon;
      const melee = isMelee(WEAPON[w]), block = { ...FIG.turret, weapon: w, auto: { ...FIG.turret.auto, verb: melee ? 'melee' : 'shot' } };
      const tr = spawnOwned(cb, u, FIG.turret.id, at, rng as Rng, { block }); if (typeof tr === 'string') return tr;
      tr.attack = mod(u.proficiency || 0); tr.strength = tr.attack; tr.infiniteAmmo = true; tr.kind = FIG.turret.kind;
      tr.lvlDmg = Math.round(RULES.output.profiles.weapon.k * levelFactor('deal', u.level ?? 1) * 1000) / 1000;
      (tr as any).owned.free = true; (tr as any).owned.left = num(h, 'rounds');
      say(cb, u.name + ' rigs a Scrap Turret at ' + refOf(at) + ' (' + (WEAPON[w]?.name || w) + ').'); sightCheck(cb);
      return null;
    },
  }],
  brief: () => null,
});
/** A free tile next to the turret's source (nearest first, in the map's order). */
function turretTile(cb: Combat, k: string): string | null {
  const [x, y] = xy(k), out: string[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = key(x + dx, y + dy); if (n !== k && canStand(cb, n)) out.push(n); }
  return canStand(cb, k) ? k : out[0] || null;
}

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
    id: 'rally', label: 'Rally', scope: ['combat'], target: 'none', ap: 'data', uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: every ally within 4 tiles heals 6 HP × your Healing given, more as you level, and loses Fear and Shaken.',
    preview: (h) => { const ts = rallied(h.cb!, h.u!); if (!ts.length) return { ok: false, why: 'No squadmate within 4 tiles.' }; return { targets: ts.map((t) => t.id), lines: ['Rally ' + ts.map((t) => t.name).join(', ') + ': about ' + Math.floor(kitHeal(RALLY_HEAL, h.c ? healingMult(h.c) : 1, mendFactorOf(h.u))) + ' HP each, and their Fear and Shaken end.'] }; },
    run: (h) => {
      const cb = h.cb!, u = h.u!, mult = h.c ? healingMult(h.c) : 1, ts = rallied(cb, u), parts: string[] = [];
      emitFx(cb, 'rally', { unit: u.id, at: u.pos, radius: 4, targets: ts.map((t) => t.id) });
      for (const t of ts) {
        const r = healUnit(cb, t, kitHeal(RALLY_HEAL, mult, mendFactorOf(u)), u, 'rally'), gone = ['fear', 'shaken'].filter((id) => condOn(t, id));
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
    id: 'occult_tone', label: 'Occult Library: learn a tone', scope: ['story'], target: 'none', ap: 'data', uses: { per: 'per_campaign', n: 1 }, pick: ELEMENT_TONES(), pickLabel: 'The tone',
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
    id: 'eye_of_the_storm', label: 'Eye of the Storm', scope: ['combat'], target: 'none', ap: 'data', uses: { per: 'per_scene', n: 1 },
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


void mod; void lineOfSight; void (null as unknown as ActionArgs);
