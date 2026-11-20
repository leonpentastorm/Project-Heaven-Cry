// Rules 1.86 item 7406 (engine lane; the gaps lane's group F item 10): where each chip sits on a token, in one table.
// Four chips used to place themselves by their own absolute styles, kept apart only by comments: Pressure's pips (top
// centre), the Momentum counter (left edge, just below centre), the Sigil charge / Flux chip (right edge, just below
// centre) and the Detect view's wisps (above the top-left corner). Each now asks its slot here; a new chip takes a free
// slot, and two chips can't be given the same one without this table saying so. The health word chip (bottom edge)
// and the kind badge (bottom right) are drawn by the token template itself.
export type TokenSlot = 'top' | 'left' | 'right' | 'above';
const SLOTS: Record<TokenSlot, string> = {
  top: 'position: absolute; left: 50%; top: 0; transform: translateX(-50%)',
  left: 'position: absolute; left: -6px; top: calc(50% + 4px); transform: translateY(-50%)',
  right: 'position: absolute; right: -6px; top: calc(50% + 4px); transform: translateY(-50%)',
  above: 'position: absolute; left: 2px; top: -13px',
};
/** The placing half of a chip's style (position, offsets, transform) for its slot. */
export const slotStyle = (s: TokenSlot): string => SLOTS[s];
/** Which chip holds which slot (the one list; a test reads it for a clash). */
export const CHIP_SLOTS: Record<string, TokenSlot> = { pressure: 'top', momentum: 'left', sigil: 'right', wisps: 'above' };
