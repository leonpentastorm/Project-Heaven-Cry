// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 2 (docs/design/rev4-primitives.md P6): door verbs. An item of kind `verb` is held by
// anyone whose sheet meets its `requires`; its grant_action is the one action shape: ap, res, if (the holder's
// predicates), reach {tiles, sight, side, self, if} (the pick list and the refusal), limit, prayer (whisper | hymn,
// through faith.ts), nested effects (its own, run when it succeeds). SKILL_ITEMS is the data's (skills.json `item`).
// Fixtures: test/fixtures/classes-3.0-primitives-1b.json `verbs`.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, heldOfChar } from '../src/effects/hooks';
import { SKILL_ITEMS, itemsOf, verbsOf, meetsRequires, itemInfo } from '../src/effects/collect';
import { perkActionsFor } from '../src/effects/actions';
import { actionsFor, previewDescriptor } from '../src/descriptors';
import { condOn } from '../src/magic';
import { reactionsUsed } from '../src/tactics';
import { physFight } from './helpers/physfight';
import { withGame } from './helpers/perkfight';
import SKILLS from '../../../data/skills.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const V = (id: string) => FIX.verbs.find((v: any) => v.id === id);
const G = (id: string) => V(id).effects[0];
function fight(skills: Record<string, number> = { dexterity: 2, composure: 1, faith: 3 }) {
  const f = physFight([{ skills }], [{}, {}]);
  f.put(f.pc, '2,2'); f.put(f.foes[0], '4,2'); f.put(f.foes[1], '9,2'); f.cb.order = [f.pc.id, ...f.foes.map((x) => x.id)]; f.turn(f.pc);
  return f;
}
const perk = (f: any, action: string, args: any = {}) => { try { f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'verb:' + V(action).id, ...args }); return null; } catch (e: any) { return String(e?.message || e); } };

describe('P6: door verbs', () => {
  beforeAll(() => addItems('verb', FIX.verbs));
  afterAll(() => clearAddedItems());
  it('SKILL_ITEMS is the data\'s: every skills.json unlock marked `item`', () => {
    const want = (SKILLS as any).items.flatMap((s: any) => Object.entries(s.unlocks || {}).filter(([, x]: any) => x.item).map(([l]) => s.id + '.' + l));
    expect(SKILL_ITEMS).toEqual(want); expect(SKILL_ITEMS.length).toBeGreaterThan(0);
  });
  it('a verb is held by every sheet that meets its requires (a skill\'s points, or a class and rank), and by no other', () => {
    const r = V('test_verb_mark').requires;
    expect(meetsRequires(r, { skills: { dexterity: r[0].min } })).toBe(true); expect(meetsRequires(r, { skills: { dexterity: r[0].min - 1 } })).toBe(false);
    expect(meetsRequires([{ class: 'mage', rank: 2 }], { cls: 'mage', rank: 2 })).toBe(true); expect(meetsRequires([{ class: 'mage', rank: 2 }], { cls: 'mage', rank: 1 })).toBe(false);
    expect(verbsOf({ skills: { dexterity: 1 } })).toContain('test_verb_mark'); expect(verbsOf({ skills: {} })).not.toContain('test_verb_mark');
    const f = fight(); const held = itemsOf(heldOfChar(f.char(f.pc))).filter((i) => i.kind === 'verb').map((i) => i.id);
    expect(held).toEqual(['test_verb_mark', 'test_verb_steady', 'test_verb_whisper']);
    expect(itemInfo('verb:test_verb_mark')!.kind).toBe('verb');
  });
  it('reach builds the pick list (in range, seen, the reach\'s `if`) and the refusal; its nested ops run once it succeeds; limit', () => {
    const f = fight(), [near, far] = f.foes, g = G('test_verb_mark');
    const row = withGame(f.g, () => perkActionsFor({ u: f.unit(f.pc.id), c: f.char(f.pc), cb: f.cb, g: f.g }, 'combat').find((e) => e.actionId === g.action))!;
    expect(row.target).toBe('enemy'); expect(row.choices).toEqual([near.id]); expect(row.ap).toBe(g.ap);
    expect(perk(f, 'test_verb_mark', { targetId: far.id })).toMatch(new RegExp('Out of range \\(' + g.reach.tiles + ' tiles\\)'));
    expect(perk(f, 'test_verb_mark', { targetId: f.pc.id })).toMatch(/Pick an enemy/);
    const ap = f.unit(f.pc.id).ap;
    expect(perk(f, 'test_verb_mark', { targetId: near.id })).toBeNull();
    expect(condOn(f.unit(near.id), g.effects[0].condition)).toBe(true); expect(f.unit(f.pc.id).ap).toBe(ap - g.ap);
    expect(perk(f, 'test_verb_mark', { targetId: near.id })).toMatch(/Used this turn/); // the limit, before the reach
  });
  it('if (the holder\'s predicates) greys it; res is priced and paid', () => {
    const f = fight(), g = G('test_verb_steady'), c = f.char(f.pc);
    c.echo = g.res.echo; const ap = f.unit(f.pc.id).ap;
    expect(perk(f, 'test_verb_steady')).toBeNull();
    expect(f.char(f.pc).echo).toBe(0); expect(f.unit(f.pc.id).ap).toBe(ap - g.ap + g.effects[0].value); // its own effect: perk AP
    f.char(f.pc).echo = g.res.echo; f.unit(f.pc.id).conds = { ...(f.unit(f.pc.id).conds || {}), marked: 2 };
    expect(perk(f, 'test_verb_steady')).toMatch(/Not now \(Self lacks\)/);
  });
  it('prayer: whisper takes the Whisper slot (one a turn), with its own reach (self allowed)', () => {
    const f = fight(), g = G('test_verb_whisper');
    expect(perk(f, 'test_verb_whisper', { targetId: f.pc.id })).toBeNull();
    expect(f.cb.log.some((l: string) => /whispers a prayer/.test(l))).toBe(true);
    expect(perk(f, 'test_verb_whisper', { targetId: f.pc.id })).toMatch(/One Whisper a turn/);
    const low = fight({ dexterity: 1, faith: 1 }); // rules 1.31: Whispers open at Faith 1
    expect(perk(low, 'test_verb_whisper', { targetId: low.pc.id })).toBeNull();
    void g; void reactionsUsed;
  });
  it('the descriptors list it with the engine\'s pick list: a new verb needs no client code', () => {
    const f = fight(); const d = actionsFor(f.g, f.pc.id).find((x) => x.id.includes('verb:test_verb_mark'))!;
    expect(d).toBeTruthy(); expect(d.picks[0].choices).toEqual([f.foes[0].id]);
    expect(previewDescriptor(f.g, f.pc.id, d.id, { targetId: f.foes[0].id })!.ok).toBe(true);
  });
});
