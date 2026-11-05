/** Shared bounded byte delivery for prepared public display documents. This is
 * compression, not a proof reader or a financial admission boundary. */
export async function decodePublicDocumentGzip(value:unknown,limits:{raw:number;gzip:number}):Promise<Uint8Array>{
 const packet=value as {gzipB64u?:unknown;bytes?:unknown},size=packet?.bytes,text=packet?.gzipB64u;
 if(typeof text!=='string'||!text.length||text.length>Math.ceil(limits.gzip*4/3)||!/^[A-Za-z0-9_-]+$/.test(text)||!Number.isSafeInteger(size)||Number(size)<1||Number(size)>limits.raw)throw Error('PUBLIC_DOCUMENT_CAPACITY');
 const tail='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.indexOf(text.at(-1)!),remainder=text.length%4;
 if(remainder===1||remainder===2&&(tail&15)!==0||remainder===3&&(tail&3)!==0)throw Error('PUBLIC_DOCUMENT_INVALID');
 const binary=atob(text.replaceAll('-','+').replaceAll('_','/')),compressed=new Uint8Array(binary.length);
 for(let index=0;index<binary.length;index++)compressed[index]=binary.charCodeAt(index);
 if(compressed.length>limits.gzip)throw Error('PUBLIC_DOCUMENT_CAPACITY');
 let bytes:Uint8Array;
 if(typeof DecompressionStream==='undefined'){
  const {gunzipSync}=await import('fflate');bytes=gunzipSync(compressed,{out:new Uint8Array(Number(size)+1)});
 }else{
  const reader=new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts:Uint8Array[]=[];let length=0;
  try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>Number(size))throw Error('PUBLIC_DOCUMENT_CAPACITY');parts.push(part.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 }
 if(bytes.length!==size)throw Error('PUBLIC_DOCUMENT_INVALID');return bytes;
}
