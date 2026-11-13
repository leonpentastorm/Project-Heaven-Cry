# A fixture spec (test/engine-hooks.test.ts): one invented name in its Built from table

**Built from:**

| Rule | Primitive |
| --- | --- |
| The gain | item op `resource` on trigger `turn_end`, `if` `self_has`, limit `per_turn` (`effects/triggers.ts` `runTriggered`) |
| The price | `price` / `whyNot` / `pay` (`effects/cost.ts`) |
| The echo | the `frobnicate_hook` hook, heard by `onHook` |
| The wake | a **new** `wake_word` predicate |

**Needs a new primitive:** `wake_word` (a predicate: the unit was woken this round).
