import {expect,it,vi} from 'vitest';
import {createBackedAssetClient} from '../src/receiz/backed-asset-client';
import type {AssetComposerDraft} from '../src/receiz/asset-composer';

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
