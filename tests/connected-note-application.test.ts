import {expect,it,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import {createConnectedNoteApplication,type ConnectedNoteModule} from '../src/receiz/connected-note-application';
import type {ReceizKeyFile} from '@receiz/sdk';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 vi.stubGlobal('navigator',{onLine:true});vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 const uid='11111111-1111-4111-8111-111111111111',keyId='a'.repeat(64),noteId='22222222-2222-4222-8222-222222222222',op='b'.repeat(64),key={keyId}as ReceizKeyFile;
 let state:unknown=null,authorization:any;const blobs=new Map<string,Uint8Array>(),source=new Uint8Array([1,2]),opening=new Uint8Array([3]);
 const request=vi.fn(async(_path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>}):Promise<unknown>=>_path.endsWith('intent=quote')?{ok:true,quote:{quotePulse:'20',issuedAtMs:1000000,expiresAtMs:1300000,usdPerPhiMicrocents:'100000000',reserveUsdCents:'600',balancePhiMicro:'6000000',settlementPhiMicro:'0'}}:options.method==='GET'?{ok:true,found:false}:{ok:true,source:Buffer.from(source).toString('base64url'),privateAccountOpening:Buffer.from(opening).toString('base64url')});
 const wallet=vi.fn(async()=>({ok:true,wallet:{userId:uid,balanceUsd:'6.00',balancePhiMicro:'6000000',valueStates:{settledBalanceUsdCents:'600',ecosystemBalanceUsdCents:'0'},sync:{},rollup:{},quote:{usdPerPhiMicrocents:'100000000'}}}));
 const createKey=vi.fn(async()=>({keyFile:{keyId:'c'.repeat(64)}as ReceizKeyFile}));
 const module={createBankConnectedNoteIssue:vi.fn(async(input:any)=>authorization={...input,noteAuthority:{keyId:'c'.repeat(64)},noteId,operationId:op,amountPhiMicro:input.amountPhiMicro??null}),verifyBankConnectedNoteFunding:vi.fn(async()=>({kind:'funding',rail:authorization.rail,noteId,amountUsdCents:authorization.amountUsdCents,amountPhiMicro:'1000000',funding:{...authorization,issuer:{keyId},accountUserId:uid,usdPerPhiMicrocents:'200000000'},accountAfter:{}})),readBankConnectedNoteSource:vi.fn(async()=>({rail:'reserve',noteId,amountUsdCents:'200',amountPhiMicro:'1000000'})),exportBankConnectedNoteImage:vi.fn(async()=>new Uint8Array([4]))}as unknown as ConnectedNoteModule;
 const runtime=createConnectedNoteApplication({uid,keyId,assertOpen(){},read:async()=>structuredClone(state),write:async(next,previous)=>{expect(previous).toEqual(state);state=structuredClone(next);},retain:async b=>{const ref=createHash('sha256').update(b).digest('hex');blobs.set(ref,b.slice());return ref;},restore:async ref=>blobs.get(ref)!.slice(),module:async()=>module,context:async()=>({uid,identity:key,passphrase:'retained',request,wallet}),sdk:{createReceizIdentityKeyFile:createKey,serializeReceizIdentityArtifact:k=>JSON.stringify(k),parseReceizIdentityArtifactText:JSON.parse,receizBase64UrlEncode:b=>Buffer.from(b).toString('base64url'),receizBase64UrlDecode:s=>new Uint8Array(Buffer.from(s,'base64url')),receizKaiNow:()=>({pulse:20})},artwork:async()=>new Uint8Array([5])});
 return{runtime,request,wallet,createKey,module};
}
it('creates a connected Reserve Note with one account read and one write without device attestation, preserving original Reserve backing',async()=>{
 const f=fixture(),note=await f.runtime.create('200');expect(note.amountUsdCents).toBe('200');expect(f.wallet).not.toHaveBeenCalled();expect(f.request).toHaveBeenCalledTimes(2);expect(f.request.mock.calls[1][1].body).toMatchObject({action:'issue'});expect(JSON.stringify(f.request.mock.calls)).not.toContain('privateKey');expect(f.createKey).toHaveBeenCalledOnce();
});
it('recovers the original issue before retrying after a lost response and never requotes or regenerates the Note key',async()=>{
 const f=fixture();const original=f.request.getMockImplementation()!;f.request.mockImplementationOnce(original).mockRejectedValueOnce(Error('lost'));
 await expect(f.runtime.create('200')).rejects.toThrow('lost');await f.runtime.create('200');
 expect(f.wallet).not.toHaveBeenCalled();expect(f.createKey).toHaveBeenCalledOnce();expect(f.request.mock.calls.map(c=>c[1].method)).toEqual(['GET','POST','GET','POST']);expect(f.request.mock.calls[3][1].body).toEqual(f.request.mock.calls[1][1].body);
});
it('refuses a changed signed funding response and retains the exact pending authorization',async()=>{
 const f=fixture();vi.mocked(f.module.verifyBankConnectedNoteFunding).mockResolvedValueOnce({kind:'funding',noteId:'foreign',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1',funding:{}}as any);
 await expect(f.runtime.create('200')).rejects.toThrow('BANK_NOTE_EXACT_RESUME_REQUIRED');expect(await f.runtime.pending()).not.toBeNull();expect(f.module.exportBankConnectedNoteImage).not.toHaveBeenCalled();
});
it('does not enter account transport or prepare a key for offline creation without prepared custody',async()=>{
 const f=fixture();vi.stubGlobal('navigator',{onLine:false});await expect(f.runtime.create('200')).rejects.toThrow('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');expect(f.wallet).not.toHaveBeenCalled();expect(f.createKey).not.toHaveBeenCalled();expect(f.request).not.toHaveBeenCalled();
});
it('opens the exact raw connected handover retained by the receiving queue, as well as its PNG',async()=>{
 const {openConnectedAccountNote}=await import('../src/receiz/connected-note-application');
 const raw=new Uint8Array([1]),png=new Uint8Array([137,80,78,71]);
 const held={kind:'handover',rail:'reserve',noteId:'note',amountPhiMicro:'2',amountUsdCents:'1',receiverUserId:'receiver',receiverKeyId:'key',redemptionDigest:'digest',terminalSourceBytes:raw,terminalArtifactSha256:'source'};
 const module={isBankConnectedNoteImage:vi.fn(async b=>b[0]===137),readBankConnectedNoteImage:vi.fn(async b=>{if(b[0]!==137)throw Error('PNG_REQUIRED');return held;}),readBankConnectedNoteSource:vi.fn(async b=>{expect(b).toEqual(raw);return held;})}as unknown as ConnectedNoteModule;
 expect(await openConnectedAccountNote(module,png,{receiverUserId:'receiver',receiverKeyId:'key'})).toMatchObject({noteId:'note'});
 expect(await openConnectedAccountNote(module,raw,{receiverUserId:'receiver',receiverKeyId:'key'})).toMatchObject({noteId:'note'});
});
