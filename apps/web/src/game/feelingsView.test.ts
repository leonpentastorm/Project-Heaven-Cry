// Outburst 4.0 on screen (game/feelingsView.ts, heartView.ts): the feeling buttons with their steps and refusals (the
// engine's), the stage bar's feeling segments and the "now HEALS" word, Revert, residue tiles, the practice bar, and the
// Magic tab's codex grouped by gate skill.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, FEELINGS, type Sheet, newCharacter, startCombat, beginOutburst, pumpOutburst, releaseOutburst } from '@engine';
import { heartPanel, heartVals } from './heartView';
import { FEELING_INK, feelingButtons, feelingRows, FEELINGS_OPEN_MAX, residueTiles, residueTileStyle, practiceView, moduleGroups, feelingCodex, iconSrc, iconStyle } from './feelingsView';
import { setHeartArt } from './heartIcons';
import { placedView } from './sigilView';

const sheetFrom = (name = 'Test'): Sheet => {
  const a = ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soul', traits: [], skills: { ...a.preset, will_power: 6, lore_master: 2, empathy: 4 }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
function fight(feelings = ['rage', 'love', 'joy']) {
  const c: any = newCharacter('c1', 'p1', sheetFrom('Vale'));
  c.outbursts = [{ id: 'bb', name: 'Burst', school: 'damage', modules: ['burst'] }]; c.soulKnown = { schools: ['damage'], modules: ['burst'], tones: [] }; c.feelings = feelings;
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'Raider', tier: 'soldier', weapon: 'fists', at: 'E6' }], 'easy', { state: 4 }, []);
  cb.turn = cb.order.indexOf(cb.units.find((x: any) => x.side === 'pc').id);
  const u = cb.units.find((x: any) => x.side === 'pc'); u.ap = 9; u.mg.mp = 400; u.mg.mpMax = 400; u.mg.strainLimit = 20;
  return { c, cb, u };
}
const rng = { state: 7 } as any;

describe('the feeling buttons (rules 1.8 section 7)', () => {
  it('one per known feeling, with its step, the multiplier after and its effect; the stage bar colours a feeling\'s segment', () => {
    const { cb, u } = fight(); expect(beginOutburst(cb, rng, u, 'bb', undefined, true)).toBeNull();
    const fb = feelingButtons(cb, u);
    expect(fb.map((b) => b.id)).toEqual(['rage', 'love', 'joy']);
    expect(fb.find((b) => b.id === 'rage')).toMatchObject({ ok: true, step: 0.5, mult: 1.3, stepText: '+0.5' }); // rules 1.19: Rage +0.5 on ×0.8
    expect(pumpOutburst(cb, rng, u, 'love')).toBeNull();
    const p = heartPanel(cb, u)!;
    expect(p.felt).toEqual(['love']); expect(p.does).toEqual(['now HEALS']); expect(p.stages[1].feeling).toBe('love');
    const v: any = heartVals(p, () => {}); // the counter short; what the feelings change on its own wrapping line
    expect(v.multText).toBe('×1.1'); expect(v.doesText).toBe('now HEALS'); expect(v.doesStyle).toMatch(/white-space: normal/); expect(v.stages[1].glyph).toMatch(/^data:image\/svg\+xml|^\/assets/);
    expect(v.btns.map((b: any) => b.key)).toContain('revert'); // a pump this turn can be taken back
  });
  it('a refused feeling shows why; past six they collapse under "Feelings ▸" with a search', () => {
    const all = FEELINGS.map((f) => f.id), { cb, u } = fight(all); beginOutburst(cb, rng, u, 'bb', undefined, true);
    u.ap = 0; u.mg.firstUsed = true; u.mg.freePumps = 0;
    const fb = feelingButtons(cb, u); expect(fb.length).toBe(25); expect(fb[0]).toMatchObject({ ok: false, why: 'Needs 1 AP.' });
    let r = feelingRows(fb, false, '', () => {}); expect(r.many).toBe(fb.length > FEELINGS_OPEN_MAX); expect(r.rows.length).toBe(0); expect(r.toggleLabel).toMatch(/Feelings ▸ \(25\)/);
    r = feelingRows(fb, true, 'grie', () => {}); expect(r.rows.map((x) => x.key)).toEqual(['grief']); expect(r.rows[0].cost).toMatch(/^✕ Needs 1 AP/);
  });
  it('every feeling has a colour, and none is a state colour', () => {
    for (const f of FEELINGS) expect(FEELING_INK[f.id], f.id).toMatch(/^#[0-9A-F]{6}$/i);
    for (const bad of ['#6FEA77', '#F65157', '#5C9EFF', '#FFFFFF']) expect(Object.values(FEELING_INK)).not.toContain(bad);
  });
});

describe('residue, practice and the codex', () => {
  it('residue tiles are tinted in the feeling\'s colour (harming ones striped) and listed in the placed layer', () => {
    const { cb, u } = fight(); beginOutburst(cb, rng, u, 'bb', undefined, true); pumpOutburst(cb, rng, u, 'rage');
    const foe = cb.units.find((x: any) => x.side === 'foe'); expect(releaseOutburst(cb, rng, u, foe.pos)).toBeNull();
    const rt = residueTiles(cb); expect(rt.size).toBeGreaterThan(0); const r = [...rt.values()][0];
    expect(r).toMatchObject({ feeling: 'rage', ink: FEELING_INK.rage, kind: 'harms' }); expect(residueTileStyle(r)).toMatch(/repeating-linear-gradient/);
    const pv = placedView(cb, 'pc'); expect(pv.kinds.has('residue')).toBe(true); expect(pv.rows.some((x) => /Rage residue/.test(x.label))).toBe(true);
  });
  it('the practice bar reads practice, the next pick and the picks to take; modules group by gate skill, the advanced classes\' own modules hidden while their classes are shelved', () => {
    const { c } = fight(); c.soulPractice = 6; c.skills.will_power = 2; c.skills.lore_master = 0;
    const p = practiceView(c)!; expect(p.practice).toBeGreaterThanOrEqual(6); expect(p.picks).toBeGreaterThanOrEqual(1); expect(p.text).toMatch(/^PRACTICE \d+ · next pick at \d+/);
    const gs = moduleGroups(c); expect(gs.map((g) => g.key)).toEqual(['lore_master', 'will_power', 'empathy', 'camaraderie', 'implication', 'composure']); // no 'advanced' group: those classes are shelved (Leon, live 0.24.0: don't show what doesn't exist)
    const fuse = gs[0].modules.find((m) => m.id === 'fuse')!; expect(fuse).toMatchObject({ ok: false, gate: 'Lore Master 4' });
    expect(gs.flatMap((g) => g.modules).some((m) => m.id === 'echo')).toBe(false); // Heartfed's own module, shelved
    const fc = feelingCodex(c); expect(fc.length).toBe(25); expect(fc.find((f) => f.id === 'grief')).toMatchObject({ known: false }); expect(fc.find((f) => f.id === 'grief')!.trigger).toMatch(/^Felt first when/);
  });
  it('iconSrc: painted art\'s URL wins; an SVG drawing is tinted into a data URI', () => {
    expect(iconSrc('<img src="/assets/feeling-rage.webp" alt="">', '#fff')).toBe('/assets/feeling-rage.webp');
    expect(iconSrc('<svg viewBox="0 0 24 24"><path stroke="currentColor" d="M0 0"/></svg>', '#FF6A3D')).toMatch(/^data:image\/svg\+xml,.*%23FF6A3D/);
  });
});

describe('painted icons take the ink the drawn ones took', () => {
  it('a feeling button, the codex and the stage glyph carry the feeling colour (or the grey / dark ink) on the painted file', () => {
    setHeartArt({ 'feeling-rage': '/assets/feeling-rage.webp', 'feeling-love': '/assets/feeling-love.webp', 'module-burst': '/assets/module-burst.webp', 'module-split': '/assets/module-split.webp' });
    try {
      const { cb, u, c } = fight(); expect(beginOutburst(cb, rng, u, 'bb', undefined, true)).toBeNull();
      const b = feelingButtons(cb, u).find((x) => x.id === 'rage')!;
      expect(b.iconStyle).toContain('background-color: ' + FEELING_INK.rage); expect(b.iconStyle).toContain('/assets/feeling-rage.webp');
      const row = feelingRows([b], true, '', () => {}).rows[0]; expect(row.iconStyle).toBe(b.iconStyle);
      const cx = feelingCodex({ feelings: ['rage'] });
      expect(cx.find((f) => f.id === 'rage')!.iconStyle).toContain('background-color: ' + FEELING_INK.rage);
      expect(cx.find((f) => f.id === 'love')!.iconStyle).toContain('background-color: #7F8BA1'); // not felt yet: grey
      const mods = moduleGroups({ ...c, soulKnown: { schools: ['damage'], modules: ['burst'], tones: [] } }).flatMap((g) => g.modules);
      expect(mods.find((m) => m.id === 'burst')!.iconStyle).toContain('background-color: #E7EBF3'); // known: the plain ink
      expect(mods.find((m) => m.id === 'split')!.iconStyle).toContain('background-color: #7F8BA1'); // unknown: grey
      expect(iconStyle('/assets/feeling-rage.webp', '#0A0D13')).toContain('background-color: #0A0D13'); // the lit stage segment's dark ink
    } finally { setHeartArt(null); }
  });
});

// Leon, live 0.24.0: "Rage: +0.5 · +0.5 to the multiplier…", "Grief: +0.2; +0.5 once an ally has fallen · +0.2, …":
// a short summary joined to the full sentence that begins with the same words. Each feeling: ONE step chip, its text once.
describe('a feeling says its step once', () => {
  const c: any = { feelings: FEELINGS.map((f: any) => f.id), soulKnown: { modules: [] } };
  it('the codex: a chip from the data\'s numbers, and the text without the step clause that only repeated it', () => {
    const cx = feelingCodex(c), by = (id: string) => cx.find((f) => f.id === id)!;
    expect(by('rage').step).toBe('+0.5'); expect(by('rage').effect).not.toMatch(/^\+0\.5/); expect(by('rage').effect).toMatch(/Strain/);
    expect(by('grief').step).toBe('+0.2 / +0.5'); expect(by('spite').step).toBe('+0.2 / +0.5'); expect(by('despair').step).toBe('+0.2 to +0.6');
    expect(by('calm').step).toBe('−0.4'); expect(by('fear').effect).toMatch(/^The Release throws you/);
    for (const f of cx) {
      // no summary joined on: the chip, then the text, and the plain step is not said again at the text's start
      expect(f.step + ' · ' + f.effect, f.id).not.toMatch(/·.*·/);
      if (!/\//.test(f.step) && !/ to /.test(f.step)) expect(f.effect.startsWith(f.step), f.id).toBe(false);
      // the card: name, the chip, the text once, then residue and when it is first felt
      const t = JSON.parse(f.tip);
      expect(t.chips, f.id).toEqual([f.step]);
      expect(t.lines.filter((l: any) => l.text === t.lines[0].text).length, f.id).toBe(1);
      expect(t.lines.some((l: any) => /^Felt first when/.test(l.label)), f.id).toBe(true);
    }
  });
});
