// @vitest-environment jsdom
// The cog's Fight tabs panel (game/fightTabsPanel.tsx): the character picker, move, Show / Hide (refused on the first
// tab), Reset to default, and in a fight the numbers the bar uses with a tab absent this fight marked and not numbered.
import { describe, expect, it, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

let snap: any = null;
vi.mock('./store', () => ({ getState: () => snap, subscribe: () => () => {} }));
const { FightTabsPanel } = await import('./fightTabsPanel');
const { saveTabPrefs, loadTabPrefs, tabKey, noteLive, _resetTabPrefsCache } = await import('./tabPrefs');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const game = (combat: any = null) => ({ code: 'ROOM', combat, characters: { c1: { id: 'c1', name: 'Ilse', owner: 'me' }, c2: { id: 'c2', name: 'Bram', owner: 'me' }, c3: { id: 'c3', name: 'Other', owner: 'you' } } });
function draw() {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el); act(() => root.render(createElement(FightTabsPanel)));
  return { el, root };
}
const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-phc-fight-tab]')) as HTMLElement[];
const btn = (el: HTMLElement, sel: string) => el.querySelector(sel) as HTMLButtonElement;

describe('the Fight tabs panel', () => {
  it('the picker lists only my characters; a character with no fight yet shows a note', () => {
    _resetTabPrefsCache(); snap = { game: game(), me: { id: 'me' } };
    saveTabPrefs(tabKey('c1'), { order: ['move', 'attack', 'sigils'], hidden: [], custom: false });
    const { el, root } = draw();
    expect(Array.from(el.querySelectorAll('[data-phc-tabs-char]')).map((b) => b.getAttribute('data-phc-tabs-char'))).toEqual(['c1', 'c2']);
    expect(rows(el).map((r) => r.getAttribute('data-phc-fight-tab'))).toEqual(['move', 'attack', 'sigils']);
    act(() => btn(el, '[data-phc-tabs-char="c2"]').click());
    expect(rows(el)).toEqual([]); expect(el.textContent).toMatch(/Bram’s tabs show here after its first fight/);
    act(() => root.unmount()); el.remove();
  });
  it('Show / Hide is refused on the first tab; hiding, moving and Reset save the character\'s prefs', () => {
    _resetTabPrefsCache(); snap = { game: game(), me: { id: 'me' } };
    saveTabPrefs(tabKey('c1'), { order: ['move', 'attack', 'sigils'], hidden: [], custom: false });
    const { el, root } = draw();
    expect(btn(el, '[data-phc-tab-show="move"]').disabled).toBe(true);
    expect(btn(el, '[data-phc-tabs-reset]').disabled).toBe(true);
    act(() => btn(el, '[data-phc-tab-show="attack"]').click());
    expect(loadTabPrefs(tabKey('c1'))).toMatchObject({ hidden: ['attack'], custom: true });
    act(() => (el.querySelector('[aria-label="Move Sigils up"]') as HTMLButtonElement).click());
    expect(loadTabPrefs(tabKey('c1')).order).toEqual(['move', 'sigils', 'attack']);
    expect(btn(el, '[data-phc-tabs-reset]').disabled).toBe(false);
    act(() => btn(el, '[data-phc-tabs-reset]').click());
    expect(loadTabPrefs(tabKey('c1'))).toEqual({ order: ['move', 'attack', 'sigils'], hidden: [], custom: false });
    act(() => root.unmount()); el.remove();
  });
  it('in a fight: numbered as the bar shows them; a tab absent this fight is marked and not numbered', () => {
    _resetTabPrefsCache(); snap = { game: game({ units: [], order: [], turn: 0 }), me: { id: 'me' } };
    saveTabPrefs(tabKey('c1'), { order: ['move', 'sigils', 'attack', 'calls'], hidden: [], custom: true });
    noteLive(tabKey('c1'), ['move', 'attack', 'calls'], ['move', 'attack', 'calls']);
    const { el, root } = draw();
    const num = (id: string) => (el.querySelector('[data-phc-fight-tab="' + id + '"] span') as HTMLElement).textContent;
    expect(['move', 'sigils', 'attack', 'calls'].map(num)).toEqual(['1', '', '2', '3']);
    expect(el.querySelector('[data-phc-fight-tab="sigils"]')!.hasAttribute('data-phc-tab-absent')).toBe(true);
    expect(el.querySelector('[data-phc-fight-tab="sigils"]')!.textContent).toMatch(/not this fight/);
    act(() => root.unmount()); el.remove();
  });
});
