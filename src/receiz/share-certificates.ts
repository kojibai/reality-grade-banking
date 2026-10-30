import {nativeFetch} from './native-transport';
export type CertificateState={note:{noteToken:string;title:string;summary:string;status:'minted'|'claimed'|'void';mintedAt:string;claimedAt:string|null;originalShareQuantityMicro:string;remainingShareQuantityMicro:string;remainingCostBasisUsdCents:string;lastPriceUsdCents:string;verifyHref:string|null;externalHref:string|null;historyEvents:{kind:string;at:string;kaiUpulse:string|null;pulse:number|null;shareQuantityMicroDelta:string;costBasisUsdCentsDelta:string}[]};item:{id:string;assetId:string|null;title:string;summary:string;priceUsd:number;livePulseSeed?:unknown;verifyHref?:string|null;externalHref?:string|null};viewer:{signedIn:boolean;isOwner:boolean;canTrade:boolean;wallet:unknown;livePosition:unknown}};
const object=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('CERTIFICATE_SOURCE_INVALID');return v as Record<string,any>;};
const exact=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,19})$/.test(v);
export const certificateToken=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9._:-]{16,200}$/.test(v);
export function shareCertificatePath(token:string){if(!certificateToken(token))throw Error('CERTIFICATE_TOKEN_INVALID');return '/shares/'+encodeURIComponent(token)+'/';}
export function certificatePageToken(path:string):string|null{const m=/^\/shares\/([^/]+)\/?$/.exec(path);if(!m)return null;try{const t=decodeURIComponent(m[1]);return certificateToken(t)?t:null;}catch{return null;}}
export function certificateQuantity(raw:string,maximum?:string){const s=raw.trim();if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,6})?$/.test(s))throw Error('CERTIFICATE_QUANTITY_INVALID');const [w,f='']=s.replaceAll(',','').split('.'),n=BigInt(w)*1000000n+BigInt(f.padEnd(6,'0'));if(n<=0n||n>9223372036854775807n||maximum!==undefined&&n>BigInt(maximum))throw Error('CERTIFICATE_QUANTITY_INVALID');return String(n);}
const decimal=(n:string,scale=1000000n,digits=6)=>`${BigInt(n)/scale}.${String(BigInt(n)%scale).padStart(digits,'0')}`;
export function readCertificateState(raw:unknown,token:string):CertificateState{
 const r=object(raw),s=object(r.state),n=object(s.note),i=object(s.item),v=object(s.viewer);
 if(r.ok!==true||n.noteToken!==token||!certificateToken(token)||typeof n.title!=='string'||typeof i.id!=='string'||!i.id||i.id.length>512||!['minted','claimed','void'].includes(n.status)||!['originalShareQuantityMicro','remainingShareQuantityMicro','lastPriceUsdCents','remainingCostBasisUsdCents'].every(k=>exact(n[k]))||!Array.isArray(n.historyEvents)||n.historyEvents.length>10000||typeof v.isOwner!=='boolean'||typeof v.signedIn!=='boolean'||typeof v.canTrade!=='boolean')throw Error('CERTIFICATE_SOURCE_MISMATCH');
 return s as CertificateState;
}
const publicCertificateReads=new Map<string,Promise<CertificateState>>();
/** React replay and simultaneous public viewers share one bounded source read.
 * Each caller may stop observing; neither a refresh nor a UI cache grants shares. */
export async function fetchPublicCertificate(token:string,signal?:AbortSignal){
 if(!certificateToken(token))throw Error('CERTIFICATE_TOKEN_INVALID');signal?.throwIfAborted();
 let read=publicCertificateReads.get(token);
 if(!read){read=(async()=>{const response=await nativeFetch(`https://receiz.com/api/market/share-certificates/${encodeURIComponent(token)}`,{method:'GET',credentials:'omit'});if(!response.ok)throw Error(response.status===404?'CERTIFICATE_NOT_FOUND':'CERTIFICATE_UNAVAILABLE');return readCertificateState(await response.json(),token);})();publicCertificateReads.set(token,read);const held=read;void read.finally(()=>{if(publicCertificateReads.get(token)===held)publicCertificateReads.delete(token);}).catch(()=>{});}
 const result=await read;signal?.throwIfAborted();return result;
}
export type CertificateFile={token:string;marketItemId:string;filename:string;bytes:Uint8Array};
/** Enclosing canonical verification precedes projection of the PNG payload.
 * This file is ownership evidence; the authenticated owner authorizes deposit. */
const inspectedCertificates=new Map<string,CertificateFile>();
export async function inspectShareCertificate(file:File):Promise<CertificateFile>{
 if(!file.size||file.size>25*1024*1024)throw Error('CERTIFICATE_FILE_SIZE');const bytes=new Uint8Array(await file.arrayBuffer()),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const known=inspectedCertificates.get(digest);if(known)return{...known,bytes:known.bytes.slice()};
 const [{loadOfflineProofVerifier},{readPngTextChunks}]=await Promise.all([import('./ledger-offline-proof'),import('../../native/receiz/app/utils/pngChunks')]);
 const opened=await(await loadOfflineProofVerifier()).readArtifact(bytes,file.name);
 const chunks=readPngTextChunks(opened.payload.bytes,{maxCompressedBytes:25*1024*1024,maxTextBytes:25*1024*1024}).filter(c=>['market_share_note_v1','receiz_market_share_note'].includes(c.keyword));
 if(!chunks.length||chunks.length>2||chunks.some(c=>c.text!==chunks[0].text))throw Error('CERTIFICATE_FILE_INVALID');
 const p=object(JSON.parse(chunks[0].text)),market=object(p.market);if(p.kind!=='market_share_note_v1'||p.schema!=='receiz.market.share.certificate.v3'||!certificateToken(p.noteToken)||typeof market.itemId!=='string'||!market.itemId)throw Error('CERTIFICATE_FILE_INVALID');
 const result={token:p.noteToken,marketItemId:market.itemId,bytes,filename:file.name||'share-certificate.png'};
 while(inspectedCertificates.size&&(inspectedCertificates.size>=16||[...inspectedCertificates.values()].reduce((n,v)=>n+v.bytes.length,0)+bytes.length>64*1024*1024))inspectedCertificates.delete(inspectedCertificates.keys().next().value!);
 inspectedCertificates.set(digest,result);return{...result,bytes:bytes.slice()};
}
type Attempt={kind:'export'|'import'|'trade';accountUid:string;status:'pending'|'complete'|'rejected';body:Record<string,string>;token?:string;fileRef?:string;filename?:string;result?:unknown;artifactRef?:string;error?:string};
export type ShareCertificateCheckpoint={schema:'bank.share-certificates.v1';identityDigest:string;current:Attempt;history:Attempt[]};
export function readShareCertificateCheckpoint(raw:unknown,digest?:string):ShareCertificateCheckpoint|null{
 if(raw==null)return null;const s=object(raw);if(s.schema!=='bank.share-certificates.v1'||typeof s.identityDigest!=='string'||digest!==undefined&&s.identityDigest!==digest||!Array.isArray(s.history)||s.history.length>128)throw Error('CERTIFICATE_CHECKPOINT_INVALID');
 for(const a of [...s.history,s.current]){const v=object(a),b=object(v.body);if(!['export','import','trade'].includes(v.kind)||!['pending','complete','rejected'].includes(v.status)||typeof v.accountUid!=='string'||!v.accountUid||typeof b.clientNonce!=='string'||!/^[-A-Za-z0-9._:]{8,120}$/.test(b.clientNonce)||v.token!==undefined&&!certificateToken(v.token)||v.fileRef!==undefined&&!/^[a-f0-9]{64}$/.test(v.fileRef))throw Error('CERTIFICATE_CHECKPOINT_INVALID');}
 return s as ShareCertificateCheckpoint;
}
type Ports={identityDigest:string;assertOpen():void;guard():Promise<void>;lock<T>(work:()=>Promise<T>):Promise<T>;store:{read():Promise<unknown>;write(next:ShareCertificateCheckpoint,previous:unknown):Promise<void>};archive:{retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>};connect(readOnly?:boolean):Promise<{accountUid:string;fetch(path:string,init?:RequestInit):Promise<Response>}>;afterRecorded?(operation:{clientNonce:string;kind:string;token?:string}):Promise<void>;inspect?(file:File):Promise<CertificateFile>};
/** Owner-bound connected Market operations. Durable exact attempts survive a
 * lost response; an absent response never becomes permission for a new nonce. */
export function createShareCertificates(p:Ports){
 const owners=new Map<string,{accountUid:string;isOwner:boolean;marketItemId:string}>();
 const inspect=p.inspect??inspectShareCertificate,read=async()=>readShareCertificateCheckpoint(await p.store.read(),p.identityDigest);
 async function responseJson(response:Response,uid:string){if(response.headers.get('x-receiz-actor-user')!==uid)throw Error('CERTIFICATE_ACCOUNT_MISMATCH');return object(await response.json());}
 async function run(state:ShareCertificateCheckpoint){
  const a=state.current,connection=await p.connect();p.assertOpen();if(connection.accountUid!==a.accountUid)throw Error('CERTIFICATE_ACCOUNT_MISMATCH');
  try{
   let response:Response,result:unknown,artifactRef:string|undefined,token=a.token;
   if(a.kind==='export')response=await connection.fetch('/api/connect/market/shares/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a.body)});
   else if(a.kind==='import'){const bytes=await p.archive.restore(a.fileRef!),form=new FormData();form.set('file',new File([new Uint8Array(bytes)],a.filename??'share-certificate.png',{type:'image/png'}));for(const[k,v]of Object.entries(a.body))form.set(k,v);response=await connection.fetch('/api/connect/market/shares/import',{method:'POST',body:form});}
   else response=await connection.fetch(`/api/connect/market/share-certificates/${encodeURIComponent(a.token!)}/trade`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(a.body)});
   p.assertOpen();if(response.headers.get('x-receiz-actor-user')!==a.accountUid)throw Error('CERTIFICATE_ACCOUNT_MISMATCH');
   if(!response.ok){const failed=object(await response.json());const closed=failed.outcome?.status==='not-sent'&&failed.outcome.clientNonce===a.body.clientNonce&&failed.outcome.noteToken===a.token;
    const next={...state,current:{...a,status:closed?'rejected' as const:'pending' as const,...(closed?{result:failed.outcome}:{}),error:String(failed.error??'CERTIFICATE_UNAVAILABLE')}};await p.store.write(next,state);return next.current;
   }
   if(a.kind==='export'){
    const file=await inspect(new File([await response.arrayBuffer()],'share-certificate.png',{type:'image/png'}));
    if(file.marketItemId!==a.body.marketItemId||response.headers.get('x-receiz-share-certificate')!==file.token)throw Error('CERTIFICATE_SOURCE_MISMATCH');
    token=file.token;artifactRef=await p.archive.retain(file.bytes);result={noteToken:token,marketItemId:file.marketItemId,filename:file.filename};
   }else if(a.kind==='trade'){const raw=await responseJson(response,a.accountUid);result=readCertificateState(raw,a.token!);}
   else{const raw=await responseJson(response,a.accountUid),r=object(raw.imported);if(raw.ok!==true||!exact(r.importedShareQuantityMicro)||BigInt(r.importedShareQuantityMicro)<=0n)throw Error('CERTIFICATE_IMPORT_MISMATCH');result=r;}
   const next:ShareCertificateCheckpoint={...state,current:{...a,status:'complete',token,result,artifactRef}};await p.store.write(next,state);p.assertOpen();try{await p.afterRecorded?.({clientNonce:a.body.clientNonce,kind:a.kind,token});}catch{/* Accepted result is retained before refresh. */}return next.current;
  }catch{p.assertOpen();return a;}
 }
 async function start(attempt:Omit<Attempt,'accountUid'|'status'>){return p.lock(async()=>{p.assertOpen();await p.guard();const previous=await read();if(previous?.current.status==='pending')throw Error('CERTIFICATE_OPERATION_PENDING');const connection=await p.connect();p.assertOpen();const next:ShareCertificateCheckpoint={schema:'bank.share-certificates.v1',identityDigest:p.identityDigest,current:{...attempt,accountUid:connection.accountUid,status:'pending'},history:previous?[...previous.history,previous.current].slice(-128):[]};await p.store.write(next,previous);return run(next);});}
 return Object.freeze({
  status:async()=>{p.assertOpen();return(await read())?.current??null;},
  cancel:()=>p.lock(async()=>{p.assertOpen();const s=await read();if(!s)throw Error('CERTIFICATE_OPERATION_REQUIRED');if(s.current.status!=='pending')return s.current;const a=s.current,c=await p.connect();if(c.accountUid!==a.accountUid)throw Error('CERTIFICATE_ACCOUNT_MISMATCH');const response=await c.fetch('/api/connect/market/share-certificates/operations/close',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:a.kind,body:a.body,...(a.token?{noteToken:a.token}:{})})}),v=await responseJson(response,c.accountUid);if(!response.ok||v.ok!==true)throw Error('CERTIFICATE_CLOSURE_UNAVAILABLE');if(v.outcome?.closed===true&&v.outcome.clientNonce===a.body.clientNonce&&v.outcome.kind===a.kind){const next:ShareCertificateCheckpoint={...s,current:{...a,status:'rejected',result:v.outcome,error:'Operation canceled before any shares moved.'}};await p.store.write(next,s);return next.current;}return run(s);}),
  resume:()=>p.lock(async()=>{p.assertOpen();const s=await read();if(!s)throw Error('CERTIFICATE_OPERATION_REQUIRED');return s.current.status==='pending'?run(s):s.current;}),
  async list(cursor?:string){const c=await p.connect(true),r=await c.fetch('/api/connect/market/share-certificates'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{method:'GET'}),v=await responseJson(r,c.accountUid);if(!r.ok||v.ok!==true||v.actorUserId!==c.accountUid||!Array.isArray(v.certificates)||v.certificates.some((n:any)=>!certificateToken(n.note_token)||!exact(n.remaining_share_quantity_micro)))throw Error('CERTIFICATE_LIST_UNAVAILABLE');return v as {certificates:{id:string;note_token:string;market_item_id:string;title:string;status:string;remaining_share_quantity_micro:string;created_at:string}[];nextCursor:string|null};},
  async state(token:string){if(!certificateToken(token))throw Error('CERTIFICATE_TOKEN_INVALID');const c=await p.connect(true),r=await c.fetch('/api/connect/market/share-certificates/'+encodeURIComponent(token),{method:'GET'});const value=readCertificateState(await responseJson(r,c.accountUid),token);owners.set(token,{accountUid:c.accountUid,isOwner:value.viewer.isOwner,marketItemId:value.item.id});return value;},
  export:(marketItemId:string,quantityMicro:string)=>{if(!exact(quantityMicro)||BigInt(quantityMicro)<=0n)throw Error('CERTIFICATE_QUANTITY_INVALID');return start({kind:'export',body:{marketItemId,shareQuantity:decimal(quantityMicro),clientNonce:crypto.randomUUID()}});},
  async import(file:File,quantityMicro?:string){const f=await inspect(file),connection=await p.connect(true);let owner=owners.get(f.token);if(!owner||owner.accountUid!==connection.accountUid){await this.state(f.token);owner=owners.get(f.token);}if(!owner?.isOwner)throw Error('CERTIFICATE_OWNER_REQUIRED');if(owner.marketItemId!==f.marketItemId||quantityMicro!==undefined&&(!exact(quantityMicro)||BigInt(quantityMicro)<=0n))throw Error('CERTIFICATE_SOURCE_MISMATCH');const ref=await p.archive.retain(f.bytes);return start({kind:'import',token:f.token,fileRef:ref,filename:f.filename,body:{clientNonce:crypto.randomUUID(),...(quantityMicro?{shareQuantity:decimal(quantityMicro)}:{})}});},
  trade:(token:string,side:'buy'|'sell',amount:string,byShares=false)=>{if(!certificateToken(token)||!exact(amount)||BigInt(amount)<=0n||!['buy','sell'].includes(side)||side==='buy'&&byShares)throw Error('CERTIFICATE_TRADE_INVALID');return start({kind:'trade',token,body:{side,clientNonce:crypto.randomUUID(),...(byShares?{shareQuantity:decimal(amount)}:{amountUsd:decimal(amount,100n,2)})}});},
  async download(token:string){if(!certificateToken(token))throw Error('CERTIFICATE_TOKEN_INVALID');const c=await p.connect(true),response=await c.fetch('/api/connect/market/share-certificates/'+encodeURIComponent(token)+'/download',{method:'GET'});if(!response.ok||response.headers.get('x-receiz-actor-user')!==c.accountUid)throw Error('CERTIFICATE_DOWNLOAD_UNAVAILABLE');const f=await inspect(new File([await response.arrayBuffer()],'share-certificate.png',{type:'image/png'}));if(f.token!==token)throw Error('CERTIFICATE_SOURCE_MISMATCH');await p.archive.retain(f.bytes);return f;},
  async artifact(){const a=(await read())?.current;if(a?.status!=='complete'||!a.artifactRef)throw Error('CERTIFICATE_FILE_REQUIRED');return{bytes:await p.archive.restore(a.artifactRef),filename:'share-certificate.png',token:a.token!};},
 });
}
export type ShareCertificates=ReturnType<typeof createShareCertificates>;
