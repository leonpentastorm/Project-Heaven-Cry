// The fight tally as a small table (rules 1.47, build step 6): after a fight on the reward screen, and per stage and per
// run on the summary. The numbers are the engine's (tallyView.ts); nothing is counted here.
import React from 'react';
import { tipProps } from './actionTip';
import { type TallyV, TALLY_COLS } from './tallyView';

const ink = { panel: '#10151F', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF' };
const th: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: ink.muted, textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid ' + ink.line, whiteSpace: 'nowrap' };

/** One tally: a row a character, a column a number; what no one's turn owns is said under it. */
export function TallyTable({ t, compact }: { t: TallyV; compact?: boolean }) {
  const fs = compact ? 12 : 14;
  return (
    <div data-phc-tally={t.scope} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: compact ? 10 : 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line, overflowX: 'auto' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted }}>{t.caption}</span>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs }}>
        <thead><tr><th style={{ ...th, textAlign: 'left' }}>CHARACTER</th>{TALLY_COLS.map((c) => <th key={c.key} style={th} {...tipProps(c.tip)}>{c.head.toUpperCase()}</th>)}<th style={th} {...tipProps('Weapon attacks that landed, of those made')}>SHOTS HIT</th></tr></thead>
        <tbody>{t.rows.map((r) => (
          <tr key={r.id} data-phc-tally-row={r.id}>
            <td style={{ padding: '5px 6px', fontWeight: 700 }}>{r.name}</td>
            {TALLY_COLS.map((c) => <td key={c.key} data-phc-tally-cell={c.key} style={{ padding: '5px 6px', textAlign: 'right', color: r[c.key] ? ink.text : ink.muted }}>{r[c.key]}</td>)}
            <td data-phc-tally-cell="aim" style={{ padding: '5px 6px', textAlign: 'right', color: r.shots ? ink.text : ink.muted, whiteSpace: 'nowrap' }}>{r.aim}</td>
          </tr>))}</tbody>
      </table>
      {t.other.dealt || t.other.healed ? <span style={{ fontSize: 11, color: ink.muted }}>No one's turn: {t.other.dealt ? t.other.dealt + ' damage to foes' : ''}{t.other.dealt && t.other.healed ? ', ' : ''}{t.other.healed ? t.other.healed + ' healing' : ''}.</span> : null}
    </div>
  );
}
