import { it } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame } from './helpers/perkfight';
import { actionsFor, previewDescriptor } from '../src';
it('x', () => {
  const f = fightWith([{ skills: { durability: 5, raw_power: 3, ingenuity: 3 } } as any], [{ at: 'O10' }]); const u = f.turn(f.pc);
  f.unit(u.id).ap = 1;
  const ds = withGame(f.g, () => actionsFor(f.g, u.id, 'host'));
  for (const d of ds) { const pv: any = withGame(f.g, () => { try { return previewDescriptor(f.g, u.id, d.id, {}, 'host'); } catch (e) { return null; } }); if (!pv || pv.ok) continue;
    const t = pv.lines.map((l: any) => l.k + ':' + l.text); if (t.some((x: string) => x.includes(pv.why))) console.log('DUP', d.id, d.preview, '|', pv.why, '|', JSON.stringify(t)); }
});
