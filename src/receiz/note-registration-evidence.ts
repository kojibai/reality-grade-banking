export interface NoteRegistrationEvidence { format: string; counter: string; userVerified: boolean; backupEligible: boolean; backedUp: boolean; }
const formats = new Set(['none', 'apple', 'packed', 'tpm', 'fido-u2f', 'android-key', 'android-safetynet', 'apple-appattest']);
const failures = new WeakMap<object, NoteRegistrationEvidence>();
export function noteRegistrationEvidence(cause: unknown): NoteRegistrationEvidence | null { return cause instanceof Error ? failures.get(cause) ?? null : null; }
export function rememberNoteRegistrationEvidence(cause: unknown, response: unknown) {
  const evidence = readNoteRegistrationEvidence(response);
  if (cause instanceof Error && evidence) failures.set(cause, evidence);
}
/** Display diagnostics only. This neither verifies CBOR/attestation nor changes
 * the original response, error, certificate checks or custody qualification. */
export function readNoteRegistrationEvidence(response: unknown): NoteRegistrationEvidence | null {
  try {
    const encoded = (response as {response?:{attestationObject?:unknown}} | null)?.response?.attestationObject;
    if (typeof encoded !== 'string' || encoded.length > 128 * 1024 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), value => value.charCodeAt(0));
    let offset = 0, budget = 4096;
    const take = (length: number) => {
      if (offset + length > bytes.length) throw Error('diagnostic-incomplete');
      const result = bytes.subarray(offset, offset + length); offset += length; return result;
    };
    const item = (depth = 0): unknown => {
      if (depth > 12 || --budget < 0) throw Error('diagnostic-limit');
      const initial = take(1)[0], major = initial >> 5, additional = initial & 31;
      if (major === 7) {
        if (additional === 20 || additional === 21) return additional === 21;
        if (additional === 22) return null;
        throw Error('diagnostic-simple');
      }
      let length = additional;
      if (additional >= 24) {
        const width = additional === 24 ? 1 : additional === 25 ? 2 : additional === 26 ? 4 : 0;
        if (!width) throw Error('diagnostic-length');
        length = take(width).reduce((value, byte) => value * 256 + byte, 0);
      }
      if (major === 0) return length;
      if (major === 1) return -1 - length;
      if (major === 2) return take(length);
      if (major === 3) return new TextDecoder('utf-8', { fatal: true }).decode(take(length));
      if (length > budget) throw Error('diagnostic-limit');
      if (major === 4) return Array.from({ length }, () => item(depth + 1));
      if (major === 5) {
        const map = new Map<unknown, unknown>();
        for (let index = 0; index < length; index++) { const key = item(depth + 1); if (map.has(key)) throw Error('diagnostic-duplicate'); map.set(key, item(depth + 1)); }
        return map;
      }
      throw Error('diagnostic-type');
    };
    const decoded = item();
    if (offset !== bytes.length || !(decoded instanceof Map)) return null;
    const format = decoded.get('fmt'), data = decoded.get('authData');
    if (typeof format !== 'string' || !(data instanceof Uint8Array) || data.length < 37) return null;
    return Object.freeze({ format: formats.has(format) ? format : 'unrecognized', counter: String(new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(33)), userVerified: Boolean(data[32] & 4), backupEligible: Boolean(data[32] & 8), backedUp: Boolean(data[32] & 16) });
  } catch { return null; }
}
