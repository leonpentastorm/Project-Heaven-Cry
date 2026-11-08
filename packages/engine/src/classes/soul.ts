// Shared Soul pieces for the class and perk lanes under rules 1.5 (Outburst 2.0): one creature struck by a design at a
// multiplier (Storm Front's arcs, Twin Souls' third school), a design lent as a Bolt (a Sigil sets the area: Fusion and
// Twin Discipline), and Resonance kept between two hearts that are one (the twin). The engine's own maths are in
// magic.ts (outburstDamage, toneRiders, applyToneRiders, resonanceFor); nothing here invents a number of its own.
import type { Combat, Unit } from '../combat';
import { coverTileFor, emitFx } from '../combat';
import type { OutburstDesign } from '../character';
import { MODULE, TONE } from '../data';
import {
  harm, heal, applyCond, magicShove, condSkillMod, condHit, withElement, outburstDamage, toneRiders, applyToneRiders, toneElement, toneOf,
  stageMult, resonanceFor, RESONANCE_BONUS, RESONANCE_MAX,
} from '../magic';
import { d20, type Rng } from '../rng';

const SKIP = ['armour_full', 'bonus_damage', 'ignore_cover', 'chain'];
/** Armour a tone's damage counts at this rider stage: Raw none, an element half (Stone from stage 1: full). */
export const toneArmour = (tone: string, rs: number): 'none' | 'half' | 'full' => (tone === 'raw' ? 'none' : toneRiders(tone, rs).riders.some((r) => r.rider === 'armour_full') ? 'full' : 'half');
const toneBonus = (tone: string, rs: number) => toneRiders(tone, rs).riders.filter((r) => r.rider === 'bonus_damage').reduce((a, r) => a + (r.value || 0), 0);
/** Does a design's Damage roll (a Bolt or a Lance, not At Once)? */
export const designRolls = (d: OutburstDesign) => { const f = (d.modules || []).find((m) => (MODULE[m] as any)?.form) || 'bolt'; return (f === 'bolt' || f === 'lance') && !(d.modules || []).includes('at_once'); };

/** One Damage strike of a design on one creature at the stage multiplier sm (rules 1.5 maths: 20 × Soul multiplier ×
 * stage × shape, armour by tone), rolling Will Power against Defense when roll is set, and the tone's rider at rider
 * stage rs on an enemy it hits. f scales it (a half-strength rider: 0.5). Returns the log piece. */
export function soulStrike(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, t: Unit, sm: number, rs: number, roll: boolean, f = 1): string {
  const m = u.mg!, tone = toneOf(d), el = toneElement(tone);
  let crit = false, head = '';
  if (roll) {
    const homing = (d.modules || []).includes('homing'), ign = homing || toneRiders(tone, rs).riders.some((r) => r.rider === 'ignore_cover');
    const r = d20(rng), cover = !ign && coverTileFor(cb, u.pos, t.pos) ? 5 : 0;
    const tot = r + m.will + (u.sk?.will_power ?? 0) + condSkillMod(u, 'will_power') + (homing ? 2 : 0) + condHit(u, t, cb) - cover;
    if (r === 1 || (r !== 20 && tot < t.def)) { emitFx(cb, 'miss', { unit: u.id, target: t.id, at: t.pos, by: 'soul' }); return 'misses ' + t.name + ' (d20 ' + r + ' → ' + tot + ' vs ' + t.def + ')'; }
    crit = r === 20; head = 'hits ' + t.name + ' (d20 ' + r + (crit ? ', CRITICAL' : '') + ')';
  }
  const dmg = outburstDamage(m, d, sm) * f * (crit ? 2 : 1) + toneBonus(tone, rs);
  let out = head + withElement(el, () => harm(cb, rng, u, t, dmg, tone === 'raw' ? 'soul' : 'elemental', TONE[tone]?.damage_type, toneArmour(tone, rs)));
  if (tone !== 'raw' && t.side !== u.side && !t.dead) out += withElement(el, () => applyToneRiders(cb, rng, u, t, tone, rs, u.pos, SKIP));
  return out.replace(/^ · /, '');
}

/** One school's effect at strength f on one creature, with no roll (a rider: Twin Souls' third school). Damage, Buff
 * (heal / Guarded / Inspired), Control (push, pull, Pinned, Slowed), Status (its condition). Half strength: damage and
 * healing × f, a push of floor(3 × f) (at least 1), rounds × f (at least 1). */
export function schoolRider(cb: Combat, rng: Rng, u: Unit, d: OutburstDesign, t: Unit, school: string, option: string | undefined, sm: number, rs: number, f: number): string {
  const m = u.mg!, extra = (d.modules || []).includes('time') ? (MODULE.time as any)?.extra_rounds ?? 2 : 0, rounds = (n: number) => Math.max(1, Math.floor((n + extra) * f));
  if (school === 'damage') {
    if ((d.modules || []).includes('inverse')) return '';
    if (t === u) return '';
    return soulStrike(cb, rng, u, d, t, sm, rs, false, f);
  }
  if (school === 'buff') {
    if (t.side !== u.side) return '';
    const o = option || 'heal';
    return (o === 'defense' ? applyCond(cb, rng, u, t, 'guarded', rounds(2)) : o === 'hit' ? applyCond(cb, rng, u, t, 'inspired', rounds(2)) : heal(t, 30 * m.healMult * sm * f, cb, u)).replace(/^ · /, '');
  }
  if (t === u) return '';
  if (school === 'control') {
    const o = option || 'push';
    if (o === 'push' || o === 'pull') { const n = Math.max(1, Math.floor(3 * f)); return magicShove(cb, t, u.pos, o === 'push' ? n : -n, u).replace(/^ · /, '') || t.name + ' can\'t be moved'; }
    return applyCond(cb, rng, u, t, o === 'pinned' ? 'pinned' : 'slowed', rounds(2)).replace(/^ · /, '');
  }
  if (school === 'status') {
    const o = option || 'shaken', id = o === 'left_brain_debuff' ? 'ldebuff' : o === 'right_brain_debuff' ? 'rdebuff' : o;
    return applyCond(cb, rng, u, t, id, rounds(2), (d.modules || []).includes('left') ? 'brain' : (d.modules || []).includes('right') ? 'heart' : undefined).replace(/^ · /, '');
  }
  return '';
}

/** Modules that decide where an Outburst goes (its shape, Size, Random, Far): stripped when a Sigil decides instead. */
const AREA_MODS = ['wave', 'burst', 'aura', 'lance', 'size', 'random', 'move', 'rain', 'teleport'];
/** Run f with the design lent as a single-target Bolt that needs no sight (Ether) and the caster's reach opened wide:
 * the caller (a Sigil's plan, a link's or the twin's place) has already decided who is reached. */
export function asBolt<T>(u: Unit, d: OutburstDesign, f: () => T): T {
  const m = u.mg!, mods0 = [...(d.modules || [])];
  d.modules = [...mods0.filter((x) => !AREA_MODS.includes(x)), ...(mods0.includes('ether') ? [] : ['ether'])]; m.soulRange += 99;
  try { return f(); } finally { d.modules = mods0; m.soulRange -= 99; }
}

/** Resonance without one partner (two hearts that are one, the twin and its caller, don't resonate with each other): the
 * multiplier factor that takes `other`'s share out of u's Resonance this release (1 when it has none). */
export function resonanceWithout(cb: Combat, u: Unit, otherId: string, stage: number): number {
  const r = resonanceFor(cb, u); if (!r.with.includes(otherId)) return 1;
  const without = Math.min(RESONANCE_MAX, Math.round(RESONANCE_BONUS * (r.with.length - 1) * 100) / 100), base = stageMult(stage);
  return (base + without) / (base + r.bonus);
}
/** A Resonance bonus added on top of the rule's (the Resonance perk's wider window), within the rule's ceiling. */
export function resonanceExtra(cb: Combat, u: Unit, stage: number, extra: number): number {
  const r = resonanceFor(cb, u), base = stageMult(stage), now = r.bonus, want = Math.min(RESONANCE_MAX, now + extra);
  return want <= now ? 1 : (base + want) / (base + now);
}
