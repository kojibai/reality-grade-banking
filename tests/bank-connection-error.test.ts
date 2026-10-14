import { expect, it } from 'vitest';
import { BankConnectionError } from '../src/receiz/bank-connection-error';

it('retains a fixed native diagnostic without carrying private response data', () => {
  const error = Object.assign(new Error('private response text'), { status: 400, payload: { code: 'APPLICATION_MISMATCH', accessToken: 'private-token', artifact: 'private-identity' } });
  const diagnostic = new BankConnectionError('native-services', error);
  expect(diagnostic.stage).toBe('native-services');
  expect(diagnostic.status).toBe(400); expect(diagnostic.code).toBe('APPLICATION_MISMATCH');
  expect(JSON.stringify(diagnostic)).not.toContain('private');
  expect(diagnostic.message).not.toContain('private');
});
it('does not display arbitrary server codes, messages or error payloads', () => {
  const diagnostic = new BankConnectionError('account-access', Object.assign(new Error('secret identity bytes'), { status: '503', payload: { code: 'PRIVATE_IDENTITY_BYTES' } }));
  expect(diagnostic.code).toBeNull(); expect(diagnostic.status).toBeNull();
  expect(diagnostic.message).not.toContain('secret');
});
it('distinguishes canonical transport refusal from an unobserved network failure', () => {
  expect(new BankConnectionError('native-services', new TypeError('V124_RUNTIME_TRANSPORT_UNAUTHENTICATED')).code).toBe('V124_RUNTIME_TRANSPORT_UNAUTHENTICATED');
  expect(new BankConnectionError('native-services', new Error('V124_RUNTIME_TRANSPORT_UNAUTHENTICATED')).code).toBeNull();
});
