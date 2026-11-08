// The Proving Ground (practice mode): gear up on the map, then fight waves, with infinite retry and a tools panel.
// Mounted once in App.tsx; it shows while the game is in the Proving Ground (game.sandbox), on the story screen (main,
// gearing up) and the combat screen (fighting). Everything goes through the engine's sandbox/* actions
// (packages/engine/src/game.ts): no Narrator is ever called.
//  · Gearing up (phase 'story'): the squad and the wave's drill units stand on the area map, idle. The tools are open;
//    Start the fight, a click on a drill unit in the mini map, or an attack on one from the area map begins the fight.
//  · WAVE n: a slash banner across the screen whenever a fight begins, for everyone (shared state).
//  · The fight ends (won or lost): the engine is gearing up again; the combat screen keeps the last blows and shows a
//    card: Next wave / Retry (start at once), or Gear up first (back to the map with the tools open). With Auto on
//    (endless waves) the host's client calls the next wave after a short pause.
//  · Tools drawer: Gear (what is worn and carried, equip and unequip, give anything, the magic kit), Squad (level,
//    class and rank, skills, perks, traits, armour, refill), Magic (words, schools, modules, designs), Field (host: spawn enemies on a
//    clicked tile, clear them, enemy AI, endless waves, place or fight any wave, the mana meter, leave).
import React from 'react';
import { designInfo, designVerdict, toneChips, toneInk, formIconUri, isShape, SHAPE_MODULES } from './heartView';
import { OPT_LABEL, optValue } from './actionPickers';
import { wordRows } from './sigilView';
import { glyphUri, SIGIL_INK } from './glyphs';
import { glyphKeyNav } from './glyphKeys';
import {
  magicOf, type GameState, type Character, type Rarity, type Sheet, sandboxReady, sandboxTeam, WEAPONS, WEAPON, ITEM, CLASSES, CLASS, ADVANCED_CLASSES, SIGILS, SCHOOLS, SCHOOL, MODULES, MODULE, SKILLS, SKILL,
  ENEMIES, MANA_BANDS, SANDBOX_TIERS, PERKS, PERK, TRAITS, ARCHETYPES, packOf, classRank, maxHp, RARITY, sandboxNext, sandboxWave, refOf, hasEvoker, hasEmanator, MAGIC_KIT, CASTERS, CASTER, REST_INFO,
} from '@engine';
import { act, hostRoom, getState, go, leaveRoom, forgetSession, poke, toast } from './store';
import { importCharacter } from './charfile';
import { fxBusyUntil } from './fx/FxLayer';
import { sfx, reducedMotion } from './sfx';
import { usePresence, presenceCls } from './presence';

// ---------- starting it ----------
/** From the title: open a fresh room and go straight into the Proving Ground with a test character (or the host's
 *  locked-in ones, if the room already has some). */
export function startProvingGround(archetype?: string, opts: { friends?: boolean } = {}) {
  hostRoom();
  if (getState().role !== 'host') return;
  // Standalone: opened from the title, so leaving it closes the room (friends who joined go back to the title).
  act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}), standalone: true });
  if (opts.friends) openInvite();
}
// ---------- inviting friends (the room code, big) ----------
let inviteShown = false;
/** Show the invite card (the room code, a copy button and the shareable link). */
export function openInvite() { inviteShown = true; poke?.(); }
const closeInvite = () => { inviteShown = false; poke?.(); };
export const inviteLink = (code: string) => location.origin + '/?room=' + code;
/** From the room (host): the room's locked-in characters, or a test character when the host has none. */
export const openProvingGround = (archetype?: string) => act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}) });
export const QUICK_ARCHETYPES = ['sharpshooter', 'bulwark', 'sigilist', 'mender', 'brawler', 'heavy_gunner'].filter((id) => ARCHETYPES.some((a) => a.id === id));
/** Leave the Proving Ground (host): the room comes back as it was, and everyone returns to the room screen. */
export function leaveProvingGround(ask = true) {
  const st = getState(), sb = st.game?.sandbox;
  // A guest leaves on their own: their fighter goes, and they land on the title.
  if (st.role === 'guest') {
    if (ask && typeof confirm === 'function' && !confirm('Leave the Proving Ground? Your fighter goes with you.')) return;
    act({ type: 'sandbox/leave' });
    setTimeout(() => leaveRoom(), 250); // let the action reach the host first
    return;
  }
  const standalone = !!sb?.standalone, others = (st.game?.players?.length || 1) > 1;
  if (ask && typeof confirm === 'function' && !confirm(standalone ? 'Leave the Proving Ground?' + (others ? ' It closes for everyone.' : '') : 'Leave the Proving Ground? The room goes back to how it was before.')) return;
  act({ type: 'sandbox/end' });
  // From the title: the room was only for the Proving Ground; it closes, and everyone goes to the title.
  if (standalone) { const code = st.code; setTimeout(() => { leaveRoom(); if (code) forgetSession(code); }, others ? 250 : 0); return; }
  if (getState().game?.phase === 'lobby') go('room');
}

// ---------- look ----------
const C = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', red: '#F65157', ok: '#6FEA77', white: '#FFFFFF', mp: '#5C9EFF', mind: '#4FC8DF', soul: '#AE9BFF', body: '#F2A54A' };
const UI = "'Chakra Petch', sans-serif";
const btn: React.CSSProperties = { minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid ' + C.line, background: C.raised, color: C.text, fontFamily: UI, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const primary: React.CSSProperties = { ...btn, border: 0, background: C.text, color: C.ground };
const field: React.CSSProperties = { minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #2E3A50', background: C.ground, color: C.text, fontFamily: UI, fontSize: 13, minWidth: 0 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.muted };
const row: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const small: React.CSSProperties = { ...btn, minHeight: 28, padding: '0 9px', fontSize: 12 };
const CSS = `
@keyframes phcSbSlash{0%{transform:translateX(-110%) skewX(-18deg);opacity:0}18%{transform:translateX(0) skewX(-18deg);opacity:1}82%{transform:translateX(0) skewX(-18deg);opacity:1}100%{transform:translateX(110%) skewX(-18deg);opacity:0}}
@keyframes phcSbText{0%{letter-spacing:.9em;opacity:0}22%{letter-spacing:.32em;opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes phcSbFade{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
.phc-sb-slash{animation:phcSbSlash 1.6s cubic-bezier(.2,.8,.2,1) both}
.phc-sb-text{animation:phcSbText 1.6s cubic-bezier(.2,.8,.2,1) both}
.phc-reduce .phc-sb-slash,.phc-reduce .phc-sb-text{animation:phcSbFade 1.2s ease-out both}
.phc-sb-tab:hover{background:#1C2536!important}
html.phc-sandbox div[role="dialog"][aria-label="The fight is over"]{display:none!important}
.phc-sb-drawer{right:0}
@media (min-width:1280px){.phc-sb-drawer.phc-sb-onmain{right:360px}}
`;
function useCss() { React.useEffect(() => { if (document.getElementById('phc-sandbox-css')) return; const s = document.createElement('style'); s.id = 'phc-sandbox-css'; s.textContent = CSS; document.head.appendChild(s); }, []); }

type Tab = 'gear' | 'squad' | 'magic' | 'field';
/** The drill unit on a tile of the area map, while gearing up. */
const foeAt = (game: GameState, ref: string) => (game.story.npcs || []).find((n) => n.side === 'hostile' && refOf(n.pos) === ref) || null;

export function SandboxPanel({ game, meId, isHost, screen }: { game: GameState | null; meId: string; isHost: boolean; screen: string }) {
  useCss();
  const sb = game?.sandbox, gearing = !!sb && game!.phase === 'story', fighting = !!sb && game!.phase === 'combat';
  const here = !!sb && (screen === 'combat' || screen === 'main');
  const [open, setOpen] = React.useState(true);
  // The combat screen's own end-of-fight card (Back to the story) has no place here: the wave card replaces it.
  React.useEffect(() => { document.documentElement.classList.toggle('phc-sandbox', !!sb); return () => document.documentElement.classList.remove('phc-sandbox'); }, [!!sb]);
  React.useEffect(() => { document.documentElement.classList.toggle('phc-sb-gearing', gearing && screen === 'main'); return () => document.documentElement.classList.remove('phc-sb-gearing'); }, [gearing, screen]);
  // The tools open whenever the squad is gearing up on the map (the start, and after each fight); a fight closes them.
  React.useEffect(() => { if (gearing && screen === 'main') setOpen(true); }, [gearing, screen, sb?.fights]);
  React.useEffect(() => { if (fighting) setOpen(false); }, [fighting, sb?.fights]);
  // A fight the host stopped leaves nothing on the combat screen: back to the map.
  React.useEffect(() => { if (sb && screen === 'combat' && game!.phase === 'story' && !game!.combat?.over) go('main'); }, [!!sb, screen, game?.phase, !!game?.combat?.over]);
  // Gearing up: a click on a drill unit in the mini map starts the fight.
  React.useEffect(() => {
    if (!(gearing && screen === 'main')) return;
    const f = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.phc-mini button.phc-tok') as HTMLElement | null; if (!el) return;
      const ref = (el.getAttribute('aria-label') || '').split(':')[0].trim(), g = getState().game;
      if (picking || !g?.sandbox || g.phase !== 'story' || !/^[A-Z]{1,2}\d{1,2}$/.test(ref) || !foeAt(g, ref)) return;
      e.preventDefault(); e.stopPropagation(); sfx('start'); act({ type: 'sandbox/fight' });
    };
    window.addEventListener('click', f, true);
    return () => window.removeEventListener('click', f, true);
  }, [gearing, screen]);
  const drawer = usePresence(here && open ? true : null);
  return <>
    {fighting && screen === 'combat' && <WaveBanner game={game!} />}
    {!!sb && screen === 'combat' && !!game!.combat?.over && sb.mode !== 'teams' && <WaveEnd game={game!} isHost={isHost} />}
    {!!sb && screen === 'combat' && !!game!.combat?.over && sb.mode === 'teams' && <TeamEnd game={game!} meId={meId} isHost={isHost} />}
    {here && inviteShown && <InviteCard game={game!} />}
    {here && !open && <button type="button" className="phc-sb-tab" onClick={() => { setOpen(true); sfx('slide'); }} aria-label="Open the Proving Ground tools"
      style={{ position: 'fixed', right: 0, top: '38%', zIndex: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: '10px 0 0 10px', border: '1px solid ' + C.line, borderRight: 0, background: C.panel, color: C.text, fontFamily: UI, cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,0,0,.5)' }}>
      <span style={{ fontSize: 10, letterSpacing: '0.2em', color: C.muted }}>WAVE</span>
      <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{gearing ? sandboxNext(sb!) : sb!.wave}</span>
      <span style={{ fontSize: 10, color: C.muted }}>best {sb!.best}</span>
      <span aria-hidden="true" style={{ fontSize: 18, marginTop: 4 }}>⚙</span>
      <span style={{ fontSize: 10, letterSpacing: '0.16em', writingMode: 'vertical-rl' }}>{gearing ? 'GEAR UP' : 'TOOLS'}</span>
    </button>}
    {drawer.shown && game?.sandbox && <Drawer game={game} meId={meId} isHost={isHost} screen={screen} closing={drawer.closing} close={() => { setOpen(false); sfx('slide_back'); }} />}
  </>;
}

// ---------- WAVE n ----------
function WaveBanner({ game }: { game: GameState }) {
  const sb = game.sandbox!, key = sb.state === 'fighting' ? (sb.fights || 0) + '|' + sb.wave + '|' + sb.attempt : null;
  const [shown, setShown] = React.useState<{ wave: number; retry: boolean; id: number } | null>(null);
  const mounted = React.useRef(false), last = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!key || key === last.current) return;
    last.current = key;
    if (document.hidden) return;
    // A fight comes in under the combat-in transition: wait for it.
    const wait = mounted.current ? 150 : 1000; mounted.current = true;
    const id = Date.now(), t1 = setTimeout(() => { setShown({ wave: sb.wave, retry: sb.attempt > 1, id }); sfx('slide'); }, wait);
    const t2 = setTimeout(() => setShown((s) => (s && s.id === id ? null : s)), wait + (reducedMotion() ? 1250 : 1650));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [key]);
  if (!shown) return null;
  const boss = shown.wave % 5 === 0;
  return <div aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, top: '42%', zIndex: 52, pointerEvents: 'none', display: 'grid', placeItems: 'center', overflow: 'hidden', height: 120 }}>
    <div className="phc-sb-slash" style={{ position: 'absolute', inset: '18px -10%', background: C.ground, borderTop: '3px solid ' + (boss ? C.red : C.white), borderBottom: '3px solid ' + (boss ? C.red : C.white), boxShadow: '0 10px 40px rgba(0,0,0,.6)' }} />
    <div className="phc-sb-text" style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 18, fontFamily: UI, fontStyle: 'italic', fontWeight: 700, color: C.white }}>
      <span style={{ fontSize: 'clamp(28px, 6vw, 60px)', letterSpacing: '0.32em' }}>WAVE {shown.wave}</span>
      <span style={{ fontSize: 14, letterSpacing: '0.24em', color: boss ? C.red : C.muted }}>{boss ? 'CHAMPION' : shown.retry ? 'AGAIN' : 'INCOMING'}</span>
    </div>
  </div>;
}

// ---------- cleared / fallen (on the combat screen, over the finished fight) ----------
const AUTO_MS = 3000;
function WaveEnd({ game, isHost }: { game: GameState; isHost: boolean }) {
  const sb = game.sandbox!, over = !!game.combat?.over && (sb.state === 'cleared' || sb.state === 'fallen');
  const ended = over ? sb.state + '|' + (sb.fights || 0) + '|' + sb.wave + '|' + sb.attempt : null;
  // Shown once the effects of the last blows have played (capped), so the card never covers the killing shot.
  const [ready, setReady] = React.useState<string | null>(null), [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    if (!ended) { setReady(null); return; }
    const wait = Math.min(4000, Math.max(300, fxBusyUntil() - performance.now() + 250));
    const t = setTimeout(() => { setReady(ended); sfx(sb.state === 'cleared' ? 'start' : 'error'); }, wait);
    return () => clearTimeout(t);
  }, [ended]);
  const auto = sb.state === 'cleared' && sb.auto && ready === ended;
  React.useEffect(() => {
    if (!auto) return;
    const at = Date.now() + AUTO_MS; setLeft(Math.ceil(AUTO_MS / 1000));
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000))), 250);
    // Only the host's client calls the next wave (one action for the room); a hidden host tab still calls it.
    const fire = isHost ? setTimeout(() => { const g = getState().game; if (g?.sandbox?.state === 'cleared' && g.phase === 'story' && g.sandbox.wave === sb.wave && g.sandbox.auto) act({ type: 'sandbox/wave' }); }, AUTO_MS) : undefined;
    return () => { clearInterval(tick); if (fire) clearTimeout(fire); };
  }, [auto, ended]);
  const p = usePresence(ready && ready === ended ? sb.state : null);
  if (!p.shown) return null;
  const won = p.shown === 'cleared';
  const gearUp = <button type="button" data-sfx="slide" style={{ ...btn, minHeight: 46 }} onClick={() => go('main')}>Gear up first</button>;
  return <div role="dialog" aria-modal="true" aria-label={won ? 'Wave cleared' : 'The squad fell'} className={presenceCls('phc-a-fade', p.closing)}
    style={{ position: 'fixed', inset: 0, zIndex: 48, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(5, 7, 11, 0.82)' }}>
    <div className={presenceCls('phc-a-pop', p.closing)} style={{ width: 'min(540px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 16, background: C.panel, border: '1px solid ' + C.line, borderTop: '4px solid ' + (won ? C.ok : C.red), fontFamily: UI, color: C.text }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: won ? C.ok : C.red }}>{won ? '✓ WAVE CLEARED' : '✕ THE SQUAD IS DOWN'}</span>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 30, fontWeight: 600 }}>Wave {sb.wave}{won ? ' cleared' : ''}</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: '#C9D3E3' }}>
        {won ? 'The squad carries its HP, ammo and magic into the next wave. Gear up first to change weapons, refill or learn magic.' : 'Nothing is lost here: everyone is back up and refilled. Retry the wave now, or gear up first.'} Best so far: wave {sb.best}.
      </span>
      {won ? <div style={row}>
        <button type="button" data-sfx="start" style={{ ...primary, minHeight: 46, flex: 1 }} onClick={() => act({ type: 'sandbox/wave' })}>Next wave {sandboxNext(sb)} ›{auto && left > 0 ? ' · ' + left : ''}</button>
        {gearUp}
        {isHost && <button type="button" style={{ ...btn, minHeight: 46 }} aria-pressed={sb.auto} onClick={() => act({ type: 'sandbox/auto', on: !sb.auto })}>{sb.auto ? 'Endless: on · hold here' : 'Endless: off'}</button>}
      </div> : <div style={row}>
        {(isHost || sb.guestRetry !== false) && <button type="button" data-sfx="start" style={{ ...primary, minHeight: 46, flex: 1 }} onClick={() => act({ type: 'sandbox/retry' })}>↻ Retry wave {sb.wave}</button>}
        {gearUp}
        {(isHost || sb.guestRetry !== false) && <button type="button" style={{ ...btn, minHeight: 46 }} onClick={() => act({ type: 'sandbox/retry', restart: true })}>Restart from wave 1</button>}
        {!isHost && sb.guestRetry === false && <span style={{ fontSize: 13, color: C.muted, alignSelf: 'center' }}>The host retries the wave.</span>}
      </div>}
      {isHost && <button type="button" style={{ ...btn, alignSelf: 'flex-start', color: C.muted }} onClick={() => leaveProvingGround()}>Leave the Proving Ground</button>}
    </div>
  </div>;
}

// ---------- the tools drawer ----------
const HINT = 'phc.sbHint';
function Drawer({ game, meId, isHost, screen, closing, close }: { game: GameState; meId: string; isHost: boolean; screen: string; closing: boolean; close: () => void }) {
  const sb = game.sandbox!, gearing = game.phase === 'story';
  const chars = Object.values(game.characters).filter((c) => isHost || c.owner === meId);
  const [tab, setTab] = React.useState<Tab>('gear'), [cid, setCid] = React.useState<string>(chars[0]?.id || '');
  const c = game.characters[cid] && chars.some((x) => x.id === cid) ? game.characters[cid] : chars[0];
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) close(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const field = isHost || !!sb.spawnAll;
  const tabs: [Tab, string][] = [['gear', 'Gear'], ['squad', 'Squad'], ['magic', 'Magic'], ...(field ? [['field', 'Field'] as [Tab, string]] : [])];
  const status = gearing ? (sb.state === 'cleared' ? 'wave ' + sb.wave + ' cleared · gearing up' : sb.state === 'fallen' ? 'fell on wave ' + sb.wave + ' · gearing up' : 'gearing up') : 'fighting';
  return <aside aria-label="Proving Ground tools" className={presenceCls('phc-a-right', closing) + ' phc-sb-drawer' + (screen === 'main' ? ' phc-sb-onmain' : '')}
    style={{ position: 'fixed', top: 0, bottom: 0, zIndex: 47, width: 'min(400px, 94vw)', display: 'flex', flexDirection: 'column', background: C.panel, borderLeft: '1px solid ' + C.line, borderRight: screen === 'main' ? '1px solid ' + C.line : 0, boxShadow: '-12px 0 40px rgba(0,0,0,.55)', fontFamily: UI, color: C.text }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid ' + C.line }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={label}>THE PROVING GROUND · {game.players.length} PLAYER{game.players.length === 1 ? '' : 'S'}{sb.mode === 'teams' ? ' · TEAM FIGHT' : ''}</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Wave {gearing ? sandboxNext(sb) : sb.wave} <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>· best {sb.best} · {status}</span></span>
      </div>
      <button type="button" style={{ ...btn, color: C.muted }} onClick={() => leaveProvingGround()} title={!isHost ? 'Leave the Proving Ground: your fighter goes, you go to the title' : sb.standalone ? 'Close the Proving Ground for everyone' : 'Back to the room, as it was before'}>Leave</button>
      <button type="button" style={btn} onClick={close} aria-label="Close the tools" title="Hide the tools (the tab on the right brings them back)">✕</button>
    </header>
    <FightBar game={game} isHost={isHost} meId={meId} />
    <nav role="tablist" aria-label="Tools" style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid ' + C.line }}>
      {tabs.map(([id, name]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); sfx('tab'); }}
        style={{ ...btn, flex: 1, border: '1px solid ' + (tab === id ? C.text : C.line), background: tab === id ? C.raised : 'transparent', color: tab === id ? C.text : C.muted }}>{name}</button>)}
    </nav>
    {tab !== 'field' && <div role="group" aria-label="Character" style={{ ...row, padding: '10px 16px 0' }}>
      {chars.length ? chars.map((x) => <button key={x.id} type="button" aria-pressed={x.id === c?.id} onClick={() => setCid(x.id)} style={{ ...btn, border: '1px solid ' + (x.id === c?.id ? C.text : C.line), background: x.id === c?.id ? C.raised : 'transparent' }}>{x.name}</button>)
        : <NoFighter gearing={gearing} />}
    </div>}
    <div key={tab} className="phc-fade-in" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {tab === 'squad' && <Players game={game} meId={meId} isHost={isHost} />}
      {tab === 'gear' && c && <GearTab c={c} />}
      {tab === 'squad' && c && <SquadTab game={game} c={c} isHost={isHost} />}
      {tab === 'magic' && c && <MagicTab c={c} />}
      {tab === 'field' && field && <FieldTab game={game} isHost={isHost} />}
    </div>
  </aside>;
}

/** The fight, on top of the tools: start it (gearing up), or stop it (host, fighting). */
function FightBar({ game, isHost, meId }: { game: GameState; isHost: boolean; meId: string }) {
  const sb = game.sandbox!, gearing = game.phase === 'story', n = sandboxNext(sb), teams = sb.mode === 'teams';
  const r = sandboxReady(game), multi = game.players.length > 1, mine = r.ids.includes(meId), meReady = !!sb.ready?.[meId];
  const canStart = isHost || (r.of > 0 && r.ready === r.of), party = Math.max(1, r.of);
  const onMap = (game.story.npcs || []).filter((x) => x.side === 'hostile').length;
  const [hint, setHint] = React.useState(() => { try { return localStorage.getItem(HINT) !== '1'; } catch { return true; } });
  const hide = () => { setHint(false); try { localStorage.setItem(HINT, '1'); } catch { /* */ } };
  if (!gearing) return <div style={{ ...row, padding: '10px 16px', borderBottom: '1px solid ' + C.line }}>
    <span style={{ flex: 1, fontSize: 13, color: C.muted }}>Wave {sb.wave}{sb.attempt > 1 ? ' · attempt ' + sb.attempt : ''} is on. Gear changes here work mid-fight too.</span>
    {isHost && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/stop' })} title="End the fight now and go back to gearing up; the enemies stay where they stand">■ Stop the fight</button>}
  </div>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', borderBottom: '1px solid ' + C.line }}>
    {sb.state === 'cleared' && <span style={{ fontSize: 13, fontWeight: 700, color: C.ok }}>✓ Wave {sb.wave} cleared. Next: wave {n}.</span>}
    {sb.state === 'fallen' && <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>✕ The squad fell on wave {sb.wave}. Everyone is back up and refilled.</span>}
    {hint && <div role="note" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + C.white, background: '#0D1119' }}>
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}><b>Gear up here, then click the map to start a fight.</b> <span style={{ color: '#C9D3E3' }}>Click a drill unit on the map, attack one from the Area map, or press Start the fight. Gear is the first tab; the Magic kit gives you everything to cast at once.</span></span>
      <button type="button" style={{ ...small, minHeight: 26 }} aria-label="Hide the hint" onClick={hide}>✕</button>
    </div>}
    {multi && <div style={row}>
      {mine && <ReadyButton on={meReady} />}
      <span aria-label="Ready count" style={{ fontSize: 13, fontWeight: 700, color: r.ready === r.of && r.of ? C.ok : C.muted }}>{r.ready === r.of && r.of ? '✓ ' : '○ '}{r.ready} / {r.of} ready</span>
    </div>}
    <button type="button" data-sfx="start" disabled={!canStart} title={canStart ? '' : 'The host starts the fight (or anyone, once everyone is ready)'} style={{ ...primary, minHeight: 48, fontSize: 15, background: canStart ? C.white : C.raised, color: canStart ? C.ground : C.muted, cursor: canStart ? 'pointer' : 'default' }} onClick={() => act({ type: 'sandbox/fight' })}>
      ⚔ {canStart ? (teams ? 'Start the team fight' : 'Start the fight') : 'Waiting for the host'} · {teams ? 'Team A vs Team B' : onMap ? onMap + ' on the map' : 'wave ' + n}{multi ? ' · ' + r.ready + ' / ' + r.of + ' ready' : ''}
    </button>
    {teams ? <span style={{ fontSize: 12, color: C.muted }}>Team fight: no drill units. Pick a team on the Squad tab. Team A starts on the left, Team B on the right; Downed is out; the last team standing wins.</span> : <div style={row}>
      {!onMap && <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>The map is empty: wave {n} ({sandboxWave(n, party).length} drill unit{sandboxWave(n, party).length === 1 ? '' : 's'}) comes in when the fight starts.</span>}
      {(isHost || sb.spawnAll) && <button type="button" style={small} onClick={() => act({ type: 'sandbox/stage', wave: n })}>{onMap ? 'Reset to wave ' + n : 'Place wave ' + n + ' on the map'}</button>}
      {(isHost || (sb.state === 'fallen' && sb.guestRetry !== false)) && sb.wave > 1 && <button type="button" style={small} onClick={() => act({ type: 'sandbox/retry', restart: true })}>Restart from wave 1</button>}
    </div>}
  </div>;
}

const Section = ({ title, children, aria }: { title: string; children: React.ReactNode; aria?: string }) => <section aria-label={aria} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={label}>{title}</span>{children}</section>;
const Stepper = ({ value, min, max, set, name }: { value: number; min: number; max: number; set: (n: number) => void; name: string }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Lower ' + name} disabled={value <= min} onClick={() => set(value - 1)}>‹</button>
  <span style={{ minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: 700 }}>{value}</span>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Raise ' + name} disabled={value >= max} onClick={() => set(value + 1)}>›</button>
</span>;

function SquadTab({ game, c, isHost }: { game: GameState; c: Character; isHost: boolean }) {
  const u = game.phase === 'combat' ? game.combat?.units.find((x) => x.charId === c.id) : undefined, adv = game.sandbox!.advanced[c.id];
  const [skill, setSkill] = React.useState(SKILLS[0].id);
  const [perk, setPerk] = React.useState(PERKS[0].id);
  const [trait, setTrait] = React.useState(TRAITS[0].id);
  const clsVal = adv ? 'adv:' + adv : c.classId || '';
  return <>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {c.portrait ? <img src={c.portrait} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8, background: '#000' }} /> : <span style={{ width: 56, height: 70, borderRadius: 8, background: C.raised, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{c.name.slice(0, 2).toUpperCase()}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
        <span style={{ color: C.muted }}>Level {c.level} · {adv ? ADVANCED_CLASSES.find((x) => x.id === adv)?.name : c.classId ? CLASS[c.classId]?.name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] : 'Classless'}</span>
        {u ? <span><span style={{ color: C.red }}>HP {u.hp}/{u.maxHp}</span> · AP {u.ap} · {WEAPON[u.weapon]?.name}{WEAPON[u.weapon]?.magazine != null ? ' ' + u.ammo + '/' + WEAPON[u.weapon].magazine : ''}{u.mg?.emanator ? <span style={{ color: C.mp }}> · MP {Math.round(u.mg.mp)}</span> : null}</span>
          : <span><span style={{ color: C.red }}>HP {c.hp}/{maxHp(c)}</span> · {WEAPON[c.weapon]?.name}{WEAPON[c.weapon]?.magazine != null ? ' ' + (c.loaded ?? 0) + '/' + WEAPON[c.weapon].magazine : ''}</span>}
      </div>
    </div>
    <div style={row}>
      <button type="button" style={primary} onClick={() => act({ type: 'sandbox/refill', charId: c.id })}>Refill {c.name.split(' ')[0]}</button>
      {isHost && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/refill' })}>Refill everyone</button>}
    </div>
    <span style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>HP, AP (on its turn), every magazine, stims, MP, the Evoker's charge and cores, a mended weapon; no injuries.</span>
    {isHost && <Section title="REST (THE ENGINE'S RULES, FOR EVERYONE)" aria="Rest">
      <div style={row}>{(['short', 'long'] as const).map((k) => <button key={k} type="button" data-sb-rest={k} disabled={game.phase !== 'story'} title={game.phase !== 'story' ? 'No resting in a fight: stop the fight (or clear the wave) first.' : REST_INFO[k]}
        style={{ ...btn, opacity: game.phase !== 'story' ? 0.5 : 1 }} onClick={() => act({ type: 'rest', kind: k })}>Rest ({k})</button>)}</div>
      <span style={{ fontSize: 12, color: C.muted }}>{game.phase !== 'story' ? 'No resting in a fight: stop the fight (or clear the wave) first.' : 'Short: ' + REST_INFO.short + '. Long: ' + REST_INFO.long + '.'}</span>
    </Section>}
    <Section title="LEVEL (HP RECOMPUTED, FULL)"><Stepper name="level" value={c.level} min={1} max={20} set={(n) => act({ type: 'sandbox/level', charId: c.id, level: n })} /><span style={{ fontSize: 12, color: C.muted }}>{maxHp(c)} HP at this level. Unspent points from levels go to Level up.</span></Section>
    <Section title="CLASS">
      <select value={clsVal} style={field} aria-label="Class" onChange={(e) => { const v = e.target.value; act({ type: 'sandbox/class', charId: c.id, classId: v ? v.replace(/^adv:/, '') : null, rank: 1 }); }}>
        <option value="">Classless</option>
        <optgroup label="Base classes">{CLASSES.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.core}</option>)}</optgroup>
        <optgroup label="Advanced classes">{ADVANCED_CLASSES.map((k) => <option key={k.id} value={'adv:' + k.id}>{k.name} ({k.parents.map((p) => CLASS[p]?.name || p).join(' + ')})</option>)}</optgroup>
      </select>
      {c.classId && !adv && <div style={row}><span style={{ fontSize: 13, color: C.muted }}>Rank</span>{[1, 2, 3].map((r) => <button key={r} type="button" aria-pressed={classRank(c) === r} style={{ ...btn, border: '1px solid ' + (classRank(c) === r ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/class', charId: c.id, classId: c.classId, rank: r })}>{['', 'I', 'II', 'III'][r]}</button>)}</div>}
      <span style={{ fontSize: 12, color: C.muted }}>{adv ? 'An advanced class is held with its first parent at its own rank: both sets of moves are in the Class tab.' : 'Rank II and III raise the signature skills to 13 and 18.'}</span>
    </Section>
    <Section title="SKILL POINTS (ATTRIBUTE AND CORE FOLLOW)">
      <div style={row}>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ ...field, flex: 1 }} aria-label="Skill">{SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name} ({c.skills[s.id] || 0})</option>)}</select>
        <Stepper name={SKILL[skill]?.name || 'skill'} value={c.skills[skill] || 0} min={0} max={10} set={(n) => act({ type: 'sandbox/skill', charId: c.id, skill, points: n })} />
      </div>
    </Section>
    <Section title="PERKS (ANY TIER, NO POINTS NEEDED)">
      <div style={row}>
        <select value={perk} onChange={(e) => setPerk(e.target.value)} style={{ ...field, flex: 1 }} aria-label="Perk">
          {(['acquired', 'mastered', 'achieved', 'ultimate'] as const).map((t) => <optgroup key={t} label={t[0].toUpperCase() + t.slice(1)}>{PERKS.filter((p) => p.tier === t).map((p) => <option key={p.id} value={p.id}>{p.name}{p.tier === 'acquired' ? ' (' + p.skills.map((k: string) => SKILL[k]?.name || k).join(', ') + ')' : ''}</option>)}</optgroup>)}
        </select>
        {PERK[perk]?.tier === 'acquired'
          ? <>{(['I', 'II'] as const).map((t) => <button key={t} type="button" data-sb-perk={t} style={btn} onClick={() => act({ type: 'sandbox/perk', charId: c.id, perk, tier: t })}>Tier {t}</button>)}</>
          : <button type="button" data-sb-perk="give" style={btn} onClick={() => act({ type: 'sandbox/perk', charId: c.id, perk })}>Give</button>}
      </div>
      {!!c.perks.length && <div style={row}>{c.perks.map((x) => <button key={x.id} type="button" title="Take it away" style={btn} onClick={() => act({ type: 'sandbox/perk', charId: c.id, perk: x.id, tier: null })}>{PERK[x.id]?.name || x.id}{x.tier === 'I' || x.tier === 'II' ? ' ' + x.tier : ''} ✕</button>)}</div>}
    </Section>
    <Section title="TRAITS (NO LIMIT OF 2 HERE)">
      <div style={row}>
        <select value={trait} onChange={(e) => setTrait(e.target.value)} style={{ ...field, flex: 1 }} aria-label="Trait">{TRAITS.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <button type="button" data-sb-trait="give" style={btn} onClick={() => act({ type: 'sandbox/trait', charId: c.id, trait })}>Give</button>
      </div>
      {!!(c.traits || []).length && <div style={row}>{(c.traits || []).map((t) => <button key={t} type="button" title="Take it away" style={btn} onClick={() => act({ type: 'sandbox/trait', charId: c.id, trait: t, on: false })}>{(TRAITS.find((x: any) => x.id === t) as any)?.name || t} ✕</button>)}</div>}
    </Section>
    <Section title="BODY ARMOUR CLASS">
      <div style={row}>{[0, 1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={c.armourClass === n} style={{ ...btn, border: '1px solid ' + (c.armourClass === n ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/armour', charId: c.id, armourClass: n })}>{n}</button>)}</div>
    </Section>
  </>;
}

// ---------- gear ----------
const RARITIES = Object.keys(RARITY) as Rarity[];
type PackIt = ReturnType<typeof packOf>[number];
/** Where a pack item can go: [slot, button label]. */
function equipTo(it: PackIt): ['main' | 'off' | 'worn' | 'mod', string][] {
  const w = it.weapon && it.kind === 'weapon' ? WEAPON[it.weapon] : null, d = ITEM[it.item || it.id] as any;
  if (w) return [['main', 'Equip · main hand'], ...((w as any).hands === '1H' ? [['off', 'Off hand'] as ['off', string]] : [])];
  if (d?.category === 'mod') return [['mod', 'Fit to weapon']];
  if (d?.category === 'armour') return [['worn', 'Wear']];
  if (d?.slot === 'off_hand') return [['off', 'Equip · off hand']];
  return [];
}
const slotRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 8, background: C.ground, border: '1px solid ' + C.line, fontSize: 13 };
function GearTab({ c }: { c: Character }) {
  const pack = packOf(c), mainName = WEAPON[c.weapon]?.name || c.weapon;
  const worn = Object.entries(c.worn || {});
  return <>
    <Section title="MAGIC KIT" aria="Magic kit">
      <div style={row}>
        <button type="button" data-sfx="start" style={{ ...primary, background: C.white }} onClick={() => act({ type: 'sandbox/kit', charId: c.id, kind: 'both' })}>✦ Magic kit</button>
        <button type="button" style={{ ...small, color: C.mind, border: '1px solid ' + C.mind }} onClick={() => act({ type: 'sandbox/kit', charId: c.id, kind: 'sigil' })}>Sigils only</button>
        <button type="button" style={{ ...small, color: C.soul, border: '1px solid ' + C.soul }} onClick={() => act({ type: 'sandbox/kit', charId: c.id, kind: 'soul' })}>Outbursts only</button>
      </div>
      <span style={{ fontSize: 12, lineHeight: 1.45, color: C.muted }}>
        <span style={{ color: C.mind }}>Sigils:</span> an Evoker in the off hand, 4 mana cores, {MAGIC_KIT.words.map((w) => w.toUpperCase()).join(' · ')}.{' '}
        <span style={{ color: C.soul }}>Outbursts:</span> an Emanator with full MP and two designs ({MAGIC_KIT.designs.map((d) => d.name).join(', ')}).
        {' '}Now: {hasEvoker(c) ? '✓ Evoker' : 'no Evoker'} · {hasEmanator(c) ? '✓ Emanator' : 'no Emanator'} · {(c.sigils || []).length} words · {(c.outbursts || []).length} designs.
      </span>
    </Section>
    <Section title="EQUIPPED" aria="Equipped">
      <div style={slotRow}><span style={label}>MAIN HAND</span><span style={{ minWidth: 0 }}><b>{mainName}</b>{c.weaponState?.rarity && c.weaponState.rarity !== 'standard' ? ' (' + c.weaponState.rarity + ')' : ''}{(c.weaponState?.mods || []).length ? <span style={{ color: C.muted }}>{' · ' + c.weaponState!.mods!.map((m) => ITEM[m]?.name || m).join(', ')}</span> : null}</span>
        {c.weapon !== 'fists' ? <button type="button" style={small} aria-label={'Unequip ' + mainName} onClick={() => act({ type: 'sandbox/unequip', charId: c.id, slot: 'main' })}>Unequip</button> : <span />}</div>
      <div style={slotRow}><span style={label}>OFF HAND</span><span style={{ minWidth: 0, color: c.offHand ? C.text : C.muted }}>{c.offHand ? <b>{WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id}</b> : 'empty'}</span>
        {c.offHand ? <button type="button" style={small} aria-label={'Unequip ' + (WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id)} onClick={() => act({ type: 'sandbox/unequip', charId: c.id, slot: 'off' })}>Unequip</button> : <span />}</div>
      {worn.map(([slot, id]) => <div key={slot} style={slotRow}><span style={label}>{slot.replace(/_/g, ' ').toUpperCase()}</span><span style={{ minWidth: 0 }}><b>{ITEM[id]?.name || id}</b></span>
        <button type="button" style={small} aria-label={'Unequip ' + (ITEM[id]?.name || id)} onClick={() => act({ type: 'sandbox/unequip', charId: c.id, slot })}>Unequip</button></div>)}
      {!worn.length && <div style={slotRow}><span style={label}>ARMOUR</span><span style={{ color: C.muted }}>no armour pieces worn</span><span /></div>}
      <span style={{ fontSize: 12, color: C.muted }}>Body armour class {c.armourClass ?? 0} (set it on Squad). A weapon taken in hand here comes loaded.</span>
    </Section>
    <Section title={'PACK (' + pack.length + ')'} aria="Pack">
      {pack.map((it, i) => <div key={i + it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 140px', minWidth: 0 }}>{it.name}{it.rarity && it.rarity !== 'standard' ? ' (' + it.rarity + ')' : ''}<span style={{ color: C.muted }}>{it.mags ? ' · ' + it.mags.length + ' × [' + it.mags.join(', ') + ']' : it.qty > 1 ? ' × ' + it.qty : ''}</span></span>
        {equipTo(it).map(([to, name]) => <button key={to} type="button" style={small} aria-label={name + ': ' + it.name} onClick={() => act({ type: 'sandbox/equip', charId: c.id, idx: i, to })}>{name}</button>)}
        <button type="button" style={{ ...small, color: C.muted }} aria-label={'Drop ' + it.name} onClick={() => act({ type: 'sandbox/drop', charId: c.id, idx: i })}>✕</button>
      </div>)}
      {!pack.length && <span style={{ fontSize: 13, color: C.muted }}>Empty. Give something below.</span>}
      <span style={{ fontSize: 12, color: C.muted }}>Stims: {c.stims} <button type="button" style={{ ...small, minHeight: 26 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: 'stim_injector', qty: 3 })}>+3</button></span>
    </Section>
    <GivePicker c={c} />
  </>;
}
function GivePicker({ c }: { c: Character }) {
  const [q, setQ] = React.useState(''), [rarity, setRarity] = React.useState<Rarity>('standard');
  const s = q.trim().toLowerCase();
  const list = React.useMemo(() => [
    ...WEAPONS.map((w) => ({ id: w.id, name: w.name, what: w.category.replace(/_/g, ' '), weapon: true })),
    ...Object.values(ITEM).map((it: any) => ({ id: it.id, name: it.name, what: (it.category || 'item') + (it.slot ? ' · ' + it.slot.replace(/_/g, ' ') : ''), weapon: false })),
  ], []);
  const hits = list.filter((x) => !s || x.name.toLowerCase().includes(s) || x.what.includes(s) || x.id.includes(s)).slice(0, 60);
  return <Section title="GIVE… (ANY WEAPON OR ITEM)" aria="Give">
    <div style={row}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search weapons and items…" aria-label="Search weapons and items" style={{ ...field, flex: 1 }} />
      <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)} aria-label="Weapon rarity" style={field}>{RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
      {hits.map((x) => <div key={(x.weapon ? 'w:' : 'i:') + x.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: C.ground, border: '1px solid ' + C.line }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{x.name}</span><span style={{ fontSize: 11, color: C.muted }}>{x.what}{x.weapon && rarity !== 'standard' ? ' · ' + rarity : ''}</span></span>
        <button type="button" style={{ ...btn, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined })}>Give</button>
        {(x.weapon || /armour|mod|off hand|shield|light|focus/.test(x.what)) && <button type="button" style={{ ...primary, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined, equip: true })}>Give + equip</button>}
      </div>)}
      {!hits.length && <span style={{ fontSize: 13, color: C.muted }}>Nothing matches.</span>}
    </div>
    <span style={{ fontSize: 12, color: C.muted }}>Weapons come with three magazines and loose rounds.</span>
  </Section>;
}

function MagicTab({ c }: { c: Character }) {
  const known = c.sigils || [], k: any = c.soulKnown || { schools: [], modules: [] };
  const [school, setSchool] = React.useState(SCHOOLS[0]?.id || ''), [mods, setMods] = React.useState<string[]>([]), [name, setName] = React.useState('');
  // Rules 1.5: a tone, a shape (one form module), a second school with its own option (a rider at half).
  const [tone, setTone] = React.useState('raw'), [shape, setShape] = React.useState(''), [school2, setSchool2] = React.useState(''), [opt, setOpt] = React.useState(''), [opt2, setOpt2] = React.useState('');
  const give = (item: string) => act({ type: 'sandbox/give', charId: c.id, item });
  const optsOf = (sc: string) => ((SCHOOL as any)[sc]?.options || []) as string[];
  const chip = (on: boolean, ink: string = C.soul): React.CSSProperties => ({ ...btn, minHeight: 26, fontSize: 11, padding: '0 6px', border: '1px solid ' + (on ? ink : C.line), color: on ? ink : C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 });
  const others = MODULES.filter((m) => !isShape(m.id));
  const draft: any = { id: '', name: name || (SCHOOL as any)[school]?.name + ' Outburst', school, modules: [...(shape ? [shape] : []), ...mods.filter((x) => x !== 'size' || shape)], ...(opt ? { option: opt } : {}), ...(school2 && school2 !== school ? { school2, ...(opt2 ? { option2: opt2 } : {}) } : {}), ...(tone !== 'raw' ? { tone } : {}) };
  const v = (() => { try { return designVerdict(magicOf(c) || null, draft); } catch { return null; } })();
  return <>
    <Section title="FOCI">
      <div style={row}>
        <button type="button" style={{ ...primary, background: C.white }} onClick={() => act({ type: 'sandbox/kit', charId: c.id, kind: 'both' })}>✦ Magic kit</button>
        {!hasEvoker(c) && <button type="button" style={btn} onClick={() => give('evoker')}>+ Evoker (Sigils)</button>}
        {!hasEmanator(c) && <button type="button" style={btn} onClick={() => give('emanator')}>+ Emanator (Outbursts)</button>}
        <button type="button" style={btn} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: 'standard_core', qty: 4 })}>+4 mana cores</button>
      </div>
    </Section>
    <Section title={'SIGIL WORDS (' + known.length + ' KNOWN; NO CAP HERE)'}>
      {/* One labelled row per Sigil 1.4 word group (Elements … Filter), the same rows as the combat glyph keyboard. */}
      <div role="group" aria-label="Sigil words" data-glyph-keyboard="1" style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {wordRows(SIGILS, (w) => w.id).map((r) => <div key={r.key} role="group" aria-label={r.label + ' words'} data-word-row={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span aria-hidden="true" style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#8BDEEE' }}>{r.label.toUpperCase()}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
            {r.items.map((w) => { const on = known.includes(w.id); return <button key={w.id} type="button" data-word={w.id} title={w.word + ' · ' + w.text} aria-pressed={on} onKeyDown={glyphKeyNav}
              style={{ ...btn, minHeight: 28, padding: '0 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid ' + (on ? C.mind : C.line), color: on ? C.mind : C.muted, background: on ? '#0F2A30' : 'transparent' }}
              onClick={() => act(on ? { type: 'sandbox/forget', charId: c.id, word: w.id } : { type: 'sandbox/learn', charId: c.id, word: w.id })}><img src={glyphUri(w.id, on ? SIGIL_INK : '#7F8BA1', { glow: on })} alt="" width={16} height={16} />{w.word}</button>; })}
          </div>
        </div>)}
      </div>
    </Section>
    <Section title="OUTBURST SCHOOLS, TONES AND MODULES">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {SCHOOLS.map((s) => <button key={s.id} type="button" title={s.text} disabled={k.schools.includes(s.id)} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (k.schools.includes(s.id) ? C.soul : C.line), color: k.schools.includes(s.id) ? C.soul : C.muted }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, school: s.id })}>{s.name}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {toneChips(k.tones || []).filter((t) => t.id !== 'raw').map((t) => <button key={t.id} type="button" title={t.text} disabled={t.known} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (t.known ? t.ink : C.line), color: t.known ? t.ink : C.muted }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, tone: t.id })}>{t.name} tone</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MODULES.map((m) => <button key={m.id} type="button" title={m.text} disabled={k.modules.includes(m.id)} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (k.modules.includes(m.id) ? C.soul : C.line), color: k.modules.includes(m.id) ? C.soul : C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, module: m.id })}>{isShape(m.id) && <img src={formIconUri(m.id)} alt="" width={14} height={14} />}{m.name}</button>)}
      </div>
    </Section>
    <Section title={'DESIGNS (' + (c.outbursts || []).length + ')'}>
      {(c.outbursts || []).map((d) => { const i = designInfo(magicOf(c) || null, d); return <div key={d.id} style={{ ...row, fontSize: 13 }}><img src={i.icon} alt="" width={20} height={20} /><span style={{ flex: 1 }}><b>{d.name}</b> <span style={{ color: i.ink }}>{i.line}</span> <span style={{ color: C.muted }}>{i.schools}</span></span>
        <button type="button" style={{ ...btn, minHeight: 28, color: C.muted }} aria-label={'Forget ' + d.name} onClick={() => act({ type: 'sandbox/forget', charId: c.id, designId: d.id })}>✕</button></div>; })}
      <div style={row}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Design name" style={{ ...field, flex: 1 }} />
        <select value={school} onChange={(e) => { setSchool(e.target.value); setOpt(''); }} aria-label="School" style={field}>{SCHOOLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      {optsOf(school).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Option">{optsOf(school).map((o) => { const val = optValue(o); return <button key={o} type="button" aria-pressed={opt === val} style={chip(opt === val)} onClick={() => setOpt(val)}>{OPT_LABEL[o] || o}</button>; })}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Second school">
        <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>SECOND SCHOOL</span>
        {[{ id: '', name: 'None' }, ...SCHOOLS.filter((s) => s.id !== school)].map((s) => <button key={s.id || 'none'} type="button" aria-pressed={school2 === s.id} style={chip(school2 === s.id)} onClick={() => { setSchool2(s.id); setOpt2(''); }}>{s.name}</button>)}
      </div>
      {school2 && optsOf(school2).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Second option">{optsOf(school2).map((o) => { const val = optValue(o); return <button key={o} type="button" aria-pressed={opt2 === val} style={chip(opt2 === val)} onClick={() => setOpt2(val)}>{OPT_LABEL[o] || o}</button>; })}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Tone">
        <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>TONE</span>
        {toneChips(k.tones || []).map((t) => <button key={t.id} type="button" aria-pressed={tone === t.id} style={chip(tone === t.id, t.ink)} onClick={() => setTone(t.id)}>{t.name}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Shape">
        <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>SHAPE</span>
        {['', ...SHAPE_MODULES].map((f) => <button key={f || 'bolt'} type="button" aria-pressed={shape === f} style={chip(shape === f)} onClick={() => setShape(f)}><img src={formIconUri(f || 'bolt', toneInk(tone))} alt="" width={14} height={14} />{f ? (MODULE as any)[f]?.name : 'Bolt'}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {others.map((m) => { const on = mods.includes(m.id), lock = m.id === 'size' && !shape; return <button key={m.id} type="button" aria-pressed={on} disabled={lock} title={lock ? 'Size needs a shape.' : m.text} style={{ ...chip(on), opacity: lock ? 0.4 : 1 }}
          onClick={() => setMods(on ? mods.filter((x) => x !== m.id) : [...mods, m.id].slice(-3))}>{m.name}</button>; })}
      </div>
      {v && <div style={{ fontSize: 12, lineHeight: 1.4 }}><div style={{ color: C.soul, fontWeight: 700 }}>{v.line}</div><div>{v.effects}</div><div style={{ color: C.muted }}>{v.rider}</div></div>}
      <button type="button" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => { act({ type: 'sandbox/design', charId: c.id, design: draft }); setName(''); setMods([]); }}>Add design</button>
      <span style={{ fontSize: 12, color: C.muted }}>The school, tone and modules are learned with the design. One shape, up to 4 modules, 8 designs.</span>
    </Section>
  </>;
}

// ---------- the field (host) ----------
/** While armed, a click on a free tile spawns there instead of reaching the screen. Tiles are the combat grid's and the
 *  story screen's map buttons (button.phc-tok), whose aria-label starts with the grid reference ("C7 · …"). */
let picking = false;
function useTilePick(armed: boolean, pick: (ref: string) => void) {
  const cb = React.useRef(pick); cb.current = pick;
  React.useEffect(() => {
    if (!armed) return;
    picking = true;
    const f = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('button.phc-tok') as HTMLElement | null; if (!el) return;
      const ref = (el.getAttribute('aria-label') || '').split(' · ')[0].trim(); if (!/^[A-Z]{1,2}\d{1,2}$/.test(ref)) return;
      e.preventDefault(); e.stopPropagation(); cb.current(ref);
    };
    window.addEventListener('click', f, true);
    document.body.style.cursor = 'crosshair';
    return () => { picking = false; window.removeEventListener('click', f, true); document.body.style.cursor = ''; };
  }, [armed]);
}
function FieldTab({ game, isHost }: { game: GameState; isHost: boolean }) {
  const sb = game.sandbox!, gearing = game.phase === 'story', cb = gearing ? null : game.combat;
  const [tier, setTier] = React.useState('minion'), [weapon, setWeapon] = React.useState(SANDBOX_TIERS.minion.weapons[0]), [armed, setArmed] = React.useState(false), [ref, setRef] = React.useState(''), [jump, setJump] = React.useState(sandboxNext(sb)), [caster, setCaster] = React.useState('');
  const spawn = (at: string) => act({ type: 'sandbox/spawn', tier, weapon, at, ...(caster ? { caster } : {}) } as any);
  useTilePick(armed, (r) => spawn(r));
  React.useEffect(() => { if (!armed) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setArmed(false); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [armed]);
  const mana = cb?.mana ?? game.story.mana ?? 15, band = MANA_BANDS.find((b) => mana >= b.min && mana <= b.max);
  const foes = gearing ? (game.story.npcs || []).filter((n) => n.side === 'hostile').length : (cb?.units || []).filter((u) => u.side === 'foe' && !u.dead).length;
  return <>
    <Section title={gearing ? 'SPAWN A DRILL UNIT ON THE MAP (IDLE UNTIL THE FIGHT)' : 'SPAWN AN ENEMY INTO THE FIGHT'}>
      <div style={row}>
        <select value={tier} onChange={(e) => { setTier(e.target.value); if (CASTER[caster] && CASTER[caster].tier !== e.target.value) setCaster(''); setWeapon(SANDBOX_TIERS[e.target.value]?.weapons[0] || weapon); }} aria-label="Enemy tier" style={field}>{ENEMIES.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.hp} HP</option>)}</select>
        <select value={weapon} onChange={(e) => setWeapon(e.target.value)} aria-label="Enemy weapon" style={{ ...field, flex: 1 }}>{WEAPONS.filter((w) => w.category !== 'thrown').map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      </div>
      <div style={row}>
        <select value={caster} onChange={(e) => { const c = CASTER[e.target.value]; setCaster(e.target.value); if (c) { setTier(c.tier); setWeapon(c.weapon); } }} aria-label="Sigil caster" style={{ ...field, flex: 1 }} title="A Sigil caster fights with an Evoker and its words (rules 1.4)">
          <option value="">No Sigils</option>{CASTERS.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.tier} · {c.sigils.map((w) => w.toUpperCase()).join(' ')}</option>)}
        </select>
      </div>
      <div style={row}>
        <button type="button" style={armed ? { ...primary, background: C.red, color: C.white } : primary} aria-pressed={armed} onClick={() => setArmed(!armed)}>{armed ? 'Click tiles on the map · stop' : 'Place by clicking the map'}</button>
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="or a tile: H6" aria-label="Tile" style={{ ...field, width: 90 }} />
        <button type="button" style={btn} disabled={!ref} onClick={() => spawn(ref)}>Spawn</button>
      </div>
      {armed && <span style={{ fontSize: 12, color: C.text }}>Each click on a free tile spawns one{gearing ? ' (open the Area map for the big grid)' : ''}. Esc or the button stops.</span>}
      <div style={row}><button type="button" style={btn} disabled={!foes} onClick={() => act({ type: 'sandbox/clear' })}>Clear all enemies ({foes})</button></div>
    </Section>
    <Section title="WAVES">
      {isHost && <div style={row}>
        <button type="button" aria-pressed={sb.ai} style={{ ...btn, border: '1px solid ' + (sb.ai ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/ai', on: !sb.ai })}>Enemy AI: {sb.ai ? 'ON' : 'OFF (they pass)'}</button>
        <button type="button" aria-pressed={sb.auto} style={{ ...btn, border: '1px solid ' + (sb.auto ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/auto', on: !sb.auto })} title="After a cleared wave the next one comes by itself, with no gearing up between">Endless waves: {sb.auto ? 'ON' : 'OFF'}</button>
      </div>}
      <div style={row}><span style={{ fontSize: 13 }}>Wave</span><Stepper name="wave" value={jump} min={1} max={99} set={setJump} />
        {gearing && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/stage', wave: jump })}>Place on the map</button>}
        <button type="button" style={btn} onClick={() => act({ type: 'sandbox/wave', wave: jump })}>Fight it now</button>
        {isHost && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/retry' })}>↻ Retry wave {sb.wave}</button>}</div>
      <span style={{ fontSize: 12, color: C.muted }}>Wave {jump}: {sandboxWave(jump, sandboxReady(game).of).map((f) => f.name).join(', ')}.</span>
    </Section>
    <Section title={'MANA METER · ' + mana + ' · ' + (band?.id || '').toUpperCase()}>
      <input type="range" min={0} max={40} value={mana} aria-label="Mana meter" onChange={(e) => act({ type: 'sandbox/mana', value: Number(e.target.value) })} />
      <span style={{ fontSize: 12, color: C.muted }}>{MANA_BANDS.map((b) => b.id + ' ' + b.min + '–' + b.max).join(' · ')}</span>
    </Section>
    {isHost && <button type="button" style={{ ...btn, alignSelf: 'flex-start', color: C.muted }} onClick={() => leaveProvingGround()}>Leave the Proving Ground</button>}
  </>;
}

// ---------- multiplayer: players, READY, teams, bringing a character, the invite, the team fight's end ----------
const TEAM_INK: Record<'A' | 'B', string> = { A: C.mind, B: C.body };
function ReadyButton({ on }: { on: boolean }) {
  return <button type="button" data-sfx="tab" aria-pressed={on} onClick={() => act({ type: 'sandbox/ready', on: !on })}
    style={{ ...btn, minHeight: 38, border: '1px solid ' + (on ? C.ok : C.white), color: on ? C.ok : C.white, background: on ? '#0F2A17' : 'transparent' }}>{on ? '✓ READY' : '○ READY?'}</button>;
}
/** A player with no fighter: a Recruit, or one of their characters (a copy). */
function NoFighter({ gearing }: { gearing: boolean }) {
  if (!gearing) return <span style={{ fontSize: 13, color: C.muted }}>You have no fighter in this fight. Get one when it ends.</span>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
    <span style={{ fontSize: 13, color: C.muted }}>You have no fighter here.</span>
    <div style={row}>
      <button type="button" style={primary} onClick={() => act({ type: 'sandbox/recruit' })}>+ A Recruit</button>
      <BringButton />
    </div>
  </div>;
}
/** Bring one of your saved characters or drafts (or a .phc.zip file): a copy fights here; the saved one never changes. */
function BringButton() {
  const [open, setOpen] = React.useState(false);
  const lib = getState().library;
  const send = (c: Sheet & { savedAt?: number; draft?: boolean }) => { const { savedAt, draft, ...sheet } = c as any; void savedAt; void draft; act({ type: 'sandbox/bring', sheet }); setOpen(false); };
  return <>
    <button type="button" style={btn} aria-expanded={open} onClick={() => setOpen(!open)}>Bring a character…</button>
    {open && <div role="group" aria-label="Your characters" style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxHeight: 220, overflowY: 'auto', padding: 8, borderRadius: 10, border: '1px solid ' + C.line, background: C.ground }}>
      {lib.map((c) => <button key={c.name + c.savedAt} type="button" style={{ ...btn, justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }} onClick={() => send(c)}>
        {c.portrait ? <img src={c.portrait} alt="" style={{ width: 24, height: 30, objectFit: 'cover', borderRadius: 4 }} /> : null}<span style={{ flex: 1 }}>{c.name}</span><span style={{ fontSize: 11, color: C.muted }}>{(c as any).draft ? 'DRAFT' : c.origin}</span></button>)}
      {!lib.length && <span style={{ fontSize: 12, color: C.muted }}>No saved characters in this browser.</span>}
      <button type="button" style={small} onClick={() => importCharacter().then((c) => { if (c) send(c); })}>Open a .phc.zip file…</button>
      <span style={{ fontSize: 11, color: C.muted }}>A copy fights here: nothing done in the Proving Ground changes your saved character.</span>
    </div>}
  </>;
}
/** Everyone in the Proving Ground: colour, name, fighter, READY, best wave (or wins), team; the host's room settings. */
function Players({ game, meId, isHost }: { game: GameState; meId: string; isHost: boolean }) {
  const sb = game.sandbox!, teams = sb.mode === 'teams', gearing = game.phase === 'story', r = sandboxReady(game);
  const mine = Object.values(game.characters).some((c) => c.owner === meId), my = sandboxTeam(sb, meId);
  return <Section title={'PLAYERS · ' + game.players.length + ' / 4'} aria="Players">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {game.players.map((p) => {
        const fs = Object.values(game.characters).filter((c) => c.owner === p.id), ready = !!sb.ready?.[p.id], t = sandboxTeam(sb, p.id);
        return <div key={p.id} data-player={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: C.ground, border: '1px solid ' + C.line, borderLeft: '4px solid ' + p.color, fontSize: 13 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flex: 'none', opacity: p.online ? 1 : 0.4 }} />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700 }}>{p.name}{p.id === meId ? ' (you)' : ''}{p.id === game.hostId ? ' · host' : ''}{p.online ? '' : ' · offline'}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{fs.length ? fs.map((c) => c.name).join(', ') : 'no fighter yet'} · {teams ? (sb.wins?.[p.id] || 0) + ' win' + ((sb.wins?.[p.id] || 0) === 1 ? '' : 's') : 'best wave ' + (sb.bestBy?.[p.id] || 0)}</span>
          </span>
          {teams && <span aria-label={'Team ' + t} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', border: '1px solid ' + TEAM_INK[t], color: TEAM_INK[t] }}>{t === 'A' ? '◆' : '■'} TEAM {t}</span>}
          {fs.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: ready ? C.ok : C.muted }}>{ready ? '✓ READY' : '○ NOT READY'}</span>}
          {isHost && p.id !== meId && <button type="button" style={{ ...small, minHeight: 24, color: C.muted }} aria-label={'Remove ' + p.name} title="Remove from the Proving Ground" onClick={() => { if (typeof confirm !== 'function' || confirm('Remove ' + p.name + ' from the Proving Ground?')) act({ type: 'player/kick', id: p.id }); }}>✕</button>}
        </div>;
      })}
    </div>
    <div style={row}>
      {mine && gearing && <ReadyButton on={!!sb.ready?.[meId]} />}
      <span style={{ fontSize: 12, color: C.muted }}>{r.ready} / {r.of} ready</span>
      {teams && gearing && mine && (['A', 'B'] as const).map((t) => <button key={t} type="button" aria-pressed={my === t} onClick={() => act({ type: 'sandbox/team', team: t })}
        style={{ ...small, border: '1px solid ' + (my === t ? TEAM_INK[t] : C.line), color: my === t ? TEAM_INK[t] : C.muted }}>{t === 'A' ? '◆' : '■'} Team {t}</button>)}
    </div>
    <div style={row}>
      {gearing && mine && <BringButton />}
      {game.players.length < 4 && <button type="button" style={small} onClick={openInvite}>+ Invite friends</button>}
    </div>
    {isHost && <div role="group" aria-label="Room settings" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
      <span style={label}>ROOM SETTINGS (HOST)</span>
      <div style={row}><span style={{ fontSize: 13 }}>Mode</span>
        {([['coop', 'Co-op waves'], ['teams', 'Team fight']] as const).map(([m, name]) => <button key={m} type="button" disabled={!gearing} aria-pressed={(sb.mode || 'coop') === m} onClick={() => act({ type: 'sandbox/settings', mode: m })}
          style={{ ...small, border: '1px solid ' + ((sb.mode || 'coop') === m ? C.text : C.line), color: (sb.mode || 'coop') === m ? C.text : C.muted }}>{(sb.mode || 'coop') === m ? '● ' : '○ '}{name}</button>)}
      </div>
      <div style={row}>
        <button type="button" aria-pressed={!!sb.spawnAll} onClick={() => act({ type: 'sandbox/settings', spawnAll: !sb.spawnAll })} style={{ ...small, border: '1px solid ' + (sb.spawnAll ? C.text : C.line) }}>Everyone can spawn: {sb.spawnAll ? 'ON' : 'OFF'}</button>
        <button type="button" aria-pressed={sb.guestRetry !== false} onClick={() => act({ type: 'sandbox/settings', guestRetry: sb.guestRetry === false })} style={{ ...small, border: '1px solid ' + (sb.guestRetry !== false ? C.text : C.line) }}>Guests can retry: {sb.guestRetry !== false ? 'ON' : 'OFF'}</button>
      </div>
    </div>}
  </Section>;
}
/** The room code, big, with a copy button and the shareable link (as a room shares its own). */
function InviteCard({ game }: { game: GameState }) {
  const [copied, setCopied] = React.useState<string | null>(null), link = inviteLink(game.code);
  const copy = (what: string, text: string) => navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(null), 2000); }, () => toast(what === 'link' ? 'Invite link: ' + link : 'Room code: ' + game.code, true));
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') closeInvite(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return <div role="dialog" aria-modal="true" aria-label="Invite friends" className="phc-a-fade" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(5, 7, 11, 0.8)' }} onClick={(e) => { if (e.target === e.currentTarget) closeInvite(); }}>
    <div className="phc-a-pop" style={{ width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 16, background: C.panel, border: '1px solid ' + C.line, borderTop: '4px solid ' + C.white, fontFamily: UI, color: C.text }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: C.muted }}>THE PROVING GROUND · WITH FRIENDS</span>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600 }}>Share the room code</span>
      <span aria-label={'Room code ' + game.code} style={{ fontSize: 'clamp(40px, 10vw, 64px)', fontWeight: 700, letterSpacing: '0.24em', textAlign: 'center', padding: '8px 0', borderRadius: 12, background: C.ground, border: '1px solid ' + C.line }}>{game.code}</span>
      <div style={row}>
        <button type="button" style={{ ...primary, minHeight: 44, flex: 1 }} onClick={() => copy('code', game.code)}>{copied === 'code' ? 'Copied ✓' : 'Copy the code'}</button>
        <button type="button" style={{ ...btn, minHeight: 44, flex: 1 }} onClick={() => copy('link', link)}>{copied === 'link' ? 'Copied ✓' : 'Copy invite link'}</button>
      </div>
      <span style={{ fontSize: 12, color: C.muted, wordBreak: 'break-all' }}>{link}</span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: '#C9D3E3' }}>Friends press JOIN A FRIEND on the title and type the code (or open the link). Each gets a Recruit, or brings one of their own characters. Up to 4 players. {game.players.length} here now.</span>
      <button type="button" data-sfx="slide" style={{ ...btn, alignSelf: 'flex-start' }} onClick={closeInvite}>Gear up ›</button>
    </div>
  </div>;
}
/** A team fight is over: who won, from this player's side; back to gearing up (everyone is at full HP already). */
function TeamEnd({ game, meId, isHost }: { game: GameState; meId: string; isHost: boolean }) {
  const sb = game.sandbox!, won = sb.lastWin, mine = sandboxTeam(sb, meId), inIt = Object.values(game.characters).some((c) => c.owner === meId);
  const p = usePresence(won ? won + '|' + (sb.fights || 0) : null);
  if (!p.shown || !won) return null;
  const us = inIt && won === mine;
  return <div role="dialog" aria-modal="true" aria-label={'Team ' + won + ' wins'} className={presenceCls('phc-a-fade', p.closing)} style={{ position: 'fixed', inset: 0, zIndex: 48, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(5, 7, 11, 0.82)' }}>
    <div className={presenceCls('phc-a-pop', p.closing)} style={{ width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 16, background: C.panel, border: '1px solid ' + C.line, borderTop: '4px solid ' + (us ? C.ok : inIt ? C.red : TEAM_INK[won]), fontFamily: UI, color: C.text }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: us ? C.ok : inIt ? C.red : TEAM_INK[won] }}>{us ? '✓ YOUR TEAM WINS' : inIt ? '✕ YOUR TEAM IS DOWN' : 'TEAM FIGHT OVER'}</span>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 30, fontWeight: 600 }}>{won === 'A' ? '◆' : '■'} Team {won} wins</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: '#C9D3E3' }}>Everyone is back up with full HP. Swap teams or gear on the Squad and Gear tabs, then go again.</span>
      <div style={row}>
        <button type="button" data-sfx="slide" style={{ ...primary, minHeight: 46, flex: 1 }} onClick={() => go('main')}>Gear up ›</button>
        {isHost && <button type="button" data-sfx="start" style={{ ...btn, minHeight: 46 }} onClick={() => act({ type: 'sandbox/fight' })}>Fight again now</button>}
      </div>
    </div>
  </div>;
}

/** For the room: whether the Proving Ground can open, and why not. */
export function provingGroundWhy(g: GameState | null, isHost: boolean): string | null {
  if (!g) return 'Connecting…';
  if (!isHost) return 'The host opens the Proving Ground.';
  if (g.phase !== 'lobby') return 'In session.';
  return null;
}
