// Classes 3.0 step 8 (rules 1.34): a fight with a Visualizer user (helpers for figments.test.ts and the Rigger's).
import { storyWith, withGame, CLASSIC, type CharSpec, type FoeSpec } from './perkfight';
import { beginTurn, type Combat, type GameState, type Unit, type Action } from '../../src';

export interface FigSpec extends CharSpec { visualizer?: 'hand' | 'pack' | null; cores?: number; /** another focus in the off hand (an Attuner: the integration's tests) */ offHand?: string }
/** A fight on the practice square: the first character holds the Visualizer in its off hand (or in the pack), with
 * spare cores. */
export function figFight(specs: FigSpec[] = [{}], foes: FoeSpec[] = [{}], o: { seed?: string; level?: number } = {}) {
  const s = storyWith(specs, o.seed || 'FIGMENTS1');
  specs.forEach((sp, i) => {
    const c = s.g.characters[Object.keys(s.g.characters)[i]];
    const vis = sp.visualizer === undefined ? (i === 0 ? 'hand' : null) : sp.visualizer;
    if (vis === 'hand') c.offHand = { id: 'visualizer' } as any;
    if (sp.offHand) c.offHand = { id: sp.offHand } as any;
    if (vis === 'pack') c.pack = [...(c.pack || []), { id: 'visualizer', item: 'visualizer', name: 'Visualizer', qty: 1, kind: 'tool' } as any];
    if (vis && (sp.cores ?? 2)) c.pack = [...(c.pack || []), { id: 'standard_core', item: 'standard_core', name: 'Standard mana core', qty: sp.cores ?? 2, kind: 'ammo' } as any];
  });
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Figment fight', map: 'yard16', difficulty: 'standard', ...(o.level != null ? { level: o.level } : {}),
    enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: f.weapon || 'service_pistol', at: f.at || '', ...(f.level != null ? { level: f.level } : {}), ...(f.classic ? { fixed: CLASSIC[f.tier || 'soldier'] || CLASSIC.minion } : {}) })) } } } as any);
  const box: any = s;
  const api = {
    get g(): GameState { return box.g; },
    get cb(): Combat { return box.g.combat!; },
    get pc(): Unit { return box.g.combat!.units.find((u: Unit) => u.side === 'pc' && u.charId)!; },
    get pcs(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'pc' && u.charId); },
    get foe(): Unit { return box.g.combat!.units.find((u: Unit) => u.side === 'foe')!; },
    get foes(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'foe'); },
    unit: (id: string): Unit => box.g.combat!.units.find((u: Unit) => u.id === id)!,
    act: (a: Action, by = 'host') => s.act(a, by),
    turn(u: Unit | string) { const id = typeof u === 'string' ? u : u.id, cb = box.g.combat!; cb.turn = cb.order.indexOf(id); delete cb.window; withGame(box.g, () => beginTurn(cb, box.g.rng)); return api.unit(id); },
    /** Picture through the reducer (combat/perk on the verb item `picture`). */
    picture(u: Unit, choice: string, tile: string) { return s.act({ type: 'combat/perk', unitId: u.id, id: 'verb:picture', choice, tile } as any); },
    /** Give a Figment a verb through the reducer (combat/owned). */
    order(u: Unit, f: Unit, verb: string, p: { targetId?: string; tile?: string } = {}) { return s.act({ type: 'combat/owned', unitId: u.id, owned: f.id, verb, ...p } as any); },
    figments(u: Unit): Unit[] { return box.g.combat!.units.filter((x: any) => x.owned?.kind === 'figment' && x.ctrl === u.charId); },
  };
  return api;
}
