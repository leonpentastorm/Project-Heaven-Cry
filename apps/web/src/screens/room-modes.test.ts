// The Room's mode picker (rules 1.39; docs/design/survival-spec.md section 8.1, Leon's sketch): three cards from
// data/modes.json; the host picks an open one; a locked card or a guest's click picks nothing and says why through the
// one hover card; the chips row is gone (the campaign's starts show only in a Campaign room); the Narrator panel is
// collapsed, not hidden, in Survival; Start begins a run there.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { newGame, MODES, type GameState } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '', origin: 'http://localhost', pathname: '/' });
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } });
const fresh = (): GameState => { const g = newGame('ROOM02', { id: 'host', name: 'Leon' }); g.settings.play = 'survival'; return g; };
let G: GameState = fresh(), role = 'host', me = 'host';
const narrator: any = { provider: 'anthropic', key: '', model: 'claude-opus-5-5', baseUrl: '', effort: 'medium', remember: false, scripted: false };
const act = vi.fn(), toast = vi.fn(), openTipOn = vi.fn();
vi.mock('../game/store', () => ({
  getState: () => ({ game: G, me: { id: me, name: me }, role, code: 'ROOM02', conn: 'online', library: [], narrator, savedAt: 0 }),
  act: (a: any) => act(a), go: () => {}, leaveRoom: () => {}, saveNow: () => {}, setNarrator: () => {}, toast: (t: string) => toast(t), retryNarrator: () => {},
}));
vi.mock('../game/actionTip', async (orig) => ({ ...(await orig() as any), openTipOn: (el: any) => openTipOn(el) }));
vi.mock('../game/report', () => ({ openReport: () => {} }));
vi.mock('../game/charfile', () => ({ importCharacter: async () => null }));
vi.mock('../game/sandbox', () => ({ openProvingGround: () => {}, leaveProvingGround: () => {} }));
const { RoomLogic } = await import('./room.js');
const { modeCards, testPlay, newRoomPlay, radioKey } = await import('../game/modes');
const vals = (state: any = {}) => { const L: any = new RoomLogic({}); L.state = { ...L.state, ...state }; return L.renderVals(); };
const html = async (v: any) => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { parseTemplate, renderTemplate } = await import('../dc/runtime');
  const { readFileSync } = await import('node:fs');
  return renderToStaticMarkup(renderTemplate(parseTemplate(readFileSync(new URL('../templates/room.template.html', import.meta.url), 'utf8')), v) as any);
};
const kade = { c1: { id: 'c1', owner: 'host', name: 'Kade', level: 1, origin: '', skills: {}, attrs: {}, portrait: '' } as any };

beforeEach(() => { G = fresh(); role = 'host'; me = 'host'; act.mockClear(); toast.mockClear(); openTipOn.mockClear(); for (const k of Object.keys(store)) delete store[k]; });

describe('the mode picker: three cards from data', () => {
  it('SURVIVAL, ROGUELIKE, CAMPAIGN in order, each with its data line; Survival selected, the other two locked and saying "Coming"', () => {
    const c = vals().modeCards;
    expect(c.map((m: any) => m.name)).toEqual(['SURVIVAL', 'ROGUELIKE', 'CAMPAIGN']);
    expect(c.map((m: any) => m.line)).toEqual(MODES.map((m) => m.line));
    expect(c.map((m: any) => m.checked)).toEqual(['true', 'false', 'false']);
    expect(c.map((m: any) => m.status)).toEqual(['Selected', 'Coming', 'Coming']);
    expect(c.map((m: any) => m.locked)).toEqual([false, true, true]);
    expect(c[1].tip).toBe('Not open yet.'); expect(c[2].tip).toBe('Not open yet.');
    expect(c[1].aria).toBe('Roguelike, locked, coming');
  });
  it('a locked card picks nothing: its click opens its own hover card with the reason (no toast, no action)', () => {
    const c = vals().modeCards, el = { id: 'card' };
    c[2].onClick({ currentTarget: el });
    expect(act).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled(); expect(openTipOn).toHaveBeenCalledWith(el);
  });
  it('the host picks an open card through the settings action; the selected card sends nothing again', () => {
    G = fresh(); G.settings.play = 'campaign'; store['phc.testPlay'] = 'campaign'; // a test room on Campaign (the hook)
    const c = vals().modeCards;
    c[0].onClick({ currentTarget: {} });
    expect(act).toHaveBeenCalledWith({ type: 'settings', patch: { play: 'survival' } });
    act.mockClear(); c[2].onClick({ currentTarget: {} }); expect(act).not.toHaveBeenCalled();
  });
  it('a guest sees the host\'s pick and can\'t pick: "Only the host picks this." in the hover card', () => {
    role = 'guest'; me = 'p2'; G.players.push({ id: 'p2', name: 'Mai', initials: 'MA', color: '#FF9EC7', online: true });
    store['phc.testPlay'] = 'campaign'; // even with Campaign open on this page
    G.settings.play = 'campaign';
    const c = vals().modeCards;
    expect(c[2].checked).toBe('true'); expect(c[0].tip).toBe('Only the host picks the mode.');
    c[0].onClick({ currentTarget: {} }); expect(act).not.toHaveBeenCalled(); expect(openTipOn).toHaveBeenCalled();
    expect(vals().modeWho).toBe('THE HOST PICKS');
  });
  it('a room on a locked mode (an old save) shows it selected and locked: "Selected · Coming"', () => {
    G.settings.play = 'campaign';
    const c = vals().modeCards;
    expect(c[2].checked).toBe('true'); expect(c[2].status).toBe('Selected · Coming'); expect(c[2].locked).toBe(true);
    expect(c[0].pick).toBeTruthy(); // Survival can still be picked
  });
  it('arrows move between the cards (a radio group); only the selected one is in the tab order', () => {
    expect(radioKey('ArrowRight', 2, 3)).toBe(0); expect(radioKey('ArrowLeft', 0, 3)).toBe(2); expect(radioKey('ArrowDown', 0, 3)).toBe(1); expect(radioKey('a', 0, 3)).toBeNull();
    expect(vals().modeCards.map((m: any) => m.tabindex)).toEqual(['0', '-1', '-1']);
  });
  it('the test hook opens Campaign and new rooms on it; a player\'s page has none', () => {
    expect(testPlay()).toBeNull(); expect(newRoomPlay()).toBe('survival');
    store['phc.showCampaigns'] = '["m813"]'; expect(testPlay()).toBe('campaign'); expect(newRoomPlay()).toBe('campaign');
    expect(modeCards(G, true, () => {})[2].locked).toBe(false);
  });
});

describe('the room around the picker', () => {
  it('the chips row is gone in Survival; a Campaign room shows its starts under the cards', async () => {
    let h = await html({ ...vals(), hostAI: true });
    expect(h).toContain('role="radiogroup"'); expect(h).not.toContain('WHERE IT STARTS'); expect(h).not.toContain('Load a campaign file');
    expect((h.match(/role="radio"/g) || []).length).toBe(3);
    expect(h).toContain('aria-checked="true"'); expect(h).toContain('>Selected<'); expect(h).toContain('>Coming<');
    G.settings.play = 'campaign'; store['phc.testPlay'] = 'campaign';
    h = await html({ ...vals(), hostAI: true });
    expect(h).toContain('WHERE IT STARTS'); expect(h).toContain('Load a campaign file');
  });
  it('a card with no painting yet draws the plain panel with the AHOC seal', async () => {
    const v = vals();
    expect(v.modeCards[0].noArt).toBe(true); // survival-card-title is art_pending
    expect(v.seal).toBeTruthy();
  });
  it('the Narrator panel is collapsed, not hidden, in Survival; the host can open it; Campaign opens it as before', async () => {
    let v = vals();
    expect(v.narrCollapsed).toBe(true); expect(v.narrOpen).toBe(false);
    expect(v.narrNone).toBe('Survival needs no Narrator.'); expect(v.narrAddLabel).toBe('Add a Narrator for flavour (optional)');
    const h = await html({ ...v, hostAI: true });
    expect(h).toContain('Survival needs no Narrator.'); expect(h).not.toContain('data-narrator-key');
    v = vals({ narrOpen: true }); expect(v.narrOpen).toBe(true); expect(v.narrCanHide).toBe(true);
    expect(await html({ ...v, hostAI: true })).toContain('data-narrator-key');
    G.settings.play = 'campaign'; v = vals(); expect(v.narrCollapsed).toBe(false); expect(v.narrOpen).toBe(true); expect(v.narrCanHide).toBe(false);
  });
  it('Start begins the run in Survival and needs no key; in a Campaign room it starts the session and asks for the key', () => {
    G.characters = kade;
    let v = vals();
    expect(v.startLabel).toBe('Start the run'); expect(v.notReady).toBe(false);
    v.startSession(); expect(act).toHaveBeenCalledWith({ type: 'run/start' });
    G.settings.play = 'campaign'; v = vals();
    expect(v.startLabel).toMatch(/API key/); expect(v.notReady).toBe(true);
  });
  it('the Proving Ground is a text button under the cards, not a fourth card', async () => {
    const v = vals(); expect(v.proveLabel).toMatch(/^⚔ Proving Ground · practice range/);
    const h = await html({ ...v, hostAI: true });
    expect(h.indexOf('Proving Ground')).toBeGreaterThan(h.indexOf('role="radiogroup"'));
    expect(h).not.toMatch(/role="radio"[^>]*data-phc-mode="proving/);
  });
  it('a run under way shows its panel in place of the cards; Retire only after a Boss, host only', () => {
    G = { ...fresh(), phase: 'story', run: { seed: 'PHC-0001', stage: 1, world: [], nodes: [], at: null, path: [], state: 'map', leans: {}, ready: {}, offers: null, shop: null, stats: { fights: [] }, out: [], renown: 0 } } as any;
    let v = vals();
    expect(v.showModes).toBe(false); expect(v.runOn).toBe(true); expect(v.run.kicker).toBe('SURVIVAL · STAGE 1 · SEED PHC-0001'); expect(v.run.canRetire).toBe(false);
    (G as any).run.state = 'boon'; v = vals(); expect(v.run.canRetire).toBe(true);
    v.run.retire(); expect(act).toHaveBeenCalledWith({ type: 'run/retire' });
    role = 'guest'; me = 'p2'; expect(vals().run.canRetire).toBe(false);
  });
});
