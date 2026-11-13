// The Survival run's screen between fights (survival-spec 8.2; rules 1.41, build step 3; polished in rules 1.42): the
// path map (an even grid: depth in evenly spaced columns across the width, a depth's nodes evenly spaced on one row
// pitch; each node its kind's icon and word on a backplate the links pass under; the route walked solid, the reachable
// lit, the rest dimmed; a legend of the kinds), the party strip (level, HP, credits, a level-up waiting), and the node's
// panel: what the node gave, the weapon pick after a fight (its numbers from the engine's gear preview), the stage
// cleared after the Boss. A shop replaces the whole screen (ShopScreen.tsx, spec 8.3). It draws runView (runView.ts);
// every action is a `run/*` sent through the store.
import React from 'react';
import { act, getState, go } from './store';
import { runView, NODE_LEGEND, type RunNodeV, type OfferV, type ChoiceCharV } from './runView';
import { nodeIconSvg } from './runIcons';
import { gearIconUri } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { ShopScreen } from './ShopScreen';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 40, padding: '0 16px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' });
const marks = (n: number) => '◆'.repeat(n);
const PULSE = '@keyframes phcNodePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}50%{box-shadow:0 0 0 7px rgba(255,255,255,.12)}}'
  + '.phc-node-lit>span:first-child{animation:phcNodePulse 2.2s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.phc-node-lit>span:first-child{animation:none}}';

function MapNode({ n, x, y, onPick }: { n: RunNodeV; x: number; y: number; onPick: (n: RunNodeV, el: HTMLElement) => void }) {
  const lit = n.state === 'reachable', here = n.state === 'here', done = n.state === 'walked', passed = n.state === 'passed';
  const big = n.kind === 'boss' || n.gate, size = big ? 54 : 42;
  const col = here || lit ? ink.white : done ? ink.text : ink.muted;
  const ring = here ? '3px solid ' + ink.white : lit ? '2px solid ' + ink.white : done ? '2px solid ' + ink.text : '1px solid #3B475D';
  const label = n.word + (here ? ', you are here' : lit ? ', reachable' : done ? ', walked' : '') + (n.leans.length ? ', marked by ' + n.leans.map((l) => l.name).join(' and ') : '');
  return (
    <button type="button" data-phc-node={n.id} data-phc-kind={n.kind} data-phc-state={n.state} aria-label={label} {...tipProps(n.tip + (n.why ? ' ' + n.why : ''))}
      onClick={(e) => onPick(n, e.currentTarget)} className={lit ? 'phc-node-lit' : undefined}
      style={{ position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%, -' + size / 2 + 'px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0, border: 0, background: 'transparent', fontFamily: 'inherit', cursor: lit ? 'pointer' : 'default', opacity: passed ? 0.3 : done ? 0.72 : 1, zIndex: here || lit ? 3 : 2 }}>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: '50%', border: ring, background: here ? ink.raised : ink.panel, color: col, boxShadow: here ? '0 0 0 4px rgba(255,255,255,0.18)' : 'none' }}
        dangerouslySetInnerHTML={{ __html: nodeIconSvg(n.gate ? 'elite' : n.kind, big ? 32 : 24) }} />
      <span style={{ fontSize: 'clamp(9px, 0.62vw, 11px)', fontWeight: 700, letterSpacing: '0.02em', color: col, textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '1px 4px', borderRadius: 6, background: 'rgba(10,13,19,0.94)' }}>{here ? '● ' : ''}{n.word}</span>
      {n.leans.length ? <span style={{ position: 'absolute', top: -8, right: -14, display: 'flex', gap: 2 }}>{n.leans.map((l) => <span key={l.initials} style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 700, background: l.color, color: ink.ground }}>{l.initials}</span>)}</span> : null}
    </button>
  );
}

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

export function RunScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const box = React.useRef<HTMLDivElement>(null);
  const v = g ? runView(g, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: ink.muted }}>No run is under way.</div>;
  if (v.state === 'shop') return <ShopScreen />; // rules 1.42: the shop replaces the play screen (spec 8.3)
  const fight = v.state === 'fight';
  // an even grid: depth in columns evenly spaced across the width; a depth's nodes in their map order, evenly spaced and
  // centred on one row pitch for every depth (the order keeps the links as the map makes them)
  const byDepth: Record<number, RunNodeV[]> = {}; for (const n of v.nodes) (byDepth[n.depth] ||= []).push(n);
  const most = Math.max(1, ...Object.values(byDepth).map((l) => l.length)), pitch = Math.min(24, 72 / Math.max(1, most - 1));
  const xOf = (d: number) => 4.5 + ((d - 1) / Math.max(1, v.rows - 1)) * 91;
  const pos: Record<string, { x: number; y: number }> = {};
  for (const l of Object.values(byDepth)) [...l].sort((a, b) => a.col - b.col).forEach((n, i) => { pos[n.id] = { x: xOf(n.depth), y: 46 + (i - (l.length - 1) / 2) * pitch }; });
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
          <div data-phc-legend="" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', fontSize: 11.5, color: ink.muted }}>
            {NODE_LEGEND.map((k) => <span key={k.kind} data-phc-legend-kind={k.kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-grid', color: ink.text }} dangerouslySetInnerHTML={{ __html: nodeIconSvg(k.kind, 16) }} />{k.word}</span>)}
            <span style={{ marginLeft: 'auto' }}>Lit: reachable · solid: your route · {v.solo ? 'click a lit node to go' : 'click to mark; the squad goes when everyone has, a tie to the host'}</span>
          </div>
          <div ref={box} data-phc-pathmap="" style={{ position: 'relative', flex: 1, minHeight: 360, borderRadius: 14, background: 'radial-gradient(ellipse at 50% 40%, #141B28 0%, #0A0D13 75%)', border: '1px solid ' + ink.line, overflow: 'hidden' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
              {v.links.map((l) => { const a = pos[l.from], b = pos[l.to]; if (!a || !b) return null;
                return <line key={l.from + '>' + l.to} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" stroke={l.walked ? ink.text : l.lit ? ink.white : '#34405A'} strokeWidth={l.walked ? 3.5 : l.lit ? 2.5 : 1.25} strokeDasharray={l.walked ? undefined : l.lit ? '6 4' : '3 6'} strokeLinecap="round" />; })}
            </svg>
            {v.nodes.map((n) => <MapNode key={n.id} n={n} x={pos[n.id].x} y={pos[n.id].y} onPick={pick} />)}
          </div>
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
          {v.kits.map((x) => <Choices key={'kit-' + x.charId} x={x} kit />)}
          {v.choices.map((x) => <Choices key={'ch-' + x.charId} x={x} />)}
          {mine.map((o) => <Offer key={o.charId} o={o} />)}
          {others.map((o) => <Offer key={o.charId} o={o} />)}
          {v.cleared ? (
            <div data-phc-cleared="" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 12, background: ink.raised, border: '1px solid ' + ink.white }}>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.14em' }}>STAGE {v.stage} CLEARED</span>
              <span style={{ fontSize: 13, color: '#DCE2EC', lineHeight: 1.5 }}>The Boss is down. Boons and the next tile come with a later build: retire to keep the score.</span>
              {(g.run!.stats.fights || []).map((f, i) => <span key={i} style={{ fontSize: 12, color: ink.muted }}>Node {f.depth}: {f.template.replace(/_/g, ' ')} · {f.outcome === 'win' ? 'won' : f.outcome || 'on'} in {f.rounds} {f.rounds === 1 ? 'round' : 'rounds'} · {f.foes.length} {f.foes.length === 1 ? 'foe' : 'foes'}</span>)}
              {v.canRetire ? <button type="button" data-phc-retire="" onClick={() => act({ type: 'run/retire' })} style={btn(true)}>Retire the run · keep the score</button> : <span style={{ fontSize: 12, color: ink.muted }}>The host retires the run.</span>}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
