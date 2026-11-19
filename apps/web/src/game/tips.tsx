// First-time tips (spec: First-time tips): one line the first time a player meets each part of a round. Each shows
// once per browser; "No more tips" turns them all off.
import React from 'react';
import { getState, subscribe } from './store';
import { usePresence, presenceCls } from './presence';
import { active } from '@engine';
import { DOORS, CLASS_DOORS, topDoor } from './doorView';
import { TAB_NAME } from './commands';

const LS = 'phc.tips';
const seen: Set<string> = (() => { try { return new Set(JSON.parse(localStorage.getItem(LS) || '[]')); } catch { return new Set(); } })();
const save = () => { try { localStorage.setItem(LS, JSON.stringify([...seen])); } catch { /* */ } };
/** Settings: show every tip again. */
export function resetTips() { seen.clear(); save(); }

type St = ReturnType<typeof getState>;
const mine = (st: St) => !!st.game && Object.values(st.game.characters).some((c: any) => c.owner === st.me.id);
const lines = (st: St, k: string) => (st.game?.story.entries || []).filter((e: any) => e.kind === k && !e.rerolled).length;
/** In a fight, it is my turn and my character's: that character (or null). */
const myTurnChar = (st: St): any => {
  const cb: any = st.game?.combat; if (st.screen !== 'combat' || !cb || cb.over) return null;
  const u: any = active(cb), ch: any = u && u.side === 'pc' && !u.downed && u.charId ? st.game!.characters[u.charId] : null;
  return ch && ch.owner === st.me.id ? ch : null;
};

/** The fight a tip is seen in (a fight has no id: its name and its turn order). */
const fightKey = (st: St): string => { const cb: any = st.game?.combat; return cb ? String(cb.name) + '|' + (cb.order || []).join(',') : ''; };
/** The fight in which a door tip was last shown: at most ONE door tip in a fight (the doors never nag). */
let doorTipFight = { fight: '', id: '' };
/** This door tip may show now: no OTHER door tip has shown in this fight. */
const doorTipFree = (st: St, id: string) => doorTipFight.fight !== fightKey(st) || doorTipFight.id === id;
const isDoorTip = (id: string) => id.startsWith('door:') || id.startsWith('class-door:');
/** It is my turn in a fight, my character's top door is this one, and no door tip has shown in this fight yet. */
export function myDoorTurn(st: St, skill: string): boolean {
  const ch = myTurnChar(st);
  return !!ch && topDoor(ch)?.skill === skill && doorTipFree(st, 'door:' + skill);
}
/** One tip per door with a line (data: skills.json door_line, through doorView.ts), once per browser, on my turn when it
 *  is my character's top door. */
export const DOOR_TIPS = DOORS.map((d) => ({ id: 'door:' + d.skill, title: ((d.tab && TAB_NAME[d.tab]) || d.name).toUpperCase(), text: d.line, when: (st: St) => myDoorTurn(st, d.skill) }));
/** A class's own job on its door (classes.json gain door_line: the Chaplain's Canticle), once per browser, in a fight where
 *  no door tip has shown yet. */
export const CLASS_DOOR_TIPS = CLASS_DOORS.map((d) => ({ id: 'class-door:' + d.cls + '.' + d.id, title: d.name.toUpperCase(), text: d.line,
  when: (st: St) => { const ch = myTurnChar(st); return !!ch && ch.classId === d.cls && doorTipFree(st, 'class-door:' + d.cls + '.' + d.id); } }));

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
  ...DOOR_TIPS,
  ...CLASS_DOOR_TIPS,
  { id: 'report', title: 'SOMETHING BROKE?', when: (st) => st.screen === 'main' && seen.has('round'),
    text: '⚑ Report (top bar) downloads one file with what happened, for Leon. Nothing is sent from here, and your API key is never in it.' },
];

export function Tips() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const live = !st.role || seen.has('*') ? undefined : TIPS.find((t) => !seen.has(t.id) && t.when(st));
  // Slides in from the right; "Got it" slides it back out.
  const { shown: tip, closing } = usePresence(live);
  if (live && isDoorTip(live.id)) doorTipFight = { fight: fightKey(st), id: live.id }; // this fight has had its door tip
  if (!tip) return null;
  const done = (all?: boolean) => { seen.add(all ? '*' : tip.id); save(); force(); };
  return (
    <div key={tip.id} role="status" aria-label={'Tip: ' + tip.title} className={presenceCls('phc-a-right', closing)} style={{ position: 'fixed', top: 70, right: 16, zIndex: 9, width: 'min(400px, 92vw)', padding: '12px 14px', borderRadius: 12, background: '#1C2536', border: '1px solid #FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', color: '#E7EBF3', fontFamily: "'Chakra Petch', sans-serif", display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: '#FFFFFF' }}>TIP · {tip.title}</span>
      <span style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.5 }}>{tip.text}</span>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => done(true)} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 0, background: 'transparent', color: '#A3AEC2', fontFamily: 'inherit', fontSize: 'var(--fs-sub)', cursor: 'pointer' }}>No more tips</button>
        <button type="button" onClick={() => done()} style={{ minHeight: 32, padding: '0 14px', borderRadius: 8, border: 0, background: '#E7EBF3', color: '#0A0D13', fontFamily: 'inherit', fontSize: 'var(--fs-sub)', fontWeight: 700, cursor: 'pointer' }}>Got it</button>
      </div>
    </div>
  );
}
