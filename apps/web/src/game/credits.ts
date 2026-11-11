// The credits manifest (spec: docs/design/title-screen.md §7, magic-presentation licence rules): every third-party
// asset the game ships, with its author and licence, shown on the title screen's Credits page.
import { SFX_CREDITS } from './sfxCredits';
import { FX_CREDITS } from './fx/fxCredits';

export interface Credit { what: string; who: string; licence?: string; url?: string }
/** The deed each open licence links to: CC BY asks for the licence's URI or a link to it with every credit (CC BY 4.0
 *  section 3(a)(1)(C); 3.0 section 4(b)), so the credits page links the licence name. */
export const LICENCE_URL: Record<string, string> = {
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  'MIT': 'https://opensource.org/license/mit',
};
export const licenceUrl = (licence: string | undefined): string | undefined => (licence ? LICENCE_URL[licence] : undefined);
export const CREDITS: { group: string; items: Credit[] }[] = [
  { group: 'Game', items: [
    { what: 'Project Heaven Cry', who: 'Leon ("Romantic B0ss") and friends, from the 2020 tabletop game' },
    { what: 'Art: Heavenprint portraits, skill figures, campaign art, Wick', who: 'The PHC art team' },
  ] },
  { group: 'Music', items: [
    { what: 'Heaven Cry (title theme)', who: 'Leon, made with Suno', licence: 'Project Heaven Cry' },
    { what: 'Intake (character creation)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    // The game's own fight music (Project Heaven Cry OST): made by Leon with Suno on the Pro plan, which licenses
    // commercial use. Masters in audio/music/ (see audio/README.md).
    { what: 'Gunline (fight song)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    // The eight songs that share the ordinary fight with Gunline (one is picked for each fight), 11 Nov 2026.
    ...['Brass on the Floor', 'Danger Close', 'Flank Left', 'Held Breath', 'Hold the Line', 'Line of Four', 'Mag Check', 'Suppressing Fire']
      .map((t) => ({ what: t + ' (fight song)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' })),
    { what: 'Heaven Falls (elite and boss fights)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    { what: 'Last Rounds (when half the party is down)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    { what: 'Gearing Up (the Proving Ground)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    { what: 'Shadows and Dust, I Walk With Ghosts, Decoherence, Machina, Red, Pursuit (M813)', who: 'Scott Buckley', licence: 'CC-BY 4.0', url: 'https://www.scottbuckley.com.au' },
    { what: 'Ossuary 6 – Air (M813)', who: 'Kevin MacLeod', licence: 'CC-BY 4.0', url: 'https://incompetech.com' },
    { what: 'Players\' favourite songs', who: 'their own YouTube links, played from YouTube' },
  ] },
  { group: 'Sound', items: SFX_CREDITS },
  { group: 'Combat effects', items: FX_CREDITS },
  { group: 'Voice and code', items: [
    { what: 'The Narrator\'s voice: Kokoro-82M via kokoro-js', who: 'hexgrad, Xenova', licence: 'Apache-2.0', url: 'https://github.com/hexgrad/kokoro' },
    { what: 'React', who: 'Meta', licence: 'MIT' },
    { what: 'fflate', who: '101arrowz', licence: 'MIT' },
    { what: 'Anthropic TypeScript SDK', who: 'Anthropic', licence: 'MIT' },
  ] },
];
