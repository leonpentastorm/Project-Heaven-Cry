// Rules 1.56, the Mana Shock (Leon, 16 Nov 2026: "for the out burst decision, use 1"; and "do all 4. 25% after that
// turn is already debilitating enough": the Short's own turn pays the burn only, the Shock ends with the fight, nothing
// raises it, outside causes stay; spec items 4501 to 4511). Every rule through the reducer: a real Begin, Steady,
// end-turn, attack, Gift; a foe caster's own turn through end-turn; the fight's end through a real kill. The numbers are
// the data's: soul_modules.json strain (short_at_over, burn_per_point, after_short, shock.hp_share).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { SOUL_RULES, MANA_SHOCK, strainBurn, reachable, apply, newGame, ARCHETYPES, type Character, type GameState, type Unit, type Action } from '../src';
import { storyWith, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
import { walkIn } from './helpers/survival';

const SR: any = SOUL_RULES;
const OVER: number = SR.strain.short_at_over;
const BARE: number = SR.cycle.no_emanator_strain;
const BEGIN: number = SR.cycle.begin_strain ?? 1;
const share = (u: Unit) => Math.floor(MANA_SHOCK.hp_share * u.maxHp);

/** A fight with one Soul caster (Will Power `wp`; Pure Heart only with its perk, rules 1.75) and a friend, against one soldier far away (or
 * a foe Soul caster). */
function fight(o: { wp?: number; traits?: string[]; skills?: Record<string, number>; armourClass?: number; foes?: any[]; /** the caster's Survival boons (Character.relics) */ relics?: string[]; /** the friend holds Soulmate and bonds the caster before the fight */ soulmate?: boolean; /** the caster's own sheet (a class) */ heart?: CharSpec } = {}) {
  const s = storyWith([{ name: 'Heart', kit: 'soul', ...(o.heart || {}), skills: { will_power: o.wp ?? 3, ...(o.heart?.skills || {}), ...(o.skills || {}) }, traits: o.traits, armourClass: o.armourClass }, { name: 'Friend', kit: 'soldier', ...(o.soulmate ? { perks: { soulmate: 'I' }, skills: { camaraderie: 9 } } : {}) }]);
  const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
  if (o.relics) s.g.characters[a.id].relics = [...o.relics];
  if (o.soulmate) s.g.characters[b.id].skills.camaraderie = 5; // rules 1.75: Soulmate is removed; the friend shares hits (Share a Hit, a redirect) instead
  if (o.heart?.classId === 'bard') s.act({ type: 'story/perk', charId: a.id, id: 'class:bard.gift', text: 'For you, ' + b.name } as any);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Shock test', map: 'yard16', difficulty: 'standard', enemies: o.foes || [{ name: 'Target', tier: 'soldier', weapon: 'service_pistol', at: 'P10' }] } } } as any);
  const api = {
    get g(): GameState { return s.g; },
    get u(): Unit { return s.g.combat!.units.find((x) => x.charId === a.id)!; },
    get foe(): Unit { return s.g.combat!.units.find((x) => x.side === 'foe')!; },
    get friend(): Unit { return s.g.combat!.units.find((x) => x.charId === b.id)!; },
    act: (x: any) => s.act(x as Action, 'host'),
    /** Pass turns (end-turn) until it is the caster's turn. */
    toMine() { for (let i = 0; i < 12 && s.g.combat!.order[s.g.combat!.turn] !== api.u.id && !s.g.combat!.over; i++) s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any); return api.u; },
    /** Pass turns until it is the friend's turn. */
    toFriend() { for (let i = 0; i < 12 && s.g.combat!.order[s.g.combat!.turn] !== api.friend.id && !s.g.combat!.over; i++) s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any); return api.friend; },
    /** End whoever's turn it is (a Stunned caster's turn runs by itself after the turn before it). */
    next() { s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any); },
    end() { s.act({ type: 'combat/end-turn', unitId: api.u.id } as any); },
    char: (): Character => s.g.characters[a.id],
  };
  return api;
}
type F = ReturnType<typeof fight>;
/** The heart's own harm since log line `from`, as the log reports what was dealt: the burn and the Mana Shock's share. */
function heartHarm(f: F, from: number, name = 'Heart') {
  const burn: number[] = [], shock: number[] = [];
  const B = new RegExp('^' + name + "'s heart burns: (\\d+) damage"), S = new RegExp('^' + name + "'s heart is in " + MANA_SHOCK.name + ': (\\d+) damage');
  for (const l of f.g.combat!.log.slice(from)) { let m = B.exec(l); if (m) burn.push(+m[1]); m = S.exec(l); if (m) shock.push(+m[1]); }
  return { burn, shock };
}
const at = (f: F) => f.g.combat!.log.length;
/** On the caster's turn, Strain at the limit + (OVER − 1) and a big HP bar; then Begin and hold: the Begin's +1 shorts. */
function shortNow(f: F, hp = 1000) {
  const u = f.toMine(); u.hp = u.maxHp = hp; u.mg!.strain = u.mg!.strainLimit + OVER - 1;
  f.act({ type: 'combat/outburst', unitId: u.id, design: f.char().outbursts![0].id, hold: true });
  return f.u;
}
/** What a caster who does nothing loses to one Short, from the Short to the Shock's end (or its Down), in HP: it Begins
 * from `startOver` over the limit (bare: no Emanator in a hand), then only ends its turns. */
function idleCost(f: F, hp: number, startOver: number, bare = false) {
  const u = f.toMine(); u.hp = u.maxHp = hp; u.mg!.strain = u.mg!.strainLimit + startOver;
  if (bare) (u.mg as any).emanator = false;
  const from = at(f);
  f.act({ type: 'combat/outburst', unitId: u.id, design: f.char().outbursts![0].id, hold: true });
  const over = f.u.mg!.strain - f.u.mg!.strainLimit;
  f.end();
  for (let i = 0; i < 12 && f.u.mg!.shock && !f.u.downed; i++) { f.toMine(); if (f.u.mg!.shock && !f.u.downed) f.end(); }
  return { ...heartHarm(f, from), total: hp - f.u.hp, downed: f.u.downed, over };
}

describe('the Mana Short leaves Strain where it is: the caster is in Mana Shock (rules 1.56)', () => {
  it('3 over: Stunned, the held Outburst goes off wild, Strain stays, Mana Shock on; the state shows its word with no hurt flash', () => {
    expect(SR.strain.after_short).toBe('keep');
    const f = fight(); const u = shortNow(f);
    expect(f.g.combat!.log.join(' ')).toMatch(/MANA SHORT/);
    expect(u.conds?.stunned).toBeGreaterThan(0); expect(u.mg!.held).toBeNull();
    expect(f.g.combat!.log.join(' ')).toMatch(/releases wild/);
    expect(u.mg!.strain).toBe(u.mg!.strainLimit + OVER); expect(u.mg!.shock).toBe(true);
    const fx: any[] = (f.g.combat as any).fx || [];
    expect(fx.some((e) => e.k === 'cond' && e.id === MANA_SHOCK.id && e.target === u.id)).toBe(true);
    expect(fx.some((e) => e.k === 'burn' && e.unit === u.id && !e.dmg)).toBe(false); // no 0-damage burn (crack, hurt flash, red tint)
  });
  it('the turn of the Short pays the burn only; the Stunned turn pays the burn and the share; the turn whose start brings Strain to the limit ends it', () => {
    const f = fight(); let u = shortNow(f); const L = u.mg!.strainLimit, b = strainBurn(u), sh = share(u);
    // The Short's own turn ends 3 over: the burn (3 points), no share (item 4510: never charged in the turn it began).
    let from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * b], shock: [] }); expect(f.u.mg!.shock).toBe(true);
    // The Stunned turn passes by itself (the engine ends it): its start −1 (2 over), its end burns 2 points, the still
    // turn −1 (1 over), and the share; the next turn's start −1 reaches the limit and the Shock ends.
    from = at(f); u = f.toMine();
    const log = f.g.combat!.log.slice(from).join('\n');
    expect(log).toMatch(/Stunned and loses the turn/);
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 1) * b], shock: [sh] });
    expect(log).toMatch(/back at its limit/); expect(u.mg!.strain).toBe(L); expect(u.mg!.shock).toBeFalsy();
    from = at(f); f.end(); expect(heartHarm(f, from)).toEqual({ burn: [], shock: [] });
  });
  it('no second Short while it lasts (Hollow Heart: no Stun, so the caster acts on); the Short\'s turn pays the burn only, the next one, Steadied short of the limit, pays', () => {
    const f = fight({ traits: ['hollow_heart'] }); let u = shortNow(f); const L = u.mg!.strainLimit;
    expect(u.conds?.stunned ?? 0).toBe(0); expect(u.mg!.shock).toBe(true);
    const shorts = () => f.g.combat!.log.filter((l) => /MANA SHORT/.test(l)).length; const n0 = shorts();
    u.ap = 9; f.act({ type: 'combat/outburst', unitId: u.id, design: f.char().outbursts![0].id, hold: true }); u = f.u;
    expect(u.mg!.strain).toBe(L + OVER + 1); expect(shorts()).toBe(n0); expect(u.mg!.held).toBeTruthy(); // the new hold is not thrown wild
    f.act({ type: 'combat/steady', unitId: u.id }); u = f.u; expect(u.mg!.strain).toBe(L + OVER);
    let from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [] }); expect(f.u.mg!.shock).toBe(true);
    // The next own turn: still over after its start and a Steady (holding: no still turn): it pays the burn and the share.
    u = f.toMine(); u.ap = 9; f.act({ type: 'combat/steady', unitId: u.id }); u = f.u; const over = u.mg!.strain - L; expect(over).toBeGreaterThan(0);
    from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [over * strainBurn(u)], shock: [share(u)] }); expect(f.u.mg!.shock).toBe(true);
  });
  it('a caster who calms to the limit before the end of the first charged turn pays no share at all (the burns still land)', () => {
    const f = fight({ traits: ['hollow_heart'] }); let u = shortNow(f); const L = u.mg!.strainLimit; const from0 = at(f);
    f.end(); expect(heartHarm(f, from0)).toEqual({ burn: [OVER * strainBurn(u)], shock: [] });
    u = f.toMine(); expect(u.mg!.strain).toBe(L + OVER - 1); expect(u.mg!.shock).toBe(true); // turn start −1
    u.ap = 9; f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' }); u = f.u;
    expect(u.mg!.strain).toBe(L + OVER - 2); expect(u.mg!.shock).toBe(true); // fighting it out: −1
    // The turn's end: the burn for the point still over, then the still turn's −1 reaches the limit: no share.
    const from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 2) * strainBurn(u)], shock: [] });
    expect(f.g.combat!.log.slice(from).join('\n')).toMatch(/back at its limit/);
    expect(heartHarm(f, from0).shock).toEqual([]); // the whole Shock: not one share
  });
});

describe('outside causes stay, and a Short off the caster\'s turn makes its next own turn the first charged (items 4510, 4511)', () => {
  useRevision2Classes(); // the Gift (Bard III) is a Revision 2 move: an ally casts it on its own turn, on the Bard's Strain
  it('the friend casts the Bard\'s Gift on the friend\'s turn: the Bard shorts there; the Bard\'s next own turn (Stunned) pays the burn and the share', () => {
    const f = fight({ heart: { classId: 'bard', level: 5, skills: Object.fromEntries(SIG('bard').map((k) => [k, 6])) } });
    const fr = f.toFriend(); let u = f.u; u.hp = u.maxHp = 1000; u.mg!.mp = u.mg!.mpMax = 1000;
    u.mg!.strain = u.mg!.strainLimit + OVER - BEGIN; fr.ap = 9; // the Gift adds a Begin's Strain (Emanator in hand)
    const from = at(f); f.act({ type: 'combat/gift', unitId: fr.id, aim: f.foe.pos });
    u = f.u; expect(f.g.combat!.log.slice(from).join(' ')).toMatch(/casts .*Gift.*MANA SHORT/);
    expect(u.mg!.shock).toBe(true); expect(u.mg!.shockOwn).toBeFalsy(); // entered off its turn: no mark
    expect(heartHarm(f, from)).toEqual({ burn: [], shock: [] });
    // The friend's turn ends; the Bard's Stunned turn runs: its start −1, the burn, the still −1 and the share.
    const f2 = at(f); f.next();
    for (let i = 0; i < 6 && !f.g.combat!.log.slice(f2).some((l) => /^Heart's heart (is in|is back)/.test(l)); i++) f.next();
    expect(f.g.combat!.log.slice(f2).join('\n')).toMatch(/Stunned and loses the turn/);
    expect(heartHarm(f, f2)).toEqual({ burn: [(OVER - 1) * strainBurn(u)], shock: [share(u)] });
  });
});

describe('nothing softens it or raises it, it Downs and never kills, and a Down ends it', () => {
  it('full Guard plates, heavy armour and Durability 5 (Last Plate): the share and the burn land whole', () => {
    const f = fight({ skills: { durability: 5 }, armourClass: 3 }); let u = shortNow(f);
    u.res = { ...(u.res || {}), guard: 5 }; u.shield = 0; expect(u.armour).toBeGreaterThan(0);
    let from = at(f); f.end(); u = f.u;
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [] }); // dealt in full: nothing soaked
    u.res = { ...(u.res || {}), guard: 5 }; from = at(f); f.next(); u = f.u; // the friend's turn ends; the Stunned turn runs
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 1) * strainBurn(u)], shock: [share(u)] });
  });
  it('the Stunned turn on 3 HP: the burn Downs it (never kills), Last Plate does not hold it on 1 HP, and the Down ends the Shock', () => {
    const f = fight({ skills: { durability: 5 }, armourClass: 3 }); let u = shortNow(f); const L = u.mg!.strainLimit;
    f.end(); u = f.u; u.hp = 3; u.res = { ...(u.res || {}), guard: 5 }; const from = at(f);
    f.next(); u = f.u; const log = f.g.combat!.log.slice(from).join('\n');
    expect(log).toMatch(/Stunned and loses the turn/); expect(log).not.toMatch(/Last Plate/); expect(log).toMatch(/Heart's heart burns: \d+ damage .*Downed/);
    expect(u.downed).toBe(true); expect(u.dead).toBe(false);
    expect(u.mg!.shock).toBeFalsy(); expect(u.mg!.strain).toBeLessThanOrEqual(L);
  });
  it('Pain Eater (Fresh: +50% damage taken above half HP) does not raise it: the burn and the share are exactly their numbers', () => {
    const f = fight({ traits: ['pain_eater'] }); let u = shortNow(f); expect(u.hp).toBeGreaterThan(u.maxHp / 2);
    let from = at(f); f.end(); u = f.u;
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [] });
    from = at(f); f.next(); u = f.u; expect(u.hp).toBeGreaterThan(u.maxHp / 2);
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 1) * strainBurn(u)], shock: [share(u)] });
  });
});

describe('no item softens it either: a boon, a floor and a redirect stand aside (the damage gate, effects/damage.ts)', () => {
  it('Hardened (taking x0.9) and Lifeline (a floor at 1 HP) on the caster, a friend who shares hits beside it: the share and the burn land whole, the friend takes none, and it Downs', () => {
    const f = fight({ relics: ['boon.hardened', 'boon.lifeline'], soulmate: true }); let u = shortNow(f);
    expect(u.held?.relics).toEqual(expect.arrayContaining(['boon.hardened', 'boon.lifeline']));
    const fhp = f.friend.hp; let from = at(f); f.end(); u = f.u;
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [] }); // not x0.9
    expect(f.friend.hp).toBe(fhp); // nothing redirected
    from = at(f); f.next(); u = f.u;
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 1) * strainBurn(u)], shock: [share(u)] }); // not x0.9
    expect(f.g.combat!.log.slice(from).join(' ')).not.toMatch(/Soulmate/); // nothing redirected
    // A second fight, the Stunned turn on 3 HP: the burn Downs it; Lifeline does not hold it on 1 HP.
    const g2 = fight({ relics: ['boon.hardened', 'boon.lifeline'], soulmate: true }); shortNow(g2); g2.end(); g2.u.hp = 3; from = at(g2);
    g2.next(); u = g2.u; expect(u.downed).toBe(true); expect(u.dead).toBe(false);
    const log = g2.g.combat!.log.slice(from).join(' '); expect(log).toMatch(/Heart's heart burns: \d+ damage .*Downed/); expect(log).not.toMatch(/Soulmate|Lifeline/);
  });
});

describe('it ends with the fight, and is never charged outside one (item 4508)', () => {
  it('the fight is won by a real kill: the Mana Shock is cleared and Strain set to the limit before the fighters go home', () => {
    const f = fight(); const u = shortNow(f); expect(u.mg!.shock).toBe(true);
    f.end(); const fr = f.toFriend(); const foe = f.foe; foe.hp = 1; foe.def = -40; fr.ap = 9; fr.pos = '2,2'; foe.pos = '4,2';
    expect(f.u.mg!.shock).toBe(true); expect(f.u.mg!.strain).toBeGreaterThan(f.u.mg!.strainLimit); // still in it
    const from = at(f);
    for (let i = 0; i < 6 && f.g.combat && !f.g.combat.over && f.g.phase === 'combat'; i++) f.act({ type: 'combat/attack', unitId: fr.id, targetId: foe.id, mode: 'shot' });
    const cb: any = f.g.combat; expect(cb?.over).toBe('win');
    const h = cb.units.find((x: Unit) => x.name === 'Heart')!;
    expect(h.mg!.shock).toBeFalsy(); expect(h.mg!.strain).toBe(h.mg!.strainLimit);
    expect(cb.log.slice(from).join('\n')).toMatch(/back at its limit: the Mana Shock ends/);
    expect(f.g.story.magic?.[f.char().id]?.shock).toBeFalsy();
  });
  it('the area map\'s round takes the burn a point over (rules 1.5) but never the share', () => {
    const s = storyWith([{ name: 'Heart', kit: 'soul', skills: { will_power: 3 } }]); const c = s.g.characters[s.chars[0].id];
    const L = 3 + Math.floor(3 / 2);
    (s.g.story.magic ||= {})[c.id] = { flux: 0, strain: L + OVER, held: null, conds: {}, shock: true } as any;
    const n0 = s.g.story.entries.length;
    s.act({ type: 'story/pass' } as any); s.act({ type: 'world/act', charId: c.id, act: 'end' } as any);
    const text = s.g.story.entries.slice(n0).map((e: any) => e.text || '').join('\n');
    expect(text).toMatch(/heart burns: \d+ damage/);
    expect(text).not.toMatch(new RegExp('heart is in ' + MANA_SHOCK.name + ': \\d+ damage'));
  });
  it('the field: entering it clears the Mana Shock and sets Strain to the limit; its turns (rules 1.62 item 4906) charge nothing', () => {
    const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
    let g: any = newGame('SHOCKF', { id: 'host', name: 'L' }, 'seed-f'); g.settings.play = 'survival'; g.settings.test = true;
    g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') } as any, 'host');
    g = apply(g, { type: 'run/start', seed: 'PHC-0003' } as any, 'host'); g = apply(g, { type: 'run/ready', close: true } as any, 'host');
    const node = reachable(g.run).find((n: any) => n.kind === 'fight')!; g = apply(g, { type: 'run/move', node: node.id } as any, 'host'); g = walkIn(g);
    g = JSON.parse(JSON.stringify(g));
    const u0 = g.combat.units.find((x: any) => x.side === 'pc' && !x.companion); expect(u0.mg).toBeTruthy();
    u0.mg.strain = u0.mg.strainLimit + OVER; u0.mg.shock = true; // pushed there in the fight
    g = JSON.parse(JSON.stringify(apply(g, { type: 'run/skip' } as any, 'host'))); expect(g.run.state).toBe('field');
    const u = g.combat.units.find((x: any) => x.side === 'pc' && !x.companion);
    // the Shock ends with the fight and Strain is set to the limit (item 4508); the field then opens on a new round, so
    // the killing turn's end has already calmed it as any turn's end does (rules 1.62 item 4906), and nothing burnt
    expect(u.mg.shock).toBeFalsy(); expect(u.mg.strain).toBeLessThanOrEqual(u.mg.strainLimit); expect(u.hp).toBe(u0.hp);
    const hp = u.hp;
    const e = apply(g, { type: 'combat/end-turn', unitId: u.id } as any, 'host'); // a turn passes: the Shock is gone, nothing charged
    expect(e.combat!.units.find((x: any) => x.id === u.id)!.hp).toBe(hp);
  });
});

describe('Pure Heart and enemies', () => {
  it('Pure Heart (a Composure perk, rules 1.75 item 6203) turns away the first Short of the fight: no Stun, no Mana Shock', () => {
    const f = fight({ wp: 5, heart: { perks: { pure_heart: 'I' } } as any }); const u = shortNow(f);
    expect(u.conds?.stunned ?? 0).toBe(0); expect(u.mg!.shock).toBeFalsy(); expect(u.mg!.strain).toBe(u.mg!.strainLimit);
    expect(f.g.combat!.log.join(' ')).toMatch(/Pure Heart/);
  });
  it('an enemy caster pushed into Mana Shock with nothing held Begins nothing on its turn, and pays while it lasts', () => {
    const f = fight({ foes: [{ name: 'Adept', tier: 'soldier', weapon: 'service_pistol', at: 'P10', caster: 'heart_adept' }] });
    const e = f.foe; expect(e.mg).toBeTruthy();
    e.mg!.strain = e.mg!.strainLimit + OVER; e.mg!.shock = true; e.mg!.held = null; // pushed there from outside
    const from = at(f);
    for (let i = 0; i < 4 && !f.g.combat!.log.slice(from).some((l) => /^Adept's heart is (in|back)/.test(l)); i++) f.next();
    const log = f.g.combat!.log.slice(from), cut = log.findIndex((l) => /^Adept's heart is (in|back)/.test(l));
    expect(cut).toBeGreaterThanOrEqual(0);
    expect(log.slice(0, cut + 1).some((l) => /^Adept begins/.test(l))).toBe(false); // its own turn in the Shock: no Begin
    expect(heartHarm(f, from, 'Adept').shock.length).toBe(1);
  });
});

describe('what one Short costs a caster who does nothing (the numbers reported to the lead)', () => {
  it('3 over with an Emanator and a bare-handed Short, at 100 and 145 max HP', () => {
    const rows: string[] = [];
    for (const hp of [100, 145]) {
      const c = idleCost(fight(), hp, OVER - BEGIN);
      expect(c.over).toBe(OVER); expect(c.shock.length).toBe(1);
      rows.push(c.over + ' over, ' + hp + ' HP: burn ' + c.burn.join('+') + ', share ' + c.shock.join('+') + ', total ' + c.total + (c.downed ? ' (Downed)' : ''));
    }
    for (const hp of [100, 145]) {
      const c = idleCost(fight(), hp, 0, true); // from the limit, a bare Begin: its own Strain and the bare extra
      expect(c.over).toBe(BEGIN + BARE);
      rows.push('bare, ' + c.over + ' over, ' + hp + ' HP: burn ' + c.burn.join('+') + ', share ' + c.shock.join('+') + ', total ' + c.total + (c.downed ? ' (Downed)' : ''));
    }
    (globalThis as any).console?.log(rows.join(' | ')); // the numbers the lead asked for
  });
});
