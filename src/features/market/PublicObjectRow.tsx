import {useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {PublicDocumentFormatContext} from '../../core/public-document-format';
import {ArrowDownRight,ArrowUpRight} from 'lucide-react';
import {AssetMark} from '../../components/AssetMark';
import {MomentCard} from '../media/MomentCard';
import {ProofPdfPreview} from '../media/ProofPdfPreview';
import {publicDocumentReaderUrl} from '../../receiz/public-document';
import {formatMoney} from '../../core/money';
import {formatPublicPrice,type PublicMarketItem} from '../../receiz/public-market';
import {marketContentLabel} from '../../receiz/market-categories';
import {observeOriginalImpression,publicOriginalEngagement} from '../../receiz/public-engagement';
import {usePublicObjectArtwork} from '../media/usePublicObjectArtwork';
import './market.css';
const percent=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
export function PublicObjectArtwork({artworkUrl,item,eager=true,children}:{artworkUrl:PublicMarketItem['artworkUrl'];item?:PublicMarketItem;eager?:boolean;children?:(url:string|null|undefined)=>ReactNode}){
 const [failedArtwork,setFailedArtwork]=useState<string|null>(null),safeArtwork=usePublicObjectArtwork(artworkUrl,item),artwork=safeArtwork!==failedArtwork?safeArtwork:null;
 if(children)return children(artwork);
 const document=item?.mediaKind==='pdf'&&item.documentUrl&&(!artwork||new URL(artwork).pathname==='/api/receiz/download')?publicDocumentReaderUrl(item.documentUrl,item.assetId):null;
 if(document&&item)return <span className="asset-mark market-object-document"><ProofPdfPreview key={document+':'+item.originalDigest} url={document} title={item.title} cacheKey={'market:'+item.id+':'+(item.originalDigest??document)}/></span>;
 return artwork||artwork===undefined&&!!artworkUrl?<span className="asset-mark market-object-artwork"><img src={artwork??undefined} alt="" loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" crossOrigin={artwork?.includes('/api/proof-material/packages/')?'anonymous':undefined} onError={()=>setFailedArtwork(artwork??null)}/></span>:item?.mediaKind==='moment'?<span className="asset-mark market-object-moment"><MomentCard item={item} thumbnail/></span>:<AssetMark kind="proof"/>;
}
function PublicObjectProvenance({item}:{item:PublicMarketItem}){
 const format=useContext(PublicDocumentFormatContext),locale=format?.locale,options=format?{timeZone:format.timeZone}:undefined;
 const copies=item.category==='sports'&&(item.circulationCount??1)>1;
 const carried=item.sealedCopies??[],owners=[...new Set(carried.map(copy=>copy.ownerUsername?`@${copy.ownerUsername}`:copy.ownerDisplayName).filter((owner):owner is string=>!!owner))],times=carried.map(copy=>Date.parse(copy.sealedAt)).filter(Number.isFinite),first=times.length?Math.min(...times):null,last=times.length?Math.max(...times):null;
 const owner=copies&&owners.length?`${owners[0]}${owners.length>1?` +${owners.length-1} ${owners.length===2?'owner':'owners'}`:''}`:copies?'Owners vary by copy':item.ownerUsername?`@${item.ownerUsername}`:item.ownerDisplayName??'Owner not supplied';
 const sealed=copies&&first!==null?`Sealed ${first===last?new Date(first).toLocaleString(locale,options):`${new Date(first).toLocaleDateString(locale,options)}–${new Date(last!).toLocaleDateString(locale,options)}`}`:copies?'Sealed times vary by copy':item.sealedAt?`Sealed ${new Date(item.sealedAt).toLocaleString(locale,options)}`:'Sealed time not supplied';
 return <span className="market-object-provenance"><span>{owner}</span><span>{sealed}</span></span>;
}
/** Shared discovery/showcase row. Pricing and ownership remain the supplied
 * source projection; opening the row never establishes transferable rights. */
export function PublicObjectRow({item,onOpen,eagerArtwork=true,artwork,trackImpression=false}:{item:PublicMarketItem;onOpen:(item:PublicMarketItem)=>void;eagerArtwork?:boolean;artwork?:ReactNode;trackImpression?:boolean}){
 const row=useRef<HTMLButtonElement>(null);
 const {username,receizId,mediaKind}=trackImpression?publicOriginalEngagement(item)??{}:{};
 useEffect(()=>{
  if(row.current&&username&&receizId)return observeOriginalImpression(row.current,{username,receizId,mediaKind},'bankeiz_market_collection');
 },[username,receizId,mediaKind]);
 const currency=item.nativeAsset?.currency,change=currency?null:item.changePct;
 return <button className="asset-row" ref={row} onClick={()=>onOpen(item)}>{artwork??<PublicObjectArtwork item={item} artworkUrl={item.artworkUrl} eager={eagerArtwork}/>}<span className="row-copy"><strong>{item.title}</strong><span>{marketContentLabel(item)}</span><PublicObjectProvenance item={item}/></span><span className="price-stack"><strong>{currency?formatMoney(currency.priceUsdCentsPerUnit):formatPublicPrice(item.priceUsd)}</strong>{change!==null&&<span title={item.localValuationPulse!==undefined?'Change compared with the retained source quote':'Source price change'} className={change>=0?'positive':'negative'} style={{display:'inline-flex',alignItems:'center',gap:2}}>{change>0?<ArrowUpRight size={12}/>:change<0?<ArrowDownRight size={12}/>:null}{change>0?'+':''}{percent.format(change)}%</span>}</span></button>;
}
