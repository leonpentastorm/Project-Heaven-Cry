// @vitest-environment jsdom
// The cut-in system (game/cutIn.ts; Faith 2.2, docs/design/faith-presence-spec.md 2.3 and 3): it builds the right portrait,
// line, focus and box from a Miracle's fx event; the god calls the devoted by name in the faith light; the view lands on
// the tile (the map punches in) and the effect plays then; the box says what it did and closes itself or on a click; a
// click or a key skips it and moves the effects queue up; reduced motion has no zoom and no flash; nothing stays on
// screen or holds input. The intervention's hook (section 3) plays today's look.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer } from './fx/dom';
import { clearFx, hurryFx, queueFx, FX_EVENT } from './fx/play';
import { closeCutIns, cutInTiming, lineParts, miracleCutIn, playIntervention, showCutIn } from './cutIn';
import * as sfxMod from './sfx';

function grid(w = 10, h = 8) {
  document.body.innerHTML = '';
  const g = document.createElement('div'); g.className = 'phc-grid'; document.body.appendChild(g);
  (g as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: w * 40, height: h * 40, right: w * 40, bottom: h * 40 });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    g.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return g;
}
const MIRACLE = { k: 'miracle', n: 9, patron: 'mother_ember', id: 'hearth_unbroken', at: '3,4', area: ['3,4'], unit: 'u', char: 'c1',
  name: 'Hearth Unbroken', text: 'Every ally heals.', line: 'LEON, LOVE. MOTHER HEARD YOU. COME HERE, ALL OF YOU.', summary: 'Leon heals 40; Ally heals 40.' };

describe('the cut-in system', () => {
  let spy: any;
  beforeEach(() => { vi.useFakeTimers(); spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {}); });
  afterEach(() => { closeCutIns(); clearFx(); vi.advanceTimersByTime(20000); spy.mockRestore(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it('marks the called name in the line (any case, every time), or shows the name alone', () => {
    expect(lineParts('LEON, LOVE. COME HERE, leon.', 'Leon')).toEqual([{ text: 'LEON', name: true }, { text: ', LOVE. COME HERE, ', name: false }, { text: 'leon', name: true }, { text: '.', name: false }]);
    expect(lineParts('I GRANT THEE THIS REQUEST.', null)).toEqual([{ text: 'I GRANT THEE THIS REQUEST.', name: false }]);
    expect(lineParts('', 'Wren')).toEqual([{ text: 'WREN', name: true }]);
    expect(lineParts('', '')).toEqual([]);
  });

  it('builds the Miracle\'s portrait, accent, name, line, focus and box from its fx event', () => {
    const o = miracleCutIn(MIRACLE, { nameOf: (id) => (id === 'c1' ? 'Leon' : undefined), visible: () => true });
    expect(o.portrait).toMatch(/\/assets\/patron-mother_ember-lg/);
    expect(o.accent).toBe('#ED8A3C');
    expect(o.kicker).toBe('MOTHER EMBER · MIRACLE · HEARTH UNBROKEN');
    expect(o.name).toBe('LEON'); expect(o.line).toBe(MIRACLE.line);
    expect(o.focus).toBe('3,4');
    expect(o.box).toEqual({ kicker: 'MIRACLE · MOTHER EMBER', title: 'Hearth Unbroken', text: 'Every ally heals.', did: 'Leon heals 40; Ally heals 40.' });
    expect(o.sound).toContain('miracle_sting');
    // In fog the view goes to the map, never to a tile the viewer can't see; a story Miracle lands on the devoted's token.
    expect(miracleCutIn(MIRACLE, { visible: () => false }).focus).toBe('map');
    expect(miracleCutIn({ ...MIRACLE, at: null }, { posOfChar: () => '1,1', visible: () => true }).focus).toBe('1,1');
    // An unknown patron still cuts in, with its mark and the faith light.
    const u = miracleCutIn({ k: 'miracle', patron: 'a_future_patron', id: 'x' });
    expect(u.portrait).toBeNull(); expect(u.mark).toMatch(/^data:image\/svg|\/assets\//); expect(u.accent).toBe('#F2C46A');
  });

  it('shows the portrait over everything, the god calling the devoted by name in the faith light, then lands, zooms and shows the box', () => {
    const g = grid(), zoom = vi.fn(); (g as any).animate = zoom;
    const land = vi.fn(), T = cutInTiming('full');
    expect(T.total).toBeGreaterThanOrEqual(4000); expect(T.total).toBeLessThanOrEqual(6500);
    const h = showCutIn({ ...miracleCutIn(MIRACLE, { nameOf: () => 'Leon', visible: () => true }), onLand: land })!;
    const root = document.querySelector('[data-phc-cut="full"]') as HTMLElement;
    expect(root).toBe(h.el); expect(root.dataset.phcMiracle).toBe('mother_ember'); expect(Number(root.style.zIndex)).toBeGreaterThanOrEqual(90);
    expect((root.querySelector('[data-phc-cut-portrait="portrait"]') as HTMLImageElement).src).toMatch(/patron-mother_ember-lg/);
    const names = root.querySelectorAll('[data-phc-cut-name]');
    expect(names.length).toBe(1); expect(names[0].textContent).toBe('LEON'); expect((names[0] as HTMLElement).style.color).toMatch(/faith-light/);
    expect(root.querySelector('[data-phc-cut-line]')!.textContent).toBe(MIRACLE.line);
    expect(spy.mock.calls.map((c: any[]) => c[0])).toContain('miracle_sting');
    expect(root.style.pointerEvents).toBe('auto'); // the portrait takes the click that skips it
    vi.advanceTimersByTime(T.pull + 10);
    expect(root.style.pointerEvents).toBe('none'); // the pull-away never holds input
    expect(zoom).toHaveBeenCalled(); expect(JSON.stringify(zoom.mock.calls[0][0])).toMatch(/scale\(1\.16\)/);
    expect(document.querySelector('[data-phc-cut-spot]')).toBeTruthy();
    expect(land).not.toHaveBeenCalled();
    vi.advanceTimersByTime(T.land - T.pull);
    expect(land).toHaveBeenCalledTimes(1); expect(document.querySelector('[data-phc-cut="full"]')).toBeNull();
    vi.advanceTimersByTime(T.boxAt - T.land + 10);
    const box = document.querySelector('[data-phc-cut-box]') as HTMLElement;
    expect(box.textContent).toMatch(/MIRACLE · MOTHER EMBER/); expect(box.textContent).toMatch(/Hearth Unbroken/); expect(box.textContent).toMatch(/Every ally heals\./); expect(box.textContent).toMatch(/WHAT IT DID.*Leon heals 40/);
    vi.advanceTimersByTime(T.boxMs + 400);
    expect(document.querySelector('[data-phc-cut-box]')).toBeNull();
    expect(document.querySelector('[data-phc-cut-spot]')).toBeNull();
  });

  it('a key skips it: the effect lands at once, the queue moves up, the key does nothing else; a click closes the box', () => {
    grid();
    const land = vi.fn(), onSkip = vi.fn(), T = cutInTiming('full');
    showCutIn({ ...miracleCutIn(MIRACLE, { visible: () => true }), onLand: land, onSkip });
    vi.advanceTimersByTime(500);
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }), other = vi.fn();
    document.addEventListener('keydown', other);
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(onSkip).toHaveBeenCalledTimes(1); expect(onSkip.mock.calls[0][0]).toBeGreaterThan(T.land - 500 - 300);
    vi.advanceTimersByTime(230);
    expect(land).toHaveBeenCalledTimes(1); expect(document.querySelector('[data-phc-cut="full"]')).toBeNull();
    // A second key is the game's again.
    const ev2 = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); window.dispatchEvent(ev2); expect(ev2.defaultPrevented).toBe(false);
    vi.advanceTimersByTime(300);
    const box = document.querySelector('[data-phc-cut-box]') as HTMLElement; expect(box).toBeTruthy();
    (box.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click(); vi.advanceTimersByTime(260);
    expect(document.querySelector('[data-phc-cut-box]')).toBeNull();
    document.removeEventListener('keydown', other);
  });

  it('a key typed into a text box goes through and skips nothing; nor does a lone Shift; another key still skips', () => {
    grid(); const input = document.createElement('input'); input.type = 'text'; document.body.appendChild(input); input.focus();
    const onSkip = vi.fn(), seen = vi.fn(); input.addEventListener('keydown', seen);
    showCutIn({ ...miracleCutIn(MIRACLE), onSkip });
    vi.advanceTimersByTime(400);
    const typed = new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true }); input.dispatchEvent(typed);
    expect(typed.defaultPrevented).toBe(false); expect(seen).toHaveBeenCalledTimes(1); expect(onSkip).not.toHaveBeenCalled();
    const ta = document.createElement('textarea'); document.body.appendChild(ta);
    const t2 = new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }); ta.dispatchEvent(t2); expect(t2.defaultPrevented).toBe(false);
    const shift = new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, cancelable: true }); window.dispatchEvent(shift);
    expect(shift.defaultPrevented).toBe(false); expect(onSkip).not.toHaveBeenCalled();
    expect(document.querySelector('[data-phc-cut="full"]')).toBeTruthy();
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); window.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true); expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('the box sits at the top of the map, lets clicks through to the controls (only its × takes one) and stays under the dialogs', () => {
    grid(20, 12); // 800 × 480 at the top left
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true }); Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });
    showCutIn({ ...miracleCutIn(MIRACLE), focus: null }); vi.advanceTimersByTime(cutInTiming('full').boxAt + 10);
    const box = document.querySelector('[data-phc-cut-box]') as HTMLElement; expect(box).toBeTruthy();
    expect(box.style.left).toBe('400px'); expect(box.style.top).toBe('12px'); expect(box.style.width).toBe('560px');
    const css = (document.getElementById('phc-cutin-css') as HTMLStyleElement).textContent || '';
    const rule = /\[data-phc-cut-box\]\{[^}]*\}/.exec(css)![0];
    expect(rule).toMatch(/pointer-events:none/); expect(Number(/z-index:(\d+)/.exec(rule)![1])).toBeLessThan(48); // the Wave-cleared modal is 48
    expect(Number(/z-index:(\d+)/.exec(rule)![1])).toBeGreaterThan(45); // over the effects layer
    expect(box.querySelector('button[aria-label="Close"]')).toBeTruthy();
    // no map on screen: high in the middle, never at the bottom (the composer)
    document.body.innerHTML = ''; closeCutIns();
    showCutIn({ ...miracleCutIn(MIRACLE), focus: null }); vi.advanceTimersByTime(cutInTiming('full').boxAt + 10);
    const b2 = document.querySelector('[data-phc-cut-box]') as HTMLElement; expect(b2.style.top).toBe('84px'); expect(b2.style.bottom).toBe('');
  });

  it('a click on the portrait skips it too', () => {
    grid(); const land = vi.fn();
    const h = showCutIn({ ...miracleCutIn(MIRACLE), onLand: land })!;
    h.el!.dispatchEvent(new Event('pointerdown')); vi.advanceTimersByTime(250);
    expect(land).toHaveBeenCalledTimes(1); expect(document.querySelector('[data-phc-cut="full"]')).toBeNull();
  });

  it('reduced motion: no zoom, no flash, no rays turning; the portrait, the line and the box still show', () => {
    vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    const g = grid(), zoom = vi.fn(); (g as any).animate = zoom;
    const T = cutInTiming('full'); expect(T).toEqual(cutInTiming('full', true));
    const land = vi.fn();
    showCutIn({ ...miracleCutIn(MIRACLE, { nameOf: () => 'Leon', visible: () => true }), onLand: land });
    const root = document.querySelector('[data-phc-cut="full"]') as HTMLElement;
    expect(root.querySelector('[data-phc-cut-portrait]')).toBeTruthy(); expect(root.querySelector('[data-phc-cut-name]')!.textContent).toBe('LEON');
    expect(root.innerHTML).not.toMatch(/background: rgb\(255, 255, 255\)|background:#FFFFFF/); // no white flash
    expect(root.innerHTML).not.toMatch(/mote\.png/); // no motes rising
    vi.advanceTimersByTime(T.land + 10);
    expect(zoom).not.toHaveBeenCalled(); expect(document.querySelector('[data-phc-cut-spot]')).toBeNull();
    expect(land).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(T.boxAt - T.land + 10); expect(document.querySelector('[data-phc-cut-box]')).toBeTruthy();
  });

  it('closeCutIns (a cleared queue: the room left, the tab hidden) removes everything at once', () => {
    grid(); showCutIn(miracleCutIn(MIRACLE));
    expect(document.querySelector('[data-phc-cut]')).toBeTruthy();
    clearFx();
    expect(document.querySelector('[data-phc-cut]')).toBeNull();
    vi.advanceTimersByTime(10000); expect(document.querySelector('[data-phc-cut-box]')).toBeNull();
  });

  it('the small cut-in (section 3, drafted) never holds input and waits its turn', () => {
    grid();
    const T = cutInTiming('small'); expect(T.total).toBe(1500);
    const a = showCutIn({ size: 'small', accent: '#4E8DD1', kicker: 'OLD OVERCAST INTERVENES', line: 'Hah!', box: { title: 'Old Overcast intervenes: 48 Storm to the drill sergeant' } })!;
    showCutIn({ size: 'small', accent: '#ED8A3C', kicker: 'MOTHER EMBER INTERVENES' });
    expect(a.el!.style.pointerEvents).toBe('none');
    expect(document.querySelectorAll('[data-phc-cut="small"]').length).toBe(1);
    vi.advanceTimersByTime(400); expect(document.querySelector('[data-phc-cut-box]')!.textContent).toMatch(/48 Storm/);
    vi.advanceTimersByTime(T.total);
    expect([...document.querySelectorAll('[data-phc-cut="small"]')].map((x) => x.textContent).join()).toMatch(/MOTHER EMBER INTERVENES/);
  });

  it('the intervention hook plays today\'s look: the bell, the mark, "<PATRON> INTERVENES"', () => {
    grid(); const play = vi.fn(), mark = vi.fn();
    const at = (k: any) => (k === '3,4' ? { x: 140, y: 180, s: 40 } : null);
    playIntervention({ k: 'intervention', unit: 'u', patron: 'old_overcast', trigger: 'you_kill', target: 't', amount: 48, at: '3,4' }, { at, posOf: () => undefined, play, mark });
    vi.advanceTimersByTime(200);
    expect(play).toHaveBeenCalledWith('hit_metal', expect.anything(), expect.anything()); expect(mark).toHaveBeenCalled();
    expect(document.body.textContent).toMatch(/OLD OVERCAST INTERVENES/);
  });

  it('a Miracle\'s cut-in plays even when the queue skips the backlog (a decided fight keeps only its last effects)', () => {
    grid();
    queueFx([{ n: 1, k: 'miracle', patron: 'nerukhan', id: 'x', line: 'I GRANT THEE THIS REQUEST.' } as any, { n: 2, k: 'heal', target: 'u', amount: 5 } as any, { n: 3, k: 'turn', unit: 'u' } as any], undefined, { keep: 1 });
    expect(document.querySelector('[data-phc-cut="full"]')).toBeTruthy();
  });
  it('a second full cut-in ends the first: it lands, or its box closes', () => {
    grid(); const land = vi.fn(), T = cutInTiming('full');
    showCutIn({ ...miracleCutIn(MIRACLE), onLand: land });
    showCutIn(miracleCutIn({ ...MIRACLE, patron: 'nerukhan' }));
    vi.advanceTimersByTime(250); expect(land).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-phc-cut="full"]').length).toBe(1);
    vi.advanceTimersByTime(T.boxAt); expect(document.querySelectorAll('[data-phc-cut-box]').length).toBe(1);
    showCutIn(miracleCutIn(MIRACLE)); // the second has landed and shows its box: the box closes
    expect(document.querySelectorAll('[data-phc-cut-box]').length).toBe(0);
  });
  it('hurryFx moves what the queue holds up, never before now', () => {
    grid(); const seen: string[] = [], on = (e: any) => seen.push(e.detail.k);
    window.addEventListener(FX_EVENT, on);
    queueFx([{ n: 1, k: 'miracle', patron: 'nerukhan', id: 'x' } as any, { n: 2, k: 'heal', target: 'u', amount: 5 } as any]);
    expect(seen).toEqual(['miracle']);
    vi.advanceTimersByTime(1000); expect(seen).toEqual(['miracle']);
    hurryFx(5000); vi.advanceTimersByTime(1);
    expect(seen).toEqual(['miracle', 'heal']);
    window.removeEventListener(FX_EVENT, on);
  });
});
