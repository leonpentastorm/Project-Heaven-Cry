// Test helpers for the perk, trait and class-move lanes (plan 2.1): characters holding given items, a story with them,
// a fight with them on their turn, and registry isolation. Every helper goes through the real reducer (apply), so a
// lane's test exercises the same path a player's click does.
//
//   const { g, pc, foe, act, turn } = fightWith([{ perks: { bulwark: 'II' } }], [{ tier: 'soldier', at: 'F6' }]);
//   turn(pc);                                      // make it pc's turn (beginTurn runs: AP, turn_start hooks)
//   act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'shot' });
//   withGame(g, () => …)                           // call engine functions directly with the game bound (h.c, h.g)
import {
  ARCHETYPES, PERK, apply, newGame, beginTurn, bindGame, _snapshotRegistry, _restoreRegistry, _unregisterAll, register,
  type Action, type Character, type Combat, type GameState, type ItemHandler, type Sheet, type Unit,
} from '../../src';

export interface CharSpec {
  name?: string; archetype?: string; kit?: string;
  /** Perks by id: tier ('I' | 'II' | 'mastered' | 'achieved' | 'ultimate'); a list of ids means Tier I (or the perk's own tier). */
  perks?: Record<string, string> | string[];
  traits?: string[];
  classId?: string | null; advancedClass?: string | null;
  /** Skill points to set after creation (legality is not checked: tests build what they need). */
  skills?: Record<string, number>; attrs?: Record<string, number>;
  level?: number; weapon?: string; owner?: string;
}
export function sheetOf(spec: CharSpec = {}): Sheet {
  const a = ARCHETYPES.find((x) => x.id === (spec.archetype || 'sharpshooter')) || ARCHETYPES[0];
  return { name: spec.name || 'Tester', portrait: '', origin: 'Thousand-Planet frontier', kit: spec.kit || 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
}
/** Put the spec's items, skills and class on a character (after creation, so the 0-2 trait and budget rules don't apply). */
export function equipSpec(c: Character, spec: CharSpec) {
  const PERKS: Record<string, any> = PERK as any;
  if (spec.perks) c.perks = Array.isArray(spec.perks)
    ? spec.perks.map((id) => ({ id, tier: (PERKS[id]?.tier === 'acquired' ? 'I' : PERKS[id]?.tier || 'I') as any }))
    : Object.entries(spec.perks).map(([id, tier]) => ({ id, tier: tier as any }));
  if (spec.traits) c.traits = [...spec.traits];
  if (spec.skills) Object.assign(c.skills, spec.skills);
  if (spec.attrs) Object.assign(c.attrs, spec.attrs);
  if (spec.classId !== undefined) c.classId = spec.classId;
  if (spec.advancedClass !== undefined) c.advancedClass = spec.advancedClass;
  if (spec.level) c.level = spec.level;
  if (spec.weapon) { c.weapon = spec.weapon; c.loaded = undefined; }
}

/** A room in the story with these characters (session started, the Narrator's opening done, players to speak). */
export function storyWith(specs: CharSpec[] = [{}], seed = 'PERKS1'): { g: GameState; chars: Character[]; act: (a: Action, by?: string) => GameState } {
  let g = newGame(seed, { id: 'host', name: 'Host' });
  const owners = [...new Set(specs.map((s, i) => s.owner || (i < 2 ? 'host' : 'p' + i)))];
  for (const o of owners) if (o !== 'host') g = apply(g, { type: 'player/join', id: o, name: o }, 'host');
  specs.forEach((s, i) => { g = apply(g, { type: 'char/add', sheet: sheetOf({ ...s, name: s.name || 'Tester ' + (i + 1) }) }, s.owner || (i < 2 ? 'host' : 'p' + i)); });
  const ids = Object.keys(g.characters);
  ids.forEach((id, i) => equipSpec(g.characters[id], specs[i] || {}));
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'The test begins.', sceneTitle: 'Test scene' } }, 'host');
  const box = { g };
  const act = (a: Action, by = 'host') => (box.g = apply(box.g, a, by));
  return { get g() { return box.g; }, set g(v) { box.g = v; }, chars: ids.map((id) => box.g.characters[id]), act } as any;
}

export interface FoeSpec { name?: string; tier?: string; weapon?: string; at?: string }
/** A fight with these characters against these foes, on the yard map unless given. Returns live getters (the state is
 * replaced by every act). turn(u) makes it that unit's turn (its AP and turn_start hooks run). */
export function fightWith(specs: CharSpec[] = [{}], foes: FoeSpec[] = [{}], o: { map?: string; seed?: string } = {}) {
  const s = storyWith(specs, o.seed);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: o.map || 'yard', difficulty: 'standard', enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: f.weapon || 'service_pistol', at: f.at || '' })) } } } as any);
  const box: any = s;
  const api = {
    get g(): GameState { return box.g; },
    get cb(): Combat { return box.g.combat!; },
    /** The first PC's unit, and every unit by side (fresh from the latest state). */
    get pc(): Unit { return box.g.combat!.units.find((u: Unit) => u.side === 'pc')!; },
    get pcs(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'pc'); },
    get foe(): Unit { return box.g.combat!.units.find((u: Unit) => u.side === 'foe')!; },
    get foes(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'foe'); },
    unit: (id: string): Unit => box.g.combat!.units.find((u: Unit) => u.id === id)!,
    act: (a: Action, by = 'host') => s.act(a, by),
    /** Make it this unit's turn now (no enemy turns run): beginTurn with the game bound. */
    turn(u: Unit | string) {
      const id = typeof u === 'string' ? u : u.id, cb = box.g.combat!;
      cb.turn = cb.order.indexOf(id); delete cb.window;
      withGame(box.g, () => beginTurn(cb, box.g.rng));
      return api.unit(id);
    },
  };
  return api;
}

/** Run engine code directly with the game bound (handlers see h.g and the live character h.c). */
export function withGame<T>(g: GameState, f: () => T): T { const was = bindGame(g); try { return f(); } finally { bindGame(was); } }

/** Run a test with only these handlers registered (lanes' registrations set aside, then put back). */
export function onlyHandlers<T>(defs: ItemHandler[], f: () => T): T {
  const snap = _snapshotRegistry();
  try { _unregisterAll(); for (const d of defs) register(d); return f(); } finally { _restoreRegistry(snap); }
}
/** Seeded RNG states for direct engine calls. */
export const rng = (n = 7) => ({ state: n });
