// Action descriptors (engine review 4, finding 3): every action a unit can take is reachable through actionsFor, and
// sendDescriptor sends exactly what the screens' own Confirm branches sent before (the reference below is a copy of
// apps/web/src/screens/combat.js confirm() as it stood, written against the picks rather than the screen's state).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { actionsFor, previewDescriptor, sendDescriptor, registerActions, nextStep, stepOn, parseTechId, techOpt, parsePrayId, parsePerkId, apply, RuleError, WEAPON, isMelee, pullFreeTargets, type ActionDescriptor, type Picks } from '../src';
import { fightWith, type CharSpec } from './helpers/perkfight';

/** The screen's old Confirm, by action id (combat.js confirm(), heartAct(), magicClick() and the prayer and Call glue). */
function oldAction(u: any, cb: any, id: string, p: Picks): any {
  const U = { unitId: u.id }, mods = p.mods && p.mods.length ? { mods: p.mods } : {};
  const t = parseTechId(id);
  if (t) { const o = techOpt(t.id, p.opt); return { type: 'combat/technique', ...U, id: t.id, hand: t.hand, ...(t.item != null ? { item: t.item } : {}), ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.allyId ? { allyId: p.allyId } : {}), ...(p.tile ? { tile: p.tile } : {}), ...(p.line ? { line: p.line } : {}), ...(o ? { opt: o } : {}), ...mods }; }
  if (id.startsWith('cl:')) return { type: 'combat/call', ...U, id: id.slice(3), targetId: p.targetId || u.id, ...(p.tile ? { tile: p.tile } : {}), ...(p.opt ? { opt: Array.isArray(p.opt) ? p.opt.join('+') : p.opt } : {}) };
  const pr = parsePrayId(id); if (pr) return { type: 'faith/pray', ...U, kind: pr.kind, id: pr.id, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.targetId2 ? { targetId2: p.targetId2 } : {}), ...(p.tile ? { tile: p.tile } : {}) };
  const pk = parsePerkId(id); if (pk) return { type: 'combat/perk', ...U, id: pk.id, actionId: pk.actionId, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.tile ? { tile: p.tile } : {}), ...(p.arm ? { arm: true } : {}) };
  switch (id) {
    case 'move': case 'sprint': case 'disengage': return { type: 'combat/move', ...U, to: p.tile, how: id, ...mods };
    case 'reload': return { type: 'combat/reload', ...U }; case 'reload-tac': return { type: 'combat/reload', ...U, tactical: true };
    case 'reload2': return { type: 'combat/reload', ...U, hand: 'both' }; case 'reload2-tac': return { type: 'combat/reload', ...U, hand: 'both', tactical: true };
    case 'reload-off': return { type: 'combat/reload', ...U, hand: 'off' }; case 'reload-off-tac': return { type: 'combat/reload', ...U, hand: 'off', tactical: true }; // (added 12 Nov 2026: the off-hand gun's own reload)
    case 'pullfree': { const ts = pullFreeTargets(cb, u), x = ts.find((v) => v.id === p.targetId) || ts[0]; return { type: 'combat/pull-free', ...U, targetId: x.id }; }
    case 'overwatch': return { type: 'combat/overwatch', ...U, mode: isMelee(WEAPON[u.weapon]) ? 'melee' : 'shot' };
    case 'shove': return { type: 'combat/shove', ...U, targetId: p.targetId };
    case 'analyze': return { type: 'combat/analyze', ...U, targetId: p.targetId };
    case 'cover': return { type: 'combat/shoot-cover', ...U, tile: p.tile };
    case 'cover-off': return { type: 'combat/shoot-cover', ...U, tile: p.tile, hand: 'off' }; case 'clear-off': return { type: 'combat/clear', ...U, hand: 'off' }; // (added 12 Nov 2026: the off-hand weapon's own)
    case 'door': return { type: 'combat/door', ...U, tile: p.tile };
    case 'pickup': return { type: 'combat/pickup', ...U, tile: p.tile, ...(p.take ? { take: p.take } : {}) };
    case 'stim': return { type: 'combat/stim', ...U, targetId: p.targetId };
    case 'paired': return { type: 'combat/paired', ...U, targetId: p.targetId };
    case 'skill': return { type: 'combat/skill', ...U, targetId: p.targetId };
    case 'shot': case 'aimed': case 'melee': case 'burst': case 'auto': return { type: 'combat/attack', ...U, targetId: p.targetId, mode: id, ...mods };
    case 'draw': return { type: 'combat/draw', ...U, word: p.word, tile: p.tile, ...(p.stroke ? { stroke: p.stroke } : {}) };
    case 'outburst': return p.mode === 'snap' ? { type: 'combat/outburst', ...U, design: p.design, aim: p.aim || u.pos, hold: false, ...mods } : { type: 'combat/outburst', ...U, design: p.design || u.mg.designs[0].id, hold: true, ...mods };
    case 'release': return { type: 'combat/release', ...U, aim: p.aim || undefined, ...mods };
    case 'pump': return { type: 'combat/pump', ...U, ...(p.feeling ? { feeling: p.feeling } : {}), ...mods };
    case 'heartwatch': return { type: 'combat/heartwatch', ...U, on: !(u.mg.held && u.mg.held.watch) };
    case 'hide': case 'extinguish': case 'escape': case 'recover': case 'prone': case 'repair': case 'song': case 'brace': case 'clear': case 'load':
    case 'scuff': case 'vent': case 'core': case 'syphon': case 'crystallise': case 'steady': case 'letgo': case 'feed': case 'revert': return { type: 'combat/' + id, ...U };
  }
  return null;
}
/** Fill every required pick with its first legal choice (a tile pick with no list: next to the unit, or the target's). */
function autoPicks(g: any, u: any, d: ActionDescriptor): Picks | null {
  const p: Picks = {};
  for (let i = 0; i < 6; i++) {
    const pv = previewDescriptor(g, u.id, d.id, p); const st = nextStep(d, p, { required: true });
    if (!st) return p;
    const live = pv?.next && pv.next.key === st.key ? pv.next : st;
    if (st.kind === 'custom') return null; // a bespoke panel (the Evoke planner): covered by its own tests
    if (st.kind === 'option') { const o = (live.options || []).find((x) => !x.why); if (!o) return null; p[st.key] = st.max && st.max > 1 ? [o.id] : o.id; continue; }
    if (st.kind === 'tile') { const c = live.choices?.[0] || (() => { const [x, y] = u.pos.split(',').map(Number); return (x + 1) + ',' + y; })(); p[st.key] = c; continue; }
    const c = (live.choices || []).find((id) => id !== p.targetId); if (!c) return null; p[st.key] = c;
  }
  return p;
}
const strip = (g: any) => JSON.stringify({ ...g, campaign: undefined });
/** Run both actions on the same state; both refuse with the same words, or both leave the same game. */
function same(g: any, a: any, b: any, by: string): 'ok' | 'refused' {
  const run = (x: any) => { try { return { g: apply(g, x, by) }; } catch (e: any) { if (e instanceof RuleError) return { err: e.message }; throw e; } };
  const A = run(a), B = run(b);
  expect(A.err ?? null).toBe(B.err ?? null);
  if (A.g) expect(strip(A.g)).toBe(strip(B.g));
  return A.g ? 'ok' : 'refused';
}

/** [name, the character, the foes, a set-up on the fight before the list is read] */
const BUILDS: [string, CharSpec, any[], ((f: any, u: any) => void)?][] = [
  ['gunner', { archetype: 'sharpshooter' }, [{ at: 'F6' }]],
  ['melee', { archetype: 'fencer', weapon: 'sabre' }, [{ at: 'C3' }]],
  ['sigils', { archetype: 'sigilist', kit: 'sigil' }, [{ at: 'F6' }]],
  ['soul', { archetype: 'stormcaller', kit: 'soul' }, [{ at: 'F6' }]],
  ['faith', { archetype: 'confessor' }, [{ at: 'F6' }]],
  ['voice', { archetype: 'captain' }, [{ at: 'F6' }]],
  ['two', { archetype: 'brawler' }, [{ at: 'C3' }]],
  ['class moves', { archetype: 'bulwark', classId: 'defender', level: 12, attrs: { durability: 8 } }, [{ at: 'C3' }]],
  ['class moves II', { archetype: 'captain', classId: 'bard', level: 12, attrs: { expression: 8 } }, [{ at: 'F6' }]],
  ['holding', { archetype: 'stormcaller', kit: 'soul' }, [{ at: 'F6' }], (f, u) => { f.act({ type: 'combat/outburst', unitId: u.id, design: u.mg.designs[0].id, hold: true }); }],
  ['spent', { archetype: 'sharpshooter' }, [{ at: 'F6' }], (f, u) => { const v = f.unit(u.id); v.ammo = 1; v.jammed = true; }],
  ['two guns', { archetype: 'deadeye', weapon: 'service_pistol' }, [{ at: 'F6' }], (f, u) => { const v = f.unit(u.id); v.offWeapon = 'service_pistol'; v.offAmmo = 3; v.ammo = 2; }],
];

describe('actionsFor: every action, through one door', () => {
  for (const [name, spec, foes, setup] of BUILDS) it(name + ': each legal descriptor sends what the old Confirm sent', () => {
    const f = fightWith(name === 'two' ? [spec, { archetype: 'field_medic' }] : [spec], foes); let u = f.turn(f.pc);
    if (setup) { setup(f, u); u = f.unit(u.id); }
    const g = f.g;
    const list = actionsFor(g, u.id, 'host');
    expect(list.length).toBeGreaterThan(8);
    expect(new Set(list.map((d) => d.id)).size).toBe(list.length); // one id, one action
    const tally = { ok: 0, refused: 0, skipped: 0 };
    for (const d of list) {
      if (d.pad) { expect(sendDescriptor(g, u.id, d.id, {})).toBeNull(); continue; }
      if (!d.available) { tally.skipped++; continue; }
      const p = autoPicks(g, u, d); if (!p) { tally.skipped++; continue; }
      const a = sendDescriptor(g, u.id, d.id, p, 'host'); expect(a, d.id).toBeTruthy();
      const old = oldAction(u, f.cb, d.id, p); expect(old, d.id).toBeTruthy();
      tally[same(g, a, old, 'host')]++;
    }
    expect(tally.ok, JSON.stringify(tally)).toBeGreaterThan(3);
  });

  it('the groups come in tab order and every row prints a cost', () => {
    const f = fightWith([{ archetype: 'sharpshooter' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    const list = actionsFor(f.g, u.id, 'host'), order = ['move', 'attack', 'utility', 'perks', 'class', 'sigils', 'outbursts', 'faith', 'calls'];
    const gs = list.map((d) => order.indexOf(d.group)); expect([...gs].sort((a, b) => a - b)).toEqual(gs);
    for (const d of list.filter((x) => !x.hidden && !x.pad)) expect(d.cost.text, d.id).toBeTruthy();
  });

  it('a move: its tiles are worked out when the pick comes up, and the click sends at once', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); const u = f.turn(f.pc);
    const pv = previewDescriptor(f.g, u.id, 'move', {})!;
    expect(pv.next!.key).toBe('tile'); expect(pv.next!.auto).toBe(true); expect(pv.next!.choices!.length).toBeGreaterThan(3);
    const to = pv.next!.choices![0], done = previewDescriptor(f.g, u.id, 'move', { tile: to })!;
    expect(done.ok).toBe(true); expect(done.action).toMatchObject({ type: 'combat/move', to, how: 'move' });
  });

  it('a shove at someone out of reach: the reducer\'s own refusal', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); const u = f.turn(f.pc);
    const pv = previewDescriptor(f.g, u.id, 'shove', { targetId: f.foe.id })!;
    expect(pv.ok).toBe(false); expect(pv.why).toBeTruthy(); expect(pv.action).toBeNull();
    expect(previewDescriptor(f.g, u.id, 'shove', {})!.ask).toBe('Click an adjacent enemy.');
  });

  it('a refused action asks for no pick: a second Whisper in a turn says why (the first full browser run, 12 Nov)', () => {
    const f = fightWith([{ archetype: 'confessor' }], [{ at: 'F6' }]); const u = f.turn(f.pc);
    const w = actionsFor(f.g, u.id, 'host').filter((d) => d.id.startsWith('pr:whisper:') && d.available && d.picks.some((st) => st.key === 'targetId'));
    expect(w.length).toBeGreaterThan(1);
    const first = autoPicks(f.g, u, w[0])!; f.act(sendDescriptor(f.g, u.id, w[0].id, first, 'host')!);
    const second = actionsFor(f.g, u.id, 'host').find((d) => d.id === w[1].id)!;
    expect(second.available).toBe(false); expect(second.why).toBe('One Whisper a turn.');
    const pv = previewDescriptor(f.g, u.id, second.id, {}, 'host')!;
    expect(pv.ok).toBe(false); expect(pv.why).toBe('One Whisper a turn.'); expect(pv.ask).toBeNull();
  });

  it('Order: the tile is asked only once MOVE is picked', () => {
    const d = { picks: [{ key: 'opt', kind: 'option' }, { key: 'tile', kind: 'tile', when: { key: 'opt', has: 'move' } }] } as any;
    expect(stepOn(d.picks[1], { opt: ['reload'] })).toBe(false); expect(stepOn(d.picks[1], { opt: ['move'] })).toBe(true); expect(stepOn(d.picks[1], { opt: 'reload+move' })).toBe(true);
  });

  it('a unit with a fixed action list gets only those', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); const u = f.turn(f.pc); (u as any).allowedActions = ['move', 'shot'];
    expect(actionsFor(f.g, u.id).map((d) => d.id).sort()).toEqual(['move', 'shot']);
  });
});

// The worked example of client-boundary-3-actions.md: a system defined only in the engine (here, in a test) is listed,
// previewed and sent with no other code. apps/web/src/screens/combat-actions.test.ts puts the same one on the screen.
describe('registerActions: a new system with no client change', () => {
  it('appears in its group, asks for its pick, previews through the reducer and sends', () => {
    const off = registerActions({
      id: 'test-taunt',
      list: (x) => x.u.side === 'pc' ? [{ id: 'test:taunt', group: 'utility', name: 'Taunt', text: 'Read the enemy you name (an Analyze, for the test).', cost: { ap: 2, text: '2 AP' }, available: true, why: null,
        picks: [{ key: 'targetId', kind: 'enemy', prompt: 'Click an enemy to taunt.', choices: x.seen.units.filter((v) => v.side === 'foe' && !v.dead).map((v) => v.id) }], toggleOn: null, preview: 'basic' }] : [],
      send: (x, _d, p) => ({ type: 'combat/analyze', unitId: x.u.id, targetId: p.targetId }) as any,
    });
    try {
      const f = fightWith([{}], [{ at: 'F6' }]); const u = f.turn(f.pc);
      const d = actionsFor(f.g, u.id).find((x) => x.id === 'test:taunt')!;
      expect(d.group).toBe('utility');
      expect(previewDescriptor(f.g, u.id, d.id, {})!.ask).toBe('Click an enemy to taunt.');
      const pv = previewDescriptor(f.g, u.id, d.id, { targetId: f.foe.id })!;
      expect(pv.action).toMatchObject({ type: 'combat/analyze', targetId: f.foe.id });
      const g2 = apply(f.g, sendDescriptor(f.g, u.id, d.id, { targetId: f.foe.id })!, 'host');
      expect(g2.combat!.units.find((v) => v.id === f.foe.id)!.analyzedBy).toBeTruthy();
    } finally { off(); }
  });
});
