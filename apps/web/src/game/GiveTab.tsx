// The Give tab of every full-screen place (survival-spec 8.3 "Give tab", rule 47; rules 1.46): the party as large
// portrait cards (pick who receives), then a line of your own (the purse, a pack line, or what is in a hand or worn:
// "Put in the pack and give"), an amount or a quantity with the stepper, and one button: "Give 300 credits to Ha".
// What can't be given stays listed, greyed, with the engine's reason. Everything comes from `giveView` (give.ts); the
// action is `gear/give` (or `gear/unequip` first) through the store. Solo: the tab says there is nobody to give to.
import React from 'react';
import { act, getState } from './store';
import { giveView, type GiveRowV } from '@engine';
import { gearIconUri } from './gearIcons';
import { FRAME_INK as I } from './FullScreenFrame';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
/** A character's portrait for the receiver cards (its own art, by asset key or URL), or ''. */
const portraitOf = (p: string) => (!p ? '' : /^(data:|https?:|\/)/.test(p) ? p : A[p + '-lg'] || A[p] || A['char-' + p + '-lg'] || A['char-' + p] || '');

/** The Give tab (rules 1.46) for this player's character, inside any full-screen place. */
export function GiveTab() {
  const st = getState(), g = st.game, me = st.me.id;
  const v = g ? giveView(g as any, me) : null;
  const [to, setTo] = React.useState<string | null>(null), [sel, setSel] = React.useState<string>('credits'), [n, setN] = React.useState(1);
  if (!v || !v.from) return <p style={{ color: I.muted }}>Bring a character to give.</p>;
  if (v.none) return <section data-phc-give="" data-phc-give-none=""><h2 style={{ margin: '6px 0 12px', fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>Give</h2><p style={{ fontSize: 16, color: I.muted, lineHeight: 1.6, maxWidth: 560 }}>{v.none} Gives are for a squad: credits and pack items handed to a friend at any safe node.</p></section>;
  const who = to && v.to.find((t) => t.id === to) ? to : v.to[0].id, target = v.to.find((t) => t.id === who)!;
  const row = v.rows.find((r) => r.key === sel) || v.rows[0];
  const most = row.kind === 'credits' ? Math.max(1, row.qty) : Math.max(1, row.qty), amount = Math.min(n, most);
  const why = row.why[who];
  const send = () => {
    if (row.kind === 'held') { act({ type: 'gear/unequip', charId: v.from!.id, slot: row.unequip! }); setSel('credits'); return; }
    act({ ...(row.action as any), to: who, ...(row.kind === 'credits' ? { credits: amount } : row.kind === 'pack' ? { qty: amount } : {}) });
    setN(1); if (row.kind === 'pack') setSel('credits');
  };
  const word = row.kind === 'credits' ? 'Give ' + amount.toLocaleString('en') + ' credits to ' + target.name
    : row.kind === 'held' ? 'Put it in the pack' : row.kind === 'never' ? 'Not given' : 'Give ' + (most > 1 ? amount + ' × ' : '') + row.label + ' to ' + target.name;
  const line = (r: GiveRowV) => {
    const w = r.why[who], on = r.key === row.key, icon = r.kind === 'pack' || r.kind === 'held' ? gearIconUri(r.id, undefined, { large: true }) : '';
    return (
      <button key={r.key} type="button" data-phc-give-row={r.key} data-phc-give-why={w ? '' : undefined} aria-pressed={on} onClick={() => { setSel(r.key); setN(r.kind === 'credits' ? Math.min(100, Math.max(1, r.qty)) : 1); }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: w && r.kind !== 'held' ? I.muted : I.text,
          background: on ? I.raised : 'rgba(16,21,31,0.8)', border: '1px solid ' + (on ? I.white : I.line), opacity: w && r.kind === 'never' ? 0.7 : 1 }}>
        <span style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center' }}>{icon ? <img src={icon} alt="" width={36} height={36} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 18, color: I.muted }}>{r.kind === 'credits' ? '¤' : '—'}</span>}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{r.label}{r.kind === 'held' ? <span style={{ fontSize: 11.5, color: I.muted, fontWeight: 700, letterSpacing: '0.1em' }}> · IN HAND OR WORN</span> : null}</span>
          {r.kind === 'never' || (w && r.kind !== 'held') ? <span style={{ fontSize: 12.5, color: I.muted }}>{w}</span> : r.kind === 'held' ? <span style={{ fontSize: 12.5, color: I.muted }}>Put in the pack and give.</span> : null}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: I.white }}>{r.kind === 'credits' ? r.qty.toLocaleString('en') : r.qty > 1 ? '×' + r.qty : ''}</span>
      </button>
    );
  };
  return (
    <section data-phc-give="" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>Give</h2>
        <span style={{ fontSize: 12.5, color: I.muted }}>a plain give: it arrives at once, nobody is asked</span>
      </div>
      <div>
        <span style={kick}>TO</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {v.to.map((t) => { const on = t.id === who, src = portraitOf(t.portrait);
            return <button key={t.id} type="button" data-phc-give-to={t.id} aria-pressed={on} onClick={() => setTo(t.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 150, padding: 10, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', color: I.text, background: on ? I.raised : 'rgba(16,21,31,0.85)', border: (on ? 2 : 1) + 'px solid ' + (on ? I.white : I.line) }}>
              {src ? <img src={src} alt="" width={120} height={150} style={{ objectFit: 'cover', borderRadius: 10 }} /> : <span style={{ width: 120, height: 150, borderRadius: 10, background: I.panel, display: 'grid', placeItems: 'center', fontSize: 36, fontFamily: "'Spectral', serif" }}>{t.name.charAt(0)}</span>}
              <span style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</span>
            </button>; })}
        </div>
      </div>
      <div data-phc-give-send="" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 14, background: 'rgba(16,21,31,0.97)', border: '1px solid #3B475D' }}>
        {(row.kind === 'credits' || (row.kind === 'pack' && most > 1)) && !why ? (
          <div role="group" aria-label="How many" style={{ display: 'flex', alignItems: 'center', border: '1px solid #3B475D', borderRadius: 10 }}>
            <button type="button" aria-label="Fewer" onClick={() => setN(Math.max(1, amount - (row.kind === 'credits' && amount > 10 ? 10 : 1)))} style={{ width: 34, height: 42, border: 0, background: 'transparent', color: I.text, fontSize: 20, cursor: 'pointer' }}>‹</button>
            <span data-phc-give-n="" style={{ minWidth: 56, textAlign: 'center', fontWeight: 700, fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>{amount}</span>
            <button type="button" aria-label="More" onClick={() => setN(Math.min(most, amount + (row.kind === 'credits' && amount >= 10 ? 10 : 1)))} style={{ width: 34, height: 42, border: 0, background: 'transparent', color: I.text, fontSize: 20, cursor: 'pointer' }}>›</button>
          </div>
        ) : null}
        <button type="button" data-phc-give-go="" disabled={!!why || row.kind === 'never'} onClick={send}
          style={{ minHeight: 46, padding: '0 20px', borderRadius: 12, border: 0, background: why || row.kind === 'never' ? I.raised : I.text, color: why || row.kind === 'never' ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, cursor: why ? 'default' : 'pointer' }}>{word}</button>
        {why ? <span data-phc-give-reason="" style={{ fontSize: 13, color: I.muted }}>{why}</span> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={kick}>WHAT</span>
        {v.rows.filter((r) => r.kind !== 'never').map(line)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={kick}>NEVER GIVEN</span>
        {v.rows.filter((r) => r.kind === 'never').map(line)}
      </div>
    </section>
  );
}
