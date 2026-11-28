import {canonicalizeReceizV122} from '@receiz/sdk';
import {createBackedAssetPublication,type BackedPublicationState,type BackedPublicationSource} from './backed-asset-publication';
import {readComposerAssetContent,readComposerCapacity,validateComposerAssetDraft,type AssetComposerDraft,type ComposerAssetContent} from './asset-composer';
import type {BankOperations,BankOperationInput,BankOperationReview,BankOperationResult} from './bank-operations';
import type {NativeCurrencyPolicy} from '../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import type {HeldDeposit} from './deposit-source';
import type {AssetPublicationRuntimeModule} from './asset-publication-runtime';
import {verifyNativeAssetSource} from './native-asset';
import {openNativeAssetPublic} from './native-asset-public';
import {loadReceiz} from './client';
import {acknowledgeAssetPublication,refreshAssetPublicationCatalog,retainAssetPublicationSource} from './asset-publication-adoption';
import {parseImportedProofSourceReference} from '../../native/receiz/app/lib/profile/showcase/importedSourceReference';
type Runtime=Awaited<ReturnType<AssetPublicationRuntimeModule['createConnectedAssetPublicationRuntime']>>;
export type BackedAssetPublicationIntent={definition:Extract<BankOperationInput,{kind:'fund-asset'}>['definition'];content:ComposerAssetContent}&(
 {amountUsdCents:string}|{currencyPolicy:NativeCurrencyPolicy}
);
type Intent=BackedAssetPublicationIntent;
type Input={ownerReceizId:string;assertOpen():void;lock<T>(run:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:BackedPublicationState|null,previous:unknown):Promise<void>;runtime(artwork?:Blob):Promise<Runtime>;prepareDraft?(draft:AssetComposerDraft):Promise<AssetComposerDraft>;operations():Promise<BankOperations>;retain(file:File):Promise<HeldDeposit>;restore(digest:string,filename:string,mimeType:string):Promise<File>;recoverFunding(nonce:string):Promise<BankOperationResult|{status:'not-started'}|null>;publicProjection(assetId:string):Promise<unknown>};
export type BackedAssetClient=ReturnType<typeof createBackedAssetClient>;
export function createBackedAssetClient(d:Input){
 let runtime:Promise<Runtime>|undefined,artwork:Blob|undefined,lastFunding:BankOperationResult|undefined;
 let preparedCurrency:{draft:AssetComposerDraft;definition:string;content:Promise<ComposerAssetContent>}|undefined;
 const publisher=()=>runtime??=d.runtime(artwork).catch(error=>{runtime=undefined;throw error;});
 function resetPublisher(){
  runtime=undefined;
  artwork=undefined;
  preparedCurrency=undefined;
 }
 async function prepareContent(draft:AssetComposerDraft,definition:Intent['definition']){
  const selected=validateComposerAssetDraft({...draft,definition,title:definition.name,description:definition.description},readComposerCapacity());
  const prepared=d.prepareDraft?await d.prepareDraft(selected):selected;
  d.assertOpen();
  artwork=prepared.files.find(file=>file.role==='cover')?.file??(prepared.kind==='image'?prepared.files.find(file=>file.role==='primary')?.file:undefined);
  return (await publisher()).prepareContent(prepared);
 }
 function prepareCurrencyContent(draft:AssetComposerDraft,definition:Intent['definition']){
  const key=JSON.stringify(definition);
  if(preparedCurrency?.draft===draft&&preparedCurrency.definition===key)return preparedCurrency.content;
  const pending={draft,definition:key,content:prepareContent(draft,definition)};
  preparedCurrency=pending;
  void pending.content.catch(()=>{if(preparedCurrency===pending)preparedCurrency=undefined;});
  return pending.content;
 }
 const restore=(source:BackedPublicationSource)=>d.restore(source.digest,source.filename,source.mimeType);
 const facts=async(result:BankOperationResult|{status:'not-started'}|null)=>{if(result?.status!=='committed'||!('nativeAssetSource'in result))return result;const {receipt}=await verifyNativeAssetSource(result.nativeAssetSource);d.assertOpen();if(receipt.schema!=='receiz.bank.native-asset-receipt.v1'||(receipt.review.request.kind!=='fund-asset'&&receipt.review.request.kind!=='issue-currency')||receipt.review.request.actorReceizId!==d.ownerReceizId)throw Error('BANK_BACKED_PUBLICATION_FUNDING_INVALID');return{status:'committed',assetId:receipt.assetAfter.id,headSourceSha256:receipt.nativeAssetSourceSha256};};
 async function readPublicAsset(assetId:string){
  const packet=await d.publicProjection(assetId) as {artifactSha256?:unknown;exactBytesB64u?:unknown};
  d.assertOpen();
  if(typeof packet.exactBytesB64u!=='string'||packet.exactBytesB64u.length>11*1024*1024)throw Error('BANK_NATIVE_ASSET_PUBLIC_INVALID');
  const sdk=await loadReceiz(),opened=await openNativeAssetPublic(sdk.receizBase64UrlDecode(packet.exactBytesB64u)),asset=opened.certificate.asset;
  if(opened.artifactSha256!==packet.artifactSha256||asset.id!==assetId)throw Error('BANK_NATIVE_ASSET_PUBLIC_MISMATCH');
  return {packet:{artifactSha256:opened.artifactSha256,exactBytesB64u:packet.exactBytesB64u},asset};
 }
 const controller=createBackedAssetPublication({ownerReceizId:d.ownerReceizId,assertOpen:d.assertOpen,lock:d.lock,read:d.read,write:d.write,
  prepareSource:async raw=>{const intent=raw as Intent,prepared=await(await publisher()).sealContent(readComposerAssetContent(intent.content,d.ownerReceizId)),held=await d.retain(prepared.artifact);d.assertOpen();if(held.digest!==prepared.reference.artifactSha256)throw Error('BANK_BACKED_PUBLICATION_SOURCE_INVALID');retainAssetPublicationSource(held.digest,prepared.artifact);const reference=await(await publisher()).stage(prepared.artifact);return{digest:held.digest,filename:prepared.artifact.name,mimeType:prepared.artifact.type,reference};},
  prepareFunding:async(raw,source)=>{
   const intent=raw as Intent,definition={...intent.definition,linkedProofDigest:source.digest},authoredSource=parseImportedProofSourceReference(source.reference as never);
   return(await d.operations()).prepare('currencyPolicy' in intent
    ?{kind:'issue-currency',definition,policy:intent.currencyPolicy,authoredSource}
    :{kind:'fund-asset',fundingRule:'reserve-first-then-settlement',amountUsdCents:intent.amountUsdCents,definition,authoredSource});
  },
  executeFunding:async(review,approval)=>{lastFunding=await(await d.operations()).execute(review as BankOperationReview,approval);return(await facts(lastFunding))!;},
  recoverFunding:async nonce=>facts(await d.recoverFunding(nonce)),
  makePackage:async state=>{const {packet,asset:a}=await readPublicAsset(state.assetId!);
   if(a.issuanceSourceSha256!==state.issuanceSourceSha256||a.definition.linkedProofDigest!==state.source.digest)throw Error('BANK_NATIVE_ASSET_PUBLIC_MISMATCH');
   const intent=state.intent as Intent;
   if('currencyPolicy' in intent
     ? !a.currency||canonicalizeReceizV122(a.currency.policy)!==canonicalizeReceizV122(intent.currencyPolicy)
     : !!a.currency)throw Error('BANK_NATIVE_ASSET_PUBLIC_MISMATCH');
   const content=readComposerAssetContent(intent.content,d.ownerReceizId),prepared=await(await publisher()).sealContent({...content,nativeAsset:{authoredSource:parseImportedProofSourceReference(state.source.reference as never),publicCertificateB64u:packet.exactBytesB64u,publicCertificateSha256:packet.artifactSha256}}),held=await d.retain(prepared.artifact);if(held.digest!==prepared.reference.artifactSha256)throw Error('BANK_BACKED_PUBLICATION_PACKAGE_INVALID');retainAssetPublicationSource(held.digest,prepared.artifact);return{digest:held.digest,filename:prepared.artifact.name,mimeType:prepared.artifact.type,reference:prepared.reference};},
  publish:async source=>{const receipt=await(await publisher()).publish(await restore(source));d.assertOpen();acknowledgeAssetPublication(source.digest,receipt);if(receipt.status==='published'){void refreshAssetPublicationCatalog(source.digest);resetPublisher();}return receipt;},
 });
 async function deposit(state:BackedPublicationState|null){if(!state||state.stage==='source-held'||state.stage==='funding-pending')return null;const source=state.package??state.source,file=await restore(source),held=await d.retain(file);return Object.assign(held,{publication:state.receipt?.status==='published'?{status:'published' as const,showcaseArtifactDigest:state.receipt.artifactDigest}:{status:'pending' as const,code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'}});}
 return{readPublicAsset,async pending(includePublished=false){const state=await controller.status();return{state,deposit:state?.stage==='published'&&!includePublished?null:await deposit(state)};},async resume(){return deposit(await controller.resume());},cancel:async()=>{await controller.cancel();resetPublisher();},
  operations(draft?:AssetComposerDraft):BankOperations{return{async prepare(operation){d.assertOpen();if(operation.kind!=='fund-asset'&&operation.kind!=='issue-currency')throw Error('BANK_BACKED_PUBLICATION_INPUT_INVALID');let intent:Intent|undefined;
    if(draft)intent=operation.kind==='issue-currency'
      ?{definition:operation.definition,currencyPolicy:operation.policy,content:await prepareCurrencyContent(draft,operation.definition)}
      :{definition:operation.definition,amountUsdCents:operation.amountUsdCents,content:await prepareContent(draft,operation.definition)};
    return await controller.prepare(intent) as BankOperationReview;},async execute(review,approval){lastFunding=undefined;try{await controller.execute(review,approval);}catch(error){const result=lastFunding as BankOperationResult|undefined;if(!result||result.status!=='committed')throw error;}if(!lastFunding)throw Error('BANK_BACKED_PUBLICATION_RECOVERY_REQUIRED');return lastFunding;},discard(review){if(controller.discard(review))resetPublisher();void d.operations().then(api=>api.discard(review));}};},
 };
}
