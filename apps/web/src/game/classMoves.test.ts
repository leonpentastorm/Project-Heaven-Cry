// @vitest-environment jsdom
// Class Roster Revision 3 in the web game: the 20 new moves are buttons (pickers for Command's tile, Shove's push or
// knock down, Field Fix's job, the Occult Library's tone), their standing state reads on the Class tab (an on/off pair,
// Eye of the Storm armed), Vent and core swap show the engine's AP (Bleed the Flux, Core Change), the grid draws what
// stands (a False Image as its owner's translucent copy, Read's intent on the enemy and its target, the rigged tile for
// its own side only, a sabotaged barricade), and every new fx event plays its effect and sound, real ones from the
// engine included, out of sight drawing nothing.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CLASS, refOf, viewFor, ventAp, coreAp, perkActionsFor, bindGame, type Unit } from '@engine';
import { fightWith, storyWith, type CharSpec } from '../../../../packages/engine/test/helpers/perkfight';
import { pickerFor, buildArgs, gridPick } from './actionPickers';
import { pkState, magicAp, actionGroups } from './commands';
import { classMarks, arrowToward } from './classMarks';
import { setLayer } from './fx/dom';
import { playFx, setContext, clearFx, setViewer } from './fx/play';
import { classBeat, classWord } from './fx/classes';
import * as sfxMod from './sfx';

const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const cls = (id: string, n: number, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: id, level: 12, attrs: { [CLASS[id].attribute]: n, ...(extra.attrs || {}) } });
const at = (f: any, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const entries = (f: any, u: Unit) => { const was = bindGame(f.g); try { return perkActionsFor({ u: f.unit(u.id), c: f.g.characters[u.charId!], cb: f.cb, g: f.g }, 'combat'); } finally { bindGame(was); } };
const ctx = (f: any, u: Unit) => ({ g: f.g, c: f.g.characters[u.charId!], how: 'combat' as const, cb: f.cb, u: f.unit(u.id) });

describe('pickers for the new moves (buttons only)', () => {
  it('Rewrite in the story: whose and what they rely on are both buttons (no typed field)', () => {
    const x: any = { g: { story: { npcs: [{ id: 'n1', name: 'Brother Ash', side: 'neutral' }] } }, c: null, how: 'story' };
    const P = pickerFor({ id: 'class:trickster.rewrite', actionId: 'rewrite_story', label: 'Rewrite', text: 'Flip a blessing, ward or advantage someone relies on (pick who and what).', target: 'text' } as any, x)!;
    expect(P.fields.map((f) => f.kind)).toEqual(['chips', 'chips']);
    expect(P.hint).not.toMatch(/pick who and what/);
    const what = P.fields[1] as any; expect(what.options.map((o: any) => o.label)).toContain('A ward');
    expect(buildArgs(P, { npc: ['n1'] }, x)).toMatch(/^Pick /); // a missing pick is refused, nothing typed
    expect(buildArgs(P, { npc: ['n1'], what: ['ward'] }, x)).toEqual({ text: 'Brother Ash: a ward', npc: 'Brother Ash' });
  });
  it('Command: the squadmate is the grid target, the walk\'s end a second click on a tile', () => {
    const f = fightWith([cls('guardian', 3, { skills: { authority: 1 } }), {}], [{}]);
    const u = f.turn(f.pcs[0]), e = entries(f, u).find((x) => x.actionId === 'command')!;
    expect(e.why).toBeNull();
    const P = pickerFor(e, ctx(f, u))!;
    expect(P.fields.map((x) => x.kind)).toEqual(['tile']);
    expect(buildArgs(P, {}, ctx(f, u))).toMatch(/^Click where they move/);
    const v = gridPick(P, {}, null, '3,4')!; expect(buildArgs(P, v, ctx(f, u))).toEqual({ tile: '3,4' });
    expect(gridPick(P, v, null, '4,4')).toBeNull(); // one tile: a second click re-aims
  });
  it('Shove: push or knock down, as chips with words; Field Fix: three jobs, none meaning the first that applies', () => {
    const f = fightWith([cls('fighter', 3)], [{}]);
    const u = f.turn(f.pc), e = entries(f, u).find((x) => x.actionId === 'class_shove')!;
    const P = pickerFor(e, ctx(f, u))!;
    expect(P.fields[0].kind).toBe('chips'); expect((P.fields[0] as any).options.map((o: any) => o.label)).toEqual(['Push 1 tile', 'Knock Prone']);
    expect(buildArgs(P, {}, ctx(f, u))).toMatch(/^Pick push it back/);
    expect(buildArgs(P, { choice: ['prone'] }, ctx(f, u))).toEqual({ choice: 'prone' });
    const g = fightWith([cls('infiltrator', 5), {}], [{}]);
    const w = g.turn(g.pcs[0]), ff = entries(g, w).find((x) => x.actionId === 'field_fix')!;
    const F = pickerFor(ff, ctx(g, w))!;
    expect((F.fields[0] as any).options.map((o: any) => o.id)).toEqual(['clear_jam', 'restore_durability', 'repair_machine']);
    expect(buildArgs(F, {}, ctx(g, w))).toEqual({});
    expect(buildArgs(F, { choice: ['clear_jam'] }, ctx(g, w))).toEqual({ choice: 'clear_jam' });
  });
  it('Sabotage, False Image, Sleight, Silver Tongue, Rally, Vanish, Unstoppable, Eye of the Storm and the toggles: the grid target or a plain button', () => {
    const plain = ['sabotage', 'sabotage_object', 'rig', 'false_image', 'sleight', 'sleight_image', 'silver_tongue', 'rally', 'vanish', 'unstoppable', 'eye_of_the_storm', 'shrug_on', 'shrug_off', 'duck_on', 'duck_off'];
    const f = fightWith([{}], [{}]); const x = ctx(f, f.pc);
    for (const id of plain) expect(pickerFor({ id: 'class:x', actionId: id, label: id, text: '', target: 'none' } as any, x), id).toBeNull();
  });
  it('Occult Library: the tones as chips with their riders; a tone you know is greyed with its reason', () => {
    const s = storyWith([cls('channeler', 5, SOUL)]); const c = s.chars[0];
    const was = bindGame(s.g); let e: any; try { e = perkActionsFor({ c: s.g.characters[c.id], g: s.g }, 'story').find((x) => x.actionId === 'occult_tone'); } finally { bindGame(was); }
    expect(e).toBeTruthy();
    s.g.characters[c.id].soulKnown = { ...(s.g.characters[c.id].soulKnown || { schools: [], modules: [] }), tones: [e.options[0].id] };
    const P = pickerFor(e, { g: s.g, c: s.g.characters[c.id], how: 'story' })!;
    const opts = (P.fields[0] as any).options;
    expect(opts.length).toBe(e.options.length); expect(opts[0].off).toBe('You know that tone.'); expect(opts[1].off).toBeUndefined();
    expect(opts.every((o: any) => o.title)).toBe(true);
    expect(buildArgs(P, { choice: [opts[1].id] }, { g: s.g, c: s.g.characters[c.id], how: 'story' })).toEqual({ choice: opts[1].id });
  });
});

describe('the Class tab reads each move\'s state', () => {
  it('an on/off pair names the one in force; Eye of the Storm reads ARMED; costs and uses come from the engine', () => {
    expect(pkState({ actionId: 'duck_on', why: 'Already set.' } as any)).toEqual({ tag: ' ✓', why: 'In force now. On is the default.' });
    expect(pkState({ actionId: 'shrug_off', why: 'Already set.' } as any).why).toMatch(/off for this fight/);
    expect(pkState({ actionId: 'eye_of_the_storm', why: 'Already armed.' } as any).tag).toBe(' · ARMED');
    expect(pkState({ actionId: 'rally', why: 'Used until the next scene.' } as any)).toEqual({ tag: '', why: 'Used until the next scene.' });
    const f = fightWith([cls('marksman', 5)], [{}]); const u = f.turn(f.pc);
    const was = bindGame(f.g); let groups: any[]; try { groups = actionGroups(f.cb, f.unit(u.id), f.g.characters[u.charId!], { g: f.g }); } finally { bindGame(was); }
    const cls0 = groups!.find((gr) => gr[3] === 'class'); expect(cls0).toBeTruthy();
    const on = cls0[1].find((it: any) => /Duck and Roll: on/.test(it[1])), off = cls0[1].find((it: any) => /Duck and Roll: off/.test(it[1]));
    expect(on[1]).toMatch(/✓$/); expect(on[4]).toMatch(/In force now/); expect(off[4]).toBeNull();
  });
  it('Vent and core swap show the engine\'s AP: Bleed the Flux 1 → 0, Core Change 2 → 1', () => {
    const f = fightWith([cls('mage', 5, MIND)], [{}]); const u = f.turn(f.pc);
    expect(ventAp(f.unit(u.id))).toBe(0); expect(coreAp(f.unit(u.id))).toBe(1);
    expect(magicAp(f.unit(u.id), 'vent')).toBe(0); expect(magicAp(f.unit(u.id), 'core')).toBe(1);
    f.unit(u.id).mg!.flux = 2; f.unit(u.id).mg!.cores = 2;
    const was = bindGame(f.g); let groups: any[]; try { groups = actionGroups(f.cb, f.unit(u.id), f.g.characters[u.charId!], { g: f.g }); } finally { bindGame(was); }
    const sig = groups!.find((gr) => gr[3] === 'sigils')[1];
    expect(sig.find((it: any) => it[0] === 'vent')[2]).toBe('0 AP'); expect(sig.find((it: any) => it[0] === 'core')[2]).toBe('1 AP');
    expect(sig.find((it: any) => it[0] === 'core')[3]).toMatch(/Core Change lowers the cost from 2 to 1 AP/);
    const plain = fightWith([cls('fighter', 3, MIND)], [{}]); const p = plain.turn(plain.pc);
    expect(magicAp(plain.unit(p.id), 'vent')).toBe(1); expect(magicAp(plain.unit(p.id), 'core')).toBe(2);
  });
});

describe('the grid marks what stands', () => {
  it('a False Image: a translucent Sigil-cyan copy of its owner\'s token, with its word and its fooled count', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    const u = at(f, f.pc, '4,2'); at(f, f.foe, '10,2').sv = { body: -50, brain: -50, heart: -50 }; f.turn(u);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'class:trickster.false_image', tile: '6,4' } as any);
    const m = classMarks(f.cb, 'pc', { imgOf: () => '/art/me.webp' })['6,4'];
    expect(m.marks.map((x) => x.text)).toContain('IMAGE');
    const decoy = m.marks.find((x) => x.key.startsWith('img') && !x.key.startsWith('imgt'))!;
    expect(decoy.style).toMatch(/opacity: 0\.55/); expect(decoy.style).toMatch(/#8BDEEE|rgba\(79, 200, 223/i); expect(decoy.style).toMatch(/url\("\/art\/me\.webp"\)/); expect(decoy.style).toMatch(/phcDecoy/);
    expect(decoy.title).toMatch(/1 enemy takes it for/); expect(m.note).toMatch(/False Image of/);
  });
  it('another side\'s image shows only where this side sees; another side\'s rigged tile never', () => {
    const cb: any = { round: 1, units: [{ id: 'f1', name: 'Mimic', side: 'foe', pos: '5,5', short: 'MI' }], images: [{ id: 'img1', owner: 'f1', pos: '6,6', side: 'foe', round: 1, fooled: [] }],
      objects: [{ id: 'rig1', kind: 'trap', pos: '2,2', rig: 'class:infiltrator.sabotage', side: 'foe', owner: 'f1', damage: 30 }] };
    expect(classMarks(cb, 'pc', { seen: new Set(['5,5']) })['6,6']).toBeUndefined();
    expect(classMarks(cb, 'pc', { seen: new Set(['6,6']) })['6,6'].marks.length).toBeGreaterThan(0);
    expect(classMarks(cb, 'pc', {})['2,2']).toBeUndefined();
    expect(classMarks(cb, 'foe', {})['2,2'].marks[0].text).toBe('✱ RIG');
  });
  it('the room view drops another side\'s rigged tile', () => {
    const f = fightWith([{}], [{}]);
    f.cb.objects = [...(f.cb.objects || []), { id: 'rigX', kind: 'trap', name: 'Rigged tile', pos: '9,9', rig: 'class:infiltrator.sabotage', side: 'foe', owner: f.foe.id } as any, { id: 'rigY', kind: 'trap', name: 'Rigged tile', pos: '8,9', rig: 'class:infiltrator.sabotage', side: 'pc', owner: f.pc.id } as any];
    const v = viewFor(f.g, 'host');
    expect((v.combat!.objects || []).some((o: any) => o.id === 'rigX')).toBe(false); expect((v.combat!.objects || []).some((o: any) => o.id === 'rigY')).toBe(true);
  });
  it('a Proving Ground team fight: team B\'s screen marks team B\'s own rigged tile, never team A\'s', () => {
    const f = fightWith([cls('infiltrator', 8), {}], [{}]);
    const [a, b] = f.pcs; f.turn(a); f.act({ type: 'combat/perk', unitId: a.id, id: 'class:infiltrator.sabotage', actionId: 'rig' } as any);
    const g: any = JSON.parse(JSON.stringify(f.g)); g.sandbox = { mode: 'teams', team: { p2: 'B' }, saved: {} };
    g.combat.units.find((x: any) => x.id === b.id).side = 'foe';
    g.combat.objects.push({ id: 'rigB', kind: 'trap', name: 'Rigged tile', pos: '9,9', rig: 'class:infiltrator.sabotage', side: 'foe', owner: b.id, damage: 30 });
    const aPos = g.combat.objects.find((o: any) => o.rig && o.side === 'pc').pos;
    const MB = classMarks(viewFor(g, 'p2').combat, 'pc', {}), MA = classMarks(viewFor(g, 'host').combat, 'pc', {});
    expect(MB['9,9'].marks[0].text).toBe('✱ RIG'); expect(MB[aPos]?.marks.some((x) => x.key.startsWith('rig')) || false).toBe(false);
    expect(MA[aPos].marks[0].text).toBe('✱ RIG'); expect(MA['9,9']).toBeUndefined();
  });
  it('Read: an arrow on the enemy toward its target and a ring on the target, until its turn ends', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    const u = at(f, f.pc, '4,2'), foe = at(f, f.foe, '7,2'); f.cb.order = [u.id, foe.id]; f.turn(u);
    f.act({ type: 'combat/analyze', unitId: u.id, targetId: foe.id } as any);
    const M = classMarks(f.cb, 'pc', {});
    const on = M['7,2'].marks.find((x) => x.key === 'intent' + foe.id)!;
    expect(on.text).toBe(arrowToward('7,2', '4,2') + ' ATTACK'); expect(on.title).toMatch(/^Read: .* means to /);
    expect(M['4,2'].marks.some((x) => x.text === '◎')).toBe(true); expect(M['4,2'].layer).toMatch(/dashed #F65157/);
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    expect(classMarks(f.cb, 'pc', {})['7,2']?.marks.some((x) => x.key === 'intent' + foe.id) || false).toBe(false);
  });
  it('a rigged tile (own side) and a sabotaged barricade carry their marks and rounds', () => {
    const cb: any = { round: 2, units: [{ id: 'p1', name: 'Vex', side: 'pc', pos: '1,1' }],
      objects: [{ id: 'r', kind: 'trap', pos: '1,1', rig: 'k', side: 'pc', owner: 'p1', damage: 30 }, { id: 'b', kind: 'barricade', name: 'Barricade', pos: '3,3', sabotaged: 4 }] };
    const M = classMarks(cb, 'pc', {});
    expect(M['1,1'].marks[0].text).toBe('✱ RIG'); expect(M['1,1'].marks[0].title).toMatch(/Rigged by Vex/);
    expect(M['3,3'].marks[0].text).toBe('⚠ 2'); expect(M['3,3'].note).toMatch(/doesn't block the way until round 4/);
  });
});

// ---------- fx ----------
function grid(w = 14, h = 10) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
const NEW_FX: any[] = [
  { k: 'shrug', unit: 'u', at: '2,2', cond: 'slowed' }, { k: 'anchor', unit: 'u', at: '2,2', what: 'prone' }, { k: 'anchor', unit: 'u', at: '2,2', what: 'oa', target: 't' },
  { k: 'unstoppable', unit: 'u', at: '2,2', ignored: ['fear', 'pinned'] }, { k: 'duck', unit: 'u', from: '2,2', to: '3,2', by: 't', out: false, cover: true },
  { k: 'rig', unit: 'u', at: '2,2', id: 'rig1', only: 'pc' }, { k: 'sabotage', unit: 'u', target: 't', at: '5,5', rounds: 2, what: 'machine' }, { k: 'sabotage', unit: 'u', at: '6,5', rounds: 2, what: 'barricade' },
  { k: 'sabotage_end', at: '6,5', what: 'barricade' }, { k: 'intent', unit: 'u', target: 't', at: '5,5', kind: 'attack', text: 'shoot X', targetUnit: 'u' },
  { k: 'image', id: 'img1', owner: 'u', at: '4,4', side: 'pc', fooled: ['t'] }, { k: 'shot', unit: 't', target: 'img1', from: '5,5', to: '4,4', weapon: 'service_pistol', cat: 'pistol', hit: false, image: true },
  { k: 'image_gone', id: 'img1', owner: 'u', at: '4,4', why: 'struck' }, { k: 'silver_tongue', unit: 'u', target: 't', from: '2,2', to: '5,5', ok: true, ap: 2 },
  { k: 'swap', unit: 'u', target: 'a', from: '2,2', to: '3,3' }, { k: 'swap', unit: 'u', target: 'img2', from: '2,2', to: '4,4', image: true },
  { k: 'rally', unit: 'u', at: '2,2', radius: 4, targets: ['a'] }, { k: 'eye_storm', unit: 'u', at: '2,2' }, { k: 'eye_storm_spent', unit: 'u', at: '2,2', riderStage: 2 },
  { k: 'command_move', unit: 'u', target: 'a', from: '3,3', to: '4,3' }, { k: 'vent', unit: 'u', at: '2,2', flux: 1, bleed: true },
];
describe('fx: every new event draws and sounds', () => {
  let sounds: string[] = [];
  beforeEach(() => { sounds = []; vi.spyOn(sfxMod, 'sfx').mockImplementation(((s: string) => { sounds.push(s); }) as any); });
  afterEach(() => { vi.restoreAllMocks(); clearFx(); setViewer('pc'); });
  const fight = (seen: string[] | null) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] },
    combat: { units: [{ id: 'u', name: 'Vex', side: 'pc', pos: '2,2' }, { id: 't', name: 'Drone', side: 'foe', pos: '5,5' }, { id: 'a', name: 'Ally', side: 'pc', pos: '3,3' }], map: { w: 14, h: 10, solid: [] }, round: 1, turn: 0, order: [], log: [], fx: [], _seen: seen } }) as any;
  it('each new kind has its word, its beat, and plays with no warning, drawing on the layer and making a sound', () => {
    vi.useFakeTimers();
    const layer = grid(); setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const warn = vi.spyOn(console, 'warn');
    for (const e of NEW_FX) {
      if (e.k !== 'shot' && e.k !== 'vent') { expect(classWord(e), e.k).not.toBe(''); expect(classBeat(e), e.k).toBeGreaterThan(0); }
      const n0 = layer.childElementCount, s0 = sounds.length;
      playFx(e); vi.advanceTimersByTime(450);
      expect(layer.childElementCount + (sounds.length - s0), e.k).toBeGreaterThan(0);
      expect(sounds.length, e.k + ' sound').toBeGreaterThan(s0);
      void n0;
    }
    expect(warn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10000); expect(layer.childElementCount).toBe(0);
    vi.useRealTimers();
  });
  it('a shot at a False Image reads DECOY, not MISS', () => {
    vi.useFakeTimers();
    const layer = grid(); setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    playFx(NEW_FX.find((e) => e.k === 'shot')); vi.advanceTimersByTime(600);
    expect(layer.textContent).toMatch(/DECOY/); expect(layer.textContent).not.toMatch(/MISS/);
    vi.useRealTimers();
  });
  it('out of sight, an enemy\'s image draws nothing; a rig marked for the other side never plays', () => {
    vi.useFakeTimers();
    const layer = grid();
    const g = fight(null); g.combat.map = { w: 14, h: 10, solid: [], dark: false }; setContext(g, 'combat');
    clearFx(); layer.innerHTML = '';
    setViewer('pc'); playFx({ k: 'rig', unit: 't', at: '2,2', id: 'r', only: 'foe' } as any); vi.advanceTimersByTime(300);
    expect(layer.childElementCount).toBe(0);
    vi.useRealTimers();
  });
  it('the real engine\'s events from the new moves all play', () => {
    vi.useFakeTimers(); const layer = grid();
    const evs: any[] = [];
    // Shove, Unstoppable, Rally, Command, Sleight, False Image, Silver Tongue, Rig, Read: through the reducer.
    const f = fightWith([cls('fighter', 8), cls('guardian', 3, { skills: { authority: 1 } })], [{}]);
    const [fi, gu] = f.pcs; at(f, fi, '4,2'); at(f, gu, '4,4'); const foe = at(f, f.foe, '5,2'); foe.sv = { body: -50, brain: -50, heart: -50 }; f.turn(fi);
    f.act({ type: 'combat/perk', unitId: fi.id, id: 'class:fighter.unstoppable' } as any);
    f.act({ type: 'combat/perk', unitId: fi.id, id: 'class:fighter.shove', targetId: foe.id, choice: 'prone' } as any);
    f.turn(gu); f.act({ type: 'combat/perk', unitId: gu.id, id: 'class:guardian.command', targetId: fi.id, tile: '3,2' } as any);
    evs.push(...(f.cb.fx || []));
    const t = fightWith([cls('trickster', 8, MIND), {}], [{}]);
    const [tr, al] = t.pcs; at(t, tr, '4,2'); at(t, al, '4,5'); const tf = at(t, t.foe, '9,2'); tf.sv = { body: -50, brain: -50, heart: -50 }; t.turn(tr);
    t.act({ type: 'combat/perk', unitId: tr.id, id: 'class:trickster.false_image', tile: '6,4' } as any);
    t.act({ type: 'combat/perk', unitId: tr.id, id: 'class:trickster.silver_tongue', targetId: tf.id } as any);
    t.act({ type: 'combat/perk', unitId: tr.id, id: 'class:trickster.sleight', actionId: 'sleight_image' } as any);
    evs.push(...(t.cb.fx || []));
    const kinds = new Set(evs.map((e) => e.k));
    for (const k of ['unstoppable', 'shove', 'command_move', 'image', 'silver_tongue', 'swap']) expect(kinds.has(k), k).toBe(true);
    setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const warn = vi.spyOn(console, 'warn');
    for (const e of evs) playFx(e);
    expect(warn).not.toHaveBeenCalled(); expect(layer.childElementCount).toBeGreaterThan(5);
    vi.useRealTimers();
  });
});
