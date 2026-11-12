// Enemy Soul casters, rules revision 1.5 (Outburst 2.0; packages/engine/src/ai-soul.ts; data/enemies.json
// `soul_casters`). The AI only chooses: every release is a real previewOutburstPlan and every step a real action, so the
// tests check the choice and what the engine then did.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, enemyTurn, sandboxWave, magicTurnStart, magicTurnEnd, moveUnit, wikiLookup, wikiKinds,
  HEART_CASTER, HEART_CASTERS, heartBestRelease, heartPlanValue, previewOutburstPlan, SCHOOL, MODULE, TONE, WEAPON,
  type Sheet, type Combat, type Unit, type MapDef,
} from '../src';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const open = (w = 20, h = 20): MapDef => ({ ...MAPS.yard16, w, h, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8', '15,9', '15,10', '15,11', '15,12'] });
function seed(n = 60, from = 1): { state: number } { for (let s = from; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
interface FoeAt { at: string; caster?: string; tier?: string; name?: string; weapon?: string }
/** Players with 500 HP, Defense 10, saves 0; foes[0] is the one whose turn the tests run. Normal air. */
function fight(pcs: string[], foes: FoeAt[]) {
  const cs = pcs.map((at, i) => ({ c: newCharacter('c' + i, 'p1', sheet('sigilist', 'Player ' + (i + 1))), pos: at }));
  const cb = startCombat('t', open(), cs, foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || (f.caster ? HEART_CASTER[f.caster]?.tier : 'soldier') || 'soldier', weapon: f.weapon || (f.caster ? HEART_CASTER[f.caster]?.weapon : '') || 'combat_knife', at: refOf(f.at), ...(f.caster ? { caster: f.caster } : {}) })), 'easy', { state: 7 }, []);
  cb.objects = []; cb.mana = 15;
  const ps = cb.units.filter((x) => x.side === 'pc'), es = cb.units.filter((x) => x.side === 'foe');
  for (const x of ps) { x.hp = x.maxHp = 500; x.armour = 0; x.def = 10; x.sv = { body: 0, brain: 0, heart: 0 }; x.hidden = false; }
  return { cb, ps, es, e: es[0], p: ps[0] };
}
/** One whole turn of e: the heart's turn start, the enemy turn with full AP, the turn's end (the burn, stillness). */
function turn(cb: Combat, e: Unit, rng = seed()) { cb.turn = cb.order.indexOf(e.id); magicTurnStart(cb, rng, e); e.ap = 6; enemyTurn(cb, rng); magicTurnEnd(cb, rng, e); }
const fx = (cb: Combat, k: string, u?: Unit) => ((cb.fx || []) as any[]).filter((x) => x.k === k && (!u || x.unit === u.id));
const by = (cb: Combat, u: Unit, re: RegExp) => cb.log.filter((l) => l.startsWith(u.name) && re.test(l));

describe('Soul caster archetypes (data/enemies.json soul_casters)', () => {
  it('a heart adept, a Heartfire elite and a Heart sovereign, each of its tier, with real weapons, schools, modules and tones', () => {
    expect(HEART_CASTERS.map((c) => [c.id, c.tier])).toEqual([['heart_adept', 'soldier'], ['heartfire_elite', 'elite'], ['heart_sovereign', 'boss']]);
    for (const c of HEART_CASTERS) {
      expect(WEAPON[c.weapon], c.weapon).toBeTruthy(); expect(c.provisional).toBe(true);
      for (const d of c.designs) {
        expect(SCHOOL[d.school], d.id).toBeTruthy(); for (const m of d.modules) expect(MODULE[m], m).toBeTruthy();
        if (d.tone) expect(TONE[d.tone], d.tone).toBeTruthy();
        expect(d.modules.filter((m) => (MODULE[m] as any).form).length).toBeLessThanOrEqual(1); // one shape a design
      }
      expect(c.designs.some((d) => d.school === 'buff')).toBe(true); // every Soul caster can heal its own
    }
  });
  it('a foe naming one gets an Emanator (no Evoker), the designs, its Soul multiplier, MP, Strain limit and free Pumps', () => {
    const { e } = fight(['2,5'], [{ at: '15,5', caster: 'heartfire_elite' }]);
    expect(e.mg!.soulMult).toBeCloseTo(1.4 * e.lvlDmg!, 6); expect(e.lvlDmg).toBe(1.05); // rules 1.15: its spells take the tier and level damage factor (an Elite at level 1: ×1.05)
    expect(e.mg).toMatchObject({ emanator: true, evoker: false, mp: 140, mpMax: 140, strainLimit: 5, freePumps: 1, freePumpsMax: 1, will: e.attack });
    expect(e.mg!.designs.map((d) => d.id)).toEqual(['heartfire_burst', 'cinder_wave', 'ember_mend']);
    expect((e as any).caster).toBe('heartfire_elite');
  });
});

describe('enemy Soul casters choose by situation (rules 1.5)', () => {
  it('clustered players in reach: a full turn, Begin + Pumps + Release at the stage its AP buys, on the cluster', () => {
    const { cb, e, ps } = fight(['8,5', '8,6', '2,15'], [{ at: '11,5', caster: 'heartfire_elite' }]);
    turn(cb, e);
    const rel = fx(cb, 'release', e).at(-1);
    expect(rel).toBeTruthy(); expect(rel.form).toBe('burst'); expect(rel.tone).toBe('fire');
    expect(rel.stage).toBe(4); // 6 AP: Begin 2, Release 1, 1 free Pump + 3 Pumps
    expect(rel.targets).toEqual(expect.arrayContaining([ps[0].id, ps[1].id]));
    expect(ps[0].hp).toBeLessThan(500); expect(ps[1].hp).toBeLessThan(500); expect(ps[2].hp).toBe(500);
    expect(e.mg!.held).toBeNull(); expect(e.mg!.strain).toBeLessThanOrEqual(e.mg!.strainLimit);
    expect(by(cb, e, /begins Heartfire burst/).length).toBe(1);
  });
  it('the release it picks is the best of the engine\'s own plans (never a number of its own)', () => {
    const { cb, e } = fight(['8,5', '8,6'], [{ at: '11,5', caster: 'heartfire_elite' }]);
    e.ap = 6; cb.turn = cb.order.indexOf(e.id);
    const c = heartBestRelease(cb, e)!;
    expect(c).toBeTruthy();
    const pv = previewOutburstPlan(cb, e, c.src, c.aim, { stage: c.stage });
    expect(pv.ok).toBe(true); expect(heartPlanValue(cb, e, pv).score).toBeCloseTo(c.score, 5);
    expect(c.foes).toBe(2);
  });
  it('players out of reach: it Begins and holds (stage 0) rather than release at nothing', () => {
    const { cb, e } = fight(['2,5'], [{ at: '17,15', caster: 'heart_adept' }]);
    turn(cb, e);
    expect(e.mg!.held).toMatchObject({ design: 'heart_bolt' });
    expect(fx(cb, 'release', e)).toHaveLength(0);
    expect(e.mg!.strain).toBeLessThanOrEqual(e.mg!.strainLimit);
  });
  it('holding at stage 2+ with players near: it pumps and watches with the heart; a player walking into reach draws the release', () => {
    const { cb, e, p } = fight(['2,5'], [{ at: '11,5', caster: 'heart_adept' }]);
    e.mg!.held = { design: 'heart_bolt', stage: 2, cost: 20, tone: 'raw', form: 'bolt', turns: 1, v: 15 } as any; e.mg!.strain = 1;
    cb.turn = cb.order.indexOf(e.id); e.ap = 2; enemyTurn(cb, seed()); // 2 AP: not enough to walk into reach and release big
    expect(e.mg!.held?.watch).toBe(true);
    const hp = p.hp; cb.turn = cb.order.indexOf(p.id); p.ap = 6;
    const to = (dist0: number) => { const [x, y] = e.pos.split(',').map(Number); return (x - dist0) + ',' + y; };
    expect(moveUnit(cb, p, to(5), seed())).toBeNull(); expect(fx(cb, 'heart_overwatch', e)).toHaveLength(0); // still out of reach (4)
    expect(moveUnit(cb, p, to(4), seed())).toBeNull();
    expect(fx(cb, 'heart_overwatch', e).length).toBe(1);
    expect(e.mg!.held).toBeNull(); expect(p.hp).toBeLessThan(hp);
  });
  it('Strain: over many turns of holding with nobody in reach it never burns and never shorts (it steadies or lets go)', () => {
    const { cb, e } = fight(['2,5'], [{ at: '17,17', caster: 'heart_adept', weapon: 'combat_knife' }]);
    cb.mana = 32; // Flooded air: every swell +2 Strain
    for (let i = 0; i < 8; i++) { cb.round = i + 1; turn(cb, e, seed(60, 100 + i * 7)); e.pos = '17,17'; expect(e.mg!.strain, 'turn ' + i).toBeLessThanOrEqual(e.mg!.strainLimit); }
    expect(cb.log.some((l) => /MANA SHORT/.test(l))).toBe(false);
    expect(fx(cb, 'burn', e)).toHaveLength(0);
    expect(fx(cb, 'steady', e).length + fx(cb, 'letgo', e).length).toBeGreaterThan(0);
  });
  it('over the limit while holding, with nothing to hit: it calms the heart before the burn', () => {
    const { cb, e } = fight(['2,5'], [{ at: '17,17', caster: 'heart_adept' }]);
    e.mg!.held = { design: 'heart_bolt', stage: 1, cost: 20, tone: 'raw', form: 'bolt', turns: 1, v: 15 } as any; e.mg!.strain = 6; // limit 4
    cb.turn = cb.order.indexOf(e.id); e.ap = 6; enemyTurn(cb, seed()); magicTurnEnd(cb, seed(), e);
    expect(fx(cb, 'letgo', e).length).toBe(1); expect(e.mg!.held).toBeNull();
    expect(fx(cb, 'burn', e)).toHaveLength(0); expect(e.mg!.strain).toBeLessThanOrEqual(4);
  });
  it('a hurt ally in reach and no player near: it heals with its Buff design', () => {
    const { cb, e, es } = fight(['2,5'], [{ at: '17,10', caster: 'heart_adept' }, { at: '17,12', tier: 'soldier', name: 'Guard' }]);
    const g = es[1]; g.hp = 10;
    turn(cb, e);
    const rel = fx(cb, 'release', e).at(-1);
    expect(rel).toMatchObject({ school: 'buff', targets: [g.id] }); expect(g.hp).toBeGreaterThan(10);
  });
  it('a Hidden player is never aimed at, and a release that hits more of its own side than of the players is never made', () => {
    const a = fight(['10,5'], [{ at: '13,5', caster: 'heart_adept' }]);
    a.p.hidden = true; turn(a.cb, a.e);
    expect(fx(a.cb, 'release', a.e)).toHaveLength(0); expect(a.p.hp).toBe(500);
    // A lone player wedged between three guards: the Heartfire burst would catch more guards than players.
    const b = fight(['10,5'], [{ at: '13,5', caster: 'heartfire_elite' }, { at: '10,4', tier: 'soldier', name: 'G1' }, { at: '10,6', tier: 'soldier', name: 'G2' }, { at: '11,5', tier: 'soldier', name: 'G3' }]);
    b.e.mg!.designs = b.e.mg!.designs.filter((d) => d.id === 'heartfire_burst');
    const c = heartBestRelease(b.cb, b.e); b.cb.turn = b.cb.order.indexOf(b.e.id); b.e.ap = 6;
    expect(c === null || c.own <= c.foes).toBe(true); // the planner offers no such release (it offered none here: null)
    turn(b.cb, b.e); // truth pass 3: the caster takes its turn (the loop below had nothing to read before)
    for (const r of fx(b.cb, 'release', b.e)) expect(r.targets.filter((t: string) => t !== b.p.id).length).toBeLessThanOrEqual(1);
  });
});

describe('the Proving Ground wave pool: Soul casters (game.ts sandboxWave)', () => {
  it('from wave 4 on even waves a Heart adept; Heartfire elite on odd waves from 7 (not champion waves); a Heart sovereign on champion waves', () => {
    expect([1, 2, 3].some((n) => sandboxWave(n).some((f) => HEART_CASTER[f.caster || '']))).toBe(false);
    expect(sandboxWave(4).find((f) => f.caster === 'heart_adept')).toMatchObject({ tier: 'soldier', weapon: 'service_pistol', name: 'Heart adept 1' });
    expect(sandboxWave(7).find((f) => f.caster === 'heartfire_elite')).toMatchObject({ tier: 'elite', weapon: 'sabre' });
    expect(sandboxWave(5).find((f) => f.caster === 'heart_sovereign')).toMatchObject({ tier: 'boss' });
    const w10 = sandboxWave(10); expect(w10.filter((f) => f.tier === 'boss').map((f) => f.caster)).toEqual(['sigil_magister', 'heart_sovereign']);
    // The Sigil casters keep their places (sigil14-ai's own expectations).
    expect(sandboxWave(2).find((f) => f.caster)).toMatchObject({ caster: 'sigil_novice' });
    expect(sandboxWave(6).find((f) => f.caster === 'sigil_warden')).toBeTruthy();
    expect(sandboxWave(12)).toEqual(sandboxWave(12));
  });
});

describe('the Narrator\'s wiki: the heart, tones, forms and the Soul casters', () => {
  it('soul:heart, tone:<id> for every tone, form:<id> for every shape, and enemy:soul_casters', () => {
    expect(wikiLookup('soul:heart')!.text).toMatch(/Begin.*Pump.*Release/);
    expect(wikiLookup('soul:heart')!.text).toMatch(/Strain/);
    for (const t of ['raw', 'fire', 'storm', 'frost', 'stone', 'gale', 'acid']) expect(wikiLookup('tone:' + t), t).toBeTruthy();
    expect(wikiLookup('tone:fire')!.text).toMatch(/stage 4/i);
    for (const f of ['bolt', 'wave', 'burst', 'aura', 'lance']) expect(wikiLookup('form:' + f), f).toBeTruthy();
    expect(wikiLookup('enemy:soul_casters')!.text).toMatch(/Heart adept/);
    expect(wikiKinds().tone).toContain('fire'); expect(wikiKinds().form).toContain('lance'); expect(wikiKinds().soul).toBeUndefined();
  });
});

describe('a whole fight with every Soul caster', () => {
  it('ten rounds of the three casters against four players: no Short, no burn, it acts, and it stays quick', () => {
    const { cb, es, ps } = fight(['4,5', '4,7', '5,6', '3,9'], [{ at: '12,5', caster: 'heart_adept' }, { at: '12,8', caster: 'heartfire_elite' }, { at: '14,6', caster: 'heart_sovereign' }, { at: '13,10', tier: 'soldier', name: 'Guard', weapon: 'service_pistol' }]);
    const t0 = Date.now();
    for (let r = 1; r <= 10; r++) {
      cb.round = r;
      for (const e of es) if (!e.dead && !e.downed) {
        const n0 = cb.log.length, start = e.pos; turn(cb, e, seed(80, 300 + r * 13 + es.indexOf(e)));
        // 0.18.1 (Leon's log: "Heart adept moves to P3, P2, P3, P2"): nobody walks back onto a tile it stood on this turn
        const went = [start, ...cb.log.slice(n0).map((l) => (l.startsWith(e.name + ' moves to ') ? l.split(' moves to ')[1].split(' ')[0] : '')).filter(Boolean)];
        const refs = went.slice(1); expect(new Set(refs).size, e.name + ' round ' + r + ': ' + refs.join(' → ')).toBe(refs.length);
      }
      for (const p of ps) if (!p.dead && !p.downed) { cb.turn = cb.order.indexOf(p.id); p.ap = 6; const [x, y] = p.pos.split(',').map(Number); moveUnit(cb, p, Math.min(19, x + 1) + ',' + y, seed()); }
    }
    expect(Date.now() - t0).toBeLessThan(8000);
    expect(cb.log.some((l) => /MANA SHORT/.test(l))).toBe(false);
    for (const e of es.slice(0, 3)) { expect(fx(cb, 'burn', e), e.name).toHaveLength(0); expect(cb.log.some((l) => l.startsWith(e.name + ' releases ')), e.name).toBe(true); } // (the log, not the effects list: that one is capped, and a long fight drops its early events)
    expect(ps.some((p) => p.hp < 500)).toBe(true);
  });
});
