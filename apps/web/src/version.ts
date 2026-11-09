// The game's version (CHANGELOG.md; the rule is in CLAUDE.md, "Versioning"). Read from the root package.json when
// the client is built, so it changes in one place. Only the version field is bundled.
import { version } from '../../../package.json';

export const GAME_VERSION: string = version;
