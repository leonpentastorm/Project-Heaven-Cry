// Every story / area-map action is usable by clicking (Leon: "if it does not have a button it does not work"): the
// Perks strip opens an action's own panel (never the Say box, no shared detail field), the twin's three designs come
// from a design picker, and every engine action that reads an input has a picker for it (game/actionPickers.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, registered, handlerOf, type GameState, type Sheet } from '@engine';
import { pickerFor, buildArgs, gridPick, ON_MAP } from '../game/actionPickers';

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
    ch.soulKnown = { schools: ['damage', 'buff', 'control'], modules: ['homing', 'burst', 'swift'] };
    const sp = () => L.renderVals().storyPerks.find((p: any) => /Manifest the twin/.test(p.label));
    expect(sp()).toBeTruthy(); sp().pick(); await tick();
    let P = L.renderVals().stripPick;
    expect(P.hasWarn).toBe(true); expect(P.warn).toMatch(/can't be changed later/);
    let slots = P.fields[0].slots; expect(slots).toHaveLength(3);
    expect(slots[0].schools.map((o: any) => o.label)).toEqual(['Damage', 'Buff', 'Control']);
    expect(P.cantConfirm).toBe(true); expect(P.verdict).toMatch(/Pick a school for Outburst 1/);
    // Slot 1: Damage + Homing + Burst (2 slots at Will Power 3: a third is locked).
    slots[0].schools[0].pick(); await tick();
    L.renderVals().stripPick.fields[0].slots[0].modules.find((m: any) => /Homing/.test(m.label)).pick(); await tick();
    expect(L.renderVals().stripPick.fields[0].slots[0].modules.some((m: any) => /Burst/.test(m.label))).toBe(false); // a shape, not a module
    L.renderVals().stripPick.fields[0].slots[0].shapes.find((m: any) => /Burst/.test(m.label)).pick(); await tick();
    slots = L.renderVals().stripPick.fields[0].slots;
    expect(slots[0].modsHead).toBe('MODULES · 2 / 2 (the shape takes one)'); expect(slots[0].modules.find((m: any) => /Swift/.test(m.label)).locked).toBe(true);
    expect(slots[0].effects).toMatch(/^At stage 1: \d+ damage/);
    // Slot 2: Buff, its option (the school's first is preset; pick +2 Defense); slot 3: Control.
    slots[1].schools[1].pick(); await tick();
    slots = L.renderVals().stripPick.fields[0].slots; expect(slots[1].options.map((o: any) => o.label)).toEqual(['+2 to hit', '+2 Defense', 'Heal 30']);
    slots[1].options[1].pick(); await tick();
    L.renderVals().stripPick.fields[0].slots[2].schools[2].pick(); await tick();
    P = L.renderVals().stripPick;
    expect(P.cantConfirm).toBe(false); expect(P.verdict).toMatch(/^The twin: /);
    P.confirm(); await tick();
    const tw = (G.characters[c.id] as any).state.twin;
    expect(tw.designs.map((d: any) => [d.school, d.modules, d.option || ''])).toEqual([['damage', ['homing', 'burst'], ''], ['buff', [], 'defense'], ['control', [], 'push']]);
    expect(G.story.entries.some((e: any) => /twin leans through for the first time/.test(e.text))).toBe(true);
    expect(sp().off).toBe(true);
  });

  it('the Beloved design (rules 1.5): a tone row, the second school on the same side with its own option, one shape, Size locked until a shape, both effects with numbers', async () => {
    const { c, L } = story();
    const ch = G.characters[c.id] as any;
    ch.advancedClass = 'devoted'; ch.level = 5; ch.skills.will_power = 6; ch.skills.empathy = 8; ch.skills.visualization = 1; ch.outbursts = [];
    ch.soulKnown = { schools: ['damage', 'buff', 'control'], modules: ['wave', 'lance', 'size', 'inverse'], tones: ['frost'] };
    const sp = () => L.renderVals().storyPerks.find((p: any) => /Design a Beloved/.test(p.label));
    expect(sp()).toBeTruthy(); sp().pick(); await tick();
    const slot = () => L.renderVals().stripPick.fields[0].slots[0];
    slot().schools.find((o: any) => o.label === 'Damage').pick(); await tick();
    // Same side: Damage pairs with Control (both on foes), not Buff.
    expect(slot().schools2.map((o: any) => o.label)).toEqual(['+ Control']);
    slot().schools2[0].pick(); await tick();
    expect(slot().hasOptions2).toBe(true); expect(slot().options2.map((o: any) => o.label)).toEqual(['Push 3 tiles', 'Pull 3 tiles', 'Pinned', 'Slowed']);
    slot().options2.find((o: any) => o.label === 'Pull 3 tiles').pick(); await tick();
    // Tones: Raw, the known Frost; the others locked (Frost is known, so no free first tone).
    expect(slot().tones.find((t: any) => t.key === 'frost').locked).toBe(false); expect(slot().tones.find((t: any) => t.key === 'fire').locked).toBe(true);
    slot().tones.find((t: any) => t.key === 'frost').pick(); await tick();
    // Size needs a shape; shapes are one at a time.
    expect(slot().modules.find((m: any) => m.key === 'size').locked).toBe(true);
    slot().shapes.find((o: any) => o.key === 'wave').pick(); await tick();
    expect(slot().modules.find((m: any) => m.key === 'size').locked).toBe(false);
    slot().shapes.find((o: any) => o.key === 'lance').pick(); await tick();
    expect(slot().shapes.filter((o: any) => o.pressed === 'true').map((o: any) => o.key)).toEqual(['lance']);
    slot().modules.find((m: any) => m.key === 'size').pick(); await tick();
    expect(slot().effects).toMatch(/At stage 1: \d+ damage .*; then Pull 3 tiles \(half\)/); expect(slot().rider).toMatch(/^Frost/);
    // Inverse turns the first school to the ally side: the hostile second school drops.
    slot().modules.find((m: any) => m.key === 'inverse').pick(); await tick();
    expect(slot().schools2.map((o: any) => o.label)).toEqual(['+ Buff']); expect(slot().hasOptions2).toBe(false);
    slot().modules.find((m: any) => m.key === 'inverse').pick(); await tick(); slot().schools2[0].pick(); await tick();
    const P = L.renderVals().stripPick; expect(P.cantConfirm).toBe(false); P.confirm(); await tick();
    expect((G.characters[c.id] as any).outbursts.at(-1)).toMatchObject({ school: 'damage', school2: 'control', option2: 'push', tone: 'frost', modules: ['lance', 'size'] });
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
  it('the shared Perks detail field and the Say-box path are gone (story and combat)', () => {
    const tpl = readFileSync(new URL('../templates/main.template.html', import.meta.url), 'utf8'), js = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
    expect(tpl).not.toMatch(/Perks detail/); expect(js).not.toMatch(/pkDetail|Write it in the Say box/);
    const ctpl = readFileSync(new URL('../templates/combat.template.html', import.meta.url), 'utf8'), cjs = readFileSync(new URL('./combat.js', import.meta.url), 'utf8');
    expect(ctpl).not.toMatch(/phc-pk-detail|pickValue|onPick/); expect(cjs).not.toMatch(/pkDetail|wantsDetail|pickChoice/);
  });
});

describe('every combat action is usable by clicking', () => {
  // Combat-scope actions that read an input the fight never needs (or has a stated default for), so the grid target
  // and a plain button are enough.
  const BUTTON_OK: Record<string, string> = {
    'trait:daggerfall_veteran#seen_it_before': 'reads words only in the story; in a fight the engine forecasts',
    'class:scribe.inscribe_gear#weapon': 'whose gear is the clicked ally (a name only in the story)',
    'class:scribe.inscribe_gear#armour': 'whose gear is the clicked ally (a name only in the story)',
    'class:scribe.inscribe_gear#weapon_self': 'your own gear (a name only in the story)',
    'class:scribe.inscribe_gear#armour_self': 'your own gear (a name only in the story)',
  };
  // Actions reading several targets where the engine has a stated default (the clicked target, three times).
  const MULTI_OK: Record<string, string> = { 'class:blade_scribe.three_cut_script#three_cut_script': 'each cut strikes the clicked target (or the nearest in reach)' };
  function fightCtx() {
    const { c } = story();
    G.characters[c.id].weapon = 'drifter_revolver';
    doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
    const u = G.combat!.units.find((x: any) => x.charId === c.id);
    return { g: viewFor(G, 'host'), c: G.characters[c.id], how: 'combat' as const, cb: G.combat, u };
  }
  it('each combat action that reads a choice, words, a second tile or more targets has a picker (chips, a grid pick, a prose box)', () => {
    const x = fightCtx();
    const missing: string[] = [], bad: string[] = [];
    for (const k of registered()) for (const d of handlerOf(k)?.actions || []) {
      if (!d.scope.includes('combat')) continue;
      const key = k + '#' + d.id, src = String(d.run) + String(d.preview || '');
      const e: any = { id: k, actionId: d.id, label: d.label, text: d.text || '', target: d.target, tier: 'II', ...(d.pick ? { options: Array.isArray(d.pick) ? d.pick.map((p) => ({ id: p, label: p })) : [{ id: 'x', label: 'X' }], pickMulti: d.pickMulti || 1 } : {}), ...(d.pickLabel ? { pickLabel: d.pickLabel } : {}) };
      const P = pickerFor(e, x), kinds = (P?.fields || []).map((f) => f.kind);
      const reads = /\b(a|args)\.(choice|npc|text)\b|npcRef|textArg/.test(src) || d.target === 'text';
      if (reads && !P && !BUTTON_OK[key]) missing.push(key);
      // A tile the grid target doesn't give (the action's target is a unit or nothing) needs a tile field.
      if (/\b(a|args)\.tile\b/.test(src) && d.target !== 'tile' && !kinds.includes('tile')) missing.push(key + ' (a tile to click)');
      if (/\b(a|args)\.targetIds\b/.test(src) && !kinds.includes('unit') && !MULTI_OK[key]) missing.push(key + ' (more targets to click)');
      if (d.target === 'none' && /\b(a|args)\.targetId\b/.test(src) && !/self \? u\b/.test(src) && !kinds.includes('unit') && !d.pick) missing.push(key + ' (a token to click)');
      if (!P) continue;
      if (P.fields.some((f) => f.kind === 'prose') && !/\b(a|args)\.text\b|textArg/.test(src) && d.target !== 'text') bad.push(key + ' (prose it never reads)');
      if (/\(its id\)|designId:|grid reference|type how many|choice:/i.test(P.head + P.fields.map((f) => f.head).join(' '))) bad.push(key + ' (asks for a coded value)');
      if (P.fields.some((f) => f.kind === 'designs')) bad.push(key + ' (a design builder in a fight)');
      // Filled in (the first chip of each list, words, a token and a tile), every picker builds args.
      const v: any = {}; for (const f of P.fields) v[f.key] = f.kind === 'chips' ? (f.options[0] ? [f.options[0].id] : []) : f.kind === 'prose' ? 'words' : f.kind === 'unit' ? ['u1'] : f.kind === 'tile' ? ['3,4'] : [];
      if (P.fields.every((f) => f.kind !== 'chips' || f.optional || f.options.length)) { const r = buildArgs(P, v, x); if (typeof r === 'string') bad.push(key + ' (' + r + ')'); }
    }
    expect(missing).toEqual([]); expect(bad).toEqual([]);
  });
  it('a grid click fills the picker\'s second pick: the first field of the clicked side or a tile, up to its count', () => {
    const x = fightCtx();
    const P = pickerFor({ id: 'trait:born_officer', actionId: 'command', label: 'Command', text: '', target: 'ally' } as any, x)!;
    let v: any = { choice: ['attack'] };
    expect(buildArgs(P, v, x)).toBe('Click the enemy they attack.');
    expect(gridPick(P, v, { id: 'ally2', side: 'pc' }, '1,1')).toBeNull(); // an ally isn't the enemy: the click re-aims the order
    v = gridPick(P, v, { id: 'foe1', side: 'foe' }, '2,2'); expect(buildArgs(P, v, x)).toEqual({ choice: 'attack', targetIds: ['foe1'] });
    v = gridPick(P, { choice: ['move'] }, null, '4,5'); expect(buildArgs(P, v, x)).toEqual({ choice: 'move', tile: '4,5' });
    const W = pickerFor({ id: 'perk:wall_run', actionId: 'wall_strike', label: 'Wall Run strike', text: '', target: 'enemy' } as any, x)!;
    let w: any = gridPick(W, {}, null, '1,0'); w = gridPick(W, w, null, '2,0');
    expect(buildArgs(W, w, x)).toEqual({ tile: '1,0', choice: '2,0' }); expect(gridPick(W, w, null, '3,0')).toBeNull();
  });
});
