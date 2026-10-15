import { expect, it } from 'vitest';
import { verifyModuleDigest, importDigestVerifiedModule, requireRefusal, readOriginalNoteFile } from '../src/conformance/boundaries';

it('executes only the immutable bytes whose module digest was verified', async () => {
  const source = new TextEncoder().encode('export const verified = true;');
  const original = new Uint8Array(source);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', source))).map(value => value.toString(16).padStart(2, '0')).join('');
  let imports = 0;
  const importer = async (url: string) => { imports++; return new Uint8Array(await (await fetch(url)).arrayBuffer()); };
  const loading = importDigestVerifiedModule(source, digest, importer);
  source.fill(0);
  expect(await loading).toEqual(original);
  await expect(importDigestVerifiedModule(source, digest, importer)).rejects.toThrow('VERIFIER_BUILD_MISMATCH');
  expect(imports).toBe(1);
});

it('checks the exact native module bytes and refuses changed verifier code', async () => {
  const bytes = new TextEncoder().encode('pinned native verifier');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('');
  await expect(verifyModuleDigest(bytes, digest)).resolves.toBe(digest);
  await expect(verifyModuleDigest(new TextEncoder().encode('altered verifier'), digest)).rejects.toThrow('VERIFIER_BUILD_MISMATCH');
});

it('counts only the expected canonical refusal, never a broken function or unrelated exception', async () => {
  await expect(requireRefusal(() => { throw Error('BANK_NOTE_SOURCE_CUSTODY_REQUIRED'); }, 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED')).resolves.toBeUndefined();
  await expect(requireRefusal(() => { throw TypeError('undefined function'); }, 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED')).rejects.toThrow('undefined function');
  await expect(requireRefusal(() => undefined, 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED')).rejects.toThrow('UNVERIFIED_INPUT_ACCEPTED');
});

it('rejects oversized note files before reading their bytes', async () => {
  let read = false;
  const file = { size: 8 * 1024 * 1024 + 1, arrayBuffer: async () => { read = true; return new ArrayBuffer(0); } } as File;
  await expect(readOriginalNoteFile(file)).rejects.toThrow('BANK_NOTE_TRANSPORT_CAPACITY');
  expect(read).toBe(false);
});
