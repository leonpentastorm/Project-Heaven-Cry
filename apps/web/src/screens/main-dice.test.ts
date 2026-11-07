// The dice table in a room (playtest 7 Nov 2026): a check the Narrator calls for one character pops up only for the
// player who owns it; the others get a "Waiting for … to roll …" line, and watch the roll land once it is thrown.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
let ME = 'host';
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: ME }, role: ME === 'host' ? 'host' : 'player', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = ME) => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const tick = (ms = 0) => new Promise((res) => setTimeout(res, ms));
const as = (who: string, L: any) => { ME = who; return L.renderVals(); };

describe('dice table in a room', () => {
  it('only the owner gets the table before the roll; everyone watches once it is thrown', async () => {
    G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-dice');
    doAct({ type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    doAct({ type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    doAct({ type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
    doAct({ type: 'session/start' }, 'host');
    doAct({ type: 'narrator/begin' }, 'host');
    const seven = Object.values(G.characters).find((c) => c.owner === 'p2')!, sk = Object.entries(seven.skills).find(([, p]) => p > 0)![0];
    doAct({ type: 'narrator/turn', turn: { narration: 'Keel blocks the ramp.', checks: [{ charId: seven.id, skills: [sk], tn: 12, stakes: 'Talk past him.' }] } }, 'host');
    const id = G.checks[0].id;
    const host = new MainLogic({}) as any, mai = new MainLogic({}) as any;
    // Before the roll: the host sees a waiting line, no table.
    let r = as('host', host); expect(r.dice).toBe(false); expect(r.waitRolls.map((w: any) => w.text)[0]).toMatch(/^Waiting for Seven to roll /);
    // The owner's table pops up by itself.
    as('p2', mai); await tick(); r = as('p2', mai); expect(r.dice).toBe(true); expect(r.watching).toBe(false); expect(r.canThrow).toBe(true);
    // Mai throws: the host's table opens on the same roll.
    ME = 'p2'; r.throwDie();
    r = as('host', host); expect(r.dice).toBe(true); expect(r.watching).toBe(true); expect(r.rolled).toBe(true); expect(r.waitRolls).toHaveLength(0);
    expect(r.roll.die).toBe(G.checks[0].roll!.die);
    // Mai accepts: the host keeps watching the result until they close it.
    ME = 'p2'; doAct({ type: 'check/accept', checkId: id });
    r = as('host', host); expect(r.dice).toBe(true);
    r.watchClose(); await tick(260); expect(as('host', host).dice).toBe(false);
  });
});
