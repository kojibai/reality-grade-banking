// @vitest-environment node
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {File as NodeFile,Blob as NodeBlob} from 'node:buffer';
import {mkdir,writeFile} from 'node:fs/promises';
import {afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {Window} from 'happy-dom';
import {LiveAssetDetail} from '../src/features/assets/LiveAssets';
import {prepareCreatedAssetPrimary} from '../src/receiz/created-asset-file';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';

// Select the real compiled SDK beneath explicit synthetic fixture roots. The
// media viewer's independent auto-inspection is outside this download contract.
const selected=vi.hoisted(()=>({runtime:null as any,verify:null as any,sdk:null as any}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>selected.runtime}));
vi.mock('../src/receiz/client',async original=>({...await original<typeof import('../src/receiz/client')>(),loadReceiz:async()=>selected.sdk}));
vi.mock('@receiz/sdk/offline',()=>({verifyReceizOfflineSealedFile:(input:unknown)=>selected.verify(input)}));
vi.mock('../src/features/media/ProofMedia',()=>({ProofMedia:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const database=new IDBFactory(),browser=new Window({url:'https://bankeiz.com'});
const definition={name:'The gate was never the value',symbol:'THEGATEW',units:'1000',description:'The unchanged native Original',linkedProofDigest:null};
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,source:HeldDeposit,sourceWithoutDefinition:HeldDeposit,ordinary:HeldDeposit,primary:File,owner:string;
let root:ReturnType<typeof createRoot>|null=null;
function platform(){
 for(const key of ['document','navigator','location','HTMLElement','HTMLAnchorElement','Event','localStorage','sessionStorage'] as const)vi.stubGlobal(key,browser[key]);
 vi.stubGlobal('window',browser);
 for(const key of ['addEventListener','removeEventListener','dispatchEvent'] as const)vi.stubGlobal(key,browser[key].bind(browser));
 vi.stubGlobal('File',NodeFile);vi.stubGlobal('Blob',NodeBlob);vi.stubGlobal('indexedDB',database);vi.stubGlobal('IDBKeyRange',IDBKeyRange);}
beforeAll(async()=>{
 platform();
 fixture=await conformanceOfflineFixture({composer:true,account:true});const r=fixture.runtime;
 selected.sdk=r;selected.runtime=r.connectedComposer;selected.verify=r.offline.verifyReceizOfflineSealedFile;
 const admission=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(fixture.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 owner=(await r.readReceizIdentityPublicBinding(admission)).artifactOwnerReceizId;
 const sealer=r.offline.createReceizOfflineSealer({store:fixture.store,resources:fixture.resources,ownerIdentityAdmission:admission});
 const bytes=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64'));
 const draft=await prepareCreatedAssetPrimary({draft:{title:definition.name,description:definition.description,kind:'image',longForm:'',definition,files:[{id:'primary',role:'primary',file:new File([bytes],'profile.png',{type:'image/png'})}]},seal:input=>sealer.seal(input),assertCurrent(){}});
 primary=draft.files[0].file;
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await fixture.store.load(),resources:fixture.resources});
 const prepared=await r.composer.prepareConnectedComposerSource({draft,creatorUsername:'bjklock',ownerReceizId:owner,sealDocument,assertCurrent(){}});
 source={digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name,title:definition.name,assetDefinition:definition,kind:'proof',status:'held-proof',pulse:null};
 await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,username:'bjklock',assertCurrent(){}});
 const undefinedPrepared=await r.composer.prepareConnectedComposerSource({draft:{...draft,definition:undefined},creatorUsername:'bjklock',ownerReceizId:owner,sealDocument,assertCurrent(){}});
 sourceWithoutDefinition={...source,assetDefinition:undefined,digest:undefinedPrepared.reference.artifactSha256,bytes:new Uint8Array(await undefinedPrepared.artifact.arrayBuffer()),filename:undefinedPrepared.artifact.name};
 await r.connectedComposer.admitConnectedComposerSource({file:undefinedPrepared.artifact,ownerReceizId:owner,username:'bjklock',assertCurrent(){}});
 const nativeBytes=new Uint8Array(await primary.arrayBuffer());ordinary={...source,assetDefinition:undefined,digest:await r.sha256ReceizBytes(nativeBytes),bytes:nativeBytes,filename:primary.name};
 // Optional synthetic fixture handoff for the independent compiled-browser check.
 const directory=process.env.BANK_REOPENED_ORIGINAL_EVIDENCE;
 if(directory){
  await mkdir(directory,{recursive:true});const blocks:unknown[]=[];
  await r.createImportedProofSourceCustody().exportBlocks(prepared.reference,async(reference:unknown,body:Uint8Array)=>{blocks.push({reference,bytes:Buffer.from(body).toString('base64')});});
  await writeFile(directory+'/original.png.roots.json',JSON.stringify(fixture.roots));
  await writeFile(directory+'/downloaded-original.png',new Uint8Array(await primary.arrayBuffer()));
  await writeFile(directory+'/original.png.save-context.json',JSON.stringify({source:Buffer.from(source.bytes).toString('base64'),filename:source.filename,digest:source.digest,owner,definition,storage:[],blocks}));
 }
},120000);
beforeEach(async()=>{platform();const cold=await fixture.reloadRuntime();selected.sdk=cold;selected.runtime=cold.connectedComposer;selected.verify=cold.offline.verifyReceizOfflineSealedFile;});
afterEach(()=>{if(root)act(()=>root!.unmount());root=null;document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});
function downloads(){
 const files:File[]=[],names:string[]=[],objects=new Map<string,File>();
 vi.spyOn(URL,'createObjectURL').mockImplementation(file=>{const url='blob:retained-original-'+objects.size;objects.set(url,file as File);return url;});
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){names.push(this.download);files.push(objects.get(this.href)!);});
 const network=vi.fn(async()=>{throw Error('ORIGINAL_SAVE_NETWORK_FORBIDDEN');});vi.stubGlobal('fetch',network);
 return{files,names,network};
}
async function mount(held:HeldDeposit=source){
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 const identity={binding:{artifactOwnerReceizId:owner},accountUsername:()=> 'bjklock',username:'device',knownDeposits:()=>[held],listDeposits:async()=>[held]} as unknown as OpenIdentity;
 await act(async()=>root!.render(<LiveAssetDetail identity={identity} digest={held.digest}/>));
 return{host,identity,save:()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Save original proof')!};
}
it.each([true,false])('reopens a composer Original with definition=%s and saves its exact sealed PNG with offline proof',async defined=>{
 const env=downloads(),view=await mount(defined?source:sourceWithoutDefinition);
 expect(env.files).toHaveLength(0);expect(env.network).not.toHaveBeenCalled();
 await act(async()=>view.save().click());await vi.waitFor(()=>expect(env.files).toHaveLength(1));
 const saved=env.files[0],bytes=new Uint8Array(await saved.arrayBuffer());
 expect(env.names).toEqual([primary.name]);expect(saved.type).toBe('image/png');expect(saved.name).toMatch(/\.png$/);expect(bytes).toEqual(new Uint8Array(await primary.arrayBuffer()));
 expect((await selected.verify({bytes,filename:saved.name,mimeType:saved.type})).ok).toBe(true);
 const opened=await fixture.runtime.openPayload({fileBytes:bytes,filename:saved.name,mime:saved.type,signatureV4RootPublicKeys:new Map(fixture.roots.map(root=>[root.kid,root]))});
 expect(opened.ok).toBe(true);expect(opened.payloadBytes).toEqual(new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')));
 expect(env.network).not.toHaveBeenCalled();
},30000);
it.each([false,true])('preserves the exact raw Source export for a noncomposer proof with native position=%s',async native=>{
 const position:HeldDeposit['nativeAsset']={assetId:'c'.repeat(64),quantityMicro:'1000000',lockedQuantityMicro:'0',supplyMicro:'1000000',symbol:'UNIT',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'1000000',status:'active',sourceKaiUPulse:'100000000',issuedAtKaiUPulse:'100000000'};
 const env=downloads(),held=native?{...source,nativeAsset:position,filename:'existing-source.receizbundle'}:ordinary,view=await mount(held);
 await act(async()=>view.save().click());await vi.waitFor(()=>expect(env.files).toHaveLength(1));
 expect(env.names).toEqual([held.filename]);expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(held.bytes);expect(env.network).not.toHaveBeenCalled();
});
it('refuses a changed composer Source instead of downloading its bytes as the Original',async()=>{
 const bytes=source.bytes.slice();bytes[Math.floor(bytes.length/2)]^=1;
 const env=downloads(),view=await mount({...source,bytes});
 await act(async()=>view.save().click());await vi.waitFor(()=>expect(view.host.querySelector('[role="alert"]')).not.toBeNull());
 expect(env.files).toHaveLength(0);expect(env.names).toHaveLength(0);expect(env.network).not.toHaveBeenCalled();
});
it.each(['unmount','selection','identity'] as const)('does not finish a PNG download after %s closes the selected object',async close=>{
 let release!:()=>void,finish!:()=>void,started=false;const gate=new Promise<void>(resolve=>{release=resolve;}),finished=new Promise<void>(resolve=>{finish=resolve;}),native=selected.runtime;
 selected.runtime={...native,admitConnectedComposerSource:async(input:unknown)=>{started=true;await gate;try{return await native.admitConnectedComposerSource(input);}finally{finish();}}};
 const env=downloads(),view=await mount();
 await act(async()=>view.save().click());await vi.waitFor(()=>expect(started).toBe(true));
 if(close==='unmount'){act(()=>root!.unmount());root=null;}
 else await act(async()=>root!.render(<LiveAssetDetail identity={close==='identity'?{...view.identity}:view.identity} digest={close==='selection'?'f'.repeat(64):source.digest}/>));
 await act(async()=>{release();await finished;});
 expect(env.files).toHaveLength(0);expect(env.names).toHaveLength(0);expect(env.network).not.toHaveBeenCalled();
});
