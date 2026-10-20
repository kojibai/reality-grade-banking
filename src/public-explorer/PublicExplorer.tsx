import {SiteFooter} from '../components/SiteFooter';
import {BankMark} from '../components/BankMark';
import {KaiKlok} from '../components/KaiKlok';
import {Market} from '../features/market/Market';
import {useEffect,useRef,useState} from 'react';
import {assetCategories,learningPages} from '../content/learning-pages.mjs';
import {usePublicMarket} from '../receiz/usePublicMarket';
import {assetPageId,assetPageSeed} from '../receiz/public-asset-page';
import {PublicAssetPage} from './PublicAssetPage';
import './explorer.css';
/** A separate public entry: never opens device identity or private account custody. */
export function PublicExplorer({active=true}:{active?:boolean}){
 const [path,setPath]=useState(()=>location.pathname);
 useEffect(()=>{const change=()=>setPath(location.pathname);addEventListener('popstate',change);addEventListener('receiz-bank:surface',change);return()=>{removeEventListener('popstate',change);removeEventListener('receiz-bank:surface',change);};},[]);
 const id=assetPageId(path),marketPath=useRef(path);if(!id)marketPath.current=path;
 const category=assetCategories.find(item=>item.path===marketPath.current),cap=path==='/market-cap/',guide=learningPages.find(page=>page.slug==='global-market-cap')!;
 const held=id?assetPageSeed(id):null,source=usePublicMarket(active),refreshed=id?source.catalog?.items.find(item=>item.id===id):null,item=id?(source.status==='live'?refreshed??held:held??refreshed):null;
 return <div className="console public-explorer"><a className="explorer-skip" href="#explorer-main">Skip to explorer</a><header className="app-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a><KaiKlok active={active}/><div className="header-tools"><a className="avatar explorer-account" href="/" aria-label="Open your account">ID</a></div></header><main className="main-panel" id="explorer-main"><nav className="public-market-nav" aria-label="Market navigation"><a href="/learn/">Learn</a><a href="/explore/">Explore</a><a href="/market-cap/">Global Market Cap</a><a href="/ledger/">Ledger</a></nav>{id?(item?<PublicAssetPage key={item.id} item={item}/>:<section><h1>Asset</h1><p className="body-copy">{source.catalog?'This asset is not in the available public collection. Its original source remains authoritative.':'The selected public source is being resolved.'}</p><a href="/explore/">Explore public assets</a></section>):null}<div hidden={!!id}><Market active={active&&!id} sourceActive={active} source={source} mode="explorer" publicCategory={category} overviewOnly={marketPath.current==='/market-cap/'}/></div> {cap&&<article className="public-cap-guide"><p className="page-subtitle">{guide.intro}</p>{guide.sections.map(([heading,copy])=><section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}<a href="/explore/" data-cap-explore>Explore the included assets ↗</a><a href="/learn/how-value-works/">Inspect the exact valuation method ↗</a></article>}<SiteFooter/></main></div>;
}
