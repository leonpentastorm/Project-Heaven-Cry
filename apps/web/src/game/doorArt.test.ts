// The nine doors art reaches the screens: every delivered picture of the families the web game draws is built
// (assets.json has its catalog id), and every data id the catalog binds a picture to (its `data_ids`, else its catalog
// id's stem) gets that picture from the family's resolver (game/doorArt.ts), for the ids the data really has.
import { describe, it, expect, vi } from 'vitest';
vi.mock('./store', () => ({ act: () => {}, toast: () => {}, getState: () => ({}), subscribe: () => () => {} })); // forkView's store: no room here
import CATALOG from '../../../../art/catalog.json';
import ASSETS from './assets.json';
import { TECHNIQUES, CONDITION_ROWS, CLASS, SKILLS, allItems, techId, perkId } from '@engine';
import { techIconOf, condIconOf, doorEmblemOf, classPortraitOf, campStepIconOf, moveIconOf, actionIconOf, placeIconOf, uiMarkOf, bigOf } from './doorArt';
import { forkIconOf } from './forkView';
import { vowIconUri, witnessedUri } from './faithArt';
import mainT from '../templates/main.template.html?raw';
import combatT from '../templates/combat.template.html?raw';
import levelupT from '../templates/levelup.template.html?raw';
import lightboxT from '../templates/lightbox.template.html?raw';
import giveSrc from './GiveTab.tsx?raw';
import shopSrc from './ShopScreen.tsx?raw';
import upgradeSrc from './UpgradeCard.tsx?raw';
import runSrc from './RunScreen.tsx?raw';
import loadoutSrc from './LoadoutScreen.tsx?raw';
import placeSrc from './PlaceScreen.tsx?raw';

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

// The 0.30 and after-0.30 deliveries (17 Nov 2026): every delivered picture of every family is built, with its large
// copy for the enlarged view, and reaches its place by the data's own id.
describe('the 0.30 and after-0.30 art reaches the screens', () => {
  it("every delivered fork icon is the fork option's icon", () => {
    const list = delivered('fork_icons');
    expect(list.length).toBe(32);
    for (const [cid] of list) {
      const id = 'fork.' + cid.slice('fork-'.length).replace('-', '.'); // data/forks.json's id
      expect(forkIconOf(id, 'durability'), cid).toBe(A['wick-fork-' + cid]);
      expect(A['wick-fork-' + cid + '-lg'], cid).toBeTruthy();
    }
  });

  it('every delivered white-ink picture has a large copy (the enlarged view), and the families are built', () => {
    for (const [fam] of FAMILIES) for (const [cid] of delivered(fam)) if (fam !== 'class_portraits') expect(A[cid + '-lg'], cid).toBeTruthy();
    for (const [cid] of delivered('place_icons')) { expect(A[cid], cid).toBeTruthy(); expect(A[cid + '-lg'], cid).toBeTruthy(); }
    for (const [cid] of delivered('interface_icons').filter(([k]) => k.startsWith('icon-') && !k.startsWith('icon-panel-'))) expect(A[cid] && A[cid + '-lg'], cid).toBeTruthy();
    expect(delivered('place_icons').length).toBe(12);
    expect(A['banner-fight-field']).toBeTruthy();
    expect(A['gear-afterword']).toBeTruthy();
    for (const id of ['stand_behind_me']) expect(A['move-' + id]).toBeTruthy();
    expect(techIconOf('follow')).toBe(A['tech-follow']);
    for (const id of ['staggered', 'left_brain_debuff', 'right_brain_debuff', 'swinging', 'ground', 'in_your_sights', 'free_move_spent', 'given_mark', 'given_edge', 'mana_shock'])
      expect(condIconOf(id), id).toBeTruthy();
  });

  it('a place card finds its picture by its option key or trade id; the marks by group and word; vows and Witnessed', () => {
    for (const [cid, a] of delivered('place_icons')) for (const id of a.data_ids) {
      expect(placeIconOf(id), id).toBe(A[cid]);
      expect(placeIconOf(id + ':2'), id).toBe(A[cid]);
    }
    expect(placeIconOf('drill:pistol')).toBe('');
    for (const side of ['helps', 'hurts', 'state']) expect(uiMarkOf('status', side)).toBe(A['icon-status-' + side]);
    for (const k of ['minefield', 'fire', 'radiation', 'gas', 'collapse']) expect(uiMarkOf('hazard', k)).toBe(A['icon-hazard-' + k]);
    for (const k of ['field', 'trap', 'turret']) expect(uiMarkOf('zone', k)).toBe(A['icon-zone-' + k]);
    expect(uiMarkOf('zone', 'raise')).toBe('');
    for (const v of ['shield', 'mercy', 'stand', 'bare', 'unarmed_faith', 'no_one_behind']) expect(vowIconUri(v), v).toBe(A['prayer-vow-' + v.replace(/_/g, '-')]);
    expect(witnessedUri()).toBe(A['prayer-witnessed']);
  });
});

// Click to enlarge (the owner, 17 Nov 2026): the icon slots carry data-zoom (the one lightbox, screens/shared.js, opens
// on them with the large copy, the name and the text), and bigOf finds a picture's large copy.
describe('click to enlarge reaches every icon slot', () => {
  const zoomed = (t: string, src: string) => (t.match(/<img[^>]*>/g) || []).some((tag) => tag.includes('src="{{' + src + '}}"') && tag.includes('data-zoom="{{'));
  it("the templates' icon slots", () => {
    for (const src of ['fo.icon', 'm.icon', 's.icon', 'dw.icon', 'qv.icon', 'kt.icon', 'tm.icon', 'pe.icon', 'fa.witnessed.icon', 'fa.vow.icon', 'classHead.icon']) expect(zoomed(mainT, src), 'main ' + src).toBe(true);
    for (const src of ['sc.icon', 'v.icon', 'a.icon', 'a.head.icon', 'pe.icon', 'r.icon', 'd.icon', 'tb.icon']) expect(zoomed(combatT, src), 'combat ' + src).toBe(true);
    for (const src of ['fo.icon', 'f.icon', 'pk.icon']) expect(zoomed(levelupT, src), 'levelup ' + src).toBe(true);
    expect(lightboxT).toContain('{{lb.text}}');
  });
  it("the Survival screens' pictures (Give, shop, Sell, Forge and upgrade cards, rewards, materials, camp, place cards)", () => {
    for (const [name, src, n] of [['GiveTab', giveSrc, 1], ['ShopScreen', shopSrc, 2], ['UpgradeCard', upgradeSrc, 1], ['RunScreen', runSrc, 2], ['LoadoutScreen', loadoutSrc, 1], ['PlaceScreen', placeSrc, 1]] as [string, string, number][])
      expect((src.match(/<img data-zoom=[{]/g) || []).length, name).toBe(n);
  });
  it("bigOf gives a built picture's large copy, else the picture", () => {
    expect(bigOf(A['tech-cleave'])).toBe(A['tech-cleave-lg']);
    expect(bigOf(A['icon-status-helps'])).toBe(A['icon-status-helps-lg']);
    expect(bigOf('/x.png')).toBe('/x.png');
  });
});
