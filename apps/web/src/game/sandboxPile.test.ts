// Rules 1.9 in the Proving Ground's WORLD tools, part A5: "A PILE (ON THE GROUND)" next to "A CACHE". The form becomes
// one sandbox/pile action, which goes the Narrator's ground[] way (merging, the cap, hidden): the pile is open (its
// entries show to the player who can see the tile) where a cache shows only a count; magazines keep their rounds.
import { describe, expect, it } from 'vitest';
import { type GameState, type Action, newGame, apply, viewFor, positionsOf, refOf, pileEntries, WEAPON } from '@engine';
import { blankPile, pileAction, pileChoices, isAmmoId, cacheAction, blankCache } from './sandboxWorld';

const H = 'host';
const ap = (g: GameState, a: Action) => apply(g, a, H);
function pg(): GameState {
  let g = newGame('WPP', { id: H, name: 'Leon' }, 'world-play-pile');
  g = ap(g, { type: 'sandbox/start', standalone: true } as Action);
  return ap(g, { type: 'sandbox/clear' } as Action);
}
const me = (g: GameState) => Object.values(g.characters)[0];
const off = (g: GameState, dx: number, dy: number) => { const [x, y] = positionsOf(g)[me(g).id].split(',').map(Number); return refOf((x + dx) + ',' + (y + dy)); };
const dxOf = (g: GameState) => (Number(positionsOf(g)[me(g).id].split(',')[0]) > 3 ? -1 : 1);

describe('A PILE (ON THE GROUND) in the WORLD tools', () => {
  it('the picker offers magazines and loose rounds first, then weapons and items', () => {
    const c = pileChoices();
    expect(c[0].id.startsWith('mag:')).toBe(true); expect(c.some((x) => x.id === 'rounds:' + WEAPON.service_pistol.ammo)).toBe(true);
    expect(c.some((x) => x.id === 'stim_injector')).toBe(true); expect(isAmmoId('mag:x')).toBe(true); expect(isAmmoId('stim_injector')).toBe(false);
  });
  it('places an open pile: the player sees every entry, a magazine with its rounds (a cache beside it shows a count only)', () => {
    let g = pg(); const dx = dxOf(g), tile = off(g, dx, 0);
    g = ap(g, pileAction(blankPile(), tile));
    g = ap(g, cacheAction(blankCache(), off(g, dx, 1)));
    const v = viewFor(g, H), p = (v.story.objects || []).find((o) => o.kind === 'pile')!;
    expect(refOf(p.pos)).toBe(tile);
    expect(pileEntries(p).length).toBe(2); expect(pileEntries(p)[1].label).toMatch(/^20 × /);
    expect(pileEntries(p)[0].label).toBe('Service pistol magazine 7/12');
    const cache = (v.story.objects || []).find((o) => o.kind === 'cache')!; expect(cache.items).toEqual([]); expect((cache as any).itemCount).toBe(2);
    expect(g.story.entries.some((e) => /A pile at [A-Z]+\d+ \(2 things\)/.test(e.text))).toBe(true);
  });
  it('a second pile on the same tile merges; an empty magazine stays empty; hidden hides it from the players', () => {
    let g = pg(); const dx = dxOf(g), tile = off(g, dx, 0);
    g = ap(g, pileAction(blankPile(), tile));
    g = ap(g, pileAction({ items: [{ item: 'mag:service_pistol', qty: 0 }, { item: 'rounds:' + WEAPON.service_pistol.ammo, qty: 10 }], hidden: false }, tile));
    const p = (g.story.objects || []).filter((o) => o.kind === 'pile'); expect(p.length).toBe(1);
    const labels = pileEntries(p[0]).map((e) => e.label);
    expect(labels).toContain('Service pistol magazine 0/12'); expect(labels.some((l) => /^30 × /.test(l))).toBe(true); // loose rounds merge into one stack
    g = ap(g, pileAction({ items: [{ item: 'stim_injector', qty: 1 }], hidden: true }, off(g, dx, 2)));
    expect((g.story.objects || []).find((o) => o.kind === 'pile' && refOf(o.pos) === off(g, dx, 2))?.hidden).toBe(true);
    expect((viewFor(g, H).story.objects || []).some((o) => o.kind === 'pile' && refOf(o.pos) === off(g, dx, 2))).toBe(false);
  });
  it('refuses an empty pile, with the reason', () => {
    const g = pg();
    expect(() => ap(g, pileAction({ items: [], hidden: false }, off(g, dxOf(g), 0)))).toThrow(/Nothing can go there/);
  });
});

describe('review fixes: names and the host\'s loot log', () => {
  it('the pile picker names loose rounds as the engine does; the host\'s loot-cap line; a pile\'s list clears a token on its tile', async () => {
    const names = pileChoices().filter((c) => c.id.startsWith('rounds:')).map((c) => c.name);
    expect(names).toContain('Loose rounds: .32 Decrkm'); expect(names).toContain('Loose rounds: Rifle rounds');
    const { lootLogLine, pileTipStyle } = await import('./worldView');
    expect(lootLogLine([])).toBe('');
    expect(lootLogLine(['Loot cap reached (2 a easy fight): A\'s Flare not dropped.', 'Loot cap reached (2 a easy fight): B\'s Flare not dropped.'])).toBe('HOST ONLY · Loot cap reached (2 a easy fight): B\'s Flare not dropped. (1 more held back earlier)');
    const L: any = { tipStyle: 'position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); z-index: 8; padding: 5px 8px' };
    expect(pileTipStyle(L, 3, 5, 16, true)).toMatch(/left: calc\(100% \+ 8px\); top: 0; transform: none; z-index: 9/);
    expect(pileTipStyle(L, 12, 5, 16, true)).toMatch(/right: calc\(100% \+ 8px\)/);
    expect(pileTipStyle(L, 3, 5, 16)).toMatch(/bottom: calc\(100% \+ 4px\)/);
  });
});
