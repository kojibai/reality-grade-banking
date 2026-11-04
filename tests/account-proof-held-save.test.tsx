// @vitest-environment happy-dom
/** UI/custody wiring at the existing simulated native-opening seam only.
 * This fixture does not qualify an issuer. The real SDK forgery/refusal and
 * native signature conformance tests remain unmodified and run alongside it. */
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import * as sdk from '@receiz/sdk';
import {verifyAccountProof,heldAccountProofBytes,type AccountStatement} from '../src/receiz/account-proof';
import {AccountProofPanel} from '../src/features/account/AccountProofPanel';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import type {OpenIdentity} from '../src/receiz/native-identity';
const state=vi.hoisted(()=>({now:100000000,statement:null as unknown,payloadDigest:'',sourceDigest:'a'.repeat(64)}));
vi.mock('../src/receiz/account-proof-policy',()=>({ACCOUNT_PROOF_WRITERS:['fixture.writer.receiz.id'],ACCOUNT_PROOF_MAX_BYTES:24*1024*1024,ACCOUNT_PROOF_EXPORT_AGE_PULSES:30n}));
vi.mock('../src/receiz/client',async()=>{
 const real=await vi.importActual<typeof import('@receiz/sdk')>('@receiz/sdk');
 return {loadReceiz:async()=>({...real,receizKaiNow:()=>({uPulse:state.now}),createReceizClient:()=>({artifacts:{verifyAndOpen:async()=>({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:state.sourceDigest,continuity:{ownerReceizId:'fixture.writer.receiz.id'}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(state.statement)),sha256:state.payloadDigest}})}})})};
});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('reviews and saves the complete held statement locally without public consent, network or freshness rebuild',async()=>{
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const publicKeyRawB64u=sdk.receizBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),keyId=await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u,'Ed25519'),h=(value:string)=>value.repeat(64);
 const statement:AccountStatement={schema:'bankeiz.public-account-statement.v1',applicationId:BANK_APPLICATION_ID,account:{receizId:'fixture.receiz.id',keyId,alg:'Ed25519',publicKeyRawB64u},checkpoint:{accountHead:h('b'),identityBindingDigest:'',genesisHead:h('c'),historyHead:h('d'),transactionCount:1,kaiUPulse:'100000000',reserveUsdCents:'500',settlementPhiMicro:'1000000',historyDigest:''},transactions:[{sequence:1,transactionId:'complete-carried-transaction',eventDigest:h('d'),previousEventDigest:h('c'),kaiUPulse:'99000000',kind:'credit',description:'Complete fixture credit',reserveDeltaUsdCents:'500',settlementDeltaPhiMicro:'1000000'}]};
 statement.checkpoint.identityBindingDigest=await sdk.digestReceizCanonicalV122(statement.account);statement.checkpoint.historyDigest=await sdk.digestReceizCanonicalV122(statement.transactions);
 state.statement=statement;state.payloadDigest=await sdk.sha256ReceizBytes(new TextEncoder().encode(JSON.stringify(statement)));
 const wire=JSON.stringify({schema:'bankeiz.account-proof.v1',sdkVersion:'129.0.0',source:{schema:'receiz.sealed-artifact-bytes.v124',exactBytesB64u:sdk.receizBase64UrlEncode(new TextEncoder().encode('simulated opening only')),filename:'fixture.receiz',mimeType:'application/octet-stream',artifactSha256:state.sourceDigest,payloadSha256:state.payloadDigest}});
 const proof=await verifyAccountProof(new File([wire],'fixture.json'));state.now+=31000000;
 const publicSharing=vi.fn(async()=>{throw Error('PUBLICATION_FORBIDDEN');}),fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:held-proof'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const identity={accountProof:async()=>proof,accountProofSharing:publicSharing} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<AccountProofPanel identity={identity}/>));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Review account proof')!.click());
  expect(host.textContent).toContain('Account source verified');expect(host.textContent).toContain('Later activity is not checked by this file.');
  const save=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Save account proof'));expect(save).toBeDefined();expect(save!.disabled).toBe(false);
  await act(async()=>save!.click());
  expect(click).toHaveBeenCalledOnce();const anchor=click.mock.instances[0];expect(anchor).toBeInstanceOf(HTMLAnchorElement);expect((anchor as HTMLAnchorElement).download).toBe('bankeiz-account-proof-aaaaaaaaaaaaaaaa.json');
  const blob=url.mock.calls[0][0] as Blob;expect(new Uint8Array(await blob.arrayBuffer())).toEqual(heldAccountProofBytes(proof));
  expect(publicSharing).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
 }finally{act(()=>root.unmount());url.mockRestore();revoke.mockRestore();click.mockRestore();fetch.mockRestore();}
});
