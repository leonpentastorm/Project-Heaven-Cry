// Rules 1.56 (Balance 2.0), lane L4: variants (data/variants.json). A variant is one data line: a base weapon or focus
// and one or two modifiers of the closed list of kinds. The loader (src/variants.ts) makes its row at load; nothing
// here or in the engine names a variant. THE HUNDREDTH ITEM: a variant line the engine has never seen, expanded by the
// one loader, shows on the card, prices in the shop (bought through run/buy) and acts in a fight through the reducer
// (combat/attack). The shipped lines are checked the same way, by what their data says, never by a typed number.
import { describe, it, expect, afterAll } from 'vitest';
import { A, W, HIT, pcs, foes, act } from './golden/harness';
import { modRoom, modFight } from './golden/mods';
import { expandVariants } from '../src/variants';
import { apply, creditsOf, packOf, WEAPON, ITEM, VARIANT_MOD, priceOf, RARITY, type GameState, type RunNode } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import variantsJ from '../../../data/variants.json';

const VJ: any = variantsJ;
const kind = (id: string) => VJ.kinds.find((k: any) => k.id === id);
const formOf = (m: any) => { const k = kind(m.kind); return k.forms.find((f: any) => f.id === (m.form || k.forms[0].id)); };

// ---------- the never-seen line, through the one loader ----------
const LINE = { id: 'drifter_revolver.never_seen', name: "Drifter 'Never Seen'", base: 'drifter_revolver', rarity: 'fine',
  mods: [{ kind: 'harder', form: 'weapon', value: 1.1 }, { kind: 'deep_magazine', value: 2 }] };
const made = expandVariants({ kinds: VJ.kinds, items: [LINE] }, A.WEAPON, A.ITEM);
for (const w of made.weapons) (A.WEAPON as any)[w.id] = w;
for (const m of made.mods) VARIANT_MOD[m.id] = m;
afterAll(() => { delete (A.WEAPON as any)[LINE.id]; for (const m of made.mods) delete VARIANT_MOD[m.id]; });

const dmgOf = (g: any, mode = 'shot') => { const u = pcs(g)[0], t = foes(g)[0]; return W(g, () => A.previewAttack(g.combat, u, t, mode as any)); };
const started = (seed = 'PHC-0001') => startRun(survivalRoom(seed, [{ build: 'plain_gun', level: 1 }], { test: true }), seed);
function inShop(rich: number): GameState {
  const g = started(), shop = g.run!.nodes.find((n) => n.kind === 'shop')!, prev = g.run!.nodes.find((x) => x.links.includes(shop.id))!;
  let x: GameState = JSON.parse(JSON.stringify(g)); x.run!.at = prev.id; x.run!.state = 'map';
  for (const c of Object.values(x.characters)) c.credits = rich;
  for (let i = 0; i < 1 && x.run!.at !== shop.id; i++) x = apply(x, { type: 'run/move', node: (shop as RunNode).id }, ownerOf(i));
  return x;
}

describe('rules 1.56 L4: a variant is one line of data', () => {
  it('the loader makes the row: the base\'s numbers with the field kinds\' changes, its own id, name and grade, one modifier item per effect kind', () => {
    const row: any = A.WEAPON[LINE.id], base: any = A.WEAPON[LINE.base];
    expect(row.name).toBe(LINE.name); expect(row.variant_of).toBe(LINE.base); expect(row.variant_grade).toBe(LINE.rarity);
    expect(row.magazine).toBe(base.magazine + LINE.mods[1].value);
    expect(row.damage).toEqual(base.damage);
    expect(row.variant_mods).toHaveLength(1);
    const mod = VARIANT_MOD[row.variant_mods[0]]; expect(mod.effects[0].value).toBe(LINE.mods[0].value);
    // its worth: each modifier's distance from its kind's neutral times its form's worth_per
    const worth = LINE.mods.reduce((t, m) => t + Math.abs((m.value ?? 0) - Number(kind(m.kind).neutral || 0)) * formOf(m).worth_per, 0);
    expect(row.variant_worth).toBeCloseTo(worth, 6);
  });

  it('the hundredth item shows on the card: the magazine with its change in it, then one line per modifier, its kind\'s sentence', () => {
    const g = modRoom({ weapon: LINE.id }), c = g.characters.c1;
    const card = A.gearPreview(c, { id: LINE.id }), bare = A.gearPreview(c, { id: LINE.base });
    expect(card.name).toBe(LINE.name);
    expect(card.lines.find((l: any) => l.key === 'mag').num).toBe(bare.lines.find((l: any) => l.key === 'mag').num + LINE.mods[1].value);
    const hard = card.lines.find((l: any) => l.key === 'variant:harder');
    expect(hard).toMatchObject({ label: kind('harder').name, value: 'Lands 10% harder.' });
    expect(card.lines.find((l: any) => l.key === 'variant:deep_magazine')!.value).toBe('Holds ' + LINE.mods[1].value + ' more rounds.');
    expect(card.lines.find((l: any) => l.key === 'dmg').num).toBeGreaterThan(bare.lines.find((l: any) => l.key === 'dmg').num);
  });

  it('the hundredth item prices in the shop: priceOf is the base\'s price x (1 + worth / 100) at its grade, and run/buy charges it', () => {
    const row: any = A.WEAPON[LINE.id], base: any = A.WEAPON[LINE.base];
    const want = Math.round(base.price_credits * (1 + row.variant_worth / 100) * RARITY[LINE.rarity as 'fine'].price);
    expect(priceOf(LINE.id)).toBe(want);
    expect(priceOf(LINE.id, 'standard')).toBe(want); // never under its own grade
    expect(priceOf(LINE.id, 'masterwork')).toBe(Math.round(base.price_credits * (1 + row.variant_worth / 100) * RARITY.masterwork.price));
    // a shop that names it (a campaign's stock, a hand-written list): the piece is priced by priceOf, bought by run/buy
    let g = inShop(100000); const sh: any = g.run!.shop!;
    expect(g.run!.state).toBe('shop');
    const price = Math.round(priceOf(LINE.id, LINE.rarity as any)! * 1);
    sh.stock.push({ key: 'sv', id: LINE.id, rarity: LINE.rarity, price });
    const before = creditsOf(g.characters.c1);
    g = apply(g, { type: 'run/buy', charId: 'c1', key: 'sv' }, 'host');
    expect(creditsOf(g.characters.c1)).toBe(before - price);
    expect(packOf(g.characters.c1).some((x) => (x.weapon || x.item || x.id) === LINE.id && x.rarity === LINE.rarity)).toBe(true);
  });

  it('the hundredth item acts in a fight through the reducer: Harder multiplies the damage, only with the variant in hand', () => {
    const g = modFight({ weapon: LINE.id }), bare = modFight({ weapon: LINE.base });
    const p = dmgOf(g), b = dmgOf(bare);
    expect(p.toHit).toBe(b.toHit);
    expect(p.dmg.total).toBeGreaterThan(b.dmg.total);
    const u = pcs(g)[0], t = foes(g)[0], r = act(g, { type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' }, HIT);
    expect(r.ok).toBe(true);
    const rb = act(bare, { type: 'combat/attack', unitId: pcs(bare)[0].id, targetId: foes(bare)[0].id, mode: 'shot' }, HIT);
    const hp = (x: any) => foes(x.g)[0].hp;
    expect(hp(r)).toBeLessThan(hp(rb));
    // its magazine in the fight is the variant's row's
    expect(pcs(g)[0].magSize ?? pcs(g)[0].mag ?? A.WEAPON[LINE.id].magazine).toBe(A.WEAPON[LINE.id].magazine);
  });
});

describe('rules 1.56 L4: the shipped variants', () => {
  it('every line is made: a row in WEAPON or ITEM by its id, priced, its modifiers held as items', () => {
    for (const v of VJ.items) {
      const row: any = (WEAPON as any)[v.id] || (ITEM as any)[v.id];
      expect(row, v.id).toBeTruthy(); expect(row.variant_of).toBe(v.base);
      expect(priceOf(v.id), v.id).toBeGreaterThan(priceOf(v.base)!);
      expect(row.variant_worth, v.id).toBeLessThanOrEqual(VJ.worth_cap);
      for (const id of row.variant_mods) expect(VARIANT_MOD[id], id).toBeTruthy();
    }
  });
  it('a gun variant with Kicks less shows its Recoil lower on the card (the row\'s own recoil field, through gearNum)', () => {
    const v = VJ.items.find((x: any) => x.mods.some((m: any) => m.kind === 'kicks_less'));
    const g = modRoom({ weapon: v.id }), c = g.characters.c1, m = v.mods.find((x: any) => x.kind === 'kicks_less');
    const card = A.gearPreview(c, { id: v.id }), bare = A.gearPreview(c, { id: v.base });
    expect(card.lines.find((l: any) => l.key === 'recoil').num).toBe(Math.max(0, bare.lines.find((l: any) => l.key === 'recoil').num - m.value));
  });
});

// ---------- the focus kinds (plan 0.29 primitive 4: the stats flux_max and core_charge, C11: one copy in data) ----------
import { fightWith } from './helpers/perkfight';
import { FLUX_MAX, CORE_CHARGE } from '../src/magic';
import rulesJ from '../../../data/rules.json';
const RJ: any = rulesJ;
const MIND = { archetype: 'sigilist', kit: 'sigil', level: 6 } as const;
const sigil = (weapon: string) => { const f = fightWith([{ ...MIND, weapon }], [{}]); const u = f.turn(f.pc); return { f, u }; };
const valueOf = (id: string, k: string) => VJ.items.find((x: any) => x.id === id).mods.find((m: any) => m.kind === k);
const evokerWith = (k: string) => VJ.items.find((x: any) => x.base === 'evoker' && x.mods.some((m: any) => m.kind === k)).id;

describe('rules 1.56 L4: focus variants act through the reducer', () => {
  it('C11: the Flux limit and a core\'s charge are rules.json\'s, one copy', () => {
    expect(FLUX_MAX).toBe(RJ.mana.sigil.flux.safe_max); expect(CORE_CHARGE).toBe(RJ.mana.cores.standard.charge);
  });
  it('Deep cell and Quick hands (core): combat/core loads the bigger core, a core\'s swap 1 AP cheaper', () => {
    const id = evokerWith('deep_cell'), dc = valueOf(id, 'deep_cell');
    const a = sigil(id), b = sigil('evoker');
    a.u.mg!.charge = 1; b.u.mg!.charge = 1; const ap0 = a.u.ap, bp0 = b.u.ap;
    a.f.act({ unitId: a.u.id, type: 'combat/core' }); b.f.act({ unitId: b.u.id, type: 'combat/core' });
    expect(b.f.unit(b.u.id).mg!.charge).toBe(CORE_CHARGE);
    expect(a.f.unit(a.u.id).mg!.charge).toBe(CORE_CHARGE + dc.value);
    expect(bp0 - b.f.unit(b.u.id).ap - (ap0 - a.f.unit(a.u.id).ap)).toBe(-valueOf(id, 'quick_hands').value);
  });
  it('Holds more Flux: a glyph drawn at the base limit overloads the plain Evoker and not the variant', () => {
    const id = evokerWith('holds_more_flux');
    const run = (w: string) => { const { f, u } = sigil(w); u.mg!.flux = FLUX_MAX; const word = f.unit(u.id).mg!.words[0]; f.act({ unitId: u.id, type: 'combat/draw', word, tile: f.unit(u.id).pos }); return f.cb.log.some((l: string) => /OVERLOAD/.test(l)); };
    expect(run('evoker')).toBe(true);
    expect(run(id)).toBe(false);
  });
});
