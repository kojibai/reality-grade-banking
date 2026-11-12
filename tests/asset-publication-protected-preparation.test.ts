import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

afterEach(()=>vi.unstubAllGlobals());
const policy={allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadPriceCents:null};
async function fixture(){
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;vi.stubGlobal('indexedDB',new IDBFactory());
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const ownerReceizId=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId;
 const draft={kind:'file',title:'An existing ordinary file',description:'Default creation remains public',longForm:'',files:[{id:'primary',role:'primary',file:new File(['exact ordinary bytes'],'original.txt',{type:'text/plain'})}]};
 return{f,r,ownerReceizId,draft};
}

it('refuses new restricted public preparation before any public block write',async()=>{
 const {r,ownerReceizId,draft}=await fixture();let writes=0;
 for(const restriction of [{allowOriginalDownload:false},{originalDownloadLimit:1},{originalDownloadPriceCents:125}]){
  await expect(r.composer.prepareConnectedComposerContent({draft:{...draft,collection:{...policy,...restriction}},ownerReceizId,assertCurrent(){},writeBlock:async()=>{writes++;}})).rejects.toThrow('COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED');
 }
 expect(writes).toBe(0);
 const free=await r.composer.prepareConnectedComposerContent({draft,ownerReceizId,assertCurrent(){},writeBlock:async()=>{writes++;}});
 expect(writes).toBeGreaterThan(0);expect(free.protectedOriginal).toBeUndefined();expect(free.files).toHaveLength(1);
});

it('refuses sealing new restricted public content without changing historical canonical reads',async()=>{
 const {f,r,ownerReceizId,draft}=await fixture(),blocks=new Map<string,Uint8Array>();
 const content=await r.composer.prepareConnectedComposerContent({draft,ownerReceizId,assertCurrent(){},writeBlock:async(ref:{sha256:string},bytes:Uint8Array)=>{blocks.set(ref.sha256,bytes.slice());}});
 const historical={...content,collection:{...policy,originalDownloadPriceCents:125}};let writes=0,seals=0;
 await expect(r.composer.sealConnectedComposerContent({content:historical,assertCurrent(){},writeBlock:async()=>{writes++;},sealDocument:async()=>{seals++;throw Error('RESEAL_FORBIDDEN');}})).rejects.toThrow('COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED');
 expect(writes).toBe(0);expect(seals).toBe(0);
 const seal=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const bytes=new TextEncoder().encode(JSON.stringify(historical)),digest=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
 const old=await seal({fileBytes:bytes,filename:'historical-composer.json',mime:'application/json',options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId,recordId:`native:${digest}`}}});
 const source=await r.openImportedProofSource(new File([old.artifactBytes],old.downloadName,{type:'application/vnd.receiz.bundle+json'}),{resolveSourceBlock:async(ref:{sha256:string})=>blocks.get(ref.sha256)??null});
 expect(source.verification.ok).toBe(true);expect(source.projection.bankAsset.composer.collection.originalDownloadPriceCents).toBe(125);
});
