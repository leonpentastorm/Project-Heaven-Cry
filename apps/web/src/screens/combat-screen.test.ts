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
  // Physical 2.0 (rules 1.12): the old weapon-skill row (Fan the Hammer) is gone; the weapon's plain attack is the Shot
  // technique, picked from its row in the weapon's block and sent as combat/technique.
  it('a Shot (Physical 2.0): pick it, hover and click a hostile, confirm; the technique resolves and the screen keeps working', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    let fans = 0;
    for (const seed of ['fan-a', 'fan-b', 'fan-c', 'fan-d']) {
      fight(seed);
      await React.act(async () => { root.render(React.createElement(App, { key: seed })); });
      await React.act(async () => { vi.advanceTimersByTime(15000); });
      for (let i = 0; i < 8 && G.combat && !G.combat.over; i++) {
        const u = active(G.combat)!; if (u.side !== 'pc') break;
        expect(el.textContent).toContain('YOUR TURN');
        const pick = buttons(el, /^Shot/)[0]; expect(pick).toBeTruthy();
        await React.act(async () => { pick.click(); });
        const foe = G.combat.units.find((t) => t.side === 'foe' && !t.dead)!;
        const tile = Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').includes(foe.name)) as HTMLElement | undefined;
        if (tile) await React.act(async () => { tile.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); tile.click(); });
        const n0 = G.combat.log.length;
        const conf = buttons(el, /^Confirm$/)[0];
        await React.act(async () => { conf.click(); });
        if (G.combat.log.slice(n0).some((l) => /uses Shot/.test(l))) fans++;
        expect(G.combat.log.some((l) => /NaN|undefined/.test(l))).toBe(false);
        await React.act(async () => { vi.advanceTimersByTime(20000); });
        expect(el.querySelector('pre')).toBeNull(); // the screen's error view never shows
        try { doAct({ type: 'combat/reload', unitId: u.id }); } catch { /* full or nothing to load */ }
        await React.act(async () => { vi.advanceTimersByTime(2500); });
        if (G.combat.over) break;
        await React.act(async () => { try { doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id }); } catch { /* */ } });
        // the hostiles' moves play in full before the turn is yours on screen (11 Nov 2026): give them their time
        await React.act(async () => { vi.advanceTimersByTime(40000); });
        await React.act(async () => { vi.advanceTimersByTime(5000); });
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
    L.setState({ action: 'reload' }); r = L.renderVals(); expect(sel(r)).toBe('attack'); // a gun's reload is on the Attack tab since 0.18.1
    L.setTab('move'); r = L.renderVals(); expect(sel(r)).toBe('move'); expect(r.turnPanels[0].sel.name).toMatch(/^Reload/);
    expect(r.turnPanels[0].tabs.find((t: any) => t.key === 'attack').holds).toBe(true);
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
    L._chord = null; // (a second number inside a second is a two-key code; this press is a lone one)
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
    // A pick saved before techniques (the old 'shot') lands on today's row: the weapon's plain Shot technique.
    L.pickAction('shot', u.id); expect(L.state.action).toBe('tq:main:shot');
  });

  it('the Say row is pinned: outside the scrolling You card and the tab panel, right above the turn box, on every turn', async () => {
    vi.useFakeTimers();
    fight('say-pin', 'service_pistol');
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
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
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const open = buttons(el, /Customise/).find((b) => b.classList.contains('phc-cb-link'))!;
    expect(open).toBeTruthy();
    await React.act(async () => { open.click(); });
    const dlg = document.querySelector('[data-phc-cmds-dialog]') as HTMLElement;
    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dlg.querySelector('[data-slot="1"]'));
    // Every panel action is on offer (the weapon's tabs: Move, Attack, Utility). Physical 2.0: the Attack tab's rows are
    // the weapon's plain Shot, its Techniques and Hold a shot.
    for (const a of ['move', 'sprint', 'tq:main:shot', 'tpad:main', 'twatch', 'reload', 'analyze']) expect(dlg.querySelector('[data-cmd="' + a + '"]')).toBeTruthy();
    // Slot 1 ← Hold a shot, then slot 2 (it moves on by itself) ← Analyze; then swap them with the arrows.
    await React.act(async () => { (dlg.querySelector('[data-cmd="twatch"]') as HTMLElement).click(); });
    await React.act(async () => { (dlg.querySelector('[data-cmd="analyze"]') as HTMLElement).click(); });
    await React.act(async () => { (dlg.querySelector('[aria-label="Move slot 2 left"]') as HTMLElement).click(); });
    const save = Array.from(dlg.querySelectorAll('button')).find((b) => b.textContent === 'Save')!;
    await React.act(async () => { save.click(); });
    expect(document.querySelector('[data-phc-cmds-dialog]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('phc.cutinCmds') || '{}')['ROOM:' + c.id]).toEqual(['analyze', 'twatch', null, null]);
    const L = new CombatLogic({}) as any; L.togglePanel(true);
    const r = L.renderVals();
    if (!r.notMine) expect(r.mini.cmds.slice(0, 2).map((x: any) => x.action)).toEqual(['analyze', 'twatch']);
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
    expect(slotNames().map((t) => t.replace(/SMART.*$/, ''))).toEqual(['Shoot', 'Move', 'Reload (speed)', 'Hold a shot']);
    await React.act(async () => { (dlgR.querySelector('[data-cmd="reload"]') as HTMLElement).click(); });
    expect(slotNames().map((t) => t.replace(/Not now.*$/, ''))).toEqual(['Reload (speed)YOUR PICK', 'ShootSMART', 'MoveSMART', 'Hold a shotSMART']);
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
    const before = JSON.stringify(cb);
    // (the dry run is the engine's now, preview.ts: it owns the copy; the game is the first argument)
    const r = _dryRun(null, cb, 'u1', (c: any, u: any) => { (c.fx ||= []).push({ n: (c.fxSeq = (c.fxSeq || 0) + 1), k: 'draw' }); u.conds.burning = 2; (u.uses ||= {}).x = { s: 'c', n: 1 }; return null; });
    expect(r.err).toBeNull(); expect(JSON.stringify(cb)).toBe(before); // nothing of the live fight is written: deeply equal
    expect(cb.fx).toEqual([{ n: 1, k: 'turn' }]);
    expect(cb.fxSeq).toBe(1);
  });
  it('rules 1.9 on the grid: a speed reload drops a pile (stack, count, hover, legend); the two reloads; Pick up\'s checklist sends the ticked', () => {
    fight('panel', 'service_pistol');
    const L = new CombatLogic({}) as any, u = active(G.combat!)!;
    expect(u.side).toBe('pc');
    G.combat!.units.find((x) => x.id === u.id)!.ammo = 5; G.combat!.units.find((x) => x.id === u.id)!.mags = [12, 9]; snap = view();
    let r = L.renderVals();
    const util = r.turnPanels[0].groups.find((gr: any) => gr.id === 'utility').items;
    const atk = r.turnPanels[0].groups.find((gr: any) => gr.id === 'attack').items.filter((i: any) => /^reload/.test(i.key)); // with the shots since 0.18.1
    expect(atk.slice(0, 2).map((i: any) => [i.key, i.name, i.cost])).toEqual([['reload', 'Reload (speed)', '2 AP · the magazine drops'], ['reload-tac', 'Reload (tactical)', '3 AP · the magazine goes in your pack']]);
    L.setState({ action: 'reload-tac' }); r = L.renderVals();
    expect(r.turnPanels[0].sel.text).toMatch(/tactical reload, 3 AP\. The magazine in the gun \(5 rounds\) goes back in your pack/);
    expect(r.turnPanels[0].apText).toMatch(/^3 \/ 6 after this/);
    // No pile yet: Pick up says why; no legend entry.
    expect(util.find((i: any) => i.key === 'pickup').why).toBe('Nothing on the ground next to you.');
    expect(r.worldLegend.some((l: any) => l.key === 'pile')).toBe(false);
    L.setState({ action: 'reload' }); r = L.renderVals();
    expect(r.turnPanels[0].sel.text).toMatch(/speed reload, 2 AP\. The magazine in the gun \(5 rounds\) drops into the pile on your tile/);
    doAct({ type: 'combat/reload', unitId: u.id });
    r = L.renderVals();
    const t = r.tiles.find((x: any) => x.key === u.pos);
    expect(t).toMatchObject({ hasPile: true, pileCount: '1', hasPileTip: false });
    expect(t.label).toContain('Pile at ');
    expect(t.label).toContain('Service pistol magazine 5/12');
    expect(r.worldLegend.find((l: any) => l.key === 'pile').text).toBe('Pile: things on the ground');
    L.setState({ hover: u.pos }); r = L.renderVals();
    expect(r.tiles.find((x: any) => x.key === u.pos)).toMatchObject({ hasPileTip: true, pileTip: expect.stringContaining('Service pistol magazine 5/12') });
    // Pick up: the pile in reach opens its checklist, everything ticked; untick one and the button and the action follow.
    const drop2 = G.combat!.objects!.find((o) => o.kind === 'pile')!; drop2.items!.push({ item: 'stim_injector', qty: 1, name: 'Stim injector', key: 'ex', pack: { id: 'stim_injector', item: 'stim_injector', name: 'Stim injector', qty: 1, kind: 'med' } } as any); snap = view();
    L.setState({ action: 'pickup', hover: null }); r = L.renderVals();
    const sel = r.turnPanels[0].sel;
    expect(sel.hasPile).toBe(true); expect(sel.pileRows.map((x: any) => [x.label, x.checked])).toEqual([['Service pistol magazine 5/12', true], ['Stim injector', true]]);
    expect(r.turnPanels[0].confirmText).toBe('Pick up everything · 1 AP'); expect(r.turnPanels[0].cantConfirm).toBe(false);
    sel.pileRows[1].toggle(); r = L.renderVals();
    expect(r.turnPanels[0].confirmText).toBe('Pick up 1 of 2 · 1 AP');
    const mags0 = active(G.combat!)!.mags!.length;
    L.confirm();
    expect(active(G.combat!)!.mags!.length).toBe(mags0 + 1);
    expect(G.combat!.objects!.find((o) => o.kind === 'pile')!.items!.map((e) => e.name)).toEqual(['Stim injector']);
    expect(G.combat!.log.at(-1)).toMatch(/picks up Service pistol magazine 5\/12/);
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
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const u = active(G.combat!)!; expect(u.side).toBe('pc');
    G.combat!.units.find((x) => x.id === u.id)!.prone = true; // Shrug It Off needs a Body debuff to remove (spec §14 item 101)
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; expect(tab).toBeTruthy();
    await React.act(async () => { tab.click(); });
    const pick = buttons(el, /Shrug It Off/)[0]; expect(pick).toBeTruthy();
    await React.act(async () => { pick.click(); });
    const conf = buttons(el, /^Confirm$/)[0];
    await React.act(async () => { conf.click(); });
    expect(G.combat!.log.some((l) => /shrugs off/.test(l))).toBe(true);
    expect(G.combat!.units.find((x) => x.id === u.id)!.shield).toBeGreaterThan(0);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
  it('a combat move that needs a pick is all chips: The Voice\'s orders, the engine\'s verdict, Confirm; no typed detail field', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'perk-voice');
    doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).perks = [{ id: 'the_voice', tier: 'I' }];
    doAct({ type: 'narrator/turn', turn: { narration: 'Halt.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol', at: 'D4' }] } } } as any);
    for (let i = 0; i < 4 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id } as any);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; await React.act(async () => { tab.click(); });
    await React.act(async () => { buttons(el, /The Voice/)[0].click(); });
    expect(el.querySelector('.phc-pk-detail')).toBeNull();
    const group = el.querySelector('.phc-cb-pick') as HTMLElement; expect(group).toBeTruthy();
    expect(group.textContent).toMatch(/The order/);
    const conf = () => buttons(el, /^Confirm$/)[0] as HTMLButtonElement;
    expect(conf().disabled).toBe(true); expect(el.querySelector('.phc-cb-seltext')!.textContent).toMatch(/Pick the order/);
    // "Something else" needs words: the box asks for them; Kneel is one click.
    await React.act(async () => { buttons(group, /^Something else$/)[0].click(); });
    expect(conf().disabled).toBe(true); expect(el.querySelector('.phc-cb-seltext')!.textContent).toMatch(/Write the order you give/);
    await React.act(async () => { buttons(group, /^Kneel$/)[0].click(); });
    expect(buttons(group, /^Kneel$/)[0].getAttribute('aria-pressed')).toBe('true');
    expect(conf().disabled).toBe(false);
    await React.act(async () => { conf().click(); });
    expect(G.combat!.log.some((l) => /gives an order \(The Voice: kneel\)/.test(l))).toBe(true);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });

  // Rules 1.14, "The perk card in a fight": the Perks tab shows three shelves and nothing that can't be used.
  it('the Perks tab shows three shelves in order: Use now as buttons, Rides an action and Always on as lists to read; the badge counts only the actions', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'perk-shelves');
    doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c = Object.values(G.characters)[0];
    (G.characters[c.id] as any).perks = [{ id: 'shrug_it_off', tier: 'II' }, { id: 'running_reload', tier: 'I' }, { id: 'used_to_the_pain', tier: 'I' }, { id: 'cultured', tier: 'achieved' }];
    doAct({ type: 'narrator/turn', turn: { narration: 'Brace.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol', at: 'P11' }] } } } as any);
    for (let i = 0; i < 4 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id } as any);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; expect(tab).toBeTruthy();
    // the badge and the tab's label count Use now only
    expect(tab.textContent).toMatch(/Perks\s*1$/); expect(tab.getAttribute('aria-label')).toMatch(/^Perks, 1 action, 2 to read/);
    await React.act(async () => { tab.click(); });
    const panel = el.querySelector('#phc-tabpanel') as HTMLElement;
    // three labelled shelves, in that order
    expect(Array.from(panel.querySelectorAll('[data-shelf]')).map((x) => x.getAttribute('data-shelf'))).toEqual(['use', 'rides', 'always']);
    expect((panel.querySelector('[data-shelf="use"]') as HTMLElement).textContent).toBe('USE NOW');
    expect((panel.querySelector('[data-shelf="rides"] > span') as HTMLElement).textContent).toBe('RIDES AN ACTION');
    expect((panel.querySelector('[data-shelf="always"] > span') as HTMLElement).textContent).toBe('ALWAYS ON');
    // Use now is the buttons players press, as before
    const use = Array.from(panel.querySelectorAll('button.phc-cb-act[data-act^="pk:"]'));
    expect(use.map((b) => b.getAttribute('data-act'))).toEqual(['pk:perk:shrug_it_off#shrug_it_off']);
    // the other two are lists of rows, not action buttons: a name and one line
    const rides = panel.querySelector('[data-shelf="rides"] ul[role="list"]') as HTMLElement, always = panel.querySelector('[data-shelf="always"] ul[role="list"]') as HTMLElement;
    expect(rides.getAttribute('aria-labelledby')).toBe('phc-shelf-rides'); expect(panel.querySelector('#phc-shelf-rides')!.textContent).toBe('RIDES AN ACTION');
    expect(Array.from(rides.querySelectorAll('li')).map((li) => li.getAttribute('data-perk-row'))).toEqual(['pki:perk:running_reload']);
    expect(Array.from(always.querySelectorAll('li')).map((li) => li.getAttribute('data-perk-row'))).toEqual(['pki:perk:used_to_the_pain']);
    expect(panel.querySelectorAll('li .phc-cb-act').length).toBe(0); expect(panel.querySelectorAll('li [aria-pressed]').length).toBe(0);
    // a perk that rides a move is listed with where its switch is; a passive shows a live line
    expect(rides.querySelector('[data-perk-line]')!.textContent).toBe('on a move');
    expect(always.querySelector('li')!.getAttribute('data-state')).toBe('waiting');
    expect(always.querySelector('[data-perk-line]')!.textContent).toBe('Waiting: the first time you are hit in each fight');
    // a story-only perk is not on the fight's card
    expect(panel.textContent).not.toMatch(/Cultured/);
    // picking a row opens its whole card to read, in the row and in the selection box, with no Confirm
    const rowBtn = always.querySelector('li button') as HTMLButtonElement; expect(rowBtn.getAttribute('aria-expanded')).toBe('false');
    await React.act(async () => { rowBtn.click(); });
    const open = el.querySelector('[data-perk-row="pki:perk:used_to_the_pain"]') as HTMLElement;
    expect(open.querySelector('button')!.getAttribute('aria-expanded')).toBe('true');
    expect(open.querySelector('[data-perk-text]')!.textContent).toMatch(/^Waiting: the first time you are hit in each fight\. It works by itself\. /);
    expect(el.querySelector('.phc-cb-seltext')!.textContent).toBe(open.querySelector('[data-perk-text]')!.textContent);
    expect(el.querySelector('.phc-cb-foot')!.textContent).toMatch(/Used to the Pain · ALWAYS ON/);
    const conf = Array.from(el.querySelectorAll('.phc-cb-foot button')).find((b) => /^Confirm$/.test(b.textContent || '')) as HTMLButtonElement;
    expect(conf.hidden).toBe(true);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
  it('an empty shelf doesn\'t show: a holder with only an action sees Use now alone', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'perk-shelf-one');
    doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).perks = [{ id: 'shrug_it_off', tier: 'II' }];
    doAct({ type: 'narrator/turn', turn: { narration: 'Brace.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol', at: 'P11' }] } } } as any);
    for (let i = 0; i < 4 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id } as any);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; await React.act(async () => { tab.click(); });
    expect(Array.from(el.querySelectorAll('#phc-tabpanel [data-shelf]')).map((x) => x.getAttribute('data-shelf'))).toEqual(['use']);
    expect(el.querySelectorAll('#phc-tabpanel [data-perk-row]').length).toBe(0);
    // another tab carries no shelf heading
    await React.act(async () => { (el.querySelector('#phc-tab-move') as HTMLElement).click(); });
    expect(el.querySelectorAll('#phc-tabpanel [data-shelf]').length).toBe(0);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
  it('with only passives the tab is there to read: no Use now shelf, and the badge says 0', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'perk-shelf-read');
    doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).perks = [{ id: 'used_to_the_pain', tier: 'I' }];
    doAct({ type: 'narrator/turn', turn: { narration: 'Brace.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol', at: 'P11' }] } } } as any);
    for (let i = 0; i < 4 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id } as any);
    G.combat!.log.push(active(G.combat!)!.name + ' takes 12 (Used to the Pain: −25% on the next hit).');
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const tab = el.querySelector('#phc-tab-perks') as HTMLElement; expect(tab.textContent).toMatch(/Perks\s*0$/);
    await React.act(async () => { tab.click(); });
    expect(Array.from(el.querySelectorAll('#phc-tabpanel [data-shelf]')).map((x) => x.getAttribute('data-shelf'))).toEqual(['always']);
    // the passive's line follows the fight: the log named it since this unit's last turn, so the row shows that line
    const live = el.querySelector('[data-perk-row="pki:perk:used_to_the_pain"]') as HTMLElement;
    expect(live.getAttribute('data-state')).toBe('last'); expect(live.querySelector('[data-perk-line]')!.textContent).toMatch(/^Last: .* \(Used to the Pain: −25% on the next hit\)$/);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });

  it('the target card shows the face its token shows (an art library name resolved, never a black square); initials with none', async () => {
    vi.useFakeTimers();
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'tgt-face');
    doAct({ type: 'char/add', sheet: { ...sheetFrom(ARCHETYPES[0].id, 'MPAT'), portrait: '/assets/wick-narrator-placeholder.webp' } }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    doAct({ type: 'narrator/turn', turn: { narration: 'Drones.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Drill drone', tier: 'minion', weapon: 'service_pistol', portrait: 'char-m813-scavenger-drone' }, { name: 'Sentry turret', tier: 'minion', weapon: 'service_pistol' }, { name: 'Sigil novice', tier: 'minion', weapon: 'service_pistol' }] } } });
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(App)); });
    await React.act(async () => { vi.advanceTimersByTime(15000); });
    const L = new CombatLogic({}) as any;
    const drone = G.combat!.units.find((u) => u.name === 'Drill drone')!, novice = G.combat!.units.find((u) => u.name === 'Sigil novice')!, turret = G.combat!.units.find((u) => u.name === 'Sentry turret')!;
    expect(drone.img).toBe('char-m813-scavenger-drone');
    L.state = { ...L.state, action: 'analyze', target: drone.id }; const TT = () => L.renderVals().turnPanels[0]; expect(TT().mine).toBe(true); let t = TT().tgtList[0];
    expect(t).toBeTruthy(); { expect(t.img).toMatch(/^\/assets\/char-m813-scavenger-drone\.webp$/); expect(t.hasImg).toBe(true); expect(t.noImg).toBe(false); }
    // A person with no portrait of their own is cast a card from the pool (game/cast.ts): the card and the token agree.
    L.state = { ...L.state, action: 'analyze', target: novice.id }; t = TT().tgtList[0];
    expect(t.name).toBe('Sigil novice'); expect(t.img).toMatch(/^\/assets\/char-[\w-]+\.webp$/); expect(t.hasImg).toBe(true);
    // A thing with no art (a turret): its token's initials, never an empty black frame.
    L.state = { ...L.state, action: 'analyze', target: turret.id }; t = TT().tgtList[0];
    expect(t.name).toBe('Sentry turret'); expect(t.img).toBe(''); expect(t.hasImg).toBe(false); expect(t.noImg).toBe(true); expect(t.short).toBe(turret.short);
    // The token draws the same face.
    const tok = Array.from(el.querySelectorAll('button.phc-tok img')).map((im) => im.getAttribute('src'));
    expect(tok).toContain('/assets/char-m813-scavenger-drone.webp');
    expect(tok.some((x) => x === 'char-m813-scavenger-drone')).toBe(false);
    // The Backpack: one labelled button in your card (and the short-window bar), none by the AP bar.
    const bps = Array.from(el.querySelectorAll('[data-backpack]'));
    expect(bps.map((b) => b.getAttribute('data-backpack')).sort()).toEqual(['card', 'mini']);
    for (const b of bps) { expect(b.textContent).toMatch(/Backpack/); expect(b.getAttribute('aria-keyshortcuts')).toBe('B'); expect(b.getAttribute('aria-pressed')).toBe('false'); }
    expect(el.querySelector('.phc-cb-aplabel button')).toBeNull();
    expect(el.querySelector('.phc-me-full [data-backpack="card"]')).toBeTruthy();
    await React.act(async () => { (bps[0] as HTMLElement).click(); });
    expect(el.querySelector('[data-bp-panel]')).toBeTruthy();
    expect(el.querySelector('[data-backpack="card"]')!.getAttribute('aria-pressed')).toBe('true');
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  });
});
