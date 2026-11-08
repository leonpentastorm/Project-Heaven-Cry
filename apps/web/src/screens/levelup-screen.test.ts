// @vitest-environment jsdom
// The level-up screen (Leon, 7 Nov 2026): perk steps as cards with both choices side by side on the left, the class
// panel on the right (emblem, name, rank, attribute progress, moves by rank with who runs them, advanced classes
// shelved in Class Roster Revision 3); the class choice at level 3 with emblems.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, CLASS, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'levelup', levelupChar: Object.keys(G.characters)[0], toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { LevelUpLogic } = await import('./levelup.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const tpl = (await import('../templates/levelup.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), LevelUpLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId) || ARCHETYPES[0];
  return { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function setup(edit: (c: any) => void = () => {}) {
  snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'lu');
  doAct({ type: 'char/add', sheet: sheetFrom('sharpshooter') });
  const c: any = Object.values(G.characters)[0]; edit(c); snap = view();
  return c;
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(Screen as any, { tick: st });
}
async function mount() {
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
  await React.act(async () => { root.render(React.createElement(App)); });
  return { el, root };
}

describe('level-up screen', () => {
  it('before level 3: the closest classes with emblems, no class yet', async () => {
    setup((c) => { c.level = 2; });
    const { el, root } = await mount();
    expect(el.querySelector('.phc-lu-class-name')!.textContent).toBe('No class yet');
    const closest = el.querySelectorAll('.phc-lu-closest');
    expect(closest.length).toBeGreaterThanOrEqual(4);
    expect(closest[0].querySelector('img.phc-lu-emblem')!.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(el.textContent).toContain('CLASSES THAT LEAD');
    expect(el.textContent).not.toMatch(/signature/i);
    root.unmount();
  });
  it('level 3 with every attribute tied: the picker lists all nine classes (Class Roster Revision 3 tie rule)', async () => {
    setup((c) => { c.level = 3; c.xp = 250; for (const k of Object.keys(c.attrs)) c.attrs[k] = 3; Object.assign(c.cores, { body: 3, mind: 3, soul: 3 }); });
    const { el, root } = await mount();
    const ids = (Array.from(el.querySelectorAll('button.phc-lu-class-card')) as HTMLElement[]).map((b) => b.getAttribute('data-class')).sort();
    expect(ids).toEqual(Object.keys(CLASS).sort());
    expect(ids.length).toBe(9);
    // Each card: emblem, name, the attribute (in its ink), the fantasy line, resource, both rank I moves.
    const mk = el.querySelector('button.phc-lu-class-card[data-class="infiltrator"]')!;
    expect(mk.querySelector('img.phc-lu-emblem')).toBeTruthy();
    expect(mk.querySelector('.phc-lu-card-attr')!.textContent).toBe('PERCEPTION 3');
    expect((mk.querySelector('.phc-lu-card-attr') as HTMLElement).style.color).toBe('rgb(64, 186, 160)');
    expect(mk.textContent).toContain(CLASS.infiltrator.tagline); expect(mk.textContent).toContain('Resource: Marks');
    expect(mk.querySelectorAll('.phc-lu-card-move').length).toBe(2);
    expect(el.querySelector('.phc-lu-permanent')!.textContent).toMatch(/PERMANENT/);
    expect(el.querySelector('.phc-lu-pick-intro')!.textContent).toMatch(/All nine attributes are tied at 3/);
    expect(el.querySelector('.phc-lu-adv-note')).toBeNull();
    root.unmount();
  });
  it('level 3: a card selects and previews; the confirm bar commits, for good', async () => {
    setup((c) => { c.level = 3; c.xp = 250; c.attrs.agility = 4; c.attrs.perception = 4; c.attrs.insight = 4; for (const k of ['endurance', 'strength', 'intelligence', 'expression', 'determination', 'virtue']) c.attrs[k] = 2; });
    const { el, root } = await mount();
    const cards = Array.from(el.querySelectorAll('button.phc-lu-class-card')) as HTMLButtonElement[];
    expect(cards.map((b) => b.getAttribute('data-class')).sort()).toEqual(['bard', 'infiltrator', 'marksman']);
    cards.forEach((b) => expect(b.querySelector('img.phc-lu-emblem')).toBeTruthy());
    expect(el.querySelector('button.phc-lu-confirm-btn')).toBeNull(); // nothing selected yet
    const id = cards[1].getAttribute('data-class')!;
    await React.act(async () => { cards[1].click(); });
    expect(G.characters[Object.keys(G.characters)[0]].classId).toBeFalsy(); // a card only selects
    expect(el.querySelector('.phc-lu-class-kicker')!.textContent).toMatch(/PREVIEW/);
    expect(el.querySelector('.phc-lu-class-name')!.textContent).toBe(CLASS[id].name);
    const confirm = el.querySelector('button.phc-lu-confirm-btn') as HTMLButtonElement;
    expect(confirm.textContent).toContain(CLASS[id].name);
    await React.act(async () => { confirm.click(); });
    expect(G.characters[Object.keys(G.characters)[0]].classId).toBe(id);
    expect(el.querySelector('button.phc-lu-class-card')).toBeNull();
    // A second pick is refused by the engine: the class is fixed.
    const other = cards.map((b) => b.getAttribute('data-class')!).find((x) => x !== id)!;
    expect(() => apply(G, { type: 'levelup/class', charId: Object.keys(G.characters)[0], classId: other } as any, ME)).toThrow(/set/);
    expect(el.querySelector('.phc-lu-class-name')!.textContent).toBe(CLASS[id].name);
    expect(el.querySelector('.phc-lu-rank')!.textContent).toBe('RANK I');
    const moves = Array.from(el.querySelectorAll('.phc-lu-move'));
    // Class Roster Revision 3: two moves a rank; II at the class's attribute 5, III at 8.
    expect(moves.length).toBe(6);
    expect(moves[0].textContent).toMatch(/Engine runs it|Narrator rules it|Both/);
    const groups = Array.from(el.querySelectorAll('.phc-lu-rank-group'));
    expect(groups.length).toBe(3);
    expect(groups.map((x) => x.querySelector('.phc-lu-rank-state')!.textContent)).toEqual(['✓ UNLOCKED', 'LOCKED', 'LOCKED']);
    expect(el.querySelector('.phc-lu-attr')!.textContent).toMatch(/^(AGILITY|PERCEPTION|INSIGHT) 4$/);
    const an = ({ endurance: 'Endurance', strength: 'Strength', agility: 'Agility', perception: 'Perception', intelligence: 'Intelligence', expression: 'Expression', insight: 'Insight', determination: 'Determination', virtue: 'Virtue' } as any)[CLASS[id].attribute];
    expect(moves[2].textContent).toContain('unlocks at ' + an + ' 5');
    expect(moves[4].textContent).toContain('unlocks at ' + an + ' 8');
    expect(el.querySelector('.phc-lu-class-chip img')).toBeTruthy();
    root.unmount();
  });
  it('perk steps: one card per skill, both choices side by side, each with who runs it', async () => {
    const c0 = setup((c) => { c.level = 4; c.classId = 'marksman'; c.attrs.agility = Math.max(c.attrs.agility, 5); c.cores.body = Math.max(c.cores.body, 5); c.skills.dexterity = 5; c.perks = []; });
    const { el, root } = await mount();
    const step = el.querySelector('.phc-lu-step[data-skill="dexterity"]')!;
    expect(step).toBeTruthy();
    const choices = step.querySelectorAll('.phc-lu-pair > button.phc-lu-choice');
    expect(choices.length).toBe(2);
    expect(choices[0].textContent).toMatch(/Engine runs it|Narrator rules it|Both/);
    await React.act(async () => { (choices[0] as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].perks.length).toBe(1);
    root.unmount();
  });
  it('advanced classes are shelved (Class Roster Revision 3): one quiet line, nothing listed, nothing to learn', async () => {
    setup((c) => { c.level = 12; c.classId = 'marksman'; c.advancedClass = 'gunslinger';
      Object.assign(c.cores, { body: 10, mind: 10, soul: 10 }); for (const k of Object.keys(c.attrs)) c.attrs[k] = 10; c.tutors = ['gunslinger']; });
    const m = await mount();
    expect(m.el.querySelector('.phc-lu-adv-note')!.textContent).toBe('Advanced classes are being rebuilt.');
    expect(m.el.querySelector('.phc-lu-adv')).toBeNull();
    expect(m.el.querySelector('button.phc-lu-learn')).toBeNull();
    expect(m.el.querySelector('.phc-lu-class-name')!.textContent).toBe('Marksman'); // the shelved Gunslinger isn't shown
    expect(m.el.textContent).not.toMatch(/Gunslinger|tutor/i);
    expect(Array.from(m.el.querySelectorAll('.phc-lu-rank-state')).map((x) => x.textContent)).toEqual(['✓ UNLOCKED', '✓ UNLOCKED', '✓ UNLOCKED']);
    expect(m.el.querySelectorAll('.phc-lu-move').length).toBe(6); // the base class's 6 moves only
    m.root.unmount();
  });
});
