// @vitest-environment jsdom
// Faith 2.2 "the god shows up" on the screens (docs/design/faith-presence-spec.md section 2): the patron's portrait in the
// faith tab's header beside the Devotion meter (the story sheet and the fight's FAITH tab), small portraits on the pact,
// switch, grudge and apostasy cards (a grudge's greyed), round crops on the patron's voice-line cards, and the Witnessed
// chip's words.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, faithView, type Sheet } from '@engine';
import { faithPanel } from '../game/faithView';
import { faithTabVals, patronLineCard, faithEventOf, faithEventCard, FACE_BOX } from './faithTab';
import { patronLogCard, faithHeadVals } from './faithCombat';
import { witnessedWords, condChips } from './combat';
import { setDevotionXp, devotionThreshold } from '@engine';

const sheet = (name: string, belief: any): Sheet => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, belief } as any; };
function game(belief: any, faith = 5) {
  let g = newGame('FP1', { id: 'h', name: 'Host' }, 'fp');
  g = apply(g, { type: 'char/add', sheet: sheet('Wren', belief) }, 'h');
  const c = Object.values(g.characters)[0]; c.skills = { ...c.skills, faith };
  return { g, c };
}
/** A stand-in for a screen: its state and setState, enough for zoomer and the tab's values. */
const screen = () => { const sc: any = { state: {}, setState(p: any) { sc.state = { ...sc.state, ...p }; } }; return sc; };

describe('the patron on screen (Faith 2.2, spec 2.4-2.6)', () => {
  it('the faith tab header: your patron\'s portrait beside the Devotion meter, a click opens it large', () => {
    const { g, c } = game({ kind: 'faithful', patron: 'mother_ember' });
    const P = faithPanel(faithView(g, c.id))!;
    expect(P.patronId).toBe('mother_ember'); expect(P.portrait).toMatch(/\/assets\/patron-mother_ember\./); expect(P.portraitLarge).toMatch(/patron-mother_ember-lg/);
    const sc = screen(), v: any = faithTabVals(sc, g, c);
    expect(v.portrait.has).toBe(true); expect(v.noPortrait).toBe(false); expect(v.portrait.img).toBe(P.portrait);
    expect(v.portrait.style).toMatch(/width: 76px; height: 95px/); // 4:5, the painting's own shape
    v.portrait.zoom(); expect(sc.state.lb).toMatchObject({ img: P.portraitLarge, caption: P.title, kind: 'patron' });
    expect(v.headStyle).toMatch(/grid-template-columns: 76px minmax\(0, 1fr\)/);
  });
  it('an Atheist has no patron to show: the mark (the eye) stays', () => {
    const { g, c } = game({ kind: 'atheist' });
    const v: any = faithTabVals(screen(), g, c);
    expect(v.portrait.has).toBe(false); expect(v.noPortrait).toBe(true); expect(faithPanel(faithView(g, c.id))!.portrait).toBeNull();
  });
  it('a grudge\'s banner carries the patron who holds it, greyed', () => {
    const { g, c } = game({ kind: 'faithful', patron: 'mother_ember' });
    (c as any).grudge = { patron: 'old_overcast', until: 9, condition: 'dazed', rounds: 1, xp_mult: 0.5, text: 'The sky remembers.', carry: 0 };
    const P = faithPanel(faithView(g, c.id))!;
    expect(P.grudge!.patron).toBe('old_overcast'); expect(P.grudge!.face.src).toMatch(/patron-old_overcast/);
    const v: any = faithTabVals(screen(), g, c); expect(v.grudgeFace.src).toMatch(/patron-old_overcast/); expect(v.grudgeFace.imgStyle).toMatch(/width: 250%/); // Old Overcast's wider cut
  });
  it('voice-line cards: a small round crop of the patron\'s face instead of the mark, in the story and the combat log', () => {
    const s: any = patronLineCard({ kind: 'system', head: 'MOTHER EMBER', text: '"There you are, love."' });
    expect(s.patronFace).toMatch(/patron-mother_ember/); expect(s.patronFaceStyle).toMatch(/position: absolute/); expect(s.patronFaceBox).toMatch(/border-radius: 50%/); expect(s.patronFaceBox).toMatch(/overflow: hidden/);
    expect(s.patronId).toBe('mother_ember'); expect(s.patronText).toBe('There you are, love.');
    const l: any = patronLogCard('The Laughing Mask: "Oh, do it again!"');
    expect(l.face).toMatch(/patron-the_laughing_mask/); expect(l.faceBox).toMatch(/border-radius: 50%/); expect(l.patron).toBe('the_laughing_mask');
    expect(l.mark).toBeTruthy(); // the mark is still there for anything that wants it
  });
  it('pact, switch, grudge and apostasy cards: which patron, and a small portrait beside the words', () => {
    expect(faithEventOf({ kind: 'system', head: 'PACT · MOTHER EMBER', text: 'Wren makes a pact with Mother Ember (…).' })).toEqual({ kind: 'pact', patron: 'mother_ember' });
    expect(faithEventOf({ kind: 'check', ok: true, head: 'LEAVING · OLD OVERCAST · d20 14 +2 = 16 vs 11 · LET GO', text: 'Wren leaves Old Overcast for Mother Ember: Old Overcast lets them go.' })).toEqual({ kind: 'leave', patron: 'old_overcast' });
    expect(faithEventOf({ kind: 'system', head: 'LEAVING · THE LAUGHING MASK · A GRUDGE', text: '…' })).toEqual({ kind: 'leave', patron: 'the_laughing_mask' });
    expect(faithEventOf({ kind: 'system', head: 'GRUDGE · OLD OVERCAST', text: 'The sky remembers.' })).toEqual({ kind: 'grudge', patron: 'old_overcast' });
    expect(faithEventOf({ kind: 'system', head: 'APOSTASY', text: 'Wren leaves the pact with The Counting Weaver: Devotion 0, an Atheist now; …' })).toEqual({ kind: 'apostasy', patron: 'counting_weaver' });
    for (const e of [{ kind: 'system', head: 'RITE · HEARTH', text: 'x' }, { kind: 'system', head: 'PACT · NOBODY', text: 'x' }, { kind: 'narration', head: 'PACT · MOTHER EMBER', text: 'x' }, { kind: 'system', head: 'MOTHER EMBER', text: '"x"' }, null])
      expect(faithEventOf(e)).toBeNull();
    const pact: any = faithEventCard({ kind: 'system', head: 'PACT · MOTHER EMBER', text: 'Wren makes a pact.' });
    expect(pact.faithFace).toMatch(/patron-mother_ember/); expect(pact.faithGrey).toBe('false'); expect(pact.faithFaceBox).not.toMatch(/grayscale/); expect(pact.faithHead).toBe('PACT · MOTHER EMBER');
    const gr: any = faithEventCard({ kind: 'system', head: 'GRUDGE · OLD OVERCAST', text: 'The sky remembers.' });
    expect(gr.faithGrey).toBe('true'); expect(gr.faithFaceBox).toMatch(/grayscale\(1\)/); expect(gr.faithStyle).toMatch(/border-left: 3px solid #F65157/); expect(gr.faithHead).toBe('✕ GRUDGE · OLD OVERCAST');
    const held: any = faithEventCard({ kind: 'system', head: 'LEAVING · THE LAUGHING MASK · A GRUDGE', text: '…' });
    expect(held.faithHeadStyle).toMatch(/#F65157/); expect(held.faithGrey).toBe('false'); // the switch card isn't the grudge's banner
  });
  it('the face box: square or round, edged in the accent; greyed for a grudge', () => {
    expect(FACE_BOX(32, '#F59A4C', true)).toMatch(/width: 32px; height: 32px; overflow: hidden; border-radius: 50%/);
    expect(FACE_BOX(40, '#F59A4C', false)).toMatch(/border-radius: 6px.*#F59A4C/);
    expect(FACE_BOX(40, '#F59A4C', false, true)).toMatch(/grayscale\(1\)/);
  });
  it('the fight\'s FAITH tab header: the portrait, Devotion and Witnessed in words (until the fight ends or the patron acts)', () => {
    let { g, c } = game({ kind: 'faithful', patron: 'old_overcast' });
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Raiders.', combat: { name: 'Crates', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists' }] } } } as any, 'h');
    const u = g.combat!.units.find((x: any) => x.charId === c.id)!;
    const zoomed: any[] = [], zoomer = (_sc: any, img: string, cap: string, kind: string) => () => zoomed.push({ img, cap, kind });
    let h: any = faithHeadVals(screen(), g, u, zoomer);
    expect(h.show).toBe(true); expect(h.patron).toBe('old_overcast'); expect(h.img).toMatch(/patron-old_overcast/); expect(h.devotionText).toMatch(/^DEVOTION 3/);
    expect(h.witnessed).toBe(false); expect(h.witnessedText).toMatch(/^NOT WITNESSED/);
    h.zoom(); expect(zoomed[0]).toMatchObject({ kind: 'patron', img: expect.stringMatching(/patron-old_overcast-lg/) });
    (u as any).conds = { ...(u as any).conds, witnessed: 99 };
    h = faithHeadVals(screen(), g, u, zoomer);
    expect(h.witnessed).toBe(true); expect(h.witnessedText).toBe('WITNESSED · UNTIL THE FIGHT ENDS OR OLD OVERCAST ACTS');
    expect(witnessedWords(u, g)).toBe('UNTIL THE FIGHT ENDS OR OLD OVERCAST ACTS'); // the condition chip: no "· 99"
    const foe = g.combat!.units.find((x: any) => x.side === 'foe')!;
    expect(faithHeadVals(screen(), g, foe, zoomer).show).toBe(false); expect(witnessedWords(foe, g)).toBe('UNTIL THE FIGHT ENDS OR THE PATRON ACTS');
  });
  it('the Witnessed chip: the faith light and the eye (a boon, not a harm), short, its how-long in the title; gone once the fight is over', () => {
    let { g, c } = game({ kind: 'faithful', patron: 'old_overcast' });
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Raiders.', combat: { name: 'Crates', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists' }] } } } as any, 'h');
    const u: any = g.combat!.units.find((x: any) => x.charId === c.id)!; u.conds = { witnessed: 99, shaken: 2 };
    const chips = condChips(u, g), w = chips.find((x: any) => x.key === 'c-witnessed')!, sh = chips.find((x: any) => x.key === 'c-shaken')!;
    expect(w.k).toBe('◉ WITNESSED'); expect(w.t).toBe('Witnessed: until the fight ends or Old Overcast acts.');
    expect(w.style).toMatch(/var\(--faith-light/); expect(w.style).not.toMatch(/#F65157/); expect(w.style).toMatch(/white-space: nowrap/);
    expect(sh.style).toMatch(/#F65157/); expect(sh.k).toMatch(/· 2$/); // a harmful one keeps the complication red and its rounds
    (g.combat as any).over = true;
    expect(condChips(u, g).some((x: any) => x.key === 'c-witnessed')).toBe(false);
  });
  it('Devotion 10: the header says FULL once (the Devotion line), not again at the bar\'s end', () => {
    const { g, c } = game({ kind: 'faithful', patron: 'nerukhan' }); setDevotionXp(c, devotionThreshold(10)); c.devotion = 10;
    const P = faithPanel(faithView(g, c.id))!;
    expect(P.devotionText).toMatch(/FULL$/); expect(P.xpNextText).toBe('');
    expect(((P.devotionText + ' ' + P.xpNextText).match(/FULL/g) || []).length).toBe(1);
  });
});
