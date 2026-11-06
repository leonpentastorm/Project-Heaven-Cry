// First-time tips (spec: First-time tips): one line the first time a player meets each part of a round. Each shows
// once per browser; "No more tips" turns them all off.
import React from 'react';
import { getState, subscribe } from './store';

const LS = 'phc.tips';
const seen: Set<string> = (() => { try { return new Set(JSON.parse(localStorage.getItem(LS) || '[]')); } catch { return new Set(); } })();
const save = () => { try { localStorage.setItem(LS, JSON.stringify([...seen])); } catch { /* */ } };
/** Settings: show every tip again. */
export function resetTips() { seen.clear(); save(); }

type St = ReturnType<typeof getState>;
const mine = (st: St) => !!st.game && Object.values(st.game.characters).some((c: any) => c.owner === st.me.id);
const lines = (st: St, k: string) => (st.game?.story.entries || []).filter((e: any) => e.kind === k && !e.rerolled).length;

/** In order: the first one whose moment has come and that this browser hasn't seen is shown. */
export const TIPS: { id: string; title: string; text: string; when: (st: St) => boolean }[] = [
  { id: 'round', title: 'YOUR ROUND', when: (st) => st.screen === 'main' && st.game?.story.await === 'players' && mine(st),
    text: 'Each round you get one Say (type what your character says or does in "What do you do?") and a full turn of AP: open the Area map to move, shoot, sneak or use things. Pass gives up only the Say; End turn ends your turn. The Narrator answers once everyone is done.' },
  { id: 'narrator', title: 'THE NARRATOR SPEAKS', when: (st) => st.screen === 'main' && lines(st, 'narration') > 0,
    text: 'New Narrator lines are read aloud as they appear. 🔊 on any line plays it again. Turn auto-read off, or pick another voice, in the ♪ music panel (bottom corner).' },
  { id: 'voices', title: 'YOUR SKILLS TALK', when: (st) => st.screen === 'main' && lines(st, 'voice') > 0,
    text: 'Lines in a skill\'s colour are your inner voices. Only you see them, and they can be wrong. Click a skill on your sheet to ask it something, once a scene.' },
  { id: 'vote', title: 'DON\'T LIKE A LINE?', when: (st) => st.screen === 'main' && lines(st, 'narration') > 1,
    text: '⟲ and ✎ under a Narrator line suggest a reroll or a rewording. The host puts it to a vote; everyone must say yes, or nothing changes.' },
  { id: 'combat', title: 'COMBAT', when: (st) => st.screen === 'combat',
    text: '6 AP a turn. Pick an action, then a tile or a target: the cost and the odds show before you commit. One reaction per round. End your turn when you\'re done.' },
  { id: 'report', title: 'SOMETHING BROKE?', when: (st) => st.screen === 'main' && seen.has('round'),
    text: '⚑ Report (top bar) downloads one file with what happened, for Leon. Nothing is sent from here, and your API key is never in it.' },
];

export function Tips() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  if (!st.role || seen.has('*')) return null;
  const tip = TIPS.find((t) => !seen.has(t.id) && t.when(st));
  if (!tip) return null;
  const done = (all?: boolean) => { seen.add(all ? '*' : tip.id); save(); force(); };
  return (
    <div role="status" aria-label={'Tip: ' + tip.title} style={{ position: 'fixed', top: 70, right: 16, zIndex: 9, width: 'min(400px, 92vw)', padding: '12px 14px', borderRadius: 12, background: '#1C2536', border: '1px solid #FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', color: '#E7EBF3', fontFamily: "'Chakra Petch', sans-serif", display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: '#FFFFFF' }}>TIP · {tip.title}</span>
      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{tip.text}</span>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => done(true)} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 0, background: 'transparent', color: '#A3AEC2', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>No more tips</button>
        <button type="button" onClick={() => done()} style={{ minHeight: 32, padding: '0 14px', borderRadius: 8, border: 0, background: '#E7EBF3', color: '#0A0D13', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Got it</button>
      </div>
    </div>
  );
}
