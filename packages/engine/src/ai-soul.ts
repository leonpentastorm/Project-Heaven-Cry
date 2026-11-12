// Enemy Soul casting, rules revision 1.5 (Outburst 2.0, spec: Mana, "Soul magic: Outbursts, the heart"; decision 99).
// The AI only chooses: every release it weighs is the engine's own previewOutburstPlan (on a hypothetical tile and AP
// budget that are put back afterwards), and every step it takes is a real action (beginOutburst, pumpOutburst,
// releaseOutburst, setHeartWatch, steadyHeart, letGo, syphon, moveUnit) that the engine refuses or resolves by the
// rules. It reads nothing the players' side hides from it: Hidden PCs are never aimed at or counted. Deterministic: no
// dice are rolled to decide; ties break by the engine's unit and tile order.
//
// What a Soul caster (FoeSpec.caster naming an enemies.json `soul_casters` entry) does, in the enemy turn (combat.ts
// enemyTurn, one call a step):
//  · strain first: over its limit it releases if anything is worth it, else Steadies (stage 2+) or lets go; it never
//    Begins or holds into the burn, and never into a Mana Short (3 over), unless desperate (30% HP or less: the burn
//    is allowed, the Short still isn't, since a Short throws the held heart wild);
//  · release: it weighs every ready design (or the held one) at every aim it can see, from where it stands or from one
//    tile it can walk to this turn, at the highest stage its AP buys (Pumps cost AP only; free Pumps first), and scores
//    the plan by expected damage on visible players (the roll's chance, armour, saves) less 1.5 × what it does to its
//    own side, plus the HP a Buff heals on hurt allies;
//  · a snap cast (stage 0) only on two or more players, a heal, or in desperation: one target at ×0.6 is the weapon's job;
//  · a big release goes now: two or more players in the area, stage 3+, a player next to it, a heal for an ally
//    under half HP, holding no longer safe, or desperate. A small one (one player, a low stage) is held instead;
//  · holding: free Pumps, then Pump with the AP it doesn't need to walk, and Heart Overwatch on (a Bolt always; an area
//    only with no ally of its own near enough to be caught), so the first player into reach draws the release;
//  · nothing to aim at yet: Begin and hold (when the Strain allows and it can still act), Syphon when the MP is short,
//    and leave the walking and shooting to the enemy turn's weapon code (a shot or a hit also calms the heart).
import enemiesJ from '../../../data/enemies.json';
import { type OutburstDesign } from './character';
import { type Combat, type Unit, dist, paths, apForTiles, moveUnit } from './combat';
import { type Rng } from './rng';
import {
  type MagicUnit, type OutburstPlan, previewOutburstPlan, previewOutburst, beginOutburst, pumpOutburst, releaseOutburst,
  setHeartWatch, steadyHeart, letGo, syphon, pumpsAp, condOn, condSource, formOf, heartReach, manaOf, manaBand, SOUL_AP, MAX_STAGE, SHORT_AT_OVER,
} from './magic';
import { aiRouteRisk } from './ai-sigil';
import { fooledBy } from './illusion';
import { foesOf } from './kit';
import { tierSave, tierStrength } from './rolls';

// ---------- Soul caster archetypes (data/enemies.json `soul_casters`) ----------
export interface HeartCasterDef {
  id: string; name: string; tier: string; weapon: string; soul_mult: number; mp: number; strain_limit: number; free_pumps: number;
  reach_bonus?: number; designs: OutburstDesign[]; text?: string; provisional?: boolean;
}
export const HEART_CASTERS: HeartCasterDef[] = ((enemiesJ as any).soul_casters || []) as HeartCasterDef[];
export const HEART_CASTER: Record<string, HeartCasterDef> = Object.fromEntries(HEART_CASTERS.map((c) => [c.id, c]));

/** A Soul caster's heart (an Emanator, its designs, MP and Strain limit). Will Power for its rolls is its tier's attack
 * bonus; saves and debuff strength by tier, as a Sigil caster's. */
export function heartMagic(u: Unit, c: HeartCasterDef): MagicUnit {
  const tier = u.tier || c.tier, s = tierSave(tier), d = tierStrength(tier);
  return {
    words: [], designs: c.designs.map((x) => ({ ...x, modules: [...(x.modules || [])] })), evoker: false, emanator: true,
    charge: 0, cores: 0, coresMade: 0, flux: 0, mp: c.mp, mpMax: c.mp, strain: 0, held: null, cast: false, freePumps: c.free_pumps || 0, freePumpsMax: c.free_pumps || 0,
    brain: 0, will: u.attack || 0, sigilMult: 1, soulMult: c.soul_mult || 1, elemMult: 1, healMult: 1,
    maxWords: 0, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0,
    soulAp: SOUL_AP.begin, costSave: 0, soulRange: c.reach_bonus || 0, syphon: 1, strainLimit: c.strain_limit || 5,
    saves: { body: s, brain: s, heart: s }, debuff: { '*': d },
  };
}
/** Arm a fight's foe with its heart (startCombat, after armFoe): a foe whose `caster` names a Soul caster archetype. */
export function armHeart(u: Unit, f: { caster?: string }) {
  const c = f.caster ? HEART_CASTER[f.caster] : undefined; if (!c) return;
  u.mg = heartMagic(u, c); (u as any).caster = c.id; (u as any).heartCaster = c.id;
}

// ---------- reading the field ----------
const live = (t: Unit) => !t.dead && !t.downed && !t.surrendered;
const isHeart = (u: Unit) => !!u.mg && !u.mg.evoker && u.mg.emanator && u.mg.designs.length > 0 && u.side === 'foe';
const blocked = (u: Unit) => u.dead || u.downed || condOn(u, 'silenced');
const desperate = (u: Unit) => u.hp <= 0.3 * u.maxHp;
const seenFoes = (cb: Combat, u: Unit) => foesOf(cb, u, { hidden: false }).filter((t) => !fooledBy(cb, u, t)); // a False Image's fooled enemy (illusion.ts)
const hostile = (d: OutburstDesign) => d.school !== 'buff' && !(d.school === 'damage' && d.modules.includes('inverse'));

/** A plan's worth to the caster: expected damage on the players it can see (after armour, × the roll's chance), 6 a
 * save it forces, 4 a rider; less 1.5 × the same on its own side; plus the HP a heal restores on hurt allies (only
 * what they miss) and half a shield. −Infinity when it would hurt more of its own than of the players. A creature
 * Hidden from it, downed or out of the fight counts 0 (it can't know, or it no longer matters). */
export function heartPlanValue(cb: Combat, u: Unit, pv: OutburstPlan): { score: number; foes: number; own: number; heal: number } {
  let score = 0, foes = 0, own = 0, heal = 0;
  const fear = condSource(u, 'fear');
  for (const a of pv.affected) {
    const t = cb.units.find((x) => x.id === a.unit); if (!t || !live(t)) continue;
    const exp = a.roll ? a.dmgAfterArmour * a.roll.pct / 100 : a.dmgAfterArmour, sv = 6 * a.saves.length + (a.rider ? 4 : 0);
    if (a.enemy) { if (t.hidden || t.id === fear) continue; if (exp > 0 || sv > 0) { foes++; score += exp + sv; } }
    else {
      if (exp > 0 || (a.saves.length && pv.school !== 'buff')) { own++; score -= 1.5 * (exp + sv); }
      const h = t.hp < 0.75 * t.maxHp ? Math.min(a.heal, t.maxHp - t.hp) : 0; heal += h; score += h + a.shield * 0.5; // a heal counts on the hurt
    }
  }
  if (own > foes && own) score = -Infinity;
  return { score, foes, own, heal };
}

/** Aims worth trying for a design from tile `at`: an Aura has none; a hostile Bolt, Wave or Lance aims at each player
 * it can see, a Burst also at the tiles next to them (to catch a cluster); a Buff at its hurt allies (itself too). */
function aimsFor(cb: Combat, u: Unit, d: OutburstDesign, at: string): string[] {
  const f = formOf(d); if (f === 'aura') return [at];
  const reach = heartReach(u.mg!, d) + 1;
  const pts = hostile(d) ? seenFoes(cb, u).map((t) => t.pos) : cb.units.filter((t) => t.side === u.side && live(t) && t.hp < t.maxHp).map((t) => t.pos);
  const out = new Set<string>();
  for (const p of pts) {
    if (f !== 'wave' && f !== 'lance' && dist(at, p) > reach + (f === 'burst' ? 1 : 0)) continue;
    if (p !== at || f === 'bolt' || f === 'burst') out.add(p);
    if (f === 'burst') { const [x, y] = p.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) out.add((x + dx) + ',' + (y + dy)); }
  }
  return [...out].filter((k) => f === 'bolt' || f === 'burst' ? dist(at, k) <= reach : k !== at);
}

export interface HeartChoice {
  /** 'held' or a design id. */ src: string; design: string; aim: string; stage: number; plan: OutburstPlan;
  /** Where it releases from (its own tile, or one it walks to first) and the AP the walk costs. */ from: string; moveAp: number;
  score: number; foes: number; own: number; heal: number;
}
/** The best release the caster can make this turn: every ready design (or the held one), from its tile or one tile it
 * walks to (once a turn), at every aim, at the highest stage its AP buys. Each is a real previewOutburstPlan with the
 * caster put on the tile and its AP cut by the walk, then put back. null when nothing is worth anything. */
export function heartBestRelease(cb: Combat, u: Unit, opts: { move?: boolean } = {}): HeartChoice | null {
  const m = u.mg!; if (!m) return null;
  const srcs: { src: string; d: OutburstDesign }[] = m.held
    ? (() => { const d = m.designs.find((x) => x.id === m.held!.design); return d ? [{ src: 'held', d }] : []; })()
    : m.designs.map((d) => ({ src: d.id, d }));
  if (!srcs.length) return null;
  const tiles: { k: string; ap: number }[] = [{ k: u.pos, ap: 0 }];
  if (opts.move && !condOn(u, 'pinned')) {
    const P = paths(cb, u.pos, u.id), fearOf = condSource(u, 'fear'), fu = fearOf ? cb.units.find((x) => x.id === fearOf) : null;
    const foes = seenFoes(cb, u), maxReach = Math.max(...srcs.map((s) => heartReach(m, s.d))) + 2;
    const cand = Object.entries(P.dist).map(([k, n]) => ({ k, ap: apForTiles(n, u.bank, u.movement) }))
      .filter(({ k, ap }) => k !== u.pos && ap >= 1 && ap <= u.ap - SOUL_AP.release && aiRouteRisk(cb, u, P, k) <= 0
        && !(fu && !fu.dead && dist(k, fu.pos) < dist(u.pos, fu.pos)) && foes.some((t) => dist(k, t.pos) <= maxReach))
      .sort((a, b) => a.ap - b.ap || (a.k < b.k ? -1 : 1)).slice(0, 24);
    tiles.push(...cand);
  }
  const was = { pos: u.pos, ap: u.ap };
  let best: HeartChoice | null = null;
  try {
    for (const t of tiles) {
      u.pos = t.k; u.ap = was.ap - t.ap;
      for (const { src, d } of srcs) {
        // A release from a design Begins it first: never into the burn (desperate: into it, never into a Short).
        if (src !== 'held' && m.strain + beginStrain(cb, u, d) > strainCap(u)) continue;
        const stage = stageFor(cb, u, src, d); if (stage < 0) continue;
        for (const aim of aimsFor(cb, u, d, t.k)) {
          const pv = previewOutburstPlan(cb, u, src, aim, { stage }); if (!pv.ok) continue;
          const v = heartPlanValue(cb, u, pv); if (!(v.score > 0)) continue;
          // A snap cast (stage 0, ×0.6 for 3 AP) only on a cluster or in desperation: one target is the weapon's job.
          if (src !== 'held' && stage < 1 && v.foes < 2 && !v.heal && !desperate(u)) continue;
          // The walk costs stage (fewer Pumps) and risk: a little less for every AP walked, so standing wins a tie.
          const score = v.score - 0.5 * t.ap;
          if (!best || score > best.score) best = { src, design: d.id, aim, stage, plan: pv, from: t.k, moveAp: t.ap, score, foes: v.foes, own: v.own, heal: v.heal };
        }
      }
    }
  } finally { u.pos = was.pos; u.ap = was.ap; }
  return best;
}
/** The highest stage the caster's AP buys for a release of `src` this turn (Begin + Pumps + Release from a design;
 * Pumps + Release when held), free Pumps first. −1 when it can't release at all. */
function stageFor(cb: Combat, u: Unit, src: string, d: OutburstDesign): number {
  const m = u.mg!, from = src === 'held' ? m.held?.stage ?? 0 : 0;
  let left: number;
  if (src === 'held') left = u.ap - SOUL_AP.release;
  else { const b = previewOutburst(cb, u, d.id, undefined, false); if (!b.ok && !/AP/.test(b.why || '')) return -1; left = u.ap - b.ap - SOUL_AP.release; }
  if (left < 0) return -1;
  // The Pumps priced as the engine prices them (free Pumps first; Shape's free Pump through 'outburst_pump').
  let n = MAX_STAGE - from; while (n > 0 && pumpsAp(cb, u, d, n, from) > left) n--;
  return from + n;
}

// ---------- the step ----------
const turnOf = (cb: Combat, u: Unit) => { const s = (u as any).aiSoul; if (!s || s.round !== cb.round) (u as any).aiSoul = { round: cb.round, moved: false }; return (u as any).aiSoul as { round: number; moved: boolean }; };
/** The Strain a Begin would add now (rules 1.5: +1, +2 Flooded, +2 more with no Emanator; items may change it). */
const beginStrain = (cb: Combat, u: Unit, d: OutburstDesign) => { const p = previewOutburst(cb, u, d.id, undefined, false); return p.strain || (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1); };
/** The Strain the caster may end its turn at: its limit; desperate, up to 2 over (the burn), never a Short. */
const strainCap = (u: Unit) => u.mg!.strainLimit + (desperate(u) ? SHORT_AT_OVER - 1 : 0);
/** Holding one more turn stays under the cap: Strain −1 at the turn start, +1 (Flooded +2) for the swell. */
const holdSafe = (cb: Combat, u: Unit) => { const m = u.mg!; if (m.held?.steady) return m.strain - 1 <= strainCap(u); return m.strain - 1 + (manaBand(manaOf(cb)).id === 'flooded' ? 2 : 1) <= strainCap(u); };

/** A big moment, worth releasing now rather than holding: a cluster, a full heart, a player next to it, a heal an ally
 * badly needs, holding no longer safe, or desperation. */
function bigEnough(cb: Combat, u: Unit, c: HeartChoice): boolean {
  if (c.foes >= 2 || c.stage >= 3 || desperate(u)) return true;
  if (c.heal > 0 && cb.units.some((t) => t.side === u.side && live(t) && t.hp < 0.5 * t.maxHp)) return true;
  if (seenFoes(cb, u).some((t) => dist(t.pos, u.pos) <= 1)) return true;
  if (u.mg!.held && !holdSafe(cb, u)) return true;
  return false;
}
/** Do the chosen release: walk if the plan walks, then Begin (from a design), Pump to its stage, Release at its aim.
 * Stops at the first thing the engine refuses (the next step re-plans from what is true then). */
function doRelease(cb: Combat, rng: Rng, u: Unit, c: HeartChoice): boolean {
  if (c.from !== u.pos) { turnOf(cb, u).moved = true; return !moveUnit(cb, u, c.from, rng); } // re-plan from the new tile
  const m = u.mg!;
  if (!m.held) { if (beginOutburst(cb, rng, u, c.design, undefined, true)) return false; if (!m.held || u.dead || u.downed) return true; }
  while (m.held && m.held.stage < c.stage && !pumpOutburst(cb, rng, u)) { /* pump to the planned stage */ }
  if (!m.held) return true;
  const aim = formOf(m.designs.find((x) => x.id === m.held!.design) || ({ modules: [] } as any)) === 'aura' ? u.pos : c.aim;
  releaseOutburst(cb, rng, u, aim);
  return true;
}
/** Heart Overwatch on, when the held design can't catch its own side by surprise: a Bolt always; an area shape only
 * with no ally within its reach + 1 of the caster. Free. */
function watch(cb: Combat, u: Unit) {
  const m = u.mg!, h = m.held; if (!h || h.watch || (h.stage < 2 && !desperate(u))) return; // not a weak heart: stage 2+
  const d = m.designs.find((x) => x.id === h.design); if (!d || !hostile(d)) return;
  const f = formOf(d), r = heartReach(m, d) + 1;
  if (f !== 'bolt' && cb.units.some((t) => t !== u && t.side === u.side && !t.dead && dist(t.pos, u.pos) <= r)) return;
  setHeartWatch(cb, u, true);
}

/** The enemy turn's Soul step (combat.ts enemyTurn, one call a step). True when it acted. */
export function aiSoulStep(cb: Combat, rng: Rng, u: Unit): boolean {
  if (!isHeart(u)) return false;
  const m = u.mg!, st = turnOf(cb, u);
  if (blocked(u)) { if (m.held && m.strain > m.strainLimit && !u.dead) return !letGo(cb, u); return false; }
  // 1. Over the limit (it burns at the turn's end): release if anything is worth it, else Steady (stage 2+) or let go.
  if (m.held && m.strain > strainCap(u)) {
    const c = heartBestRelease(cb, u); if (c) return doRelease(cb, rng, u, c);
    if (m.held.stage >= 2 && !m.held.steady && u.ap >= SOUL_AP.steady && m.strain - 1 <= strainCap(u)) return !steadyHeart(cb, u);
    return !letGo(cb, u);
  }
  // 2. The best release this turn (from here, or one walk away).
  const c = heartBestRelease(cb, u, { move: !st.moved });
  const cd = c ? m.designs.find((x) => x.id === c.design) : undefined;
  if (c && (bigEnough(cb, u, c) || (!m.held && (!cd || !canBeginHold(cb, u, cd))))) return doRelease(cb, rng, u, c);
  if (m.held) {
    // 3. Holding toward a big release: Steady if one more turn would drift over, free Pumps, then Pump with spare AP
    //    when a player is near (within reach + 3), and watch with the heart.
    if (!holdSafe(cb, u)) {
      if (m.held.stage >= 2 && !m.held.steady && u.ap >= SOUL_AP.steady) { watch(cb, u); return !steadyHeart(cb, u); }
      if (m.strain >= m.strainLimit) return !letGo(cb, u);
    }
    const d = m.designs.find((x) => x.id === m.held!.design);
    if (m.held.stage < MAX_STAGE && (m.freePumps || 0) > 0 && !pumpOutburst(cb, rng, u)) { watch(cb, u); return true; }
    const near = d ? seenFoes(cb, u).some((t) => dist(t.pos, u.pos) <= heartReach(m, d) + 3) : false;
    if (m.held.stage < MAX_STAGE && u.ap >= SOUL_AP.pump && (near || st.moved) && !m.held.steady && !pumpOutburst(cb, rng, u)) { watch(cb, u); return true; }
    watch(cb, u);
    return false; // walk or shoot (the weapon code); a hit calms the heart
  }
  // 4. Nothing worth releasing yet: Syphon if the MP is short, else Begin and hold for what is coming.
  if (!seenFoes(cb, u).length) return false;
  const pick = cd && !m.held && canBeginHold(cb, u, cd) ? cd : beginPick(cb, u); if (!pick) return false;
  const pv = previewOutburst(cb, u, pick.id, undefined, false);
  if (!pv.ok) {
    if (/MP/.test(pv.why || '') && m.mp < m.mpMax && u.ap >= 1 + SOUL_AP.begin) return !syphon(cb, u);
    return false;
  }
  if (beginOutburst(cb, rng, u, pick.id, undefined, true)) return false;
  watch(cb, u);
  return true;
}
/** Can the caster Begin a design and hold it safely now: AP for the Begin and one more action, Strain after ≤ its cap. */
function canBeginHold(cb: Combat, u: Unit, d: OutburstDesign): boolean {
  const m = u.mg!; if (!d || m.held) return false;
  const pv = previewOutburst(cb, u, d.id, undefined, false);
  return pv.ok && u.ap >= pv.ap + 1 && m.strain + beginStrain(cb, u, d) <= Math.min(strainCap(u), m.strainLimit);
}
/** Which design to Begin and hold with nothing in reach: a hostile one (the first that can be held safely; a Buff only
 * when an ally of its side is hurt). */
function beginPick(cb: Combat, u: Unit): OutburstDesign | null {
  const m = u.mg!, hurt = cb.units.some((t) => t.side === u.side && live(t) && t.hp < 0.6 * t.maxHp);
  const ok = (d: OutburstDesign) => { const pv = previewOutburst(cb, u, d.id, undefined, false); return (pv.ok || /MP/.test(pv.why || '')) && u.ap >= pv.ap + 1 && m.strain + beginStrain(cb, u, d) <= Math.min(strainCap(u), m.strainLimit); };
  return m.designs.find((d) => hostile(d) && ok(d)) || (hurt ? m.designs.find((d) => !hostile(d) && ok(d)) : null) || null;
}
/** The designs a Soul caster archetype holds ready (for tools and the Narrator's context). */
export const heartDesigns = (id: string): OutburstDesign[] => (HEART_CASTER[id]?.designs || []).map((d) => ({ ...d, modules: [...(d.modules || [])] }));
