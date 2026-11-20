// THE FIGHT NODE'S CHOICE (rules 1.87 items 7500, 7511; Leon, 20 Nov 2026: "every combat node have a frontal attack or
// try ambushing option"): the middle column of the play screen while the run waits at a fight node (run.state engage).
// Two choices for the squad, the host's to make: Walk in, or Try an ambush with the roll's terms, the TN and the chance in
// numbers and words (the dice are transparent); when a scout goes ahead, its line and the line-up. The side panels stay
// (every mode keeps its left and right panels). It draws the engine's engageView; the one action is run/engage.
import React from 'react';
import { act, getState } from './store';
import { engageView } from '@engine';
import { PlaceBar } from './PlaceBar';

const ink = { panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF', ground: '#0A0D13' };
const sign = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line, flex: '1 1 280px', minWidth: 0 };
const btn = (on: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 18px', borderRadius: 10, border: 0, background: on ? ink.text : ink.raised, color: on ? ink.ground : ink.muted, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: on ? 'pointer' : 'not-allowed', alignSelf: 'flex-start' });

export function EngageScreen() {
  const st = getState(), g: any = st.game, me = st.me.id;
  const v = g ? engageView(g, me) : null;
  if (!v) return null;
  const a = v.ambush, sum = a.parts.map((p) => sign(p.add) + ' ' + p.label).join(' ');
  return (
    <div data-phc-engage-screen="" style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', color: ink.text, fontFamily: "'Chakra Petch', sans-serif" }}>
      <PlaceBar name={v.ask} role={v.head} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px 28px' }}>
        {v.scout ? (
          <section data-phc-scout="" aria-label="Scout" style={{ ...card, flex: 'none', borderColor: ink.white }}>
            <span style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: ink.muted }}>{v.scout.line.toUpperCase()}</span>
            <span data-phc-lineup="" style={{ fontSize: 15, lineHeight: 1.5 }}>{v.scout.text}</span>
          </section>
        ) : null}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <section aria-label={v.walk.label} style={card}>
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{v.walk.label}</span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#DCE2EC' }}>{v.walk.text}</p>
            <button type="button" data-phc-engage="walk" disabled={!v.chooses} onClick={() => act({ type: 'run/engage', how: 'walk' } as any)} style={btn(v.chooses)}>{v.walk.label}</button>
          </section>
          <section aria-label={a.label} style={card}>
            <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{a.label}</span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#DCE2EC' }}>{a.text}</p>
            <div data-phc-ambush-odds="" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8, background: ink.raised }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>d20 {sum} = d20 {sign(a.mod)} vs TN {a.tn}</span>
              <span data-phc-ambush-chance="" style={{ fontSize: 15, color: ink.white }}>{a.words}</span>
              <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{v.members.map((m) => m.name + ' ' + sign(m.mod) + ' (' + m.skillName + ')').join(' · ')}</span>
            </div>
            <button type="button" data-phc-engage="ambush" disabled={!v.chooses} onClick={() => act({ type: 'run/engage', how: 'ambush' } as any)} style={btn(v.chooses)}>{a.label}</button>
          </section>
        </div>
        {!v.chooses ? <span data-phc-waiting="" style={{ fontSize: 15, color: ink.white }}>{v.waiting}</span> : null}
      </div>
    </div>
  );
}
