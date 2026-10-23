import {CopyFeedbackIcon,useCopyFeedback} from './CopyFeedback';
import {useState} from 'react';
import {ArrowUpRight,Share2} from 'lucide-react';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import type {PublicMarketItem} from '../receiz/public-market';
import './asset-page-links.css';
export function AssetPageLinks({item,standalone=false}:{item:PublicMarketItem;standalone?:boolean}){
 const [notice,setNotice]=useState(''),{copied,confirm,clear}=useCopyFeedback(item.id),path=assetPagePath(item.id);
 const link=()=>new URL(path,location.origin).href;
 const copy=async()=>{try{await navigator.clipboard.writeText(link());confirm();setNotice('');}catch{clear();setNotice('Copy the asset page address from your browser.');}};
 const share=async()=>{try{if(navigator.share)await navigator.share({title:item.title,url:link()});else await copy();}catch(cause){if(!(cause instanceof Error&&cause.name==='AbortError'))setNotice('Sharing is unavailable here. Use Copy link.');}};
 return <div className="asset-page-links">{!standalone&&<a href={path} onClick={()=>retainPublicAsset(item)}>Asset page<ArrowUpRight size={14}/></a>}<button className="icon-button" aria-label={copied?'Asset link copied':'Copy asset link'} title="Copy asset link" onClick={()=>void copy()}><CopyFeedbackIcon copied={copied} size={17}/></button><button className="icon-button" aria-label="Share asset" title="Share asset" onClick={()=>void share()}><Share2 size={17}/></button><span className="sr-only" role="status">{copied?'Asset link copied':notice}</span></div>;
}
