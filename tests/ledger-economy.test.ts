import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {indexLedgerValues,ledgerValueForRecord} from '../src/receiz/ledger-value';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {indexLedgerRelations,ledgerRelatedRecords,ledgerValuationContext,ledgerCurrentAssetValue} from '../src/receiz/ledger-economy';
it('follows exact chain and object references without linking unrelated activity by actor or amount',()=>{
 const records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'first',objectId:'one',entryHash:'a'.repeat(64),amountUsdCents:'100'},{id:'second',objectId:'one',prevHash:'a'.repeat(64),entryHash:'b'.repeat(64)},{id:'other',objectId:'two',amountUsdCents:'100'}]}).records;
 const second=records.find(r=>r.sourceId==='second')!,related=ledgerRelatedRecords(second,indexLedgerRelations(records));
 expect(related.map(r=>[r.record.sourceId,r.relation])).toEqual([['first','Previous entry']]);
});
it('reproduces current proof value separately from an earlier event and exposes the pinned model operands',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'))),index=indexLedgerValues(source),asset=source.valueRows[0];
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'event',actionKind:'proof_transfer',pulse:12000000,assetId:asset.seed,amountUsdCents:'100'}]}).records[0];
 expect(ledgerValueForRecord(record,index).amountUsdCents).toBe('1160227');
 expect(ledgerCurrentAssetValue(record,index)?.amountUsdCents).toBe('1477588');
 expect(ledgerValuationContext(record,index)).toMatchObject({sdk:'129.0.0',projectionDigest:source.proofObjectHash,seed:{claimPulse:asset.marketItem!.livePulseSeed!.claimPulse},quote:{referenceUsd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0},rounding:'Math.round(valuePhi × usdPerPhi × 100)'});
});
it('does not fabricate a current asset value from a payment or an unrelated quote',()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'payment',kind:'chat_transfer',amountUsdCents:'100'}]}).records[0];
 expect(ledgerCurrentAssetValue(row,null)).toBeNull();expect(ledgerValuationContext(row,null)).toBeNull();
});
it('keeps a carried event snapshot trace at its event coordinate rather than attaching current model calculations',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'))),index=indexLedgerValues(source);
 const row=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'snapshot',actionKind:'proof_transfer',pulse:12000000,assetId:source.valueRows[0].seed,cardValueUsdCents:'9900'}]}).records[0];
 expect(ledgerValuationContext(row,index)).toMatchObject({calculationKind:'carried-card-snapshot',evaluationPulse:'12000000',cardValueUsdCents:'9900'});
 expect(ledgerValuationContext(row,index)).not.toHaveProperty('intrinsicFunction');
});
