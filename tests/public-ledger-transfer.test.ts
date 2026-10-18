import {it,expect,vi,afterEach} from 'vitest';
import {readPublicLedgerBytes} from '../src/receiz/public-ledger-transfer';
import {readRetainedPublicLedger} from '../src/receiz/public-ledger-retention';
afterEach(()=>vi.unstubAllGlobals());
it('bounds streamed originals even when the service omits a content length',async()=>{
 let cancelled=false;
 const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([1,2,3]));c.enqueue(new Uint8Array([4,5,6]));},cancel(){cancelled=true;}});
 await expect(readPublicLedgerBytes(new Response(body),4)).rejects.toThrow('PUBLIC_LEDGER_FILE_CAPACITY');expect(cancelled).toBe(true);
});
it('cancels a declared oversized source without reading its content',async()=>{
 let cancelled=false;const body=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
 await expect(readPublicLedgerBytes(new Response(body,{headers:{'content-length':'20'}}),4)).rejects.toThrow('PUBLIC_LEDGER_FILE_CAPACITY');expect(cancelled).toBe(true);
});
it('preserves all bytes of a source within its transfer capacity',async()=>{
 const bytes=await readPublicLedgerBytes(new Response(new Uint8Array([1,2,3,4])),4);expect([...bytes]).toEqual([1,2,3,4]);
});
it.each([undefined,{open(){throw new DOMException('Storage refused','SecurityError');}}])('reports optional browser custody as unavailable without a raw browser exception',async storage=>{
 vi.stubGlobal('indexedDB',storage);await expect(readRetainedPublicLedger()).rejects.toThrow('PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE');
});
