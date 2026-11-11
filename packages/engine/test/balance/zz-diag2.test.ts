// @ts-nocheck
import { it } from 'vitest';
import { freshFight } from './sim';
import { gunBuild } from './guns-measure';
import { buildCharacter } from './builds';
import { previewAttack, previewTechnique, bindGame, apply } from '../../src';
it('dual', () => {
  const b = gunBuild('frontier_hand_cannon', 'masterwork', { offHand: 'frontier_hand_cannon' });
  const bc = buildCharacter(b, 'normal', 6);
  console.log(JSON.stringify(bc.c.offHand), bc.c.weapon, JSON.stringify(bc.c.pack).slice(0, 600));
  const st = freshFight({ build: b, variant: 'normal', level: 6 }, 'sim_range_soldier');
  const cb = st.g.combat, u = cb.units.find((q) => q.side === 'pc'), t = cb.units.find((q) => q.side === 'foe');
  console.log('off', u.offWeapon, u.offAmmo, u.ammo, u.ap, u.pos, t.pos);
  let g = st.g;
  try { g = apply(g, { type: 'combat/paired', charId: u.charId, targetId: t.id }, 'host'); console.log(g.combat.log.slice(-4).join('\n')); } catch (e) { console.log('ERR', String(e)); }
}, 60000);
