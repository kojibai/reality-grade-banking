export async function verifyModuleDigest(bytes: Uint8Array, expected: string) {
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))).map(value => value.toString(16).padStart(2, '0')).join('');
  if (!/^[a-f0-9]{64}$/.test(expected) || digest !== expected) throw Error('VERIFIER_BUILD_MISMATCH');
  return digest;
}
export async function importDigestVerifiedModule<T>(bytes: Uint8Array, expected: string, importer: (url: string) => Promise<T>) {
  // Snapshot before awaiting. Import the checked bytes, never a second resource read.
  const source = new Uint8Array(bytes);
  await verifyModuleDigest(source, expected);
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try { return await importer(url); }
  finally { URL.revokeObjectURL(url); }
}
export async function requireRefusal(run: () => unknown | Promise<unknown>, expected: string) {
  try { await run(); } catch (error) {
    if (error instanceof Error && error.message === expected) return;
    throw error;
  }
  throw Error('UNVERIFIED_INPUT_ACCEPTED');
}
export async function readOriginalNoteFile(file: File) {
  if (file.size > 8 * 1024 * 1024) throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
  return bytes;
}
