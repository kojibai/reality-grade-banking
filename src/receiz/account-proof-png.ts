import { ACCOUNT_PROOF_MAX_BYTES } from './account-proof-policy';
const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), keyword = new TextEncoder().encode('bankeiz.account-proof');
export const ACCOUNT_PROOF_IMAGE_MAX_BYTES = ACCOUNT_PROOF_MAX_BYTES + 4 * 1024 * 1024;
const table = Uint32Array.from({ length: 256 }, (_, index) => { let c = index; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc(bytes: Uint8Array): number { let c = 0xffffffff; for (const v of bytes) c = table[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunks(bytes: Uint8Array) {
  if (bytes.length > ACCOUNT_PROOF_IMAGE_MAX_BYTES || !signature.every((v, i) => bytes[i] === v)) throw Error('ACCOUNT_PROOF_IMAGE_INVALID');
  const result: { type: string; start: number; end: number; data: Uint8Array }[] = []; let offset = 8, ended = false;
  while (offset < bytes.length) {
    if (ended || offset + 12 > bytes.length) throw Error('ACCOUNT_PROOF_IMAGE_INVALID');
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset), length = view.getUint32(0), end = offset + 12 + length;
    if (end > bytes.length || crc(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(length + 8)) throw Error('ACCOUNT_PROOF_IMAGE_INVALID');
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8)), data = bytes.subarray(offset + 8, end - 4);
    if (!result.length && (type !== 'IHDR' || data.length !== 13)) throw Error('ACCOUNT_PROOF_IMAGE_INVALID');
    if (type === 'IEND') { if (length !== 0) throw Error('ACCOUNT_PROOF_IMAGE_INVALID'); ended = true; }
    result.push({ type, start: offset, end, data }); offset = end;
  }
  if (!ended) throw Error('ACCOUNT_PROOF_IMAGE_INVALID'); return result;
}
function isProof(data: Uint8Array) { return data.length > keyword.length && keyword.every((v, i) => data[i] === v) && data[keyword.length] === 0; }
/** PNG metadata is transport only. Its contents must still pass the complete
 * v129 public account-source verifier; printed artwork never creates proof. */
export function embedAccountProofPng(png: Uint8Array, proof: Uint8Array): Uint8Array {
  if (!proof.length || proof.length > ACCOUNT_PROOF_MAX_BYTES) throw Error('ACCOUNT_PROOF_CAPACITY');
  const parts = chunks(png); if (parts.some(v => v.type === 'iTXt' && isProof(v.data))) throw Error('ACCOUNT_PROOF_IMAGE_DUPLICATE');
  const data = new Uint8Array(keyword.length + 5 + proof.length); data.set(keyword); data.set(proof, keyword.length + 5);
  const chunk = new Uint8Array(data.length + 12), view = new DataView(chunk.buffer); view.setUint32(0, data.length); chunk.set(new TextEncoder().encode('iTXt'), 4); chunk.set(data, 8); view.setUint32(chunk.length - 4, crc(chunk.subarray(4, -4)));
  const insertion = parts.at(-1)!.start, out = new Uint8Array(png.length + chunk.length);
  if (out.length > ACCOUNT_PROOF_IMAGE_MAX_BYTES) throw Error('ACCOUNT_PROOF_CAPACITY');
  out.set(png.subarray(0, insertion)); out.set(chunk, insertion); out.set(png.subarray(insertion), insertion + chunk.length); return out;
}
export function extractAccountProofPng(png: Uint8Array): Uint8Array {
  const found = chunks(png).filter(v => v.type === 'iTXt' && isProof(v.data));
  if (found.length !== 1) throw Error('ACCOUNT_PROOF_IMAGE_SOURCE_REQUIRED');
  const data = found[0].data, start = keyword.length;
  if (data.length <= start + 5 || data.subarray(start, start + 5).some(Boolean) || data.length - start - 5 > ACCOUNT_PROOF_MAX_BYTES) throw Error('ACCOUNT_PROOF_IMAGE_INVALID');
  return new Uint8Array(data.subarray(start + 5));
}
export async function readAccountProofFile(file: File): Promise<File> {
  if (!file.size || file.size > ACCOUNT_PROOF_IMAGE_MAX_BYTES) throw Error('ACCOUNT_PROOF_CAPACITY');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signature.every((v, i) => bytes[i] === v)) return new File([new Uint8Array(extractAccountProofPng(bytes))], 'embedded-account-proof.json', { type: 'application/json' });
  if (bytes.length > ACCOUNT_PROOF_MAX_BYTES) throw Error('ACCOUNT_PROOF_CAPACITY');
  return new File([bytes], file.name, { type: 'application/json' });
}
