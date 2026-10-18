import {expect,it,vi} from 'vitest';
import * as payments from '../src/receiz/native-payment';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
it('retains the exact approved intent before submission and uses only read-only recovery after response loss',async()=>{
 const factory=Reflect.get(payments,'createNativePayments');expect(typeof factory).toBe('function');
 let state:unknown=null;const sequence:string[]=[];const calls:string[]=[];
 const api=factory({ownerReceizId:'sender.receiz.id',keyId:'a'.repeat(64),assertOpen(){},lock:async<T>(fn:()=>Promise<T>)=>fn(),store:{read:async()=>state,write:async(value:unknown,expected:unknown)=>{expect(state).toEqual(expected);state=structuredClone(value);sequence.push('retained');}},sign:vi.fn(async(challengeB64Url:string)=>({schema:'receiz.identity.login_proof.v1' as const,alg:'Ed25519' as const,keyId:'a'.repeat(64),challengeB64Url,signatureB64Url:'test-only'})),request:async(path:string,body:Record<string,unknown>)=>{calls.push(path);if(path.includes('/prepare?')){const request=body;const review={schema:'receiz.bank.native-payment-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{debitUsdCents:'100',debitPhiMicro:'500000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'0',assetDigest:null,recipient:'receiver.receiz.id',expiresAtKaiUPulse:9000000000000000}};const {nativePaymentChallenge}=await import('../src/receiz/native-payment-protocol');return{...review,ticket:'opaque',challengeB64Url:nativePaymentChallenge(review as never)};}if(path.includes('/execute?')){expect(sequence).toEqual(['retained']);throw Error('lost response');}return{schema:'receiz.bank.native-payment-result.v1',status:'unknown'};}});
 const review=await api.prepare({kind:'send-value',rail:'reserve',amountUsdCents:'100',recipient:'receiver.receiz.id'});
 expect(state).toBeNull();await expect(api.execute(review,'wrong')).rejects.toThrow();
 expect((await api.execute(review,review.confirmationDigest)).status).toBe('unknown');
 expect((await api.recovery.resolve(true))?.status).toBe('unknown');
 expect(calls).toEqual(['prepare','execute','recover'].map(s=>`/api/connect/bank/payments/${s}?applicationId=${BANK_APPLICATION_ID}`));
 await expect(api.prepare({kind:'send-value',rail:'reserve',amountUsdCents:'100',recipient:'receiver.receiz.id'})).rejects.toThrow('PENDING');
 await expect(api.recovery.exportRecovery()).rejects.toThrow();
});

it('admits only exact scoped payment POST paths, never account selectors or alternate origins',async()=>{
 const {permittedNativePath}=await import('../src/receiz/native-transport');
 for(const action of ['prepare','execute','recover']){const path=`/api/connect/bank/payments/${action}?applicationId=${BANK_APPLICATION_ID}`;expect(permittedNativePath(path,'POST')).toBe(true);for(const p of [path+'&accountId=foreign',path+`&applicationId=${BANK_APPLICATION_ID}`,path.replace(BANK_APPLICATION_ID,'rc_other'),'https://other.test'+path])expect(permittedNativePath(p,'POST')).toBe(false);expect(permittedNativePath(path,'GET')).toBe(false);}
});
it('never treats a fabricated financial success as a v129 source',async()=>{
 const {verifyNativePaymentSource}=await import('../src/receiz/native-payment');
 await expect(verifyNativePaymentSource({schema:'receiz.bank.native-payment-result.v1',status:'committed',source:{filename:'native-payment.receizbundle',mimeType:'application/vnd.receiz.bundle+json',exactBytesB64u:'e30',artifactSha256:'a'.repeat(64)}})).rejects.toThrow();
});
it('keeps an earlier generic execution pending before entering the payment adapter',async()=>{
 const {createBankOperations}=await import('../src/receiz/bank-operations');const prepare=vi.fn(async()=>{throw Error('MUST_NOT_PREPARE');});
 const api=createBankOperations({ownerReceizId:'sender.receiz.id',assertOpen(){},store:{load:async()=>({state:'unknown'}) as never,saveNew:async()=>{},replace:async()=>{}},context:async()=>{throw Error('MUST_NOT_CONNECT');},lock:async fn=>fn(),payments:{prepare,execute:async()=>{throw Error('MUST_NOT_EXECUTE');},discard(){}}});
 await expect(api.prepare({kind:'send-value',rail:'reserve',amountUsdCents:'100',recipient:'receiver.receiz.id'})).rejects.toThrow('BANK_EXECUTION_PENDING');expect(prepare).not.toHaveBeenCalled();
});
