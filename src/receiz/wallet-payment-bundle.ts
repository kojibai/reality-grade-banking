import { opticalNotePayloadLimit } from './optical-note-frames';

export type WalletPaymentPart = Readonly<{
  allocationId: string;
  sourceArtifactSha256: string;
  amountUsdCents: string;
}>;

export type WalletPaymentOpening = WalletPaymentPart & Readonly<{ conversationId: string }>;

const marker = 0x42575032; // Bankeiz Wallet payment bundle v2
const splitMarker = 0x42575033; // Same protected proofs with a signed regular-balance remainder
const hashBytes = 32;
const headerBytes = 4 + hashBytes + 2;
const digestPattern = /^[a-f0-9]{64}$/u;
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const invalid = () => Error('BANK_WALLET_BUNDLE_INVALID');

export async function walletPaymentHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

export async function walletPaymentConversation(applicationId: string, nonce: string, parts: readonly WalletPaymentPart[]) {
  const digest = await walletPaymentHash(['bankeiz.wallet.bundle.v2', applicationId, nonce,
    parts.map(({allocationId,sourceArtifactSha256,amountUsdCents}) => [allocationId,sourceArtifactSha256,amountUsdCents])]);
  return [digest.slice(0,8),digest.slice(8,12),'8'+digest.slice(13,16),'a'+digest.slice(17,20),digest.slice(20,32)].join('-');
}

export function walletPaymentBundleFits(proofSizes:readonly number[], remainderSize=0){
  return Number.isSafeInteger(remainderSize)&&remainderSize>=0&&remainderSize<=16384
    &&proofSizes.length>=(remainderSize>0?1:2)&&proofSizes.length<=0xffff&&proofSizes.every(size=>Number.isSafeInteger(size)&&size>0)
    &&proofSizes.reduce((sum,size)=>sum+4+size,headerBytes+remainderSize)<=opticalNotePayloadLimit;
}

export function encodeWalletPaymentBundle(nonce: string, proofs: readonly Uint8Array[], remainder?: Uint8Array) {
  if (!digestPattern.test(nonce) || !walletPaymentBundleFits(proofs.map(proof=>proof.byteLength),remainder?.byteLength)) throw invalid();
  const size = proofs.reduce((sum, proof) => sum + 4 + proof.byteLength, headerBytes+(remainder?.length??0));
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
  view.setUint32(0, remainder?.length?splitMarker:marker);
  bytes.set(Uint8Array.from(nonce.match(/../gu)!, pair => Number.parseInt(pair,16)), 4);
  view.setUint16(headerBytes-2, proofs.length);
  let offset = headerBytes;
  for (const proof of proofs) {
    view.setUint32(offset, proof.byteLength);
    offset += 4;
    bytes.set(proof, offset);
    offset += proof.byteLength;
  }
  if(remainder)bytes.set(remainder,offset);
  return bytes;
}

export function readWalletPaymentBundle(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 4) return null;
  const kind=view.getUint32(0);
  if(kind!==marker&&kind!==splitMarker)return null;
  if (bytes.byteLength < headerBytes || bytes.byteLength > opticalNotePayloadLimit) throw invalid();
  const count = view.getUint16(headerBytes-2), proofs: Uint8Array[] = [];
  if (count < (kind===splitMarker?1:2) || headerBytes + 5*count > bytes.byteLength) throw invalid();
  let offset = headerBytes;
  for (let index=0; index<count; index++) {
    if (offset+4 >= bytes.byteLength) throw invalid();
    const length = view.getUint32(offset);
    offset += 4;
    if (length < 1 || offset+length > bytes.byteLength) throw invalid();
    proofs.push(bytes.subarray(offset, offset+length));
    offset += length;
  }
  const remainder=bytes.subarray(offset);
  if(kind===marker?remainder.length!==0:!remainder.length||remainder.length>16384)throw invalid();
  return {nonce:hex(bytes.subarray(4,4+hashBytes)),proofs,...(remainder.length?{remainder}:{})};
}
