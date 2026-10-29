import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const NativeURL=URL,record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'kit-record',kind:'chat_transfer',amountUsdCents:'12500',pulse:'123'}]}).records[0];
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
async function setup(){
 vi.resetModules();let open!:()=>void,fail!:(error:Error)=>void;const wait=new Promise<void>((resolve,reject)=>{open=resolve;fail=reject;}),tag=crypto.randomUUID();
 let markStarted!:()=>void;const entered=new Promise<void>(resolve=>markStarted=resolve);vi.stubGlobal('__bankKitLoadStarted',markStarted);
 vi.stubGlobal('__bankKitLoadGate',wait);vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 vi.stubGlobal('URL',class extends NativeURL{constructor(input:string|URL,base?:string|URL){super(input,base);if(this.pathname==='/proof-verifier/v129/verifier.js')return new NativeURL('./fixtures/offline-kit-runtime.mjs?run='+tag,import.meta.url);}});
 return{open,fail,entered,api:await import('../src/receiz/ledger-offline-proof')};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('starts build metadata while verifier code opens, then verifies every exact downloaded resource',async()=>{
 const {api,open}=await setup(),resource=new Uint8Array([1,2,3]),build={sdk:'129.0.0',files:{'fixture.txt':{sha256:sha(resource),bytes:3}}};
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>String(url).endsWith('build.json')?Response.json(build):new Response(resource));
 const work=api.downloadLedgerEvidence(record);await Promise.resolve();const before=fetcher.mock.calls.map(c=>c[0]);open();const files=unzipSync(await work);
 expect(before).toEqual(['/proof-verifier/v129/build.json']);expect(Object.keys(files)).toEqual(['fixture.txt','build.json','record.json','availability.json','hashes.json']);expect(files['fixture.txt']).toEqual(resource);expect(JSON.parse(new TextDecoder().decode(files['hashes.json']))['fixture.txt']).toEqual({sha256:sha(resource),bytes:3});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('refuses an unadmitted original before code or network work',async()=>{
 const {api,open}=await setup(),fetcher=vi.spyOn(globalThis,'fetch');try{await expect(api.downloadLedgerEvidence(record,{artifactSha256:'a'.repeat(64)} as never)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');expect(fetcher).not.toHaveBeenCalled();}finally{open();}
});
it('keeps build refusal retryable and refuses a changed verifier-kit resource',async()=>{
 const {api,open}=await setup(),fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(null,{status:503}));
 const failed=expect(api.downloadLedgerEvidence(record)).rejects.toThrow('OFFLINE_VERIFIER_UNAVAILABLE');open();await failed;
 fetcher.mockResolvedValueOnce(Response.json({sdk:'129.0.0',files:{'fixture.txt':{sha256:'a'.repeat(64),bytes:3}}})).mockResolvedValueOnce(new Response(new Uint8Array([1,2,3])));
 await expect(api.downloadLedgerEvidence(record)).rejects.toThrow('OFFLINE_VERIFIER_INTEGRITY');
});

it('preserves verifier-first failure when metadata also rejects, with no unhandled rejection',async()=>{
 const {api,fail,entered}=await setup(),fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('METADATA_REFUSED'));
 const result=api.downloadLedgerEvidence(record).then(value=>({value}),error=>({error}));
 await entered;fail(Error('VERIFIER_IMPORT_REFUSED'));expect(await result).toMatchObject({error:Error('VERIFIER_IMPORT_REFUSED')});expect(fetcher).toHaveBeenCalledOnce();
});
