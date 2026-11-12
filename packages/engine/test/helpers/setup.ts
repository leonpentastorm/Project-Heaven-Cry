// Runs before every test file of the engine (vitest.config.ts).
// apply() does not copy the campaign or the archive's lines: the new state shares them with the old one (game.ts,
// workingCopy). With this switch on they are frozen deep whenever they are shared, and so is every zone map built from
// the campaign: engine code (or a test) that writes into one in place throws "Cannot assign to read only property" at
// its own line, instead of silently changing the state before it. To change the campaign in a test, replace it:
//   const camp = structuredClone(g.campaign); camp.zones[0].tags = ['open']; g = { ...g, campaign: camp };
// This file must NOT import the engine: a test that mocks an engine module (vi.mock('../src/rng')) has to be the first
// to load it. Hence a global the engine reads, not a call.
(globalThis as any).__PHC_FREEZE_SHARED = true;
