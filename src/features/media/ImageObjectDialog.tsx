import {lazy,Suspense,useState,type CSSProperties,type ReactNode} from 'react';
import type {PublicMarketItem} from '../../receiz/public-market';
import {AssetObject} from './AssetObject';
import {ExpandedMedia} from './ExpandedMedia';
import {ProofImageCanvas} from './ProofImageCanvas';
import './image-object-dialog.css';

const AssetProofBack=lazy(()=>import('./AssetProofBack').then(module=>({default:module.AssetProofBack})));

/** Present the selected Original's existing image and proof in one modal.
 * Flipping opens its carried manifest. Verification remains an explicit action. */
export function ImageObjectDialog({item,title,url,label='Original image',resolved=false,onClose,children}:{
 item:PublicMarketItem;title:string;url:string;label?:string;resolved?:boolean;onClose:()=>void;children?:ReactNode;
}){
 const [ratio,setRatio]=useState(16/9);
 const [zoomHost,setZoomHost]=useState<HTMLDivElement|null>(null);
 return <ExpandedMedia title={title} label={label} onClose={onClose} className="proof-media-dialog--image-object">
  <div className="proof-image-object-body" style={{'--image-object-ratio':ratio} as CSSProperties}>
   <AssetObject image className="asset-object--image" label={title}
    toolbarControls={<div className="asset-object-zoom" ref={setZoomHost}/>}
    front={<ProofImageCanvas url={url} label={title} resolved={resolved} expanded zoomControlsHost={zoomHost} onAspect={setRatio} onExpand={()=>{}}/>}
    renderBack={()=> <Suspense fallback={null}><AssetProofBack item={item} showVerification/></Suspense>}/>
  </div>
  {children}
 </ExpandedMedia>;
}
