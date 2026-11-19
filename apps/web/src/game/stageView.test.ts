// The boon pick's cards (0.32 fix pass B10): each card says what its worth is in the game's words, against the run's
// boon room (rules 1.43, spec rule 31), never a bare "Room 5". Through the real path: a run's Boss skipped through the
// reducer, the field left, the picks taken; stageView reads the offer the engine made.
import { describe, expect, it } from 'vitest';
import { apply, worthOf, capRoom, type GameState } from '@engine';
import { survivalRoom, startRun, ownerOf, leaveField } from '../../../../packages/engine/test/helpers/survival';
import { stageView } from './stageView';

const DUO: any[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
function afterBoss(): GameState {
  const g0: GameState = JSON.parse(JSON.stringify(startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001'))), r = g0.run!;
  const boss = r.nodes.find((x) => x.kind === 'boss')!, prev = r.nodes.find((x) => x.links.includes(boss.id))!;
  r.at = prev.id;
  let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== boss.id; i++) g = apply(g, { type: 'run/move', node: boss.id }, ownerOf(i));
  g = leaveField(apply(g, { type: 'run/skip' }, 'host'));
  for (let i = 0; i < DUO.length; i++) g = apply(g, { type: 'run/pick', charId: 'c' + (i + 1), choice: 'materials' }, ownerOf(i));
  return g;
}

describe('the boon pick (0.32 B10)', () => {
  it('a card says how much of the boon room it uses; the header says how much is left', () => {
    const g = afterBoss(); expect(g.run!.state).toBe('boon');
    const v = stageView(g, ownerOf(0))!, mine = v.boons.find((b) => b.mine)!;
    expect(mine.worth).toBe(capRoom(g.characters[mine.charId]) + ' left');
    for (const c of mine.cards) {
      expect(c.worthLine).toBe(worthOf(c.id) ? 'Uses ' + worthOf(c.id) + ' of your boon room' : 'Uses no boon room');
      expect(c.worthLine).not.toMatch(/^Room \d/);
    }
  });
});
