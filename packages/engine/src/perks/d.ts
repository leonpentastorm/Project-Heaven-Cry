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
import {
  register, stateOf, uses, stampOf, note, pendRuling, postStory, grantPerkAp, modOn, boundGame, charOfUnit, holderOf, type Holder,
} from '../effects';
import { SKILLS, SCHOOL } from '../data';
import {
  type Combat, type Unit, dist, xy, key, refOf, alive, active, unitSees, lineOfSight, moveUnit, coverTileFor, objectsOf, standable, emitFx,
} from '../combat';
import {
  applyCond, condOn, condFamily, isBoon, debuffsOf, previewEvoke, releaseOutburst, spellTargets, crystallise, manaBand, manaOf, harm, heal,
  condSkillMod, condHit, SPELL_AP, unitSave, groundCap, evokeMarks, addStrain, outburstArea, formOf, riderStage, stageMult, SECOND_SCHOOL, SHORT_AT_OVER,
  RESONANCE_BONUS, resonates, fadePattern, evokeGrowth, practiceOnce, type Affected,
} from '../magic';
import { asBolt, schoolRider, resonanceExtra } from '../classes/soul';
import { blessing, PATRON, PATRONS, reveal, HEARING } from '../tactics';
import { combatPray, ATHEIST_TN } from '../faith';
import { type Character, mod, prayerCooldown, maxSigilWords, migrateDesign } from '../character';
import { songMod, musicTraitOf, startSong } from '../music';
import { makeObject } from '../objects';
import { applyMemOp } from '../memory';
import { d20, die, type Rng } from '../rng';
import { npcsOf, positionsOf, setStoryCond, strikeFromWorld } from '../game';

// ---------- shared helpers ----------
const ow = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');
const gameOf = (h: Holder): any => h.g ?? boundGame();
const rngOf = (h: Holder, ctx?: any): Rng => ctx?.rng || gameOf(h)?.rng || { state: 1 };
const me = (h: Holder, u: Unit | null | undefined) => !!u && !!h.u && u.id === h.u.id;
const charOf = (h: Holder): Character | null => h.c || charOfUnit(h.u) || null;
const log = (cb: Combat | null | undefined, s: string) => { if (cb) cb.log.push(s); };
const turnStamp = (h: Holder) => stampOf('per_turn', { cb: h.cb, g: gameOf(h) });
const foesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v) && !v.companion);
const alliesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side === u.side && alive(v));
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
const tiles = (h: Holder) => (h.tier === 'II' ? 2 : 1);
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

// =====================================================================================================================
// Hold the Stroke (Brain Power). I: 1 more glyph of yours on the ground at once, II: 2 (spec: Glyphs on the ground;
// item 443). Rules 1.4: the engine asks 'ground_cap' {u, n} for how many of your glyphs stand before the oldest fades,
// so the extra glyphs are plain glyphs (every Line reader, the preview's "fades" and "glyphs left" see them). Max Sigil
// words still caps the words in one spell, and no spell passes 4 glyphs. A 1.3 save's "#pool" tags are cleared on
// your next draw.
// =====================================================================================================================
register({
  id: 'hold_the_stroke', claims: 'all', priority: 300,
  on: {
    ground_cap: (ctx, h) => { if (me(h, ctx.u)) ctx.n += tiles(h); },
    glyph_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return;
      for (const g of ctx.cb?.glyphs || []) if (g.by === h.u!.id + '#pool') g.by = h.u!.id; // a 1.3 save's tags
    },
  },
  brief: () => null,
});
/** Glyphs of this caster on the ground, and the cap (for the UI and tests). */
export function strokePool(cb: Combat, u: Unit): { n: number; pool: number } {
  return { n: (cb.glyphs || []).filter((g) => glyphOwner(g) === u.id).length, pool: groundCap(u, cb) };
}

// =====================================================================================================================
// Parallel Thought (Brain Power). While one of your Sigils is still active, your next Sigil costs 1 AP less (II: 2).
// Rules 1.4: "still active" = one of your placed spells stands (a STAY field, a WAIT trap, a WATCH turret); unfired
// glyphs, smoke, light and RAISE walls don't count. The discount covers that spell's glyph draws first, then its Evoke,
// never below 0; it ends with your Evoke (anything left is lost). Once per turn.
// =====================================================================================================================
function ptState(h: Holder, cb: Combat) {
  const s = stateOf(h), t = turnStamp(h);
  if (s.turn !== t) { s.turn = t; s.left = tiles(h); s.spent = false; s.pend = null; }
  return s;
}
/** Your Evoke ends the turn's discount once any of it was used (an Evoke, or a fused cast: Twin Discipline). */
function ptEvoked(h: Holder, cb: Combat) { const s = ptState(h, cb); if (s.pend || s.spent) { s.left = 0; s.pend = null; } }
register({
  id: 'parallel_thought', claims: 'all', priority: 250,
  on: {
    glyph_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = ptState(h, cb);
      if (!s.left || !placedStanding(cb, h.u!)) return;
      const d = Math.min(s.left, ctx.ap); if (d <= 0) return;
      ctx.ap -= d;
      if (!ctx.preview && h.u!.ap >= ctx.ap && (h.u!.mg?.charge ?? 0) >= ctx.charge) { s.left = Math.round((s.left - d) * 10) / 10; s.spent = true; log(cb, h.u!.name + ' thinks in parallel: the glyph costs ' + d + ' AP less (Parallel Thought).'); }
    },
    // planEvoke is pure (every evoke_cost is a preview): the discount is shown here and taken up at 'evoked'.
    evoke_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = ptState(h, cb);
      s.pend = null;
      if (!s.left || !placedStanding(cb, h.u!)) return;
      const d = Math.min(s.left, ctx.ap); if (d <= 0) return;
      ctx.ap -= d; s.pend = true;
    },
    evoked: (ctx, h) => { if (me(h, ctx.u)) ptEvoked(h, ctx.cb); },
    turn_end: (ctx, h) => { if (me(h, ctx.u)) ptState(h, ctx.cb); },
  },
  brief: () => null,
});

// =====================================================================================================================
// Heart Overload (Will Power). A toggle on Begin an Outburst (or a snap cast): pay its MP in HP instead, 2 HP a point
// (II: 1). True HP loss. Plan 6a-4 (GAMEBREAKING: HP-paid Buff heals were net positive): an HP-paid cast can't heal or
// shield (a healing or shielding design is refused with the toggle on; any other heal or shield it makes comes to 0).
// Rules 1.5 (item 534): it may be held and Pumped now (1.2's "can't be held" made it a snap-only ×0.6 perk); Pumps
// cost AP, never MP, so only the Begin is paid in blood. HP for AP (a Pump paid in blood) was weighed and refused: it
// would turn HP into stage 4 every turn. No Emanator: the perk does nothing; the toggle stays off and isn't offered
// (spec §14 item 371, Leon 7 Nov 2026).
// =====================================================================================================================
register({
  id: 'heart_overload', claims: 'all', priority: 300,
  toggles: [{
    id: 'pay_hp', label: 'Pay with HP', on: ['combat/outburst'],
    available: (h) => !!h.u?.mg?.emanator, // no Emanator: nothing to pay, so no toggle at all (item 371)
    preview: (h) => (h.tier === 'II' ? '1 HP' : '2 HP') + ' per point of mana; blood can\'t heal or shield.',
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'pay_hp') || !h.u!.mg?.emanator || ctx.classMove) return;
      if (mends(ctx.design)) { ctx.fail ||= 'Heart Overload: blood can\'t mend. Turn off Pay with HP to heal or shield.'; return; } // outburst_cost's fail (hooks gap D5)
      const rate = h.tier === 'II' ? 1 : 2; ctx.hp = (ctx.hp || 0) + Math.round(ctx.mp) * rate; ctx.mp = 0;
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'pay_hp')) return;
      if (ctx.hp > 0) { stateOf(h).paid = ctx.design.id; log(ctx.cb, h.u!.name + ' pays ' + ctx.hp + ' HP from the heart (Heart Overload).'); }
    },
    outburst_release: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h);
      if (!s.paid || s.paid !== ctx.design?.id) { s.noMend = null; if (s.paid && !h.u!.mg?.held) s.paid = null; return; }
      s.paid = null;
      if (mends(ctx.design)) log(ctx.cb, 'Heart Overload: blood can\'t mend. This Outburst heals and shields nothing.');
      s.noMend = ctx.cb.log.length;
    },
    heal_in: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.by) && s.noMend != null && s.noMend === ctx.cb?.log.length) ctx.n = 0; },
    shield_grant: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.by) && s.noMend != null && s.noMend === ctx.cb?.log.length) ctx.n = 0; },
  },
  brief: () => null,
});

// =====================================================================================================================
// Resonance (Will Power). Rules 1.5 (item 535): the rule called Resonance gives a later release in the same round +0.2
// for each earlier ally releaser (at most +0.4). The perk widens its window so the two are different things: I: an
// ally's release in the round before counts for your Resonance too (your heart keeps their beat a round longer). II:
// and allies keep yours: your release counts for theirs in the next round as well. The rule's +0.2 a releaser and its
// +0.4 ceiling stand; a wild release neither gives nor gets it, nor does an enemy. 1.2's MP discount (20% / 40%) is gone.
// =====================================================================================================================
interface RelMark { id: string; side: string; round: number }
/** Releases seen this fight (every holder of the perk keeps the same list on its own state). */
const relSeen = (h: Holder): RelMark[] => (stateOf(h).seen ||= []);
function lastRound(cb: Combat, list: RelMark[], u: Unit, exclude: (x: RelMark) => boolean): string[] {
  const now = new Set(((cb as any).soulRel?.round === cb.round ? (cb as any).soulRel.by : []).map((x: any) => x.id));
  return [...new Set(list.filter((x) => x.round === cb.round - 1 && x.side === u.side && x.id !== u.id && !now.has(x.id) && !exclude(x)).map((x) => x.id))];
}
register({
  id: 'resonance', claims: 'all', priority: 50,
  on: {
    outburst_release: (ctx, h) => {
      const u = h.u, r: Unit = ctx.u, cb: Combat = ctx.cb; if (!u || !r || ow(cb) || !resonates(r)) return; // the players' side only (item 549)
      const list = relSeen(h);
      if (!ctx.wild) {
        // I: my release hears allies who released last round. II: an ally's release hears mine from last round.
        let extra: string[] = [];
        if (me(h, r)) extra = lastRound(cb, list, r, () => false);
        else if (h.tier === 'II' && r.side === u.side) extra = lastRound(cb, list, r, (x) => x.id !== u.id);
        if (extra.length) { const f = resonanceExtra(cb, r, ctx.stage, RESONANCE_BONUS * extra.length); if (f > 1) { ctx.mult = (ctx.mult || 1) * f; log(cb, r.name + ' still feels ' + extra.map((id) => cb.units.find((x) => x.id === id)?.name || id).join(', ') + ' (Resonance).'); emitFx(cb, 'resonance', { unit: r.id, at: r.pos, with: extra, bonus: Math.round((f - 1) * 100) / 100, perk: true }); } }
        list.push({ id: r.id, side: r.side, round: cb.round });
        while (list.length > 24) list.shift();
      }
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Rite in the Field (Lore Master). Wards and rituals cost 1 AP less in combat (II: 2). The mapping (provisional, needs
// Leon's OK): wards = drawing a WARD glyph (floor 0.5), Begin on a Buff (Guarded) Outburst (floor 1), the Warden's Ward
// move (stat ap_cost:ward, floor 1); rituals = Pray (floor 1) and Crystallise (floor 1, through the Perks tab's
// "Crystallise (rite)": the engine's own Crystallise has no cost hook).
// =====================================================================================================================
const riteCut = (h: Holder, base: number, floor: number) => Math.max(0, Math.min(tiles(h), base - floor));
register({
  id: 'rite_in_the_field', claims: 'all', priority: 150,
  stat: (h, stat, ctx) => ((stat === 'ap_cost:pray' || stat === 'ap_cost:ward') && !ow(h.cb) ? -riteCut(h, ctx?.base ?? 3, 1) : 0),
  on: {
    glyph_cost: (ctx, h) => { if (me(h, ctx.u) && !ow(ctx.cb) && ctx.word === 'ward') ctx.ap -= riteCut(h, ctx.ap, 0.5); },
    outburst_cost: (ctx, h) => {
      const d = ctx.design; if (!me(h, ctx.u) || ow(ctx.cb) || !d) return;
      if ((d.school === 'buff' && d.option === 'defense') || (d.school2 === 'buff' && (d.option2 || d.option) === 'defense')) ctx.ap -= riteCut(h, ctx.ap, 1);
    },
  },
  actions: [{
    id: 'crystallise', label: 'Crystallise (rite)', scope: ['combat'], target: 'none',
    ap: (h) => SPELL_AP.crystallise - riteCut(h, SPELL_AP.crystallise, 1),
    text: 'Crystallise a mana core from the air (the meter at 10+, −10), for less AP: a ritual in the field.',
    available: (h) => (!h.u?.mg?.emanator ? false : true),
    run: (h) => {
      const u = h.u!, cb = h.cb!;
      u.ap += SPELL_AP.crystallise; // the runtime took the reduced cost; crystallise() takes its full 3
      const err = crystallise(cb, u); if (err) { u.ap -= SPELL_AP.crystallise; return err; }
      return null;
    },
  }],
  brief: () => null,
});

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
    preview: () => '0 MP, 0 Strain: your twin in the upper realm pays.',
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'twin') || uses(h).left('per_combat', 1) <= 0) return;
      ctx.mp = 0; ctx.strain = 0; ctx.hp = 0;
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u)) return;
      // Any other Begin is an ordinary paid one: the free hold of an earlier, let-go twin cast ends here.
      if (!modOn(h, 'twin') || !uses(h).take('per_combat', 1)) { stateOf(h).free = null; return; }
      if (ctx.hold) stateOf(h).free = ctx.design.id;
      log(ctx.cb, 'Up there, someone with ' + h.u!.name + '\'s face flinches (The Twin Pays: no mana, no Strain).');
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
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
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
        u.ap += SPELL_AP.release; const err = asBolt(u, d, () => releaseOutburst(cb, rng, u, t.pos)); if (err) { u.ap -= SPELL_AP.release; break; }
        released++;
      }
    }, () => (released ? 1 + Math.max(0, (held.stage ?? 0) - 1) + (held.felt || []).length : 0));
  } finally { d.modules = mods0; m.soulRange = range0; s.fusing = null; m.held = null; }
  // It is an Evoke too (spec 1.5 section 2.1): the Line earns study and its words their uses.
  const grew = evokeGrowth(cb, u, p.words, p.glyphs.length, hits.some((x) => x.unit.side !== u.side));
  if (grew.length) log(cb, grew.join(' '));
  // The glyphs fade as the spell fires (a Keystone stays), and it counts as your Evoke for Parallel Thought and Clean Draw.
  fadePattern(cb, p); // rules 1.10 (item 919): a junction stays in its other stroke; the strokes left are tidied
  const pt = holderOf({ u, cb, c: h.c }, 'parallel_thought'); if (pt) ptEvoked({ ...pt, u, cb }, cb);
  const cd = holderOf({ u, cb, c: h.c }, 'clean_draw'); if (cd) cleanEvoked({ ...cd, u, cb }, cb, p.glyphs);
  return null;
}

// =====================================================================================================================
// Verse of War (Achieved: Implication 5 + Will Power 5). An Outburst cast while you speak in verse: +1 tile of range,
// ×1.1 Soul damage. Player-declared (plan 4.3: the Narrator is never called per cast): Say the line (free), then Begin
// or Release with the "In verse" toggle (in a fight that chip is its only button: Leon, 9 Nov 2026, no Confirm when the
// move already has a use button); the line goes to the fight notes for the Narrator to audit after the fight. On the
// area map, "Release in verse" (the Perks list there): the line is this round's Say (story/speak), and the audit is a
// pending ruling.
// =====================================================================================================================
function verseNote(h: Holder) { const l = sayLine(h); note(h, 'cast an Outburst in verse' + (l ? ': "' + l.slice(0, 160) + '"' : ' (no line said)') + '. Audit whether it was verse (+1 range, ×1.1 damage given).'); }
register({
  id: 'verse_of_war', claims: [0, 1],
  toggles: [{
    id: 'verse', label: 'In verse', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : sayLine(h) ? true : 'Say your verse first (Say).'),
    preview: () => '+1 tile of range, ×1.1 damage; the Narrator audits the line.',
  }, {
    id: 'verse', label: 'In verse', on: ['combat/release'],
    available: (h) => (!h.u?.mg?.held ? false : sayLine(h) ? true : 'Say your verse first (Say).'),
    preview: () => '+1 tile of range, ×1.1 damage; the Narrator audits the line.',
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
  brief: () => 'Narrator: audit after the fight whether the declared lines were verse.',
});

// =====================================================================================================================
// Fire Sermon (Achieved: Faith 5 + Eloquence 5; deed: convert an enemy mid-fight). Preach (2 AP): until the start of
// your next turn, every Blessing you are granted also tries to leave enemies within 4 tiles (provisional; they hear
// you) Shaken (Heart save against 12 + your Heart debuff strength). Story: preaching is roleplay; a Blessing gained
// while preaching leaves hostile listeners Shaken for the scene (the Narrator rules who).
// =====================================================================================================================
register({
  id: 'fire_sermon', claims: 'all',
  actions: [
    {
      id: 'preach', label: 'Preach', scope: ['combat'], ap: 2, target: 'none',
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
      for (const e of foesOf(cb, u)) if (dist(e.pos, u.pos) <= 4) line += applyCond(cb, rngOf(h, ctx), u, e, 'shaken');
      if (line) log(cb, 'The sermon burns (Fire Sermon)' + line + '.');
    },
  },
  brief: () => 'Narrator: out of combat, who counts as a hostile listener and how a Shaken crowd behaves.',
});

// =====================================================================================================================
// Litany (Faith). A spoken prayer (2 AP, at will; Silenced blocks it): allies within 3 tiles, you included, +1 on all
// saves until the start of your next turn (II: +2). Doesn't stack with another Litany. Story: before a known danger,
// the same prayer gives the party +1/+2 on their next save check.
// =====================================================================================================================
const litOf = (key: string, x: { u?: Unit; c?: Character | null; cb?: Combat | null; g?: any }) => stateOf({ key, ...x } as any);
register({
  id: 'litany', claims: 'all',
  actions: [
    {
      id: 'litany', label: 'Litany', scope: ['combat'], ap: 2, target: 'none',
      text: 'A spoken prayer: allies within 3 tiles, you included, get a bonus on every save until your next turn.',
      available: (h) => (h.u && condOn(h.u, 'silenced') ? 'Silenced: no prayers.' : true),
      run: (h) => {
        const u = h.u!, cb = h.cb!, v = tiles(h), got: string[] = [];
        for (const t of alliesOf(cb, u)) {
          if (dist(t.pos, u.pos) > 3) continue;
          const st = litOf(h.key, { u: t, cb, g: gameOf(h) });
          if (st.lit && st.lit.v > v) continue;
          st.lit = { v, by: u.id }; got.push(t.name);
        }
        log(cb, u.name + ' speaks the Litany: +' + v + ' on saves until their next turn for ' + got.join(', ') + '.');
      },
    },
    {
      id: 'litany_story', label: 'Litany', scope: ['story', 'world'], ap: 0, target: 'none', uses: { per: 'per_scene', n: 1 },
      text: 'Before a known danger: the party gets a bonus on its next save check.',
      run: (h) => {
        const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Pray in the story.';
        for (const x of Object.values(g.characters || {}) as Character[]) if (!x.dead) { const st = litOf(h.key, { c: x, g }); st.lit = { v: tiles(h), by: c.id, scene: g.story?.scene?.n }; }
        postStory(h, 'speaks the Litany over the party (+' + tiles(h) + ' on the next save).');
        return null;
      },
    },
  ],
  on: {
    cond_apply: (ctx, h) => {
      const t: Unit = ctx.t; if (!t || !h.u || !t.ps?.[h.key]?.lit) return;
      const lit = t.ps[h.key].lit; if (lit.by === h.u.id) ctx.saveAdd = (ctx.saveAdd || 0) + lit.v;
    },
    turn_start: (ctx, h) => {
      if (!me(h, ctx.u)) return;
      for (const t of ctx.cb.units as Unit[]) { const st = t.ps?.[h.key]; if (st?.lit?.by === h.u!.id) delete st.lit; }
    },
    check_mod: (ctx, h) => {
      const c = charOf(h), g = gameOf(h); if (!c || !g || ctx.ck?.kind !== 'save') return;
      const st = litOf(h.key, { c: ctx.c, g });
      if (st.lit?.by === c.id) { ctx.add.push({ add: st.lit.v, label: 'Litany' }); delete st.lit; }
    },
  },
  brief: () => null,
});

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
const upperFoes = (cb: Combat, u: Unit) => foesOf(cb, u).filter(isUpper);
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
// the backlash and Strain falling to the limit still happen). +10% Outburst damage (Soul damage you deal, and an
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
    strain_change: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (ctx.why === 'short') s.shorting = false; else if (ctx.to - (ctx.limit ?? 0) >= SHORT_AT_OVER && ctx.to > ctx.from) s.shorting = true; },
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
      const near = foesOf(cb, u).filter((v) => dist(v.pos, u.pos) <= 10);
      for (const v of near) (((cb.lastSeen ||= {})[v.side] ||= {}))[u.id] = u.pos;
      if (near.length) (cb.notes ||= []).push('TRAIT Hollow Heart (' + u.name + ', r' + cb.round + '): the Outburst is loud: ' + near.map((v) => v.name).join(', ') + ' know where ' + u.name + ' is until their next turn — yours to rule');
    },
    hide: (ctx, h) => { if (me(h, ctx.u) && stateOf(h).cast === turnStamp(h)) reveal(ctx.cb, h.u!, 'Echo Chamber: you cast this turn'); },
  },
  brief: () => 'Narrator: the stealth mission where you\'ll want to cast anyway.',
});

// =====================================================================================================================
// Heretic (trait). Stolen Fire: pray and use Blessings without Faith or a pact: the Perks action prays to any patron
// for one of its Blessings with Will Power in Faith's place (the 3/5/7 gates, the roll, the cooldown), and Blessing
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
        const r = d20(rng), m = mod(c.skills.will_power || 0), tn = ATHEIST_TN[pick.bl.tier || 1] ?? 14, ok = r === 20 || (r !== 1 && r + m >= tn); // rules 1.6: by dice
        const eid = postStory(h, 'steals a prayer to ' + pick.p.name + ': d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs ' + tn + (ok ? ' · heard' : ' · silence') + (args.text ? ' ("' + String(args.text).slice(0, 160) + '")' : ''));
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
// True Believer (trait). Unshaken: prayer cooldown 1 turn shorter (minimum 1). Once per session your prayer is
// answered with a small miracle (a story button: the Narrator grants it). Rites: every day you can't keep them, −1 on
// Faith and Will Power rolls until amends; the Narrator keeps the count in traitState rites_missed (capped at −3, plan
// 6a, provisional).
// =====================================================================================================================
const ritesMissed = (c: Character | null | undefined) => Math.max(0, Math.min(3, Number(c?.state?.rites_missed ?? c?.state?.true_believer?.rites_missed ?? 0) || 0));
register({
  id: 'true_believer', claims: [0, 2],
  stat: (h, stat) => ((stat === 'skill:faith' || stat === 'skill:will_power') ? -ritesMissed(charOf(h)) : 0),
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
  on: {
    turn_start: (ctx, h) => {
      const u = h.u, c = charOf(h); if (!me(h, ctx.u) || !c || u!.prayedRound == null) return; const s = stateOf(h);
      if (s.adj === u!.prayedRound) return;
      if (prayerCooldown(c) > 1) u!.prayedRound = u!.prayedRound - 1;
      s.adj = u!.prayedRound;
    },
  },
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
      const r = d20(rngOf(h, ctx)), m = mod(c.skills.faith || 0) + (u.sk?.faith || 0), ok = r === 20 || (r !== 1 && r + m >= 12);
      log(cb, u.name + ' faces Heaven\'s own: Faith d20 ' + r + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' vs 12 · ' + (ok ? 'steady' : 'hesitates (−2 AP on the first turn)') + ' (Heaven\'s Faithful).');
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
const SAVE_SKILL: Record<string, 'body' | 'brain' | 'heart'> = { guts: 'body', charisma: 'brain', composure: 'heart' };
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
// You Get Used to It (Composure). I: −1 AP on your next turn when an ally takes a Brain debuff (once a turn); +3 AP
// now when you heal or shield an ally who carries one (once a turn; the +3 perk cap applies). II: no penalty.
// =====================================================================================================================
const brainDebuffed = (t: Unit) => debuffsOf(t, 'brain').length > 0;
function ygui(h: Holder, ctx: any) {
  const u = h.u, t: Unit = ctx.t; if (!u || !me(h, ctx.by) || !t || me(h, t) || t.side !== u.side || !brainDebuffed(t) || !(ctx.n > 0)) return;
  if (!uses(h).take('per_turn', 1, h.key + '#gain')) return;
  grantPerkAp(ctx.cb, u, 3, 'You Get Used to It');
}
register({
  id: 'you_get_used_to_it', claims: 'all',
  on: {
    cond_landed: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t; if (!u || h.tier === 'II' || !t || me(h, t) || t.side !== u.side || condFamily(ctx.id) !== 'brain' || isBoon(ctx.id)) return;
      const s = stateOf(h); if (s.pen) return; s.pen = 1; log(ctx.cb, u.name + ' flinches for ' + t.name + ': −1 AP next turn (You Get Used to It).');
    },
    turn_start_pre: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (s.pen) { ctx.penalties.push({ n: 1, why: 'You Get Used to It' }); s.pen = 0; } },
    heal_given: (ctx, h) => ygui(h, ctx),
    shield_grant: (ctx, h) => ygui(h, ctx),
  },
  brief: () => null,
});

// =====================================================================================================================
// Shared Breath (Empathy). 2 AP, link with an ally within 3 tiles you can see (provisional). The next Heart debuff
// (Fear, Shaken, Taunted, Commanded, Disarmed…) that lands on either of you lands on both, each at half its duration
// (rounded up, minimum 1; untimed ones stay untimed). II: the link lasts the whole fight and splits every Heart debuff.
// =====================================================================================================================
register({
  id: 'shared_breath', claims: 'all',
  actions: [{
    id: 'link', label: 'Shared Breath', scope: ['combat'], ap: 2, target: 'ally', range: 3,
    text: 'Link with an ally: the next Heart debuff on either of you is split between you, each at half its duration.',
    preview: (h, args) => { const t = h.cb?.units.find((x) => x.id === args.targetId); if (t && (me(h, t))) return { ok: false, why: 'Link with someone else.' }; if (t && h.u && !unitSees(h.cb!, h.u, t.pos)) return { ok: false, why: 'You can\'t see them.' }; },
    run: (h, args) => {
      const t = h.cb!.units.find((x) => x.id === args.targetId)!; const s = stateOf(h);
      s.link = { b: t.id, left: h.tier === 'II' ? 999 : 1 };
      log(h.cb, h.u!.name + ' breathes with ' + t.name + ' (Shared Breath' + (h.tier === 'II' ? ': all fight' : '') + ').');
    },
  }],
  on: {
    cond_landed: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t, s = stateOf(h), cb: Combat = ctx.cb; if (!u || !t || !s.link || s.busy) return;
      if (condFamily(ctx.id) !== 'heart' || isBoon(ctx.id)) return;
      const partnerId = me(h, t) ? s.link.b : t.id === s.link.b ? u.id : null; if (!partnerId) return;
      const p = cb.units.find((x) => x.id === partnerId); if (!p || p.dead) { s.link = null; return; }
      const full = t.conds?.[ctx.id] ?? ctx.rounds, timed = full < 99, half = timed ? Math.max(1, Math.ceil(full / 2)) : undefined;
      if (timed && t.conds) t.conds[ctx.id] = half!;
      s.busy = true;
      try { log(cb, 'Shared Breath: ' + t.name + ' and ' + p.name + ' share it' + (half ? ' (' + half + ' round' + (half === 1 ? '' : 's') + ' each)' : '') + applyCond(cb, rngOf(h, ctx), ctx.by || null, p, ctx.id, half, undefined, { skipSave: true }) + '.'); }
      finally { s.busy = false; }
      if (--s.link.left <= 0) s.link = null;
    },
  },
  brief: () => null,
});

// =====================================================================================================================
// Mirage (Visualization). 2 AP, at will: project a false wall, figure or sound onto a tile within 6 + mod(Visualization)
// (provisional). Each enemy that sees the tile (hears it, for a sound: 8 tiles) rolls d20 + its tier (minion 0 · soldier
// 1 · elite 2 · boss 3) against 12 + mod(Visualization) (provisional); on a failure it believes the projection until
// the start of your next turn (II: two projections, until the start of the turn after). A wall stops a believer's
// move and blocks its shots through the tile; a figure draws a believer's attack (the attack goes at the figure and
// finds only light, and that enemy stops believing); a sound draws a believer one move toward it. Plan 6a-10: one cast
// at a time (a new cast replaces the old), an enemy that saw through one gets +5 against your later Mirages. Tier II's
// second projection: args.text "x,y" (same kind) or "kind@x,y".
// =====================================================================================================================
interface Proj { id: string; kind: 'wall' | 'figure' | 'sound'; tile: string; left: number; believers: string[]; solid?: boolean }
const MIR_KEY = 'perk:mirage';
const mirState = (u: Unit, cb: Combat | null | undefined, g?: any) => stateOf({ key: MIR_KEY, u, cb, g } as any);
const visMod = (c: Character | null | undefined) => mod(c?.skills?.visualization || 0);
/** Tiles on the line between two tiles (excluding the ends). */
function lineTiles(a: string, b: string): string[] {
  let [x0, y0] = xy(a); const [x1, y1] = xy(b), out: string[] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } const k = key(x0, y0); if (k !== b) out.push(k); }
  return out;
}
/** Every live projection on the field, with its caster. */
function projections(cb: Combat): { by: Unit; p: Proj }[] {
  const out: { by: Unit; p: Proj }[] = [];
  for (const u of cb.units) for (const p of ((u.ps?.[MIR_KEY]?.proj || []) as Proj[])) out.push({ by: u, p });
  return out;
}
const believes = (e: Unit, p: Proj) => p.believers.includes(e.id);
function disprove(by: Unit, e: Unit, p: Proj) { p.believers = p.believers.filter((x) => x !== e.id); const s = by.ps![MIR_KEY]; if (!(s.disproved ||= []).includes(e.id)) s.disproved.push(e.id); }
function castMirage(h: Holder, rng: Rng, specs: { kind: Proj['kind']; tile: string }[]): string {
  const u = h.u!, cb = h.cb!, c = charOf(h), s = mirState(u, cb, gameOf(h)), tn = 12 + visMod(c), left = h.tier === 'II' ? 2 : 1;
  s.proj = []; // one cast at a time: a new one replaces the old
  const lines: string[] = [];
  for (const sp of specs) {
    const p: Proj = { id: 'mi' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: sp.kind, tile: sp.tile, left, believers: [] };
    const rolls: string[] = [];
    for (const e of foesOf(cb, u)) {
      const aware = sp.kind === 'sound' ? dist(e.pos, sp.tile) <= HEARING : unitSees(cb, e, sp.tile); if (!aware) continue;
      const m = TIER_SAVE[e.tier || 'minion'] ?? 0, plus = (s.disproved || []).includes(e.id) ? 5 : 0, r = d20(rng), ok = r === 20 || (r !== 1 && r + m + plus >= tn);
      if (!ok) p.believers.push(e.id);
      rolls.push(e.name + ' ' + (r + m + plus) + (ok ? ' sees through it' : ' believes'));
    }
    s.proj.push(p);
    lines.push('a ' + sp.kind + ' at ' + refOf(sp.tile) + (rolls.length ? ' (Analysis vs ' + tn + ': ' + rolls.join(', ') + ')' : ' (no one sees it)'));
  }
  return u.name + ' projects ' + lines.join(' and ') + ' (Mirage).';
}
const KINDS = ['wall', 'figure', 'sound'];
function mirSpecs(h: Holder, args: any): { kind: Proj['kind']; tile: string }[] | string {
  const kind = (KINDS.includes(String(args.choice)) ? args.choice : 'figure') as Proj['kind'];
  if (!args.tile) return 'Pick a tile.';
  const out = [{ kind, tile: args.tile as string }];
  if (h.tier === 'II' && args.text) { const m = /^(?:(wall|figure|sound)@)?(\d+,\d+)$/.exec(String(args.text).trim()); if (m) out.push({ kind: (m[1] || kind) as Proj['kind'], tile: m[2] }); }
  const u = h.u!, cb = h.cb!, range = 6 + visMod(charOf(h));
  for (const sp of out) {
    if (dist(u.pos, sp.tile) > range) return 'Out of range (' + range + ' tiles).';
    if (!standable(cb.map, sp.tile)) return 'Nothing can be projected there.';
  }
  return out;
}
register({
  id: 'mirage', claims: 'all',
  actions: [
    {
      id: 'mirage', label: 'Mirage', scope: ['combat'], ap: 2, target: 'tile',
      text: 'Project a false wall, figure or sound onto a tile in range. Enemies who fail an Analysis check believe it.',
      preview: (h, args) => { const sp = mirSpecs(h, args); if (typeof sp === 'string') return { ok: false, why: sp }; return { tiles: sp.map((x) => x.tile), lines: ['A ' + sp.map((x) => x.kind).join(' and a ') + ' (Analysis vs ' + (12 + visMod(charOf(h))) + ')'] }; },
      run: (h, args, rng) => { const sp = mirSpecs(h, args); if (typeof sp === 'string') return sp; log(h.cb, castMirage(h, rng, sp)); return null; },
    },
    {
      // 2 overworld AP on the area map (the audit's story side); free in the story panel (a scene's action, once a round there).
      id: 'mirage_story', label: 'Mirage', scope: ['story', 'world'], ap: (h) => (h.cb ? 2 : 0), target: 'text',
      text: 'Project a false wall, figure or sound to distract or misdirect. The engine rolls the NPCs\' Analysis; the Narrator plays them.',
      run: (h, args, rng) => {
        const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Project in the story.';
        const tn = 12 + visMod(c), rolls = npcsOf(g).filter((n: any) => n.side === 'hostile' && !n.dead).slice(0, 8).map((n: any) => { const r = d20(rng), m = TIER_SAVE[n.tier || 'minion'] ?? 0, ok = r === 20 || (r !== 1 && r + m >= tn); return n.name + ' ' + (r + m) + (ok ? ' sees through it' : ' believes'); });
        const t = String(args.text || '').trim().slice(0, 200), eid = postStory(h, 'projects ' + t + ' (Mirage; Analysis vs ' + tn + (rolls.length ? ': ' + rolls.join(', ') : '') + ').');
        pendRuling(g, c, h.key, 'Mirage: ' + c.name + ' projects ' + t + '. The engine rolled: ' + (rolls.join(', ') || 'no hostile NPCs nearby') + '. Play what the fooled NPCs do.', eid || undefined);
        return null;
      },
    },
  ],
  on: {
    turn_start: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = mirState(h.u!, ctx.cb);
      for (const p of (s.proj || []) as Proj[]) p.left--;
      const gone = ((s.proj || []) as Proj[]).filter((p) => p.left <= 0);
      if (gone.length) log(ctx.cb, 'The Mirage fades at ' + gone.map((p) => refOf(p.tile)).join(', ') + '.');
      s.proj = ((s.proj || []) as Proj[]).filter((p) => p.left > 0);
    },
    move_step: (ctx, h) => {
      const e: Unit = ctx.u; if (!h.u || !e || e.side === h.u.side || ctx.stop) return;
      for (const p of (mirState(h.u, ctx.cb).proj || []) as Proj[]) if (p.kind === 'wall' && !p.solid && p.tile === ctx.at && believes(e, p)) { e.pos = ctx.from; ctx.stop = 'a wall that isn\'t there'; log(ctx.cb, e.name + ' stops at a wall that isn\'t there (Mirage).'); return; }
    },
    attack_preview: (ctx, h) => {
      const a: Unit = ctx.att; if (!h.u || !a || a.side === h.u.side || ctx.fail || ctx.melee) return;
      const line = lineTiles(a.pos, ctx.tgt.pos);
      for (const p of (mirState(h.u, ctx.cb).proj || []) as Proj[]) if (p.kind === 'wall' && !p.solid && believes(a, p) && line.includes(p.tile)) { ctx.fail = 'A wall stands in the way (or so they believe).'; return; }
    },
    attack_roll: (ctx, h) => {
      const a: Unit = ctx.att, t: Unit = ctx.tgt, u = h.u; if (!u || !a || !t || a.side === u.side || t.side !== u.side || ctx.hit === false) return;
      const p = ((mirState(u, ctx.cb).proj || []) as Proj[]).find((x) => x.kind === 'figure' && !x.solid && believes(a, x) && unitSees(ctx.cb, a, x.tile));
      if (!p) return;
      ctx.hit = false; disprove(u, a, p);
      log(ctx.cb, a.name + ' attacks the figure at ' + refOf(p.tile) + ': it is only light (Mirage). ' + a.name + ' won\'t be fooled by it again.');
    },
    enemy_action_start: (ctx, h) => {
      const e: Unit = ctx.u, u = h.u, cb: Combat = ctx.cb; if (!u || !e || e.side === u.side || ctx.skip) return;
      const p = ((mirState(u, cb).proj || []) as Proj[]).find((x) => x.kind === 'sound' && believes(e, x)); if (!p) return;
      p.believers = p.believers.filter((x) => x !== e.id); // one move toward it, then it knows
      const [ex, ey] = xy(e.pos), r = Math.max(1, Math.floor(e.movement * 2)), cand: string[] = [];
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const k = key(ex + dx, ey + dy); if (k !== e.pos && dist(k, p.tile) < dist(e.pos, p.tile)) cand.push(k); }
      cand.sort((a, b) => dist(a, p.tile) - dist(b, p.tile) || dist(a, e.pos) - dist(b, e.pos));
      for (const k of cand.slice(0, 24)) { if (!moveUnit(cb, e, k, rngOf(h, ctx))) { log(cb, e.name + ' goes after a sound at ' + refOf(p.tile) + ' (Mirage).'); ctx.skip = true; return; } }
    },
  },
  brief: () => 'Narrator: out of combat, what the fooled NPCs do.',
});

// =====================================================================================================================
// Solid Image (Mastered, Visualization 10). Once per combat, 0 AP: one of your Mirage projections becomes real until
// the start of your next turn. A wall blocks movement and line of sight for everyone (a solid barricade); a figure takes
// the first hit aimed at any ally (0 damage to them) and then breaks. Story: the Narrator rules it from the text.
// (The Visualization Afterimage decoy is not built yet: only Mirage projections can be solidified.)
// =====================================================================================================================
register({
  id: 'solid_image', claims: 'all',
  actions: [{
    id: 'solidify', label: 'Solidify', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'tile',
    text: 'One of your projections becomes real until your next turn: a wall blocks movement and shots; a figure takes one hit meant for an ally.',
    available: (h) => (h.u && ((mirState(h.u, h.cb).proj || []) as Proj[]).some((p) => p.kind !== 'sound') ? true : 'Project a wall or figure first (Mirage).'),
    preview: (h, args) => {
      const p = ((mirState(h.u!, h.cb).proj || []) as Proj[]).find((x) => x.tile === args.tile && x.kind !== 'sound');
      if (!p) return { ok: false, why: 'Pick one of your projected walls or figures.' };
      if (p.kind === 'wall' && h.cb!.units.some((x) => !x.dead && x.pos === p.tile)) return { ok: false, why: 'Someone stands there.' };
    },
    run: (h, args) => {
      const u = h.u!, cb = h.cb!, p = ((mirState(u, cb).proj || []) as Proj[]).find((x) => x.tile === args.tile && x.kind !== 'sound')!;
      p.solid = true; p.left = Math.max(p.left, 1); const s = stateOf(h);
      if (p.kind === 'wall') { const o = makeObject('solid_' + p.id, 'barricade', p.tile, { name: 'Solid image', text: 'A projection made real (Solid Image).' }); cb.objects = [...objectsOf(cb), o]; s.wall = o.id; }
      else s.figure = p.id;
      log(cb, u.name + '\'s ' + p.kind + ' at ' + refOf(p.tile) + ' becomes real (Solid Image).');
    },
  }],
  on: {
    turn_start: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h), cb: Combat = ctx.cb;
      if (s.wall) { cb.objects = objectsOf(cb).filter((o) => o.id !== s.wall); s.wall = null; log(cb, 'The solid image fades back to light.'); }
      if (s.figure) { s.figure = null; }
    },
    damage_in: (ctx, h) => {
      const u = h.u, t: Unit = ctx.t, s = stateOf(h); if (ctx.phase !== 'reduce' || !u || !t || !s.figure || t.side !== u.side || !ctx.hostile || ctx.dmg <= 0) return;
      const ms = mirState(u, ctx.cb), p = ((ms.proj || []) as Proj[]).find((x) => x.id === s.figure);
      ctx.dmg = 0; s.figure = null; if (p) ms.proj = (ms.proj as Proj[]).filter((x) => x !== p);
      log(ctx.cb, 'The solid image takes the blow meant for ' + t.name + ' and breaks (Solid Image).');
    },
  },
  brief: () => 'Narrator: out of combat, a projection can be made real for a moment (a door held, a blow caught).',
});

void active; void lineOfSight; void unitSave; void ((): Holder | null => null);
