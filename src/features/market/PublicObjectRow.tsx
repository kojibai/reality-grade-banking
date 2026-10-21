import {useState} from 'react';
import {ArrowDownRight,ArrowUpRight} from 'lucide-react';
import {AssetMark} from '../../components/AssetMark';
import {formatPublicPrice,safeReceizArtworkUrl,type PublicMarketItem} from '../../receiz/public-market';
import {marketContentLabel} from '../../receiz/market-categories';
import './market.css';
const percent=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
export function PublicObjectArtwork({artworkUrl}:{artworkUrl:PublicMarketItem['artworkUrl']}){
 const [failedArtwork,setFailedArtwork]=useState<string|null>(null),safeArtwork=safeReceizArtworkUrl(artworkUrl),artwork=safeArtwork!==failedArtwork?safeArtwork:null;
 return artwork?<span className="asset-mark market-object-artwork"><img src={artwork} alt="" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailedArtwork(artwork)}/></span>:<AssetMark kind="proof"/>;
}
function PublicObjectProvenance({item}:{item:PublicMarketItem}){
 const copies=item.category==='sports'&&(item.circulationCount??1)>1;
 const carried=item.sealedCopies??[],owners=[...new Set(carried.map(copy=>copy.ownerUsername?`@${copy.ownerUsername}`:copy.ownerDisplayName).filter((owner):owner is string=>!!owner))],times=carried.map(copy=>Date.parse(copy.sealedAt)).filter(Number.isFinite),first=times.length?Math.min(...times):null,last=times.length?Math.max(...times):null;
 const owner=copies&&owners.length?`${owners[0]}${owners.length>1?` +${owners.length-1} ${owners.length===2?'owner':'owners'}`:''}`:copies?'Owners vary by copy':item.ownerUsername?`@${item.ownerUsername}`:item.ownerDisplayName??'Owner not supplied';
 const sealed=copies&&first!==null?`Sealed ${first===last?new Date(first).toLocaleString():`${new Date(first).toLocaleDateString()}–${new Date(last!).toLocaleDateString()}`}`:copies?'Sealed times vary by copy':item.sealedAt?`Sealed ${new Date(item.sealedAt).toLocaleString()}`:'Sealed time not supplied';
 return <span className="market-object-provenance"><span>{owner}</span><span>{sealed}</span></span>;
}
/** Shared discovery/showcase row. Pricing and ownership remain the supplied
 * source projection; opening the row never establishes transferable rights. */
export function PublicObjectRow({item,onOpen}:{item:PublicMarketItem;onOpen:()=>void}){
 const change=item.changePct;
 return <button className="asset-row" onClick={onOpen}><PublicObjectArtwork artworkUrl={item.artworkUrl}/><span className="row-copy"><strong>{item.title}</strong><span>{marketContentLabel(item)}</span><PublicObjectProvenance item={item}/></span><span className="price-stack"><strong>{formatPublicPrice(item.priceUsd)}</strong>{change!==null&&<span title={item.localValuationPulse!==undefined?'Change compared with the retained source quote':'Source price change'} className={change>=0?'positive':'negative'} style={{display:'inline-flex',alignItems:'center',gap:2}}>{change>0?<ArrowUpRight size={12}/>:change<0?<ArrowDownRight size={12}/>:null}{change>0?'+':''}{percent.format(change)}%</span>}</span></button>;
}
