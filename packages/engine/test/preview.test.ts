// The engine's one dry run (engine review 4, finding 2): the copy, the bound game and the fog are the engine's. A
// preview never writes on the fight or the game it was given, never moves the real dice, and never tells of a unit the
// viewing side can't see.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { dryRun, preview, previewAction, withGame, fightSeenBy, previewSeenBy, fightWith as withMods, copyFight, boundGame, shove, hideAction, moveUnit, previewTechnique, steadyHeart, type Unit } from '../src';
import { fightWith } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };

describe('dryRun', () => {
  it('gives the engine\'s refusal, the unit afterwards and the AP paid; the live fight and game are deeply equal after', () => {
    const f = fightWith([{ traits: ['glass_runner'] }], [{ at: 'F6', classic: true }]); const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foe, '4,5');
    const before = JSON.stringify(f.g), cbBefore = JSON.stringify(f.cb);
    const ok = dryRun(f.g, f.cb, f.pc.id, (cb, x, rng) => shove(cb, rng, x, cb.units.find((v) => v.id === f.foe.id)!));
    expect(ok.err).toBeNull(); expect(ok.ap).toBe(2); expect(ok.u!.ap).toBe(f.pc.ap - 2); expect(ok.cb).not.toBe(f.cb); expect(ok.cb.log.length).toBeGreaterThan(0);
    const mv = dryRun(f.g, f.cb, f.pc.id, (cb, x, rng) => moveUnit(cb, x, '2,5', rng)); // Glass Runner's free first move is used on the copy only
    expect(mv.err).toBeNull(); expect(mv.u!.pos).toBe('2,5');
    const no = dryRun(f.g, f.cb, f.pc.id, (cb, x) => hideAction(cb, x));
    expect(no.err).toMatch(/An enemy can see you/); expect(no.ap).toBe(0);
    expect(dryRun(f.g, f.cb, 'nobody', () => null).err).toBe('No unit.');
    expect(dryRun(f.g, f.cb, f.pc.id, () => { throw new Error('Boom.'); }).err).toBe('Boom.');
    expect(JSON.stringify(f.g)).toBe(before); expect(JSON.stringify(f.cb)).toBe(cbBefore);
  });
  it('the game bound inside is a shadow: its characters, counters and dice are its own; the binding is put back', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); f.turn(f.pc);
    const rng0 = f.g.rng.state, c0 = Object.values(f.g.characters)[0];
    const was = boundGame();
    preview(f.g, f.cb, (cb, g, rng) => {
      expect(boundGame()).toBe(g); expect(g).not.toBe(f.g); expect(g.combat).toBe(cb);
      g.characters[c0.id].stims = 99; g.characters[c0.id].uses = { x: { s: 'c', n: 3 } }; rng.state = 12345; (g.story.ps ||= {}).x = 1; cb.units[0].hp = 1; cb.mods = ['x'];
    });
    expect(boundGame()).toBe(was);
    expect(c0.stims).not.toBe(99); expect(c0.uses?.x).toBeUndefined(); expect(f.g.rng.state).toBe(rng0); expect((f.g.story as any).ps?.x).toBeUndefined(); expect(f.cb.units[0].hp).not.toBe(1); expect('mods' in f.cb).toBe(false);
  });
  it('mods ride on the copy only', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); f.turn(f.pc);
    expect(preview(f.g, f.cb, (cb) => cb.mods, { mods: ['a#b'] })).toEqual(['a#b']);
    const w = withMods(f.cb, ['a#b']); expect(w.mods).toEqual(['a#b']); expect(w).not.toBe(f.cb); expect('mods' in f.cb).toBe(false); expect(withMods(f.cb, null)).toBe(f.cb);
    expect(copyFight(f.cb).log).toEqual([]);
  });
  it('a heart action tried on a copy leaves the held heart alone', () => {
    const f = fightWith([{ archetype: 'sharpshooter' }], [{ at: 'F6' }]); f.turn(f.pc);
    const before = JSON.stringify(f.cb);
    dryRun(f.g, f.cb, f.pc.id, (cb, x) => steadyHeart(cb, x));
    expect(JSON.stringify(f.cb)).toBe(before);
  });
});

describe('previewAction: the whole action through the reducer', () => {
  it('says what it would cost, or the reducer\'s refusal; nothing changes', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); f.turn(f.pc); const before = JSON.stringify(f.g);
    expect(previewAction(f.g, { type: 'combat/prone', unitId: f.pc.id }, 'host')).toMatchObject({ ok: true, why: null, ap: 1 });
    expect(previewAction(f.g, { type: 'combat/prone', unitId: f.foe.id }, 'host')).toMatchObject({ ok: false, ap: 0 });
    expect(previewAction(f.g, { type: 'combat/prone', unitId: f.pc.id }, 'someone-else').why).toMatch(/Not your unit/);
    expect(JSON.stringify(f.g)).toBe(before);
  });
});

describe('fog: a preview never tells of a unit the viewer can\'t see', () => {
  const setup = () => { const f = fightWith([{ weapon: 'service_pistol' }], [{ name: 'Seen', at: 'F6', classic: true }, { name: 'Lurker', at: 'G6', classic: true }]); const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foes[0], '6,5'); at(f, f.foes[1], '7,5'); f.foes[1].hidden = true; return f; };
  it('fightSeenBy: the unseen living unit is absent; the same fight when nothing is hidden', () => {
    const f = setup(), seen = fightSeenBy(f.cb, 'pc');
    expect(seen.units.map((u) => u.name)).not.toContain('Lurker'); expect(seen.units.map((u) => u.name)).toContain('Seen'); expect(f.cb.units.length).toBe(3);
    expect(fightSeenBy(f.cb, 'foe').units.length).toBe(3);
    f.foes[1].hidden = false; expect(fightSeenBy(f.cb, 'pc')).toBe(f.cb);
    f.foes[1].hidden = true; f.foes[1].dead = true; expect(fightSeenBy(f.cb, 'pc')).toBe(f.cb); // a body is no secret
  });
  it('preview with a viewer runs on the fight as that side sees it', () => {
    const f = setup();
    expect(preview(f.g, f.cb, (cb) => cb.units.map((u) => u.name), { viewer: 'pc' })).not.toContain('Lurker');
    expect(preview(f.g, f.cb, (cb) => cb.units.map((u) => u.name))).toContain('Lurker');
  });
  it('previewSeenBy: the verdict is the whole fight\'s; the fields that tell of units come from what the side sees', () => {
    const f = setup();
    const run = (cb: any) => ({ ok: true, ap: 2, why: null as string | null, hit: cb.units.filter((u: Unit) => u.side === 'foe').map((u: Unit) => u.id), notes: cb.units.filter((u: Unit) => u.side === 'foe').map((u: Unit) => u.name + ' is in the blast.'), total: cb.units.length });
    const pv = previewSeenBy(f.cb, 'pc', run, ['hit', 'notes']);
    expect(pv.hit).toEqual([f.foes[0].id]); expect(pv.notes.join(' ')).not.toMatch(/Lurker/); expect(pv.total).toBe(3); expect(pv.ok).toBe(true);
    // a real technique: the engine's own preview of a plain shot at the seen foe is the same either way
    const real = withGame(f.g, () => previewTechnique(f.cb, f.pc, 'shot', { hand: 'main', targetId: f.foes[0].id }));
    const shown = withGame(f.g, () => previewSeenBy(f.cb, 'pc', (cb) => previewTechnique(cb, f.pc, 'shot', { hand: 'main', targetId: f.foes[0].id }), ['attacks', 'pressure', 'saves', 'moves', 'notes']));
    expect(shown.ok).toBe(real.ok); expect(shown.ap).toBe(real.ap); expect(shown.attacks.map((a) => a.target)).toEqual([f.foes[0].id]);
  });
});
