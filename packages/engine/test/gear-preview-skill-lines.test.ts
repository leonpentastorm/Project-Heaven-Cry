// Rules 1.55 (Leon, 15 Nov 2026): every weapon card says which skill the weapon rolls to hit with and what its damage
// scales with. The preview's "Hits with" must name the skill whose modifier the real attack's dice breakdown adds.
import { describe, it, expect } from 'vitest';
import { gearPreview, previewAttack, SKILL, ITEM, checkMod } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const line = (p: any, k: string) => p.lines.find((l: any) => l.key === k);
// distinct points so each skill's modifier is a different number
const SKILLS = { dexterity: 6, raw_power: 3, brain_power: 4, athletics: 1 };

describe('the gear preview names the skill a weapon hits with and what its damage scales with', () => {
  for (const [weapon, mode] of [['hellraiser_service_rifle', 'shot'], ['maul', 'melee'], ['combat_knife', 'melee'], ['recurve_bow', 'shot']] as const) {
    it(weapon + ': "Hits with" is the skill whose modifier the attack roll adds', () => {
      const f = fightWith([{ weapon, skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
      const c = f.g.characters[f.pc.charId!], p = gearPreview(c, { id: weapon });
      const hits = line(p, 'hits_with'), scales = line(p, 'scales_with');
      expect(hits && scales, weapon).toBeTruthy();
      const sk = Object.keys(SKILLS).find((id) => hits.value.startsWith(SKILL[id].name + ' · '))!;
      expect(sk, hits.value).toBeTruthy();
      expect(hits.value).toBe(SKILL[sk].name + ' · +' + checkMod(c, sk));
      // one real attack through the reducer: the breakdown's skill term is that skill's modifier
      f.pc.ap = 6; f.foe.pos = mode === 'melee' ? '4,5' : '8,5'; f.pc.pos = '3,5';
      if (weapon === 'recurve_bow') (f.pc as any).ammo = 5;
      // the breakdown resolveAttack rolls against (its own previewAttack), then the reducer's attack and its logged sum
      const pv: any = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, mode));
      expect(pv.ok, pv.why).toBe(true);
      expect(pv.terms.find((t: any) => t.label === 'skill')?.v).toBe(checkMod(c, sk));
      const n = f.cb.log.length;
      f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode } as any);
      const said = f.cb.log.slice(n).map((l: any) => (typeof l === 'string' ? l : l?.text || '')).join('\n');
      expect(said).toMatch(new RegExp(': d20 \\d+ ' + (pv.toHit >= 0 ? '\\+' : '−') + Math.abs(pv.toHit) + '\\b'));
      expect(scales.value).toMatch(/^(Agility and Dexterity|Strength and Raw Power)$/);
    });
  }
  it('a focus (the Evoker) hits through its door and scales with its damage profile\'s pair', () => {
    const f = fightWith([{ skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
    const c = f.g.characters[f.pc.charId!], p = gearPreview(c, { id: 'evoker' }), door = (ITEM as any).evoker.focus.door;
    expect(line(p, 'hits_with').value).toBe(SKILL[door].name + ' · +' + checkMod(c, door));
    expect(line(p, 'scales_with').value).toContain(SKILL[door].name);
  });
  it('the magazine reads rounds, a middle dot, the calibre', () => {
    const f = fightWith([{ weapon: 'decrkm_smg', skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
    expect(line(gearPreview(f.g.characters[f.pc.charId!], { id: 'decrkm_smg' }), 'mag').value).toMatch(/^\d+ · \S/);
  });
});
