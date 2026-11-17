// 0.31.0, the fight panel (game/fold.ts, game/tabPrefs.ts's fold store, game/statusStrip.ts, game/shieldLook.ts
// hpShieldBar): the fold store and its reload, the meters' zero rule, the status groups read from conditions.json's
// `side`, the shield segment's widths, and the action list's least height.
import { describe, expect, it, beforeEach } from 'vitest';
import { CONDITION_ROWS, condId } from '@engine';
import { isFolded, setFolded, clearFold, foldSetByHand, _resetFoldCache } from './tabPrefs';
import { foldVals, MeterMemory, meterFolds, foldMeter, meterFoldId, listMinPx, listMinShortPx, LIST_MIN_ROWS, LIST_ROW_PX } from './fold';
import { sideOf, statusGroups, shortWord, GROUP_CAP, SIDE_INK } from './statusStrip';
import { hpShieldBar } from './shieldLook';

/** A browser's localStorage, kept across a "reload" (the module's cache forgotten). */
function fakeStorage() { const m = new Map<string, string>(); (globalThis as any).localStorage = { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); } }; return m; }
beforeEach(() => { fakeStorage(); _resetFoldCache(); });

describe('the fold store (U1)', () => {
  it('a box is open unless a rule folds it; a state set by hand wins over the rule', () => {
    expect(isFolded('fight:shields')).toBe(false); expect(isFolded('fight:vow', true)).toBe(true);
    setFolded('fight:vow', false); expect(isFolded('fight:vow', true)).toBe(false); expect(foldSetByHand('fight:vow')).toBe(true);
    clearFold('fight:vow'); expect(isFolded('fight:vow', true)).toBe(true);
  });
  it('a fold survives a reload (the browser keeps it; the cache is only a cache)', () => {
    setFolded('fight:you', true); _resetFoldCache();
    expect(isFolded('fight:you')).toBe(true);
    expect(JSON.parse((globalThis as any).localStorage.getItem('phc.folds'))).toEqual({ 'fight:you': true });
  });
  it('foldVals: its header words and its toggle', () => {
    let drawn = 0; const v = foldVals('fight:bonds', { byRule: true, redraw: () => drawn++ });
    expect(v).toMatchObject({ open: false, folded: true, expanded: 'false', chev: '▸' });
    v.toggle(); expect(drawn).toBe(1); expect(foldVals('fight:bonds', { byRule: true })).toMatchObject({ open: true, expanded: 'true', chev: '▾' });
  });
});

describe('the meters\' zero rule (U2)', () => {
  it('a zero meter with nothing this fight is folded; the "+N" opens it; it opens by itself at its first point', () => {
    const mem = new MeterMemory(), F = 'fight-1';
    let r = meterFolds([{ key: 'ammo', now: 12 }, { key: 'res-shadow', now: 0 }, { key: 'flux', now: 0 }], mem, F);
    expect(r.open.map((x) => x.key)).toEqual(['ammo']); expect(r.folded.map((x) => x.key)).toEqual(['res-shadow', 'flux']);
    foldMeter('flux', false); // the "+N" chip, a click
    r = meterFolds([{ key: 'ammo', now: 12 }, { key: 'res-shadow', now: 0 }, { key: 'flux', now: 0 }], mem, F);
    expect(r.folded.map((x) => x.key)).toEqual(['res-shadow']);
    foldMeter('flux', true); // a click on an open zero meter folds it back
    expect(meterFolds([{ key: 'flux', now: 0 }], mem, F).folded).toHaveLength(1);
    // the first point: it opens (the hand-set fold is forgotten), and back at zero it stays open this fight
    expect(meterFolds([{ key: 'flux', now: 2 }], mem, F).open).toHaveLength(1);
    expect(isFolded(meterFoldId('flux'))).toBe(false);
    expect(meterFolds([{ key: 'flux', now: 0 }], mem, F).open).toHaveLength(1);
    // a new fight starts the rule again
    expect(meterFolds([{ key: 'flux', now: 0 }], mem, 'fight-2').folded).toHaveLength(1);
  });
  it('a meter with no count (a text row) never folds', () => {
    expect(meterFolds([{ key: 'thr', now: null }], new MeterMemory(), 'f').open).toHaveLength(1);
  });
});

describe('the status strip (U4): the groups are conditions.json `side`', () => {
  it('every condition has a side, and the strip reads it (Hidden helps; Bleeding, Fear, Prone, Off Balance, Taunted hurt)', () => {
    for (const r of CONDITION_ROWS) expect(['helps', 'hurts', 'state']).toContain(r.side);
    expect(sideOf('hidden', CONDITION_ROWS, condId)).toBe('helps');
    for (const id of ['bleeding', 'fear', 'prone', 'off_balance', 'taunted']) expect(sideOf(id, CONDITION_ROWS, condId)).toBe('hurts');
    // the strip follows the data, not a list of its own: a row changed is a chip moved
    const rows = CONDITION_ROWS.map((r: any) => (r.id === 'hidden' ? { ...r, side: 'hurts' } : r));
    expect(sideOf('hidden', rows, condId)).toBe('hurts');
  });
  it('HELPING green, HURTING red, states white; each chip a glyph and a word; past six, "+N"', () => {
    const list = [{ key: 'h', side: 'helps' as const, word: 'HIDDEN', tip: 'Hidden: …' }, ...Array.from({ length: 8 }, (_, i) => ({ key: 'b' + i, side: 'hurts' as const, word: 'BLEEDING', tip: 'Bleeding ' + i, n: 2 }))];
    const g = statusGroups(list);
    expect(g.map((x) => x.side)).toEqual(['helps', 'hurts']); // an empty group takes no room
    expect(g[0]).toMatchObject({ head: 'HELPING', ink: SIDE_INK.helps }); expect(g[0].chips[0]).toMatchObject({ glyph: '▲', word: 'HIDDEN' });
    expect(g[0].chips[0].style).toContain('#6FEA77'); expect(g[1].chips[0].style).toContain('#F65157');
    expect(g[1].chips).toHaveLength(GROUP_CAP); expect(g[1]).toMatchObject({ more: 2, moreText: '+2' }); expect(g[1].moreTip).toContain('Bleeding 7');
    expect(statusGroups([])).toEqual([]);
    expect(shortWord('Off Balance')).toBe('OFF BALANCE'); expect(shortWord('Shelter of the Saints')).toBe('SHELTER');
  });
});

describe('the shield on the HP bar (U3)', () => {
  const sv = (total: number | null, entries: any[], known = true) => ({ known, maxHp: 200, entries, guard: null, blow: 0, all: total, allWord: '', total, rule: 'r' } as any);
  it('no shield: no segment', () => { expect(hpShieldBar(150, 200, sv(0, []))).toMatchObject({ has: false, hpW: 75, shW: 0, plus: '' }); expect(hpShieldBar(150, 200, null).has).toBe(false); });
  it('the segment joins the end of the HP fill; under max HP the bar keeps its scale', () => {
    const b = hpShieldBar(100, 200, sv(30, [{ amount: 30, bar: 0.15 }]));
    expect(b).toMatchObject({ has: true, rescaled: false, plus: '+30' }); expect(b.hpW).toBe(50); expect(b.shW).toBe(15); expect(b.segStyle).toContain('left: 50.00%; width: 15.00%');
  });
  it('past max HP the bar rescales so the segment fits (145 HP + 30 on a 145 max)', () => {
    const b = hpShieldBar(145, 145, sv(30, [{ amount: 30, bar: 0.2 }]));
    expect(b.rescaled).toBe(true); expect(b.hpW + b.shW).toBeCloseTo(100); expect(b.hpW).toBeCloseTo(145 / 175 * 100);
  });
  it("a foe's unknown amount: its share of max HP, the view's chip word", () => {
    const b = hpShieldBar(0, 200, { ...sv(null, [{ amount: null, bar: 0.3 }], false), chip: 'STRONG SHIELD' });
    expect(b.shW).toBeCloseTo(30); expect(b.plus).toBe('STRONG SHIELD');
  });
});

describe('the action list keeps its room (U5)', () => {
  it('at least four rows', () => { expect(LIST_MIN_ROWS).toBeGreaterThanOrEqual(4); expect(listMinPx()).toBeGreaterThanOrEqual(4 * LIST_ROW_PX + 32); }); // four rows under a head line (a weapon's name)
  it('at least four 32 px rows under a head on short windows', () => { expect(listMinShortPx()).toBeGreaterThanOrEqual(4 * (32 + 6) + 32); expect(listMinShortPx()).toBeLessThan(listMinPx()); });
});

describe('Strain while holding (0.31.9)', () => {
  it('a held Outburst pins Strain: never folded at 0, always among the three most urgent meters', async () => {
    const { strainRows, urgentRows } = await import('./resources');
    const hh: any = { strain: 0, limit: 4, beginStrain: 1, canBegin: true, turnCalm: 1, swell: 1, holdNet: 1, onTurn: true, flooded: false, emanator: true,
      held: { name: 'Soul Bolt', stage: 1, maxStage: 4, toneName: 'Raw', form: 'Bolt' } };
    const rows = strainRows(hh), strain = rows.find((r) => r.key === 'strain')!;
    expect(strain.pin).toBe(true);
    const others = [{ key: 'ammo', label: 'Ammo', value: '0', now: 0, kind: 'bar', colour: '', hint: '', warn: 'EMPTY', level: 'alert' },
      { key: 'heat', label: 'Heat', value: '5', now: 5, kind: 'bar', colour: '', hint: '', warn: 'OVERLOAD NEXT', level: 'alert' },
      { key: 'flux', label: 'Flux', value: '9', now: 9, kind: 'bar', colour: '', hint: '', warn: 'OVERLOAD SOON', level: 'alert' }] as any[];
    expect(urgentRows([...others, ...rows], 3).map((r) => r.key)).toContain('strain');
    const r = meterFolds([...others, ...rows].map((x) => ({ key: x.key, now: x.now, warn: x.warn, pin: x.pin })), new MeterMemory(), 'f');
    expect(r.open.map((x) => x.key)).toContain('strain');
    // not holding: Strain at 0 folds as any zero meter does
    const idle = strainRows({ ...hh, held: null })[0];
    expect(idle.pin).toBeFalsy();
  });
});
