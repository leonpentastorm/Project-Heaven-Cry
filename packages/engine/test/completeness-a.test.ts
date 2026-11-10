// The completeness pass (rules 1.3): the items' area-map and story sides and the hooks they needed (sight, lurking NPCs,
// NPC movement, story damage, area-map strikes, the Narrator's fromTalk). Every test goes through the reducer (apply).
import { describe, expect, it } from 'vitest';
import { makeObject, apply, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, visibility, previewAttack, apLeft, d20, type GameState, type Combat, type Unit } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next d20 is n. */
export function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
/** A free tile on the zone map about d tiles from a tile (dx: the distance; the nearest free one at that distance). */
function freeNear(g: GameState, from: string, dx: number, _dy = 0): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  const cands: string[] = [];
  for (let i = -dx; i <= dx; i++) for (let j = -dx; j <= dx; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== dx) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) cands.push(k); }
  cands.sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.abs(ay - y) - Math.abs(by - y) || bx - ax; });
  if (!cands.length) throw new Error('no free tile near ' + from); return cands[0];
}
/** Place an NPC token through the Narrator. */
function place(s: { act: (a: any) => GameState; g: GameState }, at: string, o: { side?: string; hidden?: boolean; name?: string } = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Raider', side: o.side || 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf(at), ...(o.hidden ? { hidden: true } : {}) }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}

describe('lurking NPCs and the senses (Wind on the Skin, Skin Map, Sixth Sense on the area map)', () => {
  it('a lurker placed hidden stays hidden without a sense; nothing in the story names it', () => {
    const s = storyWith([{}]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
    const n = place(s, freeNear(s.g, at, 2), { hidden: true });
    expect(n.hidden).toBe(true); expect(storyHas(s.g, /Raider at/)).toBe(false);
    // Hidden from targeting on the area map too.
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'shot' } as any)).toThrow(/see/);
  });
  it('Sixth Sense: a lurker within 3 tiles shows when placed; Skin Map within 6 with a line; one farther stays hidden', () => {
    const s = storyWith([{ perks: ['sixth_sense'] }]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
    const n = place(s, freeNear(s.g, at, 2), { hidden: true });
    expect(n.hidden).toBeFalsy(); expect(storyHas(s.g, /Sixth Sense/)).toBe(true);
    const s2 = storyWith([{ perks: { skin_map: 'mastered' } }]); const c2 = s2.chars[0], at2 = positionsOf(s2.g)[c2.id];
    const near = place(s2, freeNear(s2.g, at2, 4), { hidden: true });
    expect(near.hidden).toBeFalsy(); expect(storyHas(s2.g, /Skin Map/)).toBe(true);
    const s3 = storyWith([{ perks: ['sixth_sense'] }]); const at3 = positionsOf(s3.g)[s3.chars[0].id];
    const far = place(s3, freeNear(s3.g, at3, 6), { hidden: true });
    expect(far.hidden).toBe(true);
  });
  it('Wind on the Skin: a fight opened from the area map reveals the nearest lurker (I) or every one (II); the rest start Hidden', () => {
    for (const tier of ['I', 'II']) {
      const s = storyWith([{ perks: { wind_on_the_skin: tier } }]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
      const t = place(s, freeNear(s.g, at, 1)), l1 = place(s, freeNear(s.g, at, 5), { hidden: true, name: 'Near lurker' }), l2 = place(s, freeNear(s.g, at, 8), { hidden: true, name: 'Far lurker' });
      void l1; void l2;
      s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: t.id, mode: 'shot' } as any);
      expect(s.g.phase).toBe('combat');
      // The near one is revealed for the squad; the far one too at II, else it opens the fight Hidden (it may act first).
      expect(storyHas(s.g, /Wind on the Skin.*Near lurker/)).toBe(true);
      expect(storyHas(s.g, /Wind on the Skin.*Far lurker/)).toBe(tier === 'II');
      expect(logHas(s.g.combat!, /Far lurker.*(hidden|Hidden|lurking)/i)).toBe(tier === 'I');
      expect(storyHas(s.g, /Wind on the Skin/)).toBe(true);
    }
  });
  it('Wind on the Skin: arriving in a zone feels who waits there; without it nobody shows', () => {
    const s = storyWith([{ perks: { wind_on_the_skin: 'II' } }]); const c = s.chars[0];
    const zones = (s.g.campaign as any).zones.map((z: any) => z.id), other = zones.find((z: string) => z !== zoneMap(s.g).id);
    // Lurkers already waiting in the other zone (saved there), as the Narrator would have placed them.
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', travel: other } } as any);
    const at = positionsOf(s.g)[c.id];
    const n = place(s, freeNear(s.g, at, 3), { hidden: true });
    expect(n.hidden).toBe(true); // placed after arriving: no arrival sense (Wind is on arrival and fight start)
    // Leave and come back: the lurker is still there and is felt on arrival.
    const here = zoneMap(s.g).id;
    s.act({ type: 'narrator/turn', turn: { narration: 'Back.', travel: zones.find((z: string) => z !== here) } } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Again.', travel: here } } as any);
    const back = npcsOf(s.g).find((x) => x.id === n.id)!;
    expect(back.hidden).toBeFalsy(); expect(storyHas(s.g, /Wind on the Skin/)).toBe(true);
  });
});

describe('the sight hook in fights (Sixth Sense, Skin Map)', () => {
  const wallBetween = (cb: Combat, x: number) => { cb.map = { ...cb.map, solid: Array.from({ length: cb.map.h }, (_, y) => x + ',' + y) }; };
  it('Sixth Sense: an enemy 2 tiles away behind a wall is seen by the whole squad (not Hidden, just out of sight); Blinded too', () => {
    const f = fightWith([{ perks: ['sixth_sense'] }, {}], [{ at: 'O10' }]);
    const cb = f.cb, me = f.pcs[0], foe = f.foe; me.pos = '2,5'; f.pcs[1].pos = '1,1'; f.pcs[1].ap = 6; foe.pos = '4,5'; wallBetween(cb, 3);
    expect(withGame(f.g, () => visibility(cb, 'pc').seen.has(foe.id))).toBe(true);
    me.conds = { ...(me.conds || {}), blinded: 2 }; me.vision = 1;
    expect(withGame(f.g, () => visibility(cb, 'pc').seen.has(foe.id))).toBe(true);
    // Seen is not a shot: the wall still stops it.
    const pv = withGame(f.g, () => previewAttack(cb, f.pcs[1], foe, 'shot'));
    expect(pv.ok).toBe(false); expect(pv.why).toMatch(/line of sight/);
    // Without the perk: fogged.
    const g = fightWith([{}], [{ at: 'O10' }]); g.pc.pos = '2,5'; g.foe.pos = '4,5'; wallBetween(g.cb, 3);
    expect(withGame(g.g, () => visibility(g.cb, 'pc').seen.has(g.foe.id))).toBe(false);
  });
  it('Skin Map: in the dark and in smoke within 6 tiles the holder sees and shoots; another squadmate can\'t target it', () => {
    const f = fightWith([{ perks: { skin_map: 'mastered' }, weapon: 'hellraiser_service_rifle' }, {}], [{ at: 'O10' }]);
    const cb = f.cb, me = f.pcs[0], mate = f.pcs[1], foe = f.foe; me.pos = '2,5'; mate.pos = '2,6'; foe.pos = '7,5'; foe.hidden = true;
    // Hidden at 5 tiles: the holder's own shot sees it (the sight hook), the squadmate's doesn't.
    me.ap = 6; mate.ap = 6; const mine = withGame(f.g, () => previewAttack(cb, me, foe, 'shot')), theirs = withGame(f.g, () => previewAttack(cb, mate, foe, 'shot'));
    expect(mine.ok).toBe(true); expect(theirs.ok).toBe(false);
    // Through it all, the reducer's attack.
    f.turn(me); f.act({ type: 'combat/attack', unitId: me.id, targetId: foe.id, mode: 'shot' });
    expect(logHas(f.cb, /fires at|takes an aimed|shoots/)).toBe(true);
  });
});

describe('Got You in My Sight on the area map', () => {
  it('a token the holder saw moves out of sight: +2 AP next round; II marks the last-seen tile', () => {
    for (const tier of ['I', 'II']) {
      const s = storyWith([{ perks: { got_you_in_my_sight: tier } }]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
      const n = place(s, freeNear(s.g, at, 2));
      s.act({ type: 'narrator/turn', turn: { narration: 'They slip away.', npcs: [{ action: 'update', id: n.id, hidden: true }] } } as any);
      expect(storyHas(s.g, /slips out of .* sight/)).toBe(true);
      expect(apLeft(s.g, s.g.characters[c.id])).toBe(8);
      expect(!!s.g.story.lastSeen?.[n.id]).toBe(tier === 'II');
      // Once a round.
      s.act({ type: 'narrator/turn', turn: { narration: 'Again.', npcs: [{ action: 'update', id: n.id, hidden: false }] } } as any);
    }
    const s = storyWith([{}]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
    const n = place(s, freeNear(s.g, at, 2));
    s.act({ type: 'narrator/turn', turn: { narration: 'They slip away.', npcs: [{ action: 'update', id: n.id, hidden: true }] } } as any);
    expect(apLeft(s.g, s.g.characters[c.id])).toBe(6);
  });
});


describe('Talks Broke Down: the Narrator says whether the fight came from the talk', () => {
  const talkThenFight = (fromTalk: boolean | undefined, rounds = 0) => {
    const s = storyWith([{ perks: { talks_broke_down: 'I' } }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'Talk.', checks: [{ charId: c.id, skills: ['charisma'], tn: 8, stakes: 'Calm them', tags: ['dialogue'] }] } } as any);
    s.g.rng.state = rngFor(19).state; const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id }); s.act({ type: 'check/accept', checkId: ck.id } as any);
    for (let i = 0; i < rounds; i++) s.g.story.round++;
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', ...(fromTalk === undefined ? {} : { fromTalk }), enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    return s;
  };
  it('fromTalk false: an unrelated fight in the same scene gets nothing; true: a talk 3 rounds back still counts', () => {
    expect(logHas(talkThenFight(undefined).g.combat!, /Talks broke down/)).toBe(true);
    expect(logHas(talkThenFight(false).g.combat!, /Talks broke down/)).toBe(false);
    expect(logHas(talkThenFight(undefined, 3).g.combat!, /Talks broke down/)).toBe(false);
    expect(logHas(talkThenFight(true, 3).g.combat!, /Talks broke down/)).toBe(true);
  });
});

describe('story damage goes through the engine (Soulmate out of a fight)', () => {
  it('the Narrator\'s harm on a bondmate is shared by the Soulmate; a trap too', () => {
    const s = storyWith([{ perks: { soulmate: 'I' }, skills: { camaraderie: 9 } }, {}]); const [a, b] = s.chars;
    s.act({ type: 'story/perk', charId: a.id, id: 'soulmate', actionId: 'bond', choice: b.id } as any);
    const hpA = s.g.characters[a.id].hp, hpB = s.g.characters[b.id].hp;
    s.act({ type: 'narrator/turn', turn: { narration: 'The floor gives.', harm: [{ charId: b.id, amount: 50, why: 'a fall' }] } } as any);
    expect(hpB - s.g.characters[b.id].hp).toBe(40); expect(hpA - s.g.characters[a.id].hp).toBe(10);
    expect(storyHas(s.g, /Soulmate/)).toBe(true);
  });
  it('without an item, harm is plain HP loss and can Down a character', () => {
    const s = storyWith([{}]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'Fire.', harm: [{ charId: c.id, amount: 9999, type: 'fire', why: 'the blaze' }] } } as any);
    expect(s.g.characters[c.id].hp).toBe(0); expect(storyHas(s.g, /Downed/)).toBe(true);
  });
});

describe('Eyes in the Back: the cover tile counts (a miss by its margin hits it); a shield from every side', () => {
  it('I: adjacent half cover that doesn\'t face the shot becomes the cover tile; II: an adjacent ally too', () => {
    const f = fightWith([{ perks: { eyes_in_the_back: 'II' } }, {}], [{ at: 'O10', weapon: 'hellraiser_service_rifle' }]);
    const cb = f.cb, me = f.pcs[0], ally = f.pcs[1], foe = f.foe; me.pos = '5,5'; ally.pos = '5,6'; foe.pos = '10,5'; foe.ap = 6;
    cb.objects = [...(cb.objects || []).filter((o) => !['4,5', '4,6'].includes(o.pos))];
    cb.objects.push(makeObject('cv1', 'crate', '4,5'), makeObject('cv2', 'crate', '4,6'));
    const pv = withGame(f.g, () => previewAttack(cb, foe, me, 'shot')); expect(pv.coverTile).toBe('4,5'); expect(pv.cover).toBe(5);
    const pa = withGame(f.g, () => previewAttack(cb, foe, ally, 'shot')); expect(pa.coverTile).toBeTruthy();
    const g = fightWith([{ perks: { eyes_in_the_back: 'I' } }, {}], [{ at: 'O10' }]);
    g.pcs[0].pos = '5,5'; g.pcs[1].pos = '5,6'; g.foe.pos = '10,5'; g.foe.ap = 6;
    g.cb.objects = [...(g.cb.objects || []), makeObject('cv2', 'crate', '4,6')];
    expect(withGame(g.g, () => previewAttack(g.cb, g.foe, g.pcs[1], 'shot')).coverTile).toBeFalsy(); // Tier I: only you
  });
  it('a carried riot shield gives −5 from every side', () => {
    const f = fightWith([{ perks: { eyes_in_the_back: 'I' } }], [{ at: 'O10' }]);
    const c = f.g.characters[f.pc.charId!]; c.offHand = { id: 'riot_shield' } as any;
    f.pc.pos = '5,5'; f.foe.pos = '10,5'; f.foe.ap = 6; f.cb.objects = [];
    const pv = withGame(f.g, () => previewAttack(f.cb, f.foe, f.pc, 'shot'));
    expect(pv.terms!.some((t) => /shield \(Eyes in the Back/.test(t.label) && t.v === -5)).toBe(true);
  });
});
void (null as unknown as Unit);
