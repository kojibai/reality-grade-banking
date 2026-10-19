import {expect,it,vi} from 'vitest';
import {calculateWalletFundingAttributions,readWalletFundingAttribution} from '../src/receiz/ledger-wallet-fifo';
const row=(id:string,direction:'credit'|'debit',amount:string,day:number,metadata:Record<string,unknown>={})=>({id,user_id:'owner',direction,entry_kind:'test',amount_usd_cents:amount,amount_phi_micro:'0',created_at:`2026-05-${String(day).padStart(2,'0')}T00:00:00Z`,kai_upulse:String(day*1000000),metadata});
it('attributes both rails in exact cent FIFO order and preserves their different source objects',()=>{
 const rows=[row('proof-one','credit','1000',1,{source:'sigil_upload_claim',contentHash:'a'.repeat(64)}),row('proof-two','credit','500',2,{source:'market_trade',marketItemId:'profile:owner:proof-two'}),row('deposit','credit','200',3,{source:'stripe_checkout_wallet_deposit'}),row('earlier','debit','100',4,{settledUsdCents:'100'}),row('payment','debit','1300',5,{settledUsdCents:'100',phiUsdCents:'1200'})];
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const result=calculateWalletFundingAttributions(rows,'owner',true).get('payment')!;
 expect(result.parts.map(part=>[part.rail,part.amountUsdCents])).toEqual([['reserve','100'],['settlement','1200']]);
 expect(result.parts[0].sources).toMatchObject([{sourceId:'deposit',amountUsdCents:'100',offsetUsdCents:'100',source:'stripe_checkout_wallet_deposit'}]);
 expect(result.parts[1].sources).toMatchObject([{sourceId:'proof-one',amountUsdCents:'1000',contentHash:'a'.repeat(64)},{sourceId:'proof-two',amountUsdCents:'200',marketItemId:'profile:owner:proof-two'}]);
 expect(readWalletFundingAttribution(result)).toEqual(result);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('never attributes future credits, reuses spent cents, or accepts a partial/foreign source',()=>{
 const rows=[row('origin','credit','100',1),row('first','debit','80',2),row('second','debit','30',3),row('future','credit','100',4)];
 expect(calculateWalletFundingAttributions(rows,'owner',true).get('first')?.parts[0].sources[0].amountUsdCents).toBe('80');
 expect(calculateWalletFundingAttributions(rows,'owner',true).has('second')).toBe(false);
 expect(calculateWalletFundingAttributions(rows,'owner',false).size).toBe(0);
 expect(calculateWalletFundingAttributions([...rows,{...rows[0],id:'foreign',user_id:'other'}],'owner',true).size).toBe(0);
 const deficit=[row('credit','credit','100',1),row('uncovered','debit','120',2),row('new-credit','credit','100',3),row('after','debit','50',4)];
 expect(calculateWalletFundingAttributions(deficit,'owner',true).get('after')?.parts[0].sources).toMatchObject([{sourceId:'new-credit',offsetUsdCents:'20',amountUsdCents:'50'}]);
});
it('retains only curated source evidence and refuses an altered allocation total',()=>{
 const result=calculateWalletFundingAttributions([row('credit','credit','900719925474099300',1,{source:'market_trade',marketItemId:'profile:owner:proof',noteToken:'SECRET'}),row('debit','debit','900719925474099201',2)],'owner',true).get('debit')!;
 expect(result.parts[0].sources[0].amountUsdCents).toBe('900719925474099201');expect(JSON.stringify(result)).not.toContain('SECRET');
 expect(readWalletFundingAttribution({...result,amountUsdCents:'1'})).toBeUndefined();
 expect(readWalletFundingAttribution({...result,parts:[{...result.parts[0],sources:[...result.parts[0].sources,...result.parts[0].sources]}]})).toBeUndefined();
});
it('follows the native Phi intervals when old credit dollar quotes cannot cover present Settlement value',()=>{
 const credits=[{...row('first','credit','10',1,{source:'market_trade',marketItemId:'proof-one'}),amount_phi_micro:'30'},{...row('second','credit','10',2,{source:'market_trade',marketItemId:'proof-two'}),amount_phi_micro:'70'}];
 const debit={...row('send','debit','101',3),amount_phi_micro:'50'};
 const value=calculateWalletFundingAttributions([...credits,debit],'owner',true).get('send')!;
 expect(value.rule).toBe('receiz-card-fifo-source-units');expect(value.parts[0].sources).toMatchObject([{sourceId:'first',amountPhiMicro:'30',amountUsdCents:'60',allocationUnit:'phi-micro'},{sourceId:'second',amountPhiMicro:'20',amountUsdCents:'41',offsetPhiMicro:'0'}]);
 expect(readWalletFundingAttribution(value)).toEqual(value);
 expect(readWalletFundingAttribution({...value,parts:[{...value.parts[0],sources:[{...value.parts[0].sources[0],amountPhiMicro:'31'},value.parts[0].sources[1]]}]})).toBeUndefined();
});
it('keeps Settlement Phi attribution within Settlement credits across earlier Reserve spending',()=>{
 const value=calculateWalletFundingAttributions([{...row('reserve','credit','100',1,{source:'stripe_checkout_wallet_deposit'}),amount_phi_micro:'10'},{...row('proof','credit','100',2,{source:'market_trade',marketItemId:'proof'}),amount_phi_micro:'10'},{...row('reserve-spend','debit','100',3,{settledUsdCents:'100'}),amount_phi_micro:'10'},{...row('settlement-spend','debit','100',4,{settledUsdCents:'0'}),amount_phi_micro:'10'}],'owner',true).get('settlement-spend')!;
 expect(value.parts[0].sources).toMatchObject([{sourceId:'proof',amountPhiMicro:'10',amountUsdCents:'100'}]);
});
it('keeps mixed funding sources in their own rails despite different original Phi quotes',()=>{
 const value=calculateWalletFundingAttributions([{...row('reserve','credit','100',1,{source:'stripe_checkout_wallet_deposit'}),amount_phi_micro:'200'},{...row('proof','credit','100',2,{source:'market_trade',marketItemId:'proof'}),amount_phi_micro:'100'},{...row('send','debit','150',3,{settledUsdCents:'100'}),amount_phi_micro:'150'}],'owner',true).get('send')!;
 expect(value.parts.map(part=>[part.rail,part.sources.map(source=>source.sourceId)])).toEqual([['reserve',['reserve']],['settlement',['proof']]]);
 expect(value.parts[1].sources[0]).toMatchObject({amountPhiMicro:'50',amountUsdCents:'50'});
});
it('never substitutes historical dollar coverage for an uncovered positive Settlement Phi interval',()=>{
 const rows=[{...row('credit','credit','100',1),amount_phi_micro:'1'},{...row('debit','debit','50',2),amount_phi_micro:'2'}];
 expect(calculateWalletFundingAttributions(rows,'owner',true).has('debit')).toBe(false);
});
it('preserves microsecond chronology for FIFO and every source cutoff even without Kai coordinates',()=>{
 const credit={...row('a','credit','100',1),created_at:'2026-05-01T00:00:00.000002Z',kai_upulse:undefined};
 const debit={...row('z','debit','50',1),created_at:'2026-05-01T00:00:00.000001Z',kai_upulse:undefined};
 expect(calculateWalletFundingAttributions([credit,debit],'owner',true).has('z')).toBe(false);
 const valid=calculateWalletFundingAttributions([{...credit,id:'z',created_at:debit.created_at},{...debit,id:'a',created_at:credit.created_at}],'owner',true).get('a')!;
 expect(valid.parts[0].sources[0].sourceId).toBe('z');
 expect(readWalletFundingAttribution({...valid,occurredAt:debit.created_at,parts:[{...valid.parts[0],sources:[{...valid.parts[0].sources[0],occurredAt:credit.created_at}]}]})).toBeUndefined();
});
