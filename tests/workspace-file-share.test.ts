import {beforeAll,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createWorkspaceFileShare,readWorkspaceFile} from '../src/receiz/workspace-file-share';
import type {NativeMessaging,ChatNativeMessage} from '../src/receiz/native-messaging';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {createOwnerDocumentWorkspace} from '../src/receiz/owner-document-workspace';
import {createProofLibrary,type ProofLibrary,type ProofSource} from '../src/receiz/proof-library';
import type {RecordProofExportInput} from '../src/receiz/record-proof-export';
const sdk=vi.hoisted(()=>({runtime:null as unknown}));vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>sdk.runtime}));
const uid='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',thread='33333333-3333-4333-8333-333333333333';
const sourceThreadKey=`api:${uid}:${thread}`,foreignThreadKey=`api:${uid}:${peer}`;
let original:File,foreignOriginal:File,payload:File,binding:{keyId:string;artifactOwnerReceizId:string},library:ProofLibrary;
const sourceIndexes=new Map<string,unknown>();
beforeAll(async()=>{
 const f=await conformanceOfflineFixture({account:true});sdk.runtime=f.runtime;const admission=await f.runtime.createReceizArtifactAdmissionEngine()(await f.runtime.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});binding=await f.runtime.readReceizIdentityPublicBinding(admission);
 const sealer=f.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NO_NETWORK');}});let archive:ProofSource[]=[];
 library=createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>archive,readRecoveries:async()=>[],readNotes:async()=>[],commit:async sources=>{archive=[...archive,...sources];return{added:sources.length,alreadyHeld:0};}});
 const identity={binding,proofLibrary:async()=>library,sealRecordExport:async(input:RecordProofExportInput)=>{const sealed=await sealer.seal({bytes:input.bytes,filename:input.filename,mimeType:input.mimeType});return new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType});}} as unknown as OpenIdentity;
 const api={accountUid:uid,knownOwnerDocumentWork:(key:string)=>structuredClone(sourceIndexes.get(key)??null),saveOwnerDocumentWork:async(key:string,value:unknown)=>{sourceIndexes.set(key,structuredClone(value));}} as unknown as NativeMessaging;
 for(const key of [sourceThreadKey,foreignThreadKey]){
  const work=createOwnerDocumentWorkspace({identity,api,threadKey:key,context:[],isCurrent:()=>true});work.updateDraft({kind:'document',title:key===sourceThreadKey?'Project handover':'Other relationship',summary:'Complete privately created work.',sections:[],tables:[]});work.setFormat('docx');await work.preview();expect(work.snapshot().phase,work.snapshot().error).toBe('ready');await work.send();expect(work.snapshot().phase,work.snapshot().error).toBe('created');
  if(key===sourceThreadKey){original=work.snapshot().original!;payload=work.snapshot().payload!;}else foreignOriginal=work.snapshot().original!;
 }
},60000);
function fixture(){let retained:unknown=null,current=true;const rows:ChatNativeMessage[]=[],order:string[]=[];const api={accountUid:uid,knownProposalDraft:()=>retained,saveProposalDraft:vi.fn(async(_id:string,value:unknown)=>{order.push('save:'+String((value as any)?.workspaceFiles?.stage));retained=structuredClone(value);}),uploadAttachment:vi.fn(async(_id:string,file:File)=>{order.push('upload');const {openCanonicalProofFile}=await import('../src/receiz/proof-capture'),opened=await openCanonicalProofFile(file);return{conversationId:thread,name:file.name,mime:file.type,size:file.size,sha256Hex:opened.sealedArtifact.artifactSha256};}),send:vi.fn(async(_id:string,body:string,options:any)=>{order.push('send');const row={id:crypto.randomUUID(),conversationId:thread,senderKind:'user',senderUserId:uid,senderDisplay:'Owner',senderAiId:null,body,createdAt:new Date().toISOString(),receizedAt:new Date().toISOString(),receipt:null,sealedOriginalAvailable:true,walletTransfer:{kind:'chat_attachment',...options.attachment}} as ChatNativeMessage;rows.push(row);return row;}),messages:vi.fn(async()=>({messages:rows,conversation:{id:thread},hasMore:false,nextCursor:null})),attachment:vi.fn(async()=>original)} as unknown as NativeMessaging;
 (api as any).knownOwnerDocumentWork=(key:string)=>structuredClone(sourceIndexes.get(key)??null);
 const identity={binding,proofLibrary:async()=>library,sealRecordExport:vi.fn(async()=>{throw Error('SHARE_MUST_NOT_SEAL');})} as unknown as OpenIdentity;return{api,identity,rows,order,held:()=>retained,setHeld:(v:unknown)=>{retained=v;},leave:()=>{current=false;},reenter:()=>{current=true;},create:()=>createWorkspaceFileShare({api,identity,conversationId:thread,sourceThreadKey,isCurrent:()=>current})};}
it('previews without sending, then checkpoints and shares the exact reviewed owned Original',async()=>{const f=fixture(),s=f.create();await s.prepare(original,'Project handover');expect(s.snapshot().phase).toBe('review');expect(new Uint8Array(await s.snapshot().reviewed!.payload.arrayBuffer())).toEqual(new Uint8Array(await payload.arrayBuffer()));expect(f.api.uploadAttachment).not.toHaveBeenCalled();await s.send();expect(s.snapshot().phase).toBe('sent');expect(f.order).toEqual(['save:upload','upload','save:send','send','save:undefined']);expect((f.api.uploadAttachment as any).mock.calls[0][1]).toBe(original);expect((f.api.uploadAttachment as any).mock.calls[0][3]).toEqual({preserveOriginal:true});expect(readWorkspaceFile(f.rows[0])?.title).toBe('Project handover');expect(f.identity.sealRecordExport).not.toHaveBeenCalled();});
it('preserves other composers and activity/signature journals while clearing only its share attempt',async()=>{const f=fixture(),base={schema:'bankeiz.proposal-composer.v1',conversationId:thread,activityAttempts:{keep:'yes'},documentComposer:{title:'Keep'},documentSignatureAttempts:{keep:'also'}};f.setHeld(base);const s=f.create();await s.prepare(original,'Work');await s.send();expect(f.held()).toEqual(base);});
it('refuses missing durable custody before any upload',async()=>{const f=fixture();(f.api.saveProposalDraft as any).mockRejectedValueOnce(Error('Storage unavailable'));const s=f.create();await s.prepare(original,'Work');await s.send();expect(f.api.uploadAttachment).not.toHaveBeenCalled();expect(s.snapshot().phase).toBe('unknown');});
it('refuses a changed upload digest and never posts a message',async()=>{const f=fixture();(f.api.uploadAttachment as any).mockResolvedValueOnce({conversationId:thread,name:original.name,mime:original.type,size:original.size,sha256Hex:'f'.repeat(64)});const s=f.create();await s.prepare(original,'Work');await s.send();expect(f.api.send).not.toHaveBeenCalled();expect(s.snapshot().phase).toBe('unknown');});
it('stops after a relationship closes during upload',async()=>{const f=fixture(),upload=f.api.uploadAttachment;(f.api as any).uploadAttachment=vi.fn(async(...args:any[])=>{const result=await(upload as any)(...args);f.leave();return result;});const s=f.create();await s.prepare(original,'Work');await s.send();expect(f.api.send).not.toHaveBeenCalled();});
it('reconciles a lost send response after a cold reopen without uploading or sending again',async()=>{const f=fixture(),send=f.api.send;(f.api as any).send=vi.fn(async(...args:any[])=>{await(send as any)(...args);throw Error('Lost response');});const s=f.create();await s.prepare(original,'Work');await s.send();expect(s.snapshot().phase).toBe('unknown');const uploadCount=(f.api.uploadAttachment as any).mock.calls.length,reopened=f.create();await reopened.check();expect(reopened.snapshot().phase).toBe('sent');expect((f.api.uploadAttachment as any).mock.calls.length).toBe(uploadCount);expect(f.api.send).toHaveBeenCalledOnce();});
it('recovers an upload-only attempt as an explicit same-Original share, never an automatic send',async()=>{const f=fixture();(f.api.uploadAttachment as any).mockRejectedValueOnce(Error('Lost upload'));const s=f.create();await s.prepare(original,'Work');await s.send();const cold=f.create();await cold.check();expect(cold.snapshot().phase).toBe('ready-share');expect(f.api.send).not.toHaveBeenCalled();await cold.send();expect(cold.snapshot().phase).toBe('sent');});
it('rejects raw payloads, foreign owners and changed native message bindings',async()=>{const f=fixture(),s=f.create();await s.prepare(new File(['raw'],'work.txt',{type:'text/plain'}),'Work');expect(s.snapshot().phase).toBe('error');const foreign=createWorkspaceFileShare({api:f.api,identity:{...f.identity,binding:{artifactOwnerReceizId:'foreign'}} as OpenIdentity,conversationId:thread,sourceThreadKey,isCurrent:()=>true});await foreign.prepare(original,'Work');expect(foreign.snapshot().phase).toBe('error');await s.prepare(original,'Work');await s.send();expect(readWorkspaceFile({...f.rows[0],senderUserId:peer})).toBeNull();expect(readWorkspaceFile({...f.rows[0],conversationId:peer})).toBeNull();});
it('keeps an invalid retained journal unavailable without crashing the rest of the workspace',()=>{const f=fixture();f.setHeld({schema:'unexpected',conversationId:thread,workspaceFiles:{stage:'send'}});expect(()=>f.create()).not.toThrow();expect(f.create().snapshot().phase).toBe('unknown');});

function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return{promise,resolve};}
it('invalidates the old upload when the same relationship reopens before its response',async()=>{
 const f=fixture(),upload=f.api.uploadAttachment,started=deferred(),release=deferred();
 (f.api.uploadAttachment as any).mockImplementationOnce(async(...args:any[])=>{const result=await(upload as any).getMockImplementation()!(...args);started.resolve();await release.promise;return result;});
 const old=f.create();await old.prepare(original,'Work');const sending=old.send();await started.promise;f.leave();f.reenter();const reopened=f.create();await reopened.check();expect(reopened.snapshot().phase).toBe('ready-share');
 release.resolve();await sending;expect(f.api.send).not.toHaveBeenCalled();await reopened.send();expect(reopened.snapshot().phase).toBe('sent');expect(f.api.send).toHaveBeenCalledOnce();
});

it.each(['upload','send'] as const)('never overwrites a superseding journal when an old %s returns',async stage=>{
 const f=fixture(),started=deferred(),release=deferred(),method=stage==='upload'?f.api.uploadAttachment:f.api.send,implementation=(method as any).getMockImplementation()!;
 (method as any).mockImplementationOnce(async(...args:any[])=>{const result=await implementation(...args);started.resolve();await release.promise;return result;});
 const work=f.create();await work.prepare(original,'Work');const sending=work.send();await started.promise;
 const retained=structuredClone(f.held()) as any;retained.workspaceFiles.file.id=crypto.randomUUID();retained.workspaceFiles.body='Bankeiz workspace file\n'+JSON.stringify(retained.workspaceFiles.file);retained.workspaceFiles.stage='upload';retained.documentComposer={title:'New sibling work'};f.setHeld(retained);
 release.resolve();await sending;expect(f.held()).toEqual(retained);expect(work.snapshot().phase).toBe('unknown');expect((f.api.send as any).mock.calls.length).toBe(stage==='upload'?0:1);
});

it('does not advance an upload whose retained attempt already changed stage',async()=>{
 const f=fixture(),implementation=(f.api.uploadAttachment as any).getMockImplementation()!,started=deferred(),release=deferred();
 (f.api.uploadAttachment as any).mockImplementationOnce(async(...args:any[])=>{const result=await implementation(...args);started.resolve();await release.promise;return result;});
 const work=f.create();await work.prepare(original,'Work');const sending=work.send();await started.promise;const retained=structuredClone(f.held()) as any;retained.workspaceFiles.stage='send';f.setHeld(retained);release.resolve();await sending;
 expect(f.held()).toEqual(retained);expect(f.api.send).not.toHaveBeenCalled();
});

it('refuses an owned Original created for a different relationship before sharing',async()=>{
 const f=fixture(),work=f.create();await work.prepare(foreignOriginal,'Other relationship');expect(work.snapshot().phase).toBe('error');expect(work.snapshot().reviewed).toBeNull();expect(f.api.uploadAttachment).not.toHaveBeenCalled();
});

it('refuses an upload-only recovery substituted with another relationship’s owned output',async()=>{
 const f=fixture();(f.api.uploadAttachment as any).mockRejectedValueOnce(Error('Lost upload'));const work=f.create();await work.prepare(original,'Work');await work.send();
 const retained=structuredClone(f.held()) as any,foreign=(sourceIndexes.get(foreignThreadKey) as any).outputs[0];retained.workspaceFiles.file.artifactSha256=foreign.artifactSha256;retained.workspaceFiles.body='Bankeiz workspace file\n'+JSON.stringify(retained.workspaceFiles.file);retained.workspaceFiles.filename=foreignOriginal.name;retained.workspaceFiles.mime=foreignOriginal.type;retained.workspaceFiles.size=foreignOriginal.size;f.setHeld(retained);
 const reopened=f.create();await reopened.check();expect(reopened.snapshot().phase).toBe('unknown');expect(reopened.snapshot().reviewed).toBeNull();expect(f.held()).toEqual(retained);expect(f.api.send).not.toHaveBeenCalled();
});

it('keeps a matching posted result unresolved when its selected relationship output is unavailable',async()=>{
 const f=fixture(),send=(f.api.send as any).getMockImplementation()!;(f.api.send as any).mockImplementationOnce(async(...args:any[])=>{await send(...args);throw Error('Lost response');});
 const work=f.create();await work.prepare(original,'Work');await work.send();expect(f.rows).toHaveLength(1);const retained=structuredClone(f.held());
 (f.api as any).knownOwnerDocumentWork=()=>null;const reopened=f.create();await reopened.check();expect(reopened.snapshot().phase).toBe('unknown');expect(reopened.snapshot().message).toBeNull();expect(f.held()).toEqual(retained);expect(f.api.send).toHaveBeenCalledOnce();
});

it('requires the selected relationship’s exact owner document thread',()=>{
 const f=fixture();for(const key of [undefined,`api:${uid}`,foreignThreadKey,`api:${peer}:${thread}`])expect(()=>createWorkspaceFileShare({identity:f.identity,api:f.api,conversationId:thread,sourceThreadKey:key,isCurrent:()=>true} as Parameters<typeof createWorkspaceFileShare>[0])).toThrow('WORKSPACE_FILE_CONTEXT_INVALID');
});
