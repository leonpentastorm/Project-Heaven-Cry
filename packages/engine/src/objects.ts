// Map objects and points of interest (spec: Map objects; Points of interest). Objects sit on grid tiles above a
// background that is visual only: cover, barricades, doors, holes, traps, hazards, barrels, containers, POIs.
// The engine owns what they do (blocking, cover, HP, traps, hazards, explosions); the Narrator writes what they
// mean and the ways to deal with them (approaches), which players can try, and retry, without a Narrator call.
import objectsJ from '../../../data/objects.json';

export interface ObjKind {
  id: string; name: string; glyph: string; blocks_move: boolean; blocks_sight: boolean; cover: 'half' | 'full' | null; hp: number | null;
  difficult?: boolean; hidden?: boolean; door?: boolean; text: string;
  trap?: { damage: number; detect_tn: number; detect_range: number }; hazard?: { damage: number }; explodes?: { damage: number; radius: number };
  /** Light radius in tiles (spec: Vision). */
  light?: number;
}
export const OBJECT_KINDS: ObjKind[] = (objectsJ as any).items;
export const OBJ: Record<string, ObjKind> = Object.fromEntries(OBJECT_KINDS.map((k) => [k.id, k]));

/** One way to deal with an object, written by the Narrator: a check, and what success does by itself. */
export interface Approach {
  label: string; skills: string[]; tn: number; stakes: string;
  success: '' | 'remove' | 'open' | 'reveal' | 'disarm';
  tries: { charId: string; name: string; ok: boolean; total: number; scene: number }[];
}
export interface MapObject {
  id: string; kind: string; pos: string; name: string; text: string;
  hp?: number; max?: number; open?: boolean; locked?: boolean; hidden?: boolean; approaches: Approach[]; resolved?: boolean;
  /** A way out: the zone it leads to. */
  to?: string;
  /** Art (spec: Campaigns, art): a sprite asset drawn on the tile (spriteBox in tiles from the tile's corner, for art
   * bigger than one tile) and a portrait for NPC points of interest. Visual only: the engine never reads them. */
  /** A person at this point of interest who became a token when attacked, and whether they died (spec: Anyone is a target). */
  npcId?: string; dead?: boolean;
  sprite?: string; spriteBox?: { w: number; h: number; dx: number; dy: number }; portrait?: string;
}

export function makeObject(id: string, kind: string, pos: string, extra: Partial<MapObject> = {}): MapObject {
  const k = OBJ[kind] || OBJ.poi;
  return { id, kind: k.id, pos, name: extra.name || k.name, text: extra.text || '', approaches: extra.approaches || [],
    ...(k.hp != null ? { hp: k.hp, max: k.hp } : {}), ...(k.hidden ? { hidden: true } : {}), ...(k.door ? { open: false } : {}),
    ...Object.fromEntries(Object.entries(extra).filter(([key]) => !['name', 'text', 'approaches'].includes(key))) } as MapObject;
}

export const kindOf = (o: MapObject) => OBJ[o.kind] || OBJ.poi;
const live = (o: MapObject) => o.hp == null || o.hp > 0;
/** A barricade an Infiltrator sabotaged (Sabotage, Class Roster Rev 3) stops blocking the way until o.sabotaged's round. */
export const blocksMove = (o: MapObject) => live(o) && kindOf(o).blocks_move && !(kindOf(o).door && o.open) && !(o as any).sabotaged;
export const blocksSight = (o: MapObject) => live(o) && kindOf(o).blocks_sight && !(kindOf(o).door && o.open);
export const coverKind = (o: MapObject): 'half' | 'full' | null => (live(o) ? kindOf(o).cover : null);
export const isDifficult = (o: MapObject) => !!kindOf(o).difficult;
export const isTrap = (o: MapObject) => !!kindOf(o).trap && !o.resolved;
export const hazardOf = (o: MapObject) => kindOf(o).hazard || null;

/** A new approach from the Narrator, keeping the tries of an approach with the same label. */
export function mergeApproaches(old: Approach[], fresh: Omit<Approach, 'tries'>[]): Approach[] {
  return fresh.map((a) => ({ ...a, tries: old.find((o) => o.label.toLowerCase() === a.label.toLowerCase())?.tries || [] }));
}
/** May this character try this approach now? Once per character per scene. */
export const triedThisScene = (a: Approach, charId: string, scene: number) => a.tries.some((t) => t.charId === charId && t.scene === scene);
export const lightOf = (o: MapObject) => ((o.hp == null || o.hp > 0) && !(o as any).disabled ? kindOf(o).light || 0 : 0);
