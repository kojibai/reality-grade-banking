// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {browserPreparedBankCache} from '../src/receiz/prepared-bank-cache';
const path='/api/explore?path=bank';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function browser(){
 const rows=new Map<string,Response>();
 const cache={match:vi.fn(async(key:string)=>rows.get(key)?.clone()),put:vi.fn(async(key:string,response:Response)=>{rows.set(key,response.clone());}),delete:vi.fn(async(key:string)=>rows.delete(key))};
 const storage={open:vi.fn(async()=>cache)};vi.stubGlobal('caches',storage);return{cache,storage,rows,key:new URL(path,location.origin).href};
}
it('stores only the explicit public data key and shares one browser cache handle',async()=>{
 const b=browser(),port=browserPreparedBankCache(path)!;expect(b.storage.open).not.toHaveBeenCalled();
 await port.write(new Response('accepted public bytes'));expect(await(await port.read())?.text()).toBe('accepted public bytes');
 expect(b.storage.open).toHaveBeenCalledOnce();expect([...b.rows.keys()]).toEqual([b.key]);expect(b.storage.open.mock.calls[0]).toEqual(['bankeiz-held-public-catalog-v1']);
});
it('serializes accepted writes so a slow old write cannot land after the newer accepted frame',async()=>{
 const b=browser(),port=browserPreparedBankCache(path)!;let finish!:()=>void;
 b.cache.put.mockImplementationOnce(async(key,response)=>{await new Promise<void>(resolve=>{finish=resolve;});b.rows.set(key,response.clone());});
 const older=port.write(new Response('B')),newer=port.write(new Response('C'));await vi.waitFor(()=>expect(typeof finish).toBe('function'));expect(b.cache.put).toHaveBeenCalledOnce();finish();await Promise.all([older,newer]);
 expect(await(await port.read())?.text()).toBe('C');expect(b.cache.put).toHaveBeenCalledTimes(2);
});
it('does not erase a newly accepted cache frame when discarding a corrupt older read',async()=>{
 const b=browser();b.rows.set(b.key,new Response('bad old bytes'));const port=browserPreparedBankCache(path)!,old=(await port.read())!;
 await port.write(new Response('new accepted bytes'));await port.discard(old);expect(await(await port.read())?.text()).toBe('new accepted bytes');expect(b.cache.delete).not.toHaveBeenCalled();
});
it('removes only the corrupt entry when no intervening accepted write exists',async()=>{
 const b=browser();b.rows.set(b.key,new Response('bad bytes'));b.rows.set(new URL('/other',location.origin).href,new Response('unrelated'));
 const port=browserPreparedBankCache(path)!,old=(await port.read())!;await port.discard(old);expect(await port.read()).toBeNull();expect(b.rows.size).toBe(1);
});
it('keeps a failed local write optional and allows the next accepted state to persist',async()=>{
 const b=browser(),port=browserPreparedBankCache(path)!;b.cache.put.mockRejectedValueOnce(new DOMException('Quota full','QuotaExceededError'));
 await expect(port.write(new Response('B'))).rejects.toThrow();await port.write(new Response('C'));expect(await(await port.read())?.text()).toBe('C');
});
it('recovers a rejected cache-open attempt on the next existing operation',async()=>{
 const b=browser(),port=browserPreparedBankCache(path)!;b.storage.open.mockRejectedValueOnce(Error('storage unavailable'));
 await expect(port.read()).rejects.toThrow('storage unavailable');await port.write(new Response('C'));expect(await(await port.read())?.text()).toBe('C');expect(b.storage.open).toHaveBeenCalledTimes(2);
});
