import {lazy,Suspense,useLayoutEffect,useState} from 'react';
import {ArrowLeft,ChevronDown} from 'lucide-react';
import type {PublicMarketItem} from '../receiz/public-market';
import {AssetPageLinks} from '../components/AssetPageLinks';
import {PublicAssetDetail} from '../features/market/PublicAssetDetail';
import {marketContentLabel} from '../receiz/market-categories';
import './asset-page.css';
import {retainPublicAsset} from '../receiz/public-asset-page';
import {beginPublicAssetTrade} from '../receiz/public-asset-trade';
import {PublicAssetTradeHost} from './PublicAssetTradeHost';
const AssetEvidence=lazy(()=>import('./PublicAssetEvidence').then(module=>({default:module.PublicAssetEvidence})));
export function PublicAssetPage({item}:{item:PublicMarketItem}){
 const [depth,setDepth]=useState(false);
 useLayoutEffect(()=>{retainPublicAsset(item);},[item.id,item.title,item.summary]);
 return <article className="public-asset-page"><nav className="public-asset-top" aria-label="Asset navigation"><a href="/explore/"><ArrowLeft size={15}/>Explore</a><AssetPageLinks item={item} standalone/></nav><div className="public-asset-category">{marketContentLabel(item)} · Public original</div><PublicAssetDetail item={item} standalone onTrade={side=>beginPublicAssetTrade({itemId:item.id,side,title:item.title})}/><details className="public-asset-evidence" onToggle={event=>setDepth(event.currentTarget.open)}><summary>History &amp; original evidence<ChevronDown size={17}/></summary>{depth&&<Suspense fallback={<p className="body-copy small-copy">Opening the evidence reader…</p>}><AssetEvidence item={item}/></Suspense>}</details><nav className="public-asset-bottom" aria-label="Understand this asset"><a href="/learn/ownership/">Ownership</a><a href="/learn/how-value-works/">Valuation method</a><a href="/learn/asset-rights-and-backing/">Rights &amp; backing</a></nav><PublicAssetTradeHost/></article>;
}
