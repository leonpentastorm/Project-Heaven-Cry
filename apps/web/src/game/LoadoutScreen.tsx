// THE CAMP (rules 1.51, 1.52; Leon, 14 Nov 2026: a loadout screen with the character on the left, what can be taken,
// what has been taken, the points left and used, and Start; then the starting boon). ONE flow in one full-screen frame,
// in the house frame (the shop's inks and fonts: Spectral titles, Chakra Petch for the UI and numbers): left, the
// character (portrait, name, level, the skills that matter for gear, weight carried against the limit, armour class);
// middle, two steps: 1 LOADOUT (the weapon rack by archetype: the free weapon, the same again at its price, the better
// one with its numbers against the free one; the free Focus; then the shop's menu: ammunition, thrown, mana and parts,
// medicine and supplies, gear, with prices and steppers) and 2 STARTING BOON (three large cards, offered by what the
// loadout holds); right, CARRYING (what is taken, grouped, each removable), BUDGET LEFT and BUDGET USED large, the last
// refusal in words, Recommended and Next / Ready / Start. Every number and reason is the engine's (`loadoutView`:
// priceOf, the gear preview, the reducer's own refusals tried on a copy, startOffer); every action is `run/loadout`,
// `run/boon` or `run/ready`.
import React from 'react';
import { act, getState } from './store';
import { loadoutView, type LoadoutCardV, type LoadoutViewV, type CompareRowV } from '@engine';
import { gearIconUri, roundsGearId, magGearId } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { FRAME_INK as I } from './FullScreenFrame';
import { boonCards } from './campView';
import { boonIconSvg } from './boonIcons';

const ATTR_INK: Record<string, string> = { endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', intelligence: '#8BDEEE', expression: '#5394AC', insight: '#EB95B7', determination: '#9D7ADC', virtue: '#D36A90' };
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
const CSS = '.phc-camp ::-webkit-scrollbar{width:10px}.phc-camp ::-webkit-scrollbar-thumb{background:#2A3447;border-radius:6px}'
  + '.phc-camp button:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}'
  + '.phc-camp-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}'
  + '.phc-camp-shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}'
  + '.phc-camp-rack{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'
  + '.phc-camp-boons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,1.4vw,24px)}';
/** A card's picture: the painted gear icon (rounds and magazines by their gear ids), else the line icon. */
function iconOf(id: string): string {
  const r = /^rounds:(.+)$/.exec(id), m = /^mag:(.+)$/.exec(id);
  if (r) return gearIconUri(roundsGearId(r[1]), undefined, { large: true });
  if (m) return gearIconUri(magGearId(m[1]), undefined, { large: true }) || gearIconUri(m[1], undefined, { large: true });
  return gearIconUri(id.replace(/^armour:\d$/, 'armour'), undefined, { large: true });
}
const head = (title: string, note?: string) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '4px 0 10px' }}>
    <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 22 }}>{title}</h2>
    {note ? <span style={{ fontSize: 12, color: I.muted }}>{note}</span> : null}
    <span aria-hidden="true" style={{ flex: 1, height: 1, background: I.line, alignSelf: 'center' }} />
  </div>
);

/** A large pick-one card (the free Weapon or Focus). */
function PickCard({ c, slot, charId }: { c: LoadoutCardV; slot: 'weapon' | 'focus'; charId: string }) {
  const icon = iconOf(c.id), off = !c.picked && !!c.why;
  return (
    <button type="button" data-phc-camp-pick={slot + ':' + c.id} aria-pressed={c.picked} onClick={() => act({ type: 'run/loadout', charId, op: 'pick', slot, id: c.picked ? null : c.id } as any)} {...tipProps(c.why || c.text || c.name)}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, minHeight: 196, borderRadius: 14, textAlign: 'left', fontFamily: 'inherit', color: I.text, cursor: 'pointer',
        background: c.picked ? 'linear-gradient(180deg, rgba(44,56,78,0.98), rgba(28,37,54,0.98))' : 'linear-gradient(180deg, rgba(28,37,54,0.92), rgba(16,21,31,0.92))', border: c.picked ? '2px solid ' + I.white : '1px solid ' + I.line, opacity: off ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}>
          {icon ? <img src={icon} alt="" width={48} height={48} style={{ objectFit: 'contain' }} /> : null}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{c.name.replace(/ \(.*\)$/, '')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: c.picked ? I.white : I.muted }}>{c.picked ? '✓ TAKEN · FREE' : 'FREE'}</span>
        </span>
      </div>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2px 8px', fontSize: 12 }}>
        {c.preview.lines.slice(0, 4).map((l) => <React.Fragment key={l.key}><dt style={{ color: I.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} {...tipProps(l.label)}>{l.label.replace(/ \(.*\)$/, '')}</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{l.value}</dd></React.Fragment>)}
      </dl>
      {off ? <span style={{ marginTop: 'auto', fontSize: 12, color: I.muted }}>{c.why}</span> : null}
    </button>
  );
}
/** A menu card with its price and a stepper. */
function ShelfCard({ c, charId, tag, compare }: { c: LoadoutCardV; charId: string; tag?: string; compare?: CompareRowV[] }) {
  const icon = iconOf(c.id);
  const step = (q: number) => act({ type: 'run/loadout', charId, op: 'take', key: c.key, qty: q } as any);
  return (
    <article data-phc-camp-card={c.key} {...tipProps(c.text ? c.name + '. ' + c.text : c.name)}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: 'linear-gradient(180deg, rgba(28,37,54,0.92), rgba(16,21,31,0.92))', border: '1px solid ' + (c.taken ? '#7A879E' : I.line) }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'radial-gradient(closest-side, rgba(231,235,243,0.12), rgba(231,235,243,0.02))' }}>
          {icon ? <img src={icon} alt="" width={46} height={46} style={{ objectFit: 'contain' }} /> : <span style={{ color: I.muted }}>+</span>}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>{c.name}</span>
          {tag ? <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: I.muted }}>{tag}</span> : null}
          {!compare ? <span style={{ fontSize: 12, color: I.muted }}>{c.preview.lines.slice(0, 2).map((l) => l.label + ' ' + l.value).join(' · ') || c.preview.category}</span> : null}
        </span>
      </div>
      {compare && compare.length ? (
        <dl data-phc-camp-compare="" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '2px 8px', fontSize: 12 }}>
          {compare.slice(0, 4).map((r) => <React.Fragment key={r.key}>
            <dt style={{ color: I.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} {...tipProps(r.label)}>{r.label.replace(/ \(.*\)$/, '')}</dt>
            <dd style={{ margin: 0, textAlign: 'right', color: I.muted, fontVariantNumeric: 'tabular-nums' }}>{r.free}</dd>
            <dd data-phc-diff={r.diff || ''} style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: r.diff === 'better' ? I.ok : r.diff === 'worse' ? I.hp : I.text }}>{(r.diff === 'better' ? '▲ ' : r.diff === 'worse' ? '▼ ' : '') + r.better}</dd>
          </React.Fragment>)}
        </dl>) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span data-phc-camp-price="" style={{ fontSize: 20, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.price}</span>
          <span style={{ fontSize: 10.5, color: I.muted, letterSpacing: '0.08em' }}>CREDITS{c.per > 1 ? ' · ' + c.per + ' ROUNDS' : ''}</span>
        </span>
        <div role="group" aria-label={'How many ' + c.name} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', border: '1px solid #3B475D', borderRadius: 10 }}>
          <button type="button" data-phc-camp-less={c.key} aria-label="One fewer" disabled={!c.taken} onClick={() => step(-1)} style={{ width: 34, height: 38, border: 0, background: 'transparent', color: c.taken ? I.text : '#5E6A80', fontFamily: 'inherit', fontSize: 20, cursor: c.taken ? 'pointer' : 'default' }}>−</button>
          <span data-phc-camp-qty="" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.taken}</span>
          <button type="button" data-phc-camp-more={c.key} aria-label="One more" onClick={() => step(1)} {...tipProps(c.why)} style={{ width: 34, height: 38, border: 0, background: 'transparent', color: c.why ? '#5E6A80' : I.text, fontFamily: 'inherit', fontSize: 20, cursor: 'pointer' }}>+</button>
        </div>
      </div>
      <span data-phc-camp-why="" style={{ minHeight: 16, fontSize: 11.5, color: c.why ? I.muted : I.ok }}>{c.why || '✓ You can take this'}</span>
    </article>
  );
}

/** The starting boon: three large cards (rules 1.51), offered by what the loadout holds. */
function BoonStep({ v, charId }: { v: LoadoutViewV; charId: string }) {
  const cards = boonCards(v);
  return (
    <section data-phc-camp-row="boon" aria-label="Starting boon">
      <div role="radiogroup" aria-label="Starting boons" className="phc-camp-boons">
        {cards.map((k) => {
          const off = !!v.boon.why;
          return (
            <button key={k.id} type="button" role="radio" aria-checked={k.chosen ? 'true' : 'false'} data-phc-startboon={k.id} aria-disabled={off ? 'true' : undefined}
              {...tipProps(k.name + '. ' + k.text + ' ' + k.lineWord + '. ' + k.worthLine + '.' + (v.boon.why ? ' ' + v.boon.why : ''))}
              onClick={(e) => { if (off) openTipOn(e.currentTarget); else act({ type: 'run/boon', charId, choice: k.i } as any); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 'clamp(18px, 1.6vw, 28px) 16px', minHeight: 'clamp(300px, 40vh, 440px)', borderRadius: 16,
                border: k.chosen ? '2px solid ' + I.white : '1px solid ' + (off ? I.line : '#3B475D'), background: 'linear-gradient(180deg, rgba(28,37,54,.94) 0%, rgba(16,21,31,.94) 100%)', color: I.text, fontFamily: 'inherit', textAlign: 'center', cursor: off ? 'default' : 'pointer' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 'clamp(76px, 6vw, 104px)', height: 'clamp(76px, 6vw, 104px)', borderRadius: '50%', border: '1px solid ' + k.ink, background: I.ground, color: I.white }} dangerouslySetInnerHTML={{ __html: boonIconSvg(k.id, 56) }} />
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 'clamp(22px, 1.7vw, 30px)', fontWeight: 600 }}>{k.name}</span>
              <span style={{ fontSize: 'clamp(14px, 1vw, 17px)', lineHeight: 1.5, color: '#DCE2EC', maxWidth: 360 }}>{k.text}</span>
              <span data-phc-line={k.line} style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: k.ink }}>{k.lineWord.toUpperCase()}</span>
              <span style={{ marginTop: 'auto', fontSize: 13, color: I.white }}>{k.worthLine}</span>
              {k.chosen ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: I.ok }}>✓ CHOSEN</span> : !off ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: I.white }}>CHOOSE</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Character({ v }: { v: LoadoutViewV }) {
  const m = v.me, pct = Math.min(100, Math.round((m.kg / Math.max(1, m.limit)) * 100)), over = m.kg > m.limit;
  return (
    <section aria-label="Your character" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 22px', minHeight: 0, overflowY: 'auto', borderRight: '1px solid ' + I.line }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 300, aspectRatio: '4 / 5', alignSelf: 'center', borderRadius: 16, overflow: 'hidden', border: '1px solid #3B475D', background: I.raised, flexShrink: 0, maxHeight: 'calc(100vh - 460px)', minHeight: 160 }}>
        {m.portrait ? <img data-phc-camp-portrait="" src={m.portrait} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: I.muted, fontSize: 12, letterSpacing: '0.18em' }}>AHOC</div>}
      </div>
      <div>
        <h1 data-phc-camp-name="" style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 'clamp(26px, 2.2vw, 38px)', lineHeight: 1.1 }}>{m.name}</h1>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: I.muted }}>LEVEL {m.level} · ARMOUR CLASS {v.armourClass} ({v.armourName.toUpperCase()})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>CARRIED</span>
        <div aria-label={'Carrying ' + m.kg + ' of ' + m.limit + ' kg'} style={{ height: 8, borderRadius: 4, background: I.raised, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: over ? I.hp : I.text }} /></div>
        <span data-phc-camp-kg="" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: over ? I.hp : I.text }}>{m.kg} of {m.limit} kg</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>THE SKILLS GEAR READS</span>
        {v.skills.map((s) => (
          <div key={s.id} data-phc-camp-skill={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: s.points ? I.text : '#7F8BA1' }}>
            <span style={{ color: s.points ? ATTR_INK[s.attribute] || I.text : '#7F8BA1', fontWeight: 600 }}>{s.name}</span><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.points}</span>
          </div>))}
      </div>
    </section>
  );
}

export function LoadoutScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const [step, setStep] = React.useState<1 | 2>(1);
  const v = g ? loadoutView(g as any, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: I.muted }}>The camp is closed.</div>;
  const charId = v.me.id, last = (st as any).error as string | undefined;
  const groups: { name: string; cards: LoadoutCardV[] }[] = [];
  for (const s of v.shelves) for (const c of s.cards) { let gr = groups.find((x) => x.name === c.group); if (!gr) groups.push(gr = { name: c.group, cards: [] }); gr.cards.push(c); }
  const carryGroups: string[] = []; for (const r of v.carrying) if (!carryGroups.includes(r.group)) carryGroups.push(r.group);
  const solo = v.party.length <= 1;
  return (
    <div className="phc-camp" data-phc-fullscreen="" data-phc-camp="" style={{ position: 'fixed', inset: 0, zIndex: 50, background: I.ground, color: I.text, fontFamily: "'Chakra Petch', sans-serif", overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(260px, 22%) minmax(0, 1fr) minmax(300px, 25%)', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
        <header style={{ gridColumn: '1 / 4', display: 'flex', alignItems: 'baseline', gap: 16, padding: '18px 26px 14px', borderBottom: '1px solid ' + I.line }}>
          <h1 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 'clamp(26px, 2vw, 34px)' }}>The camp</h1>
          <nav aria-label="The camp's steps" style={{ display: 'flex', gap: 8 }}>
            {([[1, '1 · Loadout'], [2, '2 · Starting boon' + (v.boon.chosen ? ' ✓' : '')]] as const).map(([n, label]) => (
              <button key={n} type="button" data-phc-camp-step={n} aria-current={step === n ? 'step' : undefined} onClick={() => setStep(n)}
                style={{ minHeight: 34, padding: '0 14px', borderRadius: 99, border: '1px solid ' + (step === n ? I.white : '#3B475D'), background: step === n ? I.raised : 'transparent', color: step === n ? I.white : I.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{label}</button>))}
          </nav>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: I.muted, whiteSpace: 'nowrap' }}>Seed {v.seed}</span>
        </header>
        <Character v={v} />
        <main aria-label={step === 1 ? 'Loadout' : 'Starting boon'} data-phc-camp-take="" data-phc-camp-on={step} style={{ minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '18px 22px 48px' }}>
          {step === 1 ? <>
            <section data-phc-camp-row="weapon" style={{ marginBottom: 22 }}>
              {head('Weapon', 'one free')}
              {v.rack.map((a) => (
                <div key={a.id} data-phc-camp-rack={a.id} style={{ marginBottom: 14 }}>
                  <span style={{ ...kick, display: 'block', marginBottom: 8 }}>{a.name.toUpperCase()}</span>
                  <div className="phc-camp-rack" role="group" aria-label={a.name}>
                    <PickCard c={a.free} slot="weapon" charId={charId} />
                    {a.again ? <ShelfCard c={a.again} charId={charId} tag="ANOTHER ONE" /> : <span />}
                    {a.better ? <ShelfCard c={a.better} charId={charId} tag="THE BETTER ONE" compare={a.better.compare} /> : <span />}
                  </div>
                </div>))}
            </section>
            <section data-phc-camp-row="focus" style={{ marginBottom: 22 }}>
              {head('Focus', 'one free, or none')}
              <div className="phc-camp-pick" role="radiogroup" aria-label="Focus">{v.focus.map((c) => <PickCard key={c.key} c={c} slot="focus" charId={charId} />)}</div>
            </section>
            {groups.map((gr) => (
              <section key={gr.name} data-phc-camp-shelf={gr.name} style={{ marginBottom: 22 }}>
                {head(gr.name)}
                <div className="phc-camp-shelf">{gr.cards.map((c) => <ShelfCard key={c.key} c={c} charId={charId} />)}</div>
              </section>))}
          </> : <>
            {head('Starting boon', 'yours for the whole run')}
            <BoonStep v={v} charId={charId} />
          </>}
        </main>
        <aside aria-label="Carrying" data-phc-camp-carry="" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid ' + I.line, background: 'rgba(16,21,31,0.55)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '18px 22px 14px', borderBottom: '1px solid ' + I.line }}>
            <div data-phc-camp-left="" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={kick}>BUDGET LEFT</span>
              <span style={{ fontSize: 'clamp(34px, 2.8vw, 50px)', fontWeight: 700, lineHeight: 1, color: I.white, fontVariantNumeric: 'tabular-nums' }}>{v.left}</span>
            </div>
            <div data-phc-camp-used="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={kick}>BUDGET USED</span>
              <span style={{ fontSize: 'clamp(34px, 2.8vw, 50px)', fontWeight: 700, lineHeight: 1, color: I.muted, fontVariantNumeric: 'tabular-nums' }}>{v.spent}</span>
            </div>
            <span style={{ gridColumn: '1 / 3', fontSize: 12, color: I.muted }}>of {v.budget} credits · what you don't spend, you keep</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 22px' }}>
            <h2 style={{ margin: '0 0 10px', fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>Carrying</h2>
            {!v.carrying.length ? <p style={{ margin: 0, fontSize: 13.5, color: I.muted }}>Nothing yet: bare fists.</p> : null}
            {carryGroups.map((gr) => (
              <div key={gr} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <span style={kick}>{gr.toUpperCase()}</span>
                {v.carrying.filter((r) => r.group === gr).map((r, i) => (
                  <div key={i} data-phc-camp-carry-row="" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, lineHeight: 1.35 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{r.label}</span>
                    {r.kg ? <span style={{ color: I.muted, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{r.kg} kg</span> : null}
                    {r.put ? <button type="button" data-phc-camp-put="" aria-label={(r.putLabel || 'Remove') + ': ' + r.label} onClick={() => act(r.put as any)} style={{ minHeight: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{r.putLabel || 'Remove'}</button> : null}
                  </div>))}
              </div>))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 22px 20px', borderTop: '1px solid ' + I.line }}>
            {last ? <span data-phc-camp-refusal="" role="status" style={{ fontSize: 13, color: I.white }}>{last}</span> : null}
            {!solo ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{v.party.map((p) => (
              <span key={p.id} data-phc-party={p.id} data-phc-ready={p.ready ? '1' : '0'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', borderRadius: 99, background: I.panel, border: '1px solid ' + (p.ready ? I.white : I.line), opacity: p.online ? 1 : 0.5, fontSize: 12 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 9, fontWeight: 700, background: p.color, color: I.ground }}>{p.initials}</span>
                {p.charName}{p.mine ? ' (you)' : ''} <b style={{ color: p.ready ? I.white : I.muted }}>{p.ready ? '✓ READY' : 'PACKING'}</b>
              </span>))}</div> : null}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" data-phc-camp-recommended="" disabled={v.ready} onClick={() => act({ type: 'run/loadout', charId, op: 'recommended' } as any)} {...tipProps('A loadout for your skills: the focus you can use, the weapon for your best weapon skill, armour, then ammunition.')}
                style={{ flex: 1, minHeight: 46, borderRadius: 12, border: '1px solid #3B475D', background: 'transparent', color: v.ready ? I.muted : I.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: v.ready ? 'default' : 'pointer' }}>Recommended</button>
              {!v.boon.chosen && !v.ready && v.boon.cards.length ? (
                <button type="button" data-phc-camp-next="" onClick={() => setStep(2)} disabled={step === 2} {...tipProps(step === 2 ? 'Choose one of the three.' : null)}
                  style={{ flex: 1.3, minHeight: 46, borderRadius: 12, border: 0, background: step === 2 ? I.raised : I.text, color: step === 2 ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: step === 2 ? 'default' : 'pointer' }}>{step === 2 ? 'Choose a starting boon' : 'Next: starting boon'}</button>
              ) : (
                <button type="button" data-phc-camp-ready="" onClick={() => act({ type: 'run/ready', ...(v.ready ? { undo: true } : {}) } as any)}
                  style={{ flex: 1.3, minHeight: 46, borderRadius: 12, border: 0, background: v.ready ? I.raised : I.ok, color: v.ready ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{solo ? 'Start the run' : v.ready ? '✓ Ready (undo)' : 'Ready'}</button>
              )}
            </div>
            {!solo && v.isHost ? <button type="button" data-phc-camp-close="" onClick={() => act({ type: 'run/ready', close: true } as any)} {...tipProps('Everyone sets out now. Anyone still away gets the Recommended loadout and the first starting boon.')}
              style={{ minHeight: 40, borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start for everyone{v.waiting.length ? ' (waiting: ' + v.waiting.join(', ') + ')' : ''}</button> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
