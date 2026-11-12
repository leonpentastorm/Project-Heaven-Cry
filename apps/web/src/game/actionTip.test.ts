// @vitest-environment jsdom
// The action hover card (Leon, live 0.23.0): one helper lays out every action's hover text as lines.
import { describe, expect, it } from 'vitest';
import { techParts } from '@engine';
import { actionTip, sentences, tipText, tipElement, mountActionTips, tipAttrs } from './actionTip';

// The tooltip Leon quoted, as the engine wrote it then (one prose string).
const HEAVY_BOLT = 'One bolt at +40% damage that ignores 10 armour. On a hit the target saves (Body) or is pushed 1 tile. With this weapon: costs 1 AP less. (Quick: Handy. Firing next to an enemy doesn\'t provoke; moving costs no accuracy.)';

describe('actionTip: the name and cost, a line per sentence, the weapon line, the traits, the refusal', () => {
  it('splits prose once, on sentence ends, and keeps the parenthesised trait note as its own labelled line', () => {
    const t = actionTip({ name: 'Heavy Bolt', cost: '3 AP · 1 round', text: HEAVY_BOLT });
    expect(t.name).toBe('Heavy Bolt'); expect(t.chips).toEqual(['3 AP', '1 round']);
    expect(t.lines.map((l) => [l.kind, l.label, l.text])).toEqual([
      ['text', '', 'One bolt at +40% damage that ignores 10 armour.'],
      ['text', '', 'On a hit the target saves (Body) or is pushed 1 tile.'],
      ['weapon', 'With this weapon', 'Costs 1 AP less.'],
      ['trait', 'Quick', 'Handy. Firing next to an enemy doesn\'t provoke; moving costs no accuracy.'],
    ]);
    expect(tipText(t)).toBe('Heavy Bolt · 3 AP · 1 round\nOne bolt at +40% damage that ignores 10 armour.\nOn a hit the target saves (Body) or is pushed 1 tile.\nWith this weapon: Costs 1 AP less.\nQuick: Handy. Firing next to an enemy doesn\'t provoke; moving costs no accuracy.');
  });

  it('the same card from the engine\'s parts (techParts), with the refusal on its own last line', () => {
    const p = techParts({ id: 'heavy_bolt', text: 'One bolt that ignores armour. On a hit it pushes.', line: 'costs 1 AP less.' });
    const t = actionTip({ name: 'Heavy Bolt', cost: ['3 AP', '1 round'], needs: p.needs, text: p.text, line: p.line, traits: p.traits, why: 'Needs 3 AP.' });
    expect(t.lines.map((l) => l.kind)).toEqual(['text', 'text', 'weapon', 'trait', 'why']);
    expect(t.lines.find((l) => l.kind === 'trait')).toMatchObject({ label: 'Quick' });
    expect(t.lines.at(-1)).toMatchObject({ kind: 'why', label: 'Can\'t now', text: 'Needs 3 AP.' });
  });

  it('a stop inside brackets or a number does not split; a missing stop is added', () => {
    expect(sentences('Saves (Body. Or not) at TN 12. Then +2 to hit.')).toEqual(['Saves (Body. Or not) at TN 12.', 'Then +2 to hit.']);
    expect(actionTip({ name: 'Brace', text: 'Set yourself' }).lines[0].text).toBe('Set yourself.');
    expect(sentences('Costs 1.5 AP a tile. Moving ends it.')).toEqual(['Costs 1.5 AP a tile.', 'Moving ends it.']);
  });

  it('the floating card: one element per line, the name and chips first; shown on hover of a [data-tip] element', async () => {
    const t = actionTip({ name: 'Heavy Bolt', cost: '3 AP · 1 round', text: HEAVY_BOLT, why: 'Needs 3 AP.' });
    const box = tipElement(document, t);
    expect(box.querySelector('.phc-atip-n')!.textContent).toBe('Heavy Bolt');
    expect([...box.querySelectorAll('.phc-atip-c')].map((c) => c.textContent)).toEqual(['3 AP', '1 round']);
    expect([...box.querySelectorAll('.phc-atip-l')].map((l) => l.textContent)).toEqual(['One bolt at +40% damage that ignores 10 armour.', 'On a hit the target saves (Body) or is pushed 1 tile.', 'With this weapon: Costs 1 AP less.', 'Quick: Handy. Firing next to an enemy doesn\'t provoke; moving costs no accuracy.', 'Can\'t now: Needs 3 AP.']);
    mountActionTips(document);
    const b = document.createElement('button'); const at = tipAttrs({ name: 'Reload (speed)', cost: '2 AP · the magazine drops', text: 'Swap in your fullest spare magazine. The one in the gun drops onto your tile.' });
    b.setAttribute('data-tip', at.tip); b.textContent = 'Reload'; document.body.appendChild(b);
    b.dispatchEvent(new Event('pointerover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const shown = document.querySelector('.phc-atip');
    expect(shown).toBeTruthy(); expect(shown!.querySelectorAll('.phc-atip-l').length).toBe(2);
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.querySelector('.phc-atip')).toBeNull();
  });
});
