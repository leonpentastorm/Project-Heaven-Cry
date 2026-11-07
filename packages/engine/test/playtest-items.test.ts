// Playtest fixes (7 Nov 2026): one music trait per character; plot items from the Narrator's loot.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, TRAITS, apply, newGame, packOf, validateSheet, traitGainError, isMusicTrait, equip, itemKg, carriedKg, type GameState, type Sheet } from '../src';

const sheetFrom = (archId: string, name = 'Test', traits: string[] = []): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits, skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const MUSIC = TRAITS.filter((t) => t.effects.some((e: any) => e.op === 'song_state')).map((t) => t.id);

describe('music traits: only one per character', () => {
  it('the data marks every music trait as excluding the others', () => {
    expect(MUSIC.length).toBeGreaterThanOrEqual(2);
    for (const id of MUSIC) {
      expect(isMusicTrait(id)).toBe(true);
      const t = TRAITS.find((x) => x.id === id)!;
      for (const other of MUSIC) if (other !== id) expect(t.excludes, id + ' excludes ' + other).toContain(other);
    }
  });
  it('validateSheet refuses two music traits; one is fine', () => {
    const arch = ARCHETYPES[0].id;
    expect(validateSheet(sheetFrom(arch, 'A', [MUSIC[0], MUSIC[1]]))).toBe('Only one music trait.');
    expect(validateSheet(sheetFrom(arch, 'A', [MUSIC[0]]))).toBeNull();
  });
  it('a later trait gain asks the same rule', () => {
    expect(traitGainError([MUSIC[0]], MUSIC[1])).toBe('Only one music trait.');
    expect(traitGainError([], MUSIC[1])).toBeNull();
    expect(traitGainError([MUSIC[0]], MUSIC[0])).toBe('Already held.');
  });
});

describe('plot items (the Narrator\'s loot)', () => {
  const room = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'plot');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'Hal') }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'Izacarl') }, 'p2');
    g = apply(g, { type: 'session/start' }, 'host');
    const [hal, iza] = Object.values(g.characters).map((c) => c.id);
    return { g, hal, iza };
  };
  const turn = (g: GameState, loot: any[]) => apply(g, { type: 'narrator/turn', turn: { narration: 'x', loot } as any }, 'host');
  const lastSystem = (g: GameState) => g.story.entries.filter((e) => e.kind === 'system').at(-1)!.text;

  it('an unknown or empty item id becomes a plot item in the pack, and the log says so', () => {
    let { g, hal, iza } = room();
    g = turn(g, [{ charId: hal, item: 'nine_nines_spare_seals', qty: 2, rarity: 'standard', name: 'Nine-Nine\'s spare seals', text: 'Rubber seals for a pressure hatch.' }]);
    const seals = packOf(g.characters[hal]).find((x) => x.kind === 'plot')!;
    expect(seals).toMatchObject({ name: 'Nine-Nine\'s spare seals', qty: 2, text: 'Rubber seals for a pressure hatch.' });
    expect(lastSystem(g)).toBe('Hal gets 2 × Nine-Nine\'s spare seals.');
    g = turn(g, [{ charId: iza, item: '', qty: 1, rarity: 'standard', name: 'Nine-Nine\'s toolroll', text: '' }]);
    expect(packOf(g.characters[iza]).some((x) => x.kind === 'plot' && x.name === 'Nine-Nine\'s toolroll')).toBe(true);
    expect(lastSystem(g)).toBe('Izacarl gets Nine-Nine\'s toolroll.');
    // No weight, no equipping.
    const i = packOf(g.characters[iza]).findIndex((x) => x.kind === 'plot');
    expect(itemKg(packOf(g.characters[iza])[i])).toBe(0);
    const before = carriedKg(g.characters[iza]).total; expect(before).toBeGreaterThanOrEqual(0);
    expect(equip(g.characters[iza], i, 'main')).toMatch(/plot item/);
  });
  it('a known id still gives the real item, and keeps its in-world name', () => {
    let { g, hal } = room();
    g = turn(g, [{ charId: hal, item: 'legion_bullpup', qty: 1, rarity: 'fine', name: 'Keel\'s bullpup', text: '' }, { charId: hal, item: 'spare_parts', qty: 2, rarity: 'standard', name: 'Nine-Nine\'s spare seals', text: '' }]);
    const pack = packOf(g.characters[hal]);
    expect(pack.find((x) => x.weapon === 'legion_bullpup')!.rarity).toBe('fine');
    expect(pack.find((x) => x.item === 'spare_parts' && x.name === 'Nine-Nine\'s spare seals')!.qty).toBe(2);
    expect(pack.some((x) => x.kind === 'plot')).toBe(false);
  });
  it('the Narrator takes a plot item back with a negative qty; players give and drop them', () => {
    let { g, hal, iza } = room();
    g = turn(g, [{ charId: hal, item: '', qty: 3, rarity: 'standard', name: 'Brass key', text: 'Opens the pump room.' }]);
    const id = packOf(g.characters[hal]).find((x) => x.kind === 'plot')!.id;
    g = turn(g, [{ charId: hal, item: id, qty: -1, rarity: 'standard', name: '', text: '' }]);
    expect(packOf(g.characters[hal]).find((x) => x.id === id)!.qty).toBe(2);
    expect(lastSystem(g)).toBe('Hal no longer has Brass key.');
    const idx = packOf(g.characters[hal]).findIndex((x) => x.id === id);
    g = apply(g, { type: 'gear/give', charId: hal, idx, to: iza, qty: 1 }, 'host');
    expect(packOf(g.characters[iza]).find((x) => x.id === id)!.qty).toBe(1);
    expect(() => apply(g, { type: 'gear/drop', charId: iza, idx: 0 }, 'host')).toThrow(); // not Leon's character
    const j = packOf(g.characters[hal]).findIndex((x) => x.id === id);
    g = apply(g, { type: 'gear/drop', charId: hal, idx: j }, 'host');
    expect(packOf(g.characters[hal]).some((x) => x.id === id)).toBe(false);
    g = turn(g, [{ charId: iza, item: '', qty: -5, rarity: 'standard', name: 'Brass key', text: '' }]);
    expect(packOf(g.characters[iza]).some((x) => x.id === id)).toBe(false);
  });
  it('old saves (no plot items, loot without text) still load and play', () => {
    let { g, hal } = room();
    const old = JSON.parse(JSON.stringify(g)); for (const c of Object.values(old.characters) as any[]) c.pack = (c.pack || []).filter((x: any) => x.kind !== 'plot');
    const g2 = turn(old, [{ charId: hal, item: 'riot_shield', qty: 1 }]);
    expect(packOf(g2.characters[hal]).some((x) => x.id === 'riot_shield')).toBe(true);
    expect(validateSheet(sheetFrom(ARCHETYPES[0].id))).toBeNull();
  });
});
