// @vitest-environment jsdom
// Shadow on the fight map (fx/shadow.ts, rules 1.56 Shadow 2.0 slice 1): the events a REAL fight emits (an Ingenuity-1
// character Hides, gets First Shade's Shadow, Tags a foe and Breaks on it, through the reducer) map to the moments
// (hide, gain, tag, break) through shadowFxOf, and play through play.ts's real handlers: the pool and HIDDEN, the wisp
// and SHADOW, the hook and TAGGED, the cut and AMBUSH across the struck foe, then REVEALED. The token's standing look
// (tokenFade.ts) reads the engine's u.hidden, u.res and u.resMax.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '../../../../../packages/engine/test/helpers/yard16';
import { fightWith } from '../../../../../packages/engine/test/helpers/perkfight';
import { refOf } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { shadowFxOf, shadowBeat, SHADOW_WORD, SHADOW_MS, FOUND_WORD, resetShadow } from './shadow';
import { fadeStyle, shadowHeld, wispsUri, SHADOW_INK } from '../tokenFade';

function grid(w = 16, h = 16) {
  const root = document.createElement('div'); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    root.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return { root, layer };
}
/** A real fight: Hide (First Shade), Tag, Break, every action through the reducer; returns its effects in order. */
function realFight() {
  const f = fightWith([{ weapon: 'hellraiser_service_rifle', skills: { ingenuity: 1 }, attrs: { perception: 3 } }], [{ tier: 'soldier' }]);
  const t = f.foe; t.pos = '6,4'; t.vision = 1;
  const u = f.turn(f.pc); f.unit(u.id).pos = '1,4';
  f.act({ type: 'combat/hide', unitId: u.id } as any);
  f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.tag', targetId: t.id } as any);
  f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot', mods: ['skill:ingenuity.1#shadow.break'] } as any);
  return { f, u: f.unit(u.id), t: f.unit(t.id), fx: (f.cb.fx || []) as any[] };
}
const words = (layer: HTMLElement) => Array.from(document.querySelectorAll('*')).map((x) => (x.children.length ? '' : x.textContent || '')).filter(Boolean).concat(layer.textContent || '');
const traces = () => (((window as any).__phcFxTrace || []) as any[]).filter((t) => t.w === 'shadow').map((t) => t.what);

describe('Shadow on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; resetShadow(); });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('a real fight\'s events map to the moments, in the order the player made them: hide, a Shadow gained, tag, break', () => {
    const { fx } = realFight();
    const ms = fx.map((e) => shadowFxOf(e)).filter(Boolean);
    expect(ms).toEqual(['hide', 'gain', 'tag', 'break']); // rules 1.86 item 7403 (Silent ON): the loud rifle gives the tile away and keeps the shooter Hidden (no FOUND); the Break reveals it
    for (const e of fx) if (shadowFxOf(e)) expect(shadowBeat(e)).toBeGreaterThan(0);
    expect(shadowFxOf({ k: 'stance', what: 'prone' })).toBeNull(); expect(shadowFxOf({ k: 'shot' })).toBeNull();
  });
  it('they play through play.ts: HIDDEN, SHADOW, TAGGED on the foe, then the cut and AMBUSH, then REVEALED on the actor', () => {
    const { f, fx } = realFight();
    // the screen's context is the fight as it stood when the effects were made (the actor still on its tile)
    setContext({ code: 'X', characters: f.g.characters, story: { positions: {}, npcs: [] }, combat: { ...f.cb, fx: [] } } as any, 'combat');
    const seen: string[] = [];
    for (const e of fx) playFx(e); // as the queue gets them: one action's events together
    for (let k = 0; k < 60; k++) { vi.advanceTimersByTime(slow(100)); seen.push(...words(g.layer)); }
    expect(traces()).toEqual(['hide', 'gain', 'tag', 'break']); // Silent ON: the shot tears nothing; the Break cuts, then tears the shadow off itself (REVEALED)
    const said = seen.join(' ');
    for (const w of [SHADOW_WORD.hide, SHADOW_WORD.gain, SHADOW_WORD.tag, SHADOW_WORD.break, FOUND_WORD.attack]) expect(said).toContain(w);
    vi.advanceTimersByTime(slow(SHADOW_MS.cut + SHADOW_MS.tear) + 3000);
    expect(g.layer.childElementCount).toBe(0); // and leaves nothing behind
  });
  it('FOUND: an enemy that ends its turn next to you (a real end of turn) tears your outline off, says FOUND and draws a line from it', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle', skills: { ingenuity: 1 }, attrs: { perception: 3 } }], [{}]); const t = f.foe; t.pos = '4,4'; t.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,4';
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    f.unit(t.id).pos = '2,4'; f.unit(t.id).ap = 0;
    const n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    const ev = ((f.cb.fx || []) as any[]).filter((e) => e.n > n && shadowFxOf(e) === 'found');
    expect(ev.length).toBe(1); expect(ev[0].how).toBe('close'); expect(ev[0].by).toBe(t.id);
    setContext({ code: 'X', characters: f.g.characters, story: { positions: {}, npcs: [] }, combat: { ...f.cb, fx: [] } } as any, 'combat');
    playFx(ev[0]); const seen: string[] = [];
    for (let k = 0; k < 9; k++) { vi.advanceTimersByTime(slow(100)); seen.push(...words(g.layer)); }
    expect(traces()).toEqual(['found']);
    expect(seen.join(' ')).toContain(FOUND_WORD.close);
    vi.advanceTimersByTime(3000); expect(g.layer.childElementCount).toBe(0);
  });
  it('the Hidden token: an outline in Perception ink over the dark (an ally\'s dashed); the wisps read the engine\'s Shadow and cap', () => {
    const f = fightWith([{ skills: { ingenuity: 1 }, attrs: { perception: 3 } }], [{}]); const t = f.foe; t.pos = '14,5'; t.vision = 1;
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,4';
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    const me = f.unit(u.id);
    expect(fadeStyle(me)).toContain('border-color: ' + SHADOW_INK);
    expect(fadeStyle(me, { ally: true })).toContain('border-style: dashed');
    expect(fadeStyle({ ...me, hidden: false })).toBe('');
    const sh = shadowHeld(me)!; expect(sh.n).toBe(1); expect(sh.max).toBe(me.resMax!.shadow);
    expect(decodeURIComponent(wispsUri(sh.n, sh.max)).match(/<path/g)?.length).toBe(sh.n);
  });
});
