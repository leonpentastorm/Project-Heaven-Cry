// @ts-nocheck (builds odd fights by hand)
// WHO IS SIGHTED IS PART OF THE STATE. apply() ends every fight action with noteSighted, which fills cb.sighted (the
// "unseen hostile" naming, the fight music). It used to ask visibility(), which walks every tile of the map; it now
// asks about each hostile alone. visibility() is kept here as the ORACLE: on any ground noteSighted must note the
// hostiles visibility(cb, 'pc').seen holds, in the order of cb.units. That includes a unit standing OFF the map (a
// bug or an old save could leave one there): visibility() never sees it, because it only looks at the map's tiles.
import { describe, expect, it } from 'vitest';
import { apply, bindGame, noteSighted, visibility, sideSeesUnit, unitSees, type Combat } from '../src';
import { makeObject } from '../src/objects';
import { lobby, fightTurn, type Pc } from './helpers/replay';

const SQUAD: Pc[] = [{ build: 'opt_gun', level: 9 }, { build: 'opt_blade', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'plain_blade', level: 9 }];
function fight() {
  let g = lobby('SIGHT-ORDER', SQUAD);
  g = apply(g, { type: 'session/start' }, 'host'); g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', sceneTitle: 'Sight' } }, 'host');
  return apply(g, fightTurn(SQUAD, ['minion', 'soldier', 'soldier', 'elite', 'minion', 'soldier', 'boss'], 'cover', 'Sight'), 'host');
}
const rnd = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

describe('noteSighted notes the hostiles visibility() sees, in the same order', () => {
  it('on 400 random grounds: walls, doors, the dark, hidden units, the dead and the downed, and units standing off the map', () => {
    const base = fight(), r = rnd(20261113);
    const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    let offMap = 0, offSeenByEyes = 0, noted = 0, hiddenUnits = 0, unseen = 0;
    for (let t = 0; t < 400; t++) {
      const g = JSON.parse(JSON.stringify(base)), cb: Combat = g.combat, w = 6 + Math.floor(r() * 21), h = 6 + Math.floor(r() * 21);
      const tiles: string[] = []; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) tiles.push(x + ',' + y);
      const some = (share: number) => tiles.filter(() => r() < share);
      cb.map = { ...cb.map, w, h, solid: some(pick([0, 0.05, 0.15, 0.3])), difficult: [], ...(r() < 0.25 ? { dark: true } : {}) };
      cb.objects = [...some(0.03).map((k, i) => makeObject('d' + i, 'door', k, r() < 0.5 ? { open: true } : {})), ...some(0.05).map((k, i) => makeObject('w' + i, pick(['low_wall', 'pillar', 'crate']), k))];
      const free = tiles.filter((k) => !cb.map.solid.includes(k));
      for (const u of cb.units) { u.pos = pick(free.length ? free : tiles); if (r() < 0.1) u.dead = true; else if (r() < 0.1) u.downed = true; if (u.side === 'foe' && r() < 0.2) { u.hidden = true; hiddenUnits++; } }
      // one trial in three: a unit (a foe two times in three) stands one tile off an edge, or far outside
      if (r() < 0.34) {
        const foes = cb.units.filter((u) => u.side === 'foe'), u = r() < 0.67 ? pick(foes) : pick(cb.units);
        u.pos = r() < 0.8 ? pick([[-1, Math.floor(r() * h)], [w, Math.floor(r() * h)], [Math.floor(r() * w), -1], [Math.floor(r() * w), h]]).join(',') : '-5,40';
        u.dead = false; u.hidden = false;
        if (u.side === 'foe') { offMap++; if (cb.units.some((e) => e.side === 'pc' && unitSees(cb, e, u.pos))) offSeenByEyes++; }
      }
      delete cb.sighted; cb.over = null;
      const was = bindGame(g);
      try {
        const oracle = visibility(cb, 'pc').seen, want = cb.units.filter((u) => oracle.has(u.id)).map((u) => u.id);
        noteSighted(cb);
        expect(cb.sighted, 'trial ' + t + ' (' + w + ' × ' + h + ')').toEqual(want);
        noted += want.length; unseen += cb.units.filter((u) => u.side === 'foe' && !u.dead && !oracle.has(u.id)).length;
        // it only grows: a second call adds nothing, and what was there before stays in front
        cb.sighted = ['someone-else']; noteSighted(cb); expect(cb.sighted).toEqual(['someone-else', ...want]);
        // for a unit ON the map, sideSeesUnit is visibility().seen (the fight's sight events and walks use it)
        for (const u of cb.units) if (u.side === 'foe' && !u.dead) {
          const [x, y] = u.pos.split(',').map(Number); if (x < 0 || y < 0 || x >= w || y >= h) continue;
          expect(sideSeesUnit(cb, 'pc', u), 'trial ' + t + ': sideSeesUnit ' + u.id).toBe(oracle.has(u.id));
        }
      } finally { bindGame(was); }
    }
    // the trials really had hostiles off the map that a pair of eyes could draw a line to, hidden ones, seen and unseen ones
    expect(offMap).toBeGreaterThan(60); expect(offSeenByEyes).toBeGreaterThan(15); expect(hiddenUnits).toBeGreaterThan(200); expect(noted).toBeGreaterThan(500); expect(unseen).toBeGreaterThan(300);
  }, 60_000);
});
