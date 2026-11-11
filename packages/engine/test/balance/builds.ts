// @ts-nocheck (a measuring tool: it drives the engine's own rules and is checked by balance-sim.test.ts)
// The balance pass, instrument 2 (docs/design/proposals/2026-11-balance-pass.md, section 3): THE REFERENCE BUILDS.
// One build per way to fight, at levels 1, 3, 6, 9, 12 and 20, in two variants ("normal share" and "all in"), made
// LEGALLY: the sheet goes through char/add (the reducer's own creation check), every level is applyLevels, every point
// is a levelup/raise the engine accepts (canRaise), the class is a levelup/class the engine accepts (classPickError),
// every perk step is one pendingPerkSteps offers. Nothing here writes a skill, attribute, class or perk by hand.
//
//   import { buildCharacter, BUILDS, LEVELS } from './builds';
//   const b = buildCharacter('opt_gun', 'normal', 9);   // { c: Character, notes: [...], def }
//
// WHAT IS AN ASSUMPTION (earned by play, not by level; the report lists them): weapon drill marks, Sigil words studied,
// Devotion, gear quality and armour class. They are set with the engine's own functions (addDrill, addStudy +
// learnStudied, setDevotionXp, equip) so the rules that gate them still apply.
import {
  apply, newGame, bindGame, SKILL, SKILLS, ATTRS, CLASS, WEAPON, ITEM, PERK, TECHNIQUE, TECHNIQUES, PHYS_RULES,
  applyLevels, canRaise, attrCapAt, pendingPerkSteps, classPickError, eligibleClasses, classRank, xpForLevel, levelGains,
  validateSheet, deriveCreation, BUDGET, maxHp, gearEntry, equip, magsOf, roundsOf, armourGateWhy, requiresWhy,
  devotionThreshold, setDevotionXp, wordsKnownCap, readyCap, picksOwed, pickable, startingTechniqueSlots, weaponSystem, weaponTeaches,
  stepsEarned, stepsTaken, movement, overweightKg,
} from '../../src';
import { addStudy, learnStudied, thresholdN, growthOf } from '../../src/sigilgrowth';
import { addDrill, takePick, ensurePhys } from '../../src/physical/data';

export const LEVELS = [1, 3, 6, 9, 12, 20];
export type Variant = 'normal' | 'allin';
export const VARIANTS: Variant[] = ['normal', 'allin'];
/** "Normal share" (section 7 item 2 of the balance pass): this part of all Skill points is in the main attack skill. */
export const NORMAL_SHARE = 0.36;

export interface BuildDef {
  id: string; label: string; way: string; kit: string; main: string; classId: string;
  /** normal share: the part of all Skill points each skill gets (the main skill's is NORMAL_SHARE) */ weights: Record<string, number>;
  /** all in: skills in the order they are filled to the ceiling */ allin: string[];
  /** where spare Attribute points go, in turn (never above the class attribute) */ spare: string[];
  weapon?: string; rarity?: string; offHand?: string; armour?: number;
  /** perk steps: 'none' (a plain build takes none), or the perks preferred, in order (else the first one offered) */ perks: 'none' | string[];
  /** techniques: 'default' (the engine's starting four) or the list preferred, best first (creation picks, then drill picks) */ techniques: 'default' | string[];
  belief?: any; sigils?: string[]; words?: string[];
  policy: string; note: string;
}

const W = (o: Record<string, number>) => o;
export const BUILDS: BuildDef[] = [
  { id: 'plain_gun', label: 'Plain gun', way: 'a', kit: 'soldier', main: 'dexterity', classId: 'marksman', policy: 'plain',
    weights: W({ dexterity: NORMAL_SHARE, athletics: 0.16, pain_threshold: 0.14, vigilant: 0.12, guts: 0.12, reaction_speed: 0.10 }),
    allin: ['dexterity', 'athletics', 'reaction_speed', 'pain_threshold', 'guts', 'vigilant'], spare: ['endurance', 'perception', 'strength'],
    perks: 'none', techniques: 'default', note: 'Service rifle (standard), plain shots only. No perk steps taken. The yardstick: 100%.' },
  { id: 'plain_blade', label: 'Plain blade', way: 'b', kit: 'soldier', main: 'dexterity', classId: 'marksman', policy: 'plain', weapon: 'sabre',
    weights: W({ dexterity: NORMAL_SHARE, athletics: 0.16, pain_threshold: 0.14, guts: 0.12, durability: 0.12, reaction_speed: 0.10 }),
    allin: ['dexterity', 'athletics', 'reaction_speed', 'pain_threshold', 'guts', 'durability'], spare: ['endurance', 'strength', 'perception'],
    perks: 'none', techniques: 'default', note: 'Sabre (standard), plain cuts only. No perk steps taken. A sabre hits with Dexterity, so the class the rules give at level 3 is Marksman.' },
  { id: 'opt_gun', label: 'Optimised gun', way: 'c', kit: 'soldier', main: 'dexterity', classId: 'marksman', policy: 'optimised', weapon: 'long_rifle', rarity: 'masterwork', armour: 3,
    weights: W({ dexterity: NORMAL_SHARE, athletics: 0.14, analysis: 0.12, ingenuity: 0.10, reaction_speed: 0.10, pain_threshold: 0.10, vigilant: 0.08 }),
    allin: ['dexterity', 'athletics', 'reaction_speed', 'ingenuity', 'analysis', 'vigilant', 'pain_threshold'], spare: ['perception', 'endurance', 'strength'],
    perks: ['running_reload', 'both_hands', 'roll_with_it', 'rounding_up'],
    techniques: ['dead_centre', 'called_shot', 'bead', 'mag_dump', 'punch_through', 'walking_fire', 'snap_shot', 'last_round', 'stopping_shot', 'suppress', 'shift'],
    note: 'Long rifle (Masterwork), Marksman, the best ranged techniques it can ready, perk steps in its skills.' },
  { id: 'opt_blade', label: 'Optimised blade', way: 'd', kit: 'soldier', main: 'raw_power', classId: 'fighter', policy: 'optimised', weapon: 'adamantile_greatsword', rarity: 'masterwork', armour: 3,
    weights: W({ raw_power: NORMAL_SHARE, guts: 0.14, athletics: 0.14, pain_threshold: 0.12, durability: 0.10, reaction_speed: 0.08, intimidation: 0.06 }),
    allin: ['raw_power', 'guts', 'intimidation', 'athletics', 'pain_threshold', 'durability', 'reaction_speed'], spare: ['endurance', 'agility', 'perception'],
    perks: ['breaching_strike', 'iron_grip', 'iron_stomach', 'roll_with_it', 'used_to_the_pain'],
    techniques: ['lunge', 'sweep', 'cleave', 'coup', 'sunder', 'break', 'charge', 'hamstring', 'half_sword', 'riposte', 'parry', 'sidestep'],
    note: 'Greatsword (Masterwork), Fighter (a Raw Power weapon, so Strength is the highest attribute), the best melee techniques it can ready.' },
  { id: 'tank', label: 'Tank', way: 'e', kit: 'soldier', main: 'durability', classId: 'defender', policy: 'tank', weapon: 'sabre', rarity: 'masterwork', offHand: 'riot_shield', armour: 5,
    weights: W({ durability: 0.30, pain_threshold: 0.22, dexterity: 0.22, guts: 0.10, athletics: 0.08, sensory: 0.08 }),
    allin: ['durability', 'pain_threshold', 'dexterity', 'guts', 'athletics', 'sensory'], spare: ['strength', 'agility', 'perception'],
    perks: ['bulwark', 'used_to_the_pain', 'scar_tissue', 'shrug_it_off', 'iron_stomach'],
    techniques: ['lunge', 'riposte', 'parry', 'sidestep', 'coup', 'half_sword'],
    note: 'Sabre (Masterwork) and riot shield, the heaviest armour Pain Threshold allows, Defender. Its main skill is Durability (Guard), not its weapon skill.' },
  { id: 'sigil', label: 'Sigil caster', way: 'f', kit: 'sigil', main: 'brain_power', classId: 'mage', policy: 'sigil', armour: 1,
    weights: W({ brain_power: NORMAL_SHARE, visualization: 0.16, rumination: 0.10, athletics: 0.10, pain_threshold: 0.10, proficiency: 0.08, dexterity: 0.10 }),
    allin: ['brain_power', 'rumination', 'eloquence', 'visualization', 'proficiency', 'athletics', 'pain_threshold'], spare: ['expression', 'endurance', 'agility'],
    perks: ['hold_the_stroke', 'parallel_thought', 'rounding_up', 'roll_with_it'], techniques: 'default',
    sigils: ['fire', 'seek'], words: ['condense', 'stone', 'spread', 'shock', 'kin', 'leech', 'chain', 'freeze', 'arc', 'acid', 'bind', 'ward', 'mend', 'step'],
    note: 'Evoker and the kit\'s service pistol, Mage. Words: FIRE and SEEK at creation, then the damage words as fast as study and Brain Power allow.' },
  { id: 'outburst', label: 'Outburst caster', way: 'g', kit: 'soul', main: 'will_power', classId: 'channeler', policy: 'outburst', armour: 1,
    weights: W({ will_power: NORMAL_SHARE, empathy: 0.16, composure: 0.12, lore_master: 0.08, pain_threshold: 0.10, athletics: 0.10, conscience: 0.08 }),
    allin: ['will_power', 'composure', 'lore_master', 'empathy', 'camaraderie', 'pain_threshold', 'athletics'], spare: ['insight', 'virtue', 'endurance'],
    perks: ['resonance', 'heart_overload', 'rite_in_the_field', 'roll_with_it'], techniques: 'default',
    note: 'Emanator and the kit\'s revolver, Channeler. Design: the starting Heart Bolt (Damage, reach 8).' },
  { id: 'faith', label: 'Faith build', way: 'h', kit: 'soldier', main: 'faith', classId: 'guardian', policy: 'faith', armour: 3,
    weights: W({ faith: NORMAL_SHARE, dexterity: 0.20, conscience: 0.10, authority: 0.08, pain_threshold: 0.10, athletics: 0.10, guts: 0.06 }),
    allin: ['faith', 'conscience', 'authority', 'dexterity', 'athletics', 'pain_threshold', 'guts'], spare: ['agility', 'endurance', 'perception'],
    perks: ['litany', 'holy_ordnance', 'outclassed', 'roll_with_it'], techniques: 'default',
    belief: { kind: 'faithful', patron: 'old_overcast' },
    note: 'Sworn to Old Overcast (the damage patron), service rifle (standard), Guardian. Hymns as Devotion allows, plain shots between them.' },
  { id: 'calls', label: 'Calls leader', way: 'i', kit: 'medic', main: 'authority', classId: 'guardian', policy: 'calls', armour: 2,
    weights: W({ authority: 0.20, charisma: 0.18, intimidation: 0.10, vigilant: 0.10, dexterity: 0.12, eloquence: 0.08, implication: 0.06, reaction_speed: 0.06, lore_master: 0.05, sensory: 0.05 }),
    allin: ['authority', 'charisma', 'intimidation', 'vigilant', 'eloquence', 'implication', 'reaction_speed', 'lore_master', 'sensory', 'dexterity'], spare: ['endurance', 'agility', 'perception'],
    perks: ['outclassed', 'talks_broke_down', 'crowd_pleaser'], techniques: 'default',
    note: 'The nine gamma skills (Authority and Charisma first) and the kit\'s service pistol. Class: Guardian (Virtue).' },
];
export const BUILD: Record<string, BuildDef> = Object.fromEntries(BUILDS.map((b) => [b.id, b]));

// ---------- assumptions for what play earns (stated in the report; "proposed" numbers, not rules) ----------
/** Drill marks reached on the build's own weapon, by level (optimised and tank builds). */
export const DRILL_MARKS_AT = (level: number) => (level >= 9 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0);
/** Devotion level of the Faith build, by level (creation gives 3). */
export const DEVOTION_AT = (level: number) => (level >= 20 ? 10 : level >= 9 ? 7 : level >= 6 ? 5 : 3);
/** Sigil words: study picks taken, by level (each still needs a free slot under the Brain Power cap). */
/** A reference build is never slower than this many tiles an AP by its own choice of armour. */
export const MIN_MOVE = 1;
export const WORD_PICKS_AT = (level: number) => (level >= 20 ? 14 : level >= 12 ? 8 : level >= 9 ? 6 : level >= 6 ? 4 : level >= 3 ? 2 : 0);

const attrOf = (skill: string) => SKILL[skill].attribute;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
/** What the plan wants next: skills ordered by how far each is behind its share of `total` points. */
function wanted(def: BuildDef, variant: Variant, skills: Record<string, number>, total: number): string[] {
  if (variant === 'allin') return [...def.allin, ...Object.keys(def.weights).filter((s) => !def.allin.includes(s))];
  const ws = def.weights, wt = sum(ws);
  return Object.keys(ws).sort((a, b) => (ws[b] / wt * total - (skills[b] || 0)) - (ws[a] / wt * total - (skills[a] || 0)));
}

/** The creation sheet: 10 Skill points placed by the plan, the Attribute points they need, the spare ones by `spare`. */
export function creationSheet(def: BuildDef, variant: Variant) {
  const skills: Record<string, number> = {}, attrs: Record<string, number> = Object.fromEntries(ATTRS.map((a) => [a.id, 1]));
  let sp = BUDGET.skill, ap = BUDGET.attr; const cap = BUDGET.attrCap, mainAttr = CLASS[def.classId].attribute;
  while (sp > 0) {
    let done = false;
    for (const s of wanted(def, variant, skills, BUDGET.skill)) {
      const p = (skills[s] || 0) + 1, a = attrOf(s), need = Math.max(0, p - attrs[a]);
      if (p > cap || need > ap) continue;
      if (a !== mainAttr && p > attrs[mainAttr] && attrs[mainAttr] < cap) continue; // the class attribute stays the highest
      skills[s] = p; attrs[a] += need; ap -= need; sp--; done = true; break;
    }
    if (!done) throw new Error(def.id + ' ' + variant + ': no legal place for a Skill point at creation');
  }
  // spare Attribute points: the `spare` attributes in turn, never above the class attribute; when none can take one, the class attribute itself
  for (let i = 0, guard = 0; ap > 0 && guard < 200; guard++) {
    const a = def.spare.map((_, j) => def.spare[(i + j) % def.spare.length]).find((x) => attrs[x] < cap && attrs[x] + 1 <= attrs[mainAttr] - (variant === 'allin' ? 1 : 0));
    if (a) { attrs[a]++; ap--; i = def.spare.indexOf(a) + 1; continue; }
    if (attrs[mainAttr] < cap) { attrs[mainAttr]++; ap--; continue; }
    const b = ATTRS.map((x) => x.id).find((x) => attrs[x] < attrs[mainAttr]); if (!b) throw new Error(def.id + ': no place for an Attribute point'); attrs[b]++; ap--;
  }
  return { name: def.label, portrait: '', origin: 'Thousand-Planet frontier', kit: def.kit, traits: [], skills, attrs, cores: { body: 1, mind: 1, soul: 1 }, identity: {},
    ...(def.belief ? { belief: def.belief } : {}), ...(def.sigils ? { sigils: def.sigils } : {}) };
}

export interface Built { def: BuildDef; variant: Variant; level: number; c: any; notes: string[]; classWanted: boolean; unspent: { skill: number; attr: number }; perkStepsLeft: number }
const CACHE = new Map<string, string>();

/** Build one reference character through the reducer. The result is a plain Character (a copy each call). */
export function buildCharacter(id: string, variant: Variant, level: number): Built {
  const def = BUILD[id], k = id + '|' + variant + '|' + level, hit = CACHE.get(k);
  if (hit) return { ...JSON.parse(hit), def };
  const notes: string[] = [];
  let g = newGame('BUILD-' + k, { id: 'host', name: 'Host' });
  g = apply(g, { type: 'char/add', sheet: creationSheet(def, variant) }, 'host'); // the engine's own lock-in check
  g = apply(g, { type: 'session/start' }, 'host');
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'Built.', sceneTitle: 'Build' } }, 'host');
  const cid = Object.keys(g.characters)[0];
  const C = () => g.characters[cid];
  const act = (a: any) => { g = apply(g, { charId: cid, ...a }, 'host'); };
  const mainAttr = CLASS[def.classId].attribute;
  let classWanted = true;
  for (let lv = 2; lv <= level; lv++) {
    { const c = C(); c.xp = xpForLevel(lv); const was = bindGame(g); try { applyLevels(c); } finally { bindGame(was); } }
    if (C().level !== lv) throw new Error(k + ': level ' + lv + ' was not reached');
    // Skill points, in the plan's order; an Attribute point is spent when the skill needs it.
    for (let guard = 0; C().unspent.skill > 0 && guard < 60; guard++) {
      const c = C(), total = sum(c.skills) + c.unspent.skill; let done = false;
      for (const s of wanted(def, variant, c.skills, total)) {
        if ((c.skills[s] || 0) >= 10) continue;
        const a = attrOf(s), needAttr = (c.skills[s] || 0) + 1 > (c.attrs[a] || 1);
        if (needAttr) { if (a !== mainAttr && (c.attrs[a] || 1) + 1 > (c.attrs[mainAttr] || 1)) continue; if (canRaise(c, 'attr', a)) continue; act({ type: 'levelup/raise', kind: 'attr', id: a }); }
        if (canRaise(C(), 'skill', s)) continue;
        act({ type: 'levelup/raise', kind: 'skill', id: s }); done = true; break;
      }
      if (done) continue;
      // every planned skill is at a ceiling: the point goes to any skill the engine will take it in (a defence skill first)
      const any = [...SKILLS].sort((x, y) => (x.slot === 'beta' ? 0 : 1) - (y.slot === 'beta' ? 0 : 1)).find((s) => !canRaise(C(), 'skill', s.id));
      if (!any) break; act({ type: 'levelup/raise', kind: 'skill', id: any.id });
    }
    // Spare Attribute points: all in holds back what the class attribute will take at the next ceiling.
    for (let i = 0, guard = 0; guard < 40; guard++) {
      const c = C(), reserve = Math.max(0, 10 - (c.attrs[mainAttr] || 1));
      if (c.unspent.attr <= 0) break;
      if (!canRaise(c, 'attr', mainAttr) && (variant === 'allin' || (c.skills[def.main] || 0) >= (c.attrs[mainAttr] || 1))) { act({ type: 'levelup/raise', kind: 'attr', id: mainAttr }); continue; }
      if (variant === 'allin' && c.unspent.attr <= reserve) break;
      const a = def.spare.map((_, j) => def.spare[(i + j) % def.spare.length]).find((x) => !canRaise(c, 'attr', x) && (c.attrs[x] || 1) + 1 <= (c.attrs[mainAttr] || 1))
        || ATTRS.map((x) => x.id).find((x) => !canRaise(c, 'attr', x) && (c.attrs[x] || 1) + 1 <= (c.attrs[mainAttr] || 1));
      if (!a) break; i++; act({ type: 'levelup/raise', kind: 'attr', id: a });
    }
    // The class, at level 3: the one the rules give (the highest attribute).
    if (lv >= 3 && !C().classId) {
      const el = eligibleClasses(C()).map((x) => x.id), pick = el.includes(def.classId) ? def.classId : el[0];
      if (pick !== def.classId) { classWanted = false; notes.push('class: ' + def.classId + ' was wanted, the rules give ' + el.join(' or ')); }
      if (classPickError(C(), pick)) throw new Error(k + ': ' + classPickError(C(), pick));
      act({ type: 'levelup/class', classId: pick });
    }
    takePerks();
  }
  takePerks();
  function takePerks() {
    if (def.perks === 'none') return;
    for (let guard = 0; guard < 40; guard++) {
      const steps = pendingPerkSteps(C()); if (!steps.length) break;
      const all = steps.flatMap((s) => s.choices), pref = (def.perks as string[]).map((p) => all.find((x) => x.id === p)).find(Boolean) || all[0];
      act({ type: 'levelup/perk', perkId: pref.id });
    }
  }
  // ---------- what play earns: gear, drill, words, Devotion (assumptions; the engine's own functions and gates) ----------
  const c = C(), was = bindGame(g);
  try {
    if (def.weapon && def.weapon !== c.weapon || (def.rarity && def.rarity !== 'standard')) {
      const wid = def.weapon || c.weapon, e = gearEntry(wid, { rarity: def.rarity || 'standard' });
      const rq = requiresWhy(c, (WEAPON[wid] as any).requires);
      if (rq) notes.push('weapon: ' + wid + ' refused (' + rq + '); it keeps the kit\'s');
      else { c.pack = [...(c.pack || []), e]; const err = equip(c, c.pack.length - 1, 'main'); if (err) throw new Error(k + ': equip ' + wid + ': ' + err);
        const w = WEAPON[wid]; if (w.magazine != null) { c.loaded = w.magazine; c.pack = [...c.pack.filter((x) => x.weapon !== wid || !x.mags), w.reload === 'loose' ? roundsOf(w.ammo, w.magazine * 6) : magsOf(wid, 4), ...(w.reload === 'loose' || !w.ammo ? [] : [roundsOf(w.ammo, w.magazine * 2)])]; } }
    }
    if (def.offHand) { const e = gearEntry(def.offHand, {}); c.pack = [...(c.pack || []), e]; const err = equip(c, c.pack.length - 1, 'off'); if (err) notes.push('off hand: ' + def.offHand + ' refused (' + err + ')'); }
    if (def.armour != null) { let ac = def.armour; while (ac > 0 && armourGateWhy(c, ac)) ac--; c.armourClass = ac; } // the class wanted, as far as Pain Threshold allows; then the ammunition is fitted to the carry limit, then the armour
    // Spare ammunition is cut before the character is overburdened by it: loose rounds first, then magazines down to 2.
    for (let guard = 0; overweightKg(c) > 0 && guard < 8; guard++) {
      const loose = c.pack.findIndex((x) => String(x.id).startsWith('rounds:')), mags = c.pack.find((x) => Array.isArray(x.mags) && x.mags.length > 2);
      if (loose >= 0) { notes.push('ammunition: the loose rounds are left behind (carry limit)'); c.pack.splice(loose, 1); } else if (mags) { mags.mags.pop(); mags.qty = mags.mags.length; notes.push('ammunition: one magazine fewer (carry limit)'); } else break;
    }
    if (def.armour != null) {
      // The heaviest class it can wear WELL: Pain Threshold allows it, the kit stays inside the carry limit (an overburdened
      // character loses Movement), and it still walks at least 1 tile an AP. A player who can't carry Juggernaut plate wears Assault.
      let ac = def.armour, why = '';
      for (; ac > 0; ac--) { c.armourClass = ac; if (armourGateWhy(c, ac)) { why = 'its Pain Threshold'; continue; } if (overweightKg(c) > 0) { why = 'its carry limit (Strength)'; continue; } if (movement(c) < MIN_MOVE) { why = 'walking at least ' + MIN_MOVE + ' tile an AP'; continue; } break; }
      c.armourClass = ac;
      if (ac !== def.armour) notes.push('armour: Class ' + def.armour + ' wanted, Class ' + ac + ' is the heaviest that allows ' + why);
    }
    if (Array.isArray(def.techniques)) learnTechniques(c, def, level, notes);
    if (def.words) {
      const picks = WORD_PICKS_AT(level); if (picks > 0) addStudy(c, Math.max(0, thresholdN(picks) - growthOf(c).study), 'reference build');
      for (const w of def.words) { if ((c.sigils || []).length >= wordsKnownCap(c)) break; if (learnStudied(c, w)) break; }
    }
    if (def.belief) setDevotionXp(c, devotionThreshold(DEVOTION_AT(level)));
    c.hp = maxHp(c);
  } finally { bindGame(was); }
  g = apply(g, { type: 'story/pass', charId: cid }, 'host'); // one more pass through the reducer: its migrations and checks see the finished character
  const out = g.characters[cid];
  const perkStepsLeft = SKILLS.reduce((n, s) => n + Math.max(0, stepsEarned(out.skills[s.id] || 0) - stepsTaken(out, s.id)), 0);
  const built = { variant, level, c: out, notes, classWanted, unspent: { skill: out.unspent.skill, attr: out.unspent.attr }, perkStepsLeft };
  CACHE.set(k, JSON.stringify(built));
  return { ...JSON.parse(JSON.stringify(built)), def };
}

/** Techniques (rules 1.12): the starting picks, the weapon's signature at drill mark I, a pick at marks II and III; then
 * the ready list (3 + half the attack skill), the preferred ones first. */
function learnTechniques(c: any, def: BuildDef, level: number, notes: string[]) {
  const p = ensurePhys(c), sys = weaponSystem(c.weapon), pref = (def.techniques as string[]).filter((t) => TECHNIQUE[t] && !TECHNIQUE[t].free);
  // the creation picks (2 in a system the build has the skill for; one melee pick is an Opener): the preferred ones
  const slots = startingTechniqueSlots(c);
  for (const s of ['melee', 'ranged']) {
    if (!slots[s] || s !== sys) continue;
    const own = pref.filter((t) => TECHNIQUE[t].system === s && !TECHNIQUE[t].needs?.shield && !TECHNIQUE[t].innate && !TECHNIQUE[t].perk);
    let pick = own.slice(0, slots[s]);
    if (s === 'melee' && !pick.some((t) => TECHNIQUE[t].group === 'opener')) { const op = own.find((t) => TECHNIQUE[t].group === 'opener'); if (op) pick = [op, ...pick].slice(0, slots[s]); }
    if (pick.length === slots[s]) { p.known = [...p.known.filter((t) => TECHNIQUE[t]?.system !== s), ...pick]; p.ready[s] = [...pick]; }
  }
  const marks = PHYS_RULES.drill.marks, n = DRILL_MARKS_AT(level);
  if (n > 0) { addDrill(c, c.weapon, marks[n - 1] - (p.drill[c.weapon] || 0)); }
  for (let guard = 0; picksOwed(c, c.weapon) > 0 && guard < 5; guard++) { const can = pickable(c, c.weapon), t = pref.find((x) => can.includes(x)) || can[0]; if (!t || takePick(c, c.weapon, t)) break; }
  const known = ensurePhys(c).known.filter((t) => TECHNIQUE[t]?.system === sys && !TECHNIQUE[t].free);
  const order = [...pref.filter((t) => known.includes(t)), ...known.filter((t) => !pref.includes(t))];
  ensurePhys(c).ready[sys] = order.slice(0, readyCap(c, sys));
  notes.push('techniques known: ' + known.join(', ') + ' · ready: ' + ensurePhys(c).ready[sys].join(', ') + (weaponTeaches(c.weapon) ? ' · the weapon teaches ' + weaponTeaches(c.weapon) : ''));
}

/** Is this built character legal? Every check is the engine's own; returns the problems (none: legal). */
export function legalityProblems(b: Built): string[] {
  const c = b.c, out: string[] = [], lvCap = attrCapAt(c.level);
  // 1. the points it holds are exactly the points the rules have given by this level (creation + the level table)
  let sk = BUDGET.skill, at = BUDGET.attr; for (let l = 2; l <= c.level; l++) { const gn = levelGains(l); sk += gn.skill; at += gn.attr; }
  const skHave = sum(c.skills) + c.unspent.skill, atHave = ATTRS.reduce((n, a) => n + (c.attrs[a.id] || 1) - 1, 0) + c.unspent.attr;
  if (skHave !== sk) out.push('Skill points ' + skHave + ', the rules give ' + sk);
  if (atHave !== at) out.push('Attribute points ' + atHave + ', the rules give ' + at);
  // 2. the tree: skill ≤ attribute ≤ the level's ceiling
  for (const s of SKILLS) if ((c.skills[s.id] || 0) > (c.attrs[s.attribute] || 1)) out.push(s.id + ' ' + c.skills[s.id] + ' above ' + s.attribute + ' ' + c.attrs[s.attribute]);
  for (const a of ATTRS) if ((c.attrs[a.id] || 1) > lvCap) out.push(a.id + ' ' + c.attrs[a.id] + ' above the level ' + c.level + ' ceiling ' + lvCap);
  // 3. the class: none before level 3; from 3, one its attributes were eligible for (it was taken through classPickError)
  if (c.level < 3 && c.classId) out.push('a class before level 3');
  if (c.level >= 3 && !c.classId) out.push('no class at level ' + c.level);
  if (c.classId) { const top = Math.max(...ATTRS.map((a) => c.attrs[a.id] || 1)); if ((c.attrs[CLASS[c.classId].attribute] || 1) < top && c.level === 3) out.push('class ' + c.classId + ' is not of the highest attribute'); }
  if (c.classId && classRank(c) > (c.level >= 12 ? 3 : c.level >= 6 ? 2 : 1)) out.push('rank ' + classRank(c) + ' too early');
  // 4. perks: no more steps than Mastery has earned; a Mastered perk only at 10
  for (const s of SKILLS) if (stepsTaken(c, s.id) > stepsEarned(c.skills[s.id] || 0)) out.push('more perk steps in ' + s.id + ' than earned');
  for (const p of c.perks) { const d = PERK[p.id]; if (!d) out.push('unknown perk ' + p.id); else if (d.tier === 'mastered' && (c.skills[d.skills[0]] || 0) < 10) out.push(p.id + ' without 10 points'); else if (!['acquired', 'mastered'].includes(d.tier)) out.push(p.id + ' is a ' + d.tier + ' perk (not from levels)'); }
  // 5. gear the rules gate
  { const rq = requiresWhy(c, (WEAPON[c.weapon] as any)?.requires); if (rq) out.push('weapon ' + c.weapon + ': ' + rq); }
  { const ag = armourGateWhy(c, c.armourClass); if (ag) out.push(ag); }
  if ((c.sigils || []).length > wordsKnownCap(c)) out.push('more Sigil words than Brain Power allows');
  // 6. at level 1 the sheet is a legal creation sheet
  if (c.level === 1) { const d = deriveCreation(c.skills, c.attrs); if (!d.ok || d.spent !== BUDGET.skill || d.attrLeft !== 0) out.push('not a legal creation sheet'); }
  return out;
}

/** One line a designer can read: the sheet in short. */
export function sheetLine(b: Built): string {
  const c = b.c, top = (o: Record<string, number>, n: number, min = 1) => Object.entries(o).filter(([, v]) => v > min - 1 + (min === 1 ? 0 : 0)).sort((x, y) => y[1] - x[1]).slice(0, n);
  return 'skills ' + top(c.skills, 7).map(([k, v]) => (SKILL[k]?.name || k) + ' ' + v).join(', ') + ' · attributes ' + top(c.attrs, 4, 2).filter(([, v]) => v > 1).map(([k, v]) => k + ' ' + v).join(', ')
    + ' · ' + (c.classId ? CLASS[c.classId].name + ' rank ' + classRank(c) : 'no class yet') + ' · ' + (WEAPON[c.weapon]?.name || c.weapon) + (c.weaponState?.rarity && c.weaponState.rarity !== 'standard' ? ' (' + c.weaponState.rarity + ')' : '')
    + (c.offHand ? ' + ' + (ITEM[c.offHand.id]?.name || WEAPON[c.offHand.id]?.name || c.offHand.id) : '') + ' · armour Class ' + c.armourClass + ' · HP ' + maxHp(c)
    + (c.perks.length ? ' · perks ' + c.perks.map((p) => (PERK[p.id]?.name || p.id) + (p.tier === 'II' ? ' II' : p.tier === 'mastered' ? ' (Mastered)' : '')).join(', ') : '')
    + ((c.unspent.skill || c.unspent.attr) ? ' · held back: ' + c.unspent.skill + ' Skill, ' + c.unspent.attr + ' Attribute' : '');
}
