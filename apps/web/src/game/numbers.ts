// Rules 1.36 (the level scale, docs/design/level-scale-spec.md section 5): HP and damage reach five digits at level 20
// (a Boss about 7,000 HP, a critical full Line several thousand). ONE formatter for every number a player reads in a
// fight: thousands separators in en-GB style (13,915), never abbreviated in the log or a readout; a number that floats
// over the map may shorten from 10,000 (13.9k). Bars are a fraction of max and need nothing.

/** A whole number with thousands separators: 1234 → "1,234". Not a number → as given. */
export function fmtNum(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? Number(n) : n;
  if (v == null || !Number.isFinite(v)) return String(n ?? '');
  return Math.round(v).toLocaleString('en-GB');
}
/** A number that floats over the map: separated under 10,000, shortened above it (13.9k, 125k). */
export function fmtFloat(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? Number(n) : n;
  if (v == null || !Number.isFinite(v)) return String(n ?? '');
  const a = Math.abs(v);
  if (a < 10000) return fmtNum(v);
  const k = a / 1000, s = (k < 100 ? (Math.floor(k * 10) / 10).toFixed(1).replace(/\.0$/, '') : String(Math.floor(k))) + 'k';
  return (v < 0 ? '-' : '') + s;
}
