import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createOwnershipShareTransfer} from '../src/receiz/ownership-share-transfer';
import {readVerifiedReceizDocumentBytesCanonical} from '../node_modules/@receiz/sdk/dist/verifier/canonical.js';
import type {ReceizSignatureV4RootPublicKey} from '../native/receiz/packages/receiz-sdk/src/verifier/signatureV4';
import {vaultDigest} from '../src/receiz/vault/encoding';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/ownership-share-native.json',import.meta.url),'utf8'));
function setup(){
 const f=fixture(),blocks=new Map<string,Uint8Array>();let saved:unknown=null,executions=0,recoveries=0,requests=0;
 const roots=new Map<string,ReceizSignatureV4RootPublicKey>(f.roots);
 const ports={identityDigest:'a'.repeat(64),accountUid:f.principal.userId,keyId:f.principal.keyId,receizId:f.principal.receizId,assertOpen(){},lock:async<T,>(work:()=>Promise<T>)=>work(),store:{read:async()=>saved,write:async(next:unknown,previous:unknown)=>{expect(saved).toEqual(previous);saved=structuredClone(next);}},archive:{retain:async(bytes:Uint8Array)=>{const d=await vaultDigest(bytes);blocks.set(d,bytes.slice());return d;},restore:async(d:string)=>{const b=blocks.get(d);if(!b)throw Error('missing');return b.slice();}},sign:async(challenge:string)=>{expect(challenge).toBe(f.prepared.challengeB64Url);return f.submission.consentProof;},request:async(action:string,body:Record<string,unknown>)=>{requests++;if(action==='prepare'){expect(body).toMatchObject({kind:'transfer',positionId:f.prepared.review.request.positionId});return f.prepared;}if(action==='execute'){expect(saved).toMatchObject({current:{status:'submitted'}});executions++;throw Error('lost reply');}recoveries++;return f.result;},verification:{roots,async open(bytes:Uint8Array){const r=await readVerifiedReceizDocumentBytesCanonical({fileBytes:bytes,filename:'market-share.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});if(!r.ok||!r.verification.integrity.ok)throw Error('TEST_UNVERIFIED');const record=r.verification.bundle?.nativeRecordSeal as {ownerReceizId:string;recordId:string};return{payloadBytes:r.payloadBytes,kaiPulse:String(r.verification.bundle?.kaiPulseEternal),ownerReceizId:record.ownerReceizId,recordId:record.recordId};}},operationId:()=>f.prepared.review.request.requestId};
 return{f,ports,saved:()=>saved,counts:()=>({executions,recoveries,requests})};
}
it('persists the exact approved ordinary share send before submission and recovers its actual native Source without another execution',async()=>{
 const s=setup(),api=createOwnershipShareTransfer(s.ports),r=s.f.prepared.review.request;
 const review=await api.prepare({positionId:r.positionId,marketItemId:r.marketItemId,quantityMicro:r.quantityMicro,recipient:r.recipientAccountId});
 expect(review).toMatchObject({title:'Original',quantityMicro:'1000000',recipient:'recipient.receiz.id'});
 await expect(api.execute({...review})).rejects.toThrow('REVIEW_REQUIRED');
 expect((await api.execute(review)).status).toBe('submitted');
 const resumed=createOwnershipShareTransfer(s.ports),result=await resumed.recover();
 expect(result).toMatchObject({status:'committed',quantityMicro:'1000000',recipient:'recipient.receiz.id',costBasisUsdCents:'33',costBasisPhiMicro:'333334'});
 expect(s.counts()).toEqual({executions:1,recoveries:1,requests:3});
 expect(await resumed.recover()).toEqual(result);expect(s.counts().requests).toBe(3);
 expect(s.saved()).toMatchObject({current:{status:'committed'}});
});
it('rejects changed prepared quantities and foreign actors before retaining or signing a request',async()=>{
 for(const change of ['quantity','owner']){
  const s=setup();s.ports.request=async()=>{const prepared=structuredClone(s.f.prepared);if(change==='quantity')prepared.review.request.quantityMicro='2000000';else prepared.review.actor.accountId='another-account';return prepared;};
  const r=s.f.prepared.review.request,api=createOwnershipShareTransfer(s.ports);
  await expect(api.prepare({positionId:r.positionId,marketItemId:r.marketItemId,quantityMicro:r.quantityMicro,recipient:r.recipientAccountId})).rejects.toThrow();
  expect(s.saved()).toBeNull();
 }
});
