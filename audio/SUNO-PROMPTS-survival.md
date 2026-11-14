# Suno prompts: Survival mode (14 Nov 2026)

For Leon to paste into Suno. All tracks **instrumental**, made to **loop**. One sound world for the whole mode so it
reads as one game: **worn analogue synths, bowed metal, low strings, hand percussion, a detuned music box or
upright piano for the human moments, a distant choir for anything to do with Heaven**. Dark, dry, a little funny in
the safe places. No real artist or game names in a prompt.

How to use: set **Instrumental** on. Paste the **Style** line into "Style of music". Leave lyrics empty, or paste
the **Structure** line into the lyrics box to shape it. Generate 2 to 4 takes, keep the one whose first and last
bars match, and trim to a clean loop. Target lengths are in each row. File names are the ids the game will look for.

**Tracks delivered (14 Nov 2026):** `surv-camp`, `surv-map`, `surv-map-ahoc`, `surv-map-city`, `surv-map-field`, `surv-map-works`, `surv-map-shrine`, `surv-map-rim`, `surv-boon`, `surv-shop`, `surv-forge`, `surv-rest`. They are in the game's track list, files and credits (`audio/README.md`); the game does not play them yet (no Survival music mechanism). A test checks this line against the track list.

**Still to make:** every other id in the tables below: `surv-next-tile`, both summaries, all of section C (fights, Elite, vault guard, the four Bosses, the two stings), `surv-training`, `surv-shrine`, `surv-crossroads`, `surv-vault-open`. Until they exist those places use the fallbacks named in the notes at the end.

## A. The run's frame

| Id | Use | Length | Style | Structure |
|---|---|---|---|---|
| `surv-camp` | The camp: loadout and starting boon | 2:00 loop | slow dusty ambient, 70 bpm, warm tape synth pad, plucked detuned guitar, soft brushed kit, distant radio chatter texture, hopeful but tired, instrumental, seamless loop | [Intro: pad and room tone] [Theme: guitar figure] [Theme with brushes] [Return to pad] |
| `surv-map` | The path map (default) | 2:30 loop | sparse travelling ambient, 80 bpm, low cello drone, hand drum heartbeat, glassy synth arpeggio, wind, sense of a long road and a choice, instrumental, seamless loop | [Drone] [Arpeggio enters] [Hand drum] [Thin out to drone] |
| `surv-boon` | Boon pick after a Boss | 0:45 loop | reverent shimmer, 60 bpm, distant wordless choir, bowed glass, soft sub pulse, one bright bell motif, awe with a hint of menace, instrumental, short loop | [Choir swell] [Bell motif] [Hold] |
| `surv-next-tile` | Choosing the next tile | 1:00 loop | map-table tension, 90 bpm, ticking clock percussion, muted brass swells, low piano notes, anticipation, instrumental, loop | [Ticks] [Brass swell] [Piano answer] |
| `surv-summary-win` | Run summary, retired alive | 1:30 | bittersweet victory, 76 bpm, upright piano theme, warm strings, tape hiss, quiet pride, instrumental, clear ending | [Piano alone] [Strings join] [Final chord] |
| `surv-summary-wipe` | Run summary, the squad fell | 1:15 | elegy, 56 bpm, solo cello, detuned music box, distant choir, grief without melodrama, instrumental, fades out | [Cello] [Music box] [Fade] |

## B. Path map, one per setting (optional; fall back to `surv-map`)

| Id | Setting | Style |
|---|---|---|
| `surv-map-ahoc` | AHOC chapter outpost | cold institutional ambient, 78 bpm, fluorescent hum, muted military snare far away, analog synth drone, filing-cabinet percussion, weary bureaucracy, instrumental, loop |
| `surv-map-city` | Central City back streets | nocturnal street ambient, 86 bpm, smoky electric piano, upright bass walk, rain, neon synth stabs, tired swagger, instrumental, loop |
| `surv-map-field` | Old battlefield | desolate plain ambient, 66 bpm, bowed metal, low war drum every four bars, harmonica far off, wind, old grief, instrumental, loop |
| `surv-map-works` | Machine works and drone foundry | industrial pulse ambient, 92 bpm, conveyor rhythm, clanking metal percussion, sawtooth bass drone, steam hiss, tireless and indifferent, instrumental, loop |
| `surv-map-shrine` | Shrine and cathedral district | sacred unease, 60 bpm, pipe organ pedal, distant choir, handbells, candle-quiet reverb, devotion with something watching, instrumental, loop |
| `surv-map-rim` | Rim station | deep space dread ambient, 70 bpm, sub drone, slow radar ping, glass harmonics, hull creaks, the pull of something vast, instrumental, loop |

## C. Fights

| Id | Use | Length | Style | Structure |
|---|---|---|---|---|
| `surv-fight-1` | Ordinary fight, stage 1 to 2 | 2:30 loop | tactical combat groove, 104 bpm, tight dry drums, palm-muted guitar, pulsing analog bass, short string stabs, focused and tense not epic, instrumental, seamless loop | [Intro 4 bars] [Groove A] [Groove B with stabs] [Breakdown] [Groove A] |
| `surv-fight-2` | Ordinary fight, stage 3 and later | 2:30 loop | harder tactical combat, 116 bpm, driving drums, distorted bass synth, urgent ostinato strings, metallic hits, pressure rising, instrumental, seamless loop | [Intro] [Drive] [Lift] [Drop to bass and drums] [Drive] |
| `surv-elite` | Elite and the Gate | 2:30 loop | menacing mid-boss, 110 bpm, heavy toms, low brass growls, dissonant string clusters, grinding synth, a named threat, instrumental, loop | [Stalk] [Strike] [Stalk] [Strike bigger] |
| `surv-vault` | The vault's guard | 2:00 loop | greedy danger, 98 bpm, sneaking pizzicato bass, anvil hits, sly clarinet line, sudden percussion bursts, treasure worth dying for, instrumental, loop | [Sneak] [Burst] [Sneak] [Burst] |
| `surv-boss-ahoc` | Boss: chapter warframe (also works, rim) | 3:00 loop | relentless machine boss, 128 bpm, pounding industrial drums, sawtooth bass, alarm motif, brass blasts, hydraulic hits, unstoppable, instrumental, loop | [Alarm intro] [March] [Assault] [Brief stillness] [Assault] |
| `surv-boss-city` | Boss: Crawler elder | 3:00 loop | tragic monstrous boss, 96 bpm, detuned strings, heartbeat drum, wordless female voice, sub bass swells, sorrow under the fury, instrumental, loop | [Heartbeat] [Voice] [Fury] [Voice returns] |
| `surv-boss-field` | Boss: ork warlord | 3:00 loop | brutal war boss, 120 bpm, massive tribal drums, war horns, chanting male voices as rhythm, distorted low guitar, joyful violence, instrumental, loop | [Horns] [Drums and chant] [Charge] [Drums alone] [Charge] |
| `surv-boss-shrine` | Boss: upper-realm patch | 3:00 loop | divine wrong boss, 100 bpm, full choir in a major key gone sour, pipe organ, glitching synth bursts, timpani, Heaven fixing its mistake, instrumental, loop | [Choir alone] [Organ and timpani] [Glitch break] [Choir full] |
| `surv-win-sting` | A fight won | 0:08 | short victory sting, three rising notes on upright piano with a soft cymbal swell, relieved, instrumental, clean ending | |
| `surv-down-sting` | A character falls | 0:05 | short dark sting, low piano cluster and a reversed cymbal, instrumental, clean ending | |

## D. The safe places (each keeper has a room tone and a tune)

| Id | Place | Length | Style |
|---|---|---|---|
| `surv-shop` | The shop | 2:00 loop | safe room ambient, 62 bpm, slow melancholic harp and nylon guitar arpeggio in a minor key, warm analog pad, soft felt piano answering, distant low choir hum, deep hall reverb, tape hiss, calm and lonely, a quiet place between dangers, mysterious trader, no drums, no percussion, instrumental, seamless loop |
| `surv-forge` | The Forge | 1:45 loop | steady workshop blues, 84 bpm, anvil strikes on the backbeat, slide guitar, low humming bass, bellows breathing, patient craft, instrumental, loop |
| `surv-training` | Training ground | 1:30 loop | drill-yard cadence, 100 bpm, marching snare, whistle motif, stomping kick, single trumpet, gruff and upbeat, instrumental, loop |
| `surv-shrine` | Shrine | 1:45 loop | small prayer, 58 bpm, harmonium, one soft voice humming, handbell, long reverb, comfort offered by something far away, instrumental, loop |
| `surv-crossroads` | Crossroads broker | 1:30 loop | shady deal lounge, 88 bpm, muted trumpet, vibraphone, walking bass, finger snaps, charming and untrustworthy, instrumental, loop |
| `surv-rest` | Rest | 1:45 loop | campfire lull, 64 bpm, fingerpicked acoustic guitar, soft harmonica, crackling fire texture, crickets, safe for one night, instrumental, loop |
| `surv-vault-open` | The vault's chest | 0:30 | reward flourish, 80 bpm, music box melody opening into warm strings and a bright bell, wonder, instrumental, clear ending |

### The shop, in full (Leon, 14 Nov: the first take was "goofy"; he wants the feel of a classic survival-horror safe room and its trader)

What that music does, so the prompt can ask for it without naming it: it is SLOW and nearly still (about 60 bpm, no
drums at all), built on one repeating broken-chord figure in a minor key on a plucked instrument, with a soft pad
underneath and a lot of reverb; it is sad but safe, the opposite of the fight music; nothing in it is funny. The
trader is a stranger you are glad to see: a little mystery (a low hum, one odd interval), never a joke.

- **Style:** `safe room ambient, survival horror save theme, 62 bpm, slow melancholic harp and nylon guitar arpeggio in A minor, warm analog synth pad, soft felt piano answering phrases, distant low male choir hum, deep hall reverb, tape hiss, calm, lonely, safe, mysterious trader, no drums, no percussion, instrumental, seamless loop`
- **Exclude styles** (the field below Style): `comedy, quirky, playful, tuba, clarinet, shuffle, swing, upbeat, jazz, drums, percussion, claps, vocals, lyrics, bright, major key, cartoon`
- **Lyrics box** (structure only): `[Intro: pad and room tone, 4 bars] [Theme: plucked arpeggio alone] [Theme: felt piano answers] [Low choir hum enters, very quiet] [Theme thins to arpeggio and pad] [End on the opening bar for a loop]`
- **Sliders, if your version has them:** Weirdness low (about 20%), Style influence high (about 80%).
- **A second take to try** (more of the trader, less of the church): `desert caravan trader ambient, 66 bpm, slow oud or nylon guitar figure in a minor key, hand-bowed drone, soft glass bells, warm pad, long reverb, hushed, patient, a stranger with good wares, no drums, instrumental, seamless loop`
- The Forge, the Crossroads and the training ground can stay lighter; if they also read as goofy, drop the tuba,
  clarinet, whistle and finger snaps from their rows and slow them by 10 bpm.

## Notes for wiring (for the builder, later)

- Ids above become catalog ids under `audio/`; the game picks by node kind and setting from data, with `surv-map` and
  `surv-fight-1` as fallbacks (no track name typed in code).
- Credit each track in the game's credits as Suno-generated with the account that made it, per its licence terms.
