import {expect,it,vi} from 'vitest';
import {indexLedgerValues,ledgerValueForRecord} from '../src/receiz/ledger-value';
import {ledgerCurrentAssetValue,ledgerValuationContext} from '../src/receiz/ledger-economy';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
import {publicSportsQuoteAtPulse} from '../src/receiz/market-projection/project';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import type {MarketCapSource,MarketValueRow} from '../src/receiz/market-projection/source';
import {enrichLedgerCardValuations} from '../src/receiz/ledger-card-enrichment';
import {mergePublicRecords} from '../src/receiz/public-network';
const hash='b'.repeat(64),at=(pulse:number)=>new Date(marketPulseTime(pulse)).toISOString();
const copy={collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:hash,sealedAt:at(100),birthUsdValue:10,proofValueUsd:100,currentValueUsd:101,valuationPulse:200,valuation:{baseUsdValue:100,birthUsdValue:10,marketUsdValue:110,scoreDelta:8,seed:`baseball:rsc_bbbbbbbbbbbbbbbb:${hash}:rsc_mlb_123`},valueHistory:[{at:at(100),usdValue:10,basis:'sealed-birth' as const},{at:at(200),usdValue:101,basis:'source-observation' as const}]};
const row:MarketValueRow={id:`card:${'a'.repeat(64)}`,source:'sports-economy-card',baseUsdValue:999,birthUsdValue:999,marketUsdValue:999,proofTotalValueUsd:5000,scoreDelta:4,seed:'a'.repeat(64),sportsGroup:{sport:'baseball',cardId:'card',rarity:'Rare'},sealedCopies:[copy]};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:'c'.repeat(64),generatedAt:at(300),firstIssuancePulse:0,serverPulse:300,currentUsd:999,cardsInCirculation:2,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row]};
const record=(pulse:number,fields:Record<string,unknown>={})=>parsePublicNetworkPage('actions',{ok:true,actions:[{id:'transfer-copy',actionKind:'receiz.sports_arena.card_transfer',pulse,collectibleId:copy.collectibleId,claimHash:copy.claimHash,...fields}]}).records[0];
it('uses the carried individual copy model even when its edition is an aggregate and it is not the representative',()=>{
 const index=indexLedgerValues(source);
 expect(ledgerValueForRecord(record(100),index)).toMatchObject({basis:'card-model',amountUsdCents:'1000'});
 expect(ledgerValueForRecord(record(200),index)).toMatchObject({basis:'card-model',amountUsdCents:'10100'});
 const current=ledgerCurrentAssetValue(record(150),index),expected=Math.round(publicSportsQuoteAtPulse({...row,...copy.valuation,proofTotalValueUsd:copy.valuation.baseUsdValue},300)*100);
 expect(current).toMatchObject({amountUsdCents:String(expected),pulse:'300'});
 expect(ledgerValueForRecord(record(250),index)).toMatchObject({basis:'card-model',amountUsdCents:String(Math.round(publicSportsQuoteAtPulse({...row,...copy.valuation,proofTotalValueUsd:copy.valuation.baseUsdValue},250)*100))});
});
it('keeps a copy calculation and its original operands intact in the full receipt without another request',()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No per-card requests'));
 try{
  const index=indexLedgerValues(source),event=record(150),value=ledgerValueForRecord(event,index),trace=ledgerValuationContext(event,index);
  expect(trace).toMatchObject({calculationKind:'native-copy-valuation-projection',sealedCopy:copy,evaluationPulse:'150'});
  const receipt=readReceiptLink(receiptLink(event,value,trace)!);expect(receipt.valuation).toMatchObject({sealedCopy:copy});
  expect(ledgerValueForRecord(event,{...index,evaluationPulse:400})).toBe(value);
  expect(ledgerValuationContext(event,{...index,evaluationPulse:400})).toBe(trace);expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
it('rejects a copy model whose seed or birth belongs to another object',()=>{
 for(const changed of [{...copy,valuation:{...copy.valuation,seed:'a'.repeat(64)}},{...copy,valuation:{...copy.valuation,birthUsdValue:11}}]){
  const index=indexLedgerValues({...source,valueRows:[{...row,sealedCopies:[changed]}]});
  expect(ledgerValueForRecord(record(150),index).amountUsdCents).toBeNull();expect(ledgerCurrentAssetValue(record(150),index)).toBeNull();
 }
});
it('preserves an earlier individual history model when a newer copy observation is appended',()=>{
 const oldModel={...copy.valuation,baseUsdValue:80,birthUsdValue:80,proofTotalValueUsd:80,seed:hash};
 const earlier={at:at(180),usdValue:80,scope:'single-copy' as const,pricedCopies:1,vaultCopies:1,sourceHash:'d'.repeat(64),group:row.sportsGroup,collectibleId:copy.collectibleId,claimHash:hash,model:oldModel};
 const legacy={...row,seed:hash,id:`card:${hash}`,sealedCopies:undefined,sealedBirths:[copy],historyObservation:earlier};
 const before=indexLedgerValues({...source,valueRows:[legacy]}),after=indexLedgerValues({...source,valueRows:[{...legacy,sealedCopies:[copy]}]}),event=record(150);
 expect(ledgerValueForRecord(event,after)).toEqual(ledgerValueForRecord(event,before));
 expect(ledgerValuationContext(event,after)?.calculationKind).toBe('native-card-history-projection');
});
it('uses exact earlier copy observations without projecting a newer model back across them',()=>{
 const observed={...copy,valueHistory:[copy.valueHistory[0],{at:at(160),usdValue:63,basis:'source-observation' as const,pulse:160},copy.valueHistory[1]]};
 const index=indexLedgerValues({...source,valueRows:[{...row,sealedCopies:[observed]}]});
 expect(ledgerValueForRecord(record(160),index)).toMatchObject({amountUsdCents:'6300'});
 expect(ledgerValueForRecord(record(150),index).amountUsdCents).toBeNull();
 expect(ledgerValueForRecord(record(190),index).amountUsdCents).toBeNull();
 expect(ledgerCurrentAssetValue(record(150),index)?.amountUsdCents).not.toBeNull();
});
it('replays a copy model carried with the transfer before any market projection is loaded',()=>{
 const event=record(150,{cardValuation:copy});
 expect(ledgerValueForRecord(event)).toMatchObject({basis:'card-model',pulse:'150'});
 expect(ledgerValueForRecord(event).amountUsdCents).not.toBeNull();
 expect(ledgerValuationContext(event,null)).toMatchObject({calculationKind:'native-copy-valuation-projection',sealedCopy:copy,evaluationPulse:'150'});
 const empty=indexLedgerValues({...source,valueRows:[]});
 expect(ledgerCurrentAssetValue(event,empty)).toMatchObject({basis:'live-model',pulse:'300'});
 const link=receiptLink(event,ledgerValueForRecord(event),ledgerValuationContext(event,null))!;
 expect(readReceiptLink(link).valuation).toMatchObject({sealedCopy:copy});
 for(const fields of [{collectibleId:'rsc_cccccccccccccccc'},{claimHash:'c'.repeat(64)}])expect(ledgerValueForRecord(record(150,{cardValuation:copy,...fields})).amountUsdCents).toBeNull();
});
it('enriches public transfer display operands without changing event evidence and survives a thin repeat',()=>{
 const event=record(150,{entryHash:'e'.repeat(64)}),capture={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{sealedCopies:[{...copy,ownerUserId:'private-owner',ownerUsername:'public-user',credential:'must not enter a receipt'}]}]};
 const [enriched]=enrichLedgerCardValuations([event],capture),{cardValuation,...operands}=enriched.valueOperands!;
 expect({...enriched,valueOperands:operands}).toEqual(event);expect(cardValuation).toEqual(copy);
 const thin=mergePublicRecords([enriched],[event])[0];expect(thin.valueOperands?.cardValuation).toEqual(copy);
 expect(ledgerValueForRecord(thin).basis).toBe('card-model');
 expect(()=>enrichLedgerCardValuations([event],{...capture,fallback:true})).toThrow('complete native public');
 expect(enrichLedgerCardValuations([record(150,{claimHash:'c'.repeat(64)})],capture)[0].valueOperands?.cardValuation).toBeUndefined();
});
it('uses the exact carried claim to disambiguate two originals sharing a collectible ID',()=>{
 const other={...copy,claimHash:'c'.repeat(64),valuation:{...copy.valuation,seed:`baseball:${copy.collectibleId}:${'c'.repeat(64)}:rsc_mlb_123`}};
 const index=indexLedgerValues({...source,valueRows:[{...row,sealedCopies:[copy,other]}]});
 expect(ledgerValueForRecord(record(150),index).basis).toBe('card-model');
 const capture={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{sealedCopies:[copy,other]}]};
 expect(enrichLedgerCardValuations([record(150)],capture)[0].valueOperands?.cardValuation?.claimHash).toBe(hash);
 expect(ledgerValueForRecord(record(150,{claimHash:undefined}),index).amountUsdCents).toBeNull();
});
it('keeps the carried event model while adopting a later bound native model for current value',()=>{
 const event=record(150,{cardValuation:copy}),previous=ledgerValueForRecord(event);
 const next={...copy,proofValueUsd:200,currentValueUsd:201,valuationPulse:250,valuation:{...copy.valuation,baseUsdValue:200,marketUsdValue:210},valueHistory:[copy.valueHistory[0],{at:at(250),usdValue:201,basis:'source-observation' as const}]};
 const index=indexLedgerValues({...source,valueRows:[{...row,sealedCopies:[next]}]});
 expect(ledgerValueForRecord(event,index)).toEqual(previous);
 const current=ledgerCurrentAssetValue(event,index),expected=Math.round(publicSportsQuoteAtPulse({...row,...next.valuation,proofTotalValueUsd:next.valuation.baseUsdValue},300)*100);
 expect(current).toMatchObject({basis:'live-model',amountUsdCents:String(expected),pulse:'300'});
});
