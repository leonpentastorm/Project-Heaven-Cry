// @vitest-environment jsdom
// Spotlight cut-ins (docs/design/cutin-spec.md, decision 110): the seeded tear, the strips and captions built from the
// engine's events, merging, the player's setting, the geometry, and the effects queue's gate and slowed segment.
import { describe, expect, it, beforeEach } from 'vitest';
import { newGame, apply, ARCHETYPES, type GameState, type Sheet } from '@engine';
import { hashSeed, mulberry32, stripShape, tornEdge } from './tear';
import { cutInFromFx, inkOfChar, stripForPatron, stripForChar, eyeFor, assetName, DEFAULT_EYE, captionOf } from './spec';
import { applyPref, showCutIn, skipCutIn, cutInActive, specFromTrigger } from './index';
import { stackLayout, cropOf, tornStripMarkup } from './layout';
import { CUTIN_MS, CUTIN_MAX_MS, CUTIN_TEMPO } from './timing';
import { gatesOf, slowedIn, timeline, planQueue, queueFx, clearFx, turnsBusyUntil, setContext } from '../fx/play';
import { setUiPrefs } from '../sfx';
import { ATTR_INK } from '../classView';

const sheet = (name: string, portrait = '/assets/char-arch-bulwark.webp'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === 'sharpshooter') || ARCHETYPES[0];
  return { name, portrait, origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
function room(): { g: GameState; a: string; b: string } {
  let g = newGame('CUT1', { id: 'host', name: 'Host' }, 'cut-seed');
  g = apply(g, { type: 'char/add', sheet: sheet('Mallow Vey') }, 'host');
  g = apply(g, { type: 'char/add', sheet: { ...sheet('Ana Rell', 'data:image/jpeg;base64,AAAA'), portraitEye: 0.3 } as any }, 'host');
  const [a, b] = Object.keys(g.characters);
  return { g, a, b };
}
const ev = (n: number, x: any) => ({ n, k: 'spotlight', scene: 'fight1', reason: '', ...x });

describe('the tear', () => {
  it('is seeded: the same seed tears the same way, another seed differently', () => {
    expect(stripShape('cb|x|40', 1200, 240)).toEqual(stripShape('cb|x|40', 1200, 240));
    expect(stripShape('cb|x|40', 1200, 240).body).not.toEqual(stripShape('cb|x|41', 1200, 240).body);
    expect(hashSeed('a')).toBe(hashSeed('a'));
    const r1 = mulberry32(7), r2 = mulberry32(7); expect([r1(), r1()]).toEqual([r2(), r2()]);
  });
  it('tears inward 3–22 px, about one point every 28 px', () => {
    const e = tornEdge(mulberry32(3), 0, 1400, 10, 1);
    expect(e.length).toBeGreaterThanOrEqual(45); expect(e.length).toBeLessThanOrEqual(55);
    for (const [, y] of e) { expect(y).toBeGreaterThanOrEqual(13); expect(y).toBeLessThanOrEqual(32.1); }
  });
});

describe('strips and captions', () => {
  it('a character: the large portrait, its eye line, the ink of the highest attribute (word beside it)', () => {
    const { g, a } = room(), s = stripForChar(g, a)!;
    expect(assetName('/assets/char-arch-bulwark.webp')).toBe('char-arch-bulwark');
    expect(s.eye).toEqual(eyeFor('char-arch-bulwark'));
    expect(s.ink).toBe(ATTR_INK[inkOfChar(g.characters[a]).attr]);
    expect(s.word).toBe(inkOfChar(g.characters[a]).name);
  });
  it('an upload takes the sheet\'s framing (portraitEye), else the default', () => {
    const { g, b } = room();
    expect(stripForChar(g, b)!.eye).toEqual({ x: 0.5, y: 0.3 });
    delete (g.characters[b] as any).portraitEye; expect(stripForChar(g, b)!.eye).toEqual(DEFAULT_EYE);
  });
  it('a tie in attributes goes to the class\'s attribute, else the tree order', () => {
    const c: any = { attrs: { endurance: 3, agility: 3, virtue: 1 } };
    expect(inkOfChar(c).attr).toBe('endurance');
    expect(inkOfChar({ ...c, classId: 'marksman' }).attr).toMatch(/agility|endurance/);
  });
  it('a patron: either id form, the data accent, the painted portrait', () => {
    const p = stripForPatron('toll_keeper')!, q = stripForPatron('the_toll_keeper')!;
    expect(p.key).toBe(q.key); expect(p.god).toBe(true); expect(p.ink).toBe('#79BDB6'); expect(p.name).toBe('The Toll-Keeper');
    expect(p.eye.y).toBeLessThan(0.3);
  });
  it('one takedown: one strip, the label with the attribute word, the caption with the target', () => {
    const { g, a } = room();
    const s = cutInFromFx(g, [ev(43, { kind: 'takedown', char: a, targetName: 'Warden', from: 40 })] as any, 'cb|x')!;
    expect(s.strips).toHaveLength(1); expect(s.label).toBe('TAKEDOWN · ' + inkOfChar(g.characters[a]).name.toUpperCase());
    expect(s.caption).toBe('Took down Warden'); expect(s.seed).toBe('cb|x|43');
  });
  it('a takedown and a revive in one action merge: the takedown leads, both named, the revived ally gets a strip', () => {
    const { g, a, b } = room();
    const s = cutInFromFx(g, [ev(44, { kind: 'revive', char: a, targetChar: b, targetName: 'Ana Rell' }), ev(43, { kind: 'takedown', char: a, targetName: 'Warden' })] as any)!;
    expect(s.kind).toBe('takedown'); expect(s.strips.map((x) => x.name)).toEqual(['Mallow Vey', 'Ana Rell']);
    expect(s.caption).toBe('Took down Warden · brought Ana Rell back');
  });
  it('a god: the patron\'s strip first, the line in quotes, INTERVENTION · the patron', () => {
    const { g, a } = room();
    const s = cutInFromFx(g, [ev(9, { kind: 'god', patron: 'toll_keeper', char: a, reason: 'Ana stays at 1 HP', line: 'Not yet.' })] as any)!;
    expect(s.strips[0].god).toBe(true); expect(s.strips[1].name).toBe('Mallow Vey');
    expect(s.label).toBe('INTERVENTION · THE TOLL-KEEPER'); expect(s.line).toBe('Not yet.'); expect(s.caption).toBe('Ana stays at 1 HP');
  });
  it('four strips at most, then "+N more"', () => {
    const { g, a, b } = room();
    const s = cutInFromFx(g, [ev(1, { kind: 'god', patron: 'nerukhan', char: a, group: [b] }), ev(2, { kind: 'god', patron: 'old_overcast', char: a }), ev(3, { kind: 'god', patron: 'mother_ember', char: a })] as any)!;
    expect(s.strips).toHaveLength(4); expect(s.more).toBe(1); expect(s.caption).toMatch(/\+1 more$/);
  });
  it('captions: a crit names the skill and the TN word; an Ultimate never names its perk', () => {
    expect(captionOf({ kind: 'crit', skill: 'composure', tn: 20 })).toBe('Natural 20 on Composure · Heroic');
    expect(captionOf({ kind: 'crit', tn: 16 })).toBe('Natural 20 · Hard');
    expect(captionOf({ kind: 'ultimate', perk: 'secret_thing' })).toBe('An Ultimate, earned');
    expect(captionOf({ kind: 'takedown' })).toBe('Took down an unseen hostile');
  });
  it('nothing to show: no known character or patron', () => expect(cutInFromFx(room().g, [ev(1, { kind: 'crit', char: 'nobody' })] as any)).toBeNull());
  it('the trigger shorthand builds the strips itself', () => {
    const { g, a } = room();
    const s = specFromTrigger({ kind: 'god', patron: 'nerukhan', char: a, line: 'Kneel.' }, g)!;
    expect(s.strips[0].key).toBe('p:nerukhan'); expect(s.line).toBe('Kneel.');
  });
});

describe('the player\'s setting', () => {
  beforeEach(() => { sessionStorage.clear(); });
  const spec = () => cutInFromFx(room().g, [ev(1, { kind: 'takedown', char: Object.keys(room().g.characters)[0], targetName: 'W', scene: 'fight3' })] as any)!;
  it('Off shows nothing', () => expect(applyPref(spec(), 'CUT1', 'off')).toBeNull());
  it('Once per scene: a character\'s strip once per scene, again in the next', () => {
    expect(applyPref(spec(), 'CUT1', 'scene')).not.toBeNull();
    expect(applyPref(spec(), 'CUT1', 'scene')).toBeNull();
    expect(applyPref({ ...spec(), scene: 'fight4' }, 'CUT1', 'scene')).not.toBeNull();
  });
  it('All shows every one', () => { expect(applyPref(spec(), 'CUT1', 'all')).not.toBeNull(); expect(applyPref(spec(), 'CUT1', 'all')).not.toBeNull(); });
});

describe('geometry', () => {
  it('one wide strip at 26vh (150–280 px) around 46% of the height; a stack within the screen', () => {
    const [one] = stackLayout(1, 1440, 900); expect(one.h).toBe(234); expect(one.top + one.h / 2).toBeCloseTo(414);
    const four = stackLayout(4, 1440, 900, [true, false, false, false]);
    expect(four[0].h).toBeGreaterThan(four[1].h); expect(four[3].top + four[3].h).toBeLessThan(900);
    expect(four.map((x) => x.fromLeft)).toEqual([true, false, true, false]);
  });
  it('the crop puts the eyes on the strip\'s middle line and always covers the window', () => {
    const c = cropOf({ x: 0.5, y: 0.25 }, 120, 1000, 234);
    expect(c.y + 0.25 * c.h).toBeCloseTo(117); expect(c.x).toBeLessThanOrEqual(100); expect(c.x + c.w).toBeGreaterThanOrEqual(1020);
    const top = cropOf({ x: 0.5, y: 0.05 }, 0, 800, 234); expect(top.y).toBe(0); // eyes near the top: the image never leaves a gap
  });
  it('the Miracle\'s strip markup is plain SVG with the portrait clipped to the body', () => {
    const m = tornStripMarkup(stripForPatron('nerukhan')!, 'miracle|nerukhan', 1200, 220);
    expect(m.startsWith('<svg')).toBe(true); expect(m).toContain('clip-path'); expect(m).toContain('<image');
  });
});

describe('timing', () => {
  it('1400 ms for one strip, capped at 1600 for many; reduced motion 1000; the gate\'s cap above them', () => {
    expect(CUTIN_MS(1)).toBe(1400); expect(CUTIN_MS(4, true)).toBe(1600); expect(CUTIN_MS(2, false, true)).toBe(1000);
    expect(CUTIN_MAX_MS).toBeGreaterThan(CUTIN_MS(4, true)); expect(CUTIN_TEMPO).toBe(0.85);
  });
});

describe('the effects queue\'s gate (fx/play.ts)', () => {
  const batch = [{ n: 40, k: 'shot' }, { n: 41, k: 'hurt' }, { n: 42, k: 'down' }, { n: 43, k: 'spotlight', kind: 'takedown', from: 40 }, { n: 44, k: 'turn' }, { n: 45, k: 'move' }] as any[];
  it('a gate stands before the action the moment happened in; its slowed segment is that action', () => {
    const [gate] = gatesOf([{ n: 38, k: 'move' }, ...batch] as any);
    expect(gate).toMatchObject({ at: 1, from: 40, to: 43 });
    expect(batch.filter((e) => slowedIn(e, gate)).map((e) => e.n)).toEqual([40, 41, 42]);
    expect(gatesOf(batch as any, (e) => e.n === 43)).toHaveLength(0); // already decided
  });
  it('the slowed segment plays 1/0.85 as long; the rest at its own speed', () => {
    const beats = [400, 260, 380, 0, 140, 200];
    const t = timeline(batch as any, beats, 0, 1, { from: 40, to: 43 });
    expect(t[1] - t[0]).toBeCloseTo(400 / 0.85); expect(t[5] - t[4]).toBe(140);
  });
  it('a decided fight\'s trim never skips the spotlight\'s action', () => {
    expect(planQueue(Array(30).fill(400), 7000, 6, 10).from).toBe(10);
    expect(planQueue(Array(30).fill(400), 7000, 6).from).toBe(24);
  });
  it('the input hold covers the cut-in, and the gate opens (the cut-in clears) within the cap', async () => {
    clearFx(); setUiPrefs({ cutins: 'all', reduceMotion: false });
    const { g, a } = room(); setContext(g, 'combat');
    const now = performance.now();
    queueFx([{ n: 40, k: 'shot' }, { n: 43, k: 'spotlight', kind: 'takedown', char: a, targetName: 'W', from: 40, scene: 'fight1' }] as any, 'cb|gate');
    expect(turnsBusyUntil()).toBeGreaterThanOrEqual(now + CUTIN_MS(1) - 50);
    expect(cutInActive()).toBe(true);
    skipCutIn();
    await new Promise((r) => setTimeout(r, 250));
    expect(cutInActive()).toBe(false);
    expect(turnsBusyUntil()).toBeLessThanOrEqual(performance.now() + 1);
    clearFx();
  });
  it('Off: no gate, no hold, no cut-in', () => {
    clearFx(); setUiPrefs({ cutins: 'off' });
    const { g, a } = room(); setContext(g, 'combat');
    queueFx([{ n: 40, k: 'shot' }, { n: 43, k: 'spotlight', kind: 'takedown', char: a, from: 40, scene: 'fight1' }] as any, 'cb|off');
    expect(cutInActive()).toBe(false); expect(turnsBusyUntil()).toBeLessThanOrEqual(performance.now() + 1);
    setUiPrefs({ cutins: 'all' }); clearFx();
  });
  it('the client door honours Off', async () => {
    setUiPrefs({ cutins: 'off' });
    expect(await showCutIn(stripForPatron('nerukhan') ? { kind: 'god', strips: [stripForPatron('nerukhan')!], label: 'NERUKHAN' } : (null as any))).toBe('off');
    setUiPrefs({ cutins: 'all' });
  });
});
