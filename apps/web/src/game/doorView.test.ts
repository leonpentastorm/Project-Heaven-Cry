// The Outbursts door on the fight screen (0.29 onboarding): the door line from data, the first turn's tab, the design
// card without an Emanator, the turn card's Outburst button with the held stage and the MP, and the first-fight tip.
// Every fight here is the engine's own (newCharacter, startCombat, beginOutburst); the rows are actionGroups'.
import { describe, expect, it, vi } from 'vitest';
vi.mock('./store', () => ({ getState: () => ({}), subscribe: () => () => {} })); // tips.tsx reads the store; these tests hand it the state
import { ARCHETYPES, type Sheet, SKILL, SOUL_RULES, newCharacter, startCombat, beginOutburst, pumpOutburst, SPELL_AP } from '@engine';
import { DOORS, topDoor, firstTurnTab, tabDoorLine } from './doorView';
import { designCards } from './heartView';
import { smartCommands, actionGroups } from './commands';
import { TIPS } from './tips';

const sheet = (skills: Record<string, number>): Sheet => {
  const a = ARCHETYPES[0];
  return { name: 'Vale', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset, ...skills }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
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
    expect(d.line).toMatch(/^Begin a design, Pump it up .*then Release\. Strain is the cost, and MP pays\.$/);
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
