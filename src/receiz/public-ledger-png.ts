/** Metadata carries the complete original. Only a canonical enclosing seal can
 * authenticate the image; this chunk supplies no financial or owner authority. */
export const PUBLIC_LEDGER_PNG_KEYWORD='receiz.ledger_proof_bundle';
export const PUBLIC_LEDGER_PNG_MAX_BYTES=24*1024*1024;
export const PUBLIC_LEDGER_PNG_SOURCE_MAX_BYTES=20*1024*1024;
const signature=new Uint8Array([137,80,78,71,13,10,26,10]),keyword=new TextEncoder().encode(PUBLIC_LEDGER_PNG_KEYWORD),MAX=PUBLIC_LEDGER_PNG_MAX_BYTES;
const table=Uint32Array.from({length:256},(_,index)=>{let c=index;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
function crc(bytes:Uint8Array){let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export const isPublicLedgerPng=(bytes:Uint8Array)=>signature.every((v,i)=>bytes[i]===v);
function chunks(bytes:Uint8Array){
 if(!isPublicLedgerPng(bytes)||bytes.length>MAX)throw Error('PUBLIC_LEDGER_IMAGE_INVALID');
 const result:{type:string;start:number;end:number;data:Uint8Array}[]=[];let offset=8,ended=false;
 while(offset<bytes.length){
  if(ended||offset+12>bytes.length)throw Error('PUBLIC_LEDGER_IMAGE_INVALID');
  const view=new DataView(bytes.buffer,bytes.byteOffset+offset),length=view.getUint32(0),end=offset+length+12;
  if(end>bytes.length||crc(bytes.subarray(offset+4,end-4))!==view.getUint32(length+8))throw Error('PUBLIC_LEDGER_IMAGE_INVALID');
  const type=new TextDecoder().decode(bytes.subarray(offset+4,offset+8)),data=bytes.subarray(offset+8,end-4);
  if(!result.length&&(type!=='IHDR'||data.length!==13))throw Error('PUBLIC_LEDGER_IMAGE_INVALID');
  if(type==='IEND'){if(length)throw Error('PUBLIC_LEDGER_IMAGE_INVALID');ended=true;}
  result.push({type,start:offset,end,data});offset=end;
 }
 if(!ended)throw Error('PUBLIC_LEDGER_IMAGE_INVALID');return result;
}
const reserved=(data:Uint8Array)=>data.length>keyword.length&&keyword.every((v,i)=>data[i]===v)&&data[keyword.length]===0;
/** Routing hint only, never a verifier verdict. A retained proof cannot be
 * ignored just because untrusted carrier metadata was relabelled as legacy. */
export function hasPublicLedgerPngProof(png:Uint8Array):boolean{
 const proofKeyword=new TextEncoder().encode('receiz.proof_bundle');
 return chunks(png).some(v=>['tEXt','iTXt','zTXt'].includes(v.type)&&v.data.length>proofKeyword.length&&proofKeyword.every((byte,i)=>v.data[i]===byte)&&v.data[proofKeyword.length]===0);
}
export function readPublicLedgerPng(png:Uint8Array):Uint8Array|null{
 const found=chunks(png).filter(v=>['tEXt','iTXt','zTXt'].includes(v.type)&&reserved(v.data));
 if(!found.length)return null;if(found.length!==1)throw Error('PUBLIC_LEDGER_IMAGE_DUPLICATE');
 const item=found[0],start=keyword.length+1;
 if(item.type==='zTXt')throw Error('PUBLIC_LEDGER_IMAGE_COMPRESSION_UNSUPPORTED');
 const skip=item.type==='iTXt'?4:0;
 if(item.data.length<=start+skip||skip&&item.data.subarray(start,start+skip).some(Boolean))throw Error('PUBLIC_LEDGER_IMAGE_INVALID');
 if(item.data.length-start-skip>PUBLIC_LEDGER_PNG_SOURCE_MAX_BYTES)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');
 return item.data.slice(start+skip);
}
export function embedPublicLedgerPng(png:Uint8Array,source:Uint8Array):Uint8Array{
 if(!source.length||source.length>PUBLIC_LEDGER_PNG_SOURCE_MAX_BYTES)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');
 const list=chunks(png);if(list.some(v=>['tEXt','iTXt','zTXt'].includes(v.type)&&reserved(v.data)))throw Error('PUBLIC_LEDGER_IMAGE_DUPLICATE');
 if(png.length+keyword.length+1+source.length+12>MAX)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');
 const data=new Uint8Array(keyword.length+1+source.length);data.set(keyword);data.set(source,keyword.length+1);
 const chunk=new Uint8Array(data.length+12),view=new DataView(chunk.buffer);view.setUint32(0,data.length);chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(data,8);view.setUint32(chunk.length-4,crc(chunk.subarray(4,-4)));
 const insertion=list.at(-1)!.start,result=new Uint8Array(png.length+chunk.length);
 result.set(png.subarray(0,insertion));result.set(chunk,insertion);result.set(png.subarray(insertion),insertion+chunk.length);return result;
}
