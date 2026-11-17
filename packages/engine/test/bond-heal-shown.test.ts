// @ts-nocheck (test fixtures: plain objects)
// 0.28.2, Leon's playtest on 0.28.1 ("bonding right now give no healing effect"): rules 1.33 heals by Tending (Mend,
// Touch, Mend Yourself; ×through a Bond), not by the Bond itself. The engine healed, but the screen was told nothing:
// no heal effect over the token and no number in the log. Through the reducer, in a Survival fight at level 1 with the
// Empath archetype on the camp's Recommended loadout (the Attuner in the off hand): Bond, then Tend; and solo: Bond an
// enemy, Mend yourself, and the echo lands on the Bonded enemy.
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, beginTurn, withGame, reachable, actionsFor } from '../src';
import tendingJ from '../../../data/tending.json';

const BOND: any = (tendingJ as any).bond;
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
/** A Survival room through the camp (Recommended) into its first fight; the Empath's turn, its foe and (duo) its ally beside it. */
function survivalFight(duo: boolean) {
  let g: any = newGame('BOND01', { id: 'host', name: 'L' }, 'seed-b'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  if (duo) { g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2'); }
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  const med: any = Object.values(g.characters).find((c: any) => c.name === 'Medic');
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  for (const by of duo ? ['host', 'p2'] : ['host']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  const cb = g.combat, mu = cb.units.find((u: any) => u.charId === med.id), foe = cb.units.find((u: any) => u.side === 'foe');
  const al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id) || null;
  const [x, y] = mu.pos.split(',').map(Number);
  if (al) { al.pos = x + ',' + (y + 1); al.hp = 40; }
  foe.pos = (x + 2) + ',' + y; foe.sv = { heart: -99 }; mu.hp = 40; // the foe fails its Heart save
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; delete cb.approach; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9; // rules 1.64 item 5008: the fight is set up by hand as joined
  const box = { g };
  const U = (id: string) => box.g.combat.units.find((u: any) => u.id === id);
  const act = (id: string, t: any = null) => { U(mu.id).ap = 9; const n = box.g.combat.log.length, f = (box.g.combat.fx || []).length; box.g = apply(box.g, { type: 'combat/perk', unitId: mu.id, id, ...(t ? { targetId: t.id } : {}) }, 'host'); return { log: box.g.combat.log.slice(n), fx: (box.g.combat.fx || []).slice(f) }; };
  return { box, med, mu, al, foe, U, act };
}

describe('0.28.2: the Bond and Tending show their healing', () => {
  it('level 1, a duo: the Empath holds the Attuner; Bond the ally, Mend it: HP up, a heal effect over it, the number in the log', () => {
    const s = survivalFight(true);
    expect(s.med.offHand?.id).toBe('attuner');
    expect(s.act('verb:tend.bond', s.al).log.join(' ')).toMatch(/Bonded to Gun/);
    expect(s.U(s.al.id).hp).toBe(40); // a Bond does not heal by itself
    const r = s.act('verb:tend.mend', s.al), healed = s.U(s.al.id).hp - 40;
    expect(healed).toBeGreaterThan(0);
    expect(r.fx.find((e: any) => e.k === 'heal' && e.target === s.al.id)?.amount).toBe(healed);
    expect(r.log.join(' ')).toContain('heals ' + healed);
  });
  it('solo: Bond an enemy, Mend yourself: you heal (shown), and the echo is queued on the Bonded enemy, named, and lands at its turn', () => {
    const s = survivalFight(false);
    s.act('verb:tend.bond', s.foe);
    const before = s.U(s.foe.id).hp, r = s.act('verb:tend.mend_self'), healed = s.U(s.mu.id).hp - 40;
    expect(healed).toBeGreaterThan(0);
    expect(r.fx.find((e: any) => e.k === 'heal' && e.target === s.mu.id)?.amount).toBe(healed);
    expect(r.log.join(' ')).toContain('heals ' + healed);
    expect(r.log.join(' ')).toMatch(/Each enemy Bonded to Medic will feel/); // not 'Medic will feel Medic's care': the echo is the Bonded enemy's
    const cb = s.box.g.combat; cb.turn = cb.order.indexOf(s.foe.id); delete cb.window; withGame(s.box.g, () => beginTurn(cb, s.box.g.rng));
    expect(before - s.U(s.foe.id).hp).toBe(Math.floor(healed * BOND.echo));
  });
  it('the Bond card says plainly that a Bond does not heal by itself and what heals, and it is the engine\'s (no Narrator)', () => {
    const s = survivalFight(true);
    const d: any = actionsFor(s.box.g, s.mu.id, null).find((x: any) => x.group === 'tend' && x.name === 'Bond');
    expect(d.text).toMatch(/does not heal by itself/);
    expect(d.text).not.toMatch(/Narrator decides/);
  });
});
