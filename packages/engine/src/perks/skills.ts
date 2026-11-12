// Skill Mastery unlocks the runtime runs as items (perk-runtime H4; rules 1.4 completeness batch 2): skills.json
// `unlocks` entries keyed "skill:<skillId>.<points>" (effects/collect.ts SKILL_ITEMS). A character holds one once its
// points in the skill reach the unlock's level. The four Sigil ones:
//   Brain Power · Overclock (M1, 3 points)      item 451, 482
//   Brain Power · Twin Draw (M2, 5 points)      item 483
//   Rumination · Proven Formula (M2, 5 points)  item 484 (rules 1.13: a save bonus, no longer a Sigil discount)
//   Visualization · Paint the Field (M2, 5)     item 450, 485
// and the two Soul ones (rules 1.5):
//   Will Power · Overdraw (M1, 3 points)        item 539
//   Will Power · Pure Heart (M2, 5 points)      item 540
// Every number here is PROVISIONAL (spec section 14).
import { register, stateOf, uses, modOn, emit, boundGame, type Holder, type ActionDef } from '../effects';
import { type Combat, type Unit, dist, emitFx } from '../combat';
import { compileSpell, MAX_GLYPHS, MAX_STAGE, SHORT_AT_OVER, stageMult, addStrain, isBoon, type Spell } from '../magic';
import type { Rng } from '../rng';
import { say, rngOf } from '../kit';

const mine = (h: Holder, u: Unit | null | undefined) => !!u && !!h.u && u.id === h.u.id;
const evokerWhy = (h: Holder): string | true => (!h.u?.mg ? 'Needs Sigil magic.' : !h.u.mg.evoker ? 'Needs an Evoker in hand.' : true);
const W = (s: string) => s.toUpperCase();

// ---------- Brain Power · Overclock (Mastery 1) ----------
// "Draw a spell one word longer than your Max Sigil words (never past 4 glyphs), for +2 Core charge." Engine reading
// (item 482): the action (0 AP, at will) arms it; while armed, and then while the next glyph you draw stands, your Max
// Sigil words is +1 (never past 4: the cap holds over it, item 437), and that glyph costs 2 charge more. From Max Sigil
// words 4 it does nothing, so it is refused (item 451). The +1 is marked on mg (ocBump) so a rebuilt unit gets it once.
const OC_CHARGE = 2;
function ocSync(st: Record<string, any>, u: Unit | null | undefined, cb: Combat | null | undefined) {
  const m: any = u?.mg; if (!m || !cb) return;
  if (st.glyph && !(cb.glyphs || []).some((g) => g.id === st.glyph)) st.glyph = null;
  const on = !!st.armed || !!st.glyph;
  if (on && !m.ocBump) { m.maxWords += 1; m.ocBump = true; } else if (!on && m.ocBump) { m.maxWords -= 1; m.ocBump = false; }
}
const overclock = (scope: 'combat' | 'world'): ActionDef => ({
  id: scope === 'combat' ? 'overclock' : 'overclock_world', label: 'Overclock', scope: [scope], target: 'none', ap: 0,
  text: 'Your next glyph may make the spell one word longer than your Max Sigil words (never past 4 glyphs); it costs 2 charge more.',
  available: (h) => {
    const e = evokerWhy(h); if (e !== true) return e; const st = stateOf(h), m: any = h.u!.mg!;
    if (st.armed) return 'Overclocked: draw the glyph.';
    if (m.maxWords - (m.ocBump ? 1 : 0) >= MAX_GLYPHS) return 'Your Max Sigil words is already ' + MAX_GLYPHS + ': a spell holds no more.';
    return true;
  },
  preview: (h) => ({ lines: ['Max Sigil words ' + h.u!.mg!.maxWords + ' → ' + Math.min(MAX_GLYPHS, h.u!.mg!.maxWords + 1) + ' until the next glyph you draw leaves the ground; that glyph costs +' + OC_CHARGE + ' charge.'] }),
  run: (h) => { const st = stateOf(h); st.armed = true; ocSync(st, h.u, h.cb); say(h.cb, h.u!.name + ' overclocks: the next glyph may go one word past Max Sigil words (+' + OC_CHARGE + ' charge).'); },
});
register({
  id: 'skill:brain_power.3', kind: 'skill', claims: 'all',
  actions: [overclock('combat'), overclock('world')],
  on: {
    glyph_cost: (ctx, h) => { const st = stateOf(h); ocSync(st, h.u, h.cb); if (mine(h, ctx.u) && st.armed) ctx.charge += OC_CHARGE; },
    glyph_drawn: (ctx, h) => { const st = stateOf(h); if (!mine(h, ctx.u) || !st.armed) return; st.armed = false; st.glyph = ctx.glyph.id; say(h.cb, '(Overclock: +' + OC_CHARGE + ' charge on ' + W(ctx.glyph.word) + '.)'); },
    evoked: (ctx, h) => { if (mine(h, ctx.u)) ocSync(stateOf(h), h.u, h.cb); },
    turn_start: (ctx, h) => { if (mine(h, ctx.u)) ocSync(stateOf(h), h.u, h.cb); },
    round_start: (ctx, h) => ocSync(stateOf(h), h.u, h.cb),
    unit_built: (ctx, h) => { if (!ctx.world || !ctx.u?.charId || ctx.u.charId !== (h.c?.id || h.u?.charId)) return; ocSync(stateOf({ ...h, u: ctx.u, cb: ctx.cb }), ctx.u, ctx.cb); },
  },
  brief: () => null,
});

// ---------- Brain Power · Twin Draw (Mastery 2) ----------
// "Once per combat, draw the glyphs of two Sigil spells and pay the Glyph AP of the longer spell only" (item 483). The
// action (0 AP, once a fight) starts it. The first glyph you draw after it starts spell A; a glyph that touches one of
// A's glyphs (diagonals too) joins A, and any other glyph is spell B. B's glyphs cost no Glyph AP while B has fewer
// glyphs than A, so the two cost the Glyph AP of the longer (charge, Flux and steps as usual). It ends when B has as many
// glyphs as A, or with the fight.
type Twin = { a: string[]; b: string[]; aTiles: string[] };
function twinSide(cb: Combat, t: Twin, tile: string): 'a' | 'b' {
  if (!t.a.length) return 'a';
  const aOn = (cb.glyphs || []).filter((g) => t.a.includes(g.id)).map((g) => g.pos);
  return [...aOn, ...t.aTiles].some((k) => dist(k, tile) <= 1) ? 'a' : 'b';
}
register({
  id: 'skill:brain_power.5', kind: 'skill', claims: 'all',
  actions: [{
    id: 'twin_draw', label: 'Twin Draw', scope: ['combat'], target: 'none', ap: 0, uses: { per: 'per_combat', n: 1 },
    text: 'Draw two Sigil spells and pay the Glyph AP of the longer only: the second spell\'s glyphs are free while it is shorter than the first.',
    available: (h) => { const e = evokerWhy(h); if (e !== true) return e; return stateOf(h).twin ? 'Twin Draw is running: draw the two spells.' : true; },
    preview: () => ({ lines: ['The next glyph starts the first spell; the glyphs of a second spell cost no Glyph AP until it is as long as the first.'] }),
    run: (h) => { stateOf(h).twin = { a: [], b: [], aTiles: [] }; say(h.cb, h.u!.name + ' starts a Twin Draw: two spells for the Glyph AP of the longer.'); },
  }],
  on: {
    glyph_cost: (ctx, h) => {
      const t: Twin | undefined = stateOf(h).twin; if (!mine(h, ctx.u) || !t || !h.cb) return;
      if (twinSide(h.cb, t, ctx.tile) === 'b' && t.b.length < t.a.length) ctx.ap = 0;
    },
    glyph_drawn: (ctx, h) => {
      const st = stateOf(h), t: Twin | undefined = st.twin; if (!mine(h, ctx.u) || !t || !h.cb) return;
      const others = { ...t, a: t.a.filter((id) => id !== ctx.glyph.id) }, side = twinSide(h.cb, others, ctx.glyph.pos);
      if (side === 'a') { t.a.push(ctx.glyph.id); t.aTiles.push(ctx.glyph.pos); return; }
      const free = t.b.length < t.a.length; t.b.push(ctx.glyph.id);
      say(h.cb, '(Twin Draw: second spell, glyph ' + t.b.length + (free ? ', no Glyph AP' : '') + '.)');
      if (t.b.length >= t.a.length) { st.twin = null; say(h.cb, '(Twin Draw ends: the second spell is as long as the first.)'); }
    },
  },
  brief: () => null,
});

// ---------- Rumination · Proven Formula (Mastery 2) ----------
// Rules 1.13 (a beta is defence; the old Sigil discount is what Brain Power's Twin Draw and Parallel Thought give): +3 on
// your saves against a spell or condition that has already hit you this combat. Engine reading: a condition that has
// taken hold on you once this fight (whatever delivered it) is saved against at +3 from then on.
const PF_SAVE = 3;
register({
  id: 'skill:rumination.5', kind: 'skill', claims: 'all',
  on: {
    cond_landed: (ctx, h) => { if (!mine(h, ctx.t) || isBoon(ctx.id)) return; const st = stateOf(h); if (!(st.hit ||= []).includes(ctx.id)) st.hit.push(ctx.id); },
    cond_apply: (ctx, h) => {
      if (!mine(h, ctx.t) || ctx.skipSave || !((h.u?.ps?.[h.key] as any)?.hit || []).includes(ctx.id)) return;
      ctx.saveAdd = (ctx.saveAdd || 0) + PF_SAVE; say(h.cb, '(Proven Formula: ' + h.u!.name + ' has been hit by this before, +' + PF_SAVE + ' on the save.)');
    },
  },
  brief: () => null,
});

// ---------- Visualization · Paint the Field (Mastery 2) ----------
// "Once per Evoke, give a Sigil spell with no Burst word a free SPREAD or PUSH (no glyph, no charge, not counted toward
// 4 glyphs)" (items 450, 485). The Evoke carries opts.paint ('spread' | 'push'); the spell is shaped before it's aimed
// (spell_shape, ahead of the Mage's Payload, which then doubles it), so the preview, the strike and the fx agree. A spell
// that already has a Burst ignores it. The free word isn't a repeat and adds no Flux (no glyph is drawn).
register({
  id: 'skill:visualization.5', kind: 'skill', claims: 'all', priority: 10,
  on: {
    spell_shape: (ctx, h) => {
      const w = ctx.opts?.paint; if (!mine(h, ctx.u) || (w !== 'spread' && w !== 'push')) return;
      const sp: Spell = ctx.spell; if (!sp || sp.burst) return;
      const out: any = compileSpell([...sp.words, w]); out.repeats = sp.repeats; out.repMult = sp.repMult; out.painted = w; ctx.spell = out;
    },
    evoked: (ctx, h) => { if (mine(h, ctx.u) && (ctx.spell as any)?.painted) say(h.cb, '(Paint the Field: a free ' + W((ctx.spell as any).painted) + '.)'); },
  },
  brief: () => null,
});

// ---------- Will Power · Overdraw (Mastery 1; rules 1.14, item 1010) ----------
// Once a turn, a toggle on a Pump ("Overdraw"): that Pump adds 2 stages, not 1 (to stage 4 at most, so it needs stage 2
// or lower), for the Pump's own AP. The first Overdraw of a fight costs no Strain; each one after it costs 1 Strain
// once the Pump is done (it can burn and short like any Strain). Rules 1.5 had it once a fight, always for 1 Strain;
// that counter (this item's own per_combat cell) is not read any more, so a save that spent it is not locked out.
const OD_STRAIN = 1; // PROVISIONAL (item 1010)
/** Has this fight's Strain-free Overdraw been spent? */
const odFreeLeft = (h: Holder) => uses(h).left('per_combat', 1, h.key + '#free') > 0;
const odStrain = (h: Holder) => (odFreeLeft(h) ? 0 : OD_STRAIN);
const odWhy = (h: Holder): string | true | false => {
  const m = h.u?.mg; if (!m?.held) return false;
  if (uses(h).left('per_turn', 1) <= 0) return 'Once a turn.';
  if (m.held.stage > MAX_STAGE - 2) return 'Stage ' + (MAX_STAGE - 2) + ' or lower.';
  return true;
};
register({
  id: 'skill:will_power.3', kind: 'skill', claims: 'all', noDefaultActions: true, // used from Pump (the Overdraw chip)
  toggles: [{ id: 'overdraw', label: 'Overdraw (+2 stages, once a turn)', on: ['combat/pump'],
    available: (h) => odWhy(h),
    preview: (h) => 'This Pump adds 2 stages. ' + (odStrain(h) ? 'You take ' + odStrain(h) + ' Strain after it.' : 'Your first Overdraw of the fight costs no Strain.') }],
  on: {
    outburst_pump: (ctx, h) => {
      const m = h.u?.mg; if (!mine(h, ctx.u) || !m?.held || !modOn(h, 'overdraw')) return;
      if (ctx.preview) { // the Pump's card: the stage it will reach, and what it costs the heart
        if (odWhy(h) === true) { ctx.stages = 2; ctx.note = 'Overdraw: 2 stages. ' + (odStrain(h) ? 'You take ' + odStrain(h) + ' Strain after it.' : 'No Strain: your first Overdraw of the fight.'); }
        return;
      }
      // The Pump has added its own stage already: the second needs room (stage 2 or lower before the Pump).
      if (m.held.stage > MAX_STAGE - 1 || !uses(h).take('per_turn', 1)) return;
      const free = uses(h).take('per_combat', 1, h.key + '#free');
      m.held.stage = Math.min(MAX_STAGE, m.held.stage + 1); stateOf(h).owed = free ? 0 : OD_STRAIN;
      emitFx(h.cb!, 'pump', { unit: h.u!.id, at: h.u!.pos, stage: m.held.stage, mult: stageMult(m.held.stage), free: true, max: m.held.stage >= MAX_STAGE, tone: m.held.tone || 'raw', overdraw: true });
      say(h.cb, h.u!.name + ' overdraws the heart: stage ' + m.held.stage + ' (×' + stageMult(m.held.stage) + ')' + (free ? ', no Strain the first time in a fight' : '') + '.');
    },
    action_done: (ctx, h) => {
      const st = stateOf(h), u = h.u; if (!mine(h, ctx.u) || !u || !st.owed || !h.cb) return; const n = st.owed; st.owed = 0;
      say(h.cb, 'Overdraw: the heart pays (+' + n + ' Strain)' + addStrain(h.cb, rngOf(null, ctx), u, n, 'Overdraw') + '.');
    },
  },
  brief: () => null,
});

// ---------- Will Power · Pure Heart (Mastery 2; rules 1.5, item 540) ----------
// 1.2's "ignore your first failed Mana Short check in each combat" re-derived for a Short that has no roll: once a
// fight, the first Strain that would short you (3 over your limit) is refused instead: your Strain falls to your limit,
// with no Stun, no wild release and no backlash. Automatic.
register({
  id: 'skill:will_power.5', kind: 'skill', claims: 'all', priority: 950, noDefaultActions: true, // automatic
  on: {
    strain: (ctx, h) => {
      const m = h.u?.mg; if (!mine(h, ctx.u) || !m || ctx.n <= 0 || !h.cb) return;
      const limit = ctx.limit ?? m.strainLimit; if (m.strain + ctx.n - limit < SHORT_AT_OVER || uses(h).left('per_combat', 1) <= 0) return;
      uses(h).take('per_combat', 1); ctx.n = 0;
      const was = m.strain; m.strain = Math.min(m.strain, limit);
      if (was !== m.strain) emit(h.cb, 'strain_change', { u: h.u, from: was, to: m.strain, why: 'pure_heart', limit, cb: h.cb });
      emitFx(h.cb, 'calm', { unit: h.u!.id, at: h.u!.pos, way: 'pure_heart', by: was - m.strain, strain: m.strain });
      say(h.cb, h.u!.name + '\'s heart holds pure: no Mana Short (Pure Heart); Strain ' + m.strain + '/' + limit + '.');
    },
  },
  brief: () => null,
});
