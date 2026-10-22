// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import {createBankOperations} from '../src/receiz/bank-operations';
import {createNativeAssets} from '../src/receiz/native-asset';
import {nativeAssetChallenge} from '../src/receiz/native-asset-protocol';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('creates from an amount alone, shows the signed split in details and retains the same intent after response loss',async()=>{
 const calls:string[]=[],requests:Record<string,unknown>[]=[],states:unknown[]=[];let state:unknown=null,preparedReady:unknown=null;
 const assets=createNativeAssets({ownerReceizId:'owner.receiz.id',keyId:'a'.repeat(64),assertOpen(){},lock:async run=>run(),store:{read:async()=>state,write:async(next,previous)=>{expect(previous).toEqual(state);state=structuredClone(next);states.push(state);}},sign:async challengeB64Url=>({schema:'receiz.identity.login_proof.v1',keyId:'a'.repeat(64),alg:'Ed25519',challengeB64Url,signatureB64Url:'fixture'}),request:async(path,body)=>{
  calls.push(path);requests.push(body);
  if(path.includes('/prepare?')){const review={schema:'receiz.bank.native-asset-review.v1',request:body,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{debitUsdCents:'10000',debitPhiMicro:'5000000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'1000000000',assetDigest:null,recipient:null,expiresAtKaiUPulse:9000000000000000,fundingComponents:[{rail:'reserve',amountUsdCents:'6000',amountPhiMicro:'3000000'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'}]}};return {...review,ticket:'fixture',challengeB64Url:nativeAssetChallenge(review as never)};}
  if(path.includes('/execute?')){expect(states).toHaveLength(1);throw Error('LOST_RESPONSE');}return {status:'unknown'};
 }});
 const operations=createBankOperations({ownerReceizId:'owner.receiz.id',assertOpen(){},assets,store:{load:async()=>null,saveNew:async()=>{},replace:async()=>{}},context:async()=>{throw Error('NO_GENERIC_RUNTIME');},lock:async run=>run()});
 const backingDrafts:unknown[]=[];
 const identity={backedAssetPublication:async()=>({pending:async()=>({state:null,deposit:null}),operations:(draft:unknown)=>{backingDrafts.push(draft);return identity.operations!();}}),operations:async()=>({...operations,prepare:async(input:Parameters<typeof operations.prepare>[0])=>{const result=await operations.prepare(input);preparedReady=result;return result;}}),listDeposits:async()=>[],binding:{artifactOwnerReceizId:'owner.receiz.id'}} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),button=(label:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent===label)!;
 const enter=async(label:string,value:string)=>{const input=[...host.querySelectorAll('label')].find(l=>l.textContent?.includes(label))!.querySelector('input')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});};
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={vi.fn()} onClose={vi.fn()}/>));await act(()=>button('Create with backing').click());
  expect(host.textContent).not.toContain('Back it with');expect(host.querySelectorAll('select')).toHaveLength(0);expect(calls).toEqual([]);
  const essay=host.querySelector('textarea[aria-label="Full text"]')??[...host.querySelectorAll('label')].find(label=>label.textContent?.includes('Full text'))?.querySelector('textarea');if(essay)await act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(essay,'A complete authored work');essay.dispatchEvent(new Event('input',{bubbles:true}));});
  await enter('Title','Unit');await enter('Short code','UNIT');await enter('Backing amount','100');
  await act(async()=>{button('Review asset creation').click();await vi.waitFor(()=>expect(preparedReady).not.toBeNull());});expect(host.textContent).toContain('Review asset creation.');expect(requests[0]).toMatchObject({kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:'10000'});expect(requests[0]).not.toHaveProperty('rail');expect(backingDrafts).toHaveLength(1);expect(backingDrafts[0]).toMatchObject({title:'Unit',longForm:'A complete authored work'});
  const details=host.querySelector('.transaction-proof-details')!;expect(details.textContent).toContain('Reserve');expect(details.textContent).toContain('$60.00');expect(details.textContent).toContain('Settlement');expect(details.textContent).toContain('$40.00');
  expect(button('Create funded asset').disabled).toBe(true);await act(()=>(host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());await act(async()=>{button('Create funded asset').click();await vi.waitFor(()=>expect(states).toHaveLength(1));});
  expect(host.textContent).toContain('Confirming your transaction.');expect(state).toMatchObject({current:{state:'unknown',prepared:{request:{fundingRule:'reserve-first-then-settlement'}}}});
  expect((await assets.recovery.resolve(true))?.status).toBe('unknown');expect(calls.map(p=>p.split('/').at(-1)?.split('?')[0])).toEqual(['prepare','execute','recover']);
 }finally{await act(()=>root.unmount());host.remove();}
});
