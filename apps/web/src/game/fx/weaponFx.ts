// How a weapon looks and sounds when it fires, read from the data (Leon, 14 Nov 2026: "Do all weapon to, if i see another
// missmatch bullet effect on a flamer or grenade launcher i'm gonna stroke"). Content is data: no weapon id is named
// here. A weapon's effects family is data/rules.json weapons_rules.fx.by_ammo[its ammo], else by_system[its phys.system],
// else by_category[its category]; the family's fields, then the weapon's own `fx` block (data/weapons.json) over them. A new weapon with a
// category (or an ammo) gets its family's effects with no code change (weapon-fx-table.test.ts adds one of each in
// memory and fires it through the engine). The table of what every weapon does: docs/design/handoffs/weapon-fx-table.md.
import { RULES, WEAPON } from '@engine';
import type { Sfx } from '../sfx';
import { SIGIL_INK, SOUL_WARM } from '../glyphs';

/** What flies: a bullet's streak, a shell's pellet cluster, an arrow or a bolt's shaft, a lobbed grenade, a rocket, a
 *  gout of fire, a charge's bolt, the weapon itself thrown. */
export type Look = 'bullet' | 'pellets' | 'arrow' | 'lob' | 'rocket' | 'flame' | 'bolt' | 'beam' | 'thrown';
export type Blast = 'frag' | 'fire' | 'smoke' | 'flash' | 'zap';
export interface WeaponFx {
  /** the effects family (data: weapons_rules.fx.families) */ family: string;
  sound: Sfx | null; rate?: number; look: Look; color?: string;
  /** the mark a round that hits leaves (a part: hole, pellets, shaft), or null */ mark: string | null;
  blast: Blast | null;
  shell: string | null; eject: 'shot' | 'reload' | null; mag: string | null; load: string | null; cycle: number;
  bow: 'bow' | 'crossbow' | null; core: string | null;
  /** the firing sample is a stand-in until a proper one is sourced (what it should be) */ stand_in: string | null;
  /** a muzzle flash at the shot (a gun, a rocket's backblast, a charge): not a launcher's arc, a flame, a bow or a throw */ muzzle: boolean;
}
const FX: any = (RULES as any).weapons_rules?.fx || { families: {}, by_ammo: {}, by_category: {} };
const INK: Record<string, string> = { sigil: SIGIL_INK, soul: SOUL_WARM };
/** The family a weapon's effects come from (its ammo first: a shell is a shotgun's whatever carries it). */
export function familyOf(w: { ammo?: string | null; category?: string; phys?: { system?: string } } | null | undefined, cat = ''): string {
  return (w?.ammo && FX.by_ammo[w.ammo]) || (w?.phys?.system && FX.by_system?.[w.phys.system]) || FX.by_category[w?.category || cat] || FX.by_category[cat] || 'pistol';
}
/** A weapon's effects (by its id; one not in the data by its category). Pure. */
export function fxOf(id: string | null | undefined, cat: string | null | undefined): WeaponFx {
  const w: any = (id && (WEAPON as any)[id]) || null;
  const family = familyOf(w, cat || ''), f = { ...(FX.families[family] || {}), ...(w?.fx || {}) };
  const look: Look = f.look || 'bullet';
  return {
    family, sound: (f.sound ?? null) as Sfx | null, ...(f.rate ? { rate: f.rate } : {}), look, ...(f.color ? { color: INK[f.color] || f.color } : {}),
    mark: f.mark ?? null, blast: f.blast ?? null,
    shell: f.shell ?? null, eject: f.shell ? f.eject ?? null : null, mag: f.mag ?? null, load: f.load ?? null, cycle: f.cycle || 0,
    bow: f.bow ?? null, core: f.spent_core ?? null, stand_in: f.stand_in ?? null,
    muzzle: !['lob', 'flame', 'arrow', 'thrown'].includes(look),
  };
}
