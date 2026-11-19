// A fork option's icon (one copy; game/forkView.ts and the skill "?" page read it): its placeholder or art
// (art/catalog.json fork_icons, built as wick-fork-<id>), else its door's skill portrait (until drawn, the option shows
// its door's skill icon).
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
export const forkIconOf = (id: string, skill: string): string => A['wick-fork-' + id.replace(/\./g, '-')] || A['skill-' + skill] || '';
