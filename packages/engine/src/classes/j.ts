// Lane J: the advanced classes Gunslinger, Hellraiser Heavy, CCEC Ballistician, Banner Dancer, RTC Contractor, Blade
// Scribe, Siege Engineer, Spellslinger, Storm Hand and Adamantile Knight: every move, in combat (and on the area map
// where it fits), with a story part where the audit gives one. Adamantile Knight also gets the Defender pieces its
// moves stand on (Brace with Guard, Interpose, Reactive Plate), so a Knight who isn't a rank III Defender isn't dead
// weight. What the engine can't judge goes to the Narrator (note / pendRuling / brief).
//
// Every recommended fix for a flagged design (the audit's classes.json "problems") is marked PROVISIONAL here and listed
// with its number in the spec (section 14, tags J…) and docs/design/perk-runtime.md.
import { register, stateOf, uses, note, has, modOn, emit, applyDamage, healUnit, grantShield, pendRuling, postStory, type Holder, type ActionDef, type ToggleDef } from '../effects';
import { itemAmount, amountMult } from '../effects/amounts';
import { term } from '../effects/output';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import {
  dist, alive, refOf, keyOf as refKey, xy, key, objectsOf, objectsAt, standable, lineOfSight, previewAttack, resolveAttack, isMelee, emitFx, checkOver,
  moveBlockers, moveUnit, moveBlock, paths, unitSees, sideSees, effectiveRange, damageObject, hurtUnit, coverTileFor, analyze, rollInjury, type AttackMode, displace
} from '../combat';
import { WEAPON, SIGIL } from '../data';
import { dropToPile } from '../combat';
import { magItem } from '../containers';
import { mod, healingMult, magazineSize } from '../character';
import { applyCond, condOn, endCond, harm, shiftMana, drawGlyph, grammarError, magicOf, flux, withElement, CORE_CHARGE, applyToneRiders } from '../magic';
import { castAt, glyphCost, sigilReady } from '../sigil';
import { die } from '../rng';
import { rollVs } from '../rolls';
import { resOf, resGain, resSpend, canReact, useReaction , dropHeldShot } from '../tactics';
import { makeObject } from '../objects';
import { overworld, say, unitById, tileOf, rngOf, foesOf } from '../kit';
import { pay, refund, grantAp, freely, spend } from '../effects/cost';
import { AP_MAX } from '../effects/ap';
import { setBraced } from '../unitstate';

// ---------- small helpers ----------
type Rng = { state: number };
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const charState = (c: Character | null | undefined): Record<string, any> => (c ? ((c as any).state ||= {}) : {});
/** Item state on the character without creating it (previews and stat queries must not change state). */
const cs = (c: Character | null | undefined): Record<string, any> => (c as any)?.state || {};
const W = (u: Unit) => WEAPON[u.weapon];
const isHandgun = (u: Unit) => ['pistol', 'revolver'].includes(W(u)?.category || '');
const isRanged = (u: Unit) => { const w = W(u); return !!w && !isMelee(w) && w.category !== 'thrown'; };
const isBoss = (t: Unit) => t.tier === 'boss' || t.kind === 'celestial';
const ownTurn = (cb: Combat, u: Unit) => cb.order[cb.turn] === u.id && !cb.window;
const adj = (a: string, b: string) => dist(a, b) <= 1;
/** Run f with the weapon's state put back afterwards (a shot paid for elsewhere: no ammo, Heat, recoil count, wear). */
function quiet<T>(u: Unit, f: () => T): T {
  const s = { ammo: u.ammo, heat: u.heat, jammed: u.jammed, shots: u.shotsThisTurn, dur: u.dur, fs: u.firstShotDone, ft: u.firstShotTurn, at: u.attackedTurn, mom: u.res?.momentum };
  if (W(u)?.magazine != null) u.ammo = Math.max(1, u.ammo); u.jammed = false;
  try { return f(); } finally {
    u.ammo = s.ammo; u.heat = s.heat; u.jammed = s.jammed; u.shotsThisTurn = s.shots; u.dur = s.dur; u.firstShotDone = s.fs; u.firstShotTurn = s.ft; u.attackedTurn = s.at;
    if (s.mom != null && u.res) u.res.momentum = s.mom;
  }
}
/** Do something with the AP check out of the way (the AP was paid by the action): AP is put back after. */
const freeAp = freely;

// Labelled to-hit terms for attacks a move makes (the transparent breakdown names them), keyed by attacker id.
const TERMS: { att: string; v: number; label: string }[] = [];
function withTerm<T>(u: Unit, v: number, label: string, f: () => T): T { const t = { att: u.id, v, label }; TERMS.push(t); try { return f(); } finally { TERMS.splice(TERMS.indexOf(t), 1); } }
const termsHook = (ctx: any, h: Holder) => { if (ctx.att !== h.u) return; for (const t of TERMS) if (t.att === h.u!.id) ctx.terms.push({ v: t.v, label: t.label }); };
// Damage multipliers a move adds to its own attack (One Shot), keyed by attacker id.
const MULTS: { att: string; f: (ctx: any) => { v: number; label: string } | null }[] = [];
function withMult<T>(u: Unit, f: (ctx: any) => { v: number; label: string } | null, g: () => T): T { const m = { att: u.id, f }; MULTS.push(m); try { return g(); } finally { MULTS.splice(MULTS.indexOf(m), 1); } }
const multHook = (ctx: any, h: Holder) => { if (ctx.att !== h.u) return; for (const m of MULTS) if (m.att === h.u!.id) { const r = m.f(ctx); if (r) ctx.mults.push(r); } };

// =============================================================================================== GUNSLINGER

// ---------- The Draw ----------
// Before the first turn of a fight, a Gunslinger with a loaded pistol or revolver fires one single shot for 0 AP (Heat,
// ammo and jams apply) at the nearest enemy the squad can see (lowest HP on a tie). PROVISIONAL (audit 1, 2): once per
// fight, not per scene; a surprised Gunslinger (caught unaware or in the open: no turn in round 1) can't Draw; an
// ambushing one can. The target is picked by the engine (the fight opens before any player can choose).
register({
  id: 'gunslinger.the_draw', claims: 'all', noDefaultActions: true,
  on: {
    combat_start: (ctx, h) => {
      const cb = ctx.cb as Combat, u = h.u; if (!u || !inFight(h) || !alive(u)) return;
      if (!isHandgun(u) || u.jammed || (W(u).magazine != null && u.ammo <= 0)) return;
      if ((u.waitRound || 0) > 1) { say(cb, u.name + ' is caught flat-footed: no Draw.'); return; }
      if (!uses(h).take('per_combat', 1)) return;
      const t = foesOf(cb, u).filter((v) => previewAttack(cb, u, v, 'shot', { free: true }).ok).sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos) || a.hp - b.hp)[0];
      if (!t) { uses(h).refund('per_combat'); return; }
      say(cb, u.name + ' draws first (The Draw).');
      resolveAttack(cb, rngOf(h, ctx), u, t, 'shot', null, { free: true });
      checkOver(cb);
    },
  },
  brief: () => null,
});

// ---------- Six for Six ----------
// 4 AP, once per scene: up to six single shots from a pistol or revolver, each at an enemy within 4 tiles (targetIds,
// repeats allowed; just targetId: all six at it). Recoil and Heat apply to each; a jam, an empty gun or a target that
// can't be shot any more ends the volley.
register({
  id: 'gunslinger.six_for_six', claims: 'all',
  actions: [{
    id: 'fan_fire', label: 'Six for Six', scope: ['combat'], ap: 'data', uses: { per: 'per_scene', n: 1 }, target: 'enemy', range: 4,
    text: 'Fire up to six single shots from a pistol or revolver at enemies within 4 tiles. Recoil and Heat apply to each shot.',
    available: (h) => (!h.u ? false : !isHandgun(h.u) ? 'Needs a pistol or revolver.' : h.u.jammed ? 'Your gun is jammed.' : W(h.u).magazine != null && h.u.ammo <= 0 ? 'Your gun is empty. Reload first.' : true),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, list = (a.targetIds?.length ? a.targetIds : Array(6).fill(a.targetId)).slice(0, 6);
      const bad = list.map((id) => unitById(cb, id)).find((t) => !t || t.side === u.side || dist(t.pos, u.pos) > 4);
      return bad !== undefined ? { ok: false, why: 'Every shot goes at an enemy within 4 tiles.' } : { lines: [list.length + ' shots; each later shot takes recoil and Heat.'] };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, list = (a.targetIds?.length ? a.targetIds : Array(6).fill(a.targetId)).slice(0, 6);
      say(cb, u.name + ' fans the hammer: Six for Six.');
      emitFx(cb, 'volley', { unit: u.id, target: list[0], from: u.pos, weapon: u.weapon, cat: W(u).category, mode: 'skill', name: 'Six for Six', shots: list.length });
      for (const id of list) {
        const t = unitById(cb, id); if (!t || !alive(t) && !t.downed) continue;
        if (u.jammed || (W(u).magazine != null && u.ammo <= 0)) { say(cb, '(Six for Six stops: ' + (u.jammed ? 'jammed' : 'empty') + ')'); break; }
        if (resolveAttack(cb, rng, u, t, 'shot', null, { free: true }).refused) break;
      }
      checkOver(cb); return null;
    },
  }],
  brief: () => null,
});

// ---------- Called Shot ----------
// 3 AP, at will: a single shot at −2 with any gun or bow (PROVISIONAL, audit 4-5: not melee or thrown; not an Aimed
// shot). choice: head, arm (left/right: 'arm' hits the target's main hand, or 'arm:left') or leg. On a hit the named
// injury applies without a critical, but the target's Injury resistance still rolls (PROVISIONAL, audit 2). Story: a
// disabling shot in a standoff is the Narrator's to call; the engine rolls it.
register({
  id: 'gunslinger.called_shot', claims: 'all',
  actions: [
    { id: 'called_shot', label: 'Called Shot', pick: ['head', 'arm', 'leg'], pickLabel: 'Head, arm or leg', scope: ['combat', 'world'], ap: 'data', target: 'enemy',
      text: 'Name the head, an arm or a leg and shoot at −2 to hit. A head hit leaves the target Dazed, an arm hit gives −2 to attacks with that arm, and a leg hit halves its Movement. The target still rolls to resist the injury.',
      available: (h) => (!h.u ? false : !isRanged(h.u) ? 'Needs a gun or a bow.' : true),
      preview: (h, a) => {
        const loc = String(a.choice || '').split(':')[0]; if (!['head', 'arm', 'leg'].includes(loc)) return { ok: false, why: 'Name head, arm or leg.' };
        const t = unitById(h.cb!, a.targetId); if (!t) return {};
        const pv = withTerm(h.u!, -2, 'Called Shot', () => previewAttack(h.cb!, h.u!, t, 'shot', { free: true }));
        return pv.ok ? { lines: ['Called shot at the ' + loc + ': ' + pv.pct + '% to hit.'] } : { ok: false, why: pv.why };
      },
      run: (h, a, rng) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId)!, [loc, side] = String(a.choice).split(':');
        const r = withTerm(u, -2, 'Called Shot', () => resolveAttack(cb, rng, u, t, 'shot', null, { free: true }));
        if (r.refused) return r.refused;
        if (r.hit && !t.dead && !t.surrendered) say(cb, t.name + rollInjury(rng, t, cb, u, { loc: loc === 'head' || loc === 'arm' ? loc : 'leg', side }) + '.'); // the one injury table (combat.ts), with the place named
        checkOver(cb); return null;
      } },
    { id: 'called_shot_story', label: 'Called Shot (a standoff)', scope: ['story'], ap: 0, target: 'text', uses: { per: 'per_scene', n: 1 },
      text: 'Say where you put the round: head, arm or leg. The Narrator calls for the check and you roll it.',
      run: (h, a) => { const eid = postStory(h, a.text || 'calls the shot.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Called Shot in a standoff: "' + (a.text || '') + '". Call a Dexterity check (the gun\'s skill) at −2; on a success the named location is disabled (head dazed, arm −2, leg slowed).', eid || undefined); return null; } },
  ],
  on: { attack_preview: termsHook },
  brief: () => 'out of a fight, a disabling shot in a standoff: you call the check',
});

// =========================================================================================== HELLRAISER HEAVY

// ---------- Emplace ----------
// 2 AP, at will: become Emplaced (the condition; also counts as braced, so the LMG's "−2 unless emplaced" goes and its
// own braced bonus applies) with a heavy weapon or a rifle (PROVISIONAL, audit 4). The class adds: no recoil at all,
// and +5 armour until you move (a shove or knockback ends it too). OPEN (audit 1): the condition's own +2 to hit and the
// class text disagree; the fix is a data/core change (recorded in the notes), so the +2 stands for now.
const EMPLACE_CATS = ['heavy', 'rifle'];
function unEmplace(h: Holder, why: string) {
  const u = h.u!, st = stateOf(h);
  if (st.armour) { u.armour = Math.max(0, u.armour - st.armour); st.armour = 0; say(h.cb, u.name + ' is no longer Emplaced (' + why + '): −5 armour.'); }
}
register({
  id: 'hellraiser_heavy.emplace', claims: 'all',
  actions: [{
    id: 'emplace', label: 'Emplace', scope: ['combat'], ap: 'data', target: 'none',
    text: 'Set the gun down. Until you move you are Emplaced: no recoil, no heavy-weapon penalty, and +5 armour.',
    available: (h) => (!h.u ? false : !EMPLACE_CATS.includes(W(h.u)?.category || '') ? 'Needs a heavy weapon or a rifle.' : condOn(h.u, 'emplaced') ? 'Already Emplaced.' : true),
    run: (h, _a, rng) => {
      const u = h.u!, cb = h.cb!, st = stateOf(h);
      say(cb, u.name + ' digs in and emplaces the ' + W(u).name + applyCond(cb, rng, u, u, 'emplaced', undefined, undefined, { skipSave: true }) + ' · +5 armour.');
      setBraced(u, true); if (!st.armour) { st.armour = 5; u.armour += 5; }
      emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'brace' });
      return null;
    },
  }],
  on: {
    attack_preview: (ctx, h) => {
      const u = h.u; if (ctx.att !== u || !u || ctx.melee || !condOn(u, 'emplaced')) return;
      ctx.noRecoil = true; // attack_preview's noRecoil (hooks gap J10): no recoil term at all, free shots included
    },
    cond_end: (ctx, h) => { if (ctx.u === h.u && ctx.id === 'emplaced') unEmplace(h, 'moved'); },
    forced_move: (ctx, h) => { if (ctx.u === h.u && !ctx.cancel && condOn(h.u!, 'emplaced')) { endCond(h.u!, 'emplaced', h.cb!); setBraced(h.u!, false); } },
  },
  priority: 900,
  brief: () => null,
});

// ---------- Suppression ----------
// 4 AP, while Emplaced, with a weapon that fires full auto: 10 rounds (or what's left) and +4 Heat into a 3x3 area
// centred on a tile in sight and range. Until your next turn, an enemy there that moves (into, inside or out of it) or
// attacks takes one attack roll from you (once each), and is Pinned on a hit (Body save). PROVISIONAL (audit 1-4, 6):
// no roll when the burst goes down; the triggered shots deal the weapon's damage, cost no ammo or Heat, aren't
// reactions, and come once per enemy.
const area3 = (c: string) => { const [x, y] = xy(c), out: string[] = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(key(x + i, y + j)); return out; };
function suppressShot(h: Holder, t: Unit, why: string, rng: Rng) {
  const u = h.u!, cb = h.cb!, z = stateOf(h).zone; if (!z || z.struck.includes(t.id) || !alive(u) || t.side === u.side || !alive(t)) return;
  z.struck.push(t.id);
  say(cb, u.name + '\'s suppressing fire catches ' + t.name + ' ' + why + '.');
  const r = quiet(u, () => resolveAttack(cb, rng, u, t, 'shot', null, { noAp: true, noWear: true }));
  if (r.hit && alive(t)) say(cb, t.name + applyCond(cb, rng, u, t, 'pinned', undefined, undefined, { via: 'dexterity' }) + '.');
  checkOver(cb);
}
register({
  id: 'hellraiser_heavy.suppression', claims: 'all',
  actions: [{
    id: 'suppression', label: 'Suppression', scope: ['combat'], ap: 'data', target: 'tile',
    text: 'While Emplaced: fire full auto into a 3×3 area. Until your next turn, any enemy there that moves or attacks takes one attack from you. If it hits, the enemy makes a Body save or is Pinned.',
    available: (h) => (!h.u ? false : !(W(h.u).modes || []).includes('auto') ? false : !condOn(h.u, 'emplaced') ? 'Emplace first.' : h.u.jammed ? 'Your gun is jammed.' : W(h.u).magazine != null && h.u.ammo <= 0 ? 'Your gun is empty. Reload first.' : true),
    preview: (h, a) => {
      const cb = h.cb!, u = h.u!, c = tileOf(cb, a.tile); if (!c) return {};
      if (!lineOfSight(cb, u.pos, c)) return { ok: false, why: 'No line of sight to that tile.' };
      if (dist(u.pos, c) > effectiveRange(W(u)) * 3) return { ok: false, why: 'Out of range.' };
      return { tiles: area3(c), lines: ['Suppress ' + refOf(c) + ' and the tiles around it until your next turn.'] };
    },
    run: (h, a) => {
      const cb = h.cb!, u = h.u!, c = tileOf(cb, a.tile)!, w = W(u);
      if (w.magazine != null) u.ammo = Math.max(0, u.ammo - 10);
      u.heat += 4; if (w.heat_limit && u.heat >= w.heat_limit + beltBonus(h.u!)) u.jammed = true;
      stateOf(h).zone = { tiles: area3(c), struck: [] as string[], round: cb.round };
      emitFx(cb, 'volley', { unit: u.id, from: u.pos, to: c, weapon: u.weapon, cat: w.category, mode: 'auto', shots: 10 });
      say(cb, u.name + ' lays down suppressing fire around ' + refOf(c) + ' (until their next turn)' + (u.jammed ? ' · the gun jams' : '') + '.');
      return null;
    },
  }],
  on: {
    move_step: (ctx, h) => { const z = h.u && stateOf(h).zone; if (z && ctx.u.side !== h.u!.side && (z.tiles.includes(ctx.at) || z.tiles.includes(ctx.from))) suppressShot(h, ctx.u, 'on the move', rngOf(h, ctx)); },
    attack_target: (ctx, h) => { const z = h.u && stateOf(h).zone; if (z && ctx.att !== h.u && ctx.att.side !== h.u!.side && z.tiles.includes(ctx.att.pos)) suppressShot(h, ctx.att, 'as it opens fire', rngOf(h, ctx)); },
    turn_start: (ctx, h) => { if (ctx.u === h.u && stateOf(h).zone) { stateOf(h).zone = null; say(h.cb, h.u!.name + '\'s suppression lifts.'); } },
  },
  brief: () => null,
});

// ---------- Belt Discipline ----------
// While Emplaced: the weapon's Heat limit is +6 (a shot that would jam on Heat alone doesn't), and it sheds 4 Heat at
// the start of your turn instead of 2. Weapons with no Heat limit are unaffected.
const beltBonus = (u: Unit) => (condOn(u, 'emplaced') && has(u, 'hellraiser_heavy.belt_discipline') ? 6 : 0);
register({
  id: 'hellraiser_heavy.belt_discipline', claims: 'all',
  // The jam check reads the Heat limit through stat 'heat_limit' (combat.ts heatLimit), so a shot that cover stops
  // doesn't jam early either (hooks gap J1).
  stat: (h, stat) => (stat === 'heat_limit' && h.u ? beltBonus(h.u) : 0),
  on: {
    turn_start: (ctx, h) => { const u = h.u; if (ctx.u === u && u && condOn(u, 'emplaced') && u.heat > 0) { u.heat = Math.max(0, u.heat - 2); } },
  },
  brief: () => null,
});

// ========================================================================================== CCEC BALLISTICIAN

// ---------- Case File ----------
// Analyze costs 1 AP (not "1 less": PROVISIONAL, audit 1) and Marks the target (no save; the marker's squad +1 to hit,
// it can't hide). A Ballistician holds at most 3 Marks (the Assassin's cap; the oldest drops, PROVISIONAL audit 3);
// Marks last the fight. The class action re-Marks a target that's already analyzed (audit 5). Story: open a case file on
// an NPC; an Analysis check passed in that scene confirms it, and the NPC starts the next fight Marked (Narrator's call).
function markTarget(h: Holder, t: Unit, rng: Rng) {
  const u = h.u!, cb = h.cb!, st = stateOf(h), list: string[] = (st.marks ||= []);
  if (condOn(t, 'marked') && t.condBy?.marked === u.id) return '';
  const out = applyCond(cb, rng, u, t, 'marked', undefined, undefined, { skipSave: true });
  if (!list.includes(t.id)) list.push(t.id);
  while (list.length > 3) { const old = unitById(cb, list.shift()); if (old && old.condBy?.marked === u.id) { endCond(old, 'marked', cb); say(cb, old.name + ' is no longer Marked (3 Marks at most).'); } }
  if (u.res && u.resMax?.marks != null) u.res.marks = Math.min(u.resMax.marks, list.length);
  return out;
}
register({
  id: 'ccec_ballistician.case_file', claims: 'all',
  stat: (h, stat, ctx) => (stat === 'ap_cost:analyze' ? 1 - (ctx?.base ?? 2) : 0),
  actions: [
    { id: 'case_file', label: 'Case File', scope: ['combat'], ap: 'data', target: 'enemy',
      text: 'Analyze a target for 1 AP and Mark it. A target that is already Analyzed is Marked again.',
      preview: (h, a) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId); if (!t) return {};
        if (dist(u.pos, t.pos) > 4 + (u.analysis || 0)) return { ok: false, why: 'Out of Analyze range (' + (4 + (u.analysis || 0)) + ' tiles).' };
        if (!lineOfSight(cb, u.pos, t.pos)) return { ok: false, why: 'No line of sight.' };
        return { lines: [t.analyzedBy ? 'Mark ' + t.name + '.' : 'Analyze and Mark ' + t.name + '.'] };
      },
      run: (h, a, rng) => {
        const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId)!;
        if (!t.analyzedBy) { refund(cb, u, 1); const e = analyze(cb, u, t); if (e) { pay(cb, u, 1); return e; } return null; } // the 'analyze' hook marks it
        say(cb, u.name + ' adds ' + t.name + ' to the case file' + markTarget(h, t, rng) + '.'); return null;
      } },
    { id: 'case_file_story', label: 'Open a case file', scope: ['story'], ap: 0, target: 'npc', uses: { per: 'per_scene', n: 1 },
      text: 'Name someone and study them. If you pass an Acuity check this scene, they are Marked at the start of your next fight with them.',
      run: (h, a) => {
        const who = String(a.npc || a.text || '').trim(); if (!who) return 'Name who you\'re studying.';
        const st = charState(h.c)[h.key] ||= {}; st.pending = { npc: who.slice(0, 60), scene: h.g?.story?.scene?.n ?? 0 };
        const eid = postStory(h, 'opens a case file on ' + who + '.');
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Case File on ' + who + ': call an Acuity check if they can be studied here; a success files them (Marked when a fight with them starts).', eid || undefined);
        return null;
      } },
  ],
  on: {
    analyze: (ctx, h) => { if (ctx.u === h.u && inFight(h)) say(h.cb, ctx.t.name + ' goes in the case file' + markTarget(h, ctx.t, rngOf(h, ctx)) + '.'); },
    check_result: (ctx, h) => {
      if (ctx.c !== h.c || !ctx.ck?.roll?.ok || !(ctx.ck.skills || []).includes('analysis')) return;
      const st = charState(h.c)[h.key]; if (!st?.pending || st.pending.scene !== (h.g?.story?.scene?.n ?? 0)) return;
      (st.files ||= []).push(st.pending.npc); st.files = st.files.slice(-6); st.pending = null;
    },
    combat_start: (ctx, h) => {
      const files: string[] = cs(h.c)[h.key]?.files || []; if (!files.length || !h.u || !inFight(h)) return;
      for (const t of ctx.cb.units as Unit[]) if (t.side === 'foe' && files.some((f) => f.toLowerCase() === t.name.toLowerCase())) say(ctx.cb, 'Case File: ' + t.name + ' is a known face' + markTarget(h, t, rngOf(h, ctx)) + '.');
    },
  },
  brief: () => 'story case files: you call the Acuity check; a pass files the NPC (Marked in the next fight)',
});

// ---------- Weak Point (class) ----------
// Aimed shots at a Marked target ignore its armour (shields still absorb) and are critical on 18-20. OPEN (audit 2): the
// name collides with Analysis's Weak Point; the data text should rename one.
function restoreArmour(h: Holder, tid?: string) {
  const st = stateOf(h), p = st.pierce; if (!p || (tid && p.tid !== tid)) return;
  const t = unitById(h.cb!, p.tid); if (t) t.armour = p.armour; st.pierce = null;
}
register({
  id: 'ccec_ballistician.weak_point', claims: 'all',
  on: {
    attack_target: (_ctx, h) => { if (h.u) restoreArmour(h); },
    attack_roll: (ctx, h) => {
      if (ctx.att !== h.u || ctx.mode !== 'aimed' || !condOn(ctx.tgt, 'marked')) return;
      ctx.critMin = Math.min(ctx.critMin, 18);
      restoreArmour(h); stateOf(h).pierce = { tid: ctx.tgt.id, armour: ctx.tgt.armour }; ctx.tgt.armour = 0;
    },
    damage_in: (ctx, h) => { if (h.u && ctx.phase === 'reduce') restoreArmour(h, ctx.t.id); },
    on_miss: (ctx, h) => { if (ctx.att === h.u) restoreArmour(h); },
    turn_end: (_ctx, h) => { if (h.u) restoreArmour(h); },
  },
  brief: () => null,
});

// ---------- One Shot ----------
// 4 AP, once per fight (PROVISIONAL, audit 4): if you haven't moved this turn, an Aimed shot at a Marked target for
// triple damage (the data's 2.0 is the bug, audit 1). GAMEBREAKING fix (audit 2, PROVISIONAL): Bosses and Celestials
// take double, not triple.
register({
  id: 'ccec_ballistician.one_shot', claims: 'all',
  actions: [{
    id: 'one_shot', label: 'One Shot', scope: ['combat'], ap: 'data', uses: { per: 'per_combat', n: 1 }, target: 'enemy',
    text: 'If you haven\'t moved this turn: take an Aimed shot at a Marked target for triple damage. Against a Boss or a Celestial it deals double damage.',
    available: (h) => (!h.u ? false : !isRanged(h.u) ? 'Needs a gun or a bow.' : h.u.moved ? 'You moved this turn.' : true),
    preview: (h, a) => {
      const t = unitById(h.cb!, a.targetId); if (!t) return {};
      if (!condOn(t, 'marked')) return { ok: false, why: 'Mark the target first.' };
      const pv = previewAttack(h.cb!, h.u!, t, 'aimed', { free: true }); return pv.ok ? { lines: ['Aimed, ' + pv.pct + '% to hit, ×' + (isBoss(t) ? 2 : 3) + ' damage.'] } : { ok: false, why: pv.why };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId)!;
      say(cb, u.name + ' breathes out: One Shot.');
      const r = withMult(u, (ctx) => (ctx.tgt === t ? { v: isBoss(t) ? 2 : 3, label: 'One Shot' } : null), () => resolveAttack(cb, rng, u, t, 'aimed', null, { free: true }));
      if (r.refused) return r.refused;
      checkOver(cb); return null;
    },
  }],
  on: { damage_out: multHook },
  brief: () => null,
});

// ============================================================================================== BANNER DANCER

// ---------- Banner Thread ----------
// With no torso armour (Class 0, and nothing in the inner or lower torso slots: PROVISIONAL, audit 2): +2 Defense and
// +1 Movement (as written; OPEN, audit 1: +1 tile per AP doubles speed at Agility 1).
const torsoBare = (c: Character | null | undefined) => !!c && (c.armourClass || 0) === 0 && !c.worn?.inner_torso && !c.worn?.lower_torso && !(c.worn as any)?.torso_inner;
register({
  id: 'banner_dancer.banner_thread', claims: 'all',
  stat: (h, stat) => (!torsoBare(h.c) ? 0 : stat === 'defense' ? 2 : stat === 'move' ? 1 : 0),
  brief: () => null,
});

// ---------- Rally Banner ----------
// 2 AP, once per scene: plant a banner on your tile or an adjacent one (a 20 HP object enemies can cut down,
// PROVISIONAL audit 6). An ally (you too) who starts its turn within 2 tiles of it gets a shield of 10 × your Healing
// given multiplier (PROVISIONAL, audit 1), topped up, never stacked, while you stand within 3 tiles of it and aren't
// Downed.
const bannerOf = (h: Holder) => { const b = stateOf(h).banner; if (!b || !h.cb) return null; return objectsOf(h.cb).find((o) => o.id === b && (o.hp ?? 1) > 0) || null; };
register({
  id: 'banner_dancer.rally_banner', claims: 'all',
  actions: [{
    id: 'plant_banner', label: 'Rally Banner', scope: ['combat'], ap: 'data', uses: { per: 'per_scene', n: 1 }, target: 'tile',
    text: 'Plant a banner on your tile or next to you. While you stay within 3 tiles of it, each ally who starts their turn within 2 tiles of it gains a shield of 10.',
    preview: (h, a) => {
      const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {};
      if (!adj(h.u!.pos, t)) return { ok: false, why: 'Pick your tile or one next to you.' };
      if (!standable(cb.map, t) || moveBlockers(cb).has(t)) return { ok: false, why: 'Nothing can stand there.' };
      return { tiles: [t] };
    },
    run: (h, a) => {
      const cb = h.cb!, u = h.u!, t = tileOf(cb, a.tile)!, id = 'banner-' + u.id + '-' + cb.round;
      (cb.objects = objectsOf(cb)).push(makeObject(id, 'poi', t, { name: 'Rally banner', text: u.name + '\'s bot-thread banner.', hp: 20, max: 20 } as any));
      stateOf(h).banner = id; say(cb, u.name + ' plants a rally banner at ' + refOf(t) + '.'); return null;
    },
  }],
  on: {
    turn_start: (ctx, h) => {
      const u = h.u, t: Unit = ctx.u; if (!u || !inFight(h) || t.side !== u.side || !alive(t) || !alive(u)) return;
      const b = bannerOf(h); if (!b || dist(t.pos, b.pos) > 2 || dist(u.pos, b.pos) > 3) return;
      const n = Math.round(itemAmount('class:banner_dancer.rally_banner', 'shield', [term(h.c ? healingMult(h.c) : 1, 'stat: healing given')])), had = t.shield || 0, got = grantShield(h.cb!, t, n, u);
      if ((t.shield || 0) > had) { emitFx(h.cb!, 'shield', { target: t.id, at: t.pos, absorbed: 0 }); say(h.cb, t.name + ' takes heart under the banner: shield ' + t.shield + '.'); }
      void got;
    },
    combat_end: (ctx, h) => { const b = stateOf(h).banner; if (b) ctx.cb.objects = objectsOf(ctx.cb).filter((o) => o.id !== b); },
  },
  brief: () => null,
});

// ---------- Sweep ----------
// 3 AP, at will, spend 3 Momentum: move up to 3 tiles (no Movement AP), then one melee attack at each enemy you come
// next to on a tile you enter (not the start tile, audit 7), and each ally you pass heals 10 × your Healing given
// multiplier, once each. PROVISIONAL: hits during Sweep build no Momentum (audit 3: no free loop); the walk draws
// opportunity attacks and Overwatch as a move does (audit 6, Leon's call). With a gun in hand you strike with fists.
let SWEEP: string | null = null;
register({
  id: 'banner_dancer.sweep', claims: 'all',
  actions: [{
    id: 'banner_sweep', label: 'Sweep', scope: ['combat'], ap: 'data', target: 'tile',
    text: 'Costs 3 Momentum. Move up to 3 tiles, strike each enemy you pass next to, and heal each ally you pass for 10 HP.',
    available: (h) => (!h.u ? false : resOf(h.u, 'momentum') < 3 ? 'Needs 3 Momentum. You have ' + resOf(h.u, 'momentum') + '.' : moveBlock(h.u) || true),
    preview: (h, a) => {
      const cb = h.cb!, u = h.u!, t = tileOf(cb, a.tile); if (!t) return {};
      const d = paths(cb, u.pos, u.id).dist[t]; if (d == null || t === u.pos) return { ok: false, why: 'Can\'t reach that tile.' };
      return d > 3 ? { ok: false, why: 'Sweep moves 3 tiles at most.' } : { tiles: [t] };
    },
    run: (h, a, rng) => {
      const cb = h.cb!, u = h.u!, t = tileOf(cb, a.tile)!;
      if (!resSpend(u, 'momentum', 3)) return 'Needs 3 Momentum.';
      const st = stateOf(h); st.struck = []; st.healed = [];
      say(cb, u.name + ' sweeps through the line (3 Momentum).');
      SWEEP = u.id; let e: string | null;
      try { e = moveUnit(cb, u, t, rng as any, 'move'); } finally { SWEEP = null; }
      if (e) { resGain(u, 'momentum', 3); return e; }
      checkOver(cb); return null;
    },
  }],
  on: {
    move_cost: (ctx, h) => { if (ctx.u === h.u && SWEEP === h.u!.id) { ctx.ap = 0; ctx.free = true; } },
    move_step: (ctx, h) => {
      const u = h.u; if (!u || ctx.u !== u || SWEEP !== u.id || !alive(u)) return;
      const cb = h.cb!, st = stateOf(h), rng = rngOf(h, ctx), mode: AttackMode = 'melee';
      for (const v of cb.units) {
        if (v === u || !adj(v.pos, ctx.at)) continue;
        if (v.side !== u.side && alive(v) && !st.struck.includes(v.id)) {
          st.struck.push(v.id); const mom = resOf(u, 'momentum');
          if (previewAttack(cb, u, v, mode, { free: true }).ok) resolveAttack(cb, rng, u, v, mode, null, { free: true });
          if (u.res) u.res.momentum = mom; // no Momentum from Sweep's own hits
        } else if (v.side === u.side && !v.dead && !st.healed.includes(v.id) && v.hp < v.maxHp) {
          st.healed.push(v.id); const r = healUnit(cb, v, itemAmount('class:banner_dancer.sweep', 'heal', [term(h.c ? healingMult(h.c) : 1, 'stat: healing given')]), u, 'class');
          emitFx(cb, 'heal', { target: v.id, at: v.pos, amount: r.restored }); say(cb, u.name + ' passes ' + v.name + ': +' + r.restored + ' HP (Sweep).');
        }
      }
      if (!alive(u)) ctx.stop = 'down';
    },
  },
  brief: () => null,
});

// ============================================================================================== RTC CONTRACTOR

// Credits: the character's account, c.state.credits (the Narrator sets it with traitState {key: 'credits'}). A
// Contractor with no account yet starts with the Company line of 1000 credits (PROVISIONAL: there is no economy yet;
// audit 5 asks for one). The engine spends them; the Narrator decides where the Company has signal.
export const RTC_START_CREDITS = 1000;
const creditsOf = (c: Character | null | undefined) => (cs(c).credits ?? RTC_START_CREDITS) as number;
function spendCredits(c: Character | null | undefined, n: number): boolean { if (!c) return false; const st = charState(c); const have = st.credits ?? RTC_START_CREDITS; if (have < n) return false; st.credits = have - n; return true; }
const needCredits = (h: Holder, n: number) => (creditsOf(h.c) < n ? 'Needs ' + n + ' credits. You have ' + creditsOf(h.c) + '.' : true);
const SIGNAL = 'Only where the Company has signal (no drops underground, in jammed zones or on Celestial ground): refuse it if there\'s none, and the use comes back.';

// ---------- Supply Drop ----------
// 2 AP, at will, 100 credits: a crate lands on a tile within 6 (one you can stand on) at the start of your next turn:
// half cover, 30 HP, 4 takes (PROVISIONAL, audit 3). Take from it (1 AP, adjacent): 1 Supply (a stim; audit 2) or one
// full magazine for the gun in hand. GAP: allies can't take yet (an object-granted action is a core change; see notes),
// so the Contractor hands things out from it. Story: 100 credits, a stim now, the drop narrated where there's signal.
register({
  id: 'rtc_contractor.supply_drop', claims: 'all',
  actions: [
    { id: 'supply_drop', label: 'Supply Drop', scope: ['combat'], ap: 'data', target: 'tile', range: 6,
      text: 'Costs 100 credits. Next turn a crate lands on a tile you pick within 6 tiles. It holds 4 picks, and each pick is 1 Supply or a magazine and costs 1 AP to take.',
      available: (h) => (stateOf(h).due ? 'A drop is already inbound.' : needCredits(h, 100)),
      preview: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {}; return dist(h.u!.pos, t) > 6 ? { ok: false, why: 'Pick a tile within 6 tiles.' } : !standable(cb.map, t) || moveBlockers(cb).has(t) ? { ok: false, why: 'The crate needs open ground.' } : { tiles: [t] }; },
      run: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile)!; if (!spendCredits(h.c, 100)) return 'Not enough credits.'; stateOf(h).due = t; say(cb, h.u!.name + ' calls a supply drop on ' + refOf(t) + ' (100 credits; ' + creditsOf(h.c) + ' left).'); note(h, 'Supply drop called on ' + refOf(t) + '. ' + SIGNAL); return null; } },
    { id: 'take_from_crate', label: 'Take from the crate', pick: ['supply', 'magazine'], pickLabel: 'A supply or a magazine', scope: ['combat'], ap: 1, target: 'none',
      text: 'While you stand next to the crate: take 1 Supply or a magazine for your gun, or hand it to an ally who is also next to the crate.',
      available: (h) => { const c = stateOf(h).crate; if (!c || !h.cb) return false; const o = objectsOf(h.cb).find((x) => x.id === c.id); if (!o) return false; return c.left <= 0 ? 'The crate is empty.' : true; },
      preview: (h, a) => {
        const c = stateOf(h).crate, o = objectsOf(h.cb!).find((x) => x.id === c.id)!, who = a.targetId ? unitById(h.cb!, a.targetId) : h.u!;
        if (!who || who.side !== h.u!.side) return { ok: false, why: 'Pick an ally.' };
        if (!adj(h.u!.pos, o.pos) || !adj(who.pos, o.pos)) return { ok: false, why: 'Stand next to the crate.' };
        if (!['supply', 'magazine'].includes(String(a.choice))) return { ok: false, why: 'Take a supply or a magazine.' };
        if (a.choice === 'magazine' && (!who.mags || magazineSize(who.weapon, who.mods) == null)) return { ok: false, why: 'No magazine fits that gun.' };
        return {};
      },
      run: (h, a) => {
        const cb = h.cb!, c = stateOf(h).crate, who = a.targetId ? unitById(cb, a.targetId)! : h.u!;
        c.left--;
        if (a.choice === 'supply') { const ch = who.charId && h.g?.characters?.[who.charId]; if (ch) ch.stims = (ch.stims || 0) + 1; else if (who.res?.supplies != null) resGain(who, 'supplies', 1); say(cb, who.name + ' takes a Supply from the crate (' + c.left + ' left).'); }
        else { who.mags!.push(magazineSize(who.weapon, who.mods)!); say(cb, who.name + ' takes a magazine from the crate (' + c.left + ' left).'); }
        return null;
      } },
    { id: 'supply_drop_story', label: 'Supply Drop', scope: ['story'], ap: 0, target: 'none', uses: { per: 'per_scene', n: 1 },
      text: 'Costs 100 credits. The Company drops supplies wherever it has signal, and you get a stim at once.',
      available: (h) => needCredits(h, 100),
      run: (h) => { if (!spendCredits(h.c, 100)) return 'Not enough credits.'; h.c!.stims = (h.c!.stims || 0) + 1; const eid = postStory(h, 'calls in a Company supply drop (100 credits).'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Supply Drop (100 credits spent, a stim given): narrate the crate. ' + SIGNAL, eid || undefined); return null; } },
  ],
  on: {
    turn_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb; if (ctx.u !== h.u || !st.due || !cb) return;
      const t = st.due; st.due = null;
      if (moveBlockers(cb).has(t) || cb.units.some((v) => !v.dead && v.pos === t)) { say(cb, 'The supply crate can\'t land on ' + refOf(t) + ': the drop aborts (credits kept by the Company).'); return; }
      const id = 'crate-' + h.u!.id + '-' + cb.round;
      (cb.objects = objectsOf(cb)).push(makeObject(id, 'crate', t, { name: 'Company supply crate', text: 'Rigaz Trade Company drop.' }));
      st.crate = { id, left: 4 }; emitFx(cb, 'explode', { at: t, radius: 0, what: 'drop' }); say(cb, 'A Company supply crate thumps down at ' + refOf(t) + '.');
    },
  },
  brief: () => 'drops only where the Company has signal',
});

// ---------- Strike Call ----------
// 3 AP, once per scene, 300 credits: mark a 3x3 area centred on a tile the squad can see (PROVISIONAL, audit 1). At the
// start of your next turn everyone inside (friend or foe: audit 3) who still has a reaction steps 1 tile out if a free
// tile outside is next to them (edge tiles only; the engine does it for everyone, audit 5), then the rest take 50
// Physical (armour applies, no multipliers: audit 2), and the cover inside takes 50. Kills are yours.
function stepOut(cb: Combat, v: Unit, tiles: string[]): string | null {
  const [x, y] = xy(v.pos); const block = moveBlockers(cb);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const k = key(x + i, y + j); if (!tiles.includes(k) && standable(cb.map, k) && !block.has(k) && !cb.units.some((o) => !o.dead && o.pos === k)) return k; }
  return null;
}
register({
  id: 'rtc_contractor.strike_call', claims: ['resource'],
  actions: [
    { id: 'strike_call', label: 'Strike Call', scope: ['combat'], ap: 'data', uses: { per: 'per_scene', n: 1 }, target: 'tile',
      text: 'Costs 300 credits. At the start of your next turn, a 3×3 area takes 50 Physical damage. Anyone inside can spend their reaction to step 1 tile out first.',
      available: (h) => needCredits(h, 300),
      preview: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {}; const seen = cb.units.some((v) => v.side === h.u!.side && unitSees(cb, v, t)); return !seen ? { ok: false, why: 'The squad has to see the tile.' } : { tiles: area3(t), lines: ['50 Physical damage to everyone within 1 tile of ' + refOf(t) + ', at the start of your next turn.'] }; },
      run: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile)!; if (!spendCredits(h.c, 300)) return 'Not enough credits.'; stateOf(h).strike = { tiles: area3(t), at: t }; say(cb, h.u!.name + ' calls a Company strike on ' + refOf(t) + ' (300 credits): it lands at the start of their next turn.'); note(h, 'Strike Call on ' + refOf(t) + '. ' + SIGNAL); return null; } },
    { id: 'strike_call_story', label: 'Strike Call', scope: ['story'], ap: 0, target: 'text', uses: { per: 'per_scene', n: 1 },
      text: 'Costs 300 credits. The Company strikes a target you name. The Narrator plays out the strike.',
      available: (h) => needCredits(h, 300),
      run: (h, a) => { if (!spendCredits(h.c, 300)) return 'Not enough credits.'; const eid = postStory(h, 'calls a Company strike: ' + (a.text || '') + ' (300 credits).'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Strike Call (300 credits spent) on "' + (a.text || '') + '": a set piece, 50 Physical to a 3x3 area if it comes to a fight. ' + SIGNAL, eid || undefined); return null; } },
  ],
  on: {
    turn_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb, u = h.u; if (ctx.u !== u || !st.strike || !cb || !u) return;
      const { tiles, at } = st.strike; st.strike = null;
      emitFx(cb, 'explode', { at, radius: 1, what: 'strike' });
      let line = 'The Company strike hits ' + refOf(at);
      for (const v of cb.units) {
        if (v.dead || !tiles.includes(v.pos)) continue;
        if (alive(v) && canReact(cb, v)) { const out = stepOut(cb, v, tiles); if (out) { useReaction(cb, v); emitFx(cb, 'move', { unit: v.id, from: v.pos, to: out, path: [v.pos, out], how: 'move' }); line += ' · ' + v.name + ' dives clear to ' + refOf(out); displace(cb, null, v, { tile: out }, { by: v, how: 'teleport', source: 'dive', willing: true, fx: false }); continue; } }
        line += hurtUnit(v, itemAmount('class:rtc_contractor.strike_call', 'damage'), false, cb, 'explosion', u);
      }
      for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && tiles.includes(o.pos)) line += damageObject(cb, o.pos, 50, 0, u);
      say(cb, line + '.'); checkOver(cb);
    },
  },
  brief: () => 'strikes only where the Company has signal',
});

// ---------- Extraction ----------
// 4 AP, once per session, 500 credits: pick a landing tile the squad can see. At the start of round +2 the flyer lands:
// every PC within 2 tiles of it is lifted out (a Downed one only with a standing ally within 1 of it). If nobody is
// left, the fight ends as an extraction (no win, no win XP; PROVISIONAL audit 1: the engine reports it as a fight not
// won, with a note). PCs left behind fight on. The Narrator decides where the flyer can land and what follows.
register({
  id: 'rtc_contractor.extraction', claims: ['resource'],
  actions: [
    { id: 'extraction', label: 'Extraction', scope: ['combat'], ap: 'data', uses: { per: 'per_session', n: 1 }, target: 'tile',
      text: 'Costs 500 credits. A Company flyer lands on the tile you pick in 2 rounds and lifts out everyone within 2 tiles of it.',
      available: (h) => (stateOf(h).lz ? 'A flyer is already inbound.' : needCredits(h, 500)),
      preview: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {}; return !standable(cb.map, t) ? { ok: false, why: 'The flyer needs open ground.' } : !cb.units.some((v) => v.side === h.u!.side && unitSees(cb, v, t)) ? { ok: false, why: 'The squad has to see the tile.' } : { tiles: [t] }; },
      run: (h, a) => { const cb = h.cb!, t = tileOf(cb, a.tile)!; if (!spendCredits(h.c, 500)) return 'Not enough credits.'; stateOf(h).lz = { at: t, round: cb.round + 2 }; say(cb, h.u!.name + ' calls a Company extraction to ' + refOf(t) + ' (500 credits): wheels down at the start of round ' + (cb.round + 2) + '.'); note(h, 'Extraction called to ' + refOf(t) + ': decide whether the flyer can land, where it takes the squad, and what the Company bills. ' + SIGNAL); return null; } },
    { id: 'extraction_story', label: 'Extraction', scope: ['story'], ap: 0, target: 'text', uses: { per: 'per_session', n: 1 },
      text: 'Costs 500 credits. A Company flyer takes the squad out of this zone. Say where it takes you.',
      available: (h) => needCredits(h, 500),
      run: (h, a) => { if (!spendCredits(h.c, 500)) return 'Not enough credits.'; const eid = postStory(h, 'calls a Company flyer (500 credits)' + (a.text ? ': ' + a.text : '') + '.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Extraction (500 credits spent): the flyer lifts the squad out' + (a.text ? ' toward "' + a.text + '"' : '') + '. Decide where it can land and what follows. ' + SIGNAL, eid || undefined); return null; } },
  ],
  on: {
    round_start: (ctx, h) => {
      const st = stateOf(h), cb = h.cb, u = h.u; if (!st.lz || !cb || !u || ctx.round < st.lz.round) return;
      const at = st.lz.at; st.lz = null;
      const pcs = cb.units.filter((v) => v.side === u.side && !v.companion && !v.dead && !(v as any).extracted);
      const lifted = pcs.filter((v) => dist(v.pos, at) <= 2 && (!v.downed || pcs.some((o) => o !== v && alive(o) && dist(o.pos, v.pos) <= 1)));
      for (const v of lifted) { (v as any).extracted = true; v.surrendered = true; dropHeldShot(cb, v, 'lifted out'); }
      say(cb, 'The Company flyer touches down at ' + refOf(at) + (lifted.length ? ' and lifts out ' + lifted.map((v) => v.name).join(', ') : ' and finds nobody to lift') + '.');
      (cb.notes ||= []).push('EXTRACTED: ' + (lifted.map((v) => v.name).join(', ') || 'nobody') + ' left the fight by Company flyer (not a defeat; no win).');
      if (pcs.every((v) => (v as any).extracted || v.dead || v.downed) && lifted.length) { cb.over = 'extracted'; }
    },
  },
  brief: () => 'you decide where the flyer can land and what follows',
});

// ================================================================================================ BLADE SCRIBE

// Rules 1.4 (decision 98; docs/design/sigil-1.4-impact.md): glyphs are drawn on your own tile, one a tile, and a spell a
// move carries some other way resolves straight at its target as Touch (sigil.ts castAt: Reach words ignored, Bursts and
// Delivery as written, repeats ×0.9, KIN and friendly fire as in an Evoke).
/** Pay a Sigil word's price without leaving a glyph (Three-Cut Script): its charge and its Flux (an overload included),
 * through the engine's glyph_cost hook; the move paid its AP. Returns why it can't be paid, or null. */
function payWord(cb: Combat, rng: Rng, u: Unit, word: string): { why: string | null; line: string } {
  const gc = glyphCost(cb, u, word, false, u.pos); if (gc.fail) return { why: gc.fail, line: '' };
  if ((u.mg?.charge || 0) < gc.charge) return { why: 'not enough charge for ' + word.toUpperCase() + ' (' + (u.mg?.charge || 0) + ' left)', line: '' };
  u.mg!.charge -= gc.charge;
  return { why: null, line: gc.flux ? flux(cb, rng as any, u, gc.flux) : '' };
}
/** Words from a choice ("fire,condense,push" or "FIRE · SEEK"). */
const wordsOf = (s: unknown) => String(s || '').split(/[\s,·]+/).filter(Boolean).map((w) => w.toLowerCase());
/** The element a word carries for the fx layer and resistances (sigils.json elements; the engine's damage types). */
const DMG_OF: Record<string, string | undefined> = { fire: 'fire', freeze: 'frost', shock: 'lightning', spark: 'lightning', acid: 'acid' };
const condKey = (id: string) => (id === 'left_brain_debuff' ? 'ldebuff' : id === 'right_brain_debuff' ? 'rdebuff' : id);
const knows = (u: Unit, w: string) => !!u.mg?.words.includes(w);
const evokerReady = (u: Unit) => (!u.mg?.evoker ? 'Needs an Evoker in hand.' : true);

// ---------- Sword Form ----------
// Each melee attack may draw one Sigil glyph on your own tile as part of the strike, for no AP (toggle "Sword Form:
// <WORD>" on Attack); it still costs the word's charge and Flux, and it's drawn on a miss too (audit 2). One free glyph
// per attack in all (audit 3: not stacked with the Evoker blade's Edge Word). Needs an Evoker (the Evoker blade counts).
// 1.4: the glyph goes on your own tile (the general rule), so a reach-2 strike carries it too; it is refused, with a
// log line and nothing spent, when your tile already holds a glyph or the word would break the drawing rules (a second
// Reach word in your Line, past your cap). The glyph joins your Line like any other.
const SWORD_WORDS = Object.keys(SIGIL);
const tileTaken = (cb: Combat | null | undefined, u: Unit) => !!cb && (cb.glyphs || []).some((g) => g.pos === u.pos);
register({
  id: 'blade_scribe.sword_form', claims: 'all',
  toggles: SWORD_WORDS.map((w): ToggleDef => ({
    id: 'word_' + w, label: 'Sword Form: ' + SIGIL[w].word, on: ['combat/attack'],
    available: (h, actx) => {
      const u = h.u; if (!u || !knows(u, w) || !u.mg?.evoker) return false; if (actx?.mode && actx.mode !== 'melee' && !isMelee(W(u))) return false;
      return tileTaken(h.cb, u) ? 'Your tile already holds a glyph.' : true;
    },
    preview: () => 'This strike also draws ' + SIGIL[w].word + ' on your own tile for no AP. It costs ' + SIGIL[w].charge + ' charge and adds ' + (SIGIL[w] as any).flux + ' Flux.',
  })),
  on: {
    attack_roll: (ctx, h) => {
      const u = h.u; if (ctx.att !== u || !u || !(ctx.mode === 'melee' || isMelee(W(u))) || !inFight(h)) return;
      const w = SWORD_WORDS.find((x) => modOn(h, 'word_' + x)); if (!w) return;
      const st = stateOf(h); st.edge = null;
      const e = freeAp(u, () => drawGlyph(h.cb!, rngOf(h, ctx) as any, u, w, u.pos));
      if (e) say(h.cb, '(Sword Form: ' + e + ')'); else st.edge = { word: w, tgt: ctx.tgt.id };
    },
  },
  brief: () => null,
});

// ---------- Edge Sigil ----------
// A damage word drawn through Sword Form adds its damage to that hit as Elemental: the word's listed damage × your
// Elemental multiplier (not the Sigil multiplier, not the crit), half armour. Every element counts but STONE
// (PROVISIONAL, audit 1-2, 4); 1.4's ACID counts too (15), and like the rest it brings no rider (no Corroded, no GALE
// shove: PROVISIONAL, lane classes-j). The glyph stays on your tile (it can still join your Line).
const EDGE = new Set(Object.keys(SIGIL).filter((w) => SIGIL[w].class === 'subject_element' && w !== 'stone'));
register({
  id: 'blade_scribe.edge_sigil', claims: 'all',
  on: {
    on_hit: (ctx, h) => {
      const u = h.u; if (ctx.att !== u || !u) return;
      const st = u.ps?.['class:blade_scribe.sword_form']; const e = st?.edge; if (!e || e.tgt !== ctx.tgt.id) return; st.edge = null;
      if (!EDGE.has(e.word) || ctx.tgt.dead) return;
      const w = SIGIL[e.word], n = (w.damage || 0) * (u.mg?.elemMult || 1);
      say(h.cb, 'Edge Sigil: ' + w.word + ' runs down the blade' + withElement(e.word, () => harm(h.cb!, rngOf(h, ctx) as any, u, ctx.tgt, n, 'elemental', DMG_OF[e.word] || 'elemental')) + '.');
    },
    on_miss: (ctx, h) => { const st = h.u?.ps?.['class:blade_scribe.sword_form']; if (ctx.att === h.u && st) st.edge = null; },
  },
  brief: () => null,
});

// ---------- Three-Cut Script ----------
// 6 AP flat, once per scene: three melee strikes, each cutting one word (choice: three words, "fire,condense,push";
// targetIds for each cut, else the same target, else the weakest enemy next to you if it fell). Each word's charge and
// Flux are paid as it's cut (an overload ends the script: audit 6); the cuts leave no glyph on the ground. After the
// third cut the words resolve as one spell aimed at the last target struck as Touch (it's next to you), whatever Reach
// words are among them (1.4: sigil.ts castAt): Bursts and Delivery apply as written (a CONDENSE core on the target, a
// SPREAD ring around it, CHAIN jumps from it; TWICE's other missiles at the other targets you cut, then the nearest of the
// right kind next to the last one; STAY / WAIT / WATCH place their magic on its tile), repeated glyphs take
// ×0.9 each, and Elements roll Brain Power against Defense. The 1.4 grammar holds (a Subject and another word; one
// Reach word; at most 4, and the script's 3 never pass it); the third word may go over your Max Sigil words
// (PROVISIONAL, audit 3). The Evoke charge is paid (3 less your Sigil Core saving, at least 1: audit 2). Misses still
// cut (audit 5). Edge Sigil adds to each hit as usual. STEP lands the target on the tile you pick (tile).
register({
  id: 'blade_scribe.three_cut_script', claims: 'all',
  actions: [{
    id: 'three_cut_script', label: 'Three-Cut Script', pick: 'words', pickMulti: 3, pickLabel: 'Three words', scope: ['combat'], ap: 'data', uses: { per: 'per_scene', n: 1 }, target: 'enemy', range: 1,
    text: 'Make three melee strikes, each one cutting a word you chose. After the third cut, the three words go off as one spell on the last target, delivered by Touch.',
    available: (h) => (!h.u ? false : evokerReady(h.u)),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, words = wordsOf(a.choice);
      if (words.length !== 3) return { ok: false, why: 'Pick three words.' };
      const unk = words.find((w) => !SIGIL[w] || !knows(u, w)); if (unk) return { ok: false, why: 'You don\'t know ' + unk.toUpperCase() + '.' };
      const ready = sigilReady(cb, u); if (ready) return { ok: false, why: ready };
      const ge = grammarError(words, Math.max(3, u.mg?.maxWords || 2)); if (ge) return { ok: false, why: ge };
      let cost = Math.max(1, 3 - (u.mg?.coreSave || 0)), fx = 0;
      for (const w of words) { const gc = glyphCost(cb, u, w, true, u.pos); if (gc.fail) return { ok: false, why: gc.fail }; cost += gc.charge; fx += gc.flux; }
      if ((u.mg?.charge || 0) < cost) return { ok: false, why: 'Needs ' + cost + ' charge (' + (u.mg?.charge || 0) + ' in the core).' };
      return { lines: ['Three cuts: ' + words.map((w) => w.toUpperCase()).join(' · ') + ' (' + cost + ' charge, ' + fx + ' Flux), then the spell goes off on the last target as Touch.'] };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, words = wordsOf(a.choice);
      const picks = a.targetIds?.length ? a.targetIds : [a.targetId, a.targetId, a.targetId];
      say(cb, u.name + ' begins the Three-Cut Script: ' + words.map((w) => w.toUpperCase()).join(' · ') + '.');
      let last: Unit | null = null; const cut: Unit[] = [];
      for (let i = 0; i < 3; i++) {
        let t = unitById(cb, picks[i] || picks[0]);
        if (!t || !alive(t) || !adj(t.pos, u.pos)) t = foesOf(cb, u).filter((v) => adj(v.pos, u.pos)).sort((x, y) => x.hp - y.hp)[0] || null;
        if (!t) { say(cb, '(The script breaks off: nobody left in reach.)'); return null; }
        const r = resolveAttack(cb, rng, u, t, 'melee', null, { free: true });
        if (r.refused) { say(cb, '(The script breaks off.)'); return null; }
        const p = payWord(cb, rng, u, words[i]);
        if (p.why) { say(cb, '(The script breaks off: ' + p.why + '.)'); return null; }
        say(cb, 'Cut ' + (i + 1) + ': ' + words[i].toUpperCase() + '.' + p.line);
        last = t; if (!cut.includes(t)) cut.push(t);
        if (u.mg?.lockRound === cb.round) { say(cb, '(The script breaks off: the Evoker overloads.)'); return null; }
      }
      const ec = Math.max(1, 3 - (u.mg?.coreSave || 0));
      if ((u.mg?.charge || 0) < ec) { say(cb, '(The script fizzles: no charge left to release it.)'); return null; }
      if (!last || last.dead) { say(cb, '(The script resolves on nobody: the last target fell.)'); u.mg!.charge -= ec; u.mg!.cast = true; return null; }
      u.mg!.charge -= ec; u.mg!.cast = true;
      const dest = a.tile ? tileOf(cb, a.tile) || undefined : undefined;
      // TWICE: its missiles past the first go to the other targets you cut (the targets you picked), then castAt's nearest.
      const extra = cut.filter((v) => v !== last && alive(v)).map((v) => v.pos);
      const r = castAt(cb, rng as any, u, words, last.pos, { victim: last, roll: true, extra, opts: { dest, order: (a as any).order, orderTo: (a as any).orderTo } });
      emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: 'touch', tiles: [u.pos], src: u.pos, impact: last.pos, targets: r.hit, words, element: r.spell.element, side: u.side, facing: 'touch', area: (r.plans || []).flatMap((x) => x.burst.tiles).filter((k, i, all) => all.indexOf(k) === i).concat(r.plans?.length ? [] : [last.pos]),
        missiles: (r.plans || []).map((x) => ({ origin: u.pos, kind: 'touch', path: [], blockedAt: null, impact: x.impact, arc: null, hops: [], burst: x.burst.tiles, core: x.burst.core, chain: x.chain, placed: x.placed })), placed: r.plan?.placed || null, fizzle: r.fizzle, by: 'three_cut_script' });
      say(cb, 'The script resolves on ' + last.name + ' (' + ec + ' charge)' + (r.ok ? r.line : ' · it can\'t: ' + r.why) + '.');
      checkOver(cb); return null;
    },
  }],
  brief: () => null,
});

// ============================================================================================= SIEGE ENGINEER

// ---------- Deploy Cover ----------
// 2 AP, at will: a portable barricade on an adjacent open tile: half cover, 40 HP, blocks movement. At most 3 out per
// engineer; a fourth packs up the oldest (GAMEBREAKING fix, PROVISIONAL audit 1). 1.4: a STAY glyph of your side on a
// tile next to it (glyphs go on your own tile, so you draw it standing beside the barricade) makes it full cover (it
// blocks sight) for as long as the glyph lasts (no Evoke needed: audit 3); Evoking or scuffing the glyph ends it. An
// enemy's STAY glyph does nothing for it (PROVISIONAL, lane classes-j). A 1.2 save's STAY glyph on the barricade's own
// tile still counts. The barricades pack up when the fight ends. Story: placing cover before a fight is the
// Narrator's call when there's time.
function syncBarricades(h: Holder) {
  const cb = h.cb, list: string[] = h.u ? stateOf(h).cover || [] : []; if (!cb || !list.length) return;
  for (const o of objectsOf(cb)) {
    if (!list.includes(o.id)) continue;
    const stay = (cb.glyphs || []).some((g) => g.word === 'stay' && g.side === h.u!.side && dist(g.pos, o.pos) <= 1);
    const want = stay ? 'barricade' : 'crate';
    if (o.kind !== want && !(o as any).bulwark) { o.kind = want; say(cb, 'The portable barricade at ' + refOf(o.pos) + (stay ? ' locks into full cover (STAY).' : ' drops back to half cover.')); }
  }
}
register({
  id: 'siege_engineer.deploy_cover', claims: 'all',
  actions: [
    { id: 'deploy_cover', label: 'Deploy Cover', scope: ['combat'], ap: 'data', target: 'tile',
      text: 'Set a portable barricade on a tile next to you. It is half cover with 40 HP. A STAY glyph on a tile next to it makes it full cover. You can have three out at once.',
      preview: (h, a) => {
        const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {};
        if (t === h.u!.pos || !adj(h.u!.pos, t)) return { ok: false, why: 'Pick a tile next to you.' };
        if (!standable(cb.map, t) || moveBlockers(cb).has(t) || objectsAt(cb, t).some((o) => o.hp != null) || cb.units.some((v) => !v.dead && v.pos === t)) return { ok: false, why: 'The tile has to be open.' };
        return { tiles: [t], lines: [(stateOf(h).cover || []).length >= 3 ? 'Your oldest barricade packs up.' : 'Half cover, 40 HP.'] };
      },
      run: (h, a) => {
        const cb = h.cb!, u = h.u!, t = tileOf(cb, a.tile)!, st = stateOf(h), list: string[] = (st.cover ||= []);
        const id = 'pb-' + u.id + '-' + (st.seq = (st.seq || 0) + 1);
        (cb.objects = objectsOf(cb)).push(makeObject(id, 'crate', t, { name: 'Portable barricade', text: u.name + '\'s barricade.', hp: 40, max: 40 }));
        list.push(id);
        while (list.length > 3) { const old = list.shift()!; cb.objects = objectsOf(cb).filter((o) => o.id !== old); say(cb, u.name + ' packs up an older barricade.'); }
        say(cb, u.name + ' deploys a portable barricade at ' + refOf(t) + '.'); syncBarricades(h); return null;
      } },
  ],
  on: {
    turn_end: (_c, h) => syncBarricades(h), turn_start: (_c, h) => syncBarricades(h), round_start: (_c, h) => syncBarricades(h), attack_target: (_c, h) => syncBarricades(h),
    glyph_drawn: (_c, h) => syncBarricades(h), evoked: (_c, h) => syncBarricades(h),
    combat_end: (ctx, h) => { const list: string[] = stateOf(h).cover || []; if (list.length) ctx.cb.objects = objectsOf(ctx.cb).filter((o) => !list.includes(o.id)); },
  },
  brief: () => 'out of a fight, cover set up before it starts is your call',
});

// ---------- Sentry Turret ----------
// 3 AP, 2 Evoker charge: a turret on an adjacent open tile (40 HP, Defense 10, no armour, never moves). At the end of
// your turn it fires once at the nearest enemy it can see within 12 tiles: d20 + 4 against Defense (half cover −5),
// 20 Physical (armour applies, no multipliers); kills are yours. One at a time; at will with the 2 charge as the limit
// (PROVISIONAL, audit 5). Destroyed, it's gone (a machine, no bots). It's removed when the fight ends.
function turretOf(h: Holder): Unit | null { const id = stateOf(h).turret; return id && h.cb ? h.cb.units.find((v) => v.id === id && !v.dead) || null : null; }
register({
  id: 'siege_engineer.sentry_turret', claims: 'all',
  actions: [{
    id: 'sentry_turret', label: 'Sentry Turret', scope: ['combat'], ap: 'data', target: 'tile',
    text: 'Costs 2 charge. Deploy a turret on a tile next to you. It has 40 HP and Defense 10, and once a round it fires at the nearest enemy at +4 to hit for 20 damage. You can have one turret out at a time.',
    available: (h) => (!h.u ? false : !h.u.mg?.evoker ? 'Needs an Evoker in hand with 2 charge.' : (h.u.mg.charge || 0) < 2 ? 'Needs 2 charge.' : turretOf(h) ? 'Your turret is still up.' : true),
    preview: (h, a) => {
      const cb = h.cb!, t = tileOf(cb, a.tile); if (!t) return {};
      if (t === h.u!.pos || !adj(h.u!.pos, t)) return { ok: false, why: 'Pick a tile next to you.' };
      if (!standable(cb.map, t) || moveBlockers(cb).has(t) || cb.units.some((v) => !v.dead && v.pos === t)) return { ok: false, why: 'The tile has to be open.' };
      return { tiles: [t] };
    },
    run: (h, a) => {
      const cb = h.cb!, u = h.u!, t = tileOf(cb, a.tile)!; u.mg!.charge -= 2;
      const id = 'turret-' + u.id + '-' + cb.round;
      const tu: Unit = { id, side: u.side, name: 'Sentry turret', short: 'ST', pos: t, hp: 40, maxHp: 40, def: 10, armour: 0, attack: 4, weapon: 'service_pistol', movement: 0, init: 0, agility: 1,
        ap: 0, bank: 0, ammo: 0, heat: 0, jammed: false, shotsThisTurn: 0, downed: false, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0, vision: 12, kind: 'turret', tags: ['machine'], companion: 'turret' } as Unit;
      cb.units.push(tu); stateOf(h).turret = id;
      emitFx(cb, 'stance', { unit: id, at: t, what: 'overwatch' }); say(cb, u.name + ' deploys a sentry turret at ' + refOf(t) + ' (2 charge).');
      return null;
    },
  }],
  on: {
    turn_end: (ctx, h) => {
      const u = h.u, tu = turretOf(h), cb = h.cb; if (ctx.u !== u || !tu || !cb || !u) return;
      const t = foesOf(cb, tu).filter((v) => !v.hidden && unitSees(cb, tu, v.pos)).sort((a, b) => dist(a.pos, tu.pos) - dist(b.pos, tu.pos) || a.hp - b.hp)[0]; if (!t) return;
      const rng = rngOf(h, ctx), cover = coverTileFor(cb, tu.pos, t.pos) ? 5 : 0, sr = rollVs(cb, rng as any, { by: tu, mod: [{ add: 4, label: 'turret' }, { add: -cover, label: 'cover' }], tn: t.def, why: 'turret shot' }), r = sr.die, hit = sr.ok;
      emitFx(cb, 'shot', { unit: tu.id, target: t.id, from: tu.pos, to: t.pos, weapon: 'service_pistol', cat: 'pistol', mode: 'shot', hit, crit: false, fumble: r === 1, dmg: 0, killed: false });
      say(cb, 'The sentry turret fires at ' + t.name + ': ' + sr.text + (cover ? ' (−5 cover)' : '') + (hit ? harm(cb, rng as any, u, t, itemAmount('class:siege_engineer.sentry_turret', 'damage'), 'physical') : ' · miss') + '.');
      checkOver(cb);
    },
    on_downed: (ctx, h) => { const id = stateOf(h).turret; if (h.cb && ctx.victim.id === id) { const seen = (h.cb.deadSeen ||= []); if (!seen.includes(id)) seen.push(id); say(h.cb, 'The sentry turret is wrecked.'); } },
    combat_end: (ctx, h) => { const id = stateOf(h).turret; if (id) ctx.cb.units = ctx.cb.units.filter((v: Unit) => v.id !== id); },
  },
  brief: () => null,
});

// ---------- Bulwark Line ----------
// 4 AP, once per scene: until your next turn, cover within 3 tiles of you (as you stand now) that has an ally next to it
// counts as full cover (blocks sight) and gains 20 HP, lost first and gone at the end (never breaking the cover).
// PROVISIONAL (audit 1): only cover beside an ally hardens, so it isn't a free wall for the enemy too.
function bulwarkEnd(h: Holder) {
  const cb = h.cb, st = stateOf(h), list = st.bulwark as { id: string; kind: string; max: number }[] | undefined; if (!cb || !list) return;
  for (const b of list) { const o = objectsOf(cb).find((x) => x.id === b.id); if (!o) continue; o.kind = b.kind; o.max = b.max; o.hp = Math.max(1, Math.min(o.hp ?? b.max, b.max)); delete (o as any).bulwark; }
  st.bulwark = null; say(cb, 'The Bulwark Line eases.'); syncBarricades({ ...h, key: 'class:siege_engineer.deploy_cover' } as Holder);
}
register({
  id: 'siege_engineer.bulwark_line', claims: 'all',
  actions: [{
    id: 'bulwark_line', label: 'Bulwark Line', scope: ['combat'], ap: 'data', uses: { per: 'per_scene', n: 1 }, target: 'none',
    text: 'Until your next turn, every piece of cover within 3 tiles of you that has an ally beside it counts as full cover and gains 20 HP.',
    run: (h) => {
      const cb = h.cb!, u = h.u!, list: { id: string; kind: string; max: number }[] = [];
      for (const o of objectsOf(cb)) {
        if (o.hp == null || o.hp <= 0 || !['crate', 'low_wall', 'barrel', 'container', 'barricade', 'pillar', 'turret'].includes(o.kind)) continue;
        if (dist(o.pos, u.pos) > 3 || !cb.units.some((v) => v.side === u.side && !v.dead && adj(v.pos, o.pos))) continue;
        list.push({ id: o.id, kind: o.kind, max: o.max ?? o.hp }); (o as any).bulwark = true;
        if (o.kind !== 'pillar') o.kind = 'barricade'; o.max = (o.max ?? o.hp) + 20; o.hp = o.hp + 20;
      }
      stateOf(h).bulwark = list;
      say(cb, u.name + ' sets the Bulwark Line: ' + (list.length ? list.length + ' piece' + (list.length === 1 ? '' : 's') + ' of cover harden to full cover (+20 HP) until their next turn' : 'no cover beside an ally to harden') + '.');
      return null;
    },
  }],
  on: { turn_start: (ctx, h) => { if (ctx.u === h.u && stateOf(h).bulwark) bulwarkEnd(h); }, combat_end: (_c, h) => { if (stateOf(h).bulwark) bulwarkEnd(h); } },
  brief: () => null,
});

// =============================================================================================== SPELLSLINGER

// ---------- Inscribed Rounds ----------
// Out of combat, once per rest: inscribe up to 6 rounds with one word (choice: the word; text: how many), paying 1
// Evoker charge per round (PROVISIONAL, audit 2) and needing an Evoker and the word. Any gun (audit 4). In a fight the
// inscribed rounds fire first (toggle "Inscribed round", on by default); a miss spends the round. 1.4: Elements and
// Afflictions only (Boons and Workings make no sense on a bullet). On a hit an Element adds half its Subject damage as
// its type (FIRE 15, SHOCK 15, FREEZE 12, SPARK 7, ACID 7 Elemental; STONE 17, GALE 7 Sigil) and its listed rider
// (FREEZE: Slowed, Body save; ACID: Corroded, no save, a Body save ends it; FIRE's Burning needs a critical spell and
// GALE's shove a spell, so neither rides a bullet: PROVISIONAL, lane classes-j); an Affliction applies its condition
// with its own save (against 12 + your Brain Power strength; COMMAND's order is halt). The hit releases bots (+1 on the
// meter). PROVISIONAL (audit 1). The pack shows them on the sheet as state.
const inscribable = (w: string) => { const k = (SIGIL[w] as any)?.class; return k === 'subject_element' || k === 'subject_affliction'; };
const insOf = (h: Holder) => cs(h.c)['class:spellslinger.inscribed_rounds'] as { word: string; n: number } | undefined;
/** A word's condition rider on one creature (sigils.json applies): its save family, rounds, and COMMAND's halt. */
function rider(cb: Combat, rng: Rng, u: Unit, t: Unit, word: string): string {
  const ap: any = (SIGIL[word] as any)?.applies; if (!ap?.condition || t.dead) return '';
  return withElement(SIGIL[word].class === 'subject_element' ? word : null, () => applyCond(cb, rng as any, u, t, condKey(ap.condition), ap.rounds, (ap.save || undefined) as any, { skipSave: !ap.save, via: 'brain_power', ...(word === 'command' ? { arg: 'halt' } : {}) } as any));
}
register({
  id: 'spellslinger.inscribed_rounds', claims: 'all',
  actions: [{
    id: 'inscribe_rounds', label: 'Inscribed Rounds', pick: 'words', pickLabel: 'The word', scope: ['world', 'story'], ap: 'data', uses: { per: 'per_rest', n: 1 }, target: 'none',
    text: 'Out of a fight: inscribe up to 6 rounds with an Element or an Affliction word. Costs 1 charge per round.',
    available: (h) => { const m = h.c ? magicOf(h.c) : null; return !m?.evoker ? 'Needs an Evoker in hand.' : true; },
    preview: (h, a) => {
      const m = magicOf(h.c!)!, w = String(a.choice || '').toLowerCase(), n = Math.max(1, Math.min(6, Number(a.text) || 6));
      if (!inscribable(w)) return { ok: false, why: 'Pick an Element or an Affliction word.' };
      if (!m.words.includes(w)) return { ok: false, why: 'You don\'t know ' + w.toUpperCase() + '.' };
      if (m.charge < n) return { ok: false, why: 'Needs ' + n + ' charge (' + m.charge + ' in the core).' };
      return { lines: ['Inscribe ' + n + ' rounds with ' + w.toUpperCase() + ' (' + n + ' charge).'] };
    },
    run: (h, a) => {
      const c = h.c!, m = magicOf(c)!, w = String(a.choice).toLowerCase(), n = Math.max(1, Math.min(6, Number(a.text) || 6));
      c.evoCharge = Math.max(0, (c.evoCharge ?? m.charge ?? CORE_CHARGE) - n);
      if (h.u?.mg) h.u.mg.charge = c.evoCharge;
      charState(c)[h.key] = { word: w, n };
      if (h.cb) say(h.cb, c.name + ' inscribes ' + n + ' rounds with ' + w.toUpperCase() + '.'); else postStory(h, 'inscribes ' + n + ' rounds with ' + w.toUpperCase() + '.', { private: true });
      return null;
    },
  }],
  toggles: [{ id: 'inscribed', label: 'Inscribed round', on: ['combat/attack'], defaultOn: true,
    available: (h) => { const s = insOf(h); return !!s && s.n > 0 && !!h.u && isRanged(h.u) && inscribable(s.word) ? true : false; },
    preview: (h) => { const s = insOf(h)!; return 'This shot fires a ' + s.word.toUpperCase() + ' round. You have ' + s.n + ' left.'; } }],
  on: {
    attack_roll: (ctx, h) => {
      const u = h.u, s = insOf(h); if (ctx.att !== u || !u || !s || s.n <= 0 || !isRanged(u) || ctx.mode === 'melee' || !modOn(h, 'inscribed') || !inFight(h)) return;
      if (!inscribable(s.word)) return; // a 1.2 save's round with a word 1.4 retired (or a Boon): it's a plain round
      s.n--; stateOf(h).ins = { word: s.word, tgt: ctx.tgt.id };
    },
    on_hit: (ctx, h) => {
      const st = h.u ? stateOf(h) : null, ins = st?.ins; if (ctx.att !== h.u || !ins || ins.tgt !== ctx.tgt.id) return; st!.ins = null;
      const cb = h.cb!, rng = rngOf(h, ctx), u = h.u!, t = ctx.tgt as Unit, w = SIGIL[ins.word]; let line = 'The inscribed ' + w.word + ' round bites';
      if (!t.dead) {
        if (w.class === 'subject_element') {
          const elem = w.damage_type === 'elemental';
          line += withElement(ins.word, () => harm(cb, rng as any, u, t, Math.floor((w.damage || 0) * amountMult('class:spellslinger.inscribed_rounds', 'damage', 'word_share')) * (elem ? u.mg?.elemMult || 1 : u.mg?.sigilMult || 1), elem ? 'elemental' : 'sigil', DMG_OF[ins.word]));
        }
        line += rider(cb, rng, u, t, ins.word);
      }
      shiftMana(cb, 1, 'an inscribed round'); say(cb, line + '.');
    },
    on_miss: (ctx, h) => { if (ctx.att === h.u && h.u) stateOf(h).ins = null; },
  },
  brief: () => 'out of a fight, an inscribed round\'s other uses (a SHOCK round on a lock) are yours to rule',
});

// ---------- Spell Magazine ----------
// Out of combat, once per rest (PROVISIONAL, audit 1: one magazine; the Scribe's Rumination count is the open
// alternative): store a whole Sigil spell (choice: its words, "fire,condense") in a magazine, paying every word's
// charge plus the Evoke charge now (the Flux vents into the air out of a fight). 1.4: words only, no shape; the 1.4
// grammar and your Max Sigil words hold. In a fight, "Load the spell magazine" (reload AP) swaps it in; its first hit
// fires the stored spell at the target as if Touch-cast on it (sigil.ts castAt): Reach words are ignored, a Burst
// centres on the target (PUSH's cone points on from you through it), CHAIN jumps from it, TWICE's other missiles go to
// the nearest creature of the right kind next to it (none there: lost), PULL drags toward you, and
// STAY / WAIT / WATCH place their field, trap or turret on its tile. Damage words hit without a roll (the bullet already
// hit); conditions still saved against; repeats ×0.9; KIN spares your side, friendly fire otherwise. An unfired spell
// fades at the next rest. A 1.2 magazine whose words no longer make a spell fires nothing (the round is a plain one).
const smOf = (h: Holder) => cs(h.c)['class:spellslinger.spell_magazine'] as { words: string[]; rest: string } | undefined;
const restStamp = (g: any) => (g?.sessionN ?? 1) + '.' + (g?.restN ?? 0);
const smCost = (m: { wordCost?: Record<string, number>; coreSave: number }, words: string[]) => words.reduce((t, w) => t + Math.max(0, SIGIL[w].charge + (m.wordCost?.[w] || 0)), 0) + Math.max(1, words.length - (m.coreSave || 0));
register({
  id: 'spellslinger.spell_magazine', claims: 'all',
  actions: [
    { id: 'spell_magazine', label: 'Spell Magazine', pick: 'words', pickMulti: 4, pickLabel: 'The words', scope: ['world', 'story'], ap: 'data', uses: { per: 'per_rest', n: 1 }, target: 'none',
      text: 'Out of a fight: store a whole Sigil spell in a magazine. You pay its charge now.',
      available: (h) => { const m = h.c ? magicOf(h.c) : null; return !m?.evoker ? 'Needs an Evoker in hand.' : true; },
      preview: (h, a) => {
        const m = magicOf(h.c!)!, words = wordsOf(a.choice);
        const unk = words.find((w) => !SIGIL[w] || !m.words.includes(w)); if (!words.length || unk) return { ok: false, why: unk ? 'You don\'t know ' + unk.toUpperCase() + '.' : 'Name the spell\'s words.' };
        const ge = grammarError(words, m.maxWords); if (ge) return { ok: false, why: ge };
        const cost = smCost(m, words);
        return m.charge < cost ? { ok: false, why: 'Needs ' + cost + ' charge (' + m.charge + ' in the core).' } : { lines: ['Store ' + words.map((w) => w.toUpperCase()).join(' · ') + ' (' + cost + ' charge). It goes off on the first target a round from the magazine hits, delivered by Touch.'] };
      },
      run: (h, a) => {
        const c = h.c!, m = magicOf(c)!, words = wordsOf(a.choice), cost = smCost(m, words);
        c.evoCharge = Math.max(0, (c.evoCharge ?? m.charge) - cost); if (h.u?.mg) h.u.mg.charge = c.evoCharge;
        charState(c)[h.key] = { words, rest: restStamp(h.g) };
        const line = 'stores ' + words.map((w) => w.toUpperCase()).join(' · ') + ' in a magazine (' + cost + ' charge).';
        if (h.cb) say(h.cb, c.name + ' ' + line); else postStory(h, line, { private: true });
        return null;
      } },
    { id: 'load_spell_magazine', label: 'Load the spell magazine', scope: ['combat'], ap: (h) => (h.u ? (WEAPON[h.u.weapon] as any)?.reload_ap ?? 2 : 2), target: 'none',
      text: 'Swap in your spell magazine. The first round from it that hits sets the stored spell off on that target.',
      available: (h) => { const s = smOf(h); if (!s || s.rest !== restStamp(h.g) || !h.u) return false; return !isRanged(h.u) || W(h.u).magazine == null ? 'Needs a gun.' : stateOf(h).loaded ? 'Already loaded.' : true; },
      run: (h) => {
        const u = h.u!, cb = h.cb!, s = smOf(h)!, cap = magazineSize(u.weapon, u.mods) || 0;
        // Rules 1.9 (item 679): the old magazine drops into the pile on the tile, as a speed reload's does, empty or not.
        if (W(u).reload === 'magazine') dropToPile(cb, u.pos, [magItem(u.weapon, u.ammo, u.ammoType || null)]);
        u.ammo = cap; u.jammed = false; stateOf(h).loaded = s.words; delete charState(h.c)[h.key];
        emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: u.weapon, cat: W(u).category, how: 'mag', dur: 1200 });
        say(cb, u.name + ' slaps in the spell magazine (' + s.words.map((w) => w.toUpperCase()).join(' · ') + ').'); return null;
      } },
  ],
  on: {
    on_hit: (ctx, h) => {
      const st = h.u ? stateOf(h) : null; if (ctx.att !== h.u || !st?.loaded || ctx.melee) return;
      const words: string[] = st.loaded, cb = h.cb!, u = h.u!, t = ctx.tgt as Unit; st.loaded = null;
      const name = words.map((w) => w.toUpperCase()).join(' · '), ge = grammarError(words, 4);
      if (ge) { say(cb, 'The spell magazine\'s ' + name + ' doesn\'t hold under the new grammar (' + ge + '): nothing fires.'); return; }
      // TWICE: its missiles past the first go to the nearest creature of the right kind next to the target (castAt).
      const r = castAt(cb, rngOf(h, ctx) as any, u, words, t.pos, { victim: t, roll: false, origin: u.pos, extra: true });
      emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: 'touch', tiles: [t.pos], src: t.pos, impact: t.pos, targets: r.hit, words, element: r.spell.element, side: u.side, facing: 'touch', area: (r.plans || []).flatMap((x) => x.burst.tiles).filter((k, i, all) => all.indexOf(k) === i).concat(r.plans?.length ? [] : [t.pos]),
        missiles: (r.plans || []).map((x) => ({ origin: t.pos, kind: 'touch', path: [], blockedAt: null, impact: x.impact, arc: null, hops: [], burst: x.burst.tiles, core: x.burst.core, chain: x.chain, placed: x.placed })), placed: r.plan?.placed || null, fizzle: r.fizzle, by: 'spell_magazine' });
      say(cb, 'The spell magazine fires ' + name + ' into ' + t.name + (r.ok ? r.line : ' · it can\'t: ' + r.why) + '.');
      shiftMana(cb, 1, 'a spell round');
    },
  },
  brief: () => null,
});

// ---------- Ricochet Glyph ----------
// Once per turn, when one of your shots misses (not a fumble, not a shot cover stopped), it glances to the nearest other
// enemy within 4 tiles of the first target that the first target's tile has line of sight to: a new roll at −2, normal
// damage, no extra ammo or Heat (PROVISIONAL, audit 1-4: any ranged shot, enemies only). Toggle "Ricochet" (on by
// default) on Attack. On the area map the same.
let RICO = false;
register({
  id: 'spellslinger.ricochet_glyph', claims: 'all',
  toggles: [{ id: 'ricochet', label: 'Ricochet', on: ['combat/attack'], defaultOn: true,
    available: (h) => (!h.u || !isRanged(h.u) ? false : uses(h).left('per_turn', 1) > 0 ? true : 'Used this turn.'),
    preview: () => 'Once a turn: if this shot misses, it glances to the nearest other enemy within 4 tiles of the target, with a new roll at −2 to hit.' }],
  on: {
    attack_preview: termsHook,
    on_miss: (ctx, h) => {
      const u = h.u, cb = h.cb; if (ctx.att !== u || !u || !cb || ctx.melee || ctx.fumble || RICO || !modOn(h, 'ricochet') || !alive(u)) return;
      const first: Unit = ctx.tgt;
      const t = cb.units.filter((v) => v !== first && v.side !== u.side && alive(v) && !v.hidden && dist(v.pos, first.pos) <= 4 && lineOfSight(cb, first.pos, v.pos) && previewAttack(cb, u, v, 'shot', { free: true }).ok)
        .sort((a, b) => dist(a.pos, first.pos) - dist(b.pos, first.pos) || a.hp - b.hp)[0];
      if (!t || !uses(h).take('per_turn', 1)) return;
      say(cb, 'The round glances off toward ' + t.name + ' (Ricochet Glyph).');
      RICO = true;
      try { withTerm(u, -2, 'Ricochet Glyph', () => quiet(u, () => resolveAttack(cb, rngOf(h, ctx), u, t, 'shot', null, { free: true, noWear: true }))); } finally { RICO = false; }
    },
  },
  brief: () => null,
});

// ================================================================================================= STORM HAND

// ---------- Gauntlet Infusion ----------
// Choose an element at each rest (FIRE, FREEZE, SHOCK or SPARK: PROVISIONAL audit 1; the action, once per rest, out of
// combat). Each melee hit (weapon or unarmed) then adds +10 Elemental of it × your Elemental multiplier (half armour,
// Pain Threshold reduces it), paying 5 MP from the Emanator (no Strain, no meter: audit 6). Rules 1.5: the element's stage-1 rider rides each hit (below). Optional
// per hit: the toggle "Infusion" on Attack (on by default, audit 5). No Emanator or under 5 MP: nothing.
const INFUSE = ['fire', 'freeze', 'shock', 'spark'];
const DMG_T: Record<string, string> = { fire: 'fire', freeze: 'frost', shock: 'lightning', spark: 'lightning' };
const infusionOf = (h: Holder) => cs(h.c)['class:storm_hand.gauntlet_infusion']?.element as string | undefined;
register({
  id: 'storm_hand.gauntlet_infusion', claims: 'all',
  actions: [{
    id: 'infuse', label: 'Gauntlet Infusion', pick: ['fire', 'freeze', 'shock', 'spark'], pickLabel: 'The element', scope: ['world', 'story'], ap: 'data', uses: { per: 'per_rest', n: 1 }, target: 'none',
    text: 'Choose the element your melee hits carry until your next rest: fire, freeze, shock or spark.',
    preview: (_h, a) => (INFUSE.includes(String(a.choice || '').toLowerCase()) ? { lines: ['Infused: ' + String(a.choice).toUpperCase() + '.'] } : { ok: false, why: 'Pick fire, freeze, shock or spark.' }),
    run: (h, a) => { const el = String(a.choice).toLowerCase(); charState(h.c)[h.key] = { element: el }; const line = 'infuses the gauntlet with ' + el.toUpperCase() + '.'; if (h.cb) say(h.cb, h.c!.name + ' ' + line); else postStory(h, line, { private: true }); return null; },
  }],
  toggles: [{ id: 'infusion', label: 'Infusion', on: ['combat/attack'], defaultOn: true,
    available: (h, actx) => { const u = h.u; if (!u || !infusionOf(h)) return false; if (actx?.mode && actx.mode !== 'melee' && !isMelee(W(u))) return false; return !u.mg?.emanator ? 'Needs an Emanator in hand.' : (u.mg.mp || 0) < 5 ? 'Needs 5 MP.' : true; },
    preview: (h) => 'For 5 MP, this melee hit deals +10 ' + String(infusionOf(h)).toUpperCase() + ' damage.' }],
  on: {
    on_hit: (ctx, h) => {
      const u = h.u, el = infusionOf(h); if (ctx.att !== u || !u || !el || !ctx.melee || !modOn(h, 'infusion')) return;
      if (!u.mg?.emanator || (u.mg.mp || 0) < 5) return;
      // A hit that killed on its own: only Spark still has work (its +1 AP on a kill, 5 MP: PROVISIONAL).
      if (ctx.tgt.dead) { if (el === 'spark' && u.ap < AP_MAX) { spend(u, 'mp', 5); grantAp(h.cb, u, 1); emitFx(h.cb!, 'infusion', { unit: u.id, target: ctx.tgt.id, at: ctx.tgt.pos, element: el }); say(h.cb, 'Infusion: SPARK (5 MP) · +1 AP (Spark).'); } return; }
      spend(u, 'mp', 5);
      // Rules 1.5: the element's stage-1 rider rides the hit (PROVISIONAL): Fire Burning 1 round on a critical, else +5;
      // Shock chains to one enemy next to the target for half; Freeze Slowed (Body save); Spark +1 AP on a kill.
      const cb = h.cb!, rng = rngOf(h, ctx) as any, t = ctx.tgt, fireExtra = el === 'fire' && !ctx.crit ? itemAmount('class:storm_hand.gauntlet_infusion', 'fire_extra') : 0;
      let line = 'Infusion: ' + el.toUpperCase() + ' (5 MP)' + withElement(el, () => harm(cb, rng, u, t, (itemAmount('class:storm_hand.gauntlet_infusion', 'damage') + fireExtra) * (u.mg!.elemMult || 1), 'elemental', DMG_T[el]));
      emitFx(cb, 'infusion', { unit: u.id, target: t.id, at: t.pos, element: el });
      if (el === 'fire' && ctx.crit && !t.dead) line += withElement(el, () => applyCond(cb, rng, u, t, 'burning', 1, undefined, { skipSave: true, via: 'brain_power' }));
      if (el === 'freeze' && !t.dead) line += withElement(el, () => applyCond(cb, rng, u, t, 'slowed', undefined, undefined, { via: 'brain_power' }));
      if (el === 'shock') { const v = cb.units.find((x) => x !== t && x !== u && x.side !== u.side && alive(x) && adj(x.pos, t.pos)); if (v) { emitFx(cb, 'chain', { unit: u.id, from: t.pos, to: v.pos, target: v.id, element: 'shock' }); line += ' · it arcs to ' + v.name + withElement(el, () => harm(cb, rng, u, v, itemAmount('class:storm_hand.gauntlet_infusion', 'arc', [term(u.mg!.elemMult || 1, 'stat: elemental')]), 'elemental', DMG_T[el])); } }
      if (el === 'spark' && (t.dead || ctx.killed) && u.ap < AP_MAX) { grantAp(cb, u, 1); line += ' · +1 AP (Spark)'; }
      say(cb, line + '.');
    },
  },
  brief: () => 'the infused element\'s story uses (a SHOCK fist on a lock) are yours to rule',
});

// ---------- Charged by Battle (rules 1.5; Leon: "need to be ATTACK") ----------
// Each melee hit you land gives 1 Charge, at most 3, gone after the fight. One pool with the Emanator gauntlet's own
// charges (the 'charges' resource). A hit that Discharges spends first, then charges (priority below Discharge's).
register({
  id: 'storm_hand.charged_by_battle', claims: 'all',
  priority: -10,
  on: {
    on_hit: (ctx, h) => { const u = h.u; if (ctx.att !== u || !u || !(ctx.melee || isMelee(W(u))) || ctx.tgt.side === u.side) return; if (resGain(u, 'charges', 1)) { say(h.cb, u.name + "'s gauntlet hums: Charge " + resOf(u, 'charges') + '/3.'); emitFx(h.cb!, 'charge', { unit: u.id, at: u.pos, charges: resOf(u, 'charges') }); } },
  },
  brief: () => null,
});

// ---------- Discharge ----------
// 0 AP, declared with a melee attack (toggle "Discharge"): on a hit, spend every Charge held before the hit; each enemy
// next to the target (not the target, not you, not allies: PROVISIONAL audit 1) takes 20 Elemental per Charge × your
// Elemental multiplier. A miss keeps the Charges. A kill on the hit itself gains its Charge after the spend.
register({
  id: 'storm_hand.discharge', claims: 'all',
  toggles: [{ id: 'discharge', label: 'Discharge', on: ['combat/attack'],
    available: (h, actx) => { const u = h.u; if (!u || resOf(u, 'charges') <= 0) return false; if (actx?.mode && actx.mode !== 'melee' && !isMelee(W(u))) return false; return true; },
    preview: (h) => 'On a hit, spend all ' + resOf(h.u!, 'charges') + ' of your Charge: each enemy next to the target takes ' + 20 * resOf(h.u!, 'charges') + ' Elemental damage.' }],
  on: {
    attack_roll: (ctx, h) => { const u = h.u; if (ctx.att === u && u && (ctx.mode === 'melee' || isMelee(W(u))) && modOn(h, 'discharge')) stateOf(h).dn = resOf(u, 'charges'); },
    on_hit: (ctx, h) => {
      const u = h.u, st = u ? stateOf(h) : null; if (ctx.att !== u || !u || !st?.dn) return;
      const n = st.dn; st.dn = 0; u.res!.charges = 0; // spends them all (the hit's own Charge too: Charged by Battle runs first)
      const cb = h.cb!, rng = rngOf(h, ctx), at = ctx.tgt.pos; let line = u.name + ' discharges ' + n + ' Charge';
      // Rules 1.5: the infused element's stage-N rider (N = Charges) rides it, from the Outburst tone table; screen shake.
      const el = infusionOf(h), tone = ({ fire: 'fire', shock: 'storm', freeze: 'frost' } as Record<string, string>)[el || ''] || 'raw';
      emitFx(cb, 'explode', { at, radius: 1, what: 'discharge', element: el || null, charges: n, shake: true });
      for (const v of [...cb.units]) if (v !== ctx.tgt && v !== u && v.side !== u.side && alive(v) && adj(v.pos, at)) {
        line += withElement(el || null, () => harm(cb, rng as any, u, v, itemAmount('class:storm_hand.discharge', 'damage', [term(u.mg?.elemMult || 1, 'stat: elemental')], { charge: n }), 'elemental', DMG_T[el || 'shock'] || 'lightning'));
        if (tone !== 'raw' && !v.dead) line += withElement(el || null, () => applyToneRiders(cb, rng as any, u, v, tone, Math.min(4, n), at, ['armour_full', 'bonus_damage', 'ignore_cover', 'chain']));
      }
      say(cb, line + '.');
    },
    on_miss: (ctx, h) => { if (ctx.att === h.u && h.u) stateOf(h).dn = 0; },
  },
  brief: () => null,
});

// ========================================================================================== ADAMANTILE KNIGHT

// The Defender pieces (GAMEBREAKING fix, audit 1, PROVISIONAL): a Knight gets the Defender's Brace (2 AP: Guard
// 1 + Durability modifier, at most 5, and Braced: +2 Defense until you move), Interpose (when an adjacent ally is hit by
// an attack and you hold Guard: spend 1 Guard and your reaction to take the hit instead) and Reactive Plate (when you
// take damage, spend Guard: each point cuts 10; every 3 Guard lost sheds bots, +2 on the meter; it uses your reaction,
// except on a hit you Interposed for). A Knight who also holds the Defender's own moves uses those (lane I) instead.
const DEF_BRACE = 'class:defender.brace', DEF_PLATE = 'class:defender.reactive_plate';
let INTERPOSE: string | null = null;
/** The ally the Knight's Interpose just covered: the same attack's critical injury follows the hit to the Knight. */
let KNIGHT_COVERED: { t: string; me: string } | null = null;
function braceEnd(h: Holder, why: string) { const st = stateOf(h), u = h.u!; if (!st.braceDef) return; u.def -= 2; st.braceDef = false; say(h.cb, u.name + ' is no longer Braced (' + why + ').'); }
function bulwarkShield(h: Holder) {
  const u = h.u!, kn = h.c;
  if (!has(u, 'adamantile_knight.bulwark_of_will')) return '';
  const was = u.shield || 0, n = grantShield(h.cb!, u, itemAmount('class:adamantile_knight.bulwark_of_will', 'shield', [term(kn ? healingMult(kn) : 1, 'stat: healing given')]), u);
  if ((u.shield || 0) > was) emitFx(h.cb!, 'shield', { target: u.id, at: u.pos, absorbed: 0 });
  return ' · Bulwark of Will: shield ' + Math.max(u.shield || 0, n);
}
register({
  id: 'adamantile_knight.bulwark_of_will', claims: 'all',
  actions: [{
    id: 'brace', label: 'Brace (Guard)', scope: ['combat'], ap: 2, target: 'none',
    text: 'Gain Guard equal to your Durability points (at least 1; you hold 5 Guard at most). You are Braced, with +2 Defense, until you move. Bulwark of Will also gives you a shield of 20 × your Healing given.',
    available: (h) => (!h.u || has(h.u, DEF_BRACE) ? false : true),
    run: (h) => {
      const u = h.u!, cb = h.cb!, st = stateOf(h), n = Math.max(1, 1 + mod(h.c?.skills?.durability || 0)), got = resGain(u, 'guard', n);
      setBraced(u, true); if (!st.braceDef) { st.braceDef = true; u.def += 2; }
      emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'brace' });
      say(cb, u.name + ' braces behind the plate: +' + got + ' Guard (' + resOf(u, 'guard') + '/5), +2 Defense' + bulwarkShield(h) + '.');
      return null;
    },
  }],
  on: {
    moved: (ctx, h) => { if (ctx.u === h.u) braceEnd(h, 'moved'); },
    forced_move: (ctx, h) => { if (ctx.u === h.u && !ctx.cancel) braceEnd(h, 'knocked out of the stance'); },
    // A Knight braced by the Defender's own Brace (lane I) still gets the shield, if that Brace lands the Braced state.
    braced: (ctx, h) => { if (ctx.u === h.u && has(h.u!, DEF_BRACE)) { const line = bulwarkShield(h); if (line) say(h.cb, h.u!.name + line.replace(/^ · /, ': ') + '.'); } },
  },
  priority: 900,
  brief: () => null,
});

// ---------- Adamantile Plate (and Interpose, Reactive Plate) ----------
// When Reactive Plate spends Guard, an adjacent ally (the one with the least HP left; PROVISIONAL audit 2-3: every use,
// 10 per Guard spent, the larger shield stands) gains a shield of 10 per Guard spent (not scaled: audit 4).
function plateShare(h: Holder, k: number) {
  if (!has(h.u!, 'adamantile_knight.adamantile_plate')) return '';
  const u = h.u!, cb = h.cb!, ally = cb.units.filter((v) => v !== u && v.side === u.side && alive(v) && adj(v.pos, u.pos)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!ally) return '';
  grantShield(cb, ally, itemAmount('class:adamantile_knight.adamantile_plate', 'shield', [], { guard: k }), u); emitFx(cb, 'shield', { target: ally.id, at: ally.pos, absorbed: 0 });
  return ' · the shed plate shields ' + ally.name + ' (' + ally.shield + ')';
}
register({
  id: 'adamantile_knight.adamantile_plate', claims: 'all', priority: 60,
  on: {
    damage_in: (ctx, h) => {
      const u = h.u, cb = h.cb; if (!u || !cb || ctx.phase !== 'reduce' || ctx.dmg <= 0 || !ctx.hostile || !alive(u)) return;
      // Interpose: an adjacent ally hit by an attack.
      if (ctx.t !== u && ctx.t.side === u.side && !ctx.t.companion && ctx.src?.type === 'weapon' && adj(ctx.t.pos, u.pos) && !has(u, DEF_BRACE) && resOf(u, 'guard') >= 1 && canReact(cb, u) && !INTERPOSE) {
        const d = ctx.dmg; ctx.dmg = 0; resSpend(u, 'guard', 1); useReaction(cb, u);
        say(cb, u.name + ' interposes for ' + ctx.t.name + ' (1 Guard).');
        INTERPOSE = u.id;
        try { const r = applyDamage(cb, u, d, { ...ctx.src, shield: true }); say(cb, u.name + ' takes ' + r.amount + (u.hp === 0 ? ' · Downed' : '') + '.'); if (u.hp === 0) emitFx(cb, 'down', { unit: u.id, at: u.pos, dead: !!u.dead }); }
        finally { INTERPOSE = null; }
        KNIGHT_COVERED = { t: ctx.t.id, me: u.id };
        return;
      }
      // Reactive Plate: on the Knight.
      if (ctx.t !== u || has(u, DEF_PLATE) || resOf(u, 'guard') <= 0) return;
      if (INTERPOSE !== u.id && !ctx.src?.interposed) { if (!canReact(cb, u)) return; useReaction(cb, u); } // a hit Interposed for (either Interpose) is free
      const k = Math.min(resOf(u, 'guard'), Math.ceil(ctx.dmg / 10)); resSpend(u, 'guard', k);
      ctx.dmg = Math.max(0, ctx.dmg - 10 * k);
      const st = stateOf(h); st.lost = (st.lost || 0) + k; let line = u.name + '\'s plate hardens: ' + k + ' Guard cuts ' + 10 * k;
      while (st.lost >= 3) { st.lost -= 3; shiftMana(cb, 2, 'bots shed by Reactive Plate'); line += ' · it sheds bots (+2 on the meter)'; }
      say(cb, line + plateShare(h, k) + '.');
    },
    // A Knight who is also a rank III Defender spends Guard through the Defender's plate: the shed plate still shields.
    // The Interposed hit's critical injury goes to the Knight, not the ally (as the Defender's: audit problem 3, PROVISIONAL).
    injury: (ctx, h) => {
      const ip = KNIGHT_COVERED; if (!ip || ctx.t?.id !== ip.t || ip.me !== h.u?.id || ctx.cancel) return; KNIGHT_COVERED = null;
      ctx.cancel = true; const me = h.u!, cb: Combat = ctx.cb;
      if (!me.dead && !me.downed) say(cb, 'The blow\'s injury lands on ' + me.name + ' (Interpose)' + rollInjury(ctx.rng, me, cb, ctx.by || null) + '.');
    },
    on_hit: () => { KNIGHT_COVERED = null; }, on_miss: () => { KNIGHT_COVERED = null; },
    plate_spent: (ctx, h) => { if (ctx.u !== h.u || !has(h.u!, DEF_PLATE) || ctx.k <= 0) return; const line = plateShare(h, ctx.k); if (line) say(h.cb, h.u!.name + line.replace(/^ · /, ': ') + '.'); },
  },
  brief: () => null,
});

// ---------- Unbroken ----------
// Once per fight (the data's per_scene is the fight: audit), the first time you would drop to 0 HP from any source,
// you drop to 1 instead and gain 3 Guard (max 5). After Last Wall and Bite the Bullet (priority 30).
register({
  id: 'adamantile_knight.unbroken', claims: 'all', priority: 30,
  on: {
    damage_in: (ctx, h) => {
      const u = h.u; if (ctx.t !== u || !u || ctx.phase !== 'would_drop_to_0' || ctx.floor != null || u.hp <= 0) return;
      if (!uses(h).take('per_combat', 1)) return;
      ctx.floor = 1; const g = resGain(u, 'guard', 3);
      say(h.cb, u.name + ' is Unbroken: 1 HP, +' + g + ' Guard (' + resOf(u, 'guard') + '/5).');
    },
  },
  brief: () => null,
});

void ownTurn; void sideSees; void emit; void xy;
export type { ActionDef };
