// THE GEAR PREVIEW (rules 1.42; survival-spec section 4.2 item 14). The numbers a card shows for one gear instance in a
// character's hands, outside a fight, from the same unit build and the same attack preview the fight uses: a scratch
// fight of two (the character, holding the instance, and a reference foe of the character's level from
// `rules.json gear_preview`), so the shop's cards, the compare panel and the reward picks show the engine's numbers and
// the client computes none (`boundary.test.ts`). General: the backpack screen, loot piles, every pick.
//
// Nothing here changes the character: it is copied first; the scratch fight uses its own named stream (`rngFor`), never
// the game's dice, and is thrown away.
import { WEAPON, ITEM, RULES, SKILL } from './data';
import { type Character, type Rarity, RARITY, kindOfDoor, mod, magazineSize, maxDurOf, quiverHolds, quiversOf } from './character';
import { type Combat, type Unit, type AttackMode, unitFromCharacter, unitFromEnemy, previewAttack, attackApCost, volleyBaseAp, effectiveRange, layoutMap, isMelee } from './combat';
import { priced } from './effects/cost';
import { rngFor } from './rng';
import { focusAccTerm } from './rolls';
import { bindGame } from './effects/hooks';
import { CALIBRE_NAME } from './data';

/** One gear instance: an item id with its grade and fitted mods (a pack entry's or a shop card's). */
export interface GearInstance { id: string; rarity?: Rarity; mods?: string[] }
/** One number of a preview: `num` for comparing (null: a word, not a number); `better`: which way is better. */
export interface PreviewLine { key: string; label: string; value: string; num: number | null; better?: 'higher' | 'lower' }
/** What a card shows for an instance in this character's hands (all from the engine). */
export interface GearPreview { id: string; name: string; kind: 'weapon' | 'thrown' | 'focus' | 'armour' | 'mod' | 'ammo' | 'item'; rarity: Rarity; category: string; lines: PreviewLine[]; traits: string[]; text: string }
/** The compare panel: the instance against what the character would hold instead (`held`; null when nothing compares). */
export interface GearCompare { held: GearPreview | null; next: GearPreview; rows: { key: string; label: string; held: string; next: string; diff: 'better' | 'worse' | 'same' | null; word: string }[]; slot: string | null }

const GP: { about?: string; tier: string; weapon: string; range_tiles: number; name: string } = (RULES as any).gear_preview;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nameOf = (id: string): string => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
const clone = (c: Character): Character => JSON.parse(JSON.stringify(c));
/** A two-tile-high strip wide enough for the reference range: the character at the west end. */
const STRIP = (() => { const w = Math.max(4, GP.range_tiles + 3); return layoutMap('gear-preview', { name: 'Gear preview', w, h: 1, rows: ['.'.repeat(w)] }); })();

/** The scratch fight: the character (a copy) holding `inst`, and the reference foe at `range` tiles. */
function scratch(c: Character, inst: GearInstance, range: number): { cb: Combat; u: Unit; foe: Unit } {
  const x = clone(c), w: any = WEAPON[inst.id];
  x.weapon = inst.id; x.weaponState = { ...(x.weaponState || {}), rarity: inst.rarity || 'standard', mods: [...(inst.mods || [])] } as any;
  if (w?.magazine != null) (x as any).loaded = magazineSize(inst.id, inst.mods) ?? w.magazine;
  if (x.offHand && WEAPON[x.offHand.id] && (w?.hands === '2H')) x.offHand = null;
  const rng = rngFor('gear-preview', c.id + '#' + inst.id);
  const u = unitFromCharacter(x, '0,0', rng), foe = unitFromEnemy('gear-preview-foe', GP.name, GP.tier, GP.weapon, Math.min(STRIP.w - 1, range) + ',0', rng, c.level);
  const cb = { name: 'Gear preview', map: STRIP, units: [u, foe], order: [u.id, foe.id], turn: 0, round: 1, difficulty: 'standard', log: [], over: null, level: c.level, objects: [] } as unknown as Combat;
  return { cb, u, foe };
}
/** The bonus a focus at this grade gives its door's rolls (to hit and the TN of the saves it forces), as the fight reads
 * it: `focusAccTerm` for a scratch copy of the character holding the focus in its main hand. */
function doorAcc(c: Character, inst: GearInstance, door: string): number {
  const x = clone(c); x.weapon = inst.id; x.weaponState = { ...(x.weaponState || {}), rarity: inst.rarity || 'standard' } as any; x.offHand = null;
  const was = bindGame({ characters: { [x.id]: x } }); try { return focusAccTerm({ charId: x.id } as Unit, door)?.v ?? 0; } finally { bindGame(was); }
}
const pct = (n: number) => n + '%';
/** The attack's numbers in this mode, or null when the weapon has no such mode or can't attack (its words in `why`). */
function attackLines(cb: Combat, u: Unit, foe: Unit, mode: AttackMode) {
  const p = previewAttack(cb, u, foe, mode, { free: true });
  return p.ok ? { pct: p.pct, dmg: p.dmg?.total ?? 0 } : null;
}

/** The numbers a card shows for `inst` in `c`'s hands (rules 1.42, spec item 14): for a weapon, to hit against the
 * reference foe of the character's level, damage per hit, the AP of each mode, magazine, range, traits; for a focus its
 * door and the door skill's modifier; for armour and shields what the character's Defense, armour and injury resistance
 * become; for ammunition and items their numbers in data. */
export function gearPreview(c: Character, inst: GearInstance): GearPreview {
  const id = inst.id, rarity: Rarity = inst.rarity || 'standard', w: any = WEAPON[id], it: any = ITEM[id];
  const base = { id, name: nameOf(id), rarity, text: String(w?.text || it?.text || '') };
  if (w && w.category === 'thrown') {
    return { ...base, kind: 'thrown', category: 'Thrown', traits: [...(w.properties || [])], lines: [
      ...(Number(w.damage) ? [{ key: 'damage', label: 'Damage', value: String(w.damage), num: Number(w.damage), better: 'higher' as const }] : []),
      ...(typeof w.range_tiles === 'number' ? [{ key: 'range', label: 'Range', value: w.range_tiles + ' tiles', num: w.range_tiles, better: 'higher' as const }] : []),
      ...(w.ap_cost?.single != null ? [{ key: 'ap', label: 'AP to throw', value: String(w.ap_cost.single), num: Number(w.ap_cost.single), better: 'lower' as const }] : []),
    ] };
  }
  if (w) {
    const melee = isMelee(w), range = melee ? 1 : Math.min(GP.range_tiles, effectiveRange(w));
    const { cb, u, foe } = scratch(c, inst, range);
    const lines: PreviewLine[] = [];
    const main = attackLines(cb, u, foe, melee ? 'melee' : 'shot');
    if (main) {
      lines.push({ key: 'hit', label: 'To hit (' + GP.name.toLowerCase() + ', level ' + c.level + ')', value: pct(main.pct), num: main.pct, better: 'higher' });
      lines.push({ key: 'dmg', label: 'Damage per hit', value: String(main.dmg), num: main.dmg, better: 'higher' });
    }
    const apOf = (m: AttackMode, b: number) => priced({ cb, u }, 'attack', b, undefined, { mode: m, tgt: foe }).ap;
    if (melee) lines.push({ key: 'ap', label: 'AP a strike', value: String(apOf('melee', attackApCost(w, 'melee'))), num: apOf('melee', attackApCost(w, 'melee')), better: 'lower' });
    else {
      const s = apOf('shot', attackApCost(w, 'shot'));
      lines.push({ key: 'ap', label: 'AP a shot', value: String(s), num: s, better: 'lower' });
      if ((w.modes || []).includes('burst')) { const b = apOf('burst', volleyBaseAp(u, 'burst')); lines.push({ key: 'ap_burst', label: 'AP a Burst', value: String(b), num: b, better: 'lower' }); }
      const mag = magazineSize(id, inst.mods);
      if (mag != null) lines.push({ key: 'mag', label: 'Magazine', value: mag + ' ' + (CALIBRE_NAME[w.ammo] || w.ammo || ''), num: mag, better: 'higher' });
      lines.push({ key: 'range', label: 'Range', value: effectiveRange(w) + ' tiles', num: effectiveRange(w), better: 'higher' });
    }
    { const full = maxDurOf(id, rarity); if (full) lines.push({ key: 'dur', label: 'Durability (full)', value: String(full), num: full, better: 'higher' }); } // rules 1.50: the wear it holds at its grade
    const traits = [...(w.properties || []), ...((w.phys?.props as string[]) || [])].map((t) => cap(String(t).replace(/_/g, ' ')));
    return { ...base, kind: 'weapon', category: cap(String(w.category).replace(/_/g, ' ')), traits: [...new Set(traits)], lines };
  }
  if (it?.focus) {
    const door = it.focus.door as string, sk = SKILL[door], pts = c.skills[door] || 0, kind = kindOfDoor(door);
    return { ...base, kind: 'focus', category: 'Focus · ' + cap(kind || it.id), traits: [], lines: [
      { key: 'door', label: 'Door', value: sk?.name || door, num: null },
      { key: 'door_mod', label: (sk?.name || door) + ' modifier', value: (mod(pts) >= 0 ? '+' : '') + mod(pts), num: mod(pts), better: 'higher' },
      // rules 1.46: the grade's bonus to the door's rolls, read by the fight's own term (rolls.ts focusAccTerm, rules 1.43)
      { key: 'door_acc', label: 'Grade on ' + (sk?.name || door) + ' rolls', value: '+' + doorAcc(c, inst, door), num: doorAcc(c, inst, door), better: 'higher' },
      { key: 'fuel', label: 'Runs on', value: it.focus.fuel === 'core' ? 'mana cores' : 'MP', num: null },
    ] };
  }
  if (it && (it.category === 'armour' || it.category === 'shield')) {
    const x = clone(c), slot = String(it.slot || '');
    if (slot === 'off_hand') x.offHand = { id } as any; else if (slot) x.worn = { ...(x.worn || {}), [slot]: id };
    const rng = rngFor('gear-preview', c.id + '#' + id), u = unitFromCharacter(x, '0,0', rng);
    return { ...base, kind: 'armour', category: cap(String(it.category)) + (slot ? ' · ' + slot.replace(/_/g, ' ') : ''), traits: [], lines: [
      { key: 'def', label: 'Defense', value: String(u.def), num: u.def, better: 'higher' },
      { key: 'armour', label: 'Armour', value: String(u.armour), num: u.armour, better: 'higher' },
      { key: 'injury', label: 'Injury resistance', value: pct(u.injResist || 0), num: u.injResist || 0, better: 'higher' },
      { key: 'kg', label: 'Weight', value: (it.weight_kg ?? 0) + ' kg', num: it.weight_kg ?? 0, better: 'lower' },
      ...(maxDurOf(id, rarity) ? [{ key: 'dur', label: 'Durability (full)', value: String(maxDurOf(id, rarity)), num: maxDurOf(id, rarity), better: 'higher' as const }] : []), // rules 1.50: a shield wears
    ] };
  }
  // rules 1.53: a quiver's grade gives arrows held and nothing else; it has one enchantment slot at every grade
  if (it?.category === 'quiver') {
    const n = quiverHolds(id, rarity), e = (inst.mods || []).map((m) => ITEM[m] as any).find((m) => m?.mod_slot === 'enchantment');
    return { ...base, kind: 'item', category: 'Quiver', traits: [], lines: [
      { key: 'arrows', label: 'Arrows held', value: String(n), num: n, better: 'higher' },
      { key: 'ench', label: 'Enchantment', value: e ? e.name : 'None (room for one)', num: null },
      { key: 'kg', label: 'Weight', value: (it.weight_kg ?? 0) + ' kg', num: it.weight_kg ?? 0, better: 'lower' },
    ] };
  }
  if (it?.category === 'mod') {
    return { ...base, kind: 'mod', category: 'Mod · ' + String(it.mod_slot || '').replace(/_/g, ' ') + ' slot', traits: [], lines: [
      { key: 'slot', label: 'Slot', value: cap(String(it.mod_slot || '').replace(/_/g, ' ')), num: null },
      ...(it.mod_slot === 'enchantment' ? [{ key: 'arrow_dmg', label: 'Damage of each arrow', value: '×' + it.damage_mult, num: it.damage_mult, better: 'higher' as const }, { key: 'rider', label: 'Rider', value: cap(String(it.tone)) + ' tone, stage ' + it.stage, num: null }] : []),
      { key: 'kg', label: 'Weight', value: (it.weight_kg ?? 0) + ' kg', num: it.weight_kg ?? 0, better: 'lower' },
    ] };
  }
  const r = /^(rounds|mag):(.+)$/.exec(id);
  if (r || it?.category === 'ammo') {
    const cal = r?.[1] === 'rounds' ? r[2] : r ? (WEAPON[r[2]] as any)?.ammo : null;
    const users = cal ? Object.values(WEAPON).filter((x: any) => x.ammo === cal).map((x: any) => x.name) : [];
    return { ...base, name: r ? (r[1] === 'rounds' ? (CALIBRE_NAME[r[2]] || r[2]) + ' rounds' : nameOf(r[2]) + ' magazine') : base.name, kind: 'ammo', category: 'Ammunition', traits: [],
      text: r ? (r[1] === 'mag' ? 'A full magazine for the ' + nameOf(r[2]) + '.' : 'Loose rounds.') : base.text,
      lines: [
        ...(r?.[1] === 'mag' ? [{ key: 'rounds', label: 'Rounds', value: String((WEAPON[r[2]] as any)?.magazine ?? 0), num: (WEAPON[r[2]] as any)?.magazine ?? 0 }] : []),
        ...(cal ? [{ key: 'calibre', label: 'Calibre', value: CALIBRE_NAME[cal] || cal, num: null }] : [{ key: 'fits', label: 'Fits', value: 'any gun', num: null }]),
        ...(users.length ? [{ key: 'used', label: 'Used by', value: users.length > 2 ? users.length + ' guns' : users.join(', '), num: null }] : []),
      ] };
  }
  return { ...base, kind: 'item', category: cap(String(it?.category || 'item')), traits: [], lines: [
    ...(it?.weight_kg != null ? [{ key: 'kg', label: 'Weight', value: it.weight_kg + ' kg', num: it.weight_kg, better: 'lower' as const }] : []),
  ] };
}

/** What the instance would replace or sit beside in `c`'s hands (the same hand's weapon, the same worn slot, the focus
 * of the same door), as an instance, and the slot's name; null when nothing compares. */
export function heldAgainst(c: Character, inst: GearInstance): { inst: GearInstance; slot: string } | null {
  const w: any = WEAPON[inst.id], it: any = ITEM[inst.id];
  if (w && w.category !== 'thrown') return c.weapon && WEAPON[c.weapon] ? { inst: { id: c.weapon, rarity: c.weaponState?.rarity, mods: c.weaponState?.mods }, slot: 'Main hand' } : null;
  if (it?.focus) {
    const door = it.focus.door, inHand = c.offHand && (ITEM[c.offHand.id] as any)?.focus?.door === door ? c.offHand : null;
    const packed = (c.pack || []).find((p: any) => (ITEM[p.item || p.id] as any)?.focus?.door === door);
    const h: any = inHand || packed; return h ? { inst: { id: h.item || h.id, rarity: h.rarity }, slot: 'Focus · ' + cap(kindOfDoor(door) || door) } : null;
  }
  if (it?.category === 'quiver') { const q = quiversOf(c)[0]; return q ? { inst: { id: q.id, rarity: q.rarity, mods: q.mods }, slot: 'Worn quiver' } : null; } // rules 1.53
  if (it?.slot === 'off_hand') return c.offHand && !WEAPON[c.offHand.id] ? { inst: { id: c.offHand.id }, slot: 'Off hand' } : null;
  if (it?.slot && c.worn?.[it.slot]) return { inst: { id: c.worn[it.slot] }, slot: cap(String(it.slot).replace(/_/g, ' ')) };
  return null;
}

/** The compare panel (rules 1.42, spec 8.3): `inst` against what `c` holds in its place, each number on a row with the
 * difference as a word ("better", "worse", "same"); the client draws it with a glyph beside the word. */
export function compareGear(c: Character, inst: GearInstance): GearCompare {
  const next = gearPreview(c, inst), h = heldAgainst(c, inst), held = h ? gearPreview(c, h.inst) : null;
  const rows = next.lines.map((l) => {
    const o = held?.lines.find((x) => x.key === l.key);
    let diff: GearCompare['rows'][number]['diff'] = null;
    if (o && l.num != null && o.num != null && l.better) diff = l.num === o.num ? 'same' : (l.num > o.num) === (l.better === 'higher') ? 'better' : 'worse';
    return { key: l.key, label: l.label, held: o ? o.value : 'none', next: l.value, diff, word: diff || '' };
  });
  return { held, next, rows, slot: h?.slot || null };
}
/** A rarity's word ("Fine"), for a card. */
export const rarityWord = (r: Rarity | null | undefined): string => cap(r || 'standard');
/** How many ornament marks a rarity carries on a card (`rules.json rarity.<r>.marks`). */
export const rarityMarks = (r: Rarity | null | undefined): number => RARITY[r || 'standard']?.marks || 0;
