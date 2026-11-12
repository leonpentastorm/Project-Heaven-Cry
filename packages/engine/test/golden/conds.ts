// @ts-nocheck (a recording tool; see harness.ts)
// THE CONDITIONS TABLE of engine foundations 2 (review finding F4). Every condition the data or the engine names, on
// every tier and on a character, through its whole life:
//   apply/<id>/<bearer>     put on by a character (a save where there is one) from three dice: a 1, a 10 and a 20
//   stack/<id>/<bearer>     put on, then a longer dose, then a shorter one ("no stacking: the longer stands")
//   tick/<id>/<bearer>      put on in someone else's turn, then five of the bearer's turns (start, then end), then ended
//   own/<id>/<bearer>       put on in the bearer's OWN turn, then three turns ("that turn's end doesn't count")
//   cleanse/<id>/<bearer>   what CLEANSE and the lists see, then the generic `cleanse` op, then endCond
//   immune/<id>/<door>      the two doors of an immunity (the `immune:` query and the 'cond_apply' hook), and Marked
//   via/<skill>/<bearer>    the same condition delivered by each kind of source: a technique (Raw Power, Dexterity), a
//                           trap (Ingenuity), a Line (Brain Power), an Outburst (Will Power), a prayer (Faith), a song
//                           (Empathy), a Call (its gamma), no source skill, nobody (a hazard), an enemy of each tier
//   item/<item>/<role>      every trait and perk, held by the bearer and by the source: only what it CHANGES is kept
//   site/<site>/<case>      the places that wrote a condition flag directly (a weapon's on-hit Bleeding and Prone, a
//                           serrated critical, the injury table, a fumble, kneel, a shove into a wall, a hazard, a
//                           stim, standing up, hiding), plain and against the two immunity doors
//   story/<id>              a story condition carried into a fight; restore/<id>: one kept in the story's magic state
//   moved/<site>            the moved sites the review of 12 Nov found unpinned (see the block)
//
// A line is what changed on the bearer against the clean unit: conditions and their rounds, who and what delivered
// them, the flags (Prone, Hidden, Braced), Bleeding, Dazed, Staggered, injuries, Defense, Movement, vision, AP, HP.
// Two files, as the rules tables: conditions.json (STATE: must not move without a ruling) and conditions.log.json
// (the words). Record on purpose only:  GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-conditions
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { A, W, copy, fightSpec, place, turn, pcs, foes, rollState, TIERS, label } from './harness';
import { onHook, onStat, genericOf } from '../../src/effects/hooks';
import { storyWith } from '../helpers/perkfight';

const DATA = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/conditions.json', import.meta.url)), 'utf8'));
/** Every id: the data's 40, the two the engine has and the data lacks, and the old names the engine still answers to. */
export const IDS: string[] = [...new Set([...DATA.items.map((x: any) => x.id), 'guarded', 'inspired', 'ldebuff', 'rdebuff', 'afraid', 'stun'])];
const MAIN = IDS.filter((x) => !['ldebuff', 'rdebuff', 'afraid', 'stun'].includes(x));

const MARK: { immune?: string; what?: string[]; hooked?: string; hookIds?: string[]; injury?: string; shrug?: string; landed?: number } = {};
if (!(globalThis as any).__condsTap) {
  (globalThis as any).__condsTap = true;
  onHook('cond_apply', (ctx: any) => { if (MARK.hooked && ctx.t?.id === MARK.hooked && (!MARK.hookIds || MARK.hookIds.includes(ctx.id))) { ctx.cancel = true; ctx.why = 'golden hook'; } });
  onHook('injury', (ctx: any) => { if (MARK.injury && ctx.t?.id === MARK.injury) { ctx.cancel = true; ctx.why = 'golden injury hook'; } });
  // a stand-in for Shrug It Off (it ends Prone the moment it lands), and a count of the landings
  onHook('cond_landed', (ctx: any) => { if (ctx.id !== 'prone') return; if (MARK.landed != null) MARK.landed++; if (MARK.shrug && ctx.t?.id === MARK.shrug) { A.endCond(ctx.t, 'prone', ctx.cb); ctx.cb.log.push(ctx.t.name + ' shrugs it off (golden).'); } });
  for (const id of [...IDS, 'bleed']) onStat(('immune:' + id) as any, (x: any) => (MARK.immune && x.u?.id === MARK.immune && (MARK.what || []).includes(id) ? 1 : 0));
}
const clear = () => { delete MARK.immune; delete MARK.what; delete MARK.hooked; delete MARK.hookIds; delete MARK.injury; delete MARK.shrug; delete MARK.landed; };

const EVEN = { level: 6, skills: Object.fromEntries(A.SKILLS.map((x: any) => [x.id, 5])), attrs: Object.fromEntries(A.ATTRS.map((x: any) => [x.id, 5])) };
const BEARERS = [...TIERS, 'pc'];
const NUM = ['def', 'movement', 'vision', 'ap', 'hp', 'armour', 'bleed', 'dazedNext', 'stunnedNext'];
const FLAG = ['prone', 'hidden', 'braced', 'downed', 'dead', 'skipTurn', 'jammed', 'surrendered'];
const snap = (u: any) => ({ conds: { ...(u.conds || {}) }, by: { ...(u.condBy || {}) }, via: { ...(u.condVia || {}) }, arg: { ...(u.condArg || {}) }, fresh: [...(u.condFresh || [])], at: { ...(u.condAt || {}) },
  num: NUM.map((k) => u[k] || 0), flag: FLAG.map((k) => !!u[k]), inj: (u.injuries || []).map((i: any) => i.loc).join('+'), nailed: !!u.nailed, mask: u.maskLeft || 0, watch: !!u.overwatch, hideEntry: u.hideEntry || 0 });
/** What differs on the unit now from the snapshot. */
function diff(b: any, u: any): string {
  const n = snap(u), p: string[] = [];
  for (const k of Object.keys(n.conds).sort()) if (!(k in b.conds)) p.push('+' + k + n.conds[k] + (n.by[k] ? '@' + n.by[k] : '') + (n.via[k] ? '~' + n.via[k] : '') + (n.arg[k] ? '=' + n.arg[k] : '') + (n.fresh.includes(k) ? '*' : '')); else if (b.conds[k] !== n.conds[k]) p.push(k + b.conds[k] + '>' + n.conds[k]);
  for (const k of Object.keys(b.conds).sort()) if (!(k in n.conds)) p.push('-' + k);
  NUM.forEach((k, i) => { if (b.num[i] !== n.num[i]) p.push(k + b.num[i] + '>' + n.num[i]); });
  FLAG.forEach((k, i) => { if (b.flag[i] !== n.flag[i]) p.push((n.flag[i] ? '+' : '-') + k); });
  if (b.inj !== n.inj) p.push('inj[' + n.inj + ']'); if (b.nailed !== n.nailed) p.push(n.nailed ? '+nailed' : '-nailed'); if (b.mask !== n.mask) p.push('mask' + n.mask);
  if (b.watch !== n.watch) p.push(n.watch ? '+watch' : '-watch'); if (b.hideEntry !== n.hideEntry) p.push('entry' + n.hideEntry);
  const order = Object.keys(n.at).filter((k) => !(k in b.at)).sort((x, y) => n.at[x] - n.at[y]); if (order.length) p.push('seq[' + order.join('<') + ']');
  return p.join(' ') || 'nothing';
}
const draws = (from: number, to: number): string => { let s = from | 0, n = 0; while (s !== (to | 0) && n < 600) { s = (s + 0x6d2b79f5) | 0; n++; } return n >= 600 ? '?' : String(n); };
const short = (e: any) => String(e?.message ?? e).replace(/\s+/g, ' ').slice(0, 90);
const guard = (f: () => string): string => { try { return f(); } catch (e: any) { return (e?.name === 'RuleError' ? 'REFUSED ' : 'THREW ') + short(e); } };

interface Stage { g: any; cb: any; src: any; t: any; other: any; base: any }
function stageOf(g0: any, bearer: string, o: { turnOf?: 'src' | 't'; srcFoe?: string } = {}): Stage {
  const g = copy(g0), cb = g.combat, P = pcs(g), F = foes(g);
  const t = bearer === 'pc' ? P[1] : F[TIERS.indexOf(bearer)], src = o.srcFoe ? F[TIERS.indexOf(o.srcFoe)] : P[0], other = P[2];
  place(g, [[src, '5,5'], [t, '6,5']]);
  turn(g, o.turnOf === 't' ? t : src, 9); t.ap = 6; clear();
  g.rng.state = 4242;
  return { g, cb, src, t, other, base: snap(t) };
}
const put = (s: Stage, id: string, rounds?: number, opts: any = { skipSave: true, via: 'raw_power' }): string => W(s.g, () => A.applyCond(s.cb, s.g.rng, s.src, s.t, id, rounds, undefined, opts));
const startTurn = (s: Stage) => { const cb = s.cb; cb.turn = cb.order.indexOf(s.t.id); delete cb.window; W(s.g, () => A.beginTurn(cb, s.g.rng)); };
const endTurnOf = (s: Stage) => W(s.g, () => A.closeTurn(s.cb, s.g.rng, s.t));
const logSince = (s: Stage, n: number) => s.cb.log.slice(n).map((l: string) => l.slice(0, 200)).join(' / ');

export function recordConditions(): { state: Record<string, string>; log: Record<string, string> } {
  const state: Record<string, string> = {}, log: Record<string, string> = {};
  const set = (k: string, a: string, b: string) => { state[k] = a; log[k] = b; };
  const g0 = fightSpec([{ ...EVEN }, { ...EVEN, weapon: 'sabre' }, { ...EVEN }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'conds' });
  for (const u of g0.combat.units) { u.hp = u.maxHp; u.hidden = false; }

  // ---------- the life of each condition on each bearer ----------
  for (const id of IDS) for (const bearer of BEARERS) {
    const key = id + '/' + bearer;
    // apply: three dice
    { const a: string[] = [], b: string[] = [];
      for (const die of [1, 10, 20]) { const s = stageOf(g0, bearer); s.g.rng.state = rollState(die); const was = s.g.rng.state; const r = guard(() => put(s, id, undefined, { via: 'raw_power' })); a.push('d' + die + ' n' + draws(was, s.g.rng.state) + ' ' + diff(s.base, s.t)); b.push(r); }
      set('apply/' + key, a.join(' || '), b.join(' || ')); }
    if (!MAIN.includes(id)) continue;
    // stack: the dose, a longer one, a shorter one, one from someone else
    { const s = stageOf(g0, bearer), a: string[] = [], b: string[] = [];
      for (const [rounds, who] of [[undefined, 0], [5, 0], [1, 0], [2, 1]] as any[]) { if (who) s.src = s.other; b.push(guard(() => put(s, id, rounds))); a.push(diff(s.base, s.t)); }
      set('stack/' + key, a.join(' | '), b.join(' | ')); }
    // tick: five turns of the bearer, then ended
    for (const mode of ['tick', 'own']) {
      const s = stageOf(g0, bearer, { turnOf: mode === 'own' ? 't' : 'src' }), a: string[] = [], n0 = s.cb.log.length;
      const r = guard(() => put(s, id)); a.push(diff(s.base, s.t));
      if (mode === 'own') { guard(() => { endTurnOf(s); return ''; }); a.push('e:' + diff(s.base, s.t)); }
      for (let i = 0; i < (mode === 'own' ? 3 : 5) && !s.t.dead; i++) { const e1 = guard(() => { startTurn(s); return ''; }); a.push('s:' + (e1 || diff(s.base, s.t))); const e2 = guard(() => { endTurnOf(s); return ''; }); a.push('e:' + (e2 || diff(s.base, s.t))); }
      guard(() => { W(s.g, () => A.endCond(s.t, id, s.cb)); return ''; }); a.push('end:' + diff(s.base, s.t));
      set(mode + '/' + key, a.join(' | '), r + ' ## ' + logSince(s, n0));
    }
    // cleanse: the lists, the generic op, endCond
    { const s = stageOf(g0, bearer), a: string[] = []; guard(() => put(s, id));
      a.push('on=' + A.condOn(s.t, id) + ' is=' + A.isCondition(id) + ' boon=' + A.isBoon(id) + ' fam=' + A.condFamily(id) + ' name=' + A.condName(id) + ' rounds=' + A.condRoundsOf(id));
      a.push('list[' + A.cleanseList(s.t, 9).join(',') + '] debuffs[' + A.debuffsOf(s.t).join(',') + '] body[' + A.bodyDebuffs(s.t).join(',') + ']');
      const h = { u: s.src, c: s.g.characters[s.src.charId], cb: s.cb, g: s.g, info: { id: 'golden', name: 'Golden' } };
      const op = guard(() => String(W(s.g, () => genericOf('cleanse').run(h, { op: 'cleanse', target: 'target', count: 9 }, { targetId: s.t.id }))));
      a.push('op:' + diff(s.base, s.t));
      guard(() => { W(s.g, () => A.endCond(s.t, id, s.cb)); return ''; }); a.push('end:' + diff(s.base, s.t));
      set('cleanse/' + key, a.join(' | '), op); }
  }

  // ---------- immunities: the two doors, and what Marked does to Hidden ----------
  for (const id of MAIN) for (const bearer of ['soldier', 'pc']) {
    for (const door of ['query', 'hook', 'query-bleed']) {
      if (door === 'query-bleed' && id !== 'bleeding' && id !== 'injured') continue;
      const s = stageOf(g0, bearer); s.g.rng.state = rollState(2);
      if (door === 'hook') MARK.hooked = s.t.id; else { MARK.immune = s.t.id; MARK.what = [door === 'query' ? id : 'bleed']; }
      const r = guard(() => put(s, id, undefined, { via: 'raw_power' })); clear();
      set('immune/' + id + '/' + bearer + '/' + door, diff(s.base, s.t), r);
    }
  }
  { const s = stageOf(g0, 'soldier'); const a: string[] = [], b: string[] = [];
    b.push(guard(() => put(s, 'hidden'))); a.push(diff(s.base, s.t)); b.push(guard(() => put(s, 'marked'))); a.push(diff(s.base, s.t)); b.push(guard(() => put(s, 'hidden'))); a.push(diff(s.base, s.t));
    b.push(guard(() => W(s.g, () => A.hide(s.cb, s.t)))); a.push(diff(s.base, s.t));
    set('immune/hidden/marked', a.join(' | '), b.join(' | ')); }

  // ---------- each kind of source ----------
  const VIAS = ['raw_power', 'dexterity', 'ingenuity', 'brain_power', 'will_power', 'faith', 'empathy', 'intimidation', 'authority', null];
  for (const bearer of BEARERS) {
    for (const via of VIAS) { const s = stageOf(g0, bearer); s.g.rng.state = rollState(10); const r = guard(() => put(s, 'weakened', undefined, via ? { via } : {})); set('via/' + (via || 'none') + '/' + bearer, diff(s.base, s.t), r); }
    { const s = stageOf(g0, bearer); s.g.rng.state = rollState(10); const r = guard(() => W(s.g, () => A.applyCond(s.cb, s.g.rng, null, s.t, 'weakened'))); set('via/nobody/' + bearer, diff(s.base, s.t), r); }
    { const s = stageOf(g0, bearer); s.g.rng.state = rollState(10); const r = guard(() => W(s.g, () => A.withVia(s.src, 'brain_power', () => A.applyCond(s.cb, s.g.rng, s.src, s.t, 'weakened'), 3))); set('via/laid-strength-3/' + bearer, diff(s.base, s.t), r); }
    for (const tier of TIERS) { if (tier === bearer) continue; const s = stageOf(g0, bearer, { srcFoe: tier }); s.g.rng.state = rollState(10); const r = guard(() => put(s, 'weakened', undefined, {})); set('via/foe-' + tier + '/' + bearer, diff(s.base, s.t), r); }
  }

  // ---------- the sites that wrote a flag directly ----------
  const SITES: Record<string, (s: Stage) => any> = {
    'weapon-bleed': (s) => { s.src.weapon = 'ork_rip_saw'; return FORCE(10, () => A.resolveAttack(s.cb, s.g.rng, s.src, s.t, 'strike', s.g.characters[s.src.charId])); },
    'weapon-prone': (s) => { s.src.weapon = 'maul'; s.t.braced = true; return FORCE(10, () => A.resolveAttack(s.cb, s.g.rng, s.src, s.t, 'strike', s.g.characters[s.src.charId])); },
    'weapon-stagger': (s) => { s.src.weapon = 'magistrate_pistol'; s.src.ammo = 6; return FORCE(10, () => A.resolveAttack(s.cb, s.g.rng, s.src, s.t, 'shot', s.g.characters[s.src.charId])); },
    'injury-d6-1': (s) => { s.t.injResist = 0; s.g.rng.state = dieState(6, 1); return A.rollInjury(s.g.rng, s.t, s.cb, s.src); },
    'injury-d6-2': (s) => { s.t.injResist = 0; s.g.rng.state = dieState(6, 2); return A.rollInjury(s.g.rng, s.t, s.cb, s.src); },
    'injury-d6-4': (s) => { s.t.injResist = 0; s.g.rng.state = dieState(6, 4); return A.rollInjury(s.g.rng, s.t, s.cb, s.src); },
    'injury-d6-6': (s) => { s.t.injResist = 0; s.g.rng.state = dieState(6, 6); return A.rollInjury(s.g.rng, s.t, s.cb, s.src); },
    'injured-condition': (s) => { s.t.injResist = 0; s.g.rng.state = dieState(6, 2); return A.applyCond(s.cb, s.g.rng, s.src, s.t, 'injured'); },
    'shove-wall': (s) => { s.other.pos = '7,5'; s.src.strength = 50; return A.shove(s.cb, s.g.rng, s.src, s.t); },
    'kneel': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'commanded', undefined, undefined, { skipSave: true, arg: 'kneel' }); s.t.braced = true; startTurn(s); return ''; },
    'drop-prone': (s) => A.toggleProne(s.cb, s.t),
    'stand-up': (s) => { s.t.prone = true; return A.toggleProne(s.cb, s.t); },
    'prone-ends-braced': (s) => { s.t.braced = true; return A.applyCond(s.cb, s.g.rng, s.src, s.t, 'prone'); },
    'hazard-fire': (s) => A.hazardHit(s.cb, s.g.rng, s.t, { id: 'hz', kind: 'fire', severity: 'heavy', zone: 'z', tiles: [s.t.pos], approaches: [] }, s.t.pos),
    'hazard-gas': (s) => { s.g.rng.state = rollState(2); return A.hazardHit(s.cb, s.g.rng, s.t, { id: 'hz', kind: 'gas', severity: 'heavy', zone: 'z', tiles: [s.t.pos], approaches: [] }, s.t.pos); },
    'injured-resisted': (s) => { s.t.injResist = 100; return A.applyCond(s.cb, s.g.rng, s.src, s.t, 'injured'); },
    'hazard-gas-light': (s) => { s.g.rng.state = rollState(2); return A.hazardHit(s.cb, s.g.rng, s.t, { id: 'hz', kind: 'gas', severity: 'light', zone: 'z', tiles: [s.t.pos], approaches: [] }, s.t.pos); },
    'hazard-collapse': (s) => A.hazardHit(s.cb, s.g.rng, s.t, { id: 'hz', kind: 'collapse', severity: 'heavy', zone: 'z', tiles: [s.t.pos], approaches: [] }, s.t.pos),
    'hazard-radiation': (s) => A.hazardHit(s.cb, s.g.rng, s.t, { id: 'hz', kind: 'radiation', severity: 'heavy', zone: 'z', tiles: [s.t.pos], approaches: [], exposure: { [s.t.charId || s.t.npcId || s.t.id]: 5 } }, s.t.pos),
    'stim-stops-bleeding': (s) => { s.t.bleed = 3; s.g.characters[s.src.charId].stims = 2; return A.useStim(s.cb, s.src, s.t, s.g.characters[s.src.charId], false); },
    'bleed-out': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'bleeding'); s.t.hp = 3; startTurn(s); return ''; },
    'hide': (s) => A.hide(s.cb, s.t, 'golden'),
    'hide-then-reveal': (s) => { A.hide(s.cb, s.t, 'golden'); return A.reveal(s.cb, s.t, 'golden'); },
    'hidden-then-hurt': (s) => { A.hide(s.cb, s.t, 'golden'); return A.hurtUnit(s.t, 5, true, s.cb, 'hazard'); },
    'hidden-then-endcond': (s) => { A.hide(s.cb, s.t, 'golden'); A.endCond(s.t, 'hidden', s.cb); return ''; },
    'extinguish': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'burning', undefined, undefined, { skipSave: true }); return A.extinguish(s.cb, s.src, s.t); },
    'stunned-loses-turn': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'stunned', undefined, undefined, { skipSave: true }); startTurn(s); return ''; },
    'dazed-costs-ap': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'dazed', undefined, undefined, { skipSave: true }); startTurn(s); return ''; },
    'quickened-gives-ap': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'quickened', undefined, undefined, { skipSave: true }); startTurn(s); return ''; },
    'grappler-leaves': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'grappled', undefined, undefined, { skipSave: true }); s.src.pos = '1,1'; startTurn(s); return ''; },
    'taunter-dies': (s) => { A.applyCond(s.cb, s.g.rng, s.src, s.t, 'taunted', undefined, undefined, { skipSave: true }); s.src.dead = true; startTurn(s); return ''; },
  };
  for (const [site, f] of Object.entries(SITES)) for (const bearer of ['soldier', 'pc']) for (const door of ['plain', 'query', 'hook']) {
    const s = stageOf(g0, bearer);
    if (door === 'hook') { MARK.hooked = s.t.id; MARK.hookIds = ['bleeding', 'prone', 'dazed', 'hidden', 'injured', 'burning', 'shaken', 'stunned', 'weakened']; } else if (door === 'query') { MARK.immune = s.t.id; MARK.what = ['bleed', 'bleeding', 'prone', 'dazed', 'hidden', 'injured', 'burning', 'shaken', 'stunned', 'weakened']; }
    const n0 = s.cb.log.length; let r = '';
    try { const out = W(s.g, () => f(s)); r = typeof out === 'string' ? out : out?.refused ? 'REFUSED ' + out.refused : ''; if (/^site\/weapon/.test('site/' + site)) r = r; } catch (e: any) { r = 'THREW ' + short(e); }
    clear();
    set('site/' + site + '/' + bearer + '/' + door, diff(s.base, s.t), r + ' ## ' + logSince(s, n0));
  }
  // a serrated critical and a fumble need their die: the attack hook forces it
  for (const [site, die] of [['serrated-crit', 20], ['fumble', 1]] as any[]) for (const door of ['plain', 'query', 'hook']) {
    const s = stageOf(g0, 'soldier'); s.src.weapon = 'sabre'; s.src.mods = ['mod_serrated']; s.t.injResist = 100;
    if (door === 'hook') { MARK.hooked = s.t.id; MARK.hookIds = ['bleeding']; } else if (door === 'query') { MARK.immune = s.t.id; MARK.what = ['bleed']; }
    const n0 = s.cb.log.length, sb = snap(s.src); let r = '';
    try { const out = W(s.g, () => FORCE(die, () => A.resolveAttack(s.cb, s.g.rng, s.src, s.t, 'strike', s.g.characters[s.src.charId]))); r = out?.refused ? 'REFUSED ' + out.refused : ''; } catch (e: any) { r = 'THREW ' + short(e); }
    clear();
    set('site/' + site + '/' + door, 'T ' + diff(s.base, s.t).replace(/hp\d+>\d+ ?/, '') + ' A ' + diff(sb, s.src).replace(/ap\d+>\d+ ?/, ''), r + ' ## ' + logSince(s, n0));
  }

  // ---------- the moved sites the review of 12 Nov found unpinned (conditions-review.json, problems 1, 3, 4, 8) ----------
  //   moved/tech-bleed/<technique>/<door>  each technique that puts Bleeding on with no rounds of its own (3 rounds since
  //                                        the text-number sweep, spec item 1512; listed in item 1581), on an edge weapon
  //   moved/stop-prone/<door>              a technique's Stop: Prone (the Shove technique into a wall: no save)
  //   moved/fighter-shove/<door>           the Fighter's Shove (Prone), with how many times cond_landed was told
  //   moved/called-shot-<place>/<door>     the Called Shot through the move (the injury hook and the condition door)
  //   moved/unravel                        the Counting Weaver's Unravel on a seen enemy (its boons, its Brace, its shield)
  //   moved/drop-prone-braced              dropping Prone by choice keeps a weapon Brace (spec item 1583)
  {
    const gT = fightSpec([{ ...EVEN, weapon: 'sabre' }, { ...EVEN }, { ...EVEN }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'conds-moved' });
    for (const u of gT.combat.units) { u.hp = u.maxHp; u.hidden = false; }
    const know = (s: Stage, id: string) => { const p = A.phys.ensurePhys(s.g.characters[s.src.charId]); p.known = [id]; p.ready = { melee: [id], ranged: [] }; p.uncapped = true; };
    const tech = (s: Stage, id: string, die: number, args: any = {}) => { know(s, id); return FORCE(die, () => A.useTechnique(s.cb, s.src, id, { targetId: s.t.id, tile: s.t.pos, ...args }, s.g.rng)); };
    const doors = (s: Stage, door: string, ids: string[]) => { if (door === 'hook') { MARK.hooked = s.t.id; MARK.hookIds = ids; } else if (door === 'query') { MARK.immune = s.t.id; MARK.what = ids; } else if (door === 'injury') MARK.injury = s.t.id; };
    const record = (key: string, s: Stage, f: () => any, extra: () => string = () => '') => {
      const n0 = s.cb.log.length; let r = '';
      try { const out = W(s.g, f); r = typeof out === 'string' ? out : out?.refused ? 'REFUSED ' + out.refused : ''; } catch (e: any) { r = 'THREW ' + short(e); }
      const x = extra(); clear(); set(key, diff(s.base, s.t).replace(/hp\d+>\d+ ?/, '') + x, r + ' ## ' + logSince(s, n0));
    };
    const TECH_BLEED: [string, number, (s: Stage) => any][] = [
      ['cut', 20, () => ({})], ['sweep', 20, () => ({})], ['cleave', 10, (s) => { (s.src.res ||= {}).momentum = 2; return {}; }],
      ['sunder', 10, (s) => { s.t.armour = 0; return {}; }],
      ['draw_cut', 10, (s) => { const c = s.g.characters[s.src.charId]; s.src.weapon = 'fists'; c.weapon = 'fists'; c.pack = [{ id: 'sabre', name: 'Sabre', qty: 1, kind: 'weapon', weapon: 'sabre' }]; if (s.src.tech?.draw_cut) delete s.src.tech.draw_cut.start; return { item: 0 }; }],
      ['pull_out', 10, (s) => { s.t.stuck = [{ by: s.src.id, weapon: 'combat_knife' }]; s.src.weapon = 'fists'; return {}; }],
    ];
    for (const [id, die, setup] of TECH_BLEED) for (const door of ['plain', 'query', 'hook']) {
      const s = stageOf(gT, 'soldier'); s.t.hp = s.t.maxHp = 999; const args = setup(s); s.base = snap(s.t); doors(s, door, door === 'query' ? ['bleed'] : ['bleeding']);
      record('moved/tech-bleed/' + id + '/' + door, s, () => tech(s, id, die, args));
    }
    for (const door of ['plain', 'query', 'hook']) {
      const s = stageOf(gT, 'soldier'); s.src.strength = 50; s.t.pos = '6,5'; s.other.pos = '7,5'; s.t.braced = true; s.base = snap(s.t); doors(s, door, ['prone']);
      record('moved/stop-prone/' + door, s, () => tech(s, 'shove', 10));
    }
    {
      const gF = fightSpec([{ ...EVEN, classId: 'fighter', level: 12, attrs: { ...EVEN.attrs, strength: 6 } }, { ...EVEN }, { ...EVEN }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'conds-shove' });
      for (const u of gF.combat.units) { u.hp = u.maxHp; u.hidden = false; }
      for (const door of ['plain', 'query', 'hook', 'shrug']) {
        const s = stageOf(gF, 'soldier'); s.t.sv = { body: -50, brain: -50, heart: -50 }; s.t.braced = true; s.base = snap(s.t); doors(s, door, ['prone']); if (door === 'shrug') MARK.shrug = s.t.id;
        MARK.landed = 0;
        record('moved/fighter-shove/' + door, s, () => A.runPerkAction({ u: s.src, c: s.g.characters[s.src.charId], cb: s.cb, g: s.g }, 'class:fighter.shove', { targetId: s.t.id, choice: 'prone' }, s.g.rng, 'combat'), () => ' landed' + MARK.landed);
      }
    }
    {
      const gC = fightSpec([{ ...EVEN, classId: 'marksman', level: 12, attrs: { ...EVEN.attrs, agility: 8 }, weapon: 'service_pistol' }, { ...EVEN }, { ...EVEN }], TIERS.map((tier) => ({ tier })), { level: 12, seed: 'conds-called' });
      for (const u of gC.combat.units) { u.hp = u.maxHp; u.hidden = false; }
      for (const loc of ['head', 'leg']) for (const door of ['plain', 'query', 'hook', 'injury']) {
        const s = stageOf(gC, 'soldier'); s.t.hp = s.t.maxHp = 999; s.t.injResist = 0; s.src.ammo = 12; s.src.pos = '3,5'; s.base = snap(s.t); doors(s, door, ['dazed']);
        record('moved/called-shot-' + loc + '/' + door, s, () => dice({ die: 10, hit: true }, () => A.runPerkAction({ u: s.src, c: s.g.characters[s.src.charId], cb: s.cb, g: s.g }, 'class:gunslinger.called_shot', { targetId: s.t.id, choice: loc }, s.g.rng, 'combat')));
      }
    }
    {
      const gU = fightSpec([{ ...EVEN, skills: { ...EVEN.skills, faith: 9 } }, { ...EVEN }, { ...EVEN }], TIERS.map((tier) => ({ tier })), { level: 6, seed: 'conds-unravel' });
      for (const u of gU.combat.units) { u.hp = u.maxHp; u.hidden = false; }
      const s = stageOf(gU, 'soldier'); const c = s.g.characters[s.src.charId];
      c.belief = { kind: 'faithful', patron: 'counting_weaver' }; c.patron = 'counting_weaver'; c.devotion = 10;
      // Unravel targets an enemy you can see, and a Hidden one is not on that list (faith.ts targetsOf): its reveal of a
      // Hidden unit cannot be reached through the action. Pinned: what it ends on a seen enemy.
      s.t.shield = 20; s.t.braced = true; W(s.g, () => { A.applyCond(s.cb, s.g.rng, null, s.t, 'inspired'); A.applyCond(s.cb, s.g.rng, null, s.t, 'guarded'); }); s.base = snap(s.t);
      s.src.ap = 9; s.g.rng.state = rollState(20);
      let r = '', line = 'nothing';
      try { const g1 = A.apply(s.g, { type: 'faith/pray', unitId: s.src.id, kind: 'hymn', id: 'unravel', targetId: s.t.id }, 'host'); const t1 = g1.combat.units.find((x: any) => x.id === s.t.id); line = diff(s.base, t1).replace(/hp\d+>\d+ ?/, '') + ' shield' + (t1.shield || 0); r = g1.combat.log.slice(s.cb.log.length).map((l: string) => l.slice(0, 200)).join(' / '); } catch (e: any) { r = 'THREW ' + short(e); }
      set('moved/unravel', line, r);
    }
    for (const bearer of ['soldier', 'pc']) {
      const s = stageOf(g0, bearer, { turnOf: 't' }); s.t.braced = true; s.base = snap(s.t);
      record('moved/drop-prone-braced/' + bearer, s, () => { const a = A.toggleProne(s.cb, s.t) || ''; const b = A.toggleProne(s.cb, s.t) || ''; return a + b; });
    }
  }

  // ---------- every trait and perk: what it changes, as the bearer and as the source ----------
  const baseline: Record<string, string> = {};
  const ITEM_IDS = ['weakened', 'fear', 'ldebuff', 'silenced', 'stunned', 'nausea', 'pinned', 'slowed', 'burning', 'bleeding', 'prone', 'dazed', 'injured', 'grappled', 'disarmed', 'lowered', 'taunted', 'commanded', 'shaken', 'marked', 'confused', 'corroded', 'suppressed', 'blinded', 'puppeted', 'smitten', 'guarded', 'witnessed', 'hopeful'];
  const itemRun = (spec: any, role: 'bearer' | 'source'): Record<string, string> => {
    const out: Record<string, string> = {};
    let g: any; try { g = fightSpec(role === 'bearer' ? [{ ...EVEN }, { ...EVEN, ...spec }] : [{ ...EVEN, ...spec }, { ...EVEN }], [{ tier: 'soldier' }], { level: 6, seed: 'conds' }); } catch (e: any) { return { '*': 'NO FIGHT ' + short(e) }; }
    for (const u of g.combat.units) { u.hp = u.maxHp; u.hidden = false; }
    for (const id of ITEM_IDS) {
      const g1 = copy(g), cb = g1.combat, P = pcs(g1), F = foes(g1), t = role === 'bearer' ? P[1] : F[0], src = role === 'bearer' ? F[0] : P[0];
      place(g1, [[src, '5,5'], [t, '6,5']]); try { turn(g1, src, 9); } catch { /* an item that refuses the turn */ }
      g1.rng.state = rollState(8); const b = snap(t), was = g1.rng.state;
      const r = guard(() => W(g1, () => A.applyCond(cb, g1.rng, src, t, id, undefined, undefined, { via: 'raw_power' })));
      out[id] = 'n' + draws(was, g1.rng.state) + ' ' + diff(b, t) + ' ## ' + r;
    }
    return out;
  };
  Object.assign(baseline, { bearer: itemRun({}, 'bearer'), source: itemRun({}, 'source') });
  const items: [string, any][] = [...A.TRAITS.map((x: any) => ['trait:' + x.id, { traits: [x.id] }]), ...A.PERKS.map((x: any) => ['perk:' + x.id, { perks: { [x.id]: x.tier === 'mastered' || x.tier === 'achieved' || x.tier === 'ultimate' ? x.tier : 'II' } }])];
  for (const [name, spec] of items) for (const role of ['bearer', 'source'] as const) {
    const got = itemRun(spec, role), base = (baseline as any)[role], ch = Object.keys(got).filter((k) => got[k] !== base[k]);
    if (!ch.length) continue;
    set('item/' + name + '/' + role, ch.map((k) => k + ': ' + got[k].split(' ## ')[0]).join(' | '), ch.map((k) => k + ': ' + (got[k].split(' ## ')[1] || '')).join(' | '));
  }
  set('item/#baseline', ITEM_IDS.map((k) => k + ': ' + baseline.bearer[k].split(' ## ')[0]).join(' | ') + ' || ' + ITEM_IDS.map((k) => k + ': ' + baseline.source[k].split(' ## ')[0]).join(' | '), '');

  // ---------- story conditions into a fight ----------
  for (const id of IDS) for (const how of ['story', 'restore']) {
    let line = '', words = '';
    try {
      const s = storyWith([{ ...EVEN }], 'conds'); const c = s.chars[0];
      if (how === 'story') A.setStoryCond(s.g, s.g.characters[c.id], id, 'scene'); else ((s.g.story.magic ||= {})[c.id] ||= {}).conds = { [id]: 2 };
      s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Golden fight', map: 'golden', difficulty: 'standard', enemies: [{ name: 'Soldier', tier: 'soldier', weapon: 'service_pistol', no_surrender: true }] } } });
      const cb = s.g.combat, u = cb.units.find((x: any) => x.charId === c.id);
      const clean = fightSpec([{ ...EVEN }], [{ tier: 'soldier' }], { seed: 'conds' }).combat.units.find((x: any) => x.charId);
      line = Object.keys(u.conds || {}).sort().map((k) => k + u.conds[k]).join(' ') + ' def' + (u.def - clean.def) + ' mv' + (u.movement - clean.movement) + ' vis' + ((u.vision || 0) - (clean.vision || 0)) + ' bleed' + (u.bleed || 0) + ' daz' + (u.dazedNext || 0) + (u.prone ? ' prone' : '') + (u.hidden ? ' hidden' : '') + ' inj[' + (u.injuries || []).map((i: any) => i.loc).join('+') + ']';
      words = cb.log.filter((l: string) => /carries|entered the fight/.test(l)).join(' / ') + ' ' + (cb.notes || []).join(' / ');
    } catch (e: any) { line = 'THREW ' + short(e); }
    set(how + '/' + id, line, words);
  }
  return { state, log };
}
/** An RNG state whose next die of `sides` is n. */
function dieState(sides: number, n: number): number { for (let s = 1; s < 400000; s++) { if (A.die({ state: s }, sides) === n) return s; } throw new Error('no seed'); }
/** Run f with the attack die forced (harness.ts DICE). */
import { dice } from './harness';
const FORCE = <T>(die: number, f: () => T): T => dice({ die }, f);
