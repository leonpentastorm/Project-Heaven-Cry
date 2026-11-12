// Lane C: weapons, ammo, reactions, explosives. Perks: Running Reload, Rounding Up, Catch, Sleight of Hand, Jury-Rig,
// Hot-Swap, Origami Hands, Trick Shot, Overhaul, Nothing Gets Past, Dance of Iron, Holy Ordnance. Traits: Gun Nut, Old
// School, Spray and Pray, One Shot, Grenadier's Arm, Demolitionist, Blade Recluse, Slicer.
//
// Every item runs every tier in combat, on the area map where it applies, and its story part where it has one; what
// the engine can't judge goes to the Narrator (note / pendRuling / brief). Recommended fixes from the audit (plan
// section 6) are marked PROVISIONAL and listed in the spec (section 14, tags C…) and docs/design/perk-runtime.md.
import { isPressed } from '../physical/pressure';
import { register, stateOf, uses, note, has, modOn, statQuery, actionAp, applyDamage, healUnit, bankAp, emit, PERK_AP_CAP, type Holder } from '../effects';
import { itemAmount, amountMult } from '../effects/amounts';
import { term } from '../effects/output';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import {
  key, xy, dist, alive, refOf, keyOf as refKey, objectsOf, objectsAt, standable, lineOfSight, previewAttack, resolveAttack, reload, clearJam,
  weaponActions, canJam, isMelee, hurtUnit, damageObject, emitFx, checkOver, attackApCost, moveBlockers, moveUnit, sideSees, unitSees, displace
} from '../combat';
import { WEAPON, ITEM } from '../data';
import { mod, packOf, physicalMult, carryLimit, hasMod, collectionOf } from '../character';
import { applyCond, condOn } from '../magic';
import { throwItem, blast, radiusOf, canReact, useReaction, refundReaction, throwRangeOf } from '../tactics';
import { makeObject, kindOf, isTrap, blocksMove } from '../objects';
import { callMarks, callLevel } from '../calls/core';
import { CALL, callStepAt } from '../calls/data';
import { positionsOf } from '../game';
import { overworld, say, unitById, tileOf, rngOf, canStand } from '../kit';
import { rollVs } from '../rolls';

// ---------- small helpers ----------
type Rng = { state: number };
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const tierII = (h: Holder) => h.tier === 'II';
/** A tile from a grid reference ("F6") or a key ("5,5"). */
const charState = (c: Character | null | undefined): Record<string, any> => (c ? ((c as any).state ||= {}) : {});
/** Read a character's item state without creating it (stat queries and previews must not change state). */
const cs = (c: Character | null | undefined): Record<string, any> => (c as any)?.state || {};
/** Do something with the AP check out of the way (a free reload, clear or repair): the AP is given back after. */
function free<T>(u: Unit, f: () => T): T { const keep = u.ap; u.ap = 99; try { return f(); } finally { u.ap = keep; } }
const ownTurn = (cb: Combat, u: Unit) => cb.order[cb.turn] === u.id && !cb.window;
const isMachine = (x: { kind?: string; name?: string } | null | undefined) => !!x && (['robot', 'machine', 'turret', 'drone'].includes(x.kind || '') || /robot|drone|automaton|\bbot\b|turret/i.test(x.name || ''));
const isGun = (w: any) => !!w && !isMelee(w) && w.category !== 'thrown' && w.category !== 'bow' && w.magazine != null;
/** The weapon-skill points behind a skill on a unit (proficiency, dexterity…), with item modifiers. */
const unitMod = (u: Unit, skill: 'proficiency' | 'dexterity' | 'analysis') => mod((u as any)[skill] || 0) + (u.sk?.[skill] || 0);

// ======================================================================================================== PERKS

// ---------- Running Reload (Dexterity β) ----------
// I: once per turn, a move of at least 1 tile can carry a reload, for no extra AP (plan 6b: the move's cost only;
// PROVISIONAL). II: also clear a jam as part of a move (once per turn). Combat: the toggles on Move ("Reload on the
// move", "Clear the jam on the move"), shown only while the held weapon has a reload (or can jam and is jammed).
// Area map: the "Move and reload" action (the area map's Move takes no toggles).
const RR_RELOAD = '#reload', RR_CLEAR = '#clear';
const reloadEntry = (u: Unit) => weaponActions(u).find((x) => x.id === 'reload');
const canReloadNow = (u: Unit) => { const a = reloadEntry(u); return !!a && (a.why == null || /^Needs/.test(a.why)); };
const canClearNow = (u: Unit) => !!u.jammed && weaponActions(u).some((x) => x.id === 'clear');
function runningReload(h: Holder, u: Unit, cb: Combat, wantReload: boolean, wantClear: boolean): string {
  const did: string[] = [];
  if (wantClear && tierII(h) && canClearNow(u) && uses(h).take('per_turn', 1, h.key + RR_CLEAR)) {
    const e = free(u, () => clearJam(cb, u)); if (e) uses(h).refund('per_turn', h.key + RR_CLEAR); else did.push('clears the jam');
  }
  if (wantReload && canReloadNow(u) && uses(h).take('per_turn', 1, h.key + RR_RELOAD)) {
    const e = free(u, () => reload(cb, u, { free: true })); if (e) { uses(h).refund('per_turn', h.key + RR_RELOAD); say(cb, '(Running Reload: ' + e + ')'); } else did.push('reloads');
  }
  if (did.length) say(cb, u.name + ' ' + did.join(' and ') + ' on the move (Running Reload: no extra AP).');
  return did.join(', ');
}
register({
  id: 'running_reload', claims: 'all',
  toggles: [
    { id: 'reload', label: 'Reload on the move', on: ['combat/move'],
      available: (h) => { const u = h.u; if (!u || !reloadEntry(u)) return false; if (uses(h).left('per_turn', 1, h.key + RR_RELOAD) <= 0) return 'Used this turn.'; return canReloadNow(u) ? true : reloadEntry(u)!.why || true; },
      preview: () => 'Reload as you move, for no extra AP. Once a turn.' },
    { id: 'clear', label: 'Clear the jam on the move', on: ['combat/move'],
      available: (h) => { const u = h.u; if (!u || !tierII(h) || !canJam(WEAPON[u.weapon])) return false; if (!u.jammed) return 'Not jammed.'; return uses(h).left('per_turn', 1, h.key + RR_CLEAR) > 0 ? true : 'Used this turn.'; } },
  ],
  actions: [{
    id: 'move_reload', label: 'Move and reload', scope: ['world'], ap: 0, target: 'tile',
    text: 'Once a round: walk to a tile and reload on the way. You pay only the AP for the walk. II: this also clears a jam.',
    available: (h) => (!h.u || !reloadEntry(h.u) ? false : canReloadNow(h.u) || (tierII(h) && canClearNow(h.u)) ? true : reloadEntry(h.u)!.why || 'Nothing to reload.'),
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, to = tileOf(cb, args.tile); if (!to) return 'Pick a tile.';
      const e = moveUnit(cb, u, to); if (e) return e;
      const g = h.g; if (g && h.c) { positionsOf(g)[h.c.id] = u.pos; if (g.story.sneak) g.story.sneak[h.c.id] = false; if (g.story.hidden) g.story.hidden[h.c.id] = false; }
      runningReload(h, u, cb, true, true);
      return null;
    },
  }],
  on: {
    moved: (ctx, h) => {
      if (ctx.u !== h.u || ctx.forced || !inFight(h) || (ctx.tiles || 0) < 1) return;
      const r = modOn(h, 'reload'), c = modOn(h, 'clear'); if (r || c) runningReload(h, h.u!, h.cb!, r, c);
    },
  },
  brief: () => null,
});

// ---------- Rounding Up (Reaction Speed γ) ----------
// I: once per turn, a fractional AP remainder (Glyph AP, 0.5-0.9) rounds up to the next whole AP (plan 6a-7: once per
// turn, so +1 AP at most; it counts toward the +3 perk AP cap; PROVISIONAL). II: once per fight, 1 unspent AP carries
// into your next turn (banked: it counts toward that turn's +3 cap and the 9 ceiling). The area map rounds the same way
// once a round; the story AP pool has no turn to carry into.
register({
  id: 'rounding_up', claims: 'all',
  on: {
    glyph_cost: (ctx, h) => {
      const u = h.u; if (ctx.u !== u || !u) return;
      const left = Math.round((u.ap - ctx.ap) * 10) / 10; if (left < 0) return;
      let frac = Math.round((Math.ceil(left - 1e-9) - left) * 10) / 10; if (frac <= 0) return;
      if (uses(h).left('per_turn', 1) <= 0) return;
      if (!overworld(h.cb)) frac = Math.min(frac, Math.max(0, PERK_AP_CAP - (u.apGained || 0))); if (frac <= 0) return;
      ctx.ap = Math.round((ctx.ap - frac) * 10) / 10;
      if (!ctx.preview) { uses(h).take('per_turn'); if (!overworld(h.cb)) u.apGained = (u.apGained || 0) + frac; say(h.cb, u.name + ' rounds up (Rounding Up): ' + Math.ceil(left - 1e-9) + ' AP left, not ' + left + '.'); }
    },
    turn_end: (ctx, h) => {
      const u = h.u; if (ctx.u !== u || !u || !tierII(h) || !inFight(h) || u.downed || Math.floor(u.ap) < 1) return;
      if (!uses(h).take('per_combat')) return;
      bankAp(u, 1, 'Rounding Up', h.cb);
    },
  },
  brief: () => null,
});

// ---------- Catch (Reaction Speed γ) ----------
// Reaction, uses your one reaction a round (plan 6b: automatic, no roll): a grenade or other thrown item thrown at your
// tile or at an adjacent ally's tile is caught: it doesn't go off there. You hold it; on your turn "Throw it back" is a
// throw at its normal effect for 1 AP (II: 0). Not thrown back by the end of your next turn, it goes off in your hands
// (PROVISIONAL). Placed charges (a satchel) can't be caught. Story: catching a thrown thing is narrated (brief).
register({
  id: 'catch', claims: 'all',
  actions: [{
    id: 'throw_back', label: 'Throw it back', scope: ['combat'], ap: (h) => (tierII(h) ? 0 : 1), target: 'tile',
    text: 'Throw the item you caught at a tile in throwing range. It has its normal effect. II: this costs 0 AP.',
    available: (h) => (h.u && stateOf(h).caught ? true : false),
    preview: (h) => { const c = stateOf(h).caught; return c ? { lines: ['Throw back the caught ' + (WEAPON[c.item]?.name || c.item).toLowerCase() + '.'] } : {}; },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, st = stateOf(h), c = st.caught, tile = tileOf(cb, args.tile); if (!c || !tile) return 'Pick a tile.';
      st.throwing = true; let e: string | null;
      try { e = throwItem(cb, rng, u, c.item, tile); } finally { st.throwing = false; }
      if (e) return e;
      delete st.caught; checkOver(cb); return null;
    },
  }],
  on: {
    throw: (ctx, h) => {
      const d = h.u, cb = h.cb; if (!d || !cb || ctx.preview || !inFight(h)) return;
      const st = stateOf(h);
      if (ctx.u === d) { if (st.throwing) ctx.ap = 0; return; } // the throw back's AP is the action's own
      if (ctx.cancel || ctx.u.side === d.side || !alive(d) || st.caught || !canReact(cb, d)) return;
      if ((WEAPON[ctx.item]?.properties || []).includes('placed')) return;
      const covered = ctx.tile === d.pos || cb.units.some((v) => v !== d && v.side === d.side && alive(v) && v.pos === ctx.tile && dist(v.pos, d.pos) <= 1);
      if (!covered) return;
      useReaction(cb, d);
      ctx.cancel = true; ctx.caughtBy = d; // no blast, no fire left on the tile
      st.caught = { item: ctx.item, by: ctx.u.id, round: cb.round, seen: false };
      (d.throwables ||= {})[ctx.item] = (d.throwables[ctx.item] || 0) + 1;
      say(cb, d.name + ' catches the ' + (WEAPON[ctx.item]?.name || ctx.item).toLowerCase() + ' out of the air (Catch)!');
    },
    turn_start: (ctx, h) => { if (ctx.u === h.u && stateOf(h).caught) stateOf(h).caught.seen = true; },
    turn_end: (ctx, h) => {
      const u = h.u, st = stateOf(h), c = st.caught; if (ctx.u !== u || !u || !c || !c.seen || !h.cb) return;
      delete st.caught; if (u.throwables?.[c.item]) u.throwables[c.item]--;
      say(h.cb, 'The ' + (WEAPON[c.item]?.name || c.item).toLowerCase() + ' ' + u.name + ' held goes off in their hands (Catch)' + blast(h.cb, rngOf(h, ctx), unitById(h.cb, c.by), u.pos, c.item) + '.');
    },
  },
  brief: () => 'story: catches anything thrown at them or beside them; narrate the catch',
});

// ---------- Sleight of Hand (Dexterity γ) ----------
// 2 AP (II: 1), plant an item on an adjacent target without being seen (no roll: the perk says unseen). A grenade is
// primed and goes off at the start of the target's next turn; a tracker Marks the target for the rest of the fight
// (the squad sees it: it can't hide, +1 to hit it); anything else (evidence) is a Narrator fact. Area map: the same on a
// person on the map; a grenade planted there goes off on their first turn if a fight starts. Story: plant something on
// someone (Tier I: not mid-conversation, i.e. while you hold the story focus; II: also then; plan 6b; PROVISIONAL).
const plantable = (h: Holder, choice: string | undefined): { kind: 'grenade' | 'tracker' | 'item'; item: string; idx?: number } | string => {
  const u = h.u, c = h.c, ch = String(choice || '').trim();
  if (!ch) return 'Pick what to plant: a grenade, a tracker or an item from your pack.';
  if (u && WEAPON[ch]?.category === 'thrown') return (u.throwables?.[ch] || 0) > 0 ? { kind: 'grenade', item: ch } : 'You carry no ' + WEAPON[ch].name.toLowerCase() + '.';
  const pack = c ? packOf(c) : [];
  const idx = /^\d+$/.test(ch) ? +ch : pack.findIndex((p) => p.id === ch || (p.item || '') === ch || p.name.toLowerCase() === ch.toLowerCase());
  const it = pack[idx]; if (!it || it.qty <= 0) return 'Nothing like that in your pack.';
  if (it.mags || it.kind === 'weapon') return 'Plant something small: not a weapon or its magazines.';
  return { kind: /tracker/i.test(it.id + ' ' + it.name + ' ' + (it.item || '')) ? 'tracker' : 'item', item: it.name, idx };
};
const takeOne = (c: Character, idx: number) => { const pack = packOf(c).map((x) => ({ ...x })); const it = pack[idx]; if (!it) return; if (it.qty > 1) it.qty--; else pack.splice(idx, 1); c.pack = pack; };
register({
  id: 'sleight_of_hand', claims: 'all',
  actions: [
    { id: 'plant', label: 'Plant an item', scope: ['combat', 'world'], ap: (h) => (tierII(h) ? 1 : 2), target: 'unit', range: 1,
      text: 'Slip something onto someone next to you without being seen. A grenade goes off at the start of their next turn. A tracker keeps them Marked. For any other item, the Narrator decides what it means.',
      preview: (h, args) => { const p = plantable(h, args.choice); return typeof p === 'string' ? { ok: false, why: p } : { lines: ['Plant ' + (p.kind === 'grenade' ? 'a primed ' + WEAPON[p.item].name.toLowerCase() : p.item) + ', unseen.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId); if (!t || t === u) return 'Pick someone next to you.';
        const p = plantable(h, args.choice); if (typeof p === 'string') return p;
        if (p.kind === 'grenade') {
          u.throwables![p.item]--;
          if (overworld(cb)) { const npc = (t as any).npcId || t.id; (charState(h.c).planted ||= []).push({ npc, item: p.item }); note(h, 'planted a primed ' + WEAPON[p.item].name.toLowerCase() + ' on ' + t.name + ' (unseen): it goes off on their first turn of a fight'); }
          else (stateOf(h).planted ||= []).push({ t: t.id, item: p.item });
          say(cb, u.name + ' slips something onto ' + t.name + '.');
          return null;
        }
        if (h.c && p.idx != null) takeOne(h.c, p.idx);
        if (p.kind === 'tracker' && !overworld(cb)) { const r = applyCond(cb, rng, u, t, 'marked', undefined, undefined, { skipSave: true, via: 'ingenuity' }); say(cb, u.name + ' plants a tracker on ' + t.name + r + '.'); return null; }
        say(cb, u.name + ' slips something onto ' + t.name + '.');
        note(h, 'planted ' + p.item + ' on ' + t.name + ' (unseen): rule what it means when it matters');
        return null;
      } },
    { id: 'plant_story', label: 'Plant an item', scope: ['story'], ap: 0, target: 'text',
      text: 'Say who and what: the item leaves your pack and the Narrator knows it was planted, unseen.',
      available: (h) => { const g = h.g, f = g?.story?.focus; return !tierII(h) && f && h.c && f.charId === h.c.id ? 'Planting in the middle of a conversation needs Sleight of Hand II.' : true; },
      run: (h, args) => {
        const c = h.c; if (!c) return 'Only a character can.';
        const text = String(args.text || '').slice(0, 160), pack = packOf(c);
        const idx = pack.findIndex((p) => !p.mags && p.kind !== 'weapon' && text.toLowerCase().includes(p.name.toLowerCase()));
        if (idx >= 0) takeOne(c, idx);
        note(h, (args.npc ? 'on ' + args.npc + ': ' : '') + 'planted unseen: "' + text + '"' + (idx >= 0 ? ' (' + pack[idx].name + ' left the pack)' : '') + '. Record it; rule what follows when it matters');
        return null;
      } },
  ],
  on: {
    combat_start: (ctx, h) => {
      const cb = h.cb, p = cs(h.c).planted as any[] | undefined; if (!cb || !p?.length || !h.u) return;
      for (const x of p) { const t = cb.units.find((v) => v.npcId === x.npc || v.id === x.npc); if (t) (stateOf(h).planted ||= []).push({ t: t.id, item: x.item }); }
      delete charState(h.c).planted;
    },
    turn_start: (ctx, h) => {
      const st = stateOf(h), list = st.planted as any[] | undefined, cb = h.cb; if (!list?.length || !cb) return;
      const here = list.filter((x) => x.t === ctx.u.id); if (!here.length) return;
      st.planted = list.filter((x) => x.t !== ctx.u.id);
      for (const x of here) say(cb, 'The ' + WEAPON[x.item].name.toLowerCase() + ' planted on ' + ctx.u.name + ' goes off (Sleight of Hand)' + blast(cb, rngOf(h, ctx), h.u || null, ctx.u.pos, x.item) + '.');
      checkOver(cb);
    },
  },
  brief: () => 'planted items: what they mean later is yours (II: also mid-conversation)',
});

// ---------- Jury-Rig (Proficiency β) ----------
// I: a broken weapon (durability 0) works one more time per breakage: one more shot, or one full-damage strike
// ("One more time", the weapon's attack AP). Afterwards it is simply Broken again (repairable; plan 6b; PROVISIONAL).
// The use comes back once the weapon is repaired. II: Field Repair at double strength on drones (vehicles don't exist
// yet): "Patch the drone", 2 AP, Proficiency 3, one spare-parts charge, (10% + 5% per Proficiency above 3) × 2 of its
// max HP (PROVISIONAL: the engine had no drone repair). Story: a broken device works once more when it counts (brief).
const broken = (u: Unit) => !!u.maxDur && (u.dur ?? 1) <= 0;
register({
  id: 'jury_rig', claims: 'all',
  actions: [
    { id: 'one_more', label: 'One more time', scope: ['combat'], ap: (h) => (h.u ? attackApCost(WEAPON[h.u.weapon], isMelee(WEAPON[h.u.weapon]) ? 'melee' : 'shot') : 2), target: 'enemy',
      text: 'Your broken weapon works one more time: one shot or one full-damage strike, at the attack\'s normal AP cost. Then it is broken again.',
      available: (h) => (!h.u || !broken(h.u) ? false : cs(h.c).juryUsed || stateOf(h).juryUsed ? 'Already used on this broken weapon. Repair it first.' : true),
      preview: (h, args) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId); if (!t) return {};
        const keep = u.dur; u.dur = u.maxDur; try { const pv = previewAttack(cb, u, t, isMelee(WEAPON[u.weapon]) ? 'melee' : args.choice === 'aimed' ? 'aimed' : 'shot'); return pv.ok ? { ap: pv.ap, lines: ['One more ' + (isMelee(WEAPON[u.weapon]) ? 'strike' : 'shot') + ': ' + pv.pct + '% to hit.'] } : { ok: false, why: pv.why }; } finally { u.dur = keep; }
      },
      run: (h, args, rng) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId); if (!t) return 'Pick a target.';
        const mode = isMelee(WEAPON[u.weapon]) ? 'melee' : args.choice === 'aimed' ? 'aimed' : 'shot';
        u.dur = u.maxDur; // works as new, once
        const pv = previewAttack(cb, u, t, mode, { free: true }); if (!pv.ok) { u.dur = 0; return pv.why!; }
        say(cb, u.name + ' coaxes the broken ' + (WEAPON[u.weapon]?.name || 'weapon').toLowerCase() + ' into one more go (Jury-Rig).');
        resolveAttack(cb, rng, u, t, mode, null, { free: true, noWear: true }); // the AP was the action's
        u.dur = 0; if (h.c) charState(h.c).juryUsed = true; else stateOf(h).juryUsed = true;
        checkOver(cb); return null;
      } },
    { id: 'repair_drone', label: 'Patch the drone', scope: ['combat', 'world'], ap: (h) => (h.u ? actionAp({ u: h.u }, 'field_repair', 2).ap : 2), target: 'ally', range: 1,
      text: 'Repair a drone next to you at double strength: it regains 20% of its max HP, plus 10% for each Improvisation point above 3. Uses one spare-parts charge. Needs Improvisation 3.',
      available: (h) => { if (!tierII(h) || !h.u || !h.cb) return false; if (!h.cb.units.some((v) => v.companion === 'drone' && !v.dead && v.side === h.u!.side)) return false; return (h.u.proficiency || 0) < 3 ? 'Needs Improvisation 3.' : !(h.u.parts || 0) ? 'No spare parts.' : true; },
      preview: (h, args) => { const t = unitById(h.cb!, args.targetId); return !t || t.companion !== 'drone' ? { ok: false, why: 'Pick a drone next to you.' } : t.hp >= t.maxHp ? { ok: false, why: 'Already in full repair.' } : {}; },
      run: (h, args) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId)!; if (!t || t.companion !== 'drone') return 'Pick a drone.';
        const n = Math.ceil(t.maxHp * (0.1 + 0.05 * ((u.proficiency || 3) - 3)) * 2 * statQuery({ u }, 'field_repair_amount').mult);
        u.parts = (u.parts || 0) - 1; const r = healUnit(cb, t, n, u, 'repair'); emitFx(cb, 'repair', { unit: u.id, at: t.pos, dur: 1400 });
        say(cb, u.name + ' patches ' + t.name + ' (Jury-Rig II): +' + r.restored + ' HP (' + t.hp + '/' + t.maxHp + ').'); return null;
      } },
  ],
  on: {
    combat_start: (ctx, h) => { if (h.u && !broken(h.u) && cs(h.c).juryUsed) delete charState(h.c).juryUsed; },
    turn_start: (ctx, h) => { if (ctx.u === h.u && h.u && !broken(h.u)) { if (cs(h.c).juryUsed) delete charState(h.c).juryUsed; delete stateOf(h).juryUsed; } },
  },
  brief: () => 'story: a broken device works one more time when it counts (once per breakage)',
});

// ---------- Hot-Swap (Proficiency β) ----------
// I: a hand's gear change mid-fight (draw, put away, swap main and off hand, a two-handed draw's 2 AP too) or fitting a
// mod costs 0 AP, once per turn (plan 6b; rules 1.9, item 686: never armour, and a drop is 0 AP anyway). II: twice per
// turn. Out of combat gear changes are already free.
register({
  id: 'hot_swap', claims: 'all',
  on: {
    swap: (ctx, h) => {
      if (ctx.u !== h.u || !inFight(h) || !(ctx.ap > 0)) return;
      const n = tierII(h) ? 2 : 1; if (!uses(h).take('per_turn', n)) return;
      ctx.ap = 0; say(h.cb, h.u!.name + ' swaps without missing a beat (Hot-Swap: 0 AP).');
    },
  },
  brief: () => null,
});

// Origami Hands was replaced by Both Hands (rules 1.13: perks/skeleton.ts); its traps wait for the stealth list.

// ---------- Trick Shot (Dexterity Mastered) ----------
// Once per turn, a ranged attack can ricochet (the Ricochet toggle on Attack): it ignores half cover (no −5, never
// stopped by cover; full cover still blocks sight), and on a hit the nearest other enemy within 2 tiles of the target,
// in the target's line of sight, takes half of what the target lost (rounded down, at least 1, no second armour; plan
// 6b; PROVISIONAL). A mod 'trick_shot_target:<unitId>' picks the second target. Burst and auto: the first round only.
const tsLeft = (h: Holder) => uses(h).left('per_turn', 1) > 0;
function ricochetTarget(cb: Combat, att: Unit, tgt: Unit): Unit | null {
  const pick = (cb.mods || []).map((m) => /^trick_shot_target:(.+)$/.exec(m)?.[1]).find(Boolean);
  const ok = (v: Unit) => v !== tgt && v !== att && v.side !== att.side && alive(v) && dist(v.pos, tgt.pos) <= 2 && lineOfSight(cb, tgt.pos, v.pos);
  const want = pick ? cb.units.find((v) => v.id === pick && ok(v)) : null; if (want) return want;
  return cb.units.filter(ok).sort((a, b) => dist(a.pos, tgt.pos) - dist(b.pos, tgt.pos) || a.hp - b.hp)[0] || null;
}
register({
  id: 'trick_shot', claims: 'all',
  toggles: [{ id: 'ricochet', label: 'Ricochet', on: ['combat/attack'],
    available: (h) => (!h.u || isMelee(WEAPON[h.u.weapon]) ? false : tsLeft(h) ? true : 'Used this turn.'),
    preview: () => 'Once a turn: this shot ignores half cover. If it hits, half the damage bounces into another enemy within 2 tiles of the target.' }],
  on: {
    attack_preview: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && modOn(h, 'ricochet') && tsLeft(h)) ctx.ignoreCover = true; },
    on_hit: (ctx, h) => {
      const cb = h.cb; if (ctx.att !== h.u || ctx.melee || !cb || !modOn(h, 'ricochet') || !uses(h).take('per_turn')) return;
      const t2 = ricochetTarget(cb, ctx.att, ctx.tgt); if (!t2) { say(cb, '(Ricochet: nobody within 2 tiles of ' + ctx.tgt.name + '.)'); return; }
      const n = Math.max(1, Math.floor((ctx.dmg || 0) * amountMult('perk:trick_shot', 'ricochet', 'share'))), r = applyDamage(cb, t2, n, { by: ctx.att, type: 'weapon', ranged: true, shield: true, credit: 'all', weapon: ctx.att.weapon });
      emitFx(cb, 'shot', { unit: ctx.att.id, target: t2.id, from: ctx.tgt.pos, to: t2.pos, weapon: ctx.att.weapon, cat: WEAPON[ctx.att.weapon]?.category, mode: 'shot', hit: true, crit: false, fumble: false, dmg: r.amount, killed: r.killed, chain: true, ricochet: true });
      say(cb, 'The round ricochets into ' + t2.name + ' (Trick Shot): ' + r.amount + ' damage' + (r.killed ? (t2.side === 'foe' ? ' · down for good' : ' · Downed') : '') + '.');
      checkOver(cb);
    },
    on_miss: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && modOn(h, 'ricochet')) uses(h).take('per_turn'); },
  },
  brief: () => null,
});

// ---------- Overhaul (Proficiency Mastered) ----------
// Field Repair costs 1 AP (the data's action_cost) and restores twice as much (90% at Proficiency 10), capped at the
// maximum. Out of combat ("Bench repair"): one spare-parts charge restores 100%. After a long rest, give one weapon a
// permanent extra mod slot, once per item: a second slot of a type it already has (plan 6b: the player picks the type
// by the mod they fit; PROVISIONAL).
register({
  id: 'overhaul', claims: 'all',
  // The data's action_cost says value 1 (which actionAp reads as +1); the text says Field Repair costs 1 AP, so the
  // lane answers it: 2 → 1 (data delta in the lane notes: set 1).
  stat: (h, stat, ctx) => (stat === 'field_repair_amount' ? { mult: 2 } : stat === 'ap_cost:field_repair' ? 1 - (ctx?.base ?? 2) : 0),
  actions: [
    { id: 'bench_repair', label: 'Bench repair', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'Out of a fight: spend one spare-parts charge to bring your weapon back to full durability.',
      available: (h) => { const c = h.c; if (!c) return false; const max = maxDur(c); if (!max) return false; return (c.weaponState?.dur ?? max) >= max ? 'Already in full repair.' : !packOf(c).some((p) => (p.item || p.id) === 'spare_parts' && p.qty > 0) ? 'No spare parts.' : true; },
      run: (h) => {
        const c = h.c!, pack = packOf(c).map((x) => ({ ...x })), i = pack.findIndex((p) => (p.item || p.id) === 'spare_parts' && p.qty > 0); if (i < 0) return 'No spare parts.';
        if (pack[i].qty > 1) pack[i].qty--; else pack.splice(i, 1); c.pack = pack;
        c.weaponState = { ...(c.weaponState || {}), dur: maxDur(c) };
        if (h.u) { h.u.dur = maxDur(c); h.u.parts = Math.max(0, (h.u.parts || 0) - 1); }
        say(h.cb, c.name + ' strips and rebuilds the ' + (WEAPON[c.weapon]?.name || 'weapon').toLowerCase() + ' (Overhaul): full durability.');
        return null;
      } },
    { id: 'extra_slot', label: 'Overhaul: extra mod slot', pickLabel: 'The mod in your pack', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'After a long rest: your weapon gains a permanent second mod slot of a type it already has. Once per weapon. Pick the mod from your pack to fit there.',
      available: (h) => { const c = h.c; if (!c || !WEAPON[c.weapon]) return false; if (cs(c).overhauled?.[c.weapon]) return 'This weapon already has its extra slot.'; return cs(c).overhaulBench ? true : 'Only after a long rest.'; },
      preview: (h, args) => { const e = extraFitCheck(h.c!, args.choice, 1); return e ? { ok: false, why: e } : {}; },
      run: (h, args) => {
        const c = h.c!; (charState(c).overhauled ||= {})[c.weapon] = true; delete charState(c).overhaulBench;
        return fitExtra(c, args.choice, 'Overhaul');
      } },
  ],
  on: {
    rest: (ctx, h) => { if (ctx.kind === 'long' && h.c && (ctx.chars || []).includes(h.c)) charState(h.c).overhaulBench = true; },
  },
  brief: () => null,
});
const maxDur = (c: Character) => { const w: any = WEAPON[c.weapon]; return Math.round((w?.durability || 0) * ({ standard: 1, fine: 1.25, masterwork: 1.5, relic: 1.5, celestial: 1.5 } as any)[c.weaponState?.rarity || 'standard']); };

// ---------- extra mod slots (Gun Nut, Blade Recluse, Overhaul) ----------
// A weapon's extra slot is a second slot of a type it already has (plan 6b; PROVISIONAL): the mod goes in beside the one
// already fitted there. Extra slots a weapon has: Gun Nut (any gun), Blade Recluse (the named weapon), Overhaul (a
// weapon it overhauled).
function extraSlots(c: Character): number {
  const w: any = WEAPON[c.weapon]; let n = 0;
  if (has(c, 'gun_nut') && isGun(w)) n++;
  if (has(c, 'blade_recluse') && cs(c).oneBlade?.weapon === c.weapon) n++;
  if (has(c, 'overhaul') && cs(c).overhauled?.[c.weapon]) n++;
  return n;
}
function extraUsed(c: Character): number { const t = (c.weaponState?.mods || []).map((m) => (ITEM[m] as any)?.mod_slot); return t.length - new Set(t).size; }
function extraFitCheck(c: Character, choice: string | undefined, plus = 0): string | null {
  const pack = packOf(c), idx = /^\d+$/.test(String(choice ?? '')) ? +choice! : pack.findIndex((p) => (p.item || p.id) === choice);
  const it = pack[idx], m: any = it && ITEM[it.item || it.id]; if (!m || m.category !== 'mod') return 'Pick a mod from your pack.';
  const slots: string[] = (WEAPON[c.weapon] as any)?.mod_slots || [], mods = c.weaponState?.mods || [];
  if (!slots.includes(m.mod_slot)) return 'Your weapon has no ' + m.mod_slot + ' slot to double.';
  if (!mods.some((x) => (ITEM[x] as any)?.mod_slot === m.mod_slot)) return 'The ' + m.mod_slot + ' slot is free: fit it the normal way.';
  if (mods.includes(m.id)) return 'That mod is already fitted.';
  if (extraUsed(c) >= extraSlots(c) + plus) return 'No extra slot free on this weapon.';
  return null;
}
function fitExtra(c: Character, choice: string | undefined, why: string): string | null {
  const e = extraFitCheck(c, choice); if (e) return e;
  const pack = packOf(c).map((x) => ({ ...x })), idx = /^\d+$/.test(String(choice ?? '')) ? +choice! : pack.findIndex((p) => (p.item || p.id) === choice), it = pack[idx], m: any = ITEM[it.item || it.id];
  if (it.qty > 1) it.qty--; else pack.splice(idx, 1);
  c.pack = pack; c.weaponState = { ...(c.weaponState || {}), mods: [...(c.weaponState?.mods || []), m.id] };
  void why; return null;
}
const extraModAction = (label: string, avail: (h: Holder) => boolean | string) => ({
  id: 'extra_mod', label, scope: ['story', 'world'] as ('story' | 'world')[], pickLabel: 'The mod in your pack', ap: 0, target: 'none' as const,
  text: 'Out of a fight: fit a second mod into a slot type your weapon already has.',
  available: (h: Holder) => (!h.c ? false : avail(h)),
  preview: (h: Holder, args: any) => { const e = extraFitCheck(h.c!, args.choice); return e ? { ok: false, why: e } : {}; },
  run: (h: Holder, args: any) => fitExtra(h.c!, args.choice, label),
});

// ---------- Nothing Gets Past (Vigilance Mastered) ----------
// Rules 1.13 (a gamma deals no damage: the old every-mover Overwatch is the Marksman's Killzone now). Every enemy that
// moves in your sight is Spotted for free: the mark your Spot Call would leave (at 10 points: the next two allies to
// attack it ignore its cover at +1 to hit, and it isn't Hidden to them), with no AP, no reaction and no Call slot used.
// Once a round for each enemy; an enemy that already carries a Spot keeps it. Not while you are Silenced or Stunned.
register({
  id: 'nothing_gets_past', claims: 'all',
  on: {
    move_step: (ctx, h) => {
      const u = h.u, cb = h.cb, m: Unit = ctx.u; if (!u || !cb || overworld(cb) || !m || m.side === u.side || !alive(u) || !alive(m)) return;
      if (condOn(u, 'silenced') || condOn(u, 'stunned') || !unitSees(cb, u, ctx.at || m.pos)) return;
      if (m.hidden && !sideSees(cb, u.side as 'pc' | 'foe', m)) return;
      const st = stateOf(h); if (st.r !== cb.round) { st.r = cb.round; st.ids = []; }
      if (st.ids.includes(m.id) || callMarks(m).spot) return;
      const def = CALL['call.spot']; if (!def) return;
      const step = def.steps[Math.max(0, callStepAt(def, callLevel(u, def)) - 1)], num = (k: string) => (typeof step?.numbers?.[k] === 'number' ? step.numbers[k] : 0);
      st.ids.push(m.id);
      callMarks(m).spot = { by: u.id, side: u.side, r: cb.round, left: num('allies') || 1, users: [], live: null, hit: num('hit'), unhide: !!num('unhide') };
      emitFx(cb, 'perk', { unit: u.id, target: m.id, from: u.pos, to: m.pos, id: 'nothing_gets_past' });
      say(cb, u.name + ' calls ' + m.name + ' out as it moves (Nothing Gets Past): Spotted.');
    },
  },
  brief: () => null,
});

// ---------- Dance of Iron (Achieved: Dexterity 5 + Athletics 5) ----------
// When an attack against you misses (your Defense dodged it, fumbles included; not a shot cover stopped), fire one
// single shot back at the attacker for 0 AP, as your reaction (spec item 18: one a round). It needs a loaded ranged
// weapon, sight and range. Inside a volley it waits until the volley is done (the attacker's next action or the end of
// its turn; plan 6b; PROVISIONAL). Ammo, Heat and wear are spent as usual.
function danceFlush(h: Holder, rng: Rng) {
  const st = stateOf(h), u = h.u, cb = h.cb; if (!st.pending || !u || !cb) return;
  const a = unitById(cb, st.pending); delete st.pending;
  if (!a || !alive(a) || !alive(u) || !canReact(cb, u)) return;
  const pv = previewAttack(cb, u, a, 'shot', { free: true }); if (!pv.ok) { say(cb, '(Dance of Iron: ' + pv.why + ')'); return; }
  useReaction(cb, u); say(cb, u.name + ' dances out of it and fires back (Dance of Iron).');
  resolveAttack(cb, rng, u, a, 'shot', null, { noAp: true }); checkOver(cb);
}
register({
  id: 'dance_of_iron', claims: 'all',
  on: {
    on_miss: (ctx, h) => {
      const u = h.u; if (!u || ctx.tgt !== u || ctx.att.side === u.side || !inFight(h) || !alive(u) || stateOf(h).pending) return;
      if (isMelee(WEAPON[u.weapon]) || !canReact(h.cb!, u)) return;
      stateOf(h).pending = ctx.att.id;
    },
    enemy_action_start: (ctx, h) => danceFlush(h, rngOf(h, ctx)),
    turn_end: (ctx, h) => danceFlush(h, rngOf(h, ctx)),
    turn_start: (ctx, h) => danceFlush(h, rngOf(h, ctx)),
  },
  brief: () => null,
});

// ---------- Holy Ordnance (Faith α) ----------
// 3 AP, at will: bless the magazine in an adjacent ally's gun (or your own): its rounds do +20% (II: +40%) to
// upper-realm and cursed beings (kinds upper_realm, cursed, crawler, celestial, or tagged so), in the target-specific
// bucket (capped at ×2 with the others, plan 6a-1). II: two magazines (the next one loaded is blessed too). It lasts
// until that magazine is swapped out (plan 6b: until emptied; PROVISIONAL). Area map: the same, out of combat; it
// carries into the next fight. Blessing power (Faith) doesn't apply (PROVISIONAL).
const BLESS = 'holy:bless';
const blessable = (u: Unit) => { const w: any = WEAPON[u.weapon]; return !!w && isGun(w) && !!w.reload && w.category !== 'mana'; };
const holyFoe = (t: Unit) => ['upper_realm', 'cursed', 'crawler', 'celestial'].includes(t.kind || '') || (t.tags || []).some((x) => x === 'cursed' || x === 'upper_realm');
register({
  id: 'holy_ordnance', claims: 'all',
  actions: [{
    id: 'bless', label: 'Bless a magazine', scope: ['combat', 'world'], ap: 3, target: 'ally', range: 1,
    text: 'Bless the magazine in your gun, or in the gun of an ally next to you. I: its rounds deal +20% damage to upper-realm and cursed beings. II: +40%, and the next magazine loaded is blessed too.',
    preview: (h, args) => { const t = unitById(h.cb!, args.targetId); return !t ? {} : !blessable(t) ? { ok: false, why: t.name + ' holds no gun with a magazine.' } : { lines: [t.name + '\'s ' + (WEAPON[t.weapon]?.name || 'gun') + ': +' + (tierII(h) ? 40 : 20) + '% vs upper-realm and cursed beings' + (tierII(h) ? ', two magazines' : '') + '.'] }; },
    run: (h, args) => {
      const cb = h.cb!, t = unitById(cb, args.targetId)!, mult = tierII(h) ? 1.4 : 1.2, mags = tierII(h) ? 2 : 1;
      if (overworld(cb)) { const c = t.charId ? h.g?.characters?.[t.charId] : null; if (c) charState(c).holyBless = { mult, mags }; }
      else (t.ps ||= {})[BLESS] = { mult, loaded: true, spare: mags - 1 };
      say(cb, h.u!.name + ' blesses ' + (t === h.u ? 'their own' : t.name + '\'s') + ' magazine (Holy Ordnance).'); return null;
    },
  }],
  on: {
    combat_start: (ctx, h) => {
      const cb = h.cb, g = h.g; if (!cb || !g) return;
      for (const v of cb.units) { const c = v.charId ? g.characters?.[v.charId] : null, b = c ? cs(c).holyBless : null; if (b && blessable(v)) { (v.ps ||= {})[BLESS] = { mult: b.mult, loaded: true, spare: b.mags - 1 }; delete charState(c).holyBless; } }
    },
    damage_out: (ctx, h) => {
      const b = ctx.att?.ps?.[BLESS]; if (!b || !b.loaded || ctx.melee || ctx.spell || ctx._holy || !holyFoe(ctx.tgt)) return;
      ctx.vs.push({ v: Math.round((b.mult - 1) * 100) / 100, label: 'Holy Ordnance' }); ctx._holy = true;
    },
    reload: (ctx) => { const b = ctx.u?.ps?.[BLESS]; if (!b || ctx.hand === 'off') return; /* the blessed magazines are the main gun's */ b.loaded = false; if (b.spare > 0) { b.spare--; b.loaded = true; } if (!b.loaded && !b.spare) delete ctx.u.ps[BLESS]; },
    combat_end: (ctx, h) => {
      const g = h.g, cb = h.cb; if (!g || !cb) return;
      for (const v of cb.units) { const b = v.ps?.[BLESS], c = v.charId ? g.characters?.[v.charId] : null; if (b && c && (b.loaded || b.spare)) charState(c).holyBless = { mult: b.mult, mags: (b.loaded ? 1 : 0) + b.spare }; if (b) delete v.ps![BLESS]; }
    },
  },
  brief: () => null,
});

// ======================================================================================================== TRAITS

// ---------- Gun Nut ----------
// Clearing a jam costs 0 AP (the data's action_cost) and doesn't reset Heat (plan 6a-29; PROVISIONAL). Every gun gets
// +1 mod slot (a second slot of a type it has: "Fit a second mod", out of combat). Know Your Iron: in a fight the engine
// names each enemy's weapon and calibre as the squad first sees it; in the story, identifications are Narrator facts. Collector
// (spec §14 item 369, Leon 7 Nov 2026): no guns at creation; the first 3 guns the character gets are the collection
// (character.ts collectGuns). Parting with one is the Narrator's Dexterity check (TN 12, PROVISIONAL) and the brief names
// the collection; an engine path that removes a collection gun refuses it (partError). The −50% sale price is the
// Narrator's: the engine has no sell action.
/** Know Your Iron in a fight: name the weapon and calibre of enemies the squad can see, once each. */
function knowIron(h: Holder, seen: Unit[]) {
  const cb = h.cb, u = h.u; if (!cb || !u || overworld(cb)) return;
  const st = stateOf(h), named: string[] = (st.named ||= []);
  const fresh = seen.filter((v) => isGun(WEAPON[v.weapon]) && !named.includes(v.id)); if (!fresh.length) return;
  named.push(...fresh.map((v) => v.id));
  say(cb, u.name + ' knows the iron (Gun Nut): ' + fresh.map((v) => v.name + ', ' + WEAPON[v.weapon].name + ' (' + (WEAPON[v.weapon] as any).ammo + ')').join('; ') + '.');
}
register({
  id: 'gun_nut', claims: [1, 3], narrator: [4, 5],
  actions: [extraModAction('Fit a second mod', (h) => (isGun(WEAPON[h.c!.weapon]) ? (extraUsed(h.c!) < extraSlots(h.c!) ? true : 'No extra slot free.') : 'Only on a gun.'))],
  on: {
    jam_clear: (ctx, h) => { if (ctx.u === h.u && ctx.ap === 0) ctx.keepHeat = true; },
    combat_start: (ctx, h) => knowIron(h, h.cb ? h.cb.units.filter((v) => h.u && v.side !== h.u.side && !v.hidden && sideSees(h.cb!, h.u.side, v)) : []),
    sight_change: (ctx, h) => { if (h.u && h.cb && ctx.side === h.u.side) knowIron(h, (ctx.gained || []).map((id: string) => unitById(h.cb!, id)).filter((v: Unit | null): v is Unit => !!v && v.side !== h.u!.side)); },
  },
  brief: (h) => { const col = h.c ? collectionOf(h.c).map((id) => WEAPON[id]?.name || id) : [];
    return 'identify any gun or round (Narrator facts); collection: ' + (col.length ? col.join(', ') : 'none yet (the first 3 guns gained)') + '; parting with a collection gun (sell, abandon, give away): Dex TN 12 or keep it until rest; sells guns at −50%'; },
});

// ---------- Old School ----------
// Fan the Hammer: with a revolver or a lever gun, 3 AP, fire every round still loaded at one target, each at −2 and with
// Recoil (spec), once per turn (PROVISIONAL). With the drifter revolver this is the bigger version of its own Fan the
// Hammer. Analog: no Evoker-linked or electronic guns and no electronic sight (the red dot): Old School won't fire them,
// equip them or fit the red dot (stat 'equip_ban', read by equip and fit in character.ts).
const fanGun = (u: Unit) => { const w: any = WEAPON[u.weapon]; return !!w && (w.category === 'revolver' || (w.tags || []).includes('lever')); };
const analogBan = (u: Unit): string | null => { const w: any = WEAPON[u.weapon]; if (!w) return null; const t: string[] = w.tags || [];
  if (t.includes('evoker_linked')) return 'Old School: you won\'t fire an Evoker-linked gun.';
  if (t.includes('electronic') && !isMelee(w)) return 'Old School: you won\'t fire an electronic gun.';
  if (hasMod(u.mods, 'mod_red_dot')) return 'Old School: take the red dot off first.';
  return null; };
register({
  id: 'old_school', claims: [2],
  stat: (h, stat, ctx) => {
    if (stat === 'hide_weapon_skill') return /fan the hammer/i.test(ctx?.skill || '') ? 1 : 0; // the trait's Fan the Hammer replaces the gun's
    // Analog in the story too: no electronic or Evoker-linked gun in hand, no red dot fitted (equip and fit refuse it).
    if (stat === 'equip_ban') { const w: any = ctx?.weapon ? WEAPON[ctx.weapon] : null, t: string[] = w?.tags || [];
      return (w && (t.includes('evoker_linked') || (t.includes('electronic') && !isMelee(w)))) || ctx?.mod === 'mod_red_dot' || (ctx?.mods || []).includes('mod_red_dot') ? 1 : 0; }
    return 0;
  },
  actions: [{
    id: 'fan', label: 'Fan the Hammer (every round)', scope: ['combat'], ap: 3, target: 'enemy', uses: { per: 'per_turn', n: 1 },
    text: 'Once a turn: fire every round still loaded at one target. Each shot is at −2 to hit, and recoil applies.',
    available: (h) => (!h.u || !fanGun(h.u) ? false : h.u.ammo <= 0 ? 'Empty: reload first.' : true),
    preview: (h, args) => { const u = h.u!, t = unitById(h.cb!, args.targetId); if (!t) return { ap: 3 }; const pv = previewAttack(h.cb!, u, t, 'shot', { free: true }); return pv.ok ? { ap: 3, lines: [u.ammo + ' rounds at −2 each, first at ' + Math.max(5, pv.pct - 10) + '%.'] } : { ok: false, ap: 3, why: pv.why }; },
    run: (h, args, rng) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId)!, w = WEAPON[u.weapon], shots = u.ammo, dex = Math.floor((u.dexterity || 0) / 2);
      say(cb, u.name + ' fans the hammer (Old School): ' + shots + ' rounds.');
      emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: w.id, cat: w.category, mode: 'skill', name: 'Fan the Hammer', shots });
      for (let i = 0; i < shots && !t.dead && !u.jammed && u.ammo > 0; i++) {
        if (i > 0 && !previewAttack(cb, u, t, 'shot', { free: true }).ok) break;
        resolveAttack(cb, rng, u, t, 'shot', null, { extra: -2 - Math.max(0, i - dex), noAp: true, noWear: i > 0 });
      }
      checkOver(cb); return null;
    },
  }],
  on: { attack_preview: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && !ctx.fail) { const b = analogBan(h.u!); if (b) ctx.fail = b; } } },
  brief: () => null,
});

// ---------- Spray and Pray ----------
// Suppression: every target a full-auto burst fires at, hit or miss, makes a Body save or is Suppressed (−1 AP next
// turn, no reactions or Overwatch; it doesn't stack) — the lighter condition, not Pinned (plan 6a-13; PROVISIONAL).
// Full auto is at −1, not −2. Ammo Hog: every round fired costs two (a single shot 2, a burst 6, full auto 20; fewer
// loaded empties the gun), charged after each action; aimed shots at −2.
/** Is this unit's current shot a round of its own full-auto volley? (The shot's fx is chained to an 'auto' volley.) */
function autoRound(cb: Combat, att: Unit, includeCurrent: boolean): boolean {
  const fx = cb.fx || [];
  for (let i = fx.length - 1; i >= 0; i--) { const e = fx[i]; if (e.unit !== att.id) continue;
    if (e.k === 'volley') return e.mode === 'auto';
    if (e.k === 'shot' || e.k === 'melee') { if (!e.chain) return false; if (!includeCurrent) continue; } }
  return false;
}
const suppress = (cb: Combat, rng: Rng, by: Unit, t: Unit) => { if (!t || t.dead || t.side === by.side || condOn(t, 'suppressed')) return; say(cb, '(Suppression on ' + t.name + applyCond(cb, rng, by, t, 'suppressed', undefined, undefined, { via: 'dexterity' }) + ')'); };
/** Charge Ammo Hog's second round for every round fired since the last charge (fx since then), and Suppress the auto
 * targets cover stopped (they reach neither on_hit nor on_miss). */
function ammoHog(h: Holder, rng: Rng): number {
  const u = h.u, cb = h.cb; if (!u || !cb || overworld(cb)) return 0;
  const st = stateOf(h), fx = cb.fx || [], w: any = WEAPON[u.weapon]; let owed = 0, mode: string | null = null;
  for (const e of fx) {
    if (e.n <= (st.fxN || 0)) continue; st.fxN = e.n;
    if (e.unit !== u.id) continue;
    if (e.k === 'volley') { mode = e.mode; if (e.mode === 'auto' && e.weapon === u.weapon && w?.magazine != null) owed += 10; continue; }
    if (e.k !== 'shot') continue;
    if (!e.chain) mode = null;
    if (mode === 'auto') { if (e.cover && e.target) { const t = unitById(cb, e.target); if (t) suppress(cb, rng, u, t); } continue; }
    if (e.weapon === u.weapon && w?.magazine != null) owed += 1;
  }
  if (owed && w?.magazine != null) { const was = u.ammo; u.ammo = Math.max(0, u.ammo - owed); if (was !== u.ammo) say(cb, u.name + ' burns ' + (was - u.ammo) + ' more ' + (was - u.ammo === 1 ? 'round' : 'rounds') + ' (Ammo Hog; ' + u.ammo + ' left).'); return was - u.ammo; }
  return 0;
}
register({
  id: 'spray_and_pray', claims: 'all',
  on: {
    attack_preview: (ctx, h) => {
      if (ctx.att !== h.u || ctx.melee) return;
      if (ctx.mode === 'auto' || (ctx.mode === 'shot' && ctx.free && ownTurn(ctx.cb, ctx.att) && autoRound(ctx.cb, ctx.att, false))) ctx.terms.push({ v: 1, label: 'Spray and Pray (recoil halved)' });
      if (ctx.mode === 'aimed') ctx.terms.push({ v: -2, label: 'Ammo Hog' });
    },
    attack_roll: (ctx, h) => { if (ctx.att === h.u && !autoRound(ctx.cb, ctx.att, false)) ammoHog(h, rngOf(h, ctx)); },
    on_hit: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && autoRound(ctx.cb, ctx.att, true)) suppress(ctx.cb, rngOf(h, ctx), ctx.att, ctx.tgt); },
    on_miss: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && autoRound(ctx.cb, ctx.att, true)) suppress(ctx.cb, rngOf(h, ctx), ctx.att, ctx.tgt); },
    reload: (ctx, h) => { if (ctx.u === h.u) ammoHog(h, rngOf(h, ctx)); },
    swap: (ctx, h) => { if (ctx.u === h.u) ammoHog(h, rngOf(h, ctx)); },
    turn_end: (ctx, h) => { if (ctx.u === h.u) ammoHog(h, rngOf(h, ctx)); },
    combat_end: (ctx, h) => { const n = ammoHog(h, rngOf(h, ctx)); if (n && h.c && h.u && h.c.weapon === h.u.weapon) h.c.loaded = Math.max(0, (h.c.loaded ?? 0) - n); },
  },
  brief: () => 'long missions without resupply hurt: they burn double ammo',
});

// ---------- One Shot ----------
// Breath Held: if you haven't moved this turn, your first shot of the turn ignores half cover (full cover still blocks
// sight) and its critical is +25% (rules 1.15: ×1.5 → ×1.75, never past ×2.0; PROVISIONAL, item 1022). Tunnel Vision (after a Breath Held
// shot, until you next move; in the story too): no Vigilant checks (they fail; voice lines of Vigilant stay silent; no
// spotting Hidden enemies), and ambushes on you do +50% damage. A new scene counts as moving (PROVISIONAL).
const breathOk = (u: Unit) => !u.moved && !u.firstShotTurn && !isMelee(WEAPON[u.weapon]);
const tunnelOn = (h: Holder) => !!(h.c ? cs(h.c).tunnel : stateOf(h).tunnel);
const setTunnel = (h: Holder, on: boolean) => { if (h.c) { if (on) charState(h.c).tunnel = true; else if (cs(h.c).tunnel) delete charState(h.c).tunnel; } else if (on) stateOf(h).tunnel = true; else delete stateOf(h).tunnel; };
register({
  id: 'one_shot', claims: 'all',
  stat: (h, stat) => (stat === 'passive:vigilant' && tunnelOn(h) ? { add: -99 } : 0),
  on: {
    attack_preview: (ctx, h) => { if (ctx.att === h.u && !ctx.melee && breathOk(ctx.att)) ctx.ignoreCover = true; },
    attack_roll: (ctx, h) => {
      if (ctx.att !== h.u) return; const st = stateOf(h);
      st.breath = ctx.mode !== 'melee' && breathOk(ctx.att);
      if (st.breath) { setTunnel(h, true); say(h.cb, ctx.att.name + ' holds a breath (One Shot).'); }
    },
    damage_out: (ctx, h) => { if (ctx.att === h.u && ctx.crit && !ctx.preview && stateOf(h).breath) ctx.critBonus = (ctx.critBonus || 0) + 0.25; }, // rules 1.15: +25% on the critical, inside the ×2.0 ceiling (combat.ts)
    on_hit: (ctx, h) => { if (ctx.att === h.u) stateOf(h).breath = false; },
    on_miss: (ctx, h) => { if (ctx.att === h.u) stateOf(h).breath = false; },
    moved: (ctx, h) => { if (ctx.u === h.u && !ctx.forced && tunnelOn(h)) setTunnel(h, false); },
    world_move_cost: (ctx, h) => { if (ctx.c === h.c && tunnelOn(h)) setTunnel(h, false); },
    scene_change: (ctx, h) => { if (tunnelOn(h)) setTunnel(h, false); },
    spot: (ctx, h) => { if (ctx.by === h.u && tunnelOn(h)) ctx.cancel = true; },
    damage_in: (ctx, h) => { if (ctx.phase === 'reduce' && ctx.t === h.u && ctx.src?.ambush && tunnelOn(h)) ctx.dmg = ctx.dmg * 1.5; },
    check_post: (ctx, h) => { if (ctx.c === h.c && tunnelOn(h) && (ctx.ck?.skills || []).includes('vigilant')) { ctx.auto = 'fail'; ctx.labels.push('Tunnel Vision'); } },
  },
  brief: (h) => (tunnelOn(h) ? 'Tunnel Vision now: ambushes on them do +50%' : null),
});

// ---------- Grenadier's Arm ----------
// Long Throw: throwing range +2. Strained Arm: throws cost +1 AP (the data's action_cost: a grenade is 3 AP). Throw
// anything: "Throw someone" takes an adjacent unit under your carry weight (people 80 kg, elites 100 kg, drones 15 kg;
// bosses can't be thrown; plan 6b; PROVISIONAL) to a tile within throwing range − 1 per 20 kg, for the throw's AP. It
// and anyone it lands on take 10 + kg ÷ 4 physical damage × Strength (PROVISIONAL). Objects and story throws: Narrator.
const weightOf = (t: Unit) => (t.tier === 'boss' ? Infinity : t.companion === 'drone' ? 15 : t.companion ? 40 : t.tier === 'elite' ? 100 : 80);
const throwCost = (u: Unit) => actionAp({ u }, 'throw', 2).ap;
/** What an object weighs when thrown (PROVISIONAL, spec 14): the light, loose ones; walls, doors and fixtures can't be. */
const THROW_KG: Record<string, number> = { crate: 25, barrel: 30, lamp: 5, camera: 3, alarm: 3, terminal: 20, container: 60 };
/** Where a thrown object comes down: the tile, unless a unit or something solid is there (then the nearest free one). */
const objLanding = (cb: Combat, tile: string, o: any): string | null => {
  const free = (k: string) => standable(cb.map, k) && !objectsOf(cb).some((x) => x !== o && x.pos === k && blocksMove(x)) && !cb.units.some((v) => !v.dead && v.pos === k);
  if (free(tile)) return tile;
  const [x, y] = xy(tile); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) { const k = key(x + dx, y + dy); if (free(k)) return k; }
  return null;
};
const landing = (cb: Combat, tile: string, self: Unit): string | null => {
  const free = (k: string) => canStand(cb, k, self);
  if (free(tile)) return tile;
  const [x, y] = xy(tile); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) { const k = key(x + dx, y + dy); if (free(k)) return k; }
  return null;
};
register({
  id: 'grenadiers_arm', claims: [0],
  stat: (h, stat) => (stat === 'throw_range' ? 2 : 0),
  actions: [{
    id: 'hurl', label: 'Throw someone', scope: ['combat'], ap: (h) => (h.u ? throwCost(h.u) : 3), target: 'unit', range: 1,
    text: 'Throw an ally or enemy next to you to a tile in range. They must weigh less than you can carry. The one thrown and whoever they land on take damage by weight.',
    preview: (h, args) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId); if (!t) return {};
      if (t === u) return { ok: false, why: 'Pick someone else.' };
      const kg = weightOf(t), carry = h.c ? carryLimit(h.c) : 0;
      if (!isFinite(kg)) return { ok: false, why: 'Nobody throws a boss.' };
      if (kg > carry) return { ok: false, why: 'Too heavy: about ' + kg + ' kg; you can carry ' + Math.floor(carry) + ' kg.' };
      const range = Math.max(1, throwRangeOf(u) - Math.floor(kg / 20)), k = tileOf(cb, args.tile);
      if (!k) return { ok: false, why: 'Pick where they land (within ' + range + ' tiles).' };
      if (dist(u.pos, k) > range) return { ok: false, why: 'Out of range: ' + range + ' tiles for ' + kg + ' kg.' };
      if (!lineOfSight(cb, u.pos, k)) return { ok: false, why: 'No line of sight to throw there.' };
      if (!landing(cb, k, t)) return { ok: false, why: 'No room to land there.' };
      return { lines: [t.name + ' (' + kg + ' kg) flies to ' + refOf(k) + ': ' + Math.floor(itemAmount('trait:grenadiers_arm', 'damage', [term(h.c ? physicalMult(h.c) : 1, 'stat: physical')], { kg })) + ' damage to it and to anyone there.'] };
    },
    run: (h, args) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, args.targetId)!, k = tileOf(cb, args.tile)!, kg = weightOf(t);
      const hit = cb.units.find((v) => v !== t && !v.dead && v.pos === k) || null, land = landing(cb, k, t)!;
      const mv = displace(cb, null, t, { tile: land }, { by: u, how: 'throw', source: 'throw' }); // the one forced move (combat.ts): it lands, and the tile acts on it
      if (!mv.moved) { say(cb, t.name + ' won\'t be thrown' + (mv.why ? ' (' + mv.why + ')' : '') + '.'); return null; }
      const dmg = Math.floor(itemAmount('trait:grenadiers_arm', 'damage', [term(h.c ? physicalMult(h.c) : 1, 'stat: physical')], { kg }));
      say(cb, u.name + ' throws ' + t.name + ' to ' + refOf(land) + ' (Grenadier\'s Arm)' + hurtUnit(t, dmg, false, cb, 'thrown', u) + (hit ? hurtUnit(hit, dmg, false, cb, 'thrown', u) : '') + mv.text + '.');
      checkOver(cb); return null;
    },
  }, {
    // An object next to you (tile) thrown to a tile (choice): a crate, a barrel, a lamp… by its weight (PROVISIONAL
    // weights, spec 14: objects carry none in the data). It lands there (or the nearest free tile), and it and whoever
    // it lands on take the same damage by weight; a barrel that breaks goes off as barrels do.
    id: 'hurl_object', label: 'Throw an object', scope: ['combat'], ap: (h) => (h.u ? throwCost(h.u) : 3), target: 'tile', range: 1,
    pickLabel: 'Where it lands',
    text: 'Throw an object next to you to a tile in range. It must weigh less than you can carry. The object and whoever it lands on take damage by weight.',
    preview: (h, args) => {
      const u = h.u!, cb = h.cb!, k0 = tileOf(cb, args.tile), o = k0 ? objectsOf(cb).find((x) => x.pos === k0 && THROW_KG[x.kind] != null && !(x as any).dead) : null;
      if (!o) return { ok: false, why: 'Pick an object next to you that can be lifted (a crate, a barrel, a lamp, a terminal).' };
      if (dist(u.pos, o.pos) > 1) return { ok: false, why: 'Walk up to it first.' };
      const kg = THROW_KG[o.kind], carry = h.c ? carryLimit(h.c) : 0;
      if (kg > carry) return { ok: false, why: 'Too heavy: about ' + kg + ' kg; you can carry ' + Math.floor(carry) + ' kg.' };
      const range = Math.max(1, throwRangeOf(u) - Math.floor(kg / 20)), k = tileOf(cb, args.choice);
      if (!k) return { ok: false, why: 'Pick where it lands (within ' + range + ' tiles).' };
      if (dist(u.pos, k) > range) return { ok: false, why: 'Out of range: ' + range + ' tiles for ' + kg + ' kg.' };
      if (!lineOfSight(cb, u.pos, k)) return { ok: false, why: 'No line of sight to throw there.' };
      if (!objLanding(cb, k, o)) return { ok: false, why: 'No room to land there.' };
      return { tiles: [k], lines: ['The ' + o.name.toLowerCase() + ' (' + kg + ' kg) flies to ' + refOf(k) + ': ' + Math.floor(itemAmount('trait:grenadiers_arm', 'damage', [term(h.c ? physicalMult(h.c) : 1, 'stat: physical')], { kg })) + ' damage to whoever is there, and to it.'] };
    },
    run: (h, args) => {
      const u = h.u!, cb = h.cb!, k0 = tileOf(cb, args.tile)!, o = objectsOf(cb).find((x) => x.pos === k0 && THROW_KG[x.kind] != null)!, k = tileOf(cb, args.choice)!, kg = THROW_KG[o.kind];
      const dmg = Math.floor(itemAmount('trait:grenadiers_arm', 'damage', [term(h.c ? physicalMult(h.c) : 1, 'stat: physical')], { kg })), hit = cb.units.find((v) => !v.dead && v.pos === k) || null, land = objLanding(cb, k, o)!, was = o.pos;
      o.pos = land; emitFx(cb, 'shove', { unit: u.id, target: null, from: was, to: land, ok: true, object: o.id });
      say(cb, u.name + ' hurls the ' + o.name.toLowerCase() + ' to ' + refOf(land) + ' (Grenadier\'s Arm)' + (hit ? hurtUnit(hit, dmg, false, cb, 'thrown', u) : '') + (o.hp != null && o.hp > 0 ? damageObject(cb, land, dmg, 0, u) : '') + '.');
      checkOver(cb); return null;
    },
  }],
  brief: () => 'story throws (anything under carry weight): yours',
});

// ---------- Demolitionist ----------
// +30% to explosive damage you deal: explosive weapon hits (the data's damage_mod at damage_out) and every explosion
// credited to you (grenades, splash, charges, barrels you set off) at damage_in, after armour. Shaped Charge: "Set
// explosive", 2 AP (the data's action_cost): a thrown explosive from your kit placed on your tile or an adjacent one,
// its blast shaped as a circle (its radius), a line or a 90° cone (2 × radius + 1 tiles, away from you) (PROVISIONAL);
// detonate now, or on a trigger ("Detonate", 1 AP, PROVISIONAL). Ringing Ears: −2 Vigilant (the data's skill_mod);
// checks the Narrator tags 'hearing' fail.
const EXPLOSIVES = ['satchel_charge', 'frag_grenade', 'incendiary_grenade'];
const DEMO = 1.3;
function shapeTiles(cb: Combat, from: string, at: string, shape: string, r: number): string[] {
  const out: string[] = [], [ax, ay] = xy(at), [fx, fy] = xy(from), dx = Math.sign(ax - fx), dy = Math.sign(ay - fy), n = 2 * r + 1;
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h;
  if (shape === 'line') { for (let i = 0; i < n; i++) { const x = ax + dx * i, y = ay + dy * i; if (!inMap(x, y) || cb.map.solid.includes(key(x, y))) break; out.push(key(x, y)); } return out; }
  if (shape === 'cone') { const dl = Math.hypot(dx, dy) || 1; for (let x = ax - n; x <= ax + n; x++) for (let y = ay - n; y <= ay + n; y++) { if (!inMap(x, y)) continue; const vx = x - ax, vy = y - ay, l = Math.hypot(vx, vy); if (l === 0 || (l <= n + 0.5 && (vx * dx + vy * dy) / (l * dl) >= 0.7)) out.push(key(x, y)); } return out; }
  for (let x = ax - r; x <= ax + r; x++) for (let y = ay - r; y <= ay + r; y++) if (inMap(x, y)) out.push(key(x, y));
  return out;
}
function detonate(h: Holder, rng: Rng, ch: { at: string; from: string; shape: string; item: string }): string {
  const cb = h.cb!, u = h.u!, w: any = WEAPON[ch.item], r = radiusOf(w), tiles = shapeTiles(cb, ch.from, ch.at, ch.shape, r), dmg = typeof w?.damage === 'number' ? w.damage : 0;
  emitFx(cb, 'explode', { at: ch.at, radius: r, what: ch.item, tiles });
  let out = '';
  for (const v of cb.units) if (!v.dead && !v.surrendered && tiles.includes(v.pos)) { out += hurtUnit(v, dmg, false, cb, 'explosion', u); if (!v.dead && (w.properties || []).includes('applies_burning')) out += applyCond(cb, rng, u, v, 'burning', undefined, 'body', { skipSave: true, via: 'dexterity' }); }
  for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && tiles.includes(o.pos)) out += damageObject(cb, o.pos, dmg * DEMO, 0, u);
  return out || ' · it finds no one';
}
const explosiveOf = (u: Unit, want?: string) => (want && EXPLOSIVES.includes(want) && (u.throwables?.[want] || 0) > 0 ? want : EXPLOSIVES.find((x) => (u.throwables?.[x] || 0) > 0) || null);
const parseCharge = (choice?: string) => { const p = String(choice || 'circle').split(/[,\s]+/); return { shape: ['line', 'cone', 'circle'].includes(p[0]) ? p[0] : 'circle', item: p.find((x) => EXPLOSIVES.includes(x)), remote: p.includes('remote') || p.includes('trigger') }; };
register({
  id: 'demolitionist', claims: [4],
  actions: [
    { id: 'set_explosive', label: 'Set explosive', scope: ['combat'], ap: (h) => (h.u ? actionAp({ u: h.u }, 'set_explosive', 2).ap : 2), target: 'tile',
      text: 'Place a charge on your tile or next to you and shape its blast: a circle, or a line or cone that points away from you. It goes off at once, or waits until you Detonate.',
      available: (h) => (!h.u ? false : explosiveOf(h.u) ? true : 'No explosive in your kit.'),
      preview: (h, args) => {
        const u = h.u!, cb = h.cb!, k = tileOf(cb, args.tile), p = parseCharge(args.choice), item = explosiveOf(u, p.item); if (!k || !item) return {};
        if (dist(u.pos, k) > 1 || !standable(cb.map, k)) return { ok: false, why: 'Place it on your tile or next to you.' };
        if (p.shape !== 'circle' && k === u.pos) return { ok: false, why: 'A line or cone points away from you: set it next to you.' };
        const tiles = shapeTiles(cb, u.pos, k, p.shape, radiusOf(WEAPON[item]));
        return { tiles, lines: [WEAPON[item].name + ', ' + p.shape + ' (' + tiles.length + ' tiles): ' + Math.floor(((WEAPON[item] as any).damage || 0) * DEMO) + ' before armour' + (p.remote ? ', on your trigger' : '') + '.'] };
      },
      run: (h, args, rng) => {
        const u = h.u!, cb = h.cb!, k = tileOf(cb, args.tile)!, p = parseCharge(args.choice), item = explosiveOf(u, p.item)!;
        u.throwables![item]--;
        const ch = { at: k, from: u.pos, shape: p.shape, item };
        if (p.remote) { (stateOf(h).charges ||= []).push(ch); say(cb, u.name + ' sets a ' + WEAPON[item].name.toLowerCase() + ' at ' + refOf(k) + ', shaped as a ' + p.shape + ', on a trigger (Demolitionist).'); return null; }
        say(cb, u.name + ' sets a shaped ' + WEAPON[item].name.toLowerCase() + ' (' + p.shape + ') at ' + refOf(k) + ' and blows it' + detonate(h, rng, ch) + '.');
        checkOver(cb); return null;
      } },
    { id: 'detonate', label: 'Detonate', scope: ['combat'], ap: 1, target: 'none',
      text: 'Set off every charge you placed to wait for your trigger.',
      available: (h) => (stateOf(h).charges?.length ? true : false),
      run: (h, args, rng) => {
        const cb = h.cb!, list = stateOf(h).charges || []; delete stateOf(h).charges;
        for (const ch of list) say(cb, h.u!.name + ' blows the charge at ' + refOf(ch.at) + ' (Demolitionist)' + detonate(h, rng, ch) + '.');
        checkOver(cb); return null;
      } },
  ],
  on: {
    damage_in: (ctx, h) => { if (ctx.phase === 'reduce' && ctx.src?.type === 'explosion' && ctx.src.by === h.u && h.u) ctx.dmg = ctx.dmg * DEMO; },
    check_post: (ctx, h) => { if (ctx.c === h.c && (ctx.ck?.tags || []).includes('hearing')) { ctx.auto = 'fail'; ctx.labels.push('Ringing Ears'); } },
  },
  brief: () => 'tag checks that depend on hearing ("hearing": they fail); charges on doors and walls in the story are yours',
});

// ---------- Blade Recluse ----------
// One Blade: name one weapon ("Name your weapon", out of combat; renaming is free, PROVISIONAL). Kills with that weapon's
// mastery family count 1.25 (spec item 46). The named weapon can't be Disarmed (nor knocked aside: Lowered) and gets +1
// mod slot (a second slot of a type it has, plan 6b). Rusty Manners: −1 Charisma, Implication and Authority (the data's
// skill_mods: checks, passives and saves). Telling anyone who asks about the weapon, at length, is the Narrator's.
register({
  id: 'blade_recluse', claims: [0],
  actions: [
    { id: 'name_blade', label: 'Name your weapon', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'The weapon in your hand becomes your One Blade. Each kill with it counts as 1.25 kills towards its weapon mastery, it can\'t be Disarmed, and it gains an extra mod slot.',
      available: (h) => { const c = h.c; if (!c || !WEAPON[c.weapon] || c.weapon === 'fists') return false; return cs(c).oneBlade?.weapon === c.weapon ? 'Already your One Blade.' : true; },
      run: (h) => { const c = h.c!, w: any = WEAPON[c.weapon]; charState(c).oneBlade = { weapon: c.weapon, fam: w.mastery_family || null }; say(h.cb, c.name + ' names the ' + w.name + ' the One Blade.'); note(h, c.name + ' named the ' + w.name + ' as the One Blade'); return null; } },
    extraModAction('Fit a second mod (One Blade)', (h) => (cs(h.c).oneBlade?.weapon === h.c!.weapon ? (extraUsed(h.c!) < extraSlots(h.c!) ? true : 'No extra slot free.') : 'Only on your named weapon.')),
  ],
  on: {
    cond_apply: (ctx, h) => { if (ctx.t === h.u && h.u && ['disarmed', 'lowered'].includes(ctx.id) && cs(h.c).oneBlade?.weapon === h.u.weapon) { ctx.cancel = true; ctx.why = 'Blade Recluse: the One Blade stays in hand'; } },
    combat_end: (ctx, h) => {
      const u = h.u, c = h.c, ob = cs(c).oneBlade; if (!u || !c || !ob?.fam || !u.kills) return;
      const fam = WEAPON[u.weapon]?.mastery_family; if (fam !== ob.fam) return;
      c.weaponKills[fam] = Math.round(((c.weaponKills[fam] || 0) + 0.25 * u.kills) * 100) / 100;
    },
  },
  brief: () => 'asked about the weapon, they tell you at length',
});

// ---------- Slicer ----------
// Backdoor: 2 AP, at will, within 5 tiles (no sight needed, PROVISIONAL): take over one static electronic device — a
// door, terminal, camera, alarm panel or emplaced turret — until your next turn, on Proficiency (d20 + mod) against its
// tier (doors, terminals, cameras and alarms TN 12; a turret object 14; a turret unit by tier: minion 12, soldier 14,
// elite 16, boss 20; PROVISIONAL). Never mobile robots, bosses' bodies or people (plan 6a-17). A door opens, closes or
// locks; a turret unit is Puppeted (your player runs its next turn); what a terminal, camera or alarm does is the
// Narrator's. Story: off-map systems are Narrator checks. Jacked In: a lightning or EMP hit (SHOCK, SPARK, a bot
// scrambler) Stuns you for 1 turn, no save; machines get +2 to spot you (combat spotting, story notice and stay-hidden).
const DEVICE_TN: Record<string, number> = { door: 12, terminal: 12, camera: 12, alarm: 12, turret: 14 };
const TURRET_TN: Record<string, number> = { minion: 12, soldier: 14, elite: 16, boss: 20 };
const SLICE_RANGE = 5;
type Device = { obj?: any; unit?: Unit; tn: number; name: string } | string;
function deviceAt(h: Holder, args: { tile?: string; targetId?: string }): Device {
  const cb = h.cb!, u = h.u!;
  const tu = args.targetId ? unitById(cb, args.targetId) : null;
  const k = tu ? tu.pos : tileOf(cb, args.tile); if (!k) return 'Pick a device within ' + SLICE_RANGE + ' tiles.';
  if (dist(u.pos, k) > SLICE_RANGE) return 'Out of reach (' + SLICE_RANGE + ' tiles).';
  const t = tu || cb.units.find((v) => !v.dead && v.pos === k && v !== u) || null;
  if (t) {
    if (t.kind !== 'turret') return 'Only static devices: doors, terminals, cameras, alarms, emplaced turrets.';
    if (overworld(cb)) return 'A turret on the area map: start the fight first.';
    return { unit: t, tn: TURRET_TN[t.tier || 'soldier'] ?? 14, name: t.name };
  }
  const o = objectsAt(cb, k).find((x) => kindOf(x).door || (kindOf(x) as any).electronic); if (!o) return 'No device there.';
  if (o.kind === 'lamp') return 'A lamp has nothing to take over: shoot it out.';
  return { obj: o, tn: (o as any).tn ?? DEVICE_TN[o.kind] ?? 12, name: o.name };
}
register({
  id: 'slicer', claims: [2, 3],
  actions: [
    { id: 'backdoor', label: 'Backdoor', scope: ['combat', 'world'], ap: 2, target: 'tile',
      text: 'Take over a door, terminal, camera, alarm or emplaced turret within 5 tiles until your next turn: Acuity against its tier. A door: open, close or lock it.',
      preview: (h, args) => { const d = deviceAt(h, args); if (typeof d === 'string') return { ok: false, why: d }; const m = unitMod(h.u!, 'analysis'); return { lines: [d.name + ': d20 ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs ' + d.tn + ' (' + Math.max(5, Math.min(95, (21 - (d.tn - m)) * 5)) + '%).'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, d = deviceAt(h, args); if (typeof d === 'string') return d;
        const rv = rollVs(cb, rng, { by: u, mod: unitMod(u, 'analysis'), tn: d.tn, why: 'slicer' }), ok = rv.ok;
        let line = u.name + ' backdoors the ' + d.name.toLowerCase() + ': ' + rv.text;
        if (!ok) { say(cb, line + ' · locked out (Slicer).'); return null; }
        const st = stateOf(h), list: any[] = (st.devices ||= []);
        if (d.unit) { line += ' · it\'s yours until your next turn' + applyCond(cb, rng, u, d.unit, 'puppeted', 1, undefined, { skipSave: true, via: 'ingenuity' }); say(cb, line + '.'); return null; }
        const o = d.obj;
        if (kindOf(o).door) {
          const want = args.choice === 'lock' ? 'lock' : args.choice === 'close' ? 'close' : args.choice === 'open' ? 'open' : o.open ? 'close' : 'open';
          if (want === 'open' && cb.units.some((x) => !x.dead && x.pos === o.pos)) { /* already open with someone in it */ }
          list.push({ id: o.id, locked: !!o.locked });
          if (want === 'open') { o.open = true; o.locked = false; } else if (want === 'close') { if (!cb.units.some((x) => !x.dead && x.pos === o.pos)) o.open = false; } else if (!cb.units.some((x) => !x.dead && x.pos === o.pos)) { o.open = false; o.locked = true; }
          emitFx(cb, 'door', { unit: u.id, at: o.pos, open: !!o.open });
          say(cb, line + ' · the door ' + (o.locked ? 'locks' : o.open ? 'opens' : 'closes') + ' (Slicer).'); return null;
        }
        o.slicedBy = u.id; list.push({ id: o.id });
        say(cb, line + ' · it answers to ' + u.name + ' until their next turn (Slicer).');
        note(h, u.name + ' controls the ' + d.name.toLowerCase() + ' at ' + refOf(o.pos) + ' until their next turn: rule what it does');
        return null;
      } },
    { id: 'backdoor_story', label: 'Backdoor', scope: ['story'], ap: 0, target: 'text',
      text: 'Say which system you crack (bank, cameras, a city\'s network): the Narrator calls the Acuity check and its TN.',
      run: (h, args) => { note(h, 'Backdoor on "' + String(args.text || '').slice(0, 120) + '": call an Acuity check at the system\'s tier'); return null; } },
  ],
  on: {
    turn_start: (ctx, h) => {
      if (ctx.u !== h.u || !h.cb) return; const st = stateOf(h), list: any[] = st.devices || []; if (!list.length) return;
      for (const x of list) { const o: any = objectsOf(h.cb).find((y) => y.id === x.id); if (!o) continue; if (x.locked != null) o.locked = x.locked; delete o.slicedBy; }
      delete st.devices;
    },
    on_damaged: (ctx, h) => {
      const u = h.u, cb = h.cb; if (ctx.t !== u || !u || !cb || u.dead || u.downed) return;
      const src = ctx.src || {}, lightning = ['lightning', 'emp'].includes(src.dmgType); // SHOCK and SPARK carry dmgType lightning (magic.ts harm)
      if (lightning) say(cb, '(Jacked In: the implant shorts' + applyCond(cb, rngOf(h), src.by || null, u, 'stunned', 1, undefined, { skipSave: true }) + ')');
    },
    throw: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.preview || ctx.item !== 'bot_scrambler' || ctx.cancel || dist(u.pos, ctx.tile) > ctx.radius) return;
      say(cb, '(Jacked In: the scrambler fries the implant' + applyCond(cb, rngOf(h, ctx), ctx.u, u, 'stunned', 1, undefined, { skipSave: true }) + ')');
    },
    spot: (ctx, h) => { if (ctx.u === h.u && isMachine(ctx.by)) ctx.tn -= 2; },
    notice: (ctx, h) => { if (ctx.c === h.c && isMachine(ctx.npc)) ctx.range += 2; },
    stay_hidden: (ctx, h) => { if (ctx.c === h.c && isMachine(ctx.npc)) ctx.tn += 2; },
  },
  brief: () => 'off-map systems: you call the Acuity check; tag robots kind robot so they spot them +2',
});

