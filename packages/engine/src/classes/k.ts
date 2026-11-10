// Lane K: the magic and shadow advanced classes: Shade, Lumeri Templar, Stroke Gambler, Devoted, Circuit Mage, Glyph
// Mason, Grand Sigilist (with the 24 Grand forms of data/sigils.json), Heartfed, Heartbinder, Vessel and Twinbound. Every
// move runs in combat (and on the area map, where magic works the same), with a story part where the audit gives one.
// What the engine can't judge goes to the Narrator (a fight note, a story pending ruling, or the brief line).
//
// Every recommended fix for a flagged design (the audit's classes.json "problems") is marked PROVISIONAL here and listed
// with its number (K1…) in the spec (section 14, tags K…) and docs/design/perk-runtime.md. Where a hook the engine lacks would
// be the clean way, the move works through what exists now and the missing hook is listed there too.
import {
  register, emit, stateOf, uses, note, has, modOn, applyDamage, grantShield, healUnit, pendRuling, postStory, holderOf,
  type Holder, type ActionDef, type ActionArgs,
} from '../effects';
import type { Combat, Unit, Term } from '../combat';
import type { Character, OutburstDesign } from '../character';
import {
  dist, alive, refOf, keyOf as refKey, xy, key, standable, lineOfSight, resolveAttack, previewAttack, isMelee, emitFx, fxFell,
  checkOver, unitSees, sideSees, objectsOf, unitFromEnemy,
} from '../combat';
import { WEAPON, SIGIL, SCHOOL, MODULE, SOUL_REV } from '../data';
import { mod, devotionXpOf, moduleSlots, packOf, maxHp, migrateDesign, checkOutburstDesign, readyDesigns } from '../character';
import {
  applyCond, condOn, endCond, harm, heal, shiftMana, drawGlyph, grammarError, findPattern, previewEvoke, planEvoke, evoke as evokeSpell,
  evokeCharge, designCost, designAp, designRange, previewOutburst, beginOutburst, releaseOutburst, stageMult, addStrain, manaBand, manaOf,
  flux as engineFlux, FLUX_MAX, CORE_CHARGE, isBoon, groundCap, glyphsPerTile, newestCondition, destroyPlaced, SIGIL_REV, MAX_GLYPHS,
  pumpOutburst, formOf, MAX_STAGE, SOUL_AP,
  type Glyph, type Pattern, type MagicUnit, type Zone, type Affected, type EvokeOpts,
} from '../magic';
import { castAt, compileSpell, evokeMarks, strokePick, tidyStrokes, fadePattern } from '../sigil';
import { d20, die } from '../rng';
import { isSilent, canReact, useReaction, blessing, PATRON, devotionOf, reveal } from '../tactics';
import { GATE, OVERREACH, DEVOTION_XP, devotionNow, patronOf, shiftDevotion } from '../faith';
import { makeObject } from '../objects';
import { asBolt, resonanceWithout } from './soul';

// =============================================================================================== helpers
type Rng = { state: number };
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const onGrid = (h: Holder) => !!h.cb && !!h.u;
const rngOf = (h: Holder, ctx?: any): Rng => ctx?.rng || h.g?.rng || { state: 1 };
const say = (cb: Combat | null | undefined, line: string) => { if (cb) cb.log.push(line); };
const unitById = (cb: Combat, id: string | null | undefined) => (id ? cb.units.find((x) => x.id === id) || null : null);
const tileOf = (cb: Combat, t?: string | null) => (!t ? null : /^-?\d+,-?\d+$/.test(t) ? t : refKey(t, cb.map));
const charState = (c: Character | null | undefined): Record<string, any> => (c ? (((c as any).state ||= {}) as Record<string, any>) : {});
/** Item state on the character without creating it (previews and stat queries must not change state). */
const cs = (c: Character | null | undefined): Record<string, any> => (c as any)?.state || {};
const sceneOf = (h: { g?: any }) => h.g?.story?.scene?.n ?? 0;
const W = (u: Unit) => WEAPON[u.weapon];
const foesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v));
const around = (k: string, r: number) => { const [x, y] = xy(k), out: string[] = []; for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push(key(x + i, y + j)); return out; };
const free = (cb: Combat, k: string, self?: Unit) => standable(cb.map, k) && !cb.units.some((v) => v !== self && !v.dead && v.pos === k) && !objectsOf(cb).some((o) => o.pos === k && /crate|pillar|barricade|low_wall|container|turret|barrel/.test(o.kind) && (o.hp == null || o.hp > 0));
/** Do something with the AP check out of the way (the AP was paid by the action): AP is put back after. */
function freeAp<T>(u: Unit, f: () => T): T { const keep = u.ap; u.ap = 99; try { return f(); } finally { u.ap = keep; } }
/** A target unit from the action's targetId, or a tile from choice/text/tile. */
const aimOf = (cb: Combat, a: ActionArgs, field: 'aim' | 'tile' = 'aim'): string | null => {
  if (field === 'tile') return tileOf(cb, a.tile);
  const t = unitById(cb, a.targetId); if (t) return t.pos;
  return tileOf(cb, a.choice && /\d/.test(a.choice) ? a.choice : a.text || null);
};
const isRobot = (u: Unit) => ['robot', 'machine', 'drone', 'turret'].includes(u.kind || '') || /drone|robot|automaton|\bbot\b|turret/i.test(u.name);
const canJam = (u: Unit) => { const w = W(u); return !!w && !isMelee(w) && !!w.heat_limit; };
const unarmed = (u: Unit, mode?: string) => { const w = W(u); return mode !== 'spell' && !!w && (w.category === 'unarmed' || (mode === 'melee' && !isMelee(w))); };
const handsEmpty = (u: Unit) => W(u)?.category === 'unarmed' && !u.offWeapon;
/** Move a unit n tiles toward (n > 0) or away from (n < 0) a tile, stopping at anything in the way. */
function nudge(cb: Combat, t: Unit, toward: string, n: number): string {
  if (t.dead || !n) return '';
  const was = t.pos; let [x, y] = xy(t.pos); const [cx, cy] = xy(toward);
  let dx = Math.sign(cx - x), dy = Math.sign(cy - y); if (n < 0) { dx = -dx; dy = -dy; } if (!dx && !dy) return '';
  let moved = 0;
  for (let i = 0; i < Math.abs(n); i++) { const k = key(x + dx, y + dy); if (!free(cb, k, t)) break; x += dx; y += dy; moved++; }
  if (!moved) return '';
  t.pos = key(x, y); emitFx(cb, 'shove', { target: t.id, from: was, to: t.pos, ok: true, magic: true });
  return ' · ' + t.name + (n > 0 ? ' is pulled' : ' is thrown') + ' to ' + refOf(t.pos);
}
/** Flux on an Evoker (the engine's own rule, magic.ts flux): over 6 the Evoker overloads. MISSING EXPORT: flux(). */
/** Flux through the engine's own rule (magic.ts flux, exported for class moves: hooks gap K1). */
const fluxUp = (cb: Combat, rng: Rng, u: Unit, n: number): string => engineFlux(cb, rng, u, n);
const sigilBlock = (cb: Combat, u: Unit): string | null => {
  const m = u.mg; if (!m || !m.evoker) return 'Needs an Evoker in hand.';
  if (m.lockRound != null && cb.round <= m.lockRound) return 'Your Evoker is locked after an overload until next round.';
  if (u.downed || u.dead) return 'Downed.'; if (condOn(u, 'silenced')) return 'Silenced: no magic this round.';
  return null;
};
/** Strain through the engine's addStrain (rules 1.5: the Mana Short is automatic at 3 over the limit, no roll). A
 * Vessel's body forms all end on a Short (K23). */
export function strainUp(cb: Combat, rng: Rng, u: Unit, n: number, why: string): string {
  const m = u.mg; if (!m || n <= 0) return '';
  const out = addStrain(cb, rng, u, n, why); // rules 1.5: the automatic Mana Short at 3 over the limit, no roll
  if (out) endForms(cb, u, 'the Mana Short');
  return out;
}
/** Range and sight for an Outburst aimed from a tile (a link's or the twin's). */
function aimFrom(cb: Combat, u: Unit, d: OutburstDesign, from: string, aim: string | null): string | null {
  if (!aim) return 'Pick a target tile.';
  const r = designRange(u.mg!, d); if (dist(from, aim) > r) return 'Out of reach (' + r + ' tiles from ' + refOf(from) + ').';
  if (!d.modules.includes('ether') && !d.modules.includes('teleport') && aim !== from && !lineOfSight(cb, from, aim)) return 'No line of sight from ' + refOf(from) + '.';
  return null;
}

// Damage multipliers a move adds to its own attack (Judgement), keyed by attacker id.
const MULTS: { att: string; v: number; label: string }[] = [];
function withMult<T>(u: Unit, v: number, label: string, g: () => T): T { const m = { att: u.id, v, label }; MULTS.push(m); try { return g(); } finally { MULTS.splice(MULTS.indexOf(m), 1); } }

// =============================================================================================== SHADE
// Silent Kill (K1, PROVISIONAL, audit 2-3): a killing blow struck from Hidden keeps you Hidden, unless it was a loud
// gunshot (a firearm with no suppressor: bows, melee and silent or suppressed guns are quiet). You don't regain the
// Ambush multiplier until you hide again (one ambush per Hidden entry, the engine's rule), and every enemy looking for
// you this round gets +2 per kill you made this round (its spot TN drops). The area map: a killing ambush from Sneak
// that leaves you Hidden and unseen by every other hostile opens no fight at all (game.ts silentTakedown). Story: the
// Narrator rules found bodies.
const loud = (u: Unit, melee = false) => { const w = W(u); return !melee && !!w && !isMelee(w) && w.category !== 'bow' && !isSilent(u); };
register({
  id: 'shade.silent_kill', claims: 'all',
  on: {
    attack_target: (ctx, h) => { if (ctx.att !== h.u || !inFight(h)) return; const st = stateOf(h); st.wasHidden = !!h.u!.hidden; st.killed = false; },
    on_kill: (ctx, h) => {
      if (ctx.by !== h.u || !inFight(h)) return; const st = stateOf(h), r = h.cb!.round;
      if (st.kr !== r) { st.kr = r; st.kn = 0; } st.kn++;
      if (st.wasHidden && ctx.src?.type === 'weapon') st.killed = true;
    },
    on_hit: (ctx, h) => {
      const u = h.u!, cb = h.cb!; if (ctx.att !== u || !inFight(h)) return; const st = stateOf(h);
      if (!st.killed) { st.wasHidden = false; return; } st.killed = false; st.wasHidden = false;
      if (u.hidden) { say(cb, u.name + ' stays in the dark (Silent Kill).'); return; }
      if (loud(u, !!ctx.melee)) { say(cb, u.name + '\'s shot is too loud to stay hidden (Silent Kill needs a quiet weapon).'); note(h, u.name + ' killed from Hidden with a loud gun: who heard it?'); return; }
      u.hidden = true; say(cb, u.name + ' kills without a sound and stays Hidden (Silent Kill; no new ambush until you hide again).');
    },
    spot: (ctx, h) => { if (ctx.u !== h.u || !inFight(h)) return; const st = stateOf(h); if (st.kr === h.cb!.round && st.kn) ctx.tn -= 2 * st.kn; },
  },
  brief: () => 'Silent Kill: rule whether a silent kill\'s body is found later, and who heard a loud shot.',
});

// Nightmare Mark (K2, PROVISIONAL, audit 1-4): a Shade who isn't an Assassin gets the Mark (1 AP, no save, 3 at most,
// the oldest lifts). A marked enemy makes a Heart save (12 + your Heart debuff strength) at the start of each of its turns
// or is Afraid of you for that turn only (the Fear ends when its turn ends). Hexer's Dread doesn't lengthen it. Bosses
// save at their tier (+3). Story: the Narrator plays a marked NPC haunted by its fear.
function markIt(h: Holder, t: Unit, rng: Rng): string {
  const u = h.u!, cb = h.cb!, st = stateOf(h);
  const list: string[] = (st.marks ||= []).filter((id: string) => { const x = unitById(cb, id); return x && !x.dead && condOn(x, 'marked') && x.condBy?.marked === u.id; });
  let lifted = '';
  if (!list.includes(t.id) && list.length >= 3) { const old = unitById(cb, list.shift()!); if (old) { endCond(old, 'marked', cb); lifted = ' (the Mark on ' + old.name + ' lifts: 3 at most)'; } }
  if (!list.includes(t.id)) list.push(t.id); st.marks = list;
  return applyCond(cb, rng, u, t, 'marked', undefined, undefined, { skipSave: true }) + lifted;
}
register({
  id: 'shade.nightmare_mark', claims: 'all',
  actions: [{
    id: 'mark', label: 'Mark (Shade)', scope: ['combat'], target: 'enemy', ap: 1,
    text: 'Mark an enemy (no save; 3 at most): your squad gets +1 to hit it, it can\'t hide, and it faces your nightmares.',
    available: (h) => (!h.u ? false : has(h.u, 'assassin.mark') ? false : true),
    run: (h, a, rng) => { const t = unitById(h.cb!, a.targetId)!; say(h.cb, h.u!.name + ' marks ' + t.name + markIt(h, t, rng) + '.'); return null; },
  }],
  on: {
    turn_start: (ctx, h) => {
      const u = h.u, t: Unit = ctx.u, cb = h.cb!; if (!u || !inFight(h) || t.side === u.side || !alive(u) || t.dead) return;
      if (!condOn(t, 'marked') || t.condBy?.marked !== u.id) return;
      const line = applyCond(cb, rngOf(h, ctx), u, t, 'fear', 1, 'heart');
      if (condOn(t, 'fear') && t.condBy?.fear === u.id) (stateOf(h).nm ||= {})[t.id] = cb.round;
      say(cb, t.name + ' sees its nightmare in ' + u.name + ' (Nightmare Mark)' + line + '.');
    },
    turn_end: (ctx, h) => {
      const u = h.u, t: Unit = ctx.u, cb = h.cb!; if (!u || !inFight(h) || t.side === u.side) return;
      const nm = stateOf(h).nm || {}; if (nm[t.id] == null) return; delete nm[t.id];
      if (condOn(t, 'fear') && t.condBy?.fear === u.id) { endCond(t, 'fear', cb); say(cb, t.name + ' shakes off the nightmare.'); }
    },
  },
  brief: () => 'Nightmare Mark: play an NPC the Shade marked as haunted by its own fear.',
});

// Lingering Dread (K3, PROVISIONAL, audit 1-4): when you kill, every enemy within 3 tiles of the victim with sight of
// the victim's tile (not Blinded) makes a Heart save or is Shaken (3 rounds). A silent kill frightens the witnesses too:
// they saw the death, not you. Story: the Narrator puts Shaken on the NPCs who saw it (conditions field).
register({
  id: 'shade.lingering_dread', claims: 'all',
  on: {
    on_kill: (ctx, h) => {
      const u = h.u, cb = h.cb!, v: Unit = ctx.victim; if (ctx.by !== u || !u || !inFight(h)) return;
      let line = '';
      for (const t of foesOf(cb, u)) {
        if (t === v || dist(t.pos, v.pos) > 3 || condOn(t, 'blinded') || !lineOfSight(cb, t.pos, v.pos)) continue;
        line += applyCond(cb, rngOf(h, ctx), u, t, 'shaken', undefined, 'heart');
      }
      if (line) say(cb, 'Dread lingers over ' + v.name + '\'s body (Lingering Dread)' + line + '.');
    },
  },
  brief: () => 'Lingering Dread: after a story kill, witnesses within 3 tiles are Shaken (put it on them).',
});

// =============================================================================================== LUMERI TEMPLAR
const blessPower = (u: Unit | null | undefined, c: Character | null | undefined) => u?.blessPower ?? 1 + 0.1 * (c?.skills?.faith || 0);
/** Is a Blessing harmful (it goes at the target) or helpful (allies next to the target)? K4: patrons.json has no
 * polarity yet; HP loss or a debuff reads as harmful, everything else helpful. */
const harmful = (bl: any) => (bl?.polarity ? bl.polarity === 'harm' : (bl?.effects || []).some((e: any) => (e.op === 'stat_mod' && e.stat === 'hp' && typeof e.value === 'number' && e.value < 0) || (e.op === 'condition' && !isBoon(e.condition || e.id || ''))));
// Blessed Shells (K4, PROVISIONAL, audit 2-6): a successful Pray with the toggle on loads the Blessing into your weapon
// (any weapon; the Pray cooldown is still paid). Your next hit resolves it: a harmful Blessing at the target, a helpful
// one on every ally next to the target (you included). It lasts until the hit or the end of the fight. Story: pray over a
// shell before a fight (the engine rolls the prayer); it loads at the start of the next fight this scene.
register({
  id: 'lumeri_templar.blessed_shells', claims: 'all',
  toggles: [{ id: 'load', label: 'Load the Blessing into your weapon (Blessed Shells)', on: ['combat/pray'], available: (h) => !!h.c?.patron }],
  actions: [{
    id: 'bless_shell', label: 'Bless a shell', scope: ['story'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Pray over a shell (by standing; above it, an overreach): on a success it carries the Hymn into this scene\'s fight.',
    available: (h) => (!h.c?.patron || !PATRON[h.c.patron] ? 'You have no patron.' : (h.c.skills.faith || 0) < 3 ? 'Prayer needs Faith 3.' : true),
    run: (h, a, rng) => {
      const c = h.c!, p = PATRON[c.patron!], bl = (p.blessings || []).find((b: any) => b.id === a.choice) || (p.blessings || [])[0];
      // Rules 1.6 (item 619): by standing (no roll) when Devotion reaches the Hymn's gate, else an overreach (a miss: −3 XP, item 716).
      const gate = (GATE as any)[bl.tier || 1] ?? 3, dv = devotionNow(c), m = mod(c.skills.faith || 0);
      const tn = dv >= gate ? 0 : OVERREACH.base + OVERREACH.step * (gate - dv), r = tn ? d20(rng as any) : 0, ok = !tn || r === 20 || (r !== 1 && r + m >= tn);
      if (!ok) shiftDevotion(h.g || null, null, c, OVERREACH.miss, 'a failed overreach');
      const line = c.name + ' prays over a shell to ' + p.name + (tn ? ': d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs ' + tn + ' (overreach)' : ' (by standing)') + (ok ? ' · ' + bl.name + ' is sealed in it.' : ' · no answer: −' + -OVERREACH.miss + ' Devotion XP.');
      if (ok) charState(c).blessedShell = { id: bl.id, scene: sceneOf(h), power: blessPower(null, c) };
      postStory(h, line); if (h.g) pendRuling(h.g, c, h.key, line + ' Describe how the patron answers (or doesn\'t).');
      return null;
    },
  }],
  on: {
    combat_start: (ctx, h) => {
      const c = h.c, u = h.u; if (!c || !u || !inFight(h)) return; const s = cs(c).blessedShell; if (!s || s.scene !== sceneOf(h)) return;
      const bl = (PATRON[c.patron || '']?.blessings || []).find((b: any) => b.id === s.id); delete charState(c).blessedShell; if (!bl) return;
      stateOf(h).loaded = { bl, power: s.power }; say(ctx.cb, u.name + ' carries a blessed shell: ' + bl.name + '.');
    },
    blessing_in: (ctx, h) => {
      if (ctx.u !== h.u || !inFight(h) || stateOf(h).resolving || !modOn(h, 'load')) return;
      stateOf(h).loaded = { bl: ctx.blessing, power: ctx.power }; ctx.handled = true; ctx.out = ' · loaded into ' + (W(h.u!)?.name || 'the weapon') + ' (Blessed Shells)';
    },
    on_hit: (ctx, h) => {
      const u = h.u!, cb = h.cb!, st = stateOf(h); if (ctx.att !== u || !inFight(h) || !st.loaded) return;
      const { bl, power } = st.loaded; delete st.loaded; st.resolving = true; const t: Unit = ctx.tgt, rng = rngOf(h, ctx);
      try {
        let line = '';
        if (harmful(bl)) line = t.dead ? ' · the target is already gone' : blessing(cb, rng, u, t, bl, power);
        else for (const x of cb.units.filter((v) => v.side === u.side && !v.dead && dist(v.pos, t.pos) <= 1)) line += blessing(cb, rng, u, x, bl, power);
        say(cb, 'The blessed shell bursts: ' + bl.name + (harmful(bl) ? ' on ' + t.name : ' on the allies around ' + t.name) + (line || ' · nobody to bless') + '.');
        if (!bl.polarity) note(h, 'Blessed Shells: ' + bl.name + ' read as ' + (harmful(bl) ? 'harmful' : 'helpful') + ' (patrons.json has no polarity); overrule if wrong.');
      } finally { st.resolving = false; }
    },
  },
  brief: () => 'Blessed Shells: rule untagged Blessings and how a shell blessed in the story behaves.',
});

// Under the Eye (K5, PROVISIONAL, audit 1-5): while you are Witnessed, allies within 3 tiles get +2 to hit (combat: the
// fight is on your patron's theme unless the Narrator says otherwise; a fight note asks). Allies pay no off-theme
// Devotion. Story: allies get +2 on checks the Narrator tags 'patron_theme' (in the scene with you).
register({
  id: 'lumeri_templar.under_the_eye', claims: 'all',
  on: {
    attack_preview: (ctx, h) => {
      const u = h.u; if (!u || !inFight(h) || ctx.att === u || ctx.att.side !== u.side || ctx.tgt.side === u.side) return;
      if (!condOn(u, 'witnessed') || !alive(u) || dist(ctx.att.pos, u.pos) > 3) return;
      ctx.terms.push({ v: 2, label: 'Under the Eye' });
    },
    on_hit: (ctx, h) => eyeNote(ctx, h), on_miss: (ctx, h) => eyeNote(ctx, h),
    // Story: another character's check the Narrator tagged on the patron's theme.
    check_mod: (ctx, h) => {
      const c: Character = ctx.c; if (!c || !h.c || c.id === h.c.id || !h.c.patron || h.c.dead) return;
      if (!(ctx.tags || ctx.ck?.tags || []).includes('patron_theme')) return;
      ctx.add.push({ add: 2, label: 'Under the Eye' });
    },
  },
  brief: () => 'Under the Eye: tag on-theme checks patron_theme while the Templar is Witnessed; rule off-theme attacks.',
});
function eyeNote(ctx: any, h: Holder) {
  const u = h.u; if (!u || !inFight(h) || ctx.att === u || ctx.att.side !== u.side || !condOn(u, 'witnessed') || dist(ctx.att.pos, u.pos) > 3) return;
  const st = stateOf(h); if (st.noted === h.cb!.round) return; st.noted = h.cb!.round;
  note(h, 'Under the Eye: allies near ' + u.name + ' got +2 to hit this round as on-theme for ' + (PATRON[h.c?.patron || '']?.name || 'the patron') + '; rule if it was off-theme.');
}

// Judgement (K6, PROVISIONAL, audit 1-5): 4 AP all told, once per fight: spend 1 Devotion (not 3: the 3 drained
// prayer and made it a once-in-3-sessions move) for one melee or shotgun attack whose damage is × (1 + Blessing power).
// The Devotion is spent hit or miss. Rules 1.6.1 (item 706): "1 Devotion" is 10 Devotion XP, through the choke point.
const shotgun = (u: Unit) => W(u)?.category === 'shotgun' || /scattergun|censer/.test(u.weapon);
register({
  id: 'lumeri_templar.judgement', claims: 'all',
  actions: [{
    id: 'judgement', label: 'Judgement', scope: ['combat'], target: 'enemy', ap: 4, uses: { per: 'per_combat', n: 1 },
    text: 'Spend 1 Devotion (' + DEVOTION_XP.judgement + ' Devotion XP): one melee or scattergun attack, damage × (1 + your Blessing power).',
    available: (h) => (!h.u || !h.c ? false : !h.c.patron ? 'You have no patron.' : devotionXpOf(h.c) < DEVOTION_XP.judgement ? 'Needs ' + DEVOTION_XP.judgement + ' Devotion XP.' : !(isMelee(W(h.u)) || shotgun(h.u)) ? 'Needs a melee weapon or a scattergun.' : true),
    preview: (h, a) => {
      const t = unitById(h.cb!, a.targetId); if (!t) return {};
      const pv = previewAttack(h.cb!, h.u!, t, isMelee(W(h.u!)) ? 'melee' : 'shot', { free: true });
      return pv.ok ? { lines: ['×' + Math.round((1 + blessPower(h.u, h.c)) * 100) / 100 + ' damage; ' + pv.pct + '% to hit.'] } : { ok: false, why: pv.why };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId)!, m = 1 + blessPower(u, h.c);
      shiftDevotion(h.g || null, cb, h.c!, -DEVOTION_XP.judgement, 'Judgement');
      say(cb, u.name + ' passes Judgement on ' + t.name + ' (' + DEVOTION_XP.judgement + ' Devotion XP; Devotion ' + devotionOf(h.c!) + ' left).');
      withMult(u, m, 'Judgement', () => resolveAttack(cb, rng, u, t, isMelee(W(u)) ? 'melee' : 'shot', null, { free: true }));
      note(h, 'Judgement by ' + u.name + ' on ' + t.name + ': does it keep or break a taboo of ' + (PATRON[h.c!.patron!]?.name || 'the patron') + '?');
      checkOver(cb); return null;
    },
  }],
  on: { damage_out: (ctx, h) => { if (ctx.att !== h.u) return; for (const m of MULTS) if (m.att === h.u!.id) ctx.mults.push({ v: m.v, label: m.label }); } },
  brief: () => 'Judgement: a dramatic moment to colour; rule a taboo it breaks.',
});

// =============================================================================================== STROKE GAMBLER
const half = (g: Glyph) => !!(g as any).half;
const halfOnly = (p: Pattern) => p.glyphs.length > 0 && p.glyphs.every(half);
let STITCHING: string | null = null;
const wordCls = (w: string) => SIGIL[w]?.class || '';
const isSubject = (w: string) => /^subject/.test(wordCls(w));
/** A non-Subject word (rules 1.4: Reach, Delivery, Burst or Filter; the 1.2 Form and Motion words). */
const isFM = (w: string) => !!SIGIL[w] && !isSubject(w);
const isReachW = (w: string) => SIGIL[w]?.group === 'reach';
/** The words of the Line or Stack a glyph of `word` on tile t would join (null when it joins none), with the refusals a
 * draw has (spec: Drawing; item 447): a second different Reach word, a second KIN, WATCH with STAY, past 4 glyphs or
 * past Max Sigil words. Pure: the glyph list is restored. */
function joinCheck(cb: Combat, u: Unit, t: string, word: string, extra: Record<string, any> = {}): string | null {
  const sid = strokePick(cb, u, t).sid; // rules 1.10: the stroke it would go into by default
  const keep = cb.glyphs || [], fake = { id: 'gl' + ((cb.glyphSeq || 0) + 1), word, pos: t, by: u.id, side: u.side, left: 1, who: u.name, v: SIGIL_REV, ...(sid ? { strokeId: sid } : {}), ...extra } as any;
  cb.glyphs = [...keep, fake]; let p: Pattern | string; try { p = findPattern(cb, t, u.pos); } finally { cb.glyphs = keep; }
  if (typeof p === 'string') return null;
  const c: Record<string, number> = {}; for (const w of p.words) c[w] = (c[w] || 0) + 1;
  if (p.words.length > Math.min(MAX_GLYPHS, u.mg?.maxWords || 2)) return 'Past your cap: ' + p.words.length + ' glyphs (Max Sigil words ' + (u.mg?.maxWords || 2) + ', ' + MAX_GLYPHS + ' at most).';
  if (Object.keys(c).filter(isReachW).length > 1) return 'A second Reach word is refused: one Reach word per spell.';
  if ((c.kin || 0) > 1) return 'KIN takes one copy.';
  if (c.watch && c.stay) return 'WATCH and STAY are refused together: a turret already lasts.';
  return null;
}
// Half-Sigil (K7, PROVISIONAL, audit 1-5; rules 1.4, item 464): 1 AP, an Evoker in hand: the engine draws a random word
// you know as a half-glyph on your own tile (rules 1.4: never on a tile next to you). GAMEBREAKING fix: a half-glyph costs
// 1 charge (not the word's; never free), and +1 Flux as normal. The Stroke Gambler's half-glyphs are the first holder of
// the two-glyph hook (sigils.json grammar.draw.two_glyph_hook; 'glyphs_per_tile'): a tile that holds one half-glyph of
// yours takes a second half-glyph (a Stack; ordinary glyphs keep one a tile, and no ordinary glyph goes on a half-glyph
// or back). The second half on a tile is drawn from the words that complete the grammar (a Subject pairs with a
// non-Subject word you know, and back), so a random pair is rarely dead. Half-glyphs also make Lines like any glyph. The
// random word is drawn only from words the draw wouldn't refuse (a second Reach word, a second KIN, WATCH with STAY,
// past your cap). Your glyphs on the ground (Max Sigil words) count them.
let HALF: string | null = null;
const halfCap = (cb: Combat, u: Unit, t: string) => { HALF = u.id; try { return glyphsPerTile(cb, u, t); } finally { HALF = null; } };
function halfPool(cb: Combat, u: Unit, t: string): string[] {
  const here = (cb.glyphs || []).filter((g) => g.pos === t), m = u.mg!;
  let pool = m.words.filter((w) => !!SIGIL[w] && !joinCheck(cb, u, t, w, { half: true }));
  if (here.length) { const fit = isSubject(here[0].word) ? pool.filter(isFM) : pool.filter(isSubject); if (fit.length) pool = fit; }
  return pool;
}
function halfWhy(cb: Combat, u: Unit, t: string | null): string | null {
  if (!t) return 'Pick a tile.';
  if (t !== u.pos) return 'Your own tile: step onto it first (rules 1.4).';
  if (!standable(cb.map, t)) return 'Nothing can be drawn there.';
  const here = (cb.glyphs || []).filter((g) => g.pos === t), cap = halfCap(cb, u, t);
  if (here.length >= cap) return cap === 1 ? 'One glyph per tile: a second half-glyph goes only on a tile holding one half-glyph of yours.' : 'This tile holds ' + cap + ' glyphs at most.';
  if (u.mg!.charge < 1) return 'Needs 1 charge: swap a core.';
  if (!halfPool(cb, u, t).length) return 'No word you know fits here (a second Reach word, KIN or WATCH with STAY would be refused).';
  return null;
}
register({
  id: 'stroke_gambler.half_sigil', claims: 'all',
  actions: [{
    id: 'half_sigil', label: 'Half-Sigil', scope: ['combat', 'world'], target: 'none', ap: 1,
    text: 'Draw a random word you know as a half-glyph on your own tile (1 charge, +1 Flux). Two on one tile make a Stack for Stitch.',
    available: (h) => (!h.u ? false : sigilBlock(h.cb!, h.u) || (!h.u.mg!.words.length ? 'You know no words.' : true)),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile') || u.pos, why = halfWhy(cb, u, t); if (why) return { ok: false, why };
      const pool = halfPool(cb, u, t), here = (cb.glyphs || []).filter((g) => g.pos === t);
      return { lines: ['A random word of ' + pool.map((w) => w.toUpperCase()).join(', ') + ' (1 charge, +1 Flux)' + (here.length ? ': it stacks on ' + here[0].word.toUpperCase() : '') + '.'] };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, m = u.mg!, t = aimOf(cb, a, 'tile') || u.pos, why = halfWhy(cb, u, t); if (why) return why;
      const pool = halfPool(cb, u, t), word = pool[die(rng as any, pool.length) - 1];
      m.charge -= 1;
      const sid = strokePick(cb, u, t).sid; // rules 1.10: a half-glyph goes into the default stroke, like any glyph
      const g: any = { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos: t, by: u.id, side: u.side, left: 2 + Math.floor(m.durBonus || 0), who: u.name, half: true, v: SIGIL_REV, ...(sid ? { strokeId: sid } : {}) };
      cb.glyphs = [...(cb.glyphs || []), g]; (cb as any).sigilV = SIGIL_REV;
      const stacks = (cb.glyphs || []).filter((x) => x.pos === t).length > 1;
      emitFx(cb, 'draw', { unit: u.id, at: u.pos, tile: t, word, side: u.side, half: true, group: SIGIL[word]?.group, cls: SIGIL[word]?.class, element: SIGIL[word]?.class === 'subject_element' ? word : null, effect: stacks ? 'stacks' : 'starts' });
      const mine = cb.glyphs.filter((x) => x.by === u.id); let faded = '';
      if (mine.length > groundCap(u)) { const old = mine[0]; cb.glyphs = cb.glyphs.filter((x) => x !== old); tidyStrokes(cb.glyphs); emitFx(cb, 'glyph_fade', { tile: old.pos, word: old.word, side: old.side, why: 'cap' }); faded = ' (' + old.word.toUpperCase() + ' at ' + refOf(old.pos) + ' fades)'; }
      say(cb, u.name + ' scratches a half-sigil at ' + refOf(t) + ': the stroke falls as ' + (SIGIL[word]?.word || word.toUpperCase()) + ' (1 charge' + (stacks ? ', a Stack' : '') + ')' + faded + '.' + fluxUp(cb, rng, u, 1));
      emit(cb, 'glyph_drawn', { u, glyph: g, cb, rng });
      return null;
    },
  }],
  on: {
    // The two-glyph hook, for half-glyphs only: a tile holding one half-glyph of yours (and nothing else) takes a second.
    glyphs_per_tile: (ctx, h) => {
      const u = h.u; if (!u || ctx.u !== u || HALF !== u.id || !h.cb) return;
      const here = (h.cb.glyphs || []).filter((g) => g.pos === ctx.tile);
      if (here.length && here.every((g) => half(g) && g.by === u.id)) ctx.n = Math.max(ctx.n || 1, 2);
    },
    // A pattern made only of half-glyphs fires only through Stitch (the gamble is not optional).
    evoke_cost: (ctx, h) => { if (STITCHING === ctx.u.id || !halfOnly(ctx.pattern) || !ctx.pattern.glyphs.some((g: Glyph) => g.by === h.u?.id)) return; ctx.fail ||= 'A half-Sigil pattern only fires through Stitch.'; },
  },
  brief: () => null,
});
/** The victim of a Stitch that goes wrong: the nearest creature on your side, you included (ties go to you). */
const backlashTarget = (cb: Combat, u: Unit) => [...cb.units.filter((v) => v.side === u.side && !v.dead)].sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos) || (a === u ? -1 : b === u ? 1 : 0))[0];
/** A Stitch's backlash (rules 1.4, item 465): the spell goes off on the victim's tile as Touch at full strength, no roll
 * (castAt): its Subjects, Burst and CHAIN as written (friendly fire), so a SPREAD backlash catches whoever stands near.
 * The spell has turned on its maker, so KIN spares no one, and what would stay (STAY, WAIT, WATCH) goes off once instead;
 * STEP finds no landing tile and does nothing. */
function backlash(cb: Combat, rng: Rng, u: Unit, v: Unit, p: Pattern): string {
  const words = p.words.filter((w) => !['kin', 'stay', 'wait', 'watch'].includes(w) && SIGIL[w]?.group !== 'reach');
  if (!words.some(isSubject)) return ' · it finds nothing to do';
  const r = castAt(cb, rng, u, words, v.pos, { origin: v.pos, roll: false, victim: v });
  return r.ok ? r.line : ' · it finds no hold (' + (r.why || 'nothing happens') + ')';
}
// Stitch (K8, PROVISIONAL, audit 1-6; rules 1.4, item 465): Evoke a pattern of half-glyphs only (a Line of them, or a
// Stack of two on one tile) by the 1.4 rules (where you stand, the facing rule, the aim), then the d20 gamble: 1-5 the
// spell lands on you or your nearest ally instead (the nearest creature on your side, you included; ties to you), 16-20
// its damage doubles (damage only: shields and heals don't), 6-15 normal. A natural 20 on the Brain Power roll stacks
// (×4). Random words that make no grammar fizzle: the glyphs fade, the Flux stays (no roll, no AP). House Edge rerolls a
// 1-5 once a fight.
register({
  id: 'stroke_gambler.stitch', claims: 'all',
  actions: [{
    id: 'stitch', label: 'Stitch', scope: ['combat', 'world'], target: 'tile', ap: 0,
    text: 'Evoke a pattern of half-glyphs and roll the gamble: 1-5 it lands on you or your nearest ally, 16-20 its damage doubles.',
    available: (h) => (!h.u ? false : sigilBlock(h.cb!, h.u) || true),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile'); if (!t) return { ok: false, why: 'Pick a glyph of the pattern.' };
      const p = findPattern(cb, t, u.pos); if (typeof p === 'string') return { ok: false, why: p };
      if (!halfOnly(p)) return { ok: false, why: 'Stitch fires a pattern made only of half-glyphs.' };
      if (grammarError(p.words, u.mg!.maxWords)) return { ap: 0, lines: ['These words make no spell: it fizzles (the glyphs fade).'] };
      STITCHING = u.id; try { const pv = previewEvoke(cb, u, t, aimOf(cb, a) || undefined, stitchOpts(cb, a)); return pv.ok ? { ap: 0, lines: [pv.ap + ' AP, ' + pv.charge + ' charge · ' + pv.targets.length + ' affected · d20: 1-5 backlash, 16-20 double damage'], ...evokeMarks(pv) } : { ok: false, why: pv.why, ...(pv.area.length ? { area: pv.area, sigil: true } : {}) }; } finally { STITCHING = null; }
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile')!, aim = aimOf(cb, a) || undefined, opts = stitchOpts(cb, a), p = findPattern(cb, t, u.pos);
      if (typeof p === 'string') return p;
      if (!halfOnly(p)) return 'Stitch fires a pattern made only of half-glyphs.';
      if (grammarError(p.words, u.mg!.maxWords)) { const ids = new Set(p.glyphs.map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !ids.has(g.id)); tidyStrokes(cb.glyphs); for (const g of p.glyphs) emitFx(cb, 'glyph_fade', { tile: g.pos, word: g.word, side: g.side, why: 'fizzle' }); say(cb, u.name + '\'s Stitch fizzles: ' + p.words.map((w) => w.toUpperCase()).join(' · ') + ' make no spell, and the strokes fade.'); return null; }
      let pv; STITCHING = u.id; try { pv = previewEvoke(cb, u, t, aim, opts); } finally { STITCHING = null; }
      if (!pv.ok) return pv.why || 'Can\'t fire that.';
      let g = d20(rng as any); const first = g;
      const he = holderOf({ u, cb }, 'stroke_gambler.house_edge');
      if (g <= 5 && he && modOn({ ...he, cb, g: h.g }, 'reroll') && uses({ ...he, cb, g: h.g }).take('per_combat', 1)) { g = d20(rng as any); say(cb, 'House Edge: ' + u.name + ' rerolls the Stitch (' + first + ' → ' + g + ').'); }
      say(cb, 'STITCH d20 ' + g + (g <= 5 ? ': it turns on its maker' : g >= 16 ? ': the house pays double' : ': it holds'));
      const st = stateOf(h);
      if (g <= 5) {
        u.ap = Math.round((u.ap - pv.ap) * 10) / 10; u.mg!.charge -= pv.charge; u.mg!.cast = true;
        fadePattern(cb, p);
        const v = backlashTarget(cb, u);
        emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: p.shape, tiles: p.tiles, src: p.tiles[0], impact: v.pos, targets: [v.id], targetAt: [v.pos], words: p.words, element: p.words.find((w) => wordCls(w) === 'subject_element') || null, side: u.side, backlash: true });
        say(cb, u.name + ' evokes ' + p.words.map((w) => w.toUpperCase()).join(' · ') + ' and the Stitch tears: it lands on ' + (v === u ? u.name + ' instead' : v.name) + backlash(cb, rng, u, v, p) + '.');
        checkOver(cb); return null;
      }
      st.double = g >= 16;
      STITCHING = u.id;
      try { const e = evokeSpell(cb, rng, u, t, aim, opts); if (e) return e; } finally { STITCHING = null; st.double = false; }
      checkOver(cb); return null;
    },
  }],
  on: {
    damage_in: (ctx, h) => {
      if (ctx.phase !== 'reduce' || ctx.src?.by !== h.u || !h.u || !stateOf(h).double) return;
      if (!['sigil', 'elemental'].includes(ctx.src.type)) return; ctx.dmg *= 2;
    },
  },
  brief: () => null,
});
/** The Evoke options a Stitch passes on (STEP's landing tile in `text`, TWICE's extra aims in `tiles`). */
function stitchOpts(cb: Combat, a: ActionArgs): EvokeOpts {
  const o: EvokeOpts = {}, dest = tileOf(cb, (a as any).dest || null); if (dest) o.dest = dest;
  const more = ((a as any).aims || []).map((x: string) => tileOf(cb, x)).filter(Boolean); if (more.length) o.aims = more;
  return o;
}
// House Edge (K9, PROVISIONAL, audit 1-2): once per fight (the data's per_scene reads per_combat, as the text says),
// reroll a Stitch roll. The reducer has no mid-action prompt, so it's a toggle on Stitch, on by default: a 1-5 is
// rerolled automatically (the new roll stands).
register({
  id: 'stroke_gambler.house_edge', claims: 'all', noDefaultActions: true,
  toggles: [{ id: 'reroll', label: 'House Edge: reroll a Stitch of 1-5 (once a fight)', on: ['combat/perk'], defaultOn: true, available: (h) => (uses(h).left('per_combat', 1) > 0 ? true : 'Used this fight.') }],
  brief: () => null,
});

// =============================================================================================== DEVOTED
const beloved = (c: Character | null | undefined, id: string | undefined) => !!id && (cs(c).beloved || []).includes(id);
const baseSlots = (c: Character) => moduleSlots(c);
/** Parse a design from the action's text: JSON {school, school2?, modules[], option?, name?} or "school: mod, mod". */
function parseDesign(text: string | undefined): Partial<OutburstDesign> | null {
  const s = String(text || '').trim(); if (!s) return null;
  try { const j = JSON.parse(s); if (j && typeof j === 'object') return j; } catch { /* plain text */ }
  const [school, rest] = s.split(/[:;]/); return { school: (school || '').trim().toLowerCase(), modules: (rest || '').split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean) };
}
/** The magic/design checks (rules 1.5, character.ts checkOutburstDesign) with a slot allowance: schools and modules
 * known, module slots + extra, a second school at Will Power 5 on the same side, one shape (Size needs one), a known
 * tone (the first free at Lore Master 1, rules 1.8), options checked; tone and option2 kept. Returns the clean design or an error. */
function checkDesign(c: Character, d: Partial<OutburstDesign> | null, extra: number, id: string): OutburstDesign | string {
  if (!d || !d.school || !SCHOOL[d.school]) return 'Name a school (and modules): "damage: burst, homing".';
  const r = checkOutburstDesign(c, d, baseSlots(c) + extra, id); if (typeof r === 'string') return r;
  if (r.learnTone) { const k = (c.soulKnown ||= { schools: [], modules: [] }); (k.tones ||= []).push(r.learnTone); }
  return r.design;
}
// Beloved Spells (K10, PROVISIONAL, audit 1-3): out of a fight (the area map or the story), mark up to 3 ready designs
// Beloved, or make a new Beloved design with one module slot more than your Module slots. A Beloved design costs 30% less
// MP (after the air's band and the Insight saving; 5 MP at least). A design using the extra slot can't be un-marked until
// it is edited down.
register({
  id: 'devoted.beloved_spells', claims: 'all',
  actions: [
    { id: 'beloved', label: 'Mark a design Beloved', pick: 'designs', pickLabel: 'The design', scope: ['world', 'story'], target: 'none', ap: 0,
      text: 'Mark or un-mark one of your ready designs as Beloved (3 at most): −30% MP, +1 module slot.',
      available: (h) => (!h.c?.outbursts?.length ? 'You have no designs.' : true),
      preview: (h, a) => {
        const c = h.c!, d = (c.outbursts || []).find((x) => x.id === a.choice); if (!d) return { ok: false, why: 'Pick a design (choice: its id).' };
        const list: string[] = cs(c).beloved || [];
        if (list.includes(d.id)) return d.modules.length > baseSlots(c) ? { ok: false, why: d.name + ' uses the Beloved slot: edit it down before un-marking it.' } : { lines: ['Un-mark ' + d.name + '.'] };
        return list.length >= 3 ? { ok: false, why: 'Three designs are Beloved already.' } : { lines: [d.name + ' becomes Beloved.'] };
      },
      run: (h, a) => {
        const c = h.c!, st = charState(c), list: string[] = (st.beloved ||= []), d = (c.outbursts || []).find((x) => x.id === a.choice)!;
        if (list.includes(d.id)) list.splice(list.indexOf(d.id), 1); else list.push(d.id);
        const line = c.name + (list.includes(d.id) ? ' holds ' + d.name + ' dear: it is Beloved.' : ' lets ' + d.name + ' be an ordinary spell again.');
        if (h.cb) say(h.cb, line); else postStory(h, line, { private: true });
        return null;
      } },
    { id: 'beloved_design', label: 'Design a Beloved spell', scope: ['world', 'story'], target: 'text', ap: 0,
      text: 'Make a Beloved design with one module more than your slots (the design itself: a school and its modules).',
      run: (h, a) => {
        const c = h.c!, list: string[] = cs(c).beloved || []; if (list.length >= 3) return 'Three designs are Beloved already.';
        if ((c.outbursts || []).length >= readyDesigns(c)) return 'Your ready designs are full: forget one first.';
        const g = h.g, d = checkDesign(c, parseDesign(a.text), 1, 'o' + (g ? ++g.seq : Date.now())); if (typeof d === 'string') return d;
        (c.outbursts ||= []).push(d); (charState(c).beloved ||= []).push(d.id);
        const line = c.name + ' shapes a Beloved spell: ' + d.name + ' (' + d.school + (d.modules.length ? ': ' + d.modules.join(', ') : '') + ').';
        if (h.cb) say(h.cb, line); else postStory(h, line, { private: true });
        return null;
      } },
  ],
  on: { outburst_cost: (ctx, h) => { if (ctx.u !== h.u || !beloved(h.c, ctx.design?.id)) return; if (ctx.mp > 0) ctx.mp = Math.max(5, ctx.mp * 0.7); } },
  brief: () => null,
});
// Heart's Own (K11, PROVISIONAL, audit 1-3; rules 1.5): while you Begin or hold a Beloved spell, your Strain limit is 2
// higher: the burn (8 a point over) and the automatic Mana Short (3 over) both count from the raised limit (one Strain
// pool: once the Beloved spell is released or let go, the plain limit is back, checked at your turn's end). MISSING
// HOOK: a 'strain' hook with the design; the limit is raised on the unit's magic while it applies.
function heartsOwn(u: Unit, on: boolean) { const m: any = u.mg; if (!m) return; const want = on ? 2 : 0, had = m.hoDelta || 0; if (want !== had) { m.strainLimit += want - had; m.hoDelta = want; } }
const holdsBeloved = (h: Holder) => !!h.u?.mg?.held && beloved(h.c, h.u.mg.held.design);
register({
  id: 'devoted.hearts_own', claims: 'all',
  on: {
    outburst_begin: (ctx, h) => { if (ctx.u === h.u) heartsOwn(h.u!, beloved(h.c, ctx.design?.id)); },
    turn_start_pre: (ctx, h) => { if (ctx.u === h.u && h.u!.mg) heartsOwn(h.u!, holdsBeloved(h)); },
    // Released or let go: the plain limit again before the turn's burn (turn_end runs before it).
    turn_end: (ctx, h) => { if (ctx.u === h.u && h.u!.mg) heartsOwn(h.u!, holdsBeloved(h)); },
  },
  brief: () => null,
});
// Love Made Manifest (K12, PROVISIONAL, audit 1-4; rules 1.5): once per fight, a toggle on Begin: a Beloved Outburst
// Begins at stage 4, the heart full at once (×2.2 and the tone's stage-4 rider; a snap cast releases at stage 4). Its
// Begin Strain is paid as usual. 1.2's ×3 is gone: on 1.5's stage table it would reach ×6.6 (item 527).
register({
  id: 'devoted.love_made_manifest', claims: 'all', priority: 200,
  toggles: [{ id: 'manifest', label: 'Love Made Manifest (Begins at stage 4, once a fight)', on: ['combat/outburst'],
    available: (h) => (uses(h).left('per_combat', 1) <= 0 ? 'Used this fight.' : true), preview: () => 'A Beloved Outburst Begins at stage 4.' }],
  on: {
    outburst_begin: (ctx, h) => {
      if (ctx.u !== h.u || !beloved(h.c, ctx.design?.id) || !modOn(h, 'manifest')) return;
      if (!uses(h).take('per_combat', 1)) return;
      stateOf(h).manifest = ctx.design.id;
    },
    // The held Outburst exists by the Begin's Strain (magic.ts beginOutburst): fill it there, before a snap releases.
    strain: (ctx, h) => {
      const st = stateOf(h), m = h.u?.mg; if (ctx.u !== h.u || ctx.why !== 'begin' || !st.manifest || !m?.held || m.held.design !== st.manifest) return;
      st.manifest = null; m.held.stage = MAX_STAGE;
      emitFx(ctx.cb, 'pump', { unit: h.u!.id, at: h.u!.pos, stage: MAX_STAGE, mult: stageMult(MAX_STAGE), free: true, max: true, tone: m.held.tone || 'raw', manifest: true });
      say(ctx.cb, 'Love made manifest: the heart is full at once (stage ' + MAX_STAGE + ').');
    },
  },
  brief: () => null,
});

// =============================================================================================== CIRCUIT MAGE
// Closed Loop (K13, PROVISIONAL, audit 1-5): a second Vent (1 AP): your Emanator takes the Flux at 10 MP per Flux (to
// your Max MP) instead of the air, and the meter doesn't rise. The ordinary Vent stays, so the meter can still be raised
// on purpose. An overload still bursts into the air (it isn't a Vent).
register({
  id: 'circuit_mage.closed_loop', claims: 'all',
  actions: [{
    id: 'vent_heart', label: 'Vent into your heart (Closed Loop)', scope: ['combat', 'world'], target: 'none', ap: 1,
    text: 'Vent your Flux into your own Emanator at 10 MP per Flux; the air takes nothing.',
    available: (h) => { const m = h.u?.mg; return !h.u ? false : !m?.evoker ? 'Needs an Evoker in hand.' : !m.emanator ? 'Needs an Emanator in hand.' : !m.flux ? 'No Flux to vent.' : true; },
    preview: (h) => { const m = h.u!.mg!; return { lines: [m.flux + ' Flux → +' + Math.min(m.mpMax - m.mp, 10 * m.flux) + ' MP (' + m.mp + '/' + m.mpMax + ').'] }; },
    run: (h) => {
      const u = h.u!, m = u.mg!, n = m.flux, was = m.mp; m.mp = Math.min(m.mpMax, m.mp + 10 * n); m.flux = 0;
      emitFx(h.cb!, 'vent', { unit: u.id, at: u.pos, flux: n, heart: true });
      say(h.cb, u.name + ' closes the loop: ' + n + ' Flux runs into the heart (+' + (m.mp - was) + ' MP, ' + m.mp + '/' + m.mpMax + '); the air takes nothing.');
      return null;
    },
  }],
  brief: () => 'Closed Loop: NPC Sigil users who see a vent that never reaches the air may notice.',
});
// Self-Crystallise (K14, PROVISIONAL, audit 1-4): 3 AP (or out of a fight): 100 MP from your own Emanator makes one
// standard core, whatever the meter. GAMEBREAKING fix: at most Virtue cores a long rest, and self-made cores can't be
// sold (they're counted in c.state.selfCores; MISSING: the shop must refuse them).
const selfCap = (c: Character | null | undefined) => Math.max(1, c?.attrs?.virtue || 1);
const selfLeft = (h: Holder) => uses(h).left('per_rest', selfCap(h.c), h.key + '#cores');
register({
  id: 'circuit_mage.self_crystallise', claims: 'all',
  actions: [
    { id: 'self_crystallise', label: 'Self-Crystallise', scope: ['combat', 'world'], target: 'none', ap: 3,
      text: 'Spend 100 MP from your Emanator to make one standard core, ignoring the meter (Virtue cores a long rest; they can\'t be sold).',
      available: (h) => { const m = h.u?.mg; return !h.u ? false : !m?.emanator ? 'Needs an Emanator in hand.' : m.mp < 100 ? 'Needs 100 MP (' + Math.floor(m.mp) + ').' : selfLeft(h) <= 0 ? 'Virtue (' + selfCap(h.c) + ') cores this rest already.' : true; },
      run: (h) => {
        const u = h.u!, m = u.mg!; if (!uses(h).take('per_rest', selfCap(h.c), h.key + '#cores')) return 'Virtue cores this rest already.';
        m.mp -= 100; m.coresMade++; const st = charState(h.c); st.selfCores = (st.selfCores || 0) + 1;
        emitFx(h.cb!, 'crystallise', { unit: u.id, at: u.pos, dur: 1400, self: true });
        say(h.cb, u.name + ' crystallises a core from their own heart (−100 MP, ' + Math.floor(m.mp) + ' left).');
        return null;
      } },
    { id: 'self_crystallise_story', label: 'Self-Crystallise', scope: ['story'], target: 'none', ap: 0,
      text: 'Spend 100 MP to make one standard core (Virtue cores a long rest; they can\'t be sold).',
      available: (h) => (!h.c ? false : (h.c.mp ?? 0) < 100 ? 'Needs 100 MP.' : selfLeft(h) <= 0 ? 'Virtue cores this rest already.' : true),
      run: (h) => {
        const c = h.c!; if (!uses(h).take('per_rest', selfCap(c), h.key + '#cores')) return 'Virtue cores this rest already.';
        c.mp = (c.mp ?? 0) - 100; const pack = packOf(c).map((x) => ({ ...x })), it = pack.find((x) => (x.item || x.id) === 'standard_core');
        if (it) it.qty += 1; else pack.push({ id: 'standard_core', item: 'standard_core', name: 'Standard mana core', qty: 1, kind: 'ammo' } as any);
        c.pack = pack; const st = charState(c); st.selfCores = (st.selfCores || 0) + 1;
        postStory(h, c.name + ' crystallises a mana core from their own heart.');
        if (h.g) pendRuling(h.g, c, h.key, c.name + ' made a core from their own MP: a pile of self-made cores is conspicuous; do the Celestials notice?');
        return null;
      } },
  ],
  brief: () => 'Self-Crystallise: self-made cores can\'t be sold; a pile of them draws Celestial eyes.',
});
// Fusion (K15, PROVISIONAL, audit 1-5: Leon's sign-off needed; rules 1.4, item 466): draw a Line of only non-Subject
// words (Reach, Delivery, Burst, Filter: no Subject) and fire it with a ready Outburst in the Subject's place. The
// Outburst counts toward the spell's 4 words (so a Fusion Line holds 3 glyphs at most) but not toward Max Sigil words or
// the charge. The 1.4 rules deliver it exactly as they would a Sigil Subject (planEvoke with opts.subject): where you
// stand and the facing rule set the area, the Reach word where you may aim (and its ×0.8 / ×0.6), the Burst what it
// covers (and its multipliers), TWICE more missiles, CHAIN its jumps, KIN who is spared, PULL drags each one it reached
// toward you afterwards, LEECH heals you from the Outburst's damage. STAY, WAIT and WATCH are refused: no standing
// Outbursts. Every creature the plan affects takes the Outburst's school as a Bolt (its own shape is the Sigil's now)
// at stage 0 (rules 1.5: a snap, ×0.6; or its held stage: Begin and Pump first, then fuse it), at the plan's
// multiplier for that creature. You pay everything a normal pattern costs (the draws, then the Evoke's AP and charge)
// plus the Outburst's MP, Soul cast AP and Strain, plus +1 Strain and +2 Flux. Every Fusion is a fight note for the
// Narrator (a Knowing risk).
let FUSION: { u: string; mult: number } | null = null;
/** The stand-in Subject the plan reads: a Boon for a buff design (allies are its natural targets), else an Affliction. */
const fusionStandIn = (d: OutburstDesign) => (d.school === 'buff' ? 'ward' : 'blind');
const STANDING = ['stay', 'wait', 'watch'];
function fusionCheck(h: Holder, a: ActionArgs): { ok: false; why: string } | { ok: true; p: Pattern; d: OutburstDesign; aim: string | null; ap: number; charge: number; held: boolean; cost: number; strain: number; plan: ReturnType<typeof planEvoke> } {
  const u = h.u!, cb = h.cb!, m = u.mg; const no = (why: string) => ({ ok: false as const, why });
  if (!m?.evoker || !m.emanator) return no('Fusion needs an Evoker and an Emanator in hand.');
  const sb = sigilBlock(cb, u); if (sb) return no(sb);
  const t = aimOf(cb, a, 'tile'); if (!t) return no('Pick a glyph of the pattern.');
  const p = findPattern(cb, t, u.pos); if (typeof p === 'string') return no(p);
  if (p.words.some(isSubject)) return no('A Fusion takes only Form and Motion words, the non-Subjects (Reach, Delivery, Burst, Filter): the Outburst is its Subject.');
  if (p.words.some((w) => STANDING.includes(w))) return no('No standing Outbursts: STAY, WAIT and WATCH can\'t carry one.');
  if (p.words.length >= MAX_GLYPHS) return no('The Outburst takes a word\'s place: a Fusion Line holds ' + (MAX_GLYPHS - 1) + ' glyphs at most.');
  const held = !!m.held && (!a.choice || a.choice === m.held.design);
  const d = m.designs.find((x) => x.id === (held ? m.held!.design : a.choice)); if (!d) return no('Pick a ready design (choice: its id).');
  if (m.held && !held) return no('You are holding another Outburst: fuse that one, or release it first.');
  const aim = aimOf(cb, a), pl = planEvoke(cb, u, t, aim || undefined, { ...stitchOpts(cb, a), subject: fusionStandIn(d) });
  if (!pl.ok) return no(pl.why || 'Can\'t fire that.');
  let ap = pl.ap, cost = 0, strain = 1;
  if (!held) { const pv = previewOutburst(cb, u, d.id, undefined, false); if (!pv.ok) return no(pv.why || 'Can\'t cast that.'); ap += pv.ap; cost = pv.cost; strain += pv.strain; }
  if (u.ap < ap) return no('Needs ' + ap + ' AP.');
  return { ok: true, p, d, aim, ap, charge: pl.charge, held, cost, strain, plan: pl };
}
register({
  id: 'circuit_mage.fusion', claims: 'all',
  actions: [{
    id: 'fusion', label: 'Fusion', scope: ['combat', 'world'], target: 'tile', ap: (h, a) => { const r = h.u && h.cb ? fusionCheck(h, a) : null; return r && r.ok ? r.ap : 1; },
    text: 'Fire a Line of non-Subject words (Reach, Delivery, Burst, Filter) with an Outburst as its Subject: both costs, +1 Strain, +2 Flux. Celestials notice.',
    available: (h) => (!h.u ? false : !h.u.mg?.evoker || !h.u.mg.emanator ? 'Needs an Evoker and an Emanator in hand.' : true),
    preview: (h, a) => {
      const r = fusionCheck(h, a); if (!r.ok) return { ok: false, why: r.why };
      const live = r.plan.affected.filter((x) => !x.kinSpared && !x.skipped);
      return { ap: r.ap, lines: [r.d.name + ' through ' + r.p.words.map((w) => w.toUpperCase()).join(' · ') + ': ' + r.ap + ' AP, ' + r.charge + ' charge, ' + r.cost + ' MP, +' + r.strain + ' Strain, +2 Flux.',
        live.length ? 'It reaches ' + live.map((x) => x.name + ' ×' + x.mult).join(', ') + '.' : 'Nothing it may affect: it will fizzle.'], ...evokeMarks(r.plan), targets: [...new Set(live.map((x) => x.unit))] };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, m = u.mg!, r = fusionCheck(h, { ...a }); if (!r.ok) return r.why;
      // The runtime took r.ap (the Evoke's and the Outburst's); the Outburst's own AP is paid inside it, so it runs free.
      const pl = r.plan, sp = pl.spell!, name = r.p.words.map((w) => w.toUpperCase()).join(' · ');
      m.charge -= r.charge; m.cast = true;
      fadePattern(cb, r.p);
      emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: r.p.shape, tiles: r.p.tiles, words: r.p.words, element: null, side: u.side, facing: pl.facing?.mode, dir: pl.facing?.dir, area: pl.area,
        src: pl.missiles[0]?.origin, impact: pl.missiles[0]?.impact ?? null, targets: pl.targets, targetAt: pl.targets.map((id) => unitById(cb, id)?.pos), fusion: r.d.id,
        missiles: pl.missiles.map((x) => ({ origin: x.origin, kind: x.kind, path: x.path, blockedAt: x.blockedAt, impact: x.impact, arc: x.arc, hops: x.hops, burst: x.burst.tiles, core: x.burst.core, chain: x.chain, placed: null })) });
      // Rules 1.5: a fresh Outburst is fused at stage 0 (a snap, ×0.6); a held one at the stage it reached (item 528).
      let stage = m.held?.stage ?? 0, cost = m.held?.cost || 0;
      if (!r.held) {
        const e = freeAp(u, () => beginOutburst(cb, rng, u, r.d.id, undefined, true)); if (e) return e;
        stage = m.held?.stage ?? 0; cost = m.held?.cost || 0;
      }
      say(cb, u.name + ' fuses ' + r.d.name + ' into ' + name + ' (' + (r.p.shape === 'stack' ? 'a Stack' : 'a Line of ' + r.p.tiles.length + ', ' + (pl.facing?.mode || '')) + ', ' + r.charge + ' charge).' + fluxUp(cb, rng, u, 2));
      strainUp(cb, rng, u, 1, 'Fusion');
      if (u.dead || u.downed || !m.held) return null;
      const live: Affected[] = pl.affected.filter((x) => !x.kinSpared && !x.skipped);
      for (const x of pl.affected.filter((y) => y.kinSpared)) say(cb, 'KIN spares ' + x.name + ' from the Fusion.');
      if (!live.length) { m.held = null; say(cb, 'The Fusion strikes ' + (pl.impact ? refOf(pl.impact) : 'nothing') + ' and finds no one: it fizzles.'); }
      let dealt = 0; const done = new Set<string>();
      for (const x of live) {
        const t = unitById(cb, x.unit); if (!t || t.dead || done.has(t.id + ':' + x.missile + ':' + (x.jump || 0))) continue; done.add(t.id + ':' + x.missile + ':' + (x.jump || 0));
        if (x.via === 'chain') emitFx(cb, 'chain', { from: pl.missiles[x.missile]?.chain[(x.jump || 1) - 1]?.from, to: t.pos, target: t.id, jump: x.jump, mult: x.mult, element: null });
        m.held = { design: r.d.id, stage, cost, v: SOUL_REV };
        const hp0 = t.hp + (t.shield || 0);
        FUSION = { u: u.id, mult: x.mult };
        // The Sigil decides who is reached: each one takes the Outburst as a Bolt (its own shape would add its area again).
        const dd = m.designs.find((y) => y.id === r.d.id) || r.d;
        try { asBolt(u, dd, () => freeAp(u, () => releaseOutburst(cb, rng, u, t.pos))); } finally { FUSION = null; }
        if (t.side !== u.side) dealt += Math.max(0, hp0 - (t.hp + (t.shield || 0)));
      }
      m.held = null;
      // PULL: each one it reached is dragged toward you afterwards (the plan's tiles); LEECH heals you from the damage.
      for (const mp of pl.missiles) for (const pu of mp.pull) { const t = unitById(cb, pu.unit); if (t && !t.dead) { const l = nudge(cb, t, u.pos, sp.pull); if (l) say(cb, 'PULL' + l + '.'); } }
      if (sp.leech && dealt > 0 && !u.dead) { const n = Math.floor(dealt * sp.leech), hr = healUnit(cb, u, n, u, 'leech'); emitFx(cb, 'leech', { unit: u.id, to: u.pos, from: pl.missiles.map((x) => x.impact), amount: hr.restored, element: null }); say(cb, u.name + ' drinks ' + hr.restored + ' HP from the Fusion (LEECH).'); }
      note(h, 'FUSION seen: ' + u.name + ' joined ' + name + ' to ' + r.d.name + '. Does a Celestial take an interest? (a Knowing risk)');
      checkOver(cb); return null;
    },
  }],
  on: { outburst_release: (ctx, h) => { if (ctx.u !== h.u || !FUSION || FUSION.u !== h.u!.id) return; ctx.mult *= FUSION.mult; } },
  brief: () => 'Fusion: each one seen by NPCs is a Knowing risk; decide whether a Celestial takes an interest.',
});

// =============================================================================================== GLYPH MASON
const KS = (u: Unit) => 'ks-' + u.id;
const ksOf = (cb: Combat, u: Unit) => (cb.glyphs || []).find((g) => g.id === KS(u)) || null;
const ksOwner = (g: Glyph) => (g.id.startsWith('ks-') ? g.id.slice(3) : null);
// Keystone (K16, PROVISIONAL, audit 1-5; rules 1.4, item 467): 2 AP + 1 standard core (the core replaces the word's
// charge; +1 Flux still, it's a glyph), cut on your own tile (rules 1.4: never next to you) where no glyph lies (one a
// tile), an Evoker ready (the mason's chisel item doesn't exist yet: any Evoker cuts). The draw's refusals hold (a second
// Reach word, a second KIN, WATCH with STAY, past 4 glyphs or your Max Sigil words in the Line it joins). It counts as a
// glyph of the Line it sits in, never fades, can't be scuffed (the engine puts it back), isn't wiped by NULL (item 430),
// doesn't count toward your glyphs on the ground, and survives being Evoked (sigil.ts honours the glyph's keystone flag
// in the fade, Scuff, NULL and Evoke; the restore at turn and round boundaries stays as a guard). One at a time. It stays
// in that map zone for the session.
function ksRestore(h: Holder) {
  const u = h.u, cb = h.cb, c = h.c; if (!u || !cb || !c) return;
  const s = cs(c).keystone; if (!s) return;
  if (s.zone !== cb.map.id || (s.session ?? 1) !== (h.g?.sessionN ?? 1)) return;
  const left = 2 + Math.floor(u.mg?.durBonus || 0), g = ksOf(cb, u);
  if (g && (g as any).strokeId) { g.left = left; g.pos = s.pos; g.word = s.word; (g as any).v = SIGIL_REV; return; }
  // A Keystone cut before rules 1.10 has no stroke: it is taken up and set again, so it joins a stroke like a new one.
  if (g) cb.glyphs = (cb.glyphs || []).filter((x) => x !== g);
  // Rules 1.10: a Keystone is a stroke anchor: it goes into the default stroke where it is cut (or starts its own).
  const pk = strokePick(cb, u, s.pos), sid = pk.sid === 'sgl' + ((cb.glyphSeq || 0) + 1) ? 's' + KS(u) : pk.sid;
  cb.glyphs = [...(cb.glyphs || []), { id: KS(u), word: s.word, pos: s.pos, by: 'ks:' + u.id, side: u.side, left, who: u.name, keystone: true, v: SIGIL_REV, ...(sid ? { strokeId: sid } : {}) } as any];
}
function ksWhy(cb: Combat, u: Unit, t: string | null, w: string): string | null {
  if (!SIGIL[w] || !u.mg!.words.includes(w)) return 'Pick a word you know (choice).';
  if (!t) return 'Pick a tile.'; if (t !== u.pos) return 'Cut it on your own tile (rules 1.4): step onto it first.';
  if (!standable(cb.map, t)) return 'Nothing can be cut there.';
  const here = (cb.glyphs || []).filter((g) => g.pos === t && g.id !== KS(u));
  if (here.length >= glyphsPerTile(cb, u, t)) return 'One glyph per tile: this tile already holds ' + here.map((g) => g.word.toUpperCase()).join(', ') + '.';
  const old = ksOf(cb, u), keep = cb.glyphs; if (old) cb.glyphs = (cb.glyphs || []).filter((g) => g !== old);
  try { return joinCheck(cb, u, t, w, { keystone: true }); } finally { cb.glyphs = keep; }
}
register({
  id: 'glyph_mason.keystone', claims: 'all',
  actions: [{
    id: 'keystone', label: 'Cut a Keystone', pick: 'words', pickLabel: 'The word', scope: ['combat', 'world'], target: 'none', ap: 2,
    text: 'Cut a word you know as a Keystone on your own tile (2 AP + 1 spare core): it never fades, can\'t be scuffed and survives being Evoked. One at a time.',
    available: (h) => (!h.u ? false : sigilBlock(h.cb!, h.u) || (h.u.mg!.cores < 1 ? 'Needs a spare standard core.' : true)),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile') || u.pos, w = a.choice || '', why = ksWhy(cb, u, t, w); if (why) return { ok: false, why };
      return { lines: [SIGIL[w].word + ' cut at ' + refOf(t) + (ksOf(cb, u) ? ' (the old Keystone is lost)' : '') + ' (1 core, +1 Flux).'] };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile') || u.pos, w = a.choice!, why = ksWhy(cb, u, t, w); if (why) return why;
      const old = ksOf(cb, u);
      cb.glyphs = (cb.glyphs || []).filter((g) => g.id !== KS(u)); u.mg!.cores -= 1; (cb as any).sigilV = SIGIL_REV;
      charState(h.c).keystone = { word: w, pos: t, zone: cb.map.id, session: h.g?.sessionN ?? 1 };
      ksRestore(h);
      emitFx(cb, 'draw', { unit: u.id, at: u.pos, tile: t, word: w, side: u.side, keystone: true, group: SIGIL[w]?.group, cls: SIGIL[w]?.class, element: SIGIL[w]?.class === 'subject_element' ? w : null });
      if (old && old.pos !== t) emitFx(cb, 'glyph_fade', { tile: old.pos, word: old.word, side: old.side, why: 'keystone' });
      say(cb, u.name + ' cuts ' + SIGIL[w].word + ' into ' + refOf(t) + ' as a Keystone (1 core)' + (old ? '; the old Keystone at ' + refOf(old.pos) + ' crumbles' : '') + '.' + fluxUp(cb, rng, u, 1));
      const g = ksOf(cb, u); if (g) emit(cb, 'glyph_drawn', { u, glyph: g, cb, rng });
      return null;
    },
  }],
  on: {
    combat_start: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }), round_start: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }),
    turn_start: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }), turn_end: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }),
    moved: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }), glyph_cost: (ctx, h) => { if (!ctx.preview) ksRestore({ ...h, cb: ctx.cb }); },
    on_hit: (ctx, h) => ksRestore({ ...h, cb: ctx.cb }),
  },
  brief: () => 'Keystone: NPC Sigil users can read a cut glyph (Analysis TN 12) and Evoke a pattern holding it.',
});
// Survey (K17, PROVISIONAL, audit 1-3; rules 1.4, item 467): a Line (or Stack) that holds your Keystone costs 1 charge
// less to fire (1 at least) for you and your allies, and you and your allies can Evoke it from up to 2 tiles from any of
// its glyphs, with sight of one (the 'evoke_reach' hook; the plain Evoke reaches it, the Class tab's action is the
// explicit form). The facing rule reads from where you stand: further along the Line than an end, it fires along, past
// the far end; beside it, across and away from you; a middle glyph is still refused. Enemy Sigil users who fire it get
// neither.
function surveyWhy(cb: Combat, u: Unit, tile: string): string | null {
  const p = findPattern(cb, tile, u.pos); if (typeof p === 'string') return p;
  if (!p.glyphs.some((g) => g.id === KS(u))) return 'Survey reaches only a pattern that holds your Keystone.';
  if (!p.tiles.some((k) => dist(u.pos, k) <= 2)) return 'Within 2 tiles of a glyph of the pattern.';
  if (!p.tiles.some((k) => dist(u.pos, k) <= 1 || (dist(u.pos, k) <= 2 && lineOfSight(cb, u.pos, k)))) return 'You can\'t see the pattern.';
  return null;
}
register({
  id: 'glyph_mason.survey', claims: 'all',
  actions: [{
    id: 'survey_evoke', label: 'Evoke from afar (Survey)', scope: ['combat', 'world'], target: 'tile', ap: 0,
    text: 'Evoke a pattern that holds your Keystone from up to 2 tiles away (1 charge less).',
    available: (h) => (!h.u ? false : sigilBlock(h.cb!, h.u) || (!ksOf(h.cb!, h.u) ? 'Cut a Keystone first.' : true)),
    preview: (h, a) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile'); if (!t) return { ok: false, why: 'Pick a glyph of the pattern.' };
      const why = surveyWhy(cb, u, t); if (why) return { ok: false, why };
      const pv = previewEvoke(cb, u, t, aimOf(cb, a) || undefined, stitchOpts(cb, a));
      return pv.ok ? { lines: [pv.ap + ' AP, ' + pv.charge + ' charge (Survey: −1), firing ' + (pv.facing?.mode || '') + ' from ' + refOf(u.pos) + '.'], ...evokeMarks(pv) } : { ok: false, why: pv.why, ...(pv.area.length ? { area: pv.area, sigil: true } : {}) };
    },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile'); if (!t) return 'Pick a glyph of the pattern.';
      const why = surveyWhy(cb, u, t); if (why) return why;
      const e = evokeSpell(cb, rng, u, t, aimOf(cb, a) || undefined, stitchOpts(cb, a));
      if (e) return e; ksRestore(h); checkOver(cb); return null;
    },
  }],
  on: {
    evoke_cost: (ctx, h) => {
      const u = h.u; if (!u || !ctx.pattern?.glyphs?.some((g: Glyph) => g.id === KS(u)) || ctx.u.side !== u.side) return;
      ctx.charge = Math.max(1, ctx.charge - 1);
    },
    // The reach: you and your allies fire a pattern holding your Keystone from up to 2 tiles (with sight of it).
    evoke_reach: (ctx, h) => { const u = h.u; if (!u || ctx.u.side !== u.side || !ctx.pattern?.glyphs?.some((g: Glyph) => g.id === KS(u))) return; ctx.reach = Math.max(ctx.reach, 2); },
  },
  brief: () => null,
});
// Foundation (K18, PROVISIONAL, audit 1-3; rules 1.4, item 467): once per scene, 0 AP: for the rest of this turn,
// glyphs you draw within 2 tiles of your Keystone cost 0 AP (charge and Flux still paid). You still draw only on your own
// tile, so it prices the steps of a Line walked around the Keystone. The 'glyph_cost' hook now carries the tile, so the
// ordinary Draw gets it; the "Draw near the Keystone" action stays as the explicit form.
const foundOn = (h: Holder) => { const st = stateOf(h); return !!h.cb && st.found === h.cb.round + '.' + h.cb.turn; };
register({
  id: 'glyph_mason.foundation', claims: 'all',
  actions: [
    { id: 'foundation', label: 'Foundation', scope: ['combat', 'world'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'This turn, glyphs you draw within 2 tiles of your Keystone cost 0 AP.',
      available: (h) => (!h.u ? false : !ksOf(h.cb!, h.u) ? 'Cut a Keystone first.' : foundOn(h) ? 'Already laid this turn.' : true),
      run: (h) => { stateOf(h).found = h.cb!.round + '.' + h.cb!.turn; say(h.cb, h.u!.name + ' lays the Foundation: glyphs near the Keystone cost no AP this turn.'); return null; } },
    { id: 'foundation_draw', label: 'Draw near the Keystone (0 AP)', pick: 'words', pickLabel: 'The word', scope: ['combat', 'world'], target: 'none', ap: 0,
      text: 'Draw a word on your own tile, within 2 tiles of your Keystone, for 0 AP (charge and Flux paid).',
      available: (h) => (!h.u || !h.cb ? false : foundOn(h) && ksOf(h.cb, h.u) ? true : false),
      preview: (h, a) => {
        const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile') || u.pos, ks = ksOf(cb, u); if (!ks) return { ok: false, why: 'Cut a Keystone first.' };
        if (t !== u.pos) return { ok: false, why: 'Draw on your own tile (rules 1.4).' };
        if (dist(t, ks.pos) > 2) return { ok: false, why: 'Within 2 tiles of the Keystone.' };
        if (!a.choice || !u.mg!.words.includes(a.choice)) return { ok: false, why: 'Pick a word you know (choice).' };
        return {};
      },
      run: (h, a, rng) => { const u = h.u!, cb = h.cb!, ks = ksOf(cb, u); if (!ks || dist(u.pos, ks.pos) > 2) return 'Within 2 tiles of the Keystone.'; return drawGlyph(cb, rng, u, a.choice!, u.pos); } },
  ],
  on: { glyph_cost: (ctx, h) => { const u = h.u; if (ctx.u !== u || !u || !h.cb || !foundOn({ ...h, cb: ctx.cb || h.cb })) return; const ks = ksOf(ctx.cb || h.cb, u); if (ks && dist(ctx.tile || u.pos, ks.pos) <= 2) ctx.ap = 0; } },
  brief: () => null,
});

// =============================================================================================== GRAND SIGILIST
// Enlarge (K19, PROVISIONAL, audit 1-11): once per fight, 3 AP + 3 charge: plant the staff on your tile or one next to
// you and enlarge a word you know into its Grand form over radius 2 for 3 rounds + your Sigil duration bonus. No Flux.
// While the staff stands you can't draw or Evoke; pulling it out (1 AP, next to it) ends the form, and the staff comes
// back when the form runs out. Grand damage is flat (10 lava, 15 storm). Harmful forms hit everyone inside but you
// (Earthed); the ones that say enemies or allies keep to them. The staff item doesn't exist yet (any Evoker plants).
// The forms (sigils.json 'grand': the 23 that survive 1.2, RETURN's Sanctuary gone, and the 17 words new in 1.4) run on
// the hooks below. The Grand form pass (decision log, spec items 582-586) gave each new word its own job, and SPREAD,
// TWICE, CONDENSE and PUSH forms the engine runs (no more Narrator rulings for Bloom and the Echo field).
const grandZones = (cb: Combat, u?: Unit) => (cb.zones || []).filter((z) => (z.kind as string) === 'grand' && (!u || z.by === u.id));
const inZ = (z: Zone, k: string) => z.tiles.includes(k);
const zWord = (z: Zone) => z.words[0];
const zCentre = (z: Zone) => (z as any).centre as string;
const owner = (cb: Combat, z: Zone) => unitById(cb, z.by);
const earthed = (o: Unit, t: Unit) => t === o && has(o, 'grand_sigilist.earthed');
/** Grand forms over the tile, of this owner. */
const formsAt = (cb: Combat, o: Unit, k: string) => grandZones(cb, o).filter((z) => inZ(z, k));
const MEDIUM_ARMOUR = 10;
const armoured = (t: Unit, g: any) => { const c = t.charId ? g?.characters?.[t.charId] : null; return c ? (c.armourClass || 0) >= 2 : t.armour >= MEDIUM_ARMOUR; };
function staffOf(h: Holder) { const st = stateOf(h); if (st.staff && h.cb && !grandZones(h.cb, h.u!).some((z) => z.id === st.staff.zone)) { say(h.cb, 'The Grand form fades; ' + h.u!.name + ' takes the staff back.'); clearGrand(h); } return st.staff || null; }
function clearGrand(h: Holder) {
  const st = stateOf(h), cb = h.cb!; if (!st.staff) return;
  const ids = new Set([st.staff.zone, ...(st.staff.extra || [])]); cb.zones = (cb.zones || []).filter((z) => !ids.has(z.id));
  cb.objects = objectsOf(cb).filter((x) => !((x as any).grandWall && (x as any).by === h.u!.id));
  for (const u of cb.units) restoreFog(u);
  delete st.staff;
}
function bodySave(rng: Rng, o: Unit, t: Unit, fam: 'body' | 'brain' | 'heart' = 'body'): boolean {
  const r = d20(rng), m = t.sv ? t.sv[fam] : t.mg ? t.mg.saves[fam] : ({ minion: 0, soldier: 1, elite: 2, boss: 3 } as Record<string, number>)[t.tier || 'minion'] ?? 0;
  const tn = 12 + (o.dbf ? o.dbf[fam] : o.mg ? o.mg.debuff[fam] : 1);
  return r === 20 || (r !== 1 && r + m >= tn);
}
function restoreFog(u: Unit) { const f = (u as any).fogVision; if (f != null) { u.vision = f; delete (u as any).fogVision; } }
function fogSync(cb: Combat) {
  for (const u of cb.units) {
    const inFog = grandZones(cb).some((z) => zWord(z) === 'blind' && inZ(z, u.pos));
    if (inFog && (u as any).fogVision == null) { (u as any).fogVision = u.vision ?? 12; u.vision = 1; }
    else if (!inFog) restoreFog(u);
  }
}
/** What a Grand form does to a unit as its turn starts inside (or, for PULL, within 4 of the staff). */
function grandTurnStart(cb: Combat, rng: Rng, o: Unit, z: Zone, t: Unit, g: any): string {
  const w = zWord(z), ally = t.side === o.side, me = earthed(o, t);
  switch (w) {
    case 'fire': return me ? '' : ' · lava burns ' + t.name + harm(cb, rng, o, t, 10, 'elemental', 'fire') + (t.dead ? '' : bodySave(rng, o, t) ? '' : applyCond(cb, rng, o, t, 'burning', undefined, 'body', { skipSave: true }));
    case 'shock': { if (me) return ''; let s = armoured(t, g) ? ' · the storm arcs to ' + t.name + harm(cb, rng, o, t, 15, 'elemental', 'lightning') : ''; if (isRobot(t) && !t.dead) s += applyCond(cb, rng, o, t, 'stunned', 1); return s; }
    case 'ward': return ally ? applyCond(cb, rng, o, t, 'guarded', 1, undefined, { skipSave: true }) + ' · the dome shields ' + t.name + ' (' + grantShield(cb, t, 20, o) + ')' : '';
    case 'mend': return ally ? heal(t, 10 * (o.mg?.healMult || 1), cb, o) : '';
    // CONDENSE (Crush): enemies inside pressed against another creature take 10.
    case 'condense': return me || ally || !cb.units.some((x) => x !== t && !x.dead && dist(x.pos, t.pos) === 1) ? '' : ' · the Crush grinds ' + t.name + harm(cb, rng, o, t, 10, 'sigil');
    // PUSH (Gust): enemies starting a turn inside are blown 1 tile outward.
    case 'push': { if (ally || t.pos === zCentre(z)) return ''; const [cx, cy] = xy(zCentre(z)), [x, y] = xy(t.pos); return nudge(cb, t, key(cx + (x - cx) * 9, cy + (y - cy) * 9), 1).replace('is pulled', 'is blown') || ''; }
    case 'muddle': { if (me || bodySave(rng, o, t, 'brain')) return ''; const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], [dx, dy] = dirs[die(rng, 8) - 1], [x, y] = xy(t.pos); return nudge(cb, t, key(x + dx * 2, y + dy * 2), 1).replace('is pulled', 'staggers') || ' · ' + t.name + ' staggers in place'; }
    case 'dread': return !ally ? applyCond(cb, rng, o, t, 'shaken', undefined, 'heart') : '';
    case 'silence': return applyCond(cb, rng, o, t, 'silenced', 1, undefined, { skipSave: true });
    case 'light': return t.hidden && !ally ? reveal(cb, t, 'the Noon form') : '';
    case 'veil': if (!t.hidden && !condOn(t, 'marked')) { t.hidden = true; return ' · ' + t.name + ' vanishes in the smoke'; } return '';
    // The 1.4 words (item 468).
    // COMMAND (Parade ground): a Brain save, or halt: Pinned for the turn (no moving; it can still act).
    case 'command': return ally || condOn(t, 'pinned') || bodySave(rng, o, t, 'brain') ? '' : ' · the Parade ground halts ' + t.name + applyCond(cb, rng, o, t, 'pinned', 1, undefined, { skipSave: true });
    case 'quicken': { if (!ally || t === o) return ''; const was = t.ap; t.ap = Math.min(9, t.ap + 1); return t.ap > was ? ' · ' + t.name + ' quickens (+1 AP)' : ''; }
    case 'cleanse': { if (!ally) return ''; const id = newestCondition(t); if (!id) return ''; endCond(t, id, cb); emitFx(cb, 'boon', { target: t.id, at: t.pos, word: 'cleanse', cond: id }); return ' · clear water washes ' + id + ' off ' + t.name; }
  }
  return '';
}
/** Entering a Grand form. */
function grandEnter(cb: Combat, rng: Rng, o: Unit, z: Zone, t: Unit, ms: any): string {
  const w = zWord(z), me = earthed(o, t); if (me) return '';
  const hit = ((z as any).hit ||= {}); if (hit[t.id] === cb.round + ':' + w) return ''; hit[t.id] = cb.round + ':' + w;
  switch (w) {
    case 'fire': return ' · lava burns ' + t.name + harm(cb, rng, o, t, 10, 'elemental', 'fire') + (t.dead || bodySave(rng, o, t) ? '' : applyCond(cb, rng, o, t, 'burning', undefined, 'body', { skipSave: true }));
    case 'bind': { const l = applyCond(cb, rng, o, t, 'pinned', undefined, 'body'); if (condOn(t, 'pinned')) ms.stop = 'tar'; return ' · tar' + l; }
    case 'gale': { ms.stop = 'cyclone'; const [cx, cy] = xy(zCentre(z)), [x, y] = xy(t.pos); return nudge(cb, t, key(cx - (x - cx) * 9, cy - (y - cy) * 9), 2).replace('is pulled', 'is thrown') || ' · the cyclone batters ' + t.name; }
    case 'light': return t.hidden && t.side !== o.side ? reveal(cb, t, 'the Noon form') : '';
    case 'silence': return applyCond(cb, rng, o, t, 'silenced', 1, undefined, { skipSave: true });
    case 'veil': if (!t.hidden && !condOn(t, 'marked')) { t.hidden = true; return ' · ' + t.name + ' vanishes in the smoke'; } return '';
    case 'wait': if (t.side === o.side) return ''; ms.stop = 'tripwire'; return ' · a tripwire catches ' + t.name + harm(cb, rng, o, t, 10, 'sigil');
  }
  return '';
}
/** Grand NULL (Clean ground): wipe the placed Sigil magic inside (glyphs, fields, traps, turrets, smoke, light, RAISE
 * walls; never Keystones, Grand forms or class zones: item 430). */
function cleanGround(cb: Combat, z: Zone): string {
  const T = new Set(z.tiles), gl = (cb.glyphs || []).filter((g) => T.has(g.pos) && !(g as any).keystone);
  const zs = (cb.zones || []).filter((x) => x !== z && ['field', 'trap', 'turret', 'wall', 'veil', 'light'].includes(x.kind) && x.tiles.some((k) => T.has(k)));
  const walls = objectsOf(cb).filter((o) => o.kind === 'sigil_wall' && T.has(o.pos));
  if (!gl.length && !zs.length && !walls.length) return '';
  cb.glyphs = (cb.glyphs || []).filter((g) => !gl.includes(g)); tidyStrokes(cb.glyphs); for (const g of gl) emitFx(cb, 'glyph_fade', { tile: g.pos, word: g.word, side: g.side, why: 'null' });
  for (const x of zs) { if (['field', 'trap', 'turret', 'wall'].includes(x.kind)) destroyPlaced(cb, x, 'Clean ground (Grand NULL)'); else cb.zones = (cb.zones || []).filter((y) => y !== x); }
  if (walls.length) { cb.objects = objectsOf(cb).filter((o) => !walls.includes(o)); emitFx(cb, 'wall_crumbled', { tiles: walls.map((o) => o.pos), why: 'null' }); }
  emitFx(cb, 'null_wave', { at: zCentre(z), tiles: z.tiles, n: gl.length + zs.length + walls.length });
  return ' · the clean ground wipes ' + (gl.length + zs.length + walls.length) + ' piece' + (gl.length + zs.length + walls.length === 1 ? '' : 's') + ' of Sigil magic';
}
/** Grand ACID (Etching ground): cover inside loses 15 HP each round and crumbles at 0. */
const ETCH = 15, ETCHABLE = /crate|low_wall|pillar|barricade|sigil_wall|container|barrel/;
function etch(cb: Combat, o: Unit, z: Zone): string {
  const hit = objectsOf(cb).filter((x) => inZ(z, x.pos) && ETCHABLE.test(x.kind) && x.hp != null && x.hp > 0); if (!hit.length) return '';
  let gone = 0;
  for (const x of hit) {
    x.hp = Math.max(0, x.hp! - ETCH); emitFx(cb, 'object', { at: x.pos, what: x.kind, dmg: ETCH, broken: x.hp <= 0, hp: x.hp, element: 'acid' });
    if (x.hp <= 0) { gone++; cb.objects = objectsOf(cb).filter((y) => y !== x); emit(cb, 'object_destroyed', { obj: x, by: o, cb }); }
  }
  return ' · the acid eats ' + hit.length + ' piece' + (hit.length === 1 ? '' : 's') + ' of cover' + (gone ? ' (' + gone + ' crumbled)' : '');
}
/** Grand ARC (Mortar pit): the tile within 6 of the staff whose shell would hit the most enemies (the centre counts 3). */
function mortarTile(cb: Combat, o: Unit, z: Zone): string | null {
  const foes = cb.units.filter((x) => !x.dead && !x.downed && !x.surrendered && x.side !== o.side && !x.hidden);
  let best: string | null = null, score = 0;
  for (const f of foes) for (const k of around(f.pos, 1)) {
    if (dist(k, zCentre(z)) > 6) continue;
    const sc = foes.reduce((n, x) => n + (x.pos === k ? 3 : dist(x.pos, k) === 1 ? 1 : 0), 0);
    if (sc > score || (sc === score && best && k < best)) { best = k; score = sc; }
  }
  return score >= 3 ? best : null;
}
function mortar(cb: Combat, rng: Rng, o: Unit, z: Zone): string {
  const k = mortarTile(cb, o, z); if (!k) return '';
  emitFx(cb, 'turret_shot', { id: z.id, tile: zCentre(z), target: null, at: k, side: o.side, grand: true, lob: true });
  let line = ' · the Mortar pit shells ' + refOf(k);
  for (const v of cb.units.filter((x) => !x.dead && x.side !== o.side && (x.pos === k || dist(x.pos, k) === 1))) line += harm(cb, rng, o, v, v.pos === k ? 15 : 5, 'sigil');
  return line;
}
let ARCING = false;
/** Tiles a straight shot crosses (for GALE's -5). */
function segTiles(a: string, b: string): string[] {
  const [x0, y0] = xy(a), [x1, y1] = xy(b), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), out: string[] = [];
  for (let i = 1; i < n; i++) out.push(key(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)));
  return out;
}
const GRAND_STONE = 4, GRAND_WALLS = 8;
register({
  id: 'grand_sigilist.enlarge', claims: 'all',
  actions: [
    { id: 'enlarge', label: 'Enlarge (Grand form)', pick: 'words', pickLabel: 'The word', scope: ['combat', 'world'], target: 'tile', ap: 3, uses: { per: 'per_combat', n: 1 },
      text: 'Plant the staff and enlarge a word you know into its Grand form over radius 2 (3 rounds + duration bonus; 3 charge). No drawing or Evoking while it stands.',
      available: (h) => (!h.u ? false : sigilBlock(h.cb!, h.u) || (staffOf(h) ? 'The staff is already planted.' : h.u.mg!.charge < 3 ? 'Needs 3 charge: swap a core.' : true)),
      preview: (h, a) => {
        const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile'), w = a.choice || '';
        if (!SIGIL[w]?.grand || !u.mg!.words.includes(w)) return { ok: false, why: 'Pick a word you know (choice).' };
        if (!t || dist(u.pos, t) > 1 || !standable(cb.map, t)) return { ok: false, why: 'Plant it on your tile or one next to you.' };
        return { lines: [SIGIL[w].word + ': ' + SIGIL[w].grand] };
      },
      run: (h, a) => {
        const u = h.u!, cb = h.cb!, t = aimOf(cb, a, 'tile')!, w = a.choice!, m = u.mg!, left = 3 + m.durBonus;
        m.charge -= 3; m.cast = true;
        const tiles = around(t, 2).filter((k) => { const [x, y] = xy(k); return x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h; });
        const seq = () => 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1);
        const z: any = { id: seq(), kind: 'grand', tiles, words: [w], by: u.id, side: u.side, left, mult: 1, who: u.name, centre: t };
        const extra: string[] = []; cb.zones = [...(cb.zones || []), z];
        if (w === 'veil' || w === 'light') { const x: any = { id: seq(), kind: w, tiles, words: [w], by: u.id, side: u.side, left, mult: 1, who: u.name, grandOf: z.id }; cb.zones.push(x); extra.push(x.id); }
        stateOf(h).staff = { at: t, zone: z.id, extra };
        emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: 'grand', tiles, src: t, impact: t, targets: [], words: [w], element: w, stay: true, side: u.side });
        let line = '';
        if (w === 'stone') {
          const want = (a.text || '').split(/[\s,]+/).map((x) => tileOf(cb, x)).filter((k): k is string => !!k && tiles.includes(k));
          const diag = (k: string) => (xy(k)[0] - xy(t)[0]) !== 0 && (xy(k)[1] - xy(t)[1]) !== 0;
          const auto = around(t, 1).filter((k) => k !== t).sort((a, b) => Number(diag(b)) - Number(diag(a)));
          const placed: string[] = [];
          for (const k of [...want, ...auto]) { if (placed.length >= GRAND_STONE) break; if (placed.includes(k) || !free(cb, k)) continue; cb.objects = [...objectsOf(cb), makeObject('earthwork_' + k.replace(',', '_') + '_' + cb.round, 'crate', k, { name: 'Earthwork pillar' })]; placed.push(k); }
          line = placed.length ? ' · earthworks rise at ' + placed.map(refOf).join(', ') : ' · no room for earthworks';
        }
        if (w === 'light') for (const x of cb.units) if (x.hidden && x.side !== u.side && inZ(z, x.pos)) line += reveal(cb, x, 'the Noon form');
        if (w === 'veil') for (const x of cb.units) if (!x.dead && inZ(z, x.pos) && !x.hidden && !condOn(x, 'marked')) { x.hidden = true; line += ' · ' + x.name + ' vanishes in the smoke'; }
        if (w === 'null') line += cleanGround(cb, z);
        // RAISE (Ramparts): up to 8 wall segments on the edge ring, every other tile, never on anyone; they fall with the form.
        if (w === 'raise') {
          const ring = tiles.filter((k) => dist(k, t) === 2).sort((a, b) => Math.atan2(xy(a)[1] - xy(t)[1], xy(a)[0] - xy(t)[0]) - Math.atan2(xy(b)[1] - xy(t)[1], xy(b)[0] - xy(t)[0]));
          const walls: string[] = [];
          ring.forEach((k, i) => { if (i % 2 || walls.length >= GRAND_WALLS || !free(cb, k)) return; cb.objects = [...objectsOf(cb), makeObject('gw' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), 'sigil_wall', k, { hp: 30, max: 30, by: u.id, side: u.side, left, who: u.name, sigilWall: true, grandWall: true } as any)]; walls.push(k); });
          line += walls.length ? ' · ramparts rise at ' + walls.map(refOf).join(', ') : ' · no room for ramparts';
        }
        if (w === 'sense') for (const x of cb.units) if (x.hidden && !x.dead && x.side !== u.side && dist(x.pos, t) <= 4) line += reveal(cb, x, 'Second sight');
        fogSync(cb);
        say(cb, u.name + ' plants the staff at ' + refOf(t) + ' and ' + SIGIL[w].word + ' swells into its Grand form for ' + left + ' rounds: ' + SIGIL[w].grand + line);
        return null;
      } },
    { id: 'pull_staff', label: 'Pull out the staff', scope: ['combat', 'world'], target: 'none', ap: 1,
      text: 'Pull the planted staff out (next to it): the Grand form ends.',
      available: (h) => { const s = h.u ? staffOf(h) : null; return !s ? false : dist(h.u!.pos, s.at) > 1 ? 'Stand next to the staff.' : true; },
      run: (h) => { say(h.cb, h.u!.name + ' pulls the staff out of ' + refOf(stateOf(h).staff.at) + ': the Grand form collapses.'); clearGrand(h); return null; } },
    { id: 'enlarge_story', label: 'Enlarge (Grand form)', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Lay a Grand form over a place (say which word and where): the Narrator rules what it does there.',
      run: (h, a) => { postStory(h, (a.text || '').slice(0, 200)); if (h.g && h.c) pendRuling(h.g, h.c, h.key, h.c.name + ' plants the staff and lays a Grand form: "' + (a.text || '').slice(0, 160) + '". Rule its effect (Grand forms: sigils.json) for the scene.'); return null; } },
  ],
  on: {
    glyph_cost: (ctx, h) => {
      if (ctx.u === h.u && stateOf(h).staff) ctx.fail ||= 'Your staff is planted: pull it out first.';
      const o = h.u, cb = h.cb; if (!o || !cb || !stateOf(h).staff) return;
      if (grandZones(cb, o).some((z) => zWord(z) === 'null' && inZ(z, ctx.tile || ctx.u.pos))) ctx.fail ||= 'Clean ground (Grand NULL): no glyph can be drawn here.';
    },
    evoke_cost: (ctx, h) => { if (ctx.u === h.u && stateOf(h).staff) ctx.fail ||= 'Your staff is planted: pull it out first.'; },
    turn_start: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.u; if (!o || !onGrid(h) || t.dead) return; if (!staffOf(h)) return;
      let line = '';
      for (const z of grandZones(cb, o)) {
        if (zWord(z) === 'pull') { if (t.side !== o.side && dist(t.pos, zCentre(z)) <= 4) line += nudge(cb, t, zCentre(z), 1); continue; }
        if (zWord(z) === 'sense') { for (const x of cb.units) if (x.hidden && !x.dead && x.side !== o.side && dist(x.pos, zCentre(z)) <= 4) line += reveal(cb, x, 'Second sight'); continue; }
        if (zWord(z) === 'watch') { if (t === o) { const v = cb.units.filter((x) => !x.dead && !x.downed && !x.surrendered && x.side !== o.side && inZ(z, x.pos)).sort((a, b) => dist(a.pos, zCentre(z)) - dist(b.pos, zCentre(z)))[0]; if (v) { emitFx(cb, 'turret_shot', { id: z.id, tile: zCentre(z), target: v.id, at: v.pos, side: o.side, grand: true }); line += ' · the Sentinel strikes ' + v.name + harm(cb, rngOf(h, ctx), o, v, 15, 'sigil'); } } continue; }
        if (zWord(z) === 'arc') { if (t === o) line += mortar(cb, rngOf(h, ctx), o, z); continue; }
        if (inZ(z, t.pos)) line += grandTurnStart(cb, rngOf(h, ctx), o, z, t, h.g);
      }
      if (line) say(cb, SIGIL[zWord(grandZones(cb, o)[0])]?.word + ' (Grand)' + line + '.');
      fogSync(cb);
    },
    move_step: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.u; if (!o || !onGrid(h) || !stateOf(h).staff) return;
      let line = '';
      for (const z of grandZones(cb, o)) if (inZ(z, ctx.at) && !inZ(z, ctx.from)) line += grandEnter(cb, rngOf(h, ctx), o, z, t, ctx);
      // WATCH (Sentinel): an enemy leaving the zone takes a 10 strike from the staff, once a round each.
      for (const z of grandZones(cb, o)) if (zWord(z) === 'watch' && t.side !== o.side && inZ(z, ctx.from) && !inZ(z, ctx.at)) {
        const left = ((z as any).left_hit ||= {}); if (left[t.id] === cb.round) continue; left[t.id] = cb.round;
        emitFx(cb, 'turret_shot', { id: z.id, tile: zCentre(z), target: t.id, at: ctx.at, side: o.side, grand: true });
        line += ' · the Sentinel strikes ' + t.name + ' as it leaves' + harm(cb, rngOf(h, ctx), o, t, 10, 'sigil');
      }
      if (line) say(cb, t.name + ' enters the Grand form' + line + '.');
    },
    moved: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.u; if (!o || !onGrid(h) || !stateOf(h).staff || t.dead) return;
      fogSync(cb);
      // FREEZE (ice sheet): a Body save each move through it, or fall Prone.
      if (earthed(o, t)) return;
      for (const z of grandZones(cb, o)) if (zWord(z) === 'freeze' && (ctx.route || []).some((k: string) => inZ(z, k)) && !t.prone) { if (!bodySave(rngOf(h, ctx), o, t)) say(cb, t.name + ' slips on the ice' + applyCond(cb, rngOf(h, ctx), o, t, 'prone') + '.'); }
    },
    move_cost: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.u; if (!o || !onGrid(h) || !stateOf(h).staff) return;
      // FREEZE (difficult ground) and SLOW (Movement halved): each tile inside costs double (not for the Earthed owner).
      const n = earthed(o, t) ? 0 : (ctx.route || []).filter((k: string) => grandZones(cb, o).some((z) => (zWord(z) === 'freeze' || zWord(z) === 'slow') && inZ(z, k))).length;
      if (n) ctx.ap += Math.ceil(n / Math.max(0.5, t.movement));
      // STEP (Fold): for your side, a move that starts and stays inside costs 1 AP at most, however far (the ground folds).
      if (t.side === o.side && ctx.how === 'move' && (ctx.route || []).length && grandZones(cb, o).some((z) => zWord(z) === 'step' && inZ(z, t.pos) && (ctx.route as string[]).every((k) => inZ(z, k)))) ctx.ap = Math.min(ctx.ap, 1);
    },
    attack_preview: (ctx, h) => {
      const o = h.u, cb = h.cb!; if (!o || !onGrid(h) || !stateOf(h).staff) return; const att: Unit = ctx.att, tgt: Unit = ctx.tgt;
      for (const z of grandZones(cb, o)) {
        const w = zWord(z), aIn = inZ(z, att.pos), tIn = inZ(z, tgt.pos);
        if (w === 'light' && aIn && att.side !== o.side) ctx.terms.push({ v: -2, label: 'Noon (Grand LIGHT)' });
        if (w === 'gale' && !ctx.melee && att !== o && (aIn || tIn || segTiles(att.pos, tgt.pos).some((k) => inZ(z, k)))) ctx.terms.push({ v: -5, label: 'Cyclone (Grand GALE)' });
        if (w === 'seek' && tIn && att.side === o.side && tgt.side !== o.side) ctx.ignoreCover = true;
        // ACID (Etching ground): enemies inside have -2 Defense (your side hits them more easily).
        if (w === 'acid' && tIn && tgt.side !== o.side && att.side === o.side) ctx.terms.push({ v: 2, label: 'Etched (Grand ACID)' });
        // MASK (Hall of masks): your side inside can't be picked out from beyond 3 tiles outside it.
        if (w === 'mask' && tIn && !aIn && tgt.side === o.side && att.side !== o.side && dist(att.pos, tgt.pos) > 3) ctx.fail ||= 'Hall of masks: ' + tgt.name + ' is lost among the masks from out here (Grand MASK; come within 3 tiles).';
        // RELAY (Relay net): +1 to hit for each other ally inside who has a line to the target (+3 at most).
        if (w === 'relay' && aIn && att.side === o.side && tgt.side !== o.side) { const n = Math.min(3, cb.units.filter((x) => x !== att && !x.dead && !x.downed && x.side === o.side && inZ(z, x.pos) && lineOfSight(cb, x.pos, tgt.pos)).length); if (n) ctx.terms.push({ v: n, label: 'Relay net (Grand RELAY)' }); }
      }
    },
    // SHARPEN (Whetstone): attacks your side makes from inside deal +5, or +10 with melee and unarmed strikes.
    damage_out: (ctx, h) => {
      const o = h.u, cb = h.cb!; if (!o || !onGrid(h) || !stateOf(h).staff) return; const att: Unit = ctx.att; if (!att || att.side !== o.side || ctx.mode === 'spell') return;
      if (!grandZones(cb, o).some((z) => zWord(z) === 'sharpen' && inZ(z, att.pos))) return;
      const close = ctx.melee || ctx.mode === 'melee' || unarmed(att, ctx.mode);
      ctx.add += close ? 10 : 5; if (ctx.mults && !ctx.preview) { /* flat bonus: no multiplier */ }
    },
    attack_roll: (ctx, h) => {
      const o = h.u, cb = h.cb!; if (!o || !onGrid(h) || !stateOf(h).staff) return; const att: Unit = ctx.att;
      if (ctx.die <= 3 && canJam(att) && !earthed(o, att) && grandZones(cb, o).some((z) => zWord(z) === 'spark' && inZ(z, att.pos))) (stateOf(h).sparkJam ||= []).push(att.id);
    },
    on_hit: (ctx, h) => sparkJam(ctx, h), on_miss: (ctx, h) => sparkJam(ctx, h),
    // KIN (Sanctum): allies inside take no damage from your side's spells and attacks (hazards still hurt).
    damage_in: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.t; if (!o || !onGrid(h) || ctx.phase !== 'reduce' || t.side !== o.side || !stateOf(h).staff) return;
      const by: Unit | null | undefined = ctx.src?.by; if (!by || by.side !== o.side) return;
      if (!grandZones(cb, o).some((x) => zWord(x) === 'kin' && inZ(x, t.pos))) return;
      if (ctx.dmg > 0) say(cb, 'Sanctum: ' + t.name + ' takes no harm from ' + (by === t ? 'their own' : by.name + '\'s') + ' blow (Grand KIN).');
      ctx.dmg = 0;
    },
    // CHAIN (Conductor): when your side hurts an enemy inside, 5 lightning arcs to the nearest other enemy inside within
    // 3 tiles (once a round for each enemy it reaches; an arc doesn't arc again).
    on_damaged: (ctx, h) => {
      const o = h.u, cb = h.cb, t: Unit = ctx.t; if (!o || !cb || !onGrid(h) || !stateOf(h).staff || t.side === o.side) return;
      const by: Unit | null | undefined = ctx.src?.by; if (!by || by.side !== o.side) return;
      // LEECH (Bloodwell): a hit your side lands on an enemy inside heals the one who landed it 5 (once a round for each
      // attacker and enemy).
      for (const z of grandZones(cb, o)) {
        if (zWord(z) !== 'leech' || !inZ(z, t.pos) || by.dead || by.downed) continue;
        const fed = ((z as any).fed ||= {}), k = by.id + '>' + t.id; if (fed[k] === cb.round) continue; fed[k] = cb.round;
        const r = healUnit(cb, by, 5, o, 'leech'); if (r.restored) { emitFx(cb, 'leech', { unit: by.id, to: by.pos, from: [t.pos], amount: r.restored, element: null }); say(cb, 'Bloodwell (Grand LEECH): ' + by.name + ' drinks ' + r.restored + ' HP from ' + t.name + '.'); }
      }
      if (ARCING) return;
      for (const z of grandZones(cb, o)) {
        if (zWord(z) !== 'chain' || !inZ(z, t.pos)) continue;
        const arced = ((z as any).arced ||= {});
        const v = cb.units.filter((x) => x !== t && !x.dead && !x.downed && !x.surrendered && x.side !== o.side && inZ(z, x.pos) && dist(x.pos, t.pos) <= 3 && arced[x.id] !== cb.round).sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0];
        if (!v) continue; arced[v.id] = cb.round;
        emitFx(cb, 'chain', { from: t.pos, to: v.pos, target: v.id, jump: 1, mult: 1, element: 'shock', grand: true });
        ARCING = true; let l = ''; try { l = harm(cb, rngOf(h, ctx), o, v, 10, 'elemental', 'lightning'); } finally { ARCING = false; }
        say(cb, 'Conductor (Grand CHAIN): the hit on ' + t.name + ' arcs to ' + v.name + l + '.');
      }
    },
    turn_end: (ctx, h) => {
      const o = h.u, cb = h.cb!, t: Unit = ctx.u; if (!o || !onGrid(h) || !stateOf(h).staff || !t.conds) return;
      // STAY (stasis): conditions inside don't tick down (one landed this turn wasn't going to tick anyway).
      if (!grandZones(cb, o).some((z) => zWord(z) === 'stay' && inZ(z, t.pos))) { if (condOn(t, 'silenced') && t.condBy?.silenced === o.id && !grandZones(cb, o).some((z) => zWord(z) === 'silence' && inZ(z, t.pos))) endCond(t, 'silenced', cb); return; }
      const fresh = new Set(t.condFresh || []);
      for (const id of Object.keys(t.conds)) if (t.conds[id] > 0 && t.conds[id] < 99 && !fresh.has(id)) t.conds[id]++;
    },
    round_start: (ctx, h) => {
      if (!h.u || !onGrid(h) || !staffOf(h)) return;
      let line = '', acid = ''; for (const z of grandZones(h.cb!, h.u)) { if (zWord(z) === 'null') line += cleanGround(h.cb!, z); if (zWord(z) === 'acid') acid += etch(h.cb!, h.u, z); }
      if (line) say(h.cb, 'NULL (Grand)' + line + '.');
      if (acid) say(h.cb, 'ACID (Grand Etching ground)' + acid + '.');
    },
    // SPREAD (Bloom) and TWICE (Echo field): spells your side lands inside.
    evoked: (ctx, h) => {
      const o = h.u, cb: Combat = h.cb || ctx.cb; if (!o || !cb || ctx.fizzle || !ctx.u || ctx.u.side !== o.side || !stateOf(h).staff || !ctx.impact) return;
      const rng = rngOf(h, ctx), hitIds = new Set((ctx.targets || []).map((x: Unit) => x.id));
      for (const z of grandZones(cb, o)) {
        if (!inZ(z, ctx.impact)) continue;
        // Bloom: every enemy inside the spell missed takes 10.
        if (zWord(z) === 'spread') { let l = ''; for (const v of cb.units.filter((x) => !x.dead && !x.downed && x.side !== o.side && inZ(z, x.pos) && !hitIds.has(x.id))) l += harm(cb, rng, o, v, 10, 'sigil'); if (l) say(cb, 'Bloom (Grand SPREAD): the spell blooms through the form' + l + '.'); }
        // Echo field: the first spell each round echoes on the enemies it hit, at half its damage per target (5 at least).
        if (zWord(z) === 'twice' && (z as any).echoed !== cb.round && ctx.dealt > 0) {
          const foes = (ctx.targets || []).filter((x: Unit) => !x.dead && x.side !== o.side); if (!foes.length) continue;
          (z as any).echoed = cb.round; const each = Math.max(5, Math.floor(ctx.dealt / Math.max(1, (ctx.targets || []).length) / 2));
          let l = ''; for (const v of foes) l += harm(cb, rng, o, v, each, 'sigil'); say(cb, 'Echo field (Grand TWICE): the spell rings again' + l + '.');
        }
      }
    },
    combat_end: (ctx, h) => { if (h.u && stateOf(h).staff) clearGrand({ ...h, cb: ctx.cb }); },
  },
  brief: () => 'Enlarge: story uses of a Grand form are yours to rule.',
});
function sparkJam(ctx: any, h: Holder) {
  const st = stateOf(h), list: string[] = st.sparkJam || []; const i = list.indexOf(ctx.att.id); if (i < 0) return; list.splice(i, 1);
  if (!ctx.att.jammed) { ctx.att.jammed = true; say(h.cb, 'Static leaps into ' + ctx.att.name + '\'s weapon: jammed (Grand SPARK).'); }
}
// Empty Hand (K20, PROVISIONAL, audit 1-4): with empty hands (an unarmed weapon and nothing in the off hand) your
// unarmed strikes deal 20 Physical at least (fists 10 → 20; knuckledusters 16 → 20; a servo-fist keeps its 30) for 2 AP,
// and you get +2 Defense (on the sheet too). Data fix: stat_mod unarmed_damage reads "set 20", not +20.
/** The +2 the unit was built with (the sheet's Defense counts it when the character's own hands are empty). */
const builtEH = (h: Holder) => (h.c && WEAPON[h.c.weapon]?.category === 'unarmed' && !h.c.offHand ? 2 : 0);
function ehSync(h: Holder) {
  const u: any = h.u; if (!u) return; const want = handsEmpty(u) ? 2 : 0, had = u.ehDef ?? builtEH(h);
  if (want !== had) u.def += want - had; u.ehDef = want;
}
register({
  id: 'grand_sigilist.empty_hand', claims: 'all',
  stat: (h, stat) => { if (stat !== 'defense' || !h.c || h.u) return; const w = WEAPON[h.c.weapon]; return w?.category === 'unarmed' && !h.c.offHand ? 2 : 0; },
  on: {
    combat_start: (ctx, h) => ehSync(h),
    swap: (ctx, h) => ehSync(h), turn_start: (ctx, h) => { if (ctx.u === h.u) ehSync(h); }, turn_end: (ctx, h) => { if (ctx.u === h.u) ehSync(h); },
    damage_out: (ctx, h) => { if (ctx.att !== h.u || !handsEmpty(h.u!)) return; const w = WEAPON[ctx.src?.weapon]; if (w?.category !== 'unarmed') return; if (ctx.base + ctx.add < 20) ctx.add += 20 - (ctx.base + ctx.add); },
  },
  brief: () => null,
});
// Earthed (K21, PROVISIONAL, audit 1-3): inside your own Grand form you ignore its harm (lava, storm, ice, tar, cyclone,
// maze, gravity; not SILENCE: the planted staff forbids casting anyway), and your unarmed strikes carry its element: an
// element word (FIRE, FREEZE, SHOCK, SPARK) makes them Elemental (half armour), with FIRE's Burning on a critical and
// FREEZE's Slowed on a hit (save); STONE and GALE strikes stay Physical. Other words add nothing (the Narrator may rule a
// DREAD fist).
// Rules 1.4 (item 468): ACID joins them (Elemental, Corroded on a hit, Body save).
const EARTH_EL: Record<string, string> = { fire: 'fire', freeze: 'frost', shock: 'lightning', spark: 'elemental', acid: 'acid' };
register({
  id: 'grand_sigilist.earthed', claims: 'all',
  on: {
    damage_out: (ctx, h) => {
      const u = h.u; if (ctx.att !== u || !u || !h.cb || !unarmed(u, ctx.mode)) return;
      const z = formsAt(h.cb, u, u.pos).find((x) => EARTH_EL[zWord(x)]); if (!z) return;
      ctx.src.dmgType = EARTH_EL[zWord(z)]; const half = Math.floor((ctx.tgt?.armour || 0) / 2); if (half) ctx.add += half;
    },
    on_hit: (ctx, h) => {
      const u = h.u; if (ctx.att !== u || !u || !h.cb || !unarmed(u, ctx.mode) || ctx.tgt.dead) return;
      const z = formsAt(h.cb, u, u.pos).find((x) => EARTH_EL[zWord(x)]); if (!z) return; const rng = rngOf(h, ctx);
      if (zWord(z) === 'fire' && ctx.crit) say(h.cb, 'Earthed fire' + applyCond(h.cb, rng, u, ctx.tgt, 'burning', undefined, 'body', { skipSave: true }) + '.');
      if (zWord(z) === 'freeze') say(h.cb, 'Earthed frost' + applyCond(h.cb, rng, u, ctx.tgt, 'slowed') + '.');
      if (zWord(z) === 'acid') say(h.cb, 'Earthed acid' + applyCond(h.cb, rng, u, ctx.tgt, 'corroded', undefined, 'body') + '.');
    },
  },
  brief: () => 'Earthed: rule what a non-element Grand form adds to the Sigilist\'s fists, if asked.',
});

// =============================================================================================== HEARTFED
type Gauge = 'rage' | 'grief' | 'fear' | 'devotion';
const GAUGES: Gauge[] = ['rage', 'grief', 'fear', 'devotion'];
/** The four gauges, kept on the character for the scene (K22: they last the scene and reset when it ends). */
function gauges(h: { c?: Character | null; g?: any; u?: Unit | null; cb?: Combat | null }): Record<string, any> {
  const st = charState(h.c), sc = sceneOf(h);
  // The Narrator's story points: traitState heartfed_add {rage: n, …} (added, then cleared). A heartfed object written
  // without a scene (the Narrator overwrote the gauges) counts as points to add too, never as a reset.
  const legacy = st.heartfed && st.heartfed.scene == null ? st.heartfed : null, add = st.heartfed_add || null;
  if (!st.heartfed || st.heartfed.scene !== sc) st.heartfed = { scene: sc, rage: 0, grief: 0, fear: 0, devotion: 0, carry: 0, overflow: null, ovScene: legacy ? null : st.heartfed?.ovScene ?? null };
  const g = st.heartfed;
  if (legacy || add) {
    delete st.heartfed_add;
    for (const k of GAUGES) {
      const n = Math.max(0, Math.floor(+(legacy?.[k] || 0) + +(add?.[k] || 0))) || 0, was = g[k]; if (!n) continue; g[k] = Math.min(5, was + n);
      const line = (h.u?.name || h.c?.name || '') + '\'s ' + k[0].toUpperCase() + k.slice(1) + ' rises to ' + g[k] + ' (the story).';
      if (h.cb) say(h.cb, line); else if (h.g && (h as any).info) postStory(h as Holder, line, { private: true });
      if (g[k] === 5 && was < 5 && h.c && has(h.u || h.c, 'heartfed.overflow') && g.ovScene !== sc && !g.overflow) g.overflow = k;
    }
  }
  return g;
}
/** Narrator points waiting to land (traitState heartfed_add, or a heartfed object written without a scene). */
const heartAddsWaiting = (c: Character | null | undefined) => !!c && (!!cs(c).heartfed_add || (!!cs(c).heartfed && cs(c).heartfed.scene == null));
const keyOfDesign = (c: Character | null | undefined, id: string | undefined): Gauge | null => (id ? (cs(c).heartKeys || {})[id] || null : null);
function gain(h: Holder, k: Gauge, n: number, why: string) {
  if (!h.c || n <= 0) return; const g = gauges(h), was = g[k]; g[k] = Math.min(5, was + n); if (g[k] === was) return;
  say(h.cb, (h.u?.name || h.c.name) + '\'s ' + k[0].toUpperCase() + k.slice(1) + ' rises to ' + g[k] + ' (' + why + ').');
  if (g[k] === 5 && was < 5 && has(h.u || h.c, 'heartfed.overflow') && g.ovScene !== sceneOf(h) && !g.overflow) { g.overflow = k; say(h.cb, 'Overflow: the next ' + k + ' Outburst Begins at stage 2 with no Strain.'); }
}
const isTwin = (u: Unit | null | undefined) => !!u && !!(u as any).twinOf;
// Four Hearts (K22, PROVISIONAL, audit 1-6): Rage +1 per 20 damage you take (a running carry), Grief +2 when an ally
// on your side is Downed and +5 when one dies, Fear +1 when a fight starts with an Elite or Boss the squad can see and +2
// when you're Shaken, Devotion +1 when an ally heals, shields or buffs you. Each gauge 0-5, for the scene. Key a design
// to a gauge out of a fight (designs made before the class need keying too). The Narrator adds points for story moments
// with traitState {key: 'heartfed_add', value: {rage: n, …}} (added at the next round or fight, PROVISIONAL), in answer to
// the gauge action's story ruling or on their own.
register({
  id: 'heartfed.four_hearts', claims: 'all',
  actions: [
    { id: 'key_design', label: 'Key a design to a gauge', pickLabel: 'designId:rage|grief|fear|devotion', scope: ['world', 'story'], target: 'none', ap: 0,
      text: 'Key one of your designs to Rage, Grief, Fear or Devotion.',
      preview: (h, a) => { const [id, k] = String(a.choice || '').split(':'); return !(h.c?.outbursts || []).some((d) => d.id === id) || !GAUGES.includes(k as Gauge) ? { ok: false, why: 'Choose "designId:rage|grief|fear|devotion".' } : {}; },
      run: (h, a) => { const [id, k] = String(a.choice).split(':'); (charState(h.c).heartKeys ||= {})[id] = k; const d = h.c!.outbursts!.find((x) => x.id === id)!; const line = d.name + ' is keyed to ' + k + '.'; if (h.cb) say(h.cb, line); else postStory(h, line, { private: true }); return null; } },
    { id: 'gauge_story', label: 'Let it fill a gauge', scope: ['story'], target: 'text', ap: 0, uses: { per: 'per_scene', n: 1 },
      text: 'Name what this scene made you feel: the Narrator decides which gauge fills, and how much.',
      run: (h, a) => { postStory(h, (a.text || '').slice(0, 200), { private: true }); if (h.g && h.c) pendRuling(h.g, h.c, h.key, h.c.name + ' feels it: "' + (a.text || '').slice(0, 160) + '". Add gauge points with traitState heartfed_add {rage|grief|fear|devotion: n}.'); return null; } },
  ],
  on: {
    on_damaged: (ctx, h) => { if (ctx.t !== h.u || !h.c || !onGrid(h)) return; const g = gauges(h); g.carry = (g.carry || 0) + ctx.dmg; const n = Math.floor(g.carry / 20); g.carry %= 20; if (n) gain(h, 'rage', n, ctx.dmg + ' damage'); },
    on_downed: (ctx, h) => { const v: Unit = ctx.victim; if (!h.u || !onGrid(h) || v === h.u || v.side !== h.u.side || isTwin(v)) return; gain(h, 'grief', ctx.dead ? 5 : 2, v.name + (ctx.dead ? ' dies' : ' is Downed')); },
    world_round_start: (ctx, h) => { if (heartAddsWaiting(h.c)) gauges(h); },
    combat_start: (ctx, h) => { const u = h.u, cb: Combat = ctx.cb; if (!u || !inFight({ ...h, cb })) return; if (heartAddsWaiting(h.c)) gauges({ ...h, cb }); const big = cb.units.find((v) => v.side !== u.side && (v.tier === 'elite' || v.tier === 'boss') && sideSees(cb, u.side, v)); if (big) gain({ ...h, cb }, 'fear', 1, big.name + ' is here'); },
    cond_landed: (ctx, h) => {
      const u = h.u; if (!u || ctx.t !== u || !onGrid(h)) return;
      if (ctx.id === 'shaken') gain(h, 'fear', 2, 'Shaken');
      else if (isBoon(ctx.id) && ctx.by && ctx.by !== u && ctx.by.side === u.side) gain(h, 'devotion', 1, ctx.by.name + '\'s care');
    },
    heal_given: (ctx, h) => { const u = h.u; if (!u || ctx.t !== u || !ctx.by || ctx.by === u || ctx.by.side !== u.side || ctx.n <= 0) return; gain(h, 'devotion', 1, ctx.by.name + '\'s care'); },
    shield_grant: (ctx, h) => { const u = h.u; if (!u || ctx.t !== u || !ctx.by || ctx.by === u || ctx.by.side !== u.side || ctx.n <= 0) return; gain(h, 'devotion', 1, ctx.by.name + '\'s care'); },
  },
  brief: (h) => { const g = h.c ? (cs(h.c).heartfed?.scene === sceneOf(h) ? cs(h.c).heartfed : null) : null; return 'Four Hearts' + (g ? ' (R' + g.rage + ' G' + g.grief + ' F' + g.fear + ' D' + g.devotion + ')' : '') + ': add gauge points for story moments (traitState heartfed_add {rage|grief|fear|devotion: n}).'; },
});
// Fed (K23 part, PROVISIONAL, audit 1-3; rules 1.5: the gauges are the heart's fuel, item 529): an Outburst keyed to a
// gauge costs 10% less MP per point at Begin (5 MP at least). While you hold it, "Feed a feeling" (0 AP) spends 1 point
// of its gauge for a Pump that costs no AP (it is a Pump: the heartbeat, Shape and Overdraw see it), at most 2 a turn.
// Releasing it empties that gauge (a wild release too): what you didn't burn is lost. 1.2's +10% a point at release is
// gone (the stages are the power now).
const FEEL_PER_TURN = 2;
let FEEDING: string | null = null;
const heldKey = (h: Holder): Gauge | null => { const hd = h.u?.mg?.held; return hd ? keyOfDesign(h.c, hd.design) : null; };
register({
  id: 'heartfed.fed', claims: 'all', priority: 20,
  actions: [{
    id: 'feed_feeling', label: 'Feed a feeling (a free Pump)', scope: ['combat', 'world'], target: 'none', ap: 0,
    text: 'Spend 1 point of the held Outburst\'s gauge for a Pump that costs no AP (2 a turn).',
    available: (h) => {
      const m = h.u?.mg; if (!m?.held) return 'Hold a keyed Outburst first.'; const k = heldKey(h); if (!k) return 'The held Outburst isn\'t keyed to a gauge.';
      if ((gauges(h)[k] || 0) < 1) return 'Your ' + k + ' is empty.'; if (uses(h).left('per_turn', FEEL_PER_TURN, h.key + '#feel') <= 0) return 'Twice a turn.';
      return true;
    },
    preview: (h) => { const k = heldKey(h)!, m = h.u!.mg!; return { lines: [k[0].toUpperCase() + k.slice(1) + ' ' + gauges(h)[k] + ' → ' + (gauges(h)[k] - 1) + ': stage ' + m.held!.stage + ' → ' + Math.min(MAX_STAGE, m.held!.stage + 1) + ' (×' + stageMult(Math.min(MAX_STAGE, m.held!.stage + 1)) + ').'] }; },
    run: (h, _a, rng) => {
      const k = heldKey(h)!, g = gauges(h), u = h.u!, cb = h.cb!;
      FEEDING = u.id; let e: string | null; try { e = pumpOutburst(cb, rng, u); } finally { FEEDING = null; }
      if (e) return e;
      uses(h).take('per_turn', FEEL_PER_TURN, h.key + '#feel'); g[k] = Math.max(0, (g[k] || 0) - 1);
      say(cb, 'Fed: ' + k + ' feeds the heart (' + k[0].toUpperCase() + k.slice(1) + ' ' + g[k] + ').');
      return null;
    },
  }],
  on: {
    outburst_cost: (ctx, h) => { if (ctx.u !== h.u || !h.c) return; const k = keyOfDesign(h.c, ctx.design?.id); if (!k) return; const n = (cs(h.c).heartfed?.scene === sceneOf(h) ? cs(h.c).heartfed[k] : 0) || 0; if (n && ctx.mp > 0) ctx.mp = Math.max(5, ctx.mp * (1 - 0.1 * n)); },
    // A fed Pump: no AP, and not one of Empathy's free Pumps either.
    outburst_pump: (ctx, h) => { if (ctx.u === h.u && FEEDING === h.u!.id) { ctx.ap = 0; ctx.free = false; } },
    outburst_release: (ctx, h) => {
      if (ctx.u !== h.u || !h.c) return; const k = keyOfDesign(h.c, ctx.design?.id); if (!k) return; const g = gauges(h), n = g[k] || 0; if (!n) return;
      g[k] = 0; say(ctx.cb, 'Fed: ' + ctx.design.name + ' takes the rest of the ' + k + ' with it (' + n + ' lost).');
    },
  },
  brief: () => null,
});
// Overflow (K24, PROVISIONAL, audit 1-3; rules 1.5): once per scene, when a gauge reaches 5, your next Outburst keyed to
// it Begins at stage 2 (the held stage itself: its tone's rider and the swell go on from there) and its Begin takes no
// Strain (the air's +2 without an Emanator too); holding it still strains later turns.
register({
  id: 'heartfed.overflow', claims: 'all',
  on: {
    outburst_cost: (ctx, h) => { if (ctx.u !== h.u || !h.c) return; const k = keyOfDesign(h.c, ctx.design?.id), g = cs(h.c).heartfed; if (k && g?.scene === sceneOf(h) && g.overflow === k) ctx.strain = 0; },
    outburst_begin: (ctx, h) => {
      if (ctx.u !== h.u || !h.c) return; const k = keyOfDesign(h.c, ctx.design?.id), g = gauges(h); if (!k || g.overflow !== k) return;
      g.overflow = null; g.ovScene = sceneOf(h); stateOf(h).ov = ctx.design.id; say(ctx.cb, 'Overflow: ' + ctx.design.name + ' Begins at stage 2.');
    },
    // The held Outburst exists by the Begin's Strain (magic.ts beginOutburst): set its stage there, before a snap releases.
    strain: (ctx, h) => {
      const st = stateOf(h), m = h.u?.mg; if (ctx.u !== h.u || ctx.why !== 'begin' || !st.ov || !m?.held || m.held.design !== st.ov) return;
      delete st.ov; if (m.held.stage < 2) m.held.stage = 2;
      emitFx(ctx.cb, 'pump', { unit: h.u!.id, at: h.u!.pos, stage: m.held.stage, mult: stageMult(m.held.stage), free: true, max: false, tone: m.held.tone || 'raw', overflow: true });
    },
  },
  brief: () => null,
});

// =============================================================================================== HEARTBINDER
/** Links: kept on the character for the scene (K25): character ids, or 'u:<unitId>' for a unit with no character. */
function links(h: { c?: Character | null; g?: any }): string[] { const st = cs(h.c).links; return st && st.scene === sceneOf(h) ? st.ids : []; }
const linkId = (u: Unit) => u.charId || 'u:' + u.id;
const linkedUnits = (h: Holder) => (h.cb ? h.cb.units.filter((v) => !v.dead && v !== h.u && links(h).includes(linkId(v))) : []);
const isLinked = (h: Holder, t: Unit) => t !== h.u && links(h).includes(linkId(t));
const maxLinks = (c: Character | null | undefined) => ((c?.skills?.will_power || 0) >= 5 ? 2 : 1);
function addLink(h: Holder, id: string) {
  const c = h.c!, st = charState(c), sc = sceneOf(h); const ids = st.links?.scene === sc ? [...st.links.ids] : [];
  if (!ids.includes(id)) { ids.push(id); while (ids.length > maxLinks(c)) ids.shift(); }
  st.links = { scene: sc, ids };
}
// Link (K25, PROVISIONAL, audit 1-4): 1 AP: bind your heart to an ally on your side within 6 tiles that you can see
// (any PC-side unit: the twin and companions too) for the scene, or until you're Downed. Two links from Will Power 5;
// a new link past the limit replaces the oldest. No leash. Story: link to another character in the scene.
register({
  id: 'heartbinder.link', claims: 'all',
  actions: [
    { id: 'link', label: 'Link', scope: ['combat', 'world'], target: 'ally', ap: 1, range: 6,
      text: 'Bind your heart to an ally within 6 tiles for the scene (two links from Will Power 5).',
      preview: (h, a) => { const t = unitById(h.cb!, a.targetId); if (!t) return {}; if (t === h.u) return { ok: false, why: 'Link to someone else.' }; if (!unitSees(h.cb!, h.u!, t.pos)) return { ok: false, why: 'You can\'t see them.' }; return { lines: [links(h).length >= maxLinks(h.c) ? 'Replaces your oldest link.' : 'Linked for the scene.'] }; },
      run: (h, a) => { const t = unitById(h.cb!, a.targetId)!; addLink(h, linkId(t)); emitFx(h.cb!, 'stance', { unit: h.u!.id, at: h.u!.pos, what: 'link', target: t.id }); say(h.cb, h.u!.name + ' binds their heart to ' + t.name + ' (Link).'); return null; } },
    { id: 'link_story', label: 'Link', pick: 'squad', pickLabel: 'The squadmate', scope: ['story'], target: 'none', ap: 0,
      text: 'Bind your heart to another character here for the scene.',
      preview: (h, a) => (!a.choice || !h.g?.characters?.[a.choice] || a.choice === h.c?.id ? { ok: false, why: 'Pick another character (choice).' } : {}),
      run: (h, a) => { addLink(h, a.choice!); const t = h.g.characters[a.choice!]; postStory(h, h.c!.name + ' binds their heart to ' + t.name + '.'); if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Link in the story: is ' + t.name + ' close enough to bind to? (refuse to undo)'); return null; } },
  ],
  on: { on_downed: (ctx, h) => { if (ctx.victim !== h.u || !h.c) return; if (links(h).length) { delete charState(h.c).links; say(ctx.cb, h.u!.name + '\'s links snap as they fall.'); } } },
  brief: () => 'Link: in a story scene, rule whether the ally is close enough to bind.',
});
let MIRROR = false, SHARING = false;
// Through (K26, PROVISIONAL, audit 1-3; rules 1.5): your Outbursts can go off from a linked ally's place: "Cast through
// a link" is a snap cast (Begin and Release at once, 3 AP, ×0.6) and "Release through a link" lets your held Outburst
// go at the stage it reached (1 AP). Range, sight and the shape (a Wave's cone, a Lance's line, an Aura around them)
// all run from the ally's tile, as if you stood there; the ally is never in its own Aura. Heals, shields and the
// Guarded or Inspired boons you receive (whatever their source) reach every linked ally at half (a boon for half its
// rounds, at least 1).
function linkFrom(h: Holder, a: ActionArgs): Unit | string {
  const ls = linkedUnits(h); if (!ls.length) return 'Link to an ally first.';
  const pick = a.targetIds?.[0] ? ls.find((x) => x.id === a.targetIds![0]) : ls[0]; return pick || 'That ally isn\'t linked.';
}
/** Run f with the caster standing on the ally's tile (range, sight and the shape from there), then back. */
function fromLink<T>(u: Unit, f0: Unit, f: () => T): T { const was = u.pos; u.pos = f0.pos; try { return f(); } finally { u.pos = was; } }
register({
  id: 'heartbinder.through', claims: 'all',
  actions: [
    { id: 'begin_through', label: 'Cast through a link', scope: ['combat', 'world'], target: 'tile', ap: 0,
      text: 'Snap-cast an Outburst (Begin and Release at once, ×0.6) from a linked ally\'s place.',
      available: (h) => (!h.u?.mg?.designs?.length ? false : !linkedUnits(h).length ? 'Link to an ally first.' : true),
      preview: (h, a) => {
        const u = h.u!, cb = h.cb!, f = linkFrom(h, a); if (typeof f === 'string') return { ok: false, why: f };
        const d = u.mg!.designs.find((x) => x.id === a.choice); if (!d) return { ok: false, why: 'Pick a design (choice).' };
        const aim = aimOf(cb, a, 'tile'); if (!aim) return { ok: false, why: 'Pick a target tile.' };
        const pv = fromLink(u, f, () => previewOutburst(cb, u, d.id, aim, true)); return pv.ok ? { lines: ['From ' + f.name + ': ' + pv.ap + ' AP, ' + pv.cost + ' MP, ×0.6.'] } : { ok: false, why: pv.why };
      },
      run: (h, a, rng) => { const u = h.u!, cb = h.cb!, f = linkFrom(h, a) as Unit, d = u.mg!.designs.find((x) => x.id === a.choice)!; say(cb, u.name + ' casts through ' + f.name + '.'); const e = fromLink(u, f, () => beginOutburst(cb, rng, u, d.id, aimOf(cb, a, 'tile')!, false)); if (!e) checkOver(cb); return e; } },
    { id: 'release_through', label: 'Release through a link', scope: ['combat', 'world'], target: 'tile', ap: 0,
      text: 'Release your held Outburst from a linked ally\'s place, at the stage it reached.',
      available: (h) => (!h.u?.mg?.held ? false : !linkedUnits(h).length ? 'Link to an ally first.' : true),
      preview: (h, a) => {
        const u = h.u!, cb = h.cb!, f = linkFrom(h, a); if (typeof f === 'string') return { ok: false, why: f };
        const d = u.mg!.designs.find((x) => x.id === u.mg!.held!.design); if (!d) return { ok: false, why: 'Nothing held.' };
        const aim = aimOf(cb, a, 'tile'), e = fromLink(u, f, () => aimFrom(cb, u, d, f.pos, aim)); return e && formOf(d) !== 'aura' && formOf(d) !== 'wave' && formOf(d) !== 'lance' ? { ok: false, why: e } : { lines: ['From ' + f.name + ': 1 AP, stage ' + u.mg!.held!.stage + ' (×' + stageMult(u.mg!.held!.stage) + ').'] };
      },
      run: (h, a, rng) => { const u = h.u!, cb = h.cb!, f = linkFrom(h, a) as Unit; say(cb, u.name + ' releases through ' + f.name + '.'); const e = fromLink(u, f, () => releaseOutburst(cb, rng, u, aimOf(cb, a, 'tile') || f.pos)); if (!e) checkOver(cb); return e; } },
  ],
  on: {
    heal_given: (ctx, h) => { if (MIRROR || ctx.t !== h.u || ctx.n <= 1 || !onGrid(h)) return; MIRROR = true; try { for (const x of linkedUnits(h)) say(ctx.cb, 'Through the link' + heal(x, Math.floor(ctx.n / 2), ctx.cb, h.u!) + '.'); } finally { MIRROR = false; } },
    shield_grant: (ctx, h) => { if (MIRROR || ctx.t !== h.u || ctx.n <= 1 || !onGrid(h)) return; MIRROR = true; try { for (const x of linkedUnits(h)) say(ctx.cb, 'Through the link, ' + x.name + ' is shielded (' + grantShield(ctx.cb, x, Math.floor(ctx.n / 2), ctx.by) + ').'); } finally { MIRROR = false; } },
    cond_landed: (ctx, h) => {
      if (MIRROR || ctx.t !== h.u || !['guarded', 'inspired'].includes(ctx.id) || !onGrid(h)) return; MIRROR = true;
      try { for (const x of linkedUnits(h)) say(ctx.cb, 'Through the link' + applyCond(ctx.cb, rngOf(h, ctx), ctx.by || h.u!, x, ctx.id, Math.max(1, Math.floor((ctx.rounds || 2) / 2)), undefined, { skipSave: true }) + '.'); } finally { MIRROR = false; }
    },
  },
  brief: () => null,
});
// Share (K27, PROVISIONAL, audit 1-4): your reaction (one a round, shared with Overwatch and the rest): when a linked
// ally takes damage (after its armour and shield), you take half of it (rounded down) yourself, straight through the heart
// (no armour or shield of yours). The engine has no off-turn prompt, so a setting decides: always (default) or never.
// Heals you give a linked ally are ×1.25. A linked ally Downed: you take 2 Strain (it can short). Rules 1.5, the links
// share the heart's load too (item 530): Strain that would take a linked ally over their Strain limit comes to you
// instead, as far as your own limit allows (you never go over your limit for them); "Take their Strain" (1 AP, once a
// turn) moves up to 2 of a linked ally's Strain to you, as far as your limit allows.
register({
  id: 'heartbinder.share', claims: 'all',
  on: {
    damage_in: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t; if (!u || !onGrid(h) || ctx.phase !== 'shield' || ctx.src?.shared || !alive(u) || !isLinked(h, t) || cs(h.c).shareMode === 'never') return;
      const left = Math.max(0, ctx.dmg - (t.shield || 0)), take = Math.floor(left / 2); if (take <= 0 || !canReact(ctx.cb, u)) return;
      useReaction(ctx.cb, u); ctx.dmg -= take;
      const r = applyDamage(ctx.cb, u, take, { by: ctx.src.by || null, type: 'shared', shared: true, shield: false, credit: 'none' });
      say(ctx.cb, u.name + ' takes ' + r.dealt + ' of ' + t.name + '\'s wound through the link (Share).');
    },
    heal_in: (ctx, h) => { if (ctx.by !== h.u || !onGrid(h) || !isLinked(h, ctx.t)) return; ctx.n *= 1.25; },
    on_downed: (ctx, h) => { const u = h.u, v: Unit = ctx.victim; if (!u || !onGrid(h) || !isLinked(h, v) || !alive(u)) return; say(ctx.cb, u.name + ' feels ' + v.name + ' fall through the link (+2 Strain)' + strainUp(ctx.cb, rngOf(h), u, 2, 'a linked ally fell') + '.'); },
    // The links carry Strain: what would take a linked ally over their limit is yours, as far as your own limit allows.
    strain: (ctx, h) => {
      const u = h.u, t: Unit = ctx.u, m = u?.mg, tm = t?.mg; if (!u || !m || !tm || SHARING || !onGrid(h) || !alive(u) || !isLinked(h, t) || cs(h.c).shareMode === 'never' || ctx.n <= 0) return;
      const over = tm.strain + ctx.n - (ctx.limit ?? tm.strainLimit), room = Math.max(0, m.strainLimit - m.strain), n = Math.min(over, room, ctx.n); if (n <= 0) return;
      ctx.n -= n; SHARING = true; try { say(ctx.cb, u.name + ' takes ' + n + ' of ' + t.name + '\'s Strain through the link (Share)' + strainUp(ctx.cb, rngOf(h, ctx), u, n, 'shared through a link') + '.'); } finally { SHARING = false; }
    },
  },
  actions: [{ id: 'share_mode', label: 'Share: always / never', pick: ['always', 'never'], pickLabel: 'Always or never', scope: ['combat', 'world', 'story'], target: 'none', ap: 0,
    text: 'Choose whether you take half of a linked ally\'s wounds, and the Strain that would take them over their limit, automatically: always or never.',
    preview: (h, a) => (['always', 'never'].includes(a.choice || '') ? { lines: ['Share: ' + a.choice + '.'] } : { ok: false, why: 'Choose always or never.' }),
    run: (h, a) => { charState(h.c).shareMode = a.choice; const line = (h.c?.name || '') + ' will ' + (a.choice === 'never' ? 'not ' : '') + 'share their links\' wounds.'; if (h.cb) say(h.cb, line); else postStory(h, line, { private: true }); return null; } },
  { id: 'take_strain', label: 'Take their Strain', scope: ['combat'], target: 'ally', ap: 1, uses: { per: 'per_turn', n: 1 },
    text: 'Move up to 2 of a linked ally\'s Strain to yourself (as far as your Strain limit allows).',
    available: (h) => (!h.u?.mg ? false : !linkedUnits(h).some((x) => (x.mg?.strain || 0) > 0) ? 'No linked ally carries Strain.' : true),
    preview: (h, a) => { const t = unitById(h.cb!, a.targetId), m = h.u!.mg!; if (!t || !isLinked(h, t) || !t.mg) return { ok: false, why: 'Pick a linked ally.' }; const n = Math.min(2, t.mg.strain, Math.max(0, m.strainLimit - m.strain)); return n > 0 ? { lines: [t.name + ' Strain −' + n + '; yours +' + n + ' (' + (m.strain + n) + '/' + m.strainLimit + ').'] } : { ok: false, why: 'No room under your limit.' }; },
    run: (h, a, rng) => {
      const u = h.u!, m = u.mg!, cb = h.cb!, t = unitById(cb, a.targetId)!, tm = t.mg!, n = Math.min(2, tm.strain, Math.max(0, m.strainLimit - m.strain)); if (n <= 0) return 'No room under your limit.';
      tm.strain -= n; emit(cb, 'strain_change', { u: t, from: tm.strain + n, to: tm.strain, why: 'shared', limit: tm.strainLimit, cb });
      emitFx(cb, 'calm', { unit: t.id, at: t.pos, way: 'shared', by: n, strain: tm.strain });
      SHARING = true; try { say(cb, u.name + ' takes ' + n + ' Strain from ' + t.name + ' through the link' + strainUp(cb, rng, u, n, 'shared through a link') + '.'); } finally { SHARING = false; }
      return null;
    } }],
  brief: () => 'Share: in a story, a linked ally\'s wound may be split with the Heartbinder.',
});

// =============================================================================================== VESSEL
// Inner Charge (K28, PROVISIONAL, audit 1-6; rules 1.5, item 531): Begin's 2 AP, 20 MP (× the air's cost band; from the
// air without an Emanator, +2 Strain), 1 Strain (2 in Flooded air): take a body form and hold it like an Outburst. A
// form starts at stage 1 and reads the 1.5 stage table (×1, ×1.4, ×1.8, ×2.2 at stage 4); it swells a stage at your
// turn start and strains you 1 each (2 Flooded). "Pump a form" (1 AP, or one of Empathy's free Pumps) adds a stage to
// one form. Iron armour +10, Surge melee and unarmed damage +15, Swift Movement +2, Steady no Prone or push and +2 Body
// saves, Heartbeat heal 10 at turn start: each × its stage multiplier. Pain to Power: +1 AP next turn per 20 damage
// taken, at most +2 (the stage doesn't raise it). At most two forms at once (no third from Will Power 5), each once. No slipping (rules
// 1.5: being hurt no longer loosens the heart). A Mana Short ends them all. Forms are kept on the character for the
// scene (taken on the area map they carry into a fight). Silenced: no new form and no Pump.
type Form = 'iron' | 'surge' | 'swift' | 'pain' | 'steady' | 'heartbeat';
const FORMS: Record<Form, string> = { iron: 'Iron', surge: 'Surge', swift: 'Swift', pain: 'Pain to Power', steady: 'Steady', heartbeat: 'Heartbeat' };
/** A Vessel holds at most two body forms at once, whatever its Will Power (rules 1.5 follow-up, item 550; the Will Power 5
 * third form is retired). */
const MAX_FORMS = 2;
const TOO_MANY = 'You hold ' + MAX_FORMS + ' forms already: a Vessel holds at most ' + MAX_FORMS + '.';
/** The forms held this scene. A save from before item 550 can hold three: the extra ones (the latest taken) are dropped
 * on the next read, so the retired third form can't swell or add to a Release. */
function formsOf(h: { c?: Character | null; g?: any }): { form: Form; stage: number }[] {
  const st = cs(h.c).vessel; if (!st || st.scene !== sceneOf(h)) return [];
  if (st.forms.length > MAX_FORMS && h.c) st.forms = st.forms.slice(0, MAX_FORMS);
  return st.forms;
}
function setForms(h: { c?: Character | null; g?: any }, forms: { form: Form; stage: number }[]) { charState(h.c).vessel = { scene: sceneOf(h), forms }; }
/** A form's multiplier: the 1.5 stage table (magic.ts STAGE_MULT). A form is never below stage 1. */
const vesselMult = (stage: number) => stageMult(Math.max(1, stage));
const fm = (h: Holder, f: Form) => { const x = formsOf(h).find((y) => y.form === f); return x ? vesselMult(x.stage) : 0; };
/** Apply the forms' standing numbers to the unit (armour, Movement), idempotently. */
function vSync(h: Holder) {
  const u: any = h.u; if (!u) return; const d = u.vsl || { armour: 0, move: 0 };
  const want = { armour: Math.round(10 * fm(h, 'iron')), move: 2 * fm(h, 'swift') };
  if (want.armour !== d.armour) u.armour += want.armour - d.armour;
  if (want.move !== d.move) { u.movement += want.move - d.move; if (u.baseMove != null) u.baseMove += want.move - d.move; }
  u.vsl = want;
}
function endForms(cb: Combat, u: Unit, why: string) {
  const h = holderOf({ u, cb }, 'vessel.inner_charge'); if (!h || !formsOf(h).length) return;
  setForms(h, []); vSync({ ...h, cb }); say(cb, u.name + '\'s body forms gutter out (' + why + ').');
}
register({
  id: 'vessel.inner_charge', claims: 'all',
  actions: [
    { id: 'inner_charge', label: 'Inner Charge', pick: Object.keys(FORMS), pickLabel: 'The body form', scope: ['combat', 'world'], target: 'none', ap: () => SOUL_AP.begin,
      text: 'Take a body form (iron, surge, swift, pain, steady, heartbeat): 20 MP, 1 Strain; it grows each turn like an Outburst.',
      available: (h) => (!h.u?.mg ? 'Needs a heart that knows the body (an Emanator or the air).' : condOn(h.u, 'silenced') ? 'Silenced.' : formsOf(h).length >= MAX_FORMS ? TOO_MANY : true),
      preview: (h, a) => {
        const f = a.choice as Form; if (!FORMS[f]) return { ok: false, why: 'Choose iron, surge, swift, pain, steady or heartbeat.' };
        if (formsOf(h).some((x) => x.form === f)) return { ok: false, why: FORMS[f] + ' is already held.' };
        if (formsOf(h).length >= MAX_FORMS) return { ok: false, why: TOO_MANY };
        const m = h.u!.mg!, cost = Math.round(20 * (manaBand(manaOf(h.cb!)).soul_cost_mult ?? 1)); if (m.emanator && m.mp < cost) return { ok: false, why: 'Needs ' + cost + ' MP.' };
        return { lines: [FORMS[f] + ': ' + cost + ' MP, 1 Strain; grows each turn.'] };
      },
      run: (h, a, rng) => {
        const u = h.u!, cb = h.cb!, m = u.mg!, f = a.choice as Form, cost = Math.round(20 * (manaBand(manaOf(cb)).soul_cost_mult ?? 1));
        if (m.emanator) m.mp -= cost; else shiftMana(cb, -Math.ceil(cost / 10)); m.cast = true;
        setForms(h, [...formsOf(h), { form: f, stage: 1 }]); vSync(h);
        emitFx(cb, 'outburst', { unit: u.id, at: u.pos, design: 'form_' + f, school: 'buff', hold: true, stage: 1 });
        say(cb, u.name + ' draws the heart into the body: ' + FORMS[f] + ' (' + cost + ' MP' + (m.emanator ? '' : ' from the air') + ').' + strainUp(cb, rng, u, (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) + (m.emanator ? 0 : 2), 'Inner Charge'));
        return null;
      } },
    { id: 'pump_form', label: 'Pump a form', pick: Object.keys(FORMS), pickLabel: 'The body form', scope: ['combat', 'world'], target: 'none',
      ap: (h) => ((h.u?.mg?.freePumps || 0) > 0 ? 0 : SOUL_AP.pump),
      text: 'Pump one held body form: +1 stage (to 4). 1 AP, or one of Empathy\'s free Pumps.',
      available: (h) => (!h.u?.mg ? false : !formsOf(h).length ? 'Hold a body form first.' : condOn(h.u, 'silenced') ? 'Silenced.' : true),
      preview: (h, a) => {
        const x = formsOf(h).find((y) => y.form === a.choice); if (!x) return { ok: false, why: 'Pick a form you hold.' };
        if (x.stage >= MAX_STAGE) return { ok: false, why: FORMS[x.form] + ' is full (stage ' + MAX_STAGE + ').' };
        return { lines: [FORMS[x.form] + ': stage ' + x.stage + ' → ' + (x.stage + 1) + ' (×' + vesselMult(x.stage + 1) + ')' + ((h.u!.mg!.freePumps || 0) > 0 ? ', a free Pump' : '') + '.'] };
      },
      run: (h, a) => {
        const u = h.u!, cb = h.cb!, m = u.mg!, fs = formsOf(h).map((y) => ({ ...y })), x = fs.find((y) => y.form === a.choice)!;
        const free = (m.freePumps || 0) > 0; if (free) m.freePumps = (m.freePumps || 0) - 1; m.cast = true;
        x.stage = Math.min(MAX_STAGE, x.stage + 1); setForms(h, fs); vSync(h);
        emitFx(cb, 'pump', { unit: u.id, at: u.pos, stage: x.stage, mult: vesselMult(x.stage), free, max: x.stage >= MAX_STAGE, tone: 'raw', form: x.form });
        say(cb, u.name + ' pumps the heart into ' + FORMS[x.form] + ': stage ' + x.stage + ' (×' + vesselMult(x.stage) + ')' + (free ? ', a free Pump (Empathy)' : '') + '.');
        return null;
      } },
    { id: 'inner_charge_story', label: 'Inner Charge', pick: Object.keys(FORMS), pickLabel: 'The body form', scope: ['story'], target: 'none', ap: 0,
      text: 'Take a body form before the trouble starts (20 MP): it lasts the scene and carries into a fight.',
      preview: (h, a) => (!FORMS[a.choice as Form] ? { ok: false, why: 'Choose a form.' } : formsOf(h).length >= MAX_FORMS ? { ok: false, why: TOO_MANY } : formsOf(h).some((x) => x.form === a.choice) ? { ok: false, why: FORMS[a.choice as Form] + ' is already held.' } : (h.c!.mp ?? 0) < 20 ? { ok: false, why: 'Needs 20 MP.' } : {}),
      run: (h, a) => { const c = h.c!, f = a.choice as Form; c.mp = (c.mp ?? 0) - 20; setForms(h, [...formsOf(h), { form: f, stage: 1 }]); postStory(h, c.name + ' takes ' + FORMS[f] + ' into the body.'); if (h.g) pendRuling(h.g, c, h.key, c.name + ' holds ' + FORMS[f] + ' (a body form): rule what it does in the scene (Iron against a falling crate, Steady against a shove).'); return null; } },
  ],
  on: {
    combat_start: (ctx, h) => { if (h.u) vSync({ ...h, cb: ctx.cb }); },
    turn_start_pre: (ctx, h) => {
      const u = h.u, st = stateOf(h); if (ctx.u !== u || !onGrid(h)) return; const p = st.pain || 0; st.pain = 0;
      const n = fm(h, 'pain') ? Math.min(2, Math.floor(p / 20)) : 0; if (n) ctx.grants.push({ n, why: 'Pain to Power' });
    },
    turn_start: (ctx, h) => {
      const u = h.u!, cb = h.cb!; if (ctx.u !== u || !onGrid(h) || u.downed) return; const fs = formsOf(h); if (!fs.length) return;
      const grown = fs.map((x) => ({ ...x, stage: Math.min(MAX_STAGE, x.stage + 1) })); setForms(h, grown); vSync(h);
      emitFx(cb, 'swell', { unit: u.id, at: u.pos, stage: Math.max(...grown.map((x) => x.stage)), mult: vesselMult(Math.max(...grown.map((x) => x.stage))), tone: 'raw', forms: grown.map((x) => x.form) });
      const hb = fm(h, 'heartbeat'); let line = u.name + '\'s forms grow (' + grown.map((x) => FORMS[x.form] + ' ' + x.stage).join(', ') + ')';
      if (hb) line += heal(u, 10 * hb * (u.mg?.healMult || 1), cb, u);
      say(cb, line + '.' + strainUp(cb, rngOf(h, ctx), u, grown.length * (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1), 'holding body forms'));
    },
    // Pain to Power counts what you take. Rules 1.5: no slipping (a hit no longer loosens a form).
    on_damaged: (ctx, h) => { if (ctx.t !== h.u || !onGrid(h)) return; const st = stateOf(h); st.pain = (st.pain || 0) + ctx.dmg; },
    damage_out: (ctx, h) => { if (ctx.att !== h.u || !ctx.melee) return; const s = fm(h, 'surge'); if (s) ctx.add += 15 * s; },
    forced_move: (ctx, h) => { if (ctx.u !== h.u || !fm(h, 'steady')) return; ctx.cancel = true; say(ctx.cb, h.u!.name + ' stands Steady: not moved.'); },
    cond_apply: (ctx, h) => {
      if (ctx.t !== h.u) return; const s = fm(h, 'steady'); if (!s) return;
      if (ctx.id === 'prone') { ctx.cancel = true; ctx.why = 'Steady'; return; }
      if (ctx.fam === 'body') ctx.saveAdd = (ctx.saveAdd || 0) + 2 * s;
    },
    combat_end: (ctx, h) => { const u: any = h.u; if (u?.vsl) { u.armour -= u.vsl.armour; u.movement -= u.vsl.move; u.vsl = { armour: 0, move: 0 }; } },
  },
  brief: (h) => { const fs = formsOf(h); return fs.length ? 'Body forms held: ' + fs.map((x) => FORMS[x.form] + ' ' + x.stage).join(', ') + '; rule them in story beats.' : null; },
});
// Release (K29, PROVISIONAL, audit 1-4; rules 1.5, item 532): 1 AP (a melee attack roll with your fists or melee
// weapon), or free with a melee hit (a toggle on the attack): every form ends in one strike. Each form adds 15 Soul
// damage × its stage multiplier (stage 1 ×1 … stage 4 ×2.2), summed, × your Soul multiplier, armour ignored (1.2's
// +15 a stage capped at 8 stages is gone: two stage-4 forms are 66 before the multiplier). The forms end on a miss too.
const releaseSum = (h: Holder) => formsOf(h).reduce((a, x) => a + 15 * vesselMult(x.stage), 0);
function releaseRider(h: Holder, t: Unit, rng: Rng): string {
  const u = h.u!, cb = h.cb!, fs = formsOf(h); if (!fs.length) return '';
  const sum = releaseSum(h), n = fs.length; setForms(h, []); vSync(h);
  emitFx(cb, 'release', { unit: u.id, at: u.pos, to: t.pos, school: 'damage', form: 'bolt', tone: 'raw', element: null, stage: Math.max(...fs.map((x) => x.stage)), body: true, targets: [t.id], area: [t.pos] });
  if (t.dead) return ' · the forms release into nothing';
  return ' · RELEASE (' + n + ' form' + (n === 1 ? '' : 's') + ', ' + Math.round(sum) + ')' + harm(cb, rng, u, t, sum * (u.mg?.soulMult || 1), 'soul');
}
register({
  id: 'vessel.release_strike', claims: 'all',
  toggles: [{ id: 'release', label: 'Release every form on a hit (+15 Soul × each stage)', on: ['combat/attack'], available: (h) => (formsOf(h).length ? true : false) }],
  actions: [{
    id: 'release_strike', label: 'Release', scope: ['combat', 'world'], target: 'enemy', ap: 1,
    text: 'End every body form in one strike: a melee attack, +15 Soul damage × each form\'s stage multiplier.',
    available: (h) => (!formsOf(h).length ? 'Hold a body form first.' : true),
    preview: (h, a) => { const t = unitById(h.cb!, a.targetId); if (!t) return {}; const pv = previewAttack(h.cb!, h.u!, t, 'melee', { free: true }); return pv.ok ? { lines: [pv.pct + '% to hit; +' + Math.round(releaseSum(h) * (h.u!.mg?.soulMult || 1)) + ' Soul on a hit.'] } : { ok: false, why: pv.why }; },
    run: (h, a, rng) => {
      const u = h.u!, cb = h.cb!, t = unitById(cb, a.targetId)!; stateOf(h).releasing = true;
      let res; try { res = resolveAttack(cb, rng, u, t, 'melee', null, { free: true }); } finally { stateOf(h).releasing = false; }
      if (res.hit) say(cb, u.name + ' lets it all go' + releaseRider(h, t, rng) + '.'); else { setForms(h, []); vSync(h); say(cb, u.name + '\'s forms break loose on the miss.'); }
      checkOver(cb); return null;
    },
  }],
  on: {
    on_hit: (ctx, h) => {
      if (ctx.att !== h.u || !ctx.melee || stateOf(h).releasing || !modOn(h, 'release') || !formsOf(h).length) return;
      say(ctx.cb, h.u!.name + ' lets it all go on the blow' + releaseRider(h, ctx.tgt, rngOf(h, ctx)) + '.');
    },
  },
  brief: () => 'Release: a story finisher with the Vessel\'s forms is yours to rule.',
});
// Empty Hand (Vessel, K30, PROVISIONAL, audit 1-3): unarmed strikes deal 20 Physical at least for 2 AP (no hands rule,
// no Defense). The Vessel can't Begin or Release Outbursts (MP, Syphon, Crystallise and Strain stay), nor design them
// (game.ts designBan refuses magic/design; the Magic panel hides it); existing designs stay but can't be cast.
register({
  id: 'vessel.vessel_hands', claims: 'all',
  on: {
    damage_out: (ctx, h) => { if (ctx.att !== h.u || !unarmed(h.u!, ctx.mode)) return; const w = WEAPON[ctx.src?.weapon]; if (w?.category !== 'unarmed') return; if (ctx.base + ctx.add < 20) ctx.add += 20 - (ctx.base + ctx.add); },
    outburst_cost: (ctx, h) => { if (ctx.u === h.u) ctx.fail ||= 'A Vessel casts no Outbursts: the charge lives in the body.'; },
  },
  brief: () => null,
});

// =============================================================================================== TWINBOUND
// Manifest (K31, PROVISIONAL, audit 1-3): once, out of a fight: design the twin: its portrait and three built-in
// Outbursts from the schools and modules you know (module slots and the second school as for any design). They don't
// count against your ready designs, and they're fixed forever (no re-manifest, even after it falls). In game text it is
// only ever "the twin" and never speaks of where it comes from.
const TWIN_NAME = 'the twin';
/** The twin's own heart (rules 1.5, item 533): a copy of its caller's Soul numbers (Soul multiplier, Will Power, reach,
 * saving…) holding the twin's three designs, with nothing held, no free Pumps (the twin has no Empathy of its own) and
 * no Strain of its own: everything it would take goes to its caller (the 'strain' hook below), and its MP is its
 * caller's (synced at each Begin). So the twin Begins, Pumps, holds (it swells on its own turn) and Releases with the
 * engine's own Soul actions (combat/outburst, combat/pump, combat/release… with its unit id), at its own stage. */
function twinMagic(o: Unit, designs: OutburstDesign[]): MagicUnit | undefined {
  const m = o.mg; if (!m) return undefined;
  const c: MagicUnit = JSON.parse(JSON.stringify(m));
  return Object.assign(c, { words: [], designs: designs.map((d) => migrateDesign({ ...d, modules: [...(d.modules || [])] })), evoker: false, charge: 0, cores: 0, coresMade: 0, flux: 0,
    held: null, strain: 0, cast: false, freePumps: 0, freePumpsMax: 0, debt: 0, calmFight: false, calmTend: false });
}
const twinOf = (cb: Combat, owner: Unit) => cb.units.find((x) => (x as any).twinOf === owner.id && !x.dead) || null;
const twinOwner = (cb: Combat, t: Unit) => unitById(cb, (t as any).twinOf);
register({
  id: 'twinbound.manifest', claims: 'all',
  actions: [{
    id: 'manifest', label: 'Manifest the twin', scope: ['story', 'world'], target: 'text', ap: 0, uses: { per: 'per_campaign', n: 1 },
    text: 'Once: design the twin\'s three built-in Outbursts from the schools and modules you know. They are fixed for the campaign.',
    available: (h) => (!h.c ? false : cs(h.c).twin ? 'The twin is already manifest.' : h.cb && !overworld(h.cb) ? 'Out of a fight.' : true),
    preview: (h, a) => { const r = twinDesigns(h.c!, a.text); return typeof r === 'string' ? { ok: false, why: r } : { lines: ['The twin: ' + r.designs.map((d) => d.name).join(', ') + '.'] }; },
    run: (h, a) => {
      const c = h.c!, r = twinDesigns(c, a.text); if (typeof r === 'string') return r;
      charState(c).twin = r;
      const line = c.name + '\'s twin leans through for the first time: ' + r.designs.map((d) => d.name).join(', ') + '.';
      if (h.cb) say(h.cb, line); postStory(h, line);
      if (h.g) pendRuling(h.g, c, h.key, 'Describe the moment the twin first leans through. It is only ever "the twin"; it never speaks of where it comes from.');
      return null;
    },
  }],
  brief: () => 'Twinbound: it is only ever "the twin"; it never speaks of where it comes from.',
});
function twinDesigns(c: Character, text: string | undefined): { portrait: string; designs: OutburstDesign[] } | string {
  let portrait = c.portrait || '', raw: any[] = [];
  const s = String(text || '').trim();
  try { const j = JSON.parse(s); portrait = j.portrait || portrait; raw = j.designs || []; } catch { raw = s.split(';').map((x) => parseDesign(x)).filter(Boolean) as any[]; }
  if (raw.length !== 3) return 'Give the twin exactly three Outbursts.';
  const out: OutburstDesign[] = [];
  for (let i = 0; i < 3; i++) { const d = checkDesign(c, raw[i], 0, 'tw' + (i + 1)); if (typeof d === 'string') return 'Outburst ' + (i + 1) + ': ' + d; out.push({ ...d, name: String(raw[i].name || 'The twin\'s ' + SCHOOL[d.school].name).slice(0, 40) }); }
  return { portrait, designs: out };
}
// Call (K32, PROVISIONAL, audit 1-6; rules 1.5): 2 AP: the twin appears on a free tile within 3 and takes its own turn
// right after yours with 4 AP: move (Movement 1.5), work its three Outbursts with its own heart (Begin, Pump, hold,
// Release at its own stage; your MP and your Strain; it and you may each hold one), or Guard you (1 AP: it takes the next attack aimed at you while within 1 tile, until your
// next turn). HP half your maximum, your Defense, your Will Power for its rolls. It can't go more than 6 tiles from you
// (if you move away it follows to the nearest free tile within 6). It can be healed and shielded; it is never Downed.
// When you're Downed it fades (no Strain). Kills it makes count as its own (no XP for the twin). Call is barred while
// it is out, and after it fell this scene.
const twinHeld = { perks: [], traits: [], cls: null, rank: 1, adv: 'twinbound' };
register({
  id: 'twinbound.call', claims: 'all',
  actions: [
    { id: 'call', label: 'Call the twin', scope: ['combat'], target: 'tile', ap: 2,
      text: 'The twin appears within 3 tiles and acts after you with 4 AP.',
      available: (h) => (!h.u || isTwin(h.u) ? false : !cs(h.c).twin ? 'Manifest the twin first (out of a fight).' : twinOf(h.cb!, h.u) ? 'The twin is already here.' : cs(h.c).twinLost === sceneOf(h) ? 'The twin fell this scene: call it next scene.' : true),
      preview: (h, a) => { const t = aimOf(h.cb!, a, 'tile'); if (!t || dist(t, h.u!.pos) > 3 || !free(h.cb!, t)) return { ok: false, why: 'A free tile within 3.' }; return {}; },
      run: (h, a, rng) => {
        const u = h.u!, cb = h.cb!, c = h.c!, t = aimOf(cb, a, 'tile')!, tw = cs(c).twin;
        const id = 'tw-' + u.id;
        cb.units = cb.units.filter((x) => x.id !== id); cb.order = cb.order.filter((x) => x !== id);
        const x: any = unitFromEnemy(id, TWIN_NAME, 'minion', 'fists', t, rng as any);
        Object.assign(x, { side: u.side, tier: undefined, hp: Math.floor(0.5 * u.maxHp), maxHp: Math.floor(0.5 * u.maxHp), def: u.def, armour: 0, attack: u.mg?.will ?? 0, movement: 1.5,
          init: u.init - 0.4, agility: 1, ctrl: c.id, kind: 'human', tags: ['twin'], short: 'TW', img: tw.portrait || u.img, twinOf: u.id, held: JSON.parse(JSON.stringify(twinHeld)), ap: 0 });
        x.mags = undefined; x.mg = twinMagic(u, tw.designs || []); cb.units.push(x);
        const at = cb.order.indexOf(u.id); cb.order.splice(at + 1, 0, id); if (at + 1 <= cb.turn) cb.turn++;
        emitFx(cb, 'turn', { unit: id, side: u.side, at: t, summon: true });
        say(cb, u.name + ' calls, and ' + TWIN_NAME + ' leans through at ' + refOf(t) + ' (' + x.hp + ' HP).');
        return null;
      } },
    // The area map (the audit's proposal, PROVISIONAL): a token next to you, with its own 4 AP a round spent only on moves
    // (world/act move with its unit id), never more than 6 tiles from you. A fight opened on the area map starts with it
    // beside you as the called twin (combat_start below); in the story its presence is narration.
    { id: 'call_world', label: 'Call the twin', scope: ['world'], target: 'tile', ap: 2,
      text: 'The twin appears within 3 tiles as a token with its own 4 AP a round (moves only); a fight starts with it called.',
      available: (h) => (!h.u || !h.c || isTwin(h.u) ? false : !cs(h.c).twin ? 'Manifest the twin first.' : (h.c.companions || []).some((k) => k.kind === 'twin') ? 'The twin is already here.' : cs(h.c).twinLost === sceneOf(h) ? 'The twin fell this scene: call it next scene.' : true),
      preview: (h, a) => { const t = aimOf(h.cb!, a, 'tile'); if (!t || dist(t, h.u!.pos) > 3 || !free(h.cb!, t)) return { ok: false, why: 'A free tile within 3.' }; return {}; },
      run: (h, a) => {
        const u = h.u!, c = h.c!, g = h.g, t = aimOf(h.cb!, a, 'tile')!, tw = cs(c).twin, hp = Math.floor(0.5 * maxHp(c));
        c.companions = [...(c.companions || []).filter((k) => k.kind !== 'twin'), { id: 'twin', kind: 'twin', name: TWIN_NAME, hp, maxHp: hp, ...(tw.portrait ? { img: tw.portrait } : {}) }];
        if (g) (g.story.positions ||= {})['cp-' + c.id + '-twin'] = t;
        emitFx(h.cb!, 'turn', { unit: 'cp-' + c.id + '-twin', side: u.side, at: t, summon: true });
        say(h.cb, u.name + ' calls, and ' + TWIN_NAME + ' leans through at ' + refOf(t) + ' (' + hp + ' HP).');
        return null;
      } },
    { id: 'dismiss_world', label: 'Let the twin go', scope: ['world', 'story'], target: 'none', ap: 0,
      text: 'The twin fades back (no Strain); call it again when you need it.',
      available: (h) => (!h.c ? false : (h.c.companions || []).some((k) => k.kind === 'twin') ? true : 'The twin isn\'t here.'),
      run: (h) => {
        const c = h.c!; c.companions = (c.companions || []).filter((k) => k.kind !== 'twin'); if (h.g?.story?.positions) delete h.g.story.positions['cp-' + c.id + '-twin'];
        const line = TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' fades back from beside ' + c.name + '.'; if (h.cb) say(h.cb, line); else postStory(h, line);
        return null;
      } },
    { id: 'twin_cast', label: 'The twin casts', scope: ['combat'], target: 'tile', ap: (h, a) => { const d = twinDesign(h, a), m = h.u?.mg; return m && d ? designAp(m, d) + (a.tile ? 1 : 0) : 2; },
      text: 'One of the twin\'s three Outbursts from where it stands (your MP, your Strain): with a target, a snap cast (Begin and Release, ×0.6); without, the twin Begins and holds it (then Pump and Release with the twin).',
      available: (h) => (!h.u || !isTwin(h.u) ? false : !h.u.mg || !twinOwner(h.cb!, h.u)?.mg ? 'Your heart has no magic to lend.' : h.u.mg.held ? 'The twin is holding one: Pump or Release it.' : true),
      preview: (h, a) => {
        const d = twinDesign(h, a); if (!d) return { ok: false, why: 'Pick one of the twin\'s Outbursts (choice: tw1, tw2 or tw3).' };
        const tw = h.u!, aim = aimOf(h.cb!, a, 'tile') || undefined;
        const pv = freeAp(tw, () => previewOutburst(h.cb!, tw, d.id, aim, !!aim)); return pv.ok ? { lines: [d.name + ': ' + pv.cost + ' MP from ' + (twinOwner(h.cb!, tw)?.name || 'you') + ', +' + pv.strain + ' Strain to them' + (aim ? ', ×0.6 now.' : ', held at stage 0.')] } : { ok: false, why: pv.why };
      },
      run: (h, a, rng) => { const d = twinDesign(h, a)!, tw = h.u!, aim = aimOf(h.cb!, a, 'tile') || undefined; say(h.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + (aim ? ' casts ' : ' begins ') + d.name + ' from ' + refOf(tw.pos) + '.');
        const e = freeAp(tw, () => beginOutburst(h.cb!, rng, tw, d.id, aim, !aim)); if (!e) checkOver(h.cb!); return e; } },
    { id: 'twin_guard', label: 'Guard', scope: ['combat'], target: 'none', ap: 1,
      text: 'The twin takes the next attack aimed at you while it stands within 1 tile.',
      available: (h) => (!h.u || !isTwin(h.u) ? false : true),
      run: (h) => { (h.u as any).guarding = true; say(h.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' stands guard.'); return null; } },
  ],
  on: {
    // A twin called on the area map comes into the fight as the called twin: right after you in the order, held items
    // as a twin's (not a companion's: it casts and Guards through the Class tab), and off the area map's list.
    combat_start: (ctx, h) => {
      const u = h.u, c = h.c, cb = h.cb; if (!u || !c || !cb || isTwin(u)) return;
      const tw: any = cb.units.find((x) => x.companion === 'twin' && x.ctrl === c.id); if (!tw) return;
      delete tw.companion; Object.assign(tw, { id: 'tw-' + u.id, twinOf: u.id, movement: 1.5, agility: 1, held: JSON.parse(JSON.stringify(twinHeld)), name: TWIN_NAME, tags: ['twin'], mg: twinMagic(u, cs(c).twin?.designs || []) });
      c.companions = (c.companions || []).filter((k) => k.kind !== 'twin'); if (h.g?.story?.positions) delete h.g.story.positions['cp-' + c.id + '-twin'];
      const old = 'cp-' + c.id + '-twin', o: string[] = (ctx.order as string[]).filter((x) => x !== old), i = o.indexOf(u.id); o.splice(i + 1, 0, tw.id);
      ctx.order = o; cb.order = cb.order.map((x) => (x === old ? tw.id : x));
      say(cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' stands beside ' + u.name + ' (' + tw.hp + ' HP).');
    },
    turn_start_pre: (ctx, h) => { if (!h.u || isTwin(h.u) || !h.cb) return; const tw = twinOf(h.cb, h.u); if (ctx.u === tw) ctx.penalties.push({ n: 2, why: 'the twin acts with 4 AP' }); if (ctx.u === h.u && tw) delete (tw as any).guarding; },
    // One heart, two hands (rules 1.5): the twin's Begin pays from your MP; its Strain is yours.
    outburst_cost: (ctx, h) => { const o = h.u, tw = ctx.u; if (!o || isTwin(o) || !h.cb || tw !== twinOf(h.cb, o) || !tw.mg || !o.mg) return; tw.mg.mp = o.mg.mp; tw.mg.emanator = o.mg.emanator; },
    outburst_begin: (ctx, h) => { const o = h.u, tw = ctx.u; if (!o || isTwin(o) || !h.cb || tw !== twinOf(h.cb, o) || !tw.mg || !o.mg) return; if (o.mg.emanator) o.mg.mp = Math.max(0, tw.mg.mp); },
    strain: (ctx, h) => {
      const o = h.u, tw = ctx.u, cb = ctx.cb; if (!o || isTwin(o) || !cb || tw !== twinOf(cb, o) || !o.mg || ctx.n <= 0) return;
      const n = ctx.n; ctx.n = 0;
      const out = strainUp(cb, rngOf(h, ctx), o, n, 'the twin');
      say(cb, o.name + ' feels the twin\'s pull: +' + n + ' Strain (' + o.mg.strain + '/' + o.mg.strainLimit + ')' + out + '.');
      if (out && tw.mg?.held) { tw.mg.held = null; say(cb, 'The twin\'s heart goes dark with yours: its held Outburst is gone.'); }
    },
    // You and the twin are one heart: your releases don't resonate with each other's (other allies' still do).
    outburst_release: (ctx, h) => {
      const o = h.u, cb = ctx.cb; if (!o || isTwin(o) || !cb || ctx.wild) return; const tw = twinOf(cb, o); if (!tw) return;
      if (ctx.u === tw) ctx.mult = (ctx.mult || 1) * resonanceWithout(cb, tw, o.id, ctx.stage);
      else if (ctx.u === o) ctx.mult = (ctx.mult || 1) * resonanceWithout(cb, o, tw.id, ctx.stage);
    },
    attack_target: (ctx, h) => {
      const u = h.u; if (!u || isTwin(u) || ctx.tgt !== u || !h.cb) return; const tw: any = twinOf(h.cb, u); if (!tw || !tw.guarding || dist(tw.pos, u.pos) > 1 || ctx.att === tw) return;
      tw.guarding = false; ctx.tgt = tw; say(ctx.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' steps in front of ' + u.name + '.');
    },
    move_step: (ctx, h) => {
      const u = h.u; if (!u || isTwin(u) || !h.cb) return; const tw = twinOf(h.cb, u); if (ctx.u !== tw || dist(ctx.at, u.pos) <= 6) return;
      ctx.u.pos = ctx.from; ctx.stop = 'the bond holds it within 6 tiles';
    },
    moved: (ctx, h) => {
      const u = h.u; if (!u || isTwin(u) || ctx.u !== u || !h.cb) return; const tw = twinOf(h.cb, u); if (!tw || dist(tw.pos, u.pos) <= 6) return;
      const spot = around(u.pos, 6).filter((k) => free(h.cb!, k, tw)).sort((a, b) => dist(a, tw.pos) - dist(b, tw.pos))[0];
      if (spot) { tw.pos = spot; say(h.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' follows to ' + refOf(spot) + '.'); }
    },
    on_downed: (ctx, h) => {
      const u = h.u; if (!u || isTwin(u) || ctx.victim !== u || !h.cb) return; const tw = twinOf(h.cb, u); if (!tw) return;
      vanish(h.cb, tw); say(h.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' fades as ' + u.name + ' falls.');
    },
  },
  brief: () => null,
});
function twinDesign(h: Holder, a: ActionArgs): OutburstDesign | null {
  return (h.u?.mg?.designs || []).find((d) => d.id === a.choice) || null;
}
function vanish(cb: Combat, tw: Unit) {
  tw.dead = true; tw.downed = false; tw.hp = 0; (cb.deadSeen ||= []).includes(tw.id) || cb.deadSeen!.push(tw.id); // a twin's loss isn't a death: no bots
  emitFx(cb, 'down', { unit: tw.id, at: tw.pos, dead: true, vanish: true });
}
// Bond (K33, PROVISIONAL, audit 1-3): if the twin would drop to 0 HP it vanishes instead (not Downed; no bots on the
// meter: it isn't a death) and you take 3 Strain (it can short; a natural 1 Downs you); call it again next scene.
register({
  id: 'twinbound.bond', claims: 'all', priority: 300,
  on: {
    damage_in: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t; if (!u || isTwin(u) || ctx.phase !== 'would_drop_to_0' || !h.cb || t !== twinOf(h.cb, u) || ctx.floor != null) return;
      ctx.dmg = 0; vanish(h.cb, t); charState(h.c).twinLost = sceneOf(h);
      say(h.cb, TWIN_NAME[0].toUpperCase() + TWIN_NAME.slice(1) + ' comes apart and is gone; ' + u.name + ' feels it in the heart (+3 Strain)' + strainUp(h.cb, rngOf(h), u, 3, 'the twin fell') + '.');
      note(h, 'The twin fell: narrate the loss as felt in the heart, with no word of where it went.');
    },
  },
  brief: () => 'Bond: narrate the twin\'s loss as felt in the heart; never explain where it went.',
});

void sideSees; void maxHp; void CORE_CHARGE; void (null as unknown as Term);
