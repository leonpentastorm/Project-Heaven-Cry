// The credits manifest (spec: docs/design/title-screen.md §7, magic-presentation licence rules): every third-party
// asset the game ships, with its author and licence, shown on the title screen's Credits page.
import { SFX_CREDITS } from './sfxCredits';

export interface Credit { what: string; who: string; licence?: string; url?: string }
export const CREDITS: { group: string; items: Credit[] }[] = [
  { group: 'Game', items: [
    { what: 'Project Heaven Cry', who: 'Leon ("Romantic B0ss") and friends, from the 2020 tabletop game' },
    { what: 'Art: Heavenprint portraits, skill figures, campaign art, Wick', who: 'The PHC art team' },
  ] },
  { group: 'Music', items: [
    { what: 'Heaven Cry (title theme)', who: 'Leon, made with Suno', licence: 'Project Heaven Cry' },
    { what: 'Shadows and Dust', who: 'Scott Buckley', licence: 'CC-BY 4.0', url: 'https://www.scottbuckley.com.au' },
    { what: 'Volatile Reaction', who: 'Kevin MacLeod', licence: 'CC-BY 4.0', url: 'https://incompetech.com' },
    { what: 'Players\' favourite songs', who: 'their own YouTube links, played from YouTube' },
  ] },
  { group: 'Sound', items: SFX_CREDITS },
  { group: 'Voice and code', items: [
    { what: 'The Narrator\'s voice: Kokoro-82M via kokoro-js', who: 'hexgrad, Xenova', licence: 'Apache-2.0', url: 'https://github.com/hexgrad/kokoro' },
    { what: 'React', who: 'Meta', licence: 'MIT' },
    { what: 'fflate', who: '101arrowz', licence: 'MIT' },
    { what: 'Anthropic TypeScript SDK', who: 'Anthropic', licence: 'MIT' },
  ] },
];
