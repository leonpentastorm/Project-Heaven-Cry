// The shop (survival-spec 8.3; rules 1.42), the play screen's middle when the party stands on a shop (rules 1.54 item
// 11: the side panels kept; your hands and pack are the sheet's GEAR tab, the one place for gear). Drawn in
// FullScreenFrame (every safe node's frame since rules 1.46): the keeper, the tabs (Always in stock, Today's gear,
// Upgrade: 4a's grade step through the services seam, Sell, Give: GiveTab.tsx), large item cards two across, your
// purse, and the compare panel against what you hold under the shelves (survival-spec 14.7). Everything it shows comes from the engine: `shopView` (prices, quantities, the reasons
// a thing can't be bought, the sell values) and `compareGear` (the gear preview's numbers, both columns); every action is
// a `run/*` sent through the store. Each player browses their own view of the one shared stock.
import React from 'react';
import { act, getState } from './store';
import { shopView, compareGear, type ShopCardV, type ShopViewV, type Rarity } from '@engine';
import { gearIconUri } from './gearIcons';
import { tipProps } from './actionTip';
import { MoveOn } from './runPanels';
import { FullScreenFrame, FRAME_INK as I, type FrameTab, useKeeperLine } from './FullScreenFrame';
import ASSETS from './assets.json';
import { GiveTab } from './GiveTab';
import { AmountField } from './AmountField';
import { UpgradeCard } from './UpgradeCard';
import { shownLines } from './previewLines';

const A = ASSETS as Record<string, string>;
const art = (k: string) => (k ? A[k + '-lg'] || A[k] || '' : '');
/** The attribute inks of the colour system (CLAUDE.md), for a focus card's door word only. */
const ATTR_INK: Record<string, string> = { endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', intelligence: '#8BDEEE', expression: '#5394AC', insight: '#EB95B7', determination: '#9D7ADC', virtue: '#D36A90' };
const MARK = '◆';
/** A card's picture: the one resolver (gearIcons.ts), which reads the engine's ids as they come (rounds, magazines,
 *  body armour of a class), the same picture the sheet's GEAR tab shows. */
const iconOf = (id: string): string => gearIconUri(id, undefined, { large: true });
const kick: React.CSSProperties = { fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
const shelfHead = (name: string, note?: string) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '6px 0 12px' }}>
    <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>{name}</h2>
    {note ? <span style={{ fontSize: 'var(--fs-sub)', color: I.muted }}>{note}</span> : null}
    <span aria-hidden="true" style={{ flex: 1, height: 1, background: I.line, alignSelf: 'center' }} />
  </div>
);
/** A big card takes two columns where there are two; on a phone's one column, one (a span of 2 there widened the page). */
const BIG_CSS = '.phc-shop-big{grid-column:span 2}@media (max-width:640px){.phc-shop-big{grid-column:auto}}';
const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gridAutoFlow: 'row dense', gap: 16, marginBottom: 28 };

function Card({ c, qty, setQty, onFocus, onBuy, big }: { c: ShopCardV; qty: number; setQty: (n: number) => void; onFocus: () => void; onBuy: () => void; big?: boolean }) {
  const why = c.whys[qty - 1] ?? c.why, total = c.totals[qty - 1] ?? c.price, sold = !!c.sold, graded = c.rarity !== 'standard';
  const icon = iconOf(c.id);
  return (
    <article data-phc-card={c.key} data-phc-card-id={c.id} tabIndex={0} onMouseEnter={onFocus} onFocus={onFocus} {...tipProps(c.name + '. ' + c.text)} className={big ? 'phc-shop-big' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 236, padding: 18, borderRadius: 16, background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', border: '1px solid ' + (graded ? '#7A879E' : I.line), boxShadow: graded ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none', opacity: sold ? 0.55 : 1, position: 'relative' }}>
      {graded ? <span aria-hidden="true" style={{ position: 'absolute', top: 10, right: 14, fontSize: 'var(--fs-sub)', letterSpacing: '0.3em', color: I.white }}>{MARK.repeat(c.marks)}</span> : null}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: big ? 112 : 88, height: big ? 112 : 88, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}>
          {icon ? <img data-zoom={c.name} data-zoom-text={c.text} src={icon} alt="" width={big ? 104 : 80} height={big ? 104 : 80} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 28, color: I.muted }}>+</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span data-phc-card-name="" style={{ fontFamily: "'Spectral', serif", fontSize: big ? 24 : 19, fontWeight: 600, lineHeight: 1.15 }}>{c.name}</span>
          {graded || ['weapon', 'focus', 'armour'].includes(c.preview.kind) || c.rare ? <span data-phc-grade="" style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.14em', color: graded ? I.white : I.muted }}>{c.rarityWord.toUpperCase()}{graded ? ' ' + MARK.repeat(c.marks) : ''}{c.rare ? ' · RARE' : ''}</span> : null}
          <span style={{ fontSize: 'var(--fs-sub)', color: I.muted }}>{c.doorWord && c.attr ? <>{c.forLine.split(' · ')[0]} · <span style={{ color: ATTR_INK[c.attr] || I.text }}>{c.doorWord}</span>{c.forLine.includes(' · yours') ? ' · yours' : ''}</> : c.forLine}</span>
        </div>
      </div>
      {c.preview.lines.length ? (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 'var(--fs-sub)' }}>
          {shownLines(c.preview.lines, 5).map((l) => <React.Fragment key={l.key}><dt style={{ color: I.muted }}>{l.label}</dt><dd data-phc-num={l.key} style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{l.value}</dd></React.Fragment>)}
        </dl>
      ) : null}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span data-phc-price="" style={{ fontSize: 26, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString('en')}</span>
          <span style={{ fontSize: 'var(--fs-sub)', color: I.muted, letterSpacing: '0.08em' }}>CREDITS{c.per > 1 ? ' · for ' + c.per * qty : qty > 1 ? ' · for ' + qty : ''}</span>
        </div>
        {c.qtyMax > 1 && !sold ? (
          <div role="group" aria-label="How many" style={{ display: 'flex', alignItems: 'center', border: '1px solid #3B475D', borderRadius: 10 }}>
            <button type="button" aria-label="One fewer" onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 28, height: 38, border: 0, background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 18, cursor: 'pointer' }}>‹</button>
            <span data-phc-qty="" style={{ minWidth: 22, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
            <button type="button" aria-label="One more" onClick={() => setQty(Math.min(c.qtyMax, qty + 1))} style={{ width: 28, height: 38, border: 0, background: 'transparent', color: I.text, fontFamily: 'inherit', fontSize: 18, cursor: 'pointer' }}>›</button>
          </div>
        ) : null}
        <button type="button" data-phc-buy={c.key} disabled={sold} onClick={onBuy}
          style={{ marginLeft: 'auto', minHeight: 42, padding: '0 16px', borderRadius: 10, border: 0, background: sold ? I.raised : why ? 'transparent' : I.text, outline: why && !sold ? '1px solid #3B475D' : 'none', color: sold ? I.muted : why ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: sold ? 'default' : 'pointer' }}>Buy</button>
      </div>
      <span data-phc-status="" style={{ minHeight: 18, fontSize: 'var(--fs-sub)', fontWeight: sold ? 700 : 500, color: sold ? I.white : why ? I.muted : I.ok }}>{sold ? 'Sold to ' + c.sold : why ? why : ''}</span>
    </article>
  );
}

function Compare({ v, focus }: { v: ShopViewV; focus: { id: string; rarity: Rarity } | null }) {
  const g = getState().game, c = v.me && g ? g.characters[v.me.id] : null;
  if (!c || !focus || focus.id.startsWith('restock:')) return <p style={{ margin: 0, fontSize: 'var(--fs-sub)', color: I.muted, lineHeight: 1.5 }}>Hover a card to compare it with what you hold.</p>;
  const cmp = compareGear(c, { id: focus.id, rarity: focus.rarity });
  if (!cmp.held) return <p data-phc-compare="" style={{ margin: 0, fontSize: 'var(--fs-sub)', color: I.muted, lineHeight: 1.5 }}>{cmp.next.name} goes in your pack. It replaces nothing you hold.</p>;
  return (
    <div data-phc-compare="" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.12em', color: I.muted }}>
        <span>{(cmp.slot || '').toUpperCase()}</span><span>HOLDING</span><span>THIS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 'var(--fs-sub)', fontWeight: 600 }}>
        <span style={{ color: I.muted }}>Item</span><span>{cmp.held.name}</span><span>{cmp.next.name}</span>
      </div>
      {cmp.rows.map((r) => (
        <div key={r.key} data-phc-cmp={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 'var(--fs-sub)', alignItems: 'baseline', paddingTop: 6, borderTop: '1px solid ' + I.line }}>
          <span style={{ color: I.muted }}>{r.label.replace(/ \(.*\)$/, '')}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.held}</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.next}{r.diff && r.diff !== 'same' ? <span style={{ marginLeft: 6, fontSize: 'var(--fs-sub)', color: r.diff === 'better' ? I.ok : I.muted }}>{r.diff === 'better' ? '▲' : '▼'}</span> : r.diff === 'same' ? <span style={{ marginLeft: 6, fontSize: 'var(--fs-sub)', color: I.muted }}>= same</span> : null}</span>
        </div>
      ))}
    </div>
  );
}

export function ShopScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const [tab, setTab] = React.useState('always'), [focus, setFocus] = React.useState<{ id: string; rarity: Rarity } | null>(null);
  const [qty, setQtyMap] = React.useState<Record<string, number>>({}), [confirm, setConfirm] = React.useState<string | null>(null);
  const v = g ? shopView(g as any, me) : null;
  const say = useKeeperLine(v?.face.says || {}, tab === 'always' ? 'stock' : tab, v?.face.line || '', v?.log.length || 0); // (before any return: a hook)
  if (!g || !v) return <div style={{ padding: 40, color: I.muted }}>No shop is open.</div>;
  const charId = v.me?.id || '';
  const q = (k: string) => qty[k] || 1, setQ = (k: string) => (n: number) => setQtyMap({ ...qty, [k]: n });
  const buy = (c: ShopCardV) => act({ type: 'run/buy', charId, key: c.key, qty: q(c.key) });
  const card = (c: ShopCardV, big = false) => <Card key={c.key} c={c} qty={q(c.key)} setQty={setQ(c.key)} onFocus={() => setFocus({ id: c.id, rarity: c.rarity })} onBuy={() => buy(c)} big={big} />;
  const tabs: FrameTab[] = [
    { id: 'always', label: 'Always in stock' }, { id: 'gear', label: "Today's gear" }, { id: 'upgrade', label: 'Repair and upgrade' }, { id: 'sell', label: 'Sell' },
    ...(Object.keys(g.characters).length > 1 ? [{ id: 'give', label: 'Give' }] : []), // a solo player has no one to hand anything to
  ];
  const portrait = v.face.portraitPending ? (v.face.fallback ? art('char-' + v.face.fallback) : '') : art(v.face.portrait);
  const backdrop = v.face.backdropPending ? (v.face.backdropFallback ? art('ill-' + v.face.backdropFallback) : '') : art(v.face.backdrop);
  let body: React.ReactNode;
  if (tab === 'always') body = v.shelves.map((s) => <section key={s.shelf} data-phc-shelf={s.shelf}>{shelfHead(s.name)}<div style={GRID}>{s.cards.map((c) => card(c))}</div></section>);
  else if (tab === 'gear') body = <section data-phc-shelf="gear">{shelfHead("Today's gear", 'One of each')}<div style={GRID}>{v.gear.map((c) => card(c, c.rare))}</div></section>;
  else if (tab === 'upgrade') { // rules 1.46 the grade step; rules 1.50 the Repair shelf (the services the engine registered, by service)
    const svc = (sv: ShopViewV['services'][number]) => <UpgradeCard key={sv.key} s={sv} onFocus={() => sv.id && setFocus({ id: sv.id, rarity: (sv.rarity || 'standard') as Rarity })} />;
    const grades = v.services.filter((sv) => sv.service !== 'repair'), repairs = v.services.filter((sv) => sv.service === 'repair');
    body = <>
      <section data-phc-shelf="repair">{shelfHead('Repair', 'Back to full durability')}{repairs.length ? <div style={GRID}>{repairs.map(svc)}</div>
        : <p data-phc-repair-empty="" style={{ fontSize: 15, color: I.muted, lineHeight: 1.6, maxWidth: 560, marginBottom: 28 }}>Everything you carry is in full repair.</p>}</section>
      <section data-phc-shelf="upgrade">{shelfHead('Upgrade', '1 a visit')}{grades.length ? <div style={GRID}>{grades.map(svc)}</div>
        : <p data-phc-upgrade-empty="" style={{ fontSize: 15, color: I.muted, lineHeight: 1.6, maxWidth: 560 }}>You carry no weapon or focus that can be upgraded.</p>}</section>
    </>;
  }
  else if (tab === 'give') body = <GiveTab />;
  else body = <section data-phc-shelf="sell">{shelfHead('Sell')}<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{v.sell.map((r) => {
    // How many to sell: one by default (rules 1.55), chosen with the one amount control (AmountField.tsx, rules 1.55 item 54) up to
    // the whole stack; the value and the refusal come from the view. A counted item's line (a stim, an Essence) sells by
    // `count` (rules 1.55 item 56).
    const id = r.count ? 'count:' + r.count : String(r.idx), k = 'sell:' + id, n = Math.min(q(k), r.totals.length), val = r.totals[n - 1] ?? r.value, why = r.why && r.totals.length <= 1 ? r.why : (r.whys[n - 1] ?? null);
    const sellIt = () => { setConfirm(null); setQ(k)(1); act({ type: 'run/sell', charId, ...(r.count ? { count: r.count } : { idx: r.idx }), qty: n }); };
    return (
    <div key={id} data-phc-sell={id} onMouseEnter={() => setFocus({ id: r.id, rarity: r.rarity })} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: I.raised, border: '1px solid ' + I.line, opacity: r.why && r.totals.length <= 1 ? 0.6 : 1 }}>
      <img data-zoom={r.label} src={iconOf(r.id)} alt="" width={40} height={40} style={{ objectFit: 'contain', visibility: iconOf(r.id) ? 'visible' : 'hidden' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-body)' }}>{r.label}</span>
      {r.totals.length > 1 ? <AmountField value={n} max={r.totals.length} min={1} onChange={setQ(k)} onEnter={() => { if (!why && !r.ask) sellIt(); }} label={'How many ' + r.label + ' to sell'} /> : null}
      {why ? <span style={{ fontSize: 'var(--fs-sub)', color: I.muted }}>{why}</span> : <>
        <span data-phc-sell-value="" style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(val || 0).toLocaleString('en')} <span style={{ fontSize: 'var(--fs-sub)', color: I.muted }}>CREDITS</span></span>
        {confirm === id && r.ask ? <><span style={{ fontSize: 'var(--fs-sub)' }}>{r.ask}</span><button type="button" data-phc-sell-yes="" onClick={sellIt} style={{ minHeight: 38, padding: '0 14px', borderRadius: 10, border: 0, background: I.text, color: I.ground, fontFamily: 'inherit', fontWeight: 700 }}>Yes, sell</button></>
          : <button type="button" data-phc-sell-btn="" onClick={() => (r.ask ? setConfirm(id) : sellIt())} style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontWeight: 700 }}>Sell</button>}
      </>}
    </div>); })}</div></section>;
  return (
    <FullScreenFrame backdrop={backdrop} portrait={portrait} name={v.face.name} role={v.face.role + ' · ' + v.setting} line={say.text} lineKey={say.key}
      tabs={tabs} tab={tab} onTab={(t) => { setTab(t); setFocus(null); }} purse={v.me?.credits ?? 0} actions={<MoveOn />}
      onClose={v.isHost && v.party.length > 1 ? () => act({ type: 'run/leave', close: true }) : undefined} closeTip="Takes everyone back to the map.">
      <style>{BIG_CSS}</style>
      {body}
      {tab !== 'give' ? <section data-phc-compare-panel="" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 14, background: 'rgba(16,21,31,0.9)', border: '1px solid ' + I.line }}>
        <span style={kick}>COMPARE</span>
        <Compare v={v} focus={focus} />
      </section> : null}
    </FullScreenFrame>
  );
}
