// The Survival run's screen between fights (survival-spec 8.2; rules 1.41, build step 3): the path map (PathMap.tsx, rules
// 1.48: lanes on a themed overland map; where the party stands, what it can reach, each player's mark) and the node's
// panel: what the node gave, the weapon pick after a fight (the rewards), the choices of a safe node.
// Rules 1.54 item 11: every run screen is the play screen's MIDDLE column (mounted by modeCentre.tsx), the character
// sheet on the left and the run's right panel (runPanels.tsx: the run, the run board, the squad and its one phase
// control) on the right; the camp (LoadoutScreen), a shop (ShopScreen), every other safe node (PlaceScreen) and the
// stage's end (StageScreen) take the middle in its place. Nothing here covers the side panels.
// It draws runView (runView.ts); every action is a `run/*` sent through the store.
import React from 'react';
import { act, getState, toast, poke } from './store';
import { placeOpen } from '@engine';
import { PlaceScreen } from './PlaceScreen';
import { runView, type RunNodeV, type OfferV, type ChoiceCharV } from './runView';
import { PathMap } from './PathMap';
import { gearIconUri } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { ICON } from './runIconSizes';
import { ShopScreen } from './ShopScreen';
import { LoadoutScreen } from './LoadoutScreen';
import { StageScreen } from './StageScreen';
import { boonIconSvg } from './boonIcons';
import { TallyTable } from './RunTally';
import { lastFightTally } from './tallyView';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 40, padding: '0 16px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' });
const marks = (n: number) => '◆'.repeat(n);
const PULSE = '@keyframes phcNodePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 7px rgba(255,255,255,.12)}}'
  + '.phc-node-lit>span:first-child{animation:phcNodePulse 2.2s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.phc-node-lit>span:first-child{animation:none}}';

function Offer({ o }: { o: OfferV }) {
  return (
    <div data-phc-offer={o.charId} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      <span style={kick}>{o.mine ? 'YOUR PICK · ' + o.name.toUpperCase() : o.name.toUpperCase() + (o.canPick ? ' · YOU MAY PICK FOR THEM' : ' IS PICKING')}</span>
      {o.canPick ? <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {o.cards.map((c) => (
            <button key={c.i} type="button" data-phc-pick={c.i} {...tipProps(c.tip)} onClick={() => act({ type: 'run/pick', charId: o.charId, choice: c.i })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', minHeight: 220, borderRadius: 12, border: '1px solid ' + (c.rarity === 'standard' ? ink.line : ink.text), background: ink.raised, color: ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center' }}>
              <img src={gearIconUri(c.id, undefined, { large: true })} alt="" width={ICON.reward} height={ICON.reward} style={{ display: 'block', objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</span>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', color: c.rarity === 'standard' ? ink.muted : ink.white }}>{c.rarityWord.toUpperCase()} {marks(c.marks)}</span>
              <span style={{ fontSize: 11, color: ink.muted }}>{c.category}</span>
              {c.lines.map((l) => <span key={l.key} data-phc-pick-line={l.key} style={{ fontSize: 12.5, color: ink.text }}>{l.label}: <b>{l.value}</b></span>)}
              <span style={{ marginTop: 'auto', fontSize: 13, color: ink.white }}>{c.price} credits</span>
            </button>
          ))}
        </div>
        {o.instead != null && <button type="button" data-phc-instead="" onClick={() => act({ type: 'run/pick', charId: o.charId, choice: 'credits' })} style={btn(false)}>Take {o.instead} credits instead</button>}
      </> : <span style={{ fontSize: 13, color: ink.muted }}>Waiting for {o.name}'s player.</span>}
    </div>
  );
}

/** Rules 1.43: the words over each group of a safe node's choices (the engine names the group; the client its heading). */
const GROUP: Record<string, string> = { grade: 'UPGRADE', relic: 'RELIC UPGRADE', repair: 'REPAIR', forge: 'MODS AND ARMOUR', fit: 'ARMOUR FITTING', train: 'TRAINING', shrine: 'BLESSINGS', trade: 'TRADES', lasting: 'PICK ONE' };
/** One character's choices at a safe node (the Forge, a training ground, a shrine, a crossroads, a rest's training, the
 * grade step at a shop) or its pick of kit: every option is the engine's, with its price and its reason when it can't. */
function Choices({ x, kit }: { x: ChoiceCharV; kit?: boolean }) {
  const groups = [...new Set(x.options.map((o) => o.group))];
  return (
    <div data-phc-choices={x.charId} data-phc-kit={kit ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      <span style={kick}>{(x.mine ? 'YOU · ' : '') + x.name.toUpperCase()} · <span data-phc-purse={x.charId} style={{ color: ink.white }}>{x.credits} CREDITS</span></span>
      {x.relics.length ? <span style={{ fontSize: 12, color: ink.muted }}>Boons: {x.relics.join(', ')}</span> : null}
      {!x.canAct ? <span style={{ fontSize: 13, color: ink.muted }}>{x.name}'s player chooses.</span> : groups.map((gname) => (
        <div key={gname} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...kick, fontSize: 10 }}>{GROUP[gname] || gname.toUpperCase()}</span>
          {x.options.filter((o) => o.group === gname).map((o) => (
            <button key={o.key} type="button" data-phc-choice={o.key} data-phc-why={o.why ? '' : undefined} aria-disabled={o.why ? 'true' : undefined}
              {...tipProps(o.detail + (o.why ? ' ' + o.why : ''))}
              onClick={(e) => { if (o.why) openTipOn(e.currentTarget); else act(o.action as any); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '6px 12px', borderRadius: 10, border: '1px solid ' + (o.why ? ink.line : ink.text), background: o.why ? 'transparent' : ink.raised, color: o.why ? ink.muted : ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>{o.label}{o.why ? <span style={{ display: 'block', fontSize: 11, color: ink.muted }}>{o.why}</span> : null}</span>
              {o.price ? <span style={{ fontSize: 12, color: ink.white, whiteSpace: 'nowrap' }}>{o.price} credits</span> : o.pays ? <span style={{ fontSize: 12, color: ink.ok, whiteSpace: 'nowrap' }}>+{o.pays} credits</span> : <span style={{ fontSize: 11, color: ink.muted }}>{o.costs || 'Free'}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

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

/** Rules 1.46: the place this browser walked out of (closed on this screen only; the squad walks on from the map). Kept
 * here, not in a component: the right panel's phase control (runPanels.tsx) closes it too. */
let closedNode: string | null = null;
export const placeClosedAt = () => closedNode;
export function closePlace(node: string | null) { closedNode = node; poke?.(); }

export function RunScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const closed = closedNode, setClosed = closePlace;
  useGiveToast(g, me);
  const v = g ? runView(g, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: ink.muted }}>No run is under way.</div>;
  const visitNode = g.run?.visit?.node || null, place = placeOpen(g as any);
  if (place && closed !== visitNode) return <PlaceScreen onLeave={() => setClosed(visitNode)} />; // rules 1.46: every safe node (in the middle since rules 1.54)
  if (v.state === 'loadout') return <LoadoutScreen />; // rules 1.52: the camp before node 1
  if (v.state === 'shop') return <ShopScreen />; // rules 1.42: the shop (spec 8.3)
  if (v.state === 'boon' || v.state === 'tile' || v.over) return <StageScreen />; // rules 1.44: the stage's end and the summary
  const pick = (n: RunNodeV, el: HTMLElement) => { if (n.state === 'reachable') act({ type: 'run/move', node: n.id }); else openTipOn(el); };
  const mine = v.offers.filter((o) => o.mine), others = v.offers.filter((o) => !o.mine), tally = lastFightTally(g);
  const rewards = v.offers.length > 0;
  return (
    <div data-phc-run-screen="" data-phc-run-state={v.state} style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px 28px', background: ink.ground, color: ink.text, fontFamily: "'Chakra Petch', sans-serif", boxSizing: 'border-box' }}>
      <style>{PULSE}</style>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600 }}>{v.title}</h1>
        {v.waiting ? <span data-phc-waiting="" style={{ fontSize: 13, color: ink.white }}>{v.waiting}</span> : null}
      </div>
      {/* the node's panel first when it holds something to do (the rewards, a safe node's choices): it is what is asked now */}
      {v.note || tally || v.kits.length || v.choices.length || rewards || place ? (
        <section aria-label={rewards ? 'Rewards' : 'This stop'} data-phc-rewards={rewards ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {v.note ? (
            <div data-phc-note="" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
              <span style={kick}>{v.note.kicker}</span>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{v.note.title}</span>
              {v.note.text ? <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 15, lineHeight: 1.55, color: '#DCE2EC' }}>{v.note.text}</p> : null}
              {v.note.lines.map((l, i) => <span key={i} style={{ fontSize: 13, lineHeight: 1.45 }}>{l}</span>)}
            </div>
          ) : null}
          {mine.map((o) => <Offer key={o.charId} o={o} />)}
          {others.map((o) => <Offer key={o.charId} o={o} />)}
          {tally ? <TallyTable t={tally} compact /> : null}
          {v.kits.map((x) => <Choices key={'kit-' + x.charId} x={x} kit />)}
          {place ? <button type="button" data-phc-reopen="" onClick={() => setClosed(null)} style={btn(true)}>Back to the {(v.note?.title || 'place')} ›</button> : v.choices.map((x) => <Choices key={'ch-' + x.charId} x={x} />)}
        </section>
      ) : null}
      <section aria-label="Path map" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <PathMap v={v} onPick={pick} />
        <span data-phc-map-hint="" style={{ fontSize: 12, color: ink.muted }}>{v.solo ? 'Click a lit stop to go there. Hover any stop to see what it holds.' : 'Click a lit stop. At a fork it marks your choice, and the squad goes when everyone has marked. Hover any stop to see what it holds.'}</span>
      </section>
    </div>
  );
}
