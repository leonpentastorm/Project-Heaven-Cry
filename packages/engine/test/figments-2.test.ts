// Rules 1.56 (Balance 2.0), Figments 2.0 slices 2 and 3 (docs/design/proposals/2026-11-figments-2.0.md, Leon's
// rulings of 15 Nov 2026): the one order site (P4), the orders on today's forms and the caster's (Draw fire, Press,
// Redraw, Cash in), Glimmer (the false Figment every Visualization user has), the new forms (Snare, Hand, Ward, Husk,
// Sentinel) with their orders, the forks (door/pick, doorpicks.ts) and the save migration. Every test goes through the
// reducer with real actions (combat/owned, combat/perk, door/pick); every number is read from the data.
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { storyWith, withGame } from './helpers/perkfight';
import FIGJ from '../../../data/figments.json';
import ACTIONSJ from '../../../data/actions.json';
import PERKSJ from '../../../data/perks.json';
import CONDJ from '../../../data/conditions.json';
import { onHook } from '../src/effects/hooks';
import { previewAttack } from '../src';
import { formsKnown } from '../src/figments';
import { FORM, COST_SITE_IDS, condOn, perceivedFoes, isGhost, formsOf, pendingDoorPicks, pictureOptions, actionsFor, previewDescriptor, sendDescriptor, migrateLoaded, active, FIG_REV, ladderAt } from '../src';

const F: any = FIGJ, ACT: any = ACTIONSJ;
const cost = (site: string) => ACT.costs[site].ap;
const VERB: Record<string, any> = Object.fromEntries(F.verbs.map((v: any) => [v.id, v]));
const ORDER = cost('figment_order');

describe('P4: one cost site for the Figment orders', () => {
  it('figment_order is a cost site with its AP in data; every non-attack order of the new rows is priced there', () => {
    expect(COST_SITE_IDS).toContain('figment_order'); expect(typeof ORDER).toBe('number');
    for (const v of F.verbs) if (!v.attack && v.id !== 'let_go' && !['figment_stare'].includes(v.id)) expect(v.site, v.id).toBe('figment_order');
    for (const v of F.verbs) expect(ACT.costs[v.site], v.id).toBeTruthy(); // no order without a priced site
  });
  it('every form has at least one order a player gives on their turn besides Move and Let go', () => {
    for (const f of F.forms) expect(f.verbs.filter((v: string) => !['let_go', 'figment_redraw', 'figment_cash_in'].includes(v)).length, f.id).toBeGreaterThan(0);
  });
});

// The 0.29 consolidation (MF2, the lead's ruling): the Double's Draw fire Taunts by the one rule every Taunt shares
// (conditions.json taunted; combat.ts tauntedBy): a Soldier is forced to attack the Double; a Boss is Taunted but never
// forced, with the row's penalty to hit anyone else (here the caster).
let FAIL_SAVES = false; onHook('save', (ctx: any) => { if (FAIL_SAVES) ctx.fail = true; });
const TAUNT_OTHERS = (CONDJ as any).items.find((c: any) => c.id === 'taunted').effects.find((e: any) => e.context === 'not_vs_source').value;
describe('Draw fire on a Boss: Taunted as by any other source, never forced', () => {
  for (const tier of ['boss', 'soldier']) it(tier, () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [] }], [{ tier, at: '5,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'double', '3,4'); u = f.unit(u.id); const d = f.figments(u)[0]; u.ap = 6;
    FAIL_SAVES = true; try { f.order(u, d, 'figment_draw_fire'); } finally { FAIL_SAVES = false; }
    const foe = f.unit(f.foes[0].id); expect(condOn(foe, 'taunted')).toBe(true);
    const pv = withGame(f.g, () => previewAttack(f.cb, foe, f.unit(f.pc.id), 'shot', { free: true }));
    if (tier === 'boss') { expect(pv.ok, pv.why).toBe(true); expect(pv.terms!.find((t: any) => t.label === 'conditions')?.v).toBe(TAUNT_OTHERS); }
    else { expect(pv.ok).toBe(false); expect(pv.why).toMatch(/Taunted/); }
  });
});

// The 0.29 consolidation (SF1): a Boss holds against an opponent's forced move (rules.json forced_movement.boss_holds):
// the Wall's Press moves a Soldier, never a Boss.
describe('Press on a Boss: it holds', () => {
  for (const tier of ['boss', 'soldier']) it(tier, () => {
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol', forms: ['wall'] }], [{ tier, at: '5,4', classic: true }]);
    // the Soldier stands where the order's own test has it; a Boss walks on its first turn: the Wall is pictured below it
    const [bx, by] = f.foe.pos.split(',').map(Number), at = tier === 'boss' ? bx + ',' + (by + 1) : '4,4';
    let u = f.turn(f.pc); f.picture(u, 'wall', at); u = f.unit(u.id); const w = f.figments(u)[0]; u.ap = 6;
    const was = f.foe.pos; f.order(u, w, 'figment_press', { targetId: f.foe.id });
    if (tier === 'boss') expect(f.unit(f.foes[0].id).pos).toBe(was); else expect(f.unit(f.foes[0].id).pos).not.toBe(was);
  });
});

describe('the orders on today\'s forms and the caster\'s orders (slice 2)', () => {
  it('Draw fire (the Double): every enemy within reach that sees it saves or is Taunted by it; the order costs the order site', () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [] }], [{ tier: 'minion', at: '5,4', classic: true }, { tier: 'minion', at: '12,9', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'double', '3,4'); u = f.unit(u.id); const d = f.figments(u)[0]; u.ap = 6;
    f.order(u, d, 'figment_draw_fire'); u = f.unit(u.id);
    expect(6 - u.ap).toBe(ORDER);
    const near = f.foes[0], far = f.foes[1], line = f.cb.log.map((l: any) => l.text || l).join('\n');
    expect(condOn(near, 'taunted') || /Taunted|save/i.test(line)).toBe(true);
    expect(condOn(far, 'taunted')).toBe(false); // out of reach (effects.0.targets.within)
  });
  it('Press (the Wall): it shoves an enemy next to it away; not next to it: refused in words', () => {
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol', forms: ['wall'] }], [{ tier: 'soldier', at: '5,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'wall', '4,4'); u = f.unit(u.id); const w = f.figments(u)[0]; u.ap = 6;
    const was = f.foe.pos; f.order(u, w, 'figment_press', { targetId: f.foe.id }); u = f.unit(u.id);
    expect(f.foe.pos).not.toBe(was); expect(6 - u.ap).toBe(ORDER);
    f.foe.pos = '9,4'; expect(() => f.order(u, w, 'figment_press', { targetId: f.foe.id })).toThrow(/Out of reach/);
  });
  it('Redraw: it reforms on a free tile within reach for its charge; too far and taken tiles are refused in words', () => {
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol', forms: ['eye'] }], [{ tier: 'soldier', at: '12,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'eye', '3,4'); u = f.unit(u.id); const e = f.figments(u)[0]; u.ap = 6;
    const ch = u.mg!.vcharge!, n = VERB.figment_redraw.reach.tiles;
    expect(() => f.order(u, e, 'figment_redraw', { tile: (3 + n + 1) + ',4' })).toThrow(/Out of reach/);
    expect(() => f.order(u, e, 'figment_redraw', { tile: u.pos })).toThrow(/isn't free/);
    f.order(u, e, 'figment_redraw', { tile: (3 + n) + ',4' }); u = f.unit(u.id);
    expect(f.unit(e.id).pos).toBe((3 + n) + ',4'); expect(u.mg!.vcharge).toBe(ch - VERB.figment_redraw.res.vcharge); expect(6 - u.ap).toBe(ORDER);
  });
  it('Cash in: all its made charge back (Let go: half); the descriptor path offers it and sends it (from Visualization 2: rules 1.74 item 6040)', () => {
    const one = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [] }]); let w = one.turn(one.pc);
    one.picture(w, 'double', '3,4'); w = one.unit(w.id);
    expect(actionsFor(one.g, w.id).find((x) => x.id === 'ow:' + one.figments(w)[0].id + ':figment_cash_in')?.available).not.toBe(true);
    const f = figFight([{ skills: { visualization: 2 }, weapon: 'service_pistol', forms: [] }]); let u = f.turn(f.pc);
    f.picture(u, 'double', '3,4'); u = f.unit(u.id); const ch = u.mg!.vcharge!, d = f.figments(u)[0];
    const row = actionsFor(f.g, u.id).find((x) => x.id === 'ow:' + d.id + ':figment_cash_in')!;
    expect(row.available).toBe(true); expect(row.cost.ap).toBe(ORDER); expect(row.group).toBe('figments');
    const a = sendDescriptor(f.g, u.id, row.id, {})!; expect(a).toMatchObject({ type: 'combat/owned', verb: 'figment_cash_in' }); f.act(a);
    u = f.unit(u.id); expect(f.figments(u).length).toBe(0); expect(u.mg!.vcharge).toBe(ch + FORM.double.charge * VERB.figment_cash_in.refund_share);
  });
  it('Glimmer: every Visualization user\'s false Figment: no charge, the order site; a Minion takes it for you; it fades its rounds on (numbers.fade_rounds)', () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [] }], [{ tier: 'minion', at: '6,4', classic: true }]);
    let u = f.turn(f.pc); const ch = u.mg!.vcharge!, ap = u.ap;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:glimmer', tile: '3,4' } as any); u = f.unit(u.id);
    expect(ap - u.ap).toBe(ORDER); expect(u.mg!.vcharge).toBe(ch); expect(f.figments(u).length).toBe(0);
    const seen = withGame(f.g, () => perceivedFoes(f.cb, f.foe)); const ghost = seen.find((x) => isGhost(x))!;
    expect(ghost.pos).toBe('3,4'); expect(seen.some((x) => x.id === u.id)).toBe(false);
    const fade = F.items.find((x: any) => x.id === 'glimmer').numbers.fade_rounds; // its lifetime, from its row
    f.cb.round += fade - 1; u = f.turn(u); expect((f.cb.images || []).length).toBe(1); // a round short: still there
    f.cb.round += 1; u = f.turn(u); expect((f.cb.images || []).length).toBe(0);
  });
  it('Glimmer needs the Visualizer in hand (Leon\'s ruling 1: always)', () => {
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol', visualizer: 'pack', forms: [] }]); const u = f.turn(f.pc);
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:glimmer', tile: '3,4' } as any)).toThrow(/Visualizer in hand/);
  });
});

describe('the new forms (slice 3)', () => {
  it('the Snare (Visualization 1): Trip cuts an enemy next to it; its hit Pins (Body save) and the Snare is spent', () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', forms: [] }], [{ tier: 'soldier', at: '5,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'snare', '4,4'); u = f.unit(u.id); const s = f.figments(u)[0]; u.ap = 6;
    expect(u.mg!.vcharge).toBe(F.visualizer.charge - FORM.snare.charge);
    f.foe.def = -50; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */ // it hits
    f.order(u, s, 'figment_trip', { targetId: f.foe.id }); u = f.unit(u.id);
    expect(6 - u.ap).toBe(cost(VERB.figment_trip.site));
    expect(f.figments(u).length).toBe(0); // spent
    const line = f.cb.log.map((l: any) => l.text || l).join('\n'); expect(condOn(f.foe, 'pinned') || /Pinned|save/i.test(line)).toBe(true);
  });
  it('the Hand (Visualization 2): Hand over gives one of the owner\'s stims to an ally next to it; an enemy or no stim is refused in words', () => {
    const f = figFight([{ skills: { visualization: 2 }, weapon: 'service_pistol', forms: [] }, { weapon: 'service_pistol' }], [{ tier: 'soldier', at: '12,9', classic: true }]);
    let u = f.turn(f.pc); const al = f.pcs[1]; al.pos = '5,4'; al.hp = Math.round(al.maxHp / 2);
    f.picture(u, 'hand', '4,4'); u = f.unit(u.id); const h = f.figments(u)[0]; u.ap = 6;
    const c = f.g.characters[u.charId!]; c.stims = 2; const stims = c.stims, hp = al.hp;
    expect(() => f.order(u, h, 'figment_hand_over', { targetId: f.foe.id })).toThrow(/Pick an ally/);
    f.order(u, h, 'figment_hand_over', { targetId: al.id }); u = f.unit(u.id);
    expect(f.g.characters[u.charId!].stims).toBe(stims - 1); expect(f.unit(al.id).hp).toBeGreaterThan(hp); expect(6 - u.ap).toBe(ORDER);
    f.g.characters[u.charId!].stims = 0; expect(() => f.order(u, h, 'figment_hand_over', { targetId: al.id })).toThrow(/No stims/);
  });
  it('the Hand\'s Filch: an enemy next to it loses a throwable onto the Hand\'s tile, or keeps it on a Body save', () => {
    const f = figFight([{ skills: { visualization: 2 }, weapon: 'service_pistol', forms: [] }], [{ tier: 'soldier', at: '5,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'hand', '4,4'); u = f.unit(u.id); const h = f.figments(u)[0]; u.ap = 6;
    f.foe.throwables = { frag_grenade: 1 } as any;
    f.order(u, h, 'figment_filch', { targetId: f.foe.id }); u = f.unit(u.id); expect(6 - u.ap).toBe(ORDER);
    for (let i = 0; i < 8 && f.foe.throwables?.frag_grenade; i++) { u.ap = 6; f.order(u, h, 'figment_filch', { targetId: f.foe.id }); u = f.unit(u.id); } // a Body save keeps it
    expect(f.foe.throwables?.frag_grenade || 0).toBe(0);
    expect(JSON.stringify((f.cb.objects || []).filter((o: any) => o.kind === 'pile' && o.pos === f.unit(h.id).pos))).toContain('frag_grenade'); // onto the Hand's tile
  });
  it('the Ward (fork A): the first hit a round on an ally next to it lands its share on the Ward; Interpose steps it next to an ally', () => {
    const f = figFight([{ skills: { visualization: 3 }, level: 3, weapon: 'service_pistol', forms: ['ward'] }, { weapon: 'service_pistol' }], [{ tier: 'minion', at: '9,4', classic: true }]);
    let u = f.turn(f.pc); const al = f.pcs[1]; al.pos = '5,6';
    f.picture(u, 'ward', '4,4'); u = f.unit(u.id); const w = f.figments(u)[0]; u.ap = 6;
    expect(() => f.order(u, w, 'figment_interpose', { tile: '4,2' })).toThrow(/next to an ally/);
    f.order(u, w, 'figment_interpose', { tile: '5,5' }); u = f.unit(u.id); expect(f.unit(w.id).pos).toBe('5,5'); expect(6 - u.ap).toBe(ORDER);
    // the enemy's own turn (combat/end-turn, its hostile phase) shoots the ally: no Defense on the ally, the Ward and the
    // caster out of its reach to hit (Defense 99), so the Ward's HP moves only by the redirect
    f.unit(al.id).def = -50; f.unit(al.id).marginsTaken = -99; /* rules 1.96: the unmissable ally takes no Margins */ f.unit(w.id).def = 99; f.unit(u.id).def = 99; f.foe.pos = '9,6';
    const wHp = f.unit(w.id).hp, aHp = f.unit(al.id).hp;
    for (let i = 0; i < 24 && f.unit(w.id) && f.unit(w.id).hp === wHp; i++) { const a = active(f.cb)!; f.act({ type: 'combat/end-turn', unitId: a.id } as any); }
    expect(f.unit(al.id).hp, 'the enemy hit the ally').toBeLessThan(aHp); expect(f.unit(w.id).hp, 'its share landed on the Ward').toBeLessThan(wHp);
  });
  it('the Husk (fork B): Burst hits every unit next to it, both sides, and it is gone: no charge back, no Snap', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol', forms: ['husk'] }], [{ tier: 'soldier', at: '5,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'husk', '4,4'); u = f.unit(u.id); const k = f.figments(u)[0]; u.ap = 6;
    const ch = u.mg!.vcharge!, hp = f.foe.hp;
    f.order(u, k, 'figment_burst'); u = f.unit(u.id);
    expect(f.figments(u).length).toBe(0); expect(f.foe.hp).toBeLessThan(hp); expect(u.mg!.vcharge).toBe(ch); expect(6 - u.ap).toBe(ORDER);
    u = f.turn(u); expect(u.ap).toBe(6); // no Snap
  });
  it('the Sentinel (fork B): it does not walk; at its owner\'s turn start it Fixes the nearest enemy it sees on the owner\'s AP; Fix by order', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol', forms: ['sentinel'] }], [{ tier: 'soldier', at: '8,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'sentinel', '4,4'); u = f.unit(u.id); const s = f.figments(u)[0];
    expect(s.movement).toBe(0); expect(f.cb.order).not.toContain(s.id);
    u = f.turn(u); const auto = f.cb.log.map((l: any) => l.text || l).filter((x: string) => /Sentinel/.test(x));
    expect(auto.length).toBeGreaterThan(0);
    u.ap = 6; f.order(u, f.unit(s.id), 'figment_fix', { targetId: f.foe.id }); u = f.unit(u.id); expect(6 - u.ap).toBe(cost(VERB.figment_fix.site));
  });
  it('every new form names its portrait and its line icon, and Picture\'s choices carry the icon', () => {
    for (const id of ['snare', 'hand', 'ward', 'husk', 'sentinel']) { expect(FORM[id].portrait).toBe('figment-' + id); expect(FORM[id].icon).toBe('figment-' + id); }
    const s = storyWith([{ skills: { visualization: 2 }, forms: [] }]); const c = s.g.characters[s.chars[0].id];
    for (const o of pictureOptions(c)) expect(o.icon).toBe(FORM[o.id].icon);
  });
});

describe('the forks (door/pick) and the save migration', () => {
  it('rules 1.70 item 5541: forms are learned at figment_forms: 2 of all ten at Visualization 1, +1 a point; chosen out of a fight, kept for good', () => {
    const s = storyWith([{ attrs: { expression: 4 } }]); const id = s.chars[0].id, D = F.forms_known.door;
    let c = s.g.characters[id]; c.skills.visualization = 1; // a character made now (stamped), its first point
    expect(formsOf(c)).toEqual([]); // a new character (stamped) has learned nothing yet
    const open = pendingDoorPicks(c, D); expect(open.length).toBe(1); expect(open[0].left).toBe(formsKnown(c));
    expect(open[0].options.map((o) => o.id)).toEqual(F.forms.map((f: any) => f.id)); // every form, the strong ones too
    s.act({ type: 'door/pick', charId: id, door: D, option: 'beast' } as any); s.act({ type: 'door/pick', charId: id, door: D, option: 'ward' } as any); c = s.g.characters[id];
    expect(formsOf(c)).toEqual(F.forms.map((f: any) => f.id).filter((x: string) => ['beast', 'ward'].includes(x)));
    expect(pictureOptions(c).map((o) => o.id)).toContain('beast');
    expect(() => s.act({ type: 'door/pick', charId: id, door: D, option: 'eye' } as any)).toThrow(/No Figment form choice is open/);
    expect(() => s.act({ type: 'figments/design', charId: id, design: { name: 'X', form: 'eye', traits: [] } } as any)).toThrow(/not one of the forms you know/);
    // each point to 9 one more: at 9 all ten
    c.skills.visualization = 2; expect(pendingDoorPicks(c, D)[0].left).toBe(1);
    c.skills.visualization = 9; expect(formsKnown(c)).toBe(F.forms.length);
  });
  it('a pick is refused in a fight, and for another door', () => {
    const f = figFight([{ skills: { visualization: 4 }, weapon: 'service_pistol', forms: [] }]); const id = f.pc.charId!;
    expect(() => f.act({ type: 'door/pick', charId: id, door: F.visualizer.door, option: 'eye' } as any)).toThrow(/after the fight/);
    const s = storyWith([{ skills: { visualization: 4 }, forms: [] }]);
    expect(() => s.act({ type: 'door/pick', charId: s.chars[0].id, door: 'no_such_door', option: 'eye' } as any)).toThrow(/Nothing to choose/);
  });
  it('the migration (rules 1.70 item 5541): a save keeps every form it had open, learned at figment_forms against its count; one over it is kept, never lost', () => {
    // a sheet with no stamp (as a save from before the forks holds it), saved and loaded through the load door
    const s = storyWith([{ skills: { visualization: 5 }, classId: 'trickster' }]), id = s.chars[0].id, D = F.forms_known.door;
    const old = JSON.parse(JSON.stringify(s.g)); delete old.characters[id].figRev; delete old.characters[id].doorPicks; delete old.characters[id].doorKept;
    const g = migrateLoaded(old), c = g.characters[id];
    expect(c.figRev).toBe(FIG_REV); // migrated at the load
    const had = [...F.migration.fixed_before, ...F.migration.legacy].filter((r: any) => r.points <= 5).flatMap((r: any) => r.forms);
    for (const fm of had) expect(formsOf(c)).toContain(fm); // nothing lost
    expect((c as any).doorPicks[D].length).toBe(formsKnown(c)); // the count is full ...
    expect((c as any).doorKept[D].length).toBe(had.length - formsKnown(c)); // ... and the one over it kept outside it
    expect((c as any).doorPicks.visualization).toBeUndefined(); // the old door is gone
    expect(pendingDoorPicks(c, D)).toEqual([]);
    c.skills.visualization = 7; // two more known, one of them already held outside the count (M1): one to choose
    expect(pendingDoorPicks(c, D)[0].left).toBe(1);
    expect(pendingDoorPicks(c, D).flatMap((p) => p.options.map((o) => o.id)).sort()).toEqual(F.forms.map((f: any) => f.id).filter((x: string) => !had.includes(x)).sort());
    c.skills.visualization = 5; const once = JSON.stringify(g); expect(JSON.stringify(migrateLoaded(JSON.parse(once)))).toBe(once); // once: a second load changes nothing
  });
  it('M1: a legacy save holding a form over its count learns none at the next point (levelup/raise through the reducer)', () => {
    // Visualization 5 (6 known) and 7 forms from the old ladder: 6 learned, 1 kept outside the count
    const s = storyWith([{ skills: { visualization: 5 }, attrs: { expression: 7 }, classId: 'trickster' }]), id = s.chars[0].id, D = F.forms_known.door;
    const old = JSON.parse(JSON.stringify(s.g)); delete old.characters[id].figRev; delete old.characters[id].doorPicks; delete old.characters[id].doorKept;
    s.g = migrateLoaded(old);
    expect(formsOf(s.g.characters[id]).length).toBe(7); expect(((s.g.characters[id] as any).doorKept[D] || []).length).toBe(1);
    (s.g.characters[id] as any).unspent = { ...((s.g.characters[id] as any).unspent || {}), skill: 1 };
    s.act({ type: 'levelup/raise', charId: id, kind: 'skill', id: F.visualizer.door } as any);
    const c = s.g.characters[id]; expect(c.skills.visualization).toBe(6); expect(formsKnown(c)).toBe(7);
    expect(pendingDoorPicks(c, D)).toEqual([]); // 7 known, 7 held: nothing to learn
    expect(() => s.act({ type: 'door/pick', charId: id, door: D, option: F.forms.map((f: any) => f.id).find((x: string) => !formsOf(c).includes(x)) } as any)).toThrow();
  });
  it('the migration of a rev-1 save (it picked at the old forks): its fork picks and kept forms move to figment_forms', () => {
    const s = storyWith([{ skills: { visualization: 4 } }]), id = s.chars[0].id, D = F.forms_known.door;
    const old = JSON.parse(JSON.stringify(s.g)); old.characters[id].figRev = 1; old.characters[id].doorPicks = { visualization: ['ward'] }; delete old.characters[id].doorKept;
    const c = migrateLoaded(old).characters[id];
    expect(formsOf(c)).toEqual(F.forms.map((f: any) => f.id).filter((x: string) => ['double', 'snare', 'hand', 'ward'].includes(x)));
    expect((c as any).doorPicks.visualization).toBeUndefined();
    expect(pendingDoorPicks(c, D)[0].left).toBe(formsKnown(c) - 4);
  });
});

describe('Solid Image (rules 1.56, the alpha perks, item 27): once a fight, a Glimmer becomes a real Figment at no charge', () => {
  const SI: any = (PERKSJ as any).items.find((p: any) => p.id === 'solid_image'), E = SI.effects.find((e: any) => e.op === 'spawn_illusion');
  const solidify = (f: any, u: any) => f.act({ type: 'combat/perk', unitId: u.id, id: 'solid_image', actionId: 'solidify' } as any);
  it('no Glimmer: refused in words; with one, 0 AP and no charge make it the form its data names, outside the held count; the fooled stay fooled; once a fight; it fades at the next turn start', () => {
    const f = figFight([{ skills: { visualization: 10 }, perks: { solid_image: 'mastered' }, weapon: 'service_pistol', forms: [] }], [{ tier: 'minion', at: '6,4', classic: true }]);
    let u = f.turn(f.pc);
    expect(() => solidify(f, u)).toThrow(/Glimmer first/);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:glimmer', tile: '3,4' } as any); u = f.unit(u.id);
    const img = (f.cb.images || [])[0]; expect(img.body).toBeUndefined(); const fooled = [...img.fooled]; expect(fooled).toContain(f.foe.id);
    const ap = u.ap, ch = u.mg!.vcharge!;
    solidify(f, u); u = f.unit(u.id);
    expect(u.ap).toBe(ap); expect(u.mg!.vcharge).toBe(ch); // 0 AP, at no charge
    const made = f.figments(u); expect(made.length).toBe(1);
    expect((made[0] as any).figment.form).toBe(E.form); expect(made[0].pos).toBe('3,4'); expect((made[0] as any).owned.free).toBe(true);
    const now = (f.cb.images || []).find((i: any) => i.owner === u.id)!; expect(now.body).toBe(made[0].id);
    for (const id of fooled) expect(now.fooled).toContain(id); // the Glimmer's fooled stay fooled: their blows land on a body
    // once a fight
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:glimmer', tile: '3,6' } as any); u = f.unit(u.id);
    expect((f.cb.images || []).find((i: any) => i.owner === u.id)?.body).toBeUndefined(); // a new Glimmer stands
    let why = ''; try { solidify(f, u); } catch (e: any) { why = String(e.message); } expect(why).toMatch(/fight|used/i);
    // until the next turn starts (its `rounds`)
    for (let i = 0; i < E.rounds; i++) u = f.turn(u);
    expect(f.figments(u).length).toBe(0);
  });
});

describe('Many-Eyed Dream (perks.json mirage) reads the new forms\' blows (rules 1.56, the alpha perks item 19, on Figments 2.0)', () => {
  it('the Husk\'s Burst (a deal op by the Figment) is multiplied for each owned unit kept; the holder\'s side is not', () => {
    const run = (perks: any) => {
      const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol', forms: ['husk'], perks }], [{ tier: 'soldier', at: '5,4', classic: true }]);
      let u = f.turn(f.pc); f.picture(u, 'husk', '4,4'); u = f.unit(u.id); const k = f.figments(u)[0]; u.ap = 6; f.foe.armour = 0;
      const hp = f.foe.hp; f.order(u, k, 'figment_burst'); return hp - f.foe.hp;
    };
    const M: any = (PERKSJ as any).items.find((p: any) => p.id === 'mirage'), per = M.tiers.II.effects[0].value.per[0].value;
    const plain = run({}), dream = run({ mirage: 'II' });
    expect(plain).toBeGreaterThan(0);
    expect(dream).toBe(29 /* rules 1.95 (the scale): was Math.max(1, Math.round(plain * (1 + per))) */); // one Husk kept when it bursts
  });
});
