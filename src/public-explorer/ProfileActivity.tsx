import {ArrowUpRight,BookOpen,FileText,Image,Music2,Video} from 'lucide-react';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import {marketContentLabel} from '../receiz/market-categories';
import type {PublicMarketItem} from '../receiz/public-market';
import {useProfileFeed} from './useProfileFeed';

const dayFormat=new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric'});
const timeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});

/** Publication history from the carried public collection. No private account
 * events, balances or additional source reads enter this view. */
export function ProfileActivity({items,hasMore,onMore,busy=false,active=true}:{items:PublicMarketItem[];hasMore:boolean;onMore:()=>void;busy?:boolean;active?:boolean}){
 const feed=useProfileFeed({length:items.length,boundary:items[0]?.id+':'+items.length,hasMore,active,busy,onMore});
 let previousDay='';
 return <section className="profile-activity" aria-label="Public activity">
  <div className="profile-activity-heading"><h2>Published originals</h2><span>Account activity stays private</span></div>
  {items.length?<ol className="profile-activity-list">{items.slice(0,feed.count).map(item=>{
   const date=item.sealedAt?new Date(item.sealedAt):null,validDate=date&&Number.isFinite(date.getTime())?date:null;
   const day=validDate?dayFormat.format(validDate):'Public originals',showDate=day!==previousDay;previousDay=day;
   const Icon=item.mediaKind==='audio'?Music2:item.mediaKind==='epub'?BookOpen:item.mediaKind==='video'?Video:item.mediaKind==='image'?Image:FileText;
   return <li key={item.id} className={showDate?'profile-activity-group-start':undefined}>
    {showDate&&<h3 className="profile-activity-date">{day}</h3>}
    <a className="profile-activity-entry" href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>
     <span className="profile-activity-artwork" aria-hidden="true">{item.artworkUrl?<img src={item.artworkUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" crossOrigin={item.artworkUrl.includes('/api/proof-material/packages/')?'anonymous':undefined}/>:<Icon size={21} strokeWidth={1.5}/>}</span>
     <span className="profile-activity-content"><span className="profile-activity-event">Asset sealed{validDate&&<><span aria-hidden="true">·</span><time dateTime={validDate.toISOString()}>{timeFormat.format(validDate)}</time></>}</span><strong>{item.title}</strong><span className="profile-activity-kind">{marketContentLabel(item)}</span></span>
     <span className="profile-activity-open" aria-hidden="true"><ArrowUpRight size={17}/></span>
    </a>
   </li>;
  })}</ol>:<div className="profile-activity-empty"><FileText size={24} strokeWidth={1.2}/><h3>No public activity yet</h3><p>Published assets will appear here.</p></div>}
  <div ref={feed.tail} aria-hidden="true"/>{feed.remaining&&<button className="secondary-button profile-load-more" disabled={busy} onClick={feed.loadMore}>{busy?'Opening more activity…':'More activity'}</button>}
 </section>;
}
