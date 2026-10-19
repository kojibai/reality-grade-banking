import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it,vi } from 'vitest';
import { ledgerValueForRecord,indexLedgerValues } from '../src/receiz/ledger-value';
import { parsePublicNetworkCache } from '../src/receiz/public-network-cache';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {ledgerCurrentAssetValue} from '../src/receiz/ledger-economy';

it('ships the exact recorded card values and carried transfer coordinates without substituting consideration', () => {
  const bytes = gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin'));
  expect(bytes.length).toBeLessThanOrEqual(32 * 1024 * 1024);
  const cache = parsePublicNetworkCache(JSON.parse(bytes.toString('utf8')));
  expect(cache.inspectionVersion).toBe(4);
  const transfers = cache.records.filter(row => row.source === 'actions' && row.kind === 'receiz.sports_arena.card_transfer');
  expect(transfers).toHaveLength(193);
  const valued = transfers.filter(row => row.valueOperands?.cardValueUsdCents !== undefined);
  expect(valued).toHaveLength(41);
  for (const row of valued) {
    expect(row.evidence.entryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.valueOperands?.collectibleId).toBe(row.evidence.objectId);
    expect(row.valueOperands?.claimHash).toBe(row.evidence.claimHash);
    expect(ledgerValueForRecord(row)).toMatchObject({
      basis: 'card-snapshot', amountUsdCents: row.valueOperands!.cardValueUsdCents, pulse: row.pulse,
    });
  }
  const example = valued.find(row => row.sourceId === '1a4bae9c-53a4-4bd4-ae30-4b80f2999931')!;
  expect(example.evidence.entryHash).toBe('a9782a1b52188c5a5351273df0135a9fce03b016c72465463713cc60de6722aa');
  expect(ledgerValueForRecord(example)).toMatchObject({ amountUsdCents: '1951', pulse: '14022229' });
  const carried = cache.records.filter(row => row.source === 'graph' && row.kind === 'card-transfer');
  expect(carried).toHaveLength(59);
  for (const row of carried) {
    expect(row.valueOperands?.collectibleId).toBeTruthy();
    expect(row.valueOperands?.claimHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.pulse).toMatch(/^\d+$/);
    expect(row.time).toBeTruthy();
    if (row.kaiUpulse) expect(row.pulse).toBe(String(BigInt(row.kaiUpulse) / 1_000_000n));
    expect(ledgerValueForRecord(row).basis).toBe('card-model');
    expect(ledgerValueForRecord(row).amountUsdCents).not.toBeNull();
  }
});
it('recovers existing individual models without fetching or turning group quotes into transfer snapshots',()=>{
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString('utf8')));
 const source=parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8')));
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No requests belong in transaction valuation'));
 try{
  const index=indexLedgerValues(source),rows=cache.records.filter(row=>/card[._-]transfer/i.test(row.kind));
  const values=rows.map(row=>ledgerValueForRecord(row,index));
  expect(values.filter(value=>value.basis==='card-snapshot')).toHaveLength(41);
  expect(values.filter(value=>value.basis==='card-model')).toHaveLength(211);
  expect(values.filter(value=>value.basis==='unavailable')).toHaveLength(6);
  const sports=rows.filter(row=>row.kind==='receiz.sports_arena.card_transfer'||row.source==='graph');
  expect(sports).toHaveLength(252);
  const pulse=Math.max(source.serverPulse,...sports.map(row=>row.valueOperands?.cardValuation?.valuationPulse??0))+100;
  for(const row of sports){
   expect(row.valueOperands?.cardValuation?.claimHash).toBe(row.valueOperands?.claimHash);
   expect(row.valueOperands?.cardValuation?.collectibleId).toBe(row.valueOperands?.collectibleId);
   expect(ledgerValueForRecord(row).amountUsdCents).not.toBeNull();
   expect(ledgerCurrentAssetValue(row,{...index,evaluationPulse:pulse})).toMatchObject({basis:'live-model',pulse:String(pulse)});
  }
  expect(rows.filter((_,i)=>values[i].basis==='unavailable').every(row=>row.kind.startsWith('signal_run.'))).toBe(true);
  const record=rows.find(row=>row.sourceId==='9efdfaf3-b2c4-4189-9ecc-9a809cbb9861')!;
  expect(ledgerValueForRecord(record,index)).toMatchObject({basis:'card-model',amountUsdCents:'1366',pulse:'12616144'});
  for(const row of rows)expect(ledgerValueForRecord(row,{...index,evaluationPulse:source.serverPulse+100})).toBe(ledgerValueForRecord(row,index));
  expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
