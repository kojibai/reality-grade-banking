import {expect,it} from 'vitest';
import original from './fixtures/retained-transfer-original.json';
import {inspectTransferOriginal,isTransferOriginal} from '../src/receiz/transfer-original-proof';
// Golden synthetic source issued by the unchanged Receiz createReceipt function
// (chat/server.ts), fixed test nonce and timestamp; no account or live payment.
it('checks the existing issued Original and v2 receipt without a new seal or lookup',async()=>{
 expect(isTransferOriginal(original)).toBe(true);
 expect(await inspectTransferOriginal(original)).toMatchObject({status:'receipt-matched-original',transferId:original.transfer.id,checks:{payloadDigest:true,receiptDigest:true,originalReceiptBinding:true,messageScopeBinding:true},continuity:{state:'initial-receipt'},authentication:'not-established-by-receipt-hashes'});
});
it('refuses changed Original, receipt and selected source relationships',async()=>{
 for(const change of [(v:any)=>{v.source.message.sealed_original.body='changed';v.source.message.body='changed';},(v:any)=>v.source.message.receiz_receipt.digestNonce='00'.repeat(16),(v:any)=>v.source.message.receiz_receipt.previousDigest='a'.repeat(64),(v:any)=>v.source.transfer.recipient_user_id=original.transfer.senderUserId,(v:any)=>v.transfer.amountUsdCents='1001']){
  const changed=structuredClone(original);change(changed);await expect(inspectTransferOriginal(changed)).rejects.toThrow();
 }
 expect(isTransferOriginal({schema:'bankeiz.ledger-inspection.v1'})).toBe(false);
});
