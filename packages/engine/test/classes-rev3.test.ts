// Class Roster Revision 3 (Leon, 8 Nov 2026; docs/design/class-roster-rev3-proposal.md): one base class per attribute,
// earned at level 3 by the highest attribute (a tie: the player chooses) and kept for good; rank II at that attribute 5,
// rank III at 8; two moves a rank; reused moves keep their old keys; resources follow the moves; advanced classes are
// shelved (no learning, and a held one gives nothing); Revision 2 saves migrate. No test-only switch here except where
// a test says so (the pair gate, which is behind the shelving).
import { describe, expect, it, afterEach } from 'vitest';
import {
  CLASSES, CLASS, CLASS_MOVE_POOL, ADVANCED, classRank, eligibleClasses, classPickError, classResources, migrateCharacterClass,
  advancedPairError, advancedClassError, advancedActive, _setAdvancedLive, heldOfChar, itemsOf, itemInfo, coverageOf, actionDefs, newCharacter, healingMult, handlerOf,
  CLASS_REV, rankReached, type Character,
  mendFactor,
} from '../src';
import { fightWith, storyWith, sheetOf, type CharSpec } from './helpers/perkfight';

afterEach(() => _setAdvancedLive(null));
const charOf = (attrs: Record<string, number> = {}, o: Partial<Character> = {}): Character => {
  const c = newCharacter('c1', 'p1', sheetOf({ archetype: 'sharpshooter' }));
  for (const k of Object.keys(c.attrs)) c.attrs[k] = 1;
  Object.assign(c.attrs, attrs); return Object.assign(c, { level: 3 }, o);
};
const classKeys = (c: Character) => itemsOf(heldOfChar(c)).filter((i) => i.kind === 'class').map((i) => i.key);
const cls = (id: string, attr: number, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: id, level: 5, attrs: { [CLASS[id].attribute]: attr, ...(extra.attrs || {}) } });

describe('the nine classes (data)', () => {
  it('one base class per attribute, in its core, with that attribute\'s three skills; six moves, two a rank', () => {
    expect(CLASSES.map((k) => k.id)).toEqual(['defender', 'fighter', 'marksman', 'infiltrator', 'mage', 'trickster', 'bard', 'channeler', 'guardian']);
    expect(new Set(CLASSES.map((k) => k.attribute)).size).toBe(9);
    expect(CLASS.infiltrator).toMatchObject({ attribute: 'perception', core: 'mind', skills: ['ingenuity', 'analysis', 'vigilant'] }); // rules 1.13: Acuity (the id 'analysis') sits under Perception
    for (const k of CLASSES) for (const r of ['I', 'II', 'III']) expect(k.ranks[r].moves.length, k.id + ' ' + r).toBe(2);
    const all = CLASSES.flatMap((k) => Object.values(k.ranks).flatMap((r: any) => r.moves));
    expect(all.length).toBe(54);
    expect(all.filter((m: any) => m.new).length).toBe(25); // the 20 new moves and Run and Gun (rules 1.30); rules 1.31: Ward and Smite in, Command out; less Field Fix (to the move pool, rules 1.32); rules 1.33: the Ledger and Take the Weight; rules 1.34: Salvage, Overclock, Scrap Turret in, Silver Tongue out
    expect(all.filter((m: any) => m.ref && !ADVANCED[m.ref.split('.')[0]]).length).toBe(24); // 28 old base moves; rules 1.31: Will Shield out (Ward); rules 1.33: Stim Throw and Field Surgery out (everyone's); rules 1.34: Blind and Slow and Rewrite leave the Rigger, Field Fix is its ref
    expect(all.filter((m: any) => m.ref && ADVANCED[m.ref.split('.')[0]]).length).toBe(6); // 6 old advanced moves (Called Shot left the Skirmisher, rules 1.30, and came to the Operative, rules 1.32)
  });
  it('a reused move keeps its old key: Bard\'s Triage is class:medic.triage; a new move is under its class', () => {
    const triage = CLASS.bard.ranks.I.moves.find((m: any) => m.id === 'triage');
    expect(triage.key).toBe('class:medic.triage');
    expect(CLASS.marksman.ranks.III.moves.find((m: any) => m.id === 'called_shot')).toBeUndefined(); // rules 1.30: to the Operative (step 4)
    expect(CLASS.infiltrator.ranks.III.moves.find((m: any) => m.id === 'called_shot').key).toBe('class:gunslinger.called_shot'); // its key stays (rules 1.32)
    expect(CLASS_MOVE_POOL['infiltrator.field_fix']?.future_home).toMatch(/Rigger/); // Field Fix left the Operative, its key stays (rules 1.32)
    expect(CLASS.marksman.ranks.III.moves.find((m: any) => m.id === 'run_and_gun').key).toBe('class:marksman.run_and_gun');
    expect(CLASS.defender.ranks.II.moves.find((m: any) => m.id === 'shrug_it_off').key).toBe('class:defender.shrug_it_off');
    expect(itemInfo('class:medic.triage')?.name).toBe('Triage');
  });
  it('every move in the catalogue carries origin, fantasy_tags, attributes and status; 11 + 58 are shelved', () => {
    const moves = Object.values(CLASS_MOVE_POOL);
    for (const m of moves) { expect(m.origin).toBeTruthy(); expect(m.fantasy_tags?.length).toBeGreaterThan(0); expect(m.attributes?.length).toBeGreaterThan(0); expect(['active', 'shelved']).toContain(m.status); }
    expect(moves.filter((m) => !ADVANCED[m.origin] && m.status === 'shelved').length).toBe(14); // + Field Fix (rules 1.32); rules 1.34: + Silver Tongue, Blind and Slow, Rewrite, − Field Fix (the Rigger's)
    expect(moves.filter((m) => ADVANCED[m.origin] && m.status === 'shelved').length).toBe(57); // Called Shot is the Operative's (rules 1.32)
  });
});

describe('getting a class at level 3', () => {
  it('the class of the highest attribute; a tie offers every tied class', () => {
    expect(eligibleClasses(charOf({ insight: 5, virtue: 3 })).map((x) => x.id)).toEqual(['bard']);
    expect(eligibleClasses(charOf({ strength: 4, perception: 4, virtue: 2 })).map((x) => x.id).sort()).toEqual(['fighter', 'infiltrator']);
    expect(eligibleClasses(charOf({})).length).toBe(9); // all 1s: nobody is classless
  });
  it('every attribute tied (all at 3): all nine classes are offered, any one can be picked, and it is then fixed', () => {
    const all3 = { endurance: 3, strength: 3, agility: 3, perception: 3, intelligence: 3, expression: 3, insight: 3, determination: 3, virtue: 3 };
    expect(eligibleClasses(charOf(all3)).map((x) => x.id).sort()).toEqual(CLASSES.map((k) => k.id).sort());
    const s = storyWith([{ attrs: all3, level: 3 }]); const id = s.chars[0].id;
    s.act({ type: 'levelup/class', charId: id, classId: 'guardian' });
    expect(s.g.characters[id].classId).toBe('guardian');
    expect(() => s.act({ type: 'levelup/class', charId: id, classId: 'fighter' })).toThrow(/Your class is set/);
  });
  it('the pick is checked by the reducer; a class not of the highest attribute is refused', () => {
    const s = storyWith([{ attrs: { endurance: 1, strength: 5, agility: 5, perception: 1, intelligence: 1, expression: 1, insight: 1, determination: 1, virtue: 1 }, level: 3 }]);
    const id = s.chars[0].id;
    expect(() => s.act({ type: 'levelup/class', charId: id, classId: 'mage' })).toThrow(/highest attribute/);
    s.act({ type: 'levelup/class', charId: id, classId: 'marksman' });
    expect(s.g.characters[id].classId).toBe('marksman');
  });
  it('no class switching: the class is set for good, even once another attribute is higher', () => {
    const s = storyWith([{ attrs: { agility: 5 }, level: 3 }]);
    const id = s.chars[0].id;
    s.act({ type: 'levelup/class', charId: id, classId: eligibleClasses(s.g.characters[id])[0].id });
    const first = s.g.characters[id].classId!;
    s.g.characters[id].attrs.virtue = 9; s.g.characters[id].level = 6;
    expect(() => s.act({ type: 'levelup/class', charId: id, classId: 'guardian' })).toThrow('Your class is set; changing class is a separate system for later.');
    expect(s.g.characters[id].classId).toBe(first);
    expect(classPickError(charOf({}, { level: 2 }), 'bard')).toBe('Classes come at level 3.');
  });
});

describe('ranks read the class\'s own attribute', () => {
  it('rank I on gaining, II at 5, III at 8; another attribute growing higher changes nothing', () => {
    const c = charOf({ endurance: 4 }, { classId: 'defender', level: 12 });
    expect(classRank(c)).toBe(1); c.attrs.endurance = 5; expect(classRank(c)).toBe(2); c.attrs.endurance = 8; expect(classRank(c)).toBe(3);
    c.attrs.endurance = 4; c.attrs.virtue = 10; expect(classRank(c)).toBe(1);
  });
  it('a rank needs its level too (rules 1.11): II at level 6, III at level 12', () => {
    const c = charOf({ endurance: 8 }, { classId: 'defender', level: 3 });
    expect(classRank(c)).toBe(1); c.level = 5; expect(classRank(c)).toBe(1); c.level = 6; expect(classRank(c)).toBe(2);
    c.level = 11; expect(classRank(c)).toBe(2); c.level = 12; expect(classRank(c)).toBe(3);
    c.attrs.endurance = 5; expect(classRank(c)).toBe(2); c.attrs.endurance = 4; expect(classRank(c)).toBe(1);
  });
  it('each rank gives both of its moves', () => {
    const c = charOf({ insight: 4 }, { classId: 'bard', level: 12 });
    expect(classKeys(c)).toEqual(['class:medic.triage', 'class:bard.ledger']); // rules 1.33: the Ledger at rank I, Inspire at II
    c.attrs.insight = 5; expect(classKeys(c)).toEqual(['class:medic.triage', 'class:bard.ledger', 'class:bard.inspire', 'class:bard.take_the_weight']);
    c.attrs.insight = 8; expect(classKeys(c)).toContain('class:bard.rally'); expect(classKeys(c).length).toBe(6);
  });
  it('raising the attribute to 5 says which moves the rank brings', () => {
    const s = storyWith([{ classId: 'fighter', level: 6, attrs: { strength: 4 } }]);
    const c = s.g.characters[s.chars[0].id]; c.unspent.attr = 1; c.cores.body = Math.max(c.cores.body, 5);
    s.act({ type: 'levelup/raise', charId: c.id, kind: 'attr', id: 'strength' });
    expect(s.g.story.entries.at(-1)!.text).toContain(CLASS.fighter.name + ' II: Riposte, Lingering Dread');
  });
  it('a rank that comes with the level (rules 1.11) is announced the same way; no rise, no line', () => {
    const s = storyWith([{ classId: 'fighter', level: 5, attrs: { strength: 5 } }]);
    const c = s.g.characters[s.chars[0].id]; expect(classRank(c)).toBe(1);
    const n0 = s.g.story.entries.length; rankReached(s.g, c, 1); expect(s.g.story.entries.length).toBe(n0);
    c.level = 6; rankReached(s.g, c, 1);
    expect(s.g.story.entries.at(-1)!.text).toContain('reaches ' + CLASS.fighter.name + ' II: Riposte, Lingering Dread');
  });
});

describe('reused moves run their old handlers', () => {
  it('a Bard gets the Medic\'s Triage (class:medic.triage) and it heals through apply()', () => {
    // rules 1.33: Triage is data now (an Attuner in hand, MP, priced at its site); its play: test/tending.test.ts
    expect(itemInfo('class:medic.triage')!.effects.some((e: any) => e.op === 'grant_action' && e.site === 'triage')).toBe(true);
  });
  it('a Fighter at rank II holds Lingering Dread under its Shade key; a Defender Unbroken under the Knight\'s', () => {
    expect(classKeys(charOf({ strength: 5 }, { classId: 'fighter', level: 6 }))).toContain('class:shade.lingering_dread');
    expect(classKeys(charOf({ endurance: 5 }, { classId: 'defender', level: 6 }))).toContain('class:adamantile_knight.unbroken');
  });
});

describe('resources follow the moves', () => {
  const res = (id: string) => classResources(charOf({}, { classId: id })).map((r) => r.id).sort();
  it('Defender Guard, Fighter Momentum, Infiltrator Marks and toxins, Bard the Ledger; Heat, Flux, Strain, MP and Devotion are shared rules', () => {
    expect(res('defender')).toEqual(['guard']); expect(res('fighter')).toEqual(['momentum']); expect(res('infiltrator')).toEqual(['marks', 'shadow', 'toxins']); // Shadow: the class brings it (rules 1.32)
    expect(res('bard')).toEqual(['ledger']); // rules 1.33: MP and the Ledger; Supplies left the class
    for (const id of ['marksman', 'mage', 'trickster', 'channeler', 'guardian']) expect(res(id)).toEqual([]);
    expect(CLASS.guardian.resources).toEqual(['devotion']); /* rules 1.31: the Chaplain spends no MP or Strain */ expect(CLASS.marksman.resources).toEqual(['heat']);
  });
});

describe('advanced classes are shelved', () => {
  it('learning one is refused with the shelved reason, whatever the attributes', () => {
    const s = storyWith([{ level: 12, attrs: { agility: 10, strength: 10 }, classId: 'marksman' }]);
    expect(() => s.act({ type: 'levelup/advanced', charId: s.chars[0].id, classId: 'gunslinger' } as any)).toThrow('Advanced classes are being rebuilt; not learnable yet.');
    expect(Object.keys(ADVANCED).every((id) => ADVANCED[id].shelved && !advancedActive(id))).toBe(true);
  });
  it('a held advanced class stays in the save but gives no moves, resources or effects', () => {
    const c = charOf({ agility: 4 }, { classId: 'marksman', advancedClass: 'storm_hand' });
    expect(classKeys(c).some((k) => k.startsWith('class:storm_hand.'))).toBe(false);
    expect(classResources(c).map((r) => r.id)).not.toContain('charges');
    expect(c.advancedClass).toBe('storm_hand');
    _setAdvancedLive(true); // the test-only switch brings it back (the advanced-move tests use it)
    expect(classKeys(c).some((k) => k.startsWith('class:storm_hand.'))).toBe(true);
    expect(classResources(c).map((r) => r.id)).toContain('charges');
  });
  it('the Narrator can\'t place a tutor for a shelved class (the Proving Ground\'s refusal: sandbox.test.ts)', () => {
    const s = storyWith([{}]); const id = s.chars[0].id;
    s.act({ type: 'narrator/turn', turn: { narration: 'An old drifter.', tutors: [{ charId: id, classId: 'gunslinger' }] } } as any);
    expect(s.g.characters[id].tutors || []).toEqual([]);
  });
  it('every advanced class is tagged for the future plan: kind, pair, batch (squared: one attribute twice; hybrid: two cores)', () => {
    for (const a of Object.values(ADVANCED) as any[]) {
      expect(['squared', 'hybrid']).toContain(a.kind); expect(a.pair.length).toBe(2); expect([1, 2, 3]).toContain(a.batch);
      if (a.kind === 'squared') expect(a.pair[0]).toBe(a.pair[1]);
      else expect(CLASSES.find((k) => k.attribute === a.pair[0])!.core).not.toBe(CLASSES.find((k) => k.attribute === a.pair[1])!.core);
    }
    expect((ADVANCED as any).gunslinger).toMatchObject({ kind: 'squared', pair: ['agility', 'agility'], batch: 1, roadmap: 'Gunslinger' });
    expect((ADVANCED as any).storm_hand).toMatchObject({ kind: 'hybrid', pair: ['strength', 'determination'], batch: 2 });
  });
});

describe('the advanced gate by attribute pair (behind the shelving; provisional)', () => {
  it('hybrid: base attribute 6 and partner 5, from level 7', () => {
    const h = { kind: 'hybrid', pair: ['strength', 'determination'] };
    expect(advancedPairError(charOf({ strength: 6, determination: 5 }, { level: 6 }), h)).toMatch(/level 7/);
    expect(advancedPairError(charOf({ strength: 5, determination: 5 }, { level: 7 }), h)).toMatch(/Strength 6/);
    expect(advancedPairError(charOf({ strength: 6, determination: 4 }, { level: 7 }), h)).toMatch(/Determination 5/);
    expect(advancedPairError(charOf({ strength: 6, determination: 5 }, { level: 7 }), h)).toBeNull();
  });
  it('squared: its attribute 9, from level 7', () => {
    const q = { kind: 'squared', pair: ['virtue', 'virtue'] };
    expect(advancedPairError(charOf({ virtue: 8 }, { level: 9 }), q)).toMatch(/Virtue 9/);
    expect(advancedPairError(charOf({ virtue: 9 }, { level: 7 }), q)).toBeNull();
  });
  it('once a class is active (here by the test switch), learning reads the pair gate', () => {
    _setAdvancedLive(true);
    const c = charOf({ strength: 6, determination: 5 }, { level: 7, classId: 'fighter' });
    expect(advancedClassError(c, 'storm_hand', ADVANCED.storm_hand)).toBeNull();
    expect(advancedClassError(c, 'gunslinger', ADVANCED.gunslinger)).toMatch(/Agility 9/);
  });
});

describe('Revision 2 saves migrate', () => {
  it('medic → bard, scribe → mage, warden → trickster, hexer → channeler, assassin → infiltrator; the rest keep their id', () => {
    const map: Record<string, string> = { medic: 'bard', scribe: 'mage', warden: 'trickster', hexer: 'channeler', assassin: 'infiltrator', marksman: 'marksman', guardian: 'guardian' };
    for (const [from, to] of Object.entries(map)) {
      const c = charOf({}, { classId: from }); delete c.classRev;
      migrateCharacterClass(c); expect(c.classId).toBe(to); expect(c.classRev).toBe(CLASS_REV);
    }
  });
  it('runs once on load (apply), with a note; moves the new class doesn\'t list stop working; an advanced class is kept but rests', () => {
    const s = storyWith([{ classId: 'warden', advancedClass: 'siege_engineer', level: 5 }]);
    const id = s.chars[0].id; delete s.g.characters[id].classRev;
    s.act({ type: 'narrator/turn', turn: { narration: 'Later.' } } as any);
    const c = s.g.characters[id];
    expect(c.classId).toBe('trickster'); expect(c.advancedClass).toBe('siege_engineer');
    expect(classKeys(c).some((k) => k.startsWith('class:warden.'))).toBe(false); // Ward, Seal, Raise Cover: shelved
    expect(classKeys(c)).toContain('class:trickster.false_image'); // rules 1.34: the Rigger's Double (Read went to the Operative)
    expect(classKeys(c).some((k) => k.startsWith('class:siege_engineer.'))).toBe(false);
    const notes = s.g.story.entries.filter((e) => e.kind === 'system').map((e) => e.text).join(' ');
    expect(notes).toContain('Warden is now the ' + CLASS.trickster.name); expect(notes).toMatch(/advanced classes are being rebuilt/);
  });
  it('a new character is already at Revision 3 (nothing to migrate)', () => {
    const c = charOf({}, { classId: 'bard' }); expect(migrateCharacterClass(c)).toEqual([]);
  });
});

describe('the 20 new moves have handlers (phase B; behaviour in classes-rev3-moves.test.ts)', () => {
  const NEW = CLASSES.flatMap((k) => Object.values(k.ranks).flatMap((r: any) => r.moves)).filter((m: any) => m.new).map((m: any) => m.key.replace(/^class:/, ''));
  it('each has its full data entry, a registered handler, and no effect is a coverage gap', () => {
    expect(NEW.length).toBe(25); // + Run and Gun (rules 1.30, data only); rules 1.31: + Ward and Smite (data only), − Command; − Field Fix (rules 1.32); rules 1.33: + the Ledger and Take the Weight; rules 1.34: + Salvage, Overclock, Scrap Turret, − Silver Tongue
    for (const k of NEW) {
      const info = itemInfo('class:' + k)!;
      expect(info, k).toBeTruthy(); expect(info.text.length, k).toBeGreaterThan(10); expect(info.provisional, k).toBe(true);
      expect(coverageOf(info).filter((r) => r.owner === 'gap'), k).toEqual([]);
      expect(coverageOf(info).filter((r) => r.owner === 'narrator'), k).toEqual([]); // the engine runs every part now
      // a handler, or (engine foundations 3) written in data only: every effect run by the generic runner
      expect(!!handlerOf(info.key) || coverageOf(info).every((r) => r.owner === 'generic' || r.owner === 'action'), k).toBe(true); // (a data action: P6, rules 1.32's Vanish; rules 1.31: a prayer's grant runs its own item ops: the Chaplain's Ward; rules 1.33: a data action whose ops run on acted)
    }
  });
  it('an active one is a lane action under the data\'s action id', () => {
    expect(actionDefs(itemInfo('class:bard.rally')!).map((d) => d.id)).toEqual(['rally']); // rules 1.33: data's own action
    expect(actionDefs(itemInfo('class:fighter.shove')!).map((d) => d.id)).toEqual(['class_shove']);
  });
});
