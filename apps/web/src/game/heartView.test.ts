// Outburst 2.0 on screen (game/heartView.ts): design cards with a shape icon and their line, the HEART panel's costs
// and refusals (the engine's), the grid preview that tells an area from a bolt, and the cut-in's top commands.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, newCharacter, startCombat, beginOutburst, pumpOutburst, releaseOutburst, previewPump, pumpsAp } from '@engine';
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
    expect(v.effects).toMatch(/At stage 1: \d+ damage \(snap \d+, stage 4 \d+\); then Push 3 tiles \(half\)/); // rules 1.19: the table tops out at ×1.6
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
    expect(p.stages.map((s) => s.mult)).toEqual([0.8, 1, 1.2, 1.4, 1.6]);
    expect(p.pump.ok).toBe(true);
    expect(p.pump.cost).toBe(u.mg.freePumps > 0 ? 'FREE' : '1 AP');
    expect(p.feedShow).toBe(false); // no glyph on your tile
    for (let i = 0; i < 3; i++) expect(pumpOutburst(cb, rng, u)).toBeNull();
    p = heartPanel(cb, u)!;
    expect(p.stage).toBe(3); expect(p.mult).toBe(1.4);
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

// Rules 1.14: the three Will Power changes on screen. The fight() character has Will Power 6, so Overdraw is theirs.
describe('rules 1.14: Overdraw, Heart Overload and Resonance on the HEART panel and the design cards', () => {
  const OD = 'skill:will_power.2#overdraw';
  /** fight(), with these perks and this Will Power on the character before the fight is built. */
  function withPerks(perks: Record<string, string>, will = 6) {
    const c: any = newCharacter('c1', 'p1', sheetFrom('Vale')); c.skills.will_power = will;
    c.perks = Object.entries(perks).map(([id, tier]) => ({ id, tier }));
    c.outbursts = DESIGNS.map((d) => ({ ...d, modules: [...d.modules] })); c.soulKnown = { schools: ['damage', 'control'], modules: ['burst', 'wave'], tones: ['fire'] };
    const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'fists', at: 'E6' }, { name: 'Keel', tier: 'soldier', weapon: 'fists', at: 'E7' }], 'easy', { state: 4 }, []);
    cb.turn = cb.order.indexOf(cb.units.find((x: any) => x.side === 'pc').id);
    const u = cb.units.find((x: any) => x.side === 'pc'); u.mg.mp = 400; u.mg.mpMax = 400;
    u.mg.firstUsed = true; u.mg.freePumps = 0; u.mg.freePumpsMax = 0; u.mg.strainLimit = 20; u.ap = 9; u.mg.emanator = true; // an Emanator in hand
    return { c, cb, u };
  }
  /** Begin sb, set its stage, Release it at the Raider. */
  const fire = (cb: any, u: any, stage: number) => { expect(beginOutburst(cb, rng, u, 'sb', undefined, true)).toBeNull(); u.mg.held.stage = stage; u.ap = 9; expect(releaseOutburst(cb, rng, u, '4,5')).toBeNull(); };

  it('Overdraw is offered every turn: the Pump button says it is ready, and with the switch on shows 2 stages and its Strain', () => {
    const { cb, u } = withPerks({}); beginOutburst(cb, rng, u, 'sb', undefined, true);
    let p = heartPanel(cb, u)!;
    expect(p.overdraw).toMatch(/^Overdraw is ready this turn\. This Pump adds 2 stages\. Your first Overdraw of the fight costs no Strain\.$/);
    expect(p.pump.title).toMatch(/^A plain Pump: stage 0 → 1 .*Overdraw is ready this turn/);
    p = heartPanel(cb, u, [OD])!;
    // rules 1.24: both of its stages cost MP (10% + 20% of the Begin's 17: 5)
    expect(p.pump).toMatchObject({ ok: true, cost: '1 AP · 5 MP', mp: 5 }); expect(p.pump.title).toMatch(/^An Overdraw Pump: stage 0 → 2 \(120% power\)\. It takes 5 MP \(you have 383\)\. Overdraw: 2 stages\. No Strain: your first Overdraw of the fight\.$/);
    expect(p.stages.find((x) => x.next)!.n).toBe(2); // the meter marks the stage this Pump reaches
    // Used this turn: the panel says why it isn't there; next turn it is ready again, now for 1 Strain.
    cb.mods = [OD]; pumpOutburst(cb, rng, u); delete cb.mods; u.mg.held.stage = 1;
    expect(heartPanel(cb, u)!.overdraw).toBe('Overdraw: Once a turn.');
    cb.round += 1;
    expect(heartPanel(cb, u)!.overdraw).toMatch(/^Overdraw is ready this turn\. This Pump adds 2 stages\. You take 1 Strain after it\.$/);
    expect(heartPanel(cb, u, [OD])!.pump.title).toMatch(/stage 1 → 3 .*You take 1 Strain after it\./);
  });
  it('rules 1.24: the Pump button shows the MP the Pump will take, from the engine; a free Pump still owes it; short of MP it says so', () => {
    const { cb, u } = withPerks({}, 1); beginOutburst(cb, rng, u, 'sb', undefined, true); // Soul Bolt: 17 MP for this caster (Will Power 1: no Overdraw, rules 1.75 item 6200)
    let p = heartPanel(cb, u)!;
    expect(p.pump).toMatchObject({ ok: true, cost: '1 AP · 2 MP', mp: previewPump(cb, u).mp }); expect(p.pump.mp).toBe(2);
    expect(p.pump.title).toBe('A plain Pump: stage 0 → 1 (100% power). It takes 2 MP (you have 383).');
    u.mg.freePumps = 1; u.mg.freePumpsMax = 1; // Empathy's free Pump: no AP, the MP is still owed
    p = heartPanel(cb, u)!;
    expect(p.pump).toMatchObject({ ok: true, free: true, cost: '0 AP · 2 MP' }); expect(p.pump.title).toBe('A plain Pump: stage 0 → 1 (100% power). This is your free Pump for this turn: it costs no AP, and 2 MP (you have 383).');
    expect(heartVals(p, () => {}).btns!.find((b: any) => b.key === 'pump')!.cost).toBe('0 AP · 2 MP');
    expect(p.feelings.every((f) => !f.ok || f.cost === '0 AP · 2 MP')).toBe(true); // a feeling Pump costs the same
    pumpOutburst(cb, rng, u); expect(u.mg.mp).toBe(381);
    expect(heartPanel(cb, u)!.pump).toMatchObject({ cost: '1 AP · 3 MP', mp: 3 }); // stage 2: 20% of the Begin
    u.mg.mp = 2;
    p = heartPanel(cb, u)!;
    expect(p.pump).toMatchObject({ ok: false, why: 'A Pump to stage 2 needs 3 MP (2): Syphon first, or Release what you hold.' });
    expect(heartVals(p, () => {}).btns!.find((b: any) => b.key === 'pump')!.cost).toMatch(/^✕ A Pump to stage 2 needs 3 MP/);
    expect(p.revert.title).toMatch(/the AP, MP and Strain it cost/);
    u.mg.emanator = false; u.mg.mp = 0; // no Emanator in hand: the heart draws on the air, and a Pump takes no MP
    expect(heartPanel(cb, u)!.pump).toMatchObject({ ok: true, cost: '1 AP', mp: 0 });
  });
  it('outside playtest 0.31.10 row 6: a feeling button prices its Pump with the switches the action carries (Overdraw), as the reducer charges it; the free-Pump badge follows the engine', () => {
    const { cb, u } = withPerks({}, 6); u.mg.feelings = ['rage']; beginOutburst(cb, rng, u, 'sb', undefined, true);
    u.mg.freePumps = 1; u.mg.freePumpsMax = 1; // a free Pump this turn
    // item J (0.31.11): the badge counts the leading Pumps the engine's pumpsAp prices at 0 AP (one a turn: rules 1.19)
    expect(heartPanel(cb, u)!.freePumps).toBe(1); expect(pumpsAp(cb, u, u.mg.designs.find((x: any) => x.id === u.mg.held.design), 2, u.mg.held.stage)).toBeGreaterThan(0);
    const p = heartPanel(cb, u, [OD])!, rage = p.feelings.find((f) => f.id === 'rage')!;
    expect(rage.cost).toBe(p.pump.cost); // the plain Pump with the same switch: one price
    const ap0 = u.ap, mp0 = u.mg.mp; cb.mods = [OD]; expect(pumpOutburst(cb, rng, u, 'rage')).toBeNull(); delete cb.mods;
    expect((ap0 - u.ap) + ' AP · ' + (mp0 - u.mg.mp) + ' MP').toBe(rage.cost);
    // the free stage of this turn is gone: the badge says none, as the next Pump's price does
    const q = heartPanel(cb, u)!;
    expect(q.pump.free).toBe(false); expect(q.freePumps).toBe(0);
  });
  it('a character without Overdraw has no Overdraw line', () => {
    const { cb, u } = withPerks({}, 1); beginOutburst(cb, rng, u, 'sb', undefined, true); // rules 1.75 item 6200: Overdraw from Will Power 2
    expect(heartPanel(cb, u)!.overdraw).toBe(''); expect(heartPanel(cb, u)!.pump.title).not.toMatch(/Overdraw/);
  });
  it('a preview never writes on the fight it is given: the switches ride on the engine\'s copy (engine review 4, finding 2)', () => {
    // The old client set cb.mods on the live fight for the length of a preview. Here a write to the live fight's mods
    // is caught, and the fight is deeply equal after every preview.
    const writes: string[] = [];
    const trap = (cb: any) => Object.defineProperty(cb, 'mods', { configurable: true, enumerable: false, get: () => undefined, set: (v) => { writes.push(JSON.stringify(v)); } });
    // (rules 1.56: Heart Overload's switch is gone; the design cards still change nothing)
    const a = withPerks({}); fire(a.cb, a.u, 2); a.u.ap = 0;
    a.u.uses ||= {};
    const wasA = JSON.stringify(a.cb); trap(a.cb);
    designCards(a.cb, a.u);
    expect(JSON.stringify(a.cb)).toBe(wasA);
    const b = withPerks({}); beginOutburst(b.cb, rng, b.u, 'sb', undefined, true);
    b.u.uses ||= {}; // (the engine makes a unit's empty counter bag the first time anything reads a counter)
    const wasB = JSON.stringify(b.cb); trap(b.cb);
    const p = heartPanel(b.cb, b.u, [OD])!;
    expect(p.pump).toMatchObject({ ok: true, mp: 5 }); expect(p.steadyBtn).toBeTruthy(); expect(p.letgo).toBeTruthy(); // (the Overdraw Pump, read with its switch on)
    expect(JSON.stringify(b.cb)).toBe(wasB);
    expect(writes).toEqual([]);
  });
  it('Resonance: the bonus is in the Release preview before releasing (the panel, the button and the grid summary)', () => {
    const { cb, u } = withPerks({ resonance: 'I' }); fire(cb, u, 1);
    beginOutburst(cb, rng, u, 'sb', undefined, true); u.mg.held.stage = 2; u.ap = 9;
    const p = heartPanel(cb, u)!;
    expect(p.multNotes).toEqual(['Resonance +4%']); expect(p.mult).toBe(1.25); // ×1.2 at stage 2 (rules 1.19), +4% (rules 1.56)
    expect(p.release.title).toMatch(/^Fire it at stage 2 \(125% power\)\. Resonance \+4% is in that number/);
    const v: any = heartVals(p, () => {});
    expect(v.multText).toBe('125%'); expect(v.hasDoes).toBe(true); expect(v.doesText).toBe('Resonance +4%');
    const o = aimOverlay(cb, u, 'held', '4,5');
    expect(o.summary[0]).toBe('Resonance +4% to this Release, built by the Releases before it.');
    // A snap cast of a design shows it too.
    u.mg.held = null; expect(aimOverlay(cb, u, 'sb', '4,5').summary[0]).toMatch(/^Resonance \+4% to this Release/);
  });
  it('without the perk the panel has no Resonance note', () => {
    const { cb, u } = withPerks({}); fire(cb, u, 1); beginOutburst(cb, rng, u, 'sb', undefined, true);
    const p = heartPanel(cb, u)!; expect(p.multNotes).toEqual([]); expect((heartVals(p, () => {}) as any).hasDoes).toBe(false);
  });
});

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('rules 1.14: Heart Overload needs an Emanator

// Rules 1.57 (A2): a shield in hand stops the swell; the heart panel and the design cards say so in the engine's words
// (soul_modules.json cycle.swell.unless_text), with the game bound as the fight screen binds it.
describe('rules 1.57 (A2): the heart says a shield stops the swell', () => {
  it('a shield in the main hand: the cards and the held heart carry the line; without one they do not', async () => {
    const { fightWith, withGame } = await import('../../../../packages/engine/test/helpers/perkfight');
    const { SOUL_RULES, gearEntry, beginOutburst: begin } = await import('@engine');
    const LINE = String((SOUL_RULES as any).cycle.swell.unless_text);
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }], [{ tier: 'minion' }]);
    const c = f.g.characters[f.pc.charId!]; c.pack = [...(c.pack || []), { ...gearEntry('buckler')! }];
    let u = f.turn(f.pc); u.ap = 60; u.mg!.mp = 9999; u.mg!.mpMax = 9999;
    const id = 'dz'; u.mg!.designs.push({ id, name: 'Test', school: 'damage', modules: [] } as any);
    expect(withGame(f.g, () => designCards(f.cb, u)).every((k) => !k.costText.includes(LINE))).toBe(true);
    f.act({ type: 'combat/equip', unitId: u.id, item: 'buckler', to: 'main' } as any); u = f.unit(f.pc.id);
    expect(withGame(f.g, () => designCards(f.cb, u)).every((k) => k.costText.includes(LINE))).toBe(true);
    expect(withGame(f.g, () => begin(f.cb, { state: 7 } as any, u, id, undefined, true))).toBeNull();
    expect(withGame(f.g, () => heartPanel(f.cb, u))!.swell.startsWith(LINE)).toBe(true);
  });
});
