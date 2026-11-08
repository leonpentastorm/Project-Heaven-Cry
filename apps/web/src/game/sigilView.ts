// The Sigil view (rules 1.4; spec: Mana, Sigils 9, "What the player must see"): everything the combat grid and the area
// map show about Sigil magic, read from the engine's preview API (previewDraw, patternAt, evokeOrigins, planEvoke,
// placedMagic). Nothing here is a rule of its own: the engine decides, this module only says it in words, glyphs and
// marks. Pure: no DOM, no store, so both screens share it and the tests drive it directly.
// Look: Sigil magic is Mind cyan (#4FC8DF, ink #8BDEEE), square and snapping; element hues tint effects only and always
// come with the element's word.
import { SIGIL, SIGIL_ELEMENTS, previewDraw, patternAt, findPattern, evokeOrigins, planEvoke, placedMagic, secretFrom, refOf, dist, condName, compileSpell, FLUX_MAX, holderOf } from '@engine';
import { glyphUri, scratchUri, SIGIL_INK, SIGIL_GLOW } from './glyphs';
import { grandLook, grandTint } from './fx/grand';

export const HOSTILE_INK = '#F65157', ALLY_INK = '#FFFFFF', SPARED_INK = '#6FEA77', MUTED_INK = '#A3AEC2';
/** The 8 directions as arrows (dx,dy). */
export const ARROW: Record<string, string> = { '1,0': '→', '-1,0': '←', '0,1': '↓', '0,-1': '↑', '1,1': '↘', '-1,1': '↙', '1,-1': '↗', '-1,-1': '↖', '0,0': '•' };
export const arrowOf = (d?: [number, number] | number[] | null) => (d ? ARROW[(d[0] || 0) + ',' + (d[1] || 0)] || '•' : '');
/** Element tints for placed fields and burst tiles (effects only; the word always rides with it). */
export const ELEMENT_TINT: Record<string, string> = {
  fire: 'rgba(246, 138, 56, 0.26)', freeze: 'rgba(190, 236, 248, 0.24)', shock: 'rgba(227, 191, 81, 0.24)', stone: 'rgba(140, 111, 58, 0.34)',
  gale: 'rgba(163, 174, 194, 0.22)', spark: 'rgba(255, 244, 196, 0.2)', acid: 'rgba(170, 214, 70, 0.26)',
};
const CYAN_TINT = 'rgba(79, 200, 223, 0.16)';
const tintOf = (el?: string | null) => (el && ELEMENT_TINT[el]) || CYAN_TINT;
const FAM: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };
const up = (w: string) => (SIGIL[w]?.word || String(w || '').toUpperCase());
const GROUP_NAME: Record<string, string> = { subject: 'Subject', reach: 'Reach', delivery: 'Delivery', burst: 'Burst', filter: 'Filter' };
const CLASS_NAME: Record<string, string> = { subject_element: 'Element', subject_affliction: 'Affliction', subject_boon: 'Boon', subject_working: 'Working', reach: 'Reach', delivery: 'Delivery', burst: 'Burst', filter: 'Filter' };
export const wordClassName = (w: string) => CLASS_NAME[SIGIL[w]?.class || ''] || GROUP_NAME[SIGIL[w]?.group || ''] || '';
/** The glyph keyboard's rows (Sigil 1.4 word groups, in this order): the four Subject kinds, then Reach, Delivery,
 * Burst and Filter. Every keyboard of words (combat Draw, the area map, the Proving Ground) groups by these. */
export const WORD_ROWS: { cls: string; label: string }[] = [
  { cls: 'subject_element', label: 'Elements' }, { cls: 'subject_affliction', label: 'Afflictions' }, { cls: 'subject_boon', label: 'Boons' },
  { cls: 'subject_working', label: 'Workings' }, { cls: 'reach', label: 'Reach' }, { cls: 'delivery', label: 'Delivery' }, { cls: 'burst', label: 'Burst' }, { cls: 'filter', label: 'Filter' }];
/** Words (or anything with a word id) split into WORD_ROWS, order kept inside a row; rows with no words are left out.
 * A word of no known class goes to a last "Other" row, so nothing is ever dropped. */
export function wordRows<T>(items: T[], idOf: (t: T) => string): { key: string; label: string; items: T[] }[] {
  const rows = WORD_ROWS.map((r) => ({ key: r.cls, label: r.label, items: items.filter((t) => SIGIL[idOf(t)]?.class === r.cls) }));
  const other = items.filter((t) => !WORD_ROWS.some((r) => r.cls === SIGIL[idOf(t)]?.class));
  return [...rows, { key: 'other', label: 'Other', items: other }].filter((r) => r.items.length > 0);
}
/** A refusal from previewDraw cut to a few words for under a disabled key ("tile taken", "needs 2 AP"). The full
 * reason stays in the tooltip and the aria label. */
export function shortWhy(why: string | null | undefined): string {
  const w = String(why || '');
  const ap = /Needs ([\d.]+) AP/.exec(w); if (ap) return 'needs ' + ap[1] + ' AP';
  const rules: [RegExp, string][] = [[/one glyph per tile|holds \d+ glyphs at most/i, 'tile taken'], [/past your cap/i, 'over your cap'], [/past the cap/i, 'over 4 glyphs'],
    [/second reach/i, 'one Reach only'], [/KIN takes one/i, 'one KIN only'], [/WATCH and STAY/i, 'no WATCH + STAY'], [/locked after an overload/i, 'Evoker locked'],
    [/need an Evoker/i, 'no Evoker'], [/silenced/i, 'silenced'], [/downed/i, 'downed'], [/not your turn/i, 'not your turn'], [/own tile/i, 'step on it'], [/charge/i, 'not enough charge'], [/don't know/i, 'unknown word']];
  for (const [re, t] of rules) if (re.test(w)) return t;
  return 'can\'t now';
}
/** A shallow copy of the fight, so a preview's housekeeping (the 1.4 migration stamp) never touches the live state. */
const view = (cb: any) => ({ ...cb, glyphs: [...(cb.glyphs || [])], zones: [...(cb.zones || [])] });

// ---------- 1. before drawing: the word strip ----------
export interface DrawWord {
  id: string; word: string; cls: string; ok: boolean; why: string | null; cost: { ap: number; charge: number; flux: number };
  effect: 'starts' | 'extends' | 'breaks' | 'stacks' | null; effectText: string; after: string[]; fades: string | null; overload: boolean; capLeft: number;
  /** One short line under the word: "2 ch · 1 AP · extends", or "2 ch · tile taken" when refused. */ sub: string;
  /** Refused: the reason in a few words (shortWhy); '' when the word can be drawn. */ hint: string; title: string; img: string;
}
const EFFECT_TEXT = { starts: 'starts a new Line', extends: 'extends the Line', breaks: 'breaks the shape (a bend or a cluster)', stacks: 'stacks on this tile' };
/** Each word you know, as the engine would draw it on your own tile now (spec 9.1). */
export function drawStrip(cb: any, u: any): { tile: string; words: DrawWord[] } {
  const c = view(cb), words: string[] = (u && u.mg && u.mg.words) || [];
  return { tile: u ? u.pos : '', words: words.filter((w) => SIGIL[w]).map((w) => {
    const pv: any = previewDraw(c as any, u, w), ok = !!pv.ok;
    const effectText = pv.effect ? EFFECT_TEXT[pv.effect as keyof typeof EFFECT_TEXT] + (pv.effect === 'extends' || pv.effect === 'breaks' ? ': ' + pv.words.map(up).join(' · ') : '') : '';
    const cost = pv.cost || { ap: 0, charge: SIGIL[w].charge, flux: SIGIL[w].flux ?? 1 };
    const fades = pv.fades ? up(pv.fades.word) + ' at ' + refOf(pv.fades.pos) : null;
    const hint = ok ? '' : shortWhy(pv.why);
    const sub = ok ? cost.charge + ' ch · ' + cost.ap + ' AP' + (pv.effect ? ' · ' + pv.effect : '') : SIGIL[w].charge + ' ch · ' + hint;
    const title = up(w) + ' · ' + wordClassName(w) + ' · charge ' + SIGIL[w].charge + (ok ? ', ' + cost.ap + ' AP, +' + cost.flux + ' Flux: ' + effectText + (fades ? '; ' + fades + ' fades (your cap)' : '') + (pv.overload ? '; WARNING: this overloads your Evoker' : '') : '. CAN\'T NOW: ' + pv.why) + '. ' + (SIGIL[w].text || '');
    return { id: w, word: up(w), cls: wordClassName(w), ok, why: ok ? null : pv.why || 'Not now.', cost, effect: pv.effect || null, effectText, after: pv.words || [], fades, overload: !!pv.overload, capLeft: pv.capLeft ?? 0, sub, hint, title, img: glyphUri(w, ok ? SIGIL_INK : '#7F8BA1') };
  }) };
}

// ---------- glyphs on the map ----------
/** How a glyph shows to a viewer: your side's glow cyan; another side's are readable only if you know the word. */
export function glyphMark(gl: any, side: 'pc' | 'foe', knows: (w: string) => boolean): { src: string; title: string; readable: boolean; ours: boolean } {
  const ours = gl.side === side, readable = ours || knows(gl.word);
  const life = gl.left != null ? ', ' + gl.left + (gl.left === 1 ? ' round' : ' rounds') : '';
  return { ours, readable, src: ours ? glyphUri(gl.word, SIGIL_INK, { glow: true }) : readable ? glyphUri(gl.word, HOSTILE_INK, { glow: true }) : scratchUri(HOSTILE_INK),
    title: ours ? up(gl.word) + ' (' + (gl.who || 'yours') + life + ')' : readable ? 'hostile ' + up(gl.word) + life : 'an unreadable hostile glyph (you don\'t know the word)' };
}

// ---------- 2. while building: the pattern panel ----------
export interface PatternPanel {
  has: boolean; tile: string; tiles: string[]; shape: string; words: { key: string; word: string; img: string; readable: boolean; cls: string }[]; readable: boolean; ours: boolean;
  valid: boolean; verdict: string; capLeft: number; lineLeft: number; stats: { k: string; now: string; after: string }[]; overload: string | null; text: string;
}
/** The Line under a glyph, as the screen shows it while building (spec 9.2): words in order, valid or why not, glyphs
 * left before your cap, charge/AP/Flux now and after Evoke, the overload warning. Words you can't read stay marks. */
export function patternPanel(cb: any, tile: string | null, u: any, knows: (w: string) => boolean): PatternPanel | null {
  if (!tile || !(cb.glyphs || []).some((g: any) => g.pos === tile)) return null;
  const c = view(cb), pa: any = patternAt(c as any, tile, u), start = (cb.glyphs || []).find((g: any) => g.pos === tile);
  const ours = !!u && start && start.side === u.side;
  const read = (w: string) => ours || knows(w), allRead = pa.words.every(read);
  const words = pa.words.map((w: string, i: number) => ({ key: i + w, word: read(w) ? up(w) : '?', img: read(w) ? glyphUri(w, ours ? SIGIL_INK : HOSTILE_INK) : scratchUri(HOSTILE_INK), readable: read(w), cls: read(w) ? wordClassName(w) : 'unread' }));
  const shape = pa.shape === 'line' ? 'Line of ' + pa.tiles.length : pa.shape === 'stack' ? 'Stack of ' + pa.words.length : pa.shape === 'none' ? 'No shape' : '';
  const verdict = !allRead ? 'Unreadable: you don\'t know every word in it.' : pa.valid ? '✓ A spell: ' + spellSummary(pa.words) : '◆ ' + (pa.why || 'Not a spell yet.');
  const m = u && u.mg, now = pa.costNow || {}, after = pa.costAfter || {};
  const stats = !ours || !m ? [] : [
    { k: 'Charge', now: String(now.charge), after: String(after.charge) + (after.evokeCharge != null ? ' (−' + after.evokeCharge + ')' : '') },
    { k: 'AP', now: num(now.ap), after: num(after.ap) }, // AP can be fractional (Glyph AP 0.8): no float noise
    { k: 'Flux', now: now.flux + '/' + FLUX_MAX, after: after.flux + '/' + FLUX_MAX },
  ];
  const text = shape + ': ' + words.map((w: any) => w.word).join(' · ') + '. ' + verdict + (ours ? ' ' + pa.capLeft + (pa.capLeft === 1 ? ' glyph' : ' glyphs') + ' left before your cap; room for ' + pa.lineLeft + ' more in this Line.' : '');
  return { has: true, tile, tiles: pa.tiles || [], shape, words, readable: allRead, ours: !!ours, valid: !!pa.valid && allRead, verdict, capLeft: pa.capLeft, lineLeft: pa.lineLeft, stats, overload: ours ? pa.overloadWarning : null, text };
}
/** A number for the screen: at most one decimal (0.4, not 0.3999999999999999). */
const num = (n: any) => (typeof n === 'number' ? String(Math.round(n * 10) / 10) : String(n));
/** A spell in one short phrase from its compiled numbers: "FIRE · SEEK · CONDENSE: a bolt, range 8, one target ×1.5". */
export function spellSummary(words: string[]): string {
  let sp: any; try { sp = compileSpell(words); } catch { return words.map(up).join(' · '); }
  const how = sp.missile === 'bolt' ? 'a bolt, range ' + sp.range : sp.missile === 'lob' ? 'a lob, range ' + sp.range : sp.missile === 'appear' ? 'appears at the target, range ' + sp.range : sp.missile === 'relay' ? 'through an ally within ' + sp.range : 'Touch (1 tile, or yourself)';
  const parts = [how];
  if (sp.missiles > 1) parts.push(sp.missiles + ' missiles');
  if (sp.condense) parts.push('core ×' + round2(sp.coreMult));
  if (sp.spread) parts.push('radius ' + sp.radius + ' ×' + sp.radiusMult);
  if (sp.push) parts.push('cone ' + sp.coneLen + ' ×' + sp.coneMult);
  if (sp.chain) parts.push('chains ' + sp.chain + (sp.chain === 1 ? ' time' : ' times'));
  if (sp.pull) parts.push('pulls ' + sp.pull);
  if (sp.leech) parts.push('leech');
  if (sp.stay) parts.push('strikes, then stays as a field ' + sp.fieldRounds + ' rounds (full the first time, half after)');
  if (sp.wait) parts.push('a hidden trap');
  if (sp.watch) parts.push('a turret ' + sp.turretRounds + ' rounds');
  if (sp.kin) parts.push('spares your side');
  if (sp.repeats) parts.push('repeats ×' + round2(sp.repMult));
  return sp.subjects.map(up).filter((x: string, i: number, a: string[]) => a.indexOf(x) === i).join(' + ') + ', ' + parts.join(', ');
}
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- 3–8. Evoke: where to stand, the area, delivery, burst, who is affected, fizzle ----------
export interface EvokeChoice { aims?: string[]; dest?: string | null; order?: string | null; orderTo?: string | null; /** Paint the Field's free Burst word. */ paint?: 'spread' | 'push' | null }
export interface SgMark { key: string; text: string; style: string; title: string }
export interface SgTile { layer: string; marks: SgMark[]; note: string }
export interface AffectedRow { key: string; unit: string; name: string; tag: string; ink: string; text: string; at: string; /** A summary row (LEECH's heal, NULL's catch), not a creature the spell affects. */ extra?: boolean }
export interface EvokeView {
  tile: string; stage: 'none' | 'stand' | 'aim' | 'dest' | 'order' | 'ready'; ok: boolean; why: string; hint: string;
  pattern: PatternPanel | null; origins: { tile: string; ok: boolean; why?: string; arrow: string }[]; hereOk: boolean;
  area: Set<string>; pickable: Set<string>; stepTo: Set<string>; missilesNeeded: number; aims: string[];
  /** COMMAND · move: the tiles the main target may be sent to (the engine's 3-tile walk). */ orderTo: Set<string>;
  /** LEECH: the caster's heal if every hit lands (engine plan.leech), or null. */ leech: { heal: number; restored: number; expected: number } | null;
  /** NULL: what it would unmake that this viewer may know of (never the other side's unspotted traps). */ nulls: { kind: string; tiles: string[]; mine: boolean }[];
  facing: string; range: number | null; ap: number; charge: number; fizzle: boolean; fizzleText: string;
  affected: AffectedRow[]; tiles: Record<string, SgTile>; orders: string[] | null; order: string; payload: any | null; plan: any;
  /** Visualization · Paint the Field (items 450, 485): the free Burst words this caster may add (none if the spell has a
   * Burst or the caster doesn't hold it), and the one picked. */ paints: string[]; paint: string | null;
  /** COMMAND · move with a tile picked: the walk it would take (the engine's path). */ orderPath: string[];
}
const badge = (bg: string, fg = '#0A0D13') => 'position: absolute; z-index: 5; padding: 0 3px; border-radius: 2px; font-size: 9px; line-height: 13px; font-weight: 700; letter-spacing: 0.02em; pointer-events: none; white-space: nowrap; background: ' + bg + '; color: ' + fg;
const CORNER = { tl: 'left: 1px; top: 1px', tr: 'right: 1px; top: 1px', bl: 'left: 1px; bottom: 1px', br: 'right: 1px; bottom: 1px', c: 'left: 50%; top: 50%; transform: translate(-50%, -50%)' };
/** Bresenham tiles from a to b (for drawing a lob's arc only; the engine owns real paths). */
function lineTiles(a: string, b: string): string[] {
  let [x0, y0] = a.split(',').map(Number); const [x1, y1] = b.split(',').map(Number), out: string[] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) { const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } out.push(x0 + ',' + y0); }
  return out;
}
const ORDERS_DEFAULT = ['halt', 'kneel', 'drop', 'move'];
/** Plan an Evoke for the screen (spec 9.3–9.8). tile: a glyph of the pattern; choice: the aims picked so far (TWICE: up
 * to its missiles), STEP's landing tile, COMMAND's order; hover: the tile under the cursor, previewed as the next pick. */
export function evokeView(cb: any, u: any, tile: string, choice: EvokeChoice = {}, hover?: string | null, knows: (w: string) => boolean = () => false): EvokeView {
  const c = view(cb), aims = [...(choice.aims || [])];
  const pat: any = findPattern(c as any, tile, u?.pos);
  const panel = patternPanel(cb, tile, u, knows);
  const out: EvokeView = { tile, stage: 'none', ok: false, why: '', hint: '', pattern: panel, origins: [], hereOk: false, area: new Set(), pickable: new Set(), stepTo: new Set(), missilesNeeded: 1, aims, orderTo: new Set(), leech: null, nulls: [],
    facing: '', range: null, ap: 0, charge: 0, fizzle: false, fizzleText: '', affected: [], tiles: {}, orders: null, order: choice.order || 'halt', payload: null, plan: null, paints: [], paint: null, orderPath: [] };
  const T = (k: string) => (out.tiles[k] ||= { layer: '', marks: [], note: '' });
  const mark = (k: string, m: SgMark, note?: string) => { const t = T(k); if (!t.marks.some((x) => x.key === m.key)) t.marks.push(m); if (note) t.note += (t.note ? ' · ' : '') + note; };
  if (typeof pat === 'string' || !u) { out.why = typeof pat === 'string' ? pat : 'No caster.'; out.hint = out.why; return out; }
  for (const k of pat.tiles) mark(k, { key: 'pat', text: '', style: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; border: 2px solid ' + SIGIL_GLOW + '; box-shadow: inset 0 0 8px rgba(79, 200, 223, 0.35)', title: 'the Line' }, 'part of the Line');
  // 3. Where to stand: every tile within reach with its facing arrow, or why it's refused.
  out.origins = evokeOrigins(c as any, u, pat).map((o: any) => ({ tile: o.tile, ok: o.ok, why: o.why, arrow: o.ok ? arrowOf(o.dir) : '✕' }));
  for (const o of out.origins) {
    if (o.tile === u.pos) continue;
    mark(o.tile, o.ok ? { key: 'from', text: o.arrow, style: badge('rgba(79, 200, 223, 0.85)') + '; ' + CORNER.tr, title: 'Evoke from here: it fires ' + o.arrow }
      : { key: 'from', text: '✕', style: badge('#1C2536', MUTED_INK) + '; ' + CORNER.tr, title: 'Not from here: ' + o.why }, o.ok ? 'Evoke from here: fires ' + o.arrow : 'can\'t Evoke from here: ' + o.why);
  }
  const here = out.origins.find((o) => o.tile === u.pos);
  out.hereOk = !!(here && here.ok);
  const sp: any = (() => { try { return compileSpell(pat.words); } catch { return null; } })();
  out.missilesNeeded = sp ? (sp.watch ? 1 : sp.missiles) : 1;
  // Paint the Field: only for a holder of the skill unlock, on a spell with no Burst word.
  const painter = (() => { try { return !!holderOf({ u, cb: c as any }, 'skill:visualization.5'); } catch { return false; } })();
  if (painter && sp && !sp.burst) out.paints = ['spread', 'push'];
  const paint = choice.paint && out.paints.includes(choice.paint) ? choice.paint : null; out.paint = paint;
  const opts = (extraAim?: string | null) => {
    const list = [...aims]; if (extraAim && !list.includes(extraAim)) { if (list.length >= out.missilesNeeded) list[list.length - 1] = extraAim; else list.push(extraAim); }
    return { aim: list[0], o: { ...(list.length > 1 ? { aims: list } : {}), ...(choice.dest ? { dest: choice.dest } : {}), ...(choice.order ? { order: choice.order } : {}), ...(choice.orderTo ? { orderTo: choice.orderTo } : {}), ...(paint ? { paint } : {}) } };
  };
  const a0 = opts(null), base: any = planEvoke(c as any, u, tile, a0.aim, a0.o);
  out.ap = base.ap; out.charge = base.charge; out.range = base.range ?? null;
  if (base.facing) out.facing = base.facing.mode === 'stack' ? 'all round' : arrowOf(base.facing.dir) + ' (' + (base.facing.mode === 'along' ? 'along the Line' : 'across the Line') + ')';
  // Stage: stand (no area yet), aim, STEP landing, COMMAND move tile, ready.
  if (!base.area.length && !base.pickable.length) {
    out.why = base.why || 'Not from here.';
    if (out.hereOk) { out.stage = 'none'; out.hint = out.why; return out; } // on a good tile, but it can't fire (charge, AP, Silenced…)
    out.stage = 'stand';
    const goods = out.origins.filter((o) => o.ok).length;
    out.hint = (here ? 'Not from your tile: ' + (here.why || out.why) : out.why) + (goods ? ' Step onto a cyan tile by the Line (its arrow shows which way the spell opens), then Evoke: the Line stays picked.' : '');
    return out;
  }
  out.area = new Set(base.area); out.pickable = new Set(base.pickable);
  for (const k of base.area) T(k).layer = 'background: rgba(79, 200, 223, 0.13); box-shadow: inset 0 0 0 1px rgba(79, 200, 223, 0.45)';
  T(u.pos).layer = 'box-shadow: inset 0 0 0 2px ' + SIGIL_GLOW;
  if (base.facing) mark(u.pos, { key: 'face', text: arrowOf(base.facing.dir), style: badge(SIGIL_GLOW) + '; ' + CORNER.tr, title: 'fires ' + out.facing }, 'you fire ' + out.facing);
  // Which plan to draw: the hovered next pick (on hover), else the one picked.
  const hv = hover && (out.pickable.has(hover) || out.area.has(hover)) && !aims.includes(hover) && !base.missiles.some((m: any) => m.why) ? hover : null;
  const hp: any = hv ? (() => { const o = opts(hv); return planEvoke(c as any, u, tile, o.aim, o.o); })() : null;
  const show: any = hp && (hp.missiles.length || hp.ok) ? hp : base;
  out.plan = show;
  // 4. targeting: the aims picked, numbered when there are several.
  aims.forEach((k, i) => mark(k, { key: 'aim' + i, text: out.missilesNeeded > 1 ? '◎' + (i + 1) : '◎', style: badge('#FFFFFF') + '; ' + CORNER.tl, title: 'aimed here' }, 'aimed' + (out.missilesNeeded > 1 ? ' (missile ' + (i + 1) + ')' : '')));
  // 5–6. each missile's delivery and burst
  const many = show.missiles.length > 1;
  for (const m of show.missiles) {
    const n = many ? String(m.i + 1) : '';
    m.path.forEach((k: string, j: number) => { const nx = m.path[j + 1] || m.impact, [ax, ay] = k.split(',').map(Number), [bx, by] = nx.split(',').map(Number); if (k === m.impact) return;
      mark(k, { key: 'path' + m.i, text: ARROW[Math.sign(bx - ax) + ',' + Math.sign(by - ay)] || '·', style: badge('transparent', SIGIL_INK) + '; ' + CORNER.c + '; font-size: 14px', title: 'bolt path' }, 'the bolt passes'); });
    if (m.blockedAt) mark(m.blockedAt, { key: 'block' + m.i, text: '✕ ' + (m.stoppedBy === 'cover' ? 'BLOCKED' : 'STOPS'), style: badge('#FFFFFF') + '; ' + CORNER.bl, title: m.stoppedBy === 'cover' ? 'cover stops the bolt before here' : 'a creature here takes the bolt' }, m.stoppedBy === 'cover' ? 'the bolt is stopped by cover here' : 'the bolt stops on whoever stands here');
    if (m.arc) { lineTiles(m.arc.from, m.arc.to).forEach((k) => { if (k !== m.arc.to) mark(k, { key: 'arc' + m.i, text: '⌒', style: badge('transparent', SIGIL_INK) + '; ' + CORNER.c + '; font-size: 13px; opacity: 0.75', title: 'the lob passes over' }, 'the lob passes over'); }); }
    if (m.kind === 'appear' && !m.self) mark(m.impact, { key: 'appear' + m.i, text: '◇ APPEARS', style: badge(SIGIL_GLOW) + '; ' + CORNER.tl, title: 'SENSE: it appears here, nothing blocks it' }, 'it appears here');
    m.hops.forEach((k: string, j: number) => mark(k, { key: 'hop' + m.i + j, text: '⇢R' + (j + 1), style: badge(SIGIL_GLOW) + '; ' + CORNER.bl, title: 'RELAY hop ' + (j + 1) }, 'RELAY hop ' + (j + 1)));
    if (n) mark(m.impact, { key: 'miss' + m.i, text: 'M' + n, style: badge('#FFFFFF') + '; ' + CORNER.br, title: 'missile ' + n }, 'missile ' + n + ' lands');
    // the Burst tiles and the CONDENSE core
    const el = sp?.element || null;
    for (const k of m.burst.tiles) {
      const mult = m.burst.mult[k] ?? 1, core = k === m.burst.core && sp?.condense;
      const t = T(k); t.layer = 'background: ' + tintOf(el) + '; box-shadow: inset 0 0 0 ' + (core ? 3 : 1) + 'px ' + SIGIL_GLOW;
      if (sp?.burst || core) mark(k, { key: 'mult' + m.i, text: (core ? 'CORE ' : '') + '×' + round2(mult), style: badge(core ? SIGIL_GLOW : 'rgba(10, 13, 19, 0.75)', core ? '#0A0D13' : SIGIL_INK) + '; ' + CORNER.bl, title: core ? 'CONDENSE core' : 'burst' }, (core ? 'CONDENSE core ' : 'burst ') + '×' + round2(mult));
    }
    if (m.placed) mark(m.impact, { key: 'placed' + m.i, text: m.placed === 'field' ? '▦ FIELD' : m.placed === 'trap' ? '⧗ TRAP' : '▲ TURRET', style: badge(SIGIL_GLOW) + '; ' + CORNER.tl, title: m.placed === 'field' ? 'it strikes, then stays here (full the first time, half after)' : 'it stays here' }, m.placed === 'field' ? 'it strikes, then a field stays here (full the first time, half after)' : 'a ' + m.placed + ' stays here');
    m.chain.forEach((j: any, i: number) => mark(j.to, { key: 'chain' + m.i + i, text: '⚡' + (i + 1) + ' ×' + round2(j.mult), style: badge('#E3BF51') + '; ' + CORNER.tl, title: 'CHAIN jump ' + (i + 1) }, 'CHAIN jump ' + (i + 1) + ' ×' + round2(j.mult)));
    m.pull.forEach((p: any) => mark(p.to, { key: 'pull' + p.unit, text: '⇠ PULLED', style: badge('#FFFFFF') + '; ' + CORNER.br, title: 'PULL leaves them here' }, 'PULL leaves ' + nameOf(cb, p.unit) + ' here'));
    m.step.forEach((p: any) => mark(p.to, { key: 'step' + p.unit, text: '⇢ STEP', style: badge('#FFFFFF') + '; ' + CORNER.br, title: 'STEP lands them here' }, 'STEP lands ' + nameOf(cb, p.unit) + ' here'));
    if (m.why && m.stepTo.length) for (const k of m.stepTo) { out.stepTo.add(k); mark(k, { key: 'stepto', text: '', style: 'position: absolute; inset: 30%; z-index: 4; pointer-events: none; border: 2px dashed #FFFFFF', title: 'STEP may land here' }, 'STEP may land here'); }
    if (m.veil.length) for (const k of m.veil) T(k).layer = 'background: rgba(120, 128, 142, 0.45)';
    if (m.raise.length) for (const k of m.raise) mark(k, { key: 'raise', text: '▇ WALL', style: badge('#C9D3E3') + '; ' + CORNER.tl, title: 'RAISE puts a wall here' }, 'RAISE puts a wall here');
    // LIGHT: its radius, lit before you Evoke; your side's Hidden in it would be revealed.
    if (m.light && m.light.length) {
      for (const k of m.light) { const t = T(k); if (!t.layer) t.layer = LIGHT_LAYER; mark(k, { key: 'lit', text: '', style: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-shadow: inset 0 0 10px rgba(255, 248, 225, 0.45)', title: 'LIGHT: lit for the scene' }, 'LIGHT lights this tile (reveals the Hidden here)'); }
      for (const x of cb.units || []) if (!x.dead && x.hidden && x.side === u.side && m.light.includes(x.pos)) mark(x.pos, { key: 'reveal', text: '☀ REVEALED', style: badge('#FFFFFF') + '; ' + CORNER.bl, title: 'LIGHT reveals ' + x.name }, 'LIGHT reveals ' + x.name);
    }
    // NULL: every glyph, field, trap, turret and wall it would unmake (the other side's unspotted traps stay unknown).
    for (const h of m.nullHits || []) {
      const z = (cb.zones || []).find((x: any) => x.id === h.id); if (z && secretFrom(z, u.side)) continue;
      const mine = h.side === u.side; out.nulls.push({ kind: h.kind, tiles: h.tiles, mine });
      for (const k of h.tiles) mark(k, { key: 'null' + h.id, text: '⊘ ' + (NULL_NAME[h.kind] || h.kind.toUpperCase()), style: badge(mine ? '#FFFFFF' : SIGIL_GLOW) + '; ' + CORNER.tr, title: 'NULL unmakes ' + (mine ? 'your side\'s ' : 'the hostile ') + (NULL_NAME[h.kind] || h.kind).toLowerCase() }, 'NULL unmakes ' + (mine ? 'your side\'s ' : 'the hostile ') + (NULL_NAME[h.kind] || h.kind).toLowerCase() + ' here');
    }
    if (sp?.workings?.includes('null') && !(m.nullHits || []).length) for (const k of m.burst.tiles) mark(k, { key: 'null0', text: '', style: 'position: absolute; inset: 0; z-index: 1; pointer-events: none; border: 1px dashed ' + SIGIL_GLOW, title: 'NULL cleans here' }, 'NULL cleans here (nothing to unmake)');
    // WATCH: the turret's reach and who it would fire at now.
    if (m.turret) turretMarks(mark, cb, m.turret, 'tp' + m.i, true);
    // COMMAND · move: where the order may send them.
    for (const k of m.orderTo || []) out.orderTo.add(k);
    if (m.orderPath && m.orderPath.length && !out.orderPath.length) out.orderPath = [...m.orderPath];
  }
  // 7. who is affected: every creature, with its tag, numbers and the roll or save it takes.
  const rows = new Map<string, any>();
  for (const a of show.affected) { const r = rows.get(a.unit); if (!r) rows.set(a.unit, { ...a, saves: [...a.saves], notes: [...(a.notes || [])], hits: 1 }); else { r.dmg += a.dmg; r.dmgAfterArmour += a.dmgAfterArmour; r.heal += a.heal; r.shield += a.shield; r.hits++; r.saves.push(...a.saves); for (const n of a.notes || []) if (!r.notes.includes(n)) r.notes.push(n); if (!r.roll) r.roll = a.roll; r.kinSpared = r.kinSpared && a.kinSpared; r.skipped = r.skipped && a.skipped; } }
  const cmd = sp && sp.uniqueSubjects.includes('command') ? (choice.order || 'halt') : null;
  const cmdText = cmd ? 'if it fails: ' + (cmd === 'move' ? (choice.orderTo ? 'walks to ' + refOf(choice.orderTo) : 'walks where you pick (up to ' + ((SIGIL.command as any)?.move_tiles ?? 3) + ' tiles)') : ORDER_TEXT[cmd] || cmd) : '';
  const SKIP: Record<string, string> = { downed: 'Downed: skipped', surrendered: 'surrendered: skipped', quicken_self: 'QUICKEN can\'t target you', quicken_round: 'already Quickened this round', marked: 'Marked: MASK fizzles on them' };
  for (const a of rows.values()) {
    const tag = a.kinSpared ? 'SPARED (KIN)' : a.skipped ? 'SKIPPED' : a.self ? 'YOU' : a.ally ? 'ALLY' : 'ENEMY', ink = a.kinSpared ? SPARED_INK : a.skipped ? MUTED_INK : a.ally ? ALLY_INK : HOSTILE_INK;
    const nums: string[] = [];
    if (!a.kinSpared && !a.skipped) {
      if (a.dmg) nums.push('−' + a.dmgAfterArmour + ' HP' + (a.dmgAfterArmour !== a.dmg ? ' (' + a.dmg + ' before armour)' : ''));
      if (a.heal) nums.push('+' + a.heal + ' HP'); if (a.shield) nums.push('shield ' + a.shield);
      if (a.roll) nums.push(a.roll.pct + '% to hit (d20 +' + a.roll.bonus + ' vs Defense ' + a.roll.need + (a.roll.cover ? ', cover' : '') + ')');
      const seen = new Set<string>(); for (const s of a.saves) { const t = (FAM[s.fam] || s.fam) + ' save TN ' + s.tn + ' vs ' + (s.cond === 'teleport' ? 'the teleport' : condName(s.cond)); if (!seen.has(t)) { seen.add(t); nums.push(t); } }
      for (const n of a.notes) nums.push(n);
      if (cmdText && a.saves.some((s: any) => s.cond === 'commanded')) nums.push(cmdText);
      if (a.jump) nums.push('CHAIN jump ' + a.jump); if (a.hits > 1) nums.push(a.hits + ' hits');
      if (!nums.length) nums.push('affected');
    } else nums.push(a.kinSpared ? 'KIN spares them' : SKIP[a.skipped] || a.skipped);
    const text = nums.join(' · ');
    out.affected.push({ key: a.unit, unit: a.unit, name: a.name, tag, ink, text, at: a.at });
    mark(a.at, { key: 'who', text: tag === 'SPARED (KIN)' ? 'SPARED' : tag, style: badge(ink) + '; left: 50%; top: -1px; transform: translateX(-50%)', title: a.name + ': ' + text }, tag.toLowerCase() + ': ' + text);
    const t = T(a.at); t.layer = (t.layer ? t.layer + '; ' : '') + 'outline: 2px ' + (a.kinSpared || a.skipped ? 'dashed ' : 'solid ') + ink + '; outline-offset: -2px';
  }
  // LEECH: the caster's heal, shown before the Evoke (engine plan.leech).
  if (show.leech) {
    out.leech = show.leech;
    const text = 'LEECH: +' + show.leech.heal + ' HP if every hit lands' + (show.leech.restored !== show.leech.heal ? ' (restores ' + show.leech.restored + ', your HP is near full)' : '') + ' · about ' + show.leech.expected + ' expected';
    out.affected.push({ key: 'leech', unit: u.id, name: u.name, tag: 'YOU', ink: ALLY_INK, text, at: u.pos, extra: true });
    mark(u.pos, { key: 'leech', text: '+' + show.leech.heal + ' HP', style: badge('#6FEA77') + '; ' + CORNER.bl, title: text }, text);
  }
  if (out.nulls.length) out.affected.push({ key: 'null', unit: '', name: 'NULL', tag: 'UNMAKES', ink: SIGIL_GLOW, text: out.nulls.map((n) => (n.mine ? 'your ' : 'hostile ') + (NULL_NAME[n.kind] || n.kind).toLowerCase() + ' at ' + n.tiles.map(refOf).join(', ')).join(' · '), at: '', extra: true });
  if (cmd === 'move' && !choice.orderTo) for (const k of out.orderTo) mark(k, { key: 'orderto', text: '', style: 'position: absolute; inset: 30%; z-index: 4; pointer-events: none; border: 2px dashed #E3BF51', title: 'COMMAND may send them here' }, 'COMMAND may send them here');
  if (cmd === 'move' && choice.orderTo) mark(choice.orderTo, { key: 'orderat', text: '⚑ GO', style: badge('#E3BF51') + '; ' + CORNER.br, title: 'COMMAND: they walk here' }, 'COMMAND: they walk here');
  // The walk it would take (spec 9.5: where it would leave a creature), step by step, the last tile where it stops.
  if (cmd === 'move' && choice.orderTo) out.orderPath.forEach((k, i) => { if (k !== choice.orderTo) mark(k, { key: 'orderpath', text: '·' + (i + 1), style: badge('transparent', '#E3BF51') + '; ' + CORNER.c + '; font-size: 12px', title: 'COMMAND: step ' + (i + 1) + ' of the walk' }, 'COMMAND: step ' + (i + 1) + ' of the walk'); });
  // 8. fizzle
  out.fizzle = !!show.ok && !!show.fizzle;
  out.fizzleText = out.fizzle ? 'Nothing it may affect: this spell will fizzle (its charge, AP and Flux are spent and its glyphs fade).' : '';
  // COMMAND's order
  if (sp && sp.uniqueSubjects.includes('command')) out.orders = (SIGIL.command as any)?.orders || ORDERS_DEFAULT;
  // stage and hint
  const stepWhy = base.missiles.find((m: any) => m.why && m.stepTo && m.stepTo.length);
  if (stepWhy && !choice.dest) { for (const k of stepWhy.stepTo) { out.stepTo.add(k); mark(k, { key: 'stepto', text: '', style: 'position: absolute; inset: 30%; z-index: 4; pointer-events: none; border: 2px dashed #FFFFFF', title: 'STEP may land here' }, 'STEP may land here'); } }
  if (!aims.length) { out.stage = 'aim'; out.hint = 'Pick a target in the tinted area' + (out.range ? ' (' + (out.range === 1 ? 'Touch, 1 tile' : 'range ' + out.range) + ')' : '') + ', or yourself. Hover to see where it goes.'; }
  else if (aims.length < out.missilesNeeded && !base.ok) { out.stage = 'aim'; out.hint = 'TWICE: pick missile ' + (aims.length + 1) + ' of ' + out.missilesNeeded + ' (or Confirm: the engine aims the rest at the nearest).'; }
  else if (stepWhy && !choice.dest) { out.stage = 'dest'; out.hint = 'Pick where STEP lands them: a dashed tile up to 4 away.'; }
  else if (out.orders && choice.order === 'move' && !choice.orderTo) { out.stage = 'order'; out.hint = 'COMMAND · move: pick the tile they must walk to (up to 3 tiles).'; }
  else if (base.ok) { out.stage = 'ready'; out.hint = 'Confirm to Evoke.'; }
  else { out.stage = 'aim'; out.hint = base.why || 'Pick another target.'; }
  out.ok = out.stage === 'ready' && !!base.ok; out.why = base.ok ? '' : base.why || '';
  if (out.ok || (aims.length && out.missilesNeeded > 1 && aims.length < out.missilesNeeded)) {
    out.payload = { tile, aim: aims[0], ...(aims.length > 1 ? { aims } : {}), ...(choice.dest ? { dest: choice.dest } : {}), ...(out.orders && choice.order ? { order: choice.order } : {}), ...(choice.orderTo ? { orderTo: choice.orderTo } : {}), ...(paint ? { paint } : {}) };
  }
  if (aims.length && out.missilesNeeded > 1 && aims.length < out.missilesNeeded && base.ok) { out.stage = 'ready'; out.ok = true; out.hint = 'Confirm: the engine aims the other missile' + (out.missilesNeeded - aims.length > 1 ? 's' : '') + ' at the nearest target, or pick ' + (out.missilesNeeded - aims.length > 1 ? 'them' : 'it') + '.'; }
  return out;
}
const LIGHT_LAYER = 'background: rgba(255, 248, 225, 0.08)';
const NULL_NAME: Record<string, string> = { glyph: 'GLYPH', field: 'FIELD', trap: 'TRAP', turret: 'TURRET', veil: 'SMOKE', light: 'LIGHT', raise: 'WALL' };
const ORDER_TEXT: Record<string, string> = { halt: 'halts (no move, no attack)', kneel: 'kneels (falls Prone)', drop: 'drops its weapon' };
/** A turret's reach (dotted cyan) and the creatures it would fire at now ("NEXT"), on a tile overlay. */
function turretMarks(mark: (k: string, m: SgMark, note?: string) => void, cb: any, t: { reach: string[]; range: number; next: string[] }, key: string, preview: boolean) {
  const what = preview ? 'the turret will reach' : 'in the turret\'s reach';
  for (const k of t.reach) mark(k, { key: key + 'r', text: '', style: 'position: absolute; inset: 2px; z-index: 1; pointer-events: none; border: 1px dotted ' + SIGIL_GLOW, title: what + ' (range ' + t.range + ')' }, what + ' (range ' + t.range + ')');
  t.next.forEach((id, i) => { const x = (cb.units || []).find((y: any) => y.id === id); if (x) mark(x.pos, { key: key + 'n' + i, text: '▲ NEXT', style: badge(SIGIL_GLOW) + '; ' + CORNER.br, title: 'the turret would fire at ' + x.name + ' now (the nearest it may affect)' }, 'the turret would fire at ' + x.name + ' now'); });
}
const nameOf = (cb: any, id: string) => cb.units.find((x: any) => x.id === id)?.name || 'them';
/** What a click on a tile does while Evoking: the next choice, a new pattern, or a message for the player. */
export function evokeClick(v: EvokeView | null, cb: any, u: any, k: string, choice: EvokeChoice): { pattern?: string; choice?: EvokeChoice; toast?: string } {
  const ownGlyph = (cb.glyphs || []).some((g: any) => g.pos === k && g.side === (u ? u.side : 'pc'));
  const inPattern = !!v && !!v.pattern && v.tiles[k]?.marks.some((m) => m.key === 'pat');
  if (!v || v.stage === 'none') return (cb.glyphs || []).some((g: any) => g.pos === k) ? { pattern: k, choice: {} } : { toast: 'Click a glyph of a Line.' };
  if (ownGlyph && !inPattern && !v.pickable.has(k)) return { pattern: k, choice: {} };
  if (v.stage === 'stand') { const o = v.origins.find((x) => x.tile === k); return { toast: o ? (o.ok ? 'Move onto ' + refOf(k) + ' first: from there it fires ' + o.arrow + '.' : 'Not from ' + refOf(k) + ': ' + o.why) : v.hint } }
  if (v.stepTo.has(k) && (v.stage === 'dest' || choice.dest)) return { choice: { ...choice, dest: k } };
  if (v.stage === 'order' || (choice.order === 'move' && v.orders && !choice.orderTo && (choice.aims || []).length)) {
    if (v.orderTo.size && !v.orderTo.has(k)) return { toast: 'COMMAND sends them at most ' + ((SIGIL.command as any)?.move_tiles ?? 3) + ' tiles: pick a dashed tile.' };
    return { choice: { ...choice, orderTo: k } };
  }
  if (v.pickable.has(k) || v.area.has(k)) {
    const aims = [...(choice.aims || [])], i = aims.indexOf(k);
    if (i >= 0) { aims.splice(i, 1); return { choice: { ...choice, aims, dest: null } }; }
    if (aims.length >= v.missilesNeeded) aims[aims.length - 1] = k; else aims.push(k);
    return { choice: { ...choice, aims, dest: null } };
  }
  return { toast: 'Out of the area: pick a tinted tile, or yourself.' };
}

// ---------- 9. placed magic ----------
export interface PlacedRow { key: string; kind: string; label: string; who: string; mine: boolean; tiles: string[]; text: string }
/** Fields, traps, turrets, smoke, light and RAISE walls a side can see (spec 9.9), drawn per tile, plus a row each for
 * the legend. Enemy traps show only once spotted (the engine's placedMagic). */
export function placedView(cb: any, side: 'pc' | 'foe' = 'pc'): { tiles: Record<string, SgTile>; rows: PlacedRow[]; kinds: Set<string> } {
  const tiles: Record<string, SgTile> = {}, rows: PlacedRow[] = [], kinds = new Set<string>();
  let list: any[] = []; try { list = placedMagic(view(cb) as any, side); } catch { list = []; }
  const T = (k: string) => (tiles[k] ||= { layer: '', marks: [], note: '' });
  for (const z of list) {
    if ((cb.zones || []).some((x: any) => x.id === z.id && secretFrom(x, side))) continue;
    kinds.add(z.kind);
    const ink = z.mine ? SIGIL_GLOW : HOSTILE_INK, owner = z.mine ? 'yours' : 'hostile', rounds = z.left >= 90 ? 'for the scene' : z.left + (z.left === 1 ? ' round' : ' rounds') + ' left';
    const words = (z.words || []).filter((w: string) => SIGIL[w]).map(up).join(' · ');
    // A Grand form (the Grand Sigilist's staff): its word's tint on every tile, a bright edge ring, the staff badge
    // (◎ WORD and rounds left) and the form's one line in every tile's tooltip. The moving look is fx/grand.ts.
    if (z.kind === 'grand') {
      const w = (z.words || [])[0] || '', L = grandLook(w), c: string = z.centre || z.tiles[0], [cx, cy] = c.split(',').map(Number);
      const form = (SIGIL as any)[w]?.grand || '', gtext = 'Grand ' + up(w) + ' (' + (z.who || owner) + '\'s staff at ' + refOf(c) + ', ' + rounds + '): ' + form;
      rows.push({ key: z.id, kind: 'grand', label: 'Grand ' + up(w), who: z.who || '', mine: !!z.mine, tiles: z.tiles, text: gtext });
      for (const k of z.tiles) {
        const [x, y] = k.split(',').map(Number), edge = Math.max(Math.abs(x - cx), Math.abs(y - cy)) >= 2, t = T(k);
        t.layer = 'background: ' + grandTint(w, 0.16) + (edge ? '; box-shadow: inset 0 0 0 2px ' + L.tint : '');
        t.note += (t.note ? ' · ' : '') + gtext;
        if (k === c) t.marks.push({ key: 'gs' + z.id, text: '◎ ' + up(w) + ' ' + z.left, style: badge(L.tint) + '; ' + CORNER.br, title: gtext });
      }
      continue;
    }
    let label = '', layer = '', text = '', badgeText = '';
    if (z.kind === 'field') { label = (z.element ? up(z.element) + ' ' : '') + 'field'; layer = 'background: ' + tintOf(z.element) + '; box-shadow: inset 0 0 0 2px ' + ink; badgeText = '▦' + z.left; text = words + ' field (' + owner + '): hits whoever enters or starts a turn there, full the first time, half after, ' + rounds; }
    else if (z.kind === 'trap') { label = z.mine ? 'Your trap' : 'Spotted trap'; layer = 'box-shadow: inset 0 0 0 2px ' + ink + '; background: repeating-linear-gradient(45deg, rgba(79, 200, 223, 0.08) 0 4px, transparent 4px 8px)'; badgeText = '⧗' + (z.triggers != null ? '×' + z.triggers : ''); text = (z.mine ? words + ' trap (yours, hidden from the other side)' : 'hostile Sigil trap (spotted)' + (words ? ': ' + words : '')) + ', goes off when someone steps on it, ' + rounds; }
    else if (z.kind === 'turret') { label = 'Turret'; layer = 'box-shadow: inset 0 0 0 2px ' + ink; badgeText = '▲' + z.left + (z.hp != null ? ' ' + z.hp + 'hp' : ''); text = words + ' turret (' + owner + '), shoots the nearest creature it can reach each round, ' + rounds + (z.hp != null ? ', ' + z.hp + ' HP' : ''); }
    else if (z.kind === 'raise') { label = 'RAISE wall'; layer = 'background: rgba(201, 211, 227, 0.32); box-shadow: inset 0 0 0 2px ' + ink; badgeText = '▇' + (z.hp != null ? z.hp : ''); text = 'RAISE wall (' + owner + '): blocks movement and sight' + (z.hp != null ? ', ' + z.hp + ' HP' : '') + ', ' + rounds; }
    else if (z.kind === 'veil') { label = 'Smoke'; layer = 'background: rgba(120, 128, 142, 0.55)'; text = 'smoke (blocks sight), ' + rounds; }
    else if (z.kind === 'light') { label = 'Light'; layer = 'background: rgba(255, 248, 225, 0.08); box-shadow: inset 0 0 12px rgba(255, 248, 225, 0.3)'; text = 'magic light (reveals the Hidden), ' + rounds; }
    else continue;
    if (z.kind === 'turret' && z.reach) {
      const nx = (z.next || []).map((id: string) => nameOf(cb, id));
      text += '; reach ' + z.range + (z.range === 1 ? ' tile' : ' tiles') + (nx.length ? ', would fire at ' + nx.join(', ') + ' now' : ', nobody in reach now');
      turretMarks((k, m, note) => { const t = T(k); if (!t.marks.some((x) => x.key === m.key)) t.marks.push(m); if (note) t.note += (t.note ? ' · ' : '') + note; }, cb, { reach: z.reach, range: z.range ?? 1, next: z.next || [] }, 'pr' + z.id, false);
    }
    rows.push({ key: z.id, kind: z.kind, label, who: z.who || '', mine: !!z.mine, tiles: z.tiles, text });
    const first = z.kind === 'field' || z.kind === 'veil' || z.kind === 'light' ? z.tiles[0] : null;
    for (const k of z.tiles) {
      const t = T(k); t.layer = t.layer && z.kind === 'light' ? t.layer : layer; t.note += (t.note ? ' · ' : '') + text;
      if (badgeText && (!first || k === first)) t.marks.push({ key: 'pl' + z.id, text: badgeText, style: badge(z.mine ? SIGIL_GLOW : HOSTILE_INK) + '; ' + CORNER.br, title: text });
    }
  }
  return { tiles, rows, kinds };
}
/** The legend rows for the placed magic and glyphs on the map. */
export function placedLegend(kinds: Set<string>, anyGlyph: boolean): { key: string; img?: string; box?: string; name: string }[] {
  const out: { key: string; img?: string; box?: string; name: string }[] = [];
  if (anyGlyph) out.push({ key: 'gl', img: glyphUri('fire', SIGIL_INK, { glow: true, frame: false }), name: 'Your side\'s glyph' }, { key: 'gf', img: glyphUri('fire', HOSTILE_INK, { frame: false }), name: 'Hostile glyph you can read' }, { key: 'gs', img: scratchUri(HOSTILE_INK), name: 'Unreadable glyph' });
  const box = (s: string) => 'width: 14px; height: 14px; border-radius: 2px; ' + s;
  if (kinds.has('field')) out.push({ key: 'zf', box: box('background: ' + ELEMENT_TINT.fire + '; box-shadow: inset 0 0 0 2px ' + SIGIL_GLOW), name: '▦ Field (tinted by its element; hurts whoever enters: full the first time, half after)' });
  if (kinds.has('trap')) out.push({ key: 'zt', box: box('box-shadow: inset 0 0 0 2px ' + SIGIL_GLOW + '; background: repeating-linear-gradient(45deg, rgba(79, 200, 223, 0.2) 0 3px, transparent 3px 6px)'), name: '⧗ Trap (yours, or a spotted one)' });
  if (kinds.has('turret')) out.push({ key: 'zu', box: box('box-shadow: inset 0 0 0 2px ' + SIGIL_GLOW), name: '▲ Turret (rounds left, HP)' });
  if (kinds.has('raise')) out.push({ key: 'zr', box: box('background: rgba(201, 211, 227, 0.32)'), name: '▇ RAISE wall (HP)' });
  if (kinds.has('veil')) out.push({ key: 'zv', box: box('background: rgba(120, 128, 142, 0.55)'), name: 'Smoke (blocks sight)' });
  if (kinds.has('grand')) out.push({ key: 'zg', box: box('background: rgba(79, 200, 223, 0.16); box-shadow: inset 0 0 0 2px ' + SIGIL_GLOW), name: '◎ Grand form (radius 2 round the planted staff; hover a tile for what it does)' });
  if (kinds.has('light')) out.push({ key: 'zl', box: box('background: rgba(255, 248, 225, 0.12); box-shadow: inset 0 0 6px rgba(255, 248, 225, 0.5)'), name: 'Magic light' });
  return out;
}
// ---------- class moves and perks that cast (spec 9: everything shown before it goes off; item 489 c) ----------
/** A perk or class action's preview on the grid: the area it may aim into (tinted), the tiles it covers (its Burst, a
 * zone), and who it affects, allies marked apart from enemies. Sigil moves paint Mind cyan; others a neutral white. */
export function actionPreviewTiles(cb: any, pv: { area?: string[]; tiles?: string[]; targets?: string[]; sigil?: boolean } | null | undefined, side: 'pc' | 'foe' = 'pc'): Record<string, SgTile> {
  const out: Record<string, SgTile> = {}; if (!pv) return out;
  const T = (k: string) => (out[k] ||= { layer: '', marks: [], note: '' });
  const ink = pv.sigil ? SIGIL_GLOW : '#E7EBF3', tint = pv.sigil ? 'rgba(79, 200, 223, 0.13)' : 'rgba(231, 235, 243, 0.08)', cover = pv.sigil ? 'rgba(79, 200, 223, 0.28)' : 'rgba(231, 235, 243, 0.18)';
  for (const k of pv.area || []) { const t = T(k); t.layer = 'background: ' + tint + '; box-shadow: inset 0 0 0 1px ' + ink; t.note += (t.note ? ' · ' : '') + 'it may aim here'; }
  for (const k of pv.tiles || []) { const t = T(k); t.layer = 'background: ' + cover + '; box-shadow: inset 0 0 0 2px ' + ink; t.note += (t.note ? ' · ' : '') + 'it covers this tile'; }
  for (const id of pv.targets || []) {
    const x = (cb.units || []).find((y: any) => y.id === id); if (!x || x.dead) continue;
    const ally = x.side === side, mk = ally ? ALLY_INK : HOSTILE_INK, tag = ally ? 'ALLY' : 'ENEMY', t = T(x.pos);
    t.marks.push({ key: 'pkwho', text: tag, style: badge(mk) + '; left: 50%; top: -1px; transform: translateX(-50%)', title: x.name + ': affected' });
    t.layer = (t.layer ? t.layer + '; ' : '') + 'outline: 2px solid ' + mk + '; outline-offset: -2px'; t.note += (t.note ? ' · ' : '') + tag.toLowerCase() + ': affected';
  }
  return out;
}
/** Merge two tile overlays (placed magic under the Evoke plan). */
export function mergeTiles(a: Record<string, SgTile>, b: Record<string, SgTile>): Record<string, SgTile> {
  const out: Record<string, SgTile> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const x = a[k], y = b[k]; out[k] = { layer: [x?.layer, y?.layer].filter(Boolean).join('; '), marks: [...(x?.marks || []), ...(y?.marks || [])], note: [x?.note, y?.note].filter(Boolean).join(' · ') }; }
  return out;
}
/** Element identity for a word (for fx and tooltips): rider and look, shared later with Soul Outbursts. */
export const elementOf = (w: string) => (SIGIL_ELEMENTS as any)[w] || null;
/** dist re-exported for the screens' own small checks. */
export { dist };
