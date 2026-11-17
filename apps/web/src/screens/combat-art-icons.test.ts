// 0.31.x art: the fight's action rows wear the delivered icons (game/doorArt.ts), through the real screen. Harness as
// combat-door.test.ts. Was: the Sigils door on the combat screen (nine doors audit, 0.29): a Sigilist's first turn of a fight opens on the Sigils
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
let ARCH = 'infiltrator';
function fight(room = 'ROOM') {
  snap = null; G = newGame(room, { id: 'host', name: 'Leon' }, 'door-ui');
  doAct({ type: 'char/add', sheet: sheetFrom(ARCH, 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
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


import { actionIconOf } from '../game/doorArt';
describe('the action rows show their icons', () => {
  it('the SHADOW tab: each verb row carries its delivered icon', () => {
    ARCH = 'infiltrator'; fight('ART-A'); const l = screen(); l.renderVals(); l.setTab('shadow');
    const items = TP(l.renderVals())[0].items as any[];
    const dbg = [JSON.stringify((l.renderVals().turnPanels[0].tabs || []).map((t: any) => t.key || t.id)), ...items.map((a) => a.key + '=' + (a.hasIcon ? 'Y' : 'N'))];
    expect(items.filter((a) => a.key.startsWith('pk:verb:shadow.')).length, dbg.join(' ')).toBeGreaterThan(0);
    for (const a of items) { expect(a.icon, a.key).toBe(actionIconOf(a.key)); if (a.key.startsWith('pk:verb:shadow.')) expect(a.hasIcon, dbg.join(' ')).toBe(true); }
  });
  it('the ATTACK tab: a technique row carries its technique icon', () => {
    ARCH = 'infiltrator'; fight('ART-B'); const l = screen(); l.renderVals(); l.setTab('attack');
    const items = TP(l.renderVals())[0].items as any[];
    const tq = items.filter((a) => a.key.startsWith('tq:'));
    expect(tq.length).toBeGreaterThan(0);
    expect(tq.some((a) => a.hasIcon && a.icon.includes('/assets/tech-')), tq.map((a) => a.key).join(' ')).toBe(true);
  });
});
