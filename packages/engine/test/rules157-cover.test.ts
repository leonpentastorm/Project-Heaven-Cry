// Rules 1.61 (0.30), cover beside you, the shot that shows, focus memory (Core Rules items 4960 to 4969;
// docs/design/proposals/2026-11-party-fit.md section 14). Each through the reducer or the enemy's real turn:
//   cover beside you   a pillar beside the target on the side facing the shooter (the line misses it) takes the full
//                      cover's term off the shot, for a character's shot and an enemy's alike; a diagonal one counts
//                      as half; the screen's word (tileCover) is the same function's answer
//   the shot that shows a foe that fires from beyond the squad's sight is seen until its next turn starts; the log
//                      names it; a Hidden unit is left to Shadow
//   focus memory       an Elite (focus doctrine) turns off a target its side already attacked this round; never off
//                      a Taunter, nor off a target at or under the finishing share
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ENEMY, RULES, COVER, coverFor, tileCover, enemyIntent, enemyTurn, noteEnemyAim, lineOfSight, previewAttack, visibility, applyCond, type Unit } from '../src';
import { makeObject } from '../src/objects';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame, type FoeSpec } from './helpers/perkfight';

const RIFLE = 'hellraiser_service_rifle';
function rig(foes: FoeSpec[], o: { plain?: boolean } = {}) {
  const f = fightWith([{ name: 'Ada', weapon: RIFLE }, { name: 'Bo', weapon: RIFLE }], foes.map((q) => ({ weapon: RIFLE, ...q })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = [];
  const at = ['5,4', '5,6']; f.pcs.forEach((p, i) => { p.pos = at[i]; });
  const col = ['11,5', '11,4', '11,6', '11,3']; f.foes.forEach((e, i) => { e.pos = col[i]; });
  for (const x of cb.units) { x.hp = x.maxHp = 200; x.armour = 0; x.shield = 0; x.hidden = false; x.ap = 6; }
  delete cb.fire; delete cb.doctrineSaid;
  if (o.plain) for (const e of f.foes) { e.techs = []; e.calls = []; }
  return f;
}
type F = ReturnType<typeof rig>;
const G = <T>(f: F, fn: () => T) => withGame(f.g, fn);
const pc = (f: F, name: string) => f.pcs.find((p) => p.name === name)!;
const aim = (f: F, e: Unit) => G(f, () => { const it = enemyIntent(f.cb, e); return { who: it.targetId ? f.unit(it.targetId).name : null, why: it.why || null }; });
const put = (f: F, kind: 'pillar' | 'crate', k: string) => { f.cb.objects = [...(f.cb.objects || []), makeObject('c' + k.replace(',', '_'), kind, k)]; };

describe('rules 1.61: cover beside you counts on the side facing the shooter', () => {
  it('reads its numbers from rules.json', () => {
    const c = RULES.combat.attack.cover;
    expect(COVER).toEqual({ half: -c.half.to_hit, full: -c.full.to_hit, arc: c.facing.arc_deg, diagonal: c.facing.diagonal });
  });
  // Ada at 10,12 with a pillar on her right (11,12); the shooter up and to the right at 16,8, inside the 45-degree arc.
  const stage = (f: F) => { const a = pc(f, 'Ada'), b = pc(f, 'Bo'); a.pos = '10,12'; b.pos = '0,0'; f.foe.pos = '16,8'; put(f, 'pillar', '11,12'); return a; };
  it('a pillar beside the target that the line misses: full cover on the enemy\'s preview, its roll and the screen word', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }), a = stage(f);
    G(f, () => {
      expect(lineOfSight(f.cb, f.foe.pos, a.pos), 'the line misses the pillar').toBe(true);
      expect(coverFor(f.cb, f.foe.pos, a.pos)).toEqual({ tile: '11,12', grade: 'full', mod: COVER.full });
      const pv = previewAttack(f.cb, f.foe, a, 'shot'); expect(pv.why || 'ok').toBe('ok'); expect(pv.cover).toBe(COVER.full); expect(pv.terms!.some((t: any) => t.label === 'full cover' && t.v === -COVER.full)).toBe(true);
      const w = tileCover(f.cb, a.pos, 'pc', f.foe.id); expect(w).toMatchObject({ grade: 'full', mod: COVER.full, foeId: f.foe.id });
      const nearest = tileCover(f.cb, a.pos, 'pc', null, new Set([f.foe.id])); expect(nearest).toMatchObject({ grade: 'full' });
    });
    const open = G(f, () => { const was = f.cb.objects; f.cb.objects = []; const p = previewAttack(f.cb, f.foe, a, 'shot'); f.cb.objects = was; return p.toHit; });
    const needs: number[] = []; let on = true; onHook('attack_roll', (ctx: any) => { if (on && ctx.tgt?.id === a.id) needs.push(ctx.toHit); });
    try { f.cb.turn = f.cb.order.indexOf(f.foe.id); f.foe.ap = 6; G(f, () => enemyTurn(f.cb, { state: 7 })); } finally { on = false; }
    expect(needs.length, 'the Soldier fires').toBeGreaterThan(0);
    expect(needs[0], 'its roll takes the full cover\'s term').toBe(open - COVER.full);
  });
  it('the same for a character\'s shot at an enemy (the reducer\'s attack)', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); const a = pc(f, 'Ada'); a.pos = '16,8'; pc(f, 'Bo').pos = '0,0'; f.foe.pos = '10,12'; put(f, 'pillar', '11,12');
    f.turn(a); const n = f.cb.log.length;
    f.act({ type: 'combat/attack', unitId: a.id, targetId: f.foe.id, mode: 'shot' } as any);
    const line = f.cb.log.slice(n).map((x: any) => (typeof x === 'string' ? x : x.text)).find((t: string) => /fires at/.test(t)) || '';
    expect(line).toContain('(incl. −' + COVER.full + ' cover)');
  });
  it('a pillar on the diagonal facing the shooter counts as half cover; one on the far side counts nothing', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); const a = pc(f, 'Ada'); a.pos = '10,12'; pc(f, 'Bo').pos = '0,0'; f.foe.pos = '16,12';
    put(f, 'pillar', '11,11');
    G(f, () => { expect(coverFor(f.cb, f.foe.pos, a.pos)).toMatchObject({ tile: '11,11', grade: COVER.diagonal }); expect(previewAttack(f.cb, f.foe, a, 'shot').cover).toBe(COVER[COVER.diagonal]); });
    f.cb.objects = []; put(f, 'pillar', '9,12');
    G(f, () => { expect(coverFor(f.cb, f.foe.pos, a.pos)).toBeNull(); expect(tileCover(f.cb, a.pos, 'pc', f.foe.id)).toMatchObject({ grade: 'none' }); });
  });
  it('a pillar on the line blocks the shot, and the screen says so', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); const a = pc(f, 'Ada'); a.pos = '10,12'; pc(f, 'Bo').pos = '0,0'; f.foe.pos = '16,12'; put(f, 'pillar', '11,12');
    G(f, () => { expect(previewAttack(f.cb, f.foe, a, 'shot').ok).toBe(false); expect(tileCover(f.cb, a.pos, 'pc', f.foe.id)).toMatchObject({ grade: 'blocked' }); });
  });
});

describe('rules 1.61: a unit that attacks is seen until its next turn', () => {
  it('a Soldier that fires from beyond the squad\'s sight is drawn, named in the log, and hidden again when its turn starts', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); const a = pc(f, 'Ada'), b = pc(f, 'Bo'); a.pos = '3,5'; b.pos = '2,5'; f.foe.pos = '12,5';
    for (const p of f.pcs) p.vision = 5;
    G(f, () => expect(visibility(f.cb, 'pc').seen.has(f.foe.id), 'out of the squad\'s Vision').toBe(false));
    const n = f.cb.log.length; f.cb.turn = f.cb.order.indexOf(f.foe.id); f.foe.ap = 6; G(f, () => enemyTurn(f.cb, { state: 7 }));
    const said = f.cb.log.slice(n).map((x: any) => (typeof x === 'string' ? x : x.text)).join('\n');
    expect(said).toMatch(/fires at|Burst|Suppress/);
    expect(said).toContain('gives itself away');
    G(f, () => expect(visibility(f.cb, 'pc').seen.has(f.foe.id), 'seen after its shot').toBe(true));
    f.turn(f.foe);
    G(f, () => expect(visibility(f.cb, 'pc').seen.has(f.foe.id), 'its own next turn: back in the fog').toBe(false));
  });
  it('a Hidden unit is left to Shadow: shown or not, it is not seen while Hidden', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); const a = pc(f, 'Ada'); a.pos = '3,5'; pc(f, 'Bo').pos = '2,5'; f.foe.pos = '12,5';
    for (const p of f.pcs) p.vision = 5;
    f.foe.hidden = true; f.foe.shownTo = 'pc';
    G(f, () => expect(visibility(f.cb, 'pc').seen.has(f.foe.id)).toBe(false));
  });
});

describe('rules 1.61: focus memory (the one doctrine)', () => {
  // Ada nearer the Elites (3 tiles) and the likelier hit; Bo 5 tiles off.
  const near = (f: F) => { pc(f, 'Ada').pos = '8,4'; pc(f, 'Bo').pos = '6,6'; };
  it('the second Elite turns off the target its side already attacked, and says why', () => {
    const f = rig([{ tier: 'elite' }, { tier: 'elite' }], { plain: true }), [e1, e2] = f.foes; near(f);
    expect(aim(f, e2).who, 'before anyone fires').toBe('Ada');
    G(f, () => noteEnemyAim(f.cb, e1, pc(f, 'Ada')));
    expect(aim(f, e2)).toEqual({ who: 'Bo', why: 'spread' });
    const was = (ENEMY.elite as any).focus_memory; (ENEMY.elite as any).focus_memory = 0;
    try { expect(aim(f, e2).who, 'a tier row overrides the default: 0 gangs up').toBe('Ada'); } finally { if (was === undefined) delete (ENEMY.elite as any).focus_memory; else (ENEMY.elite as any).focus_memory = was; }
  });
  it('a nearly finished target is still finished off', () => {
    const f = rig([{ tier: 'elite' }, { tier: 'elite' }], { plain: true }), [e1, e2] = f.foes; near(f);
    pc(f, 'Ada').hp = Math.floor(RULES.combat.focus_memory.finish_share * pc(f, 'Ada').maxHp);
    G(f, () => noteEnemyAim(f.cb, e1, pc(f, 'Ada')));
    expect(aim(f, e2).who).toBe('Ada');
  });
  it('a Taunt always wins', () => {
    const f = rig([{ tier: 'elite' }, { tier: 'elite' }], { plain: true }), [e1, e2] = f.foes; near(f);
    G(f, () => { noteEnemyAim(f.cb, e1, pc(f, 'Ada')); applyCond(f.cb, { state: 3 } as any, pc(f, 'Ada'), e2, 'taunted', 1, undefined, { skipSave: true }); });
    expect(aim(f, e2).who).toBe('Ada');
  });
});
