// The story screen (combat feel v1): Ask only where a voice has something (Silent elsewhere), an Echo reroll that keeps
// the dice table open, and the area map's planning overlays (reachable tiles and path; an attack's red reach).
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = 'host') => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const tick = (ms = 0) => new Promise((res) => setTimeout(res, ms));

function story() {
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-main');
  doAct({ type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') });
  doAct({ type: 'session/start' });
  doAct({ type: 'narrator/begin' });
  const c = Object.values(G.characters)[0], trained = Object.entries(c.skills).filter(([, p]) => p > 0).map(([k]) => k);
  // TN 20: the passive check can't reveal it first (passive 10 + mod).
  doAct({ type: 'narrator/turn', turn: { narration: 'The rear pad.', sceneTitle: 'The pad', hooks: [{ skill: trained[0], tn: 20, truth: 'true', line: 'They will not leave you.' }] } });
  return { c, voiced: trained[0], L: new MainLogic({}) as any };
}
const allSkills = (L: any) => ['body', 'mind', 'soul'].flatMap((core) => { L.state.core = core; return L.renderVals().sheetSkills; });

describe('story screen', () => {
  it('shows Ask only on a skill with something to say; the other trained skills are Silent', () => {
    const { c, voiced, L } = story();
    const rows = allSkills(L).filter((s: any) => s.pts > 0);
    expect(rows.find((s: any) => s.key === voiced)).toMatchObject({ askLabel: 'Ask', noAsk: false });
    for (const s of rows.filter((x: any) => x.key !== voiced)) expect(s).toMatchObject({ askLabel: 'Silent', noAsk: true, askTitle: 'Nothing to say about this right now.' });
    doAct({ type: 'voice/ask', charId: c.id, skill: voiced });
    expect(allSkills(L).find((s: any) => s.key === voiced)).toMatchObject({ askLabel: 'Asked', noAsk: true });
    // The view carries skill names only, never the hooks.
    expect(viewFor(G, 'host').story.scene.hooks).toEqual([]);
  });

  it('keeps the dice table open through an Echo reroll, and past the round moving on, until Continue', async () => {
    const { c, voiced, L } = story();
    doAct({ type: 'world/act', charId: c.id, act: 'end' });
    doAct({ type: 'narrator/turn', turn: { narration: 'Keel blocks the ramp.', checks: [{ charId: c.id, skills: [voiced], tn: 20, stakes: 'Stare him down.' }] } });
    const id = G.checks[0].id;
    L.setState({ dice: id });
    doAct({ type: 'check/roll', checkId: id });
    G.characters[c.id].echo = 2;
    let r = L.renderVals();
    expect(r.rolledA).toBe(true);
    if (!G.checks[0].roll!.ok) expect(r.roll.after).toMatch(/spend 1 to throw again/);
    doAct({ type: 'check/reroll', checkId: id });
    r = L.renderVals(); await tick(); r = L.renderVals();
    expect(r.dice).toBe(true); expect(r.rolledB).toBe(true); expect(r.roll.math).toMatch(/^Echo reroll \(was \d+\)/); expect(r.noReroll).toBe(true);
    doAct({ type: 'narrator/turn', turn: { narration: 'He steps aside.' } }); // the round moves on and clears the checks
    expect(G.checks.length).toBe(0);
    await tick(); r = L.renderVals(); expect(r.dice).toBe(true);
    r.closeDice(); await tick(260); expect(L.renderVals().dice).toBe(false);
  });

  it('plans on the area map: reachable tiles and a path with its AP; an attack shows its reach in red', () => {
    const { L } = story();
    L.setState({ area: true, wAct: 'move' });
    let r = L.renderVals();
    const reach = r.areaCells.filter((x: any) => x.hasPlan);
    expect(reach.length).toBeGreaterThan(0);
    L.setState({ hoverTile: reach[reach.length - 1].key }); r = L.renderVals();
    expect(r.areaCells.find((x: any) => x.hasCost).cost).toMatch(/^−\d+ AP · \d+ tiles?$/);
    expect(r.areaCells.some((x: any) => x.hasArrow)).toBe(true);
    L.setState({ wAct: 'melee' }); r = L.renderVals();
    const melee = r.areaCells.filter((x: any) => x.hasPlan);
    expect(melee.length).toBeGreaterThan(0); expect(melee.length).toBeLessThanOrEqual(8);
    expect(melee.every((x: any) => /246, 81, 87/.test(x.planStyle))).toBe(true);
    L.setState({ wAct: 'shot' }); r = L.renderVals();
    expect(r.areaCells.filter((x: any) => x.hasPlan).length).toBeGreaterThan(melee.length);
  });
});
