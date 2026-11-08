// The mission board (spec: OOC, missions and end states): the board that slides in from the header's MISSIONS button,
// the objective toasts everyone sees, the act's MISSION COMPLETE card and the campaign's end screen. What they show
// comes from missionView.ts; this file only draws it. Mounted once in App.tsx.
import React from 'react';
import type { GameState } from '@engine';
import { boardView, endingView, toastFor } from './missionView';
import { usePresence, presenceCls } from './presence';
import { reducedMotion, sfx } from './sfx';
import { go } from './store';

// The header button (screens/main.js) opens the board through this tiny bus.
const subs = new Set<(open: boolean) => void>();
let isOpen = false;
export function openMissionBoard(open = !isOpen) { isOpen = open; subs.forEach((f) => f(open)); }

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', bad: '#F65157', todo: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: ink.muted };
const btn: React.CSSProperties = { minHeight: 40, padding: '0 18px', borderRadius: 10, border: 0, background: ink.text, color: ink.ground, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' };
const markColor = (s: string) => (s === 'done' ? ink.ok : s === 'failed' ? ink.muted : ink.todo);
const SEEN = (code: string) => 'phc.endings.' + code;
const readSeen = (code: string): number[] => { try { return JSON.parse(localStorage.getItem(SEEN(code)) || '[]'); } catch { return []; } };
const writeSeen = (code: string, list: number[]) => { try { localStorage.setItem(SEEN(code), JSON.stringify(list.slice(-20))); } catch { /* */ } };

export function MissionLayer({ game, screen }: { game: GameState | null; screen: string }) {
  const [open, setOpen] = React.useState(isOpen);
  React.useEffect(() => { const f = (o: boolean) => setOpen(o); subs.add(f); return () => { subs.delete(f); }; }, []);
  React.useEffect(() => { if (screen !== 'main' && screen !== 'combat') openMissionBoard(false); }, [screen]);
  React.useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') openMissionBoard(false); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [open]);

  // ---------- toasts: every mission line that arrives after this screen joined the game ----------
  const [toasts, setToasts] = React.useState<{ id: string; kicker: string; text: string; tone: string }[]>([]);
  const heard = React.useRef<{ code?: string; last?: string }>({});
  const ents = game?.story.entries || [], lastId = ents[ents.length - 1]?.id;
  React.useEffect(() => {
    const h = heard.current;
    if (!game || h.code !== game.code) { heard.current = { code: game?.code, last: lastId }; return; }
    if (lastId === h.last) return;
    const at = h.last ? ents.findIndex((e) => e.id === h.last) : -1;
    const fresh = (at >= 0 ? ents.slice(at + 1) : []).map((e) => ({ e, t: toastFor(e) })).filter((x) => x.t).slice(-3);
    heard.current = { code: game.code, last: lastId };
    if (!fresh.length) return;
    try { sfx('toggle'); } catch { /* */ }
    setToasts((list) => [...list, ...fresh.map(({ e, t }) => ({ id: e.id, ...t! }))].slice(-4));
    for (const { e } of fresh) setTimeout(() => setToasts((list) => list.filter((x) => x.id !== e.id)), 4200);
  }, [lastId, game?.code]);

  // ---------- the act-end card and the campaign-end screen ----------
  const code = game?.code || '';
  const [seen, setSeen] = React.useState<number[]>(() => readSeen(code));
  React.useEffect(() => { setSeen(readSeen(code)); }, [code]);
  const end = (screen === 'main' || screen === 'combat') ? endingView(game, seen) : null;
  const endP = usePresence(end);
  React.useEffect(() => { if (end) { try { sfx('stamp'); } catch { /* */ } /* TODO(music): an act-end sting when the music system gets a hook for it */ } }, [end?.seq]);
  const close = (seq: number, toRoom = false) => { const list = [...seen, seq]; writeSeen(code, list); setSeen(list); if (toRoom) go('room'); };

  const boardP = usePresence(open && game ? boardView(game) : null);
  if (!game) return null;
  const b = boardP.shown, E = endP.shown;
  return (
    <>
      {b && (
        <div role="dialog" aria-label="Mission board" className={presenceCls('phc-a-right', boardP.closing)} style={{ position: 'fixed', top: 64, right: 16, bottom: 16, zIndex: 40, width: 'min(440px, 94vw)', overflowY: 'auto', padding: 18, borderRadius: 14, background: ink.panel, border: '1px solid ' + ink.line, boxShadow: '0 16px 50px rgba(0,0,0,.6)', fontFamily: "'Chakra Petch', sans-serif", color: ink.text, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.2em' }}>MISSION BOARD</span>
            <button type="button" aria-label="Close the mission board" onClick={() => openMissionBoard(false)} style={{ marginLeft: 'auto', minHeight: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #2E3A50', background: 'transparent', color: ink.text, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
          {b.complete && <span style={{ ...kick, color: ink.ok }}>✓ THE CAMPAIGN IS COMPLETE</span>}
          {b.choosing && <span style={{ ...kick, color: ink.todo }}>WHAT COMES NEXT IS STILL OPEN · THE STORY DECIDES</span>}
          {b.current.map((m) => <MissionCard key={m.key} m={m} />)}
          {!b.current.length && !b.complete && !b.choosing && <span style={{ fontSize: 13, color: ink.muted }}>No mission is open right now.</span>}
          {b.side.length > 0 && (
            <section aria-label="Side jobs" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={kick}>SIDE JOBS</span>
              {b.side.map((j) => <div key={j.key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span aria-label={j.status} style={{ flex: 'none', width: 18, fontWeight: 700, color: markColor(j.status) }}>{j.mark}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, color: j.status === 'open' ? ink.text : ink.muted }}>{j.text}</span>{j.detail && <span style={{ fontSize: 12, color: ink.muted }}>{j.detail}</span>}</span>
              </div>)}
            </section>
          )}
          {b.past.length > 0 && (
            <details style={{ borderTop: '1px solid ' + ink.line, paddingTop: 12 }}>
              <summary style={{ ...kick, cursor: 'pointer' }}>COMPLETED · {b.past.length}</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>{b.past.map((m) => <MissionCard key={m.key} m={m} small />)}</div>
            </details>
          )}
          <span style={{ fontSize: 12, color: ink.muted, lineHeight: 1.5 }}>Stuck? Ask the Narrator out of character: switch on OOC next to Send, or start a line with [OOC]. It doesn't use your turn.</span>
        </div>
      )}

      {toasts.length > 0 && (
        <div aria-live="polite" style={{ position: 'fixed', top: 72, left: 0, right: 0, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          {toasts.map((t) => (
            <div key={t.id} role="status" className="phc-a-drop" style={{ minWidth: 280, maxWidth: 'min(560px, 92vw)', padding: '10px 16px', borderRadius: 10, background: ink.panel, border: '1px solid ' + (t.tone === 'done' ? ink.ok : t.tone === 'failed' ? ink.muted : ink.line), borderLeft: '4px solid ' + (t.tone === 'done' ? ink.ok : t.tone === 'failed' ? ink.muted : ink.todo), boxShadow: '0 8px 30px rgba(0,0,0,.5)', fontFamily: "'Chakra Petch', sans-serif", display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: t.tone === 'done' ? ink.ok : t.tone === 'failed' ? ink.muted : ink.todo }}>{t.kicker}</span>
              <span style={{ fontSize: 14, color: ink.text }}>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      {E && E.kind === 'act' && (
        <div role="dialog" aria-label="Mission complete" className={presenceCls('phc-a-fade', endP.closing)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(10, 13, 19, 0.94)', display: 'grid', placeItems: 'center', padding: 24, overflowY: 'auto', fontFamily: "'Chakra Petch', sans-serif", color: ink.text }}>
          <div className={reducedMotion() ? '' : 'phc-pop-in'} style={{ width: 'min(720px, 100%)', display: 'flex', flexDirection: 'column', gap: 18, padding: 28, borderRadius: 16, background: ink.panel, border: '1px solid ' + ink.line, borderTop: '3px solid ' + ink.ok }}>
            <span style={{ fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 700, letterSpacing: '0.24em', fontStyle: 'italic', color: ink.todo }}>MISSION COMPLETE</span>
            <span style={{ fontFamily: 'Spectral, serif', fontSize: 26, fontWeight: 600 }}>{E.title}</span>
            {E.recap.length > 0 && <section aria-label="What happened" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={kick}>WHAT HAPPENED</span>
              {E.recap.map((r, i) => <p key={i} style={{ margin: 0, fontFamily: 'Spectral, serif', fontSize: 16, lineHeight: 1.6, color: '#DCE2EC' }}>{r}</p>)}</section>}
            {E.done.length > 0 && <section aria-label="Objectives done" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={kick}>OBJECTIVES</span>
              {E.done.map((d, i) => <span key={i} style={{ fontSize: 14 }}><span style={{ color: ink.ok, fontWeight: 700 }}>✓</span> {d}</span>)}</section>}
            {E.choices.length > 0 && <section aria-label="Key choices" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={kick}>KEY CHOICES</span>
              {E.choices.map((d, i) => <span key={i} style={{ fontSize: 14, color: '#C9D3E3' }}>◆ {d}</span>)}</section>}
            {E.xp.length > 0 && <section aria-label="XP this act" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}><span style={kick}>XP THIS ACT</span>
              {E.xp.map((x) => <span key={x.key} style={{ fontSize: 14, fontWeight: 700 }}>{x.text}</span>)}</section>}
            {E.next && <section aria-label="Next mission" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, borderRadius: 10, background: ink.raised }}><span style={kick}>NEXT</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{E.next.title}</span><span style={{ fontSize: 14, color: '#C9D3E3' }}>{E.next.goal}</span></section>}
            <button type="button" style={{ ...btn, alignSelf: 'flex-end' }} onClick={() => close(E.seq)}>Continue</button>
          </div>
        </div>
      )}

      {E && E.kind === 'campaign' && (
        <div role="dialog" aria-label="Campaign complete" className={presenceCls('phc-a-fade', endP.closing)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: ink.ground, overflowY: 'auto', padding: '48px 24px', fontFamily: "'Chakra Petch', sans-serif", color: ink.text }}>
          <div className={reducedMotion() ? '' : 'phc-stagger'} style={{ width: 'min(860px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <span style={{ ...kick, color: ink.ok }}>✓ CAMPAIGN COMPLETE</span>
            <span style={{ fontFamily: 'Spectral, serif', fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 600 }}>{E.title}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{E.epilogue.map((p, i) => <p key={i} style={{ margin: 0, fontFamily: 'Spectral, serif', fontSize: 19, lineHeight: 1.75, color: '#DCE2EC' }}>{p}</p>)}</div>
            <section aria-label="The characters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
              {E.cards.map((c) => <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
                {c.img ? <img src={c.img} alt={c.name} style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 8, background: '#000', filter: c.dead ? 'grayscale(1)' : undefined }} /> : null}
                <span style={{ fontFamily: 'Spectral, serif', fontSize: 20, fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: ink.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Level {c.level} · {c.clsIcon && <img className="phc-class-emblem" src={c.clsIcon} alt="" style={{ width: 14, height: 14 }} />}{c.cls}{c.dead ? ' · DEAD' : ''}</span>
                {c.deeds.map((d, i) => <span key={i} style={{ fontSize: 12, color: '#C9D3E3' }}>★ {d}</span>)}
              </div>)}
            </section>
            {E.credits.length > 0 && <section aria-label="Credits" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={kick}>CREDITS</span>{E.credits.map((c, i) => <span key={i} style={{ fontSize: 13, color: ink.muted }}>{c}</span>)}</section>}
            <span style={{ fontSize: 13, color: ink.muted }}>The save is marked complete. Your characters can go into a new campaign from the room.</span>
            <button type="button" style={{ ...btn, alignSelf: 'flex-start' }} onClick={() => close(E.seq, true)}>Return to the room</button>
          </div>
        </div>
      )}
    </>
  );
}

function MissionCard({ m, small }: { m: ReturnType<typeof boardView>['current'][number]; small?: boolean }) {
  return (
    <section aria-label={'Mission: ' + m.title} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: small ? 0 : 14, borderRadius: 12, background: small ? 'transparent' : ink.raised, border: small ? 0 : '1px solid ' + ink.line }}>
      <span style={{ ...kick, color: m.status === 'done' ? ink.ok : ink.muted }}>{m.kicker}</span>
      <span style={{ fontFamily: 'Spectral, serif', fontSize: small ? 17 : 22, fontWeight: 600 }}>{m.title}</span>
      {!small && <span style={{ fontSize: 14, fontWeight: 600, color: ink.todo }}>{m.goal}</span>}
      {!small && <span style={{ fontSize: 13, lineHeight: 1.5, color: '#C9D3E3' }}>{m.summary}</span>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {m.rows.map((o) => <li key={o.key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span aria-label={o.status === 'open' ? 'to do' : o.status} style={{ flex: 'none', width: 18, fontWeight: 700, color: markColor(o.status) }}>{o.mark}</span>
          <span style={{ fontSize: 14, color: o.status === 'open' ? ink.text : ink.muted, textDecoration: o.status === 'failed' ? 'line-through' : undefined }}>{o.text}{o.optional && <span style={{ ...kick, marginLeft: 8, letterSpacing: '0.12em' }}>OPTIONAL</span>}</span>
        </li>)}
      </ul>
    </section>
  );
}
