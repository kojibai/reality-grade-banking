import { expect, it } from 'vitest';
import { validateAssetDefinition } from '../src/receiz/asset-definition';
it('defines an asset with exact units and never infers funding from its name or identity', () => {
  expect(validateAssetDefinition({ name: ' Studio asset ', symbol: 'art', units: '1000.5', description: 'My work', linkedProofDigest: null })).toEqual({ name: 'Studio asset', symbol: 'ART', units: '1000.5', description: 'My work', linkedProofDigest: null });
  expect(() => validateAssetDefinition({ name: 'Asset', symbol: 'ABC', units: '0', description: '', linkedProofDigest: null })).toThrow();
  expect(() => validateAssetDefinition({ name: 'Asset', symbol: 'ABC', units: '10', description: '', linkedProofDigest: 'pretend' })).toThrow();
});
