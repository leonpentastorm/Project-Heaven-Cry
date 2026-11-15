// Rules 1.55: weapon mods in a Survival run. A mod the engine does not run (`built: false`) has no price, so no stock,
// reward or camp pool holds it; in a run the free fit (gear/mod) is refused and the armourer at a Forge fits, swaps or
// takes off a mod for a fee (survival.json forge.fit: rate x the mod's price, at least min); outside a run the fit stays
// free. Every step goes through the one reducer; the numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, creditsOf, priceOf, packOf, runOptions, unitFromCharacter, opticBands, ITEM, WEAPON, rollStock, openVisit, lastingOffer, weaponOffer, priceBand } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import { storyWith } from './helpers/perkfight';
import type { Pc } from './helpers/replay';
import svJ from '../../../data/survival.json';

const SV: any = svJ, FEE = SV.forge.fit;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const fee = (id: string) => Math.ceil(Math.max(FEE.min, FEE.rate * (priceOf(id) || 0)));
const UNBUILT = (Object.values(ITEM) as any[]).filter((it) => it.built === false).map((it) => it.id);
const give = (g: GameState, id: string) => { const c = g.characters.c1; c.pack = [...packOf(c), { id, item: id, name: (ITEM[id] as any).name, qty: 1, kind: 'tool' } as any]; return packOf(c).length - 1; };
/** The squad at a node of this kind (a node of depth 5 made that kind, walked into), each with 10000 credits. */
function visit(kind: string, seed = 'PHC-0001', prep?: (g: GameState) => void): GameState {
  const g0 = clone(startRun(survivalRoom(seed, DUO, { test: true }), seed)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  for (const c of Object.values(g0.characters)) c.credits = 10000;
  prep?.(g0);
  let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
}
/** A built mod for a slot the character's main weapon has (the red dot first: its band is read by every shot's roll). */
const modFor = (g: GameState) => { const slots: string[] = (WEAPON[g.characters.c1.weapon] as any).mod_slots || [];
  return ['mod_red_dot', 'mod_extended_mag', 'mod_compensator'].find((m) => slots.includes((ITEM[m] as any).mod_slot))!; };

describe('rules 1.55: a mod the engine does not run is never sold', () => {
  it('the three inert mods are flagged and have no price; the foregrip is built (rules 1.56: Bursts and full auto with it)', () => {
    for (const id of ['mod_wrapped_grip', 'mod_underslung', 'mod_sigil_magazine']) { expect(UNBUILT).toContain(id); expect(priceOf(id)).toBeNull(); }
    expect(UNBUILT).not.toContain('mod_foregrip'); expect(priceOf('mod_foregrip')).toBe((ITEM.mod_foregrip as any).price_credits);
  });
  it('no built: false item across 200 seeded Forge stocks, shop stocks and picks of kit', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const seed = 'MODS-' + i, g = clone(startRun(survivalRoom(seed, DUO, { test: true }), seed));
      const forge = openVisit(g, { id: 'n' + (i % 9), kind: 'forge' }).stock || [];
      for (const s of forge) seen.add(s.id);
      for (const p of rollStock(seed, { id: 'n' + (i % 9), depth: 1 + (i % 12) }, 1 + (i % 4))) seen.add(p.id);
      for (const x of lastingOffer(g.characters.c1, { id: 'n' + (i % 9), kind: 'elite' }, 1 + (i % 4), seed).items) seen.add(x.id);
    }
    expect(seen.size).toBeGreaterThan(10);
    for (const id of UNBUILT) expect(seen.has(id)).toBe(false);
  });
});

describe('rules 1.55: in a run, the armourer fits mods at a Forge, for a fee', () => {
  it('gear/mod is refused in a run, in words; at a Forge run/fit_mod fits it for the fee and the fight\'s unit carries it', () => {
    const g = visit('forge'), m = modFor(g), i = give(g, m);
    expect(refused(g, { type: 'gear/mod', charId: 'c1', idx: i })).toBe('In a Survival run, the armourer fits mods at a Forge, for a fee.');
    const o = runOptions(g, 'c1').find((x) => x.group === 'mod' && (x.action as any).idx === i)!;
    expect(o.price).toBe(fee(m)); expect(o.why).toBeNull();
    const before = unitFromCharacter(g.characters.c1, '1,1', { state: 1 } as any);
    const a = apply(g, o.action as any, 'host'), c = a.characters.c1;
    expect(c.weaponState?.mods).toContain(m); expect(creditsOf(c)).toBe(10000 - fee(m));
    expect(packOf(c).some((x) => (x.item || x.id) === m)).toBe(false);
    const after = unitFromCharacter(c, '1,1', { state: 1 } as any);
    // the fight's unit is built with it: the red dot's range band, which the attack's to-hit reads (combat.ts previewAttack)
    expect(m).toBe('mod_red_dot'); expect(after.mods).toContain(m); expect(opticBands(before, 'snap' as any)).toBe(0); expect(opticBands(after, 'snap' as any)).toBe(1);
    // run/unfit_mod: back in the pack, the fee again
    const b = apply(a, { type: 'run/unfit_mod', charId: 'c1', mod: m }, 'host');
    expect(b.characters.c1.weaponState?.mods || []).not.toContain(m); expect(packOf(b.characters.c1).some((x) => (x.item || x.id) === m)).toBe(true);
    expect(creditsOf(b.characters.c1)).toBe(10000 - 2 * fee(m));
  });
  it('a swap pays the new mod\'s fee once and returns the old one; off a Forge the fit is refused', () => {
    const g = visit('forge'); const slots: string[] = (WEAPON[g.characters.c1.weapon] as any).mod_slots || [];
    expect(slots).toContain('optic');
    const a = apply(g, { type: 'run/fit_mod', charId: 'c1', idx: give(g, 'mod_red_dot') }, 'host');
    const j = give(a, 'mod_scope'), b = apply(a, { type: 'run/fit_mod', charId: 'c1', idx: j }, 'host');
    expect(b.characters.c1.weaponState?.mods).toContain('mod_scope'); expect(b.characters.c1.weaponState?.mods).not.toContain('mod_red_dot');
    expect(packOf(b.characters.c1).some((x) => (x.item || x.id) === 'mod_red_dot')).toBe(true);
    expect(creditsOf(b.characters.c1)).toBe(10000 - fee('mod_red_dot') - fee('mod_scope'));
    const rest = visit('rest'); expect(refused(rest, { type: 'run/fit_mod', charId: 'c1', idx: give(rest, 'mod_red_dot') })).toBe('You are not at a Forge.');
  });
  it('the fee is at least the floor, and a purse that can\'t pay is refused in words', () => {
    expect(fee('mod_wrapped_grip')).toBe(FEE.min);
    const g = visit('forge', 'PHC-0001', (x) => { x.characters.c1.credits = 1; }), m = modFor(g);
    expect(refused(g, { type: 'run/fit_mod', charId: 'c1', idx: give(g, m) })).toMatch(/credits short/);
  });
});

describe('rules 1.55: outside a run the fit stays free', () => {
  it('gear/mod fits a mod in a story scene, no credits', () => {
    const s = storyWith([{ kit: 'soldier' }]), g = clone(s.g), c = g.characters.c1, slots: string[] = (WEAPON[c.weapon] as any).mod_slots || [];
    const m = ['mod_red_dot', 'mod_extended_mag', 'mod_suppressor'].find((x) => slots.includes((ITEM[x] as any).mod_slot))!;
    const was = creditsOf(c), a = apply(g, { type: 'gear/mod', charId: 'c1', idx: give(g, m) }, 'host');
    expect(a.characters.c1.weaponState?.mods).toContain(m); expect(creditsOf(a.characters.c1)).toBe(was);
  });
});

// Rules 1.56 (Balance 2.0), L3: a mod as a reward pick; the armourer fits to any gun carried; the extra slot for the fee.
const MR: any = SV.rewards.mods;
const gunLine = (g: GameState, id: string, more: any = {}) => { const c = g.characters.c1; c.pack = [...packOf(c), { id, name: (WEAPON[id] as any).name, qty: 1, kind: 'weapon', weapon: id, ...more } as any]; return packOf(c).length - 1; };
const slotOf = (m: string) => (ITEM[m] as any).mod_slot;
const isMod = (id: string) => (ITEM[id] as any)?.category === 'mod';

describe('rules 1.56 L3: the armourer fits to any gun carried', () => {
  it('a pack gun takes a mod at the Forge for the fee; the card names it; unfit takes it off for the fee again', () => {
    const g = visit('forge'), j = gunLine(g, 'service_pistol'), i = give(g, 'mod_suppressor');
    const o = runOptions(g, 'c1').find((x) => x.group === 'mod' && (x.action as any).idx === i && (x.action as any).where === j)!;
    expect(o).toBeTruthy(); expect(o.why).toBeNull(); expect(o.price).toBe(fee('mod_suppressor')); expect(o.label).toMatch(/in your pack/); expect(o.verb).toBe('Fit');
    const a = apply(g, o.action as any, 'host'), c = a.characters.c1, gun = packOf(c).find((x) => x.weapon === 'service_pistol')!;
    expect(gun.mods).toEqual(['mod_suppressor']); expect(c.weaponState?.mods || []).not.toContain('mod_suppressor');
    expect(packOf(c).some((x) => (x.item || x.id) === 'mod_suppressor')).toBe(false); expect(creditsOf(c)).toBe(10000 - fee('mod_suppressor'));
    const k = packOf(c).indexOf(gun), off = runOptions(a, 'c1').find((x) => x.group === 'mod' && (x.action as any).type === 'run/unfit_mod' && (x.action as any).where === k)!;
    expect(off.verb).toBe('Take off');
    const b = apply(a, off.action as any, 'host');
    expect(packOf(b.characters.c1).find((x) => x.weapon === 'service_pistol')!.mods || []).toEqual([]);
    expect(packOf(b.characters.c1).some((x) => (x.item || x.id) === 'mod_suppressor')).toBe(true); expect(creditsOf(b.characters.c1)).toBe(10000 - 2 * fee('mod_suppressor'));
  });
  it('one of a stack of guns is split off to take the mod; a mod with no slot on that gun is refused in words naming it', () => {
    const g = visit('forge'), j = gunLine(g, 'service_pistol', { qty: 2 }), i = give(g, 'mod_extended_mag');
    const a = apply(g, { type: 'run/fit_mod', charId: 'c1', idx: i, where: j } as any, 'host');
    const lines = packOf(a.characters.c1).filter((x) => x.weapon === 'service_pistol');
    expect(lines.map((x) => x.qty).sort()).toEqual([1, 1]); expect(lines.filter((x) => (x.mods || []).includes('mod_extended_mag')).length).toBe(1);
    const g2 = visit('forge'), j2 = gunLine(g2, 'service_pistol'), k = give(g2, 'mod_serrated');
    expect(refused(g2, { type: 'run/fit_mod', charId: 'c1', idx: k, where: j2 })).toBe('The ' + (WEAPON.service_pistol as any).name + ' has no edge slot.');
  });
  it('the extra slot (Gun Nut): refused free in a run, fitted by the armourer for the same fee beside the one there', () => {
    const g = visit('forge', 'PHC-0001', (x) => { const c = x.characters.c1; c.traits = [...(c.traits || []), 'gun_nut']; c.weaponState = { ...(c.weaponState || {}), mods: ['mod_red_dot'] }; });
    const i = give(g, 'mod_scope');
    expect(refused(g, { type: 'story/perk', charId: 'c1', id: 'gun_nut', actionId: 'extra_mod', choice: 'mod_scope' })).toMatch(/Survival run/);
    const o = runOptions(g, 'c1').find((x) => x.key === 'mod:extra:' + i)!;
    expect(o.why).toBeNull(); expect(o.price).toBe(fee('mod_scope'));
    const a = apply(g, o.action as any, 'host'), c = a.characters.c1;
    expect([...(c.weaponState?.mods || [])].sort()).toEqual(['mod_red_dot', 'mod_scope']); expect(creditsOf(c)).toBe(10000 - fee('mod_scope'));
    // the slot is used now: refused in the perk's own words
    const again = give(a, 'mod_red_dot');
    expect(refused(a, { type: 'run/fit_mod', charId: 'c1', idx: again, extra: true })).toMatch(/already fitted|No extra slot/);
    // a character without the perk is not offered it, and is refused in words
    const plain = visit('forge', 'PHC-0001', (x) => { x.characters.c1.weaponState = { ...(x.characters.c1.weaponState || {}), mods: ['mod_red_dot'] }; }), pi = give(plain, 'mod_scope');
    expect(runOptions(plain, 'c1').some((x) => x.key === 'mod:extra:' + pi)).toBe(false);
    expect(refused(plain, { type: 'run/fit_mod', charId: 'c1', idx: pi, extra: true })).toMatch(/no extra mod slot/);
  });
});

describe('rules 1.56 L3: a mod can be a reward pick', () => {
  it('the data: rare, PROVISIONAL, never at the vault or a crate', () => {
    expect(MR.provisional).toBe(true); expect(MR.chance.vault).toBe(0); expect(MR.chance.crate).toBe(0);
    for (const p of Object.values(MR.chance) as number[]) expect(p).toBeLessThan(0.5);
  });
  it('a pick offers a mod only for a free slot of a gun carried, only inside the band, and taken (run/pick) it goes in the pack', () => {
    const g = visit('forge'), c = g.characters.c1, free = new Set(((WEAPON[c.weapon] as any).mod_slots as string[]));
    let mods = 0, picked: GameState | null = null;
    for (let s = 0; s < 300; s++) {
      const seed = 'MODREW-' + s, depth = 1 + (s % 14), node = { id: 'n' + s, depth }, k = (['boss', 'vault_guard', 'elite', 'fight'] as const)[s % 4];
      const o = weaponOffer(c, node, k, 1, seed), band = priceBand(k, depth, 1) * MR.band;
      for (const w of o.weapons) if (isMod(w.id)) {
        mods++; expect(free.has(slotOf(w.id))).toBe(true); expect(priceOf(w.id)!).toBeLessThanOrEqual(band); expect(UNBUILT).not.toContain(w.id);
        if (!picked) {
          const x = clone(g); x.run!.offers = { c1: o }; x.run!.state = 'reward';
          picked = apply(x, { type: 'run/pick', charId: 'c1', choice: o.weapons.indexOf(w) }, 'host');
          expect(packOf(picked.characters.c1).some((y) => (y.item || y.id) === w.id)).toBe(true);
        }
      }
      expect(weaponOffer(c, node, k, 1, seed, { where: 'crate' }).weapons.some((w) => isMod(w.id))).toBe(false);
    }
    expect(mods).toBeGreaterThan(5); expect(picked).not.toBeNull();
  });
  it('no free slot on any gun carried: never a mod; a pistol in the pack opens its slots again', () => {
    const g = visit('forge'), c = g.characters.c1, slots: string[] = (WEAPON[c.weapon] as any).mod_slots;
    const fill = slots.map((sl) => (Object.values(ITEM) as any[]).find((it) => it.category === 'mod' && it.mod_slot === sl && priceOf(it.id) != null)!.id);
    c.weaponState = { ...(c.weaponState || {}), mods: fill };
    for (let s = 0; s < 200; s++) expect(weaponOffer(c, { id: 'n' + s, depth: 15 }, 'boss', 1, 'FULL-' + s).weapons.some((w) => isMod(w.id))).toBe(false);
    gunLine(g, 'service_pistol'); let any = false;
    for (let s = 0; s < 200 && !any; s++) any = weaponOffer(c, { id: 'n' + s, depth: 15 }, 'boss', 1, 'FULL-' + s).weapons.some((w) => isMod(w.id));
    expect(any).toBe(true);
  });
});
