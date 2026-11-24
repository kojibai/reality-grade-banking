import { expect, test, vi } from 'vitest';
import {
  createReceizIdIdentity, digestReceizCanonicalV122, signReceizIdentityLoginProof,
} from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { createOpticalNoteFrames, readOpticalNoteFrames } from '../src/receiz/optical-note-frames';
import { buildPaymentRequest, parsePaymentRequest } from '../src/receiz/payment-request';
import { createDeferredWalletSend } from '../src/receiz/wallet-send-deferred';
import { createNearbyWalletReceive } from '../src/receiz/wallet-nearby-receive';
import { encodeNearbyWalletPayment, signNearbyWalletPayment, type NearbyWalletPayment } from '../src/receiz/wallet-nearby-consent';

const sender = '10000000-0000-4000-8000-000000000001';
const merchant = '10000000-0000-4000-8000-000000000002';
const conversationId = '10000000-0000-4000-8000-000000000003';

async function transferOriginal(payment: NearbyWalletPayment) {
  const {senderUserId,recipientUserId,clientNonce,amountUsdCents}=payment;
  const transfer={id:clientNonce,messageId:clientNonce,conversationId,senderUserId,recipientUserId,
    clientNonce,amountUsdCents,amountPhiMicro:'1000',usdPerPhiMicrocents:'1000000'};
  const metadata={senderUserId,recipientUserId,amountUsdCents,amountPhiMicro:transfer.amountPhiMicro,
    usdPerPhiMicrocents:transfer.usdPerPhiMicrocents,nearbyConsentDigest:await digestReceizCanonicalV122(payment)};
  const receipt={digest:'a'.repeat(64),payloadDigest:'b'.repeat(64),originDigest:'c'.repeat(64)};
  return {ok:true,found:true,transfer,source:{
    transfer:{id:transfer.id,message_id:transfer.messageId,conversation_id:conversationId,sender_user_id:senderUserId,
      recipient_user_id:recipientUserId,client_nonce:clientNonce,amount_usd_cents:amountUsdCents,
      amount_phi_micro:transfer.amountPhiMicro,usd_per_phi_microcents:transfer.usdPerPhiMicrocents,metadata},
    message:{id:transfer.messageId,conversation_id:conversationId,sender_user_id:senderUserId,wallet_transfer:metadata,
      body:'Wallet payment',receiz_receipt:receipt,sealed_original:{primitive:'receiz.chat.message.original.v1',
        messageId:transfer.messageId,conversationId,senderUserId,body:'Wallet payment',walletTransfer:metadata,
        receiptDigest:receipt.digest,payloadDigest:receipt.payloadDigest,originDigest:receipt.originDigest}},
  }};
}

function custody<T>() {
  let held: readonly T[] | null = null;
  return { read: async () => structuredClone(held), write: async (next:readonly T[],expected:unknown) => {
    expect(expected).toEqual(held);
    held = structuredClone(next);
  }};
}

test('merchant carries two signed offline payments across reopen and confirms without the sender', async()=>{
  const passphrase='nearby-wallet-test';
  const keyFile=(await createReceizIdIdentity({passphrase})).keyFile;
  const senderCustody=custody<Awaited<ReturnType<ReturnType<typeof createDeferredWalletSend>['approve']>>>();
  const recipientCustody=custody<Awaited<ReturnType<ReturnType<typeof createNearbyWalletReceive>['receive']>>>();
  const senderDelivery=vi.fn(async()=>{throw Error('Sender stayed offline');});
  const send=createDeferredWalletSend({
    account:()=>({accountUid:sender,availableUsdCents:'5000'}),online:()=>false,lock:async work=>work(),
    store:senderCustody,deliver:senderDelivery,
    signNearby:(review)=>signNearbyWalletPayment({
      applicationId:BANK_APPLICATION_ID,senderUserId:review.accountUid,recipientUserId:review.recipientUserId,
      amountUsdCents:review.amountUsdCents,clientNonce:review.clientNonce,note:review.note??null,kaiUPulse:'1000000',
      keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,
    }, challengeB64Url=>signReceizIdentityLoginProof({keyFile,passphrase,challengeB64Url})),
  });
  let online=false;
  const confirm=vi.fn(transferOriginal);
  const open=()=>createNearbyWalletReceive({
    applicationId:BANK_APPLICATION_ID,accountUid:()=>merchant,online:()=>online,lock:async work=>work(),
    store:recipientCustody,confirm,onRecorded:()=>{},
  });
  const receive=open();
  const qr=parsePaymentRequest(buildPaymentRequest('coffee.receiz.id','19',merchant));
  expect(qr).toMatchObject({recipient:'coffee.receiz.id',nearbyRecipient:merchant,amount:'19.00'});
  for(const amountUsdCents of ['1900','2300']){
    const review=await send.prepare({recipient:qr.nearbyRecipient!,amountUsdCents},qr.recipient,true);
    const {payment}=await send.approve(review,review.confirmationDigest);
    const framed=await createOpticalNoteFrames('wallet',encodeNearbyWalletPayment(payment!));
    const reader=readOpticalNoteFrames('wallet');
    let decoded:Awaited<ReturnType<typeof reader.push>>=null;
    for(let index=0;index<framed.count;index++)decoded=await reader.push(framed.frame(index));
    const scanned=JSON.parse(new TextDecoder().decode(decoded!.bytes));
    await receive.receive(scanned);
    await receive.receive(scanned);
    await expect(receive.receive({...scanned,amountUsdCents:'9000'})).rejects.toThrow('BANK_WALLET_NEARBY_CONSENT_INVALID');
  }
  await receive.resume();
  expect(confirm).not.toHaveBeenCalled();
  const reopened=open();
  expect((await reopened.list()).map(row=>row.original)).toEqual([undefined,undefined]);
  online=true;
  confirm.mockRejectedValueOnce(Error('Temporary source outage'));
  await reopened.resume();
  expect((await reopened.list()).map(row=>Boolean(row.original))).toEqual([false,true]);
  await reopened.resume();
  await open().resume();
  expect(confirm).toHaveBeenCalledTimes(3);
  expect((await open().list()).map(row=>Boolean(row.original))).toEqual([true,true]);
  expect(senderDelivery).not.toHaveBeenCalled();
});
