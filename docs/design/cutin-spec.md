# Spotlight cut-ins: torn eye strips (design, 9 Nov 2026)

Status: **built** (decision 113; see section 11 for what the build changed or left out), open questions in section 10
for Leon. Presentation only: no rule, no number the engine resolves, no dice changes. Built on branch
`claude/awesome-babbage-8gngk8` from develop 0.5.0, merged with develop 0.8.0 (Faith 2.2 and the brass; section 12),
then given the combat crits (section 1.4) and the god interjection's final path (section 12) on Leon's rulings of
9 Nov 2026.

Leon's request (9 Nov 2026): *"I want a cut in UI system that blurs the screen a bit when these moment happen, in
combat it makes the attack you are about to perform 15% slower for visual flair. It's one of those JRPG system when the
screen is tear appart and the character art appear."* He sent four references: JRPG eye-strip cut-ins (horizontal torn
strips across the screen, each showing one character's eyes, sliding in and stacking for group moments). He added that
another implementer is building a **god interjection** system that needs this UI to fire, and will leave a trigger.

Read with: `CLAUDE.md` (the asset rule, colour = meaning), `docs/design/colour-system.md`,
`apps/web/src/game/turnIntro.tsx` (the your-turn cut-in: its plumbing, cues and styles are reused here),
`apps/web/src/game/fx/play.ts` (the effects queue and `window.__phcHold`), `packages/engine/src/music.ts` (`startSong`)
and `packages/engine/src/faith.ts` (interventions).

## 0. Originality (binding)

The eye strip is a genre convention; its best-known form has a specific look we must **not** copy: no red/black/white
scheme, no ransom-note or that series' type, no halftone dots, no white star bursts, no copied layout or timing. PHC's
version is built from what PHC already has:

- **Heavenprint portraits** (the painted 4:5 character and patron art), never flat cel art.
- **The strip is torn and inked in the character's colour**: the ink of their highest attribute (the nine UI inks in
  CLAUDE.md); for a god, the patron's accent (`faithArt.ts` `PATRON_ACCENT`).
- **Dark PHC neutrals** for the strip's body (`#0A0D13`, `#10151F`) and the blur behind.
- **Spectral** for the name and the caption (prose, like the story stream); **Chakra Petch** for the small label.
- Tear edges are **SVG**, drawn from a seeded jagged polygon, so the same moment tears the same way on every screen.
- One wordmark per moment, always a word beside the colour (the colour rule): `TAKEDOWN · AGILITY`.

## 1. What fires it

### 1.1 Spotlight moments (the music's own list, spec: Music, "The spotlight")

Every place the engine calls `startSong(…, 'spotlight', …)` also emits a `spotlight` fx event, **whether or not the
song starts** (the song keeps its own once-per-scene rule; how often the cut-in shows is the player's setting, §7).

| Kind | Where (engine) | When | Strips |
|---|---|---|---|
| `crit` | `game.ts` check/roll, check/reroll, check/accept (~591) | A natural 20 that succeeds on TN 16 (Hard) or 20 (Heroic) | the roller |
| `takedown` | `game.ts` `songTriggers` (~1402) | A PC's action kills an **elite or boss** (`tier === 'elite' \|\| 'boss'`) | the actor |
| `revive` | `songTriggers` (~1403) | A PC's action brings a Downed ally back | the actor, then the revived |
| `ultimate` | `game.ts` `awardAutomatic` (~1107) | An Ultimate perk is granted | the holder |
| `legend` | `game.ts` Narrator turn `deeds` (~1195) | A combo perk earned by a legendary deed | the doer |
| `god` | `faith.ts` `intervene()` (~530), and the god interjection trigger (§4) | A patron intervenes for a Witnessed fighter | the patron, then the fighter |
| `crit` (a fight's) | `spotlight.ts` `critMoment`, called at the end of each player action, each enemy turn and the strike that opens a fight from the area map | A player's character or companion lands a critical hit on the other side (§1.4) | the actor (one strip) |

A takedown and a revive in the same action emit both events; the client merges them (§3.4).

### 1.2 Song starts that are not spotlights (decided)

- **Play my song** (`'manual'`: the Musek Blestor, `combat/song` and the story action, ~714 and ~1376): **yes**, kind
  `song`, only when the song actually starts. It is a deliberate 2 AP choice, rare, and it is the character's moment.
- **Music-trait triggers** (`'trait'`: any kill, any revive, a 30 HP heal): **no**. They fire many times a fight; a
  cut-in on every kill would turn flair into a tax. (A trait revive still emits the `revive` spotlight above, because
  the revive itself is a spotlight moment.)

### 1.3 Faith moments (decided)

- **Intervention** (once a fight per Witnessed fighter, Faith 5): **yes**, kind `god` (the patron's strip over the
  fighter's). This is the natural fit Leon described: a god breaking in. Faith 2.2's intervention hook
  (`playIntervention`) is the same moment: section 12 says how the two meet.
- **Miracle** (once a session, Devotion 10): **no spotlight strip**. Faith 2.2's own Miracle scene (`game/cutIn.ts`,
  the patron at full size) is the moment; the strip this branch first folded into the old overlay was dropped at the
  merge. The two share one stage (section 12): a strip never draws over the Miracle.
- Witnessed, prayers, vows, Devotion: no (they are frequent or already have their own marks).

### 1.4 Critical hits in a fight (Leon, 9 Nov 2026: "play it when a critical hit appear in combat too")

- **Which crits:** the party's side only (a player's character, or a companion: its owner's strip, its name in the
  caption), on the other side; enemies' crits never cut in. A weapon attack that crits (a natural 20, or 19–20 aimed or
  from Hidden: the engine's own `crit`, after the items' hooks) and a damaging Sigil or Outburst spell whose hit roll is
  a natural 20. `combat.ts` `noteCrit` records them during the action (presentation only, read by no rule); at the
  action's end `critMoment` turns the first into one `spotlight` event of kind `crit` with `via` (`weapon`, `sigil`,
  `outburst`), the target and its name as the squad saw it ("an unseen hostile" in the fog), and `from` (the action).
  Storm Front's rolled arcs (`classes/soul.ts` `soulStrike`) note their crits like the primary strike.
- **The strike that opens a fight from the area map** (`game.ts` `overworldAttack`: an attack, an evoke or a release on
  a token) is an action of the new fight like any other: it is marked (`markAction`) before it resolves, and its
  takedown, revive (`songTriggers`) and crit (`critMoment`) come after it, so an ambush crit from Hidden (19–20) cuts
  in and an intervention in it is gated before the strike. A Shade's silent takedown opens no fight, so it has none.
- **One cut-in an action:** when a bigger moment already came in the same action (a takedown, a revive, a god's
  intervention), the crit emits nothing; the client's merge (lead by priority god > takedown > revive > legend >
  ultimate > crit > song) is the second guard. A crit that drops a boss shows the takedown.
- **The short form:** one strip, slimmer (22vh, 120–220 px, against 29vh), label `CRITICAL HIT · <ATTRIBUTE>`, caption
  "Critical hit on Rook" (a spell: "· Sigil", "· Outburst"; a companion: "Rex: critical hit on Rook"), its words held
  1.6 s to read, 2.24 s in all at Fast (way out from 1940 ms; reduced motion 2.02 s; Leon, 9 Nov 2026: the 0.9 s one
  "barely shows long enough for me to even read the text"). It follows All / Once per scene / Off like every cut-in; under Once per
  scene its memory is its own (§7), so a routine crit never spends the fighter's strip for a later takedown.
- **The slow-mo:** the crit's action plays 15% slower after it, like every combat moment, the brass included: the
  casings, the pump's hull, the spent cores, the falling magazine and the archer's draw are drawn through `fx/dom.ts`
  (`anim`, `after`), and `fx/brass.ts`'s own timers (the box round the portrait, the removals, the drop's dust, the
  draw's clip at the apex) follow the tempo too, so nothing is cut short or comes early against the slowed shot.
- **A check's crit** (out of a fight, §1.1's first row) keeps its full form ("CRITICAL SUCCESS", 1.4 s).

## 2. The event (engine)

### 2.1 Shape

```ts
// packages/engine/src/spotlight.ts (new), exported from the engine index.
export const SPOTLIGHT_FX = 'spotlight';
export type SpotlightKind = 'crit' | 'takedown' | 'revive' | 'ultimate' | 'legend' | 'song' | 'god';
export interface SpotlightFx {
  n: number; k: 'spotlight';            // the stream's sequence (never put another field called n in it)
  kind: SpotlightKind;
  char: string | null;                  // the character the moment belongs to (the actor; for 'god', the one the patron acts for)
  unit?: string | null;                 // their fight unit, in a fight
  reason: string;                       // the engine's words, as the music log has them: "took down Warden", "a critical success on a Heroic check"
  target?: string | null;               // a unit id (the boss taken down, the ally revived, the ally a god saved)
  targetName?: string | null;           // its name as the squad saw it ("an unseen hostile" if it was never seen)
  targetChar?: string | null;           // the revived/saved ally's character id (their strip)
  patron?: string | null;               // 'god': the patron id (data/patrons.json)
  tn?: number; skill?: string;          // 'crit': the check's TN and skill id
  via?: 'weapon' | 'sigil' | 'outburst';// 'crit' in a fight (§1.4): how it landed (the short cut-in)
  by?: string;                          // 'crit' by a companion: its name (the strip is its owner's)
  perk?: string;                        // 'ultimate' / 'legend': the perk id (the caption never names an Ultimate; §5.3)
  line?: string;                        // optional spoken line (a patron's words, a deed's text), shown in quotes
  group?: string[];                     // extra character ids to show as strips (a group trigger); max 4 strips in all
  from?: number;                        // in a fight: n of the first fx of the action this happened in (§6, the slow-mo)
  scene: string;                        // 'fight<k>' or 'scene<n>': the music's usedKey, for "Once per scene" (§7)
  song: boolean;                        // whether the character's song started with it (the client never needs it; tests do)
}
```

### 2.2 Emitting

```ts
export function spotlight(g: GameState, s: Omit<SpotlightFx, 'n' | 'k' | 'scene' | 'from' | 'song'> & { song?: boolean }): FxEvent
```

- In a fight (`g.phase === 'combat' && g.combat`), it goes on `cb.fx` with `emitFx`, and `from` is filled from
  `cb.actFrom`; out of a fight it goes on `g.story.fx` (the faith module's `storyFx` pattern, capped at `FX_CAP`).
- **`cb.actFrom`**: set to `(cb.fxSeq || 0) + 1` at the start of every player combat action in `apply()` and before
  each `enemyTurn()` in `runEnemies`; deleted after. If the moment's action drew nothing before it (`from === n`),
  there is no slowed segment (the cut-in still plays).
- **Pure presentation:** it never touches `g.rng`, never changes a number, never fails. Same input, same event, on the
  host and in a test.
- Call sites: next to each `startSong` in §1.1 (capture its boolean as `song`), the manual song only on success, and in
  `faith.ts` `intervene()` after its `intervention` fx (`speak()` returns the line it picked, which becomes `line`;
  `reason` is the intervention's own words, e.g. "Ana stays at 1 HP").
- Tests through `apply()` (engine): a Heroic nat 20 emits a story `spotlight` `crit`; a boss shot down emits a combat
  `spotlight` `takedown` with `from` ≤ the shot's n; a revive; the event comes even when no song starts (no song on the
  sheet, or the second spotlight in a fight); a minion kill emits none; `g.rng` is unchanged by `spotlight()`; an
  intervention emits `god` with the patron and line; enemy turns carry their own `from`.

## 3. Look and motion

### 3.1 One strip (one character)

The screen behind blurs (3 px) and dims; one wide torn strip crosses it on a slight tilt (−4°), its two long edges
ripped, with the character's ink showing along the rip like the coloured core of torn card. The eye band of the
portrait fills about 62% of the strip (left or right, by the seed); the rest carries the label, the name and the
caption.

```
 ░░░░░░░░░░░░░░░░░ (the game, blurred 3 px, dimmed to ~55%) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  /\/\^\_/\/\/\^/\/\_/\^\/\/\^/\_/\/\/\^\/\_/\/\/\^/\/\/\_/\/\^\/\/\/\_/\/\  ← ink lip (Agility #E3BF51)
 █▓▒  ◉           ◉   ▒▓█▌ TAKEDOWN · AGILITY                                   (Chakra Petch 12, ink)
 █▓▒  (eyes, painted)  ▒▓█▌ Mallow Vey                                          (Spectral 600, 40, white)
 █▓▒                   ▒▓█▌ Took down the Warden                                (Spectral italic 20, #E7EBF3)
  \/\_/\/\^\/\/\_/\/\^/\/\/\_/\^\/\/\_/\/\/\^\/\_/\/\/\^/\/\_/\/\/\^\/\/\_/\/  ← ink lip
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260" width="640" height="260" role="img" aria-label="Sketch: one torn eye strip over a blurred screen">
  <rect width="640" height="260" fill="#0A0D13"/>
  <rect width="640" height="260" fill="#1C2536" opacity=".35"/>
  <g transform="rotate(-4 320 130)">
    <!-- ink lip: the same jagged edge, pushed out 6–9 px -->
    <polygon fill="#E3BF51" points="-20,62 20,70 40,58 75,66 96,55 130,64 150,60 170,52 205,63 240,57 262,66 300,54 330,62 352,57 390,65 420,53 448,61 480,56 515,66 540,58 575,63 610,52 660,60 660,200 625,193 600,206 570,196 540,204 505,192 480,201 450,196 420,207 390,195 360,203 330,193 300,205 270,197 240,202 210,192 180,204 150,196 120,203 90,193 60,206 30,195 -20,202"/>
    <!-- dark body -->
    <polygon fill="#10151F" points="-20,70 20,77 40,66 75,73 96,64 130,71 150,68 170,61 205,70 240,65 262,73 300,62 330,70 352,65 390,72 420,61 448,69 480,64 515,73 540,66 575,70 610,60 660,68 660,192 625,186 600,198 570,188 540,196 505,185 480,193 450,188 420,199 390,187 360,195 330,186 300,197 270,189 240,194 210,185 180,196 150,188 120,195 90,186 60,198 30,188 -20,194"/>
    <!-- eye window: torn on its inner edge -->
    <polygon fill="#3B475D" points="-20,78 360,78 372,96 358,112 376,130 361,150 374,170 362,186 -20,186"/>
    <ellipse cx="120" cy="132" rx="26" ry="11" fill="#E7EBF3"/><circle cx="120" cy="132" r="8" fill="#0A0D13"/>
    <ellipse cx="250" cy="132" rx="26" ry="11" fill="#E7EBF3"/><circle cx="250" cy="132" r="8" fill="#0A0D13"/>
    <path d="M88 112 Q120 100 150 110 M218 110 Q250 100 282 112" stroke="#0A0D13" stroke-width="5" fill="none"/>
    <text x="392" y="112" fill="#E3BF51" font-family="Chakra Petch, sans-serif" font-size="11" font-weight="700" letter-spacing="3">TAKEDOWN · AGILITY</text>
    <text x="392" y="146" fill="#FFFFFF" font-family="Spectral, serif" font-size="30" font-weight="600">Mallow Vey</text>
    <text x="392" y="172" fill="#E7EBF3" font-family="Spectral, serif" font-size="16" font-style="italic">Took down the Warden</text>
  </g>
</svg>

- **Strip:** full viewport width plus 10% overhang each side (so the tilt never shows a corner), height
  `clamp(150px, 29vh, 290px)`, centred at 46% of the height, tilted −4°. Body `#10151F`; the ink lip 6–9 px wider on
  each long edge, in the character's ink; a 1 px inner line of `#0A0D13` between lip and body so the ink reads as an
  edge, not a fill.
- **Eye window:** the portrait clipped to the strip's body, 62% of the visible width, its inner edge torn (a short
  vertical jagged run). A soft gradient of the ink at 18% from the inner edge inwards ties the painting to the strip.
- **Text block** (the other 38%, never over the eyes): label (Chakra Petch 12, 700, letter-spacing .3em, the ink; the
  kind word plus the attribute word), name (Spectral 600, `clamp(28px, 4vw, 44px)`, white, ellipsis), caption
  (Spectral italic 20, `#E7EBF3`, max two lines). A `line` (a god's or a deed's words) replaces the caption in quotes.
- **One light pass:** a single soft white sweep (`rgba(255,255,255,.28)`) across the eyes, 400 ms, the turn cut-in's
  `phcCutStreak` idea; no stars, no halftone, no speed lines.

### 3.2 Stacked strips (2–4)

```
 ░░░░░░░░░░░░░░░░░░ blurred ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   /\/\^/\/\_/\/\^/\/\_/\/\^/\/\/\_/\/\^/\/\_/\/\/\^/\/   (god: accent, 1.3× tall)
  █ ◉        ◉  (the Toll-Keeper's mask)        THE TOLL-KEEPER █   ← slides from the right
   \/\_/\/\^/\/\/\_/\/\^/\/\_/\/\^/\/\/\_/\/\^/\/\_/\/
     /\/\^/\/\_/\/\^/\/\_/\/\^/\/\/\_/\/\^/\/\_/\/\/\^/\/\   (Ana: Virtue ink)
    █ ANA RELL   ◉          ◉ (eyes)                     █   ← slides from the left
     \/\_/\/\^/\/\/\_/\/\^/\/\_/\/\^/\/\/\_/\/\^/\/\_/\/\/
            ┌──────────────────────────────────────────────┐
            │ INTERVENTION · THE TOLL-KEEPER               │  caption plate (Chakra Petch label, FAITH_INK)
            │ "Not yet. You haven't paid." · Ana stays at 1 HP │  (Spectral italic)
            └──────────────────────────────────────────────┘
```

- **Heights:** each strip `clamp(90px, (64vh − gaps) / n, 200px)`, gap 1.2vh; a god's strip 1.3× the others. The
  stack is centred; the caption plate sits under it (never on a face).
- **Order:** the god first, then the actor, then the revived/saved, then `group` in order. Past 4 strips: the first 4,
  and the caption ends "+2 more".
- **Alternation:** strips come in from left and right in turn, tilts −3°, +2°, −2°, +3°, horizontal offsets ±3vw; each
  strip's eye window takes ~78% of its width and puts the name (Chakra Petch 14, 700, the strip's ink, uppercase) at
  the strip's outer end. Each strip has its own seeded tear.
- **The caption plate:** `#0A0D13` at 92%, a 3 px top rule in the lead strip's ink, label + caption as in §3.1.

### 3.3 Colours

| Strip | Ink (lip, label, name chip) | Body | Text |
|---|---|---|---|
| A character | Ink of the **highest attribute** (`classView.ts` `ATTR_INK`); a tie goes to the class's attribute, else the tree order (Endurance … Virtue) | `#10151F` | white / `#E7EBF3` |
| A god | The patron's accent (`accentOf(patron)`, §9.1 on patron ids) for the lip only; words, the name chip and the phone plate's name included, in `FAITH_INK` `#D36A90` (faith words are Virtue ink; the gold is light only; the Laughing Mask's `#B83243` is 3.1:1 on the body, too dim for words) | `#0A0D13` | white / `#E7EBF3` |
| An unknown or NPC portrait | Muted `#A3AEC2` | `#10151F` | white |

The label always carries the word for the colour (`TAKEDOWN · AGILITY`, `INTERVENTION · THE TOLL-KEEPER`), so colour is
never the only signal. The backdrop: `backdrop-filter: blur(3px) brightness(.55) saturate(.85)`; where the browser
has no backdrop-filter, `rgba(5,7,11,.55)` (dim only).

### 3.4 Merging

Events that belong together become **one** cut-in:

- In a fight: every `spotlight` with the same `from` (one action) merges. The lead kind by priority
  `god > takedown > revive > legend > ultimate > crit > song`; the others are named after it in the caption
  ("Took down the Warden · brought Ana back").
- Out of a fight: events from the same state update (one Narrator turn's deeds, one check) merge.
- Strips are unique by character (and patron).

### 3.5 The tear

`tear(seed, edge, widthPx)` in `apps/web/src/game/spotlight/tear.ts`: mulberry32 from a 32-bit hash of
`streamKey + '|' + n` (local cut-ins: `spec.seed`, else the id). About one point every 28 px of width; each point's
depth 3–12 px, one in seven a deep notch of 16–22 px; the ink lip reuses the points pushed out 6–9 px with its own
jitter, so the lip is uneven. Drawn as SVG `<polygon>`s and the portrait as an SVG `<image>` in a `<clipPath>` (crisp
at any size; no canvas, no texture). Same seed → same tear on every screen and on a replay.

## 4. The trigger API (for the god interjection system)

Two doors, one look. **Anything every player should see goes through the engine door**; the client door is for this
browser only.

### 4.1 Engine (shared, host-authoritative)

```ts
import { spotlight } from '@engine'; // packages/engine/src/spotlight.ts

// A patron breaks in (a god interjection). Call it from the reducer, on the host, like any fx.
spotlight(g, {
  kind: 'god',
  patron: 'toll_keeper',          // data/patrons.json id (required for 'god')
  char: c.id,                     // whom the patron speaks to or acts for (null: the patron alone, one strip)
  reason: 'speaks',               // short words for the caption
  line: 'Not yet. You haven\'t paid.', // optional: the god's words, shown in quotes
  interject: true,                // an interjection (the patron speaks up): the label is the bare name, "THE TOLL-KEEPER";
                                  // leave it out for an intervention: "INTERVENTION · THE TOLL-KEEPER"
  group: [otherCharId],           // optional: more characters in the moment (max 4 strips in all)
  target: unitId, targetName: 'Ana', // optional
});
```

- In a fight it fills `from` itself, so **the action it happens in plays slowed after the cut-in** (§6). Out of a fight
  it plays when the state lands.
- It does not throttle. The god system decides how rare its interjections are; **recommended: at most one per patron
  per scene**, so the moment stays a moment. Players can also set "Once per scene" (§7).
- It does nothing else: no Devotion, no log line. Log the words the usual way (`speak()` / `cb.log`) if they should
  also be read later.
- It emits nothing inside the area map's dry run (a copy of the map marked `dry`, game.ts): faith.ts `intervene()`
  checks the copy it was given, and `spotlight()` returns null when the fight on the state is a dry copy.

### 4.2 Client (this browser only)

```ts
import { showSpotlight, EV_CUTIN, EV_CUTIN_START, EV_CUTIN_END, type CutInSpec } from './game/spotlight';

showSpotlight(spec): Promise<'shown' | 'skipped' | 'off'>      // resolves when the cut-in has cleared
window.dispatchEvent(new CustomEvent('phc:cutin', { detail: spec }))   // the same, for .js screens and devtools

interface CutInStrip {            // build these with stripForPatron(id) and stripForChar(g, charId), never by hand
  key: string;                     // 'c:<charId>' or 'p:<patronId>': unique; "Once per scene" counts these
  img: string; eye: { x: number; y: number };
  ink: string;                     // the lip, the label, the name chip
  word: string;                    // the word beside the ink (the attribute, or the patron's name)
  name: string; god?: boolean;
}
interface CutInSpec {
  id?: string; seed?: number | string;
  kind: 'crit' | 'takedown' | 'revive' | 'ultimate' | 'legend' | 'song' | 'god';
  strips: CutInStrip[];           // 1–4
  label: string;                  // "INTERVENTION · THE TOLL-KEEPER"
  caption?: string; line?: string; more?: number; scene?: string; aria?: string;
}
// The shorthand (strips built for you): { kind?, patron?, char?, line?, reason?, group?, targetChar?, interject? }
// Out: 'phc:cutin-start' {id, kind}, 'phc:cutin-end' {id, kind, skipped}
// Helpers: cutInFromFx(g, events): CutInSpec | null (the engine events → a spec; tested), stripForChar(g, charId),
//          stripForPatron(id), cancelSpotlight(id) (drop it from the queue, or clear it if it is showing)
```

`showSpotlight` honours the Settings choice and reduced motion. It never slows anything: only the effects queue does, for
the combat stream. Use it for previews (the Proving Ground gets a "Cut-in" test button), never for a moment other
players should see.

## 5. Captions

### 5.1 Labels and captions

| Kind | Label (Chakra Petch) | Caption (Spectral italic) |
|---|---|---|
| crit (a fight's, §1.4) | `CRITICAL HIT · <ATTRIBUTE>` | "Critical hit on Rook" (· Sigil / · Outburst; a companion: "Rex: critical hit on Rook") |
| crit | `CRITICAL SUCCESS · <ATTRIBUTE>` | "Natural 20 · Heroic" or "Natural 20 · Hard", with the skill: "Natural 20 on Composure · Heroic" |
| takedown | `TAKEDOWN · <ATTRIBUTE>` | "Took down <targetName>" (an unseen target: "Took down an unseen hostile") |
| revive | `REVIVE · <ATTRIBUTE>` | "Brought <name> back" |
| ultimate | `ULTIMATE · <ATTRIBUTE>` | "An Ultimate, earned" (the perk is named on its own award screen, §5.3) |
| legend | `LEGENDARY DEED · <ATTRIBUTE>` | the deed in quotes, cut at 90 characters, else "A legendary deed" |
| song | `THEIR SONG · <ATTRIBUTE>` | "Plays their song" (never the title: the Unspoken Name, as the Narrator rule) |
| god | `INTERVENTION · <PATRON>` (an interjection: `<PATRON>`) | the `line` in quotes, then " · " and the reason ("Ana stays at 1 HP") |

### 5.2 Copy rules

Short and plain, in-universe, sentence case in the caption, no exclamation marks. The name is the character's name
(the sheet), the patron's name from `data/patrons.json`. Screen readers get one `role="status"` line: "Spotlight:
Mallow Vey took down the Warden."

### 5.3 The Ultimate

Ultimates are secret until granted and get their own award screen (spec: perks). The cut-in plays for the whole room
over whatever screen each player is on; its caption does not name the perk. For the holder the award screen opens
under it (store.ts switches to `ultimate`), blurred, and is revealed as the cut-in clears. (Open question 3.)

## 6. Timing and the slow-mo

### 6.1 Timing (ms from the start)

| Beat | 1 strip | n strips (2–4) | God (any n) | Reduced motion |
|---|---|---|---|---|
| Blur and dim in | 0–160 | 0–160 | 0–160 | 0–120 (blur kept) |
| Tear sound | 0 | 0 | 0 | 0 |
| Strip i slides in, tear opens | 40–280 | 40 + 70i → 280 + 70i | same | fade 0–120, no slide, no tilt motion |
| Caption in | 220–420 | 260 + 70(n−1) | same | with the strip |
| Light pass | 300–700 | +70i per strip | same | none |
| Hold until | 1050 | 1050 + 70(n−1) | +100 | 800 |
| Out (strips part up and down, fade) | 1050–1300 | … +250 | … +250 | 800–950 fade |
| Blur clears | 1200–1400 | to ≤ 1600 | to ≤ 1600 | 900–1000 |
| **Total** | **1400** | **1470–1610 → capped 1600** | **1500–1600** | **1000** |

A fight's crit (§1.4) is the short form: one strip, caption in at 140 ms (fully in at 340), held `CRIT_READ_MS` = 1600
ms to read (provisional), the way out from 1940 ms (200 ms), **2240 ms** in all (reduced motion: in at 120, 2020).

**The combat speed** (`game/combatSpeed.ts`, Leon 9 Nov 2026): every length in this section is Fast's. In a fight the
player's speed multiplies them all: Normal (the default) × 1/0.85 ≈ 1.176, Fast × 1 (the overlay's own animations
follow it too). The slowed action's tempo (§6.2) stacks on top. Outside a fight the speed never applies.

Constants in `spotlight/timing.ts`: `CUTIN_MS(n, god, rm, short)`, `CRIT_READ_MS`, `CUTIN_MAX_MS = 2400` (the safety cap,
§6.3; × the combat speed).

**Skip:** any pointer down or key (armed 150 ms after the cut-in starts, so the click that made the action never
skips it) goes straight to Out (150 ms) and clears the blur with it. The skipping click is consumed (capture phase,
`preventDefault` + `stopPropagation`) so it never also gives a grid order. A key typed into an input or textarea skips
but is not swallowed.

### 6.2 The slow-mo (combat stream only)

The engine resolves the whole action before anything plays, so the queue knows what is coming:

1. When `queueFx` receives a batch with a `spotlight` whose `from` is in the batch, it places a **gate** just before
   the event numbered `from` (or before the spotlight itself if `from` is missing or equal to it).
2. Events before the gate play as now. At the gate the queue **stops scheduling**, shows the cut-in, and waits for it
   to end (or be skipped, or the cap).
3. Then the **slowed segment** plays: every event with `from ≤ n < spotlight.n`, except `turn` events, at **tempo
   0.85**: its beat is `beatOf(e) / 0.85`, and every duration and delay inside its handlers is divided by 0.85
   (`dom.ts` gets a module tempo read by `anim`, `put`, `after`, `burst`, `particle`, `floatText`; `after` captures
   the tempo when it schedules, so callbacks inside the segment stay slowed). One-shot combat sounds (guns, hits,
   swishes, explosions, element impacts) play at `rate × 0.85` with their delays divided by 0.85; loops, UI sounds,
   chimes, the choir, voices and music are untouched.
4. The `spotlight` event itself plays nothing (beat 0). Everything after it (the enemy phase) plays at normal speed.
5. The slowed segment is **never compressed** by `MAX_SPEEDUP` and **not skipped** by the backlog trim or by a
   decided fight's `keep` (the gate segment is kept whole; older events go first), **as long as** the tail from the
   gate on fits in `PROTECT_GRACE` (1.5) × the room at `MAX_SPEEDUP`. Past that (a long catch-up batch, a moment early
   in a big enemy phase) the moment went by in the backlog: it is skipped like any old effect, with no cut-in, so play
   never lags far behind the state.
6. Reduced motion: **the gate stays, no slow-mo** (the cut-in, 1000 ms, plays before the action; the action plays at
   normal speed). A "Once per scene" repeat or Settings Off: **no gate, no slow-mo**; the batch plays as today.
7. A cut-in already on screen (a story moment, a client-door preview) gives way to a gate's: it is skipped (its 150 ms
   way out) and the gate's plays next, so the cut-in always comes before its action. If the gate's cap opens it first,
   its cut-in is cancelled, never shown late over the aftermath.

Example, the shot that drops the boss (the fight's fx, as one batch):

```
n=40 shot (from=40) · 41 hurt · 42 down(Warden) · 43 spotlight{takedown, from:40} · 44 turn(enemy) · 45 move …
      │◄── gate: cut-in 1400 ms ──►│◄── 40–42 at ×1/0.85 ──►│ 43 (0 ms) │ 44… normal speed
```

### 6.3 The hold (input and the e2e suites)

- `turnsBusyUntil()` becomes `min(max(turnsUntil, gateUntil), now + TURNS_HOLD_MAX)`. `gateUntil` is the cut-in's
  planned end while it shows: input is held **only during the cut-in** (≤ 1.6 s), never during the slowed action
  (your own action never held input before either).
- Events behind a closed gate are kept unscheduled. When the gate opens (end, skip or cap), they are queued with real
  times and `queueEnd` and `turnsUntil` are recomputed from that moment (they may move earlier after a skip), and
  `FX_HOLD` is dispatched. New batches arriving while the gate is closed join behind it, in order.
- **Safety:** the gate opens after `CUTIN_MAX_MS` (2400, × the combat speed) whatever happens (an overlay that failed to mount, a thrown
  error, a hidden tab), so playback can never stall; `clearFx()` drops the gate and the overlay.
- `window.__phcHold` keeps working unchanged for the e2e suites. For tests: `window.__phcCutin = { count, last, skip() }`.
- TurnIntro: while a cut-in shows, no turn banner or your-turn card comes up; it waits for `phc:cutin-end`. Its
  `estMs` counts a `spotlight` as the cut-in's length (it only estimates when the fx clock is off).

### 6.4 Out of a fight

The story stream (`g.story.fx`) is watched by the cut-in layer itself, on every in-room screen (the area map, the sheet,
the level-up and Ultimate screens), not by `FxLayer` (which only draws the area map's stream when its grid is on
screen). A `crit` comes with the check's accept (the dice dialog closing) and waits **350 ms**, or **1100 ms** after an
Echo reroll (the new verdict, shown at ~1.05 s, comes first); every other kind waits 200 ms. No slow-mo, no input hold.

## 7. Settings

- `UiPrefs` (`sfx.ts`, localStorage `phc.ui`) gains `cutins: 'all' | 'scene' | 'off'`, default `'all'`.
- The Settings panel (`title/Title.tsx` `SettingsPanel`, the same one the game opens) gets one row: **Cut-ins: All ·
  Once per scene · Off** (three buttons, the chosen one pressed), under Reduce motion.
- **Once per scene:** a strip shows at most once per character (or patron) per `scene` key (the event's, so every
  player counts the same scenes and fights). A stack drops the strips already shown; if none remain, nothing plays and
  there is no slow-mo. Kept in sessionStorage per game code. A fight's crit (the short form) counts apart
  (`'crit:' + key`): it holds back only later crits, never the same fighter's takedown, revive or god moment, the bigger
  moments this setting keeps.
- **Off:** nothing plays, no slow-mo, no blur. The Miracle keeps today's overlay.
- **Reduced motion** (our toggle or the system's): strips fade in place (no slide, no shake, no light pass, static
  tilt), the blur stays, 1000 ms in all, and no slow-mo.

## 8. Multiplayer

- The moment comes from the **shared state** (the host's engine emits it; every client plays the same fx), never a
  local guess. Every player in the room sees every player's moment, as with the spotlight song.
- How often (All / Once per scene / Off) and reduced motion are each player's own; they never change the state or
  anyone else's screen.
- A combat moment plays only for players watching the combat screen (it is part of the fight's playback); a player on
  the sheet gets nothing late. Story moments play on any in-room screen. A hidden tab, a reload or a late join syncs
  silently (never replayed), as `FxLayer` does.
- Fog of war: a target the squad never saw is named "an unseen hostile"; strips show only party characters and
  patrons, never an unseen enemy.

## 9. Assets

### 9.1 Eye lines

Each portrait needs where the eyes are, as fractions of the 4:5 image:

- `art/catalog.json`: every `characters` entry (145: EPCCG, world, archetypes, M813) and every `patrons` entry (8)
  gets `"eye_line": { "y": 0.37, "x": 0.5 }` (y: the eyes' line from the top; x: the point between the eyes). Snake
  case to match the catalog's own keys (`colour_anchor`, `historical_skill_id`); the client calls it `eyeLine`.
  Patrons are apparitions and masks: the line is the mask's or effigy's eyes.
- How: no OpenCV here. Try a light landmark detector if the network allows (e.g. `pip install mediapipe` face mesh);
  otherwise render contact sheets of the 153 portraits with a ruler every 5% and set values by eye in batches. A
  detector's values are still checked on a contact sheet with the line drawn on each face.
- Default when missing: `{ y: 0.38, x: 0.5 }`; the strip crop is built so 0.38 still frames the brow-to-cheek band of
  a typical Heavenprint bust.
- `tools/validate_art.py`: every `characters` and `patrons` entry has `eye_line` with `0.05 ≤ y ≤ 0.70`,
  `0.15 ≤ x ≤ 0.85` (section 11.1: Heavenprint eyes sit high); `docs/ART-INTEGRATION.md` and `art/README.md` document the field.
- `tools/build_web_assets.py` writes `apps/web/src/game/eyelines.json` (`{ "char-<id>": [x, y], "patron-<id>": [x, y] }`,
  keyed by the asset names the game already uses).
- **Patron ids:** `data/patrons.json` says `toll_keeper` and `counting_weaver`, the catalog and the files say
  `the_toll_keeper` and `the_counting_weaver`. Resolve the art with `faithArt.ts` `patronPortrait()` (it already tries
  both) and look the eye line up under the asset name it found. The strip's accent is
  `accentOf(id, FAITH_PATRON[id]?.accent)` (the data's accent first; patrons.json has all eight). Note: the fx
  handlers call `accentOf(e.patron, e.accent)` with no data accent, and `PATRON_ACCENT` is keyed on the `the_` names, so
  today the Toll-Keeper's and the Counting Weaver's intervention and Witnessed glows fall back to gold; the build fixes
  `accentOf` to read the data accent itself.
- **Uploaded portraits:** the sheet gains `portraitEye` (y, 0.05–0.70, two decimals; `newCharacter` clamps it, and a
  character file's import keeps it, clamped the same way, only with the file's own portrait). Character creation's portrait step shows, under an uploaded portrait, a small **Cut-in framing** slider with a
  live strip preview of the crop; default 0.38. Saved with the sheet and the character file.
- **The crop:** the portrait is drawn at the eye window's width (W) and offset so the eye line sits at the strip's
  vertical centre: `top = h/2 − y × 1.25W`, `left = W/2 − x × W` clamped to the image. A 1100 px window from the
  800 × 1000 `-lg` file is a 1.4× scale, acceptable for painted art; the strip shows about 15% of the portrait's
  height (brows to cheekbones). Data-URL uploads use `bigPortrait()` like the turn cut-in.
- **Preload:** at a fight's start the party's `-lg` portraits and their patrons' portraits are fetched (a cut-in never
  waits on the network; an image not ready by its slide-in shows the dark body and fades in).

### 9.2 Sound

- One sourced **tear + sting**: a short rip or slash (≤ 300 ms) layered with a low sting (≤ 700 ms) into one file,
  `apps/web/public/sfx/cb/spotlight_tear.ogg` (mono, trimmed, peak about −1 dBFS, levelled like the other `cb/`
  files), from **CC0 or CC BY 4.0** sources (OpenGameArt; kenney.nl refuses scripts). Credited exactly as the authors
  ask in `sfxCredits.ts`, with the URL and licence. Never NC, ND or personal-use.
- Played through `turnIntro.tsx`'s `cue()` as a new cue `'spotlight'` (wished file `spotlight_tear`; stand-ins
  `swish` then `stamp`, with the synthesised `thump` on top). A god's cut-in adds the already-credited `soul_choir`
  at gain 0.5, rate 0.85.
- If nothing suitable can be downloaded, the stand-ins play and the build report says so.

### 9.3 Code (where things go)

- `packages/engine/src/spotlight.ts` (new), the call sites in `game.ts` and `faith.ts`, `cb.actFrom`, tests.
- `apps/web/src/game/spotlight/`: `CutInLayer.tsx` (mounted in `App.tsx` beside `TurnIntro`, z-index 64: over the turn
  intro's 57–58 and the effects layer's 45, under the Miracle's 66), `tear.ts`, `spec.ts` (`cutInFromFx`, strips,
  inks, captions), `timing.ts`, `index.ts` (`showSpotlight`, the events); tests for the tear's determinism, the spec from
  events, merging, Once per scene and the gate's timing (`planQueue`-style pure functions).
- `fx/play.ts`: the gate and the tempo; `fx/dom.ts`: the tempo; `fx/faith.ts`: the Miracle overlay's strip.
- `sfx.ts` (`cutins` pref), `title/Title.tsx` (the row), `screens/create.js` (the slider), the sheet field.
- e2e: one suite (`apps/web/e2e/cutin.mjs`): a Proving Ground boss shot down shows the strip with the actor's name in
  both browsers, the hold releases, a click skips it, Off shows nothing; the existing suites still pass.

### 9.4 Docs to update when built

Spec (Music, "The spotlight": one paragraph saying the moment also cuts in, presentation only, and the 15% slow
playback), `docs/design/ui-screens.md` (the cut-in), `docs/design/colour-system.md` (the strip's inks), this file's
status, `docs/HANDOFF.md`.

## 10. Open questions for Leon

1. **Trait songs:** I left music-trait kills and big heals out (too frequent). Say if you want them in at "All".
2. **Miracle:** I folded the strip into the existing Miracle screen rather than playing a cut-in before it (that would
   be 3.7 s). Agree?
3. **Ultimate caption:** it says "An Ultimate, earned" without the perk's name, for the secrecy rule. Should the
   room see the name?
4. **Slow-mo under reduced motion:** off, to keep it short. Agree?
5. **Enemy moments:** only party moments cut in. A boss's own entrance or its big attack could use the same strip
   (red-inked) later. Want that?
6. **Revive layout:** the reviver's strip and the revived one's, stacked. Or only the reviver?
7. **Decision number:** settled: decision 113 (110 the mana forecast, 111 Faith 2.2, 112 the brass).
8. **Interventions gate and slow (section 12):** answered (Leon, 9 Nov 2026: "implement it to the god interjection
   moment too"): the god's moment is this cut-in, gating the queue and slowing its action; Faith 2.2's small cut-in is
   not used.
9. **Crit strips:** a fight's crit is a slimmer strip (22vh) than the big moments (29vh), so the smaller moment reads
   smaller. Keep it, or the same height as the others?

## 11. Build notes (9 Nov 2026)

What the build did differently from the design above, and why:

1. **Eye lines sit high.** Heavenprint portraits are tight busts with the eyes at 0.06–0.42 of the height (median about
   0.2), not 0.38. The 153 values came from OpenCV's YuNet face detector and were checked on contact sheets with the line
   drawn on each face; 24 were set by eye (the robots, the drone, the patrons' masks and apparitions, a few misses).
   `validate_art.py`'s range is therefore 0.05 ≤ y ≤ 0.70 and 0.15 ≤ x ≤ 0.85. The default for an upload with no framing
   stays 0.38 (a phone photo or a headshot); a patron with no line uses 0.18.
2. **The crop** shows about 17% of the portrait's height in a strip (so the eyes fill it), never less than the window's
   width (`spotlight/layout.ts` `cropOf`).
3. **accentOf** now finds a patron's light under both id forms (`toll_keeper` and `the_toll_keeper`), which fixes the
   gold fallback for the Toll-Keeper and the Counting Weaver; it still prefers the art brief's table over the data's
   accent, so no existing glow changes colour. The strips use the data's accent first (it matches the paintings).
4. **The crit's wait:** the cut-in comes with the check's accept (the dice dialog closing) or an Echo reroll; it waits
   350 ms after an accept and 1100 ms after a reroll (the new verdict shows first).
5. **DOM hooks:** the overlay's attributes are `data-phc-spotlight*` (the your-turn card already owns `data-phc-cutin`).
   Test hooks: `window.__phcCutins` (every cut-in: kind, label, caption, at, end, skipped, slow, tempo, and the slowed
   events with their play times and beats) and `window.__phcCutin` (`count`, `last`, `showing`, `skip()`).
6. **Sound:** `public/sfx/cb/spotlight_tear.ogg`, qubodup's "megaswosh1" (Wind, hit, time morph, CC0) over railkill's
   steel tongue drum ring (Mystery Sting, CC0, pitched to 0.75), 0.95 s, mono, peak −0.9 dBFS; credited in `sfxCredits.ts`.
7. **Not built:** the Proving Ground's "Cut-in" test button (the e2e and devtools use the `phc:cutin` event instead).
   The other screens' own `setTimeout` calls (Soul, faith and class handlers) are not slowed; everything drawn through
   `fx/dom.ts` (`after`, `anim`, `put`, bursts, particles, floating text, rings) and every `play()` one-shot sound is.
8. **e2e:** `apps/web/e2e/cutins.mjs` (two browsers in the Proving Ground, then a story room with the scripted Narrator
   and a third player set to Off).
9. **Review fixes (same day):** checksums regenerated after the README edit; no spotlight from the area map's dry run;
   the queue's protection is bounded (section 6.2, item 5); the decided set is keyed by stream, scene and n and cleared
   with the queue and on a fight that starts over (the Proving Ground's Retry); a gate's cut-in preempts one on screen
   and is cancelled if its cap opens the gate first; a character with no portrait of their own (the Proving Ground's
   recruit stands in with the Narrator's Wick) gets the archetype card for their highest attribute (superseded 9 Nov
   2026, item 12 below: the strip shows the actor's own face, as the HUD does); a phone (under
   720 px wide) puts every word in the plate under the strips, names and words as coloured chips; the image always
   reaches past the visible screen edge (no flat slab on shifted strips); a small source (an upload's 320 × 400 room
   copy) is never magnified past 2.2× and its window narrows to the image; the single strip's name is sized to its
   column; one strip is 29vh (150–290 px); the Miracle's strip sits above the mark with its window on the left, opaque;
   the module is `game/spotlight/` and the client door `showSpotlight` (Faith 2.2 owns `game/cutIn.ts` and
   `showCutIn`; two paths that differ only by case break on macOS and Windows); a music trait's "a kill" never fires on
   a boss kill (the music's old chain); the `interject` flag. Tests through `apply()` for the enemy-turn `from`, the
   dry run and the song chain.

10. **Round 2 (the merge with develop 0.8.0 and Leon's two rulings):** the god's moment is this cut-in (section 12);
   the combat crits (section 1.4: `noteCrit` and `critMoment` in the engine, the short form and the slimmer strip in the
   client); the brass's own timers follow the tempo; one stage with the Miracle (`game/stage.ts`). Tests: the engine's
   crit cases through `apply()` (a weapon crit, a plain hit, a crit that drops a boss, an enemy's crit, a companion's, a
   Sigil crit, a stale note and the dry run), `spotlight/crit.test.ts` (the spec, the timing, the gate, the brass at
   0.85) and `spotlight/merge.test.ts`; e2e `cutins.mjs` (f) a crit, (g) a crit that takes down a boss, (h) the
   Quartermaster's intervention, (i) a Miracle and a strip asked for during it. Screens: `cutins-f-crit.png`,
   `cutins-g-crit-takedown.png`, `cutins-h-god.png`, `cutins-i-miracle.png`, `cutins-i-after-miracle.png`.

11. **Round 2 review fixes:** the strike that opens a fight from the area map is an action (§1.4: a crit, a takedown or
   an intervention in it now cuts in and is gated); Storm Front's arcs note their crits; under Once per scene a crit
   counts apart (§7); the stack's name chip wraps to two lines (12–14 px) instead of an ellipsis ("THE COUNTING WEAVER"
   at 1280 px) and a god's name is in Virtue ink, not the accent (§3.3). Tests: `spotlight.test.ts` (engine) for the
   area-map opener in the open, from Hidden (a 19 too) and a boss downed by it, and Storm Front's arc; `spotlight.test.ts`
   (web) for a crit then a takedown by one fighter under Once per scene.
12. **The actor's own face (Leon, 9 Nov 2026: "the cut in animation uses some random character's profile instead even
   though i just got a crit as the recruit in proving ground"):** a strip shows the face the actor's token and HUD
   show (`spec.ts` `faceFor`: the art library name or URL resolved, an upload as it is), never an archetype card. With
   nothing that resolves, Wick's welcome pose, as the HUD shows it. Small square avatars (Wick's placeholder robot, the
   Proving Ground recruit's face; Wick's welcome pose) are framed by hand (`FRAMES`) and drawn whole: 1.3 × the strip's
   height, centred in a window fitted to them, feathered at the sides over the same picture blurred and dimmed, the
   eyes on the middle line. A companion's crit or takedown (the engine's event carries its `unit`) leads with the
   companion's own strip (`stripForUnit`: its portrait, else its token's initials large in the window, in its
   controller's ink; the caption drops the engine's "Combat drone: " prefix). A companion's own `img` now reaches its
   unit (engine `companionUnits`). e2e: `combat-portraits.mjs`.

## 12. Meeting Faith 2.2 (`feature/faith-presence`): merged

Faith 2.2 came in with develop 0.8.0 (with the brass). How the two meet, as built at the merge:

- **One path for an intervention's cut-in: the engine's `spotlight` event** (kind `god`), from Faith 2.2's rewritten
  `faith.ts` `intervene()`, kept whole with one call after its `speak()` (which now returns the line it said):
  `if (g && !(cb as any).dry) spotlight(g, { kind: 'god', patron, char, unit, reason, line, target, targetName, targetChar })`.
  It is the only path that can gate the queue (the client knows of it before the action plays) and it carries the
  patron, the fighter, the patron's line and the target. Leon confirmed it ("implement it to the god interjection
  moment too"). `playIntervention(e, K)` in `game/cutIn.ts` keeps its map effect at once (the bell, the patron's mark at
  the tile, "<PATRON> INTERVENES") and **draws no cut-in**: the small cut-in drafted in Faith 2.2's spec section 3 is
  not used (that section now says so). Faith 2.2 widened the triggers and allows a second intervention from Devotion 7,
  so god cut-ins come more often; "Once per scene" is the player's brake.
- **The Miracle:** Faith 2.2's scene (`showCutIn`, `miracleCutIn`: the patron at full size, about 6 s) replaces this
  branch's Miracle strip; `miracleOverlay` is only their wrapper now.
- **One stage** (`game/stage.ts`): the Miracle's scene and the strips never draw over each other. A Miracle that comes
  on clears a strip on screen at once (no way out); a strip asked for while the Miracle's portrait is up waits in the
  spotlight queue until it lands (a fight's gate still opens by its 1.7 s cap, so a gate that would wait longer shows
  no cut-in and its action plays at normal speed); a strip that starts while the Miracle's "what it did" box is up
  closes the box first. In the effects queue, a spotlight in the Miracle's own action (the Miracle drops a boss) is
  decided at once: only the Miracle shows, no strip, no slowed action.
- **The scheduler:** their `schedule()`/`hurryFx` (a skipped Miracle moves the queue up) run over this branch's gate:
  `hurryFx` leaves a gate's cut-in on screen alone (its own end reschedules what waits behind it); a gate not reached
  yet moves up with the rest, its estimates with it. A bow's draw keeps its full time in a sped-up backlog and is
  slowed with the rest of a slowed segment. `clearFx` drops both systems' cut-ins (`dropCutIns`, `closeCutIns`).
- **Patron ids:** the data's `toll_keeper` and `counting_weaver` against the art's `the_toll_keeper` and
  `the_counting_weaver`: every lookup (accent, face box, portrait, mark, eye line, the strip) takes either form, and a
  web test checks all eight patrons under both (`spotlight/merge.test.ts`). No gold fallback is left.
- **Names:** this branch's module is `game/spotlight/` (`showSpotlight`, `cancelSpotlight`, `CutInLayer`); theirs is
  `game/cutIn.ts` (`showCutIn`, `closeCutIns`).
- **Decision numbers:** 110 the mana forecast, 111 Faith 2.2, 112 the brass, 113 the cut-ins.
