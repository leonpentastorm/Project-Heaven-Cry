// @vitest-environment jsdom
// Prayer 2.0 (rules 1.56; fx/faith.ts): the Chaplain's own moments, through the real mapping (faithBatch ties each row's
// fx to the unit it landed on; chaplainWord and devotionLine are the words) and the real queue handlers (playFx): each
// draws on the right tile, says its word, takes a beat, and leaves nothing behind; the Ward's boon gives way to the seal;
// an Atheist's roll has its moment and other rolls have none.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, FAITH_RULES } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { faithBatch, chaplainWord, devotionLine, faithBeat, sealedBoon, CHAPLAIN_FX } from './faith';
import * as sfxMod from '../sfx';
import { setCombatSpeed } from '../combatSpeed';

function grid(w = 14, h = 10) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
const ctx = () => setContext({ code: 'X', characters: { c1: { id: 'c1', name: 'Wren', belief: { kind: 'faithful', patron: 'nerukhan' } } }, story: { positions: {}, npcs: [] }, combat: { units: [
  { id: 'u', pos: '2,5', name: 'Wren', side: 'pc', charId: 'c1' }, { id: 'a', pos: '2,7', name: 'Ally', side: 'pc' }, { id: 't', pos: '6,5', name: 'Foe', side: 'foe' }] } } as any, 'combat');

describe('faithBatch: a row\'s fx (sent at its holder) is tied to where its effect landed', () => {
  it('Smite and Amen take the hurt before them; the Ward its boon (which then draws nothing of its own); Holy Dread its cond; Last Rites the prayer after it', () => {
    const evs: any[] = [
      { k: 'shot', unit: 'u', target: 't' }, { k: 'hurt', target: 't', at: '6,5', dmg: 41 }, { k: 'smite', target: 'u', at: '2,5' },
      { k: 'boon', target: 'a', at: '2,7', word: 'ward', amount: 34 }, { k: 'ward_seal', target: 'u', at: '2,5' },
      { k: 'hurt', target: 't', at: '6,5', dmg: 20 }, { k: 'amen', target: 'u', at: '2,5' },
      { k: 'cond', target: 't', at: '6,5', id: 'shaken' }, { k: 'holy_dread', target: 'u', at: '2,5' },
      { k: 'last_rites', target: 'u', at: '2,5' }, { k: 'prayer', unit: 'u', kind: 'whisper', id: 'health', target: 'a', at: '2,5' },
    ];
    faithBatch(evs);
    expect(evs[2]._on).toEqual({ target: 't', at: '6,5', dmg: 41 }); expect(chaplainWord(evs[2])).toBe('SMITE −41');
    expect(evs[4]._on).toEqual({ target: 'a', at: '2,7', amount: 34 }); expect(chaplainWord(evs[4])).toBe('WARD +34'); expect(sealedBoon(evs[3])).toBe(true);
    expect(evs[6]._on.dmg).toBe(20); expect(chaplainWord(evs[6])).toBe('AMEN −20');
    expect(evs[8]._on).toEqual({ target: 't', at: '6,5', resisted: false }); expect(chaplainWord(evs[8])).toBe('HOLY DREAD');
    expect(evs[9]._on).toEqual({ target: 'a' }); expect(chaplainWord(evs[9])).toBe('LAST RITES');
  });
  it('a Sigil\'s ward (no seal after it) keeps its own look', () => {
    const evs: any[] = [{ k: 'boon', target: 'a', at: '2,7', word: 'ward', amount: 12 }, { k: 'hurt', target: 't', at: '6,5', dmg: 3 }];
    faithBatch(evs); expect(sealedBoon(evs[0])).toBe(false);
  });
  it('the words: the verse in numerals, the song breaking, an Atheist\'s roll against its TN', () => {
    expect(chaplainWord({ k: 'canticle', verse: 2 })).toBe('CANTICLE · VERSE II');
    expect(chaplainWord({ k: 'canticle', verse: 3 })).toBe('CANTICLE · VERSE III');
    expect(chaplainWord({ k: 'canticle_break' })).toBe('THE SONG BREAKS');
    expect(chaplainWord({ k: 'roll', why: 'pray', die: 9, total: 14, tn: 12, ok: true })).toBe('14 vs 12 · ANSWERED');
    expect(chaplainWord({ k: 'roll', why: 'pray', die: 3, total: 8, tn: 12, ok: false })).toBe('8 vs 12 · UNANSWERED');
  });
  it('a Devotion change says who saw what, from the data\'s lines', () => {
    const L = (FAITH_RULES as any).devotion.lines;
    expect(typeof L.liked).toBe('string');
    expect(devotionLine({ delta: 1, tag: 'protect' }, 'nerukhan')).toBe('+1 DEVOTION XP · ' + L.liked.replace('{patron}', 'Holy Father Nerukhan').replace('{tag}', 'Protect'));
    expect(devotionLine({ delta: -3, tag: 'betray' }, 'nerukhan')).toMatch(/^−3 DEVOTION XP · .*Nerukhan.*\(Betray\)$/);
    expect(devotionLine({ delta: 3, reason: 'vow kept' }, 'nerukhan')).toMatch(/vow/);
  });
});

describe('the Chaplain\'s moments on the map', () => {
  let spy: any;
  beforeEach(() => { setCombatSpeed('fast'); vi.useFakeTimers(); grid(); spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); clearFx(); vi.advanceTimersByTime(20000); vi.useRealTimers(); });
  const EVS: any[] = [
    { k: 'smite', target: 'u', at: '2,5', _on: { target: 't', at: '6,5', dmg: 41 } },
    { k: 'ward_seal', target: 'u', at: '2,5', _on: { target: 'a', at: '2,7', amount: 34 } },
    { k: 'canticle', target: 'u', at: '2,5', verse: 1 }, { k: 'canticle', target: 'u', at: '2,5', verse: 3 },
    { k: 'canticle_break', target: 'u', at: '2,5' },
    { k: 'amen', target: 'u', at: '2,5', _on: { target: 't', at: '6,5', dmg: 20 } },
    { k: 'holy_dread', target: 'u', at: '2,5', _on: { target: 't', at: '6,5', resisted: false } },
    { k: 'last_rites', target: 'u', at: '2,5', _on: { target: 'a' } },
    { k: 'roll', roll: 'roll', why: 'pray', unit: 'u', at: '2,5', die: 9, total: 14, tn: 12, ok: true },
  ];
  it('every moment draws, says its word, takes a beat and cleans up', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement, warn = vi.spyOn(console, 'warn');
    for (const e of EVS) {
      const before = layer.childElementCount; playFx(e); vi.advanceTimersByTime(600);
      expect(layer.childElementCount, e.k).toBeGreaterThan(before);
      expect(layer.textContent, e.k).toContain(chaplainWord(e));
      expect(faithBeat(e), e.k).toBeGreaterThan(0);
      vi.advanceTimersByTime(3000);
    }
    expect(warn).not.toHaveBeenCalled(); expect(layer.childElementCount).toBe(0);
    for (const k of CHAPLAIN_FX) expect(EVS.some((e) => e.k === k), k).toBe(true);
  });
  it('the moment lands on the foe it struck, not on the Chaplain', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx(EVS[0]); vi.advanceTimersByTime(600);
    const word = [...layer.children].find((b) => /SMITE/.test(b.textContent || '')) as HTMLElement;
    const cx = parseFloat(word.style.left) + parseFloat(word.style.width) / 2; expect(Math.abs(cx - (6 * 40 + 20))).toBeLessThan(20);
  });
  it('a sealed Ward\'s boon draws nothing; other rolls take no beat and draw nothing', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx({ k: 'boon', target: 'a', at: '2,7', word: 'ward', amount: 34, _seal: 1 } as any); vi.advanceTimersByTime(400);
    expect(layer.textContent).not.toMatch(/WARD/);
    playFx({ k: 'roll', roll: 'save', unit: 't', at: '6,5', die: 9, total: 14, tn: 12, ok: true } as any); vi.advanceTimersByTime(400);
    expect(layer.childElementCount).toBe(0); expect(faithBeat({ k: 'roll', why: 'save' } as any)).toBeUndefined();
  });
});
