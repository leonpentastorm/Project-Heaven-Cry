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
//  · Gearing up on the story screen, the WHOLE centre column is the tools (Leon, 9 Nov 2026: "make the WHOLE middle
//    section the spawn screen"): the Practice card, the fight bar, a search across every tool, the tabs and their
//    sections as collapsible cards in as many columns as fit (portaled into main.template.html's data-phc-sb-centre;
//    the story column is hidden meanwhile and comes back with Close the tools). The hint, the wave lines and the last
//    engine notes sit in the bottom panel (data-phc-sb-dock). In a fight the same tools are the floating drawer.
//  · Tools: Gear (what is worn and carried, equip and unequip, give anything, the magic kit), Squad (level,
//    class and rank, skills, perks, traits, armour, refill), Magic (words, schools, modules, designs), Field (host: spawn enemies on a
//    clicked tile, clear them, enemy AI, endless waves, place or fight any wave, the mana meter, leave).
import React from 'react';
import { createPortal } from 'react-dom';
import { designInfo, designVerdict, toneChips, toneInk, formIconUri, isShape, SHAPE_MODULES } from './heartView';
import { moduleGroups, feelingInk, feelingIconSrc } from './feelingsView';
import { OPT_LABEL, optValue } from './actionPickers';
import { Groups, GroupList, GroupSearch, sigilWordGroups, isOpen, setOpen as setGroupOpen, useOpenTick } from './workshopGroups';
import { markUri, starUri } from './glyphs';
import { glyphUri, SIGIL_INK } from './glyphs';
import { glyphKeyNav } from './glyphKeys';
import { askConfirm } from './dialog';
import {
  magicOf, FEELINGS, practiceOf, nextPickAt, type GameState, type Character, type Rarity, type Sheet, sandboxReady, sandboxTeam, WEAPONS, WEAPON, ITEM, CLASSES, CLASS, ATTR, SIGILS, SCHOOLS, SCHOOL, MODULES, MODULE, SKILLS, SKILL,
  ENEMIES, MANA_BANDS, SANDBOX_TIERS, sigilGrowthView, MARK, markTn, WORD_MASTERY, TONE, PERKS, PERK, TRAITS, ARCHETYPES, packOf, classRank, maxHp, RARITY, sandboxNext, sandboxWave, refOf, carriesEvoker, carriesEmanator, focusHand, MAGIC_KIT, CASTERS, CASTER, REST_INFO,
} from '@engine';
import { act, hostRoom, getState, go, leaveRoom, forgetSession, poke, toast } from './store';
import { FAITH_PATRONS, FAITH_PATRON, VOWS, beliefOf, devotionNow, devotionXpOf, devotionWords, GATE, moduleShelved } from '@engine';
import { patronMarkUri, vowIconUri, FAITH_INK } from './faithArt';
import { importCharacter } from './charfile';
import { fxBusyUntil } from './fx/FxLayer';
import { sfx, reducedMotion } from './sfx';
import { usePresence, presenceCls } from './presence';
import { emblemOf } from './classView';
import { WORLD_KIND_IDS, avatarChoices, SUCCESSES, FAILS, type ApproachForm, blankNpc, npcAction, blankCache, cacheAction, blankPile, pileAction, pileChoices, isAmmoId, blankHazard, hazardAction, blankTrigger, triggerAction, blankObjective, objectiveAction } from './sandboxWorld';
import { HAZARD_KINDS, HAZARD, TN_LADDER, CONDITION_IDS, condName } from '@engine';
const ITEMS = Object.values(ITEM);
import { ART, zoneOf } from '../screens/shared';

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
    if (ask) { askConfirm({ title: 'Leave the Proving Ground?', body: 'Your fighter goes with you.', confirm: 'Leave' }).then((ok) => ok && leaveProvingGround(false)); return; }
    act({ type: 'sandbox/leave' });
    setTimeout(() => leaveRoom(), 250); // let the action reach the host first
    return;
  }
  const standalone = !!sb?.standalone, others = (st.game?.players?.length || 1) > 1;
  if (ask) { askConfirm({ title: 'Leave the Proving Ground?', body: standalone ? (others ? 'It closes for everyone.' : 'Back to the title screen.') : 'The room goes back to how it was before.', confirm: 'Leave' }).then((ok) => ok && leaveProvingGround(false)); return; }
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
html.phc-sb-centre-on .phc-sb-centre,.phc-sb-centre[data-sb-on]{display:flex!important;flex:1;min-height:0;overflow-y:auto;flex-direction:column}
html.phc-sb-centre-on main[aria-label="Story"]>.phc-story,main[aria-label="Story"]>.phc-story[data-sb-off]{display:none!important}
html.phc-sb-gearing .phc-sb-dock,.phc-sb-dock[data-sb-on]{display:flex!important;flex-direction:column;gap:6px}
.phc-input>.phc-sb-dock[data-sb-on]:has([data-sb-hint])~.phc-turn-line{display:none}
.phc-pg-fig{display:grid;margin:0;border-radius:14px;overflow:hidden}
.phc-pg-fig>*{grid-area:1/1}
.phc-pg-fig>figcaption{align-self:end;position:relative}
@media (max-height:800px){.phc-pg-fig>.phc-pg-grid{display:none}.phc-pg-fig>figcaption{padding:12px 18px!important}.phc-pg-centre{gap:12px!important;padding-top:16px!important}}
.phc-pg-cols{column-width:330px;column-gap:14px}
.phc-pg-cols>*{break-inside:avoid;margin:0 0 14px}
.phc-pg-cols>.phc-pg-span{column-span:all}
.phc-pg-head:hover{color:#FFFFFF!important}
.phc-pg-group:not(:has([data-pg-hit])){display:none}
.phc-pg-results .phc-pg-none{display:none}
.phc-pg-results:not(:has([data-pg-hit])) .phc-pg-none{display:block}
.phc-pg-head:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}
@media (max-width:999px){html.phc-sb-centre-on .phc-sb-centre,.phc-sb-centre[data-sb-on]{overflow:visible}}
`;
function useCss() { React.useEffect(() => { if (document.getElementById('phc-sandbox-css')) return; const s = document.createElement('style'); s.id = 'phc-sandbox-css'; s.textContent = CSS; document.head.appendChild(s); }, []); }

type Tab = 'gear' | 'squad' | 'magic' | 'faith' | 'field' | 'world';
/** The drill unit on a tile of the area map, while gearing up. */
const foeAt = (game: GameState, ref: string) => (game.story.npcs || []).find((n) => n.side === 'hostile' && refOf(n.pos) === ref) || null;

export function SandboxPanel({ game, meId, isHost, screen }: { game: GameState | null; meId: string; isHost: boolean; screen: string }) {
  useCss();
  const sb = game?.sandbox, gearing = !!sb && game!.phase === 'story', fighting = !!sb && game!.phase === 'combat';
  const here = !!sb && (screen === 'combat' || screen === 'main');
  const [open, setOpen] = React.useState(true);
  // The tab and the character picked stay when the tools move between the centre (gearing up) and the drawer (a fight).
  const [tab, setTab] = React.useState<Tab>('gear'), [cid, setCid] = React.useState('');
  // Gearing up on the story screen, the tools are the whole centre column (open), not a drawer.
  const centreOn = gearing && screen === 'main' && open;
  React.useEffect(() => { document.documentElement.classList.toggle('phc-sb-centre-on', centreOn); return () => document.documentElement.classList.remove('phc-sb-centre-on'); }, [centreOn]);
  // The same state on the nodes themselves: the screen change copies the old screen into a shadow root, where the
  // <html> classes above can't reach, so the copy (a fight starting) would otherwise show the story log for a moment.
  const docked = gearing && screen === 'main';
  React.useLayoutEffect(() => {
    const story = document.querySelector('main[aria-label="Story"]>.phc-story'), centre = document.querySelector('[data-phc-sb-centre]'), dock = document.querySelector('[data-phc-sb-dock]');
    if (centreOn) { story?.setAttribute('data-sb-off', '1'); centre?.setAttribute('data-sb-on', '1'); }
    if (docked) dock?.setAttribute('data-sb-on', '1');
    return () => { story?.removeAttribute('data-sb-off'); centre?.removeAttribute('data-sb-on'); dock?.removeAttribute('data-sb-on'); };
  });
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
  const drawer = usePresence(here && open && !centreOn ? true : null);
  const shared = { tab, setTab, cid, setCid };
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
    {drawer.shown && game?.sandbox && <Drawer game={game} meId={meId} isHost={isHost} screen={screen} closing={drawer.closing} close={() => { setOpen(false); sfx('slide_back'); }} {...shared} />}
    {centreOn && <Portal at="[data-phc-sb-centre]"><CentreView game={game!} meId={meId} isHost={isHost} close={() => { setOpen(false); sfx('slide_back'); }} {...shared} /></Portal>}
    {gearing && screen === 'main' && <Portal at="[data-phc-sb-dock]"><Dock game={game!} isHost={isHost} /></Portal>}
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
type Shared = { tab: Tab; setTab: (t: Tab) => void; cid: string; setCid: (id: string) => void };
/** Render children into a node of the screen's template (found again after every render: the template remounts it). */
function Portal({ at, children }: { at: string; children: React.ReactNode }) {
  const [host, setHost] = React.useState<Element | null>(null);
  React.useLayoutEffect(() => { const el = document.querySelector(at); if (el !== host) setHost(el); });
  return host && host.isConnected ? createPortal(children, host) : null;
}
/** The tabs, the character picker and the chosen tab's tools: the same in the centre (wide) and in the drawer. */
function ToolBody({ game, meId, isHost, tab, setTab, cid, setCid, wide }: { game: GameState; meId: string; isHost: boolean; wide: boolean } & Shared) {
  const sb = game.sandbox!;
  const chars = Object.values(game.characters).filter((c) => isHost || c.owner === meId);
  const c = game.characters[cid] && chars.some((x) => x.id === cid) ? game.characters[cid] : chars[0];
  const field = isHost || !!sb.spawnAll;
  const tabs: [Tab, string][] = [['gear', 'Gear'], ['squad', 'Squad'], ['magic', 'Magic'], ['faith', 'Faith'], ...(field ? [['field', 'Field'] as [Tab, string], ['world', 'World'] as [Tab, string]] : [])];
  const t = tabs.some(([id]) => id === tab) ? tab : 'gear';
  // In the centre the tabs and the character share one row (the tools need the height).
  return <div style={wide ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px' } : { display: 'contents' }}>
    <nav role="tablist" aria-label="Tools" style={{ display: 'flex', gap: 4, padding: wide ? 0 : '8px 12px', borderBottom: wide ? 0 : '1px solid ' + C.line, flexWrap: 'wrap' }}>
      {tabs.map(([id, name]) => <button key={id} type="button" role="tab" aria-selected={t === id} onClick={() => { setTab(id); sfx('tab'); }}
        style={{ ...btn, flex: wide ? '0 1 auto' : 1, minWidth: wide ? 72 : 0, minHeight: wide ? 38 : 34, border: '1px solid ' + (t === id ? C.text : C.line), background: t === id ? C.raised : 'transparent', color: t === id ? C.text : C.muted }}>{name}</button>)}
    </nav>
    {t !== 'field' && t !== 'world' && <CharRow game={game} meId={meId} isHost={isHost} cid={cid} setCid={setCid} style={{ padding: wide ? '0 0 0 16px' : '10px 16px 0', ...(wide ? { borderLeft: '1px solid ' + C.line } : {}) }} />}
    <WideCtx.Provider value={{ wide, q: '', tab: t }}>
      <div key={t} className={'phc-fade-in' + (wide ? ' phc-pg-cols' : '')} style={wide ? { flex: '1 1 100%', minWidth: 0 } : { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TabTools game={game} meId={meId} isHost={isHost} tab={t} c={c} field={field} />
      </div>
    </WideCtx.Provider>
  </div>;
}
/** The character the tools work on (the host's or this player's own), or, with none, a Recruit or Bring. ToolBody shows it
 *  above the Gear, Squad, Magic and Faith tools, and the centre's search shows it above the results too. */
function CharRow({ game, meId, isHost, cid, setCid, style }: { game: GameState; meId: string; isHost: boolean; cid: string; setCid: (id: string) => void; style?: React.CSSProperties }) {
  const chars = Object.values(game.characters).filter((c) => isHost || c.owner === meId);
  const c = game.characters[cid] && chars.some((x) => x.id === cid) ? game.characters[cid] : chars[0];
  return <div role="group" aria-label="Character" style={{ ...row, ...style }}>
    {chars.length ? chars.map((x) => <button key={x.id} type="button" aria-pressed={x.id === c?.id} onClick={() => setCid(x.id)} style={{ ...btn, border: '1px solid ' + (x.id === c?.id ? C.text : C.line), background: x.id === c?.id ? C.raised : 'transparent' }}>{x.name}</button>)
      : <NoFighter gearing={game.phase === 'story'} />}
  </div>;
}
/** One tab's tools for one character. */
function TabTools({ game, meId, isHost, tab, c, field }: { game: GameState; meId: string; isHost: boolean; tab: Tab; c: Character | undefined; field: boolean }) {
  return <>
    {tab === 'squad' && <Players game={game} meId={meId} isHost={isHost} />}
    {tab === 'gear' && c && <GearTab c={c} />}
    {tab === 'squad' && c && <SquadTab game={game} c={c} isHost={isHost} />}
    {tab === 'magic' && c && <MagicTab c={c} game={game} canField={field} />}
    {tab === 'faith' && c && <FaithTab game={game} c={c} />}
    {tab === 'field' && field && <FieldTab game={game} isHost={isHost} />}
    {tab === 'world' && field && <WorldTab game={game} />}
  </>;
}
function Drawer({ game, meId, isHost, screen, closing, close, ...shared }: { game: GameState; meId: string; isHost: boolean; screen: string; closing: boolean; close: () => void } & Shared) {
  const sb = game.sandbox!, gearing = game.phase === 'story';
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) close(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  // The drawer starts under the screen's header, so the shell's room cluster (Save, ⚙, ⚑, Leave) stays in reach in a fight.
  const [top, setTop] = React.useState(0);
  React.useLayoutEffect(() => {
    const h = document.querySelector('header.phc-cb-head, header.phc-head') as HTMLElement | null;
    if (!h) { setTop(0); return; }
    const m = () => setTop(Math.max(0, Math.round(h.getBoundingClientRect().bottom)));
    m(); window.addEventListener('resize', m);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(m) : null; ro?.observe(h);
    return () => { window.removeEventListener('resize', m); ro?.disconnect(); };
  }, [screen]);
  const status = gearing ? (sb.state === 'cleared' ? 'wave ' + sb.wave + ' cleared · gearing up' : sb.state === 'fallen' ? 'fell on wave ' + sb.wave + ' · gearing up' : 'gearing up') : 'fighting';
  return <aside aria-label="Proving Ground tools" className={presenceCls('phc-a-right', closing) + ' phc-sb-drawer' + (screen === 'main' ? ' phc-sb-onmain' : '')}
    style={{ position: 'fixed', top, bottom: 0, zIndex: 47, width: 'min(400px, 94vw)', display: 'flex', flexDirection: 'column', background: C.panel, borderLeft: '1px solid ' + C.line, borderRight: screen === 'main' ? '1px solid ' + C.line : 0, boxShadow: '-12px 0 40px rgba(0,0,0,.55)', fontFamily: UI, color: C.text }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid ' + C.line }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={label}>THE PROVING GROUND · {game.players.length} PLAYER{game.players.length === 1 ? '' : 'S'}{sb.mode === 'teams' ? ' · TEAM FIGHT' : ''}</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Wave {gearing ? sandboxNext(sb) : sb.wave} <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>· best {sb.best} · {status}</span></span>
      </div>
      <button type="button" style={{ ...btn, color: C.muted }} onClick={() => leaveProvingGround()} title={!isHost ? 'Leave the Proving Ground: your fighter goes, you go to the title' : sb.standalone ? 'Close the Proving Ground for everyone' : 'Back to the room, as it was before'}>Leave</button>
      <button type="button" style={btn} onClick={close} aria-label="Close the tools" title="Hide the tools (the tab on the right brings them back)">✕</button>
    </header>
    <FightBar game={game} isHost={isHost} meId={meId} wide={false} />
    <ToolBody game={game} meId={meId} isHost={isHost} wide={false} {...shared} />
  </aside>;
}

/** Gearing up: the whole centre column is the tools (the story column comes back with Close the tools). */
function CentreView({ game, meId, isHost, close, ...shared }: { game: GameState; meId: string; isHost: boolean; close: () => void } & Shared) {
  const sb = game.sandbox!, [q, setQ] = React.useState('');
  const chars = Object.values(game.characters).filter((c) => isHost || c.owner === meId);
  const c = game.characters[shared.cid] && chars.some((x) => x.id === shared.cid) ? game.characters[shared.cid] : chars[0];
  const canField = isHost || !!sb.spawnAll, status = sb.state === 'cleared' ? 'wave ' + sb.wave + ' cleared' : sb.state === 'fallen' ? 'fell on wave ' + sb.wave : 'gearing up';
  const banner = ART(zoneOf(game)?.art?.banner);
  const all: [Tab, string][] = [['gear', 'Gear'], ['squad', 'Squad'], ['magic', 'Magic'], ['faith', 'Faith'], ...(canField ? [['field', 'Field'] as [Tab, string], ['world', 'World'] as [Tab, string]] : [])];
  return <aside aria-label="Proving Ground tools" className="phc-fade-in phc-pg-centre" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 32px 32px', width: '100%', maxWidth: 1240, boxSizing: 'border-box', margin: '0 auto', fontFamily: UI, color: C.text }}>
    {/* The Practice card, as the story column had it (kept by Leon's brief). */}
    <figure className="phc-pg-fig" style={{ position: 'relative', border: '1px solid ' + C.line }}>
      {/* The zone's banner (Leon's drill-yard painting, data/campaigns/proving.json art.banner); the grid when there is none. */}
      {banner ? <><div aria-hidden="true" className="phc-pg-grid" style={{ minHeight: 230 }} />
        <img className="phc-pg-grid" data-phc-pg-banner="" src={banner} alt="The Proving Ground: the drill yard" style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', background: '#0D1119' }} /></>
        : <div aria-hidden="true" className="phc-pg-grid" style={{ minHeight: 96, backgroundColor: '#0D1119', backgroundImage: 'linear-gradient(#161D2B 1px, transparent 1px), linear-gradient(90deg, #161D2B 1px, transparent 1px)', backgroundSize: '24px 24px' }} />}
      <figcaption style={{ padding: '16px 22px', background: 'rgba(10, 13, 19, 0.82)', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 260px', minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: '0.24em', color: C.muted }}>THE PROVING GROUND · {game.players.length} PLAYER{game.players.length === 1 ? '' : 'S'}{sb.mode === 'teams' ? ' · TEAM FIGHT' : ''}</span>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(22px, 2.1vw, 30px)', fontWeight: 600, lineHeight: 1.15 }}>Practice fights · no Narrator</span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>WAVE {sandboxNext(sb)} <span style={{ color: C.muted, fontWeight: 600 }}>· best {sb.best} · {status}</span></span>
          <span style={row}>
            <button type="button" style={{ ...btn, color: C.muted }} onClick={() => leaveProvingGround()} title={!isHost ? 'Leave the Proving Ground: your fighter goes, you go to the title' : sb.standalone ? 'Close the Proving Ground for everyone' : 'Back to the room, as it was before'}>Leave</button>
            <button type="button" style={btn} onClick={close} aria-label="Close the tools and show the story log" title="Close the tools and show the story log (the tab on the right brings the tools back)">Story log ›</button>
          </span>
        </span>
      </figcaption>
    </figure>
    <FightBar game={game} isHost={isHost} meId={meId} wide />
    <div role="search" style={{ ...row, flexWrap: 'nowrap' }}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} aria-label="Search the tools"
        placeholder="Search every tool: a weapon, a perk, spawn, waves, mana…" style={{ ...field, flex: 1, minHeight: 40, fontSize: 14 }} />
      {q && <button type="button" style={btn} onClick={() => setQ('')}>Clear</button>}
    </div>
    {/* The search results sit above the tools, which stay mounted (hidden) under a search: an armed spawn or place, the
        Give picker and the Sigil fields keep their state while you look something up. The character row comes too, so a
        player with no fighter can still Recruit or Bring one, and the host can change whose tools the results are. */}
    {q && <div className="phc-pg-results" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <CharRow game={game} meId={meId} isHost={isHost} cid={shared.cid} setCid={shared.setCid} />
      {all.map(([id, name]) => <div key={id} className="phc-pg-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ ...label, color: C.text }}>{name.toUpperCase()}{id !== 'field' && id !== 'world' && c ? ' · ' + c.name.toUpperCase() : ''}</span>
        <WideCtx.Provider value={{ wide: true, q, tab: id }}><div className="phc-pg-cols"><TabTools game={game} meId={meId} isHost={isHost} tab={id} c={c} field={canField} /></div></WideCtx.Provider>
      </div>)}
      <span className="phc-pg-none" style={{ fontSize: 13, color: C.muted }}>Nothing matches "{q}". Try a weapon or item name, a tab (Gear, Squad, Magic, Faith, Field, World) or a word like spawn, perk, wave, mana.</span>
    </div>}
    <div data-pg-tools="" style={{ display: q ? 'none' : 'contents' }}><ToolBody game={game} meId={meId} isHost={isHost} wide {...shared} /></div>
  </aside>;
}

/** The fight, on top of the tools: start it (gearing up), or stop it (host, fighting). */
function FightBar({ game, isHost, meId, wide }: { game: GameState; isHost: boolean; meId: string; wide: boolean }) {
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
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: wide ? 0 : '12px 16px', borderBottom: wide ? 0 : '1px solid ' + C.line }}>
    {!wide && <WaveLines game={game} />}
    {!wide && hint && <HintNote hide={hide} />}
    {multi && <div style={row}>
      {mine && <ReadyButton on={meReady} />}
      <span aria-label="Ready count" style={{ fontSize: 13, fontWeight: 700, color: r.ready === r.of && r.of ? C.ok : C.muted }}>{r.ready === r.of && r.of ? '✓ ' : '○ '}{r.ready} / {r.of} ready</span>
    </div>}
    {/* In the centre the wave buttons sit beside Start (the tools need the height); in the drawer, under it. */}
    <div style={wide ? { ...row, flexWrap: 'wrap', alignItems: 'stretch' } : { display: 'contents' }}>
    <button type="button" data-sfx="start" disabled={!canStart} title={canStart ? '' : 'The host starts the fight (or anyone, once everyone is ready)'} style={{ ...primary, minHeight: 48, fontSize: 15, ...(wide ? { flex: '1 1 320px' } : {}), background: canStart ? C.white : C.raised, color: canStart ? C.ground : C.muted, cursor: canStart ? 'pointer' : 'default' }} onClick={() => act({ type: 'sandbox/fight' })}>
      ⚔ {canStart ? (teams ? 'Start the team fight' : 'Start the fight') : 'Waiting for the host'} · {teams ? 'Team A vs Team B' : onMap ? onMap + ' on the map' : 'wave ' + n}{multi ? ' · ' + r.ready + ' / ' + r.of + ' ready' : ''}
    </button>
    {teams ? (!wide && <TeamLine />) : <div style={wide ? { ...row, flex: '0 1 auto' } : row}>
      {!onMap && !wide && <EmptyLine game={game} />}
      {(isHost || sb.spawnAll) && <button type="button" style={small} onClick={() => act({ type: 'sandbox/stage', wave: n })}>{onMap ? 'Reset to wave ' + n : 'Place wave ' + n + ' on the map'}</button>}
      {(isHost || (sb.state === 'fallen' && sb.guestRetry !== false)) && sb.wave > 1 && <button type="button" style={small} onClick={() => act({ type: 'sandbox/retry', restart: true })}>Restart from wave 1</button>}
    </div>}
    </div>
  </div>;
}

// ---------- the messages (the drawer shows them under the fight bar; gearing up, they are in the bottom panel) ----------
function WaveLines({ game }: { game: GameState }) {
  const sb = game.sandbox!, n = sandboxNext(sb);
  return <>
    {sb.state === 'cleared' && <span style={{ fontSize: 13, fontWeight: 700, color: C.ok }}>✓ Wave {sb.wave} cleared. Next: wave {n}.</span>}
    {sb.state === 'fallen' && <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>✕ The squad fell on wave {sb.wave}. Everyone is back up and refilled.</span>}
  </>;
}
const HintNote = ({ hide, compact }: { hide: () => void; compact?: boolean }) => <div role="note" data-sb-hint="1" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: compact ? '6px 10px' : '10px 12px', borderRadius: 10, border: '1px solid ' + C.white, background: '#0D1119' }}>
  <span style={{ flex: 1, fontSize: compact ? 12 : 13, lineHeight: 1.4 }}><b>Gear up here, then click the map to start a fight.</b> <span style={{ color: '#C9D3E3' }}>Click a drill unit on the map, attack one from the Area map, or press Start the fight. Gear is the first tab; the Magic kit gives you everything to cast at once.</span></span>
  <button type="button" style={{ ...small, minHeight: 26 }} aria-label="Hide the hint" onClick={hide}>✕</button>
</div>;
const TeamLine = () => <span style={{ fontSize: 12, color: C.muted }}>Team fight: no drill units. Pick a team on the Squad tab. Team A starts on the left, Team B on the right; Downed is out; the last team standing wins.</span>;
function EmptyLine({ game }: { game: GameState }) {
  const sb = game.sandbox!, n = sandboxNext(sb), party = Math.max(1, sandboxReady(game).of), k = sandboxWave(n, party).length;
  return <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>The map is empty: wave {n} ({k} drill unit{k === 1 ? '' : 's'}) comes in when the fight starts.</span>;
}
/** The bottom panel while gearing up (Leon: "the message popups move to the bottom panel"): the wave's outcome, the
 *  first-time hint, what the map holds, and the engine's last notes (the story column they used to fill is the tools now). */
function Dock({ game, isHost }: { game: GameState; isHost: boolean }) {
  const sb = game.sandbox!, teams = sb.mode === 'teams', onMap = (game.story.npcs || []).filter((x) => x.side === 'hostile').length;
  const [hint, setHint] = React.useState(() => { try { return localStorage.getItem(HINT) !== '1'; } catch { return true; } });
  const hide = () => { setHint(false); try { localStorage.setItem(HINT, '1'); } catch { /* */ } };
  const notes = (game.story.entries || []).filter((e: any) => e.kind === 'system' && typeof e.text === 'string' && e.text.startsWith('⚙') && !e.text.startsWith('⚙ The Proving Ground.')).slice(-2);
  void isHost;
  return <div role="region" aria-label="Proving Ground messages" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: UI }}>
    <WaveLines game={game} />
    {hint && <HintNote hide={hide} compact />}
    {teams ? <TeamLine /> : !onMap && <EmptyLine game={game} />}
    {notes.length > 0 && <div role="log" aria-label="Last tool changes" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      {notes.map((e: any) => <span key={e.id} title={e.text} style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.text}</span>)}
    </div>}
  </div>;
}

// ---------- sections: plain in the drawer; collapsible, searchable cards in the centre ----------
/** wide: the centre column (cards in columns); q: the tool search (a section that doesn't match hides); tab: whose. */
const WideCtx = React.createContext<{ wide: boolean; q: string; tab: string }>({ wide: false, q: '', tab: '' });
const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (q: string, hay: string) => { const h = hay.toLowerCase(); return words(q).every((w) => h.includes(w)); };
const cardKey = (title: string, aria?: string) => (aria || title.replace(/\s*[(·…].*$/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** What a card holds that its title doesn't say, for the tool search: every perk, trait, skill, class, patron, word,
 *  school, module, feeling and enemy by name (only weapons and items were found before, through Give). */
const names = (xs: readonly any[], f: (x: any) => string = (x) => x.name) => xs.map(f).join(' ');
const FIND = {
  cls: 'class rank ' + names(CLASSES), skills: 'skill points max mastered ' + names(SKILLS), perks: 'perk perks tier ' + names(PERKS), traits: 'trait traits ' + names(TRAITS),
  belief: 'belief faithful atheist patron god ' + names(FAITH_PATRONS), sigils: 'sigil words glyphs learn forget subject reach delivery burst filter ' + names(SIGILS, (w) => w.word),
  soul: 'outbursts outburst lessons schools tones modules feelings practice sound effects test soul ' + names(SCHOOLS) + ' ' + names(MODULES) + ' ' + names(FEELINGS),
  spawn: 'spawn enemy enemies foe drill unit caster ' + names(ENEMIES) + ' ' + names(CASTERS),
};
const cardStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 12, background: C.panel, border: '1px solid ' + C.line, minWidth: 0 };
/** The head of a card: its title and a ▾/▸ to fold it (open state per browser, workshopGroups.tsx). */
function CardHead({ title, open, toggle, ink, fixed }: { title: string; open: boolean; toggle: () => void; ink?: string; fixed?: boolean }) {
  // fixed: a search shows every matching card open, so the head can't fold it (a fold there would only be stored, unseen).
  if (fixed) return <span className="phc-pg-head" data-pg-head="1" style={{ ...label, display: 'flex', fontFamily: UI, color: ink || C.muted }}>{title}</span>;
  return <button type="button" className="phc-pg-head" data-pg-head="1" aria-expanded={open} onClick={toggle}
    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: UI, color: ink || C.muted }}>
    <span style={{ ...label, color: 'inherit', flex: 1 }}>{title}</span><span aria-hidden="true" style={{ fontSize: 12 }}>{open ? '▾' : '▸'}</span>
  </button>;
}
const Section = ({ title, children, aria, keys, span }: { title: string; children: React.ReactNode; aria?: string; keys?: string; span?: boolean }) => {
  const w = React.useContext(WideCtx); useOpenTick();
  if (!w.wide) return <section aria-label={aria} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={label}>{title}</span>{children}</section>;
  if (w.q && !matches(w.q, title + ' ' + (aria || '') + ' ' + (keys || '') + ' ' + w.tab)) return null;
  const key = cardKey(title, aria), open = !!w.q || isOpen('pg.' + w.tab, key);
  return <section aria-label={aria} data-pg-card={key} data-pg-hit={w.q ? '1' : undefined} className={span ? 'phc-pg-span' : undefined} style={cardStyle}>
    <CardHead title={title} open={open} fixed={!!w.q} toggle={() => setGroupOpen('pg.' + w.tab, key, !open)} />
    {open && children}
  </section>;
};
/** Something that isn't a Section (a workshop group, a note) as a card in the centre; as it is in the drawer. */
function Box({ keys, children, span, inner }: { keys: string; children: React.ReactNode; span?: boolean; inner?: Record<string, string> }) {
  const w = React.useContext(WideCtx);
  if (!w.wide) return <>{children}</>;
  if (w.q && !matches(w.q, keys + ' ' + w.tab)) return null;
  // Under a search its workshop groups open on what the search names (a word, a module, a feeling), not as stored.
  // inner: what a group holds that its items don't name (the Outbursts groups draw their lists themselves).
  const find = w.q ? (g: any) => matches(w.q, g.label + ' ' + (inner?.[g.key] || '') + ' ' + g.items.map((x: any) => x?.name || x?.word || '').join(' ')) : null;
  return <div data-pg-hit={w.q ? '1' : undefined} className={span ? 'phc-pg-span' : undefined} style={{ ...cardStyle, padding: 12 }}><GroupSearch.Provider value={find}>{children}</GroupSearch.Provider></div>;
}
/** What the Outbursts groups hold, by group key (for the search). */
const SOUL_INNER = { schools: 'school tone ' + names(SCHOOLS), modules: 'module ' + names(MODULES), feelings: 'feeling ' + names(FEELINGS) };
const Stepper = ({ value, min, max, set, name }: { value: number; min: number; max: number; set: (n: number) => void; name: string }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Lower ' + name} disabled={value <= min} onClick={() => set(value - 1)}>‹</button>
  <span style={{ minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: 700 }}>{value}</span>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Raise ' + name} disabled={value >= max} onClick={() => set(value + 1)}>›</button>
</span>;

/** The Proving Ground's class menu (Class Roster Revision 3): the nine base classes, one per attribute; advanced
 *  classes are shelved, so none is offered. */
export const sandboxClassOptions = () => CLASSES.map((k) => ({ id: k.id, label: k.name + ' · ' + (ATTR[k.attribute]?.name || k.attribute) }));
/** The line under the class menu: the rank rule (II at the class's attribute 5, III at 8). */
export function sandboxClassHelp(c: Pick<Character, 'classId'>): string {
  const an = c.classId ? ATTR[CLASS[c.classId]?.attribute]?.name : null;
  return (an ? 'Rank reads ' + an + ' and your level: rank II at ' + an + ' 5 and level 6, rank III at 8 and level 12; picking II or III raises both that far.'
    : 'One class per attribute. Rank reads the class\'s attribute and your level: rank II at 5 and level 6, rank III at 8 and level 12.') + ' Advanced classes are being rebuilt.';
}

function SquadTab({ game, c, isHost }: { game: GameState; c: Character; isHost: boolean }) {
  const u = game.phase === 'combat' ? game.combat?.units.find((x) => x.charId === c.id) : undefined;
  const [skill, setSkill] = React.useState(SKILLS[0].id);
  const [perk, setPerk] = React.useState(PERKS[0].id);
  const [trait, setTrait] = React.useState(TRAITS[0].id);
  // A tool search that names a skill, perk or trait picks it in its menu (the card it finds is ready to use).
  const q = React.useContext(WideCtx).q;
  React.useEffect(() => {
    if (!q) return;
    const s = SKILLS.find((x) => matches(q, x.name)), p = PERKS.find((x) => matches(q, x.name)), t = (TRAITS as any[]).find((x) => matches(q, x.name));
    if (s) setSkill(s.id); if (p) setPerk(p.id); if (t) setTrait(t.id);
  }, [q]);
  const clsVal = c.classId || '';
  return <>
    <Section title="FIGHTER" aria="Fighter" keys="refill hp ap ammo">
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {c.portrait ? <img src={c.portrait} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8, background: '#000' }} /> : <span style={{ width: 56, height: 70, borderRadius: 8, background: C.raised, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{c.name.slice(0, 2).toUpperCase()}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
        <span style={{ color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Level {c.level} · {c.classId && <img className="phc-class-emblem" src={emblemOf(c.classId).icon} alt="" style={{ width: 16, height: 16 }} />}{c.classId ? CLASS[c.classId]?.name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] : 'Classless'}</span>
        {u ? <span><span style={{ color: C.red }}>HP {u.hp}/{u.maxHp}</span> · AP {u.ap} · {WEAPON[u.weapon]?.name}{WEAPON[u.weapon]?.magazine != null ? ' ' + u.ammo + '/' + WEAPON[u.weapon].magazine : ''}{u.mg?.emanator ? <span style={{ color: C.mp }}> · MP {Math.round(u.mg.mp)}</span> : null}</span>
          : <span><span style={{ color: C.red }}>HP {c.hp}/{maxHp(c)}</span> · {WEAPON[c.weapon]?.name}{WEAPON[c.weapon]?.magazine != null ? ' ' + (c.loaded ?? 0) + '/' + WEAPON[c.weapon].magazine : ''}</span>}
      </div>
    </div>
    <div style={row}>
      <button type="button" style={primary} onClick={() => act({ type: 'sandbox/refill', charId: c.id })}>Refill {c.name.split(' ')[0]}</button>
      {isHost && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/refill' })}>Refill everyone</button>}
    </div>
    <span style={{ fontSize: 12, color: C.muted }}>HP, AP (on its turn), every magazine, stims, MP, the Evoker's charge and cores, a mended weapon; no injuries.</span>
    </Section>
    {isHost && <Section title="REST (THE ENGINE'S RULES, FOR EVERYONE)" aria="Rest">
      <div style={row}>{(['short', 'long'] as const).map((k) => <button key={k} type="button" data-sb-rest={k} disabled={game.phase !== 'story'} title={game.phase !== 'story' ? 'No resting in a fight: stop the fight (or clear the wave) first.' : REST_INFO[k]}
        style={{ ...btn, opacity: game.phase !== 'story' ? 0.5 : 1 }} onClick={() => act({ type: 'rest', kind: k })}>Rest ({k})</button>)}</div>
      <span style={{ fontSize: 12, color: C.muted }}>{game.phase !== 'story' ? 'No resting in a fight: stop the fight (or clear the wave) first.' : 'Short: ' + REST_INFO.short + '. Long: ' + REST_INFO.long + '.'}</span>
    </Section>}
    <Section title="LEVEL (HP RECOMPUTED, FULL)"><Stepper name="level" value={c.level} min={1} max={20} set={(n) => act({ type: 'sandbox/level', charId: c.id, level: n })} /><span style={{ fontSize: 12, color: C.muted }}>{maxHp(c)} HP at this level. Unspent points from levels go to Level up.</span></Section>
    <Section title="CLASS" keys={FIND.cls}>
      <select value={clsVal} style={field} aria-label="Class" onChange={(e) => { const v = e.target.value; act({ type: 'sandbox/class', charId: c.id, classId: v || null, rank: 1 }); }}>
        <option value="">Classless</option>
        {/* Class Roster Revision 3: the nine base classes, one per attribute; advanced classes are shelved (being rebuilt). */}
        {sandboxClassOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {c.classId && <div style={row}><span style={{ fontSize: 13, color: C.muted }}>Rank</span>{[1, 2, 3].map((r) => <button key={r} type="button" aria-pressed={classRank(c) === r} style={{ ...btn, border: '1px solid ' + (classRank(c) === r ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/class', charId: c.id, classId: c.classId, rank: r })}>{['', 'I', 'II', 'III'][r]}</button>)}</div>}
      <span style={{ fontSize: 12, color: C.muted }}>{sandboxClassHelp(c)}</span>
    </Section>
    <Section title="SKILL POINTS (ATTRIBUTE AND CORE FOLLOW)" keys={FIND.skills}>
      <div style={row}>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ ...field, flex: 1 }} aria-label="Skill">{SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name} ({c.skills[s.id] || 0})</option>)}</select>
        <Stepper name={SKILL[skill]?.name || 'skill'} value={c.skills[skill] || 0} min={0} max={10} set={(n) => act({ type: 'sandbox/skill', charId: c.id, skill, points: n })} />
        <button type="button" data-sb-skill-max={skill} disabled={(c.skills[skill] || 0) >= 10} title="This skill to 10 (Mastered)" style={{ ...btn, opacity: (c.skills[skill] || 0) >= 10 ? 0.5 : 1 }} onClick={() => act({ type: 'sandbox/skill', charId: c.id, skill, points: 10 })}>Max</button>
      </div>
      <div style={row}>
        <button type="button" data-sb-skills="max" title="Every skill to 10 (Mastered); attributes and cores follow, the Mastered perks come" style={{ ...btn, border: '1px solid ' + C.text }} onClick={() => act({ type: 'sandbox/skills', charId: c.id, points: 10 })}>Max every skill</button>
        <button type="button" data-sb-skills="zero" title="Every skill back to 0 (attributes and cores stay)" style={btn} onClick={() => act({ type: 'sandbox/skills', charId: c.id, points: 0 })}>All to 0</button>
      </div>
      {/* Every skill on one list, each with its own Max (the quick way to build a test character). */}
      <div role="list" aria-label="Every skill" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 4 }}>
        {SKILLS.map((s) => { const v = c.skills[s.id] || 0, full = v >= 10;
          return <div key={s.id} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', borderRadius: 6, border: '1px solid ' + C.line }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.name}>{s.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: full ? '#6FEA77' : C.muted, minWidth: 18, textAlign: 'right' }}>{v}</span>
            <button type="button" data-sb-skill-max={s.id} disabled={full} aria-label={'Max ' + s.name} title={full ? s.name + ' is Mastered' : s.name + ' to 10 (Mastered)'} style={{ ...btn, minHeight: 24, padding: '0 6px', fontSize: 11, opacity: full ? 0.4 : 1 }} onClick={() => act({ type: 'sandbox/skill', charId: c.id, skill: s.id, points: 10 })}>{full ? '✓' : 'Max'}</button>
          </div>; })}
      </div>
    </Section>
    <Section title="PERKS (ANY TIER, NO POINTS NEEDED)" keys={FIND.perks}>
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
    <Section title="TRAITS (NO LIMIT OF 2 HERE)" keys={FIND.traits}>
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
/** Where a focus is (spec: Hands 2, item 630: it counts only in a hand). */
function focusNow(c: Character, k: 'evoker' | 'emanator'): string {
  const at = focusHand(c, k), n = k === 'evoker' ? 'Evoker' : 'Emanator';
  return at === 'main' || at === 'off' ? '✓ ' + n + ' (' + at + ' hand)' : at === 'pack' ? n + ' in the pack: not in hand' : 'no ' + n;
}
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
        {' '}Now: {focusNow(c, 'evoker')} · {focusNow(c, 'emanator')} · {(c.sigils || []).length} words · {(c.outbursts || []).length} designs.
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
  const w = React.useContext(WideCtx);
  const [q, setQ] = React.useState(''), [rarity, setRarity] = React.useState<Rarity>('standard');
  // The tool search finds weapons and items too: this list takes it when its own box is empty.
  const s = (q || w.q).trim().toLowerCase();
  const list = React.useMemo(() => [
    ...WEAPONS.map((w) => ({ id: w.id, name: w.name, what: w.category.replace(/_/g, ' '), weapon: true })),
    ...Object.values(ITEM).map((it: any) => ({ id: it.id, name: it.name, what: (it.category || 'item') + (it.slot ? ' · ' + it.slot.replace(/_/g, ' ') : ''), weapon: false })),
  ], []);
  const hits = list.filter((x) => !s || matches(s, x.name + ' ' + x.what + ' ' + x.id.replace(/_/g, ' '))).slice(0, w.wide ? 120 : 60);
  if (w.wide && w.q && !hits.length && !matches(w.q, 'give any weapon or item gear')) return null;
  return <Section title="GIVE… (ANY WEAPON OR ITEM)" aria="Give" keys={w.q && hits.length ? w.q : ''} span={w.wide}>
    <div style={row}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search weapons and items…" aria-label="Search weapons and items" style={{ ...field, flex: 1 }} />
      <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)} aria-label="Weapon rarity" style={field}>{RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
    </div>
    <div style={w.wide ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 6, maxHeight: 420, overflowY: 'auto', alignContent: 'start' } : { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
      {hits.map((x) => <div key={(x.weapon ? 'w:' : 'i:') + x.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: C.ground, border: '1px solid ' + C.line, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{x.name}</span><span style={{ fontSize: 11, color: C.muted }}>{x.what}{x.weapon && rarity !== 'standard' ? ' · ' + rarity : ''}</span></span>
        <button type="button" style={{ ...btn, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined })}>Give</button>
        {(x.weapon || /armour|mod|off hand|shield|light|focus/.test(x.what)) && <button type="button" style={{ ...primary, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined, equip: true })}>Give + equip</button>}
      </div>)}
      {!hits.length && <span style={{ fontSize: 13, color: C.muted }}>Nothing matches.</span>}
    </div>
    <span style={{ fontSize: 12, color: C.muted }}>Weapons come with three magazines and loose rounds.</span>
  </Section>;
}

/** The Proving Ground's faith tools (rules 1.6; the engine's sandbox/faith): belief and patron, Faith, Devotion, an
 *  Atheist's pieces, the vow (in a fight), and a reset of the once-a-session limits (Miracle, rites, cooldowns). */
function FaithTab({ game, c }: { game: GameState; c: Character }) {
  const b = beliefOf(c), own = b.kind === 'faithful' ? b.patron : null, dv = devotionNow(c), faith = c.skills.faith || 0;
  const F = (x: any) => act({ type: 'sandbox/faith', charId: c.id, ...x });
  const pieces: Record<string, number> = { ...((c as any).faithPieces || {}) };
  const cb: any = game.combat && !game.combat.over ? game.combat : null, u = cb?.units.find((x: any) => x.charId === c.id);
  const allies = u ? cb.units.filter((x: any) => x.side === u.side && x !== u && !x.dead) : [];
  const vow: any = (u && u.vow) || (c as any).vow || null;
  const [shield, setShield] = React.useState(false);
  const on = (yes: boolean, ink = C.text): React.CSSProperties => ({ ...small, border: '1px solid ' + (yes ? ink : C.line), background: yes ? C.raised : 'transparent', color: yes ? C.text : C.muted });
  return <>
    <Section title={'BELIEF · ' + (own ? 'FAITHFUL · ' + (FAITH_PATRON[own]?.name || own).toUpperCase() : 'ATHEIST · PILGRIM')} aria="Belief" keys={FIND.belief}>
      <div style={row} role="radiogroup" aria-label="Belief">
        <button type="button" role="radio" aria-checked={b.kind === 'faithful'} data-sb-belief="faithful" style={on(b.kind === 'faithful', FAITH_INK)} onClick={() => F({ belief: 'faithful' })}>Faithful</button>
        <button type="button" role="radio" aria-checked={b.kind === 'atheist'} data-sb-belief="atheist" style={on(b.kind === 'atheist', FAITH_INK)} onClick={() => F({ belief: 'atheist' })}>Atheist</button>
      </div>
      <div style={row} role="radiogroup" aria-label="Patron">{FAITH_PATRONS.map((p: any) => <button key={p.id} type="button" role="radio" aria-checked={own === p.id} data-sb-patron={p.id} title={p.archetype || p.name}
        style={{ ...on(own === p.id, FAITH_INK), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => F({ patron: p.id })}><img src={patronMarkUri(p.id)} alt="" style={{ width: 16, height: 16 }} />{p.name}</button>)}</div>
    </Section>
    <Section title="FAITH (THE SKILL)" aria="Faith skill">
      <div style={row}><Stepper name="Faith" value={faith} min={0} max={10} set={(n) => F({ faith: n })} /><span style={{ fontSize: 12, color: C.muted }}>Prayer at 3 · Witnessed at 5 · Miracle at 7 (and Devotion {GATE.miracle}).</span></div>
    </Section>
    {own && <Section title={devotionWords(devotionXpOf(c)).toUpperCase()} aria="Devotion">
      <div style={row}><Stepper name="Devotion" value={dv} min={0} max={10} set={(n) => F({ devotion: n })} />
        {[GATE[1], GATE[2], GATE[3]].map((n, i) => <button key={n} type="button" style={on(dv === n, FAITH_INK)} onClick={() => F({ devotion: n })}>{'Hymn ' + ['I', 'II', 'III'][i] + ' · ' + n}</button>)}
        <button key="miracle" type="button" data-sb-faith-miracle style={on(dv === GATE.miracle, FAITH_INK)} onClick={() => F({ devotion: GATE.miracle })}>{'Miracle · ' + GATE.miracle}</button></div>
      <span style={{ fontSize: 12, color: C.muted }}>Sets the level (Devotion XP to its threshold, rules 1.6.1).</span>
    </Section>}
    {!own && <Section title="KNOWLEDGE PIECES (AN ATHEIST'S HYMNS, BY DICE)" aria="Pieces">
      {FAITH_PATRONS.map((p: any) => <div key={p.id} style={{ ...row, justifyContent: 'space-between' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><img src={patronMarkUri(p.id)} alt="" style={{ width: 16, height: 16 }} />{p.name}</span>
        <Stepper name={p.name + ' pieces'} value={pieces[p.id] || 0} min={0} max={3} set={(n) => F({ pieces: { ...pieces, [p.id]: n } })} /></div>)}
    </Section>}
    <Section title={'VOW · ' + (vow ? vow.id.replace(/_/g, ' ').toUpperCase() + ' · ' + String(vow.state).toUpperCase() : 'NONE')} aria="Vow">
      {!u && <span style={{ fontSize: 12, color: C.muted }}>Vows are sworn in a fight: start one to set it here.</span>}
      {u && <div style={row}>{VOWS.map((v: any) => <button key={v.id} type="button" data-sb-vow={v.id} title={v.words + ' Broken when: ' + v.broken_when} style={{ ...on(!!vow && vow.id === v.id, FAITH_INK), display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={() => (v.needs_ally ? setShield(!shield) : F({ vow: v.id }))}><img src={vowIconUri(v.id)} alt="" style={{ width: 16, height: 16 }} />{v.name}</button>)}
        <button type="button" style={small} onClick={() => F({ vow: null })}>No vow</button></div>}
      {u && shield && <div style={row}><span style={{ fontSize: 12, color: C.text }}>Shield whom?</span>{allies.length ? allies.map((a: any) => <button key={a.id} type="button" style={small} onClick={() => { F({ vow: 'shield', allyId: a.id }); setShield(false); }}>{a.name}</button>) : <span style={{ fontSize: 12, color: C.muted }}>✕ No ally in this fight.</span>}</div>}
    </Section>
    <Section title="RESET" aria="Faith reset">
      <div style={row}><button type="button" data-sb-faith-reset style={btn} onClick={() => F({ reset: true })}>Reset the limits</button><span style={{ fontSize: 12, color: C.muted }}>The Miracle, the rites and the prayer cooldowns, as at a new session.</span></div>
    </Section>
  </>;
}

/** Where a character's unit stands now (the fight's, else the area map's), for the effects test row. */
function playerUnitPos(charId: string): string | null {
  const g: any = getState().game; const u = g?.combat?.units?.find((x: any) => x.charId === charId); return u ? u.pos : g?.story?.positions?.[charId] || null;
}
/** Play one feeling's pump, release or residue look and sound on the spot (rules 1.8 section 11.5), no fight needed. */
function testFeelingFx(feeling: string, family: string, what: 'pump' | 'release' | 'residue', at: string | null) {
  const fx = (window as any).__phcFx; if (!fx || !at) return;
  const [x, y] = at.split(',').map(Number), to = (x + 2) + ',' + y;
  if (what === 'pump') fx.playFx({ k: 'pump', at, stage: 3, mult: 1.8, feeling, family, step: 0.4, does: null, tone: 'raw' });
  else if (what === 'release') fx.playFx({ k: 'release', at, to, form: 'bolt', tone: 'raw', stage: 3, mult: 1.8, felt: [feeling], area: [to], targets: [] });
  else fx.playFx({ k: 'residue', tiles: [to, (x + 2) + ',' + (y + 1), (x + 3) + ',' + y], feeling, family, kind: 'harms', rounds: 2 });
}
function MagicTab({ c, game, canField }: { c: Character; game: GameState; canField: boolean }) {
  const known = c.sigils || [], k: any = c.soulKnown || { schools: [], modules: [] };
  const [school, setSchool] = React.useState(SCHOOLS[0]?.id || ''), [mods, setMods] = React.useState<string[]>([]), [name, setName] = React.useState('');
  // Rules 1.5: a tone, a shape (one form module), a second school with its own option (a rider at half).
  const [tone, setTone] = React.useState('raw'), [shape, setShape] = React.useState(''), [school2, setSchool2] = React.useState(''), [opt, setOpt] = React.useState(''), [opt2, setOpt2] = React.useState('');
  const give = (item: string) => act({ type: 'sandbox/give', charId: c.id, item });
  const optsOf = (sc: string) => ((SCHOOL as any)[sc]?.options || []) as string[];
  const chip = (on: boolean, ink: string = C.soul): React.CSSProperties => ({ ...btn, minHeight: 26, fontSize: 11, padding: '0 6px', border: '1px solid ' + (on ? ink : C.line), color: on ? ink : C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 });
  const others = MODULES.filter((m) => !isShape(m.id));
  const kb = (on: boolean, ink: string = C.soul): React.CSSProperties => ({ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (on ? ink : C.line), color: on ? ink : C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 });
  const draft: any = { id: '', name: name || (SCHOOL as any)[school]?.name + ' Outburst', school, modules: [...(shape ? [shape] : []), ...mods.filter((x) => x !== 'size' || shape)], ...(opt ? { option: opt } : {}), ...(school2 && school2 !== school ? { school2, ...(opt2 ? { option2: opt2 } : {}) } : {}), ...(tone !== 'raw' ? { tone } : {}) };
  const v = (() => { try { return designVerdict(magicOf(c) || null, draft); } catch { return null; } })();
  return <>
    <Section title="FOCI">
      <div style={row}>
        <button type="button" style={{ ...primary, background: C.white }} onClick={() => act({ type: 'sandbox/kit', charId: c.id, kind: 'both' })}>✦ Magic kit</button>
        {!carriesEvoker(c) && <button type="button" style={btn} onClick={() => give('evoker')}>+ Evoker (Sigils)</button>}
        {!carriesEmanator(c) && <button type="button" style={btn} onClick={() => give('emanator')}>+ Emanator (Outbursts)</button>}
        <button type="button" style={btn} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: 'standard_core', qty: 4 })}>+4 mana cores</button>
      </div>
    </Section>
    {/* The five Sigil word groups, collapsible (the same component and open state model as the Magic tab). */}
    <Box keys={FIND.sigils}><div data-glyph-keyboard="1" style={{ minWidth: 0 }}><Groups section="sb.sigil" title={'SIGIL WORDS (' + known.length + ' KNOWN; NO CAP HERE)'} ink={C.mind} aria="Sigil words"
      groups={sigilWordGroups(SIGILS, (w) => w.id)} render={(items, g) => <div data-word-row={g.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
        {items.map((w) => { const on = known.includes(w.id); return <button key={w.id} type="button" data-word={w.id} title={w.word + ' · ' + w.text} aria-pressed={on} onKeyDown={glyphKeyNav}
          style={{ ...btn, minHeight: 28, padding: '0 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid ' + (on ? C.mind : C.line), color: on ? C.mind : C.muted, background: on ? '#0F2A30' : 'transparent' }}
          onClick={() => act(on ? { type: 'sandbox/forget', charId: c.id, word: w.id } : { type: 'sandbox/learn', charId: c.id, word: w.id })}><img src={glyphUri(w.id, on ? SIGIL_INK : '#7F8BA1', { glow: on })} alt="" width={16} height={16} />{w.word}</button>; })}
      </div>} /></div></Box>
    <SigilTools c={c} game={game} canField={canField} />
    {/* Rules 1.8 (Outburst 4.0): schools, tones, modules grouped by gate skill (the advanced classes' shown, learnable here:
        no gates in the Proving Ground), feelings (grant or forget), practice, and a sound and effects test row for every
        feeling; in the shared workshop groups (workshopGroups.tsx), like the Sigil words above. */}
    <Box keys={FIND.soul} inner={SOUL_INNER}><Groups<{ key: string }> section="sb.soul" title="OUTBURSTS: SCHOOLS, TONES, MODULES, FEELINGS" ink={C.soul} aria="Outburst lessons"
      groups={[
        { key: 'schools', label: 'Schools and tones', n: SCHOOLS.length + toneChips(k.tones || []).filter((t) => t.id !== 'raw').length, items: [{ key: 'schools' }] },
        { key: 'modules', label: 'Modules by gate skill', count: k.modules.length + ' KNOWN', dflt: false, items: [{ key: 'modules' }] },
        { key: 'feelings', label: 'Feelings', count: (c.feelings || []).length + ' / ' + FEELINGS.length + ' FELT', dflt: false, items: [{ key: 'feelings' }] },
        { key: 'practice', label: 'Practice', count: practiceOf(c) + '; NEXT PICK AT ' + nextPickAt(practiceOf(c)), dflt: false, items: [{ key: 'practice' }] },
        { key: 'fx', label: 'Feelings: sound and effects test', n: FEELINGS.length, dflt: false, items: [{ key: 'fx' }] },
      ]}
      render={(_, g) => g.key === 'schools' ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {SCHOOLS.map((s) => <button key={s.id} type="button" title={s.text} disabled={k.schools.includes(s.id)} style={kb(k.schools.includes(s.id))} onClick={() => act({ type: 'sandbox/learn', charId: c.id, school: s.id })}>{s.name}</button>)}
          {toneChips(k.tones || []).filter((t) => t.id !== 'raw').map((t) => <button key={t.id} type="button" title={t.text} disabled={t.known} style={kb(t.known, t.ink)} onClick={() => act({ type: 'sandbox/learn', charId: c.id, tone: t.id })}>{t.name}</button>)}
        </div>
        : g.key === 'modules' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Each gate skill its own collapsible, remembered group, as on the sheet ('magic.soul.modules'). */}
          <GroupList section="sb.soul.modules" ink="#C9D3E3" groups={moduleGroups(c).map((gr) => ({ key: gr.key, label: gr.label + ' · ' + gr.blurb, items: gr.modules, count: gr.modules.filter((x) => x.known).length + ' / ' + gr.modules.length, dflt: false }))}
            render={(ms, gr) => <div role="group" aria-label={gr.label + ' modules'} data-module-group={gr.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ms.map((m) => <button key={m.id} type="button" data-module={m.id} title={m.name + ': ' + m.text + (m.locked ? (m.ok ? ' (normally only with ' + (m.cls || 'its class') + ')' : ' · locked: ' + m.why) : m.gate ? ' (normally ' + m.gate + ')' : '')} disabled={m.known || (m.locked && !m.ok)} data-locked={m.locked && !m.ok ? 'true' : undefined} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (m.known ? C.soul : m.locked ? '#5B4A2A' : C.line), color: m.known ? C.soul : C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, module: m.id })}><img src={m.icon} alt="" width={16} height={16} />{m.name}{m.locked ? ' 🔒' : ''}</button>)}
          </div>} />
        </div>
        : g.key === 'feelings' ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <button type="button" style={{ ...btn, minHeight: 28, fontSize: 12 }} onClick={() => FEELINGS.forEach((f) => { if (!(c.feelings || []).includes(f.id)) act({ type: 'sandbox/learn', charId: c.id, feeling: f.id }); })}>Feel them all</button>
          {FEELINGS.map((f) => { const on = (c.feelings || []).includes(f.id), ink = feelingInk(f.id); return <button key={f.id} type="button" data-feeling={f.id} aria-pressed={on} title={f.name + ': ' + f.pour.text + ' · ' + f.trigger.text}
            style={{ ...btn, minHeight: 28, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid ' + (on ? ink : C.line), color: on ? ink : C.muted }}
            onClick={() => act({ type: 'sandbox/learn', charId: c.id, feeling: f.id, ...(on ? { forget: true } : {}) })}><img src={feelingIconSrc(f.id, on ? ink : '#7F8BA1')} alt="" width={16} height={16} />{f.name}</button>; })}
        </div>
        : g.key === 'practice' ? <div style={row}>
          {[5, 15, -5].map((n) => <button key={n} type="button" style={{ ...btn, minHeight: 28, fontSize: 12 }} onClick={() => act({ type: 'sandbox/practice', charId: c.id, n })}>{n > 0 ? '+' + n : n} practice</button>)}
        </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {FEELINGS.map((f) => { const ink = feelingInk(f.id), me = playerUnitPos(c.id); return <div key={f.id} data-fx-test={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <img src={feelingIconSrc(f.id, ink)} alt="" width={18} height={18} /><span style={{ width: 90, color: ink, fontWeight: 700 }}>{f.name}</span>
            {(['pump', 'release', 'residue'] as const).map((w) => <button key={w} type="button" style={{ ...btn, minHeight: 26, fontSize: 11, padding: '0 8px' }} onClick={() => testFeelingFx(f.id, f.family, w, me)}>{w}</button>)}
          </div>; })}
        </div>} /></Box>
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
        {others.map((m) => { const on = mods.includes(m.id), shelved = moduleShelved(m.id), lock = (m.id === 'size' && !shape) || !!shelved; return <button key={m.id} type="button" aria-pressed={on} disabled={lock} data-locked={shelved ? '1' : undefined} title={shelved || (lock ? 'Size needs a shape.' : m.text)} style={{ ...chip(on), opacity: lock ? 0.4 : 1 }}
          onClick={() => setMods(on ? mods.filter((x) => x !== m.id) : [...mods, m.id].slice(-3))}>{m.name}</button>; })}
      </div>
      {v && <div style={{ fontSize: 12, lineHeight: 1.4 }}><div style={{ color: C.soul, fontWeight: 700 }}>{v.line}</div><div>{v.effects}</div><div style={{ color: C.muted }}>{v.rider}</div></div>}
      <button type="button" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => { act({ type: 'sandbox/design', charId: c.id, design: draft }); setName(''); setMods([]); }}>Add design</button>
      <span style={{ fontSize: 12, color: C.muted }}>The school, tone and modules are learned with the design. One shape, up to 4 modules, 8 designs.</span>
    </Section>
  </>;
}

/** Rules 1.10 testing tools: grant study, set a word's use count, place a sigil mark (host, while gearing up), and
 * Junctions for everyone here (host). The engine checks everything (sandbox/study, word-uses, mark, junctions). */
function SigilTools({ c, game, canField }: { c: Character; game: GameState; canField: boolean }) {
  const gv = sigilGrowthView(c), known = (c.sigils || []).filter((w) => (SIGILS as any[]).some((x) => x.id === w));
  const [word, setWord] = React.useState(known[0] || ''), [uses, setUses] = React.useState('10'), [study, setStudy] = React.useState('8');
  const [mw, setMw] = React.useState('seek'), [age, setAge] = React.useState(MARK.age), [dmg, setDmg] = React.useState(MARK.damage), [at, setAt] = React.useState(''), [arm, setArm] = React.useState(false);
  const gearing = game.phase === 'story', isHost = getState().role === 'host', jOn = !!game.sandbox?.junctions;
  const w = known.includes(word) ? word : known[0] || '', u = gv.words.find((x) => x.word === w);
  const place = (ref: string) => act({ type: 'sandbox/mark', at: ref, word: mw, age, damage: dmg, name: 'Sigil mark', text: 'A Sigil word cut into the wall.' });
  useTilePick(arm && gearing, (r) => { place(r); setArm(false); });
  return <Section title="SIGIL GROWTH (TESTING)" aria="Sigil growth tools">
    <div style={row} data-sb-study="1"><span style={{ fontSize: 12 }}>Study <b>{gv.study}</b> · next word at {gv.next} · {gv.pending} pick{gv.pending === 1 ? '' : 's'} waiting{gv.free ? ' · ' + gv.free + ' free' : ''}</span></div>
    <div style={row}>
      {[6, 8, 30].map((n) => <button key={n} type="button" style={small} onClick={() => act({ type: 'sandbox/study', charId: c.id, study: n })}>+{n} study</button>)}
      <input value={study} onChange={(e) => setStudy(e.target.value.replace(/[^\d-]/g, '').slice(0, 4))} aria-label="Study to grant" style={{ ...field, width: 60 }} />
      <button type="button" data-sb-grant-study="1" style={small} onClick={() => act({ type: 'sandbox/study', charId: c.id, study: Number(study) })}>Grant</button>
    </div>
    {known.length > 0 ? <div style={row} data-sb-uses="1">
      <select value={w} aria-label="Word to set uses for" onChange={(e) => setWord(e.target.value)} style={field}>{known.map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select>
      {u && <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, color: u.tier === 'new' ? C.muted : C.mind }}><img src={starUri(u.tier)} alt="" width={14} height={14} />{u.uses} uses · {u.tier.toUpperCase()}</span>}
      <input value={uses} onChange={(e) => setUses(e.target.value.replace(/\D/g, '').slice(0, 3))} aria-label="Uses" style={{ ...field, width: 56 }} />
      <button type="button" style={small} data-sb-set-uses="1" onClick={() => act({ type: 'sandbox/word-uses', charId: c.id, word: w, uses: Number(uses) })}>Set uses</button>
      <button type="button" style={small} onClick={() => act({ type: 'sandbox/word-uses', charId: c.id, word: w, uses: WORD_MASTERY.practised })}>Practised ({WORD_MASTERY.practised})</button>
      <button type="button" style={small} onClick={() => act({ type: 'sandbox/word-uses', charId: c.id, word: w, uses: WORD_MASTERY.mastered })}>Mastered ({WORD_MASTERY.mastered})</button>
    </div> : <span style={{ fontSize: 12, color: C.muted }}>Learn a word above to set its use count.</span>}
    {canField && <>
      <span style={label}>A SIGIL MARK ON THE MAP</span>
      <div style={row} data-sb-mark="1">
        <img src={markUri(mw, { age, damage: dmg })} alt="" width={34} height={34} />
        <select value={mw} aria-label="Mark word" onChange={(e) => setMw(e.target.value)} style={field}>{(SIGILS as any[]).map((x) => <option key={x.id} value={x.id}>{x.word}</option>)}</select>
        <select value={age} aria-label="Mark age" onChange={(e) => setAge(e.target.value)} style={field}>{MARK.ages.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        <select value={dmg} aria-label="Mark damage" onChange={(e) => setDmg(e.target.value)} style={field}>{MARK.damages.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        <span style={{ fontSize: 12, color: C.muted }}>TN {markTn(age, dmg)}</span>
      </div>
      <div style={row}>
        <button type="button" data-sb-mark-arm="1" disabled={!gearing} aria-pressed={arm} style={arm ? { ...primary, background: C.red, color: C.white } : primary} onClick={() => setArm(!arm)}>{arm ? 'Click a tile · stop' : 'Place by clicking the map'}</button>
        <input value={at} onChange={(e) => setAt(e.target.value.toUpperCase())} placeholder="or H6" aria-label="Tile for the mark" style={{ ...field, width: 70 }} />
        <button type="button" data-sb-mark-place="1" disabled={!gearing || !at.trim()} style={btn} onClick={() => place(at.trim())}>Place</button>
      </div>
      {!gearing && <span style={{ fontSize: 12, color: C.muted }}>Stop the fight to place a mark.</span>}
    </>}
    {isHost && <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }} data-sb-junctions="1"><input type="checkbox" checked={jOn} onChange={(e) => act({ type: 'sandbox/junctions', on: e.target.checked })} />Junctions for everyone here (a glyph may join two strokes; otherwise Brain Power Mastered only)</label>}
  </Section>;
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
  // A tool search that names an enemy tier or a Sigil caster picks it (as the Squad tab's menus do).
  const q = React.useContext(WideCtx).q;
  React.useEffect(() => {
    if (!q) return;
    const k = CASTERS.find((x) => matches(q, x.name)), e = ENEMIES.find((x) => matches(q, x.name));
    if (k) { setCaster(k.id); setTier(k.tier); setWeapon(k.weapon); } else if (e) { setTier(e.id); setCaster(''); setWeapon(SANDBOX_TIERS[e.id]?.weapons[0] || weapon); }
  }, [q]);
  useTilePick(armed, (r) => spawn(r));
  React.useEffect(() => { if (!armed) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setArmed(false); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [armed]);
  const mana = cb?.mana ?? game.story.mana ?? 15, band = MANA_BANDS.find((b) => mana >= b.min && mana <= b.max);
  const foes = gearing ? (game.story.npcs || []).filter((n) => n.side === 'hostile').length : (cb?.units || []).filter((u) => u.side === 'foe' && !u.dead).length;
  return <>
    <Section title={gearing ? 'SPAWN A DRILL UNIT ON THE MAP (IDLE UNTIL THE FIGHT)' : 'SPAWN AN ENEMY INTO THE FIGHT'} keys={FIND.spawn}>
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


// ---------- the world (rules 1.7): people, caches, hazards, triggers, objectives ----------
/** One approach's fields (label, skills, TN, what success and failure do). */
function ApproachEdit({ a, set, name }: { a: ApproachForm; set: (a: ApproachForm) => void; name: string }) {
  const sk = (v: string, k: 'skill' | 'skill2') => <select value={v} aria-label={name + ' ' + (k === 'skill' ? 'skill' : 'second skill')} style={{ ...field, flex: 1 }} onChange={(e) => set({ ...a, [k]: e.target.value })}>{k === 'skill2' && <option value="">(one skill)</option>}{SKILLS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 8, border: '1px solid ' + C.line }}>
    <input value={a.label} aria-label={name + ' label'} onChange={(e) => set({ ...a, label: e.target.value })} style={field} />
    <div style={row}>{sk(a.skill, 'skill')}{sk(a.skill2, 'skill2')}<select value={a.tn} aria-label={name + ' TN'} style={field} onChange={(e) => set({ ...a, tn: Number(e.target.value) })}>{TN_LADDER.map((t) => <option key={t} value={t}>TN {t}</option>)}</select></div>
    <div style={row}><span style={{ fontSize: 12, color: C.muted }}>Success</span><select value={a.success} aria-label={name + ' success'} style={field} onChange={(e) => set({ ...a, success: e.target.value })}>{SUCCESSES.map((x) => <option key={x} value={x}>{x || '(the Narrator says)'}</option>)}</select>
      <span style={{ fontSize: 12, color: C.muted }}>Fail</span><select value={a.fail} aria-label={name + ' fail'} style={field} onChange={(e) => set({ ...a, fail: e.target.value })}>{FAILS.map((x) => <option key={x} value={x}>{x || '(nothing more)'}</option>)}</select></div>
    {a.success === 'advance' && <input value={a.objective} placeholder="objective id (drill objective)" aria-label={name + ' objective'} onChange={(e) => set({ ...a, objective: e.target.value })} style={field} />}
    {a.fail === 'condition' && <select value={a.failCondition} aria-label={name + ' condition'} style={field} onChange={(e) => set({ ...a, failCondition: e.target.value })}><option value="">Pick a condition</option>{CONDITION_IDS.map((x) => <option key={x} value={x}>{condName(x)}</option>)}</select>}
    {a.fail === 'lose' && <input value={a.failItem} placeholder="item id it takes" aria-label={name + ' item lost'} onChange={(e) => set({ ...a, failItem: e.target.value })} style={field} />}
  </div>;
}
const PILE_CHOICES = pileChoices(), PILE_NAMES: Record<string, string> = Object.fromEntries(PILE_CHOICES.map((x) => [x.id, x.name]));
type Arm = { what: 'npc' | 'cache' | 'pile' | 'hazard' | 'trigger'; pts: string[] } | null;
function WorldTab({ game }: { game: GameState }) {
  const gearing = game.phase === 'story';
  const [npc, setNpc] = React.useState(blankNpc()), [cache, setCache] = React.useState(blankCache()), [pile, setPile] = React.useState(blankPile()), [pileAdd, setPileAdd] = React.useState('mag:service_pistol'), [hz, setHz] = React.useState(blankHazard()), [tg, setTg] = React.useState(blankTrigger()), [ob, setOb] = React.useState(blankObjective());
  const [arm, setArm] = React.useState<Arm>(null), [refs, setRefs] = React.useState<Record<string, string>>({}), [addItem, setAddItem] = React.useState('stim_injector'), [refPick, setRefPick] = React.useState('');
  const R = (k: string) => (refs[k] || '').trim().toUpperCase(), setR = (k: string, v: string) => setRefs({ ...refs, [k]: v.toUpperCase() });
  const two = (v: string): [string, string] => { const [a, b] = v.split(/[:\-–\s]+/).filter(Boolean); return [a || '', b || a || '']; };
  const fire = (what: NonNullable<Arm>['what'], pts: string[]) => {
    if (what === 'npc') act(npcAction(npc, pts[0]));
    if (what === 'cache') act(cacheAction(cache, pts[0]));
    if (what === 'pile') act(pileAction(pile, pts[0]));
    if (what === 'hazard') act(hazardAction(hz, pts[0], pts[1]));
    if (what === 'trigger') act(triggerAction(tg, pts[0], pts[1]));
  };
  const needs = (w: NonNullable<Arm>['what']) => (w === 'hazard' || (w === 'trigger' && tg.when === 'enter') ? 2 : 1);
  useTilePick(!!arm && gearing, (r) => { if (!arm) return; const pts = [...arm.pts, r]; if (pts.length < needs(arm.what)) { setArm({ ...arm, pts }); return; } fire(arm.what, pts); setArm(null); });
  React.useEffect(() => { if (!arm) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setArm(null); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [arm]);
  const armBtn = (w: NonNullable<Arm>['what'], label: string) => { const on = arm?.what === w;
    return <button type="button" data-world-arm={w} disabled={!gearing} aria-pressed={on} style={on ? { ...primary, background: C.red, color: C.white } : primary} onClick={() => setArm(on ? null : { what: w, pts: [] })}>{on ? (needs(w) === 2 ? (arm!.pts.length ? 'Click the far corner · stop' : 'Click the first corner · stop') : 'Click a tile · stop') : label}</button>; };
  const placeBtn = (w: NonNullable<Arm>['what'], key: string, hint: string) => <><input value={refs[key] || ''} onChange={(e) => setR(key, e.target.value)} placeholder={hint} aria-label={'Tile for ' + w} style={{ ...field, width: needs(w) === 2 ? 110 : 80 }} />
    <button type="button" data-world-place={w} disabled={!gearing || (needs(w) === 2 ? !two(R(key))[0] : !R(key)) || (w === 'trigger' && tg.when === 'examine' && !tg.objId)} style={btn} onClick={() => fire(w, needs(w) === 2 ? two(R(key)) : [R(key)])}>Place</button></>;
  const objs = (game.story.objects || []).filter((o) => !o.hidden), npcs = (game.story.npcs || []).filter((n) => !n.hidden), hzs = (game.story.hazards || []);
  const ents = [...npcs.map((n) => ({ id: n.id, label: n.name + ' (' + refOf(n.pos) + ')' })), ...objs.map((o) => ({ id: o.id, label: o.name + ' (' + refOf(o.pos) + ')' })), ...hzs.map((h) => ({ id: h.id, label: (h.name || HAZARD[h.kind]?.name || h.kind) + ' (' + refOf(h.tiles[0]) + ')' }))];
  const avs = avatarChoices(npc.kind);
  return <>
    {!gearing && <Box keys="world place" span><span style={{ fontSize: 12, color: C.text }}>Stop the fight to place things.</span></Box>}
    {arm && <Box keys="world place" span><span role="status" style={{ fontSize: 12, color: C.text }}>Click {needs(arm.what) === 2 ? (arm.pts.length ? 'the far corner' : 'the first corner') : 'a free tile'} on the map (open the Area map for the big grid). Esc stops.</span></Box>}
    <Section title="A PERSON (KIND, FACE, TALK)" aria="World: a person">
      <div style={row}><input value={npc.name} aria-label="Person name" onChange={(e) => setNpc({ ...npc, name: e.target.value })} style={{ ...field, flex: 1 }} />
        <select value={npc.kind} aria-label="Kind" style={field} onChange={(e) => setNpc({ ...npc, kind: e.target.value, avatar: '' })}>{WORLD_KIND_IDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <select value={npc.side} aria-label="Side" style={field} onChange={(e) => setNpc({ ...npc, side: e.target.value as any })}><option value="neutral">neutral</option><option value="hostile">hostile</option></select></div>
      <div role="group" aria-label="Avatar" style={{ ...row, gap: 4 }}>
        <button type="button" aria-pressed={!npc.avatar} style={{ ...small, border: '1px solid ' + (!npc.avatar ? C.text : C.line) }} onClick={() => setNpc({ ...npc, avatar: '' })}>{avs.length ? 'Auto' : 'Badge only'}</button>
        {avs.slice(0, 12).map((id) => <button key={id} type="button" data-avatar={id} aria-pressed={npc.avatar === id} title={id} onClick={() => setNpc({ ...npc, avatar: id })} style={{ padding: 0, width: 34, height: 42, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '2px solid ' + (npc.avatar === id ? C.white : C.line), background: C.ground }}><img src={ART(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></button>)}
      </div>
      <div style={row}><label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={npc.prisoner} onChange={(e) => setNpc({ ...npc, prisoner: e.target.checked })} />Prisoner</label>
        <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={npc.hidden} onChange={(e) => setNpc({ ...npc, hidden: e.target.checked })} />Hidden</label></div>
      <input value={npc.wants} placeholder="What they want (one plain line)" aria-label="Wants" onChange={(e) => setNpc({ ...npc, wants: e.target.value })} style={field} />
      <div style={row}><input value={npc.objective} placeholder="knows: objective id" aria-label="Knows objective" onChange={(e) => setNpc({ ...npc, objective: e.target.value })} style={{ ...field, width: 130 }} />
        <input value={npc.hintAt} placeholder="at (H6)" aria-label="Hint tile" onChange={(e) => setNpc({ ...npc, hintAt: e.target.value })} style={{ ...field, width: 70 }} /></div>
      <input value={npc.hint} placeholder="The hint they give, plainly" aria-label="Hint" onChange={(e) => setNpc({ ...npc, hint: e.target.value })} style={field} />
      {npc.talk.map((a, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><ApproachEdit a={a} name={'Talk ' + (i + 1)} set={(x) => setNpc({ ...npc, talk: npc.talk.map((y, j) => (j === i ? x : y)) })} />
        <button type="button" style={{ ...small, alignSelf: 'flex-start', color: C.muted }} onClick={() => setNpc({ ...npc, talk: npc.talk.filter((_, j) => j !== i) })}>Remove this talk approach</button></div>)}
      {npc.talk.length < 4 && <button type="button" style={{ ...small, alignSelf: 'flex-start' }} onClick={() => setNpc({ ...npc, talk: [...npc.talk, { label: 'Lean on them', skill: 'intimidation', skill2: '', tn: 12, success: 'ally', fail: 'hostile', objective: '', failCondition: '', failItem: '', stakes: '' }] })}>+ Talk approach</button>}
      <div style={row}>{armBtn('npc', 'Place by clicking the map')}{placeBtn('npc', 'npc', 'or H6')}</div>
    </Section>
    <Section title="A CACHE (A CLOSED CONTAINER)" aria="World: a cache">
      <input value={cache.name} aria-label="Cache name" onChange={(e) => setCache({ ...cache, name: e.target.value })} style={field} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{cache.items.map((x, i) => <div key={i} style={row}><span style={{ flex: 1, fontSize: 13 }}>{ITEM[x.item]?.name || WEAPON[x.item]?.name || x.item}</span><Stepper name={'quantity of ' + x.item} value={x.qty} min={1} max={20} set={(n) => setCache({ ...cache, items: cache.items.map((y, j) => (j === i ? { ...y, qty: n } : y)) })} />
        <button type="button" style={{ ...small, color: C.muted }} aria-label={'Remove ' + x.item} onClick={() => setCache({ ...cache, items: cache.items.filter((_, j) => j !== i) })}>✕</button></div>)}</div>
      <div style={row}><select value={addItem} aria-label="Item to add" style={{ ...field, flex: 1 }} onChange={(e) => setAddItem(e.target.value)}>{ITEMS.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}{WEAPONS.map((w) => <option key={w.id} value={w.id}>{w.name} (weapon)</option>)}</select>
        <button type="button" style={small} disabled={cache.items.length >= 12} onClick={() => setCache({ ...cache, items: [...cache.items, { item: addItem, qty: 1 }] })}>+ Add</button></div>
      <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={cache.locked} onChange={(e) => setCache({ ...cache, locked: e.target.checked })} />Locked (needs its way in first)</label>
      {cache.locked && <ApproachEdit a={cache.way} name="Way in" set={(x) => setCache({ ...cache, way: x })} />}
      <div style={row}>{armBtn('cache', 'Place by clicking the map')}{placeBtn('cache', 'cache', 'or H6')}</div>
    </Section>
    <Section title="A PILE (ON THE GROUND)" aria="World: a pile">
      <span style={{ fontSize: 12, color: C.muted }}>Things lying on a tile, in plain sight: anyone who can see the tile sees what is in it, and Pick up takes it (1 AP). Dropping onto a pile adds to it.</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{pile.items.map((x, i) => <div key={i} style={row}><span style={{ flex: 1, fontSize: 13 }}>{PILE_NAMES[x.item] || x.item}{isAmmoId(x.item) ? ' · rounds' : ''}</span><Stepper name={'quantity of ' + x.item} value={x.qty} min={isAmmoId(x.item) ? 0 : 1} max={isAmmoId(x.item) ? 120 : 20} set={(n) => setPile({ ...pile, items: pile.items.map((y, j) => (j === i ? { ...y, qty: n } : y)) })} />
        <button type="button" style={{ ...small, color: C.muted }} aria-label={'Remove ' + x.item + ' from the pile'} onClick={() => setPile({ ...pile, items: pile.items.filter((_, j) => j !== i) })}>✕</button></div>)}</div>
      <div style={row}><select value={pileAdd} aria-label="Thing to add to the pile" style={{ ...field, flex: 1 }} onChange={(e) => setPileAdd(e.target.value)}>{PILE_CHOICES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button type="button" style={small} disabled={pile.items.length >= 12} onClick={() => setPile({ ...pile, items: [...pile.items, { item: pileAdd, qty: pileAdd.startsWith('mag:') ? (WEAPON[pileAdd.slice(4)]?.magazine || 1) : pileAdd.startsWith('rounds:') ? 20 : 1 }] })}>+ Add</button></div>
      <span style={{ fontSize: 12, color: C.muted }}>A magazine's number is its rounds (0: empty).</span>
      <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={pile.hidden} onChange={(e) => setPile({ ...pile, hidden: e.target.checked })} />Hidden (until spotted or searched)</label>
      <div style={row}>{armBtn('pile', 'Place by clicking the map')}{placeBtn('pile', 'pile', 'or H6')}</div>
    </Section>
    <Section title="A HAZARD (AN AREA OF TILES)" aria="World: a hazard">
      <div style={row}><select value={hz.kind} aria-label="Hazard kind" style={field} onChange={(e) => setHz({ ...hz, kind: e.target.value })}>{HAZARD_KINDS.map((k) => <option key={k} value={k}>{HAZARD[k]?.name || k}</option>)}</select>
        {(['light', 'heavy'] as const).map((v) => <button key={v} type="button" aria-pressed={hz.severity === v} style={{ ...small, border: '1px solid ' + (hz.severity === v ? C.text : C.line) }} onClick={() => setHz({ ...hz, severity: v })}>{v}</button>)}
        <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={hz.hidden} onChange={(e) => setHz({ ...hz, hidden: e.target.checked })} />Hidden</label></div>
      <span style={{ fontSize: 12, color: C.muted }}>{HAZARD[hz.kind]?.text || ''}</span>
      <div style={row}>{armBtn('hazard', 'Place: click two corners')}{placeBtn('hazard', 'hazard', 'or C3:E5')}</div>
      {hzs.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{hzs.map((h) => <div key={h.id} style={row}><span style={{ flex: 1, fontSize: 12 }}>{(h.name || HAZARD[h.kind]?.name || h.kind) + ' · ' + h.severity + ' · ' + h.tiles.length + ' tiles at ' + refOf(h.tiles[0]) + ' [' + h.id + ']'}</span>
        <button type="button" style={{ ...small, color: C.muted }} disabled={!gearing} onClick={() => act({ type: 'sandbox/hazard', remove: h.id } as any)}>Remove</button></div>)}</div>}
    </Section>
    <Section title="A TRIGGER (AMBUSH, ARRIVAL, REVEAL)" aria="World: a trigger">
      <div style={row}><span style={{ fontSize: 12, color: C.muted }}>When</span>{(['enter', 'examine'] as const).map((v) => <button key={v} type="button" aria-pressed={tg.when === v} style={{ ...small, border: '1px solid ' + (tg.when === v ? C.text : C.line) }} onClick={() => setTg({ ...tg, when: v })}>{v === 'enter' ? 'someone enters tiles' : 'an object is dealt with'}</button>)}</div>
      {tg.when === 'examine' && <select value={tg.objId} aria-label="Trigger object" style={field} onChange={(e) => setTg({ ...tg, objId: e.target.value })}><option value="">Pick an object</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.name + ' (' + refOf(o.pos) + ')'}</option>)}</select>}
      <div style={row}><span style={{ fontSize: 12, color: C.muted }}>Then</span>{(['fight', 'spawn', 'reveal'] as const).map((v) => <button key={v} type="button" aria-pressed={tg.then === v} style={{ ...small, border: '1px solid ' + (tg.then === v ? C.text : C.line) }} onClick={() => setTg({ ...tg, then: v })}>{v === 'fight' ? 'ambush (fight)' : v === 'spawn' ? 'someone arrives' : 'reveal hidden'}</button>)}</div>
      {tg.then !== 'reveal' && <div style={row}><Stepper name="how many" value={tg.count} min={1} max={6} set={(n) => setTg({ ...tg, count: n })} /><input value={tg.name} aria-label="Who comes" onChange={(e) => setTg({ ...tg, name: e.target.value })} style={{ ...field, width: 110 }} />
        <select value={tg.kind} aria-label="Their kind" style={field} onChange={(e) => setTg({ ...tg, kind: e.target.value })}>{WORLD_KIND_IDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <select value={tg.tier} aria-label="Their tier" style={field} onChange={(e) => setTg({ ...tg, tier: e.target.value })}>{ENEMIES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
      <input value={tg.text} placeholder="What everyone sees when it fires" aria-label="Trigger text" onChange={(e) => setTg({ ...tg, text: e.target.value })} style={field} />
      <div style={row}>{tg.when === 'enter' ? armBtn('trigger', 'Place: click two corners') : <button type="button" style={primary} disabled={!gearing || !tg.objId} onClick={() => fire('trigger', [])}>Set the trigger</button>}{tg.when === 'enter' && placeBtn('trigger', 'trigger', 'or F4:G5')}</div>
      <span style={{ fontSize: 12, color: C.muted }}>Triggers are invisible to players; the log shows the new one's id. Each fires once.</span>
    </Section>
    <Section title="AN OBJECTIVE AND WHERE IT IS" aria="World: an objective">
      <div style={row}><input value={ob.id} aria-label="Objective id" onChange={(e) => setOb({ ...ob, id: e.target.value })} style={{ ...field, width: 130 }} /><input value={ob.text} aria-label="Objective text" onChange={(e) => setOb({ ...ob, text: e.target.value })} style={{ ...field, flex: 1 }} /></div>
      <div style={row}><select value={refPick} aria-label="Where: a thing on the map" style={{ ...field, flex: 1 }} onChange={(e) => setRefPick(e.target.value)}><option value="">A person, object or hazard…</option>{ents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <button type="button" style={small} disabled={!refPick || ob.refs.includes(refPick)} onClick={() => setOb({ ...ob, refs: [...ob.refs, refPick] })}>+ Where</button>
        <input value={refs.obj || ''} onChange={(e) => setR('obj', e.target.value)} placeholder="or H6" aria-label="Where: a tile" style={{ ...field, width: 70 }} /><button type="button" style={small} disabled={!R('obj')} onClick={() => { setOb({ ...ob, refs: [...ob.refs, R('obj')] }); setR('obj', ''); }}>+ Tile</button></div>
      {ob.refs.length > 0 && <span style={{ fontSize: 12 }}>Where: {ob.refs.map((r) => ents.find((x) => x.id === r)?.label || r).join(', ')} <button type="button" style={{ ...small, minHeight: 22 }} onClick={() => setOb({ ...ob, refs: [] })}>Clear</button></span>}
      <div style={row}><button type="button" data-world-objective="open" style={primary} disabled={!gearing} onClick={() => act(objectiveAction({ ...ob, status: 'open' }))}>Set objective</button>
        <button type="button" style={btn} disabled={!gearing} onClick={() => act(objectiveAction({ ...ob, status: 'done' }))}>Mark it done</button></div>
    </Section>
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
          {isHost && p.id !== meId && <button type="button" style={{ ...small, minHeight: 24, color: C.muted }} aria-label={'Remove ' + p.name} title="Remove from the Proving Ground" onClick={() => { askConfirm({ title: 'Remove ' + p.name + ' from the Proving Ground?', confirm: 'Remove', danger: true }).then((ok) => ok && act({ type: 'player/kick', id: p.id })); }}>✕</button>}
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
