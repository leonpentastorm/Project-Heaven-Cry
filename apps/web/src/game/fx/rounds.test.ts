// @vitest-environment jsdom
// Shots on screen match rounds spent (Leon, 12 Nov 2026: "Burst eats 3 ammo but shoots only 2 bullet VFX on many
// weapons"), and since 13 Nov 2026 (no tracers: "change the effect for shots to a bullet hole"): bullet holes drawn =
// rounds that hit; casings = rounds spent. For every gun in the data and every shooting technique it can use (and the
// plain Burst and full auto, for a character and for an enemy), the engine really fires it (the test fight of the
// engine's own suite), and the client plays the effects it sent: the rounds fired (each `round` the effects trace: its
// muzzle flash, an arrow, a gout) must be the rounds the magazine lost; the casings thrown out the same number for a gun
// that throws one per shot (none for a revolver, a break-action or a bow, which empty theirs at the reload); and the
// marks put down (each `hole` traced: a bullet hole, a shotgun's pellet cluster, an arrow's shaft) the rounds that hit:
// one for each roll that hit (a unit, an object, or the cover in the way), and one for each round it carried beyond
// itself (a Burst's third, a double barrel's second shell); the rounds of a spray (full auto, a Mag Dump's stream,
// Suppress's two before its rolled one) are fired at nobody and mark nothing. Past STREAM_CAP a Mag Dump's stream draws
// that many. The engine's side: combat.ts noteLoose (the rounds a volley spent with no roll of their own).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, WEAPONS, TECHNIQUES, fireBurst, fireAuto } from '@engine';
import { fightWith, withGame } from '../../../../../packages/engine/test/helpers/perkfight';
import { setLayer } from './dom';
import { queueFx, setContext, clearFx } from './play';
import { resetRanged, STREAM_CAP } from './ranged';
import { techPrepass, shotMarkOf, TECH_FX, rowKey } from './techniqueFx';
import { brassOf } from './brass';
import { setInBattle } from '../combatSpeed';

function grid(w = 16, h = 11) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    (img as any).getBoundingClientRect = () => ({ left: x * 40 + 1, top: y * 40 + 1, width: 38, height: 38, right: x * 40 + 39, bottom: y * 40 + 39 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
const GUN_CATS = ['pistol', 'revolver', 'smg', 'rifle', 'shotgun', 'heavy', 'bow'];
const guns = (WEAPONS as any[]).filter((w) => w.magazine != null && (GUN_CATS.includes(w.category) || (w.category === 'mana' && (w.phys?.system === 'ranged'))));
/** The shooting techniques: ranged, firing rounds now (a Watch fires later, a Set fires none, a Lob is a grenade's). */
const SHOOTING = (TECHNIQUES as any[]).filter((t) => t.system === 'ranged' && ['fire', 'press', 'take'].includes(t.group) && t.rounds !== 0 && t.id !== 'lob').map((t) => t.id);

interface Run { label: string; spent: number; rounds: number; shells: number; perShot: boolean; holes: number; hits: number; flights: Record<string, number>; gone: string[] }
/** The pieces Leon had removed on 13 Nov 2026 (the yellow tracer lines, the melee half circle, the miss marks): none may
 *  be drawn. The round in flight (a bullet's streak, a shell's pellets, an arrow) is drawn: Leon, 14 Nov 2026. */
const REMOVED = ['tracer', 'slash', 'whiff', 'deflect', 'wide'];
/** Fire `what` with this gun (a character's technique, or a plain attack mode by a character or an enemy) and play it. */
function fire(gun: any, what: { tech?: string; mode?: string; enemy?: boolean }): Run | null {
  const f = fightWith([{ weapon: gun.id, level: 6, skills: { dexterity: 5, raw_power: 5, athletics: 3 }, attrs: { agility: 5, strength: 5 } }], [{ weapon: what.enemy ? gun.id : 'service_pistol' }, {}, {}]);
  const pc = f.unit(f.pc.id), [t, t2, t3] = f.foes;
  pc.pos = '2,5'; f.unit(t.id).pos = '6,5'; f.unit(t2.id).pos = '6,6'; f.unit(t3.id).pos = '7,4';
  for (const u of f.cb.units) { u.hp = 9999; u.maxHp = 9999; u.heat = 0; u.jammed = false; }
  if (gun.category === 'heavy') pc.braced = true; // a heavy weapon fires braced (or prone)
  const shooter = what.enemy ? f.turn(t) : f.turn(pc), target = what.enemy ? pc : f.unit(t.id);
  const u0 = f.unit(shooter.id), ammo0 = (u0.ammo || 0) + (u0.loose || 0), n0 = f.cb.fxSeq || 0;
  try {
    if (what.tech) f.act({ unitId: u0.id, type: 'combat/technique', id: what.tech, targetId: target.id, tile: '2,6' } as any);
    else if (what.enemy) withGame(f.g, () => (what.mode === 'auto' ? fireAuto : fireBurst)(f.cb, f.g.rng as any, u0, target, null)); // an enemy's own (the AI's path)
    else f.act({ unitId: u0.id, type: 'combat/attack', targetId: target.id, mode: what.mode } as any);
  } catch { return null; } // refused (the gun can't, the moment isn't right): nothing was fired
  const u1 = f.unit(shooter.id), spent = ammo0 - ((u1.ammo || 0) + (u1.loose || 0));
  const evs = (f.cb.fx || []).filter((e: any) => e.n > n0);
  if (!evs.some((e: any) => e.k === 'shot' || e.k === 'volley')) return null;
  const layer = grid(); setContext(f.g, 'combat'); setInBattle(true);
  (window as any).__phcFxTrace = [];
  const seen = new MutationObserver(() => undefined); seen.observe(layer, { childList: true });
  queueFx(evs as any, 'test:' + gun.id + ':' + (what.tech || what.mode));
  vi.advanceTimersByTime(30000);
  const added = seen.takeRecords().flatMap((m) => [...m.addedNodes]) as HTMLElement[]; seen.disconnect();
  const flights: Record<string, number> = {};
  for (const b of added) { const k = b.getAttribute?.('data-fx-flight'); if (k) flights[k] = (flights[k] || 0) + 1; }
  const gone = added.map((b) => b.getAttribute?.('data-tech-fx') || '').filter((k) => REMOVED.includes(k));
  const T: any[] = (window as any).__phcFxTrace;
  clearFx();
  // the rounds that hit, from the events: each roll that hit (or struck the cover in the way), and the rounds it carries
  // beyond itself (the pre-pass hands a volley's loose rounds to its last roll, as the queue does; a bullet Mag Dump's
  // stream keeps them: a spray), for a weapon whose rounds leave a mark and a roll that is not a miss on purpose
  const pre = techPrepass(evs as any[], (v: any) => v.mode === 'dump' && v.cat !== 'shotgun' && shotMarkOf(v.weapon, v.cat) === 'hole');
  let hits = 0;
  for (const e of pre as any[]) {
    if (e.k === 'shot' && !e.thrown && shotMarkOf(e.weapon, e.cat) && !TECH_FX[rowKey(e) || '']?.noRoll) {
      if (e.hit) hits += 1 + (e.tech === 'suppress' ? 0 : Number(e._loose) || 0); else if (e.cover && !e.object) hits += 1;
    }
  }
  return { label: gun.id + ' · ' + (what.tech || what.mode) + (what.enemy ? ' (enemy)' : ''), spent, rounds: T.filter((x) => x.w === 'round' && x.unit === u1.id).length, shells: T.filter((x) => x.w === 'shell').length, perShot: brassOf(gun.id, gun.category).when === 'shot', holes: T.filter((x) => x.w === 'hole').length, hits, flights, gone };
}

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); });
afterEach(() => { vi.useRealTimers(); setInBattle(false); });

describe('shots on screen match rounds spent (every gun × every shooting technique)', () => {
  it('the guns and the techniques walked are the data\'s', () => {
    expect(guns.length).toBeGreaterThan(25);
    expect(SHOOTING).toEqual(expect.arrayContaining(['shot', 'burst', 'suppress', 'rake', 'mag_dump', 'aimed_shot', 'dead_centre']));
  });
  for (const gun of guns) {
    it(gun.id, () => {
      const runs: Run[] = [];
      for (const tech of SHOOTING) { const r = fire(gun, { tech }); if (r) runs.push(r); }
      if ((gun.modes || []).includes('burst')) for (const enemy of [false, true]) { const r = fire(gun, { mode: 'burst', enemy }); if (r) runs.push(r); }
      if ((gun.modes || []).includes('auto')) { const r = fire(gun, { mode: 'auto' }); if (r) runs.push(r); }
      expect(runs.length, gun.id + ': nothing fired').toBeGreaterThan(0);
      for (const r of runs) {
        if (r.spent <= 0) continue; // a gun that loads its next round as it fires (the crossbow's autoload) shows no loss to count
        if (r.spent > STREAM_CAP) { expect(r.rounds, r.label).toBeGreaterThanOrEqual(STREAM_CAP); expect(r.rounds, r.label).toBeLessThanOrEqual(r.spent); }
        else expect(r.rounds, r.label + ': rounds drawn vs spent').toBe(r.spent);
        expect(r.shells, r.label + ': casings').toBe(r.perShot ? r.rounds : 0);
        expect(r.holes, r.label + ': marks drawn vs rounds that hit').toBe(r.hits);
        expect(r.gone, r.label + ': a removed piece was drawn (tracer, arc, miss mark)').toEqual([]);
        // every round fired is drawn in flight (hit or miss): a bullet's streak, a shell's five pellets, an arrow
        const mark = shotMarkOf(gun.id, gun.category);
        if (mark === 'hole') expect((r.flights.bullet || 0) + (r.flights.bolt || 0) + (r.flights.beam || 0), r.label + ': bullets in flight vs rounds fired').toBe(r.rounds);
        if (mark === 'pellets') expect(r.flights.bullet || 0, r.label + ': pellets in flight vs shells fired × 5').toBe(r.rounds * 5);
        if (mark === 'shaft') expect(r.flights.arrow || 0, r.label + ': shafts in flight vs arrows loosed').toBe(r.rounds);
      }
      if (shotMarkOf(gun.id, gun.category)) expect(runs.some((r) => r.holes > 0), gun.id + ': no round of any run hit (the walk would prove nothing)').toBe(true);
    }, 120000);
  }
  it('a character\'s Burst: three rounds drawn for its two rolls, the third on the second roll', () => {
    const r = fire(guns.find((g) => g.id === 'hellraiser_service_rifle'), { tech: 'burst' })!;
    expect(r.spent).toBe(3); expect(r.rounds).toBe(3); expect(r.shells).toBe(3);
    const p = fire(guns.find((g) => g.id === 'hellraiser_service_rifle'), { mode: 'burst' })!;
    expect(p.spent).toBe(3); expect(p.rounds).toBe(3);
    const e = fire(guns.find((g) => g.id === 'hellraiser_service_rifle'), { mode: 'burst', enemy: true })!;
    expect(e.spent).toBe(3); expect(e.rounds).toBe(3);
  });
});
