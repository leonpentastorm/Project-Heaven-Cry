// Survival test helpers (rules 1.41): a Survival room with a squad of the simulator's reference builds (one player
// each, as the mode asks), and a policy that walks a stage through the reducer: every player marks the same node, fights
// are played by the simulator's policies (Rec.fight), each character takes the first weapon of its pick.
import { reachable, type RunNode } from '../../src';
import { Rec, lobby, type Pc } from './replay';

/** A Survival room in its lobby: `pcs` level 1 builds, the first the host's, the others one player each (p2, p3, p4). */
export function survivalRoom(seed: string, pcs: Pc[], o: { test?: boolean } = {}) {
  const g: any = lobby(seed, pcs);
  g.settings.play = 'survival'; if (o.test) g.settings.test = true;
  pcs.forEach((_, i) => { if (!i) return; const id = 'p' + (i + 1); g.players.push({ id, name: 'Player ' + (i + 1), initials: 'P' + (i + 1), color: '#A3AEC2', online: true }); g.characters['c' + (i + 1)].owner = id; });
  return g;
}
/** Who plays each character (the host, then p2, p3, p4). */
export const ownerOf = (i: number) => (i ? 'p' + (i + 1) : 'host');
/** The way the test squad walks: the first reachable node of a kind in `prefer` (in order), else the first reachable. */
export function chooseNode(g: any, prefer: string[] = ['fight', 'elite', 'rest', 'cache', 'shop', 'forge', 'training', 'shrine', 'event', 'boss']): RunNode | null {
  const can = reachable(g.run);
  for (const k of prefer) { const n = can.find((x) => x.kind === k); if (n) return n; }
  return can[0] || null;
}
/** Walk the run until the stage is cleared, lost or `maxNodes` nodes are walked; fights by the simulator's policies
 * (or won at once by run/skip when `skip`). Returns the recorder. */
export function playStage(r: Rec, n: number, o: { maxNodes?: number; skip?: boolean; prefer?: string[] } = {}) {
  for (let guard = 0; guard < 200; guard++) {
    const run = r.g.run; if (!run || run.state === 'over' || run.state === 'boon' || r.g.phase === 'lobby') break;
    if (run.state === 'map') {
      if (o.maxNodes != null && run.path.length >= o.maxNodes) break;
      const node = chooseNode(r.g, o.prefer); if (!node) { r.errors.push('no node to reach'); break; }
      for (let i = 0; i < n; i++) r.must({ type: 'run/move', node: node.id }, ownerOf(i));
    } else if (run.state === 'fight') {
      if (o.skip) r.must({ type: 'run/skip' });
      else { r.fight(40); if (r.g.combat && !r.g.combat.over && r.g.phase === 'combat') { r.errors.push('a fight did not end in 40 rounds'); break; } }
    } else if (run.state === 'reward') {
      for (let i = 0; i < n; i++) if (run.offers?.['c' + (i + 1)]) r.must({ type: 'run/pick', charId: 'c' + (i + 1), choice: 0 }, ownerOf(i));
    } else if (run.state === 'shop') { // rules 1.42: the walker buys nothing and leaves (every player ready)
      for (let i = 0; i < n && r.g.run?.state === 'shop'; i++) r.must({ type: 'run/leave' }, ownerOf(i));
    } else break;
  }
  return r;
}
