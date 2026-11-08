// The RESOURCES block (game/resources.ts): each class archetype sees its own rows, in words, with the warnings that
// testers missed in the old 10 px line (RELOAD, RELOAD CORE, OVERLOAD SOON, OVER THE LIMIT…).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ADVANCED, type Sheet, newCharacter, startCombat } from '@engine';
import { resourcesOf, urgentRows, heldOutburstOf, resView, classResInfo } from './resources';
import { beforeAll as beforeAllAdv, afterAll as afterAllAdv } from 'vitest';
import { _setAdvancedLive } from '@engine';
// Class Roster Revision 3 shelves advanced classes; this file's advanced-move UI tests turn them on (test-only switch).
beforeAllAdv(() => _setAdvancedLive(true)); afterAllAdv(() => _setAdvancedLive(null));

const sheetFrom = (name = 'Test'): Sheet => {
  const a = ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
/** A one-PC fight; set(c) changes the character before the fight is built (class, weapon, pack). */
function fight(set?: (c: any) => void) {
  const c: any = newCharacter('c1', 'p1', sheetFrom('Vale'));
  set?.(c);
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: 'H5' }], 'easy', { state: 4 }, []);
  const g: any = { phase: 'combat', combat: cb, characters: { c1: c }, players: [{ id: 'p1', name: 'Leon' }], story: { magic: {} } };
  return { c, cb, g, u: cb.units.find((x: any) => x.side === 'pc' && x.charId === 'c1') };
}
const row = (rows: any[], key: string) => rows.find((r) => r.key === key);
const keys = (rows: any[]) => rows.map((r) => r.key);
/** A unit's magic, as the engine builds it (only the fields the block reads). */
const sigil = (o: any = {}) => ({ words: ['fire', 'seek'], designs: [], evoker: true, emanator: false, charge: 10, cores: 2, coresMade: 0, flux: 0, mp: 0, mpMax: 0, strain: 0, held: null, cast: false, strainLimit: 4, ...o });
const soul = (o: any = {}) => ({ words: [], designs: [{ id: 'd1', name: 'Heartfire', school: 'damage', modules: ['wave'], tone: 'fire' }], evoker: false, emanator: true, charge: 0, cores: 0, coresMade: 0, flux: 0, mp: 300, mpMax: 400, strain: 0, held: null, cast: false, strainLimit: 4, ...o });

describe('the gunner: ammo, spares, ammo type, Heat', () => {
  it('rounds loaded / capacity with spare magazines in words; low ammo says RELOAD, none with no spares says EMPTY', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.ammo = 24; u.mags = [30, 30];
    let r = resourcesOf(u, c, g);
    expect(keys(r)).toContain('ammo');
    expect(keys(r)).toContain('heat');
    expect(keys(r)).not.toContain('charge');
    expect(keys(r)).not.toContain('strain');
    const a = row(r, 'ammo');
    expect(a.label).toBe('Ammo');
    expect(a.value).toMatch(/^24 \/ \d+ loaded · 2 spare/);
    expect(a.warn).toBeUndefined();
    u.ammo = 3; r = resourcesOf(u, c, g);
    expect(row(r, 'ammo')).toMatchObject({ warn: 'RELOAD', level: 'caution' });
    expect(row(r, 'ammo').hint).toMatch(/Reload \(\d AP\)/);
    u.ammo = 0; r = resourcesOf(u, c, g);
    expect(row(r, 'ammo')).toMatchObject({ warn: 'RELOAD', level: 'alert' });
    u.mags = []; r = resourcesOf(u, c, g);
    expect(row(r, 'ammo')).toMatchObject({ warn: 'EMPTY', level: 'alert' });
  });
  it('special ammo is named; Heat near the jam limit says JAM SOON; a jam says JAMMED', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.ammoType = 'armour_piercing';
    let r = resourcesOf(u, c, g);
    expect(row(r, 'ammo').sub).toMatch(/Armour-piercing rounds/);
    const lim = row(r, 'heat').max;
    expect(lim).toBeGreaterThan(2);
    u.heat = lim - 1; r = resourcesOf(u, c, g);
    expect(row(r, 'heat')).toMatchObject({ warn: 'JAM SOON', label: 'Heat' });
    u.jammed = true; r = resourcesOf(u, c, g);
    expect(row(r, 'heat')).toMatchObject({ warn: 'JAMMED', level: 'alert' });
    expect(row(r, 'heat').hint).toMatch(/Clear it \(2 AP\)/);
  });
  it('a gun that never runs dry (the drone) has no ammo or Heat rows', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.infiniteAmmo = true;
    expect(keys(resourcesOf(u, c, g))).not.toContain('ammo');
    expect(keys(resourcesOf(u, c, g))).not.toContain('heat');
  });
});

describe('the Sigil caster: Evoker charge, spare cores, Flux', () => {
  it('charge / 10 and spare cores; an empty core says RELOAD CORE with the 2 AP swap; low says LOW', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'fists'; });
    u.mg = sigil({ charge: 0, cores: 2 });
    let r = resourcesOf(u, c, g);
    expect(keys(r)).toEqual(expect.arrayContaining(['charge', 'flux']));
    expect(keys(r)).not.toContain('ammo');
    expect(keys(r)).not.toContain('strain');
    expect(row(r, 'charge')).toMatchObject({ label: 'Evoker charge', value: '0 / 10 · 2 spare cores', warn: 'RELOAD CORE', level: 'alert' });
    expect(row(r, 'charge').hint).toMatch(/Swap core \(2 AP\)/);
    u.mg.charge = 2; r = resourcesOf(u, c, g);
    expect(row(r, 'charge')).toMatchObject({ warn: 'LOW' });
    expect(row(r, 'charge').hint).toMatch(/swap core \(2 AP\)/);
    u.mg.charge = 0; u.mg.cores = 0; r = resourcesOf(u, c, g);
    expect(row(r, 'charge')).toMatchObject({ warn: 'EMPTY', value: '0 / 10 · 0 spare cores' });
  });
  it('Flux / 6: OVERLOAD SOON at 5, OVERLOAD NEXT at 6; an overloaded Evoker reads LOCKED', () => {
    const { u, c, g, cb } = fight();
    u.mg = sigil({ flux: 4 });
    expect(row(resourcesOf(u, c, g), 'flux').warn).toBeUndefined();
    u.mg.flux = 5;
    expect(row(resourcesOf(u, c, g), 'flux')).toMatchObject({ value: '5 / 6', warn: 'OVERLOAD SOON', kind: 'pips' });
    u.mg.flux = 6;
    expect(row(resourcesOf(u, c, g), 'flux')).toMatchObject({ warn: 'OVERLOAD NEXT', level: 'alert' });
    u.mg.lockRound = cb.round;
    expect(row(resourcesOf(u, c, g), 'charge')).toMatchObject({ warn: 'LOCKED' });
  });
});

describe('the Soul caster: MP, Strain vs its limit, the held Outburst', () => {
  it('MP in MP blue; Strain near, at and over the limit; a Mana Short one away', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'fists'; });
    u.mg = soul({ strain: 2 });
    let r = resourcesOf(u, c, g);
    expect(keys(r)).toEqual(expect.arrayContaining(['mp', 'strain']));
    expect(keys(r)).not.toContain('flux');
    expect(row(r, 'mp')).toMatchObject({ label: 'MP', value: '300 / 400', colour: '#5C9EFF' });
    expect(row(r, 'strain')).toMatchObject({ value: '2 / 4', colour: '#AE9BFF' });
    expect(row(r, 'strain').warn).toBeUndefined();
    u.mg.strain = 3; expect(row(resourcesOf(u, c, g), 'strain').warn).toBe('NEAR THE LIMIT');
    u.mg.strain = 4; expect(row(resourcesOf(u, c, g), 'strain').warn).toBe('AT THE LIMIT');
    u.mg.strain = 5; r = resourcesOf(u, c, g);
    expect(row(r, 'strain')).toMatchObject({ warn: 'OVER THE LIMIT', level: 'alert' });
    expect(row(r, 'strain').hint).toMatch(/8 damage/);
    // The −1 a turn is always there; calming the heart adds to it (Leon).
    expect(row(r, 'strain').hint).toMatch(/Falls by 1 at the start of each of your turns, and more by calming/);
    u.mg.strain = 6; expect(row(resourcesOf(u, c, g), 'strain').warn).toBe('MANA SHORT NEXT');
  });
  it('the held Outburst: design name, stage, tone and form through the one adapter', () => {
    const { u, c, g } = fight();
    u.mg = soul({ held: { design: 'd1', stage: 2, cost: 40 }, freePumps: 1, freePumpsMax: 1 });
    const h = heldOutburstOf(u.mg);
    expect(h.held).toMatchObject({ name: 'Heartfire', stage: 2, maxStage: 4, tone: 'fire', toneName: 'Fire', freePumps: 1 });
    const r = row(resourcesOf(u, c, g), 'held');
    expect(r).toMatchObject({ label: 'Holding', value: 'Heartfire · stage 2 / 4', kind: 'pips' });
    expect(r.sub).toMatch(/^Fire · /);
    expect(r.sub).toMatch(/1 free pump left/);
    // The Outburst 2.0 shape (tone and form on the held heart) reads too, and the story's magic for a character.
    expect(heldOutburstOf({ strain: 1, strainLimit: 5, designs: [], held: { design: 'x', stage: 4, tone: 'storm', form: 'lance' } }).held).toMatchObject({ toneName: 'Storm', form: 'Lance', stage: 4 });
    expect(heldOutburstOf({ strain: 2, held: null }, [], 6)).toMatchObject({ strain: 2, limit: 6, held: null, beginStrain: 1, turnCalm: 1 });
  });
});

describe('class resources, named from the data', () => {
  it('a Fighter sees Momentum / 5 (pips, Body amber), with the moves that spend it', () => {
    const { u, c, g } = fight((c) => { c.classId = 'fighter'; });
    expect(u.resMax?.momentum).toBe(5);
    u.res.momentum = 3;
    const r = row(resourcesOf(u, c, g), 'res-momentum');
    expect(r).toMatchObject({ label: 'Momentum', value: '3 / 5', kind: 'pips', colour: '#F2A54A' });
    expect(r.hint).toMatch(/Lunge/);
    u.res.momentum = 5;
    expect(row(resourcesOf(u, c, g), 'res-momentum')).toMatchObject({ warn: 'FULL', level: 'ready' });
  });
  it('a Storm Hand sees Charges, labelled by the move that gives them (from the data), in Soul violet', () => {
    const { u, c, g } = fight((c) => { c.classId = 'fighter'; c.advancedClass = 'storm_hand'; });
    expect(u.resMax?.charges).toBe(3);
    u.res.charges = 2;
    // The move that gives them, from data/classes.json (Charged by Death, then by Battle in rules 1.5): never an id.
    const gain = (ADVANCED as any).storm_hand.moves.find((m: any) => (m.effects || []).some((e: any) => e.op === 'resource' && /charge/.test(e.resource) && e.value > 0)).name;
    expect(gain).toMatch(/^Charged by /);
    const r = row(resourcesOf(u, c, g), 'res-charges');
    expect(r).toMatchObject({ label: 'Charges', value: '2 / 3', sub: gain, colour: '#AE9BFF' });
    expect(classResInfo(c, 'charges').source).toBe(gain);
    expect(row(resourcesOf(u, c, g), 'res-momentum')).toBeTruthy();
  });
  it('a Defender sees Guard; a Bard (the Medic moves, Revision 3) sees Supplies out of a fight too (they persist)', () => {
    const d = fight((c) => { c.classId = 'defender'; });
    expect(row(resourcesOf(d.u, d.c, d.g), 'res-guard')).toMatchObject({ label: 'Guard', value: '0 / 5' });
    const m = fight((c) => { c.classId = 'bard'; });
    const story = resourcesOf(null, m.c, { phase: 'story', story: { magic: {} } });
    expect(row(story, 'res-supplies')?.label).toBe('Supplies');
    expect(row(story, 'res-momentum')).toBeUndefined();
  });
});

describe('companions, the narrow bars and the template view', () => {
  it('a drone\'s HP shows under its owner; DOWN when it is out', () => {
    const { u, c, g, cb } = fight();
    cb.units.push({ id: 'cp-c1-d', side: 'pc', name: 'Combat drone', ctrl: 'c1', companion: 'drone', hp: 30, maxHp: 30 });
    expect(row(resourcesOf(u, c, g), 'cp-cp-c1-d')).toMatchObject({ value: '30 / 30 HP', colour: '#F65157' });
    cb.units[cb.units.length - 1].dead = true;
    expect(row(resourcesOf(u, c, g), 'cp-cp-c1-d')).toMatchObject({ warn: 'DOWN' });
  });
  it('the most urgent rows come first for the mini-bar; the view has big text and full-width bars', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.ammo = 0; u.mags = [30]; u.mg = sigil({ flux: 5 });
    const rows = resourcesOf(u, c, g), top = urgentRows(rows, 3);
    expect(top[0].key).toBe('ammo'); // alert first
    expect(top.map((r) => r.key)).toContain('flux'); // then caution
    const v = resView(rows);
    expect(v.urgent).toHaveLength(3);
    const a = v.rows.find((r) => r.key === 'ammo')!;
    expect(a.labelStyle).toMatch(/font-size: 13px/);
    expect(a.valueStyle).toMatch(/font-size: 15px/);
    expect(a.warnStyle).toMatch(/background: #F65157/);
    const f = v.rows.find((r) => r.key === 'flux')!;
    expect(f.pips).toHaveLength(6);
    expect(f.pips[0].style).toMatch(/height: 10px/);
    expect(resourcesOf(null, null, g)).toEqual([]);
  });
  it('no HP row: HP sits above the block', () => {
    const { u, c, g } = fight();
    expect(keys(resourcesOf(u, c, g))).not.toContain('hp');
  });
});

// The review fixes (8 Nov 2026): every warning matches what the engine will actually do.
const onTurn = (cb: any, u: any) => { cb.turn = cb.order.indexOf(u.id); };
const offTurn = (cb: any, u: any) => { const i = cb.order.findIndex((id: string) => id !== u.id); cb.turn = i; };
describe('resource panel fixes', () => {
  it('spare cores are what Swap core can load: cores crystallised this fight show apart, and none spare says EMPTY', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'fists'; });
    u.mg = { ...soul(), evoker: true, charge: 0, cores: 0, coresMade: 1 };
    const r = row(resourcesOf(u, c, g), 'charge');
    expect(r.warn).toBe('EMPTY');
    expect(r.value).toBe('0 / 10 · 0 spare cores · 1 crystallised');
    expect(r.hint).toMatch(/joins your spares after it/);
    u.mg.cores = 1; expect(row(resourcesOf(u, c, g), 'charge').warn).toBe('RELOAD CORE');
  });
  it('a full single-round weapon is not low (the engine says "Already full.")', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'crossbow'; });
    u.ammo = 1; u.loose = 6;
    const r = row(resourcesOf(u, c, g), 'ammo');
    expect(r.value).toMatch(/^1 \/ 1 loaded/);
    expect(r.warn).toBeUndefined();
    u.ammo = 0; expect(row(resourcesOf(u, c, g), 'ammo').warn).toBe('RELOAD');
  });
  it('Reload AP is the engine\'s: a quick-release magazine shows 1 AP', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.ammo = 2; u.mags = [30]; u.mods = ['mod_quick_release'];
    const r = row(resourcesOf(u, c, g), 'ammo');
    expect(r.hint).toMatch(/Reload \(1 AP\)/);
  });
  it('a broken or worn melee weapon says it still swings, and never mentions jams', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'combat_knife'; });
    expect(u.maxDur).toBeGreaterThan(0);
    u.dur = 0; let r = row(resourcesOf(u, c, g), 'dur');
    expect(r.warn).toBe('BROKEN'); expect(r.hint).toMatch(/still swings, but for half damage/);
    u.dur = Math.floor(u.maxDur * 0.2); r = row(resourcesOf(u, c, g), 'dur');
    expect(r.warn).toBe('WORN'); expect(r.hint).toMatch(/90% damage/); expect(r.hint).not.toMatch(/jam/);
  });
  it('Strain warnings use the Begin\'s real Strain: no Emanator (+3) at the limit is a Mana Short next', () => {
    const { u, c, g, cb } = fight((c) => { c.weapon = 'fists'; });
    onTurn(cb, u);
    u.mg = soul({ emanator: false, strain: 4 });
    const h = heldOutburstOf(u.mg, undefined, undefined, { cb, u });
    expect(h.beginStrain).toBe(3);
    const r = row(resourcesOf(u, c, g), 'strain');
    expect(r).toMatchObject({ warn: 'MANA SHORT NEXT', level: 'alert' });
    expect(r.hint).toMatch(/next Begin adds 3 Strain/);
  });
  it('Flooded: a Begin adds 2, so 1 over the limit is a Mana Short next', () => {
    const { u, c, g, cb } = fight((c) => { c.weapon = 'fists'; });
    onTurn(cb, u); cb.mana = 40;
    u.mg = soul({ strain: 5 });
    expect(row(resourcesOf(u, c, g), 'strain').warn).toBe('MANA SHORT NEXT');
  });
  it('an idle held turn nets 0 outside Flooded: at the limit you stay at it (no "goes over")', () => {
    const { u, c, g, cb } = fight((c) => { c.weapon = 'fists'; });
    onTurn(cb, u);
    u.mg = soul({ strain: 4, held: { design: 'd1', stage: 1, cost: 40 } });
    const r = row(resourcesOf(u, c, g), 'strain');
    expect(r.warn).toBe('AT THE LIMIT');
    expect(r.hint).toMatch(/net ±0/); expect(r.hint).toMatch(/no burn/); expect(r.hint).not.toMatch(/goes over/);
    expect(r.hint).toMatch(/on top of that −1/);
  });
  it('over the limit off-turn, nothing held: the turn start\'s −1 comes before the burn', () => {
    const { u, c, g, cb } = fight((c) => { c.weapon = 'fists'; });
    offTurn(cb, u);
    u.mg = soul({ strain: 6 });
    const r = row(resourcesOf(u, c, g), 'strain');
    expect(r.warn).toBe('OVER THE LIMIT');
    expect(r.hint).toMatch(/^2 over the limit: 8 damage to you at your next turn end/);
  });
  it('over-limit pips sit past a divider and are hatched, so 4/4 and 5/4 never look alike', () => {
    const { u, c, g, cb } = fight((c) => { c.weapon = 'fists'; });
    onTurn(cb, u);
    u.mg = soul({ strain: 5 });
    const v = resView(resourcesOf(u, c, g)).rows.find((r) => r.key === 'strain')!;
    expect(v.pips.filter((p) => p.divider)).toHaveLength(1);
    expect(v.pips.filter((p) => p.over)).toHaveLength(1);
    expect(v.pips.find((p) => p.over)!.style).toMatch(/repeating-linear-gradient/);
    u.mg.strain = 4;
    expect(resView(resourcesOf(u, c, g)).rows.find((r) => r.key === 'strain')!.pips.some((p) => p.divider)).toBe(false);
  });
  it('the compact Holding row keeps the design name; the form isn\'t repeated when the name says it', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'fists'; });
    u.mg = soul({ designs: [{ id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] }], held: { design: 'sb', stage: 2, cost: 40 } });
    const rows = resourcesOf(u, c, g), h = row(rows, 'held');
    expect(h.sub).not.toMatch(/Bolt/);
    const mini = resView(rows, 6).urgent.find((r) => r.key === 'held')!;
    expect(mini.value).toBe('Soul Bolt · 2 / 4');
  });
  it('the full block wraps its value (the narrow HUD shows the spares); compact rows still cut', () => {
    const { u, c, g } = fight((c) => { c.weapon = 'hellraiser_service_rifle'; });
    u.ammo = 24; u.mags = [30, 30];
    const v = resView(resourcesOf(u, c, g));
    expect(v.rows.find((r) => r.key === 'ammo')!.valueStyle).toMatch(/white-space: normal/);
    expect(v.urgent[0].valueStyle).toMatch(/text-overflow: ellipsis/);
  });
});
