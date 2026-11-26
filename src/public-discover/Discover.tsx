import {observeDiscoverVenueAudience} from './spotlight-traffic';
import {observeOriginalImpression,publicOriginalEngagement,trackPublicEngagement} from '../receiz/public-engagement';
import {usePublicObjectArtwork} from '../features/media/usePublicObjectArtwork';
import {profileUsernameLabel} from '../receiz/account-name';
import {useScrollReveal} from '../core/useScrollReveal';
import {lazy,Suspense,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowRight,BookOpen,FileText,GalleryVerticalEnd,Image as ImageIcon,Music2,Play,Search,X} from 'lucide-react';
import {MarketFeedPopover as Viewer} from '../features/market/MarketFeedPopover';
import {DiscoveryVideo} from './DiscoveryVideo';
import {BankMark} from '../components/BankMark';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {publicProfileAvatar} from '../receiz/profile-artwork';
import {PublicOwnerAvatar} from '../public-explorer/PublicOwnerAvatar';
import {PublicCollectibleArtwork} from '../features/collectibles/PublicCollectibleArtwork';
import {readAccountAppearance,subscribeAccountAppearance} from '../receiz/account-appearance';
import {observePublicMarketMembership,samePublicMarketMembership,safeReceizArtworkUrl,type PublicMarketCatalog,type PublicMarketItem} from '../receiz/public-market';
import {profilePagePath,receivedPublicProfileHead,receivedPublicProfileHeads} from '../receiz/public-profile';
import {appendFeedItems,feedKind,feedText,refreshFeedItems} from '../public-feed/feed-items';
import {publishDiscoveredPublicCatalog,retainedDiscoveredPublicCatalog,subscribeAssetPublicationAdmissions} from '../receiz/asset-publication-adoption';
import {preparedBankCatalogState,subscribePreparedBankCatalog} from '../receiz/prepared-bank-catalog';
import {completeFeedItems,prepareFeedItems,prepareFeedCollectibles,readHeldFeedCatalog} from '../public-feed/feed-source';
import {buildDiscoveryIndex,searchDiscovery,discoveryOwnerName,type DiscoveryFilter,type DiscoveryPerson} from './discovery-index';
import {observePublicProfileDirectory,publicProfileDirectoryIsLive,receivePublicProfileForDiscovery,subscribePublicProfileDirectory} from '../receiz/public-profile-directory';
import {emptySpotlightPlacements,heldSpotlightPlacements,subscribeSpotlightPlacements} from '../receiz/spotlight-placement-view';
import {marketUPulseTime} from '../receiz/market-projection/coordinates';
import './discover.css';
const Document=lazy(()=>import('../public-feed/FeedDocument'));
const categories:[DiscoveryFilter,string][]=[['All','All'],['audio','Music'],['video','Videos'],['book','Books'],['image','Images'],['essay','Essays'],['moment','Moments'],['document','Documents'],['collectible','Collectibles'],['People','People']];
const icons={image:ImageIcon,audio:Music2,video:Play,book:BookOpen,essay:FileText,moment:FileText,document:FileText,collectible:GalleryVerticalEnd};
function PersonAvatar({person}:{person:DiscoveryPerson}){
 const avatar=useMemo(()=>person.avatarUrl??(person.avatarProfile?publicProfileAvatar(person.avatarProfile):null),[person.avatarUrl,person.avatarProfile]);
 return person.items[0]?<PublicOwnerAvatar item={person.items[0]} src={avatar} name={person.name}/>:<ProfileAvatar src={avatar} name={person.name}/>;
}
function People({people,onAll,active,expanded=false}:{people:DiscoveryPerson[];onAll?():void;active:boolean;expanded?:boolean}){
 const publicPeople=people.filter(person=>profileUsernameLabel(person.username,person.receivingUsername));
 const [shown,setShown]=useState(20),row=useRef<HTMLDivElement>(null),last=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{if(!active||shown>=publicPeople.length||!row.current||!last.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setShown(count=>count+20);},{root:expanded?null:row.current,rootMargin:expanded?'400px 0px':'0px 400px'});observer.observe(last.current);return()=>observer.disconnect();},[active,shown,publicPeople.length,expanded]);
 return <section className="discover-people" aria-label="People to discover"><div className="discover-section-heading"><h2>People to discover</h2>{onAll&&<button onClick={onAll}>See all<ArrowRight size={15}/></button>}</div><div ref={row} className={'discover-people-list'+(expanded?' is-expanded':'')}>{publicPeople.slice(0,shown).map((person,i)=><a ref={i===Math.min(shown,publicPeople.length)-1?last:undefined} key={person.username} href={profilePagePath(profileUsernameLabel(person.username,person.receivingUsername))}><PersonAvatar person={person}/><strong>{person.name}</strong><span>@{profileUsernameLabel(person.username,person.receivingUsername)}</span></a>)}</div>{expanded&&shown<publicPeople.length&&<div className="discover-more"><button onClick={()=>setShown(count=>count+20)}>Show more<ArrowRight size={15}/></button></div>}</section>;
}
function Work({item,onOpen,eager,active,measureAudience,spotlightBooking}:{item:PublicMarketItem;onOpen():void;eager:boolean;active:boolean;measureAudience:boolean;spotlightBooking?:string}){
 const kind=feedKind(item),text=kind==='moment'||kind==='essay',knownImage=text||kind==='document'?null:safeReceizArtworkUrl(item.artworkUrl),image=usePublicObjectArtwork(knownImage,item),Icon=icons[kind],ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{if(!active||kind!=='document'&&kind!=='video'||!ref.current)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{const near=entries.some(entry=>entry.isIntersecting);if(kind==='video')setVisible(near);else if(near){setVisible(true);observer.disconnect();}},{rootMargin:'100px'});observer.observe(ref.current);return()=>observer.disconnect();},[kind,active]);
 useEffect(()=>active&&ref.current?observeOriginalImpression(ref.current,publicOriginalEngagement(item),'bankeiz_discover'):undefined,[active,item]);
 useEffect(()=>measureAudience&&ref.current&&publicOriginalEngagement(item)?observeDiscoverVenueAudience(ref.current):undefined,[measureAudience,item]);
 return <button className="discover-work" data-spotlight-original={spotlightBooking?item.originalDigest:undefined} data-spotlight-booking={spotlightBooking} onClick={()=>{trackPublicEngagement(publicOriginalEngagement(item),'original_open','bankeiz_discover');onOpen();}} aria-label={`Open ${item.title}`}><div ref={ref} aria-hidden="true" className={`discover-cover is-${kind}`}>
 {kind==='collectible'&&image?<PublicCollectibleArtwork item={item} eager={eager}/>:kind==='video'?<DiscoveryVideo item={item} active={active&&visible}/>:kind==='document'&&visible?<Suspense fallback={<span className="discover-cover-title">{item.title}</span>}><Document item={item}/></Suspense>:knownImage?<img src={image??undefined} alt="" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'low'} decoding="async" referrerPolicy="no-referrer" crossOrigin={image?.includes('/api/proof-material/packages/')?'anonymous':undefined}/>:<div className="discover-text-work"><span>{kind==='moment'?'This happened':kind==='essay'?'Essay':kind==='book'?'Book':'Original'}</span><p>{feedText(item).slice(0,240)}</p></div>}
 <span className="discover-kind" aria-label={categories.find(([key])=>key===kind)?.[1]??kind}><Icon size={17} strokeWidth={1.6}/></span></div><strong className="discover-work-title">{item.title}</strong><span className="discover-work-owner">{discoveryOwnerName(item)}</span></button>;
}
export function Discover({seed,seedHeads,active=true}:{seed:PublicMarketItem[];seedHeads?:PublicMarketCatalog['publicProfileHeads'];active?:boolean}){
 const [catalog,setCatalog]=useState<PublicMarketCatalog|null>(null);
 const heldPlacements=useSyncExternalStore(subscribeSpotlightPlacements,heldSpotlightPlacements,emptySpotlightPlacements);
 const placements=catalog?.spotlight??heldPlacements;
 const windows=useMemo(()=>placements.map(row=>({id:row.id,digest:row.originalSha256,start:marketUPulseTime(row.startKaiUPulse),end:marketUPulseTime(row.endKaiUPulse)})),[placements]);
 const [placementTime,setPlacementTime]=useState(Date.now);
 useEffect(()=>{
  if(!active||!windows.length)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const tick=()=>{
   const now=Date.now();setPlacementTime(now);
   let next=Infinity;
   for(const {start,end} of windows){if(start>now)next=Math.min(start,next);if(end>now)next=Math.min(end,next);}
   if(Number.isFinite(next))timer=setTimeout(tick,Math.min(next-now,2_147_483_647));
  };
  tick();return()=>clearTimeout(timer);
 },[windows,active]);
 const [items,setItems]=useState(seed),[query,setQuery]=useState(''),[filter,setFilter]=useState<DiscoveryFilter>('All'),[shown,setShown]=useState(20),[selected,setSelected]=useState<{id?:string}|null>(null),[collecting,setCollecting]=useState(false);
 const publicationAt=useRef(-Infinity),selectedCatalog=useRef<PublicMarketCatalog|null>(null);
 const scrollTools=useScrollReveal(active,'.discover-search');
 const appearance=useSyncExternalStore(subscribeAccountAppearance,readAccountAppearance,()=>null),index=useMemo(()=>buildDiscoveryIndex(items,catalog?(catalog.publicProfileHeads??[]):seedHeads,catalog?.publicProfileHeadRefusals),[items,catalog?.publicProfileHeads,catalog?.publicProfileHeadRefusals,seedHeads]),results=useMemo(()=>searchDiscovery(index,query,filter),[index,query,filter]),more=useRef<HTMLDivElement>(null);
 const searched=query.trim().length>0,rows=results.items.slice(0,shown),initial=!searched&&filter==='All',people=results.people;
 const liveBookings=useMemo(()=>{
  if(!windows.length||!initial)return null;
  const bookings=new Map<string,string>();
  for(const {id,digest,start,end} of windows)if(start<=placementTime&&placementTime<end){
   const held=bookings.get(digest);
   bookings.set(digest,held?held+' '+id:id);
  }
  return bookings.size?bookings:null;
 },[windows,placementTime,initial]);
 const spotlight=useMemo(()=>liveBookings?items.filter(item=>item.originalDigest&&liveBookings.has(item.originalDigest)):[],[liveBookings,items]);
 const organicRows=spotlight.length?rows.filter(item=>!spotlight.includes(item)):rows;
 useEffect(()=>{
  if(!active)return;
  const abort=new AbortController();
  const adopt=(next:PublicMarketCatalog|null)=>{
   if(!next?.complete||next===selectedCatalog.current)return;
   selectedCatalog.current=next;
   setCatalog(next);
   setItems(held=>completeFeedItems(held,next.items));
  };
  const sync=()=>{
   const state=preparedBankCatalogState();
   adopt(readHeldFeedCatalog()??(state.value??state.carried)?.seed.catalog??state.bareCatalog??null);
  };
  const unsubscribe=subscribePreparedBankCatalog(sync);
  const held=readHeldFeedCatalog();
  adopt(retainedDiscoveredPublicCatalog());
  sync();
  if(!selectedCatalog.current)adopt(held);
  if(!selectedCatalog.current){
   void prepareFeedItems(abort.signal).then(found=>{
    if(!abort.signal.aborted){
     adopt(readHeldFeedCatalog());
     if(!selectedCatalog.current)setItems(previous=>appendFeedItems(previous,found));
    }
   }).catch(()=>{});
  }
  const observer=setInterval(()=>{
   if(document.visibilityState!=='visible')return;
   if(!publicProfileDirectoryIsLive())void observePublicProfileDirectory().catch(()=>{});
   const selected=selectedCatalog.current,revision=selected?.revision??'';
   void observePublicMarketMembership(revision,selected?.publicProfileHeadsRevision).then(next=>{
    if(!abort.signal.aborted&&next?.complete&&(selectedCatalog.current===selected||samePublicMarketMembership(selectedCatalog.current,selected))&&!samePublicMarketMembership(next,selected))publishDiscoveredPublicCatalog(next,undefined,selected);
   }).catch(()=>{});
  },60_000);
  return()=>{abort.abort();unsubscribe();clearInterval(observer);};
 },[active]);
 useEffect(()=>{
  if(!active||!catalog?.complete)return;
  const stop=subscribePublicProfileDirectory(()=>selectedCatalog.current),changed=(event:Event)=>{
   const username=(event as CustomEvent<{username?:unknown}>).detail?.username,current=selectedCatalog.current;
   if(typeof username==='string'&&(current?.publicProfileHeads?.some(head=>head.profile.username===username||head.profile.receivingUsername===username)||current?.items.some(item=>item.ownerUsername===username)))return;
   void observePublicProfileDirectory().catch(()=>{});
  },received=(event:Event)=>{const username=(event as CustomEvent<{username?:unknown}>).detail?.username;if(typeof username==='string'){const head=receivedPublicProfileHead(username);if(head)void receivePublicProfileForDiscovery(head).catch(()=>{});}};
  window.addEventListener('bankeiz:profile-updated',changed);
  window.addEventListener('bankeiz:profile-metadata',received);
  void receivePublicProfileForDiscovery(receivedPublicProfileHeads()).catch(()=>{});
  return()=>{window.removeEventListener('bankeiz:profile-updated',changed);window.removeEventListener('bankeiz:profile-metadata',received);stop();};
 },[active,!!catalog?.complete]);
 useEffect(()=>subscribeAssetPublicationAdmissions(catalog=>{
  // Undefined notifications are local admission/delivery changes. This surface
  // adopts only a dated public response, never the pending local overlay.
  if(!catalog?.complete||samePublicMarketMembership(catalog,selectedCatalog.current))return;
  const observedAt=Date.parse(catalog.observedAt??''),selected=catalog===readHeldFeedCatalog();
  // The existing shared selector already accepted this public successor.
  // Its descriptive clock cannot restore the older prepared page over it.
  if(!selected&&!/^[a-f0-9]{64}$/.test(catalog.revision)&&(!Number.isFinite(observedAt)||observedAt<Math.max(publicationAt.current,Date.parse(selectedCatalog.current?.observedAt??'')||-Infinity)))return;
  publicationAt.current=observedAt;
  selectedCatalog.current=catalog;setCatalog(catalog);
  setItems(held=>selected||/^[a-f0-9]{64}$/.test(catalog.revision)?completeFeedItems(held,catalog.items):refreshFeedItems(held,catalog.items));
 }),[]);
 useEffect(()=>{setShown(20);},[query,filter]);
 useEffect(()=>{if(!active||shown>=results.items.length||!more.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))setShown(count=>count+20);},{rootMargin:'500px'});observer.observe(more.current);return()=>observer.disconnect();},[active,shown,results.items.length]);
 const select=(next:DiscoveryFilter)=>{setFilter(next);if(next!=='collectible'||items.some(item=>item.category==='sports')||collecting)return;setCollecting(true);void prepareFeedCollectibles().then(found=>setItems(held=>appendFeedItems(held,found))).catch(()=>{}).finally(()=>setCollecting(false));};
 const gallery=(works:PublicMarketItem[],offset=0,bookings?:ReadonlyMap<string,string>|null)=><div className="discover-gallery">{works.map((item,i)=><Work key={item.id} item={item} eager={i+offset<4} active={active} measureAudience={active&&initial&&!selected} spotlightBooking={bookings&&item.originalDigest?bookings.get(item.originalDigest):undefined} onOpen={()=>setSelected({id:item.id})}/>)}</div>;
 return <div className="discovery-page"><div className="discover-shell"><header className="discover-header"><a href="/" aria-label="Bankeiz home"><BankMark/></a><nav className="discover-workspaces" aria-label="Main navigation"><a href="/analytics/">Analytics</a><a href="/explore/">Explore</a><a href="/ledger/">Ledger</a><a href="/learn/">Learn</a></nav><div><button className="discover-icon" aria-label="Open feed" title="Open feed" onClick={()=>setSelected({})}><GalleryVerticalEnd size={21} strokeWidth={1.5}/></button><a href={appearance?'/#account/profile':'/'} className="discover-account" aria-label="Open your account"><ProfileAvatar src={appearance?.avatarUrl} name={appearance?.name??'ID'} fallback="ID" eager/></a></div></header>
 <main><h1>Discover</h1><div className={'discover-search-tools'+(scrollTools.away?' is-away':'')} onFocusCapture={scrollTools.reveal}><div className="discover-search"><Search size={19} strokeWidth={1.6}/><input type="search" aria-label="Search people and their work" placeholder="Search people and their work" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" spellCheck={false}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={16}/></button>}</div>
 <nav className="discover-filters" aria-label="Discover categories">{categories.map(([key,label])=><button key={key} onClick={()=>select(key)} aria-pressed={filter===key}>{label}</button>)}</nav></div>
 {initial?<>{spotlight.length>0&&<section aria-label="Spotlight"><div className="discover-section-heading"><h2>Spotlight</h2></div>{gallery(spotlight,0,liveBookings)}</section>}
  {gallery(organicRows.slice(0,4))}{people.length>0&&<People key={filter+':'+query} active={active} people={people} onAll={()=>select('People')}/>} {gallery(organicRows.slice(4),4)}</>:<>{people.length>0&&<People key={filter+':'+query} active={active} expanded={filter==='People'} people={people}/>} {filter!=='People'&&gallery(rows)}</>}
 {!rows.length&&!people.length&&<div className="discover-empty"><h2>{collecting?'Collectibles':'Room for discovery.'}</h2><p>{searched?'Try a name, a title or a different word.':'Explore another category or discover all works.'}</p><button onClick={()=>{setQuery('');select('All');}}>See all works<ArrowRight size={15}/></button></div>}
 <div ref={more} className="discover-more">{filter!=='People'&&results.items.length>shown&&<button onClick={()=>setShown(count=>count+20)}>Show more<ArrowRight size={15}/></button>}</div>
 <footer className="discover-footer"><a href="/explore/">Explore the market<ArrowRight size={14}/></a></footer></main></div>
 {selected&&<Viewer musicContinuation={prepareFeedItems} items={index.items} initialFilter={filter==='audio'?'audio':undefined} selectedItemId={selected.id} onDiscover={()=>setSelected(null)} active={active} onClose={()=>setSelected(null)}/>}</div>;
}
