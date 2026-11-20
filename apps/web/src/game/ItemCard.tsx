// THE ITEM CARD (Items 2.0 lane A3; design section 6): the one component every React screen draws an item with (the
// shop's cards and sell rows, the Forge's and the shop's upgrade cards, the rewards, the camp's loadout, the Give rows,
// the places' item options). Its parts: ItemPicture (the picture chain on its grade's frame, never an empty box),
// ItemHead (the name, the grade's word and marks, the family and maker line) and ItemCard (the two, the engine's
// preview lines, and the screen's own footer as children). Every word and number is the engine's (itemCard,
// gearPreview); itemCardView.ts says how it is drawn, the same as the sheet's template screens.
import React from 'react';
import type { ItemCardV, GearPreview } from '@engine';
import { cardPicture, gradeBorder, gradeText, familyText, secondSkillText, carriesText, isPlaceholder, MARK } from './itemCardView';
import { shownLines } from './previewLines';

const INK = { text: '#E7EBF3', muted: '#A3AEC2', white: '#FFFFFF' };

/** The picture on its grade's frame: `size` the box, the picture inside it; `zoom` the words the zoom shows. */
export function ItemPicture({ card, size, zoom, ink, round = 12, name }: { card: ItemCardV; size: number; zoom?: string; ink?: string; round?: number; /** the placeholder's name when the screen names it otherwise */ name?: string }) {
  const src = cardPicture(name ? { ...card, name } : card, { ink, large: size > 32 }), pad = Math.max(2, Math.round(size * 0.06));
  return (
    <span data-phc-item-pic={card.id} data-phc-grade-frame={card.graded ? card.grade : undefined} data-phc-placeholder={isPlaceholder(card) ? '' : undefined} aria-hidden="true"
      style={{ flex: 'none', display: 'grid', placeItems: 'center', width: size, height: size, boxSizing: 'border-box', borderRadius: round, border: gradeBorder(card), background: 'radial-gradient(closest-side, rgba(231,235,243,0.14), rgba(231,235,243,0.02))', overflow: 'hidden' }}>
      <img data-zoom={zoom != null ? (name || card.name) : undefined} data-zoom-text={zoom || undefined} src={src} alt="" width={size - pad * 2} height={size - pad * 2} style={{ display: 'block', objectFit: 'contain' }} />
    </span>
  );
}

/** The name, the grade (word and marks: the frame never says it alone) and the family line. `nameSize` in px. */
export function ItemHead({ card, name, nameSize = 19, align, extra }: { card: ItemCardV; name?: string; nameSize?: number; align?: 'center'; extra?: React.ReactNode }) {
  const grade = gradeText(card), fam = familyText(card), second = secondSkillText(card); // rules 1.93 item 8116: carried modifier lines below
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, alignItems: align === 'center' ? 'center' : undefined, textAlign: align }}>
      <span data-phc-card-name="" style={{ fontFamily: "'Spectral', serif", fontSize: nameSize, fontWeight: 600, lineHeight: 1.15 }}>{name || card.name}</span>
      {grade ? <span data-phc-grade={card.grade} style={{ fontSize: 'var(--fs-sub)', fontWeight: 700, letterSpacing: '0.14em', color: card.marks ? INK.white : INK.muted }}>{grade}</span> : null}
      {fam ? <span data-phc-family="" style={{ fontSize: 'var(--fs-sub)', color: INK.muted }}>{fam}</span> : null}
      {second ? <span data-phc-second-skill="" style={{ fontSize: 'var(--fs-sub)', color: INK.muted }}>{second}</span> : null}
      {carriesText(card).map((t, i) => <span key={i} data-phc-carries={card.carries[i].id} style={{ fontSize: 'var(--fs-sub)', color: INK.text, lineHeight: 1.3 }}>{t}</span>)}
      {extra}
    </div>
  );
}

/** The whole card: picture and head side by side (`stack`: the picture over the head, centred), the engine's preview
 *  lines (the first `maxLines` number lines and the aiming lines: previewLines.ts), then the screen's footer. */
export function ItemCard({ card, name, lines, maxLines = 5, pic = 88, nameSize, stack, headExtra, children, style, ...rest }:
  { card: ItemCardV; name?: string; lines?: GearPreview['lines']; maxLines?: number; pic?: number; nameSize?: number; stack?: boolean; headExtra?: React.ReactNode; children?: React.ReactNode; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'children'>) {
  const ls = lines ? shownLines(lines, maxLines) : [];
  return (
    <article data-phc-item-card={card.id} {...rest}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 16, background: 'linear-gradient(180deg, rgba(28,37,54,0.96), rgba(16,21,31,0.96))', border: '1px solid ' + (card.graded && card.marks ? '#7A879E' : '#232D3F'), position: 'relative', color: INK.text, ...style }}>
      {card.graded && card.marks ? <span aria-hidden="true" style={{ position: 'absolute', top: 10, right: 14, fontSize: 'var(--fs-sub)', letterSpacing: '0.3em', color: INK.white }}>{MARK.repeat(card.marks)}</span> : null}
      <div style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', gap: stack ? 8 : 14, alignItems: stack ? 'center' : 'flex-start' }}>
        <ItemPicture card={card} size={pic} zoom={card.name} name={name} />
        <ItemHead card={card} name={name} nameSize={nameSize} align={stack ? 'center' : undefined} extra={headExtra} />
      </div>
      {ls.length ? (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 'var(--fs-sub)' }}>
          {ls.map((l) => <React.Fragment key={l.key}><dt style={{ color: INK.muted }}>{l.label}</dt><dd data-phc-num={l.key} style={{ margin: 0, textAlign: 'right', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{l.value}</dd></React.Fragment>)}
        </dl>
      ) : null}
      {children}
    </article>
  );
}
