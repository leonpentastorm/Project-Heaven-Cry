# Wick production brief: all 74 trait icons and 106 perk icons

**Delivered, 6 November 2026:** all 74 traits and 106 perks, plus the four Review 4 corrections. See [the complete 180-icon handoff](../_archive/traits/wick/library-review-v2/README.md). Earlier “NEXT UP” and pause notes below are retained as the production history; the current progress record has no remaining icons. New artwork is still review-candidate pending Leon. Sworn Sibling v4 preserves Leon’s explicit two-Wick reference direction.


**Status, 5 November 2026:** test set 1 passed review 1 in part (three approved, six to revise, one redo; verdicts in [`../_archive/traits/wick/test-set-1/README.md`](../_archive/traits/wick/test-set-1/README.md)). This brief covers everything left: the fixes, then the full run. Leon reviews each batch before the next one starts.

**Leon's current delivery instruction, 5 November 2026:** fix the seven first and push them, then continue the full run, showing each newly drawn image in chat and pushing it immediately. This replaces the stop-between-batches timing below. It does not mark new images production-approved. The expanded run needs 169 new icons plus seven initial revisions; the four retained designs complete 180 distinct items. The four later Review 4 corrections are also delivered.

> **NEXT UP when image generation resumes (Leon, 5 November 2026), in this order:**
> 1. **Review 4 fixes (4 icons):** Into the Dark, Holy Ordnance, Supreme Command, Sworn Sibling. What to change: [perks production README, Review 4](../_archive/perks/wick/production-v1/README.md#review-4--5-november-2026-55-perks-plus-the-review-3-trait-fixes).
> 2. **Real Power**, then **Batch F** (20 Achieved and Ultimate perks), then **three new combo perks** added 5 November: Bite the Bullet, Sixth Sense, What Could Be (rows at the end of [Achieved](#achieved-19)). Note: Ultimate perks are now secret in the game (no screen lists them until one is awarded); draw them exactly as briefed.
> 3. **Batch G, new: the 27 Mastered perks** (one per skill, granted at 10 points). Requirements in [Mastered (27)](#mastered-27) below. They're the game's top-tier perks: same flat white ink, plus the Mastered mark.
>
> The queue snapshot lists all 55 in this order; `production-progress.json` points at the first.

**Attach to every job:** `art/icons/traits/mind-without-fog.png` (the only style anchor), the three approved test icons (Chain Smoker, The Brightest Light, Forlorn Hope) as quality references, and sections 08–14 of `art/style-guide/PHC-Style-Guide.md`. Item texts are in `data/traits.json` and `data/perks.json`: read what the item **does** before drawing it.

## What the artist needs to do, in order

1. **Fix test set 1** (one batch, 7 icons). Revise Humanity First, The Old Blood, Factory Made, Rabbit's Foot, Field Surgeon and Supreme Command, and redo Raised by Orks. The changes are listed in the test set's README and in the tables below (status *revise* / *redo*). Deliver them as new files in `art/_archive/traits/wick/test-set-1/revisions/` and keep the first versions for comparison.
2. **Wait for Leon's pass** on those seven. If any rule below changes as a result, it changes here first.
3. **Produce the rest in six batches.** After each batch: review sheets, Leon's review, fixes, then the next batch.

| Batch | Contents | Count |
|---|---|---|
| A | Traits 1–25 (data order), minus the ones already approved or in step 1 | 20 |
| B | Traits 26–50, same exclusions | 21 |
| C | Traits 51–74 | 24 |
| D | Acquired perks, Body skills (Endurance, Strength, Agility) | 18 |
| E | Acquired perks, Mind and Soul skills | 36 |
| F | Achieved and Ultimate perks, minus the two in step 1, plus three added combo perks | 23 |
| G | **Mastered perks (new, 5 Nov 2026):** one per skill, 27 | 27 |

## The rules (binding; style guide section 14)

1. **No lettering, numbers or readable text** anywhere in an icon: no placards with words, no stencilled serials. Use symbols (a crossed-out shape, an arrow, a tally).
2. **One full figure: Wick.** Anyone else appears only as a partial (a hand or leg entering the frame, a shadow) or as tiny Wick silhouettes. Never skull-and-crossbones as a stand-in for people; it reads as poison or death.
3. **One dominant prop, big:** roughly a third of the frame, held close so Wick and the prop read as one silhouette. If an idea needs two props, cut one.
4. **The prop or action carries the meaning, not the robot.** Cover Wick's body: the icon should still say the item.
5. **Vary silhouettes and centres of mass.** Standing, crouching, kneeling, sitting, leaping, lying, leaning, carrying, upside down, seen from behind (cape still visible). No more than a quarter of any batch is a plain standing pose. The two perks of one skill must not share a silhouette.
6. **Ink weight** between The Old Blood (lightest acceptable) and The Brightest Light (heaviest acceptable). A grid of trait cards must not look lumpy.
7. **Keep Wick's anchors:** chamfered head and pixel screen, the capelet wedge separated from the torso, the lantern heart with thick equal cross arms (never a gun sight), mitten hands, lively asymmetry.
8. **Pure white `#FFFFFF` flat ink** on transparency, traits and perks alike. No colour, glow, gradient or soft shadow.
9. **Ugly traits stay honest.** Wick is the manual's cheerful mascot even on bigotry and vice; show the attitude through the action (turning away, barring a door, a crossed-out shape), never through hate imagery or slurs.
10. **In-universe only:** no real-world brands, people, places or franchises.

## Pass criteria (every icon)

1. **Real UI sizes:** composite on `#10151F` at 44, 48 and 56 px (the sizes the game uses) and at 40 px. A player who knows the batch's names can pick this one out. The UI zooms icons ×1.35 on hover, but the resting size is the one that must read.
2. **Body-cover test:** with Wick's body covered, the prop or action still says the item.
3. Capelet visible at 64 px; cross arms thick and equal; face pixels survive at 44 px.
4. Silhouette differs from every other icon in the batch.
5. No text, no colour, no second full figure.

## Deliverables (every batch)

- **Masters:** 1024 × 1024 RGBA PNG, transparent, essential shapes inside the central 80–85%, no caption.
- **Exports:** 256, 128, 64 and 40 px, plus **56, 48 and 44 px** (the UI sizes).
- **File names:** the data id in kebab case (`chain_smoker` → `chain-smoker.png`).
- **Folders:** traits in `art/icons/traits/`, perks in `art/icons/perks/`, each with `exports/<size>/`, `previews/` and a `manifest.json` like test set 1's.
- **Review sheets per batch:** the whole batch at 44 px and at 128 px on `#10151F`, labelled, plus a light/dark 64 px comparison.
- **Catalog:** one entry per icon in `art/catalog.json` (`traits` or `perks` family, `data_id`, `status: "review-candidate"`, `production_approved: false`), then update `art/checksums.sha256` and run `python3 tools/validate_art.py`; it must pass.

## Requirements: traits (74)

Status: *approved* = keep the existing icon (the Mind Without Fog master or a test-set-1 icon); *revise* / *redo* = step 1; *new* = batches A–C. Mood, action, screen and prop are the brief for each icon; the artist may improve the staging if the rules still hold.

| # | Trait (id) | Category | Status | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|---|---|
| 1 | **Mind Without Fog** (`mind_without_fog`) | Combat | approved (the master) | Tender | Wick sits cross-legged in meditation, a bowl of still water cupped in its lap, while arrows deflect harmlessly away around it | Calm closed-eye arcs | Bowl of still water |
| 2 | **The Brightest Light** (`the_brightest_light`) | Combat | approved (test set 1) | Grim | Wick mid-stride, its lantern heart flaring into a big flame that is visibly burning the capelet's hem | Manic grin | The flame |
| 3 | **Southern Fist** (`southern_fist`) | Combat | new | Comic, Proud | Wick drops into a deep low stance, throwing a punch with one wrapped mitten while the other pinches a rifle away at arm's length like something smelly | Disdainful side-eye | Rifle held at arm's length |
| 4 | **Forlorn Hope** (`forlorn_hope`) | Combat | approved (test set 1) | Grim, Proud | Wick charges forward, bare-chested (no armour plate), one arm flung back, the capelet streaming | Fierce | None; the pose carries it |
| 5 | **Grenadier's Arm** (`grenadiers_arm`) | Combat | new | Comic, Proud | Wick leans far back on one boot, a barrel bigger than itself hoisted overhead mid-throw, a little strain squiggle springing off its throwing shoulder | Gritted, straining | Barrel |
| 6 | **Glass Runner** (`glass_runner`) | Combat | new | Tense, Comic | Wick bursts off a starting block in a flat-out low sprint, speed lines behind, hairline fracture lines spidering up one shin like cracked glass | Determined, sweat drop | Starting block |
| 7 | **Blade Recluse** (`blade_recluse`) | Combat | new | Comic, Tender | Wick lies on its side, curled around a sword longer than its body like a sleeping partner, cheek pressed to the blade | Single heart symbol | Long sword |
| 8 | **Pain Eater** (`pain_eater`) | Combat | new | Grim | Wick crouches like a coiled spring, its shell split by one big crack, wiping its screen with the back of a mitten beneath a segmented bar drained below half | Manic grin | Segmented health bar, under half full |
| 9 | **Bottle Butts for Eyes** (`bottle_butts_for_eyes`) | Skill and state | new | Comic | Wick crawls on hands and knees, groping blindly along the floor for an enormous pair of round glasses lying just past its fingertips | Blurry squiggle eyes | Round glasses |
| 10 | **The Mask** (`the_mask`) | Skill and state | new | Comic, Eerie | Wick stands chest-out and chin high, lifting a large smiling mask halfway off its screen to reveal a small nervous face beneath | Tiny sweat-drop face | Smiling mask |
| 11 | **Machine-Faced** (`machine_faced`) | Skill and state | new | Eerie, Comic | Wick bends at the waist toward a big round hand mirror held at arm's length; the reflection shows the same blank screen staring back | Flat dash eyes, flat mouth | Hand mirror |
| 12 | **Right of Way** (`right_of_way`) | Skill and state | new | Proud, Comic | Wick limps forward on a stout cane, elbow out and chin high, while two motion arrows bend aside around it like traffic parting | Unbothered half-lids | Cane |
| 13 | **Drill Echo** (`drill_echo`) | Skill and state | new | Tense, Comic | Wick skids to a halt mid-sprint, one boot raised, clutching its head as an oversized stopwatch (tick marks only) swings on a cord from its neck | Circular restart-arrow symbol | Stopwatch |
| 14 | **The Old Blood** (`the_old_blood`) | Skill and state | revise | Ugly | Wick stands arms folded inside a chalk circle drawn tight around its boots, chin up, body turned three-quarters away from the open side of the frame | Narrowed eyes | Chalk circle on the ground |
| 15 | **Holo-Drama Addict** (`holo_drama_addict`) | Skill and state | new | Comic | Wick swoons backward theatrically, back of a mitten pressed to its brow, recoiling from an open manhole with stink lines curling out of it | Sparkly dramatic tear | Open manhole |
| 16 | **Oil in My Mind** (`oil_in_my_mind`) | Skill and state | new | Comic | Wick on tiptoe, nose almost touching a big empty picture frame, studies a single brushstroke with a mitten at its chin; its capelet corner curls like paper | Narrowed, analysing | Picture frame with one brushstroke |
| 17 | **Oil in My Soul** (`oil_in_my_soul`) | Skill and state | new | Tender | Wick kneels hugging a big picture frame to its chest, overcome; its capelet corner curls like paper | Streaming tears, soft smile | Picture frame |
| 18 | **Lunarshine** (`lunarshine`) | Skill and state | new | Comic, Grim | Wick sways tilted on one heel, toasting with a jug as big as its torso, free mitten raised in a gentlemanly flourish | Wobbly happy eyes | Jug |
| 19 | **Heavyworlder** (`heavyworlder`) | Skill and state | new | Comic | Wick is wedged sideways in a doorframe far too small for it, shoulders jammed, boots braced against the jamb | Grumpy flat brows | Doorframe |
| 20 | **Born Performer** (`born_performer`) | Skill and state | new | Eerie, Comic | Wick takes a deep sweeping bow inside a spotlight cone, one arm flourished wide, its tilted screen completely empty | Blank, switched-off screen | Spotlight cone (outline) |
| 21 | **Rabbit's Foot** (`rabbits_foot`) | Skill and state | revise | Comic, Tense | Wick flinches onto one leg, holding a rabbit's-foot charm about twice the test icon's size up beside its face, while an arrow passes harmlessly under its arm | Wide eyes, sweat drop | Rabbit's foot |
| 22 | **Ghost Soldier** (`ghost_soldier`) | Skill and state | new | Tense, Grim | Wick creeps on tiptoe in a low sneaking crouch, raising one finger of an oversized segmented prosthetic arm to its screen for silence | Thousand-yard stare | Prosthetic arm |
| 23 | **Symbol of Order** (`symbol_of_order`) | Karma | new | Proud | Wick stands rigidly at attention, thrusting a big shield-shaped badge out at arm's length the way an officer flashes ID | Stern flat brows | Badge (star, no text) |
| 24 | **Rogue Element** (`rogue_element`) | Karma | new | Comic | Wick hangs from an oversized spanner it has wedged into the teeth of a huge cog, legs kicking, a cracked tooth flying off | Gleeful grin | Spanner jammed in a cog |
| 25 | **The Soundscape of the Soul** (`the_soundscape_of_the_soul`) | Music | new | Tender | Wick floats on its back as if on water, holding a Musek Blestor to its chest while soft ripple rings spread out beneath it | Blissful closed eyes | Musek Blestor |
| 26 | **Headbanger** (`headbanger`) | Music | new | Comic | Wick is bent double mid-headbang, head whipping down, a Musek Blestor big as its torso slung on a strap and blasting jagged sound waves | Screwed-shut eyes, open yell | Musek Blestor |
| 27 | **Underground Sound** (`underground_sound`) | Music | new | Comic | Seen from three-quarters behind (capelet showing), Wick strolls with a smug head tilt and two pairs of headphones stacked on its head | Smug half-lids (in profile) | Stacked headphones |
| 28 | **Worldline Fracture** (`worldline_fracture`) | Worldline | new | Eerie | Wick leans through a jagged tear in the air; the half of its body on the far side of the tear is drawn upside down | Glitched, scattered pixels | The tear in the air |
| 29 | **Factory Made** (`factory_made`) | Origin | revise | Tender, Grim | Wick sits on a plain unmarked crate, screwing its own arm back onto its shoulder with an oversized screwdriver | Small determined face | Screwdriver (oversized) |
| 30 | **Lowland Born** (`lowland_born`) | Origin | new | Tense | Wick presses its back flat against a jagged ruined wall stub, peeking round the broken edge toward empty open ground | Shifty side-eyes | Ruined wall stub |
| 31 | **Central City Kid** (`central_city_kid`) | Origin | new | Comic, Ugly | Wick lounges back, held aloft by two partial hands rising from the bottom of the frame, flashing an oversized bank card | Snooty half-lids | Bank card |
| 32 | **Daggerfall Veteran** (`daggerfall_veteran`) | Origin | new | Grim | Wick sits on an upturned dented helmet, knees up, calmly ignoring a shell burst behind it | Tiny mushroom-cloud symbol | Dented helmet |
| 33 | **Upper-Touched** (`upper_touched`) | Origin | new | Eerie, Tender | Wick lies on its back waving up at a dotted-outline copy of its own head peering down over the top edge of the frame | Small wave-back smile | Dotted twin head |
| 34 | **Raised by Orks** (`raised_by_orks`) | Origin | redo | Comic | Wick sits like a toddler, crude war-paint stripes on its shell, happily teething on the handle of a notched Ork cleaver bigger than itself | Open-mouthed war-cry | Ork cleaver |
| 35 | **Gun Nut** (`gun_nut`) | Gun | new | Comic | Wick twists away possessively, hunched over a bundle of three rifles hugged tight to its chest, one boot lifted as if fleeing a buyer | Narrowed, protective | Bundle of three rifles |
| 36 | **Old School** (`old_school`) | Gun | new | Proud, Comic | Wick in a wide side-on gunslinger crouch fans the hammer of a big revolver with its free mitten | Cool squint | Revolver |
| 37 | **Spray and Pray** (`spray_and_pray`) | Gun | new | Comic | Wick staggers backward on its heels, hip-firing a huge automatic rifle, a waterfall of spent casings pouring past its boots | Eyes shut, open yell | Automatic rifle |
| 38 | **One Shot** (`one_shot`) | Gun | new | Tense | Wick lies prone behind a long scoped rifle, perfectly still, capelet flat over its back | Two pinhole eyes | Long rifle |
| 39 | **Sigil Savant** (`sigil_savant`) | Magic | new | Comic, Tender | Wick sits slumped asleep, head lolling, while one raised mitten traces a big geometric Sigil (no lettering) in the air from memory | Closed sleepy arcs | The Sigil |
| 40 | **Hollow Heart** (`hollow_heart`) | Magic | new | Grim, Eerie | Wick braces wide and thrusts both mittens forward, loosing huge, loud Soul-spell shockwave rings; its lantern window is an empty ring you can see straight through (allowed exception to the cross anchor: the hole is the trait) | Calm, flat, unafraid | Shockwave rings |
| 41 | **Heretic** (`heretic`) | Magic | new | Comic | Wick scampers off mid-stride, a stolen halo tucked under its arm like a hubcap, glancing guiltily back over its shoulder | Guilty grin | Halo |
| 42 | **Gambler** (`gambler`) | Vice | new | Comic, Tense | Wick squats low, blowing on a big unnumbered d20 cupped in both mittens before the throw | Spinning star eyes | d20 (faceted, no numbers) |
| 43 | **Insomniac** (`insomniac`) | Vice | new | Comic, Tense | Wick sits bolt upright in a bedroll, staring out into the dark, rigid and wide awake | Square eyes with heavy under-bars | Bedroll |
| 44 | **Chain Smoker** (`chain_smoker`) | Vice | approved (test set 1) | Comic | Wick leans on nothing, mid-cough, a cigarette between mitten fingers; the smoke trail forms a big arrow pointing at Wick | Watering eyes | Cigarette |
| 45 | **Live to Fight Another Day** (`live_to_fight_another_day`) | Vice | new | Comic, Grim | Seen from behind, capelet flying, Wick sprints away from a blank headstone, looking back over its shoulder | Wide eyes, sweat drop | Blank headstone |
| 46 | **Sworn Sibling** (`sworn_sibling`) | Bond | new | Tender, Tense | Wick lunges flat out toward the frame edge, its wrist bound by a knotted cord to a human hand reaching in from off-frame | Desperate, determined | Knotted cord |
| 47 | **Rival** (`rival`) | Bond | new | Comic | Wick stretches on tiptoe, arms folded, against a tall measuring post with a higher notch scratched just above its head | Pouting side-eye | Notched measuring post |
| 48 | **Humanity First** (`humanity_first`) | Bond | revise | Ugly | Wick holds up a placard bearing only a crossed-out Wick-face symbol, no words, the robot plainly Wick itself | Cheerful ^_^, unaware | The placard |
| 49 | **Wanted** (`wanted`) | Faction | new | Comic | Wick leans in, fist on hip, jabbing a finger at a nailed-up torn poster showing a lumpy, wrong scribble of its own head | Outraged | Poster (no words) |
| 50 | **Company Man** (`company_man`) | Faction | new | Comic, Ugly | Wick dances on puppet strings, toes barely touching, the strings rising to a control bar held by a hand at the top edge | Cheerful ^_^, oblivious | Puppet control bar and strings |
| 51 | **Field Medic** (`field_medic`) | Support and command | new | Heroic, Tender | Wick skids in on its knees, sliding sideways, a big stim injector raised high in one mitten ready to use | Focused, determined | Stim injector |
| 52 | **Squad Anchor** (`squad_anchor`) | Support and command | new | Proud | Wick braces in a wide squat, driving the fluke of a heavy anchor into the ground and holding its shaft upright like a standard | Set jaw, determined | Anchor |
| 53 | **Born Officer** (`born_officer`) | Support and command | new | Proud, Comic | Wick barks into an oversized loudhailer, the blast so strong its own capelet blows straight back | Shouting | Loudhailer |
| 54 | **Cold Case** (`cold_case`) | Mind-game | new | Tense, Comic | Wick crouches nose to the ground, peering through a big magnifying glass that blows one of its screen eyes up huge | One magnified eye | Magnifying glass |
| 55 | **Interrogator** (`interrogator`) | Mind-game | new | Grim, Ugly | Wick straddles a reversed chair, arms folded on its backrest, leaning in close toward the viewer and slowly cracking its mitten knuckles | Patient, flat | Reversed chair |
| 56 | **Trench Poet** (`trench_poet`) | Mind-game | new | Tender, Comic | Wick sits on a trench sandbag in a tin helmet, legs dangling, one arm raised, its big speech bubble holding only a drooping flower | Soulful closed eyes | Speech bubble with a flower |
| 57 | **Grudge Bearer** (`grudge_bearer`) | Mind-game | new | Ugly, Comic | Wick hunches over, glaring sideways, scratching one more tally mark onto a scroll so long it pools around its boots | Narrowed glare | Tally scroll |
| 58 | **Crowded Head** (`crowded_head`) | Mind-game | new | Comic, Tense | Wick squats with mittens clamped to its head as a burst of empty speech bubbles erupts from it, crowding each other | Spiral eyes | Burst of speech bubbles |
| 59 | **Market Blood** (`market_blood`) | Trade and deception | new | Comic | Wick squats on its heels holding a hand balance scale up at eye level, squinting as one pan sinks | Appraising squint | Balance scale |
| 60 | **Cover Story** (`cover_story`) | Trade and deception | new | Comic | Wick peeks over a fan of four ID cards held like a poker hand, each with a different tiny face, one card smoking | Wink | Fan of ID cards |
| 61 | **Inner Ring Heir** (`inner_ring_heir`) | Trade and deception | new | Comic, Tense | Wick struts nose-up mid-step, holding aloft its family crest shield, whose design is plainly a bullseye | Smug | Bullseye crest shield |
| 62 | **Slicer** (`slicer`) | Tech | new | Comic, Tense | Wick hangs upside down by its boots, plugging a cable from its head hinge into a security camera whose lens now shows Wick's face | Smug grin | Security camera on a cable |
| 63 | **Demolitionist** (`demolitionist`) | Tech | new | Comic | Wick squats with both mittens clamped over its side hinges as a huge cone-shaped blast fans out behind it | Dazed ringing squiggles | Shaped blast cone |
| 64 | **Drone Handler** (`drone_handler`) | Tech | new | Tender | Wick lies on its belly kicking its feet, chin in its mittens, gazing up at a little drone hovering overhead with a tiny parcel | Heart eyes | Drone |
| 65 | **Augmented** (`augmented`) | Tech | new | Comic | Wick springs high into the air on oversized piston legs, one knee joint throwing sparks | Delighted, small warning mark | Piston legs |
| 66 | **True Believer** (`true_believer`) | Faith and upper-realm | new | Tender | Wick kneels head bowed, cupped mittens raised, as a small star drops gently into them from above | Soft closed-eye smile | Falling star |
| 67 | **Heaven's Faithful** (`heavens_faithful`) | Faith and upper-realm | new | Tense, Tender | Wick huddles low, palms pressed together toward the sky, as a searchlight beam sweeps just over its head | Nervous upward glance | Searchlight beam |
| 68 | **Occultist** (`occultist`) | Faith and upper-realm | new | Eerie, Comic | Wick tiptoes away hugging an enormous chained grimoire, whose cover has grown a little mouth whispering at Wick's side hinge | Shifty side-eyes | Grimoire |
| 69 | **Crawler-Blooded** (`crawler_blooded`) | Body and blood | new | Tense, Eerie | Wick scuttles straight up a vertical wall on all fours, arms and legs plated with segmented chitin | Wary side-glance | Vertical wall face |
| 70 | **Old Timer** (`old_timer`) | Body and blood | new | Comic, Tender | Wick reclines in a rocking chair, a long drooping beard hooked over its screen, waving one mitten dismissively | Unimpressed half-lids | Rocking chair |
| 71 | **Pacifist** (`pacifist`) | Body and blood | new | Tender | Wick sits back on its heels, carefully knotting a big ribbon around a sheathed sword so the blade can't be drawn | Soft closed-eye smile | Ribbon-tied sheathed sword |
| 72 | **Moon Hunter** (`moon_hunter`) | Wilds and machines | new | Tense | Wick drops to one knee, one mitten pressed into a huge clawed paw print, the other shading its screen as it stares into the distance | Focused narrow eyes | Paw print |
| 73 | **Beast Handler** (`beast_handler`) | Wilds and machines | new | Tender | Wick rides belly-down on a huge shaggy back, the beast's head off-frame and only one ear showing, hugging the fur | Content closed eyes | The beast's back (partial) |
| 74 | **Ace Pilot** (`ace_pilot`) | Wilds and machines | new | Heroic, Comic | Wick leans hard into a bank, gripping a big steering yoke with nothing around it, goggles up, capelet whipping, speed lines streaming | Wild grin | Steering yoke |

## Requirements: perks (106)

Acquired perks come two per skill (one perk step at each of 3, 5, 7 and 9 points; the icon doesn't change at Tier II). Mastered perks come one per skill, at 10 points. Achieved perks combine skills plus a deed; Ultimate perks combine two Achieved perks and may be more dramatic, under the same rules.

### Acquired (54)

| Perk (id) | Skill(s) | Status | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|---|
| **Stonewall** (`bulwark`; was Bulwark) | Durability | new | Heroic, Proud | Wick braces a tall riot shield in a low side-on lunge, bullets bouncing off its front, a tiny Wick silhouette crouched safe behind it. | Determined, sloping brows | Riot shield |
| **Shrug It Off** (`shrug_it_off`) | Durability | new | Comic | Wick, half-hunched, straightens with one big shoulder shrug that flings a heavy iron shackle off its back to clang away. | Unimpressed flat bars | Iron shackle |
| **Used to the Pain** (`used_to_the_pain`) | Pain Threshold | new | Comic, Proud | Knocked to one knee by a big brick that just bounced off its head, Wick is already springing up, fists raised. | Charging bar filling up | Bouncing brick |
| **Scar Tissue** (`scar_tissue`) | Pain Threshold | new | Grim, Calm | Wick sits calmly and holds its riveted, patch-plated arm straight into a big tongue of fire, as if warming it. | Content small smile | Tongue of fire |
| **Wind on the Skin** (`wind_on_the_skin`) | Sensory | new | Eerie, Tense | Wick kneels, eyes closed, one mitten raised into a long wind streak that curls past it and ends at a pair of eyes in the dark. | Closed-eye arcs | Wind streak |
| **Bedside Manner** (`bedside_manner`) | Sensory | new | Calm, Tense | Wick leans in and clasps a hand entering frame in both mittens, a warm firm handshake, head tilted to listen. | Jagged pulse line | The clasped hand |
| **Breaching Strike** (`breaching_strike`) | Raw Power | new | Heroic | Wick swings a sledgehammer bigger than itself through a sandbag barricade in a full twisting follow-through, sandbags flying back. | Fierce | Sledgehammer |
| **Grapple** (`grapple`) | Raw Power | new | Comic, Tense | Wick clamps itself around a huge armoured forearm entering frame, arms and legs wrapped tight, boots off the ground, refusing to let go. | Gritted teeth | Armoured forearm (partial) |
| **Into the Dark** (`into_the_dark`) | Guts | new | Tense, Proud | Seen from behind, cape prominent, Wick strides without pause through a pitch-black doorway that looms over it. | Hidden (from behind) | Dark doorway |
| **Iron Stomach** (`iron_stomach`) | Guts | new | Comic | Wick sits with legs stuck out, happily slurping straight from a dented tin can that pours out thick wavy stink lines. | Delighted ^_^ | Dented tin can |
| **Grim Reaper** (`grim_reaper`) | Intimidation | new | Grim, Comic | Wick, cape pulled up into a hood, leans casually on a scythe taller than itself as three AP pips spark up off the blade; a shadow flees at the frame edge. | Narrowed eyes | Scythe |
| **Bone Talk** (`bone_talk`) | Intimidation | new | Grim, Comic | Wick leans right into the viewer, screen close and foreshortened, slowly clacking a big pair of pliers between them. | Flat unblinking smile | Pliers |
| **Wall Run** (`wall_run`) | Athletics | new | Heroic, Comic | Wick runs sideways along a vertical wall, body parallel to the ground, cape streaming, above a gap that drops away below. | Delighted | The wall |
| **Roll With It** (`roll_with_it`) | Athletics | new | Comic | Wick tumbles in a tight forward roll, curled into a ball, as a big sword blade sweeps through the air just above it. | Dizzy swirl | Sword blade (partial) |
| **Origami Hands** (`origami_hands`) | Dexterity | new | Comic, Calm | Wick squats on its heels folding a scrap sheet into a big toothy bear trap, the last fold snapping into place. | Tongue-out concentration | Folded bear trap |
| **Running Reload** (`running_reload`) | Dexterity | new | Heroic, Tense | Wick sprints mid-stride, slapping a fresh magazine into a big pistol, motion lines behind both feet. | Focused | Pistol and magazine |
| **Rounding Up** (`rounding_up`) | Reaction Speed | new | Comic | Wick leans on a battery cell as tall as itself, cheekily pushing its half-full charge mark up to the top with one mitten. | Sly grin | Battery cell |
| **Catch** (`catch`) | Reaction Speed | new | Tense, Comic | Wick leaps and snatches a grenade out of the air one-handed, body already twisting to wind back for the throw. | Wide eyes "!" | Grenade |
| **Sleight of Hand** (`sleight_of_hand`) | Ingenuity | new | Comic, Tense | On tiptoe, Wick slips a round fused bomb into a big coat pocket hanging into frame, its other mitten raised for hush. | Shifty side-glance | Round fused bomb |
| **Shadow Step** (`shadow_step`) | Ingenuity | new | Tense | Wick crouches with its back pressed flat to a chunk of broken wall, peeking round the edge, one boot lifted for the next dash. | Narrowed eyes | Broken wall chunk |
| **Jury-Rig** (`jury_rig`) | Proficiency | new | Comic, Tense | Wick kneels, bracing a cracked rifle wrapped in thick tape on its knee as it coughs out one last sputtering shot. | Wince, sweat drop | Taped rifle |
| **Hot-Swap** (`hot_swap`) | Proficiency | new | Comic | Mid-twirl on one boot, Wick flips a pistol behind its back from one mitten to the other, a curved swap arrow looping around its waist. | Cocky smirk | Pistol |
| **Got You in My Sight** (`got_you_in_my_sight`) | Vigilant | new | Tense | Wick lunges and snatches the hem of a dashed-outline cloak as it fades to nothing; its wearer is already gone. | Crosshair | Fading cloak |
| **Eyes in the Back** (`eyes_in_the_back`) | Vigilant | new | Calm, Comic | Seen from behind, cape prominent, Wick holds a big round hand-mirror up over its shoulder, watching the way it isn't facing. | One wide eye, seen in the mirror | Hand-mirror |
| **Hold the Stroke** (`hold_the_stroke`) | Brain Power | new | Tense | Wick braces an Evoker in both mittens, knees buckling, as a tall stack of unreleased geometric sigil strokes hovers queued over its muzzle. | Strained, full loading bar | Evoker |
| **Parallel Thought** (`parallel_thought`) | Brain Power | new | Calm, Proud | Wick sits with one knee up, drawing a new geometric sigil with its Evoker while a finished sigil still spins on its free mitten. | Two interlocking gears | Evoker |
| **Footnote** (`footnote`) | Rumination | new | Comic, Proud | Wick pops up from behind a giant open book with blank ruled pages, one mitten raised, finger pointing skyward to make a point. | Lightbulb | Giant open book |
| **Lab Coat** (`lab_coat`) | Rumination | new | Calm, Comic | Wick squats inside a curling cloud of gas, holding up a flask to compare it with the fumes, unbothered as the gas parts around it. | Pensive lowered lids | Flask |
| **Overruled!** (`overruled`) | Eloquence | new | Comic, Proud | Wick leaps off both boots, swinging a gavel bigger than its head down onto a sounding block, a motion arc behind it. | Triumphant grin | Gavel |
| **Burden of Proof** (`burden_of_proof`) | Eloquence | new | Comic | Wick holds an empty box upside down at arm's length and shakes it; nothing falls out but a single dust puff. | One raised brow, flat mouth | Empty box |
| **Mirage** (`mirage`) | Visualization | new | Comic, Eerie | Wick leans halfway out through a dashed-outline wall that it projects from one raised mitten, giving the trick away. | Wink | Projected dashed wall |
| **Blueprint** (`blueprint`) | Visualization | new | Calm, Proud | Wick kneels over a big unrolled plan, drawing a bold route arrow across it with a chalk stick. | Focused, tongue out | Unrolled plan |
| **Detective's Eye** (`detectives_eye`) | Analysis | new | Calm, Comic | Wick lies prone, chin on the ground, peering through a magnifying glass bigger than its head at one out-of-place footprint. | One big eye | Magnifying glass |
| **Pattern Lock** (`pattern_lock`) | Analysis | new | Calm, Proud | Wick leans back just far enough as a big blade thrusts past its screen from frame edge, mittens loose and casual. | Looping replay arrow | Thrusting blade (partial) |
| **Talks Broke Down** (`talks_broke_down`) | Charisma | new | Comic | From a low squat, Wick heaves a negotiating table up and over, cups and blank papers flying, already grinning. | Wild grin | Negotiating table |
| **Crowd Pleaser** (`crowd_pleaser`) | Charisma | new | Comic, Proud | Wick crowd-surfs on its back, arms flung wide, borne along on a wave of tiny raised hands that fills the lower third. | Delighted open mouth | Wave of raised hands |
| **Shared Breath** (`shared_breath`) | Empathy | new | Tender, Calm | Wick kneels, eyes closed, one mitten on its lantern heart; a single ribbon runs from the heart out of frame to a hand gripping it. | Soft closed-eye arcs | Ribbon from the heart |
| **Lay Down Arms** (`lay_down_arms`) | Empathy | new | Tender, Tense | Wick steps close and gently presses a rifle barrel, poking in from frame edge, down toward the ground with one open mitten. | Soft smile | Rifle barrel (partial) |
| **Soulmate** (`soulmate`) | Camaraderie | new | Tender | Wick curls over a tiny Wick silhouette, cape spread over both like a tent, as cracks from a blow spread across Wick's own back. | Tender closed eyes | Spread cape |
| **Rally Cry** (`rally_cry`) | Camaraderie | new | Heroic, Grim | In a deep lunge, Wick drives a torn, blank banner pole into the ground with both mittens, mouth wide in a shout. | Shouting | Torn banner |
| **Sweet Talker** (`sweet_talker`) | Implication | new | Comic, Tender | Wick lounges on one elbow on thin air, offering a long-stemmed rose; a thorn has pricked its mitten, a tiny pain star at the spot. | Heart eyes | Rose |
| **Double Meaning** (`double_meaning`) | Implication | new | Comic | Wick sits sideways on a low ledge, winking at the viewer, as its single blank speech balloon forks into two tails pointing opposite ways. | Wink | Forked speech balloon |
| **Heart Overload** (`heart_overload`) | Will Power | new | Grim, Heroic | Wick lunges, thrusting an Emanator gauntlet that pours out a flowing ribbon blast, while thick cracks spider out from its own lantern heart. | Gritted teeth | Emanator gauntlet |
| **Resonance** (`resonance`) | Will Power | new | Calm | Wick crouches holding up a large tuning fork that hums in concentric rings, catching a soul ribbon drifting in from off frame. | Eyes closed, small smile | Tuning fork |
| **Old Tongue** (`old_tongue`) | Lore Master | new | Eerie, Calm | Wick kneels nose-close to a tall cracked stone slab, tracing its carved spirals and dots (no letters) with one mitten. | Bright wide eyes | Carved stone slab |
| **Rite in the Field** (`rite_in_the_field`) | Lore Master | new | Tense, Comic | Wick lies flat in a shallow trench, hammering a carved ward stake into the dirt with its fist as streaks fly overhead. | Hurried, sweat drop | Ward stake |
| **You Get Used to It** (`you_get_used_to_it`) | Composure | new | Calm, Comic | Wick holds a big umbrella over a tiny Wick silhouette while a rain of scribbly squiggles pours down, looking utterly bored. | Bored half-lids | Umbrella |
| **Flat Line** (`flat_line`) | Composure | new | Eerie, Comic | Wick sits bolt upright on a stool, teacup raised halfway, staring dead at the viewer without moving. | A single flat line | Teacup |
| **Litany** (`litany`) | Faith | new | Calm, Tender | Wick kneels with head tilted up, prayer beads wound through both mittens, singing, thin radiant lines fanning above it. | Closed eyes, small open mouth | Prayer beads |
| **Holy Ordnance** (`holy_ordnance`) | Faith | new | Heroic, Comic | Wick raises a rifle magazine overhead in both mittens like a relic, thick radiant rays bursting from it. | Sparkle star | Rifle magazine |
| **Red Line** (`red_line`) | Conscience | new | Tense, Proud | Wick leans far back, heels dug in at a thick line on the ground, as a crooked beckoning hand reaches from the far side. | Stubborn frown | Thick ground line |
| **Clean Hands** (`clean_hands`) | Conscience | new | Tender, Proud | Wick sits back on its heels, both empty mittens raised palms-out, a knife it just dropped stuck point-down in the ground before it. | Calm small smile | Dropped knife |
| **Outclassed** (`outclassed`) | Authority | new | Proud, Comic | Wick sits cross-legged on a toppled, empty enemy helmet as big as itself, buffing one mitten on its chest. | Smug half-lids | Empty enemy helmet |
| **Real Power** (`real_power`) | Authority | new | Eerie, Comic | Wick crouches beneath a small crown dangling on puppet strings, ignoring it, one mitten pointing up the strings to where they vanish. | Knowing narrowed eyes | Crown on strings |

### Achieved (19)

| Perk (id) | Skill(s) | Status | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|---|
| **Charge!** (`charge`) | Intimidation, Athletics | new | Heroic, Comic | Wick sprints flat-out, body leaning almost horizontal, a bayonet rifle levelled ahead, mouth wide in a roar, dust kicking up behind. | Roaring mouth | Bayonet rifle |
| **Make Way** (`make_way`) | Intimidation, Charisma | new | Proud, Calm | Wick strolls chin-high, mittens clasped behind its back, no weapon at all, as two walls of shoulder silhouettes lean away on either side. | Serene closed-eye smile | Parting crowd (two flat masses) |
| **Just the Repairman** (`just_the_repairman`) | Ingenuity, Eloquence | new | Comic, Tense | Caught in a searchlight cone, Wick strolls past waving cheerily, a big toolbox swinging from the other mitten. | Innocent smile, sweat drop | Toolbox |
| **Spoon-Feed** (`spoon_feed`) | Brain Power, Rumination, Eloquence | new | Comic, Tender | Wick kneels and holds a huge spoon out to the viewer, a small geometric sigil (lines and angles, no letters) balanced in its bowl. | Encouraging open "aah" mouth | Huge spoon |
| **Cultured** (`cultured`) | Lore Master, Camaraderie | new | Tender, Comic | Wick sits on a stool strumming a small round-bodied lute, eyes closed, one boot tapping, a few music notes drifting up. | Closed eyes, small smile | Lute |
| **Field Surgeon** (`field_surgeon`) | Proficiency, Camaraderie | revise | Tender, Comic | Wick kneels and tightens a big wrench on the knee of a bandaged leg entering frame from the side; nothing else of the patient shows. | Concentrating, tongue out | Wrench |
| **Dance of Iron** (`dance_of_iron`) | Dexterity, Athletics | new | Heroic, Comic | Wick turns a one-handed cartwheel, fully upside down, the other mitten firing a pistol back under its body, a muzzle-flash star. | Cool narrowed eyes | Pistol |
| **Cold Read** (`cold_read`) | Empathy, Analysis | new | Eerie, Tender | Wick crouches and peers through a big heart-shaped keyhole plate held up in both mittens like a frame. | One magnified eye | Heart-shaped keyhole |
| **Fire Sermon** (`fire_sermon`) | Faith, Eloquence | new | Heroic, Eerie | Wick lunges forward, thrusting a burning open book with blank pages overhead, mouth wide mid-sermon, radiant lines behind. | Shouting | Burning book |
| **Silent Partner** (`silent_partner`) | Ingenuity, Camaraderie | new | Comic, Tense | Wick crouch-walks behind a big leafy branch, holding it as cover for itself and a tiny Wick silhouette tiptoeing in step beside it. | Zipped "shh" mouth | Leafy branch |
| **Verse of War** (`verse_of_war`) | Implication, Will Power | new | Heroic, Comic | Wick strikes a poet's pose, one mitten over its lantern heart, the other flung out as a long soul ribbon unspools in one flowing curve. | Closed eyes, declaiming mouth | Soul ribbon |
| **Between Heartbeats** (`between_heartbeats`) | Reaction Speed, Composure | new | Calm, Tense | Wick steps calmly around a bullet hanging frozen in the air beside its head, one mitten raised to flick it aside. | One heart, mid-beat | Frozen bullet (oversized) |
| **Siege Engine** (`siege_engine`) | Raw Power, Durability | new | Heroic, Comic | Wick barges shoulder-first through a brick wall, bricks flying and bouncing harmlessly off its shell, never breaking stride. | Determined | Bursting brick wall |
| **Dead Signal** (`dead_signal`) | Proficiency, Ingenuity | new | Tense, Comic | Wick hangs one-handed from a security camera's bracket arm, pulling its cable plug with the other mitten; the camera's head droops. | Zipped mouth | Security camera |
| **Twin Souls** (`twin_souls`) | Will Power, Lore Master | new | Comic, Eerie | Wick sits on the ground holding a tin-can telephone to its head; the taut string runs straight up out of frame. | "?" | Tin-can telephone |
| **The Voice** (`the_voice`) | Authority, Composure | new | Proud, Eerie | Wick stands at parade rest, officer's baton under one arm, staring dead ahead; one heavy sound ring drops from its screen and flattens the dust. | Stern flat stare | Officer's baton |
| **Bite the Bullet** (`bite_the_bullet`) | Guts + Pain Threshold | new (5 Nov) | Grim, Heroic | Wick, dented and smoking, pushes up off one knee with a big bullet clamped sideways across its screen like a bit, one fist planted on the ground. | Gritted pixel teeth | Bullet |
| **Sixth Sense** (`sixth_sense`) | Sensory + Vigilant | new (5 Nov) | Tense, Eerie | Wick crouches low with its capelet pulled up like a hood, a humming tuning fork held above its head; a dotted trail of footprints creeps in from behind it. | Eyes wide, glancing sideways | Tuning fork |
| **What Could Be** (`what_could_be`) | Visualization + Conscience | new (5 Nov) | Tender, Hopeful | Wick holds up a hand mirror toward the viewer; the mirror shows a small sun and a sprouting flower where the frame around Wick is bare. | Soft, hopeful eyes | Hand mirror |

### Ultimate (6)

| Perk (id) | Skill(s) | Status | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|---|
| **War Footing** (`war_footing`) | Charge! + Make Way (Intimidation, Athletics, Charisma) | new | Grim, Heroic | Wick stomps down from a high knee and the ground cracks around it into a three-by-three grid of broken slabs, cape snapping. | Glowering | Cracked slab grid |
| **Last Charge** (`last_charge`) | Charge! + Cultured (Intimidation, Athletics, Lore Master, Camaraderie) | new | Heroic | Wick leaps forward at the end of a long charge, sword raised in both mittens, wrapped in a big bubble shield, speed lines far behind. | Roaring | Sword |
| **Angel of the Trenches** (`angel_of_the_trenches`) | Field Surgeon + Between Heartbeats (Proficiency, Camaraderie, Reaction Speed, Composure) | new | Heroic, Tender | Wick slides in on its knees through a spray of dirt, catching a limp hand dropping into frame, cape flaring behind like wings. | A single heart | Limp hand (partial) |
| **Every Lie Is a Door** (`every_lie_is_a_door`) | Just the Repairman + Cold Read (Ingenuity, Eloquence, Empathy, Analysis) | new | Comic, Proud | Wick strides unhurried through a towering door that swings wide open for it, tipping a cap toward the viewer. | Wink | Towering open door |
| **Twin Discipline** (`twin_discipline`) | Twin Souls + Spoon-Feed (Will Power, Lore Master, Brain Power, Rumination, Eloquence) | new | Heroic, Eerie | Wick leaps and claps both mittens overhead: hard geometric sigil lines trail one arm, flowing soul ribbons the other, fusing into one burst. | Fierce delight | Fused burst |
| **Supreme Command** (`supreme_command`) | The Voice + Make Way (Authority, Composure, Intimidation, Charisma) | revise | Heroic | Wick stands on an unmarked ammo crate, one mitten pointing forward, as three tiny Wick silhouettes sprint the way it points. | Shouting | Ammo crate |

### Mastered (27)

**New, 5 November 2026 (Batch G).** Each skill's capstone: granted automatically at 10 points, the most a skill can have. In the game they sit on a gilded card inside a round medallion, in the skill's attribute colour. The icon itself stays **pure white flat ink** like every other perk (rule 8). What makes them read as Mastered:

1. **The Mastered mark:** one small four-pointed star (✦ shape), the same size (about a tenth of the frame) and in the same place (upper left, clear of Wick's head) on all 27. Nothing else in the icon uses that shape. It's the only extra element allowed besides the one prop.
2. **A capstone moment:** the pose is the peak of the skill, a little more ceremonial than an Acquired perk (a planted stance, a big gesture, a held beat), but the comedy and Wick's personality stay.
3. **Fits the medallion:** keep Wick, the prop and the mark inside a centred circle of 90% of the frame; the UI shows these icons in a ring at 72–92 px.
4. **Its own silhouette:** never reuse the silhouette of either Acquired perk of the same skill.

Rules text is in `data/perks.json` (tier `mastered`; the file on this branch is current) and in the [queue snapshot](../_archive/traits/wick/pending-at-usage-limit-2026-11-05.json). Deliver to `art/icons/perks/` with the usual exports and catalog entries (family `perks`, `status: "review-candidate"`).

| Perk (id) | Skill | Status | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|---|
| **Last Wall** (`last_wall`) | Durability | new | Heroic, Grim | Wick plants itself in the gap of a broken brick wall, arms locked wide across the hole, feet braced; a flattened bullet drops off its chest plate. | Eyes shut, calm | Broken wall |
| **Walking Wounded** (`walking_wounded`) | Pain Threshold | new | Comic, Proud | Wick strides forward mid-step, one leg wrapped in a long trailing bandage, flinging a crutch away over its shoulder. | Gritted-teeth grin | Tossed crutch |
| **Skin Map** (`skin_map`) | Sensory | new | Eerie, Calm | Wick kneels low with one mitten pressed flat to the floor; big ripple rings spread out from the palm across the ground to the frame edges. | Eyes closed | Ripple rings in the floor |
| **Earthbreaker** (`earthbreaker`) | Raw Power | new | Heroic | Wick at the top of an overhead swing, both mittens on a huge sledgehammer, about to bring it down; a deep starburst crack already splits the ground below. | Roaring | Sledgehammer |
| **Nothing Left to Fear** (`nothing_left_to_fear`) | Guts | new | Comic, Eerie | Wick sits cross-legged on top of a giant sleeping monster's horned head (only the head top shows, filling the bottom of the frame), calmly sipping from a teacup. | Content, half-lidded | Teacup |
| **The Name They Whisper** (`the_name_they_whisper`) | Intimidation | new | Grim, Eerie | Wick stands in a bright open doorway, back-lit, its long shadow stretching all the way toward the viewer; two tiny Wick silhouettes duck behind cover in the foreground. | Two thin glowing slits | Long shadow |
| **Never There** (`never_there`) | Athletics | new | Comic, Proud | Wick mid-backflip, upside down, with two fading dashed outlines of itself trailing behind; a bullet streaks through the empty outline. | Smug wink | Dashed afterimages |
| **Trick Shot** (`trick_shot`) | Dexterity | new | Proud, Comic | Wick fires a revolver backwards over its own shoulder without looking; a dotted line bounces off a tin can and curves out of frame. | Bored, eyes closed | Revolver |
| **Before the Blink** (`before_the_blink`) | Reaction Speed | new | Tense | Wick explodes out of a sprinter's crouch, already one stride gone, beside a big pocket stopwatch whose hand still points straight up. | Wide, focused | Stopwatch |
| **Vanishing Act** (`vanishing_act`) | Ingenuity | new | Comic, Eerie | Wick whips its capelet out into a huge magician's sweep; the lower half of its body is already gone, shown only as a dotted outline. | Wink | Swept cape-cloth |
| **Overhaul** (`overhaul`) | Proficiency | new | Proud | Wick sits on the ground cradling a rebuilt rifle across its lap like a prize, one extra rail gleaming, a wrench tucked behind its head like a pencil. | Delighted | Rebuilt rifle |
| **Nothing Gets Past** (`nothing_gets_past`) | Vigilant | new | Tense, Heroic | Wick kneels with a rifle shouldered inside a wide fan of light sweeping out like a lighthouse beam; three small dash marks sit in the beam where shots landed. | Narrowed eyes | Sweeping light cone |
| **Clean Draw** (`clean_draw`) | Brain Power | new | Calm, Eerie | Wick stands on one foot, one finger tracing a single perfect geometric sigil in the air in one unbroken line; no sparks, no smoke anywhere. | Serene | One-line sigil |
| **Established Fact** (`established_fact`) | Rumination | new | Comic, Proud | Wick brings a huge rubber stamp down with both mittens onto a blank sheet, leaving one big checkmark. | Satisfied | Rubber stamp |
| **Closing Argument** (`closing_argument`) | Eloquence | new | Comic | Wick walks away from the viewer, back turned, cape swinging, having just let go of a microphone that's falling behind it. | Seen from behind: none | Dropped microphone |
| **Solid Image** (`solid_image`) | Visualization | new | Comic, Eerie | Wick leans its whole weight back against a wall drawn in dashed lines, arms folded, and the dashed wall holds it up. | Smug | Dashed wall |
| **Case Closed** (`case_closed`) | Analysis | new | Proud | Wick perches on the edge of a desk, slapping a thick case folder shut, its string tie flying. | Satisfied grin | Case folder |
| **Everyone's Friend** (`everyones_friend`) | Charisma | new | Comic, Tender | Wick beams as a stranger's hand (entering from the frame edge) drops a ring of keys into its open mitten. | Hearts | Ring of keys |
| **Open Hand** (`open_hand`) | Empathy | new | Tender | Wick kneels and holds out a small flower toward an armoured gauntlet (partial, entering from the side) that is lowering its blade. | Soft smile | Flower |
| **Many Hands** (`many_hands`) | Camaraderie | new | Heroic, Tender | Seen from above: Wick in a team huddle, its mitten at the bottom of a pile of hands stacked from every side of the frame (all partials). | Determined smile | Pile of hands |
| **Their Own Idea** (`their_own_idea`) | Implication | new | Comic, Eerie | Wick whispers behind one mitten toward a big ear (partial, from the frame edge), above which a lightbulb has just switched on. | Sly | Lightbulb |
| **The Twin Pays** (`the_twin_pays`) | Will Power | new | Eerie, Comic | Wick holds a soul flame high in one mitten while a coin drops from the top edge of the frame into its other open mitten. | Pleased | Falling coin |
| **True Name** (`true_name`) | Lore Master | new | Grim, Eerie | Wick holds up an unrolled scroll showing one sigil (a symbol, never letters) toward a huge horned shadow at the frame edge, which shrinks back. | Stern | Unrolled scroll |
| **Still Water** (`still_water`) | Composure | new | Calm | Wick sits perfectly still on one stepping stone in flat water, a tea bowl balanced on its head, no ripple anywhere. | Flat line, eyes closed | Tea bowl on its head |
| **Judgement Day** (`judgement_day`) | Faith | new | Grim, Heroic | Wick raises a tall crozier staff overhead and a single shaft of light spears down from above onto the ground in front of it. | Stern glare | Crozier staff |
| **Foreseen** (`foreseen`) | Conscience | new | Tense, Calm | Wick stands at a signpost at a fork; one arrow is crossed out, and Wick glances back over its shoulder toward it before taking the other road. | Thoughtful | Two-arrow signpost (no text) |
| **On My Mark** (`on_my_mark`) | Authority | new | Heroic | Wick leans forward pointing hard with one mitten, a whistle at its screen, cape snapping; motion lines run the way it points. | Shouting | Whistle |
