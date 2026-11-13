// @vitest-environment jsdom
// The Attack tab in areas, and every action's hover card (Leon, live 0.23.0, 12 Nov 2026), rendered for real: one
// weapon is one area with no Both; two guns are three areas, main hand, off hand, Both, each with its header and a 1 px
// line between them, grouped by the engine descriptor's `hand`. With two guns, reloading one leaves the other's reload.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, actionsFor, type GameState, type Sheet } from '@engine';

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

function fight(twoGuns: boolean) {
  snap = null; sent.length = 0; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'AREAS1');
  const a = ARCHETYPES.find((x) => x.id === 'deadeye')!;
  doAct({ type: 'char/add', sheet: { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as Sheet });
  doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c: any = Object.values(G.characters)[0]; c.weapon = 'service_pistol'; c.loaded = undefined;
  doAct({ type: 'narrator/turn', turn: { narration: 'Go.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb = G.combat!, u = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!;
  cb.order = [u.id, foe.id]; cb.turn = 0; u.ap = 9; u.pos = '2,2'; foe.pos = '6,2';
  if (twoGuns) { u.offWeapon = 'service_pistol'; u.offAmmo = 3; u.ammo = 2; u.mags = [12, 12, 12, 12]; }
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
/** The Attack tab's areas in order: [area, header text, has a line above it, the rows' ids]. */
function areas(el: HTMLElement) {
  const out: { area: string; head: string; sep: boolean; ids: string[] }[] = [];
  for (const w of Array.from(el.querySelectorAll('[role="tabpanel"] [data-area]'))) {
    const area = w.getAttribute('data-area') || '', id = w.querySelector('button[data-act]')?.getAttribute('data-act') || '';
    const head = w.querySelector('[data-weapon-block]'), sep = !!w.querySelector('[data-area-sep]');
    if (!out.length || out[out.length - 1].area !== area) out.push({ area, head: head ? (head.textContent || '').trim() : '', sep, ids: [] });
    if (id) out[out.length - 1].ids.push(id);
  }
  return out;
}
const toAttack = async (el: HTMLElement) => click(el.querySelector('[role="tab"][data-tab="attack"]'));

describe('the Attack tab in areas', () => {
  it('one weapon: one weapon area (its shots, reload and shooting an object), no Both, then what is no weapon\'s', async () => {
    fight(false); const { el, root } = await mount(); await toAttack(el);
    const a = areas(el);
    expect(a.map((x) => x.area)).toEqual(['main', 'other']);
    expect(a[0].head).toMatch(/^SERVICE PISTOL/); expect(a[0].head).not.toMatch(/MAIN HAND/); expect(a[0].sep).toBe(false);
    expect(a[0].ids).toEqual(expect.arrayContaining(['tq:main:shot', 'tpad:main', 'reload', 'cover']));
    expect(a[1]).toMatchObject({ head: 'OTHER', sep: true }); expect(a[1].ids).toContain('shove');
    // the order on screen is the order of the hotkeys (tab 2, then the row's place)
    const codes = Array.from(el.querySelectorAll('[role="tabpanel"] button[data-act] .phc-key-code')).map((c) => c.getAttribute('data-code'));
    expect(codes.slice(0, 4)).toEqual(['21', '22', '23', '24']);
    await React.act(async () => root.unmount()); el.remove();
  });

  it('two guns: main hand, off hand, Both, each with its header and a line between, by the descriptor\'s hand', async () => {
    const { u } = fight(true); const { el, root } = await mount(); await toAttack(el);
    const a = areas(el);
    expect(a.map((x) => x.area)).toEqual(['main', 'off', 'both', 'other']);
    expect(a.map((x) => x.sep)).toEqual([false, true, true, true]);
    expect(a[0].head).toMatch(/^MAIN HAND · SERVICE PISTOL/); expect(a[1].head).toMatch(/^OFF HAND · SERVICE PISTOL/); expect(a[2].head).toBe('BOTH');
    expect(a[1].ids).toEqual(expect.arrayContaining(['tq:off:shot', 'reload-off', 'reload-off-tac', 'cover-off'])); // the off-hand gun's own reloads and Attack an object
    expect(a[1].ids).not.toContain('clear-off'); expect(a[1].ids).not.toContain('clear'); // two guns: ONE Clear jam, in the Both area (Hands 5d)
    expect(a[0].ids).not.toContain('clear'); expect(a[0].ids).not.toContain('clear-off');
    expect(a[2].ids).toEqual(expect.arrayContaining(['paired', 'reload2', 'reload2-tac', 'clear']));
    // each row is where its descriptor says
    const hand = Object.fromEntries(actionsFor(G, u.id, ME).map((d) => [d.id, d.hand || 'other']));
    for (const x of a) for (const id of x.ids) expect(hand[id], id).toBe(x.area);
    // every row has its code, past the ninth too: a 0 per nine (201 the tenth row of tab 2), in the order shown
    const shown = Array.from(el.querySelectorAll('[role="tabpanel"] button[data-act]')).filter((b) => b.querySelector('.phc-key-code'));
    expect(shown.length).toBeGreaterThan(9);
    shown.forEach((b, i) => expect(b.querySelector('.phc-key-code')!.getAttribute('data-code'), b.getAttribute('data-act')!).toBe('2' + '0'.repeat(Math.floor(i / 9)) + ((i % 9) + 1)));
    await React.act(async () => root.unmount()); el.remove();
  });

  it('two guns: reload one, then the other (Reload both goes when one is full; the other\'s own reload stays)', async () => {
    const { u } = fight(true); const { el, root } = await mount(); await toAttack(el);
    const row = (id: string) => el.querySelector('button[data-act="' + id + '"]') as HTMLButtonElement;
    await click(row('reload')); await click(confirmBtn(el));
    expect(G.combat!.units.find((x) => x.id === u.id)!.ammo).toBe(12);
    await toAttack(el);
    expect(row('reload-off')).toBeTruthy(); expect(row('reload2')).toBeTruthy();
    await click(row('reload-off')); expect(confirmBtn(el).disabled).toBe(false); await click(confirmBtn(el));
    expect(sent.at(-1)).toMatchObject({ type: 'combat/reload', hand: 'off' });
    expect(G.combat!.units.find((x) => x.id === u.id)!.offAmmo).toBe(12);
    await React.act(async () => root.unmount()); el.remove();
  });

  it('two guns: the one Clear jam (Both area) clears the off-hand gun\'s jam, and a paged code (2 0 n) picks a row past the ninth', async () => {
    const { u } = fight(true); u.offJammed = true; snap = view(); const { el, root } = await mount(); await toAttack(el);
    const b = el.querySelector('button[data-act="clear"]') as HTMLButtonElement; expect(b).toBeTruthy();
    const code = b.querySelector('.phc-key-code')!.getAttribute('data-code')!;
    expect(code.length).toBeGreaterThan(2); // past the ninth row with two guns
    for (const k of code) await React.act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
    expect(el.querySelector('button[data-act="clear"]')!.getAttribute('aria-pressed')).toBe('true');
    await click(confirmBtn(el));
    expect(sent.at(-1)).toMatchObject({ type: 'combat/clear' });
    expect(G.combat!.units.find((x) => x.id === u.id)!.offJammed).toBeFalsy();
    await React.act(async () => root.unmount()); el.remove();
  });

  it('every row and technique chip carries its hover card (data-tip) and no wall-of-text title', async () => {
    fight(true); const { el, root } = await mount(); await toAttack(el);
    const rows = Array.from(el.querySelectorAll('[role="tabpanel"] button[data-act]'));
    expect(rows.length).toBeGreaterThan(5);
    for (const b of rows) { expect(b.getAttribute('title'), b.getAttribute('data-act')!).toBeNull(); const t = JSON.parse(b.getAttribute('data-tip') || 'null'); expect(t && t.name, b.getAttribute('data-act')!).toBeTruthy(); }
    const shot = JSON.parse((el.querySelector('button[data-act="tq:main:shot"]') as HTMLElement).getAttribute('data-tip')!);
    expect(shot.chips[0]).toMatch(/^\d+ AP$/); expect(shot.lines.length).toBeGreaterThan(1);
    await click(el.querySelector('button[data-act="tpad:main"]'));
    const chips = Array.from(el.querySelectorAll('[data-tech-pad] button[data-tech]'));
    expect(chips.length).toBeGreaterThan(0);
    for (const c of chips) { expect(c.getAttribute('title')).toBeNull(); expect(JSON.parse(c.getAttribute('data-tip')!).lines.length).toBeGreaterThan(0); }
    await React.act(async () => root.unmount()); el.remove();
  });

  // 0.24.0 browser run: the card replaced the native title, so the words a screen reader and a keyboard user got from
  // the title must still be on the element: its aria-description is the card in words, the refusal included.
  it('every row and chip keeps the card\'s words as its accessible description, the refusal included', async () => {
    const { u } = fight(true); u.ap = 1; snap = view();
    const { el, root } = await mount(); await toAttack(el);
    const rows = Array.from(el.querySelectorAll('[role="tabpanel"] button[data-act]')) as HTMLElement[];
    for (const b of rows) {
      const t = JSON.parse(b.getAttribute('data-tip')!), d = b.getAttribute('aria-description') || '';
      expect(d.startsWith(t.name), b.getAttribute('data-act')!).toBe(true);
      for (const l of t.lines) expect(d, b.getAttribute('data-act')!).toContain(l.text);
    }
    const refused = rows.filter((b) => JSON.parse(b.getAttribute('data-tip')!).lines.some((l: any) => l.kind === 'why'));
    expect(refused.length).toBeGreaterThan(0);
    for (const b of refused) expect(b.getAttribute('aria-description')).toMatch(/Can't now: \S/);
    await click(el.querySelector('button[data-act="tpad:main"]'));
    for (const c of Array.from(el.querySelectorAll('[data-tech-pad] button[data-tech]'))) expect((c.getAttribute('aria-description') || '').length).toBeGreaterThan(0);
    await React.act(async () => root.unmount()); el.remove();
  });
});

// One fact, one place per view (Leon, live 0.24.0: "status effect, heat and such duplicated again"; "maybe I just can't
// tell which one is jammed, they share one heat bar"). Heat is ONE value the two guns pool (u.heat): it is said once, in
// the unit panel's Heat row, never in a weapon's header; each gun's jam is its own, marked on its own header.
describe('two guns: Heat once, each jam on its own gun', () => {
  const count = (s: string, re: RegExp) => (s.match(re) || []).length;
  it('the rendered screen says the Heat once (the unit panel), and no weapon header repeats rounds or Heat', async () => {
    const { u } = fight(true); u.heat = 4; snap = view(); const { el, root } = await mount(); await toAttack(el);
    const res = el.querySelector('[aria-label="Your resources"]')!, tab = el.querySelector('[role="tabpanel"]')!;
    expect(res.querySelectorAll('[data-res="heat"]').length).toBe(1);
    expect(count(tab.textContent || '', /Heat \d/g)).toBe(0);
    for (const h of Array.from(tab.querySelectorAll('[data-weapon-block]'))) expect(h.textContent).not.toMatch(/loaded|Heat/);
    // and no HEAT chip beside the Heat row in your own panel
    expect(count(res.parentElement!.textContent || '', /HEAT \d/g)).toBe(0);
    await React.act(async () => root.unmount()); el.remove();
  });
  it('the off-hand gun jammed: ✕ JAMMED on the off hand\'s header only, its shot refused, the one Clear jam in Both says what it clears', async () => {
    const { u } = fight(true); u.offJammed = true; snap = view(); const { el, root } = await mount(); await toAttack(el);
    const tab = el.querySelector('[role="tabpanel"]')!;
    expect(Array.from(tab.querySelectorAll('[data-jammed]')).map((x) => x.getAttribute('data-jammed'))).toEqual(['off']);
    const offShot = tab.querySelector('button[data-act="tq:off:shot"]') as HTMLButtonElement;
    expect(offShot.getAttribute('aria-description') || '').toMatch(/Jammed: clear it first/);
    const clr = tab.querySelector('button[data-act="clear"]') as HTMLButtonElement;
    expect(clr.closest('[data-area]')!.getAttribute('data-area')).toBe('both');
    expect(clr.getAttribute('aria-description') || '').toMatch(/Clears: the off-hand gun/);
    // the unit panel doesn't repeat it on the Attack tab (the header says it): the screen says JAMMED once
    const res = el.querySelector('[aria-label="Your resources"]')!;
    expect(count(res.parentElement!.textContent || '', /JAMMED/g)).toBe(0);
    expect(count(tab.textContent || '', /JAMMED/g)).toBe(1); // (the map token's own card says it too, on hover)
    // on another tab (no headers) the off-hand gun's own row says it, once
    await click(el.querySelector('[role="tab"][data-tab="move"]'));
    const res2 = el.querySelector('[aria-label="Your resources"]')!;
    expect(count(res2.parentElement!.textContent || '', /JAMMED/g)).toBe(1);
    expect(res2.querySelector('[data-res="off"]')!.textContent).toMatch(/JAMMED/);
    await React.act(async () => root.unmount()); el.remove();
  });
  it('both jammed: both headers marked, and the card says both', async () => {
    const { u } = fight(true); u.jammed = true; u.offJammed = true; snap = view(); const { el, root } = await mount(); await toAttack(el);
    const tab = el.querySelector('[role="tabpanel"]')!;
    expect(Array.from(tab.querySelectorAll('[data-jammed]')).map((x) => x.getAttribute('data-jammed'))).toEqual(['main', 'off']);
    expect((tab.querySelector('button[data-act="clear"]') as HTMLElement).getAttribute('aria-description') || '').toMatch(/Clears: both guns/);
    await React.act(async () => root.unmount()); el.remove();
  });
  it('a condition on your unit is said once in your panel', async () => {
    const { u } = fight(false); (u as any).conds = { ...(u.conds || {}), slowed: 2 }; snap = view(); const { el, root } = await mount();
    const res = el.querySelector('[aria-label="Your resources"]')!;
    expect(count(res.parentElement!.textContent || '', /SLOWED/gi)).toBe(1);
    await React.act(async () => root.unmount()); el.remove();
  });
});
