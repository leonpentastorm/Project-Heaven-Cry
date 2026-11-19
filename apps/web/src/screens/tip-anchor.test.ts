// @vitest-environment jsdom
// A hover box never repeats its card (Leon, 17 Nov 2026, "Say the core, once, and stop" rule 5: nothing twice). On the
// real screens, rendered through their templates: the level-up screen (its rows, its chooser panel), every skill's "?"
// page with its three folds open, and creation's Skills step. Every element carrying a tip: the tip's words are not
// already on the element's own face (a tip that only repeats what is shown is noise).
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'levelup', levelupChar: Object.keys(G.characters)[0], toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {}, saveToLibrary: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand, D } = await import('./shared');
const { LevelUpLogic } = await import('./levelup.js');
const { CreateLogic } = await import('./create.js');
const LevelUp = makeScreen(expand((await import('../templates/levelup.template.html?raw')).default), LevelUpLogic as any);
const Create = makeScreen(expand((await import('../templates/create.template.html?raw')).default), CreateLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Every tip on the page whose words are already on its own element's face. */
function repeats(root: Element): string[] {
  return [...root.querySelectorAll('[data-tip-text]')].flatMap((el) => {
    const tip = (el.getAttribute('data-tip-text') || '').trim(), face = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return tip && face && face.includes(tip.replace(/\s+/g, ' ')) ? [el.tagName + ' "' + face.slice(0, 60) + '" tip "' + tip.slice(0, 60) + '"'] : [];
  });
}
async function mount(el: any) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  await React.act(async () => { root.render(el); });
  return { host, root };
}
const click = async (b: Element | null) => { if (b) await React.act(async () => { (b as HTMLElement).click(); }); };

describe('a tip never repeats its anchor, on the real screens', () => {
  it('level up: the rows, the chooser panel, and every skill\'s "?" page with its folds open', async () => {
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'tips');
    const a = ARCHETYPES.find((x) => x.id === 'sharpshooter') || ARCHETYPES[0];
    doAct({ type: 'char/add', sheet: { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any as Sheet });
    const c: any = Object.values(G.characters)[0]; c.level = 6; c.classId = 'marksman'; for (const k of Object.keys(c.attrs)) c.attrs[k] = 6; c.skills.durability = 5; c.skills.dexterity = 5; c.perks = []; c.unspent = { skill: 1, attr: 1, core: 0 }; snap = view();
    const App = () => { const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap); return React.createElement(LevelUp as any, { tick: st }); };
    const { host, root } = await mount(React.createElement(App));
    const bad: string[] = []; let seen = 0;
    for (const fam of ['body', 'mind', 'soul']) {
      await click(host.querySelector('[data-fam="' + fam + '"]'));
      bad.push(...repeats(host));
      for (const id of [...host.querySelectorAll('.phc-lu-skill')].map((r) => r.getAttribute('data-skill')!)) {
        await click(host.querySelector('.phc-lu-skill[data-skill="' + id + '"] button[aria-label^="What is"]'));
        for (const f of ['.phc-ep-fold', '.phc-ep-perks-fold', '.phc-ep-forks-fold']) { const b = host.querySelector(f); if (b && b.getAttribute('aria-expanded') === 'false') await click(b); }
        expect(host.querySelector('.phc-ep-lore'), id).toBeTruthy();
        bad.push(...repeats(host).map((x) => id + ': ' + x)); seen += host.querySelectorAll('[data-tip-text]').length;
        await click(host.querySelector('button[aria-label="Close the EPCCG entry"]'));
      }
    }
    // the chooser panel (a perk step and a fork)
    for (const chip of [...host.querySelectorAll('.phc-lu-tc')].map((b) => b.getAttribute('data-choose'))) {
      await click(host.querySelector('.phc-lu-tc[data-choose="' + chip + '"]'));
      expect(host.querySelector('.phc-lu-chooser')).toBeTruthy();
      bad.push(...repeats(host).map((x) => chip + ': ' + x));
    }
    expect(bad).toEqual([]);
    expect(seen).toBeGreaterThan(27); // tips were there to read (the Call's, the ladder's unlocks and perk steps)
    root.unmount();
  });
  it('creation\'s Skills step', async () => {
    const { host, root } = await mount(React.createElement(Create as any, { startStep: 'skills' }));
    expect(host.querySelectorAll('[data-tip-text]').length + host.textContent!.length).toBeGreaterThan(0);
    expect(D.skills.some((s: any) => host.textContent!.includes(s.name))).toBe(true);
    expect(repeats(host)).toEqual([]);
    root.unmount();
  });
});
