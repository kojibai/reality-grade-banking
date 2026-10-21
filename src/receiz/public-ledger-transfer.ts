import {isOriginalPng} from './original-capacity';
/** Bound transferred bytes before decoding or allocating the complete source.
 * Optional PNG capacity is selected by bytes, never the response MIME. */
export async function readPublicLedgerBytes(response:Response,max:number,pngMax?:number):Promise<Uint8Array>{
 const declared=Number(response.headers.get('content-length')),ceiling=pngMax??max;
 if(declared>ceiling){await response.body?.cancel();throw Error('PUBLIC_LEDGER_FILE_CAPACITY');}
 if(!response.body)throw Error('PUBLIC_LEDGER_SOURCE_UNAVAILABLE');
 const reader=response.body.getReader(),parts:Uint8Array[]=[],prefix=new Uint8Array(8);let size=0,prefixSize=0,limit=pngMax===undefined?max:null;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;
   if(limit===null){const first=part.value.subarray(0,8-prefixSize);prefix.set(first,prefixSize);prefixSize+=first.length;if(prefixSize===8)limit=isOriginalPng(prefix)?pngMax!:max;}
   if(size>ceiling||limit!==null&&(size>limit||declared>limit))throw Error('PUBLIC_LEDGER_FILE_CAPACITY');parts.push(part.value);
  }
  if(size>(limit??max))throw Error('PUBLIC_LEDGER_FILE_CAPACITY');
 }
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
