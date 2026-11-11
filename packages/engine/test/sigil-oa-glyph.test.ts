// Leon's playtest of 0.22.0: "my character opportunity attack a sigil caster running away from me, the sigil next to me
// on the tile they got Op attack vanish". What the engine does there, pinned: a hostile caster's whole spell is one
// step (ai-sigil.ts castChoice: draw, walk, draw, Evoke), the opportunity attack lands inside the walk, and the glyphs
// go only because the Line is Evoked (the rule). A caster the blow drops leaves its glyph on the ground. The screen
// keeps the Line in view between the draw and the Evoke (apps/web/src/game/fx/shown-glyphs.test.ts).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, enemyTurn, type Sheet, type MapDef } from '../src';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const open = (): MapDef => ({ ...MAPS.yard16, w: 20, h: 20, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8'] });
/** A Sigil adept next to a player who holds an Evoker blade, on its turn. */
function turn(hp: number) {
  const cb = startCombat('t', open(), [{ c: newCharacter('c0', 'p1', sheet('Player 1')), pos: '5,5' }], [{ name: 'Foe', at: refOf('6,5'), caster: 'sigil_adept' } as any], 'easy', { state: 7 }, []);
  cb.objects = [];
  const p = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  p.hp = p.maxHp = 500; p.weapon = 'evoker_blade'; e.mg!.flux = 0; cb.mana = 15; e.hp = e.maxHp = hp;
  cb.turn = cb.order.indexOf(e.id); e.ap = 6; const l0 = cb.log.length, f0 = (cb.fx || []).length;
  enemyTurn(cb, { state: 2 });
  return { cb, e, log: cb.log.slice(l0), fx: (cb.fx || []).slice(f0) as any[] };
}

describe('a hostile caster struck by an opportunity attack while it walks its Line', () => {
  it('it lives: the walk goes on, the Line is finished and Evoked in the same step, and only the Evoke takes the glyphs', () => {
    const { cb, log, fx } = turn(500);
    expect(log.some((l) => /takes an opportunity attack/.test(l))).toBe(true);
    const ks = fx.map((f) => f.k), d1 = ks.indexOf('draw'), hit = ks.indexOf('melee'), d2 = ks.lastIndexOf('draw'), ev = ks.indexOf('evoke');
    expect(d1).toBeGreaterThanOrEqual(0); expect(hit).toBeGreaterThan(d1); expect(d2).toBeGreaterThan(hit); expect(ev).toBeGreaterThan(d2);
    expect(fx[d1].tile).toBe('6,5'); expect(fx[ev].tiles).toContain('6,5'); // the glyph next to the player is in the Line that fired
    expect(ks.filter((k) => k === 'glyph_fade' || k === 'scuff')).toEqual([]);
    expect(cb.glyphs || []).toEqual([]);
  });
  it('the blow drops it: its glyph stays on the ground (nothing takes a glyph when its drawer falls)', () => {
    const { cb, e, fx } = turn(10);
    expect(e.dead || e.downed).toBeTruthy();
    expect(fx.map((f) => f.k)).not.toContain('evoke');
    expect((cb.glyphs || []).map((g) => [g.pos, g.by])).toEqual([['6,5', e.id]]);
  });
});
