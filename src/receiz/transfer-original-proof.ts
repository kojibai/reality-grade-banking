import {jcsCanonicalize,sha256Hex} from '../../native/receiz/packages/receiz-sdk/src/verifier/crypto';
import {readWalletTransferOriginal} from './wallet-transfer-original';

const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const invalid=():never=>{throw Error('TRANSFER_ORIGINAL_RECEIPT_MISMATCH');};
/** Recognize the existing authenticated original response, not Ledger display
 * JSON. Recognition supplies no proof or financial authority. */
export function isTransferOriginal(value:unknown){
 const raw=object(value),message=object(object(raw.source).message);
 return raw.ok===true&&raw.found===true&&object(message.sealed_original).primitive==='receiz.chat.message.original.v1';
}
/** The exact v2 receipt contract used by Receiz createReceipt. This checks the
 * retained Original against its issued hashes, with no reseal or live lookup.
 * Hash consistency is not a signature, native financial admission or evidence
 * that referenced funding predecessors have been supplied. */
export async function inspectTransferOriginal(value:unknown){
 const binding=readWalletTransferOriginal(value),raw=object(value),source=object(raw.source),message=object(source.message),original=object(message.sealed_original),receipt=object(message.receiz_receipt);
 const payloadKeys=['messageId','conversationId','senderUserId','senderKind','senderAiId','senderDisplay','body','walletTransfer','createdAt'];
 const originalKeys=[...payloadKeys,'version','primitive','receiptDigest','payloadDigest','originDigest'];
 const receiptKeys=['version','primitive','kind','scopeId','sealId','payloadDigest','digest','originDigest','resealCount','sealedAt','receizedBy','payloadEncoding','digestNonce','previousDigest'];
 if(Object.keys(raw).sort().join('|')!=='found|ok|source|transfer'||Object.keys(source).sort().join('|')!=='message|transfer'||Object.keys(original).sort().join('|')!==originalKeys.sort().join('|')||Object.keys(receipt).sort().join('|')!==receiptKeys.sort().join('|')||original.version!==1||original.senderKind!=='user'||original.senderAiId!==null||original.senderDisplay!==null
  ||receipt.version!==2||receipt.primitive!=='receiz.chat.receipt.v2'||receipt.kind!=='message'||receipt.payloadEncoding!=='jcs-v1'||receipt.scopeId!==original.messageId||receipt.receizedBy!==original.senderUserId||receipt.sealedAt!==original.createdAt
  ||!hex(receipt.digest)||receipt.sealId!==receipt.digest.slice(0,8)||!hex(receipt.payloadDigest)||!hex(receipt.originDigest)||typeof receipt.digestNonce!=='string'||!/^[a-f0-9]{32}$/.test(receipt.digestNonce)
  ||!Number.isSafeInteger(receipt.resealCount)||(receipt.resealCount as number)<0||typeof original.createdAt!=='string'||!Number.isFinite(Date.parse(original.createdAt)))invalid();
 const initial=receipt.resealCount===0;
 if(initial?(receipt.previousDigest!==null||receipt.originDigest!==receipt.payloadDigest):!hex(receipt.previousDigest))invalid();
 const payload=Object.fromEntries(payloadKeys.map(key=>[key,original[key]]));
 const {digest:expected,sealId,...base}=receipt;
 if(await sha256Hex(jcsCanonicalize(payload))!==receipt.payloadDigest||await sha256Hex(jcsCanonicalize(base))!==expected)invalid();
 const funding=object(object(original.walletTransfer).fundingProofBasis),references=Array.isArray(funding.artifactIds)?funding.artifactIds.length:0;
 return Object.freeze({schema:'bankeiz.transfer-original-inspection.v1' as const,format:'receiz.chat.message.original.v1' as const,status:'receipt-matched-original' as const,
  transferId:binding.transferId,messageId:binding.messageId,senderUserId:binding.senderUserId,recipientUserId:binding.recipientUserId,amountUsdCents:binding.amountUsdCents,
  payloadDigest:receipt.payloadDigest as string,receiptDigest:expected as string,
  checks:Object.freeze({payloadDigest:true,receiptDigest:true,originalReceiptBinding:true,messageScopeBinding:true}),
  continuity:Object.freeze({state:initial?'initial-receipt' as const:'predecessor-not-carried' as const,originDigest:receipt.originDigest as string,previousDigest:receipt.previousDigest as string|null,resealCount:receipt.resealCount as number,fundingOriginalReferences:references}),
  authentication:'not-established-by-receipt-hashes' as const,
  scope:'Stored transfer Original and its Receiz v2 receipt hashes and bindings. Referenced funding Originals are not verified by their identifiers. No sender signature, complete funding history, current balance or spendability is established.'});
}
export type TransferOriginalInspection=Awaited<ReturnType<typeof inspectTransferOriginal>>;

