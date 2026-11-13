// The Survival run's screen, as data (survival-spec 8.2; rules 1.41, build step 3). Everything here is read from the
// engine: the map's nodes and links (g.run), what the party can reach and why a node can't be taken (`reachable`,
// `runMoveProblem`), what a node gives (`NODE_TIP`, `nodeXp`, `nodeCredits`), the panel's words (`NODE_TEXT`), the picks
// (g.run.offers, priced by the engine), who has a level-up waiting (`levelUpDue`). RunScreen.tsx only draws it.
import { type GameState, type RunNode, MAP_DATA, SETTING, NODE_TEXT, NODE_TIP, WEAPON, ITEM, RARITY, reachable, runMoveProblem, runNode, runSetting, nodeXp, nodeCredits, creditsOf, maxHp, levelUpDue, runRetireProblem } from '@engine';

export type NodeState = 'here' | 'walked' | 'reachable' | 'ahead' | 'passed';
export interface RunNodeV { id: string; depth: number; col: number; kind: string; word: string; gate: boolean; state: NodeState; tip: string; leans: { initials: string; color: string; name: string }[]; why: string | null }
export interface RunLinkV { from: string; to: string; walked: boolean; lit: boolean }
export interface PartyV { id: string; name: string; level: number; hp: number; maxHp: number; credits: number; initials: string; color: string; mine: boolean; levelUp: boolean; classLine: string }
export interface OfferCardV { i: number; id: string; name: string; rarity: string; rarityWord: string; marks: number; category: string; price: number; tip: string }
export interface OfferV { charId: string; name: string; mine: boolean; canPick: boolean; cards: OfferCardV[]; instead: number }
export interface RunViewV {
  stage: number; depth: number; rows: number; setting: string; seed: string; state: string; title: string;
  nodes: RunNodeV[]; links: RunLinkV[]; party: PartyV[];
  /** "Waiting for 1 player" while the leans are not all in; null when nobody has leaned or it is solo. */
  waiting: string | null; canGo: boolean; isHost: boolean; solo: boolean;
  note: { kicker: string; title: string; text: string; lines: string[] } | null;
  offers: OfferV[]; pending: string[];
  cleared: boolean; canRetire: boolean; over: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const wordOf = (n: RunNode) => (n.gate ? 'Gate' : (MAP_DATA.words as Record<string, string>)[n.kind] || n.kind);
const itemName = (id: string) => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
const catOf = (id: string) => { const w: any = WEAPON[id]; if (w) return cap(String(w.category || 'weapon').replace(/_/g, ' ')); const it: any = ITEM[id]; return it?.focus ? 'Focus · ' + cap(String(it.id)) : cap(String(it?.category || 'item')); };
/** The hover card of a node: what it gives and costs (data), and for a node that pays, the engine's XP and credits each. */
export function nodeTip(g: GameState, n: RunNode): string {
  const r = g.run!, k = n.gate ? 'gate' : n.kind, base = (NODE_TIP as Record<string, string>)[k] || '';
  const pay = n.kind === 'fight' || n.kind === 'elite' || n.kind === 'boss' || n.kind === 'cache' ? (n.gate ? 'gate' : n.kind) : null;
  const nums = pay ? ' Each of you: ' + nodeXp(pay as any, n.depth, r.stage) + ' XP and ' + nodeCredits(pay as any, n.depth, r.stage) + ' credits.' : '';
  return wordOf(n) + ' · node ' + n.depth + ' of ' + MAP_DATA.rows + '. ' + base + nums;
}

export function runView(g: GameState, me: string): RunViewV | null {
  const r = g.run; if (!r) return null;
  const isHost = me === g.hostId, can = new Set(reachable(r).map((n) => n.id)), walked = new Set(r.path), here = r.at;
  const hereNode = runNode(r, here), depth = hereNode?.depth || 0;
  const players = g.players, pl = (id: string) => players.find((p) => p.id === id);
  const nodes: RunNodeV[] = r.nodes.map((n) => ({
    id: n.id, depth: n.depth, col: n.col, kind: n.kind, word: wordOf(n), gate: !!n.gate,
    state: n.id === here ? 'here' : walked.has(n.id) ? 'walked' : can.has(n.id) ? 'reachable' : n.depth <= depth ? 'passed' : 'ahead',
    tip: nodeTip(g, n),
    leans: Object.entries(r.leans).filter(([, id]) => id === n.id).map(([pid]) => ({ initials: pl(pid)?.initials || '?', color: pl(pid)?.color || '#A3AEC2', name: pl(pid)?.name || '?' })),
    why: can.has(n.id) ? null : r.state === 'map' ? runMoveProblem(g, me, n.id) : null,
  }));
  const links: RunLinkV[] = r.nodes.flatMap((n) => n.links.map((to) => ({ from: n.id, to, walked: walked.has(n.id) && walked.has(to) && r.path.indexOf(to) === r.path.indexOf(n.id) + 1, lit: n.id === here && can.has(to) })));
  const party: PartyV[] = Object.values(g.characters).map((c) => {
    const p = pl(c.owner);
    return { id: c.id, name: c.name, level: c.level, hp: Math.max(0, c.hp), maxHp: maxHp(c), credits: creditsOf(c), initials: p?.initials || '?', color: p?.color || '#A3AEC2', mine: c.owner === me, levelUp: levelUpDue(c),
      classLine: 'Level ' + c.level + (c.classId ? '' : ' · classless') };
  });
  const online = players.filter((p) => p.online), leaned = online.filter((p) => r.leans[p.id]).length, solo = online.length <= 1;
  const waiting = r.state === 'map' && !solo && leaned > 0 && leaned < online.length ? 'Waiting for ' + (online.length - leaned) + ' player' + (online.length - leaned === 1 ? '' : 's') : null;
  const offers: OfferV[] = Object.entries(r.offers || {}).map(([cid, o]) => {
    const c = g.characters[cid];
    return { charId: cid, name: c?.name || cid, mine: c?.owner === me, canPick: c?.owner === me || isHost, instead: o.instead,
      cards: o.weapons.map((w, i) => ({ i, id: w.id, name: itemName(w.id), rarity: w.rarity, rarityWord: cap(w.rarity), marks: (RARITY as any)[w.rarity]?.marks || 0, category: catOf(w.id), price: w.price,
        tip: itemName(w.id) + ' (' + cap(w.rarity) + '). ' + String((WEAPON[w.id] as any)?.text || (ITEM[w.id] as any)?.text || '') })) };
  });
  const n = r.note, nn = n ? runNode(r, n.node) : undefined;
  const note = n && nn ? {
    kicker: (nn.gate ? 'THE GATE' : wordOf(nn).toUpperCase()) + ' · NODE ' + nn.depth + ' OF ' + MAP_DATA.rows,
    title: n.won ? 'Won in ' + n.rounds + (n.rounds === 1 ? ' round' : ' rounds') : wordOf(nn),
    text: n.text || (n.won ? 'Each of you takes the pay below, then picks a weapon.' : ''),
    lines: [
      ...(n.xp ? ['Each of you: ' + n.xp + ' XP' + (n.credits ? ', ' + n.credits + ' credits' : '') + '.'] : []),
      ...Object.entries(n.ammo || {}).filter(([, l]) => l.length).map(([cid, l]) => (g.characters[cid]?.name || cid) + ': ' + l.join(', ') + '.'),
      ...(n.back || []).map((cid) => (g.characters[cid]?.name || cid) + ' stands up at 1 HP: the squad won.'),
    ],
  } : null;
  const setting = SETTING[runSetting(r)]?.name || runSetting(r);
  return {
    stage: r.stage, depth, rows: MAP_DATA.rows, setting, seed: r.seed, state: r.state,
    title: r.state === 'boon' ? 'STAGE ' + r.stage + ' CLEARED' : r.state === 'reward' ? 'Rewards' : r.state === 'over' ? 'The run is over' : depth ? 'Pick the next node' : 'Pick the first node',
    nodes, links, party, waiting, canGo: isHost && !solo && leaned > 0 && r.state === 'map', isHost, solo, note,
    offers, pending: offers.map((o) => o.name),
    cleared: r.state === 'boon', canRetire: !runRetireProblem(g, me), over: r.state === 'over',
  };
}
/** Is this character's hp shown as hurt (for the strip's colour paired with its numbers)? */
export const hurt = (p: PartyV) => p.hp < p.maxHp;
