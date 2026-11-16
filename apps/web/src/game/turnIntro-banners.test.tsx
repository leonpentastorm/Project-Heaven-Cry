// @vitest-environment jsdom
// Rules 1.62 item 4740 (Leon on live 0.29.0: "Need a Big ass Battle start, battle finish (won/lost) and a Free roam
// banner. appear on the screen for at least 1.25s"): the fight's big banners. A Survival test room, solo, through the
// reducer: the fight begins (BATTLE START, before the first turn's banner), it is won (VICTORY, then FREE ROAM as the
// field opens); each is fully on screen for at least the data's hold, takes no click, and the words are the data's.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ARCHETYPES, apply, newGame, reachable, survivalRun, RULES, type GameState, type Sheet } from '@engine';
import { TurnIntro, _test } from './turnIntro';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const CARDS = (RULES as any).combat.cards;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function camp(): GameState {
  let g = newGame('BANNERS', { id: 'host', name: 'Leon' }, 'banners'); (g as any).settings.play = 'survival'; (g as any).settings.test = true;
  g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Gun') } as any, 'host');
  g = apply(g, { type: 'run/start', seed: 'PHC-0003' } as any, 'host'); g = apply(g, { type: 'run/ready', close: true } as any, 'host');
  return g;
}
const big = (el: HTMLElement) => el.querySelector('[data-phc-big]') as HTMLElement | null;

describe('the fight\'s big banners (rules 1.62 item 4740)', () => {
  it('the words and the hold are the data\'s; the whole time on screen is the hold and the slides', () => {
    expect(CARDS.hold_ms).toBeGreaterThanOrEqual(1250);
    const g = camp(), f = apply(g, { type: 'run/move', node: reachable((g as any).run).find((n: any) => n.kind === 'fight')!.id } as any, 'host');
    const b = _test.fightCard(f, f.combat, 'host'); expect(b.name).toBe(CARDS.joined.name); expect(b.hold).toBe(CARDS.hold_ms);
    expect(_test.endCard(f, f.combat, true).name).toBe(CARDS.won.name); expect(_test.endCard(f, f.combat, false).name).toBe(CARDS.lost.name);
    const w = apply(f, { type: 'run/skip' } as any, 'host');
    const m = _test.fieldCard(w.combat); expect(m.name).toBe(survivalRun.after_fight.field.name); expect(m.sub).toContain(String((w.combat as any).field.of));
    // the combat speed (k) lengthens or shortens only the slides, never the hold
    expect(_test.bigTotal({ hold: CARDS.hold_ms, k: 0.5 }, false)).toBeGreaterThan(CARDS.hold_ms);
  });

  it('BATTLE START as the fight begins, held at least the data\'s time, no click; VICTORY then FREE ROAM as the field opens', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    let g = camp();
    const draw = async (x: GameState) => { await React.act(async () => { root.render(React.createElement(TurnIntro as any, { game: x, meId: 'host', screen: x.phase === 'combat' ? 'combat' : 'main' })); }); };
    await draw(g);
    g = apply(g, { type: 'run/move', node: reachable((g as any).run).find((n: any) => n.kind === 'fight')!.id } as any, 'host');
    expect(g.phase).toBe('combat');
    await draw(g);
    const b = big(el); expect(b?.getAttribute('data-phc-card')).toBe('fight');
    expect(b!.textContent).toContain(CARDS.joined.name); expect(b!.style.pointerEvents).toBe('none');
    // still fully up just before the end of its slide in and its hold, at the slowest pace
    await React.act(async () => { vi.advanceTimersByTime(Math.round(260 * 1.2) + CARDS.hold_ms - 20); });
    expect(big(el)?.getAttribute('data-phc-card')).toBe('fight');
    await React.act(async () => { vi.advanceTimersByTime(3000); });
    expect(big(el)?.getAttribute('data-phc-card') || null).not.toBe('fight');
    // won: the field opens; VICTORY, then FREE ROAM after it
    g = apply(g, { type: 'run/skip' } as any, 'host'); expect((g as any).run.state).toBe('field');
    await draw(g);
    const seen: string[] = [];
    for (let t = 0; t < 40; t++) { await React.act(async () => { vi.advanceTimersByTime(250); }); const k = big(el)?.getAttribute('data-phc-card'); if (k && seen[seen.length - 1] !== k) seen.push(k); }
    expect(seen.filter((k) => k === 'victory' || k === 'field')).toEqual(['victory', 'field']);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  }, 60_000);
});
