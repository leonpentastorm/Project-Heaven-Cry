// The Survival run's screen between fights (survival-spec 8.2; rules 1.41, build step 3): the path map (PathMap.tsx, rules
// 1.48: lanes on a themed overland map; where the party stands, what it can reach, each player's mark) and the node's
// panel: what the node gave, the weapon pick after a fight (the rewards), the choices of a safe node.
// Rules 1.54 item 11: every run screen is the play screen's MIDDLE column (mounted by modeCentre.tsx), the character
// sheet on the left and the run's right panel (runPanels.tsx: the run, the run board, the squad and its one phase
// control) on the right; the camp (LoadoutScreen), a shop (ShopScreen), every other safe node (PlaceScreen) and the
// stage's end (StageScreen) take the middle in its place. Nothing here covers the side panels.
// It draws runView (runView.ts); every action is a `run/*` sent through the store.
import React from 'react';
import { act, getState, toast } from './store';
import { placeOpen } from '@engine';
import { PlaceScreen } from './PlaceScreen';
import { placeClosed, closePlace } from './placeMark';
import { runView, type RunNodeV } from './runView';
import { PathMap } from './PathMap';
import { openTipOn } from './actionTip';
import { Offer, Choices } from './rewardCards';
import { rewardPanelView } from './rewardPanelView';
import { RewardPanel, RewardDock } from './RewardPanel';
import { survivalRun } from '@engine';
import { ShopScreen } from './ShopScreen';
import { PlaceBar, BarNumber } from './PlaceBar';
import { MoveOn } from './runPanels';
import { LoadoutScreen } from './LoadoutScreen';
import { StageScreen } from './StageScreen';
import { EngageScreen } from './EngageScreen';
import { boonIconSvg } from './boonIcons';
import { TallyTable } from './RunTally';
import { lastFightTally } from './tallyView';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 40, padding: '0 16px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' });
const PULSE = '@keyframes phcNodePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 7px rgba(255,255,255,.12)}}'
  + '.phc-node-lit>span:first-child{animation:phcNodePulse 2.2s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.phc-node-lit>span:first-child{animation:none}}';

/** Rules 1.46: a give that arrives says so on the receiver's screen (a toast in the engine's words), wherever the
 * receiver is in the run: the shop, a place, the map. Each give entry is seen once. */
const seenGives = new Set<string>(); let givesPrimed = false;
function useGiveToast(g: any, me: string) {
  const entries: any[] = g?.story?.entries || [];
  const last = entries.length ? entries[entries.length - 1].id : '';
  React.useEffect(() => {
    if (!givesPrimed) { givesPrimed = true; for (const e of entries) if (e.head === 'A GIVE') seenGives.add(e.id); return; } // a page loaded mid-run: old gives are old
    for (const e of entries.slice(-8)) {
      if (e.head !== 'A GIVE' || seenGives.has(e.id)) continue;
      seenGives.add(e.id);
      if (e.charId && g.characters[e.charId]?.owner === me) toast(e.text, true);
    }
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps
}


/** Rules 1.64: the reward a viewer closed the panel on (it stays closed for that reward only; the pinned bar reopens it). */
let closedOn: string | null = null;
/** Rules 1.64: the say line's words and when they were said (the engine's reason a map click was refused). */
function useSay(): [string | null, (t: string) => void] {
  const [say, setSay] = React.useState<{ t: string; n: number } | null>(null);
  React.useEffect(() => { if (!say) return; const id = setTimeout(() => setSay(null), Number(survivalRun.reward_panel.say_ms) || 5000); return () => clearTimeout(id); }, [say]);
  return [say ? say.t : null, (t: string) => setSay((o) => ({ t, n: (o?.n || 0) + 1 }))];
}

export function RunScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  useGiveToast(g, me);
  const [, redraw] = React.useReducer((x: number) => x + 1, 0);
  const [say, setSay] = useSay();
  const v = g ? runView(g, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: ink.muted }}>No run is under way.</div>;
  const place = placeOpen(g as any), run = g.run;
  if (place && !placeClosed(run)) return <PlaceScreen onLeave={() => closePlace(run)} />; // rules 1.46: every safe node (in the middle since rules 1.54)
  if (v.state === 'loadout') return <LoadoutScreen />; // rules 1.52: the camp before node 1
  if (v.state === 'shop') return <ShopScreen />; // rules 1.42: the shop (spec 8.3)
  if (v.state === 'engage') return <EngageScreen />; // rules 1.90: a fight node's choice, Walk in or Try an ambush
  if (v.state === 'boon' || v.state === 'tile' || v.over) return <StageScreen />; // rules 1.44: the stage's end and the summary
  // rules 1.64: the reward panel (the viewer's pay and own picks), open by itself until closed for this reward
  const rp = rewardPanelView(g, me, v), panelOpen = !!rp && rp.owe && closedOn !== rp.key;
  const reopen = () => { closedOn = null; redraw(); };
  // rules 1.64: the map never eats a click: a lit stop goes; else a pick still owed reopens the panel, and anything
  // else the engine refuses says its reason on the say line (and the stop's hover card opens, as before)
  const pick = (n: RunNodeV, el: HTMLElement) => {
    if (rp?.owe) { reopen(); return; }
    if (n.state === 'reachable' && v.state === 'map') { act({ type: 'run/move', node: n.id }); return; }
    if (n.why) setSay(n.why);
    openTipOn(el);
  };
  const others = v.offers.filter((o) => !o.mine), otherKits = v.kits.filter((k) => !k.mine), tally = lastFightTally(g);
  const rewards = v.offers.length > 0, myself = v.party.find((x) => x.mine);
  return (
    <div data-phc-run-screen="" data-phc-run-state={v.state} style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', background: ink.ground, color: ink.text, fontFamily: "'Chakra Petch', sans-serif", boxSizing: 'border-box' }}>
      <style>{PULSE}</style>
      {/* the place header (PlaceBar, the visibility standard): what this is, your credits, the button that moves on */}
      <PlaceBar name={v.title} money={myself ? <BarNumber label="CREDITS" n={myself.credits} mark={{ 'data-phc-bar-credits': '' }} /> : null} actions={<MoveOn />}
        foot={v.waiting || (v.blocked && rp && !rp.owe) ? <span data-phc-waiting="" style={{ fontSize: 'var(--fs-body)', color: ink.white }}>{v.waiting || v.blocked}</span> : null} />
      {panelOpen ? <RewardPanel p={rp!} onClose={() => { closedOn = rp!.key; redraw(); }} /> : null}
      <RewardDock say={panelOpen ? null : say} owed={!!rp?.owe && !panelOpen} onOpen={reopen} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px 28px' }}>
      {/* the node's panel first when it holds something to do (the rewards, a safe node's choices): it is what is asked now */}
      {/* 0.33 polish: while the reward panel is open its heading says what the note says: the note is not drawn twice */}
      {(v.note && !panelOpen) || tally || v.kits.length || v.choices.length || rewards || place ? (
        <section aria-label={rewards ? 'Rewards' : 'This stop'} data-phc-rewards={rewards ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {v.note && !panelOpen ? (
            <div data-phc-note="" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
              <span style={kick}>{v.note.kicker}</span>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{v.note.title}</span>
              {v.note.text ? <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 15, lineHeight: 1.55, color: '#DCE2EC' }}>{v.note.text}</p> : null}
              {v.note.lines.map((l, i) => <span key={i} style={{ fontSize: 'var(--fs-sub)', lineHeight: 1.45 }}>{l}</span>)}
            </div>
          ) : null}
          {/* rules 1.64: the viewer's own picks are in the reward panel; the others' (the host may pick for an away player) stay here */}
          {others.map((o) => <Offer key={o.charId} o={o} />)}
          {tally ? <TallyTable t={tally} compact /> : null}
          {otherKits.map((x) => <Choices key={'kit-' + x.charId} x={x} kit />)}
          {place ? <button type="button" data-phc-reopen="" onClick={() => closePlace(null)} style={btn(true)}>Back to the {(v.note?.title || 'place')} ›</button> : v.choices.map((x) => <Choices key={'ch-' + x.charId} x={x} />)}
        </section>
      ) : null}
      <section aria-label="Path map" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <PathMap v={v} onPick={pick} />
        <span data-phc-map-hint="" style={{ fontSize: 'var(--fs-sub)', color: ink.muted, textAlign: 'center' }}>{v.solo ? 'Click a lit stop to go there. Hover any stop to see what it holds.' : 'Click a lit stop. At a fork it marks your choice, and the squad goes when everyone has marked. Hover any stop to see what it holds.'}</span>
      </section>
      </div>
    </div>
  );
}
