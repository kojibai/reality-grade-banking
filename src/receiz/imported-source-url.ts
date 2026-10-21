/** Closed public transport coordinate only. The serving verifier owns proof
 * admission; this parser grants no custody, identity or financial authority. */
export function safeImportedSourceUrl(value:unknown,resource:'any'|'artifact'|'media'='any'):string|null{
 if(typeof value!=='string'||value.length>8192||/[\x00-\x20\x7f\\]/.test(value))return null;
 try{
  const url=new URL(value,'https://receiz.com'),q=url.searchParams;
  if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash||url.pathname!=='/api/profile/showcase/imported-source'||[...q.keys()].some(key=>!['reference','payload','file','assetFile'].includes(key)||q.getAll(key).length!==1)||!q.has('reference'))return null;
  const selectors=['payload','file','assetFile'].filter(key=>q.has(key));
  if(selectors.length>1||resource==='artifact'&&selectors.length||resource==='media'&&!selectors.length||q.has('payload')&&q.get('payload')!=='1'||q.has('file')&&!/^[A-Za-z0-9_-]{1,100}$/.test(q.get('file')!)||q.has('assetFile')&&!/^[0-7]$/.test(q.get('assetFile')!))return null;
  const ref=JSON.parse(q.get('reference')!);
  // Transport syntax only. Keep this synchronous URL gate independent of the
  // cryptographic/custody runtime; the serving canonical verifier admits bytes.
  const bytes=ref?.bytes,safeLength=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
  if(!bytes||typeof bytes!=='object'||Array.isArray(bytes)||Object.keys(bytes).sort().join(',')!=='byteLength,contentByteLength,height,kind,sha256'||!['bytes','branch'].includes(bytes.kind)||typeof bytes.sha256!=='string'||! /^[a-f0-9]{64}$/.test(bytes.sha256)||!safeLength(bytes.byteLength)||bytes.byteLength>1048576||!safeLength(bytes.contentByteLength)||!safeLength(bytes.height)||bytes.height>53||bytes.kind==='bytes'&&(bytes.height!==0||bytes.contentByteLength!==bytes.byteLength)||bytes.kind==='branch'&&(bytes.height===0||bytes.byteLength===0||bytes.contentByteLength<2))return null;
  if(!ref||typeof ref!=='object'||Array.isArray(ref)||Object.keys(ref).sort().join(',')!=='artifactSha256,byteLength,bytes,filename,mimeType,schema'||ref.schema!=='receiz.imported-proof-source.v1'||! /^[a-f0-9]{64}$/.test(ref.artifactSha256)||!Number.isSafeInteger(ref.byteLength)||ref.byteLength<=0||typeof ref.filename!=='string'||!ref.filename||ref.filename.length>240||/[\x00-\x1f\x7f/\\]/.test(ref.filename)||typeof ref.mimeType!=='string'||ref.mimeType.length>120||! /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(ref.mimeType)||bytes.contentByteLength!==ref.byteLength)return null;
  return url.href;
 }catch{return null;}
}
