// @vitest-environment jsdom
// The action hover card (Leon, live 0.23.0): one helper lays out every action's hover text as lines.
import { describe, expect, it } from 'vitest';
import { techParts } from '@engine';
import { actionTip, sentences, tipText, tipElement, mountActionTips, tipAttrs, proseTip, placeTip } from './actionTip';

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

describe('the one hover card everywhere (Leon, live 0.24.0)', () => {
  it('proseTip: a line a sentence, " · " parts apart, "Label: text" and a parenthesised note labelled', () => {
    const t = proseTip('Next turn it swells: +1 stage (×1) and +1 Strain. Raw: Soul damage, armour ignored; no rider.');
    expect(t.name).toBe('');
    expect(t.lines.map((l) => [l.label, l.text])).toEqual([['Next turn it swells', '+1 stage (×1) and +1 Strain.'], ['Raw', 'Soul damage, armour ignored; no rider.']]);
    expect(proseTip('Pressure 3 / 5 · Steady').lines.map((l) => l.text)).toEqual(['Pressure 3 / 5', 'Steady']);
    expect(proseTip('Hide the tools (the tab on the right brings them back)').lines.map((l) => l.text)).toEqual(['Hide the tools (the tab on the right brings them back)']);
    expect(tipText(proseTip('One. Two.'))).toBe('One.\nTwo.');
  });
  it('placeTip with rects to avoid (rules 1.46, the path map): beside the node, flipped near an edge, never over a reachable node', () => {
    const b = { width: 300, height: 120 }, over = (p: { x: number; y: number }, q: { left: number; top: number; right: number; bottom: number }) => p.x < q.right && p.x + b.width > q.left && p.y < q.bottom && p.y + b.height > q.top;
    const node = { left: 100, top: 300, right: 150, bottom: 350 }, next = { left: 220, top: 260, right: 270, bottom: 310 }, next2 = { left: 220, top: 380, right: 270, bottom: 430 };
    const p = placeTip(node, b, 1280, 720, 6, [next, next2]);
    expect(over(p, node) || over(p, next) || over(p, next2)).toBe(false);
    const far = { left: 1200, top: 300, right: 1250, bottom: 350 }, q = placeTip(far, b, 1280, 720, 6, [{ left: 1100, top: 300, right: 1150, bottom: 350 }]);
    expect(q.x + b.width).toBeLessThanOrEqual(1200); // flipped to the left near the right edge
    expect(over(q, { left: 1100, top: 300, right: 1150, bottom: 350 })).toBe(false);
  });
  it('placeTip: beside the element, inside the window, never over the element', () => {
    const r = { left: 900, top: 100, right: 1000, bottom: 130 };
    expect(placeTip(r, { width: 300, height: 80 }, 1024, 768)).toEqual({ x: 594, y: 100 }); // left of it
    const l = { left: 10, top: 100, right: 110, bottom: 130 };
    expect(placeTip(l, { width: 300, height: 80 }, 1024, 768)).toEqual({ x: 116, y: 100 }); // no room left: right
    const wide = { left: 0, top: 700, right: 1024, bottom: 740 };
    const p = placeTip(wide, { width: 300, height: 80 }, 1024, 768);
    expect(p.y + 80).toBeLessThanOrEqual(700); // above a full-width row at the bottom
  });
  it('one card at a time: a second element replaces the first; a removed element takes its card with it', async () => {
    mountActionTips(document);
    const mk = (text: string) => { const b = document.createElement('button'); b.setAttribute('data-tip-text', text); b.textContent = text; document.body.appendChild(b); return b; };
    const a = mk('First one.'), b = mk('Second one.');
    a.dispatchEvent(new Event('pointerover', { bubbles: true })); await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelectorAll('.phc-atip').length).toBe(1);
    b.dispatchEvent(new Event('pointerover', { bubbles: true })); await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelectorAll('.phc-atip').length).toBe(1);
    expect(document.querySelector('.phc-atip')!.textContent).toBe('Second one.');
    b.remove(); await new Promise((r) => setTimeout(r, 300));
    expect(document.querySelectorAll('.phc-atip').length).toBe(0);
    a.remove();
  });
  it('a template\'s tip="…" becomes the card and words for assistive tech; an icon-only control is named by it', async () => {
    const { parseTemplate, renderTemplate } = await import('../dc/runtime');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const html = renderToStaticMarkup(renderTemplate(parseTemplate('<button tip="{{t}}">Go</button><button tip="Close the panel"><svg></svg></button>'), { t: 'Go now.' }) as any);
    expect(html).toContain('data-tip-text="Go now." aria-description="Go now."');
    expect(html).toContain('data-tip-text="Close the panel" aria-label="Close the panel"');
    expect(html).not.toContain('title=');
  });
});
