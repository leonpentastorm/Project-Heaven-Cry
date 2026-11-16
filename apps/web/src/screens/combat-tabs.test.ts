// The fight tabs on the combat screen (Leon, 16 Nov 2026; game/tabPrefs.ts, game/doorView.ts tabFocus): the
// character's own order and hidden tabs drive the bar and the number keys; a tab new to the character is appended
// without moving the others; the focus rule for a focus door's tab (in hand, in the pack, none anywhere). Through the
// real screen and real actions.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, packOf, magicOf, FOCUS_IDS, SKILL, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { focusFilter } = await import('../game/doorView');
const { loadTabPrefs, saveTabPrefs, moveTab, setHidden, tabKey, liveTabs, _resetTabPrefsCache } = await import('../game/tabPrefs');

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
const key = () => tabKey(pc().charId);
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
  it('arranged: a tab the character gets later is appended at the end, no other tab moves', () => {
    _resetTabPrefsCache(); fight('TABS-C');
    const ids0 = tabsOf(screen().renderVals());
    // as if Sigils had come later: the kept order lacks it, and the action list puts it before Faith and Calls
    saveTabPrefs(key(), { order: ids0.filter((x: string) => x !== 'sigils'), hidden: [], custom: true });
    const ids = tabsOf(screen().renderVals());
    expect(ids[ids.length - 1]).toBe('sigils');
    expect(ids.slice(0, -1)).toEqual(ids0.filter((x: string) => x !== 'sigils'));
  });
  it('not arranged: a tab the character gets later takes its natural place (the default order does not drift)', () => {
    _resetTabPrefsCache(); fight('TABS-C2');
    const ids0 = tabsOf(screen().renderVals());
    saveTabPrefs(key(), { order: ids0.filter((x: string) => x !== 'sigils'), hidden: [], custom: false });
    expect(tabsOf(screen().renderVals())).toEqual(ids0);
  });
  it('the prefs follow the character into another room; the cog live record numbers what the bar shows', () => {
    _resetTabPrefsCache(); fight('TABS-R1');
    screen().renderVals(); let p = loadTabPrefs(key()); for (let i = 0; i < p.order.length; i++) p = moveTab(p, 'sigils', -1); saveTabPrefs(key(), p);
    const id1 = pc().charId; fight('TABS-R2');
    expect(pc().charId).toBe(id1); // the same character id (one per player), another room code
    const v = screen().renderVals(); expect(tabsOf(v)[0]).toBe('sigils');
    expect(liveTabs(key())!.shown).toEqual(tabsOf(v));
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
  it('none anywhere (a real drop: the Evoker onto the tile): the tab goes only when the engine refuses every row on it', () => {
    _resetTabPrefsCache(); const { u } = fight('TABS-F');
    doAct({ type: 'combat/drop', unitId: u.id, slot: evokerAt() });
    const c: any = (G.characters as any)[pc().charId];
    expect(evokerAt()).toBeNull(); expect(packOf(c).some((it: any) => FOCUS_IDS.evoker.includes(it.weapon || it.item || it.id))).toBe(false);
    // Draw, Evoke, Vent and Swap core are refused, but the engine still offers Scuff: the tab stays, Scuff usable on it
    const l = screen(), v = l.renderVals(), ids = tabsOf(v);
    expect(ids).toContain('sigils'); expect(l._tabItems[ids.indexOf('sigils')]).toContain('scuff');
    // every row refused (the rule itself, on this character): the tab is left out; any one usable row keeps it
    const R = (why: string | null) => ({ key: 'r' + Math.random(), why });
    const gs = [{ id: 'sigils', items: [R('No.'), R('No.')] }, { id: 'attack', items: [R('No.')] }];
    expect(focusFilter(c, gs, (g) => g.id, (g) => g.items.every((x) => !!x.why)).map((g) => g.id)).toEqual(['attack']);
    gs[0].items.push(R(null));
    expect(focusFilter(c, gs, (g) => g.id, (g) => g.items.every((x) => !!x.why)).map((g) => g.id)).toEqual(['sigils', 'attack']);
  });
});

describe('the focus rule never strands held work (the Outbursts tab with no Emanator anywhere)', () => {
  function soulNoFocus(room: string) {
    const { u } = fight(room); const c: any = (G.characters as any)[u.charId];
    // no Emanator anywhere (hands and pack), and two designs: Begun with no Emanator, it draws on the air
    const ema = (id: any) => FOCUS_IDS.emanator.includes(id);
    if (ema(c.weapon)) c.weapon = 'fists'; if (c.offHand && ema(c.offHand.id)) c.offHand = null;
    if (Array.isArray(c.pack)) c.pack = c.pack.filter((x: any) => !ema(x.item || x.id));
    c.outbursts = [{ id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] }]; c.soulKnown = { schools: ['damage'], modules: [], tones: [] };
    const un: any = (G.combat as any).units.find((x: any) => x.id === u.id); un.mg = magicOf(c); un.ap = 9; snap = view();
    expect(un.mg.emanator).toBe(false);
    return un;
  }
  it('Begin with no Emanator, Pump to stage 4: the Outbursts tab and its Release row stay (Pump refused, Release allowed)', () => {
    _resetTabPrefsCache(); const u = soulNoFocus('TABS-H');
    doAct({ type: 'combat/outburst', unitId: u.id, design: 'sb', hold: true });
    for (let i = 0; i < 4; i++) { (G.combat as any).units.find((x: any) => x.id === u.id).ap = 9; doAct({ type: 'combat/pump', unitId: u.id }); }
    const held = (G.combat as any).units.find((x: any) => x.id === u.id).mg.held; expect(held.stage).toBe(4);
    const l = screen(); const v = l.renderVals();
    expect(tabsOf(v)).toContain('outbursts'); expect(TP(v).key).toBe('tp-outbursts'); // the turn opens on the heart
    const keys = l._tabItems[tabsOf(v).indexOf('outbursts')];
    expect(keys).toContain('release'); expect(keys).toContain('letgo');
  });
  it('a hidden Outbursts tab shows while an Outburst is held', () => {
    _resetTabPrefsCache(); const u = soulNoFocus('TABS-H2');
    screen().renderVals(); saveTabPrefs(key(), setHidden(loadTabPrefs(key()), 'outbursts', true));
    expect(tabsOf(screen().renderVals())).not.toContain('outbursts');
    doAct({ type: 'combat/outburst', unitId: u.id, design: 'sb', hold: true });
    expect(tabsOf(screen().renderVals())).toContain('outbursts');
  });
});
