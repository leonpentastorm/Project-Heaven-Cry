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
  /** What success does by itself (rules 1.7 adds loot, advance, and on people ally and inform; safe: a hazard's safe path). */
  success: '' | 'remove' | 'open' | 'reveal' | 'disarm' | 'loot' | 'advance' | 'ally' | 'inform' | 'safe';
  /** What failure does by itself (rules 1.7; hostile on people; hazard: one tile of the hazard on the actor). */
  fail?: '' | 'hurt' | 'alarm' | 'condition' | 'jam' | 'lose' | 'hostile' | 'hazard';
  /** advance: the objective it completes ("mission/objective" or a bare objective id). */
  objective?: string;
  /** fail condition: the condition it applies; fail lose: the item it takes (an item id or a plot item's name). */
  failCondition?: string; failItem?: string;
  /** 'best': roll the actor's best one of the skills (a hazard's "Vigilant or Sensory"), not a combined check. */
  pick?: 'best';
  /** Gone for good (a jam took it). */
  gone?: boolean;
  tries: { charId: string; name: string; ok: boolean; total: number; scene: number }[];
}
/** A cache's contents (rules 1.7), in the loot shape: an item or weapon id, how many, a rarity and a name; an unknown
 * or empty id is a plot item (name, and text as its one line). */
export interface CacheItem { item: string; qty: number; rarity?: string; name?: string; text?: string; note?: string }
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
  /** A cache's contents (rules 1.7); searched: emptied by a search or a loot success. */
  items?: CacheItem[]; searched?: boolean;
  /** Jammed: locked for the rest of this scene number (a failed approach's jam). */
  jam?: number;
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
  return fresh.map((a) => { const o = old.find((x) => x.label.toLowerCase() === a.label.toLowerCase()); return { ...a, tries: o?.tries || [], ...(o?.gone ? { gone: true } : {}) }; });
}
/** Has this character tried this approach? Rules 1.7: each character tries each approach once (scene is kept for old callers). */
export const triedThisScene = (a: Approach, charId: string, _scene?: number) => a.tries.some((t) => t.charId === charId);
export const triedBy = (a: Approach, charId: string) => a.tries.some((t) => t.charId === charId);
export const lightOf = (o: MapObject) => ((o.hp == null || o.hp > 0) && !(o as any).disabled ? kindOf(o).light || 0 : 0);
