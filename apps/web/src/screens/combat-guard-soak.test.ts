// @vitest-environment jsdom
// Outside playtest of 0.31.10, row 13 (docs/design/proposals/2026-11-18-outside-playtest/TRIAGE.md): the SHIELDS block
// read 7 a plate while the Guard row and the soak itself were 9. The screen asked the engine's shieldsView with no game
// bound, so Pain Threshold's feed (which reads the unit's character) fell to nothing. Every soak the fight screen shows is
// the one the damage path spends (guardSoakOf, with the game bound).
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, active, withGame, shieldsView, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {},
  act: (a: any) => { try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');

describe('row 13: the Guard soak the screen shows is the one the blow spends', () => {
  it('a Durability 8, Pain Threshold 4 tank holding Guard: every soak in the fight screen equals the engine soak with the game bound (guardSoakOf, what the damage path spends)', () => {
    snap = null; G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'guard-soak');
    const a = ARCHETYPES[0];
    const sheet: Sheet = { name: 'Tank', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any;
    doAct({ type: 'char/add', sheet }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
    const c: any = Object.values(G.characters)[0]; c.skills.durability = 8; c.skills.pain_threshold = 4;
    doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } } as any);
    const u: any = G.combat!.units.find((x) => x.charId === c.id); u.res = { ...(u.res || {}), guard: 3 }; u.resMax = { ...(u.resMax || {}), guard: 4 }; snap = view();
    const want = withGame(G, () => shieldsView(G.combat!, u))!.guard!, bare = shieldsView(G.combat!, u).guard!; // bare: what the screen read before, no game bound
    expect(want.soak).toBeGreaterThan(bare.soak); // the feed matters for this build, so the test can tell the two apart
    expect(want.line).not.toBe(bare.line);
    const L = new CombatLogic({}) as any; const r = L.renderVals();
    const texts: string[] = []; const seen = new Set<any>();
    const walk = (o: any) => { if (typeof o === 'string') { texts.push(o); return; } if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o); for (const v of Object.values(o)) walk(v); };
    walk(r);
    expect(texts.some((t) => t.includes(want.line!))).toBe(true);
    expect(texts.some((t) => t.includes(bare.line!))).toBe(false);
    expect(active(G.combat!)).toBeTruthy();
  });
});
