// Test helper for Physical 2.0 (rules 1.12). Owned by the lead: the melee lane adds its own helpers in
// physfight-melee.ts, the ranged lane in physfight-ranged.ts (import from here; don't change this file).
//
//   const f = physFight([{ weapon: 'sabre', known: ['lunge', 'coup'] }], [{ at: 'D5' }]);
//   f.put(f.pc, 'C5'); f.turn(f.pc);
//   rig({ hit: true });                       // every attack roll hits until rig() is called again (die: force the d20)
//   expect(f.tech('lunge', { targetId: f.foe.id })).toBeNull();   // through the real reducer; a refusal comes back as text
//   f.pv('coup', { targetId: f.foe.id })      // the preview, changing nothing
//   f.press(f.foe, 2); f.momentum(f.pc, 3);   // set the meters
import { fightWith, withGame, type CharSpec, type FoeSpec } from './perkfight';
import { onHook } from '../../src/effects/hooks';
import { phys, WEAPON, keyOf, moveUnit, endTurn, type TechArgs, type TechPreview, type Unit, type Character } from '../../src';

export interface PhysSpec extends CharSpec {
  /** techniques known and ready (free ones need no listing) */ known?: string[];
  /** the ready list by system, when it should differ from `known` */ ready?: { melee?: string[]; ranged?: string[] };
  /** an off-hand weapon id */ off?: string;
  /** drill per weapon id */ drill?: Record<string, number>;
}
// Forced dice: one global listener, read from a module variable (each test file runs in its own worker).
let RIG: { hit?: boolean; die?: number } | null = null;
onHook('attack_roll', (ctx: any) => { if (!RIG) return; if (RIG.die != null) ctx.die = RIG.die; if (RIG.hit != null) ctx.hit = RIG.hit; });
/** Force attack rolls: { hit: true | false } decides the result, { die: n } sets the d20. rig() frees the dice. */
export const rig = (r: { hit?: boolean; die?: number } | null = null) => { RIG = r; };

export function physFight(specs: PhysSpec[] = [{}], foes: FoeSpec[] = [{}], o: { map?: string; seed?: string } = {}) {
  rig(null);
  const f = fightWith(specs.map((s) => ({ archetype: 'sharpshooter', ...s })), foes, { map: o.map || 'yard', seed: o.seed });
  // Techniques, drill and the off hand go on after creation (legality isn't checked: tests build what they need).
  f.pcs.forEach((u, i) => {
    const s = specs[i] || {}, c = f.g.characters[u.charId!];
    const p = phys.ensurePhys(c);
    if (s.known) { p.known = [...s.known]; p.ready = { melee: s.known.filter((id) => phys.TECHNIQUE[id]?.system === 'melee'), ranged: s.known.filter((id) => phys.TECHNIQUE[id]?.system === 'ranged') }; (p as any).uncapped = true; }
    if (s.ready) p.ready = { melee: s.ready.melee || [], ranged: s.ready.ranged || [] };
    if (s.drill) p.drill = { ...s.drill };
    if (s.off) { u.offWeapon = s.off; u.offAmmo = WEAPON[s.off]?.magazine ?? 0; c.offHand = { id: s.off, ...(WEAPON[s.off]?.magazine != null ? { loaded: WEAPON[s.off].magazine } : {}) } as any; } // on the sheet too: the gear service drops and stows what the character holds
  });
  const tile = (ref: string) => (/^\d+,\d+$/.test(ref) ? ref : keyOf(ref, f.cb.map) || ref);
  const api = Object.assign(f, {
    char: (u: Unit): Character => f.g.characters[u.charId!],
    /** Stand a unit on a tile ('C5' or '2,4'). */
    put(u: Unit, ref: string) { f.unit(u.id).pos = tile(ref); return f.unit(u.id); },
    tile,
    /** Use a technique with the unit whose turn it is, through the reducer. Returns the refusal, or null. */
    tech(id: string, args: TechArgs = {}, by = 'host'): string | null {
      const u = f.cb.units.find((x) => x.id === f.cb.order[f.cb.turn])!;
      try { f.act({ type: 'combat/technique', unitId: u.id, id, ...args } as any, by); return null; } catch (e: any) { return String(e?.message || e); }
    },
    /** The preview for a unit (default: the first PC), with the game bound. */
    pv(id: string, args: TechArgs = {}, u?: Unit): TechPreview { return withGame(f.g, () => phys.previewTechnique(f.cb, u ? f.unit(u.id) : f.pc, id, args)); },
    /** Use a technique directly on the engine (an enemy, or a unit off the reducer's path). */
    use(u: Unit, id: string, args: TechArgs = {}): string | null { return withGame(f.g, () => phys.useTechnique(f.cb, f.unit(u.id), id, args, f.g.rng)); },
    pad(u?: Unit, hand: 'main' | 'off' = 'main') { return withGame(f.g, () => phys.techniquePad(f.cb, u ? f.unit(u.id) : f.pc, hand)); },
    /** Set a unit's Pressure (through the rules: the caps apply). */
    press(u: Unit, n: number, by?: Unit) {
      const x = f.unit(u.id), now = phys.pressureOf(x);
      withGame(f.g, () => (n > now ? phys.addPressureTo(f.cb, x, n - now, by ? f.unit(by.id) : null, 'test') : phys.lowerPressureOf(f.cb, x, now - n, 'test')));
      return phys.pressureOf(f.unit(u.id));
    },
    pressure: (u: Unit) => phys.pressureOf(f.unit(u.id)),
    /** Set a unit's Momentum. */
    momentum(u: Unit, n?: number) { const x = f.unit(u.id); if (n != null) { phys.ensureMomentum(x); x.res!.momentum = n; } return phys.momentumOf(x); },
    /** Walk a unit with the engine's own move (reactions and Watches fire), with the game bound. */
    walk(u: Unit, ref: string, how: 'move' | 'sprint' | 'disengage' = 'move') { return withGame(f.g, () => moveUnit(f.cb, f.unit(u.id), tile(ref), f.g.rng, how)); },
    /** End the active unit's turn without running the enemy AI (turn_end hooks and the next unit's turn start run). */
    pass() { withGame(f.g, () => endTurn(f.cb, f.g.rng)); },
    /** The fight's fx events of a kind since the fight began. */
    fx: (kind: string) => ((f.cb as any).fx || []).filter((e: any) => e.k === kind),
    /** Run engine code with the game bound. */
    bound: <T>(fn: () => T): T => withGame(f.g, fn),
  });
  return api;
}
