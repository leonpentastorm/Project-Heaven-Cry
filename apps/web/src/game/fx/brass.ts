// What a weapon throws off as it works, drawn in SVG over the grid: the casing each shot ejects (with a faint wisp of
// smoke), the spent core an Evoker spits out when it takes a fresh one (in the lore it ejects its mana core like a
// casing), the magazine that drops to the ground on a reload, and the archer's draw (an arrow pulled from the quiver
// behind them and swung to the front before it is loosed). The portraits are upright, so all of it reads side-on: a
// casing flies up and back, falls to the floor of its tile, bounces and is gone; a magazine drops out from under the
// portrait and vanishes when it lands. Each piece starts behind its owner's portrait: it is clipped out where the
// portrait covers it, so it comes out from behind. Pure presentation: nothing here reads or changes the game.
import { reducedMotion } from '../sfx';
import { SIGIL_INK, SOUL_WARM } from '../glyphs';
import { layerEl, anim, after, slow, fxTempo, withTempo, trace } from './dom';

// ---------- what each weapon throws off ----------
/** The casing a weapon ejects: one per shot, or (revolvers, break-actions) all of them at the reload. */
export type Shell = 'pistol' | 'magnum' | 'rifle' | 'big_rifle' | 'linked_rifle' | 'hull' | 'censer_hull' | 'grenade_40' | 'etched' | 'charge';
/** What drops out on a reload. */
export type Mag = 'pistol_mag' | 'stick_mag' | 'curved_mag' | 'box_mag' | 'big_box' | 'drum' | 'belt_box' | 'shotgun_mag' | 'etched_mag' | 'bolt_box' | 'fuel_can';
/** The spent core an Evoker ejects, by what kind of Evoker it is. */
export type Core = 'evoker' | 'blade' | 'staff';
/** How a gun with no magazine takes its rounds: a pump gun's shells fed one by one, a break-action opened (its hulls
 *  kicked out) and two fresh ones dropped in, a revolver's cylinder emptied and refilled, a lever or bolt gun's rounds
 *  pushed in one by one. */
export type Load = 'pump' | 'break' | 'cylinder' | 'rounds';
export interface Brass { shell: Shell | null; when: 'shot' | 'reload' | null; mag: Mag | null; bow: 'bow' | 'crossbow' | null; load: Load | null; cycle: number }

/** What a weapon throws off (by its id, else its category). cycle: how long after the shot the casing comes out (a
 *  pump, a lever or a bolt is worked first; an automatic throws it at once). Bows and crossbows leave nothing; a bow
 *  draws an arrow from the quiver before each shot. Thrown weapons, rockets, the flamer's jet and melee eject nothing.
 *  Pure (tests). */
export function brassOf(id: string, cat: string): Brass {
  const B = (shell: Shell | null, when: 'shot' | 'reload' | null, mag: Mag | null = null, o: { bow?: Brass['bow']; load?: Load; cycle?: number } = {}): Brass =>
    ({ shell, when: shell ? when : null, mag, bow: o.bow || null, load: o.load || null, cycle: o.cycle || 0 });
  switch (id) {
    // revolvers keep their brass in the cylinder and dump it all when they reload
    case 'drifter_revolver': case 'magistrate_pistol': return B('pistol', 'reload', null, { load: 'cylinder' });
    case 'frontier_hand_cannon': return B('magnum', 'reload', null, { load: 'cylinder' });
    // break-actions (two barrels, a two-shot parlour gun): the hulls come out when the action opens to reload
    case 'coach_gun': case 'sawn_off': return B('hull', 'reload', null, { load: 'break' });
    case 'parlour_pistol': return B('pistol', 'reload', null, { load: 'break' });
    // worked by hand: the casing comes out as the lever, the bolt or the pump is worked after the shot
    case 'lever_carbine': return B('rifle', 'shot', null, { load: 'rounds', cycle: 170 });
    case 'long_rifle': return B('rifle', 'shot', null, { load: 'rounds', cycle: 260 });
    case 'lumeri_scattergun': return B('hull', 'shot', null, { load: 'pump', cycle: 210 });
    case 'smetanita_thumper': return B('grenade_40', 'shot', null, { load: 'rounds', cycle: 120 });
    case 'blackpoint_700': return B('big_rifle', 'shot', 'big_box');
    case 'hellraiser_lmg': return B('linked_rifle', 'shot', 'big_box');
    case 'hellraiser_rotary': return B('linked_rifle', 'shot', 'belt_box');
    case 'hellraiser_service_rifle': case 'legion_bullpup': return B('rifle', 'shot', 'curved_mag');
    case 'adamantile_battle_rifle': case 'ccec_marksman_rifle': return B('rifle', 'shot', 'box_mag');
    case 'mandestra_drum_gun': return B('pistol', 'shot', 'drum');
    case 'brigade_auto_shotgun': return B('hull', 'shot', 'shotgun_mag');
    // the tube keeps nothing to eject, but its reload is a rocket slid in by hand: the card shows the round going in
    // (when: null: no casing on a shot or a reload; before, the card was an empty box with a count)
    case 'breacher_tube': return B('grenade_40', null, null, { load: 'rounds' });
    case 'purifier_flamer': return B(null, null, 'fuel_can');
    // the enchanted guns: a sigil-etched casing, a blessed censer hull (pumped), a spent core charge
    case 'spellslinger_pistol': return B('etched', 'shot', 'etched_mag');
    case 'lumeri_censer_gun': return B('censer_hull', 'shot', null, { load: 'pump', cycle: 210 });
    case 'core_rifle': return B('charge', 'shot', null, { load: 'rounds', cycle: 120 });
    case 'crossbow': return B(null, null, null, { bow: 'crossbow' });
    case 'repeating_crossbow': return B(null, null, 'bolt_box', { bow: 'crossbow' });
    case 'recurve_bow': case 'longbow': return B(null, null, null, { bow: 'bow' });
  }
  switch (cat) {
    case 'pistol': return B('pistol', 'shot', 'pistol_mag');
    case 'revolver': return B('pistol', 'reload', null, { load: 'cylinder' });
    case 'smg': return B('pistol', 'shot', 'stick_mag');
    case 'rifle': return B('rifle', 'shot', 'curved_mag');
    case 'shotgun': return B('hull', 'shot', null, { load: 'pump', cycle: 210 });
    case 'heavy': return B('linked_rifle', 'shot', 'big_box');
    case 'bow': return B(null, null, null, { bow: /crossbow/.test(id) ? 'crossbow' : 'bow' });
  }
  return B(null, null);
}
/** The Evoker's core by the focus that holds it (the engine's core event names it). */
export const coreOf = (focus: string | null | undefined): Core => (focus === 'evoker_blade' ? 'blade' : focus === 'grand_staff' ? 'staff' : 'evoker');

// ---------- the pictures ----------
let uid = 0;
const NS = 'http://www.w3.org/2000/svg';
function pic(w: number, h: number, inner: (id: (n: string) => string) => string): SVGSVGElement {
  const n = ++uid, s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('width', '100%'); s.setAttribute('height', '100%'); s.style.overflow = 'visible'; s.style.display = 'block';
  s.innerHTML = inner((k) => 'phcb' + n + k);
  return s;
}
const lin = (id: string, stops: [number, string][], vertical = true) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="' + (vertical ? 1 : 0) + '">' + stops.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
const BRASS: [number, string][] = [[0, '#FBE7A1'], [0.35, '#E2B85A'], [0.75, '#B08530'], [1, '#7A5A1C']];
const STEEL: [number, string][] = [[0, '#7D8798'], [0.4, '#4A5262'], [1, '#232933']];

/** A casing, nose to the right, sized w × h in viewBox units (its box keeps the same ratio). */
interface Pic { w: number; h: number; el: () => SVGSVGElement; glow?: string; smoke: string }
const SMOKE = 'rgba(206,212,224,', SIGIL_SMOKE = 'rgba(139,222,238,', CENSER_SMOKE = 'rgba(226,190,255,';
function straightCase(w: number, h: number, extra = ''): () => SVGSVGElement {
  return () => pic(w, h, (id) => '<defs>' + lin(id('b'), BRASS) + '</defs>'
    + '<rect x="2.6" y="1" width="' + (w - 3.4) + '" height="' + (h - 2) + '" rx="0.9" fill="url(#' + id('b') + ')" stroke="#5E4413" stroke-width="0.45"/>'
    + '<rect x="3.4" y="1.4" width="0.9" height="' + (h - 2.8) + '" fill="#6E5118" opacity=".85"/>'
    + '<rect x="0.6" y="0.5" width="2.4" height="' + (h - 1) + '" rx="0.6" fill="#C79A3C" stroke="#5E4413" stroke-width="0.45"/>'
    + '<circle cx="1.8" cy="' + h / 2 + '" r="0.7" fill="#8E6A22"/>'
    + '<rect x="5" y="1.7" width="' + (w - 8) + '" height="1.1" rx="0.55" fill="#FFF6D2" opacity=".75"/>'
    + '<ellipse cx="' + (w - 0.9) + '" cy="' + h / 2 + '" rx="0.8" ry="' + (h / 2 - 1.3) + '" fill="#2B1E0A"/>' + extra);
}
function neckedCase(w: number, h: number, extra = ''): () => SVGSVGElement {
  const body = w * 0.66, sh = w * 0.76, nh = h * 0.26, m = h / 2;
  return () => pic(w, h, (id) => '<defs>' + lin(id('b'), BRASS) + '</defs>'
    + '<path d="M2.6 1 H' + body + ' L' + sh + ' ' + (m - nh) + ' H' + (w - 0.4) + ' V' + (m + nh) + ' H' + sh + ' L' + body + ' ' + (h - 1) + ' H2.6 Z" fill="url(#' + id('b') + ')" stroke="#5E4413" stroke-width="0.45" stroke-linejoin="round"/>'
    + '<rect x="3.4" y="1.4" width="1" height="' + (h - 2.8) + '" fill="#6E5118" opacity=".85"/>'
    + '<rect x="0.6" y="0.5" width="2.4" height="' + (h - 1) + '" rx="0.6" fill="#C79A3C" stroke="#5E4413" stroke-width="0.45"/>'
    + '<circle cx="1.8" cy="' + m + '" r="0.75" fill="#8E6A22"/>'
    + '<rect x="5" y="1.8" width="' + (body - 6) + '" height="1.1" rx="0.55" fill="#FFF6D2" opacity=".75"/>'
    + '<ellipse cx="' + (w - 0.5) + '" cy="' + m + '" rx="0.5" ry="' + (nh - 0.4) + '" fill="#2B1E0A"/>' + extra);
}
function hull(body: [number, string][], head: [number, string][], mark = ''): () => SVGSVGElement {
  return () => pic(26, 10, (id) => '<defs>' + lin(id('p'), body) + lin(id('h'), head) + '</defs>'
    + '<rect x="6.5" y="1.2" width="18.6" height="7.6" rx="0.8" fill="url(#' + id('p') + ')" stroke="#2A0A0C" stroke-width="0.45"/>'
    + '<rect x="8" y="2" width="15.5" height="1.2" rx="0.6" fill="#FFFFFF" opacity=".28"/>'
    + '<path d="M24.6 2.2 L25.6 5 L24.6 7.8" fill="none" stroke="#2A0A0C" stroke-width="0.6" opacity=".7"/>'
    + '<rect x="0.6" y="0.4" width="7" height="9.2" rx="0.7" fill="url(#' + id('h') + ')" stroke="#5E4413" stroke-width="0.45"/>'
    + '<rect x="2.8" y="0.9" width="0.7" height="8.2" fill="#6E5118" opacity=".7"/>'
    + '<circle cx="1.7" cy="5" r="0.9" fill="#8E6A22"/>' + mark);
}
const SHELLS: Record<Shell, Pic> = {
  pistol: { w: 16, h: 7, el: straightCase(16, 7), smoke: SMOKE },
  magnum: { w: 20, h: 8.5, el: straightCase(20, 8.5), smoke: SMOKE },
  rifle: { w: 28, h: 7.5, el: neckedCase(28, 7.5), smoke: SMOKE },
  big_rifle: { w: 36, h: 10, el: neckedCase(36, 10), smoke: SMOKE },
  linked_rifle: { w: 28, h: 7.5, el: neckedCase(28, 7.5), smoke: SMOKE },
  hull: { w: 26, h: 10, el: hull([[0, '#E0545B'], [0.45, '#B3262D'], [1, '#5C1015']], BRASS), smoke: SMOKE },
  censer_hull: { w: 26, h: 10, glow: SOUL_WARM, smoke: CENSER_SMOKE,
    el: hull([[0, '#FFF8EA'], [0.5, '#E8DCC2'], [1, '#A99A7C']], [[0, '#FFF0C0'], [0.5, '#D9B45A'], [1, '#8C6A25']], '<path d="M11 5 h9 M13.5 3.2 L15.5 6.8 L17.5 3.2" fill="none" stroke="' + SOUL_WARM + '" stroke-width="0.7" stroke-linecap="round"/>') },
  grenade_40: { w: 18, h: 15, smoke: SMOKE,
    el: () => pic(18, 15, (id) => '<defs>' + lin(id('a'), [[0, '#E8ECF3'], [0.45, '#AEB6C4'], [1, '#5D6574']]) + '</defs>'
      + '<rect x="3" y="1.2" width="14.4" height="12.6" rx="1" fill="url(#' + id('a') + ')" stroke="#30363F" stroke-width="0.5"/>'
      + '<rect x="0.6" y="0.4" width="3.4" height="14.2" rx="0.8" fill="#8D96A6" stroke="#30363F" stroke-width="0.5"/>'
      + '<rect x="5" y="2.4" width="10.5" height="1.4" rx="0.7" fill="#FFFFFF" opacity=".55"/>'
      + '<ellipse cx="16.9" cy="7.5" rx="0.9" ry="5.2" fill="#1E2229"/>'
      + '<rect x="7" y="6.6" width="5" height="1.8" fill="#F2A54A" opacity=".85"/>') },
  etched: { w: 16, h: 7, glow: SIGIL_INK, smoke: SIGIL_SMOKE,
    el: straightCase(16, 7, '<path d="M6 3.5 h6 M7.5 2.2 L9 4.8 L10.5 2.2" fill="none" stroke="' + SIGIL_INK + '" stroke-width="0.7" stroke-linecap="round"/>') },
  charge: { w: 20, h: 9, glow: SIGIL_INK, smoke: SIGIL_SMOKE,
    el: () => pic(20, 9, (id) => '<defs>' + lin(id('g'), [[0, 'rgba(200,245,255,.95)'], [0.5, 'rgba(90,190,215,.75)'], [1, 'rgba(30,80,100,.9)']]) + '</defs>'
      + '<rect x="3.2" y="1.2" width="13.6" height="6.6" rx="1.4" fill="url(#' + id('g') + ')" stroke="#2B5866" stroke-width="0.45"/>'
      + '<rect x="5" y="3.8" width="10" height="1.4" rx="0.7" fill="' + SIGIL_INK + '" class="phc-ember"/>'
      + '<rect x="0.6" y="0.6" width="3.2" height="7.8" rx="0.7" fill="#6B7486" stroke="#2A3040" stroke-width="0.45"/>'
      + '<rect x="16.2" y="0.6" width="3.2" height="7.8" rx="0.7" fill="#6B7486" stroke="#2A3040" stroke-width="0.45"/>') },
};
/** A belt link, thrown with every linked round. */
const LINK: Pic = { w: 9, h: 7, smoke: SMOKE, el: () => pic(9, 7, () => '<path d="M1 1.2 H6.4 A2.3 2.3 0 0 1 6.4 5.8 H1" fill="none" stroke="#3A4150" stroke-width="1.5" stroke-linecap="round"/><path d="M1.6 1.2 H5.8" stroke="#8D96A6" stroke-width=".5"/>') };

const CORES: Record<Core, Pic> = {
  // the Evoker's own hexagonal core: spent, its light all but out
  evoker: { w: 24, h: 15, glow: SIGIL_INK, smoke: SIGIL_SMOKE,
    el: () => pic(24, 15, (id) => '<defs>' + lin(id('c'), [[0, '#9FD3DE'], [0.45, '#4C8C9B'], [1, '#1D3C46']]) + '</defs>'
      + '<path d="M1 7.5 L5.6 1 H18.4 L23 7.5 L18.4 14 H5.6 Z" fill="url(#' + id('c') + ')" stroke="#163039" stroke-width="0.6" stroke-linejoin="round"/>'
      + '<path d="M5.6 1 L8.6 7.5 L5.6 14 M18.4 1 L15.4 7.5 L18.4 14 M8.6 7.5 H15.4" fill="none" stroke="#D8F6FF" stroke-width="0.5" opacity=".55"/>'
      + '<ellipse cx="12" cy="7.5" rx="3.4" ry="2.2" fill="' + SIGIL_INK + '" class="phc-ember"/>'
      + '<path d="M6.5 2.4 H17" stroke="#FFFFFF" stroke-width="0.8" opacity=".6"/>') },
  // the Evoker blade's core: a slim shard thrown from the pommel
  blade: { w: 22, h: 8, glow: SIGIL_INK, smoke: SIGIL_SMOKE,
    el: () => pic(22, 8, (id) => '<defs>' + lin(id('c'), [[0, '#B8E8F2'], [0.5, '#4C8C9B'], [1, '#1D3C46']]) + '</defs>'
      + '<path d="M0.8 4 L6 0.7 L21.2 4 L6 7.3 Z" fill="url(#' + id('c') + ')" stroke="#163039" stroke-width="0.5" stroke-linejoin="round"/>'
      + '<path d="M6 0.7 L8 4 L6 7.3 M8 4 H20" fill="none" stroke="#D8F6FF" stroke-width="0.45" opacity=".6"/>'
      + '<ellipse cx="10" cy="4" rx="3" ry="1.2" fill="' + SIGIL_INK + '" class="phc-ember"/>') },
  // the grand staff's core: an orb in a brass cage
  staff: { w: 20, h: 20, glow: SIGIL_INK, smoke: SIGIL_SMOKE,
    el: () => pic(20, 20, (id) => '<defs><radialGradient id="' + id('o') + '" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#E4FBFF"/><stop offset=".35" stop-color="#6FB8C8"/><stop offset="1" stop-color="#16323B"/></radialGradient>' + lin(id('b'), BRASS) + '</defs>'
      + '<circle cx="10" cy="10" r="7.4" fill="url(#' + id('o') + ')" stroke="#163039" stroke-width="0.6"/>'
      + '<circle cx="10" cy="10" r="3" fill="' + SIGIL_INK + '" class="phc-ember"/>'
      + '<ellipse cx="10" cy="10" rx="9.3" ry="3" fill="none" stroke="url(#' + id('b') + ')" stroke-width="1.4"/>'
      + '<path d="M10 0.8 V3 M10 17 V19.2" stroke="#B08530" stroke-width="1.4" stroke-linecap="round"/>') },
};

/** Magazines and the like, upright (feed lips up), w × h in viewBox units. */
const MAGS: Record<Mag, Pic> = {
  pistol_mag: { w: 10, h: 22, smoke: SMOKE, el: () => pic(10, 22, (id) => '<defs>' + lin(id('s'), STEEL, false) + '</defs>'
    + '<path d="M2.4 1.6 H8.2 L7.6 19.4 H1.8 Z" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M2.4 1.6 L3.4 0.6 H7.4 L8.2 1.6" fill="none" stroke="#9AA3B2" stroke-width="0.6"/>'
    + '<circle cx="5" cy="6" r="0.7" fill="#0E1116"/><circle cx="4.9" cy="10" r="0.7" fill="#0E1116"/><circle cx="4.8" cy="14" r="0.7" fill="#0E1116"/>'
    + '<rect x="0.8" y="19.2" width="7.9" height="2.4" rx="0.8" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>'
    + '<path d="M3 2.6 V18" stroke="#B4BCC8" stroke-width="0.5" opacity=".5"/>') },
  stick_mag: { w: 10, h: 30, smoke: SMOKE, el: () => pic(10, 30, (id) => '<defs>' + lin(id('s'), STEEL, false) + '</defs>'
    + '<rect x="2" y="1.4" width="6.4" height="26" rx="0.6" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5"/>'
    + '<path d="M2 1.4 L3 0.4 H7.4 L8.4 1.4" fill="none" stroke="#9AA3B2" stroke-width="0.6"/>'
    + '<path d="M3.2 4 V25" stroke="#B4BCC8" stroke-width="0.5" opacity=".5"/><path d="M2.6 9 H7.8 M2.6 17 H7.8" stroke="#14181F" stroke-width="0.5" opacity=".7"/>'
    + '<rect x="1.2" y="27" width="8" height="2.6" rx="0.8" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>') },
  curved_mag: { w: 16, h: 28, smoke: SMOKE, el: () => pic(16, 28, (id) => '<defs>' + lin(id('s'), STEEL, false) + '</defs>'
    + '<path d="M2 1.4 H9.4 Q10.6 14 14.6 25 L7.6 27.2 Q3.2 15 2 1.4 Z" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M2 1.4 L3 0.4 H8.4 L9.4 1.4" fill="none" stroke="#9AA3B2" stroke-width="0.6"/>'
    + '<path d="M3.6 4 Q4.6 14 8.8 24.4" fill="none" stroke="#B4BCC8" stroke-width="0.5" opacity=".5"/>'
    + '<path d="M3 9 L9.9 8.6 M4.4 16.6 L11.6 15.6" stroke="#14181F" stroke-width="0.5" opacity=".7"/>'
    + '<path d="M7.2 27.4 L15 24.8" stroke="#2F3541" stroke-width="2.2" stroke-linecap="round"/>') },
  box_mag: { w: 12, h: 22, smoke: SMOKE, el: () => pic(12, 22, (id) => '<defs>' + lin(id('s'), [[0, '#6E7566'], [0.4, '#454B3F'], [1, '#22261E']], false) + '</defs>'
    + '<path d="M2 1.4 H10 L10.6 19.6 H1.6 Z" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M2 1.4 L3 0.4 H9 L10 1.4" fill="none" stroke="#9AA3B2" stroke-width="0.6"/>'
    + '<path d="M3 4 V18" stroke="#B4BCC8" stroke-width="0.5" opacity=".45"/><path d="M2.4 7 H10.2 M2.2 13 H10.4" stroke="#14181F" stroke-width="0.5" opacity=".7"/>'
    + '<rect x="0.8" y="19.4" width="10.6" height="2.3" rx="0.8" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>') },
  big_box: { w: 24, h: 18, smoke: SMOKE, el: () => pic(24, 18, (id) => '<defs>' + lin(id('s'), [[0, '#6E7566'], [0.4, '#4A5143'], [1, '#22261E']], false) + '</defs>'
    + '<rect x="1" y="2" width="22" height="15" rx="1.2" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.6"/>'
    + '<rect x="5" y="0.6" width="6" height="2.4" rx="0.6" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>'
    + '<path d="M3 5 H21" stroke="#B4BCC8" stroke-width="0.6" opacity=".45"/><rect x="8" y="8.5" width="8" height="4" rx="0.5" fill="#D6C9A0" opacity=".8"/>'
    + '<path d="M9 10.5 H15" stroke="#22261E" stroke-width="0.6"/>') },
  drum: { w: 22, h: 22, smoke: SMOKE, el: () => pic(22, 22, (id) => '<defs><radialGradient id="' + id('d') + '" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#8D96A6"/><stop offset=".55" stop-color="#454C5A"/><stop offset="1" stop-color="#1A1F27"/></radialGradient></defs>'
    + '<rect x="8" y="0.6" width="6" height="5" rx="0.6" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>'
    + '<circle cx="11" cy="12.6" r="8.8" fill="url(#' + id('d') + ')" stroke="#14181F" stroke-width="0.6"/>'
    + '<circle cx="11" cy="12.6" r="5.4" fill="none" stroke="#14181F" stroke-width="0.6" opacity=".7"/>'
    + '<circle cx="11" cy="12.6" r="2" fill="#9AA3B2"/><path d="M11 12.6 L15.6 9" stroke="#C3C9D4" stroke-width="0.9" stroke-linecap="round"/>') },
  belt_box: { w: 24, h: 18, smoke: SMOKE, el: () => pic(24, 18, (id) => '<defs>' + lin(id('s'), [[0, '#6E7566'], [0.4, '#4A5143'], [1, '#22261E']], false) + '</defs>'
    + '<rect x="1" y="3" width="22" height="14" rx="1" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.6"/>'
    + '<path d="M7 3 Q12 -1.2 17 3" fill="none" stroke="#2F3541" stroke-width="1.6"/>'
    + '<path d="M2.4 6 H21.6" stroke="#B4BCC8" stroke-width="0.6" opacity=".45"/>'
    + '<path d="M19 3 v-1.6 M20.6 3 v-1.6" stroke="#B08530" stroke-width="1" stroke-linecap="round"/>'
    + '<rect x="6" y="9" width="12" height="4" rx="0.5" fill="#D6C9A0" opacity=".8"/>') },
  shotgun_mag: { w: 14, h: 24, smoke: SMOKE, el: () => pic(14, 24, (id) => '<defs>' + lin(id('s'), STEEL, false) + '</defs>'
    + '<path d="M2 1.6 H12 L12.6 21.4 H1.4 Z" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<rect x="3" y="0.4" width="8" height="2.2" rx="1.1" fill="#B3262D"/>'
    + '<path d="M2.6 8 H11.6 M2.4 14 H11.8" stroke="#14181F" stroke-width="0.5" opacity=".7"/>'
    + '<rect x="0.8" y="21.2" width="12.4" height="2.4" rx="0.8" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>') },
  etched_mag: { w: 10, h: 22, glow: SIGIL_INK, smoke: SIGIL_SMOKE, el: () => pic(10, 22, (id) => '<defs>' + lin(id('s'), STEEL, false) + '</defs>'
    + '<path d="M2.4 1.6 H8.2 L7.6 19.4 H1.8 Z" fill="url(#' + id('s') + ')" stroke="#14181F" stroke-width="0.5" stroke-linejoin="round"/>'
    + '<path d="M2.4 1.6 L3.4 0.6 H7.4 L8.2 1.6" fill="none" stroke="#9AA3B2" stroke-width="0.6"/>'
    + '<path d="M5 4 V16 M3.2 7 L5 9.5 L6.8 7 M3.2 13 H6.8" fill="none" stroke="' + SIGIL_INK + '" stroke-width="0.7" stroke-linecap="round"/>'
    + '<rect x="0.8" y="19.2" width="7.9" height="2.4" rx="0.8" fill="#2F3541" stroke="#14181F" stroke-width="0.5"/>') },
  bolt_box: { w: 12, h: 24, smoke: SMOKE, el: () => pic(12, 24, (id) => '<defs>' + lin(id('w'), [[0, '#B98A55'], [0.5, '#8A5E31'], [1, '#4E3218']], false) + '</defs>'
    + '<rect x="1.4" y="3" width="9.2" height="20" rx="0.8" fill="url(#' + id('w') + ')" stroke="#2A1A0B" stroke-width="0.5"/>'
    + '<path d="M3.2 3 V0.8 M6 3 V0.6 M8.8 3 V0.8" stroke="#C9B79C" stroke-width="0.9" stroke-linecap="round"/>'
    + '<path d="M2.4 9 H9.6 M2.4 16 H9.6" stroke="#3A2410" stroke-width="0.5" opacity=".8"/><rect x="1.4" y="20.6" width="9.2" height="2.4" fill="#5D6574"/>') },
  fuel_can: { w: 14, h: 26, smoke: SMOKE, el: () => pic(14, 26, (id) => '<defs>' + lin(id('f'), [[0, '#E0545B'], [0.45, '#A8232A'], [1, '#4E0E12']], false) + '</defs>'
    + '<rect x="1.2" y="4" width="11.6" height="21" rx="3" fill="url(#' + id('f') + ')" stroke="#2A0A0C" stroke-width="0.6"/>'
    + '<rect x="4.4" y="0.6" width="5.2" height="4" rx="0.8" fill="#5D6574" stroke="#2A3040" stroke-width="0.5"/>'
    + '<path d="M1.6 10 H12.4 M1.6 19 H12.4" stroke="#2A0A0C" stroke-width="0.6" opacity=".7"/><path d="M3.2 6 V23" stroke="#FFFFFF" stroke-width="0.8" opacity=".3"/>'
    + '<path d="M5 13.4 L7 16.6 L9 13.4" fill="none" stroke="#F2A54A" stroke-width="0.8"/>') },
};

/** The arrow (or a crossbow's bolt): nock at the left, head at the right, 60 × 10. */
function arrowPic(bolt = false): SVGSVGElement {
  return pic(60, 10, (id) => '<defs>' + lin(id('h'), [[0, '#F4F7FB'], [0.5, '#B9C1CE'], [1, '#6B7486']]) + lin(id('s'), [[0, '#E3D2B4'], [0.5, '#B59B74'], [1, '#7F6A4C']]) + '</defs>'
    + (bolt ? '<rect x="9" y="3.6" width="40" height="2.8" rx="1.2" fill="#8A5E31" stroke="#3A2410" stroke-width="0.4"/><path d="M10 5 L2 0.8 L5 5 L2 9.2 Z" fill="#D6C9A0" stroke="#4E3218" stroke-width="0.5"/>'
      : '<rect x="3" y="4" width="49" height="2" rx="1" fill="url(#' + id('s') + ')" stroke="#4E3E28" stroke-width="0.3"/><path d="M3.4 5 L0.6 3.4 M3.4 5 L0.6 6.6" stroke="#7F6A4C" stroke-width="0.9" stroke-linecap="round"/>'
        + '<path d="M3.6 4.3 L15 4.3 L11 0.4 L5 0.4 Z" fill="#E7EBF3" stroke="#6B5A40" stroke-width="0.4"/><path d="M3.6 5.7 L15 5.7 L11 9.6 L5 9.6 Z" fill="#D36A90" stroke="#6B5A40" stroke-width="0.4"/>')
    + '<path d="M' + (bolt ? 47 : 50) + ' 1 L59.6 5 L' + (bolt ? 47 : 50) + ' 9 L' + (bolt ? 49.6 : 52.6) + ' 5 Z" fill="url(#' + id('h') + ')" stroke="#2A3040" stroke-width="0.5" stroke-linejoin="round"/>');
}

/** A fresh round, for the loading: the casing with its bullet (or a hull, a grenade, a charge as they are). */
function fresh(shell: Shell): Pic {
  const P = SHELLS[shell], nose = shell === 'rifle' || shell === 'big_rifle' || shell === 'linked_rifle' ? P.w * 0.3 : shell === 'pistol' || shell === 'magnum' || shell === 'etched' ? P.w * 0.28 : shell === 'grenade_40' ? 7 : 0;
  if (!nose) return P;
  const W = P.w + nose, m = P.h / 2, nh = shell === 'grenade_40' ? m - 1 : shell === 'pistol' || shell === 'magnum' || shell === 'etched' ? m - 1.1 : P.h * 0.24;
  const tip = shell === 'grenade_40' ? 'M' + (P.w - 1) + ' ' + (m - nh) + ' Q' + (W + 1) + ' ' + m + ' ' + (P.w - 1) + ' ' + (m + nh) + ' Z'
    : shell === 'rifle' || shell === 'big_rifle' || shell === 'linked_rifle' ? 'M' + (P.w - 0.8) + ' ' + (m - nh) + ' H' + (P.w + nose * 0.3) + ' Q' + (W - nose * 0.15) + ' ' + (m - nh * 0.4) + ' ' + W + ' ' + m + ' Q' + (W - nose * 0.15) + ' ' + (m + nh * 0.4) + ' ' + (P.w + nose * 0.3) + ' ' + (m + nh) + ' H' + (P.w - 0.8) + ' Z'
      : 'M' + (P.w - 1) + ' ' + (m - nh) + ' H' + (P.w + nose * 0.25) + ' Q' + W + ' ' + (m - nh * 0.3) + ' ' + W + ' ' + m + ' Q' + W + ' ' + (m + nh * 0.3) + ' ' + (P.w + nose * 0.25) + ' ' + (m + nh) + ' H' + (P.w - 1) + ' Z';
  const col: [number, string][] = shell === 'grenade_40' ? [[0, '#C9C08A'], [0.5, '#8E8A55'], [1, '#4E4C2C']] : [[0, '#F2B48A'], [0.45, '#C8724A'], [1, '#7A3C22']];
  return { w: W, h: P.h, smoke: P.smoke, glow: P.glow, el: () => pic(W, P.h, (id) => '<defs>' + lin(id('n'), col) + '</defs><path d="' + tip + '" fill="url(#' + id('n') + ')" stroke="#4A2412" stroke-width="0.45"/><svg x="0" y="0" width="' + P.w + '" height="' + P.h + '" viewBox="0 0 ' + P.w + ' ' + P.h + '" overflow="visible">' + P.el().innerHTML + '</svg>') };
}

/** The pictures, for the reload card (fx/reload.ts): a magazine (upright), a fresh round (nose right), an arrow or bolt. */
export const magPicture = (m: Mag) => { const P = MAGS[m]; return { w: P.w, h: P.h, glow: P.glow, el: P.el }; };
export const roundPicture = (s: Shell) => { const P = fresh(s); return { w: P.w, h: P.h, glow: P.glow, el: P.el }; };
export const arrowPicture = (bolt = false) => arrowPic(bolt);

// ---------- behind the portrait ----------
/** A portrait on screen: its centre and size, its shape, and the frame ring drawn round it (its box-shadow spread). */
export interface Who { x: number; y: number; w: number; h: number; round: boolean; ring: number }
/** Where a token (a portrait) is on screen now. */
export function whoOf(tok: HTMLElement | null): Who | null {
  if (!tok) return null;
  const r = tok.getBoundingClientRect(); if (!r.width || !r.height) return null;
  const br = (tok.getAttribute('style') || '') + ' ' + (tok.style?.borderRadius || '');
  // the white ring round a squad member's portrait is a box-shadow spread: the hole covers it too
  let ring = 0;
  try { const m = /(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)px/.exec(getComputedStyle(tok).boxShadow || tok.style?.boxShadow || (/box-shadow:\s*([^;]+)/.exec(tok.getAttribute('style') || '') || [])[1] || ''); if (m) ring = Math.max(0, Math.min(8, Number(m[4]) || 0)); } catch { /* */ }
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, round: /border-radius:\s*50%/.test(br), ring };
}
/** A box round the portrait (big enough for everything thrown from it) with the portrait cut out of it (hidden): what
 *  goes in it is hidden where the portrait covers it, so it seems to come out from behind. Open (hidden false): no
 *  cut, for smoke (soft smoke cut by the portrait's outline would draw a hard halo round it). One box per portrait is
 *  shared while it has pieces (a burst is one clip mask, not one per casing); share false gives a box of its own (the
 *  draw lifts its clip). A browser without clip-path paths shows it all in front. Pieces are placed in viewport
 *  coordinates through org(). */
const SHARED = new Map<string, { box: HTMLElement; until: number }>();
function behind(who: Who, ms: number, hidden = true, share = true): HTMLElement | null {
  const L = layerEl(); if (!L) return null;
  const key = share ? (hidden ? 'h' : 'o') + Math.round(who.x) + ',' + Math.round(who.y) + ',' + Math.round(who.w) : '';
  // In an action slowed after a spotlight cut-in (decision 113) every piece's animation runs at the tempo (dom.ts anim),
  // so every timer here does too: the box, the removals, the drop's dust and the draw's clip all stay in step.
  ms = slow(ms);
  const now = Date.now();
  if (key) {
    const had = SHARED.get(key);
    if (had && had.box.isConnected && had.box.parentElement === L) { had.until = Math.max(had.until, now + ms); return had.box; }
  }
  const half = Math.max(who.w, who.h) * 3.6, ox = who.x - half, oy = who.y - half, S = half * 2;
  const box = document.createElement('div');
  box.setAttribute('data-fx', hidden ? 'brass' : 'brass-air');
  box.style.cssText = 'position:absolute;left:' + ox + 'px;top:' + oy + 'px;width:' + S + 'px;height:' + S + 'px;pointer-events:none;overflow:visible';
  (box as any)._o = { x: ox, y: oy };
  if (hidden) box.style.clipPath = holePath(who, ox, oy, S);
  L.appendChild(box);
  if (!key) { setTimeout(() => box.remove(), ms + 80); return box; }
  const rec = { box, until: now + ms };
  SHARED.set(key, rec);
  const sweep = () => { const left = rec.until - Date.now(); if (left > 0) { setTimeout(sweep, left + 80); return; } box.remove(); if (SHARED.get(key) === rec) SHARED.delete(key); };
  setTimeout(sweep, ms + 80);
  return box;
}
/** Where a box sits on the page (its pieces are placed relative to it). */
const org = (box: HTMLElement): { x: number; y: number } => (box as any)._o || { x: 0, y: 0 };
function holePath(who: Who, ox: number, oy: number, S: number): string {
  const rx = who.w / 2 + who.ring, ry = who.h / 2 + who.ring, cx = who.x - ox, cy = who.y - oy, l = cx - rx, t = cy - ry, W = rx * 2, H = ry * 2, r = who.round ? 0 : Math.min(4 + who.ring, rx);
  const outer = 'M0 0 H' + S + ' V' + S + ' H0 Z ';
  const hole = who.round ? 'M' + l + ' ' + cy + ' A' + rx + ' ' + ry + ' 0 1 0 ' + (l + W) + ' ' + cy + ' A' + rx + ' ' + ry + ' 0 1 0 ' + l + ' ' + cy + ' Z'
    : 'M' + (l + r) + ' ' + t + ' H' + (l + W - r) + ' Q' + (l + W) + ' ' + t + ' ' + (l + W) + ' ' + (t + r) + ' V' + (t + H - r) + ' Q' + (l + W) + ' ' + (t + H) + ' ' + (l + W - r) + ' ' + (t + H) + ' H' + (l + r) + ' Q' + l + ' ' + (t + H) + ' ' + l + ' ' + (t + H - r) + ' V' + (t + r) + ' Q' + l + ' ' + t + ' ' + (l + r) + ' ' + t + ' Z';
  return 'path(evenodd, "' + outer + hole + '")';
}
/** A node in a box at a viewport point (its centre), w × h px. */
function piece(parent: HTMLElement, el: Element, x: number, y: number, w: number, h: number, glow?: string, tag?: string): HTMLElement {
  const d = document.createElement('div'), o = org(parent);
  d.style.cssText = 'position:absolute;left:' + (x - o.x - w / 2) + 'px;top:' + (y - o.y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;will-change:transform,opacity'
    + (glow ? ';filter:drop-shadow(0 0 ' + Math.max(1.5, w * 0.12).toFixed(1) + 'px ' + glow + ')' : ';filter:drop-shadow(0 1px 0.6px rgba(0,0,0,.65))');
  if (tag) d.setAttribute('data-fx-piece', tag);
  d.appendChild(el); parent.appendChild(d);
  setTimeout(() => d.remove(), slow(6000)); // a shared box outlives its pieces: none of them stays
  return d;
}

// ---------- smoke ----------
/** A faint wisp: a soft puff that swells, drifts up (and a little along dx) and thins out. */
function wisp(parent: HTMLElement, x: number, y: number, size: number, tint: string, o: { ms?: number; delay?: number; drift?: number; dy?: number; rise?: number; alpha?: number } = {}) {
  const ms = o.ms ?? 1100, a = o.alpha ?? 0.5;
  const run = () => {
    const d = document.createElement('div'), at = org(parent);
    d.style.cssText = 'position:absolute;left:' + (x - at.x - size / 2) + 'px;top:' + (y - at.y - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px;border-radius:50%;'
      + 'background:radial-gradient(circle at 50% 55%,' + tint + a + ') 0%,' + tint + (a * 0.45).toFixed(3) + ') 42%,' + tint + '0) 72%);filter:blur(' + Math.max(1, size * 0.08).toFixed(1) + 'px);will-change:transform,opacity';
    parent.appendChild(d);
    const dx = o.drift ?? 0, dy = o.dy ?? 0, rise = o.rise ?? size * 1.2;
    anim(d, [{ transform: 'translate(0,0) scale(.35)', opacity: 0 }, { transform: 'translate(' + dx * 0.3 + 'px,' + (dy * 0.3 - rise * 0.25) + 'px) scale(.8)', opacity: 1, offset: 0.18 },
      { transform: 'translate(' + dx + 'px,' + (dy - rise) + 'px) scale(1.7)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.6,.35,1)', fill: 'forwards' });
    setTimeout(() => d.remove(), slow(ms) + 40);
  };
  if (o.delay) after(run, o.delay); else run();
}

// ---------- the throw: out behind the shooter, an arc over the ground, a hop, lying there, gone ----------
let live = 0;
/** How many thrown-off pieces are in the air now (a long auto burst stops adding past a cap). */
export const brassLive = () => live;
const CAP = 36;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** Pieces are drawn a little larger than life, so a casing reads at a 38 px portrait. */
const BIG = 1.4;
/** Behind a unit aiming at angle a (radians, screen: 0 = right, π/2 = down): the opposite way. */
export const behindOf = (aim: number) => aim + Math.PI;
/** A throw toward the bottom of the screen loses most of its lift (the lift is drawn upward, which would cancel the
 *  way it goes and keep it behind the portrait) and goes a little further, so it clears the portrait early. */
const downward = (dir: number) => Math.max(0, Math.sin(dir));
const lifted = (dir: number, height: number) => height * (1 - 0.7 * downward(dir));
const reach = (dir: number, dist: number) => dist * (1 + 0.35 * downward(dir));
export interface Arc { dir: number; dist: number; height: number; ms: number; hop: number; spin: number; rest: number; fade: number }
/** A throw seen from above (the grid is a map): the piece travels dist px along dir (radians) while it rises height px
 *  and comes down, hops a little further, lies still for rest ms and fades over fade ms. Its height shows as a lift on
 *  screen and a slightly bigger piece; its shadow stays on the ground. Pure (tests). */
export function arcFrames(t: Arc): { piece: Keyframe[]; shadow: Keyframe[]; total: number; landAt: number; end: { x: number; y: number } } {
  const cx = Math.cos(t.dir), cy = Math.sin(t.dir), hop2 = t.hop, ms2 = t.ms * 0.4, total = t.ms + ms2 + t.rest + t.fade;
  const piece: Keyframe[] = [], shadow: Keyframe[] = [];
  const at = (clock: number, d: number, z: number, r: number, op: number) => {
    const x = cx * d, y = cy * d, k = z / Math.max(1, t.height), off = Math.min(1, clock / total);
    piece.push({ offset: off, transform: 'translate(' + x.toFixed(1) + 'px,' + (y - z).toFixed(1) + 'px) rotate(' + r.toFixed(0) + 'deg) scale(' + (1 + 0.32 * k).toFixed(3) + ')', opacity: op });
    shadow.push({ offset: off, transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (1 - 0.35 * k).toFixed(3) + ')', opacity: op * (0.5 - 0.25 * k) });
  };
  const N = 12;
  for (let i = 0; i <= N; i++) { const p = i / N; at(t.ms * p, t.dist * p, 4 * t.height * p * (1 - p), t.spin * p, 1); }
  for (let i = 1; i <= 5; i++) { const p = i / 5; at(t.ms + ms2 * p, t.dist + hop2 * p, 4 * t.height * 0.16 * p * (1 - p), t.spin * (1 + 0.25 * p), 1); }
  const r = t.spin * 1.25;
  at(t.ms + ms2 + t.rest, t.dist + hop2, 0, r, 1);
  at(total, t.dist + hop2, 0, r, 0);
  return { piece, shadow, total, landAt: t.ms, end: { x: cx * (t.dist + hop2), y: cy * (t.dist + hop2) } };
}
/** Throw a picture from behind the portrait out along an arc (see arcFrames), with its shadow and (unless smoke is
 *  off) a puff where it clears the portrait's rim and a thread off it as it lands. */
function toss(who: Who, P: Pic, len: number, t: Arc, o: { delay?: number; smoke?: boolean; tag?: string; from?: { x: number; y: number } } = {}) {
  if (live >= CAP) return;
  const run = () => {
    if (live >= CAP) return;
    live++;
    const u = who.w / 38, f = arcFrames(t), ox = o.from ? o.from.x : who.x, oy = o.from ? o.from.y : who.y;
    const box = behind(who, f.total + 100); if (!box) { live--; return; }
    const w = len * u, h = (len * P.h / P.w) * u;
    // the shadow (on the ground, also behind the portrait until it clears it), then the piece
    const sh = document.createElement('div'), bo = org(box);
    sh.style.cssText = 'position:absolute;left:' + (ox - bo.x - w * 0.45) + 'px;top:' + (oy - bo.y + h * 0.2) + 'px;width:' + w * 0.9 + 'px;height:' + h * 0.6 + 'px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.75),rgba(0,0,0,0));will-change:transform,opacity';
    box.appendChild(sh); anim(sh, f.shadow, { duration: f.total, easing: 'linear', fill: 'forwards' }); setTimeout(() => sh.remove(), slow(f.total) + 60);
    const el = piece(box, P.el(), ox, oy, w, h, P.glow, o.tag);
    anim(el, f.piece, { duration: f.total, easing: 'linear', fill: 'forwards' });
    const ember = el.querySelector('.phc-ember'); if (ember) anim(ember, [{ opacity: 1 }, { opacity: 0.12 }], { duration: Math.max(300, f.total * 0.7), easing: 'ease-out', fill: 'forwards' });
    if (o.smoke !== false) {
      const air = behind(who, f.total + 1500, false) || box, cx = Math.cos(t.dir), cy = Math.sin(t.dir);
      const rx = ox + cx * who.w * 0.5, ry = oy + cy * who.h * 0.5;
      wisp(air, rx, ry, 18 * u, P.smoke, { drift: cx * 8 * u, dy: cy * 8 * u, rise: 20 * u, ms: 1250 });
      wisp(air, rx + cx * 4 * u, ry + cy * 4 * u - 2 * u, 13 * u, P.smoke, { drift: cx * 11 * u, dy: cy * 11 * u, rise: 26 * u, ms: 1400, delay: 90, alpha: 0.36 });
      wisp(air, ox + f.end.x, oy + f.end.y, 9 * u, P.smoke, { rise: 12 * u, ms: 900, delay: f.landAt, alpha: 0.3 });
    }
    setTimeout(() => { live = Math.max(0, live - 1); }, slow(f.total) + 60);
  };
  if (o.delay) after(run, o.delay); else run();
}
/** A piece dropped straight down from behind the portrait to the ground under it: gone the moment it lands (a puff
 *  of dust), or (bounce) a little hop where it lands before it fades. */
function drop(who: Who, P: Pic, w: number, h: number, o: { x?: number; y0?: number; ground?: number; delay?: number; tag?: string; spin?: number; bounce?: boolean; g?: number } = {}) {
  if (live >= CAP) return;
  const run = () => {
    if (live >= CAP) return;
    live++;
    const u = who.w / 38, x = o.x ?? who.x, y0 = o.y0 ?? who.y, ground = o.ground ?? who.y + who.h * 0.5 + who.h * 0.55, yG = ground - h / 2;
    const g = (o.g ?? 1500) * u, fall = Math.sqrt((2 * Math.max(4, yG - y0)) / g) * 1000, hop = o.bounce ? 260 : 0, fade = o.bounce ? 220 : 0, ms = fall + hop + fade;
    const box = behind(who, ms + 700); if (!box) { live--; return; }
    const el = piece(box, P.el(), x, y0, w, h, P.glow, o.tag), spin = o.spin ?? 0;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) { const t = (fall / 1000) * (i / 8); frames.push({ offset: (fall * (i / 8)) / ms, transform: 'translate(0,' + (0.5 * g * t * t).toFixed(1) + 'px) rotate(' + (spin * i / 8).toFixed(0) + 'deg)', opacity: o.bounce || i < 8 ? 1 : 0 }); }
    if (o.bounce) {
      const d = yG - y0;
      frames.push({ offset: (fall + hop * 0.5) / ms, transform: 'translate(' + (spin > 0 ? 3 : -3) * u + 'px,' + (d - 5 * u).toFixed(1) + 'px) rotate(' + (spin * 1.6).toFixed(0) + 'deg)', opacity: 1 });
      frames.push({ offset: (fall + hop) / ms, transform: 'translate(' + (spin > 0 ? 5 : -5) * u + 'px,' + d.toFixed(1) + 'px) rotate(' + (Math.round(spin / 90) * 90 + 90).toFixed(0) + 'deg)', opacity: 1 });
      frames.push({ offset: 1, transform: 'translate(' + (spin > 0 ? 5 : -5) * u + 'px,' + d.toFixed(1) + 'px) rotate(' + (Math.round(spin / 90) * 90 + 90).toFixed(0) + 'deg)', opacity: 0 });
    }
    anim(el, frames, { duration: ms, easing: 'linear', fill: 'forwards' });
    const tp = fxTempo();
    setTimeout(() => withTempo(tp, () => {
      if (!o.bounce) { const air = behind(who, 600, false) || box; for (let i = 0; i < 2; i++) wisp(air, x + (i ? 1 : -1) * w * 0.4, ground - 1, 10 * u, 'rgba(163,174,194,', { drift: (i ? 1 : -1) * 7 * u, rise: 5 * u, ms: 520, alpha: 0.45 }); }
      live = Math.max(0, live - 1);
    }), slow(fall));
  };
  if (o.delay) after(run, o.delay); else run();
}
/** A round (or shell) taken from the belt and pushed into the gun: it appears at the hip and slides up behind the
 *  portrait, out of sight. */
function feed(who: Who, P: Pic, len: number, side: number, o: { delay?: number; tag?: string } = {}) {
  const run = () => {
    if (live >= CAP) return;
    const u = who.w / 38, w = len * u, h = (len * P.h / P.w) * u, ms = 380;
    const box = behind(who, ms); if (!box) return;
    live++; setTimeout(() => { live = Math.max(0, live - 1); }, slow(ms));
    const x0 = who.x + side * who.w * 0.52, y0 = who.y + who.h * 0.5;
    const el = piece(box, P.el(), x0, y0, w, h, P.glow, o.tag);
    const r0 = side > 0 ? -60 : -120;
    anim(el, [{ transform: 'translate(0,' + 6 * u + 'px) rotate(' + r0 + 'deg)', opacity: 0 }, { transform: 'translate(0,0) rotate(' + r0 + 'deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + (-side * who.w * 0.42).toFixed(1) + 'px,' + (-who.h * 0.45).toFixed(1) + 'px) rotate(' + (r0 - side * 30) + 'deg)', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.4,.1,.5,1)', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}

// ---------- the effects ----------
/** A shot's casing (and a belt-fed gun's link) thrown out behind the shooter (away from the target), with smoke. */
export function ejectShell(who: Who | null, shell: Shell | null, aim: number, o: { delay?: number } = {}) {
  if (who && shell) trace('shell', { shell }); // one casing (the tests count them against the rounds spent)
  if (!who || !shell || reducedMotion()) return;
  const P = SHELLS[shell], u = who.w / 38, big = shell === 'big_rifle' || shell === 'grenade_40', len = P.w * (shell === 'grenade_40' ? 0.62 : 0.5) * BIG;
  const dir = behindOf(aim) + rnd(-0.45, 0.45);
  toss(who, P, len, { dir, dist: reach(dir, rnd(0.85, 1.25) * who.w * (big ? 0.85 : 1)), height: lifted(dir, rnd(0.45, 0.65) * who.h), ms: big ? 420 : 360, hop: rnd(4, 9) * u, spin: rnd(540, 980) * (Math.random() < 0.5 ? -1 : 1) * (big ? 0.6 : 1), rest: 220, fade: 260 }, { delay: o.delay, tag: 'shell:' + shell });
  if (shell === 'linked_rifle') toss(who, LINK, 4.5 * BIG, { dir: dir + rnd(-0.3, 0.3), dist: rnd(0.6, 0.85) * who.w, height: 0.35 * who.h, ms: 320, hop: 3 * u, spin: rnd(-700, 700), rest: 160, fade: 220 }, { delay: (o.delay || 0) + 30, smoke: false, tag: 'link' });
}
/** The spent core an Evoker ejects when it takes a fresh one: thrown out behind like a casing, larger and slower,
 *  its light going out, a cold mist where it left the Evoker. */
export function ejectCore(who: Who | null, core: Core, aim: number, o: { delay?: number } = {}) {
  if (!who || reducedMotion()) return;
  const P = CORES[core], u = who.w / 38, heavy = core === 'staff', dir = behindOf(aim) + rnd(-0.3, 0.3);
  toss(who, P, P.w * (core === 'blade' ? 0.5 : 0.55) * BIG, { dir, dist: reach(dir, rnd(1.0, 1.3) * who.w * (heavy ? 0.85 : 1)), height: lifted(dir, (heavy ? 0.8 : 0.6) * who.h), ms: heavy ? 560 : 480, hop: rnd(4, 8) * u, spin: rnd(300, 620) * (Math.random() < 0.5 ? -1 : 1) * (heavy ? 0.5 : 1), rest: 380, fade: 320 }, { delay: o.delay, tag: 'core:' + core });
  const L = behind(who, 1700, false); if (!L) return;
  const cx = Math.cos(dir), cy = Math.sin(dir), rx = who.x + cx * who.w * 0.5, ry = who.y + cy * who.h * 0.5;
  for (let i = 0; i < 3; i++) wisp(L, rx + cx * i * 3 * u, ry + cy * i * 3 * u, (13 + i * 3) * u, SIGIL_SMOKE, { drift: cx * 9 * u, dy: cy * 9 * u, rise: 18 * u, ms: 1300, delay: (o.delay || 0) + i * 110, alpha: 0.32 });
}
/** A reload's magazine (or canister, or bolt box): straight down out of the gun from behind the portrait, gone the
 *  moment it reaches the ground (a speed reload: the pile on the tile now holds it). A tactical reload calls nothing
 *  here: its magazine goes into the pack on the reload card (fx/reload.ts), never under the portrait. */
export function dropMag(who: Who | null, mag: Mag | null, o: { delay?: number } = {}) {
  if (!who || !mag || reducedMotion()) return;
  // it comes out of the magwell just under the portrait's middle, its top still behind it; the ground is far enough
  // below that it falls in plain sight before it lands
  const P = MAGS[mag], u = who.w / 38, w = P.w * 0.62 * BIG * u, h = P.h * 0.62 * BIG * u, y0 = who.y + who.h * 0.25 + h * 0.3;
  drop(who, P, w, h, { y0, ground: who.y + who.h * 0.7 + h * 0.9, delay: o.delay, tag: 'mag:' + mag, spin: rnd(-10, 10), g: 1100 });
}
/** A gun with no magazine takes its rounds (see Load): a cylinder's spent brass dropped straight out and fresh rounds
 *  pushed in; a break-action opened, both hulls kicked out behind and two fresh shells dropped in; a pump gun's shells
 *  or a lever or bolt gun's rounds pushed in one by one. n: how many go in. aim: the way the shooter last faced. */
export function loadRounds(who: Who | null, b: Brass, n: number, aim: number, ms: number, o: { delay?: number; spent?: number } = {}) {
  if (!who || !b.load || !b.shell || reducedMotion()) return;
  const S = SHELLS[b.shell], F = fresh(b.shell), len = S.w * 0.5 * BIG, flen = F.w * 0.5 * BIG, u = who.w / 38, d0 = o.delay || 0;
  const side = Math.cos(aim) >= 0 ? -1 : 1; // the off side: the hand that loads is away from the target
  const k = Math.max(1, Math.min(b.load === 'break' ? 2 : 6, n));
  if (b.load === 'cylinder') {
    // the cylinder swings out: its brass falls straight down, then the fresh rounds go in
    const spent = Math.max(1, Math.min(6, o.spent ?? k));
    for (let i = 0; i < spent; i++) drop(who, S, len * u, (len * S.h / S.w) * u, { x: who.x + (i - (spent - 1) / 2) * 2.2 * u, y0: who.y + who.h * 0.05, delay: d0 + i * 30, tag: 'shell:' + b.shell, spin: 90 + rnd(-25, 25), bounce: true, g: 1700 });
    for (let i = 0; i < k; i++) feed(who, F, flen, side, { delay: d0 + ms * 0.35 + (i * ms * 0.45) / k, tag: 'round:' + b.shell });
    return;
  }
  if (b.load === 'break') {
    // it breaks open: the extractor kicks both hulls out behind with a pop of smoke; two fresh ones go in
    for (let i = 0; i < 2; i++) { const dir = behindOf(aim) + rnd(-0.35, 0.35); toss(who, S, len, { dir, dist: reach(dir, rnd(0.7, 1.0) * who.w), height: lifted(dir, 0.55 * who.h), ms: 380, hop: 5 * u, spin: rnd(400, 800) * (i ? 1 : -1), rest: 200, fade: 240 }, { delay: d0 + i * 45, tag: 'shell:' + b.shell }); }
    for (let i = 0; i < k; i++) feed(who, F, flen, side, { delay: d0 + ms * 0.4 + i * ms * 0.2, tag: 'round:' + b.shell });
    return;
  }
  for (let i = 0; i < k; i++) feed(who, F, flen, side, { delay: d0 + (i * ms * 0.75) / k, tag: 'round:' + b.shell });
}
/** How long the archer's draw holds the shot (ms): the arrow comes from the quiver behind, over to the front, and goes. */
export const DRAW_MS = 560;
/** The draw: an arrow pulled up from the quiver behind the archer (the side away from the target), swung over to
 *  point at the target, drawn back a touch, and gone as it is loosed (the shot's own arrow flies from there). A
 *  crossbow's reload does the same with a bolt, set in place. */
export function drawArrow(who: Who | null, aim: number, o: { ms?: number; bolt?: boolean } = {}) {
  if (!who || reducedMotion() || live >= CAP) return;
  const ms = o.ms ?? DRAW_MS, u = who.w / 38, len = (o.bolt ? 32 : 42) * u, h = len * 10 / 60;
  const box = behind(who, ms + 120, true, false); if (!box) return;
  const el = piece(box, arrowPic(o.bolt), who.x, who.y, len, h, undefined, o.bolt ? 'bolt' : 'arrow');
  el.style.transformOrigin = '50% 50%';
  const fx = Math.cos(aim), fy = Math.sin(aim), deg = (r: number) => (r * 180) / Math.PI;
  // the quiver: over the shoulder on the side away from the target (shooting straight up or down: the right shoulder)
  const side = Math.abs(fx) >= 0.35 ? -Math.sign(fx) : 1, qx = side * who.w * 0.3, qy = -who.h * 0.3;
  // it comes out pointing up and back, and swings at least 60° over into the aim
  let to = deg(aim), up = deg(Math.atan2(-1.6, side * 0.7));
  while (to - up > 180) to -= 360; while (to - up < -180) to += 360;
  if (Math.abs(to - up) < 60) up = to + (side > 0 ? 60 : -60);
  // at the top of the swing the whole arrow is clear of the portrait's top edge: the clip comes off there, unseen
  const mid = (up + to) / 2, apexY = -(who.h / 2 + who.ring + (len / 2) * Math.abs(Math.sin((mid * Math.PI) / 180)) + 2 * u), apexX = (qx + fx * who.w * 0.45) * 0.3;
  const T = (x: number, y: number, r: number) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(0) + 'deg)';
  const front = { x: fx * who.w * 0.45, y: fy * who.h * 0.45 }, pull = { x: front.x - fx * who.w * 0.14, y: front.y - fy * who.h * 0.14 }, E = 'ease-in-out';
  anim(el, [
    { transform: T(qx, qy + who.h * 0.55, up), opacity: 0, offset: 0, easing: E },
    { transform: T(qx, qy + who.h * 0.3, up), opacity: 1, offset: 0.12, easing: E },
    { transform: T(qx * 0.8, qy - who.h * 0.1, up), opacity: 1, offset: 0.3, easing: E },
    { transform: T(apexX, apexY, mid), opacity: 1, offset: 0.5, easing: E },
    { transform: T(front.x, front.y, to), opacity: 1, offset: 0.74, easing: E },
    { transform: T(pull.x, pull.y, to), opacity: 1, offset: 0.9, easing: E },
    { transform: T(pull.x, pull.y, to), opacity: 0, offset: 1 },
  ], { duration: ms, easing: 'linear', fill: 'forwards' });
  // over the top it comes in front of the portrait (the timing is linear, so 0.5 is the apex)
  setTimeout(() => { box.style.clipPath = 'none'; }, slow(ms * 0.5));
}
/** A bow's reload: arrows slid down into the quiver behind the archer (n of them, one after another). */
export function stowArrows(who: Who | null, n: number, aim: number, ms: number) {
  if (!who || reducedMotion() || live >= CAP) return;
  const u = who.w / 38, len = 42 * u, h = len * 10 / 60, bx = -Math.cos(aim), by = -Math.sin(aim);
  const box = behind(who, ms + 200); if (!box) return;
  for (let i = 0; i < n; i++) {
    const el = piece(box, arrowPic(false), who.x + bx * who.w * 0.3 + i * 2 * u, who.y + by * who.h * 0.3, len, h, undefined, 'arrow'); el.style.opacity = '0';
    const rot = (Math.atan2(by - 1.6, bx) * 180) / Math.PI + i * 4;
    anim(el, [{ transform: 'translate(0,' + -who.h * 1.05 + 'px) rotate(' + rot + 'deg)', opacity: 0 }, { transform: 'translate(0,' + -who.h * 0.9 + 'px) rotate(' + rot + 'deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(0,' + -who.h * 0.1 + 'px) rotate(' + rot + 'deg)', opacity: 1 }], { duration: Math.max(260, ms / (n + 1)), delay: (i * ms * 0.7) / Math.max(1, n), easing: 'ease-in', fill: 'both' });
  }
}
