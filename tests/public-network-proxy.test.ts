import { expect, it } from 'vitest';
import { parsePublicNetworkRequest } from '../server/public-network';
it('permits only the shared public source families and bounded cursors', () => {
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=actions&cursor=42')).toEqual({ source: 'actions', cursor: '42' });
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=wallet&url=https://evil.test')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=private')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=graph&cursor=42')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=wallet&cursor=' + 'a'.repeat(2049))).toBeNull();
});
