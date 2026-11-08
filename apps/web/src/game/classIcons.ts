// Class emblems: one geometric line icon per class (13 base + 21 advanced), our own strokes in a 24 × 24 box with round
// caps, in the same hand as the Sigil glyphs (glyphs.ts) but never one of them. Each base emblem sits in a light frame
// by core (Body a square-ish shield, Mind a hexagon, Soul a circle); an advanced class gets a double frame of its first
// parent's shape and combines its parents' motifs. Colour is the core's family ink (CLAUDE.md, colour-system.md); an
// advanced class takes the core of its first parent.

export type CoreId = 'body' | 'mind' | 'soul';
export interface ClassIcon {
  /** Stroke paths (24 × 24, round caps and joins, no fill). */
  paths: string[];
  /** Frame shape by core. */
  frame: CoreId;
  /** Advanced classes: a double frame of the first parent's shape. */
  double?: boolean;
  /** Small filled accent dots, [x, y] (the only fill an emblem uses). */
  dots?: [number, number][];
}

/** Core family inks for core-level UI. */
export const CORE_INK: Record<CoreId, string> = { body: '#F2A54A', mind: '#4FC8DF', soul: '#AE9BFF' };
const NEUTRAL_INK = '#A3AEC2';

/** Base class cores (data/classes.json `core`): the 9 Revision 3 classes, then the Revision 2 ids that live on as move
 * origins and advanced classes' parents (medic, assassin, warden, scribe, hexer). */
const BASE_CORE: Record<string, CoreId> = {
  marksman: 'body', fighter: 'body', defender: 'body', medic: 'body', assassin: 'body',
  infiltrator: 'mind', mage: 'mind', warden: 'mind', scribe: 'mind', trickster: 'mind',
  channeler: 'soul', guardian: 'soul', bard: 'soul', hexer: 'soul',
};
/** Advanced classes' first parent (data/classes.json `parents[0]`): it sets the core and the frame. */
const FIRST_PARENT: Record<string, string> = {
  gunslinger: 'marksman', hellraiser_heavy: 'marksman', ccec_ballistician: 'marksman', banner_dancer: 'fighter',
  rtc_contractor: 'marksman', blade_scribe: 'fighter', siege_engineer: 'defender', spellslinger: 'marksman',
  storm_hand: 'fighter', adamantile_knight: 'defender', shade: 'assassin', lumeri_templar: 'defender',
  stroke_gambler: 'mage', devoted: 'channeler', circuit_mage: 'scribe', glyph_mason: 'mage', grand_sigilist: 'mage',
  heartfed: 'channeler', heartbinder: 'channeler', vessel: 'channeler', twinbound: 'channeler',
};

/** A class's core: its own for a base class, its first parent's for an advanced one; undefined if unknown. */
export function classCore(id: string): CoreId | undefined {
  return BASE_CORE[id] || BASE_CORE[FIRST_PARENT[id]];
}

// Shared motifs, so advanced emblems visibly carry their parents' marks.
const HEART = (cx: number, cy: number, s: number) => {
  // A heart of half-width s, its notch at (cx, cy - 0.15s), its point at (cx, cy + 1.25s).
  const r = s / 2, top = cy - 0.15 * s, y0 = top + r * 0.35;
  return `M${cx} ${cy + 1.25 * s} C${cx - s * 0.75} ${cy + 0.7 * s} ${cx - s} ${cy + 0.35 * s} ${cx - s} ${y0} A${r} ${r} 0 0 1 ${cx} ${top} A${r} ${r} 0 0 1 ${cx + s} ${y0} C${cx + s} ${cy + 0.35 * s} ${cx + s * 0.75} ${cy + 0.7 * s} ${cx} ${cy + 1.25 * s} Z`;
};
/** An Archimedean spiral around (cx, cy): radius a + b·θ for θ in 0 … turns·2π, ending pointing down. */
const SPIRAL = (cx: number, cy: number, a: number, b: number, turns: number) => {
  const n = Math.round(turns * 24), end = turns * 2 * Math.PI, pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (end * i) / n, r = a + b * t, ang = Math.PI / 2 - (end - t);
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}`;
};
const CIRCLE = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy}`;

export const CLASS_ICON_PATHS: Record<string, ClassIcon> = {
  // ── Body ────────────────────────────────────────────────────────────────────────────────────────────────────
  // Marksman: a scope reticle, ticks pointing in to the aim.
  marksman: { frame: 'body', paths: [CIRCLE(12, 11.5, 5), 'M12 5 V8.5 M12 14.5 V18 M5.5 11.5 H9 M15 11.5 H18.5'], dots: [[12, 11.5]] },
  // Fighter: two crossed blades with guards and pommels.
  fighter: { frame: 'body', paths: ['M6.6 5.4 L14.2 13 M17.4 5.4 L9.8 13', 'M12.6 14.6 L15.8 11.4 M11.4 14.6 L8.2 11.4', 'M14.2 13 L15.8 14.6 M9.8 13 L8.2 14.6'], dots: [[16.6, 15.4], [7.4, 15.4]] },
  // Defender: a tower shield with a band and a boss.
  defender: { frame: 'body', paths: ['M8.5 5.5 H15.5 V14 C15.5 16 14 17.4 12 18.4 C10 17.4 8.5 16 8.5 14 Z', 'M12 5.5 V18.4 M8.5 10 H15.5'] },
  // Medic: a plain plus, drawn as an outline.
  medic: { frame: 'body', paths: ['M10.2 6 H13.8 V9.7 H17.5 V13.3 H13.8 V17 H10.2 V13.3 H6.5 V9.7 H10.2 Z'] },
  // Assassin: a dagger point down, its guard a closed eye.
  assassin: { frame: 'body', paths: ['M12 5.6 V8.6', 'M7.4 8.6 Q12 12.6 16.6 8.6', 'M8.6 10.2 L7.8 11.4 M15.4 10.2 L16.2 11.4', 'M10.7 10.6 L12 18 L13.3 10.6'], dots: [[12, 4.8]] },

  // ── Mind ────────────────────────────────────────────────────────────────────────────────────────────────────
  // Infiltrator (Revision 3, Perception): the Assassin's dagger-and-eye for now, in the Mind frame (its own emblem to come).
  infiltrator: { frame: 'mind', paths: ['M12 5.6 V8.6', 'M7.4 8.6 Q12 12.6 16.6 8.6', 'M8.6 10.2 L7.8 11.4 M15.4 10.2 L16.2 11.4', 'M10.7 10.6 L12 18 L13.3 10.6'], dots: [[12, 4.8]] },
  // Mage: an open Sigil square firing a stroke out of it.
  mage: { frame: 'mind', paths: ['M7.5 10.5 V16.5 H13.5', 'M10.5 13.5 L16.5 7.5 M12.5 7.5 H16.5 V11.5'] },
  // Warden: a crenellated watchtower with a gate.
  warden: { frame: 'mind', paths: ['M8 17.5 V7 H10 V8.7 H11.2 V7 H12.8 V8.7 H14 V7 H16 V17.5 Z', 'M10.5 17.5 V14.5 A1.5 1.5 0 0 1 13.5 14.5 V17.5'] },
  // Scribe: a pen nib over a written line.
  scribe: { frame: 'mind', paths: ['M9.5 5.8 H14.5 V9 L12 15 L9.5 9 Z', 'M12 15 V11.5', 'M8 17.8 H16'], dots: [[12, 10.4]] },
  // Trickster: a half-mask with slanted eye slits.
  trickster: { frame: 'mind', paths: ['M6.5 9.5 Q12 8 17.5 9.5 Q17.6 15.2 14.6 15.2 Q12.6 15.2 12 13.3 Q11.4 15.2 9.4 15.2 Q6.4 15.2 6.5 9.5 Z', 'M8.4 11.2 L10.4 11.8 M15.6 11.2 L13.6 11.8'] },

  // ── Soul ────────────────────────────────────────────────────────────────────────────────────────────────────
  // Channeler: a storm spiral rising out of a heart.
  channeler: { frame: 'soul', paths: [HEART(12, 14.6, 2.9), SPIRAL(12, 8.8, 0.3, 0.38, 1.75)] },
  // Guardian: a dome over a kept point.
  guardian: { frame: 'soul', paths: ['M6.3 15.5 A5.7 5.7 0 0 1 17.7 15.5', 'M9.2 15.5 A2.8 2.8 0 0 1 14.8 15.5', 'M5.5 15.5 H18.5'] },
  // Bard: a lyre with curled horns, three strings.
  bard: { frame: 'soul', paths: ['M9.6 17 C7.2 14.6 7 10 8.6 7.4 C9.1 6.6 8.9 5.8 8.1 5.5 M14.4 17 C16.8 14.6 17 10 15.4 7.4 C14.9 6.6 15.1 5.8 15.9 5.5', 'M8.2 9 H15.8 M9.6 17 H14.4', 'M10.8 9 V17 M13.2 9 V17'] },
  // Hexer: an eye in an inverted triangle, cracked from the point.
  hexer: { frame: 'soul', paths: ['M6 7.2 H18 L12 17.8 Z', 'M8.9 9.8 Q12 7.2 15.1 9.8 Q12 12.4 8.9 9.8 Z', 'M12 17.8 L12.9 15.6 L11.3 14.2 L12.2 12.2'], dots: [[12, 9.8]] },

  // ── Advanced ────────────────────────────────────────────────────────────────────────────────────────────────
  // Gunslinger (Marksman · Fighter): a pistol with a blade for a barrel.
  gunslinger: { frame: 'body', double: true, paths: ['M6.6 8.4 H14.2 V11 H11 L10.2 15.6 H7.6 L8.4 11 H6.6 Z', 'M14.2 8.8 L18.4 9.7 L14.2 10.6', 'M9.4 11 Q10 12.6 11 12.2'] },
  // Hellraiser Heavy (Marksman · Defender): a gun shield, its barrel spraying rounds both ways.
  hellraiser_heavy: { frame: 'body', double: true, paths: ['M6.8 8.6 H13.4 V13 C13.4 15 12 16.4 10.1 17.4 C8.2 16.4 6.8 15 6.8 13 Z', 'M10.1 11.8 H18'], dots: [[15, 9.4], [17, 9.4], [15, 14.2], [17, 14.2]] },
  // CCEC Ballistician (Marksman · Assassin): a dotted ballistic arc ending in a reticle: one shot.
  ccec_ballistician: { frame: 'body', double: true, paths: [CIRCLE(14.2, 11.4, 3), 'M14.2 6.6 V7.8 M14.2 15 V16.2 M18.4 11.4 H17.6', 'M7 9.6 Q9 8.4 11.2 11.4'], dots: [[14.2, 11.4], [6.6, 13.6], [6.4, 11.4]] },
  // Banner Dancer (Fighter · Medic): a blade-staff flying a banner with a plus.
  banner_dancer: { frame: 'body', double: true, paths: ['M8.5 5.2 V18', 'M8.5 6.5 H16.5 L14.8 9.2 L16.5 11.9 H8.5', 'M12.2 7.9 V10.5 M10.9 9.2 H13.5'] },
  // RTC Contractor (Marksman · Medic): a supply drop, crate under a canopy.
  rtc_contractor: { frame: 'body', double: true, paths: ['M6.8 10 A5.2 4.4 0 0 1 17.2 10 Q14.6 8.9 12 10 Q9.4 8.9 6.8 10 Z', 'M7 10 L10.4 13.8 M17 10 L13.6 13.8 M12 10 V13.8', 'M10 13.8 H14 V17.4 H10 Z M12 14.8 V16.4 M11.2 15.6 H12.8'] },
  // Blade Scribe (Fighter · Mage): a sword drawing a Sigil square behind it.
  blade_scribe: { frame: 'body', double: true, paths: ['M12 5.6 L16.4 10 L12 14.4 L7.6 10 Z', 'M12 4.8 V14.8 M9.6 14.8 H14.4 M12 14.8 V17.6'] },
  // Siege Engineer (Defender · Warden): a turret on a brick wall.
  siege_engineer: { frame: 'body', double: true, paths: ['M7 12 H17 V17 H7 Z M7 14.5 H17 M12 12 V14.5 M9.5 14.5 V17 M14.5 14.5 V17', 'M9.6 12 A2.4 2.4 0 0 1 14.4 12', 'M13.2 10.2 L16.6 7.2'] },
  // Spellslinger (Marksman · Scribe): a round with a Sigil inscribed on its case.
  spellslinger: { frame: 'body', double: true, paths: ['M10 9 Q12 3.8 14 9 V16.4 H10 Z M9.3 16.4 H14.7 M10 9 H14', 'M11.1 11 H12.9 M12 11 V14.2 M11.1 14.2 H12.9'] },
  // Storm Hand (Fighter · Channeler): a sword with the storm spiral at its point.
  storm_hand: { frame: 'body', double: true, paths: ['M8 16.4 L17 7.4 M8.6 13.4 L11 15.8 M8 16.4 L6.8 17.6', SPIRAL(9.6, 8.6, 0.3, 0.42, 1.7)] },
  // Adamantile Knight (Defender · Guardian): a domed great helm with a visor slit.
  adamantile_knight: { frame: 'body', double: true, paths: ['M7.8 17.2 V11 A4.2 4.2 0 0 1 16.2 11 V17.2 Z', 'M9.2 11.8 H14.8', 'M12 13.8 V17.2 M7.8 15 H9.4 M14.6 15 H16.2'] },
  // Shade (Assassin · Hexer): a pointed hood, two eyes in the dark.
  shade: { frame: 'body', double: true, paths: ['M6.8 17.6 C7.2 11 8.6 6.6 12 4.8 C15.4 6.6 16.8 11 17.2 17.6', 'M9.4 14.6 C9.4 11.6 10.6 9.8 12 9.8 C13.4 9.8 14.6 11.6 14.6 14.6 C13.6 15.6 10.4 15.6 9.4 14.6 Z'], dots: [[10.9, 12.4], [13.1, 12.4]] },
  // Lumeri Templar (Defender · Bard): a shield under a patron's rays.
  lumeri_templar: { frame: 'body', double: true, paths: ['M8.8 9.4 H15.2 V13.8 C15.2 15.6 13.8 16.8 12 17.6 C10.2 16.8 8.8 15.6 8.8 13.8 Z', 'M12 9.4 V17.6', 'M12 4.8 V7 M8.2 5.8 L9.3 7.4 M15.8 5.8 L14.7 7.4'] },
  // Stroke Gambler (Mage · Trickster): a die made of two half-sigils.
  stroke_gambler: { frame: 'mind', double: true, paths: ['M7.5 11.5 V7.5 H11.5', 'M16.5 12.5 V16.5 H12.5', 'M14 7.5 H16.5 V10 M10 16.5 H7.5 V14'], dots: [[10, 10], [12, 12], [14, 14]] },
  // Devoted (Channeler · Bard): a loved heart, raised and shining.
  devoted: { frame: 'soul', double: true, paths: [HEART(12, 11.8, 3.6), 'M12 5 V6.8 M8.3 5.8 L9.2 7.3 M15.7 5.8 L14.8 7.3'] },
  // Circuit Mage (Scribe · Bard): a mana core crystal wired into a circuit.
  circuit_mage: { frame: 'mind', double: true, paths: ['M12 8.4 L14.6 12 L12 15.6 L9.4 12 Z', 'M14.6 12 H16.8 M9.4 12 H7.2 M12 8.4 V6.8 M12 15.6 V17.2', 'M12 8.4 L12 15.6'], dots: [[17.2, 12], [6.8, 12], [12, 6.4], [12, 17.6]] },
  // Glyph Mason (Mage · Warden): a keystone carved with a lasting glyph.
  glyph_mason: { frame: 'mind', double: true, paths: ['M6.6 6.8 H17.4 L14.4 17 H9.6 Z', 'M12 9.4 L14 11.4 L12 13.4 L10 11.4 Z'], dots: [[12, 15]] },
  // Grand Sigilist (Mage · Defender): a planted staff crowned with a great Sigil.
  grand_sigilist: { frame: 'mind', double: true, paths: ['M12 5.2 L15.4 8.6 L12 12 L8.6 8.6 Z', 'M12 12 V17.4 M9.8 17.4 H14.2'], dots: [[12, 8.6]] },
  // Heartfed (Channeler · Hexer): a cracked heart inside four gauge arcs.
  heartfed: { frame: 'soul', double: true, paths: [HEART(12, 11.3, 2.6), 'M12 11 L12.9 12.4 L11.3 13.4 L12 14.4', 'M7.9 7.9 A5.8 5.8 0 0 1 10.6 6.4 M13.4 6.4 A5.8 5.8 0 0 1 16.1 7.9 M17.6 10.6 A5.8 5.8 0 0 1 17.6 13.4 M6.4 13.4 A5.8 5.8 0 0 1 6.4 10.6'] },
  // Heartbinder (Channeler · Medic): a heart carrying the medic's plus.
  heartbinder: { frame: 'soul', double: true, paths: [HEART(12, 9.4, 4.2), 'M12 10.2 V13.4 M10.4 11.8 H13.6'] },
  // Vessel (Channeler · Defender): an urn charged to the brim.
  vessel: { frame: 'soul', double: true, paths: ['M9.6 5.8 H14.4 M10.4 5.8 V7.8 C7 9 6.8 15.4 9.4 17.4 H14.6 C17.2 15.4 17 9 13.6 7.8 V5.8', 'M8.2 12 H15.8'], dots: [[12, 14.6]] },
  // Twinbound (Channeler · Trickster): a soul with its twin standing behind it.
  twinbound: { frame: 'soul', double: true, paths: [CIRCLE(10.2, 13.4, 3.6), 'M10.2 9.8 A3.6 3.6 0 1 1 13.8 13.4'], dots: [[10.2, 13.4], [14.6, 9.4]] },
};

/** Frame outlines by core: outer single frame, and the inner ring a double frame adds. */
const hex = (r: number) => {
  const p = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${p.join(' L')} Z`;
};
const shield = (inset: number) => {
  const l = 3.5 + inset, rt = 20.5 - inset, t = 2.5 + inset, b = 21.8 - inset * 1.2;
  return `M${l} ${t} H${rt} V11.5 C${rt} ${16.6 - inset * 0.6} ${16.8 - inset * 0.4} ${19.8 - inset} 12 ${b} C${7.2 + inset * 0.4} ${19.8 - inset} ${l} ${16.6 - inset * 0.6} ${l} 11.5 Z`;
};
const FRAMES: Record<CoreId, { single: string; outer: string; inner: string }> = {
  body: { single: shield(0), outer: shield(-0.6), inner: shield(1.2) },
  mind: { single: hex(10.2), outer: hex(11), inner: hex(9.2) },
  soul: { single: CIRCLE(12, 12, 10), outer: CIRCLE(12, 12, 10.8), inner: CIRCLE(12, 12, 9.2) },
};
/** Unknown ids: a plain diamond with a dot, no core frame. */
const FALLBACK: ClassIcon = { frame: 'body', paths: ['M12 6 L18 12 L12 18 L6 12 Z'], dots: [[12, 12]] };

/** An SVG string for a class's emblem. Colour defaults to its core's ink (neutral grey if unknown). */
export function classIconSvg(id: string, color?: string, size = 24): string {
  const icon = CLASS_ICON_PATHS[id];
  const core = classCore(id);
  const ink = color || (core ? CORE_INK[core] : NEUTRAL_INK);
  const ic = icon || FALLBACK;
  const fr = FRAMES[ic.frame];
  const frame = !icon ? '' : ic.double
    ? `<path d="${fr.outer}" stroke-width="0.9" stroke-opacity="0.5"/><path d="${fr.inner}" stroke-width="0.9" stroke-opacity="0.5"/>`
    : `<path d="${fr.single}" stroke-width="1" stroke-opacity="0.5"/>`;
  const dots = (ic.dots || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${ink}" stroke="none"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${frame}${ic.paths.map((d) => `<path d="${d}"/>`).join('')}${dots}</svg>`;
}
/** The same emblem as a data URI, for <img src> in templates. */
export const classIconUri = (id: string, color?: string) => 'data:image/svg+xml,' + encodeURIComponent(classIconSvg(id, color));
