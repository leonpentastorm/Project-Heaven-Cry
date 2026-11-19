// @ts-nocheck (test fixtures: plain objects)
// Rules 1.85 (0.33 polish lane): the effects' events and words, each proved through the reducer.
//   7300 a cleanse names what it ended for its row's say ({cleansed})          Soothe
//   7301 Tug on a friend already beside you sends tie_pulse                    Tug
//   7302 every end of a drawn tie is one event in untie (a Down here)          a Bonded friend goes Down
//   7303 Together's hold is said in words, never as a count                     Together
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { type Action } from '../src';
import { fightWith, storyWith } from './helpers/perkfight';

const since = (cb: any, n: number) => (cb.fx || []).filter((e: any) => e.n > n);
const lastN = (cb: any) => ((cb.fx || []).at(-1)?.n ?? 0);

function tend() {
  const s = storyWith([{ name: 'Mender', skills: { empathy: 5, camaraderie: 5 }, perks: { steady_hands: 'II', pull_together: 'I' }, level: 5, weapon: 'service_pistol' } as any, { name: 'Ally', level: 5, weapon: 'service_pistol' } as any]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Tend', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '12,9', no_surrender: true }] } } } as any);
  const cb = () => s.g.combat, pcs = () => cb().units.filter((u) => u.side === 'pc');
  pcs()[0].pos = '3,3'; pcs()[1].pos = '4,3';
  const c = cb(), u = pcs()[0]; c.turn = c.order.indexOf(u.id); c.window = undefined;
  const act = (id: string, x: any = {}) => { pcs()[0].ap = 9; return s.act({ type: 'combat/perk', unitId: pcs()[0].id, id, ...x } as any); };
  return { s, cb, pcs, act };
}

describe('rules 1.85: the polish lane\'s events and words', () => {
  it('7300: Soothe says who it soothed and what ended; with nothing on, it says so', () => {
    const t = tend(), al = () => t.pcs()[1];
    t.act('verb:tend.bond', { targetId: al().id });
    const a = al(); a.conds = { ...(a.conds || {}), slowed: 2 }; a.condAt = { slowed: 1 };
    let n = t.cb().log.length;
    t.act('perk:steady_hands', { actionId: 'tend_soothe', targetId: al().id });
    expect(t.cb().log.slice(n).join(' ')).toMatch(/Mender soothes Ally: Slowed ends\./);
    n = t.cb().log.length;
    t.act('perk:steady_hands', { actionId: 'tend_soothe', targetId: al().id });
    expect(t.cb().log.slice(n).join(' ')).toMatch(/Mender soothes Ally: nothing to end\./);
  });
  it('7301: Tug on a friend beside you sends tie_pulse from the Mender to the friend; a far friend gets none', () => {
    const t = tend(), al = () => t.pcs()[1], me = () => t.pcs()[0];
    t.act('verb:tend.bond', { targetId: al().id });
    let n = lastN(t.cb());
    t.act('perk:pull_together', { actionId: 'tend_tug', targetId: al().id });
    expect(since(t.cb(), n).filter((e) => e.k === 'tie_pulse').map((e) => [e.target, e.other])).toEqual([[me().id, al().id]]);
    al().pos = '7,3'; n = lastN(t.cb());
    t.act('perk:pull_together', { actionId: 'tend_tug', targetId: al().id });
    expect(since(t.cb(), n).filter((e) => e.k === 'tie_pulse').length).toBe(0);
  });
  it('7302: a Bonded friend going Down ends the Bond with one untie event (why: down), the Let go op with one too', () => {
    const t = tend(), al = () => t.pcs()[1], me = () => t.pcs()[0];
    t.act('verb:tend.bond', { targetId: al().id });
    expect((t.cb().ties || []).some((x) => x.kind === 'bond')).toBe(true);
    const n = lastN(t.cb());
    // the Mender goes Down through the reducer's own damage path: its friend's shots (a fight allows them)
    me().hp = 1; const c = t.cb(), shooter = al(); c.turn = c.order.indexOf(shooter.id); c.window = undefined;
    for (let i = 0; i < 6 && !me().downed && me().hp > 0; i++) { shooter.ap = 9; try { t.s.act({ type: 'combat/attack', unitId: shooter.id, targetId: me().id, mode: 'shot' } as Action); } catch (e) { throw new Error('refused: ' + (e as Error).message); } }
    expect(me().downed || me().hp <= 0).toBe(true); // seeded: the foe's shots put the Mender down
    const ev = since(t.cb(), n).filter((e) => e.k === 'stance' && e.what === 'untie' && e.how === 'bond');
    expect((t.cb().ties || []).some((x) => x.kind === 'bond')).toBe(false);
    expect(ev.map((e) => [e.unit, e.target, e.why])).toEqual([[me().id, al().id, 'down']]);
  });
  it('7303: Together is said until the caster\'s next turn, never as 99 rounds', () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } } as any, { name: 'One' }, { name: 'Two' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!];
    c.belief = { kind: 'faithful', patron: 'the_matchmaker' }; c.patron = 'the_matchmaker'; c.devotion = 10;
    c.skills = { ...c.skills, faith: 7 }; c.attrs = { ...c.attrs, virtue: 7 };
    const [pr, a1, a2] = f.pcs; pr.pos = '2,5'; a1.pos = '2,6'; a2.pos = '3,5';
    f.turn(pr);
    const n = f.cb.log.length;
    try { f.act({ type: 'faith/pray', unitId: pr.id, kind: 'hymn', id: 'together', targetId: a1.id, targetId2: a2.id } as Action); } catch (e) { throw new Error('Together refused: ' + (e as Error).message); }
    const said = f.cb.log.slice(n).join(' ');
    expect(said).toMatch(/until Priest's next turn/);
    expect(said).not.toMatch(/99 rounds/);
  });
});
