// Plays the engine's presentation events (packages/engine/src/combat.ts, FxEvent) as sound and pictures over the grid.
// Every player's screen plays the same events from the shared game state, in order, each given its beat so a burst of
// enemy actions reads as a sequence. Nothing here changes the game; nothing waits on it; a hidden tab skips it all.
import { type FxEvent, type GameState, visibility } from '@engine';
import { sfx, reducedMotion, type Sfx } from '../sfx';
import { GLYPH_PATHS, SIGIL_INK, SIGIL_GLOW, SOUL_INK, SOUL_WARM } from '../glyphs';
import { type Pt, after, bumpGen, particle, anim, angle, anchor, burst, centre, flash, floatText, gridShown, hasLayer, lunge, panOf, put, ring, screenTint, shake, shakeScreen, slideFrom, sprite, svg, tileEl, timerRing, tokenEl, walk } from './dom';

const HP = '#F65157', OK = '#6FEA77', MUTED = '#A3AEC2', WHITE = '#FFFFFF', MUZZLE = '#FFE2A0', HOT = '#FFF3C4';
/** The window event fired as each effect plays (detail: the FxEvent), and when the queue runs dry. */
export const FX_EVENT = 'phc-fx', FX_IDLE = 'phc-fx-idle';

// ---------- what the layer knows about the game right now ----------
interface UnitInfo { pos: string; name: string; side: string; robot: boolean; dead?: boolean }
let units = new Map<string, UnitInfo>();
let seenTiles: Set<string> | null = null;
const ROBOT = /drone|robot|\bbot\b|turret|automaton|mech\b|android|construct|sentry/i;
/** Called by FxLayer before playing a batch: where everyone is now, and (in a fight) what the squad can see. */
export function setContext(g: GameState | null, screen: string) {
  units = new Map(); seenTiles = null;
  if (!g) return;
  if (screen === 'combat' && g.combat) {
    for (const u of g.combat.units) units.set(u.id, { pos: u.pos, name: u.name, side: u.side, robot: ROBOT.test(u.name), dead: !!u.dead });
    try { seenTiles = visibility(g.combat, 'pc').tiles; } catch { seenTiles = null; }
  } else {
    for (const c of Object.values(g.characters)) { const p = g.story.positions?.[c.id]; if (p) units.set('pc-' + c.id, { pos: p, name: c.name, side: 'pc', robot: false }); }
    for (const n of g.story.npcs || []) units.set(n.id, { pos: n.pos, name: n.name, side: 'foe', robot: ROBOT.test(n.name) });
  }
}
const unit = (id: string | null | undefined) => (id ? units.get(id) : undefined);

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
const play = (s: Sfx, p: Pt | null, o: { rate?: number; gain?: number; delay?: number } = {}) => sfx(s, { ...o, pan: panOf(p) });
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
        dust(end, toP.s); floatText(e.fumble ? 'FUMBLE' : 'MISS', toP, MUTED);
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
      else { floatText(e.fumble ? 'FUMBLE' : 'MISS', toP, MUTED); play('whiz', toP, { rate: 0.7 }); }
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
    if (color) { squaresOrMotes(p, color, why === 'soul'); }
    shake(tok, why === 'explosion' ? 1.6 : 0.8); flash(tok, color === SOUL_INK ? 'soul' : color ? 'magic' : 'hurt');
    if (why !== 'explosion' && why !== 'trap') play(unit(e.target)?.robot ? 'hit_metal' : 'hit_flesh', p, { rate: jitter(), gain: why === 'bleed' || why === 'burn' ? 0.6 : 1 });
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
  explode(e) { explosion(e.at, e.radius || 1, e.what === 'fire' ? 'fire' : 'frag'); },
  object(e) { const p = at(e.at); if (!p) return; if (e.broken) { dust(p, p.s * 1.3); burst('smoke_soft', p, p.s, 700, { color: '#7F8BA1' }); play('body_fall', p, { rate: 0.8, delay: 90 }); floatText('BROKEN', p, MUTED, { small: true }); } },
  door(e) { const p = at(e.at); play(e.open ? 'door_open' : 'door_close', p || centre(e.at)); if (p) dust({ x: p.x, y: p.y + p.s * 0.3 }, p.s * 0.6); },
  trap(e) { const p = at(e.at); play('chop', p, { rate: 0.8 }); if (p) { burst('spark_burst', p, p.s, 300, { color: HP }); floatText('TRAP', p, HP, { small: true }); } },
  shove(e) {
    if (e.ok && e.from !== e.to) slideFrom(e.from, e.to);
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
    play('sigil_draw', p, { rate: 1.8, gain: 0.5 }); floatText('ANALYZED', p, WHITE, { small: true, delay: 300 });
  },
  pickup(e) { const p = at(e.at); play('mag_in', p, { rate: 0.85 }); if (p) floatText('+ AMMO', p, WHITE, { small: true }); },
  cover() { /* folded into the shot */ },
  // ---------- Sigils: cyan, square, snapping ----------
  draw(e) {
    const p = at(e.tile); if (!p) return;
    const d = GLYPH_PATHS[e.word] || 'M6 6 H18 V18 H6 Z';
    const s = svg(24, 24, '<path d="' + d + '" pathLength="1" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/>');
    const box = put(s, p, p.s * 0.8, p.s * 0.8, 900);
    const path = s.querySelector('path'); if (path) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: reducedMotion() ? 1 : 320, easing: 'ease-out', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
    squares(p, SIGIL_INK, 6, 0.5, 600, 300);
    // Each word is a note: a pattern drawn word by word plays a short melody.
    play('sigil_draw', p, { rate: NOTE[(hash(e.word) % NOTE.length)] });
  },
  scuff(e) { const p = at(e.at); if (p) { dust(p, p.s); squares(p, MUTED, 6, 0.4, 400); } play('step', p, { rate: 0.7 }); },
  evoke(e) {
    const tiles: string[] = e.tiles || [], src = centre(e.src), imp = e.impact ? centre(e.impact) : null;
    play('sigil_evoke', src || imp);
    // The pattern flashes white and collapses into the source.
    for (const k of tiles) { const q = at(k); if (!q) continue; burst('flare', q, q.s * 1.2, 260, { color: WHITE, from: 0.5, to: 1.5 }); if (src && !reducedMotion()) squaresTo(q, src, SIGIL_INK, 3, 220); }
    const tint = ELEMENT[e.element] || SIGIL_INK;
    if (e.stay) { for (const k of tiles) { const q = at(k); if (q) burst('glow', q, q.s * 1.3, 900, { color: tint, from: 0.6, to: 1.1, fade: 0, delay: 200 }); } return; }
    if (!src || !imp) return;
    after(() => {
      if (e.cone) { for (let i = 0; i < 4; i++) squaresTo(src, { x: imp.x + (Math.random() - 0.5) * imp.s * 2.5, y: imp.y + (Math.random() - 0.5) * imp.s * 2.5 }, tint, 5, 200); }
      else beam(src, imp, tint);
      after(() => { grid(imp, tint, e.element === 'shock'); if (e.element === 'shock') burst('zap', imp, imp.s * 1.2, 300, { color: WHITE }); }, 180);
    }, 230);
  },
  miss(e) { const p = at(e.at); if (!p) return; if (e.by === 'soul') motes(p, SOUL_INK, 5, false, 400); else squares(p, SIGIL_INK, 5, 0.5, 350); floatText('MISS', p, MUTED); play('whiz', p, { rate: 1.3 }); },
  cond(e) { const p = at(e.at); if (!p) return; floatText(e.resisted ? 'RESISTED' : condWord(e.id), p, e.resisted ? MUTED : condBoon(e.id) ? OK : WHITE, { small: true, delay: 200 }); },
  overload(e) { const p = at(e.at); play('sigil_overload', p || centre(e.at)); screenTint('red', 420); if (p) { squares(p, HP, 14, 1.2, 500); shake(tokOf(e.unit, e.at), 1.2); } },
  vent(e) { const p = at(e.at); play('vent', p); if (p) for (let i = 0; i < 10; i++) squaresTo(p, { x: p.x + (Math.random() - 0.5) * p.s, y: p.y - p.s * (1.5 + Math.random()) }, SIGIL_INK, 1, 600, i * 40); },
  // ---------- Outbursts: violet into gold, soft, breathing ----------
  outburst(e) {
    const p = at(e.at); play('heartbeat', p); if (e.hold) play('soul_hold', p, { delay: 120 });
    if (!p) return;
    ring(p, SOUL_INK, 700, { from: 0.5, to: 1.3, width: 5 }); ring(p, SOUL_INK, 700, { from: 0.5, to: 1.3, width: 3, delay: 420 });
    motes(p, SOUL_INK, 8, true, 700); flash(tokOf(e.unit, e.at), 'soul');
  },
  grow(e) {
    const p = at(e.at), st = e.stage || 2, col = mix(SOUL_INK, SOUL_WARM, (st - 1) / 3);
    play('heartbeat', p, { rate: 1 + 0.12 * st });
    if (p) { ring(p, col, 600, { from: 0.5, to: 1.1 + 0.15 * st, width: 4 + st }); floatText('STAGE ' + st, p, col, { small: true }); }
  },
  release(e) {
    const from = at(e.at), to = centre(e.to), st = e.stage || 1, col = mix(SOUL_INK, SOUL_WARM, Math.min(1, (st - 1) / 3 + 0.25));
    play('soul_release', from || to, { rate: e.wild ? 0.85 : 1 });
    if (!to) return;
    const go = () => {
      if (from && !e.air) for (let i = 0; i < 9; i++) moteTo(from, to, i % 2 ? SOUL_INK : SOUL_WARM, 360 + Math.random() * 160, i * 25);
      after(() => {
        const size = to.s * (1.2 + 0.35 * st + (e.area || 0) * 1.2);
        burst('glow', to, size, 650, { color: col, from: 0.3, to: 1.2 }); burst('smoke_soft', to, size * 0.9, 900, { color: SOUL_INK, from: 0.5, to: 1.3, blend: 'screen' });
        ring(to, SOUL_WARM, 600, { from: 0.4, to: 1.2 + (e.area || 0) * 0.8, width: 5 });
        if (e.school === 'buff') pluses(to, OK, 6);
      }, from && !e.air ? 380 : 0);
    };
    if (e.wild) { if (from) floatText('WILD', from, SOUL_WARM, { small: true }); after(go, 220); } else go();
  },
  short(e) {
    const p = at(e.at); screenTint('grey', 900); sfx('short');
    if (p) { flash(tokOf(e.unit, e.at), 'white'); floatText(e.burst ? 'HEART BURSTS' : 'MANA SHORT', p, HP, { small: !e.burst, big: e.burst }); if (e.burst) burst('spark_burst', p, p.s * 1.3, 500, { color: HP }); }
  },
  syphon(e) { const p = at(e.at); play('soul_hold', p, { rate: 1.4 }); if (p) { for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = p.s * (1.4 + Math.random()); moteTo({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }, p, SOUL_INK, 500, i * 40); } floatText('+' + (e.mp || 0) + ' MP', p, '#5C9EFF', { small: true, delay: 300 }); } },
  mana() { /* the meter shows it */ },
  song() { /* the music plays it */ },
};
const NOTE = [1, 1.122, 1.26, 1.498, 1.682, 2];
const hash = (s: string) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const ELEMENT: Record<string, string> = { fire: '#FFB25C', freeze: '#BDF3FF', shock: '#FFFFFF', stone: '#C9B79C', gale: '#DDF6FF', mend: OK, ward: SIGIL_INK };
const COND_WORD: Record<string, string> = { slowed: 'SLOWED', pinned: 'PINNED', blinded: 'BLINDED', burning: 'BURNING', shaken: 'SHAKEN', fear: 'AFRAID', confused: 'CONFUSED', ldebuff: 'MUDDLED', rdebuff: 'UNSETTLED', silenced: 'SILENCED', guarded: 'GUARDED', inspired: 'INSPIRED' };
const condWord = (id: string) => COND_WORD[id] || String(id || '').toUpperCase();
const condBoon = (id: string) => id === 'guarded' || id === 'inspired';
function mix(a: string, b: string, t: number) { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join(''); }

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
/** A Sigil bolt: a straight beam of square particles. */
function beam(a: Pt, b: Pt, color: string) {
  const n = Math.max(6, Math.min(18, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.35))));
  for (let i = 0; i < n; i++) particle(a, Math.max(4, a.s * 0.12), 'background:' + color + ';box-shadow:0 0 6px ' + color, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(.6)', opacity: 0.9 }], 180, i * 12);
}
/** A Sigil burst at the impact: an expanding grid of squares. */
function grid(p: Pt, color: string, bright: boolean) {
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) + Math.abs(j) > 3) continue;
    const r = p.s * 0.28;
    particle(p, Math.max(4, p.s * 0.13), 'background:' + (bright ? WHITE : color) + ';box-shadow:0 0 6px ' + color, [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: 'translate(' + i * r + 'px,' + j * r + 'px) scale(1)', opacity: 0 }], 420, (Math.abs(i) + Math.abs(j)) * 25);
  }
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

// ---------- the queue ----------
/** How long each kind holds the stage before the next event starts (ms). */
function beatOf(e: FxEvent): number {
  switch (e.k) {
    case 'turn': return 140;
    case 'move': return Math.min(1100, Math.max(160, ((e.path?.length || 2) - 1) * (e.how === 'sprint' ? 75 : 115)));
    case 'shot': return e.chain ? 170 : e.object ? 150 : 400;
    case 'melee': return e.chain ? 240 : 420;
    case 'volley': return e.mode === 'auto' ? 260 : 90;
    case 'reload': case 'load': case 'clear': case 'repair': case 'core': case 'crystallise': return Math.min(1200, (e.dur || 1000) * 0.85);
    case 'explode': return 220; // whoever stands in the blast is hurt with it, not after the smoke
    case 'evoke': return 700;
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
let timers: number[] = [];
let queueEnd = 0, idleTimer = 0;
/** When the queued effects will have played (performance.now() clock): a turn banner can wait for the enemies' moves. */
export const fxBusyUntil = () => Math.max(queueEnd, performance.now());
/** Run one event's effect now, outside the queue (for the turn intro, the Proving Ground, a test button). */
export function playFx(e: Partial<FxEvent> & { k: string }, stream?: string) {
  const ev = { n: 0, ...e } as FxEvent;
  try { H[ev.k]?.(ev); } catch (err) { console.warn('fx', ev.k, err); }
  // The turn intro (turnIntro.tsx) times enemy-turn banners on this clock instead of estimating. stream names whose
  // numbering n belongs to (FxLayer's stream key: 'cb|…' for a fight, 'st|…' for the area map).
  if (ev.n) try { window.dispatchEvent(new CustomEvent('phc:fx-at', { detail: { n: ev.n, stream: stream || '' } })); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent(FX_EVENT, { detail: ev })); } catch { /* */ }
}
/** Queue events to play in order, each after the previous one's beat. A long backlog speeds up so play never lags far. */
export function queueFx(evs: FxEvent[], stream?: string) {
  if (!evs.length) return;
  const now = performance.now(), base = Math.max(now, queueEnd);
  const total = evs.reduce((t, e) => t + beatOf(e), 0), backlog = base - now, room = Math.max(1500, 7000 - backlog);
  const speed = total > room ? room / total : 1;
  let t = base;
  for (const e of evs) {
    const wait = t - now;
    if (wait <= 4) playFx(e, stream);
    else { const id: number = window.setTimeout(() => { timers = timers.filter((x) => x !== id); playFx(e, stream); }, wait); timers.push(id); }
    t += beatOf(e) * speed;
  }
  queueEnd = t;
  clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { try { window.dispatchEvent(new CustomEvent(FX_IDLE)); } catch { /* */ } }, t - now + 50);
}
/** Drop everything queued (the game changed, the tab was hidden). */
export function clearFx() { for (const id of timers) clearTimeout(id); timers = []; queueEnd = 0; volley = null; bumpGen(); }
/** Is there a grid on screen to draw on? */
export const canDraw = () => hasLayer() && gridShown();
