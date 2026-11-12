// @ts-nocheck (a recording tool, like the golden tables' harness)
// THE WHOLE-FIGHT REPLAYS (docs/design/proposals/2026-11-engine-review/2-performance.md, section 8): whole seeded
// games played through the public reducer (apply) with the ENEMY AI ON, each reduced to hashes. The golden tables hold
// damage numbers with the AI off; they never walk a path, ask who sees whom, choose a target or order two reactions.
// These replays do, so a change that is meant to move nothing (a faster path search, a cache, a cheaper copy) can be
// proved to move nothing: every path tie, every sight question, every die, every effect and log line is in the hash.
//
// The player side is the balance simulator's policies (test/balance/policies.ts) and builds (builds.ts): they read the
// engine's own previews and paths, so they notice a changed preview too. Nothing here measures anything.
//
// What one replay records (test/golden/replays.json, one entry per scenario):
//   actions  how many actions were sent (refused ones included: a refusal and its message are part of the stream)
//   state    SHA-256 of JSON.stringify(final GameState)
//   stream   SHA-256 of the ordered stream: every action, its refusal if any, and what it added (the fight's effects
//            and log lines, the story's entries and effects), in order
//   marks    every MARK_EVERY actions: [action number, state hash, stream hash] (short), so a difference points at
//            the stretch of actions where it began
import { createHash } from 'node:crypto';
import { apply, newGame, alive, migrateLoaded, CASTER, HEART_CASTER, refOf, standable, MAPS } from '../../src';
import { buildCharacter, BUILD } from '../balance/builds';
import { POLICIES, sigilAfter } from '../balance/policies';
import { MAP_ID, TIER_WEAPON, foeLevel } from '../balance/sim';

export const MARK_EVERY = 25;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
export interface Pc { build: string; variant?: 'normal' | 'allin'; level: number }
export interface Replay { actions: number; state: string; stream: string; marks: [number, string, string][] }

/** One game being recorded: every action goes through act(). */
export class Rec {
  g: any; n = 0; errors: string[] = []; marks: [number, string, string][] = [];
  /** What was sent, by action type: [accepted, refused]; and the most enemies one fight held (for the coverage test). */
  tally: Record<string, [number, number]> = {}; maxFoes = 0;
  private h = createHash('sha256'); private epoch = ''; private fxN = 0; private logN = 0; private entN = 0; private sfxN = 0; private lastEnt = '';
  /** `reload`: at these action numbers the state is saved and loaded (serialised, parsed, migrateLoaded) before going on. */
  constructor(g: any, public pcs: Pc[], public reload: number[] = []) { this.g = g; }
  /** Send one action. Returns the refusal's message, or null. */
  act(action: any, by = 'host'): string | null {
    let err: string | null = null, next: any = null;
    try { next = apply(this.g, action, by); } catch (e: any) { err = String(e?.message || e); }
    this.n++; (this.tally[action.type] ||= [0, 0])[err ? 1 : 0]++;
    const part: any = { a: action, by };
    if (err) part.err = err;
    else {
      this.g = next; const g = next, cb = g.combat, st = g.story || {};
      // a new fight starts its own effects and log (the same two counters apply() reads to know a fight began)
      const epoch = (g.music?.fight || 0) + '/' + (g.sandbox?.fights || 0) + '/' + (cb ? cb.name : '');
      if (epoch !== this.epoch) { this.epoch = epoch; this.fxN = 0; this.logN = 0; }
      if (cb) { this.maxFoes = Math.max(this.maxFoes, cb.units.filter((u: any) => u.side === 'foe').length); part.fx = (cb.fx || []).filter((e: any) => e.n > this.fxN); this.fxN = cb.fxSeq || 0; if (cb.log.length < this.logN) this.logN = 0; part.log = cb.log.slice(this.logN); this.logN = cb.log.length; part.turn = [cb.round, cb.turn, cb.over || null]; }
      const ents = st.entries || []; let from = ents.findIndex((e: any) => e.id === this.lastEnt); from = from < 0 ? 0 : from + 1;
      part.entries = ents.slice(from); if (ents.length) this.lastEnt = ents[ents.length - 1].id;
      if ((st.fxSeq || 0) < this.sfxN) this.sfxN = 0;
      part.sfx = (st.fx || []).filter((e: any) => e.n > this.sfxN); this.sfxN = st.fxSeq || 0;
      part.phase = g.phase;
    }
    this.h.update(JSON.stringify(part) + '\n');
    if (this.n % MARK_EVERY === 0) this.marks.push([this.n, sha(JSON.stringify(this.g)).slice(0, 12), this.h.copy().digest('hex').slice(0, 12)]);
    if (this.reload.includes(this.n)) this.g = migrateLoaded(JSON.parse(JSON.stringify(this.g)));
    return err;
  }
  /** An action that must be accepted (the scenario's own steps): a refusal is a broken scenario. */
  must(action: any, by = 'host') { const e = this.act(action, by); if (e) this.errors.push(action.type + ': ' + e); }
  done(): Replay { return { actions: this.n, state: sha(JSON.stringify(this.g)), stream: this.h.copy().digest('hex'), marks: this.marks }; }

  /** Play the fight the game is in to its end (or for maxRounds rounds of it) with the simulator's policies. */
  fight(maxRounds = 8) {
    const memo: Record<string, any> = {}, spec = (u: any) => { const i = Number(String(u.charId || '').slice(1)) - 1; return u.side === 'pc' && !u.companion && this.pcs[i] ? this.pcs[i] : null; };
    const round0 = this.g.combat?.round || 1;
    const cur = (cb: any) => cb.window?.queue?.[0]?.unitId ?? cb.order[cb.turn];
    for (let guard = 0; guard < 4000; guard++) {
      const cb = this.g.combat; if (!cb || cb.over || this.g.phase !== 'combat') break;
      if (cb.round - round0 >= maxRounds) break;
      const uid = cur(cb), u = cb.units.find((q: any) => q.id === uid); if (!u) break;
      if (cb.window) { if (this.act({ type: 'combat/decline', unitId: u.id }) && this.act({ type: 'combat/end-turn', unitId: u.id })) { this.errors.push('stuck in a window'); break; } continue; }
      const sp = spec(u);
      if (!sp) { if (this.act({ type: 'combat/end-turn', unitId: u.id })) { this.errors.push('stuck on ' + u.name); break; } continue; }
      const pol = POLICIES[BUILD[sp.build].policy], banned = new Set<string>(); let fails = 0; memo[u.id] ||= {};
      for (let k = 0; k < 30; k++) {
        const c2 = this.g.combat; if (!c2 || c2.over || this.g.phase !== 'combat' || c2.window || cur(c2) !== u.id) break;
        const me = c2.units.find((q: any) => q.id === u.id); if (!me || me.downed || me.dead || me.ap <= 0) break;
        const x = { g: this.g, cb: c2, u: me, c: this.g.characters[me.charId], foes: c2.units.filter((q: any) => q.side === 'foe' && alive(q) && !q.hidden), allies: c2.units.filter((q: any) => q.side === 'pc' && q.id !== me.id && alive(q)), memo: memo[u.id], banned, peak: false, opts: {} };
        let step: any = null; try { step = pol(x); } catch (e: any) { this.errors.push('policy: ' + String(e?.message || e).slice(0, 160)); break; }
        if (!step) break;
        const err = this.act({ unitId: u.id, ...step.action });
        if (pol === POLICIES.sigil) { const c3 = this.g.combat; if (c3) sigilAfter({ ...x, g: this.g, cb: c3, u: c3.units.find((q: any) => q.id === u.id) }, step, !err); }
        if (err) { banned.add(JSON.stringify(step.action)); if (++fails > 6) break; }
      }
      const c4 = this.g.combat;
      if (c4 && !c4.over && this.g.phase === 'combat' && !c4.window && c4.order[c4.turn] === u.id) { if (this.act({ type: 'combat/end-turn', unitId: u.id })) { this.errors.push('could not end the turn of ' + u.name); break; } }
    }
  }
}

/** A room with the squad's characters in it (the simulator's reference builds), still in the lobby. */
export function lobby(seed: string, pcs: Pc[]) {
  const g = newGame(seed, { id: 'host', name: 'Host' });
  pcs.forEach((p, i) => { const c = buildCharacter(p.build, p.variant || 'normal', p.level).c; c.id = 'c' + (i + 1); c.owner = 'host'; c.name = BUILD[p.build].label + ' ' + (i + 1); g.characters[c.id] = c; });
  return g;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** The Narrator's turn that opens a fight. A foe is a tier ('soldier') or a caster's id ('sigil_adept', 'heart_adept'). */
export function fightTurn(pcs: Pc[], foes: string[], map: 'open' | 'cover' | null, name: string, extra: Record<string, any> = {}) {
  const enemies = foes.map((f, i) => { const c = CASTER[f] || HEART_CASTER[f], tier = c ? c.tier : f; return { name: (c ? c.name : cap(tier)) + ' ' + (i + 1), tier, weapon: c ? c.weapon : TIER_WEAPON[tier] || 'service_pistol', no_surrender: true, ...(c ? { caster: f } : {}) }; });
  return { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name, ...(map ? { map: MAP_ID[map] } : {}), difficulty: 'standard', level: foeLevel({ pcs }), enemies, ...extra } } };
}

// ---------- the scenarios ----------
export interface Scenario { name: string; full?: boolean; run: (reload?: number[]) => Rec }
const story = (seed: string, pcs: Pc[], reload: number[] = []) => {
  const r = new Rec(lobby(seed, pcs), pcs, reload);
  r.must({ type: 'session/start' }); r.must({ type: 'narrator/turn', turn: { narration: 'The replay begins.', sceneTitle: 'Replay' } });
  return r;
};
/** A story fight on one of the simulator's two grounds, played to its end (or maxRounds), then the Narrator's closing turn. */
const storyFight = (name: string, pcs: Pc[], foes: string[], map: 'open' | 'cover', maxRounds = 8, full = false): Scenario => ({ name, full, run: (reload = []) => {
  const r = story('REPLAY-' + name, pcs, reload);
  r.must(fightTurn(pcs, foes, map, 'Replay fight')); r.fight(maxRounds);
  if (r.g.phase !== 'combat') r.must({ type: 'narrator/turn', turn: { narration: 'The noise dies away.' } });
  return r;
} });
/** Free tiles east of the middle of the Proving Ground, for drill units added by hand (the same walk every time). */
function freeTiles(g: any, n: number): string[] {
  const map = MAPS[g.story.zone] || null, w = 26, h = 26, taken = new Set<string>([...Object.values(g.story.positions || {}), ...(g.story.npcs || []).map((x: any) => x.pos), ...(g.story.objects || []).map((o: any) => o.pos)] as string[]), out: string[] = [];
  for (let x = w - 2; x >= 15 && out.length < n; x--) for (let y = 5; y < h - 5 && out.length < n; y += 2) { const k = x + ',' + y; if (!taken.has(k) && (!map || standable(map, k))) out.push(k); }
  return out;
}
/** The Proving Ground (the 26 × 26 ground with cover, doors, a mine, fire and toxic ground): a staged wave plus drill
 * units added by hand, so more enemies than a story fight takes; then the waves that follow, as far as `waves` goes. */
const proving = (name: string, pcs: Pc[], wave: number, extra: string[], o: { maxRounds?: number; waves?: number; full?: boolean; total?: number } = {}): Scenario => ({ name, full: o.full, run: (reload = []) => {
  const r = new Rec(lobby('REPLAY-' + name, pcs), pcs, reload);
  r.must({ type: 'sandbox/start' }); r.must({ type: 'sandbox/stage', wave });
  // `total`: the list is gone through again until that many enemies stand on the map
  const need = Math.max(extra.length, (o.total || 0) - (r.g.story.npcs || []).filter((x: any) => x.side === 'hostile').length), list = extra.length ? Array.from({ length: need }, (_, i) => extra[i % extra.length]) : [];
  const at = freeTiles(r.g, list.length + 6); let k = 0;
  for (const f of list) { const c = CASTER[f] || HEART_CASTER[f], tier = c ? c.tier : f;
    // a tile the engine refuses (something stands there) is part of the stream; the next free one is tried
    for (let tries = 0; tries < 6 && k < at.length; tries++) if (!r.act({ type: 'sandbox/spawn', tier, weapon: c ? c.weapon : TIER_WEAPON[tier], at: refOf(at[k++]), ...(c ? { caster: f } : {}) })) break; }
  r.must({ type: 'sandbox/fight' }); r.fight(o.maxRounds || 6);
  for (let i = 1; i < (o.waves || 1); i++) { if (r.g.sandbox?.state !== 'cleared') break; r.must({ type: 'sandbox/wave' }); r.fight(o.maxRounds || 6); }
  if (r.g.sandbox?.state === 'fallen') { r.must({ type: 'sandbox/retry' }); r.fight(2); }
  if (r.g.phase === 'combat') r.must({ type: 'sandbox/stop' });
  r.must({ type: 'sandbox/end' });
  return r;
} });
/** Story, a fight where the party stands, the story again (walking, a pile, a rest), a second fight on another ground, the story again. */
const roundTrip = (name: string, pcs: Pc[], second: string[], full = false): Scenario => ({ name, full, run: (reload = []) => {
  const r = story('REPLAY-' + name, pcs, reload);
  r.must({ type: 'story/speak', text: 'We go in quietly.' });
  r.must({ type: 'narrator/turn', turn: { narration: 'Three of them hold the yard.' } });
  r.must(fightTurn(pcs, ['minion', 'soldier', 'minion'], null, 'The yard')); r.fight(8);
  // back in the story (the Narrator opens the round): everyone walks on the area map (its own paths), whatever lies on
  // the ground is picked up, a short rest, more walking; a refused step (a wall, someone in the way) is part of the stream
  const walk = () => { for (const c of Object.values(r.g.characters) as any[]) { const p = (r.g.story.positions || {})[c.id]; if (!p) continue; const [x, y] = p.split(',').map(Number);
    for (const [dx, dy] of [[2, 1], [-2, 1], [1, -2], [0, 2], [-1, -1], [1, 0]]) if (!r.act({ type: 'story/move', charId: c.id, to: (x + dx) + ',' + (y + dy) })) break; } };
  const after = (text: string, extra: Record<string, any> = {}) => { if (r.g.phase !== 'combat') r.must({ type: 'narrator/turn', turn: { narration: text, ...extra } }); };
  after('The yard is yours. Something moves beyond the wall.');
  walk();
  for (const o of (r.g.story.objects || []).filter((q: any) => q.kind === 'pile').slice(0, 3)) { const c: any = Object.values(r.g.characters)[0]; r.act({ type: 'story/move', charId: c.id, to: o.pos }); r.act({ type: 'world/act', charId: c.id, act: 'pickup', tile: o.pos }); }
  r.act({ type: 'story/speak', text: 'We take a breath, then go over the wall.' });
  after('You have a moment.', { rest: 'short' });
  r.act({ type: 'rest', kind: 'short' });
  walk();
  if (r.g.phase !== 'combat') { r.must(fightTurn(pcs, second, 'cover', 'Beyond the wall')); r.fight(8); }
  after('Quiet again.'); if (r.g.phase !== 'combat') { walk(); r.act({ type: 'story/speak', text: 'On to the gate.' }); }
  return r;
} });

const GUNS: Pc[] = [{ build: 'opt_gun', level: 9 }, { build: 'opt_blade', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'plain_blade', level: 9 }];
const MAGIC: Pc[] = [{ build: 'tank', level: 9 }, { build: 'sigil', level: 9 }, { build: 'outburst', level: 9 }, { build: 'faith', level: 9 }];
const MIXED: Pc[] = [{ build: 'calls', level: 12 }, { build: 'sigil', level: 12 }, { build: 'outburst', level: 12 }, { build: 'opt_gun', level: 12 }];
const LINE: Pc[] = [{ build: 'plain_gun', level: 6 }, { build: 'opt_blade', level: 6 }, { build: 'faith', level: 6 }, { build: 'calls', level: 6 }];
const HIGH: Pc[] = [{ build: 'opt_gun', variant: 'allin', level: 20 }, { build: 'opt_blade', variant: 'allin', level: 20 }, { build: 'sigil', variant: 'allin', level: 20 }, { build: 'outburst', variant: 'allin', level: 20 }];
const LOW: Pc[] = [{ build: 'plain_gun', level: 3 }, { build: 'plain_blade', level: 3 }, { build: 'tank', level: 3 }, { build: 'faith', level: 3 }];

/** The default set runs in `npm run check`; `full` ones only with REPLAY_FULL=1. Every reference build, both grounds,
 * 4 v 6 to 4 v 10, Elites and a Boss, Sigil and Heart casters on both sides, the Proving Ground and a change of wave,
 * a story-to-fight-to-story round trip. */
export const SCENARIOS: Scenario[] = [
  storyFight('cover-4v6-guns-blades', GUNS, ['minion', 'minion', 'soldier', 'soldier', 'soldier', 'elite'], 'cover'),
  storyFight('open-4v7-magic-boss', MAGIC, ['minion', 'soldier', 'soldier', 'elite', 'soldier', 'minion', 'boss'], 'open', 7),
  storyFight('cover-4v7-casters', MIXED, ['sigil_adept', 'heart_adept', 'soldier', 'heartfire_elite', 'minion', 'sigil_novice', 'elite'], 'cover', 6),
  proving('proving-4v10-boss', LINE, 5, ['soldier', 'sigil_adept', 'elite', 'heart_adept', 'minion'], { maxRounds: 5, total: 10 }),
  proving('proving-waves', GUNS, 1, [], { waves: 3, maxRounds: 5 }),
  roundTrip('story-fight-story', [{ build: 'opt_gun', level: 9 }, { build: 'tank', level: 9 }, { build: 'calls', level: 9 }, { build: 'outburst', level: 9 }], ['minion', 'soldier', 'sigil_novice']),
  // ----- the larger set (REPLAY_FULL=1)
  storyFight('open-4v6-guns-blades', GUNS, ['minion', 'minion', 'soldier', 'soldier', 'soldier', 'elite'], 'open', 10, true),
  storyFight('cover-4v7-magic-boss', MAGIC, ['minion', 'soldier', 'soldier', 'elite', 'soldier', 'minion', 'boss'], 'cover', 10, true),
  storyFight('open-4v7-casters', MIXED, ['sigil_adept', 'heart_adept', 'soldier', 'heartfire_elite', 'minion', 'sigil_novice', 'elite'], 'open', 10, true),
  storyFight('cover-4v7-level20-allin', HIGH, ['elite', 'elite', 'boss', 'soldier', 'soldier', 'sigil_warden', 'heartfire_elite'], 'cover', 10, true),
  storyFight('open-4v7-level20-allin', HIGH, ['elite', 'elite', 'boss', 'soldier', 'soldier', 'sigil_magister', 'heart_sovereign'], 'open', 10, true),
  storyFight('cover-4v6-level3', LOW, ['minion', 'minion', 'minion', 'soldier', 'soldier', 'vermin'], 'cover', 10, true),
  storyFight('open-4v3-level3', LOW, ['soldier', 'elite', 'minion'], 'open', 10, true),
  storyFight('cover-4v7-line', LINE, ['soldier', 'soldier', 'soldier', 'soldier', 'elite', 'elite', 'minion'], 'cover', 10, true),
  proving('proving-4v12-guns', GUNS, 10, ['soldier', 'soldier', 'elite', 'sigil_adept', 'heart_adept', 'minion'], { maxRounds: 8, total: 12, full: true }),
  proving('proving-4v12-magic', MAGIC, 8, ['elite', 'sigil_warden', 'heartfire_elite', 'soldier'], { maxRounds: 8, total: 12, full: true }),
  proving('proving-waves-long', MIXED, 1, [], { waves: 6, maxRounds: 8, full: true }),
  proving('proving-waves-low', LOW, 1, ['minion'], { waves: 4, maxRounds: 8, full: true }),
  roundTrip('story-fight-story-magic', MAGIC, ['soldier', 'soldier', 'elite', 'minion', 'sigil_adept'], true),
  roundTrip('story-fight-story-high', HIGH, ['soldier', 'soldier', 'elite', 'minion', 'heart_adept'], true),
];
