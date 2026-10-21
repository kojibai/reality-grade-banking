/** Validate the bounded carried EPUB ZIP before allocating decoded members.
 * No encrypted/ZIP64 entries, duplicate paths or overlapping local ranges. */
export function inspectBookArchive(bytes:Uint8Array):Map<string,{size:number;compressed:number;data:number;method:number;crc:number}>{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),bad=()=>{throw Error('This book archive cannot be opened safely. Save its original for an external reader.');};
 let end=-1;for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--)if(view.getUint32(at,true)===0x06054b50&&at+22+view.getUint16(at+20,true)===bytes.length){end=at;break;}
 if(end<0)return bad();const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count!==view.getUint16(end+8,true)||!count||count>2000||offset+size!==end)return bad();
 let cursor=offset,total=0;const names=new Map<string,{size:number;compressed:number;data:number;method:number;crc:number}>(),ranges:{from:number;to:number}[]=[];
 for(let index=0;index<count;index++){
  if(cursor+46>end||view.getUint32(cursor,true)!==0x02014b50)return bad();
  const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),compressed=view.getUint32(cursor+20,true),original=view.getUint32(cursor+24,true),nameSize=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),local=view.getUint32(cursor+42,true);
  if(flags&~0x0808||![0,8].includes(method)||original>8*1024*1024||compressed>bytes.length||(total+=original)>32*1024*1024||method===0&&compressed!==original||cursor+46+nameSize+extra+comment>end||local+30>offset||view.getUint32(local,true)!==0x04034b50||view.getUint16(local+6,true)!==flags||view.getUint16(local+8,true)!==method)return bad();
  const rawName=bytes.subarray(cursor+46,cursor+46+nameSize),name=new TextDecoder('utf-8',{fatal:true}).decode(rawName),localName=view.getUint16(local+26,true),data=local+30+localName+view.getUint16(local+28,true);
  if(!name||/[\\\x00-\x1f]/.test(name)||name.startsWith('/')||name.split('/').includes('..')||names.has(name)||localName!==nameSize||data+compressed>offset||rawName.some((v,i)=>v!==bytes[local+30+i]))return bad();
  if(!(flags&8)&&(view.getUint32(local+18,true)!==compressed||view.getUint32(local+22,true)!==original))return bad();
  names.set(name,{size:original,compressed,data,method,crc:view.getUint32(cursor+16,true)});ranges.push({from:local,to:data+compressed});cursor+=46+nameSize+extra+comment;
 }
 if(cursor!==end)return bad();ranges.sort((a,b)=>a.from-b.from);for(let i=1;i<ranges.length;i++)if(ranges[i].from<ranges[i-1].to)return bad();return names;
}

/** Format recognition only, after canonical payload verification. A generic
 * ZIP is never promoted to a book merely because its filename looks right. */
export function isEpubArchive(bytes:Uint8Array):boolean{
 if(bytes.length<30||bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)return false;
 try{const entries=inspectBookArchive(bytes),marker=entries.get('mimetype'),expected='application/epub+zip';return !!marker&&marker.method===0&&marker.size===expected.length&&!!entries.get('META-INF/container.xml')&&Array.from(expected).every((char,index)=>bytes[marker.data+index]===char.charCodeAt(0));}catch{return false;}
}

export async function openBookArchive(bytes:Uint8Array):Promise<Record<string,Uint8Array>>{
 const entries=inspectBookArchive(bytes),{Inflate}=await import('fflate'),output:Record<string,Uint8Array>=Object.create(null);
 const table=Uint32Array.from({length:256},(_,index)=>{let value=index;for(let i=0;i<8;i++)value=(value>>>1)^(value&1?0xedb88320:0);return value>>>0;});
 const crc=(value:Uint8Array)=>{let result=0xffffffff;for(const byte of value)result=table[(result^byte)&255]^(result>>>8);return(result^0xffffffff)>>>0;};
 let total=0;for(const [name,entry]of entries){
  let decoded:Uint8Array;
  if(entry.method===0)decoded=bytes.subarray(entry.data,entry.data+entry.compressed);
  else{
   const chunks:Uint8Array[]=[];let produced=0,complete=false;
   const inflater=new Inflate((chunk,final)=>{produced+=chunk.length;if(produced>entry.size||produced>8*1024*1024||total+produced>32*1024*1024)throw Error('The book decoded size exceeds its carried declaration.');chunks.push(new Uint8Array(chunk));if(final)complete=true;});
   // Bound each inflation call independently; never allocate according to an
   // untrusted originalSize or pass an entire compressed bomb to one push.
   for(let i=0;i<entry.compressed;i+=256)inflater.push(bytes.subarray(entry.data+i,entry.data+Math.min(i+256,entry.compressed)),i+256>=entry.compressed);
   if(!complete||produced!==entry.size)throw Error('The book decoded size does not match its carried declaration.');
   decoded=new Uint8Array(produced);let offset=0;for(const chunk of chunks){decoded.set(chunk,offset);offset+=chunk.length;}
  }
  total+=decoded.length;if(decoded.length!==entry.size||total>32*1024*1024||crc(decoded)!==entry.crc)throw Error('The book archive integrity is inconsistent.');output[name]=decoded;
 }return output;
}
