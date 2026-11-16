// @vitest-environment jsdom
// Rules 1.62 item 4900 (Leon on live 0.29.0: "Need a Big ass Battle start, battle finish (won/lost) and a Free roam
// banner. appear on the screen for at least 1.25s"): the fight's big banners. A Survival test room, solo, through the
// reducer: the fight begins (BATTLE START, before the first turn's banner), it is won (VICTORY, then FREE ROAM as the
// field opens); each is fully on screen for at least the data's hold, takes no click, and the words are the data's.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ARCHETYPES, apply, viewFor, isUnseenId, newGame, reachable, survivalRun, RULES, type GameState, type Sheet } from '@engine';
import { TurnIntro, _test, EV_FX_AT, EV_TURN } from './turnIntro';
import { combatStreamKey } from './fx/FxLayer';

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

describe('the fight\'s big banners (rules 1.62 item 4900)', () => {
  it('the words and the hold are the data\'s; the whole time on screen is the hold and the slides', () => {
    expect(CARDS.hold_ms).toBeGreaterThanOrEqual(1250);
    const g = camp(), f = apply(g, { type: 'run/move', node: reachable((g as any).run).find((n: any) => n.kind === 'fight')!.id } as any, 'host');
    const b = _test.fightCard(f, f.combat, 'host'); expect(b.name).toBe(CARDS.joined.name); expect(b.hold).toBe(CARDS.hold_ms);
    // rules 1.62 item 4902: the player's view (the engine's fog); a hostile out of sight as the fight opens, and
    // BATTLE START's line says every step costs AP; with every hostile in sight, no such line
    expect(CARDS.joined.fog).toBeTruthy();
    const v = viewFor(f, 'host') as GameState, hidden = (v.combat as any).order.some((id: string) => isUnseenId(id));
    expect(hidden).toBe(true); // seed PHC-0003's first fight opens in fog (the test means something)
    expect(_test.fightCard(v, v.combat, 'host').sub).toContain(CARDS.joined.fog);
    expect(_test.fightCard(f, f.combat, 'host').sub.includes(CARDS.joined.fog)).toBe(false); // the full state: all in sight
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
  it('with the effects clock on, the first field turn banner waits for VICTORY and FREE ROAM (they come first, it after them)', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el);
    const log: string[] = []; const onTurn = () => log.push('turn'); window.addEventListener(EV_TURN, onTurn);
    let g = camp();
    const draw = async (x: GameState) => { await React.act(async () => { root.render(React.createElement(TurnIntro as any, { game: x, meId: 'host', screen: x.phase === 'combat' ? 'combat' : 'main' })); }); };
    // the effects layer announces how far it has played (game/fx: phc:fx-at), for the fight on screen
    const clockTo = async (x: GameState) => { const cb: any = x.combat, fx = cb.fx || [], n = cb.fxSeq || (fx.length ? fx[fx.length - 1].n : 0);
      await React.act(async () => { window.dispatchEvent(new CustomEvent(EV_FX_AT, { detail: { stream: combatStreamKey(x), n } })); }); };
    await draw(g);
    g = apply(g, { type: 'run/move', node: reachable((g as any).run).find((n: any) => n.kind === 'fight')!.id } as any, 'host');
    await draw(g); await clockTo(g);
    await React.act(async () => { vi.advanceTimersByTime(8000); });
    g = apply(g, { type: 'run/skip' } as any, 'host'); expect((g as any).run.state).toBe('field');
    // the won step's last effect is the field's first turn event
    const fx: any[] = (g.combat as any).fx; expect(fx[fx.length - 1].k).toBe('turn');
    log.length = 0;
    await draw(g); await clockTo(g); // the clock reaches the turn event at once: the worst case
    for (let t = 0; t < 60; t++) {
      await React.act(async () => { vi.advanceTimersByTime(100); });
      const k = big(el)?.getAttribute('data-phc-card'); if (k && log[log.length - 1] !== k) log.push(k);
    }
    expect(log.indexOf('victory')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('field')).toBeGreaterThan(log.indexOf('victory'));
    expect(log.indexOf('turn')).toBeGreaterThan(log.indexOf('field'));
    window.removeEventListener(EV_TURN, onTurn);
    await React.act(async () => { root.unmount(); }); el.remove(); vi.useRealTimers();
  }, 60_000);
});
