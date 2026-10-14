import { expect, it } from 'vitest';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { nativeRequestPath } from '../server/native-account';

const paths = ['/api/sdk/v1/sources/publish', '/api/sdk/v1/runtime/authority-sessions/open', '/api/sdk/v1/runtime/authority-sessions/refresh', '/api/sdk/v1/runtime/authority-sessions/close'];
it.each(paths)('permits only the exact registered-app POST for %s', path => {
  const prefix = `/api/bank/native${path}`;
  expect(nativeRequestPath(`${prefix}?applicationId=${BANK_APPLICATION_ID}`, 'POST')).toBe(`${path}?applicationId=${BANK_APPLICATION_ID}`);
  for (const query of ['', '?applicationId=foreign', `?applicationId=${BANK_APPLICATION_ID}&applicationId=${BANK_APPLICATION_ID}`, `?applicationId=${BANK_APPLICATION_ID}&other=1`]) {
    expect(nativeRequestPath(`${prefix}${query}`, 'POST')).toBeNull();
  }
  expect(nativeRequestPath(`${prefix}?applicationId=${BANK_APPLICATION_ID}`, 'GET')).toBeNull();
});
