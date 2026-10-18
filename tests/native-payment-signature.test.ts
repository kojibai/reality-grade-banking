import {expect,it} from 'vitest';
import {canonicalizeReceizV122,receizBase64UrlEncode} from '@receiz/sdk';
import {verifyNativePaymentReceiptSignature} from '../src/receiz/native-payment-signature';
import {PAYMENT_DOMAIN,type NativePaymentReview} from '../src/receiz/native-payment-protocol';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
it('independently verifies native financial receipt/refusal domains and refuses changed amounts, roots and signature-time substitution',async()=>{
 const key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']),raw=new Uint8Array(await crypto.subtle.exportKey('raw',key.publicKey)),kid='test-only-financial-domain';
 const roots=new Map([[kid,{kid,alg:'Ed25519' as const,status:'active' as const,activeFromPulse:'200',publicKeyRawB64u:receizBase64UrlEncode(raw)}]]);
 const review:NativePaymentReview={schema:'receiz.bank.native-payment-review.v1',keyId:'a'.repeat(64),planDigest:'b'.repeat(64),request:{schema:'bankeiz.operation-request.v1',applicationId:BANK_APPLICATION_ID,requestId:'test-native-payment-0001',actorReceizId:'sender.receiz.id',kind:'send-value',rail:'reserve',amountUsdCents:'400',recipient:'receiver.receiz.id'},terms:{debitUsdCents:'400',debitPhiMicro:'2000000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'0',assetDigest:null,recipient:'receiver.receiz.id',expiresAtKaiUPulse:150000000}};
 const sign=async(payload:Record<string,unknown>)=>({...payload,rootSignature:{kid,alg:'Ed25519',sig:receizBase64UrlEncode(new Uint8Array(await crypto.subtle.sign('Ed25519',key.privateKey,new TextEncoder().encode(canonicalizeReceizV122(payload)))))}});
 const receipt=await sign({schema:'receiz.bank.native-payment-receipt.v1',domain:PAYMENT_DOMAIN,issuerRootKid:kid,review,transactionId:'11111111-1111-4111-8111-111111111111',kaiUPulse:'100000000',issuedAtKaiUPulse:'210000000',nativeTransferSourceSha256:'c'.repeat(64),senderAfter:{balancePhiMicro:'3000000',reserveUsdCents:'600',reserveBackingPhiMicro:'3000000'}});
 expect(await verifyNativePaymentReceiptSignature(receipt,roots)).toEqual(receipt);
 expect(await verifyNativePaymentReceiptSignature(receipt)).toBeNull();
 expect(await verifyNativePaymentReceiptSignature({...receipt,senderAfter:{balancePhiMicro:'999999',reserveUsdCents:'600',reserveBackingPhiMicro:'1'}},roots)).toBeNull();
 expect(await verifyNativePaymentReceiptSignature({...receipt,issuedAtKaiUPulse:'190000000'},roots)).toBeNull();
 const refusal=await sign({schema:'receiz.bank.native-payment-refusal.v1',domain:PAYMENT_DOMAIN,issuerRootKid:kid,review,reasonCode:'EXPIRED',kaiUPulse:'210000000'});
 expect(await verifyNativePaymentReceiptSignature(refusal,roots)).toEqual(refusal);
 expect(await verifyNativePaymentReceiptSignature({...refusal,reasonCode:'MISSING_ROW'},roots)).toBeNull();
});
