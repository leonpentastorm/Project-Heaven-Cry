// Lane D: Sigil, Soul, prayer and music. Perks: Hold the Stroke, Parallel Thought, Heart Overload, Resonance, Rite in
// the Field, Litany, Mirage, You Get Used to It, Shared Breath; Mastered: Clean Draw, The Twin Pays, Solid Image;
// Achieved: Twin Souls, Verse of War, Fire Sermon; Ultimate: Twin Discipline. Traits: Upper-Touched, Sigil Savant,
// Hollow Heart, Heretic, True Believer, Heaven's Faithful, and the three music traits (The Soundscape of the Soul,
// Headbanger, Underground Sound).
//
// Every number the data or the spec doesn't give is provisional and listed in the spec (section 14, tags D…) and docs/design/perk-runtime.md (the open
// items for spec section 14), with the hooks this file works around. Randomness comes from the rng the hook or action
// passes, else the bound game's rng (g.rng). What the engine can't run goes to the Narrator: a fight note, a pending
// ruling, or the item's brief() remainder in the character brief.
import { effNum } from '../effects/num';
import {
  register, stateOf, uses, stampOf, note, pendRuling, postStory, grantPerkAp, modOn, boundGame, charOfUnit, holderOf, type Holder,
} from '../effects';
import { SKILLS, SCHOOL } from '../data';
import { say,
  type Combat, type Unit, dist, xy, key, refOf, alive, active, unitSees, lineOfSight, moveUnit, coverTileFor, objectsOf, standable, emitFx,
} from '../combat';
import {
  applyCond, condOn, condFamily, isBoon, debuffsOf, previewEvoke, previewOutburst, releaseOutburst, spellTargets, manaBand, manaOf, harm, heal,
  condSkillMod, condHit, SPELL_AP, unitSave, groundCap, evokeMarks, addStrain, outburstArea, formOf, riderStage, stageMult, SECOND_SCHOOL, SHORT_AT_OVER,
  RESONANCE_BONUS, resonates, fadePattern, evokeGrowth, practiceOnce, type Affected,
  takeFreeStage, freeStageLeft,
} from '../magic';
import { asBolt, schoolRider, resonanceExtra } from '../classes/soul';
import { blessing, PATRON, PATRONS, reveal, HEARING } from '../tactics';
import { combatPray, ATHEIST_TN } from '../faith';
import { type Character, mod, prayerCooldown, maxSigilWords, migrateDesign } from '../character';
import { songMod, musicTraitOf, startSong } from '../music';
import { makeObject } from '../objects';
import { applyMemOp } from '../memory';
import { die, type Rng } from '../rng';
import { npcsOf, positionsOf, setStoryCond, strikeFromWorld } from '../game';
import { rngOf, tilesLine, foesOf, alliesOf, canStand } from '../kit';
import { rawItem } from '../effects/collect';
import { makeFigment, visFocusWhy, FORM } from '../figments';
import { imageOfOwner } from '../illusion';
import { rollVs, tierSave, TN, SAVE_TN } from '../rolls';
import { pay, refund, canPay, bill } from '../effects/cost';
import { setCondRounds } from '../magic';

// ---------- shared helpers ----------
const ow = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const gameOf = (h: Holder): any => h.g ?? boundGame();
const me = (h: Holder, u: Unit | null | undefined) => !!u && !!h.u && u.id === h.u.id;
const charOf = (h: Holder): Character | null => h.c || charOfUnit(h.u) || null;
const log = (cb: Combat | null | undefined, s: string) => { if (cb) say(cb, s); };
const turnStamp = (h: Holder) => stampOf('per_turn', { cb: h.cb, g: gameOf(h) });
/** Outburst damage (rules 1.5): Soul damage, or an elemental Outburst's (told from a Sigil's by the MP it carries). */
const outburstHit = (src: any) => !!src && (src.type === 'soul' || (src.type === 'elemental' && src.spellMp != null));
/** Whose glyph this is (a 1.3 save's Hold the Stroke tagged pooled glyphs "<unitId>#pool"; rules 1.4 asks 'ground_cap'). */
const glyphOwner = (g: { by: string }) => String(g.by).split('#')[0];
const myZones = (cb: Combat, u: Unit) => (cb.zones || []).filter((z) => z.by === u.id);
/** Placed spells (rules 1.4): a STAY field, a WAIT trap, a WATCH turret (a 1.2 'wall' from an old save counts as a field). */
const PLACED_KINDS = new Set(['field', 'trap', 'turret', 'wall']);
/** "Still active" (spec: Perks in play, Parallel Thought): one of your placed spells stands. Unfired glyphs, VEIL smoke,
 * LIGHT and RAISE walls don't count. */
const placedStanding = (cb: Combat, u: Unit) => myZones(cb, u).some((z: any) => PLACED_KINDS.has(z.kind) && z.left > 0 && (z.kind !== 'turret' || z.hp == null || z.hp > 0));
/** The design heals or shields (Buff heal, or Damage with Inverse on allies). */
const mends = (d: any) => [d.school, d.school2, d.school3].some((s, i) => (s === 'buff' && ((i === 0 ? d.option : i === 1 ? d.option2 : d.option3) || d.option || 'heal') === 'heal')) || (d.modules || []).includes('inverse');
/** The last thing this character said aloud in this round of the fight (combat/say writes "Name (round N): "…""). */
function sayLine(h: Holder): string | null {
  const cb = h.cb, c = charOf(h); if (!cb || !c) return null;
  // The area map: the line this player said this overworld round (the overworld Say: story/speak).
  if (ow(cb)) { const t = gameOf(h)?.story?.spoken?.[c.owner]; return t ? String(t) : null; }
  const head = c.name + ' (round ' + cb.round + '): "';
  const n = [...(cb.notes || [])].reverse().find((x) => x.startsWith(head));
  return n ? n.slice(head.length, -1) : null;
}

// Second Clause and Running Hand (Brain Power α; `hold_the_stroke`, `parallel_thought`): data only since rules 1.56
// (Balance 2.0; data/perks.json). The ground cap and the field-gated cut are in docs/design/move-pool.md.

// Clenched Heart (Will Power α; `heart_overload`): data only since rules 1.56 (the free re-Begin: move-pool.md).

// =====================================================================================================================
// Resonance (Will Power; rules 1.14, item 1012). I: each Outburst you Release gives your NEXT Release in this fight
// +4% to its effect (rules 1.56; it was +10%), building up to +8%. You lose what you have built when you end a turn in which you neither held
// nor Released an Outburst. II: it builds up to +12%, and an ally's Release that you can see adds a step too.
// The bonus multiplies the Release the way its stage does ('outburst_release' mult: damage, healing, shields, the
// second school), and the previews carry it ('release_cost' mult / 'outburst_cost' relMult, with a note).
// The shared Resonance rule of rules 1.5 (allies releasing in the same round: +0.2 each on the stage multiplier, +0.4
// at most) is unchanged and adds to this. Rules 1.5's perk (the wider window) is gone. Readings where the spec is
// silent (PROVISIONAL): a wild release neither uses nor builds it; the Twinbound twin is not "an ally" for tier II.
// =====================================================================================================================
// Rules 1.56 (Balance 2.0): its numbers are its data's (the stat_mod's value, a step in percent, and its limit, the most).
const resStepOf = (h: Holder) => effNum(h, 'stat_mod') / 100;
const resCap = (h: Holder) => Math.floor(effNum(h, 'stat_mod', 'limit') / effNum(h, 'stat_mod'));
/** Steps built (each a step of its data on the next Release), never over this tier's ceiling. */
const resSteps = (h: Holder): number => (ow(h.cb) ? 0 : Math.max(0, Math.min(resCap(h), Math.floor(Number(stateOf(h).steps) || 0))));
const resPct = (h: Holder, n: number) => Math.round(n * resStepOf(h) * 100);
const resMult = (h: Holder, n: number) => 1 + Math.round(n * resStepOf(h) * 100) / 100;
const resNote = (h: Holder, n: number) => 'Resonance +' + resPct(h, n) + '%';
const resBuild = (h: Holder, why: string) => {
  const s = stateOf(h), was = resSteps(h), now = Math.min(resCap(h), was + 1); s.steps = now;
  if (now > was && h.cb) log(h.cb, h.u!.name + '\'s next Release: +' + resPct(h, now) + '% (Resonance' + why + ').');
};
register({
  id: 'resonance', claims: 'all', priority: 50,
  on: {
    // The previews: a held Release, and a snap cast.
    release_cost: (ctx, h) => { const n = resSteps(h); if (me(h, ctx.u) && ctx.preview && n > 0) { ctx.mult = (ctx.mult || 1) * resMult(h, n); if (Array.isArray(ctx.notes)) ctx.notes.push(resNote(h, n)); } },
    outburst_cost: (ctx, h) => { const n = resSteps(h); if (me(h, ctx.u) && ctx.release && n > 0) { ctx.relMult = (ctx.relMult || 1) * resMult(h, n); ctx.relAll = (ctx.relAll || 1) * resMult(h, n); if (Array.isArray(ctx.relNotes)) ctx.relNotes.push(resNote(h, n)); } },
    outburst_begin: (ctx, h) => { if (me(h, ctx.u)) stateOf(h).kept = turnStamp(h); },
    turn_start: (ctx, h) => { if (me(h, ctx.u) && h.u!.mg?.held) stateOf(h).kept = turnStamp(h); },
    outburst_release: (ctx, h) => {
      const u = h.u, r: Unit = ctx.u, cb: Combat = ctx.cb; if (!u || !r || ow(cb) || ctx.wild) return;
      if (me(h, r)) {
        const s = stateOf(h), n = resSteps(h); s.kept = turnStamp(h);
        if (n > 0) { ctx.mult = (ctx.mult || 1) * resMult(h, n); log(cb, u.name + '\'s heart keeps the beat: +' + resPct(h, n) + '% to this Release (Resonance).'); emitFx(cb, 'resonance', { unit: u.id, at: u.pos, with: [], bonus: Math.round(n * resStepOf(h) * 100) / 100, perk: true }); }
        resBuild(h, '');
        return;
      }
      // II: an ally's Release that you can see adds a step too.
      if (h.tier !== 'II' || r.side !== u.side || !alive(u) || (r.ctrl && r.ctrl === u.charId) || !unitSees(cb, u, r.pos)) return;
      resBuild(h, ', from ' + r.name + '\'s Release');
    },
    turn_end: (ctx, h) => {
      if (!me(h, ctx.u) || ow(ctx.cb)) return; const s = stateOf(h);
      if (s.kept === turnStamp(h) || h.u!.mg?.held) return;
      if (resSteps(h) > 0) log(ctx.cb, h.u!.name + '\'s heart falls quiet: the Resonance built is lost.');
      s.steps = 0;
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Rite in the Field (Lore Master): data rows since rules 1.63 (D6): `cost_mod` on the `cost` sites crystallise and steady
// (perks.json rite_in_the_field). Nothing here.
// =====================================================================================================================
// Clean Draw (Mastered, Brain Power 10). Once per combat, 0 AP to arm: while armed, the glyphs you draw cost no charge
// and add no Flux (TWICE's 2 included); Evoking a spell made only of those clean glyphs costs no charge. Rules 1.4: "a
// Sigil of any length" is at most 4 glyphs (Max Sigil words still limits it), drawn one a tile as you walk. The Evoke
// (or a fused cast) disarms it; if the clean glyphs all fade, are scuffed or NULLed first, the use is spent. A refused
// draw (Rigid, a second Reach word, the cap) records nothing: only a glyph that lands is clean.
// =====================================================================================================================
function cleanSettle(h: Holder, cb: Combat, s: any) {
  if (!s.clean) return;
  const live = (id: string) => (cb.glyphs || []).some((g) => g.id === id);
  if ((s.ids || []).length && !(s.ids as string[]).some(live)) { s.clean = false; s.ids = []; log(cb, 'The clean glyphs are gone: Clean Draw is spent.'); }
}
/** Did this Evoke (its pattern's glyphs) use the clean glyphs? Then Clean Draw is spent. */
function cleanEvoked(h: Holder, cb: Combat, glyphs: any[]) {
  const s = stateOf(h); if (!s.clean) return;
  if (glyphs.some((g) => (s.ids || []).includes(g.id))) { s.clean = false; s.ids = []; log(cb, 'Clean Draw is spent.'); }
}
const allClean = (s: any, u: Unit, gl: any[]) => gl.length > 0 && gl.every((g) => (s.ids || []).includes(g.id) && glyphOwner(g) === u.id);
register({
  id: 'clean_draw', claims: 'all', priority: 400,
  actions: [{
    id: 'arm', label: 'Clean Draw', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'none',
    text: 'Once a fight: the glyphs you draw next cost no charge and no Flux, and firing a spell of only those glyphs costs no charge.',
    available: (h) => (!h.u?.mg?.evoker ? false : stateOf(h).clean ? 'Armed: your next Sigil draws clean.' : true),
    run: (h) => { const s = stateOf(h); s.clean = true; s.ids = []; log(h.cb, h.u!.name + ' steadies the hand: the next Sigil draws clean (Clean Draw).'); },
  }],
  on: {
    glyph_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h); cleanSettle(h, ctx.cb, s);
      if (!s.clean) return;
      ctx.charge = 0; ctx.flux = 0;
    },
    // Only a glyph that lands on the ground is clean (glyph_drawn after the draw; Drill Echo's wiped glyph isn't there).
    glyph_drawn: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h), cb: Combat = ctx.cb;
      if (s.clean && ctx.glyph && (cb.glyphs || []).some((g) => g.id === ctx.glyph.id)) (s.ids ||= []).push(ctx.glyph.id);
    },
    evoke_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h); cleanSettle(h, ctx.cb, s);
      if (s.clean && allClean(s, h.u!, ctx.pattern?.glyphs || [])) ctx.charge = 0;
    },
    evoked: (ctx, h) => { if (me(h, ctx.u)) cleanEvoked(h, ctx.cb, ctx.pattern?.glyphs || []); },
    turn_start: (ctx, h) => { if (me(h, ctx.u)) cleanSettle(h, ctx.cb, stateOf(h)); },
  },
  brief: () => null,
});

// =====================================================================================================================
// The Twin Pays (Mastered, Will Power 10). A toggle on Begin, once per combat: no MP, no meter drop, no Strain on the
// Begin or while it is held, and a Right Brain Debuff's +20% is 0 too. Rules 1.5: the swell's Strain (each turn start
// while it is held) comes through 'outburst_hold', which this item zeroes; its Pumps never strained anyway. So a free
// heart can be held and swelled to stage 4 for nothing but the AP: once a fight (item 536, flagged).
// =====================================================================================================================
register({
  // Used from Begin (the Twin Pays chip on an Outburst): no default button of its own (Leon, 9 Nov 2026: the Perks tab's
  // Confirm spent a use and did nothing).
  id: 'the_twin_pays', claims: 'all', priority: 500, noDefaultActions: true,
  toggles: [{
    id: 'twin', label: 'The Twin Pays', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : uses(h).left('per_combat', 1) > 0 ? true : 'Used this fight.'),
    preview: () => '0 AP, 0 MP, 0 Strain: your twin in the upper realm pays.',
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'twin') || uses(h).left('per_combat', 1) <= 0) return;
      ctx.mp = 0; ctx.strain = 0; ctx.hp = 0; ctx.ap = 0; // the Begin's AP too (Leon, 11 Nov 2026)
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u)) return;
      // Any other Begin is an ordinary paid one: the free hold of an earlier, let-go twin cast ends here.
      if (!modOn(h, 'twin') || !uses(h).take('per_combat', 1)) { stateOf(h).free = null; return; }
      if (ctx.hold) stateOf(h).free = ctx.design.id;
      log(ctx.cb, 'Up there, someone with ' + h.u!.name + '\'s face flinches (The Twin Pays: no AP, no mana, no Strain).');
    },
    // Holding it costs nothing: the hold's Strain is zeroed at the start of the turn (hooks gap D7), never pre-paid.
    outburst_hold: (ctx, h) => {
      const m = h.u?.mg, s = stateOf(h); if (!me(h, ctx.u) || !m) return;
      if (m.held && s.free === m.held.design) ctx.strain = 0; else s.free = null;
    },
    outburst_release: (ctx, h) => { if (me(h, ctx.u)) stateOf(h).free = null; },
  },
  brief: () => 'Narrator: the twin who pays is yours to use (lore).',
});

// =====================================================================================================================
// Twin Souls (Achieved: Will Power 5 + Lore Master 5). Story: once per session, ask your twin soul in the upper realm
// one question; the Narrator answers truthfully in the twin's voice (short of proof: the Veil). Outbursts: a design may
// carry a third school (school3, option3), +20 MP before the band and Insight saving; "mid-level" dropped (plan 6a).
// Rules 1.5 (item 537): the third school is a second rider, as the second school is: half strength, its own option, no
// roll, on everyone its own reach rule takes in the release's area (Buff: allies; the rest: everyone but you), at the
// release's stage multiplier and rider stage (the 1.5 maths: magic.ts outburstArea and outburstDamage). It lands after
// the primary hit, the second school and the tone's riders (the 'outburst_after' hook), on whoever is still standing.
// =====================================================================================================================
function extraSchool(cb: Combat, rng: Rng, u: Unit, d: any, school: string, option: string | undefined, sm: number, stage: number, aim: string): string {
  const dd = migrateDesign(d), tiles = new Set(outburstArea(cb, u, dd, formOf(dd) === 'aura' ? u.pos : aim)), rs = riderStage(cb, stage);
  const targets = cb.units.filter((v) => !v.dead && (tiles.has(v.pos) || (school === 'buff' && formOf(dd) === 'aura' && v === u)) && (school === 'buff' ? v.side === u.side : v !== u));
  const out = targets.map((t) => schoolRider(cb, rng, u, dd, t, school, option, sm, rs, SECOND_SCHOOL.strength)).filter(Boolean);
  return out.join(' · ') || 'nobody it can reach';
}
register({
  id: 'twin_souls', claims: 'all',
  actions: [{
    id: 'ask', label: 'Ask your twin soul', scope: ['story', 'world'], ap: 0, uses: { per: 'per_session', n: 1 }, target: 'text',
    text: 'Once a session: ask your twin soul in the upper realm one question. The Narrator answers truthfully, in the twin\'s voice.',
    run: (h, args) => {
      const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Ask in the story.';
      const q = String(args.text || '').trim().slice(0, 240);
      const eid = postStory(h, 'asks the twin soul: "' + q + '"', { private: true });
      pendRuling(g, c, h.key, 'Twin Souls: answer this one question truthfully, as ' + c.name + '\'s twin soul in the upper realm, privately (short of proof: the Veil): "' + q + '"', eid || undefined);
      return null;
    },
  }],
  on: {
    outburst_cost: (ctx, h) => { const d = ctx.design; if (me(h, ctx.u) && d?.school3) ctx.mp += 20 * manaBand(manaOf(ctx.cb)).soul_cost_mult * (1 - (h.u!.mg?.costSave || 0)); },
    outburst_after: (ctx, h) => {
      const d = ctx.design; if (!me(h, ctx.u) || !d?.school3 || !h.u!.mg) return;
      const sm = ctx.mult ?? stageMult(ctx.stage ?? 0);
      log(ctx.cb, h.u!.name + '\'s third school (' + d.school3 + ' at half, Twin Souls): ' + extraSchool(ctx.cb, rngOf(h, ctx), h.u!, d, d.school3, d.option3, sm, ctx.stage ?? 0, ctx.aim) + '.');
    },
  },
  brief: () => 'Narrator: once a session, answers one question truthfully as their twin soul (pending ruling).',
});

// =====================================================================================================================
// Twin Discipline (Ultimate: Twin Souls + Spoon-Feed). Fused Evoke: while holding a Begun Outburst, Evoke a Line you
// can fire as fused. Rules 1.4: the Sigil's words set where it reaches (its Reach word and the facing rule, from where
// you stand) and what it covers (its Burst, TWICE's missiles, CHAIN's jumps), with friendly fire (KIN spares your side);
// the held Outburst's school, modules and stage decide what happens to each creature it covers, released at them as a
// Bolt (rules 1.5: its shape, Size, Random and Far are set aside, Ether is implied). Each one is hit once, at the Sigil's multiplier for its
// tile capped at ×1 (a Burst's edge or a chain jump weakens it; CONDENSE and repeats never grow an Outburst; PROVISIONAL).
// The Sigil's own Subject words, PULL, STEP and LEECH don't fire; the glyphs fade (a Keystone stays). A placed spell
// (STAY, WAIT, WATCH) can't carry an Outburst. Pay both: the Evoke's charge and AP now, the Outburst's MP and Strain
// already paid at Begin. Args: tile = a glyph of the Line, choice = the aim (as an Evoke's), aims = TWICE's others.
// =====================================================================================================================
/** The Evoke options a fused cast carries: its aims, and the stroke picked at a junction glyph (as game.ts evokeOptsOf). */
function fusedOpts(args: any) {
  const st = args?.stroke;
  return { ...(args?.aims?.length ? { aims: args.aims as string[] } : {}), ...(st && st !== 'new' && !String(st).startsWith('junction:') ? { stroke: String(st) } : {}) };
}
function fusedPlan(h: Holder, args: any) {
  const u = h.u!, cb = h.cb!;
  const pv = previewEvoke(cb, u, args.tile, args.choice, fusedOpts(args));
  if (!pv.ok) return { pv, why: pv.why || 'Can\'t fire that.' };
  const sp: any = pv.spell;
  if (sp?.stay || sp?.wait || sp?.watch) return { pv, why: 'A placed spell (STAY, WAIT, WATCH) can\'t carry an Outburst.' };
  // Who it covers: everyone the plan affects, once each, at the best multiplier (never above ×1).
  const by: Record<string, number> = {};
  for (const a of (pv.affected || []) as Affected[]) {
    if (a.kinSpared || a.skipped) continue;
    const t = cb.units.find((x) => x.id === a.unit); if (!t || t.dead) continue;
    by[a.unit] = Math.max(by[a.unit] ?? 0, Math.min(1, a.mult));
  }
  return { pv, why: null as string | null, hits: Object.entries(by).map(([id, mult]) => ({ unit: cb.units.find((x) => x.id === id)!, mult })) };
}
register({
  id: 'twin_discipline', claims: 'all',
  actions: [{
    id: 'fused', label: 'Fused Evoke', scope: ['combat', 'world'], target: 'tile',
    ap: (h, args) => { const u = h.u, cb = h.cb; if (!u || !cb || !args?.tile) return SPELL_AP.evoke; const pv = previewEvoke(cb, u, args.tile, args.choice, fusedOpts(args)); return pv.ap ?? SPELL_AP.evoke; },
    text: 'Fire a Sigil Line with your held Outburst inside it: the Sigil\'s words set where it reaches and what it covers, the Outburst the school. Evoke charge and AP.',
    available: (h) => { const m = h.u?.mg; if (!m || !m.evoker || !m.emanator) return false; return m.held ? true : 'Begin and hold an Outburst first.'; },
    preview: (h, args) => {
      if (!args.tile) return { ok: false, why: 'Pick a glyph of the Line.' };
      if (!args.choice) return { ok: false, why: 'Pick a target in the area (or yourself).' };
      const r = fusedPlan(h, args);
      if (r.why) return { ok: false, why: r.why, ap: r.pv.ap };
      const pv = r.pv, hits = r.hits!;
      return { ap: pv.ap, ...evokeMarks(pv), targets: hits.map((x) => x.unit.id), lines: ['Fused: ' + pv.pattern!.words.map((w) => w.toUpperCase()).join(' · ') + ', ' + pv.charge + ' charge, ' + hits.length + ' creature(s): ' + hits.map((x) => x.unit.name + (x.mult < 1 ? ' ×' + x.mult : '')).join(', ')] };
    },
    run: (h, args, rng) => {
      const u = h.u!, cb = h.cb!, m = u.mg!;
      if (!m.held) return 'Nothing held.';
      const r = fusedPlan(h, args); if (r.why) return r.why;
      // On the area map a fused cast that finds an NPC token opens the fight (as an Evoke there does), and the cast is
      // the opening move, its Evoke AP paid from the character's AP.
      if (ow(cb)) {
        const npc = r.hits!.map((x) => x.unit).find((x) => x.side === 'foe');
        if (npc) { const g = h.g || boundGame(); strikeFromWorld(npc.id, r.pv.ap ?? SPELL_AP.evoke, (cbx, att) => fusedCast({ ...(holderOf({ u: att, cb: cbx, c: h.c }, 'twin_discipline') || h), u: att, cb: cbx, g: h.g }, args, g.rng)); return null; }
      }
      return fusedCast(h, args, rng);
    },
  }],
  on: { outburst_release: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.u) && s.fusing && s.fusing.mult !== 1) ctx.mult = (ctx.mult || 1) * s.fusing.mult; } },
  brief: () => null,
});
function fusedCast(h: Holder, args: any, rng: Rng): string | null {
  const u = h.u!, cb = h.cb!, m = u.mg!;
  if (!m.held) return 'Nothing held.';
  const r = fusedPlan(h, args); if (r.why) return r.why;
  const pv = r.pv, p = pv.pattern!, hits = r.hits!, held = { ...m.held }, d = m.designs.find((x) => x.id === held.design); if (!d) return 'That design is gone.';
  m.charge -= pv.charge; m.cast = true;
  const name = p.words.map((w) => w.toUpperCase()).join(' · ');
  emitFx(cb, 'evoke', { unit: u.id, at: u.pos, shape: p.shape, tiles: p.tiles, words: p.words, element: (pv.spell as any)?.element ?? null, side: u.side, facing: pv.facing?.mode, dir: pv.facing?.dir, area: pv.area,
    src: pv.missiles[0]?.origin, impact: pv.missiles[0]?.impact ?? null, targets: hits.map((x) => x.unit.id), targetAt: hits.map((x) => x.unit.pos),
    missiles: pv.missiles.map((x) => ({ origin: x.origin, kind: x.kind, path: x.path, blockedAt: x.blockedAt, impact: x.impact, arc: x.arc, hops: x.hops, burst: x.burst.tiles, core: x.burst.core, chain: x.chain, placed: null })),
    fused: true, design: d.id, school: d.school, fizzle: !hits.length });
  log(cb, u.name + ' fuses ' + d.name + ' into ' + name + ' (Twin Discipline, a Line of ' + p.tiles.length + ', ' + (pv.facing?.mode || 'along') + ', ' + pv.charge + ' charge)' + (hits.length ? '' : ': it finds no one') + '.');
  const s = stateOf(h), mods0 = [...d.modules], range0 = m.soulRange;
  let released = 0;
  try {
    // One release per creature, but one cast: practice is held back during the loop and granted once after it
    // (rules 1.8 section 5: 1, +1 per stage past 1, +1 per feeling), as for a single release.
    practiceOnce(cb, u, () => {
      for (const x of hits) {
        const t = x.unit; if (t.dead) continue;
        s.fusing = { mult: x.mult };
        // Rules 1.5: the Sigil decides the area, so each creature takes the held Outburst as a Bolt (its shape, Size,
        // Random and Far set aside; Ether implied: classes/soul.ts asBolt).
        m.held = { ...held };
        refund(cb, u, SPELL_AP.release); const err = asBolt(u, d, () => releaseOutburst(cb, rng, u, t.pos)); if (err) { pay(cb, u, SPELL_AP.release); break; }
        released++;
      }
    }, () => (released ? 1 + Math.max(0, (held.stage ?? 0) - 1) + (held.felt || []).length : 0));
  } finally { d.modules = mods0; m.soulRange = range0; s.fusing = null; m.held = null; }
  // It is an Evoke too (spec 1.5 section 2.1): the Line earns study and its words their uses.
  const grew = evokeGrowth(cb, u, p.words, p.glyphs.length, hits.some((x) => x.unit.side !== u.side));
  if (grew.length) log(cb, grew.join(' '));
  // The glyphs fade as the spell fires (a Keystone stays), and it counts as your Evoke for Clean Draw.
  fadePattern(cb, p); // rules 1.10 (item 919): a junction stays in its other stroke; the strokes left are tidied
  const cd = holderOf({ u, cb, c: h.c }, 'clean_draw'); if (cd) cleanEvoked({ ...cd, u, cb }, cb, p.glyphs);
  return null;
}

// =====================================================================================================================
// Verse of War (Achieved: Implication 5 + Will Power 5). An Outburst cast while you speak in verse: +1 tile of range,
// ×1.1 Soul damage. Player-declared (plan 4.3: the Narrator is never called per cast): Say the line (free), then Begin
// or Release with the "In verse" toggle (in a fight that chip is its only button: Leon, 9 Nov 2026, no Confirm when the
// move already has a use button); the line goes to the fight notes so the Narrator knows it was said. Nothing checks
// that it was verse (rules 1.14, spec item 1111: the audit had no consequence and is gone). On the area map, "Release
// in verse" (the Perks list there): the line is this round's Say (story/speak).
// =====================================================================================================================
function verseNote(h: Holder) { const l = sayLine(h); note(h, 'cast an Outburst in verse' + (l ? ': "' + l.slice(0, 160) + '"' : ' (no line said)') + ' (+1 range, ×1.1 damage given).'); }
register({
  id: 'verse_of_war', claims: 'all',
  toggles: [{
    id: 'verse', label: 'In verse', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : sayLine(h) ? true : 'Say your verse first (Say).'),
    preview: () => '+1 tile of range, ×1.1 damage.',
  }, {
    id: 'verse', label: 'In verse', on: ['combat/release'],
    available: (h) => (!h.u?.mg?.held ? false : sayLine(h) ? true : 'Say your verse first (Say).'),
    preview: () => '+1 tile of range, ×1.1 damage.',
  }],
  actions: [{
    id: 'release', label: 'Release in verse', scope: ['world'], ap: 0, target: 'tile',
    text: 'Release your held Outburst while you speak in verse: +1 tile of range, ×1.1 damage (1 AP).',
    available: (h) => { const m = h.u?.mg; if (!m) return false; if (!m.held) return 'Hold an Outburst first.'; return sayLine(h) ? true : 'Say your verse first (Say).'; },
    run: (h, args, rng) => {
      const u = h.u!, m = u.mg!, cb = h.cb!;
      // In verse: +1 range for this release; the flag on the holder in the map it runs on (outburst_release, damage_in).
      const inVerse = (cbx: Combat, uu: Unit, r: Rng) => {
        const hh = holderOf({ u: uu, cb: cbx, c: h.c }, 'verse_of_war') || h, st = stateOf({ ...hh, cb: cbx, u: uu, g: h.g });
        uu.mg!.soulRange += 1; st.verseRelease = true;
        try { return releaseOutburst(cbx, r, uu, args.tile); } finally { uu.mg!.soulRange -= 1; st.verseRelease = false; }
      };
      // On the area map a release that would touch an NPC token opens the fight, as a released Outburst does there; the
      // release is the opening move (its own 1 AP) and the verse line carries into the fight's notes.
      if (ow(cb)) {
        m.soulRange += 1; let npc: Unit | undefined;
        try { npc = spellTargets(cb, u, 'release', undefined, args.tile).map((id) => cb.units.find((x) => x.id === id)!).find((x) => x && x.side === 'foe'); } finally { m.soulRange -= 1; }
        if (npc) { const g = h.g || boundGame(); strikeFromWorld(npc.id, 0, (cbx, att) => inVerse(cbx, att, g.rng)); return null; }
      }
      return inVerse(cb, u, rng);
    },
  }],
  on: {
    outburst_cost: (ctx, h) => { if (me(h, ctx.u) && ctx.release && modOn(h, 'verse') && sayLine(h)) ctx.range += 1; },
    // Rules 1.5: most Outbursts are held, so the toggle rides the Release too.
    release_cost: (ctx, h) => { if (me(h, ctx.u) && modOn(h, 'verse') && sayLine(h)) ctx.range += 1; },
    outburst_release: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h);
      if (!((modOn(h, 'verse') && sayLine(h)) || s.verseRelease) || ctx.wild) { s.verseAt = null; return; }
      verseNote(h); s.verseAt = ctx.cb.log.length;
    },
    damage_in: (ctx, h) => { const s = stateOf(h); if (ctx.phase === 'reduce' && me(h, ctx.src?.by) && outburstHit(ctx.src) && s.verseAt != null && s.verseAt === ctx.cb?.log.length) ctx.dmg *= 1.1; },
  },
  brief: () => null,
});

// =====================================================================================================================
// Fire Sermon (Achieved: Faith 5 + Eloquence 5; deed: convert an enemy mid-fight). Preach (2 AP): until the start of
// your next turn, every Blessing you are granted also tries to leave enemies within 4 tiles (provisional; they hear
// you) Shaken (Heart save against 12 + your Faith strength: the perk's first skill, rules 1.13). Story: preaching is roleplay; a Blessing gained
// while preaching leaves hostile listeners Shaken for the scene (the Narrator rules who).
// =====================================================================================================================
register({
  id: 'fire_sermon', claims: 'all',
  actions: [
    {
      id: 'preach', label: 'Preach', scope: ['combat'], ap: 'data', target: 'none',
      text: 'Preach until your next turn: your Blessings also leave enemies within 4 tiles Shaken (Heart save).',
      available: (h) => (h.u && condOn(h.u, 'silenced') ? 'Silenced.' : stateOf(h).preach ? 'Already preaching.' : true),
      run: (h, args) => { stateOf(h).preach = true; log(h.cb, h.u!.name + ' preaches' + (args.text ? ': "' + String(args.text).slice(0, 160) + '"' : '') + ' (Fire Sermon).'); },
    },
    {
      id: 'preach_story', label: 'Preach', scope: ['story', 'world'], ap: 0, target: 'text',
      text: 'Preach to those who will hear. A Blessing that comes while you preach leaves hostile listeners Shaken for the scene.',
      run: (h, args) => {
        const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Preach in the story.';
        const t = String(args.text || '').trim().slice(0, 240), eid = postStory(h, 'preaches: "' + t + '"');
        pendRuling(g, c, h.key, 'Fire Sermon: ' + c.name + ' preaches ("' + t + '"). If a Blessing answers while they preach, hostile listeners are Shaken (−2 on social checks) for the scene: set conditions for them.', eid || undefined);
        return null;
      },
    },
  ],
  on: {
    turn_start: (ctx, h) => { if (me(h, ctx.u)) stateOf(h).preach = false; },
    blessing_in: (ctx, h) => {
      const u = h.u, cb: Combat = ctx.cb; if (!u || !me(h, ctx.u) || !stateOf(h).preach) return;
      let line = '';
      for (const e of foesOf(cb, u, { companions: false })) if (dist(e.pos, u.pos) <= 4) line += applyCond(cb, rngOf(h, ctx), u, e, 'shaken', undefined, undefined, { via: 'faith' });
      if (line) log(cb, 'The sermon burns (Fire Sermon)' + line + '.');
    },
  },
  brief: () => 'Narrator: out of combat, who counts as a hostile listener and how a Shaken crowd behaves.',
});

// Unbroken Litany (Faith α; `litany`): data only since rules 1.56 (Litany's ally saves: move-pool.md).

// =====================================================================================================================
// Upper-Touched (trait). Thin Veil: Outbursts cost 20% less MP (the 5 MP floor stays); you sense upper-realm beings
// within 10 tiles (a log line names where each one is when it comes within 10, and the 'sees' hook marks it sensed
// through the fog; on the area map the token is felt and revealed).
// Seen From Above: upper-realm beings always know where you are (you can't stay Hidden while one stands; their spot
// rolls always find you; in the story an upper-realm NPC always notices your sneak). Blessings cast on you roll a d6
// (provisional table, plan 6a): 1 the Blessing fails, 2 +1 Strain, 3 Shaken 1 round, 4 as normal, 5 ×1.5 power, 6 a
// voice from above (the Narrator speaks).
// =====================================================================================================================
const isUpper = (v: { kind?: string; tags?: string[] } | null | undefined) => !!v && (v.kind === 'upper_realm' || (v.tags || []).includes('upper_realm'));
const upperFoes = (cb: Combat, u: Unit) => foesOf(cb, u, { companions: false }).filter(isUpper);
/** The area map: upper-realm tokens within 10 tiles of the holder, once a scene each (a line; a lurker is revealed). */
function owSenseUpper(h: Holder, at?: string) {
  const g = gameOf(h), c = charOf(h); if (!g || !c || c.dead) return; at ||= positionsOf(g)[c.id]; if (!at) return;
  const s = stateOf({ ...h, g }), had: string[] = (s.sensed ||= []), sc = g.story?.scene?.n ?? 0;
  for (const n of npcsOf(g)) { if (!isUpper(n) || dist(n.pos, at) > 10) continue; const k = n.id + '@' + sc; if (had.includes(k)) continue; had.push(k);
    if (n.hidden) delete n.hidden; postStory({ ...h, g }, 'feels something from above at ' + refOf(n.pos) + ' (Thin Veil): ' + n.name + '.', { kind: 'system' }); }
}
function senseUpper(h: Holder, cb: Combat) {
  const u = h.u; if (!u || !alive(u)) return; const s = stateOf(h), had: string[] = (s.sensed ||= []);
  if (ow(cb)) { owSenseUpper(h, u.pos); return; }
  for (const v of upperFoes(cb, u)) if (dist(v.pos, u.pos) <= 10 && !had.includes(v.id)) { had.push(v.id); log(cb, u.name + ' feels something from above at ' + refOf(v.pos) + ' (Thin Veil).'); }
}
register({
  id: 'upper_touched', claims: [0, 1, 3], priority: 60,
  on: {
    outburst_cost: (ctx, h) => { if (me(h, ctx.u) && ctx.mp >= 5) ctx.mp = Math.max(5, ctx.mp * 0.8); },
    combat_start: (ctx, h) => senseUpper(h, ctx.cb),
    turn_start: (ctx, h) => senseUpper(h, ctx.cb),
    // The area map: after the holder moves, and when a round opens.
    moved: (ctx, h) => { if (ow(ctx.cb) && ctx.u === h.u) senseUpper(h, ctx.cb); },
    world_round_start: (ctx, h) => { if (ctx.g?.phase === 'story') owSenseUpper(h); },
    zone_enter: (ctx, h) => owSenseUpper(h),
    // A Blessing in the story rolls the same d6 (the engine rolls; the Narrator plays the result in its answer).
    story_blessing: (ctx, h) => {
      if (ctx.c !== h.c) return; const r = die(ctx.g.rng, 6);
      const what = ['', 'the Blessing fails', '+1 Strain (the heart tugs)', 'Shaken for the scene', 'as normal', '×1.5 power', 'a voice from above speaks through it'][r];
      ctx.lines.push('Upper-Touched d6 ' + r + ': ' + what + '.');
      if (r === 3) setStoryCond(ctx.g, h.c!, 'shaken', 'scene');
    },
    // The sight hook: upper-realm foes within 10 tiles are a sensed presence through fog and walls; their own eyes always
    // see you (Seen From Above).
    sees: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t; if (!u || !alive(u)) return;
      if (ctx.side === u.side && t.side !== u.side && isUpper(t) && dist(t.pos, u.pos) <= 10 && !ctx.seen) ctx.sensed = true;
      if (t === u && ctx.side !== u.side && ctx.cb.units.some((v: Unit) => v.side === ctx.side && alive(v) && isUpper(v) && (!ctx.by || ctx.by === v))) ctx.seen = true;
    },
    hide: (ctx, h) => { if (me(h, ctx.u) && upperFoes(ctx.cb, h.u!).length) reveal(ctx.cb, h.u!, 'Seen From Above: upper-realm eyes always find you'); },
    spot: (ctx, h) => { if (me(h, ctx.u) && (ctx.by?.kind === 'upper_realm' || (ctx.by?.tags || []).includes('upper_realm'))) ctx.die = 20; },
    stay_hidden: (ctx, h) => { const c = charOf(h); if (c && ctx.c?.id === c.id && (ctx.npc?.kind === 'upper_realm' || (ctx.npc?.tags || []).includes('upper_realm'))) ctx.auto = 'fail'; },
    blessing_in: (ctx, h) => {
      const u = h.u, cb: Combat = ctx.cb; if (!u || !me(h, ctx.t) || ctx.handled) return; const s = stateOf(h);
      if (s.inside) return;
      const r = die(rngOf(h, ctx), 6), why = ' (Upper-Touched d6 ' + r + ')';
      if (r === 1) { ctx.handled = true; ctx.out = ' · the Blessing fails on ' + u.name + why; return; }
      if (r === 2) { const out = u.mg ? addStrain(cb, rngOf(h, ctx), u, 1, 'Upper-Touched') : ''; log(cb, 'The Blessing tugs at ' + u.name + '\'s heart: +1 Strain' + why + out + '.'); return; }
      if (r === 3) { log(cb, 'The Blessing frightens ' + u.name + why + applyCond(cb, rngOf(h, ctx), null, u, 'shaken', 1, undefined, { skipSave: true }) + '.'); return; }
      if (r === 5) {
        s.inside = true;
        try { ctx.out = blessingAgain(cb, rngOf(h, ctx), ctx.u, u, ctx.blessing, ctx.power * 1.5) + ' · ×1.5' + why; ctx.handled = true; } finally { s.inside = false; }
        return;
      }
      if (r === 6) { (cb.notes ||= []).push('TRAIT Upper-Touched (' + u.name + ', r' + cb.round + '): a voice from above speaks through the Blessing — yours to rule'); log(cb, 'A voice from above rides the Blessing' + why + '.'); return; }
      log(cb, 'The Blessing lands as it should' + why + '.');
    },
  },
  brief: () => 'Narrator: upper-realm beings always know where they are; Heaven isn\'t sure which side they\'re on.',
});
const blessingAgain = (cb: Combat, rng: Rng, by: Unit, t: Unit, bl: any, power: number): string => blessing(cb, rng, by, t, bl, power);

// =====================================================================================================================
// Sigil Savant (trait). Muscle Memory: one chosen word (c.state.sigil_savant.word, set once with the Perks action)
// draws for 0 charge and 1 AP less (floor 0.5); it still adds 1 Flux and Evoke's charge is still paid (plan 6a-19).
// Rigid: you only draw words you practised at your last long rest, at most Max Sigil words (plan 6a-19: teeth), plus
// the Muscle Memory word. Until the first long rest every known word counts as practised.
// =====================================================================================================================
const knownWords = (c: Character) => [...new Set([...(c.sigils || [])])];
const savant = (c: Character | null | undefined): any => (c ? ((c.state ||= {}).sigil_savant ||= {}) : {});
register({
  id: 'sigil_savant', claims: [0],
  actions: [
    {
      id: 'muscle', label: 'Muscle Memory', pick: 'words', pickLabel: 'The word', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'Choose the one word you can draw in your sleep (once): 0 charge, 1 AP less.',
      available: (h) => (savant(charOf(h)).word ? false : true),
      run: (h, args) => {
        const c = charOf(h); if (!c) return 'No character.'; const w = String(args.choice || '').toLowerCase();
        if (!knownWords(c).includes(w)) return 'Pick a word you know: ' + knownWords(c).join(', ') + '.';
        savant(c).word = w; postStory(h, 'draws ' + w.toUpperCase() + ' without thinking now (Muscle Memory).'); return null;
      },
    },
    {
      id: 'practise', label: 'Practise words', pick: 'words', pickMulti: 9, pickLabel: 'The words you practise', scope: ['story', 'world'], ap: 0, target: 'none', uses: { per: 'per_rest', n: 1 },
      text: 'At a rest: choose the words you practise (at most your Max Sigil words). Mid-mission you draw only those.',
      run: (h, args) => {
        const c = charOf(h); if (!c) return 'No character.';
        const list = String(args.choice || args.text || '').toLowerCase().split(/[\s,]+/).filter(Boolean), max = Math.floor(maxSigilWords(c));
        if (!list.length) return 'Name the words you practise.';
        const bad = list.filter((w) => !knownWords(c).includes(w)); if (bad.length) return 'You don\'t know ' + bad.join(', ') + '.';
        if (list.length > max) return 'At most ' + max + ' words.';
        savant(c).practised = [...new Set(list)]; postStory(h, 'practises ' + list.map((w) => w.toUpperCase()).join(', ') + '.'); return null;
      },
    },
  ],
  on: {
    glyph_cost: (ctx, h) => {
      const c = charOf(h); if (!me(h, ctx.u) || !c) return; const st = savant(c);
      if (st.word && ctx.word === st.word) { ctx.charge = 0; if (ctx.ap > 0.5) ctx.ap = Math.max(0.5, ctx.ap - 1); return; }
      // Rigid: an unpractised word can't be drawn (glyph_cost's fail refuses it).
      if (Array.isArray(st.practised) && !st.practised.includes(ctx.word)) ctx.fail ||= 'Rigid (Sigil Savant): you can only draw words you have practised.';
    },
    rest: (ctx, h) => {
      const c = charOf(h); if (!c || ctx.kind !== 'long' || !(ctx.chars || []).some((x: Character) => x.id === c.id)) return;
      const st = savant(c); if (!Array.isArray(st.practised)) st.practised = knownWords(c).slice(0, Math.floor(maxSigilWords(c)));
    },
  },
  brief: (h) => { const st = savant(charOf(h)); return 'Narrator: the problem only an unpractised Sigil solves.' + (st.word ? ' Word: ' + st.word.toUpperCase() + '.' : ''); },
});

// =====================================================================================================================
// Hollow Heart (trait). Rules 1.5 (item 538): nobody's own heart kills them now (the burn Downs, never kills), so
// Hollow is re-derived: when your own heart Downs you (the burn, 'strain' damage; an old save's Short), you fall
// unconscious, Downed but stable (no death saves fail, hits don't add failures; plan 6a, provisional), and stand at 1 HP
// after the fight or when healed; and a Mana Short doesn't Stun you (the hollow heart keeps beating: the wild release,
// the backlash and, since rules 1.56, the Mana Shock still happen). +10% Outburst damage (Soul damage you deal, and an
// elemental Outburst's). Echo Chamber: every Outburst you cast is loud: you are revealed and can't hide on a turn you
// cast; the Narrator hears that every enemy within 10 tiles knows where you are. Story: casting on the area map ends
// your sneak.
// =====================================================================================================================
register({
  id: 'hollow_heart', claims: 'all',
  stat: (h, stat) => (stat === 'death_save' && h.u?.downed && stateOf(h).stable ? 20 : 0),
  on: {
    on_downed: (ctx, h) => { if (me(h, ctx.victim) && !ctx.victim.dead && (ctx.src?.type === 'short' || ctx.src?.type === 'strain')) { stateOf(h).stable = true; log(ctx.cb, h.u!.name + ' falls unconscious, hollow and stable (Hollow Heart).'); } },
    // The automatic Short follows the Strain that reaches 3 over the limit (magic.ts addStrain): its Stun is refused.
    strain_change: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (ctx.why === 'short') s.shorting = false; else if (ctx.to - (ctx.limit ?? 0) >= SHORT_AT_OVER && ctx.to > ctx.from && !ctx.u?.mg?.shock) s.shorting = true; }, // rules 1.56: in Mana Shock no second Short comes
    cond_apply: (ctx, h) => { const s = stateOf(h); if (!me(h, ctx.t) || ctx.id !== 'stunned' || ctx.by || !s.shorting) return; s.shorting = false; ctx.cancel = true; ctx.why = 'Hollow Heart: the heart keeps beating'; },
    turn_start_pre: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (!h.u!.downed) s.stable = false; else if (s.stable) h.u!.saves.ok = 0; },
    damage_in: (ctx, h) => {
      if (ctx.phase !== 'reduce') return;
      if (me(h, ctx.t) && ctx.t.downed && stateOf(h).stable && ctx.dmg > 0) { ctx.dmg = 0; return; }
      if (me(h, ctx.src?.by) && outburstHit(ctx.src)) ctx.dmg *= 1.1;
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, u = h.u!;
      stateOf(h).cast = turnStamp(h);
      if (ow(cb)) {
        const g = gameOf(h), c = charOf(h);
        if (g?.story && c) { if (g.story.hidden) g.story.hidden[c.id] = false; if (g.story.sneak) g.story.sneak[c.id] = false; pendRuling(g, c, h.key, 'Echo Chamber: ' + c.name + '\'s Outburst is loud. Hostile NPCs within 10 tiles hear it and turn toward them.'); }
        return;
      }
      if (u.hidden) reveal(cb, u, 'Echo Chamber: the Outburst is loud');
      const near = foesOf(cb, u, { companions: false }).filter((v) => dist(v.pos, u.pos) <= 10);
      for (const v of near) (((cb.lastSeen ||= {})[v.side] ||= {}))[u.id] = u.pos;
      if (near.length) (cb.notes ||= []).push('TRAIT Hollow Heart (' + u.name + ', r' + cb.round + '): the Outburst is loud: ' + near.map((v) => v.name).join(', ') + ' know where ' + u.name + ' is until their next turn — yours to rule');
    },
    hide: (ctx, h) => { if (me(h, ctx.u) && stateOf(h).cast === turnStamp(h)) reveal(ctx.cb, h.u!, 'Echo Chamber: you cast this turn'); },
  },
  brief: () => 'Narrator: the stealth mission where you\'ll want to cast anyway.',
});

// =====================================================================================================================
// Heretic (trait). Stolen Fire: pray and use Blessings without Faith or a pact: the Perks action prays to any patron
// for one of its Blessings as an Atheist prays a learned Hymn (rules 1.6, item 628: d20 + Will Power against 14 / 16 / 18, no Witnessed), and Blessing
// Power is 1 + 0.1 × Will Power (provisional reading, plan 6a). Excommunicated: an ally's Blessing on you fails on a
// d6 of 1-2; at the first session start the Lumeri Church is Hostile (standing −40); which other faiths count is the
// Narrator's.
// =====================================================================================================================
function stolenPick(choice: string | undefined): { p: any; bl: any } | null {
  const [a, b] = String(choice || '').split(':');
  for (const p of PATRONS) { const bl = (p.blessings || []).find((x: any) => x.id === (b || a)); if (bl && (!b || p.id === a)) return { p, bl }; }
  const p = PATRON[a]; return p && (p.blessings || [])[0] ? { p, bl: p.blessings[0] } : null;
}
register({
  id: 'heretic', claims: [0, 1, 2, 3],
  stat: (h, stat) => { const c = charOf(h); return stat === 'blessing_power' && c ? 0.1 * ((c.skills.will_power || 0) - (c.skills.faith || 0)) : 0; },
  actions: [
    {
      id: 'stolen_fire', label: 'Stolen Fire', scope: ['combat'], ap: 0, target: 'none',
      text: 'Pray without kneeling: any patron\'s Blessing, on Will Power instead of Faith (3 AP).',
      available: (h) => (h.u && condOn(h.u, 'silenced') ? 'Silenced: no prayers.' : true),
      run: (h, args, rng) => {
        const c = charOf(h), u = h.u!, cb = h.cb!; if (!c) return 'Only a character can pray.';
        const pick = stolenPick(args.choice); if (!pick) return 'Name a Blessing to steal.';
        // Rules 1.6: a stolen Hymn is prayed by dice, as an Atheist prays a learned one (d20 + Will Power vs 14/16/18).
        const key = pick.p.id + '.' + pick.bl.id, was = { faith: c.skills.faith, patron: c.patron, devotion: c.devotion, belief: c.belief, hymns: c.hymns, devotionXp: c.devotionXp, faithTally: c.faithTally, faithLeft: c.faithLeft, grudge: c.grudge };
        c.skills.faith = c.skills.will_power || 0; c.belief = { kind: 'atheist' }; c.patron = null; c.hymns = [...(c.hymns || []), key];
        try { return combatPray(cb, rng, u, { kind: 'hymn', id: key, targetId: args.targetId, targetId2: (args as any).targetId2, tile: args.tile }, gameOf(h)!); }
        finally { if (was.faith == null) delete (c.skills as any).faith; else c.skills.faith = was.faith; c.patron = was.patron; c.devotion = was.devotion; c.belief = was.belief; c.hymns = was.hymns; if (was.belief === undefined) delete c.belief; if (was.hymns === undefined) delete c.hymns;
          for (const k of ['devotionXp', 'faithTally', 'faithLeft', 'grudge'] as const) { if (was[k] === undefined) delete c[k]; else (c as any)[k] = was[k]; } } // rules 1.6.1: the XP, tally, cooldown and grudge too
      },
    },
    {
      id: 'stolen_fire_story', label: 'Stolen Fire', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'Pray without kneeling, in the story: d20 + Will Power against the Hymn\'s dice TN (14, 16 or 18).',
      run: (h, args, rng) => {
        const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Pray in the story.';
        const pick = stolenPick(args.choice); if (!pick) return 'Name a Blessing to steal.';
        if ((c.skills.will_power || 0) < 3) return 'Stolen Fire needs Will Power 3.';
        const rv = rollVs(null, rng, { mod: mod(c.skills.will_power || 0), tn: ATHEIST_TN[pick.bl.tier || 1] ?? 14 }), ok = rv.ok; // rules 1.6: by dice
        const eid = postStory(h, 'steals a prayer to ' + pick.p.name + ': ' + rv.text + (ok ? ' · heard' : ' · silence') + (args.text ? ' ("' + String(args.text).slice(0, 160) + '")' : ''));
        if (ok) pendRuling(g, c, h.key, c.name + ' stole a prayer and was heard: ' + pick.p.name + ' answers with ' + pick.bl.name + ' × ' + (1 + 0.1 * (c.skills.will_power || 0)).toFixed(1) + ' (Heretic: the patron may resent it).', eid || undefined);
        return null;
      },
    },
  ],
  on: {
    blessing_in: (ctx, h) => {
      const u = h.u; if (!u || !me(h, ctx.t) || ctx.handled || me(h, ctx.u) || ctx.u?.side !== u.side) return;
      const r = die(rngOf(h, ctx), 6);
      if (r <= 2) { ctx.handled = true; ctx.out = ' · the Blessing slides off ' + u.name + ' (Excommunicated, d6 ' + r + ')'; }
    },
    session_start: (ctx, h) => {
      const c = charOf(h), g = gameOf(h); if (!c || !g || !uses(h).take('per_campaign', 1, h.key + '#faction')) return;
      applyMemOp(g, { op: 'faction', name: 'Lumeri Church', standing: -40, notes: 'Hostile to ' + c.name + ' (Heretic).' } as any, true);
    },
  },
  brief: () => 'Narrator: which faiths count as faith-based (all hostile); Sister October, and her shotgun.',
});

// =====================================================================================================================
// True Believer (trait). Unshaken: the wait between Hymns is 1 round shorter, never under 2 rounds (rules 1.22). Once per session your prayer is
// answered with a small miracle (a story button: the Narrator grants it). Rites: every day you can't keep them, −1 on
// Faith and Will Power rolls until amends; the Narrator keeps the count in traitState rites_missed (capped at −3, plan
// 6a, provisional).
// =====================================================================================================================
const ritesMissed = (c: Character | null | undefined) => Math.max(0, Math.min(3, Number(c?.state?.rites_missed ?? c?.state?.true_believer?.rites_missed ?? 0) || 0));
register({
  id: 'true_believer', claims: [0, 2],
  // 'hymn_wait' (rules 1.22): the wait between Hymns is 1 round shorter (faith.ts hymnWait holds it at 2 rounds or more).
  stat: (h, stat) => (stat === 'hymn_wait' ? -1 : (stat === 'skill:faith' || stat === 'skill:will_power') ? -ritesMissed(charOf(h)) : 0),
  actions: [{
    id: 'miracle', label: 'Ask for a miracle', scope: ['story', 'world'], ap: 0, uses: { per: 'per_session', n: 1 }, target: 'text',
    text: 'Once a session your prayer is answered: the Narrator grants a small miracle.',
    run: (h, args) => {
      const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Pray in the story.';
      const t = String(args.text || '').trim().slice(0, 240), eid = postStory(h, 'prays: "' + t + '"');
      pendRuling(g, c, h.key, 'True Believer: once a session, ' + c.name + '\'s prayer is answered. Grant a small miracle: "' + t + '"', eid || undefined);
      return null;
    },
  }],
  brief: (h) => 'Narrator: track missed rites (traitState rites_missed: +1 a day, 0 on amends)' + (ritesMissed(charOf(h)) ? '; now −' + ritesMissed(charOf(h)) : '') + '.',
});

// =====================================================================================================================
// Heaven's Faithful (trait). +2 Outburst range (the generic stat op). Communion: once per scene, ask your twin soul in
// the upper realm one question; the Narrator answers truthfully, in riddles. Treason: each fight against upper-realm
// beings opens with a Faith check (d20 + Faith, TN 12, provisional): on a failure you hesitate and lose 2 AP on your
// first turn. The Department hunting you is the Narrator's.
// =====================================================================================================================
register({
  id: 'heavens_faithful', claims: [3],
  actions: [{
    id: 'communion', label: 'Communion', scope: ['story', 'world'], ap: 0, uses: { per: 'per_scene', n: 1 }, target: 'text',
    text: 'Once a scene: ask your twin soul in the upper realm one question. The answer is true, and a riddle.',
    run: (h, args) => {
      const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Ask in the story.';
      const q = String(args.text || '').trim().slice(0, 240), eid = postStory(h, 'asks above: "' + q + '"', { private: true });
      pendRuling(g, c, h.key, 'Heaven\'s Faithful (Communion): answer truthfully but in riddles, privately, as ' + c.name + '\'s twin soul in the upper realm (short of proof: the Veil): "' + q + '"', eid || undefined);
      return null;
    },
  }],
  on: {
    combat_start: (ctx, h) => {
      const u = h.u, cb: Combat = ctx.cb, c = charOf(h); if (!u || !c || ow(cb) || !upperFoes(cb, u).length) return;
      const rv = rollVs(cb, rngOf(h, ctx), { by: u, mod: mod(c.skills.faith || 0) + (u.sk?.faith || 0), tn: TN.standard, why: 'faith' }), ok = rv.ok;
      log(cb, u.name + ' faces Heaven\'s own: Faith ' + rv.text + ' · ' + (ok ? 'steady' : 'hesitates (−2 AP on the first turn)') + ' (Heaven\'s Faithful).');
      if (!ok) stateOf(h).hesitate = true;
    },
    turn_start_pre: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (s.hesitate) { ctx.penalties.push({ n: 2, why: 'Treason: hesitation' }); s.hesitate = false; } },
  },
  brief: () => 'Narrator: Communion answers in riddles; hunted if the Department learns their faith; tag upper-realm foes.',
});

// =====================================================================================================================
// The music traits (The Soundscape of the Soul, Headbanger, Underground Sound). music.ts runs the song state and the
// story checks, asks and stealth; the weapon attack carries its song mod (u.song). This fills the rest (plan 6a-15:
// the modifier reaches every d20 that uses the skill, never derived stats): passive voice hooks and initiative (stat
// skill:<id> on those rolls), and in a fight the Sigil and Soul strikes, prayers, shoves and spotting (u.sk) and the
// three saves (u.sv), kept in step with the song before each roll. A shield of 30+ you give starts your song, like a
// big heal (spec: "land a big heal or shield").
// =====================================================================================================================
const SAVE_SKILL: Record<string, 'body' | 'brain' | 'heart'> = { guts: 'body', rumination: 'brain', composure: 'heart' }; // rules 1.13: the save skills
function songSync(h: Holder) {
  const u = h.u, c = charOf(h), g = gameOf(h); if (!u || !c || !g || musicTraitOf(c)?.id !== h.itemId) return;
  const had: Record<string, number> = ((u as any).songSk ||= {}), sk = (u.sk ||= {});
  for (const s of SKILLS) {
    const d = songMod(g, c, s.id), p = had[s.id] || 0; if (d === p) continue;
    sk[s.id] = (sk[s.id] || 0) - p + d; if (!sk[s.id]) delete sk[s.id];
    const fam = SAVE_SKILL[s.id]; if (fam && u.sv) u.sv[fam] += d - p;
    if (d) had[s.id] = d; else delete had[s.id];
  }
}
for (const id of ['the_soundscape_of_the_soul', 'headbanger', 'underground_sound']) {
  const sync = (_: any, h: Holder) => songSync(h);
  register({
    id, claims: 'all',
    stat: (h, stat, ctx) => {
      if (!/^skill:/.test(stat) || !['passive', 'initiative'].includes(ctx?.roll)) return 0;
      const c = charOf(h), g = gameOf(h); if (!c || !g || musicTraitOf(c)?.id !== h.itemId) return 0;
      return songMod(g, c, stat.slice(6));
    },
    on: {
      combat_start: sync, turn_start: sync, glyph_cost: sync, evoke_cost: sync, outburst_cost: sync, outburst_release: sync, attack_preview: sync,
      cond_apply: (ctx, h) => { if (me(h, ctx.t)) songSync(h); },
      spot: (ctx, h) => { if (me(h, ctx.by) || me(h, ctx.u)) songSync(h); },
      shield_grant: (ctx, h) => {
        const c = charOf(h), g = gameOf(h); if (!me(h, ctx.by) || !c || !g || ctx.n < 30) return;
        startSong(g, c, 'a big shield', 'trait', (t) => log(ctx.cb, t));
      },
    },
    brief: () => 'Narrator: silence zones, broken Blestors, the stealth mission where the music gives you away.',
  });
}

// =====================================================================================================================
// You Get Used to It (Composure, a beta since rules 1.13: it no longer moves AP). I: the first time each round an ally
// within 5 tiles takes a Brain or Heart condition, your next save this round is at +2 (you have seen worse). II: +4, and
// you may give the bonus to that ally instead (the "Seen worse" action, 0 AP): their next save this round. Engine
// reading: "a save" is the save against a condition. PROVISIONAL (spec 14).
// =====================================================================================================================
const YGU_RANGE = 5;
const yguState = (h: Holder): Record<string, any> => (h.u?.ps?.[h.key] as any) || {};
register({
  id: 'you_get_used_to_it', claims: 'all',
  on: {
    cond_landed: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t, cb: Combat = ctx.cb; if (!u || !t || !cb || ow(cb) || me(h, t) || t.side !== u.side || !alive(u) || isBoon(ctx.id)) return;
      const fam = condFamily(ctx.id); if ((fam !== 'brain' && fam !== 'heart') || dist(u.pos, t.pos) > YGU_RANGE) return;
      const s = stateOf(h); if (s.r === cb.round) return;
      s.r = cb.round; s.n = h.tier === 'II' ? 4 : 2; s.to = u.id; s.ally = t.id;
      log(cb, u.name + ' has seen worse than what took ' + t.name + ' (You Get Used to It): +' + s.n + ' on their next save this round.');
    },
    cond_apply: (ctx, h) => {
      const s = yguState(h), cb: Combat = ctx.cb; if (!s.n || !cb || s.r !== cb.round || ctx.t?.id !== s.to || ctx.skipSave || isBoon(ctx.id)) return;
      ctx.saveAdd = (ctx.saveAdd || 0) + s.n; log(cb, '(You Get Used to It: +' + s.n + ' on ' + ctx.t.name + '\'s save.)'); stateOf(h).n = 0;
    },
  },
  actions: [{
    id: 'seen_worse', label: 'Seen worse: give it', scope: ['combat'], ap: 0, target: 'none', uses: { per: 'per_round', n: 1 },
    text: 'Give this round\'s save bonus to the ally whose condition woke it: their next save this round, not yours.',
    available: (h) => { if (h.tier !== 'II' || !h.u || !h.cb) return false; const s = yguState(h); return s.n && s.r === h.cb.round && s.to === h.u.id && h.cb.units.some((x) => x.id === s.ally && alive(x)) ? true : 'Nothing to give this round.'; },
    run: (h) => { const s = stateOf(h), t = h.cb!.units.find((x) => x.id === s.ally); if (!t || !s.n) return 'Nothing to give this round.'; s.to = t.id; log(h.cb, h.u!.name + ' talks ' + t.name + ' through it (You Get Used to It): +' + s.n + ' on ' + t.name + '\'s next save this round.'); return null; },
  }],
  brief: () => null,
});

// Taut Thread (Empathy α; `shared_breath`): data only since rules 1.56 (Shared Breath: move-pool.md).

// Many-Eyed Dream and Wake of the Kill (Visualization α; `mirage`, `blueprint`): data only since rules 1.56 (Balance 2.0).
// Mirage's projections are in docs/design/move-pool.md.

// =====================================================================================================================
// Solid Image (Mastered, Visualization 10; rules 1.56, the alpha perks, item 27). Once per combat, 0 AP: your Glimmer
// (the false Figment every Visualization user has, figments.ts) becomes a real Figment at no charge until the start of
// your next turn: the form the effect names (data: its `form`), outside the held count, with no upkeep, made through the
// one door that makes a Figment (figments.ts makeFigment), its lifetime the effect's `rounds`. The enemies the Glimmer
// fooled stay fooled: their attack now lands on a body. It keeps the old perk's shape (once a fight, free, until your
// next turn starts); Mirage's wall half went with Mirage (move-pool.md).
// =====================================================================================================================
const solidEff = (h: Holder): any => (rawItem(h.key)?.effects || []).find((e: any) => e?.op === 'spawn_illusion') || {};
const glimmerOf = (cb: Combat | null | undefined, u: Unit | null | undefined) => { const i = cb && u ? imageOfOwner(cb, u.id) : null; return i && !i.body ? i : null; };
register({
  id: 'solid_image', claims: 'all',
  actions: [{
    id: 'solidify', label: 'Solidify', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'none',
    text: 'Your Glimmer becomes a real Figment until your next turn starts, at no charge.',
    available: (h) => { const no = visFocusWhy(h.u); if (no) return no; return glimmerOf(h.cb, h.u) ? true : 'Glimmer first: there is no false image of you to make real.'; },
    preview: (h) => {
      const cb = h.cb!, u = h.u!, img = glimmerOf(cb, u); if (!img) return { ok: false, why: 'Glimmer first.' };
      if (!canStand(cb, img.pos)) return { ok: false, why: 'Someone stands on your Glimmer.' };
      return { tiles: [img.pos], lines: ['Your Glimmer at ' + refOf(img.pos) + ' becomes a real ' + (FORM[solidEff(h).form]?.name || 'Figment') + ' until your next turn.'] };
    },
    run: (h, _args, rng) => {
      const cb = h.cb!, u = h.u!, img = glimmerOf(cb, u), e = solidEff(h); if (!img) return 'Glimmer first.';
      const at = img.pos, fooled = [...img.fooled], rounds = Number(e.rounds);
      if (!FORM[e.form] || !Number.isFinite(rounds)) throw new Error('solid_image: its spawn_illusion effect needs a form and rounds (data)');
      const f = makeFigment(cb, rng as Rng, u, e.form, [], at, { charge: 0, free: { rounds } }); if (typeof f === 'string') return f;
      const now = imageOfOwner(cb, u.id); if (now && now.body === f.id) now.fooled = [...new Set([...now.fooled, ...fooled])];
      log(cb, u.name + '\'s Glimmer at ' + refOf(at) + ' becomes real (Solid Image).');
      return null;
    },
  }],
  brief: () => 'Narrator: out of combat, a Glimmer can be made real for a moment (a door held, a blow caught).',
});

void active; void lineOfSight; void unitSave; void ((): Holder | null => null);
