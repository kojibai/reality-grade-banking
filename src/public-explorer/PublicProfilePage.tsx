import {publicProfileUsername} from '../receiz/account-name';
import {InlineOpening} from '../components/InlineOpening';
import {CopyFeedbackIcon,useCopyFeedback} from '../components/CopyFeedback';
import {PublicImageDialog} from '../features/media/ProofMedia';
import {lazy,Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {receizKaiNow} from '@receiz/sdk';
import {ArrowDownRight,ArrowUpRight,BarChart3,CalendarDays,ChevronLeft,ChevronRight,Pencil,Share2} from 'lucide-react';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {Sheet} from '../components/Sheet';
import {AssetCreationSheet} from '../features/assets/AssetCreationSheet';
import {ProfileIdentity} from './ProfileIdentity';
import {ProfileBooking} from './ProfileBooking';
import {ProfileCollection} from './ProfileCollection';
import {ProfileActivity} from './ProfileActivity';
import {ProfileGrowthPeek} from './ProfileGrowthPeek';
import {useProfileGrowth} from '../receiz/market-projection/useProfileGrowth';
import {CHART_PERIODS,type ChartPeriod} from '../core/chart-history';
import {PublicAssetTradeHost} from './PublicAssetTradeHost';
import {profileCollectionPrices,profileCollectionSummary,profileCollectionCapitalization} from './profile-prices';
import {fetchPublicProfile,profilePagePath,publicProfilePageError,selectHeldPublicProfile,heldPublicProfileUsername,publicProfileHasHeader,publicProfilesRevision,subscribePublicProfiles,retainedPublicProfile,retainPublicProfile,type PublicProfile} from '../receiz/public-profile';
import {buildCheckoutRequest} from '../receiz/checkout-request';
import {beginProfileAccountAction,beginProfileEdit,beginProfileAssetCreation,closeProfileEdit,attachProfileEdit,readProfileEdit,readProfileOwner,readProfileOwnerHeader,subscribeProfileActions,signProfileWithPbi} from '../receiz/profile-actions';
import type {usePublicMarket} from '../receiz/usePublicMarket';
import {useMarketDisplaySource} from '../receiz/market-projection/display-source';
import {CollectiblesIcon} from '../features/collectibles/CollectiblesIcon';
import type {HeldCollection} from '../receiz/collectibles';
import './profile.css';

const profileTabs=new Map<string,'assets'|'activity'>();

const ProfileInsights=lazy(()=>import('./ProfileInsights').then(module=>({default:module.ProfileInsights})));
const ProfileCollectibles=lazy(()=>import('../features/collectibles/CollectionPanel').then(module=>({default:module.CollectionPanel})));
const emptyItems:PublicProfile['items']=[];
const growthPeriodLabels:Record<ChartPeriod,string>={ALL:'All time','1D':'1 day','1W':'1 week','1M':'1 month','3M':'3 months','1Y':'1 year'};
const originalsValueFormat=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
function EditHost({active}:{active:boolean}){
 const edit=useSyncExternalStore(subscribeProfileActions,readProfileEdit,()=>null),slot=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(edit)attachProfileEdit(edit.id,slot.current,active);return()=>{if(edit)attachProfileEdit(edit.id,null);};},[edit?.id,active]);
 if(!edit)return null;
 return edit.kind==='create-asset'?<AssetCreationSheet active={active} onClose={()=>closeProfileEdit(edit.id)}><div ref={slot}/></AssetCreationSheet>:<Sheet title="Edit profile" onClose={()=>closeProfileEdit(edit.id)}><div ref={slot}/></Sheet>;
}
export function PublicProfilePage({username,source,active,initialProfile,collection}:{username:string;source:ReturnType<typeof usePublicMarket>;active:boolean;initialProfile?:PublicProfile;collection?:HeldCollection}){
 username=heldPublicProfileUsername(username,source.historyCatalog??source.catalog);
 const [booking,setBooking]=useState<'unopened'|'open'|'closed'>('unopened');
 const [collectionOpen,setCollectionOpen]=useState(false);
 const profileRevision=useSyncExternalStore(subscribePublicProfiles,publicProfilesRevision,publicProfilesRevision);
 const heldProfile=useMemo(()=>initialProfile??selectHeldPublicProfile(username,source.historyCatalog??source.catalog),[initialProfile,username,source.historyCatalog??source.catalog,profileRevision]);
 const owner=useSyncExternalStore(subscribeProfileActions,readProfileOwner,()=>null),ownerHeader=useSyncExternalStore(subscribeProfileActions,readProfileOwnerHeader,()=>null);
 // The owner's admitted compact header stays in this mounted owner scope.
 // It is never retained into the anonymous profile or public Market caches.
 const profile=useMemo(()=>heldProfile&&!publicProfileHasHeader(heldProfile)&&owner===heldProfile.userId&&ownerHeader?.userId===owner&&ownerHeader.username===heldProfile.username?{...heldProfile,...ownerHeader,stats:heldProfile.stats,items:heldProfile.items,nextCursor:heldProfile.nextCursor,...(heldProfile.authorshipVerified?{authorshipVerified:true,pbiReceiptHash:heldProfile.pbiReceiptHash}:{})}:heldProfile,[heldProfile,owner,ownerHeader]);
 useLayoutEffect(()=>{if(heldProfile&&!initialProfile&&retainedPublicProfile(username)!==heldProfile)retainPublicProfile(heldProfile);},[username,heldProfile,initialProfile]);
 const [error,setError]=useState(()=>profile?'':publicProfilePageError(username,source.historyCatalog??source.catalog)),[retry,setRetry]=useState(0),[tab,setTab]=useState<'assets'|'activity'>('assets'),[insights,setInsights]=useState<'unopened'|'open'|'closed'>('unopened'),[growthOpen,setGrowthOpen]=useState(false),[image,setImage]=useState<{url:string;title:string}|null>(null),[more,setMore]=useState(false);
 const {copied,confirm,clear}=useCopyFeedback(username);
 useLayoutEffect(()=>{setTab(profile?profileTabs.get(profile.userId)??'assets':'assets');setBooking('unopened');setCollectionOpen(false);setGrowthOpen(false);setInsights('unopened');},[profile?.userId]);
 const selectTab=(next:'assets'|'activity')=>{if(profile){profileTabs.set(profile.userId,next);if(profileTabs.size>24)profileTabs.delete(profileTabs.keys().next().value!);}setTab(next);};
 const pricingSource=useMarketDisplaySource(),isOwner=!!profile&&owner===profile.userId;
 const [growthPeriod,setGrowthPeriod]=useState<ChartPeriod>('ALL');
 const cycleGrowth=(direction:number)=>setGrowthPeriod(period=>CHART_PERIODS[(CHART_PERIODS.indexOf(period)+direction+CHART_PERIODS.length)%CHART_PERIODS.length]);
 const profileInputPending=!profile&&source.displayLocalPending===true;
 useEffect(()=>{
  if(!active||initialProfile||profileInputPending||profile||publicProfilePageError(username,source.historyCatalog??source.catalog)&&!retry)return;
  let alive=true;
  const request=fetchPublicProfile(username);
  void request.then(()=>{if(alive)setError('');},cause=>{if(alive&&(!profile||['PROFILE_PRIVATE','PROFILE_NOT_FOUND','PROFILE_CHANGED'].includes(cause.message)))setError(cause.message);});
  return()=>{alive=false;};
 },[username,active,profile,initialProfile,retry,profileInputPending]);
 // The public source already selects profile visibility. Keep that complete
 // collection for display without changing any object's signing metadata.
 const originals=profile?.items??emptyItems;
 // A public presentation may reuse an already-held owner-bound collection;
 // it never opens private account state or infers membership from a handle.
 const publicCollection=useMemo(()=>collection&&profile&&collection.accountUserId===profile.userId&&collection.status!=='unavailable'?{...collection,cards:collection.cards.filter(card=>card.publiclyVisible&&card.ownerUserId===profile!.userId)}:null,[collection,profile?.userId]);
 const items=useMemo(()=>originals.length?profileCollectionPrices(originals,source.catalog,pricingSource,source.pulse??receizKaiNow().pulse):emptyItems,[originals,source.catalog,source.pulse,pricingSource]);
 const collectionSummary=useMemo(()=>profile&&!profile.nextCursor?profileCollectionSummary(items,pricingSource,growthPeriod):null,[profile,items,pricingSource,growthPeriod]),totalReturn=collectionSummary?.returnPct??null;
 const completeProfile=!!profile&&!profile.nextCursor,currentCapitalizationUsdCents=useMemo(()=>growthOpen&&completeProfile?profileCollectionCapitalization(items):null,[growthOpen,completeProfile,items]);
 const growth=useProfileGrowth(originals,pricingSource,source.pulse??receizKaiNow().pulse,active&&!!profile&&!profile.nextCursor,growthOpen,source.historyCatalog??source.catalog);
 async function loadMore(){if(!profile?.nextCursor||more)return;const previous=profile;setMore(true);setError('');try{const next=await fetchPublicProfile(username,previous.nextCursor!);if(next.userId!==previous.userId)throw Error('PROFILE_CHANGED');retainPublicProfile(next);}catch(cause){const message=cause instanceof Error?cause.message:'PROFILE_UNAVAILABLE';setError(message);}finally{setMore(false);}}
 const url=(typeof location==='undefined'?'https://bankeiz.com':location.origin)+profilePagePath(publicProfileUsername(profile?.username??username,profile?.receivingUsername)),copy=()=>{void navigator.clipboard.writeText(url).then(()=>confirm()).catch(()=>{clear();setError('The link could not be copied.');});};
 const share=async()=>{if(!profile)return;try{if(navigator.share)await navigator.share({title:profile.displayName,url});else copy();}catch(cause){if(!(cause instanceof Error&&cause.name==='AbortError'))copy();}};
 const profileError=publicProfilePageError(username,source.historyCatalog??source.catalog)||error;
 if(!profile)return <section className="public-profile-page profile-unavailable"><h1>{profileError==='PROFILE_PRIVATE'?'Private profile':profileError==='PROFILE_NOT_FOUND'?'Profile not found':'Profile'}</h1><p>{profileError?'This public profile is not available.':<InlineOpening label="Preparing the public profile"/>}</p>{profileError&&<button className="text-button" onClick={()=>{setError('');setRetry(value=>value+1);}}>Try again</button>}<a className="source-link" href="/explore/">Explore public assets<ArrowUpRight size={15}/></a></section>;
 return <article className="public-profile-page"><div className={'profile-banner'+(!profile.bannerUrl?' is-empty':'')}>{profile.bannerUrl&&<button type="button" aria-label="Open profile banner" onClick={()=>setImage({url:profile.bannerUrl!,title:profile.displayName+' · Banner'})}><img src={profile.bannerUrl} alt="" fetchPriority="high" decoding="sync" referrerPolicy="no-referrer"/></button>}</div><header className="profile-hero">{!!publicCollection?.cards.length&&<button className="profile-collection-icon" aria-label={`View ${profile.displayName}’s collection`} aria-haspopup="dialog" title="View collection" onClick={()=>setCollectionOpen(true)}><CollectiblesIcon size={20}/></button>}{profile.bookingEnabled&&<button className="profile-booking-icon" aria-label={`Book a time with ${profile.displayName}`} aria-haspopup="dialog" title="Book a time" onClick={()=>setBooking('open')}><CalendarDays size={19} strokeWidth={1.5}/></button>}<button type="button" className="profile-portrait-button" aria-label="Open profile portrait" disabled={!profile.avatarUrl} onClick={()=>setImage({url:profile.avatarUrl!,title:profile.displayName})}><ProfileAvatar src={profile.avatarUrl} name={profile.displayName} eager className="profile-portrait"/></button><h1>{profile.displayName}</h1><ProfileIdentity profile={profile} onSign={isOwner&&publicProfileHasHeader(profile)?()=>signProfileWithPbi(profile):undefined}/><div className="profile-owner-tools">{isOwner&&<button onClick={()=>beginProfileEdit(profile)}><Pencil size={13}/>Edit profile</button>}<button aria-label="View profile insights" aria-haspopup="dialog" title="Profile insights" onClick={()=>setInsights('open')}><BarChart3 size={17} strokeWidth={1.5}/></button></div><div className="profile-actions"><a className="primary-button" href={buildCheckoutRequest(profile.username)}>Pay</a><button className="secondary-button" onClick={()=>beginProfileAccountAction('messages',profile)}>Message</button><button className="profile-share" aria-label="Share profile" onClick={()=>void share()}><Share2 size={18}/></button><button className="profile-share" aria-label={copied?'Profile link copied':'Copy profile link'} onClick={copy}><CopyFeedbackIcon copied={copied} size={17}/></button></div></header>
 <nav className="profile-tabs" aria-label="Profile sections"><button aria-selected={tab==='assets'} onClick={()=>selectTab('assets')}>Assets</button><button aria-selected={tab==='activity'} onClick={()=>selectTab('activity')}>Public Activity</button>{totalReturn!==null&&<div className="profile-growth-control"><button className={'profile-showcase-return '+(totalReturn<0?'negative':'positive')} title="View showcase growth history" aria-haspopup="dialog" aria-label={'View showcase growth history, '+totalReturn.toFixed(2)+' percent, '+growthPeriodLabels[growthPeriod]} onClick={()=>setGrowthOpen(true)}>{totalReturn<0?<ArrowDownRight size={13}/>:<ArrowUpRight size={13}/>}<strong>{totalReturn>0?'+':''}{totalReturn.toLocaleString(undefined,{maximumFractionDigits:2})}%</strong></button><div className="profile-growth-duration"><button onClick={()=>cycleGrowth(-1)} aria-label="Previous growth period"><ChevronLeft size={11}/></button><select value={growthPeriod} aria-label="Showcase growth period" onChange={event=>setGrowthPeriod(event.target.value as ChartPeriod)}>{CHART_PERIODS.map(period=><option key={period} value={period}>{growthPeriodLabels[period]}</option>)}</select><button onClick={()=>cycleGrowth(1)} aria-label="Next growth period"><ChevronRight size={11}/></button></div></div>}</nav>
 {collectionOpen&&publicCollection&&<Suspense fallback={<Sheet active={active} title="Collection" navigation="back" onClose={()=>setCollectionOpen(false)}><p className="body-copy small-copy"><InlineOpening label="Preparing the collection"/></p></Sheet>}><ProfileCollectibles collection={publicCollection} ownerName={profile.displayName} active={active} onClose={()=>setCollectionOpen(false)}/></Suspense>}
 {booking!=='unopened'&&profile.bookingEnabled&&<ProfileBooking key={profile.userId+':'+profile.username} userId={profile.userId} username={profile.username} owner={profile} active={active&&booking==='open'} onClose={()=>setBooking('closed')}/>}
 {growthOpen&&<ProfileGrowthPeek name={profile.displayName} total={totalReturn} currentValue={collectionSummary?.valueUsd} currentCapitalizationUsdCents={currentCapitalizationUsdCents} history={growth.history} calculationRows={growth.rows} originals={originals} unavailable={growth.unavailable} initialPeriod={growthPeriod} active={active} onClose={()=>setGrowthOpen(false)}/>}
 <div hidden={tab!=='assets'}>{collectionSummary?.valueUsd!==null&&collectionSummary?.valueUsd!==undefined&&<button className="profile-originals-value" aria-label="View originals value history" aria-haspopup="dialog" onClick={()=>setGrowthOpen(true)}><span><small>Originals value</small><strong>{originalsValueFormat.format(collectionSummary.valueUsd)}</strong></span><span>{items.length.toLocaleString()} displayed {items.length===1?'original':'originals'}</span></button>}<ProfileCollection key={profile.userId} profile={profile} items={items} active={active&&tab==='assets'} onMore={()=>void loadMore()} onCreate={isOwner?()=>beginProfileAssetCreation(profile):undefined} busy={more}/></div>
 <div hidden={tab!=='activity'}><ProfileActivity items={originals} hasMore={!!profile.nextCursor} onMore={()=>void loadMore()} busy={more} active={active&&tab==='activity'}/></div>
 {error&&<p className="profile-empty" role="status">{error==='PROFILE_CHANGED'?'This profile has changed. Reopen it to view its current collection.':'More assets could not be opened. Your current view remains available.'}</p>}
 {image&&active&&<PublicImageDialog title={image.title} url={image.url} onClose={()=>setImage(null)}/>}<EditHost active={active}/>{active&&<PublicAssetTradeHost/>}{insights!=='unopened'&&<Suspense fallback={<Sheet title="Profile insights" active={active&&insights==='open'} onClose={()=>setInsights('closed')}><InlineOpening label="Opening profile insights"/></Sheet>}><ProfileInsights key={profile.userId+':'+isOwner} profile={profile} isOwner={isOwner} active={active&&insights==='open'} onClose={()=>setInsights('closed')}/></Suspense>}
 </article>;
}
