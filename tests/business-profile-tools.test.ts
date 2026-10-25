import {expect,it,vi} from 'vitest';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
import {createProfileEditor} from '../src/receiz/profile-edit';
import {createBusinessProfileTools,businessProfileTools} from '../src/receiz/business-profile-tools';
const uid='account-one',owner='owner.receiz.id',digest='a'.repeat(64);
const draft={title:'Our work',description:'A clear offer.',kind:'moment' as const,longForm:'The actual text the owner chose.',files:[]};
const content={schema:'receiz.bank.asset-content.v2' as const,ownerReceizId:owner,...draft};
function fixture(){
 let open=true;const original=new File(['native sealed bytes'],'work.receizbundle',{type:'application/vnd.receiz.bundle+json'}),reference={schema:'receiz.imported-proof-source.v1' as const,artifactSha256:digest,byteLength:original.size,filename:original.name,mimeType:original.type,bytes:{kind:'bytes' as const,sha256:digest,byteLength:original.size,contentByteLength:original.size,height:0}};
 const update=vi.fn(async(input:Record<string,unknown>)=>({accountUid:uid,profilePath:'/studio',profile:{profile:{userId:uid,username:'studio',...input}}}));
 const editor=createProfileEditor({accountUid:uid,current:()=>open,update,availability:async()=>({available:true}),uploadImage:async(_file,kind)=>({accountUid:uid,profilePath:'/studio',profile:{profile:{userId:uid,username:'studio',[kind==='avatar'?'avatarUrl':'bannerUrl']:'https://receiz.com/photo.webp'}}}),publish(){}});
 const prepare=vi.fn(async()=>({artifact:original,reference,content})),publish=vi.fn(async()=>({status:'published' as const,artifactDigest:'b'.repeat(64),operationCount:1,visibleChildCount:1}));
 const verify=vi.fn(async()=>({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:digest,continuity:{ownerReceizId:owner}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(content))}} as unknown as ReceizOpenedArtifact));
 const publication=vi.fn(async()=>({prepare,publish}));
 const tools=createBusinessProfileTools({accountUid:uid,ownerReceizId:owner,profile:async()=>editor,prepareOriginal:prepare,publication,verifyOriginal:verify,assertOpen(){if(!open)throw Error('Identity disposed');}});
 return{tools,update,prepare,publish,publication,verify,original,dispose(){open=false;}};
}
it('offers core profile and proof tools without a Business entitlement gate, credentials or raw files in model schemas',()=>{
 expect(businessProfileTools).toHaveLength(5);for(const tool of businessProfileTools){expect(tool.access).toBe('core');expect(JSON.stringify(tool.parameters)).not.toMatch(/password|passphrase|cookie|accountUid|ownerReceizId|artifactBytes/);}
});
it('applies only the supplied profile fields through the existing owner editor and rejects invented fields before writes',async()=>{
 const f=fixture();const result=await f.tools.updateProfile({displayName:'Studio',bio:'Our work',links:[{label:'Book a time',url:'https://studio.example/book'}]});expect(result.accountUid).toBe(uid);expect(f.update).toHaveBeenCalledExactlyOnceWith({displayName:'Studio',bio:'Our work',links:[{label:'Book a time',url:'https://studio.example/book'}]});
 await expect(f.tools.updateProfile({ownerUserId:'other'} as never)).rejects.toThrow('PROFILE_FIELD_INVALID');expect(f.update).toHaveBeenCalledOnce();
});
it('seals and verifies the enclosing Original privately before any explicit publication, then reuses that known immutable source',async()=>{
 const f=fixture();expect(f.prepare).not.toHaveBeenCalled();const sealed=await f.tools.sealObject(draft);expect(sealed.view).toMatchObject({status:'sealed',sourceDigest:digest,title:draft.title});expect(sealed.original).toBe(f.original);expect(f.verify).toHaveBeenCalledExactlyOnceWith(f.original);expect(f.publish).not.toHaveBeenCalled();
 const published=await f.tools.publishObject(sealed.original);expect(published).toMatchObject({status:'published',sourceDigest:digest,showcaseArtifactDigest:'b'.repeat(64)});expect(f.verify).toHaveBeenCalledOnce();expect(f.publish).toHaveBeenCalledExactlyOnceWith(f.original);
});
it('does not allow a self-hashable payload or wrong owner to replace enclosing Original verification',async()=>{
 const f=fixture();f.verify.mockRejectedValueOnce(Error('Enclosing proof invalid'));await expect(f.tools.sealObject(draft)).rejects.toThrow('Enclosing proof invalid');expect(f.publish).not.toHaveBeenCalled();
 const other=fixture();other.verify.mockResolvedValueOnce({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:digest,continuity:{ownerReceizId:'other'}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(content))}} as unknown as ReceizOpenedArtifact);await expect(other.tools.publishObject(other.original)).rejects.toThrow('BUSINESS_PROFILE_ORIGINAL_OWNER_MISMATCH');expect(other.publish).not.toHaveBeenCalled();
});
it('uses verified source content rather than the weaker duplicate projection and refuses a different sealed intent',async()=>{
 const f=fixture();f.prepare.mockResolvedValueOnce({...await f.prepare(),content:{...content,title:'Weaker wrong title'}});const sealed=await f.tools.sealObject(draft);expect(sealed.view.title).toBe(draft.title);
 const different=fixture();different.verify.mockResolvedValueOnce({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:digest,continuity:{ownerReceizId:owner}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify({...content,longForm:'Different text'}))}} as unknown as ReceizOpenedArtifact);await expect(different.tools.sealObject(draft)).rejects.toThrow('BUSINESS_PROFILE_ORIGINAL_INTENT_MISMATCH');
});
it('retains pending publication without resealing or retrying and returns a native rejection honestly',async()=>{
 const f=fixture();const sealed=await f.tools.sealObject(draft);f.publish.mockRejectedValueOnce(Error('connection lost'));expect(await f.tools.publishObject(sealed.original)).toMatchObject({status:'pending',sourceDigest:digest});expect(f.prepare).toHaveBeenCalledOnce();expect(f.publish).toHaveBeenCalledOnce();
});
it('discards profile/original results when the admitted identity is disposed',async()=>{
 const f=fixture();f.prepare.mockImplementationOnce(async()=>{f.dispose();return{artifact:f.original,reference:{schema:'receiz.imported-proof-source.v1',artifactSha256:digest,byteLength:f.original.size,filename:f.original.name,mimeType:f.original.type,bytes:{kind:'bytes',sha256:digest,byteLength:f.original.size,contentByteLength:f.original.size,height:0}},content};});await expect(f.tools.sealObject(draft)).rejects.toThrow('Identity disposed');expect(f.publish).not.toHaveBeenCalled();
});

it('does not open the connected publication runtime merely to seal a private proof object',async()=>{const f=fixture();await f.tools.sealObject(draft);expect(f.publication).not.toHaveBeenCalled();});

it('checks the owner-selected definition and exact file bytes against the verified enclosing Original',async()=>{
 const definition={name:'Our work',symbol:'WORK',units:'100',description:'Our offer',linkedProofDigest:null};
 const changed=fixture();changed.verify.mockResolvedValueOnce({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:digest,continuity:{ownerReceizId:owner}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify({...content,definition:{...definition,units:'999'}}))}} as unknown as ReceizOpenedArtifact);await expect(changed.tools.sealObject({...draft,definition})).rejects.toThrow('BUSINESS_PROFILE_ORIGINAL_INTENT_MISMATCH');
 const file=new File(['right'],'source.txt',{type:'text/plain'}),wrongDigest='c'.repeat(64),f=fixture();f.verify.mockResolvedValueOnce({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:digest,continuity:{ownerReceizId:owner}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify({...content,files:[{id:'source-1',role:'attachment',name:file.name,mime:file.type,size:file.size,sha256:wrongDigest,bytes:{kind:'bytes',sha256:wrongDigest,byteLength:file.size,contentByteLength:file.size,height:0}}]}))}} as unknown as ReceizOpenedArtifact);await expect(f.tools.sealObject({...draft,files:[{id:'source-1',role:'attachment',file}]})).rejects.toThrow('BUSINESS_PROFILE_ORIGINAL_INTENT_MISMATCH');expect(f.publish).not.toHaveBeenCalled();
});
it('preserves an explicit native publication rejection',async()=>{const f=fixture();f.publish.mockResolvedValueOnce({status:'rejected',code:'native_rejection'} as never);expect(await f.tools.publishObject(f.original)).toMatchObject({status:'rejected',sourceDigest:digest,code:'native_rejection'});expect(f.publish).toHaveBeenCalledOnce();});
it.each([null,undefined])('retains a missing publication acknowledgement as pending after a possible write',async receipt=>{
 const f=fixture();f.publish.mockResolvedValueOnce(receipt as never);expect(await f.tools.publishObject(f.original)).toMatchObject({status:'pending',sourceDigest:digest,code:'BUSINESS_PROFILE_PUBLICATION_UNCONFIRMED'});expect(f.publish).toHaveBeenCalledOnce();
});
