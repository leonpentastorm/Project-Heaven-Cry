// REPORT A RUN (survival-spec rule 35, section 8.2; rules 1.47, build step 6): the run summary's export, built on the
// Report a problem bundle (report.tsx): one file the player saves and pastes, with the run's seed and mode, the stage log,
// each fight's tally, each character's build, gear and boons, and the game version. Nothing is sent from here and no key
// is in it (the same scrub). The builder is pure (`runReport`); the button's download is `downloadRunReport`.
import { type GameState, type Character, type FightTally, playOf, MODES, SETTING, relicRow, sumTallies, CLASS, maxHp } from '@engine';
import { GAME_VERSION } from '../version';

/** The report's shape: `format` and `version` first so a reader knows what it holds. */
export interface RunReport {
  format: 'phc-run-report'; version: 1; gameVersion: string; at: string; mode: string; seed: string;
  outcome: { how: string; stage: number; cleared: number; nodes: number; renown: number; words: string } | null;
  path: string[]; stages: Record<string, unknown>[]; fights: Record<string, unknown>[]; tally: FightTally; characters: Record<string, unknown>[];
}
const name = (id: string) => relicRow(id)?.name || id;
/** One character's build as the run leaves it: level, class, points, perks, gear, boons. Held as data; the words are the game's. */
function buildOf(c: Character, levelAtEnd?: number): Record<string, unknown> {
  return { id: c.id, name: c.name, level: levelAtEnd ?? c.level, xp: c.xp, class: c.classId ? ((CLASS as any)[c.classId]?.name || c.classId) : null, classId: c.classId, origin: c.origin, archetype: c.archetype ?? null,
    attrs: c.attrs, skills: Object.fromEntries(Object.entries(c.skills).filter(([, v]) => v > 0)), traits: c.traits, perks: c.perks.map((p) => p.id + ' (' + p.tier + ')'), maxHp: maxHp(c), credits: c.credits || 0,
    gear: { weapon: c.weapon, weaponState: c.weaponState || null, offHand: c.offHand || null, worn: c.worn || {}, pack: (c.pack || []).map((p: any) => ({ id: p.id, ...(p.rarity ? { rarity: p.rarity } : {}), ...(p.prop ? { prop: p.prop } : {}) })) },
    boons: (c.relics || []).map((id) => ({ id, name: name(id) })), dead: !!c.dead };
}
/** The run as a report object (pure). `at`: the time it was made (an ISO string). Null when no run is on the room. */
export function runReport(g: GameState, o: { gameVersion?: string; at?: string } = {}): RunReport | null {
  const r = g.run; if (!r) return null;
  const e = r.end, fights = r.stats.fights, mode = MODES.find((m) => m.id === playOf(g));
  return {
    format: 'phc-run-report', version: 1, gameVersion: o.gameVersion ?? GAME_VERSION, at: o.at ?? new Date().toISOString(), mode: mode?.name || playOf(g), seed: r.seed,
    outcome: e ? { how: e.how, stage: e.stage, cleared: e.cleared, nodes: e.nodes, renown: e.renown || 0, words: e.how === 'lost' ? 'The squad fell at stage ' + e.stage + ' after ' + e.nodes + ' nodes.' : 'The squad retired after stage ' + e.stage + ', ' + e.nodes + ' nodes walked.' } : null,
    path: r.path,
    stages: (r.stages || []).map((s) => ({ ...s, tile: SETTING[s.setting]?.name || s.setting, boons: Object.fromEntries(Object.entries(s.boons).map(([cid, id]) => [cid, name(id)])) })),
    fights: fights.map((f) => ({ node: f.node, stage: f.stage, depth: f.depth, kind: f.kind, setting: f.setting, template: f.template, level: f.level, budgetAsked: f.target, budgetSpent: f.spent, scaleHp: f.scaleHp, foes: f.foes, outcome: f.outcome ?? null, rounds: f.rounds ?? null, kills: f.kills ?? null, tally: f.tally ?? null })),
    tally: sumTallies(fights.map((f) => f.tally)),
    characters: Object.values(g.characters).map((c) => buildOf(c, e?.levels[c.id])),
  };
}
/** The report as the text of the file. */
export const runReportText = (g: GameState, o: { gameVersion?: string; at?: string } = {}): string | null => { const x = runReport(g, o); return x ? JSON.stringify(x, null, 1) : null; };
/** The file's name: the seed and the stamp. */
export const runReportName = (seed: string, at = new Date()) => 'phc-run-' + seed + '-' + at.toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';

/** Save the report as a file in the player's downloads (plain JSON, so it can also be pasted). Returns the text. */
export function downloadRunReport(g: GameState, scrub: (s: string) => string, toast: (m: string, ok?: boolean) => void): string | null {
  const text = runReportText(g); if (!text || !g.run) return null;
  const body = scrub(text);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = runReportName(g.run.seed); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Run report saved to your downloads. Paste it or send the file to Leon.', true);
  return body;
}
