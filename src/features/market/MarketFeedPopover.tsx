import {lazy,Suspense,useState} from 'react';
import {X} from 'lucide-react';
import {Sheet} from '../../components/Sheet';
import {InlineOpening} from '../../components/InlineOpening';
import {orderFeedItems} from '../../public-feed/feed-items';
import type {PublicMarketItem} from '../../receiz/public-market';
import './market-feed.css';
const Feed=lazy(()=>import('../../public-feed/PublicFeed').then(module=>({default:module.PublicFeed})));
/** Presentation over the held Market. Its existing account still executes actions. */
export function MarketFeedPopover({items,active,paused=false,onClose,onAsset,onBuy,onPay,onMore,hasMore=false,continuationKey,moreBusy=false,selectedItemId,onDiscover,initialFilter,musicContinuation}:{items:readonly PublicMarketItem[];musicContinuation?:()=>Promise<readonly PublicMarketItem[]>;initialFilter?:'audio';selectedItemId?:string;onDiscover?():void;active:boolean;paused?:boolean;onClose():void;onAsset?(item:PublicMarketItem):void;onBuy?(item:PublicMarketItem):void;onPay?(item:PublicMarketItem):void;onMore?():void;hasMore?:boolean;continuationKey?:string;moreBusy?:boolean}){
 const [seed]=useState(()=>{const rows=orderFeedItems(items),selected=rows.find(item=>item.id===selectedItemId);return selected?[selected,...rows.filter(item=>item!==selected)]:rows;}),first=seed[0];
 return <Sheet title="Feed" active={active} className="market-feed-popover" onClose={onClose}><Suspense fallback={<div className="market-feed-opening"><button aria-label="Close feed" onClick={onClose}><X size={21}/></button>{first?.artworkUrl?<img src={first.artworkUrl} alt={first.title}/>:first?<blockquote>{first.summary||first.title}</blockquote>:<InlineOpening compact label="Preparing feed"/>}</div>}><Feed seed={seed} musicContinuation={musicContinuation} initialFilter={initialFilter} selectedItemId={selectedItemId} active={active&&!paused} discover={false} onClose={onClose} onDiscover={onDiscover} onViewAsset={onAsset} onBuy={onBuy} onPay={onPay} discoveries={items} onMore={onMore} hasMore={hasMore} continuationKey={continuationKey} moreBusy={moreBusy}/></Suspense></Sheet>;
}
