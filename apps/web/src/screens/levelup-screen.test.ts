// @vitest-environment jsdom
// The level-up screen (Leon, 7 Nov 2026): perk steps as cards with both choices side by side on the left, the class
// panel on the right (emblem, name, rank, attribute progress, moves by rank with who runs them, advanced classes
// shelved in Class Roster Revision 3); the class choice at level 3 with emblems.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, CLASS, SKILL, canRaise, type GameState, type Sheet } from '@engine';

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
const { makeScreen } = await import('../dc/runtime'); const { expand, D } = await import('./shared');
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
  it('the tree (Leon, 9 Nov 2026): every skill under its attribute under its core, its perks attached and their states', async () => {
    const c0 = setup((c) => { c.level = 4; c.classId = 'marksman'; c.attrs.agility = Math.max(c.attrs.agility, 5); c.cores.body = Math.max(c.cores.body, 5); c.skills.dexterity = 5; c.perks = []; c.unspent = { skill: 1, attr: 1, core: 1 } as any; });
    const { el, root } = await mount();
    // three cores, three attributes each, three skills each
    expect([...el.querySelectorAll('.phc-lu-core')].map((x) => x.getAttribute('data-core'))).toEqual(['body', 'mind', 'soul']);
    expect(el.querySelectorAll('.phc-lu-core[data-core="body"] .phc-lu-attrcol').length).toBe(3);
    expect(el.querySelectorAll('.phc-lu-attrcol[data-attr="agility"] .phc-lu-skill').length).toBe(3);
    // Dexterity 5 with no perks: two steps waiting; each perk offers Tier I; the Mastered perk is locked at 10
    const dex = el.querySelector('.phc-lu-skill[data-skill="dexterity"]')!;
    expect(dex.classList.contains('phc-lu-step')).toBe(true);
    expect(dex.querySelector('.phc-lu-stepline')!.textContent).toMatch(/2 PERK STEPS TO TAKE/);
    const choices = dex.querySelectorAll('.phc-lu-perk button.phc-lu-choice');
    expect(choices.length).toBe(2); expect(choices[0].textContent).toBe('Take · Tier I');
    expect(dex.querySelector('.phc-lu-mastered')!.textContent).toMatch(/AT 10 PTS/);
    // the Mastery marks: M1 and M2 reached (filled), M3, M4 and ★ not
    expect([...dex.querySelectorAll('[aria-label="Mastery"] > span')].map((x) => x.textContent)).toEqual(['M1', 'M2', 'M3', 'M4', '★']);
    // a step taken: that perk now reads as yours, and the other offers its Tier I (one step left)
    await React.act(async () => { (choices[0] as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].perks.length).toBe(1);
    const dex2 = el.querySelector('.phc-lu-skill[data-skill="dexterity"]')!, taken = G.characters[c0.id].perks[0].id;
    expect(dex2.querySelector('.phc-lu-perk[data-perk="' + taken + '"]')!.getAttribute('data-state')).toBe('owned');
    expect(dex2.querySelector('.phc-lu-perk[data-perk="' + taken + '"]')!.textContent).toMatch(/✓ TIER I/);
    // points: the raise buttons spend through the engine (core, then attribute, then skill)
    const raise = (sel: string) => el.querySelector(sel) as HTMLButtonElement;
    // (rules 1.13: no Core points; an attribute is raised straight away)
    await React.act(async () => { raise('.phc-lu-attrcol[data-attr="perception"] button[data-raise="attr"]').click(); });
    expect(G.characters[c0.id].unspent.attr).toBe(0);
    const before = G.characters[c0.id].skills.vigilant || 0;
    await React.act(async () => { raise('.phc-lu-skill[data-skill="vigilant"] button[data-raise="skill"]').click(); });
    expect(G.characters[c0.id].skills.vigilant).toBe(before + 1);
    root.unmount();
  });
  it('no Core anywhere: families are headings; each attribute says what a point gives and the ceiling; a refused raise says the engine\'s reason', async () => {
    const c0 = setup((c) => { c.level = 4; c.classId = 'marksman'; c.attrs.agility = 8; c.unspent = { skill: 1, attr: 1, core: 0 } as any; });
    const { el, root } = await mount();
    expect(el.querySelector('button[data-raise="core"]')).toBeNull();
    expect(el.textContent).not.toMatch(/Core point|its Core|Core points|\d Core\b/);
    for (const f of el.querySelectorAll('.phc-lu-core > div:first-child')) expect(f.textContent).toMatch(/^(BODY|MIND|SOUL)\D*ceiling 8 at this level$/);
    expect(el.querySelector('.phc-lu-spend')!.textContent).toBe('1 Skill point · 1 Attribute point');
    expect(el.querySelector('.phc-lu-ceiling')!.textContent).toBe('Attributes: ceiling 8 at this level (9 from level 6, 10 from level 9)');
    expect([...el.querySelectorAll('.phc-lu-ceil')].map((x) => x.textContent)).toEqual(['ceiling 8 at this level', 'ceiling 8 at this level', 'ceiling 8 at this level']);
    // every attribute: what the next point gives (the creation step's line)
    const per = el.querySelector('.phc-lu-attrcol[data-attr="perception"]')!;
    expect(per.querySelector('.phc-lu-attr-next')!.textContent).toMatch(/^Next point \(\d\): \+2 tiles of vision, \+10% critical damage, −10% critical damage taken\.$/);
    expect(el.querySelectorAll('.phc-lu-attr-next').length).toBe(9);
    // Agility is at the ceiling: its +1 is off and the engine's reason is beside it
    const agi = el.querySelector('.phc-lu-attrcol[data-attr="agility"]')!;
    expect((agi.querySelector('button[data-raise="attr"]') as HTMLButtonElement).disabled).toBe(true);
    expect(agi.querySelector('.phc-lu-attr-why')!.textContent).toBe(canRaise(G.characters[c0.id], 'attr', 'agility'));
    expect(agi.querySelector('.phc-lu-attr-why')!.textContent).toMatch(/^Agility 9 opens at level 6/);
    // every skill: its slot in words and what a point gives, from the engine's data
    const dex = el.querySelector('.phc-lu-skill[data-skill="dexterity"]')!;
    expect(dex.querySelector('.phc-lu-slot')!.textContent).toBe('FIGHT');
    expect(dex.querySelector('.phc-lu-give')!.textContent).toBe('Each point: ' + (SKILL as any).dexterity.per_point.text);
    expect([...agi.querySelectorAll('.phc-lu-slot')].map((x) => x.textContent)).toEqual(['FIGHT', 'SURVIVE', 'TALK · NOTICE']);
    expect(el.querySelectorAll('.phc-lu-give').length).toBe(27);
    // the attribute's name opens its page: what a point gives, its three skills, what reads it
    await React.act(async () => { (agi.querySelector('button.phc-lu-attrname') as HTMLButtonElement).click(); });
    const page = el.querySelector('.phc-attr-page')!;
    expect(page.querySelector('h2')!.textContent).toBe('Agility');
    expect(page.querySelector('.phc-attr-gives')!.textContent).toContain('+0.5 tile of movement an AP');
    expect([...page.querySelectorAll('button.phc-attr-skill')].map((b) => b.getAttribute('data-skill'))).toEqual(D.skills.filter((k: any) => k.attr === 'agility').sort((a: any, b: any) => 'abg'.indexOf(a.slot[0]) - 'abg'.indexOf(b.slot[0])).map((k: any) => k.id));
    expect(page.querySelector('.phc-attr-reads')!.textContent).toMatch(/CLASS/);
    expect(page.querySelector('.phc-attr-reads')!.textContent).toMatch(/CALL/);
    // a skill on the page opens that skill's own page
    await React.act(async () => { (page.querySelector('button.phc-attr-skill') as HTMLButtonElement).click(); });
    expect(el.querySelector('.phc-attr-page')).toBeNull();
    expect(el.querySelector('.phc-ep-give')!.textContent).toContain('WHAT A POINT GIVES');
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
