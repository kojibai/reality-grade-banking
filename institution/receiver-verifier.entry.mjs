// Build aliases resolve to the exact v129 native sources. The generated public
// module includes its sources for audit and exposes no signer or funding API.
import { openBankNoteImage } from 'receiz-native-note-image';
import { readBankFundedNoteHead, readBankFundedNoteSource } from 'receiz-native-note-source';

/** Verifies complete carried sources under the pinned canonical roots.
 * It does not prove live spendability, consume custody or authorize a credit. */
export async function openReserveNoteImage(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 8 * 1024 * 1024) throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
  return openBankNoteImage(bytes.slice());
}
/** Reads only a handle actually issued by this module's verifier runtime. */
export function inspectReserveNote(handle) {
  const head = readBankFundedNoteHead(handle);
  return Object.freeze({
    schema: 'receiz.bank.receiver-note-inspection.v1', rail: handle.rail,
    noteId: handle.noteId, noteArtifactSha256: handle.noteArtifactSha256,
    fundingArtifactSha256: handle.fundingArtifactSha256, allocationId: handle.allocationId,
    amountUsdCents: handle.amountUsdCents, amountPhiMicro: handle.amountPhiMicro,
    receivingCustodyCommitmentDigest: head.packet.currentCustody.receivingCustodyCommitmentDigest,
    carriedChainVerified: true, currentSpendabilityChecked: false,
    custodyConsumed: false, creditAuthorized: false,
  });
}
/** Exact complete source transport for a separately verified receiver. Exported
 * bytes/objects must be reverified; this snapshot never becomes authority. */
export function exportReserveNoteSource(handle) { return readBankFundedNoteSource(handle); }
