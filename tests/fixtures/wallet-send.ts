import type {WalletTransferBody} from '../../src/receiz/wallet-send';
/** Shape-only synthetic originals. No account, credential, seal or money. */
export function syntheticWalletRecord(body:WalletTransferBody,sender:string){
 const id='10000000-0000-4000-8000-000000000004',values={senderUserId:sender,recipientUserId:body.recipientUserId,amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',...(body.note?{note:body.note,noteVisibility:body.noteVisibility}:{})};
 const receipt={digest:'a'.repeat(64),payloadDigest:'b'.repeat(64),originDigest:'c'.repeat(64)};
 return{ok:true,found:true,transfer:{id,messageId:id,clientNonce:body.clientNonce,conversationId:body.conversationId,...values},source:{transfer:{id,message_id:id,client_nonce:body.clientNonce,conversation_id:body.conversationId,sender_user_id:sender,recipient_user_id:body.recipientUserId,amount_usd_cents:'1000',amount_phi_micro:'10000000',usd_per_phi_microcents:'100000000',metadata:values},message:{id,conversation_id:body.conversationId,sender_user_id:sender,body:'synthetic',wallet_transfer:values,receiz_receipt:receipt,sealed_original:{primitive:'receiz.chat.message.original.v1',messageId:id,conversationId:body.conversationId,senderUserId:sender,body:'synthetic',walletTransfer:values,receiptDigest:receipt.digest,payloadDigest:receipt.payloadDigest,originDigest:receipt.originDigest}}}};
}
