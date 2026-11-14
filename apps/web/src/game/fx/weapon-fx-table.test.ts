// @vitest-environment jsdom
// The weapon effects table (Leon, 14 Nov 2026: "Do all weapon to, if i see another missmatch bullet effect on a flamer
// or grenade launcher i'm gonna stroke"). Built by machine, never by hand: for every weapon in data/weapons.json that
// attacks at range or is thrown, and every way it can (its plain attack modes, read from its `ap_cost` and `modes`; every
// ranged technique, which the engine itself allows or refuses for that weapon; a grenade's Throw and Lob; a blade's
// Throw), the action is played through the REAL engine (the reducer, physFight with every technique known, the dice
// rigged to hit and then to miss), and the events the engine emitted go through the client's real effects queue
// (play.ts queueFx: the shot, volley, technique and explode handlers). What the effects trace says was heard and drawn is
// counted against what the engine spent, and the rules below are asserted on every row:
//   - sounds = projectiles = rounds the engine fired (a shell: one blast and one pellet cluster; a flamer's burn: one
//     flame and its fire sound; a grenade or a launcher's round: one launch or throw, one lobbed arc, one blast where it
//     lands; a rocket its own launch and blast; a bow or crossbow its loose and a shaft; the core rifle its bolt);
//   - casings = rounds spent for a weapon that ejects as it fires, 0 for any other;
//   - marks: holes = kinetic rounds that hit (the rounds.test.ts reckoning); none for a blast, a flame or a throw;
//   - the firing sound is the weapon family's own (no rifle crack on a pistol, no gunshot from a launcher or a bow);
//   - no `tracer` part, no miss mark; a miss still flies; no MISS word over a hit.
// The table: FX_TABLE=1 npx vitest run src/game/fx/weapon-fx-table.test.ts writes docs/design/handoffs/weapon-fx-table.md.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { refOf, WEAPONS, WEAPON, TECHNIQUES, RULES, gearEntry } from '@engine';
import { physFight, rig } from '../../../../../packages/engine/test/helpers/physfight';
import { withGame } from '../../../../../packages/engine/test/helpers/perkfight';
import { setLayer } from './dom';
import { queueFx, setContext, clearFx, gunOf } from './play';
import { resetRanged, STREAM_CAP } from './ranged';
import { techPrepass, shotMarkOf, TECH_FX, rowKey } from './techniqueFx';
import { fxOf, familyOf as famOf } from './weaponFx';
import { setInBattle } from '../combatSpeed';
import { fireBurst, fireAuto } from '@engine';

function grid(w = 16, h = 11) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    (img as any).getBoundingClientRect = () => ({ left: x * 40 + 1, top: y * 40 + 1, width: 38, height: 38, right: x * 40 + 39, bottom: y * 40 + 39 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}

// ---------- what is walked: read from the data ----------
const isThrowable = (w: any) => (w.properties || []).some((p: string) => /^throwable_/.test(p));
/** Every weapon that attacks at range or is thrown. */
export const RANGED = (WEAPONS as any[]).filter((w) => w.category === 'thrown' || isThrowable(w) || (w.phys?.system === 'ranged' && w.magazine != null));
const RANGED_TECH = (TECHNIQUES as any[]).filter((t) => t.system === 'ranged' && ['fire', 'press', 'take'].includes(t.group)).map((t) => t.id);
const ALL_RANGED = (TECHNIQUES as any[]).filter((t) => t.system === 'ranged').map((t) => t.id);
/** The family of what a weapon fires, from the data (its `fx` family; see brass.ts fxOf). */
const familyOf = (w: any) => famOf(w);

interface Action { label: string; mode?: string; tech?: string; throwItem?: boolean; enemy?: boolean; cone?: boolean }
/** The ways a weapon attacks: its plain modes (ap_cost: single → shot, aimed, burst, auto, for a weapon whose `modes`
 *  allow the burst or auto), each ranged technique (the engine refuses what the weapon can't), a grenade's throw. */
function actionsOf(w: any): Action[] {
  const out: Action[] = [];
  if (w.category === 'thrown') { out.push({ label: 'throw', throwItem: true }); out.push({ label: 'lob', tech: 'lob' }); out.push({ label: 'rout', tech: 'rout' }); return out; }
  if (isThrowable(w) && w.phys?.system === 'melee') { out.push({ label: 'throw', tech: 'throw' }); return out; }
  const ap = w.ap_cost || {};
  if ('single' in ap && (w.modes || []).includes('single')) out.push({ label: 'single', mode: 'shot' });
  // a cone weapon (the flamer) with three in its cone: one burn reaches them all (one fuel, one flame, one sound)
  if ((w.properties || []).includes('cone_3')) out.push({ label: 'single (three in the cone)', mode: 'shot', cone: true });
  if ('aimed' in ap && (w.modes || []).includes('single')) out.push({ label: 'aimed', mode: 'aimed' });
  if ('burst' in ap && (w.modes || []).includes('burst')) { out.push({ label: 'burst', mode: 'burst' }); out.push({ label: 'burst (enemy)', mode: 'burst', enemy: true }); }
  if ('auto' in ap && (w.modes || []).includes('auto')) { out.push({ label: 'auto', mode: 'auto' }); out.push({ label: 'auto (enemy)', mode: 'auto', enemy: true }); }
  // (Lob with a gun that has no blast would lob a carried grenade: that is the grenade's row, not this weapon's)
  for (const t of RANGED_TECH) if (t !== 'lob' || (w.properties || []).some((p: string) => /^area_radius_/.test(p))) out.push({ label: t, tech: t });
  return out;
}

// ---------- one row: the engine fires, the client plays ----------
export interface Row {
  weapon: string; family: string; action: string; pass: 'hit' | 'miss'; refused?: string;
  spent: number; shots: number; rolls: number; hitRolls: number;
  rounds: number; sounds: number; sample: string; otherFire: string[]; flights: Record<string, number>; projectiles: number; kind: string;
  casings: number; casingKind: string; holes: number; holeKinds: string[]; hits: number; booms: number; boomKinds: string[]; muzzles: number;
  parts: string[]; tracer: number; missWords: number; failures: string[];
}
/** The removed pieces (Leon, 13 Nov 2026): none may ever be drawn. */
const REMOVED = ['tracer', 'slash', 'whiff', 'deflect', 'wide'];
function play(w: any, a: Action, pass: 'hit' | 'miss'): Row | null {
  const known = w.category === 'thrown' ? ALL_RANGED : isThrowable(w) && w.phys?.system === 'melee' ? ['throw'] : ALL_RANGED;
  // (Snap Shot draws the weapon from the pack: a blade is in the hand and the gun, loaded, in the pack)
  const snap = a.tech === 'snap_shot', wield = w.category === 'thrown' ? 'service_pistol' : snap ? 'sabre' : w.id;
  // an ally stands back (Crossfire needs one who hit the target this round)
  const f = physFight([{ weapon: wield, known, level: 6, skills: { dexterity: 6, raw_power: 5, athletics: 3, hand_eye: 3 } as any, attrs: { agility: 6, strength: 5 } }, { weapon: 'service_pistol' }],
    [{ weapon: a.enemy ? w.id : 'service_pistol' }, {}, {}]);
  const pc = f.unit(f.pc.id), [t, t2, t3] = f.foes;
  // a thrown weapon (a grenade, a blade) is thrown from closer: its range is the thrower's, about six tiles
  const near = w.category === 'thrown' || (isThrowable(w) && w.phys?.system === 'melee');
  f.unit(f.pcs[1].id).pos = '0,10';
  pc.pos = '2,5'; f.unit(t.id).pos = near ? '5,5' : '6,5'; f.unit(t2.id).pos = near ? '5,6' : '6,6'; f.unit(t3.id).pos = near ? '6,4' : '7,4';
  if (a.cone) { f.unit(t.id).pos = '4,5'; f.unit(t2.id).pos = '3,5'; f.unit(t3.id).pos = '4,6'; }
  if ((w.properties || []).includes('placed')) f.unit(t.id).pos = '3,5'; // a satchel is placed beside the one who sets it
  for (const u of f.cb.units) { u.hp = 9999; u.maxHp = 9999; u.heat = 0; u.jammed = false; }
  pc.throwables = w.category === 'thrown' ? { [w.id]: 3 } : {}; // a gun's row fires the gun, never a grenade the kit carries
  if (w.category === 'heavy' || (w.properties || []).includes('requires_braced_or_prone')) pc.braced = true;
  const shooter = a.enemy ? f.turn(t) : f.turn(pc), target = a.enemy ? f.unit(pc.id) : f.unit(t.id);
  const u0 = f.unit(shooter.id), held = (u: any) => (w.category === 'thrown' ? (u.throwables?.[w.id] || 0) : isThrowable(w) && w.phys?.system === 'melee' ? (u.weapon === w.id ? 1 : 0) : (u.ammo || 0) + (u.loose || 0));
  // what each technique needs of the moment (the engine refuses it otherwise): set through the rules' own meters
  const args: any = { targetId: target.id, tile: target.pos, ...(w.category === 'thrown' ? { item: w.id } : {}) };
  if (snap) { const c = f.char(f.unit(pc.id)); c.pack = [...(c.pack || []), { ...gearEntry(w.id)!, loaded: w.magazine }]; args.item = c.pack.length - 1; }
  if (a.tech === 'called_shot') args.opt = 'leg';
  if (['walking_fire', 'storm'].includes(a.tech || '')) args.tile = '3,4'; // (they move first)
  if (a.tech === 'crossfire') { if ((w.phys?.props || []).includes('quick')) args.tile = '3,4'; else delete args.tile; } // a Quick weapon steps first
  if (a.tech === 'crossfire') (target as any).hitRound = { [f.pcs[1].id]: f.cb.round };
  if (['dead_centre', 'pin_down', 'rout', 'stopping_shot', 'storm', 'last_round'].includes(a.tech || '')) f.press(target, 2);
  if (a.tech === 'last_round') u0.ammo = 1;
  const before = snap ? Number(w.magazine) || 0 : held(u0), n0 = f.cb.fxSeq || 0;
  rig({ hit: pass === 'hit' });
  let refused: string | null = null;
  try {
    if (a.throwItem) f.act({ unitId: u0.id, type: 'combat/throw', item: w.id, tile: target.pos } as any);
    else if (a.tech) refused = f.tech(a.tech, args);
    else if (a.enemy) withGame(f.g, () => (a.mode === 'auto' ? fireAuto : fireBurst)(f.cb, f.g.rng as any, u0, target, null));
    else f.act({ unitId: u0.id, type: 'combat/attack', targetId: target.id, mode: a.mode } as any);
  } catch (e: any) { refused = String(e?.message || e); }
  rig(null);
  const evs = (f.cb.fx || []).filter((e: any) => e.n > n0);
  const fired = evs.some((e: any) => e.k === 'shot' || e.k === 'volley');
  const base = { weapon: w.id, family: familyOf(w), action: a.label, pass };
  if (refused || !fired) return { ...base, refused: refused || 'fired nothing' } as Row;
  const u1 = f.unit(shooter.id), spent = before - held(u1);
  const mine = evs.filter((e: any) => e.unit === u0.id);
  const shots = mine.filter((e: any) => e.k === 'volley').reduce((s: number, e: any) => s + (Number(e.shots) || 0), 0);
  const rollEvs = mine.filter((e: any) => e.k === 'shot' && !e.object);
  // ---- the client plays it ----
  const layer = grid(); setContext(f.g, 'combat'); setInBattle(true);
  (window as any).__phcFxTrace = [];
  const seen = new MutationObserver(() => undefined); seen.observe(layer, { childList: true, subtree: true });
  queueFx(evs as any, 'table:' + w.id + ':' + a.label + ':' + pass);
  vi.advanceTimersByTime(30000);
  const added = seen.takeRecords().flatMap((m) => [...m.addedNodes]) as HTMLElement[]; seen.disconnect();
  const T: any[] = (window as any).__phcFxTrace; clearFx();
  const fx = fxOf(w.id, w.category), look = fx.look, sample = String(fx.sound || '');
  const flights: Record<string, number> = {};
  for (const x of T) if (x.w === 'flight') flights[x.look] = (flights[x.look] || 0) + 1;
  for (const x of T) if (x.w === 'throw') flights.thrown = (flights.thrown || 0) + 1;
  // what flew, in the weapon's own kind: a shell's cluster is five pellets, a stream of fire is one burn
  const projectiles = look === 'pellets' ? (flights.bullet || 0) / 5 : look === 'thrown' ? flights.thrown || 0 : flights[look] || 0;
  const otherKinds = Object.keys(flights).filter((k) => k !== (look === 'pellets' ? 'bullet' : look));
  // the firing sounds: the weapon's own sample; any gunshot from a weapon whose own is not a gunshot is a mismatch
  const sfx = T.filter((x) => x.w === 'sfx').map((x) => String(x.s));
  const fireS = T.filter((x) => x.w === 'sfx' && x.fire).map((x) => String(x.s));
  const sounds = fireS.filter((s) => s === sample).length;
  // anything else fired (a firing sound that is not the weapon's), or a gunshot played anywhere by a weapon whose own is not one
  const otherFire = [...new Set([...fireS.filter((s) => s !== sample), ...sfx.filter((s) => s !== sample && /^(gun_|burst_|auto_)/.test(s))])];
  const parts = T.filter((x) => x.w === 'part').map((x) => String(x.tag || ''));
  const removed = [...parts, ...added.map((b) => b.getAttribute?.('data-tech-fx') || '')].filter((k) => REMOVED.includes(k));
  const holes = T.filter((x) => x.w === 'hole');
  const booms = T.filter((x) => x.w === 'boom');
  // the rounds that hit, from the events (rounds.test.ts's reckoning): each roll that hit (or struck the cover in the way),
  // and the rounds it carries beyond itself; a spray's rounds mark nothing
  const pre = techPrepass(evs as any[], (v: any) => v.mode === 'dump' && v.cat !== 'shotgun' && shotMarkOf(v.weapon, v.cat) === 'hole');
  let hits = 0;
  for (const e of pre as any[]) if (e.k === 'shot' && e.unit === u0.id && !e.thrown && shotMarkOf(e.weapon, e.cat) && !TECH_FX[rowKey(e) || '']?.noRoll) {
    if (e.hit) hits += 1 + (e.tech === 'suppress' ? 0 : Number(e._loose) || 0); else if (e.cover && !e.object) hits += 1;
  }
  const rounds = T.filter((x) => x.w === 'round' && x.unit === u0.id).length;
  const row: Row = { ...base, spent, shots, rolls: rollEvs.length, hitRolls: rollEvs.filter((e: any) => e.hit).length,
    rounds, sounds, sample, otherFire, flights, projectiles, kind: look, casings: T.filter((x) => x.w === 'shell').length, casingKind: [...new Set(T.filter((x) => x.w === 'shell').map((x) => x.shell))].join('/'),
    holes: holes.length, holeKinds: [...new Set(holes.map((x) => String(x.kind)))], hits, booms: booms.length, boomKinds: [...new Set(booms.map((x) => String(x.kind)))], muzzles: T.filter((x) => x.w === 'muzzle').length,
    parts: [...new Set(parts)], tracer: removed.length, missWords: T.filter((x) => x.w === 'float' && x.text === 'MISS').length, failures: [] };
  row.failures = judge(w, row, otherKinds);
  return row;
}

// ---------- the rules ----------
/** The firing samples a family may use: its own (no rifle crack on a pistol; no gunshot from a launcher, a bow or a flamer). */
const SOUND_OF_FAMILY: Record<string, RegExp> = {
  pistol: /^gun_(pistol|revolver|magnum)$/, revolver: /^gun_(revolver|magnum)$/, smg: /^gun_smg$/, rifle: /^gun_(rifle|sniper|lever)$/, shotgun: /^gun_shotgun$/,
  heavy: /^gun_(heavy|rifle)$/, launcher: /^launch_/, rocket: /^rocket_/, flamer: /^(flame_|el_fire$)/, bow: /^bow_/, crossbow: /^crossbow_/,
  charge: /^sigil_evoke$/, thrown: /^(swish|throw_)/, blade: /^(swish|throw_)/,
};
function judge(w: any, r: Row, otherKinds: string[]): string[] {
  const bad: string[] = [], fx = fxOf(w.id, w.category), throwsBlade = isThrowable(w) && w.phys?.system === 'melee';
  // what the engine spent: a magazine's rounds, the grenades carried, the blade thrown
  const fired = r.spent > 0 ? r.spent : r.rolls; // (a gun that loads its next round as it fires shows no loss: count its rolls)
  const drawn = throwsBlade || w.category === 'thrown' ? r.projectiles : r.rounds;
  if (r.spent > STREAM_CAP) { if (drawn < STREAM_CAP || drawn > r.spent) bad.push('rounds drawn ' + drawn + ' for ' + r.spent + ' spent (stream cap ' + STREAM_CAP + ')'); }
  else if (drawn !== fired) bad.push('rounds drawn ' + drawn + ' ≠ fired ' + fired);
  const cap = Math.min(fired, r.spent > STREAM_CAP ? drawn : fired);
  if (r.sounds !== cap) bad.push('firing sounds ' + r.sounds + ' (' + r.sample + ') ≠ fired ' + cap);
  if (Math.round(r.projectiles * 100) !== Math.round(cap * 100)) bad.push(r.kind + ' projectiles ' + r.projectiles + ' ≠ fired ' + cap);
  if (otherKinds.length) bad.push('drew other projectiles: ' + otherKinds.join(', '));
  if (r.otherFire.length) bad.push('other gunshots heard: ' + r.otherFire.join(', '));
  // (a stand-in the data declares is listed in the table for a proper sample to be sourced; any other must be the family's)
  const re = SOUND_OF_FAMILY[r.family]; if (!fx.stand_in && (!re || !re.test(r.sample))) bad.push('firing sample ' + r.sample + ' is not the ' + r.family + ' family\'s');
  const perShot = fx.eject === 'shot' && !!fx.shell;
  if (r.casings !== (perShot ? cap : 0)) bad.push('casings ' + r.casings + ' ≠ ' + (perShot ? cap : 0));
  if (r.holes !== r.hits) bad.push('marks ' + r.holes + ' ≠ rounds that hit ' + r.hits);
  if (!fx.mark && r.holes) bad.push('a mark from a weapon that leaves none');
  if (fx.mark && r.holeKinds.some((k) => k !== fx.mark)) bad.push('mark kind ' + r.holeKinds.join('/') + ' ≠ ' + fx.mark);
  if (fx.blast && r.booms !== cap) bad.push('blasts ' + r.booms + ' ≠ fired ' + cap);
  if (!fx.blast && r.booms) bad.push('a blast from a weapon that has none');
  if (!fx.muzzle && r.muzzles) bad.push('muzzle flash from a weapon that has none');
  if (r.tracer) bad.push('a removed piece was drawn');
  if (r.pass === 'hit' && r.missWords) bad.push('MISS over a hit');
  if (r.pass === 'miss' && !(r.projectiles > 0)) bad.push('a miss did not fly');
  return bad;
}

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); });
afterEach(() => { vi.useRealTimers(); setInBattle(false); rig(null); });

const ROWS: Row[] = [];
describe('the weapon effects table: every ranged or thrown weapon × every way it attacks, hit and miss', () => {
  it('walks the data: every ranged and thrown weapon', () => {
    const cats = new Set(RANGED.map((w) => w.category));
    for (const c of ['pistol', 'revolver', 'smg', 'rifle', 'shotgun', 'heavy', 'bow', 'thrown', 'mana', 'light_melee']) expect(cats.has(c), c).toBe(true);
    expect(RANGED.map((w) => w.id)).toEqual(expect.arrayContaining(['purifier_flamer', 'smetanita_thumper', 'breacher_tube', 'frag_grenade', 'satchel_charge', 'core_rifle', 'crossbow', 'coach_gun']));
  });
  for (const w of RANGED) {
    it(w.id, () => {
      const rows: Row[] = [];
      for (const a of actionsOf(w)) for (const pass of ['hit', 'miss'] as const) { const r = play(w, a, pass); if (r) rows.push(r); }
      ROWS.push(...rows);
      const played = rows.filter((r) => !r.refused);
      expect(played.length, w.id + ': nothing fired').toBeGreaterThan(0);
      const failing = played.filter((r) => r.failures.length).map((r) => r.action + ' (' + r.pass + '): ' + r.failures.join('; '));
      expect(failing, w.id).toEqual([]);
    }, 300000);
  }
  it('writes the table (FX_TABLE=1)', () => {
    const played = ROWS.filter((r) => !r.refused);
    console.log('weapon fx table: ' + ROWS.length + ' rows, ' + played.length + ' played, ' + played.filter((r) => r.failures.length).length + ' failing');
    if (!process.env.FX_TABLE) return;
    writeFileSync(process.env.FX_TABLE_OUT || resolve(process.cwd(), '../../docs/design/handoffs/weapon-fx-table.md'), tableMd(ROWS));
  });
});

// ---------- content is data: a new weapon needs no code ----------
describe('a new weapon of each effects family, added to the data in memory, looks and sounds right with no code change', () => {
  const FAMS = Object.keys((RULES as any).weapons_rules.fx.families);
  it('every family has a weapon in the data to model one on', () => {
    for (const fam of FAMS) expect(RANGED.some((w) => familyOf(w) === fam), fam).toBe(true);
  });
  for (const fam of FAMS) {
    it(fam, () => {
      // a copy of a real weapon of that family under a new id, without its own fx block: only its family speaks
      const model = RANGED.find((w) => familyOf(w) === fam)!, fake: any = JSON.parse(JSON.stringify(model));
      fake.id = 'fake_' + fam; fake.name = 'Fake ' + fam; delete fake.fx;
      (WEAPONS as any[]).push(fake); (WEAPON as any)[fake.id] = fake;
      try {
        const f = fxOf(fake.id, fake.category), fam0 = (RULES as any).weapons_rules.fx.families[fam];
        expect(f.family).toBe(fam); expect(f.sound).toBe(fam0.sound); expect(f.look).toBe(fam0.look);
        const rows: Row[] = [];
        for (const a of actionsOf(fake)) for (const pass of ['hit', 'miss'] as const) { const r = play(fake, a, pass); if (r) rows.push(r); }
        const played = rows.filter((r) => !r.refused);
        expect(played.length, fake.id + ': nothing fired').toBeGreaterThan(0);
        expect(played.filter((r) => r.failures.length).map((r) => r.action + ' (' + r.pass + '): ' + r.failures.join('; ')), fake.id).toEqual([]);
        expect(played.every((r) => r.sample === String(fam0.sound)), fake.id + ': its family\'s sound').toBe(true);
      } finally {
        (WEAPONS as any[]).splice((WEAPONS as any[]).indexOf(fake), 1); delete (WEAPON as any)[fake.id];
      }
    }, 300000);
  }
  it('no effects code names a weapon (the per-weapon looks, sounds and casings are data)', () => {
    // (two ids are also words of the effects' own vocabulary: 'crossbow', a bow kind in the data's fx.bow; 'lance', a Soul shape)
    const WORDS = new Set(['fists', 'crossbow', 'lance']);
    const dir = resolve(process.cwd(), 'src/game/fx'), ids = (WEAPONS as any[]).map((w) => w.id).filter((id) => !WORDS.has(id));
    const named: string[] = [];
    for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x) && !/\.test\./.test(x))) {
      const src = readFileSync(resolve(dir, f), 'utf8');
      for (const id of ids) if (new RegExp('[\'"]' + id + '[\'"]').test(src)) named.push(f + ': ' + id);
    }
    expect(named).toEqual([]);
  });
});

function tableMd(rows: Row[]): string {
  const played = rows.filter((r) => !r.refused), refused = rows.filter((r) => r.refused);
  const fams = new Map<string, any>();
  for (const w of RANGED) { const fx = fxOf(w.id, w.category); fams.set(w.id, fx); }
  const L: string[] = [];
  L.push('# Weapon effects: the table');
  L.push('');
  L.push('Generated by `FX_TABLE=1 npx vitest run src/game/fx/weapon-fx-table.test.ts` (in apps/web); do not edit by hand.');
  L.push('Every weapon in data/weapons.json that attacks at range or is thrown, every way it attacks (its plain modes, every');
  L.push('ranged technique the engine lets it use, a grenade\'s Throw and Lob, a blade\'s Throw), played through the real engine');
  L.push('with the dice rigged to hit and then to miss; the client\'s effects queue then plays what the engine emitted, and its');
  L.push('trace is counted. Each weapon\'s look and sound come from its `fx` family in data (`data/rules.json`');
  L.push('`weapons_rules.fx`, then the weapon\'s own `fx`): see apps/web/src/game/fx/brass.ts `fxOf`.');
  L.push('');
  L.push('Columns: spent (rounds or items the engine took), shots (the volley\'s `shots`), rolls (shot events, hits), drawn (rounds');
  L.push('the effects fired), heard (the firing sample, played), flew (projectiles of the weapon\'s kind), casings, marks (holes,');
  L.push('pellet clusters or shafts put down, against the rounds that hit), blasts, muzzle flashes, parts (the technique\'s own).');
  L.push('');
  L.push('**' + rows.length + ' rows: ' + played.length + ' played, ' + refused.length + ' refused by the engine (the weapon cannot), ' + played.filter((r) => r.failures.length).length + ' failing.**');
  L.push('');
  L.push('## The weapons and their family');
  L.push('');
  L.push('| weapon | category | ammo | family | sound | projectile | casing | mark | blast | stand-in sound |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const w of RANGED) { const fx = fams.get(w.id); L.push('| ' + [w.id, w.category, w.ammo || '', fx.family, fx.sound + (fx.rate ? ' ×' + fx.rate : ''), fx.look, fx.eject && fx.shell ? fx.shell + ' (' + fx.eject + ')' : 'none', fx.mark || 'none', fx.blast || '', fx.stand_in || ''].join(' | ') + ' |'); }
  L.push('');
  L.push('## Every action');
  L.push('');
  L.push('| weapon | action | dice | spent | shots | rolls (hit) | drawn | heard | flew | casings | marks / hits | blasts | muzzle | parts | result |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of played) L.push('| ' + [r.weapon, r.action, r.pass, r.spent, r.shots || '', r.rolls + ' (' + r.hitRolls + ')', r.rounds, r.sounds + ' ' + r.sample, r.projectiles + ' ' + r.kind, r.casings + (r.casingKind ? ' ' + r.casingKind : ''),
    r.holes + (r.holeKinds.length ? ' ' + r.holeKinds.join('/') : '') + ' / ' + r.hits, r.booms ? r.booms + ' ' + r.boomKinds.join('/') : '', r.muzzles || '', r.parts.join(' · '), r.failures.length ? 'FAIL: ' + r.failures.join('; ') : 'ok'].join(' | ') + ' |');
  L.push('');
  L.push('## Refused by the engine');
  L.push('');
  const byW = new Map<string, string[]>();
  for (const r of refused) if (r.pass === 'hit') (byW.get(r.weapon) || byW.set(r.weapon, []).get(r.weapon)!).push(r.action + ' (' + String(r.refused).replace(/\|/g, '/').slice(0, 90) + ')');
  for (const [wid, acts] of byW) L.push('- `' + wid + '`: ' + acts.join(', '));
  L.push('');
  return L.join('\n');
}
