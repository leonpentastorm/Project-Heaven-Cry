// @vitest-environment jsdom
// The amount control (rules 1.55, 0.28.3-B.1; Leon: "Give menu need +10, +100, max and editable number"): its arithmetic
// (amount.ts) and the one control (AmountField.tsx): a typed number kept inside what is held, non-numbers ignored, the
// steps −100 to +100 and MAX greyed when they can't apply, the total held, Enter confirms, the keys, the engine's words.
import { describe, expect, it } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { clampAmount, parseAmount, stepOk, stepTo, stepLabel, ofHeld, keyStep, STEPS } from './amount';
import { AmountField } from './AmountField';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('amount.ts', () => {
  it('a typed text: digits (with grouping) clamp into 0..held; emptied is ""; anything else is ignored (null)', () => {
    expect(parseAmount('250', 1240)).toBe(250); expect(parseAmount('1,000', 1240)).toBe(1000); expect(parseAmount('99999', 1240)).toBe(1240);
    expect(parseAmount('', 1240)).toBe(''); expect(parseAmount('+5', 10)).toBe(5);
    for (const t of ['-5', '2.5', 'abc', '1e21', 'NaN', '5x']) expect(parseAmount(t, 1240)).toBeNull();
    expect(parseAmount('0', 10, 1)).toBe(1);
  });
  it('clamps, steps that apply in full, labels, the held total, the keys', () => {
    expect(clampAmount(NaN, 50)).toBe(0); expect(clampAmount(Infinity, 50)).toBe(50); expect(clampAmount(-3, 50)).toBe(0); expect(clampAmount(7.9, 50)).toBe(7);
    expect(STEPS.map((k) => stepOk(50, k, 100))).toEqual([false, true, true, true, true, false]);
    expect(stepTo(95, 10, 100)).toBe(100); expect(stepLabel(-100)).toBe('−100'); expect(stepLabel(10)).toBe('+10'); expect(ofHeld(1240)).toBe('of 1,240');
    expect(keyStep('ArrowUp', false, 5, 100)).toBe(6); expect(keyStep('ArrowUp', true, 5, 100)).toBe(15); expect(keyStep('PageDown', false, 5, 100)).toBe(0);
    expect(keyStep('End', false, 5, 100)).toBe(100); expect(keyStep('Home', false, 5, 100, 1)).toBe(1); expect(keyStep('a', false, 5, 100)).toBeNull();
  });
});

function draw(props: Record<string, unknown>) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el), seen: number[] = [], entered: number[] = [];
  const render = (value: number) => act(() => root.render(createElement(AmountField, { max: 1240, label: 'Credits to give', ...props, value, onChange: (n: number) => { seen.push(n); render(n); }, onEnter: () => entered.push(1) } as any)));
  render(Number(props.value ?? 0));
  return { el, seen, entered };
}
const type = (input: HTMLInputElement, text: string) => act(() => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('AmountField', () => {
  it('shows the held total, greys what cannot apply, steps and MAX set the amount', () => {
    const { el, seen } = draw({ value: 0 });
    expect(el.querySelector('[data-phc-amount-held]')!.textContent).toBe('of 1,240');
    const step = (k: number) => el.querySelector<HTMLButtonElement>('[data-phc-amount-step="' + k + '"]')!;
    expect(step(-1).disabled).toBe(true); expect(step(100).disabled).toBe(false);
    act(() => step(100).click()); act(() => step(10).click());
    expect(seen).toEqual([100, 110]);
    act(() => el.querySelector<HTMLButtonElement>('[data-phc-amount-max]')!.click()); expect(seen.at(-1)).toBe(1240);
    expect(el.querySelector<HTMLButtonElement>('[data-phc-amount-max]')!.disabled).toBe(true); expect(step(1).disabled).toBe(true);
  });
  it('a typed number is kept inside what is held; words are ignored; Enter confirms; the engine\'s refusal shows', () => {
    const { el, seen, entered } = draw({ value: 5, why: 'Give 1 credit or more.' });
    const input = el.querySelector<HTMLInputElement>('[data-phc-amount-input]')!;
    type(input, '300'); expect(seen.at(-1)).toBe(300);
    type(input, '5000'); expect(seen.at(-1)).toBe(1240);
    const n = seen.length; type(input, 'lots'); expect(seen.length).toBe(n);
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(entered.length).toBe(1);
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true })); }); expect(seen.at(-1)).toBe(1230);
    expect(el.querySelector('[data-phc-amount-why]')!.textContent).toBe('Give 1 credit or more.');
    for (const b of el.querySelectorAll('button, input, span')) { const fs = parseFloat((b as HTMLElement).style.fontSize || '13'); expect(fs).toBeGreaterThanOrEqual(13); }
  });
});
