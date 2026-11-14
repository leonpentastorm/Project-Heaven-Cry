// The stage's end (survival-spec 8.2; rules 1.44, build step 5): after the Boss, the boon pick (three large cards per
// character: the boon's glyph, its name, its sentence with its number from data, its worth against the run's cap), then
// the next tile (two or three cards: the setting's backdrop or a plain panel, its name and line, its Boss, its boon
// theme, what it still waits for), leaned like a node; Retire keeps the score; and the run's summary when it is over.
// It draws stageView (stageView.ts); every action is a `run/*` sent through the store.
import React from 'react';
import { act, getState, go, saveToLibrary, toast } from './store';
import { stageView, draftOf, type BoonPickV, type TileCardV, type SummaryV } from './stageView';
import { boonIconSvg } from './boonIcons';
import { tipProps, openTipOn } from './actionTip';
import { TallyTable } from './RunTally';
import { summaryTallies } from './tallyView';
import { downloadRunReport } from './runReport';
import { scrub } from './debug';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF', ok: '#6FEA77' };
const kick: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 44, padding: '0 20px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer' });
const title: React.CSSProperties = { margin: 0, fontFamily: "'Spectral', serif", fontSize: 'clamp(28px, 2.4vw, 40px)', fontWeight: 600, lineHeight: 1.15 };

function BoonPick({ b }: { b: BoonPickV }) {
  return (
    <section data-phc-boons={b.charId} aria-label={'Boons for ' + b.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={kick}>{(b.mine ? 'YOUR BOON · ' : '') + b.name.toUpperCase()} · BOON ROOM {b.worth}{!b.canPick ? ' · ' + b.name.toUpperCase() + '\'S PLAYER PICKS' : !b.mine ? ' · YOU MAY PICK FOR THEM' : ''}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(12px, 1.4vw, 24px)' }}>
        {b.cards.map((c) => (
          <button key={c.id} type="button" data-phc-boon={c.id} data-phc-why={c.why ? '' : undefined} aria-disabled={!b.canPick || c.why ? 'true' : undefined}
            {...tipProps(c.name + '. ' + c.text + (c.why ? ' ' + c.why : ''))}
            onClick={(e) => { if (!b.canPick || c.why) openTipOn(e.currentTarget); else act({ type: 'run/boon', charId: b.charId, choice: c.i }); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'clamp(18px, 1.6vw, 28px) 18px', minHeight: 'clamp(280px, 30vh, 380px)', borderRadius: 16,
              border: '1px solid ' + (c.why || !b.canPick ? ink.line : ink.muted), background: 'linear-gradient(180deg, #1C2536 0%, #10151F 100%)', color: c.why ? ink.muted : ink.text, fontFamily: 'inherit', textAlign: 'center', cursor: b.canPick && !c.why ? 'pointer' : 'default' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 'clamp(76px, 6vw, 104px)', height: 'clamp(76px, 6vw, 104px)', borderRadius: '50%', border: '1px solid ' + ink.line, background: ink.ground, color: ink.white }} dangerouslySetInnerHTML={{ __html: boonIconSvg(c.id, 56) }} />
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(22px, 1.7vw, 30px)', fontWeight: 600 }}>{c.name}</span>
            <span style={{ fontSize: 'clamp(14px, 1vw, 17px)', lineHeight: 1.5, color: '#DCE2EC', maxWidth: 360 }}>{c.text}</span>
            <span style={{ marginTop: 'auto', fontSize: 13, letterSpacing: '0.04em', color: c.worth ? ink.white : ink.muted }}>{c.worthLine}</span>
            {c.why ? <span style={{ fontSize: 12, color: ink.muted }}>{c.why}</span> : b.canPick ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: ink.white }}>TAKE IT</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function TileCard({ t, mine }: { t: TileCardV; mine: boolean }) {
  return (
    <button type="button" data-phc-tile={t.id} data-phc-setting={t.setting} aria-pressed={mine ? 'true' : 'false'} {...tipProps(t.name + '. ' + t.line + ' Boons: ' + t.boons.join(', ') + '.')}
      onClick={() => act({ type: 'run/tile', tile: t.id })}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, overflow: 'hidden', textAlign: 'left', borderRadius: 16, border: mine ? '2px solid ' + ink.white : '2px solid ' + ink.line, background: ink.panel, color: ink.text, fontFamily: 'inherit', cursor: 'pointer' }}>
      <span aria-hidden="true" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', background: t.art ? 'center / cover no-repeat url("' + t.art + '")' : 'radial-gradient(ellipse at 50% 35%, #1C2536 0%, #10151F 80%)', borderBottom: '1px solid ' + ink.line }}>
        {t.art ? null : <span style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 12, letterSpacing: '0.18em', color: ink.muted }}>{t.setting.toUpperCase()}</span>}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px 18px' }}>
        <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(22px, 1.6vw, 28px)', fontWeight: 600 }}>{t.name}</span>
        <span style={{ fontSize: 'clamp(14px, 0.95vw, 16px)', lineHeight: 1.5, color: '#DCE2EC' }}>{t.line}</span>
        <span style={{ fontSize: 13, color: ink.muted }}>Boss: <span style={{ color: ink.text }}>{t.boss}</span> · Boons: <span style={{ color: ink.white }}>{t.theme}</span> ({t.boons.join(', ')})</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 22 }}>
          {mine ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: ink.white }}>✓ YOUR MARK</span> : null}
          {t.leans.map((l) => <span key={l.initials} aria-label={l.name} style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 700, background: l.color, color: ink.ground }}>{l.initials}</span>)}
        </span>
      </span>
    </button>
  );
}

function Summary({ s }: { s: SummaryV }) {
  const g = getState().game!;
  const keep = (id: string) => { const d = draftOf(g, id); if (!d) return; saveToLibrary(d as any); toast('Kept as a draft: ' + String((d as any).name) + '.', true); };
  return (
    <div data-phc-summary={s.how} style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={kick}>{s.kicker}</span>
        <h1 style={title}>{s.title}</h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {s.lines.map((l) => <span key={l} data-phc-score="" style={{ padding: '8px 14px', borderRadius: 10, background: ink.raised, fontSize: 16, fontWeight: 700 }}>{l}</span>)}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table data-phc-stages="" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead><tr>{['Stage', 'Tile', 'Stops', 'Fights', 'Foes dropped', 'Credits earned', 'Upgrades', 'Boons'].map((h) => <th key={h} style={{ ...kick, textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid ' + ink.line }}>{h.toUpperCase()}</th>)}</tr></thead>
          <tbody>{s.stages.map((r) => (
            <tr key={r.stage} data-phc-stage-row={r.stage}>
              {[r.stage, r.setting, r.nodes, r.fights, r.kills, r.credits, r.steps, r.boons].map((v, i) => <td key={i} style={{ padding: '10px', borderBottom: '1px solid ' + ink.line, color: i === 7 ? '#DCE2EC' : ink.text }}>{v}</td>)}
            </tr>))}</tbody>
        </table>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {s.members.map((m) => (
          <div key={m.id} data-phc-member-end={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{m.name}</span>
            <span style={{ fontSize: 14, color: ink.muted }}>Level <span style={{ color: ink.white }}>{m.level}</span> · {m.classLine}</span>
            <span style={{ fontSize: 14, color: '#DCE2EC' }}>Boons: {m.boons}</span>
            {m.mine ? <button type="button" data-phc-keep={m.id} onClick={() => keep(m.id)} style={{ ...btn(false), marginTop: 6 }}>Keep {m.name} as a draft (level {m.level})</button> : null}
          </div>
        ))}
      </div>
      <section aria-label="What each character did" data-phc-tallies="" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={kick}>WHAT EACH OF YOU DID</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', gap: 14 }}>{summaryTallies(g).map((t) => <TallyTable key={t.caption} t={t} />)}</div>
      </section>
      <div style={{ display: 'flex', gap: 12 }}><button type="button" data-phc-report-run="" {...tipProps('Saves one file with the seed, the stages, every fight\'s tally and each character\'s build. Nothing is sent.')} onClick={() => downloadRunReport(g, scrub, toast)} style={btn(false)}>Report a run</button><button type="button" data-phc-to-room="" onClick={() => go('room')} style={btn(true)}>Back to the room</button></div>
    </div>
  );
}

/** The stage's end and the summary, full screen (it replaces the path map while the run is at a boon, a tile or over). */
export function StageScreen() {
  const st = getState(), g = st.game, me = st.me.id, v = g ? stageView(g, me) : null;
  if (!g || !v) return null;
  return (
    <div data-phc-stage-screen={v.state} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at 50% 0%, #141B28 0%, #0A0D13 70%)', color: ink.text, fontFamily: "'Chakra Petch', sans-serif" }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderBottom: '1px solid ' + ink.line, background: ink.panel }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em' }}>SURVIVAL</span>
        <span style={{ fontSize: 14 }}>{v.summary ? 'The run is over' : 'Stage ' + v.stage + ' cleared'}</span>
        <button type="button" onClick={() => go('room')} style={{ ...btn(false), marginLeft: 'auto', minHeight: 36 }}>The room</button>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28, padding: 'clamp(20px, 2.4vw, 48px)', maxWidth: 1500, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {v.summary ? <Summary s={v.summary} /> : <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <span data-phc-cleared="" style={{ fontSize: 'clamp(22px, 1.8vw, 30px)', fontWeight: 700, letterSpacing: '0.16em' }}>STAGE {v.stage} CLEARED</span>
            <h1 style={{ ...title, fontSize: 'clamp(22px, 1.8vw, 30px)', color: '#DCE2EC' }}>{v.state === 'boon' ? 'Pick a boon for the rest of the run' : 'Pick the next tile'}</h1>
            {v.waiting ? <span data-phc-waiting="" style={{ fontSize: 14, color: ink.white }}>{v.waiting}</span> : null}
          </div>
          {v.state === 'boon' ? v.boons.map((b) => <BoonPick key={b.charId} b={b} />) : (
            <section aria-label="The next tile" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={kick}>STAGE {v.stage + 1} · {v.solo ? 'CLICK A TILE TO GO' : 'MARK A TILE. THE SQUAD GOES WHEN EVERYONE HAS'}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + Math.max(2, v.tiles.length) + ', minmax(0, 1fr))', gap: 'clamp(14px, 1.6vw, 28px)' }}>
                {v.tiles.map((t) => <TileCard key={t.id} t={t} mine={v.myTile === t.id} />)}
              </div>
              {v.canGo ? <div><button type="button" data-phc-go="" onClick={() => act({ type: 'run/go' })} style={btn(true)}>Go now</button></div> : null}
            </section>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 8, borderTop: '1px solid ' + ink.line }}>
            {v.canRetire ? <button type="button" data-phc-retire="" onClick={() => act({ type: 'run/retire' })} style={btn(false)}>Retire the run · keep the score</button> : <span style={{ fontSize: 13, color: ink.muted }}>The host can retire the run here and keep the score.</span>}
          </div>
        </>}
      </main>
    </div>
  );
}
