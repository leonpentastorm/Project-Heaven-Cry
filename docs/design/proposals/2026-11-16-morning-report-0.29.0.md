# 0.29.0 "the nine doors": the whole account (16 Nov 2026)

For Leon. **0.29.0 is live** (https://project-heaven-cry.leonpentastorm.workers.dev, commit 98772514, rollback branch
`backup/live-0.29.0`; 0.28.3's backup is kept). The long version with every count is
`2026-11-nine-doors-report.md` in this folder; this file is the short one plus what the browser playtests changed.

## 1. What was done

1. **All nine doors have their mechanic in the game**, each opened by one point in its alpha skill, each with its own
   resource, its own effects on the map and a one-line "how this works" on its tab.
2. **Guard 2.0** (Durability): plates on the token, the Guard technique with any weapon, Brace, Close Guard, Retort,
   Challenge, Slam, Last Plate, Set Against the Blow. A tank hits with Durability while holding plates.
3. **Momentum 2.0** (Raw Power): the x1 to x5 chain, four Finishers (Cleave, Break, Coup, and the Breaker's Launch),
   Charge Carries, Wrecker, Breach.
4. **Pressure 2.0** (Dexterity): pips on the target, Pressed / Suppressed / Broken, Slide, Fire and Move, Relocated,
   Near Miss, Flush Out.
5. **Shadow 2.0** (Ingenuity): the SHADOW tab from 1 point, Hide for 1 AP with the hide tiles shaded and eye lines,
   Tag, Ghost Kill, FOUND.
6. **Figments 2.0** (Visualization): ten forms, fifteen orders, Redraw, Cash in, Glimmer, two forks you pick.
7. **Bonds 2.0, slice 1** (Empathy): Tug, Snap, Last Thread, the Bond on an enemy; healing costs three times what it did.
8. **Prayer 2.0** (Faith): the Chaplain's Canticle, Amen, Holy Dread, Last Rites.
9. **The Open Hand**: the monk lives in a glove family (Jab, Palm, Sweep, Snatch, Counter, Sway, Breath, Open guard).
10. **The 18 alpha perks rewritten**, two per door, each feeding its door's play.
11. **Under it:** mods as data and as rewards, special rounds by calibre, melee damage by attribute, camp kits for
    every door, Give on the field, one Taunt rule, one forced-move rule, one boss rule.
12. **Proof:** 4,600 engine tests, 1,459 screen tests, all 71 browser suites, two browser playtests covering every
    door, and a fix pass for what those found (the monk's forms stacking was the one that held the release).

## 2. The nine doors

| Door (skill) | Class | What only they do | Resource | Turn decisions | Grows by |
| --- | --- | --- | --- | --- | --- |
| Guard (Durability) | Bulwark | Stand in front; blows break on plates | Guard, 4 plates | 1 to 2 | fixed ladder |
| Momentum (Raw Power) | Breaker | Build a chain, then throw a man across the room | Momentum, 5 | 2 to 3 | techniques per weapon |
| Pressure (Dexterity) | Skirmisher | Pin the field and never stand still | Pressure on the target | 3 | the gun, its mods, its rounds |
| Shadow (Ingenuity) | Operative | Unseen until it is too late | Shadow | 2 to 3 | fixed ladder of 19 verbs |
| Sigils (Brain Power) | Sigilist | Write the spell this room needs | cores, Flux | 4 to 6 | words studied and mastered |
| Figments (Visualization) | Rigger | Build the bodies, walls and traps you need | charge, held count | 3 to 4 | two forks, designs |
| Bonds (Empathy) | Mender | Hold the squad on a thread that cuts both ways | MP, the Ledger | 2 | fixed ladder |
| Outbursts (Will Power) | Channeler | Pour a feeling into one huge release | MP, Strain | 3 to 5 | modules, 25 feelings, tones |
| Prayer (Faith) | Chaplain | The god answers and the squad sings | Devotion, the Hymn wait | 2 | the patron (8, or none) |

## 3. Depth, with Sigils as 100

| Door | Share of Sigils | Why |
| --- | --- | --- |
| Sigils | 100 | about 1,000 spells mid-career, 125,000 at the ceiling, and where you stand is part of the spell |
| Outbursts | 95 | about 1.6 million designs on paper; as deep, less about the grid |
| Pressure | 55 | deep through the gun and its parts, not through the door itself |
| Figments | 55 | real building, but half the planned forms |
| Momentum | 45 | the chain is real; few choices inside a turn |
| Shadow | 35 | a good map puzzle on a fixed ladder |
| Prayer | 35 | rich flavour, thin turns |
| Bonds | 25 | a healer with two new verbs |
| Guard | 20 | attack, then Guard, most turns |

Two doors are deep, three are solid, four are a first slice. That is the honest state. Nothing reaches Sigils, and
nothing has to: the aim is that every door has a real choice each turn and a real choice at level-up. Four doors do
not have the second yet.

## 4. How distinct they are

**Distinct in identity:** yes. Nine resources, nine looks, nine roles in a squad; no two doors are the same job.

**Not yet distinct in verbs:**
- **Pushes:** Slam, Palm, Shove and the Wall's Press are all "1 tile and Off Balance". Only Launch and Tug stand apart.
- **Taunts:** Challenge, Draw Fire and the Double's Draw fire now share one rule, which is correct, but that makes
  them one verb with three names.
- **Taking a blow for a friend:** Close Guard, Interpose, Take the Hit, the Ward form.
- **Healing** is in four doors.

A data pass fixes most of this (merge Draw Fire into Challenge, retire Take the Hit, give Slam and Palm their own
shape). It is cheap and I would do it before adding anything.

## 5. Against its peers: my view

I am naming them plainly here; none of this is game text.

**Where this game is ahead**
- **Spell-making.** No shipped tactics RPG I know lets a player compose a spell from a grammar and aim it by where
  they stand. Divinity: Original Sin 2 has surface combos and Baldur's Gate 3 has a long spell list; both are menus.
  Sigils and Outbursts are the best thing here and they are original.
- **Build freedom on paper.** 27 skills bought point by point, nine doors, any mix. That is wider than XCOM 2's class
  trees and as open as Divinity's classless system.
- **The idea.** Skills that are voices, doors anyone can open, an engine that owns every number with a live Narrator
  on top. Disco Elysium has the voices and no tactics; the AI-narrated browser games have a narrator and no rules.
  Nobody has both.

**Where it is level**
- **Gunplay** against XCOM 2: cover, overwatch, suppression, plus Pressure as a shared meter. Comparable, less polished.
- **The run structure** against Slay the Spire: the path map, shops, the Forge, boons are all there.

**Where it is behind, and by how much**
- **Viable builds, badly.** In simulated runs four melee fighters clear stage 1 about 4% of the time and four Sigil
  casters 0%; four gunners 63%. Duos do worse than solos. Divinity's freedom works because almost anything can win.
  Here freedom is real and victory is narrow. This is the largest gap and it is tuning, not design.
- **Class signature.** An XCOM Ranger or a Breach mech is known by one verb nobody else has. Our four slice-one doors
  share theirs.
- **Clarity.** Into the Breach shows exactly what every enemy will do. We show hit chances and a log. The more systems
  we add, the more this matters.
- **Feel.** Effects are drawn in SVG and CSS. It reads; it does not hit. Every big-studio peer is far ahead and will
  stay ahead until art and animation arrive.
- **Content.** One stage map, one campaign. Slay the Spire's depth is three hundred cards tuned against each other
  for years.

**The verdict.** As a design this is deeper and more expressive than anything in its weight class, and in its two
magic systems deeper than the big ones. As a game someone plays tonight it is uneven: a Sigilist, a Channeler or a
gunner has a rich evening; a tank or a Mender has a correct one. The foundation Leon asked for is there: every class
has its own thing and it works in a browser. What is missing is not another system. It is fitting (so every door can
win), forks (so every door has choices) and feel.

## 6. What stops "everyone does something only they do best, and enjoys fighting"

1. **Parties lose.** Scale the encounter budget per head; add every door to the simulator.
2. **The gun and the solo tank outclass the rest.** Gun with both perks 195 against a line of 145; the solo tank
   clears stage 1 16 times in 16.
3. **Four doors have no choices as they grow** (Guard, Shadow, Bonds, prayer). The fork action exists (`door/pick`,
   used by Figments); after that each fork is data.
4. **Verbs overlap** (section 4).
5. **The tank's and the Mender's turns are near one button.** The follow strike (below) is the tank's cure.

## 7. Numbers that need your eye

| Measure | Line | Now |
| --- | --- | --- |
| Gun, no perks / both alpha perks | 145 | 162 / 195 |
| Blade, no perks / perks | 165 | 168 / 165 |
| Sigil Line of 4 | 150 to 200 | 176 / 197 |
| Outburst steady / peak | 135 / 206 | 121 to 141 / 210 |
| Hymn turn | 150 | 135 to 140 |
| Figments door / Rigger | 130 / 150 | 119 / 123 |
| Solo tank, stage-1 clears of 16 | 9 to 13 | 16 |
| Monk, stage-1 clears of 16 | no line | 5 |
| Mends per full MP bar | no line | 10 (was 31) |

## 8. Calls I made for you (reverse any)

- Outburst damage base 31 to 37 and its peak band widened, so the perks sit on top of the line.
- Guard's cap 5 to 4; Set Against the Blow at Durability 3.
- One form per blow for the monk; Palm pushes once a turn and never a Boss.
- A Boss is never forced by a Taunt (a penalty instead) and never moved by a player, except Tug's 1 tile.
- Durability's "hit with Durability" does not apply to thrown items.
- Tug costs 12 MP. A new camp kit for the Operative and for the monk.
- Three small engine fields added by the integrator: Tug's ally pull is willing, a camp row keyed by archetype, and
  `characters_each` in the mode data.

## 9. Known faults in live 0.29.0

- Open guard's −2 is shown on the glove's card only, not in the fight.
- The Hand's Hand over spends a stim on an ally at full HP (the stim rule counts that as tending: your ruling).
- An Operative opens its first Survival turn on ATTACK, because Hide is refused while seen.
- A Chaplain can get two door tips in one fight. The SHADOW meter row is clipped at 1600 × 900.
- The log says "uses Cut" for gloves; the menu says Strike.
- Not confirmed in a browser: Set Against the Blow, Retort, Near Miss, Flush Out, Charge, fitting a mod at the Forge.

## 10. Built since, waiting to ship together as the next version

- **Fight-tab settings** (cog menu, per character: order, hide, reset; keys follow your order), **Scuff on Utility**
  with a mirror on the Sigils tab, the Sigils tab hidden with no Evoker, and the **bare-handed Outburst warning**.
  Green, on `wip/lane-0.29-tabs`.
- **A shield in either hand** (shield + focus, two shields). In review, on `wip/lane-shield-either-hand`.
- **The follow strike**: a tag on an off-hand item that rides each main-hand melee attack (the shield swing; a
  legendary off-hand knife; graftable by a mod). Being designed against the dual-wield code, `wip/design-follow-strike`.

**Rulings I need:**
1. A held Outburst does not swell on a turn in which you gained Guard. (My proposal; closes the shield-and-swell loop.)
2. Bare-handed Outbursts made truly harmful: +2 Strain per stage and no free swell. Today the only cost is +2 Strain
   per Begin, and it is cheaper in MP than using the glove, so the new warning oversells it.
3. The tank's free Buckler against the camp budget; whether 3× healing cost is enough.
4. Guns at 195% with both perks: refit the two perks, or raise the line.

## 11. Art

`art/briefs/GPT-PROMPTS-2026-11-16-nine-doors.md`: 375 images with prompts, sizes and file names. 305 placeholders are
in the game; 20 are drawn by a screen today (the 18 alpha perks, the Open Hand, Glimmer): paint those first. A file
dropped at its listed name replaces its placeholder with no code change.
