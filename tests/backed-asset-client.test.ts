import {expect,it,vi} from 'vitest';
import {canonicalizeReceizV122,sha256ReceizBytes} from '@receiz/sdk';
import {createBackedAssetClient,readHeldCurrencyArtwork} from '../src/receiz/backed-asset-client';
import type {BackedPublicationState} from '../src/receiz/backed-asset-publication';
import * as publicAsset from '../src/receiz/native-asset-public';
import * as publicationRuntime from '../src/receiz/asset-publication-runtime';
import {writeExactByteBlocks} from '../native/receiz/packages/receiz-sdk/src/exactByteBlocks';
import {inspectNativeCurrencyPolicy} from '../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import type {AssetComposerDraft} from '../src/receiz/asset-composer';

it('reopens the exact currency artwork using only its retained blocks',async()=>{
 const image=new Uint8Array([137,80,78,71,13,10,26,10]);
 const blocks=new Map<string,Uint8Array>();
 const bytes=await writeExactByteBlocks(new Blob([image]),async(ref,data)=>{blocks.set(ref.sha256,data);});
 const resolveComposerBlock=vi.fn(async(ref:typeof bytes)=>blocks.get(ref.sha256)!);
 const runtime=vi.spyOn(publicationRuntime,'loadAssetPublicationRuntime').mockResolvedValue({resolveComposerBlock} as never);
 const file={id:'currency-artwork',role:'primary' as const,name:'coin.png',mime:'image/png',size:image.length,sha256:await sha256ReceizBytes(image),bytes};
 try{
  const artwork=await readHeldCurrencyArtwork(file);
  expect(artwork.type).toBe(file.mime);
  expect(new Uint8Array(await artwork.arrayBuffer())).toEqual(image);
  expect(resolveComposerBlock).toHaveBeenCalledExactlyOnceWith(bytes);
  await expect(readHeldCurrencyArtwork({...file,sha256:'a'.repeat(64)})).rejects.toThrow('BANK_CURRENCY_ARTWORK_SOURCE_MISMATCH');
 }finally{runtime.mockRestore();}
});

it.each([false,true])('resumes one issued currency from its canonical public certificate (changed price=%s)',async changed=>{
 const ownerReceizId='artist.receiz.id',type='application/vnd.receiz.bundle+json';
 const definition={name:'Spotlight',symbol:'SPT',units:'1',description:'Feature an Original',linkedProofDigest:null};
 const currencyPolicy=inspectNativeCurrencyPolicy({kind:'fixed-reserve-pool',preset:'currency',issuerControls:true,quantityIncrementMicro:'1000',priceUsdCentsPerUnit:'3'});
 const intent={definition,currencyPolicy,content:{schema:'receiz.bank.asset-content.v2',ownerReceizId,title:definition.name,description:definition.description,kind:'moment',longForm:'',files:[]}};
 const source={digest:'a'.repeat(64),filename:'authored.receizbundle',mimeType:type,reference:{schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'authored.receizbundle',mimeType:type,bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}}};
 const assetId='c'.repeat(64),issuanceSourceSha256='d'.repeat(64),artifactSha256='e'.repeat(64),packageSha256='f'.repeat(64);
 let state:BackedPublicationState|null={schema:'bank.backed-asset-publication.v1',ownerReceizId,intent,intentDigest:await sha256ReceizBytes(new TextEncoder().encode(canonicalizeReceizV122(intent))),source,stage:'funded',operationId:'existing-issuance',assetId,issuanceSourceSha256};
 const policy=JSON.parse(canonicalizeReceizV122({...currencyPolicy,...(changed?{priceUsdCentsPerUnit:'4'}:{})}));
 // Stand in for the boundary that has already verified the exact native certificate.
 const verified=vi.spyOn(publicAsset,'openNativeAssetPublic').mockResolvedValue({artifactSha256,certificate:{asset:{id:assetId,definition:{linkedProofDigest:source.digest},issuanceSourceSha256,currency:{policy}}}} as never);
 const artifact=new File(['signed package'],'spotlight.receizbundle',{type});
 const sealContent=vi.fn(async()=>({artifact,reference:{artifactSha256:packageSha256}}));
 const publish=vi.fn(async()=>({status:'published',artifactDigest:packageSha256,operationCount:1,visibleChildCount:1}));
 const operations=vi.fn(async()=>{throw Error('REISSUE_FORBIDDEN');});
 try{
  const client=createBackedAssetClient({ownerReceizId,assertOpen(){},lock:async run=>run(),read:async()=>state,
   write:async next=>{state=next;},runtime:async()=>({sealContent,publish}) as never,operations,
   retain:async()=>({digest:packageSha256}) as never,restore:async()=>artifact,recoverFunding:async()=>null,
   publicProjection:async()=>({artifactSha256,exactBytesB64u:'e30'})});
  if(changed){
   await expect(client.resume()).rejects.toThrow('BANK_NATIVE_ASSET_PUBLIC_MISMATCH');
   expect(sealContent).not.toHaveBeenCalled();expect(publish).not.toHaveBeenCalled();
  }else{
   await expect(client.resume()).resolves.toMatchObject({publication:{status:'published',showcaseArtifactDigest:packageSha256}});
   expect(state).toMatchObject({stage:'published',operationId:'existing-issuance',assetId});
   expect(sealContent).toHaveBeenCalledWith(expect.objectContaining({nativeAsset:expect.objectContaining({publicCertificateSha256:artifactSha256})}));
   expect(publish).toHaveBeenCalledExactlyOnceWith(artifact);
  }
  expect(operations).not.toHaveBeenCalled();
 }finally{verified.mockRestore();}
});

it('retries a currency review with the exact artwork Source when preparation of terms fails', async () => {
 let state:unknown=null;
 const definition={name:'Spotlight',symbol:'SPT',units:'1',description:'Feature an Original',linkedProofDigest:null};
 const draft:AssetComposerDraft={title:definition.name,description:definition.description,kind:'image',longForm:'',
  files:[{id:'currency-artwork',role:'primary',file:new File(['artwork'],'spotlight.png',{type:'image/png'})}]};
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,
  filename:'authored.receizbundle',mimeType:'application/vnd.receiz.bundle+json',
  bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 const prepareDraft=vi.fn(async (selected:AssetComposerDraft)=>{
  const file=new File(['sealed artwork '+prepareDraft.mock.calls.length],'spotlight.png',{type:'image/png'});
  return {...selected,files:[{id:'currency-artwork',role:'primary' as const,file}]};
 });
 const prepareContent=vi.fn(async (selected:AssetComposerDraft)=>({
  schema:'receiz.bank.asset-content.v2',ownerReceizId:'artist.receiz.id',...selected,
  files:[{id:'currency-artwork',role:'primary',name:selected.files[0].file.name,mime:'image/png',
   size:selected.files[0].file.size,sha256:(prepareDraft.mock.calls.length===1?'c':'d').repeat(64),
   bytes:{...reference.bytes,byteLength:selected.files[0].file.size,contentByteLength:selected.files[0].file.size}}],
 }));
 const prepare=vi.fn().mockRejectedValueOnce(Error('HTTP_503')).mockResolvedValueOnce({request:{requestId:'currency-review'}});
 const stage=vi.fn(async()=>reference);
 const client=createBackedAssetClient({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),
  read:async()=>state,write:async next=>{state=next;},prepareDraft,
  runtime:async()=>({prepareContent,stage,sealContent:async()=>({artifact:new File(['{}'],reference.filename,{type:reference.mimeType}),reference})})as never,
  retain:async()=>({digest:reference.artifactSha256})as never,restore:async()=>{throw Error('NO_DELIVERY');},
  operations:async()=>({prepare})as never,recoverFunding:async()=>null,publicProjection:async()=>{throw Error('NO_FUNDING_EXECUTION');}});
 const operation={kind:'issue-currency',definition,policy:{kind:'fixed-reserve-pool',preset:'currency',priceUsdCentsPerUnit:'1'}} as const;
 await expect(client.operations(draft).prepare(operation)).rejects.toThrow('HTTP_503');
 await expect(client.operations(draft).prepare(operation)).resolves.toEqual({request:{requestId:'currency-review'}});
 expect(prepareDraft).toHaveBeenCalledOnce();
 expect(prepareContent).toHaveBeenCalledOnce();
 expect(stage).toHaveBeenCalledOnce();
 expect(prepare.mock.calls[1][0]).toEqual(prepare.mock.calls[0][0]);
});

it.each(['cancel','edit'] as const)('uses the new artwork after %s without reusing the previous publisher',async action=>{
 let state:unknown=null;
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'authored.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 const runtime=vi.fn(async()=>({
  prepareContent:async(draft:AssetComposerDraft)=>({schema:'receiz.bank.asset-content.v2',ownerReceizId:'artist.receiz.id',...draft,files:draft.files.map(({file,...rest})=>({...rest,name:file.name,mime:file.type,size:file.size,sha256:'c'.repeat(64),bytes:reference.bytes}))}),
  sealContent:async()=>({artifact:new File(['{}'],reference.filename,{type:reference.mimeType}),reference}),
  stage:async()=>reference,
 }));
 const client=createBackedAssetClient({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,write:async(next,previous)=>{expect(previous).toEqual(state);state=structuredClone(next);},runtime:runtime as never,
  retain:async()=>({digest:reference.artifactSha256}) as never,restore:async()=>{throw Error('Not delivering in this fixture');},operations:async()=>({prepare:async()=>({request:{requestId:'operation'}}),discard(){}}) as never,recoverFunding:async()=>null,publicProjection:async()=>{throw Error('Not funding in this fixture');}});
 const original=new File(['{}'],'song.mp3',{type:'audio/mpeg'});
 for(const name of ['first','second']){
  const cover=new File(['{}'],name+'.png',{type:'image/png'}),definition={name,symbol:'SONG',units:'1000',description:'',linkedProofDigest:null};
  const operations=client.operations({title:name,description:'',kind:'audio',longForm:'',files:[{id:'original',file:original,role:'primary'},{id:'cover',file:cover,role:'cover'}]});const review=await operations.prepare({kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:'100',definition});
  expect(runtime).toHaveBeenLastCalledWith(cover);
  if(action==='cancel')await client.cancel();else operations.discard(review);
 }
 expect(runtime).toHaveBeenCalledTimes(2);
});

it('prepares a funded composer through the same primary-file custody step before sealing its Source',async()=>{
 let state:unknown=null;const order:string[]=[],file=new File(['input'],'work.pdf',{type:'application/pdf'}),sealed=new File(['exact sealed original'],'work.pdf',{type:'application/pdf'});
 const draft:AssetComposerDraft={title:'Work',description:'',kind:'pdf',longForm:'',files:[{id:'primary',role:'primary',file}]};
 const prepared={...draft,files:[],protectedOriginal:{profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',file:sealed}};
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'authored.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 const prepareContent=vi.fn(async(selected:AssetComposerDraft)=>{order.push('content');expect(selected).toBe(prepared);return{schema:'receiz.bank.asset-content.v2',ownerReceizId:'artist.receiz.id',title:'Work',description:'',kind:'pdf',longForm:'',files:[],collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:2,derivativeDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadPriceCents:null},protectedOriginal:{profileIdentity:prepared.protectedOriginal.profileIdentity,file:{id:'protected-original',role:'primary',name:sealed.name,mime:sealed.type,size:2,sha256:'c'.repeat(64),bytes:reference.bytes}}};});
 const client=createBackedAssetClient({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=next;},
  prepareDraft:async selected=>{order.push('primary');expect(selected.files[0]?.file).toBe(file);return prepared;},
  runtime:async()=>({prepareContent,sealContent:async()=>{order.push('seal');return{artifact:new File(['{}'],reference.filename,{type:reference.mimeType}),reference};},stage:async()=>{order.push('stage');return reference;}})as never,
  retain:async()=>({digest:reference.artifactSha256})as never,restore:async()=>{throw Error('NO_DELIVERY');},operations:async()=>({prepare:async()=>{order.push('funding-review');return{request:{requestId:'operation'}};}})as never,recoverFunding:async()=>null,publicProjection:async()=>{throw Error('NO_FUNDING_EXECUTION');}});
 await client.operations(draft).prepare({kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:'100',definition:{name:'Work',symbol:'WORK',units:'1000',description:'',linkedProofDigest:null}});
 expect(prepareContent).toHaveBeenCalledOnce();expect(order).toEqual(['primary','content','seal','stage','funding-review']);
});

it.each([false,true])('passes only prepared public image artwork to the publisher and refuses a closed preparation (closed=%s)',async closeAfterPreparation=>{
 let state:unknown=null,open=true;const order:string[]=[];
 const original=new File(['exact private Original with its native proof'],'private-original.png',{type:'image/png'});
 const preview=new File(['reduced public image preview'],'public-preview.png',{type:'image/png'});
 const collection={allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:2,derivativeDownloadLimit:null,originalDownloadPriceCents:125,derivativeDownloadPriceCents:null};
 const draft:AssetComposerDraft={title:'Protected image',description:'',kind:'image',longForm:'',collection,files:[{id:'primary',role:'primary',file:original}]};
 const block=(digest:string,size:number)=>({kind:'bytes',sha256:digest.repeat(64),byteLength:size,contentByteLength:size,height:0});
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'authored.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:block('b',2)};
 let prepared:AssetComposerDraft|undefined;
 const prepareContent=vi.fn(async(selected:AssetComposerDraft)=>{
  order.push('content');expect(selected).toBe(prepared);expect(selected.files[0]?.file).toBe(preview);expect(selected.protectedOriginal?.file).toBe(original);
  return{schema:'receiz.bank.asset-content.v2',ownerReceizId:'artist.receiz.id',title:selected.title,description:'',kind:'image',longForm:'',collection,
   files:[{id:'primary',role:'primary',name:preview.name,mime:preview.type,size:preview.size,sha256:'d'.repeat(64),bytes:block('d',preview.size)}],
   protectedOriginal:{profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',file:{id:'protected-original',role:'primary',name:original.name,mime:original.type,size:original.size,sha256:'c'.repeat(64),bytes:block('c',original.size)}}};
 });
 const runtime=vi.fn(async(artwork?:Blob)=>{
  order.push('runtime');expect(artwork).toBe(preview);expect(artwork).not.toBe(original);
  return{prepareContent,sealContent:async()=>{order.push('seal');return{artifact:new File(['{}'],reference.filename,{type:reference.mimeType}),reference};},stage:async()=>{order.push('stage');return reference;}};
 });
 const funding=vi.fn(async()=>{order.push('funding-review');return{request:{requestId:'operation'}};});
 const client=createBackedAssetClient({ownerReceizId:'artist.receiz.id',assertOpen(){if(!open)throw Error('IDENTITY_CLOSED_AFTER_PREPARATION');},lock:async run=>run(),read:async()=>state,write:async next=>{state=next;},
  prepareDraft:async selected=>{order.push('primary');expect(selected.files[0]?.file).toBe(original);prepared={...selected,files:[{id:'primary',role:'primary',file:preview}],protectedOriginal:{profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',file:original}};if(closeAfterPreparation)open=false;return prepared;},
  runtime:runtime as never,retain:async()=>({digest:reference.artifactSha256})as never,restore:async()=>{throw Error('NO_DELIVERY');},operations:async()=>({prepare:funding})as never,recoverFunding:async()=>null,publicProjection:async()=>{throw Error('NO_FUNDING_EXECUTION');}});
 const pending=client.operations(draft).prepare({kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:'100',definition:{name:'Protected image',symbol:'IMAGE',units:'1000',description:'',linkedProofDigest:null}});
 if(closeAfterPreparation){await expect(pending).rejects.toThrow('IDENTITY_CLOSED_AFTER_PREPARATION');expect(runtime).not.toHaveBeenCalled();expect(prepareContent).not.toHaveBeenCalled();expect(funding).not.toHaveBeenCalled();expect(order).toEqual(['primary']);}
 else{await pending;expect(runtime).toHaveBeenCalledOnce();expect(runtime).toHaveBeenCalledWith(preview);expect(prepareContent).toHaveBeenCalledOnce();expect(order).toEqual(['primary','runtime','content','seal','stage','funding-review']);}
 expect(draft.files[0].file).toBe(original);
});
