// The Outbursts door on the fight screen (0.29 onboarding): the door line from data, the first turn's tab, the design
// card without an Emanator, the turn card's Outburst button with the held stage and the MP, and the first-fight tip.
// Every fight here is the engine's own (newCharacter, startCombat, beginOutburst); the rows are actionGroups'.
import { describe, expect, it, vi } from 'vitest';
vi.mock('./store', () => ({ getState: () => ({}), subscribe: () => () => {} })); // tips.tsx reads the store; these tests hand it the state
import { ARCHETYPES, type Sheet, SKILL, SIGIL_GRAMMAR, SOUL_RULES, newCharacter, startCombat, beginOutburst, pumpOutburst, SPELL_AP, DOOR_TABS } from '@engine';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { ATTR_INK } from './classView';
import { DOORS, topDoor, firstTurnTab, tabDoorLine } from './doorView';
import { designCards } from './heartView';
import { smartCommands, actionGroups } from './commands';
import { TIPS, DOOR_TIPS, myDoorTurn } from './tips';

// (no Durability unless asked: since Guard 2.0 it is a door too, and the preset's would be the top one)
const sheet = (skills: Record<string, number>): Sheet => {
  const a = ARCHETYPES[0];
  return { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset, durability: 0, ...skills }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const DESIGN = { id: 'sb', name: 'Soul Bolt', school: 'damage', modules: [] as string[] };
const rng = { state: 7 } as any;
/** A fight on its first round, the caster to act. hand: what the caster holds in the main hand ('emanator' or none). */
function fight(skills: Record<string, number>, hand?: string) {
  const c: any = newCharacter('c1', 'p1', sheet(skills));
  c.outbursts = [{ ...DESIGN }]; c.soulKnown = { schools: ['damage'], modules: [], tones: [] };
  if (hand) c.weapon = hand;
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'fists', at: 'E6' }], 'easy', { state: 4 }, []);
  cb.turn = cb.order.indexOf(cb.units.find((x: any) => x.side === 'pc').id);
  const u = cb.units.find((x: any) => x.side === 'pc'); u.ap = 6;
  return { c, cb, u };
}

describe('the Outbursts door', () => {
  it('its line is the data\'s (skills.json door_line) and heads the Outbursts tab', () => {
    const d = DOORS.find((x) => x.skill === 'will_power')!;
    expect(d.line).toBe((SKILL.will_power as any).door_line);
    expect(d.line).toMatch(/^Your door is Outbursts: .*Begin a design, Pump it up .*then Release it; .*Go \d+ past your Strain limit and your heart shorts \(a Mana Short\): .*Mana Shock: each turn you end still over your limit costs \d+% of your max HP, until your heart calms or the fight ends\.$/); // rules 1.56, the Mana Short and the Mana Shock after it (0.31.x: said to the player)
    expect(tabDoorLine('outbursts')).toBe(d);
    expect(tabDoorLine('move')).toBeNull();
  });
  it('the first turn of a fight opens on Outbursts when Will Power is the top door; not after the first round, not for another top door', () => {
    const { c, cb, u } = fight({ will_power: 3, brain_power: 1, raw_power: 0, dexterity: 0 });
    expect(topDoor(c)!.skill).toBe('will_power');
    const groups = actionGroups(cb, u, c);
    expect(groups.map((g) => g[3])).toContain('outbursts');
    expect(firstTurnTab(cb, c, groups)).toBe('outbursts');
    cb.round = 2; // after the first round the tab used last wins (combat.js tabMem)
    expect(firstTurnTab(cb, c, actionGroups(cb, u, c))).toBeNull();
    const o = fight({ will_power: 0 });
    expect(firstTurnTab(o.cb, o.c, actionGroups(o.cb, o.u, o.c))).toBeNull();
  });
  it('with no action usable now on the tab (no AP), the first turn keeps the usual rule', () => {
    const { c, cb, u } = fight({ will_power: 3 });
    u.ap = 0;
    const groups = actionGroups(cb, u, c), soul = groups.find((g) => g[3] === 'outbursts');
    if (soul && soul[1].some((it) => !it[4])) return; // (a free row on the tab is a usable action: the tab opens, rightly)
    expect(firstTurnTab(cb, c, groups)).toBeNull();
  });
  it('a design card with no Emanator says what that costs, with the Strain from the data', () => {
    const { cb, u } = fight({ will_power: 3 });
    expect(u.mg.emanator).toBe(false); // (this caster holds no Emanator)
    const n = (SOUL_RULES as any).cycle.no_emanator_strain;
    expect(designCards(cb, u)[0].costText).toMatch(new RegExp(' · No Emanator: \\+' + n + ' Strain, paid from the air$'));
    const e = fight({ will_power: 3 }, 'emanator');
    expect(e.u.mg.emanator).toBe(true);
    expect(designCards(e.cb, e.u)[0].costText).not.toMatch(/No Emanator/);
  });
  it('the turn card\'s Outburst button shows the held stage and the MP, held or not', () => {
    const { cb, u } = fight({ will_power: 3 }, 'emanator');
    u.mg.mp = 120; u.mg.mpMax = 200;
    expect(smartCommands(u).find((x) => x.action === 'outburst')!.sub).toBe('Not held · 120 MP');
    expect(beginOutburst(cb, rng, u, 'sb', undefined, true)).toBeNull();
    u.ap = 6; expect(pumpOutburst(cb, rng, u)).toBeNull();
    const st = u.mg.held.stage, rel = smartCommands(u).find((x) => x.action === 'release')!;
    expect(st).toBe(1);
    expect(rel.sub).toBe('Stage ' + st + ' · ' + Math.round(u.mg.mp) + ' MP · ' + SPELL_AP.release + ' AP');
    const air = fight({ will_power: 3 });
    expect(smartCommands(air.u).find((x) => x.action === 'outburst')!.sub).toBe('Not held · from the air');
  });
  it('the first-fight tip is the door\'s line, once it is my turn with a character that has the door', () => {
    const { c, cb } = fight({ will_power: 3 });
    const tip = TIPS.find((t) => t.id === 'door:will_power')!;
    expect(tip.text).toBe((SKILL.will_power as any).door_line);
    const st = (screen: string, owner: string): any => ({ screen, me: { id: 'p1' }, game: { combat: cb, characters: { c1: { ...c, owner } } } });
    expect(tip.when(st('combat', 'p1'))).toBe(true);
    expect(tip.when(st('combat', 'p2'))).toBe(false); // someone else's character
    expect(tip.when(st('main', 'p1'))).toBe(false);
    const o = fight({ will_power: 0 });
    expect(tip.when({ screen: 'combat', me: { id: 'p1' }, game: { combat: o.cb, characters: { c1: { ...o.c, owner: 'p1' } } } } as any)).toBe(false);
  });
});

// The Sigils door (moved here from doorLine.test.ts when the two door modules became one, 0.29 merge): the line is
// skills.json's, its numbers the engine's; the first turn opens on the top door's tab only when it has a usable row.
const groups = (whyDraw: string, whyEvoke = whyDraw): any[] => [['MOVE', [['move', 'Move', '1 AP', '', '']], null, 'move'], ['ATTACK', [['tq:main:shot', 'Shot', '2 AP', '', '']], null, 'attack'],
  ['MAGIC · SIGILS', [['draw', 'Draw', '1 AP', '', whyDraw], ['evoke', 'Evoke', '2 AP', '', whyEvoke]], null, 'sigils']];
const sigilist = { skills: { brain_power: 3, hand_eye: 1 } };
describe('the Sigils door', () => {
  it("its line is skills.json's, its numbers the Sigil grammar's (never typed), on the sigils tab", () => {
    const d = tabDoorLine('sigils')!;
    expect(d).toMatchObject({ skill: 'brain_power', tab: (SKILL.brain_power as any).door_tab });
    expect((SKILL.brain_power as any).door_numbers).toMatchObject({ line_min: SIGIL_GRAMMAR.min_glyphs, line_max: SIGIL_GRAMMAR.max_glyphs }); // ordinary {=placeholders} of its row (tools/validate.py holds the copy equal)
    expect(d.line).toContain('until ' + SIGIL_GRAMMAR.min_glyphs + ' to ' + SIGIL_GRAMMAR.max_glyphs + ' words make a straight row'); expect(d.line).toMatch(/^Your door is Sigils: /);
    expect(d.line).not.toMatch(/\{/);
  });
  it("the first turn: the top door's tab when its first action is usable; else the usual rule (null)", () => {
    const cb = { round: 1 };
    expect(topDoor(sigilist)!.skill).toBe('brain_power');
    expect(firstTurnTab(cb, sigilist, groups(''))).toBe('sigils');
    expect(firstTurnTab(cb, sigilist, groups('Needs an Evoker in hand.', ''))).toBeNull(); // its first action refused: not this tab
    expect(firstTurnTab({ round: 2 }, sigilist, groups(''))).toBeNull(); // after the first round: the tab used last
    expect(firstTurnTab(cb, { skills: { hand_eye: 4 } }, groups(''))).toBeNull(); // no door with a line
    expect(firstTurnTab(cb, sigilist, groups('').filter((x) => x[3] !== 'sigils'))).toBeNull(); // no Sigils tab
    // a read-only row (the isInfo test) is not a usable action
    expect(firstTurnTab(cb, sigilist, [['S', [['pki:x', 'x', '', '', ''], ['draw', 'Draw', '', '', 'No.']], null, 'sigils']] as any, (k) => k.startsWith('pki:'))).toBeNull();
  });
  it('the tip: one per door with a line, after the COMBAT tip, on my turn when it is my top door; one door tip a fight', () => {
    expect(DOOR_TIPS.map((t) => t.id)).toEqual(DOORS.map((d) => 'door:' + d.skill));
    const t = DOOR_TIPS.find((x) => x.id === 'door:brain_power')!; expect(t.title).toBe('SIGILS'); expect(t.text).toBe(tabDoorLine('sigils')!.line);
    expect(TIPS.findIndex((x) => x.id === 'combat')).toBeLessThan(TIPS.findIndex((x) => x.id === t.id));
    const st = (o: any = {}, skills: any = { brain_power: 2 }) => ({ screen: 'combat', me: { id: 'p1' }, game: { characters: { c1: { owner: 'p1', skills }, c2: { owner: 'p2', skills: { brain_power: 2 } } },
      combat: { name: 'Yard', turn: 0, round: 1, order: ['u1', 'u2'], units: [{ id: 'u1', side: 'pc', charId: 'c1' }, { id: 'u2', side: 'pc', charId: 'c2' }], ...o } } } as any);
    expect(t.when(st())).toBe(true); expect(myDoorTurn(st(), 'brain_power')).toBe(true);
    expect(t.when(st({ turn: 1 }))).toBe(false); // someone else's turn
    expect(t.when(st({ over: true }))).toBe(false);
    expect(t.when({ ...st(), screen: 'main' })).toBe(false);
    expect(myDoorTurn(st(), 'will_power')).toBe(false); // not my door
    // two doors: only the top door's tip shows (the doors never nag)
    const both = st({}, { brain_power: 3, will_power: 1 });
    expect(DOOR_TIPS.filter((x) => x.when(both)).map((x) => x.id)).toEqual(['door:brain_power']);
  });
});

// The 0.29 consolidation (SF4): a door system's fight tab is headed from data, never typed in the client: the tab
// (the engine's DOOR_TABS), its title (the door skill's door_title) and its ink (the skill's attribute ink).
describe('the door tabs\' headers come from data', () => {
  it('each tab of DOOR_TABS has a door with a title and its attribute ink; the fight screen draws them', () => {
    for (const { tab } of Object.values(DOOR_TABS)) {
      const d = tabDoorLine(tab)!; expect(d, tab).toBeTruthy();
      expect(d.title).toBe((SKILL as any)[d.skill].door_title); expect(d.ink).toBe(ATTR_INK[d.attribute]);
    }
    const f = physFight([{ weapon: 'service_pistol', skills: { ingenuity: 3 } }], [{}]);
    f.put(f.pc, '2,2'); f.put(f.foe, '9,2'); f.cb.order = [f.pc.id, f.foe.id]; f.turn(f.pc);
    const G = f.bound(() => actionGroups(f.cb, f.unit(f.pc.id), f.char(f.pc), { g: f.g, noNarrator: true }));
    const sh = G.find((gr: any) => gr[3] === 'shadow'), d = tabDoorLine('shadow')!;
    expect(sh?.[0]).toBe(d.title); expect(sh?.[2]).toBe(d.ink);
  });
});
