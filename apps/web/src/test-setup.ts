// Runs before every test file of the client (vitest.config.ts).
// The engine's apply() does not copy the campaign, the campaign a Proving Ground parked, or the archive's lines: every
// state shares them (packages/engine/src/game.ts, workingCopy), and viewFor hands the host's own campaign object to the
// screens. So the client must only ever READ g.campaign, a zone map (mapFor, zoneMap) and an archive line. With this
// switch on the engine freezes them deep, exactly as in its own suite (packages/engine/test/helpers/setup.ts): a
// screen, a Narrator tool or a store function that writes into one in place throws "Cannot assign to read only
// property" at its own line, instead of silently changing every state the store keeps (the reroll copies included).
// To change a campaign in a test, replace it: g = { ...g, campaign: { ...g.campaign, zones } }.
// This file must NOT import the engine (a test that mocks an engine module has to be the first to load it).
(globalThis as any).__PHC_FREEZE_SHARED = true;
