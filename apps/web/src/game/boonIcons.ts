import { relicRow } from '@engine';
// The boon icons (survival-spec section 3.5, 8.2; rules 1.44; rules 1.51 adds the six caster boons and a glyph for each
// line, which the starting boons draw): line glyphs drawn here as simple SVG in the house
// line-icon style (a 64 grid, a round stroke in currentColor) until the artist's Wick flat-ink icons land
// (art/briefs/ART-REQUESTS.md, "Survival boon icons"). Always shown with the boon's name and sentence.

/** Path data on a 64 x 64 grid, by boon id. */
export const BOON_ICON_PATHS: Record<string, string[]> = {
  'boon.edge': ['M14 50 L46 18', 'M46 18 L52 12 L50 20 Z', 'M18 42 L22 46', 'M10 54 L18 46'], // a honed blade
  'boon.second_wind': ['M8 24 C20 18 30 30 44 24 C50 21 54 18 56 14', 'M8 36 C20 30 30 42 44 36 C50 33 54 30 56 26', 'M8 48 C20 42 30 54 44 48'], // wind
  'boon.true_aim': ['M32 32 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', 'M32 8 L32 22', 'M32 42 L32 56', 'M8 32 L22 32', 'M42 32 L56 32', 'M31 32 L33 32'], // a reticle
  'boon.hardened': ['M32 8 L52 16 L50 36 C48 46 40 52 32 56 C24 52 16 46 14 36 L12 16 Z', 'M32 16 L32 48', 'M20 28 L44 28'], // a shield
  'boon.lifeline': ['M8 34 L20 34 L26 22 L34 46 L40 30 L44 34 L56 34'], // a heartbeat
  'boon.echo': ['M32 32 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 'M32 32 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', 'M32 32 m-24 0 a24 24 0 1 0 48 0'], // a breath's rings
  'boon.primed': ['M18 50 L18 30', 'M28 50 L28 22', 'M38 50 L38 14', 'M12 56 L52 56', 'M46 20 L52 14 L52 22'], // a meter a step up
  'boon.reflexes': ['M14 40 C14 28 22 20 32 20 L44 20', 'M38 14 L44 20 L38 26', 'M50 24 C50 36 42 44 32 44 L20 44', 'M26 38 L20 44 L26 50'], // quick hands, a swap
  'boon.mending': ['M26 12 L38 12 L38 26 L52 26 L52 38 L38 38 L38 52 L26 52 L26 38 L12 38 L12 26 L26 26 Z'], // a cross
  'boon.deep_well': ['M16 18 L48 18 L44 54 L20 54 Z', 'M16 18 C16 12 48 12 48 18', 'M22 34 C28 30 36 38 42 34'], // a well
  'boon.bandolier': ['M12 14 L52 50', 'M20 16 L24 26 M28 23 L32 33 M36 30 L40 40 M44 37 L48 47', 'M12 14 L8 20 L48 56 L52 50'], // a belt of rounds
  'boon.tithe': ['M32 32 m-18 0 a18 12 0 1 0 36 0 a18 12 0 1 0 -36 0', 'M14 32 L14 42 C14 48 50 48 50 42 L50 32', 'M28 28 L36 28'], // a coin
  'boon.devout': ['M32 8 L32 56', 'M20 20 L44 20', 'M22 56 L42 56'], // a standing mark
  // rules 1.51: the caster boons
  'boon.script_ward': ['M32 8 L52 16 L50 36 C48 46 40 52 32 56 C24 52 16 46 14 36 L12 16 Z', 'M22 30 L42 30', 'M32 22 L32 42'], // a shield marked with a glyph
  'boon.long_hand': ['M12 44 L36 20', 'M36 20 L44 12', 'M44 28 C50 34 50 44 44 50', 'M40 50 L44 50 L44 46'], // a stroke and a turn back
  'boon.sure_script': ['M32 32 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', 'M22 32 L42 32', 'M32 22 L32 42', 'M26 26 L38 38'], // a glyph in a ring
  'boon.steady_heart': ['M32 52 C14 40 10 30 14 22 C18 14 28 14 32 22 C36 14 46 14 50 22 C54 30 50 40 32 52 Z', 'M22 32 L42 32'], // a level heart
  'boon.deep_reserve': ['M20 12 L44 12 L44 52 L20 52 Z', 'M20 24 L44 24', 'M20 36 L44 36', 'M28 44 L36 44'], // a full vessel
  'boon.mercy_return': ['M26 12 L38 12 L38 26 L52 26 L52 38 L38 38 L38 52 L26 52 L26 38 L12 38 L12 26 L26 26 Z', 'M44 50 C52 46 54 36 50 30'], // a cross and a way back
};
/** Rules 1.51: the starting boons draw their line's glyph (data/survival.json start_boons `lines`, the first). */
export const LINE_ICON_PATHS: Record<string, string[]> = {
  guns: ['M10 30 L44 30 L48 26 L54 26 L54 34 L44 34 L40 42 L30 42 L28 34 L10 34 Z', 'M34 34 L32 40'], // a sidearm
  blades: ['M14 50 L46 18', 'M46 18 L52 12 L50 20 Z', 'M18 42 L22 46'], // a blade
  guard: ['M32 8 L52 16 L50 36 C48 46 40 52 32 56 C24 52 16 46 14 36 L12 16 Z'], // a shield
  shadow: ['M8 32 C18 20 46 20 56 32', 'M8 32 C18 40 46 40 56 32', 'M26 32 a6 6 0 1 0 12 0'], // a half-shut eye
  sigil: ['M14 48 L26 16 L38 48 L50 16', 'M20 34 L44 34'], // a drawn line of glyphs
  outburst: ['M32 52 C14 40 10 30 14 22 C18 14 28 14 32 22 C36 14 46 14 50 22 C54 30 50 40 32 52 Z'], // a heart
  bonds: ['M24 32 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 'M40 32 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0'], // two linked rings
  figments: ['M12 12 L52 12 L52 52 L12 52 Z', 'M20 44 L30 30 L38 38 L44 26 L48 44'], // a picture in a frame
  faith: ['M32 10 C38 20 44 26 44 36 C44 46 38 52 32 52 C26 52 20 46 20 36 C20 26 26 20 32 10 Z', 'M32 32 L32 46'], // a flame
};
/** An inline SVG of a boon's glyph (`ink` defaults to currentColor), for innerHTML. */
export function boonIconSvg(id: string, size = 56, ink = 'currentColor'): string {
  const line = (relicRow(id) as any)?.lines?.[0];
  const paths = BOON_ICON_PATHS[id] || (line && LINE_ICON_PATHS[line]) || BOON_ICON_PATHS['boon.primed'];
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + paths.map((d) => '<path d="' + d + '"/>').join('') + '</svg>';
}
