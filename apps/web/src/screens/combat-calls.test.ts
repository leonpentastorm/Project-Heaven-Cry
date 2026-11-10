// @vitest-environment jsdom
// The fight panel after Skeleton 2.0, rendered for real: the Calls tab (shown only to a speaker), a Call picked, aimed
// and confirmed (combat/call); the shield's block on the Attack tab with its Guard pips; the tab row's nine tabs.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
const listeners = new Set<() => void>();
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const sent: any[] = [];
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); listeners.forEach((f) => f()); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: (f: any) => { listeners.add(f); return () => listeners.delete(f); },
  act: (a: any) => { sent.push(a); try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const React = await import('react'); const { createRoot } = await import('react-dom/client');
const { makeScreen } = await import('../dc/runtime'); const { expand } = await import('./shared');
const tpl = (await import('../templates/combat.template.html?raw')).default;
const Screen = makeScreen(expand(tpl), CombatLogic as any);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const GAMMAS = ['authority', 'charisma', 'eloquence', 'lore_master', 'reaction_speed', 'vigilant', 'sensory', 'intimidation', 'implication'];
function fight(seed: string, edit: (c: any) => void) {
  snap = null; sent.length = 0; G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c: any = Object.values(G.characters)[0]; for (const k of GAMMAS) c.skills[k] = 0; edit(c);
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  // the player's unit acts first, next to nobody, the foe four tiles off
  const cb = G.combat!, u = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!;
  cb.order = [u.id, foe.id]; cb.turn = 0; u.ap = 6; u.pos = '2,2'; foe.pos = '6,2'; (foe as any).sv = { body: -50, brain: -50, heart: -50 };
  snap = view();
  return { c, u, foe };
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(Screen as any, { tick: st });
}
async function mount() { const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el); await React.act(async () => { root.render(React.createElement(App)); }); return { el, root }; }
const click = async (b: Element | null | undefined) => { expect(b).toBeTruthy(); await React.act(async () => { (b as HTMLElement).click(); }); };
const tabIds = (el: HTMLElement) => Array.from(el.querySelectorAll('[role="tablist"][aria-label="Actions"] [role="tab"]')).map((t) => t.getAttribute('data-tab'));

describe('the Calls tab', () => {
  it('no talking skill: no Calls tab', async () => {
    fight('calls-none', () => {});
    const { el, root } = await mount();
    expect(tabIds(el)).not.toContain('calls');
    root.unmount();
  });
  it('a speaker: the tab is last; a chip shows AP, reach, the step text and the save; pick, aim, confirm sends combat/call', async () => {
    const { u, foe } = fight('calls-a', (c) => { c.skills.intimidation = 3; c.skills.charisma = 3; c.skills.lore_master = 1; });
    const { el, root } = await mount();
    expect(active(G.combat!)!.id).toBe(u.id);
    const ids = tabIds(el); expect(ids[ids.length - 1]).toBe('calls');
    await click(el.querySelector('[role="tab"][data-tab="calls"]'));
    const chips = Array.from(el.querySelectorAll('button[data-call]'));
    expect(chips.map((b) => b.getAttribute('data-call')).sort()).toEqual(['call.name_it', 'call.rally', 'call.threaten']);
    const th = el.querySelector('button[data-call="call.threaten"]')!;
    expect(th.querySelector('[data-call-meta]')!.textContent).toMatch(/^2 AP · \d+ tiles$/);
    expect(th.querySelector('[data-call-text]')!.textContent!.length).toBeGreaterThan(10);
    expect(th.querySelector('[data-call-save]')!.textContent).toMatch(/^Heart save, TN \d+$/);
    expect(th.textContent).toMatch(/TO AN ENEMY · INTIMIDATION · STEP 2/);
    // pick it: the card names it and the grid shows its reach; the foe in reach is its target; the save is on the card
    await click(th);
    expect(el.querySelector('button[data-call="call.threaten"]')!.getAttribute('aria-pressed')).toBe('true');
    const foeTile = Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').includes(foe.name));
    await click(foeTile);
    const foot = el.querySelector('.phc-cb-foot')!;
    expect(foot.textContent).toMatch(/Threaten · 2 AP · within \d+ tiles/);
    expect(foot.textContent).toContain('To ' + foe.name + '.');
    expect(foot.textContent).toMatch(new RegExp(foe.name + ' rolls a Heart save against TN \\d+'));
    const ap0 = G.combat!.units.find((x) => x.id === u.id)!.ap;
    await click(Array.from(el.querySelectorAll('button')).find((b) => /^Confirm/.test((b.textContent || '').trim())));
    expect(sent.filter((a) => a.type === 'combat/call')).toEqual([{ type: 'combat/call', unitId: u.id, id: 'call.threaten', targetId: foe.id }]);
    expect(G.combat!.units.find((x) => x.id === u.id)!.ap).toBe(ap0 - 2);
    expect(G.combat!.log.some((l) => /calls Threaten at/.test(l))).toBe(true);
    // a Call to yourself needs no click: Name It is ready to confirm at once
    await click(el.querySelector('button[data-call="call.name_it"]'));
    expect(el.querySelector('.phc-cb-foot')!.textContent).toContain('To yourself.');
    await click(Array.from(el.querySelectorAll('button')).find((b) => /^Confirm/.test((b.textContent || '').trim())));
    expect(sent.filter((a) => a.type === 'combat/call').pop()).toEqual({ type: 'combat/call', unitId: u.id, id: 'call.name_it', targetId: u.id });
    // an ally's Call with nobody to call to asks for one, and Confirm is off
    await click(el.querySelector('button[data-call="call.rally"]'));
    expect(el.querySelector('.phc-cb-foot')!.textContent).toMatch(/Click an ally within \d+ tiles\./);
    const n = sent.length;
    await click(Array.from(el.querySelectorAll('button')).find((b) => /^Confirm/.test((b.textContent || '').trim())));
    expect(sent.length).toBe(n);
    root.unmount();
  });
  it('Order: its things are toggles on the card (move from 3 points, greyed below)', async () => {
    fight('calls-order', (c) => { c.skills.authority = 1; });
    const { el, root } = await mount();
    await click(el.querySelector('[role="tab"][data-tab="calls"]'));
    await click(el.querySelector('button[data-call="call.order"]'));
    const foot = el.querySelector('.phc-cb-foot')!;
    const tg = Array.from(foot.querySelectorAll('[role="group"][aria-label="Perk options on this action"] button')) as HTMLButtonElement[];
    expect(tg.map((b) => b.textContent)).toEqual(['RELOAD', 'STAND UP', 'PICK UP', 'MOVE']);
    expect(tg[3].disabled).toBe(true);
    await click(tg[0]);
    expect(Array.from(el.querySelectorAll('.phc-cb-foot [role="group"] button')).map((b) => b.textContent)).toContain('RELOAD ✓');
    root.unmount();
  });
});

describe('the shield on the Attack tab', () => {
  it('its own block under the weapon: the shield\'s name, Guard pips, and a pad with Shield Bash, Raise Shield and its reactions', async () => {
    const { u } = fight('shield-a', (c) => { c.skills.durability = 3; c.attrs.endurance = Math.max(3, c.attrs.endurance || 1); c.weapon = 'sabre'; c.offHand = { id: 'riot_shield' }; });
    const cu = G.combat!.units.find((x) => x.id === u.id)!;
    expect(cu.offItem).toBe('riot_shield'); expect(cu.resMax?.guard).toBeGreaterThan(0);
    cu.res!.guard = 2; snap = view();
    const { el, root } = await mount();
    await click(el.querySelector('[role="tab"][data-tab="attack"]'));
    const head = el.querySelector('[data-weapon-block="off"]')!;
    expect(head.textContent).toMatch(/RIOT SHIELD · OFF HAND/i);
    expect(head.textContent).toContain('Guard 2 / ' + cu.resMax!.guard);
    const pips = head.querySelectorAll('[data-pips="guard"] > span');
    expect(pips.length).toBe(cu.resMax!.guard); expect(Array.from(pips).filter((p) => p.getAttribute('data-on') === 'true').length).toBe(2);
    await click(el.querySelector('button[data-act="tpad:off"]'));
    const pad = el.querySelector('[data-tech-pad="tpad:off"]')!;
    const chips = Array.from(pad.querySelectorAll('button[data-tech]'));
    expect(chips.filter((b) => b.getAttribute('data-reaction') !== 'true').map((b) => b.getAttribute('data-tech')).sort()).toEqual(['raise_shield', 'shield_bash']);
    expect(chips.filter((b) => b.getAttribute('data-reaction') === 'true').map((b) => b.getAttribute('data-tech')).sort()).toEqual(['interpose', 'shield_wall']);
    // Raise Shield: 1, 2 or all on the card; confirm sends the amount
    cu.res!.momentum = 3; cu.res!.guard = 0; snap = view(); await React.act(async () => { listeners.forEach((f) => f()); });
    await click(el.querySelector('[data-tech-pad="tpad:off"] button[data-tech="raise_shield"]'));
    const tg = Array.from(el.querySelectorAll('.phc-cb-foot [role="group"][aria-label="Perk options on this action"] button')) as HTMLButtonElement[];
    expect(tg.map((b) => b.textContent)).toEqual(['TURN 1', 'TURN 2', 'ALL ✓']);
    await click(tg[1]);
    expect(el.querySelector('.phc-cb-foot')!.textContent).toMatch(/Guard 0 → 2/);
    await click(Array.from(el.querySelectorAll('button')).find((b) => /^Confirm/.test((b.textContent || '').trim())));
    expect(sent.find((a) => a.type === 'combat/technique')).toMatchObject({ id: 'raise_shield', hand: 'off', opt: '2' });
    expect(G.combat!.units.find((x) => x.id === u.id)!.res!.guard).toBe(2);
    root.unmount();
  });
});
