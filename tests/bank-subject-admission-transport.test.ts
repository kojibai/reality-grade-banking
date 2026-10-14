import { expect, it } from 'vitest';
import { nativeRequestPath } from '../server/native-account';
it('allows the canonical subject admission and exact state read without arbitrary subject routes', () => {
  expect(nativeRequestPath('/api/bank/native/api/sdk/v1/subjects/admit', 'POST')).toBe('/api/sdk/v1/subjects/admit');
  const state = `/api/sdk/v1/subjects/${encodeURIComponent(`receiz:subject:${'a'.repeat(64)}`)}/state`;
  expect(nativeRequestPath(`/api/bank/native${state}`, 'GET')).toBe(state);
  for (const path of [`${state}?owner=foreign`, '/api/sdk/v1/subjects/anything/state', '/api/sdk/v1/subjects/admit?applicationId=foreign', '/api/sdk/v1/subjects/receiz%3Asubject%3A../../state']) expect(nativeRequestPath(`/api/bank/native${path}`, 'GET')).toBeNull();
  expect(nativeRequestPath(`/api/bank/native${state}`, 'POST')).toBeNull();
});
