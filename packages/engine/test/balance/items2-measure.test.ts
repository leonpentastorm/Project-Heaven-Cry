// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE ITEMS 2.0 WEAPON TABLE (0.34.0; docs/design/handoffs/0.34-WEAPON-MEASURES.md). Every weapon row a player can hold,
// old and new, measured with the project's own ceiling tools against the plain rifle (guns-measure.ts rifleYard, the
// yardstick at its pin): guns by guns-measure.ts weaponRows (the optimised gun build, best of the four rotations), melee
// by melee-measure.test.ts's build rule (the optimised blade build; Dexterity rows in the Dexterity twin; here also a
// Durability twin for shields, class Defender, since shields hit with Durability). Two columns: level 1, normal share,
// standard grade ("no investment"), level 10 normal share Masterwork (l10n), and level 10, all in, Masterwork (the tools' own ceiling build), bare and with each
// mod slot filled by the mod that measures best (measures-032.ts modRow's greedy method, extended to melee).
// Nothing here changes a number in data.
//
//   ITEMS2=1 [ITEMS2_N=8] [ITEMS2_WEAPONS=id,id] [ITEMS2_PARTS=l1,l10,l10n,mods] [ITEMS2_OUT=file.json] \
//     npx vitest run --root packages/engine test/balance/items2-measure.test.ts --silent=false
import { describe, it } from 'vitest';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { gunRow, rifleYard, gunBuild, ROTATIONS } from './guns-measure';
import { BUILD, BUILDS, buildCharacter } from './builds';
import { WEAPON, ITEM, fitMod } from '../../src';

const env = (globalThis as any).process?.env || {};
const kindOf = (w: any) => (w.phys?.system === 'ranged' ? (w.category === 'thrown' ? null : 'gun') : w.category === 'shield' ? 'shield' : 'melee');
/** Every weapon a player can hold (no companion bites, no bare fists, no grenades). */
export const HOLDABLE = () => Object.values(WEAPON).filter((w: any) => !w.companion_only && w.id !== 'fists' && kindOf(w)).map((w: any) => w.id as string);

/** The optimised blade build for a melee row (melee-measure.test.ts meleeBuild's rule), with a Durability twin for shields. */
function meleeBuild(weapon: string, rarity: string, mods: string[] = [], base?: string): string {
  const w: any = WEAPON[weapon], hw = w?.phys?.hits_with, id = 'i2m:' + weapon + ':' + rarity + ':' + (mods.join('+') || 'bare') + (base ? '|' + base : '');
  if (base && !BUILD[id]) { const def = { ...BUILD[base], id, ...(mods.length ? { tweak: fitAll(weapon, mods) } : {}) }; BUILDS.push(def); BUILD[id] = def; }
  if (!BUILD[id]) {
    const b = BUILD.opt_blade, swapTo = hw === 'dexterity' ? 'dexterity' : hw === 'durability' ? 'durability' : null;
    const sw = (s: string) => (s === 'raw_power' && swapTo ? swapTo : s);
    const weights = Object.fromEntries(Object.entries(b.weights).map(([k, v]) => [sw(k), v]));
    const allin = b.allin.map(sw).filter((s: string, i: number, a: string[]) => a.indexOf(s) === i);
    const cls = hw === 'dexterity' ? 'marksman' : hw === 'durability' ? 'defender' : b.classId;
    const def = { ...b, id, label: (w?.name || weapon) + ' (' + rarity + ')', weapon, rarity, ...(swapTo ? { main: swapTo, classId: cls, weights, allin } : {}), ...(mods.length ? { tweak: fitAll(weapon, mods) } : {}) };
    BUILDS.push(def); BUILD[id] = def;
  }
  return id;
}
const fitAll = (weapon: string, mods: string[]) => (c: any) => { for (const m of mods) { c.pack = [...(c.pack || []), { id: m, item: m, name: ITEM[m]?.name || m, qty: 1, kind: 'mod' }]; const no = fitMod(c, c.pack.length - 1, 'main'); if (no) throw new Error(weapon + ' ' + m + ': ' + no); } };
function gunModBuild(weapon: string, mods: string[], base?: string): string {
  const id = 'i2g:' + weapon + ':' + (mods.join('+') || 'bare') + (base ? '|' + base : '');
  if (!BUILD[id]) { const def = { ...BUILD[base || gunBuild(weapon, 'masterwork')], id, ...(mods.length ? { tweak: fitAll(weapon, mods) } : {}) }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}
/** The four rotations of guns-measure.ts (ROTATIONS) on a given build; the best. */
function bestRot(w: string, b: string, variant: string, level: number, n: number, yard: number) {
  const rows = ROTATIONS.map((r) => ({ rot: r.id, ...gunRow(w + ' · ' + r.id, b, variant, level, n, yard, { policy: r.policy, opts: r.opts }) }));
  const best = rows.reduce((a, c) => (c.pctRifle > a.pctRifle ? c : a), rows[0]);
  return { pct: best.pctRifle, perTurn: best.perTurn, rot: best.rot, plain: rows[0].pctRifle, errors: rows.reduce((e, q) => e + q.errors, 0) };
}
const modsFor = (slot: string) => Object.values(ITEM).filter((m: any) => m.category === 'mod' && m.mod_slot === slot).map((m: any) => m.id as string);

function holds(build: string, variant: string, level: number, weapon: string) { const bc = buildCharacter(build, variant as any, level); return bc.c.weapon === weapon ? null : (bc.notes.filter((q: string) => /refused/.test(q)).join('; ') || 'not held'); }
/** A row the build refuses for a skill need ("Needs raw power 3."): the same build with that skill second in the all-in
 * order and a 0.3 share in the normal one (3 of creation's 10 points) (a legal sheet that meets the need; the row says so). */
function needTwin(build: string, no: string): string | null {
  const m = /Needs ([a-z ]+) \d/.exec(no || ''); if (!m) return null;
  const sk = m[1].trim().replace(/ /g, '_'), id = build + '|need:' + sk;
  if (!BUILD[id]) { const b = BUILD[build], allin = [b.allin[0], sk, ...b.allin.slice(1).filter((x: string) => x !== sk)];
    const def = { ...b, id, allin, weights: { ...b.weights, [sk]: Math.max(0.3, b.weights[sk] || 0) } }; BUILDS.push(def); BUILD[id] = def; }
  return id;
}
/** The build that holds the row: the tool's own, else its need twin; null and the reason if neither holds it. */
function holder(build: string, variant: string, level: number, weapon: string): { b: string | null; no?: string; need?: string } {
  const no = holds(build, variant, level, weapon); if (!no) return { b: build };
  const t = needTwin(build, no); if (t && !holds(t, variant, level, weapon)) return { b: t, need: no.replace(/^.*\((.*)\).*$/, '$1') };
  return { b: null, no };
}

describe.runIf(env.ITEMS2)('Items 2.0: every holdable weapon against the plain rifle', () => {
  it('measures', () => {
    const n = Number(env.ITEMS2_N || 8), parts = String(env.ITEMS2_PARTS || 'l1,l10,mods').split(',');
    const ws = env.ITEMS2_WEAPONS ? String(env.ITEMS2_WEAPONS).split(',') : HOLDABLE();
    const OUT = env.ITEMS2_OUT, out: any = OUT && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { n, rows: {} };
    const yard: Record<number, number> = {}; const Y = (lv: number) => (yard[lv] ??= rifleYard(lv, Math.max(60, n)));
    out.yard = { 1: Y(1), 10: Y(10) };
    for (const w of ws) {
      const W: any = WEAPON[w], kind = kindOf(W), row: any = (out.rows[w] ||= { id: w, kind });
      const t0 = Date.now();
      try {
        // ---- level 1, normal share, standard grade
        if (parts.includes('l1') && row.l1 == null) {
          const h = holder(kind === 'gun' ? gunBuild(w, 'standard') : meleeBuild(w, 'standard'), 'normal', 1, w);
          if (!h.b) row.l1 = { no: h.no };
          else if (kind === 'gun') { const r = bestRot(w, h.b, 'normal', 1, n, Y(1)); row.l1 = { ...r, ...(h.need ? { need: h.need } : {}) }; }
          else { const r = gunRow(w, h.b, 'normal', 1, n, Y(1), { policy: 'optimised' }); row.l1 = { pct: r.pctRifle, perTurn: r.perTurn, hit: r.hitPct, errors: r.errors, ...(h.need ? { need: h.need } : {}) }; }
        }
        // ---- level 10, all in, Masterwork, bare
        if (parts.includes('l10') && row.l10 == null) {
          const h = holder(kind === 'gun' ? gunBuild(w, 'masterwork') : meleeBuild(w, 'masterwork'), 'allin', 10, w);
          if (!h.b) row.l10 = { no: h.no };
          else if (kind === 'gun') { const r = bestRot(w, h.b, 'allin', 10, n, Y(10)); row.l10 = { ...r, ...(h.need ? { need: h.need, build: h.b } : {}) }; }
          else { const r = gunRow(w, h.b, 'allin', 10, n, Y(10), { policy: 'optimised' }); row.l10 = { pct: r.pctRifle, perTurn: r.perTurn, hit: r.hitPct, errors: r.errors, ...(h.need ? { need: h.need, build: h.b } : {}) }; }
        }
        // ---- level 10, normal share, Masterwork, bare (the share the lines were set at)
        if (parts.includes('l10n') && row.l10n == null) {
          const h = holder(kind === 'gun' ? gunBuild(w, 'masterwork') : meleeBuild(w, 'masterwork'), 'normal', 10, w);
          if (!h.b) row.l10n = { no: h.no };
          else if (kind === 'gun') { const r = bestRot(w, h.b, 'normal', 10, n, Y(10)); row.l10n = { ...r, ...(h.need ? { need: h.need } : {}) }; }
          else { const r = gunRow(w, h.b, 'normal', 10, n, Y(10), { policy: 'optimised' }); row.l10n = { pct: r.pctRifle, perTurn: r.perTurn, hit: r.hitPct, errors: r.errors, ...(h.need ? { need: h.need } : {}) }; }
        }
        // ---- level 10, all in, Masterwork, each slot the best mod on top of what is fitted (greedy)
        if (parts.includes('mods') && row.mods == null && row.l10 && !row.l10.no) {
          const slots: string[] = W.mod_slots || [];
          if (!slots.length) row.mods = { pct: row.l10.pct, mods: [], note: 'no slots' };
          else {
            const rot = kind === 'gun' ? { plain: 'plain', step1: 'optimised', gunner: 'gunner', dump: 'gunner' }[row.l10.rot] : 'optimised';
            const opts = kind === 'gun' && row.l10.rot === 'gunner' ? { noDump: true } : undefined;
            const val = (mods: string[]) => { const b = kind === 'gun' ? gunModBuild(w, mods, row.l10.build) : meleeBuild(w, 'masterwork', mods, row.l10.build); return gunRow(w, b, 'allin', 10, n, Y(10), { policy: rot, ...(opts ? { opts } : {}) }); };
            const bare = val([]); let cur: string[] = [], best = bare.pctRifle, errors = bare.errors;
            for (const slot of slots) { let pick: string | null = null, pv = best;
              for (const m of modsFor(slot)) { let v: any; try { v = val([...cur, m]); } catch { continue; } errors += v.errors; if (v.pctRifle > pv) { pv = v.pctRifle; pick = m; } }
              if (pick) { cur = [...cur, pick]; best = pv; } }
            row.mods = { bare: bare.pctRifle, pct: best, mods: cur, rot, errors };
          }
        }
      } catch (e) { row.err = String(e).slice(0, 200); }
      console.log('[items2] ' + w + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's ' + JSON.stringify(row));
      if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
    }
  }, 48 * 3600_000);
});

// ---- two shields (measures-032.ts wallRow: the Living Wall beside two plain rifles, the standard fight, ground with
// cover), one pair of each Items 2.0 shield against two Bucklers.
//   ITEMS2_SHIELDS=1 [ITEMS2_N=40] [ITEMS2_LEVELS=1,6] [ITEMS2_PAIRS=buckler,boss_shield,...] npx vitest run --root packages/engine test/balance/items2-measure.test.ts --silent=false
import { wallRow, WALL_HEAD, wallLine } from './measures-032';
import { gearEntry, equip } from '../../src';
const hold2 = (id: string) => (c: any) => { for (const to of ['main', 'off']) { c.pack = [...(c.pack || []), gearEntry(id, {})]; const no = equip(c, c.pack.length - 1, to); if (no) throw new Error('equip ' + id + ' ' + to + ': ' + no); } };
describe.runIf(env.ITEMS2_SHIELDS)('Items 2.0: two shields of each family against two Bucklers', () => {
  it('measures', () => {
    const n = Number(env.ITEMS2_N || 40), levels = String(env.ITEMS2_LEVELS || '1,6').split(',').map(Number);
    const pairs = String(env.ITEMS2_PAIRS || 'buckler,riot_shield,pavise,spiked_buckler,boss_shield,ram_plate,deflector,bulwark_screen,barrier_wall').split(',');
    let md = WALL_HEAD.replace('| Wall |', '| Wall |') + '\n';
    for (const lv of levels) for (const s of pairs) {
      const id = 'i2w:' + s; if (!BUILD[id]) { const d = { ...BUILD.door_wall, id, label: 'two ' + s, tweak: hold2(s) }; BUILDS.push(d); BUILD[id] = d; }
      try { const r = wallRow('two ' + s, id, lv, n); md += wallLine(r) + ' dealt a round ' + (r.rounds ? Math.round(r.dealt / r.rounds * 10) / 10 : '-') + '\n'; console.log('[wall] ' + JSON.stringify(r)); }
      catch (e) { md += '| two ' + s + ' | ' + lv + ' | FAILED ' + String(e).slice(0, 160) + ' |\n'; }
    }
    console.log(md); if (env.ITEMS2_MD) writeFileSync(env.ITEMS2_MD, md);
  }, 48 * 3600_000);
});
