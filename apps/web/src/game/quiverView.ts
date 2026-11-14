// Rules 1.53: how a quiver and its enchantment look on the screens (the ARMS tab, the weapon strip, the backpack). The
// numbers are the engine's (quiverCards); this is words and styles. Colour = meaning: an enchantment's mark is its
// tone's ink (heartView TONE_INK, the Outburst tones' own colours) and always its name in words, with a glyph.
import { TONE_INK } from './heartView';
import type { QuiverCard } from '@engine';

/** The glyph beside an enchantment's name, one per tone (text-presentation characters, never emoji). */
export const TONE_GLYPH: Record<string, string> = { fire: '▲', storm: 'ϟ', frost: '✻', stone: '■', gale: '≈', acid: '●' };
/** An enchanted quiver's mark: "▲ EMBER ENCHANTMENT" in the tone's ink; null for a plain quiver. */
export function enchantMark(e: QuiverCard['ench'] | null | undefined): { text: string; style: string; ink: string } | null {
  if (!e) return null;
  const ink = TONE_INK[e.tone] || '#E7EBF3';
  return { text: (TONE_GLYPH[e.tone] || '◆') + ' ' + e.name.toUpperCase(), ink, style: 'font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: ' + ink };
}
/** The worn quiver on the weapon strip: "QUIVER 12/40 · ▲ EMBER" (arrows left of what it holds), or null for no bow. */
export function quiverStrip(cards: QuiverCard[], arrowsLeft?: number | null): { text: string; ench: ReturnType<typeof enchantMark>; ready: string } | null {
  const w = cards[0]; if (!w) return null;
  const left = arrowsLeft ?? w.total, r = cards[1];
  return { text: 'QUIVER ' + left + '/' + w.holds, ench: enchantMark(w.ench), ready: r ? 'READY ' + r.total + '/' + r.holds + (r.ench ? ' · ' + r.ench.name : '') : '' };
}
