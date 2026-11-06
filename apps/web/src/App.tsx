// Routes between the screens. Each screen is a prototype template plus its logic (src/screens/*), rendered by the
// Design Component runtime (src/dc/runtime.tsx). A thin bar shows the connection and any rule message.
import React from 'react';
import { makeScreen } from './dc/runtime';
import { expand } from './screens/shared';
import { getState, subscribe, type Screen } from './game/store';
import createT from './templates/create.template.html?raw';
import roomT from './templates/room.template.html?raw';
import mainT from './templates/main.template.html?raw';
import combatT from './templates/combat.template.html?raw';
import levelupT from './templates/levelup.template.html?raw';
import ultimateT from './templates/ultimate.template.html?raw';
import { CreateLogic } from './screens/create';
import { RoomLogic } from './screens/room';
import { MainLogic } from './screens/main';
import { CombatLogic } from './screens/combat';
import { LevelUpLogic } from './screens/levelup';
import { UltimateLogic } from './screens/ultimate';
import { Music } from './game/music';
import { Title } from './title/Title';
import { installButtonSounds, sfx, reducedMotion } from './game/sfx';
import { MemoryPanel } from './game/memory';
import { VotePanel } from './game/vote';
import { NarratorVoice } from './game/narratorVoice';
import { onVoice } from './game/voice';
import { poke } from './game/store';
import { PlaytestTools } from './game/report';
import { Tips } from './game/tips';

const SCREENS: Record<Screen, React.ComponentType<any>> = {
  home: Title as any,
  create: makeScreen(expand(createT), CreateLogic as any),
  room: makeScreen(expand(roomT), RoomLogic as any),
  main: makeScreen(expand(mainT), MainLogic as any),
  combat: makeScreen(expand(combatT), CombatLogic as any),
  levelup: makeScreen(expand(levelupT), LevelUpLogic as any),
  ultimate: makeScreen(expand(ultimateT), UltimateLogic as any),
};

onVoice(poke);
installButtonSounds();
export function App() {
  const st = React.useSyncExternalStore(subscribe, getState);
  const Screen = SCREENS[st.screen];
  // Leaving the title screen, the next screen slides in from the right (spec: title screen §4).
  const prev = React.useRef(st.screen); const slideIn = prev.current === 'home' && st.screen !== 'home' && !reducedMotion();
  React.useEffect(() => { prev.current = st.screen; }, [st.screen]);
  // A refused action gets the error sound.
  React.useEffect(() => { if (st.toast && !st.toast.ok) sfx('error'); }, [st.toast?.at]);
  React.useEffect(() => { window.scrollTo(0, 0); }, [st.screen]);
  // Keep the newest story lines in view when the player is already near the bottom.
  const n = st.game?.story.entries.length || 0;
  React.useEffect(() => {
    if (st.screen !== 'main') return;
    const nearBottom = window.innerHeight + window.scrollY > document.body.scrollHeight - 400;
    if (nearBottom) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [n, st.screen, st.game?.narrator.busy]);
  const bar = st.role && st.conn !== 'online' ? (st.conn === 'host-away' ? 'The host is offline. Your screen will update when they return.' : st.conn === 'error' ? 'Can\'t join: ' + (st.connNote || 'connection refused') : 'Connecting to room ' + st.code + '…') : null;
  return (
    <>
      {/* key: a fresh logic instance per screen and character, so local state never leaks between them */}
      <div key={'w' + st.screen} className={slideIn ? 'phc-screen-in' : undefined}><Screen key={st.screen + (st.levelupChar || '')} tick={st} /></div>
      {st.role && <Music game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} />}
      {st.role && <NarratorVoice game={st.game || null} />}
      {st.role && <VotePanel game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} />}
      {st.role === 'host' && <MemoryPanel game={st.game || null} isHost side={st.game?.phase === 'combat' ? 'left' : 'right'} />}
      <PlaytestTools />
      <Tips />
      {bar && <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, padding: '8px 16px', background: '#1C2536', borderBottom: '1px solid #2E3A50', color: '#E7EBF3', fontSize: 13, textAlign: 'center' }}>{bar}</div>}
      {st.toast && <div role={st.toast.ok ? 'status' : 'alert'} style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 70, maxWidth: 'min(640px, 92vw)', padding: '12px 18px', borderRadius: 10, background: '#10151F', border: '1px solid ' + (st.toast.ok ? '#6FEA77' : '#F65157'), color: '#E7EBF3', fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,.5)' }}>{st.toast.ok ? '✓ ' : ''}{st.toast.text}</div>}
    </>
  );
}
