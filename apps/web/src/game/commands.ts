// The combat action list and the turn card's four commands, shared by the combat panel (screens/combat.js), the
// your-turn cut-in (game/turnIntro.tsx) and the dialog that customises it (game/commandsDialog.tsx).
//
// actionGroups() is the one list of actions a unit has (the panel's tabs show it); the cut-in's four commands are a
// smart default picked from the unit's state, which a player can override per character, slot by slot. The choice is a
// personal UI preference kept in this browser (localStorage 'phc.cutinCmds', keyed by character id), never game state.
import { WEAPON, isMelee, attackApCost, analyzeCost, ROUNDS_PER_AP, musicTraitOf, songOf, glyphApOf, SPELL_AP, CORE_CHARGE, FLUX_MAX, designAp, stageMult, manaBand, MANA_START } from '@engine';
import { SIGIL_GLOW, SOUL_INK } from './glyphs';

const HOSTILE_INK = '#F65157';
export const BAND_NAME: Record<string, string> = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
/** [id, label, cost text, explanation] */
export type ActionItem = [string, string, string, string];
/** [group title, items, family ink (or null), tab id] */
export type ActionGroup = [string, ActionItem[], string | null, string];
export const TAB_NAME: Record<string, string> = { move: 'Move', attack: 'Attack', utility: 'Utility', sigils: 'Sigils', outbursts: 'Outbursts' };

/** Every action this unit has, in tab order (Move · Attack · Utility · Sigils · Outbursts). ch: the unit's character
 *  (for stims and the song), or null. */
export function actionGroups(cb: any, cur: any, ch: any): ActionGroup[] {
  const w: any = cur ? (WEAPON as any)[cur.weapon] : null, melee = w ? isMelee(w) : false;
  const mv = cur ? cur.movement : 1;
  const heavy = w && /heavy/.test(w.category) && !isMelee(w), modes = (w && w.modes) || [];
  const offW: any = cur && cur.offWeapon ? (WEAPON as any)[cur.offWeapon] : null;
  const sk = w && w.grants, skFx = (sk && sk.effect) || {}, skRuns = ['multi_shot', 'sweep'].includes(skFx.op), skPassive = sk && !skRuns && skFx.op !== 'narrator';
  const loadInfo = (() => { if (!cur || !w || w.reload !== 'magazine' || !cur.mags) return null; const cap = w.magazine || 0, open = cur.mags.filter((n: number) => n < cap).sort((a: number, b: number) => b - a); if (!open.length || !cur.loose) return null; const r = Math.min(cap - open[0], cur.loose, cur.ap * ROUNDS_PER_AP); return { rounds: r, ap: Math.ceil(r / ROUNDS_PER_AP) }; })();
  const mg = cur && cur.mg, words = mg ? mg.words || [] : [], designs = mg ? mg.designs || [] : [];
  const hasMagic = !!(mg && (words.length || designs.length || mg.evoker || mg.emanator));
  const held = mg && mg.held, heldD = held ? designs.find((d: any) => d.id === held.design) || null : null;
  const band = manaBand(cb ? cb.mana ?? MANA_START : MANA_START);
  const ITEMS: ActionGroup[] = [
    ['MOVEMENT', [['move', 'Move', '1 AP / ' + mv + ' tiles', 'Each AP moves you ' + mv + ' tiles (Movement). Rough tiles count double. Leaving an enemy\'s reach without Disengaging invites an opportunity attack.'],
      ['sprint', 'Sprint', '2 AP', cur && cur.noSprint ? 'Not while Overburdened or in Juggernaut armour.' : 'Up to ' + Math.floor(3 * mv) + ' tiles (3 × Movement) for 2 AP.'],
      ['disengage', 'Disengage', '1 AP', 'Step 1 tile with no opportunity attacks.'],
      ['prone', cur && cur.prone ? 'Stand up' : 'Drop prone', '1 AP', 'Prone: ranged attacks against you −2, melee +2; you can\'t move until you stand.']], null, 'move'],
    ['ATTACK & DEFEND · ' + (w ? w.name.toUpperCase() : ''), [
      ...(melee ? [['melee', 'Strike', attackApCost(w, 'melee') + ' AP', 'd20 + ' + w.skill.replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.'] as ActionItem]
        : [['shot', 'Shot', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'd20 + Dexterity vs Defense; −5 if they\'re behind half cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'] as ActionItem,
          ['aimed', 'Aimed shot', '3 AP', '+2 to hit; crits on 19–20.'] as ActionItem,
          ...(modes.includes('burst') ? [['burst', 'Burst', '3 AP', '3 rounds at one target, each later round −1 more.'] as ActionItem] : []),
          ...(modes.includes('auto') ? [['auto', 'Full auto', '4 AP', '10 rounds: one roll at −2 against every enemy near the line to your target.'] as ActionItem] : []),
          ['melee', 'Melee (fists)', '2 AP', 'd20 + Raw Power vs Defense. 10 damage.'] as ActionItem]),
      ...(sk ? [['skill', sk.name + (skPassive ? ' (always on)' : ''), skRuns ? skFx.ap + ' AP' : skPassive ? '—' : 'Narrator', sk.text + (skPassive ? ' The engine applies it on every attack.' : skRuns ? '' : ' The engine doesn\'t run this one yet: use Say, and the Narrator rules it after the fight.')] as ActionItem] : []),
      ...(offW ? [['paired', 'Both hands (' + offW.name + ')', 'AP +1', 'Attack with both weapons in one action: AP = the higher cost + 1. Main hand −1, off hand −3 (better by 1 per 3 points in its skill).'] as ActionItem] : []),
      ['shove', 'Shove', '2 AP', 'An adjacent enemy: d20 + Raw Power vs 10 + its best of Raw Power and Athletics. Pushed 1 tile, or prone if blocked. Shove them into fire.'],
      ['overwatch', 'Overwatch', (w ? attackApCost(w, melee ? 'melee' : 'shot') : 2) + ' AP', 'Hold a shot until your next turn: the first enemy that moves in your sight and range takes it, as your reaction.'],
      ...(heavy ? [['brace', 'Brace', '1 AP', 'Set the weapon: no −2 for the LMG, the .700 can fire, Recoil halved. Moving ends it.'] as ActionItem] : []),
      ['cover', 'Shoot an object', (w ? attackApCost(w, 'shot') : 2) + ' AP', 'Cover, a barricade, a door, a barrel, a lamp: no roll, your weapon\'s damage to its HP. Broken cover becomes rubble; barrels explode.']], HOSTILE_INK, 'attack'],
    ['UTILITY', [['reload', 'Reload', '2 AP', !w || w.magazine == null ? 'Nothing to reload.' : w.reload === 'loose' ? 'Top up from loose rounds (' + (cur.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + (w.reload_unit || 'magazine') + ' (' + (cur.mags ? cur.mags.length + ' left' : 'unlimited') + '). The one in the gun drops on the floor with any rounds left in it. ' + cur.ammo + ' / ' + w.magazine + ' loaded now.'],
      ['load', 'Load a magazine', loadInfo ? loadInfo.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', loadInfo ? 'Load ' + loadInfo.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : 'Load loose rounds into an empty or part-empty magazine, 1 AP per ' + ROUNDS_PER_AP + ' rounds. You need both.'],
      ['clear', 'Clear a jam', '2 AP', 'A jammed gun can\'t fire until cleared.'],
      ['repair', 'Field Repair', '2 AP', 'Proficiency 3+, one spare-parts charge (' + (cur && cur.parts || 0) + ' left): +10% durability, +5% per Proficiency above 3. Weapon ' + (cur && cur.maxDur ? (cur.dur ?? cur.maxDur) + '/' + cur.maxDur : 'n/a') + '.'],
      ['pickup', 'Pick up', '1 AP', 'Take everything on your tile or one adjacent tile (marked ▪): dropped magazines, empty or not.'],
      ['door', 'Open or close a door', '1 AP', 'An adjacent door. Closed, it blocks movement and sight. Locked doors need a check after the fight, or enough damage.'],
      ['stim', 'Stim an ally', '1–2 AP', 'Adjacent ally: stabilise a Downed ally at 1 HP (1 AP for a Medic, 2 for others), or heal 30 × your Healing given. Stops Bleeding. Uses a stim' + (ch ? ' (' + ch.stims + ' left)' : '') + '.'],
      ...(ch && musicTraitOf(ch) && songOf(ch) ? [['song', 'Play my song', '2 AP', 'Your Musek Blestor: your favourite song takes over the room until the fight ends, and your music trait\'s bonus is on while it plays. It can replace another holder\'s kept-on song, never a spotlight.'] as ActionItem] : []),
      ['analyze', 'Analyze', (cur ? analyzeCost(cur) : 2) + ' AP', 'Read one enemy: its HP, Defense, armour and status, for the whole squad, the rest of the fight. Range ' + (4 + (cur && cur.analysis || 0)) + ' tiles; needs line of sight. No roll.']], null, 'utility'],
  ];
  // Magic, two groups that never mix: Sigils (Mind cyan) and Outbursts (Soul violet). Only for a unit that has magic.
  if (hasMagic) {
    const sig = words.length > 0 || mg.evoker, soul = designs.length > 0 || mg.emanator;
    const MG: ActionGroup[] = [];
    if (sig) MG.push(['MAGIC · SIGILS', [
      ['draw', 'Draw a glyph', glyphApOf(cur) + ' AP', 'Pick a word on the glyph keyboard, then your own tile or one next to you. It costs the word\'s charge from your Evoker and adds 1 Flux.'],
      ['evoke', 'Evoke', SPELL_AP.evoke + ' AP', 'Fire a pattern of glyphs: a Stack (2 on one tile), a Line (a straight row, fired from its far end) or a Ring (around one empty tile). Stand on or next to it. Charge ' + mg.charge + '/' + CORE_CHARGE + '.'],
      ['scuff', 'Scuff', SPELL_AP.scuff + ' AP', 'Wipe out the glyphs on the tile you stand on.'],
      ['vent', 'Vent Flux · ' + mg.flux + '/' + FLUX_MAX, SPELL_AP.vent + ' AP', 'Pour your Flux into the air: the mana meter rises by as much. Past ' + FLUX_MAX + ' Flux the Evoker overloads.'],
      ['core', 'Swap core', SPELL_AP.core + ' AP', 'Load a fresh mana core: ' + CORE_CHARGE + ' charge. ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores') + ' carried.']], SIGIL_GLOW, 'sigils']);
    if (soul) MG.push(['MAGIC · OUTBURSTS', [
      ...(designs.length ? [['outburst', 'Outburst', designs.length === 1 ? designAp(mg, designs[0]) + ' AP' : designs.length + ' designs', 'Pull the bots through your heart: pick a design, then let it go at once or hold it. Held, it grows a stage each turn and strains you.'] as ActionItem] : []),
      ...(held ? [['release', 'Release · stage ' + held.stage, SPELL_AP.release + ' AP', 'Let the held ' + (heldD ? heldD.name : 'Outburst') + ' go at stage ' + held.stage + ' (×' + stageMult(held.stage) + ').'] as ActionItem] : []),
      ...(mg.emanator ? [['syphon', 'Syphon', SPELL_AP.syphon + ' AP', 'Draw MP from the air (' + band.syphon_mp + ' in ' + BAND_NAME[band.id] + ' air, times your Syphon bonus). The meter drops.'] as ActionItem,
        ['crystallise', 'Crystallise', SPELL_AP.crystallise + ' AP', 'Squeeze the air into one standard mana core. Needs mana 10 or more (Normal air or richer); the meter drops by 10.'] as ActionItem] : [])], SOUL_INK, 'outbursts']);
    ITEMS.push(...MG.filter((gr) => gr[1].length));
  }
  return ITEMS;
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
    if (gun && (u.ammo ?? 0) <= 0) return 'Empty: reload.';
  }
  if (['move', 'sprint', 'disengage'].includes(action) && u.prone) return 'Prone: stand up first.';
  if (action === 'sprint' && u.noSprint) return 'Can\'t sprint in this load.';
  if (action === 'reload') { if (!gun) return 'Nothing to reload.'; if ((u.ammo ?? 0) >= w.magazine) return 'Already full.'; if (u.jammed) return 'Jammed: clear it first.'; if (w.reload === 'loose' ? !(u.loose > 0) : Array.isArray(u.mags) && !u.mags.length) return 'Nothing left to load.'; }
  if (action === 'clear' && !u.jammed) return 'Not jammed.';
  if (action === 'skill') {
    if (!['multi_shot', 'sweep'].includes(skFx.op)) return skFx.op === 'narrator' || !skFx.op ? 'The Narrator rules it: use Say.' : 'Always on.';
    if (u.jammed && skFx.op === 'multi_shot') return 'Jammed: clear it first.';
    if (skFx.op === 'multi_shot' && gun && (u.ammo ?? 0) <= 0) return 'Empty: reload.';
  }
  if (action === 'release' && !(mg && mg.held)) return 'Nothing held.';
  if (action === 'outburst' && mg && mg.held) return 'Already holding one.';
  if (action === 'vent' && mg && !(mg.flux > 0)) return 'No Flux to vent.';
  if (action === 'core' && mg && !(mg.cores > 0)) return 'No spare cores.';
  if (action === 'repair' && !(u.parts > 0)) return 'No spare parts.';
  const n = /^(\d+(?:\.\d+)?)\s*(?:–\d+\s*)?AP/.exec(cost || '');
  if (n && ap < Number(n[1])) return 'Needs ' + n[1] + ' AP.';
  if (ap <= 0) return 'No AP left.';
  return null;
}

/** Every action the unit has, flat, with its tab and why it can't be used right now (null when it can). */
export function catalogue(cb: any, u: any, ch: any): CatEntry[] {
  if (!u) return [];
  return actionGroups(cb, u, ch).flatMap(([, items, ink, tab]) => items.map(([action, label, cost, text]) => ({ action, label, cost, text, tab, ink, why: whyNot(u, action, cost) })));
}

/** The smart default: an attack (or Clear jam), Move, Reload (or Shove), then the unit's signature move. */
export function smartCommands(u: any): Command[] {
  const w: any = (WEAPON as any)[u.weapon], melee = w ? isMelee(w) : true, mg = u.mg;
  const sk: any = w && w.grants, skFx: any = sk?.effect || {};
  const cmds: Command[] = [];
  if (u.jammed) cmds.push({ action: 'clear', label: 'Clear jam', sub: 'The gun is jammed', key: '1' });
  else if (melee) cmds.push({ action: 'melee', label: 'Strike', sub: (w ? attackApCost(w, 'melee') : 2) + ' AP · ' + (w ? w.name : 'fists'), key: '1' });
  else cmds.push({ action: 'shot', label: 'Shoot', sub: attackApCost(w, 'shot') + ' AP · ' + w.name, key: '1', off: u.ammo <= 0 });
  cmds.push({ action: 'move', label: 'Move', sub: u.movement + ' tiles per AP', key: '2', off: !!u.prone });
  if (w && w.magazine != null && !u.jammed) cmds.push({ action: 'reload', label: 'Reload', sub: u.ammo + ' / ' + w.magazine + ' loaded', key: '3', off: u.ammo >= w.magazine });
  else if (!u.jammed) cmds.push({ action: 'shove', label: 'Shove', sub: 'Push an adjacent enemy', key: '3' });
  else cmds.push({ action: 'move', label: 'Take cover', sub: 'Move out of sight', key: '3' });
  if (mg?.held) cmds.push({ action: 'release', label: 'Release', sub: 'Held Outburst · stage ' + mg.held.stage, key: '4' });
  else if (mg && (mg.emanator || mg.designs?.length) && mg.designs?.length) cmds.push({ action: 'outburst', label: 'Outburst', sub: Math.round(mg.mp) + ' MP in the heart', key: '4' });
  else if (mg && (mg.evoker || mg.words?.length)) cmds.push({ action: 'draw', label: 'Draw a glyph', sub: 'Evoker ' + mg.charge + ' charge', key: '4' });
  else if (sk && (skFx.op === 'multi_shot' || skFx.op === 'sweep')) cmds.push({ action: 'skill', label: sk.name, sub: skFx.ap + ' AP · ' + (skFx.op === 'multi_shot' ? (skFx.shots || 3) + ' shots at one target' : 'every adjacent enemy'), key: '4', off: u.jammed || u.ap < (skFx.ap || 0) || (skFx.op === 'multi_shot' && w.magazine != null && u.ammo <= 0) });
  else cmds.push({ action: 'overwatch', label: 'Overwatch', sub: 'Hold a shot for their move', key: '4' });
  return cmds;
}

/** Spare picks when a smart slot would repeat a command the player put in another slot. */
const SPARE = ['overwatch', 'aimed', 'sprint', 'shove', 'reload', 'analyze', 'stim', 'prone', 'disengage', 'melee'];

/** The four commands for this unit: each slot the player set (if the unit still has that action; greyed with the reason
 *  when it can't be used now), else the smart default for that slot. */
export function resolveCommands(cb: any, u: any, ch: any, prefs: (string | null)[] = []): Command[] {
  const smart = smartCommands(u);
  if (!prefs.some(Boolean)) return smart;
  const cat = catalogue(cb, u, ch), by = new Map(cat.map((e) => [e.action, e]));
  const picked = new Set(prefs.filter((a): a is string => !!a && by.has(a)));
  const used = new Set<string>(), out: Command[] = [];
  for (let i = 0; i < 4; i++) {
    const key = String(i + 1), a = prefs[i], e = a ? by.get(a) : undefined;
    if (e && !used.has(e.action)) {
      used.add(e.action);
      out.push({ action: e.action, label: e.label, sub: e.why ? 'Not now: ' + e.why.replace(/\.$/, '') : e.cost + (e.tab === 'attack' && (WEAPON as any)[u.weapon] ? ' · ' + (WEAPON as any)[u.weapon].name : ''), key, off: !!e.why, custom: true });
      continue;
    }
    let s: Command | undefined = smart[i];
    if (s && (picked.has(s.action) || used.has(s.action))) {
      const spare = SPARE.map((x) => by.get(x)).find((x) => x && !picked.has(x.action) && !used.has(x.action));
      s = spare ? { action: spare.action, label: spare.label, sub: spare.why ? 'Not now: ' + spare.why.replace(/\.$/, '') : spare.cost, key, off: !!spare.why } : s;
    }
    if (s) { used.add(s.action); out.push({ ...s, key }); }
  }
  return out;
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
/** Ask the turn intro (mounted over every screen) to open the customise dialog for a character. */
export function openCustomise(charId: string | null | undefined) {
  if (!charId) return;
  try { window.dispatchEvent(new CustomEvent(EV_CUSTOMISE, { detail: { charId } })); } catch { /* */ }
}
/** For tests. */
export const _resetPrefCache = () => { prefCache = null; };
