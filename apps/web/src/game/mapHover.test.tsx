// @vitest-environment jsdom
// The map's hover (Found by Leon on live 0.25.0: hover halved the frame rate while the map moved; game/mapHover.ts and
// the template runtime's <sc-for memo>): a hover re-renders no tile that did not change; the route preview is worked out
// once for a tile hovered across several frames; a pointer-enter while the map moves does no work at all, and the tile
// under the pointer is told once when the motion ends.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { makeScreen, DCLogic, ITEM_RENDERS, RENDERS } from '../dc/runtime';
import { MapHover, HoverMemo, keyFromLabel, isMoving, SCROLL_QUIET_MS } from './mapHover';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); });

// A grid like the fight's: 26 x 26 tiles in a memo list, a panel outside it that reads the hover.
const W = 26, H = 26;
const TPL = '<div class="phc-grid" onMouseLeave="{{leave}}"><sc-for list="{{tiles}}" as="t" memo><button type="button" class="phc-tok" onClick="{{t.click}}" onMouseEnter="{{t.hover}}" aria-label="{{t.label}}" style="{{t.style}}"><sc-if value="{{t.hasCost}}"><span class="cost">{{t.cost}}</span></sc-if></button></sc-for></div><p class="panel">{{panel}}</p>';
let LOGIC: any = null; const clicks: string[] = [];
class GridLogic extends DCLogic<any, any> {
  constructor(p: any) { super(p); this.state = { hover: null, route: [] as string[] }; LOGIC = this; }
  renderVals() {
    const S = this.state, tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = x + ',' + y, onRoute = S.route.includes(k);
      tiles.push({ key: k, label: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (y + 1) + ' · floor', style: 'width: 46px; height: 46px; background: ' + (onRoute ? '#FFFFFF' : '#0D1119'),
        hasCost: S.hover === k && onRoute, cost: '−2 AP', click: () => clicks.push(k + '@' + S.hover), hover: () => this.setState({ hover: k }) });
    }
    return { tiles, panel: 'Hovering ' + (S.hover || 'nothing'), leave: () => this.setState({ hover: null }) };
  }
}
const Screen = makeScreen(TPL, GridLogic as any);

describe('<sc-for memo>: a hover re-renders no tile that did not change', () => {
  it('676 tiles: a hover that changes no tile renders none of them; one that changes two renders those two; handlers stay current', async () => {
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    await React.act(async () => { root.render(React.createElement(Screen as any, {})); });
    expect(el.querySelectorAll('button.phc-tok').length).toBe(W * H);
    // the hover changes the panel only (the hovered tile is not on the route): the screen renders, no tile does
    let r0 = RENDERS.count, i0 = ITEM_RENDERS.count;
    await React.act(async () => { LOGIC.setState({ hover: '5,5' }); });
    expect(RENDERS.count - r0).toBe(1);
    expect(ITEM_RENDERS.count - i0).toBe(0);
    expect(el.querySelector('.panel')!.textContent).toBe('Hovering 5,5');
    // a route over two tiles and the hover on one of them: exactly those two render again
    i0 = ITEM_RENDERS.count;
    await React.act(async () => { LOGIC.setState({ route: ['6,5', '7,5'], hover: '7,5' }); });
    expect(ITEM_RENDERS.count - i0).toBe(2);
    expect(el.querySelectorAll('.cost').length).toBe(1);
    // a tile that did not render again still runs the newest closure (it sees the hover as it is now)
    const far = Array.from(el.querySelectorAll('button.phc-tok')).find((b) => b.getAttribute('aria-label')!.startsWith('Z26 ')) as HTMLButtonElement;
    await React.act(async () => { far.click(); });
    expect(clicks.at(-1)).toBe('25,25@7,5');
    await React.act(async () => { root.unmount(); });
  });
});

describe('MapHover: no work while the map moves, at most one render a frame', () => {
  const host = () => { const h = { hover: null as string | null, told: [] as (string | null)[] }; return { h, api: { hovered: () => h.hover, setHover: (k: string | null) => { h.hover = k; h.told.push(k); } } }; };
  const trusted = (x: number, y: number) => ({ isTrusted: true, clientX: x, clientY: y });
  it('a pointer-enter during a camera move tells nothing; when the motion ends the tile under the pointer is told once', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance'] });
    const { h, api } = host(); const mh = new MapHover(api);
    let moving = true; mh.moving = () => moving;
    const under = { k: '9,4' }; mh.hit = () => { const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', 'J5 · floor'); const g = document.createElement('div'); g.className = 'phc-grid'; g.appendChild(b); void under; return b; };
    // the map glides under a pointer standing still: six tiles "entered" over six frames
    for (const k of ['3,4', '4,4', '5,4', '6,4', '7,4', '8,4']) { mh.enter(k, trusted(400, 300)); vi.advanceTimersByTime(16); }
    expect(h.told).toEqual([]); // no setState, so no render and no preview work, while it moves
    moving = false; vi.advanceTimersByTime(16);
    expect(h.told).toEqual(['9,4']); // once, the tile the hit test finds at the pointer's place (J5)
    vi.advanceTimersByTime(100);
    expect(h.told).toEqual(['9,4']);
  });
  it('a sweep across many tiles in one frame tells only the last; a scripted event (the tests) tells at once; leaving clears at once', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance'] });
    const { h, api } = host(); const mh = new MapHover(api); mh.moving = () => false; mh.hit = () => null;
    for (let i = 0; i < 5; i++) mh.enter(i + ',0', trusted(100 + i * 48, 50));
    expect(h.told).toEqual([]);
    vi.advanceTimersByTime(16);
    expect(h.told).toEqual(['4,0']);
    mh.enter('2,2', { isTrusted: false } as any);
    expect(h.told).toEqual(['4,0', '2,2']);
    mh.enter('3,3', trusted(10, 10)); mh.leave(); vi.advanceTimersByTime(32);
    expect(h.told).toEqual(['4,0', '2,2', null]); // the waiting enter was dropped with the leave
  });
  it('what counts as moving: the camera, a scroll a moment ago, the effects queue', () => {
    expect(isMoving({ camera: true, scrolledAgo: 1e9, fxBusy: false })).toBe(true);
    expect(isMoving({ camera: false, scrolledAgo: SCROLL_QUIET_MS - 1, fxBusy: false })).toBe(true);
    expect(isMoving({ camera: false, scrolledAgo: 1e9, fxBusy: true })).toBe(true);
    expect(isMoving({ camera: false, scrolledAgo: SCROLL_QUIET_MS + 1, fxBusy: false })).toBe(false);
    expect(keyFromLabel('C7 · floor')).toBe('2,6');
    expect(keyFromLabel('Z26 · Keel (hostile)')).toBe('25,25');
  });
});

describe('HoverMemo: the route preview once per tile and game state', () => {
  it('a tile hovered across several frames (several renders of one state) is worked out once; a new state works it out again', () => {
    const memo = new HoverMemo(); const g1 = {}, g2 = {}; let work = 0;
    const route = (g: object, k: string) => memo.get(g, ['route', 'u1', k, 'move'], () => { work++; return { route: [k] }; });
    for (let i = 0; i < 5; i++) route(g1, '4,4');
    expect(work).toBe(1);
    route(g1, '5,4'); route(g1, '4,4');
    expect(work).toBe(2);
    route(g2, '4,4');
    expect(work).toBe(3);
  });
});
