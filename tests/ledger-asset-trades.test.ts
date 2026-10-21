import {expect,it} from 'vitest';
import {parsePublicNetworkPage,mergePublicRecords} from '../src/receiz/public-network';
import type {ReceizIdentityAccountProjection} from '@receiz/sdk';
import {projectPersonalHistory} from '../src/receiz/personal-history';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
import {activityCategory,receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
import {ledgerAssetTrade,ledgerTradeReturn} from '../src/receiz/ledger-asset-trade';

it('puts both recorded Market actions under Transactions and retains the paid amount and shares',()=>{
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'buy',actionKind:'market.share.buy',assetTrade:{side:'buy',title:'A song',marketItemId:'profile:artist:song',shareQuantityMicro:'2500000',priceUsdCents:'4000',settlementUsdCents:'10100',feeUsdCents:'100'}},{id:'sell',actionKind:'market.share.sell',assetTrade:{side:'sell',title:'A song',shareQuantityMicro:'1250000',settlementUsdCents:'6000'}}]}).records;
 expect(records.map(activityCategory)).toEqual(['transactions','transactions']);
 expect(ledgerValueForRecord(records[0])).toMatchObject({basis:'payment',amountUsdCents:'10100'});
 expect(ledgerAssetTrade(records[0])).toMatchObject({title:'A song',shareQuantityMicro:'2500000',priceUsdCents:'4000'});
 expect(readReceiptLink(receiptLink(records[0])!).details?.assetTrade).toMatchObject({shareQuantityMicro:'2500000',settlementUsdCents:'10100'});
});
it('uses the recorded sale proceeds and disposed cost basis for a realized return',()=>{
 const record=parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events:[{id:'sale',kind:'wallet_ledger_entry',ledgerEntryKind:'market_sell',direction:'credit',amountUsdCents:'9000',assetTrade:{side:'sell',title:'An image',shareQuantityMicro:'3000000',priceUsdCents:'3100',settlementUsdCents:'9000',feeUsdCents:'300',realizedCostBasisUsdCents:'12000'}}]},'me').records[0];
 expect(ledgerTradeReturn(ledgerAssetTrade(record)!)).toEqual({amountUsdCents:'-3000',percent:'−25.00%',direction:'down'});
 expect(ledgerValueForRecord(record).amountUsdCents).toBe('9000');
});
it('keeps zero-cost and absent cost basis distinct and never invents a percent',()=>{
 const row=(cost?:string)=>parsePublicNetworkPage('actions',{ok:true,actions:[{id:'sale',actionKind:'market.share.sell',assetTrade:{side:'sell',settlementUsdCents:'2500',...(cost!==undefined?{realizedCostBasisUsdCents:cost}:{})}}]}).records[0];
 expect(ledgerTradeReturn(ledgerAssetTrade(row())!)).toBeNull();
 expect(ledgerTradeReturn(ledgerAssetTrade(row('0'))!)).toEqual({amountUsdCents:'2500',percent:null,direction:'up'});
 expect(ledgerTradeReturn(ledgerAssetTrade(row('2000'))!)).toEqual({amountUsdCents:'500',percent:'+25.00%',direction:'up'});
});
it('does not accept a contradictory side, amount or arbitrary private fields as trade details',()=>{
 const row=(assetTrade:unknown)=>parsePublicNetworkPage('actions',{ok:true,actions:[{id:'buy',actionKind:'market.share.buy',amountUsdCents:'100',assetTrade}]}).records[0];
 expect(ledgerAssetTrade(row({side:'sell',settlementUsdCents:'100'}))).toBeNull();
 expect(ledgerAssetTrade(row({side:'buy',settlementUsdCents:'200'}))).toBeNull();
 const record=row({side:'buy',settlementUsdCents:'100',shareQuantityMicro:'1000000',privateKey:'secret',walletBalancePhiMicro:'12345'});
 expect(JSON.stringify(record.details)).not.toContain('secret');
 expect(record.details?.assetTrade).not.toHaveProperty('walletBalancePhiMicro');
 expect(ledgerAssetTrade(row({side:'buy',shareQuantityMicro:'1e9'}))?.shareQuantityMicro).toBeUndefined();
});
it('shows the same exact sale facts from identity-carried legacy Wallet metadata',()=>{
 const projection={authority:'verified-identity-portable-state',portableStateVerified:true,owner:{uid:'me'},completeAtSealedHead:true,verifiedState:{account:{userId:'me'},wallet:{ledgerEntries:[{id:'sale',user_id:'me',entry_kind:'market_sell',direction:'credit',amount_usd_cents:'12500',metadata:{side:'sell',title:'Carried original',shareQuantityMicro:2500000,priceUsdCents:'5000',settlementUsdCents:'12500',realizedCostBasisUsdCents:'10000'}}]}}} as unknown as ReceizIdentityAccountProjection;
 const record=projectPersonalHistory(projection).records[0];
 expect(ledgerAssetTrade(record)).toMatchObject({title:'Carried original',shareQuantityMicro:'2500000'});
 expect(ledgerTradeReturn(ledgerAssetTrade(record)!)).toEqual({amountUsdCents:'2500',percent:'+25.00%',direction:'up'});
});
it('retains compatible known trade facts through a thin projection and refuses contradictory facts',()=>{
 const page=(value:object)=>parsePublicNetworkPage('actions',{ok:true,actions:[{id:'sale',actionKind:'market.share.sell',entryHash:'a'.repeat(64),...value}]}).records;
 const known=page({assetTrade:{side:'sell',title:'An original',shareQuantityMicro:'1000000',settlementUsdCents:'12500',realizedCostBasisUsdCents:'10000'}});
 const retained=mergePublicRecords(known,page({}))[0];
 expect(ledgerTradeReturn(ledgerAssetTrade(retained)!)).toMatchObject({amountUsdCents:'2500',percent:'+25.00%'});
 expect(ledgerValueForRecord(retained).amountUsdCents).toBe('12500');
 expect(()=>mergePublicRecords(known,page({assetTrade:{side:'sell',settlementUsdCents:'13000'}}))).toThrow(/conflict/i);
 expect(()=>mergePublicRecords(known,page({amountUsdCents:'9000'}))).toThrow(/conflict/i);
 const rootAmount=page({amountUsdCents:'9000',assetTrade:{side:'sell',title:'An original',realizedCostBasisUsdCents:'10000'}});
 expect(()=>mergePublicRecords(rootAmount,page({assetTrade:{side:'sell',settlementUsdCents:'8000'}}))).toThrow(/conflict/i);
});
