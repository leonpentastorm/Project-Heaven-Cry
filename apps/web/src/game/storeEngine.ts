// The part of the store that needs the engine and the game's data (the client load lane, 0.33). The store itself
// (game/store.ts) is in the boot chunk, so the title shows without the engine; this module, the engine and every data
// file load on demand (store.ts loadEngine), and everything that opens or runs a room awaits it first: hosting, joining,
// Continue, the Proving Ground, a save loaded through migrateLoaded. Nothing here holds state: it is the store's view of
// the engine, one import.
export { RuleError, apply, newGame, viewFor, votesOf, rerollFrom, migrateLoaded, fightRulingOf, gearPreview, previewAttack, withGame, makeView } from '@engine';
export { FIGHT_TIMEOUT_MS } from '../narrator/fight';
export { newRoomPlay, testRoom } from './modes';
export { scriptedProvider, callEstimate } from '../narrator/anthropic';
export { makeProvider, polishWith } from '../narrator/providers';
export { DEFAULT_START, shownStart } from './starts';
// The problem report's engine-side parts (game/report.tsx reads them only for a room, which has the engine in).
export { runReport } from './runReport';
