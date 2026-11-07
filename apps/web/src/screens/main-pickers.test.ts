// Every story / area-map action is usable by clicking (Leon: "if it does not have a button it does not work"): the
// Perks strip opens an action's own panel (never the Say box, no shared detail field), the twin's three designs come
// from a design picker, and every engine action that reads an input has a picker for it (game/actionPickers.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, registered, handlerOf, type GameState, type Sheet } from '@engine';
import { pickerFor, buildArgs, ON_MAP } from '../game/actionPickers';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '' });
let G: GameState;
const view = () => ({ game: viewFor(G, 'host'), me: { id: 'host', name: 'Leon' }, role: 'host', screen: 'main', toast: null, savedAt: 0 });
const doAct = (a: any, by = 'host') => { G = apply(G, a, by); };
vi.mock('../game/store', () => ({ getState: () => view(), act: (a: any) => doAct(a), go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {} }));
const { MainLogic } = await import('./main.js');
const sheetFrom = (archId: string, name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
const tick = (ms = 0) => new Promise((res) => setTimeout(res, ms));
function story() {
  G = newGame('ROOM', { id: 'host', name: 'Leon' }, 'seed-pick');
  doAct({ type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') });
  doAct({ type: 'session/start' });
  doAct({ type: 'narrator/begin' });
  doAct({ type: 'narrator/turn', turn: { narration: 'The rear pad.', sceneTitle: 'The pad' } });
  return { c: Object.values(G.characters)[0], L: new MainLogic({}) as any };
}

describe('the Perks strip opens an action\'s own panel', () => {
  it('a prose action (Established Fact): a text box under the strip, its prompt, Confirm; the Say box is untouched', async () => {
    const { c, L } = story();
    G.characters[c.id].perks = [{ id: 'established_fact', tier: 'mastered' }];
    L.state.draft = 'Hello there';
    const sp = () => L.renderVals().storyPerks.find((p: any) => /Established Fact/.test(p.label));
    expect(sp().label).toMatch(/^Established Fact…/);
    sp().pick(); await tick();
    let v = L.renderVals(); expect(v.stripOpen).toBe(true);
    const f = v.stripPick.fields[0]; expect(f).toMatchObject({ isProse: true, head: 'The fact you state' });
    expect(v.stripPick.cantConfirm).toBe(true);
    f.onText({ target: { value: 'The reactor vents through the east duct.' } }); await tick();
    v = L.renderVals(); expect(v.stripPick.cantConfirm).toBe(false);
    v.stripPick.confirm(); await tick();
    expect(G.story.entries.some((e: any) => /states a fact: "The reactor vents through the east duct\."/.test(e.text))).toBe(true);
    expect(L.state.draft).toBe('Hello there');
    expect(L.renderVals().stripOpen).toBe(false);
    // There is no shared detail field any more.
    expect('pkDetail' in L.renderVals()).toBe(false);
  });

  it('Manifest the twin: three Outburst slots (school, option, modules up to the slots), the warning, the engine\'s verdict, Confirm', async () => {
    const { c, L } = story();
    const ch = G.characters[c.id] as any;
    ch.classId = 'medic'; ch.advancedClass = 'twinbound'; ch.skills.will_power = 3;
    ch.soulKnown = { schools: ['damage', 'buff', 'control'], modules: ['homing', 'rain', 'swift'] };
    const sp = () => L.renderVals().storyPerks.find((p: any) => /Manifest the twin/.test(p.label));
    expect(sp()).toBeTruthy(); sp().pick(); await tick();
    let P = L.renderVals().stripPick;
    expect(P.hasWarn).toBe(true); expect(P.warn).toMatch(/can't be changed later/);
    let slots = P.fields[0].slots; expect(slots).toHaveLength(3);
    expect(slots[0].schools.map((o: any) => o.label)).toEqual(['Damage', 'Buff', 'Control']);
    expect(P.cantConfirm).toBe(true); expect(P.verdict).toMatch(/Pick a school for Outburst 1/);
    // Slot 1: Damage + Homing + Rain (2 slots at Will Power 3: a third is locked).
    slots[0].schools[0].pick(); await tick();
    L.renderVals().stripPick.fields[0].slots[0].modules.find((m: any) => /Homing/.test(m.label)).pick(); await tick();
    L.renderVals().stripPick.fields[0].slots[0].modules.find((m: any) => /Rain/.test(m.label)).pick(); await tick();
    slots = L.renderVals().stripPick.fields[0].slots;
    expect(slots[0].modsHead).toBe('MODULES · 2 / 2'); expect(slots[0].modules.find((m: any) => /Swift/.test(m.label)).locked).toBe(true);
    // Slot 2: Buff, its option (the school's first is preset; pick +2 Defense); slot 3: Control.
    slots[1].schools[1].pick(); await tick();
    slots = L.renderVals().stripPick.fields[0].slots; expect(slots[1].options.map((o: any) => o.label)).toEqual(['+2 to hit', '+2 Defense', 'Heal 30']);
    slots[1].options[1].pick(); await tick();
    L.renderVals().stripPick.fields[0].slots[2].schools[2].pick(); await tick();
    P = L.renderVals().stripPick;
    expect(P.cantConfirm).toBe(false); expect(P.verdict).toMatch(/^The twin: /);
    P.confirm(); await tick();
    const tw = (G.characters[c.id] as any).state.twin;
    expect(tw.designs.map((d: any) => [d.school, d.modules, d.option || ''])).toEqual([['damage', ['homing', 'rain'], ''], ['buff', [], 'defense'], ['control', [], 'push']]);
    expect(G.story.entries.some((e: any) => /twin leans through for the first time/.test(e.text))).toBe(true);
    expect(sp().off).toBe(true);
  });

  it('Key a design to a gauge: design chips and gauge chips, sent as "designId:gauge"', async () => {
    const { c, L } = story();
    const ch = G.characters[c.id] as any;
    ch.classId = 'medic'; ch.advancedClass = 'heartfed'; ch.outbursts = [{ id: 'o1', name: 'Red Rain', school: 'damage', modules: ['rain'] }];
    const sp = () => L.renderVals().storyPerks.find((p: any) => /Key a design/.test(p.label));
    sp().pick(); await tick();
    let P = L.renderVals().stripPick;
    P.fields[0].opts[0].pick(); await tick();
    L.renderVals().stripPick.fields[1].opts.find((o: any) => o.label === 'Grief').pick(); await tick();
    P = L.renderVals().stripPick; expect(P.cantConfirm).toBe(false); P.confirm(); await tick();
    expect((G.characters[c.id] as any).state.heartKeys).toEqual({ o1: 'grief' });
  });
});

describe('every story and area-map action is usable by clicking', () => {
  // Actions whose input is optional (the engine has a stated default), so a plain button is enough.
  const BUTTON_OK: Record<string, string> = {
    'perk:shrug_it_off#shrug_it_off': 'shrugs off the first Body debuff',
    'trait:daggerfall_veteran#seen_it_before': 'the question is always "how will they move next"',
    'class:scribe.stored_spell#trigger_story': 'sets off the oldest stored spell',
    'class:guardian.sanctuary#sanctuary_story': 'the sanctuary is around the party',
    'perk:origami_hands#improvise': 'a fight action (the trap on your tile); the combat panel picks its mode',
  };
  it('each action that reads a choice, a name or words has a picker (chips from the engine\'s data, or a prose box)', () => {
    const { c } = story();
    const x = { g: viewFor(G, 'host'), c: G.characters[c.id], how: 'story' as const };
    const missing: string[] = [], bad: string[] = [];
    for (const k of registered()) for (const d of handlerOf(k)?.actions || []) {
      if (!d.scope.some((s) => s === 'story' || s === 'world') || ON_MAP.includes(d.target)) continue;
      const key = k + '#' + d.id, src = String(d.run) + String(d.preview || '');
      const reads = /\b(a|args)\.(choice|npc|text)\b|charNamed|pickChar|npcRef|surgeryTarget|textArg/.test(src) || d.target === 'text' || d.target === 'npc';
      const e: any = { id: k, actionId: d.id, label: d.label, text: d.text || '', target: d.target, ...(d.pick ? { options: Array.isArray(d.pick) ? d.pick.map((p) => ({ id: p, label: p })) : [{ id: 'x', label: 'X' }], pickMulti: d.pickMulti || 1 } : {}), ...(d.pickLabel ? { pickLabel: d.pickLabel } : {}) };
      const P = pickerFor(e, x);
      if (reads && !P && !BUTTON_OK[key] && d.target !== 'check') missing.push(key);
      if (P) {
        // A picker's prose box is only for actions that read words; a typed name or id is never asked for.
        if (P.fields.some((f) => f.kind === 'prose') && !/\b(a|args)\.text\b|textArg|charNamed/.test(src) && d.target !== 'text') bad.push(key + ' (prose it never reads)');
        if (/\(its id\)|designId:|type how many|choice:/i.test(P.head + P.fields.map((f) => f.head).join(' '))) bad.push(key + ' (asks for a coded value)');
        // Filled in, every picker builds args.
        const v: any = {}; for (const f of P.fields) v[f.key] = f.kind === 'chips' ? (f.options[0] ? [f.options[0].id] : []) : f.kind === 'prose' ? 'words' : [{ school: 'damage', modules: [] }, { school: 'damage', modules: [] }, { school: 'damage', modules: [] }];
        if (P.fields.every((f) => f.kind !== 'chips' || f.optional || f.options.length)) { const r = buildArgs(P, v, x); if (typeof r === 'string') bad.push(key + ' (' + r + ')'); }
      }
    }
    expect(missing).toEqual([]); expect(bad).toEqual([]);
  });
  it('the shared Perks detail field and the Say-box path are gone', () => {
    const tpl = readFileSync(new URL('../templates/main.template.html', import.meta.url), 'utf8'), js = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
    expect(tpl).not.toMatch(/Perks detail/); expect(js).not.toMatch(/pkDetail|Write it in the Say box/);
  });
});
