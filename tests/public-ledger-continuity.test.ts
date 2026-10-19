// Synchronization/retention mechanics only; the canonical verifier is mocked at
// its existing boundary. These fixtures are not source qualification evidence.
import {beforeEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const f=vi.hoisted(()=>({held:null as unknown,open:vi.fn(),retain:vi.fn(),load:vi.fn(),save:vi.fn(),custody:new WeakMap<object,unknown>()}));
vi.mock('../src/receiz/public-network-cache',()=>({loadPublicNetworkCache:f.load,savePublicNetworkCache:f.save,savePublicLedgerDisplayCache:(_review:unknown,cache:unknown)=>f.save(cache)}));
vi.mock('../src/receiz/public-ledger-proof',()=>({openPublicLedgerSource:f.open,heldPublicLedgerFile:(review:object)=>{if(!f.custody.has(review))throw Error('CUSTODY_REQUIRED');return f.custody.get(review);}}));
vi.mock('../src/receiz/public-ledger-retention',()=>({readRetainedPublicLedger:async()=>f.held,retainPublicLedgerReview:f.retain}));
import {synchronizePublicLedger,publicLedgerDisplayRows} from '../src/receiz/public-ledger-continuity';
beforeEach(()=>{f.held=null;f.open.mockReset();f.retain.mockReset().mockImplementation(async review=>{f.held=review;return review;});f.load.mockReset().mockResolvedValue(null);f.save.mockReset().mockResolvedValue(true);vi.unstubAllGlobals();});
function review(id='old'){
 const source={schema:'receiz.sealed-artifact-bytes.v124',exactBytesB64u:id,filename:id+'.receiz',mimeType:'application/vnd.receiz.bundle+json',artifactSha256:id,payloadSha256:id};
 const value={artifactSha256:id,snapshot:{kaiUpulse:'1000000',records:[{id:'action',sequence:1,kind:'auth.logout',kaiUpulse:'1000000',entryHash:'e'.repeat(64),previousHash:'f'.repeat(64),amountUsdCents:'12'}]}};
 f.custody.set(value,{source});return {value,source};
}
it('singleflights current source reads and skips re-verification only for the exact held wire',async()=>{
 const held=review();f.held=held.value;let finish!:(value:Response)=>void;
 const fetch=vi.fn((_input:RequestInfo|URL,_options?:RequestInit)=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetch);
 const first=synchronizePublicLedger(),second=synchronizePublicLedger();expect(second).toBe(first);
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());finish(Response.json(held.source));
 expect(await first).toBe(held.value);expect(f.open).not.toHaveBeenCalled();expect(f.retain).not.toHaveBeenCalled();
 const next=review('new');f.open.mockResolvedValue(next.value);fetch.mockResolvedValue(Response.json(next.source));
 expect(await synchronizePublicLedger()).toBe(next.value);expect(f.open).toHaveBeenCalledOnce();expect(f.retain).toHaveBeenCalledOnce();
 expect(fetch.mock.calls.every(([,options])=>options?.method!=='POST')).toBe(true);
});
it('keeps the newest retained source through an outage and lets retention refuse rollback or conflicts',async()=>{
 const held=review('new');f.held=held.value;vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'503'},{status:503})));
 expect(await synchronizePublicLedger()).toBe(held.value);
 const older=review('old');f.open.mockResolvedValue(older.value);f.retain.mockResolvedValue(held.value);
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(older.source)));expect(await synchronizePublicLedger()).toBe(held.value);
 f.retain.mockRejectedValue(Error('PUBLIC_LEDGER_HISTORY_CONFLICT'));await expect(synchronizePublicLedger()).rejects.toThrow('HISTORY_CONFLICT');
});
it('fills only canonical action rows while preserving compatible display metadata and completeness stays outside projection',async()=>{
 const held=review();const rich=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',summary:'Rich public description',entryHash:'e'.repeat(64),seq:1,objectLabel:'Details',actorPulse:5}]}).records[0];
 const other={...rich,id:'wallet:cash',sourceId:'cash',source:'wallet' as const};
 const rows=await publicLedgerDisplayRows(held.value as never,[rich,other]);
 expect(rows.find(row=>row.source==='actions')).toMatchObject({title:'Rich public description',detail:'Details',amountUsdCents:'12',kaiUpulse:'1000000',details:rich.details});
 expect(rows.find(row=>row.source==='wallet')).toBe(other);
 const bare=(await publicLedgerDisplayRows(held.value as never,[]))[0];expect(bare).toMatchObject({source:'actions',authority:'public-source-projection',actor:null,evidence:{entryHash:'e'.repeat(64),prevHash:'f'.repeat(64)}});
 const conflicting=await publicLedgerDisplayRows(held.value as never,[{...rich,evidence:{entryHash:'0'.repeat(64)}}]);expect(conflicting[0].title).toBe('auth logout');expect(conflicting[0].details).toBeUndefined();
 await expect(publicLedgerDisplayRows({...held.value} as never,[])).rejects.toThrow('CUSTODY');
});
it('persists a source accepted without a mounted consumer before returning, then preserves it through a 503 cold read',async()=>{
 const next=review('new');let cache:unknown={records:[],capturedAt:'2026-10-18T12:00:00Z',coverage:[{source:'graph',complete:true,anchorIds:[],observedAt:200}]};
 f.load.mockImplementation(async()=>cache);f.save.mockImplementation(async value=>{cache=value;return true;});f.open.mockResolvedValue(next.value);
 let finish!:(response:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));
 const accepted=synchronizePublicLedger();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 // No hook or component is required to remain mounted while acceptance finishes.
 finish(Response.json(next.source));expect(await accepted).toBe(next.value);
 expect(cache).toMatchObject({records:[{id:'actions:action',amountUsdCents:'12'}],capturedAt:'2026-10-18T12:00:00Z',coverage:[{source:'graph',complete:true,anchorIds:[],observedAt:200}]});
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'503'},{status:503})));expect(await synchronizePublicLedger()).toBe(next.value);
 expect(cache).toMatchObject({records:[{id:'actions:action'}]});
});
it('lets a held canonical transfer replace conflicting weaker discovery fields',async()=>{
 const held=review();held.value.snapshot.records[0].kind='card_transfer';
 const wrong=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',actionKind:'card_transfer',entryHash:'0'.repeat(64),amountUsdCents:'500',pulse:999,cardValueUsdCents:'9900',summary:'Wrong cached transfer'}]}).records;
 const records=await publicLedgerDisplayRows(held.value as never,wrong);
 expect(records).toHaveLength(1);expect(records[0]).toMatchObject({kind:'card_transfer',title:'card transfer',amountUsdCents:'12',pulse:'1',kaiUpulse:'1000000',evidence:{entryHash:'e'.repeat(64)}});
 expect(records[0].valueOperands).toBeUndefined();
});
it('reports display durability failure after retaining the actual original and never substitutes rows for it',async()=>{
 const next=review('new');f.open.mockResolvedValue(next.value);f.save.mockResolvedValue(false);vi.stubGlobal('fetch',vi.fn(async()=>Response.json(next.source)));
 await expect(synchronizePublicLedger()).rejects.toThrow('DISPLAY_CACHE_UNAVAILABLE');expect(f.held).toBe(next.value);expect(f.retain).toHaveBeenCalledWith(next.value);
});
