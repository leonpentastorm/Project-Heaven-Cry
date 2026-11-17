// The nine doors art reaches the screens: every delivered picture of the families the web game draws is built
// (assets.json has its catalog id), and every data id the catalog binds a picture to (its `data_ids`, else its catalog
// id's stem) gets that picture from the family's resolver (game/doorArt.ts), for the ids the data really has.
import { describe, it, expect } from 'vitest';
import CATALOG from '../../../../art/catalog.json';
import ASSETS from './assets.json';
import { TECHNIQUES, CONDITION_ROWS, CLASS, SKILLS, allItems, techId, perkId } from '@engine';
import { techIconOf, condIconOf, doorEmblemOf, classPortraitOf, campStepIconOf, moveIconOf, actionIconOf } from './doorArt';

const C = CATALOG as any, A = ASSETS as Record<string, string>;
const FAMILIES: [string, string][] = [['move_icons', 'move-'], ['technique_icons', 'tech-'], ['shadow_icons', 'shadow-'], ['tending_icons', 'tend-'],
  ['condition_icons', 'cond-'], ['door_emblems', 'door-'], ['camp_icons', 'camp-step-'], ['class_portraits', 'class-']];
const delivered = (fam: string) => Object.entries(C[fam] || {}).filter(([, a]: any) => !a.placeholder && a.format !== 'svg') as [string, any][];
const idsOf = (cid: string, a: any, prefix: string): string[] => a.data_ids || [cid.slice(prefix.length).replace(/-/g, '_')];

describe('the nine doors art is built and resolved by data id', () => {
  it('every delivered picture of the families is in assets.json under its catalog id', () => {
    for (const [fam] of FAMILIES) {
      const list = delivered(fam);
      expect(list.length, fam).toBeGreaterThan(0);
      for (const [cid] of list) expect(A[cid], cid).toBeTruthy();
    }
  });

  it('every data_ids entry names a real data id (an item key, a technique, a skill)', () => {
    const items = new Set(allItems().map((i: any) => i.key)), techs = new Set(TECHNIQUES.map((t: any) => t.id)), skills = new Set((SKILLS as any[]).map((s) => s.id));
    for (const [fam, prefix] of FAMILIES) for (const [cid, a] of delivered(fam)) for (const id of a.data_ids || []) {
      const ok = fam === 'technique_icons' ? techs.has(id) : fam === 'door_emblems' ? skills.has(id) : items.has(id.split('#')[0]) || id === 'hide';
      expect(ok, prefix + ' ' + cid + ' -> ' + id).toBe(true);
    }
  });

  it('each data id with a delivered picture gets it from its resolver', () => {
    const bound = (fam: string, prefix: string) => new Map(delivered(fam).flatMap(([cid, a]) => idsOf(cid, a, prefix).map((id) => [id, A[cid]] as [string, string])));
    const check = (fam: string, prefix: string, ids: string[], of: (id: string) => string) => {
      const b = bound(fam, prefix); let n = 0;
      for (const id of ids) if (b.has(id)) { n++; expect(of(id), fam + ' ' + id).toBe(b.get(id)); }
      return n;
    };
    expect(check('technique_icons', 'tech-', TECHNIQUES.map((t: any) => t.id), techIconOf)).toBeGreaterThanOrEqual(60);
    expect(check('condition_icons', 'cond-', CONDITION_ROWS.map((r: any) => r.id), condIconOf)).toBeGreaterThanOrEqual(55);
    expect(check('class_portraits', 'class-', Object.keys(CLASS as any), (id) => classPortraitOf(id))).toBe(9);
    expect(check('door_emblems', 'door-', (SKILLS as any[]).filter((s) => s.slot === 'alpha').map((s) => s.id), (id) => doorEmblemOf(id))).toBe(9);
    expect(check('camp_icons', 'camp-step-', ['weapon', 'focus', 'budget', 'boon', 'ready'], (id) => campStepIconOf(id))).toBe(5);
    // the action families by item key (the action's own picture first where the item has several)
    const keys = allItems().map((i: any) => i.key);
    let rows = 0;
    for (const [fam, prefix] of FAMILIES.slice(0, 4) as [string, string][]) {
      for (const [cid, a] of delivered(fam)) for (const id of idsOf(cid, a, prefix)) {
        const [k, act] = id.split('#');
        if (!keys.includes(k) && k !== 'hide') continue;
        rows++; expect(moveIconOf(k, act || null), fam + ' ' + id).toBe(A[cid]);
      }
    }
    expect(rows).toBeGreaterThanOrEqual(100);
  });

  it('an action row finds its icon by the descriptor id: a technique, a door verb, a class move, Hide', () => {
    expect(actionIconOf(techId('main', 'cleave'))).toBe(A['tech-cleave']);
    expect(actionIconOf(techId('off', 'guard'))).toBe(A['tech-guard-tech']);
    expect(actionIconOf(perkId({ id: 'verb:shadow.tag', actionId: 'tag' }))).toBe(A['shadow-tag']);
    expect(actionIconOf(perkId({ id: 'skill:durability.1', actionId: 'guard_slam' }))).toBe(A['move-slam']);
    expect(actionIconOf(perkId({ id: 'class:defender.brace', actionId: 'interpose' }))).toBe(A['move-brace']);
    expect(actionIconOf('hide')).toBe(A['move-hide']);
    expect(actionIconOf('move')).toBe('');
    expect(actionIconOf(null)).toBe('');
  });
});
