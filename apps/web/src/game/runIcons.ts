// The path map's node-kind icons (survival-spec section 3.1, 8.2): ten line icons drawn here as simple SVG in the house
// weapon-icon style (a 64 grid, a 2-unit round stroke in currentColor, one silhouette and a few interior lines) until
// the artist's Wick flat-ink icons land (art/briefs/ART-REQUESTS.md, "Survival node-kind icons"). Always shown with
// the kind's word. Motifs are the spec's: crossed blades, a horned mask, a sealed door, a lamp over a counter, an anvil
// and hammer, a target and a rifle, a candle in an arch, a small fire, an open locker, a two-armed signpost.

/** Path data on a 64 x 64 grid, by node kind (`event` is the Crossroads; `start` is the camp a stage begins at). These
 * are the stand-ins for the artist's inked marker sheet (art/briefs/GPT-PROMPTS-2026-11-13-survival.md, "Path map
 * backdrops"; ART-REQUESTS.md). */
export const NODE_ICON_PATHS: Record<string, string[]> = {
  fight: ['M14 50 L46 14', 'M18 50 L50 14', 'M50 50 L18 14', 'M46 50 L14 14', 'M12 44 L20 52', 'M44 52 L52 44', 'M40 14 L50 14 L50 24', 'M24 14 L14 14 L14 24'],
  elite: ['M18 26 C18 40 24 50 32 52 C40 50 46 40 46 26 C40 22 24 22 18 26 Z', 'M18 26 L10 10 L24 22', 'M46 26 L54 10 L40 22', 'M23 34 L29 36', 'M41 34 L35 36', 'M28 45 L36 45'],
  boss: ['M16 54 L16 22 C16 13 23 8 32 8 C41 8 48 13 48 22 L48 54 Z', 'M32 10 L32 54', 'M10 54 L54 54', 'M24 32 L40 32', 'M28 28 L28 36 M36 28 L36 36', 'M32 38 L32 44'],
  shop: ['M10 40 L54 40 L54 54 L10 54 Z', 'M14 40 L14 34 L50 34 L50 40', 'M32 8 L32 16', 'M24 16 L40 16 L36 26 L28 26 Z', 'M30 26 L30 29 L34 29 L34 26', 'M20 47 L28 47', 'M36 47 L44 47'],
  forge: ['M12 36 L52 36 L46 42 L40 42 L40 50 L46 54 L18 54 L24 50 L24 42 L18 42 Z', 'M30 30 L44 10', 'M38 8 L50 16 L46 22 L34 14 Z', 'M14 24 L18 28', 'M10 30 L15 31'],
  training: ['M40 32 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', 'M40 32 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', 'M40 31 L40 33', 'M6 50 L24 40', 'M10 52 L14 46 L22 41', 'M16 44 L18 50'],
  shrine: ['M14 56 L14 26 C14 14 22 8 32 8 C42 8 50 14 50 26 L50 56', 'M10 56 L54 56', 'M26 50 L38 50 L38 34 L26 34 Z', 'M32 34 L32 30', 'M32 30 C29 26 30 22 32 18 C34 22 35 26 32 30 Z'],
  rest: ['M16 52 L48 44', 'M16 44 L48 52', 'M32 46 C24 40 24 32 30 24 C30 30 34 30 34 26 C40 32 40 40 32 46 Z', 'M32 42 C29 39 30 35 32 33 C34 35 35 39 32 42 Z'],
  cache: ['M14 10 L40 10 L40 56 L14 56 Z', 'M40 10 L52 16 L52 50 L40 56', 'M20 20 L34 20', 'M20 28 L34 28', 'M20 40 L34 40 L34 50 L20 50 Z', 'M47 30 L47 36'],
  event: ['M32 8 L32 58', 'M24 58 L40 58', 'M32 14 L52 14 L58 20 L52 26 L32 26', 'M32 32 L12 32 L6 38 L12 44 L32 44'],
  // rules 1.48: the vault's guard (a horned skull), the vault (a chest), the start (a camp tent)
  vault_guard: ['M18 30 C18 18 24 12 32 12 C40 12 46 18 46 30 C46 36 43 40 40 42 L40 50 L24 50 L24 42 C21 40 18 36 18 30 Z', 'M18 24 C10 20 8 12 12 6 C14 14 18 16 22 17', 'M46 24 C54 20 56 12 52 6 C50 14 46 16 42 17', 'M24 30 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 'M40 30 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 'M30 38 L32 35 L34 38', 'M28 50 L28 46 M32 50 L32 46 M36 50 L36 46'],
  vault: ['M10 28 L54 28 L54 54 L10 54 Z', 'M10 28 C10 16 18 12 32 12 C46 12 54 16 54 28', 'M10 36 L54 36', 'M28 32 L36 32 L36 42 L28 42 Z', 'M32 37 L32 39', 'M18 12 L18 54 M46 12 L46 54'],
  start: ['M6 52 L58 52', 'M12 52 L32 14 L52 52', 'M32 14 L32 8', 'M32 8 L42 11 L32 14', 'M26 52 L32 38 L38 52', 'M20 52 L32 22'],
};
/** An inline SVG of a node kind's icon (white-ink style; `ink` defaults to currentColor), for innerHTML or a data URI. */
export function nodeIconSvg(kind: string, size = 28, ink = 'currentColor'): string {
  const paths = NODE_ICON_PATHS[kind] || NODE_ICON_PATHS.fight;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + paths.map((d) => '<path d="' + d + '"/>').join('') + '</svg>';
}
