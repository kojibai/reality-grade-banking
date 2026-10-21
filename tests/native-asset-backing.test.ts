import {expect,it} from 'vitest';
import * as protocol from '../src/receiz/native-asset-protocol';
const definition={name:'Unit',symbol:'UNIT',units:'10',description:'',linkedProofDigest:null};
const base={schema:'bankeiz.operation-request.v1',applicationId:'rc_test',requestId:'automatic-test-01',actorReceizId:'owner.receiz.id',kind:'fund-asset',amountUsdCents:'10000',definition};
const components=[{rail:'reserve',amountUsdCents:'6000',amountPhiMicro:'3000000'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'}];
const terms={debitUsdCents:'10000',debitPhiMicro:'5000000',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',quantityMicro:'10000000',assetDigest:null,recipient:null,expiresAtKaiUPulse:10000000000};
it('accepts only the closed automatic funding request and binds components into its challenge',()=>{
 const request={...base,fundingRule:'reserve-first-then-settlement'},review={schema:'receiz.bank.native-asset-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{...terms,fundingComponents:components}};
 expect(protocol.inspectNativeAssetRequest(request)).toEqual(request);expect(protocol.nativeAssetReviewFromChallenge(protocol.nativeAssetChallenge(review as never))).toEqual(review);
 for(const v of [{...request,rail:'reserve'},{...request,fundingRule:'other'},base,{...request,extra:true}])expect(()=>protocol.inspectNativeAssetRequest(v)).toThrow();
 expect(()=>protocol.inspectNativeAssetReview({...review,terms})).toThrow();
 expect(()=>protocol.inspectNativeAssetReview({...review,request:{...base,rail:'reserve'}})).toThrow();
});
it('rejects ambiguous or mismatched components before they can become financial terms',()=>{
 const inspect=Reflect.get(protocol,'inspectNativeAssetFundingComponents');expect(inspect).toBeTypeOf('function');
 const total={amountUsdCents:'10000',amountPhiMicro:'5000000'};expect(inspect(components,total)).toEqual(components);
 const first=components[0],second=components[1];
 for(const rows of [[],[second,first],[first,first],[{...first,amountUsdCents:'0'},second],[{...first,amountPhiMicro:'03000000'},second],[{...first,privateKey:'x'},second],[{...first,amountUsdCents:'-1'},second],[{...first,amountPhiMicro:'9223372036854775808'},second],[{...first,amountUsdCents:'6001'},second]])expect(()=>inspect(rows,total)).toThrow();
 expect(inspect([],{amountUsdCents:'0',amountPhiMicro:'0'},true)).toEqual([]);expect(()=>inspect([],total,true)).toThrow();
});
it('retains the exact historical request and review encoding without adding fields',()=>{
 const request={...base,rail:'reserve'},review={schema:'receiz.bank.native-asset-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms};
 expect(JSON.stringify(protocol.inspectNativeAssetRequest(request))).toBe(JSON.stringify(request));expect(JSON.stringify(protocol.inspectNativeAssetReview(review))).toBe(JSON.stringify(review));
});
