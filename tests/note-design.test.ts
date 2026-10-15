import { describe, expect, it } from 'vitest';
import { noteDenomination, notePreviewCents, reserveNoteDesign } from '../src/receiz/note-design';

describe('Reserve Note denominations', () => {
  it.each([
    ['1', '$0.01', 'ONE CENT'],
    ['100', '$1', 'ONE DOLLAR'],
    ['10000', '$100', 'ONE HUNDRED DOLLARS'],
    ['12345', '$123.45', 'ONE HUNDRED TWENTY-THREE DOLLARS AND FORTY-FIVE CENTS'],
    ['100001', '$1,000.01', 'ONE THOUSAND DOLLARS AND ONE CENT'],
    ['100000000', '$1,000,000', 'ONE MILLION DOLLARS'],
  ])('preserves the exact original denomination of %s cents', (cents, display, words) => {
    expect(noteDenomination(cents)).toMatchObject({ display, words });
  });

  it.each(['0', '-1', '1.5', 'NaN', '100000001', '01'])('rejects an unsupported issued denomination: %s', cents => {
    expect(() => reserveNoteDesign(cents, 'note-123')).toThrow();
  });

  it('accepts the full supported preview range without rounding fractional cents', () => {
    expect(notePreviewCents(' 1000000.00 ')).toBe('100000000');
    expect(notePreviewCents('0.01')).toBe('1');
    for (const input of ['0', '1.001', '1000000.01', '1e3', '-2', '01']) expect(notePreviewCents(input)).toBeNull();
  });

  it('uses the same exact denomination in the center and all four corners', () => {
    const design = reserveNoteDesign('12345', '12345678-90ab-4cde-8000-000000000000');
    expect(design.denomination.display).toBe('$123.45');
    expect(design.denominations).toHaveLength(5);
    expect(design.denominations.map(value => value.value)).toEqual(['$123.45', '123.45', '123.45', '123.45', '123.45']);
    expect(design.serial).toBe('RN 12345678 90AB4CDE');
    expect(design.title).toBe('RESERVE NOTE');
    expect(design.subtitle).toBe('PROOF-BACKED VALUE');
  });

  it('keeps Settlement artwork visually identical while identifying its own rail', () => {
    const reserve = reserveNoteDesign('12345', '12345678-90ab-4cde-8000-000000000000');
    const settlement = reserveNoteDesign('12345', '12345678-90ab-4cde-8000-000000000000', 'settlement');
    expect(settlement.title).toBe('SETTLEMENT NOTE'); expect(settlement.subtitle).toBe('PROOF-NATIVE VALUE');
    expect(settlement.serial).toBe('SN 12345678 90AB4CDE');
    expect(settlement.denominations).toEqual(reserve.denominations);
    expect(settlement.texts.some(text => text.value === 'REDEEMABLE INTO SETTLEMENT')).toBe(true);
    expect(settlement.texts.some(text => text.value === 'REDEEMABLE INTO RESERVE')).toBe(false);
  });

  it('fits every denomination inside its assigned print area, including cents and the maximum', () => {
    for (const cents of ['1', '10', '100', '10000', '12345', '99999999', '100000000']) {
      const design = reserveNoteDesign(cents, '12345678-90ab-4cde-8000-000000000000');
      for (const amount of design.denominations) {
        expect(amount.images.every(image => image.x >= amount.x - 0.001 && image.x + image.width <= amount.x + amount.width + 0.001)).toBe(true);
      }
      for (const text of design.texts) {
        expect(text.width).toBeLessThanOrEqual(text.maxWidth);
        if (!text.corner) { expect(text.x).toBeGreaterThanOrEqual(75); expect(text.x + text.width).toBeLessThanOrEqual(450); }
      }
    }
  });
});
