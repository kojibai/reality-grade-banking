import {profileUsernameLabel} from '../receiz/account-name';
import {lazy,Suspense,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowRight,BookOpen,FileText,GalleryVerticalEnd,Image as ImageIcon,Music2,Play,Search,X} from 'lucide-react';
import {MarketFeedPopover as Viewer} from '../features/market/MarketFeedPopover';
import {DiscoveryVideo} from './DiscoveryVideo';
import {BankMark} from '../components/BankMark';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {PublicOwnerAvatar} from '../public-explorer/PublicOwnerAvatar';
import {PublicCollectibleArtwork} from '../features/collectibles/PublicCollectibleArtwork';
import {readAccountAppearance,subscribeAccountAppearance} from '../receiz/account-appearance';
import {safeReceizArtworkUrl,type PublicMarketItem} from '../receiz/public-market';
import {profilePagePath} from '../receiz/public-profile';
import {appendFeedItems,feedKind,feedText} from '../public-feed/feed-items';
import {prepareFeedItems,prepareFeedCollectibles} from '../public-feed/feed-source';
import {buildDiscoveryIndex,searchDiscovery,discoveryOwnerName,type DiscoveryFilter,type DiscoveryPerson} from './discovery-index';
import './discover.css';
const Document=lazy(()=>import('../public-feed/FeedDocument'));
const categories:[DiscoveryFilter,string][]=[['All','All'],['audio','Music'],['video','Videos'],['book','Books'],['image','Images'],['essay','Essays'],['moment','Moments'],['document','Documents'],['collectible','Collectibles'],['People','People']];
const icons={image:ImageIcon,audio:Music2,video:Play,book:BookOpen,essay:FileText,moment:FileText,document:FileText,collectible:GalleryVerticalEnd};
function People({people,onAll,active,expanded=false}:{people:DiscoveryPerson[];onAll?():void;active:boolean;expanded?:boolean}){
 const [shown,setShown]=useState(20),row=useRef<HTMLDivElement>(null),last=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{if(!active||shown>=people.length||!row.current||!last.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setShown(count=>count+20);},{root:expanded?null:row.current,rootMargin:expanded?'400px 0px':'0px 400px'});observer.observe(last.current);return()=>observer.disconnect();},[active,shown,people.length,expanded]);
 return <section className="discover-people" aria-label="People to discover"><div className="discover-section-heading"><h2>People to discover</h2>{onAll&&<button onClick={onAll}>See all<ArrowRight size={15}/></button>}</div><div ref={row} className={'discover-people-list'+(expanded?' is-expanded':'')}>{people.slice(0,shown).map((person,i)=><a ref={i===Math.min(shown,people.length)-1?last:undefined} key={person.username} href={profilePagePath(person.username)}><PublicOwnerAvatar item={person.items[0]} name={person.name}/><strong>{person.name}</strong><span>@{profileUsernameLabel(person.username)}</span></a>)}</div>{expanded&&shown<people.length&&<div className="discover-more"><button onClick={()=>setShown(count=>count+20)}>Show more<ArrowRight size={15}/></button></div>}</section>;
}
function Work({item,onOpen,eager,active}:{item:PublicMarketItem;onOpen():void;eager:boolean;active:boolean}){
 const kind=feedKind(item),text=kind==='moment'||kind==='essay',image=text||kind==='document'?null:safeReceizArtworkUrl(item.artworkUrl),Icon=icons[kind],ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{if(!active||kind!=='document'&&kind!=='video'||!ref.current)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{const near=entries.some(entry=>entry.isIntersecting);if(kind==='video')setVisible(near);else if(near){setVisible(true);observer.disconnect();}},{rootMargin:'100px'});observer.observe(ref.current);return()=>observer.disconnect();},[kind,active]);
 return <button className="discover-work" onClick={onOpen} aria-label={`Open ${item.title}`}><div ref={ref} aria-hidden="true" className={`discover-cover is-${kind}`}>
 {kind==='collectible'&&image?<PublicCollectibleArtwork item={item} eager={eager}/>:kind==='video'?<DiscoveryVideo item={item} active={active&&visible}/>:kind==='document'&&visible?<Suspense fallback={<span className="discover-cover-title">{item.title}</span>}><Document item={item}/></Suspense>:image?<img src={image} alt="" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'low'} decoding="async" referrerPolicy="no-referrer" crossOrigin={image.includes('/api/proof-material/packages/')?'anonymous':undefined}/>:<div className="discover-text-work"><span>{kind==='moment'?'This happened':kind==='essay'?'Essay':kind==='book'?'Book':'Original'}</span><p>{feedText(item).slice(0,240)}</p></div>}
 <span className="discover-kind" aria-label={categories.find(([key])=>key===kind)?.[1]??kind}><Icon size={17} strokeWidth={1.6}/></span></div><strong className="discover-work-title">{item.title}</strong><span className="discover-work-owner">{discoveryOwnerName(item)}</span></button>;
}
/** Direction changes affect only these same controls, never the gallery/source. */
function useScrollReveal(active:boolean){
 const [away,setAway]=useState(false);
 useEffect(()=>{if(!active)return;let previous=window.scrollY,frame=0;
 const read=()=>{frame=0;const y=window.scrollY,delta=y-previous;if(document.activeElement?.closest('.discover-search')){setAway(false);previous=y;return;}if(y<180)setAway(false);else if(Math.abs(delta)>6){setAway(delta>0);previous=y;}if(y<180)previous=y;};
 const scroll=()=>{if(!frame)frame=requestAnimationFrame(read);};window.addEventListener('scroll',scroll,{passive:true});return()=>{window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);};},[active]);
 return {away,reveal:()=>setAway(false)};
}
export function Discover({seed,active=true}:{seed:PublicMarketItem[];active?:boolean}){
 const [items,setItems]=useState(seed),[query,setQuery]=useState(''),[filter,setFilter]=useState<DiscoveryFilter>('All'),[shown,setShown]=useState(20),[selected,setSelected]=useState<{id?:string}|null>(null),[collecting,setCollecting]=useState(false);
 const scrollTools=useScrollReveal(active);
 const appearance=useSyncExternalStore(subscribeAccountAppearance,readAccountAppearance,()=>null),index=useMemo(()=>buildDiscoveryIndex(items),[items]),results=useMemo(()=>searchDiscovery(index,query,filter),[index,query,filter]),more=useRef<HTMLDivElement>(null);
 const searched=query.trim().length>0,rows=results.items.slice(0,shown),initial=!searched&&filter==='All',people=results.people;
 useEffect(()=>{if(!active)return;const abort=new AbortController();void prepareFeedItems(abort.signal).then(found=>{if(!abort.signal.aborted)setItems(held=>appendFeedItems(held,found));}).catch(()=>{});return()=>abort.abort();},[active]);
 useEffect(()=>{setShown(20);},[query,filter]);
 useEffect(()=>{if(!active||shown>=results.items.length||!more.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setShown(count=>count+20);},{rootMargin:'500px'});observer.observe(more.current);return()=>observer.disconnect();},[active,shown,results.items.length]);
 const select=(next:DiscoveryFilter)=>{setFilter(next);if(next!=='collectible'||items.some(item=>item.category==='sports')||collecting)return;setCollecting(true);void prepareFeedCollectibles().then(found=>setItems(held=>appendFeedItems(held,found))).catch(()=>{}).finally(()=>setCollecting(false));};
 const gallery=(works:PublicMarketItem[],offset=0)=><div className="discover-gallery">{works.map((item,i)=><Work key={item.id} item={item} eager={i+offset<4} active={active} onOpen={()=>setSelected({id:item.id})}/>)}</div>;
 return <div className="discovery-page"><div className="discover-shell"><header className="discover-header"><a href="/" aria-label="Bankeiz home"><BankMark/></a><div><button className="discover-icon" aria-label="Open feed" title="Open feed" onClick={()=>setSelected({})}><GalleryVerticalEnd size={21} strokeWidth={1.5}/></button><a href={appearance?'/#account/profile':'/'} className="discover-account" aria-label="Open your account"><ProfileAvatar src={appearance?.avatarUrl} name={appearance?.name??'ID'} fallback="ID" eager/></a></div></header>
 <main><h1>Discover</h1><div className={'discover-search-tools'+(scrollTools.away?' is-away':'')} onFocusCapture={scrollTools.reveal}><div className="discover-search"><Search size={19} strokeWidth={1.6}/><input type="search" aria-label="Search people and their work" placeholder="Search people and their work" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" spellCheck={false}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={16}/></button>}</div>
 <nav className="discover-filters" aria-label="Discover categories">{categories.map(([key,label])=><button key={key} onClick={()=>select(key)} aria-pressed={filter===key}>{label}</button>)}</nav></div>
 {initial?<>{gallery(rows.slice(0,4))}{people.length>0&&<People key={filter+':'+query} active={active} people={people} onAll={()=>select('People')}/>} {gallery(rows.slice(4),4)}</>:<>{people.length>0&&<People key={filter+':'+query} active={active} expanded={filter==='People'} people={people}/>} {filter!=='People'&&gallery(rows)}</>}
 {!rows.length&&!people.length&&<div className="discover-empty"><h2>{collecting?'Collectibles':'Room for discovery.'}</h2><p>{searched?'Try a name, a title or a different word.':'Explore another category or discover all works.'}</p><button onClick={()=>{setQuery('');select('All');}}>See all works<ArrowRight size={15}/></button></div>}
 <div ref={more} className="discover-more">{filter!=='People'&&results.items.length>shown&&<button onClick={()=>setShown(count=>count+20)}>Show more<ArrowRight size={15}/></button>}</div>
 <footer className="discover-footer"><a href="/explore/">Explore the market<ArrowRight size={14}/></a></footer></main></div>
 {selected&&<Viewer musicContinuation={prepareFeedItems} items={index.items} initialFilter={filter==='audio'?'audio':undefined} selectedItemId={selected.id} onDiscover={()=>setSelected(null)} active={active} onClose={()=>setSelected(null)}/>}</div>;
}
