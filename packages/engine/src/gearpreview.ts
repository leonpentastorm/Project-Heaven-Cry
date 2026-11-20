// THE GEAR PREVIEW (rules 1.42; survival-spec section 4.2 item 14). The numbers a card shows for one gear instance in a
// character's hands, outside a fight, from the same unit build and the same attack preview the fight uses: a scratch
// fight of two (the character, holding the instance, and a reference foe of the character's level from
// `rules.json gear_preview`), so the shop's cards, the compare panel and the reward picks show the engine's numbers and
// the client computes none (`boundary.test.ts`). General: the backpack screen, loot piles, every pick.
//
// Nothing here changes the character: it is copied first; the scratch fight uses its own named stream (`rngFor`), never
// the game's dice, and is thrown away.
import { tilesN } from './log';
import { fmtNumber } from './datatext';
import { WEAPON, ITEM, RULES, SKILL, ATTRS } from './data';
import { type Character, type Rarity, RARITY, kindOfDoor, mod, checkMod, weaponMultLabel, weaponMult, specialRoundName, magazineSize, gearNum, maxDurOf, quiverHolds, quiversOf, roundsIdOf, SPECIAL_ROUND_ITEM, isShieldId } from './character';
import { type Combat, type Unit, type AttackMode, unitFromCharacter, unitFromEnemy, previewAttack, attackApCost, volleyBaseAp, effectiveRange, layoutMap, isMelee, weaponVia, rollWithPick, rollWithWords, type RollWithOffer } from './combat';
import { priced } from './effects/cost';
import { PROFILES, pairOf, statTerm } from './effects/output';
import { rngFor } from './rng';
import { focusAccTerm } from './rolls';
import { bindGame, holdersOf } from './effects/hooks';
import { PREDICATES } from './effects/triggers';
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
const signed = (n: number) => (n >= 0 ? '+' : '') + n;
/** Rules 1.55 (Leon, 15 Nov 2026: "list out what skill it scale it's hit with"): the skill a weapon rolls to hit with, as
 * the attack itself resolves it (combat.ts weaponVia, the skill the attack is delivered by), with the character's own
 * check modifier (checkMod), and what its damage multiplier reads, in the words the damage breakdown labels it with
 * (character.ts weaponMultLabel). A melee weapon is read in melee, anything else as a shot or a throw. */
function skillLines(c: Character, u: Unit, w: any): PreviewLine[] {
  const sk = weaponVia(u, isMelee(w) ? 'melee' : 'shot'), sc = weaponMultLabel(w.id, { live: true }), mode: AttackMode = w.category === 'thrown' ? 'thrown' : isMelee(w) ? 'melee' : 'shot';
  return [
    { key: 'hits_with', label: 'Skill to hit', value: signed(checkMod(c, sk)) + ' (' + (SKILL[sk]?.name || sk) + ')', num: null },
    // op roll_with (rules 1.55): the skill an item lets the attack roll with instead, when it would (the fight's own choice, combat.ts rollWithPick)
    ...rollWithLines(c, sk, mode),
    // only what moves the damage today: no line when every slope of the profile is 0 (lead's ruling, 15 Nov 2026)
    // consolidation 0.29 (ruling i): with the percent the hit's own multiplier (weaponMult, the Stat term of the damage
    // line the attack deals) stands from the profile's pin (rules 1.61, the lead's ruling R5, 16 Nov 2026): the flat
    // weapon profile's Stat (output.profiles.weapon, x1.5), where the melee and gun profiles meet it (Attribute 7), so an
    // all-in Attribute 7 reads +0%, Agility 1 with a gun -15%, Strength 10 with a maul +8%: "Damage: Strength · -15%"
    ...(sc ? [{ key: 'scales_with', label: 'Attribute on damage', value: signed(Math.round((weaponMult(c, w.id) / statTerm('weapon', [], []) - 1) * 100)) + '% (' + sc + ')', num: null }] : []),
  ];
}
/** The character's roll_with offers (items whose effect is op roll_with on `attack`), read without a fight: the card
 * names the skill each would roll with and when (its label), through the same choice the attack makes. An offer
 * for some attacks only is tested through the predicates' own tests (`mode`, `melee`): Durability's is melee only,
 * never a gun or a throw (rules 1.59, T1). */
function rollWithLines(c: Character, sk: string, mode: AttackMode): PreviewLine[] {
  const offers: RollWithOffer[] = [], ctx = { mode, melee: mode === 'melee' };
  const fits = (e: any) => (['mode', 'melee'] as const).every((k) => e.if?.[k] == null || PREDICATES[k].test({ ctx } as any, e.if[k]));
  for (const h of holdersOf({ c })) for (const e of h.info.effects) if (e?.op === 'roll_with' && e.when === 'attack' && fits(e)) offers.push({ skill: e.skill, ifHigher: !!e.if_higher, label: e.label || h.info.name });
  const p = rollWithPick(c, sk, offers);
  return p ? [{ key: 'hits_with_alt', label: 'Hits with', value: rollWithWords(p) + ' · ' + signed(p.mod), num: null }] : [];
}
/** A focus hits through its door skill (the door its rolls to hit are made through, rolls.ts toHitTerms); its damage
 * reads the pair of the damage profile (output.profiles, level `deal`) whose pair holds that door; none: no such line. */
function focusSkillLines(c: Character, door: string): PreviewLine[] {
  const nm = (id: string) => ATTRS.find((a) => a.id === id)?.name || SKILL[id]?.name || id;
  const prof = Object.keys(PROFILES).find((id) => PROFILES[id].level === 'deal' && pairOf(id).skills.includes(door)), pr = prof ? pairOf(prof) : null;
  // only the inputs whose slope is not 0 (lead's ruling, 15 Nov 2026): none, no line
  const live = pr ? [...(PROFILES[prof!].attr ? pr.attrs : []), ...(PROFILES[prof!].skill ? pr.skills : [])] : [];
  return [
    { key: 'hits_with', label: 'Hits with', value: nm(door) + ' · ' + signed(checkMod(c, door)), num: null },
    ...(live.length ? [{ key: 'scales_with', label: 'Damage scales with', value: live.map(nm).join(', ').replace(/, ([^,]*)$/, ' and $1'), num: null }] : []),
  ];
}
/** The attack's numbers in this mode, or null when the weapon has no such mode or can't attack (its words in `why`). */
function attackLines(cb: Combat, u: Unit, foe: Unit, mode: AttackMode) {
  const p = previewAttack(cb, u, foe, mode, { free: true });
  return p.ok ? { pct: p.pct, dmg: p.dmg?.total ?? 0 } : null;
}

/** Rules 1.56 L4: a variant's modifiers (data/variants.json), one line each, its kind's sentence (the field kinds' numbers
 * are already in the lines above: the variant's row carries them). */
const variantLines = (row: any): PreviewLine[] => ((row?.variant_lines || []) as any[]).map((l) => ({ key: 'variant:' + l.kind, label: l.name, value: l.text, num: null }));
/** Rules 1.66 item 5207: a number on a gear card as a player reads it: one decimal at most (the shop showed "Damage per
 *  hit 29.400000000000002"), through the one number formatter (datatext.ts fmtNumber); a text stays as it is. */
const shown = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? fmtNumber(Math.round(v * 10) / 10) : String(v ?? ''));
/** The numbers a card shows for `inst` in `c`'s hands (rules 1.42, spec item 14): for a weapon, to hit against the
 * reference foe of the character's level, damage per hit, the AP of each mode, magazine, range, traits; for a focus its
 * door and the door skill's modifier; for armour and shields what the character's Defense, armour and injury resistance
 * become; for ammunition and items their numbers in data. */
export function gearPreview(c: Character, inst: GearInstance): GearPreview {
  const id = inst.id, rarity: Rarity = inst.rarity || 'standard', w: any = WEAPON[id], it: any = ITEM[id];
  const base = { id, name: nameOf(id), rarity, text: String(w?.text || it?.text || '') };
  if (w && w.category === 'thrown') {
    return { ...base, kind: 'thrown', category: 'Thrown', traits: [...(w.properties || [])], lines: [
      ...(Number(w.damage) ? [{ key: 'damage', label: 'Damage', value: shown(w.damage), num: Number(w.damage), better: 'higher' as const }] : []),
      ...(typeof w.range_tiles === 'number' ? [{ key: 'range', label: 'Range', value: tilesN(w.range_tiles), num: w.range_tiles, better: 'higher' as const }] : []),
      ...(w.ap_cost?.single != null ? [{ key: 'ap', label: 'AP to throw', value: shown(w.ap_cost.single), num: Number(w.ap_cost.single), better: 'lower' as const }] : []),
      ...skillLines(c, scratch(c, inst, 1).u, w),
    ] };
  }
  if (w) {
    const melee = isMelee(w), range = melee ? 1 : Math.min(GP.range_tiles, effectiveRange(w));
    const { cb, u, foe } = scratch(c, inst, range);
    const lines: PreviewLine[] = [];
    const main = attackLines(cb, u, foe, melee ? 'melee' : 'shot');
    if (main) {
      lines.push({ key: 'hit', label: 'To hit (' + GP.name.toLowerCase() + ', level ' + c.level + ')', value: pct(main.pct), num: main.pct, better: 'higher' });
      lines.push({ key: 'dmg', label: 'Damage per hit', value: shown(main.dmg), num: main.dmg, better: 'higher' });
    }
    const apOf = (m: AttackMode, b: number) => priced({ cb, u }, 'attack', b, undefined, { mode: m, tgt: foe }).ap;
    if (melee) lines.push({ key: 'ap', label: 'AP a strike', value: shown(apOf('melee', attackApCost(w, 'melee'))), num: apOf('melee', attackApCost(w, 'melee')), better: 'lower' });
    else {
      const s = apOf('shot', attackApCost(w, 'shot'));
      lines.push({ key: 'ap', label: 'AP a shot', value: shown(s), num: s, better: 'lower' });
      if ((w.modes || []).includes('burst')) { const b = apOf('burst', volleyBaseAp(u, 'burst')); lines.push({ key: 'ap_burst', label: 'AP a Burst', value: shown(b), num: b, better: 'lower' }); }
      const mag = magazineSize(id, inst.mods);
      if (mag != null) lines.push({ key: 'mag', label: 'Magazine', value: mag + (CALIBRE_NAME[w.ammo] || w.ammo ? ' · ' + (CALIBRE_NAME[w.ammo] || w.ammo) : ''), num: mag, better: 'higher' });
      lines.push({ key: 'range', label: 'Range', value: tilesN(effectiveRange(w)), num: effectiveRange(w), better: 'higher' });
      // Recoil 2.0 (rules 1.56): what each earlier shot this turn costs to hit, with its mods (the one reading: gearNum)
      const kick = Math.max(0, gearNum(id, inst.mods, 'recoil'));
      lines.push({ key: 'recoil', label: 'Recoil a shot', value: kick ? '−' + kick : 'none', num: kick, better: 'lower' });
    }
    // rules 1.56: each fitted mod, by its own data text
    for (const m of inst.mods || []) { const mi: any = ITEM[m]; if (mi) lines.push({ key: 'mod:' + m, label: mi.name, value: shown(mi.text || ''), num: null }); }
    // rules 1.56 (the unarmed fighter): a carried modifier of the row (`variant_mods`) says its one card line (its `card.text`)
    for (const m of ((w as any)?.variant_mods || []) as string[]) { const mi: any = ITEM[m]; if (mi?.card?.text) lines.push({ key: 'carried:' + m, label: mi.name, value: shown(mi.card.text), num: null }); }
    lines.push(...variantLines(w));
    // rules 1.57 (A1): a shield's row gives what it holds (its own `effects`): the Defense with it in the off hand
    if (isShieldId(id)) { const x = clone(c); x.offHand = { id } as any; const su = unitFromCharacter(x, '0,0', rngFor('gear-preview', c.id + '#' + id)); lines.push({ key: 'def', label: 'Defense (held)', value: shown(su.def), num: su.def, better: 'higher' }); }
    { const full = maxDurOf(id, rarity); if (full) lines.push({ key: 'dur', label: 'Durability (full)', value: shown(full), num: full, better: 'higher' }); } // rules 1.50: the wear it holds at its grade
    lines.push(...skillLines(c, u, w));
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
      ...focusSkillLines(c, door),
      ...variantLines(it),
    ] };
  }
  if (it && it.category === 'armour') { // (rules 1.57: a shield is a weapon row, above)
    const x = clone(c), slot = String(it.slot || '');
    if (slot === 'off_hand') x.offHand = { id } as any; else if (slot) x.worn = { ...(x.worn || {}), [slot]: id };
    const rng = rngFor('gear-preview', c.id + '#' + id), u = unitFromCharacter(x, '0,0', rng);
    // 0.33 (outside playtest of 0.32.0: a Padded undershirt read "Armour 0 → 1", the character's total): the piece's own
    // part, what it adds over that slot empty (the same unit build, the slot cleared), signed; a compare reads the same
    const x0 = clone(c); if (slot === 'off_hand') x0.offHand = null as any; else if (slot) { const wn: any = { ...(x0.worn || {}) }; delete wn[slot]; x0.worn = wn; }
    const u0 = unitFromCharacter(x0, '0,0', rngFor('gear-preview', c.id + '#' + id));
    const own = (a: number, b: number) => Math.round(((a || 0) - (b || 0)) * 10) / 10, sgn = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + shown(Math.abs(n));
    const dDef = own(u.def, u0.def), dArm = own(u.armour, u0.armour), dInj = own(u.injResist || 0, u0.injResist || 0);
    return { ...base, kind: 'armour', category: cap(String(it.category)) + (slot ? ' · ' + slot.replace(/_/g, ' ') : ''), traits: [], lines: [
      { key: 'def', label: 'Defense', value: sgn(dDef), num: dDef, better: 'higher' },
      { key: 'armour', label: 'Armour', value: sgn(dArm), num: dArm, better: 'higher' },
      { key: 'injury', label: 'Injury resistance', value: sgn(dInj) + '%', num: dInj, better: 'higher' },
      { key: 'kg', label: 'Weight', value: (it.weight_kg ?? 0) + ' kg', num: it.weight_kg ?? 0, better: 'lower' },
      ...(maxDurOf(id, rarity) ? [{ key: 'dur', label: 'Durability (full)', value: shown(maxDurOf(id, rarity)), num: maxDurOf(id, rarity), better: 'higher' as const }] : []), // rules 1.50: a shield wears
    ] };
  }
  // rules 1.53: a quiver's grade gives arrows held and nothing else; it has one enchantment slot at every grade
  if (it?.category === 'quiver') {
    const n = quiverHolds(id, rarity), e = (inst.mods || []).map((m) => ITEM[m] as any).find((m) => m?.mod_slot === 'enchantment');
    return { ...base, kind: 'item', category: 'Quiver', traits: [], lines: [
      { key: 'arrows', label: 'Arrows held', value: shown(n), num: n, better: 'higher' },
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
  // rules 1.55: `mag:<weapon>:<rounds>` is a magazine holding that many (`:0` empty)
  const r0 = /^(rounds|mag):(.+)$/.exec(id), mr = r0?.[1] === 'mag' ? /^([^:]+)(?::(\d+))?$/.exec(r0[2]) : null;
  // rules 1.56 (L2): `rounds:<calibre>:<type>` is a special round of that calibre: its type's item names and tells it
  const rs = r0?.[1] === 'rounds' ? roundsIdOf(id) : null, sp: any = rs?.type ? SPECIAL_ROUND_ITEM[rs.type] : null;
  const r = r0 ? [r0[0], r0[1], mr ? mr[1] : rs ? rs.calibre : r0[2]] : null, mcap = r ? (WEAPON[r[2]] as any)?.magazine ?? 0 : 0, held = mr?.[2] != null ? Math.min(mcap, Number(mr[2])) : mcap;
  if (r || it?.category === 'ammo') {
    const cal = r?.[1] === 'rounds' ? r[2] : r ? (WEAPON[r[2]] as any)?.ammo : null;
    const users = cal ? Object.values(WEAPON).filter((x: any) => x.ammo === cal && !x.variant_of).map((x: any) => x.name) : [];
    return { ...base, name: r ? (r[1] === 'rounds' ? (specialRoundName(r[2], rs?.type) ?? (CALIBRE_NAME[r[2]] || r[2]) + ' rounds') : nameOf(r[2]) + ' magazine' + (held ? '' : ' (empty)')) : base.name, kind: 'ammo', category: 'Ammunition', traits: [],
      text: r ? (r[1] === 'mag' ? (held ? held === mcap ? 'A full magazine for the ' : 'A magazine of ' + held + ' rounds for the ' : 'An empty magazine for the ') + nameOf(r[2]) + (held ? '.' : ': fill it from loose rounds out of a fight.') : sp ? sp.text : 'Loose rounds.') : base.text,
      lines: [
        ...(r?.[1] === 'mag' ? [{ key: 'rounds', label: 'Rounds', value: shown(held), num: held }] : []),
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
  // rules 1.57 (A1): a shield against the shield held (the off hand's first), else nothing
  if (w && isShieldId(inst.id)) return c.offHand && isShieldId(c.offHand.id) ? { inst: { id: c.offHand.id, rarity: c.offHand.rarity, mods: c.offHand.mods }, slot: 'Off hand' }
    : isShieldId(c.weapon) ? { inst: { id: c.weapon, rarity: c.weaponState?.rarity, mods: c.weaponState?.mods }, slot: 'Main hand' } : null;
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
