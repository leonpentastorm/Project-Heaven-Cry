// Rules 1.56, the Mana Shock (Leon, 16 Nov 2026: "for the out burst decision, use 1"; spec items 4501 to 4509). Every
// rule through the reducer: a real Begin, Steady, end-turn, attack; a foe caster's own turn through end-turn. The
// numbers are the data's: soul_modules.json strain (short_at_over, burn_per_point, after_short, shock.hp_share).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { SOUL_RULES, MANA_SHOCK, strainBurn, reachable, apply, newGame, ARCHETYPES, type Character, type GameState, type Unit, type Action } from '../src';
import { storyWith } from './helpers/perkfight';

const SR: any = SOUL_RULES;
const OVER: number = SR.strain.short_at_over;
const share = (u: Unit) => Math.floor(MANA_SHOCK.hp_share * u.maxHp);

/** A fight with one Soul caster (Will Power `wp`: no Pure Heart below 5) and a friend, against one soldier far away (or
 * a foe Soul caster). */
function fight(o: { wp?: number; traits?: string[]; skills?: Record<string, number>; armourClass?: number; foes?: any[] } = {}) {
  const s = storyWith([{ name: 'Heart', kit: 'soul', skills: { will_power: o.wp ?? 3, ...(o.skills || {}) }, traits: o.traits, armourClass: o.armourClass }, { name: 'Friend', kit: 'soldier' }]);
  const [a] = s.chars.map((c) => s.g.characters[c.id]);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Shock test', map: 'yard16', difficulty: 'standard', enemies: o.foes || [{ name: 'Target', tier: 'soldier', weapon: 'service_pistol', at: 'P10' }] } } } as any);
  const api = {
    get g(): GameState { return s.g; },
    get u(): Unit { return s.g.combat!.units.find((x) => x.charId === a.id)!; },
    get foe(): Unit { return s.g.combat!.units.find((x) => x.side === 'foe')!; },
    act: (x: any) => s.act(x as Action, 'host'),
    /** Pass turns (end-turn) until it is the caster's turn. */
    toMine() { for (let i = 0; i < 12 && s.g.combat!.order[s.g.combat!.turn] !== api.u.id && !s.g.combat!.over; i++) s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any); return api.u; },
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

describe('the Mana Short leaves Strain where it is: the caster is in Mana Shock (rules 1.56)', () => {
  it('3 over: Stunned, the held Outburst goes off wild, Strain stays, Mana Shock on', () => {
    expect(SR.strain.after_short).toBe('keep');
    const f = fight(); const u = shortNow(f);
    expect(f.g.combat!.log.join(' ')).toMatch(/MANA SHORT/);
    expect(u.conds?.stunned).toBeGreaterThan(0); expect(u.mg!.held).toBeNull();
    expect(f.g.combat!.log.join(' ')).toMatch(/releases wild/);
    expect(u.mg!.strain).toBe(u.mg!.strainLimit + OVER); expect(u.mg!.shock).toBe(true);
  });
  it('the turn of the Short and the Stunned turn pay; the turn whose start brings Strain to the limit ends it and pays nothing', () => {
    const f = fight(); let u = shortNow(f); const L = u.mg!.strainLimit, b = strainBurn(u), sh = share(u);
    // The Short's own turn ends 3 over: the burn (3 points) and the share.
    let from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * b], shock: [sh] }); expect(f.u.mg!.shock).toBe(true);
    // The Stunned turn passes by itself (the engine ends it): its start −1 (2 over), its end burns 2 points, the still
    // turn −1 (1 over), and the share again; the next turn's start −1 reaches the limit and the Shock ends.
    from = at(f); u = f.toMine();
    const log = f.g.combat!.log.slice(from).join('\n');
    expect(log).toMatch(/Stunned and loses the turn/);
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 1) * b], shock: [sh] });
    expect(log).toMatch(/back at its limit/); expect(u.mg!.strain).toBe(L); expect(u.mg!.shock).toBeFalsy();
    from = at(f); f.end(); expect(heartHarm(f, from)).toEqual({ burn: [], shock: [] });
  });
  it('no second Short while it lasts (Hollow Heart: no Stun, so the caster acts on); Steady short of the limit: the turn pays', () => {
    const f = fight({ traits: ['hollow_heart'] }); let u = shortNow(f); const L = u.mg!.strainLimit;
    expect(u.conds?.stunned ?? 0).toBe(0); expect(u.mg!.shock).toBe(true);
    const shorts = () => f.g.combat!.log.filter((l) => /MANA SHORT/.test(l)).length; const n0 = shorts();
    u.ap = 9; f.act({ type: 'combat/outburst', unitId: u.id, design: f.char().outbursts![0].id, hold: true }); u = f.u;
    expect(u.mg!.strain).toBe(L + OVER + 1); expect(shorts()).toBe(n0); expect(u.mg!.held).toBeTruthy(); // the new hold is not thrown wild
    f.act({ type: 'combat/steady', unitId: u.id }); u = f.u; expect(u.mg!.strain).toBe(L + OVER);
    const from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [share(u)] }); expect(f.u.mg!.shock).toBe(true);
  });
  it('a turn of fighting and stillness that brings Strain to the limit pays no share (the burn of the turn still lands)', () => {
    const f = fight({ traits: ['hollow_heart'] }); let u = shortNow(f); const L = u.mg!.strainLimit;
    f.end(); u = f.toMine(); expect(u.mg!.strain).toBe(L + OVER - 1); expect(u.mg!.shock).toBe(true); // turn start −1
    u.ap = 9; f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' }); u = f.u;
    expect(u.mg!.strain).toBe(L + OVER - 2); expect(u.mg!.shock).toBe(true); // fighting it out: −1
    // The turn's end: the burn for the point still over, then the still turn's −1 reaches the limit: no share.
    const from = at(f); f.end();
    expect(heartHarm(f, from)).toEqual({ burn: [(OVER - 2) * strainBurn(u)], shock: [] });
    expect(f.g.combat!.log.slice(from).join('\n')).toMatch(/back at its limit/);
  });
});

describe('nothing softens it, it Downs and never kills, and a Down ends it', () => {
  it('full Guard plates, heavy armour and Durability 5 (Last Plate): the share and the burn land whole; it Downs, no Last Plate', () => {
    const f = fight({ skills: { durability: 5 }, armourClass: 3 }); let u = shortNow(f); const L = u.mg!.strainLimit;
    u.res = { ...(u.res || {}), guard: 5 }; u.shield = 0; expect(u.armour).toBeGreaterThan(0);
    let from = at(f); f.end(); u = f.u;
    expect(heartHarm(f, from)).toEqual({ burn: [OVER * strainBurn(u)], shock: [share(u)] }); // dealt in full: nothing soaked
    // The Stunned turn on 3 HP: the burn Downs it (never kills); Last Plate does not hold it on 1 HP.
    u.hp = 3; u.res = { ...(u.res || {}), guard: 5 }; from = at(f);
    f.act({ type: 'combat/end-turn', unitId: f.g.combat!.order[f.g.combat!.turn] }); // the friend's turn ends; the Stunned turn runs
    u = f.u; const log = f.g.combat!.log.slice(from).join('\n');
    expect(log).toMatch(/Stunned and loses the turn/); expect(log).not.toMatch(/Last Plate/); expect(log).toMatch(/Heart's heart burns: \d+ damage .*Downed/);
    expect(u.downed).toBe(true); expect(u.dead).toBe(false);
    // Downed: out of the Shock, Strain at the limit, so a raised caster is not shocked.
    expect(u.mg!.shock).toBeFalsy(); expect(u.mg!.strain).toBeLessThanOrEqual(L);
  });
});

describe('Pure Heart, enemies and the field', () => {
  it('Pure Heart (Will Power 5) turns away the first Short of the fight: no Stun, no Mana Shock', () => {
    const f = fight({ wp: 5 }); const u = shortNow(f);
    expect(u.conds?.stunned ?? 0).toBe(0); expect(u.mg!.shock).toBeFalsy(); expect(u.mg!.strain).toBe(u.mg!.strainLimit);
    expect(f.g.combat!.log.join(' ')).toMatch(/Pure Heart/);
  });
  it('an enemy caster pushed into Mana Shock with nothing held Begins nothing on its turn, and pays while it lasts', () => {
    const f = fight({ foes: [{ name: 'Adept', tier: 'soldier', weapon: 'service_pistol', at: 'P10', caster: 'heart_adept' }] });
    const e = f.foe; expect(e.mg).toBeTruthy();
    e.mg!.strain = e.mg!.strainLimit + OVER; e.mg!.shock = true; e.mg!.held = null; // pushed there from outside
    const from = at(f);
    for (let i = 0; i < 4 && !f.g.combat!.log.slice(from).some((l) => /^Adept's heart is (in|back)/.test(l)); i++) f.act({ type: 'combat/end-turn', unitId: f.g.combat!.order[f.g.combat!.turn] });
    const log = f.g.combat!.log.slice(from), cut = log.findIndex((l) => /^Adept's heart is (in|back)/.test(l));
    expect(cut).toBeGreaterThanOrEqual(0);
    expect(log.slice(0, cut + 1).some((l) => /^Adept begins/.test(l))).toBe(false); // its own turn in the Shock: no Begin
    expect(heartHarm(f, from, 'Adept').shock.length).toBe(1);
  });
  it('the field (no turns): no turn ends there, so a Mana Shock costs nothing and calms nothing', () => {
    const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
    let g: any = newGame('SHOCKF', { id: 'host', name: 'L' }, 'seed-f'); g.settings.play = 'survival'; g.settings.test = true;
    g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') } as any, 'host');
    g = apply(g, { type: 'run/start', seed: 'PHC-0003' } as any, 'host'); g = apply(g, { type: 'run/ready', close: true } as any, 'host');
    const node = reachable(g.run).find((n: any) => n.kind === 'fight')!; g = apply(g, { type: 'run/move', node: node.id } as any, 'host');
    g = JSON.parse(JSON.stringify(apply(g, { type: 'run/skip' } as any, 'host'))); expect(g.run.state).toBe('field');
    const u = g.combat.units.find((x: any) => x.side === 'pc' && !x.companion); expect(u.mg).toBeTruthy();
    u.mg.strain = u.mg.strainLimit + OVER; u.mg.shock = true; const hp = u.hp;
    expect(() => apply(g, { type: 'combat/end-turn', unitId: u.id } as any, 'host')).toThrow(/No turns here/);
    expect(u.hp).toBe(hp); expect(u.mg.shock).toBe(true);
  });
});
