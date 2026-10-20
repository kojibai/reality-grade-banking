import {verifyBankNoteAccountReceivingRequest} from './accountReceiving';
import {openBankNoteImage,assertBankNoteTransportCapacity} from './noteImage';
import {readBankFundedNoteSource} from './fundedNote';
import {prepareBankNoteRedemption,readBankNoteRedemption,type BankNoteRedemptionIntent} from './redemption';
import {exportBankNoteAccountDepositImage} from './accountDeposit';
import type {KairosNotePwaCustodyAdapter} from '../kairosNotePwaCustodyAdapter';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import type {receizeDocumentBytesClient} from '../../documentSeal/receizeDocumentBytesClient';

/** Retire the SENDER's existing custody into the exact recipient account. The
 * existing v129 terminal verifier and once-only redemption remain authoritative.
 * Receiver-side qualification is neither requested nor synthesized. */
export async function prepareBankNoteAccountTransfer(input:Readonly<{image:Uint8Array;request:Uint8Array;acceptedAtKai:string;nonce:string;
 custody:Pick<KairosNotePwaCustodyAdapter,'consumeExactHead'>;roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;sealDocument:typeof receizeDocumentBytesClient;
 onSealedSource(bytes:Uint8Array):Promise<void>}>){
 const request=await verifyBankNoteAccountReceivingRequest(input.request),note=await openBankNoteImage(input.image,{roots:input.roots});
 await assertBankNoteTransportCapacity(readBankFundedNoteSource(note),input.image);
 const intent:BankNoteRedemptionIntent={schema:note.rail==='settlement'?'receiz.bank.note-redemption.v2':'receiz.bank.note-redemption.v1',...(note.rail==='settlement'?{rail:'settlement' as const}:{}),
  noteId:note.noteId,noteArtifactSha256:note.noteArtifactSha256,receiverUserId:request.receiverUserId,receiverKeyId:request.receiverKeyId,
  amountPhiMicro:note.amountPhiMicro,amountUsdCents:note.amountUsdCents,acceptedAtKai:input.acceptedAtKai,nonce:input.nonce};
 const terminal=await prepareBankNoteRedemption(note,intent,input.custody,{roots:input.roots,sealDocument:input.sealDocument,onSealedSource:input.onSealedSource});
 const terminalSourceBytes=readBankNoteRedemption(terminal).bytes;
 const image=await exportBankNoteAccountDepositImage(terminalSourceBytes,input.image,{receiverUserId:request.receiverUserId,receiverKeyId:request.receiverKeyId,roots:input.roots});
 return {noteId:note.noteId,image,terminalSourceBytes};
}
