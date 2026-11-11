// Physical 2.0 (rules 1.12), the ranged lane's enemy AI: enemies that hold every ranged technique play whole turns
// through the engine's own enemyTurn (the technique step in physical/ai.ts asks each handler's ai() and previews the
// best), with every ranged weapon family, without crashing, without planning changing the fight, and they do pick
// techniques. The per-technique scores are tested in each kind's own file; this is the soak across all of them.
import { describe, it, expect } from 'vitest';
import { phys, enemyTurn, WEAPON } from '../src';
import { physFight, rig } from './helpers/physfight';
import { calm, unchanged } from './helpers/physfight-ranged';

const RANGED = phys.TECHNIQUES.filter((d) => d.system === 'ranged').map((d) => d.id);
const WEAPONS = ['service_pistol', 'parlour_pistol', 'magistrate_pistol', 'drifter_revolver', 'decrkm_smg', 'whisper_smg', 'mandestra_drum_gun',
  'hellraiser_service_rifle', 'long_rifle', 'lumeri_scattergun', 'coach_gun', 'brigade_auto_shotgun', 'blackpoint_700', 'hellraiser_lmg',
  'smetanita_thumper', 'breacher_tube', 'purifier_flamer', 'recurve_bow', 'longbow', 'repeating_crossbow', 'crossbow'];

/** Two PCs against three enemies holding every ranged technique, with this weapon; each meter set to give the
 * techniques something to read (Pressed and Suppressed targets, a Pressed enemy, a hot barrel). */
function fight(weapon: string, seed: string) {
  const f = physFight([{ weapon: 'service_pistol' }, { weapon: 'service_pistol' }],
    [{ at: 'J3', weapon, tier: 'elite' }, { at: 'K5', weapon, tier: 'soldier' }, { at: 'J7', weapon, tier: 'boss' }], { seed });
  f.put(f.pcs[0], 'C3'); f.put(f.pcs[1], 'D6'); calm(f);
  for (const e of f.foes) f.unit(e.id).techs = [...RANGED];
  f.press(f.pcs[0], 2, f.foes[0]); f.press(f.pcs[1], 3, f.foes[0]); f.press(f.foes[1], 1, f.pcs[0]);
  const w = WEAPON[weapon]; if (w.heat_limit) f.unit(f.foes[2].id).heat = w.heat_limit - 1;
  return f;
}

describe('enemies holding every ranged technique', () => {
  for (const weapon of WEAPONS) {
    it(weapon + ': planning changes nothing, and whole enemy turns run without crashing', () => {
      for (const seed of ['ai-1', 'ai-2']) {
        const f = fight(weapon, seed);
        for (let round = 0; round < 3 && !f.cb.over; round++) {
          for (const e of f.foes) {
            const u = f.unit(e.id); if (!u || u.dead || u.downed || f.cb.over) continue;
            f.turn(u); rig(null);
            unchanged(f, () => f.bound(() => phys.aiTechnique(f.cb, f.unit(e.id))));
            unchanged(f, () => f.bound(() => { for (const id of RANGED) for (const v of f.cb.units) phys.aiScore(f.cb, f.unit(e.id), id, { targetId: v.id }); }));
            expect(() => f.bound(() => enemyTurn(f.cb, f.g.rng)), weapon + ' ' + seed + ' ' + u.name).not.toThrow();
          }
          // the PCs stay under fire so the Takes and the Watches have Pressed targets next round
          for (const p of f.pcs) if (!f.unit(p.id).dead) f.press(p, 2, f.foes[0]);
        }
      }
    });
  }
  it('enemies do pick techniques over a plain shot, and never spend a turn re-marking (Bead, Spot once a turn)', () => {
    const count: Record<string, number> = {};
    for (const weapon of WEAPONS) {
      const f = fight(weapon, 'ai-pick');
      for (const e of f.foes) {
        f.turn(f.unit(e.id)); rig(null); const turn: string[] = [];
        for (let s = 0; s < 6 && f.unit(e.id).ap > 0; s++) {
          const p = f.bound(() => phys.aiTechnique(f.cb, f.unit(e.id))); if (!p) break;
          const ap0 = f.unit(e.id).ap;
          expect(f.bound(() => phys.useTechnique(f.cb, f.unit(e.id), p.id, p.args, f.g.rng)), weapon + ' ' + p.id).toBeNull();
          expect(f.unit(e.id).ap, weapon + ' ' + p.id + ' costs AP').toBeLessThan(ap0);
          turn.push(p.id); count[p.id] = (count[p.id] || 0) + 1;
        }
        for (const id of ['bead', 'spot']) expect(turn.filter((x) => x === id).length, weapon + ': ' + turn.join(' ')).toBeLessThanOrEqual(1);
      }
    }
    // a Take on a Pressed player, a Press, a Set: the AI reaches every kind
    expect(Object.keys(count).length, JSON.stringify(count)).toBeGreaterThan(5);
    for (const id of ['dead_centre', 'crossfire', 'vent', 'bead']) expect(count[id], id + ' in ' + JSON.stringify(count)).toBeGreaterThan(0);
  });
  it('Bead: an enemy holding a bead on a standing player doesn\'t switch it to the other one', () => {
    const f = fight('long_rifle', 'ai-bead'); const e = f.unit(f.foes[0].id); f.turn(e);
    const [a, b] = f.pcs;
    expect(f.bound(() => phys.aiScore(f.cb, e, 'bead', { targetId: b.id })).score).toBeGreaterThan(0);
    expect(f.use(e, 'bead', { targetId: a.id })).toBeNull();
    expect(f.bound(() => phys.aiScore(f.cb, f.unit(e.id), 'bead', { targetId: b.id })).score).toBe(0);
    f.unit(a.id).dead = true; // its target gone, it may bead another
    expect(f.bound(() => phys.aiScore(f.cb, f.unit(e.id), 'bead', { targetId: b.id })).score).toBeGreaterThan(0);
  });
  it('Cover Me: an enemy names the ally standing nearest a player; it stays below a plain attack (held shots wait for an AI step)', () => {
    const f = fight('hellraiser_service_rifle', 'ai-cover'); const [e, mate] = f.foes; f.turn(f.unit(e.id));
    f.put(mate, 'E3'); // next to the player at C3 (2 tiles)
    let s: any; unchanged(f, () => { s = f.bound(() => phys.aiScore(f.cb, f.unit(e.id), 'cover_me', {})); });
    expect(s.score).toBe(4); expect(s.args.allyId).toBe(mate.id); expect(s.score).toBeLessThanOrEqual(phys.PLAIN_ATTACK_SCORE);
    for (const m of f.foes) if (m.id !== e.id) f.put(m, m.id === mate.id ? 'O9' : 'O1');
    expect(f.bound(() => phys.aiScore(f.cb, f.unit(e.id), 'cover_me', {})).score).toBe(1);
  });
});

describe('the ranged lane is complete', () => {
  it('every ranged technique in the data has a handler (the pad shows none as not built)', () => {
    expect(RANGED.length).toBe(32);
    for (const id of RANGED) expect(phys.handlerOf(id), id).toBeTruthy();
    const f = fight('decrkm_smg', 'ai-pad'); const c = f.char(f.pc);
    phys.ensurePhys(c).known = [...RANGED]; phys.ensurePhys(c).ready = { melee: [], ranged: [...RANGED] }; (phys.ensurePhys(c) as any).uncapped = true;
    const pad = f.pad(); const entries = pad.flatMap((g) => g.entries);
    expect(entries.length).toBeGreaterThan(20); expect(entries.filter((e) => !e.built).map((e) => e.id)).toEqual([]);
  });
  it('every number in a ranged technique\'s data is read by the ranged code (none unused)', async () => {
    // node's fs, loaded by name (the engine's tsconfig carries no node types)
    const fs: any = await import(/* @vite-ignore */ 'node:' + 'fs'), path: any = await import(/* @vite-ignore */ 'node:' + 'path'), url: any = await import(/* @vite-ignore */ 'node:' + 'url');
    const dir = path.join(path.dirname(url.fileURLToPath((import.meta as any).url)), '../src/physical/ranged');
    const src = (fs.readdirSync(dir) as string[]).filter((n) => n.endsWith('.ts')).map((n) => fs.readFileSync(path.join(dir, n), 'utf8') as string).join('\n')
      + fs.readFileSync(path.join(dir, '../../combat.ts'), 'utf8'); // rules 1.18: the Burst's rolls are worked out in combat.ts (burstRolls), for the technique and the plain burst action alike
    const unused: string[] = [];
    for (const d of phys.TECHNIQUES.filter((x) => x.system === 'ranged')) for (const k of Object.keys(d.numbers || {})) if (!src.includes("'" + k + "'")) unused.push(d.id + '.' + k);
    expect(unused).toEqual([]);
  });
});
