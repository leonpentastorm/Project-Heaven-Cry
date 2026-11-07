// Lane D: Sigil, Soul, prayer and music. Perks: Hold the Stroke, Parallel Thought, Heart Overload, Resonance, Rite in
// the Field, Litany, Mirage, You Get Used to It, Shared Breath; Mastered: Clean Draw, The Twin Pays, Solid Image;
// Achieved: Twin Souls, Verse of War, Fire Sermon; Ultimate: Twin Discipline. Traits: Upper-Touched, Sigil Savant,
// Hollow Heart, Heretic, True Believer, Heaven's Faithful, and the three music traits (The Soundscape of the Soul,
// Headbanger, Underground Sound).
//
// Every number the data or the spec doesn't give is provisional and listed in docs/rules/pending/lane-d.md (the open
// items for spec section 14), with the hooks this file works around. Randomness comes from the rng the hook or action
// passes, else the bound game's rng (g.rng). What the engine can't run goes to the Narrator: a fight note, a pending
// ruling, or the item's brief() remainder in the character brief.
import {
  register, stateOf, uses, stampOf, note, pendRuling, postStory, grantPerkAp, modOn, boundGame, charOfUnit, type Holder,
} from '../effects';
import { SKILLS, SCHOOL } from '../data';
import {
  type Combat, type Unit, dist, xy, key, refOf, alive, active, unitSees, lineOfSight, moveUnit, coverTileFor, objectsOf, standable,
} from '../combat';
import {
  applyCond, condOn, condFamily, isBoon, debuffsOf, previewEvoke, releaseOutburst, crystallise, manaBand, manaOf, harm, heal,
  condSkillMod, condHit, SPELL_AP, unitSave,
} from '../magic';
import { pray, blessing, PATRON, PATRONS, reveal, HEARING } from '../tactics';
import { type Character, mod, prayerCooldown, maxSigilWords } from '../character';
import { songMod, musicTraitOf, startSong } from '../music';
import { makeObject } from '../objects';
import { applyMemOp } from '../memory';
import { d20, die, type Rng } from '../rng';
import { npcsOf } from '../game';

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
/** Whose glyph this is (Hold the Stroke tags pooled glyphs "<unitId>#pool" so the engine's fade check skips them). */
const glyphOwner = (g: { by: string }) => String(g.by).split('#')[0];
const myZones = (cb: Combat, u: Unit) => (cb.zones || []).filter((z) => z.by === u.id);
/** A standing STAY zone of this caster (STAY walls, smoke and light stand at half power; impact smoke and light don't). */
const stayStanding = (cb: Combat, u: Unit) => myZones(cb, u).some((z) => z.mult === 0.5 && z.left > 0);
const tiles = (h: Holder) => (h.tier === 'II' ? 2 : 1);
/** The design heals or shields (Buff heal, or Damage with Inverse on allies). */
const mends = (d: any) => [d.school, d.school2, d.school3].some((s, i) => (s === 'buff' && ((i === 0 ? d.option : i === 1 ? d.option2 : d.option3) || d.option || 'heal') === 'heal')) || (d.modules || []).includes('inverse');
/** The last thing this character said aloud in this round of the fight (combat/say writes "Name (round N): "…""). */
function sayLine(h: Holder): string | null {
  const cb = h.cb, c = charOf(h); if (!cb || !c) return null;
  const head = c.name + ' (round ' + cb.round + '): "';
  const n = [...(cb.notes || [])].reverse().find((x) => x.startsWith(head));
  return n ? n.slice(head.length, -1) : null;
}

// =====================================================================================================================
// Hold the Stroke (Brain Power). I: 1 extra stroke in your Sigil pool, II: 2. The stroke pool (spec item 15, proposed):
// how many of your glyphs may stand on the map at once before the oldest fades; Max Sigil words still caps the words
// in one spell. The engine fades your oldest glyph past Max Sigil words, so the extra glyphs are tagged "#pool" (not
// counted by that check) and re-tagged before every draw.
// =====================================================================================================================
register({
  id: 'hold_the_stroke', claims: 'all', priority: 300,
  on: {
    glyph_cost: (ctx, h) => {
      if (ctx.preview || !me(h, ctx.u) || !h.u!.mg) return;
      const cb: Combat = ctx.cb, u = h.u!, m = u.mg!, extra = tiles(h);
      const list = (cb.glyphs || []).filter((g) => glyphOwner(g) === u.id);
      for (const g of list) g.by = u.id;
      const n = list.length, pool = m.maxWords + extra;
      // After this draw there are n + 1. Within the pool nothing fades; past it, the true oldest fades and `pool` stand.
      const tag = n + 1 <= pool ? Math.max(0, n + 1 - m.maxWords) : extra;
      for (let i = 0; i < tag && i < n; i++) list[n - 1 - i].by = u.id + '#pool';
    },
  },
  brief: () => null,
});
/** Glyphs of this caster on the ground, and the pool (for the UI and tests). */
export function strokePool(cb: Combat, u: Unit): { n: number; pool: number } {
  const t = (u.held?.perks || []).find((p: any) => p.id === 'hold_the_stroke') as any;
  const c = charOfUnit(u), tier = t?.tier || (c?.perks || []).find((p) => p.id === 'hold_the_stroke')?.tier;
  return { n: (cb.glyphs || []).filter((g) => glyphOwner(g) === u.id).length, pool: (u.mg?.maxWords || 0) + (tier === 'II' ? 2 : tier ? 1 : 0) };
}

// =====================================================================================================================
// Parallel Thought (Brain Power). While one of your STAY zones stands, your next Sigil costs 1 AP less (II: 2): the
// discount covers that spell's glyph draws and then its Evoke, floor 0; it ends when you Evoke. Once per turn, STAY
// zones only (plan 6a-9: the 99-round LIGHT impact zone would make every Sigil cheaper all fight).
// =====================================================================================================================
function ptState(h: Holder, cb: Combat) {
  const s = stateOf(h), t = turnStamp(h);
  if (s.turn !== t) { s.turn = t; s.left = tiles(h); s.pend = null; }
  if (s.pend) { // did the Evoke we discounted happen? (its glyphs are gone, or a STAY zone appeared)
    const gone = s.pend.ids.some((id: string) => !(cb.glyphs || []).some((g) => g.id === id)), z = myZones(cb, h.u!).length;
    if (gone || z > s.pend.zones) { s.left = 0; s.pend = null; }
  }
  return s;
}
register({
  id: 'parallel_thought', claims: 'all', priority: 250,
  on: {
    glyph_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = ptState(h, cb);
      if (!s.left || !stayStanding(cb, h.u!)) return;
      const d = Math.min(s.left, ctx.ap); if (d <= 0) return;
      ctx.ap -= d;
      if (!ctx.preview && h.u!.ap >= ctx.ap && (h.u!.mg?.charge ?? 0) >= ctx.charge) { s.left = Math.round((s.left - d) * 10) / 10; log(cb, h.u!.name + ' thinks in parallel: the glyph costs ' + d + ' AP less (Parallel Thought).'); }
    },
    evoke_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = ptState(h, cb);
      if (!s.left || !stayStanding(cb, h.u!)) return;
      const d = Math.min(s.left, ctx.ap); if (d <= 0) return;
      ctx.ap -= d; s.pend = { ids: ctx.pattern.glyphs.map((g: any) => g.id), zones: myZones(cb, h.u!).length };
    },
    turn_end: (ctx, h) => { if (me(h, ctx.u)) ptState(h, ctx.cb); },
  },
  brief: () => null,
});

// =====================================================================================================================
// Heart Overload (Will Power). A toggle on Begin an Outburst: pay its MP in HP instead, 2 HP a point (II: 1). True HP
// loss. Plan 6a-4 (GAMEBREAKING: HP-paid Buff heals were net positive): an HP-paid cast can't heal or shield (the heal
// and shield come to 0) and can't be held to grow (holding pays mana as usual). No Emanator: you already pay from the
// air, so the toggle is off (Leon to decide whether it should waive the +2 Strain instead).
// =====================================================================================================================
register({
  id: 'heart_overload', claims: 'all', priority: 300,
  toggles: [{
    id: 'pay_hp', label: 'Pay with HP', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : !h.u.mg.emanator ? 'No Emanator: you already pay from the air.' : true),
    preview: (h) => (h.tier === 'II' ? '1 HP' : '2 HP') + ' per point of mana; can\'t heal, shield or be held.',
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'pay_hp') || !h.u!.mg?.emanator || !ctx.release) return;
      const rate = h.tier === 'II' ? 1 : 2; ctx.hp = (ctx.hp || 0) + Math.round(ctx.mp) * rate; ctx.mp = 0;
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'pay_hp')) return;
      if (ctx.hold) { log(ctx.cb, 'Heart Overload: an Outburst held to grow is paid in mana, not blood.'); return; }
      if (ctx.hp > 0) { stateOf(h).paid = true; log(ctx.cb, h.u!.name + ' pays ' + ctx.hp + ' HP from the heart (Heart Overload).'); }
    },
    outburst_release: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h);
      if (!s.paid) { s.noMend = null; return; }
      s.paid = false;
      if (mends(ctx.design)) log(ctx.cb, 'Heart Overload: blood can\'t mend. This Outburst heals and shields nothing.');
      s.noMend = ctx.cb.log.length;
    },
    heal_in: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.by) && s.noMend != null && s.noMend === ctx.cb?.log.length) ctx.n = 0; },
    shield_grant: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.by) && s.noMend != null && s.noMend === ctx.cb?.log.length) ctx.n = 0; },
  },
  brief: () => null,
});

// =====================================================================================================================
// Resonance (Will Power). When an ally begins an Outburst within 3 tiles of you, your next Outburst costs 20% less MP
// (II: 40%). Doesn't stack; your next Begin uses it up. Allies only.
// =====================================================================================================================
register({
  id: 'resonance', claims: 'all', priority: 50,
  on: {
    outburst_begin: (ctx, h) => {
      const u = h.u, c: Unit = ctx.u; if (!u || !c) return; const s = stateOf(h);
      if (me(h, c)) { if (s.disc) s.disc = 0; return; }
      if (c.side !== u.side || !alive(u) || dist(c.pos, u.pos) > 3) return;
      const v = h.tier === 'II' ? 0.4 : 0.2;
      if ((s.disc || 0) < v) { s.disc = v; log(ctx.cb, u.name + ' resonates with ' + c.name + ': the next Outburst costs ' + v * 100 + '% less (Resonance).'); }
    },
    outburst_cost: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.u) && s.disc) ctx.mp = ctx.mp * (1 - s.disc); },
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
// and add no Flux; Evoking a pattern made only of those clean glyphs costs no charge. The Evoke disarms it; if the
// clean glyphs fade or are scuffed first, the use is spent. Max Sigil words still limits the spell.
// =====================================================================================================================
function cleanSettle(h: Holder, cb: Combat, s: any) {
  if (!s.clean) return;
  const live = (id: string) => (cb.glyphs || []).some((g) => g.id === id);
  if (s.pend) { if (s.pend.ids.some((id: string) => !live(id)) || myZones(cb, h.u!).length > s.pend.zones) { s.clean = false; s.pend = null; log(cb, 'Clean Draw is spent.'); } return; }
  if ((s.ids || []).length && !(s.ids as string[]).some(live)) { s.clean = false; log(cb, 'The clean glyphs are gone: Clean Draw is spent.'); }
}
register({
  id: 'clean_draw', claims: 'all', priority: 400,
  actions: [{
    id: 'arm', label: 'Clean Draw', scope: ['combat'], ap: 0, uses: { per: 'per_combat', n: 1 }, target: 'none',
    text: 'Once a fight: the glyphs you draw next cost no charge and no Flux, and firing a pattern of only those glyphs costs no charge.',
    available: (h) => (!h.u?.mg?.evoker ? false : stateOf(h).clean ? 'Armed: your next Sigil draws clean.' : true),
    run: (h) => { const s = stateOf(h); s.clean = true; s.ids = []; s.pend = null; log(h.cb, h.u!.name + ' steadies the hand: the next Sigil draws clean (Clean Draw).'); },
  }],
  on: {
    glyph_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = stateOf(h); cleanSettle(h, cb, s);
      if (!s.clean || s.pend) return;
      ctx.charge = 0; ctx.flux = 0;
      if (!ctx.preview) (s.ids ||= []).push('gl' + ((cb.glyphSeq || 0) + 1)); // drawGlyph's next id
    },
    evoke_cost: (ctx, h) => {
      if (!me(h, ctx.u)) return; const cb: Combat = ctx.cb, s = stateOf(h); cleanSettle(h, cb, s);
      if (!s.clean) return;
      const gl: any[] = ctx.pattern.glyphs || [];
      if (gl.length && gl.every((g) => (s.ids || []).includes(g.id) && glyphOwner(g) === h.u!.id)) { ctx.charge = 0; s.pend = { ids: gl.map((g) => g.id), zones: myZones(cb, h.u!).length }; }
    },
    turn_start: (ctx, h) => { if (me(h, ctx.u)) cleanSettle(h, ctx.cb, stateOf(h)); },
  },
  brief: () => null,
});

// =====================================================================================================================
// The Twin Pays (Mastered, Will Power 10). A toggle on Begin, once per combat: no MP, no meter drop, no Strain on the
// cast or while it is held, and a Right Brain Debuff's +20% is 0 too. The engine adds a held Outburst's Strain at the
// start of each turn, so the Strain is taken off at the end of the turn before (the Mana Short check never sees it).
// =====================================================================================================================
register({
  id: 'the_twin_pays', claims: 'all', priority: 500,
  toggles: [{
    id: 'twin', label: 'The Twin Pays', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : uses(h).left('per_combat', 1, h.key + '#twin') > 0 ? true : 'Used this fight.'),
    preview: () => '0 MP, 0 Strain: your twin in the upper realm pays.',
  }],
  on: {
    outburst_cost: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'twin') || uses(h).left('per_combat', 1, h.key + '#twin') <= 0) return;
      ctx.mp = 0; ctx.strain = 0; ctx.hp = 0;
    },
    outburst_begin: (ctx, h) => {
      if (!me(h, ctx.u) || !modOn(h, 'twin') || !uses(h).take('per_combat', 1, h.key + '#twin')) return;
      if (ctx.hold) stateOf(h).free = ctx.design.id;
      log(ctx.cb, 'Up there, someone with ' + h.u!.name + '\'s face flinches (The Twin Pays: no mana, no Strain).');
    },
    turn_end: (ctx, h) => {
      const u = h.u, m = u?.mg, s = stateOf(h); if (!me(h, ctx.u) || !m) return;
      if (m.held && s.free === m.held.design) m.strain -= manaBand(manaOf(ctx.cb)).id === 'flooded' ? 2 : 1;
      else s.free = null;
    },
    outburst_release: (ctx, h) => { if (me(h, ctx.u)) stateOf(h).free = null; },
  },
  brief: () => 'Narrator: the twin who pays is yours to use (lore).',
});

// =====================================================================================================================
// Twin Souls (Achieved: Will Power 5 + Lore Master 5). Story: once per session, ask your twin soul in the upper realm
// one question; the Narrator answers truthfully in the twin's voice (short of proof: the Veil). Outbursts: a design may
// carry a third school (school3, option3), +20 MP before the band and Insight saving; "mid-level" dropped (plan 6a).
// The third school runs at release (before the first two: the engine has no hook after them).
// =====================================================================================================================
const TIER_SAVE: Record<string, number> = { minion: 0, soldier: 1, elite: 2, boss: 3 };
/** One extra school's effect at release, for the targets the design reaches (Twin Souls' third school). */
function extraSchool(cb: Combat, rng: Rng, u: Unit, d: any, school: string, option: string | undefined, sm: number, aim: string): string {
  const m = u.mg!, has = (x: string) => (d.modules || []).includes(x), area = (has('rain') ? 2 : 0) + (has('size') ? 1 : 0);
  const targets = cb.units.filter((v) => !v.dead && (area ? dist(v.pos, aim) <= area : v.pos === aim));
  const out: string[] = [];
  for (const t of targets) {
    if (school === 'damage') {
      const base = ((SCHOOL as any).damage?.damage || 25) * m.soulMult * sm * (has('rain') ? 0.6 : 1) * (has('at_once') ? 0.5 : 1);
      if (has('inverse') && t.side === u.side) { out.push(t.name + ' is shielded'); continue; }
      const r = d20(rng), cover = !has('homing') && coverTileFor(cb, u.pos, t.pos) ? 5 : 0, tot = r + m.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (has('homing') ? 2 : 0) + condHit(u, t, cb) - cover;
      if (!has('at_once') && (r === 1 || (r !== 20 && tot < t.def))) { out.push('misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + ')'); continue; }
      out.push(harm(cb, rng, u, t, base * (r === 20 ? 2 : 1), 'soul').replace(/^ · /, ''));
    } else if (school === 'buff') {
      const o = option || 'heal';
      out.push((o === 'defense' ? applyCond(cb, rng, u, t, 'guarded', 2 + (has('time') ? 2 : 0)) : o === 'hit' ? applyCond(cb, rng, u, t, 'inspired', 2 + (has('time') ? 2 : 0)) : heal(t, 30 * m.healMult * sm, cb, u)).replace(/^ · /, ''));
    } else if (school === 'control') {
      const o = option || 'pinned';
      if (o === 'push' || o === 'pull') { out.push(t.name + ' (' + o + ': yours to rule)'); (cb.notes ||= []).push(u.name + "'s third school pushes or pulls " + t.name + ' (Twin Souls): rule where they end up.'); }
      else out.push(applyCond(cb, rng, u, t, o === 'pinned' ? 'pinned' : 'slowed', 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
    } else if (school === 'status') {
      const o = option || 'shaken', id = o === 'left_brain_debuff' ? 'ldebuff' : o === 'right_brain_debuff' ? 'rdebuff' : o;
      out.push(applyCond(cb, rng, u, t, id, 2 + (has('time') ? 2 : 0)).replace(/^ · /, ''));
    }
  }
  return out.filter(Boolean).join(' · ') || 'nobody at ' + refOf(aim);
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
    outburst_release: (ctx, h) => {
      const d = ctx.design; if (!me(h, ctx.u) || !d?.school3 || !h.u!.mg) return;
      const sm = (1 + 0.5 * ((ctx.stage || 1) - 1)) * (ctx.mult || 1);
      log(ctx.cb, h.u!.name + '\'s third school (' + d.school3 + ', Twin Souls): ' + extraSchool(ctx.cb, rngOf(h, ctx), h.u!, d, d.school3, d.option3, sm, ctx.aim) + '.');
    },
  },
  brief: () => 'Narrator: once a session, answers one question truthfully as their twin soul (pending ruling).',
});

// =====================================================================================================================
// Twin Discipline (Ultimate: Twin Souls + Spoon-Feed). Fused Evoke: while holding a Begun Outburst, Evoke a pattern you
// touch as fused. The pattern's shape decides who is hit (Stack: the aimed tile, Line: its path, Ring: around the
// centre, ×0.8); the held Outburst's school, modules and stage decide what happens to them. Pay both: the Evoke's
// charge and AP now, the Outburst's MP and Strain already paid at Begin. The pattern's own Subject words don't fire;
// the glyphs fade (a STAY pattern can't carry an Outburst; provisional). Args: tile = a glyph of the pattern, choice =
// the aim tile for a Stack.
// =====================================================================================================================
register({
  id: 'twin_discipline', claims: 'all',
  actions: [{
    id: 'fused', label: 'Fused Evoke', scope: ['combat', 'world'], target: 'tile',
    ap: (h, args) => { const u = h.u, cb = h.cb; if (!u || !cb || !args?.tile) return SPELL_AP.evoke; const pv = previewEvoke(cb, u, args.tile, args.choice); return pv.ap ?? SPELL_AP.evoke; },
    text: 'Fire a Sigil pattern you touch with your held Outburst inside it: the pattern sets the shape, the Outburst the school. Evoke charge and 1 AP.',
    available: (h) => { const m = h.u?.mg; if (!m || !m.evoker || !m.emanator) return false; return m.held ? true : 'Begin and hold an Outburst first.'; },
    preview: (h, args) => {
      const u = h.u!, cb = h.cb!; if (!args.tile) return { ok: false, why: 'Pick a glyph of the pattern.' };
      const pv = previewEvoke(cb, u, args.tile, args.choice);
      if (!pv.ok) return { ok: false, why: pv.why, ap: pv.ap };
      if (pv.pattern!.words.includes('stay')) return { ok: false, why: 'A STAY pattern stands: it can\'t carry an Outburst.', ap: pv.ap };
      return { ap: pv.ap, targets: pv.targets, lines: ['Fused: ' + pv.pattern!.shape + ', ' + pv.charge + ' charge, ' + pv.targets.length + ' target(s)'] };
    },
    run: (h, args, rng) => {
      const u = h.u!, cb = h.cb!, m = u.mg!, pv = previewEvoke(cb, u, args.tile!, args.choice);
      if (!pv.ok || !m.held) return pv.why || 'Nothing held.';
      const p = pv.pattern!, held = { ...m.held }, d = m.designs.find((x) => x.id === held.design); if (!d) return 'That design is gone.';
      m.charge -= pv.charge; m.cast = true;
      const targets = pv.targets.map((id) => cb.units.find((x) => x.id === id)!).filter(Boolean);
      log(cb, u.name + ' fuses ' + d.name + ' into the ' + p.words.map((w) => w.toUpperCase()).join(' · ') + ' ' + p.shape + ' (Twin Discipline, ' + pv.charge + ' charge)' + (targets.length ? '' : ': it finds no one') + '.');
      const s = stateOf(h), mods0 = [...d.modules], range0 = m.soulRange;
      s.fusing = { ring: p.shape === 'ring' };
      try {
        for (const t of targets) {
          if (t.dead) continue;
          m.held = { ...held }; d.modules = [...mods0.filter((x) => !['rain', 'size', 'random', 'move'].includes(x)), 'ether']; m.soulRange = range0 + 99;
          u.ap += SPELL_AP.release; const err = releaseOutburst(cb, rng, u, t.pos); if (err) { u.ap -= SPELL_AP.release; break; }
        }
      } finally { d.modules = mods0; m.soulRange = range0; s.fusing = null; m.held = null; }
      const used = new Set(p.glyphs.map((g) => g.id)); cb.glyphs = (cb.glyphs || []).filter((g) => !used.has(g.id));
      return null;
    },
  }],
  on: { outburst_release: (ctx, h) => { const s = stateOf(h); if (me(h, ctx.u) && s.fusing?.ring) ctx.mult = (ctx.mult || 1) * 0.8; } },
  brief: () => null,
});

// =====================================================================================================================
// Verse of War (Achieved: Implication 5 + Will Power 5). An Outburst cast while you speak in verse: +1 tile of range,
// ×1.1 Soul damage. Player-declared (plan 4.3: the Narrator is never called per cast): Say the line (free), then Begin
// with the "In verse" toggle, or "Release in verse" from the Perks tab for a held one; the line goes to the fight notes
// for the Narrator to audit after the fight.
// =====================================================================================================================
function verseNote(h: Holder) { const l = sayLine(h); note(h, 'cast an Outburst in verse' + (l ? ': "' + l.slice(0, 160) + '"' : ' (no line said)') + '. Audit whether it was verse (+1 range, ×1.1 damage given).'); }
register({
  id: 'verse_of_war', claims: [0, 1],
  toggles: [{
    id: 'verse', label: 'In verse', on: ['combat/outburst'],
    available: (h) => (!h.u?.mg ? false : ow(h.cb) || sayLine(h) ? true : 'Say your verse first (Say).'),
    preview: () => '+1 tile of range, ×1.1 damage; the Narrator audits the line.',
  }],
  actions: [{
    id: 'release', label: 'Release in verse', scope: ['combat', 'world'], ap: 0, target: 'tile',
    text: 'Release your held Outburst while you speak in verse: +1 tile of range, ×1.1 damage (1 AP).',
    available: (h) => { const m = h.u?.mg; if (!m) return false; if (!m.held) return 'Hold an Outburst first.'; return ow(h.cb) || sayLine(h) ? true : 'Say your verse first (Say).'; },
    run: (h, args, rng) => {
      const u = h.u!, m = u.mg!, s = stateOf(h); m.soulRange += 1; s.verseRelease = true;
      try { return releaseOutburst(h.cb!, rng, u, args.tile); } finally { m.soulRange -= 1; s.verseRelease = false; }
    },
  }],
  on: {
    outburst_cost: (ctx, h) => { if (me(h, ctx.u) && ctx.release && modOn(h, 'verse') && (ow(ctx.cb) || sayLine(h))) ctx.range += 1; },
    outburst_release: (ctx, h) => {
      if (!me(h, ctx.u)) return; const s = stateOf(h);
      if (!((modOn(h, 'verse') && (ow(ctx.cb) || sayLine(h))) || s.verseRelease) || ctx.wild) { s.verseAt = null; return; }
      verseNote(h); s.verseAt = ctx.cb.log.length;
    },
    damage_in: (ctx, h) => { const s = stateOf(h); if (ctx.phase === 'reduce' && me(h, ctx.src?.by) && ctx.src?.type === 'soul' && s.verseAt != null && s.verseAt === ctx.cb?.log.length) ctx.dmg *= 1.1; },
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
// within 10 tiles (a log line names where each one is when it comes within 10; the fog presence marker needs a hook).
// Seen From Above: upper-realm beings always know where you are (you can't stay Hidden while one stands; their spot
// rolls always find you; in the story an upper-realm NPC always notices your sneak). Blessings cast on you roll a d6
// (provisional table, plan 6a): 1 the Blessing fails, 2 +1 Strain, 3 Shaken 1 round, 4 as normal, 5 ×1.5 power, 6 a
// voice from above (the Narrator speaks).
// =====================================================================================================================
const upperFoes = (cb: Combat, u: Unit) => foesOf(cb, u).filter((v) => v.kind === 'upper_realm' || (v.tags || []).includes('upper_realm'));
function senseUpper(h: Holder, cb: Combat) {
  const u = h.u; if (!u || ow(cb) || !alive(u)) return; const s = stateOf(h), had: string[] = (s.sensed ||= []);
  for (const v of upperFoes(cb, u)) if (dist(v.pos, u.pos) <= 10 && !had.includes(v.id)) { had.push(v.id); log(cb, u.name + ' feels something from above at ' + refOf(v.pos) + ' (Thin Veil).'); }
}
register({
  id: 'upper_touched', claims: [0, 1, 3], priority: 60,
  on: {
    outburst_cost: (ctx, h) => { if (me(h, ctx.u) && ctx.mp >= 5) ctx.mp = Math.max(5, ctx.mp * 0.8); },
    combat_start: (ctx, h) => senseUpper(h, ctx.cb),
    turn_start: (ctx, h) => senseUpper(h, ctx.cb),
    hide: (ctx, h) => { if (me(h, ctx.u) && upperFoes(ctx.cb, h.u!).length) reveal(ctx.cb, h.u!, 'Seen From Above: upper-realm eyes always find you'); },
    spot: (ctx, h) => { if (me(h, ctx.u) && (ctx.by?.kind === 'upper_realm' || (ctx.by?.tags || []).includes('upper_realm'))) ctx.die = 20; },
    stay_hidden: (ctx, h) => { const c = charOf(h); if (c && ctx.c?.id === c.id && (ctx.npc?.kind === 'upper_realm' || (ctx.npc?.tags || []).includes('upper_realm'))) ctx.mod -= 99; },
    blessing_in: (ctx, h) => {
      const u = h.u, cb: Combat = ctx.cb; if (!u || !me(h, ctx.t) || ctx.handled) return; const s = stateOf(h);
      if (s.inside) return;
      const r = die(rngOf(h, ctx), 6), why = ' (Upper-Touched d6 ' + r + ')';
      if (r === 1) { ctx.handled = true; ctx.out = ' · the Blessing fails on ' + u.name + why; return; }
      if (r === 2) { if (u.mg) u.mg.strain += 1; log(cb, 'The Blessing tugs at ' + u.name + '\'s heart: +1 Strain' + why + '.'); return; }
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
      id: 'muscle', label: 'Muscle Memory', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'Choose the one word you can draw in your sleep (once): 0 charge, 1 AP less.',
      available: (h) => (savant(charOf(h)).word ? false : true),
      run: (h, args) => {
        const c = charOf(h); if (!c) return 'No character.'; const w = String(args.choice || '').toLowerCase();
        if (!knownWords(c).includes(w)) return 'Pick a word you know: ' + knownWords(c).join(', ') + '.';
        savant(c).word = w; postStory(h, 'draws ' + w.toUpperCase() + ' without thinking now (Muscle Memory).'); return null;
      },
    },
    {
      id: 'practise', label: 'Practise words', scope: ['story', 'world'], ap: 0, target: 'none', uses: { per: 'per_rest', n: 1 },
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
      // Rigid: an unpractised word can't be drawn (drawGlyph has no refusal field: an unpayable price refuses it).
      if (Array.isArray(st.practised) && !st.practised.includes(ctx.word)) ctx.ap = 99;
    },
    rest: (ctx, h) => {
      const c = charOf(h); if (!c || ctx.kind !== 'long' || !(ctx.chars || []).some((x: Character) => x.id === c.id)) return;
      const st = savant(c); if (!Array.isArray(st.practised)) st.practised = knownWords(c).slice(0, Math.floor(maxSigilWords(c)));
    },
  },
  brief: (h) => { const st = savant(charOf(h)); return 'Narrator: the problem only an unpractised Sigil solves.' + (st.word ? ' Word: ' + st.word.toUpperCase() + '.' : ''); },
});

// =====================================================================================================================
// Hollow Heart (trait). Hollow: a Mana Short can't kill you: you fall unconscious, Downed but stable (no death saves
// fail, hits don't add failures; plan 6a, provisional), and stand at 1 HP after the fight or when healed; +10% Outburst
// damage (Soul damage you deal). Echo Chamber: every Outburst you cast is loud: you are revealed and can't hide on a
// turn you cast; the Narrator hears that every enemy within 10 tiles knows where you are. Story: casting on the area
// map ends your sneak.
// =====================================================================================================================
register({
  id: 'hollow_heart', claims: 'all',
  stat: (h, stat) => (stat === 'death_save' && h.u?.downed && stateOf(h).stable ? 20 : 0),
  on: {
    on_downed: (ctx, h) => { if (me(h, ctx.victim) && !ctx.victim.dead && ctx.src?.type === 'short') { stateOf(h).stable = true; log(ctx.cb, h.u!.name + ' falls unconscious, hollow and stable (Hollow Heart).'); } },
    turn_start_pre: (ctx, h) => { if (!me(h, ctx.u)) return; const s = stateOf(h); if (!h.u!.downed) s.stable = false; else if (s.stable) h.u!.saves.ok = 0; },
    damage_in: (ctx, h) => {
      if (ctx.phase !== 'reduce') return;
      if (me(h, ctx.t) && ctx.t.downed && stateOf(h).stable && ctx.dmg > 0) { ctx.dmg = 0; return; }
      if (me(h, ctx.src?.by) && ctx.src?.type === 'soul') ctx.dmg *= 1.1;
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
      text: 'Pray without kneeling: any patron\'s Blessing, on Will Power instead of Faith (3 AP). choice: patron:blessing.',
      available: (h) => (h.u && condOn(h.u, 'silenced') ? 'Silenced: no prayers.' : true),
      run: (h, args, rng) => {
        const c = charOf(h), u = h.u!, cb = h.cb!; if (!c) return 'Only a character can pray.';
        const pick = stolenPick(args.choice); if (!pick) return 'Name a Blessing to steal.';
        const was = { faith: c.skills.faith, patron: c.patron, devotion: c.devotion };
        c.skills.faith = c.skills.will_power || 0; c.patron = pick.p.id;
        try { return pray(cb, rng, u, { choice: pick.bl.id, targetId: args.targetId }); }
        finally { if (was.faith == null) delete (c.skills as any).faith; else c.skills.faith = was.faith; c.patron = was.patron; c.devotion = was.devotion; }
      },
    },
    {
      id: 'stolen_fire_story', label: 'Stolen Fire', scope: ['story', 'world'], ap: 0, target: 'none',
      text: 'Pray without kneeling, in the story: d20 + Will Power against the patron\'s mood.',
      run: (h, args, rng) => {
        const c = charOf(h), g = gameOf(h); if (!c || !g) return 'Pray in the story.';
        const pick = stolenPick(args.choice); if (!pick) return 'Name a Blessing to steal.';
        if ((c.skills.will_power || 0) < 3) return 'Stolen Fire needs Will Power 3.';
        const r = d20(rng), m = mod(c.skills.will_power || 0), tn = g.story?.patronMood?.[pick.p.id] ?? 12, ok = r === 20 || (r !== 1 && r + m >= tn);
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
      id: 'mirage_story', label: 'Mirage', scope: ['story', 'world'], ap: 0, target: 'text',
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
