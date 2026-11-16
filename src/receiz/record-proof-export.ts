import type {createReceizOfflineSealer} from '@receiz/sdk/offline';

export type RecordProofExportInput={bytes:Uint8Array;filename:string;mimeType:string;recordHash?:string};
export type RecordProofExportDescriptor=Readonly<{recordHash:string;payloadSha256:string;filename:string;mimeType:string}>;
export type RecordProofExportCheckpoint={schema:'bankeiz.local-record-export.v1';recordHash:string;payloadSha256:string;filename:string;mimeType:string;artifact:{digest:string;filename:string;mimeType:string;size:number}};
type Sealer=Pick<ReturnType<typeof createReceizOfflineSealer>,'seal'>;
type Ports={assertOpen():void;seal:Sealer['seal'];read(key:string):Promise<unknown>;write(key:string,next:RecordProofExportCheckpoint,previous:unknown):Promise<void>;retain(bytes:Uint8Array):Promise<string>;restore(digest:string):Promise<Uint8Array>;exclusive?<T>(key:string,work:()=>Promise<T>):Promise<T>};
const MAX=32*1024*1024,COMPLETED_FILES=4,COMPLETED_BYTES=8*1024*1024,HEX=/^[a-f0-9]{64}$/;
const name=(v:unknown):v is string=>typeof v==='string'&&!!v&&v.length<=240&&!/[\x00-\x1f\x7f/\\]/.test(v);
const mime=(v:unknown):v is string=>typeof v==='string'&&!!v&&v.length<=160&&!/[\x00-\x1f\x7f]/.test(v);
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function descriptor(input:RecordProofExportDescriptor):RecordProofExportDescriptor{
 const selected={recordHash:input.recordHash,payloadSha256:input.payloadSha256,filename:input.filename,mimeType:input.mimeType};
 if(typeof selected.recordHash!=='string'||typeof selected.payloadSha256!=='string'||!HEX.test(selected.recordHash)||!HEX.test(selected.payloadSha256)||!name(selected.filename)||!mime(selected.mimeType))throw Error('RECORD_PROOF_INPUT_INVALID');return selected;
}
const descriptorKey=(selected:RecordProofExportDescriptor)=>hash(new TextEncoder().encode(JSON.stringify(selected)));
/** Local record capture only. SDK seal verification supplies the enclosing
 * proof; this private index supplies neither Source nor financial admission. */
export function createRecordProofExports(ports:Ports){
 type Attempt={source:RecordProofExportInput&{recordHash:string};payloadSha256:string;sealed?:{bytes:Uint8Array;filename:string;mimeType:string};digest?:string;work?:Promise<File>;file?:File};
 const attempts=new Map<string,Attempt>();
 function trimCompleted(){
  const completed=[...attempts].filter(([,attempt])=>attempt.file&&!attempt.work);let count=completed.length,bytes=completed.reduce((total,[,attempt])=>total+attempt.file!.size,0);
  for(const [key,attempt]of completed){if(count<=COMPLETED_FILES&&bytes<=COMPLETED_BYTES)break;attempts.delete(key);count--;bytes-=attempt.file!.size;}
 }
 async function restore(raw:unknown,selected:RecordProofExportDescriptor){
  const state=raw as RecordProofExportCheckpoint,a=state?.artifact;
  if(state?.schema!=='bankeiz.local-record-export.v1'||state.recordHash!==selected.recordHash||state.payloadSha256!==selected.payloadSha256||state.filename!==selected.filename||state.mimeType!==selected.mimeType||!a||typeof a.digest!=='string'||!HEX.test(a.digest)||!name(a.filename)||!mime(a.mimeType)||!Number.isSafeInteger(a.size)||a.size<=0||a.size>MAX)throw Error('RECORD_PROOF_CHECKPOINT_INVALID');
  const bytes=await ports.restore(a.digest);ports.assertOpen();if(bytes.length!==a.size||await hash(bytes)!==a.digest)throw Error('RECORD_PROOF_SOURCE_MISMATCH');ports.assertOpen();return new File([new Uint8Array(bytes)],a.filename,{type:a.mimeType});
 }
 async function settle(key:string,attempt:Attempt,existingOnly=false){
  const selected=descriptor({...attempt.source,payloadSha256:attempt.payloadSha256});
  ports.assertOpen();const previous=await ports.read(key);ports.assertOpen();if(previous!==null&&previous!==undefined)return restore(previous,selected);
  if(existingOnly)throw Error('ORIGINAL_NOT_SUPPLIED');
  if(!attempt.sealed){
   const sealed=await ports.seal({bytes:new Uint8Array(attempt.source.bytes),filename:attempt.source.filename,mimeType:attempt.source.mimeType});ports.assertOpen();
   if(!sealed?.verification?.ok||!(sealed.artifactBytes instanceof Uint8Array)||!sealed.artifactBytes.length||sealed.artifactBytes.length>MAX||!name(sealed.filename)||!mime(sealed.mimeType))throw Error('RECORD_PROOF_SEAL_INVALID');
   attempt.sealed={bytes:new Uint8Array(sealed.artifactBytes),filename:sealed.filename,mimeType:sealed.mimeType};
  }
  const sealed=attempt.sealed;
  if(!attempt.digest){const expected=await hash(sealed.bytes);ports.assertOpen();const digest=await ports.retain(sealed.bytes);ports.assertOpen();if(digest!==expected)throw Error('RECORD_PROOF_SOURCE_MISMATCH');attempt.digest=digest;}
  const next:RecordProofExportCheckpoint={schema:'bankeiz.local-record-export.v1',recordHash:attempt.source.recordHash,payloadSha256:attempt.payloadSha256,filename:attempt.source.filename,mimeType:attempt.source.mimeType,artifact:{digest:attempt.digest,filename:sealed.filename,mimeType:sealed.mimeType,size:sealed.bytes.length}};
  try{await ports.write(key,next,previous);}catch(error){ports.assertOpen();const accepted=await ports.read(key);ports.assertOpen();if(accepted===null||accepted===undefined)throw error;return restore(accepted,selected);}
  ports.assertOpen();return new File([new Uint8Array(sealed.bytes)],sealed.filename,{type:sealed.mimeType});
 }
 async function select(input:RecordProofExportInput,existingOnly=false):Promise<File>{
  ports.assertOpen();const snapshot={bytes:input.bytes,filename:input.filename,mimeType:input.mimeType,recordHash:input.recordHash};
  if(!(snapshot.bytes instanceof Uint8Array)||!snapshot.bytes.length||snapshot.bytes.length>MAX||!name(snapshot.filename)||!mime(snapshot.mimeType)||(snapshot.recordHash!==undefined&&!HEX.test(snapshot.recordHash)))throw Error('RECORD_PROOF_INPUT_INVALID');
  const copied={...snapshot,bytes:new Uint8Array(snapshot.bytes)},payloadSha256=await hash(copied.bytes);ports.assertOpen();const source={...copied,recordHash:copied.recordHash??payloadSha256};const key=await descriptorKey(descriptor({...source,payloadSha256}));ports.assertOpen();
  let attempt=attempts.get(key);if(!attempt){attempt={source,payloadSha256};attempts.set(key,attempt);}if(attempt.file){attempts.delete(key);attempts.set(key,attempt);return attempt.file;}if(attempt.work)return attempt.work;
  const selected=attempt,work=(ports.exclusive?ports.exclusive(key,()=>settle(key,selected,existingOnly)):settle(key,selected,existingOnly)).then(file=>{ports.assertOpen();selected.file=file;return file;});selected.work=work;
  void work.finally(()=>{if(selected.work===work){selected.work=undefined;if(selected.file){selected.source.bytes=new Uint8Array();selected.sealed=undefined;selected.digest=undefined;trimCompleted();}else if(!selected.sealed)attempts.delete(key);}}).catch(()=>{});return work;
 }
 return{export:(input:RecordProofExportInput)=>select(input),
  /** File saving can only reopen already-retained bytes. It must never turn
   * a missing historical Original into a newly sealed display export. */
  read:(input:RecordProofExportInput)=>select(input,true),
  /** Exact index lookup after a completed SDK seal. This reads existing custody
   * only; the caller still opens the complete returned Original with the SDK. */
  async readDescriptor(input:RecordProofExportDescriptor):Promise<File|null>{
   ports.assertOpen();const selected=descriptor(input),key=await descriptorKey(selected);ports.assertOpen();const raw=await ports.read(key);ports.assertOpen();return raw===null||raw===undefined?null:restore(raw,selected);
  }};
}
