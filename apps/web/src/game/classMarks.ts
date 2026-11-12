// The Class Roster Revision 3 moves that leave something standing on the grid (engine classes/rev3.ts, illusion.ts),
// drawn per tile as the Sigil overlay's marks are (sigilView.ts SgTile): the Trickster's False Image (a translucent copy
// of its owner's token in Sigil cyan, shimmering), what Read showed of an enemy's next turn (an arrow on the enemy toward
// its target and a ring on that target, until the enemy's turn ends), the Infiltrator's rigged tile (its own side only)
// and the barricades and turrets it sabotaged. Fog: another side's image shows only on a tile this side sees; another
// side's rigged tile never shows. Nothing here reads or changes the rules.
import { refOf } from '@engine';
import { SIGIL_INK, SIGIL_GLOW } from './glyphs';
import { arrowOf, type SgTile } from './sigilView';

/** Perception's ink (the Infiltrator) and white for what Read shows (always paired with a word). */
const RIG_INK = '#40BAA0', READ_INK = '#FFFFFF', HP = '#F65157', WARN = '#E3BF51';
const badge = (bg: string, fg = '#0A0D13') => 'position: absolute; z-index: 5; padding: 0 3px; border-radius: 2px; font-size: 9px; line-height: 13px; font-weight: 700; letter-spacing: 0.02em; pointer-events: none; white-space: nowrap; background: ' + bg + '; color: ' + fg;
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
const xy = (k: string) => k.split(',').map(Number);
/** The arrow from one tile toward another (8 ways). */
export const arrowToward = (from: string, to: string) => { const [a, b] = xy(from), [c, d] = xy(to); return arrowOf([sign(c - a), sign(d - b)]) || '•'; };
const INTENT_WORD: Record<string, string> = { attack: 'ATTACK', move: 'MOVE', spell: 'SPELL', outburst: 'OUTBURST', reload: 'RELOAD', order: 'ORDER', recover: 'RECOVER', scuff: 'SCUFF', wait: 'WAIT', lost: 'LOSES TURN', none: 'NOTHING' };

export interface ClassMarkOpts {
  /** The tiles this side sees now (null: everything). */
  seen?: Set<string> | null;
  /** A unit's token picture (URL), or '' for its letters. */
  imgOf?: (u: any) => string;
}
/** The standing class marks by tile, for one side's screen. */
export function classMarks(cb: any, side: 'pc' | 'foe' = 'pc', o: ClassMarkOpts = {}): Record<string, SgTile> {
  const out: Record<string, SgTile> = {}; if (!cb) return out;
  const T = (k: string) => (out[k] ||= { layer: '', marks: [], note: '' });
  const note = (k: string, t: string) => { const x = T(k); x.note += (x.note ? ' · ' : '') + t; };
  const seen = (k: string) => !o.seen || o.seen.has(k);
  const units: any[] = cb.units || [];
  // ---- False Image: a decoy of its owner ----
  for (const img of cb.images || []) {
    const own = units.find((u) => u.id === img.owner) || img.look; if (!own) continue; // look: the face an unseen owner's decoy wears (the engine's fog)
    if (img.side !== side && !seen(img.pos)) continue; // another side's decoy, out of sight
    const pic = o.imgOf ? o.imgOf(own) : '', round = own.side === 'pc' ? '50%' : '4px';
    const mine = img.side === side, fooled = (img.fooled || []).length, fades = (img.round || 0) + 2;
    const title = 'False Image of ' + own.name + (mine ? ' (yours): ' + (fooled ? fooled + (fooled === 1 ? ' enemy takes' : ' enemies take') + ' it for ' + own.name : 'no enemy was fooled') : ' (a decoy)') + '. It fades at ' + own.name + '\'s turn in round ' + fades + ', or when struck.';
    T(img.pos).marks.push({ key: 'img' + img.id, text: pic ? '' : String(own.short || own.name || '?').slice(0, 3), title,
      style: 'position: absolute; inset: 7%; z-index: 2; display: grid; place-items: center; box-sizing: border-box; pointer-events: none; font-size: 11px; font-weight: 700; color: ' + SIGIL_INK + '; border-radius: ' + round + '; border: 2px dashed ' + SIGIL_INK
        + '; box-shadow: 0 0 10px ' + SIGIL_GLOW + ', inset 0 0 8px rgba(79, 200, 223, 0.45); opacity: 0.55; animation: phcDecoy 2.4s ease-in-out infinite'
        + (pic ? '; background: url("' + pic + '") center / cover no-repeat; filter: saturate(0.4) brightness(1.1) drop-shadow(0 0 4px ' + SIGIL_GLOW + ')' : '; background: rgba(79, 200, 223, 0.12)') });
    T(img.pos).marks.push({ key: 'imgt' + img.id, text: 'IMAGE', title, style: badge(SIGIL_GLOW) + '; left: 50%; bottom: -1px; transform: translateX(-50%)' });
    note(img.pos, 'False Image of ' + own.name + (mine && fooled ? ' (' + fooled + ' fooled)' : ''));
  }
  // ---- Read: what an enemy means to do on its next turn (until that turn ends) ----
  for (const u of units) {
    const it = u.readIntent; if (!it || u.dead || u.side === side) continue;
    const by = units.find((x) => x.id === it.by); if (by && by.side !== side) continue;
    const img = it.image ? (cb.images || []).find((i: any) => i.id === it.image) : null;
    const tgt = it.targetId ? units.find((x) => x.id === it.targetId) : null;
    const to: string | null = img ? img.pos : tgt && !tgt.dead ? tgt.pos : it.to || null;
    const word = INTENT_WORD[it.kind] || String(it.kind || '').toUpperCase(), line = 'Read: ' + u.name + ' means to ' + it.text + '.';
    T(u.pos).marks.push({ key: 'intent' + u.id, text: (to && to !== u.pos ? arrowToward(u.pos, to) + ' ' : '') + word, title: line, style: badge(READ_INK) + '; left: 50%; top: -1px; transform: translateX(-50%); box-shadow: 0 0 0 1px #0A0D13' });
    note(u.pos, line);
    if (to && to !== u.pos) {
      const hostile = it.kind === 'attack' || it.kind === 'spell' || it.kind === 'outburst';
      const ink = hostile ? HP : READ_INK, t = T(to);
      t.marks.push({ key: 'intentto' + u.id, text: hostile ? '◎' : '▸', title: line, style: badge(ink) + '; right: 1px; top: 1px' });
      t.layer = (t.layer ? t.layer + '; ' : '') + 'outline: 2px dashed ' + ink + '; outline-offset: -3px';
      note(to, (hostile ? u.name + ' means to strike here' : u.name + ' means to go here') + (img ? ' (at the False Image)' : '') + ' · ' + refOf(to));
    }
  }
  // ---- Sabotage: a rigged tile (its own side only), barricades and turrets put out of action ----
  for (const ob of cb.objects || []) {
    if (ob.rig && !ob.resolved) {
      if (ob.side && ob.side !== side) continue;
      const own = units.find((u) => u.id === ob.owner), t = T(ob.pos), text = 'Rigged by ' + (own ? own.name : 'your side') + ': the next enemy to step here takes ' + (ob.damage || 30) + ' and may be Pinned (Body save). The enemy can\'t see it.';
      t.layer = (t.layer ? t.layer + '; ' : '') + 'box-shadow: inset 0 0 0 2px ' + RIG_INK + '; background: repeating-linear-gradient(-45deg, rgba(64, 186, 160, 0.18) 0 4px, transparent 4px 8px)';
      t.marks.push({ key: 'rig' + ob.id, text: '✱ RIG', title: text, style: badge(RIG_INK) + '; left: 1px; bottom: 1px' });
      note(ob.pos, text);
      continue;
    }
    const until = ob.sabotaged || (ob.disabled && ob.disabledUntil) || 0;
    if (until && until > (cb.round || 0)) {
      const left = until - (cb.round || 0), t = T(ob.pos);
      const text = 'Sabotaged ' + String(ob.name || ob.kind).toLowerCase() + ': ' + (ob.kind === 'barricade' ? 'it doesn\'t block the way' : 'it takes no action') + ' until round ' + until + ' (' + left + (left === 1 ? ' round' : ' rounds') + ' left).';
      t.layer = (t.layer ? t.layer + '; ' : '') + 'box-shadow: inset 0 0 0 2px ' + WARN + '; background: repeating-linear-gradient(45deg, rgba(227, 191, 81, 0.16) 0 3px, transparent 3px 7px)';
      t.marks.push({ key: 'sab' + ob.id, text: '⚠ ' + left, title: text, style: badge(WARN) + '; right: 1px; bottom: 1px' });
      note(ob.pos, text);
    }
  }
  return out;
}
