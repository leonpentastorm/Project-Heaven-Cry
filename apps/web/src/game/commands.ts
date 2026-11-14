// The combat action list and the turn card's four commands, shared by the combat panel (screens/combat.js), the
// your-turn cut-in (game/turnIntro.tsx) and the dialog that customises it (game/commandsDialog.tsx).
//
// actionGroups() is the one list of actions a unit has (the panel's tabs show it); the cut-in's four commands are a
// smart default picked from the unit's state, which a player can override per character, slot by slot. The choice is a
// personal UI preference kept in this browser (localStorage 'phc.cutinCmds', keyed by character id), never game state.
import { phys, WEAPON, CLASS, ADVANCED, isMelee, attackApCost, SPELL_AP, ventAp, coreAp, stageMult, weaponActions, perkActionsFor, withGame, type PerkActionEntry,
  PILE, reloadBothRows, pullFreeTargets as enginePullFree, actionsFor, type ActionDescriptor, PR as ENGINE_PR, prayId as enginePrayId, parsePrayId, PK as ENGINE_PK, perkId, parsePerkId, perkCost, perkState, perkText } from '@engine';
import { SIGIL_GLOW, SOUL_INK } from './glyphs';
import { FAITH_INK } from './faithView';
import { classIconUri, classCore, CORE_INK } from './classIcons';
import { heldClassId, currentClassId } from './classView';
import { techAction, TWATCH, legacyAttack } from './techView';
import { perkShelves } from './perkShelves';

const HOSTILE_INK = '#F65157';
export const BAND_NAME: Record<string, string> = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
/** [id, label, cost text, explanation, why not now (the engine's reason; undefined: work it out from the cost)] */
/** [id, label, cost, text, why, meta]: meta is the descriptor's hand (the Attack tab's areas) and a technique's text in
 *  parts (the hover card's lines). */
export interface ActionMeta { /** the row's group inside its tab (the descriptor's sub) */ sub?: string; hand?: 'main' | 'off' | 'both'; parts?: { needs: string; text: string; line: string; traits: { label: string; text: string }[] } }
export type ActionItem = [string, string, string, string, (string | null)?, ActionMeta?];
/** [group title, items, family ink (or null), tab id] */
export type ActionGroup = [string, ActionItem[], string | null, string];
export const TAB_NAME: Record<string, string> = { move: 'Move', attack: 'Attack', utility: 'Utility', perks: 'Perks', class: 'Class', shadow: 'Shadow', tend: 'Tend', figments: 'Figments', sigils: 'Sigils', outbursts: 'Outbursts', faith: 'Faith', calls: 'Calls' };

// ---------- prayers (Blessing 2.0, rules 1.6; the engine's faithView and previewPrayer) ----------
/** A prayer's id in the action list: "pr:<kind>:<id>" (the engine's descriptor id). */
export const PR = ENGINE_PR, prayId = enginePrayId, parsePray = parsePrayId;

// ---------- perk, trait and class-move actions (engine effects/actions.ts) ----------
/** A perk action's id in the action list: "pk:<item key>#<action id>" (the engine's descriptor id). */
export const PK = ENGINE_PK, pkId = perkId, parsePk = parsePerkId;
/** The unit's perk, trait and class actions on this surface, with the game bound (handlers see the live character). */
export function perkEntries(g: any, cb: any, u: any, ch: any, scope: 'combat' | 'world' = 'combat'): PerkActionEntry[] {
  if (!u) return [];
  const c = ch || (g && u.charId ? g.characters?.[u.charId] : null);
  try { return withGame(g || null, () => perkActionsFor({ u, c, cb, g }, scope)); } catch { return []; }
}
/** A read-only row in the Perks tab: "pki:<item key>". The item rides another action (a switch on an attack, a move,
 *  a Pump…) or works by itself; the row is there to read, with no Confirm (rules 1.14: the perk card in a fight). */
export const PKI = 'pki:';
export const isPerkInfo = (id: string | null | undefined) => !!id && id.startsWith(PKI);
/** A character's story-side perk, trait and class actions (the story panel's Perks strip). */
export function storyPerkEntries(g: any, ch: any): PerkActionEntry[] {
  if (!ch || !g) return [];
  try { return withGame(g, () => perkActionsFor({ c: ch, g }, 'story')); } catch { return []; }
}
/** "2 AP · 1/combat" */
/** Vent and core swap as the engine prices them (magic.ts ventAp / coreAp: Bleed the Flux, Core Change). */
export const magicAp = (u: any, a: 'vent' | 'core'): number => { try { return u ? (a === 'vent' ? ventAp(u) : coreAp(u)) : SPELL_AP[a]; } catch { return SPELL_AP[a]; } };
/** A perk action's cost, state and text as its row shows them (the engine's). */
export const pkCost = perkCost, pkState = perkState, pkText = perkText;
/** The class a character holds, for the Class tab's name and emblem: an active advanced class, else the base class (a
 *  shelved advanced class shows nothing). With no character, a move's origin (an action entry's cls, e.g. medic for
 *  the Bard's Triage) stands in, mapped to the Revision 3 class that holds it now. */
export function classOf(ch: any, origin?: string | null): { id: string; name: string; ink: string; icon: string } | null {
  const id = heldClassId(ch) || currentClassId(origin); if (!id) return null;
  const name = (CLASS as any)[id]?.name || ADVANCED[id]?.name, core = classCore(id), ink = core ? CORE_INK[core] : '#E7EBF3';
  return { id, name: name || id, ink, icon: classIconUri(id, ink) };
}

// ---------- reloading: speed or tactical (rules 1.9) ----------
/** The tactical reload's action ids (the speed reload keeps 'reload' and 'reload2'). */
export const RELOAD_TAC = 'reload-tac', RELOAD2_TAC = 'reload2-tac';
/** A gun's reload rows, at the engine's real costs (weaponActions): a magazine gun with tracked spares offers the speed
 *  reload (the old magazine drops into the pile on your tile) and the tactical one (+1 AP, it goes back in your pack);
 *  a gun loaded round by round has its one reload, by its own name. */
export function reloadItems(u: any): ActionItem[] {
  if (!u) return [];
  const R: any = weaponActions(u).find((x: any) => x.id === 'reload'); if (!R) return [];
  const w: any = (WEAPON as any)[u.weapon], unit = (w && w.reload_unit) || 'magazine', now = u.quiver ? '' : w && w.magazine != null ? ' ' + u.ammo + ' / ' + w.magazine + ' loaded now.' : ''; // a bow's Switch quiver card says its own counts (rules 1.53)
  if (!R.tactical) return [['reload', R.label, R.ap + ' AP', R.text + now, R.why]];
  return [
    ['reload', (/^(Swap magazine|Reload)$/.test(R.label) ? 'Reload' : R.label) + ' (speed)', R.ap + ' AP · the ' + unit + ' drops', 'Swap in your fullest spare ' + unit + ' (' + (u.mags || []).length + ' left). The one in the gun drops onto your tile with its rounds still in it. You can pick it up later and refill it with Load.' + now, R.why],
    [RELOAD_TAC, (/^(Swap magazine|Reload)$/.test(R.label) ? 'Reload' : R.label) + ' (tactical)', R.tactical.ap + ' AP · the ' + unit + ' goes in your pack', 'Swap in your fullest spare ' + unit + ' for ' + PILE.tactical_reload_extra_ap + ' AP more. The one in the gun goes back in your pack with its rounds still in it.' + now, R.tactical.why],
  ];
}
/** Reload both guns (Two guns): the engine's rows (speed; tactical +1 AP when both guns take magazines), with its
 *  own price and its own refusal (a full gun). cb: the fight, when there is one. */
export function reloadBothItems(u: any, cb: any = null, g: any = null): ActionItem[] {
  if (!u) return [];
  try { return reloadBothRows(cb, u, { g }).map((r): ActionItem => [r.id, r.label, r.cost, r.text, r.why]); } catch { return []; }
}
/** Options for the action list. noNarrator: there is no Narrator to rule on anything (the Proving Ground), so actions
 *  only the Narrator can resolve (cost 'Narrator', e.g. a weapon skill the engine doesn't run) are left out. */
export interface ActionOpts { noNarrator?: boolean; /** The game (perk actions read the live character and the use counters). */ g?: any; /** Where in the fight's log this unit's last turn began (perkShelves turnMark), for the passives' live lines. */ since?: number }

/** Every action this unit has, in tab order: the engine's descriptors (actionsFor) as the panel's rows. ch: the unit's
 *  character, or null. */
export const actionGroups = (cb: any, cur: any, ch: any, opts: ActionOpts = {}): ActionGroup[] => descriptorGroups(cb, cur, ch, opts);

/** The game the engine's actionsFor reads, for a fight this screen holds (cb may be the screen's drawn copy). */
export const gameFor = (g: any, cb: any, ch: any): any => ({ ...(g || {}), combat: cb, characters: { ...((g && g.characters) || {}), ...(ch ? { [ch.id]: ch } : {}) } });
/** The action list from the engine's descriptors (actionsFor): the rows each tab shows, in the engine's order, with
 *  its names, costs, texts and reasons. A child row (a technique inside its pad) and a hidden one are not listed. */
export function descriptorGroups(cb: any, cur: any, ch: any, opts: ActionOpts = {}): ActionGroup[] {
  if (!cb || !cur) return [];
  const list: ActionDescriptor[] = (() => { try { return actionsFor(gameFor(opts.g, cb, ch), cur.id, null); } catch { return []; } })();
  const by = (gr: string) => list.filter((d) => d.group === gr && !d.hidden && !d.parent).map((d): ActionItem => [d.id, d.name, d.cost.text, d.text, d.why, { ...(d.hand ? { hand: d.hand } : {}), ...(d.parts ? { parts: d.parts } : {}), ...(d.sub ? { sub: d.sub } : {}) }]);
  const w: any = (WEAPON as any)[cur.weapon];
  const out: ActionGroup[] = [['MOVEMENT', by('move'), null, 'move'], ['ATTACK & DEFEND · ' + (w ? w.name.toUpperCase() : ''), by('attack'), HOSTILE_INK, 'attack'], ['UTILITY', by('utility'), null, 'utility']];
  // Rules 1.14, the perk card in a fight: USE NOW is the buttons; RIDES AN ACTION and ALWAYS ON are rows to read.
  const perks = by('perks'), sh = perkShelves(opts.g, cb, cur, ch, { entries: perkEntries(opts.g, cb, cur, ch, 'combat').filter((e) => e.tab === 'perks'), since: opts.since });
  const info = [...sh.rides, ...sh.always].map((r): ActionItem => [PKI + r.key, r.name, r.line, r.detail, null]);
  if (perks.length || info.length) out.push(['PERKS & TRAITS', [...perks, ...info], null, 'perks']);
  const moves = by('class');
  if (moves.length) { const pe = perkEntries(opts.g, cb, cur, ch, 'combat').find((e) => e.tab === 'class'); const k = classOf(ch || (opts.g && cur?.charId ? opts.g.characters?.[cur.charId] : null), pe?.cls); out.push(['CLASS · ' + (k ? k.name.toUpperCase() : 'MOVES'), moves, k ? k.ink : null, 'class']); }
  const shadowRows = by('shadow'); // rules 1.32: Perception's door verbs (Slip, Mark, Work, Break), in Perception ink
  if (shadowRows.length) out.push(['SHADOW · UNSEEN', shadowRows, '#40BAA0', 'shadow']);
  const tendRows = by('tend'); // rules 1.33: Insight's door verbs (Bond, Heal, Help), in Insight ink
  if (tendRows.length) out.push(['TEND · BONDS AND CARE', tendRows, '#EB95B7', 'tend']);
  const figRows = by('figments'); // rules 1.34: Expression's door (Picture, then each held Figment's verbs), in Expression ink
  if (figRows.length) out.push(['FIGMENTS · PICTURED', figRows, '#5394AC', 'figments']);
  const sig = by('sigils'), soul = by('outbursts'), pray = by('faith'), cl = by('calls');
  if (sig.length) out.push(['MAGIC · SIGILS', sig, SIGIL_GLOW, 'sigils']);
  if (soul.length) out.push(['MAGIC · OUTBURSTS', soul, SOUL_INK, 'outbursts']);
  if (pray.length) out.push(['FAITH · PRAYERS', pray, FAITH_INK, 'faith']);
  if (cl.length) out.push(['CALLS · SPOKEN TO SOMEONE WHO CAN HEAR YOU', cl, null, 'calls']);
  if (opts.noNarrator) return out.map(([n, items, ink, tab]) => [n, items.filter((it) => it[2] !== 'Narrator'), ink, tab] as ActionGroup).filter((gr) => gr[1].length);
  return out;
}

/** A unit that can't use techniques (the engine's gate: a companion, a puppet, a unit with a fixed action list) keeps
 *  the old attack rows. */
export const isLegacyUnit = (u: any) => !!u && (!!u.companion || Array.isArray(u.allowedActions) || u.side !== 'pc');
/** The plain attack's action for the main hand: Cut for a melee weapon, Shot for a ranged one (the old 'melee' or
 *  'shot' for a unit that keeps the old rows). */
export function plainAction(u: any): string {
  const sys = u ? phys.weaponSystem(u.weapon) : 'melee';
  if (isLegacyUnit(u)) return sys === 'melee' ? 'melee' : 'shot';
  return techAction('main', sys === 'melee' ? 'cut' : 'shot');
}
/** An action id a saved pick or another screen may hold from before techniques, mapped to today's row (or itself). */
export function mapLegacy(u: any, a: string | null | undefined): string | null {
  if (!a || isLegacyUnit(u)) return a || null;
  const m = legacyAttack(a, !!u?.offWeapon);
  return m === 'plain:main' ? plainAction(u) : m || a;
}

// ---------- the turn card's four commands ----------
export interface Command { action: string; label: string; sub: string; key: string; off?: boolean; custom?: boolean }
export interface CatEntry { action: string; label: string; cost: string; text: string; tab: string; ink: string | null; why: string | null }

/** A quick "not now" for a command (a hint for the card; the engine still rules on the action itself). */
export function whyNot(u: any, action: string, cost: string): string | null {
  if (!u) return 'No unit.';
  if (u.downed) return 'Downed.';
  const w: any = (WEAPON as any)[u.weapon], mg = u.mg, ap = u.ap ?? 0, sk = w && w.grants, skFx = (sk && sk.effect) || {};
  const gun = !!w && w.magazine != null;
  if (['shot', 'aimed', 'burst', 'auto', 'overwatch', 'cover'].includes(action) && w && !isMelee(w)) {
    if (u.jammed) return 'Jammed: clear it first.';
    if (gun && (u.ammo ?? 0) <= 0) return 'Empty: reload first.';
  }
  if (['move', 'sprint', 'disengage'].includes(action) && u.prone) return 'Prone: stand up first.';
  if (action === 'sprint' && u.noSprint) return 'You can\'t Sprint while Overburdened or in Juggernaut armour.';
  if (action === 'reload' || action === RELOAD_TAC) { if (!gun) return 'Nothing to reload.'; if ((u.ammo ?? 0) >= w.magazine) return 'Already full.'; if (u.jammed) return 'Jammed: clear it first.'; if (w.reload === 'loose' ? !(u.loose > 0) : Array.isArray(u.mags) && !u.mags.length) return 'Nothing left to load.'; }
  if (action === 'clear' && !u.jammed) return 'Not jammed.';
  if (action.startsWith(PK) || action.startsWith(PR)) return null; // perk actions and prayers carry the engine's own reason (catalogue)
  if (action === 'skill') {
    if (!['multi_shot', 'sweep'].includes(skFx.op)) return skFx.op === 'narrator' || !skFx.op ? 'The Narrator decides this one. Use Say to describe it.' : 'This is always on.';
    if (u.jammed && skFx.op === 'multi_shot') return 'Jammed: clear it first.';
    if (skFx.op === 'multi_shot' && gun && (u.ammo ?? 0) <= 0) return 'Empty: reload first.';
  }
  if (['release', 'pump', 'steady', 'letgo', 'feed', 'heartwatch'].includes(action) && !(mg && mg.held)) return 'Nothing held.';
  if (action === 'outburst' && mg && mg.held) return 'You are already holding an Outburst.';
  if (action === 'vent' && mg && !(mg.flux > 0)) return 'No Flux to vent.';
  if (action === 'core' && mg && !(mg.cores > 0)) return 'No spare cores.';
  if (action === 'repair' && !(u.parts > 0)) return 'No spare parts.';
  const n = /^(\d+(?:\.\d+)?)\s*(?:–\d+\s*)?AP/.exec(cost || '');
  if (n && ap < Number(n[1])) return 'Needs ' + n[1] + ' AP.';
  if (ap <= 0 && !(n && Number(n[1]) === 0)) return 'No AP left.';
  return null;
}

/** Every action the unit has, flat, with its tab and why it can't be used right now (null when it can). */
export function catalogue(cb: any, u: any, ch: any, opts: ActionOpts = {}): CatEntry[] {
  if (!u) return [];
  // Read-only perk rows are never commands (they have no action to run).
  return actionGroups(cb, u, ch, opts).map(([n, items, ink, tab]) => [n, items.filter((it) => !isPerkInfo(it[0])), ink, tab] as ActionGroup).flatMap(([, items, ink, tab]) => items.map(([action, label, cost, text, why]) => ({ action, label, cost, text, tab, ink, why: u.downed ? 'Downed.' : why !== undefined ? why : whyNot(u, action, cost) })));
}

/** The smart default: an attack (or Clear jam), Move, Reload (or Shove), then the unit's signature move. */
export function smartCommands(u: any): Command[] {
  const w: any = (WEAPON as any)[u.weapon], legacy = isLegacyUnit(u), melee = legacy ? (w ? isMelee(w) : true) : phys.weaponSystem(u.weapon) === 'melee', mg = u.mg;
  const sk: any = w && w.grants, skFx: any = sk?.effect || {};
  const cmds: Command[] = [];
  // Holding an Outburst (rules 1.5): the heart's two moves come first, Pump and Release; then Move and the weapon.
  if (mg?.held) {
    const st = mg.held.stage ?? 0, full = st >= 4, free = (mg.freePumps || 0) > 0;
    cmds.push({ action: 'pump', label: 'Pump', sub: full ? 'The heart is full (stage 4)' : 'Stage ' + st + ' → ' + (st + 1) + ' · ' + (free ? 'FREE' : SPELL_AP.pump + ' AP'), key: '1', off: full || (!free && (u.ap ?? 0) < SPELL_AP.pump) });
    cmds.push({ action: 'release', label: 'Release', sub: 'Stage ' + st + ' ×' + stageMult(st) + ' · ' + SPELL_AP.release + ' AP', key: '2', off: (u.ap ?? 0) < SPELL_AP.release });
    cmds.push({ action: 'move', label: 'Move', sub: u.movement + ' tiles per AP', key: '3', off: !!u.prone });
    if (melee) cmds.push({ action: plainAction(u), label: legacy ? 'Strike' : 'Cut', sub: (w ? attackApCost(w, 'melee') : 2) + ' AP · ' + (w ? w.name : 'fists'), key: '4' });
    else cmds.push({ action: plainAction(u), label: 'Shoot', sub: attackApCost(w, 'shot') + ' AP · ' + w.name, key: '4', off: u.ammo <= 0 || !!u.jammed });
    if (Array.isArray(u.allowedActions)) return cmds.filter((c) => u.allowedActions.includes(c.action)).map((c, i) => ({ ...c, key: String(i + 1) }));
    return cmds;
  }
  if (u.jammed) cmds.push({ action: 'clear', label: 'Clear jam', sub: 'The gun is jammed', key: '1' });
  else if (melee) cmds.push({ action: plainAction(u), label: legacy ? 'Strike' : 'Cut', sub: (w ? attackApCost(w, 'melee') : 2) + ' AP · ' + (w ? w.name : 'fists'), key: '1' });
  else cmds.push({ action: plainAction(u), label: 'Shoot', sub: attackApCost(w, 'shot') + ' AP · ' + w.name, key: '1', off: u.ammo <= 0 });
  cmds.push({ action: 'move', label: 'Move', sub: u.movement + ' tiles per AP', key: '2', off: !!u.prone });
  const rl = weaponActions(u).find((x: any) => x.id === 'reload'); // only a weapon that reloads offers it, by its own name
  if (rl && !u.jammed) cmds.push({ action: 'reload', label: reloadItems(u)[0][1], sub: u.quiver ? rl.ap + ' AP · the other quiver' : u.ammo + ' / ' + w.magazine + ' loaded', key: '3', off: u.quiver ? !!rl.why : u.ammo >= w.magazine }); // rules 1.53: a bow's reload is Switch quiver
  else if (!u.jammed) cmds.push({ action: 'shove', label: 'Shove', sub: 'Push an enemy next to you', key: '3' });
  else cmds.push({ action: 'move', label: 'Take cover', sub: 'Move out of sight', key: '3' });
  if (mg?.held) cmds.push({ action: 'release', label: 'Release', sub: 'Held Outburst · stage ' + mg.held.stage, key: '4' });
  else if (mg && (mg.emanator || mg.designs?.length) && mg.designs?.length) cmds.push({ action: 'outburst', label: 'Outburst', sub: Math.round(mg.mp) + ' MP in the heart', key: '4' });
  else if (mg && (mg.evoker || mg.words?.length)) cmds.push({ action: 'draw', label: 'Draw a glyph', sub: 'Evoker ' + mg.charge + ' charge', key: '4' });
  else if (!legacy) cmds.push(melee ? { action: 'tpad:main', label: 'Techniques', sub: 'What your ' + (w ? w.name : 'fists') + ' can do', key: '4' } : { action: TWATCH, label: 'Hold a shot', sub: 'Watch for their move', key: '4' });
  else if (sk && (skFx.op === 'multi_shot' || skFx.op === 'sweep')) cmds.push({ action: 'skill', label: sk.name, sub: skFx.ap + ' AP · ' + (skFx.op === 'multi_shot' ? (skFx.shots || 3) + ' shots at one target' : 'every enemy next to you'), key: '4', off: u.jammed || u.ap < (skFx.ap || 0) || (skFx.op === 'multi_shot' && w.magazine != null && u.ammo <= 0) });
  else cmds.push({ action: 'overwatch', label: 'Overwatch', sub: 'Hold a shot for their move', key: '4' });
  // A unit with a fixed action list (the drone, item 370) keeps only those commands, renumbered.
  if (Array.isArray(u.allowedActions)) return cmds.filter((c) => u.allowedActions.includes(c.action)).map((c, i) => ({ ...c, key: String(i + 1) }));
  return cmds;
}

/** Spare picks when the smart default runs out (it has four, and some may already be the player's picks). */
const SPARE = ['overwatch', 'aimed', TWATCH, 'tpad:main', 'sprint', 'shove', 'reload', 'analyze', 'stim', 'prone', 'disengage', 'melee'];

/** The four commands for this unit. Each slot the player set holds their pick (if the unit still has that action; greyed
 *  with the reason when it can't be used now). The other slots take the smart default's commands in its own order,
 *  skipping any the player already placed, so a pick never pushes a smart command off the card: Reload in slot 1 gives
 *  Reload · Shoot · Move · Overwatch. When the smart list runs out, spare actions fill in. */
export function resolveCommands(cb: any, u: any, ch: any, prefs: (string | null)[] = [], opts: ActionOpts = {}): Command[] {
  const smart = smartCommands(u);
  if (!prefs.some(Boolean)) return smart;
  const cat = catalogue(cb, u, ch, opts), by = new Map(cat.map((e) => [e.action, e]));
  const slots: (Command | null)[] = [null, null, null, null], used = new Set<string>();
  // The player's picks first, in their slots (a pick that repeats an earlier slot, or that the unit lacks, is left open).
  for (let i = 0; i < 4; i++) {
    const a = mapLegacy(u, prefs[i]), e = a ? by.get(a) : undefined; // a pick saved before techniques lands on its new row
    if (!e || used.has(e.action)) continue;
    used.add(e.action);
    slots[i] = { action: e.action, label: e.label, sub: e.why ? 'Not now: ' + e.why.replace(/\.$/, '') : e.cost + (e.tab === 'attack' && (WEAPON as any)[u.weapon] ? ' · ' + (WEAPON as any)[u.weapon].name : ''), key: String(i + 1), off: !!e.why, custom: true };
  }
  // Then the smart default, in its order, into the open slots; spare actions if it runs out.
  const fill: Command[] = smart.filter((c) => !used.has(c.action));
  for (const x of SPARE) { const e = by.get(x); if (e) fill.push({ action: e.action, label: e.label, sub: e.why ? 'Not now: ' + e.why.replace(/\.$/, '') : e.cost, key: '', off: !!e.why }); }
  for (let i = 0; i < 4; i++) {
    if (slots[i]) continue;
    const c = fill.find((x) => !used.has(x.action));
    if (!c) continue;
    used.add(c.action); slots[i] = { ...c, key: String(i + 1) };
  }
  return slots.filter((c): c is Command => !!c);
}

// ---------- the player's choice, per character, in this browser ----------
const PREF_KEY = 'phc.cutinCmds';
export const EV_CMDS_CHANGED = 'phc:cmds-changed', EV_CUSTOMISE = 'phc:customise-cmds';
let prefCache: Record<string, (string | null)[]> | null = null;
function loadAll(): Record<string, (string | null)[]> {
  if (prefCache) return prefCache;
  try { const v = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(PREF_KEY)) || '{}'); prefCache = v && typeof v === 'object' ? v : {}; } catch { prefCache = {}; }
  return prefCache!;
}
/** Where a character's picks are kept. A character id is a per-room counter (the first character locked in is 'c3' in
 * every room), so the key carries the room code too: picks made in one room never land on another room's character. */
export const prefKey = (g: { code?: string } | null | undefined, charId: string) => (g?.code || 'local') + ':' + charId;
/** The four slots this character's player chose in this room (null: the smart default for that slot). */
export function readPrefs(g: { code?: string } | null | undefined, charId: string | null | undefined): (string | null)[] {
  const v = charId ? loadAll()[prefKey(g, charId)] : null;
  return Array.from({ length: 4 }, (_, i) => (Array.isArray(v) && typeof v[i] === 'string' ? v[i] : null));
}
export function writePrefs(g: { code?: string } | null | undefined, charId: string, slots: (string | null)[]) {
  const all = { ...loadAll() }, clean = Array.from({ length: 4 }, (_, i) => slots[i] || null), k = prefKey(g, charId);
  if (clean.some(Boolean)) all[k] = clean; else delete all[k];
  prefCache = all;
  try { localStorage.setItem(PREF_KEY, JSON.stringify(all)); } catch { /* private mode: kept for this visit */ }
  try { window.dispatchEvent(new CustomEvent(EV_CMDS_CHANGED, { detail: { charId } })); } catch { /* */ }
}
// ---------- which side of the screen the turn card comes in on (this browser, every character) ----------
export type CardSide = 'auto' | 'left' | 'right';
const SIDE_KEY = 'phc.cutinSide';
/** Auto (the default): the left, unless the card would cover your unit there; then the right. */
export function readCardSide(): CardSide {
  try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(SIDE_KEY) : null; return v === 'left' || v === 'right' ? v : 'auto'; } catch { return 'auto'; }
}
export function writeCardSide(side: CardSide) {
  try { if (side === 'auto') localStorage.removeItem(SIDE_KEY); else localStorage.setItem(SIDE_KEY, side); } catch { /* private mode: kept for this visit */ }
  try { window.dispatchEvent(new CustomEvent(EV_CMDS_CHANGED, { detail: { side } })); } catch { /* */ }
}
/** Does the card come in from the right? Auto asks whether the left would cover the unit (underLeft). */
export const cardOnRight = (side: CardSide, underLeft: () => boolean) => (side === 'right' ? true : side === 'left' ? false : underLeft());
/** Ask the turn intro (mounted over every screen) to open the customise dialog for a character. */
export function openCustomise(charId: string | null | undefined) {
  if (!charId) return;
  try { window.dispatchEvent(new CustomEvent(EV_CUSTOMISE, { detail: { charId } })); } catch { /* */ }
}
/** For tests. */
export const _resetPrefCache = () => { prefCache = null; };

/** A perk action's detail as its choice: an option's id when the text names one (several, space-separated, for a
 * multi pick like Three-Cut Script), else the text as typed. */
export function pickChoice(e: { options?: { id: string; label: string }[]; pickMulti?: number }, det: string): string {
  const opts = e.options || [], one = (w: string) => { const x = String(w).toLowerCase(), o = opts.find((p) => p.id.toLowerCase() === x || p.label.toLowerCase() === x); return o ? o.id : w; };
  return (e.pickMulti || 1) > 1 ? det.split(/[\s,·]+/).filter(Boolean).map(one).join(' ') : one(det);
}
/** Does this action want a detail (a pick, words, a name, what you say)? */
export function wantsDetail(e: { options?: unknown[]; pickLabel?: string; target?: string }, pv?: { ok: boolean; why?: string } | null): boolean {
  return !!((e.options && e.options.length) || e.pickLabel || ['text', 'npc'].includes(e.target || '') || (pv && !pv.ok && /\b(name|pick|choose|type|say|word)/i.test(pv.why || '')));
}

/** Whom the unit could pull free now (rules 1.12): the engine's list (actions.ts). */
export const pullFreeTargets = (cb: any, cur: any): any[] => (cb && cur ? enginePullFree(cb, cur) : []);
