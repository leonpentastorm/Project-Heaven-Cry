// An Outburst's strength in player words (no multipliers in player text, 0.32 fix pass B6): a stage multiplier as a
// percent of a plain hit ("132%"), a step as percent points ("+30%"). The one reader every Outburst line uses.
export const powerPct = (m: number): string => Math.round(m * 100) + '%';
export const powerStep = (s: number): string => (s >= 0 ? '+' : '−') + Math.abs(Math.round(s * 100)) + '%';
