// @vitest-environment jsdom
// The combat screen (combat feel v1): Fan the Hammer from pick to the end of its volley, rendered for real with the
// effects layer and the turn intro mounted; the your-turn panel and the waiting card; the attack's red reach and the
// odds chip; spent AP draining; the initiative strip turning over; the turn intro's command tiles selecting an action.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const errors: string[] = [];
const origErr = console.error;
console.error = (...a: any[]) => { const t = a.map(String).join(' '); if (!/not wrapped in act|act\(\.\.\.\)/.test(t)) errors.push(t); };
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const { FxLayer } = await import('../game/fx/FxLayer'); const { TurnIntro } = await import('../game/turnIntro');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function fight(seed: string, weapon = 'drifter_revolver') {
  snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).weapon = weapon;
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } });
  return c;
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(React.Fragment, null, React.createElement(Screen as any, { tick: st }),
    React.createElement(FxLayer, { game: st.game, screen: 'combat' }), React.createElement(TurnIntro as any, { game: st.game, meId: ME, screen: 'combat' }));
}
const buttons = (el: HTMLElement, re: RegExp) => Array.from(el.querySelectorAll('button')).filter((b) => re.test(b.textContent || '') && !b.closest('[aria-hidden="true"]'));

describe('combat screen', () => {
  it('Fan the Hammer: pick it, hover and click a hostile, confirm; the volley resolves and the screen keeps working', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    let fans = 0;
    for (const seed of ['fan-a', 'fan-b', 'fan-c', 'fan-d']) {
      fight(seed);
      await React.act(async () => { root.render(React.createElement(App, { key: seed })); });
      await React.act(async () => { vi.advanceTimersByTime(4000); });
      for (let i = 0; i < 8 && G.combat && !G.combat.over; i++) {
        const u = active(G.combat)!; if (u.side !== 'pc') break;
        expect(el.textContent).toContain('YOUR TURN');
        const pick = buttons(el, /Fan the Hammer/)[0]; expect(pick).toBeTruthy();
        await React.act(async () => { pick.click(); });
        const foe = G.combat.units.find((t) => t.side === 'foe' && !t.dead)!;
        const tile = Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').includes(foe.name)) as HTMLElement | undefined;
        if (tile) await React.act(async () => { tile.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); tile.click(); });
        const n0 = G.combat.log.length;
        const conf = buttons(el, /^Confirm$/)[0];
        await React.act(async () => { conf.click(); });
        if (G.combat.log.slice(n0).some((l) => /uses Fan the Hammer/.test(l))) fans++;
        expect(G.combat.log.some((l) => /NaN|undefined/.test(l))).toBe(false);
        await React.act(async () => { vi.advanceTimersByTime(5000); });
        expect(el.querySelector('pre')).toBeNull(); // the screen's error view never shows
        try { doAct({ type: 'combat/reload', unitId: u.id }); } catch { /* full or nothing to load */ }
        await React.act(async () => { vi.advanceTimersByTime(2500); });
        if (G.combat.over) break;
        try { doAct({ type: 'combat/end-turn', unitId: active(G.combat)!.id }); } catch { /* */ }
        await React.act(async () => { vi.advanceTimersByTime(8000); });
      }
    }
    await React.act(async () => { root.unmount(); });
    vi.useRealTimers();
    expect(fans).toBeGreaterThan(2);
    expect(errors).toEqual([]);
  }, 60000);

  it('your turn: the YOUR TURN panel, the red reach of a shot, the odds chip, AP draining; then the waiting card', () => {
    fight('panel', 'service_pistol');
    const L = new CombatLogic({}) as any;
    let r = L.renderVals();
    expect(r.turnPanels[0]).toMatchObject({ mine: true, waiting: false, cls: 'phc-a-right' });
    expect(r.turnPanels[0].ytSub).toMatch(/^ROUND \d+ · \d+ AP$/);
    expect(r.initiative[0]).toMatchObject({ tag: 'NOW', key: active(G.combat!)!.id });
    // Move: the reachable tiles as a white overlay; Shot: the weapon's reach in red.
    expect(r.tiles.filter((t: any) => t.hasPlan && /231, 235, 243/.test(t.planStyle)).length).toBeGreaterThan(0);
    L.setState({ action: 'shot' }); r = L.renderVals();
    const reach = r.tiles.filter((t: any) => t.hasPlan && /246, 81, 87/.test(t.planStyle));
    expect(reach.length).toBeGreaterThan(8);
    const foe = G.combat!.units.find((u) => u.side === 'foe' && !u.dead)!;
    L.setState({ hover: foe.pos }); r = L.renderVals();
    const chip = r.tiles.find((t: any) => t.key === foe.pos);
    if (chip.t) expect(chip.cost).toMatch(/^(HIT \d+% · \d+ AP|[A-Z’' ]+)$/);
    // Spending AP drains pips (keyed afresh so the animation plays once).
    const u = active(G.combat!)!;
    L.setState({ action: 'move', hover: null }); r = L.renderVals();
    const step = r.tiles.find((t: any) => t.isTile && t.hasPlan && /231, 235, 243/.test(t.planStyle));
    doAct({ type: 'combat/move', unitId: u.id, to: step.key, how: 'move' });
    r = L.renderVals();
    expect(active(G.combat!)!.ap).toBeLessThan(6);
    expect(r.turnPanels[0].apPips.some((p: any) => p.cls === 'phc-pip-drain' && /-\d+$/.test(p.key))).toBe(true);
    // End the turn: the YOUR TURN panel leaves (marked closing, hidden from assistive tech) while the next one arrives.
    doAct({ type: 'combat/end-turn', unitId: u.id });
    r = L.renderVals();
    if (!G.combat!.over && active(G.combat!)!.side === 'pc') expect(r.turnPanels[0].mine).toBe(true);
    else expect(r.turnPanels[0].waiting).toBe(true);
  });

  it('action tabs: one per family with its count, a default on your turn, the tab follows the action, keys, remembered per character', () => {
    fight('tabs', 'service_pistol');
    const L = new CombatLogic({}) as any;
    const sel = (r: any) => r.turnPanels[0].tabs.find((t: any) => t.selected === 'true')?.key;
    let r = L.renderVals();
    const T = r.turnPanels[0];
    expect(T.tabs.map((t: any) => t.key)).toEqual(['move', 'attack', 'utility']);
    expect(T.tabs.every((t: any) => t.count === r.groups.find((g: any) => g.id === t.key).items.length && t.count > 0)).toBe(true);
    expect(T.tabs.filter((t: any) => t.tabindex === '0').length).toBe(1);
    // Default: Attack with a hostile in sight, else Move.
    expect(['attack', 'move']).toContain(sel(r));
    expect(T.tabPanel).toHaveLength(1);
    expect(T.tabPanel[0].items.map((a: any) => a.key)).toEqual(r.groups.find((g: any) => g.id === sel(r)).items.map((a: any) => a.key));
    // Picking an action anywhere opens its tab; flipping tabs keeps the chosen action (the footer still shows it).
    L.setState({ action: 'reload' }); r = L.renderVals(); expect(sel(r)).toBe('utility');
    L.setTab('move'); r = L.renderVals(); expect(sel(r)).toBe('move'); expect(r.turnPanels[0].sel.name).toMatch(/^Reload/);
    expect(r.turnPanels[0].tabs.find((t: any) => t.key === 'utility').holds).toBe(true);
    L.pickAction('shot'); r = L.renderVals(); expect(sel(r)).toBe('attack');
    L.setTab('utility'); L.pickAction('shot'); r = L.renderVals(); expect(sel(r)).toBe('attack'); // the same action again still opens its tab
    // Keys: 1–6 anywhere (not while typing), arrows / Home / End in the tab bar.
    const key = (k: string, target: any = document.body) => ({ key: k, target, preventDefault() {}, defaultPrevented: false });
    L.numKey(key('1')); r = L.renderVals(); expect(sel(r)).toBe('move');
    L.numKey(key('3', document.createElement('input'))); r = L.renderVals(); expect(sel(r)).toBe('move');
    L.tabKey(key('ArrowRight')); r = L.renderVals(); expect(sel(r)).toBe('attack');
    L.tabKey(key('End')); r = L.renderVals(); expect(sel(r)).toBe('utility');
    L.tabKey(key('ArrowRight')); r = L.renderVals(); expect(sel(r)).toBe('move'); // wraps
    // A number key pressed on a button inside the tab panel (which is about to be replaced) moves focus to the new tab.
    const tabEl = document.createElement('button'); tabEl.id = 'phc-tab-attack'; tabEl.setAttribute('role', 'tab');
    const panel = document.createElement('div'); panel.className = 'phc-cb-tabpanel'; const inside = document.createElement('button'); panel.appendChild(inside);
    document.body.append(tabEl, panel); inside.focus();
    L.numKey(key('2', inside)); r = L.renderVals(); expect(sel(r)).toBe('attack'); expect(document.activeElement).toBe(tabEl);
    tabEl.remove(); panel.remove();
    L.setTab('move'); r = L.renderVals();
    // Remembered for this character: a fresh turn (a new screen) opens the last tab used.
    L.setTab('utility'); r = L.renderVals();
    const L2 = new CombatLogic({}) as any; expect(sel(L2.renderVals())).toBe('utility');
  });

  it('a command tile on the your-turn card selects that action here', () => {
    fight('cmd', 'service_pistol');
    const L = new CombatLogic({}) as any; L.renderVals();
    const u = active(G.combat!)!;
    L.pickAction('reload', u.id); expect(L.state.action).toBe('reload');
    L.pickAction('shot', 'someone-else'); expect(L.state.action).toBe('reload');
    L.pickAction('no-such-action', u.id); expect(L.state.action).toBe('reload');
    L.pickAction('shot', u.id); expect(L.state.action).toBe('shot');
  });

  it('the Say row is pinned: outside the scrolling You card and the tab panel, right above the turn box, on every turn', async () => {
    vi.useFakeTimers();
    fight('say-pin', 'service_pistol');
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(4000); });
    const say = el.querySelector('form.phc-cb-say') as HTMLElement;
    expect(say).toBeTruthy();
    expect(say.closest('.phc-cb-top')).toBeNull();
    expect(say.closest('.phc-cb-tabpanel')).toBeNull();
    expect(say.parentElement!.classList.contains('phc-cb-aside')).toBe(true);
    expect(say.nextElementSibling!.classList.contains('phc-cb-turnbox')).toBe(true);
    expect(say.style.position).toBe('sticky');
    // On your turn the column is marked (its You card is capped) and the turn box takes the room under the Say row.
    if (active(G.combat!)!.side === 'pc') {
      expect(el.querySelector('.phc-cb-aside')!.classList.contains('phc-mine')).toBe(true);
      expect((el.querySelector('.phc-cb-turnbox') as HTMLElement).style.flex).toMatch(/^1 1 0/);
      // The dock's copy (shown on narrow windows) and the compact You line (short windows) are there for the CSS to use.
      expect(el.querySelector('.phc-cb-dock form.phc-cb-say2')).toBeTruthy();
      expect(el.querySelector('.phc-cb-bar .phc-me-mini')).toBeTruthy();
    }
    // Saying something: Enter (submit) or the button, then the box clears.
    const input = say.querySelector('input') as HTMLInputElement;
    const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await React.act(async () => { setVal.call(input, 'I shout for them to drop it'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await React.act(async () => { say.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(G.combat!.log.some((l) => /drop it/.test(l))).toBe(true);
    await React.act(async () => { root.unmount(); });
    el.remove(); vi.useRealTimers();
  });

  it('hide the panel: the map takes the room, a mini-bar keeps the turn playable, keys 1–4 pick its commands, H brings it back', () => {
    fight('hide', 'service_pistol');
    const L = new CombatLogic({}) as any;
    let r = L.renderVals();
    expect(r).toMatchObject({ panelOpen: true, panelHidden: false });
    expect(r.mini.show).toBe(false);
    L.togglePanel(true); r = L.renderVals();
    expect(localStorage.getItem('phc.combatPanel')).toBe('hidden');
    expect(r).toMatchObject({ panelOpen: false, panelHidden: true });
    expect(r.leftStyle).toMatch(/^flex: 1 1 auto/);
    if (!r.notMine) {
      expect(r.mini.show).toBe(true);
      expect(r.mini.cmds.map((c: any) => c.key)).toEqual(['1', '2', '3', '4']);
      expect(r.mini.cmds[1].action).toBe('move');
      expect(r.mini.pips.length).toBe(r.apPips.length);
      const key = (k: string, target: any = document.body) => ({ key: k, target, preventDefault() {}, defaultPrevented: false });
      const third = r.mini.cmds[2];
      L.numKey(key('3')); r = L.renderVals();
      if (!third.off) expect(L.state.action).toBe(third.action === 'shot' ? 'shot' : third.action);
      L.numKey(key('2')); r = L.renderVals(); expect(L.state.action).toBe('move');
      expect(r.mini.cmds[1].pressed).toBe('true');
      // H toggles, but not while typing.
      L.panelKey(key('h', document.createElement('input'))); expect(L.renderVals().panelHidden).toBe(true);
      L.panelKey(key('H')); r = L.renderVals();
      expect(r.panelOpen).toBe(true); expect(localStorage.getItem('phc.combatPanel')).toBe('shown');
      L.panelKey(key('\\')); expect(L.renderVals().panelHidden).toBe(true);
    }
    L.togglePanel(false); expect(L.renderVals().panelOpen).toBe(true);
  });

  it('customise the turn card: the panel\'s Customise opens the dialog, a pick and Save change the four commands', async () => {
    vi.useFakeTimers();
    const c = fight('custom', 'service_pistol');
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(4000); });
    const open = buttons(el, /Customise/).find((b) => b.classList.contains('phc-cb-link'))!;
    expect(open).toBeTruthy();
    await React.act(async () => { open.click(); });
    const dlg = document.querySelector('[data-phc-cmds-dialog]') as HTMLElement;
    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dlg.querySelector('[data-slot="1"]'));
    // Every panel action is on offer (the weapon's tabs: Move, Attack, Utility).
    for (const a of ['move', 'sprint', 'shot', 'aimed', 'overwatch', 'reload', 'analyze']) expect(dlg.querySelector('[data-cmd="' + a + '"]')).toBeTruthy();
    // Slot 1 ← Overwatch, then slot 2 (it moves on by itself) ← Analyze; then swap them with the arrows.
    await React.act(async () => { (dlg.querySelector('[data-cmd="overwatch"]') as HTMLElement).click(); });
    await React.act(async () => { (dlg.querySelector('[data-cmd="analyze"]') as HTMLElement).click(); });
    await React.act(async () => { (dlg.querySelector('[aria-label="Move slot 2 left"]') as HTMLElement).click(); });
    const save = Array.from(dlg.querySelectorAll('button')).find((b) => b.textContent === 'Save')!;
    await React.act(async () => { save.click(); });
    expect(document.querySelector('[data-phc-cmds-dialog]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('phc.cutinCmds') || '{}')['ROOM:' + c.id]).toEqual(['analyze', 'overwatch', null, null]);
    const L = new CombatLogic({}) as any; L.togglePanel(true);
    const r = L.renderVals();
    if (!r.notMine) expect(r.mini.cmds.slice(0, 2).map((x: any) => x.action)).toEqual(['analyze', 'overwatch']);
    L.togglePanel(false);
    // Reset to smart default, saved: the preference is gone.
    await React.act(async () => { window.dispatchEvent(new CustomEvent('phc:customise-cmds', { detail: { charId: c.id } })); });
    const dlg2 = document.querySelector('[data-phc-cmds-dialog]') as HTMLElement;
    await React.act(async () => { Array.from(dlg2.querySelectorAll('button')).find((b) => /Reset to smart/.test(b.textContent || ''))!.click(); });
    await React.act(async () => { Array.from(dlg2.querySelectorAll('button')).find((b) => b.textContent === 'Save')!.click(); });
    expect(JSON.parse(localStorage.getItem('phc.cutinCmds') || '{}')['ROOM:' + c.id]).toBeUndefined();
    // The preview: Reload in slot 1 keeps the smart default's other commands, in order (Shoot is not pushed off).
    await React.act(async () => { window.dispatchEvent(new CustomEvent('phc:customise-cmds', { detail: { charId: c.id } })); });
    const dlgR = document.querySelector('[data-phc-cmds-dialog]') as HTMLElement;
    const slotNames = () => [1, 2, 3, 4].map((i) => (dlgR.querySelector('[data-slot="' + i + '"]')!.textContent || '').replace(/^\d/, ''));
    expect(slotNames().map((t) => t.replace(/SMART.*$/, ''))).toEqual(['Shoot', 'Move', 'Swap magazine', 'Overwatch']);
    await React.act(async () => { (dlgR.querySelector('[data-cmd="reload"]') as HTMLElement).click(); });
    expect(slotNames().map((t) => t.replace(/Not now.*$/, ''))).toEqual(['Swap magazineYOUR PICK', 'ShootSMART', 'MoveSMART', 'OverwatchSMART']);
    await React.act(async () => { Array.from(dlgR.querySelectorAll('button')).find((b) => b.textContent === 'Cancel')!.click(); });
    expect(document.querySelector('[data-phc-cmds-dialog]')).toBeNull();
    // Escape closes without saving.
    await React.act(async () => { window.dispatchEvent(new CustomEvent('phc:customise-cmds', { detail: { charId: c.id } })); });
    const dlg3 = document.querySelector('[data-phc-cmds-dialog]') as HTMLElement;
    await React.act(async () => { (dlg3.querySelector('[data-cmd="sprint"]') as HTMLElement).click(); });
    await React.act(async () => { dlg3.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('[data-phc-cmds-dialog]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('phc.cutinCmds') || '{}')['ROOM:' + c.id]).toBeUndefined();
    await React.act(async () => { root.unmount(); });
    el.remove(); vi.useRealTimers();
    expect(errors).toEqual([]);
  });
  it('a dry run (the UI asking the engine for costs and reasons) never adds effects to the real fight', async () => {
    // A glyph keyboard preview used to push 'draw' effects into the live fight's list (same array), all with one
    // number, which stalled the next turn card for ~6 s.
    const { _dryRun } = await import('./combat.js');
    const cb: any = { units: [{ id: 'u1', saves: {}, conds: {}, mg: null }], fx: [{ n: 1, k: 'turn' }], fxSeq: 1, glyphs: [], zones: [] };
    const r = _dryRun(cb, 'u1', (c: any) => { (c.fx ||= []).push({ n: (c.fxSeq = (c.fxSeq || 0) + 1), k: 'draw' }); return null; });
    expect(r.err).toBeNull();
    expect(cb.fx).toEqual([{ n: 1, k: 'turn' }]);
    expect(cb.fxSeq).toBe(1);
  });
});

describe('the Perks tab on the combat screen (plan 3)', () => {
  it('a perk holder gets a Perks tab; picking Shrug It Off and confirming sends combat/perk and the engine runs it', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'perk-tab');
    doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).perks = [{ id: 'shrug_it_off', tier: 'II' }];
    doAct({ type: 'narrator/turn', turn: { narration: 'Brace.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol', at: 'P11' }] } } } as any);
    // Make it the PC's turn whatever initiative said (the enemy may have gone first).
    for (let i = 0; i < 4 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id } as any);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(4000); });
    const u = active(G.combat!)!; expect(u.side).toBe('pc');
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; expect(tab).toBeTruthy();
    await React.act(async () => { tab.click(); });
    const pick = buttons(el, /Shrug It Off/)[0]; expect(pick).toBeTruthy();
    await React.act(async () => { pick.click(); });
    const conf = buttons(el, /^Confirm$/)[0];
    await React.act(async () => { conf.click(); });
    expect(G.combat!.log.some((l) => /uses Shrug It Off/.test(l))).toBe(true);
    expect(G.combat!.units.find((x) => x.id === u.id)!.shield).toBeGreaterThan(0);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
});
