import {digestReceizCanonicalV122} from '@receiz/sdk';
// Explicit shape-only synthetic source for the loopback example. No signature,
// identity enrollment, financial execution or independently verifiable receipt.
export async function syntheticPayment(checkoutUrl){
 const url=new URL(checkoutUrl),sale={schema:'bank.fixed-checkout.v1',saleId:url.searchParams.get('sale'),recipientUserId:url.searchParams.get('recipient'),username:url.pathname.split('/')[2],currency:'usd',amountUsdCents:url.searchParams.get('amount').replace('.','')};
 sale.amountUsdCents=BigInt(sale.amountUsdCents).toString();
 const nonce=crypto.randomUUID(),id=crypto.randomUUID(),conversation=crypto.randomUUID(),sender='10000000-0000-4000-8000-000000000001';
 const values={senderUserId:sender,recipientUserId:sale.recipientUserId,amountUsdCents:sale.amountUsdCents,amountPhiMicro:String(BigInt(sale.amountUsdCents)*10000n),usdPerPhiMicrocents:'100000000',note:`bank.sale.v1:${await digestReceizCanonicalV122(sale)}:${nonce}`,noteVisibility:'public'},receipt={digest:'a'.repeat(64),payloadDigest:'b'.repeat(64),originDigest:'c'.repeat(64)};
 return{ok:true,found:true,transfer:{id,messageId:id,clientNonce:nonce,conversationId:conversation,...values},source:{transfer:{id,message_id:id,client_nonce:nonce,conversation_id:conversation,sender_user_id:sender,recipient_user_id:sale.recipientUserId,amount_usd_cents:sale.amountUsdCents,amount_phi_micro:values.amountPhiMicro,usd_per_phi_microcents:values.usdPerPhiMicrocents,metadata:values},message:{id,conversation_id:conversation,sender_user_id:sender,body:'Synthetic example only',wallet_transfer:values,receiz_receipt:receipt,sealed_original:{primitive:'receiz.chat.message.original.v1',messageId:id,conversationId:conversation,senderUserId:sender,body:'Synthetic example only',walletTransfer:values,receiptDigest:receipt.digest,payloadDigest:receipt.payloadDigest,originDigest:receipt.originDigest}}}};
}
