// The run's icon sizes in one table (rules 1.54 item 11, survival-spec 14.1 R5 and 14.7: "icons larger"; Leon, 14 Nov
// 2026). CSS pixels. A path-map marker's glyph is 0.6 of its marker (the Boss's 0.62), never under 32 px; a label 12 px.
// Every run screen reads its sizes here: a size typed beside a component is a defect, as a number in a rule is.
export const ICON = {
  /** the path map's markers, by kind (were 36 / 42 / 40 / 50 / 64 / 44: fight and the like / a fork / the vault's spur /
   * the gate / the Boss / the camp) */
  marker: { stop: 48, fork: 52, spur: 48, gate: 60, boss: 76, camp: 52 },
  /** a marker's glyph as a share of the marker, and its floor */
  glyphShare: 0.6, bossGlyphShare: 0.62, glyphMin: 32,
  /** the camp's glyph on the path map */
  campGlyph: 32,
  /** the words under the markers (were 10; the Boss's 12) */
  label: 12, bossLabel: 13,
  /** the legend's glyphs (not named by R5: unchanged) */
  legend: 16,
  /** the reward card's weapon icon (was 52) */
  reward: 72,
  /** a held boon's icon in the run board */
  boonHeld: 24,
  /** the Boss's glyph on the right panel's small map */
  miniGlyph: 14,
} as const;
/** A marker's size by what it is (the vault's fork is a fork). */
export const markerSize = (n: { kind: string; gate?: boolean; junction?: boolean; spur?: string | null }): number =>
  n.kind === 'boss' ? ICON.marker.boss : n.gate ? ICON.marker.gate : n.junction ? ICON.marker.fork : n.spur ? ICON.marker.spur : ICON.marker.stop;
/** Its glyph: the share of the marker, never under the floor. */
export const glyphSize = (n: { kind: string }, marker: number): number => Math.max(ICON.glyphMin, Math.round(marker * (n.kind === 'boss' ? ICON.bossGlyphShare : ICON.glyphShare)));
