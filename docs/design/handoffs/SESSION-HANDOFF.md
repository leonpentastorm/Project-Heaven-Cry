> **Note (14 Nov 2026): `START-HERE.md` in this folder is the current entry point; where it disagrees with this file, it is newer.**

> **16 Nov 2026 (newest): 0.29.0 IS LIVE.** https://project-heaven-cry.leonpentastorm.workers.dev serves 0.29.0 (`assets/index-CS0sQSbu.js`); `main` = `develop` = 98772514; `backup/live-0.29.0` pushed. What shipped: `CHANGELOG.md` 0.29.0 (rules 1.56, "Balance 2.0": the nine doors, mods as data and as rewards, special rounds by calibre, variants as data, the melee profile). 0.28.3 was the version before. Where anything below says 0.29.0 is not deployed or live is 0.28.x, it is older.
>
> **Live check of 0.29.0 (`--no-build --jobs 2`): 5 of 8 suites passed.** Passed: creation-points 97 checks, survival 189, room 27, shadow 18, tending 28. Failed even alone: old-save (1 check, `page.reload` timed out at 30 s waiting for the load event), fight-cards (14 checks, same), figments (0 checks, `page.goto` timed out at 30 s). Locally all three pass (old-save 4, fight-cards 22, figments 17; figments also failed beside the others with the same `page.goto` timeout and passed alone, so it is flaky under parallel load). Cause not confirmed: all three are 30 s waits for the load event, not assertion failures; the live app does not appear faulty. A guess: the load event stays slow because of the roughly 147 resources fetched. Title shows 0.29.0; the root HTML took 0.76 s and the JS bundle 0.69 s by curl; in the browser DOMContentLoaded was at about 1.63 s with the title text rendered, loadEventEnd still 0 after 1.5 s.
>
> **Backups kept:** `backup/live-0.29.0` and `backup/live-0.28.3`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.28.2` deleted as the third).
>
> **Open / what comes next:**
> (a) Built and green on their own branches, NOT merged, to ship together as the next version: the fight-tab settings, Scuff on Utility with a mirror on the Sigils tab, and the bare-handed Outburst warning (`origin/wip/lane-0.29-tabs`, head 00aff2c3); a shield in either hand (`origin/wip/lane-shield-either-hand`, in review); the follow-strike design (a tag on an off-hand item that rides each main-hand melee attack; `origin/wip/design-follow-strike`, a draft).
> (b) Rulings waiting on Leon: a held Outburst does not swell on a turn in which you gained Guard (lead's proposal, not built); bare-handed Outbursts made truly harmful (+2 Strain per stage, no free swell; lead's proposal, not built; today the only cost is +2 Strain per Begin, `data/soul_modules.json` `cycle.no_emanator_strain`); rows inside a fight tab can still shift when a verb unlocks (needs one row-order rule in the engine's list).
> (c) Known faults live in 0.29.0 from the playtests: the Open guard -2 is shown only on the glove's card, not in the fight; a stim used on a full-HP ally through the Hand's Hand over is spent for +0 HP (the stim rule counts it as tending: needs a ruling); a Chaplain can get two door tips in one fight (a fight has no id to key by); the SHADOW meter row is clipped at 1600x900; an Operative opens its first Survival turn on ATTACK because Hide is refused while seen (`doorView.ts:58`); the fight log still says "uses Cut" for gloves (the menu says Strike); not verified in a browser: Set Against the Blow, Retort, Near Miss, Flush Out, Charge, fitting a mod at the Forge.
> (d) The consolidation pass before the next system and the number-fitting pass (party budget per head, gun and solo tank outclassing, forks for five doors via `door/pick`) are owed: see `docs/design/proposals/2026-11-nine-doors-report.md`.



> **16 Nov 2026 (latest): (older) 0.29.0 WAS READY ON THE BRANCH, NOT DEPLOYED; LIVE WAS 0.28.3. This block is newest; where anything below says otherwise it is older.**
>
> **LIVE: 0.28.3** at https://project-heaven-cry.leonpentastorm.workers.dev (`origin/main` = `origin/develop` = 2e558ac6): the field after a won fight is the same fight still running (`Combat.field`), the camp as a checklist, Give amounts, Tending's MP tripled, the Durability tank (`CHANGELOG.md` 0.28.3).
> **0.29.0 "Balance 2.0"** is on `feature/0.29` (origin `wip/feature-0.29`), version bumped in every package.json, `CHANGELOG.md` 0.29.0 written. It holds rules 1.56: the nine doors (Guard 2.0, Momentum 2.0, Pressure 2.0, Shadow 2.0, Figments 2.0 slices 2-3, Bonds 2.0 slice 1, prayer 2.0, the Open Hand gloves, the 18 alpha perks rewritten), mods as data and as rewards, special rounds by calibre, variants (data only), the melee profile, the 13 px floor, and live 0.28.3 merged in (the field's design wins; 0.29's systems checked on the field by the same gates: `packages/engine/test/survival-field-029.test.ts`). The account of what each door got, how deep and what is missing: `docs/design/proposals/2026-11-nine-doors-report.md` (with `2026-11-nine-doors-audit.md` and the consolidation reports `2026-11-consolidation-0.29-wave2.md`, `-wave3.md`).
> **Calls made in the 0.28.3 merge, for the lead to reverse:** (1) the displace op takes `willing: true` (an op field, not a new op), so Tug's ally pull is willing and allowed on the field; (2) the camp's Recommended rows take a new key `character` (the character's own archetype) for the Monk's Hand wraps; the Operative's row is `{top: ingenuity, archetype: pistols, focus: false, profile: shadow}`; (3) `data/modes.json characters_each` (Survival 1) is read by the lobby header and the run's start check; (4) Tug 4 -> 12 MP (0.28.3's three times); Snap has no MP and is unchanged; (5) live keeps spec items 4129-4140, 0.29's old 4134-4159 are now 4160-4185.
> **Open:** the numbers not yet fitted (guns above their line with perks, the solo tank, casters and duos in Survival); the designed-but-unbuilt list in `CHANGELOG.md` 0.29.0 "Known and unfinished"; Bond on a machine said "Click a target." on live 0.28.3 and did not reproduce under tests (two tests pin the right reason).
> **Deploy** is done by hand with the wrangler OAuth login and `wrangler kv bulk put` (`tools/deploy_site.py` needs a token), and only on Leon's word for 0.29.0. Then `backup/live-0.29.0`, and the WIP rule (CLAUDE.md) for the 0.28.x `wip/*` branches.
>
> **15 Nov 2026 (older): 0.28.2 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.2** (15 Nov 2026) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = 8d651fb1; `backup/live-0.28.2` pushed. Title shows v0.28.2. It carries the fixes from Leon's playtest of 15 Nov (rules 1.55 items 27 to 44): the field's actions and action bar, hand-overs and stims on the map, health words on tokens, Figments shown (movement, icons, a FIGMENTS section, designs), the Sigil word cap warnings, and Survival XP pace (`CHANGELOG.md` 0.28.2).
> **Backups kept:** `backup/live-0.28.1` and `backup/live-0.28.2`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.28.0` deleted, now the third latest).
> **Next, 0.29 "Balance 2.0"** is on branch `feature/0.29` (origin `wip/feature-0.29`). Merged lanes: mods as data, recoil field, special rounds by calibre, mods in Survival, melee damage from Strength / Agility, Pull Out only when stuck, variants as data, display. A fix wave is running; then 0.28.2 is merged in; then the alpha-perk revamp (`docs/design/proposals/2026-11-alpha-perks-revamp.md` on `origin/wip/design-alpha-perks-revamp`; Leon's rulings: perk ids kept with no re-pick; perk steps sit on top of the class ceiling), Figments 2.0 (`origin/wip/design-figments-2`, `docs/design/proposals/2026-11-figments-2.0.md`; rulings: the glove is always required, swap places is the Rigger's only, the Hand carries a real stim from the owner's pack) and Bonds 2.0 (`origin/wip/design-bonds-2`, `docs/design/proposals/2026-11-bonds-2.0.md`; rulings: the per-Bond damage bonus stays and the Bond menu shows its percent, the thread kind is picked at every Bond, Pass It On stays on the standard Attuner for now, enemy medics get Tug and Snap one release later). Then number fitting and Leon's word before any 0.29 deploy.
> **Art:** the artist's Figment art is on `origin/art/figments-2026-11-15` (14 portraits, 24 icons), being integrated on `origin/wip/art-0.29-figments`.
> **Known and open from the 0.28.2 gate:** the browser suites slate, slate-title, slate-music, title, resources, turn-card-side and sigil15-growth pass only when run alone (page-load timeouts at `--jobs 4`); voice has a timing check that depends on the voice model loading slowly; a test worktree needs `npm run assets` before browser suites (creation-points fails 4 layout checks without web images); tending.json's Bond card numbers are copies of the effect values and no validator check ties them yet; on the field after a fight, fight-only actions (techniques, Calls, hide, overwatch) are refused and field actions do not animate; 37 minor actions are refused on the field on doubt until a per-action data flag exists (planned for 0.29).
> **Deploy on this PC** is done by hand with the wrangler OAuth login and `wrangler kv bulk put` (`tools/deploy_site.py` needs a token).
> **Live check:** creation-points: page.goto to the live site timed out (120 s, load event) in both runs, 0 checks; survival: 176 of 184 checks ran and passed, then C2 (the host's mark on the guest's map) timed out waiting for a node (30 s) alone too, and the first run had ERR_CONNECTION_CLOSED on images; room: 27 checks passed alone (first run failed waiting for the camp). Page-load and latency timeouts against the slow live site, not logic failures; the title shows v0.28.2.
>
> **15 Nov 2026 (later): 0.28.1 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.1** (15 Nov 2026) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = 8e51df38; `backup/live-0.28.1` pushed. It carries rules 1.55 (the latest spec revision): the field after a fight (walk the map, pick up, then everyone marks Leave the field), no magazines after a fight, scarce drops, the camp's offers (only what you can use, within the camp budget), the Magazines shelf, and weapon mods fitted only at the Forge for a fee (`CHANGELOG.md` 0.28.1). Title shows v0.28.1.
> **Live check:** creation-points 97 checks, survival 184, room 27 passed. `old-save` and `fight-cards` failed even alone: `page.reload` timed out (30 s) waiting for the load event, because the page's many images were still loading from the live site; the title itself loaded and shows v0.28.1. Not a game logic failure; to be looked at (raise the reload wait for live runs, or check how fast the live site serves its images).
> **Backups kept:** `backup/live-0.28.0` and `backup/live-0.28.1`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.27.3` deleted, now the third latest).
> **Branches:** all merged 0.28.1 branches and their `wip/*` pushes are deleted, and their worktrees removed. Unmerged and kept: `feature/0.29` and `wip/feature-0.29` (the 0.29 work), `art/survival-foes-2026-11-14`, `feature/title-front-v6`, `review/fable-first-read`, `wip/worktree-agent-a4c26f7ceb4409c36`.
> **Left out of 0.28.1, for 0.29** (CHANGELOG): Pull Out shown on every melee pad; Pull Out in a browser room (the stuck mark stayed once); the extra mod slot perks still fit free; the mods that pass the guns' 145% ceiling.
>
> **15 Nov 2026: 0.28.0 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.0** (15 Nov 2026, on Leon's word) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = f1bc51f8. It carries Survival (live since 0.27.x), rules 1.54 (materials and making, the slower climb, the side panels in every mode), the skill road map, the fight cards and Survival's music (`CHANGELOG.md` 0.28.0).
> **Live check** (`python tools/e2e.py old-save creation-points survival room fight-cards --no-build --base <live url> --jobs 2`): GREEN, but `old-save` failed beside the others (page.reload timeout, 30 s; log `.check/e2e/old-save.first.log`) and passed alone (4 checks, 66 s); creation-points 97 checks, survival 148, room 27, fight-cards 22. Title shows v0.28.0.
> **Backups kept:** `backup/live-0.27.3` and `backup/live-0.28.0`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good.
> **Deploy on this PC** goes through wrangler OAuth and `wrangler kv bulk put`, because `tools/deploy_site.py` needs a token.
> **Open / what comes next:**
> (a) Balance 2.0: draft `docs/design/proposals/2026-11-balance-2.0.md`, awaiting Leon's answers. It takes two items the 0.28 review left: special rounds made at 2 gunpowder + 2 casings fit heavy guns; the fit simulator (`packages/engine/test/balance/survival-run.ts`) never makes or sells materials, so the 0.28 XP and stage fit is PROVISIONAL, and level 3 comes before the first Boss on 42% of most-fights routes.
> (b) Art: `art/briefs/GPT-PROMPTS-2026-11-15-everything-missing.md` (66 images); materials have lettered stand-in icons.
> (c) The consolidation pass CLAUDE.md requires before the next system is built on 0.28's additions is still owed.

# Session hand-off (brought up to date 14 Nov 2026, at the close of Survival)

For whoever continues: a person, or a fresh AI session. Read `CLAUDE.md` first, then
`docs/design/handoffs/LOCAL-SESSION-START.md` (the whole picture, for a session on Leon's PC), then `docs/TESTING.md`.
The mission just closed is Survival (`SURVIVAL-PICKUP.md`); the one before it is `CLASSES-3.0-PICKUP.md`; the older
notes are in the hand-offs listed in `README.md`.

## 1. What is live

**0.26.0** (Classes 3.0, `backup/live-0.26.0`): Class Roster Revision 4, rules 1.28 to 1.38. Before it 0.25.0 and
0.24.0 (`backup/live-0.25.0`, `backup/live-0.24.0`); `backup/live-0.22.0` and `backup/live-0.23.0` are kept for good.

## 2. What is on the branch and not live

Branch `claude/charming-gauss-hbq4n0`: **Survival mode, 0.27.0** (rules 1.39 to 1.49): the mode picker, the path map
as lanes with one guarded vault, generated fights and maps from the settings' kits, rewards, the full-screen shop, the
Forge, trainings, shrines, the Crossroads, gives, endless stages with boons and tiles, the tally and Report a run, and
the curve fitted by simulated runs (`survival-steps-9-10.md`). `CHANGELOG.md` has the 0.27.0 entry and the four
`package.json` files say 0.27.0. **Survival is not deployed without Leon's word for it** (the spec's rule: "not
deployed without a new word"). `docs/PLAYTEST-CHECKLIST.md` section S says what to try and lists the calls made for him.

## 3. In flight

Nothing once steps 9 and 10 are merged. Any `worktree-agent-*` branch not in `claude/charming-gauss-hbq4n0` is on the
remote as `wip/<branch>`; judge it by `PICKUP.md` section 3 before merging.

## 4. What comes next, in order

1. **Leon's word on Survival** and his playtest with `docs/PLAYTEST-CHECKLIST.md` section S; he names the calls to
   reverse. On his word: merge to `develop`, then `main`, deploy, `backup/live-0.27.0`.
2. **What the fit could not reach with data dials** (`survival-steps-9-10.md` section 5): the general additions it names,
   for the lead to rule on.
3. **The art Survival waits for** (`art/briefs/ART-REQUESTS.md` S1 to S9: node icons, boon icons, shopkeepers, the
   map backdrops and marker sheet, the place scenes, Boss portraits).
4. **The Forge art run** on Leon's GPU (`art/briefs/FORGE-PHC.md`), when he starts a local session.
5. The open items of each Classes 3.0 step (`LOCAL-SESSION-START.md` section 6 item 4) and of each Survival step
   (`SURVIVAL-PICKUP.md` section 2).

## 5. Things Leon has not ruled on (they take the recommendation until he does)

The calls in `docs/PLAYTEST-CHECKLIST.md` section S (Survival) and section 0 (Classes 3.0, 53), and the 0.23.0 calls in
its section 14; `survival-spec.md` section 12; `CLASSES-3.0-PICKUP.md` section 6; `class-roster-rev4-proposal.md`
section 8; the open questions in `balance-questions.md`; Bug 12 of `BUGLIST-0.22.md`.

## 6. Known problems

1. **Figments sit under their balance line** (the Rigger 123 against 150, the door 119 against 130) with no gap
   between them: it needs a class-only multiplier (rules 1.38 point 5), a new primitive for the lead.
2. **Co-op stall** (`coop-stall.md`): one live two-player fight in five stalled on the guest's turn on 0.21.0; never
   reproduced with diagnostics on. If it happens: Report a problem on the stuck screen.
3. "I'll narrate" (a human Narrator) cannot be selected in a room; its fight-ruling buttons are built but untested end
   to end.
4. Against the live site, suites that start from the title can time out (the title is slow to a test browser); raise
   the wait in `apps/web/e2e/lib.mjs` `click` for live runs.
5. Nine of fx-sweep's nineteen real-speed cases are refused "no place to stand" in the Proving Ground (launchers, the
   flamer, grenades, the thumper): the suite counts them as refused, not failed, so those weapons go unchecked at real
   speed. Worth a look when someone is in the sweep.
6. **Survival's measured gaps** (`survival-steps-9-10.md` section 5): a Sigil caster alone and a party of four casters fall in stage 1 or 2; guns wear out by stage 3 to 4 with no repair in Survival but a grade step. Both need a general addition, not a dial.
