// Any built asset by name (tools/build_web_assets.py): campaign maps, sprites, banners, portraits. URLs pass through.
// Its own module (the client load lane, 0.33): the title reads it without the screens' shared module (screens/shared.js,
// which loads the engine); shared.js re-exports it.
import ASSETS from './assets.json';
const A = ASSETS as Record<string, string>;
export const ART = (n: string | null | undefined): string => (!n ? '' : A[n] || (/^(\/|https?:|data:|blob:)/.test(n) ? n : ''));
export const ART_BIG = (n: string): string => A[n + '-lg'] || ART(n);
