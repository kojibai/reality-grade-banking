import { expect, test } from 'vitest';
import { permittedNativePath } from '../src/receiz/native-transport';
test('Bank native note methods and recovery queries remain narrowly scoped', () => {
  const funding = '/api/connect/offline-notes/funding?origin=https%3A%2F%2Fbank.receiz.com';
  expect(permittedNativePath(funding, 'POST')).toBe(true);
  expect(permittedNativePath(`${funding}&allocationId=${'a'.repeat(64)}`, 'GET')).toBe(true);
  expect(permittedNativePath(`${funding}&allocationId=${'a'.repeat(64)}`, 'POST')).toBe(false);
  expect(permittedNativePath(funding, 'GET')).toBe(false);
  expect(permittedNativePath(funding.replace('bank.receiz.com', 'other.receiz.com'), 'POST')).toBe(false);
  expect(permittedNativePath(`${funding}&origin=https://bank.receiz.com`, 'POST')).toBe(false);
  expect(permittedNativePath('/api/connect/offline-notes/redemption?origin=http%3A%2F%2Flocalhost%3A4173&noteId=44444444-4444-4444-8444-444444444444', 'GET')).toBe(true);
  expect(permittedNativePath('/api/connect/offline-notes/redemption?origin=https://bank.receiz.com&noteId=anything', 'GET')).toBe(false);
});
