type Json=Record<string,any>;
const object=(v:unknown):Json=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('BANK_WALLET_SOURCE_INVALID');return v as Json;};
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const integer=(v:unknown)=>typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v);
/** Exact authenticated Wallet original relationships, shared by sender recovery
 * and receiving observation. This does not create an offline financial receipt. */
export function readWalletTransferOriginal(raw:unknown){
 const r=object(raw);if(r.ok!==true||r.found!==true)throw Error('BANK_WALLET_OUTCOME_UNKNOWN');const t=object(r.transfer);
 if(!uuid(t.id)||!uuid(t.senderUserId)||!uuid(t.recipientUserId)||!uuid(t.conversationId)||typeof t.clientNonce!=='string'||!integer(t.amountUsdCents)||!integer(t.amountPhiMicro)||!integer(t.usdPerPhiMicrocents))throw Error('BANK_WALLET_OUTCOME_MISMATCH');
 const source=object(r.source),row=object(source.transfer),message=object(source.message),original=object(message.sealed_original),receipt=object(message.receiz_receipt);
 if(!uuid(t.messageId)||row.id!==t.id||row.message_id!==t.messageId||row.client_nonce!==t.clientNonce||row.sender_user_id!==t.senderUserId||row.recipient_user_id!==t.recipientUserId||row.conversation_id!==t.conversationId||message.id!==t.messageId||message.sender_user_id!==t.senderUserId||message.conversation_id!==t.conversationId||original.primitive!=='receiz.chat.message.original.v1'||original.messageId!==t.messageId||original.conversationId!==t.conversationId||original.senderUserId!==t.senderUserId||typeof message.body!=='string'||original.body!==message.body||!['digest','payloadDigest','originDigest'].every(k=>typeof receipt[k]==='string'&&/^[a-f0-9]{64}$/.test(receipt[k])&&original[k==='digest'?'receiptDigest':k]===receipt[k]))throw Error('BANK_WALLET_ORIGINAL_UNAVAILABLE');
 for(const[field,column]of[['amountPhiMicro','amount_phi_micro'],['amountUsdCents','amount_usd_cents'],['usdPerPhiMicrocents','usd_per_phi_microcents']])if(String(row[column])!==t[field])throw Error('BANK_WALLET_OUTCOME_MISMATCH');
 const carried=[row.metadata,message.wallet_transfer,original.walletTransfer].map(object);
 for(const value of carried)if(value.senderUserId!==t.senderUserId||value.recipientUserId!==t.recipientUserId||!['amountPhiMicro','amountUsdCents','usdPerPhiMicrocents'].every(field=>value[field]===t[field]))throw Error('BANK_WALLET_OUTCOME_MISMATCH');
 const at=t.createdAt??row.created_at;
 return{transferId:t.id as string,clientNonce:t.clientNonce as string,senderUserId:t.senderUserId as string,recipientUserId:t.recipientUserId as string,amountUsdCents:t.amountUsdCents as string,conversationId:t.conversationId as string,messageId:t.messageId as string,recordedAt:typeof at==='string'&&Number.isFinite(Date.parse(at))?at:null,carried,source:raw};
}
