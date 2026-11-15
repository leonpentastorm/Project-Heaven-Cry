// @ts-nocheck (a measuring tool)
// HOW MUCH A HEALER CAN SYPHON IN A SURVIVAL FIGHT (0.28.3, the Attuner's Syphon). Skipped unless asked for:
//
//   SYPHON_MEASURE=1 npx vitest run --root packages/engine test/balance/syphon-measure.test.ts --silent=false
//
// A Mender (Empathy 6, the Attuner in the off hand, MP emptied) in a fight that starts where a Survival fight does
// (the meter at MANA_START), through the reducer: on each of its turns it Syphons as the policy says and passes; the
// foes are held still so nobody dies (deaths raise the meter: the `deaths` rows start it higher instead). Five turns
// (a fight lasts 5 rounds: docs/design/handoffs/action-price-list.md row 15). The Mends it buys are read from
// data/tending.json's tend.mend cost (pass MEND_MP to price another figure).
import { describe, it } from 'vitest';
import '../helpers/yard16';
import { storyWith } from '../helpers/perkfight';
import { MANA_START } from '../../src';
import tendingJ from '../../../../data/tending.json';

const ON = !!process.env.SYPHON_MEASURE, TURNS = 5;
const MEND = (tendingJ as any).items.find((v: any) => v.id === 'tend.mend').effects.find((e: any) => e.op === 'grant_action');
const MEND_MP = Number(process.env.MEND_MP) || (JSON.stringify(MEND).match(/"mp":\{"base":(\d+)/) || JSON.stringify(MEND).match(/"mp":(\d+)/))[1];

function run(perTurn: number, meter: number, level = 1, attrs?: Record<string, number>) {
  const s = storyWith([{ name: 'Mender', skills: { empathy: 6, camaraderie: 0 }, attrs, level, weapon: 'service_pistol' }]);
  const ch = s.g.characters[s.chars[0].id]; ch.offHand = { id: 'attuner' }; ch.pack = (ch.pack || []).filter((x) => !['emanator', 'attuner'].includes(x.item || x.id)); ch.mp = 0;
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Measure', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Dummy', tier: 'soldier', weapon: 'service_pistol', at: 'P10', no_surrender: true }] } } } as any);
  const cb = () => s.g.combat; cb().mana = meter;
  const me = () => cb().units.find((u) => u.charId === ch.id); let got = 0, n = 0;
  for (let t = 0; t < TURNS; t++) {
    for (let i = 0; i < 12 && cb().order[cb().turn] !== me().id; i++) { const id = cb().order[cb().turn]; const v = cb().units.find((u) => u.id === id); if (v.side === 'foe') v.ap = 0; s.act({ type: 'combat/end-turn', unitId: id } as any); }
    for (let k = 0; k < perTurn; k++) { const was = me().mg.mp; try { s.act({ type: 'combat/syphon', unitId: me().id } as any); } catch { break; } got += me().mg.mp - was; n++; }
    s.act({ type: 'combat/end-turn', unitId: me().id } as any);
  }
  return { got, n, max: me().mg.mpMax, mult: me().mg.syphon, meterEnd: cb().mana };
}
describe('Syphon in a Survival fight', () => {
  (ON ? it : it.skip)('MP a healer can draw, and the Mends it buys', () => {
    console.log('[syphon] Mend cost read: ' + MEND_MP + ' MP');
    for (const [label, meter] of [['Survival start (meter ' + MANA_START + ')', MANA_START], ['after two deaths (meter ' + (MANA_START + 10) + ')', MANA_START + 10]] as const)
      for (const per of [1, 2, 6]) for (const [who, attrs] of [['plain (Insight 1, Determination 1)', undefined], ['an Empath (Insight 7, Determination 3)', { insight: 7, determination: 3 }]] as const) {
        const r = run(per, meter, 5, attrs);
        console.log('[syphon] ' + label + ', ' + who + ', ' + per + ' Syphon(s) a turn x ' + TURNS + ' turns: ' + r.n + ' Syphons (x' + r.mult + '), ' + r.got + ' MP (pool ' + r.max + '), meter ends ' + r.meterEnd + ' | Mends at 8 MP: ' + Math.floor(r.got / 8) + ', at 24 MP: ' + Math.floor(r.got / 24) + ', in this data, ' + MEND_MP + ' MP: ' + Math.floor(r.got / MEND_MP));
      }
  }, 600000);
});
