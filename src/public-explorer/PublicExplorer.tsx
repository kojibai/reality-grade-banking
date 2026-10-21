import {SiteFooter} from '../components/SiteFooter';
import {ArrowUpRight} from 'lucide-react';
import {BankMark} from '../components/BankMark';
import {KaiKlok} from '../components/KaiKlok';
import {Market} from '../features/market/Market';
import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {assetCategories,learningPages} from '../content/learning-pages.mjs';
import {usePublicMarket} from '../receiz/usePublicMarket';
import {assetPageId,assetPageSeed,retainAssetOwnerPortrait} from '../receiz/public-asset-page';
import {PublicAssetPage} from './PublicAssetPage';
import './explorer.css';
import {profilePageUsername} from '../receiz/public-profile';
import {PublicProfilePage} from './PublicProfilePage';
import '../styles/source-links.css';
/** Public browsing stays separate. An explicit trade opens the existing bank
 * account owner in place; rendering public assets never opens custody. */
export function PublicExplorer({active=true}:{active?:boolean}){
 const [path,setPath]=useState(()=>location.pathname);
 // Commit the destination before the public router restores scroll. Otherwise
 // browser scroll anchoring can follow the old catalog into the asset's footer.
 useEffect(()=>{const change=()=>flushSync(()=>setPath(location.pathname));addEventListener('popstate',change);addEventListener('receiz-bank:surface',change);return()=>{removeEventListener('popstate',change);removeEventListener('receiz-bank:surface',change);};},[]);
 const profile=profilePageUsername(path),profilePages=useRef<string[]>([]),retainMarket=useRef(!profile),returnPath=useRef('/explore/');if(profile&&!profilePages.current.includes(profile)){profilePages.current.push(profile);if(profilePages.current.length>4)profilePages.current.shift();}if(!profile)retainMarket.current=true;if(!assetPageId(path))returnPath.current=path;
 const id=assetPageId(path),marketPath=useRef(id?'/explore/':path);if(!id&&(path==='/explore/'||path==='/market-cap/'||assetCategories.some(category=>category.path===path)))marketPath.current=path;
 const category=assetCategories.find(item=>item.path===marketPath.current),cap=path==='/market-cap/',guide=learningPages.find(page=>page.slug==='global-market-cap')!;
 const held=id?assetPageSeed(id):null,source=usePublicMarket(active&&!profile,active),refreshed=id?source.catalog?.items.find(item=>item.id===id):null,candidate=id?(source.status==='live'?refreshed??held:held??refreshed):null,item=candidate?retainAssetOwnerPortrait(candidate,held):null;
 return <div className={"console public-explorer"+(profile?" is-profile":"")}><a className="explorer-skip" href="#explorer-main">Skip to explorer</a><header className="app-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a>{!profile&&<KaiKlok active={active}/>}<div className="header-tools"><a className="avatar explorer-account" href="/" aria-label="Open your account">ID</a></div></header><main className="main-panel" id="explorer-main">{!profile&&<nav className="public-market-nav" aria-label="Market navigation"><a href="/learn/">Learn</a>{(id||cap)&&<a href="/explore/">Explore</a>}<a href="/market-cap/">Global Market Cap</a><a href="/ledger/">Ledger</a></nav>}{profilePages.current.map(name=><div key={name} hidden={profile!==name}><PublicProfilePage username={name} source={source} active={active&&profile===name}/></div>)} {id?(item?<PublicAssetPage key={item.id} item={item} returnPath={returnPath.current}/>:<section><h1>Asset</h1><p className="body-copy">{source.catalog?'This asset is not in the available public collection. Its original source remains authoritative.':'The selected public source is being resolved.'}</p><a href="/explore/">Explore public assets</a></section>):null}{retainMarket.current&&<div hidden={!!id||!!profile}><Market active={active&&!id&&!profile} sourceActive={active&&!profile} source={source} mode="explorer" publicCategory={category} overviewOnly={marketPath.current==='/market-cap/'}/></div>} {cap&&<article className="public-cap-guide"><p className="page-subtitle">{guide.intro}</p>{guide.sections.map(([heading,copy])=><section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}<a className="source-link" href="/explore/" data-cap-explore><span>Explore the included assets</span><ArrowUpRight size={16} aria-hidden="true"/></a><a className="source-link" href="/learn/how-value-works/"><span>Inspect the exact valuation method</span><ArrowUpRight size={16} aria-hidden="true"/></a></article>}<SiteFooter/></main></div>;
}
