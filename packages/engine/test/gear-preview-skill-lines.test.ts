// Rules 1.55 (Leon, 15 Nov 2026): every weapon card says which skill the weapon rolls to hit with and what its damage
// scales with. The preview's "Hits with" must name the skill whose modifier the real attack's dice breakdown adds.
import { describe, it, expect } from 'vitest';
import { gearPreview, previewAttack, SKILL, ITEM, WEAPONS, ATTRS, checkMod, weaponMultLabel, weaponMult } from '../src';
import { PROFILES, pairOf, statTerm } from '../src/effects/output';
import { fightWith, withGame } from './helpers/perkfight';

const line = (p: any, k: string) => p.lines.find((l: any) => l.key === k);
// distinct points so each skill's modifier is a different number
const SKILLS = { dexterity: 6, raw_power: 3, brain_power: 4, athletics: 1 };

describe('the gear preview names the skill a weapon hits with and what its damage scales with', () => {
  for (const [weapon, mode] of [['hellraiser_service_rifle', 'shot'], ['maul', 'melee'], ['combat_knife', 'melee'], ['recurve_bow', 'shot']] as const) {
    it(weapon + ': "Hits with" is the skill whose modifier the attack roll adds', () => {
      const f = fightWith([{ weapon, skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
      const c = f.g.characters[f.pc.charId!], p = gearPreview(c, { id: weapon });
      const hits = line(p, 'hits_with');
      expect(hits, weapon).toBeTruthy();
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
    });
  }
  it('a focus (the Evoker) hits through its door', () => {
    const f = fightWith([{ skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
    const c = f.g.characters[f.pc.charId!], p = gearPreview(c, { id: 'evoker' }), door = (ITEM as any).evoker.focus.door;
    expect(line(p, 'hits_with').value).toBe(SKILL[door].name + ' · +' + checkMod(c, door));
  });
  it('"Damage scales with" names only inputs whose slope is not 0: a melee weapon its Attribute (rules 1.56), no gun and no focus', () => {
    const f = fightWith([{ skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
    const c = f.g.characters[f.pc.charId!];
    const zero = (id: string) => !PROFILES[id].attr && !PROFILES[id].skill;
    expect(zero('weapon')).toBe(true); // rules 1.26: level buys damage; if this changes, the line must come back
    const nm = (id: string) => ATTRS.find((a) => a.id === id)!.name;
    for (const w of WEAPONS) {
      const s = line(gearPreview(c, { id: w.id }), 'scales_with'), ph = (w as any).phys;
      if (!ph) continue;
      if (zero(ph.profile || 'weapon')) expect(s, w.id).toBeUndefined();
      else { // rules 1.56: the Attribute, never the skill; with the percent the hit's own multiplier stands from the profile's pin (the flat weapon profile: rules 1.61 R5)
        const n = Math.round((weaponMult(c, w.id) / statTerm('weapon', [], []) - 1) * 100);
        expect(s?.label, w.id).toBe('Damage');
        expect(s?.value, w.id).toBe((ph.scales_with as string[]).filter((x) => ATTRS.some((a) => a.id === x)).map(nm).join(' and ') + ' · ' + (n >= 0 ? '+' : '') + n + '%');
      }
    }
    expect(WEAPONS.filter((w) => line(gearPreview(c, { id: w.id }), 'scales_with')).length, 'every melee weapon with the melee profile shows it').toBeGreaterThan(10);
    for (const id of ['evoker', 'emanator', 'attuner', 'visualizer']) {
      const s = line(gearPreview(c, { id }), 'scales_with');
      const prof = Object.keys(PROFILES).find((k) => PROFILES[k].level === 'deal' && pairOf(k).skills.includes((ITEM as any)[id].focus.door));
      if (!prof || zero(prof)) expect(s, id).toBeUndefined(); else expect(s, id).toBeTruthy();
    }
    // a non-zero slope names exactly its own inputs: the physical profile (a weapon with no phys block) has both
    expect(PROFILES.physical.attr && PROFILES.physical.skill).toBeTruthy();
    expect(weaponMultLabel('no_such_weapon', { live: true })).toBe('Strength and Raw Power');
  });
  it('the percent on the damage line is the multiplier a real melee hit is dealt with (the maul, Strength 7)', () => {
    const f = fightWith([{ weapon: 'maul', skills: SKILLS, attrs: { strength: 7 } }], [{ tier: 'soldier', classic: true }]);
    const c = f.g.characters[f.pc.charId!], s = line(gearPreview(c, { id: 'maul' }), 'scales_with');
    f.pc.ap = 6; f.foe.pos = '4,5'; f.pc.pos = '3,5';
    const pv: any = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'melee'));
    const stat = (pv.dmg?.mults || []).find((t: any) => Math.abs(t.v - weaponMult(c, 'maul')) < 1e-9);
    expect(stat, JSON.stringify(pv.dmg?.mults)).toBeTruthy(); expect(weaponMult(c, 'maul')).toBeGreaterThan(1);
    expect(s.value.endsWith(' · +' + Math.round((stat.v / statTerm('weapon', [], []) - 1) * 100) + '%'), s.value).toBe(true);
  });
  it('rules 1.61 R5: the percent stands from the pin (Attribute 7 +0%), for a gun as for a blade: a gun at Agility 1 reads under 0', () => {
    const at = (attrs: any, id: string) => { const f = fightWith([{ weapon: id, skills: SKILLS, attrs }], [{ tier: 'soldier', classic: true }]); return line(gearPreview(f.g.characters[f.pc.charId!], { id }), 'scales_with').value; };
    const gun = 'hellraiser_service_rifle', k = PROFILES.gun.k / PROFILES.weapon.k, top = PROFILES.gun.k * (1 + PROFILES.gun.attr * 9) / PROFILES.weapon.k;
    expect(at({ agility: 1 }, gun)).toBe('Agility · ' + Math.round((k - 1) * 100) + '%');
    expect(Math.round((k - 1) * 100)).toBeLessThan(0);
    expect(at({ agility: 7 }, gun)).toBe('Agility · +0%');
    expect(at({ agility: 10 }, gun)).toBe('Agility · +' + Math.round((top - 1) * 100) + '%');
    expect(at({ strength: 7 }, 'maul')).toBe('Strength · +0%');
  });
  it('the magazine reads rounds, a middle dot, the calibre', () => {
    const f = fightWith([{ weapon: 'decrkm_smg', skills: SKILLS }], [{ tier: 'soldier', classic: true }]);
    expect(line(gearPreview(f.g.characters[f.pc.charId!], { id: 'decrkm_smg' }), 'mag').value).toMatch(/^\d+ · \S/);
  });
});
