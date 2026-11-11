// Rules 1.14, "The engine takes everything it can, first step": the adversarial review (spec items 1112 to 1116).
// The cooldown is tried the ways a player would try to beat it, through the real reducer and real turns (end-turn,
// the enemies' turns, a save and a reload, a second fight, the Proving Ground's tools); the six small fixes are
// checked where the card and the game could still disagree.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import perksJ from '../../../data/perks.json';
import { apply, newGame, applyCond, applyDamage, hide, moveUnit, d20, condOn, type Unit, type Combat } from '../src';
import { fightWith, storyWith, withGame, sheetOf, rng } from './helpers/perkfight';

type S = ReturnType<typeof storyWith>;
const PERKS: any[] = (perksJ as any).items, perkOf = (id: string) => PERKS.find((p) => p.id === id);
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
function storyCheck(s: S, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.filter((k: any) => !k.roll).at(-1)!; s.g.rng = rngFor(10) as any;
  s.act({ type: 'check/roll', checkId: ck.id });
}
/** Enemies that can't hit (attack −30), so a fight can run for many real rounds. */
const HARMLESS = { hp: 60, defense: 12, attack_bonus: -30, armour: 5 };
const startFight = (s: S, foes: { at?: string; name?: string; kind?: string; tier?: string }[]) => s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard',
  enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: 'service_pistol', at: f.at || '', ...(f.kind ? { kind: f.kind } : {}), fixed: HARMLESS })) } } } as any);
const cbOf = (s: S): Combat => s.g.combat!;
const active = (s: S): Unit => cbOf(s).units.find((u) => u.id === cbOf(s).order[cbOf(s).turn])!;
const unitOf = (s: S, charId: string): Unit => cbOf(s).units.find((u) => u.charId === charId)!;
const endTurn = (s: S) => { const a = active(s); for (const u of cbOf(s).units) if (u.side === 'pc') u.hp = u.maxHp; s.act({ type: 'combat/end-turn', unitId: a.id } as any, s.g.characters[a.charId!].owner); };
/** Play real turns until the fight has reached `rounds`; returns the holder's AP at the start of each of its turns. */
function playRounds(s: S, charId: string, rounds: number, each?: (round: number, me: Unit) => void): number[] {
  const aps: number[] = [];
  for (let guard = 0; guard < 80 && s.g.combat && !s.g.combat.over; guard++) {
    const a = active(s); if (a.side !== 'pc') throw new Error('an enemy is waiting to act');
    if (a.charId === charId) { if (cbOf(s).round > rounds) break; aps.push(a.ap); each?.(cbOf(s).round, a); }
    endTurn(s);
  }
  return aps;
}

// ============================================================================================ the cooldown, attacked
describe('the AP perks\' cooldown holds through real turns', () => {
  it('Talks Broke Down: +2 AP on turns 1, 4 and 7 over eight real rounds, a squadmate\'s talk counts, and a save and reload in the middle changes nothing', () => {
    const s = storyWith([{ perks: { talks_broke_down: 'I' } }, {}]), me = s.chars[0].id;
    storyCheck(s, s.chars[1].id, ['charisma'], { auto: 'success' }); // the squadmate talks, not the holder
    startFight(s, [{ at: 'P6' }]);
    const aps = playRounds(s, me, 8, (round) => { if (round === 2 || round === 5) s.g = JSON.parse(JSON.stringify(s.g)); });
    expect(aps).toEqual([8, 6, 6, 8, 6, 6, 8, 6]);
  });
  it('a lost talk (Tier I): 2 AP less on turns 1, 4 and 7, not on the turns between', () => {
    const s = storyWith([{ perks: { talks_broke_down: 'I' } }]), me = s.chars[0].id;
    storyCheck(s, me, ['charisma'], { auto: 'fail' }); startFight(s, [{ at: 'P6' }]);
    expect(playRounds(s, me, 7)).toEqual([4, 6, 6, 4, 6, 6, 4]);
  });
  it('a new fight starts with the cooldown ready; inside one fight it never comes back early', () => {
    const s = storyWith([{ traits: ['forlorn_hope'] }]), me = s.chars[0].id;
    const closeIn = (_r: number, u: Unit) => { // one step toward the enemy, every turn
      const foe = cbOf(s).units.find((x) => x.side === 'foe')!, [x, y] = u.pos.split(',').map(Number), [fx, fy] = foe.pos.split(',').map(Number);
      for (const to of [(x + Math.sign(fx - x)) + ',' + (y + Math.sign(fy - y)), (x + Math.sign(fx - x)) + ',' + y, x + ',' + (y + Math.sign(fy - y))]) { try { s.act({ type: 'combat/move', unitId: u.id, to } as any); return; } catch { /* that tile is blocked: try the next */ } }
    };
    startFight(s, [{ at: 'P10' }]); open(cbOf(s));
    expect(playRounds(s, me, 5, closeIn)).toEqual([6, 8, 6, 6, 8]);
    // The fight ends on turn 5 with the bonus just spent; the next fight pays on its turn 2 again.
    for (const u of cbOf(s).units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    endTurn(s); expect(s.g.phase).not.toBe('combat');
    s.act({ type: 'narrator/turn', turn: { narration: 'On.' } } as any);
    startFight(s, [{ at: 'P10' }]); open(cbOf(s));
    expect(unitOf(s, me).ps?.['trait:forlorn_hope']?.cd).toBeUndefined();
    expect(playRounds(s, me, 3, closeIn)).toEqual([6, 8, 6]);
  });
  it('two holders in one squad: each has its own cooldown, and neither lends the other a turn', () => {
    const s = storyWith([{ perks: { talks_broke_down: 'I' } }, { perks: { talks_broke_down: 'I' } }]), [a, b] = s.chars.map((c) => c.id);
    storyCheck(s, a, ['charisma'], { auto: 'success' }); startFight(s, [{ at: 'P6' }]);
    const seen: Record<string, number[]> = { [a]: [], [b]: [] };
    for (let guard = 0; guard < 40 && cbOf(s).round <= 4; guard++) { const u = active(s); seen[u.charId!].push(u.ap); endTurn(s); }
    expect(seen[a].slice(0, 4)).toEqual([8, 6, 6, 8]); expect(seen[b].slice(0, 4)).toEqual([8, 6, 6, 8]);
  });
  it('Got You in My Sight on an enemy\'s turn: banked once if your turn is still to come, nothing if it is over, and the next one waits 3 turns', () => {
    const f = fightWith([{ perks: { got_you_in_my_sight: 'I' } }], [{ at: 'F4', classic: true }, { at: 'F6', classic: true }, { at: 'F8', classic: true }]);
    const [x, y, z] = f.foes, me = f.pc.id;
    // Round 1, the enemies act before the holder: two of them hide. One bank of 2 AP, not two.
    f.cb.order = [x.id, y.id, z.id, me]; f.cb.turn = 0; f.cb.round = 1;
    withGame(f.g, () => { hide(f.cb, f.unit(x.id)); f.cb.turn = 1; hide(f.cb, f.unit(y.id)); });
    expect(f.unit(me).apNext).toBe(2);
    expect(f.turn(me).ap).toBe(8);
    // Round 2, the enemy hides before the holder's turn again: nothing (turn 2 of the cooldown). Round 3 the same.
    for (const r of [2, 3]) { f.cb.round = r; f.cb.turn = 2; f.unit(z.id).hidden = false; withGame(f.g, () => hide(f.cb, f.unit(z.id))); expect(f.unit(me).apNext || 0).toBe(0); expect(f.turn(me).ap).toBe(6); }
    // Round 4, after the holder's turn: its turn this round is over, so nothing, and the cooldown is not spent on it.
    f.cb.order = [me, x.id, y.id, z.id]; f.cb.round = 4; f.turn(me); f.cb.turn = 3; f.unit(z.id).hidden = false; withGame(f.g, () => hide(f.cb, f.unit(z.id)));
    expect(f.unit(me).apNext || 0).toBe(0);
    // Round 5, on the holder's own turn: ready (the last one landed on turn 1).
    f.cb.round = 5; const u = f.turn(me), before = u.ap; f.unit(x.id).hidden = false; withGame(f.g, () => hide(f.cb, f.unit(x.id)));
    expect(f.unit(me).ap - before).toBe(2);
  });
  it('Vengeful: two allies Downed in one enemy turn pay once; the AP that lands next turn starts the 3 turns', () => {
    const f = fightWith([{ traits: ['rabbits_foot'] }, {}, {}, {}], [{ at: 'P6', classic: true }]); const [me, a, b, c] = f.pcs, foe = f.foe;
    const down = (v: Unit) => withGame(f.g, () => applyDamage(f.cb, f.unit(v.id), 99999, { type: 'weapon', by: f.unit(foe.id) }));
    f.cb.order = [me.id, a.id, b.id, c.id, foe.id]; f.cb.round = 1; f.turn(me); f.cb.turn = 4; // the enemy's turn, after the holder's
    down(a); down(b);
    f.cb.round = 2; expect(f.turn(me).ap).toBe(8);
    f.cb.turn = 4; down(c); // round 2: would land on turn 3, one turn after the last
    f.cb.round = 3; expect(f.turn(me).ap).toBe(6);
  });
  it('the Proving Ground: giving a perk in the middle of a fight does not reset a running cooldown', () => {
    let g = newGame('PROVE1', { id: 'h1', name: 'Host' }, 'seed-proving');
    g = apply(g, { type: 'char/add', sheet: sheetOf({ name: 'Vel' }) }, 'h1');
    g = apply(g, { type: 'sandbox/start' } as any, 'h1');
    const c = Object.values(g.characters)[0];
    g = apply(g, { type: 'sandbox/trait', charId: c.id, trait: 'rabbits_foot', on: true } as any, 'h1');
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    const pc = () => g.combat!.units.find((u) => u.side === 'pc')!;
    (pc().ps ||= {})['trait:rabbits_foot'] = { cd: { gain: g.combat!.round } };
    g = apply(g, { type: 'sandbox/perk', charId: c.id, perk: 'bulwark', tier: 'I' } as any, 'h1');
    expect(pc().ps?.['trait:rabbits_foot']?.cd).toEqual({ gain: g.combat!.round });
  });
  it('an old save (a fight saved before the cooldown existed): the perk is simply ready, then cools down', () => {
    const s = storyWith([{ perks: { talks_broke_down: 'I' } }]), me = s.chars[0].id;
    storyCheck(s, me, ['charisma'], { auto: 'success' }); startFight(s, [{ at: 'P6' }]);
    const aps = playRounds(s, me, 5, (round, u) => { if (round === 2) { delete u.ps!['perk:talks_broke_down'].cd; s.g = JSON.parse(JSON.stringify(s.g)); } });
    // Turn 1 +2 (as every turn was, before). The save is opened on turn 2 with no cooldown stored: turn 3 pays, then 4 and 5 wait.
    expect(aps).toEqual([8, 6, 8, 6, 6]);
  });
});

// ============================================================================================ the cards, checked again
describe('the cards say what the game does', () => {
  it('Grim Reaper II: the Fear comes with a kill on your own turn, every time, and the card says so', () => {
    expect(perkOf('grim_reaper').tiers.II.text).toMatch(/on your own turn, you gain 2 AP\. Once every 3 turns\. Each time you do, every enemy who sees it makes a Heart save/);
    expect(perkOf('grim_reaper').text).not.toMatch(/a kill of yours/);
    const f = fightWith([{ perks: { grim_reaper: 'II' }, skills: { intimidation: 10 } }], [{ at: 'F4', classic: true }, { at: 'F5', classic: true }, { at: 'F6', classic: true }]); open(f.cb);
    f.turn(f.pc); f.pc.attack = 60; f.pc.ammo = 9;
    for (const v of f.foes) v.sv = { body: -50, brain: -50, heart: -50 } as any;
    const [a, b, c] = f.foes; a.hp = 1; b.hp = 1;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: a.id, mode: 'shot' } as any);
    f.unit(c.id).conds = {};
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: b.id, mode: 'shot' } as any); // the second kill: no AP (the cooldown), the Fear all the same
    expect(f.unit(a.id).dead && f.unit(b.id).dead).toBe(true);
    expect(condOn(f.unit(c.id), 'fear')).toBe(true);
    expect(f.cb.log.filter((l) => /\+2 AP \(Grim Reaper\)/.test(l)).length).toBe(1);
  });
  it('The Name They Whisper: a hybrid card names the judgement that is left (who is a stranger)', () => {
    expect(perkOf('the_name_they_whisper').adjudication).toBe('hybrid');
    expect(perkOf('the_name_they_whisper').text).toMatch(/Only a stranger is spared: the Narrator says who has never heard of you\./);
  });
  it('True Name: a being Analyzed on the area map counts as Analyzed in the fight the Narrator then starts', () => {
    const s = storyWith([{ perks: { true_name: 'mastered' }, skills: { analysis: 5 } }, {}]), me = s.chars[0];
    (s.g.story as any).npcs = [
      { id: 'n1', name: 'The Hollow Saint', side: 'hostile', tier: 'elite', weapon: 'fists', pos: '6,5', kind: 'upper_realm' },
      { id: 'n2', name: 'The Drowned Bell', side: 'hostile', tier: 'elite', weapon: 'fists', pos: '7,7', kind: 'upper_realm' }];
    (s.g.story as any).positions = { ...(s.g.story as any).positions, [me.id]: '4,5' };
    s.act({ type: 'world/act', charId: me.id, act: 'analyze', targetId: 'n1' } as any);
    expect((s.g.story as any).npcs.find((n: any) => n.id === 'n1').analyzed).toBe(true);
    startFight(s, [{ name: 'The Hollow Saint', tier: 'elite', kind: 'upper_realm' }, { name: 'The Drowned Bell', tier: 'elite', kind: 'upper_realm' }]);
    const cb = cbOf(s), u = unitOf(s, me.id), saint = cb.units.find((x) => x.name === 'The Hollow Saint')!, bell = cb.units.find((x) => x.name === 'The Drowned Bell')!;
    cb.turn = cb.order.indexOf(u.id);
    expect(() => s.act({ type: 'combat/perk', unitId: u.id, id: 'true_name', targetId: bell.id } as any)).toThrow(/Analyze it first/);
    s.act({ type: 'combat/perk', unitId: u.id, id: 'true_name', targetId: saint.id } as any);
    expect(cbOf(s).log.some((l) => /speaks the true name of The Hollow Saint/.test(l))).toBe(true);
  });
  it('True Name: the card and both buttons say the being must have been Analyzed', () => {
    expect(perkOf('true_name').text).toMatch(/It must have been Analyzed first\./);
    expect(perkOf('true_name').adjudication).toBe('hybrid');
  });
  it('no card of this step uses a word a player does not know', () => {
    for (const id of ['grim_reaper', 'got_you_in_my_sight', 'overruled', 'talks_broke_down', 'sweet_talker', 'war_footing', 'crowd_pleaser', 'old_tongue', 'the_name_they_whisper', 'true_name', 'verse_of_war'])
      expect(perkOf(id).text, id).not.toMatch(/provisional|engine|revision|cooldown|item \d|\.json|\.ts\b|label|traitState/i);
  });
});
