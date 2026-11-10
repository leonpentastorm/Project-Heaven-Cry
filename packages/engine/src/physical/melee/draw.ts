// Physical 2.0, melee: drawing a weapon from the pack inside a technique (Draw Cut). The reducer's own gear change
// (game.ts gearInFight) isn't reachable from a handler, so this does the part Draw Cut needs: a melee weapon from the
// pack into the main hand, the hand's melee weapon (if any) into the pack, and the fighter's weapon numbers rebuilt from
// the character. Requests for the lead: export a 0-AP draw from game.ts and use it here instead.
import { equip, packOf, isAmmoEntry, twoHands, type Character } from '../../character';
import { unitFromCharacter, type Unit } from '../../combat';
import { WEAPON } from '../../data';
import { weaponSystem } from '../data';
import type { Tech } from './shared';

/** The fields of a fighter that follow the main-hand weapon (a melee weapon: no magazine to keep in step). */
const MAIN_FIELDS = ['weapon', 'attack', 'dmgMult', 'dur', 'maxDur', 'mods', 'ammo', 'ammoType'] as const;

/** The pack entry Draw Cut would draw: args.item (an index or a weapon id), else the first melee weapon in the pack. */
export function drawable(t: Tech): { idx: number; wid: string } | string {
  const c = t.c; if (!c) return 'Only a character draws from a pack.';
  if (t.hand === 'off') return 'Draw Cut draws into your main hand.';
  const pack = packOf(c), ok = (i: number) => { const it = pack[i]; return !!it && !!it.weapon && !!WEAPON[it.weapon] && !isAmmoEntry(it) && weaponSystem(it.weapon) === 'melee' && it.weapon !== 'fists'; };
  const item = t.args.item;
  let idx = -1;
  if (typeof item === 'number') idx = ok(item) ? item : -1;
  else if (typeof item === 'string' && item !== '') idx = pack.findIndex((it, i) => ok(i) && (it.weapon === item || it.id === item));
  else idx = pack.findIndex((_, i) => ok(i));
  if (idx < 0) return item != null && item !== '' ? 'That isn\'t a melee weapon in your pack.' : 'No melee weapon stowed in your pack to draw.';
  const wid = pack[idx].weapon!;
  if (twoHands(c, wid) && c.offHand) return 'Your off hand is full: the ' + WEAPON[wid].name + ' needs both hands.';
  return { idx, wid };
}
/** The character with the weapon drawn (a copy), or the refusal. */
function drawnCopy(c: Character, u: Unit, idx: number): Character | string {
  const x: Character = JSON.parse(JSON.stringify(c));
  if (x.weapon !== 'fists' && WEAPON[x.weapon] && u.maxDur) x.weaponState = { ...(x.weaponState || {}), dur: u.dur }; // the one put away keeps its wear
  const err = equip(x, idx, 'main'); return err || x;
}
/** Copy the main-hand fields of a fighter built from the character onto the unit (and which focus the hands hold). */
function fit(u: Unit, c: Character) {
  const fresh: any = unitFromCharacter(c, u.pos, { state: 1 }), x = u as any; // a throwaway rng: nothing of the game's is rolled
  for (const k of MAIN_FIELDS) { if (fresh[k] === undefined) delete x[k]; else x[k] = JSON.parse(JSON.stringify(fresh[k])); }
  if (fresh.mg) { if (!u.mg) u.mg = fresh.mg; else { u.mg.evoker = fresh.mg.evoker; u.mg.emanator = fresh.mg.emanator; } }
  else if (u.mg) { u.mg.evoker = false; u.mg.emanator = false; }
}
/** Run fn as if the weapon were drawn (a preview): nothing is left changed. Returns the refusal, or fn's result. */
export function asDrawn<T>(t: Tech, idx: number, fn: () => T): T | string {
  const c = t.c!, x = drawnCopy(c, t.u, idx); if (typeof x === 'string') return x;
  const u = t.u as any, keep: Record<string, any> = {}, had: Record<string, boolean> = {};
  for (const k of MAIN_FIELDS) { had[k] = k in u; keep[k] = u[k]; }
  const mg0 = u.mg, flags = mg0 ? { evoker: mg0.evoker, emanator: mg0.emanator } : null, hadMg = 'mg' in u;
  try { fit(t.u, x); return fn(); }
  finally {
    for (const k of MAIN_FIELDS) { if (had[k]) u[k] = keep[k]; else delete u[k]; }
    if (hadMg) u.mg = mg0; else delete u.mg;
    if (mg0 && flags) { mg0.evoker = flags.evoker; mg0.emanator = flags.emanator; }
  }
}
/** Draw it for real: the character's hands and pack change, and the fighter is refitted. Returns a refusal (nothing
 * changed) or null. */
export function drawInto(t: Tech, idx: number): string | null {
  const c = t.c!, x = drawnCopy(c, t.u, idx); if (typeof x === 'string') return x;
  const was = t.u.weapon;
  c.weapon = x.weapon; c.weaponState = x.weaponState; c.loaded = x.loaded; c.loadedType = x.loadedType; c.offHand = x.offHand; c.pack = x.pack;
  fit(t.u, c);
  t.u.braced = false;
  t.cb.log.push(t.u.name + ' draws the ' + WEAPON[c.weapon].name + (was && was !== 'fists' && WEAPON[was] ? ', putting away the ' + WEAPON[was].name : '') + ' (Draw Cut).');
  return null;
}
