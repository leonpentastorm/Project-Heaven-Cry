# Lane D: Sigil, Soul, prayer and music (pending spec text, data deltas, open items)

Code: `packages/engine/src/perks/d.ts`. Tests: `packages/engine/test/perks-d.test.ts` (42 tests, every item, both tiers
where tiers exist). All 25 items are registered and every one of their effects is engine-run or explicitly
Narrator-ruled (no coverage gaps left in the lane). What the engine can't judge goes to the Narrator: a fight note, a
pending ruling (story actions), or the item's brief() line.

Items marked **PROVISIONAL** follow the audit's recommended fix (plan §6). Each needs `provisional: true` on its data
item and an open item in spec §14. They are numbered D1… here: the integrator gives them §14 numbers after the other
lanes' (lane A starts at 101).

## Spec text (for "Shared rules for perks, traits and classes", rules 1.3)

- **Sigil stroke pool.** How many of your glyphs may stand on the map at once before the oldest fades. It equals Max
  Sigil words; Hold the Stroke adds to it. Max Sigil words still caps the words in one spell.
- **"Still active" Sigil** (Parallel Thought): one of your STAY zones (wall, smoke or light made with STAY) is standing.
  Unfired glyphs and impact smoke or light don't count.
- **Wards and rituals** (Rite in the Field): wards are drawing a WARD glyph, Begin on a Buff (Guarded) Outburst and the
  Warden's Ward move; rituals are Pray and Crystallise.
- **Upper-realm beings** are enemies with `kind: upper_realm` (or the tag `upper_realm`) on the Narrator's start_fight
  enemies or the campaign's zone NPCs.
- **Verse** is declared by the player: Say the line in the fight (free), then Begin with "In verse" (or "Release in
  verse" for a held Outburst). The Narrator audits it after the fight, never per cast.
- **The music traits' modifier** reaches every d20 that uses the skill: story checks, asks and stealth (music.ts), voice
  passives and initiative, and in a fight the weapon attack, Sigil and Soul strikes, prayer, shoves, spotting and the
  three saves. It never reaches derived stats. A shield of 30 or more you give starts your song, the same as a big heal.

## Item rulings and provisional numbers (new §14 items)

D1. **Hold the Stroke** (spec item 15). +1 / +2 stroke pool. It doesn't change words per spell.
D2. **Parallel Thought** (plan 6a-9, PROVISIONAL). Once per turn, and only while a STAY zone of yours stands. The
    discount (1 / 2 AP) covers the glyph draws first, then the Evoke, never below 0. It ends with the Evoke, and
    anything left over is lost.
D3. **Heart Overload** (plan 6a-4, PROVISIONAL). It's a toggle on Begin ("Pay with HP"), 2 / 1 HP per point of mana,
    after every other discount, as true HP loss.
    - An HP-paid cast can't heal or shield: its heal and shield come to 0.
    - It can't be held to grow: a held Outburst pays mana.
    - You can't pay into Downed.
    - Without an Emanator the toggle is off, because you already pay from the air. **Leon to decide** whether it should
      waive the +2 Strain instead.
D4. **Resonance.** Allies only. The best discount you've been given waits for your next Begin, and that Begin uses it
    up.
D5. **Rite in the Field** (PROVISIONAL mapping, needs Leon's OK). −1 / −2 AP, in combat only, with these floors:
    - WARD glyph: 0.5;
    - Guarded Outburst: 1;
    - Pray: 1;
    - Warden Ward: 1;
    - Crystallise: 1.
D6. **Clean Draw** (PROVISIONAL). It costs 0 AP to arm, once per fight; the use is spent when you arm it.
    - Clean glyphs cost no charge and no Flux.
    - Evoking a pattern made only of your clean glyphs costs no charge.
    - The Evoke disarms it, and so does losing the clean glyphs.
    - An enemy evoking them pays as normal.
D7. **The Twin Pays** (PROVISIONAL). A toggle on Begin, once per fight: 0 MP, no meter drop, no Strain on the cast or
    while it is held (Right Brain Debuff's +20% included).
D8. **Twin Souls** (PROVISIONAL). "Mid-level" is dropped: any design may carry a third school, at +20 MP before the
    band and Insight saving.
    - The third school runs at release, before the first two.
    - Story: once per session, a private question, answered as a pending ruling, short of proof (the Veil).
D9. **Twin Discipline** (PROVISIONAL). Its costs:
    - the Evoke's charge and AP now;
    - the Outburst's MP and Strain, already paid at Begin.

    How it works:
    - The pattern's shape decides the targets.
    - Rain, Size, Random and Move are ignored, and Ether is implied.
    - A Ring is ×0.8.
    - The pattern's Subject words don't fire, and its glyphs fade.
    - A STAY pattern can't be fused.
D10. **Verse of War** (plan 4.3). It applies only when the player has Said a line that round (on the area map, the
     toggle alone). +1 range on Begin, and on Release through "Release in verse". ×1.1 on the Soul damage of that
     release.
D11. **Fire Sermon** (PROVISIONAL). Enemies within 4 tiles. The Heart save is against 12 + your Heart debuff strength
     (Implication).
D12. **Litany.** You are included. It doesn't stack: the higher Litany stands. It ends at your next turn start.
     - Story: once per scene, the party's next save check gets +1 / +2.
     - It reaches every save through applyCond. The Control school's push and pull save doesn't go through applyCond
       (see the missing hooks).
D13. **Upper-Touched** (PROVISIONAL). 0.8 × Outburst MP, keeping the 5 MP floor.
     - Sense: a log line when an upper-realm foe comes within 10 tiles.
     - Seen From Above: you can't stay Hidden while one stands, and their spot rolls always succeed. In the story an
       upper-realm NPC always notices your sneak.
     - **Blessing d6 table**: 1 the Blessing fails, 2 +1 Strain, 3 Shaken for 1 round, 4 normal, 5 ×1.5 power, 6 a voice
       from above (a Narrator note).
D14. **Sigil Savant** (plan 6a-19, PROVISIONAL).
     - Muscle Memory: one word, chosen once (the Perks action). It draws for 0 charge and Glyph AP −1, never below 0.5.
       It still adds 1 Flux, and the Evoke's charge is paid.
     - Rigid: at each long rest you practise at most Max Sigil words (the Perks action "Practise words"). If you don't
       choose, the first Max Sigil words you know are practised. The Muscle Memory word is always practised. Until the
       first long rest, everything you know is practised.
D15. **Hollow Heart** (PROVISIONAL). A Mana Short that Downs you leaves you stable: your death saves always succeed but
     never stand you up, and hits while you're Downed add no failures. You're back at 1 HP after the fight, or when
     healed.
     - +10% on the Soul damage you deal.
     - Echo Chamber: casting reveals you, and you can't hide that turn. The Narrator is told that the enemies within 10
       tiles know where you are. On the area map it ends your sneak.
D16. **Heretic** (PROVISIONAL reading).
     - Stolen Fire: pray to any patron for any of its Blessings, with no pact. Will Power stands in for Faith in the
       gates (3 / 5 / 7), the roll and the cooldown, and Devotion is never changed.
     - Blessing Power = 1 + 0.1 × Will Power.
     - Excommunicated: an ally's Blessing on you fails on a d6 of 1–2. At the campaign's first session start the Lumeri
       Church is set to −40 (Hostile). The Narrator decides which other faiths count.
D17. **True Believer** (PROVISIONAL).
     - The cooldown is 1 turn shorter, never below 1.
     - The miracle is a story button, once per session.
     - Missed rites are `traitState rites_missed` (set by the Narrator). Each one is −1 on Faith and Will Power rolls,
       capped at −3.
D18. **Heaven's Faithful** (PROVISIONAL). The Treason check is d20 + Faith against **TN 12**, once at the start of each
     fight against upper-realm beings. A failure costs −2 AP on your first turn.
     - Communion: once per scene, a private pending ruling.
D19. **Music traits.** They follow the scope in the spec text above. Shields of 30+ count as a big heal.
D20. **You Get Used to It.** Tier I's −1 comes at the start of your next turn, at most once per turn. The +3 AP comes
     when you heal or shield an ally (not yourself) who carries a Brain debuff. It is once per turn and within the
     +3 cap. Tier II has no penalty.
D21. **Shared Breath** (PROVISIONAL). The link range is 3 tiles, with sight.
     - The partner takes the debuff with no save.
     - Half duration is rounded up, minimum 1. Untimed ones (Disarmed) stay untimed.
     - Tier I ends after one split. Tier II lasts the fight.
D22. **Mirage** (plan 6a-10, PROVISIONAL).
     - Range is 6 + mod(Visualization). The Analysis check is d20 + tier (minion 0, soldier 1, elite 2, boss 3) against
       12 + mod(Visualization).
     - It lasts until the start of your next turn (Tier II: the turn after).
     - There is one cast per caster: a new cast replaces the old.
     - An enemy that saw through one of your Mirages, or attacked a figure, gets +5 against your later Mirages.
     - A wall stops a believer's move at the tile and refuses its shots through the tile.
     - A figure takes a believer's attack, as a miss, and disproves it.
     - A sound pulls a believer one move toward the tile instead of an action (once).
     - Tier II's second projection comes in `text` ("x,y" or "kind@x,y").
D23. **Solid Image** (PROVISIONAL). It works only on Mirage projections (the Visualization Afterimage decoy isn't built
     yet).
     - A wall becomes a barricade object until your next turn starts.
     - A figure takes the first hostile hit on any ally, for 0, and breaks.

## Data deltas needed (for a data agent)

- Add `provisional: true` to: parallel_thought, heart_overload, rite_in_the_field, twin_souls, twin_discipline,
  fire_sermon, upper_touched, sigil_savant, hollow_heart, heretic, true_believer, heavens_faithful, shared_breath and
  mirage. clean_draw, the_twin_pays and solid_image already have it.
- hold_the_stroke: the stat `sigil_strokes_max` should be named `sigil_stroke_pool` in effect_ops.json (or documented).
- heart_overload: data says `alt_cost`. The engine runs it as a toggle, so the text should add "can't heal, shield or be
  held (provisional)".
- upper_touched: put the d6 Blessing table in the trait's `notes`, or in a data table.
- heretic: `faction_start` should list `Lumeri Church` explicitly, with `standing: -40`.
- true_believer: `daily_upkeep` should name the traitState key `rites_missed` and the cap of −3.
- heavens_faithful: `gate_check` should get `tn: 12`.
- twin_souls: drop "mid-level" from the context. The outburst design schema needs `school3` / `option3` (validator).
- mirage: put `range: "6+mod(visualization)"` and `tn: "12+mod(visualization)"` on `spawn_illusion`.

## Missing hooks and engine changes (for the hooks-gap agent)

1. **drawGlyph fade cap.** Hold the Stroke tags pooled glyphs `by: "<id>#pool"` so magic.ts's `x.by === u.id` fade
   check skips them.
   - Cleaner: a `glyph_pool` stat that drawGlyph reads instead of `m.maxWords`.
   - The tag is harmless today: only that line reads a glyph's `by`. Anything new that reads glyph.by must split on
     `#`.
   - The Sigils tab should show "Glyphs on the ground n / pool" (`strokePool(cb, u)` exported from perks/d.ts).
2. **glyph_cost has no refusal field.** Sigil Savant's Rigid sets `ap = 99`, so the player sees "Needs 99 AP." Add
   `ctx.why` (or `fail`) to glyphCost/drawGlyph and switch Rigid to it.
3. **evoke_cost only ever fires with `preview: true`.** previewEvoke always emits it, and evoke uses the preview's
   numbers. Parallel Thought and Clean Draw detect the real Evoke afterwards: the pattern's glyphs are gone, or a new
   zone of yours appeared. An `evoked` hook after evoke (and a real `preview: false` on the cost) would be cleaner.
4. **releaseOutburst has no cost hook before aimError.** So Verse of War's +1 range on a held release needs the Perks
   action "Release in verse", which bumps `m.soulRange` around releaseOutburst. A `release_cost {range}` emit in
   releaseOutburst would let the "In verse" toggle ride `combat/release` too.
5. **Outburst-cost refusals.** previewOutburst can't take a refusal from items, so Heart Overload can't refuse a
   healing design. It neutralises the heal and shield (0) and logs why instead. Add `ctx.fail`.
6. **No hook after the release effects.** Twin Souls' third school runs at `outburst_release`, before the first two
   schools. The real fix is designCost (+20 for school3), releaseAt's `schools` list (school3, with `option3`), and the
   design validator (game.ts) allowing school3 only with twin_souls. Then delete `extraSchool` in d.ts.
7. **A held Outburst's Strain** is added in magicTurnStart with no hook. The Twin Pays takes it off at the previous
   `turn_end`. An `outburst_hold {strain}` emit in magicTurnStart would be exact.
8. **Crystallise has no AP hook.** It uses fixed SPELL_AP. Rite in the Field adds "Crystallise (rite)" in the Perks tab.
   Use `actionAp({u}, 'crystallise', 3)` in magic.ts and the extra action can go.
9. **The Warden's Ward move** must price itself through `actionAp(…, 'ward', 2)`, so Rite in the Field's
   `ap_cost:ward` reaches it (class lane).
10. **Control push/pull saves** (releaseAt) call saveOf directly, without cond_apply, so Litany's `saveAdd` and other
    save mods miss them. Route them through a shared save helper.
11. **Story prayers** (`story/pray`) roll `mod(faith)` without `skillRollMod`, so True Believer's rites penalty and
    music traits don't reach them. There is also no hook, so Upper-Touched's d6 and Heretic's ally-fail don't run on
    story Blessings (they are Narrator-ruled through the brief).
12. **Hidden per side, and fog presence.**
    - Upper-Touched's sense (a presence marker through fog for upper-realm foes within 10) needs `visibility()` to ask
      the items (a `sense` hook). Today it's a log line.
    - Hollow Heart's "seen through fog by enemies within 10 until your next turn" needs a per-unit "revealed to"
      override. Today it reveals you and writes `cb.lastSeen`; the enemy AI doesn't read `lastSeen`.
13. **Mirage needs per-unit sight and move blockers.**
    - Walls use move_step (the believer is put back on its last tile) and attack_preview (a refusal). They don't block
      the believer's line of sight for spotting, or its path planning.
    - Figures aren't units, so the enemy AI never "chooses" one: a believer's attack at the caster's side goes at the
      figure instead, if it can see it.
    - Projections need a UI layer: `u.ps['perk:mirage'].proj [{kind, tile, left, believers}]`.
14. **Mirage and Solid Image UI.** The Perks tab needs a kind picker (wall / figure / sound) and, for Tier II, a second
    tile. Twin Discipline's Fused Evoke needs the pattern tile plus an aim (`choice`). Heretic's Stolen Fire needs a
    patron and Blessing picker (`choice: "patron:blessing"`). Sigil Savant needs a word picker (`choice`) and a
    practised-words picker.
15. **Fire Sermon in the story.** A Blessing landing while preaching could `setStoryCond(shaken)` on hostile NPCs if
    story/pray emitted a hook. Today it's a pending ruling.

## Not done / left to others

- Heart Overload without an Emanator: Leon's call (D3).
- Twin Souls' third school can't appear in real play until the validator allows `school3` (missing hook 6). The engine
  side is tested with a hand-made design.
- The Afterimage decoy (Visualization unlock) for Solid Image belongs to the skill-unlock lane.
- Stray file `packages/engine/test/_lane_c_cov.test.ts` belongs to lane C. My own leftover `_lane_d_cov.test.ts`
  (committed in dfb9ad8 by the snapshot) is deleted.
