// The Proving Ground (practice mode): endless waves, infinite retry and a tools panel, over the combat screen.
// Mounted once in App.tsx; it shows only while the game is in the Proving Ground (game.sandbox) on the combat screen.
// Everything goes through the engine's sandbox/* actions (packages/engine/src/game.ts): no Narrator is ever called.
//  · WAVE n: a slash banner across the screen whenever a wave (or a retry) begins, for everyone (shared state).
//  · Wave cleared: a card with Next wave (anyone); with Auto on, the host's client calls it after a short pause.
//  · Squad down: Retry wave n, or Restart from wave 1 (anyone), Leave (host).
//  · Tools drawer (right edge): Squad (level, class and rank, skills, armour, refill), Gear (spawn any weapon or item,
//    equip, drop), Magic (learn any word, school or module; designs), Field (host: spawn enemies on a clicked tile,
//    clear them, enemy AI, auto waves, jump to a wave, the mana meter, leave).
import React from 'react';
import {
  type GameState, type Character, type Rarity, WEAPONS, WEAPON, ITEM, CLASSES, CLASS, ADVANCED_CLASSES, SIGILS, SCHOOLS, SCHOOL, MODULES, MODULE, SKILLS, SKILL,
  ENEMIES, MANA_BANDS, SANDBOX_TIERS, ARCHETYPES, packOf, classRank, maxHp, RARITY,
} from '@engine';
import { act, hostRoom, getState } from './store';
import { fxBusyUntil } from './fx/FxLayer';
import { sfx, reducedMotion } from './sfx';
import { usePresence, presenceCls } from './presence';

// ---------- starting it ----------
/** From the title: open a fresh room and go straight into the Proving Ground with a test character (or the host's
 *  locked-in ones, if the room already has some). */
export function startProvingGround(archetype?: string) {
  hostRoom();
  if (getState().role !== 'host') return;
  act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}) });
}
/** From the room (host): the room's locked-in characters, or a test character when the host has none. */
export const openProvingGround = (archetype?: string) => act({ type: 'sandbox/start', ...(archetype ? { archetype } : {}) });
export const QUICK_ARCHETYPES = ['sharpshooter', 'bulwark', 'sigilist', 'mender', 'brawler', 'heavy_gunner'].filter((id) => ARCHETYPES.some((a) => a.id === id));

// ---------- look ----------
const C = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', red: '#F65157', ok: '#6FEA77', white: '#FFFFFF', mp: '#5C9EFF', mind: '#4FC8DF', soul: '#AE9BFF', body: '#F2A54A' };
const UI = "'Chakra Petch', sans-serif";
const btn: React.CSSProperties = { minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid ' + C.line, background: C.raised, color: C.text, fontFamily: UI, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const primary: React.CSSProperties = { ...btn, border: 0, background: C.text, color: C.ground };
const field: React.CSSProperties = { minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #2E3A50', background: C.ground, color: C.text, fontFamily: UI, fontSize: 13, minWidth: 0 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: C.muted };
const row: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' };
const CSS = `
@keyframes phcSbSlash{0%{transform:translateX(-110%) skewX(-18deg);opacity:0}18%{transform:translateX(0) skewX(-18deg);opacity:1}82%{transform:translateX(0) skewX(-18deg);opacity:1}100%{transform:translateX(110%) skewX(-18deg);opacity:0}}
@keyframes phcSbText{0%{letter-spacing:.9em;opacity:0}22%{letter-spacing:.32em;opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes phcSbFade{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
.phc-sb-slash{animation:phcSbSlash 1.6s cubic-bezier(.2,.8,.2,1) both}
.phc-sb-text{animation:phcSbText 1.6s cubic-bezier(.2,.8,.2,1) both}
.phc-reduce .phc-sb-slash,.phc-reduce .phc-sb-text{animation:phcSbFade 1.2s ease-out both}
.phc-sb-tab:hover{background:#1C2536!important}
html.phc-sandbox div[role="dialog"][aria-label="The fight is over"]{display:none!important}
`;
function useCss() { React.useEffect(() => { if (document.getElementById('phc-sandbox-css')) return; const s = document.createElement('style'); s.id = 'phc-sandbox-css'; s.textContent = CSS; document.head.appendChild(s); }, []); }

type Tab = 'squad' | 'gear' | 'magic' | 'field';

export function SandboxPanel({ game, meId, isHost, screen }: { game: GameState | null; meId: string; isHost: boolean; screen: string }) {
  useCss();
  const sb = game?.sandbox, on = !!sb && screen === 'combat' && game!.phase === 'combat';
  const [open, setOpen] = React.useState(false);
  // The combat screen's own end-of-fight card (Back to the story) has no place here: the wave cards replace it.
  React.useEffect(() => { document.documentElement.classList.toggle('phc-sandbox', !!sb); return () => document.documentElement.classList.remove('phc-sandbox'); }, [!!sb]);
  const drawer = usePresence(on && open ? true : null);
  return <>
    {on && <WaveBanner game={game!} />}
    {on && <WaveEnd game={game!} isHost={isHost} />}
    {on && !open && <button type="button" className="phc-sb-tab" onClick={() => { setOpen(true); sfx('slide'); }} aria-label="Open the Proving Ground tools"
      style={{ position: 'fixed', right: 0, top: '38%', zIndex: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: '10px 0 0 10px', border: '1px solid ' + C.line, borderRight: 0, background: C.panel, color: C.text, fontFamily: UI, cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,0,0,.5)' }}>
      <span style={{ fontSize: 10, letterSpacing: '0.2em', color: C.muted }}>WAVE</span>
      <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{sb!.wave}</span>
      <span style={{ fontSize: 10, color: C.muted }}>best {sb!.best}</span>
      <span aria-hidden="true" style={{ fontSize: 18, marginTop: 4 }}>⚙</span>
      <span style={{ fontSize: 10, letterSpacing: '0.16em', writingMode: 'vertical-rl' }}>TOOLS</span>
    </button>}
    {drawer.shown && game?.sandbox && <Drawer game={game} meId={meId} isHost={isHost} closing={drawer.closing} close={() => { setOpen(false); sfx('slide_back'); }} />}
  </>;
}

// ---------- WAVE n ----------
function WaveBanner({ game }: { game: GameState }) {
  const sb = game.sandbox!, key = sb.state === 'fighting' ? sb.wave + '|' + sb.attempt : null;
  const [shown, setShown] = React.useState<{ wave: number; retry: boolean; id: number } | null>(null);
  const mounted = React.useRef(false), last = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!key || key === last.current) return;
    last.current = key;
    if (document.hidden) return;
    // The first wave comes in under the combat-in transition: wait for it.
    const wait = mounted.current ? 150 : 1000; mounted.current = true;
    const id = Date.now(), t1 = setTimeout(() => { setShown({ wave: sb.wave, retry: sb.attempt > 1, id }); sfx('slide'); }, wait);
    const t2 = setTimeout(() => setShown((s) => (s && s.id === id ? null : s)), wait + (reducedMotion() ? 1250 : 1650));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [key]);
  React.useEffect(() => { mounted.current = true; }, []);
  if (!shown) return null;
  const boss = shown.wave % 5 === 0;
  return <div aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, top: '42%', zIndex: 52, pointerEvents: 'none', display: 'grid', placeItems: 'center', overflow: 'hidden', height: 120 }}>
    <div className="phc-sb-slash" style={{ position: 'absolute', inset: '18px -10%', background: C.ground, borderTop: '3px solid ' + (boss ? C.red : C.white), borderBottom: '3px solid ' + (boss ? C.red : C.white), boxShadow: '0 10px 40px rgba(0,0,0,.6)' }} />
    <div className="phc-sb-text" style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 18, fontFamily: UI, fontStyle: 'italic', fontWeight: 700, color: C.white }}>
      <span style={{ fontSize: 'clamp(28px, 6vw, 60px)', letterSpacing: '0.32em' }}>WAVE {shown.wave}</span>
      <span style={{ fontSize: 14, letterSpacing: '0.24em', color: boss ? C.red : C.muted }}>{boss ? 'CHAMPION' : shown.retry ? 'AGAIN' : 'INCOMING'}</span>
    </div>
  </div>;
}

// ---------- cleared / fallen ----------
const AUTO_MS = 3000;
function WaveEnd({ game, isHost }: { game: GameState; isHost: boolean }) {
  const sb = game.sandbox!, ended = sb.state === 'cleared' || sb.state === 'fallen' ? sb.state + '|' + sb.wave + '|' + sb.attempt : null;
  // Shown once the effects of the last blows have played (capped), so the card never covers the killing shot.
  const [ready, setReady] = React.useState<string | null>(null), [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    if (!ended) { setReady(null); return; }
    const wait = Math.min(4000, Math.max(300, fxBusyUntil() - performance.now() + 250));
    const t = setTimeout(() => { setReady(ended); sfx(sb.state === 'cleared' ? 'start' : 'error'); }, wait);
    return () => clearTimeout(t);
  }, [ended]);
  const auto = sb.state === 'cleared' && sb.auto && ready === ended;
  React.useEffect(() => {
    if (!auto) return;
    const at = Date.now() + AUTO_MS; setLeft(Math.ceil(AUTO_MS / 1000));
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000))), 250);
    // Only the host's client calls the next wave (one action for the room); a hidden host tab still calls it.
    const go = isHost ? setTimeout(() => { const g = getState().game; if (g?.sandbox?.state === 'cleared' && g.sandbox.wave === sb.wave) act({ type: 'sandbox/wave' }); }, AUTO_MS) : undefined;
    return () => { clearInterval(tick); if (go) clearTimeout(go); };
  }, [auto, ended]);
  const p = usePresence(ready && ready === ended ? sb.state : null);
  if (!p.shown) return null;
  const won = p.shown === 'cleared';
  return <div role="dialog" aria-modal="true" aria-label={won ? 'Wave cleared' : 'The squad fell'} className={presenceCls('phc-a-fade', p.closing)}
    style={{ position: 'fixed', inset: 0, zIndex: 48, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(5, 7, 11, 0.82)' }}>
    <div className={presenceCls('phc-a-pop', p.closing)} style={{ width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 16, background: C.panel, border: '1px solid ' + C.line, borderTop: '4px solid ' + (won ? C.ok : C.red), fontFamily: UI, color: C.text }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: won ? C.ok : C.red }}>{won ? '✓ WAVE CLEARED' : '✕ THE SQUAD IS DOWN'}</span>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 30, fontWeight: 600 }}>Wave {sb.wave}{won ? ' cleared' : ''}</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: '#C9D3E3' }}>
        {won ? 'The squad carries its HP, ammo and magic into the next wave. Use the tools to refill or re-gear first.' : 'Nothing is lost here: retry the same wave with everyone refilled, or start again from wave 1.'} Best so far: wave {sb.best}.
      </span>
      {won ? <div style={row}>
        <button type="button" data-sfx="start" style={{ ...primary, minHeight: 46, flex: 1 }} onClick={() => act({ type: 'sandbox/wave' })}>Next wave ›{auto && left > 0 ? ' · ' + left : ''}</button>
        {isHost && <button type="button" style={{ ...btn, minHeight: 46 }} onClick={() => act({ type: 'sandbox/auto', on: !sb.auto })}>{sb.auto ? 'Hold here' : 'Auto next: off'}</button>}
      </div> : <div style={row}>
        <button type="button" data-sfx="start" style={{ ...primary, minHeight: 46, flex: 1 }} onClick={() => act({ type: 'sandbox/retry' })}>↻ Retry wave {sb.wave}</button>
        <button type="button" style={{ ...btn, minHeight: 46 }} onClick={() => act({ type: 'sandbox/retry', restart: true })}>Restart from wave 1</button>
      </div>}
      {isHost && <button type="button" style={{ ...btn, alignSelf: 'flex-start', color: C.muted }} onClick={() => act({ type: 'sandbox/end' })}>Leave the Proving Ground</button>}
    </div>
  </div>;
}

// ---------- the tools drawer ----------
function Drawer({ game, meId, isHost, closing, close }: { game: GameState; meId: string; isHost: boolean; closing: boolean; close: () => void }) {
  const sb = game.sandbox!;
  const chars = Object.values(game.characters).filter((c) => isHost || c.owner === meId);
  const [tab, setTab] = React.useState<Tab>('squad'), [cid, setCid] = React.useState<string>(chars[0]?.id || '');
  const c = game.characters[cid] && chars.some((x) => x.id === cid) ? game.characters[cid] : chars[0];
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const tabs: [Tab, string][] = [['squad', 'Squad'], ['gear', 'Gear'], ['magic', 'Magic'], ...(isHost ? [['field', 'Field'] as [Tab, string]] : [])];
  return <aside aria-label="Proving Ground tools" className={presenceCls('phc-a-right', closing)}
    style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 47, width: 'min(400px, 94vw)', display: 'flex', flexDirection: 'column', background: C.panel, borderLeft: '1px solid ' + C.line, boxShadow: '-12px 0 40px rgba(0,0,0,.55)', fontFamily: UI, color: C.text }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid ' + C.line }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={label}>THE PROVING GROUND · NO NARRATOR</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Wave {sb.wave} <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>· best {sb.best} · {sb.state === 'fighting' ? 'fighting' : sb.state === 'cleared' ? 'cleared' : 'squad down'}</span></span>
      </div>
      <button type="button" style={btn} onClick={close} aria-label="Close the tools">✕</button>
    </header>
    <nav role="tablist" style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid ' + C.line }}>
      {tabs.map(([id, name]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); sfx('tab'); }}
        style={{ ...btn, flex: 1, border: '1px solid ' + (tab === id ? C.text : C.line), background: tab === id ? C.raised : 'transparent', color: tab === id ? C.text : C.muted }}>{name}</button>)}
    </nav>
    {tab !== 'field' && <div style={{ ...row, padding: '10px 16px 0' }}>
      {chars.length ? chars.map((x) => <button key={x.id} type="button" aria-pressed={x.id === c?.id} onClick={() => setCid(x.id)} style={{ ...btn, border: '1px solid ' + (x.id === c?.id ? C.text : C.line), background: x.id === c?.id ? C.raised : 'transparent' }}>{x.name}</button>)
        : <span style={{ fontSize: 13, color: C.muted }}>You have no character here. Lock one in from the room: it joins at the next wave.</span>}
    </div>}
    <div key={tab} className="phc-fade-in" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {tab === 'squad' && c && <SquadTab game={game} c={c} isHost={isHost} />}
      {tab === 'gear' && c && <GearTab c={c} />}
      {tab === 'magic' && c && <MagicTab c={c} />}
      {tab === 'field' && isHost && <FieldTab game={game} />}
    </div>
  </aside>;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={label}>{title}</span>{children}</section>;
const Stepper = ({ value, min, max, set, name }: { value: number; min: number; max: number; set: (n: number) => void; name: string }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Lower ' + name} disabled={value <= min} onClick={() => set(value - 1)}>‹</button>
  <span style={{ minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: 700 }}>{value}</span>
  <button type="button" style={{ ...btn, padding: '0 10px' }} aria-label={'Raise ' + name} disabled={value >= max} onClick={() => set(value + 1)}>›</button>
</span>;

function SquadTab({ game, c, isHost }: { game: GameState; c: Character; isHost: boolean }) {
  const u = game.combat?.units.find((x) => x.charId === c.id), adv = game.sandbox!.advanced[c.id];
  const [skill, setSkill] = React.useState(SKILLS[0].id);
  const clsVal = adv ? 'adv:' + adv : c.classId || '';
  return <>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {c.portrait ? <img src={c.portrait} alt="" style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 8, background: '#000' }} /> : <span style={{ width: 56, height: 70, borderRadius: 8, background: C.raised, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{c.name.slice(0, 2).toUpperCase()}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
        <span style={{ color: C.muted }}>Level {c.level} · {adv ? ADVANCED_CLASSES.find((x) => x.id === adv)?.name : c.classId ? CLASS[c.classId]?.name + ' ' + ['', 'I', 'II', 'III'][classRank(c)] : 'Classless'}</span>
        {u && <span><span style={{ color: C.red }}>HP {u.hp}/{u.maxHp}</span> · AP {u.ap} · {WEAPON[u.weapon]?.name}{WEAPON[u.weapon]?.magazine != null ? ' ' + u.ammo + '/' + WEAPON[u.weapon].magazine : ''}{u.mg?.emanator ? <span style={{ color: C.mp }}> · MP {Math.round(u.mg.mp)}</span> : null}</span>}
      </div>
    </div>
    <div style={row}>
      <button type="button" style={primary} onClick={() => act({ type: 'sandbox/refill', charId: c.id })}>Refill {c.name.split(' ')[0]}</button>
      {isHost && <button type="button" style={btn} onClick={() => act({ type: 'sandbox/refill' })}>Refill everyone</button>}
    </div>
    <span style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>HP, AP (on its turn), every magazine, stims, MP, the Evoker's charge and cores, a mended weapon; no injuries.</span>
    <Section title="LEVEL (HP RECOMPUTED, FULL)"><Stepper name="level" value={c.level} min={1} max={20} set={(n) => act({ type: 'sandbox/level', charId: c.id, level: n })} /><span style={{ fontSize: 12, color: C.muted }}>{maxHp(c)} HP at this level. Unspent points from levels go to Level up.</span></Section>
    <Section title="CLASS">
      <select value={clsVal} style={field} aria-label="Class" onChange={(e) => { const v = e.target.value; act({ type: 'sandbox/class', charId: c.id, classId: v ? v.replace(/^adv:/, '') : null, rank: 1 }); }}>
        <option value="">Classless</option>
        <optgroup label="Base classes">{CLASSES.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.core}</option>)}</optgroup>
        <optgroup label="Advanced classes">{ADVANCED_CLASSES.map((k) => <option key={k.id} value={'adv:' + k.id}>{k.name} ({k.parents.map((p) => CLASS[p]?.name || p).join(' + ')})</option>)}</optgroup>
      </select>
      {c.classId && !adv && <div style={row}><span style={{ fontSize: 13, color: C.muted }}>Rank</span>{[1, 2, 3].map((r) => <button key={r} type="button" aria-pressed={classRank(c) === r} style={{ ...btn, border: '1px solid ' + (classRank(c) === r ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/class', charId: c.id, classId: c.classId, rank: r })}>{['', 'I', 'II', 'III'][r]}</button>)}</div>}
      <span style={{ fontSize: 12, color: C.muted }}>{adv ? 'Advanced classes play as their first parent here: their moves are not engine-run yet.' : 'Rank II and III raise the signature skills to 13 and 18.'}</span>
    </Section>
    <Section title="SKILL POINTS (ATTRIBUTE AND CORE FOLLOW)">
      <div style={row}>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ ...field, flex: 1 }} aria-label="Skill">{SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name} ({c.skills[s.id] || 0})</option>)}</select>
        <Stepper name={SKILL[skill]?.name || 'skill'} value={c.skills[skill] || 0} min={0} max={10} set={(n) => act({ type: 'sandbox/skill', charId: c.id, skill, points: n })} />
      </div>
    </Section>
    <Section title="BODY ARMOUR CLASS">
      <div style={row}>{[0, 1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={c.armourClass === n} style={{ ...btn, border: '1px solid ' + (c.armourClass === n ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/armour', charId: c.id, armourClass: n })}>{n}</button>)}</div>
    </Section>
  </>;
}

const RARITIES = Object.keys(RARITY) as Rarity[];
function GearTab({ c }: { c: Character }) {
  const [q, setQ] = React.useState(''), [rarity, setRarity] = React.useState<Rarity>('standard');
  const s = q.trim().toLowerCase();
  const list = React.useMemo(() => [
    ...WEAPONS.map((w) => ({ id: w.id, name: w.name, what: w.category.replace(/_/g, ' '), weapon: true })),
    ...Object.values(ITEM).map((it: any) => ({ id: it.id, name: it.name, what: (it.category || 'item') + (it.slot ? ' · ' + it.slot.replace(/_/g, ' ') : ''), weapon: false })),
  ], []);
  const hits = list.filter((x) => !s || x.name.toLowerCase().includes(s) || x.what.includes(s) || x.id.includes(s)).slice(0, 60);
  const pack = packOf(c);
  const equipTo = (it: ReturnType<typeof packOf>[number]): ['main' | 'off' | 'worn' | 'mod', string][] => {
    const w = it.weapon && it.kind === 'weapon' ? WEAPON[it.weapon] : null, d = ITEM[it.item || it.id] as any;
    if (w) return [['main', 'Hold'], ...((w as any).hands === '1H' ? [['off', 'Off hand'] as ['off', string]] : [])];
    if (d?.category === 'mod') return [['mod', 'Fit']];
    if (d?.category === 'armour') return [['worn', 'Wear']];
    if (d?.slot === 'off_hand') return [['off', 'Off hand']];
    return [];
  };
  return <>
    <Section title="SPAWN AN ITEM INTO THE PACK">
      <div style={row}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search weapons and items…" aria-label="Search weapons and items" style={{ ...field, flex: 1 }} />
        <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)} aria-label="Weapon rarity" style={field}>{RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
        {hits.map((x) => <div key={(x.weapon ? 'w:' : 'i:') + x.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: C.ground, border: '1px solid ' + C.line }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{x.name}</span><span style={{ fontSize: 11, color: C.muted }}>{x.what}{x.weapon && rarity !== 'standard' ? ' · ' + rarity : ''}</span></span>
          <button type="button" style={{ ...btn, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined })}>Give</button>
          {(x.weapon || /armour|mod|off hand|shield|light|focus/.test(x.what)) && <button type="button" style={{ ...primary, minHeight: 30 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: x.id, rarity: x.weapon ? rarity : undefined, equip: true })}>Give + equip</button>}
        </div>)}
        {!hits.length && <span style={{ fontSize: 13, color: C.muted }}>Nothing matches.</span>}
      </div>
      <span style={{ fontSize: 12, color: C.muted }}>Weapons come with three magazines and loose rounds; a weapon taken in hand here comes loaded.</span>
    </Section>
    <Section title="EQUIPPED">
      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>Main hand: <b>{WEAPON[c.weapon]?.name || c.weapon}</b>{c.weaponState?.rarity && c.weaponState.rarity !== 'standard' ? ' (' + c.weaponState.rarity + ')' : ''}{(c.weaponState?.mods || []).length ? ' · ' + c.weaponState!.mods!.map((m) => ITEM[m]?.name || m).join(', ') : ''}</span>
        {c.offHand && <span style={row}>Off hand: <b>{WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id}</b><button type="button" style={{ ...btn, minHeight: 28 }} onClick={() => act({ type: 'sandbox/unequip', charId: c.id, slot: 'off' })}>Take off</button></span>}
        {Object.entries(c.worn || {}).map(([slot, id]) => <span key={slot} style={row}>{slot.replace(/_/g, ' ')}: <b>{ITEM[id]?.name || id}</b><button type="button" style={{ ...btn, minHeight: 28 }} onClick={() => act({ type: 'sandbox/unequip', charId: c.id, slot })}>Take off</button></span>)}
      </div>
    </Section>
    <Section title={'PACK (' + pack.length + ')'}>
      {pack.map((it, i) => <div key={i + it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ flex: 1, minWidth: 0 }}>{it.name}{it.rarity && it.rarity !== 'standard' ? ' (' + it.rarity + ')' : ''}<span style={{ color: C.muted }}>{it.mags ? ' · ' + it.mags.length + ' × [' + it.mags.join(', ') + ']' : it.qty > 1 ? ' × ' + it.qty : ''}</span></span>
        {equipTo(it).map(([to, name]) => <button key={to} type="button" style={{ ...btn, minHeight: 28 }} onClick={() => act({ type: 'sandbox/equip', charId: c.id, idx: i, to })}>{name}</button>)}
        <button type="button" style={{ ...btn, minHeight: 28, color: C.muted }} aria-label={'Drop ' + it.name} onClick={() => act({ type: 'sandbox/drop', charId: c.id, idx: i })}>✕</button>
      </div>)}
      <span style={{ fontSize: 12, color: C.muted }}>Stims: {c.stims} <button type="button" style={{ ...btn, minHeight: 26 }} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: 'stim_injector', qty: 3 })}>+3</button></span>
    </Section>
  </>;
}

function MagicTab({ c }: { c: Character }) {
  const known = c.sigils || [], k = c.soulKnown || { schools: [], modules: [] };
  const [school, setSchool] = React.useState(SCHOOLS[0]?.id || ''), [mods, setMods] = React.useState<string[]>([]), [name, setName] = React.useState('');
  const give = (item: string) => act({ type: 'sandbox/give', charId: c.id, item });
  const has = (id: string) => c.weapon === id || c.offHand?.id === id || packOf(c).some((x) => (x.item || x.id) === id);
  return <>
    <Section title="FOCI">
      <div style={row}>
        {!has('evoker') && <button type="button" style={btn} onClick={() => give('evoker')}>+ Evoker (Sigils)</button>}
        {!has('emanator') && <button type="button" style={btn} onClick={() => give('emanator')}>+ Emanator (Outbursts)</button>}
        <button type="button" style={btn} onClick={() => act({ type: 'sandbox/give', charId: c.id, item: 'standard_core', qty: 4 })}>+4 mana cores</button>
      </div>
    </Section>
    <Section title={'SIGIL WORDS (' + known.length + ' KNOWN; NO CAP HERE)'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {SIGILS.map((w) => { const on = known.includes(w.id); return <button key={w.id} type="button" title={w.text} aria-pressed={on}
          style={{ ...btn, minHeight: 28, padding: '0 8px', fontSize: 12, border: '1px solid ' + (on ? C.mind : C.line), color: on ? C.mind : C.muted, background: on ? '#0F2A30' : 'transparent' }}
          onClick={() => act(on ? { type: 'sandbox/forget', charId: c.id, word: w.id } : { type: 'sandbox/learn', charId: c.id, word: w.id })}>{w.word}</button>; })}
      </div>
    </Section>
    <Section title="OUTBURST SCHOOLS AND MODULES">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {SCHOOLS.map((s) => <button key={s.id} type="button" title={s.text} disabled={k.schools.includes(s.id)} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (k.schools.includes(s.id) ? C.soul : C.line), color: k.schools.includes(s.id) ? C.soul : C.muted }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, school: s.id })}>{s.name}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MODULES.map((m) => <button key={m.id} type="button" title={m.text} disabled={k.modules.includes(m.id)} style={{ ...btn, minHeight: 28, fontSize: 12, border: '1px solid ' + (k.modules.includes(m.id) ? C.soul : C.line), color: k.modules.includes(m.id) ? C.soul : C.muted }} onClick={() => act({ type: 'sandbox/learn', charId: c.id, module: m.id })}>{m.name}</button>)}
      </div>
    </Section>
    <Section title={'DESIGNS (' + (c.outbursts || []).length + ')'}>
      {(c.outbursts || []).map((d) => <div key={d.id} style={{ ...row, fontSize: 13 }}><span style={{ flex: 1 }}><b>{d.name}</b> <span style={{ color: C.muted }}>{SCHOOL[d.school]?.name}{d.modules.length ? ' · ' + d.modules.map((m) => MODULE[m]?.name || m).join(', ') : ''}</span></span>
        <button type="button" style={{ ...btn, minHeight: 28, color: C.muted }} aria-label={'Forget ' + d.name} onClick={() => act({ type: 'sandbox/forget', charId: c.id, designId: d.id })}>✕</button></div>)}
      <div style={row}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Design name" style={{ ...field, flex: 1 }} />
        <select value={school} onChange={(e) => setSchool(e.target.value)} aria-label="School" style={field}>{SCHOOLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MODULES.map((m) => { const on = mods.includes(m.id); return <button key={m.id} type="button" aria-pressed={on} style={{ ...btn, minHeight: 26, fontSize: 11, padding: '0 6px', border: '1px solid ' + (on ? C.soul : C.line), color: on ? C.soul : C.muted }}
          onClick={() => setMods(on ? mods.filter((x) => x !== m.id) : [...mods, m.id].slice(-4))}>{m.name}</button>; })}
      </div>
      <button type="button" style={{ ...primary, alignSelf: 'flex-start' }} onClick={() => { act({ type: 'sandbox/design', charId: c.id, design: { id: '', name: name || SCHOOL[school]?.name + ' Outburst', school, modules: mods } }); setName(''); setMods([]); }}>Add design</button>
      <span style={{ fontSize: 12, color: C.muted }}>The school and modules are learned with the design. Up to 4 modules, 8 designs.</span>
    </Section>
  </>;
}

// ---------- the field (host) ----------
/** While armed, a click on a grid tile spawns there instead of reaching the combat screen. Tiles are the combat
 *  template's button.phc-tok, whose aria-label starts with the grid reference ("C7 · …"). */
function useTilePick(armed: boolean, pick: (ref: string) => void) {
  const cb = React.useRef(pick); cb.current = pick;
  React.useEffect(() => {
    if (!armed) return;
    const f = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('button.phc-tok') as HTMLElement | null; if (!el) return;
      const ref = (el.getAttribute('aria-label') || '').split(' · ')[0].trim(); if (!/^[A-Z]{1,2}\d{1,2}$/.test(ref)) return;
      e.preventDefault(); e.stopPropagation(); cb.current(ref);
    };
    window.addEventListener('click', f, true);
    document.body.style.cursor = 'crosshair';
    return () => { window.removeEventListener('click', f, true); document.body.style.cursor = ''; };
  }, [armed]);
}
function FieldTab({ game }: { game: GameState }) {
  const sb = game.sandbox!, cb = game.combat;
  const [tier, setTier] = React.useState('minion'), [weapon, setWeapon] = React.useState(SANDBOX_TIERS.minion.weapons[0]), [armed, setArmed] = React.useState(false), [ref, setRef] = React.useState(''), [jump, setJump] = React.useState(sb.wave + 1);
  useTilePick(armed, (r) => act({ type: 'sandbox/spawn', tier, weapon, at: r }));
  React.useEffect(() => { if (!armed) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setArmed(false); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [armed]);
  const mana = cb?.mana ?? game.story.mana ?? 15, band = MANA_BANDS.find((b) => mana >= b.min && mana <= b.max);
  const foes = (cb?.units || []).filter((u) => u.side === 'foe' && !u.dead).length;
  return <>
    <Section title="SPAWN AN ENEMY">
      <div style={row}>
        <select value={tier} onChange={(e) => { setTier(e.target.value); setWeapon(SANDBOX_TIERS[e.target.value]?.weapons[0] || weapon); }} aria-label="Enemy tier" style={field}>{ENEMIES.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.hp} HP</option>)}</select>
        <select value={weapon} onChange={(e) => setWeapon(e.target.value)} aria-label="Enemy weapon" style={{ ...field, flex: 1 }}>{WEAPONS.filter((w) => w.category !== 'thrown').map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      </div>
      <div style={row}>
        <button type="button" style={armed ? { ...primary, background: C.red, color: C.white } : primary} aria-pressed={armed} onClick={() => setArmed(!armed)}>{armed ? 'Click tiles on the grid · stop' : 'Place by clicking the grid'}</button>
        <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="or a tile: H6" aria-label="Tile" style={{ ...field, width: 90 }} />
        <button type="button" style={btn} disabled={!ref} onClick={() => act({ type: 'sandbox/spawn', tier, weapon, at: ref })}>Spawn</button>
      </div>
      {armed && <span style={{ fontSize: 12, color: C.text }}>Each click on a free tile spawns one. Esc or the button stops.</span>}
      <div style={row}><button type="button" style={btn} disabled={!foes} onClick={() => act({ type: 'sandbox/clear' })}>Clear all enemies ({foes})</button></div>
    </Section>
    <Section title="WAVES">
      <div style={row}>
        <button type="button" aria-pressed={sb.ai} style={{ ...btn, border: '1px solid ' + (sb.ai ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/ai', on: !sb.ai })}>Enemy AI: {sb.ai ? 'ON' : 'OFF (they pass)'}</button>
        <button type="button" aria-pressed={sb.auto} style={{ ...btn, border: '1px solid ' + (sb.auto ? C.text : C.line) }} onClick={() => act({ type: 'sandbox/auto', on: !sb.auto })}>Auto next wave: {sb.auto ? 'ON' : 'OFF'}</button>
      </div>
      <div style={row}><span style={{ fontSize: 13 }}>Jump to wave</span><Stepper name="wave" value={jump} min={1} max={99} set={setJump} /><button type="button" style={btn} onClick={() => act({ type: 'sandbox/wave', wave: jump })}>Go</button>
        <button type="button" style={btn} onClick={() => act({ type: 'sandbox/retry' })}>↻ Retry this wave</button></div>
    </Section>
    <Section title={'MANA METER · ' + mana + ' · ' + (band?.id || '').toUpperCase()}>
      <input type="range" min={0} max={40} value={mana} aria-label="Mana meter" onChange={(e) => act({ type: 'sandbox/mana', value: Number(e.target.value) })} />
      <span style={{ fontSize: 12, color: C.muted }}>{MANA_BANDS.map((b) => b.id + ' ' + b.min + '–' + b.max).join(' · ')}</span>
    </Section>
    <button type="button" style={{ ...btn, alignSelf: 'flex-start', color: C.muted }} onClick={() => { if (confirm('Leave the Proving Ground? The room goes back to how it was before.')) act({ type: 'sandbox/end' }); }}>Leave the Proving Ground</button>
  </>;
}

/** For the room: whether the Proving Ground can open, and why not. */
export function provingGroundWhy(g: GameState | null, isHost: boolean): string | null {
  if (!g) return 'Connecting…';
  if (!isHost) return 'The host opens the Proving Ground.';
  if (g.phase !== 'lobby') return 'In session.';
  return null;
}
