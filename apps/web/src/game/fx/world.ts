// World Play 1.7 as effects and sound (rules revision 1.7; part A's FX events, docs/design/handoffs/world-play-A-HANDOFF.md
// section 4): carrying, putting down, a Downed carrier's drop, a search, hazard hits (each kind its own look), a hazard
// spotted, placed or gone, a safe path found, a trigger firing (its spawned tokens make an entrance), the alarm, an
// approach's result, talk, a new marker. Words always ride with the colour: hazards in their kind's ink (the same
// looks the map draws, game/worldView.ts), success green, failure muted, damage red, markers white.
// Damage numbers come from the 'hurt' events the engine sends with each hit (play.ts); these add the hazard's look and
// word. Fog: every point comes through the kit's at() (null out of sight). Reduced motion: the dom helpers fade instead
// of moving; particles are trimmed. Nothing here reads or changes the rules.
import type { FxEvent } from '@engine';
import { reducedMotion, type Sfx } from '../sfx';
import { type Pt, after, anim, burst, floatText, particle, put, ring, shake, shakeScreen, screenTint, svg } from './dom';
import { HAZARD_LOOK, SAFE_INK, hazardLook, PILE_ICON } from '../worldView';

const WHITE = '#FFFFFF', MUTED = '#A3AEC2', HP = '#F65157', OK = '#6FEA77';

export interface WorldKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
}

/** The word each event floats (pure, for the tests). */
export function worldWord(e: Partial<FxEvent> & { k: string }): string {
  const x: any = e;
  switch (e.k) {
    case 'carry': return 'CARRIED';
    case 'put_down': return 'PUT DOWN';
    case 'drop': return 'DROPPED';
    case 'search': return x.items ? 'FOUND ' + x.items + (x.items === 1 ? ' THING' : ' THINGS') : 'NOTHING';
    case 'hazard': return x.immune ? 'IMMUNE' : x.kind === 'minefield' ? (x.attempt ? 'MINE!' : 'MINE!') : x.kind === 'gas' ? (x.saved ? 'HELD BREATH' : 'GAS') : x.saved ? 'SAVED' : (HAZARD_LOOK[x.kind]?.word || 'HAZARD');
    case 'hazard_spotted': return 'SPOTTED: ' + (HAZARD_LOOK[x.kind]?.word || 'HAZARD');
    case 'hazard_placed': return HAZARD_LOOK[x.kind]?.word || 'HAZARD';
    case 'hazard_gone': return x.why === 'disarmed' ? 'MADE SAFE' : 'CLEARED';
    case 'safe_path': return 'SAFE PATH';
    case 'trigger': return x.then === 'fight' ? 'AMBUSH!' : x.then === 'spawn' ? 'SOMEONE COMES' : 'REVEALED';
    case 'alarm': return 'ALARM!';
    case 'approach': return x.ok ? 'SUCCESS' : 'FAILED';
    case 'talk': return x.what === 'objective' ? 'ASKED ABOUT THE OBJECTIVE' : 'ASKED WHAT THEY WANT';
    case 'marker': return 'MARKED';
    // Rules 1.8: a pick-up names what was taken (the first thing, and how many more); a pile says why it grew.
    case 'pickup': return pickupWords(x.items);
    case 'pile': return x.why === 'death' ? 'DROPS' : x.why === 'take' ? '' : 'DROPPED';
    default: return '';
  }
}
/** "+ Rifle magazine 7/24", "+ Rifle magazine 7/24 · +2 more" (the engine's labels); "+ AMMO" from an old event with none. */
export function pickupWords(items: unknown): string {
  const list = Array.isArray(items) ? items.map(String).filter(Boolean) : [];
  if (!list.length) return '+ AMMO';
  const first = list[0].length > 30 ? list[0].slice(0, 29) + '…' : list[0];
  return '+ ' + first + (list.length > 1 ? ' · +' + (list.length - 1) + ' more' : '');
}
const WORLD_KS = ['carry', 'put_down', 'drop', 'search', 'hazard', 'hazard_spotted', 'hazard_placed', 'hazard_gone', 'safe_path', 'trigger', 'alarm', 'approach', 'talk', 'marker', 'pickup', 'pile'];
/** How long each holds the stage (ms); undefined: not a World Play event. */
export function worldBeat(e: FxEvent): number | undefined {
  if (!WORLD_KS.includes(e.k)) return undefined;
  const x: any = e;
  switch (e.k) {
    case 'hazard': return x.kind === 'minefield' ? 520 : 380;
    case 'trigger': return x.then === 'fight' ? 900 : 600;
    case 'alarm': return 700;
    case 'carry': case 'put_down': case 'drop': return 360;
    case 'pickup': return 420;
    case 'pile': return x.why === 'take' ? 0 : 200;
    case 'search': case 'approach': return 420;
    case 'hazard_spotted': case 'safe_path': case 'hazard_gone': case 'marker': return 380;
    default: return 240;
  }
}

/** A puff of particles in a colour, rising (fire, gas) or bursting (a mine, a collapse). */
function puff(p: Pt, color: string, n: number, rise: boolean, ms: number, spread = 0.8) {
  if (reducedMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = p.s * spread * (0.3 + Math.random() * 0.7), sz = Math.max(4, p.s * (0.12 + Math.random() * 0.14));
    const dx = rise ? (Math.random() - 0.5) * p.s * 0.6 : Math.cos(a) * r, dy = rise ? -p.s * (0.5 + Math.random() * 0.6) : Math.sin(a) * r;
    particle(p, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 6px ' + color + ';filter:blur(.6px)', [{ transform: 'translate(0,0) scale(.6)', opacity: 0.95 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.3)', opacity: 0 }], ms * (0.7 + Math.random() * 0.4), i * 18);
  }
}
/** A tile outline that pulses in a colour (spotted, placed, safe, marker). */
function tileFlash(p: Pt, color: string, ms: number, o: { dashed?: boolean; delay?: number } = {}) {
  const run = () => { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%;box-sizing:border-box;border-radius:3px;border:2px ' + (o.dashed ? 'dashed ' : 'solid ') + color + ';box-shadow:0 0 8px ' + color + ',inset 0 0 8px ' + color;
    const box = put(d, p, p.s, p.s, ms); anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }] : [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0.6, offset: 0.6 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' }); };
  if (o.delay) after(run, o.delay); else run();
}
/** A bold word card over a point (AMBUSH!, ALARM!): white text on the colour, scaled in. */
function banner(p: Pt, text: string, bg: string, ms = 1100) {
  const t = document.createElement('div'); t.textContent = text;
  t.style.cssText = "width:100%;height:100%;display:grid;place-items:center;font:700 " + Math.max(12, Math.round(p.s * 0.34)) + "px 'Chakra Petch',sans-serif;letter-spacing:.12em;color:#0A0D13;background:" + bg + ';border-radius:6px;box-shadow:0 0 0 2px #0A0D13,0 0 14px ' + bg + ';white-space:nowrap';
  const box = put(t, { x: p.x, y: p.y - p.s * 0.9 }, p.s * 3.2, p.s * 0.55, ms); box.style.zIndex = '5';
  anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }] : [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.18 }, { opacity: 1, offset: 0.8 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** A token arriving: it scales up out of a ring (spawned people, a creature put down). */
function entrance(tok: HTMLElement | null, p: Pt | null, color: string, delay = 0) {
  after(() => {
    if (p) ring(p, color, 600, { from: 1.4, to: 0.6, width: 3 });
    if (tok) anim(tok, reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(.3) translateY(-8px)' }, { opacity: 1, transform: 'scale(1.12)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
  }, delay);
}
/** A mark that lifts from a tile toward the actor (carry), or falls to a tile from the actor (put down). */
function lift(from: Pt | null, to: Pt | null, color: string) {
  if (!from || !to) return;
  const n = reducedMotion() ? 2 : 6;
  for (let i = 0; i < n; i++) particle(from, Math.max(4, from.s * 0.12), 'border-radius:2px;background:' + color + ';box-shadow:0 0 4px ' + color, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: 0.1 }], 360, i * 30);
}

/** A line for everyone who saw it (the store's toast; loaded lazily so the effects never pull the store into tests). */
function say(text: string) { import('../store').then((m) => m.toast(text, true), () => {}); }
/** The toast a trigger or an alarm shows (pure, for the tests). */
export function worldLine(e: Partial<FxEvent> & { k: string }): string {
  const x: any = e, n = (x.spawned || x.revealed || []).length;
  if (e.k === 'trigger') return (x.then === 'fight' ? '⚠ Ambush! ' : x.then === 'spawn' ? 'Someone comes. ' : 'Something is revealed. ') + (n ? n + (n === 1 ? ' appears' : ' appear') + (x.then === 'fight' ? ': the fight starts.' : '.') : '');
  if (e.k === 'alarm') return '⚠ The alarm is up' + (n ? ': ' + n + ' hidden ' + (n === 1 ? 'hostile wakes.' : 'hostiles wake.') : '.');
  return '';
}
export function worldHandlers(K: WorldKit): Record<string, (e: FxEvent) => void> {
  const { at, tokOf, posOf, play } = K;
  const actorAt = (x: any) => at(posOf(x.unit) || x.from || x.at);
  return {
    carry(e) { const x: any = e, p = at(x.from || posOf(x.target)), q = actorAt(x); lift(p, q, WHITE); play('swish', q || p, { rate: 0.7, gain: 0.6 }); play('step', q || p, { delay: 120 });
      const w = q || p; if (w) floatText(worldWord(e) + (x.kg ? ' · ' + x.kg + ' KG' : ''), w, WHITE, { small: true, delay: 120 }); },
    put_down(e) { const x: any = e, p = at(x.at), q = actorAt(x); lift(q, p, WHITE); play('body_fall', p || q, { rate: 1.3, gain: 0.5, delay: 150 });
      if (p) { entrance(tokOf(x.target, x.at), p, WHITE, 160); floatText(worldWord(e), p, WHITE, { small: true, delay: 200 }); } },
    drop(e) { const x: any = e, p = at(x.at); play('body_fall', p); if (p) { entrance(tokOf(x.target, x.at), p, HP); floatText(worldWord(e) + (x.name ? ' · ' + String(x.name).toUpperCase() : ''), p, HP, { small: true }); } },
    search(e) { const x: any = e, p = at(x.at) || actorAt(x); play('door_open', p, { rate: 1.5, gain: 0.5 }); if (!p) return;
      burst('dust', p, p.s * 1.1, 500, { color: '#C9D3E3' });
      if (x.items) { for (let i = 0; i < Math.min(6, x.items + 2); i++) particle(p, Math.max(4, p.s * 0.12), 'border-radius:2px;background:' + WHITE + ';box-shadow:0 0 6px ' + WHITE, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + ((Math.random() - 0.5) * p.s) + 'px,-' + p.s * (0.5 + Math.random() * 0.5) + 'px)', opacity: 0 }], 600, 80 + i * 40); play('crystal', p, { rate: 1.6, gain: 0.4, delay: 200 }); }
      floatText(worldWord(e), p, x.items ? WHITE : MUTED, { small: true, delay: 150 }); },
    // Rules 1.8: the pick-up floats what was taken from the pile's tile; a pile that grows pops its stack in.
    pickup(e) { const x: any = e, p = at(x.at) || actorAt(x); play('mag_in', p, { rate: 0.85 }); if (p) floatText(worldWord(e), p, WHITE, { small: true }); },
    pile(e) { const x: any = e; if (x.why === 'take') return; const p = at(x.at); if (!p) return;
      const s = svg(16, 16, '<image href="' + PILE_ICON + '" width="16" height="16"/>'), box = put(s, p, p.s * 0.45, p.s * 0.45, 600);
      anim(box, [{ transform: 'translateY(-40%) scale(0.6)', opacity: 0 }, { transform: 'translateY(0) scale(1.1)', opacity: 1, offset: 0.45 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: reducedMotion() ? 1 : 600, fill: 'forwards' });
      play('step', p, { rate: 1.6, gain: 0.35 });
      if (x.why === 'death') floatText(worldWord(e), p, MUTED, { small: true, delay: 120 }); },
    hazard(e) {
      const x: any = e, p = at(x.at || posOf(x.target)), L = hazardLook(x.kind), tok = tokOf(x.target, x.at);
      if (x.immune) { if (p) { ring(p, MUTED, 400); floatText(worldWord(e), p, MUTED, { small: true }); } play('hit_metal', p, { rate: 1.4, gain: 0.4 }); return; }
      switch (x.kind) {
        case 'minefield': play('explosion', p, { rate: 1.05 }); play('explosion_boom', p, { gain: 0.6, delay: 40 });
          if (p) { burst('fireflash_1', p, p.s * 2.2, 520, { color: '#FFB45A' }); burst('smoke_black', p, p.s * 2, 900, { delay: 80 }); puff(p, '#6B5430', 8, false, 600, 1.1); shake(tok, 1.4); } shakeScreen(0.8); screenTint('red', 300); break;
        case 'fire': play('el_fire', p); if (p) { burst('flame', p, p.s * 1.5, 600, { color: L.ink }); puff(p, L.ink, 7, true, 700); shake(tok, 0.6); } break;
        case 'radiation': play('el_zap', p, { rate: 0.7, gain: 0.6 }); if (p) { ring(p, L.ink, 600, { from: 0.4, to: 1.5, width: 3 }); puff(p, L.ink, 6, false, 500, 0.6); } break;
        case 'gas': play('vent', p, { rate: 0.6, gain: 0.7 }); if (p) puff(p, L.ink, 9, true, 900, 1); break;
        case 'collapse': play('el_stone', p); play('hit_heavy', p, { delay: 80 }); if (p) { burst('dust', p, p.s * 1.8, 700, { color: '#A3AEC2' }); puff(p, '#7F8BA1', 8, false, 600, 0.9); shake(tok, 1.2); } shakeScreen(0.5); break;
        default: play('hit_heavy', p);
      }
      if (p) floatText(worldWord(e) + (x.cond && !x.saved ? '' : ''), p, x.saved ? MUTED : L.ink, { small: true, delay: 60 });
    },
    hazard_spotted(e) { const x: any = e, L = hazardLook(x.kind), ts: string[] = (x.tiles || [x.at]).slice(0, 30);
      play('sg_trap_set', at(x.at), { rate: 0.8, gain: 0.5 });
      ts.forEach((k, i) => { const q = at(k); if (q) tileFlash(q, L.ink, 700, { delay: Math.min(400, i * 25) }); });
      const p = at(x.at); if (p) floatText(worldWord(e), p, L.ink, { small: true }); },
    hazard_placed(e) { const x: any = e, L = hazardLook(x.kind); (x.tiles || []).slice(0, 30).forEach((k: string, i: number) => { const q = at(k); if (q) tileFlash(q, L.ink, 520, { delay: Math.min(300, i * 15) }); }); },
    hazard_gone(e) { const x: any = e, ts: string[] = (x.tiles || []).slice(0, 30), p = at(ts[0]);
      play(x.why === 'disarmed' ? 'jam_clear' : 'sg_null', p, { gain: 0.6 }); ts.forEach((k, i) => { const q = at(k); if (q) tileFlash(q, OK, 460, { delay: Math.min(300, i * 15) }); });
      if (p) floatText(worldWord(e), p, OK, { small: true }); },
    safe_path(e) { const x: any = e, ts: string[] = (x.tiles || []).slice(0, 30); play('sg_light', at(ts[0]) || actorAt(x), { gain: 0.5 });
      ts.forEach((k, i) => { const q = at(k); if (q) tileFlash(q, SAFE_INK, 900, { dashed: true, delay: i * 60 }); });
      const p = at(ts[0]); if (p) floatText(worldWord(e), p, SAFE_INK, { small: true }); },
    trigger(e) { const x: any = e, p = at(x.at), fight = x.then === 'fight';
      play(fight ? 'gun_rifle' : 'door_open', p, fight ? { rate: 0.8, gain: 0.7 } : { gain: 0.6 }); if (fight) { screenTint('red', 500); shakeScreen(0.4); }
      if (p) banner(p, worldWord(e), fight ? HP : WHITE);
      say(worldLine(e).trim());
      (x.spawned || []).slice(0, 8).forEach((id: string, i: number) => { const k = posOf(id); entrance(tokOf(id, k), at(k), fight ? HP : WHITE, 200 + i * 90); }); },
    alarm(e) { const x: any = e, p = at(x.at); play('sg_trap_sprung', p, { rate: 0.6 }); play('dry_click', p, { delay: 120, gain: 0.5 }); screenTint('red', 420);
      say(worldLine(e));
      if (p) { banner(p, worldWord(e), HP); for (let i = 0; i < 3; i++) ring(p, HP, 700, { from: 0.5, to: 3 + i, width: 3, delay: i * 180 }); }
      (x.revealed || []).slice(0, 8).forEach((id: string, i: number) => { const k = posOf(id); entrance(tokOf(id, k), at(k), HP, 250 + i * 80); }); },
    approach(e) { const x: any = e, p = at(x.at) || actorAt(x); play(x.ok ? 'crystal' : 'miss', p, x.ok ? { rate: 1.3, gain: 0.5 } : { gain: 0.6 });
      if (p) { ring(p, x.ok ? OK : MUTED, 500); floatText(worldWord(e) + (x.label ? ' · ' + String(x.label).toUpperCase().slice(0, 28) : ''), p, x.ok ? OK : MUTED, { small: true }); } },
    talk(e) { const x: any = e, p = at(posOf(x.target)); play('click', p, { gain: 0.4 }); if (!p) return;
      const s = svg(40, 30, '<path d="M4 4 H36 V20 H16 L8 27 V20 H4 Z" fill="#10151F" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/><circle cx="13" cy="12" r="2" fill="#FFFFFF"/><circle cx="20" cy="12" r="2" fill="#FFFFFF"/><circle cx="27" cy="12" r="2" fill="#FFFFFF"/>');
      const box = put(s, { x: p.x + p.s * 0.4, y: p.y - p.s * 0.55 }, p.s * 0.7, p.s * 0.55, 900);
      anim(box, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' }); },
    marker(e) { const x: any = e; (x.tiles || []).slice(0, 6).forEach((k: string, i: number) => { const q = at(k); if (!q) return; tileFlash(q, WHITE, 900, { delay: i * 120 }); if (i === 0) floatText('◆ ' + worldWord(e), q, WHITE, { small: true }); });
      play('sg_light', at((x.tiles || [])[0]), { rate: 1.4, gain: 0.4 }); },
  };
}
