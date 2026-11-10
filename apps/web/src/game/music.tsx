// The room's music (spec: Music). The engine says what plays (musicFor); this plays it: players' songs and campaign
// tracks through YouTube's embedded player, the game's own fight music (Gunline, Heaven Falls, Last Rounds) from its
// files (ost.ts). It shows the credit on every change, and lets each player pause or turn it down for themselves only.
// The level is the panel's volume times Settings' music volume (silent when muted).
// The host's browser tells the engine when a one-play song has finished (music/end).
import React from 'react';
import { musicFor, musicTraitOf, songOf, trackKey, type GameState } from '@engine';
import { act, toast } from './store';
import { musicLevel, onUiPrefs, uiPrefs, setUiPrefs } from './sfx';
import { ostPlay, ostVolume, ostPause, ostResume, ostRunning, ostPreload } from './ost';
import { onVoice, voiceState } from './voice';
import { openSettings } from './settings';
import { useFloatStyle, onFloatOut, floatOut } from './floaters';
import { COMBAT_IN_MS, usePresence, presenceCls } from './presence';

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }
let apiP: Promise<any> | null = null;
function ytApi(): Promise<any> {
  if (apiP) return apiP;
  apiP = new Promise((res) => {
    if (window.YT?.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s);
  });
  return apiP;
}

const LS = 'phc.music';
const prefs = (): { paused: boolean; vol: number } => { try { return { paused: false, vol: 60, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { paused: false, vol: 60 }; } };
const savePrefs = (p: { paused: boolean; vol: number }) => localStorage.setItem(LS, JSON.stringify(p));
const FADE_MS = 1200;
/** The level for a panel volume (0 to 100): times Settings' music volume, silent when muted. */
const level = (vol: number) => Math.round(vol * musicLevel());

type Want = ReturnType<typeof musicFor>;

export function Music({ game, meId, isHost }: { game: GameState | null; meId: string; isHost: boolean }) {
  const want: Want | null = game && game.phase !== 'lobby' ? musicFor(game) : null;
  const [open, setOpen] = React.useState(false);
  const [p, setP] = React.useState(prefs);
  const [credit, setCredit] = React.useState<null | { title: string; artist: string; reason: string; color: string; at: number }>(null);
  const [blocked, setBlocked] = React.useState(false);
  const [bad, setBadS] = React.useState<string | null>(null), badRef = React.useRef<string | null>(null);
  const setBad = (x: string | null) => { badRef.current = x; setBadS(x); if (x) setBlocked(false); };
  const holder = React.useRef<HTMLDivElement>(null);
  const player = React.useRef<any>(null), ready = React.useRef(false), playing = React.useRef<string>(''), kind = React.useRef<'' | 'yt' | 'ost'>('');
  const live = React.useRef({ want, game, p, isHost, ducked: false }); live.current = { ...live.current, want, game, p, isHost };
  // A fight just started: the screen plays its combat-in transition (App.tsx), so the old music fades out under it and
  // the fight's music fades in once it is over (COMBAT_IN_MS), not on top of it.
  const lastPhase = React.useRef(game?.phase), combatAt = React.useRef(0);
  if (lastPhase.current !== game?.phase) { if (game?.phase === 'combat' && lastPhase.current !== 'combat') combatAt.current = Date.now(); lastPhase.current = game?.phase; }

  // One YouTube player for the whole session, made the first time a YouTube track is wanted.
  React.useEffect(() => {
    if (!want?.track?.yt || player.current) return;
    let gone = false;
    ytApi().then((YT) => {
      if (gone || player.current || !holder.current) return;
      const el = document.createElement('div'); holder.current.appendChild(el);
      player.current = new YT.Player(el, {
        width: 356, height: 200, playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => { ready.current = true; sync(); },
          onStateChange: (e: any) => {
            if (e.data === 1) setBlocked(false);
            if (e.data !== 0) return;
            const { want: w, game: g, isHost: h } = live.current, now = g?.music?.now;
            const onePlay = w?.layer === 'spotlight' && now && !(now.inCombat && g?.phase === 'combat');
            if (onePlay) { if (h) act({ type: 'music/end', seq: now!.seq }); return; }
            if (w?.track?.yt) { player.current.seekTo(w.track.start || 0, true); if (!live.current.p.paused) player.current.playVideo(); }
          },
          onError: () => {
            const { want: w, game: g, isHost: h } = live.current;
            setBad(w?.track?.title || 'This video');
            if (h && w?.layer === 'spotlight' && g?.music?.now) act({ type: 'music/end', seq: g.music.now.seq });
          },
        },
      });
    });
    return () => { gone = true; };
  }, [!!want?.track?.yt]);

  // Browsers allow sound only after a click: the first click anywhere starts the music.
  React.useEffect(() => {
    const go = () => {
      const { p: pr, want: w } = live.current;
      if (!pr.paused && kind.current === 'ost') ostResume().then((ok) => { if (ok) setBlocked(false); });
      const pl = player.current; if (!pl || !ready.current || kind.current !== 'yt') return;
      try { pl.unMute(); pl.setVolume(level(pr.vol)); if (!pr.paused && w?.track?.yt) pl.playVideo(); } catch { /* */ }
    };
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);
  // Leaving the game (back to the title): the fight music fades out with it.
  React.useEffect(() => () => ostPlay(null, 600), []);
  // The first fight's track is fetched while the story plays, so it is ready when the fight starts.
  React.useEffect(() => { if (game && game.phase !== 'lobby') ostPreload('gunline'); }, [!!game && game.phase !== 'lobby']);

  function fadeTo(target: number, then?: () => void, ms = FADE_MS) {
    const pl = player.current; if (!pl?.getVolume) { then?.(); return; }
    const from = pl.getVolume(), t0 = performance.now();
    // A hidden tab barely runs animation frames: jump straight to the end there.
    if (typeof document !== 'undefined' && document.hidden) { try { pl.setVolume(target); } catch { /* */ } then?.(); return; }
    const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); try { pl.setVolume(Math.round(from + (target - from) * k)); } catch { /* */ } if (k < 1) requestAnimationFrame(step); else then?.(); };
    requestAnimationFrame(step);
  }
  function sync() {
    const pl = player.current, { want: w, p: pr } = live.current, ytReady = !!pl && ready.current;
    const key = w?.track ? w.key + ':' + trackKey(w.track) : '';
    if (key === playing.current) return;
    const isOst = !!w?.track?.ost;
    // A YouTube track waits for the player (its onReady calls sync again).
    if (w?.track && !isOst && !ytReady) return;
    const was = kind.current; playing.current = key; kind.current = !w?.track ? '' : isOst ? 'ost' : 'yt'; setBad(null);
    const stopYt = (ms = FADE_MS) => { if (was === 'yt' && ytReady) fadeTo(0, () => { try { if (kind.current !== 'yt') pl.stopVideo(); } catch { /* */ } }, ms); };
    const wait = COMBAT_IN_MS - (Date.now() - combatAt.current);
    if (!w?.track) { stopYt(); ostPlay(null, FADE_MS); return; }
    if (isOst) {
      // The game's own track: crossfades from the one before. Under the combat-in transition, the old music goes out
      // quickly and the fight's fades in after it.
      const go = () => {
        if (playing.current !== key) return;
        ostVolume(level(live.current.p.vol) / 100 * (live.current.ducked ? 0.25 : 1), 0); ostPlay(w.track!.ost!, FADE_MS);
        if (pr.paused) { ostPause(true); return; }
        ostResume().then((ok) => { if (ok) setBlocked(false); });
        setTimeout(() => { if (playing.current === key && !live.current.p.paused && !ostRunning()) setBlocked(true); }, 2500);
      };
      if (wait > 0) { const ms = Math.max(200, wait - 150); stopYt(ms); if (was === 'ost') ostPlay(null, ms); setTimeout(go, wait); }
      else { stopYt(); go(); }
      return;
    }
    if (was === 'ost') ostPlay(null, FADE_MS);
    const had = was === 'yt';
    const start = () => {
      const opts = { videoId: w.track!.yt, startSeconds: w.track!.start || 0 };
      if (pr.paused) pl.cueVideoById(opts); else { pl.loadVideoById(opts); pl.setVolume(0); fadeTo(level(pr.vol)); }
      // If the browser blocked sound, try muted and wait for the first click.
      setTimeout(() => { try { if (!live.current.p.paused && !badRef.current && playing.current === key && pl.getPlayerState() !== 1) { setBlocked(true); pl.mute(); pl.playVideo(); } } catch { /* */ } }, 2500);
    };
    if (wait > 0) {
      // Under the combat-in transition: out quickly, then the fight's music fades in after it.
      const go = () => setTimeout(() => { if (playing.current === key) start(); }, Math.max(0, COMBAT_IN_MS - (Date.now() - combatAt.current)));
      had ? fadeTo(0, go, Math.max(200, wait - 150)) : go();
      return;
    }
    had ? fadeTo(0, start) : start();
  }
  const key = want?.track ? want.key + ':' + trackKey(want.track) : '';
  React.useEffect(() => {
    sync();
    if (want?.track) {
      const owner = want.charId ? game!.players.find((x) => x.id === game!.characters[want.charId!]?.owner) : null;
      setCredit({ title: want.track.title, artist: want.track.artist, reason: want.charId ? (game!.characters[want.charId]?.name || '') + '\'s song · ' + want.reason : want.reason, color: owner?.color || '#FFFFFF', at: Date.now() });
      const t = setTimeout(() => setCredit(null), 5000); return () => clearTimeout(t);
    }
  }, [key]);

  // The host ends a one-play song on the clock too, so a host who paused locally doesn't hold everyone on it.
  const now = game?.music?.now;
  React.useEffect(() => {
    if (!isHost || !now || now.layer !== 'spotlight' || now.inCombat) return;
    const seq = now.seq, t0 = Date.now();
    const id = setInterval(() => {
      let len = now.track.length || 0;
      try { if (!len && player.current?.getDuration) len = player.current.getDuration() || 0; } catch { /* */ }
      if (!len && Date.now() - t0 > 420000) len = 420;
      if (len && Date.now() - t0 > (len - (now.track.start || 0) + 6) * 1000) { clearInterval(id); act({ type: 'music/end', seq }); }
    }, 2000);
    return () => clearInterval(id);
  }, [isHost, now?.seq, now?.layer]);

  const setPrefs = (x: Partial<{ paused: boolean; vol: number }>) => {
    const n = { ...p, ...x }; setP(n); savePrefs(n); live.current.p = n;
    if (x.vol != null) ostVolume(level(n.vol) / 100 * (live.current.ducked ? 0.25 : 1));
    if (x.paused != null && kind.current === 'ost') { ostPause(x.paused); if (!x.paused) setBlocked(false); }
    const pl = player.current; if (!pl || !ready.current) return;
    if (x.vol != null) { pl.unMute(); pl.setVolume(level(n.vol)); }
    if (x.paused === true) pl.pauseVideo();
    if (x.paused === false && kind.current === 'yt') { pl.unMute(); pl.setVolume(level(n.vol)); pl.playVideo(); }
  };

  // The Narrator speaks over the music: it ducks to a quarter while the voice plays (spec: The Narrator's voice).
  const [vs, setVs] = React.useState(voiceState());
  React.useEffect(() => onVoice(() => setVs(voiceState())), []);
  const ducked = !!vs.speaking; live.current.ducked = ducked;
  const panel = usePresence(open), creditP = usePresence(credit && !open ? credit : null);
  const applyLevel = (ms?: number) => {
    const { p: pr, ducked: d } = live.current, v = level(pr.vol) * (d ? 0.25 : 1);
    ostVolume(v / 100, ms);
    const pl = player.current; if (!pl || !ready.current || pr.paused || kind.current !== 'yt') return;
    if (ms) fadeTo(Math.round(v)); else { try { pl.setVolume(Math.round(v)); } catch { /* */ } }
  };
  React.useEffect(() => applyLevel(FADE_MS), [ducked]);
  // Settings' music volume and mute apply at once.
  React.useEffect(() => onUiPrefs(() => applyLevel()), []);
  // The floating button: see-through at rest, solid when the pointer is near or the panel is open (UI pass 7).
  const btnRef = React.useRef<HTMLButtonElement>(null), [hover, setHover] = React.useState(false);
  // Bottom left on every screen (on the right it covered End turn), as its icon only: the title in its tooltip and on
  // hover, so it keeps off the combat log, the sheet's skill rows and the room's text (review of the UI pass). Only a
  // blocked start keeps its words: it is the one time the button asks for a click. While its title shows or its panel is
  // open the ◈ Memory button slides away (they share the dock: floaters.ts), and the Memory opening closes this panel.
  const iconOnly = !blocked && !hover && !open;
  const { place, ...floatStyle } = useFloatStyle(btnRef, open, 'music', !iconOnly && !!game && game.phase !== 'lobby');
  React.useEffect(() => onFloatOut(() => { if (floatOut() === 'memory') setOpen(false); }), []);
  if (!game || game.phase === 'lobby') return null;
  const track = want?.track || null;
  const side = 'left';
  const btnText = blocked ? 'Click to start the music' : p.paused ? 'Music paused' : track ? track.title : 'No music';
  const mine = Object.values(game.characters).filter((c) => c.owner === meId && !c.dead && musicTraitOf(c) && songOf(c));
  const btn: React.CSSProperties = { minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #2E3A50', background: '#10151F', color: '#E7EBF3', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#A3AEC2' };
  const hostCol = want?.charId ? game.players.find((x) => x.id === game.characters[want.charId!]?.owner)?.color : null;

  return (
    <>
      {/* The panel (and the video in it) stays in the page: on screen when open, out of view when closed, so the music keeps playing. */}
      <div role="dialog" aria-label="Music" aria-hidden={!open} className={panel.shown ? presenceCls('phc-a-rise', panel.closing) : undefined} style={{ position: 'fixed', [side]: panel.shown ? 16 : -10000, bottom: 64, zIndex: 9, width: 380, padding: 12, borderRadius: 14, background: '#10151F', border: '1px solid #3B475D', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* The YouTube player; folded away while the game's own music plays (it has no video). */}
          <div ref={holder} style={{ width: 356, height: track?.ost ? 0 : 200, borderRadius: 8, overflow: 'hidden', background: '#000' }} />
          <div style={label}>NOW PLAYING{want?.layer ? ' · ' + ({ spotlight: 'SPOTLIGHT', pin: 'KEPT ON', encounter: 'FIGHT THEME', combat: 'FIGHT', ambient: 'AREA' } as any)[want.layer] : ''}</div>
          {track ? <>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#E7EBF3' }}>{track.title}</div>
            <div style={{ fontSize: 13, color: '#A3AEC2' }}>{track.artist || 'Unknown artist'}{track.licence ? ' · ' + track.licence : ''}</div>
            <div style={{ fontSize: 12, color: hostCol || '#A3AEC2' }}>{want!.charId ? game.characters[want!.charId]?.name + '’s song · ' + want!.reason : want!.reason}{want?.layer === 'pin' && now?.areasLeft ? ' · ' + now.areasLeft + (now.areasLeft === 1 ? ' area' : ' areas') + ' left' : ''}</div>
          </> : <div style={{ fontSize: 13, color: '#A3AEC2' }}>Silence. This area has no music.</div>}
          {bad && <div style={{ fontSize: 12, color: '#F65157' }}>✗ {bad} can't play here (the video doesn't allow embedding, or not in your region).</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn} onClick={() => setPrefs({ paused: !p.paused })}>{p.paused ? '▶ Resume' : '❚❚ Pause'}</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A3AEC2' }}>Volume
              <input type="range" min={0} max={100} value={p.vol} onChange={(e) => setPrefs({ vol: Number(e.target.value) })} aria-label="Music volume" style={{ width: 110 }} />
            </label>
            {track?.yt && <a href={'https://www.youtube.com/watch?v=' + track.yt} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#7FD4FF' }}>Open on YouTube ↗</a>}
          </div>
          <div style={{ fontSize: 11, color: '#A3AEC2' }}>Pause and volume are yours only: the room's music goes on, and song bonuses still count.</div>
          {/* Music only (Leon, UI pass): the Narrator's voice lives in Settings › Voice. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #232D3F' }}>
            <span style={{ fontSize: 11, color: '#A3AEC2' }}>The Narrator's voice and the sound mix are in Settings.</span>
            <button type="button" style={{ ...btn, marginLeft: 'auto', minHeight: 30 }} onClick={() => { setOpen(false); openSettings('voice'); }}>Voice settings ⚙</button>
          </div>
          {mine.map((c) => {
            const isMine = now?.charId === c.id;
            return (
              <div key={c.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #232D3F' }}>
                <span style={{ fontSize: 12, color: '#E7EBF3', fontWeight: 600 }}>{c.name} · Musek Blestor</span>
                {!isMine && game.phase === 'story' && <button style={btn} onClick={() => act({ type: 'music/play', charId: c.id })}>Play my song</button>}
                {!isMine && game.phase === 'combat' && <span style={{ fontSize: 12, color: '#A3AEC2' }}>In a fight: Play my song is a 2 AP action.</span>}
                {isMine && now?.layer === 'spotlight' && <button style={btn} onClick={() => act({ type: 'music/pin', charId: c.id })}>Keep it playing (2 areas)</button>}
                {isMine && <button style={btn} onClick={() => act({ type: 'music/unpin', charId: c.id })}>Stop my song</button>}
              </div>
            );
          })}
      </div>
      <button ref={btnRef} data-phc-float="music" data-phc-float-place={place} onClick={() => { setOpen(!open); if (blocked) setPrefs({ paused: false }); }} aria-expanded={open} aria-label={'Music: ' + (track ? track.title + ' by ' + track.artist : 'nothing playing')}
        title={iconOnly ? btnText : undefined} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
        style={{ position: 'fixed', [side]: 16, bottom: 16, zIndex: 9, maxWidth: 300, minHeight: 40, minWidth: 40, padding: iconOnly ? 0 : '0 14px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid ' + (hostCol || '#3B475D'), background: '#10151F', color: '#E7EBF3', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.5)', ...floatStyle }}>
        <span aria-hidden style={{ fontSize: 16, color: hostCol || '#FFFFFF' }}>♪</span>
        {!iconOnly && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{btnText}</span>}
      </button>
      {creditP.shown && (
        <div role="status" className={presenceCls(side === 'left' ? 'phc-a-left' : 'phc-a-right', creditP.closing)} style={{ position: 'fixed', [side]: 16, bottom: 112, zIndex: 9, width: 300, padding: '10px 12px', borderRadius: 12, background: '#10151F', border: '1px solid #3B475D', borderLeft: '4px solid ' + creditP.shown.color, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
          <div style={label}>♪ NOW PLAYING</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E7EBF3' }}>{creditP.shown.title}</div>
          <div style={{ fontSize: 12, color: '#A3AEC2' }}>{creditP.shown.artist}</div>
          <div style={{ fontSize: 11, color: creditP.shown.color }}>{creditP.shown.reason}</div>
        </div>
      )}
    </>
  );
}

/** Used by the toast elsewhere: a short credit line. */
export const creditLine = (t: { title: string; artist: string }) => '♪ ' + t.title + (t.artist ? ' · ' + t.artist : '');
void toast;
