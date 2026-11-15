// Which of the engine's gear preview lines a short card shows (rules 1.55, 1.56): its first `n` number lines, and always
// the lines that say how the weapon is aimed and fitted when the engine gave them: the two skill lines ("Hits with",
// "Damage: Strength · +N%" for a weapon, "Damage scales with" for a focus), the recoil a shot, each fitted mod (key `mod:<id>`) and a variant's modifiers (`variant:<kind>`). A choice of rows, no numbers.
export const SKILL_LINE_KEYS = ['hits_with', 'scales_with'];
/** The sheet's weapon line: the skill lines and the recoil (the fitted mods are named beside it from the weapon's own state). */
export const SHEET_LINE_KEYS = ['recoil', ...SKILL_LINE_KEYS];
const kept = (key: string): boolean => SKILL_LINE_KEYS.includes(key) || key === 'recoil' || key.startsWith('mod:') || key.startsWith('variant:'); // rules 1.56 L4: a variant's modifiers too
export const shownLines = <T extends { key: string }>(lines: T[], n: number): T[] =>
  [...lines.filter((l) => !kept(l.key)).slice(0, n), ...lines.filter((l) => kept(l.key))];
