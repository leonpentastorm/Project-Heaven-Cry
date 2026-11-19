// The camp's screen drawn (rules 1.55 item 49): the checklist in the header, the steps in order, FREE where a price would
// be on the free picks (green, with the word), prices on step 3, the recommended kit first. Rendered to markup with the
// store mocked to a real camp made by the reducer.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { apply, type GameState } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
let G: GameState, ME = 'host';
vi.mock('./store', () => ({ getState: () => ({ game: G, me: { id: ME } }), act: () => {}, subscribe: () => () => {}, toast: () => {} }));
const { LoadoutScreen } = await import('./LoadoutScreen');
const { renderToStaticMarkup } = await import('react-dom/server');
const draw = () => renderToStaticMarkup(React.createElement(LoadoutScreen));
const count = (html: string, re: RegExp) => (html.match(re) || []).length;

describe('the camp\'s screen (rules 1.55 item 49)', () => {
  G = apply(survivalRoom('PHC-0001', DUO as any, { test: true }), { type: 'run/start', seed: 'PHC-0001' }, 'host');
  it('a gunner: the checklist (weapon NOT PICKED, budget, boon; no focus), the help line, step 1 free cards, step 3 priced', () => {
    ME = 'host'; const h = draw();
    expect(h).toContain('data-phc-camp-check="weapon"'); expect(h).toContain('data-phc-camp-check="budget"'); expect(h).not.toContain('data-phc-camp-check="focus"');
    expect(h).toContain('○ NOT PICKED');
    expect(h).not.toContain('Before the run');
    expect(h).toContain('Not sure? Take the recommended kit');
    expect(h.indexOf('Step 1 · Your free weapon')).toBeGreaterThan(h.indexOf('Not sure?'));
    expect(h.indexOf('Step 2 · Spend your budget')).toBeGreaterThan(h.indexOf('Step 1 · Your free weapon'));
    expect(h).not.toContain('data-phc-camp-row="focus"');
    // every free card: FREE where a price would be, no price, its button Take (free)
    const free = count(h, /data-phc-camp-free="/g);
    expect(free).toBeGreaterThan(0);
    expect(count(h, /data-phc-camp-freetag=""[^>]*>FREE</g)).toBe(free);
    expect(count(h, /data-phc-camp-take-free="Take \(free\)"/g)).toBe(free);
    const step1 = h.slice(h.indexOf('data-phc-camp-row="weapon"'), h.indexOf('data-phc-camp-row="budget"'));
    expect(step1).not.toContain('data-phc-camp-price'); // no price among the free picks
    expect(h.slice(h.indexOf('data-phc-camp-row="budget"'))).toContain('data-phc-camp-price');
  });
  it('a caster: the focus step and its chip; after Recommended every chip is ticked with the name', () => {
    ME = 'p2'; let h = draw();
    expect(h).toContain('data-phc-camp-check="focus"'); expect(h).toContain('Step 2 · Your free focus'); expect(h).toContain('Step 3 · Spend your budget');
    G = apply(G, { type: 'run/loadout', charId: 'c2', op: 'recommended' } as any, 'p2'); h = draw();
    expect(h).not.toContain('NOT PICKED'); expect(count(h, /data-phc-done="1"/g)).toBeGreaterThanOrEqual(2);
    expect(h).toContain('✓ YOURS · FREE'); expect(h).toContain('data-phc-camp-take-free="Swap to this (free)"');
  });
  it('rules 1.55 item 53: a kit the reducer would refuse greys the Recommended button and says why', () => {
    ME = 'host'; expect(draw()).not.toContain('data-phc-camp-rec-why');
    const was = G; G = JSON.parse(JSON.stringify(G));
    G.run!.loadout!.c1.base.pack.push({ id: 'buckler', weapon: 'buckler', name: 'Buckler', qty: 200, kind: 'weapon' } as any); // over any carry limit (rules 1.57: a shield is a weapon line)
    const h = draw(), btn = h.slice(h.indexOf('data-phc-camp-recommended'), h.indexOf('</button>', h.indexOf('data-phc-camp-recommended')));
    expect(btn).toContain('disabled=""'); expect(btn).toMatch(/data-phc-camp-rec-why=""[^>]*>Can(&#x27;|')t take it: Too heavy: /);
    G = was;
  });
});
