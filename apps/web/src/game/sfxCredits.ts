// Credits for the sounds in SFX_FILES (game/sfx.ts): the interface, and combat and spells (public/sfx/cb). All CC0 (credit optional and given anyway) except Wisdom Magic, CC-BY 3.0, and the Miracle sting, CC-BY 4.0 (credit required).
import type { Credit } from './credits';
export const SFX_CREDITS: Credit[] = [
  { what: 'Interface Sounds (select, click, confirmation, back, maximize, minimize, error, toggle, pluck)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/interface-sounds' },
  { what: 'Cute Mission Complete (Wick\'s hello, pitched up)', who: 'fupi', licence: 'CC0', url: 'https://opengameart.org/content/cute-mission-complete' },
  { what: 'The Free Firearm Sound Library (gunshots: pistols, revolvers, rifles, carbines, shotguns, submachine guns, bursts and full auto)', who: 'The Free Firearm Sound Library team (freefirearmsfx.com), via OpenGameArt', licence: 'CC0', url: 'https://opengameart.org/content/the-free-firearm-sound-library' },
  { what: 'Gun Reload Sounds (magazine reloads, the gun cock that clears a jam)', who: 'SpringySpringo', licence: 'CC0', url: 'https://opengameart.org/content/gun-reload-sounds' },
  { what: 'Gun Reload Sound Effects (magazine in, single round)', who: 'BMacZero', licence: 'CC0', url: 'https://opengameart.org/content/gun-reload-sound-effects' },
  { what: 'Handgun Reload Sound Effect and Shotgun Reload Sound Effects (pistol reload, shells, rack)', who: 'zer0_sol', licence: 'CC0', url: 'https://opengameart.org/content/shotgun-reload-sound-effects' },
  { what: '2 Gun Reloads', who: 'StarNinjas', licence: 'CC0', url: 'https://opengameart.org/content/2-gun-reloads' },
  { what: 'Swishes Sound Pack (swings, misses, bows)', who: 'artisticdude', licence: 'CC0', url: 'https://opengameart.org/content/swishes-sound-pack' },
  { what: 'Heartbeat Sounds', who: 'bart', licence: 'CC0', url: 'https://opengameart.org/content/heartbeat-sounds' },
  { what: 'Steam Release Sounds (the stim\'s hiss)', who: 'bart', licence: 'CC0', url: 'https://opengameart.org/content/steam-release-sounds' },
  { what: '100 CC0 SFX (explosion)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/100-cc0-sfx' },
  { what: 'Impact Sounds (hits, falls, footsteps, metal, glass)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/impact-sounds' },
  { what: 'Impact Sounds (the lock-in stamp: a heavy wood, a soft and a punch impact layered into one thump)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/impact-sounds' },
  { what: 'Sci-Fi Sounds (explosions, Sigil zaps, cores, Soul swells, vents)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/sci-fi-sounds' },
  { what: 'RPG Audio (doors, knife, chop, metal click)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/rpg-audio' },
  // Sigil rules 1.4: element impacts, field loops and word cues (public/sfx/cb/el_*.ogg and sg_*.ogg; trimmed, mono, levelled).
  { what: 'Catching fire (FIRE impact)', who: 'themightyglider', licence: 'CC0', url: 'https://opengameart.org/content/catching-fire' },
  { what: 'Fire Staff Sound Effects (FIRE impact, second take)', who: 'Legit Audio', licence: 'CC0', url: 'https://opengameart.org/content/fire-staff-sound-effects' },
  { what: 'Fire Crackling (the fire field\'s loop)', who: 'antumdeluge', licence: 'CC0', url: 'https://opengameart.org/content/fire-crackling' },
  { what: 'Ice spells (FREEZE impact)', who: 'bart', licence: 'CC0', url: 'https://opengameart.org/content/ice-spells' },
  { what: 'Freeze Spell (FREEZE impact, second take)', who: 'artisticdude', licence: 'CC0', url: 'https://opengameart.org/content/freeze-spell-0' },
  { what: 'Ice breaking/shattering (frost shatter, CLEANSE)', who: 'ignasd', licence: 'CC0', url: 'https://opengameart.org/content/ice-breakingshattering' },
  { what: 'Electricity Game Sound Pack (SHOCK impacts, the storm field\'s crackle loop, the turret\'s charge)', who: 'faxcorp', licence: 'CC0', url: 'https://opengameart.org/content/electricity-game-sound-pack' },
  { what: '50 CC0 Sci-Fi SFX (zaps, SPARK, STEP\'s blink, MASK, a fizzle, the ice field\'s shimmer)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/50-cc0-sci-fi-sfx' },
  { what: 'Breaking Rock (STONE impact)', who: 'themightyglider', licence: 'CC0', url: 'https://opengameart.org/content/breaking-rock' },
  { what: '75 CC0 breaking / falling / hit sfx (STONE, a RAISE wall crumbling, SPARK, a turret breaking)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx' },
  { what: 'Earth Element Magic Spell (a RAISE wall rising)', who: 'qubodup', licence: 'CC0', url: 'https://opengameart.org/content/earth-element-magic-spell' },
  { what: 'Short wind sound (GALE impact)', who: 'remaxim', licence: 'CC0', url: 'https://opengameart.org/content/short-wind-sound' },
  { what: 'wind whoosh loop (the wind field\'s loop)', who: 'sketchman3', licence: 'CC0', url: 'https://opengameart.org/content/wind-whoosh-loop' },
  { what: '40 CC0 water / splash / slime SFX (ACID splash, the acid field\'s bubbling)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/40-cc0-water-splash-slime-sfx' },
  { what: 'Energy Drain (LEECH)', who: 'qubodup', licence: 'CC0', url: 'https://opengameart.org/content/energy-drain' },
  { what: 'Electricity Game Sound Pack: power down and power up (NULL, QUICKEN)', who: 'faxcorp', licence: 'CC0', url: 'https://opengameart.org/content/electricity-game-sound-pack' },
  { what: 'RPG Sound Pack: sword unsheathe (SHARPEN)', who: 'artisticdude', licence: 'CC0', url: 'https://opengameart.org/content/rpg-sound-pack' },
  { what: 'Spell sounds: healing (MEND)', who: 'haeldb', licence: 'CC0', url: 'https://opengameart.org/content/spell-sounds' },
  { what: 'Magic Spell SFX (WARD, COMMAND, a trap set and sprung, LIGHT, CLEANSE)', who: 'jaggedstone', licence: 'CC0', url: 'https://opengameart.org/content/magic-spell-sfx' },
  // Outburst 2.0 (rules 1.5): the heart (public/sfx/cb/soul_*.ogg; trimmed, mono, levelled). The aura beds reuse the field loops above, slowed and filtered.
  { what: 'Heartbeat single sound (the Pump\'s thump)', who: 'Independent.nu (submitted by qubodup)', licence: 'CC0', url: 'https://opengameart.org/content/heartbeat-single-sound' },
  { what: 'Sound Effects Pack: breath-male and gasp1 (Begin\'s breath in, the long breath out of a calming heart, Heart Overwatch\'s gasp), earthquake (the stone aura\'s rumble)', who: 'OwlishMedia', licence: 'CC0', url: 'https://opengameart.org/content/sound-effects-pack' },
  { what: 'Ghost Breath (Let go\'s violet sigh)', who: 'qubodup', licence: 'CC0', url: 'https://opengameart.org/content/ghost-breath' },
  // The author's attribution instructions: "Wisdom Magic Sounds by Iwan Gabovitch http://opengameart.org/users/qubodup".
  { what: 'Wisdom Magic Sounds (the choir swell under a big release and a resonance)', who: 'Iwan Gabovitch, http://opengameart.org/users/qubodup', licence: 'CC-BY 3.0', url: 'https://opengameart.org/content/wisdom-magic' },
  { what: 'Deep Bone Crack/Break SFX (the heart cracking: Strain burning, a Mana Short)', who: 'Zane Little Music', licence: 'CC0', url: 'https://opengameart.org/content/deep-bone-crackbreak-sfx' },
  // Sigil 1.5 (rules 1.10): public/sfx/cb/sg_join, sg_inflect, sg_study (layered from the pack's files; mono, levelled).
  { what: 'Interface Sounds: glass and tick (a glyph joining a stroke), confirmation and a long glass ring (a word\'s inflection coming on), scratch and confirmation (a word copied or learned from a mark or a glyph)', who: 'Kenney (www.kenney.nl)', licence: 'CC0', url: 'https://kenney.nl/assets/interface-sounds' },
  // Outburst 4.0 (rules 1.8): feelings (public/sfx/cb/feel_*.ogg; trimmed, mono, levelled, some filtered). All CC0.
  { what: 'Interface Sounds: maximize, glass, bong, minimize and tick (the warm, cold and hollow pump layers, the cold residue, Revert pump\'s rewind, the multiplier\'s shake tick)', who: 'Kenney (www.kenney.nl), via OpenGameArt', licence: 'CC0', url: 'https://opengameart.org/content/interface-sounds' },
  { what: 'Sci-Fi Sounds: impactMetal and lowFrequency_explosion (the low pump layer\'s thud, the low residue\'s rumble)', who: 'Kenney (www.kenney.nl), via OpenGameArt', licence: 'CC0', url: 'https://opengameart.org/content/sci-fi-sounds' },
  { what: '80 CC0 RPG SFX: blade, creature roar and fire spell (the sharp and wild pump layers and residues)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/80-cc0-rpg-sfx' },
  { what: '100 CC0 SFX: gong (the holy residue)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/100-cc0-sfx' },
  { what: '100 CC0 SFX #2: air flowing (the hollow residue\'s breath)', who: 'rubberduck', licence: 'CC0', url: 'https://opengameart.org/content/100-cc0-sfx-2' },
  { what: 'Theremin Sci-Fi Sparkles (the bright pump layer and residue, the warm residue\'s glow)', who: 'Zane Little Music', licence: 'CC0', url: 'https://opengameart.org/content/theremin-sci-fi-sparkles' },
  { what: 'Bell dings/chimes (the holy pump layer\'s bell)', who: 'PWL', licence: 'CC0', url: 'https://opengameart.org/content/bell-dingschimes' },
  // The author's attribution notice: "Produced by Julie Damsgaard/Spring Spring/Spring Enterprises @ https://spring-enterprises.neocities.org".
  { what: 'Magic Words + Healing Sound Effect: the healing harp ("You have felt…", a feeling unlocked)', who: 'Produced by Julie Damsgaard/Spring Spring/Spring Enterprises, https://spring-enterprises.neocities.org', licence: 'CC0', url: 'https://opengameart.org/content/magic-words-healing-sound-effect' },
  // Spotlight cut-ins (decision 113): public/sfx/cb/spotlight_tear.ogg, the swoosh layered over the drum's ring (pitched
  // down to 0.75, its lead-in trimmed); mono, trimmed to 0.95 s, peak about -1 dBFS. Both CC0.
  { what: 'Wind, hit, time morph: megaswosh1 (the spotlight cut-in\'s tear)', who: 'qubodup', licence: 'CC0', url: 'https://opengameart.org/content/wind-hit-time-morph' },
  { what: 'Mystery Sting: a steel tongue drum\'s ring (the spotlight cut-in\'s low sting)', who: 'railkill', licence: 'CC0', url: 'https://opengameart.org/content/mystery-sting' },
  // Faith 2.2 (rules 1.6.3): the Miracle cut-in's sting (public/sfx/cb/miracle_sting.ogg). The author asks for nothing
  // beyond the licence's attribution; changes: trimmed to the first rising run (2.8 s), mono, levelled. Master in audio/sfx/.
  { what: '8 Heals and Buffs SFX: 30_revive_03 (the Miracle cut-in\'s sting; trimmed, mono, levelled)', who: 'leohpaz', licence: 'CC-BY 4.0', url: 'https://opengameart.org/content/8-heals-and-buffs-sfx' },
  { what: 'Wick\'s footsteps and the stand-ins', who: 'synthesised in the game' },
];
