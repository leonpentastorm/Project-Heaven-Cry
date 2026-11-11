// Lane E: command, AP economy, team, medic. Perks: Grim Reaper, Overruled!, Blueprint, Talks Broke Down, Rally Cry,
// Soulmate, Sweet Talker, Outclassed, Many Hands, On My Mark, Supreme Command, The Voice, Between Heartbeats,
// Spoon-Feed, Flat Line, Pattern Lock, Lay Down Arms, Field Surgeon, Angel of the Trenches. Traits: Sworn Sibling,
// Rival, Born Officer, Field Medic.
//
// Every item runs every tier in combat, on the area map where it applies, and its story part where it has one; what
// the engine can't judge goes to the Narrator (note / pendRuling / brief). Recommended fixes from the audit (plan
// section 6) are marked PROVISIONAL here and listed in the spec (section 14, tags E…) and docs/design/perk-runtime.md with the hooks still missing.
import {
  register, stateOf, uses, note, has, tierOf, grantPerkAp, bankAp, refusedGift, apDebt, pushAp, applyDamage, healUnit, openWindow,
  armedOf, disarm, actionAp, postStory, pendRuling, boundGame, PERK_AP_CAP, type Holder,
} from '../effects';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import {
  dist, alive, keyOf as refKey, unitSees, sideSees, lineOfSight, paths, apForTiles, previewAttack, resolveAttack, moveUnit,
  toggleProne, reload, useStim, stimAp, emitFx, checkOver, isMelee, standable, key, xy, active,
} from '../combat';
import { WEAPON, SKILL } from '../data';
import { mod, strengthOf, healingMult, maxHp, packOf, levelForXp, applyLevels, isMedicChar, classRank } from '../character';
import { applyCond, condOn, condSource, unitStrength, isBoon } from '../magic';
import { d20 } from '../rng';
import { HEARING } from '../tactics';
import { apLeft, positionsOf, rankReached } from '../game';
import { cdFire, cdTick, landsNow, landsNext } from './cooldown';

// ---------- small helpers ----------
type Rng = { state: number };
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const tierII = (h: Holder) => h.tier === 'II';
const gameOf = (h: Holder) => h.g ?? boundGame();
const rngOf = (h: Holder, ctx?: any): Rng => ctx?.rng || gameOf(h)?.rng || { state: 1 };
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const tileOf = (cb: Combat, t?: string) => (!t ? null : /^\d+,\d+$/.test(t) ? t : refKey(t, cb.map));
const unitById = (cb: Combat | null | undefined, id: string | undefined | null) => (cb && id ? cb.units.find((x) => x.id === id) || null : null);
/** Character item state that lasts beyond a fight (bonds, charms, the last talk). */
const charState = (c: Character | null | undefined): Record<string, any> => (c ? ((c as any).state ||= {}) : {});
/** Read it without creating it (stat queries and previews must not change state). */
const cs = (c: Character | null | undefined): Record<string, any> => (c as any)?.state || {};
const ownTurn = (cb: Combat, u: Unit) => cb.order[cb.turn] === u.id && !cb.window;
const isPcAlly = (u: Unit, v: Unit) => v.side === u.side && !v.companion;
const isMachine = (x: Unit | null | undefined) => !!x && (['robot', 'machine', 'turret', 'drone'].includes(x.kind || '') || /robot|drone|automaton|\bbot\b|turret/i.test(x.name || ''));
const charOf = (h: Holder, u: Unit | null | undefined): Character | null => (u?.charId ? gameOf(h)?.characters?.[u.charId] || null : null);
/** A unit's story-side record (g.story.ps[charId].items[key]): survives the fight starting (units are rebuilt). */
function storyState(h: Holder): Record<string, any> {
  const g = gameOf(h), id = h.c?.id || h.u?.charId; if (!g?.story || !id) return {};
  const ps = ((g.story.ps ||= {})[id] ||= {}); return ((ps.items ||= {})[h.key] ||= {});
}
/** Shared state on another unit under this item's key (one record however many holders: no stacking). */
const unitState = (h: Holder, u: Unit): Record<string, any> => ((u.ps ||= {})[h.key] ||= {});
/** The tiles a unit can reach for at most n AP (with what it walks), and the path distance. */
function reach(cb: Combat, u: Unit, ap: number): Record<string, number> {
  const P = paths(cb, u.pos, u.id), out: Record<string, number> = {};
  for (const [k, tiles] of Object.entries(P.dist)) if (apForTiles(tiles as number, 0, u.movement) <= ap) out[k] = tiles as number;
  return out;
}
const DIALOGUE = new Set(['charisma', 'eloquence', 'implication', 'empathy', 'authority', 'intimidation', 'composure', 'deception', 'persuasion']);
const isDialogue = (ck: any) => (ck?.skills || []).some((s: string) => DIALOGUE.has(s)) || (ck?.tags || []).includes('dialogue');

// ---------- bonds (Soulmate, Sworn Sibling, Rival) ----------
// A bond names a squadmate (character id). Sworn Sibling and Rival need the other player's consent (data
// requires_consent): the bond takes hold at once and a pending ruling asks the Narrator to confirm both players agreed;
// a refusal gives the use back, and a bond whose use was refunded no longer holds (PROVISIONAL: there is no lobby
// consent action yet, see the lane notes). Soulmate needs no consent.
const BOND_SCOPE = 'per_campaign';
function pickChar(h: Holder, choice: string | undefined): Character | string {
  const g = gameOf(h), want = String(choice || '').trim().toLowerCase(); if (!want) return 'Name a squadmate.';
  const c = Object.values(g?.characters || {}).find((x: any) => x.id === choice || x.name.toLowerCase() === want || ('pc-' + x.id) === choice) as Character | undefined;
  if (!c) return 'No squadmate by that name.';
  if (c.id === h.c?.id) return 'Bond with someone else.';
  if (c.dead) return c.name + ' is dead.';
  return c;
}
/** The squadmates this holder is bonded to (ids), honouring a refused consent. */
function bondsOf(h: Pick<Holder, 'c' | 'key' | 'u' | 'g' | 'cb'>, consent: boolean): string[] {
  const c = h.c; if (!c) return h.u?.ps?.[h.key]?.bondIds || []; // a fight copies the bond onto the unit (previews with no game bound)
  const b = cs(c)['bond:' + h.key]; if (!b) return [];
  if (consent && b.use != null && uses(h as Holder).used(BOND_SCOPE, h.key + '#bond') < b.use) return [];
  return [...(b.ids || [])];
}
function bondAction(max: (h: Holder) => number, consent: boolean, label: string) {
  return {
    id: 'bond', label, scope: ['story', 'world'] as any, pick: 'squad' as const, pickLabel: 'The squadmate', ap: 0, target: 'none' as const, uses: { per: BOND_SCOPE as any, n: 999 },
    text: consent ? 'Name a squadmate to bond with. Their player must agree, and the Narrator confirms it.' : 'Name a squadmate to bond with.',
    preview: (h: Holder, args: any) => { const t = pickChar(h, args.choice || args.text || args.npc); return typeof t === 'string' ? { ok: false, why: t } : { lines: ['Bond with ' + t.name + '.'] }; },
    run: (h: Holder, args: any) => {
      const t = pickChar(h, args.choice || args.text || args.npc); if (typeof t === 'string') return t;
      const st = charState(h.c), b = (st['bond:' + h.key] ||= { ids: [] });
      b.ids = [...(b.ids || []).filter((x: string) => x !== t.id), t.id].slice(-max(h));
      if (consent) {
        b.use = uses(h).used(BOND_SCOPE, h.key + '#bond');
        const g = gameOf(h);
        if (g && h.c && t.owner !== h.c.owner) pendRuling(g, h.c, h.key, h.c.name + ' and ' + t.name + ' bond (' + h.info.name + '). Confirm ' + t.name + '\'s player agrees; refuse (accepted: false) to undo it.');
      }
      postStory(h, h.c!.name + ' and ' + t.name + ': ' + h.info.name + '.', { kind: 'system' });
      say(h.cb, h.c!.name + ' bonds with ' + t.name + ' (' + h.info.name + ').');
      return null;
    },
  };
}
const bondNames = (h: Holder, consent: boolean) => bondsOf(h, consent).map((id) => gameOf(h)?.characters?.[id]?.name || id).join(', ');
const bondUnits = (h: Holder, consent: boolean): Unit[] => { const ids = bondsOf(h, consent); return (h.cb?.units || []).filter((x) => x.charId && ids.includes(x.charId)); };

// ---------- Rival's Petty gate (used by every help action in this lane) ----------
/** Helping your rival takes a Camaraderie check first (TN 12, PROVISIONAL): returns an error when it fails, else null. */
export function pettyGate(h: Holder, target: Unit | Character | null | undefined, rng: Rng): string | null {
  const c = h.c; if (!c || !target || !has(c, 'trait:rival')) return null;
  const tid = 'side' in (target as any) ? (target as Unit).charId : (target as Character).id; if (!tid) return null;
  const rh = { key: 'trait:rival', c, u: h.u, cb: h.cb, g: gameOf(h) } as Holder;
  if (!bondsOf(rh, true).includes(tid)) return null;
  const st = h.u && inFight(h) ? stateOf(rh) : storyState(rh), stamp = h.cb && !overworld(h.cb) ? h.cb.round + '.' + h.cb.turn : 'w' + (gameOf(h)?.story?.round ?? 0);
  if (st.pettyFail === stamp) return 'Petty (Rival): you can\'t bring yourself to help them this turn.';
  if (st.pettyOk === stamp) return null;
  const r = d20(rng), m = mod(c.skills.camaraderie || 0), ok = r === 20 || (r !== 1 && r + m >= 12);
  say(h.cb, c.name + ' swallows their pride? Camaraderie d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (r + m) + ' vs 12 · ' + (ok ? 'yes' : 'no (Rival: Petty)'));
  if (ok) { st.pettyOk = stamp; return null; }
  st.pettyFail = stamp; return 'Petty (Rival): you can\'t bring yourself to help them this turn.';
}

// ======================================================================================================== PERKS

// ---------- Grim Reaper (Intimidation γ) ----------
// I: −1 AP on your first turn of each fight; a kill or a KO (a subdued foe) of an enemy on your own turn gives +2 AP at
// once, once every 3 of your turns (the AP perks' cooldown, ./cooldown.ts; the +3 cap and the 9 ceiling hold). II: no first-turn penalty; same +2; every enemy who sees
// the kill saves (Heart, vs 12 + your Intimidation strength) against Fear, with you as its source. A kill on someone
// else's turn (Overwatch, a reaction) gives nothing. Area map fights count the same (the first-turn penalty is a fight's).
function reaperKill(h: Holder, victim: Unit, rng: Rng) {
  const u = h.u, cb = h.cb; if (!u || !cb || victim.side === u.side) return;
  // The area map keeps its once-a-turn limit; in a fight the cooldown decides (and the turn's use is still counted, so
  // the perk card says "Used this turn").
  if (overworld(cb) ? uses(h).take('per_turn', 1, h.key + '#ap') : cdFire(h, 'gain', cb.round)) {
    if (overworld(cb)) { u.ap += 2; say(cb, u.name + ' +2 AP (Grim Reaper).'); } else { uses(h).take('per_turn', 1, h.key + '#ap'); grantPerkAp(cb, u, 2, 'Grim Reaper'); }
  }
  if (tierII(h) && !overworld(cb)) {
    for (const f of cb.units) if (f.side !== u.side && alive(f) && f !== victim && unitSees(cb, f, victim.pos)) say(cb, u.name + '\'s kill (Grim Reaper)' + applyCond(cb, rng, u, f, 'fear', undefined, 'heart', { via: 'intimidation' }) + '.');
  }
}
register({
  id: 'grim_reaper', claims: 'all',
  on: {
    turn_start_pre: (ctx, h) => {
      if (ctx.u !== h.u || !inFight(h)) return; const st = stateOf(h); cdTick(h);
      if (!st.firstDone) { st.firstDone = true; if (!tierII(h)) pushAp(ctx, -1, 'Grim Reaper: first turn'); }
    },
    on_kill: (ctx, h) => { if (ctx.by === h.u && ctx.ownTurn) reaperKill(h, ctx.victim, rngOf(h, ctx)); },
    on_surrender: (ctx, h) => { if (ctx.why === 'subdued' && ctx.by === h.u && h.cb && h.u && ownTurn(h.cb, h.u)) reaperKill(h, ctx.t, rngOf(h, ctx)); },
  },
  brief: () => null,
});

// ---------- Overruled! (Eloquence γ) ----------
// I: +2 AP at the start of your turn while a Left Brain Debuff you inflicted is on a living enemy (once, however many);
// −2 AP while you carry one. II: Left or Right Brain Debuff; your own penalty is −1. Non-casters inflict it with the
// fight's Persuade (rules 1.3, 2 AP). The story has no debuffs: no story part. The bonus comes at most once every 3 of
// your turns, and so does the penalty, each counted by itself (the AP perks' cooldown, ./cooldown.ts).
register({
  id: 'overruled', claims: 'all',
  on: {
    turn_start_pre: (ctx, h) => {
      const u = h.u, cb = h.cb; if (ctx.u !== u || !u || !cb) return;
      const ids = tierII(h) ? ['ldebuff', 'rdebuff'] : ['ldebuff']; cdTick(h);
      if (cb.units.some((e) => e.side !== u.side && alive(e) && ids.some((id) => condSource(e, id) === u.id)) && cdFire(h, 'gain', cb.round)) pushAp(ctx, 2, 'Overruled!');
      if (ids.some((id) => condOn(u, id)) && cdFire(h, 'pen', cb.round)) pushAp(ctx, tierII(h) ? -1 : -2, 'Overruled! (your own Brain Debuff)');
    },
  },
  brief: () => null,
});

// ---------- Blueprint (Visualization α) ----------
// Story / area map: "Sketch the ground" (1 AP on the area map, free in the story; once a scene, PROVISIONAL plan 6):
// every squadmate in the scene (the holder too) has seen it. When the next fight starts in the same scene, those units
// get +1 Movement (tiles per AP: as written; strong at Agility 1, flagged) on their round-1 turn; II: +2 Movement
// (rules 1.13: an alpha gives no AP). The mark is used up by that fight, or lapses with the scene. A fight with no story before it
// (the sandbox) gets nothing.
register({
  id: 'blueprint', claims: 'all',
  actions: [{
    id: 'sketch', label: 'Sketch the ground', scope: ['world', 'story'], ap: (h) => (h.cb ? 1 : 0), uses: { per: 'per_scene', n: 1 }, target: 'none',
    text: 'Once a scene: sketch the ground before the assault. I: every squadmate here gets +1 Movement in round 1 of the next fight this scene. II: +2 Movement.',
    run: (h) => {
      const g = gameOf(h); if (!g) return 'No story.';
      const saw = Object.values(g.characters || {}).filter((c: any) => !c.dead).map((c: any) => c.id);
      const st = storyState(h); st.sketch = { scene: g.story.scene?.n ?? 0, zone: g.story.zone, saw, tier: h.tier };
      say(h.cb, (h.c?.name || 'Someone') + ' sketches the ground for the squad (Blueprint).');
      if (!h.cb) postStory(h, 'sketches the ground: the squad knows where to go when it starts.', { kind: 'system' });
      return null;
    },
  }],
  on: {
    combat_start: (ctx, h) => {
      const g = gameOf(h), cb = ctx.cb as Combat; if (!g || !h.c || overworld(cb)) return;
      const st = storyState(h), sk = st.sketch; if (!sk) return;
      delete st.sketch;
      if (sk.scene !== (g.story.scene?.n ?? 0)) return;
      for (const u of cb.units) if (u.charId && sk.saw.includes(u.charId)) { const us = unitState(h, u); us.tier = us.tier === 'II' ? 'II' : sk.tier; }
      say(cb, 'The squad fights to ' + h.c.name + '\'s sketch (Blueprint): +' + (sk.tier === 'II' ? 2 : 1) + ' Movement in round 1.');
    },
    turn_start: (ctx, h) => {
      const u = ctx.u as Unit, cb = h.cb; if (!cb || cb.round !== 1 || !u.ps?.[h.key]?.tier) return;
      const us = unitState(h, u); if (us.mv != null) return;
      us.mv = u.movement; u.movement += us.tier === 'II' ? 2 : 1;
    },
    turn_end: (ctx, h) => {
      const u = ctx.u as Unit, us = u.ps?.[h.key]; if (!us || us.mv == null || us.mvBack) return;
      u.movement = us.mv; us.mvBack = true;
    },
  },
  brief: () => null,
});

// ---------- Talks Broke Down (Charisma γ) ----------
// The engine reads how the talk went: the last dialogue check (a dialogue skill, or the 'dialogue' tag) any squadmate
// made this scene, before the fight started. The Narrator's combat.fromTalk says whether the fight started because of
// it; when it says nothing the engine infers it from a talk this story round or the one before (PROVISIONAL; this
// timing is the card's rule since rules 1.14, the Narrator's fromTalk only overrules it). I: won, +2 AP on your first
// turn of the fight and then once every 3 turns (turns 1, 4, 7: the AP perks' cooldown, ./cooldown.ts; it was every
// turn); lost, −2 on the same turns. II: no penalty, and the first enemy in initiative order hesitates: −1 AP on its
// round-1 turn.
register({
  id: 'talks_broke_down', claims: 'all',
  on: {
    check_result: (ctx, h) => {
      const g = gameOf(h); if (!g || !h.c || !isDialogue(ctx.ck) || !ctx.roll) return;
      storyState(h).talk = { ok: !!ctx.roll.ok, scene: g.story.scene?.n ?? 0, round: g.story.round ?? 0 };
    },
    combat_start: (ctx, h) => {
      const g = gameOf(h), cb = ctx.cb as Combat; if (!g || !h.u || overworld(cb)) return;
      // The Narrator's fromTalk decides when given (false: an unrelated fight, no effect; true: the scene's last talk
      // counts, however many rounds ago); absent, the engine infers it from a talk this round or the one before.
      const t = storyState(h).talk; if (!t || t.scene !== (g.story.scene?.n ?? 0) || cb.fromTalk === false) return;
      if (cb.fromTalk !== true && (g.story.round ?? 0) - t.round > 1) return;
      const st = stateOf(h); st.origin = t.ok ? 'won' : 'lost';
      say(cb, 'Talks broke down (' + h.u.name + '): the fight follows a ' + (t.ok ? 'won' : 'lost') + ' argument.');
      if (tierII(h)) { const f = cb.order.map((id) => unitById(cb, id)!).find((x) => x && x.side !== h.u!.side && alive(x)); if (f) { const fs = unitState(h, f); if (!fs.hesitate) { fs.hesitate = true; say(cb, f.name + ' hesitates (Talks Broke Down): −1 AP in round 1.'); } } }
    },
    turn_start_pre: (ctx, h) => {
      const cb = h.cb; if (!cb) return;
      if (ctx.u === h.u) {
        const o = stateOf(h).origin; cdTick(h);
        if (o === 'won') { if (cdFire(h, 'gain', cb.round)) pushAp(ctx, 2, 'Talks Broke Down'); }
        else if (o === 'lost' && !tierII(h)) { if (cdFire(h, 'pen', cb.round)) pushAp(ctx, -2, 'Talks Broke Down'); }
      }
      const fs = (ctx.u as Unit).ps?.[h.key]; if (fs?.hesitate && cb.round === 1 && !fs.hesitated) { fs.hesitated = true; pushAp(ctx, -1, 'hesitates'); }
    },
  },
  brief: () => 'a fight within one story round of a talk counts as breaking out of it; set combat.fromTalk only to overrule that',
});

// ---------- Rally Cry (Camaraderie β) ----------
// Rules 1.13 (a beta gives no AP). I: when an ally drops to 0 HP (Downed or killed) by an enemy, a hazard or an enemy's
// effect (not friendly fire or your own side's magic), every other ally, the holder included, takes 15% less damage
// until their own next turn starts; II: 25%. Several drops or holders don't stack (the best counts). PROVISIONAL.
const RALLY = { I: 0.15, II: 0.25 };
register({
  id: 'rally_cry', claims: 'all',
  on: {
    on_downed: (ctx, h) => {
      const v = ctx.victim as Unit, u = h.u, cb = h.cb; if (!u || !cb || v.side !== u.side || v.companion) return;
      if (ctx.by && ctx.by.side === v.side) return; // friendly fire, or your own Mana Short
      if (ctx.dead && v.downed) return; // finished off while already Downed: they dropped to 0 once, not twice
      const n = tierII(h) ? RALLY.II : RALLY.I, got: string[] = [];
      for (const a of cb.units) {
        if (a === v || a.side !== u.side || a.dead || a.downed || a.companion) continue;
        const as = unitState(h, a); if ((as.less || 0) >= n) continue;
        as.less = n; got.push(a.name);
      }
      if (got.length) say(cb, v.name + ' is down: ' + got.join(', ') + ' take ' + Math.round(n * 100) + '% less damage until their next turn (Rally Cry).');
    },
    turn_start: (ctx, h) => { const as = (ctx.u as Unit)?.ps?.[h.key] as any; if (as?.less) as.less = 0; },
    damage_in: (ctx, h) => {
      if (ctx.phase !== 'reduce' || ctx.dmg <= 0) return; const t = ctx.t as Unit, less = (t.ps?.[h.key] as any)?.less || 0; if (!less) return;
      const prev = ctx._rally || 0; if (less <= prev) return; // two holders: the best one counts
      ctx.dmg = (ctx.dmg / (1 - prev)) * (1 - less); ctx._rally = less;
    },
  },
  brief: () => null,
});

// ---------- Soulmate (Camaraderie β) ----------
// I: bond with one teammate (out of a fight: "Bond"); II: two. Damage a bondmate takes, after armour and their shield,
// is shared: you take 5% at Camaraderie Mastery 1, 10% at M2, 15% at M3, 20% at M4 and Mastered (rounded down), as
// true damage that is never shared again (no ping-pong between mutual Soulmates). PROVISIONAL (plan 6): the share
// stops at your last HP (you can't Down yourself for a bondmate), and you must be up to take it.
const soulPct = (c: Character | null | undefined) => { const p = c?.skills?.camaraderie || 0; return p >= 9 ? 0.2 : p >= 7 ? 0.15 : p >= 5 ? 0.1 : p >= 3 ? 0.05 : 0; };
function soulShare(ctx: any, h: Holder) {
  const t = ctx.t as Unit, u = h.u, cb = h.cb; if (!u || !cb || t === u || ctx.src?.shared || !alive(u) || t.downed) return;
  if (!t.charId || !bondsOf(h, false).includes(t.charId)) return;
  const shieldTake = ctx.phase === 'shield' ? Math.min(t.shield || 0, ctx.dmg) : 0, rest = ctx.dmg - shieldTake;
  let share = Math.floor(rest * soulPct(h.c)); share = Math.min(share, Math.max(0, u.hp - 1)); if (share <= 0) return;
  ctx.dmg -= share;
  applyDamage(cb, u, share, { type: 'true', by: ctx.src?.by || null, shared: true, shield: false, credit: 'none' });
  say(cb, u.name + ' takes ' + share + ' of the blow meant for ' + t.name + ' (Soulmate).');
}
register({
  id: 'soulmate', claims: 'all', priority: 900,
  actions: [bondAction((h) => (tierII(h) ? 2 : 1), false, 'Bond (Soulmate)')],
  on: {
    damage_in: (ctx, h) => {
      if (ctx.phase === 'shield') soulShare(ctx, h);
      else if (ctx.phase === 'reduce' && ctx.src?.shield === false) soulShare(ctx, h); // hazards and bleeding: no shield phase
    },
  },
  brief: (h) => { const n = bondNames(h, false); return n ? 'bonded to ' + n : null; },
});

// ---------- Sweet Talker (Implication γ) ----------
// The charm: a successful Charisma or Implication check aimed at an NPC (the check's target) marks that NPC charmed
// for the scene. In a fight (and on the area map) buffing or debuffing that NPC's unit gives +2 AP at once (II +3),
// once every 3 of your turns in a fight (the AP perks' cooldown, ./cooldown.ts; once a turn on the area map). I: a
// charmed NPC who debuffs you costs you 2 AP on your next turn, also at most once every 3 turns. The fight is usually
// the same scene, so the charm carries in.
const charmedKey = (s: string) => String(s || '').trim().toLowerCase();
function charmedBy(h: Holder, t: Unit): boolean {
  const g = gameOf(h), ch = cs(h.c).charmed; if (!ch || !g || ch.scene !== (g.story?.scene?.n ?? 0)) return false;
  return (ch.npcs || []).some((n: string) => n === charmedKey(t.npcId || '') || n === charmedKey(t.id) || n === charmedKey(t.name));
}
register({
  id: 'sweet_talker', claims: 'all',
  on: {
    check_result: (ctx, h) => {
      const g = gameOf(h); if (ctx.c !== h.c || !g || !ctx.roll?.ok || !ctx.ck?.target) return;
      if (!(ctx.ck.skills || []).some((s: string) => s === 'charisma' || s === 'implication')) return;
      const st = charState(h.c), sc = g.story.scene?.n ?? 0;
      if (!st.charmed || st.charmed.scene !== sc) st.charmed = { scene: sc, npcs: [] };
      const k = charmedKey(ctx.ck.target); if (!st.charmed.npcs.includes(k)) st.charmed.npcs.push(k);
      const n = (g.story.npcs || []).find((x: any) => charmedKey(x.name) === k || charmedKey(x.id) === k); if (n && !st.charmed.npcs.includes(charmedKey(n.id))) st.charmed.npcs.push(charmedKey(n.id));
    },
    cond_landed: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb) return;
      if (ctx.by === u && ctx.t !== u && charmedBy(h, ctx.t)) {
        if (overworld(cb) ? !uses(h).take('per_turn', 1, h.key + '#ap') : !cdFire(h, 'gain', landsNow(cb, u))) return;
        const n = tierII(h) ? 3 : 2;
        if (overworld(cb)) { u.ap += n; say(cb, u.name + ' +' + n + ' AP (Sweet Talker).'); } else { uses(h).take('per_turn', 1, h.key + '#ap'); grantPerkAp(cb, u, n, 'Sweet Talker'); }
      } else if (ctx.t === u && ctx.by && ctx.by !== u && !tierII(h) && !isBoon(ctx.id) && charmedBy(h, ctx.by)) {
        if (stateOf(h).sting || !cdFire(h, 'pen', landsNext(cb, u))) return;
        stateOf(h).sting = true; say(cb, ctx.by.name + '\'s betrayal stings (Sweet Talker): −2 AP next turn.');
      }
    },
    turn_start_pre: (ctx, h) => { if (ctx.u !== h.u) return; cdTick(h); if (stateOf(h).sting) { delete stateOf(h).sting; pushAp(ctx, -2, 'Sweet Talker: betrayal'); } },
  },
  brief: (h) => { const ch = cs(h.c).charmed; return ch?.npcs?.length ? 'charmed this scene: ' + ch.npcs.slice(0, 3).join(', ') + ' (name the target on social checks)' : 'name the target NPC on Charisma/Insinuation checks'; },
});

// ---------- Outclassed (Authority γ) ----------
// I: the fight's first enemy death: if your side made it and you had damaged that enemy, +3 AP on your next turn; the
// fight's first casualty on your side (a PC Downed or dead), −2 AP on your next turn. II: no penalty, and whoever made
// the kill also gets +1 AP on their next turn (once, however many holders). Only a death counts as the kill (a
// surrender or a subdued foe doesn't; plan 6).
register({
  id: 'outclassed', claims: 'all',
  on: {
    on_downed: (ctx, h) => {
      const v = ctx.victim as Unit, u = h.u, cb = h.cb; if (!u || !cb || overworld(cb)) return;
      const st = stateOf(h);
      if (v.side !== u.side && v.dead && !st.kill) {
        st.kill = true; const by = ctx.by as Unit | null;
        if (by && by.side === u.side) {
          if ((v.damagedBy || []).includes(u.id)) { bankAp(u, 3, 'Outclassed', cb); }
          if (tierII(h) && !by.companion) { const ks = unitState(h, by); if (!ks.bonus) { ks.bonus = true; bankAp(by, 1, 'Outclassed: the kill', cb); } }
        }
      } else if (v.side === u.side && !v.companion && !st.casualty) {
        st.casualty = true; if (!tierII(h)) { st.pen = true; say(cb, 'First casualty (Outclassed): ' + u.name + ' −2 AP next turn.'); }
      }
    },
    turn_start_pre: (ctx, h) => { if (ctx.u === h.u && stateOf(h).pen) { delete stateOf(h).pen; pushAp(ctx, -2, 'Outclassed: first casualty'); } },
  },
  brief: () => null,
});

// ---------- Many Hands (Camaraderie Mastered) ----------
// Rules 1.13 (the AP gift went to the Calls). Your Hand-Off (Camaraderie 3: an ally uses your Defense against one
// attack a round) reaches any ally within 3 tiles: perks/skeleton.ts reads this perk for its reach. An ally you can see
// whose reaction is spent may use yours: tactics.ts canReact/useReaction spend the holder's (reactionDonor).
register({ id: 'many_hands', claims: 'all', brief: () => null });

// ---------- On My Mark (Authority Mastered) ----------
// 1 AP, once per round, on your turn: order an ally who can hear you (any conscious ally: a shout or the radio,
// PROVISIONAL). They act at once, outside their turn (an off-turn window: their player acts, or declines), with up to
// 4 AP (6 minus the floor of 2: plan 6, PROVISIONAL); what they spend comes off their next turn after the floor (AP
// debt). One order per ally per round, however many holders.
const OMM = 'On My Mark';
function ommSettle(h: Holder) {
  const cb = h.cb; if (!cb || overworld(cb)) return;
  const st = stateOf(h), m = st.mark; if (!m || (cb.window && cb.window.kind === OMM)) return;
  delete st.mark;
  const t = unitById(cb, m.ally); if (!t) return;
  const spent = Math.max(0, Math.round((m.pool - t.ap) * 10) / 10);
  t.ap = m.real;
  if (spent > 0) { apDebt(t, Math.ceil(spent)); say(cb, t.name + ' owes ' + Math.ceil(spent) + ' AP next turn (On My Mark).'); }
}
register({
  id: 'on_my_mark', claims: 'all',
  actions: [{
    id: 'order', label: 'On My Mark', scope: ['combat'], ap: 1, uses: { per: 'per_round', n: 1 }, target: 'ally',
    text: 'Once a round, on your turn: order an ally to take one action now, outside their turn. They can spend up to 4 AP, and it comes off their next turn.',
    available: (h) => (h.cb && h.u && ownTurn(h.cb, h.u) ? true : h.u ? 'Only on your turn.' : false),
    preview: (h, args) => {
      const cb = h.cb, t = unitById(cb, args.targetId); if (!cb || !t) return {};
      if (t === h.u) return { ok: false, why: 'Order someone else.' };
      if (t.side !== h.u!.side || t.companion) return { ok: false, why: 'Pick a squadmate.' };
      if (!alive(t) || condOn(t, 'stunned')) return { ok: false, why: t.name + ' can\'t act now.' };
      if (condOn(t, 'silenced')) return { ok: false, why: t.name + ' is Silenced and can\'t answer.' };
      if (t.ps?.[h.key]?.round === cb.round) return { ok: false, why: t.name + ' already took an order this round.' };
      return { lines: [t.name + ' acts now with up to 4 AP; what they spend comes off their next turn.'] };
    },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
      unitState(h, t).round = cb.round;
      const pool = Math.min(4, 6);
      stateOf(h).mark = { ally: t.id, real: t.ap, pool };
      t.ap = pool;
      openWindow(cb, OMM, [{ unitId: t.id, limit: 1 }], u.id);
      emitFx(cb, 'perk', { unit: u.id, target: t.id, id: 'on_my_mark' });
      return null;
    },
  }],
  on: {
    move_cost: (ctx, h) => { if (!ctx.preview) ommSettle(h); },
    turn_end: (ctx, h) => ommSettle(h),
    turn_start_pre: (ctx, h) => ommSettle(h),
    round_start: (ctx, h) => ommSettle(h),
    enemy_action_start: (ctx, h) => ommSettle(h),
    attack_target: (ctx, h) => ommSettle(h),
    reload: (ctx, h) => ommSettle(h),
    combat_end: (ctx, h) => ommSettle(h),
    action_done: (ctx, h) => ommSettle(h), // at once, after the ally's action (the hooks above stay as fallbacks)
  },
  brief: () => null,
});
/** Settle an On My Mark debt now (tests and the reducer's next action do it lazily). */
export const settleOnMyMark = (h: Holder) => ommSettle(h);

// ---------- Supreme Command (Ultimate: The Voice + Make Way) ----------
// Once per fight, 0 AP on your turn (PROVISIONAL: the data gives no cost; an order is a sentence): every other living,
// conscious squadmate takes one action of up to 2 AP at once, from a pool of 2 that isn't their own AP, one at a time
// in initiative order; your turn resumes after. A player who is away is skipped by the host (Decline).
register({
  id: 'supreme_command', claims: 'all',
  actions: [{
    id: 'supreme_command', label: 'Supreme Command', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'none',
    text: 'Once a fight, on your turn: order the whole squad. Every ally takes a free 2 AP action now, in initiative order.',
    available: (h) => (h.cb && h.u && ownTurn(h.cb, h.u) ? true : h.u ? 'Only on your turn.' : false),
    preview: (h) => { const n = (h.cb?.units || []).filter((x) => x !== h.u && x.side === h.u?.side && alive(x) && !x.companion).length; return n ? { lines: [n + ' allies act now, 2 AP each.'] } : { ok: false, why: 'No one to command.' }; },
    run: (h) => {
      const cb = h.cb!, u = h.u!;
      const q = cb.order.map((id) => unitById(cb, id)!).filter((x) => x && x !== u && x.side === u.side && alive(x) && !x.companion);
      openWindow(cb, 'Supreme Command', q.map((x) => ({ unitId: x.id, ap: 2, limit: 1 })), u.id);
      emitFx(cb, 'perk', { unit: u.id, id: 'supreme_command' });
      return null;
    },
  }],
  brief: () => null,
});

// ---------- The Voice (Authority + Composure, Achieved) ----------
// Once per session, 0 AP (speaking is free; PROVISIONAL: the data gives no cost), in a fight: every minion- or
// soldier-tier enemy within hearing (8 tiles) makes a Heart save vs 12 + your Authority modifier (PROVISIONAL) or obeys
// your order on its next turn: Halt, Hold fire, Drop it (Disarmed), Kneel (prone) or Fall back (flee) — the engine's
// Commanded menu. Any other order (typed) is the Narrator's: it goes in the fight report. Elites and bosses ignore it.
const ORDERS: Record<string, string> = { halt: 'halt', hold: 'hold', 'hold fire': 'hold', drop: 'drop', 'drop it': 'drop', kneel: 'kneel', 'get down': 'kneel', down: 'kneel', flee: 'flee', 'fall back': 'flee', fall_back: 'flee' };
register({
  id: 'the_voice', claims: 'all', narrator: (e) => e?.op === 'condition',
  actions: [{
    id: 'the_voice', label: 'The Voice', scope: ['combat'], ap: 0, uses: { per: 'per_session', n: 1 }, target: 'none',
    text: 'Once a session: give an order (halt, hold fire, drop it, kneel, fall back, or one in your own words). Rank-and-file enemies who hear it make a Heart save. Those who fail obey on their next turn.',
    preview: (h, args) => {
      const cb = h.cb, u = h.u; if (!cb || !u) return {};
      const order = ORDERS[String(args.choice || '').trim().toLowerCase()] || (args.text ? 'other' : '');
      if (!order) return { ok: false, why: 'Pick an order: halt, hold fire, drop it, kneel or fall back, or type your own.' };
      const n = cb.units.filter((t) => t.side !== u.side && alive(t) && ['minion', 'soldier'].includes(t.tier || 'minion') && dist(t.pos, u.pos) <= HEARING).length;
      return n ? { lines: [n + ' enemies hear you (Heart save vs ' + (12 + unitStrength(u, 'authority')) + ').'] } : { ok: false, why: 'No rank-and-file enemy within ' + HEARING + ' tiles.' };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, order = ORDERS[String(args.choice || '').trim().toLowerCase()] || 'other';
      const said = args.text ? ' "' + String(args.text).slice(0, 120) + '"' : '';
      const out: string[] = [];
      for (const t of cb.units) {
        if (t.side === u.side || !alive(t) || !['minion', 'soldier'].includes(t.tier || 'minion') || dist(t.pos, u.pos) > HEARING) continue;
        out.push(applyCond(cb, rng, u, t, 'commanded', 1, 'heart', { via: 'authority', arg: order === 'other' ? 'halt' : order }).replace(/^ · /, ''));
      }
      say(cb, u.name + ' gives an order' + said + ' (The Voice: ' + (order === 'other' ? 'the Narrator decides what it does' : order) + '): ' + out.join('; ') + '.');
      if (order === 'other') note(h, 'order' + said + ': enemies who failed the save (Commanded) obey it for one action; the engine held them in place (halt)');
      return null;
    },
  }],
  brief: () => null,
});

// ---------- Between Heartbeats (Reaction Speed + Composure, Achieved) ----------
// Once per fight, when an enemy you can see starts an action, you take a 2 AP action first, from 2 AP that aren't
// yours: a single shot at that enemy, a move (2 AP of tiles; "move:<tile>", else the reachable tile farthest from
// it), drop prone, stim an adjacent ally (target), or reload. The enemy's turn can't pause for a live choice, so it is
// an armed preset (plan 6, PROVISIONAL): arm it on your turn; it stays armed until it fires. It doesn't use your
// reaction. An ambush: before your first turn, an unarmed holder fires a shot (else drops prone) at the first enemy
// action in sight.
const BH_MODES = ['shot', 'move', 'prone', 'stim', 'reload'];
function heartbeat(h: Holder, foe: Unit, rng: Rng): boolean {
  const cb = h.cb!, u = h.u!, arm = armedOf(h), ch = String(arm?.choice ?? 'shot'), [mode0, tile0] = ch.split(':'), mode = BH_MODES.includes(mode0) ? mode0 : 'shot';
  const keep = u.ap; u.ap = 2; let err: string | null = null;
  try {
    if (mode === 'shot') {
      const pv = previewAttack(cb, u, foe, isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot');
      if (!pv.ok) err = pv.why || 'no shot'; else resolveAttack(cb, rng, u, foe, isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot', h.c || null);
    } else if (mode === 'move') {
      const R = reach(cb, u, 2); let to = tile0 ? tileOf(cb, tile0) : null;
      if (!to || R[to] == null) { let best = -1; for (const k of Object.keys(R)) if (k !== u.pos && dist(k, foe.pos) > best) { best = dist(k, foe.pos); to = k; } }
      err = to && to !== u.pos ? moveUnit(cb, u, to, rng) : 'nowhere to go';
    } else if (mode === 'prone') err = u.prone ? 'already prone' : toggleProne(cb, u);
    else if (mode === 'stim') { const t = unitById(cb, arm?.targetId); const c = h.c; err = !t || !c ? 'no one to stim' : useStim(cb, u, t, c, isMedicChar(c)); }
    else err = reload(cb, u, { free: true });
  } finally { u.ap = keep; }
  if (err) { say(cb, '(Between Heartbeats: ' + err + ')'); return false; }
  say(cb, u.name + ' moves between heartbeats, before ' + foe.name + ' can act (Between Heartbeats).');
  return true;
}
register({
  id: 'between_heartbeats', claims: 'all',
  actions: [{
    id: 'ready', label: 'Between Heartbeats', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'none', arm: true,
    text: 'Once a fight: ready one action: a shot, a move (type "move:" and the tile), going Prone, a stim on an ally you pick, or a reload. You take it just before the first enemy you can see acts, with 2 free AP.',
    available: (h) => (uses(h).left('per_combat', 1, h.key + '#fired') > 0 ? true : 'Used this fight.'),
    run: () => null,
  }],
  on: {
    turn_start: (ctx, h) => { if (ctx.u === h.u) stateOf(h).hadTurn = true; },
    enemy_action_start: (ctx, h) => {
      const u = h.u, cb = h.cb, foe = ctx.u as Unit; if (!u || !cb || foe.side === u.side || !alive(u) || cb.window) return;
      if (uses(h).left('per_combat', 1, h.key + '#fired') <= 0) return;
      const armed = !!armedOf(h), ambush = !armed && !stateOf(h).hadTurn;
      if (!armed && !ambush) return;
      if (!unitSees(cb, u, foe.pos)) return;
      if (!(u.armed ||= {})[h.key] && ambush) u.armed[h.key] = { choice: previewAttack(cb, { ...u, ap: 2 } as Unit, foe, 'shot').ok ? 'shot' : 'prone', round: cb.round };
      if (heartbeat(h, foe, rngOf(h, ctx))) { uses(h).take('per_combat', 1, h.key + '#fired'); disarm(h); checkOver(cb); }
      else if (ambush) disarm(h);
    },
  },
  brief: () => null,
});

// ---------- Spoon-Feed (Brain Power + Rumination + Eloquence, Achieved) ----------
// 2 AP, at will: explain a visible enemy's weakness. Every ally who hears you (within 6 tiles, not you: PROVISIONAL)
// gets +2 to hit that enemy until the start of your next turn (so allies who already acted this round still benefit).
// It doesn't stack with itself on the same enemy. No Analyze needed. The story's simple explanations are ordinary checks.
register({
  id: 'spoon_feed', claims: 'all',
  actions: [{
    id: 'spoon_feed', label: 'Spoon-Feed', scope: ['combat'], ap: 2, target: 'enemy',
    text: 'Explain the weakness of an enemy you can see. Allies within 6 tiles of you get +2 to hit it until your next turn.',
    preview: (h, args) => {
      const cb = h.cb, t = unitById(cb, args.targetId); if (!cb || !t || !h.u) return {};
      if (!sideSees(cb, h.u.side, t)) return { ok: false, why: 'You can\'t see it.' };
      const n = cb.units.filter((a) => a !== h.u && a.side === h.u!.side && alive(a) && dist(a.pos, h.u!.pos) <= 6).length;
      return { lines: [n + ' allies hear you: +2 to hit ' + t.name + ' until your next turn.'] };
    },
    run: (h, args) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
      const allies = cb.units.filter((a) => a !== u && a.side === u.side && !a.dead && dist(a.pos, u.pos) <= 6).map((a) => a.id);
      unitState(h, t).feed = { by: u.id, allies };
      say(cb, u.name + ' spells out ' + t.name + '\'s weakness (Spoon-Feed): +2 to hit it for ' + (allies.length ? allies.map((id) => unitById(cb, id)!.name).join(', ') : 'nobody in earshot') + '.');
      return null;
    },
  }],
  on: {
    attack_preview: (ctx, h) => {
      const f = (ctx.tgt as Unit).ps?.[h.key]?.feed; if (!f || f.by !== h.u?.id || !f.allies.includes(ctx.att.id)) return;
      if (!(ctx.terms as any[]).some((x) => x.label === 'Spoon-Feed')) ctx.terms.push({ v: 2, label: 'Spoon-Feed' });
    },
    turn_start: (ctx, h) => { const cb = h.cb; if (ctx.u !== h.u || !cb) return; for (const t of cb.units) if (t.ps?.[h.key]?.feed?.by === h.u!.id) delete t.ps[h.key].feed; },
  },
  brief: () => null,
});

// ---------- Flat Line (Composure γ) ----------
// When the fight starts the engine picks the most dangerous enemy (highest tier, then HP: PROVISIONAL, since enemies
// may act before you can choose); you may change the pick (0 AP) until the end of your first turn. While it can see
// you and you're up, −1 to its attacks (II −2). No re-pick when it dies.
const TIER_RANK: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
register({
  id: 'flat_line', claims: 'all',
  actions: [{
    id: 'pick', label: 'Flat Line', scope: ['combat'], ap: 0, target: 'enemy',
    text: 'Pick the enemy your calm unnerves. You can choose until the end of your first turn.',
    available: (h) => (stateOf(h).locked ? false : true),
    run: (h, args) => { const t = unitById(h.cb, args.targetId)!; stateOf(h).pick = t.id; say(h.cb, h.u!.name + ' fixes ' + t.name + ' with a flat stare (Flat Line).'); return null; },
  }],
  on: {
    combat_start: (ctx, h) => {
      const cb = ctx.cb as Combat, u = h.u; if (!u || overworld(cb)) return;
      const f = cb.units.filter((x) => x.side !== u.side && !x.dead).sort((a, b) => (TIER_RANK[b.tier || 'minion'] ?? 0) - (TIER_RANK[a.tier || 'minion'] ?? 0) || b.hp - a.hp)[0];
      if (f) stateOf(h).pick = f.id;
    },
    turn_end: (ctx, h) => { if (ctx.u === h.u) stateOf(h).locked = true; },
    attack_preview: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.att.id !== stateOf(h).pick || ctx.att.side === u.side || !alive(u)) return;
      if (!unitSees(cb, ctx.att, u.pos)) return;
      ctx.terms.push({ v: tierII(h) ? -2 : -1, label: 'Flat Line (' + u.name + ')' });
    },
  },
  brief: () => null,
});

// ---------- Pattern Lock (Analysis β) ----------
// An attack type is the attacker's weapon and mode (shot, aimed, melee, burst, auto). Every attack you see (you're its
// target, or you can see the attacker) is remembered for the fight. I: +2 Dodge (−2 to hit you) against a type you've
// seen. II: +4, and allies get +2 against types you've seen while you're up (the holder's sight; once however many
// holders).
const patKey = (ctx: any) => (ctx.att?.weapon || '?') + ':' + (ctx.mode || 'shot');
register({
  id: 'pattern_lock', claims: 'all',
  on: {
    on_hit: (ctx, h) => patSee(ctx, h),
    on_miss: (ctx, h) => patSee(ctx, h),
    attack_preview: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.att.side === u.side) return;
      const seen: string[] = stateOf(h).seen || []; if (!seen.includes(patKey(ctx))) return;
      if (ctx.tgt === u) ctx.terms.push({ v: tierII(h) ? -4 : -2, label: 'Pattern Lock' });
      else if (tierII(h) && ctx.tgt.side === u.side && alive(u) && !(ctx.terms as any[]).some((x) => x.label === 'Pattern Lock (ally)')) ctx.terms.push({ v: -2, label: 'Pattern Lock (ally)' });
    },
  },
  brief: () => null,
});
function patSee(ctx: any, h: Holder) {
  const u = h.u, cb = h.cb; if (!u || !cb || ctx.att.side === u.side || u.dead) return;
  if (ctx.tgt !== u && !unitSees(cb, u, ctx.att.pos)) return;
  const st = stateOf(h), seen: string[] = (st.seen ||= []), k = patKey(ctx); if (!seen.includes(k)) seen.push(k);
}

// ---------- Lay Down Arms (Empathy α) ----------
// 2 AP, at will: plead with one humanoid enemy who can hear you (8 tiles; not a robot, machine, turret, drone or
// beast); II: up to three (targetIds). Each makes a Heart save (vs 12 + your Empathy strength: the perk's own skill, rules 1.13);
// on a failure it lowers its weapon: no attacks on its next turn (PROVISIONAL, plan 6: the engine's Commanded "hold
// fire", which ticks at the end of its own turn; the data's Disarmed would cost it 2 AP to recover, not in the text).
// Area map and story: the same plea to a hostile person; the engine rolls the save (d20 + its tier save vs 12 +
// Implication), and on a failure the Narrator plays them standing down for the moment (a pending ruling).
const humanoid = (t: Unit) => !['robot', 'machine', 'turret', 'drone', 'beast'].includes(t.kind || '') && !isMachine(t) && !(t.tags || []).includes('non_humanoid');
const NPC_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
function storyPlea(h: Holder, who: { name: string; tier?: string } | null, rng: Rng, text?: string): string | null {
  if (!who) return 'Name who you plead with.';
  const r = d20(rng), m = NPC_SAVE[who.tier || 'soldier'] ?? 1, tn = 12 + (h.c ? strengthOf(h.c, 'empathy') : 0), saved = r === 20 || (r !== 1 && r + m >= tn);
  const line = who.name + ' Heart save d20 ' + r + ' +' + m + ' = ' + (r + m) + ' vs ' + tn + ' · ' + (saved ? 'holds their weapon' : 'lowers their weapon');
  say(h.cb, (h.c?.name || '') + ' pleads with ' + who.name + (text ? ' "' + text.slice(0, 120) + '"' : '') + ' (Lay Down Arms): ' + line + '.');
  const g = gameOf(h); if (g && h.c) pendRuling(g, h.c, h.key, 'Lay Down Arms on ' + who.name + (text ? ' ("' + text.slice(0, 100) + '")' : '') + ': ' + line + (saved ? '.' : ': play them standing down for the moment.'));
  return null;
}
register({
  id: 'lay_down_arms', claims: 'all', narrator: [],
  actions: [
    { id: 'lay_down_arms', label: 'Lay Down Arms', scope: ['combat'], ap: 2, target: 'enemy', range: HEARING,
      text: 'Plead with a humanoid enemy who can hear you. It makes a Heart save. If it fails, it lowers its weapon and can\'t attack on its next turn. II: plead with up to three enemies at once.',
      preview: (h, args) => {
        const cb = h.cb; if (!cb) return {};
        const ids = [...new Set([args.targetId, ...(args.targetIds || [])].filter(Boolean) as string[])].slice(0, tierII(h) ? 3 : 1);
        for (const id of ids) { const t = unitById(cb, id); if (!t || t.side === h.u!.side || !alive(t)) return { ok: false, why: 'Pick enemies.' }; if (!humanoid(t)) return { ok: false, why: t.name + ' doesn\'t listen to pleas.' }; if (dist(t.pos, h.u!.pos) > HEARING) return { ok: false, why: t.name + ' can\'t hear you (' + HEARING + ' tiles).' }; }
        return { lines: [ids.length + ' Heart save' + (ids.length === 1 ? '' : 's') + ' vs ' + (12 + unitStrength(h.u!, 'empathy')) + '.'] };
      },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!;
        const ids = [...new Set([args.targetId, ...(args.targetIds || [])].filter(Boolean) as string[])].slice(0, tierII(h) ? 3 : 1);
        const out = ids.map((id) => unitById(cb, id)!).map((t) => applyCond(cb, rng, u, t, 'commanded', 1, 'heart', { arg: 'hold', via: 'empathy' }).replace(/^ · /, '').replace(/is Commanded/, 'lowers its weapon'));
        say(cb, u.name + ' pleads with them to lay down their arms' + (args.text ? ' "' + String(args.text).slice(0, 120) + '"' : '') + ': ' + out.join('; ') + '.');
        return null;
      } },
    { id: 'plea', label: 'Lay Down Arms', scope: ['world', 'story'], ap: (h) => (h.cb ? 2 : 0), target: 'none',
      text: 'Plead with a hostile person to stand down. They make a Heart save, and the Narrator plays out the result.',
      run: (h, args, rng) => {
        if (h.cb) { const t = unitById(h.cb, args.targetId); if (t && !humanoid(t)) return t.name + ' doesn\'t listen to pleas.'; return storyPlea(h, t ? { name: t.name, tier: t.tier } : null, rng, args.text); }
        const g = gameOf(h), want = charmedKey(args.npc || args.choice || ''), n = (g?.story?.npcs || []).find((x: any) => charmedKey(x.name) === want || charmedKey(x.id) === want);
        return storyPlea(h, n ? { name: n.name, tier: n.tier } : want ? { name: args.npc || args.choice || '', tier: 'soldier' } : null, rng, args.text);
      } },
  ],
  brief: () => null,
});

// ---------- Field Surgeon (Proficiency + Camaraderie, Achieved) ----------
// Field Repair reaches an adjacent ally: 2 AP, Proficiency 3+, one spare-parts charge: a living ally heals 10 ×
// Proficiency points × your Healing given (PROVISIONAL, plan 6: the Factory Made number); a Downed ally is brought back.
// Your heals on robotic allies (Factory Made, machines) work at full power (Factory Made's Plug halving is undone).
// Out of a fight (area map or story), 10 minutes and a charge patch a squadmate for 50% of their max HP (PROVISIONAL).
const surgeonHeal = (h: Holder) => Math.floor(10 * (h.c?.skills?.proficiency || h.u?.proficiency || 0) * (h.c ? healingMult(h.c) : 1));
function takePart(c: Character): boolean {
  const pack = packOf(c).map((x) => ({ ...x })), i = pack.findIndex((x) => (x.item || x.id) === 'spare_parts' && x.qty > 0); if (i < 0) return false;
  if (pack[i].qty > 1) pack[i].qty--; else pack.splice(i, 1); c.pack = pack; return true;
}
const partsOf = (c: Character | null | undefined) => (c ? packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0) : 0);
register({
  id: 'field_surgeon', claims: 'all', priority: 200,
  actions: [
    { id: 'repair_ally', label: 'Field Repair an ally', scope: ['combat'], ap: (h) => actionAp({ u: h.u }, 'field_repair', 2).ap, target: 'ally', range: 1,
      text: 'Patch up an ally next to you: they heal 10 HP per Improvisation point, raised by your healing bonuses. Uses one spare-parts charge. Needs Improvisation 3.',
      available: (h) => (!h.u ? false : (h.u.proficiency || 0) < 3 ? 'Needs Improvisation 3.' : !(h.u.parts || 0) ? 'No spare-parts charges.' : true),
      preview: (h, args) => { const t = unitById(h.cb, args.targetId); if (t === h.u) return { ok: false, why: 'Pick an ally. To fix your own weapon, use Field Repair.' }; return { lines: ['+' + surgeonHeal(h) + ' HP' + (t && isMachine(t) ? ' (full power on a machine)' : '') + '.'] }; },
      run: (h, args, rng) => {
        const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
        const p = pettyGate(h, t, rng); if (p) { u.ap += actionAp({ u }, 'field_repair', 2).ap; return null; }
        u.parts = (u.parts || 0) - 1; if (h.c) takePart(h.c);
        const r = healUnit(cb, t, surgeonHeal(h), u, 'field_repair');
        emitFx(cb, 'repair', { unit: u.id, target: t.id, at: t.pos, dur: 1400 });
        say(cb, u.name + ' patches up ' + t.name + ' (Field Surgeon): ' + (r.revived ? 'back up at ' + t.hp + ' HP' : '+' + r.restored + ' HP') + '.');
        return null;
      } },
    { id: 'patch', label: 'Patch up a squadmate', scope: ['world', 'story'], ap: 0, target: 'none',
      text: 'Out of a fight: spend 10 minutes and one spare-parts charge to heal a squadmate you name for half their max HP. Needs Improvisation 3.',
      run: (h, args) => {
        const t = pickChar(h, args.choice || args.text || args.npc); if (typeof t === 'string') return t;
        if ((h.c?.skills?.proficiency || 0) < 3) return 'Needs Improvisation 3.';
        if (!h.c || partsOf(h.c) <= 0) return 'No spare-parts charges.';
        const max = maxHp(t); if (t.hp >= max) return t.name + ' is already whole.';
        takePart(h.c); const was = t.hp; t.hp = Math.min(max, Math.max(t.hp, 0) + Math.floor(max * 0.5)); if (was <= 0) (t as any).downedFails = 0;
        const line = h.c.name + ' spends ten minutes patching up ' + t.name + ' (Field Surgeon): +' + (t.hp - Math.max(0, was)) + ' HP (' + t.hp + '/' + max + ').';
        say(h.cb, line); postStory(h, line, { kind: 'system' });
        return null;
      } },
  ],
  on: {
    heal_in: (ctx, h) => { if (ctx.by === h.u && ctx.t !== h.u && (has(ctx.t, 'trait:factory_made') || isMachine(ctx.t))) { if (has(ctx.t, 'trait:factory_made')) ctx.n = ctx.n * 2; } },
  },
  brief: () => null,
});

// ---------- Angel of the Trenches (Ultimate: Field Surgeon + Between Heartbeats) ----------
// Once per fight, when an ally within your Movement (a free tile next to them you can walk to for 1 AP: plan 6,
// PROVISIONAL) would drop to 0 HP, you move to them and stabilise them, out of turn, for 0 AP: they stay up at 1 HP and
// stop bleeding; no stim is used and the move draws no opportunity attacks. It runs before the ally's own Bite the
// Bullet. "Hold position" (armed) keeps you where you are.
register({
  id: 'angel_of_the_trenches', claims: 'all', priority: 10,
  actions: [{
    id: 'hold', label: 'Angel: hold position', scope: ['combat'], ap: 0, target: 'none', arm: true,
    text: 'While this is on, Angel of the Trenches won\'t move you from your position. Use it again to turn it off.', run: () => null,
  }],
  on: {
    damage_in: (ctx, h) => {
      const u = h.u, cb = h.cb, t = ctx.t as Unit; if (ctx.phase !== 'would_drop_to_0' || !u || !cb || overworld(cb)) return;
      if (t === u || t.side !== u.side || t.companion || !alive(u) || armedOf(h) || ctx.floor != null) return;
      if (uses(h).left('per_combat', 1) <= 0) return;
      let to: string | null = dist(u.pos, t.pos) <= 1 ? u.pos : null;
      if (!to) {
        const P = paths(cb, u.pos, u.id), mv = Math.floor(u.movement); let best = Infinity;
        const [tx, ty] = xy(t.pos);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const k = key(tx + dx, ty + dy); if (k === t.pos || !standable(cb.map, k) || cb.units.some((v) => !v.dead && v.pos === k)) continue;
          const d = P.dist[k]; if (d != null && d <= mv && d < best) { best = d; to = k; }
        }
      }
      if (!to) return;
      uses(h).take('per_combat');
      if (to !== u.pos) { const from = u.pos; u.pos = to; emitFx(cb, 'move', { unit: u.id, from, to, path: [from, to] }); }
      ctx.floor = 1; t.bleed = 0;
      emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos, heal: 0, revive: false });
      say(cb, u.name + ' is there before ' + t.name + ' hits the ground and holds them up at 1 HP (Angel of the Trenches).');
    },
  },
  brief: () => null,
});

// ======================================================================================================== TRAITS

// ---------- Sworn Sibling (trait, Bond) ----------
// Bond (out of a fight, with the other player's consent: see the bonds note). Bound (up): each round, while the two of
// you are adjacent at the start of a turn, one free AP is shared: the first of you to start a turn adjacent takes it
// (PROVISIONAL: one pool per pair, plan 6; perk AP, the +3 cap). You always see them, through fog and walls (the
// 'sees' hook). Bound (down): while your sibling is Downed and you
// aren't next to them, every attack except one at an enemy within 2 tiles of them or one that has hurt them is at −2,
// and a move that ends farther from them costs double AP. Story: while your sibling's character is down, checks are at
// −2 unless the Narrator tags them 'for_bond'.
const sibOf = (h: Holder): Unit | null => bondUnits(h, true)[0] || null;
const sibChar = (h: Holder): Character | null => { const id = bondsOf(h, true)[0]; return id ? gameOf(h)?.characters?.[id] || null : null; };
register({
  id: 'sworn_sibling', claims: 'all',
  actions: [bondAction(() => 1, true, 'Bond (Sworn Sibling)')],
  on: {
    turn_start: (ctx, h) => {
      const u = h.u, cb = h.cb, s = sibOf(h); if (!u || !cb || !s || overworld(cb)) return;
      const me = ctx.u as Unit; if (me !== u && me !== s) return;
      const other = me === u ? s : u; if (!alive(me) || !alive(other) || dist(me.pos, other.pos) > 1) return;
      // One pool per pair, even when both siblings hold the trait: the stamp sits on both units under the item key.
      const a = unitState(h, u), b = unitState(h, s); if (a.shared === cb.round || b.shared === cb.round) return; a.shared = b.shared = cb.round;
      grantPerkAp(cb, me, 1, 'Sworn Sibling');
    },
    attack_preview: (ctx, h) => {
      const u = h.u, cb = h.cb, s = sibOf(h); if (!u || !cb || !s || ctx.att !== u || !s.downed || s.dead || dist(u.pos, s.pos) <= 1) return;
      const t = ctx.tgt as Unit; if (t.side !== u.side && (dist(t.pos, s.pos) <= 2 || (s.damagedBy || []).includes(t.id))) return;
      ctx.terms.push({ v: -2, label: 'Sworn Sibling: ' + s.name + ' is down' });
    },
    move_cost: (ctx, h) => {
      const u = h.u, s = sibOf(h); if (!u || !s || ctx.u !== u || !s.downed || s.dead || dist(u.pos, s.pos) <= 1) return;
      if (dist(ctx.to, s.pos) > dist(ctx.from, s.pos) && ctx.ap > 0) { if (!ctx.preview) stateOf(h).extra = ctx.ap; ctx.ap = ctx.ap * 2; }
    },
    // The doubled AP buys no extra tiles: take them back out of the move bank.
    moved: (ctx, h) => { const st = stateOf(h); if (ctx.u !== h.u || !st.extra || !h.u) return; h.u.bank = Math.max(0, (h.u.bank || 0) - st.extra * h.u.movement); delete st.extra; },
    // You always see your sibling: through fog and walls (the sight hook), so a heal or a shot that needs your own
    // sight of them finds them (a shot still needs a line).
    sees: (ctx, h) => { const s = sibOf(h); if (s && ctx.t === s && (!ctx.by || ctx.by === h.u) && h.u && alive(h.u)) ctx.seen = true; },
    check_mod: (ctx, h) => {
      if (ctx.c !== h.c) return; const s = sibChar(h); if (!s || s.dead || s.hp > 0) return;
      if ((ctx.tags || []).includes('for_bond')) return;
      ctx.add.push({ add: -2, label: 'Sworn Sibling: ' + s.name + ' is down' });
    },
  },
  brief: (h) => { const n = bondNames(h, true); return n ? 'always knows where ' + n + ' is; tag checks to reach/heal/defend them for_bond' : 'not yet bonded'; },
});

// ---------- Rival (trait, Bond) ----------
// Bond (consent, as above). The rivalry works both ways even if your rival doesn't hold the trait (data: mutual; their
// player consents to the bond). Show-Off: after your rival succeeds with a skill (a story check, or a hit with a weapon,
// which counts for the weapon's skill), your next roll with that skill gets +2 (one use, no stacking). Neck and Neck:
// when your rival reaches a new level you gain 50 XP (bond); while they're a higher level, +10% XP from every source but
// Essence. Petty: helping your rival through this lane's help actions (Hand-Off, Command, Field Repair) or a stim takes
// a Camaraderie check (TN 12, PROVISIONAL); on a failure you can't help them this turn. Story help is tagged 'help_rival'
// by the Narrator: the check is its to call (brief).
const RIVAL = 'trait:rival';
function rivalOf(h: Holder): Character | null { const id = bondsOf(h, true)[0]; return id ? gameOf(h)?.characters?.[id] || null : null; }
/** The rivalry's other end, for a character that doesn't hold the trait (mutual, consented). */
const rivalHolds = (c: Character | null | undefined) => !!c && has(c, RIVAL);
function showOff(c: Character, skill: string) { const st = charState(c), so = (st.showOff ||= {}); so[skill] = 2; }
function xpBond(h: Holder, c: Character, n: number) {
  const rankBefore = c.classId ? classRank(c) : 0;
  c.xp += n; (c.xpBySource ||= {} as any).bond = ((c.xpBySource as any).bond || 0) + n; applyLevels(c);
  postStory(h, c.name + ' +' + n + ' XP (bond: Neck and Neck).', { kind: 'system' });
  const g = gameOf(h); if (g) rankReached(g, c, rankBefore); // rules 1.11: a rank can come with the level
}
register({
  id: 'rival', claims: 'all',
  actions: [bondAction(() => 1, true, 'Bond (Rival)')],
  on: {
    check_result: (ctx, h) => {
      const r = rivalOf(h); if (!r || !ctx.roll?.ok) return;
      if (ctx.c === r) for (const s of ctx.ck.skills || []) showOff(h.c!, s);
      else if (ctx.c === h.c && !rivalHolds(r)) for (const s of ctx.ck.skills || []) showOff(r, s);
    },
    check_mod: (ctx, h) => {
      const r = rivalOf(h); const who: Character | null = ctx.c === h.c ? h.c! : r && ctx.c === r && !rivalHolds(r) ? r : null; if (!who) return;
      const so = cs(who).showOff || {}, s = (ctx.ck.skills || []).find((x: string) => so[x]); if (!s) return;
      ctx.add.push({ add: 2, label: 'Show-Off (' + (SKILL as any)[s]?.name + ')' }); delete so[s];
    },
    on_hit: (ctx, h) => {
      const r = rivalOf(h), att = ctx.att as Unit, sk = WEAPON[att.weapon]?.skill; if (!r || !sk) return;
      if (att.charId === r.id) showOff(h.c!, sk); else if (att === h.u && !rivalHolds(r)) showOff(r, sk);
    },
    attack_preview: (ctx, h) => {
      const att = ctx.att as Unit, r = rivalOf(h), sk = WEAPON[att.weapon]?.skill; if (!sk) return;
      const who = att === h.u ? h.c : r && att.charId === r.id && !rivalHolds(r) ? r : null; if (!who || !cs(who).showOff?.[sk]) return;
      ctx.terms.push({ v: 2, label: 'Show-Off' });
    },
    attack_roll: (ctx, h) => {
      const att = ctx.att as Unit, r = rivalOf(h), sk = WEAPON[att.weapon]?.skill; if (!sk) return;
      const who = att === h.u ? h.c : r && att.charId === r.id && !rivalHolds(r) ? r : null; if (who && cs(who).showOff?.[sk]) delete cs(who).showOff[sk];
    },
    xp_grant: (ctx, h) => {
      const r = rivalOf(h); if (!r || !h.c) return;
      const me = h.c, other = ctx.c === me ? r : ctx.c === r ? me : null; if (!other) return;
      // +10% while the other is a higher level (both ways when the rival doesn't hold the trait).
      if (ctx.source !== 'essence' && ctx.source !== 'bond' && (ctx.c === me || !rivalHolds(r)) && other.level > ctx.c.level) ctx.amount = Math.floor(ctx.amount * 1.1);
      // Neck and Neck: a new level for one gives the other 50 XP.
      const gain = levelForXp((ctx.c.xp || 0) + ctx.amount) - ctx.c.level;
      if (gain > 0 && ctx.source !== 'bond' && (ctx.c === r || !rivalHolds(r))) xpBond(h, other, 50 * gain);
    },
    // Petty on any stim, a Downed rival's revive included (the 'stim_start' hook, before anything is spent).
    stim_start: (ctx, h) => {
      const u = h.u, r = rivalOf(h); if (!u || ctx.u !== u || !r || ctx.t.charId !== r.id || ctx.cancel) return;
      const p = pettyGate(h, ctx.t, rngOf(h)); if (p) { ctx.cancel = true; ctx.why = 'Petty (Rival)'; }
    },
  },
  brief: (h) => { const r = rivalOf(h); return r ? 'rival: ' + r.name + '; helping them in the story (tag help_rival) takes Camaraderie' : 'not yet bonded'; },
});

// ---------- Born Officer (trait) ----------
// Command: once per round, 1 AP: an ally in your sight (alive, not Stunned, one Command per ally per round) takes a free
// 1-AP move (choice 'move', tile) or a free basic attack (choice 'attack', the enemy in targetIds or by tile): a Shoot or
// a Strike, no aimed, burst or weapon skill (PROVISIONAL, plan 6). An ally who holds Born Officer must pass Composure (TN
// 12, PROVISIONAL) to take it; refused, the AP stays spent. Works the same on the area map. Leadership counts one step
// higher (the Narrator's: brief). The Squad Leans on You: at the start of each ally's turn, an ally within 5 tiles of
// you loses 1 AP if you're Downed or dead, or out of their sight (once, however many officers). Taking an order from
// anyone else, in the story, takes a Composure check (the Narrator calls it; brief).
function foeArg(cb: Combat, args: any, u: Unit): Unit | null {
  const id = (args.targetIds || [])[0]; let f = unitById(cb, id);
  if (!f && args.tile) { const k = tileOf(cb, args.tile); f = cb.units.find((x) => x.pos === k && !x.dead) || null; }
  return f && f.side !== u.side ? f : null;
}
register({
  id: 'born_officer', claims: 'all', narrator: [1, 2, 4],
  actions: [{
    id: 'command', label: 'Command', scope: ['combat', 'world'], ap: 1, uses: { per: 'per_round', n: 1 }, target: 'ally',
    text: 'Once a round: an ally you can see takes a free move worth 1 AP (pick the tile), or a free Shoot or Strike (pick the enemy).',
    preview: (h, args) => {
      const cb = h.cb, u = h.u, t = unitById(cb, args.targetId); if (!cb || !u || !t) return {};
      if (t === u) return { ok: false, why: 'Command someone else.' };
      if (!unitSees(cb, u, t.pos)) return { ok: false, why: 'You can\'t see ' + t.name + '.' };
      if (!alive(t) || condOn(t, 'stunned')) return { ok: false, why: t.name + ' can\'t act.' };
      if (t.ps?.[h.key]?.round === cb.round && !overworld(cb)) return { ok: false, why: t.name + ' already took a Command this round.' };
      const kind = String(args.choice || '').toLowerCase();
      if (kind === 'move') { const to = tileOf(cb, args.tile); if (!to) return { ok: false, why: 'Pick a tile.' }; const R = reach(cb, t, 1); if (R[to] == null) return { ok: false, why: 'More than 1 AP of movement away for ' + t.name + '.' }; return { lines: [t.name + ' moves to the tile, free.'] }; }
      if (kind === 'attack') { const f = foeArg(cb, args, u); if (!f) return { ok: false, why: 'Pick the enemy.' }; const pv = previewAttack(cb, t, f, isMelee(WEAPON[t.weapon]) ? 'melee' : 'shot', { free: true }); return pv.ok ? { lines: [t.name + ' attacks ' + f.name + ' for free (' + pv.pct + '%).'] } : { ok: false, why: pv.why }; }
      return { ok: false, why: 'Choose move or attack.' };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!, kind = String(args.choice || '').toLowerCase();
      unitState(h, t).round = cb.round;
      const p = pettyGate(h, t, rng); if (p) { say(cb, p); return null; }
      const tc = charOf(h, t);
      if (tc && has(tc, 'trait:born_officer')) {
        const r = d20(rng), m = mod(tc.skills.composure || 0), ok = r === 20 || (r !== 1 && r + m >= 12);
        say(cb, t.name + ' takes orders from no one but themselves? Composure d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (r + m) + ' vs 12 · ' + (ok ? 'obeys' : 'refuses (Born Officer)'));
        if (!ok) return null;
      }
      if (kind === 'move') {
        const to = tileOf(cb, args.tile)!, keep = t.ap; t.ap = 99;
        let e: string | null; try { e = moveUnit(cb, t, to, rng); } finally { t.ap = keep; }
        if (e) return e;
        const g = gameOf(h); if (overworld(cb) && g && t.charId) { const pos = (g.story.positions ||= {}); pos[t.charId] = t.pos; }
      } else {
        const f = foeArg(cb, args, u); if (!f) return 'Pick the enemy.';
        resolveAttack(cb, rng, t, f, isMelee(WEAPON[t.weapon]) ? 'melee' : 'shot', tc, { noAp: true }); checkOver(cb);
        if (overworld(cb)) note(h, 'commanded ' + t.name + ' to attack ' + f.name + ' on the area map');
      }
      say(cb, u.name + ' commands ' + t.name + ' (Born Officer).');
      return null;
    },
  }],
  on: {
    turn_start_pre: (ctx, h) => {
      const o = h.u, cb = h.cb, a = ctx.u as Unit; if (!o || !cb || a === o || a.side !== o.side || a.companion || !a.charId) return;
      if (dist(a.pos, o.pos) > 5) return;
      if (!(o.downed || o.dead || !unitSees(cb, a, o.pos))) return;
      // Once however many officers: the record sits on the ally under the trait's key, shared by every officer.
      const as = unitState(h, a), stamp = cb.round + '.' + cb.turn; if (as.leaned === stamp) return; as.leaned = stamp;
      pushAp(ctx, -1, 'the squad leans on ' + o.name);
    },
  },
  brief: () => 'Leadership one step higher; orders from anyone else take Composure (you set the TN)',
});

// ---------- Field Medic (trait) ----------
// Triage: healing an ally costs 1 AP less, never below 1 (plan 6, PROVISIONAL: so a stim on a conscious ally stays 1
// AP; stabilising a Downed ally goes 2 → 1; healing Outbursts −1, floor 1; the Medic's class Triage move reads
// 'ap_cost:triage' / 'heal'). Thrown Stim: once per fight, stabilise a Downed ally up to 3 tiles away in line of sight,
// for the cost of stabilising them (after Triage), using a stim (plan 6: the data's 0 AP is not in the text). First,
// Do No Harm: at the start of your turn, if another squadmate within 5 tiles is below a quarter of their HP (Downed
// counts), you can't attack this turn until you've healed someone; only while you have a way to heal (stims, Medic,
// a heal design: plan 6, so the lock can never softlock you). Companions don't count. The area map runs the same stims
// and AP. The Narrator stages "two wounded, one stim" (brief).
const canHeal = (h: Holder) => (h.c?.stims || 0) > 0 || isMedicChar(h.c) || !!h.u?.mg?.designs?.some((d: any) => d.option === 'heal' || d.school === 'heal');
const healDesign = (d: any) => d?.option === 'heal' || d?.school === 'heal' || d?.option === 'mend';
register({
  id: 'field_medic', claims: 'all', narrator: [2],
  stat: (h, stat, ctx) => {
    if (!['ap_cost:stabilise', 'ap_cost:stim', 'ap_cost:heal', 'ap_cost:triage'].includes(stat)) return 0;
    const base = ctx?.base ?? 1; return base > 1 ? -1 : 0;
  },
  actions: [{
    id: 'thrown_stim', label: 'Thrown Stim', scope: ['combat', 'world'], ap: (h) => actionAp({ u: h.u }, 'stabilise', isMedicChar(h.c) ? 1 : 2).ap, uses: { per: 'per_combat', n: 1 }, target: 'ally', range: 3,
    text: 'Once a fight: throw a stim to stabilise a Downed ally up to 3 tiles away. You need line of sight. Uses one stim.',
    available: (h) => (!h.u ? false : (h.c?.stims || 0) <= 0 ? 'No stims left.' : true),
    preview: (h, args) => {
      const cb = h.cb, t = unitById(cb, args.targetId); if (!cb || !t || !h.u) return {};
      if (!t.downed) return { ok: false, why: t.name + ' isn\'t Downed.' };
      if (!lineOfSight(cb, h.u.pos, t.pos)) return { ok: false, why: 'No line of sight.' };
      return { lines: ['Stabilise ' + t.name + ' at 1 HP (' + (h.c?.stims || 0) + ' stims left).'] };
    },
    run: (h, args, rng) => {
      const cb = h.cb!, u = h.u!, t = unitById(cb, args.targetId)!;
      const p = pettyGate(h, t, rng); if (p) { u.ap += actionAp({ u }, 'stabilise', isMedicChar(h.c) ? 1 : 2).ap; return null; }
      if (h.c) h.c.stims--; t.bleed = 0;
      healUnit(cb, t, 1, u, 'stim');
      emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos, heal: 1, revive: true, thrown: true });
      say(cb, u.name + ' lobs a stim to ' + t.name + ': stabilised at 1 HP (Thrown Stim).');
      if (overworld(cb)) { const tc = charOf(h, t); if (tc && tc.hp <= 0) { tc.hp = 1; (tc as any).downedFails = 0; } }
      return null;
    },
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (ctx.u !== h.u) return;
      if (healDesign(ctx.design) && ctx.ap > 1) ctx.ap = Math.max(1, ctx.ap - 1);
      // First, Do No Harm reaches damaging Outbursts too (outburst_cost's fail: hooks gap E-H5).
      const d = ctx.design || {}; if (stateOf(h).mustHeal && [d.school, d.school2].includes('damage') && !(d.modules || []).includes('inverse')) ctx.fail ||= 'First, Do No Harm: heal someone first.';
    },
    // …and damaging Sigils: a pattern with an element word (evoke_cost's fail).
    evoke_cost: (ctx, h) => { if (ctx.u === h.u && stateOf(h).mustHeal && (ctx.pattern?.words || []).some((w: string) => ['fire', 'freeze', 'shock', 'stone', 'gale', 'spark'].includes(w))) ctx.fail ||= 'First, Do No Harm: heal someone first.'; },
    turn_start: (ctx, h) => {
      const u = h.u, cb = h.cb; if (ctx.u !== u || !u || !cb) return;
      const hurt = cb.units.some((a) => a !== u && a.side === u.side && !a.companion && !a.dead && dist(a.pos, u.pos) <= 5 && (a.downed || a.hp * 4 < a.maxHp));
      stateOf(h).mustHeal = hurt && canHeal(h);
      if (stateOf(h).mustHeal) say(cb, u.name + ' sees a squadmate bleeding out (First, Do No Harm): no attacks until you heal someone.');
    },
    heal_given: (ctx, h) => { if (ctx.by === h.u && ctx.t !== h.u && ctx.n > 0 || (ctx.by === h.u && ctx.revived)) delete stateOf(h).mustHeal; },
    turn_end: (ctx, h) => { if (ctx.u === h.u) delete stateOf(h).mustHeal; },
    attack_preview: (ctx, h) => { if (ctx.att === h.u && stateOf(h).mustHeal && !ctx.fail) ctx.fail = 'First, Do No Harm: heal someone first.'; },
    // Shoving and Overwatch are attacks too while the lock holds.
    action_refuse: (ctx, h) => { if (ctx.u === h.u && stateOf(h).mustHeal && !ctx.fail && ['combat/shove', 'combat/overwatch'].includes(ctx.a?.type)) ctx.fail = 'First, Do No Harm: heal someone first.'; },
    // The area map: the lock is set when an overworld round opens (a squadmate within 5 tiles Downed or under a quarter
    // HP, and a way to heal), and lifts when you heal someone (the overworld's heal_given) or the round ends.
    world_round_start: (ctx, h) => {
      const g = ctx.g, c = h.c; if (!g || !c || c.dead) return; const pos = positionsOf(g), me = pos[c.id]; const st = stateOf({ ...h, g });
      delete st.mustHeal; if (!me) return;
      const hurt = Object.values(g.characters as Record<string, Character>).some((x) => x.id !== c.id && !x.dead && pos[x.id] && dist(pos[x.id], me) <= 5 && (x.hp <= 0 || x.hp * 4 < maxHp(x)));
      if (hurt && ((c.stims || 0) > 0 || isMedicChar(c))) { st.mustHeal = true; postStory({ ...h, g }, 'a squadmate is bleeding out (First, Do No Harm): no attacks until you heal someone.', { kind: 'system' }); }
    },
  },
  brief: () => 'stage triage dilemmas: two wounded, one stim',
});

// Bonds ride into the fight on the unit (so a preview with no game bound still knows them).
for (const [id, consent] of [['soulmate', false], ['sworn_sibling', true], ['rival', true]] as const) {
  register({ id, on: { combat_start: (ctx, h) => { if (h.u && h.c) stateOf(h).bondIds = bondsOf(h, consent); } } });
}

// keep tree-shaking honest for helpers only some builds use
void tierOf; void sideSees; void SKILL;
