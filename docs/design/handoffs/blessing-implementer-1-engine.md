# Blessing 2.0, implementer 1: spec, data and engine

For a Claude Code session on its own account. Written 8 Nov 2026.

Paste this into the session, or point it at this file on GitHub:
https://github.com/leonpentastorm/Project-Heaven-Cry/blob/develop/docs/design/handoffs/blessing-implementer-1-engine.md

---

You are implementing **Blessing 2.0 (rules revision 1.6)** in Project Heaven Cry, repo `leonpentastorm/Project-Heaven-Cry`.
Another Claude session (implementer 2) builds the web side in parallel, on top of your branch.

## Read first

1. `CLAUDE.md`.
2. **`docs/design/blessing-2.0-spec.md`** (the design; every rule you build is there).
3. The spec `docs/rules/PHC-Core-Rules-v1.0.md`: "Patrons and prayer", decision 97, and section 14.
4. `data/CONVENTIONS.md` and `data/patrons.json`.
5. `docs/design/perk-runtime.md`: the effects runtime (`register()`, hooks, `uses()`, `emit`, `applyDamage`, `note`/`pendRuling`).
6. `docs/design/balance-targets.md`.

## Branch and rules

- Work on **`feature/blessing-engine`**, made from the latest `origin/develop`. Push often to that branch only.
- Never push to `develop` or `main`, and never deploy. Leon and his Claude do the final check and merge.
- Order of work:
  1. spec first;
  2. then data (`python3 tools/validate.py data` must print 0 errors);
  3. then the engine;
  4. then tests.
- Never invent a number silently. Provisional numbers get `provisional: true` and a section 14 item.
- In-universe text only (the Unspoken Name).
- The Narrator never sets numbers the engine owns.
- Commit message trailer:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## Your first push (within your first hour): the contract

Implementer 2 starts from your branch, so push this first, even before the rules work:

1. **Engine types and stubs** in `packages/engine` (exported from the package index):
   - `Belief = { kind: 'faithful'; patron: string } | { kind: 'atheist' }` on `Character` as `c.belief`.
   - `c.devotion` (exists).
   - `c.faithPieces: Record<patronId, number>`.
   - `c.hymns: string[]` of `"<patronId>.<hymnId>"`, as learned by an Atheist or kept from another patron.
   - `c.vow?: { id: string; allyId?: string; state: 'sworn' | 'kept' | 'broken' }`, held on the combat unit as well.
   - **Action types (reducer)**, each refusing with a clear reason string. Stubs that refuse "not built yet" are fine for the first push:
     - `faith/pray { charId | unitId, kind: 'whisper' | 'hymn' | 'miracle', id, targetId?, tile? }`: in combat (AP) and in the story;
     - `faith/vow { unitId, id, allyId? }`: at the start of a fight;
     - `faith/rite { charId, id }`: an engine rite button in the story;
     - `creation` belief: wherever creation sets character fields (find the creation action); add `belief`;
     - Narrator-only actions:
       - `faith/pact { charId, patron }`: make a pact or convert;
       - `faith/piece { charId, patron, from }`: grant a knowledge piece;
       - `faith/devotion { charId, delta, reason }`: ±2 at most;
       - `faith/rite_kept { charId, patron, rite }`;
       - `faith/apostasy { charId }`.
   - **A preview function**, `previewPrayer(g, who, kind, id, args)`, returning `{ ok, why?, ap, roll?: { tn, mod }, gate, overreach?: { tn }, effectText, targets }`. The UI uses it to show odds and disable buttons with reasons.
   - **A view helper**, `faithView(g, charId)`, returning everything the Faith panel needs:
     - belief and patron;
     - Devotion and the gates reached;
     - Witnessed;
     - Hymns available and why;
     - Whispers;
     - the Miracle state;
     - pieces;
     - the vow;
     - rites (kept this session);
     - the patron's likes and taboos;
     - the Open or Jealous rule;
     - cooldowns.
   - **FX event names**, to be emitted with `emitFx` like existing moves. Write the list in your handoff, with payloads:
     - `prayer` {unit, kind, id, patron, at, target, ok}
     - `prayer_fail`
     - `witnessed`
     - `intervention` {patron, trigger, at, target}
     - `devotion` {char, delta, reason, tag?}
     - `vow` {state}
     - `patron_line` {patron, event, text}
     - `miracle` {patron, id, at, area}
2. **The data shape** for `data/patrons.json` v2 (see below), with Nerukhan filled in completely as the worked example.

Then build the rest.

## What to build

1. **Spec.**
   - Rewrite "Patrons and prayer" as rules 1.6 from `blessing-2.0-spec.md`.
   - Add a decision entry in `docs/design/decisions.md`.
   - Add provisional items to section 14.
   - Retire the patron mood TN.
   - Update CLAUDE.md's Blessings line.
2. **Data: `data/patrons.json` v2.** For the 8 patrons in spec section 8 (3 exist; keep their ids), each patron gets:
   - `costume`, `archetype`, `accent` (FX colour hex);
   - `likes` and `taboos` (tag ids from spec section 6);
   - `rule: open | jealous`;
   - `rites` (2, each `engine: true|false`; engine rites carry what the button checks);
   - `intervention` (trigger plus effect);
   - `hymns` (3, tiers 1–3, effects as ops);
   - `miracle`;
   - `lines` (9 banks × 3 lines, in the costume's voice; keep them short, in-universe, funny the way Celestials are).

   Also in the data:
   - Whispers in a shared `whispers` list.
   - Vows in a shared `vows` list.
   - Tags in a `tags` list.
   - Everything uses existing ops where possible (`effect_ops.json`); bespoke ops are listed there.
   - The validator checks the new shape (ids, tags exist, 3 Hymns per patron, rule present, line banks complete).
3. **Engine** (put the faith logic in a new `packages/engine/src/faith.ts`; keep `tactics.ts` `pray`/`blessing` as thin wrappers, or migrate their callers):
   - Belief.
   - Devotion as standing, with gates.
   - Overreach (TN 12 + 2 × shortfall; a miss −1).
   - Whisper, Hymn and Miracle (AP, cooldowns, mana −5, Silenced).
   - Atheist dice (TN 12, then 14 / 16 / 18).
   - Pieces unlocking Hymns in order.
   - Conversion (pieces to Devotion; Open or Jealous).
   - Apostasy (provisional).
   - Witnessed (+2 on liked tags, double taboo loss).
   - Tags: a hook that tags actions per spec section 6, with Devotion +1 per liked tag up to +2 a fight and −1 / −2 per taboo.
   - Vows, tracked and settled.
   - Interventions: once a fight, while Witnessed.
   - Rites.
   - Deterministic voice-line picks (seeded `g.rng`; never `Math.random`).
   - Story-mode prayers: the engine applies what has numbers; the rest goes to `pendRuling`/note with the text.
   - Old-save migration (spec section 1).
   - Keep everything in spec section 10 working, and audit every reader of `pray`, `blessing`, `devotion`, `patron` and `prayedRound`.
4. **Enemy faithful (small):** one enemy type in `data/enemies.json` that prays (a Whisper and one Hymn), so fights show it.
   Optional if time is short; say so in the handoff.
5. **The Proving Ground** (`sandbox` actions in `game.ts`): engine actions to set belief, patron, Devotion, pieces and the
   vow, so implementer 2 can add tools and the e2e can drive them.

## Tests

- Through `apply()`, per rule: the happy path plus the main refusal.
- Determinism: the same seed gives the same lines and rolls.
- Migration.
- Every patron's 3 Hymns, Miracle and intervention.
- The compatibility list.
- Commands:
  - `npm test -w @phc/engine`, and `PHC_COVERAGE_STRICT=1` (0 gaps);
  - `npx tsc --noEmit` in `packages/engine` and `apps/web`;
  - the validator.
- Don't break web tests. If a web test breaks only because of your renamed fields, fix the web test minimally and say so.

## Handoff (make it good)

When done, write **`docs/design/handoffs/blessing-engine-HANDOFF.md`**:

- what was built, file by file;
- the final contract: types, actions, preview and view fields, FX events with payloads;
- every decision you made where the spec was silent, each also a section 14 item;
- the numbers you chose;
- test results (exact counts);
- what's left or stubbed;
- what implementer 2 needs to know.

Push it. Then tell Leon: "Engine done, handoff at <link>". **Don't merge.**
