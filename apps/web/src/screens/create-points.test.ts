// Character creation's points step (screens/create.js): nine attributes under three family names, each with its three
// skills under it. A skill raised past its attribute spends the Attribute points for it; a refusal says what is short
// and what to do; the last point can be undone and one attribute reset. No Core points anywhere on the step.
import { describe, expect, it, vi } from 'vitest';
import { validateSheet, BUDGET, FOG_CORE, SKILL, checkModOf } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' } });
vi.stubGlobal('location', { search: '', hash: '' });
const { CreateLogic, _setSkill, _setAttr, _resetAttr, _pointsTodo } = await import('./create.js');
const { D } = await import('./shared');

function screen(props: any = { startStep: 'skills' }) {
  const l: any = new CreateLogic(props);
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  return l;
}
const attrOf = (v: any, id: string) => v.families.flatMap((f: any) => f.attrs).find((a: any) => a.key === id);
const skillOf = (v: any, id: string) => v.families.flatMap((f: any) => f.attrs).flatMap((a: any) => a.cards).find((k: any) => k.key === id);
const meter = (v: any, i: number) => v.points.meters[i].text;
const press = (l: any, id: string, n: number) => { for (let i = 0; i < n; i++) skillOf(l.renderVals(), id).inc(); };

describe('the points step: layout', () => {
  it('three family headings, nine attributes, each with its own three skills in the order fight, survive, talk', () => {
    const v = screen().renderVals();
    expect(v.families.map((f: any) => f.name)).toEqual(['BODY', 'MIND', 'SOUL']);
    expect(v.families.flatMap((f: any) => f.attrs)).toHaveLength(9);
    for (const f of v.families) for (const a of f.attrs) {
      expect(a.cards.map((k: any) => k.slot)).toEqual(['alpha', 'beta', 'gamma']);
      expect(a.cards.every((k: any) => k.attr === a.key)).toBe(true);
      expect(a.cards.map((k: any) => k.tag)).toEqual(['FIGHT', 'SURVIVE', 'TALK · NOTICE']);
    }
  });
  it('no Core numbers, steppers or words: families are a name and a line of text', () => {
    const v = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'skills' }).renderVals();
    for (const f of v.families) { expect(f.val).toBeUndefined(); expect(f.up).toBeUndefined(); expect(f.down).toBeUndefined(); }
    expect(v.coreCols).toBeUndefined();
    const text = JSON.stringify([v.points.meters.map((m: any) => [m.label, m.text, m.note]), v.points.todo, v.points.note, v.budgetChip, v.checks.map((c: any) => c.label), v.tree.map((t: any) => [t.name, t.val, t.word])]);
    expect(text).not.toMatch(/core/i);
  });
  it('both budgets are shown, and what is still to place, in plain words', () => {
    const l = screen();
    let v = l.renderVals();
    expect(meter(v, 0)).toBe('10 LEFT OF 10'); expect(meter(v, 1)).toBe('10 LEFT OF 10');
    expect(v.points.todo).toBe('◆ Still to place: 10 Skill points and 10 Attribute points.');
    press(l, 'durability', 1);
    v = l.renderVals();
    expect(meter(v, 0)).toBe('9 LEFT OF 10');
    expect(v.points.todo).toBe('◆ Still to place: 9 Skill points and 10 Attribute points.');
    expect(v.budgetChip).toBe('9 SKILL · 10 ATTRIBUTE LEFT');
  });
  it('Mind Without Fog shows its 2 extra Attribute points', () => {
    const l = screen();
    l.state.traits = ['mind_without_fog'];
    const v = l.renderVals();
    expect(FOG_CORE).toBe(2);
    expect(meter(v, 1)).toBe('12 LEFT OF 12');
    expect(v.points.meters[1].note).toBe('+2 from Mind Without Fog');
    expect(v.points.meters[0].note).toBe('');
  });
});

describe('the points step: a skill pulls its attribute up', () => {
  it('raising a skill past its attribute spends the Attribute point and says so', () => {
    const l = screen();
    press(l, 'dexterity', 1); // Agility starts at 1: Dexterity 1 fits under it
    expect(l.state.note).toEqual({ kind: 'ok', text: 'Dexterity 1: 1 Skill point spent.' });
    press(l, 'dexterity', 1);
    expect(l.state.note.text).toBe('Dexterity 2 needs Agility 2: 1 Attribute point spent.');
    press(l, 'dexterity', 2);
    expect(l.state.note.text).toBe('Dexterity 4 needs Agility 4: 1 Attribute point spent.');
    const v = l.renderVals();
    expect(attrOf(v, 'agility').val).toBe(4); expect(skillOf(v, 'dexterity').pts).toBe(4);
    expect(meter(v, 0)).toBe('6 LEFT OF 10'); expect(meter(v, 1)).toBe('7 LEFT OF 10');
    expect(v.points.note).toBe('✓ Dexterity 4 needs Agility 4: 1 Attribute point spent.');
  });
  it('a skill under its attribute costs no Attribute point; the next one that would says so before the click', () => {
    const l = screen();
    press(l, 'dexterity', 3); // Agility 3
    let k = skillOf(l.renderVals(), 'athletics');
    expect(k.hasNeed).toBe(false);
    press(l, 'athletics', 3);
    expect(attrOf(l.renderVals(), 'agility').val).toBe(3);
    expect(meter(l.renderVals(), 1)).toBe('8 LEFT OF 10');
    k = skillOf(l.renderVals(), 'athletics');
    expect(k.need).toBe('TAKES AGILITY TO 4'); expect(k.incAria).toMatch(/^Raise Athletics from 3 to 4 for 1 Skill point and 1 Attribute point: Agility rises from 3 to 4\./);
  });
  it('a pip sets a skill straight to a value and spends every Attribute point that takes', () => {
    const r: any = _setSkill({ skills: {}, aSet: {} }, 'dexterity', 4);
    expect(r).toMatchObject({ ok: true, skills: { dexterity: 4 }, text: 'Dexterity 4 needs Agility 4: 3 Attribute points spent.', what: 'Dexterity 0 → 4 and Agility 1 → 4' });
    expect(r.aSet.agility).toBe(4);
  });
  it('lowering a skill leaves its attribute, and says how to get the points back', () => {
    const l = screen();
    press(l, 'dexterity', 3);
    skillOf(l.renderVals(), 'dexterity').dec();
    expect(l.state.note.text).toBe('Dexterity 2: 1 Skill point back. Agility stays at 3: lower it too if you want its Attribute points back.');
    expect(attrOf(l.renderVals(), 'agility').val).toBe(3);
    attrOf(l.renderVals(), 'agility').down();
    expect(l.state.note.text).toBe('Agility 2: 1 Attribute point back.');
  });
});

describe('the points step: refusals say what is short and what to do', () => {
  const full = { skills: { durability: 4, guts: 3, dexterity: 3 }, aSet: { endurance: 4, strength: 3, agility: 3, virtue: 3 } }; // 10 Skill points, 9 Attribute points
  it('no Skill points left', () => {
    expect(_setSkill(full, 'guts', 4)).toEqual({ ok: false, text: 'No Skill points left: lower another skill first.' });
    expect(_setSkill({ skills: { durability: 4, guts: 3 }, aSet: {} }, 'faith', 5)).toEqual({ ok: false, text: 'Faith 5 takes 5 Skill points and you have 3: lower another skill first.' });
  });
  it('no Attribute points left, for a skill and for an attribute', () => {
    const st = { skills: { durability: 4 }, aSet: { endurance: 4, strength: 4, agility: 5 } }; // every Attribute point placed
    expect(_setSkill(st, 'durability', 5)).toEqual({ ok: false, text: 'Durability 5 needs Endurance 5. No Attribute points left: lower another attribute first.' });
    expect(_setAttr(st, 'virtue', 2)).toEqual({ ok: false, text: 'No Attribute points left: lower another attribute first.' });
    expect(_setSkill({ skills: {}, aSet: { strength: 7, agility: 3 } }, 'faith', 5).text).toBe('Faith 5 needs Virtue 5. That takes 4 Attribute points and you have 2: lower another attribute first.');
    // with Mind Without Fog's 2 extra points the same click goes through
    expect(_setSkill(st, 'durability', 5, 2)).toMatchObject({ ok: true, text: 'Durability 5 needs Endurance 5: 1 Attribute point spent.' });
  });
  it('no attribute above 7 at creation, so no skill above 7 either', () => {
    expect(BUDGET.attrCap).toBe(7);
    expect(_setAttr({ skills: {}, aSet: { endurance: 7 } }, 'endurance', 8)).toEqual({ ok: false, text: 'No attribute above 7 at creation: Endurance stops at 7 for now.' });
    expect(_setSkill({ skills: { durability: 7 }, aSet: {} }, 'durability', 8).text).toBe('No attribute above 7 at creation, and a skill can\'t pass its attribute: Durability stops at 7 for now.');
  });
  it('an attribute is never lowered below a skill under it: refused, naming the skill to lower first', () => {
    const st = { skills: { dexterity: 4 }, aSet: { agility: 4 } };
    expect(_setAttr(st, 'agility', 3)).toEqual({ ok: false, text: 'Agility can\'t drop to 3 while Dexterity is 4: lower Dexterity first.' });
    expect(_setAttr({ skills: { dexterity: 4, athletics: 4 }, aSet: {} }, 'agility', 3).text).toBe('Agility can\'t drop to 3 while Dexterity and Athletics are above 3: lower them first.');
    expect(_setAttr({ skills: {}, aSet: {} }, 'agility', 0).text).toBe('Every attribute starts at 1: Agility can\'t go lower.');
    expect(_setSkill({ skills: {}, aSet: {} }, 'dexterity', -1).text).toBe('Dexterity is at 0 already.');
  });
  it('a refused click changes nothing, shows the reason in the status line, and the button keeps its reason for a screen reader', () => {
    const l = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'skills' }); // every point placed
    const before = JSON.stringify([l.state.skills, l.state.aSet]);
    const k = skillOf(l.renderVals(), 'faith');
    expect(k.incOff).toBe('true'); expect(k.incAria).toBe('Raise Faith, now 0. Not possible: No Skill points left: lower another skill first.');
    k.inc();
    expect(JSON.stringify([l.state.skills, l.state.aSet])).toBe(before);
    expect(l.renderVals().points.note).toBe('✗ No Skill points left: lower another skill first.');
    expect(l.state.hist).toHaveLength(0);
    attrOf(l.renderVals(), 'endurance').down(); // 5 → 4: Durability 4 still fits
    const a = attrOf(l.renderVals(), 'endurance');
    expect(a.downOff).toBe('true'); expect(a.downAria).toBe('Lower Endurance, now 4. Not possible: Endurance can\'t drop to 3 while Durability is 4: lower Durability first.');
    a.down();
    expect(l.renderVals().points.note).toBe('✗ Endurance can\'t drop to 3 while Durability is 4: lower Durability first.');
    expect(attrOf(l.renderVals(), 'endurance').val).toBe(4);
  });
});

describe('the points step: undo and reset', () => {
  it('Undo takes back the last point, the Attribute point it spent with it, one step at a time', () => {
    const l = screen();
    expect(l.renderVals().points.noUndo).toBe(true);
    press(l, 'dexterity', 2);
    expect(l.renderVals().points.undoAria).toBe('Undo the last change: Dexterity 1 → 2 and Agility 1 → 2');
    l.renderVals().points.undo();
    expect(l.state.skills).toEqual({ dexterity: 1 });
    expect(attrOf(l.renderVals(), 'agility').val).toBe(1);
    expect(l.renderVals().points.note).toBe('✓ Undone: Dexterity 1 → 2 and Agility 1 → 2.');
    l.renderVals().points.undo();
    expect(l.state.skills).toEqual({});
    expect(l.renderVals().points.noUndo).toBe(true);
    expect(meter(l.renderVals(), 0)).toBe('10 LEFT OF 10'); expect(meter(l.renderVals(), 1)).toBe('10 LEFT OF 10');
  });
  it('one attribute resets: its skills back to 0 and it back to 1, the others untouched; Undo brings it back', () => {
    const l = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'skills' }); // Endurance 5 (Durability 4, Pain Threshold 3), Strength 5 (Guts 3), Determination 3
    attrOf(l.renderVals(), 'endurance').reset();
    expect(l.state.note.text).toBe('Endurance reset: 7 Skill points and 4 Attribute points back.');
    expect(l.state.skills).toEqual({ guts: 3 });
    const v = l.renderVals();
    expect(attrOf(v, 'endurance').val).toBe(1); expect(attrOf(v, 'strength').val).toBe(5);
    expect(meter(v, 0)).toBe('7 LEFT OF 10'); expect(meter(v, 1)).toBe('4 LEFT OF 10');
    expect(attrOf(v, 'endurance').resetOff).toBe('true');
    expect(_resetAttr({ skills: {}, aSet: {} }, 'endurance')).toEqual({ ok: false, text: 'Endurance is already at 1 with no points in its skills.' });
    v.points.undo();
    expect(l.state.skills).toEqual({ durability: 4, pain_threshold: 3, guts: 3 });
    expect(attrOf(l.renderVals(), 'endurance').val).toBe(5);
  });
  it('Reset all clears the sheet and can be undone', () => {
    const l = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'skills' });
    l.renderVals().points.resetAll();
    expect(l.state.skills).toEqual({}); expect(l.state.applied).toBeNull();
    expect(l.renderVals().points.note).toBe('✓ Everything reset: all 10 Skill points and 10 Attribute points are yours to place.');
    l.renderVals().points.undo();
    expect(l.state.applied).toBe('bulwark'); expect(l.renderVals().points.todo).toMatch(/^✓ Every point is placed/);
  });
});

describe('the points step: what the next point gives', () => {
  it('an attribute shows its per-point line in the game\'s numbers', () => {
    const v = screen().renderVals();
    expect(attrOf(v, 'endurance').next).toBe('Next point: +15 max HP, +10% chance to ignore an injury.');
    expect(attrOf(v, 'agility').next).toBe('Next point: +0.5 tile of movement an AP, +1 Initiative.');
    expect(attrOf(v, 'virtue').next).toBe('Next point: +100 max MP, prayers come back half a turn sooner.');
    expect(attrOf(v, 'endurance').upAria).toBe('Raise Endurance from 1 to 2 for 1 Attribute point. Gives +15 max HP, +10% chance to ignore an injury.');
  });
  it('a skill shows the roll it gives (the engine\'s check modifier) and the data\'s per-point text', () => {
    const l = screen();
    let k = skillOf(l.renderVals(), 'durability');
    expect(k.line).toBe('Roll −2, next 0. Next point: ' + (SKILL.durability as any).per_point.text);
    expect(k.incAria).toBe('Raise Durability from 0 to 1 for 1 Skill point. Roll 0. ' + (SKILL.durability as any).per_point.text);
    // the third skill under an attribute rolls checks one better
    k = skillOf(l.renderVals(), 'sensory');
    expect(checkModOf('sensory', 1)).toBe(1);
    expect(k.line).toMatch(/^Roll −2, next \+1\. Next point: /);
    press(l, 'durability', 2);
    expect(skillOf(l.renderVals(), 'durability').line).toMatch(/^Roll \+1, next \+2\. .* A perk at 3\.$/);
    for (const s of D.skills as any[]) expect(skillOf(l.renderVals(), s.id).line).toContain((SKILL[s.id] as any).per_point.text);
  });
  it('every stepper has a label saying what it changes and its value', () => {
    const v = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'skills' }).renderVals();
    for (const a of v.families.flatMap((f: any) => f.attrs)) {
      expect(a.upAria).toMatch(new RegExp('^Raise ' + a.name + '.* ' + a.val, 'i')); expect(a.downAria).toMatch(new RegExp('^Lower ' + a.name + '.* ' + a.val, 'i'));
      for (const k of a.cards) { expect(k.incAria).toMatch(new RegExp('^Raise ' + k.name + '.* ' + k.pts)); expect(k.decAria).toMatch(new RegExp('^Lower ' + k.name + '.* ' + k.pts)); }
    }
  });
  it('the arrow keys on a stepper raise and lower it', () => {
    const l = screen();
    const key = (k: string) => { let stopped = false; skillOf(l.renderVals(), 'faith').keys({ key: k, preventDefault: () => { stopped = true; } }); return stopped; };
    expect(key('ArrowRight')).toBe(true); expect(key('ArrowUp')).toBe(true);
    expect(l.state.skills.faith).toBe(2);
    expect(key('ArrowLeft')).toBe(true);
    expect(l.state.skills.faith).toBe(1);
    expect(key('Tab')).toBe(false);
  });
});

describe('the points step: archetypes and Lock in', () => {
  it('every archetype lands on the step with a legal, fully spent sheet that can then be edited', () => {
    for (const a of (D as any).arch.items) {
      const l = screen({ startStep: 'archetype' });
      l.state.arch = a.id;
      l.renderVals().useArch();
      expect(l.state.step).toBe('skills');
      const v = l.renderVals();
      expect([a.id, v.points.todo]).toEqual([a.id, '✓ Every point is placed. Go on to Traits when you like.']);
      expect([a.id, meter(v, 0), meter(v, 1)]).toEqual([a.id, '✓ ALL 10 PLACED', '✓ ALL 10 PLACED']);
      expect(v.points.note).toBe('✓ Started as the ' + a.name + ': every point is placed. Change anything you like.');
      expect(v.points.noUndo).toBe(true);
      Object.assign(l.state, { name: 'Test', origin: 1, kit: 'medic' });
      expect([a.id, validateSheet(l.sheet())]).toEqual([a.id, null]);
    }
  });
  it('a sheet built by clicking skills only locks in once every point is placed', () => {
    const l = screen({ sampleName: 'Test', startStep: 'skills' });
    press(l, 'dexterity', 4); press(l, 'athletics', 3); press(l, 'faith', 3);
    expect(validateSheet(l.sheet())).toBe('Place every Attribute point.');
    expect(l.renderVals().points.todo).toBe('◆ Still to place: 5 Attribute points.');
    expect(l.renderVals().checks.find((c: any) => /Attribute points/.test(c.label)).mark).toBe('◆');
    for (let i = 0; i < 5; i++) attrOf(l.renderVals(), 'endurance').up();
    expect(l.renderVals().points.todo).toMatch(/^✓/);
    expect(validateSheet(l.sheet())).toBeNull();
    expect(l.sheet().attrs).toMatchObject({ agility: 4, virtue: 3, endurance: 6, strength: 1 });
  });
  it('Mind Without Fog taken after the points are placed leaves 2 Attribute points to place; dropped, 2 too many', () => {
    const l = screen({ sampleName: 'Test', sampleArch: 'bulwark', startStep: 'skills' });
    l.state.traits = ['mind_without_fog'];
    expect(l.renderVals().points.todo).toBe('◆ Still to place: 2 Attribute points.');
    attrOf(l.renderVals(), 'virtue').up(); attrOf(l.renderVals(), 'virtue').up();
    expect(validateSheet(l.sheet())).toBeNull();
    l.state.traits = [];
    expect(l.renderVals().points.todo).toBe('◆ 2 Attribute points too many: lower an attribute.');
    expect(meter(l.renderVals(), 1)).toBe('2 TOO MANY');
    expect(_pointsTodo({ spent: 10, attrLeft: 0, attr: { endurance: 8, strength: 1 } })).toBe('Endurance is 8: no attribute above 7 at creation, so lower it.');
  });
});
