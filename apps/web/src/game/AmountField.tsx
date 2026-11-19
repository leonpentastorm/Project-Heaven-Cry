// THE AMOUNT CONTROL (rules 1.55 item 54; Leon, 15 Nov 2026: "Give menu need +10, +100, max and editable number,
// giving credit is nightmare"). One control wherever an amount is chosen to give or to sell: the places' Give tab, the
// path map's Give module, the backpack line's Give (credits and quantities alike) and the shop's Sell quantity. A number
// you type (kept between `min` and what you hold; anything not a number is ignored; Enter confirms), the steps −100 to
// +100 and MAX (one that can't apply is greyed), and the total held. Keys: arrows ±1 (Shift ±10), Page Up and Down
// ±100, Home and End. In a narrow panel (`compact`) it wraps to two rows. The arithmetic is amount.ts; the engine
// judges what is sent, and its refusal (`why`) shows under the field.
import React from 'react';
import { STEPS, clampAmount, parseAmount, stepOk, stepTo, stepLabel, ofHeld, keyStep } from './amount';
import { FRAME_INK as I } from './FullScreenFrame';

export interface AmountFieldProps {
  value: number; max: number; min?: number; onChange: (n: number) => void;
  /** Enter in the field (the give or the sale). */ onEnter?: () => void;
  /** What is chosen, for assistive tech: "Credits to give". */ label: string;
  /** The engine's refusal of this amount, shown under the field (null: none). */ why?: string | null;
  /** The narrow right panel: the steps wrap onto a second row. */ compact?: boolean;
}

const btn = (off: boolean): React.CSSProperties => ({ minWidth: 40, height: 34, padding: '0 6px', borderRadius: 8, border: '1px solid ' + (off ? I.line : '#3B475D'), background: off ? 'transparent' : I.raised,
  color: off ? '#5B6577' : I.text, fontFamily: 'inherit', fontSize: 'var(--fs-sub)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', cursor: off ? 'default' : 'pointer' });

export function AmountField({ value, max, min = 0, onChange, onEnter, label, why = null, compact = false }: AmountFieldProps) {
  const v = clampAmount(value, max, min), [draft, setDraft] = React.useState<string | null>(null);
  const set = (n: number) => { setDraft(null); onChange(clampAmount(n, max, min)); };
  const typed = (text: string) => { const p = parseAmount(text, max, min); if (p === null) return; if (p === '') { setDraft(''); onChange(min); return; } setDraft(String(p)); onChange(p); };
  const key = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); setDraft(null); onEnter?.(); return; }
    const n = keyStep(e.key, e.shiftKey, v, max, min); if (n == null) return; e.preventDefault(); set(n);
  };
  const steps = STEPS.map((k) => { const off = !stepOk(v, k, max, min);
    return <button key={k} type="button" data-phc-amount-step={k} disabled={off} aria-label={(k > 0 ? 'Add ' : 'Take away ') + Math.abs(k)} onClick={() => set(stepTo(v, k, max, min))} style={btn(off)}>{stepLabel(k)}</button>; });
  const atMax = v >= Math.floor(max);
  return (
    <div data-phc-amount="" data-phc-amount-compact={compact ? '' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div role="group" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: compact ? '1 1 100%' : '0 0 auto' }}>
          <input type="text" inputMode="numeric" data-phc-amount-input="" aria-label={label} value={draft ?? String(v)} onChange={(e) => typed(e.target.value)} onKeyDown={key} onBlur={() => setDraft(null)}
            onFocus={(e) => e.target.select()} style={{ width: compact ? 96 : 110, height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #3B475D', background: I.ground, color: I.white, fontFamily: 'inherit', fontSize: 17, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
          <span data-phc-amount-held="" style={{ fontSize: 'var(--fs-sub)', color: I.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{ofHeld(max)}</span>
        </span>
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: compact ? '1 1 100%' : '0 1 auto' }}>
          {steps}
          <button type="button" data-phc-amount-max="" disabled={atMax} aria-label={'All ' + Math.floor(max).toLocaleString('en')} onClick={() => set(max)} style={btn(atMax)}>MAX</button>
        </span>
      </div>
      {why ? <span data-phc-amount-why="" role="status" style={{ fontSize: 'var(--fs-sub)', color: I.muted }}>{why}</span> : null}
    </div>
  );
}
