// A Survival run's right panel (rules 1.54 item 11; ui-screens.md "The three columns (every mode)"; survival-spec 14.1
// R3): the modules the panel registry (panels.ts) gives a React view, each portalled into its slot of the play screen's
// right column (main.template.html [data-phc-panel-slot]). The mana forecast stays the template's own.
//  · run: the stage and the stop in the world's words, the seed, and a small map of the WHOLE stage (layoutPathMap and
//    NodeGlyph, drawn small): where the squad stands and the way walked.
//  · run_board: this stop, the boons held (their icons at 24 px), the visit's log, Report a run (always) and Retire (as
//    the engine allows it).
//  · squad: each seat with its ready mark and credits, and ONE phase control where End turn sits on the story screen:
//    Go, Ready or Leave, whichever the engine's views say is the one now.
// Everything is read from the engine's views (runView, stageView, shopView, placeView, loadoutView); every action is a
// `run/*` sent through the store.
import React from 'react';
import { act, getState, go, toast } from './store';
import { shopView, placeView, loadoutView, placeOpen, type GameState } from '@engine';
import { runView, type RunViewV } from './runView';
import { stageView } from './stageView';
import { layoutPathMap, NodeGlyph } from './PathMap';
import { boonIconSvg } from './boonIcons';
import { downloadRunReport } from './runReport';
import { scrub } from './debug';
import { tipProps } from './actionTip';
import { GiveTab } from './GiveTab';
import { Portal } from './modeCentre';
import { placeClosed, closePlace } from './placeMark';
import { ICON } from './runIconSizes';
import { WearBar } from './WearBar';
import { campGuard } from './campView';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: ink.muted };
const btn = (primary: boolean, off = false): React.CSSProperties => ({ minHeight: 38, padding: '0 12px', borderRadius: 10, border: primary && !off ? '1px solid ' + ink.white : '1px solid #2E3A50', background: off ? 'transparent' : primary ? ink.text : 'transparent', color: off ? ink.muted : primary ? ink.ground : ink.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: off ? 'default' : 'pointer', whiteSpace: 'nowrap' });

/** The small map of the whole stage (the path map's own layout, drawn small): the trails, the way walked, the stops
 * (the Boss and where the squad stands by their markers) and the camp. */
function SmallMap({ v }: { v: RunViewV }) {
  const { pos, camp } = layoutPathMap(v), W = 1600, H = 900;
  const here = v.nodes.find((n) => n.state === 'here'), boss = v.nodes.find((n) => n.kind === 'boss');
  const firsts = v.nodes.filter((n) => n.depth === 1 && !n.spur), firstWalked = firsts.find((n) => n.state === 'walked' || n.state === 'here');
  const at = (p: { x: number; y: number }) => ({ left: (p.x / W) * 100 + '%', top: (p.y / H) * 100 + '%' });
  return (
    <div data-phc-run-minimap="" aria-label={'The whole stage: ' + (here ? 'you stand at ' + here.word + ', stop ' + here.depth : 'you are at the camp')} role="img"
      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 8, background: '#0B0A07', border: '1px solid ' + ink.line, overflow: 'hidden' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {firsts.map((n) => pos[n.id] ? <line key={'c' + n.id} x1={camp.x} y1={camp.y} x2={pos[n.id].x} y2={pos[n.id].y} stroke={firstWalked?.id === n.id ? ink.white : 'rgba(214,200,170,0.35)'} strokeWidth={firstWalked?.id === n.id ? 16 : 6} strokeLinecap="round" /> : null)}
        {v.links.filter((l) => !l.back && pos[l.from] && pos[l.to]).map((l) => (
          <line key={l.from + '>' + l.to} data-phc-mini-walked={l.walked ? '' : undefined} x1={pos[l.from].x} y1={pos[l.from].y} x2={pos[l.to].x} y2={pos[l.to].y}
            stroke={l.walked ? ink.white : l.lit ? 'rgba(255,255,255,0.75)' : 'rgba(214,200,170,0.35)'} strokeWidth={l.walked ? 16 : 6} strokeDasharray={l.lit ? '24 18' : undefined} strokeLinecap="round" />))}
        {v.nodes.filter((n) => pos[n.id]).map((n) => (
          <circle key={n.id} cx={pos[n.id].x} cy={pos[n.id].y} r={n.state === 'here' ? 34 : n.kind === 'boss' ? 40 : 20}
            fill={n.state === 'walked' || n.state === 'here' ? ink.white : n.state === 'reachable' ? '#C9D3E3' : '#5E6A80'} stroke={n.state === 'here' ? ink.ground : 'none'} strokeWidth={8} />))}
        <circle cx={camp.x} cy={camp.y} r={26} fill={v.atStart ? ink.white : '#C9D3E3'} />
      </svg>
      {boss && pos[boss.id] ? <span aria-hidden="true" style={{ position: 'absolute', ...at(pos[boss.id]), transform: 'translate(-50%, -50%)', color: ink.ground }}><NodeGlyph kind="boss" size={ICON.miniGlyph} /></span> : null}
      {here && pos[here.id] ? <span data-phc-mini-here="" aria-hidden="true" style={{ position: 'absolute', ...at(pos[here.id]), width: 18, height: 18, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '2px solid ' + ink.white, boxShadow: '0 0 0 2px ' + ink.ground }} /> : null}
    </div>
  );
}

function RunPanel({ g, me }: { g: GameState; me: string }) {
  const v = runView(g, me); if (!v) return null;
  const here = v.nodes.find((n) => n.state === 'here');
  return (
    <div data-phc-panel="run" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span data-phc-run-where="" style={{ fontSize: 14, fontWeight: 700 }}>Stage {v.stage} · {v.depth ? 'Stop ' + v.depth + ' of ' + v.rows : 'At the camp'}</span>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 17, lineHeight: 1.2 }}>{v.setting}</span>
      <span style={{ fontSize: 12, color: ink.muted }}>{here ? here.word + (v.depth < v.rows ? ' · ' + (v.rows - v.depth) + ' stops to the Boss' : '') : v.rows + ' stops to the Boss'}</span>
      <SmallMap v={v} />
      <span data-phc-run-seed="" style={{ fontSize: 12, color: ink.muted }}>Seed {v.seed}</span>
    </div>
  );
}

/** The visit's log of the place the squad stands in (a shop or another safe stop), from the engine's view. */
const visitLog = (g: GameState, me: string): string[] => {
  const r = g.run; if (!r) return [];
  if (r.state === 'shop') return shopView(g as any, me)?.log || [];
  return placeOpen(g as any) ? placeView(g as any, me)?.log || [] : [];
};

function RunBoard({ g, me }: { g: GameState; me: string }) {
  const v = runView(g, me); if (!v) return null;
  const log = visitLog(g, me), mine = v.party.filter((p) => p.mine), here = v.nodes.find((n) => n.state === 'here');
  return (
    <div data-phc-panel="run_board" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={kick}>THIS STOP</span>
        <span data-phc-board-stop="" style={{ fontSize: 14 }}>{v.note ? v.note.title : here ? here.word : 'The camp'}</span>
        {(v.note?.picks || []).map((l, i) => <span key={i} data-phc-board-pick="" style={{ fontSize: 12, lineHeight: 1.35, color: '#C9D3E3' }}>{l}</span>)}
      </div>
      {v.party.filter((p) => p.boons.length).map((p) => (
        <div key={p.id} data-phc-member-boons={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={kick}>{(mine.length && p.mine ? 'YOUR BOONS' : p.name.toUpperCase() + '\'S BOONS')} · <span data-phc-member-cap={p.id}>{p.worth}</span></span>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {p.boons.map((b) => <span key={b.id} data-phc-held={b.id} {...tipProps(b.name + (b.camp ? ' (from the camp)' : '') + '. ' + b.text + ' Worth ' + b.worth + '.')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 3px', borderRadius: 8, background: ink.raised, fontSize: 12 }}>
              <span style={{ display: 'inline-grid', color: ink.white }} dangerouslySetInnerHTML={{ __html: boonIconSvg(b.id, ICON.boonHeld) }} />{b.name}{b.camp ? <span style={{ color: ink.muted }}>· Camp</span> : null}</span>)}
          </span>
        </div>))}
      {log.length ? <div data-phc-visit-log="" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={kick}>THIS VISIT</span>
        {log.slice(0, 6).map((l, i) => <span key={i} style={{ fontSize: 12, lineHeight: 1.35, color: '#C9D3E3' }}>{l}</span>)}
      </div> : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" data-phc-report-run="" {...tipProps('Saves one file with the seed, the stages, every fight\'s tally and each character\'s build. Nothing is sent.')} onClick={() => downloadRunReport(g, scrub, toast)} style={btn(false)}>Report a run</button>
        {v.canRetire && !v.over ? <button type="button" data-phc-retire="" {...tipProps('Ends the run here. The score is kept.')} onClick={() => act({ type: 'run/retire' })} style={btn(false)}>Retire</button> : null}
      </div>
    </div>
  );
}

/** The one phase control: what the engine's views say the squad does next, here. */
interface Phase { key: string; label: string; attr: Record<string, string>; go?: () => void; why?: string }
/** The camp's phase (rules 1.52): Ready (or Start, solo) once a starting boon is chosen. The right panel's control and
 * the camp's own top bar both draw this one (the bar with its own data mark). */
export function campPhase(g: GameState, me: string): Phase | null {
  const lv = loadoutView(g as any, me); if (!lv) return null;
  const solo = lv.solo;
  if (lv.readyWhy) return { key: 'ready', label: solo ? 'Start the run' : 'Ready', attr: { 'data-phc-phase': 'ready' }, why: lv.readyWhy }; // the engine's refusal, in its words
  return { key: 'ready', label: solo ? 'Start the run' : lv.ready ? '✓ Ready (undo)' : 'Ready', attr: { 'data-phc-phase': 'ready', 'data-phc-camp-ready': '' }, go: () => campGuard(lv, false, () => act({ type: 'run/ready', ...(lv.ready ? { undo: true } : {}) } as any)) }; // rules 0.28.3-C.1: a free pick still open asks first
}
function phaseOf(g: GameState, me: string, v: RunViewV): Phase | null {
  const r = g.run!;
  if (r.state === 'loadout') return campPhase(g, me);
  if (r.state === 'shop') { // rules 1.42: Ready to leave (Leave the shop, solo)
    const sv = shopView(g as any, me); if (!sv) return null;
    const solo = sv.party.length <= 1, word = solo ? 'Leave the shop' : 'Ready to leave';
    return sv.ready ? { key: 'leave', label: '✓ ' + word, attr: { 'data-phc-phase': 'leave' }, why: 'Waiting for ' + sv.waiting.join(', ') + '.' } : { key: 'leave', label: word, attr: { 'data-phc-phase': 'leave' }, go: () => act({ type: 'run/leave' }) };
  }
  if (placeOpen(g as any) && !placeClosed(r)) return { key: 'leave', label: 'To the path map ›', attr: { 'data-phc-phase': 'leave' }, go: () => closePlace(r) };
  if (r.state === 'tile') { const sv = stageView(g, me); return sv && sv.canGo ? { key: 'go', label: 'Go now', attr: { 'data-phc-phase': 'go', 'data-phc-go': '' }, go: () => act({ type: 'run/go' }) } : null; }
  if (r.state === 'map' && v.canGo) return { key: 'go', label: 'Go now', attr: { 'data-phc-phase': 'go', 'data-phc-go': '' }, go: () => act({ type: 'run/go' }) };
  if (r.state === 'fight' && g.combat) return { key: 'fight', label: 'To the fight', attr: { 'data-phc-phase': 'fight' }, go: () => go('combat') };
  if (r.state === 'field' && g.combat) return { key: 'field', label: 'To the field', attr: { 'data-phc-phase': 'field' }, go: () => go('combat') }; // rules 1.55
  return null;
}
/** The same phase control, drawn again in a place's header (PlaceBar: the visibility standard), so the button that moves
 * on is in sight however far the middle is scrolled. Its own data mark (`data-phc-bar-go`), the right panel's stays the one
 * `data-phc-phase`. Nothing when there is nothing to move on to (or the fight is the next thing: the right panel says it). */
export function MoveOn() {
  const st = getState(), g = st.game, me = st.me.id; if (!g || !g.run) return null;
  const v = runView(g, me); if (!v) return null;
  const ph = phaseOf(g, me, v); if (!ph || ph.key === 'fight') return null;
  return <button type="button" data-phc-bar-go={ph.key} aria-disabled={ph.go ? undefined : 'true'} {...tipProps(ph.why || null)} onClick={() => { if (ph.go) ph.go(); else if (ph.why) toast(ph.why); }}
    style={{ ...btn(true, !ph.go), minHeight: 42, padding: '0 16px', fontSize: 15 }}>{ph.label}</button>;
}
/** Each seat's mark: ready at the camp and the shop, the next stop marked on the map and at a place. */
function marksOf(g: GameState, me: string): Record<string, string> {
  const r = g.run!, out: Record<string, string> = {};
  const byOwner = (owner: string, on: boolean, yes: string, no: string) => { for (const c of Object.values(g.characters)) if (c.owner === owner) out[c.id] = on ? yes : no; };
  if (r.state === 'loadout') { for (const p of loadoutView(g as any, me)?.party || []) byOwner(p.id, p.ready, '✓ READY', 'PACKING'); return out; }
  if (r.state === 'shop') { for (const p of shopView(g as any, me)?.party || []) byOwner(p.id, p.ready, '✓ READY', 'SHOPPING'); return out; }
  for (const p of g.players) byOwner(p.id, !!r.leans[p.id], '✓ MARKED', '');
  return out;
}

function RunSquad({ g, me }: { g: GameState; me: string }) {
  const v = runView(g, me); if (!v) return null;
  const marks = marksOf(g, me), ph = phaseOf(g, me, v);
  return (
    <div data-phc-panel="squad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="list" aria-label="The squad" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {v.party.map((p) => (
          <div role="listitem" key={p.id} data-phc-member={p.id} data-phc-ready={marks[p.id] && marks[p.id].startsWith('✓') ? '1' : '0'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: ink.panel, borderLeft: '3px solid ' + p.color }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, flex: 'none', borderRadius: '50%', fontSize: 10, fontWeight: 700, background: p.color, color: ink.ground }}>{p.initials}</span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}{p.mine ? ' (you)' : ''}</span>
              <span style={{ fontSize: 11.5, color: ink.muted }}>Level {p.level} · <span style={{ color: p.hp < p.maxHp ? ink.hp : ink.muted }}>HP {p.hp}/{p.maxHp}</span> · <span data-phc-credits={p.id} style={{ color: ink.white }}>{p.credits} credits</span></span>
              {p.wear && p.wear.state !== 'sound' ? <span data-phc-member-wear="main" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ink.muted }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{p.weapon}</span><WearBar w={p.wear} label={p.weapon} compact /></span> : null}
              {p.worn.map((x, i) => <span key={i} data-phc-member-wear="other" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ink.muted }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{x.name}</span><WearBar w={x.w} label={x.name} compact /></span>)}
            </span>
            {marks[p.id] ? <span data-phc-mark={p.id} style={{ flex: 'none', fontSize: 10.5, fontWeight: 700, color: marks[p.id].startsWith('✓') ? ink.white : ink.muted }}>{marks[p.id]}</span> : null}
            {p.levelUp && p.mine ? <button type="button" data-phc-levelup={p.id} onClick={() => go('levelup', { levelupChar: p.id })} {...tipProps('Level up: spend your points')} style={{ ...btn(true), minHeight: 28, padding: '0 8px', fontSize: 12 }}>★</button> : null}
          </div>))}
      </div>
      {ph ? <button type="button" {...ph.attr} aria-disabled={ph.go ? undefined : 'true'} {...tipProps(ph.why || null)} onClick={() => { if (ph.go) ph.go(); else if (ph.why) toast(ph.why); }} style={{ ...btn(true, !ph.go), minHeight: 40, width: '100%' }}>{ph.label}</button>
        : v.waiting ? <span data-phc-waiting="" style={{ fontSize: 12, color: ink.white }}>{v.waiting}</span> : null}
    </div>
  );
}

/** The run's modules, each into its slot of the right column (only the ones the mode's list holds have a slot). */
export function PanelSlots({ game }: { game: GameState }) {
  const me = getState().me.id;
  return <>
    <Portal at='[data-phc-panel-slot="run"]'><RunPanel g={game} me={me} /></Portal>
    <Portal at='[data-phc-panel-slot="run_board"]'><RunBoard g={game} me={me} /></Portal>
    <Portal at='[data-phc-panel-slot="squad"]'><RunSquad g={game} me={me} /></Portal>
    <Portal at='[data-phc-panel-slot="give"]'><GiveTab compact /></Portal>
  </>;
}
