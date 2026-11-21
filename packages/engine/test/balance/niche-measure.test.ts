// @ts-nocheck (a measuring tool)
// THE NICHE ROWS (build plan 0.29 P2 item 2; niche-measure.ts says what each row is). Env-gated: nothing runs in
// `npm run check` but the one cheap sanity test below.
//
//   NICHE_MEASURE=1 npx vitest run test/balance/niche-measure.test.ts -t "full run" --silent=false
//   NICHE_N=6                        fights a cell (default 6; 8 turns each)
//   NICHE_LEVELS=1,6,12              NICHE_VARIANTS=normal,allin (default normal)
//   NICHE_WEAPONS=id,id              (default: every weapon a character can hold, guns and melee)
//   NICHE_PARTS=bands,cluster,paired,melee,mods   (default all)
//   NICHE_OUT=<file.json>            writes every row and the markdown tables (<file>.md)
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { WEAPON, ITEM } from '../../src';
import { buildCharacter } from './builds';
import { BANDS, BAND_NAME, bandMap, nicheGun, nicheMelee, nicheCell, yardOf, NROT } from './niche-measure';

const env = process.env;
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const GUNLIST = () => Object.values(WEAPON).filter((w: any) => w.phys?.system === 'ranged' && w.category !== 'thrown' && !w.companion_only).map((w: any) => w.id as string);
const MELEELIST = () => Object.values(WEAPON).filter((w: any) => w.phys?.system === 'melee' && !w.companion_only).map((w: any) => w.id as string);

describe('the niche rows (0.29 P2)', () => {
  it('a held shooter fires from where it stands: the band ground and the held policy play a fight without errors', () => {
    const b = nicheGun('hellraiser_service_rifle'), { c, f } = nicheCell(b.id, 6, 'normal', bandMap(12), 1, 'plain');
    expect(c.errors).toBe(0); expect(c.dmg).toBeGreaterThan(0); expect(f.apShare.move || 0).toBe(0);
  }, 120_000);

  (env.NICHE_MEASURE ? it : it.skip)('full run', () => {
    const levels = (env.NICHE_LEVELS || '1,6,12').split(',').map(Number), n = Math.max(1, Number(env.NICHE_N) || 6), variants = (env.NICHE_VARIANTS || 'normal').split(',');
    const parts = new Set((env.NICHE_PARTS || 'bands,cluster,paired,melee,mods').split(','));
    const only = env.NICHE_WEAPONS ? new Set(env.NICHE_WEAPONS.split(',')) : null;
    const guns = GUNLIST().filter((w) => !only || only.has(w)), melee = MELEELIST().filter((w) => !only || only.has(w));
    const yard = Object.fromEntries(levels.map((lv) => [lv, yardOf(lv, 60)]));
    const rows: any[] = [], log = (s: string) => console.log('[niche] ' + s);
    const inHand = (b: string, v: string, lv: number, w: string) => { try { return buildCharacter(b, v as any, lv).c.weapon === w; } catch { return false; } };
    /** The best of the rotations (guns) for one weapon, situation, level, variant. */
    const gunCell = (w: string, sit: string, mapKey: string, lv: number, v: string, o: { foes?: number; offHand?: string; mods?: string[] } = {}) => {
      const b = nicheGun(w, { offHand: o.offHand, mods: o.mods });
      if (!inHand(b.id, v, lv, w)) return null;
      let best: any = null;
      for (const rot of NROT) { const { c, f } = nicheCell(b.id, lv, v, mapKey, n, rot.policy, { foes: o.foes, opts: rot.opts }), per = c.dmg / Math.max(1, c.turns);
        const row = { weapon: w, situation: sit, level: lv, variant: v, rot: rot.id, perTurn: r1(per), pct: pct(per, yard[lv].perTurn), peak: pct(f.peakTurnAvg, yard[lv].peak), bigHit: c.bigHit, hitPct: f.hitPct, errors: c.errors, asIf: b.asIf, mods: o.mods || [], offHand: o.offHand || null };
        if (!best || row.pct > best.pct) best = row; }
      rows.push(best); log(sit + ' L' + lv + ' ' + v + ' ' + w + (o.mods?.length ? ' +' + o.mods.join('+') : '') + ': ' + best.pct + '% (' + best.rot + ') peak ' + best.peak + '%' + (best.errors ? ' ERRORS ' + best.errors : ''));
      return best;
    };
    for (const v of variants) for (const lv of levels) {
      if (parts.has('bands')) for (const w of guns) for (const d of BANDS) gunCell(w, 'band ' + d, bandMap(d), lv, v);
      if (parts.has('cluster')) for (const w of guns) gunCell(w, 'cluster of 3 at 6', bandMap(6, true), lv, v, { foes: 3 });
      if (parts.has('paired')) for (const w of guns.filter((q) => (WEAPON[q] as any).hands === '1H')) gunCell(w, 'paired at 6', bandMap(6), lv, v, { offHand: w });
      if (parts.has('melee')) for (const w of melee) {
        const b = nicheMelee(w); if (w !== 'fists' && !inHand(b.id, v, lv, w)) { log('melee ' + w + ': the build cannot hold it'); continue; }
        for (const [sit, mk, walk] of [['next to it', bandMap(1), false], ['walk in from 6', bandMap(6), true]] as const) {
          const { c, f } = nicheCell(b.id, lv, v, mk, n, 'optimised', { walk }), per = c.dmg / Math.max(1, c.turns);
          const row = { weapon: w, situation: sit, level: lv, variant: v, rot: 'optimised', perTurn: r1(per), pct: pct(per, yard[lv].perTurn), peak: pct(f.peakTurnAvg, yard[lv].peak), bigHit: c.bigHit, hitPct: f.hitPct, errors: c.errors, asIf: b.asIf, mods: [], offHand: null };
          rows.push(row); log(sit + ' L' + lv + ' ' + v + ' ' + w + ': ' + row.pct + '% peak ' + row.peak + '%' + (row.errors ? ' ERRORS ' + row.errors : ''));
        }
      }
    }
    // mods: each gun class's best gun at its best band (normal share, the mean over the levels), every legal mod alone,
    // the best of each slot together
    const modRows: any[] = [];
    if (parts.has('mods')) {
      const v = variants[0], byClass: Record<string, { w: string; sit: string; mean: number }> = {};
      for (const w of guns) for (const d of BANDS) { const xs = rows.filter((q) => q.weapon === w && q.situation === 'band ' + d && q.variant === v && !q.mods.length && !q.offHand); if (xs.length !== levels.length) continue;
        const m = xs.reduce((t, q) => t + q.pct, 0) / xs.length, cat = (WEAPON[w] as any).category; if (!byClass[cat] || m > byClass[cat].mean) byClass[cat] = { w, sit: 'band ' + d, mean: m }; }
      const MODS = Object.values(ITEM).filter((m: any) => m.category === 'mod' && m.built !== false && m.mod_slot !== 'enchantment');
      for (const [cat, best] of Object.entries(byClass)) {
        const slots: string[] = (WEAPON[best.w] as any).mod_slots || [], d = Number(best.sit.split(' ')[1]);
        const bare = Object.fromEntries(levels.map((lv) => [lv, rows.find((q) => q.weapon === best.w && q.situation === best.sit && q.level === lv && q.variant === v && !q.mods.length)?.pct || 0]));
        const pick: string[] = [];
        for (const slot of slots) {
          let top: any = null;
          for (const m of MODS.filter((q: any) => q.mod_slot === slot)) {
            let cells: any[]; try { cells = levels.map((lv) => gunCell(best.w, best.sit + ' +mod', bandMap(d), lv, v, { mods: [m.id] })); } catch (e) { log('mod ' + m.id + ' on ' + best.w + ': ' + String(e).slice(0, 120)); continue; }
            if (cells.some((q) => !q)) continue;
            const gain = cells.reduce((t, q, i) => t + q.pct - bare[levels[i]], 0) / cells.length; modRows.push({ cls: cat, weapon: best.w, sit: best.sit, mods: [m.id], cells: cells.map((q) => q.pct), gain });
            if (gain > 0.5 && (!top || gain > top.gain)) top = { id: m.id, gain };
          }
          if (top) pick.push(top.id);
        }
        if (pick.length > 1) { const cells = levels.map((lv) => gunCell(best.w, best.sit + ' +mods', bandMap(d), lv, v, { mods: pick })); if (cells.every(Boolean)) modRows.push({ cls: cat, weapon: best.w, sit: best.sit, mods: pick, cells: cells.map((q) => q.pct), gain: cells.reduce((t, q, i) => t + q.pct - bare[levels[i]], 0) / cells.length, set: true }); }
        else if (pick.length === 1) { const r = modRows.find((q) => q.weapon === best.w && q.mods.length === 1 && q.mods[0] === pick[0]); if (r) modRows.push({ ...r, set: true }); }
        modRows.push({ cls: cat, weapon: best.w, sit: best.sit, mods: [], cells: levels.map((lv) => bare[lv]), gain: 0, bare: true });
      }
    }
    // the hypothetical: the paired hand cannon, its off hand modded as the main hand's set (not measurable today)
    const hyp: any[] = [];
    { const hc = 'frontier_hand_cannon', set = modRows.find((q) => q.weapon === hc && q.set), v = variants[0];
      for (const lv of levels) { const p = rows.find((q) => q.weapon === hc && q.situation === 'paired at 6' && q.level === lv && q.variant === v), single = rows.find((q) => q.weapon === hc && q.situation === 'band 6' && q.level === lv && q.variant === v && !q.mods.length);
        const bareRow = modRows.find((q) => q.weapon === hc && q.bare), i = levels.indexOf(lv), modded = set ? set.cells[i] : null, bareAt = bareRow ? bareRow.cells[i] : null;
        // the gain is read where the set was measured (the gun's best band) and applied to the paired row at 6 tiles
        if (p && single && modded != null && bareAt) hyp.push({ level: lv, paired: p.pct, single: single.pct, singleModded: modded, bareAt, mods: set.mods, sit: set.sit, hypothetical: Math.round(p.pct * modded / bareAt) }); } }
    // ---------- the tables
    let md = '';
    const sits = [...new Set(rows.map((q) => q.situation))].filter((s) => !/\+mod/.test(s));
    for (const v of variants) {
      md += '\n## ' + (v === 'normal' ? 'Normal share' : 'All in') + ' (Masterwork, ' + n + ' fights a cell, 8 turns)\n\nThe plain rifle a turn (the 100%): ' + levels.map((l) => 'L' + l + ' ' + r1(yard[l].perTurn)).join(' · ') + '. A cell: % of it at L' + levels.join(' / L') + '; (a) an as-if hand.\n';
      const cats = [...new Set(rows.filter((q) => q.variant === v).map((q) => (WEAPON[q.weapon] as any).category))];
      for (const cat of cats) {
        const ws = [...new Set(rows.filter((q) => q.variant === v && (WEAPON[q.weapon] as any).category === cat).map((q) => q.weapon))];
        const ss = sits.filter((s) => rows.some((q) => q.variant === v && q.situation === s && ws.includes(q.weapon)));
        md += '\n### ' + cat + '\n\n| Weapon | ' + ss.join(' | ') + ' |\n|---|' + ss.map(() => '---').join('|') + '|\n';
        for (const w of ws) md += '| ' + (WEAPON[w]?.name || w) + (rows.some((q) => q.weapon === w && q.asIf) ? ' (a)' : '') + ' | ' + ss.map((s) => { const xs = levels.map((lv) => rows.find((q) => q.weapon === w && q.situation === s && q.level === lv && q.variant === v));
          if (xs.every((q) => !q)) return '–'; return xs.map((q) => (q ? String(q.pct) : '–')).join(' / '); }).join(' | ') + ' |\n';
      }
      // each class's best cell, and whether it is the best of all classes there
      md += '\n### Each class\'s best cell (' + (v === 'normal' ? 'normal share' : 'all in') + '): its best weapon, the situation where it reads highest (mean over the levels), and the class that is best there\n\n| Class | Best weapon | Situation | Mean % | Best in game there? (the top class and weapon there) |\n|---|---|---|---|---|\n';
      const meanOf = (w: string, s: string) => { const xs = rows.filter((q) => q.weapon === w && q.situation === s && q.variant === v); return xs.length === levels.length ? xs.reduce((t, q) => t + q.pct, 0) / xs.length : null; };
      const top: Record<string, { w: string; m: number; cat: string }> = {};
      for (const s of sits) for (const w of [...new Set(rows.map((q) => q.weapon))]) { const m = meanOf(w, s); if (m == null) continue; if (!top[s] || m > top[s].m) top[s] = { w, m, cat: (WEAPON[w] as any).category }; }
      for (const cat of cats) {
        let b: any = null; for (const s of sits) for (const w of [...new Set(rows.filter((q) => (WEAPON[q.weapon] as any).category === cat).map((q) => q.weapon))]) { const m = meanOf(w, s); if (m != null && (!b || m > b.m)) b = { w, s, m }; }
        if (!b) continue;
        md += '| ' + cat + ' | ' + (WEAPON[b.w]?.name || b.w) + ' | ' + b.s + ' | ' + Math.round(b.m) + ' | ' + (top[b.s].cat === cat ? 'yes' : 'no: ' + top[b.s].cat + ' (' + (WEAPON[top[b.s].w]?.name || top[b.s].w) + ' ' + Math.round(top[b.s].m) + ')') + ' |\n';
      }
    }
    if (modRows.length) {
      md += '\n## Mods: each gun class\'s best gun at its best band, every legal mod alone, then the best of each slot together (' + variants[0] + ', % of the plain rifle at L' + levels.join(' / L') + '; gain: mean points over the bare gun)\n\n| Class | Gun | Situation | Mods | Cells | Gain |\n|---|---|---|---|---|---|\n';
      for (const q of modRows) md += '| ' + q.cls + ' | ' + (WEAPON[q.weapon]?.name || q.weapon) + ' | ' + q.sit + ' | ' + (q.bare ? '(bare)' : q.mods.map((m: string) => ITEM[m]?.name || m).join(' + ') + (q.set ? ' **(the best legal set)**' : '')) + ' | ' + q.cells.join(' / ') + ' | ' + (q.bare ? '-' : (q.gain >= 0 ? '+' : '') + r1(q.gain)) + ' |\n';
    }
    if (hyp.length) { md += '\n## HYPOTHETICAL: the paired hand cannon with a modded off hand (not measurable today: a paired attack drops the off hand\'s mods). Paired at 6 tiles × (single with the set ÷ single bare, both at ' + hyp[0].sit + ')\n\n| Level | Paired at 6, bare | Single at 6, bare | Single at ' + hyp[0].sit + ': bare, with ' + hyp[0].mods.join(' + ') + ' | Hypothetical paired, both hands modded |\n|---|---|---|---|---|\n';
      for (const h of hyp) md += '| ' + h.level + ' | ' + h.paired + ' | ' + h.single + ' | ' + h.bareAt + ', ' + h.singleModded + ' | **' + h.hypothetical + '** (estimate) |\n'; }
    console.log(md);
    if (env.NICHE_OUT) { writeFileSync(env.NICHE_OUT, JSON.stringify({ n, levels, variants, yard, rows, modRows, hyp }, null, 1)); writeFileSync(String(env.NICHE_OUT).replace(/\.json$/, '') + '.md', md); }
    expect(rows.filter((q) => q.errors).map((q) => q.weapon + ' ' + q.situation + ' L' + q.level)).toEqual([]);
  }, 24 * 3600_000);
});
