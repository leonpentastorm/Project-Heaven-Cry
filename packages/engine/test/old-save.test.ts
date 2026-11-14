// @ts-nocheck (drives the recording tool in helpers/replay.ts)
// OLD SAVES KEEP LOADING. test/fixtures/ holds whole GameStates as older engines wrote them. Which engine wrote which:
//
//   save-live-0.22.0-long-mid-fight.json     written by the LIVE build's engine: origin/main at 651ad63, version 0.22.0
//       (the commit the site was deployed from on 12 Nov 2026). Two players, four characters made the way the client
//       makes them (char/add with an archetype's sheet), a story of 900 lines (so 511 of them are in `archive`), then
//       a fight saved in its second round, one character Downed. The script that wrote it, run against that commit's
//       engine, is beside it (save-live-0.22.0-long-mid-fight.how.ts.txt).
//   save-develop-cb40e92-mid-fight.json, save-develop-cb40e92-after-fight.json     written by `develop` at cb40e92, the
//       commit the performance work started from. package.json said 0.22.0 there too, but that commit is 81 commits
//       past the live build (38 engine files changed), so these are NOT what a save from the live site looks like:
//       they are what the engine wrote the day before the performance work. Round 7 of a fight with casters on both
//       sides, glyphs and an Outburst on the field; and back in the story with the finished fight still in `combat`.
//       Neither has an archive.
//
//   save-pre-modes-lobby.json     written by the claude/charming-gauss-hbq4n0 engine at 7cd6b8a0, the commit before rules
//       1.39 (modes and the Survival run): a room saved in its lobby, two players, one character each, start and tone
//       picked. The script beside it (save-pre-modes-lobby.how.ts.txt) wrote it. It has no settings.play: it loads as a
//       campaign (run-state.test.ts reads it).
//
// Each is loaded the way the client loads a save (parsed, migrateLoaded) and played on. NEVER regenerate these files:
// they are what an old save looks like. When the saved shape changes, add a NEW fixture beside them (written by the
// engine as it was before the change; say which commit in this list) and a migration, and these must still pass.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrateLoaded, apply, viewFor, CLASSES, CLASS, CLASS_REV, itemsOf, heldOfChar, scaleOf, maxHp, HP_REV, playOf, quiversOf } from '../src';
import { Rec, fightTurn, type Pc } from './helpers/replay';

const load = (name: string) => migrateLoaded(JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name + '.json', import.meta.url)), 'utf8')));
const MIXED: Pc[] = [{ build: 'calls', level: 12 }, { build: 'sigil', level: 12 }, { build: 'outburst', level: 12 }, { build: 'opt_gun', level: 12 }];
const GUNS: Pc[] = [{ build: 'opt_gun', level: 9 }, { build: 'opt_blade', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'plain_blade', level: 9 }];

describe('a save written by develop at cb40e92 (the day before the performance work) loads and plays on', () => {
  it('in the middle of a fight: the fight goes on to its end and back to the story', () => {
    const g0 = load('save-develop-cb40e92-mid-fight');
    expect(g0.phase).toBe('combat'); expect(g0.combat.over).toBeFalsy();
    const r = new Rec(g0, MIXED), round = g0.combat.round;
    r.fight(12);
    expect(r.errors).toEqual([]);
    expect(r.g.combat.round > round || !!r.g.combat.over).toBe(true);
    expect(r.tally['combat/end-turn'][0]).toBeGreaterThan(3);
    if (r.g.phase !== 'combat') { r.must({ type: 'narrator/turn', turn: { narration: 'It is over.' } }); expect(r.errors).toEqual([]); expect(r.g.phase).toBe('story'); }
    expect(() => viewFor(r.g, 'host')).not.toThrow();
  }, 60_000);
  it('after a fight: the story goes on, the finished fight still reads as finished, and the next fight starts from the same ground', () => {
    const g0 = load('save-develop-cb40e92-after-fight');
    expect(g0.phase).toBe('story'); expect(g0.combat.over).toBe('win');
    const summary = g0.combat.summary, name = g0.combat.name, round = g0.combat.round;
    const r = new Rec(g0, GUNS);
    r.must({ type: 'narrator/turn', turn: { narration: 'You catch your breath.' } });
    // what the screens and the Narrator read of a finished fight is still there after an action on the new engine
    expect(r.g.combat.over).toBe('win'); expect(r.g.combat.summary).toBe(summary); expect(r.g.combat.name).toBe(name); expect(r.g.combat.round).toBe(round);
    expect(Array.isArray(r.g.combat.units)).toBe(true); expect(Array.isArray(r.g.combat.log)).toBe(true);
    expect(() => viewFor(r.g, 'host')).not.toThrow();
    r.must({ type: 'story/speak', text: 'Onward.' });
    r.must({ type: 'narrator/turn', turn: { narration: 'More of them.' } });
    r.must(fightTurn(GUNS, ['minion', 'soldier', 'minion'], 'cover', 'The second fight'));
    expect(r.g.phase).toBe('combat');
    r.fight(8);
    expect(r.errors).toEqual([]);
    expect(r.tally['combat/attack'][0]).toBeGreaterThan(3);
  }, 60_000);
  it('a trivial action on an old save changes nothing but the version counter', () => {
    for (const name of ['save-develop-cb40e92-mid-fight', 'save-develop-cb40e92-after-fight']) {
      const g0 = load(name), g1 = apply(g0, { type: 'player/online', id: 'host', online: true }, 'host');
      expect(Object.keys(g1.characters)).toEqual(Object.keys(g0.characters));
      expect(g1.story.entries.length).toBe(g0.story.entries.length);
      expect(g1.rng).toEqual(g0.rng);
      expect(g1.v).toBe(g0.v + 1);
    }
  }, 60_000);
});

describe('a save written by the live build (origin/main, 0.22.0) loads and plays on: a long story with an archive, in the middle of a fight', () => {
  const NAME = 'save-live-0.22.0-long-mid-fight';
  const raw = () => JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + NAME + '.json', import.meta.url)), 'utf8'));
  const owner = (g: any, unitId: string) => { const u = g.combat.units.find((q: any) => q.id === unitId); return (u?.charId && g.characters[u.charId]?.owner) || 'host'; };
  /** The same action on the state and on a deep copy of it: the same result, and the state given is untouched. */
  const step = (g: any, a: any, by: string) => {
    const before = JSON.stringify(g), next = apply(g, a, by), copied = apply(JSON.parse(before), a, by);
    expect(JSON.stringify(g) === before, a.type + ': the state passed in was changed').toBe(true);
    expect(JSON.stringify(next) === JSON.stringify(copied), a.type + ': not what a deep copy gives').toBe(true);
    return next;
  };
  it('the file is what it says: 0.22.0\'s shape, 511 archived lines, round 2 of a fight', () => {
    const g = raw();
    expect(g.archive.length).toBe(511); expect(g.story.entries.length).toBe(400);
    expect(g.phase).toBe('combat'); expect(g.combat.round).toBe(2); expect(g.combat.over).toBeFalsy();
    expect(g.combat.units.some((u: any) => u.downed)).toBe(true);
    expect(g.combat.sighted).toBeDefined(); expect(g.players.length).toBe(2);
  });
  it('the fight goes on to its end, the story after it, and the archive keeps every line it had, in order', () => {
    const g0 = load(NAME), archived = JSON.stringify(g0.archive), firstLines = g0.archive.slice(0, 5).map((e: any) => e.id);
    let g = g0, sent = 0, refused = 0, checked = 0;
    // every unit of a player attacks what it can (a shot, else a blow) and ends its turn; the enemies are the engine's.
    // Every action goes through `step`: the result is the deep-copy result, the earlier state is untouched.
    for (let guard = 0; guard < 600 && g.phase === 'combat' && !g.combat.over && g.combat.round <= 12; guard++) {
      const cb = g.combat, id = cb.window?.queue?.[0]?.unitId ?? cb.order[cb.turn], u = cb.units.find((q: any) => q.id === id), by = owner(g, id);
      if (cb.window) { try { g = step(g, { type: 'combat/decline', unitId: id }, by); } catch { g = step(g, { type: 'combat/end-turn', unitId: id }, by); } continue; }
      if (u.side === 'pc' && !u.downed && !u.dead) {
        const foes = cb.units.filter((q: any) => q.side === 'foe' && !q.dead && !q.downed);
        for (let k = 0; k < 3 && g.phase === 'combat' && !g.combat.over && g.combat.order[g.combat.turn] === id && !g.combat.window; k++) {
          let done = false;
          for (const f of foes) for (const mode of ['shot', 'melee']) { if (done) break; try { g = step(g, { type: 'combat/attack', unitId: id, targetId: f.id, mode }, by); done = true; sent++; checked++; } catch { refused++; } }
          if (!done) break;
        }
      }
      if (g.phase === 'combat' && !g.combat.over && g.combat.order[g.combat.turn] === id && !g.combat.window) { g = step(g, { type: 'combat/end-turn', unitId: id }, by); checked++; }
    }
    expect(sent).toBeGreaterThan(3); expect(checked).toBeGreaterThan(10);
    expect(g.combat.over, 'the fight ended within 12 rounds (seeded: it always does)').toBeTruthy();
    g = step(g, { type: 'narrator/turn', turn: { narration: 'The bridge is quiet.' } }, 'host'); // the Narrator closes the fight
    expect(g.phase).toBe('story');
    // the story goes on: 40 more lines push 40 more into the archive, after the 511 that were there
    const n0 = g.archive.length, e0 = g.story.entries.length;
    for (let i = 0; i < 20 && g.phase === 'story'; i++) { g = step(g, { type: 'story/speak', text: 'After the bridge, ' + i + '.' }, 'host'); g = step(g, { type: 'narrator/turn', turn: { narration: 'And on, ' + i + '.' } }, 'host'); }
    expect(g.story.entries.length).toBeLessThanOrEqual(400);
    expect(g.archive.length + g.story.entries.length).toBeGreaterThanOrEqual(n0 + e0 + 40);
    expect(g.archive.slice(0, 5).map((e: any) => e.id)).toEqual(firstLines);
    expect(JSON.stringify(g.archive.slice(0, 511)) === archived, 'the 511 archived lines of the save are still there, unchanged, in front').toBe(true);
    expect(JSON.stringify(g0.archive) === archived, 'the loaded save itself was not changed by playing on').toBe(true);
    // the host's view holds what the screens read; a guest's view never holds the archive
    expect(() => viewFor(g, 'host')).not.toThrow(); expect(viewFor(g, 'p2').archive).toBeUndefined();
  }, 120_000);
  it('saved and loaded again in the middle (the round trip a browser makes), it plays the same', () => {
    const a0 = load(NAME), id = a0.combat.order[a0.combat.turn], by = owner(a0, id);
    const a1 = apply(a0, { type: 'combat/end-turn', unitId: id }, by);
    const b1 = apply(migrateLoaded(JSON.parse(JSON.stringify(a0))), { type: 'combat/end-turn', unitId: id }, by);
    expect(JSON.stringify(a1) === JSON.stringify(b1)).toBe(true);
    expect(a1.archive.length).toBe(511); expect(a1.archive).not.toBe(a0.archive); expect(a1.archive[0]).toBe(a0.archive[0]); // a new list of the same lines
  }, 60_000);
});

// save-1b-pre-owned-companion-mid-fight.json: written by the engine at d52d37c (Classes 3.0 step 1b, before P9's owned
// units), with test/helpers/perkfight.ts storyWith: two characters, one with a drone (Kestrel), one with a beast (Rook),
// a fight saved in its second round. No unit carries the owned record and the fight has no ties.
describe('a fight saved before owned units (P9) with a drone and a beast loads and plays on', () => {
  const NAME = 'save-1b-pre-owned-companion-mid-fight';
  it('the companions keep their turns, are read as owned (their owner found), and the fight goes on', async () => {
    const { ownerOf } = await import('../src/owned');
    const g0 = load(NAME), cb0 = g0.combat;
    expect(cb0.ties).toBeUndefined();
    const comps = cb0.units.filter((u: any) => u.companion);
    expect(comps.map((u: any) => u.companion).sort()).toEqual(['beast', 'drone']);
    for (const d of comps) { const o = ownerOf(cb0, d); expect(o?.charId).toBe(d.ctrl); expect(cb0.order.indexOf(d.id)).toBe(cb0.order.indexOf(o!.id) + 1); }
    const r = new Rec(g0, [{ build: 'opt_gun', level: 1 }, { build: 'opt_gun', level: 1 }]);
    r.fight(6);
    expect(r.errors).toEqual([]);
    expect(r.g.combat.round > cb0.round || !!r.g.combat.over).toBe(true);
    expect(() => viewFor(r.g, 'host')).not.toThrow();
  }, 60_000);
});

// Classes 3.0 step 2 (rules 1.29): the nine base classes show new names; ids, move keys and classRev stay, so a save
// written before the rename loads with the same class and the same moves, and only the name it shows is new.
describe('Classes 3.0 renamed the base classes: an old save keeps its class, its moves and its rev', () => {
  const OLD_NAME: Record<string, string> = { defender: 'Defender', fighter: 'Fighter', marksman: 'Marksman', infiltrator: 'Infiltrator', mage: 'Mage', trickster: 'Trickster', bard: 'Bard', channeler: 'Channeler', guardian: 'Guardian' };
  it('the ids are the Revision 3 ids; the names are the data\'s, new where the rename changed them', () => {
    expect(CLASSES.map((c) => c.id).sort()).toEqual(Object.keys(OLD_NAME).sort());
    for (const c of CLASSES) expect(c.name === OLD_NAME[c.id]).toBe(c.id === 'channeler');
    expect(CLASS_REV).toBe(3); // migrateCharacterClass runs only when this changes: the rename must not run it
  });
  for (const f of ['save-develop-cb40e92-mid-fight', 'save-develop-cb40e92-after-fight', 'save-live-0.22.0-long-mid-fight']) it(f + ': every character keeps classId, classRev and its move keys; the name comes from the data', () => {
    const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + f + '.json', import.meta.url)), 'utf8'));
    const g = migrateLoaded(JSON.parse(JSON.stringify(raw)));
    let classed = 0;
    for (const id of Object.keys(raw.characters)) {
      const was = raw.characters[id], c = g.characters[id];
      expect(c.classId ?? null).toBe(was.classId ?? null); expect(c.classRev).toBe(was.classRev);
      if (!c.classId) continue;
      classed++;
      expect(CLASS[c.classId].name).toBe(CLASSES.find((k) => k.id === c.classId)!.name);
      const keys = itemsOf(heldOfChar(c)).filter((i) => i.kind === 'class').map((i) => i.key);
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) expect(k).toMatch(/^class:[a-z_]+\.[a-z_]+$/); // keys are ids, never display names
    }
    if (f.startsWith('save-develop')) expect(classed).toBeGreaterThan(0);
  });
});

describe('rules 1.36 (the level scale): a save from before it moves into the new units once', () => {
  const raw = () => JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/save-live-0.22.0-long-mid-fight.json', import.meta.url)), 'utf8'));
  it('a level 9 character keeps the same share of its bar (HP × scale), and so do its unit, its shield and its armour in a fight saved mid-way', () => {
    const r = raw(), cid = Object.keys(r.characters)[0], c0 = r.characters[cid]; c0.level = 9; c0.hp = 100; delete c0.hpRev;
    const u0 = r.combat.units.find((u: any) => u.charId === cid); u0.level = 9; u0.hp = 50; u0.shield = 10; const arm0 = u0.armour;
    const g = apply(migrateLoaded(r), { type: 'player/online', id: 'p2', online: true } as any, 'host'), c = g.characters[cid], u = g.combat.units.find((x: any) => x.charId === cid);
    const f = scaleOf(9);
    expect(c.hpRev).toBe(HP_REV); expect(c.hp).toBe(Math.min(maxHp(c), Math.round(100 * f)));
    expect(u.maxHp).toBe(maxHp(c)); expect(u.hp).toBe(Math.round(50 * f)); expect(u.shield).toBe(Math.round(10 * f)); expect(u.armour).toBe(Math.round(arm0 * f));
    const again = apply(g, { type: 'player/online', id: 'p2', online: false } as any, 'host'); // once: a second action moves nothing
    expect(again.characters[cid].hp).toBe(c.hp); expect(again.combat.units.find((x: any) => x.charId === cid).hp).toBe(u.hp);
  });
  it('a level 1 save is untouched to the digit', () => {
    const r = raw(), before = Object.fromEntries(Object.values(r.characters).map((c: any) => [c.id, c.hp]));
    const g = apply(migrateLoaded(r), { type: 'player/online', id: 'p2', online: true } as any, 'host');
    for (const [id, hp] of Object.entries(before)) expect(g.characters[id].hp).toBe(hp);
  });
});

// Rules 1.39 (Survival step 1): a save from before modes has no settings.play; it reads as a campaign (data/modes.json
// old_save) and plays its story on; a lobby saved then can still switch to Survival and start a run.
describe('rules 1.39: an old save loads as a campaign', () => {
  const start = (g: any, seed: string) => apply(g, { type: 'run/start', seed }, g.hostId);
  const fixture = (name: string) => migrateLoaded(JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name + '.json', import.meta.url)), 'utf8')));
  it('every old save (written before modes) loads as a campaign and keeps playing its story', () => {
    for (const name of ['save-live-0.22.0-long-mid-fight', 'save-develop-cb40e92-mid-fight', 'save-develop-cb40e92-after-fight', 'save-1b-pre-owned-companion-mid-fight', 'save-pre-modes-lobby']) {
      const g = fixture(name);
      expect(g.settings.play, name).toBeUndefined(); expect(playOf(g), name).toBe('campaign'); expect(g.run, name).toBeFalsy();
      expect(() => viewFor(g, g.hostId), name).not.toThrow();
    }
  });
  it('a lobby saved before modes (save-pre-modes-lobby) starts its story as before, and can switch to Survival and run', () => {
    const g = fixture('save-pre-modes-lobby');
    expect(g.phase).toBe('lobby');
    expect(apply(g, { type: 'session/start' }, g.hostId).phase).toBe('story');
    const s = apply(g, { type: 'settings', patch: { play: 'survival' } }, g.hostId);
    expect(start(s, 'PHC-0002').run!.state).toBe('loadout'); // rules 1.52: the camp before node 1
    expect(apply(start(s, 'PHC-0002'), { type: 'run/ready', close: true }, g.hostId).run!.state).toBe('map');
  });
});

// Rules 1.53 (bows and quivers): save-pre-quivers-archer-mid-fight.json was written by the claude/charming-gauss-hbq4n0
// engine at 92f51dbb, the commit before quivers became gear (the script beside it). Its archer has the old per-bow
// quiver (c.phys.quiver.recurve_bow, c.loaded) and is mid-fight with an arrow already loosed (u.quiver, no quiverGear).
describe('rules 1.53: a save from before quivers were gear loads and plays on', () => {
  const ARCH: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
  it('the archer\'s quiver goes on in the fight, its shots draw from it, and after the fight it is the character\'s worn quiver', () => {
    const g0 = load('save-pre-quivers-archer-mid-fight'), archer = Object.values(g0.characters).find((c: any) => c.weapon === 'recurve_bow') as any;
    expect(g0.phase).toBe('combat'); expect(archer.quivers).toBeUndefined();
    expect(quiversOf(archer)).toEqual([{ id: 'quiver', arrows: { standard: 14, incendiary: 6 } }]); // read from the old record
    const u0 = g0.combat.units.find((x: any) => x.charId === archer.id); expect(u0.quiver).toEqual({ standard: 13, incendiary: 6 }); expect(u0.ammo).toBe(19);
    const r = new Rec(g0, ARCH);
    r.fight(12);
    expect(r.errors).toEqual([]);
    const u = r.g.combat.units.find((x: any) => x.charId === archer.id);
    if (!r.g.combat.over) { const n = Object.values(u.quiver || {}).reduce((t: number, k: any) => t + k, 0); expect(n).toBe(u.ammo); expect(n).toBeLessThanOrEqual(19); }
    else { const qs = quiversOf(r.g.characters[archer.id]); expect(qs.length).toBe(1); expect(Object.values(qs[0].arrows).reduce((t: number, k: any) => t + k, 0)).toBe(r.g.characters[archer.id].loaded); }
    expect(() => viewFor(r.g, 'host')).not.toThrow();
  }, 60_000);
});
