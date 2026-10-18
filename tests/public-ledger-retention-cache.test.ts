// Verification memo mechanics only. The mocked canonical reader cannot qualify
// these synthetic bytes as a real public Ledger source.
import {afterEach,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({inspect:vi.fn()}));
vi.mock('../src/receiz/public-ledger-proof',()=>({inspectPublicLedgerFile:f.inspect,heldPublicLedgerFile:()=>{throw Error('not used');}}));
import {readRetainedPublicLedger} from '../src/receiz/public-ledger-retention';
afterEach(()=>vi.unstubAllGlobals());
it('singleflights exact retained bytes while verification is pending and never reuses a changed original',async()=>{
 let held={bytes:new Uint8Array([4,5,6]),filename:'retained.receiz'};
 vi.stubGlobal('indexedDB',{open:()=>{
  const request:Record<string,unknown>={};queueMicrotask(()=>{request.result={close(){},transaction:()=>({objectStore:()=>({get:()=>{
   const read:Record<string,unknown>={};queueMicrotask(()=>{read.result=structuredClone(held);(read.onsuccess as ()=>void)?.();});return read;
  }})})};(request.onsuccess as ()=>void)?.();});return request;
 }});
 let finish!:(value:object)=>void;f.inspect.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const first=readRetainedPublicLedger(),second=readRetainedPublicLedger();await vi.waitFor(()=>expect(f.inspect).toHaveBeenCalledOnce());
 const review={kind:'ledger'};finish(review);expect(await first).toBe(review);expect(await second).toBe(review);
 expect(await readRetainedPublicLedger()).toBe(review);expect(f.inspect).toHaveBeenCalledOnce();
 held={...held,bytes:new Uint8Array([4,5,7])};f.inspect.mockRejectedValueOnce(Error('INVALID_ORIGINAL'));
 await expect(readRetainedPublicLedger()).rejects.toThrow('INVALID_ORIGINAL');
 f.inspect.mockResolvedValueOnce(review);expect(await readRetainedPublicLedger()).toBe(review);expect(f.inspect).toHaveBeenCalledTimes(3);
});
