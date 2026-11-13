// @ts-nocheck (a recording tool; see harness.ts)
// THE FORCED-MOVEMENT TABLE of engine foundations 1 (review finding F2). Every way the engine moves a unit against
// its will (a push, a pull, a throw, a swap, a teleport), each against the same list of cases: an empty tile, each
// kind of object on the landing tile, another unit, the map's edge, a trap, a Sigil trap, a Sigil field, a hazard, a
// held Overwatch, an enemy next to the mover's path, a Nailed target, a target immune by the `immune('knockback')`
// query, and a target that cancels the `forced_move` hook.
//
// The mover stands on 5,5 and the target on 6,5 (a pull: 8,5), so a push lands on 7,5: the case is put on the tile
// the target would land on (`land`). A line holds where everyone ended, what changed on them, what went off, and
// whether the watcher fired. It was recorded on the code before `displace()` existed (it shows the 14 old
// implementations disagreeing) and re-recorded once with the one rule: docs/design/handoffs/engine-foundations-1.md
// lists every line that moved.
import { A, W, copy, fightSpec, place, turn, pcs, foes, units, label } from './harness';
import { onHook, onStat } from '../../src/effects/hooks';

const MARK: { immune?: string; hooked?: string } = {};
if (!(globalThis as any).__movesTap) {
  (globalThis as any).__movesTap = true;
  onHook('forced_move', (ctx: any) => { if (MARK.hooked && ctx.u?.id === MARK.hooked) ctx.cancel = true; });
  onStat('immune:knockback', (x: any) => (MARK.immune && x.u?.id === MARK.immune ? 1 : 0));
}

interface Mover { id: string; spec?: any; /** where the target starts and lands in the plain case */ from?: string; land: string; /** prepare the mover's unit */ prep?: (g: any, a: any, t: any) => void;
  /** do it: return an error string to record a refusal */ go: (g: any, cb: any, a: any, t: any) => any; /** seeds to try until the plain case moves the target */ seeds?: number[] }
const EVEN = { level: 6, skills: Object.fromEntries(A.SKILLS.map((x: any) => [x.id, 5])), attrs: Object.fromEntries(A.ATTRS.map((x: any) => [x.id, 5])) };
const ready = (id: string) => (g: any, a: any) => { const p = A.phys.ensurePhys(g.characters[a.charId]); p.known = [id]; p.ready = { melee: [id], ranged: [] }; p.uncapped = true; };
const perk = (g: any, a: any, id: string, actionId: string, args: any) => { const g2 = A.apply(g, { type: 'combat/perk', unitId: a.id, id, actionId, ...args }, 'host'); Object.assign(g, g2); return null; };

export const MOVERS: Mover[] = [
  { id: 'technique-shove', spec: { ...EVEN, weapon: 'sabre' }, land: '7,5', prep: ready('shove'), go: (g, cb, a, t) => A.useTechnique(cb, a, 'shove', { targetId: t.id }, g.rng) },
  { id: 'technique-shove-heavy', spec: { ...EVEN, weapon: 'adamantile_greatsword' }, land: '7,5', prep: ready('shove'), go: (g, cb, a, t) => A.useTechnique(cb, a, 'shove', { targetId: t.id }, g.rng) },
  { id: 'technique-drag-pull', spec: { ...EVEN, weapon: 'glaive' }, from: '7,5', land: '6,5', prep: ready('drag'), go: (g, cb, a, t) => A.useTechnique(cb, a, 'drag', { targetId: t.id, choice: 'pull' }, g.rng) },
  { id: 'technique-drag-swap', spec: { ...EVEN, weapon: 'sabre' }, land: '5,5', prep: ready('drag'), go: (g, cb, a, t) => A.useTechnique(cb, a, 'drag', { targetId: t.id, choice: 'swap' }, g.rng) },
  { id: 'op-knockback', land: '7,5', go: (g, cb, a, t) => { cb.log.push('knockback' + A.pushAway(cb, a, t, 2)); } },
  { id: 'old-shove', land: '7,5', prep: (g, a) => { a.strength = 50; }, go: (g, cb, a, t) => A.shove(cb, g.rng, a, t) },
  { id: 'weapon-push', spec: { ...EVEN, weapon: 'frontier_hand_cannon' }, land: '7,5', go: (g, cb, a, t) => { const r = A.resolveAttack(cb, g.rng, a, t, 'shot', g.characters[a.charId]); return r.refused || null; } },
  { id: 'sigil-push', land: '7,5', go: (g, cb, a, t) => { cb.log.push('PUSH' + A.magicShove(cb, t, a.pos, 2, a)); } },
  { id: 'sigil-pull', from: '8,5', land: '7,5', go: (g, cb, a, t) => { cb.log.push('PULL' + A.magicShove(cb, t, a.pos, -2, a)); } },
  { id: 'class-shove', spec: { ...EVEN, classId: 'fighter' }, land: '7,5', go: (g, cb, a, t) => perk(g, a, 'class:fighter.shove', 'class_shove', { targetId: t.id, choice: 'push' }) },
  { id: 'grenadiers-arm', spec: { ...EVEN, traits: ['grenadiers_arm'], attrs: { ...EVEN.attrs, strength: 13 } }, land: '8,5', go: (g, cb, a, t) => perk(g, a, 'grenadiers_arm', 'hurl', { targetId: t.id, tile: '8,5' }) },
  { id: 'outburst-swap', spec: { ...EVEN, archetype: 'stormcaller', kit: 'soul' }, land: '5,5', prep: (g, a) => { Object.assign(a.mg, { emanator: true, mp: 9999, mpMax: 9999, strain: 0, strainLimit: 30 }); a.mg.designs.push({ id: 'gswap', name: 'Golden swap', school: 'control', option: 'swap', modules: [] }); },
    go: (g, cb, a, t) => { a.ap = 99; let e = A.beginOutburst(cb, g.rng, a, 'gswap', undefined, true, {}); if (e) return 'Begin: ' + e; a.ap = 99; e = A.releaseOutburst(cb, g.rng, a, t.pos); return e ? 'Release: ' + e : null; } },
  { id: 'switcheroo', spec: { ...EVEN, skills: { ...EVEN.skills, faith: 9 } }, land: '5,5', prep: (g, a) => { const c = g.characters[a.charId]; c.belief = { kind: 'faithful', patron: 'the_laughing_mask' }; c.patron = 'the_laughing_mask'; c.devotion = 10; },
    go: (g, cb, a, t) => { const g2 = A.apply(g, { type: 'faith/pray', unitId: a.id, kind: 'hymn', id: 'switcheroo', targetId: a.id, targetId2: t.id }, 'host'); Object.assign(g, g2); return null; } },
  { id: 'sigil-step', spec: { ...EVEN, archetype: 'sigilist', kit: 'sigil' }, from: '8,5', land: '9,7', prep: (g, a) => { a.mg.charge = 999; a.mg.flux = -99; a.mg.words = [...new Set([...(a.mg.words || []), 'step', 'seek'])]; },
    go: (g, cb, a, t) => { a.ap = 99; const tiles = ['4,5', '3,5']; const words = ['step', 'seek']; for (let i = 0; i < 2; i++) { a.pos = tiles[i]; const e = A.drawGlyph(cb, g.rng, a, words[i]); if (e) return 'Draw: ' + e; } a.ap = 99; const e = A.evoke(cb, g.rng, a, '3,5', t.pos, { dest: '9,7' }); return e ? 'Evoke: ' + e : null; } },
];

interface Case { id: string; put?: (g: any, cb: any, a: any, t: any, m: Mover, extra: any) => void }
const obj = (kind: string): Case => ({ id: 'object-' + kind, put: (g, cb, a, t, m) => { cb.objects.push(A.makeObject('g_' + kind, kind, m.land)); } });
export const CASES: Case[] = [
  { id: 'plain' },
  ...['crate', 'low_wall', 'pillar', 'barricade', 'door', 'hole', 'barrel', 'container', 'terminal', 'turret', 'sigil_wall', 'rubble', 'lamp', 'cache', 'trap'].map(obj),
  { id: 'broken-crate', put: (g, cb, a, t, m) => { const o = A.makeObject('g_crate', 'crate', m.land); o.hp = 0; cb.objects.push(o); } },
  { id: 'unit', put: (g, cb, a, t, m, x) => { if (m.land !== a.pos) x.other.pos = m.land; } },
  { id: 'edge', put: (g, cb, a, t, m) => { if (m.land === '7,5' && (!m.from || m.from === '6,5')) { a.pos = '22,5'; t.pos = '23,5'; } } },
  { id: 'sigil-trap', put: (g, cb, a, t, m) => { cb.zones = [...(cb.zones || []), { id: 'zt', kind: 'trap', tiles: [m.land], words: ['fire', 'wait'], by: a.id, side: 'pc', left: 3, mult: 1, who: a.name, triggers: 1, hidden: true, spotted: [], element: 'fire', str: 0 }]; } },
  { id: 'sigil-field', put: (g, cb, a, t, m) => { cb.zones = [...(cb.zones || []), { id: 'zf', kind: 'field', tiles: [m.land], words: ['fire', 'stay'], by: a.id, side: 'pc', left: 3, mult: 0.5, first: 1, who: a.name, hit: {}, ever: {}, element: 'fire', str: 0 }]; } },
  { id: 'hazard-fire', put: (g, cb, a, t, m) => { cb.hazards = [...(cb.hazards || []), { id: 'hz', kind: 'fire', severity: 'light', zone: 'z', tiles: [m.land], approaches: [] }]; } },
  { id: 'hazard-mine', put: (g, cb, a, t, m) => { cb.hazards = [...(cb.hazards || []), { id: 'hm', kind: 'minefield', severity: 'heavy', zone: 'z', tiles: [m.land], approaches: [] }]; } },
  { id: 'overwatch', put: (g, cb, a, t, m, x) => { x.watcher.pos = '7,8'; x.watcher.ap = 9; const e = A.setOverwatch(cb, x.watcher, 'shot'); if (e) cb.log.push('NO WATCH: ' + e); } },
  { id: 'reach', put: (g, cb, a, t, m, x) => { const [tx, ty] = (m.from || '6,5').split(',').map(Number); x.watcher.pos = tx + ',' + (ty + 1); x.watcher.weapon = 'sabre'; } },
  { id: 'nailed', put: (g, cb, a, t) => { t.nailed = { ap: 2, by: a.id, weapon: 'sabre' }; } },
  { id: 'immune-query', put: (g, cb, a, t) => { MARK.immune = t.id; } },
  { id: 'cancels-hook', put: (g, cb, a, t) => { MARK.hooked = t.id; } },
  { id: 'braced', put: (g, cb, a, t) => { t.braced = true; } },
];

function reading(g: any, before: any, a: any, t: any, x: any): { state: string; log: string } {
  const cb = g.combat, p: string[] = [];
  for (const u of cb.units) {
    const b = before.units[u.id]; if (!b) continue; const q: string[] = [];
    if (b.pos !== u.pos) q.push(b.pos + '>' + u.pos); if (b.hp !== u.hp) q.push('hp' + (u.hp - b.hp));
    if (!b.prone && u.prone) q.push('+prone'); if (b.braced !== !!u.braced) q.push(u.braced ? '+braced' : '-braced');
    for (const k of Object.keys(u.conds || {})) if (!(k in b.conds)) q.push('+' + k);
    if (b.nailed && !u.nailed) q.push('-nailed'); if (b.react !== JSON.stringify(u.uses?.['reaction|reaction'] ?? null)) q.push('reacted'); if (b.ammo !== u.ammo) q.push('ammo' + (u.ammo - b.ammo));
    if (b.ow && !u.overwatch) q.push('-overwatch');
    if (q.length) p.push((u === t ? 'T' : u === a ? 'A' : u === x.watcher ? 'W' : u === x.other ? 'O' : label(cb, u)) + ' ' + q.join(' '));
  }
  const gone = before.objects.filter((id: string) => !cb.objects.some((o: any) => o.id === id)); if (gone.length) p.push('objects gone: ' + gone.join(' '));
  const zg = before.zones.filter((id: string) => !(cb.zones || []).some((z: any) => z.id === id)); if (zg.length) p.push('zones gone: ' + zg.join(' '));
  const spent = (cb.hazards || []).flatMap((h: any) => h.spent || []); if (spent.length) p.push('mines spent: ' + spent.join(' '));
  return { state: p.join(', ') || 'nothing', log: cb.log.slice(before.log).map((l: string) => l.slice(0, 220)).join(' / ') };
}

export function recordMoves(): { state: Record<string, string>; log: Record<string, string> } {
  const state: Record<string, string> = {}, log: Record<string, string> = {};
  for (const m of MOVERS) {
    const g0 = fightSpec([{ ...EVEN, ...(m.spec || {}) }, { ...EVEN, weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier' }, { tier: 'soldier' }], { level: 6, seed: 'moves' });
    const play = (c: Case, seed: number) => {
      const g = copy(g0), cb = g.combat, a = pcs(g)[0], watcher = pcs(g)[1], [t, other] = foes(g), x = { watcher, other };
      place(g, [[a, '5,5'], [t, m.from || '6,5'], [watcher, '2,12'], [other, '20,12']]);
      turn(g, a, 9); delete MARK.immune; delete MARK.hooked;
      if (m.prep) m.prep(g, a, t);
      if (c.put) c.put(g, cb, a, t, m, x);
      const before = { log: cb.log.length, objects: cb.objects.map((o: any) => o.id), zones: (cb.zones || []).map((z: any) => z.id),
        units: Object.fromEntries(cb.units.map((u: any) => [u.id, { pos: u.pos, hp: u.hp, prone: !!u.prone, braced: !!u.braced, conds: { ...(u.conds || {}) }, nailed: !!u.nailed, react: JSON.stringify(u.uses?.['reaction|reaction'] ?? null), ammo: u.ammo, ow: !!u.overwatch }])) };
      g.rng.state = seed; let err = '';
      try { const r = W(g, () => m.go(g, cb, a, t)); if (typeof r === 'string' && r) err = 'REFUSED ' + r.slice(0, 80); } catch (e: any) { err = (e?.name === 'RuleError' ? 'REFUSED ' : 'THREW ') + String(e?.message || e).slice(0, 80); }
      delete MARK.immune; delete MARK.hooked;
      const g1 = g, a1 = g1.combat.units.find((u: any) => u.id === a.id), t1 = g1.combat.units.find((u: any) => u.id === t.id);
      const r = reading(g1, before, a1, t1, { watcher: g1.combat.units.find((u: any) => u.id === watcher.id), other: g1.combat.units.find((u: any) => u.id === other.id) });
      return err ? { state: err, log: r.log, moved: false } : { ...r, moved: t1.pos !== (m.from || '6,5') };
    };
    // the seed: the first that moves the target in the plain case (a mover behind a save or a roll needs the save to fail)
    const seed = [4242, 7, 11, 99, 1234, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16].find((s) => play(CASES[0], s).moved) ?? 4242;
    for (const c of CASES) { const r = play(c, seed); state[m.id + '/' + c.id] = r.state; log[m.id + '/' + c.id] = r.log; }
  }
  return { state, log };
}
