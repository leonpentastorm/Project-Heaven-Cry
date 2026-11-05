# Wick: ten test icons before the style is locked for production

The Mind Without Fog master is approved. Before 150 trait and perk icons are made from one example, make these ten. Together they test every mood the set has to carry: grim, comic, ugly and tender, two perks, a robot trait, and a crowded idea. Lock the production rules only after all ten pass review.

**For every icon:** attach `art/style-guide/v1.3/references/approved-wick-trait-mind-without-fog.png` and the Wick sections of `art/style-guide/v1.3/`. Pure white `#FFFFFF` flat ink on transparency, 1024 × 1024 master, no caption. Traits and perks are both white.

**Base prompt** (from `Prompt-Templates.txt`, v1.3): *Use approved-wick-trait-mind-without-fog.png as the primary style reference. Preserve the short cape, lantern heart, off-centre details, irregular contours and lively asymmetry. New action: [action]; screen expression: [expression]; prop: [one]. Flat single-ink illustration with negative-space details, no gradients, glow or rendered shading. Ink: pure white #FFFFFF, for traits and perks alike. Transparent background unless another background is requested; no caption. 1:1 1024 × 1024 master with safe margins. Test at 64 px without replacing the character with a geometric pictogram.*

## Pass criteria (check every icon)

1. **40 px read:** composite on `#10151F`, shrink to 40 px. A player who knows the trait names should be able to pick this one out of the ten.
2. **The prop or action carries the meaning, not the robot.** If you cover Wick's body and the icon still says the trait, it passes. If only the label says it, redo it.
3. **Capelet visible** at 64 px.
4. **Medical cross** on the heart has thick, equal arms; it must not read as a gun sight.
5. **Silhouette differs** from the other nine: different pose, different centre of mass.
6. No colour, glow, gradient or soft shadow. Meaning survives in pure white.

## The ten

| # | Item | Mood | Action | Screen | One prop |
|---|---|---|---|---|---|
| 1 | **Humanity First** (trait) | Ugly | Wick holds up a "HUMANS ONLY" placard with a crossed-out robot drawn on it, the robot plainly Wick itself | Cheerful ^_^, unaware | The placard |
| 2 | **The Old Blood** (trait) | Ugly | Wick stands inside a chalk circle, arms folded, turned away from an outstretched hand entering the frame | Narrowed eyes | Chalk circle on the ground |
| 3 | **Factory Made** (trait) | Tender, grim | Wick sits on a crate stencilled with a serial number, screwing its own arm back on | Small determined face | Screwdriver |
| 4 | **Chain Smoker** (trait) | Comic | Wick leans on nothing, mid-cough, a cigarette between mitten fingers; the smoke trail forms a big arrow pointing at Wick | Watering eyes | Cigarette |
| 5 | **Raised by Orks** (trait) | Comic | Wick holds a document upside down, squinting, with a crude Ork cleaver slung on its back | Confused "?" | Upside-down page |
| 6 | **The Brightest Light** (trait) | Grim | Wick mid-stride, its lantern heart flaring into a big flame that is visibly burning the capelet's hem | Manic grin | The flame |
| 7 | **Rabbit's Foot** (trait) | Comic, tense | Wick clutches a rabbit's foot charm while an arrow passes harmlessly under its arm | Wide eyes, sweat drop | Rabbit's foot |
| 8 | **Forlorn Hope** (trait) | Grim, proud | Wick charges forward, bare-chested (no armour plate), one arm flung back, the capelet streaming | Fierce | None; the pose carries it |
| 9 | **Field Surgeon** (Achieved perk, Proficiency + Camaraderie) | Tender | Wick kneels, applying a wrench to a fallen human soldier's bandaged leg as if it were a machine | Concentrating | Wrench |
| 10 | **Supreme Command** (Ultimate perk) | Heroic | Wick stands on an ammo crate, one mitten pointing forward, with three tiny Wick silhouettes already running in that direction | Shouting | Ammo crate |

Item texts are in `data/traits.json` and `data/perks.json`. If an icon would need two props, cut one.

## After the ten

Review them side by side at 40 px and at 128 px. Then update the icon-lock section with anything the ten taught (for example, a minimum capelet size), and only then start production. Record the approved ten in a new versioned folder, `art/traits/wick/test-set-1/`, and add them to `art/catalog.json`.
