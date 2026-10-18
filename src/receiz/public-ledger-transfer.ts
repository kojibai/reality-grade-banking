/** Bound transferred bytes before decoding or allocating the complete source. */
export async function readPublicLedgerBytes(response:Response,max:number):Promise<Uint8Array>{
 if(Number(response.headers.get('content-length'))>max){await response.body?.cancel();throw Error('PUBLIC_LEDGER_FILE_CAPACITY');}
 if(!response.body)throw Error('PUBLIC_LEDGER_SOURCE_UNAVAILABLE');
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max)throw Error('PUBLIC_LEDGER_FILE_CAPACITY');parts.push(part.value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
