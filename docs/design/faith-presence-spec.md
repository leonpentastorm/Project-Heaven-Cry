# Faith 2.2, "the god shows up": Witnessed, interventions and the patron on screen (design spec, 9 Nov 2026)

Status: **accepted direction (Leon, 9 Nov 2026), numbers provisional.** Rules revision **1.6.3**, decision **110**, spec
section 14 items **from 738** (Faith 2.1 ends at 737; Outburst 4.0 starts at 801). Branch `feature/faith-presence`.
Once written into `docs/rules/PHC-Core-Rules-v1.0.md` ("Patrons and prayer", the Witnessed condition, section 14), the
spec there wins.

## 0. Why

- The eight patron portraits are painted and shipped, but the game shows them only at character creation. After that a
  god is a small emblem, even during a Miracle.
- Interventions almost never fire. Witnessed lasted only until your next turn after a successful Hymn, the triggers
  were rare (a natural 1, a dry gun inside that window), and the numbers (20 Storm, 15 healing) were about one pistol
  shot.

## 1. Rules (rules 1.6.3)

**Witnessed** (Leon's rule; Faith 5, the Faithful only, as before):

- **A successful Hymn makes you Witnessed until the end of the fight, or until your patron's intervention fires,
  whichever comes first.** It no longer ends at your next turn.
- A Miracle still makes you Witnessed (Leon's rule names the Hymn; the Miracle is the bigger prayer and keeps it).
- Out of a fight Witnessed doesn't exist (as now: it's a fight condition).
- While Witnessed, its other effects stay as they are: +2 on attack rolls whose action carries a tag your patron likes,
  and taboo tags cost double. **Flag for playtest:** these now last much longer, so they may need tuning.
- The condition shows as "WITNESSED · UNTIL THE FIGHT ENDS OR <PATRON> ACTS".

**Interventions:**

- **When the trigger happens while you are Witnessed, your patron acts unasked, and Witnessed ends.** To be watched
  again you need another successful Hymn.
- **Once a fight; twice a fight from Devotion 7.** (Each one still ends Witnessed, so the second needs another Hymn.)
- **The numbers scale with Devotion:** 20 + 4 × Devotion (about 32 at Devotion 3, 48 at 7, 60 at 10), × Blessing power
  as every faith number is. This replaces the flat 20 Soul, 15 heal and 20 Storm.
- **The rare triggers widen:**

| Patron | Trigger (rules 1.6.3) | What happens |
|---|---|---|
| Nerukhan | An enemy damages a Downed or surrendered creature | That enemy takes (20 + 4 × Devotion) Soul |
| The Quartermaster | **You reload** (any reload), **your Evoker's core runs dry** (its charge hits 0), or **your MP runs out** (it hits 0) (Leon, 9 Nov 2026) | A reload: **it is free** (its AP comes back). A dry core: **a fresh core from the Quartermaster slots into the Evoker**, free (no AP, your spare cores untouched). Out of MP: **you get 25% of your max MP back** (rounded down) |
| The Laughing Mask | **An enemy misses you** | It falls Prone |
| The Toll-Keeper | An ally would drop to 0 HP | They stay at 1 HP |
| Mother Ember | An ally drops below a quarter of their HP | They heal (20 + 4 × Devotion) |
| Old Overcast | You kill an enemy | (20 + 4 × Devotion) Storm to the nearest other enemy |
| The Matchmaker | An ally next to you is hit | Half the damage moves to you |
| The Counting Weaver | An enemy crits you | It becomes a normal hit |

- Data: each patron's `intervention` in `data/patrons.json` (trigger ids, `scale: "devotion"`), the per-fight limit by
  Devotion in the `prayer` block; `tools/validate.py` checks them. The engine emits one fx event per intervention
  (`intervention {unit, patron, trigger, target, amount}`) that the web uses (section 2.6).

**A new line bank, `grant`** (3 lines a patron, the 11th bank; the validator's count rises): what the god says when it
grants a Miracle, in its costume's voice, calling the devoted by name. `{name}` is replaced with the character's name
in capitals. Examples of the register Leon wants ("I GRANT THEE THIS REQUEST"):

- Holy Father Nerukhan: "{name}. THE SAINTS HAVE HEARD YOU. I GRANT THEE THIS REQUEST."
- The Quartermaster: "{name}. REQUISITION RECEIVED, STAMPED AND APPROVED. SIGN HERE."
- The Laughing Mask: "{name}! OH, YOU WANT A SHOW? THEN LET'S GIVE THEM ONE."

Write all 24 in each patron's established voice (read its existing lines first). In-universe, no real-Earth names.

## 2. The patron on screen (web)

Colour: each patron's `accent` from `data/patrons.json`; the light is `--faith-light` `#F2C46A` (light only, always
beside a word). The portraits: `patronPortrait()` in `apps/web/src/game/faithArt.ts` (already shipped for all eight;
the mark is the fallback). Everything here respects reduced motion (`prefers-reduced-motion`: no zoom or flash; the
cards still show) and can be skipped with a click or a key.

**Sound and effects** follow the project rule (CLAUDE.md, Leon 9 Nov 2026): textured effects (glow, light rays,
sparkles, a heavenly burst) come from **CC0 or CC BY 4.0** assets, credited in `apps/web/src/game/sfxCredits.ts` /
`credits.ts` with author, source URL and licence; never NC, ND or personal-use. Look first at what the repo already
ships (the Kenney CC0 sets in `sfxCredits.ts`, `apps/web/public/fx`, `apps/web/public/sfx`). Only rings, lines,
tints and the cut-in panels themselves are drawn in CSS/SVG.

1. **A Whisper:** the prayer's icon (the Whisper's own Wick prayer icon) rises over the praying character's head,
   with the effect faith already uses when praying. No portrait.
2. **A Hymn:** a **square crop of the patron's portrait** (face and mask) appears over the praying character's head,
   framed in the patron's accent, for about 1.5 seconds. On a miss it greys and fades.
3. **A Miracle: a cut-in, like a game cutscene.**
   1. The screen dims. A heavenly effect in the patron's colour (light rays, glow, motes) fills it.
   2. **The patron's portrait cuts in over the whole screen**, larger than the combat map, above everything.
   3. **Below the portrait the god calls the devoted by name**, with a line from the `grant` bank, in large type
      (Spectral), the name in `--faith-light`. A short sound sting (sourced).
   4. The portrait pulls away and **the view zooms to the combat map (or the area map)** where the Miracle lands.
   5. **The Miracle happens** (the existing fx), and **a box on screen describes the effect**: the Miracle's name, its
      text, and what it did (from the log: damage, revives, surrenders…). It closes itself after a few seconds or on a
      click.
   - About 4–6 seconds in all, skippable. Everyone in the room sees it (it's driven by the fx event, like other fx).
   - Built as a **reusable cut-in system** (`apps/web/src/game/cutIn.ts` or similar): `showCutIn({ portrait, accent,
     name, line, sound, focus: tile | 'map', box })`, so other moments can use it later.
4. **The faith tab header:** your patron's portrait beside the Devotion meter; click to view it large (the existing
   lightbox).
5. **Pact, switch, farewell and grudge log cards:** a small portrait beside the card. A grudge's banner shows it greyed.
6. **Voice-line cards** in the story log and the combat log: a small round crop of the portrait instead of the mark.

## 3. Interventions on screen: the trigger for later (Leon: "leave a trigger here")

**Built, by the spotlight cut-ins** (decision 113, `docs/design/cutin-spec.md` section 12; Leon: "implement it to the
god interjection moment too"). The intervention's cut-in is the spotlight's: `faith.ts` `intervene()` emits a
`spotlight` event (kind `god`) beside the `intervention` fx, and the effects queue plays the patron's torn eye strip
over the fighter's before the action, then the action 15% slower. `playIntervention` keeps the map effect below, at
once, and draws no cut-in of its own; the small cut-in drafted here was not used. The text below is the original draft.

**Not built now (draft).** When the cut-in system above exists, an intervention should use a **small cut-in**:

- the patron's portrait slides in from the screen edge (a third of the screen, not over the map's centre), with the
  patron's `intervention` line below it and "<PATRON> INTERVENES" in the accent;
- the view does **not** zoom; the effect (the 20 + 4 × Devotion Storm, the free reload, the save at 1 HP…) plays on
  the map at once, with a one-line box ("Old Overcast intervenes: 48 Storm to the drill sergeant");
- about 1.5 seconds, never blocking input, at most one on screen at a time (queue them).

**The hook:** the engine already emits `intervention` fx; the web's fx player routes it to
`playIntervention(event)` in the cut-in module, which **today only logs and floats the existing text**. The function's
comment points here. **Any future implementer: build section 3 by filling in `playIntervention`**, using
`showCutIn` with a `size: 'small'` option, and add an e2e check like the Miracle's.

## 4. Checks

- Engine tests: Witnessed lasting to the fight's end; ending on the intervention; a second Hymn re-Witnessing; once a
  fight below Devotion 7, twice from 7; each trigger (the widened ones with tests); the Devotion scaling × Blessing
  power; the `grant` bank's `{name}`; determinism; old fights in saves.
- Web unit tests for the cut-in module (it builds the right portrait, line, focus and box from a Miracle fx event; it
  skips; reduced motion).
- e2e: a Miracle in the Proving Ground shows the cut-in (portrait, the name, the line), zooms, plays and shows the box
  (screenshots); a Hymn shows the square crop over the head; a Whisper shows the icon; the faith tab header shows the
  portrait; log cards show the crop. Run the faith set, `heart.mjs` and `two-players.mjs`.
