// The Survival run's screen, as data (survival-spec 8.2; rules 1.41, build step 3). Everything here is read from the
// engine: the map's nodes and links (g.run), what the party can reach and why a node can't be taken (`reachable`,
// `runMoveProblem`), what a node gives (`NODE_TIP`, `nodeXp`, `nodeCredits`), the panel's words (`NODE_TEXT`), the picks
// (g.run.offers, priced by the engine), who has a level-up waiting (`levelUpDue`). RunScreen.tsx only draws it.
import { type GameState, type RunNode, type RunOption, MAP_DATA, SETTING, NODE_TEXT, NODE_TIP, WEAPON, ITEM, RARITY, reachable, runMoveProblem, runNode, runSetting, nodeXp, nodeCredits, creditsOf, maxHp, wearView, wearAt, packOf, type WearV, levelUpDue, runRetireProblem, survivalRun, runOptions, lastingOptions, capRoom, BOON_CAP, relicRow, gearPreview } from '@engine';

export type NodeState = 'here' | 'walked' | 'reachable' | 'ahead' | 'passed';
export interface RunNodeV { id: string; depth: number; col: number; kind: string; word: string; gate: boolean; state: NodeState; tip: string; leans: { initials: string; color: string; name: string }[]; why: string | null;
  /** rules 1.48: a lane node's lane; a meeting node (junction, gate, final junction); the vault's spur step and the node it leaves */
  lane: number | null; junction: boolean; spur: 'guard' | 'chest' | null; from: string | null }
/** A link of the map; `back`: the vault chest's way back onto its lane (walked, never drawn as a trail). */
export interface RunLinkV { from: string; to: string; walked: boolean; lit: boolean; back: boolean }
export interface PartyV { id: string; name: string; level: number; hp: number; maxHp: number; credits: number; initials: string; color: string; mine: boolean; levelUp: boolean; classLine: string;
  /** rules 1.50: the main hand's wear (null: nothing there wears), and every other carried thing Worn or Broken, by name */
  wear: WearV | null; weapon: string; worn: { name: string; w: WearV }[] }
export interface OfferCardV { i: number; id: string; name: string; rarity: string; rarityWord: string; marks: number; category: string; price: number; tip: string; lines: { key: string; label: string; value: string }[] }
/** The pick card's short words for the gear preview's lines (the card is narrow; the hover card has the rest). */
const PICK_WORD: Record<string, string> = { hit: 'To hit', dmg: 'Damage', ap: 'AP', door_mod: 'Door' };
/** The path map's legend: every node kind's word, in the map's own words (data), the gate's apart. */
export const NODE_LEGEND: { kind: string; word: string }[] = ['fight', 'elite', 'boss', 'shop', 'forge', 'training', 'shrine', 'rest', 'cache', 'event']
  .map((k) => ({ kind: k, word: (MAP_DATA.words as Record<string, string>)[k] || k }));
export interface OfferV { charId: string; name: string; mine: boolean; canPick: boolean; cards: OfferCardV[]; instead: number }
export interface RunViewV {
  stage: number; depth: number; rows: number; setting: string; settingId: string; seed: string; state: string; title: string;
  /** rules 1.48: the stage's lane count; the party has not left the camp yet (at the start every lane is lit) */
  lanes: number; atStart: boolean;
  nodes: RunNodeV[]; links: RunLinkV[]; party: PartyV[];
  /** "Waiting for 1 player" while the leans are not all in; null when nobody has leaned or it is solo. */
  waiting: string | null; canGo: boolean; isHost: boolean; solo: boolean;
  note: { kicker: string; title: string; text: string; lines: string[] } | null;
  offers: OfferV[]; pending: string[];
  /** Rules 1.43: what the safe node offers each character (and the picks of kit), from the engine (runOptions). */
  choices: ChoiceCharV[]; kits: ChoiceCharV[];
  cleared: boolean; canRetire: boolean; over: boolean;
}

/** Rules 1.43: one character's choices at a safe node (or its pick of kit): each option as the engine priced and judged it. */
export interface ChoiceCharV { charId: string; name: string; mine: boolean; canAct: boolean; credits: number; worth: string; relics: string[]; options: RunOption[] }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const wordOf = (n: RunNode) => (n.gate ? 'Gate' : (MAP_DATA.words as Record<string, string>)[n.kind] || n.kind);
/** Rules 1.48: the theme's name of a lane node's segment ("The market road"), or null. */
const roadOf = (n: RunNode) => (n.theme ? MAP_DATA.themes.find((t) => t.id === n.theme)?.name || null : null);
const itemName = (id: string) => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
const catOf = (id: string) => { const w: any = WEAPON[id]; if (w) return cap(String(w.category || 'weapon').replace(/_/g, ' ')); const it: any = ITEM[id]; return it?.focus ? 'Focus · ' + cap(String(it.id)) : cap(String(it?.category || 'item')); };
/** The hover card of a node: what it gives and costs (data), and for a node that pays, the engine's XP and credits each. */
export function nodeTip(g: GameState, n: RunNode): string {
  const r = g.run!, k = n.gate ? 'gate' : n.kind, base = (NODE_TIP as Record<string, string>)[k] || '';
  const pay = ['fight', 'elite', 'boss', 'cache', 'vault_guard', 'vault'].includes(n.kind) ? (n.gate ? 'gate' : n.kind) : null;
  const xp = pay ? nodeXp(pay as any, n.depth, r.stage) : 0, cr = pay ? nodeCredits(pay as any, n.depth, r.stage) : 0;
  const nums = pay ? ' Pays each of you ' + (xp ? xp + ' XP and ' : '') + cr + ' credits.' : '';
  const road = roadOf(n), where = n.spur ? 'Off the trail' : n.junction ? (n.gate ? '' : 'A fork: you may change trail here') : road ? 'On ' + road.charAt(0).toLowerCase() + road.slice(1) : '';
  return wordOf(n) + ' · stop ' + n.depth + ' of ' + MAP_DATA.rows + '. ' + (where ? where + '. ' : '') + base + nums;
}

export function runView(g: GameState, me: string): RunViewV | null {
  const r = g.run; if (!r) return null;
  const isHost = me === g.hostId, can = new Set(reachable(r).map((n) => n.id)), walked = new Set(r.path), here = r.at;
  const hereNode = runNode(r, here), depth = hereNode?.depth || 0;
  const players = g.players, pl = (id: string) => players.find((p) => p.id === id);
  const nodes: RunNodeV[] = r.nodes.map((n) => ({
    id: n.id, depth: n.depth, col: n.col, kind: n.kind, word: wordOf(n), gate: !!n.gate, lane: n.lane ?? null, junction: !!n.junction, spur: n.spur || null, from: n.from || null,
    state: n.id === here ? 'here' : walked.has(n.id) ? 'walked' : can.has(n.id) ? 'reachable' : n.depth <= depth ? 'passed' : 'ahead',
    tip: nodeTip(g, n),
    leans: Object.entries(r.leans).filter(([, id]) => id === n.id).map(([pid]) => ({ initials: pl(pid)?.initials || '?', color: pl(pid)?.color || '#A3AEC2', name: pl(pid)?.name || '?' })),
    why: can.has(n.id) ? null : r.state === 'map' ? runMoveProblem(g, me, n.id) : null,
  }));
  const links: RunLinkV[] = r.nodes.flatMap((n) => n.links.map((to) => ({ from: n.id, to, walked: walked.has(n.id) && walked.has(to) && r.path.indexOf(to) === r.path.indexOf(n.id) + 1, lit: n.id === here && can.has(to), back: n.spur === 'chest' })));
  const party: PartyV[] = Object.values(g.characters).map((c) => {
    const p = pl(c.owner);
    return { id: c.id, name: c.name, level: c.level, hp: Math.max(0, c.hp), maxHp: maxHp(c), credits: creditsOf(c), initials: p?.initials || '?', color: p?.color || '#A3AEC2', mine: c.owner === me, levelUp: levelUpDue(c),
      classLine: 'Level ' + c.level + (c.classId ? '' : ' · classless'), wear: wearView(c, 'main'), weapon: itemName(c.weapon),
      worn: (['off', ...packOf(c).map((_, i) => i)] as ('off' | number)[]).map((where) => ({ x: wearAt(c, where), w: wearView(c, where) })).filter((q) => q.x && q.w && q.w.state !== 'sound').map((q) => ({ name: q.x!.name, w: q.w! })) };
  });
  const online = players.filter((p) => p.online), leaned = online.filter((p) => r.leans[p.id]).length, solo = online.length <= 1;
  const waiting = r.state === 'map' && !solo && leaned > 0 && leaned < online.length ? 'Waiting for ' + (online.length - leaned) + ' player' + (online.length - leaned === 1 ? '' : 's') : null;
  const offers: OfferV[] = Object.entries(r.offers || {}).map(([cid, o]) => {
    const c = g.characters[cid];
    return { charId: cid, name: c?.name || cid, mine: c?.owner === me, canPick: c?.owner === me || isHost, instead: o.instead,
      cards: o.weapons.map((w, i) => ({ i, id: w.id, name: itemName(w.id), rarity: w.rarity, rarityWord: cap(w.rarity), marks: (RARITY as any)[w.rarity]?.marks || 0, category: catOf(w.id), price: w.price,
        tip: itemName(w.id) + ' (' + cap(w.rarity) + '). ' + String((WEAPON[w.id] as any)?.text || (ITEM[w.id] as any)?.text || ''),
        lines: c ? gearPreview(c, { id: w.id, rarity: w.rarity }).lines.filter((l) => ['hit', 'dmg', 'ap', 'door_mod'].includes(l.key)).map((l) => ({ key: l.key, label: PICK_WORD[l.key] || l.label, value: l.value })) : [] })) };
  });
  const charV = (cid: string, options: RunOption[]): ChoiceCharV => {
    const c = g.characters[cid];
    return { charId: cid, name: c?.name || cid, mine: c?.owner === me, canAct: c?.owner === me || isHost, credits: c ? creditsOf(c) : 0, worth: (c ? capRoom(c) : 0) + ' of ' + BOON_CAP, relics: (c?.relics || []).map((id) => relicRow(id)?.name || id), options };
  };
  const mineFirst = (a: ChoiceCharV, b: ChoiceCharV) => Number(b.mine) - Number(a.mine);
  const choices = r.visit && r.visit.node === here ? Object.keys(g.characters).map((cid) => charV(cid, runOptions(g, cid))).filter((x) => x.options.length).sort(mineFirst) : [];
  const kits = Object.keys(r.lasting || {}).map((cid) => charV(cid, lastingOptions(g, cid))).sort(mineFirst);
  const n = r.note, nn = n ? runNode(r, n.node) : undefined;
  const note = n && nn ? {
    kicker: (nn.gate ? 'THE GATE' : wordOf(nn).toUpperCase()) + ' · STOP ' + nn.depth + ' OF ' + MAP_DATA.rows,
    title: n.won ? 'Won in ' + n.rounds + (n.rounds === 1 ? ' round' : ' rounds') : wordOf(nn),
    text: n.text || (n.won ? 'Each of you takes the pay below, then picks a weapon.' : ''),
    lines: [
      ...(n.xp ? ['Each of you: ' + n.xp + ' XP' + (n.credits ? ', ' + n.credits + ' credits' : '') + '.'] : []),
      ...Object.entries(n.ammo || {}).filter(([, l]) => l.length).map(([cid, l]) => (g.characters[cid]?.name || cid) + ': ' + l.join(', ') + '.'),
      ...(n.back || []).map((cid) => (g.characters[cid]?.name || cid) + ' is back on their feet at ' + survivalRun.dead_return_hp + ' HP.'),
    ],
  } : null;
  const setting = SETTING[runSetting(r)]?.name || runSetting(r);
  return {
    stage: r.stage, depth, rows: MAP_DATA.rows, setting, settingId: runSetting(r), seed: r.seed, state: r.state,
    lanes: r.nodes.filter((n) => n.depth === 1).length, atStart: !here,
    title: r.state === 'boon' ? 'STAGE ' + r.stage + ' CLEARED' : r.state === 'reward' ? 'Rewards' : r.state === 'over' ? 'The run is over' : depth ? 'Choose your next stop' : 'Choose your first stop',
    nodes, links, party, waiting, canGo: isHost && !solo && leaned > 0 && r.state === 'map', isHost, solo, note,
    offers, pending: [...offers.map((o) => o.name), ...kits.map((k) => k.name)], choices, kits,
    cleared: r.state === 'boon', canRetire: !runRetireProblem(g, me), over: r.state === 'over',
  };
}
/** Is this character's hp shown as hurt (for the strip's colour paired with its numbers)? */
export const hurt = (p: PartyV) => p.hp < p.maxHp;
