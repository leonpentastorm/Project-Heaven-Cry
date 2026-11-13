// The perk card in a fight (rules 1.14): "The Perks tab shows three shelves and nothing that can't be used." One test
// per sentence of the spec where it can be, then the audit's finding 8 (a button that only shows at its moment) and
// the live lines of ALWAYS ON.
import { beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ARCHETYPES, newCharacter, startCombat, MAPS, PERKS, TRAITS, SKILLS, holdersOf, stateOf, bindGame, hurtUnit, uses, PERK_CARDS, cardTrigger, cardText, allItems, type Character } from '@engine';
import { perkShelves, shelfOf, turnMark, _resetTurnMarks, LOG_LOOKBACK, SHELF_LABEL, SHELF_ORDER } from './perkShelves';
// The two lists the card can't work out are data now (data/perk_cards.json): the engine reads them, and so do these tests.
const CORE_WIRED: string[] = PERK_CARDS.core_wired, PRIVATE_COUNT: string[] = PERK_CARDS.private_count;

const charWith = (o: Partial<Character> = {}, id = 'c1', name = 'Tester'): Character => {
  const a = ARCHETYPES.find((x: any) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const c = newCharacter(id, 'p1', { name, portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
  return Object.assign(c, o);
};
const fight = (c: Character, mate?: Character) => {
  const cb: any = startCombat('t', { ...MAPS.yard }, [{ c, pos: '1,5' }, ...(mate ? [{ c: mate, pos: '1,7' }] : [])], [{ name: 'E', tier: 'soldier', weapon: 'service_pistol', at: 'J6' }], 'easy', { state: 5 }, []);
  const u = cb.units.find((x: any) => x.charId === c.id)!; cb.turn = cb.order.indexOf(u.id); u.ap = 6; cb.log.length = 0;
  const g: any = { characters: { [c.id]: c, ...(mate ? { [mate.id]: mate } : {}) }, story: { scene: { n: 1 }, round: 1 }, sessionN: 1 };
  return { cb, u, g };
};
const shelves = (c: Character, f = fight(c), since = 0) => ({ ...f, sh: perkShelves(f.g, f.cb, f.u, c, { since }) });
const perk = (id: string, tier = 'I') => charWith({ perks: [{ id, tier } as any] });
const row = (sh: any, key: string) => [...sh.rides, ...sh.always].find((r: any) => r.key === key);
beforeEach(() => _resetTurnMarks());

describe('the three shelves', () => {
  it('the shelves are Use now, Rides an action and Always on, in that order', () => {
    expect(SHELF_ORDER.map((s) => SHELF_LABEL[s])).toEqual(['USE NOW', 'RIDES AN ACTION', 'ALWAYS ON']);
  });
  it('a character with nothing to show has three empty shelves', () => {
    const { sh } = shelves(charWith());
    expect(sh).toEqual({ use: [], rides: [], always: [] });
  });
  it('Use now: a perk with an action, with its AP and the uses left', () => {
    const { sh } = shelves(perk('earthbreaker', 'mastered'));
    expect(sh.use).toHaveLength(1);
    expect(sh.use[0]).toMatchObject({ id: 'perk:earthbreaker', label: 'Earthbreaker', ap: 4, why: null, uses: { n: 1, left: 1, label: '1/1 combat' } });
    expect(row(sh, 'perk:earthbreaker')).toBeUndefined(); // on one shelf only
  });
  it('Use now: the reason when it can\'t be used (it stays on the shelf, greyed)', () => {
    const c = perk('earthbreaker', 'mastered'), f = fight(c); f.u.ap = 1;
    expect(perkShelves(f.g, f.cb, f.u, c).use[0].why).toBe('Needs 4 AP.');
    f.u.ap = 6; f.u.uses = { 'perk:earthbreaker#earthbreaker|per_combat': { s: 'c', n: 1 } };
    const e = perkShelves(f.g, f.cb, f.u, c).use[0];
    expect(e.why).toBe('Used this fight.'); expect(e.uses.left).toBe(0);
  });
  it('Use now: a trait with an action is there too', () => {
    const { sh } = shelves(charWith({ traits: ['company_man'] }));
    expect(sh.use.map((e) => e.id)).toContain('trait:company_man');
  });
  it('Rides an action: a perk that changes a move is not a button; the shelf says where its switch is', () => {
    const { sh } = shelves(perk('running_reload'));
    expect(sh.use).toEqual([]);
    const r = row(sh, 'perk:running_reload');
    expect(r).toMatchObject({ shelf: 'rides', name: 'Running Reload', line: 'on a move' });
    expect(r.detail).toMatch(/^No button here\. Its switch “[^”]+” is on a move: pick that action and the switch shows under it\. /);
    expect(r.detail.endsWith(r.text)).toBe(true); // the card's own text follows, whole
  });
  it('Rides an action: an attack, a Pump and a Begin each read in plain words', () => {
    expect(row(shelves(charWith({ traits: ['gambler'] })).sh, 'trait:gambler').line).toBe('on your attacks');
    const c = charWith({ skills: { ...charWith().skills, will_power: 10 } as any, perks: [{ id: 'the_twin_pays', tier: 'mastered' } as any] }), { sh } = shelves(c);
    expect(row(sh, 'skill:will_power.3')).toMatchObject({ shelf: 'rides', line: 'on a Pump · 1/1 turn' }); // Overdraw: once a turn
    expect(row(sh, 'perk:the_twin_pays')).toMatchObject({ shelf: 'rides' });
    expect(row(sh, 'perk:the_twin_pays').line).toMatch(/^on Begin/);
  });
  it('Always on: a passive, with a live line', () => {
    const { sh } = shelves(perk('used_to_the_pain'));
    const r = row(sh, 'perk:used_to_the_pain');
    expect(r).toMatchObject({ shelf: 'always', name: 'Used to the Pain', state: 'waiting' });
    expect(r.line).toMatch(/^Waiting: /);
  });
  it('items that only matter in the story are not on the fight\'s card', () => {
    for (const id of ['cultured', 'crowd_pleaser']) {
      const c = perk(id, (PERKS as any[]).find((p) => p.id === id).tiers ? 'I' : (PERKS as any[]).find((p) => p.id === id).tier), { sh } = shelves(c);
      expect([...sh.use.map((e) => e.id), ...sh.rides.map((r) => r.key), ...sh.always.map((r) => r.key)]).toEqual([]);
    }
  });
  it('an enemy\'s passives are not on the card: only a squad member\'s shelves are read', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c), foe = f.cb.units.find((x: any) => x.side === 'foe');
    foe.held = { perks: [{ id: 'last_wall', tier: 'mastered' }, { id: 'running_reload', tier: 'I' }], traits: ['pain_eater'] };
    const sh = perkShelves(f.g, f.cb, foe, null);
    expect(sh.rides).toEqual([]); expect(sh.always).toEqual([]);
  });
  it('a switch that belongs to a higher tier is not listed: Running Reload I names only its own', () => {
    const one = row(shelves(perk('running_reload', 'I')).sh, 'perk:running_reload'), two = row(shelves(perk('running_reload', 'II')).sh, 'perk:running_reload');
    expect(one.detail).toContain('“Reload on the move”'); expect(one.detail).not.toContain('Clear the jam');
    expect(two.detail).toContain('“Reload on the move” and “Clear the jam on the move”');
  });
  it('class moves stay on their own tab: none is on a shelf', () => {
    const c = charWith(); c.classId = 'marksman'; (c as any).level = 6;
    const { sh } = shelves(c);
    expect([...sh.use.map((e) => e.kind), ...sh.rides.map((r) => r.kind), ...sh.always.map((r) => r.kind)]).not.toContain('class');
  });
  it('every perk and every trait lands on exactly one shelf or is left off, and none breaks the card', () => {
    const items = [...(PERKS as any[]).map((p) => ({ key: 'perk:' + p.id, c: () => perk(p.id, p.tiers ? Object.keys(p.tiers).pop()! : p.tier === 'acquired' ? 'I' : p.tier) })),
      ...(TRAITS as any[]).map((t) => ({ key: 'trait:' + t.id, c: () => charWith({ traits: [t.id] }) }))];
    let on = 0;
    for (const it of items) {
      const { sh } = shelves(it.c());
      const places = [sh.use.some((e) => e.id === it.key), sh.rides.some((r) => r.key === it.key), sh.always.some((r) => r.key === it.key)].filter(Boolean).length;
      expect(places, it.key).toBeLessThanOrEqual(1); on += places;
      for (const r of [...sh.rides, ...sh.always]) { expect(r.line, r.key).toBeTruthy(); expect(r.line, r.key).not.toMatch(/undefined|null|\bhook\b|toggle|engine/i); }
    }
    expect(on).toBeGreaterThan(140); // the audit: 166 of the 180 matter in a fight
  });
});

describe('a button that only shows at its moment (the audit\'s finding 8)', () => {
  const TEN: [string, string][] = [['perk', 'catch'], ['perk', 'shadow_step'], ['perk', 'jury_rig'], ['perk', 'rite_in_the_field'], ['perk', 'clean_draw'], ['perk', 'case_closed'], ['perk', 'twin_discipline'],
    ['trait', 'oil_in_my_mind'], ['trait', 'oil_in_my_soul'], ['trait', 'old_school']];
  it('the ten sit on Always on while the button is down, with "Its button appears when …"', () => {
    for (const [kind, id] of TEN) {
      const p = (PERKS as any[]).find((x) => x.id === id);
      const c = kind === 'trait' ? charWith({ traits: [id] }) : perk(id, p.tiers ? 'II' : p.tier), { sh } = shelves(c), r = row(sh, kind + ':' + id);
      expect(sh.use.some((e) => e.id === kind + ':' + id), id).toBe(false);
      expect(r, id).toMatchObject({ shelf: 'always', button: true });
      expect(r.detail, id).toMatch(/Its button appears when /);
    }
  });
  it('Catch says its moment in the card\'s own words', () => {
    const r = row(shelves(perk('catch')).sh, 'perk:catch');
    expect(r.state).toBe('waiting');
    expect(r.line).toMatch(/^Its button appears when a grenade or a thrown weapon is thrown at you/);
  });
  it('it moves to Use now while the button is up, and back when it is gone', () => {
    const c = perk('catch'), f = fight(c);
    const was = bindGame(f.g); try { stateOf({ key: 'perk:catch', u: f.u, c, cb: f.cb, g: f.g }).caught = { item: 'frag_grenade' }; } finally { bindGame(was); }
    let sh = perkShelves(f.g, f.cb, f.u, c);
    expect(sh.use.map((e) => e.id)).toEqual(['perk:catch']); expect(sh.use[0].label).toBe('Throw it back');
    expect(row(sh, 'perk:catch')).toBeUndefined();
    const was2 = bindGame(f.g); try { delete stateOf({ key: 'perk:catch', u: f.u, c, cb: f.cb, g: f.g }).caught; } finally { bindGame(was2); }
    sh = perkShelves(f.g, f.cb, f.u, c);
    expect(sh.use).toEqual([]); expect(row(sh, 'perk:catch')).toMatchObject({ shelf: 'always', button: true });
  });
  it('a button that belongs to a higher tier is never promised: Wall Run I is a plain passive, Wall Run II has its button', () => {
    const one = row(shelves(perk('wall_run', 'I')).sh, 'perk:wall_run');
    expect(one).toMatchObject({ shelf: 'always', button: false }); expect(one.detail).not.toMatch(/button appears/);
    expect(shelves(perk('wall_run', 'II')).sh.use.map((e) => e.label)).toContain('Wall Run strike');
  });
});

describe('the live line of Always on', () => {
  it('"Ready" when it has uses and they are left', () => {
    const r = row(shelves(perk('last_wall', 'mastered')).sh, 'perk:last_wall');
    expect(r).toMatchObject({ state: 'ready', line: 'Ready' });
  });
  it('"Used this fight" when they are spent', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c); f.u.uses = { 'perk:last_wall|per_combat': { s: 'c', n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall')).toMatchObject({ state: 'used', line: 'Used this fight' });
  });
  it('"Used this turn" by the window the use belongs to; an old window\'s use doesn\'t count', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c);
    f.u.uses = { 'perk:last_wall#x|per_turn': { s: 't' + f.cb.round + '.' + f.cb.turn, n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Used this turn');
    f.u.uses = { 'perk:last_wall#x|per_turn': { s: 't0.0', n: 1 } }; // a turn long gone
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Ready');
  });
  // The row is the item's state in this fight. A counter that belongs to something else must not grey the whole row.
  it('a use kept for each target doesn\'t say the item is used: it still works on the others', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c);
    f.u.uses = { 'perk:last_wall|e1|per_turn': { s: 't' + f.cb.round + '.' + f.cb.turn, n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Ready');
  });
  it('a story part\'s use (once a scene, a session, a campaign) is not the fight\'s state', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c);
    (c as any).uses = { 'perk:last_wall#faction|per_campaign': { s: 'k', n: 1 }, 'perk:last_wall|per_scene': { s: 's1', n: 1 }, 'perk:last_wall#true_name|per_session': { s: 'S1', n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Ready');
  });
  it('the item\'s own long window counts when the data gives the item that window', () => {
    // Every Lie Is a Door is once a session by its data, but that use is its story action's: the fight's card never
    // says "Ready" or "Used" for it
    const lie = perk('every_lie_is_a_door', 'ultimate'), f = fight(lie);
    expect(row(perkShelves(f.g, f.cb, f.u, lie), 'perk:every_lie_is_a_door')?.state).not.toBe('ready');
    (lie as any).uses = { 'perk:every_lie_is_a_door|per_session': { s: 'S1', n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, lie), 'perk:every_lie_is_a_door')?.state).not.toBe('used');
  });
  // Driven through the rules, not a made-up counter: these are the passives that say "Ready".
  it('Last Wall for real: Ready, then "Used this fight" once the lethal blow has been refused', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c);
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Ready');
    const was = bindGame(f.g); try { hurtUnit(f.u, 9999, true, f.cb, 'hit', f.cb.units.find((x: any) => x.side === 'foe')); } finally { bindGame(was); }
    expect(f.u.hp).toBe(1); // it fired
    const r = row(perkShelves(f.g, f.cb, f.u, c, { since: f.cb.log.length }), 'perk:last_wall');
    expect(r).toMatchObject({ state: 'used', line: 'Used this fight' });
  });
  it('Into the Dark for real: its "used" on the unit reads as "Used this fight"', () => {
    const c = perk('into_the_dark'), f = fight(c);
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:into_the_dark').state).toBe('waiting');
    const h = holdersOf({ u: f.u, c, cb: f.cb }).find((x) => x.key === 'perk:into_the_dark')!; stateOf(h).used = true; // what its move hook sets
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:into_the_dark').line).toBe('Used this fight');
  });
  it('a limited passive that keeps its count out of reach says the limit, never "Ready"', () => {
    const all: any = {}; for (const k of SKILLS as any[]) all[k.id] = 10;
    const c = charWith({ skills: all }), f = fight(c), r = row(perkShelves(f.g, f.cb, f.u, c), 'skill:composure.5');
    expect(PRIVATE_COUNT).toContain('skill:composure.5');
    expect(r).toMatchObject({ shelf: 'always', state: 'active', line: 'Once a fight' });
  });
  // "Ready" is a promise. A passive may only make it when the rules count its use where the card reads it: this reads
  // each such passive's own code, and fails when one is added that counts some other way and is not in PRIVATE_COUNT.
  it('every passive that can say "Ready" is counted where the card reads it', () => {
    const DIR = fileURLToPath(new URL('../../../../packages/engine/src/perks', import.meta.url));
    const src = readdirSync(DIR).filter((n) => /\.ts$/.test(n)).map((n) => readFileSync(join(DIR, n), 'utf8')).join('\n');
    const blockOf = (key: string) => { const id = key.replace(/^(perk|trait):/, ''), m = new RegExp('\\bid: \'(?:skill:)?' + id.replace(/^skill:/, '').replace('.', '\\.') + '\'').exec(src); if (!m) return ''; const end = src.indexOf('\nregister({', m.index); return src.slice(m.index, end < 0 ? undefined : end); };
    const all: any = {}; for (const k of SKILLS as any[]) all[k.id] = 10;
    const chars = [...(PERKS as any[]).flatMap((p) => Object.keys(p.tiers || { [p.tier === 'acquired' ? 'I' : p.tier]: 1 }).map((t) => perk(p.id, t))), ...(TRAITS as any[]).map((t) => charWith({ traits: [t.id] })), charWith({ skills: all })];
    const ready = new Set<string>(), limited = new Set<string>();
    for (const c of chars) { const f = fight(c), sh = perkShelves(f.g, f.cb, f.u, c);
      for (const r of sh.always) { if (r.button) continue; if (r.state === 'ready') ready.add(r.key); if (PRIVATE_COUNT.includes(r.key)) limited.add(r.key); } }
    expect([...ready].length).toBeGreaterThan(0);
    // an item written in data (engine foundations 3) counts through its effect's `limit`, under its own key: the runner's uses(h).take
    const dataLimit = (key: string) => [...(PERKS as any[]).filter((p) => 'perk:' + p.id === key), ...(TRAITS as any[]).filter((t) => 'trait:' + t.id === key)]
      .some((x: any) => [...(x.effects || []), ...Object.values(x.tiers || {}).flatMap((t: any) => t.effects || [])].some((e: any) => e?.limit?.per && !e.limit.key && !e.limit.peek));
    for (const key of ready) if (!dataLimit(key)) expect(blockOf(key), key).toMatch(/uses\(h\)\.take\('per_\w+'(, 1)?\)|\.used = true/);
    expect([...limited].sort()).toEqual([...PRIVATE_COUNT].sort()); // each named one is really a limited passive on this shelf
    for (const key of limited) expect(blockOf(key), key).not.toMatch(/uses\(h\)\.take\('per_\w+'(, 1)?\)|\.used = true/);
  });
  it('another item\'s counter is never read as this one\'s', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c); f.u.uses = { 'perk:last_wall_of_stone|per_combat': { s: 'c', n: 1 } };
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:last_wall').line).toBe('Ready');
  });
  it('"Waiting: <its trigger>" from the perk\'s own text when it has no uses to count', () => {
    const r = row(shelves(perk('used_to_the_pain')).sh, 'perk:used_to_the_pain');
    expect(r.line).toBe('Waiting: the first time you are hit in each fight');
    expect(r.text.toLowerCase()).toContain('the first time you are hit in each fight');
  });
  it('the trigger is DATA (data/perk_cards.json), by item and tier; nothing reads it out of the card\'s prose', () => {
    expect(cardTrigger('perk:used_to_the_pain', 'I')).toEqual({ trigger: 'the first time you are hit in each fight', standing: false });
    expect(cardTrigger('trait:pain_eater')).toEqual({ trigger: 'while you are below half your max HP', standing: true });
    expect(cardTrigger('perk:bulwark', 'I')).toEqual({ trigger: '', standing: false }); // no entry: nothing to wait for
    // every declared trigger is in its item's own card text at that tier (the data can't drift from the card)
    const infos = new Map((allItems() as any[]).filter(Boolean).map((x) => [x.key + '@' + (x.kind === 'perk' ? x.tier : ''), x]));
    expect(PERK_CARDS.items.length).toBeGreaterThan(50);
    for (const r of PERK_CARDS.items) {
      const info: any = infos.get(r.id + '@' + (r.tier || '')); expect(info, r.id + ' ' + (r.tier || '')).toBeTruthy();
      const text = (cardText({ kind: info.kind, itemId: info.id, tier: info.tier, info }) + ' ' + info.text).toLowerCase().replace(/\s+/g, ' ');
      expect(text, r.id).toContain(r.trigger.toLowerCase());
      expect(r.trigger, r.id).toMatch(/^[a-z]/); expect(r.trigger, r.id).not.toMatch(/\.$/);
    }
  });
  it('the module holds no registry lookup and no pattern over card text', async () => {
    const { readFileSync: read } = await import('node:fs');
    const src = read(fileURLToPath(new URL('./perkShelves.ts', import.meta.url)), 'utf8');
    for (const banned of ['handlerOf', 'genericOf', 'actionDefs', 'holdersOf', 'bindGame', 'RegExp(', '.exec(', 'TRIGGER']) expect(src.includes(banned), banned).toBe(false);
  });
  it('a card that names no trigger never guesses one: it says "Active all fight"', () => {
    // Stonewall listens when damage is dealt, but "Waiting: you deal damage" would be wrong: it guards allies behind you.
    expect(row(shelves(perk('bulwark')).sh, 'perk:bulwark')).toMatchObject({ state: 'active', line: 'Active all fight' });
    expect(row(shelves(charWith({ traits: ['spray_and_pray'] })).sh, 'trait:spray_and_pray').line).toBe('Active all fight');
  });
  it('a standing trigger ("while …") is when it works, not something still to come', () => {
    expect(row(shelves(charWith({ traits: ['pain_eater'] })).sh, 'trait:pain_eater')).toMatchObject({ state: 'active', line: 'Works while you are below half your max HP' });
  });
  it('"when a fight starts" is not waited for in a fight that has started', () => {
    const r = row(shelves(perk('wind_on_the_skin')).sh, 'perk:wind_on_the_skin');
    expect(r).toMatchObject({ state: 'active', line: 'Works when a fight starts' });
  });
  it('a trigger with a list in it is whole (it is data, not a pattern match)', () => {
    expect(cardTrigger('perk:breaching_strike', 'I').trigger).toBe('when one of your melee techniques pushes a target and a wall, a solid object or another enemy stops it');
  });
  it('a plain standing bonus with no moment says "Active all fight"', () => {
    expect(row(shelves(charWith({ traits: ['born_performer'] })).sh, 'trait:born_performer')).toMatchObject({ state: 'active', line: 'Active all fight' });
  });
  it('when the fight\'s log names the perk since the unit\'s last turn, the line is that last log line', () => {
    const c = perk('used_to_the_pain'), f = fight(c);
    f.cb.log.push('Tester takes 12 (Used to the Pain: −25% on the next hit).', 'E fires at Tester.');
    const r = row(perkShelves(f.g, f.cb, f.u, c, { since: 0 }), 'perk:used_to_the_pain');
    expect(r).toMatchObject({ state: 'last', line: 'Last: Tester takes 12 (Used to the Pain: −25% on the next hit)' });
    expect(r.detail).toMatch(/^Last: Tester takes 12 \(Used to the Pain: −25% on the next hit\)\. It works by itself\. /);
  });
  it('a line from before the unit\'s last turn is not shown', () => {
    const c = perk('used_to_the_pain'), f = fight(c);
    f.cb.log.push('Tester takes 12 (Used to the Pain: −25% on the next hit).', 'E fires at Tester.');
    expect(row(perkShelves(f.g, f.cb, f.u, c, { since: 1 }), 'perk:used_to_the_pain').line).toMatch(/^Waiting: /);
  });
  it('a line about a squadmate who holds the same perk is not shown as yours', () => {
    const c = perk('used_to_the_pain'), mate = charWith({ perks: [{ id: 'used_to_the_pain', tier: 'I' } as any] }, 'c2', 'Brannock'), f = fight(c, mate);
    f.cb.log.push('Brannock takes 9 (Used to the Pain: −25% on the next hit).');
    expect(row(perkShelves(f.g, f.cb, f.u, c, { since: 0 }), 'perk:used_to_the_pain').line).toMatch(/^Waiting: /);
  });
  it('a perk whose name is an everyday word is not matched inside another word', () => {
    const c = perk('catch'), f = fight(c); f.cb.log.push('Tester catches their breath.');
    expect(row(perkShelves(f.g, f.cb, f.u, c, { since: 0 }), 'perk:catch').state).toBe('waiting');
  });
  it('a spent use outranks the log: the row says "Used this fight" and the card keeps the last line', () => {
    const c = perk('last_wall', 'mastered'), f = fight(c); f.u.uses = { 'perk:last_wall|per_combat': { s: 'c', n: 1 } };
    f.cb.log.push('Tester will not fall (Last Wall).');
    const r = row(perkShelves(f.g, f.cb, f.u, c, { since: 0 }), 'perk:last_wall');
    expect(r.line).toBe('Used this fight'); expect(r.detail).toMatch(/^Used this fight\. Last: Tester will not fall \(Last Wall\)\. /);
  });
  it('without a turn mark, only the last lines of the log are read', () => {
    const c = perk('used_to_the_pain'), f = fight(c);
    f.cb.log.push('Tester takes 12 (Used to the Pain: −25% on the next hit).'); for (let i = 0; i < LOG_LOOKBACK; i++) f.cb.log.push('E waits.');
    expect(row(perkShelves(f.g, f.cb, f.u, c), 'perk:used_to_the_pain').line).toMatch(/^Waiting: /);
  });
});

describe('where the unit\'s last turn began (turnMark)', () => {
  it('on a unit\'s turn it gives the place in the log where its turn before this one began', () => {
    const cb: any = { round: 1, turn: 0, log: ['a'] }, u = { id: 'u1' };
    expect(turnMark(cb, u)).toBe(0); // the first turn of the fight: everything so far
    cb.log.push('b', 'c'); expect(turnMark(cb, u)).toBe(0); // the same turn, later
    cb.round = 2; cb.log.push('d'); expect(turnMark(cb, u)).toBe(1); // its next turn: from where the first one began
    cb.round = 3; cb.log.push('e', 'f'); expect(turnMark(cb, u)).toBe(4);
  });
  it('a fight joined part-way reads the last lines; a new fight starts the marks again', () => {
    const cb: any = { round: 4, turn: 1, log: Array.from({ length: 50 }, (_, i) => 'l' + i) }, u = { id: 'u1' };
    expect(turnMark(cb, u)).toBe(50 - LOG_LOOKBACK);
    const next: any = { round: 1, turn: 0, log: ['x'] };
    expect(turnMark(next, u)).toBe(0);
  });
});

describe('the shelf comes from the registry, with no table to keep', () => {
  it('shelfOf: a button up is Use now whatever else the item has', () => {
    const c = perk('used_to_the_pain'), f = fight(c), h = holdersOf({ u: f.u, c, cb: f.cb }).find((x) => x.key === 'perk:used_to_the_pain')!;
    expect(shelfOf(h, true)).toBe('use'); expect(shelfOf(h, false)).toBe('always');
  });
  // The one thing the registry can't see: an item the core rules look for by id. The engine's source is read the way
  // the audit reads it, and this fails when CORE_WIRED falls behind.
  it('CORE_WIRED names exactly the items the core rules look for by id that have nothing else for a fight', () => {
    const SRC = fileURLToPath(new URL('../../../../packages/engine/src', import.meta.url));
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(n) ? [p] : []; });
    const files = walk(SRC).filter((p) => !/perks[\\/][a-h]\.ts$/.test(p)).map((p) => readFileSync(p, 'utf8').split('\n')); // the lanes register items; the rest is the core
    const wired = (id: string) => { const q = new RegExp('[\'"`]' + id + '[\'"`]'), reg = new RegExp('\\bid: [\'"`]' + id + '[\'"`]'); return files.some((ls) => ls.some((l) => q.test(l) && !reg.test(l) && !/PERK_RENAMED|^\s*\/\//.test(l))); };
    const found: string[] = [];
    const was = [...CORE_WIRED]; CORE_WIRED.length = 0;
    try {
      for (const p of PERKS as any[]) { const c = perk(p.id, p.tiers ? Object.keys(p.tiers).pop()! : p.tier === 'acquired' ? 'I' : p.tier), f = fight(c), h = holdersOf({ u: f.u, c, cb: f.cb }).find((x) => x.key === 'perk:' + p.id)!; if (!shelfOf(h, false) && wired(p.id)) found.push(p.id); }
      for (const t of TRAITS as any[]) { const c = charWith({ traits: [t.id] }), f = fight(c), h = holdersOf({ u: f.u, c, cb: f.cb }).find((x) => x.key === 'trait:' + t.id)!; if (!shelfOf(h, false) && wired(t.id)) found.push(t.id); }
    } finally { CORE_WIRED.push(...was); }
    expect(found.sort()).toEqual([...CORE_WIRED].sort());
  });
  it('a core-wired item is on Always on', () => {
    expect(row(shelves(perk('many_hands', 'mastered')).sh, 'perk:many_hands')).toMatchObject({ shelf: 'always' });
  });
});
