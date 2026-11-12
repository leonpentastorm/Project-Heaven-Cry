// Lane H: identity, economy and upkeep traits. Mind Without Fog, Machine-Faced, Bottle Butts for Eyes, The Mask, Oil in
// My Mind, Oil in My Soul, Lunarshine, Symbol of Order, Rogue Element, Worldline Fracture, Central City Kid, Insomniac,
// Wanted, Company Man, Market Blood, Inner Ring Heir, Occultist, Ace Pilot.
//
// Every trait runs its combat part and its story part (checks, passives, saves, Karma, rest, scenes, sessions) where the
// engine can; what it can't judge goes to the Narrator (note / pendRuling / brief). Recommended fixes from the audit
// (plan section 6) are marked PROVISIONAL here and listed in the spec (section 14, tags H…) and docs/design/perk-runtime.md.
import { register, stateOf, uses, note, pendRuling, postStory, has, charOfUnit, skillRollMod, gainEcho, wearing, type Holder } from '../effects';
import { wordsGate, raiseWords } from '../fighttalk';
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import { mod, packOf, maxHp, maxMp, hasEmanator, restockResources } from '../character';
import { unitFromCharacter } from '../combat';
import { condFamily, endCond, MANA_START } from '../magic';
import { SKILL, ITEM, MANA_BANDS } from '../data';
import { storyConds, zoneTags, karmaBand, sideRollMod } from '../game';
import { applyMemOp } from '../memory';
import { overworld, say } from '../kit';
import { rollVs, TN } from '../rolls';

// ---------- small helpers ----------
const inFight = (h: Holder) => !!h.cb && !!h.u && !overworld(h.cb);
const cst = (c: Character | null | undefined): Record<string, any> => (c ? (c.state ||= {}) : {});
/** Read-only item state (stat queries and previews must not change state). */
const ro = (c: Character | null | undefined): Record<string, any> => c?.state || {};
const sceneN = (g: any) => g?.story?.scene?.n ?? 0;
const sgn = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
const sys = (h: Holder, text: string) => { postStory(h, text, { kind: 'system' }); };
const SOCIAL = new Set(['charisma', 'eloquence', 'implication', 'intimidation', 'empathy', 'authority', 'camaraderie']);
const HEART_CONDS = (ids: string[]) => ids.filter((id) => condFamily(id) === 'heart' && !['guarded', 'inspired'].includes(id));
/** Story conditions on a character are kept as ids (the Brain debuffs as ldebuff / rdebuff). */
const storyFam = (id: string) => (id === 'ldebuff' || id === 'rdebuff' ? 'brain' : condFamily(id));
/** A unit's d20 numbers changed mid-fight (a drink, glasses knocked off): rebuild them from the character, the way a
 * weapon swap does (attack, saves, debuff strength, item skill mods). */
function refreshUnit(h: Holder) {
  const u = h.u, c = h.c; if (!u || !c || !inFight(h)) return;
  const f = unitFromCharacter(c, u.pos, { state: 1 });
  u.attack = f.attack; u.sv = f.sv; u.dbf = f.dbf; u.sk = f.sk;
}
/** Is the zone the story stands in outside Central City (a campaign zone marked in_city: false)? */
const outsideCity = (g: any) => !!g && zoneTags(g).includes('outside_city');

// ======================================================================================================== KARMA LOCKS
// Spec (Karma): −100 Chaotic … +100 Lawful, Neutral −29..29. applyKarma fires 'karma_award' {c, amount, unlawful, mult}.
// - Mind Without Fog locks Karma at its value for good: every award is dropped.
// - Symbol of Order starts Lawful (+30) and Rogue Element Chaotic (−30). Leaving the band costs double (PROVISIONAL,
//   plan 6, Symbol of Order 2): the band edge holds; every point past it costs 2 points of award, carried between
//   awards ("pressure"), so leaving needs twice the loss. An award back toward the band pays the pressure off first.
//   Symbol of Order's unlawful acts cost double too (×2 on the loss, before the band rule).
interface Band { edge: number; dir: 1 | -1; name: string }
const LAWFUL: Band = { edge: 30, dir: 1, name: 'Lawful' }, CHAOTIC: Band = { edge: -30, dir: -1, name: 'Chaotic' };
function lockStart(h: Holder, b: Band) {
  const c = h.c; if (!c) return; const st = cst(c);
  if (st.karmaStart) return; st.karmaStart = b.name;
  const k = c.karma || 0; if (b.dir * k < b.dir * b.edge) c.karma = b.edge;
  sys(h, c.name + '\'s Karma starts ' + b.name + ' (' + c.karma + ').');
}
function bandAward(h: Holder, ctx: any, b: Band) {
  const c = h.c; if (!c || ctx.c !== c) return;
  const st = cst(c), was = c.karma || 0, amt = Math.round(ctx.amount * (ctx.mult || 1));
  const inBand = b.dir * was >= b.dir * b.edge;
  if (!inBand) { st.pressure = 0; return; } // outside the band: an ordinary award
  const away = -b.dir * amt; // > 0 moves out of the band
  if (away > 0) {
    const room = b.dir * (was - b.edge); // points before the edge
    const out = away - Math.max(0, room); // the part that pushes past the edge
    if (out <= 0) return;
    st.pressure = (st.pressure || 0) + out;
    const past = Math.floor(st.pressure / 2); st.pressure = past ? 0 : st.pressure;
    const to = b.edge - b.dir * past;
    ctx.amount = to - was; ctx.mult = 1;
    sys(h, 'My Way: leaving ' + b.name + ' costs double' + (past ? ' (' + c.name + ' slips to ' + karmaBand(to) + ')' : ' (' + c.name + ' holds ' + b.name + '; ' + st.pressure + ' Karma owed toward leaving)') + '.');
  } else if (st.pressure > 0) {
    const pay = Math.min(st.pressure, -away); st.pressure -= pay;
    ctx.amount = (-away - pay) * b.dir; ctx.mult = 1;
  }
}

// ---------- Mind Without Fog ----------
// +1 Core point at creation (rules 1.11, item 929; FOG_CORE in character.ts reads the trait). Heart Debuffs never affect it: the generic immunity cancels
// Heart-family conditions in a fight; here, a Heart condition carried in is dropped, a story Heart condition never takes
// (Shaken's −2 is cancelled and the condition removed), and a story Heart save, or a check the Narrator tags
// 'heart_debuff', succeeds on its own. Unmoving: gear bonuses to Attributes and Skills don't apply (no item grants one
// yet; the trait-granted glasses and mask are not "gear" for this, PROVISIONAL, plan 6 Mind Without Fog 3), and Karma
// never moves.
function dropHeartStory(h: Holder, c: Character): string[] {
  const gone = (c.persistentConds || []).filter((p) => storyFam(p.id) === 'heart' && !['guarded', 'inspired'].includes(p.id)).map((p) => p.id);
  if (gone.length) c.persistentConds = (c.persistentConds || []).filter((p) => !gone.includes(p.id));
  return gone;
}
const heartish = (ck: any) => (ck.kind === 'save' && ck.family === 'heart') || (ck.tags || []).includes('heart_debuff');
register({
  id: 'mind_without_fog', kind: 'trait', claims: ['creation_points', 'ignore_gear_mods', 'karma_lock'],
  stat: (h, stat) => {
    // Unmoving: cancel gear (worn item) skill bonuses, should any item grant one (items.json has none today).
    const m = /^skill:(.+)$/.exec(stat); if (!m || !h.c) return 0;
    let n = 0; for (const id of Object.values(h.c.worn || {})) for (const e of ((ITEM as any)[id as string]?.effects || []) as any[]) if ((e.op === 'skill_mod' || e.op === 'skill_bonus') && e.skill === m[1] && typeof e.value === 'number') n -= e.value;
    return n;
  },
  on: {
    karma_award: (ctx, h) => { if (ctx.c !== h.c || !ctx.amount) return; ctx.amount = 0; ctx.mult = 1; sys(h, 'Unmoving: ' + h.c!.name + '\'s Karma doesn\'t change.'); },
    check_build: (ctx, h) => { if (ctx.c === h.c) dropHeartStory(h, h.c!); },
    check_mod: (ctx, h) => {
      if (ctx.c !== h.c) return;
      const on = storyConds(h.g, h.c!), gone = HEART_CONDS(on.filter((id) => storyFam(id) === 'heart'));
      if (!gone.length) return;
      dropHeartStory(h, h.c!);
      // storyCondMods already counted Shaken's −2 for this roll: give it back, named.
      const ck = ctx.ck, social = (ck.tags || []).some((t: string) => ['dialogue', 'crowd', 'official', 'merchant', 'military', 'underworld'].includes(t)) || (ck.skills || []).some((s: string) => ['charisma', 'eloquence', 'implication', 'intimidation', 'empathy', 'authority'].includes(s));
      if (gone.includes('shaken') && (social || (ck.kind === 'save' && ck.family === 'heart'))) ctx.add.push({ add: 2, label: 'Mind Without Fog (Shaken never took)' });
    },
    check_post: (ctx, h) => { if (ctx.c === h.c && heartish(ctx.ck) && !ctx.auto) { ctx.auto = 'success'; ctx.labels.push('Still Water: Heart Debuffs never take'); } },
    scene_change: (ctx, h) => { if (h.c) dropHeartStory(h, h.c); },
    combat_start: (ctx, h) => {
      const u = h.u; if (!u?.conds) return;
      for (const id of HEART_CONDS(Object.keys(u.conds))) { endCond(u, id, h.cb || undefined); say(h.cb, u.name + ' is still water: ' + id + ' doesn\'t take (Mind Without Fog).'); }
    },
  },
  brief: () => 'Heart Debuffs never take (engine; tag social breaking "heart_debuff"); Karma never changes',
});

// ---------- Symbol of Order ----------
register({
  id: 'symbol_of_order', kind: 'trait', claims: ['karma_lock', 'karma_cost_mult'], narrator: ['narrator'],
  on: {
    session_start: (ctx, h) => lockStart(h, LAWFUL),
    karma_award: (ctx, h) => {
      if (ctx.c !== h.c) return;
      if (ctx.unlawful && ctx.amount < 0) { ctx.mult = (ctx.mult || 1) * 2; sys(h, 'My Way: an unlawful act costs ' + h.c!.name + ' double Karma.'); }
      bandAward(h, ctx, LAWFUL);
    },
  },
  actions: [{
    id: 'invoke_law', label: 'I Am the Law', scope: ['story', 'world'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    text: 'Once a scene: invoke law or rank. An official here must answer one question truthfully. Type the question.',
    run: (h, a) => {
      const q = String(a.text || '').trim().slice(0, 200), eid = postStory(h, 'invokes the law' + (a.npc ? ' to ' + a.npc : '') + (q ? ': "' + q + '"' : '.'));
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'I Am the Law: ' + h.c.name + ' invokes law or rank' + (a.npc ? ' to ' + a.npc : '') + '. If an official is present, they must answer one question truthfully' + (q ? ': "' + q + '"' : ' (the player asks next)') + '. Refuse if no official is there.', eid || undefined);
    },
  }],
  brief: () => 'flag unlawful acts in karma awards (they cost double); the official\'s true answer',
});

// ---------- Rogue Element ----------
// Spanner in the Works: once a scene, wrecking someone's plan or property gives 1 Echo (max 3). In a fight that is this
// unit breaking a map object to 0 HP (cover, a door, a barricade); in the story the player claims it with the action
// (+1 Echo now) and the Narrator takes it back (echo [{charId, n: -1}]) if nothing was wrecked. Lawful factions start
// hostile: Narrator (factions carry no lawful tag).
function wreckEcho(h: Holder, why: string): boolean {
  if (!h.c || !uses(h).take('per_scene', 1, h.key + '#wreck')) return false;
  const n = gainEcho(h.c, 1, 'Spanner in the Works', h.g);
  const line = h.c.name + ' wrecks ' + why + ': ' + (n > 0 ? '+1 Echo (' + h.c.echo + ')' : 'Echo already full') + ' (Spanner in the Works).';
  if (inFight(h)) say(h.cb, line); else sys(h, line);
  return true;
}
register({
  id: 'rogue_element', kind: 'trait', claims: ['karma_lock', 'resource'], narrator: ['faction_start'],
  on: {
    session_start: (ctx, h) => lockStart(h, CHAOTIC),
    karma_award: (ctx, h) => bandAward(h, ctx, CHAOTIC),
    object_destroyed: (ctx, h) => { if (ctx.by && ctx.by === h.u) wreckEcho(h, 'the ' + String(ctx.obj?.name || 'object').toLowerCase()); },
  },
  actions: [{
    id: 'spanner', label: 'Spanner in the Works', scope: ['story', 'world'], target: 'none', ap: 0, uses: { per: 'per_scene', n: 1 },
    available: (h) => (uses(h).left('per_scene', 1, h.key + '#wreck') > 0 ? true : 'Already used this scene.'),
    text: 'Once a scene, when you have wrecked someone\'s plan or property: gain 1 Echo. Say what you wrecked.',
    run: (h, a) => {
      const what = String(a.text || '').trim().slice(0, 160) || 'someone\'s plan';
      if (!wreckEcho(h, what)) return 'Already used this scene.';
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Spanner in the Works: ' + h.c.name + ' claims they wrecked "' + what + '" and gained 1 Echo. If they didn\'t, take it back: echo [{charId:"' + h.c.id + '", n:-1}].');
    },
  }],
  brief: () => 'Lawful factions start hostile to them; take back a false Spanner Echo (echo n:-1)',
});

// ======================================================================================================== MASKS AND FACES

// ---------- Machine-Faced ----------
// Blank Face: a Composure check in dialogue (tag 'dialogue', Composure alone) succeeds with no roll; so does a Heart save
// in dialogue (PROVISIONAL, plan 6 Machine-Faced 3). Combined checks roll normally (PROVISIONAL, problem 2). Uncanny:
// Charisma and Implication can't be used in dialogue: they're taken out of the check; a check left with neither skill
// fails on its own, saying why. Their voices still speak, and their combat use is untouched. Robots, children and
// animals: Narrator.
register({
  id: 'machine_faced', kind: 'trait', claims: ['auto_success', 'forbid'], narrator: ['narrator'],
  on: {
    check_build: (ctx, h) => {
      const ck = ctx.ck; if (ctx.c !== h.c || !(ck.tags || []).includes('dialogue')) return;
      const gone = ck.skills.filter((s: string) => s === 'charisma' || s === 'implication'); if (!gone.length) return;
      const left = ck.skills.filter((s: string) => !gone.includes(s));
      if (left.length) ck.skills = left;
      else { ck.auto = 'fail'; ck.stakes = ck.stakes + ' (Uncanny: ' + h.c!.name + ' can\'t use ' + gone.map((s: string) => SKILL[s]?.name || s).join(' or ') + ' in dialogue)'; }
    },
    check_post: (ctx, h) => {
      const ck = ctx.ck; if (ctx.c !== h.c || ctx.auto || !(ck.tags || []).includes('dialogue')) return;
      const solo = ck.skills.length === 1 && ck.skills[0] === 'composure';
      if (solo || (ck.kind === 'save' && ck.family === 'heart')) { ctx.auto = 'success'; ctx.labels.push('Blank Face'); }
    },
  },
  brief: () => 'robots treat them as one; children and animals panic; tag dialogue checks "dialogue"',
});

// ---------- The Mask ----------
// Masked: +2 Composure and Authority (the generic skill mods; they reach checks, passives and the Heart save). Bare: −3.
// The mask is worn and taken off through the sheet (free out of a fight, not in one). Two Faces: the brief tells the
// Narrator which face the character shows now; recognition is the Narrator's.
register({
  id: 'the_mask', kind: 'trait', claims: ['start_item'], narrator: ['narrator'],
  brief: (h) => 'Two Faces: now ' + (wearing(h.c, 'smiling_mask') ? 'masked' : 'bare-faced') + '; people who met the other face don\'t know them',
});

// ---------- Bottle Butts for Eyes ----------
// +2 Rumination; glasses on: +1 Proficiency and Ingenuity, off: −4 (the generic skill mods). A critical hit that lands
// a head injury (Dazed) knocks the glasses off (PROVISIONAL, plan 6 Bottle Butts 4): −4 at once, back in the pack after
// the fight. In the story the Narrator knocks them off with traitState {key:'glasses', value:'off'}; the player puts
// them back on from the sheet.
function glassesOff(h: Holder, why: string): boolean {
  const c = h.c; if (!c || !wearing(c, 'prescription_glasses')) return false;
  const worn = { ...(c.worn || {}) }; const slot = Object.keys(worn).find((k) => worn[k] === 'prescription_glasses'); if (!slot) return false;
  delete worn[slot]; c.worn = worn;
  c.pack = [...packOf(c), { id: 'prescription_glasses', item: 'prescription_glasses', name: ITEM.prescription_glasses?.name || 'Prescription glasses', qty: 1, kind: 'tool' }];
  refreshUnit(h);
  const line = c.name + '\'s glasses come off (' + why + '): −4 Acuity and Ingenuity until they\'re back on.';
  if (inFight(h)) say(h.cb, line); else sys(h, line);
  return true;
}
register({
  id: 'bottle_butts_for_eyes', kind: 'trait', claims: ['start_item'], narrator: ['narrator'],
  on: {
    attack_roll: (ctx, h) => { if (ctx.tgt === h.u) stateOf(h).dz = !!h.u?.dazedNext; },
    on_hit: (ctx, h) => { if (ctx.tgt !== h.u || !ctx.crit || !h.u || h.u.dead) return; const st = stateOf(h); if (h.u.dazedNext && !st.dz) glassesOff(h, 'a blow to the head'); },
    check_build: (ctx, h) => { const st = ro(h.c); if (ctx.c === h.c && st.glasses === 'off') { delete h.c!.state!.glasses; glassesOff(h, 'the story'); } },
    scene_change: (ctx, h) => { if (ro(h.c).glasses === 'off') { delete h.c!.state!.glasses; glassesOff(h, 'the story'); } },
    combat_start: (ctx, h) => { if (ro(h.c).glasses === 'off') { delete h.c!.state!.glasses; glassesOff(h, 'knocked off before the fight'); } },
  },
  brief: (h) => 'glasses ' + (wearing(h.c, 'prescription_glasses') ? 'on' : 'OFF') + '; knock them off with traitState {key:"glasses", value:"off"}',
});

// ======================================================================================================== THE OILS
// Canvas reads artworks (Narrator). +1s are the generic skill mods. Paper: −1 Durability, Pain Threshold and Sensory on
// rolls, once even with both Oils (the group 'oil'), and, PROVISIONAL (plan 6 Oil in My Mind 1), one point's worth off
// what those skills derive: −2 HP per level, Elemental damage taken −10% (it takes 10% more), Healing received −10%.
// Masterpiece (both Oils, once a session, 0 AP): an ally gets +2 on their next d20 (a story check, a save, an attack
// roll). PROVISIONAL: the next roll, not one the ally picks (the check card has no toggle for it yet; lane-h.md gap 4).
const PAPER: Record<string, string> = { durability: 'durability', pain_threshold: 'pain_threshold', sensory: 'sensory' };
const paperOwner = (h: Holder) => h.itemId === 'oil_in_my_mind' || !has(h.c || h.u || null, 'oil_in_my_mind');
const bothOils = (h: Holder) => has(h.c || h.u || null, 'oil_in_my_mind') && has(h.c || h.u || null, 'oil_in_my_soul');
function paperStat(h: Holder, stat: string): number {
  if (!paperOwner(h)) return 0;
  const m = /^skill:(.+)$/.exec(stat); if (m && PAPER[m[1]]) return -1;
  if (stat === 'hp_per_level') return -2;
  if (stat === 'elemental_taken' || stat === 'heal_received') return -0.1;
  return 0;
}
const MP = 'masterpiece';
function inspired(c: Character | null | undefined) { return (ro(c)[MP] as { n: number; by: string; used?: string } | undefined); }
/** The +2 not yet spent on a check (a check marks it used, keeping it only for that same check's reroll). */
const fresh = (c: Character | null | undefined) => { const m = inspired(c); return m && !m.used ? m : undefined; };
function useInspired(c: Character, rollId: string): number {
  const m = inspired(c); if (!m) return 0;
  if (m.used && m.used !== rollId) { delete c.state![MP]; return 0; }
  m.used = rollId; return m.n;
}
const oilActions = [{
  id: MP, label: 'Masterpiece', scope: ['combat', 'world', 'story'] as const, target: 'none' as const, pick: 'squad' as const, pickLabel: 'The ally the work is for', ap: 0, uses: { per: 'per_session' as const, n: 1 },
  available: (h: Holder) => (bothOils(h) && h.itemId === 'oil_in_my_mind' ? true : false),
  text: 'Once a session: make a work of art for one ally. They get +2 on their next roll. Pick the ally, or type their name in the story.',
  run: (h: Holder, a: any) => {
    const g = h.g; if (!g || !h.c) return 'No story.';
    let ally: Character | undefined;
    if (a.choice) ally = g.characters[a.choice] || undefined;
    if (!ally && a.targetId) ally = g.characters[a.targetId] || (h.cb ? charOfUnit(h.cb.units.find((x: Unit) => x.id === a.targetId)) : null) || undefined;
    const name = String(a.npc || a.text || '').trim().toLowerCase();
    if (!ally && name) ally = (Object.values(g.characters) as Character[]).find((x) => x.id !== h.c!.id && !x.dead && (x.name.toLowerCase() === name || (name.length >= 3 && x.name.toLowerCase().includes(name))));
    const others = (Object.values(g.characters) as Character[]).filter((x) => x.id !== h.c!.id && !x.dead);
    if (!ally && others.length === 1) ally = others[0];
    if (!ally || ally.id === h.c.id) return 'Name the ally the work is for.';
    cst(ally)[MP] = { n: 2, by: h.c.id };
    const line = h.c.name + ' makes a work of art for ' + ally.name + ': +2 on their next roll (Masterpiece).';
    if (inFight(h)) say(h.cb, line); else sys(h, line);
    note(h, line + ' What the work is, is yours to describe.');
    return null;
  },
}];
for (const id of ['oil_in_my_mind', 'oil_in_my_soul']) register({
  id, kind: 'trait', claims: ['shared_penalty', 'grant_action'],
  stat: (h, stat) => paperStat(h, stat),
  actions: oilActions as any,
  on: id === 'oil_in_my_mind' ? {
    // The Masterpiece bonus is carried by the ally; the artist's handler applies it (once, whoever holds both Oils).
    check_mod: (ctx, h) => { const c: Character = ctx.c; if (!inspired(c) || ctx.add.some((x: any) => x.label === 'Masterpiece')) return; const n = useInspired(c, 'ck:' + ctx.ck.id); if (n) ctx.add.push({ add: n, label: 'Masterpiece' }); },
    attack_preview: (ctx, h) => { const c = charOfUnit(ctx.att); if (c && fresh(c) && !(ctx.terms || []).some((t: any) => t.label === 'Masterpiece')) ctx.terms.push({ v: fresh(c)!.n, label: 'Masterpiece' }); },
    attack_roll: (ctx, h) => { const c = charOfUnit(ctx.att); if (c && inspired(c)) delete c.state![MP]; },
    cond_apply: (ctx, h) => { const c = charOfUnit(ctx.t); if (!c || !fresh(c) || ctx.skipSave || ctx.cancel || !ctx.by || ctx.by.side === ctx.t.side) return; ctx.saveAdd = (ctx.saveAdd || 0) + fresh(c)!.n; delete c.state![MP]; say(h.cb, c.name + ' draws on the Masterpiece: +2 to the save.'); },
  } : {},
  brief: (h) => 'Canvas: reading artworks (' + (h.itemId === 'oil_in_my_mind' ? 'maker, method, origin' : 'maker\'s feeling and intent') + (bothOils(h) ? '; with both: the whole story' : '') + ')',
});

// ======================================================================================================== UPKEEP

// ---------- Lunarshine ----------
// Drinks (c.state.lunar): Tipsy 1+, Drunk 3+, Wasted 5+, cumulative (PROVISIONAL, plan 6 Lunarshine 2). Drinking takes a
// drink from an opened Bottle of spirits (a bottle is 5 drinks, PROVISIONAL); with no bottle, a story drink is a pending
// ruling (someone pours one: see below). Story: free; a fight: 1 AP (PROVISIONAL). When a scene ends Drunk, the engine rolls Will
// Power vs 12 + drinks today: a fail is one more drink and no reset (PROVISIONAL, plan 6 Lunarshine 1); otherwise drinks
// wear off. A drink someone pours reaches the engine as traitState {key:"drink", value:n}. Drinks
// aside, a "day" is the stretch between long rests (and session starts): one with no drink at all gives the shakes
// (−1 Camaraderie, Authority, Composure) until the next drink.
const BOTTLE = 5;
interface Lunar { drinks: number; today: number; open?: number; shakes?: boolean; day?: boolean }
const lunar = (c: Character): Lunar => (cst(c).lunar ||= { drinks: 0, today: 0 });
const LSTATES = [
  { at: 1, name: 'Tipsy', mods: { camaraderie: 1, lore_master: 1, authority: 1 } },
  { at: 3, name: 'Drunk', mods: { camaraderie: 1, lore_master: 1, authority: 1, intimidation: 1, guts: 1, durability: 1 } },
  { at: 5, name: 'Wasted', mods: { reaction_speed: -2, dexterity: -2, proficiency: -2, vigilant: -2, analysis: -2, visualization: -2 } },
] as { at: number; name: string; mods: Record<string, number> }[];
const lunarState = (n: number) => [...LSTATES].reverse().find((s) => n >= s.at)?.name || 'sober';
function lunarMod(c: Character | null | undefined, skill: string): number {
  const l: Lunar | undefined = ro(c).lunar; if (!l) return 0;
  let n = 0; for (const s of LSTATES) if (l.drinks >= s.at) n += s.mods[skill] || 0;
  if (l.shakes && ['camaraderie', 'authority', 'composure'].includes(skill)) n -= 1;
  return n;
}
function takeDrink(h: Holder): boolean {
  const c = h.c!; const l = lunar(c);
  if (l.open && l.open > 0) { l.open--; return true; }
  const pack = packOf(c).map((x) => ({ ...x })), i = pack.findIndex((x) => (x.item || x.id) === 'bottle_of_spirits' && x.qty > 0);
  if (i < 0) return false;
  pack[i].qty--; c.pack = pack.filter((x) => x.qty > 0 || x.mags); l.open = BOTTLE - 1;
  return true;
}
function drink(h: Holder, why: string) {
  const c = h.c!, l = lunar(c), was = lunarState(l.drinks);
  l.drinks++; l.today++; l.day = true; const shook = l.shakes; l.shakes = false;
  refreshUnit(h);
  const now = lunarState(l.drinks);
  const line = c.name + ' drinks (' + why + '): ' + l.drinks + (l.drinks === 1 ? ' drink' : ' drinks') + (now !== was ? ', now ' + now : '') + (shook ? '; the shakes stop' : '') + '.';
  if (inFight(h)) say(h.cb, line); else sys(h, line);
}
register({
  id: 'lunarshine', kind: 'trait', claims: 'all',
  stat: (h, stat) => { const m = /^skill:(.+)$/.exec(stat); return m ? lunarMod(h.c, m[1]) : 0; },
  actions: [{
    id: 'drink', label: 'Drink', scope: ['combat', 'world', 'story'], target: 'none', ap: (h) => (inFight(h) ? 1 : 0),
    text: 'Take a drink. In a fight it costs 1 AP. You are Tipsy at 1 drink, Drunk at 3 and Wasted at 5.',
    available: (h) => {
      const l: Lunar | undefined = ro(h.c).lunar, have = (l?.open || 0) > 0 || packOf(h.c!).some((x) => (x.item || x.id) === 'bottle_of_spirits' && x.qty > 0);
      return have || !inFight(h) ? true : 'No bottle.';
    },
    run: (h) => {
      if (!h.c) return 'No character.';
      if (takeDrink(h)) { drink(h, 'from the bottle'); return null; }
      if (inFight(h)) return 'No bottle.';
      const eid = postStory(h, 'reaches for a drink.');
      if (h.g) pendRuling(h.g, h.c, h.key, 'Lunarshine: ' + h.c.name + ' has no bottle and wants a drink. If someone here pours one, send traitState {charId:"' + h.c.id + '", key:"drink", value:1} (the engine counts it).', eid || undefined);
      return null;
    },
  }],
  on: {
    check_build: (ctx, h) => { if (ctx.c === h.c) poured(h); },
    combat_start: (ctx, h) => poured(h),
    scene_change: (ctx, h) => {
      poured(h);
      const c = h.c; if (!c) return; const l: Lunar | undefined = ro(c).lunar; if (!l || !l.drinks) return;
      if (l.drinks >= 3) {
        const tn = TN.standard + l.today, rv = rollVs(null, h.g.rng, { mod: sideRollMod(h.g, c, 'will_power'), tn }), ok = rv.ok;
        sys(h, 'The Slope: WILL POWER · ' + rv.text + ' · ' + (ok ? '✓ ' + c.name + ' puts the glass down; the drinks wear off.' : '✕ ' + c.name + ' keeps drinking: ' + (l.drinks + 1) + ' drinks.'));
        if (ok) l.drinks = 0; else { l.drinks++; l.today++; }
      } else l.drinks = 0;
    },
    rest: (ctx, h) => { if (ctx.kind === 'long' && h.c) dayTurns(h); },
    session_start: (ctx, h) => { if (h.c) dayTurns(h); },
  },
  brief: (h) => { const l: Lunar | undefined = ro(h.c).lunar; return 'drinks ' + (l?.drinks || 0) + ' (' + lunarState(l?.drinks || 0) + ')' + (l?.shakes ? ', the shakes' : '') + '; someone pours: traitState {key:"drink", value:1}'; },
});
/** Drinks the Narrator poured (traitState {key:'drink', value:n}): counted now. */
function poured(h: Holder) {
  const c = h.c, n = Math.round(Number(ro(c).drink) || 0); if (!c || ro(c).drink == null) return;
  delete c.state!.drink;
  for (let i = 0; i < Math.max(0, Math.min(5, n)); i++) drink(h, 'poured for them');
}
/** A new "day" (a long rest or a session start): a day without a drink gives the shakes; the day's count restarts. */
function dayTurns(h: Holder) {
  const c = h.c!, l = lunar(c);
  if (l.day && l.today === 0 && !l.shakes) { l.shakes = true; sys(h, c.name + ' has the shakes: a day with no drink (−1 Camaraderie, Authority and Composure until the next one).'); }
  l.today = 0; l.day = true; refreshUnit(h);
}

// ---------- Insomniac ----------
// Always Up: a fight that starts in the same scene as a rest (a rest-camp fight, PROVISIONAL) gives hidden enemies no
// ambush against them: no 19-20 criticals, no Ambush multiplier. Watches: Narrator. Wired: resting gives back half of
// what it would (PROVISIONAL, plan 6 Insomniac 2): a short rest 12.5% of max HP, a long rest half the missing HP and
// MP (the rest hook's per-character mult). Session start counts as a long rest: 'session_heal' gives Wired its half
// there too.
const restedHere = (h: Holder) => { const g = h.g, s = ro(h.c).restScene; return !!g && s != null && s === sceneN(g); };
register({
  id: 'insomniac', kind: 'trait', claims: ['immunity', 'rest_recovery_mult'], narrator: ['narrator'],
  priority: 50,
  on: {
    rest: (ctx, h) => {
      const c = h.c, g = h.g; if (!c || !g) return;
      cst(c).restScene = sceneN(g);
      if (!(ctx.chars as Character[]).includes(c)) return;
      (ctx.mult ||= {})[c.id] = { hp: 0.5, mp: 0.5 }; // applyRest gives back half of what it would
      sys(h, 'Wired: ' + c.name + ' rests badly: half the rest.');
    },
    session_heal: (ctx, h) => { const c = h.c; if (!c) return; (ctx.mult ||= {})[c.id] = { hp: 0.5, mp: 0.5 }; sys(h, 'Wired: ' + c.name + ' slept badly: half the session\'s rest.'); },
    attack_roll: (ctx, h) => { if (ctx.tgt === h.u && ctx.ambush && restedHere(h)) { ctx.critMin = Math.max(ctx.critMin, 20); stateOf(h).noAmbush = true; say(h.cb, h.u!.name + ' was already up (Always Up): no ambush.'); } },
    damage_out: (ctx, h) => { if (ctx.tgt === h.u && ctx.src?.ambush && restedHere(h)) ctx.mults.push({ v: 1 / (ctx.att?.ambushMult || 1.5), label: 'Always Up' }); },
  },
  brief: () => 'takes a watch with no penalty; start rest-camp ambushes in the same scene as the rest',
});

// ======================================================================================================== CITY AND FACTIONS

// ---------- Central City Kid ----------
// Plugged In: +2 on social checks the Narrator tags 'official' or 'merchant' (any social skill). City ID and bank card
// are start items. Soft Hands: the first time each fight they lose real HP, −2 AP (now on their own turn, else off the
// next turn, within the floor of 2). Outside the city (a zone marked in_city: false): −2 Guts, which reaches Body saves;
// the generic skill mod covers story checks, this handler the fight (no zone tags reach combat rolls).
register({
  id: 'central_city_kid', kind: 'trait', claims: ['start_item', 'roll_bonus', 'stat_mod'],
  checkMod: (h, ck) => ((ck.tags || []).some((t: string) => t === 'official' || t === 'merchant') && (ck.skills || []).some((s: string) => SOCIAL.has(s)) ? [{ add: 2, label: 'Plugged In' }] : []),
  stat: (h, stat, ctx) => (stat === 'skill:guts' && !(ctx && Array.isArray(ctx.tags)) && outsideCity(h.g) ? -2 : 0),
  on: {
    on_damaged: (ctx, h) => {
      if (ctx.t !== h.u || !(ctx.dmg > 0) || ctx.src?.by === h.u) return;
      const st = stateOf(h); if (st.wounded) return; st.wounded = true;
      const cb = h.cb!, u = h.u!, mine = cb.units.find((x) => x.id === cb.order[cb.turn]) === u && !cb.window;
      if (mine) { u.ap = Math.max(0, u.ap - 2); say(cb, u.name + ' reels from the first wound: −2 AP (Soft Hands).'); }
      else { st.shock = true; say(cb, u.name + ' reels from the first wound: −2 AP next turn (Soft Hands).'); }
    },
    turn_start_pre: (ctx, h) => { if (ctx.u !== h.u) return; const st = stateOf(h); if (st.shock) { st.shock = false; ctx.penalties.push({ n: 2, why: 'Soft Hands' }); } },
  },
  brief: () => 'city services open; tag checks with officials or merchants "official" / "merchant"',
});

// ---------- Wanted ----------
// Notorious: +2 Intimidation with the underworld (checks tagged 'underworld' or 'vs_underworld'; the generic covers the
// second). Contraband is a start item. Bounty: Central City officials start hostile, seeded once into the party's memory
// (standing −40; party-wide memory, so the whole squad feels it: plan 6 Wanted 2). Hunters: Narrator.
register({
  id: 'wanted', kind: 'trait', claims: ['start_item', 'faction_start'], narrator: ['narrator'],
  stat: (h, stat, ctx) => (stat === 'skill:intimidation' && (ctx?.tags || []).includes('underworld') && !(ctx?.tags || []).includes('vs_underworld') ? 2 : 0),
  on: {
    session_start: (ctx, h) => {
      const c = h.c, g = h.g; if (!c || !g) return; const st = cst(c); if (st.wantedSeeded) return; st.wantedSeeded = true;
      applyMemOp(g, { op: 'faction', name: 'Central City officials', standing: -40, notes: c.name + '\'s face is on a poster in every precinct (Wanted).' });
      sys(h, 'Central City officials are hostile: ' + c.name + ' is Wanted.');
    },
  },
  brief: () => 'bounty hunters when you decide; tag underworld checks "underworld"',
});

// ---------- Company Man ----------
// Company Card: RTC gear at cost. The data's −100% would make it free (GAMEBREAKING, plan 6 Company Man 1): PROVISIONAL
// −40% (60% of list). No shops exist yet, so the price is the Narrator's, told in the brief. Once a campaign RTC extracts
// them from anywhere: in the story a pending ruling (where they land); in a fight they leave it (conscious only), take
// no part in its XP, and the fight goes on without them. Contract jobs: Narrator.
const RTC_PRICE = 0.6;
register({
  id: 'company_man', kind: 'trait', claims: ['price_mod'], narrator: ['narrator'],
  actions: [{
    // In a fight it ends your turn: the card shows the AP it takes, all you have left (it showed free: the perk audit, finding 3).
    id: 'rtc_extraction', label: 'Call RTC extraction', scope: ['combat', 'world', 'story'], target: 'none', ap: (h) => (inFight(h) ? Math.max(0, h.u!.ap) : 0), uses: { per: 'per_campaign', n: 1 },
    text: 'Once a campaign: RTC pulls you out of anywhere. In a fight it takes all the AP you have left, you must be conscious, you leave the fight, and you get no XP from it.',
    run: (h) => {
      if (inFight(h)) {
        const u = h.u!, cb = h.cb!; if (u.downed) return 'Only while conscious.';
        u.surrendered = true; u.ap = 0; (u as any).extracted = true; if (h.c) cst(h.c).rtcFight = true;
        say(cb, 'An RTC extraction team pulls ' + u.name + ' out of the fight (Company Man).');
        if (!cb.units.some((v) => v.side === 'pc' && !v.companion && !v.dead && !v.downed && !v.surrendered) && cb.units.some((v) => v.side === 'foe' && !v.dead && !v.downed && !v.surrendered)) cb.over = 'loss';
        note(h, u.name + ' was extracted by RTC mid-fight: say where they land and what RTC wants for it.');
        return null;
      }
      const eid = postStory(h, 'calls the Company: RTC extraction.');
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'RTC extracts ' + h.c.name + ' from wherever they are (once a campaign): say where they land, and what the Company will want for it.', eid || undefined);
      return null;
    },
  }],
  on: {
    xp_grant: (ctx, h) => { if (ctx.c === h.c && ctx.source === 'combat' && ro(h.c).rtcFight) { ctx.amount = 0; delete h.c!.state!.rtcFight; } },
    scene_change: (ctx, h) => { if (ro(h.c).rtcFight) delete h.c!.state!.rtcFight; },
    // The Company's claim is a standing memory thread (a debt), seeded at the first session start, so the Narrator's
    // memory carries RTC's jobs without a per-turn line (PROVISIONAL, spec 14).
    session_start: (ctx, h) => {
      const g = ctx.g, c = h.c; if (!g || !c) return; const st = (c.state ||= {}); if (st.rtcThread) return;
      st.rtcThread = applyMemOp(g, { op: 'thread', title: 'RTC contract: ' + c.name, kind: 'debt', status: 'open', who: [c.name], text: c.name + ' works for the Company (RTC): it sends jobs they can\'t refuse, and once a campaign it will pull them out of anywhere.', importance: 3 } as any) || 'seeded';
    },
  },
  brief: () => 'RTC sells to them at ' + Math.round(RTC_PRICE * 100) + '% of list price; RTC sends jobs they can\'t refuse',
});

// ---------- Market Blood ----------
// Haggle: buy −20%, sell +20% (no shops yet: the brief carries the numbers for narrated trades). Touch an item to learn
// its true value: an engine action for anything in the pack the data prices (a private line); anything else (a plot
// item, an item in someone else's hands) is a pending ruling, real or fake. Price on Everything: giving or taking a gift
// takes an Analysis check; the engine's give action has no hook yet (lane-h.md gap 3), so the Narrator calls it.
register({
  id: 'market_blood', kind: 'trait', claims: ['price_mod'], narrator: ['gate_check', 'narrator'],
  actions: [{
    id: 'appraise', label: 'Price it', scope: ['world', 'story'], target: 'none', ap: 0,
    text: 'Touch an item to learn its true value and whether it is a fake. Type the item, or leave it empty to price your whole pack.',
    run: (h, a) => {
      const c = h.c; if (!c) return 'No character.';
      const want = String(a.text || a.npc || '').trim().toLowerCase();
      const pack = packOf(c).filter((x) => !want || x.name.toLowerCase().includes(want) || (x.item || x.id).toLowerCase().includes(want));
      const priced = pack.map((x) => ({ x, p: (ITEM as any)[x.item || x.id]?.price_credits })).filter((y) => typeof y.p === 'number');
      if (priced.length) postStory(h, 'prices it: ' + priced.slice(0, 8).map((y) => y.x.name + ' ' + y.p + ' credits, genuine').join('; ') + '.', { private: true });
      if (!priced.length || (want && !pack.length)) {
        const eid = postStory(h, 'runs a thumb over ' + (want || 'it') + ', pricing it.', { private: true });
        if (h.g) pendRuling(h.g, c, h.key, 'Market Blood: ' + c.name + ' touches "' + (want || 'the item') + '": tell them privately (perkLines) its true value and whether it\'s fake.', eid || undefined);
      }
      return null;
    },
  }],
  brief: () => 'buys at 80%, sells at 120%; giving or taking a gift: call Acuity, a fail means they can\'t',
});

// ---------- Inner Ring Heir ----------
// Allowance: triple funds (characters have no credits yet: the brief says so). Once a session, a family favour (a
// pending ruling). The Name and the summons: Narrator.
register({
  id: 'inner_ring_heir', kind: 'trait', claims: ['start_funds_mult'], narrator: ['narrator'],
  actions: [{
    id: 'favour', label: 'Call in a family favour', scope: ['world', 'story'], target: 'none', ap: 0, uses: { per: 'per_session', n: 1 },
    text: 'Once a session: ask your family for a favour. Type what you ask for.',
    run: (h, a) => {
      const ask = String(a.text || '').trim().slice(0, 200), eid = postStory(h, 'calls home' + (ask ? ': "' + ask + '"' : '.'));
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Family favour (once a session): ' + h.c.name + ' asks the inner-ring family' + (ask ? ' for "' + ask + '"' : '') + '. Say what the family does, and what it will ask in return.', eid || undefined);
    },
  }],
  brief: () => 'starts with triple funds; enemies of the house know them; family summons can\'t be refused',
});

// ---------- Occultist ----------
// The grimoire is a start item. Once a session, learn a supernatural creature's weakness (story or fight: the Narrator
// names it; in a fight a note for the report and the log). Ward Area: out of a fight, 10 minutes, a pending ruling. The
// book's false line: once a session, the Narrator whispers it (perkLines with key "trait:occultist").
register({
  id: 'occultist', kind: 'trait', claims: ['start_item', 'grant_action'], narrator: ['narrator'],
  actions: [
    {
      id: 'weakness', label: 'Look it up', scope: ['combat', 'world', 'story'], target: 'none', ap: 0, uses: { per: 'per_session', n: 1 },
      text: 'Once a session: look up one supernatural creature\'s weakness in the grimoire. Pick the creature in a fight, or type its name. In a fight it is your attempt for the turn: the Narrator answers at once, and a no gives the use back.',
      preview: (h) => (inFight(h) ? wordsGate(h) : {}),
      run: (h, a) => {
        const t = a.targetId && h.cb ? h.cb.units.find((x) => x.id === a.targetId) : null, what = t?.name || String(a.text || a.npc || 'the creature').slice(0, 80);
        if (inFight(h)) { say(h.cb, h.u!.name + ' leafs through the grimoire for ' + what + '\'s weakness.'); return raiseWords(h, { text: 'What is ' + what + '\'s weakness?', ask: 'Occultist: name the weakness of ' + what + ' in your lines, if it is supernatural. Refuse if it isn\'t (the use comes back).', targetId: t?.id, per: 'per_session', actionId: 'weakness' }); }
        const eid = postStory(h, 'looks up ' + what + ' in the grimoire.');
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Occultist: tell ' + h.c.name + ' privately (perkLines) the weakness of ' + what + ', if it is supernatural; refuse if it isn\'t.', eid || undefined);
        return null;
      },
    },
    {
      id: 'ward_area', label: 'Ward Area', scope: ['world', 'story'], target: 'none', ap: 0, uses: { per: 'out_of_combat', n: 1 },
      text: 'Out of a fight: spend 10 minutes to ward this place against the supernatural.',
      run: (h) => {
        const eid = postStory(h, 'spends ten minutes warding the area.');
        if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Ward Area: ' + h.c.name + ' wards this place against the supernatural (10 minutes). Say what it keeps out, and for how long.', eid || undefined);
      },
    },
  ],
  brief: () => 'the Institute wants the book back; once a session whisper one false line (perkLines key trait:occultist)',
});

// ---------- Ace Pilot ----------
// Born Behind the Stick: any engine, no check (Narrator; no vehicle rules exist, so vehicle_mod is the Narrator's).
// Grounded: only when the Narrator says vehicles were there and they went a full day on foot (PROVISIONAL, plan 6 Ace
// Pilot 1): traitState {key:'grounded', value:true}; −0.5 Movement (the −1 Movement ruling, lane A) and −1 Reaction
// Speed (initiative included) until back in a seat (traitState value null, or the player's "Back in a seat").
const grounded = (h: Holder) => !!ro(h.c).grounded;
register({
  id: 'ace_pilot', kind: 'trait', claims: ['withdrawal'], narrator: ['narrator', 'vehicle_mod'],
  stat: (h, stat) => (!grounded(h) ? 0 : stat === 'move' ? -0.5 : stat === 'skill:reaction_speed' ? -1 : 0),
  actions: [{
    id: 'seat', label: 'Back in a seat', scope: ['world', 'story'], target: 'none', ap: 0,
    available: (h) => (grounded(h) ? true : false),
    text: 'You are driving or flying again, so Grounded ends.',
    run: (h) => {
      const eid = postStory(h, 'gets back behind the stick.');
      if (h.c) delete h.c.state!.grounded;
      if (h.g && h.c) pendRuling(h.g, h.c, h.key, 'Ace Pilot: ' + h.c.name + ' says they are back in a seat (Grounded ended). If there is no vehicle here, refuse and set traitState {key:"grounded", value:true} again.', eid || undefined);
    },
  }],
  brief: (h) => (grounded(h) ? 'GROUNDED (−0.5 Movement, −1 Reaction Speed); ' : '') + 'pilots anything; set traitState grounded after a full day on foot with vehicles at hand',
});

// ---------- Worldline Fracture ----------
// Only if every squad member has it (requires party_all). The engine checks it and tells the Narrator in the brief
// whether it is active or dormant, and says so at each session start. All of it is the Narrator's (by design heavier:
// impossible events replace the area's normal ones; prepared campaign content stays, reframed: PROVISIONAL, plan 6).
const fractureActive = (g: any) => { const cs = (Object.values(g?.characters || {}) as Character[]).filter((c) => !c.dead); return cs.length > 0 && cs.every((c) => (c.traits || []).includes('worldline_fracture')); };
register({
  id: 'worldline_fracture', kind: 'trait', narrator: 'all',
  on: { session_start: (ctx, h) => { const g = h.g; if (!g || g.story?.wfSaid === g.sessionN) return; g.story.wfSaid = g.sessionN; sys(h, fractureActive(g) ? 'Worldline Fracture is active: the whole squad carries it.' : 'Worldline Fracture is dormant: not every squad member has it.'); } },
  brief: (h) => (fractureActive(h.g) ? 'ACTIVE: put impossible events in place of each area\'s normal ones (reframe prepared content)' : 'dormant (not the whole squad): ignore it'),
});
