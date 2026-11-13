// The boon icons (survival-spec section 3.5, 8.2; rules 1.44): thirteen line glyphs drawn here as simple SVG in the house
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
};
/** An inline SVG of a boon's glyph (`ink` defaults to currentColor), for innerHTML. */
export function boonIconSvg(id: string, size = 56, ink = 'currentColor'): string {
  const paths = BOON_ICON_PATHS[id] || BOON_ICON_PATHS['boon.primed'];
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + paths.map((d) => '<path d="' + d + '"/>').join('') + '</svg>';
}
