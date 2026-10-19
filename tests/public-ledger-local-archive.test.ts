import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {packLocalLedger,openLocalLedgerCarrier} from '../src/receiz/public-ledger-archive';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const records=parsePublicNetworkPage('actions',{ok:true,actions:Array.from({length:601},(_,i)=>({id:String(i),actionKind:'card.transfer',summary:`Transfer ${i}`,pulse:123+i,amountUsdCents:'100',entryHash:'a'.repeat(64),publicNote:'A public note',proofBundle:{zkPoseidonHash:'123456789',groth16ProofDigest:'b'.repeat(64)}})),nextCursor:null}).records;
const input={records,capturedAt:'2026-10-19T12:00:00Z',sources:{actions:{complete:false}}};
it('packs every locally held record beyond the visible window and cold opens its exact public fields without fetch',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 try{const {carrier,archive}=await packLocalLedger(input),opened=await openLocalLedgerCarrier(JSON.parse(JSON.stringify(carrier)));
  expect(opened).toEqual(archive);expect(opened.records).toHaveLength(601);expect(opened.records.at(-1)?.details?.proofBundle).toEqual(records.at(-1)?.details?.proofBundle);
  expect(opened.coverage.find(value=>value.source==='actions')?.complete).toBe(false);expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('preserves the complete production Ledger, inspection fields and native card operands within the existing carrier capacity',async()=>{
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync(new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url))).toString()));
 const packed=await packLocalLedger({records:cache.records,capturedAt:cache.capturedAt,sources:Object.fromEntries(cache.coverage.map(item=>[item.source,item]))});
 const opened=await openLocalLedgerCarrier(packed.carrier);
 expect(opened.records).toHaveLength(cache.records.length);for(let i=0;i<cache.records.length;i++)expect(opened.records[i],`record ${i}`).toEqual(cache.records[i]);expect(packed.carrier.data.length).toBeLessThan(20*1024*1024);expect(opened.records.length).toBeGreaterThan(45000);
},30000);
it('refuses private or account-carried records and duplicate IDs rather than silently dropping them',async()=>{
 await expect(packLocalLedger({...input,records:[{...records[0],authority:'account-source-projection'}]})).rejects.toThrow(/PRIVATE_SOURCE/);
 await expect(packLocalLedger({...input,records:[{...records[0],origin:'identity-carried'}]})).rejects.toThrow(/PRIVATE_SOURCE/);
 await expect(packLocalLedger({...input,records:[records[0],records[0]]})).rejects.toThrow(/DUPLICATE/);
 await expect(packLocalLedger({...input,records:[]})).rejects.toThrow(/EMPTY/);
});
it('refuses changed data, counts, digests and declared expansion before returning an archive',async()=>{
 const {carrier}=await packLocalLedger(input);
 for(const patch of [{recordCount:1},{dataSha256:'0'.repeat(64)},{dataBytes:1},{dataBytes:65*1024*1024},{kind:'receiz.public-action-ledger.v1'}])await expect(openLocalLedgerCarrier({...carrier,...patch})).rejects.toThrow();
});
it('carries the already displayed event and current prices separately without replacing original record fields',async()=>{
 const displayValues=[{id:records[0].id,value:{amountUsdCents:'12345',basis:'card-model' as const,pulse:records[0].pulse,considerationUsdCents:null},currentValue:{amountUsdCents:'23456',basis:'live-model' as const,pulse:'999',considerationUsdCents:null},valuation:null}];
 const {carrier}=await packLocalLedger({...input,displayValues}),opened=await openLocalLedgerCarrier(carrier);
 expect(opened.displayValues).toEqual(displayValues);expect(opened.records[0]).toEqual(records[0]);
});
