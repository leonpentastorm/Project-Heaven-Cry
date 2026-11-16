// The Sigils door on the combat screen (nine doors audit, 0.29): a Sigilist's first turn of a fight opens on the Sigils
// tab, headed by the door line from data; with the Evoker only in the pack the tab is one row that says so, priced as
// the pack's own Draw; the caster's token wears its charge and Flux. Through the real screen and real actions.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, gearCost, packOf, FOCUS_IDS, SIGIL_GRAMMAR, SKILL, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {}, act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } },
  go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { PACK_EVOKER } = await import('../game/commands');

const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** A fight with the Sigilist acting first, a hostile in sight (so the old rule would open on Attack). */
function fight(room = 'ROOM') {
  snap = null; G = newGame(room, { id: 'host', name: 'Leon' }, 'door-ui');
  doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'Words.', combat: { name: 'Yard', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb: any = G.combat;
  cb.map = { ...cb.map, w: Math.max(14, cb.map.w), h: Math.max(10, cb.map.h), cover: [], full: [], solid: [], difficult: [], dark: false }; cb.objects = []; cb.glyphs = []; cb.zones = [];
  const u = cb.units.find((x: any) => x.side === 'pc'), e = cb.units.find((x: any) => x.side === 'foe');
  cb.turn = cb.order.indexOf(u.id); if (cb.turn < 0) cb.turn = 0;
  Object.assign(u, { pos: '2,5', ap: 6 }); Object.assign(e, { pos: '8,5' });
  snap = view();
  expect(active(G.combat!)!.id).toBe(u.id);
  return { u, e };
}
function screen(state: any = {}) {
  const l: any = new CombatLogic({});
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  l.state = { ...l.state, ...state };
  return l;
}
/** The live turn panel's tab panel (renderVals().turnPanels[0] is the current one). */
const TP = (v: any) => v.turnPanels[0].tabPanel;
const pc = () => (G.combat as any).units.find((x: any) => x.side === 'pc');
const ch = () => (G.characters as any)[pc().charId];

describe('the Sigils door on the combat screen', () => {
  it('the first turn opens on Sigils (the Evoker in hand, no Line yet), headed by the door line from data', () => {
    const { u } = fight(); expect(u.mg.evoker).toBe(true); expect((G.combat as any).round).toBe(1);
    const v = screen().renderVals();
    expect(TP(v)[0].key).toBe('tp-sigils');
    const line = String(SKILL.brain_power.door_line).replace('{line_min}', String(SIGIL_GRAMMAR.min_glyphs)).replace('{line_max}', String(SIGIL_GRAMMAR.max_glyphs));
    expect(TP(v)[0]).toMatchObject({ hasDoor: true, doorLine: line, doorSkill: 'brain_power' });
    expect(line).toBe('Draw words on your own tile in a straight row of 2 to 4, then Evoke from an end or the side.');
    expect(TP(v)[0].items[0].key).toBe('draw'); expect(TP(v)[0].items[0].why).toBe('');
  });
  it('after the first turn the tab used last wins again: flipped to Move in round 1, round 2 opens on Move', () => {
    fight('ROOM-B'); const l = screen(); expect(TP(l.renderVals())[0].key).toBe('tp-sigils');
    l.setTab('move'); expect(TP(l.renderVals())[0].key).toBe('tp-move');
    (G.combat as any).round = 2; snap = view();
    expect(TP(screen().renderVals())[0].key).toBe('tp-move'); // a new turn: the remembered tab, not the door
  });
  it('the Evoker stowed (a real gear change): the tab is one row, the pack\'s Draw at its gear-change cost; the first turn no longer opens on it', () => {
    const { u } = fight('ROOM-C');
    const c0 = ch(), slot = FOCUS_IDS.evoker.includes(c0.weapon) ? 'main' : 'off';
    doAct({ type: 'combat/stow', unitId: u.id, slot }); doAct({ type: 'combat/end-turn', unitId: u.id }); // its next turn: AP back
    const cb: any = G.combat; cb.turn = cb.order.indexOf(pc().id); cb.round = 1; pc().ap = 6; snap = view();
    expect(pc().mg.evoker).toBe(false);
    // a new turn's first pick: not Sigils (its first action can't be used), so the usual rule: Attack, a hostile in sight
    const l = screen(); expect(TP(l.renderVals())[0].key).toBe('tp-attack');
    l.setTab('sigils'); const v = l.renderVals();
    const rows = TP(v)[0].items; expect(TP(v)[0].key).toBe('tp-sigils'); expect(rows.filter((r: any) => r.why === 'Needs an Evoker in hand.').length).toBe(1); expect(rows[rows.length - 1].key).toBe('scuff'); // the mirror, at the end of the tab
    const c = ch(), i = packOf(c).findIndex((it: any) => FOCUS_IDS.evoker.includes(it.weapon || it.item || it.id)); expect(i).toBeGreaterThanOrEqual(0);
    const it: any = packOf(c)[i], isWeapon = !!it.weapon, cost = gearCost(G.combat as any, pc(), c, { op: 'draw', item: i, to: isWeapon ? 'main' : 'off' } as any);
    expect(rows[0]).toMatchObject({ key: PACK_EVOKER, name: 'Needs an Evoker in hand: draw it from the pack' });
    expect(rows[0].cost.startsWith(cost.ap + ' AP')).toBe(true);
    expect(rows[0].why).toBe('Needs an Evoker in hand.');
    // the row opens the backpack
    rows[0].pick(); expect(l.state.bp).toBe(true);
  });
  it('the caster\'s token wears its charge and Flux, from its own resource rows', () => {
    const { u } = fight(); u.mg.charge = 7; u.mg.flux = 2; snap = view();
    const t = screen().renderVals().tiles.find((x: any) => x.key === pc().pos);
    expect(t).toMatchObject({ hasSgChip: true, sgChip: 'C7 F2' });
    expect(t.sgChipTitle).toMatch(/^Evoker charge 7 \/ \d+ · Flux 2 \/ \d+$/);
  });
});
