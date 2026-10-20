// Build aliases resolve to the exact v129 native sources. The generated public
// module includes its sources for audit and exposes no signer or funding API.
import { openBankNoteImage } from 'receiz-native-note-image';
import { readBankFundedNoteHead, readBankFundedNoteSource } from 'receiz-native-note-source';
import { openBankNoteDepositReceipt, verifyBankReserveCreditArtifact, exportBankNoteDepositReceipt } from 'receiz-native-note-credit';
import { unpackBankNoteBytes } from 'receiz-native-note-compression';
import { isBankNoteAccountDeposit, readBankNoteAccountDeposit } from 'receiz-native-note-account-deposit';
import {verifyBankConnectedNoteReceipt,isBankConnectedNoteSource,readBankConnectedNoteSource} from 'receiz-native-connected-note';
import {isBankConnectedNoteImage,readBankConnectedNoteImage} from 'receiz-native-connected-note-image';
export {isBankConnectedNoteImage,isBankConnectedNoteSource};
export async function inspectConnectedNote(bytes){
  const proof=await isBankConnectedNoteImage(bytes)?await readBankConnectedNoteImage(bytes):await readBankConnectedNoteSource(bytes);
  return Object.freeze({schema:'bankeiz.connected-note-inspection.v1',rail:proof.rail,noteId:proof.noteId,amountPhiMicro:proof.amountPhiMicro,amountUsdCents:proof.amountUsdCents,
    kind:proof.kind,receiverUserId:proof.receiverUserId,receiverKeyId:proof.receiverKeyId,
    fundingArtifactSha256:proof.fundingArtifactSha256,terminalArtifactSha256:proof.terminalArtifactSha256,
    carriedChainVerified:true,custodyConsumed:false,creditAuthorized:false,hostCreditChecked:false,exclusiveConsumption:'connection-required'});
}
export async function inspectConnectedNoteReceipt(bytes){
  const proof=await verifyBankConnectedNoteReceipt(bytes);
  return Object.freeze({kind:proof.kind,rail:proof.kind==='credit'?proof.rail:proof.cancellation.rail,noteId:proof.noteId,receiverKeyId:proof.kind==='credit'?proof.credit.receiverKeyId:undefined});
}

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

/** Read-only archival inspection. Reopens the credit, complete terminal/funding
 * sources and private opening. It never applies a credit or resumes custody. */
export async function inspectNoteDepositReceipt(bytes) {
  const proof = await openBankNoteDepositReceipt(bytes.slice());
  return Object.freeze({ rail: proof.rail, noteId: proof.credit.noteId, receiverKeyId: proof.credit.receiverKeyId });
}
/** A completed recipient-bound terminal can be inspected without a receiver
 * authenticator or connection. This reads source evidence; it neither queries
 * the host nor represents that account credit has been applied. */
export async function inspectAccountNoteDeposit(bytes) {
  const proof = await readBankNoteAccountDeposit(bytes);
  const {terminalSourceBytes, ...fields} = proof;
  return Object.freeze({...fields, schema:'bankeiz.account-note-receipt-inspection.v1',
    carriedChainVerified:true, currentSpendabilityChecked:false,
    custodyConsumed:false, creditAuthorized:false, hostCreditChecked:false});
}
/** Detect only the transport. A positive result is not verification. */
export {isBankNoteAccountDeposit};
export async function exportVerifiedNoteDepositReceipt(credit, snapshot, terminal) {
  const proof = await verifyBankReserveCreditArtifact(credit.slice(), snapshot.slice(), { terminalSource: await unpackBankNoteBytes(terminal) });
  return exportBankNoteDepositReceipt(proof);
}
