// Physical 2.0 on screen (rules 1.12; game/techView.ts, fx/physical.ts, screens/armsTab.js): the Attack tab's weapon
// blocks and pads, the picked technique's preview in words, Pressure pips and Watches, the effects' words, the ARMS
// tab's values. Built on real fights through the engine (the lead's physFight helper); the screen works out no number.
import { describe, expect, it, vi } from 'vitest';
import { phys } from '@engine';
import { physFight, rig } from '../../../../packages/engine/test/helpers/physfight';
import { weaponBlocks, blockItems, padView, padOf, parseTech, techAction, padAction, TWATCH, techPreview, previewLines, techPrompt, pressureLook, physLines, physChips, watchMarks, lineTiles, physOf, legacyAttack, isTechId } from './techView';
import { physWord, physBeat, isBigTechnique } from './fx/physical';

vi.mock('./store', () => ({ act: () => {}, toast: () => {}, getState: () => ({}) }));
const { armsTabVals } = await import('../screens/armsTab.js');

describe('the Attack tab as weapon blocks (part 2)', () => {
  it('ids: a technique, a pad row, Hold a shot; parsed back', () => {
    expect(techAction('off', 'lunge')).toBe('tq:off:lunge');
    expect(parseTech('tq:main:cut')).toEqual({ hand: 'main', id: 'cut' });
    expect(parseTech('shot')).toBeNull(); expect(parseTech('tq:left:cut')).toBeNull();
    expect(padOf(padAction('main'))).toEqual({ kind: 'tech', hand: 'main' }); expect(padOf(TWATCH)).toEqual({ kind: 'watch' }); expect(padOf('move')).toBeNull();
    expect(isTechId('tpad:off')).toBe(true); expect(isTechId('shot')).toBe(false);
    expect(legacyAttack('aimed', false)).toBe('plain:main'); expect(legacyAttack('overwatch', false)).toBe(TWATCH); expect(legacyAttack('reload', false)).toBeNull();
  });
  it('a blade in the main hand and a pistol in the off hand: two blocks, main first, each with its plain attack and its pad', () => {
    const f = physFight([{ weapon: 'combat_knife', off: 'service_pistol', known: ['lunge', 'suppress'] }], [{ at: 'D5' }]);
    f.put(f.pc, 'C5'); f.turn(f.pc);
    const B = f.bound(() => weaponBlocks(f.g, f.cb, f.unit(f.pc.id)));
    expect(B.map((b) => [b.hand, b.weaponId, b.system])).toEqual([['main', 'combat_knife', 'melee'], ['off', 'service_pistol', 'ranged']]);
    expect(B[0].plain).toMatchObject({ id: 'cut', name: 'Cut' }); expect(B[1].plain).toMatchObject({ id: 'shot', name: 'Shot' });
    // the pads hold the rest, by group; Cut and Shot are rows, never chips; Watches are in Hold a shot, not the pad
    expect(B[0].groups.flatMap((gr) => gr.chips.map((c) => c.id))).toContain('lunge');
    expect(B[0].groups.flatMap((gr) => gr.chips.map((c) => c.id))).not.toContain('cut');
    expect(B[1].groups.flatMap((gr) => gr.chips.map((c) => c.id))).toContain('suppress');
    expect(B[1].groups.some((gr) => gr.key === 'watch')).toBe(false); expect(B[1].watch.map((c) => c.id)).toContain('overwatch');
    // the knife's signature (Coup) is lent: marked, and greyed with the engine's reason (no Momentum yet)
    const coup = B[0].groups.flatMap((gr) => gr.chips).find((c) => c.id === 'coup')!;
    expect(coup).toMatchObject({ lent: true, mark: '◇', ok: false }); expect(coup.why).toMatch(/Momentum/);
    // the meter: Momentum pips for the blade, rounds and Heat for the pistol
    expect(B[0].pips.length).toBe(B[0].pips.length && phys.PHYS_RULES.momentum.max); expect(B[1].meter).toMatch(/loaded/);
    // the rows: both blocks' plain attacks and pads, then Hold a shot
    expect(blockItems(B).map((x) => x[0])).toEqual(['tq:main:cut', 'tpad:main', 'tq:off:shot', 'tpad:off', 'twatch']);
    expect(blockItems(B)[1][1]).toBe('Techniques · ' + B[0].usable);
  });
  it('the pad: one at a time, a weapon\'s groups or the Watches; the picked chip is pressed', () => {
    const f = physFight([{ weapon: 'combat_knife', off: 'service_pistol', known: ['lunge'] }], [{ at: 'D5' }]);
    f.turn(f.pc);
    const B = f.bound(() => weaponBlocks(f.g, f.cb, f.unit(f.pc.id)));
    const pm = padView(B, padOf('tpad:main'), { hand: 'main', id: 'lunge' })!;
    expect(pm.key).toBe('tpad:main'); expect(pm.groups.flatMap((gr) => gr.chips).find((c) => c.id === 'lunge')).toMatchObject({ pressed: true, action: 'tq:main:lunge' });
    const pw = padView(B, padOf(TWATCH), null)!;
    expect(pw.groups[0].chips.map((c) => c.action)).toContain('tq:off:overwatch');
    expect(padView(B, null, null)).toBeNull();
  });
  it('the picked technique: what to click next, then the engine\'s preview in words (odds, Momentum)', () => {
    const f = physFight([{ weapon: 'combat_knife', known: ['lunge'] }], [{ at: 'D5' }]);
    f.put(f.pc, 'B5'); f.turn(f.pc);
    expect(techPrompt('lunge', {})).toBe('Click an enemy on the map.'); expect(techPrompt('deny', {})).toBe('Click a tile on the map.'); expect(techPrompt('cover_me', {})).toBe('Click an ally on the map.');
    expect(techPrompt('lunge', { target: f.foe })).toBeNull();
    const pv = f.bound(() => techPreview(f.g, f.cb, f.unit(f.pc.id), { hand: 'main', id: 'lunge' }, { targetId: f.foe.id }))!;
    const L = previewLines(f.cb, pv);
    if (pv.ok) { expect(L.odds[0]).toMatch(/: hit \d+% · need \d+/); expect(L.meters.join(' ')).toMatch(/^Momentum \d+ → \d+/); }
    else expect(pv.why).toBeTruthy();
  });
});

describe('Pressure, Watches and Stopped (part 3)', () => {
  it('pips over a token: filled to its Pressure, the state word and its cost for the hover card', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['suppress'] }], [{ at: 'H5' }]);
    expect(pressureLook(physOf(f.g, f.cb, f.unit(f.foe.id))).has).toBe(false);
    f.press(f.foe, 2, f.pc);
    const look = pressureLook(physOf(f.g, f.cb, f.unit(f.foe.id)));
    expect(look.has).toBe(true); expect(look.pips.filter((p) => /background: #/.test(p.style)).length).toBe(2);
    expect(look.word).toBe('Pressed'); expect(look.title).toMatch(/^Pressure 2 \/ \d+ · Pressed/);
    expect(physLines(physOf(f.g, f.cb, f.unit(f.foe.id)))[0]).toMatch(/^Pressed \(Pressure 2/);
    // the You card: your own Pressure, with who put it there
    f.press(f.pc, 2, f.foe);
    const chips = physChips(physOf(f.g, f.cb, f.unit(f.pc.id)), (k) => k, '');
    expect(chips[0]).toMatchObject({ key: 'pressure' }); expect(chips[0].k).toMatch(/^PRESSED · 2\//);
  });
  it('a held Watch: its tiles tinted (red for an enemy\'s), a dotted line from the watcher, a chip on the watcher', () => {
    const f = physFight([{ weapon: 'service_pistol', known: ['deny'] }], [{ at: 'H5' }]);
    f.put(f.pc, 'B5'); f.turn(f.pc);
    rig({ hit: false });
    expect(f.tech('deny', { tile: 'F5' })).toBeNull();
    const W = watchMarks(f.g, f.cb, 'pc'), t = f.tile('F5');
    expect(W.tiles.get(t)!.style).toMatch(/231, 235, 243/); // your side's tint
    expect(W.chips.get(f.pc.id)!.text).toMatch(/^◎ /);
  });
  it('the line between two tiles (both ends left out)', () => {
    expect(lineTiles('0,0', '3,0')).toEqual(['1,0', '2,0']);
    expect(lineTiles('0,0', '2,2')).toEqual(['1,1']);
    expect(lineTiles('0,0', '1,0')).toEqual([]);
  });
});

describe('the effects\' words (part 4)', () => {
  it('a technique\'s name, Suppressed or Broken once on the way up, Stopped, drill marks; Finishers and Takes beat harder', () => {
    expect(physWord({ k: 'technique', id: 'lunge' }, 'Lunge')).toBe('LUNGE');
    expect(physWord({ k: 'pressure', now: 3, was: 2, state: 'suppressed' })).toBe('SUPPRESSED');
    expect(physWord({ k: 'pressure', now: 1, was: 2, state: '' })).toBe('');
    expect(physWord({ k: 'stopped', how: 'pinned+prone' })).toBe('PINNED · KNOCKED DOWN');
    expect(physWord({ k: 'drill', add: 10, mark: 1 })).toBe('DRILL MARK I');
    expect(physWord({ k: 'drill', add: 10, learned: 'coup' }, 'Coup')).toBe('LEARNED · COUP');
    expect(physWord({ k: 'momentum', now: 2, was: 1 })).toBe('MOMENTUM 2'); expect(physWord({ k: 'momentum', now: 0, was: 2 })).toBe('');
    expect(isBigTechnique({ group: 'finisher' })).toBe(true); expect(isBigTechnique({ group: 'opener' })).toBe(false);
    expect(physBeat({ k: 'technique', group: 'finisher' } as any)).toBeGreaterThan(physBeat({ k: 'technique', group: 'opener' } as any)!);
    expect(physBeat({ k: 'shot' } as any)).toBeUndefined();
  });
});

describe('the ARMS tab (part 5)', () => {
  const sc = (state: any = {}) => { const s: any = { state, setState: (p: any) => { s.state = { ...s.state, ...p }; } }; return s; };
  it('known techniques by system and kind; the ready lists with their caps; a drill bar per weapon held; locked in a fight', () => {
    const f = physFight([{ weapon: 'combat_knife', known: ['lunge', 'suppress'], drill: { combat_knife: 320 } }], [{ at: 'H5' }]);
    const c = f.char(f.pc);
    const v: any = f.bound(() => armsTabVals(sc(), f.g, c));
    expect(v.has).toBe(true);
    expect(v.known.map((k: any) => k.key)).toEqual(['melee', 'ranged']);
    expect(v.known[0].groups.flatMap((gr: any) => gr.items.map((i: any) => i.key))).toEqual(expect.arrayContaining(['cut', 'lunge']));
    expect(v.known[0].groups.flatMap((gr: any) => gr.items).find((i: any) => i.key === 'cut').tag).toBe('EVERYONE KNOWS IT');
    expect(v.ready[0].title).toMatch(/^MELEE · READY \d+ \/ \d+$/);
    const kn: any = v.drill.find((d: any) => d.key === 'combat_knife');
    expect(kn.total).toBe('320 drill'); expect(kn.marks[0].reached).toBe(true); expect(kn.marks[0].gives).toMatch(/Coup \(its signature\)/);
    expect(kn.next).toMatch(/drill to mark II$/);
    // in a fight everything is locked, with the reason
    expect(v.fight).toBe(true); expect(v.lockText).toMatch(/after it/); expect(v.ready[0].items.every((i: any) => i.off)).toBe(true);
  });
});

describe('a shield in the off hand: its own block, and Guard as its meter', () => {
  function shieldFight(o: { dur?: number; guard?: number; m?: number; weapon?: string } = {}) {
    const f = physFight([{ weapon: o.weapon || 'sabre', known: [], skills: { athletics: 4, raw_power: 6, dexterity: 6, durability: o.dur ?? 3 } }], [{ at: 'D5' }]);
    f.put(f.pc, 'C5'); f.char(f.pc).offHand = { id: 'riot_shield' } as any; f.pc.offItem = 'riot_shield';
    f.cb.order = [f.pc.id, ...f.cb.order.filter((id: string) => id !== f.pc.id)]; f.turn(f.pc);
    f.momentum(f.pc, o.m ?? 2); if (f.pc.resMax?.guard != null) f.pc.res!.guard = o.guard ?? 1;
    return f;
  }
  const blocksOf = (f: any) => f.bound(() => weaponBlocks(f.g, f.cb, f.unit(f.pc.id)));
  it('the block: the shield by name, Guard pips now / max from the engine, Shield Bash and Raise Shield as chips, its reactions to read', () => {
    const f = shieldFight({ dur: 3, guard: 2 });
    const B = blocksOf(f), sh = B.find((b: any) => b.shield)!;
    expect(B.map((b: any) => b.hand)).toEqual(['main', 'off']); // never a "both hands" block with a shield
    const gd = f.bound(() => phys.physView(f.cb, f.unit(f.pc.id), 'pc')).guard!;
    expect(sh).toMatchObject({ hand: 'off', weaponId: 'riot_shield', system: 'melee', meterKind: 'guard', plain: null });
    expect(sh.meter).toBe('Guard ' + gd.now + ' / ' + gd.max); expect(gd.now).toBe(2);
    expect(sh.pips.length).toBe(gd.max); expect(sh.pips.filter((p: any) => p.on).length).toBe(gd.now);
    expect(sh.meterHint).toContain('takes ' + gd.soak + ' damage off a hit');
    const chips = sh.groups.flatMap((gr: any) => gr.chips);
    expect(chips.filter((c: any) => !c.reaction).map((c: any) => c.id).sort()).toEqual(['raise_shield', 'shield_bash']);
    expect(chips.filter((c: any) => c.reaction).map((c: any) => c.id).sort()).toEqual(['interpose', 'shield_wall']);
    expect(chips.find((c: any) => c.id === 'shield_wall')).toMatchObject({ apText: 'reaction' });
    expect(sh.total).toBe(2); // reactions aren't counted as things to press
    // the main hand keeps its Momentum pips
    expect(B[0].meterKind).toBe('momentum'); expect(B[0].meter).toMatch(/^Momentum 2 \/ /);
    // the rows: the main hand's, then the shield's pad under its own header
    const rows = blockItems(B);
    expect(rows.map((r: any) => r[0])).toEqual(['tq:main:cut', 'tpad:main', 'tpad:off']);
    expect(rows[2][1]).toBe('Shield techniques · ' + sh.usable);
    // the pad opens with both groups; a picked chip is a technique of the off hand
    const pad = padView(B, padOf('tpad:off'), null)!;
    expect(pad.groups.flatMap((gr: any) => gr.chips).find((c: any) => c.id === 'shield_bash').action).toBe('tq:off:shield_bash');
  });
  it('Raise Shield: 1, 2 or all (all when nothing is picked), previewed as Momentum → Guard by the engine', async () => {
    const { TECH_OPTS, techOptOf } = await import('./techView');
    expect(TECH_OPTS.raise_shield.map((o) => o[1])).toEqual(['TURN 1', 'TURN 2', 'ALL']);
    expect(techOptOf('raise_shield', null)).toBeNull(); expect(techOptOf('raise_shield', '1')).toBe('1'); expect(techOptOf('raise_shield', '2')).toBe('2'); expect(techOptOf('raise_shield', '')).toBeNull();
    expect(techOptOf('called_shot', null)).toBe('leg'); expect(techOptOf('bash', null)).toBeNull(); // the others keep their defaults
    const f = shieldFight({ dur: 5, guard: 0, m: 3 });
    const u = f.unit(f.pc.id), sel = { hand: 'off' as const, id: 'raise_shield' };
    const one = f.bound(() => techPreview(f.g, f.cb, u, sel, { opt: techOptOf('raise_shield', '1') }))!, all = f.bound(() => techPreview(f.g, f.cb, u, sel, { opt: techOptOf('raise_shield', null) }))!;
    expect(one.ok).toBe(true); expect((one as any).guard).toEqual({ now: 0, after: 1 }); expect((all as any).guard).toEqual({ now: 0, after: 3 });
    expect(previewLines(f.cb, one).meters).toEqual(['Momentum 3 → 2', 'Guard 0 → 1']);
    expect(f.tech('raise_shield', { hand: 'off', opt: '2' } as any)).toBeNull();
    expect(f.unit(f.pc.id).res!.guard).toBe(2); expect(f.momentum(f.pc)).toBe(1);
  });
  it('no shield: no off-hand block; no Durability: the block says there is no pool', () => {
    const f = shieldFight({ dur: 3 }); f.char(f.pc).offHand = null as any; f.pc.offItem = null;
    expect(blocksOf(f).map((b: any) => b.hand)).toEqual(['main']);
    const z = shieldFight({ dur: 0 });
    const sh = blocksOf(z).find((b: any) => b.shield);
    if (sh && z.unit(z.pc.id).resMax?.guard == null) { expect(sh.meter).toBe('No Guard pool'); expect(sh.pips).toEqual([]); }
  });
});
