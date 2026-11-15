// THE CAMP (rules 1.51, 1.52; Leon, 14 Nov 2026: a loadout screen with what can be taken, what has been taken, the
// points left and used, and Start; then the starting boon). ONE flow, in the house frame (the shop's inks and fonts:
// Spectral titles, Chakra Petch for the UI and numbers). Rules 1.54 item 11: it is the play screen's MIDDLE column; the
// character is the sheet on the left (its GEAR tab read-only here), and Ready / Start is the right panel's one phase
// control (runPanels.tsx), drawn again in the camp's top bar. The top bar (Leon, 15 Nov: "always able to see the budget
// and the next button even when you scroll down") is sticky at the top of the middle column's scroll: the title, the two
// steps, BUDGET LEFT and BUDGET USED large, Recommended and Next (or Ready), the last refusal in words. Then two steps:
// 1 LOADOUT (the weapon rack by archetype, each family two cards in a grid that uses the width: the free weapon with "the
// same again" at its price at its foot, and the better one with its numbers against the free one; the free Focus; then
// the shop's menu: ammunition, thrown, mana and parts, medicine and supplies, gear, with prices and steppers) and
// 2 STARTING BOON (three large cards, centred, offered by what the loadout holds, with CARRYING under them, Free | Bought).
// Every number and reason is the engine's (`loadoutView`: priceOf, the gear preview, the reducer's own refusals tried on
// a copy, startOffer); every action is `run/loadout`, `run/boon` or `run/ready`.
import React from 'react';
import { act, getState } from './store';
import { loadoutView, type LoadoutCardV, type LoadoutViewV, type CompareRowV, type CarryRowV } from '@engine';
import { gearIconUri, roundsGearId, magGearId } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { FRAME_INK as I } from './FullScreenFrame';
import { boonCards, campBackdrop } from './campView';
import { boonIconSvg } from './boonIcons';
import { MoveOn } from './runPanels';
import { PlaceBar, BarNumber } from './PlaceBar';
import { shownLines } from './previewLines';

const kick: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: I.muted };
/** Names wrap inside their card, never over the next one. */
const wrap: React.CSSProperties = { minWidth: 0, overflowWrap: 'anywhere' };
const CSS = '.phc-camp ::-webkit-scrollbar{width:10px}.phc-camp ::-webkit-scrollbar-thumb{background:#2A3447;border-radius:6px}'
  + '.phc-camp button:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}'
  + '.phc-camp *{min-width:0}'
  // the families of the rack, the foci and the shop's cards flow in grids that use the middle's width (auto-fit: an empty
  // track collapses, so a short row leaves no dead space on the right)
  // (0.28.1 gate: with one card a family, the two-card blocks left half of every block empty) the families, the foci and
  // the shelves flow and wrap; a group is only as wide as its own cards, and every card is one fixed width
  + '.phc-camp-families{display:flex;flex-wrap:wrap;gap:18px 22px;align-items:flex-start}'
  + '.phc-camp-families>*{flex:0 1 auto;max-width:100%}'
  + '.phc-camp-pair,.phc-camp-pick,.phc-camp-shelf{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}'
  + '.phc-camp .phc-camp-pair>*,.phc-camp .phc-camp-pick>*,.phc-camp .phc-camp-shelf>*{flex:0 1 270px;width:270px;min-width:min(250px,100%);max-width:100%}'
  + '.phc-camp-shelves{display:flex;flex-wrap:wrap;gap:4px 22px;align-items:flex-start}'
  + '.phc-camp-shelves>*{flex:0 1 auto;max-width:100%}'
  + '.phc-camp-boons{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),340px));justify-content:center;gap:18px}'
  + '.phc-camp-carry{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 28px}'
  + '@media (max-width:700px){.phc-camp-carry{grid-template-columns:minmax(0,1fr)}}'
  // a stat row: label | value (| the better one's value); the label always shown, whole, wrapping
  + '.phc-camp-stats{margin:0;display:grid;gap:3px 10px;font-size:14px;line-height:1.3}'
  + '.phc-camp-stats dt{color:#A3AEC2;overflow-wrap:break-word}.phc-camp-stats dd{margin:0;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:break-word}';
/** A card's picture: the painted gear icon (rounds and magazines by their gear ids), else the line icon. */
function iconOf(id: string): string {
  const r = /^rounds:([^:]+)/.exec(id), m = /^mag:([^:]+)/.exec(id); // rules 1.55: mag:<weapon>:0 is an empty one; rules 1.56: rounds:<calibre>:<type> a special round of it
  if (r) return gearIconUri(roundsGearId(r[1]), undefined, { large: true });
  if (m) return gearIconUri(magGearId(m[1]), undefined, { large: true }) || gearIconUri(m[1], undefined, { large: true });
  return gearIconUri(id.replace(/^armour:\d$/, 'armour'), undefined, { large: true });
}
const head = (title: string, note?: string) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '4px 0 12px' }}>
    <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>{title}</h2>
    {note ? <span style={{ fontSize: 14, color: I.muted }}>{note}</span> : null}
    <span aria-hidden="true" style={{ flex: 1, height: 1, background: I.line, alignSelf: 'center' }} />
  </div>
);
const Icon = ({ src, size = 48 }: { src: string; size?: number }) => (
  <span style={{ flexShrink: 0, width: size + 6, height: size + 6, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}>
    {src ? <img src={src} alt="" width={size} height={size} style={{ objectFit: 'contain' }} /> : <span style={{ color: I.muted }}>+</span>}
  </span>
);
const label = (s: string) => s.replace(/ \(.*\)$/, '');
const cardBox = (on: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, minWidth: 0, color: I.text,
  background: on ? 'linear-gradient(180deg, rgba(44,56,78,0.98), rgba(28,37,54,0.98))' : 'linear-gradient(180deg, rgba(28,37,54,0.92), rgba(16,21,31,0.92))', border: on ? '2px solid ' + I.white : '1px solid ' + I.line });

/** A stepper: − n + (the engine's `run/loadout` take; its refusal on the + as a tip). */
function Stepper({ c, charId, big }: { c: LoadoutCardV; charId: string; big?: boolean }) {
  const step = (q: number) => act({ type: 'run/loadout', charId, op: 'take', key: c.key, qty: q } as any);
  const h = big ? 38 : 32;
  return (
    <div role="group" aria-label={'How many ' + c.name} style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', border: '1px solid #3B475D', borderRadius: 10 }}>
      <button type="button" data-phc-camp-less={c.key} aria-label="One fewer" disabled={!c.taken} onClick={() => step(-1)} style={{ width: 34, height: h, border: 0, background: 'transparent', color: c.taken ? I.text : '#5E6A80', fontFamily: 'inherit', fontSize: 20, cursor: c.taken ? 'pointer' : 'default' }}>−</button>
      <span data-phc-camp-qty="" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{c.taken}</span>
      <button type="button" data-phc-camp-more={c.key} aria-label="One more" onClick={() => step(1)} {...tipProps(c.why)} style={{ width: 34, height: h, border: 0, background: 'transparent', color: c.why ? '#5E6A80' : I.text, fontFamily: 'inherit', fontSize: 20, cursor: 'pointer' }}>+</button>
    </div>
  );
}
const Why = ({ c }: { c: LoadoutCardV }) => <span data-phc-camp-why="" style={{ fontSize: 13, lineHeight: 1.35, color: c.why ? I.muted : I.ok, ...wrap }}>{c.why || '✓ You can take this'}</span>;

/** A free pick (the free Weapon or Focus): the pick itself is the card's top (a button); a rack's "same again" at its
 * price sits at its foot, a compact line with its own stepper. */
function PickCard({ c, slot, charId, again }: { c: LoadoutCardV; slot: 'weapon' | 'focus'; charId: string; again?: LoadoutCardV | null }) {
  const off = !c.picked && !!c.why;
  return (
    <article data-phc-camp-free={c.key} style={{ ...cardBox(c.picked), padding: 0, gap: 0 }}>
      <button type="button" data-phc-camp-pick={slot + ':' + c.id} aria-pressed={c.picked} onClick={() => act({ type: 'run/loadout', charId, op: 'pick', slot, id: c.picked ? null : c.id } as any)} {...tipProps(c.why || c.text || c.name)}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, minWidth: 0, textAlign: 'left', fontFamily: 'inherit', color: I.text, cursor: 'pointer', background: 'transparent', border: 0, borderRadius: 14, opacity: off ? 0.6 : 1 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0, width: '100%' }}>
          <Icon src={iconOf(c.id)} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, ...wrap }}>
            <span data-phc-camp-name="" style={{ fontFamily: "'Spectral', serif", fontSize: 18, fontWeight: 600, lineHeight: 1.15, ...wrap }}>{label(c.name)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: c.picked ? I.white : I.muted }}>{c.picked ? '✓ TAKEN · FREE' : 'FREE'}</span>
          </span>
        </div>
        <dl className="phc-camp-stats" data-phc-camp-stats="" style={{ width: '100%', gridTemplateColumns: 'minmax(6.5em, 1fr) minmax(0, auto)' }}>
          {shownLines(c.preview.lines, 4).map((l) => <React.Fragment key={l.key}><dt {...tipProps(l.label)}>{label(l.label)}</dt><dd>{l.value}</dd></React.Fragment>)}
        </dl>
        {off ? <span style={{ marginTop: 'auto', fontSize: 13, color: I.muted, ...wrap }}>{c.why}</span> : null}
      </button>
      {again ? (
        <div data-phc-camp-card={again.key} {...tipProps(again.text ? again.name + '. ' + again.text : again.name)} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px 12px', borderTop: '1px solid ' + I.line }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', ...wrap }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Another ·</span>
              <span style={{ whiteSpace: 'nowrap' }}><span data-phc-camp-price="" style={{ fontSize: 20, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{again.price}</span>
              <span style={{ fontSize: 13, color: I.muted }}> credits</span></span>
            </span>
            <Stepper c={again} charId={charId} />
          </div>
          <Why c={again} />
        </div>) : null}
    </article>
  );
}
/** A menu card with its price and a stepper (the rack's better one with its numbers against the free one). */
function ShelfCard({ c, charId, tag, compare }: { c: LoadoutCardV; charId: string; tag?: string; compare?: CompareRowV[] }) {
  return (
    <article data-phc-camp-card={c.key} {...tipProps(c.text ? c.name + '. ' + c.text : c.name)} style={{ ...cardBox(false), border: '1px solid ' + (c.taken ? '#7A879E' : I.line) }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
        <Icon src={iconOf(c.id)} size={46} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, ...wrap }}>
          <span data-phc-camp-name="" style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, lineHeight: 1.15, ...wrap }}>{c.name}</span>
          {tag ? <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: I.muted }}>{tag}</span> : null}
        </span>
      </div>
      {compare && compare.length ? (
        <dl className="phc-camp-stats" data-phc-camp-compare="" data-phc-camp-stats="" style={{ gridTemplateColumns: 'minmax(6.5em, 1fr) minmax(0, auto) minmax(0, auto)' }}>
          <dt aria-hidden="true" style={{ fontSize: 13 }} />
          <dd aria-hidden="true" style={{ fontSize: 13, fontWeight: 400, color: I.muted }}>Free</dd>
          <dd aria-hidden="true" style={{ fontSize: 13, fontWeight: 400, color: I.muted }}>This</dd>
          {compare.slice(0, 4).map((r) => <React.Fragment key={r.key}>
            <dt {...tipProps(r.label)}>{label(r.label)}</dt>
            <dd style={{ color: I.muted, fontWeight: 400 }}>{r.free}</dd>
            <dd data-phc-diff={r.diff || ''} style={{ color: r.diff === 'better' ? I.ok : r.diff === 'worse' ? I.hp : I.text }}>{(r.diff === 'better' ? '▲ ' : r.diff === 'worse' ? '▼ ' : '') + r.better}</dd>
          </React.Fragment>)}
        </dl>) : c.preview.lines.length ? (
        <dl className="phc-camp-stats" data-phc-camp-stats="" style={{ gridTemplateColumns: 'minmax(6.5em, 1fr) minmax(0, auto)' }}>
          {shownLines(c.preview.lines, 2).map((l) => <React.Fragment key={l.key}><dt {...tipProps(l.label)}>{label(l.label)}</dt><dd>{l.value}</dd></React.Fragment>)}
        </dl>) : <span style={{ fontSize: 14, color: I.muted }}>{c.preview.category}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span data-phc-camp-price="" style={{ fontSize: 20, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{c.price}</span>
          <span style={{ fontSize: 13, color: I.muted, letterSpacing: '0.06em' }}>CREDITS{c.per > 1 ? ' · ' + c.per + ' ROUNDS' : ''}</span>
        </span>
        <Stepper c={c} charId={charId} big />
      </div>
      <Why c={c} />
    </article>
  );
}

/** The starting boon: three large cards (rules 1.51), centred, offered by what the loadout holds. */
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 20px 20px', minHeight: 420, minWidth: 0, borderRadius: 16,
                border: k.chosen ? '2px solid ' + I.white : '1px solid ' + (off ? I.line : '#3B475D'), background: k.chosen ? 'linear-gradient(180deg, rgba(44,56,78,.98) 0%, rgba(28,37,54,.98) 100%)' : 'linear-gradient(180deg, rgba(28,37,54,.94) 0%, rgba(16,21,31,.94) 100%)', color: I.text, fontFamily: 'inherit', textAlign: 'center', cursor: off ? 'default' : 'pointer' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 96, height: 96, flexShrink: 0, borderRadius: '50%', border: '1px solid ' + k.ink, background: I.ground, color: I.white }} dangerouslySetInnerHTML={{ __html: boonIconSvg(k.id, 56) }} />
              <span data-phc-camp-name="" style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600, lineHeight: 1.15, ...wrap }}>{k.name}</span>
              <span data-phc-line={k.line} style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: k.ink }}>{k.lineWord.toUpperCase()}</span>
              <span style={{ fontSize: 16, lineHeight: 1.5, color: '#DCE2EC', ...wrap }}>{k.text}</span>
              <span style={{ marginTop: 'auto', fontSize: 14, color: I.white }}>{k.worthLine}</span>
              <span aria-hidden="true" data-phc-boon-choose={k.chosen ? 'chosen' : off ? 'off' : 'choose'} style={{ alignSelf: 'stretch', minHeight: 44, display: 'grid', placeItems: 'center', borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: '0.12em',
                ...(k.chosen ? { background: 'transparent', border: '2px solid ' + I.ok, color: I.ok } : off ? { background: 'transparent', border: '1px solid ' + I.line, color: I.muted } : { background: I.text, color: I.ground, border: 0 }) }}>{k.chosen ? '✓ CHOSEN' : 'CHOOSE'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** What is taken, in two columns: Free (the picks, the spare, what comes in the pack) | Bought; each removable. */
function Carrying({ v, wide }: { v: LoadoutViewV; wide?: boolean }) {
  const col = (free: boolean) => {
    const rows = v.carrying.filter((r) => r.free === free), groups: string[] = []; for (const r of rows) if (!groups.includes(r.group)) groups.push(r.group);
    return (
      <div data-phc-camp-carry-col={free ? 'free' : 'bought'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!groups.length ? <><span style={kick}>{free ? 'FREE' : 'BOUGHT'}</span><span style={{ fontSize: 14, color: I.muted }}>{free ? 'Nothing yet: bare fists.' : 'Nothing bought yet.'}</span></> : null}
        {groups.map((gr) => (
          <div key={gr} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <span style={kick}>{gr.toUpperCase()}</span>
            {rows.filter((r) => r.group === gr).map((r: CarryRowV, i) => (
              <div key={i} data-phc-camp-carry-row="" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, lineHeight: 1.35 }}>
                <span style={{ flex: 1, ...wrap }}>{r.label}</span>
                {r.kg ? <span style={{ color: I.muted, fontVariantNumeric: 'tabular-nums', fontSize: 13, whiteSpace: 'nowrap' }}>{r.kg} kg</span> : null}
                {r.put ? <button type="button" data-phc-camp-put="" aria-label={(r.putLabel || 'Remove') + ': ' + r.label} onClick={() => act(r.put as any)} style={{ minHeight: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{r.putLabel || 'Remove'}</button> : null}
              </div>))}
          </div>))}
      </div>
    );
  };
  return (
    <section aria-label="Carrying" data-phc-camp-carry="" style={{ padding: '16px 20px 24px', borderRadius: wide ? 0 : 14, borderTop: '1px solid ' + I.line, background: I.panel, ...(wide ? {} : { border: '1px solid ' + I.line, width: '100%', maxWidth: 3 * 340 + 2 * 18, margin: '20px auto 0', boxSizing: 'border-box' }) }}>
      <h2 style={{ margin: '0 0 10px', fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 22 }}>Carrying</h2>
      <div className="phc-camp-carry">{col(true)}{col(false)}</div>
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
  const solo = v.solo;
  const go = (n: 1 | 2) => { setStep(n); const sc = document.querySelector('[data-phc-camp]')?.parentElement; if (sc && sc.scrollTop) sc.scrollTop = 0; };
  const pill = (on: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 16px', borderRadius: 10, border: 0, background: on ? I.text : I.raised, color: on ? I.ground : I.muted, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: on ? 'pointer' : 'default' });
  return (
    <div className="phc-camp" data-phc-camp="" style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', background: I.ground, color: I.text, fontFamily: "'Chakra Petch', sans-serif" }}>
      <style>{CSS}</style>
      {/* the place header (PlaceBar, the visibility standard): sticky at the top of the middle column's scroll, over the cards */}
      <PlaceBar marks={{ 'data-phc-camp-bar': '' }} name="The camp" backdrop={campBackdrop()}
        tabs={<nav aria-label="The camp's steps" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 0 10px' }}>
          {([[1, '1 · Loadout'], [2, '2 · Starting boon' + (v.boon.chosen ? ' ✓' : '')]] as const).map(([n, lab]) => (
            <button key={n} type="button" data-phc-camp-step={n} aria-current={step === n ? 'step' : undefined} onClick={() => go(n)}
              style={{ minHeight: 34, padding: '0 14px', borderRadius: 99, border: '1px solid ' + (step === n ? I.white : '#3B475D'), background: step === n ? I.raised : 'transparent', color: step === n ? I.white : I.muted, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{lab}</button>))}
        </nav>}
        money={<div data-phc-camp-budget="" style={{ display: 'flex', alignItems: 'center', gap: '10px 18px', flexWrap: 'wrap' }}>
          <BarNumber label="BUDGET LEFT" n={v.left} mark={{ 'data-phc-camp-left': '' }} />
          <BarNumber label="BUDGET USED" n={v.spent} muted mark={{ 'data-phc-camp-used': '' }} />
          <span style={{ fontSize: 13, color: I.muted, maxWidth: 170, lineHeight: 1.35 }}>of {v.budget} credits · what you don't spend, you keep</span>
        </div>}
        actions={<>
          <button type="button" data-phc-camp-recommended="" disabled={v.ready} onClick={() => act({ type: 'run/loadout', charId, op: 'recommended' } as any)} {...tipProps('A loadout for your skills: the focus you can use, the weapon for your best weapon skill, armour, then ammunition.')}
            style={{ minHeight: 42, padding: '0 14px', borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: v.ready ? I.muted : I.text, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: v.ready ? 'default' : 'pointer' }}>Recommended</button>
          {!v.boon.chosen && !v.ready && v.boon.cards.length ? (
            <button type="button" data-phc-camp-next="" onClick={() => go(2)} disabled={step === 2} {...tipProps(step === 2 ? 'Choose one of the three.' : null)} style={pill(step !== 2)}>{step === 2 ? 'Choose a boon' : 'Starting boon ›'}</button>
          ) : <MoveOn />}
          {!solo && v.isHost ? <button type="button" data-phc-camp-close="" onClick={() => act({ type: 'run/ready', close: true } as any)} {...tipProps('Everyone sets out now. Anyone still away gets the Recommended loadout and the first starting boon.')}
            style={{ minHeight: 42, padding: '0 14px', borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Start for everyone{v.waiting.length ? ' (waiting: ' + v.waiting.join(', ') + ')' : ''}</button> : null}
        </>}
        foot={last ? <span data-phc-camp-refusal="" role="status" style={{ fontSize: 14, color: I.white }}>{last}</span> : null} />
      <main aria-label={step === 1 ? 'Loadout' : 'Starting boon'} data-phc-camp-take="" data-phc-camp-on={step} style={{ padding: '18px 20px 20px' }}>
        {step === 1 ? <>
          <section data-phc-camp-row="weapon" style={{ marginBottom: 26 }}>
            {head('Weapon', 'one free')}
            <div className="phc-camp-families">
              {v.rack.map((a) => (
                <div key={a.id} data-phc-camp-rack={a.id} style={{ minWidth: 0 }}>
                  <span style={{ ...kick, display: 'block', marginBottom: 8 }}>{a.name.toUpperCase()}</span>
                  <div className="phc-camp-pair" role="group" aria-label={a.name}>
                    <PickCard c={a.free} slot="weapon" charId={charId} again={a.again} />
                    {a.better ? <ShelfCard c={a.better} charId={charId} tag="THE BETTER ONE" compare={a.better.compare} /> : null}
                  </div>
                </div>))}
            </div>
          </section>
          <section data-phc-camp-row="focus" style={{ marginBottom: 26 }}>
            {head('Focus', 'one free, or none')}
            <div className="phc-camp-pick" role="radiogroup" aria-label="Focus">{v.focus.map((c) => <PickCard key={c.key} c={c} slot="focus" charId={charId} />)}</div>
          </section>
          <div className="phc-camp-shelves">
            {groups.map((gr) => (
              <section key={gr.name} data-phc-camp-shelf={gr.name} style={{ marginBottom: 22, minWidth: 0 }}>
                {head(gr.name)}
                <div className="phc-camp-shelf">{gr.cards.map((c) => <ShelfCard key={c.key} c={c} charId={charId} />)}</div>
              </section>))}
          </div>
        </> : <>
          {head('Starting boon', 'yours for the whole run')}
          <BoonStep v={v} charId={charId} />
          <Carrying v={v} />
        </>}
      </main>
      {step === 1 ? <Carrying v={v} wide /> : null}
    </div>
  );
}
