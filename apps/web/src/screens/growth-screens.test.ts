// Sigil 1.5 growth on screen (rules 1.10; spec 2, 3, 7): the Magic tab's study bar, the Learn chooser in the five word
// groups (copied words first), the known-to-study list, word chips with use counts and stars, inflections greyed until
// earned; the collapsible, grouped workshop (open state remembered); a sigil mark on the area map and its panel.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, positionsOf, standable, zoneMap, refOf, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
const LS = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => (LS.has(k) ? LS.get(k)! : null), setItem: (k: string, v: string) => { LS.set(k, String(v)); }, removeItem: (k: string) => { LS.delete(k); } });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = 'host') => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const { resetOpenCache, isOpen, sigilWordGroups } = await import('../game/workshopGroups');
const { starUri, markSvg } = await import('../game/glyphs');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function start(seed = 'growth-ui') {
  LS.clear(); resetOpenCache();
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  doAct({ type: 'char/add', sheet: sheetFrom('sigilist', 'Ilse') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
  const c: any = Object.values(G.characters)[0];
  c.sigils = ['fire', 'seek']; c.skills.brain_power = 1; c.skills.rumination = 0; c.skills.eloquence = 0;
  c.sigilGrowth = { study: 0, picksUsed: 0, free: 0, paid: [], toStudy: [], uses: {} };
  const L: any = new MainLogic({});
  L.setState = (x: any) => { L.state = { ...L.state, ...(typeof x === 'function' ? x(L.state) : x) }; };
  L.setState({ tab: 'magic' });
  return { c: () => G.characters[c.id] as any, L };
}

describe('the Magic tab: study and learning (rules 1.10.2)', () => {
  it('shows study toward the next word; a pick opens the chooser in the five groups, copied words first; picking learns it', () => {
    const { c, L } = start();
    let r = L.renderVals();
    expect(r.mg.st.text).toBe('0 STUDY'); expect(r.mg.st.next).toBe('NEXT WORD AT 6'); expect(r.mg.st.canLearn).toBe(false);
    c().sigilGrowth.study = 9; c().sigilGrowth.toStudy = ['ward'];
    r = L.renderVals();
    expect(r.mg.st.next).toBe('NEXT WORD AT 14'); expect(r.mg.st.meterNow).toBe('3'); expect(r.mg.st.meterMax).toBe('8');
    expect(r.mg.st.canLearn).toBe(true); expect(r.mg.st.line).toMatch(/1 pick waits\./);
    expect(r.mg.st.toStudy.map((x: any) => x.word)).toEqual(['WARD']);
    r.mg.st.openPick(); r = L.renderVals();
    expect(r.mg.st.picking).toBe(true);
    const groups = r.mg.st.pick.groups.map((g: any) => g.key);
    expect(groups).toEqual(['copied', 'subject', 'reach', 'delivery', 'burst', 'filter']);
    expect(r.mg.st.pick.groups[0].items.map((x: any) => x.word)).toEqual(['WARD']);
    const all = r.mg.st.pick.groups.flatMap((g: any) => g.items.map((x: any) => x.key));
    expect(all).not.toContain('fire'); expect(all).not.toContain('seek'); expect(all.filter((x: string) => x === 'ward').length).toBe(1);
    r.mg.st.pick.groups[0].items[0].pick();
    expect(c().sigils).toContain('ward'); expect(c().sigilGrowth.toStudy).toEqual([]);
    r = L.renderVals(); expect(r.mg.st.picking).toBe(false); expect(r.mg.st.canLearn).toBe(false);
  });
  it('a pick with the cap full is banked, and says so; a free word ignores the cap', () => {
    const { c, L } = start();
    c().sigils = ['fire', 'seek', 'arc', 'ward', 'mend']; c().sigilGrowth.study = 6; // cap 4 + Brain Power 1 = 5
    let r = L.renderVals();
    expect(r.mg.st.canLearn).toBe(false); expect(r.mg.st.why).toMatch(/banked: you know 5 words, the most Brain Power allows \(5\)/);
    c().sigilGrowth.free = 1; r = L.renderVals();
    expect(r.mg.st.canFree).toBe(true); expect(r.mg.st.freeLabel).toBe('Take a free word (1)');
    r.mg.st.openFree(); r = L.renderVals();
    expect(r.mg.st.pickHead).toMatch(/FREE WORD/);
    r.mg.st.pick.groups.find((g: any) => g.key === 'reach').items[0].pick();
    expect(c().sigils.length).toBe(6); expect(c().sigilGrowth.free).toBe(0);
  });
});

describe('the Magic tab: word mastery (rules 1.10.3)', () => {
  it('each word shows its uses and star, and its inflection greyed until Mastered', () => {
    const { c, L } = start();
    let r = L.renderVals();
    const card = (w: string) => r.mg.sig.words.find((x: any) => x.key === w);
    expect(card('fire').tierText).toBe('NEW · 0 USES / 10'); expect(card('fire').starAlt).toBe('NEW');
    expect(card('fire').inflText).toMatch(/^AT 30 USES · Burning lasts \+1 round/); expect(card('fire').inflStyle).toMatch(/dashed/);
    c().sigilGrowth.uses = { fire: 12, seek: 31 }; r = L.renderVals();
    expect(card('fire').tierText).toBe('PRACTISED · 12 USES / 30');
    expect(decodeURIComponent(card('fire').star)).toContain('fill="none"');
    expect(card('seek').tierText).toBe('MASTERED · 31 USES'); expect(card('seek').inflText).toMatch(/^INFLECTION ON · /);
    expect(decodeURIComponent(card('seek').star)).toContain('fill="#8BDEEE"');
  });
});

describe('the shared workshop: collapsible and grouped (spec 7)', () => {
  it('the Sigil section groups words by the five groups; closing a group or the section is remembered', () => {
    const { c, L } = start();
    c().sigils = ['fire', 'seek', 'pull', 'kin'];
    let r = L.renderVals();
    expect(r.mg.sig.ws.groups.map((g: any) => [g.key, g.count])).toEqual([['subject', '1'], ['reach', '1'], ['delivery', '1'], ['filter', '1']]);
    r.mg.sig.ws.groups[1].toggle(); r = L.renderVals();
    expect(r.mg.sig.ws.groups[1].open).toBe(false); expect(r.mg.sig.ws.groups[1].hasItems).toBe(false);
    expect(LS.get('phc.ws.magic.sigil.reach')).toBe('0');
    resetOpenCache(); expect(isOpen('magic.sigil', 'reach')).toBe(false); // read back from storage
    r.mg.sig.ws.toggle(); r = L.renderVals();
    expect(r.mg.sig.ws.open).toBe(false); expect(r.mg.sig.ws.expanded).toBe('false');
  });
  it('the Outburst section groups the designs and the 4.0 codex (templates, feelings, modules by gate), and collapses on its own', () => {
    const { c, L } = start();
    c().soulKnown = { schools: ['force'], modules: ['burst_shape', 'pierce'], tones: [] };
    let r = L.renderVals();
    const keys = r.mg.soul.ws.groups.map((g: any) => g.key);
    expect(keys).toEqual(['designs', 'templates', 'feelings', 'modules']);
    // The modules group holds one group per gate skill, each collapsible and remembered like the rest (closed at first).
    const gates = r.mg.soul.ws.groups.find((g: any) => g.key === 'modules');
    expect(gates.open).toBe(false); gates.toggle(); r = L.renderVals();
    const mods = r.mg.soul.ws.groups.find((g: any) => g.key === 'modules').items[0].gates;
    expect(mods.groups[0].key).toBe('lore_master'); expect(mods.groups.at(-1).key).toBe('advanced');
    mods.groups[0].toggle(); r = L.renderVals();
    expect(r.mg.soul.ws.groups.find((g: any) => g.key === 'modules').items[0].gates.groups[0].hasItems).toBe(true);
    r.mg.soul.ws.toggle(); r = L.renderVals();
    expect(r.mg.soul.ws.open).toBe(false); expect(r.mg.sig.ws.open).toBe(true);
  });
  it('sigilWordGroups keeps every word, Subjects in class order', () => {
    const gs = sigilWordGroups(['seek', 'shock', 'ward', 'fire', 'kin', 'bogus'], (x) => x);
    expect(gs.map((g) => [g.key, g.items])).toEqual([['subject', ['shock', 'fire', 'ward']], ['reach', ['seek']], ['delivery', []], ['burst', []], ['filter', ['kin']], ['other', ['bogus']]]);
  });
});

describe('a sigil mark on the area map (rules 1.10, The Magic panel rule 4)', () => {
  it('draws the carved plate (unread until copied), and the panel shows age, damage, TN, the skills and the outcome', () => {
    const { c, L } = start('mark-ui');
    const at = positionsOf(G)[c().id], map = zoneMap(G), [x, y] = at.split(',').map(Number);
    const k = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((t) => standable(map, t) && !Object.values(positionsOf(G)).includes(t))!;
    doAct({ type: 'narrator/turn', turn: { narration: 'A word on the wall.', objects: [{ action: 'place', id: 'mk1', kind: 'sigil_mark', at: refOf(k), approaches: [], name: 'Old warding post', text: 'A word cut deep.', word: 'ward', age: 'old', damage: 'worn' }] } });
    L.setState({ tab: 'skills', area: true, wAct: 'move' });
    let r = L.renderVals();
    const cell = r.areaCells.find((m: any) => m.key === k);
    expect(cell.hasSigMark).toBe(true); expect(cell.hasGlyph).toBe(false);
    expect(decodeURIComponent(cell.sigMark)).not.toContain('M6 6 L12 4'); // unread: scratches, not the WARD glyph
    cell.click(); r = L.renderVals();
    expect(r.objPanel.isMark).toBe(true);
    expect(r.objPanel.mark.kicker).toBe('SIGIL MARK · OLD · WORN · TN 16');
    expect(r.objPanel.mark.word).toMatch(/^An unread word/);
    expect(r.objPanel.mark.rule).toMatch(/better of Acuity or Rumination, 2 AP/);
    expect(r.objPanel.approaches[0].skills[0].name).toBe('Analysis or Rumination');
    expect(r.objPanel.approaches[0].success).toMatch(/copy the word for study/);
    expect(r.objPanel.mark.hasOutcome).toBe(false);
    (G.story.objects!.find((o) => o.kind === 'sigil_mark' && o.pos === k) as any).copiedBy = [c().id]; c().sigilGrowth.toStudy = ['ward'];
    r = L.renderVals();
    expect(r.objPanel.mark.word).toMatch(/^WARD · /); expect(r.objPanel.mark.outcome).toMatch(/Copied: WARD is on your known-to-study list/);
  });
  it('the SVG marks: stars by tier, the plate by age and damage', () => {
    expect(decodeURIComponent(starUri('new'))).toContain('stroke-dasharray');
    expect(markSvg('ward', { age: 'fresh' })).toContain('feGaussianBlur');
    expect(markSvg('ward', { damage: 'worn' })).toContain('stroke-dasharray');
    expect(markSvg('ward', { damage: 'broken' }).match(/stroke="#05070B"/g)!.length).toBeGreaterThan(1);
  });
});
