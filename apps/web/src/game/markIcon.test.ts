// The one fallback for an icon slot with no art (0.32 fix pass B12).
import { describe, expect, it } from 'vitest';
import { initialsOf, markIcon, iconOr } from './markIcon';

describe('markIcon', () => {
  it('initials skip the small words; one word gives one letter', () => {
    expect(initialsOf('Still Standing')).toBe('SS'); expect(initialsOf('Close Guard')).toBe('CG');
    expect(initialsOf('Used to the Pain')).toBe('UP'); expect(initialsOf('Numb')).toBe('N'); expect(initialsOf('')).toBe('?');
  });
  it('the mark is an SVG in the ink with the initials; art wins when there is some', () => {
    const m = decodeURIComponent(markIcon('Still Standing', '#F65157'));
    expect(m).toMatch(/^data:image\/svg\+xml/); expect(m).toContain('>SS</text>'); expect(m).toContain('#F65157');
    expect(iconOr('/assets/x.webp', 'Still Standing')).toBe('/assets/x.webp'); expect(iconOr('', 'Still Standing')).toMatch(/^data:image\/svg\+xml/);
  });
});
