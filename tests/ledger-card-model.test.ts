import {expect,it} from 'vitest';
import {indexLedgerValues,ledgerValueForRecord,ledgerValueLabel,readLedgerValueDisplay} from '../src/receiz/ledger-value';
import {ledgerValuationContext,ledgerCurrentAssetValue} from '../src/receiz/ledger-economy';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import type {MarketCapSource,MarketValueRow} from '../src/receiz/market-projection/source';
const at=(pulse:number)=>new Date(marketPulseTime(pulse)).toISOString(),hash='a'.repeat(64);
const copy={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:hash,sealedAt:at(100),birthUsdValue:10};
const group={sport:'baseball' as const,cardId:'card',rarity:'Common'};
const model={baseUsdValue:100,birthUsdValue:100,marketUsdValue:110,proofTotalValueUsd:100,scoreDelta:8,seed:hash};
const observation={at:at(200),usdValue:100,scope:'single-copy' as const,pricedCopies:1,vaultCopies:1,sourceHash:hash,group,...copy,model};
const row:MarketValueRow={id:`card:${hash}`,source:'sports-economy-card',...model,sportsGroup:group,sealedBirths:[copy],historyObservation:observation};
const source:MarketCapSource={schema:'receiz.proof_graph.market_cap_projection.v1',source:'market-desk-live-assets.sum + single-card-current-live-value-proof.sum',proofObjectHash:hash,generatedAt:at(200),firstIssuancePulse:0,serverPulse:300,currentUsd:120,cardsInCirculation:1,sportsCardsPriced:1,marketAssetsPriced:0,valueRows:[row]};
function transfer(pulse:number,fields:Record<string,unknown>={}){return parsePublicNetworkPage('actions',{ok:true,actions:[{id:'transfer',actionKind:'receiz.sports_arena.card_transfer',pulse,collectibleId:copy.collectibleId,claimHash:hash,considerationUsdCents:'100',...fields}]}).records[0];}
it('uses the existing copy-bound native market model at the exact transfer pulse',()=>{
 const index=indexLedgerValues(source);
 // Independent native chart replay golden: $56.8378 at pulse 150.
 const value=ledgerValueForRecord(transfer(150),index);
 expect(value).toEqual({basis:'card-model',amountUsdCents:'5684',pulse:'150',considerationUsdCents:'100'});
 expect(ledgerValueLabel(value)).toBe('Calculated transfer value');
 expect(readLedgerValueDisplay(value)).toEqual(value);
});
it('retains exact source snapshots ahead of a model and never uses payment consideration as card value',()=>{
 expect(ledgerValueForRecord(transfer(150,{cardValueUsdCents:'1234'}),indexLedgerValues(source))).toMatchObject({basis:'card-snapshot',amountUsdCents:'1234',considerationUsdCents:'100'});
});
it('reuses immutable event valuation across live ticks and receipt inspection',()=>{
 const index=indexLedgerValues(source),record=transfer(150),first=ledgerValueForRecord(record,index);
 expect(first.basis).toBe('card-model');
 expect(ledgerValueForRecord(record,{...index,evaluationPulse:400})).toBe(first);
 expect(ledgerValuationContext(record,index)).toMatchObject({calculationKind:'native-card-history-projection',evaluationPulse:'150',collectibleId:copy.collectibleId,claimHash:hash,sealedAt:copy.sealedAt,birthUsdValue:10,observation:{at:observation.at,sourceHash:hash,model},rounding:'Math.round(native historical USD × 100)'});
 const receipt=readReceiptLink(receiptLink(record,first,ledgerValuationContext(record,index))!);
 expect(receipt.value).toEqual(first);
 expect(receipt.valuation).toMatchObject({collectibleId:copy.collectibleId,claimHash:hash,observation:{at:observation.at,model}});
});
it('refuses foreign copy references even when they belong to the same market group',()=>{
 const other={...copy,collectibleId:'rsc_bbbbbbbbbbbbbbbb',claimHash:'b'.repeat(64)};
 const index=indexLedgerValues({...source,valueRows:[{...row,sealedBirths:[copy,other]}]});
 expect(ledgerValueForRecord(transfer(150,{collectibleId:other.collectibleId}),index)).toMatchObject({basis:'unavailable',amountUsdCents:null});
 expect(ledgerValueForRecord(transfer(150,{claimHash:other.claimHash}),index)).toMatchObject({basis:'unavailable',amountUsdCents:null});
 expect(ledgerCurrentAssetValue(transfer(150,{collectibleId:other.collectibleId,claimHash:other.claimHash}),index)).toBeNull();
});
it('does not hide a snapshot from a different event pulse behind a calculated value',()=>{
 expect(ledgerValueForRecord(transfer(150,{cardValueUsdCents:'1234',valuePulse:151}),indexLedgerValues(source))).toMatchObject({basis:'unavailable',amountUsdCents:null});
});
it('does not invent a per-copy quote from an aggregate group, or extrapolate outside supported history',()=>{
 const {collectibleId,claimHash,...rest}=observation;
 const aggregate={...row,historyObservation:{...rest,scope:'sports-group' as const,pricedCopies:2,vaultCopies:2}};
 expect(ledgerValueForRecord(transfer(150),indexLedgerValues({...source,valueRows:[aggregate]}))).toMatchObject({basis:'unavailable',amountUsdCents:null});
 for(const pulse of [99,201])expect(ledgerValueForRecord(transfer(pulse),indexLedgerValues(source))).toMatchObject({basis:'unavailable',amountUsdCents:null});
});
