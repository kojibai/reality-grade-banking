import {useEffect,useId,useState} from 'react';
import type {AssetComposerDraft,ComposerCollectionPolicy} from '../../receiz/asset-composer';

import type {CollectionPreview} from '../../receiz/collection-preview';

const defaults:ComposerCollectionPolicy={allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadPriceCents:null};
type Inputs={originalLimit:string;originalPrice:string;derivativeLimit:string;derivativePrice:string};
type Permission='allowOriginalDownload'|'allowDerivativeDownload'|'allowMomentRecordDownload'|'gateAudioPlayback';
const inputValue=(value:number|null|undefined,price=false)=>value==null?'':price?(value/100).toFixed(2):String(value);
// Match the Source composer input rules without importing its page components.
function parseLimit(raw:string):number|null{const value=raw.trim();if(!value)return null;if(!/^\d+$/.test(value))return Number.NaN;const parsed=Number.parseInt(value,10);return Number.isSafeInteger(parsed)&&parsed>=1&&parsed<=1_000_000?parsed:Number.NaN;}
function parsePrice(raw:string):number|null{const value=raw.trim();if(!value)return null;if(!/^\d+(?:\.\d{0,2})?$/.test(value))return Number.NaN;const cents=Math.round(Number.parseFloat(value)*100);return Number.isSafeInteger(cents)&&cents>=1&&cents<=1_000_000?cents:Number.NaN;}

export function ComposerCollectionOptions({value,onChange,onCover,hidden=false}:{value:AssetComposerDraft;onChange(value:AssetComposerDraft):void;onCover(file:File):void;hidden?:boolean}){
 const collection=value.collection??defaults,id=useId(),preview=value.collectionPreview;
 const cover=value.files.find(file=>file.role==='cover'),playable=value.kind==='audio'||value.kind==='video';
 const [inputs,setInputs]=useState<Inputs>(()=>({originalLimit:inputValue(collection.originalDownloadLimit),originalPrice:inputValue(collection.originalDownloadPriceCents,true),derivativeLimit:inputValue(collection.derivativeDownloadLimit),derivativePrice:inputValue(collection.derivativeDownloadPriceCents,true)}));
 useEffect(()=>{if(value.kind==='moment')setInputs(current=>current.originalLimit||current.originalPrice?{...current,originalLimit:'',originalPrice:''}:current);},[value.kind]);
 function update(policy:ComposerCollectionPolicy,next=inputs){
  // Invalid enabled fields deliberately remain invalid in the draft. The existing
  // strict preparation validator rejects them before either creation path seals.
  onChange({...value,...(!policy.allowOriginalDownload&&preview?{collectionPreview:undefined,...(value.kind==='image'?{files:value.files.filter(file=>file.role!=='cover')}:{})}:{}),collection:{...policy,gateAudioPlayback:value.kind==='audio'&&policy.gateAudioPlayback,originalDownloadLimit:policy.allowOriginalDownload?parseLimit(next.originalLimit):null,originalDownloadPriceCents:policy.allowOriginalDownload?parsePrice(next.originalPrice):null,derivativeDownloadLimit:policy.allowDerivativeDownload?parseLimit(next.derivativeLimit):null,derivativeDownloadPriceCents:policy.allowDerivativeDownload?parsePrice(next.derivativePrice):null}});
 }
 function permission(key:Permission,checked:boolean){update({...collection,[key]:checked});}
 function selectPreview(kind:CollectionPreview['kind']){
  onChange({...value,collectionPreview:kind==='clip'?{kind,seconds:15}:kind==='excerpt'?{kind,pages:3}:{kind}});
 }
 function clearPreview(){
  const files=value.kind==='image'?value.files.filter(file=>file.role!=='cover'):value.files;
  onChange({...value,collectionPreview:undefined,files});
 }
 function input(field:keyof Inputs,raw:string){const next={...inputs,[field]:raw};setInputs(next);update(collection,next);}
 function downloadFields(kind:'original'|'derivative'){
  const name=kind==='original'?'Original':'Derivative',limitKey=kind==='original'?'originalLimit':'derivativeLimit',priceKey=kind==='original'?'originalPrice':'derivativePrice',invalidLimit=Number.isNaN(parseLimit(inputs[limitKey])),invalidPrice=Number.isNaN(parsePrice(inputs[priceKey]));
  return <div className="asset-collection-fields">
   <label className="form-field"><span>Total quantity <small>Optional</small></span><input aria-label={`${name} download quantity`} type="text" inputMode="numeric" value={inputs[limitKey]} onChange={event=>input(limitKey,event.target.value)} placeholder="Unlimited" aria-invalid={invalidLimit} aria-describedby={`${id}-${kind}-quantity`}/><small id={`${id}-${kind}-quantity`} className={invalidLimit?'asset-collection-error':''} role={invalidLimit?'alert':undefined}>{invalidLimit?'Use a whole number from 1 to 1,000,000.':'Blank means unlimited.'}</small></label>
   <label className="form-field"><span>Price (USD) <small>{kind==='original'&&preview?'Required':'Optional'}</small></span><input aria-label={`${name} download price (USD)`} type="text" inputMode="decimal" value={inputs[priceKey]} onChange={event=>input(priceKey,event.target.value)} placeholder={kind==='original'&&preview?'0.00':'Free'} aria-invalid={invalidPrice} aria-describedby={`${id}-${kind}-price`}/><small id={`${id}-${kind}-price`} className={invalidPrice?'asset-collection-error':''} role={invalidPrice?'alert':undefined}>{invalidPrice?'Use a USD amount from 0.01 to 10,000.00.':kind==='original'&&preview?'Set a price to unlock the Original.':'Blank means free.'}</small></label>
  </div>;
 }
 return <details className="moment-optional asset-collection" data-composer-section="collection" hidden={hidden}>
  <summary>Collection <span>Permissions &amp; pricing</span></summary>
  <p className="asset-collection-intro">Choose what others can collect from this Original.</p>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow original download" checked={collection.allowOriginalDownload} onChange={event=>permission('allowOriginalDownload',event.target.checked)}/><span>Original file<small>Let others collect and verify this Original.</small></span></label>{collection.allowOriginalDownload?downloadFields('original'):null}</div>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow derivative download" checked={collection.allowDerivativeDownload} onChange={event=>permission('allowDerivativeDownload',event.target.checked)}/><span>Derivative download<small>A verifiable child with its Original lineage.</small></span></label>{collection.allowDerivativeDownload?downloadFields('derivative'):null}</div>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow moment record download" checked={collection.allowMomentRecordDownload} onChange={event=>permission('allowMomentRecordDownload',event.target.checked)}/><span>Moment record<small>The claim card, separate from the original file.</small></span></label></div>
  {value.kind!=='moment'&&collection.allowOriginalDownload&&<div className="asset-collection-option">
   <label className="asset-collection-permission"><input type="checkbox" checked={!!preview} onChange={event=>event.target.checked?selectPreview('hidden'):clearPreview()}/><span>Require purchase to open<small>Keep the complete Original private until purchase.</small></span></label>
   {preview&&<div className="asset-collection-fields asset-collection-preview">
    <label className="form-field"><span>Public preview</span><select aria-label="Public preview" value={preview.kind} onChange={event=>selectPreview(event.target.value as CollectionPreview['kind'])}><option value="hidden">Hide content</option><option value="cover">Cover image</option>{value.kind==='image'&&<option value="blur">Blurred image</option>}{playable&&<option value="clip">Preview clip</option>}{['pdf','epub'].includes(value.kind)&&<option value="excerpt">PDF excerpt</option>}</select></label>
    {preview.kind==='cover'&&<label className="form-field"><span>{cover?.file.name??'Choose a separate cover'}</span><input type="file" accept="image/*" aria-label="Public cover image" onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onCover(file);event.currentTarget.value='';}}/></label>}
    {preview.kind==='blur'&&<small>Only a low-detail image will be public.</small>}
    {preview.kind==='excerpt'&&<>
     <label className="form-field"><span>Maximum preview pages</span><select aria-label="Maximum preview pages" value={preview.pages} onChange={event=>onChange({...value,collectionPreview:{...preview,pages:Number(event.target.value) as 1|3|5}})}>{[1,3,5].map(pages=><option key={pages} value={pages}>{pages} {pages===1?'page':'pages'}</option>)}</select></label>
     <label className="form-field"><span>{preview.file?.name??'Choose a separate PDF excerpt'}</span><input type="file" accept="application/pdf,.pdf" aria-label="Public PDF excerpt" onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onChange({...value,collectionPreview:{...preview,file}});event.currentTarget.value='';}}/></label>
    </>}
    {preview.kind==='clip'&&<>
     <label className="form-field"><span>Maximum preview length</span><select aria-label="Maximum preview length" value={preview.seconds} onChange={event=>onChange({...value,collectionPreview:{...preview,seconds:Number(event.target.value) as 15|30|60}})}>{[15,30,60].map(seconds=><option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
     <label className="form-field"><span>{preview.file?.name??'Choose a separate preview clip'}</span><input type="file" accept={value.kind+'/*'} aria-label="Public preview clip" onChange={event=>{const file=event.currentTarget.files?.[0];if(file)onChange({...value,collectionPreview:{...preview,file}});event.currentTarget.value='';}}/></label>
    </>}
   </div>}
  </div>}
  {value.kind==='audio'&&!preview?<div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Gate audio playback" checked={collection.gateAudioPlayback} onChange={event=>permission('gateAudioPlayback',event.target.checked)}/><span>Gate audio playback<small>Apply the collection gate to playback on your profile.</small></span></label></div>:null}
  <p className="asset-collection-note">Turn off every download option to disable collection downloads.</p>
 </details>;
}
