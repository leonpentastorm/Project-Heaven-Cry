// 0.28.2: the MAGIC tab's FIGMENTS section (screens/figmentsTab.js), the level-up card's Figments line and the line
// icons (game/figmentIcons.ts). Leon from the playtest: "no unlocks, no nothing, there isn't even a special icon for each
// summon". Everything shown comes from the engine's views (figmentLadderView, figmentDesignView); the editor sends the
// real figments/design action through the store, and the engine's refusals are what the screen says.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, FORM, FIG, FIG_DOOR, figmentLadderView, figmentDesignView, formsKnown, type GameState, type Sheet } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const toasts: string[] = [];
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = 'host') => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: (t: string) => { toasts.push(t); }, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const { figLevelUp } = await import('./levelup.js');
const { figmentIcon, figmentIconUri, figmentFaceOf, figmentIconOfUnit, figmentLogIcon, FIGMENT_ICON_IDS } = await import('../game/figmentIcons');
const { faceOf } = await import('./shared.js');

const F: any = FIG;
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId) || ARCHETYPES[0];
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
function story(vis: number) {
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-fig-' + vis);
  doAct({ type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'Vale') }); doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'Yard' } });
  const c = Object.values(G.characters)[0]; (G.characters[c.id] as any).skills = { ...c.skills, visualization: vis };
  const L: any = new MainLogic({}); L.setState({ tab: 'magic' });
  return { id: c.id, L };
}
const fig = (L: any) => L.renderVals().mg.fig;

describe('figment line icons (figmentIcons.ts)', () => {
  it('every form, the Scrap Turret and Picture name an icon that has a file; the URIs are inked (no currentColor)', () => {
    for (const row of [...F.forms, F.turret, ...F.items.filter((i: any) => i.icon)]) { expect(FIGMENT_ICON_IDS).toContain(row.icon); expect(figmentIcon(row.icon)).toMatch(/^<svg /); }
    const u = figmentIconUri(F.forms[0].icon, '#FFFFFF'); expect(u).toMatch(/^data:image\/svg\+xml,/); expect(decodeURIComponent(u)).not.toContain('currentColor');
    expect(decodeURIComponent(figmentIconUri(F.forms[0].icon, '#FFFFFF', { plate: '#0A0D13' }))).toContain('<circle'); expect(figmentIconUri('no-such-icon')).toBe('');
  });
  it('a Figment or a turret unit wears its row\'s icon where a portrait would be; any other unit keeps its initials', () => {
    const f = F.forms[1], fu = { id: 'ow-1', name: f.name, owned: { kind: 'figment' }, companion: f.id, figment: { form: f.id } };
    expect(figmentIconOfUnit(fu)).toBe(f.icon); expect(faceOf(fu)).toBe(figmentFaceOf(fu)); expect(faceOf(fu)).toMatch(/^data:image\/svg/);
    expect(figmentIconOfUnit({ owned: { kind: 'machine' }, companion: F.turret.id })).toBe(F.turret.icon);
    expect(faceOf({ id: 'foe', name: 'Foe' })).toBe(''); expect(figmentIconOfUnit({ owned: { kind: 'companion' }, companion: 'drone' })).toBe('');
  });
  it('a fight log line naming a Figment of this fight carries its icon (a whole word; the first named)', () => {
    const figs = [{ name: 'Hound', icon: FORM.beast.icon }, { name: 'Eye', icon: FORM.eye.icon }];
    expect(figmentLogIcon('Vale pictures Hound at C4 (5 charge; 1/2 held).', figs)).toBe(figmentIconUri(FORM.beast.icon));
    expect(figmentLogIcon('Eye stares at the Soldier; Hound waits.', figs)).toBe(figmentIconUri(FORM.eye.icon));
    expect(figmentLogIcon('Houndstooth fabric.', figs)).toBe(''); expect(figmentLogIcon('Nothing here.', figs)).toBe('');
  });
});

describe('the FIGMENTS section on the MAGIC tab', () => {
  it('no Visualization, no designs: not shown', () => { const { L } = story(0); expect(fig(L).show).toBe(false); });
  it('the ladder: every step, open or locked with its Visualization; NEW is the step just reached, in its own words (no forms: rules 1.70 learns them); the next is shown locked', () => {
    const at = F.ladder.find((r: any) => (r.designs || 0) > 0).points;
    const { L } = story(at); const v = fig(L), lv = figmentLadderView(at);
    expect(v.show).toBe(true);
    expect(v.steps.map((s: any) => s.state)).toEqual(lv.steps.map((s) => (s.latest ? 'NEW' : s.open ? '✓ OPEN' : 'LOCKED')));
    expect(v.steps.map((s: any) => s.at)).toEqual(F.ladder.map((r: any) => 'VISUALIZATION ' + r.points));
    expect(v.steps.map((s: any) => s.text)).toEqual(F.ladder.map((r: any) => r.text));
    // rules 1.70 item 5541: a ladder step opens no form; the forms are learned at the door figment_forms
    for (const st of lv.steps) expect(Object.keys(st)).not.toContain('forms');
    for (const s of v.steps) { expect(s.forms).toEqual([]); expect(s.hasForms).toBe(false); }
    expect(v.newHead).toBe('NEW · VISUALIZATION ' + at); expect(v.newForms).toEqual([]); expect(v.hasNewForms).toBe(false);
    expect(v.newText).toBe(lv.latest!.text); expect(v.newLine).toBe('New: ' + lv.latest!.text);
    expect(v.nextHead).toBe('NEXT · VISUALIZATION ' + lv.next!.points); expect(v.nextText).toBe(lv.next!.text);
    // the forms known at these points: the engine's count, all of them still to choose
    expect(lv.known.n).toBe(formsKnown({ skills: { visualization: at } } as any)); expect(lv.known.chosen).toEqual([]);
    expect(v.hasChoose).toBe(true); expect(v.choose[0].head).toContain(lv.known.n + ' forms known');
  });
  it('the design editor: pick a form and a trait from the view, name it, keep it (figments/design); then edit and drop it', () => {
    const at = F.ladder.find((r: any) => (r.designs || 0) > 0).points;
    const { id, L } = story(at);
    // rules 1.70 item 5541: no form is open before one is learned; learn one through the chooser first
    let v = fig(L); expect(v.canNew).toBe(false);
    v.choose[0].opts[v.choose[0].opts.length - 1].pick(); expect((G.characters[id] as any).doorPicks[FIG_DOOR]).toHaveLength(1);
    v = fig(L); expect(v.canNew).toBe(true); expect(v.noDesigns).toBe(true);
    v.newDesign(); v = fig(L); expect(v.ed.open).toBe(true);
    // locked forms are greyed with the engine's words; an open one is picked
    const locked = v.ed.forms.find((f: any) => f.off), open = v.ed.forms.filter((f: any) => !f.off);
    expect(locked.title).toMatch(/Visualization|forms you know/); locked.pick(); expect(toasts.pop()).toBe(locked.title); // the engine's words (formWhy)
    open[open.length - 1].pick(); v = fig(L); const form = open[open.length - 1].key; expect(v.ed.forms.find((f: any) => f.key === form).pressed).toBe('true');
    expect(v.ed.verdict).toBe('Name the design.'); expect(v.ed.cantSave).toBe(true);
    v.ed.onName({ target: { value: 'Lookout' } }); v = fig(L);
    // every trait says what it does on its face (figments.json's one line), its hover only why it can't be added
    for (const x of v.ed.traits) { expect(x.text, x.key).toMatch(/\S/); if (!x.off) expect(x.title).toBe(''); }
    const t = v.ed.traits.find((x: any) => !x.off); t.pick(); v = fig(L);
    expect(v.ed.traits.find((x: any) => x.key === t.key).pressed).toBe('true');
    // past the traits a design may carry, the others are refused with the engine's words
    expect(v.ed.traits.filter((x: any) => x.pressed !== 'true').every((x: any) => x.off && /trait/.test(x.title))).toBe(true);
    expect(v.ed.verdict).toMatch(/^Ready: \d+ charge/); expect(v.ed.cantSave).toBe(false);
    v.ed.save();
    expect(G.characters[id].figments).toEqual([{ id: expect.any(String), name: 'Lookout', form, traits: [t.key] }]);
    v = fig(L); expect(v.ed.open).toBe(false); expect(v.designs[0]).toMatchObject({ name: 'Lookout' }); expect(v.designs[0].icon).toMatch(/^data:image\/svg/);
    expect(v.designs[0].line).toContain(FORM[form].name);
    v.designs[0].edit(); v = fig(L); expect(v.ed.title).toBe('EDIT LOOKOUT'); v.ed.onName({ target: { value: 'Watcher' } }); fig(L).ed.save();
    expect(G.characters[id].figments!.map((d) => d.name)).toEqual(['Watcher']);
    fig(L).designs[0].drop(); expect(G.characters[id].figments).toEqual([]);
  });
  it('rules 1.70 item 5541, the forms known: a row of chips, every form; a click sends door/pick at figment_forms and the form is open; none past the count', () => {
    const at = F.forms_known.from;
    const { id, L } = story(at); let v = fig(L);
    const n = figmentLadderView(at).known.n;
    expect(n).toBe(formsKnown({ skills: { visualization: at } } as any)); expect(n).toBeGreaterThan(1);
    expect(v.hasChoose).toBe(true); expect(v.choose[0].opts.map((o: any) => o.key)).toEqual(F.forms.map((f: any) => f.id));
    for (const o of v.choose[0].opts) expect(o.icon).toMatch(/^data:image\/svg/);
    const chosen: string[] = [];
    for (let i = 0; i < n; i++) {
      expect(v.hasChoose, 'pick ' + (i + 1)).toBe(true);
      const o = v.choose[0].opts[0]; chosen.push(o.key); o.pick();
      expect((G.characters[id] as any).doorPicks[FIG_DOOR]).toEqual(chosen);
      v = fig(L);
      expect(v.choose.flatMap((c: any) => c.opts.map((x: any) => x.key))).not.toContain(o.key);
    }
    expect(v.hasChoose).toBe(false);
    // 0.33 (TRIAGE row 10): once chosen, the forms stay in sight on the MAGIC tab (the choice chips are gone)
    expect(v.hasHeld).toBe(true); expect(v.held.map((h: any) => h.key)).toEqual(chosen); expect(v.heldHead).toBe('FORMS KNOWN · ' + n + ' / ' + n);
    expect(figmentLadderView(at, G.characters[id]).known.chosen.map((f: any) => f.name)).toEqual(chosen.map((k) => FORM[k].name));
    // the forms learned are open in the design editor; every other form is greyed with the engine's words
    const dv = figmentDesignView(G.characters[id]);
    expect(dv.forms.filter((f: any) => f.open).map((f: any) => f.id)).toEqual(chosen);
    expect(dv.forms.filter((f: any) => !f.open).every((f: any) => /forms you know/.test(f.why))).toBe(true);
  });
  it('below the first design step, + NEW DESIGN is replaced by the engine\'s reason', () => {
    const { L } = story(1); const v = fig(L);
    expect(v.canNew).toBe(false); expect(v.newWhy).toMatch(/^Designs open at Visualization \d+\.$/);
  });
});

describe('the level-up card (the moment)', () => {
  it('the door skill\'s card: NEW with the step\'s own words when its points just reached a step (no forms: rules 1.70 learns them), else the next step locked; other skills none', () => {
    const at = F.ladder.find((r: any) => (r.designs || 0) > 0).points, lv = figmentLadderView(at);
    const v = figLevelUp(F.visualizer.door, at);
    expect(v).toMatchObject({ has: true, state: 'new', hasForms: false, forms: [] });
    expect(v.head).toBe('NEW · FIGMENTS AT VISUALIZATION ' + at); expect(v.text).toBe(lv.latest!.text);
    expect(v.next).toContain(String(lv.next!.points)); expect(v.next).toContain(lv.next!.text);
    const gap = Array.from({ length: 10 }, (_, i) => i + 1).find((q) => q > at && !F.ladder.some((r: any) => r.points === q))!;
    const between = figLevelUp(F.visualizer.door, gap); // past a step and short of the next: the next, locked
    expect(between.state).toBe('next'); expect(between.head).toContain('LOCKED');
    expect(between.head).toContain(String(figmentLadderView(gap).next!.points)); expect(between.hasForms).toBe(false);
    expect(figLevelUp('composure', at).has).toBe(false);
  });
});
