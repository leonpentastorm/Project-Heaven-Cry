// Rerolls and edits by unanimous vote (spec: Rerolls and edits): the vote everyone sees, and the host's suggestions.
import React from 'react';
import type { GameState } from '@engine';
import { act } from './store';

const btn: React.CSSProperties = { minHeight: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #2E3A50', background: 'transparent', color: '#E7EBF3', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#A3AEC2' };

export function VotePanel({ game, meId, isHost }: { game: GameState | null; meId: string; isHost: boolean }) {
  const [hide, setHide] = React.useState(false);
  if (!game || game.phase === 'lobby' || !game.votes) return null;
  const { open: o, suggestions } = game.votes, name = (pid: string) => game.players.find((p) => p.id === pid)?.name || 'someone';
  const line = (id: string) => (game.story.entries.find((e) => e.id === id)?.text || '').slice(0, 160);
  return (
    <>
      {o && o.status === 'open' && (
        <div role="dialog" aria-label="Vote" style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 15, width: 'min(620px, 94vw)', padding: 16, borderRadius: 14, background: '#10151F', border: '2px solid #FFFFFF', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.12em' }}>VOTE · {o.kind === 'reroll' ? 'REROLL THE NARRATOR\'S TURN' : 'REWORD THE NARRATOR\'S LINE'}</span>
          <span style={{ fontSize: 12, color: '#A3AEC2' }}>Started by {name(o.from)}{o.suggestedBy ? ', suggested by ' + name(o.suggestedBy) : ''}. Everyone must say yes, or nothing happens.</span>
          <span style={{ fontFamily: 'Spectral, serif', fontSize: 15, fontStyle: 'italic', color: '#C9D3E3' }}>“{line(o.entryId)}…”</span>
          {o.note && <span style={{ fontSize: 13 }}><span style={label}>ASKED FOR · </span>{o.note}</span>}
          {o.kind === 'reroll' && <span style={{ fontSize: 13, color: '#F65157' }}>Undoes this turn and everything after it: {o.undo || 'nothing after it'}. The Narrator answers again.</span>}
          {o.kind === 'edit' && <span style={{ fontSize: 13, color: '#A3AEC2' }}>Only the words change. The Narrator refuses anything that would change what happened.</span>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {o.voters.map((p) => <span key={p} style={{ fontSize: 12, fontWeight: 700, color: o.yes.includes(p) ? '#6FEA77' : o.no.includes(p) ? '#F65157' : '#A3AEC2' }}>{o.yes.includes(p) ? '✓' : o.no.includes(p) ? '✕' : '…'} {name(p)}</span>)}
            {o.voters.includes(meId) && !o.yes.includes(meId) && !o.no.includes(meId) && <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" style={{ ...btn, background: '#E7EBF3', color: '#0A0D13', border: 0 }} onClick={() => act({ type: 'vote/cast', yes: true })}>Yes</button>
              <button type="button" style={{ ...btn, borderColor: '#F65157', color: '#F65157' }} onClick={() => act({ type: 'vote/cast', yes: false })}>No</button></span>}
          </div>
        </div>
      )}
      {isHost && suggestions.length > 0 && !hide && (
        <div role="region" aria-label="Suggestions" style={{ position: 'fixed', left: 16, top: 76, zIndex: 14, width: 'min(380px, 90vw)', padding: 12, borderRadius: 12, background: '#10151F', border: '1px solid #3B475D', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><span style={label}>SUGGESTIONS FOR YOU</span><button type="button" style={{ ...btn, minHeight: 28, marginLeft: 'auto', fontSize: 11 }} onClick={() => setHide(true)}>Hide</button></div>
          {suggestions.map((sg) => (
            <div key={sg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, borderRadius: 8, background: '#0D1119', border: '1px solid #232D3F' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{name(sg.by)} suggests {sg.kind === 'reroll' ? 'a reroll' : 'rewording'}</span>
              <span style={{ fontSize: 12, color: '#A3AEC2', fontStyle: 'italic' }}>“{line(sg.entryId).slice(0, 90)}…”</span>
              {sg.note && <span style={{ fontSize: 12 }}>{sg.note}</span>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={{ ...btn, minHeight: 30 }} disabled={!!(o && o.status === 'open')} onClick={() => {
                  const i = game.story.entries.findIndex((x) => x.id === sg.entryId), after = game.story.entries.slice(i + 1);
                  const undo = [after.filter((x) => x.kind === 'player').length + ' player actions', after.filter((x) => x.kind === 'check').length + ' rolls'].join(', ');
                  act({ type: 'vote/start', kind: sg.kind, entryId: sg.entryId, suggestionId: sg.id, undo }); }}>Start the vote</button>
                <button type="button" style={{ ...btn, minHeight: 30, color: '#A3AEC2' }} onClick={() => act({ type: 'vote/dismiss', id: sg.id })}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
