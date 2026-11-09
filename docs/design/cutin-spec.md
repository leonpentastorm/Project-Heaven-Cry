# Spotlight cut-ins: torn eye strips (design, 9 Nov 2026)

Status: **design for Leon's review** (decision 110). Presentation only: no rule, no number the engine resolves, no
dice changes. Built on branch `claude/awesome-babbage-8gngk8` from develop 0.5.0.

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
| `god` | `faith.ts` `intervene()` (~493), and the god interjection trigger (§4) | A patron intervenes for a Witnessed fighter | the patron, then the fighter |

A takedown and a revive in the same action emit both events; the client merges them (§3.4).

### 1.2 Song starts that are not spotlights (decided)

- **Play my song** (`'manual'`: the Musek Blestor, `combat/song` and the story action, ~714 and ~1376): **yes**, kind
  `song`, only when the song actually starts. It is a deliberate 2 AP choice, rare, and it is the character's moment.
- **Music-trait triggers** (`'trait'`: any kill, any revive, a 30 HP heal): **no**. They fire many times a fight; a
  cut-in on every kill would turn flair into a tax. (A trait revive still emits the `revive` spotlight above, because
  the revive itself is a spotlight moment.)

### 1.3 Faith moments (decided)

- **Intervention** (once a fight per Witnessed fighter, Faith 5): **yes**, kind `god` (the patron's strip over the
  fighter's). This is the natural fit Leon described: a god breaking in.
- **Miracle** (once a session, Devotion 10): **no separate cut-in**. The Miracle already has its full-screen answer
  (`miracleOverlay`, 2.3 s, Leon-approved). With cut-ins on, that overlay gains the patron's torn eye strip behind the
  mark (same seeded tear, the patron's accent), so it is one moment, still under 2.5 s. With cut-ins off it stays as it
  is today.
- Witnessed, prayers, vows, Devotion: no (they are frequent or already have their own marks).

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
  `clamp(150px, 26vh, 280px)`, centred at 46% of the height, tilted −4°. Body `#10151F`; the ink lip 6–9 px wider on
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
| A god | The patron's accent (`accentOf(patron)`, §9.1 on patron ids) for the lip; words in `FAITH_INK` `#D36A90` (faith words are Virtue ink; the gold is light only) | `#0A0D13` | white / `#E7EBF3` |
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

`tear(seed, edge, widthPx)` in `apps/web/src/game/cutin/tear.ts`: mulberry32 from a 32-bit hash of
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
  reason: 'interjects',           // short words for the caption when there is no line
  line: 'Not yet. You haven\'t paid.', // optional: the god's words, shown in quotes
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

### 4.2 Client (this browser only)

```ts
import { showCutIn, EV_CUTIN, EV_CUTIN_START, EV_CUTIN_END, type CutInSpec } from './game/cutin';

showCutIn(spec): Promise<'shown' | 'skipped' | 'off'>      // resolves when the cut-in has cleared
window.dispatchEvent(new CustomEvent('phc:cutin', { detail: spec }))   // the same, for .js screens and devtools

interface CutInSpec {
  id?: string; seed?: number | string;
  kind: 'crit' | 'takedown' | 'revive' | 'ultimate' | 'legend' | 'song' | 'god';
  strips: { img: string; eye?: { x: number; y: number }; ink: string; name: string; god?: boolean }[]; // 1–4
  label: string;                 // "INTERVENTION · THE TOLL-KEEPER"
  caption?: string; line?: string;
}
// Out: 'phc:cutin-start' {id, kind}, 'phc:cutin-end' {id, kind, skipped}
// Helpers: cutInFromFx(g, events): CutInSpec | null (the engine events → a spec; tested), stripForChar(g, charId), stripForPatron(id)
```

`showCutIn` honours the Settings choice and reduced motion. It never slows anything: only the effects queue does, for
the combat stream. Use it for previews (the Proving Ground gets a "Cut-in" test button), never for a moment other
players should see.

## 5. Captions

### 5.1 Labels and captions

| Kind | Label (Chakra Petch) | Caption (Spectral italic) |
|---|---|---|
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

Constants in `cutin/timing.ts`: `CUTIN_MS(n, god, rm)`, `CUTIN_MAX_MS = 1700` (the safety cap, §6.3).

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
5. The slowed segment is **never compressed** by `MAX_SPEEDUP` and **never skipped** by the backlog trim or by a
   decided fight's `keep` (the gate segment is kept whole; older events go first).
6. Reduced motion, a "Once per scene" repeat or Settings Off: **no gate, no slow-mo**; the batch plays as today.

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
- **Safety:** the gate opens after `CUTIN_MAX_MS` (1700) whatever happens (an overlay that failed to mount, a thrown
  error, a hidden tab), so playback can never stall; `clearFx()` drops the gate and the overlay.
- `window.__phcHold` keeps working unchanged for the e2e suites. For tests: `window.__phcCutin = { count, last, skip() }`.
- TurnIntro: while a cut-in shows, no turn banner or your-turn card comes up; it waits for `phc:cutin-end`. Its
  `estMs` counts a `spotlight` as the cut-in's length (it only estimates when the fx clock is off).

### 6.4 Out of a fight

The story stream (`g.story.fx`) is watched by the cut-in layer itself, on every in-room screen (the area map, the sheet,
the level-up and Ultimate screens), not by `FxLayer` (which only draws the area map's stream when its grid is on
screen). A `crit` waits **1100 ms** after the state lands, so the dice verdict (shown at ~1.05 s) comes first; every
other kind waits 200 ms. No slow-mo, no input hold.

## 7. Settings

- `UiPrefs` (`sfx.ts`, localStorage `phc.ui`) gains `cutins: 'all' | 'scene' | 'off'`, default `'all'`.
- The Settings panel (`title/Title.tsx` `SettingsPanel`, the same one the game opens) gets one row: **Cut-ins: All ·
  Once per scene · Off** (three buttons, the chosen one pressed), under Reduce motion.
- **Once per scene:** a strip shows at most once per character (or patron) per `scene` key (the event's, so every
  player counts the same scenes and fights). A stack drops the strips already shown; if none remain, nothing plays and
  there is no slow-mo. Kept in sessionStorage per game code.
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
- `tools/validate_art.py`: every `characters` and `patrons` entry has `eye_line` with `0.15 ≤ y ≤ 0.70`,
  `0.25 ≤ x ≤ 0.75`; `docs/ART-INTEGRATION.md` and `art/README.md` document the field.
- `tools/build_web_assets.py` writes `apps/web/src/game/eyelines.json` (`{ "char-<id>": [x, y], "patron-<id>": [x, y] }`,
  keyed by the asset names the game already uses).
- **Patron ids:** `data/patrons.json` says `toll_keeper` and `counting_weaver`, the catalog and the files say
  `the_toll_keeper` and `the_counting_weaver`. Resolve the art with `faithArt.ts` `patronPortrait()` (it already tries
  both) and look the eye line up under the asset name it found. The strip's accent is
  `accentOf(id, FAITH_PATRON[id]?.accent)` (the data's accent first; patrons.json has all eight). Note: the fx
  handlers call `accentOf(e.patron, e.accent)` with no data accent, and `PATRON_ACCENT` is keyed on the `the_` names, so
  today the Toll-Keeper's and the Counting Weaver's intervention and Witnessed glows fall back to gold; the build fixes
  `accentOf` to read the data accent itself.
- **Uploaded portraits:** the sheet gains `portraitEye` (y, 0.15–0.70, two decimals; the engine's sheet check clamps
  it). Character creation's portrait step shows, under an uploaded portrait, a small **Cut-in framing** slider with a
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
- `apps/web/src/game/cutin/`: `CutInLayer.tsx` (mounted in `App.tsx` beside `TurnIntro`, z-index 64: over the turn
  intro's 57–58 and the effects layer's 45, under the Miracle's 66), `tear.ts`, `spec.ts` (`cutInFromFx`, strips,
  inks, captions), `timing.ts`, `index.ts` (`showCutIn`, the events); tests for the tear's determinism, the spec from
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
7. **Decision number:** this is decision 110. If the god interjection branch also takes 110, whoever merges second
   renumbers.
