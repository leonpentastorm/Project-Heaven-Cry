// @vitest-environment jsdom
// Spotlight cut-ins meet Faith 2.2 (docs/design/cutin-spec.md section 12, decision 113): one stage for the Miracle's
// scene and the torn strips, a Miracle's own action shows only the Miracle, hurryFx leaves a gate's cut-in alone, and the
// intervention's map effect draws no second cut-in.
import { describe, expect, it, beforeEach } from 'vitest';
import { FAITH_PATRON } from '@engine';
import { showSpotlight, cutInActive, cutInNow, skipCutIn, stripForPatron } from './index';
import { takeStage, stageBusy, stageBox, claimStage, resetStage } from '../stage';
import { queueFx, clearFx, sameAction, hurryFx, fxBusyUntil, turnsBusyUntil } from '../fx/play';
import { playIntervention } from '../cutIn';
import { accentOf, FAITH_GOLD, faceOf, patronPortrait } from '../faithArt';
import { setUiPrefs } from '../sfx';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const spec = (k = 'nerukhan') => ({ kind: 'god' as const, strips: [stripForPatron(k)!], label: 'INTERVENTION', scene: 'fight1' });

describe('one stage: the Miracle and the strips never draw over each other', () => {
  beforeEach(() => { clearFx(); resetStage(); setUiPrefs({ cutins: 'all', reduceMotion: false } as any); });
  it('a Miracle coming on clears a strip on screen at once', async () => {
    showSpotlight(spec(), { prefApplied: true }); expect(cutInActive()).toBe(true);
    const land = takeStage(); expect(cutInActive()).toBe(false); expect(stageBusy()).toBe(true);
    land(); expect(stageBusy()).toBe(false);
  });
  it('a strip that comes while the Miracle\'s scene is up waits for its landing', async () => {
    const land = takeStage();
    const p = showSpotlight(spec(), { prefApplied: true });
    expect(cutInActive()).toBe(false);
    land(); expect(cutInActive()).toBe(true); expect(cutInNow()!.spec.kind).toBe('god');
    skipCutIn(); expect(await p).toBe('skipped');
  });
  it('a strip that starts while the Miracle\'s box is up closes the box first', () => {
    let closed = 0; stageBox(() => { closed++; });
    showSpotlight(spec(), { prefApplied: true }); expect(closed).toBe(1);
    claimStage(); expect(closed).toBe(1); // asked once only
    skipCutIn();
  });
  it('a spotlight in the Miracle\'s own action is decided: the queue shows only the Miracle (no gate, no strip)', () => {
    const evs: any[] = [
      { n: 10, k: 'pray', unit: 'u1' }, { n: 11, k: 'miracle', patron: 'nerukhan', char: 'c1', at: '3,3' }, { n: 12, k: 'down', unit: 'boss' },
      { n: 13, k: 'spotlight', kind: 'god', patron: 'nerukhan', char: null, from: 10, scene: 'fight1', reason: 'intervenes' },
    ];
    // without the Miracle the same spotlight gates the queue and shows its strip
    queueFx([evs[0], evs[2], { ...evs[3] }], 'cb|m0'); expect(cutInActive()).toBe(true); clearFx(); resetStage();
    expect(sameAction(evs[3], evs[1])).toBe(true);
    expect(sameAction({ n: 20, k: 'spotlight', from: 15 } as any, evs[1])).toBe(false);
    queueFx(evs, 'cb|m1');
    expect(cutInActive()).toBe(false);
    clearFx();
  });
});

describe('hurryFx (a skipped Miracle) and the gate', () => {
  beforeEach(() => { clearFx(); resetStage(); setUiPrefs({ cutins: 'all', reduceMotion: false } as any); });
  it('leaves a gate\'s cut-in on screen alone: its hold and the queue stay as they were', () => {
    const evs: any[] = [{ n: 1, k: 'shot', unit: 'u1' }, { n: 2, k: 'spotlight', kind: 'god', patron: 'nerukhan', char: null, from: 1, scene: 'fight1', reason: 'intervenes' }, { n: 3, k: 'turn', unit: 'e1' }];
    queueFx(evs, 'cb|h1');
    expect(cutInActive()).toBe(true);
    const busy = turnsBusyUntil(), end = fxBusyUntil();
    hurryFx(1000);
    expect(turnsBusyUntil()).toBeGreaterThanOrEqual(busy - 1); expect(fxBusyUntil()).toBeGreaterThanOrEqual(end - 1);
    clearFx(); expect(cutInActive()).toBe(false);
  });
});

describe('the intervention: the map effect only (the strip is the spotlight\'s)', () => {
  it('playIntervention draws no cut-in of either kind', () => {
    document.body.innerHTML = '';
    playIntervention({ patron: 'toll_keeper', at: null, target: null }, { at: () => ({ x: 10, y: 10, s: 40 }), posOf: () => undefined, play: () => {} });
    expect(document.querySelector('[data-phc-cut]')).toBeNull();
    expect(cutInActive()).toBe(false);
  });
});

describe('patron ids: the data\'s (toll_keeper) and the art\'s (the_toll_keeper) give the same accent, face and portrait', () => {
  for (const id of Object.keys(FAITH_PATRON)) {
    it(id, () => {
      const alt = id.startsWith('the_') ? id.slice(4) : 'the_' + id;
      expect(accentOf(id)).not.toBe(FAITH_GOLD); expect(accentOf(id)).toBe(accentOf(alt));
      expect(faceOf(id)).toBe(faceOf(alt));
      expect(patronPortrait(id, true)).toBeTruthy();
      expect(stripForPatron(id)!.ink).toBe(stripForPatron(alt)!.ink);
      expect(stripForPatron(id)!.eye).toEqual(stripForPatron(alt)!.eye);
    });
  }
});
