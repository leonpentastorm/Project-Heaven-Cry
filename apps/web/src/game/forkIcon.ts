// A fork option's icon (one copy; game/forkView.ts and the skill "?" page read it): its Wick art (art/catalog.json
// fork_icons, built as wick-fork-<id>), else the one fallback mark for an icon slot with no art yet (game/markIcon.ts:
// the option's initials in its door's attribute ink). Never the door's skill portrait (0.33, Leon on live 0.32.0: "For
// visualization the forks reuse the skill face icon instead of a set of wick"); the options still to draw are listed
// in art/briefs/ART-REQUESTS.md.
import ASSETS from './assets.json';
import { SKILL } from '@engine';
import { ATTR_INK } from './classView';
import { markIcon } from './markIcon';

const A = ASSETS as Record<string, string>;
/** id: the option's id (data/forks.json); skill: its door's skill (the mark's ink); name: the option's name (the mark's
 *  initials; else the id's last word). */
export const forkIconOf = (id: string, skill: string, name?: string): string =>
  A['wick-fork-' + id.replace(/\./g, '-')] || markIcon(name || String(id).split('.').pop()!.replace(/_/g, ' '), ATTR_INK[(SKILL as any)[skill]?.attribute] || '#E7EBF3');
