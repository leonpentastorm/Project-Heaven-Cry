// The item-ops table (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md): every live item in
// every situation, recorded on the engine before any item moved into data (test/golden/itemops.ts). An item converted
// from TypeScript into data must give the same state lines; the words (itemops.log.json) may be re-recorded on purpose.
import { describe, it } from 'vitest';
import { goldenPair } from './golden/rules';
import { recordItemOps } from './golden/itemops';

describe('golden table: item ops (every live item in every situation)', () => {
  it('perks', () => { const { state, log } = recordItemOps((k) => k.startsWith('perk/')); goldenPair('itemops-perks', state, log); }, 600000);
  it('traits and classes', () => { const { state, log } = recordItemOps((k) => !k.startsWith('perk/')); goldenPair('itemops-traits-classes', state, log); }, 600000);
});
