import {useEffect,useId,useState} from 'react';
import type {AssetComposerDraft,ComposerCollectionPolicy} from '../../receiz/asset-composer';

const defaults:ComposerCollectionPolicy={allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:null,derivativeDownloadPriceCents:null};
type Inputs={originalLimit:string;originalPrice:string;derivativeLimit:string;derivativePrice:string};
type Permission='allowOriginalDownload'|'allowDerivativeDownload'|'allowMomentRecordDownload'|'gateAudioPlayback';
const inputValue=(value:number|null|undefined,price=false)=>value==null?'':price?(value/100).toFixed(2):String(value);
// Match the Source composer input rules without importing its page components.
function parseLimit(raw:string):number|null{const value=raw.trim();if(!value)return null;if(!/^\d+$/.test(value))return Number.NaN;const parsed=Number.parseInt(value,10);return Number.isSafeInteger(parsed)&&parsed>=1&&parsed<=1_000_000?parsed:Number.NaN;}
function parsePrice(raw:string):number|null{const value=raw.trim();if(!value)return null;if(!/^\d+(?:\.\d{0,2})?$/.test(value))return Number.NaN;const cents=Math.round(Number.parseFloat(value)*100);return Number.isSafeInteger(cents)&&cents>=1&&cents<=1_000_000?cents:Number.NaN;}

export function ComposerCollectionOptions({value,onChange,hidden=false}:{value:AssetComposerDraft;onChange(value:AssetComposerDraft):void;hidden?:boolean}){
 const collection=value.collection??defaults,id=useId();
 const [inputs,setInputs]=useState<Inputs>(()=>({originalLimit:inputValue(collection.originalDownloadLimit),originalPrice:inputValue(collection.originalDownloadPriceCents,true),derivativeLimit:inputValue(collection.derivativeDownloadLimit),derivativePrice:inputValue(collection.derivativeDownloadPriceCents,true)}));
 useEffect(()=>{if(value.kind==='moment')setInputs(current=>current.originalLimit||current.originalPrice?{...current,originalLimit:'',originalPrice:''}:current);},[value.kind]);
 function update(policy:ComposerCollectionPolicy,next=inputs){
  // Invalid enabled fields deliberately remain invalid in the draft. The existing
  // strict preparation validator rejects them before either creation path seals.
  onChange({...value,collection:{...policy,gateAudioPlayback:value.kind==='audio'&&policy.gateAudioPlayback,originalDownloadLimit:policy.allowOriginalDownload?parseLimit(next.originalLimit):null,originalDownloadPriceCents:policy.allowOriginalDownload?parsePrice(next.originalPrice):null,derivativeDownloadLimit:policy.allowDerivativeDownload?parseLimit(next.derivativeLimit):null,derivativeDownloadPriceCents:policy.allowDerivativeDownload?parsePrice(next.derivativePrice):null}});
 }
 function permission(key:Permission,checked:boolean){update({...collection,[key]:checked});}
 function input(field:keyof Inputs,raw:string){const next={...inputs,[field]:raw};setInputs(next);update(collection,next);}
 function downloadFields(kind:'original'|'derivative'){
  const name=kind==='original'?'Original':'Derivative',limitKey=kind==='original'?'originalLimit':'derivativeLimit',priceKey=kind==='original'?'originalPrice':'derivativePrice',invalidLimit=Number.isNaN(parseLimit(inputs[limitKey])),invalidPrice=Number.isNaN(parsePrice(inputs[priceKey]));
  return <div className="asset-collection-fields">
   <label className="form-field"><span>Total quantity <small>Optional</small></span><input aria-label={`${name} download quantity`} type="text" inputMode="numeric" value={inputs[limitKey]} onChange={event=>input(limitKey,event.target.value)} placeholder="Unlimited" aria-invalid={invalidLimit} aria-describedby={`${id}-${kind}-quantity`}/><small id={`${id}-${kind}-quantity`} className={invalidLimit?'asset-collection-error':''} role={invalidLimit?'alert':undefined}>{invalidLimit?'Use a whole number from 1 to 1,000,000.':'Blank means unlimited.'}</small></label>
   <label className="form-field"><span>Price (USD) <small>Optional</small></span><input aria-label={`${name} download price (USD)`} type="text" inputMode="decimal" value={inputs[priceKey]} onChange={event=>input(priceKey,event.target.value)} placeholder="Free" aria-invalid={invalidPrice} aria-describedby={`${id}-${kind}-price`}/><small id={`${id}-${kind}-price`} className={invalidPrice?'asset-collection-error':''} role={invalidPrice?'alert':undefined}>{invalidPrice?'Use a USD amount from 0.01 to 10,000.00.':'Blank means free.'}</small></label>
  </div>;
 }
 return <details className="moment-optional asset-collection" data-composer-section="collection" hidden={hidden}>
  <summary>Collection <span>Permissions &amp; pricing</span></summary>
  <p className="asset-collection-intro">Choose what others can collect from this Original.</p>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow original download" checked={collection.allowOriginalDownload} onChange={event=>permission('allowOriginalDownload',event.target.checked)}/><span>Original file<small>Let others collect and verify this Original.</small></span></label>{collection.allowOriginalDownload?downloadFields('original'):null}</div>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow derivative download" checked={collection.allowDerivativeDownload} onChange={event=>permission('allowDerivativeDownload',event.target.checked)}/><span>Derivative download<small>A verifiable child with its Original lineage.</small></span></label>{collection.allowDerivativeDownload?downloadFields('derivative'):null}</div>
  <div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Allow moment record download" checked={collection.allowMomentRecordDownload} onChange={event=>permission('allowMomentRecordDownload',event.target.checked)}/><span>Moment record<small>The claim card, separate from the original file.</small></span></label></div>
  {value.kind==='audio'?<div className="asset-collection-option"><label className="asset-collection-permission"><input type="checkbox" aria-label="Gate audio playback" checked={collection.gateAudioPlayback} onChange={event=>permission('gateAudioPlayback',event.target.checked)}/><span>Gate audio playback<small>Apply the collection gate to playback on your profile.</small></span></label></div>:null}
  <p className="asset-collection-note">Turn off every download option to disable collection downloads.</p>
 </details>;
}
