// Casting NPC faces from the shared card pool (spec: Character portraits are cards).
import { describe, expect, it } from 'vitest';
import PD from './protodata.json';
import { castMany, npcFace, npcTags, takenCards } from './cast';

const cards = (PD as any).portraits as { img: string; skill?: string }[];
const game = (portraits: string[]) => ({ characters: Object.fromEntries(portraits.map((p, i) => ['c' + i, { portrait: p }])) }) as any;

describe('NPC faces are cards from the players\' pool', () => {
  const guardCard = cards.find((c) => c.skill === 'durability')!.img;
  it('an NPC keeps its own card while no player holds it', () => {
    expect(npcFace(game([]), 'n1', guardCard, ['guard'])).toBe(guardCard);
  });
  it('a card a player takes is theirs: the NPC gets another that fits the same role, on every screen', () => {
    const g = game([guardCard]), a = npcFace(g, 'n1', guardCard, ['guard']);
    expect(a).not.toBe(guardCard); expect(takenCards(g).has(a)).toBe(false);
    expect(npcFace(g, 'n1', guardCard, ['guard'])).toBe(a); // deterministic
    const fit = cards.find((c) => c.img === a)!;
    expect(['durability', 'pain-threshold', 'intimidation', 'vigilant', 'composure']).toContain(fit.skill);
  });
  it('a person with no portrait is cast by role; things are not', () => {
    expect(npcFace(game([]), 'n2', null, npcTags('Dock guard', 'minion', 'service_pistol'))).toMatch(/^\/assets\/char-/);
    expect(npcFace(game([]), 'n3', null, npcTags('Scavenger drone'))).toBe('');
  });
  it('two guards on one screen get different faces, and taking an unrelated card changes neither', () => {
    const list = ['n1', 'n2', 'n3'].map((key) => ({ key, current: null, tags: npcTags('Guard') }));
    const a = castMany(game([]), list), faces = [...a.values()];
    expect(new Set(faces).size).toBe(3);
    const other = cards.find((c) => !faces.includes(c.img))!.img;
    const b = castMany(game([other]), list);
    expect([...b.values()]).toEqual(faces);
  });
});
