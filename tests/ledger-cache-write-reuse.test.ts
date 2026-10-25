import {afterEach,expect,it,vi}from 'vitest';
const work=vi.hoisted(()=>({details:vi.fn()}));
vi.mock('../src/receiz/ledger-inspection',async original=>{const actual=await original<typeof import('../src/receiz/ledger-inspection')>();return {...actual,readLedgerDetails:vi.fn((v:unknown)=>{work.details();return actual.readLedgerDetails(v);})};});
import {savePublicNetworkCache,loadPublicNetworkCache,type PublicNetworkCache}from '../src/receiz/public-network-cache';
import {parsePublicNetworkPage}from '../src/receiz/public-network';
afterEach(()=>{vi.unstubAllGlobals();work.details.mockClear();});
function storage(){
 let value:unknown,fail=false;
 const db={open(){const request:Record<string,any>={};queueMicrotask(()=>{request.result={close(){},transaction(){let aborted=false;const tx:Record<string,any>={abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {get(){const read:Record<string,any>={};queueMicrotask(()=>{read.result=structuredClone(value);read.onsuccess?.();queueMicrotask(()=>{if(!aborted)fail?tx.onerror?.():tx.oncomplete?.();});});return read;},put(next:unknown){if(!fail)value=structuredClone(next);}};}};return tx;}};request.onsuccess?.();});return request;}};
 vi.stubGlobal('indexedDB',db);return {read:()=>structuredClone(value),foreign:(next:unknown)=>{value=structuredClone(next);},fail:(next:boolean)=>{fail=next;}};
}
const cache=(id:string):PublicNetworkCache=>({records:parsePublicNetworkPage('actions',{ok:true,actions:[{id,actionKind:'record'}]}).records,capturedAt:null,coverage:[]});
it('reuses this tab\'s successfully committed cache without sanitizing every retained row again',async()=>{
 storage();const first=cache('first'),next=cache('next');await savePublicNetworkCache(first);work.details.mockClear();
 expect(await savePublicNetworkCache(next)).toBe(true);expect(work.details).not.toHaveBeenCalled();
 expect((await loadPublicNetworkCache())?.records.map(r=>r.sourceId).sort()).toEqual(['first','next']);
});
it('reopens and merges another writer\'s changed cache instead of overwriting its additions',async()=>{
 const db=storage();await savePublicNetworkCache(cache('local'));
 const raw=db.read()as Record<string,unknown>,foreign=cache('foreign');db.foreign({...raw,...foreign,writeGeneration:'foreign-writer',schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection'});work.details.mockClear();
 expect(await savePublicNetworkCache(cache('next'))).toBe(true);expect(work.details).toHaveBeenCalled();
 expect((await loadPublicNetworkCache())?.records.map(r=>r.sourceId).sort()).toEqual(['foreign','next']);
});
it('recognizes legacy writers without a generation and still preserves their records',async()=>{
 const db=storage();await savePublicNetworkCache(cache('local'));
 db.foreign({...cache('legacy'),schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection'});work.details.mockClear();
 await savePublicNetworkCache(cache('next'));expect(work.details).toHaveBeenCalled();
 expect((await loadPublicNetworkCache())?.records.map(r=>r.sourceId).sort()).toEqual(['legacy','next']);
});
it('does not reuse an unsuccessful write as a durable predecessor',async()=>{
 const db=storage();await savePublicNetworkCache(cache('retained'));db.fail(true);
 expect(await savePublicNetworkCache(cache('failed'))).toBe(false);db.fail(false);await savePublicNetworkCache(cache('next'));
 expect((await loadPublicNetworkCache())?.records.map(r=>r.sourceId).sort()).toEqual(['next','retained']);
});
it('shares immutable recorded rows instead of cloning or allowing history to change in place',async()=>{
 storage();const first=cache('retained');await savePublicNetworkCache(first);
 expect(Object.isFrozen(first.records[0])).toBe(true);
 expect(()=>{first.records[0].title='Changed after durable retention';}).toThrow(TypeError);
 expect(()=>{first.records[0].details={privateKey:'not-carried'};}).toThrow(TypeError);
 await savePublicNetworkCache(cache('next'));
 const record=(await loadPublicNetworkCache())?.records.find(r=>r.sourceId==='retained');
 expect(record?.title).not.toBe('Changed after durable retention');expect(record?.details).not.toHaveProperty('privateKey');
});
