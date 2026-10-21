import {expect,it,vi} from 'vitest';
import {readPublicLedgerBytes} from '../src/receiz/public-ledger-transfer';
import {readMediaPayload} from '../src/receiz/proof-media';

const png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4,5,6]);
it('permits a PNG original in the separate image budget even when its signature spans stream chunks',async()=>{
 const response=new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(png.subarray(0,3));controller.enqueue(png.subarray(3,7));controller.enqueue(png.subarray(7));controller.close();}}),{headers:{'content-length':String(png.length)}});
 expect(await readPublicLedgerBytes(response,12,20)).toEqual(png);
});
it('does not give a non-PNG the larger budget even when its response MIME claims image/png',async()=>{
 let cancelled=false;const response=new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(14));},cancel(){cancelled=true;}}),{headers:{'content-length':'14','content-type':'image/png'}});
 await expect(readPublicLedgerBytes(response,12,20)).rejects.toThrow('PUBLIC_LEDGER_FILE_CAPACITY');expect(cancelled).toBe(true);
});
it('cancels a PNG beyond its separate capacity, including without a content length',async()=>{
 let cancelled=false;const response=new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(png);controller.enqueue(new Uint8Array(10));},cancel(){cancelled=true;}}));
 await expect(readPublicLedgerBytes(response,12,20)).rejects.toThrow('PUBLIC_LEDGER_FILE_CAPACITY');expect(cancelled).toBe(true);
});
it('cancels a source above both budgets from its declared length without pulling content',async()=>{
 const pull=vi.fn(),cancel=vi.fn(),response=new Response(new ReadableStream<Uint8Array>({pull,cancel},{highWaterMark:0}),{headers:{'content-length':'21'}});
 await expect(readPublicLedgerBytes(response,12,20)).rejects.toThrow('PUBLIC_LEDGER_FILE_CAPACITY');expect(pull).not.toHaveBeenCalled();expect(cancel).toHaveBeenCalledOnce();
});
it('opens an already-verified large PNG payload without decoding or enlarging unrelated JSON and media limits',async()=>{
 const bytes=new Uint8Array(25*1024*1024);bytes.set(png);const payload={bytes,filename:'Showcase.png',mimeType:'image/png',sha256:'a'.repeat(64)};
 const files=await readMediaPayload(payload);expect(files).toHaveLength(1);expect(files[0].kind).toBe('image');expect(files[0].bytes).toBe(bytes);
 expect(()=>readMediaPayload({...payload,mimeType:'application/json'})).toThrow('capacity');
 await expect(readMediaPayload({...payload,mimeType:'image/jpeg'})).rejects.toThrow('capacity');
 await expect(readMediaPayload({...payload,bytes:new Uint8Array(25*1024*1024)})).rejects.toThrow('capacity');
});
