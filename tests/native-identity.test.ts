import { expect, it } from 'vitest';
import { createNativeIdentity, importNativeIdentity, openCanonicalIdentity } from '../src/receiz/native-identity';
it('requires actual user consent before enrollment, creation or import', async () => {
  await expect(createNativeIdentity(false)).rejects.toThrow('Approve');
  await expect(importNativeIdentity({} as File, 'secret-local-test', false)).rejects.toThrow('Approve');
});
it('rejects arbitrary JSON as identity through the actual canonical SDK verifier', async () => {
  await expect(openCanonicalIdentity(new TextEncoder().encode('{"owner":"pretend","balance":99999}'), 'local-test-only', 'fake.json')).rejects.toThrow('verified identity proof');
});
