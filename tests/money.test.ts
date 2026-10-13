import { describe, expect, it } from 'vitest';
import { parseAmount, formatMoney } from '../src/core/money';

describe('exact money', () => {
  it('preserves decimal micro units without floating point rounding', () => { expect(parseAmount('123.456789')).toBe('123456789'); expect(parseAmount('0.000001')).toBe('1'); });
  it.each(['-1', 'NaN', '1e8', '0.0000001', '1.2.3', '', '999999999999999999999999999999999999999'])('rejects malformed or unbounded input %s', value => expect(() => parseAmount(value)).toThrow());
  it('formats large exact dollar values without losing cents', () => expect(formatMoney('900719925474099301')).toBe('$9,007,199,254,740,993.01'));
});
