// RUN POWER (rules 1.43; docs/design/survival-spec.md rules 31, 38, 46, section 11.2; Survival build step 4a). One budget
// holds every source of run power a character carries: its boons, a shrine's token, the Crossroads graft (all `relic`
// items in `c.relics`) and the named property of every Relic weapon or focus it carries (`GearState.prop`, character.ts
// gearProps). Each is priced in percent of a rifle-turn (`worth`), and their sum stays under `boon_cap.cap`.
// The relic items themselves (data/survival.json `relic_props`, `boons`, and a graft made of each boon) are loaded at run
// time as `relic` items (effects/collect.ts), so the item-op runner runs them like any other item: nothing here deals,
// heals or rolls.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { addItems } from '../effects/hooks';
import { fmtNumber } from '../datatext';
import { WEAPON } from '../data';
import { type Character, gearProps, FOCUS_IDS } from '../character';
import { die, type Rng } from '../rng';

const SV: any = svJ;
/** One relic row of survival.json (a Relic property, a boon or a graft): an item with its worth. */
export interface RelicRow { id: string; kind: 'relic'; name: string; worth: number; text: string; effects: any[]; fits?: string[]; pools?: string[]; adjudication: string; provisional?: boolean }
/** The run's cap (survival.json boon_cap.cap): the most run power a character carries, in percent of a rifle-turn. */
export const BOON_CAP: number = SV.boon_cap.cap;
/** The Relic properties (survival.json relic_props): a Relic step's choice, a picked Relic's roll. */
export const RELIC_PROPS: RelicRow[] = SV.relic_props;
/** The thirteen boons (survival.json boons, spec section 3.5): the Boss's pick (rules 1.44, run/stage.ts boonOffer), a
 * shrine's token and the graft roll from them. */
export const BOONS: RelicRow[] = SV.boons;
/** The graft's id for a boon (rule 42): `graft.` and the boon's own name after `boon.`. */
export const graftOf = (boonId: string): string => 'graft.' + boonId.replace(/^boon\./, '');
/** The Crossroads grafts (rule 42): each boon with a cut to max HP for the run (the stat `hp` x graft.hp_mult); worth the boon's. */
export const GRAFTS: RelicRow[] = BOONS.map((b) => ({ ...b, id: graftOf(b.id), name: b.name + ' (grafted)',
  effects: [{ op: 'stat_mult', stat: 'hp', value: SV.graft.hp_mult }, ...b.effects],
  text: b.text + ' Grafted: your max HP is ' + fmtNumber(SV.graft.hp_mult, 'less') + '% lower for the run.' }));
addItems('relic', [...RELIC_PROPS, ...BOONS, ...GRAFTS]);
const ROW: Record<string, RelicRow> = Object.fromEntries([...RELIC_PROPS, ...BOONS, ...GRAFTS].map((r) => [r.id, r]));
/** A relic row by id (a property, a boon, a graft), or undefined. */
export const relicRow = (id: string): RelicRow | undefined => ROW[id];
/** What one relic item is worth on the cap (0 for one that is not run power: a campaign's relic). */
export const worthOf = (id: string): number => ROW[id]?.worth ?? 0;
/** A character's run power now: its relics (boons, tokens, a graft) and the property of every Relic it carries. */
export const runWorth = (c: Character): number => [...(c.relics || []), ...gearProps(c)].reduce((t, id) => t + worthOf(id), 0);
/** How much of the cap is left (never below 0). */
export const capRoom = (c: Character): number => Math.max(0, BOON_CAP - runWorth(c));
/** Why `id` can't be added to this character's run power, or null: it would pass the cap (rule 31). */
export function capProblem(c: Character, id: string): string | null {
  const w = worthOf(id), room = capRoom(c);
  return w > room ? (ROW[id]?.name || id) + ' is worth ' + w + ' of the run\'s ' + BOON_CAP + '; ' + c.name + ' has ' + room + ' left.' : null;
}

const isFocus = (id: string) => Object.values(FOCUS_IDS).some((l) => l.includes(id));
const gun = (w: any) => !!w && w.magazine != null && !!w.ammo && w.category !== 'thrown';
const melee = (w: any) => !!w && w.category !== 'unarmed' && (/melee/.test(w.category) || w.phys?.system === 'melee');
/** What a property's `fits` words name (rule 38): guns, guns with a magazine, melee weapons, foci (a mana arm is both). */
const FITS: Record<string, (id: string) => boolean> = {
  guns: (id) => gun(WEAPON[id]), magazine_guns: (id) => gun(WEAPON[id]) && (WEAPON[id] as any).reload === 'magazine',
  melee: (id) => melee(WEAPON[id]), foci: (id) => isFocus(id),
};
/** Does a Relic property fit this weapon or focus (its `fits`)? */
export const propFits = (propId: string, gearId: string): boolean => (ROW[propId]?.fits || []).some((f) => FITS[f]?.(gearId));
/** `n` Relic properties for this weapon or focus, distinct, each fitting it and worth at most `room` (rule 38: a property
 * that would pass the cap is not offered), drawn from the stream; fewer when fewer fit. */
export function rollProps(rng: Rng, gearId: string, room: number, n: number): string[] {
  const pool = RELIC_PROPS.filter((p) => propFits(p.id, gearId) && p.worth <= room).map((p) => p.id), out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(die(rng, pool.length) - 1, 1)[0]);
  return out;
}
/** The boons of a pool (a setting's `pool`), worth at most `max`, that this character does not hold yet and that fit
 * its cap: what a shrine's token and the graft roll from. */
export const boonsFor = (c: Character, pool: string, max = Infinity): RelicRow[] =>
  BOONS.filter((b) => (b.pools || []).includes(pool) && b.worth <= max && !(c.relics || []).some((r) => r === b.id || r === graftOf(b.id)) && b.worth <= capRoom(c));
