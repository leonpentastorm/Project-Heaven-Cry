// Outburst 4.0 (rules 1.8) icons, drawn in code until there is painted art (docs/design/outburst-4.0-spec.md section 11
// item 4; the ideas are docs/design/handoffs/outburst-4.0-art-brief.md):
//   - 25 feeling glyphs: flowing, tapered brush ribbons, each with a small solid heart-knot somewhere (the family mark);
//   - 40 module icons (the 39 of data/soul_modules.json and `bolt`, the default shape): clean diagram lines, arrows,
//     rings and dots, one even stroke, so the two families never look alike;
//   - 3 UI marks: Revert pump, Practice, and the "You have felt X" card.
// All on a 24 × 24 box, white `currentColor` ink, no text, no colour (the game tints them).
//
// Painted art wins with no code change: drop art/icons/feelings/feeling-<id>.png or art/icons/modules/module-<id>.png
// (or ui-<mark>.png in either folder) and run `npm run assets`; tools/build_web_assets.py writes them to assets.json as
// feeling-<id>, module-<id> and heart-ui-<mark>, and the resolvers below return an <img> of it instead of the SVG.
import ASSETS from './assets.json';

type P = [number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: P) => `${r2(p[0])} ${r2(p[1])}`;

// ---------- drawing helpers ----------
// A path string may start with flags: `*` filled (solid ink), `~` a thin stroke, `=` dashed, `!` faint (the "double").
/** A circle path. */
const c = (x: number, y: number, r: number) => `M${r2(x - r)} ${r2(y)} a${r} ${r} 0 1 0 ${r2(2 * r)} 0 a${r} ${r} 0 1 0 ${r2(-2 * r)} 0`;
/** A solid dot. */
const dot = (x: number, y: number, r = 1.5) => '*' + c(x, y, r);
/** An arc of a circle from angle a0 to a1 (degrees, 0 = right, clockwise on screen). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number): P => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  return `M${pt(p(a0))} A${r} ${r} 0 ${large} ${sweep} ${pt(p(a1))}`;
}
/** An open arrowhead at tip (x, y) pointing along angle a (degrees). */
function head(x: number, y: number, a: number, len = 3.4, spread = 38): string {
  const b = (d: number): P => [x - len * Math.cos(((a + d) * Math.PI) / 180), y - len * Math.sin(((a + d) * Math.PI) / 180)];
  return `M${pt(b(-spread))} L${r2(x)} ${r2(y)} L${pt(b(spread))}`;
}
/** A straight arrow from a to b with its head at b. */
const arrow = (a: P, b: P, len = 3.4) => `M${pt(a)} L${pt(b)} ` + head(b[0], b[1], (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, len);
/** The heart-knot: a small solid heart centred on (x, y), half-width s, turned by rot degrees. */
function knot(x: number, y: number, s = 2.3, rot = 0): string {
  const k = (rot * Math.PI) / 180, co = Math.cos(k), si = Math.sin(k);
  const q = (dx: number, dy: number) => pt([x + (dx * co - dy * si) * s, y + (dx * si + dy * co) * s]);
  return `*M${q(0, 0.95)} C${q(-0.2, 0.6)} ${q(-1, 0.15)} ${q(-1, -0.35)} C${q(-1, -0.95)} ${q(-0.15, -1.05)} ${q(0, -0.5)} C${q(0.15, -1.05)} ${q(1, -0.95)} ${q(1, -0.35)} C${q(1, 0.15)} ${q(0.2, 0.6)} ${q(0, 0.95)} Z`;
}
/** A heart outline (for module and UI marks: the line family). */
function heartLine(x: number, y: number, s: number): string {
  return knot(x, y, s).slice(1);
}
/** A four-point spark, solid. */
function spark(x: number, y: number, r = 2.6): string {
  const i = r * 0.26;
  return `*M${r2(x)} ${r2(y - r)} L${r2(x + i)} ${r2(y - i)} L${r2(x + r)} ${r2(y)} L${r2(x + i)} ${r2(y + i)} L${r2(x)} ${r2(y + r)} L${r2(x - i)} ${r2(y + i)} L${r2(x - r)} ${r2(y)} L${r2(x - i)} ${r2(y - i)} Z`;
}
/** A drop, solid: its round end centred on (x, y), radius s, the tip pointing at angle a (degrees; -90 = up). */
function drop(x: number, y: number, s = 1.3, a = -90): string {
  const k = ((a + 90) * Math.PI) / 180, co = Math.cos(k), si = Math.sin(k);
  const q = (dx: number, dy: number) => pt([x + (dx * co - dy * si) * s, y + (dx * si + dy * co) * s]);
  return `*M${q(0, -2)} C${q(0.45, -1.2)} ${q(1, -0.6)} ${q(1, 0)} C${q(1, 0.6)} ${q(0.55, 1)} ${q(0, 1)} C${q(-0.55, 1)} ${q(-1, 0.6)} ${q(-1, 0)} C${q(-1, -0.6)} ${q(-0.45, -1.2)} ${q(0, -2)} Z`;
}

/** Points along a Catmull-Rom curve through pts (or the polyline itself when sharp), with each sample's width. */
function sample(pts: P[], w: number[], sharp: boolean, per = 12): { p: P[]; w: number[] } {
  const out: P[] = [], ow: number[] = [];
  if (sharp) {
    pts.forEach((p, i) => { out.push(p); ow.push(w[i]); });
    return { p: out, w: ow };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      const e = t * t * (3 - 2 * t); // ease the width between control points
      ow.push(w[i] + (w[i + 1] - w[i]) * e);
    }
  }
  out.push(pts[pts.length - 1]); ow.push(w[w.length - 1]);
  return { p: out, w: ow };
}
/** Ribbon width scale (so the brush reads at 40 px). */
const RW = 1.2;
/** A tapered brush ribbon along pts, its width w at each point (a filled outline). */
function ribbon(pts: P[], w: number[], sharp = false): string {
  const { p, w: ws } = sample(pts, w.map((x) => x * RW), sharp);
  const L: P[] = [], R: P[] = [];
  const nrm = (a: P, b: P): P => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  for (let i = 0; i < p.length; i++) {
    let n: P, m = 1;
    if (i === 0) n = nrm(p[0], p[1]);
    else if (i === p.length - 1) n = nrm(p[i - 1], p[i]);
    else {
      const n1 = nrm(p[i - 1], p[i]), n2 = nrm(p[i], p[i + 1]);
      const sx = n1[0] + n2[0], sy = n1[1] + n2[1], l = Math.hypot(sx, sy) || 1;
      n = [sx / l, sy / l]; m = Math.min(2.2, 1 / Math.max(0.3, n[0] * n1[0] + n[1] * n1[1])); // a miter at sharp corners
    }
    const h = (ws[i] / 2) * m;
    L.push([p[i][0] + n[0] * h, p[i][1] + n[1] * h]); R.push([p[i][0] - n[0] * h, p[i][1] - n[1] * h]);
  }
  return '*M' + L.map(pt).join(' L') + ' L' + R.reverse().map(pt).join(' L') + ' Z';
}
/** A spiral ribbon round (cx, cy): radius r0 to r1 over turns, starting at angle a0 (degrees), thin to thick. */
function spiralRibbon(cx: number, cy: number, r0: number, r1: number, turns: number, a0: number, w0: number, w1: number, n = 18): string {
  const pts: P[] = [], w: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = ((a0 + 360 * turns * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); w.push(w0 + (w1 - w0) * Math.sin((Math.PI / 2) * Math.min(1, t * 1.3)));
  }
  return ribbon(pts, w);
}
/** A tapered ribbon along an arc (degrees), thick in the middle. */
function arcRibbon(cx: number, cy: number, r: number, a0: number, a1: number, wmax = 2.2, n = 5): string {
  const pts: P[] = [], w: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180, t = i / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); w.push(0.35 + (wmax - 0.35) * Math.sin(Math.PI * t));
  }
  return ribbon(pts, w);
}

// ---------- the 25 feelings (brush ribbons + a heart-knot) ----------
export const FEELING_PATHS: Record<string, string[]> = {
  // a ribbon snapping upward into a jagged crest
  rage: [ribbon([[6.4, 17.2], [7.6, 15.4], [8.5, 12.5], [10.5, 4.5], [12.6, 11], [15.6, 3], [17.2, 10.5], [21, 5.5]], [1, 1.9, 2.8, 0.35, 2.4, 0.35, 2, 0.3], true), knot(4.4, 20, 2.5, -20)],
  // the knot weeping: a ribbon falling into drops that pool at the bottom
  grief: [knot(12, 4.2, 2.4, 8), ribbon([[12.2, 7.2], [11.4, 10.4], [12, 13.4]], [0.2, 1.2, 1.8]), drop(12, 14.8, 1.6), drop(6.6, 12, 1.3), drop(17.4, 12, 1.3), '~M3.5 20.4 Q12 23.6 20.5 20.4', '~M7.6 18.8 Q12 20 16.4 18.8'],
  // a ribbon recoiling outward from the centre in broken rings
  fear: [knot(12, 12.3, 2.3), arcRibbon(12, 12, 6, -150, -80, 2.2), arcRibbon(12, 12, 6, -30, 40, 2.2), arcRibbon(12, 12, 6, 90, 160, 2.2), arcRibbon(12, 12, 9.8, -110, -50, 1.8), arcRibbon(12, 12, 9.8, 10, 70, 1.8), arcRibbon(12, 12, 9.8, 130, 190, 1.8)],
  // two ribbons wrapping in from either side round one knot
  love: [spiralRibbon(12, 12.4, 9.6, 5.6, 0.44, 150, 0.3, 2.6), spiralRibbon(12, 12.4, 9.6, 5.6, 0.44, 330, 0.3, 2.6), knot(12, 12.6, 3.2)],
  // a ribbon leaping in an arc, a spark at its peak
  joy: [knot(4.6, 19.2, 2.2, -25), ribbon([[6.3, 17], [9.5, 10.5], [13.5, 8.6], [17.5, 11.5], [20.5, 18]], [1.2, 2.4, 2.6, 1.8, 0.3]), spark(12.8, 3.6, 2.8)],
  // one long level stroke over still circles
  calm: [ribbon([[2, 7.4], [8, 6.8], [16, 7.2], [22, 6.8]], [0.3, 2.2, 2.2, 0.3]), knot(12, 16.6, 1.9), '~' + 'M6 16.8 A6 2.6 0 0 0 18 16.8', '~' + 'M2.5 17.2 A9.5 4.2 0 0 0 21.5 17.2', '~M6 16.8 A6 2.6 0 0 1 9 14.7 M15 14.7 A6 2.6 0 0 1 18 16.8'],
  // a hooked ribbon turning back on itself like a barb
  spite: [knot(4.6, 18, 2.3, -20), ribbon([[6.8, 16.4], [12, 13.6], [16.4, 9.8], [21, 4], [16.2, 5.6], [12.2, 5.6]], [1.4, 2.2, 2.6, 0.5, 1.5, 0.2], true)],
  // a ribbon folding inward, its end tucked behind a lowered knot
  shame: [ribbon([[5.4, 22], [5.6, 14], [8.6, 7], [14, 4.4], [18.4, 7.4], [18.8, 12]], [0.3, 2, 2.6, 2.6, 2, 1.2]), knot(18.4, 15, 2.4, 185)],
  // a ribbon rising into a tall straight spire
  pride: [ribbon([[3, 22], [8, 20.6], [11.2, 15], [12, 9]], [0.3, 1.6, 2.2, 1.6]), ribbon([[21, 22], [16, 20.6], [12.8, 15], [12, 9]], [0.3, 1.6, 2.2, 1.6]), knot(12, 5.4, 2.8)],
  // a ribbon unravelling downward into loose threads
  despair: [knot(12, 3.8, 2.3), ribbon([[12, 6], [10.2, 9.6], [13.4, 12.6], [12, 15.4]], [2.4, 2.6, 2.2, 1.2]), '~M12 15.2 Q8.5 17.5 7.5 21.5', '~M12 15.2 Q12.6 18.5 11.6 22', '~M12 15.2 Q15.5 17 17 20.5'],
  // a small flame-shaped ribbon rising from a low line
  hope: [ribbon([[12.2, 13.8], [10.4, 10.4], [13.4, 7.4], [11.6, 4], [12.8, 1.8]], [3, 2.8, 2, 0.9, 0.2]), knot(12, 16, 2.4), 'M3.5 20.5 H20.5'],
  // an open cupped curve, lowered, the knot resting in it
  mercy: [ribbon([[3.5, 10], [6.5, 17], [12, 19.6], [17.5, 17], [20.5, 10]], [0.3, 1.9, 2.6, 1.9, 0.3]), knot(12, 13.4, 2.4)],
  // a ribbon tightening into a thorned loop around the knot
  cruelty: [ribbon([[3.5, 21.5], [9, 16.5], [6.3, 9.5], [12, 4.4], [17.7, 9.5], [15, 16.5], [20.5, 21.5]], [0.3, 1.8, 2.4, 2.6, 2.4, 1.8, 0.3]), '*M5.4 6.2 L8 7.6 L6.6 9.3 Z', '*M12 1.2 L13.2 4 L10.8 4 Z', '*M18.6 6.2 L17.4 9.3 L16 7.6 Z', '*M3.6 12.6 L6.5 12 L6.3 14.2 Z', '*M20.4 12.6 L17.7 14.2 L17.5 12 Z', knot(12, 11, 1.8)],
  // one small knot far from a wide empty ring
  loneliness: ['=' + c(15, 9, 6.3), knot(4.8, 19.4, 1.9, -15), ribbon([[6.6, 18], [8.6, 16.6], [10, 16.6]], [1.4, 0.9, 0.2])],
  // several small knots joined on one line
  belonging: [ribbon([[1.8, 16.5], [7, 18], [12, 16.6], [17, 18], [22.2, 16.5]], [0.3, 2, 2.2, 2, 0.3]), knot(5.5, 12.4, 2), knot(12, 11.6, 2.1), knot(18.5, 12.4, 2)],
  // a ribbon coiling round an empty eye-shaped gap
  dread: [ribbon([[2, 13], [7, 7.2], [13, 5.6], [19.5, 8.4], [22, 12.6]], [0.3, 2, 2.6, 2, 0.6]), ribbon([[22, 12.6], [17, 17.6], [11, 18.6], [6.5, 16.4], [5.8, 13.6]], [0.6, 2, 2.4, 1.6, 0.3]), knot(4.4, 20.4, 1.8, 20)],
  // rays opening above a small bowed curve
  awe: [knot(12, 19.6, 2), ribbon([[5, 21.4], [8.4, 16.6], [12, 15.4], [15.6, 16.6], [19, 21.4]], [0.3, 1.9, 2.3, 1.9, 0.3]), '~M12 11.4 V2.6', '~M7.6 12.4 L4.4 6.4', '~M16.4 12.4 L19.6 6.4', '~M3.8 14.6 L1.6 12.6', '~M20.2 14.6 L22.4 12.6'],
  // a ribbon reaching toward a distant dot, not touching
  longing: [knot(4.6, 19, 2.2, -30), ribbon([[6.4, 16.6], [8.6, 12.4], [12.4, 10.6], [16.4, 8.8]], [1.4, 2.5, 2, 0.2]), dot(20.4, 4.6, 1.5)],
  // a knot coming loose into a soft exhale
  relief: [knot(5.4, 12, 2.4, -90), ribbon([[7.6, 12], [11, 10.4], [14.4, 12], [17.6, 10.6]], [1.8, 2.2, 1.4, 0.3]), '~M16 13.6 Q18.5 15 21.5 13.6', '~M15.4 8.2 Q18.4 6.8 21.6 8.4', '~M13 16.4 Q16 18.6 19.5 17.6'],
  // a ribbon turned away, chin lifted, from a small dot
  contempt: [knot(4.8, 7.6, 2.3, -10), ribbon([[7.2, 7], [12, 8.2], [16.8, 6.6], [21.6, 2.4]], [1.6, 2.6, 1.8, 0.2]), dot(15.6, 18.6, 1.5), '~M11.6 21.4 H19.6'],
  // a ribbon dragging a small weight
  guilt: [knot(4.8, 5, 2.4, -15), ribbon([[7, 5.4], [11.6, 7.6], [15.2, 11], [16.2, 14]], [1.8, 2.6, 2, 0.4]), '~M16.2 14 V16.2', '*M13.6 16.2 H18.8 L19.8 21.6 H12.6 Z'],
  // two ribbons, one curling to snatch the other's spark
  jealousy: [ribbon([[2.5, 21.5], [5.2, 17], [8.2, 14]], [0.3, 2.3, 0.6]), spark(10.6, 11.4, 2.8), knot(19.4, 20, 2.2, 10), ribbon([[19, 17.6], [20.6, 11.2], [18.6, 5], [13.2, 3.4], [9, 5.2], [8.2, 7.6]], [1.2, 2.4, 2.4, 2, 1.2, 0.2])],
  // a spiral opening into a small star
  wonder: [spiralRibbon(9, 14.4, 0.6, 6.4, 1.45, 90, 0.3, 2.4), ribbon([[9.2, 7.9], [12.4, 7.4], [15, 6.4]], [2.2, 1.4, 0.3]), spark(18.6, 5, 3.6), knot(4.4, 20.6, 1.7, -20)],
  // a ribbon standing straight against slanted lines
  defiance: [ribbon([[12, 22], [12.4, 15], [12, 7], [12.2, 1.6]], [0.4, 2.8, 2.4, 0.2]), knot(12.2, 11.8, 2.5), '~M2.5 4 L7.5 9', '~M2 10 L7 15', '~M2.5 16 L7.5 21', '~M16.5 3 L21.5 8', '~M17 9.5 L22 14.5', '~M16.5 16 L21.5 21'],
  // a ribbon flung wide, its knot burst open
  abandon: [ribbon([[2, 19], [6, 12], [12, 13], [17, 8], [22, 3.2]], [0.3, 2.4, 2.4, 1.8, 0.3]), '~' + heartLine(15.6, 18, 2.6).replace(/ Z$/, ''), 'M15.6 13.2 V11.2', 'M12.6 14 L11.4 12.6', 'M18.6 14 L19.8 12.6'],
};

// ---------- the 40 modules (clean diagram lines) ----------
export const MODULE_PATHS: Record<string, string[]> = {
  // the default shape: one bolt from you onto one target
  bolt: [dot(4.5, 19.5, 1.8), arrow([6.4, 17.6], [14.6, 9.4]), c(18, 6, 3), dot(18, 6, 0.9)],
  // Far: an arrow carrying a dot all the way to the edge
  move: [dot(4, 12, 2), arrow([7.5, 12], [19, 12]), 'M21.5 7.5 V16.5', '=M7.5 17 H19'],
  // a curved arrow bending onto a target ring
  homing: ['M3 19 C6 7 13 5 15.4 11.6', head(15.4, 11.6, 68), c(17.6, 17.4, 3.4), dot(17.6, 17.4, 1)],
  // a dot with three speed lines
  swift: [dot(17.5, 12, 3), 'M3 8 H11', 'M5.5 12 H12.5', 'M3 16 H11'],
  // a dot passing through a dashed wall
  ether: ['=M12 3 V21', 'M3 12 H9 M15 12 H17', head(17, 12, 0), dot(20.4, 12, 1.8)],
  // an arrow curving right / left
  right: ['M7 21 V13 C7 7.5 11 5.5 17 5.5', head(17, 5.5, 0), dot(7, 21, 1.4)],
  left: ['M17 21 V13 C17 7.5 13 5.5 7 5.5', head(7, 5.5, 180), dot(17, 21, 1.4)],
  // an hourglass made of two triangles
  time: ['M6 3 H18 M6 21 H18', 'M7.5 3 C7.5 8 12 10 12 12 C12 14 7.5 16 7.5 21 M16.5 3 C16.5 8 12 10 12 12 C12 14 16.5 16 16.5 21', '*M9.6 21 Q12 17.6 14.4 21 Z'],
  // two arrows swapping direction
  inverse: [arrow([4, 8], [19.5, 8]), arrow([20, 16], [4.5, 16])],
  // a small circle inside a large one
  size: [c(12, 12, 9.6), c(12, 12, 2.4), 'M5.6 12 H3.6', head(3.6, 12, 180, 2.4), 'M18.4 12 H20.4', head(20.4, 12, 0, 2.4), 'M12 5.6 V3.6', head(12, 3.6, -90, 2.4), 'M12 18.4 V20.4', head(12, 20.4, 90, 2.4)],
  // crossing paths: the engine picks the aim
  random: ['M3 6.5 H6.5 C11 6.5 13 17.5 17.5 17.5 H19.5', head(20.6, 17.5, 0, 3), 'M3 17.5 H6.5 C8.6 17.5 9.8 15 10.8 12.6 M13.2 11.4 C14.2 9 15.4 6.5 17.5 6.5 H19.5', head(20.6, 6.5, 0, 3)],
  // a dot hitting a line, with burst marks
  impact: ['M12 2.5 V13.6', head(12, 13.6, 90, 3.4), 'M3 19.4 A9 2.6 0 0 0 21 19.4', '~M6.4 19.4 A5.6 1.4 0 0 0 17.6 19.4', '~M3 19.4 A9 2.6 0 0 1 7 17.2 M17 17.2 A9 2.6 0 0 1 21 19.4'],
  // three arrows leaving one point together
  at_once: [dot(3.8, 12, 2), arrow([6.4, 10.4], [19.4, 4.4]), arrow([6.6, 12], [20.6, 12]), arrow([6.4, 13.6], [19.4, 19.6])],
  // shapes: a cone of three arcs
  wave: [dot(3.4, 12, 1.9), 'M5.6 9.6 L20.5 3.6 M5.6 14.4 L20.5 20.4', arc(3.4, 12, 7.2, -30, 30), arc(3.4, 12, 11.6, -32, 32), arc(3.4, 12, 16.4, -26, 26)],
  // a ring with radiating marks
  burst: [c(12, 12, 4.2), dot(12, 12, 1.3), 'M15.2 8.8 L19.6 4.4', head(19.6, 4.4, -45, 3), 'M8.8 8.8 L4.4 4.4', head(4.4, 4.4, -135, 3), 'M15.2 15.2 L19.6 19.6', head(19.6, 19.6, 45, 3), 'M8.8 15.2 L4.4 19.6', head(4.4, 19.6, 135, 3)],
  // a ring around a centre dot (you)
  aura: [dot(12, 12, 2.4), c(12, 12, 6.6), '=' + c(12, 12, 9.8)],
  // a long straight line through two dots
  lance: ['M2.8 21.2 L19.4 4.6', head(20.6, 3.4, -45), c(8.4, 15.6, 2), c(14.4, 9.6, 2)],
  // new for everyone
  // one line forking in two
  split: [dot(3.4, 12, 1.8), 'M5.4 12 H10.5 C13 12 13.5 6.5 17.6 6.2 M10.5 12 C13 12 13.5 17.5 17.6 17.8', head(18, 6.2, -4), head(18, 17.8, 4)],
  // a zig-zag bouncing off a wall
  ricochet: ['M20 2.5 V21.5', '~M20 5 L22.4 3.2 M20 9.5 L22.4 7.7 M20 14 L22.4 12.2 M20 18.5 L22.4 16.7', dot(3.6, 19.6, 1.8), 'M5.4 18 L17.5 11.5 L6.4 4.6', head(6.4, 4.6, 212)],
  // a charge on the ground with a short burning line
  fuse: ['M2.5 20.5 H21.5', 'M4.5 20.5 A5 5 0 0 1 14.5 20.5', 'M9.5 15.5 C9.5 11.4 13.2 13.6 14.4 10.6 C15.2 8.6 14 7.6 15.6 6.6', spark(18.4, 4.4, 2.8)],
  // a loop out and back
  return: [dot(3.6, 8, 1.8), 'M5.8 8 H15.5 A5 5 0 0 1 15.5 18 H7', head(6.4, 18, 180)],
  // three small bolts
  volley: [arrow([3.5, 13], [11, 5.5], 2.8), arrow([6.5, 20], [16, 10.5], 2.8), arrow([13, 21], [20.5, 13.5], 2.8)],
  // nested rings growing from one point
  bloom: [c(12, 17.4, 2.6), c(12, 14.6, 5.4), '=' + c(12, 11.8, 8.2), dot(12, 20, 1)],
  // a dot pinned by a stake into the ground
  anchor: ['M2.5 16.5 H21.5', '~M5 19 L7 16.5 M17 19 L19 16.5', dot(12, 9.6, 3), 'M12 12.6 V16.5', '*M10 16.5 H14 L12 22 Z', '~M5.6 9.6 H3 M18.4 9.6 H21'],
  // an arrow pulling a dot inward (toward you)
  lure: [c(4.6, 12, 2.4), dot(19.6, 12, 2), 'M16.6 12 H9', head(9, 12, 180), '~M20 6.6 L17 8.4 M20 17.4 L17 15.6'],
  // a dome over a dot
  shell: ['M3 19.5 H21', 'M4.5 19.5 A7.5 7.5 0 0 1 19.5 19.5', dot(12, 16.2, 2.2), '~M12 6.6 V4 M6.4 9.2 L4.6 7.4 M17.6 9.2 L19.4 7.4'],
  // a square of dotted ground that stays
  linger: ['=M12 4.5 L22 12.5 L12 20.5 L2 12.5 Z', dot(7.6, 12.5, 1.2), dot(12, 9, 1.2), dot(16.4, 12.5, 1.2), dot(12, 16, 1.2), dot(12, 12.5, 1.2)],
  // a heart with a soft, lowered line
  quiet: [heartLine(12, 10, 6), 'M4 20.5 Q12 18 20 20.5'],
  // a dot whose sound ripples are cut through
  silent: [dot(5.6, 12, 2.2), arc(5.6, 12, 6, -50, 50), arc(5.6, 12, 10.4, -45, 45), 'M10.5 21 L19 3'],
  // two dots tied by one line, a small knot in it
  thread: [dot(4, 16, 2), dot(20, 8, 2), 'M6 15.2 C9 14 9.6 9.6 12 10.6 C14 11.4 12.4 14.4 11 13.2 C9.8 12.2 12.6 9.6 14.6 9.6 C16 9.6 17 9 18 8.6'],
  // class-locked (Soul advanced classes)
  // one shape and its fainter double
  echo: [c(8, 14, 4.6), dot(8, 14, 1.3), '!=' + c(15.6, 10, 4.6), '!' + dot(15.6, 10, 1.3), '~M13 19 A8.5 8.5 0 0 0 20.6 13.6', head(20.6, 13.6, -70, 2.6)],
  // steps of small dots growing
  cascade: [dot(4, 19.5, 1.1), dot(10, 14.5, 1.7), dot(17.5, 7.5, 2.5), '~M5 17.6 Q6 14.2 8.4 13.8 M11.6 12.4 Q13 7.8 15.2 7'],
  // a beam between two rings that hits what crosses it
  tether: [c(4.4, 18, 2.6), c(19.6, 6, 2.6), 'M6.6 16.4 L17.4 7.6', dot(12, 12, 1.7), '~M13.6 15 L15.4 17 M8.4 9.4 L10.2 11.4'],
  // a curve drawing drops toward a centre
  siphon: [c(12, 12, 2.8), drop(12, 4, 1.25, 90), drop(19.6, 15.4, 1.25, 210), drop(4.4, 15.4, 1.25, -30), '~M15.6 6 A7.5 7.5 0 0 1 19 11 M17 19.4 A7.5 7.5 0 0 1 9.4 20 M4.5 11 A7.5 7.5 0 0 1 8 5.8'],
  // a dot passing through a solid block
  phantom: ['M9 4 H15 V20 H9 Z', '~M9 8 L15 4 M9 13 L15 8 M9 18 L15 13', 'M2.5 12 H7.4 M16.6 12 H18', head(18, 12, 0), dot(21, 12, 1.6)],
  // a dot circling a centre
  orbit: [dot(12, 12, 2.2), 'M5.6 6.8 A9 6.4 -25 1 0 18.2 5.2', head(18.2, 5.2, 0, 3), dot(19.4, 15.6, 1.6)],
  // a dot cracking open with sparks
  volatile: [c(12, 13, 5.6), 'M9.6 7.8 L12.4 11.2 L10.6 13.6 L13.4 18.4', 'M12 3.8 V1.8 M17.8 6.6 L19.4 5 M6.2 6.6 L4.6 5 M19.4 12.4 H21.8 M4.6 12.4 H2.2'],
  // domes over several dots
  bastion: ['M2 19.5 H22', 'M3 19.5 A3.5 3.5 0 0 1 10 19.5 M8.5 13.5 A3.5 3.5 0 0 1 15.5 13.5 M14 19.5 A3.5 3.5 0 0 1 21 19.5', dot(6.5, 18.2, 1.1), dot(12, 12.2, 1.1), dot(17.5, 18.2, 1.1), 'M8.5 13.5 H15.5'],
  // a target ring with a heavy downward bar
  judgement_mark: [c(12, 15.4, 6), dot(12, 15.4, 1.4), 'M12 8 V10 M12 20.8 V22.6 M4.4 15.4 H6.4 M17.6 15.4 H19.6', '*M7.6 1.6 H16.4 L12 6.4 Z'],
  // a ring of light over a small heart
  halo: ['M5 6.5 A7 2.6 0 1 0 19 6.5 A7 2.6 0 1 0 5 6.5', heartLine(12, 16, 4.4)],
};

// ---------- the 3 UI marks ----------
export const HEART_MARK_PATHS: { revert: string[]; practice: string[]; felt: string[] } = {
  // a curved rewind arrow round a small heart (undo the last pump)
  revert: ['M5.6 8 A8 8 0 1 1 4.6 15', head(5.6, 8, -120, 3.4), heartLine(12, 12.4, 2.8)],
  // a heart with tally lines beneath (practice earned)
  practice: [heartLine(12, 9.6, 5.6), 'M5.5 21.5 V19.5 M9.8 21.5 V18.5 M14.2 21.5 V17.5 M18.5 21.5 V16.5'],
  // an opening ribbon for "You have felt X"
  felt: [knot(12, 12.6, 3.8), arc(12, 12, 6.8, 140, 220), arc(12, 12, 6.8, -40, 40), '~' + arc(12, 12, 10, 145, 215), '~' + arc(12, 12, 10, -35, 35)],
};
export type HeartMarkId = keyof typeof HEART_MARK_PATHS;
const UNKNOWN = ['=' + c(12, 12, 8), dot(12, 12, 1.6)];

// ---------- rendering ----------
/** The stroke width the icons are drawn with on the 24 box (2.8 px at 40 px). */
export const STROKE = 1.7;
/** One path string (with its leading flags) as an SVG <path>. */
function pathEl(d: string): string {
  const m = /^[*~=!]+/.exec(d), f = m ? m[0] : '', body = d.slice(f.length);
  const a: string[] = [];
  if (f.includes('*')) a.push('fill="currentColor"', 'stroke-width="0.4"');
  if (f.includes('~')) a.push('stroke-width="1.15"');
  if (f.includes('=')) a.push('stroke-dasharray="2.2 2"');
  if (f.includes('!')) a.push('opacity="0.5"');
  return `<path d="${body}"${a.length ? ' ' + a.join(' ') : ''}/>`;
}
/** An inline SVG string for a set of paths: `currentColor` ink, so the caller tints it with CSS `color`. */
export function heartSvg(paths: string[], size = 24, color = 'currentColor'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" color="${color === 'currentColor' ? '' : color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.map(pathEl).join('')}</svg>`.replace(' color=""', '');
}

// Painted art: assets.json, as `npm run assets` builds it (a test can swap the map in).
let ART: Record<string, string> = ASSETS as Record<string, string>;
/** Tests only: use this asset map instead of assets.json (null restores it). */
export function setHeartArt(map: Record<string, string> | null): void { ART = map || (ASSETS as Record<string, string>); }
/** The painted file for an asset key (ids with underscores also match a hyphenated file name), else null. */
function painted(prefix: string, id: string, large = false): string | null {
  for (const k of [prefix + id, prefix + id.replace(/_/g, '-')]) { const u = (large && ART[k + '-lg']) || ART[k]; if (u) return u; }
  return null;
}
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const img = (src: string, size: number, kind: string) => `<img src="${esc(src)}" width="${size}" height="${size}" alt="" aria-hidden="true" class="heart-icon heart-icon-${kind}" draggable="false">`;
const uri = (svg: string) => 'data:image/svg+xml,' + encodeURIComponent(svg);

/** The asset key a painted feeling glyph is built under (art/icons/feelings/feeling-<id>.png). */
export const feelingKey = (id: string) => 'feeling-' + id;
/** The asset key a painted module icon is built under (art/icons/modules/module-<id>.png). */
export const moduleKey = (id: string) => 'module-' + id;
/** The asset key a painted UI mark is built under (ui-<mark>.png in either folder). */
export const heartMarkKey = (id: HeartMarkId) => 'heart-ui-' + id;

/** A feeling's glyph as HTML: the painted <img> when built, else the inline SVG. */
export function feelingIcon(id: string, size = 24): string {
  const p = painted('feeling-', id, size > 64); return p ? img(p, size, 'feeling') : heartSvg(FEELING_PATHS[id] || UNKNOWN, size);
}
/** A module's (or shape's) icon as HTML: the painted <img> when built, else the inline SVG. */
export function moduleIcon(id: string, size = 24): string {
  const p = painted('module-', id, size > 64); return p ? img(p, size, 'module') : heartSvg(MODULE_PATHS[id] || UNKNOWN, size);
}
/** A UI mark (revert, practice, felt) as HTML. */
export function heartMark(id: HeartMarkId, size = 24): string {
  const p = painted('heart-ui-', id, size > 64); return p ? img(p, size, 'mark') : heartSvg(HEART_MARK_PATHS[id] || UNKNOWN, size);
}
/** The same as a URL for <img src> (painted file, else an SVG data URI in `color`, white by default). */
export const feelingUri = (id: string, color = '#FFFFFF') => painted('feeling-', id) || uri(heartSvg(FEELING_PATHS[id] || UNKNOWN, 24, color));
export const moduleUri = (id: string, color = '#FFFFFF') => painted('module-', id) || uri(heartSvg(MODULE_PATHS[id] || UNKNOWN, 24, color));
export const heartMarkUri = (id: HeartMarkId, color = '#FFFFFF') => painted('heart-ui-', id) || uri(heartSvg(HEART_MARK_PATHS[id] || UNKNOWN, 24, color));
/** Is there painted art for this slot yet (so a caller can drop a COMING SOON block)? */
export const hasPaintedArt = (key: string) => !!(ART[key] || ART[key.replace(/_/g, '-')]);

// ---------- COMING SOON ----------
/** A neutral placeholder for a slot that needs bespoke painted art: muted ink on a raised panel, with the item's name. */
export function comingSoon(name: string, what: string): string {
  return `<div class="coming-soon" role="img" aria-label="${esc(name)}: ${esc(what)}, coming soon" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px;min-height:72px;background:#1C2536;border:1px dashed #232D3F;border-radius:6px;color:#A3AEC2;font-family:'Chakra Petch',sans-serif;text-align:center">`
    + `<span style="font-size:11px;letter-spacing:.18em;font-weight:600">COMING SOON</span>`
    + `<span style="font-size:13px;color:#A3AEC2">${esc(name)}</span>`
    + `<span style="font-size:11px;opacity:.8">${esc(what)}</span></div>`;
}
/** Every place that would want painted art; the code-drawn SVG or a COMING SOON block stands in until it is delivered. */
export const COMING_SOON_SLOTS: { slot: string; where: string; looksLike: string }[] = [
  { slot: 'Feeling glyphs (25): art/icons/feelings/feeling-<id>.png', where: 'Pump bar feeling buttons and segments, the workshop\'s Feelings section, residue tiles on the map, the "You have felt X" card, the Proving Ground grant list, combat log lines', looksLike: 'Flat white ink, a gestural ribbon with a small heart-knot, one motif per feeling (art brief table). SVG stands in now.' },
  { slot: 'Module and shape icons (40, with bolt): art/icons/modules/module-<id>.png', where: 'Outburst workshop (modules grouped by gate skill, locked class modules), design cards and the held-spell chip, practice pick dialog, Proving Ground unlock list', looksLike: 'Flat white ink, clean diagram lines: arrows, rings, paths (art brief table). SVG stands in now.' },
  { slot: 'UI marks (3): ui-revert.png, ui-practice.png, ui-felt.png', where: 'Revert pump button, the practice bar on the Magic tab, the header of the "You have felt X" card', looksLike: 'A curved rewind arrow; a heart with tally lines; an opening ribbon. Flat white ink. SVG stands in now.' },
  { slot: '"You have felt X" card illustration', where: 'The unlock card shown when a feeling first triggers (log and toast)', looksLike: 'A painted Soul-grammar vignette per feeling (or one shared backdrop): gathering ribbons of light around a heart, the feeling\'s colour as light only. COMING SOON block until painted.' },
  { slot: 'Residue tile texture per feeling', where: 'Map tiles a release touched, for 2 rounds', looksLike: 'A soft painted or particle wash in the feeling\'s light (embers, rain, frost, petals, ash, thread) under the white glyph; sourced CC0 / CC BY particle sheets first. A tint plus the SVG glyph stands in.' },
  { slot: 'Locked class module plate', where: 'Workshop and practice pick: the 10 class-locked modules, shown locked with their class', looksLike: 'The module icon on a sealed plate carrying the advanced class emblem; needs the class art from the roster batches. Icon plus a lock label stands in.' },
  { slot: 'Heart plate item art', where: 'Inventory and loot: heart plates that teach a module (bonus source)', looksLike: 'A painted keepsake plate, Soul grammar, the module icon engraved in white. COMING SOON block until painted.' },
  { slot: 'Workshop and Proving Ground header art', where: 'Top of the collapsible Outburst workshop; the Proving Ground feelings test row', looksLike: 'A wide Heavenprint painting of a caster holding a spell in the heart (no full face needed). COMING SOON block or no banner until painted.' },
];
