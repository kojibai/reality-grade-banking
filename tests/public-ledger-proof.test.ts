import {describe,it,expect,vi} from 'vitest';
import {inspectPublicLedgerFile,heldPublicLedgerFile} from '../src/receiz/public-ledger-proof';
import {publicLedgerContinuation,inspectPublicLedgerStatement} from '../src/receiz/public-ledger-statement';
const h=(v:string)=>v.repeat(64);
const snapshot=()=>inspectPublicLedgerStatement({schema:'receiz.public-action-ledger.v1',domain:'receiz.public-action-ledger.root-signature.v1',issuerRootKid:'test-only',ledgerId:h('a'),scope:'public-action-history',baseline:'native',financialAdmission:false,sourceBaseline:h('b'),sourceHead:h('c'),sourceHistory:[h('b'),h('c')],kaiUpulse:'123',recordsRoot:h('d'),records:[{id:'event-1',sequence:1,kind:'auth.logout',kaiUpulse:'100',entryHash:h('e'),previousHash:h('f'),amountUsdCents:null}],rootSignature:{kid:'test-only',alg:'Ed25519',sig:'a'.repeat(86)}});
describe('public Ledger verification boundaries',()=>{
 it('refuses unsigned JSON, fake flags and forged held reviews without network',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
  try{await expect(inspectPublicLedgerFile({bytes:new TextEncoder().encode(JSON.stringify({...snapshot(),verified:true})),filename:'ledger.json'})).rejects.toThrow();
   expect(()=>heldPublicLedgerFile({kind:'ledger'} as never)).toThrow(/CUSTODY/);expect(fetch).not.toHaveBeenCalled();
  }finally{fetch.mockRestore();}
 });
 it('preserves the complete prefix and refuses pruning, foreign sources and changed settled records',()=>{
  const old=snapshot(),next={...old,sourceHead:h('1'),sourceHistory:[...old.sourceHistory,h('1')],kaiUpulse:'124'};
  expect(publicLedgerContinuation(old,next)).toBe('extends');expect(publicLedgerContinuation(next,old)).toBe('older');expect(publicLedgerContinuation(old,old)).toBe('same');
  expect(()=>publicLedgerContinuation(old,{...next,records:[]})).toThrow(/CONFLICT/);
  expect(()=>publicLedgerContinuation(old,{...next,ledgerId:h('2')})).toThrow(/IDENTITY/);
  expect(()=>publicLedgerContinuation(old,{...next,records:[{...old.records[0],kind:'fabricated.kind'}]})).toThrow(/CONFLICT/);
  expect(()=>publicLedgerContinuation(old,{...old,sourceHistory:[h('b'),h('3')]})).toThrow(/CONFLICT/);
 });
});
