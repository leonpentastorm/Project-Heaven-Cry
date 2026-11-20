// @vitest-environment jsdom
// 0.33 lane C, the screen side of five outside playtests of live 0.32.0, through the real screen (CombatLogic.renderVals)
// on fights the reducer runs: an action's hover card is its own (Slam and Challenge read the whole Durability essay); a
// refusal is said once (the target's roll line repeated "Out of melee reach."); a new turn starts with nothing chosen
// (the last turn's technique and target carried over); the combat log is in the order it happened; the SHADOW header
// says the Eye's own word.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');

const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** One of yours (an archetype) against one hostile, open ground, on your turn. */
function fight(arch: string, room = 'ROOM') {
  snap = null; G = newGame(room, { id: 'host', name: 'Leon' }, 'pt033c-' + arch);
  doAct({ type: 'char/add', sheet: sheetFrom(arch, 'Kade') });
  doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id);
  Object.assign(u, { pos: '2,5', ap: 6 }); Object.assign(e, { pos: '8,5' });
  for (const x of [u, e]) x.hp = x.maxHp = 300;
  snap = view();
  expect(active(cb)!.id).toBe(u.id);
  return { u, e, cb };
}
function screen() { const l: any = new CombatLogic({}); l.setState = (s: any) => { l.state = { ...l.state, ...(typeof s === 'function' ? s(l.state) : s) }; }; return l; }
const T = (l: any) => l.renderVals().turnPanels[0];
const rowOf = (t: any, key: string) => t.groups.flatMap((g: any) => g.items).find((a: any) => a.key.endsWith(key));

describe('0.33 lane C: the fight screen', () => {
  it('Slam and Challenge: each hover card is the move\'s own (its data text), never the whole Durability door', () => {
    fight('living_wall'); const l = screen();
    const t = T(l);
    for (const k of ['guard_slam', 'guard_challenge']) {
      const r = rowOf(t, k); expect(r, k).toBeTruthy();
      expect(r.tipText).not.toMatch(/Guard is Durability's door/);
      expect(r.tipText).toMatch(/From Durability \d/);
    }
    expect(rowOf(t, 'guard_slam').tipText).toMatch(/pushed 1 tile/);
    expect(rowOf(t, 'guard_challenge').tipText).toMatch(/Taunted/);
  });

  it('a refusal is said once: the target\'s roll line drops what the action box already says', () => {
    const { u, e } = fight('living_wall'); const l = screen();
    u.weapon = 'combat_knife'; snap = view(); // a blade: out of melee reach six tiles off
    const hit = T(l).groups.find((g: any) => g.id === 'attack').items[0].key; // the plain blow, first in Attack
    l.setState({ action: hit, target: e.id });
    const t = T(l);
    expect(t.sel.text).toMatch(/reach/i);
    const tg = t.tgtList[0]; expect(tg).toBeTruthy();
    expect(tg.hasOdds).toBe(false); expect(tg.odds).toBe('');
    // in reach, the odds are back
    G.combat!.units.find((x: any) => x.id === e.id)!.pos = '3,5'; snap = view();
    const t2 = T(l); expect(t2.tgtList[0].hasOdds).toBe(true); expect(t2.tgtList[0].odds).toMatch(/^Hit \d+%/);
  });

  it('a new turn starts with nothing chosen: the last turn\'s pick and its target do not carry over', () => {
    const { u, e } = fight('living_wall'); const l = screen();
    const hit = T(l).groups.find((g: any) => g.id === 'attack').items[0].key;
    l.setState({ action: hit, target: e.id }); T(l);
    expect(l.state.action).toBe(hit);
    doAct({ type: 'combat/end-turn', unitId: u.id });
    for (let i = 0; i < 6 && active(G.combat!)!.id !== u.id; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id });
    expect(active(G.combat!)!.id).toBe(u.id);
    T(l);
    expect(l.state.action).toBe('move'); expect(l.state.target).toBe(null);
  });

  it('the combat log is in the order it happened (its last line is the newest)', () => {
    const { u } = fight('living_wall'); const l = screen();
    doAct({ type: 'combat/end-turn', unitId: u.id });
    const log = l.renderVals().log.filter((x: any) => x.key !== 'lootlog');
    expect(log.length).toBeGreaterThan(1);
    const keys = log.map((x: any) => x.key);
    expect(keys).toEqual([...keys].sort((a: number, b: number) => a - b));
    expect(log[log.length - 1].text).toBe(G.combat!.log[G.combat!.log.length - 1]);
  });

  it('the SHADOW header says the Eye\'s word: SEEN while a hostile sees you', () => {
    fight('phantom'); const l = screen();
    T(l); l.setState({ tab: 'shadow' });
    const tp = T(l).tabPanel[0];
    expect(tp.name).toMatch(/^SHADOW · (SEEN|IN VIEW|UNSEEN)$/);
    expect(tp.name).toBe('SHADOW · SEEN'); // open ground, the hostile six tiles off with nothing between
  });
});
