// STAGES, BOONS AND THE WORLD (rules 1.44; docs/design/survival-spec.md rules 3, 4, 6, 19, 30 to 32, 35; Survival build
// step 5). After a Boss every character picks one boon of three (a `relic` item from data/survival.json `boons`, carried
// in `c.relics` and run by the item-op runner like any other relic), then the squad picks the next tile of the world
// (a setting not yet played where possible) and walks a fresh 15-node map from the run's seed, one stage harder (the
// stage term is read where each number is used: run/encounter.ts budgetFor and foeLevel, run/rewards.ts nodeXp,
// nodeCredits and stageCeiling). Pure: what is offered and what a stage's log holds; the reducer (game.ts `run/*`)
// changes the state. Every pick comes from a named stream of the run's seed (rule 12), never the fight's dice.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { type Character, xpForLevel, holds, isGunId, inHands, FOCUS_DOOR } from '../character';
import { SKILL, WEAPON } from '../data';
import { rngFor, die, type Rng } from '../rng';
import { SETTING, SETTINGS, type SettingDef } from './encounter';
import { BOONS, BOON_CAP, START_BOONS, capRoom, graftOf, relicRow, worthOf, type RelicRow } from './power';
import { type RunState, type RunTile, type RunStageLog, runSetting } from './state';
import { mapNodes, pathMap, MAP_DATA } from './map';

const SV: any = svJ;
/** The boon pick (survival.json `boon_pick`): how many boons a character is offered after a Boss. */
export const BOON_PICK: { offer: number } = SV.boon_pick;
/** The next tile (survival.json `world`): how many tiles are offered after the boon, and at least how many. */
export const WORLD: { offer: number; min: number } = SV.world;

/** A setting as a tile card shows it (rule 32): its line of flavour, its backdrop's catalog id, what it still waits
 * for (art or its own enemies; the encounter generator plays it with stand-ins by name). */
export interface SettingCard extends SettingDef { line: string; backdrop: string; awaiting: string[] }
/** A setting's card data by id. */
export const settingCard = (id: string): SettingCard | undefined => SETTING[id] as SettingCard | undefined;

/** Is a setting ready to be offered (rule 32, "only settings whose data exists"): a Boss with a weapon, enemy kinds and
 * at least one boon in its pool. */
export const settingReady = (s: SettingDef): boolean => !!s.boss?.weapon && Object.keys(s.kinds || {}).length > 0 && BOONS.some((b) => (b.pools || []).includes(s.pool));
/** The boons of a pool (data order). */
export const poolBoons = (pool: string): RelicRow[] => BOONS.filter((b) => (b.pools || []).includes(pool));

/** Does this character hold this boon already (as a boon, a shrine's token or a graft of it)? No boon twice (rule 31). */
export const holdsBoon = (c: Character, id: string): boolean => (c.relics || []).some((r) => r === id || r === graftOf(id));
/** Does a boon do anything for this character (its `doors`: the door skills it serves, one point in any; none: all)? */
export const boonServes = (c: Character, b: RelicRow & { doors?: string[] }): boolean => (!b.doors || b.doors.some((k) => (c.skills[k] || 0) >= 1)) && boonWorks(c, b);

const draw = <T>(rng: Rng, from: T[], n: number, out: T[] = []): T[] => { const p = [...from]; while (out.length < n && p.length) out.push(p.splice(die(rng, p.length) - 1, 1)[0]); return out; };
/** The boons offered to a character after the Boss of a tile of this pool (rules 30, 31): `BOON_PICK.offer` distinct,
 * rolled from the pool first, then from every boon when the pool runs short; none it holds or that serves none of its
 * doors; one that would pass its cap is replaced by a utility boon (worth 0) it does not hold. From
 * `rngFor(seed, node + '#boon#' + id)`. Fewer when fewer are left. */
export function boonOffer(c: Character, pool: string, seed: string, nodeId: string): string[] {
  const rng = rngFor(seed, nodeId + '#boon#' + c.id), can = (b: RelicRow) => !holdsBoon(c, b.id) && boonServes(c, b as any);
  const own = BOONS.filter((b) => (b.pools || []).includes(pool) && can(b)), rest = BOONS.filter((b) => !(b.pools || []).includes(pool) && can(b));
  const picked = draw(rng, rest, BOON_PICK.offer, draw(rng, own, BOON_PICK.offer));
  const room = capRoom(c), out: string[] = [];
  for (const b of picked) {
    if (b.worth <= room) { out.push(b.id); continue; }
    const util = BOONS.filter((u) => u.worth === 0 && can(u) && !out.includes(u.id) && !picked.some((p) => p.id === u.id));
    if (util.length) out.push(util[die(rng, util.length) - 1].id);
  }
  return out;
}
// ---------------------------------------------------------------------------------------------- the camp (rules 1.51)
/** The starting boon's numbers (survival.json `start_boon`, rules 1.51; spec rules 48 to 50): the offer (`main` from the
 * main line and `second` from the second), the most a starting boon is worth, each alpha skill's line, each focus kind's
 * line, each line's words. */
export const START_BOON: { offer: number; main: number; second: number; max_worth: number; lines: Record<string, string>; focus_lines: Record<string, string>; names: Record<string, string> } = SV.start_boon;
const ORDER = Object.keys(START_BOON.lines); // the alpha skills in the lines' order (the tie-break)
/** A weapon's line: a melee weapon or empty hands (fists) blades; anything else (a gun, a bow, a crossbow) guns. */
const weaponLine = (id: string | null | undefined): string => { const w: any = id ? WEAPON[id] : null; return !w || w.category === 'unarmed' || (!isGunId(id) && (/melee/.test(w.category) || w.phys?.system === 'melee')) ? 'blades' : 'guns'; };
const doorHeld = (c: Character, k: string): boolean => holds(c, { slot: 'hand', door: k }) && (c.skills[FOCUS_DOOR[k as keyof typeof FOCUS_DOOR]] || 0) >= 1;
/** Does this boon do anything for this character as it stands (its `needs`, BoonNeeds; rules 1.51 item 2)? The offer
 * serves only rows that work: a Sigil row needs an Evoker in hand with Brain Power, a gun row a gun in hand, and so on. */
export function boonWorks(c: Character, b: RelicRow): boolean {
  const n = b.needs; if (!n) return true;
  if (n.door && ![n.door].flat().some((k) => doorHeld(c, k))) return false;
  if (n.weapon) {
    const hands = inHands(c);
    const ok = n.weapon === 'gun' ? hands.some((id) => isGunId(id)) : n.weapon === 'melee' ? weaponLine(c.weapon) === 'blades' || hands.slice(1).some((id) => weaponLine(id) === 'blades' && !!WEAPON[id]) : hands.some((id) => !!WEAPON[id] && weaponLine(id) === 'guns');
    if (!ok) return false;
  }
  return Object.entries(n.skill || {}).every(([k, v]) => (c.skills[k] || 0) >= v);
}
/** The alpha skills a character has 1 point or more in, best first: by the attribute's value, then the skill's points,
 * then the lines' order (rule 49 b). */
const alphaOrder = (c: Character): string[] => ORDER.filter((k) => (c.skills[k] || 0) >= 1)
  .sort((a, b) => ((c.attrs as any)[SKILL[b]?.attribute] || 0) - ((c.attrs as any)[SKILL[a]?.attribute] || 0) || (c.skills[b] || 0) - (c.skills[a] || 0) || ORDER.indexOf(a) - ORDER.indexOf(b));
/** A character's two lines (rule 49; rules 1.51 item 2): what it runs on, read from the sheet and the hands (no class at
 * level 1, and the archetype is not saved). `main`: a focus in a hand whose door skill has 1 point or more (its door's
 * line), else the best alpha skill's line, else the main hand's weapon (guns; a melee weapon blades). `second`: the main
 * hand's weapon if it differs, else the next alpha skill's line, else the other weapon line. */
export function lineOf(c: Character): { main: string; second: string } {
  const works = (l: string) => lineBoons(l).some((b) => boonWorks(c, b));
  const held = Object.keys(START_BOON.focus_lines).filter((k) => doorHeld(c, k)).map((k) => START_BOON.focus_lines[k]);
  const alpha = alphaOrder(c).map((k) => START_BOON.lines[k]).filter(works), weapon = weaponLine(c.weapon);
  const main = held[0] || alpha[0] || weapon;
  const second = held.find((l) => l !== main) || (weapon !== main && works(weapon) ? weapon : alpha.find((l) => l !== main) || (weapon !== main ? weapon : weapon === 'guns' ? 'blades' : 'guns'));
  return { main, second };
}
/** The starting boons of a line (data order). */
export const lineBoons = (line: string): RelicRow[] => START_BOONS.filter((b) => b.lines.includes(line));
/** The starting boons offered to a character at the camp (rules 48 to 50): `START_BOON.main` drawn from its main line and
 * `START_BOON.second` from its second, never the same row twice, from `rngFor(seed, 'camp#start#' + id)`; a line with
 * too few rows is filled from the second line, then from every row, so the offer always holds `START_BOON.offer`. */
export function startOffer(c: Character, seed: string): string[] {
  const rng = rngFor(seed, 'camp#start#' + c.id), l = lineOf(c), out: RelicRow[] = [];
  const from = (list: RelicRow[], n: number) => draw(rng, list.filter((b) => !out.includes(b) && b.worth <= START_BOON.max_worth && boonWorks(c, b)), out.length + n, out);
  from(lineBoons(l.main), START_BOON.main);
  from(lineBoons(l.second), START_BOON.offer - out.length);
  from(START_BOONS, START_BOON.offer - out.length);
  return out.map((b) => b.id);
}
/** Is this a starting boon (rules 1.51)? */
export const isStartBoon = (id: string): boolean => START_BOONS.some((b) => b.id === id);
/** Why this character can't take this starting boon now, or null: it is not on its offer, or it took one already. */
export function startBoonProblem(c: Character, offer: string[] | undefined, id: string | undefined): string | null {
  if (!offer || !id || !offer.includes(id)) return 'That boon is not on ' + c.name + '\'s offer.';
  if ((c.relics || []).some(isStartBoon)) return c.name + ' already carries a starting boon.';
  return null;
}

/** Why this character can't take this boon now, or null: it is not on its offer, it holds it, or it passes the cap. */
export function boonProblem(c: Character, offer: string[] | undefined, id: string | undefined): string | null {
  if (!offer || !id || !offer.includes(id)) return 'That boon is not on ' + c.name + '\'s offer.';
  if (holdsBoon(c, id)) return c.name + ' already has ' + (relicRow(id)?.name || id) + '.';
  const w = worthOf(id), room = capRoom(c);
  return w > room ? c.name + ' has ' + room + ' boon room left; ' + (relicRow(id)?.name || id) + ' needs ' + w + '.' : null;
}

/** The tiles the squad may walk after this stage's Boss (rule 32): `WORLD.offer` settings that are ready, those not yet
 * played this run first, then the others but the one under way, then that one (only to reach `WORLD.min`). Pure on the
 * seed and the tiles walked (`rngFor(seed, 'world#' + next stage)`), so it is known the whole stage (the graft reads its
 * pools) and the same on a replay. */
export function nextTiles(r: RunState): RunTile[] {
  const stage = r.stage + 1, rng = rngFor(r.seed, 'world#' + stage), played = new Set(r.world.map((t) => t.setting)), here = runSetting(r);
  const ready = SETTINGS.filter(settingReady), fresh = ready.filter((s) => !played.has(s.id)), old = ready.filter((s) => played.has(s.id) && s.id !== here);
  const ids = draw(rng, old, WORLD.offer, draw(rng, fresh, WORLD.offer)).map((s) => s.id);
  if (ids.length < WORLD.min && SETTING[here] && settingReady(SETTING[here])) ids.push(here);
  return ids.map((setting, i) => ({ id: 't' + stage + '.' + i, setting, stage, links: [], boons: poolBoons(SETTING[setting].pool).map((b) => b.id) }));
}
/** The boon pools of the tiles ahead (rule 32; rule 42's graft reads "the next tile's pool"): each offered tile's pool. */
export const nextPools = (r: RunState): string[] => [...new Set(nextTiles(r).map((t) => SETTING[t.setting]?.pool).filter((p): p is string => !!p))];
/** Why a player can't mark this tile now, or null. */
export function tileProblem(r: RunState | null | undefined, id: string): string | null {
  if (!r) return 'No run is under way.';
  if (r.state !== 'tile') return r.state === 'boon' ? 'Pick your boon first. The next tile comes after.' : 'There is no tile to pick now.';
  return (r.tiles || []).some((t) => t.id === id) ? null : 'No such tile on offer.';
}

/** A fresh stage log (rule 35). */
export const stageLogFor = (stage: number, setting: string): RunStageLog => ({ stage, setting, nodes: 0, fights: 0, won: 0, kills: 0, credits: 0, steps: 0, boons: {} });
/** The log of the stage under way (made for an old run that has none). */
export function stageLog(r: RunState): RunStageLog {
  const l = (r.stages ||= []); let e = l.find((x) => x.stage === r.stage);
  if (!e) { e = stageLogFor(r.stage, runSetting(r)); l.push(e); }
  return e;
}
/** The run on the next stage, on tile `t` (rules 3, 32): its fresh map from the seed (`pathMap(seed, stage)`), the tile
 * added to the world (the old tile linked to every tile offered), the squad at the start, a fresh log. */
export function enterStage(r: RunState, t: RunTile): RunState {
  const world = r.world.map((w, i) => (i === r.world.length - 1 ? { ...w, links: (r.tiles || []).map((x) => x.id) } : w));
  const nodes = mapNodes(pathMap(r.seed, t.stage, MAP_DATA, t.setting));
  return { ...r, stage: t.stage, world: [...world, { ...t }], nodes, at: null, state: 'map', leans: {}, ready: {}, offers: null, boons: null, tiles: null, visit: null, lasting: null, note: null, last: null,
    stages: [...(r.stages || []), stageLogFor(t.stage, t.setting)] };
}
/** The run's renown (rule 6): the XP its characters took past level 20, which counts only to the score. */
export const renownOf = (chars: Character[]): number => chars.reduce((t, c) => t + Math.max(0, (c.xp || 0) - xpForLevel(20)), 0);
/** Each character's boons (the relics that are boons, grafts and tokens included, and rules 1.51's starting boon), for
 * the score. */
export const boonsOf = (chars: Character[]): Record<string, string[]> => Object.fromEntries(chars.map((c) => [c.id, (c.relics || []).filter((id) => isStartBoon(id) || BOONS.some((b) => b.id === id || graftOf(b.id) === id))]));

/** A character kept as a draft after a run (rule 4, Leon 13 Nov): the whole sheet at the level it reached, with its
 * gear, perks and class, for other rooms; marked `draft` (a run takes level 1 only) and `kept` (where it came from). The
 * run's own things stay behind: its purse, its boons and other relics, its run-only marks. */
export function keptDraft(c: Character, seed: string, stage: number): Record<string, unknown> {
  const x: any = JSON.parse(JSON.stringify(c));
  for (const k of ['id', 'owner', 'credits', 'relics', 'faithTally', 'lvlUndo']) delete x[k];
  // named with its level, so it never replaces the level 1 sheet of the same name in a player's library
  x.dead = false; x.draft = true; x.name = c.name + ' (level ' + c.level + ')'; x.kept = { from: 'survival', seed, stage, level: c.level, name: c.name };
  return x;
}
