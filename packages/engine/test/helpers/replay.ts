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
// A POLICY IS HANDED A COPY OF THE STATE, NEVER THE STATE ITSELF. Reading a preview is not pure in this engine: an
// item's per-fight bag (`ps` on a unit, `story.ps` for a character) is created on first read (effects/index.ts
// stateOf: `u.ps[key] ||= {}`), and some items fill or refresh theirs when read (a default: Shape's `{shape: false}`;
// a per-turn count started for this turn: Parallel Thought). So a state a policy has looked at (or a screen: viewFor
// hands the host's own unit objects to the client) holds bags a state nobody looked at does not. They change no
// outcome, but they are in the JSON. So that the hashes say what apply() did and not what was previewed, the game
// recorded here only ever changes through apply(). Two checks in replay-hash.test.ts hold the other half:
//   - `checkReads`: after every read of a policy, its copy differs from the recorded game under `ps` and nowhere else;
//   - `readInPlace`: the same game with the policies reading the recorded game itself (as a screen does) plays the
//     same stream, action for action, and ends in the same state outside `ps`.
//
// What one replay records (test/golden/replays.json, one entry per scenario):
//   actions  how many actions were sent (refused ones included: a refusal and its message are part of the stream)
//   state    SHA-256 of JSON.stringify(final GameState)
//   stream   SHA-256 of the ordered stream: every action, its refusal if any, and what it added (the fight's effects
//            and log lines, the story's entries and effects), in order
//   marks    every MARK_EVERY actions: [action number, state hash, stream hash] (short). They are compared too (a
//            state that differs mid-game and comes back together by the end is still a difference), and the first
//            one that differs points at the stretch of actions where it began
import { createHash } from 'node:crypto';
import { apply, newGame, alive, migrateLoaded, CASTER, HEART_CASTER, refOf, standable, MAPS, paths, routeTo, unitSees, dist, bindGame } from '../../src';
import { buildCharacter, BUILD } from '../balance/builds';
import { POLICIES, sigilAfter } from '../balance/policies';
import { MAP_ID, TIER_WEAPON, foeLevel } from '../balance/sim';

export const MARK_EVERY = 25;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
/** A copy of the game for a policy to read (the campaign is shared: it is frozen in the suite and never written). */
const copyOf = (g: any) => { const { campaign, ...rest } = g; return { ...JSON.parse(JSON.stringify(rest)), campaign }; };
/** The state as text without the items' bags (every `ps`): two states that differ only by what was read give the same text. */
export const withoutPs = (g: any) => JSON.stringify(g, (k, v) => (k === 'ps' || k === 'campaign' ? undefined : v));
/** Where two values differ (paths, at most `max`): for the message of a failed read check. */
export function whereDiffer(a: any, b: any, at = '', out: string[] = [], max = 6): string[] {
  if (out.length >= max || a === b) return out;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') { out.push(at + ': ' + JSON.stringify(a)?.slice(0, 80) + ' → ' + JSON.stringify(b)?.slice(0, 80)); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) whereDiffer(a[k], b[k], at + '/' + k, out, max);
  return out;
}
/** Log lines the coverage test counts (replay-hash.test.ts): what a fight really did, not what its map could do. */
export const LOG_MARKS: Record<string, RegExp> = { opportunity: /opportunity attack/i, answer: / answers with /, overwatch: /overwatch/i, hides: / goes to ground/, door: / (opens|closes) the /, spotted: / spots | is spotted|found out|no longer hidden/i };
export interface Pc { build: string; variant?: 'normal' | 'allin'; level: number }
export interface Replay { actions: number; state: string; stream: string; marks: [number, string, string][] }

/** One game being recorded: every action goes through act(). */
export class Rec {
  g: any; n = 0; errors: string[] = []; marks: [number, string, string][] = [];
  /** What was sent, by action type: [accepted, refused]; and the most enemies one fight held (for the coverage test). */
  tally: Record<string, [number, number]> = {}; maxFoes = 0;
  /** Coverage: the fight effects emitted by kind, log lines by LOG_MARKS, accepted fight actions sent while a living
   * unit was Hidden / on Overwatch / holding a Watch, with a door open, with a hostile in cb.sighted that was not
   * there the action before (`sightedLate`: someone came into view after the fight began). */
  kinds: Record<string, number> = {}; lines: Record<string, number> = {}; during: Record<string, number> = {}; private sightedN = -1;
  /** Policies' reads are checked (slow): what a policy leaves in the copy it read must be under `ps` and nowhere else. */
  checkReads = false; reads = 0; bagsMade = 0;
  /** The policies read the recorded game itself, not a copy (as a screen reads the host's state): only to compare. */
  readInPlace = false;
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
      if (cb && g.phase === 'combat') this.cover(cb, action);
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
  /** Coverage counters after an accepted action in a fight (nothing here is hashed). */
  private cover(cb: any, action: any) {
    for (const e of (cb.fx || [])) if (e.n > this.fxN) this.kinds[e.k] = (this.kinds[e.k] || 0) + 1;
    const from = cb.log.length < this.logN ? 0 : this.logN;
    for (const l of cb.log.slice(from)) for (const [k, re] of Object.entries(LOG_MARKS)) if (re.test(l)) this.lines[k] = (this.lines[k] || 0) + 1;
    const live = cb.units.filter((u: any) => !u.dead && !u.downed), bump = (k: string, on: boolean) => { if (on) this.during[k] = (this.during[k] || 0) + 1; };
    if (String(action.type).startsWith('combat/')) {
      bump('hidden', live.some((u: any) => u.hidden)); bump('hiddenPc', live.some((u: any) => u.hidden && u.side === 'pc')); bump('hiddenFoe', live.some((u: any) => u.hidden && u.side === 'foe'));
      bump('overwatch', live.some((u: any) => u.overwatch)); bump('watch', live.some((u: any) => u.watch)); bump('doorOpen', (cb.objects || []).some((o: any) => o.kind === 'door' && o.open));
      bump('unsighted', live.some((u: any) => u.side === 'foe' && !(cb.sighted || []).includes(u.id)));
    }
    const n = (cb.sighted || []).length; if (this.sightedN >= 0 && n > this.sightedN && cb.round + cb.turn > 1) this.during.sightedLate = (this.during.sightedLate || 0) + (n - this.sightedN); this.sightedN = n;
  }
  /** What a policy is given to read: a copy (see the top of this file). */
  private view() { return this.readInPlace ? this.g : copyOf(this.g); }
  /** An action that must be accepted (the scenario's own steps): a refusal is a broken scenario. */
  must(action: any, by = 'host') { const e = this.act(action, by); if (e) this.errors.push(action.type + ': ' + e); }
  done(): Replay { return { actions: this.n, state: sha(JSON.stringify(this.g)), stream: this.h.copy().digest('hex'), marks: this.marks }; }

  /** Play the fight the game is in to its end (or for maxRounds rounds of it) with the simulator's policies.
   * `script`: called at the start of each turn of a player's unit, before its policy, with the unit's id, its character's
   * id and which of its own turns this is (1, 2, …). It sends what it likes through act() (a refusal is part of the
   * stream); the policy then plays what AP is left, unless it returns 'done' (the turn is ended as it stands). */
  fight(maxRounds = 8, script?: (r: Rec, unitId: string, charId: string, turnNo: number) => 'done' | void) {
    const turns: Record<string, number> = {};
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
      const scripted = script ? script(this, u.id, u.charId, (turns[u.id] = (turns[u.id] || 0) + 1)) : undefined;
      for (let k = 0; k < 30 && scripted !== 'done'; k++) {
        const c1 = this.g.combat; if (!c1 || c1.over || this.g.phase !== 'combat' || c1.window || cur(c1) !== u.id) break;
        const m1 = c1.units.find((q: any) => q.id === u.id); if (!m1 || m1.downed || m1.dead || m1.ap <= 0) break;
        // the policy reads a copy: the recorded game changes through apply() and nothing else
        const before = this.checkReads ? withoutPs(this.g) : '', full = this.checkReads ? JSON.stringify(this.g) : '';
        const v = this.view(), c2 = v.combat, me = c2.units.find((q: any) => q.id === u.id);
        const x = { g: v, cb: c2, u: me, c: v.characters[me.charId], foes: c2.units.filter((q: any) => q.side === 'foe' && alive(q) && !q.hidden), allies: c2.units.filter((q: any) => q.side === 'pc' && q.id !== me.id && alive(q)), memo: memo[u.id], banned, peak: false, opts: {} };
        let step: any = null; try { step = pol(x); } catch (e: any) { this.errors.push('policy: ' + String(e?.message || e).slice(0, 160)); break; }
        if (this.checkReads) { this.reads++;
          if (JSON.stringify(this.g) !== full) this.errors.push('the recorded game changed without an action (action ' + this.n + ')');
          if (withoutPs(v) !== before) this.errors.push('a read wrote outside the items\' bags (after action ' + this.n + ', ' + u.name + '): ' + whereDiffer(JSON.parse(before), JSON.parse(withoutPs(v))).join('; '));
          else if (JSON.stringify({ ...v, campaign: null }) !== JSON.stringify({ ...this.g, campaign: null })) this.bagsMade++; }
        if (!step) break;
        const err = this.act({ unitId: u.id, ...step.action });
        if (pol === POLICIES.sigil) { const v3 = this.view(), c3 = v3.combat; if (c3) sigilAfter({ ...x, g: v3, cb: c3, u: c3.units.find((q: any) => q.id === u.id) }, step, !err); }
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
/** run(reload, how): `how` is 'check' (checkReads) or 'in-place' (readInPlace), for the two read tests only. */
export interface Scenario { name: string; full?: boolean; run: (reload?: number[], how?: 'check' | 'in-place') => Rec }
const story = (seed: string, pcs: Pc[], reload: number[] = []) => {
  const r = new Rec(lobby(seed, pcs), pcs, reload);
  r.must({ type: 'session/start' }); r.must({ type: 'narrator/turn', turn: { narration: 'The replay begins.', sceneTitle: 'Replay' } });
  return r;
};
/** A story fight on one of the simulator's two grounds, played to its end (or maxRounds), then the Narrator's closing turn. */
const storyFight = (name: string, pcs: Pc[], foes: string[], map: 'open' | 'cover', maxRounds = 8, full = false): Scenario => ({ name, full, run: (reload = [], how) => {
  const r = story('REPLAY-' + name, pcs, reload); r.checkReads = how === 'check'; r.readInPlace = how === 'in-place';
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
const proving = (name: string, pcs: Pc[], wave: number, extra: string[], o: { maxRounds?: number; waves?: number; full?: boolean; total?: number } = {}): Scenario => ({ name, full: o.full, run: (reload = [], how) => {
  const r = new Rec(lobby('REPLAY-' + name, pcs), pcs, reload); r.checkReads = how === 'check'; r.readInPlace = how === 'in-place';
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
const roundTrip = (name: string, pcs: Pc[], second: string[], full = false): Scenario => ({ name, full, run: (reload = [], how) => {
  const r = story('REPLAY-' + name, pcs, reload); r.checkReads = how === 'check'; r.readInPlace = how === 'in-place';
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

// ---------- scripted turns (what the simulator's policies never do: doors, hiding, held shots, walking away) ----------
/** Ask the engine about the fight (paths, sight) on a copy with the game bound: a script, like a policy, never runs an
 * engine query on the recorded game itself (a plain look at a unit's tile or AP is not a query). */
function look<T>(r: Rec, unitId: string, f: (cb: any, me: any, g: any) => T): T | null {
  const g = copyOf(r.g), cb = g.combat, me = cb?.units.find((q: any) => q.id === unitId); if (!cb || !me) return null;
  const was = bindGame(g); try { return f(cb, me, g); } finally { bindGame(was); }
}
const unit = (r: Rec, id: string) => r.g.combat?.units.find((q: any) => q.id === id);
const myTurn = (r: Rec, id: string) => { const cb = r.g.combat, u = unit(r, id); return !!cb && !cb.over && r.g.phase === 'combat' && !cb.window && cb.order[cb.turn] === id && !!u && !u.dead && !u.downed; };
/** Walk towards a tile: the route the engine's own search gives, tried from its far end back (a move the unit cannot
 * pay for is refused, and the refusal is in the stream), at most `tries` times and `maxTiles` tiles far. A tile that
 * cannot be stood on (a doorway's wall side, someone on it): the reachable tile nearest to it. */
function walkTowards(r: Rec, id: string, goal: string, o: { how?: string; tries?: number; maxTiles?: number } = {}): boolean {
  if (!myTurn(r, id)) return false;
  const route = look(r, id, (cb, me) => { const P = paths(cb, me.pos, me.id), reach = Object.keys(P.dist).filter((k) => k !== me.pos);
    // the goal itself when it can be stood on, else the reachable tile nearest to it (the first found among equals)
    let to = goal; if (P.dist[to] === undefined) { let best = Infinity; to = ''; for (const k of reach) { const d = dist(k, goal) * 1000 + P.dist[k]; if (d < best) { best = d; to = k; } } }
    return to ? routeTo(P, me.pos, to) : []; }) || [];
  const far = Math.min(route.length - 1, o.maxTiles ?? 12);
  for (let i = far, n = 0; i >= 1 && n < (o.tries ?? 5); i--, n++) if (!r.act({ type: 'combat/move', unitId: id, to: route[i], ...(o.how ? { how: o.how } : {}) })) return true;
  return false;
}
/** The living enemies next to a unit. */
const besetBy = (r: Rec, id: string) => { const u = unit(r, id); return u ? r.g.combat.units.filter((q: any) => q.side !== u.side && !q.dead && !q.downed && dist(q.pos, u.pos) <= 1) : []; };
/** The nearest tile the unit can walk to that no living enemy sees (to hide on), or null. */
const unseenTile = (r: Rec, id: string, within = 9) => look(r, id, (cb, me) => { const P = paths(cb, me.pos, me.id), foes = cb.units.filter((q: any) => q.side !== me.side && !q.dead && !q.downed && !q.hidden);
  let best: string | null = null, bd = Infinity; for (const k of Object.keys(P.dist)) { const d = P.dist[k]; if (k === me.pos || d > within || d >= bd) continue; if (!foes.some((f: any) => unitSees(cb, f, k))) { best = k; bd = d; } } return best; });

const SIGHT: Pc[] = [{ build: 'opt_blade', level: 9 }, { build: 'tank', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'opt_gun', level: 9 }];
const WEST_DOOR = '10,4'; // the room's west door on the Proving Ground's map
/** THE SIGHT GAME (the Proving Ground: a walled room with two shut doors). Enemies are placed inside the shut room
 * (seen by nobody until a door opens) and next to the squad (knives, so someone is in reach). A hidden minefield and a
 * fire lie between the two sides. The script then does what no policy does:
 *   - the plain gun holds a shot (the Overwatch technique: a held Watch) on its first two turns;
 *   - the optimised gun holds the older overwatch stance on its first turn;
 *   - the tank walks to the west door and opens it (the room's enemies come into sight through the doorway), fights
 *     there, and later shuts it again when it stands next to it with nobody in the doorway;
 *   - the blade fights, then on its even turns walks straight out of an enemy's reach (an opportunity attack) to the
 *     nearest tile nobody sees and goes to ground (Hidden: the enemies hunt, spot or lose it; it strikes from hiding).
 * Whatever is refused is in the stream too. The coverage test (replay-hash.test.ts) holds each of these to "really happened". */
const sightGame = (name: string, pcs: Pc[], o: { wave?: number; maxRounds?: number; full?: boolean } = {}): Scenario => ({ name, full: o.full, run: (reload = [], how) => {
  const r = new Rec(lobby('REPLAY-' + name, pcs), pcs, reload); r.checkReads = how === 'check'; r.readInPlace = how === 'in-place';
  r.must({ type: 'sandbox/start' }); r.must({ type: 'sandbox/stage', wave: o.wave || 1 });
  const spawn = (tier: string, weapon: string, at: string) => r.must({ type: 'sandbox/spawn', tier, weapon, at: refOf(at) });
  spawn('soldier', TIER_WEAPON.soldier, '12,4'); spawn('minion', 'combat_knife', '13,5'); spawn('soldier', 'sabre', '14,4'); // in the shut room
  spawn('minion', 'combat_knife', '8,12'); spawn('soldier', 'sabre', '8,13'); spawn('minion', 'combat_knife', '7,14'); // within a step of the squad
  r.must({ type: 'sandbox/hazard', kind: 'minefield', severity: 'light', hidden: true, tiles: ['9,10', '9,11', '9,12', '9,13', '9,14', '9,15', '10,15', '10,16'].map(refOf) });
  r.must({ type: 'sandbox/hazard', kind: 'fire', severity: 'light', tiles: ['7,8', '8,8', '7,7'].map(refOf) });
  r.must({ type: 'sandbox/fight' });
  let doorOpened = false;
  r.fight(o.maxRounds || 7, (rec, id, charId, n) => {
    if (charId === 'c3' && n <= 2) { if (!rec.act({ type: 'combat/technique', unitId: id, id: 'overwatch' })) return 'done'; return; }
    if (charId === 'c4' && n === 1) { rec.act({ type: 'combat/overwatch', unitId: id, mode: 'shot' }); return 'done'; }
    if (charId === 'c2') {
      const door = (rec.g.combat.objects || []).find((q: any) => q.pos === WEST_DOOR), me = unit(rec, id);
      if (!door || !me) return;
      if (!doorOpened) { // to the door, then open it; whatever AP is left is the policy's
        if (dist(me.pos, WEST_DOOR) > 1) walkTowards(rec, id, '9,4', { how: n === 1 ? 'sprint' : undefined });
        const at = unit(rec, id); if (at && dist(at.pos, WEST_DOOR) <= 1 && !rec.act({ type: 'combat/door', unitId: id, tile: WEST_DOOR })) doorOpened = true;
        return;
      }
      if (n % 3 === 0 && dist(me.pos, WEST_DOOR) <= 1) rec.act({ type: 'combat/door', unitId: id, tile: WEST_DOOR }); // shut (or open) it again; refused with someone in the doorway
      return;
    }
    if (charId === 'c1' && n % 2 === 0) {
      const to = unseenTile(rec, id);
      if (to && besetBy(rec, id).length) rec.act({ type: 'combat/move', unitId: id, to }); // straight out of reach: no Disengage
      else if (to) walkTowards(rec, id, to, { tries: 2 });
      if (myTurn(rec, id) && !rec.act({ type: 'combat/hide', unitId: id })) return 'done'; // Hidden: the turn ends there
      return;
    }
  });
  if (r.g.sandbox?.state === 'fallen') { r.must({ type: 'sandbox/retry' }); r.fight(2); }
  if (r.g.phase === 'combat') r.must({ type: 'sandbox/stop' });
  r.must({ type: 'sandbox/end' });
  return r;
} });
/** WALKING AWAY (a story fight on the open ground, blades and a shield against enemies with blades): on every second
 * turn a unit with an enemy next to it first walks three tiles straight away with a plain move (no Disengage), so the
 * enemies' opportunity attacks and the squad's Answers (Parry, Riposte, the shield's) are played, many times, by many units. */
const BLADES: Pc[] = [{ build: 'opt_blade', level: 9 }, { build: 'plain_blade', level: 9 }, { build: 'tank', level: 9 }, { build: 'opt_blade', level: 6 }];
const walkAway = (name: string, pcs: Pc[], foes: [string, string][], map: 'open' | 'cover', o: { maxRounds?: number; full?: boolean } = {}): Scenario => ({ name, full: o.full, run: (reload = [], how) => {
  const r = story('REPLAY-' + name, pcs, reload); r.checkReads = how === 'check'; r.readInPlace = how === 'in-place';
  const turn = fightTurn(pcs, foes.map((f) => f[0]), map, 'Blades'); turn.turn.combat.enemies.forEach((e: any, i: number) => { e.weapon = foes[i][1]; });
  r.must(turn);
  r.fight(o.maxRounds || 8, (rec, id, _c, n) => {
    if (n % 2) return;
    const near = besetBy(rec, id), me = unit(rec, id); if (!near.length || !me) return;
    // three tiles away from the first enemy in reach, along the line from it through the unit; the nearest free tile to that
    const [fx, fy] = near[0].pos.split(',').map(Number), [x, y] = me.pos.split(',').map(Number), sx = Math.sign(x - fx), sy = Math.sign(y - fy);
    const goal = (x + 3 * sx) + ',' + (y + 3 * sy);
    walkTowards(rec, id, goal, { tries: 3, maxTiles: 4 });
  });
  if (r.g.phase !== 'combat') r.must({ type: 'narrator/turn', turn: { narration: 'The blades are wiped.' } });
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
 * a story-to-fight-to-story round trip, and the two scripted games (doors, hiding, held shots, hazards; walking out of
 * reach). A new game is recorded on purpose (REPLAY_RECORD=1 REPLAY_FULL=1) and then checked on the engine as it was
 * before the change it is meant to guard. */
export const SCENARIOS: Scenario[] = [
  storyFight('cover-4v6-guns-blades', GUNS, ['minion', 'minion', 'soldier', 'soldier', 'soldier', 'elite'], 'cover'),
  storyFight('open-4v7-magic-boss', MAGIC, ['minion', 'soldier', 'soldier', 'elite', 'soldier', 'minion', 'boss'], 'open', 7),
  storyFight('cover-4v7-casters', MIXED, ['sigil_adept', 'heart_adept', 'soldier', 'heartfire_elite', 'minion', 'sigil_novice', 'elite'], 'cover', 6),
  proving('proving-4v10-boss', LINE, 5, ['soldier', 'sigil_adept', 'elite', 'heart_adept', 'minion'], { maxRounds: 5, total: 10 }),
  proving('proving-waves', GUNS, 1, [], { waves: 3, maxRounds: 5 }),
  roundTrip('story-fight-story', [{ build: 'opt_gun', level: 9 }, { build: 'tank', level: 9 }, { build: 'calls', level: 9 }, { build: 'outburst', level: 9 }], ['minion', 'soldier', 'sigil_novice']),
  sightGame('proving-doors-hiding-watches', SIGHT, { maxRounds: 8 }), // 8 rounds since rules 1.28 (no reaction answers a reaction: the squad's tank lasts less long, so c1 hid less in 7)
  // (a second minion became a sabre soldier, rules 1.28: an opportunity attack's blow is no longer Answered, so the walk
  // needs more blades on it to play the squad's Answers as often as before)
  walkAway('open-4v6-blades-walk-away', BLADES, [['soldier', 'sabre'], ['soldier', 'sabre'], ['minion', 'combat_knife'], ['elite', 'sabre'], ['soldier', 'sabre'], ['soldier', 'combat_knife']], 'open'),
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
  sightGame('proving-doors-hiding-watches-wave6', [{ build: 'plain_blade', level: 12 }, { build: 'tank', level: 12 }, { build: 'opt_gun', level: 12 }, { build: 'plain_gun', level: 12 }], { wave: 6, maxRounds: 9, full: true }),
  walkAway('cover-4v7-blades-walk-away', BLADES, [['soldier', 'sabre'], ['elite', 'sabre'], ['minion', 'combat_knife'], ['elite', 'sabre'], ['soldier', 'hellraiser_service_rifle'], ['soldier', 'combat_knife'], ['boss', 'sabre']], 'cover', { maxRounds: 10, full: true }),
];
