// @ts-nocheck (a measuring tool)
// The tables of Survival's simulated runs (survival-run.ts): one block per cell (party × route), the numbers section
// 10 row 9 asks for. Read by survival-run.test.ts (SIM_REPORT=files): plain text, for the hand-off.
import type { RunResult } from './survival-run';

const r1 = (x: number) => Math.round(x * 10) / 10, r0 = Math.round, pct = (a: number, b: number) => (b ? r0((100 * a) / b) + '%' : '-');
const mean = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : NaN);
const sd = (xs: number[]) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / (xs.length - 1)) : 0; };
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
/** Where a run ended, as a number: stage + depth / 15 (a run that cleared stage 2 and fell at stage 3's depth 6 is 3.4). */
export const endAt = (r: RunResult) => (r.how === 'cap' ? r.cleared + 1 : r.stage + r.depth / 15);

export function tabulate(runs: RunResult[]): string {
  const cells = new Map<string, RunResult[]>();
  for (const r of runs) { const k = r.party + ' · ' + r.route; if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(r); }
  const out: string[] = [];
  // the headline: one line a cell
  out.push('| Cell | Runs | Ends (stage.depth): median, mean ± sd | Cleared stage 1 | 2 | 3 | 4 | Lost / stalled / capped | Rounds a fight (plain, Elite, Boss) |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [k, rs] of cells) {
    const e = rs.map(endAt), f = rs.flatMap((r) => r.fights), rk = (kind: string[]) => r1(mean(f.filter((q) => kind.includes(q.kind)).map((q) => q.rounds)));
    out.push('| ' + k + ' | ' + rs.length + ' | ' + r1(med(e)) + ', ' + r1(mean(e)) + ' ± ' + r1(sd(e)) + ' | ' + [1, 2, 3, 4].map((s) => pct(rs.filter((r) => r.cleared >= s).length, rs.length)).join(' | ')
      + ' | ' + rs.filter((r) => r.how === 'lost').length + ' / ' + rs.filter((r) => r.how === 'stalled').length + ' / ' + rs.filter((r) => r.how === 'cap').length
      + ' | ' + rk(['fight']) + ', ' + rk(['elite', 'gate', 'vault_guard']) + ', ' + rk(['boss']) + ' |');
  }
  for (const [k, rs] of cells) {
    out.push('', '### ' + k + ' (' + rs.length + ' runs)');
    out.push('Ends: ' + rs.map((r) => r.how[0].toUpperCase() + ' ' + r.stage + '.' + r.depth).join(', '));
    const errs = rs.flatMap((r) => r.errors.map((e) => r.seed + ': ' + e.slice(0, 160))); if (errs.length) out.push('Errors (' + errs.length + '): ' + errs.slice(0, 3).join(' || '));
    out.push('| Stage | Reached | Boss won | Fights (won) | Rounds: plain, Elite, Boss | HP before a fight (mean, min) | Rounds carried, min | Dry / broken / capped | Earned (of it: instead of a pick, sales) / spent, a character | XP, level at the Boss | Grade at the Boss | Steps | Rests, shops, Forges | Vault taken (pick) | Wear before a fight: lowest, fights with a gun Worn or Broken | Repairs, credits a character |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (let s = 1; s <= 7; s++) {
      const reached = rs.filter((r) => r.stages.some((x) => x.stage === s)); if (!reached.length) break;
      const fs = reached.flatMap((r) => r.fights.filter((q) => q.stage === s)), boss = fs.filter((q) => q.kind === 'boss');
      const sts = reached.map((r) => r.stages.find((x) => x.stage === s)!), done = sts.filter((x) => x.cleared);
      const rk = (kind: string[]) => r1(mean(fs.filter((q) => kind.includes(q.kind)).map((q) => q.rounds)));
      const ammo = fs.flatMap((q) => q.ammo.filter((a) => a != null) as number[]);
      const per = (f: (x: any) => number[]) => r0(mean(sts.flatMap(f)));
      out.push('| ' + s + ' | ' + reached.length + ' | ' + pct(boss.filter((q) => q.won).length, boss.length) + ' | ' + fs.length + ' (' + fs.filter((q) => q.won).length + ') | ' + rk(['fight']) + ', ' + rk(['elite', 'gate', 'vault_guard']) + ', ' + rk(['boss'])
        + ' | ' + r0(100 * mean(fs.map((q) => q.hpBefore))) + '%, ' + r0(100 * Math.min(...fs.map((q) => q.hpBefore))) + '% | ' + (ammo.length ? Math.min(...ammo) : '-') + ' | ' + fs.reduce((t, q) => t + q.dry, 0) + ' / ' + fs.reduce((t, q) => t + (q.broken || 0), 0) + ' / ' + fs.filter((q) => q.capped).length
        + ' | ' + per((x) => x.earned) + ' (' + per((x) => x.instead || []) + ', ' + per((x) => x.sold || []) + ') / ' + per((x) => x.spent) + ' | ' + (done.length ? r0(mean(done.flatMap((x) => x.xp))) + ', ' + r1(mean(done.flatMap((x) => x.level))) : '-')
        + ' | ' + (done.length ? Object.entries(done.flatMap((x) => x.grades).reduce((m: any, gr: string) => ((m[gr] = (m[gr] || 0) + 1), m), {})).map(([g, n]) => g + ' ' + n).join(', ') : '-')
        + ' | ' + r1(mean(sts.flatMap((x) => x.steps))) + ' | ' + r1(mean(sts.map((x) => x.rests))) + ', ' + r1(mean(sts.map((x) => x.shops))) + ', ' + r1(mean(sts.map((x) => x.forges)))
        + ' | ' + sts.filter((x) => x.vault === 'taken').length + '/' + sts.filter((x) => x.vault !== 'none').length + (sts.some((x) => x.vaultPick) ? ' (' + sts.filter((x) => x.vaultPick).map((x) => x.vaultPick).join('; ') + ')' : '') + ' | '
        + (fs.some((q) => q.durMin != null) ? r0(100 * Math.min(...fs.filter((q) => q.durMin != null).map((q) => q.durMin!))) + '%, ' + fs.filter((q) => (q.wornBefore || 0) > 0).length : '-')
        + ' | ' + (sts.some((x) => x.repairs) ? r1(mean(sts.flatMap((x) => x.repairs || []))) + ', ' + r0(mean(sts.flatMap((x) => x.repairSpent || []))) : '-') + ' |');
    }
    // rules 1.54: the level on arriving at each stage's Boss (the fight's own record of the levels before it)
    const door = [1, 2, 3, 4, 5, 6, 7].map((s) => rs.flatMap((r) => r.fights.filter((q) => q.stage === s && q.kind === 'boss' && q.lvl).flatMap((q) => q.lvl!))).map((xs, i) => (xs.length ? (i + 1) + ': ' + r1(mean(xs)) : '')).filter(Boolean);
    if (door.length) out.push('Level arriving at the Boss, by stage: ' + door.join(', '));
    // where the losses fell
    const lost = rs.filter((r) => r.how === 'lost' || r.how === 'stalled').map((r) => { const f = r.fights[r.fights.length - 1]; return r.stage + '.' + r.depth + ' ' + (f ? f.kind : '?'); });
    if (lost.length) out.push('Fell at: ' + lost.join(', '));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------- P2: the baseline
const MATS_ = ['gunpowder', 'casing', 'mana_residue'];
/** The Balance 2.0 / 0.29 baseline tables (docs/design/proposals/2026-11-baseline-0.29.md): read by survival-run.test.ts
 * with SIM_BASELINE=1. One table a question; a share's base is the runs (or the characters) that reached the place it is
 * about. */
export function baseline(runs: RunResult[]): string {
  const cells = new Map<string, RunResult[]>();
  for (const r of runs) { const k = r.party + ' · ' + r.route; if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(r); }
  const out: string[] = [], dash = (n: number) => '| ' + Array(n).fill('---').join(' | ') + ' |';
  const lvlAt = (r: RunResult, stage: number, depth: number) => (r.stops || []).find((s) => s.stage === stage && s.depth === depth)?.lvl;
  const share = (xs: boolean[]) => (xs.length ? r0((100 * xs.filter(Boolean).length) / xs.length) + '% (' + xs.filter(Boolean).length + '/' + xs.length + ')' : '-');
  const dist = (xs: number[]) => { const m: Record<string, number> = {}; for (const x of xs) m[x] = (m[x] || 0) + 1; return Object.keys(m).sort().map((k) => 'L' + k + ' ' + r0((100 * m[k]) / xs.length) + '%').join(', ') || '-'; };
  // 1. levels
  out.push('### Levels in stage 1 (entering the stop; every character of the party counted)', '', '| Cell | Runs | Level at stop 4 | Level at stop 8 | Level at the Boss | Level 2 or more after stop 5 | Level 3 at the Boss |', dash(7));
  for (const [k, rs] of cells) {
    const at = (d: number) => rs.flatMap((r) => lvlAt(r, 1, d) || []);
    const after5 = rs.flatMap((r) => { const s = (r.stops || []).find((q) => q.stage === 1 && q.depth >= 6); return s ? s.lvl : []; });
    out.push('| ' + k + ' | ' + rs.length + ' | ' + dist(at(4)) + ' | ' + dist(at(8)) + ' | ' + dist(at(15)) + ' | ' + share(after5.map((l) => l >= 2)) + ' | ' + share(at(15).map((l) => l >= 3)) + ' |');
  }
  // 2. clear rates and losses
  out.push('', '### Stage-1 clear rate, and where the runs fell', '', '| Cell | Runs | Cleared stage 1 | Cleared 2 | Fell in stage 1 at (stop: runs) | First fight lost | First-fight losses by template | All losses by template |', dash(8));
  for (const [k, rs] of cells) {
    const fell = rs.filter((r) => r.cleared < 1 && r.how !== 'cap').map((r) => r.depth), fm: Record<string, number> = {}; for (const d of fell) fm[d] = (fm[d] || 0) + 1;
    const tm = (xs: RunResult[], f: (r: RunResult) => any) => { const m: Record<string, number> = {}; for (const r of xs) { const t = f(r)?.template || '?'; m[t] = (m[t] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([t, n]) => t + ' ' + n).join(', ') || '-'; };
    const first = rs.filter((r) => r.fights[0] && !r.fights[0].won), lost = rs.filter((r) => r.how === 'lost');
    out.push('| ' + k + ' | ' + rs.length + ' | ' + share(rs.map((r) => r.cleared >= 1)) + ' | ' + share(rs.map((r) => r.cleared >= 2)) + ' | ' + (Object.entries(fm).sort((a, b) => +a[0] - +b[0]).map(([d, n]) => d + ': ' + n).join(', ') || '-') + ' | ' + share(rs.map((r) => !!r.fights[0] && !r.fights[0].won)) + ' | ' + tm(first, (r) => r.fights[0]) + ' | ' + tm(lost, (r) => r.fights[r.fights.length - 1]) + ' |');
  }
  // 3. HP entering each stop, stage 1
  out.push('', '### HP entering each stop of stage 1 (the squad mean share of max HP: mean, lowest; share of entries under 30%)', '', '| Cell | ' + Array.from({ length: 15 }, (_, i) => 'Stop ' + (i + 1)).join(' | ') + ' |', dash(16));
  for (const [k, rs] of cells) {
    const row = Array.from({ length: 15 }, (_, i) => { const xs = rs.flatMap((r) => (r.stops || []).filter((s) => s.stage === 1 && s.depth === i + 1).map((s) => s.hp)); return xs.length ? r0(100 * mean(xs)) + ', ' + r0(100 * Math.min(...xs)) + '; ' + r0((100 * xs.filter((x) => x < 0.3).length) / xs.length) + '%' : '-'; });
    out.push('| ' + k + ' | ' + row.join(' | ') + ' |');
  }
  // 4. rounds entering each stop
  out.push('', '### Rounds in hand entering each stop of stage 1 (each character with a gun in hand: mean, lowest; entries at 0)', '', '| Cell | ' + Array.from({ length: 15 }, (_, i) => 'Stop ' + (i + 1)).join(' | ') + ' | Fights entered with a gun empty (all stages) |', dash(17));
  for (const [k, rs] of cells) {
    const row = Array.from({ length: 15 }, (_, i) => { const xs = rs.flatMap((r) => (r.stops || []).filter((s) => s.stage === 1 && s.depth === i + 1).flatMap((s) => s.rounds.filter((q) => q != null) as number[])); return xs.length ? r0(mean(xs)) + ', ' + Math.min(...xs) + (xs.some((x) => x === 0) ? '; ' + xs.filter((x) => x === 0).length + ' dry' : '') : '-'; });
    if (row.every((x) => x === '-')) continue;
    const fs = rs.flatMap((r) => r.fights), dry = fs.filter((f) => f.ammo.some((a) => a === 0)).length;
    out.push('| ' + k + ' | ' + row.join(' | ') + ' | ' + dry + ' of ' + fs.length + ' |');
  }
  // 5. credits and materials a stage, a character
  out.push('', '### Credits and materials a stage, a character (mean over the characters of the runs that reached the stage)', '', '| Cell | Stage | Runs | Earned | Spent | Spent on (the six largest) | Got: gunpowder, casings, residue | Made | Sold: gunpowder, casings, residue | Ammo makers bought | Field: pickups, magazines back (a run) |', dash(11));
  for (const [k, rs] of cells) for (let s = 1; s <= 3; s++) {
    const sts = rs.flatMap((r) => r.stages.filter((x) => x.stage === s)); if (!sts.length) continue;
    const chars = sts.reduce((t, x) => t + x.earned.length, 0) || 1;
    const sum = (f: (x: any) => Record<string, number>[]) => { const m: Record<string, number> = {}; for (const x of sts) for (const o of f(x) || []) for (const [a, b] of Object.entries(o)) m[a] = (m[a] || 0) + (b as number); return m; };
    const per = (m: Record<string, number>, keys: string[]) => keys.map((q) => r0((m[q] || 0) / chars)).join(', ');
    const spentOn: Record<string, number> = {}; for (const x of sts) for (const [a, b] of Object.entries(x.spentOn || {})) spentOn[a] = (spentOn[a] || 0) + (b as number);
    const made = sum((x) => x.made), madeTxt = Object.entries(made).filter(([q]) => !/ used$/.test(q)).map(([q, v]) => q.replace(/^rounds:/, '') + ' ' + r0(v / chars)).join(', ') || '-';
    out.push('| ' + k + ' | ' + s + ' | ' + sts.length + ' | ' + r0(sts.reduce((t, x) => t + x.earned.reduce((a, b) => a + b, 0), 0) / chars) + ' | ' + r0(sts.reduce((t, x) => t + x.spent.reduce((a, b) => a + b, 0), 0) / chars)
      + ' | ' + (Object.entries(spentOn).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([q, v]) => q.replace(/^run\//, '') + ' ' + r0(v / chars)).join(', ') || '-') + ' | ' + per(sum((x) => x.got), MATS_) + ' | ' + madeTxt + ' | ' + per(sum((x) => x.soldMat), MATS_)
      + ' | ' + sts.reduce((t, x) => t + (x.makers || 0), 0) + ' | ' + r1(sts.reduce((t, x) => t + (x.pickups || 0), 0) / sts.length) + ', ' + r1(sts.reduce((t, x) => t + (x.fieldMags || 0), 0) / sts.length) + ' |');
  }
  // 6. damage dealt against removed (overkill)
  out.push('', '### Damage dealt (the effects stream, uncapped) against HP removed, every fight', '', '| Cell | Fights | Dealt a fight | Removed a fight | Overkill share |', dash(5));
  for (const [k, rs] of cells) { const fs = rs.flatMap((r) => r.fights).filter((f) => f.dealt != null), d = fs.reduce((t, f) => t + (f.dealt || 0), 0), rm = fs.reduce((t, f) => t + Math.min(f.dealt || 0, f.removed || 0), 0);
    out.push('| ' + k + ' | ' + fs.length + ' | ' + r0(d / Math.max(1, fs.length)) + ' | ' + r0(rm / Math.max(1, fs.length)) + ' | ' + pct(d - rm, d) + ' |'); }
  // 7. the camp, and fights in hand
  out.push('', '### Leaving camp, a character: credits left, rounds, cores, armour; what a won stage-1 fight used; fights in hand', '', '| Cell | Credits left | Rounds for the gun in hand | Standard cores carried | Armour class | Rounds used a won stage-1 fight | Cores the focus burnt a won stage-1 fight (before the supply pack) | Fights in hand (camp / used) |', dash(8));
  for (const [k, rs] of cells) {
    const camp = rs.map((r) => r.camp).filter(Boolean) as any[], f1 = rs.flatMap((r) => r.fights.filter((f) => f.stage === 1 && f.won));
    const used = f1.flatMap((f) => f.ammo.map((a, i) => (a != null && f.ammoAfter?.[i] != null ? a - (f.ammoAfter![i] as number) : null)).filter((q) => q != null) as number[]);
    const cu = f1.flatMap((f) => (f.burnt || []).filter((q) => q != null) as number[]);
    const cr = mean(camp.flatMap((c) => c.credits)), rd = camp.flatMap((c) => c.rounds.filter((q: any) => q != null)), co = mean(camp.flatMap((c) => c.cores)), ar = mean(camp.flatMap((c) => c.armour));
    const fih = [rd.length && mean(used) > 0 ? r1(mean(rd) / mean(used)) + ' (rounds)' : '', co > 0 && mean(cu) > 0 ? r1(co / mean(cu)) + ' (cores)' : co > 0 ? 'cores: none used' : ''].filter(Boolean).join('; ') || '-';
    out.push('| ' + k + ' | ' + r0(cr) + ' | ' + (rd.length ? r0(mean(rd)) : '-') + ' | ' + r1(co) + ' | ' + r1(ar) + ' | ' + (used.length ? r1(mean(used)) : '-') + ' | ' + (cu.length ? r1(mean(cu)) : '-') + ' | ' + fih + ' |');
  }
  return out.join('\n');
}
