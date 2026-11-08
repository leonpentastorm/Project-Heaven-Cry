// Turn banners and the your-turn cut-in (the transitions pass). Mounted once in App.tsx over every screen.
//
// Everything here is driven by the shared game state, so every player sees the same beats:
//  · Combat: a banner drops from the top on every turn, allies and enemies alike (the engine's fx "turn" events, so
//    enemy turns that the host resolves in one go still get theirs, spaced like the effects layer plays them). It
//    holds ~0.9 s and goes back up. A unit you own: "YOUR TURN", then a large character card slides in from the left
//    with the unit's numbers and four big commands (the player's own picks per character, else a smart default).
//  · Area map (story mode): a banner when a new overworld round opens ("ROUND 3 · YOUR MOVE").
//
// Events (window CustomEvents) for the combat screen (combat.js) and the effects layer:
//  · 'phc:combat-action' {action, unit}   a command tile was picked in the cut-in: select that action. Action ids are
//                                         combat.js's own: 'shot' | 'melee' | 'move' | 'reload' | 'clear' | 'shove' |
//                                         'overwatch' | 'draw' | 'outburst' | 'release' | 'skill' (the weapon's own).
//  · 'phc:focus-tile' {key, unit, mine}   a turn starts on tile key ("x,y"): scroll / zoom the grid to it (mine = the
//                                         player's own unit: zoom in; otherwise a gentle pan is enough).
//  · 'phc:turn-shown' {unit, side, mine, round}   a turn banner has just appeared (for anyone who wants to sync).
//  · Listened to: 'phc:customise-cmds' {charId}   open the dialog that chooses a character's four commands (the combat
//                                         panel's "⚙ Customise"; the cut-in's own button or C opens it directly). The
//                                         choice lives in this browser (game/commands.ts); while the dialog is open no
//                                         cut-in comes up.
//  · Listened to: 'phc:fx-at' {n, stream} the effects layer dispatches this as it starts playing fx event n of stream
//                                         (FxLayer's key; only the current fight's counts, and the clock starts over
//                                         with each fight): banners for enemy turns wait for their own "turn" event
//                                         to come up instead of estimating the effects' timing.
// Sounds go through cue() (exported: App.tsx uses it for the combat transition). It plays the wished file names below
// when sfx.ts has a file for them, else stand-ins from the existing set plus a small synthesised hit.
import React from 'react';
import { type GameState, WEAPON, CLASS, FLUX_MAX, visibility } from '@engine';
import { ART, ART_BIG, IMG } from '../screens/shared';
import { castFight } from './cast';
import { bigPortrait } from './charfile';
import { sfx, SFX_FILES, reducedMotion, uiPrefs, type Sfx } from './sfx';
import { COMBAT_IN_MS } from './presence';
import { combatStreamKey } from './fx/FxLayer';
import { resolveCommands, readPrefs, EV_CUSTOMISE, classOf, type Command } from './commands';
import { CommandsDialog } from './commandsDialog';
import { resourcesOf, urgentRows, resRowView, type ResRow } from './resources';

export const EV_ACTION = 'phc:combat-action', EV_FOCUS = 'phc:focus-tile', EV_TURN = 'phc:turn-shown', EV_FX_AT = 'phc:fx-at';

// ---------- sounds ----------
export type Cue = 'banner_mine' | 'banner_ally' | 'banner_foe' | 'cutin' | 'combat_in' | 'combat_out' | 'round';
/** [wished file name in sfx.ts, stand-ins from the current set (the first with a file plays, else the last one's
 *  synthesised version), synthesised hit on top of the stand-in] */
const CUES: Record<Cue, [string, Sfx[], 'boom' | 'thump' | null]> = {
  banner_mine: ['turn_you', ['slide'], null], banner_ally: ['turn_ally', ['slide'], null], banner_foe: ['turn_foe', ['tab'], null],
  cutin: ['cutin', ['swish' as Sfx, 'start'], 'thump'], combat_in: ['combat_start', ['slide'], 'boom'], combat_out: ['combat_end', ['slide_back'], null], round: ['round', ['slide'], null],
};
let actx: AudioContext | null = null;
function hit(kind: 'boom' | 'thump', delay: number) {
  const p = uiPrefs(), vol = p.mute ? 0 : p.sfx / 100;
  if (vol <= 0) return;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    actx ||= new AC() as AudioContext; if (actx.state === 'suspended') actx.resume().catch(() => {});
    const ac = actx, t = ac.currentTime + delay / 1000, out = ac.createGain(); out.gain.value = vol * (kind === 'boom' ? 0.55 : 0.35); out.connect(ac.destination);
    // A low sine drop (the body) and a short filtered noise burst (the crack).
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(kind === 'boom' ? 120 : 180, t); o.frequency.exponentialRampToValueAtTime(kind === 'boom' ? 32 : 60, t + (kind === 'boom' ? 0.7 : 0.25));
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.9, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'boom' ? 0.8 : 0.3));
    o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.9);
    const len = kind === 'boom' ? 0.35 : 0.12, nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), ne = ac.createGain(); s.buffer = nb; f.type = 'lowpass'; f.frequency.value = kind === 'boom' ? 1400 : 2600; ne.gain.value = 0.5;
    s.connect(f); f.connect(ne); ne.connect(out); s.start(t);
  } catch { /* sound never breaks the game */ }
}
/** Play a transition sound. Never throws. */
export function cue(name: Cue) {
  const [want, stand, extra] = CUES[name];
  try {
    if ((SFX_FILES as any)[want]) { sfx(want as Sfx); return; }
    const pick = stand.find((x) => (SFX_FILES as any)[x]) || stand[stand.length - 1];
    if (pick) sfx(pick);
    if (extra) hit(extra, name === 'combat_in' ? 320 : 60);
  } catch { /* */ }
}

// ---------- what a banner and a cut-in show ----------
interface Banner { id: string; kicker: string; kickerColor: string; name: string; sub: string; stripe: string; img: string; mine: boolean; foe: boolean; hold: number }
interface Cut { id: string; unitId: string; charId: string; name: string; line: string; clsIcon?: string; img: string; color: string; kicker: string;
  hp: [number, number]; ap: number; weapon: string; /** What this unit spends, below HP (game/resources.ts): the most urgent four, in their order. */ res: ResRow[]; cmds: Command[]; at?: string; right?: boolean }

const dispatch = (name: string, detail: any) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch { /* */ } };
const unitImg = (u: any) => (u?.img && (ART(u.img) || u.img)) || '';

function bannerFor(g: GameState, cb: any, unitId: string, meId: string, round: number): (Banner & { mine: boolean; at: string; unitId: string; side: string; unseen: boolean }) | null {
  const cast = castFight(g, cb, ART) || cb, u = cast.units.find((x: any) => x.id === unitId);
  if (!u) return null;
  const ch = u.charId ? g.characters[u.charId] : null, owner = ch ? g.players.find((p) => p.id === ch.owner) : null;
  const mine = !!ch && ch.owner === meId, foe = u.side === 'foe';
  // Fog of war: a hostile the squad can't see stays unnamed and faceless, as on the grid.
  let unseen = false; if (foe) { try { unseen = !visibility(cb, 'pc').seen.has(u.id); } catch { /* */ } }
  const color = foe ? '#F65157' : owner?.color || '#7FD4FF';
  return {
    id: 'b' + unitId + ':' + round + ':' + Math.random().toString(36).slice(2, 6), unitId, side: u.side, at: u.pos, mine, foe, unseen,
    kicker: mine ? 'YOUR TURN' : foe ? 'HOSTILE' : (owner ? owner.name.toUpperCase() : 'ALLY'), kickerColor: mine ? '#FFFFFF' : color,
    name: unseen ? 'Unseen hostile' : u.name, sub: 'ROUND ' + round + (u.downed ? ' · DOWNED' : ''), stripe: color, img: unseen ? '' : unitImg(u) || (foe ? '' : IMG['wick-welcome']),
    hold: mine ? 900 : foe ? 650 : 800,
  };
}

/** Would the card on the left cover this unit's tile? Then it comes in from the right instead, so the unit stays in view. */
function underLeftCard(key: string | undefined): boolean {
  if (!key || typeof document === 'undefined') return false;
  const [x, y] = key.split(',').map(Number), ref = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1);
  const el = document.querySelector('button.phc-tok[aria-label^="' + ref + ' ·"]'); if (!el) return false;
  const r = el.getBoundingClientRect(), w = Math.min(640, innerWidth * 0.96), top = innerHeight / 2 - 210;
  return r.left + r.width / 2 < w + 20 && r.bottom > top - 20 && r.top < top + 440;
}
function cutFor(g: GameState, cb: any, unitId: string): Cut | null {
  const u = cb.units.find((x: any) => x.id === unitId), ch = u?.charId ? g.characters[u.charId] : null;
  if (!u || !ch || u.downed || u.dead || cb.over) return null;
  const owner = g.players.find((p) => p.id === ch.owner), w = WEAPON[u.weapon];
  const portrait = ch.portrait || u.img || '';
  const img = ART_BIG(portrait) || ART(portrait) || portrait || IMG['wick-welcome'];
  // The four commands: the player's own picks for this character (game/commandsDialog.tsx), else the smart default.
  const cmds: Command[] = resolveCommands(cb, u, ch, readPrefs(g, u.charId), { noNarrator: !!g.sandbox, g });
  // The resources block (the same rows as the combat You card): the four that matter most, kept in their own order.
  const all = resourcesOf(u, ch, g), top = new Set(urgentRows(all, 4).map((r) => r.key)), res = all.filter((r) => top.has(r.key));
  return {
    id: 'c' + unitId + ':' + cb.round + ':' + Date.now(), unitId, charId: u.charId, at: u.pos, name: ch.name || u.name, img, color: owner?.color || '#FFFFFF', kicker: 'YOUR TURN · ROUND ' + cb.round,
    line: 'Level ' + ch.level + ' · ' + (classOf(ch)?.name || (ch.classId && CLASS[ch.classId] ? CLASS[ch.classId].name : 'Classless')), clsIcon: classOf(ch)?.icon || '',
    hp: [u.hp, u.maxHp], ap: u.ap, weapon: w ? w.name : 'Unarmed', res, cmds,
  };
}

/** A rough length for each effect, so an enemy's banner lands about when its turn plays (when the effects layer
 *  doesn't announce its clock with 'phc:fx-at'). */
function estMs(e: any): number {
  switch (e.k) {
    case 'turn': return 250;
    case 'move': return 160 + 110 * Math.max(1, (e.path?.length || 2) - 1);
    case 'shot': case 'melee': return e.chain ? 160 : 420;
    case 'volley': return 200 + 140 * (e.shots || 3);
    case 'reload': case 'load': case 'clear': case 'repair': case 'core': case 'crystallise': return Math.min(2500, Number(e.dur) || 900);
    case 'explode': case 'evoke': case 'release': return 700;
    case 'outburst': return 600;
    default: return 220;
  }
}

// ---------- the component ----------
export function TurnIntro({ game, meId, screen }: { game: GameState | null; meId: string; screen: string }) {
  const [banner, setBanner] = React.useState<Banner | null>(null);
  const [cut, setCut] = React.useState<Cut | null>(null), [cutOut, setCutOut] = React.useState(false), [cutImg, setCutImg] = React.useState('');
  const live = React.useRef({ game, meId, screen }); live.current = { game, meId, screen };
  // The customise dialog for a character's four commands (null: closed). While it is open no cut-in comes up.
  const [custom, setCustom] = React.useState<string | null>(null);
  const customOpen = React.useRef(false); customOpen.current = !!custom;
  React.useEffect(() => {
    const f = (e: Event) => { const id = (e as CustomEvent).detail?.charId; if (id) setCustom(id); };
    window.addEventListener(EV_CUSTOMISE, f); return () => window.removeEventListener(EV_CUSTOMISE, f);
  }, []);
  const timers = React.useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = (f: () => void, ms: number) => { const t = setTimeout(() => { timers.current.delete(t); f(); }, Math.max(0, ms)); timers.current.add(t); return t; };
  const clearAll = () => { for (const t of timers.current) clearTimeout(t); timers.current.clear(); };
  React.useEffect(() => () => clearAll(), []);

  // The effects layer's clock, if it announces one.
  // It counts only the fight on screen (the area map's numbering and an earlier fight's are other clocks), and starts
  // over with every fight (each restarts its numbering at 1).
  const fxClock = React.useRef<{ on: boolean; at: number; key: string | null; waiters: Map<number, () => void> }>({ on: false, at: 0, key: null, waiters: new Map() });
  const resetClock = (key: string | null) => { const c = fxClock.current; c.key = key; c.at = 0; c.waiters.clear(); };
  React.useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent).detail || {}, n = Number(d.n); if (!Number.isFinite(n)) return;
      const want = combatStreamKey(live.current.game); if (!want || d.stream !== want) return;
      const c = fxClock.current; if (c.key !== want) resetClock(want);
      c.on = true; c.at = Math.max(c.at, n);
      for (const [k, go] of [...c.waiters]) if (k <= n) { c.waiters.delete(k); go(); } };
    window.addEventListener(EV_FX_AT, f); return () => window.removeEventListener(EV_FX_AT, f);
  }, []);

  // ----- showing one beat -----
  const showCombatTurn = (unitId: string, round: number) => {
    const { game: g, meId: me, screen: sc } = live.current, cb = g?.combat;
    if (!g || !cb || g.phase !== 'combat' || sc !== 'combat' || cb.over || document.hidden) return;
    const b = bannerFor(g, cb, unitId, me, round); if (!b) return;
    setBanner(b);
    cue(b.mine ? 'banner_mine' : b.foe ? 'banner_foe' : 'banner_ally');
    // Fog of war: an unseen hostile's turn moves nobody's view (scrolling to its tile would give its place away).
    if (!b.unseen) dispatch(EV_FOCUS, { key: b.at, unit: unitId, mine: b.mine });
    dispatch(EV_TURN, { unit: unitId, side: b.side, mine: b.mine, round });
    const total = (reducedMotion() ? 300 : 520) + b.hold;
    later(() => setBanner((x) => (x && x.id === b.id ? null : x)), total);
    // Yours: the card follows the banner in, once the turn is still yours.
    if (b.mine) later(() => {
      const { game: g2 } = live.current, cb2 = g2?.combat;
      if (!g2 || !cb2 || cb2.order[cb2.turn] !== unitId || document.hidden || customOpen.current) return;
      const c = cutFor(g2, castFight(g2, cb2, ART) || cb2, unitId); if (!c) return;
      c.right = underLeftCard(c.at);
      setCutOut(false); setCut(c); setCutImg(c.img); cue('cutin');
      if (/^data:/.test(c.img)) bigPortrait(c.img).then((big) => setCutImg((x) => (x === c.img ? big : x))).catch(() => {});
    }, reducedMotion() ? 150 : 380);
  };
  const showRound = (round: number, mineToo: boolean) => {
    if (document.hidden) return;
    const b: Banner = { id: 'r' + round + ':' + Date.now(), kicker: 'AREA MAP', kickerColor: '#A3AEC2', name: 'ROUND ' + round + (mineToo ? ' · YOUR MOVE' : ' · THE SQUAD MOVES'), sub: 'Say one thing · spend your AP · end your turn',
      stripe: '#FFFFFF', img: IMG['emblem-ahoc-seal'] || '', mine: mineToo, foe: false, hold: 1100 };
    setBanner(b); cue('round');
    later(() => setBanner((x) => (x && x.id === b.id ? null : x)), (reducedMotion() ? 300 : 520) + b.hold);
  };

  // ----- combat: follow the engine's turn events -----
  const seen = React.useRef<{ fight: string; n: number; key: string } | null>(null), screenAt = React.useRef({ screen, at: 0 });
  if (screenAt.current.screen !== screen) screenAt.current = { screen, at: Date.now() };
  const cb = game?.phase === 'combat' ? game.combat : null;
  // The fight's name: not its turn order, which grows when someone joins mid-fight (reinforcements, Proving Ground
  // spawns) and must not replay the opening. A new fight under the same name restarts the effects counter (lastN < n).
  const fightId = cb ? cb.name : '';
  const fx = (cb?.fx || []) as any[], lastN = cb ? cb.fxSeq || (fx.length ? fx[fx.length - 1].n : 0) : 0;
  const turnKey = cb ? cb.round + ':' + cb.turn + ':' + (cb.order[cb.turn] || '') : '';
  React.useEffect(() => {
    if (!cb || screen !== 'combat') {
      if (!cb) { seen.current = null; clearAll(); setBanner(null); setCut(null); }
      // Away on another screen (level up, the sheet): what happened meanwhile isn't announced late.
      else if (seen.current && seen.current.fight === fightId) seen.current = { fight: fightId, n: lastN, key: turnKey };
      return;
    }
    const prev = seen.current;
    const newFight = !prev || prev.fight !== fightId || lastN < prev.n;
    if (newFight) resetClock(combatStreamKey(game));
    // Joining or reloading in the middle of a fight: just the banner for whoever is up now.
    if (!prev) {
      seen.current = { fight: fightId, n: lastN, key: turnKey };
      const justStarted = Date.now() - screenAt.current.at < 1500 && cb.round === 1;
      const startNew = justStarted && fx.some((e) => e.k === 'turn');
      if (!startNew) { later(() => showCombatTurn(cb.order[cb.turn], cb.round), 250); return; }
    }
    const from = newFight ? 0 : prev!.n;
    seen.current = { fight: fightId, n: lastN, key: turnKey };
    const fresh = fx.filter((e) => e.n > from);
    const turns = fresh.filter((e) => e.k === 'turn');
    // Old fights without effects events: the active unit changing is the only signal.
    if (!turns.length) {
      if (!fx.length && (newFight || prev?.key !== turnKey)) later(() => showCombatTurn(cb.order[cb.turn], cb.round), newFight ? COMBAT_IN_MS : 0);
      return;
    }
    // A new fight waits for the combat-in transition; the rest are spaced like their effects play.
    const base = Math.max(0, screenAt.current.at + (newFight ? COMBAT_IN_MS : 0) - Date.now());
    // Many turns in one batch (a long enemy phase): keep the last few.
    const keep = turns.slice(-4);
    let t = base;
    const firstN = fresh[0]?.n ?? 0;
    for (const e of fresh) {
      if (keep.includes(e)) {
        const go = () => showCombatTurn(e.unit, e.round ?? cb.round);
        const clock = fxClock.current;
        if (clock.on && e.n > firstN && !newFight) {
          if (clock.at >= e.n) later(go, 0);
          else { clock.waiters.set(e.n, go); later(() => { if (clock.waiters.get(e.n) === go) { clock.waiters.delete(e.n); go(); } }, 6000); }
        } else later(go, t);
      }
      t += estMs(e);
    }
  }, [fightId, lastN, turnKey, screen]);

  // ----- story: a new overworld round opens -----
  const roundKey = game && game.phase === 'story' && game.story.await === 'players' ? game.story.round : 0;
  const lastRound = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!game || screen !== 'main') { lastRound.current = roundKey || lastRound.current; return; }
    if (lastRound.current === null) { lastRound.current = roundKey; return; }
    if (roundKey && roundKey !== lastRound.current) {
      lastRound.current = roundKey;
      const mineToo = Object.values(game.characters).some((c: any) => c.owner === meId && !c.dead);
      later(() => showRound(roundKey, mineToo), 200);
    }
  }, [roundKey, screen]);

  // ----- the cut-in: auto-dismiss, any click or key dismisses, 1–4 picks a command -----
  const hovering = React.useRef(false);
  const dismiss = React.useCallback(() => { setCutOut(true); later(() => { setCut(null); setCutOut(false); }, reducedMotion() ? 150 : 320); }, []);
  const pick = React.useCallback((c: Cut, cmd: Command) => { dispatch(EV_ACTION, { action: cmd.action, unit: c.unitId }); dismiss(); }, [dismiss]);
  const customise = React.useCallback((c: Cut) => { setCustom(c.charId); dismiss(); }, [dismiss]);
  React.useEffect(() => {
    if (!cut || cutOut) return;
    hovering.current = false;
    const t0 = Date.now(), life = reducedMotion() ? 2200 : 2000;
    const iv = setInterval(() => { if (!hovering.current && Date.now() - t0 > life) { clearInterval(iv); dismiss(); } }, 150);
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName || '');
      const cmd = !typing && cut.cmds.find((c) => c.key === e.key);
      if (cmd && !cmd.off) { e.preventDefault(); pick(cut, cmd); } else if (!typing && (e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); customise(cut); } else dismiss();
    };
    const onDown = (e: PointerEvent) => { if (!(e.target as Element)?.closest?.('[data-phc-cutin]')) dismiss(); };
    // Registered a beat late, so the click that ended the last turn doesn't close this one.
    const arm = setTimeout(() => { window.addEventListener('keydown', onKey, true); window.addEventListener('pointerdown', onDown, true); }, 250);
    return () => { clearInterval(iv); clearTimeout(arm); window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onDown, true); };
  }, [cut?.id, cutOut]);
  // A turn that ends (or a screen that changes) takes its card with it.
  const activeId = cb ? cb.order[cb.turn] : null;
  React.useEffect(() => { if (cut && (activeId !== cut.unitId || screen !== 'combat')) dismiss(); }, [activeId, screen]);

  if (!banner && !cut && !custom) return null;
  const rm = reducedMotion();
  return (
    <>
      {banner && <TurnBanner key={banner.id} b={banner} rm={rm} />}
      {cut && <CutIn key={cut.id} c={cut} img={cutImg} out={cutOut} rm={rm} onPick={pick} onCustomise={customise} onHover={(h) => { hovering.current = h; }} />}
      {custom && <CommandsDialog key={custom} game={game} charId={custom} onClose={() => setCustom(null)} />}
    </>
  );
}

// ---------- look ----------
const CSS = [
  '@keyframes phcBanner{0%{transform:translateY(-130%)}22%{transform:translateY(0)}80%{transform:translateY(0)}100%{transform:translateY(-130%)}}',
  '@keyframes phcBannerFade{0%{opacity:0}18%{opacity:1}82%{opacity:1}100%{opacity:0}}',
  '@keyframes phcBannerShine{0%{transform:translateX(-100%) skewX(-20deg)}100%{transform:translateX(260%) skewX(-20deg)}}',
  '@keyframes phcCutIn{0%{transform:translateX(-115%) skewX(8deg);opacity:0}60%{transform:translateX(3%) skewX(-2deg);opacity:1}100%{transform:none;opacity:1}}',
  '@keyframes phcCutOut{0%{transform:none;opacity:1}100%{transform:translate(-30%, -12%) scale(.55);opacity:0}}',
  '@keyframes phcCutInR{0%{transform:translateX(115%) skewX(-8deg);opacity:0}60%{transform:translateX(-3%) skewX(2deg);opacity:1}100%{transform:none;opacity:1}}',
  '@keyframes phcCutOutR{0%{transform:none;opacity:1}100%{transform:translate(30%, -12%) scale(.55);opacity:0}}',
  '@keyframes phcCmdInR{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}',
  '@keyframes phcCutVeil{from{opacity:0}to{opacity:1}}',
  '@keyframes phcCutStreak{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}',
  '@keyframes phcCmdIn{from{transform:translateX(-24px);opacity:0}to{transform:none;opacity:1}}',
  '.phc-cut-cmd{transition:transform .12s ease,background .12s ease,border-color .12s ease}.phc-cut-cmd:hover:not(:disabled),.phc-cut-cmd:focus-visible{transform:translateX(6px);background:#FFFFFF!important;color:#0A0D13!important;border-color:#FFFFFF!important;outline:none}',
  '.phc-cut-cmd:hover:not(:disabled) .phc-cut-sub,.phc-cut-cmd:focus-visible .phc-cut-sub{color:#2E3A50!important}',
].join('');
let cssIn = false;
const ensureCss = () => { if (cssIn || typeof document === 'undefined') return; cssIn = true; const s = document.createElement('style'); s.id = 'phc-turn-intro'; s.textContent = CSS; document.head.appendChild(s); };

function TurnBanner({ b, rm }: { b: Banner; rm: boolean }) {
  ensureCss();
  const dur = (rm ? 300 : 520) + b.hold;
  return (
    <div aria-live="polite" role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 58, display: 'flex', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden', paddingBottom: 12 }}>
      <div style={{ position: 'relative', marginTop: 10, animation: (rm ? 'phcBannerFade ' : 'phcBanner ') + dur + 'ms cubic-bezier(.2,.8,.2,1) both' }}>
        {/* A white slab behind, offset: the bold two-tone look. */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'translate(10px, 8px) skewX(-16deg)', background: b.foe ? '#F65157' : '#FFFFFF' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, minWidth: 'min(560px, 92vw)', maxWidth: '92vw', padding: '10px 34px 10px 0', transform: 'skewX(-16deg)', background: '#0A0D13', borderBottom: '3px solid ' + b.stripe, overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,.6)' }}>
          <span aria-hidden="true" style={{ alignSelf: 'stretch', width: 16, background: b.stripe, flex: 'none' }} />
          <span style={{ transform: 'skewX(16deg)', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            {b.img ? <img src={b.img} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#000', border: '3px solid ' + b.stripe, flex: 'none' }} />
              : <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', border: '3px solid ' + b.stripe, color: b.stripe, fontSize: 28, fontWeight: 700, flex: 'none' }}>!</span>}
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, fontFamily: "'Chakra Petch', sans-serif" }}>
              <span style={{ fontSize: b.mine ? 15 : 13, fontWeight: 700, letterSpacing: '0.32em', color: b.kickerColor }}>{b.mine ? '▶ ' : b.foe ? '⚠ ' : ''}{b.kicker}</span>
              <span style={{ fontSize: 'clamp(22px, 3.4vw, 34px)', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.05, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#A3AEC2' }}>{b.sub}</span>
            </span>
          </span>
          {!rm && <span aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)', animation: 'phcBannerShine .7s ease-out .15s both' }} />}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) 84px', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color }}>{label}</span>
      <span style={{ height: 10, background: '#1C2536', transform: 'skewX(-20deg)', overflow: 'hidden' }}><span style={{ display: 'block', width: pct + '%', height: '100%', background: color }} /></span>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#E7EBF3', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v} / {max}</span>
    </div>
  );
}

/** CSS text (the templates' style strings) as a React style object. */
const css = (st: string) => Object.fromEntries(st.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.indexOf(':'); return [x.slice(0, i).trim().replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()), x.slice(i + 1).trim()]; }));
/** One resource row on the cut-in, drawn from resRowView (the combat card's own row): label, value, warning chip, then
 *  its bar or pips (over-limit pips past a divider), the same sizes; hover for the hint. Labels start under HP and AP. */
function ResLine({ r }: { r: ResRow }) {
  const v = resRowView(r);
  return (
    <div role="listitem" data-res={r.key} title={r.hint} aria-label={v.aria} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={css(v.labelStyle)}>{v.label}</span>
        <span style={{ ...css(v.valueStyle), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.value}</span>
        {v.hasWarn && <span role="status" style={css(v.warnStyle)}>{v.warn}</span>}
      </span>
      {v.isBar && <span aria-hidden="true" style={css(v.trackStyle)}><span style={css(v.fillStyle)} /></span>}
      {v.isPips && <span aria-hidden="true" style={css(v.pipsStyle)}>{v.pips.map((p) => <span key={p.key} data-over={p.over || undefined} style={css(p.style)} />)}</span>}
    </div>
  );
}

function CutIn({ c, img, out, rm, onPick, onCustomise, onHover }: { c: Cut; img: string; out: boolean; rm: boolean; onPick: (c: Cut, cmd: Command) => void; onCustomise: (c: Cut) => void; onHover: (h: boolean) => void }) {
  ensureCss();
  // Mirrored (from the right) when the left card would cover the unit itself.
  const R = !!c.right, sfx2 = R ? 'R' : '';
  const anim = out ? (rm ? 'phcFadeOut .15s ease-in both' : 'phcCutOut' + sfx2 + ' .3s cubic-bezier(.5,0,.75,0) both') : rm ? 'phcFadeIn .15s ease-out both' : 'phcCutIn' + sfx2 + ' .42s cubic-bezier(.2,.8,.2,1) both';
  const slab = R ? 'polygon(0 0, 100% 0, 100% 100%, 22% 100%)' : 'polygon(0 0, 100% 0, 78% 100%, 0 100%)';
  // The card grows with its resource rows (about 38 px each past the second), and stays centred.
  const H = 420 + 38 * Math.max(0, c.res.length - 2);
  return (
    <>
      {/* A dark veil on the left so the card reads over the grid; never clickable. */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 57, pointerEvents: 'none', background: 'linear-gradient(' + (R ? 270 : 90) + 'deg, rgba(5,7,11,.82) 0%, rgba(5,7,11,.45) 38%, transparent 62%)', animation: out ? 'phcFadeOut .3s ease-in both' : 'phcCutVeil .3s ease-out both' }} />
      <div data-phc-cutin="" role="dialog" aria-label={'Your turn: ' + c.name} onPointerMove={(e) => { if (e.movementX || e.movementY) onHover(true); }} onMouseLeave={() => onHover(false)}
        style={{ position: 'fixed', [R ? 'right' : 'left']: 0, top: '50%', marginTop: -H / 2, zIndex: 57, width: 'min(640px, 96vw)', display: 'flex', flexDirection: R ? 'row-reverse' : 'row', alignItems: 'stretch', fontFamily: "'Chakra Petch', sans-serif", color: '#E7EBF3', animation: anim, pointerEvents: out ? 'none' : 'auto' }}>
        {/* The portrait, cut on a diagonal, on a slab in the player's colour. */}
        <div style={{ position: 'relative', flex: 'none', width: 'min(230px, 36vw)', height: H }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: c.color, clipPath: slab }} />
          <img src={img} alt="" style={{ position: 'absolute', inset: R ? '0 0 0 10px' : '0 10px 0 0', width: 'calc(100% - 10px)', height: '100%', objectFit: 'cover', objectPosition: '50% 20%', background: '#000', clipPath: slab }} />
          {!rm && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: slab }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,.35) 50%, transparent 65%)', animation: 'phcCutStreak .6s ease-out .2s both' }} /></div>}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0, [R ? 'marginRight' : 'marginLeft']: -40, padding: R ? '18px 52px 18px 22px' : '18px 22px 18px 52px', background: '#0A0D13', clipPath: R ? 'polygon(0 0, 86% 0, 100% 100%, 0 100%)' : 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)', borderTop: '3px solid #FFFFFF', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: '#FFFFFF' }}>▶ {c.kicker}</span>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 600, lineHeight: 1.05, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
          <span className="phc-cut-class" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: c.color }}>{c.clsIcon && <img className="phc-class-emblem" src={c.clsIcon} alt="" style={{ width: 18, height: 18, flex: 'none' }} />}{c.line.toUpperCase()}</span>
          <Bar label="HP" v={c.hp[0]} max={c.hp[1]} color="#F65157" />
          {c.res.length > 0 && <div role="list" aria-label="Your resources" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{c.res.map((r) => <ResLine key={r.key} r={r} />)}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 34, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#FFFFFF' }}>AP</span>
            <span aria-label={c.ap + ' AP'} style={{ display: 'flex', gap: 4 }}>{Array.from({ length: Math.max(0, Math.min(9, Math.round(c.ap))) }, (_, i) => <span key={i} style={{ width: 14, height: 14, transform: 'rotate(45deg)', background: '#FFFFFF' }} />)}</span>
          </div>
          <span style={{ fontSize: 12, color: '#A3AEC2' }}>{c.weapon}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 4 }}>
            {c.cmds.map((cmd, i) => (
              <button key={cmd.key} type="button" className="phc-cut-cmd" disabled={cmd.off} onClick={() => onPick(c, cmd)} data-sfx="click" data-act={cmd.action} title={cmd.off ? cmd.label + ': ' + cmd.sub : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 50, padding: '6px 10px', borderTop: '1px solid #3B475D', borderRight: '1px solid #3B475D', borderBottom: '1px solid #3B475D', borderLeft: '4px solid ' + (cmd.off ? '#3B475D' : i === 0 ? '#F65157' : c.color), background: '#10151F', color: cmd.off ? '#7F8BA1' : '#E7EBF3', opacity: cmd.off ? 0.7 : 1, fontFamily: 'inherit', textAlign: 'left', cursor: cmd.off ? 'default' : 'pointer', animation: rm ? undefined : 'phcCmdIn' + sfx2 + ' .3s cubic-bezier(.2,.8,.2,1) ' + (260 + i * 60) + 'ms both' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', border: '1px solid currentColor', fontSize: 11, fontWeight: 700 }}>{cmd.key}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{cmd.label}</span>
                  <span className="phc-cut-sub" style={{ fontSize: 11, color: '#A3AEC2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.14em', color: '#7F8BA1' }}>PRESS 1–4 · ANY OTHER KEY OR CLICK TO PLAY ON</span>
            <button type="button" data-phc-customise="" onClick={() => onCustomise(c)} aria-keyshortcuts="C" aria-haspopup="dialog" title="Choose which four commands this card offers"
              style={{ marginLeft: 'auto', padding: '2px 8px', border: '1px solid #3B475D', background: 'transparent', color: '#C9D3E3', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', cursor: 'pointer' }}>⚙ CUSTOMISE (C)</button>
          </span>
        </div>
      </div>
    </>
  );
}

/** For tests: what a banner and a cut-in would show for a unit. */
export const _test = { bannerFor, cutFor, estMs };
