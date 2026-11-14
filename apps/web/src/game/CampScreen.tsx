// The camp (survival-spec 13.8; rules 1.51): before node 1, full screen. Per character three large cards (the boon
// pick's cards: the line glyph, the name, the sentence with its number, the line's word in its attribute's ink, the
// worth against the cap); the camp's issue (the armour fitted free); co-op: the party strip with each player's mark
// ("Chosen"), the host's "Go on" for an away player (who takes the first card). It draws campView (campView.ts); every
// action is a `run/*` sent through the store. The cards are a radio group; Enter takes; reduced motion: no flip.
import React from 'react';
import { act, getState, go } from './store';
import { campView, type CampCharV } from './campView';
import { boonIconSvg } from './boonIcons';
import { tipProps, openTipOn } from './actionTip';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF', ok: '#6FEA77' };
const kick: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 44, padding: '0 20px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer' });
const CSS = '@keyframes phcCampIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.phc-camp-card{animation:phcCampIn .5s ease-out both}'
  + '.phc-camp-card:focus-visible{outline:2px solid #FFFFFF;outline-offset:3px}@media (prefers-reduced-motion: reduce){.phc-camp-card{animation:none}}';

function CampPick({ c }: { c: CampCharV }) {
  const done = !!c.picked;
  return (
    <section data-phc-camp={c.charId} aria-label={'Starting boon for ' + c.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={kick}>{(c.mine ? 'YOU · ' : '') + c.name.toUpperCase()} · RUN POWER {c.worth}{done ? ' · CHOSEN' : !c.canPick ? ' · ' + c.name.toUpperCase() + '\'S PLAYER PICKS' : !c.mine ? ' · AWAY? YOU MAY PICK FOR THEM' : ''}</span>
      <div role="radiogroup" aria-label={'Starting boons for ' + c.name} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(12px, 1.4vw, 24px)' }}>
        {c.cards.map((k, n) => {
          const taken = c.picked === k.id, off = done || !c.canPick || !!k.why;
          return (
            <button key={k.id} type="button" role="radio" aria-checked={taken ? 'true' : 'false'} className="phc-camp-card" data-phc-start={k.id} data-phc-why={k.why ? '' : undefined} aria-disabled={off ? 'true' : undefined}
              {...tipProps(k.name + '. ' + k.text + ' Line: ' + k.lineWord + '. Worth ' + k.worthLine + '.' + (k.why ? ' ' + k.why : ''))}
              onClick={(e) => { if (off) openTipOn(e.currentTarget); else act({ type: 'run/boon', charId: c.charId, choice: k.i }); }}
              style={{ animationDelay: n * 80 + 'ms', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'clamp(18px, 1.6vw, 28px) 18px', minHeight: 'clamp(280px, 32vh, 400px)', borderRadius: 16,
                border: taken ? '2px solid ' + ink.white : '1px solid ' + (off ? ink.line : ink.muted), background: 'linear-gradient(180deg, rgba(28,37,54,.94) 0%, rgba(16,21,31,.94) 100%)', color: off && !taken ? ink.muted : ink.text, fontFamily: 'inherit', textAlign: 'center', cursor: off ? 'default' : 'pointer' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 'clamp(76px, 6vw, 104px)', height: 'clamp(76px, 6vw, 104px)', borderRadius: '50%', border: '1px solid ' + k.ink, background: ink.ground, color: ink.white }} dangerouslySetInnerHTML={{ __html: boonIconSvg(k.id, 56) }} />
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(22px, 1.7vw, 30px)', fontWeight: 600 }}>{k.name}</span>
              <span style={{ fontSize: 'clamp(14px, 1vw, 17px)', lineHeight: 1.5, color: '#DCE2EC', maxWidth: 360 }}>{k.text}</span>
              <span data-phc-line={k.line} style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: k.ink }}>{k.lineWord.toUpperCase()}</span>
              <span style={{ marginTop: 'auto', fontSize: 13, letterSpacing: '0.04em', color: ink.white }}>{k.worthLine}</span>
              {taken ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: ink.ok }}>✓ CHOSEN</span> : k.why ? <span style={{ fontSize: 12, color: ink.muted }}>{k.why}</span> : !off ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: ink.white }}>TAKE IT</span> : null}
            </button>
          );
        })}
      </div>
      <div data-phc-camp-fit={c.charId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(16,21,31,.92)', border: '1px solid ' + ink.line }}>
        <span style={kick}>THE CAMP'S ISSUE</span>
        <span style={{ fontSize: 14 }}>Armour class <b>{c.fit.now}</b></span>
        {c.fit.action && c.canPick ? <button type="button" data-phc-fit={c.charId} aria-disabled={c.fit.why ? 'true' : undefined} {...tipProps('The armourer fits it at the camp for nothing, once, before the first node.' + (c.fit.why ? ' ' + c.fit.why : ''))}
          onClick={(e) => { if (c.fit.why) openTipOn(e.currentTarget); else act(c.fit.action); }} style={btn(!c.fit.why)}>{c.fit.label}</button>
          : <span style={{ fontSize: 13, color: ink.muted }}>{c.fit.label}</span>}
      </div>
    </section>
  );
}

/** The camp, full screen (it replaces the path map while the run is at its camp). */
export function CampScreen() {
  const st = getState(), g = st.game, me = st.me.id, v = g ? campView(g, me) : null;
  if (!g || !v) return null;
  return (
    <div data-phc-camp-screen="" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: ink.text, fontFamily: "'Chakra Petch', sans-serif",
      background: (v.backdrop ? 'linear-gradient(180deg, rgba(10,13,19,.72) 0%, rgba(10,13,19,.9) 60%, #0A0D13 100%), center / cover no-repeat url("' + v.backdrop + '")' : 'radial-gradient(ellipse at 50% 0%, #141B28 0%, #0A0D13 70%)') }}>
      <style>{CSS}</style>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderBottom: '1px solid ' + ink.line, background: 'rgba(16,21,31,.94)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em' }}>SURVIVAL</span>
        <span style={{ fontSize: 14 }}>Stage 1 · before the first node</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: ink.muted }}>Seed {v.seed}</span>
        <button type="button" onClick={() => go('room')} style={{ ...btn(false), minHeight: 36 }}>The room</button>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 26, padding: 'clamp(20px, 2.4vw, 48px)', maxWidth: 1500, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <h1 data-phc-camp-title="" style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 'clamp(30px, 2.6vw, 44px)', fontWeight: 600, letterSpacing: '0.04em' }}>THE CAMP</h1>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(17px, 1.3vw, 22px)', color: '#DCE2EC' }}>Choose what you carry into the first fight.</span>
          {v.waiting ? <span data-phc-waiting="" style={{ fontSize: 14, color: ink.white }}>{v.waiting}</span> : null}
        </div>
        {v.chars.map((c) => <CampPick key={c.charId} c={c} />)}
        {!v.solo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid ' + ink.line, flexWrap: 'wrap' }}>
            {v.party.map((p) => <span key={p.id} data-phc-camp-mark={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: p.chosen ? ink.ok : ink.muted }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 700, background: p.color, color: ink.ground }}>{p.initials}</span>{p.name}: {p.chosen ? 'Chosen' : p.online ? 'choosing' : 'away'}</span>)}
            {v.canGo ? <button type="button" data-phc-camp-go="" {...tipProps('Sends the squad on now. Anyone who has not picked takes the first card.')} onClick={() => act({ type: 'run/go' })} style={{ ...btn(true), marginLeft: 'auto' }}>Go on · away players take the first card</button> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
