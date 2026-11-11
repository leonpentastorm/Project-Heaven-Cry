// Outburst 2.0 on screen (game/heartView.ts): design cards with a shape icon and their line, the HEART panel's costs
// and refusals (the engine's), the grid preview that tells an area from a bolt, and the cut-in's top commands.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, newCharacter, startCombat, beginOutburst, pumpOutburst } from '@engine';
import { formIconSvg, designInfo, designCards, heartPanel, heartVals, aimOverlay, idleOverlay, overlayTileStyle, designVerdict, toneChips, FORMS } from './heartView';
import { smartCommands, actionGroups } from './commands';

const sheetFrom = (name = 'Test'): Sheet => {
  const a = ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset, will_power: 6, visualization: 2, empathy: 4 }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const DESIGNS = [
  { id: 'fb', name: 'Heartfire', school: 'damage', modules: ['burst'], tone: 'fire' },
  { id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] },
  { id: 'rw', name: 'Raw Wave', school: 'damage', school2: 'control', option2: 'push', modules: ['wave'] },
];
function fight() {
  const c: any = newCharacter('c1', 'p1', sheetFrom('Vale'));
  c.outbursts = DESIGNS.map((d) => ({ ...d, modules: [...d.modules] })); c.soulKnown = { schools: ['damage', 'control'], modules: ['burst', 'wave'], tones: ['fire'] };
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'fists', at: 'E6' }, { name: 'Keel', tier: 'soldier', weapon: 'fists', at: 'E7' }], 'easy', { state: 4 }, []);
  cb.turn = cb.order.indexOf(cb.units.find((x: any) => x.side === 'pc').id);
  const u = cb.units.find((x: any) => x.side === 'pc'); u.ap = 6; u.mg.mp = 400; u.mg.mpMax = 400;
  return { c, cb, u };
}
const rng = { state: 7 } as any;

describe('design cards', () => {
  it('each form has its own icon; the line reads shape · size · reach · tone · MP', () => {
    const svgs = FORMS.map((f) => formIconSvg(f));
    expect(new Set(svgs).size).toBe(5);
    const { u } = fight();
    const burst = designInfo(u.mg, DESIGNS[0]), bolt = designInfo(u.mg, DESIGNS[1]), wave = designInfo(u.mg, DESIGNS[2]);
    expect(burst.line).toMatch(/^BURST · radius 1 · reach \d+ · Fire · \d+ MP$/);
    expect(bolt.line).toMatch(/^BOLT · one target · reach \d+ · Raw · \d+ MP$/);
    expect(wave.line).toMatch(/^WAVE · cone 3 from you · Raw/); expect(wave.line).not.toMatch(/reach/);
    expect(burst.isArea).toBe(true); expect(bolt.isArea).toBe(false);
    expect(wave.schools).toMatch(/Damage.*\+ Control \(Push 3 tiles\) at half/);
  });
  it('Begin 2 AP and Snap 3 AP ×0.6, from the engine; a refusal comes back as the reason', () => {
    const { cb, u } = fight();
    const cards = designCards(cb, u);
    expect(cards.map((x) => x.beginAp)).toEqual([2, 2, 2]);
    expect(cards[0].snapAp).toBe(3); expect(cards[0].canBegin).toBe(true);
    u.ap = 1;
    expect(designCards(cb, u)[0]).toMatchObject({ canBegin: false, beginWhy: 'Needs 2 AP.' });
  });
  it('the workshop verdict names both effects with numbers, and the tone\'s rider', () => {
    const { u } = fight();
    const v = designVerdict(u.mg, DESIGNS[2]);
    expect(v.effects).toMatch(/At stage 1: \d+ damage \(snap ×0.8 \d+, stage 4 ×2.2 \d+\); then Push 3 tiles \(half\)/);
    expect(designVerdict(u.mg, DESIGNS[0]).rider).toMatch(/^Fire: armour counts half; stage 2–3 Burning/);
    expect(toneChips([], 1).find((t) => t.id === 'fire')).toMatchObject({ known: false, free: true });
    expect(toneChips(['storm'], 1).find((t) => t.id === 'fire')).toMatchObject({ known: false, free: false });
  });
});

describe('the HEART panel', () => {
  it('Begin, then the panel: stage meter, Pump cost (free from Empathy 3), Strain, Let go gives back only what swells cost', () => {
    const { cb, u } = fight();
    expect(beginOutburst(cb, rng, u, 'fb', undefined, true)).toBeNull();
    let p = heartPanel(cb, u)!;
    expect(p).toMatchObject({ name: 'Heartfire', stage: 0, tone: 'fire', form: 'burst' });
    expect(p.stages.map((s) => s.mult)).toEqual([0.8, 1, 1.4, 1.8, 2.2]);
    expect(p.pump.ok).toBe(true);
    expect(p.pump.cost).toBe(u.mg.freePumps > 0 ? 'FREE' : '1 AP');
    expect(p.feedShow).toBe(false); // no glyph on your tile
    for (let i = 0; i < 3; i++) expect(pumpOutburst(cb, rng, u)).toBeNull();
    p = heartPanel(cb, u)!;
    expect(p.stage).toBe(3); expect(p.mult).toBe(1.8);
    expect(p.letgo.strainOff).toBe(0); // pumped stages give no Strain back (spec item 541)
    u.mg.held.paid = 2; expect(heartPanel(cb, u)!.letgo.strainOff).toBe(Math.min(2, u.mg.strain)); p = heartPanel(cb, u)!;
    const v: any = heartVals(p, () => {});
    expect(v.stageText).toBe('STAGE 3 / 4'); expect(v.btns.map((b: any) => b.key)).toEqual(['pump', 'release', 'steady', 'letgo', 'heartwatch', 'revert']); // rules 1.8: Revert while a pump this turn can be taken back
    u.ap = 0;
    expect(heartPanel(cb, u)!.steadyBtn).toMatchObject({ ok: false, why: 'Needs 1 AP.' });
  });
  it('over the limit: the burn warning from the preview', () => {
    const { cb, u } = fight();
    beginOutburst(cb, rng, u, 'sb', undefined, true);
    u.mg.strain = u.mg.strainLimit + 1;
    expect(heartPanel(cb, u)!.warn).toMatch(/^OVER THE LIMIT: the heart burns you for 8 true damage/);
    u.mg.strain = u.mg.strainLimit + 3;
    expect(heartPanel(cb, u)!.warn).toMatch(/^MANA SHORT/);
  });
});

describe('the grid preview', () => {
  it('a Burst over two units: the hatched area, both marked ENEMY with damage after armour; a Bolt is one crosshair tile', () => {
    const { cb, u } = fight();
    const foe = cb.units.find((x: any) => x.name === 'Raider');
    const o = aimOverlay(cb, u, 'fb', foe.pos);
    expect(o.ok).toBe(true); expect(o.isArea).toBe(true);
    expect(o.area.size).toBeGreaterThan(4);
    expect([...o.marks.values()].map((m) => m.tag)).toEqual(['ENEMY', 'ENEMY']);
    expect([...o.marks.values()][0].text).toMatch(/^−\d+$/);
    expect(o.chip).toBe('BURST R1 · 2 ENEMIES');
    expect(overlayTileStyle(o, foe.pos)).toMatch(/repeating-linear-gradient/);
    expect(o.reach.size).toBeGreaterThan(10);
    const b = aimOverlay(cb, u, 'sb', foe.pos);
    expect(b.isArea).toBe(false); expect(b.area.size).toBe(1); expect(b.marks.size).toBe(1);
    expect(b.chip).toMatch(/^BOLT · ONE TARGET/);
    expect(overlayTileStyle(b, foe.pos)).toMatch(/double/);
    expect([...b.marks.values()][0].text).toMatch(/^−\d+ · \d+%$/); // a bolt rolls
    // Out of reach: the engine's reason on the chip.
    expect(aimOverlay(cb, u, 'sb', '15,5').chip).toMatch(/OUT OF REACH/);
  });
  it('everyone affected past the area (section 7): a held Storm bolt at stage 2 marks its chain target CHAIN with its number', () => {
    const { cb, u } = fight();
    u.mg.designs.push({ id: 'st', name: 'Storm Bolt', school: 'damage', modules: [], tone: 'storm' }); u.ap = 9;
    expect(beginOutburst(cb, rng, u, 'st', undefined, true)).toBeNull(); pumpOutburst(cb, rng, u); pumpOutburst(cb, rng, u);
    const foe = cb.units.find((x: any) => x.name === 'Raider'), keel = cb.units.find((x: any) => x.name === 'Keel');
    const o = aimOverlay(cb, u, 'held', foe.pos);
    expect(o.marks.get(foe.id)!.text).toMatch(/^−\d+ · \d+%$/);
    expect(o.marks.get(keel.id)).toMatchObject({ tag: 'ENEMY' }); expect(o.marks.get(keel.id)!.text).toMatch(/^CHAIN −\d+$/);
    expect(o.marks.get(keel.id)!.title).toMatch(/chain\): .*Storm chains from Raider at half/);
    expect(o.chip).toMatch(/2 ENEMIES/);
  });
  it('holding (not aiming): the reach ring faint and, for an elemental tone, the aura\'s adjacent tiles', () => {
    const { cb, u } = fight();
    beginOutburst(cb, rng, u, 'fb', undefined, true);
    const o = idleOverlay(cb, u);
    expect(o.mode).toBe('idle'); expect(o.aura.size).toBeGreaterThan(2); expect(o.reach.size).toBeGreaterThan(o.aura.size);
    expect(overlayTileStyle(o, [...o.aura][0])).toMatch(/dotted/);
  });
});

describe('the action list and the cut-in', () => {
  it('not holding: Outburst; holding: Pump, Release, Steady, Let go, Heart Overwatch, with the engine\'s costs', () => {
    const { cb, u } = fight();
    const tab = () => actionGroups(cb, u, null).find((g) => g[3] === 'outbursts')![1].map((x) => x[0]);
    expect(tab()).toContain('outburst');
    beginOutburst(cb, rng, u, 'fb', undefined, true);
    expect(tab()).toEqual(expect.arrayContaining(['pump', 'release', 'steady', 'letgo', 'heartwatch']));
    expect(tab()).not.toContain('outburst');
  });
  it('holding: Pump and Release are the cut-in\'s first two commands', () => {
    const { cb, u } = fight();
    expect(smartCommands(u)[0].action).not.toBe('pump');
    beginOutburst(cb, rng, u, 'fb', undefined, true);
    const cmds = smartCommands(u);
    expect(cmds.slice(0, 2).map((c) => c.action)).toEqual(['pump', 'release']);
    expect(cmds[0].sub).toMatch(/Stage 0 → 1/);
  });
});
