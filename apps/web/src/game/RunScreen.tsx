// The Survival run's screen between fights (survival-spec 8.2; rules 1.41, build step 3): the path map (PathMap.tsx, rules
// 1.48: lanes on a themed overland map; where the party stands, what it can reach, each player's mark), the party strip
// (level, HP, credits, a level-up waiting), and the node's panel: what the node gave, the weapon pick after a fight,
// the stage cleared after the Boss. A shop or another safe node replaces the whole screen (ShopScreen.tsx, PlaceScreen.tsx).
// It draws runView (runView.ts); every action is a `run/*` sent through the store.
import React from 'react';
import { act, getState, go, toast } from './store';
import { placeOpen } from '@engine';
import { PlaceScreen } from './PlaceScreen';
import { runView, type RunNodeV, type OfferV, type ChoiceCharV } from './runView';
import { PathMap } from './PathMap';
import { gearIconUri } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { ShopScreen } from './ShopScreen';
import { StageScreen } from './StageScreen';
import { WearBar } from './WearBar';
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
      <span style={kick}>{o.mine ? 'YOUR PICK · ' + o.name.toUpperCase() : o.name.toUpperCase() + (o.canPick ? ' · AWAY? YOU MAY PICK FOR THEM' : ' IS PICKING')}</span>
      {o.canPick ? <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {o.cards.map((c) => (
            <button key={c.i} type="button" data-phc-pick={c.i} {...tipProps(c.tip)} onClick={() => act({ type: 'run/pick', charId: o.charId, choice: c.i })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', minHeight: 150, borderRadius: 10, border: '1px solid ' + (c.rarity === 'standard' ? ink.line : ink.text), background: ink.raised, color: ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center' }}>
              <img src={gearIconUri(c.id, undefined, { large: true })} alt="" width={52} height={52} style={{ display: 'block', objectFit: 'contain' }} />
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{c.name}</span>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', color: c.rarity === 'standard' ? ink.muted : ink.white }}>{c.rarityWord.toUpperCase()} {marks(c.marks)}</span>
              <span style={{ fontSize: 11, color: ink.muted }}>{c.category}</span>
              {c.lines.map((l) => <span key={l.key} data-phc-pick-line={l.key} style={{ fontSize: 11, color: ink.text }}>{l.label}: <b>{l.value}</b></span>)}
              <span style={{ fontSize: 12, color: ink.white }}>{c.price} credits</span>
            </button>
          ))}
        </div>
        <button type="button" data-phc-instead="" onClick={() => act({ type: 'run/pick', charId: o.charId, choice: 'credits' })} style={btn(false)}>Take {o.instead} credits instead</button>
      </> : <span style={{ fontSize: 13, color: ink.muted }}>Waiting for {o.name}'s player.</span>}
    </div>
  );
}

/** Rules 1.43: the words over each group of a safe node's choices (the engine names the group; the client its heading). */
const GROUP: Record<string, string> = { grade: 'GRADE STEP', relic: 'THE RELIC STEP', forge: 'THE ARMOURER\'S STOCK', fit: 'ARMOUR FITTING', train: 'TRAINING', shrine: 'THE SHRINE', trade: 'TRADES', lasting: 'PICK ONE' };
/** One character's choices at a safe node (the Forge, a training ground, a shrine, a crossroads, a rest's training, the
 * grade step at a shop) or its pick of kit: every option is the engine's, with its price and its reason when it can't. */
function Choices({ x, kit }: { x: ChoiceCharV; kit?: boolean }) {
  const groups = [...new Set(x.options.map((o) => o.group))];
  return (
    <div data-phc-choices={x.charId} data-phc-kit={kit ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      <span style={kick}>{(x.mine ? 'YOU · ' : '') + x.name.toUpperCase()} · <span data-phc-purse={x.charId} style={{ color: ink.white }}>{x.credits} CREDITS</span> · RUN POWER {x.worth}</span>
      {x.relics.length ? <span style={{ fontSize: 12, color: ink.muted }}>Carries: {x.relics.join(', ')}</span> : null}
      {!x.canAct ? <span style={{ fontSize: 13, color: ink.muted }}>{x.name}'s player chooses.</span> : groups.map((gname) => (
        <div key={gname} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...kick, fontSize: 10 }}>{GROUP[gname] || gname.toUpperCase()}</span>
          {x.options.filter((o) => o.group === gname).map((o) => (
            <button key={o.key} type="button" data-phc-choice={o.key} data-phc-why={o.why ? '' : undefined} aria-disabled={o.why ? 'true' : undefined}
              {...tipProps(o.detail + (o.why ? ' ' + o.why : ''))}
              onClick={(e) => { if (o.why) openTipOn(e.currentTarget); else act(o.action as any); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '6px 12px', borderRadius: 10, border: '1px solid ' + (o.why ? ink.line : ink.text), background: o.why ? 'transparent' : ink.raised, color: o.why ? ink.muted : ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>{o.label}{o.why ? <span style={{ display: 'block', fontSize: 11, color: ink.muted }}>{o.why}</span> : null}</span>
              {o.price ? <span style={{ fontSize: 12, color: ink.white, whiteSpace: 'nowrap' }}>{o.price} credits</span> : <span style={{ fontSize: 11, color: ink.muted }}>free</span>}
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

export function RunScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const [closed, setClosed] = React.useState<string | null>(null); // rules 1.46: the place this screen walked out of
  useGiveToast(g, me);
  const v = g ? runView(g, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: ink.muted }}>No run is under way.</div>;
  const visitNode = g.run?.visit?.node || null, place = placeOpen(g as any);
  if (place && closed !== visitNode) return <PlaceScreen onLeave={() => setClosed(visitNode)} />; // rules 1.46: every safe node full screen
  if (v.state === 'shop') return <ShopScreen />; // rules 1.42: the shop replaces the play screen (spec 8.3)
  if (v.state === 'boon' || v.state === 'tile' || v.over) return <StageScreen />; // rules 1.44: the stage's end and the summary, full screen
  const fight = v.state === 'fight';
  const pick = (n: RunNodeV, el: HTMLElement) => { if (n.state === 'reachable') act({ type: 'run/move', node: n.id }); else openTipOn(el); };
  const mine = v.offers.filter((o) => o.mine), others = v.offers.filter((o) => !o.mine);
  return (
    <div data-phc-run-screen="" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: ink.ground, color: ink.text, fontFamily: "'Chakra Petch', sans-serif", overflow: 'hidden' }}>
      <style>{PULSE}</style>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: '1px solid ' + ink.line, background: ink.panel, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em' }}>SURVIVAL</span>
        <span data-phc-run-where="" style={{ fontSize: 14 }}>Stage {v.stage} · {v.depth ? 'Node ' + v.depth + ' of ' + v.rows : 'The start · ' + v.rows + ' nodes to the Boss'}</span>
        <span style={{ fontFamily: "'Spectral', serif", fontSize: 17 }}>{v.setting}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: ink.muted }}>Seed {v.seed}</span>
        <button type="button" onClick={() => go('room')} style={btn(false)}>The room</button>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <section aria-label="Path map" style={{ flex: '1 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', padding: '16px 16px 12px', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600 }}>{v.title}</h1>
            {v.waiting ? <span data-phc-waiting="" style={{ fontSize: 13, color: ink.white }}>{v.waiting}</span> : null}
            {v.canGo ? <button type="button" data-phc-go="" onClick={() => act({ type: 'run/go' })} style={btn(true)}>Go now</button> : null}
          </div>
          <PathMap v={v} onPick={pick} />
          <span style={{ fontSize: 12, color: ink.muted }}>Lit nodes are the ones you can reach. Hover a node for what it gives and costs. A trail runs on to the next junction: read ahead before you pick one.{v.solo ? ' Click a lit node to go.' : ' Where the trail forks, click one to mark it: the squad goes when everyone has marked; a tie goes to the host. On a trail with one way on, a click walks the squad on.'}</span>
        </section>
        <aside aria-label="The squad and the node" style={{ flex: '0 1 340px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderLeft: '1px solid ' + ink.line, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={kick}>THE SQUAD</span>
            {v.party.map((p) => (
              <div key={p.id} data-phc-member={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: ink.panel, borderLeft: '4px solid ' + p.color }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: p.color, color: ink.ground }}>{p.initials}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: ink.muted }}>Level {p.level} · <span style={{ color: p.hp < p.maxHp ? ink.hp : ink.muted }}>HP {p.hp}/{p.maxHp}</span> · <span data-phc-credits={p.id} style={{ color: ink.white }}>{p.credits} credits</span></span>
                  {p.wear ? <span data-phc-member-wear="main" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ink.muted }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{p.weapon}</span><WearBar w={p.wear} label={p.weapon} compact /></span> : null}
                  {p.worn.map((x, i) => <span key={i} data-phc-member-wear="other" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ink.muted }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{x.name}</span><WearBar w={x.w} label={x.name} compact /></span>)}
                </span>
                {p.levelUp && p.mine ? <button type="button" data-phc-levelup={p.id} onClick={() => go('levelup', { levelupChar: p.id })} style={btn(true)}>★ Level up</button> : p.levelUp ? <span style={{ fontSize: 11, color: ink.white }}>★ level up waiting</span> : null}
              </div>
            ))}
          </div>
          {fight ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={kick}>A FIGHT IS ON</span><button type="button" onClick={() => go('combat')} style={btn(true)}>To the fight</button></div> : null}
          {v.note ? (
            <div data-phc-note="" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
              <span style={kick}>{v.note.kicker}</span>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{v.note.title}</span>
              {v.note.text ? <p style={{ margin: 0, fontFamily: "'Spectral', serif", fontSize: 15, lineHeight: 1.55, color: '#DCE2EC' }}>{v.note.text}</p> : null}
              {v.note.lines.map((l, i) => <span key={i} style={{ fontSize: 13, lineHeight: 1.45 }}>{l}</span>)}
            </div>
          ) : null}
          {(() => { const t = lastFightTally(g); return t ? <TallyTable t={t} compact /> : null; })()}
          {v.kits.map((x) => <Choices key={'kit-' + x.charId} x={x} kit />)}
          {place ? <button type="button" data-phc-reopen="" onClick={() => setClosed(null)} style={btn(true)}>Back to the {(v.note?.title || 'place')} ›</button> : v.choices.map((x) => <Choices key={'ch-' + x.charId} x={x} />)}
          {mine.map((o) => <Offer key={o.charId} o={o} />)}
          {others.map((o) => <Offer key={o.charId} o={o} />)}
        </aside>
      </div>
    </div>
  );
}
