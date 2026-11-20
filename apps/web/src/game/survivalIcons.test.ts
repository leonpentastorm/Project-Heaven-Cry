// One picture for one thing (Leon, playing live 0.30.0: "body armour class 1 have no icon in the shop and normal icon in
// inventory, hellraiser magazine have the weapon icon instead of the magazine's icon"). Every id Survival's shop, rewards
// and camp can show, read from data, draws through the one resolver (gearIcons.ts gearIconUri) the same picture the
// sheet's GEAR tab draws for what that id puts in the pack; a magazine or rounds never draw their gun; and the Sell and
// Give rows, made by the engine's views through the reducer, name a magazine as a magazine.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WEAPON, ITEM, priceOf, lineGoods, SHOP_DATA, LOADOUT, RACK, shopView, giveView, apply, type GameState, type RunNode } from '@engine';
import { survivalRoom, startRun, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import type { Pc } from '../../../../packages/engine/test/helpers/replay';
import { gearIconUri, packGearId, torsoGearId } from './gearIcons';

// Items 2.0 (rulings of 20 Nov 2026: new rows ship on a placeholder): an id the typing sheet adds has no picture until the
// artist's is taken in (art/briefs/ART-REQUESTS.md); the item card draws its marked placeholder (itemCardView). It is exempt
// from `none` only while it has none, so the day its picture lands the guard binds it again.
const SHEET = JSON.parse(readFileSync(new URL('../../../../docs/design/proposals/2026-11-20-items-2.0-rows.json', import.meta.url), 'utf8'));
const ON_PLACEHOLDER = new Set<string>([...SHEET.weapons, ...SHEET.items].map((r: any) => r.id));

const big = (id: string) => gearIconUri(id, undefined, { large: true });
/** What the GEAR tab draws for what an id puts in the pack (body armour of a class: the outer slot's torso). */
function inventoryIcons(id: string): string[] {
  const ac = /^armour:(\d+)$/.exec(id); if (ac) return [big(torsoGearId(Number(ac[1])))];
  return lineGoods(id, 1).map((it) => big(packGearId(it)));
}
const W: any = WEAPON, I: any = ITEM;
const magGuns = Object.keys(W).filter((w) => W[w].reload === 'magazine' && priceOf('mag:' + w) != null);
const calibres = [...new Set(Object.keys(W).map((w) => W[w].ammo).filter((c) => c && priceOf('rounds:' + c) != null))] as string[];
/** Every id the shop (its always-stocked shelves, the counter's magazines and rounds for the guns carried, the rolled
 *  gear), the rewards and the camp (its stock, focuses and their fuel, the rack) can show. */
const SHOWN: string[] = [...new Set([
  ...SHOP_DATA.always.flatMap((s) => s.ids.map((x) => x.id)),
  ...magGuns.flatMap((w) => ['mag:' + w, 'mag:' + w + ':0']),
  ...calibres.map((c) => 'rounds:' + c),
  ...Object.keys(W).filter((id) => priceOf(id) != null),
  ...Object.keys(I).filter((id) => priceOf(id) != null),
  ...LOADOUT.stock.ids, ...LOADOUT.focuses, ...Object.values(LOADOUT.focus_with).flat().map((x) => x.id),
  ...RACK.flatMap((r) => [r.free, r.better].filter((x): x is string => !!x)),
])].sort();

describe('Survival icons: the shop, the camp and the rewards draw what the GEAR tab draws', () => {
  it('every shown id: the same picture as the pack entry it makes, and not none', () => {
    const differ: string[] = [], none: string[] = [];
    for (const id of SHOWN) {
      const shop = big(id), inv = inventoryIcons(id);
      if (!shop && !ON_PLACEHOLDER.has(id)) none.push(id);
      if (inv.length && inv.some((x) => x !== shop)) differ.push(id);
    }
    expect(differ).toEqual([]);
    expect(none).toEqual([]);
  });
  it('body armour of a class: its painted torso, in the shop and on the sheet', () => {
    for (let n = 1; n <= 5; n++) { expect(big('armour:' + n), 'armour:' + n).toBeTruthy(); expect(big('armour:' + n)).toBe(big(torsoGearId(n))); }
  });
  it("a magazine or rounds never draw their gun's picture; an empty magazine draws the full one's", () => {
    for (const w of magGuns) {
      expect(big('mag:' + w), w).toBeTruthy();
      expect(big('mag:' + w), w).not.toBe(big(w));
      expect(big('mag:' + w + ':0'), w).toBe(big('mag:' + w));
    }
    for (const c of calibres) for (const w of Object.keys(W).filter((x) => W[x].ammo === c)) expect(big('rounds:' + c), c).not.toBe(big(w));
  });
});

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
function inShop(prep: (g: GameState) => void, seed = 'PHC-ICONS'): GameState {
  const g = clone(startRun(survivalRoom(seed, DUO, { test: true }), seed)), shop = g.run!.nodes.find((n: RunNode) => n.kind === 'shop')!, prev = g.run!.nodes.find((x: RunNode) => x.links.includes(shop.id))!;
  g.run!.at = prev.id; g.run!.state = 'map'; prep(g);
  let x = g; for (let i = 0; i < 2 && x.run!.at !== shop.id; i++) x = apply(x, { type: 'run/move', node: shop.id } as any, ownerOf(i));
  expect(x.run!.state).toBe('shop'); return x;
}

describe('the Sell and Give rows name a magazine as a magazine', () => {
  it("each row's picture is its pack entry's; a Hellraiser magazine's is the magazine's, not the rifle's", () => {
    const gun = magGuns.find((w) => w.startsWith('hellraiser')) || magGuns[0];
    const g = inShop((x) => { const c = x.characters.c1; c.pack = [...(c.pack || []), ...lineGoods('mag:' + gun, 1), ...lineGoods(gun, 1), ...lineGoods('rounds:' + W[gun].ammo, 5)]; });
    const pack = g.characters.c1.pack || [];
    const sell = shopView(g as any, 'host')!.sell.filter((r) => r.idx >= 0);
    expect(sell.length).toBe(pack.length);
    for (const r of sell) expect(big(r.id), r.label).toBe(big(packGearId(pack[r.idx])));
    const give = giveView(g, 'host').rows.filter((r) => r.kind === 'pack');
    for (const r of give) expect(big(r.id), r.label).toBe(big(packGearId(pack[r.idx!])));
    const magIdx = pack.findIndex((it) => it.mags && it.weapon === gun);
    expect(big(sell.find((r) => r.idx === magIdx)!.id)).toBe(big('mag:' + gun));
    expect(big(sell.find((r) => r.idx === magIdx)!.id)).not.toBe(big(gun));
  });
});
