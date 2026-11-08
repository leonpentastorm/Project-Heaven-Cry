// A live playtest of the AI Narrator (docs/design/handoffs/narrator-craft-HANDOFF.md): the M813 opening and the first
// mission, played by two scripted players against the real Narrator code and a real Anthropic model. Skipped unless
// PHC_LIVE_KEY_FILE names a file holding an Anthropic key (the key is read from that file at run time only: never
// printed, logged or written anywhere). PHC_LIVE_OUT names the JSON transcript to write (no key in it).
//   PHC_LIVE_KEY_FILE=/path/to/key PHC_LIVE_OUT=/tmp/run.json npx vitest run src/narrator/live-playtest.test.ts
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { apply, newGame, ARCHETYPES, npcsOf, positionsOf, refOf, missionBoard, active, type GameState, type NarratorTurn } from '@engine';
import { anthropicProvider, scriptedProvider, callEstimate } from './anthropic';
import { recentNarrationBlock, lastTurnAudit } from './craft';

const KEY_FILE = process.env.PHC_LIVE_KEY_FILE, OUT = process.env.PHC_LIVE_OUT || '', MAX_TURNS = Number(process.env.PHC_LIVE_TURNS || 10);
const MODEL = process.env.PHC_LIVE_MODEL || 'claude-opus-5-5';

const arch = (id: string) => (ARCHETYPES as any[]).find((x) => x.id === id) || ARCHETYPES[0];
const sheet = (name: string, a: any): any => ({ name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });

/** What each player does in each round, the same in every run: moves, examines and a line. */
type Step = { move?: string; examine?: string; try?: [string, number]; say: string };
const SCRIPT: Record<string, Step>[] = [
  { MPAT: { say: 'I head for the stake line. "Sergeant. Medics of the 258th, reporting. What do you need?"' }, Rook: { move: 'J6', say: 'I go to the row of broken infantry behind the stakes and listen to who is still making noise.' } },
  { MPAT: { examine: 'Sergeant Nine-Nine', say: '"Before we talk numbers, Sergeant, let me look at you." I check his leaks.' }, Rook: { examine: 'The triage line', say: 'I kneel by the one that is counting out loud. "Hey. What are you counting?"' } },
  { MPAT: { try: ['Sergeant Nine-Nine', 0], say: 'I seal what I can on him while he talks.' }, Rook: { try: ['The triage line', 0], say: 'I sort them: who can walk, who has to be carried.' } },
  { MPAT: { say: '"How many of us can we carry? Depends on how many of them can still walk, Sergeant."' }, Rook: { say: 'I ask the one humming what the song is.' } },
  { MPAT: { say: 'We wait for Nine-Nine to decide.' }, Rook: { say: 'I wait too.' } },
  { MPAT: { move: 'H4', say: 'I look out at the fallen squad past the stakes. Is anything still moving out there?' }, Rook: { say: '"Lantern, is it? What are you holding shut?"' } },
  { MPAT: { say: 'I stand up on the stakes and shout at the drones to get off our people.' }, Rook: { say: 'I back MPAT up, banging two plates together.' } },
  { MPAT: { say: 'We pick everyone up and carry them all east to the rear pad.' }, Rook: { say: 'I grab two and follow MPAT east.' } },
  { MPAT: { say: '"Nine-Nine. We can\'t take everyone. Tell me who stays."' }, Rook: { say: 'I put my hand on Seven-Seven\'s shoulder and don\'t say anything.' } },
  { MPAT: { say: 'I call the rear pad on the squad radio and tell them we are coming with the wounded.' }, Rook: { say: 'I start lifting the ones we chose.' } },
  { MPAT: { say: 'We set off east with the ones we can carry.' }, Rook: { say: 'I walk at the back of the column.' } },
];

function tryAct(g: GameState, a: any, by: string, log: string[]): GameState { try { return apply(g, a, by); } catch (e: any) { log.push('refused ' + a.type + ': ' + e.message); return g; } }
const objByName = (g: GameState, name: string) => (g.story.objects || []).find((o: any) => o.name === name);

/** A plain fight: each character shoots the nearest foe until it can't, then ends its turn. */
function autoFight(g: GameState, log: string[]): GameState {
  for (let i = 0; i < 400 && g.phase === 'combat' && g.combat && !g.combat.over; i++) {
    const cb = g.combat, u = active(cb); if (!u) break;
    if (u.side !== 'pc') { log.push('fight: waiting on ' + u.name); break; }
    const owner = g.characters[u.charId!]?.owner || g.hostId, foes = cb.units.filter((x) => x.side === 'foe' && !x.dead && !x.downed);
    let next = g;
    for (const f of foes) { try { next = apply(g, { type: 'combat/attack', unitId: u.id, targetId: f.id, mode: 'shot' }, owner); break; } catch { /* try the next */ } }
    if (next === g) next = tryAct(g, { type: 'combat/end-turn', unitId: u.id }, owner, log);
    g = next;
  }
  return g;
}

describe.skipIf(!KEY_FILE)('live playtest: M813 opening and the first mission', () => {
  it('plays about ten Narrator turns', async () => {
    // 'scripted' runs the harness against the scripted Narrator (no API): a dry run of the player script.
    const prov = KEY_FILE === 'scripted' ? scriptedProvider() : anthropicProvider(readFileSync(KEY_FILE!, 'utf8').trim(), MODEL, 'medium');
    let g = newGame('LIVE13', { id: 'host', name: 'Host' }, 'narrator-craft');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Guest' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheet('MPAT', arch('field_medic')) }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheet('Rook', ARCHETYPES[3]) }, 'p2');
    g = apply(g, { type: 'session/start' }, 'host');
    const owner: Record<string, string> = {}; for (const c of Object.values(g.characters)) owner[c.name] = c.owner;
    const charOf = (name: string) => Object.values(g.characters).find((c) => c.name === name)!;
    const out: any[] = []; let round = 0, total = 0;
    for (let n = 1; n <= MAX_TURNS; n++) {
      const log: string[] = [];
      // Players act until the Narrator is needed.
      for (let guard = 0; guard < 6 && !g.story.work; guard++) {
        if (g.phase === 'combat') { g = autoFight(g, log); continue; }
        for (const k of g.checks.filter((x) => !x.done)) g = tryAct(g, { type: 'check/roll', checkId: k.id }, g.characters[k.charId].owner, log);
        for (const k of g.checks.filter((x) => x.roll && !x.done)) g = tryAct(g, { type: 'check/accept', checkId: k.id }, g.characters[k.charId].owner, log);
        for (const o of g.overreach.filter((x) => !x.choice)) g = tryAct(g, { type: 'overreach/choose', id: o.id, choice: 'indulge' }, g.characters[o.charId].owner, log);
        if (g.story.work || g.story.await !== 'players') continue;
        const step = SCRIPT[Math.min(round, SCRIPT.length - 1)]; round++;
        for (const [name, s] of Object.entries(step)) {
          const c = charOf(name), by = owner[name];
          if (s.move) g = tryAct(g, { type: 'story/move', charId: c.id, to: s.move }, by, log);
          if (s.examine) { const o = objByName(g, s.examine); if (o) g = tryAct(g, { type: 'poi/examine', charId: c.id, objId: o.id }, by, log); }
          if (s.try) { const o = objByName(g, s.try[0]); if (o) { g = tryAct(g, { type: 'poi/try', charId: c.id, objId: o.id, idx: s.try[1] }, by, log); for (const k of g.checks.filter((x) => !x.done && x.poi)) g = tryAct(g, { type: 'check/roll', checkId: k.id }, by, log); } }
          g = tryAct(g, { type: 'story/speak', text: s.say }, by, log);
          g = tryAct(g, { type: 'world/act', charId: c.id, act: 'end' }, by, log);
        }
      }
      if (!g.story.work) { out.push({ n, stuck: true, log }); break; }
      const E = g.story.entries; let from = E.length; while (from > 0 && E[from - 1].kind !== 'narration') from--;
      const since = E.slice(from).filter((e) => !e.to).map((e) => (e.kind === 'player' ? '[' + e.head + '] ' : '[' + e.kind + '] ') + (e.head && e.kind === 'check' ? e.head + ' — ' : '') + e.text);
      const est = callEstimate(g, MODEL);
      // What the craft checks told the Narrator this turn (the repeat lines and LAST TURN; the narrations themselves are above).
      const told = [...recentNarrationBlock(g).split('\n').filter((l) => /^(REPEATED|OPENINGS)/.test(l)), ...lastTurnAudit(g).split('\n').filter(Boolean)];
      const work = g.story.work.kind, t0 = Date.now();
      g = apply(g, { type: 'narrator/begin' }, 'host');
      let res; try { res = await prov.turn(g); } catch (e: any) { out.push({ n, work, error: String(e?.message || e).replace(/\bsk-[a-z]+-[\w-]{8,}/g, '[key]') }); break; }
      const t: NarratorTurn = res.turn; total += res.usage.costUsd;
      g = apply(g, { type: 'narrator/turn', turn: t }, 'host');
      const pos = positionsOf(g), mb = missionBoard(g);
      out.push({ n, work, ms: Date.now() - t0, since, log, narration: t.narration, sceneTitle: t.sceneTitle, endScene: t.endScene,
        npcs: (t as any).npcs, moves: t.moves, actions: (t as any).actions, missions: (t as any).missions, combat: t.combat, travel: t.travel, checks: (t.checks || []).map((k) => ({ charId: k.charId, skills: k.skills, tn: k.tn, stakes: k.stakes })),
        hooks: (t.hooks || []).length, objects: ((t as any).objects || []).map((o: any) => ({ action: o.action, id: o.id, name: o.name, at: o.at })),
        tokensAfter: npcsOf(g).map((x) => x.name + ' ' + refOf(x.pos) + ' (' + x.side + ')'), partyAfter: Object.values(g.characters).map((c) => c.name + ' ' + (pos[c.id] ? refOf(pos[c.id]) : '?')),
        missionAfter: mb.current.map((m) => m.id + ': ' + m.objectives.map((o) => o.id + '=' + o.status).join(', ')), zone: g.story.zone,
        told, usage: res.usage, estimate: { stable: est.stable, turn: est.turn } });
      console.log('turn', n, work, '$' + res.usage.costUsd.toFixed(3), (t.narration || '').slice(0, 80));
      if (OUT) writeFileSync(OUT, JSON.stringify({ model: MODEL, totalUsd: total, turns: out }, null, 1));
    }
    if (OUT) writeFileSync(OUT, JSON.stringify({ model: MODEL, totalUsd: total, turns: out }, null, 1));
    console.log('total $' + total.toFixed(3));
  }, 1_800_000);
});

// ---------- counting a transcript (PHC_LIVE_COUNT=run.json; no API) ----------
const FILLER = /the air is thick with|a sense of|you can't help but|it seems|\bsuddenly\b|little do you know|the weight of|what do you do\?/gi;
const unq = (s: string) => s.replace(/"[^"]*"|“[^”]*”/g, ' ');
const sents = (s: string) => s.split(/(?<=[.!?…])["”]?\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const toks = (s: string) => s.toLowerCase().match(/[a-z0-9][a-z0-9'’-]*/g) || [];
const STOPS = new Set('the a an of to and in on at it is you your his her its their with for that this as from'.split(' '));
export function countRun(run: any, names: string[]) {
  const turns = run.turns.filter((t: any) => t.narration), rows: any[] = [];
  const grams = (t: string) => { const w = toks(unq(t)), out = new Set<string>(); for (let k = 0; k + 4 <= w.length; k++) { const p = w.slice(k, k + 4); if (p.filter((x) => !STOPS.has(x)).length >= 2) out.add(p.join(' ')); } return out; };
  const openers = (t: string) => sents(unq(t)).map((s) => toks(s).slice(0, 2).join(' ')).filter((x) => x.includes(' '));
  turns.forEach((t: any, i: number) => {
    const prev = turns.slice(Math.max(0, i - 3), i), pg = new Set(prev.flatMap((p: any) => [...grams(p.narration)])), po = new Set(prev.flatMap((p: any) => openers(p.narration)));
    const rep = [...grams(t.narration)].filter((x) => pg.has(x)), op = openers(t.narration).filter((x) => po.has(x));
    // A recap: a sentence about a character whose verb is one the player used for that character since the last narration.
    const recaps: string[] = [];
    for (const nm of names) {
      const did = toks((t.since || []).filter((l: string) => l.startsWith('[' + nm + ']') || l.startsWith('[system] ' + nm + ' ')).join(' ')).map((w) => w.slice(0, 4));
      for (const s of sents(unq(t.narration))) {
        const m = s.match(new RegExp('^(?:' + nm + ',?\\s+)?you\\s+(?:[a-z]+ly\\s+)?(?:don\'t\\s+)?([a-z]+)', 'i')) || s.match(new RegExp('^' + nm + '\\s+([a-z]+s)\\b'));
        if (m && did.includes(m[1].toLowerCase().slice(0, 4)) && (s.toLowerCase().startsWith(nm.toLowerCase()) || names.length === 1 || t.narration.indexOf(s) >= 0)) recaps.push(s.slice(0, 70));
      }
    }
    rows.push({ n: t.n, work: t.work, words: toks(t.narration).length, repeated: rep, openersRepeated: op, recaps: [...new Set(recaps)], filler: t.narration.match(FILLER) || [],
      rhetorical: sents(unq(t.narration)).filter((s) => s.endsWith('?')).length, nameParagraphs: t.narration.split(/\n+/).filter((p: string) => names.some((nm) => p.startsWith(nm + ','))).length });
  });
  return rows;
}
describe.skipIf(!process.env.PHC_LIVE_COUNT)('count a live transcript', () => {
  it('prints the counts', () => {
    const run = JSON.parse(readFileSync(process.env.PHC_LIVE_COUNT!, 'utf8'));
    console.log(JSON.stringify(countRun(run, ['MPAT', 'Rook'])));
  });
});
