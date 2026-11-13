// @ts-nocheck (node:child_process and node:path, as datatext.test.ts; the engine tsconfig has no node types)
// The engine fixes of the third text-and-number truth pass (12 Nov 2026). Each card number below used to be a second
// copy (a literal in the engine beside a field in data); the engine reads the field now, so moving the field moves both.
// Together's duration and the general Brace's protect tag are pinned here too (Together's test is in faith.test.ts,
// the MEND base of an allied non-character caster in rules120-heal-shield.test.ts, Crawler-Blooded in truth-pass-2).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { SKILL, PERK, CLASS_MOVE_POOL, brace } from '../src';
import { ambushMult } from '../src/character';
import { fightWith, withGame } from './helpers/perkfight';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/** Run fn with a data field moved, then put it back. */
function moved<T>(obj: any, key: string, to: any, fn: () => T): T { const was = obj[key]; obj[key] = to; try { return fn(); } finally { obj[key] = was; } }

describe('truth pass 3: the engine reads the card\'s number', () => {
  it('Ingenuity\'s ambush damage per point is per_point.ambush_per_point', () => {
    const f = fightWith([{ skills: { ingenuity: 4 } }], [{ at: 'F6' }]); const c = f.g.characters[f.pc.charId!];
    const pp = (SKILL.ingenuity as any).per_point; expect(pp.ambush_per_point).toBe(0.05);
    const base = withGame(f.g, () => ambushMult(c));
    expect(moved(pp, 'ambush_per_point', 0.1, () => withGame(f.g, () => ambushMult(c)))).toBeCloseTo(base + 4 * 0.05);
  });
  it('Case Closed\'s +20% is effects[2] and its +2 Defense effects[1]', () => {
    const e: any[] = (PERK.case_closed as any).effects; expect(e[2].value).toBe(1.2); expect(e[1].value).toBe(-2);
  });
  // rules 1.33: Inspire's card is its data (classes.json bard inspire: 1 AP, 10 MP through the Attuner): test/tending.test.ts
  it('every skill\'s Mastered unlock states the Echo the engine charges to resist (unlocks.10.resist_echo)', () => {
    for (const s of Object.values(SKILL) as any[]) { expect(s.unlocks['10'].resist_echo, s.id).toBe(2); expect(s.unlocks['10'].text, s.id).toMatch(/now costs 2 Echo\./); }
  });
});

describe('truth pass 3: the protect tag (item 600)', () => {
  it('the general Brace is a protect: a patron who likes protect counts it', () => {
    const f = fightWith([{ weapon: 'hellraiser_lmg', skills: { faith: 5 } }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' } as any; c.patron = 'nerukhan';
    f.turn(f.pc); const xp = c.devotionXp || 0;
    expect(withGame(f.g, () => brace(f.cb, f.unit(f.pc.id)))).toBeNull();
    expect((c.devotionXp || 0)).toBeGreaterThan(xp);
  });
});

describe('truth pass 3: a placeholder must read its own object, and a field of its kind', () => {
  it('the binder refuses another step\'s numbers, the Overreach\'s threshold, a discount read as a cost and a bound die face', () => {
    const out = execFileSync('python3', [join(__dirname, '..', '..', '..', 'tools', 'text_numbers.py'), '--selftest-bindings'], { encoding: 'utf8' });
    expect(JSON.parse(out)).toMatchObject({ bad: 4, good: 0 });
  });
});
