import {beforeAll,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Resvg} from '@resvg/resvg-js';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {indexLedgerValues} from '../src/receiz/ledger-value';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {createLocalLedgerCrystal} from '../src/receiz/public-ledger-crystal-image';
import {heldPublicLedgerFile,inspectPublicLedgerFile} from '../src/receiz/public-ledger-proof';
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>;
// The only injected boundary selects explicit ephemeral test roots. Actual
// preferred SDK sealing and complete canonical verification execute unchanged.
vi.mock('../src/receiz/public-ledger-native.mjs',()=>({readPublicOriginal:async(fileBytes:Uint8Array,filename:string)=>fixture.runtime.openPayload({fileBytes,filename,signatureV4RootPublicKeys:new Map(fixture.roots.map(root=>[root.kid,root]))})}));
beforeAll(async()=>{fixture=await conformanceOfflineFixture();},60000);
it('seals all 51,331 public observations including the complete shipped Ledger with the actual SDK and opens the exact file offline',async()=>{
 let cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync(new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url))).toString()));
 // Synthetic additional public observations sample the actual record shapes;
 // they are captured application data, never asserted as real financial events.
 const originalCount=cache.records.length,extra=Math.max(0,51331-originalCount);
 cache.records.push(...Array.from({length:extra},(_,i)=>{const row=cache.records[Math.floor(i*originalCount/extra)],sourceId='synthetic-continuation-'+i;return {...row,id:row.source+':'+sourceId,sourceId};}));
 cache=parsePublicNetworkCache({...cache,schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection'});
 const valueSource=indexLedgerValues(parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'))));
 const sealer=fixture.runtime.offline.createReceizOfflineSealer({store:fixture.store,resources:fixture.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 try{
  const image=await createLocalLedgerCrystal({records:cache.records,capturedAt:cache.capturedAt,sources:Object.fromEntries(cache.coverage.map(item=>[item.source,item])),valueSource},{render:async()=>new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#14283f"/></svg>').render().asPng(),seal:input=>sealer.seal(input)});
  expect(image.recordCount).toBe(cache.records.length);
  const verification=await fixture.runtime.offline.verifyReceizOfflineSealedFile({bytes:image.bytes,filename:image.filename,mimeType:'image/png'});expect(verification.ok).toBe(true);
  const opened=await inspectPublicLedgerFile({bytes:image.bytes.slice(),filename:image.filename});expect(opened.archive?.records).toEqual(cache.records);expect(heldPublicLedgerFile(opened).bytes).toEqual(image.bytes);expect(network).not.toHaveBeenCalled();
  const changed=image.bytes.slice();changed[50]^=1;expect((await fixture.runtime.offline.verifyReceizOfflineSealedFile({bytes:changed,filename:image.filename,mimeType:'image/png'})).ok).toBe(false);await expect(inspectPublicLedgerFile({bytes:changed,filename:image.filename})).rejects.toThrow();
 }finally{network.mockRestore();}
},60000);
