// Blessing 2.0 (rules 1.6) effects: what an answered prayer looks and sounds like. Driven by the engine's faith FX events
// (docs/design/handoffs/_archive/blessing-implementer-1-engine.md, the contract; payloads below), drawn by this layer like every
// other effect, so everyone sees the same thing. Faith's words are Virtue ink; its light is gold; each patron's accent
// colours light and particles only, never text.
//   prayer       {unit, kind: whisper|hymn|miracle, id, patron, at, target, ok}
//   prayer_fail  {unit, kind, id, patron, at}                  silence, the mark fading
//   witnessed    {unit, patron, at}                            an eye opening above the caster
//   intervention {unit, patron, trigger, target, amount, at}   routed to playIntervention in game/cutIn.ts (today: a sharp
//                bell, the mark flashing at the trigger, "<PATRON> INTERVENES"; the small cut-in is the trigger left
//                for later: docs/design/faith-presence-spec.md section 3)
//   devotion     {char, delta, xp, reason, tag?, now, was, level?, at?}  "+1 DEVOTION XP · <tag>" in Virtue ink with a gold
//                mark (delta is XP, rules 1.6.1); a level change (level set) adds "DEVOTION 5", the mark lit
//   leave        {char, patron, to, letGo, roll?}              leaving a patron for another: "LET GO · <patron>" or "HELD · <patron>"
//   grudge       {char, patron, sessions, condition, at?, unit?}  "GRUDGE · <patron>" in complication red, the old mark dim
//   vow          {unit, id, state: sworn|kept|broken|fulfilled, at}  a seal stamped (sworn), lit (kept) or cracked (broken);
//                fulfilled (rules 1.22: {cut, left}): the seal glints and the Hymn's wait is said
//   patron_line  {patron, event, text}                         a card in the log (the screens draw it); a glint here
//   miracle      {patron, id, at, area, unit, char, name, text, line, summary}  the cut-in (game/cutIn.ts, Faith 2.2, spec
//                2.3): the patron's portrait over the whole screen, the god calling the devoted by name with the grant
//                line, the pull-away and the zoom to where it lands, the effect, then a box of what it did (~6 s, skippable)
// Fog: every map effect goes through the kit's at() (null where the viewer can't see); a Miracle's answer is heard by
// everyone. Reduce motion: still marks and short fades, no rays or particles.
import { CLASS, FAITH_PATRON, FAITH_RULES, FAITH_TAG, WHISPER, type FxEvent } from '@engine';
import { thread, windUp } from './figments';
import { elementId } from './elements';
import { reducedMotion, type Sfx } from '../sfx';
import { type Pt, anim, after, burst, floatText, fxMarker, put, ring, svg } from './dom';
import { FAITH_GOLD, FAITH_INK, accentOf, patronFace, patronMarkUri, witnessedUri, vowIconUri, prayerIconUri } from '../faithArt';
import { cutInTiming, miracleCutIn, playIntervention, showCutIn } from '../cutIn';

export interface FaithKit {
  at: (k: string | null | undefined) => Pt | null;
  posOf: (unitId: string | null | undefined) => string | undefined;
  /** A unit's token on the map (the one who prays bows or raises a hand before the light travels). */
  tokOf?: (unitId: string | null | undefined, fallback?: string) => HTMLElement | null;
  /** The patron a fighting character is Faithful to (null: an Atheist, or no character). */
  patronOfUnit?: (unitId: string | null | undefined) => string | null;
  /** A character's tile in the fight on screen (Devotion events name the character). */
  posOfChar?: (charId: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  /** A character's name (the Miracle's cut-in calls the devoted by it). */
  nameOfChar?: (charId: string | null | undefined) => string | undefined;
  /** Can the viewer see this tile (fog)? */
  visible?: (key: string) => boolean;
  /** A unit's side (a prayer's light lifts an ally and jolts a foe). */
  sideOf?: (unitId: string | null | undefined) => string | null;
  /** A skipped cut-in moves the effects queue up by ms (fx/play.ts hurryFx). */
  hurry?: (ms: number) => void;
}

/** A white mark (a patron's emblem or a prayer icon) at a point: scaled in, held, faded. */
function mark(src: string, p: Pt, size: number, ms: number, o: { delay?: number; from?: number; to?: number; glow?: string; opacity?: number } = {}) {
  const run = () => {
    const img = document.createElement('img'); img.src = src; img.alt = ''; img.style.cssText = 'width:100%;height:100%;display:block' + (o.glow ? ';filter:drop-shadow(0 0 6px ' + o.glow + ') drop-shadow(0 0 14px ' + o.glow + ')' : '');
    const box = put(img, p, size, size, ms); box.style.zIndex = '4';
    const rm = reducedMotion(), op = o.opacity ?? 1;
    anim(box, rm ? [{ opacity: 0 }, { opacity: op, offset: 0.2 }, { opacity: op, offset: 0.75 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'scale(' + (o.from ?? 0.6) + ')' }, { opacity: op, transform: 'scale(1)', offset: 0.25 }, { opacity: op, transform: 'scale(1)', offset: 0.7 }, { opacity: 0, transform: 'scale(' + (o.to ?? 1.15) + ')' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** Rays of light falling onto a point, in a colour (particles only). */
function rays(p: Pt, color: string, n: number, ms: number, delay = 0) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI - Math.PI, len = p.s * (1.6 + (i % 2) * 0.6);
    after(() => {
      const d = document.createElement('div');
      d.style.cssText = 'width:100%;height:100%;background:linear-gradient(to top,' + color + ',rgba(255,255,255,0));border-radius:2px;mix-blend-mode:screen';
      const box = put(d, { x: p.x + Math.cos(a) * p.s * 0.15, y: p.y - len / 2 }, Math.max(3, p.s * 0.08), len, ms);
      box.style.transformOrigin = '50% 100%';
      anim(box, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 0.9, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
    }, delay + i * 40);
  }
}

/** How long the Hymn's face stays over a head (spec 2.2: about 1.5 s); a miss greys and goes sooner. */
export const FACE_MS = 1500, FACE_MISS_MS = 1100;
/** The face over a head, so Witnessed's eye waits for it (they sit in the same place): unit → when it goes. */
const faceUntil = new Map<string, number>();
/** Where something sits over a token's head: the centre for a box of height h above the token (kept on screen). */
function overHead(p: Pt, h: number, gap = 6): Pt {
  const y = p.y - p.s * 0.5 - gap - h / 2;
  return { x: p.x, y: Math.max(h / 2 + 4, y), s: p.s };
}
/** A Hymn (Faith 2.2, spec 2.2): a square crop of the patron's portrait (the face or the mask: faithArt.ts PORTRAIT_FACE)
 *  over the praying character's head, framed in the patron's accent, about 1.5 s. On a miss it greys and fades. Where
 *  the patron has no painting, its mark sits in the frame. */
export function faceOverHead(patron: string, p: Pt, o: { accent: string; miss?: boolean; unit?: string | null }): HTMLElement {
  const f = patronFace(patron), sz = Math.round(Math.max(40, Math.min(88, p.s * 1.25))), ms = o.miss ? FACE_MISS_MS : FACE_MS;
  const frame = document.createElement('div');
  frame.setAttribute('data-phc-faith-face', patron || '');
  if (o.miss) frame.setAttribute('data-phc-faith-miss', '1');
  frame.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;border-radius:7px;background:#05070B;box-sizing:border-box;border:2px solid ' + o.accent
    + ';box-shadow:0 0 0 1px rgba(0,0,0,.65),0 0 10px ' + o.accent + ',0 0 26px ' + o.accent + '88';
  const img = document.createElement('img'); img.src = f.src; img.alt = ''; img.style.cssText = f.imgStyle.replace(/; /g, ';'); frame.appendChild(img);
  const box = put(frame, overHead(p, sz), sz, sz, ms); box.style.zIndex = '5';
  if (o.unit) faceUntil.set(o.unit, Date.now() + ms);
  const rm = reducedMotion();
  if (o.miss) {
    // It answers nothing: the face goes grey and dim as it fades.
    anim(box, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.15, filter: 'none' }, { opacity: 0.85, offset: 0.45, filter: 'grayscale(1) brightness(.55)' }, { opacity: 0, filter: 'grayscale(1) brightness(.5)' }]
      : [{ opacity: 0, transform: 'translateY(6px) scale(.8)', filter: 'none' }, { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'none', offset: 0.18 },
        { opacity: 0.85, transform: 'translateY(1px) scale(.98)', filter: 'grayscale(1) brightness(.55)', offset: 0.45 }, { opacity: 0, transform: 'translateY(8px) scale(.94)', filter: 'grayscale(1) brightness(.45)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  } else {
    anim(box, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translateY(10px) scale(.7)' }, { opacity: 1, transform: 'translateY(0) scale(1.04)', offset: 0.16 }, { opacity: 1, transform: 'translateY(-2px) scale(1)', offset: 0.3 },
        { opacity: 1, transform: 'translateY(-4px) scale(1)', offset: 0.8 }, { opacity: 0, transform: 'translateY(-10px) scale(1.03)' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    if (!rm) burst('glow', overHead(p, sz), sz * 1.9, 700, { color: o.accent, blend: 'screen', from: 0.5, to: 1.1 });
  }
  return frame;
}
/** A Whisper (spec 2.1): the Whisper's own prayer icon rises over the praying character's head, lit gold (no portrait);
 *  on a miss it rises grey and sinks back. */
export function whisperOverHead(id: string, p: Pt, o: { miss?: boolean } = {}): HTMLElement {
  const sz = Math.round(Math.max(26, Math.min(56, p.s * 0.7))), ms = o.miss ? 900 : 1200, rise = Math.max(8, p.s * 0.35);
  const img = document.createElement('img'); img.src = prayerIconUri('whisper', id); img.alt = '';
  img.setAttribute('data-phc-faith-whisper', id || '');
  if (o.miss) img.setAttribute('data-phc-faith-miss', '1');
  img.style.cssText = 'width:100%;height:100%;display:block;' + (o.miss ? 'filter:grayscale(1) brightness(.6)' : 'filter:drop-shadow(0 0 5px ' + FAITH_GOLD + ') drop-shadow(0 0 12px ' + FAITH_GOLD + ')');
  const box = put(img, overHead(p, sz, 4), sz, sz, ms); box.style.zIndex = '5';
  anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: o.miss ? 0.6 : 1, offset: 0.2 }, { opacity: o.miss ? 0.6 : 1, offset: 0.75 }, { opacity: 0 }]
    : o.miss ? [{ opacity: 0, transform: 'translateY(' + rise * 0.6 + 'px)' }, { opacity: 0.6, transform: 'translateY(0)', offset: 0.35 }, { opacity: 0, transform: 'translateY(' + rise * 0.5 + 'px)' }]
    : [{ opacity: 0, transform: 'translateY(' + rise + 'px) scale(.7)' }, { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.3 }, { opacity: 1, transform: 'translateY(-' + rise * 0.3 + 'px) scale(1)', offset: 0.75 }, { opacity: 0, transform: 'translateY(-' + rise * 0.6 + 'px) scale(1.05)' }],
    { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  return img;
}

/** A Devotion event's float (rules 1.6.1: the delta is XP): "+1 DEVOTION XP · HEAL", "−3 DEVOTION XP". */
export function devotionWord(e: { delta?: number; tag?: string }): string {
  const d = Number(e.delta) || 0;
  return (d > 0 ? '+' : '−') + Math.abs(d) + ' DEVOTION XP' + (e.tag ? ' · ' + String(e.tag).toUpperCase() : '');
}

// ---------- prayer 2.0 (rules 1.56): the Chaplain's own moments ----------
// The engine sends these as the fx of a data row (classes.json guardian): emitted at the row's holder, after its effect.
//   smite      {target: the Chaplain}            after the Smite's damage on the foe (the batch's hurt before it)
//   ward_seal  {target: the Chaplain}            after the Ward's shield on the ally (the batch's boon ward before it)
//   canticle   {target: the Chaplain, verse}     the song sung, the verse it reached (1, 2, 3)
//   canticle_break {target: the Chaplain}        a wound broke the song
//   amen       {target: the Chaplain}            after the Amen's damage on the foe (the hurt before it)
//   holy_dread {target: the Chaplain}            after Shaken was put on (or resisted by) the foe (the cond before it)
//   last_rites {target: the Chaplain}            before a prayer's heal on a Downed ally (the prayer after it names them)
//   roll       {why: 'pray', die, total, tn, ok} an Atheist's prayer by dice (rolls.ts rollVs)
/** The kinds this part draws. */
export const CHAPLAIN_FX = ['smite', 'ward_seal', 'canticle', 'canticle_break', 'amen', 'holy_dread', 'last_rites'] as const;
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
/** A Devotion change in words, from the data's lines (patrons.json devotion.lines): who saw what. Pure (tests). */
export function devotionLine(e: { delta?: number; tag?: string; reason?: string }, patron: string | null | undefined): string {
  const d = Number(e.delta) || 0, L: any = (FAITH_RULES as any)?.devotion?.lines || {};
  const name = String((FAITH_PATRON as any)[patron || '']?.name || 'Your patron'), tag = e.tag ? String((FAITH_TAG as any)[e.tag]?.name || e.tag) : '';
  const which = e.tag ? (d < 0 ? 'taboo' : 'liked') : /vow/i.test(e.reason || '') ? 'vow' : /rite/i.test(e.reason || '') ? 'rite' : 'other';
  const line = String(L[which] || '').replace(/\{patron\}/g, name).replace(/\{tag\}/g, tag);
  return (d > 0 ? '+' : '−') + Math.abs(d) + ' DEVOTION XP' + (line ? ' · ' + line : '');
}
/** The word a Chaplain's moment shows (pure, tests). on: the unit it landed on, from faithBatch. */
export function chaplainWord(e: any): string {
  const n = Math.round(Number(e._on?.dmg ?? e._on?.amount) || 0);
  switch (e.k) {
    case 'smite': return 'SMITE' + (n ? ' −' + n : '');
    case 'ward_seal': return 'WARD' + (n ? ' +' + n : '');
    case 'canticle': return 'CANTICLE · VERSE ' + (ROMAN[Number(e.verse) || 1] || e.verse);
    case 'canticle_break': return 'THE SONG BREAKS';
    case 'amen': return 'AMEN' + (n ? ' −' + n : '');
    case 'holy_dread': return e._on?.resisted ? 'HOLY DREAD · HELD FAST' : 'HOLY DREAD';
    case 'last_rites': return 'LAST RITES';
    case 'roll': return (e.total ?? e.die) + ' vs ' + e.tn + ' · ' + (e.ok ? 'ANSWERED' : 'UNANSWERED');
    default: return '';
  }
}
/** Ties each Chaplain moment of a batch to the unit it landed on (pure; the queue calls it as a batch arrives): a row's
 *  fx is emitted at its holder, after its effect, so the effect's own event (the hurt of a Smite or an Amen, the boon of
 *  a Ward, the cond of Holy Dread) is just before it; Last Rites comes before its heal, and the prayer after it names the
 *  Downed ally. A Ward drawn as the Chaplain's seal tells its boon (_seal) not to draw the Sigil's brackets. */
export function faithBatch(evs: any[]): void {
  const back = (i: number, f: (x: any) => boolean) => { for (let j = i - 1; j >= Math.max(0, i - 6); j--) if (f(evs[j])) return evs[j]; return null; };
  const fwd = (i: number, f: (x: any) => boolean) => { for (let j = i + 1; j < Math.min(evs.length, i + 6); j++) if (f(evs[j])) return evs[j]; return null; };
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i]; if (!e || e._on) continue;
    if (e.k === 'smite' || e.k === 'amen') { const h = back(i, (x) => x.k === 'hurt'); if (h) e._on = { target: h.target, at: h.at, dmg: h.dmg }; }
    else if (e.k === 'ward_seal') { const b = back(i, (x) => x.k === 'boon' && x.word === 'ward'); if (b) { e._on = { target: b.target, at: b.at, amount: b.amount }; b._seal = 1; } }
    else if (e.k === 'holy_dread') { const c = back(i, (x) => x.k === 'cond' && x.id === 'shaken'); if (c) e._on = { target: c.target, at: c.at, resisted: !!c.resisted }; }
    else if (e.k === 'last_rites') { const p = fwd(i, (x) => x.k === 'prayer' && x.target) || back(i, (x) => x.k === 'prayer' && x.target); if (p) e._on = { target: p.target }; }
    else if (e.k === 'prayer' && !e._hits) prayerTies(evs, i);
  }
}
/** A prayer's entry in data (patrons.json): a Whisper by its id, a Hymn or the Miracle by the patron's own rows. */
export function prayerData(e: { kind?: string; id?: string; patron?: string | null }): any {
  // an id may come as the patron's key ("old_overcast.thunderclap", the action's own) or bare
  const raw = String(e.id || ''), dot = raw.indexOf('.'), id = dot >= 0 ? raw.slice(dot + 1) : raw, pat = String(e.patron || (dot >= 0 ? raw.slice(0, dot) : ''));
  if (e.kind === 'whisper') return (WHISPER as any)[id] || null;
  const p: any = (FAITH_PATRON as any)[pat]; if (!p) return null;
  if (e.kind === 'miracle') return p.miracle && (!id || p.miracle.id === id) ? p.miracle : null;
  return (p.hymns || []).find((h: any) => h.id === id) || null;
}
/** The element of a prayer's damage (its data's damage_type, as the elements read it), or null for plain light. */
export function prayerElement(entry: any): string | null {
  for (const x of entry?.effects || []) if (x && x.damage_type) { const el = elementId(x.damage_type); return el === 'raw' ? null : el; }
  return null;
}
/** Does the prayer's data wound (an HP change below zero, or a damage op)? Its light is the patron's then, cracked. */
export const prayerWounds = (entry: any): boolean => (entry?.effects || []).some((x: any) => (x?.stat === 'hp' && Number(x.value) < 0) || /damage|execute/.test(String(x?.op || '')));
const TILE = /^\d+,\d+$/;
/** Ties a prayer to what it did (pure; faithBatch): every unit the batch's effects land on until the next action (its
 *  targets: _hits, the units its light goes to), and the prayer's element (its data's damage_type) onto its wounds, so
 *  they look and sound like it (a hurt's own element wins). */
function prayerTies(evs: any[], i: number) {
  const e = evs[i], entry = prayerData(e), el = prayerElement(entry), hits: string[] = [];
  const add = (id: unknown) => { const s = id == null ? '' : String(id); if (s && s !== e.unit && !hits.includes(s)) hits.push(s); };
  if (e.target && !TILE.test(String(e.target))) add(e.target); // a tile prayer's target is its tile
  for (let j = i + 1; j < evs.length; j++) {
    const x = evs[j]; if (!x) continue;
    if (x.k === 'prayer' || x.k === 'turn' || x.k === 'shot' || x.k === 'melee' || x.k === 'move') break;
    if (x.k === 'hurt' || x.k === 'heal' || x.k === 'boon' || x.k === 'shove' || (x.k === 'cond' && x.target !== e.unit)) { add(x.target); e._effect = 1; }
    if (x.k === 'hurt' && el && !x.element) { x.element = el; x._prayer = 1; }
  }
  e._hits = hits; e._el = el; if (!e._effect) e._effect = 0;
}
/** A Ward that is the Chaplain's (faithBatch marked its boon): the boon draws nothing; the seal is drawn instead. */
export const sealedBoon = (e: any): boolean => !!e && e.k === 'boon' && !!e._seal;

/** How far a song reaches (tiles), read from the class move whose row sends this fx kind (classes.json): the first verse's
 *  condition (on you and your side within N), and from the third verse the widest of its conditions. No number here. */
export function songReach(k: string, verse: number): number {
  const walk = (xs: any[], out: any[]) => { for (const x of xs || []) { if (!x || typeof x !== 'object') continue; out.push(x); walk(x.effects, out); } return out; };
  let found: number | null = null;
  const visit = (o: any, depth: number) => {
    if (found != null || !o || typeof o !== 'object' || depth > 8) return;
    if (Array.isArray(o.effects)) {
      const all = walk(o.effects, []);
      if (all.some((x) => x.fx && x.fx.k === k)) {
        const within = all.filter((x) => x.op === 'condition' && x.targets?.of === 'self' && Number.isFinite(Number(x.targets?.within))).map((x) => Number(x.targets.within));
        if (within.length) { found = verse >= 3 ? Math.max(...within) : within[0]; return; }
      }
    }
    for (const v of Array.isArray(o) ? o : Object.values(o)) visit(v, depth + 1);
  };
  visit(CLASS, 0);
  return found ?? 1;
}
/** An SVG line drawn by stroke-dashoffset (the light of a prayer travelling). */
function lightLine(a: Pt, b: Pt, color: string, ms: number, o: { width?: number; delay?: number; jag?: boolean } = {}) {
  const run = () => {
    const x0 = Math.min(a.x, b.x) - 8, y0 = Math.min(a.y, b.y) - 8, w = Math.abs(a.x - b.x) + 16, h = Math.abs(a.y - b.y) + 16;
    const ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0, len = Math.hypot(bx - ax, by - ay) || 1;
    // a crack: three segments that jog off the straight line
    const d = o.jag ? (() => { const nx = -(by - ay) / len, ny = (bx - ax) / len, j = Math.min(10, len * 0.08); const p1 = [ax + (bx - ax) / 3 + nx * j, ay + (by - ay) / 3 + ny * j], p2 = [ax + (bx - ax) * 2 / 3 - nx * j, ay + (by - ay) * 2 / 3 - ny * j]; return 'M' + ax + ' ' + ay + ' L' + p1.join(' ') + ' L' + p2.join(' ') + ' L' + bx + ' ' + by; })() : 'M' + ax + ' ' + ay + ' L' + bx + ' ' + by;
    const s = svg(w, h, '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (o.width || 1.5) + '" stroke-linecap="round" stroke-dasharray="' + (len * 1.4) + '" stroke-dashoffset="' + (len * 1.4) + '" style="filter:drop-shadow(0 0 3px ' + color + ')"/>');
    const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 300); box.style.zIndex = '4';
    const path = s.querySelector('path'); if (path) anim(path, [{ strokeDashoffset: String(len * 1.4) }, { strokeDashoffset: '0', offset: 0.6 }, { strokeDashoffset: '0', opacity: 0 }], { duration: ms + 300, easing: 'ease-out', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** A bolt from above onto a point: a jagged white line with a glow in the ink, then a flash (the storm's prayers). */
function bolt(q: Pt, ink: string) {
  const top = { x: q.x + (Math.random() - 0.5) * q.s * 0.6, y: Math.max(4, q.y - q.s * 3.2), s: q.s };
  lightLine(top, { ...q, y: q.y - q.s * 0.15 }, '#FFFFFF', 90, { jag: true, width: 2.5 });
  lightLine({ ...top, x: top.x + 3 }, { ...q, y: q.y - q.s * 0.1 }, ink, 110, { jag: true, width: 1.5, delay: 20 });
  if (!reducedMotion()) burst('glow', q, q.s * 1.1, 260, { color: '#FFFFFF', blend: 'screen', delay: 80 });
}
/** The acting token's own move: a bow (dip), a raised hand (rise and hold), a sway, a step toward. Off under Reduce motion. */
function tokenMove(tok: HTMLElement | null | undefined, how: 'bow' | 'raise' | 'sway' | 'tilt', ms = 220) {
  if (!tok || reducedMotion()) return;
  const f: Record<string, Keyframe[]> = {
    bow: [{ translate: '0 0' }, { translate: '0 3px', offset: 0.45 }, { translate: '0 0' }],
    raise: [{ translate: '0 0' }, { translate: '0 -4px', offset: 0.3 }, { translate: '0 -4px', offset: 0.75 }, { translate: '0 0' }],
    sway: [{ rotate: '0deg' }, { rotate: '-3deg', offset: 0.25 }, { rotate: '3deg', offset: 0.75 }, { rotate: '0deg' }],
    tilt: [{ translate: '0 0' }, { translate: '0 -2px', offset: 0.4 }, { translate: '0 0' }],
  };
  anim(tok, f[how], { duration: ms, easing: 'ease-in-out' });
}
/** A hexagon of six strokes closing around a point, one stroke at a time (the Chaplain's Ward). */
function hexSeal(p: Pt, color: string, ms: number) {
  const r = p.s * 0.62, pts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [r + 4 + Math.cos(a) * r, r + 4 + Math.sin(a) * r]; });
  const segs = pts.map((q, i) => { const n = pts[(i + 1) % 6]; return '<line x1="' + q[0] + '" y1="' + q[1] + '" x2="' + n[0] + '" y2="' + n[1] + '" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" opacity="0"/>'; }).join('');
  const s = svg(2 * r + 8, 2 * r + 8, segs), box = put(s, p, 2 * r + 8, 2 * r + 8, ms + 900); box.style.zIndex = '4';
  s.querySelectorAll('line').forEach((l, i) => anim(l, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms + 900, delay: reducedMotion() ? 0 : i * (ms / 6), fill: 'forwards' }));
}
/** A small eighth note (two lines and a dot), rising and drifting. */
function notes(p: Pt, color: string, n: number, ms: number) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) after(() => {
    const s = svg(16, 22, '<circle cx="5" cy="17" r="3.4" fill="' + color + '"/><line x1="8.2" y1="17" x2="8.2" y2="3" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round"/><line x1="8.2" y1="3" x2="14" y2="6.5" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round"/>');
    s.style.filter = 'drop-shadow(0 0 3px ' + color + ')';
    const box = put(s, { x: p.x + (i - 1) * p.s * 0.3, y: p.y - p.s * 0.45 }, 16, 22, ms); box.style.zIndex = '4';
    anim(box, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: 1, offset: 0.2 }, { opacity: 0, transform: 'translate(' + ((i - 1) * 6) + 'px,' + (-p.s * 0.8) + 'px)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  }, i * 110);
}
/** The song's ground: a dotted square outline of the tiles within `r` of a point (dashes that break when the song does). */
function songGround(p: Pt, r: number, color: string, ms: number, broken = false) {
  const side = (2 * r + 1) * p.s, s = svg(side + 4, side + 4, '<rect x="2" y="2" width="' + side + '" height="' + side + '" fill="' + color + '" fill-opacity="' + (broken ? 0 : 0.08) + '" stroke="' + color + '" stroke-width="2" stroke-dasharray="' + (broken ? '6 10' : '5 4') + '" rx="4"/>');
  const box = put(s, p, side + 4, side + 4, ms); box.style.zIndex = '2';
  anim(box, broken ? [{ opacity: 0.8 }, { opacity: 0, transform: 'scale(1.06)' }] : [{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0.85, offset: 0.7 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** A d20 outline (a hexagon with its inner triangle) spinning once over a point: an Atheist's prayer by dice. */
function d20Spin(p: Pt, color: string, ms: number) {
  const r = p.s * 0.3, c0 = r + 3, hex = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return (c0 + Math.cos(a) * r) + ',' + (c0 + Math.sin(a) * r); }).join(' ');
  const tri = [0, 2, 4].map((i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return (c0 + Math.cos(a) * r * 0.6) + ',' + (c0 + Math.sin(a) * r * 0.6); }).join(' ');
  const s = svg(2 * c0, 2 * c0, '<polygon points="' + hex + '" fill="none" stroke="' + color + '" stroke-width="1.5"/><polygon points="' + tri + '" fill="none" stroke="' + color + '" stroke-width="1"/>');
  const box = put(s, { x: p.x, y: p.y - p.s * 0.95 }, 2 * c0, 2 * c0, ms); box.style.zIndex = '5';
  anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }] : [{ opacity: 0, rotate: '0deg' }, { opacity: 1, rotate: '300deg', offset: 0.5 }, { opacity: 1, rotate: '360deg', offset: 0.8 }, { opacity: 0, rotate: '360deg' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
}

export function faithHandlers(K: FaithKit): Record<string, (e: FxEvent) => void> {
  const { at, posOf, play } = K;
  // In the story the events name characters (the area map's tokens are theirs): a unit's tile, else the character's.
  const posAny = (id: string | null | undefined) => posOf(id) || (K.posOfChar ? K.posOfChar(id) : undefined);
  const where = (e: any) => at(e.at || posAny(e.unit) || posAny(e.target));
  const targetAt = (e: any) => at(e.targetAt || (TILE.test(String(e.target || '')) ? e.target : posAny(e.target)) || e.at); // a tile prayer's target is its tile (the engine sends it as target)
  /** The one who prays: their own tile (where the icon or the face goes over the head). */
  const prayerAt = (e: any) => at(e.at || posAny(e.unit));
  const charAt = (e: any) => at(e.at || (K.posOfChar ? K.posOfChar(e.char) : null));
  /** The Chaplain's patron (a row's fx names its holder) and its light: the data's accent. */
  const patronOf = (e: any): string | null => e.patron || (K.patronOfUnit ? K.patronOfUnit(e.target || e.unit) : null);
  const accOf = (pat: string | null) => accentOf(pat, pat ? (FAITH_PATRON as any)[pat]?.accent : null);
  /** Where a prayer lands: each unit it touched answers on its own token (an ally rises in the light, a foe jolts back
   *  from it), a ring in the light closes on it; a storm's wound is a bolt from above (its element: the hurt plays the
   *  impact and its sound). Nothing touched but a state: the prayer's own name (its data's `name`) where it lands. */
  const landOn = (e: any, from: Pt | null, ink: string, delay: number) => {
    const hits: string[] = Array.isArray(e._hits) ? e._hits : [], entry = prayerData(e);
    if (e._el === 'shock' && hits.length) play('thunder' as Sfx, at(posAny(hits[0])), { gain: 0.9, delay }); // the storm's prayers: thunder as the bolts land
    const side = (id: string) => (K.sideOf ? K.sideOf(id) : null), mine = K.sideOf ? K.sideOf(e.unit) : null;
    hits.forEach((id, i) => {
      const q = at(posAny(id)); if (!q) return;
      after(() => {
        const tt = K.tokOf ? K.tokOf(id) : null, foe = !!mine && !!side(id) && side(id) !== mine;
        if (from && hits.length > 1 && (from.x !== q.x || from.y !== q.y)) thread({ ...from, y: from.y - from.s * 0.4 }, q, 180, { faint: true, ink, core: '#FFF7DC' });
        fxMarker(q, 'data-phc-prayer-land', id);
        if (e._el === 'shock') bolt(q, ink);
        if (!reducedMotion()) ring(q, ink, 520, { from: 1.4, to: 0.85, width: 3 });
        if (tt && !reducedMotion()) anim(tt, foe
          ? [{ filter: 'none', translate: '0 0' }, { filter: 'brightness(1.6) drop-shadow(0 0 6px ' + ink + ')', translate: (from && q.x !== from.x ? (q.x > from.x ? 4 : -4) : 0) + 'px -1px', offset: 0.3 }, { filter: 'none', translate: '0 0' }]
          : [{ filter: 'none', translate: '0 0' }, { filter: 'brightness(1.45) drop-shadow(0 0 8px ' + ink + ')', translate: '0 -4px', offset: 0.35 }, { filter: 'brightness(1.2) drop-shadow(0 0 4px ' + ink + ')', translate: '0 -3px', offset: 0.7 }, { filter: 'none', translate: '0 0' }], { duration: 620, easing: 'ease-out' });
      }, delay + i * 60);
    });
    // a state only (Resupply, Dig In, Hearthlight, Foreknowing...): its name over the unit it is on, or over the one who prays
    if (!e._effect && entry?.name) {
      const q = at((TILE.test(String(e.target || '')) ? e.target : posAny(e.target)) || e.targetAt || e.at || posAny(e.unit)); if (q) fxMarker(q, 'data-phc-prayer-name', String(entry.name)); if (q) floatText(String(entry.name).toUpperCase(), { ...q, y: q.y + q.s * 0.55 }, FAITH_INK, { small: true, delay: delay + 80 });
    }
  };
  return {
    // Whisper (spec 2.1): a soft chime, the Whisper's icon rising over the head of the one who prays, a small gold ray
    // where it lands. Hymn (spec 2.2): a choir swell, the patron's face over the head of the one who prays, framed in the
    // accent; rays and a ring in the accent where the Hymn lands.
    prayer(e: any) {
      const p = targetAt(e), from = prayerAt(e) || p, acc = accentOf(e.patron, e.accent || (FAITH_PATRON as any)[e.patron]?.accent);
      const tok = K.tokOf ? K.tokOf(e.unit, e.at) : null, apart = !!p && !!from && (p.x !== from.x || p.y !== from.y);
      // 0.32: the Figments' pieces (fx/figments.ts): the caster's wind-up in the patron's light, toward where it lands,
      // then every unit the prayer touched (faithBatch's _hits) lit, lifted or jolted on its own token as the light
      // arrives; a prayer that changes only a state says its name where it lands.
      const fk = { at, tokOf: (id: string | null | undefined, fb?: string) => (K.tokOf ? K.tokOf(id, fb) : null) };
      if (from && e.kind !== 'miracle') windUp(fk, e.unit || null, e.at || posAny(e.unit), p && apart ? p : null, e.kind === 'whisper' ? 150 : 220, e.kind === 'whisper', e.kind === 'whisper' ? FAITH_GOLD : acc);
      if (e.kind !== 'miracle') landOn(e, from, e.kind === 'whisper' ? FAITH_GOLD : acc, e.kind === 'whisper' ? 400 : 520);
      if (e.kind === 'whisper') {
        // prayer 2.0: the one who prays bows first, then the light travels to the target and its ring lands
        tokenMove(tok, 'bow', 180);
        play('crystal', from || p, { rate: 1.8, gain: 0.45 });
        if (from) { whisperOverHead(e.id, from); rays(from, FAITH_GOLD, 3, 520); }
        if (apart && from) {
          const rebuke = prayerWounds(prayerData(e));
          lightLine({ ...from, y: from.y - from.s * 0.4 }, p!, rebuke ? acc : FAITH_GOLD, 220, { delay: 180, jag: rebuke, width: rebuke ? 2 : 1.5 });
          if (!reducedMotion()) ring(p!, rebuke ? acc : FAITH_GOLD, 500, { from: 0.3, to: 0.8, width: 2, delay: 400 });
          if (rebuke) {
            const tt = K.tokOf ? K.tokOf(e.target) : null;
            if (tt && !reducedMotion()) after(() => { anim(tt, [{ translate: '0 0' }, { translate: (p!.x > from.x ? 3 : -3) + 'px 0', offset: 0.3 }, { translate: '0 0' }], { duration: 200 }); }, 400);
            floatText('REBUKED', { ...p!, y: p!.y - p!.s * 0.55 }, FAITH_INK, { small: true, delay: 420 });
          }
        }
        return;
      }
      if (e.kind === 'miracle') return; // the 'miracle' event plays it
      tokenMove(tok, 'raise', 900); // a Hymn: the hand raised while the face is over the head
      if (apart && from) [-0.25, 0, 0.25].forEach((dx, i) => lightLine({ x: from.x + dx * from.s, y: from.y - from.s * 0.9, s: from.s }, p!, acc, 300, { delay: 200 + i * 40 }));
      play('soul_choir' as Sfx, from || p, { rate: 1.1, gain: 0.7 });
      if (from) faceOverHead(e.patron || '', from, { accent: acc, unit: e.unit });
      if (p) {
        rays(p, acc, 7, 900, 120);
        if (!reducedMotion()) ring(p, acc, 900, { from: 0.4, to: 1.5, width: 3, delay: 150 });
      }
    },
    // A failed prayer: silence. A Hymn's face greys and fades over the head; a Whisper's icon sinks back; a Miracle's
    // mark fades.
    prayer_fail(e: any) {
      const p = prayerAt(e) || where(e); if (!p) return;
      if (e.kind === 'hymn') faceOverHead(e.patron || '', p, { accent: accentOf(e.patron, e.accent), miss: true, unit: e.unit });
      else if (e.kind === 'whisper') whisperOverHead(e.id, p, { miss: true });
      else mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.7, 900, { opacity: 0.45, from: 1, to: 0.8 });
      // The word rises from below the token, so it never covers the greyed face or icon over the head.
      floatText(e.kind === 'hymn' && (e.why === 'overreach' || e.overreach) ? 'REFUSED' : 'UNANSWERED', e.kind === 'miracle' ? p : { ...p, y: p.y + p.s * 0.75 }, '#A3AEC2', { small: true, delay: 200 });
    },
    // Witnessed: an eye opening above the caster.
    witnessed(e: any) {
      const p = where(e); if (!p) return;
      // The Hymn's face is over the same head: the eye opens as it goes.
      const wait = Math.max(0, Math.min(1200, (faceUntil.get(e.unit) || 0) - Date.now() - 250));
      play('crystal', p, { rate: 1.2, gain: 0.35, delay: wait });
      mark(witnessedUri(), { ...p, y: p.y - p.s * 0.95 }, p.s * 0.75, 1500, { glow: accentOf(e.patron, e.accent), from: 0.2, to: 1, delay: wait });
      // The word itself is the engine's condition float (play.ts cond): only the eye here, so it never reads twice.
    },
    // Intervention (rules 1.6.3): routed to the cut-in module, which today plays the bell, the mark and the words; the
    // small cut-in is the trigger left for later (docs/design/faith-presence-spec.md section 3, filled in there).
    intervention(e: any) { playIntervention(e, { at, posOf, play, mark }); },
    // Devotion (rules 1.6.1): the XP as a float in Virtue ink, with a small gold mark; a level change says the new level.
    devotion(e: any) {
      const p = charAt(e); if (!p) return;
      const d = Number(e.delta) || 0, word = devotionLine(e, e.patron || (K.patronOfUnit ? K.patronOfUnit(e.char) : null));
      // A pact names the patron; the XP float only when the XP moved (a switch can keep it, or take some: item 719).
      if (e.pact) floatText('PACT · ' + String(FAITH_PATRON[e.pact]?.name || e.pact).toUpperCase(), { ...p, y: p.y + p.s * 0.45 }, FAITH_INK, { small: true, delay: 250 });
      if (d) floatText(word, { ...p, y: p.y + p.s * (e.pact ? 0.9 : 0.45) }, FAITH_INK, { small: true, delay: 250 }); // below and after Witnessed's word, which often comes with it
      mark(patronMarkUri(e.patron || (K.patronOfUnit ? K.patronOfUnit(e.char) : null) || ''), { x: p.x - p.s * 0.55, y: p.y - p.s * 0.55, s: p.s }, p.s * 0.35, 1100, { glow: FAITH_GOLD, opacity: d > 0 ? 1 : 0.5 });
      if (e.level != null) {
        floatText('DEVOTION ' + e.level, { ...p, y: p.y - p.s * 0.75 }, FAITH_INK, { delay: 650 }); // well above the XP float, which rises into the space below
        if (Number(e.level) > Number(e.was ?? -1) && !reducedMotion()) burst('glow', p, p.s * 1.3, 700, { color: FAITH_GOLD, blend: 'screen' });
      }
    },
    // Leaving a patron for another (item 712): the old patron's mark, lit if they let you go, dim if they don't.
    leave(e: any) {
      const p = charAt(e); play('crystal', p, { rate: e.letGo ? 0.8 : 0.55, gain: 0.35 }); if (!p) return;
      const name = String(FAITH_PATRON[e.patron]?.name || e.patron || 'your patron').toUpperCase();
      mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.7, 1100, e.letGo ? { glow: accentOf(e.patron, e.accent), from: 1, to: 1.3 } : { opacity: 0.45, from: 1, to: 0.8 });
      floatText((e.letGo ? 'LET GO · ' : 'HELD · ') + name, p, e.letGo ? FAITH_INK : '#A3AEC2', { small: true, delay: 150 });
    },
    // A grudge (item 713): set on a switch, and at each fight's start on the unit. A low bell and the word in red.
    grudge(e: any) {
      const p = at(e.at || posOf(e.unit) || (K.posOfChar ? K.posOfChar(e.char) : null)); play('hit_metal', p, { rate: 0.6, gain: 0.4 }); if (!p) return;
      const name = String(FAITH_PATRON[e.patron]?.name || e.patron || 'a patron').toUpperCase();
      mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1000, { opacity: 0.5, from: 1.2, to: 0.9 });
      floatText('GRUDGE · ' + name, { ...p, y: p.y - p.s * 0.6 }, '#F65157', { small: true, delay: 150 }); // above the condition's own float, which lands on the same tile
    },
    // A vow: sworn (a seal stamped), kept (it lights), broken (it cracks and falls).
    vow(e: any) {
      const p = where(e); if (!p) return;
      const icon = vowIconUri(e.id || 'shield');
      if (e.state === 'broken') { play('hit_metal', p, { rate: 0.7, gain: 0.45 }); mark(icon, { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1000, { opacity: 0.6, from: 1, to: 0.6 }); floatText('VOW BROKEN', p, '#A3AEC2', { small: true, delay: 150 }); return; }
      // Rules 1.22: the vow's moment came: the seal glints over the swearer and the float says what it bought.
      if (e.state === 'fulfilled') { play('crystal', p, { rate: 1.25, gain: 0.3 }); mark(icon, { ...p, y: p.y - p.s * 0.8 }, p.s * 0.5, 900, { glow: FAITH_GOLD }); floatText('VOW FULFILLED · HYMN ' + (e.cut || 1) + ' ROUND SOONER', p, FAITH_INK, { small: true, delay: 150 }); return; }
      play('crystal', p, { rate: e.state === 'kept' ? 1.5 : 1, gain: 0.35 });
      mark(icon, { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1100, { glow: e.state === 'kept' ? FAITH_GOLD : undefined });
      floatText(e.state === 'kept' ? 'VOW KEPT' : 'VOW SWORN', p, FAITH_INK, { small: true, delay: 150 });
    },
    // The patron speaks: the screens draw the line as a card in the log; on the map, only a glint over the one it is for.
    patron_line(e: any) { const p = at(e.at || posOf(e.unit)); if (p && !reducedMotion()) burst('glow', { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 500, { color: accentOf(e.patron, e.accent), blend: 'screen' }); },
    // ---------- prayer 2.0: the Chaplain's own moments (faithBatch tied each to where it landed: e._on) ----------
    smite(e: any) {
      const o = e._on, q = at(o?.at || posAny(o?.target)), pat = patronOf(e), acc = accOf(pat); if (!q) return;
      // the patron's mark falls along a line of light onto the foe; a white flash; the word and its number
      lightLine({ x: q.x, y: q.y - q.s * 1.6, s: q.s }, { ...q, y: q.y - q.s * 0.2 }, acc, 160, { width: 1 });
      mark(patronMarkUri(pat || ''), { ...q, y: q.y - q.s * 0.5 }, q.s * 0.45, 700, { glow: acc, from: 1.4, to: 0.9, delay: 60 });
      if (!reducedMotion()) burst('glow', q, q.s * 0.9, 240, { color: '#FFFFFF', blend: 'screen', delay: 200 });
      play('crystal', q, { rate: 0.7, gain: 0.5 });
      floatText(chaplainWord(e), { ...q, y: q.y - q.s * 0.75 }, FAITH_INK, { small: true, delay: 220 });
    },
    ward_seal(e: any) {
      const o = e._on, q = at(o?.at || posAny(o?.target)), from = where(e), acc = accOf(patronOf(e)); if (!q) return;
      if (from && (from.x !== q.x || from.y !== q.y)) lightLine({ ...from, y: from.y - from.s * 0.4 }, q, acc, 200);
      after(() => { hexSeal(q, acc, 240); floatText(chaplainWord(e), q, FAITH_INK, { small: true, delay: 160 }); }, 160);
      play('crystal', q, { rate: 1.3, gain: 0.4, delay: 160 });
    },
    canticle(e: any) {
      const p = where(e), acc = accOf(patronOf(e)); if (!p) return;
      tokenMove(K.tokOf ? K.tokOf(e.target, e.at) : null, 'sway', 360);
      play('crystal', p, { rate: 1 + 0.12 * (Number(e.verse) || 1), gain: 0.35 });
      notes(p, acc, 4, 1100);
      songGround(p, songReach(e.k, Number(e.verse) || 1), acc, 1700);
      if (Number(e.verse) >= 3 && !reducedMotion()) ring(p, acc, 700, { from: 0.6, to: 1.5, width: 2 });
      floatText(chaplainWord(e), { ...p, y: p.y - p.s * 0.6 }, FAITH_INK, { delay: 160 });
    },
    canticle_break(e: any) {
      const p = where(e), acc = accOf(patronOf(e)); if (!p) return;
      songGround(p, songReach('canticle', 1), acc, 500, true);
      if (!reducedMotion()) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.7; lightLine({ ...p, y: p.y - p.s * 0.4 }, { x: p.x + Math.cos(a) * p.s * 0.7, y: p.y - p.s * 0.4 + Math.sin(a) * p.s * 0.7, s: p.s }, '#A3AEC2', 120, { width: 1.5 }); }
      play('hit_metal', p, { rate: 0.6, gain: 0.35 });
      floatText(chaplainWord(e), { ...p, y: p.y - p.s * 0.6 }, '#A3AEC2', { small: true, delay: 120 });
    },
    amen(e: any) {
      const o = e._on, q = at(o?.at || posAny(o?.target)), from = where(e), acc = accOf(patronOf(e)); if (!q) return;
      if (from) { if (!reducedMotion()) burst('glow', { ...from, y: from.y - from.s * 0.5 }, from.s * 0.5, 300, { color: acc, blend: 'screen' }); lightLine({ ...from, y: from.y - from.s * 0.4 }, q, acc, 200, { delay: 80 }); }
      if (!reducedMotion()) { ring(q, acc, 500, { from: 0.4, to: 1.0, width: 2, delay: 260 }); ring(q, acc, 600, { from: 0.4, to: 1.35, width: 1.5, delay: 340 }); }
      play('crystal', q, { rate: 1.5, gain: 0.4, delay: 260 });
      floatText(chaplainWord(e), { ...q, y: q.y - q.s * 0.75 }, FAITH_INK, { small: true, delay: 280 });
    },
    holy_dread(e: any) {
      const o = e._on, q = at(o?.at || posAny(o?.target)), acc = accOf(patronOf(e)); if (!q) return;
      // the patron's mark over the foe, with a crack through it
      mark(patronMarkUri(patronOf(e) || ''), { ...q, y: q.y - q.s * 0.8 }, q.s * 0.4, 800, { glow: acc, opacity: 0.9 });
      lightLine({ x: q.x - q.s * 0.15, y: q.y - q.s * 1.0, s: q.s }, { x: q.x + q.s * 0.15, y: q.y - q.s * 0.6, s: q.s }, '#FFFFFF', 140, { jag: true, delay: 200 });
      floatText(chaplainWord(e), { ...q, y: q.y - q.s * 1.1 }, o?.resisted ? '#A3AEC2' : FAITH_INK, { small: true, delay: 260 });
    },
    last_rites(e: any) {
      const o = e._on, q = at(posAny(o?.target)), acc = accOf(patronOf(e)); if (!q) return;
      // a column of two lines of light from above onto the Downed ally
      for (const dx of [-0.12, 0.12]) lightLine({ x: q.x + dx * q.s, y: Math.max(4, q.y - q.s * 4), s: q.s }, { x: q.x + dx * q.s, y: q.y + q.s * 0.3, s: q.s }, acc, 260);
      if (!reducedMotion()) burst('glow', q, q.s * 1.2, 700, { color: acc, blend: 'screen', delay: 200 });
      floatText(chaplainWord(e), { ...q, y: q.y - q.s * 0.7 }, '#6FEA77', { small: true, delay: 240 });
    },
    // An Atheist prays by dice (rules 1.6): the d20 spins over the head and lands on its number against the TN.
    roll(e: any) {
      if (e.why !== 'pray') return;
      const p = where(e); if (!p) return;
      tokenMove(K.tokOf ? K.tokOf(e.unit, e.at) : null, 'tilt', 300);
      d20Spin(p, e.ok ? FAITH_GOLD : '#A3AEC2', 700);
      floatText(chaplainWord(e), { ...p, y: p.y - p.s * 1.3 }, e.ok ? FAITH_INK : '#A3AEC2', { small: true, delay: 420 });
    },
    // A Miracle (Faith 2.2, spec 2.3): the cut-in over the whole screen (everyone sees it: it is this fx event), the
    // god calling the devoted by name; the view lands on the spot and the answer pours onto its area (the queue's next
    // events are the Miracle's own effects, which play as it lands); then the box of what it did.
    miracle(e: any) {
      // the one who prays: the hand raised and the wind-up in the patron's light, as the god answers
      const cp = at(e.at || posAny(e.unit));
      if (cp) { tokenMove(K.tokOf ? K.tokOf(e.unit, e.at) : null, 'raise', 1200); windUp({ at, tokOf: (id, fb) => (K.tokOf ? K.tokOf(id, fb) : null) }, e.unit || null, e.at || posAny(e.unit), null, 320, false, accentOf(e.patron, (FAITH_PATRON as any)[e.patron]?.accent)); }
      const o = miracleCutIn(e, { nameOf: K.nameOfChar, visible: (k) => (K.visible ? K.visible(k) : !!at(k)), posOfChar: K.posOfChar }), acc = o.accent;
      const area: string[] = Array.isArray(e.area) && e.area.length ? e.area : o.focus && o.focus !== 'map' ? [o.focus] : [];
      showCutIn({
        ...o, onSkip: K.hurry,
        onLand: () => {
          const fp = o.focus && o.focus !== 'map' ? at(o.focus) : null;
          play('feel_residue_holy' as Sfx, fp, { rate: 0.9, gain: 0.8 });
          if (fp && !reducedMotion()) ring(fp, acc, 900, { from: 0.3, to: 2.2, width: 4 });
          area.slice(0, 25).forEach((k, i) => { const q = at(k); if (q) after(() => { rays(q, acc, 3, 700); if (!reducedMotion()) burst('glow', q, q.s * 1.3, 700, { color: acc, blend: 'screen' }); }, i * 25); });
        },
      });
    },
  };
}

/** The old name for the Miracle's full-screen answer (Blessing 2.0): now the cut-in (game/cutIn.ts). */
export function miracleOverlay(o: { patron: string; name?: string; line?: string; accent: string; who?: string }): HTMLElement | null {
  const h = showCutIn({ ...miracleCutIn({ patron: o.patron, name: o.name, line: o.line, accent: o.accent }, { nameOf: () => o.who }), focus: null });
  return h ? h.el : null;
}
/** How long each faith event holds the effects queue (a Miracle waits out its full-screen answer). */
export function faithBeat(e: FxEvent): number | undefined {
  const x: any = e;
  switch (e.k) {
    case 'prayer': return x.kind === 'whisper' ? 480 : x.kind === 'hymn' ? 900 : 300;
    case 'miracle': return cutInTiming('full').land; // its effects play as the cut-in lands
    case 'prayer_fail': return 600;
    case 'witnessed': case 'intervention': return 650;
    case 'devotion': return x.level != null ? 800 : 450;
    case 'vow': return 450;
    case 'leave': case 'grudge': return 600;
    case 'patron_line': return 200;
    case 'smite': case 'amen': return 420;
    case 'ward_seal': return 460;
    case 'canticle': return 560;
    case 'canticle_break': return 480;
    case 'holy_dread': return 380;
    case 'last_rites': return 420;
    case 'roll': return x.why === 'pray' ? 620 : undefined;
    default: return undefined;
  }
}
