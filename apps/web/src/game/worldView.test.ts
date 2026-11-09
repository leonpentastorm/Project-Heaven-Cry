// World Play 1.7 on screen (game/worldView.ts, game/sandboxWorld.ts, fx/world.ts): the looks and words the map and the
// panels draw, built on a real Proving Ground game placed through the WORLD tools' actions and read through a player's view.
import { describe, expect, it } from 'vitest';
import { type GameState, type Action, newGame, apply, viewFor, positionsOf, refOf, keyOf, zoneMap, FAIL_HURT, WORLD_AP, hazardTilesFor } from '@engine';
import { kindBadge, hazardCells, hazardLegend, hazardHit, markerCells, cacheLook, holdsText, failWords, approachRows, talkVals, hazardVals, hereVals, carriedRows, loadLine,
  carryTargets, putDownTiles, nearItems, worldLayer, objectRows, HAZARD_LOOK, NOT_PERSON } from './worldView';
import { npcAction, blankNpc, cacheAction, blankCache, hazardAction, blankHazard, triggerAction, blankTrigger, objectiveAction, blankObjective, avatarChoices, approachOf, blankApproach } from './sandboxWorld';
import { worldWord, worldBeat, worldLine } from './fx/world';

const H = 'host';
const ap = (g: GameState, a: Action) => apply(g, a, H);
const ink = () => '#FFFFFF', art = (id: string) => (id ? '/assets/' + id + '.webp' : '');
function pg(): GameState {
  let g = newGame('WPB', { id: H, name: 'Leon' }, 'world-play-b');
  g = ap(g, { type: 'sandbox/start', standalone: true } as Action);
  g = ap(g, { type: 'sandbox/clear' } as Action);
  return g;
}
const me = (g: GameState) => Object.values(g.characters)[0];
const at = (g: GameState) => positionsOf(g)[me(g).id];
const off = (g: GameState, dx: number, dy: number) => { const [x, y] = at(g).split(',').map(Number); return refOf((x + dx) + ',' + (y + dy)); };
const V = (g: GameState) => viewFor(g, H);
/** A Proving Ground with a robot next to us that knows the objective, a cache beside it, and the objective. */
function scene() {
  let g = pg();
  const [x0] = at(g).split(',').map(Number), dx = x0 > 3 ? -1 : 1;
  g = ap(g, objectiveAction({ ...blankObjective(), id: 'core', text: 'Find the core' }));
  g = ap(g, npcAction({ ...blankNpc(), name: 'Hum', objective: 'core', hint: 'In the crate.', hintAt: off(g, dx, 1) }, off(g, dx, 0)));
  g = ap(g, cacheAction(blankCache(), off(g, dx, 1)));
  return { g, dx };
}

describe('the WORLD tools build real actions', () => {
  it('a robot with an avatar from its pool, wants, knows and a talk approach', () => {
    const { g } = scene(), n = (g.story.npcs || []).find((x) => x.name === 'Hum')!;
    expect(n.kind).toBe('robot');
    expect(avatarChoices('robot')).toContain(n.avatar);
    expect(n.wants).toMatch(/workshop/);
    expect(n.knows?.hint).toBe('In the crate.');
    expect(n.talk?.[0]).toMatchObject({ label: 'Talk them round', skills: ['eloquence'], tn: 12, success: 'inform', fail: 'hostile' });
    expect(avatarChoices('beast')).toEqual([]);
  });
  it('a cache, a hazard rectangle, a trigger and an objective with where', () => {
    let { g, dx } = scene();
    g = ap(g, hazardAction(blankHazard(), off(g, 3 * dx, -1), off(g, 3 * dx, 1)));
    g = ap(g, triggerAction(blankTrigger(), off(g, 0, 3), off(g, 1, 3)));
    expect((g.story.hazards || [])[0]).toMatchObject({ kind: 'minefield', severity: 'light' });
    expect((g.story.hazards || [])[0].tiles.length).toBe(3);
    expect((g.story.triggers || [])[0]).toMatchObject({ when: 'enter', then: 'fight' });
    expect((g.story.triggers || [])[0].spawn?.length).toBe(2);
    const c = (g.story.objects || []).find((o) => o.kind === 'cache')!;
    expect(c.items?.map((i) => i.item)).toEqual(['stim_injector', 'ration_pack']);
    expect(approachOf(blankApproach({ success: 'advance', objective: 'core', fail: 'condition', failCondition: 'shaken' }))).toMatchObject({ objective: 'core', failCondition: 'shaken' });
  });
});

describe('the map layer', () => {
  it('kind badges: robots and beasts carry one, people none; things are never recast', () => {
    expect(kindBadge('robot')).toMatchObject({ has: true, text: 'BOT', title: 'ROBOT' });
    expect(kindBadge('beast').text).toBe('BST');
    expect(kindBadge('human').has).toBe(false);
    expect(kindBadge(undefined).has).toBe(false);
    expect([...NOT_PERSON].sort()).toEqual(['beast', 'drone', 'machine', 'robot']);
  });
  it('hazard tiles: each kind its ink and glyph, safe tiles green and dashed, spent mines a crater; a legend word for each', () => {
    const tiles = [{ id: 'h1', kind: 'minefield', severity: 'light', name: 'Minefield', tile: '1,1', safe: false, spent: false }, { id: 'h1', kind: 'minefield', severity: 'light', name: 'Minefield', tile: '1,2', safe: true, spent: false },
      { id: 'h1', kind: 'minefield', severity: 'light', name: 'Minefield', tile: '1,3', safe: false, spent: true }, { id: 'h2', kind: 'fire', severity: 'heavy', name: 'Fire', tile: '2,1', safe: false, spent: false }] as any;
    const c = hazardCells(tiles);
    expect(c.get('1,1')!.layer).toContain('246, 81, 87'); expect(c.get('1,1')!.glyph).toBe('✱');
    expect(c.get('1,2')!.layer).toContain('dashed #6FEA77'); expect(c.get('1,2')!.glyph).toBe('✓');
    expect(c.get('1,3')!.glyph).toBe('◌');
    expect(c.get('2,1')!.title).toMatch(/Fire \(heavy\).*20 damage and Burning/);
    expect(hazardLegend(tiles).map((l) => l.key)).toEqual(['hz-minefield', 'hz-fire', 'hz-safe', 'hz-spent']);
    for (const k of Object.keys(HAZARD_LOOK)) expect(HAZARD_LOOK[k].word).toBeTruthy();
    expect(hazardHit('minefield', 'light')).toMatch(/25 damage \(a save halves it\); it stops your move/);
  });
  it('markers are white with a word; caches show a count, then EMPTY', () => {
    const m = markerCells([{ id: 'a', kind: 'hint', objective: 'x', text: 'In the crate.', tile: '3,3', ref: 'D4' }, { id: 'b', kind: 'objective', objective: 'x', text: 'Find it', tile: '3,3', ref: 'D4' }]);
    expect(m.get('3,3')).toMatchObject({ text: '◆', chip: 'OBJ' }); expect(m.get('3,3')!.style).toContain('#FFFFFF');
    expect(m.get('3,3')!.title).toMatch(/Hint: In the crate\.[\s\S]*Objective: Find it/);
    expect(cacheLook({ id: 'o', kind: 'cache', pos: '1,1', name: 'Crate', text: '', approaches: [], items: [], itemCount: 3 } as any)).toMatchObject({ glyph: '▣', chip: '×3' });
    expect(cacheLook({ id: 'o', kind: 'cache', pos: '1,1', name: 'Crate', text: '', approaches: [], items: [], itemCount: 0, searched: true } as any).chip).toBe('EMPTY');
    expect(holdsText(2)).toMatch(/Holds 2 things/); expect(holdsText(0, true)).toMatch(/nothing left/);
  });
  it('a player\'s view: the cache and the person on the map, never a hidden hazard', () => {
    let { g, dx } = scene();
    g = ap(g, hazardAction({ ...blankHazard(), hidden: true }, off(g, 4 * dx, 0), off(g, 4 * dx, 0)));
    g = ap(g, hazardAction({ ...blankHazard(), kind: 'fire' }, off(g, 3 * dx, 0), off(g, 3 * dx, 0)));
    const L = worldLayer(V(g));
    const crate = (V(g).story.objects || []).find((o) => o.kind === 'cache')!;
    expect(L.cells.get(crate.pos)!.cache!.chip).toBe('×2');
    expect(L.tiles.map((t) => t.kind)).toEqual(['fire']);
    expect(hazardTilesFor(g, 'all').length).toBe(2);
  });
});

describe('the panels', () => {
  it('failure in plain words, by TN and kind', () => {
    expect(failWords('hurt', 12)).toBe(FAIL_HURT[12] + ' damage (armour helps)');
    expect(failWords('alarm', 12)).toMatch(/raises the alarm/);
    expect(failWords('condition', 12, { failCondition: 'shaken' })).toMatch(/Shaken/);
    expect(failWords('lose', 12, { failItem: 'the key' })).toBe('you lose the key');
    expect(failWords('hazard', 12, null, { kind: 'minefield', severity: 'heavy' })).toMatch(/45 damage/);
    expect(failWords('', 12)).toMatch(/nothing worse/);
  });
  it('the Talk panel: the asks (no roll), the talk approach with odds and effects; wants and the hint once told', () => {
    let { g } = scene();
    const n = (g.story.npcs || []).find((x) => x.name === 'Hum')!;
    let t = talkVals(V(g), n.id, me(g).id, art, ink)!;
    expect(t.kicker).toMatch(/^ROBOT · NEUTRAL/);
    expect(t.img).toBe('/assets/' + n.avatar + '.webp');
    expect(t.rows.map((r) => r.label)).toEqual(['Ask what they want', 'Ask about the objective', 'Talk them round']);
    expect(t.rows[0]).toMatchObject({ tn: 'NO ROLL', cost: WORLD_AP.ask + ' AP', off: false });
    expect(t.rows[2].odds).toMatch(/^\d+%$/); expect(t.rows[2].fail).toBe('Fail: they turn hostile'); expect(t.rows[2].success).toMatch(/marker on the map/);
    expect(t.hasWants).toBe(false); expect(t.canCarry).toBe(true);
    g = ap(g, { type: 'talk/ask', charId: me(g).id, npcId: n.id, what: 'wants' } as Action);
    g = ap(g, { type: 'talk/ask', charId: me(g).id, npcId: n.id, what: 'objective' } as Action);
    t = talkVals(V(g), n.id, me(g).id, art, ink)!;
    expect(t.wants).toMatch(/workshop/); expect(t.hint).toBe('Told you: In the crate.');
    // The hint's marker and the HERE card.
    const L = worldLayer(V(g)), crate = (g.story.objects || []).find((o) => o.kind === 'cache')!;
    expect(L.cells.get(crate.pos)!.mark!.chip).toBe('HINT');
    const here = hereVals(V(g));
    expect(here.has).toBe(true); expect(here.rows[0].text).toBe('Find the core'); expect(here.day).toBe('DAY 1');
    expect(hereVals(V({ ...g, day: 12 } as any)).day).toBe('DAY 12');
    expect(here.rows[0].steps.map((s) => s.text).join(' ')).toMatch(/Hum: "In the crate\."/);
    // busy overrides: a reason on every row.
    expect(talkVals(V(g), n.id, me(g).id, art, ink, 'Wait for the round to open.')!.rows.every((r) => r.off && r.why === 'Wait for the round to open.')).toBe(true);
  });
  it('a hazard\'s ways through: "Vigilant or Sensory", odds, and failing a disarm gets you', () => {
    let { g, dx } = scene();
    g = ap(g, hazardAction(blankHazard(), off(g, dx, -1), off(g, dx, -1)));
    const h = (g.story.hazards || [])[0], v = hazardVals(V(g), h.id, me(g).id, ink)!;
    expect(v.kicker).toMatch(/^MINEFIELD · LIGHT · TN 12/);
    expect(v.rows.length).toBe(2);
    expect(v.rows[0].skills[0].name).toMatch(/ or /);
    expect(v.rows.every((r) => /^\d+%$/.test(r.odds))).toBe(true);
    expect(v.rows[1].fail).toMatch(/it gets you: 25 damage/);
  });
  it('object rows carry odds and effects (a locked cache\'s way in)', () => {
    let { g } = scene();
    g = ap(g, cacheAction({ ...blankCache(), name: 'Strongbox', locked: true, way: blankApproach({ label: 'Force it', skill: 'raw_power', tn: 16, success: 'open', fail: 'hurt' }) }, off(g, 0, 2)));
    const box = (g.story.objects || []).find((o) => o.name === 'Strongbox')!, rows = objectRows(V(g), box.id, me(g).id, ink);
    expect(rows[0]).toMatchObject({ label: 'Force it', success: 'Success: opens it', fail: 'Fail: ' + FAIL_HURT[16] + ' damage (armour helps)' });
  });
});

describe('carrying and near you', () => {
  it('near you: talk, carry and search buttons; carried entries with weight; put down on a free tile next to you', () => {
    let { g } = scene();
    const n = (g.story.npcs || []).find((x) => x.name === 'Hum')!;
    const near = nearItems(V(g), me(g).id).map((x) => x.kind + ':' + x.label);
    expect(near).toEqual(expect.arrayContaining(['npc:Talk to Hum', 'carry:Carry Hum · 1 AP', 'cache:Search Supply crate · 1 AP']));
    expect(carryTargets(V(g), me(g).id).map((x) => x.id)).toEqual([n.id]);
    g = ap(g, { type: 'world/act', charId: me(g).id, act: 'carry', targetId: n.id } as Action);
    const rows = carriedRows(V(g).characters[me(g).id], art);
    expect(rows).toEqual([expect.objectContaining({ name: 'Hum', kind: 'robot', kg: '40 kg', badge: 'BOT', hasImg: true })]);
    expect(loadLine(V(g).characters[me(g).id]).text).toMatch(/^Carrying 40 kg/);
    const tiles = putDownTiles(V(g), me(g).id);
    expect(tiles.length).toBeGreaterThan(0);
    g = ap(g, { type: 'world/act', charId: me(g).id, act: 'put_down', targetId: n.id, to: tiles[0] } as Action);
    expect((g.story.npcs || []).find((x) => x.id === n.id)!.pos).toBe(tiles[0]);
    expect(nearItems(V(g), me(g).id).some((x) => x.kind === 'npc')).toBe(true);
    void keyOf; void zoneMap;
  });
});

describe('the effects', () => {
  it('each World Play event has a word and a beat; others are left to play.ts', () => {
    expect(worldWord({ k: 'hazard', kind: 'minefield' } as any)).toBe('MINE!');
    expect(worldWord({ k: 'hazard', kind: 'fire', immune: true } as any)).toBe('IMMUNE');
    expect(worldWord({ k: 'trigger', then: 'fight' } as any)).toBe('AMBUSH!');
    expect(worldWord({ k: 'search', items: 2 } as any)).toBe('FOUND 2 THINGS');
    expect(worldWord({ k: 'safe_path' } as any)).toBe('SAFE PATH');
    for (const k of ['carry', 'put_down', 'drop', 'search', 'hazard', 'hazard_spotted', 'hazard_placed', 'hazard_gone', 'safe_path', 'trigger', 'alarm', 'approach', 'talk', 'marker']) expect(worldBeat({ n: 1, k } as any)).toBeGreaterThan(0);
    expect(worldBeat({ n: 1, k: 'shot' } as any)).toBeUndefined();
    expect(worldLine({ k: 'trigger', then: 'fight', spawned: ['a', 'b'] } as any)).toBe('⚠ Ambush! 2 appear: the fight starts.');
    expect(worldLine({ k: 'alarm', revealed: ['a'] } as any)).toBe('⚠ The alarm is up: 1 hidden hostile wakes.');
  });
});
