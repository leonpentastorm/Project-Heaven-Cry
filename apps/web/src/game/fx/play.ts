// Plays the engine's presentation events (packages/engine/src/combat.ts, FxEvent) as sound and pictures over the grid.
// Every player's screen plays the same events from the shared game state, in order, each given its beat so a burst of
// enemy actions reads as a sequence. Nothing here changes the game; nothing waits on it; a hidden tab skips it all.
import { type FxEvent, type GameState, SIGIL, visibility } from '@engine';
import { sfx, reducedMotion, type Sfx } from '../sfx';
import { GLYPH_PATHS, SIGIL_INK, SIGIL_GLOW, SOUL_INK, SOUL_WARM } from '../glyphs';
import { type ElementFx, type MissileKind, ELEMENTS, bubbles, elementFx, elementImpact, elementTrail, jag, mix, shardCss, shards, snapFrame, turretNode } from './elements';
import { soulHandlers, soulBeat, discharge } from './soul';
import { feelingHandlers, feelingBeat } from './feelings';
import { faithHandlers, faithBeat } from './faith';
import { classHandlers, classBeat } from './classes';
import { grandLook } from './grand';
import { worldHandlers, worldBeat } from './world';
import { closeCutIns } from '../cutIn';
import { type Pt, after, bumpGen, particle, anim, angle, anchor, burst, centre, flash, floatText, gridShown, hasLayer, lunge, panOf, put, ring, screenTint, shake, shakeScreen, slideFrom, sprite, svg, tileEl, timerRing, tokenEl, walk } from './dom';

const HP = '#F65157', OK = '#6FEA77', MUTED = '#A3AEC2', WHITE = '#FFFFFF', MUZZLE = '#FFE2A0', HOT = '#FFF3C4';
/** The window event fired as each effect plays (detail: the FxEvent), and when the queue runs dry. */
export const FX_EVENT = 'phc-fx', FX_IDLE = 'phc-fx-idle', FX_HOLD = 'phc-fx-hold';

// ---------- what the layer knows about the game right now ----------
interface UnitInfo { pos: string; name: string; side: string; robot: boolean; dead?: boolean; charId?: string }
let units = new Map<string, UnitInfo>();
let seenTiles: Set<string> | null = null;
/** The characters' names (a Miracle's cut-in calls the devoted by name). */
let charNames = new Map<string, string>();
/** World Play 1.7 kinds that are machines (a robot bleeds sparks, not blood). */
const MACHINE_KIND = new Set(['robot', 'drone', 'machine']);
const ROBOT = /drone|robot|\bbot\b|turret|automaton|mech\b|android|construct|sentry/i;
/** Called by FxLayer before playing a batch: where everyone is now, and (in a fight) what the squad can see. */
export function setContext(g: GameState | null, screen: string) {
  units = new Map(); seenTiles = null; charNames = new Map();
  if (!g) return;
  for (const c of Object.values(g.characters || {})) if (c && (c as any).id) charNames.set((c as any).id, String((c as any).name || ''));
  if (screen === 'combat' && g.combat) {
    for (const u of g.combat.units) units.set(u.id, { pos: u.pos, name: u.name, side: u.side, robot: ROBOT.test(u.name) || MACHINE_KIND.has((u as any).kind), dead: !!u.dead, charId: u.charId || undefined });
    try { seenTiles = visibility(g.combat, 'pc').tiles; } catch { seenTiles = null; }
  } else {
    for (const c of Object.values(g.characters)) { const p = g.story.positions?.[c.id]; if (p) units.set('pc-' + c.id, { pos: p, name: c.name, side: 'pc', robot: false, charId: c.id }); }
    for (const n of g.story.npcs || []) units.set(n.id, { pos: n.pos, name: n.name, side: 'foe', robot: ROBOT.test(n.name) || MACHINE_KIND.has(n.kind || '') });
  }
}
const unit = (id: string | null | undefined) => (id ? units.get(id) : undefined);
/** The tiles the squad sees now (null: everything, outside a fight). */
export const seenNow = () => seenTiles;

// ---------- the fallen ----------
// A unit killed by an action is gone from the grid in the very render that brings the action's effects, so its token
// can't shake or fall. The layer keeps a copy of every living unit's token from the last render it saw; a kill plays
// on that copy (a ghost over the tile), which falls and fades.
const lastTok = new Map<string, HTMLElement>();
const ghosts = new Map<string, HTMLElement>();
/** After each render: copy the living units' tokens (never overwritten by a dead unit's empty tile). */
export function rememberTokens() {
  for (const id of [...lastTok.keys()]) if (!units.has(id)) lastTok.delete(id);
  for (const [id, u] of units) { if (u.dead) continue; const t = tokenEl(tileEl(u.pos)); if (t) lastTok.set(id, t.cloneNode(true) as HTMLElement); }
}
function ghostOf(id: string | null | undefined, key: string | null | undefined): HTMLElement | null {
  if (!id || !key || !visible(key)) return null;
  const had = ghosts.get(id); if (had && had.isConnected) return had;
  const src = lastTok.get(id), p = centre(key); if (!src || !p) return null;
  const copy = src.cloneNode(true) as HTMLElement, ms = 2400;
  const box = put(copy, p, p.s, p.s, ms); box.style.zIndex = '1';
  anchor(box, key, ms);
  ghosts.set(id, copy); setTimeout(() => { if (ghosts.get(id) === copy) ghosts.delete(id); }, ms);
  return copy;
}
/** The token to shake: the live one, else (for a unit this action killed) its ghost. */
const tokOrGhost = (id: string | null | undefined, key: string | null | undefined, killed: boolean) => tokOf(id, key || undefined) || (killed ? ghostOf(id, key) : null);
/** Can the squad see this tile? (Outside a fight, everything on the map is in view.) */
const visible = (k: string | null | undefined) => !k || !seenTiles || seenTiles.has(k);
/** Where a unit's token is on screen now (it may have moved since the event). */
const tokOf = (id: string | null | undefined, fallback?: string) => tokenEl(tileEl(unit(id)?.pos || fallback));
const at = (k: string | null | undefined) => (visible(k) ? centre(k) : null);
const play = (s: Sfx, p: Pt | null, o: { rate?: number; gain?: number; delay?: number; lowpass?: number } = {}) => sfx(s, { ...o, pan: panOf(p) });
const jitter = (r = 0.06) => 1 + (Math.random() * 2 - 1) * r;

// ---------- weapons ----------
type Look = 'bullet' | 'pellets' | 'arrow' | 'lob' | 'rocket' | 'flame' | 'bolt' | 'beam';
interface Gun { sound: Sfx | null; rate?: number; look: Look; color?: string; blast?: 'frag' | 'fire' | 'smoke' | 'flash' | 'zap' }
function gunOf(id: string, cat: string): Gun {
  switch (id) {
    case 'magistrate_pistol': return { sound: 'gun_revolver', rate: 1.05, look: 'bullet' };
    case 'parlour_pistol': return { sound: 'gun_pistol', rate: 1.15, look: 'bullet' };
    case 'frontier_hand_cannon': return { sound: 'gun_magnum', rate: 0.9, look: 'bullet' };
    case 'long_rifle': case 'ccec_marksman_rifle': return { sound: 'gun_sniper', look: 'bullet' };
    case 'lever_carbine': return { sound: 'gun_lever', look: 'bullet' };
    case 'adamantile_battle_rifle': return { sound: 'gun_rifle', rate: 0.9, look: 'bullet' };
    case 'sawn_off': return { sound: 'gun_shotgun', rate: 1.05, look: 'pellets' };
    case 'blackpoint_700': return { sound: 'gun_heavy', rate: 0.85, look: 'bullet' };
    case 'hellraiser_lmg': case 'hellraiser_rotary': return { sound: 'gun_rifle', rate: 0.85, look: 'bullet' };
    case 'smetanita_thumper': return { sound: 'explosion_boom', rate: 2.2, look: 'lob', blast: 'frag' };
    case 'breacher_tube': return { sound: 'vent', rate: 1.6, look: 'rocket', blast: 'frag' };
    case 'purifier_flamer': return { sound: 'vent', rate: 0.7, look: 'flame', blast: 'fire' };
    case 'crossbow': case 'repeating_crossbow': return { sound: 'swish', rate: 0.7, look: 'arrow' };
    case 'frag_grenade': case 'satchel_charge': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'frag' };
    case 'incendiary_grenade': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'fire' };
    case 'smoke_grenade': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'smoke' };
    case 'flashbang': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'flash' };
    case 'bot_scrambler': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'zap' };
    case 'core_rifle': return { sound: 'sigil_evoke', rate: 1.35, look: 'bolt', color: SIGIL_INK };
    case 'lumeri_censer_gun': return { sound: 'gun_shotgun', look: 'pellets', color: SOUL_WARM };
  }
  if (cat === 'revolver') return { sound: 'gun_revolver', look: 'bullet' };
  if (cat === 'smg') return { sound: 'gun_smg', look: 'bullet' };
  if (cat === 'rifle') return { sound: 'gun_rifle', look: 'bullet' };
  if (cat === 'shotgun') return { sound: 'gun_shotgun', look: 'pellets' };
  if (cat === 'heavy') return { sound: 'gun_heavy', look: 'bullet' };
  if (cat === 'bow') return { sound: 'swish', rate: 0.8, look: 'arrow' };
  if (cat === 'thrown') return { sound: 'swish', rate: 0.7, look: 'lob' };
  return { sound: 'gun_pistol', look: 'bullet' };
}
/** What a reload handles, for its sound: arrows and bolts, a fuel canister, a launcher's shell, shotgun-style shells,
 *  or a gun's rounds and magazines. */
export function reloadKind(id: string, cat: string, look: Look = gunOf(id, cat).look): 'bow' | 'fuel' | 'launcher' | 'shells' | 'gun' {
  if (look === 'arrow' || cat === 'bow') return 'bow';
  if (look === 'flame') return 'fuel';
  if (look === 'lob' || look === 'rocket') return 'launcher';
  if (look === 'pellets' || cat === 'shotgun') return 'shells';
  return 'gun';
}
/** A burst or full-auto volley has one long recording; the shots inside it then fire silently. */
function volleySound(cat: string, mode: string): { s: Sfx; rate?: number } | null {
  if (mode !== 'burst' && mode !== 'auto') return null;
  if (cat === 'shotgun') return null;
  if (mode === 'auto') return cat === 'heavy' ? { s: 'auto_heavy' } : cat === 'rifle' ? { s: 'auto_rifle' } : { s: 'auto_smg', rate: cat === 'pistol' ? 1.1 : 1 };
  return cat === 'rifle' || cat === 'heavy' ? { s: 'burst_rifle' } : { s: 'burst_smg', rate: cat === 'pistol' ? 1.1 : 1 };
}
let volley: { unit: string; silent: boolean; until: number } | null = null;

// ---------- the pieces of a shot ----------
function muzzle(from: Pt, to: Pt, color = MUZZLE) {
  const a = angle(from, to), r = (a * 180) / Math.PI + 90, off = from.s * 0.42;
  const p = { x: from.x + Math.cos(a) * off, y: from.y + Math.sin(a) * off };
  burst('muzzle', { x: p.x + Math.cos(a) * from.s * 0.3, y: p.y + Math.sin(a) * from.s * 0.3 }, from.s * 1.05, 140, { color, rot: r, from: 0.7, to: 1.2, fade: 0 });
  burst('flare', p, from.s * 1.15, 150, { color: HOT, from: 0.6, to: 1.5 });
  return p;
}
/** A projectile from a to b over ms (straight, or lobbed). */
function projectile(a: { x: number; y: number }, b: { x: number; y: number }, ms: number, look: Look, s: number, color?: string) {
  if (reducedMotion()) return;
  const ang = Math.atan2(b.y - a.y, b.x - a.x), deg = (ang * 180) / Math.PI;
  const el = document.createElement('div');
  const len = look === 'arrow' ? s * 0.55 : look === 'bolt' || look === 'beam' ? s * 0.7 : look === 'rocket' ? s * 0.35 : look === 'lob' ? s * 0.18 : s * 0.8;
  const hgt = look === 'lob' ? s * 0.18 : look === 'rocket' ? 5 : look === 'arrow' ? 2 : 4;
  el.style.cssText = 'width:100%;height:100%;border-radius:' + (look === 'lob' ? '50%' : '2px') + ';' + (look === 'arrow' ? 'background:linear-gradient(90deg,rgba(201,183,156,0),#C9B79C 30%,#E7EBF3)'
    : look === 'lob' ? 'background:#2A3242;border:2px solid #A3AEC2' : look === 'rocket' ? 'background:linear-gradient(90deg,rgba(255,180,90,0),#FFB45A 40%,#FFFFFF);box-shadow:0 0 8px #FFB45A'
    : 'background:linear-gradient(90deg,rgba(255,243,196,0),' + (color || HOT) + ' 70%,#FFFFFF);box-shadow:0 0 8px ' + (color || '#FFD27A') + ',0 0 2px #FFFFFF');
  const box = put(el, a, len, hgt, ms);
  box.style.left = a.x - len + 'px'; box.style.top = a.y - hgt / 2 + 'px'; box.style.transformOrigin = '100% 50%';
  const dx = b.x - a.x, dy = b.y - a.y;
  if (look === 'lob') {
    const h = Math.max(30, Math.hypot(dx, dy) * 0.35), f: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; f.push({ transform: 'translate(' + dx * t + 'px,' + (dy * t - 4 * h * t * (1 - t)) + 'px) rotate(' + t * 540 + 'deg)' }); }
    anim(box, f, { duration: ms, easing: 'linear', fill: 'forwards' });
  } else anim(box, [{ transform: 'translate(0,0) rotate(' + deg + 'deg)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + deg + 'deg)', opacity: 1 }], { duration: ms, easing: 'linear', fill: 'forwards' });
}
/** Where a miss ends up: past the target and off to one side. */
function missPoint(from: Pt, to: Pt): { x: number; y: number } {
  const a = angle(from, to), side = (Math.random() < 0.5 ? -1 : 1) * to.s * (0.35 + Math.random() * 0.3), over = to.s * (0.9 + Math.random() * 0.8);
  return { x: to.x + Math.cos(a) * over - Math.sin(a) * side, y: to.y + Math.sin(a) * over + Math.cos(a) * side };
}
/** A target is hit: flash, sparks or blood, a decal that stays a few seconds, the token shakes, a number rises. */
function impact(e: FxEvent, p: Pt, tid: string | null, o: { crit?: boolean; melee?: boolean; color?: string; sound?: Sfx | null; dmg?: number } = {}) {
  const u = unit(tid), robot = !!u?.robot, tok = tokOrGhost(tid, e.to || u?.pos, !!e.killed || !!u?.dead);
  burst(o.crit ? 'flash_crit' : 'flash_star', p, p.s * (o.crit ? 1.9 : 1.1), o.crit ? 260 : 170, { color: o.color || WHITE, from: 0.3, to: 1.2, rot: Math.random() * 90 });
  burst(Math.random() < 0.5 ? 'spark_burst' : 'spark_burst_2', p, p.s * 0.8, 260, { color: o.color || (robot ? '#FFD27A' : '#C2272F'), from: 0.4, to: 1.15 });
  decal(e.to || u?.pos, robot || o.color ? 'scorch' : 'blood_' + (1 + Math.floor(Math.random() * 3)), robot || o.color ? '#1A1A1A' : '#7A0E16');
  shake(tok, o.crit ? 1.6 : 1); flash(tok, 'hurt');
  if (o.crit) shakeScreen(0.8);
  const snd = o.sound !== undefined ? o.sound : robot ? 'hit_metal' : o.crit ? 'hit_heavy' : 'hit_flesh';
  if (snd) play(snd, p, { rate: jitter() });
  if (o.dmg != null) floatText(o.dmg > 0 ? '−' + o.dmg + (o.crit ? '!' : '') : o.dmg === 0 && e.downedHit ? 'HIT' : '0', p, HP, { big: o.crit });
}
/** A mark left on a tile for a few seconds (blood, scorch), anchored so it follows the map. */
function decal(k: string | undefined, name: string, color: string, ms = 3200, size = 0.55) {
  const p = k ? centre(k) : null; if (!p || !k) return;
  const off = { x: (Math.random() - 0.5) * p.s * 0.3, y: (Math.random() - 0.5) * p.s * 0.3 };
  const box = put(sprite(name, color), { x: p.x + off.x, y: p.y + off.y }, p.s * size, p.s * size, ms);
  box.style.zIndex = '0';
  anchor(box, k, ms, off.y / p.s);
  anim(box, [{ opacity: 0, transform: 'scale(.5) rotate(' + Math.random() * 360 + 'deg)' }, { opacity: 0.85, transform: 'scale(1) rotate(' + Math.random() * 360 + 'deg)', offset: 0.04 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
function dust(p: { x: number; y: number }, s: number, color = '#A3AEC2') {
  burst('dust', p, s * 0.7, 520, { color, from: 0.3, to: 1.1 });
  burst('dirt', p, s * 0.5, 380, { color: '#7F8BA1', from: 0.5, to: 1.2 });
}
function explosion(k: string | undefined, radius = 1, kind: 'frag' | 'fire' | 'smoke' | 'flash' | 'zap' = 'frag', point?: Pt) {
  const p = point || centre(k); if (!p) return;
  const size = p.s * (1.2 + radius * 1.1);
  if (kind === 'smoke') { burst('puff', p, size, 1600, { from: 0.3, to: 1.4, fade: 0 }); play('vent', p, { rate: 0.8 }); return; }
  if (kind === 'flash') { burst('flare', p, size * 2, 400, { color: WHITE, from: 0.2, to: 2 }); screenTint('white', 350); play('explosion', p, { rate: 1.4, gain: 0.6 }); return; }
  if (kind === 'zap') { burst('zap', p, size, 420, { color: SIGIL_INK, from: 0.5, to: 1.3 }); play('sigil_overload', p, { rate: 1.3 }); return; }
  burst('fireflash_' + (1 + Math.floor(Math.random() * 2)), p, size * 0.8, 160, { from: 0.3, to: 1.2, fade: 0.6 });
  burst('boom_' + (1 + Math.floor(Math.random() * 3)), p, size, 560, { from: 0.6, to: 1.5, delay: 60 });
  if (kind === 'fire') burst('flame', p, size * 0.8, 900, { color: '#F68A38', from: 0.6, to: 1.2, delay: 120 });
  burst('smoke_black', { x: p.x, y: p.y - p.s * 0.2 }, size * 1.1, 1400, { from: 0.6, to: 1.6, delay: 200 });
  if (!point) decal(k, 'scorch', '#111111', 4200, 0.9 + radius * 0.4);
  shakeScreen(1 + radius * 0.3);
  play('explosion', p, { gain: point ? 0.7 : 1 }); play('explosion_boom', p, { gain: point ? 0.5 : 0.8 });
}

// ---------- event handlers ----------
type Handler = (e: FxEvent) => void;
const H: Record<string, Handler> = {
  turn(e) { const p = at(e.at); if (p) ring(p, e.side === 'pc' ? WHITE : HP, 520, { from: 0.45, to: 1.05, width: 4 }); },
  move(e) {
    const path: string[] = (e.path || [e.from, e.to]).filter(Boolean);
    if (!visible(e.to) && !path.some(visible)) return;
    const per = e.how === 'sprint' ? 75 : 115;
    const now = unit(e.unit)?.pos;
    // Only walk the ghost when the token still stands where this move ended (otherwise a later move will show it).
    if (now === e.to && (unit(e.unit)?.side === 'pc' || path.every(visible))) walk(path, e.to, per);
    const steps = Math.min(8, path.length - 1);
    for (let i = 0; i < steps; i++) play('step', centre(path[i + 1]), { delay: i * per + 40, rate: jitter(0.1) * (e.how === 'sprint' ? 1.1 : 1), gain: 0.8 });
  },
  shot(e) {
    const g = gunOf(e.weapon || '', e.cat || ''), from = at(e.from), toP = centre(e.to), shooterSeen = visible(e.from);
    const silent = !!(volley && volley.unit === e.unit && volley.silent && e.chain && performance.now() < volley.until);
    if (!silent && g.sound) play(g.sound, from || toP, { rate: (g.rate || 1) * jitter(0.04) });
    if (!toP) return;
    const shooterTok = shooterSeen ? tokOf(e.unit, e.from) : null;
    if (e.killed && e.target) tokOrGhost(e.target, e.to, true);
    let mp: { x: number; y: number } | null = null;
    if (from && shooterSeen && g.look !== 'lob' && g.look !== 'flame' && g.look !== 'arrow') mp = muzzle(from, toP, g.color);
    if (from && shooterTok) { const a = angle(from, toP); lunge(shooterTok, -Math.cos(a) * 3, -Math.sin(a) * 3, 120); }
    const start = mp || (from ? { x: from.x, y: from.y } : null);
    const dist = start ? Math.hypot(toP.x - start.x, toP.y - start.y) : 0;
    const speed = g.look === 'lob' ? 0.55 : g.look === 'arrow' ? 1.1 : g.look === 'rocket' ? 0.9 : 2.2; // px per ms
    const ft = start ? Math.max(60, Math.min(g.look === 'lob' ? 650 : 320, dist / speed)) : 0;
    const coverP = e.cover ? centre(e.cover) : null;
    const end = e.hit ? toP : coverP || missPoint(from || toP, toP);
    if (start) {
      if (g.look === 'pellets') for (let i = 0; i < 5; i++) { const sp = toP.s * 0.35, q = { x: end.x + (Math.random() - 0.5) * sp, y: end.y + (Math.random() - 0.5) * sp }; projectile(start, q, ft * jitter(0.15), 'bullet', toP.s * 0.8, g.color); }
      else if (g.look === 'flame') { for (let i = 0; i < 6; i++) { const t = (i + 1) / 6; burst('flame', { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, toP.s * (0.5 + t * 0.5), 420, { color: '#F68A38', from: 0.4, to: 1.2, delay: i * 45, blend: 'screen' }); } }
      else projectile(start, end, ft, g.look, toP.s, g.color);
    }
    after(() => {
      if (e.object) { burst('spark_burst', toP, toP.s * 0.8, 280, { color: '#FFD27A' }); dust(toP, toP.s); play('hit_wood', toP, { rate: jitter() }); return; }
      // A charge that misses still goes off where it lands (a smaller blast, no scorch: the engine hurt nobody there);
      // a flamer's miss is a gout of fire on the floor, not a blast.
      const wide = !e.hit && !coverP;
      if (g.blast && !(wide && g.look === 'flame')) explosion(e.hit ? e.to : undefined, e.hit ? 1 : 0.6, g.blast, e.hit ? undefined : { x: end.x, y: end.y, s: toP.s });
      if (e.hit) impact(e, toP, e.target, { crit: e.crit, dmg: e.dmg, color: g.look === 'bolt' ? SIGIL_INK : undefined, sound: g.look === 'arrow' ? 'hit_flesh' : undefined });
      else if (coverP) { burst('spark_burst', coverP, coverP.s * 0.7, 260, { color: '#FFD27A' }); dust(coverP, coverP.s); play('hit_metal', coverP, { rate: jitter() }); floatText('COVER', toP, MUTED, { small: true }); }
      else {
        if (g.look === 'flame') { burst('flame', end, toP.s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.1 }); play('vent', toP, { rate: 0.6, gain: 0.8 }); }
        else if (!g.blast) play(g.look === 'arrow' ? 'hit_wood' : g.look === 'lob' || g.look === 'rocket' ? 'hit_heavy' : 'whiz', toP, { rate: g.look === 'lob' ? 0.7 : jitter(0.15), delay: 0 });
        dust(end, toP.s); floatText(e.fumble ? 'FUMBLE' : e.image ? 'DECOY' : 'MISS', toP, e.image ? SIGIL_INK : MUTED); // through a False Image (it scatters: image_gone)
      }
      if (e.jam || (e.fumble && !/melee|unarmed/.test(e.cat || ''))) { const fp = from || toP; floatText('JAMMED', fp, HP, { small: true, delay: 120 }); play('dry_click', fp, { delay: 160 }); }
    }, ft);
  },
  melee(e) {
    const from = at(e.from), toP = centre(e.to), cat = e.cat || 'unarmed';
    play(cat === 'heavy_melee' ? 'swish' : 'swish', from || toP, { rate: (cat === 'heavy_melee' ? 0.75 : cat === 'unarmed' ? 1.2 : 1) * jitter(0.08) });
    if (!toP) return;
    if (e.killed && e.target) tokOrGhost(e.target, e.to, true);
    if (from) {
      const a = angle(from, toP), d = from.s * 0.55;
      lunge(tokOf(e.unit, e.from), Math.cos(a) * from.s * 0.3, Math.sin(a) * from.s * 0.3, 240);
      const tint = /evoker_blade/.test(e.weapon || '') ? SIGIL_INK : /emanator_gauntlet/.test(e.weapon || '') ? SOUL_INK : WHITE;
      // The arc: a bright cut in front of the attacker, a wider tinted echo behind it.
      const sp = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d }, rot = (a * 180) / Math.PI + (cat === 'heavy_melee' ? 45 : 0), big = cat === 'heavy_melee' ? 2.1 : 1.6;
      burst(cat === 'heavy_melee' ? 'slash_wide' : 'slash', sp, from.s * big * 1.15, 300, { color: tint === WHITE ? '#A3AEC2' : tint, rot: rot - 18, from: 0.5, to: 1.1, delay: 30 });
      burst(cat === 'heavy_melee' ? 'slash_wide' : 'slash', sp, from.s * big, 280, { color: tint, rot, from: 0.65, to: 1.2 });
    }
    after(() => {
      if (e.object) { dust(toP, toP.s); play('chop', toP); return; }
      if (e.hit) impact(e, toP, e.target, { crit: e.crit, dmg: e.dmg, melee: true, sound: cat === 'heavy_melee' ? 'chop' : cat === 'light_melee' ? 'slice' : 'hit_heavy' });
      else { floatText(e.fumble ? 'FUMBLE' : e.image ? 'DECOY' : 'MISS', toP, e.image ? SIGIL_INK : MUTED); play('whiz', toP, { rate: 0.7 }); }
    }, 120);
  },
  volley(e) {
    const vs = volleySound(e.cat || '', e.mode), p = at(e.from) || centre(e.to);
    volley = { unit: e.unit, silent: !!vs, until: performance.now() + 2500 };
    if (vs) play(vs.s, p, { rate: vs.rate });
    if (e.mode === 'skill' && e.name) { const q = centre(e.from); if (q && visible(e.from)) floatText(String(e.name).toUpperCase(), q, WHITE, { small: true, ms: 1100 }); }
    if (e.mode === 'auto' && p && e.to) {
      // The spray: extra tracers fanning around the line (the engine rolls one shot per enemy near it).
      const toP = centre(e.to); if (!toP || !visible(e.from)) return;
      for (let i = 0; i < 7; i++) after(() => { const m = muzzle(p, toP); projectile(m, missPoint(p, toP), 150, 'bullet', toP.s); }, i * 85);
    }
  },
  reload(e) {
    const p = at(e.at), ms = e.dur || 1200, cat = e.cat || '', look = gunOf(e.weapon || '', cat).look;
    const kind = reloadKind(e.weapon || '', cat, look);
    const n = Math.max(2, Math.min(6, e.rounds || 4)), each = (i: number, k: number) => (i * ms * 0.8) / k;
    if (kind === 'bow') {
      // Arrows or bolts drawn from the quiver and nocked; a crossbow's latch clicks home at the end.
      const k = e.how === 'loose' ? Math.min(3, n) : 1;
      for (let i = 0; i < k; i++) play('swish', p, { delay: each(i, k), rate: 1.5 * jitter(), gain: 0.55 });
      if (cat === 'bow' && /crossbow/.test(e.weapon || '')) play('dry_click', p, { delay: ms * 0.8, rate: 0.7 });
    } else if (kind === 'fuel') { play('hit_metal', p, { rate: 0.75, gain: 0.7 }); play('vent', p, { delay: ms * 0.55, rate: 0.9, gain: 0.7 }); play('mag_in', p, { delay: ms * 0.85, rate: 0.8 }); }
    else if (kind === 'launcher') { const k = Math.min(3, e.rounds || 1); for (let i = 0; i < k; i++) play('round_in', p, { delay: each(i, k), rate: 0.7 * jitter() }); play('rack', p, { delay: ms * 0.82, rate: 0.85 }); }
    else if (kind === 'shells') { play('reload_shells', p, { rate: Math.max(0.85, Math.min(1.3, 1250 / ms)) }); play('rack', p, { delay: ms * 0.8 }); }
    else if (e.how === 'loose') { for (let i = 0; i < n; i++) play('round_in', p, { delay: each(i, n), rate: jitter() }); play('mag_in', p, { delay: ms * 0.85 }); }
    else play(cat === 'rifle' || cat === 'heavy' || cat === 'smg' ? 'reload_rifle' : cat === 'pistol' || cat === 'revolver' ? 'reload_pistol' : 'reload_mag', p, { rate: Math.max(0.85, Math.min(1.3, 1250 / ms)) });
    if (p) timerRing(e.at, ms, WHITE, kind === 'fuel' ? 'REFUEL' : 'RELOAD');
  },
  load(e) {
    const p = at(e.at), ms = e.dur || 1400, n = Math.max(2, Math.min(8, Math.ceil((e.rounds || 5) / 2)));
    for (let i = 0; i < n; i++) play('round_in', p, { delay: (i * ms * 0.85) / n, rate: jitter() });
    if (p) timerRing(e.at, ms, WHITE, 'LOAD');
  },
  clear(e) {
    const p = at(e.at), ms = e.dur || 1000;
    play('dry_click', p); play('jam_clear', p, { delay: ms * 0.35 }); play('rack', p, { delay: ms * 0.75 });
    if (p) timerRing(e.at, ms, WHITE, 'UNJAM');
  },
  repair(e) {
    const p = at(e.at), ms = e.dur || 1400;
    for (let i = 0; i < 3; i++) play('hit_metal', p, { delay: 150 + i * ms * 0.28, rate: jitter(0.15) });
    if (p) { timerRing(e.at, ms, WHITE, 'REPAIR'); for (let i = 0; i < 3; i++) burst('spark_burst', p, p.s * 0.5, 220, { color: '#FFD27A', delay: 150 + i * ms * 0.28 }); }
  },
  core(e) { const p = at(e.at), ms = e.dur || 1000; play('sigil_core', p); if (p) { timerRing(e.at, ms, SIGIL_INK, 'CORE'); squares(p, SIGIL_INK, 8, 0.6, ms * 0.6); } },
  crystallise(e) {
    const p = at(e.at), ms = e.dur || 1400; play('soul_hold', p, { rate: 1.2 }); play('crystal', p, { delay: ms * 0.9 });
    if (p) { timerRing(e.at, ms, SOUL_INK, 'CRYSTAL'); motes(p, SOUL_INK, 10, true, ms * 0.8); burst('magic_star', p, p.s * 0.8, 500, { color: SOUL_WARM, delay: ms * 0.9 }); }
  },
  stim(e) {
    const from = at(e.from), p = centre(e.to); play('stim', from || p);
    if (!p) return;
    pluses(p, OK, 7);
    flash(tokOf(e.target, e.to), 'heal');
    if (e.revive) { ring(p, OK, 700, { from: 0.4, to: 1.4, width: 6 }); floatText('UP', p, OK, { big: true }); }
    else floatText('+' + (e.heal || 0), p, OK);
  },
  heal(e) { const p = centre(e.at); if (!p) return; pluses(p, OK, 6); flash(tokOf(e.target, e.at), 'heal'); floatText(e.revive ? 'UP' : '+' + (e.amount || 0), p, OK, { big: !!e.revive }); play('crystal', p, { rate: 1.3, gain: 0.7 }); },
  hurt(e) {
    const p = at(e.at); if (!p) return;
    const why = e.why || '', tok = tokOrGhost(e.target, e.at, !!e.killed);
    const color = why === 'sigil' || why === 'elemental' || why === 'wall' ? SIGIL_INK : why === 'soul' ? SOUL_INK : undefined;
    if (why === 'burn') burst('flame', p, p.s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.1 });
    if (why === 'bleed') decal(e.at, 'blood_' + (1 + Math.floor(Math.random() * 3)), '#7A0E16', 2600, 0.35);
    if (e.element) elementImpact(p, e.element, why === 'soul' ? 'soul' : 'sigil', { power: why === 'acid' ? 0.4 : 0.55, quiet: true, decalKey: why === 'acid' ? null : e.at });
    else if (color) { squaresOrMotes(p, color, why === 'soul'); }
    if (why === 'acid') { bubbles(p, ELEMENTS.acid, 'sigil', 4, 900); play('stim', p, { gain: 0.4, rate: 1.2 }); }
    shake(tok, why === 'explosion' ? 1.6 : 0.8); flash(tok, color === SOUL_INK ? 'soul' : color ? 'magic' : 'hurt');
    if (why !== 'explosion' && why !== 'trap' && why !== 'strain') play(unit(e.target)?.robot ? 'hit_metal' : 'hit_flesh', p, { rate: jitter(), gain: why === 'bleed' || why === 'burn' ? 0.6 : 1 });
    floatText(e.dmg > 0 ? '−' + e.dmg : 'HIT', p, HP);
  },
  shield(e) { const p = at(e.at); if (!p) return; ring(p, SIGIL_INK, 420, { from: 0.7, to: 1.05, width: 7 }); floatText('SHIELD −' + (e.absorbed || 0), p, SIGIL_INK, { small: true }); play('hit_metal', p, { rate: 1.4, gain: 0.6 }); },
  down(e) {
    const p = at(e.at), live = tokOf(e.unit, e.at), tok = live || ghostOf(e.unit, e.at); play('body_fall', p || centre(e.at), { rate: jitter(0.08) });
    if (!p) return;
    const fallen = { filter: 'grayscale(1) brightness(.55)', translate: '0 ' + p.s * 0.12 + 'px', rotate: '-14deg' };
    if (tok && !live) anim(tok, [{ filter: 'none', translate: '0 0', rotate: '0deg', opacity: 1 }, { ...fallen, opacity: 1, offset: 0.3 }, { ...fallen, opacity: 0.85, offset: 0.7 }, { ...fallen, opacity: 0 }], { duration: reducedMotion() ? 900 : 1700, easing: 'ease-out', fill: 'forwards' });
    else if (tok && !reducedMotion()) anim(tok, [{ filter: 'none', translate: '0 0', rotate: '0deg' }, { ...fallen, offset: 0.35 }, { ...fallen, offset: 0.85 }, { filter: 'none', translate: '0 0', rotate: '0deg' }], { duration: 1400, easing: 'ease-out' });
    dust({ x: p.x, y: p.y + p.s * 0.2 }, p.s);
    floatText(e.dead ? 'DEAD' : 'DOWNED', p, HP, { delay: 150 });
  },
  explode(e) { if (e.what === 'discharge') { discharge(SOUL_KIT, e); return; } explosion(e.at, e.radius || 1, e.what === 'fire' ? 'fire' : 'frag'); },
  object(e) { const p = at(e.at); if (!p) return; if (e.broken) { dust(p, p.s * 1.3); burst('smoke_soft', p, p.s, 700, { color: '#7F8BA1' }); play('body_fall', p, { rate: 0.8, delay: 90 }); floatText('BROKEN', p, MUTED, { small: true }); } },
  door(e) { const p = at(e.at); play(e.open ? 'door_open' : 'door_close', p || centre(e.at)); if (p) dust({ x: p.x, y: p.y + p.s * 0.3 }, p.s * 0.6); },
  trap(e) { const p = at(e.at); play('chop', p, { rate: 0.8 }); if (p) { burst('spark_burst', p, p.s, 300, { color: HP }); floatText('TRAP', p, HP, { small: true }); } },
  shove(e) {
    if (e.ok && e.from !== e.to) slideFrom(e.from, e.to);
    if (e.magic && e.ok && e.from !== e.to) dragTrail(e.from, e.to, !!e.pull);
    const p = at(e.to); if (!p) return;
    shake(tokOf(e.target, e.to), 0.6); play(e.magic ? 'vent' : 'hit_heavy', p, { rate: e.magic ? 1.4 : 0.9, gain: 0.8 });
    if (e.prone) { floatText('PRONE', p, WHITE, { small: true }); play('body_fall', p, { delay: 120 }); }
    else if (!e.ok) floatText('HOLDS', p, MUTED, { small: true });
  },
  stance(e) {
    const p = at(e.at); if (!p) return;
    const word = e.what === 'prone' ? 'PRONE' : e.what === 'stand' ? 'UP' : e.what === 'brace' ? 'BRACED' : 'OVERWATCH';
    floatText(word, p, WHITE, { small: true });
    play(e.what === 'prone' ? 'body_fall' : e.what === 'overwatch' ? 'rack' : 'step', p, { rate: e.what === 'prone' ? 1.3 : 1, gain: 0.6 });
    if (e.what === 'overwatch') ring(p, WHITE, 600, { from: 1.4, to: 0.9, width: 3 });
  },
  analyze(e) {
    const p = at(e.to); if (!p) return;
    const s = svg(40, 40, '<path d="M4 12 V4 H12 M28 4 H36 V12 M36 28 V36 H28 M12 36 H4 V28" fill="none" stroke="#FFFFFF" stroke-width="3"/>');
    const box = put(s, p, p.s * 1.3, p.s * 1.3, 700);
    anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { opacity: 0.2, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });
    play('sigil_draw', p, { rate: 1.8, gain: 0.5 });
    // Rules 1.10: Analyze aimed at a glyph or a trace reads (copies) its word.
    if (e.glyph) { play('sg_study', p, { delay: 260 }); floatText('COPIED', p, SIGIL_INK, { small: true, delay: 300 }); }
    else floatText('ANALYZED', p, WHITE, { small: true, delay: 300 });
  },
  // pickup and pile: fx/world.ts (rules 1.9, the pick-up names what was taken).
  cover() { /* folded into the shot */ },
  // ---------- Sigils (rules 1.4): cyan, square, snapping; each element in its own way (fx/elements.ts) ----------
  draw(e) {
    const p = at(e.tile); if (!p) return;
    const d = GLYPH_PATHS[e.word] || 'M6 6 H18 V18 H6 Z', el = elementFx(e.element || e.word);
    const s = svg(24, 24, '<path d="' + d + '" pathLength="1" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/>');
    const box = put(s, p, p.s * 0.8, p.s * 0.8, 900);
    const path = s.querySelector('path'); if (path) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: reducedMotion() ? 1 : 320, easing: 'ease-out', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
    // The glyph locks into its tile: a square frame snaps on (a Line that grows, a fresh start, or a Stack's second).
    snapFrame(p, e.effect === 'breaks' ? MUTED : SIGIL_INK, 'sigil', 380, { delay: 260, from: 1.3, to: e.effect === 'stacks' ? 0.8 : 1 });
    squares(p, el.id === 'raw' ? SIGIL_INK : el.ink, 6, 0.5, 600, 300);
    // Each word is a note: a pattern drawn word by word plays a short melody.
    play('sigil_draw', p, { rate: NOTE[(hash(e.word) % NOTE.length)] });
    // Sigil 1.5 (rules 1.10): the glyph joins a stroke (a Line grows, or a junction joins two): a glassy link after the note.
    if (e.effect === 'extends') play('sg_join', p, { delay: 240, rate: e.junction ? 0.85 : 1 });
  },
  // Sigil 1.5 (rules 1.10): an Evoke's study crossed a threshold, or a word became Mastered and its inflection came on.
  sigil_growth(e) {
    const p = at(e.at), now: string[] = e.mastered || [];
    if (now.length) { play('sg_inflect', p, { delay: 300 }); if (p) { ring(p, SIGIL_INK, 800, { from: 0.6, to: 2.2, width: 2, delay: 300 }); floatText('INFLECTION ON · ' + now.map((w) => w.toUpperCase()).join(' · '), p, SIGIL_INK, { small: true, delay: 300 }); } }
    else { play('sg_study', p, { delay: 200, gain: 0.7 }); if (p) floatText('A NEW WORD CAN BE LEARNED', p, SIGIL_INK, { small: true, delay: 200 }); }
  },
  glyph_fade(e) { const p = at(e.tile); if (!p) return; fallingSquares(p, MUTED, 5, 500); floatText((e.word || '').toUpperCase() + ' FADES', p, MUTED, { small: true }); },
  scuff(e) { const p = at(e.at); if (p) { dust(p, p.s); squares(p, MUTED, 6, 0.4, 400); } play('step', p, { rate: 0.7 }); },
  evoke(e) {
    // The Grand Sigilist plants the staff (fx/grand.ts draws the standing form): a flash on the staff, a ring wave out
    // across the radius in the word's tint, the tiles lighting up from the centre, the word's name.
    if (e.shape === 'grand') {
      const c = at(e.src || e.impact), w = (e.words || [])[0] || '', L = grandLook(w), tiles: string[] = e.tiles || [];
      play('sigil_evoke', c || at(e.at), { rate: 0.7, gain: 1 });
      if (!c) return;
      burst('flash_star', c, c.s * 2.2, 420, { color: WHITE, from: 0.3, to: 1.4 });
      if (!reducedMotion()) for (let i = 0; i < 2; i++) burst('ring', c, c.s * 5.4, 700, { color: L.tint, from: 0.15, to: 1, delay: i * 180, fade: 0 });
      const [cx, cy] = String(e.src || e.impact).split(',').map(Number);
      for (const k of tiles) { const q = at(k); if (!q) continue; const [x, y] = k.split(',').map(Number), d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        burst('glow', q, q.s * 1.1, 420, { color: L.tint, from: 0.4, to: 1.1, delay: 80 + d * 120, blend: 'screen' }); }
      if (L.element) after(() => elementImpact(c, elementFx(L.element).id, 'sigil', { power: 0.9, quiet: true }), 120);
      floatText('GRAND ' + (w ? w.toUpperCase() : ''), c, L.tint, { delay: 260 });
      return;
    }
    const tiles: string[] = e.tiles || [], el = e.element || null;
    const missiles: any[] = Array.isArray(e.missiles) && e.missiles.length ? e.missiles : e.src && e.impact ? [{ origin: e.src, impact: e.impact, kind: e.cone ? 'touch' : 'bolt', burst: [e.impact] }] : [];
    const src = centre(missiles[0]?.origin || e.src || e.at);
    play('sigil_evoke', src || at(e.at));
    // The pattern flashes white and collapses into where it fires from.
    for (const k of tiles) { const q = at(k); if (!q) continue; burst('flare', q, q.s * 1.2, 260, { color: WHITE, from: 0.5, to: 1.5 }); if (src && !reducedMotion()) squaresTo(q, src, SIGIL_INK, 3, 220); }
    if (missiles.length > 1 && src) { snapFrame(src, WHITE, 'sigil', 300, { from: 0.6, to: 1.4 }); floatText('×' + missiles.length, src, SIGIL_INK, { small: true }); } // TWICE: the spell splits
    const glyph = subjectGlyph(e.words || []);
    missiles.forEach((m, i) => after(() => missile(e, m, el, glyph), 230 + i * 110));
  },
  chain(e) {
    const a = at(e.from) || centre(e.from), b = at(e.to); if (!a || !b) return;
    const el = elementFx(e.element);
    if (e.jump == null && e.unit) { // Storm's chain off a released Outburst: violet first, then the element
      jag(a, b, { ...el, core: WHITE, ink: SOUL_INK }, 'soul', 300); jag(a, b, el, 'soul', 240, 70);
      elementImpact(b, el.id, 'soul', { power: 0.5, quiet: true }); play('el_zap', b, { rate: 0.9, gain: 0.7, lowpass: 2600 }); return;
    }
    jag(a, b, { ...el, core: WHITE, ink: SIGIL_INK }, 'sigil', 260); jag(a, b, el, 'sigil', 200, 60);
    burst('zap', b, b.s * 1.1, 260, { color: WHITE, from: 0.5, to: 1.2 });
    chip(b, String(e.jump || 1), SIGIL_INK);
    play('el_zap', b, { rate: 1 + 0.12 * (e.jump || 1) });
  },
  fizzle(e) {
    const tiles: string[] = (e.tiles || []).slice(0, 12), p0 = at(e.at);
    for (const k of tiles.length ? tiles : [e.at]) { const q = at(k); if (q) fallingSquares(q, SIGIL_INK, 6, 650); }
    if (p0) { glitch(p0, 260); floatText('FIZZLE', p0, MUTED, { small: true, delay: 120 }); }
    play('sg_fizzle', p0 || centre(e.at));
  },
  field(e) {
    const tiles: string[] = e.tiles || [], el = elementFx(e.element), first = at(tiles[0]);
    tiles.slice(0, 16).forEach((k, i) => { const q = at(k); if (q) elementImpact(q, el.id, 'sigil', { power: 0.45, delay: i * 40, quiet: true }); });
    if (first) floatText((el.word ? el.word + ' ' : '') + 'FIELD', first, el.id === 'raw' ? SIGIL_INK : el.ink, { small: true, delay: 200 });
    play(el.sound.impact, first || centre(tiles[0]), { rate: 0.85, gain: 0.8 });
  },
  field_tick(e) { const p = at(e.at); if (!p) return; const el = elementFx(e.element); elementImpact(p, el.id, 'sigil', { power: 0.5, quiet: true }); play(el.sound.tick, p, { gain: 0.6, rate: jitter(0.1) }); },
  field_gone(e) { for (const k of (e.tiles || [e.tile]).slice(0, 16)) { const q = at(k); if (q) squares(q, MUTED, 4, 0.4, 500); } },
  trap_set(e) {
    if (!mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    // Faint on purpose: only its own side sees it go down, and it sinks out of sight.
    snapFrame(p, SIGIL_INK, 'sigil', 700, { from: 1.2, to: 0.85, width: 2 });
    const s = svg(24, 24, '<path d="' + (GLYPH_PATHS.wait || '') + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="1.6" stroke-linecap="round"/>');
    const box = put(s, p, p.s * 0.6, p.s * 0.6, 900);
    anim(box, [{ opacity: 0 }, { opacity: 0.55, offset: 0.3 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 900, easing: 'steps(5, end)', fill: 'forwards' });
    play('sg_trap_set', p, { gain: 0.5 });
  },
  trap_spotted(e) {
    if (!mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    corners(p, HP, 700); floatText('TRAP SPOTTED', p, HP, { small: true, delay: 250 }); play('sigil_draw', p, { rate: 2, gain: 0.6 });
  },
  trap_sprung(e) {
    const p = at(e.tile); if (!p) return;
    spikes(p, elementFx(e.element));
    elementImpact(p, e.element, 'sigil', { power: 1, delay: 90, decalKey: e.tile, sound: (s, o) => play(s, p, o) });
    play('sg_trap_sprung', p); floatText('TRAP', p, HP, { small: true, delay: 150 });
  },
  trap_gone(e) { if (!mineOnly(e)) return; const p = at(e.tile); if (p) squares(p, MUTED, 4, 0.3, 400); },
  turret_placed(e) {
    if (e.only && !mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    // The pillar rises out of the tile in three snaps; the standing look (ambient.ts) takes over once it stands.
    const n = turretNode(e.element, e.side === viewer);
    const box = put(n, { x: p.x, y: p.y - p.s * 0.12 }, p.s * 0.7, p.s * 0.9, 700);
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateY(40%) scaleY(0)', opacity: 0 }, { transform: 'translateY(0) scaleY(1)', opacity: 1 }], { duration: 420, easing: 'steps(3, end)', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 700, delay: 0, fill: 'forwards' });
    squares(p, SIGIL_INK, 8, 0.5, 500);
    play('sg_turret', p);
  },
  turret_shot(e) {
    const a0 = at(e.from), b = centre(e.to); if (!b) return;
    const top = a0 ? { x: a0.x, y: a0.y - a0.s * 0.45, s: a0.s } : null;
    if (top) { burst('flare', top, top.s * 0.7, 160, { color: WHITE, from: 0.4, to: 1.3 }); play('el_zap', top, { rate: 1.15 }); }
    const kind = e.kind === 'lob' ? 'lob' : e.kind === 'appear' ? 'appear' : 'bolt';
    const ft = top ? elementTrail(top, b, e.element, 'sigil', kind) : 0;
    after(() => { if (visible(e.to)) elementImpact(b, e.element, 'sigil', { power: 0.7, sound: (s, o) => play(s, b, o) }); }, ft);
  },
  turret_destroyed(e) {
    if (e.only && !mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    for (let i = 0; i < 3; i++) fallingSquares({ x: p.x, y: p.y - p.s * (0.1 + i * 0.15), s: p.s }, SIGIL_INK, 4, 600, i * 50);
    burst('spark_burst', p, p.s, 280, { color: SIGIL_INK }); floatText(e.why === 'time' ? 'TURRET FADES' : 'TURRET DOWN', p, MUTED, { small: true });
    play('sg_turret_break', p);
  },
  wall_raised(e) {
    const tiles: string[] = e.tiles || [];
    tiles.slice(0, 8).forEach((k, i) => { const q = at(k); if (q) after(() => slab(q, true), i * 70); });
    const p = at(tiles[0]); play('el_stone_rise', p || centre(tiles[0])); if (p) shakeScreen(0.3);
  },
  wall_crumbled(e) {
    const tiles: string[] = e.tiles || [];
    tiles.slice(0, 8).forEach((k, i) => { const q = at(k); if (q) after(() => slab(q, false), i * 60); });
    play('el_stone_crumble', at(tiles[0]) || centre(tiles[0]));
  },
  null_wave(e) {
    const p = at(e.at) || centre(e.at); if (!p) return;
    // A square shockwave, then every glyph it wipes flickers out in scattered squares.
    for (let i = 0; i < 3; i++) snapFrame(p, i ? SIGIL_INK : WHITE, 'sigil', 600, { from: 0.4, to: 2.6 + i * 0.6, delay: i * 90, width: 4 - i });
    for (const k of [...(e.glyphs || []), ...(e.walls || [])].slice(0, 16)) { const q = at(k); if (q) after(() => { glitch(q, 200); fallingSquares(q, SIGIL_INK, 5, 500); }, 160); }
    if (e.removed) floatText('NULL ×' + e.removed, p, WHITE, { small: true, delay: 200 }); else floatText('NULL', p, MUTED, { small: true, delay: 200 });
    play('sg_null', p);
  },
  blink(e) {
    const a = at(e.from), b = at(e.to);
    if (a) { beamUp(a, true); fallingSquares(a, SIGIL_INK, 6, 380); play('sg_blink', a); }
    if (b) after(() => { beamUp(b, false); squaresTo({ x: b.x, y: b.y - b.s }, b, SIGIL_INK, 5, 200); const t = tokOf(e.target, e.to); if (t) anim(t, [{ opacity: 0 }, { opacity: 0.4, offset: 0.4 }, { opacity: 1 }], { duration: 260, easing: 'steps(4, end)' }); play('sg_blink', b, { rate: 1.3 }); }, a ? 240 : 0);
  },
  mask(e) {
    const p = at(e.at); if (!p) return;
    const tok = tokOf(e.target, e.at), outline = { filter: 'grayscale(1) brightness(.15) drop-shadow(0 0 1px ' + SIGIL_INK + ') drop-shadow(0 0 2px ' + SIGIL_GLOW + ')', opacity: 0.5 };
    if (tok) anim(tok, e.fade ? [outline, { filter: 'none', opacity: 1 }] : [{ filter: 'none', opacity: 1 }, outline, { filter: 'none', opacity: 1 }], { duration: e.fade ? 500 : 1400, easing: 'steps(6, end)' });
    snapFrame(p, SIGIL_INK, 'sigil', 500, { from: 1, to: 0.7, width: 2 });
    floatText(e.fade ? 'UNMASKED' : 'MASKED', p, e.fade ? MUTED : SIGIL_INK, { small: true });
    play('sg_mask', p, { rate: e.fade ? 1.2 : 1 });
  },
  leech(e) {
    const to = at(e.to) || centre(e.to); if (!to) return;
    const el = elementFx(e.element);
    for (const k of (e.from || []).slice(0, 4)) { const a = at(k); if (!a) continue; for (let i = 0; i < 7; i++) particle(a, Math.max(4, a.s * 0.1), shardCss(el, 'sigil'), [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + ((to.x - a.x) / 2 + (Math.random() - 0.5) * 30) + 'px,' + ((to.y - a.y) / 2 + (Math.random() - 0.5) * 30) + 'px) rotate(90deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (to.x - a.x) + 'px,' + (to.y - a.y) + 'px) rotate(180deg)', opacity: 0.3 }], 620, i * 45, 'steps(8, end)'); }
    after(() => { pluses(to, OK, 4); flash(tokOf(e.unit, e.to), 'heal'); floatText('+' + (e.amount || 0), to, OK); }, 560);
    play('sg_leech', to);
  },
  command(e) {
    const p = at(e.at); if (!p) return;
    const from = e.by ? at(unit(e.by)?.pos) : null;
    if (from) linkChain(from, p, 380);
    after(() => {
      const s = svg(24, 24, '<rect x="2" y="2" width="20" height="20" fill="rgba(10,13,19,.75)" stroke="' + SIGIL_INK + '" stroke-width="1.5"/><path d="' + GLYPH_PATHS.command + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2" stroke-linecap="round"/>');
      const box = put(s, { x: p.x, y: p.y - p.s * 0.8 }, p.s * 0.5, p.s * 0.5, 1100); anchor(box, e.at, 1100, -0.8);
      anim(box, [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1100, easing: 'steps(6, end)', fill: 'forwards' });
      const order = String(e.order || '').toUpperCase(); floatText(order ? 'COMMAND: ' + order : 'COMMANDED', p, SIGIL_INK, { small: true, delay: 120 });
      if (e.to) { const q = at(e.to); if (q) squaresTo(p, q, SIGIL_INK, 4, 360, 200); }
    }, from ? 360 : 0);
    play('sg_command', p);
  },
  boon(e) {
    const p = at(e.at); if (!p) return;
    const tok = tokOf(e.target, e.at);
    switch (e.word) {
      case 'ward': brackets(p, SIGIL_INK); floatText('WARD +' + (e.amount || 0), p, SIGIL_INK, { small: true, delay: 200 }); play('sg_ward', p); break;
      case 'mend': pluses(p, OK, 6); squares(p, OK, 5, 0.5, 500); flash(tok, 'heal'); floatText('+' + (e.amount || 0), p, OK, { delay: 150 }); play('sg_mend', p); break;
      case 'quicken': speedRing(p); floatText('QUICKENED', p, WHITE, { small: true, delay: 200 }); play('sg_quicken', p); break;
      case 'sharpen': glint(p); floatText('SHARPENED', p, WHITE, { small: true, delay: 200 }); play('sg_sharpen', p); break;
      case 'cleanse': chipShatter(p, condWord(e.cond)); play('sg_cleanse', p); play('el_shatter', p, { delay: 220, gain: 0.6 }); break;
      default: snapFrame(p, SIGIL_INK); play('sg_ward', p, { gain: 0.6 });
    }
  },
  veil(e) { for (const k of (e.tiles || [e.at]).slice(0, 12)) { const q = at(k); if (q) burst('puff', q, q.s * 1.4, 1500, { from: 0.4, to: 1.3, fade: 0 }); } play('vent', at(e.at) || centre(e.at), { rate: 0.75 }); },
  light(e) { for (const k of (e.tiles || [e.at]).slice(0, 12)) { const q = at(k); if (q) burst('glow', q, q.s * 1.4, 900, { color: '#FFF8E1', from: 0.3, to: 1.2 }); } const p = at(e.at); if (p) snapFrame(p, WHITE, 'sigil', 500, { from: 0.5, to: 2 }); play('sg_light', p || centre(e.at)); },
  miss(e) {
    const p = at(e.at); if (!p) return;
    if (e.by === 'soul') motes(p, SOUL_INK, 5, false, 400); else shards(p, elementFx(e.element), 'sigil', 5, 0.5, 350);
    floatText('MISS', p, MUTED); play('whiz', p, { rate: 1.3 });
  },
  cond(e) { const p = at(e.at); if (!p) return; floatText(e.resisted ? 'RESISTED' : condWord(e.id), p, e.resisted ? MUTED : condBoon(e.id) ? OK : WHITE, { small: true, delay: 200 }); if (e.id === 'corroded' && !e.resisted) bubbles(p, ELEMENTS.acid, 'sigil', 4, 900, 200); },
  overload(e) { const p = at(e.at); play('sigil_overload', p || centre(e.at)); screenTint('red', 420); if (p) { glitch(p, 420); squares(p, HP, 14, 1.2, 500); shake(tokOf(e.unit, e.at), 1.2); } },
  vent(e) { const p = at(e.at); play('vent', p, e.bleed ? { rate: 1.4, gain: 0.5 } : {}); if (p && e.bleed) floatText('BLED +1', p, SIGIL_INK, { small: true }); if (p) for (let i = 0; i < (e.bleed ? 3 : 10); i++) squaresTo(p, { x: p.x + (Math.random() - 0.5) * p.s, y: p.y - p.s * (1.5 + Math.random()) }, SIGIL_INK, 1, 600, i * 40); },
  // ---------- Outbursts (1.2 events in old logs; the 1.5 heart is in soul.ts) ----------
  grow(e) {
    const p = at(e.at), st = e.stage || 2, col = mix(SOUL_INK, SOUL_WARM, (st - 1) / 3);
    play('heartbeat', p, { rate: 1 + 0.12 * st });
    if (p) { ring(p, col, 600, { from: 0.5, to: 1.1 + 0.15 * st, width: 4 + st }); floatText('STAGE ' + st, p, col, { small: true }); }
  },
  syphon(e) { const p = at(e.at); play('soul_hold', p, { rate: 1.4 }); if (p) { for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = p.s * (1.4 + Math.random()); moteTo({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }, p, SOUL_INK, 500, i * 40); } floatText('+' + (e.mp || 0) + ' MP', p, '#5C9EFF', { small: true, delay: 300 }); } },
  mana() { /* the meter shows it */ },
  song() { /* the music plays it */ },
};
/** The Soul heart's handlers (fx/soul.ts), lent this layer's fog-aware lookups. They override the 1.2 names they share. */
const SOUL_KIT = { at, tokOf, posOf: (id: string | null | undefined) => unit(id)?.pos, play };
Object.assign(H, soulHandlers(SOUL_KIT));
// Outburst 4.0 (fx/feelings.ts): feelings felt and poured, residue, Revert, practice, Fuse, Linger, Thread.
Object.assign(H, feelingHandlers(SOUL_KIT));
// Blessing 2.0 (fx/faith.ts): prayers, Witnessed, interventions, Devotion, vows, the patron's lines and Miracles.
Object.assign(H, faithHandlers({ ...SOUL_KIT, posOfChar: (charId) => { if (!charId) return undefined; for (const u of units.values()) if (u.charId === charId) return u.pos; return undefined; },
  nameOfChar: (charId) => (charId ? charNames.get(charId) : undefined), hurry: (ms) => hurryFx(ms) }));
const NOTE = [1, 1.122, 1.26, 1.498, 1.682, 2];
const hash = (s: string) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const COND_WORD: Record<string, string> = { slowed: 'SLOWED', pinned: 'PINNED', blinded: 'BLINDED', burning: 'BURNING', shaken: 'SHAKEN', fear: 'AFRAID', confused: 'CONFUSED', ldebuff: 'MUDDLED', rdebuff: 'UNSETTLED', silenced: 'SILENCED', guarded: 'GUARDED', inspired: 'INSPIRED', corroded: 'CORRODED', quickened: 'QUICKENED', sharpened: 'SHARPENED', commanded: 'COMMANDED', bound: 'BOUND', muddled: 'MUDDLED', dreaded: 'AFRAID', hidden: 'HIDDEN' };
const condWord = (id: string) => COND_WORD[id] || String(id || '').toUpperCase();
const condBoon = (id: string) => id === 'guarded' || id === 'inspired' || id === 'quickened' || id === 'sharpened';

// ---------- particles: Sigil squares, Soul motes, heal pluses ----------
function squares(p: Pt, color: string, n: number, spread: number, ms: number, delay = 0) {
  if (reducedMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = p.s * spread * (0.4 + Math.random() * 0.6), sz = Math.max(3, p.s * (0.06 + Math.random() * 0.05));
    particle(p, sz, 'background:' + color + ';box-shadow:0 0 4px ' + color, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * r + 'px,' + (Math.sin(a) * r - p.s * 0.2) + 'px) rotate(90deg)', opacity: 0 }], ms * (0.7 + Math.random() * 0.5), delay + i * 15);
  }
}
function squaresTo(a: { x: number; y: number }, b: { x: number; y: number }, color: string, n: number, ms: number, delay = 0) {
  for (let i = 0; i < n; i++) particle(a, 5, 'background:' + color + ';box-shadow:0 0 4px ' + color, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)', opacity: 0.2 }], ms, delay + i * 30);
}
/** Soul particles: soft round motes that drift up (or rise from the floor). */
function motes(p: Pt, color: string, n: number, rise: boolean, ms: number) {
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s, sz = Math.max(3, p.s * (0.07 + Math.random() * 0.06));
    particle({ x: p.x + x, y: p.y + (rise ? p.s * 0.3 : 0) }, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 8px ' + color + ';filter:blur(.5px)', [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + x * 0.3 + 'px,-' + p.s * (0.6 + Math.random() * 0.5) + 'px)', opacity: 0 }], ms * (0.7 + Math.random() * 0.5), i * 30);
  }
}
function moteTo(a: { x: number; y: number }, b: { x: number; y: number }, color: string, ms: number, delay = 0) {
  const sz = 6 + Math.random() * 5, wob = (Math.random() - 0.5) * 40;
  particle(a, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 10px ' + color + ';filter:blur(.6px)', [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + ((b.x - a.x) / 2 + wob) + 'px,' + ((b.y - a.y) / 2 - wob) + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)', opacity: 0.4 }], ms, delay);
}
const squaresOrMotes = (p: Pt, color: string, soul: boolean) => (soul ? motes(p, color, 5, false, 500) : squares(p, color, 6, 0.6, 400));
function pluses(p: Pt, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s * 0.9, sz = p.s * (0.22 + Math.random() * 0.12);
    const run = () => {
      const t = document.createElement('div'); t.textContent = '+';
      t.style.cssText = "font:700 " + Math.round(sz) + "px 'Chakra Petch',sans-serif;color:" + color + ';text-shadow:0 0 6px ' + color + ';display:grid;place-items:center;width:100%;height:100%';
      const box = put(t, { x: p.x + x, y: p.y + p.s * 0.2 }, sz, sz, 900);
      anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateY(-' + p.s * (0.6 + Math.random() * 0.4) + 'px)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    };
    after(run, i * 60);
  }
}

// ---------- Sigil pieces (rules 1.4) ----------
/** Whose eyes this screen is: the squad (the Proving Ground's team fight and every room play from the PC side). */
let viewer: 'pc' | 'foe' = 'pc';
export const setViewer = (s: 'pc' | 'foe') => { viewer = s; };
/** An event marked only for one side plays only on that side's screens (the room view drops them already; this is the
 *  second lock, for the area map's stream and the host's own view). */
const mineOnly = (e: FxEvent) => !e.only || e.only === viewer;
/** The glyph a lobbed spell carries over: its first Subject's stroke. */
function subjectGlyph(words: string[]): string {
  const w = words.find((x) => SIGIL[x]?.group === 'subject') || words[0];
  const d = (w && GLYPH_PATHS[w]) || 'M6 6 H18 V18 H6 Z';
  return '<svg viewBox="0 0 24 24" width="80%" height="80%"><path d="' + d + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/** One missile of an Evoke: flies by its Reach (SEEK's beam stops at its block tile, ARC lobs, SENSE appears, RELAY hops
 *  through the ally), then its Burst lands tile by tile in the element's look. */
function missile(e: FxEvent, m: any, el: string | null, glyph: string) {
  const origin = centre(m.origin), kind = (m.kind || 'bolt') as MissileKind;
  const end = m.blockedAt || m.impact, endP = centre(end);
  if (!endP) return;
  let ft = 0;
  if (origin && kind === 'relay' && Array.isArray(m.hops) && m.hops.length) {
    // RELAY: a beam to each ally on the way, a ring on them as it passes through, then on to the impact.
    let a = origin;
    for (const h of [...m.hops, end]) { const b = centre(h); if (!b) continue; const t0 = ft; after(() => { elementTrail(a, b, el, 'sigil', 'bolt'); }, t0); ft += Math.max(110, Math.hypot(b.x - a.x, b.y - a.y) / 2.4); if (h !== end) { const hb = b; after(() => { snapFrame(hb, SIGIL_INK, 'sigil', 320, { from: 0.6, to: 1.2 }); play('el_zap', hb, { rate: 1.4, gain: 0.5 }); }, ft); } a = b; }
  } else if (origin && kind === 'appear') {
    // SENSE: no flight; a frame snaps in where it appears.
    snapFrame(endP, WHITE, 'sigil', 360, { from: 2, to: 1 }); ft = 160;
  } else if (origin && (kind === 'bolt' || kind === 'lob' || kind === 'touch')) ft = elementTrail(origin, endP, el, 'sigil', kind, { glyph });
  after(() => {
    if (m.blockedAt && m.blockedAt !== m.impact) { const q = centre(m.blockedAt); if (q) { burst('spark_burst', q, q.s * 0.7, 240, { color: SIGIL_INK }); floatText('BLOCKED', q, MUTED, { small: true }); } }
    if (m.placed || e.fizzle) { const q = at(m.impact); if (q) snapFrame(q, SIGIL_INK, 'sigil', 360); return; }
    const tiles: string[] = Array.isArray(m.burst) && m.burst.length ? m.burst : [m.impact];
    const core = centre(m.core || m.impact) || endP;
    tiles.slice(0, 24).forEach((k) => {
      const q = at(k); if (!q) return;
      const dd = Math.hypot(q.x - core.x, q.y - core.y) / Math.max(1, q.s);
      elementImpact(q, el, 'sigil', { power: k === (m.core || m.impact) ? 1 : 0.6, delay: Math.round(dd * 60), decalKey: k === (m.core || m.impact) ? k : null, quiet: true });
    });
    const fx = elementFx(el); play(fx.sound.impact, core, { rate: fx.sound.rate * jitter(0.05), gain: tiles.length > 1 ? 1 : 0.8 });
    if (tiles.length > 2) shakeScreen(0.3 + Math.min(0.6, tiles.length * 0.05) * fx.shake);
  }, ft);
}
/** PULL's drag (or a GALE push): a trail of squares along the way the body was moved, link marks for a pull. */
function dragTrail(from: string, to: string, pull: boolean) {
  const a = centre(from), b = centre(to); if (!a || !b || (!visible(from) && !visible(to))) return;
  const n = Math.max(3, Math.min(12, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.3))));
  const el = pull ? ELEMENTS.raw : ELEMENTS.gale;
  for (let i = 0; i < n; i++) { const t = i / n, q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; particle(q, Math.max(3, a.s * (pull ? 0.1 : 0.3)), pull ? 'border:2px solid ' + SIGIL_INK + ';transform:rotate(45deg)' : shardCss(el, 'sigil'), [{ opacity: 0.9 }, { opacity: 0 }], 520, i * 18, 'steps(4, end)'); }
  if (pull) floatText('PULLED', b, SIGIL_INK, { small: true });
}
/** Squares that fall off a tile and drop out of sight (a fizzle, a fading glyph, a broken turret). */
function fallingSquares(p: Pt, color: string, n: number, ms: number, delay = 0) {
  if (reducedMotion()) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * p.s * 0.8, sz = Math.max(3, p.s * (0.07 + Math.random() * 0.05)); particle({ x: p.x + x, y: p.y - p.s * 0.1 }, sz, 'background:' + color + ';box-shadow:0 0 0 1px ' + SIGIL_GLOW, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + x * 0.4 + 'px,-' + p.s * 0.15 + 'px) rotate(90deg)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + x * 0.6 + 'px,' + p.s * 0.6 + 'px) rotate(180deg)', opacity: 0 }], ms * (0.8 + Math.random() * 0.4), delay + i * 25, 'steps(6, end)'); }
}
/** A glitch over a tile: offset cyan and red slices and a hue flicker (an overload, NULL wiping a glyph, a fizzle). */
function glitch(p: Pt, ms: number) {
  if (reducedMotion()) { burst('flare', p, p.s, 160, { color: HP }); return; }
  for (let i = 0; i < 5; i++) {
    const y = (Math.random() - 0.5) * p.s * 1.2, w = p.s * (0.6 + Math.random() * 0.8);
    particle({ x: p.x + (Math.random() - 0.5) * p.s * 0.4, y: p.y + y }, w, 'height:' + Math.max(2, p.s * 0.06) + 'px;margin-top:' + (w / 2 - 2) + 'px;background:' + (i % 2 ? HP : SIGIL_INK) + ';mix-blend-mode:screen', [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (Math.random() - 0.5) * p.s * 0.6 + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translateX(0)', opacity: 0 }], ms, i * 30, 'steps(3, end)');
  }
}
/** A small numbered chip at a tile (CHAIN's jump count). */
function chip(p: Pt, text: string, color: string) {
  const t = document.createElement('div'); t.textContent = text;
  t.style.cssText = "width:100%;height:100%;display:grid;place-items:center;font:700 " + Math.round(p.s * 0.3) + "px 'Chakra Petch',sans-serif;color:#0A0D13;background:" + color + ';box-shadow:0 0 0 2px #0A0D13,0 0 8px ' + SIGIL_GLOW;
  const box = put(t, { x: p.x + p.s * 0.35, y: p.y - p.s * 0.4 }, p.s * 0.4, p.s * 0.4, 900); box.style.zIndex = '3';
  anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 900, easing: 'steps(5, end)', fill: 'forwards' });
}
/** A reticle's corners closing on a tile (a spotted trap). */
function corners(p: Pt, color: string, ms: number) {
  const s = svg(40, 40, '<path d="M4 12 V4 H12 M28 4 H36 V12 M36 28 V36 H28 M12 36 H4 V28" fill="none" stroke="' + color + '" stroke-width="3"/>');
  const box = put(s, p, p.s * 1.3, p.s * 1.3, ms);
  anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { opacity: 0.3, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, easing: 'steps(6, end)', fill: 'forwards' });
}
/** WAIT going off: square spikes snap up out of the tile. */
function spikes(p: Pt, el: ElementFx) {
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * p.s * 0.17, h = p.s * (0.35 + ((i * 7) % 3) * 0.12);
    particle({ x: p.x + x, y: p.y + p.s * 0.2 - h / 2 }, h, 'width:' + Math.max(3, p.s * 0.1) + 'px;margin-left:' + (h / 2 - p.s * 0.05) + 'px;background:linear-gradient(0deg,' + SIGIL_INK + ',' + el.core + ');box-shadow:0 0 6px ' + SIGIL_GLOW, [{ transform: 'scaleY(0)', transformOrigin: '50% 100%', opacity: 1 }, { transform: 'scaleY(1)', transformOrigin: '50% 100%', opacity: 1, offset: 0.3 }, { transform: 'scaleY(1)', opacity: 0 }], 520, i * 20, 'steps(4, end)');
  }
}
/** A RAISE wall rising out of the floor (stone slab, dust at its foot), or crumbling into falling chips. */
function slab(p: Pt, up: boolean) {
  const st = ELEMENTS.stone;
  if (up) {
    const d = document.createElement('div');
    d.style.cssText = 'width:100%;height:100%;background:linear-gradient(180deg,#C9D3E3,#7F8BA1 60%,#4A3A20);box-shadow:inset 0 0 0 2px ' + SIGIL_INK + ';clip-path:inset(0 0 0 0)';
    const box = put(d, p, p.s * 0.9, p.s * 0.9, 800);
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }] : [{ clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.45 }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }], { duration: 800, easing: 'steps(5, end)', fill: 'forwards' });
    dust({ x: p.x, y: p.y + p.s * 0.35 }, p.s, st.ink);
  } else { shards(p, st, 'sigil', 10, 0.5, 700); dust({ x: p.x, y: p.y + p.s * 0.2 }, p.s * 1.2, st.ink); }
}
/** STEP: a column of light that takes the body out (up) or sets it down. */
function beamUp(p: Pt, out: boolean) {
  const d = document.createElement('div');
  d.style.cssText = 'width:100%;height:100%;background:linear-gradient(0deg,rgba(139,222,238,0),' + SIGIL_INK + ' 40%,#FFFFFF 50%,' + SIGIL_INK + ' 60%,rgba(139,222,238,0));box-shadow:0 0 12px ' + SIGIL_GLOW;
  const box = put(d, { x: p.x, y: p.y - p.s * 0.5 }, p.s * 0.45, p.s * 2, 360);
  anim(box, out ? [{ transform: 'scaleX(1) scaleY(.3)', opacity: 1 }, { transform: 'scaleX(.1) scaleY(1)', opacity: 0 }] : [{ transform: 'scaleX(.1) scaleY(1)', opacity: 0 }, { transform: 'scaleX(1) scaleY(.3)', opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 360, easing: 'steps(5, end)', fill: 'forwards' });
}
/** COMMAND's glyph chain: linked squares snapping out from the caster to the commanded. */
function linkChain(a: Pt, b: Pt, ms: number) {
  const n = Math.max(3, Math.min(10, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.5))));
  for (let i = 1; i <= n; i++) { const t = i / (n + 1), q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; particle(q, Math.max(5, a.s * 0.14), 'border:2px solid ' + SIGIL_INK + ';box-shadow:0 0 5px ' + SIGIL_GLOW + ';transform:rotate(45deg)', [{ opacity: 0, transform: 'rotate(45deg) scale(.4)' }, { opacity: 1, transform: 'rotate(45deg) scale(1)', offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], ms + 300, (ms * i) / n, 'steps(3, end)'); }
}
/** WARD: four brackets close in around the token into a square shield. */
function brackets(p: Pt, color: string) {
  const s = svg(40, 40, '<path d="M4 14 V4 H14 M26 4 H36 V14 M36 26 V36 H26 M14 36 H4 V26" fill="none" stroke="' + color + '" stroke-width="3.5" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/><rect x="6" y="6" width="28" height="28" fill="' + color + '" opacity=".14"/>');
  const box = put(s, p, p.s * 1.25, p.s * 1.25, 800);
  anim(box, [{ transform: 'scale(1.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.7 }, { transform: 'scale(1.05)', opacity: 0 }], { duration: 800, easing: 'steps(6, end)', fill: 'forwards' });
}
/** QUICKEN: a segmented ring spinning fast at the feet, speed streaks lifting off. */
function speedRing(p: Pt) {
  const s = svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + WHITE + '" stroke-width="5" stroke-dasharray="14 10"/><circle cx="50" cy="50" r="32" fill="none" stroke="' + SIGIL_INK + '" stroke-width="3" stroke-dasharray="6 8"/>');
  const box = put(s, { x: p.x, y: p.y + p.s * 0.15 }, p.s * 1.3, p.s * 0.65, 800);
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'rotate(0deg) scale(.6)', opacity: 0 }, { transform: 'rotate(180deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'rotate(540deg) scale(1.1)', opacity: 0 }], { duration: 800, easing: 'steps(12, end)', fill: 'forwards' });
  for (let i = 0; i < 5; i++) particle({ x: p.x + (i - 2) * p.s * 0.18, y: p.y }, p.s * 0.5, 'width:2px;margin-left:' + (p.s * 0.25 - 1) + 'px;background:linear-gradient(0deg,rgba(255,255,255,0),#FFFFFF)', [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateY(-' + p.s * 0.6 + 'px)', opacity: 0 }], 420, i * 50, 'ease-out');
}
/** SHARPEN: a glint sweeping across the token like light on a blade, and a star at its tip. */
function glint(p: Pt) {
  const d = document.createElement('div');
  d.style.cssText = 'width:100%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),#FFFFFF 50%,rgba(255,255,255,0));transform:rotate(-35deg)';
  const box = put(d, p, p.s * 0.25, p.s * 1.3, 460); box.style.mixBlendMode = 'screen';
  anim(box, [{ transform: 'translateX(-' + p.s * 0.6 + 'px)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateX(' + p.s * 0.6 + 'px)', opacity: 0 }], { duration: 460, easing: 'ease-out', fill: 'forwards' });
  burst('flash_star', { x: p.x + p.s * 0.35, y: p.y - p.s * 0.35 }, p.s * 0.6, 300, { color: WHITE, delay: 300, from: 0.2, to: 1.1 });
}
/** CLEANSE: the condition, a small chip over the head, shatters into fragments. */
function chipShatter(p: Pt, word: string) {
  const q = { x: p.x, y: p.y - p.s * 0.65, s: p.s };
  const t = document.createElement('div'); t.textContent = word;
  t.style.cssText = "width:100%;height:100%;display:grid;place-items:center;font:700 " + Math.max(9, Math.round(p.s * 0.22)) + "px 'Chakra Petch',sans-serif;color:#0A0D13;background:" + MUTED + ';white-space:nowrap';
  const box = put(t, q, p.s * 1.4, p.s * 0.32, 520);
  anim(box, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 1, offset: 0.55 }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 520, easing: 'steps(4, end)', fill: 'forwards' });
  after(() => { shards(q, { ...ELEMENTS.freeze, ink: MUTED, core: WHITE }, 'sigil', 10, 0.8, 520); floatText('CLEANSED', p, OK, { small: true }); }, 300);
}

// World Play 1.7 (fx/world.ts): carrying, searches, hazards, triggers, the alarm, approaches, talk, markers.
Object.assign(H, worldHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, play }));
// Class Roster Revision 3's moves (fx/classes.ts): the same kit as the Soul handlers, plus a few particles from here.
Object.assign(H, classHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, play, squares, dust, corners, glitch, condWord }));

// ---------- the queue ----------
/** How long each kind holds the stage before the next event starts (ms). */
function beatOf(e: FxEvent): number {
  if (!mineOnly(e)) return 0;
  const sb = soulBeat(e); if (sb !== undefined) return sb;
  const fe = feelingBeat(e); if (fe !== undefined) return fe;
  const kb = classBeat(e); if (kb !== undefined) return kb;
  const fb = faithBeat(e); if (fb !== undefined) return fb;
  const wb = worldBeat(e); if (wb !== undefined) return wb;
  if (e.k === 'explode' && e.what === 'discharge') return 520;
  switch (e.k) {
    case 'turn': return 140;
    case 'move': return Math.min(1100, Math.max(160, ((e.path?.length || 2) - 1) * (e.how === 'sprint' ? 75 : 115)));
    case 'shot': return e.chain ? 170 : e.object ? 150 : 400;
    case 'melee': return e.chain ? 240 : 420;
    case 'volley': return e.mode === 'auto' ? 260 : 90;
    case 'reload': case 'load': case 'clear': case 'repair': case 'core': case 'crystallise': return Math.min(1200, (e.dur || 1000) * 0.85);
    case 'explode': return 220; // whoever stands in the blast is hurt with it, not after the smoke
    case 'evoke': return 700 + Math.max(0, ((e.missiles?.length || 1) - 1) * 110) + (e.missiles?.some((m: any) => m.kind === 'lob') ? 250 : 0) + (e.missiles?.some((m: any) => m.kind === 'relay') ? 200 : 0);
    case 'chain': return 230;
    case 'field': case 'wall_raised': case 'null_wave': case 'turret_placed': return 420;
    case 'turret_shot': return e.kind === 'lob' ? 560 : 340;
    case 'trap_sprung': case 'blink': case 'leech': case 'command': case 'boon': case 'fizzle': case 'mask': return 380;
    case 'field_tick': case 'trap_set': case 'trap_spotted': case 'wall_crumbled': case 'turret_destroyed': case 'veil': case 'light': return 240;
    case 'glyph_fade': case 'field_gone': case 'trap_gone': return 80;
    case 'release': return 750;
    case 'outburst': return e.hold ? 600 : 250;
    case 'short': return 700;
    case 'down': return 380;
    case 'stim': case 'overload': case 'vent': case 'syphon': case 'grow': case 'analyze': case 'draw': return 420;
    case 'hurt': case 'heal': case 'shove': case 'trap': case 'door': return 260;
    case 'mana': case 'song': case 'cover': case 'object': case 'cond': case 'shield': return 60;
    default: return 200;
  }
}
let timers: { id: number; at: number; e: FxEvent; stream?: string }[] = [];
let queueEnd = 0, idleTimer = 0, turnsUntil = 0;
/** The longest the screen may hold the player's input while other units' turns play (a stuck clock never locks play). */
export const TURNS_HOLD_MAX = 8000;
/** Until when (performance.now() clock) other units' turns are still being shown: the engine runs the enemies' turns at
 *  once, so the state says "your turn" while their moves still play. The combat screen holds your actions until then. */
export const turnsBusyUntil = () => Math.min(turnsUntil, performance.now() + TURNS_HOLD_MAX);
// For the e2e suites (they wait for the other turns to finish playing before they act, as a player must).
if (typeof window !== 'undefined') (window as any).__phcHold = turnsBusyUntil;
/** When the queued effects will have played (performance.now() clock): a turn banner can wait for the enemies' moves. */
export const fxBusyUntil = () => Math.max(queueEnd, performance.now());
/** Run one event's effect now, outside the queue (for the turn intro, the Proving Ground, a test button). */
export function playFx(e: Partial<FxEvent> & { k: string }, stream?: string) {
  const ev = { n: 0, ...e } as FxEvent;
  try { if (mineOnly(ev)) H[ev.k]?.(ev); } catch (err) { console.warn('fx', ev.k, err); }
  // The turn intro (turnIntro.tsx) times enemy-turn banners on this clock instead of estimating. stream names whose
  // numbering n belongs to (FxLayer's stream key: 'cb|…' for a fight, 'st|…' for the area map).
  if (ev.n) try { window.dispatchEvent(new CustomEvent('phc:fx-at', { detail: { n: ev.n, stream: stream || '' } })); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent(FX_EVENT, { detail: ev })); } catch { /* */ }
}
/** How much faster than normal a backlog may play: past this, the oldest effects are skipped instead (they never play in a
 *  blur: "the battle keeps going in super speed"). */
export const MAX_SPEEDUP = 1.35;
/** Skip an effect: nothing drawn or heard, but its place in the stream is announced so turn banners keep their clock. */
function skipFx(e: FxEvent, stream?: string) { if (e.n) try { window.dispatchEvent(new CustomEvent('phc:fx-at', { detail: { n: e.n, stream: stream || '' } })); } catch { /* */ } }
/** Which events of a batch play, and how fast: the newest that fit in the room at no more than MAX_SPEEDUP; keep (when
 *  given) plays only the last few (a decided fight). Pure (tests). */
export function planQueue(beats: number[], room: number, keep?: number): { from: number; speed: number } {
  let from = keep != null ? Math.max(0, beats.length - keep) : 0;
  const sum = (i: number) => beats.slice(i).reduce((t, b) => t + b, 0);
  while (from < beats.length - 1 && sum(from) / MAX_SPEEDUP > room) from++;
  const total = sum(from);
  return { from, speed: total > room ? Math.max(1 / MAX_SPEEDUP, room / total) : 1 };
}
/** Queue events to play in order, each after the previous one's beat. A long backlog plays a little faster, and past that
 *  its oldest effects are skipped, so play never lags far and never races. keep: play only the last few (the fight is
 *  decided: what happened after it matters, not a replay of every step). */
export function queueFx(evs: FxEvent[], stream?: string, opts: { keep?: number; from?: number } = {}) {
  if (!evs.length) return;
  // A Miracle is a fixed hold, never compressed or skipped (everyone in the room sees the god answer, even in a backlog
  // or a decided fight), and what follows it (its effects) starts as its cut-in lands: Leon's order, "the screen zooms
  // to the map, then the miracle happens". What came before it plays first as usual (a decided fight skips it: the
  // Miracle is what it shows); what follows is planned on its own, its room counted from the landing.
  const mi = evs.findIndex((e) => e.k === 'miracle');
  if (mi >= 0) {
    const pre = evs.slice(0, mi), post = evs.slice(mi + 1);
    if (opts.keep != null) for (const e of pre) skipFx(e, stream); else queuePlain(pre, stream, {});
    queuePlain([evs[mi]], stream, { from: Math.max(performance.now(), queueEnd) }); // never skipped or sped up: it starts at the queue's end and holds its full beat
    queueFx(post, stream, { from: Math.max(performance.now(), queueEnd) }); // a later Miracle in the batch: the same again
    return;
  }
  queuePlain(evs, stream, opts);
}
/** queueFx for a batch with no Miracle in it. from: count the backlog from this time (after a Miracle's hold). */
function queuePlain(evs: FxEvent[], stream: string | undefined, opts: { keep?: number; from?: number }) {
  if (!evs.length) return;
  const now = performance.now(), base = Math.max(now, queueEnd);
  const backlog = base - Math.max(now, Math.min(base, opts.from ?? now)), room = Math.max(1500, 7000 - backlog);
  const plan = planQueue(evs.map(beatOf), room, opts.keep), speed = plan.speed;
  for (const e of evs.slice(0, plan.from)) skipFx(e, stream);
  evs = evs.slice(plan.from);
  let t = base, lastTurn = -1;
  for (const e of evs) {
    if (e.k === 'turn') lastTurn = t;
    const wait = t - now;
    if (wait <= 4) playFx(e, stream);
    else schedule(e, stream, t);
    t += beatOf(e) * speed;
  }
  queueEnd = t;
  // A batch that changes turns: the last turn it shows starts when its banner plays; input waits for it.
  if (lastTurn >= 0) { const was = turnsUntil; turnsUntil = Math.max(turnsUntil, lastTurn + 120); if (turnsUntil !== was) try { window.dispatchEvent(new CustomEvent(FX_HOLD)); } catch { /* */ } }
  clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { try { window.dispatchEvent(new CustomEvent(FX_IDLE)); } catch { /* */ } }, t - now + 50);
}
/** Play e at performance.now() time t (a timer the queue can move: hurryFx). */
function schedule(e: FxEvent, stream: string | undefined, t: number) {
  const entry = { id: 0, at: t, e, stream };
  entry.id = window.setTimeout(() => { timers = timers.filter((x) => x !== entry); playFx(e, stream); }, Math.max(0, t - performance.now()));
  timers.push(entry);
}
/** Move everything queued up by ms (a skipped cut-in: what it was holding plays now). Never before now; the turn hold
 *  and the idle signal move with it. */
export function hurryFx(ms: number) {
  if (!(ms > 0)) return;
  const now = performance.now(), was = timers; timers = [];
  for (const x of was) { clearTimeout(x.id); schedule(x.e, x.stream, Math.max(now, x.at - ms)); }
  queueEnd = Math.max(now, queueEnd - ms);
  if (turnsUntil > now) { turnsUntil = Math.max(now, turnsUntil - ms); try { window.dispatchEvent(new CustomEvent(FX_HOLD)); } catch { /* */ } }
  clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { try { window.dispatchEvent(new CustomEvent(FX_IDLE)); } catch { /* */ } }, queueEnd - now + 50);
}
/** Drop everything queued (the game changed, the tab was hidden). */
export function clearFx() { for (const x of timers) clearTimeout(x.id); timers = []; queueEnd = 0; turnsUntil = 0; volley = null; bumpGen(); closeCutIns(); }
/** Is there a grid on screen to draw on? */
export const canDraw = () => hasLayer() && gridShown();
/** The Proving Ground and the e2e scripts play single effects by hand (window.__phcFx.playFx({ k: 'pump', … })). */
if (typeof window !== 'undefined') (window as any).__phcFx = { playFx, queueFx };
