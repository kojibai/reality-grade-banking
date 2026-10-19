import {expect,it,vi} from 'vitest';
import {reconstructWalletProofCohort,readWalletProofCohorts} from '../src/receiz/ledger-wallet-cohorts';
const original=(id:string,pulse='100',anchor='1234abcd')=>({id,createdAt:'2026-03-01T00:00:00Z',slug:'moment',code:id,verifyPath:`/v/moment/${id}/${pulse}?a=${anchor}`,title:`Original ${id}`});
const seed=()=>({creditId:'credit',computedAt:'2026-03-06T17:25:00Z',scanned:2,amountPhiMicro:'1000',owned:[original('owned')],received:[{sourceId:'receipt',firstSeenAt:'2026-03-02T00:00:00Z',slug:'moment',code:'received',pulse:'101',anchorId:'8765abcd',canonical:[original('received','101','8765abcd')]}]});
it('replays the legacy owned-and-received membership rule using exact anchors, not nullable database pulse columns',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const result=reconstructWalletProofCohort(seed())!;expect(result.members.map(member=>member.objectId)).toEqual(['owned','received']);expect(result.members[1]).toMatchObject({basis:'received',receivedSourceId:'receipt',pulse:'101',anchorId:'8765abcd'});expect(readWalletProofCohorts([result])).toEqual([result]);expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('rejects a mismatched count, future membership, ambiguous originals and cross-anchor substitution',()=>{
 const value=seed();expect(reconstructWalletProofCohort({...value,scanned:3})).toBeUndefined();
 expect(reconstructWalletProofCohort({...value,received:[{...value.received[0],firstSeenAt:'2026-03-07T00:00:00Z'}]})).toBeUndefined();
 expect(reconstructWalletProofCohort({...value,received:[{...value.received[0],canonical:[...value.received[0].canonical,{...original('received','101','8765abcd'),id:'other'}]}]})).toBeUndefined();
 expect(reconstructWalletProofCohort({...value,received:[{...value.received[0],anchorId:'00000000'}]})).toBeUndefined();
});
it('deduplicates an owned original before its received reference and curates public evidence only',()=>{
 const value=seed();value.received[0]={...value.received[0],code:'owned',pulse:'100',anchorId:'1234abcd',canonical:[Object.assign(original('owned'),{secret:'do not carry'})]};
 const result=reconstructWalletProofCohort({...value,scanned:1})!;expect(result.members).toHaveLength(1);expect(result.members[0].basis).toBe('owned');expect(JSON.stringify(result)).not.toContain('secret');
 expect(readWalletProofCohorts([{...result,members:[{...result.members[0],verifyUrl:'https://example.com/private'}]}])).toBeUndefined();
});
it('retains a legacy original locator without manufacturing a Kai pulse from its upload date',()=>{
 const value=seed(),legacy={...original('legacy'),verifyPath:'/v/moment/legacy'};
 const result=reconstructWalletProofCohort({...value,scanned:1,owned:[legacy],received:[]})!;
 expect(result.members[0].verifyUrl).toBe('https://receiz.com/v/moment/legacy');expect(result.members[0].pulse).toBeUndefined();
});
