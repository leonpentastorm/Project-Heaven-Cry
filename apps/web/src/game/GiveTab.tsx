// The Give tab of every full-screen place (survival-spec 8.3 "Give tab", rule 47; rules 1.46): the party as large
// portrait cards (pick who receives), then a line of your own (the purse, a pack line, or what is in a hand or worn:
// "Put in the pack and give"), an amount or a quantity with the amount control (AmountField.tsx, rules 1.55
// rules 1.55 item 54), and one button: "Give 300 credits to Ha".
// What can't be given stays listed, greyed, with the engine's reason. Everything comes from `giveView` (give.ts); the
// action is `gear/give` (or `gear/unequip` first) through the store. Solo: the tab says there is nobody to give to.
import React from 'react';
import { act, getState } from './store';
import { giveView, giveProblem, type GiveRowV, type GiveViewV } from '@engine';
import { AmountField } from './AmountField';
import { registerMount } from '../dc/runtime';
import { gearIconUri } from './gearIcons';
import { FRAME_INK as I } from './FullScreenFrame';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
const kick: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: I.muted };
/** A character's portrait for the receiver cards (its own art, by asset key or URL), or ''. */
const portraitOf = (p: string) => (!p ? '' : /^(data:|https?:|\/)/.test(p) ? p : A[p + '-lg'] || A[p] || A['char-' + p + '-lg'] || A['char-' + p] || '');

/** The Give tab (rules 1.46) for this player's character, inside any full-screen place; `compact`: the same tab in a
 * mode's right panel (rules 1.55 item 40: the path map's Give module, data/modes.json `panels`), small receiver cards,
 * no heading of its own (the panel has one) and the things never given left out. */
export function GiveTab({ compact = false }: { compact?: boolean } = {}) {
  const st = getState(), g = st.game, me = st.me.id;
  const v = g ? giveView(g as any, me) : null;
  const [to, setTo] = React.useState<string | null>(null), [sel, setSel] = React.useState<string>('credits'), [n, setN] = React.useState(1);
  if (!v || !v.from) return <p style={{ color: I.muted }}>You have no character here.</p>;
  if (v.none) return <section data-phc-give="" data-phc-give-none=""><h2 style={{ margin: '6px 0 12px', fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>Give</h2><p style={{ fontSize: 16, color: I.muted, lineHeight: 1.6, maxWidth: 560 }}>{v.none}</p></section>;
  const who = to && v.to.find((t) => t.id === to) ? to : v.to[0].id, target = v.to.find((t) => t.id === who)!;
  const row = v.rows.find((r) => r.key === sel) || v.rows[0];
  const most = Math.max(0, row.qty), amount = Math.max(0, Math.min(n, most));
  // the engine's word on this amount (give.ts giveProblem: the same check the reducer makes), under the field
  const sized = row.kind === 'credits' || ((row.kind === 'pack' || row.kind === 'count') && most > 1);
  const why = row.why[who] || (sized ? giveProblem(g as any, me, { ...(row.action as any), to: who, ...(row.kind === 'credits' ? { credits: amount } : { qty: amount }) }) : null);
  const send = () => {
    if (row.kind === 'held') { act({ type: 'gear/unequip', charId: v.from!.id, slot: row.unequip! }); setSel('credits'); return; }
    act({ ...(row.action as any), to: who, ...(row.kind === 'credits' ? { credits: amount } : row.kind === 'pack' || row.kind === 'count' ? { qty: amount } : {}) });
    setN(1); if (row.kind === 'pack') setSel('credits');
  };
  const word = row.kind === 'credits' ? 'Give ' + amount.toLocaleString('en') + (amount === 1 ? ' credit' : ' credits') + ' to ' + target.name
    : row.kind === 'held' ? 'Put it in the pack' : row.kind === 'never' ? 'Yours to keep' : 'Give ' + (most > 1 ? amount + ' × ' : '') + row.label + ' to ' + target.name;
  const line = (r: GiveRowV) => {
    const w = r.why[who], on = r.key === row.key, icon = r.kind === 'pack' || r.kind === 'count' || r.kind === 'held' ? gearIconUri(r.id, undefined, { large: true }) : '';
    return (
      <button key={r.key} type="button" data-phc-give-row={r.key} data-phc-give-why={w ? '' : undefined} aria-pressed={on} onClick={() => { setSel(r.key); setN(r.kind === 'credits' ? Math.min(100, Math.max(1, r.qty)) : 1); }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: w && r.kind !== 'held' ? I.muted : I.text,
          background: on ? I.raised : 'rgba(16,21,31,0.8)', border: '1px solid ' + (on ? I.white : I.line), opacity: w && r.kind === 'never' ? 0.7 : 1 }}>
        <span style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center' }}>{icon ? <img src={icon} alt="" width={36} height={36} style={{ objectFit: 'contain' }} /> : <span style={{ fontSize: 18, color: I.muted }}>{r.kind === 'credits' ? '¤' : '—'}</span>}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{r.label}{r.kind === 'held' ? <span style={{ fontSize: 11.5, color: I.muted, fontWeight: 700, letterSpacing: '0.1em' }}> · IN HAND OR WORN</span> : null}</span>
          {r.kind === 'never' || (w && r.kind !== 'held') ? <span style={{ fontSize: 12.5, color: I.muted }}>{w}</span> : r.kind === 'held' ? <span style={{ fontSize: 12.5, color: I.muted }}>Put it in your pack first.</span> : null}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: I.white }}>{r.kind === 'credits' ? r.qty.toLocaleString('en') : r.qty > 1 ? '×' + r.qty : ''}</span>
      </button>
    );
  };
  return (
    <section data-phc-give="" data-phc-give-compact={compact ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 18 }}>
      {compact ? null : <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 24 }}>Give</h2>
        <span style={{ fontSize: 13, color: I.muted }}>It arrives at once.</span>
      </div>}
      <div>
        <span style={kick}>TO</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {v.to.map((t) => { const on = t.id === who, src = portraitOf(t.portrait);
            return <button key={t.id} type="button" data-phc-give-to={t.id} aria-pressed={on} onClick={() => setTo(t.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: compact ? 72 : 150, padding: compact ? 6 : 10, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', color: I.text, background: on ? I.raised : 'rgba(16,21,31,0.85)', border: (on ? 2 : 1) + 'px solid ' + (on ? I.white : I.line) }}>
              {src ? <img src={src} alt="" width={compact ? 56 : 120} height={compact ? 70 : 150} style={{ objectFit: 'cover', borderRadius: 10 }} /> : <span style={{ width: compact ? 56 : 120, height: compact ? 70 : 150, borderRadius: 10, background: I.panel, display: 'grid', placeItems: 'center', fontSize: 36, fontFamily: "'Spectral', serif" }}>{t.name.charAt(0)}</span>}
              <span style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</span>
            </button>; })}
        </div>
      </div>
      <div data-phc-give-send="" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 14, background: 'rgba(16,21,31,0.97)', border: '1px solid #3B475D' }}>
        {sized && !row.why[who] ? (
          <AmountField value={amount} max={most} onChange={setN} onEnter={() => { if (!why) send(); }} compact={compact} why={why}
            label={row.kind === 'credits' ? 'Credits to give' : 'How many ' + row.label + ' to give'} />
        ) : null}
        <button type="button" data-phc-give-go="" disabled={!!why || row.kind === 'never'} onClick={send}
          style={{ minHeight: 46, padding: '0 20px', borderRadius: 12, border: 0, background: why || row.kind === 'never' ? I.raised : I.text, color: why || row.kind === 'never' ? I.muted : I.ground, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, cursor: why ? 'default' : 'pointer' }}>{word}</button>
        {why && !(sized && !row.why[who]) ? <span data-phc-give-reason="" style={{ fontSize: 13, color: I.muted }}>{why}</span> : null}
        {row.use ? [target.id, v.from!.id].map((id) => { const u = row.use!, no = u.why[id], name = id === v.from!.id ? 'yourself' : target.name; // rules 1.55 item 32: use it on the friend picked, or on yourself
          return <button key={'use-' + id} type="button" data-phc-give-use={id} disabled={!!no} aria-label={no ? u.label + ' ' + name + ': ' + no : undefined} onClick={() => act({ ...(u.action as any), targetId: id })}
            style={{ minHeight: 46, padding: '0 18px', borderRadius: 12, border: '1px solid ' + I.line, background: no ? 'transparent' : I.raised, color: no ? I.muted : I.text, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: no ? 'default' : 'pointer' }}>{u.label + ' ' + name}</button>; }) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={kick}>WHAT</span>
        {v.rows.filter((r) => r.kind !== 'never').map(line)}
      </div>
      {compact ? null : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={kick}>YOURS TO KEEP</span>
        {v.rows.filter((r) => r.kind === 'never').map(line)}
      </div>}
    </section>
  );
}

/** The backpack line's Give (rules 1.55 items 30 to 32 and 54): the same amount control for a stack, a "Give N to"
 * button for each friend the engine allows, and the line's "Use on…" (gear/use), all from the Give view (give.ts). A
 * template hosts it by name (`<sc-mount is="give-inline">`, main.template.html's backpack rows). */
export function GiveInline({ rowKey, charId }: { rowKey: string; charId: string }) {
  const st = getState(), g = st.game, me = st.me.id;
  const [n, setN] = React.useState(1);
  const v: GiveViewV | null = g ? giveView(g as any, me, charId) : null, row = v?.rows.find((r) => r.key === rowKey);
  if (!v || !v.from || !row) return null;
  const open = v.to.filter((t) => !row.why[t.id]), most = Math.max(0, row.qty), amount = Math.max(0, Math.min(n, most));
  const uses = row.use ? Object.values((g as any).characters as Record<string, { id: string; name: string; dead?: boolean }>).filter((x) => !x.dead && !row.use!.why[x.id]) : [];
  if (!open.length && !uses.length) return null;
  const why = open.length && most > 1 ? giveProblem(g as any, me, { ...(row.action as any), to: open[0].id, qty: amount }) : null;
  const give = (to: string) => { act({ ...(row.action as any), to, qty: amount }); setN(1); };
  const b: React.CSSProperties = { minHeight: 30, padding: '0 10px', borderRadius: 6, border: '1px solid ' + I.text, background: I.panel, color: I.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
  return (
    <div data-phc-give-inline={rowKey} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {open.length && most > 1 ? <AmountField value={amount} max={most} min={1} onChange={setN} onEnter={() => { if (!why && open.length === 1) give(open[0].id); }} compact why={why} label={'How many ' + row.label + ' to give'} /> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {open.map((t) => <button key={'g' + t.id} type="button" data-phc-give-inline-to={t.id} disabled={!!why} onClick={() => give(t.id)} style={b}>{'Give ' + (most > 1 ? amount + ' ' : '') + 'to ' + t.name}</button>)}
        {uses.map((x) => <button key={'u' + x.id} type="button" data-phc-give-use={x.id} onClick={() => act({ ...(row.use!.action as any), targetId: x.id })} style={b}>{row.use!.label + ' ' + (x.id === v.from!.id ? 'yourself' : x.name)}</button>)}
      </div>
    </div>
  );
}
registerMount('give-inline', GiveInline);
