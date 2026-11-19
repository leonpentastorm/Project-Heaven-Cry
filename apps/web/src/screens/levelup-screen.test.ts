// @vitest-environment jsdom
// The level-up screen (Leon, 7 Nov 2026): perk steps as cards with both choices side by side on the left, the class
// panel on the right (emblem, name, rank, attribute progress, moves by rank with who runs them, advanced classes
// shelved in Class Roster Revision 3); the class choice at level 3 with emblems.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, CLASS, SKILL, canRaise, pendingPerkSteps, type GameState, type Sheet } from '@engine';

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
const { makeScreen } = await import('../dc/runtime'); const { expand, D, nextLine } = await import('./shared');
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
    // the class waits in the TO CHOOSE strip, first; its chip opens the chooser (one centred panel)
    expect(el.querySelector('button.phc-lu-class-card')).toBeNull();
    expect([...el.querySelectorAll('.phc-lu-tochoose .phc-lu-tc')].map((b) => b.getAttribute('data-kind'))[0]).toBe('class');
    await React.act(async () => { (el.querySelector('.phc-lu-tc[data-kind="class"]') as HTMLButtonElement).click(); });
    expect(el.querySelector('.phc-lu-chooser[data-chooser="class"]')).toBeTruthy();
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
    await React.act(async () => { (el.querySelector('.phc-lu-tc[data-kind="class"]') as HTMLButtonElement).click(); });
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
    expect(el.querySelector('.phc-lu-chooser')).toBeNull(); // the class is chosen: its panel is gone and its chip with it
    expect(el.querySelector('.phc-lu-tc[data-kind="class"]')).toBeNull();
    expect((el.querySelector('button.phc-lu-done') as HTMLButtonElement).disabled).toBe(el.querySelectorAll('.phc-lu-tc').length > 0);
    // with a class held, the panel folds to one line (its class and rank); a click opens it
    expect(el.querySelector('.phc-lu-class-line')!.textContent).toMatch(new RegExp('^' + CLASS[id].name + ' I · Rank II: '));
    { const f = el.querySelector('.phc-lu-class-fold') as HTMLButtonElement; if (f.getAttribute('aria-expanded') === 'false') await React.act(async () => { f.click(); }); }
    // A second pick is refused by the engine: the class is fixed.
    const other = cards.map((b) => b.getAttribute('data-class')!).find((x) => x !== id)!;
    expect(() => apply(G, { type: 'levelup/class', charId: Object.keys(G.characters)[0], classId: other } as any, ME)).toThrow(/set/);
    expect(el.querySelector('.phc-lu-class-name')!.textContent).toBe(CLASS[id].name);
    expect(el.querySelector('.phc-lu-rank')!.textContent).toBe('RANK I');
    const moves = Array.from(el.querySelectorAll('.phc-lu-move'));
    // Class Roster Revision 3: two moves a rank; II at the class's attribute 5, III at 8.
    expect(moves.length).toBe(6);
    expect(moves[0].textContent).not.toMatch(/Engine runs it|Narrator rules it|Both/); // rules 1.66 item 5212: a mark only where it is the Narrator's call
    const groups = Array.from(el.querySelectorAll('.phc-lu-rank-group'));
    expect(groups.length).toBe(3);
    expect(groups.map((x) => x.querySelector('.phc-lu-rank-state')!.textContent)).toEqual(['✓ UNLOCKED', 'LOCKED', 'LOCKED']);
    expect(el.querySelector('.phc-lu-attr')!.textContent).toMatch(/^(AGILITY|PERCEPTION|INSIGHT) 4$/);
    const an = ({ endurance: 'Endurance', strength: 'Strength', agility: 'Agility', perception: 'Perception', intelligence: 'Intelligence', expression: 'Expression', insight: 'Insight', determination: 'Determination', virtue: 'Virtue' } as any)[CLASS[id].attribute];
    expect(moves[2].textContent).toContain('unlocks at ' + an + ' 5');
    expect(moves[4].textContent).toContain('unlocks at ' + an + ' 8');
    expect(el.querySelector('.phc-lu-class-fold img')).toBeTruthy();
    root.unmount();
  });
  it('spend first (the redesign): three family tabs, the family with a step waiting opens, one row a skill, the TO CHOOSE strip opens one chooser panel', async () => {
    const c0 = setup((c) => { c.level = 4; c.classId = 'marksman'; c.attrs.agility = Math.max(c.attrs.agility, 5); c.cores.body = Math.max(c.cores.body, 5); c.skills.dexterity = 5; c.perks = []; c.unspent = { skill: 1, attr: 1, core: 1 } as any; });
    const { el, root } = await mount();
    // three tabs; one family on screen: the one with something waiting (Dexterity, under Agility, is Body)
    expect([...el.querySelectorAll('[role="tablist"][aria-label="Families"] [role="tab"]')].map((x) => x.textContent!.replace(/◆.*/, ''))).toEqual(['BODY', 'MIND', 'SOUL']);
    expect([...el.querySelectorAll('.phc-lu-core')].map((x) => x.getAttribute('data-core'))).toEqual(['body']);
    expect(el.querySelector('[data-fam="body"]')!.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('[data-fam="body"]')!.textContent).toMatch(/◆ \d+$/);
    expect(el.querySelectorAll('.phc-lu-core .phc-lu-attrcol').length).toBe(3);
    expect(el.querySelectorAll('.phc-lu-attrcol[data-attr="agility"] .phc-lu-skill').length).toBe(3);
    // a skill is ONE row: name, points, a big +1, the one line its next point gives (the ladder's own row), "?"
    for (const r of el.querySelectorAll('.phc-lu-skill')) {
      const id = r.getAttribute('data-skill')!, p = (G.characters[c0.id].skills as any)[id] || 0;
      const off = (r.querySelector('button[data-raise="skill"]') as HTMLButtonElement).disabled;
      // a refused +1 says why in the place of the line; otherwise the line is what its next point gives
      if (off) { expect(r.querySelector('.phc-lu-why')!.textContent).toMatch(/\S/); expect(r.querySelector('.phc-lu-next')).toBeNull(); }
      else expect(r.querySelector('.phc-lu-next')!.textContent).toBe(nextLine(id, p));
      expect((r.querySelector('button[data-raise="skill"]') as HTMLElement).style.minHeight).toBe('40px');
    }
    // Dexterity 5 with no perks: a white chip, two steps waiting; nothing to choose until it is opened
    const dex = () => el.querySelector('.phc-lu-skill[data-skill="dexterity"]')!;
    expect(dex().classList.contains('phc-lu-step')).toBe(true);
    expect(dex().querySelector('.phc-lu-chip')!.textContent).toBe('◆ 2 perk steps · Fork');
    expect(el.querySelectorAll('button.phc-lu-choice').length).toBe(0);
    // the strip: forks before perk steps, each named with its skill; Done is not lit while it holds anything
    const strip = [...el.querySelectorAll('.phc-lu-tochoose .phc-lu-tc')].map((b) => [b.getAttribute('data-kind'), b.textContent]);
    expect(strip.filter((x) => x[1]!.endsWith('Dexterity')).map((x) => x[1])).toEqual(['◆ Fork · Dexterity', '◆ 2 perk steps · Dexterity']);
    expect(strip.map((x) => x[0]).join(' ')).toMatch(/^(fork )*(perk ?)*$/); // forks first, then perk steps
    expect((el.querySelector('button.phc-lu-done') as HTMLButtonElement).disabled).toBe(true);
    expect(el.querySelector('button.phc-lu-later')!.textContent).toBe('Finish later');
    await React.act(async () => { (el.querySelector('.phc-lu-tc[data-choose="perk:dexterity"]') as HTMLButtonElement).click(); });
    // ONE centred panel over the screen, never rows under the skill: the perk rows, a button on each legal row
    const panel = () => el.querySelector('.phc-lu-chooser[data-chooser="perk"]')!;
    expect(panel()).toBeTruthy(); expect(dex().querySelector('.phc-perk-row')).toBeNull();
    const rows = [...panel().querySelectorAll('.phc-perk-row')];
    expect(rows.length).toBe(2);
    for (const r of rows) { expect(r.querySelector('.phc-perk-t1')!.textContent).toMatch(/^I \S/); expect(r.querySelector('.phc-perk-t2')!.textContent).toMatch(/^II \S/); expect(r.textContent).not.toMatch(/Passive|TIER/); }
    expect([...panel().querySelectorAll('button.phc-perk-act')].map((b) => b.textContent)).toEqual(['Take', 'Take']);
    expect(panel().querySelector('.phc-lu-ch-next')).toBeTruthy(); // the fork waits too: "Next choice"
    // one click arms it, one confirm line takes it: a step taken, one left
    await React.act(async () => { (panel().querySelector('button.phc-perk-act') as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].perks.length).toBe(0);
    expect(panel().querySelector('.phc-lu-ch-confirm')!.textContent).toMatch(/^Take .+\? Kept for good\.Confirm/);
    await React.act(async () => { (panel().querySelector('button.phc-lu-ch-ok') as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].perks.length).toBe(1);
    expect(dex().querySelector('.phc-lu-chip')!.textContent).toBe('◆ Perk step · Fork');
    // the taken perk now offers its Upgrade; the other still its Take
    expect([...panel().querySelectorAll('button.phc-perk-act')].map((b) => b.textContent).sort()).toEqual(['Take', 'Upgrade']);
    await React.act(async () => { (panel().querySelector('.phc-lu-ch-close') as HTMLButtonElement).click(); });
    expect(el.querySelector('.phc-lu-chooser')).toBeNull();
    // points: the +1 spends through the engine; the row then says what was gained
    await React.act(async () => { (el.querySelector('[data-fam="mind"]') as HTMLButtonElement).click(); });
    expect([...el.querySelectorAll('.phc-lu-core')].map((x) => x.getAttribute('data-core'))).toEqual(['mind']);
    await React.act(async () => { (el.querySelector('.phc-lu-attrcol[data-attr="perception"] button[data-raise="attr"]') as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].unspent.attr).toBe(0);
    const before = G.characters[c0.id].skills.vigilant || 0, gain = nextLine('vigilant', before);
    await React.act(async () => { (el.querySelector('.phc-lu-skill[data-skill="vigilant"] button[data-raise="skill"]') as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].skills.vigilant).toBe(before + 1);
    expect(el.querySelector('.phc-lu-skill[data-skill="vigilant"] .phc-lu-gain')!.textContent).toBe('✓ ' + gain);
    root.unmount();
  });
  it('a fork waiting: its chip opens the chooser panel, two columns, one line each, no hover box repeating the card', async () => {
    const c0 = setup((c) => { c.level = 6; c.classId = 'marksman'; c.attrs.endurance = 6; c.skills.durability = 4; c.perks = []; c.unspent = { skill: 0, attr: 0, core: 0 } as any; });
    const { el, root } = await mount();
    const row = () => el.querySelector('.phc-lu-skill[data-skill="durability"]')!;
    expect(row().querySelector('.phc-lu-chip')!.textContent).toMatch(/Fork$/);
    await React.act(async () => { (row().querySelector('.phc-lu-chip') as HTMLButtonElement).click(); });
    const panel = () => el.querySelector('.phc-lu-chooser[data-chooser="fork"]')!;
    expect(panel().querySelector('.phc-lu-ch-title')!.textContent).toBe('Fork at 4 · Durability');
    const opts = [...panel().querySelectorAll('.phc-lu-forkpair [data-fork-opt]')];
    expect(opts.length).toBe(2);
    for (const o of opts) {
      expect(o.querySelector('[data-fork-text]')!.textContent!.length).toBeGreaterThan(0);
      // a hover box never repeats its anchor: no element in the card has a tip that its own visible text holds, or that holds it
      for (const t of [o, ...o.querySelectorAll('[data-tip-text]')]) {
        const tip = t.getAttribute('data-tip-text'); if (!tip) continue;
        expect(o.textContent!.includes(tip)).toBe(false); expect(tip.includes(o.querySelector('[data-fork-text]')!.textContent!)).toBe(false);
      }
    }
    expect(G.characters[c0.id].doorPicks?.durability || []).toEqual([]);
    const pick = opts[0].querySelector('button[data-fork-pick]') as HTMLButtonElement;
    await React.act(async () => { pick.click(); }); // the first press arms it (a fork is kept for good)
    await React.act(async () => { (panel().querySelector('button[data-fork-pick]') as HTMLButtonElement).click(); });
    expect((G.characters[c0.id] as any).doorPicks.durability.length).toBe(1);
    expect(el.querySelector('.phc-lu-chooser')).toBeNull(); // chosen: nothing waits, the panel closes
    root.unmount();
  });
  it('no Core anywhere; the header is the budget; each attribute row says what a point gives; a refused +1 says why on its row, with a way to fix it', async () => {
    const c0 = setup((c) => { c.level = 4; c.classId = 'marksman'; c.attrs.agility = 8; c.attrs.endurance = 2; c.skills.durability = 2; c.perks = []; c.unspent = { skill: 1, attr: 1, core: 0 } as any; });
    const { el, root } = await mount();
    expect(el.querySelector('button[data-raise="core"]')).toBeNull();
    expect(el.textContent).not.toMatch(/Core point|its Core|Core points|\d Core\b/);
    const owed = pendingPerkSteps(G.characters[c0.id]).reduce((n, x: any) => n + (x.free || 1), 0);
    expect([...el.querySelectorAll('.phc-lu-budget [data-budget]')].map((x) => x.textContent).slice(0, 3)).toEqual(['1 Skill', '1 Attribute', owed + (owed === 1 ? ' Perk step' : ' Perk steps')]);
    expect(el.querySelector('.phc-lu-ceiling')!.textContent).toBe('Attributes: ceiling 8 at this level (9 from level 6, 10 from level 9)');
    expect(el.querySelector('.phc-lu-rules')!.getAttribute('data-tip-text')).toMatch(/can't be higher than the attribute above it/);
    // every attribute: what the next point gives
    const agi = el.querySelector('.phc-lu-attrcol[data-attr="agility"]')!;
    expect(agi.querySelector('.phc-lu-attr-next')!.textContent).toBe('+0.5 tile of movement an AP · +1 Initiative');
    expect(el.querySelectorAll('.phc-lu-attr-next').length).toBe(3);
    // Agility is at the ceiling: its +1 is off and the engine's reason is on its row
    expect((agi.querySelector('button[data-raise="attr"]') as HTMLButtonElement).disabled).toBe(true);
    expect(agi.querySelector('.phc-lu-attr-why')!.textContent).toBe(canRaise(G.characters[c0.id], 'attr', 'agility'));
    expect(agi.querySelector('.phc-lu-attr-why')!.textContent).toMatch(/^Agility 9 opens at level 6/);
    expect([...agi.querySelectorAll('.phc-lu-slot')].map((x) => x.textContent)).toEqual(['FIGHT', 'SURVIVE', 'TALK · NOTICE']);
    // Durability 2 under Endurance 2: its +1 is refused with the reason on the row, and "Raise Endurance" beside it
    const dur = () => el.querySelector('.phc-lu-skill[data-skill="durability"]')!;
    expect((dur().querySelector('button[data-raise="skill"]') as HTMLButtonElement).disabled).toBe(true);
    expect(dur().querySelector('.phc-lu-why')!.textContent).toMatch(/^Needs Endurance 3/);
    expect(el.querySelectorAll('.phc-lu-why .phc-lu-fix').length).toBeGreaterThan(0);
    await React.act(async () => { (dur().querySelector('.phc-lu-fix') as HTMLButtonElement).click(); });
    expect(G.characters[c0.id].attrs.endurance).toBe(3);
    expect((dur().querySelector('button[data-raise="skill"]') as HTMLButtonElement).disabled).toBe(false);
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
    // ...the lore on its face, its ladder folded (Leon, 19 Nov); opened: ten rows, the character's owned levels and the next one marked
    expect(el.querySelector('.phc-ep-lore')).toBeTruthy();
    expect(el.querySelector('.phc-ep-fold')!.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelectorAll('.phc-ep-road .phc-ep-step').length).toBe(0);
    await React.act(async () => { (el.querySelector('.phc-ep-fold') as HTMLButtonElement).click(); });
    expect(el.querySelector('.phc-ep-fold')!.getAttribute('aria-expanded')).toBe('true');
    const steps = [...el.querySelectorAll('.phc-ep-road .phc-ep-step')], first = page.querySelector('button.phc-attr-skill')!.getAttribute('data-skill')!;
    expect(steps.map((x) => x.getAttribute('data-step'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const pts = (G.characters[c0.id].skills as any)[first] || 0;
    expect(steps.filter((x) => x.getAttribute('data-state') === 'owned').length).toBe(pts);
    expect(steps.filter((x) => x.getAttribute('data-state') === 'next').map((x) => x.getAttribute('data-step'))).toEqual([String(pts + 1)]);
    for (const st of steps) { expect(st.querySelectorAll('.phc-ep-rowtext').length).toBe(1); expect(st.textContent).not.toMatch(/^\s*—\s*$/); }
    root.unmount();
  });
  it('advanced classes are shelved (Class Roster Revision 3): one quiet line, nothing listed, nothing to learn', async () => {
    setup((c) => { c.level = 12; c.classId = 'marksman'; c.advancedClass = 'gunslinger';
      Object.assign(c.cores, { body: 10, mind: 10, soul: 10 }); for (const k of Object.keys(c.attrs)) c.attrs[k] = 10; c.tutors = ['gunslinger']; });
    const m = await mount();
    const f = m.el.querySelector('.phc-lu-class-fold') as HTMLButtonElement;
    expect(m.el.querySelector('.phc-lu-class-line')!.textContent).toMatch(new RegExp('^' + CLASS.marksman.name + ' III'));
    if (f.getAttribute('aria-expanded') === 'false') await React.act(async () => { f.click(); });
    expect(m.el.querySelector('.phc-lu-adv-note')!.textContent).toBe('Advanced classes: sealed, not yet issued.');
    expect(m.el.querySelector('.phc-lu-adv')).toBeNull();
    expect(m.el.querySelector('button.phc-lu-learn')).toBeNull();
    expect(m.el.querySelector('.phc-lu-class-name')!.textContent).toBe(CLASS.marksman.name); // the shelved Gunslinger isn't shown
    expect(m.el.textContent).not.toMatch(/Gunslinger|tutor/i);
    expect(Array.from(m.el.querySelectorAll('.phc-lu-rank-state')).map((x) => x.textContent)).toEqual(['✓ UNLOCKED', '✓ UNLOCKED', '✓ UNLOCKED']);
    expect(m.el.querySelectorAll('.phc-lu-move').length).toBe(6); // the base class's 6 moves only
    m.root.unmount();
  });
});
