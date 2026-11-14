// Rules 1.39 (Survival build step 1; docs/design/survival-spec.md rules 1 to 4 and 36, section 8.1): the mode a room
// plays (settings.play, data/modes.json), the run's state g.run, run/start and run/retire through the one reducer with
// their refusals in words, and an old save reading as a campaign.
import { describe, expect, it } from 'vitest';
import { type Action, type GameState, newGame, apply, RuleError, viewFor, migrateLoaded, MODES, DEFAULT_PLAY, OLD_SAVE_PLAY, modeOf, playOf, runSeed } from '../src';
import { sheetOf } from './helpers/perkfight';
import modesJ from '../../../data/modes.json';

const HOST = 'host', P2 = 'p2';
const refused = (g: GameState, a: Action, by = HOST) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
/** A new room as the client opens one: newGame, then the room's default mode (data/modes.json default). */
const room = (): GameState => { const g = newGame('RUN001', { id: HOST, name: 'Leon' }, 'seed-run'); g.settings.play = DEFAULT_PLAY; return g; };
const join = (g: GameState, id: string, name: string) => apply(g, { type: 'player/join', id, name }, HOST);
const add = (g: GameState, by: string, name: string) => apply(g, { type: 'char/add', sheet: sheetOf({ name }) }, by);
/** Two players, one character each, in a Survival room's lobby. */
const squad = () => add(add(join(room(), P2, 'Mai'), HOST, 'Kade'), P2, 'Ha');
/** Start the run and close the camp at once (rules 1.52: the host's close; untouched loadouts take the Recommended one). */
const start = (g: GameState, seed?: string) => apply(apply(g, { type: 'run/start', ...(seed ? { seed } : {}) }, HOST), { type: 'run/ready', close: true }, HOST);
/** A run standing after a Boss (the boon pick): no path map exists before step 2, so the state is set as it will be. */
const afterBoss = (g: GameState, state: 'boon' | 'tile' = 'boon') => { const x: GameState = JSON.parse(JSON.stringify(g)); x.run!.state = state; x.run!.path = ['s1n1', 's1n2', 's1n3']; return x; };

describe('the modes (data/modes.json)', () => {
  it('three, in the picker\'s order; only Survival is open, and it is the default; an old save reads as a campaign', () => {
    expect(MODES.map((m) => m.id)).toEqual(['survival', 'roguelike', 'campaign']);
    expect(MODES.filter((m) => m.available).map((m) => m.id)).toEqual(['survival']);
    expect(DEFAULT_PLAY).toBe((modesJ as any).default); expect(DEFAULT_PLAY).toBe('survival');
    expect(OLD_SAVE_PLAY).toBe('campaign');
    for (const m of MODES) if (!m.available) expect(m.coming).toBeTruthy();
    expect(modeOf('survival')!.narrator).toBe('optional'); expect(modeOf('campaign')!.narrator).toBe('required');
  });
  it('the host picks an open mode in the lobby; a locked one is refused with its data\'s words; a guest is refused', () => {
    let g = join(room(), P2, 'Mai');
    expect(refused(g, { type: 'settings', patch: { play: 'campaign' } })).toBe('Campaign is not open yet.');
    expect(refused(g, { type: 'settings', patch: { play: 'roguelike' } })).toBe('Roguelike is not open yet.');
    expect(refused(g, { type: 'settings', patch: { play: 'nonsense' as any } })).toBe('No such mode: nonsense.');
    expect(refused(g, { type: 'settings', patch: { play: 'survival' } }, P2)).toBe('Only the host changes room settings.');
    g = apply(g, { type: 'settings', patch: { play: 'survival' } }, HOST);
    expect(g.settings.play).toBe('survival');
  });
  it('a room already on a locked mode (an old save) keeps it; it can leave it for Survival but not come back', () => {
    let g = room(); g.settings.play = 'campaign';
    g = apply(g, { type: 'settings', patch: { play: 'campaign', tone: 'Pulp' } }, HOST); // its own mode: no change, no refusal
    expect(g.settings.play).toBe('campaign');
    g = apply(g, { type: 'settings', patch: { play: 'survival' } }, HOST);
    expect(refused(g, { type: 'settings', patch: { play: 'campaign' } })).toMatch(/^Campaign is not open yet/);
  });
  it('the mode is picked in the lobby only', () => {
    const g = start(squad());
    expect(refused(g, { type: 'settings', patch: { play: 'campaign' } })).toBe('The mode is picked in the lobby.');
  });
});

describe('run/start', () => {
  it('starts the run: g.run at stage 1 on the map, the room out of the lobby, session 1 begun, no Narrator work', () => {
    const g0 = squad(), g = start(g0, 'PHC-0001');
    expect(g.phase).toBe('story');
    // rules 1.41: the run holds stage 1's tile and its path map (survival-run.test.ts checks them)
    expect({ ...g.run, nodes: [], world: [] }).toEqual({ seed: 'PHC-0001', stage: 1, world: [], nodes: [], at: null, path: [], state: 'map', leans: {}, ready: {}, offers: null, shop: null, stats: { fights: [] }, out: [], renown: 0, last: null, note: null, loadout: null, // rules 1.52: the camp closed
      stages: [{ stage: 1, setting: 'ahoc', nodes: 0, fights: 0, won: 0, kills: 0, credits: 0, steps: 0, boons: {} }] }); // rules 1.44: the stage's log
    expect(g.run!.nodes.length).toBeGreaterThan(0); expect(g.run!.world).toHaveLength(1);
    expect(g.sessionN).toBe(1); expect(g.story.await).toBe('none'); expect(g.story.work).toBeNull(); expect(g.narrator.busy).toBe(false);
    expect(g.story.entries.some((e) => /^The run begins at stage 1 \(seed PHC-0001\) on AHOC chapter outpost\. At the camp/.test(e.text))).toBe(true); expect(g.story.entries.at(-1)!.text).toBe('The squad leaves the camp. Choose your first stop.'); // rules 1.52
    for (const c of Object.values(g.characters)) { expect(c.level).toBe(1); expect(c.echo).toBe(1); }
    expect(g0.run).toBeUndefined(); // the state given is untouched
  });
  it('with no seed given, one from the room: the same on a replay', () => {
    const a = start(squad()), b = start(squad());
    expect(a.run!.seed).toMatch(/^PHC-[0-9A-Z]{6}$/); expect(a.run!.seed).toBe(b.run!.seed);
    expect(runSeed('RUN001', 1)).not.toBe(runSeed('RUN001', 2));
  });
  it('the views carry the run to every player; a guest\'s view throws nothing', () => {
    const g = start(squad(), 'PHC-0001');
    expect(viewFor(g, HOST).run!.seed).toBe('PHC-0001'); expect(viewFor(g, P2).run!.state).toBe('map');
  });
  it('refusals, in words', () => {
    const g = squad();
    expect(refused(g, { type: 'run/start' }, P2)).toBe('Only the host starts the run.');
    expect(refused(join(room(), P2, 'Mai'), { type: 'run/start' })).toBe('Lock in a character to start.');
    expect(refused(add(join(room(), P2, 'Mai'), HOST, 'Kade'), { type: 'run/start' })).toBe('Mai has no character locked in yet.');
    // an offline player without a character doesn't hold the room up
    expect(start(apply(add(join(room(), P2, 'Mai'), HOST, 'Kade'), { type: 'player/online', id: P2, online: false }, HOST)).run).toBeTruthy();
    expect(refused(add(add(room(), HOST, 'Kade'), HOST, 'Kade 2'), { type: 'run/start' })).toBe('In Survival each player brings one character. Leon has 2: take one back.');
    const high: GameState = JSON.parse(JSON.stringify(g)); Object.values(high.characters)[1].level = 4;
    expect(refused(high, { type: 'run/start' })).toBe('Survival starts at level 1. Ha is level 4: bring a new character.');
    const camp: GameState = JSON.parse(JSON.stringify(g)); camp.settings.play = 'campaign';
    expect(refused(camp, { type: 'run/start' })).toBe('This room plays Campaign. Pick Survival to start a run.');
    const old: GameState = JSON.parse(JSON.stringify(g)); delete old.settings.play; // a save from before modes: a campaign
    expect(refused(old, { type: 'run/start' })).toBe('This room plays Campaign. Pick Survival to start a run.');
    expect(refused(start(g), { type: 'run/start' })).toBe('The run is under way.');
  });
  it('a Survival room has no story: session/start is refused (and an old room with no mode still starts its story)', () => {
    expect(refused(squad(), { type: 'session/start' })).toBe('This room plays Survival: Start begins a run, not a story.');
    const old: GameState = JSON.parse(JSON.stringify(squad())); delete old.settings.play;
    expect(apply(old, { type: 'session/start' }, HOST).phase).toBe('story');
  });
  it('during a run the Narrator\'s and the story\'s actions are refused, as in the Proving Ground', () => {
    const g = start(squad());
    const no = 'A Survival run has no Narrator and no story: the engine runs it, node by node.';
    for (const a of [{ type: 'narrator/turn', turn: { narration: 'Hi.' } }, { type: 'story/speak', text: 'Hello.' }, { type: 'session/next' }, { type: 'campaign/load', campaign: {} }] as Action[]) expect(refused(g, a)).toBe(no);
    expect(refused(g, { type: 'sandbox/start' })).toBe('Open the Proving Ground from the room, before the session starts.');
  });
  it('an unknown run action is refused by name', () => {
    expect(refused(start(squad()), { type: 'run/fly' } as any)).toBe('No such run action: run/fly.');
  });
});

describe('run/retire', () => {
  it('the host retires after a Boss: the run is over and keeps the score', () => {
    for (const st of ['boon', 'tile'] as const) {
      const g = apply(afterBoss(start(squad(), 'PHC-0001'), st), { type: 'run/retire' }, HOST);
      expect(g.run!.state).toBe('over');
      const ids = Object.keys(g.characters);
      expect(g.run!.end).toMatchObject({ how: 'retired', stage: 1, cleared: 1, nodes: 3, levels: { [ids[0]]: 1, [ids[1]]: 1 }, renown: 0 }); // rules 1.44: and the boons and the stages' log
      expect(g.story.entries.at(-1)!.text).toBe('The squad retires: 1 stage cleared, 3 stops walked. The score is kept.');
      expect(g.run!.leans).toEqual({}); expect(g.run!.offers).toBeNull();
    }
  });
  it('refusals, in words', () => {
    expect(refused(squad(), { type: 'run/retire' })).toBe('No run is under way.');
    const g = start(squad());
    expect(refused(g, { type: 'run/retire' })).toBe('You can retire only after beating a stage\'s Boss.');
    expect(refused(afterBoss(g), { type: 'run/retire' }, P2)).toBe('Only the host retires the run.');
    const over = apply(afterBoss(g), { type: 'run/retire' }, HOST);
    expect(refused(over, { type: 'run/retire' })).toBe('The run is over.');
  });
  it('a retired run is over and the room is back in its lobby (rules 1.41); a new run needs level 1 characters', () => {
    const over = apply(afterBoss(start(squad())), { type: 'run/retire' }, HOST);
    expect(over.phase).toBe('lobby'); expect(over.run!.state).toBe('over');
    expect(apply(over, { type: 'run/start' }, HOST).run!.state).toBe('loadout'); // these two are still level 1 (rules 1.52: the camp first)
  });
});

describe('saves (the old saves reading as a campaign: old-save.test.ts)', () => {
  it('a run survives a save and a load (JSON), and a reload resumes in its mode', () => {
    const g = start(squad(), 'PHC-0003'), back = migrateLoaded(JSON.parse(JSON.stringify(g)));
    expect(back.settings.play).toBe('survival'); expect(back.run).toEqual(g.run);
    expect(apply(afterBoss(back), { type: 'run/retire' }, HOST).run!.end!.how).toBe('retired');
  });
});
