// The 50-hour, four-player campaign (spec: The Narrator's memory): a synthetic save with everything a long campaign
// piles up, to prove a Narrator call stays inside its cost ceiling and still finds what matters.
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, builtInCampaign, memoryOf, applyMemOp, noteScene, rollChapter, recall, selectMemory, type GameState } from '@engine';
import { callEstimate, COST_CEILING_USD } from './anthropic';
import { turnPrompt, memoryPrompt, campaignPrompt } from './context';

const rnd = (() => { let s = 7; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })();
const W = 'ash vault signal ledger oath engine ward relay crown tide harbour chapel rust saint debt furnace orbit glass archive blade'.split(' ');
const words = (n: number) => Array.from({ length: n }, () => W[Math.floor(rnd() * W.length)]).join(' ');
const NAMES = Array.from({ length: 250 }, (_, i) => ['Varga', 'Ostrel', 'Kade', 'Mirren', 'Tolle', 'Sabine', 'Dusk', 'Hollis', 'Rook', 'Penna'][i % 10] + ' ' + ['Kessel', 'Vane', 'Arro', 'Lisk', 'Dorn', 'Marrow', 'Quill', 'Fenn', 'Hale', 'Strand', 'Brask', 'Coyle', 'Tamsin', 'Wick', 'Orr', 'Lune', 'Pell', 'Ravel', 'Soot', 'Thane', 'Ulm', 'Voss', 'Wren', 'Yarrow', 'Zell'][Math.floor(i / 10)]);

export function longGame(): GameState {
  let g = newGame('LONG50', { id: 'p1', name: 'Host' }, 'long');
  for (let i = 2; i <= 4; i++) g = apply(g, { type: 'player/join', id: 'p' + i, name: 'Player ' + i }, 'p1');
  ARCHETYPES.filter((a: any) => a.family !== 'all_in').slice(0, 4).forEach((a: any, i: number) => {
    g = apply(g, { type: 'char/add', sheet: { name: 'Hero ' + (i + 1), portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } }, 'p' + (i + 1));
  });
  // A big campaign: 32 zones in 4 acts, 40 prepared fights, 60 cast entries, long lore.
  const base = builtInCampaign('m813')!;
  const zones = Array.from({ length: 32 }, (_, i) => ({ ...JSON.parse(JSON.stringify(base.zones[i % 4])), id: 'z' + i, name: 'Zone ' + i + ' ' + words(2), summary: words(30), exits: [] }));
  g.campaign = { ...base, id: 'astra', title: 'Long campaign', startZone: 'z0', zones, moments: [], narratorLore: ['truth', 'worlds'],
    acts: [0, 1, 2, 3].map((a) => ({ id: 'a' + a, title: 'Act ' + (a + 1), summary: words(40), zones: zones.slice(a * 8, a * 8 + 8).map((z) => z.id) })),
    encounters: Array.from({ length: 40 }, (_, i) => ({ name: 'Fight ' + i, zone: 'z' + (i % 32), when: words(15), difficulty: 'standard', enemies: [{ name: 'Guard', tier: 'soldier', weapon: 'service_pistol' }] })),
    cast: Array.from({ length: 60 }, (_, i) => ({ name: NAMES[i], role: words(3), text: words(25) })), lore: words(2500) } as any;
  g.settings.start = 'astra';
  g = apply(g, { type: 'session/start' }, 'p1');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Begin.' } as any }, 'p1');
  // 300 scenes of memory.
  const m = memoryOf(g);
  for (let sc = 1; sc <= 300; sc++) {
    g.story.scene.n = sc;
    noteScene(g, 'Scene ' + sc + ' ' + words(2), words(90));
    if (m.scenes.length >= 8) rollChapter(g, { title: 'Chapter at ' + sc, summary: words(180), saga: words(520) });
    for (let k = 0; k < 5; k++) applyMemOp(g, { op: 'fact', text: words(30), about: [NAMES[Math.floor(rnd() * 250)]], importance: 1 + Math.floor(rnd() * 5) });
    if (sc <= 250) applyMemOp(g, { op: 'person', name: NAMES[sc - 1], role: words(4), where: 'z' + (sc % 32), attitude: Math.floor(rnd() * 7) - 3, notes: words(40), importance: 1 + Math.floor(rnd() * 5) });
    if (sc % 2 === 0 && sc <= 360) applyMemOp(g, { op: 'thread', title: 'Thread ' + sc + ' ' + words(3), kind: 'quest', status: rnd() < 0.25 ? 'open' : 'done', who: [NAMES[Math.floor(rnd() * 250)]], text: words(35), update: words(12), importance: 1 + Math.floor(rnd() * 5) });
    if (sc % 10 === 0) applyMemOp(g, { op: 'faction', name: 'Faction ' + (sc / 10), change: Math.floor(rnd() * 40) - 20, notes: words(10) });
  }
  applyMemOp(g, { op: 'thread', title: 'The debt to Varga Kessel', kind: 'debt', status: 'open', who: ['Varga Kessel'], text: 'The party owes Varga Kessel a ship.', importance: 3 });
  for (let i = 0; i < 10; i++) applyMemOp(g, { op: 'pin', text: words(18) });
  g.story.scene.n = 301;
  // 12,000 archived lines and a full live log of long lines.
  g.archive = Array.from({ length: 12000 }, (_, i) => ({ id: 'a' + i, kind: i % 3 ? 'narration' : 'player', text: words(60), head: i % 3 ? undefined : 'Hero ' + (1 + (i % 4)) })) as any;
  g.story.entries = Array.from({ length: 400 }, (_, i) => ({ id: 'e' + i, kind: i % 2 ? 'narration' : 'player', text: words(90), head: 'Hero 1' })) as any;
  g.story.entries.push({ id: 'last', kind: 'player', text: 'Where is Varga Kessel? We still owe them.', head: 'Hero 2' } as any);
  g.story.await = 'narrator'; g.story.work = { kind: 'round' };
  return g;
}

describe('a 50-hour, four-player campaign', () => {
  const g = longGame();
  it('the memory piled up like a long campaign', () => {
    const m = memoryOf(g);
    expect(m.chapters.length).toBeGreaterThan(35); expect(m.people.length).toBe(250); expect(m.facts.length).toBeGreaterThan(1400);
    expect(g.archive!.length).toBe(12000);
  });
  it('one call on Sonnet 5.5 stays under the cost ceiling, even with nothing cached', () => {
    const e = callEstimate(g, 'claude-sonnet-5-5');
    console.log('50h call: stable', e.stable, 'tokens, turn', e.turn, 'tokens; worst $' + e.worstUsd.toFixed(3), 'warm $' + e.warmUsd.toFixed(3));
    expect(e.worstUsd).toBeLessThan(COST_CEILING_USD / 2); // room for lookups inside the ceiling
    expect(e.warmUsd).toBeLessThan(0.12);
    expect(e.stable + e.turn).toBeLessThan(45000);
  });
  it('the campaign block carries only the current act', () => {
    const c = campaignPrompt(g);
    expect(c).toContain('▶ NOW: Act 1'); expect(c).toContain('z9: Zone 9'); expect(c).not.toMatch(/Fight 9 in z9/);
  });
  it('a name from long ago comes back when the players mention it', () => {
    const sel = selectMemory(g, 'Where is Varga Kessel? We still owe them.', 9000);
    expect(sel.people.map((p) => p.name)).toContain('Varga Kessel');
    expect(sel.threads.map((t) => t.title)).toContain('The debt to Varga Kessel');
    expect(turnPrompt(g)).toContain('The debt to Varga Kessel');
  });
  it('recall finds it in everything, fast', () => {
    const t0 = performance.now(), hits = recall(g, 'Varga Kessel debt ship');
    expect(performance.now() - t0).toBeLessThan(1500);
    expect(hits[0].text).toMatch(/Varga Kessel/);
  });
  it('the long memory block holds the saga, the last chapters and the pins', () => {
    const p = memoryPrompt(g);
    expect(p).toContain('THE STORY SO FAR'); expect(p.match(/^Chapter \d+/gm)!.length).toBe(4); expect(p).toContain('PLOT ESSENTIALS');
  });
});
