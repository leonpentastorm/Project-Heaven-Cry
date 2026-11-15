// THE damage words (the item-op predicates `damage` / `not_damage`, effects/triggers.ts; the older `context` gate,
// effects/core.ts): what each reads on a damage source. Rules 1.56 P1 (spell damage names its door): the door words read
// src.door, which harm()'s callers and an amount block's `door` set (magic.ts withDoor): `outburst` is an Outburst's
// damage only (until rules 1.56 it was any Soul damage, a prayer's and a Bond's echo too), `sigil_spell` a Sigil spell's
// (any type: a Line of FIRE too), `prayer` a prayer's, `bond` a Bond's.
export const DAMAGE_WORDS = ['melee', 'ranged', 'explosive', 'outburst', 'sigil_spell', 'prayer', 'bond', 'weapon', 'physical', 'sigil', 'soul', 'elemental', 'fire', 'lightning', 'emp', 'true'];
const DOOR_WORD: Record<string, string> = { outburst: 'outburst', sigil_spell: 'sigil', prayer: 'prayer', bond: 'bond' };
export function dmgIs(src: any, w: string): boolean {
  if (!src) return false;
  if (DOOR_WORD[w]) return src.door === DOOR_WORD[w];
  return w === 'melee' ? !!src.melee : w === 'ranged' ? !!src.ranged : w === 'explosive' ? !!src.explosive
    : w === 'weapon' ? src.type === 'weapon' : w === 'physical' ? src.type === 'weapon' && src.dmgType !== 'elemental' : src.type === w || src.dmgType === w;
}
