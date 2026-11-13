// The full-screen shop (survival-spec 8.3; rules 1.42): it replaces the play screen when the party stands on a shop.
// Drawn in FullScreenFrame (the Forge's frame too): the keeper, the tabs (Always in stock, Today's gear, Upgrade, Sell,
// and Give as a visible placeholder until build step 4b), large item cards, your purse, hands and pack, and the compare
// panel against what you hold. Everything it shows comes from the engine: `shopView` (prices, quantities, the reasons
// a thing can't be bought, the sell values) and `compareGear` (the gear preview's numbers, both columns); every action is
// a `run/*` sent through the store. Each player browses their own view of the one shared stock.
import React from 'react';
import { act, getState } from './store';
import { shopView, compareGear, type ShopCardV, type ShopViewV, type Rarity } from '@engine';
import { gearIconUri, roundsGearId, magGearId } from './gearIcons';
import { tipProps } from './actionTip';
import { FullScreenFrame, FRAME_INK as I, type FrameTab } from './FullScreenFrame';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
const art = (k: string) => (k ? A[k + '-lg'] || A[k] || '' : '');
/** The attribute inks of the colour system (CLAUDE.md), for a focus card's door word only. */
const ATTR_INK: Record<string, string> = { endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', intelligence: '#8BDEEE', expression: '#5394AC', insight: '#EB95B7', determination: '#9D7ADC', virtue: '#D36A90' };
const MARK = '◆';
/** A card's picture: the painted icon (rounds and magazines by their gear ids), else the line icon. */
function iconOf(id: string): string {
  const r = /^rounds:(.+)$/.exec(id), m = /^mag:(.+)$/.exec(id);
  if (r) return gearIconUri(roundsGearId(r[1]), undefined, { large: true });
  if (m) return gearIconUri(magGearId(m[1]), undefined, { large: true }) || gearIconUri(m[1], undefined, { large: true });
  return gearIconUri(id, undefined, { large: true });
}
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
const shelfHead = (name: string, note?: string) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '6px 0 12px' }}>
    <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>{name}</h2>
    {note ? <span style={{ fontSize: 12, color: I.muted }}>{note}</span> : null}
    <span aria-hidden="true" style={{ flex: 1, height: 1, background: I.line, alignSelf: 'center' }} />
  </div>
);
const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gridAutoFlow: 'row dense', gap: 16, marginBottom: 28 };

function Card({ c, qty, setQty, onFocus, onBuy, big }: { c: ShopCardV; qty: number; setQty: (n: number) => void; onFocus: () => void; onBuy: () => void; big?: boolean }) {
  const why = c.whys[qty - 1] ?? c.why, total = c.totals[qty - 1] ?? c.price, sold = !!c.sold, graded = c.rarity !== 'standard';
  const icon = iconOf(c.id);
  return (
    <article data-phc-card={c.key} data-phc-card-id={c.id} tabIndex={0} onMouseEnter={onFocus} onFocus={onFocus} {...tipProps(c.name + '. ' + c.text)}
      style={{ gridColumn: big ? 'span 2' : undefined, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 236, padding: 18, borderRadius: 16, background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', border: '1px solid ' + (graded ? '#7A879E' : I.line), boxShadow: graded ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none', opacity: sold ? 0.55 : 1, position: 'relative' }}>
      {graded ? <span aria-hidden="true" style={{ position: 'absolute', top: 10, right: 14, fontSize: 12, letterSpacing: '0.3em', color: I.white }}>{MARK.repeat(c.marks)}</span> : null}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: big ? 112 : 88, height: big ? 112 : 88, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))' }}>
          {icon ? <img src={icon} alt="" width={big ? 104 : 80} height={big ? 104 : 80} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 28, color: I.muted }}>+</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span data-phc-card-name="" style={{ fontFamily: "'Spectral', serif", fontSize: big ? 24 : 19, fontWeight: 600, lineHeight: 1.15 }}>{c.name}</span>
          {graded || ['weapon', 'focus', 'armour'].includes(c.preview.kind) || c.rare ? <span data-phc-grade="" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: graded ? I.white : I.muted }}>{c.rarityWord.toUpperCase()}{graded ? ' ' + MARK.repeat(c.marks) : ''}{c.rare ? ' · THE RARER PIECE' : ''}</span> : null}
          <span style={{ fontSize: 12.5, color: I.muted }}>{c.doorWord && c.attr ? <>{c.forLine.split(' · ')[0]} · <span style={{ color: ATTR_INK[c.attr] || I.text }}>{c.doorWord}</span>{c.forLine.includes('your door') ? ' · your door' : ''}</> : c.forLine}</span>
        </div>
      </div>
      {c.preview.lines.length ? (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 13.5 }}>
          {c.preview.lines.slice(0, 5).map((l) => <React.Fragment key={l.key}><dt style={{ color: I.muted }}>{l.label}</dt><dd data-phc-num={l.key} style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{l.value}</dd></React.Fragment>)}
        </dl>
      ) : null}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span data-phc-price="" style={{ fontSize: 26, fontWeight: 700, color: I.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString('en')}</span>
          <span style={{ fontSize: 11, color: I.muted, letterSpacing: '0.08em' }}>CREDITS{c.per > 1 ? ' · ' + c.per * qty + ' ROUNDS' : qty > 1 ? ' · ' + qty + ' OF THEM' : ''}</span>
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
      <span data-phc-status="" style={{ minHeight: 18, fontSize: 13, fontWeight: sold ? 700 : 500, color: sold ? I.white : why ? I.muted : I.ok }}>{sold ? 'Sold to ' + c.sold : why ? why : '✓ You can buy this'}</span>
    </article>
  );
}

function Compare({ v, focus }: { v: ShopViewV; focus: { id: string; rarity: Rarity } | null }) {
  const g = getState().game, c = v.me && g ? g.characters[v.me.id] : null;
  if (!c || !focus || focus.id.startsWith('restock:')) return <p style={{ margin: 0, fontSize: 13, color: I.muted, lineHeight: 1.5 }}>Hover or focus a card to set it against what you hold.</p>;
  const cmp = compareGear(c, { id: focus.id, rarity: focus.rarity });
  if (!cmp.held) return <p data-phc-compare="" style={{ margin: 0, fontSize: 13, color: I.muted, lineHeight: 1.5 }}>{cmp.next.name}: nothing you hold takes its place; it goes in the pack.</p>;
  return (
    <div data-phc-compare="" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: I.muted }}>
        <span>{(cmp.slot || '').toUpperCase()}</span><span>HOLDING</span><span>THIS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <span style={{ color: I.muted }}>Item</span><span>{cmp.held.name}</span><span>{cmp.next.name}</span>
      </div>
      {cmp.rows.map((r) => (
        <div key={r.key} data-phc-cmp={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.25fr', gap: 8, fontSize: 13, alignItems: 'baseline', paddingTop: 6, borderTop: '1px solid ' + I.line }}>
          <span style={{ color: I.muted }}>{r.label.replace(/ \(.*\)$/, '')}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.held}</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.next}{r.diff && r.diff !== 'same' ? <span style={{ marginLeft: 6, fontSize: 11.5, color: r.diff === 'better' ? I.ok : I.muted }}>{r.diff === 'better' ? '▲ better' : '▼ worse'}</span> : r.diff === 'same' ? <span style={{ marginLeft: 6, fontSize: 11.5, color: I.muted }}>= same</span> : null}</span>
        </div>
      ))}
    </div>
  );
}

function You({ v, focus }: { v: ShopViewV; focus: { id: string; rarity: Rarity } | null }) {
  const m = v.me; if (!m) return <p style={{ color: I.muted }}>Bring a character to shop.</p>;
  const pct = Math.min(100, Math.round((m.kg / Math.max(1, m.limit)) * 100)), over = m.kg > m.limit;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {m.portrait ? <img src={m.portrait} alt="" width={56} height={70} style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #3B475D' }} /> : <span style={{ width: 56, height: 70, borderRadius: 10, background: I.raised, display: 'inline-block' }} />}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: "'Spectral', serif", fontSize: 22, fontWeight: 600 }}>{m.name}</span>
          <span style={{ fontSize: 12, color: I.muted }}>Level {m.level} · Armour class {m.armourClass}</span>
        </div>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>HANDS AND WORN</span>
        <span style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>Main · </span>{m.hand}{m.handRarity !== 'standard' ? ' (' + m.handRarity + ')' : ''}</span>
        {m.off ? <span style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>Off · </span>{m.off}</span> : null}
        {m.worn.map((w) => <span key={w.slot} style={{ fontSize: 13.5 }}><span style={{ color: I.muted }}>{w.slot} · </span>{w.name}</span>)}
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 14, background: 'rgba(16,21,31,0.9)', border: '1px solid ' + I.line }}>
        <span style={kick}>COMPARE</span>
        <Compare v={v} focus={focus} />
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={kick}>THE PACK</span>
        <div aria-label={'Carrying ' + m.kg + ' of ' + m.limit + ' kg'} style={{ height: 8, borderRadius: 4, background: I.raised, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: over ? I.hp : I.text }} /></div>
        <span style={{ fontSize: 12, color: over ? I.hp : I.muted }}>{m.kg} of {m.limit} kg{over ? ' · over the limit' : ''}</span>
        {m.pack.map((p, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.35 }}><span style={{ flex: 1, minWidth: 0 }}>{p.label}</span><span style={{ color: I.muted, fontVariantNumeric: 'tabular-nums' }}>{p.kg} kg</span></div>)}
      </section>
    </div>
  );
}

export function ShopScreen() {
  const st = getState(), g = st.game, me = st.me.id;
  const [tab, setTab] = React.useState('always'), [focus, setFocus] = React.useState<{ id: string; rarity: Rarity } | null>(null);
  const [qty, setQtyMap] = React.useState<Record<string, number>>({}), [confirm, setConfirm] = React.useState<number | null>(null);
  const v = g ? shopView(g as any, me) : null;
  if (!g || !v) return <div style={{ padding: 40, color: I.muted }}>No shop is open.</div>;
  const charId = v.me?.id || '';
  const q = (k: string) => qty[k] || 1, setQ = (k: string) => (n: number) => setQtyMap({ ...qty, [k]: n });
  const buy = (c: ShopCardV) => act({ type: 'run/buy', charId, key: c.key, qty: q(c.key) });
  const card = (c: ShopCardV, big = false) => <Card key={c.key} c={c} qty={q(c.key)} setQty={setQ(c.key)} onFocus={() => setFocus({ id: c.id, rarity: c.rarity })} onBuy={() => buy(c)} big={big} />;
  const tabs: FrameTab[] = [
    { id: 'always', label: 'Always in stock' }, { id: 'gear', label: "Today's gear" }, { id: 'upgrade', label: 'Upgrade' }, { id: 'sell', label: 'Sell' },
    { id: 'give', label: 'Give', disabled: true, why: 'Gives between players open with the next build step: credits and pack items, handed over at any safe node.' },
  ];
  const portrait = v.face.portraitPending ? (v.face.fallback ? art('char-' + v.face.fallback) : '') : art(v.face.portrait);
  const backdrop = v.face.backdropPending ? (v.face.backdropFallback ? art('ill-' + v.face.backdropFallback) : '') : art(v.face.backdrop);
  let body: React.ReactNode;
  if (tab === 'always') body = v.shelves.map((s) => <section key={s.shelf} data-phc-shelf={s.shelf}>{shelfHead(s.name, s.shelf === 'guns' ? 'what your squad carries, first' : s.shelf === 'calibres' ? 'never sold out' : undefined)}<div style={GRID}>{s.cards.map((c) => card(c))}</div></section>);
  else if (tab === 'gear') body = <section data-phc-shelf="gear">{shelfHead("Today's gear", 'one of each; the first buyer takes it')}<div style={GRID}>{v.gear.map((c) => card(c, c.rare))}</div></section>;
  else if (tab === 'upgrade') body = <section data-phc-shelf="upgrade">{shelfHead('Upgrade')}{v.services.length ? <div style={GRID}>{v.services.map((s) => (
    <article key={s.key} data-phc-service={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 16, background: I.raised, border: '1px solid ' + I.line }}>
      <span style={{ fontFamily: "'Spectral', serif", fontSize: 19, fontWeight: 600 }}>{s.title}</span>
      {s.lines.map((l, i) => <span key={i} style={{ fontSize: 13 }}>{l.label}: {l.before} → <b>{l.after}</b></span>)}
      {s.note ? <span style={{ fontSize: 12, color: I.muted }}>{s.note}</span> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>{s.price != null ? <span style={{ fontSize: 24, fontWeight: 700 }}>{s.price.toLocaleString('en')} <span style={{ fontSize: 11, color: I.muted }}>CREDITS</span></span> : null}
        <button type="button" disabled={!!s.why} onClick={() => act(s.action as any)} style={{ marginLeft: 'auto', minHeight: 40, padding: '0 18px', borderRadius: 10, border: 0, background: s.why ? I.panel : I.text, color: s.why ? I.muted : I.ground, fontFamily: 'inherit', fontWeight: 700 }}>Take it</button></div>
      {s.why ? <span style={{ fontSize: 13, color: I.muted }}>{s.why}</span> : null}
    </article>))}</div> : <p data-phc-upgrade-empty="" style={{ fontSize: 15, color: I.muted, lineHeight: 1.6, maxWidth: 560 }}>The grade step (a weapon or focus raised one rarity, for credits) opens here with the next build step, and cheaper at a Forge.</p>}</section>;
  else body = <section data-phc-shelf="sell">{shelfHead('Sell', 'a quarter of the price at its own grade')}<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{v.sell.map((r) => (
    <div key={r.idx} data-phc-sell={r.idx} onMouseEnter={() => setFocus({ id: r.id, rarity: r.rarity })} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: I.raised, border: '1px solid ' + I.line, opacity: r.why ? 0.6 : 1 }}>
      <img src={iconOf(r.id)} alt="" width={40} height={40} style={{ objectFit: 'contain', visibility: iconOf(r.id) ? 'visible' : 'hidden' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{r.label}</span>
      {r.why ? <span style={{ fontSize: 12.5, color: I.muted }}>{r.why}</span> : <>
        <span data-phc-sell-value="" style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(r.value || 0).toLocaleString('en')} <span style={{ fontSize: 11, color: I.muted }}>CREDITS</span></span>
        {confirm === r.idx && r.ask ? <><span style={{ fontSize: 12.5 }}>{r.ask}</span><button type="button" data-phc-sell-yes="" onClick={() => { setConfirm(null); act({ type: 'run/sell', charId, idx: r.idx }); }} style={{ minHeight: 38, padding: '0 14px', borderRadius: 10, border: 0, background: I.text, color: I.ground, fontFamily: 'inherit', fontWeight: 700 }}>Yes, sell</button></>
          : <button type="button" data-phc-sell-btn="" onClick={() => (r.ask ? setConfirm(r.idx) : act({ type: 'run/sell', charId, idx: r.idx }))} style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, border: '1px solid #3B475D', background: 'transparent', color: I.text, fontFamily: 'inherit', fontWeight: 700 }}>Sell</button>}
      </>}
    </div>))}</div></section>;
  return (
    <FullScreenFrame backdrop={backdrop} portrait={portrait} name={v.face.name} role={v.face.role + ' · ' + v.setting} line={v.face.line} lineKey={v.face.line + v.log.length}
      tabs={tabs} tab={tab} onTab={setTab} purse={v.me?.credits ?? 0}
      party={v.party.map((p) => ({ id: p.id, name: p.charName, initials: p.initials, color: p.color, ready: p.ready, online: p.online, mine: p.mine }))} ready={v.ready} isHost={v.isHost} waiting={v.party.length > 1 ? v.waiting : []}
      onReady={() => act({ type: 'run/leave' })} onClose={() => act({ type: 'run/leave', close: true })} closeTip="Everyone goes back to the map." readyWord={v.party.length > 1 ? 'Ready to leave' : 'Leave the shop'}
      log={v.log} side={<You v={v} focus={focus} />}>
      {body}
    </FullScreenFrame>
  );
}
