import {expect,it} from 'vitest';
import {projectMoneyHistory,searchMoneyHistory} from '../src/receiz/money-history';
import type {AccountStatement} from '../src/receiz/account-proof';
const h='a'.repeat(64);
function source():AccountStatement{return{schema:'bankeiz.public-account-statement.v2',applicationId:'test',account:{receizId:'owner.receiz.id',keyId:h,alg:'Ed25519',publicKeyRawB64u:'public'},checkpoint:{accountHead:h,genesisHead:h,identityBindingDigest:h,historyHead:h,historyDigest:h,transactionCount:4,kaiUPulse:'9000000',reserveUsdCents:'0',settlementPhiMicro:'0'},transactions:[
 {sequence:1,transactionId:'one',eventDigest:h,previousEventDigest:h,kaiUPulse:'2000000',kind:'payment',description:'Acme retainer',reserveDeltaUsdCents:'9007199254740993',settlementDeltaPhiMicro:'0'},
 {sequence:2,transactionId:'two',eventDigest:h,previousEventDigest:h,kaiUPulse:'3000000',kind:'payment',description:'Acme refund',reserveDeltaUsdCents:'-1',settlementDeltaPhiMicro:'0'},
 {sequence:3,transactionId:'three',eventDigest:h,previousEventDigest:h,kaiUPulse:'4000000',kind:'payment',description:'Acme settlement',reserveDeltaUsdCents:'0',settlementDeltaPhiMicro:'2500000'},
 {sequence:4,transactionId:'four',eventDigest:h,previousEventDigest:h,kaiUPulse:'1000000',kind:'account',description:'Opened',reserveDeltaUsdCents:'0',settlementDeltaPhiMicro:'0'},
]};}
it('totals the whole source with integer arithmetic before paginating and keeps rails separate',()=>{
 const result=projectMoneyHistory(source(),{query:'Acme',limit:1});
 expect(result.matchedCount).toBe(3);expect(result.transactions.map(row=>row.transactionId)).toEqual(['three']);
 expect(result.totals).toEqual({reserveInUsdCents:'9007199254740993',reserveOutUsdCents:'1',settlementInPhiMicro:'2500000',settlementOutPhiMicro:'0'});
 expect(result.nextOffset).toBe(1);expect(result.coverage.transactionCount).toBe(4);
 expect(projectMoneyHistory(source(),{query:'Acme',offset:1,limit:1}).transactions[0].transactionId).toBe('two');
});
it('never treats a typed verified flag or a display statement as source admission',()=>{
 expect(()=>searchMoneyHistory({statement:source(),sourceDigest:h,writer:'owner.receiz.id'} as never,{keyId:h,artifactOwnerReceizId:'owner.receiz.id'},{})).toThrow('VERIFIED_SOURCE_REQUIRED');
});
it('keeps causal ordering separate from date filters and refuses ambiguous filters',()=>{
 expect(projectMoneyHistory(source(),{}).transactions.map(row=>row.transactionId)).toEqual(['three','two','one','four']);
 expect(()=>projectMoneyHistory(source(),{from:'yesterday'})).toThrow('QUERY_INVALID');
 expect(()=>projectMoneyHistory(source(),{limit:0})).toThrow('QUERY_INVALID');
 expect(()=>projectMoneyHistory(source(),{direction:'unknown'} as never)).toThrow('QUERY_INVALID');
 expect(projectMoneyHistory(source(),{direction:'out'}).transactions.map(row=>row.transactionId)).toEqual(['two']);
});
