// The combat action list and the turn card's four commands, shared by the combat panel (screens/combat.js), the
// your-turn cut-in (game/turnIntro.tsx) and the dialog that customises it (game/commandsDialog.tsx).
//
// actionGroups() is the one list of actions a unit has (the panel's tabs show it); the cut-in's four commands are a
// smart default picked from the unit's state, which a player can override per character, slot by slot. The choice is a
// personal UI preference kept in this browser (localStorage 'phc.cutinCmds', keyed by character id), never game state.
import { phys, WEAPON, CLASS, ADVANCED, isMelee, attackApCost, analyzeCost, ROUNDS_PER_AP, musicTraitOf, songOf, glyphApOf, SPELL_AP, ventAp, coreAp, CORE_CHARGE, FLUX_MAX, designAp, stageMult, manaBand, MANA_START, weaponActions, unitSees, perkActionsFor, bindGame, type PerkActionEntry,
  focusHand, NEEDS_EVOKER, NEEDS_EMANATOR, reloadBothAp, PILE, PICKUP_AP, dist } from '@engine';
import { SIGIL_GLOW, SOUL_INK } from './glyphs';
import { heartPanel, designCards } from './heartView';
import { faithView, beliefOf, FAITH_MIN } from '@engine';
import { prayerButtons, FAITH_INK } from './faithView';
import { classIconUri, classCore, CORE_INK } from './classIcons';
import { heldClassId, currentClassId } from './classView';
import { pilesIn } from './worldView';
import { weaponBlocks, blockItems, techAction, TWATCH, legacyAttack } from './techView';
import { callItems } from './callView';
import { perkShelves } from './perkShelves';

const HOSTILE_INK = '#F65157';
export const BAND_NAME: Record<string, string> = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
/** [id, label, cost text, explanation, why not now (the engine's reason; undefined: work it out from the cost)] */
export type ActionItem = [string, string, string, string, (string | null)?];
/** [group title, items, family ink (or null), tab id] */
export type ActionGroup = [string, ActionItem[], string | null, string];
export const TAB_NAME: Record<string, string> = { move: 'Move', attack: 'Attack', utility: 'Utility', perks: 'Perks', class: 'Class', sigils: 'Sigils', outbursts: 'Outbursts', faith: 'Faith', calls: 'Calls' };

// ---------- prayers (Blessing 2.0, rules 1.6; the engine's faithView and previewPrayer) ----------
/** A prayer's id in the action list: "pr:<kind>:<id>" (a Hymn's id is its "<patron>.<hymn>" key). */
export const PR = 'pr:';
export const prayId = (kind: string, id: string) => PR + kind + ':' + id;
export const parsePray = (a: string): { kind: 'whisper' | 'hymn' | 'miracle'; id: string } | null => {
  if (!a || !a.startsWith(PR)) return null; const i = a.indexOf(':', PR.length); return { kind: a.slice(PR.length, i) as any, id: a.slice(i + 1) }; };
/** The FAITH tab's items: every prayer this unit could make, with AP, the gate or the dice, the odds, and the reason when not. */
export function prayerItems(g: any, cur: any): ActionItem[] {
  if (!g || !cur || cur.side !== 'pc' || !cur.charId || cur.companion) return [];
  const c = g.characters?.[cur.charId]; if (!c) return [];
  if (beliefOf(c).kind !== 'faithful' && (c.skills?.faith || 0) < FAITH_MIN) return []; // no faith to speak of: no tab
  const B = prayerButtons(faithView(g, c.id));
  return [...B.whispers, ...B.hymns, ...(B.miracle ? [B.miracle] : [])].map((b) => [prayId(b.kind, b.id), (b.kind === 'miracle' ? '✦ ' : '') + b.name + (b.kind === 'whisper' ? '' : ' · ' + (b.kind === 'miracle' ? 'MIRACLE' : b.gate.replace(/ · DEVOTION \d+$/, ''))), b.ap + ' · ' + b.odds,
    b.gate + ' · ' + b.odds + '. ' + b.text + (b.warn ? ' ' + b.warn + '.' : ''), b.ok ? null : b.why || 'Not now.'] as ActionItem);
}

// ---------- perk, trait and class-move actions (engine effects/actions.ts) ----------
/** A perk action's id in the action list: "pk:<item key>#<action id>". */
export const PK = 'pk:';
export const pkId = (e: Pick<PerkActionEntry, 'id' | 'actionId'>) => PK + e.id + '#' + e.actionId;
export const parsePk = (id: string): { id: string; actionId: string } | null => { if (!id || !id.startsWith(PK)) return null; const [k, a] = id.slice(PK.length).split('#'); return { id: k, actionId: a }; };
/** The unit's perk, trait and class actions on this surface, with the game bound (handlers see the live character). */
export function perkEntries(g: any, cb: any, u: any, ch: any, scope: 'combat' | 'world' = 'combat'): PerkActionEntry[] {
  if (!u) return [];
  const c = ch || (g && u.charId ? g.characters?.[u.charId] : null);
  const was = bindGame(g || null);
  try { return perkActionsFor({ u, c, cb, g }, scope); } catch { return []; } finally { bindGame(was); }
}
/** A read-only row in the Perks tab: "pki:<item key>". The item rides another action (a switch on an attack, a move,
 *  a Pump…) or works by itself; the row is there to read, with no Confirm (rules 1.14: the perk card in a fight). */
export const PKI = 'pki:';
export const isPerkInfo = (id: string | null | undefined) => !!id && id.startsWith(PKI);
/** A character's story-side perk, trait and class actions (the story panel's Perks strip). */
export function storyPerkEntries(g: any, ch: any): PerkActionEntry[] {
  if (!ch || !g) return [];
  const was = bindGame(g);
  try { return perkActionsFor({ c: ch, g }, 'story'); } catch { return []; } finally { bindGame(was); }
}
/** "2 AP · 1/combat" */
/** Vent and core swap as the engine prices them (magic.ts ventAp / coreAp: Bleed the Flux, Core Change). */
export const magicAp = (u: any, a: 'vent' | 'core'): number => { try { return u ? (a === 'vent' ? ventAp(u) : coreAp(u)) : SPELL_AP[a]; } catch { return SPELL_AP[a]; } };
const apNote = (u: any, a: 'vent' | 'core') => { const n = magicAp(u, a), base = SPELL_AP[a]; return n < base ? (a === 'vent' ? ' Bleed the Flux' : 'Core Change') + ' lowers the cost from ' + base + ' to ' + n + ' AP. ' : ''; };
export const pkCost = (e: PerkActionEntry) => (e.arm ? (e.armed ? 'ARMED' : 'arm') : e.ap + ' AP') + (e.uses.label ? ' · ' + e.uses.label : '');
/** A move's standing state for its button (Class Roster Revision 3): an on/off policy pair names the one in force
 *  (its twin is greyed "on now"), Eye of the Storm reads ARMED once armed, a spent once-a-scene move "used". */
export function pkState(e: PerkActionEntry): { tag: string; why: string | null } {
  const pol = /^(.*)_(on|off)$/.exec(e.actionId);
  if (pol && e.why === 'Already set.') return { tag: ' ✓', why: 'In force now. ' + (pol[2] === 'on' ? 'On is the default.' : 'It stays off for this fight.') };
  if (e.why === 'Already armed.') return { tag: ' · ARMED', why: 'Armed. Your next Release this turn uses it.' };
  return { tag: '', why: e.why };
}
export const pkText = (e: PerkActionEntry) => e.text + (e.engine ? '' : ' The Narrator decides the rest.');
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
  const w: any = (WEAPON as any)[u.weapon], unit = (w && w.reload_unit) || 'magazine', now = w && w.magazine != null ? ' ' + u.ammo + ' / ' + w.magazine + ' loaded now.' : '';
  if (!R.tactical) return [['reload', R.label, R.ap + ' AP', R.text + now, R.why]];
  return [
    ['reload', (/^(Swap magazine|Reload)$/.test(R.label) ? 'Reload' : R.label) + ' (speed)', R.ap + ' AP · the ' + unit + ' drops', 'Swap in your fullest spare ' + unit + ' (' + (u.mags || []).length + ' left). The one in the gun drops onto your tile with its rounds still in it. You can pick it up later and refill it with Load.' + now, R.why],
    [RELOAD_TAC, (/^(Swap magazine|Reload)$/.test(R.label) ? 'Reload' : R.label) + ' (tactical)', R.tactical.ap + ' AP · the ' + unit + ' goes in your pack', 'Swap in your fullest spare ' + unit + ' for ' + PILE.tactical_reload_extra_ap + ' AP more. The one in the gun goes back in your pack with its rounds still in it.' + now, R.tactical.why],
  ];
}
/** Reload both guns (Two guns): speed at the engine's price, tactical +1 AP when both guns take magazines. */
export function reloadBothItems(u: any): ActionItem[] {
  const w: any = u ? (WEAPON as any)[u.weapon] : null, ow: any = u && u.offWeapon ? (WEAPON as any)[u.offWeapon] : null;
  if (!w || !ow || w.magazine == null || ow.magazine == null) return [];
  // The engine's refusals for a full gun (combat.ts reloadHands), before the AP check.
  const mainFull = (u.ammo ?? 0) >= (w.magazine || 0) && w.reload === 'magazine', offFull = (u.offAmmo ?? 0) >= (ow.magazine || 0);
  const full = mainFull && offFull ? 'Already full.' : offFull ? 'The off-hand gun is full. Reload the main gun alone.' : mainFull ? 'The main gun is full. Reload the off-hand gun alone.' : null;
  const ap = reloadBothAp(u), tac = ap + PILE.tactical_reload_extra_ap, need = (n: number) => full || ((u.ap ?? 0) < n ? 'Needs ' + n + ' AP.' : null);
  const out: ActionItem[] = [['reload2', 'Reload both guns' + (ow.reload !== 'loose' ? ' (speed)' : ''), ap + ' AP' + (ow.reload !== 'loose' ? ' · the magazines drop' : ''), 'Each gun takes its own spare magazine. The old magazines drop onto your tile.', need(ap)]];
  if (ow.reload !== 'loose' && w.reload !== 'loose' && Array.isArray(u.mags)) out.push([RELOAD2_TAC, 'Reload both (tactical)', tac + ' AP · the magazines go in your pack', 'Each gun takes its own spare magazine. The old magazines go back in your pack.', need(tac)]);
  return out;
}
/** A visible pile on your tile or next to it (Pick up's reach), from the fight's objects in this player's view. */
export const pileInReach = (cb: any, u: any) => { if (!cb || !u) return null; for (const o of pilesIn(cb.objects).values()) if (dist(u.pos, o.pos) <= 1) return o; return null; };

/** Options for the action list. noNarrator: there is no Narrator to rule on anything (the Proving Ground), so actions
 *  only the Narrator can resolve (cost 'Narrator', e.g. a weapon skill the engine doesn't run) are left out. */
export interface ActionOpts { noNarrator?: boolean; /** The game (perk actions read the live character and the use counters). */ g?: any; /** Where in the fight's log this unit's last turn began (perkShelves turnMark), for the passives' live lines. */ since?: number }

/** Every action this unit has, in tab order (Move · Attack · Utility · Sigils · Outbursts). ch: the unit's character
 *  (for stims and the song), or null. */
export function actionGroups(cb: any, cur: any, ch: any, opts: ActionOpts = {}): ActionGroup[] {
  const w: any = cur ? (WEAPON as any)[cur.weapon] : null, melee = w ? isMelee(w) : false;
  const mv = cur ? cur.movement : 1;
  const modes = (w && w.modes) || [];
  // Weapon-granted actions (engine weaponActions, plan 2.9): only what this weapon grants shows, with the engine's reason.
  const wa = cur ? weaponActions(cur) : [], W = (id: string) => wa.find((x: any) => x.id === id);
  const offW: any = cur && cur.offWeapon ? (WEAPON as any)[cur.offWeapon] : null;
  const legacy = isLegacyUnit(cur);
  // two weapons of one kind: the both-hands block (the paired attack, the shared techniques, reloading both guns)
  const blocks0 = legacy ? [] : weaponBlocks(opts.g, cb, cur), dual = blocks0.some((b) => b.hand === 'both');
  // a gun in either hand: Reload and Clear jam are listed with the shots, on the Attack tab
  const gunTab = !!cur && ((!!w && !melee && w.id !== 'fists') || (!!offW && !isMelee(offW)));
  const clearItems: ActionItem[] = W('clear') ? [['clear', W('clear')!.label, W('clear')!.ap + ' AP', W('clear')!.text, W('clear')!.why] as ActionItem] : [];
  const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n: number) => n < cap).sort((a: number, b: number) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
  const mg = cur && cur.mg, words = mg ? mg.words || [] : [], designs = mg ? mg.designs || [] : [];
  const hasMagic = !!(mg && (words.length || designs.length || mg.evoker || mg.emanator));
  const held = mg && mg.held, heldD = held ? designs.find((d: any) => d.id === held.design) || null : null;
  const band = manaBand(cb ? cb.mana ?? MANA_START : MANA_START);
  const ITEMS: ActionGroup[] = [
    ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + ' tiles', 'Each AP moves you ' + mv + ' tiles (your Movement). Rough tiles count double. If you leave an enemy\'s reach without Disengaging, it gets an opportunity attack.'],
      ['sprint', 'Sprint', '2 AP', cur && cur.noSprint ? 'You can\'t Sprint while Overburdened or in Juggernaut armour.' : 'Move up to ' + Math.floor(3 * mv) + ' tiles (3 × your Movement).'],
      ['disengage', 'Disengage', '1 AP', 'Step 1 tile. No enemy gets an opportunity attack.'],
      ['prone', cur && cur.prone ? 'Stand up' : 'Drop prone', '1 AP', 'While you are Prone, ranged attacks against you are at −2 to hit and melee attacks at +2. You can\'t move until you stand up.']], null, 'move'],
    ['ATTACK & DEFEND · ' + (w ? w.name.toUpperCase() : ''), [
      // Physical 2.0 (rules 1.12; game/techView.ts): one block per held weapon, its plain attack (Cut, Shot) and its
      // Techniques pad, then Hold a shot. They replace the old Shot / Aimed / Burst / Full auto / Overwatch / weapon
      // skill / Melee rows (the engine still takes those actions; a saved turn-card pick maps onto the new rows).
      // A companion, a puppet or a unit with a fixed action list (the drone) can't use techniques (the engine's gate), so
      // it keeps the old rows.
      ...(legacy ? [...(melee ? [['melee', 'Strike', attackApCost(w, 'melee') + ' AP', 'd20 + ' + w.skill.replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.'] as ActionItem]
        : [['shot', 'Shot', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'd20 + Dexterity against Defense, at −5 if the target is behind half cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'] as ActionItem,
          ['aimed', 'Aimed shot', '3 AP', '+2 to hit, and a critical hit on 19–20.'] as ActionItem,
          ...(modes.includes('burst') ? [['burst', 'Burst', '3 AP', 'Fire 3 rounds at one target, with two rolls. The second roll is at −4 to hit (−3 with a Quick weapon, −1 with a Heavy weapon that is braced).'] as ActionItem] : []),
          ...(modes.includes('auto') ? [['auto', 'Full auto', '4 AP', 'Fire 10 rounds. Every enemy near the line to your target is attacked with one roll at −2 to hit.'] as ActionItem] : [])]),
        ...(W('overwatch') ? [['overwatch', W('overwatch')!.label, W('overwatch')!.ap + ' AP', W('overwatch')!.text] as ActionItem] : [])]
        : [...withBoth(blockItems(blocks0) as ActionItem[], dual, cur),
          // a gun in the hand still hits: the butt of the weapon (the engine's bare-hand strike; Leon, 10 Nov 2026)
          ...(w && !melee ? [['melee', 'Strike (weapon\'s butt)', attackApCost(WEAPON.fists, 'melee') + ' AP', 'Hit an enemy next to you with the gun itself: d20 + Raw Power against Defense, for the damage of a bare-hand strike. It uses no round and adds no Heat.'] as ActionItem] : [])]),
      ...(offW && !dual ? [['paired', 'Both hands (' + offW.name + ')', 'AP +1', 'Attack with both weapons in one action. It costs the higher of the two AP costs, plus 1. The main hand is at −1 to hit and the off hand at −3, improved by 1 for every 3 points of Dexterity, up to −1.'] as ActionItem] : []),
      // with a gun in a hand, reloading and clearing a jam sit with the shots (Leon, 10 Nov 2026: no tab switch mid-fight)
      ...(gunTab ? [...reloadItems(cur).filter((it) => !dual || !String(it[0]).startsWith('reload2')), ...clearItems] : []),
      ['shove', 'Shove', '2 AP', 'Shove an enemy next to you: d20 + Raw Power against 10 + the better of its Raw Power and Athletics. If you win, it is pushed 1 tile, or knocked Prone if the way is blocked.'],
      ...(W('brace') ? [['brace', 'Brace', W('brace')!.ap + ' AP', W('brace')!.text, W('brace')!.why] as ActionItem] : []),
      ['cover', 'Shoot an object', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'Shoot cover, a barricade, a door, a barrel or a lamp. There is no roll: it takes your weapon\'s damage. Broken cover becomes rubble, and barrels explode.']], HOSTILE_INK, 'attack'],
    ['UTILITY', [
      // rules 1.12: what nails a unit in place (Run Through's pin) holds until 2 AP is spent to pull free
      ...pullFreeItems(cb, cur),
      ...(gunTab ? [] : reloadItems(cur)),
      ...(W('load') ? [['load', W('load')!.label, loadInfo ? loadInfo.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', loadInfo ? 'Load ' + loadInfo.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : W('load')!.text, W('load')!.why] as ActionItem] : []),
      ...(gunTab ? [] : clearItems),
      ...(W('repair') ? [['repair', 'Field Repair', W('repair')!.ap + ' AP', 'Needs Improvisation 3 and one spare-parts charge (' + (cur && cur.parts || 0) + ' left). Your weapon regains 10% durability, plus 5% for each Improvisation point above 3. Weapon durability: ' + (cur && cur.maxDur ? (cur.dur ?? cur.maxDur) + '/' + cur.maxDur : 'n/a') + '.', W('repair')!.why] as ActionItem] : []),
      ['pickup', 'Pick up', PICKUP_AP + ' AP', 'Take what you tick from the pile on your tile or next to it: magazines with their rounds, loose rounds, weapons, whatever was dropped. Everything starts ticked.', cur && cur.side === 'pc' && !cur.charId ? 'Only a player character can pick things up.' : cb && cur && !pileInReach(cb, cur) ? 'Nothing on the ground next to you.' : undefined],
      ['door', 'Open or close a door', '1 AP', 'Open or close a door next to you. A closed door blocks movement and sight. A locked door needs a check after the fight, or enough damage to break it.'],
      ['stim', 'Stim an ally', '1–2 AP', 'Use a stim on an ally next to you. A Downed ally is stabilised at 1 HP (1 AP for a Bard, 2 AP for anyone else). Anyone else heals 6 HP × your Healing given, more as you level. It also stops Bleeding. Uses one stim' + (ch ? ' (' + ch.stims + ' left)' : '') + '.'],
      ...(ch && musicTraitOf(ch) && songOf(ch) ? [['song', 'Play my song', '2 AP', 'Your Musek Blestor plays your favourite song for the whole room until the fight ends, and your music trait\'s bonus is active while it plays. It can replace another player\'s song, but never a spotlight track.'] as ActionItem] : []),
      // Rules 1.3 (lane 0B): these show only when they apply.
      ...(cur && cur.conds?.burning > 0 ? [['extinguish', 'Put out the fire', '1 AP', 'You are Burning: you take 10 damage at the start of each of your turns until someone spends 1 AP to put it out.'] as ActionItem] : []),
      ...(cur && cur.conds?.grappled > 0 ? [['escape', 'Break free', '2 AP', 'You are Grappled. Roll d20 + the better of your Raw Power and Athletics against the grappler\'s to break free.'] as ActionItem] : []),
      ...(cur && (cur.conds?.disarmed > 0 || cur.conds?.lowered > 0) ? [['recover', cur.conds?.disarmed > 0 ? 'Recover your weapon' : 'Raise your weapon', cur.conds?.disarmed > 0 ? '2 AP' : '1 AP', 'Until you do, you attack with your fists.'] as ActionItem] : []),
      ...(dual ? [] : reloadBothItems(cur)), // two guns: with the both-hands block on the Attack tab
      ...(cur && !cur.hidden && cur.side === 'pc' ? [['hide', 'Hide', '2 AP', 'You can Hide only when no enemy can see you, and never while Marked. While Hidden, enemies can\'t target you, and your first attack is an ambush: a critical hit on 19–20, and damage × your Ambush multiplier. Enemies look for you at the end of their turns.', (cb && cb.units.some((v: any) => v.side !== cur.side && !v.dead && !v.downed && unitSees(cb, v, cur.pos))) ? 'An enemy can see you.' : cur.conds?.marked > 0 ? 'You are Marked.' : null] as ActionItem] : []),
      ['analyze', 'Analyze', (cur ? analyzeCost(cur) : 2) + ' AP', 'Read one enemy within ' + (4 + (cur && cur.analysis || 0)) + ' tiles that you can see. The whole squad sees its HP, Defense, armour and status for the rest of the fight. No roll.']], null, 'utility'],
  ];
  // Perks and traits, then class moves: each item's actions as the engine lists them (hidden when they don't apply).
  const pk = perkEntries(opts.g, cb, cur, ch, 'combat');
  const pkItem = (e: PerkActionEntry): ActionItem => { const st = pkState(e); return [pkId(e), e.label + st.tag, pkCost(e), pkText(e), st.why]; };
  const perks = pk.filter((e) => e.tab === 'perks'), moves = pk.filter((e) => e.tab === 'class');
  // Rules 1.14, the perk card in a fight: USE NOW is the buttons; RIDES AN ACTION and ALWAYS ON are rows to read (no
  // Confirm), in that order (game/perkShelves.ts sorts them). Story-only items are not on the fight's card.
  const sh = perkShelves(opts.g, cb, cur, ch, { entries: perks, since: opts.since });
  const info = [...sh.rides, ...sh.always].map((r): ActionItem => [PKI + r.key, r.name, r.line, r.detail, null]);
  if (perks.length || info.length) ITEMS.push(['PERKS & TRAITS', [...perks.map(pkItem), ...info], null, 'perks']);
  if (moves.length) { const k = classOf(ch || (opts.g && cur?.charId ? opts.g.characters?.[cur.charId] : null), moves[0].cls); ITEMS.push(['CLASS · ' + (k ? k.name.toUpperCase() : 'MOVES'), moves.map(pkItem), k ? k.ink : null, 'class']); }
  // Magic, two groups that never mix: Sigils (Mind cyan) and Outbursts (Soul violet). Only for a unit that has magic.
  if (hasMagic) {
    const sig = words.length > 0 || mg.evoker, soul = designs.length > 0 || mg.emanator;
    // A focus counts only in a hand (spec: Hands 2, item 630): the buttons stay, greyed with the engine's reason.
    const evoWhy = mg.evoker ? undefined : NEEDS_EVOKER, emaWhy = mg.emanator ? undefined : NEEDS_EMANATOR;
    const MG: ActionGroup[] = [];
    if (sig) MG.push(['MAGIC · SIGILS', [
      ['draw', 'Draw a glyph', glyphApOf(cur) + ' AP', 'Pick a word on the glyph keyboard, then click your own tile. A tile holds one glyph. Step and draw again to walk a Line of 2 to 4 glyphs in a straight row. Each glyph costs its word\'s charge from your Evoker and adds its Flux.', evoWhy],
      ['evoke', 'Evoke', SPELL_AP.evoke + ' AP', 'Fire a Line of glyphs. It needs a Subject and at least one other word. Where you stand aims it: from an end, it fires along the Line; from the side, across it. Charge ' + mg.charge + '/' + CORE_CHARGE + '.', evoWhy],
      ['scuff', 'Scuff', SPELL_AP.scuff + ' AP', 'Wipe out the glyphs on the tile you stand on.'],
      ['vent', 'Vent Flux · ' + mg.flux + '/' + FLUX_MAX, magicAp(cur, 'vent') + ' AP', 'Pour all your Flux into the air. The mana meter rises by the same amount. If your Flux goes past ' + FLUX_MAX + ', the Evoker overloads.' + apNote(cur, 'vent'), evoWhy],
      ['core', 'Swap core', magicAp(cur, 'core') + ' AP', apNote(cur, 'core') + 'Load a fresh mana core with ' + CORE_CHARGE + ' charge. ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores') + ' carried.', evoWhy]], SIGIL_GLOW, 'sigils']);
    if (soul) MG.push(['MAGIC · OUTBURSTS', [
      // Rules 1.5, the heart cycle: Begin (or a snap cast) when nothing is held; Pump, Release, Steady, Let go, Feed and
      // Heart Overwatch while holding. Costs and refusals are the engine's (game/heartView.ts runs its previews).
      // Heart Overload's free Begin is said on the row itself, so it is seen without opening the designs (11 Nov 2026).
      ...(designs.length && !held ? [['outburst', 'Outburst', (() => { try { const c = designCards(cb, cur).find((x: any) => x.again); if (c) return 'Heart Overload: ' + c.name + ' again, 0 AP'; } catch { /* the plain line */ } return designs.length === 1 ? 'Begin ' + designAp(mg, designs[0]) + ' AP' : designs.length + ' designs'; })(), 'Begin a design and hold it at stage 0 (2 AP, or 1 AP with the Swift module). Pump it up a stage at a time, to stage 4 (1 AP each), then Release it (1 AP). Or Snap it: Begin and Release in one go for 3 AP, at ×0.6.' + (mg.emanator ? '' : ' With no Emanator in hand it draws on the air: no MP cost, but +2 Strain.')] as ActionItem] : []),
      ...(held ? (() => { const hp = cb ? heartPanel(cb, cur) : null; if (!hp) return [['release', 'Release · stage ' + held.stage, SPELL_AP.release + ' AP', 'Let the held Outburst go.'] as ActionItem];
        return [['pump', 'Pump · stage ' + hp.stage + (hp.pump.ok ? ' → ' + (hp.stage + 1) : ''), hp.pump.cost, 'Raise the held Outburst by 1 stage. Stages run from ×' + stageMult(0) + ' at stage 0 to ×' + stageMult(4) + ' at stage 4: a plain Pump adds +' + Math.round((stageMult(1) - stageMult(0)) * 10) / 10 + ', and a feeling adds its own step instead. One Pump a turn can cost 0 AP: your first of the fight, or one each round from Empathy 3.', hp.pump.ok ? null : hp.pump.why] as ActionItem,
          ['release', 'Release · stage ' + hp.stage + ' ×' + hp.mult, hp.release.cost, 'Fire ' + hp.name + ' at the stage reached (' + hp.shape + ').', hp.release.ok ? null : hp.release.why] as ActionItem,
          ['steady', 'Steady the heart', hp.steadyBtn.cost, hp.steadyBtn.title, hp.steadyBtn.ok ? null : hp.steadyBtn.why] as ActionItem,
          ['letgo', 'Let it go' + (hp.letgo.strainOff ? ' · −' + hp.letgo.strainOff + ' Strain' : ''), 'free', hp.letgo.title, hp.letgo.ok ? null : hp.letgo.why] as ActionItem,
          ...(hp.feedShow ? [['feed', 'Feed the glyph', hp.feed.cost, hp.feed.title, hp.feed.ok ? null : hp.feed.why] as ActionItem] : []),
          ['heartwatch', hp.watch ? 'Heart Overwatch · armed' : 'Heart Overwatch', 'free', hp.watchBtn.title, hp.watchBtn.ok ? null : hp.watchBtn.why] as ActionItem]; })() : []),
      ...(mg.emanator || (ch && focusHand(ch, 'emanator')) ? [['syphon', 'Syphon', SPELL_AP.syphon + ' AP', 'Draw MP from the air: ' + band.syphon_mp + ' MP in ' + BAND_NAME[band.id] + ' air, times your Syphon bonus. The mana meter drops.', emaWhy] as ActionItem,
        ['crystallise', 'Crystallise', SPELL_AP.crystallise + ' AP', 'Squeeze the air into one standard mana core. Needs ambient mana of 10 or more (Normal air or richer). The mana meter drops by 10.', emaWhy] as ActionItem] : [])], SOUL_INK, 'outbursts']);
    ITEMS.push(...MG.filter((gr) => gr[1].length));
  }
  // Faith (rules 1.6): Whispers, Hymns and the Miracle, in Virtue ink.
  const pray = prayerItems(opts.g, cur);
  if (pray.length) ITEMS.push(['FAITH · PRAYERS', pray, FAITH_INK, 'faith']);
  // Calls (the nine talking skills' actions in a fight): one row per Call the unit has a point for; no tab without one.
  const cl = callItems(opts.g, cb, cur);
  if (cl.length) ITEMS.push(['CALLS · SPOKEN TO SOMEONE WHO CAN HEAR YOU', cl as ActionItem[], null, 'calls']);
  // A unit with a fixed action list (the drone: move and a plain shot; spec 14 item 370) shows only those.
  const allowed: string[] | undefined = cur && cur.allowedActions;
  const LIST = allowed ? ITEMS.map(([n, items, ink, tab]) => [n, items.filter((it) => allowed.includes(it[0])), ink, tab] as ActionGroup).filter((gr) => gr[1].length) : ITEMS;
  if (opts.noNarrator) return LIST.map(([n, items, ink, tab]) => [n, items.filter((it) => it[2] !== 'Narrator'), ink, tab] as ActionGroup).filter((gr) => gr[1].length);
  return LIST;
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
    cmds.push({ action: 'pump', label: 'Pump', sub: full ? 'The heart is full (stage 4)' : 'Stage ' + st + ' → ' + (st + 1) + ' · ' + (free ? 'FREE' : '1 AP'), key: '1', off: full || (!free && (u.ap ?? 0) < 1) });
    cmds.push({ action: 'release', label: 'Release', sub: 'Stage ' + st + ' ×' + stageMult(st) + ' · 1 AP', key: '2', off: (u.ap ?? 0) < 1 });
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
  if (rl && !u.jammed) cmds.push({ action: 'reload', label: reloadItems(u)[0][1], sub: u.ammo + ' / ' + w.magazine + ' loaded', key: '3', off: u.ammo >= w.magazine });
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

/** Whom the unit could pull free now (rules 1.12): itself, an ally next to it, or a weapon left in someone next to it. */
export function pullFreeTargets(cb: any, cur: any): any[] {
  if (!cb || !cur) return [];
  const near = (v: any) => { const [ax, ay] = cur.pos.split(',').map(Number), [bx, by] = v.pos.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) <= 1; };
  return (cb.units as any[]).filter((v) => v.nailed && v.hp > 0 && (v.id === cur.id || (near(v) && (v.side === cur.side || v.nailed.weapon))));
}
function pullFreeItems(cb: any, cur: any): ActionItem[] {
  const ts = pullFreeTargets(cb, cur); if (!ts.length) return [];
  const t = ts[0], ap = t.nailed.ap, self = t.id === cur.id;
  const text = self ? 'You are nailed in place. Pull free to move again. A weapon left in you drops at your feet.'
    : t.side === cur.side ? 'Pull ' + t.name + ' free of what nails them in place. Pick them as the target if more than one is held.'
      : 'Pull the weapon out of ' + t.name + '. It goes to your free hand, or to the ground if you have none. This also frees them.';
  return [['pullfree', self ? 'Pull free' : t.side === cur.side ? 'Pull an ally free' : 'Pull the weapon out', ap + ' AP', text, cur.ap < ap ? 'Needs ' + ap + ' AP.' : null] as ActionItem];
}

/** The both-hands block's rows get "Reload both" after them (two guns), so the block is everything the pair does. */
function withBoth(items: ActionItem[], dual: boolean, cur: any): ActionItem[] {
  if (!dual) return items;
  const both = reloadBothItems(cur);
  if (!both.length) return items;
  let at = items.findIndex((it) => it[0] === 'tpad:both'); if (at < 0) at = items.findIndex((it) => it[0] === 'paired');
  return at < 0 ? items : [...items.slice(0, at + 1), ...both, ...items.slice(at + 1)];
}
