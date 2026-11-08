# Blessing 2.0, implementer 1: engine hand-off (DRAFT: the contract)

Branch: `feature/blessing-engine`. This first push is **the contract** for implementer 2. The rules behind the actions
come in the next pushes; this file grows into the full hand-off at the end.

## Types (`packages/engine/src/character.ts`, re-exported by `faith.ts`)

```ts
type Belief = { kind: 'faithful'; patron: string } | { kind: 'atheist' };
interface Vow { id: string; allyId?: string; state: 'sworn' | 'kept' | 'broken' }
// Sheet (creation):   belief?: Belief                (validateSheet checks the patron exists)
// Character:          belief?, patron (kept in step: the Faithful's patron, null for an Atheist), devotion (0-10),
//                     miracleSession, faithPieces?: Record<patronId, number>, hymns?: string[] ("<patronId>.<hymnId>"),
//                     vow?: Vow | null, ritesKept?: Record<"<patronId>.<riteId>", sessionN>, faithRev?: 16
// Unit (combat.ts):   vow?: Vow | null, faith?: Record<string, any> (per-fight faith state), prayedRound (Hymn cooldown)
```

`beliefOf(c)` reads old saves too: a pact makes them Faithful to that patron, no pact makes them Atheist.

## Actions (reducer; `faith.ts` `FaithAction`, dispatched by `game.ts`)

| Action | Who | Notes |
|---|---|---|
| `faith/pray { charId?, unitId?, kind: 'whisper' \| 'hymn' \| 'miracle', id, targetId?, targetId2?, tile?, text? }` | the character's player | In a fight (unitId; AP) and in the story (charId). `id`: a Whisper id, a Hymn key (`"<patron>.<hymn>"`, or a bare id of your own patron's Hymn), or the Miracle id. `targetId2`: the second unit (Switcheroo, Red Thread, Together). |
| `faith/vow { unitId, id, allyId? }` | the player | At the start of a fight (round 1, before you act). |
| `faith/rite { charId, id }` | the player | An engine rite button, in the story. |
| `faith/pact { charId, patron }` | Narrator (host) | Make a pact, or convert. |
| `faith/piece { charId, patron, from? }` | Narrator (host) | Grant a knowledge piece. |
| `faith/devotion { charId, delta, reason }` | Narrator (host) | ±2 at most. |
| `faith/rite_kept { charId, patron?, rite }` | Narrator (host) | A Narrator rite kept. |
| `faith/apostasy { charId }` | Narrator (host) | Leave the pact. |

Creation: put `belief` on the sheet you send with `char/add`.

## Preview and view (`faith.ts`)

- `previewPrayer(g, who, kind, id, { targetId?, targetId2?, tile? })` (who: a unit id in a fight, else a character id) →
  `{ ok, why?, ap, roll?: { tn, mod }, gate, overreach?: { tn }, mode: 'standing' | 'overreach' | 'dice', effectText, name, patron, targets, target }`.
  `target` is one of: self_or_ally, self, ally, enemy, tile, none, two_units, two_allies, downed_ally, dead_ally.
- `faithView(g, charId)` → belief, patron (name, costume, archetype, accent, rule, likes, taboos as tag objects), faith,
  devotion, gates, witnessed, canBeWitnessed, whispers[], hymns[] (each with its preview and source: patron, kept or
  learned), miracle, pieces, vow, vows[], rites[] (kept this session, available, why), rule, cooldowns, likedThisFight.

## FX events (`emitFx` kinds; `FAITH_FX`)

| Kind | Payload |
|---|---|
| `prayer` | `{ unit, kind, id, patron, at, target, ok }` |
| `prayer_fail` | `{ unit, kind, id, patron, at, why: 'overreach' \| 'dice' }` |
| `witnessed` | `{ unit, patron, at }` |
| `intervention` | `{ patron, trigger, at, target, unit }` |
| `devotion` | `{ char, delta, reason, tag?, now }` |
| `vow` | `{ unit, char, id, state, allyId? }` |
| `patron_line` | `{ patron, event, text, char }` |
| `miracle` | `{ patron, id, at, area, unit }` |

Out of a fight the same events go on `g.story.fx`.

## Data (`data/patrons.json` v2)

Top level: `devotion` (gates, gains, losses), `prayer` (AP, cooldowns, overreach, Atheist TNs, Witnessed), `tags` (14),
`whispers` (6), `vows` (6), `line_banks` (9). Each patron: `costume`, `archetype`, `accent`, `likes`, `taboos`, `rule`,
`rites` (2: one `engine: true` with a `check`), `intervention`, `hymns` (3, tiers 1–3), `miracle`, `lines` (9 banks × 3).
All eight patrons are filled in. The old `blessings` list lives on as an alias of `hymns` (tactics.ts `PATRONS`).
