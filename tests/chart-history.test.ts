import { expect, it } from 'vitest';
import { chartChange, chartPeriodPoints, sampleChartIndices } from '../src/core/chart-history';

it('selects periods by time, retaining the preceding boundary point and the real beginning for All', () => {
  const points = [0, 1, 8, 9, 10].map(day => ({ at: new Date(Date.UTC(2026, 0, 1 + day)).toISOString(), value: day }));
  expect(chartPeriodPoints(points, 'ALL')).toEqual(points);
  expect(chartPeriodPoints(points, '1W').map(point => point.value)).toEqual([1, 8, 9, 10]);
  expect(chartPeriodPoints(points, '1D').map(point => point.value)).toEqual([9, 10]);
});
it('calculates exact signed change without inventing a percentage from a zero baseline', () => {
  expect(chartChange('10000', '12345')).toEqual({ deltaCents: '2345', percent: 23.45, trend: 'up' });
  expect(chartChange('10000', '9876')).toEqual({ deltaCents: '-124', percent: -1.24, trend: 'down' });
  expect(chartChange('0', '200')).toEqual({ deltaCents: '200', percent: null, trend: 'up' });
});
it('bounds chart geometry while retaining the beginning, latest and sharp extrema', () => {
  const values = Array.from({ length: 10000 }, (_, i) => i === 2001 ? 100000 : i === 8001 ? -100000 : i);
  const indices = sampleChartIndices(values, 320);
  expect(indices.length).toBeLessThanOrEqual(320);
  expect(indices[0]).toBe(0); expect(indices.at(-1)).toBe(9999);
  expect(indices).toContain(2001); expect(indices).toContain(8001);
});
