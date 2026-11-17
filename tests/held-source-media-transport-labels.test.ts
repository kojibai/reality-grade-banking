import {afterEach, expect, it, vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

afterEach(()=>vi.unstubAllGlobals());

it('projects a canonically held Original through renamed transport labels without losing its media or text', async()=>{
 const f=await conformanceOfflineFixture({composer:true}), r=f.runtime;
 vi.stubGlobal('indexedDB',new IDBFactory());
 const forbidden=vi.fn(async()=>{throw Error('HELD_SOURCE_NETWORK_FORBIDDEN');});
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=actor.ownerReceizId, custody=r.createImportedProofSourceCustody();
 const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'));
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const prepared=await r.composer.prepareConnectedComposerSource({ownerReceizId:owner,creatorUsername:'source_creator',assertCurrent(){},writeBlock:custody.writeBlock,sealDocument,draft:{kind:'image',title:'A held Original',description:'Source text survives transport labels.',longForm:'Every carried paragraph remains present.',files:[{id:'preview',role:'primary',file:new File([png],'preview.png',{type:'image/png'})}]}});
 const opened=await r.openImportedProofSource(prepared.artifact,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});
 const reference=await custody.hold(opened);
 vi.stubGlobal('fetch',forbidden);
 const url=(ref:typeof reference, selection='')=>'https://receiz.com/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(ref)})+selection;
 const reader=r.connectedComposer.readHeldImportedProfileOriginalMaterial;
 const first=await reader(reference,url(reference),{});
 expect(first?.source.descriptor.artifactSha256).toBe(reference.artifactSha256);
 const renamed={...reference,filename:'renamed-proof.receiz',mimeType:'application/octet-stream'};
 const image=await reader(renamed,url(renamed,'&file=preview'),{file:'preview'});
 expect(image?.sealedArtifactSha256Hex).toBe(reference.artifactSha256);
 expect(new Uint8Array(await image.source.composerResources.preview.arrayBuffer())).toEqual(png);
 expect(image.source.projection.bankAsset.composer.description).toBe('Source text survives transport labels.');
 expect(image.source.projection.bankAsset.composer.longForm).toBe('Every carried paragraph remains present.');
 // A foreign artifact cannot borrow a resource already associated with this URL.
 await expect(reader({...renamed,artifactSha256:'a'.repeat(64)},url(renamed,'&file=preview'),{file:'preview'})).rejects.toThrow('IMPORTED_SOURCE_RESOURCE_BINDING_INVALID');
 await expect(reader({...renamed,byteLength:renamed.byteLength+1},url(renamed,'&payload=1'),{})).rejects.toThrow('IMPORTED_SOURCE_RESOURCE_BINDING_INVALID');
 await expect(reader(renamed,url(renamed,'&file=missing'),{file:'missing'})).rejects.toThrow('IMPORTED_SOURCE_PUBLIC_RESOURCE_MISSING');
 // Reopen actual durable custody in a fresh bundled module, then project the
 // second role through renamed transport labels again. No in-process Source
 // or verifier identity from the first module can authorize this reopen.
 const cold=await f.reloadRuntime(),coldReader=cold.connectedComposer.readHeldImportedProfileOriginalMaterial;
 const reopened=await coldReader(renamed,url(renamed),{});
 expect(reopened,'cold custody must realize its held exact root through the only carried transport reference').not.toBeNull();
 expect(reopened?.source).not.toBe(first.source);
 const coldImage=await coldReader(renamed,url(renamed,'&file=preview'),{file:'preview'});
 expect(new Uint8Array(await coldImage.source.composerResources.preview.arrayBuffer())).toEqual(png);
 expect(coldImage.source.projection.bankAsset.composer.longForm).toBe('Every carried paragraph remains present.');
 expect(forbidden).not.toHaveBeenCalled();
},120000);
