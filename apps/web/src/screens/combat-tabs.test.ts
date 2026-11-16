// The fight tabs on the combat screen (Leon, 16 Nov 2026; game/tabPrefs.ts, game/doorView.ts tabFocus): the
// character's own order and hidden tabs drive the bar and the number keys; a tab new to the character is appended
// without moving the others; the focus rule for a focus door's tab (in hand, in the pack, none anywhere). Through the
// real screen and real actions.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, packOf, FOCUS_IDS, SKILL, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { prefKey } = await import('../game/commands');
const { loadTabPrefs, saveTabPrefs, moveTab, setHidden, _resetTabPrefsCache } = await import('../game/tabPrefs');

const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function fight(room: string) {
  snap = null; G = newGame(room, { id: 'host', name: 'Leon' }, 'tabs-ui');
  doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Words.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id); if (cb.turn < 0) cb.turn = 0;
  Object.assign(u, { pos: '2,5', ap: 6 }); Object.assign(e, { pos: '8,5' });
  snap = view();
  expect(active(G.combat!)!.id).toBe(u.id);
  return { u };
}
function screen() {
  const l: any = new CombatLogic({});
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  return l;
}
const pc = () => (G.combat as any).units.find((x: any) => x.side === 'pc');
const key = () => prefKey(G, pc().charId);
const tabsOf = (v: any) => v.turnPanels[0].tabs.map((t: any) => t.key);
const TP = (v: any) => v.turnPanels[0].tabPanel[0];
/** A number key on the screen (game keys 1-9 pick the Nth tab shown). */
const press = (l: any, k: string) => { l._chord = null; (globalThis as any).document ??= { activeElement: null, querySelector: () => null }; return l.numKey({ key: k, preventDefault() {}, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, repeat: false, target: null }); };

describe('the fight tabs: order, hiding, the number keys', () => {
  it('default: today\'s order, recorded for the character; key N is the Nth tab', () => {
    _resetTabPrefsCache(); fight('TABS-A');
    const l = screen(), v = l.renderVals(), ids = tabsOf(v);
    expect(ids.slice(0, 3)).toEqual(['move', 'attack', 'utility']); expect(ids).toContain('sigils');
    expect(loadTabPrefs(key()).order).toEqual(ids);
    expect(v.turnPanels[0].tabs.map((t: any) => t.num)).toEqual(ids.map((_: string, i: number) => (i < 9 ? String(i + 1) : '')));
    expect(l._tabs).toEqual(ids);
  });
  it('a custom order: the bar, the numbers and the keys follow it; a hidden tab is gone; the turn opens on the first shown usable tab', () => {
    _resetTabPrefsCache(); fight('TABS-B');
    screen().renderVals(); // the first render records the tabs
    let p = loadTabPrefs(key()); const n = p.order.length;
    for (let i = 0; i < n; i++) p = moveTab(p, 'sigils', -1);
    p = setHidden(p, 'utility', true); saveTabPrefs(key(), p);
    (G.combat as any).round = 2; snap = view(); // not the first turn: the door rule alone would not open on Sigils
    const l = screen(), v = l.renderVals(), ids = tabsOf(v);
    expect(ids[0]).toBe('sigils'); expect(ids).not.toContain('utility');
    expect(ids).toEqual(p.order.filter((x) => x !== 'utility' && ids.includes(x)));
    expect(TP(v).key).toBe('tp-sigils'); // the first shown tab, with Draw usable now
    press(l, String(ids.indexOf('attack') + 1)); expect(TP(l.renderVals()).key).toBe('tp-attack');
    press(l, '1'); expect(TP(l.renderVals()).key).toBe('tp-sigils');
  });
  it('a tab the character gets later is appended at the end: no other tab moves', () => {
    _resetTabPrefsCache(); fight('TABS-C');
    const ids0 = tabsOf(screen().renderVals());
    // as if Sigils had come later: the kept order lacks it, and the action list puts it before Faith and Calls
    saveTabPrefs(key(), { order: ids0.filter((x: string) => x !== 'sigils'), hidden: [], custom: false });
    const ids = tabsOf(screen().renderVals());
    expect(ids[ids.length - 1]).toBe('sigils');
    expect(ids.slice(0, -1)).toEqual(ids0.filter((x: string) => x !== 'sigils'));
  });
});

describe('the focus rule on a focus door\'s tab (the Sigils tab and the Evoker)', () => {
  const evokerAt = () => { const c: any = (G.characters as any)[pc().charId]; return FOCUS_IDS.evoker.includes(c.weapon) ? 'main' : FOCUS_IDS.evoker.includes(c.offHand?.id) ? 'off' : null; };
  it('in hand: the tab shows, no focus line', () => {
    _resetTabPrefsCache(); fight('TABS-D'); expect(evokerAt()).not.toBeNull();
    const l = screen(); l.renderVals(); l.setTab('sigils'); const v = l.renderVals();
    expect(tabsOf(v)).toContain('sigils'); expect(TP(v)).toMatchObject({ key: 'tp-sigils', hasFocusLine: false });
  });
  it('in the pack (a real stow): the tab shows, and its top line is the door\'s focus line from data', () => {
    _resetTabPrefsCache(); const { u } = fight('TABS-E');
    doAct({ type: 'combat/stow', unitId: u.id, slot: evokerAt() });
    const c: any = (G.characters as any)[pc().charId];
    expect(packOf(c).some((it: any) => FOCUS_IDS.evoker.includes(it.weapon || it.item || it.id))).toBe(true);
    const l = screen(); l.renderVals(); l.setTab('sigils'); const v = l.renderVals();
    expect(tabsOf(v)).toContain('sigils');
    expect(TP(v)).toMatchObject({ key: 'tp-sigils', hasFocusLine: true, focusLine: (SKILL.brain_power as any).door_focus_line });
    expect(String((SKILL.brain_power as any).door_focus_line)).toMatch(/Evoker/);
  });
  it('none anywhere (a real drop: the Evoker onto the tile): the tab is not shown', () => {
    _resetTabPrefsCache(); const { u } = fight('TABS-F');
    doAct({ type: 'combat/drop', unitId: u.id, slot: evokerAt() });
    const c: any = (G.characters as any)[pc().charId];
    expect(evokerAt()).toBeNull(); expect(packOf(c).some((it: any) => FOCUS_IDS.evoker.includes(it.weapon || it.item || it.id))).toBe(false);
    const v = screen().renderVals();
    expect(tabsOf(v)).not.toContain('sigils');
    expect(tabsOf(v)).toContain('attack');
  });
});
