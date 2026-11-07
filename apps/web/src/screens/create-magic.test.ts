// Character creation's starting magic picks (spec: The Magic panel and learning): the sheet the Create screen submits
// carries legal picks, the defaults are preselected, and a build that can't cast gets none.
import { describe, expect, it, vi } from 'vitest';
import { validateSheet, newCharacter, startingMagicError } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' } });
vi.stubGlobal('location', { search: '', hash: '' });
const { CreateLogic } = await import('./create.js');

/** A Create screen with a legal build (a 10-point preset), on the given kit. */
function screen(skills: Record<string, number>, kit: string) {
  const l: any = new CreateLogic({ sampleName: 'Test', sampleArch: 'bulwark' });
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  l.state = { ...l.state, skills, aSet: {}, cSet: {}, kit, name: 'Test' };
  return l;
}

describe('starting magic on the Create screen', () => {
  it('a caster gets the defaults preselected, shown and legal', () => {
    const l = screen({ brain_power: 3, will_power: 3, rumination: 2, empathy: 2 }, 'sigil');
    const v = l.renderVals();
    expect(v.canSigil && v.canSoul && v.hasMagic).toBe(true);
    expect(v.sigilVerdict).toMatch(/^✓ SPARK \+ CONDENSE: A bolt of sparks/);
    expect(v.obVerdict).toMatch(/^✓ Damage Outburst: Damage · Move/);
    const s = l.sheet();
    expect(s.sigils).toEqual(['spark', 'condense']);
    expect(s.outburst).toEqual({ school: 'damage', modules: ['move'] });
  });
  it('the Stack summary reads its numbers from the engine: PUSH reach and STAY on the stack\'s own tile', () => {
    const l = screen({ brain_power: 3, rumination: 2 }, 'sigil');
    let v = l.renderVals();
    const word = (id: string) => v.sigilGroups.flatMap((g: any) => g.words).find((w: any) => w.id === id);
    word('push').pick(); v = l.renderVals();
    expect(v.sigilVerdict).toMatch(/up to 9 tiles from the stack/); // 8 + floor(Rumination 2 / 2)
    word('stay').pick(); v = l.renderVals();
    expect(v.sigilVerdict).toMatch(/standing on the stack's own tile.*for up to 3 rounds/); // 2 + floor(Brain Power 3 / 2)
    expect(v.sigilVerdict).not.toMatch(/next to the stack/);
  });
  it('picking a third word swaps the one doing the same job; TWICE is off the board', () => {
    const l = screen({ brain_power: 1 }, 'sigil');
    let v = l.renderVals();
    const word = (id: string) => v.sigilGroups.flatMap((g: any) => g.words).find((w: any) => w.id === id);
    word('ward').pick(); v = l.renderVals(); expect(l.state.sigils).toEqual(['ward', 'condense']);
    word('return').pick(); v = l.renderVals(); expect(l.state.sigils).toEqual(['ward', 'return']);
    expect(v.sigilVerdict).toMatch(/^✓ WARD \+ RETURN/);
    expect(word('twice').disabled).toBe(true);
    word('ward').pick(); v = l.renderVals(); expect(v.sigilVerdict).toMatch(/^◆ Pick 1 more word/);
    expect(v.cantLock).toBe(true);
  });
  it('Outburst: school options, exactly one module to start (spec), and a name', () => {
    const l = screen({ will_power: 3 }, 'soul');
    let v = l.renderVals();
    expect(v.slotChip).toBe('ONE MODULE TO START · 2 SLOTS FOR DESIGNS IN PLAY');
    v.schoolCards.find((c: any) => c.name === 'BUFF').pick(); v = l.renderVals();
    expect(v.obOpts.map((o: any) => o.name)).toEqual(['+2 to hit', '+2 Defense', 'Heal 30']);
    v.obOpts[1].pick(); v = l.renderVals();
    const mod = (n: string) => v.modGroups.flatMap((g: any) => g.mods).find((m: any) => m.name === n);
    mod('Swift').pick(); v = l.renderVals(); mod('Homing').pick(); v = l.renderVals(); // each pick replaces the one module
    expect(mod('Homing').pressed).toBe('true'); expect(mod('Swift').pressed).toBe('false');
    mod('Homing').pick(); v = l.renderVals(); expect(l.state.ob.modules).toEqual(['homing']); // can't drop to none
    v.onObName({ target: { value: 'Steady Hands' } });
    const s = l.sheet();
    expect(s.outburst).toEqual({ name: 'Steady Hands', school: 'buff', modules: ['homing'], option: 'defense' });
    expect(startingMagicError(s)).toBeNull();
    expect(startingMagicError({ ...s, outburst: { ...s.outburst, modules: ['swift', 'homing'] } })).toMatch(/exactly one module/);
    expect(startingMagicError({ ...s, outburst: { ...s.outburst, modules: [] } })).toMatch(/exactly one module/);
    const c = newCharacter('c1', 'p1', { ...s, skills: { will_power: 3 } });
    expect(c.outbursts?.[0]).toMatchObject({ name: 'Steady Hands', school: 'buff', option: 'defense' });
  });
  it('a build that can\'t cast shows and submits no magic', () => {
    const l = screen({ athletics: 3 }, 'medic');
    const v = l.renderVals();
    expect(v.hasMagic).toBe(false);
    expect(v.checks.some((c: any) => /Sigil|Outburst/.test(c.label))).toBe(false);
    const s = l.sheet();
    expect(s.sigils).toBeUndefined(); expect(s.outburst).toBeUndefined();
  });
  it('full archetype sheets with picks pass validateSheet and keep them through newCharacter', () => {
    for (const arch of ['scholar', 'stormcaller', 'witch_hunter']) {
      const l: any = new CreateLogic({ sampleName: 'Test', sampleArch: arch });
      l.setState = (x: any) => { l.state = { ...l.state, ...x }; };
      let v = l.renderVals();
      if (v.canSigil) { v.sigilGroups.flatMap((g: any) => g.words).find((w: any) => w.id === 'fire').pick(); v = l.renderVals(); }
      if (v.canSoul) { v.schoolCards.find((c: any) => c.name === 'STATUS').pick(); v = l.renderVals(); }
      const s = l.sheet();
      expect(validateSheet(s)).toBeNull();
      const c = newCharacter('c1', 'p1', s);
      if (v.canSigil) expect(c.sigils).toEqual(['fire', 'condense']);
      if (v.canSoul) expect(c.outbursts?.[0]).toMatchObject({ school: 'status', option: 'shaken', modules: ['move'] });
    }
  });
});
