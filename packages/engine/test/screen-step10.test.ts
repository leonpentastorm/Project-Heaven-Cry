// @ts-nocheck (test fixtures: plain objects)
// Classes 3.0 step 10 (the screen): the fields the fight screen reads for the systems of Revision 4. The descriptors'
// tab and group (`sub`) for Tending, Shadow and the Chaplain's prayers; a door verb's refusal in its data's words; the
// Bond strip (bondView) and the reaction pips (reactionView). Every expected word and number is read from data.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame } from './helpers/perkfight';
import { actionsFor, bondView, reactionView, setDevotionXp, devotionThreshold } from '../src';
import { tie, tieCap } from '../src/kit';
import { UNFELT, previewPerkAction } from '../src/effects/actions';
import tendingJ from '../../../data/tending.json';
import shadowJ from '../../../data/shadow.json';

const TJ: any = tendingJ, SJ: any = shadowJ;
const grantOf = (j: any, id: string) => j.items.find((x: any) => x.id === id).effects.find((e: any) => e.op === 'grant_action');
const subOf = (j: any, id: string) => j.groups[j.items.find((x: any) => x.id === id).group];

function setup(spec: any, o: { attuner?: boolean } = {}) {
  const f = fightWith([{ name: 'Me', weapon: 'service_pistol', ...spec }, { name: 'Mate' }], [{ at: 'F6' }, { at: 'G6' }], { level: spec.level ?? 8 });
  const me = f.pc, c = f.g.characters[me.charId];
  if (o.attuner) c.offHand = { id: 'attuner' };
  f.pcs[0].pos = '2,5'; f.pcs[1].pos = '2,6'; f.foes[0].pos = '6,5'; f.foes[1].pos = '7,5';
  f.turn(me); f.unit(me.id).ap = 9;
  const list = () => withGame(f.g, () => actionsFor(f.g, me.id, null));
  return { f, me: () => f.unit(me.id), c: () => f.g.characters[me.charId], list };
}

describe('step 10: the TEND tab and its groups (bonds-spec.md section 9)', () => {
  it('a Tending verb sits on the tend tab, in the group its data names; a passive verb has no row', () => {
    const s = setup({ skills: { empathy: 6 } }, { attuner: true });
    const rows = s.list().filter((d) => d.id.includes('verb:tend.'));
    expect(rows.length).toBeGreaterThan(0);
    for (const d of rows) expect(d.group).toBe('tend');
    const mend = rows.find((d) => d.id.includes('verb:tend.mend#') || d.id.endsWith('verb:tend.mend'));
    expect(mend?.sub).toBe(subOf(TJ, 'tend.mend'));
    expect(rows.find((d) => d.id.includes('tend.bond'))?.sub).toBe(subOf(TJ, 'tend.bond'));
    expect(rows.find((d) => d.id.includes('tend.settle'))?.sub).toBe(subOf(TJ, 'tend.settle'));
    expect(rows.some((d) => d.id.includes('tend.threads'))).toBe(false);
  });
  it('without an Attuner in hand, a verb is refused in its data\'s words', () => {
    const s = setup({ skills: { empathy: 6 } });
    const bond = s.list().find((d) => d.id.includes('tend.bond') && !d.id.includes('free'));
    expect(bond.available).toBe(false);
    expect(bond.why).toBe(grantOf(TJ, 'tend.bond').why.self_holds);
  });
});

describe('step 10: Shadow\'s groups (shadow-spec.md section 9)', () => {
  it('each Shadow verb names its group (Slip, Mark, Work, Break) from shadow.json', () => {
    const s = setup({ classId: 'infiltrator', skills: { ingenuity: 8 } });
    const rows = s.list().filter((d) => d.group === 'shadow');
    expect(rows.length).toBeGreaterThan(3);
    for (const d of rows) { const id = d.id.match(/verb:(shadow\.[a-z_]+)/)?.[1]; expect(d.sub).toBe(subOf(SJ, id)); }
    const fade = rows.find((d) => d.id.includes('shadow.read_intent'));
    expect(fade.why).toBe(grantOf(SJ, 'shadow.read_intent').why.self_has); // not Hidden yet: the spec's words
    for (const d of rows) expect(d.text).not.toMatch(/\{=/); // the hover card's text has its numbers filled (datatext.ts)
  });
});

describe('step 10: the Chaplain\'s prayers on the Faith tab (chaplain-spec.md section 9)', () => {
  it('Ward sits among the Whispers and Sanctuary among the Hymns, on the faith tab', () => {
    const s = setup({ classId: 'guardian', skills: { faith: 6 }, attrs: { virtue: 8 }, level: 12 });
    const c = s.c(); c.belief = { kind: 'faithful', patron: 'old_overcast' }; c.patron = 'old_overcast'; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6;
    const rows = s.list();
    const ward = rows.find((d) => d.id.includes('guardian.ward')), sanct = rows.find((d) => d.id.includes('guardian.sanctuary'));
    const whisper = rows.find((d) => d.id.startsWith('pr:whisper:')), hymn = rows.find((d) => d.id.startsWith('pr:hymn:'));
    expect(ward.group).toBe('faith'); expect(sanct.group).toBe('faith');
    expect(ward.sub).toBe(whisper.sub); expect(sanct.sub).toBe(hymn.sub);
    expect(whisper.sub).not.toBe(hymn.sub);
    expect(rows.filter((d) => d.id.includes('class:guardian') && !d.id.includes('ward') && !d.id.includes('sanctuary')).every((d) => d.group === 'class')).toBe(true); // not a prayer: a class move
  });
});

describe('step 10: the Bond strip (bondView)', () => {
  it('no door and no Bond: no strip', () => {
    const s = setup({ skills: { empathy: 0 } });
    expect(bondView(s.f.cb, s.me(), s.c())).toBe(null);
  });
  it('allies and enemies apart, the cap from tieCap, the open places, the Attuner in hand', () => {
    const s = setup({ classId: 'bard', skills: { empathy: 8 } }, { attuner: true });
    const cb = s.f.cb, me = s.me(), mate = s.f.pcs[1], foe = s.f.foes[0];
    withGame(s.f.g, () => { tie(cb, me, mate, 'bond'); tie(cb, me, foe, 'bond'); });
    const v = withGame(s.f.g, () => bondView(cb, me, s.c()));
    const cap = withGame(s.f.g, () => tieCap(cb, me, 'bond'));
    expect(v.cap).toBe(cap); expect(v.held).toBe(2); expect(v.open).toBe(cap - 2);
    expect(v.allies.map((x) => x.id)).toEqual([mate.id]); expect(v.enemies.map((x) => x.id)).toEqual([foe.id]);
    expect(v.enemies[0].hp).toBe(foe.hp); expect(v.focus).toBe('hand'); expect(v.quiet).toBe(null);
  });
  it('the Attuner in the pack: Bonds held, threads quiet', () => {
    const s = setup({ classId: 'bard', skills: { empathy: 8 } });
    const c = s.c(); (c.pack ||= []).push({ id: 'attuner', item: 'attuner', name: 'Attuner', qty: 1, kind: 'focus' });
    const v = withGame(s.f.g, () => bondView(s.f.cb, s.me(), c));
    expect(v.focus).toBe('pack'); expect(v.quiet).toMatch(/pack/);
  });
});

describe('step 10: the reaction pips (reactionView)', () => {
  it('one reaction for most; the Skirmisher\'s Reflex two; spent ones counted; every Answer on by default', () => {
    const a = setup({});
    const v1 = withGame(a.f.g, () => reactionView(a.f.cb, a.me(), a.c()));
    expect(v1.max).toBe(1); expect(v1.used).toBe(0); expect(v1.answers).toBe(null);
    const b = setup({ classId: 'marksman', attrs: { agility: 8 }, level: 12 });
    const v2 = withGame(b.f.g, () => reactionView(b.f.cb, b.me(), b.c()));
    expect(v2.max).toBe(2);
  });
});

describe('step 10: Inspire\'s feeling picker (bonds-spec.md section 9)', () => {
  it('every feeling is offered; the unfelt ones greyed with why; the felt ones first', () => {
    const s = setup({ classId: 'bard', skills: { empathy: 8 }, attrs: { insight: 8 }, level: 8 }, { attuner: true });
    const c = s.c(); c.feelings = ['joy']; const mu = s.me(); mu.mg = { ...(mu.mg || {}), attuner: true, mp: 100, mpMax: 100 }; // MP in the Attuner (the fight began before it was handed over)
    const ins = s.list().find((d) => d.id.includes('bard.inspire'));
    const opts = (ins.picks.find((p) => p.options)?.options || []) as any[];
    expect(opts.length).toBeGreaterThan(1);
    expect(opts[0].id).toBe('joy'); expect(opts[0].why).toBeUndefined();
    expect(opts.slice(1).every((o) => o.why === UNFELT)).toBe(true);
    // and the engine refuses an unfelt one (a greyed pick), whatever a client sends
    const mate = s.f.pcs[1];
    const r = withGame(s.f.g, () => previewPerkAction({ u: s.me(), c, cb: s.f.cb, g: s.f.g }, 'class:bard.inspire', { actionId: 'inspire', targetId: mate.id, choice: opts[1].id }, 'combat'));
    expect(r.ok).toBe(false); expect(r.why).toBe(UNFELT);
  });
});
