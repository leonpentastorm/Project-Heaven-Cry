// Skeleton 2.0 on the screens that are plain values (no DOM): the archetype step's cards and preview (nine attributes,
// no Core chips), the "?" skill page (the slot in words, what a point gives) and the attribute page.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, SKILL, CALLS, SAVE_SKILL_OF } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' } });
vi.stubGlobal('location', { search: '', hash: '' });
const { CreateLogic } = await import('./create.js');
const { D: D0, epccgVals, attrPageVals, slotLine, ATTR_GIVES } = await import('./shared');
const D: any = D0;

function screen(props: any = { startStep: 'archetype' }) {
  const l: any = new CreateLogic(props);
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  return l;
}
const holder = (state: any) => { const h: any = { state, setState: (x: any) => { h.state = { ...h.state, ...x }; } }; return h; };

describe('the archetype step', () => {
  it('all 46 cards show their nine attributes in the attributes\' inks, the highest marked, and the class they lead to', () => {
    const v = screen().renderVals();
    expect(v.archCards).toHaveLength(46);
    for (const card of v.archCards) {
      const a = D.arch.items.find((x: any) => x.id === card.key)!; expect(ARCHETYPES.some((x) => x.id === card.key)).toBe(true);
      expect(card.cores).toBeUndefined();
      expect(card.grid.map((c: any) => c.key)).toEqual(D.attrs.map((x: any) => x.id));
      expect(card.grid.map((c: any) => c.val)).toEqual(D.attrs.map((x: any) => (a.attributes as any)[x.id] || 1));
      const top = Math.max(...card.grid.map((c: any) => c.val));
      expect(card.grid.filter((c: any) => c.top === 'true').map((c: any) => c.val)).toEqual(card.grid.filter((c: any) => c.val === top).map(() => top));
      for (const c of card.grid) if (c.val > 1) expect(c.style).toContain(D.attrs.find((x: any) => x.id === c.key).ink);
      expect(card.leads).toBe('Leads to: ' + a.leans.map((l: string) => D.classes.find((k: any) => k.id === l).name).join(' or '));
      expect(JSON.stringify([card.grid.map((c: any) => [c.abbr, c.title]), card.leads])).not.toMatch(/body|mind|soul|core/i);
    }
  });
  it('the preview: nine attributes under three family headings, the highest marked, "leads to" from the archetype, no Core rows', () => {
    const l = screen(); l.setState({ arch: 'bulwark' });
    const v = l.renderVals(), a = D.arch.items.find((x: any) => x.id === 'bulwark')!;
    expect(v.pv.coreRows).toBeUndefined();
    expect(v.pv.attrFams.map((f: any) => f.name)).toEqual(['BODY', 'MIND', 'SOUL']);
    const rows = v.pv.attrFams.flatMap((f: any) => f.rows);
    expect(rows).toHaveLength(9);
    for (const r of rows) { expect(r.val).toBe((a.attributes as any)[r.key] || 1); expect(r.gives).toBe((ATTR_GIVES as any)[r.key]); }
    const top = Math.max(...rows.map((r: any) => r.val));
    expect(rows.filter((r: any) => r.top).every((r: any) => r.val === top)).toBe(true);
    expect(rows.some((r: any) => r.top)).toBe(true);
    expect(v.pv.leanIcons.map((x: any) => x.key)).toEqual(a.leans);
    // an attribute's name opens its page
    rows[0].open(); expect(l.state.attrPage).toBe(rows[0].key);
  });
  it('Custom: every attribute at 1, nothing marked', () => {
    const l = screen(); l.setState({ fam: 'custom', arch: 'custom' });
    const v = l.renderVals();
    expect(v.archCards[0].grid.every((c: any) => c.val === 1 && c.top === 'false')).toBe(true);
    expect(v.pv.attrFams.flatMap((f: any) => f.rows).every((r: any) => r.val === 1 && !r.top)).toBe(true);
  });
  it('the Lock in step\'s stats are the engine\'s, each with the skill behind it', () => {
    const v = screen({ sampleName: 'T', sampleArch: 'bulwark', startStep: 'lockin' }).renderVals();
    const row = (k: string) => v.stats.find((r: any) => r.key === k);
    expect(row('hp_level').from).toBe(SKILL.pain_threshold.name);
    expect(row('hp_level').v).toBe('+' + (5 + 2 * (D.arch.items.find((x: any) => x.id === 'bulwark').preset.pain_threshold || 0)));
    expect(row('heal_given').from).toBe('Insight and ' + SKILL.empathy.name);
    expect(row('save_body').from).toBe(SKILL.guts.name);
  });
});

describe('the "?" skill page', () => {
  it('says the slot in words (no Greek letters, no family name) and what a point gives', () => {
    for (const s of D.skills as any[]) {
      const v = epccgVals(holder({ epccg: s.id }));
      expect(v.epOpen).toBe(true);
      expect(v.ep.line).toBe(slotLine(s.slot));
      expect(v.ep.line + v.ep.attrName).not.toMatch(/[αβγ]|Body|Mind|Soul/);
      expect(v.ep.attrName).toBe(D.attrs.find((a: any) => a.id === s.attr).name);
      expect(v.ep.give).toBe((SKILL as any)[s.id].per_point.text);
    }
    expect(slotLine('alpha')).toBe('How you fight');
    expect(slotLine('beta')).toBe('How you survive');
    expect(slotLine('gamma')).toBe('How you talk and notice: it rolls 1 better on checks');
  });
  it('the attribute in its header opens the attribute page', () => {
    const h = holder({ epccg: 'dexterity' });
    epccgVals(h).ep.openAttr();
    expect(h.state).toMatchObject({ epccg: null, attrPage: 'agility' });
    const v = epccgVals(h);
    expect(v.epOpen).toBe(false); expect(v.apOpen).toBe(true); expect(v.ap.name).toBe('Agility');
  });
});

describe('the attribute page', () => {
  it('every attribute: what a point gives, its three skills in order with their per-point lines, and what reads it', () => {
    for (const a of D.attrs as any[]) {
      const h = holder({ attrPage: a.id }), v = attrPageVals(h);
      expect(v.apOpen).toBe(true);
      expect(v.ap.gives.map((g: any) => g.text.toLowerCase()).join(', ')).toBe((ATTR_GIVES as any)[a.id].toLowerCase());
      expect(v.ap.skills).toHaveLength(3);
      expect(v.ap.skills.map((k: any) => k.slot)).toEqual([slotLine('alpha'), slotLine('beta'), slotLine('gamma')]);
      for (const k of v.ap.skills) expect(k.give).toBe((SKILL as any)[k.key].per_point.text);
      // its class, and its talking skill's Call
      expect(v.ap.reads.filter((r: any) => r.k === 'CLASS').map((r: any) => r.name)).toEqual([D.classes.find((c: any) => c.attribute === a.id).name]);
      const gamma = v.ap.skills[2].key, call = CALLS.find((c) => c.skill === gamma)!;
      expect(v.ap.reads.filter((r: any) => r.k === 'CALL').map((r: any) => r.name)).toEqual([call.name]);
      const saves = Object.values(SAVE_SKILL_OF).filter((id) => v.ap.skills.some((k: any) => k.key === id));
      expect(v.ap.reads.filter((r: any) => r.k === 'SAVE')).toHaveLength(saves.length);
      v.ap.skills[0].open(); expect(h.state).toMatchObject({ attrPage: null, epccg: v.ap.skills[0].key });
    }
  });
  it('closed when no attribute is open', () => { expect(attrPageVals(holder({})).apOpen).toBe(false); });
});
