import {expect,it,vi} from 'vitest';
import * as payments from '../src/receiz/native-asset';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
it('keeps the displayed automatic split immutable before identity signing',async()=>{
 let signs=0;
 const api=payments.createNativeAssets({ownerReceizId:'owner.receiz.id',keyId:'a'.repeat(64),assertOpen(){},lock:async run=>run(),store:{read:async()=>null,write:async()=>{}},sign:async()=>{signs++;throw Error('NO_SIGN');},request:async(_path,request)=>{
  const review={schema:'receiz.bank.native-asset-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{debitUsdCents:'10000',debitPhiMicro:'5000000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'1000000',assetDigest:null,recipient:null,expiresAtKaiUPulse:9000000000000000,fundingComponents:[{rail:'reserve',amountUsdCents:'6000',amountPhiMicro:'3000000'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'}]}};
  const {nativeAssetChallenge}=await import('../src/receiz/native-asset-protocol');return {...review,ticket:'fixture',challengeB64Url:nativeAssetChallenge(review as never)};
 }});
 const review=await api.prepare({kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:'10000',definition:{name:'Units',symbol:'UNIT',units:'1',description:'',linkedProofDigest:null}});
 expect(()=>Object.assign(review.terms.fundingComponents![0],{amountUsdCents:'1'})).toThrow(TypeError);
 expect(()=>Array.prototype.pop.call(review.terms.fundingComponents)).toThrow(TypeError);
 expect(()=>Object.assign((review.request as {definition:object}).definition,{units:'2'})).toThrow(TypeError);
 expect(review.terms.fundingComponents![0].amountUsdCents).toBe('6000');expect(signs).toBe(0);
});
it('retains the exact approved intent before submission and uses only read-only recovery after response loss',async()=>{
 const factory=Reflect.get(payments,'createNativeAssets');expect(typeof factory).toBe('function');
 let state:unknown=null;const sequence:string[]=[];const calls:string[]=[];
 const api=factory({ownerReceizId:'sender.receiz.id',keyId:'a'.repeat(64),assertOpen(){},lock:async<T>(fn:()=>Promise<T>)=>fn(),store:{read:async()=>state,write:async(value:unknown,expected:unknown)=>{expect(state).toEqual(expected);state=structuredClone(value);sequence.push('retained');}},sign:vi.fn(async(challengeB64Url:string)=>({schema:'receiz.identity.login_proof.v1' as const,alg:'Ed25519' as const,keyId:'a'.repeat(64),challengeB64Url,signatureB64Url:'test-only'})),request:async(path:string,body:Record<string,unknown>)=>{calls.push(path);if(path.includes('/prepare?')){const request=body;const review={schema:'receiz.bank.native-asset-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{debitUsdCents:'100',debitPhiMicro:'500000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'1000000',assetDigest:null,recipient:null,expiresAtKaiUPulse:9000000000000000}};const {nativeAssetChallenge}=await import('../src/receiz/native-asset-protocol');return{...review,ticket:'opaque',challengeB64Url:nativeAssetChallenge(review as never)};}if(path.includes('/execute?')){expect(sequence).toEqual(['retained']);throw Error('lost response');}return{schema:'receiz.bank.native-asset-result.v1',status:'unknown'};}});
 const review=await api.prepare({kind:'fund-asset',rail:'reserve',amountUsdCents:'100',definition:{name:'Funded unit',symbol:'UNIT',units:'1',description:'Funded units.',linkedProofDigest:null}});
 expect(state).toBeNull();await expect(api.execute(review,'wrong')).rejects.toThrow();
 expect((await api.execute(review,review.confirmationDigest)).status).toBe('unknown');
 expect((await api.recovery.resolve(true))?.status).toBe('unknown');
 expect(calls).toEqual(['prepare','execute','recover'].map(s=>`/api/connect/bank/assets/${s}?applicationId=${BANK_APPLICATION_ID}`));
 await expect(api.prepare({kind:'fund-asset',rail:'reserve',amountUsdCents:'100',definition:{name:'Funded unit',symbol:'UNIT',units:'1',description:'Funded units.',linkedProofDigest:null}})).rejects.toThrow('PENDING');
 await expect(api.recovery.exportRecovery()).rejects.toThrow();
});

it('admits only exact scoped asset POST paths, never account selectors or alternate origins',async()=>{
 const {permittedNativePath}=await import('../src/receiz/native-transport');
 for(const action of ['prepare','execute','recover']){const path=`/api/connect/bank/assets/${action}?applicationId=${BANK_APPLICATION_ID}`;expect(permittedNativePath(path,'POST')).toBe(true);for(const p of [path+'&accountId=foreign',path+`&applicationId=${BANK_APPLICATION_ID}`,path.replace(BANK_APPLICATION_ID,'rc_other'),'https://other.test'+path])expect(permittedNativePath(p,'POST')).toBe(false);expect(permittedNativePath(path,'GET')).toBe(false);}
});
it('never treats a fabricated financial success as a v129 source',async()=>{
 const {verifyNativeAssetSource}=await import('../src/receiz/native-asset');
 await expect(verifyNativeAssetSource({schema:'receiz.bank.native-asset-result.v1',status:'committed',source:{filename:'native-asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',exactBytesB64u:'e30',artifactSha256:'a'.repeat(64)}})).rejects.toThrow();
});
it('keeps an earlier generic execution pending before entering the asset adapter',async()=>{
 const {createBankOperations}=await import('../src/receiz/bank-operations');const prepare=vi.fn(async()=>{throw Error('MUST_NOT_PREPARE');});
 const api=createBankOperations({ownerReceizId:'sender.receiz.id',assertOpen(){},store:{load:async()=>({state:'unknown'}) as never,saveNew:async()=>{},replace:async()=>{}},context:async()=>{throw Error('MUST_NOT_CONNECT');},lock:async fn=>fn(),assets:{prepare,execute:async()=>{throw Error('MUST_NOT_EXECUTE');},discard(){}}});
 await expect(api.prepare({kind:'fund-asset',rail:'reserve',amountUsdCents:'100',definition:{name:'Funded unit',symbol:'UNIT',units:'1',description:'Funded units.',linkedProofDigest:null}})).rejects.toThrow('BANK_EXECUTION_PENDING');expect(prepare).not.toHaveBeenCalled();
});
it('permits the current app portfolio source read through the actual Bank gateway',async()=>{
 const {permittedNativePath}=await import('../src/receiz/native-transport');const {nativeRequestPath}=await import('../server/native-account');
 const path=`/api/connect/bank/assets/portfolio?applicationId=${BANK_APPLICATION_ID}`;
 expect(permittedNativePath(path,'POST')).toBe(true);expect(nativeRequestPath(`/api/bank/native${path}`,'POST')).toBe(path);
 for(const bad of [path+'&accountId=foreign',path.replace(BANK_APPLICATION_ID,'rc_foreign'),path+`&applicationId=${BANK_APPLICATION_ID}`])expect(permittedNativePath(bad,'POST')).toBe(false);
 expect(permittedNativePath(path,'GET')).toBe(false);
});
