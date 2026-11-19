// @vitest-environment jsdom
// Outside playtest of 0.31.10, row 14 (docs/design/proposals/2026-11-18-outside-playtest/TRIAGE.md): a refused action's
// reason was printed twice in the Chosen action box ("Needs 2 AP. · Needs 2 AP.") on every door. Every action of a
// character with all nine doors open, picked with too few AP: the box's text and its extra line never say a part twice.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {},
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');

const DOORS = ['durability', 'raw_power', 'dexterity', 'ingenuity', 'brain_power', 'visualization', 'empathy', 'will_power', 'faith'];
function fight() {
  snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'reason-once');
  const a = ARCHETYPES[0];
  const sheet: Sheet = { name: 'MPAT', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any;
  doAct({ type: 'char/add', sheet }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c: any = Object.values(G.characters)[0];
  for (const d of DOORS) c.skills[d] = Math.max(c.skills[d] || 0, 5);
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } } as any);
}
const norm = (s: string) => s.trim().replace(/[.\s]+$/, '').toLowerCase();

describe('row 14: the Chosen action box says a refusal once', () => {
  it('every action picked with 1 AP: no part of the extra line is already in the text', () => {
    fight();
    const L = new CombatLogic({}) as any;
    for (let i = 0; i < 6 && active(G.combat!)!.side !== 'pc'; i++) doAct({ type: 'combat/end-turn', unitId: active(G.combat!)!.id });
    const u = active(G.combat!)!; expect(u.side).toBe('pc');
    G.combat!.units.find((x) => x.id === u.id)!.ap = 1; snap = view();
    const keys: string[] = L.renderVals().turnPanels[0].groups.flatMap((gr: any) => gr.items.map((i: any) => i.key)).filter(Boolean);
    expect(keys.length).toBeGreaterThan(10);
    const twice: string[] = [];
    for (const k of keys) {
      L.setState({ action: k }); const sel = L.renderVals().turnPanels[0].sel; if (!sel) continue;
      const text = norm(String(sel.text || '')), parts = String(sel.extra || '').split(' · ').map(norm).filter(Boolean);
      for (const p of parts) if (text.includes(p)) twice.push(k + ': ' + sel.text + ' | ' + sel.extra);
    }
    expect(twice).toEqual([]);
  });
});
