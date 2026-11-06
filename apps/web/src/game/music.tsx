// The room's music (spec: Music). The engine says what plays (musicFor); this plays it through YouTube's embedded
// player, shows the credit on every change, and lets each player pause or turn it down for themselves only.
// The host's browser tells the engine when a one-play song has finished (music/end).
import React from 'react';
import { musicFor, musicTraitOf, songOf, type GameState } from '@engine';
import { act, toast } from './store';

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
  const player = React.useRef<any>(null), ready = React.useRef(false), playing = React.useRef<string>('');
  const live = React.useRef({ want, game, p, isHost }); live.current = { want, game, p, isHost };

  // One player for the whole session.
  React.useEffect(() => {
    if (!want?.track || player.current) return;
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
            if (w?.track) { player.current.seekTo(w.track.start || 0, true); if (!live.current.p.paused) player.current.playVideo(); }
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
  }, [!!want?.track]);

  // Browsers allow sound only after a click: the first click anywhere starts the music.
  React.useEffect(() => {
    const go = () => { const pl = player.current; if (!pl || !ready.current) return; try { pl.unMute(); pl.setVolume(live.current.p.vol); if (!live.current.p.paused && live.current.want?.track) pl.playVideo(); } catch { /* */ } };
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, []);

  function fadeTo(target: number, then?: () => void) {
    const pl = player.current; if (!pl?.getVolume) { then?.(); return; }
    const from = pl.getVolume(), t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / FADE_MS); try { pl.setVolume(Math.round(from + (target - from) * k)); } catch { /* */ } if (k < 1) requestAnimationFrame(step); else then?.(); };
    requestAnimationFrame(step);
  }
  function sync() {
    const pl = player.current, { want: w, p: pr } = live.current;
    if (!pl || !ready.current) return;
    const key = w?.track ? w.key + ':' + w.track.yt : '';
    if (key === playing.current) return;
    const had = !!playing.current; playing.current = key; setBad(null);
    if (!w?.track) { fadeTo(0, () => { try { pl.stopVideo(); } catch { /* */ } }); return; }
    const start = () => {
      const opts = { videoId: w.track!.yt, startSeconds: w.track!.start || 0 };
      if (pr.paused) pl.cueVideoById(opts); else { pl.loadVideoById(opts); pl.setVolume(0); fadeTo(pr.vol); }
      // If the browser blocked sound, try muted and wait for the first click.
      setTimeout(() => { try { if (!live.current.p.paused && !badRef.current && playing.current === key && pl.getPlayerState() !== 1) { setBlocked(true); pl.mute(); pl.playVideo(); } } catch { /* */ } }, 2500);
    };
    had ? fadeTo(0, start) : start();
  }
  const key = want?.track ? want.key + ':' + want.track.yt : '';
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
    const n = { ...p, ...x }; setP(n); savePrefs(n); const pl = player.current; if (!pl || !ready.current) return;
    if (x.vol != null) { pl.unMute(); pl.setVolume(n.vol); }
    if (x.paused === true) pl.pauseVideo();
    if (x.paused === false) { pl.unMute(); pl.setVolume(n.vol); pl.playVideo(); }
  };

  if (!game || game.phase === 'lobby') return null;
  const track = want?.track || null;
  const side = game.phase === 'combat' ? 'left' : 'right';
  const mine = Object.values(game.characters).filter((c) => c.owner === meId && !c.dead && musicTraitOf(c) && songOf(c));
  const btn: React.CSSProperties = { minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #2E3A50', background: '#10151F', color: '#E7EBF3', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#A3AEC2' };
  const hostCol = want?.charId ? game.players.find((x) => x.id === game.characters[want.charId!]?.owner)?.color : null;

  return (
    <>
      {/* The panel (and the video in it) stays in the page: on screen when open, out of view when closed, so the music keeps playing. */}
      <div role="dialog" aria-label="Music" aria-hidden={!open} style={{ position: 'fixed', [side]: open ? 16 : -10000, bottom: 64, zIndex: 9, width: 380, padding: 12, borderRadius: 14, background: '#10151F', border: '1px solid #3B475D', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div ref={holder} style={{ width: 356, height: 200, borderRadius: 8, overflow: 'hidden', background: '#000' }} />
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
            {track && <a href={'https://www.youtube.com/watch?v=' + track.yt} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#7FD4FF' }}>Open on YouTube ↗</a>}
          </div>
          <div style={{ fontSize: 11, color: '#A3AEC2' }}>Pause and volume are yours only: the room's music goes on, and song bonuses still count.</div>
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
      <button onClick={() => { setOpen(!open); if (blocked) setPrefs({ paused: false }); }} aria-expanded={open} aria-label={'Music: ' + (track ? track.title + ' by ' + track.artist : 'nothing playing')}
        style={{ position: 'fixed', [side]: 16, bottom: 16, zIndex: 9, maxWidth: 300, minHeight: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid ' + (hostCol || '#3B475D'), background: '#10151F', color: '#E7EBF3', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
        <span aria-hidden style={{ fontSize: 16, color: hostCol || '#FFFFFF' }}>♪</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blocked ? 'Click to start the music' : p.paused ? 'Music paused' : track ? track.title : 'No music'}</span>
      </button>
      {credit && !open && (
        <div role="status" style={{ position: 'fixed', [side]: 16, bottom: 66, zIndex: 9, width: 300, padding: '10px 12px', borderRadius: 12, background: '#10151F', border: '1px solid #3B475D', borderLeft: '4px solid ' + credit.color, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
          <div style={label}>♪ NOW PLAYING</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E7EBF3' }}>{credit.title}</div>
          <div style={{ fontSize: 12, color: '#A3AEC2' }}>{credit.artist}</div>
          <div style={{ fontSize: 11, color: credit.color }}>{credit.reason}</div>
        </div>
      )}
    </>
  );
}

/** Used by the toast elsewhere: a short credit line. */
export const creditLine = (t: { title: string; artist: string }) => '♪ ' + t.title + (t.artist ? ' · ' + t.artist : '');
void toast;
