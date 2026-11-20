// The room's overlays (the client load lane, 0.33): everything App draws over the screens while this player is in a
// room (the music, the Narrator's voice, votes, memory, the effects layer, the turn banners, cut-ins, the Proving
// Ground's tools, the mode's centre, the Narrator's seat, the mission board, the link line, the tips). They read the
// engine, so they are their own chunk: App waits for it before it shows a room's screen (as for a screen's chunk,
// screenLoad.ts ROOM_LAYER), and draws them exactly as it did when they were in the boot chunk.
import React from 'react';
import type { ClientState, Screen } from './store';
import { counted, tally } from './renderCount';
import { Music } from './music';
import { MemoryPanel } from './memory';
import { VotePanel } from './vote';
import { NarratorVoice } from './narratorVoice';
import { NetLine } from './NetLine';
import { Tips } from './tips';
import { StoryScroll } from './storyScroll';
import { FxLayer } from './fx/FxLayer';
import { TurnIntro, cue } from './turnIntro';
import { CutInLayer } from './spotlight/CutInLayer';
import { MissionLayer } from './missionBoard';
import { ModeCentre } from './modeCentre';
import { NarratorSeat } from '../narrator/desk';
import { leaveFlow } from '../screens/shell';

export { cue, leaveFlow };
const C = {
  Music: counted('Music', Music), NarratorVoice: counted('NarratorVoice', NarratorVoice), VotePanel: counted('VotePanel', VotePanel),
  MemoryPanel: counted('MemoryPanel', MemoryPanel), StoryScroll: counted('StoryScroll', StoryScroll), FxLayer: counted('FxLayer', FxLayer),
  TurnIntro: counted('TurnIntro', TurnIntro), CutInLayer: counted('CutInLayer', CutInLayer), ModeCentre: counted('ModeCentre', ModeCentre),
  MissionLayer: counted('MissionLayer', MissionLayer), Tips: counted('Tips', Tips),
};
const CSandbox = React.memo(function CSandbox({ C: Panel, v: _v, ...p }: { C: React.ComponentType<any>; v: number } & Record<string, any>) { tally('Sandbox'); return <Panel {...p} />; });

/** The overlays drawn before the playtest tools (App's order is kept: the same stacking as before). */
export function RoomOverlays({ st, screen, v, Sandbox, n, lastId }: { st: ClientState; screen: Screen; v: number; Sandbox: React.ComponentType<any> | null; n: number; lastId: string | undefined }) {
  return <>
    {st.role && <C.Music game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} v={v} />}
    {st.role && <C.NarratorVoice game={st.game || null} v={v} />}
    {st.role && <C.VotePanel game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} v={v} />}
    {st.role === 'host' && <C.MemoryPanel game={st.game || null} isHost side="left" compact v={v} />}
    {screen === 'main' && <C.StoryScroll count={n} lastId={lastId} busy={!!st.game?.narrator.busy} v={v} />}
    {st.role && <C.FxLayer game={st.game || null} screen={screen} v={v} />}
    {st.role && <C.TurnIntro game={st.game || null} meId={st.me.id} screen={screen} v={v} />}
    {/* Spotlight cut-ins (decision 113): torn eye strips over a blurred screen, z-index 64. */}
    {st.role && <C.CutInLayer game={st.game || null} screen={screen} v={v} />}
    {st.role && Sandbox && <CSandbox C={Sandbox} v={v} game={st.game || null} meId={st.me.id} isHost={st.role === 'host'} screen={screen} />}
    {st.role && <C.ModeCentre game={st.game || null} screen={screen} v={v} />}
    {st.role === 'host' && screen === 'main' && <NarratorSeat game={st.game || null} meId={st.me.id} />}
    {st.role && <C.MissionLayer game={st.game || null} screen={screen} v={v} />}
  </>;
}
/** The link line and the tips (after the playtest tools, as before). */
export function RoomTail({ st, v }: { st: ClientState; v: number }) {
  return <>
    {st.role && <NetLine game={st.game || null} role={st.role} />}
    <C.Tips v={v} />
  </>;
}
