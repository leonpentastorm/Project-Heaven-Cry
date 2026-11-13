// The fight tally as table rows (survival-spec 8.2; rules 1.47, build step 6): what each character did in a fight, a
// stage and a run, read from the engine's tally (`g.run.stats.fights[i].tally`, packages/engine/src/run/tally.ts) and
// added up with the engine's `sumTallies`. Nothing is counted here. RunTally.tsx draws it.
import { type GameState, type FightTally, sumTallies } from '@engine';

export interface TallyRowV { id: string; name: string; dealt: number; taken: number; healed: number; absorbed: number; kills: number; downs: number; shots: number; hits: number; /** "7 of 19", or "none" */ aim: string }
export interface TallyV { scope: 'fight' | 'stage' | 'run'; caption: string; rounds: number; rows: TallyRowV[]; other: { dealt: number; healed: number } }
/** The columns, in order: the heading and the row's field. */
export const TALLY_COLS: { head: string; key: 'dealt' | 'taken' | 'healed' | 'absorbed' | 'kills' | 'downs'; tip: string }[] = [
  { head: 'Dealt', key: 'dealt', tip: 'Damage dealt to foes' }, { head: 'Taken', key: 'taken', tip: 'Damage taken' }, { head: 'Healed', key: 'healed', tip: 'HP of healing given to the squad' },
  { head: 'Soaked', key: 'absorbed', tip: 'Damage the character\'s shield soaked' }, { head: 'Kills', key: 'kills', tip: 'Foes dropped' }, { head: 'Downs', key: 'downs', tip: 'Times the character went down' },
];
/** A tally as table rows, in the squad's order. */
export function tallyView(t: FightTally, scope: TallyV['scope'], caption: string): TallyV {
  return { scope, caption, rounds: t.rounds, other: t.other,
    rows: Object.entries(t.chars).map(([id, r]) => ({ id, name: r.name, dealt: r.dealt, taken: r.taken, healed: r.healed, absorbed: r.absorbed, kills: r.kills, downs: r.downs + r.deaths, shots: r.shots, hits: r.hits, aim: r.shots ? r.hits + ' of ' + r.shots : 'none' })) };
}
/** The last fight's tally (the reward screen): null while there is none or a fight is on. */
export function lastFightTally(g: GameState): TallyV | null {
  const r = g.run; if (!r || r.state !== 'reward') return null;
  const f = r.stats.fights[r.stats.fights.length - 1]; if (!f?.tally) return null;
  return tallyView(f.tally, 'fight', 'THE FIGHT · ' + f.rounds + (f.rounds === 1 ? ' ROUND' : ' ROUNDS'));
}
/** Every stage's tally, then the run's (the summary). */
export function summaryTallies(g: GameState): TallyV[] {
  const r = g.run; if (!r) return [];
  const fights = r.stats.fights.filter((f) => f.tally), stages = [...new Set(fights.map((f) => f.stage))].sort((a, b) => a - b);
  const run = sumTallies(fights.map((f) => f.tally)), out: TallyV[] = [tallyView(run, 'run', 'THE WHOLE RUN · ' + fights.length + (fights.length === 1 ? ' FIGHT' : ' FIGHTS'))];
  for (const s of stages) { const fs = fights.filter((f) => f.stage === s); out.push(tallyView(sumTallies(fs.map((f) => f.tally)), 'stage', 'STAGE ' + s + ' · ' + fs.length + (fs.length === 1 ? ' FIGHT' : ' FIGHTS'))); }
  return out;
}
