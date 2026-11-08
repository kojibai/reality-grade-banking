import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import original from './fixtures/retained-transfer-original.json';
import {createRecordProofExports} from '../src/receiz/record-proof-export';
import {createHeldTransferOriginalReader} from '../src/receiz/held-transfer-original';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import type {HeldLedgerOriginalReader} from '../src/receiz/held-ledger-original';
const runtime=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>runtime.sdk}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('downloads an already-retained transfer export unchanged without invoking its sealer; restores the exact file offline',async()=>{
 const f=await conformanceOfflineFixture({account:true});runtime.sdk=f.runtime;
 const admission=await f.runtime.createReceizArtifactAdmissionEngine()(await f.runtime.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
 const sealer=f.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NO_NETWORK');}}),states=new Map(),blobs=new Map<string,Uint8Array>();let seals=0,closed=false;
 const assertOpen=()=>{if(closed)throw Error('CLOSED');},sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
 const ports={assertOpen,read:async(k:string)=>states.get(k)??null,write:async(k:string,v:unknown)=>{states.set(k,v);},retain:async(bytes:Uint8Array)=>{const d=sha(bytes);blobs.set(d,bytes.slice());return d;},restore:async(d:string)=>blobs.get(d)!.slice(),seal:async(input:Parameters<typeof sealer.seal>[0])=>{seals++;return sealer.seal(input);}};
 const exporter=createRecordProofExports(ports),missing=vi.fn(async()=>{throw Error('SOURCE_ALREADY_HELD');});
 const capture={bytes:new TextEncoder().encode(JSON.stringify(original)),recordHash:original.source.message.receiz_receipt.digest,filename:`transfer-${original.transfer.id}.receiz-original.json`,mimeType:'application/json'};
 // Explicit fixture issuance precedes Download. The actual reader below has
 // only the read operation and cannot create a replacement artifact.
 await exporter.export(capture);expect(seals).toBe(1);
 const reader=Object.assign(async()=>null,{transferOriginal:createHeldTransferOriginalReader({assertOpen,accountUid:()=>original.transfer.senderUserId,readSends:async()=>({schema:'bank.wallet-sends.v1',current:{status:'recorded',record:original},history:[]}),readSaved:async()=>null,save:async()=>{throw Error('SOURCE_ALREADY_HELD');},readMissing:missing,readOriginal:input=>exporter.read(input)})}) as HeldLedgerOriginalReader;
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:original.transfer.id,kind:'chat_transfer',amountUsdCents:'1000'}]}).records[0];
 vi.resetModules();const api=await import('../src/receiz/ledger-offline-proof'),inspection=await import('../src/receiz/proof-inspection'),fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
 const file=await api.downloadLedgerOriginal(record,null,undefined,reader),result=await api.inspectLedgerOriginal(record,undefined,reader),bytes=new Uint8Array(await file.arrayBuffer());
 expect(await api.downloadLedgerOriginal(record,result.report,undefined,reader)).toBe(file);expect(result.report.exportedRecord).toBe('transfer-original');expect(result.report.transferOriginal?.checks.receiptDigest).toBe(true);expect(result.report.scope).toContain('No sender signature, complete funding history');
 expect(inspection.retainedProofInspection(result.report.artifactSha256)).toBeNull();expect(fetcher).not.toHaveBeenCalled();expect(missing).not.toHaveBeenCalled();expect(seals).toBe(1);
 const opened=await f.runtime.openPayload({fileBytes:bytes,filename:file.name,mime:file.type,signatureV4RootPublicKeys:new Map(f.roots.map(root=>[root.kid,root]))});expect(opened.ok).toBe(true);expect(JSON.parse(new TextDecoder().decode(opened.payloadBytes))).toEqual(original);
 // The retained JSON is the source; the SDK export adds its supported carrier.
 // Neither an unsealed JSON nor a forged inspection DTO is admitted instead.
 expect((await f.runtime.verifyReceizArtifact(new TextEncoder().encode(JSON.stringify(original)))).status).not.toBe('verified-artifact');
 await expect(api.downloadLedgerOriginal(record,structuredClone(result.report),undefined,reader)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 await expect(api.downloadLedgerOriginal({...record,amountUsdCents:'1001'},result.report,undefined,reader)).rejects.toThrow('SELECTED_RECORD_SOURCE_MISMATCH');
 const input={bytes:new TextEncoder().encode(JSON.stringify(original)),recordHash:original.source.message.receiz_receipt.digest,filename:`transfer-${original.transfer.id}.receiz-original.json`,mimeType:'application/json'};
 expect(new Uint8Array(await(await createRecordProofExports(ports).export(input)).arrayBuffer())).toEqual(bytes);expect(seals).toBe(1);
 const {qualifyTransferExportKit}=await import('./helpers/transfer-export-kit');await qualifyTransferExportKit(f.roots,record,reader,bytes);
 closed=true;await expect(api.downloadLedgerOriginal(record,result.report,undefined,reader)).rejects.toThrow('CLOSED');
},60000);
