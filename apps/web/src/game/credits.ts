// The credits manifest (spec: docs/design/title-screen.md §7, magic-presentation licence rules): every third-party
// asset the game ships, with its author and licence, shown on the title screen's Credits page.
import { SFX_CREDITS } from './sfxCredits';
import { FX_CREDITS } from './fx/fxCredits';

export interface Credit { what: string; who: string; licence?: string; url?: string }
export const CREDITS: { group: string; items: Credit[] }[] = [
  { group: 'Game', items: [
    { what: 'Project Heaven Cry', who: 'Leon ("Romantic B0ss") and friends, from the 2020 tabletop game' },
    { what: 'Art: Heavenprint portraits, skill figures, campaign art, Wick', who: 'The PHC art team' },
  ] },
  { group: 'Music', items: [
    { what: 'Heaven Cry (title theme)', who: 'Leon, made with Suno', licence: 'Project Heaven Cry' },
    // The game's own fight music (Project Heaven Cry OST): made by Leon with Suno on the Pro plan, which licenses
    // commercial use. Masters in audio/music/ (see audio/README.md).
    { what: 'Gunline (fight theme)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    { what: 'Heaven Falls (elite and boss fights)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
    { what: 'Last Rounds (when half the party is down)', who: 'Leon, made with Suno (Pro plan, commercial licence)', licence: 'Project Heaven Cry' },
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
