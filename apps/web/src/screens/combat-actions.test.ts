// @vitest-environment jsdom
// Client boundary 3 (action descriptors): every group of the engine's descriptors renders on the fight panel and
// confirms through the one action flow, rendered for real; and an action defined only in the engine (registerActions)
// appears on the screen and works with no client change (the worked example of client-boundary-3-actions.md).
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, actionsFor, previewDescriptor, sendDescriptor, registerActions, nextStep, addItems, clearAddedItems, addOwnedBlocks, clearOwnedBlocks, spawnOwned, withGame, type GameState, type Sheet, type ActionDescriptor } from '@engine';
import { FLOW_PREVIEWS } from '../game/actionFlow';

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

function fight(seed: string, arch: string, kit: string, edit: (c: any) => void = () => {}) {
  snap = null; sent.length = 0; G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  const a = ARCHETYPES.find((x) => x.id === arch)!;
  doAct({ type: 'char/add', sheet: { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit, traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet });
  doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  edit(Object.values(G.characters)[0]);
  doAct({ type: 'narrator/turn', turn: { narration: 'Go.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb = G.combat!, u = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!;
  cb.order = [u.id, foe.id]; cb.turn = 0; u.ap = 9; u.pos = '2,2'; foe.pos = '3,2';
  snap = view();
  return { u, foe };
}
function App() {
  const st = React.useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => snap);
  return React.createElement(Screen as any, { tick: st });
}
async function mount() { const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el); await React.act(async () => { root.render(React.createElement(App)); }); return { el, root }; }
const click = async (b: Element | null | undefined) => { expect(b).toBeTruthy(); await React.act(async () => { (b as HTMLElement).click(); }); };
const confirmBtn = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).find((b) => /^Confirm$/.test((b.textContent || '').trim())) as HTMLButtonElement;
const tokenOf = (el: HTMLElement, name: string) => Array.from(el.querySelectorAll('button.phc-tok')).find((b) => (b.getAttribute('aria-label') || '').includes(name));

/** A descriptor the panel can confirm with clicks alone: on the flow, usable now, its required picks units (or none),
 *  and the engine's verdict yes with its first choices. */
function confirmable(d: ActionDescriptor, uid: string): { picks: any } | null {
  if (!FLOW_PREVIEWS.has(d.preview) || d.pad || d.parent || d.hidden || !d.available) return null;
  const picks: any = {};
  for (let i = 0; i < 4; i++) {
    const st = nextStep(d, picks, { required: true }); if (!st) break;
    if (!['enemy', 'ally', 'unit'].includes(st.kind) || !st.choices?.length) return null;
    picks[st.key] = st.choices[0];
  }
  const pv = previewDescriptor(G, uid, d.id, picks, ME);
  return pv && pv.ok && pv.action ? { picks } : null;
}
/** For each group of the unit's descriptors: pick one it can confirm, render it, click its row (and its unit), Confirm;
 *  the action sent is the engine's. Returns the groups confirmed. */
async function everyGroup(el: HTMLElement, uid: string): Promise<string[]> {
  const done: string[] = [];
  const groups = [...new Set(actionsFor(G, uid, ME).map((d) => d.group))];
  for (const gr of groups) {
    const d = actionsFor(G, uid, ME).find((x) => x.group === gr && confirmable(x, uid));
    if (!d) continue;
    const { picks } = confirmable(d, uid)!, want = sendDescriptor(G, uid, d.id, picks, ME)!;
    await click(el.querySelector('[role="tab"][data-tab="' + gr + '"]'));
    await click(el.querySelector('button[data-act="' + d.id + '"]'));
    for (const k of Object.keys(picks)) { const t = G.combat!.units.find((x) => x.id === picks[k])!; const tok = tokenOf(el, t.name); if (tok) await click(tok); }
    const n = sent.length, conf = confirmBtn(el);
    expect(conf, gr + ' ' + d.id).toBeTruthy(); expect(conf.disabled, gr + ' ' + d.id + ': ' + (el.querySelector('.phc-cb-seltext')?.textContent || '')).toBe(false);
    await click(conf);
    const got = sent.slice(n).find((a) => a.type === want.type);
    expect(got, gr + ' ' + d.id).toBeTruthy();
    for (const k of ['id', 'actionId', 'kind', 'mode', 'hand', 'design']) if ((want as any)[k] != null) expect(got[k], gr + ' ' + d.id + ' ' + k).toBe((want as any)[k]);
    done.push(gr);
    G.combat!.units.find((x) => x.id === uid)!.ap = 9; G.combat!.turn = 0; snap = view(); await React.act(async () => { listeners.forEach((f) => f()); });
  }
  return done;
}

describe('every descriptor group renders and confirms on the one action flow', () => {
  it('Move, Attack, Utility, Perks, Faith and Calls (a gunner with a perk, Faith and a voice)', async () => {
    const { u } = fight('acts-a', 'sharpshooter', 'medic', (c) => { c.perks = [{ id: 'shrug_it_off', tier: 'II' }]; c.skills.faith = 4; c.skills.authority = 3; });
    const { el, root } = await mount();
    const done = await everyGroup(el, u.id);
    expect(done).toEqual(expect.arrayContaining(['move', 'attack', 'utility', 'faith', 'calls']));
    root.unmount();
  });
  it('Class moves (a Bulwark, id defender)', async () => {
    const { u } = fight('acts-b', 'bulwark', 'medic', (c) => { c.classId = 'defender'; c.level = 12; c.attrs.durability = 8; });
    const { el, root } = await mount();
    expect(await everyGroup(el, u.id)).toContain('class');
    root.unmount();
  });
  it('Sigils and Outbursts (an Evoker, then an Emanator)', async () => {
    let { u } = fight('acts-c', 'sigilist', 'sigil');
    let m = await mount();
    expect(await everyGroup(m.el, u.id)).toContain('sigils');
    m.root.unmount();
    ({ u } = fight('acts-d', 'stormcaller', 'soul'));
    m = await mount();
    expect(await everyGroup(m.el, u.id)).toContain('outbursts');
    m.root.unmount();
  });
});

describe('a door verb written in data only works on the screen with no client change (Classes 3.0 P6)', () => {
  it('a fixture verb: its row on its tab, the engine\'s pick list (its reach), Confirm sends combat/perk and it lands', async () => {
    const verb = { id: 'test_web_verb', name: 'Paint Them (test)', kind: 'verb', requires: [{ skill: 'dexterity', min: 1 }], text: 'Costs 1 AP: an enemy you see within 3 tiles is Marked for 2 rounds.',
      effects: [{ op: 'grant_action', action: 'test_paint', ap: 1, uses: 'at_will', reach: { tiles: 3, side: 'foe', sight: true }, effects: [{ op: 'condition', condition: 'marked', target: 'target', skip_save: true, rounds: 2 }] }], adjudication: 'engine' };
    addItems('verb', [verb]);
    try {
      const { u, foe } = fight('acts-verb', 'sharpshooter', 'medic');
      const d = actionsFor(G, u.id, ME).find((x) => x.id.includes('verb:test_web_verb'))!;
      expect(d).toBeTruthy(); expect(d.picks[0].choices).toEqual([foe.id]);
      const { el, root } = await mount();
      await click(el.querySelector('[role="tab"][data-tab="' + d.group + '"]'));
      const row = el.querySelector('button[data-act="' + d.id + '"]');
      expect(row?.textContent).toMatch(/Paint Them/);
      await click(row); await click(tokenOf(el, foe.name)); await click(confirmBtn(el));
      expect(sent.find((a) => a.type === 'combat/perk')).toMatchObject({ unitId: u.id, id: 'verb:test_web_verb', targetId: foe.id });
      expect(G.combat!.units.find((x) => x.id === foe.id)!.conds?.marked).toBeGreaterThan(0);
      root.unmount();
    } finally { clearAddedItems(); }
  });
});

describe('an owned unit with no turn of its own is ordered from its owner\'s panel with no client change (Classes 3.0 P9)', () => {
  it('a fixture puppet: its verbs are rows of the owner\'s Utility tab; Strike picks the enemy and Confirm sends combat/owned', async () => {
    addOwnedBlocks([{ id: 'test_web_puppet', name: 'Puppet', kind: 'machine', hp: 20, defense: 10, attack_bonus: 1, armour: 0, movement: 2, weapon: 'fists', turn: 'owner', actions: ['move', 'melee'] }]);
    try {
      const { u, foe } = fight('acts-owned', 'sharpshooter', 'medic');
      const p: any = withGame(G, () => spawnOwned(G.combat!, G.combat!.units.find((x) => x.id === u.id)!, 'test_web_puppet', '3,3', G.rng));
      expect(G.combat!.order).not.toContain(p.id);
      snap = view();
      const d = actionsFor(G, u.id, ME).find((x) => x.id === 'ow:' + p.id + ':melee')!;
      expect(d).toBeTruthy(); expect(d.group).toBe('utility'); expect(d.picks[0].choices).toEqual([foe.id]);
      const { el, root } = await mount();
      await click(el.querySelector('[role="tab"][data-tab="utility"]'));
      const row = el.querySelector('button[data-act="' + d.id + '"]');
      expect(row?.textContent).toMatch(/Puppet: Strike/);
      const ap = G.combat!.units.find((x) => x.id === u.id)!.ap;
      await click(row); await click(tokenOf(el, foe.name)); await click(confirmBtn(el));
      expect(sent.find((a) => a.type === 'combat/owned')).toMatchObject({ unitId: u.id, owned: p.id, verb: 'melee', targetId: foe.id });
      expect(G.combat!.units.find((x) => x.id === u.id)!.ap).toBeLessThan(ap); // the owner paid
      root.unmount();
    } finally { clearOwnedBlocks(); }
  });
});

describe('an action defined only in the engine works on the screen with no client change', () => {
  it('registerActions: Taunt appears on the Utility tab, asks for an enemy, previews, and Confirm sends its action', async () => {
    const off = registerActions({
      id: 'test-taunt',
      list: (x) => (x.u.side === 'pc' ? [{ id: 'test:taunt', group: 'utility', name: 'Taunt', text: 'Read the enemy you name (an Analyze, for the test).', cost: { ap: 2, text: '2 AP' }, available: true, why: null,
        picks: [{ key: 'targetId', kind: 'enemy', prompt: 'Click an enemy to taunt.', choices: x.seen.units.filter((v) => v.side === 'foe' && !v.dead).map((v) => v.id) }], toggleOn: null, preview: 'basic' }] : []),
      send: (x, _d, p) => ({ type: 'combat/analyze', unitId: x.u.id, targetId: p.targetId }) as any,
    });
    try {
      const { u, foe } = fight('acts-taunt', 'sharpshooter', 'medic');
      const { el, root } = await mount();
      await click(el.querySelector('[role="tab"][data-tab="utility"]'));
      const row = el.querySelector('button[data-act="test:taunt"]');
      expect(row?.textContent).toMatch(/Taunt/); expect(row?.textContent).toMatch(/2 AP/);
      await click(row);
      await click(tokenOf(el, foe.name));
      expect(el.querySelector('.phc-cb-seltext')?.textContent).not.toMatch(/Click an enemy/);
      await click(confirmBtn(el));
      expect(sent.find((a) => a.type === 'combat/analyze')).toMatchObject({ unitId: u.id, targetId: foe.id });
      expect(G.combat!.units.find((x) => x.id === foe.id)!.analyzedBy).toBeTruthy();
      root.unmount();
    } finally { off(); }
  });
});
