# Hand-off: picking up Project Heaven Cry at v0.0.1

For a new collaborator, human or AI (for example Cline on Leon's PC). Read [`CLAUDE.md`](../CLAUDE.md) first (the brief, the lore canon and the working agreements), then this, then [`ROADMAP.md`](ROADMAP.md) (what's next, in order). Written 9 Nov 2026 at **v0.0.1** ([`CHANGELOG.md`](../CHANGELOG.md)).

## What's live

- **https://project-heaven-cry.leonpentastorm.workers.dev**: the web game, deployed from `develop`. Title → create a character → open a room (solo or up to 4) → story with the AI Narrator (your own key, any provider) or a human Narrator → grid fights. The **Proving Ground** (title menu) is the practice mode: fights without a Narrator, co-op or PvP.
- The version shows bottom right on the title screen and in every **Report a problem** bundle.

## The systems, and where each one lives

Rules numbers are in the spec, [`docs/rules/PHC-Core-Rules-v1.0.md`](rules/PHC-Core-Rules-v1.0.md); open and provisional numbers are its **section 14** (items 1–670). Why things are the way they are: [`docs/design/decisions.md`](design/decisions.md) (numbered; 94–105 are the latest systems). Data conventions: [`data/CONVENTIONS.md`](../data/CONVENTIONS.md).

**Engine** (`packages/engine/src/`). Deterministic and seeded TypeScript; every change to a game is an action through one reducer, and the event log is the save. It owns every number: checks, AP, damage, resources, conditions, the grid. Tests are built from the spec's tables (`npm test -w @phc/engine`). The browser host and the room server run the same engine.

**Characters, creation and progression.** The 3 → 9 → 27 tree, budgets, archetypes (`data/archetypes.json`), traits and perks (`data/traits.json`, `data/perks.json`; ops in `data/effect_ops.json`, runtime notes in [`design/perk-runtime.md`](design/perk-runtime.md)), XP and levels. Every perk, trait and class move runs in play (decision 94). Screens: `apps/web/src/screens/` (creation, sheet, level up).

**Classes: Class Roster Revision 3** (decision 100). Nine base classes, one per attribute, earned at level 3 and fixed; ranks II/III at attribute 5/8. The 21 advanced classes are **shelved** (data keeps `kind`/`pair`/`batch`; shelved moves in [`design/move-pool.md`](design/move-pool.md); the return plan in [`design/class-roster-rev3-proposal.md`](design/class-roster-rev3-proposal.md) section 7). Data: `data/classes.json`.

**Combat.** The tactical grid (1.5 m tiles, 6 AP, reactions, initiative, movement by Agility), enemies and their AI (`data/enemies.json`), the turn card, tabs, map zoom, the adjustable layout. The action panel is greyed until it is really your turn. A magic focus counts only in a hand (decision 103; [`design/handoffs/focus-in-hand-HANDOFF.md`](design/handoffs/focus-in-hand-HANDOFF.md)).

**Sigil magic 1.4** (Mind; decision 98; spec "Mana"; [`design/sigil-1.4-proposal.md`](design/sigil-1.4-proposal.md)). 40 glyph words drawn on your own tile, walked into a straight Line of 2–4, Evoked; Flux and venting. Data: `data/sigils.json`. The Grand Sigilist's Grand forms are built but shelved with the class (decision 101).

**Outburst 2.0, Soul magic 1.5** (decision 99; [`design/outburst-2.0-proposal.md`](design/outburst-2.0-proposal.md)). Begin, Pump, Release; Strain; Crystallise.

**Blessing 2.0, faith 1.6** (decision 102; [`design/blessing-2.0-spec.md`](design/blessing-2.0-spec.md); spec items 592–629). Faithful or Atheist, eight patrons (`data/patrons.json` v2), Devotion, Whisper/Hymn/Miracle, vows, rites, Witnessed, interventions. Engine `faith.ts`; hand-offs: [engine](design/handoffs/blessing-engine-HANDOFF.md), [web](design/handoffs/blessing-ui-HANDOFF.md).

**Faith 2.1, rules 1.6.1** (decision 107; [`design/faith-2.1-spec.md`](design/faith-2.1-spec.md); items 701–723). Devotion XP toward the same 0–10 standing, tag caps kept on the character, the day counter (`g.day`, a long rest is a day, the Narrator's `days`), apostasy's 90-day cooldown, the direct switch with leave rolls, grudges and farewells. **Miracle 2.1, rules 1.6.2** (items 724–737): the Miracle at Devotion 10, −5 levels, eight stronger Miracles. Hand-off: [`design/handoffs/faith-2.1-HANDOFF.md`](design/handoffs/faith-2.1-HANDOFF.md).

**World Play 1.0, rules 1.7** (decision 105; [`design/world-play-spec.md`](design/world-play-spec.md); items 636–670; `data/world_play.json`). The area map tells the story: faces, carrying, caches, hazards, triggers, Talk, the HERE card, attempts with odds. Hand-offs: [part A (engine, Narrator tools)](design/handoffs/world-play-A-HANDOFF.md), [part B (web)](design/handoffs/world-play-B-HANDOFF.md).

**Story mode, rooms and missions.** Speaking order (each player once a round, then the Narrator), human Narrator mode, OOC lines, the mission board and end states (decision 95), the Proving Ground with friends (decision 96). Campaigns are data: [`design/campaign-format.md`](design/campaign-format.md), `data/campaigns/m813.json` (the M813 one-shot).

**The AI Narrator** (`apps/web/src/narrator/`). Bring your own key; it stays in the host's browser and goes only to the provider. `anthropic.ts` (Anthropic and Anthropic-format sites) and `providers.ts` (one OpenAI-compatible adapter: OpenRouter, OpenAI, DeepSeek, Gemini, local, third-party; decision 104). The Narrator never sets engine-owned numbers: it requests checks through tools and the engine resolves them. Prose rules (CRAFT, PACING, THE MAP IS THE TRUTH) and the live playtest harness: [`design/handoffs/narrator-craft-HANDOFF.md`](design/handoffs/narrator-craft-HANDOFF.md).

**The Narrator's voice.** Kokoro TTS runs in the browser (WebGPU/WASM via `onnxruntime-web`, served from this site); its model comes through the Worker at `/hf/` (one Hugging Face repo, edge-cached); the fallback is the browser's voices with Edge's Christopher first. [`design/handoffs/narrator-voice-HANDOFF.md`](design/handoffs/narrator-voice-HANDOFF.md).

**Server** (`apps/server/`). One Cloudflare Worker: serves the site from KV, one Durable Object per room (host-authoritative relay and saves), and the `/hf/` proxy. Dev config `wrangler.dev.jsonc` serves `apps/web/dist` directly.

**Client** (`apps/web/`). React + Vite rendering the prototype templates (`src/templates`) with per-screen logic (`src/screens`), the store and room link (`src/game`), the title (`src/title`), the version (`src/version.ts`). Screen data comes from `design/canvas-build/build.py --web` (writes `src/game/protodata.json`).

**Art** (`art/`; layout and rules in [`art/README.md`](../art/README.md); style guide `art/style-guide/PHC-Style-Guide.md`). Production files sit flat by use (portraits, icons, emblems, illustrations, maps, sprites, mascot, ui) and are indexed by `art/catalog.json`; everything superseded is in `art/_archive/`. `npm run assets` builds the game's webp files from the catalog. How code picks art: [`ART-INTEGRATION.md`](ART-INTEGRATION.md).

## Run, test, deploy

```bash
npm install
npm run assets                              # web images from art/ (apps/web/public/assets, ignored by git)
python3 design/canvas-build/build.py --web  # screen data (only when data/ or the templates changed)
npm run build                               # the client into apps/web/dist
npm run dev -w @phc/server                  # http://127.0.0.1:8787 (wrangler dev on apps/web/dist)
```

Checks before pushing (all must pass):

- `npm test -w @phc/engine`, `npm test -w @phc/web`; `npx tsc --noEmit` in `apps/web` and `packages/engine` (or `npm run typecheck`).
- `python3 tools/validate.py data` → `0 errors` after any data change.
- After any art change: `python3 tools/rehash_art_checksums.py`, then `python3 tools/validate_art.py` (about 3 minutes; pixel checks every icon) and `python3 tools/validate_patrons.py`.
- e2e (Playwright, scripted Narrator, no key needed; list in [`apps/web/e2e/README.md`](../apps/web/e2e/README.md)): `node apps/web/e2e/two-players.mjs`, `faith.mjs`, `world-play.mjs`, `classes.mjs` are the usual smoke set. Shots go to `apps/web/e2e/shots/` (ignored).

e2e quirks:

- **The dev server dies when Vite empties `dist`** (every `npm run build`). If the site 404s after a build, `pkill -f "wrangler dev"` and start it again; a small "devup" script that does this (curl the port; if not 200, kill and restart `wrangler dev -c wrangler.dev.jsonc --port 8787` in `apps/server`, then poll until 200) saves time.
- **The art preloader:** the title opens only once the small images are in (16 at a time), so the first load of a fresh server is slow; `hostAs()` in `lib.mjs` waits up to 90 s for NEW GAME. Run `npm run assets` before building or the title waits on missing images.
- **Timing flakes:** `slate.mjs` (the turn card closes itself after 2 s; the test hovers it) and `sandbox-mp.mjs` (two browsers, wave timing) sometimes fail on a slow machine; rerun once before investigating.
- Combat tests wait for the other turns to finish playing before acting (`pickAction()` opens the right tab first).

Deploy (Leon or whoever he asks; never from a feature branch): `npm run build`, then `python3 tools/deploy_site.py` (changed site files to KV) and `npx wrangler deploy` in `apps/server`. It needs a **Cloudflare API token with Workers and Workers KV edit rights** in `CLOUDFLARE_API_TOKEN` (unless a proxy injects it); static-asset uploads are avoided on purpose (see the script's docstring).

## Branches and versions

- Work happens on a branch from `develop` (`feature/…`, `fix/…`, `chore/…`); it merges into `develop`; `main` only receives merges from `develop`. Nothing is deployed from a branch.
- **Versioning** (`CHANGELOG.md`, `CLAUDE.md` "Versioning"): 0.MINOR.PATCH until 1.0. Every merged branch bumps the middle number; whoever merges bumps `"version"` in all four `package.json` files and writes the `CHANGELOG.md` entry. A branchless hotfix on `develop` bumping the last number is a reading Leon still has to confirm.
- Spec first, then data, then the validator; never invent a number silently (flag it `provisional: true` and list it in section 14). Keep game text in-universe (the Unspoken Name).
- Never commit an API key: `git diff --cached | grep sk-ant` before each commit.

## Open decisions waiting on Leon

1. ~~**Faith rulings, decided but not built**~~ **Built** as Faith 2.1, rules 1.6.1 (branch `feature/faith-2.1`; decision 107; spec items 701–723; [`design/faith-2.1-spec.md`](design/faith-2.1-spec.md); hand-off [`design/handoffs/faith-2.1-HANDOFF.md`](design/handoffs/faith-2.1-HANDOFF.md)): the 90-day cooldown after apostasy on a new day counter, the direct switch with each patron's leave roll or grudge, Devotion XP with tag caps kept on the character (they replace the "+1 a fight" ruling), `--faith-light`, and the art direction text. ~~**Still open:** the Miracle's reset to 0 (item 707).~~ **Decided** (Leon, 9 Nov 2026) and built as **Miracle 2.1**, rules 1.6.2 (items 724–737): the Miracle needs Devotion 10, lowers Devotion by 5 levels, and all eight Miracles are stronger; the first comes after session 20, then about every 19 sessions. Also for Leon: a grudge lasts the rest of its session plus its sessions (item 713), and the host's Next session (item 721) is the product's first session boundary. The numbers in items 701–723 are provisional.
2. **Carry weight** (spec item 638): overweight uses the old rules (−1 Movement per started 5 kg over), so a 70 kg body takes most characters to the 0.5 Movement floor and a 40 kg robot overloads a starting character. Leon: change the weights or add a carry-specific penalty.
3. **The Narrator's stall cost:** PACING says a stall costs something "small" without defining it (a robot died during a wait). Leon to define it.
4. **Narrator length:** turns still run about 167 words even for quick exchanges. Leon to say what length he wants (a hard limit or a style rule).
5. **Damage balance targets** ([`design/balance-targets.md`](design/balance-targets.md)): weapons already exceed the caps (item 591); the pass is pending (ROADMAP item 4).
6. **Advanced classes:** the order and contents of batch 1 (the 9 squared classes) and the Devoted/Twinbound collision in batch 3 ([`ROADMAP.md`](ROADMAP.md) "Classes").
7. **Versioning:** confirm the hotfix reading above.
8. Older: the tech plan's section 10 ([`design/tech-plan.md`](design/tech-plan.md)) and the provisional items in spec section 14.

## Known issues and gaps

Collected in [`ROADMAP.md`](ROADMAP.md) ("World Play gaps", "The Narrator", "Faith", "Small engine oddities"). The ones a playtester will hit first:

- Paths (clicks and enemies) don't avoid hazards; allies and companions don't fight beside the party; Talk and hazard panels exist only on the area map; the Ask buttons stay after asking; beasts have no avatar art.
- A few recaps survive as trailing clauses; "named but not placed" detection is a heuristic; providers other than Anthropic are untested with real keys.
- Voice: confirm Kokoro reads "Kokoro · WebGPU" on Leon's GPU; hosting the model in R2 would remove the Hugging Face dependency.
- M813 was written before World Play, so its areas don't yet use objectives with a `where`, hazards, talk or caches.
- `art/_archive/` (310 MiB) is kept until Leon has looked through it.

## Next steps

In [`ROADMAP.md`](ROADMAP.md) order: (1) a real M813 playtest of the new Narrator and World Play on a fresh key; (2) the faith rulings above (built as Faith 2.1, with Miracle 2.1: the Miracle's price is decided); (3) rewrite M813 for World Play (every area: an objective with a `where`, a hazard with approaches and real costs, someone to talk to, a cache, a trigger where an ambush belongs); (4) the damage balance pass; (5) advanced classes batch 1.

Detailed hand-offs from earlier sessions: [`docs/design/handoffs/README.md`](design/handoffs/README.md).
