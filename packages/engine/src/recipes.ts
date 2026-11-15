// MAKING (rules 1.54 items 5 to 7; docs/design/survival-spec.md section 14.2 item 2, 14.3; Core Rules items 4108 to 4110).
//
// One converter for every recipe of `data/recipes.json`, through one reducer action, `gear/make {charId, recipe, times}`
// (game.ts; the Proving Ground takes it as it takes gear/load). The shape is give.ts's: `makeProblem` the refusal in
// words, `makeNow` the doing, `makeView` the list a screen draws. A row takes its `needs` x times out of the pack
// (`packTake`) and puts its `gives` x times in (`grantGoods` with the counter's `lineGoods`). It is free (no AP, no credits)
// and only where the row says (`between_fights`: never in a fight, never for a character at 0 HP). A tool that is an item
// must be carried (the hold test, slot person); `{focus: "any"}` is any focus in a hand (the hold test's door `any`). No
// recipe has code of its own and no item id is named here.
import './datatext';
import recipesJ from '../../../data/recipes.json';
import { ITEM, WEAPON } from './data';
import { type Character, type PackItem, packOf, holds } from './character';
import { packTake, grantGoods, itemLabel, calName } from './containers';
import { lineGoods } from './run/shop';
import type { GameState } from './game';

/** One line of a recipe: an id (an item, or `rounds:<calibre>` among the gives) and how many a making takes or gives. */
export interface RecipeLine { item: string; n: number }
/** A recipe (`data/recipes.json` items): what it needs, the tool, what it gives, where it is made, the words after the
 * tool in its refusal (`does`). */
export interface Recipe { id: string; name: string; needs: RecipeLine[]; tool: { item?: string; focus?: 'any' }; does: string; gives: RecipeLine[]; where: 'between_fights'; text?: string }
/** Every recipe, in the data's order. */
export const RECIPES: Recipe[] = (recipesJ as any).items;
const recipeOf = (id: string) => RECIPES.find((r) => r.id === id);
/** gear/make (rules 1.54 item 5): make `times` of a recipe for a character. */
export interface MakeAction { type: 'gear/make'; charId: string; recipe: string; times?: number }

/** A line's thing in words, for `n` of it: "20 gunpowder", "12 casings", "2 × .32 Decrkm" (an item's `plural` when it
 * has one; rounds by their calibre's name). */
function countWords(id: string, n: number): string {
  const r = /^rounds:(.+)$/.exec(id); if (r) return n + ' × ' + calName(r[1]);
  const it: any = ITEM[id] || WEAPON[id], name = String((n === 1 ? it?.name : it?.plural || it?.name) || id);
  return n + ' ' + name.charAt(0).toLowerCase() + name.slice(1);
}
const nameOfId = (id: string): string => { const r = /^rounds:(.+)$/.exec(id); return r ? calName(r[1]) : String((ITEM[id] as any)?.name || (WEAPON[id] as any)?.name || id); };
/** How many of a need's id the character carries (packTake counting). */
const hasOf = (c: Character, id: string) => packTake(packOf(c).map((x) => ({ ...x })), id, 0);
const timesOf = (t: unknown) => Math.round(Number(t ?? 1));
/** Does the character have the recipe's tool (an item carried, or any focus in a hand)? */
const hasTool = (c: Character, r: Recipe) => (r.tool.focus ? holds(c, { slot: 'hand', door: r.tool.focus }) : !!r.tool.item && holds(c, { slot: 'person', item: r.tool.item }));
/** The words of a missing tool: "Kade needs an ammo maker to make rounds.", "Ha needs a focus in hand to press a core." */
function toolWords(c: Character, r: Recipe): string {
  const thing = r.tool.focus ? 'a focus in hand' : (() => { const n = nameOfId(r.tool.item || '').toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; })();
  return c.name + ' needs ' + thing + ' ' + r.does + '.';
}
/** A fight is on (making is between fights only; the sheet hides the Make group then). */
const inFight = (g: GameState) => g.phase === 'combat' && !!g.combat && !g.combat.over;
/** Why the character can't make this now (not counting what it carries), in words, or null. */
function stateProblem(g: GameState, c: Character): string | null {
  if (inFight(g)) return c.name + ' can\'t make anything in a fight.';
  if (c.dead || c.hp <= 0) return c.name + ' is down and can\'t make anything.';
  return null;
}
/** Why `by` can't make this (rules 1.54 item 5), in words naming the character, or null. */
export function makeProblem(g: GameState, by: string, a: MakeAction): string | null {
  const c = g.characters[a.charId]; if (!c) return 'No such character.';
  if (c.owner !== by) return 'Only ' + c.name + '\'s player makes things for ' + c.name + '.';
  const r = recipeOf(a.recipe); if (!r) return 'There is no such recipe.';
  const t = timesOf(a.times); if (!(t >= 1)) return 'Make it 1 time or more.';
  const no = stateProblem(g, c); if (no) return no;
  if (!hasTool(c, r)) return toolWords(c, r);
  for (const l of r.needs) { const want = l.n * t, have = hasOf(c, l.item); if (have < want) return c.name + ' needs ' + countWords(l.item, want) + ' for that and has ' + have + '.'; }
  return null;
}
/** Make it (rules 1.54 item 5): the needs x times out of the pack, the gives x times into it. The log line, or the
 * refusal in words (nothing changes). */
export function makeNow(g: GameState, by: string, a: MakeAction): { ok: string } | { no: string } {
  const no = makeProblem(g, by, a); if (no) return { no };
  const c = g.characters[a.charId], r = recipeOf(a.recipe)!, t = timesOf(a.times), pack = packOf(c).map((x) => ({ ...x }));
  for (const l of r.needs) packTake(pack, l.item, l.n * t);
  const got: PackItem[] = r.gives.flatMap((l) => lineGoods(l.item, l.n * t));
  grantGoods(c, pack, got);
  c.pack = pack;
  return { ok: c.name + ' makes ' + got.map((it) => itemLabel(it)).join(' and ') + ' from ' + r.needs.map((l) => countWords(l.item, l.n * t)).join(' and ') + '.' };
}

// ------------------------------------------------------------------------------------------------- the make list
/** One recipe as the sheet's Make group draws it (rules 1.54, survival-spec 14.7): what it needs (with what the
 * character has), what it gives, how many times it can be made now (`most`), and the engine's reason when it can't
 * (null: it can). The client sends `action` with `times` (1 to `most`). */
export interface MakeRowV { recipe: string; name: string; needs: { item: string; name: string; n: number; have: number }[]; gives: { item: string; name: string; n: number }[];
  tool: { label: string; held: boolean }; most: number; why: string | null; action: MakeAction }
/** The Make group for one character: shown when it carries a recipe's tool and no fight is on (null: nobody to make
 * for, or at the camp, where the GEAR tab is read-only). */
export interface MakeViewV { charId: string; name: string; shown: boolean; rows: MakeRowV[] }
/** The Make group's view (rules 1.54) for player `me`'s character (or `charId`). */
export function makeView(g: GameState, me: string, charId?: string | null): MakeViewV | null {
  const c = (charId && g.characters[charId]) || Object.values(g.characters).find((x) => x.owner === me) || null;
  if (!c || g.run?.state === 'loadout') return null;
  const rows: MakeRowV[] = RECIPES.map((r) => {
    const action: MakeAction = { type: 'gear/make', charId: c.id, recipe: r.id, times: 1 };
    const needs = r.needs.map((l) => ({ item: l.item, name: nameOfId(l.item), n: l.n, have: hasOf(c, l.item) }));
    const held = hasTool(c, r), ok = !stateProblem(g, c) && held && c.owner === me;
    const most = ok ? Math.min(...needs.map((l) => Math.floor(l.have / l.n))) : 0;
    return { recipe: r.id, name: r.name, needs, gives: r.gives.map((l) => ({ item: l.item, name: nameOfId(l.item), n: l.n })),
      tool: { label: r.tool.focus ? 'Any focus in hand' : nameOfId(r.tool.item || ''), held }, most, why: makeProblem(g, me, action), action };
  });
  return { charId: c.id, name: c.name, shown: !inFight(g) && rows.some((x) => x.tool.held), rows };
}
