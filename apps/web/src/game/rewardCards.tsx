// The reward cards (rules 1.41, 1.43, 1.54): a character's pick after a won fight (Offer: the Materials card and the
// weapon cards) and a character's choices at a safe node or its pick of kit (Choices). One copy, drawn by the run screen
// (RunScreen.tsx: the others' picks, a safe node's choices) and by the reward panel (RewardPanel.tsx: the viewer's own
// picks, rules 1.64). Every word, number and action is the engine's (runView.ts).
import React from 'react';
import { act } from './store';
import { type OfferV, type ChoiceCharV } from './runView';
import { gearIconUri } from './gearIcons';
import { tipProps, openTipOn } from './actionTip';
import { ICON } from './runIconSizes';

const ink = { ground: '#0A0D13', panel: '#10151F', raised: '#1C2536', line: '#232D3F', text: '#E7EBF3', muted: '#A3AEC2', ok: '#6FEA77', hp: '#F65157', white: '#FFFFFF' };
const kick: React.CSSProperties = { fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.16em', color: ink.muted };
const btn = (on = true): React.CSSProperties => ({ minHeight: 40, padding: '0 16px', borderRadius: 10, border: on ? 0 : '1px solid ' + ink.line, background: on ? ink.text : 'transparent', color: on ? ink.ground : ink.text, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' });
const marks = (n: number) => '◆'.repeat(n);

/** Rules 1.54 item 2: a material's picture (the painted icon once its art lands, ART-REQUESTS E2d), else a lettered
 * tile from its own name (no item is named here). */
function MaterialIcon({ item, name }: { item: string; name: string }) {
  const src = gearIconUri(item, undefined, { large: true });
  return <span aria-hidden="true" style={{ flex: 'none', display: 'grid', placeItems: 'center', width: ICON.material, height: ICON.material, borderRadius: 10, background: ink.panel, border: '1px solid ' + ink.line, overflow: 'hidden', fontSize: 16, fontWeight: 700, color: ink.muted }}>
    {src ? <img data-zoom={name} src={src} alt="" width={ICON.material} height={ICON.material} style={{ objectFit: 'contain' }} /> : (name.replace(/[^A-Za-z]/g, '').slice(0, 2) || '·')}
  </span>;
}
const bigCard = (on: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 14px', minHeight: 300, borderRadius: 14, border: '1px solid ' + (on ? ink.text : ink.line), background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', color: ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' });
const takeBtn: React.CSSProperties = { marginTop: 'auto', alignSelf: 'stretch', minHeight: 40, display: 'grid', placeItems: 'center', borderRadius: 10, background: ink.text, color: ink.ground, fontWeight: 700, fontSize: 15 };

/** `minH`: the cards' least height (the reward panel's are shorter, so the pick fits a 720 px window). */
export function Offer({ o, minH, inPanel }: { o: OfferV; minH?: number; inPanel?: boolean }) {
  const m = o.materials, cols = m ? 1 + o.cards.length : o.cards.length;
  return (
    <div data-phc-offer={o.charId} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      {o.mine && inPanel ? null : <span style={kick}>{o.mine ? 'PICK ONE' : o.name.toUpperCase() + (o.canPick ? ' · YOU MAY PICK FOR THEM' : ' IS PICKING')}</span>}
      {o.canPick ? <>
        <div data-tip-avoid="[data-phc-pick-materials], [data-phc-pick]" style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))', gap: 10 }}>
          {m ? (
            <button type="button" data-phc-pick-materials="" {...tipProps(m.tip)}
              onClick={() => act(m.action as any)} style={{ ...bigCard(false), ...(minH ? { minHeight: minH } : {}) }}>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>Materials</span>
              {m.lines.map((l) => (
                <span key={l.item} data-phc-material={l.item} data-phc-material-n={l.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MaterialIcon item={l.item} name={l.name} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-body)' }}>{l.name}</span>
                  <b style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>× {l.n}</b>
                </span>))}
              <span style={takeBtn}>Take</span>
            </button>) : null}
          {o.cards.map((c) => (
            <button key={c.i} type="button" data-phc-pick={c.i} {...tipProps(c.tip)} onClick={() => act({ type: 'run/pick', charId: o.charId, choice: c.i })}
              style={{ ...bigCard(c.rarity !== 'standard'), alignItems: 'center', textAlign: 'center', minHeight: minH || (m ? 300 : 240) }}>
              {m ? <span style={{ ...kick, alignSelf: 'flex-start' }}>{c.kick}</span> : null}
              <img data-zoom={c.name} data-zoom-text={c.tip || ''} src={gearIconUri(c.id, undefined, { large: true })} alt="" width={ICON.reward} height={ICON.reward} style={{ display: 'block', objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</span>
              <span style={{ fontSize: 'var(--fs-sub)', letterSpacing: '0.1em', color: c.rarity === 'standard' ? ink.muted : ink.white }}>{c.rarityWord.toUpperCase()} {marks(c.marks)}</span>
              <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{c.category}</span>
              {c.lines.map((l) => <span key={l.key} data-phc-pick-line={l.key} style={{ fontSize: 'var(--fs-sub)', color: ink.text }}>{l.label}: <b>{l.value}</b></span>)}
              <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>Worth {c.price} credits</span>
              {m ? <span data-phc-pick-take="" style={takeBtn}>{c.take}</span> : null}
            </button>
          ))}
        </div>
        {o.instead != null && <button type="button" data-phc-instead="" onClick={() => act({ type: 'run/pick', charId: o.charId, choice: 'credits' })} style={btn(false)}>Take {o.instead} credits instead</button>}
      </> : <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>Waiting for {o.name}'s player.</span>}
    </div>
  );
}

/** Rules 1.43: the words over each group of a safe node's choices (the engine names the group; the client its heading). */
const GROUP: Record<string, string> = { grade: 'UPGRADE', relic: 'RELIC UPGRADE', repair: 'REPAIR', forge: 'MODS AND ARMOUR', fit: 'ARMOUR FITTING', train: 'TRAINING', shrine: 'BLESSINGS', trade: 'TRADES', lasting: 'PICK ONE' };
/** One character's choices at a safe node (the Forge, a training ground, a shrine, a crossroads, a rest's training, the
 * grade step at a shop) or its pick of kit: every option is the engine's, with its price and its reason when it can't. */
export function Choices({ x, kit }: { x: ChoiceCharV; kit?: boolean }) {
  const groups = [...new Set(x.options.map((o) => o.group))];
  return (
    <div data-phc-choices={x.charId} data-phc-kit={kit ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 12, background: ink.panel, border: '1px solid ' + ink.line }}>
      <span style={kick}>{(x.mine ? 'YOU · ' : '') + x.name.toUpperCase()} · <span data-phc-purse={x.charId} style={{ color: ink.white }}>{x.credits} CREDITS</span></span>
      {x.relics.length ? <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>Boons: {x.relics.join(', ')}</span> : null}
      {!x.canAct ? <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{x.name}'s player chooses.</span> : groups.map((gname) => (
        <div key={gname} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...kick, fontSize: 'var(--fs-sub)' }}>{GROUP[gname] || gname.toUpperCase()}</span>
          {x.options.filter((o) => o.group === gname).map((o) => (
            <button key={o.key} type="button" data-phc-choice={o.key} data-phc-why={o.why ? '' : undefined} aria-disabled={o.why ? 'true' : undefined}
              {...tipProps(o.detail + (o.why ? ' ' + o.why : ''))}
              onClick={(e) => { if (o.why) openTipOn(e.currentTarget); else act(o.action as any); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '6px 12px', borderRadius: 10, border: '1px solid ' + (o.why ? ink.line : ink.text), background: o.why ? 'transparent' : ink.raised, color: o.why ? ink.muted : ink.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, fontSize: 'var(--fs-sub)', lineHeight: 1.35 }}>{o.label}{o.why ? <span style={{ display: 'block', fontSize: 'var(--fs-sub)', color: ink.muted }}>{o.why}</span> : null}</span>
              {o.price ? <span style={{ fontSize: 'var(--fs-sub)', color: ink.white, whiteSpace: 'nowrap' }}>{o.price} credits</span> : o.pays ? <span style={{ fontSize: 'var(--fs-sub)', color: ink.ok, whiteSpace: 'nowrap' }}>+{o.pays} credits</span> : <span style={{ fontSize: 'var(--fs-sub)', color: ink.muted }}>{o.costs || 'Free'}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

