// Which of the engine's gear preview lines a short card shows (rules 1.55): its first `n` number lines, and always the
// two skill lines ("Hits with", "Damage scales with") when the engine gave them. A choice of rows, no numbers.
export const SKILL_LINE_KEYS = ['hits_with', 'scales_with'];
export const shownLines = <T extends { key: string }>(lines: T[], n: number): T[] =>
  [...lines.filter((l) => !SKILL_LINE_KEYS.includes(l.key)).slice(0, n), ...lines.filter((l) => SKILL_LINE_KEYS.includes(l.key))];
