// The practice square the rules tests fight on: the 16 × 11 open ground the game had before maps grew to 26 × 26
// (rules 1.16). It is a fixture, not a map of the game: a rule's test names tiles on it ("F6", cover at F4–F5, the
// pillar at K7–K8) and must not move when the real ground is redrawn. The real maps are walked in maps.test.ts and
// fought on by the simulator (balance/sim.ts).
import { MAPS, type MapDef } from '../../src';

export const YARD16: MapDef = {
  id: 'yard16', name: 'Open ground', w: 16, h: 11, solid: [],
  cover: ['5,3', '5,4', '7,1', '8,9'], full: ['10,6', '10,7'], difficult: ['7,5', '8,5', '7,6'],
  pcStart: ['1,4', '1,6', '2,5', '1,8', '2,2', '1,2'], foeStart: ['14,5', '14,3', '14,7', '13,4', '13,6', '15,5', '13,9'],
  notes: [
    { at: 'A1–P11', text: 'Open ground. Whatever the Narrator says this place is.' },
    { at: 'F4–F5, H2, I10', text: 'Low walls and debris: half cover.' },
    { at: 'K7–K8', text: 'A thick pillar: full cover.' },
    { at: 'H6–I6, H7', text: 'Rough ground: slow going.' },
  ],
};
MAPS.yard16 = YARD16;
