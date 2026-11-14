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
    out.push('| Stage | Reached | Boss won | Fights (won) | Rounds: plain, Elite, Boss | HP before a fight (mean, min) | Rounds carried, min | Dry / broken / capped | Earned (of it: instead of a pick, sales) / spent, a character | XP, level at the Boss | Grade at the Boss | Steps | Rests, shops, Forges | Vault taken (pick) |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
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
        + ' | ' + sts.filter((x) => x.vault === 'taken').length + '/' + sts.filter((x) => x.vault !== 'none').length + (sts.some((x) => x.vaultPick) ? ' (' + sts.filter((x) => x.vaultPick).map((x) => x.vaultPick).join('; ') + ')' : '') + ' |');
    }
    // where the losses fell
    const lost = rs.filter((r) => r.how === 'lost' || r.how === 'stalled').map((r) => { const f = r.fights[r.fights.length - 1]; return r.stage + '.' + r.depth + ' ' + (f ? f.kind : '?'); });
    if (lost.length) out.push('Fell at: ' + lost.join(', '));
  }
  return out.join('\n');
}
