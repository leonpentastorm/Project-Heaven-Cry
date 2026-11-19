// The 0.32 gaps lane (docs/design/handoffs/BEFORE-ITEMS-2.0.md group B): each fault proved through the reducer or the
// engine's own answers to the screens (actionsFor, previewDescriptor), never an inner function the game does not call.
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { actionsFor } from '../src';

describe('TRIAGE row 10: a resource price of 1 names one ("1 core", never "1 spare cores")', () => {
  it('Load the Visualizer costs 1 core, read off the action row the Figments tab shows', () => {
    const f = figFight([{ skills: { visualization: 5 }, cores: 5 }]);
    const u = f.turn(f.pc);
    const row = actionsFor(f.g, u.id).find((d) => /visualizer_core/.test(d.id));
    expect(row, 'the Load the Visualizer row').toBeTruthy();
    expect(row!.cost.text).toMatch(/· 1 core\b/);
    expect(row!.cost.text).not.toMatch(/spare cores/);
    expect(f.unit(u.id).mg!.cores).toBe(5); // the spare count is the pack's: five held, five spare
  });
});
