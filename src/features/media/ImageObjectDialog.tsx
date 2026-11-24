import {lazy,Suspense,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import type {PublicMarketItem} from '../../receiz/public-market';
import {AssetObject} from './AssetObject';
import {ExpandedMedia} from './ExpandedMedia';
import {ProofImageCanvas} from './ProofImageCanvas';
import './image-object-dialog.css';

const AssetProofBack=lazy(()=>import('./AssetProofBack').then(module=>({default:module.AssetProofBack})));

/** Present the selected Original's existing image and proof in one modal.
 * Flipping opens its carried manifest. Verification remains an explicit action. */
type ImageObjectProof={item:PublicMarketItem;renderBack?:never}|{item?:never;renderBack:()=>ReactNode};

export function ImageObjectDialog({item,renderBack,title,url,label='Original image',resolved=false,onClose,children}:ImageObjectProof & {
 title:string;url:string;label?:string;resolved?:boolean;onClose:()=>void;children?:ReactNode;
}){
 const [ratio,setRatio]=useState(16/9);
 const [scale,setScale]=useState(1);
 const [front,setFront]=useState(true);
 const stage=useRef<HTMLDivElement>(null);
 const object=useRef<HTMLDivElement>(null);
 const [zoomHost,setZoomHost]=useState<HTMLDivElement|null>(null);
 return <ExpandedMedia title={title} label={label} onClose={onClose} className="proof-media-dialog--image-object">
  <div className="proof-image-object-body" style={{'--image-object-ratio':ratio,'--image-object-zoom':front?scale:1} as CSSProperties}>
   <AssetObject image className="asset-object--image" label={title} stageRef={stage} objectRef={object}
    onSideChange={side=>setFront(side==='front')}
    toolbarControls={<div className="asset-object-zoom" ref={setZoomHost}/>}
    front={<ProofImageCanvas url={url} label={title} resolved={resolved} expanded zoomControlsHost={zoomHost} objectZoom={{stage,object,front,onScale:setScale}} onAspect={setRatio} onExpand={()=>{}}/>}
    renderBack={item?()=> <Suspense fallback={null}><AssetProofBack item={item} showVerification/></Suspense>:renderBack}/>
  </div>
  {children}
 </ExpandedMedia>;
}
