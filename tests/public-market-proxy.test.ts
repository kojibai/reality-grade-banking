import { expect, it } from 'vitest';
import { resolvePublicMarketTarget } from '../server/public-market';
it('allows only fixed public Receiz contracts with bounded query arguments', () => {
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership')?.href).toBe('https://receiz.com/api/market/public-membership');
  expect(resolvePublicMarketTarget('/api/bank/public-market/quotes')?.href).toBe('https://receiz.com/api/market/public-snapshot?detail=full');
  expect(resolvePublicMarketTarget('/api/bank/public-market/membership?url=https://evil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/secret')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=https%3A%2F%2Fevil.test')).toBeNull();
  expect(resolvePublicMarketTarget('/api/bank/public-market/original?path=%2Fapi%2Fconnect%2Fwallet%2Fme')).toBeNull();
  const path = '/api/profile/originals/download?receizId=a1&kind=original';
  expect(resolvePublicMarketTarget(`/api/bank/public-market/original?path=${encodeURIComponent(path)}`)?.pathname).toBe('/api/profile/originals/download');
});
