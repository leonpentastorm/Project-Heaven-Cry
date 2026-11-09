// @vitest-environment jsdom
// Spotlight cut-ins (docs/design/cutin-spec.md, decision 113): the seeded tear, the strips and captions built from the
// engine's events, merging, the player's setting, the geometry, and the effects queue's gate and slowed segment.
import { describe, expect, it, beforeEach } from 'vitest';
import { newGame, apply, ARCHETYPES, SANDBOX_PORTRAIT, type GameState, type Sheet } from '@engine';
import { hashSeed, mulberry32, stripShape, tornEdge } from './tear';
import { cutInFromFx, inkOfChar, stripForPatron, stripForChar, eyeFor, assetName, DEFAULT_EYE, captionOf, FRAMES } from './spec';
import { applyPref, showSpotlight, skipCutIn, cutInActive, cutInNow, cancelSpotlight, specFromTrigger } from './index';
import { stackLayout, cropOf, tornStripMarkup, MAX_MAGNIFY } from './layout';
import { importedEye } from '../charfile';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CutInView } from './CutInLayer';
import { CUTIN_MS, CUTIN_MAX_MS, CUTIN_TEMPO } from './timing';
import { gatesOf, slowedIn, timeline, planQueue, queueFx, clearFx, turnsBusyUntil, fxBusyUntil, setContext, forgetSpotlights, PROTECT_GRACE, MAX_SPEEDUP } from '../fx/play';
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
  it('Once per scene: a fighter\'s routine crit never uses up their strip for a bigger moment later in the fight', () => {
    const g = room().g, a = Object.keys(g.characters)[0];
    const crit = (n: number) => cutInFromFx(g, [ev(n, { kind: 'crit', via: 'weapon', char: a, unit: 'u1', target: 'e1', targetName: 'Rook', reason: 'a critical hit on Rook', scene: 'fight3', from: n - 1 })] as any)!;
    expect(crit(5).short).toBe(true);
    expect(applyPref(crit(5), 'CUT1', 'scene')).not.toBeNull();
    expect(applyPref(crit(9), 'CUT1', 'scene')).toBeNull(); // a second crit by the same fighter: held back
    const big = applyPref(spec(), 'CUT1', 'scene'); // the same fighter's boss takedown in the same fight
    expect(big).not.toBeNull(); expect(big!.strips.map((s) => s.key)).toEqual(['c:' + a]);
    expect(applyPref(spec(), 'CUT1', 'scene')).toBeNull(); // and it is once per scene in its own right
  });
});

describe('geometry', () => {
  it('one wide strip at 29vh (150–290 px) around 46% of the height; a stack within the screen', () => {
    const [one] = stackLayout(1, 1440, 900); expect(one.h).toBe(261); expect(one.top + one.h / 2).toBeCloseTo(414);
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
    expect(await showSpotlight(stripForPatron('nerukhan') ? { kind: 'god', strips: [stripForPatron('nerukhan')!], label: 'NERUKHAN' } : (null as any))).toBe('off');
    setUiPrefs({ cutins: 'all' });
  });
});

describe('review fixes (decision 113)', () => {
  beforeEach(() => { sessionStorage.clear(); clearFx(); setUiPrefs({ cutins: 'all', reduceMotion: false }); });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('planQueue: the protection holds only while the protected tail fits; past that the moment is skipped like any old effect', () => {
    const fits = planQueue(Array(30).fill(400), 7000, undefined, 10);
    expect(fits.protected).toBe(true); expect(fits.from).toBeLessThanOrEqual(10); // the tail from 10 fits the room
    const long = planQueue(Array(60).fill(400), 7000, undefined, 2); // 58 × 400 / 1.35 ≈ 17 s: past 1.5 × the room
    expect(long.protected).toBe(false); expect(long.from).toBeGreaterThan(2);
    expect((58 * 400) / MAX_SPEEDUP).toBeGreaterThan(7000 * PROTECT_GRACE);
    // A decided fight's trim (keep) still gives way to a moment whose tail fits.
    expect(planQueue(Array(30).fill(400), 7000, 6, 20)).toMatchObject({ from: 20, protected: true });
  });
  it('a gate whose action the backlog skipped shows no cut-in and holds nothing', () => {
    const { g, a } = room(); setContext(g, 'combat');
    const N = 400, evs = [...Array.from({ length: N }, (_, i) => ({ n: i + 1, k: 'shot', unit: 'u', at: 'A1', to: 'A2' })), { n: N + 1, k: 'spotlight', kind: 'takedown', char: a, targetName: 'W', from: 2, scene: 'fight1' }];
    // n 2 is far back in a 400-shot backlog: its action is skipped, so the moment is too.
    queueFx(evs as any, 'cb|long');
    expect(cutInActive()).toBe(false);
  });
  it('the decided set: a fight started over under the same stream key gets its cut-ins again', async () => {
    const { g, a } = room(); setContext(g, 'combat');
    const batch = (scene: string) => [{ n: 40, k: 'shot' }, { n: 43, k: 'spotlight', kind: 'takedown', char: a, targetName: 'W', from: 40, scene }] as any;
    const drain = () => wait(Math.max(0, fxBusyUntil() - performance.now()) + 30);
    queueFx(batch('fight1'), 'cb|pg'); expect(cutInActive()).toBe(true); skipCutIn(); await wait(250); await drain();
    queueFx(batch('fight1'), 'cb|pg'); expect(cutInActive()).toBe(false); await drain(); // the same moment: decided
    queueFx(batch('fight2'), 'cb|pg'); expect(cutInActive()).toBe(true); skipCutIn(); await wait(250); await drain(); // a new fight's
    forgetSpotlights('cb|pg'); // FxLayer: the fight's numbering restarted under the same key and scene (a Retry)
    queueFx(batch('fight2'), 'cb|pg'); expect(cutInActive()).toBe(true); skipCutIn(); await wait(250);
  });
  it('a gate preempts a cut-in already on screen, so its cut-in plays before its action, never after', async () => {
    const { g, a, b } = room(); setContext(g, 'combat');
    const story = cutInFromFx(g, [ev(5, { kind: 'crit', char: b, tn: 20, scene: 'scene1' })] as any, 'st|x')!;
    void showSpotlight(story, { prefApplied: true });
    expect(cutInNow()?.spec.kind).toBe('crit');
    queueFx([{ n: 40, k: 'shot' }, { n: 43, k: 'spotlight', kind: 'takedown', char: a, targetName: 'W', from: 40, scene: 'fight1' }] as any, 'cb|pre');
    await wait(220); // the story one's 150 ms way out
    expect(cutInNow()?.spec.kind).toBe('takedown');
    skipCutIn(); await wait(250);
  });
  it('cancelSpotlight drops a queued cut-in (it resolves off) and clears one on screen', async () => {
    const { g, a, b } = room();
    const one = cutInFromFx(g, [ev(1, { kind: 'crit', char: a, tn: 20, scene: 's1' })] as any, 'x')!;
    const two = cutInFromFx(g, [ev(2, { kind: 'crit', char: b, tn: 20, scene: 's1' })] as any, 'x')!;
    const p1 = showSpotlight(one, { prefApplied: true }), p2 = showSpotlight(two, { prefApplied: true });
    cancelSpotlight(two.id); expect(await p2).toBe('off');
    cancelSpotlight(one.id); expect(await p1).toBe('skipped'); expect(cutInActive()).toBe(false);
  });
  it('the cut-in shows the character\'s own face exactly as the HUD resolves it: the Proving Ground recruit\'s robot, never an archetype', () => {
    const { g, a } = room(), c: any = g.characters[a];
    // The recruit's placeholder robot (SANDBOX_PORTRAIT): its own picture, framed whole (a small square avatar).
    c.portrait = SANDBOX_PORTRAIT; let s = stripForChar(g, a)!;
    expect(s.img).toMatch(/wick-narrator-placeholder(-lg)?\.webp$/); expect(s.whole).toBe(true); expect(s.eye).toEqual({ x: FRAMES['wick-narrator-placeholder'].x, y: FRAMES['wick-narrator-placeholder'].y });
    // The same by its art library name; a painting keeps its eye line and its close crop.
    c.portrait = 'wick-narrator-placeholder'; expect(stripForChar(g, a)!.img).toMatch(/wick-narrator-placeholder/);
    c.portrait = 'char-m813-keel'; s = stripForChar(g, a)!; expect(s.img).toMatch(/char-m813-keel-lg\.webp$/); expect(s.whole).toBeUndefined(); expect(s.eye).toEqual(eyeFor('char-m813-keel'));
    c.portrait = '/assets/char-arch-bulwark.webp'; expect(stripForChar(g, a)!.img).toMatch(/char-arch-bulwark/);
    // Nothing that resolves (no portrait, an archived id): Wick's welcome pose, as the HUD shows it.
    for (const p of ['char-long-gone-archived', '']) { c.portrait = p; s = stripForChar(g, a)!; expect(s.img).toMatch(/wick-welcome/); expect(s.img).not.toMatch(/char-arch-/); }
  });
  it('a companion\'s crit leads with the companion\'s own face (its initials with none), in its controller\'s ink', () => {
    const { g, a } = room(), gg: any = g;
    gg.combat = { units: [{ id: 'pc-' + a, charId: a, name: 'Ana', short: 'AN' }, { id: 'cp-1', name: 'Combat drone', short: 'CO', companion: 'drone', ctrl: a, img: 'char-m813-scavenger-drone' }, { id: 'cp-2', name: 'Beast companion', short: 'BE', companion: 'beast', ctrl: a }] };
    const s1 = cutInFromFx(g, [ev(1, { kind: 'crit', char: a, unit: 'cp-1', via: 'weapon', reason: 'Combat drone: a critical hit on Rook', by: 'Combat drone' })] as any, 'x')!;
    expect(s1.short).toBe(true); expect(s1.strips[0].name).toBe('Combat drone'); expect(s1.strips[0].img).toMatch(/char-m813-scavenger-drone/);
    expect(s1.strips[0].ink).toBe(inkOfChar(g.characters[a]).ink);
    expect(s1.caption).toBe('Critical hit on Rook'); expect(s1.aria).toBe('Spotlight: Combat drone, critical hit on Rook.');
    const s2 = cutInFromFx(g, [ev(2, { kind: 'crit', char: a, unit: 'cp-2', via: 'weapon', reason: 'x', by: 'Beast companion' })] as any, 'x')!;
    expect(s2.strips[0].img).toBe(''); expect(s2.strips[0].badge).toBe('BE');
    // A character's own crit (its unit is theirs) is their strip.
    expect(cutInFromFx(g, [ev(3, { kind: 'crit', char: a, unit: 'pc-' + a, via: 'weapon', reason: 'x' })] as any, 'x')!.strips[0].key).toBe('c:' + a);
  });
  it('an interjection is labelled with the patron\'s bare name; an intervention keeps INTERVENTION', () => {
    const { g, a } = room();
    expect(cutInFromFx(g, [ev(9, { kind: 'god', patron: 'toll_keeper', char: a, reason: 'speaks', line: 'Not yet.', interject: true })] as any)!.label).toBe('THE TOLL-KEEPER');
    expect(cutInFromFx(g, [ev(9, { kind: 'god', patron: 'toll_keeper', char: a, reason: 'x' })] as any)!.label).toBe('INTERVENTION · THE TOLL-KEEPER');
    const t = specFromTrigger({ patron: 'nerukhan', char: a, line: 'Kneel.', interject: true }, g)!;
    expect(t.label).toBe(stripForPatron('nerukhan')!.name.toUpperCase()); expect(t.caption).toBe('Speaks');
  });
  it('an imported file keeps an upload\'s framing (clamped), never without its own portrait', () => {
    expect(importedEye(0.22, true)).toBe(0.22); expect(importedEye('0.3', true)).toBe(0.3);
    expect(importedEye(0.9, true)).toBe(0.7); expect(importedEye(-1, true)).toBe(0.05);
    expect(importedEye(0.22, false)).toBeUndefined(); expect(importedEye('x', true)).toBeUndefined(); expect(importedEye(null, true)).toBeUndefined();
  });
  it('the crop: never past MAX_MAGNIFY × the source, anchored to the screen edge; the image reaches past the visible edge', () => {
    const thumb = cropOf({ x: 0.5, y: 0.3 }, 128, 952, 187, 0.17, { natW: 320, anchor: 'l', l: 104, r: 972 });
    expect(thumb.capped).toBe(true); expect(thumb.w).toBeCloseTo(320 * MAX_MAGNIFY); expect(thumb.x).toBe(104);
    const right = cropOf({ x: 0.5, y: 0.3 }, 600, 1400, 187, 0.17, { natW: 320, anchor: 'r', l: 580, r: 1424 });
    expect(right.x + right.w).toBeCloseTo(1424);
    const big = cropOf({ x: 0.5, y: 0.3 }, 128, 952, 187, 0.17, { natW: 800, l: 60, r: 972 });
    expect(big.capped).toBe(false); expect(big.x).toBeLessThanOrEqual(60); expect(big.x + big.w).toBeGreaterThanOrEqual(972);
  });
  it('the Miracle\'s strip: the eyes in a left window (beside a centred mark), the image clipped to it', () => {
    const m = tornStripMarkup(stripForPatron('nerukhan')!, 'miracle|nerukhan', 1536, 160);
    const x = Number(m.match(/<image[^>]* x="([-\d.]+)"/)![1]), w = Number(m.match(/<image[^>]* width="([-\d.]+)"/)![1]);
    const eyeX = x + stripForPatron('nerukhan')!.eye.x * w;
    expect(eyeX).toBeLessThan(1536 * 0.42); // left of the screen's middle (768 in strip space is the centre)
    expect((m.match(/clipPath id=/g) || []).length).toBe(2);
  });
  it('a phone: no words in the strips; the plate under them names everyone (name and word) and the caption', () => {
    const { g, a, b } = room();
    const was = { w: innerWidth, h: innerHeight };
    Object.assign(window, { innerWidth: 390, innerHeight: 844 });
    try {
      const one = cutInFromFx(g, [ev(43, { kind: 'takedown', char: a, targetName: 'the Warden', from: 40 })] as any, 'cb|x')!;
      const html1 = renderToStaticMarkup(React.createElement(CutInView, { show: { spec: one, id: 'x', t0: 0, ms: 1400, hold: 1000, rm: false, out: false, skipped: false } }));
      expect(html1).toContain('data-phc-spotlight-plate'); expect(html1).toContain('Mallow Vey'); expect(html1).toContain('Took down the Warden');
      const four = cutInFromFx(g, [ev(9, { kind: 'god', patron: 'toll_keeper', char: a, targetChar: b, reason: 'x' })] as any, 'cb|x')!;
      const html4 = renderToStaticMarkup(React.createElement(CutInView, { show: { spec: four, id: 'y', t0: 0, ms: 1400, hold: 1000, rm: false, out: false, skipped: false } }));
      expect(html4).toContain('data-phc-spotlight-names');
      for (const s of four.strips) { expect(html4).toContain(s.name); }
      expect(html4).toContain('PATRON');
      expect(html4).not.toMatch(/text-overflow:\s*ellipsis/); // nothing is cut to a letter
      Object.assign(window, { innerWidth: 1280, innerHeight: 720 });
      const wide = renderToStaticMarkup(React.createElement(CutInView, { show: { spec: four, id: 'z', t0: 0, ms: 1400, hold: 1000, rm: false, out: false, skipped: false } }));
      expect(wide).not.toContain('data-phc-spotlight-names');
    } finally { Object.assign(window, { innerWidth: was.w, innerHeight: was.h }); }
  });
});
