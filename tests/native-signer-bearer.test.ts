import { expect, it } from 'vitest';
import { prepareSignerBearerRepair } from '../scripts/native-signer-bearer-plan.mjs';
it('preserves existing token entries and normalizes only the same source credential', () => {
  const result = prepareSignerBearerRepair(' "controlled-main-fixture" ', JSON.stringify(['other-fixture', { retained: true }]));
  expect(result.entries).toEqual(['other-fixture', { retained: true }, 'controlled-main-fixture']);
  expect(prepareSignerBearerRepair('controlled-main-fixture', result.value).entries).toEqual(result.entries);
});
it('retains malformed previous configuration inside the same encrypted value', () => {
  expect(prepareSignerBearerRepair('controlled-main-fixture', 'not-json-fixture').entries).toEqual([{ previousUnusableConfiguration: 'not-json-fixture' }, 'controlled-main-fixture']);
  expect(() => prepareSignerBearerRepair('bad bearer fixture', '[]')).toThrow('SOURCE_BEARER_INVALID');
});
