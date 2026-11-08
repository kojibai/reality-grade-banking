import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {unzipSync} from 'fflate';
import event from './fixtures/public-transaction-event.json';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {hasLedgerNativeRecord,ledgerNativeRecord,assertLedgerNativeRecord} from '../src/receiz/ledger-native-record';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {publicMarketMiddleware,resolvePublicMarketTarget} from '../server/public-market';
import {createHeldLedgerOriginalReader} from '../src/receiz/held-ledger-original';
import {receiptLink,readReceiptLink,receiptDisplayRecord} from '../src/receiz/ledger-receipts';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
const NativeURL=URL,bytes=new Uint8Array(readFileSync('tests/fixtures/public-transaction-native.png'));
const row=()=>parsePublicNetworkPage('wallet',{ok:true,events:[event]}).records[0];
beforeAll(()=>execFileSync(process.execPath,['scripts/build-proof-verifier.mjs'],{stdio:'pipe'}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
async function setup(source=bytes){
 vi.resetModules();vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 vi.stubGlobal('URL',class extends NativeURL{constructor(input:string|URL,base?:string|URL){super(input,base);if(this.pathname==='/proof-verifier/v129/verifier.js')return pathToFileURL(resolve('public/proof-verifier/v129/verifier.js'));}});
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
  const url=String(input);if(url.startsWith('/api/bank/public-market/record?'))return new Response(source,{headers:{'Content-Type':'image/png'}});
  if(url.startsWith('/proof-verifier/v129/'))return new Response(readFileSync('public'+url));
  throw Error('UNEXPECTED_READ');
 });
 return{api:await import('../src/receiz/ledger-offline-proof'),inspection:await import('../src/receiz/proof-inspection'),fetcher};
}
it('opens held receipt coordinates without IO and routes the native v/ payload through the fixed Receiz exporter',()=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),record=row();expect(hasLedgerNativeRecord(record)).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 const source=ledgerNativeRecord(record)!;expect(source.filename).toBe('receiz_20261107_2109_62E2508A_record.png');
 const target=resolvePublicMarketTarget('/api/bank/public-market/record?path='+encodeURIComponent(source.path))!;
 expect(target.origin).toBe('https://receiz.com');expect(target.pathname).toBe('/v/20261107_2109/62E2508A/15045683');expect(target.searchParams.get('p')).toMatch(/^c1:/);
 for(const path of [source.path+'&p=c1:duplicate',source.path+'&url=https://evil.test',source.path.replace('a=7bccc282','a=invalid'),source.path+'#hidden'])expect(resolvePublicMarketTarget('/api/bank/public-market/record?path='+encodeURIComponent(path))).toBeNull();
 // Native event IDs can yield a 16-character receipt code; they must not be
 // accidentally limited to the older eight-character Moment-only route.
 const details={...record.details};delete details.receiz;const withoutMoment={...record,details};expect(resolvePublicMarketTarget('/api/bank/public-market/record?path='+encodeURIComponent(ledgerNativeRecord(withoutMoment)!.path))).not.toBeNull();
});
it.each(['public-source-projection','account-source-projection'] as const)('downloads the genuine native PNG and verifies its exact ZIP standalone for %s',async authority=>{
 const {api,inspection,fetcher}=await setup(),record={...row(),authority};
 const selected=await api.inspectLedgerOriginal(record),file=await api.downloadLedgerOriginal(record,selected.report);
 expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);expect(file.type).toBe('image/png');expect(file.name).toMatch(/_record\.png$/);
 expect(selected.report.verification).toMatchObject({ok:true,integrity:{ok:true},bundle:{kaiPulseEternal:'15045683'}});expect(selected.report.groth16).not.toBeNull();
 expect(await api.downloadLedgerOriginal(record,selected.report)).toBe(file);expect(fetcher).toHaveBeenCalledOnce();
 expect(inspection.retainedProofInspection(selected.report.artifactSha256)!==null).toBe(authority==='public-source-projection');
 await expect(api.downloadLedgerOriginal({...record,amountUsdCents:'1'},selected.report)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 await expect(api.downloadLedgerEvidence(record,structuredClone(selected.report))).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 const files=unzipSync(await api.downloadLedgerEvidence(record,selected.report));expect(files['original.receiz']).toEqual(bytes);
 expect(fetcher.mock.calls.filter(([url])=>String(url).startsWith('/api/'))).toHaveLength(1);
 const directory=mkdtempSync(join(tmpdir(),'native-transaction-kit-'));
 try{for(const [name,data]of Object.entries(files))writeFileSync(join(directory,name),data);
  const report=JSON.parse(execFileSync(process.execPath,['--import','data:text/javascript,globalThis.fetch=()=>{throw Error("NETWORK_FORBIDDEN")}', 'verify.mjs','original.receiz'],{cwd:directory,encoding:'utf8'}));expect(report.verification.ok).toBe(true);expect(report.artifactSha256).toBe(selected.report.artifactSha256);
  const changed=bytes.slice();changed[changed.length-1]^=1;writeFileSync(join(directory,'changed.png'),changed);expect(()=>execFileSync(process.execPath,['verify.mjs','changed.png'],{cwd:directory,stdio:'pipe'})).toThrow();
 }finally{rmSync(directory,{recursive:true,force:true});}
 // The portable receipt retains the same native file selection.
 const carried=receiptDisplayRecord(readReceiptLink(receiptLink(record,ledgerValueForRecord(record))!));expect(ledgerNativeRecord(carried)?.payload).toEqual(ledgerNativeRecord(record)?.payload);
});
it('binds the actual verified PNG to its exact native envelope and preserves private reader lifetime',async()=>{
 const {api,fetcher}=await setup();let open=true;const read=vi.fn(async()=>null),reader=createHeldLedgerOriginalReader({assertOpen(){if(!open)throw Error('CLOSED');},read});
 const record={...row(),authority:'account-source-projection' as const},selected=await api.inspectLedgerOriginal(record,undefined,reader);
 const source=ledgerNativeRecord(record)!;expect(()=>assertLedgerNativeRecord(bytes,{...source,payload:{...source.payload,event:{changed:true}}},selected.report.verification)).toThrow('SELECTED_RECORD_SOURCE_MISMATCH');
 expect(()=>assertLedgerNativeRecord(bytes,{...source,path:source.path.replace('/15045683?','/15045684?')},selected.report.verification)).toThrow('SELECTED_RECORD_SOURCE_MISMATCH');
 expect(read).not.toHaveBeenCalled();open=false;await expect(api.downloadLedgerOriginal(record,selected.report,undefined,reader)).rejects.toThrow('CLOSED');expect(fetcher).toHaveBeenCalledOnce();
});

it('verifies the native short-code output when old/private rows have no carried Receiz Moment',async()=>{
 const source=new Uint8Array(readFileSync('tests/fixtures/public-transaction-without-moment.png')),{api}=await setup(source),record=row();delete record.details!.receiz;
 const selected=await api.inspectLedgerOriginal(record),file=await api.downloadLedgerOriginal(record,selected.report);expect(new Uint8Array(await file.arrayBuffer())).toEqual(source);expect(selected.report.verification.ok).toBe(true);
});

it('reuses a carried native v/ or t/ receipt link even outside the Wallet projection',async()=>{
 const {api}=await setup(),reference=ledgerNativeRecord(row())!;
 for(const route of ['v','t']){
  const record={...row(),source:'actions' as const,details:{},sourceUrl:'https://receiz.com'+reference.path.replace(/^\/v\//,`/${route}/`)};
  expect(hasLedgerNativeRecord(record)).toBe(true);expect(ledgerNativeRecord(record)?.payload).toEqual(JSON.parse(JSON.stringify(reference.payload)));
  const file=await api.downloadLedgerOriginal(record);expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
 }
});

it('loads the native codec only for an explicit receipt request and relays the native PNG unchanged',async()=>{
 const source=ledgerNativeRecord(row())!,fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options)=>{
  const native=new NativeURL(String(url));expect(native.origin).toBe('https://receiz.com');expect(native.pathname).toBe('/api/transactions/moment-card');expect(native.searchParams.get('presentation')).toBe('public-proof');expect(native.searchParams.get('walletLedgerReceipt')).toMatch(/^c1:/);expect(options).toMatchObject({credentials:'omit',redirect:'error'});return new Response(bytes,{headers:{'Content-Type':'image/png'}});
 });let status=0,output:Uint8Array|undefined;
 await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/record?path='+encodeURIComponent(source.path),headers:{cookie:'never-forward'}} as IncomingMessage,{setHeader:vi.fn(),writeHead:(value:number)=>{status=value;},end:(value:Uint8Array)=>{output=value;}} as unknown as ServerResponse,vi.fn());
 expect(status).toBe(200);expect(output).toEqual(bytes);expect(fetcher).toHaveBeenCalledOnce();
});
