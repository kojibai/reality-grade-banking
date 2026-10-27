import {expect,it} from 'vitest';
import {readBalanceOriginalProofReferences,readReserveFundingSource,balanceProofHref} from '../src/receiz/balance-source-references';
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
it('enriches only an exact Original source and never borrows a receipt across source hashes or omitted cohort IDs',()=>{
 const refs=readBalanceOriginalProofReferences({A:{sourceSha256:a,pbiReceiptHash:b,verifyPath:'/v/original'}})!;
 expect(balanceProofHref(refs.A)).toBe('https://receiz.com/v/original');
 expect(readBalanceOriginalProofReferences({A:{sourceSha256:a}})).toEqual(refs);
 expect(readBalanceOriginalProofReferences({A:{sourceSha256:c}})).toEqual({});
 expect(readBalanceOriginalProofReferences({B:{sourceSha256:c,pbiReceiptHash:b}})).not.toHaveProperty('A');
 expect(balanceProofHref({...refs.A,verifyUrl:'javascript:alert(1)'})).toBeNull();
});
it('reconciles original mixed-rate credits/debits, whitelists owner proof IDs and retains richer records only beneath the same financial head',()=>{
 const input={accountId:'owner',sourceSha256:a,reservePhiMicro:'1900000',recordedReserveUsdCents:'1400',displayedReserveUsdCents:'1300',complete:true,displayCap:{accountBalancePhiMicro:'2000000',accountBalanceUsdCents:'1300',usdPerPhiMicrocents:'650000000',secret:'excluded'},movements:[{ledgerId:'credit-A',direction:'credit',kind:'card-funded',kaiUpulse:'1',amountPhiMicro:'1000000',amountUsdCents:'1000',usdPerPhiMicrocents:'1000000000',sourceArtifactSha256:b,receipt:{acceptedInputSha256:c,checkoutSessionId:'checkout-A',paymentIntentId:'payment-A',secret:'excluded'}},{ledgerId:'credit-B',direction:'credit',kind:'note-deposited',kaiUpulse:'2',amountPhiMicro:'1000000',amountUsdCents:'500',sourceArtifactSha256:c},{ledgerId:'debit',direction:'debit',kind:'note-funded',kaiUpulse:'3',amountPhiMicro:'100000',amountUsdCents:'100',sourceArtifactSha256:b}],privateKey:'excluded'};
 const source=readReserveFundingSource(input,'owner','1300')!;expect(source).toBeDefined();expect(source.movements[0].usdPerPhiMicrocents).toBe('1000000000');expect(source.movements[1].usdPerPhiMicrocents).toBeUndefined();expect(JSON.stringify(source)).not.toContain('secret');expect(JSON.stringify(source)).not.toContain('privateKey');
 expect(readReserveFundingSource({...input,movements:input.movements.map((row,index)=>index===0?{...row,usdPerPhiMicrocents:'999'}:row)},'owner','1300')!.movements[0].usdPerPhiMicrocents).toBe('1000000000');
expect(readReserveFundingSource({...input,movements:[...input.movements].reverse()},'owner','1300')!.movements).toEqual(source.movements);
 const weaker=readReserveFundingSource({...input,complete:false,movements:[]},'owner','1300')!;expect(weaker.movements).toEqual(source.movements);expect(JSON.stringify(weaker)).not.toContain('secret');
 expect(readReserveFundingSource({...input,sourceSha256:c,movements:[]},'owner','1300')).toBeUndefined();
 expect(readReserveFundingSource(input,'foreign','1300')).toBeUndefined();
 expect(readReserveFundingSource(input,'owner','1299')).toBeUndefined();
 expect(readReserveFundingSource({...input,displayCap:{...input.displayCap,accountBalanceUsdCents:'1200'}},'owner','1300')).toBeUndefined();
});
it('cannot rewrite accepted receipt facts beneath an unchanged enclosing source or financial head',()=>{
 const source='d'.repeat(64),old='e'.repeat(64),changed='f'.repeat(64);
 const first=readBalanceOriginalProofReferences({immutable:{sourceSha256:source,pbiReceiptHash:old}})!;
 expect(readBalanceOriginalProofReferences({immutable:{sourceSha256:source,pbiReceiptHash:changed}})).toEqual(first);
 const input={accountId:'immutable-owner',sourceSha256:source,reservePhiMicro:'1',recordedReserveUsdCents:'1',displayedReserveUsdCents:'1',complete:true,displayCap:{accountBalancePhiMicro:'1',accountBalanceUsdCents:'1',usdPerPhiMicrocents:'1'},movements:[{ledgerId:'immutable-event',direction:'credit',kind:'funded',kaiUpulse:'1',amountPhiMicro:'1',amountUsdCents:'1',sourceArtifactSha256:old,receipt:{acceptedInputSha256:old,checkoutSessionId:null,paymentIntentId:null}}]};
 const known=readReserveFundingSource(input,'immutable-owner','1')!;
 expect(readReserveFundingSource({...input,movements:[{...input.movements[0],sourceArtifactSha256:changed,receipt:{...input.movements[0].receipt,acceptedInputSha256:changed}}]},'immutable-owner','1')).toEqual(known);
 expect(readReserveFundingSource({...input,sourceSha256:changed,movements:[{...input.movements[0],sourceArtifactSha256:null,receipt:undefined}]},'immutable-owner','1')?.complete).toBe(false);
});
it('retains immutable source records while updating the same co-bound current display cap on a weaker record list',()=>{
 const input={accountId:'cap-owner',sourceSha256:'1'.repeat(64),reservePhiMicro:'3',recordedReserveUsdCents:'3',displayedReserveUsdCents:'1',complete:true,displayCap:{accountBalancePhiMicro:'3',accountBalanceUsdCents:'1',usdPerPhiMicrocents:'1'},movements:[{ledgerId:'held',direction:'credit',kind:'funded',kaiUpulse:'1',amountPhiMicro:'3',amountUsdCents:'3',sourceArtifactSha256:'2'.repeat(64)}]};
 const held=readReserveFundingSource(input,'cap-owner','1')!,next=readReserveFundingSource({...input,displayedReserveUsdCents:'2',displayCap:{...input.displayCap,accountBalanceUsdCents:'2'},movements:[{...input.movements[0],ledgerId:'conflicting-weaker-id'}]},'cap-owner','2')!;
 expect(next.movements).toEqual(held.movements);expect(next.displayedReserveUsdCents).toBe('2');expect(next.displayCap.accountBalanceUsdCents).toBe('2');
 expect(readReserveFundingSource({...input,reservePhiMicro:'0',recordedReserveUsdCents:'0',displayedReserveUsdCents:'0',movements:[]},'cap-owner','0')).toBeUndefined();
});
it.each(['zero','positive'])('retains %s Reserve net-zero funding history omitted by a weaker same-head payload',mode=>{
 const row={kind:'funded',kaiUpulse:'1',amountPhiMicro:'1',amountUsdCents:'1',sourceArtifactSha256:'4'.repeat(64)},movements=[{...row,ledgerId:'net-credit',direction:'credit'},{...row,ledgerId:'net-debit',direction:'debit'},...(mode==='positive'?[{...row,ledgerId:'remaining-credit',direction:'credit'}]:[])],total=mode==='positive'?'1':'0',input={accountId:`net-${mode}`,sourceSha256:'5'.repeat(64),reservePhiMicro:total,recordedReserveUsdCents:total,displayedReserveUsdCents:total,complete:true,displayCap:{accountBalancePhiMicro:total,accountBalanceUsdCents:total,usdPerPhiMicrocents:'1'},movements};
 const held=readReserveFundingSource(input,input.accountId,total)!,next=readReserveFundingSource({...input,movements:movements.filter(row=>row.ledgerId==='remaining-credit')},input.accountId,total)!;expect(next.movements).toEqual(held.movements);expect(next.complete).toBe(true);
});
