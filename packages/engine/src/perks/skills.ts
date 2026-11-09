// Skill Mastery unlocks the runtime runs as items (perk-runtime H4; rules 1.4 completeness batch 2): skills.json
// `unlocks` entries keyed "skill:<skillId>.<points>" (effects/collect.ts SKILL_ITEMS). A character holds one once its
// points in the skill reach the unlock's level. The four Sigil ones:
//   Brain Power · Overclock (M1, 3 points)      item 451, 482
//   Brain Power · Twin Draw (M2, 5 points)      item 483
//   Rumination · Proven Formula (M2, 5 points)  item 484
//   Visualization · Paint the Field (M2, 5)     item 450, 485
// and the two Soul ones (rules 1.5):
//   Will Power · Overdraw (M1, 3 points)        item 539
//   Will Power · Pure Heart (M2, 5 points)      item 540
// Every number here is PROVISIONAL (spec section 14).
import { register, stateOf, uses, modOn, emit, boundGame, type Holder, type ActionDef } from '../effects';
import { type Combat, type Unit, dist, emitFx } from '../combat';
import { compileSpell, MAX_GLYPHS, MAX_STAGE, SHORT_AT_OVER, stageMult, addStrain, type Spell } from '../magic';
import type { Rng } from '../rng';

const say = (cb: Combat | null | undefined, s: string) => { if (cb) cb.log.push(s); };
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
// "A Sigil spell you've already drawn this combat costs 1 AP less" (item 484): a Line whose words, in the order they
// were written, match a spell you Evoked earlier in this fight costs 1 AP less to Evoke (never below 0). On the area map,
// earlier this scene.
const PF_AP = 1;
const spellKey = (words: string[]) => words.join(' ');
register({
  id: 'skill:rumination.5', kind: 'skill', claims: 'all',
  on: {
    evoke_cost: (ctx, h) => {
      if (!mine(h, ctx.u) || !ctx.pattern?.words) return; const st = stateOf(h);
      if (!(st.done || []).includes(spellKey(ctx.pattern.words)) || ctx.ap <= 0) return;
      ctx.ap = Math.max(0, ctx.ap - PF_AP);
    },
    evoked: (ctx, h) => {
      if (!mine(h, ctx.u) || !ctx.pattern?.words) return; const st = stateOf(h), k = spellKey(ctx.pattern.words);
      if ((st.done ||= []).includes(k)) say(h.cb, '(Proven Formula: ' + ctx.pattern.words.map(W).join(' · ') + ' again, ' + PF_AP + ' AP less.)');
      else st.done.push(k);
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

// ---------- Will Power · Overdraw (Mastery 1; rules 1.5, item 539) ----------
// 1.2's "a Soul spell at +50% damage, then a Mana Short check" named a roll 1.5 removed. Re-derived: once a fight, a
// toggle on a Pump ("Overdraw"): that Pump adds 2 stages, not 1 (to stage 4 at most, so it needs stage 2 or lower),
// for its own AP, and the heart pays: +1 Strain once the Pump is done (it can burn and short like any Strain).
register({
  id: 'skill:will_power.3', kind: 'skill', claims: 'all', noDefaultActions: true, // used from Pump (the Overdraw chip)
  toggles: [{ id: 'overdraw', label: 'Overdraw (+2 stages, +1 Strain, once a fight)', on: ['combat/pump'],
    available: (h) => { const m = h.u?.mg; if (!m?.held) return false; if (m.held.stage > MAX_STAGE - 2) return 'Stage ' + (MAX_STAGE - 2) + ' or lower.'; return uses(h).left('per_combat', 1) > 0 ? true : 'Once a fight.'; },
    preview: () => 'This Pump adds 2 stages; +1 Strain after it.' }],
  on: {
    outburst_pump: (ctx, h) => {
      const m = h.u?.mg; if (!mine(h, ctx.u) || ctx.preview || !m?.held || !modOn(h, 'overdraw') || m.held.stage > MAX_STAGE - 1) return;
      if (!uses(h).take('per_combat', 1)) return;
      m.held.stage = Math.min(MAX_STAGE, m.held.stage + 1); stateOf(h).owed = 1;
      emitFx(h.cb!, 'pump', { unit: h.u!.id, at: h.u!.pos, stage: m.held.stage, mult: stageMult(m.held.stage), free: true, max: m.held.stage >= MAX_STAGE, tone: m.held.tone || 'raw', overdraw: true });
      say(h.cb, h.u!.name + ' overdraws the heart: stage ' + m.held.stage + ' (×' + stageMult(m.held.stage) + ').');
    },
    action_done: (ctx, h) => {
      const st = stateOf(h), u = h.u; if (!mine(h, ctx.u) || !u || !st.owed || !h.cb) return; const n = st.owed; st.owed = 0;
      say(h.cb, 'Overdraw: the heart pays (+' + n + ' Strain)' + addStrain(h.cb, (ctx.rng || boundGame()?.rng || { state: 1 }) as Rng, u, n, 'Overdraw') + '.');
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
