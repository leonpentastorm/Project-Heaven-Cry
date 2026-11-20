// @vitest-environment jsdom
// Rules item 5524 (0.31.12 lane 2, owed fix): LEVEL UP is a big banner the whole room sees, on any screen, when a
// character gains a level. A two-player Survival test room through the reducer: fights won (run/skip) and left, their XP
// paid at the leave, until a level rises; both players' pages show LEVEL UP with the data's words.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ARCHETYPES, apply, newGame, reachable, RULES, type GameState, type Sheet } from '@engine';
import { TurnIntro, _test } from './turnIntro';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const CARDS = (RULES as any).combat.cards;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const PLAYERS = ['host', 'p2'];
function room(): GameState {
  let g = newGame('LEVELS', { id: 'host', name: 'Leon' }, 'levels'); (g as any).settings.play = 'survival'; (g as any).settings.test = true;
  g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Gun') } as any, 'host');
  (g as any).players.push({ id: 'p2', name: 'Friend', initials: 'FR', color: '#A3AEC2', online: true });
  g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Mate') } as any, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0003' } as any, 'host'); if ((g as any).run.state === 'loadout') g = apply(g, { type: 'run/ready', close: true } as any, 'host');
  return g;
}
/** One step of the run toward the next fight's pay: walk to a fight, win it, leave its field, take the materials. */
function step(g: GameState): GameState {
  const r: any = (g as any).run; let x = g;
  if (r.state === 'map') { const n = reachable(r).find((q: any) => q.kind === 'fight') || reachable(r)[0]; for (const p of PLAYERS) if ((x as any).run.state === 'map') { try { x = apply(x, { type: 'run/move', node: n.id } as any, p); } catch { /* one way on: the first mark walked */ } } if ((x as any).run.state === 'engage') x = apply(x, { type: 'run/engage', how: 'walk' } as any, 'host'); return x; }
  if (r.state === 'fight') return apply(x, { type: 'run/skip' } as any, 'host');
  if (r.state === 'reward') { for (const c of Object.values(x.characters) as any[]) if ((x as any).run.offers?.[c.id]) x = apply(x, { type: 'run/pick', charId: c.id, choice: 'materials' } as any, c.owner);
    for (const c of Object.values(x.characters) as any[]) if ((x as any).run.lasting?.[c.id]) x = apply(x, { type: 'run/take', charId: c.id, choice: 0 } as any, c.owner); return x; }
  for (const p of PLAYERS) { try { x = apply(x, { type: 'run/leave' } as any, p); } catch { /* */ } }
  return x;
}
const big = (el: HTMLElement) => el.querySelector('[data-phc-big]') as HTMLElement | null;

describe('rules item 5524: LEVEL UP for the whole room', () => {
  it('the words and sounds are the data\'s', () => {
    const g = room(), id = Object.keys(g.characters)[0], b = _test.levelUpCard(g, id);
    expect(b.name).toBe(CARDS.level_up.name); expect(b.kicker).toBe(g.characters[id].name);
    expect(b.sub).toBe(CARDS.level_up.sub.replace('{level}', String(g.characters[id].level))); expect(b.hold).toBe(CARDS.hold_ms);
    expect(b.sounds).toEqual(CARDS.level_up.sounds);
  });
  it('a level gained through the reducer shows LEVEL UP on every player\'s page', async () => {
    vi.useFakeTimers();
    const pages = PLAYERS.map((me) => { const el = document.createElement('div'); document.body.appendChild(el); return { me, el, root: createRoot(el), seen: [] as string[], ids: [] as string[] }; });
    const draw = async (x: GameState) => { for (const p of pages) await React.act(async () => { p.root.render(React.createElement(TurnIntro as any, { game: x, meId: p.me, screen: x.phase === 'combat' ? 'combat' : 'main' })); }); };
    const watch = async (ms: number) => { for (let t = 0; t < ms / 250; t++) { await React.act(async () => { vi.advanceTimersByTime(250); }); for (const p of pages) { const b = big(p.el), k = b?.getAttribute('data-phc-card'), id = b?.getAttribute('data-phc-card-id'); if (k && p.ids[p.ids.length - 1] !== id) { p.seen.push(k); p.ids.push(id!); } } } };
    let g = room(); await draw(g);
    const lv = (x: GameState) => Object.values(x.characters).map((c: any) => c.level).join(',');
    const start = lv(g); let rose = false;
    for (let k = 0; k < 80 && !rose; k++) { g = step(g); await draw(g); rose = lv(g) !== start; }
    expect(rose).toBe(true);
    await watch(20000); // (queued after the fight's own cards: the slot holds one big card at a time)
    for (const p of pages) { expect(p.seen.filter((k) => k === 'level_up').length, p.me + ' ' + p.seen.join(',')).toBe(2); } // one for each character who rose
    for (const p of pages) expect(p.seen.indexOf('level_up'), p.seen.join(',')).toBeGreaterThan(p.seen.indexOf('victory')); // after the fight's end panel
    for (const p of pages) { await React.act(async () => { p.root.unmount(); }); p.el.remove(); }
    vi.useRealTimers();
  }, 120_000);
});
