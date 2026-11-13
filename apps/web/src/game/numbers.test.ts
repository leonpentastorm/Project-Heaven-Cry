import { describe, expect, it } from 'vitest';
import { fmtNum, fmtFloat } from './numbers';

describe('rules 1.36: the one formatter for five-digit numbers', () => {
  it('thousands separators, never abbreviated in a readout', () => {
    expect([fmtNum(40), fmtNum(1234), fmtNum(13915), fmtNum(-2500), fmtNum(12.6)]).toEqual(['40', '1,234', '13,915', '-2,500', '13']);
    expect(fmtNum(undefined)).toBe(''); expect(fmtNum('x')).toBe('x');
  });
  it('a floating number shortens from 10,000', () => {
    expect([fmtFloat(9999), fmtFloat(13915), fmtFloat(10000), fmtFloat(125400)]).toEqual(['9,999', '13.9k', '10k', '125k']);
  });
});
