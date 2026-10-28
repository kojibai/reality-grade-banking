/** Build-only walkthrough of actual controls. Fictional held records; no transport. */
import {ConsoleShell} from '../components/ConsoleShell';
import {Sheet} from '../components/Sheet';
import {LiveAccount} from '../features/account/LiveAccount';
import {MessageNavigation} from '../features/messages/MessageNavigation';
import {OrganizerShortcuts} from '../features/messages/organizer/OrganizerShortcuts';
import {CalendarView,EventView} from '../features/messages/organizer/CalendarViews';
import type {OrganizerEvent} from '../receiz/organizer-types';
import type {WalletPoint} from '../receiz/wallet-series';
import type {MarketPortfolio} from '../receiz/market-portfolio';
import type {PublicMarketItem} from '../receiz/public-market';
import {exampleAssets} from '../content/product-example-assets.mjs';
import type {SharedWallet} from '../receiz/shared-wallet';
const noop=()=>{};
const wallet={userId:'example',totalUsdCents:'112500',reserveUsdCents:'112500',settlementUsdCents:'0',balancePhiMicro:'0',projectionComplete:true} as SharedWallet;
// Illustrative movements and positions only; never financial authority.
const history:WalletPoint[]=['85000','102000','94500','121000','108000','139500','125000','112500'].map((totalUsdCents,i)=>({userId:'example',at:`2026-10-${21+i}T12:00:00Z`,kaiUPulse:null,totalUsdCents,reserveUsdCents:totalUsdCents,settlementUsdCents:'0'}));
const sampleAssets=exampleAssets.filter(asset=>['example-wheat','example-book','example-recording'].includes(asset.id));
const items:PublicMarketItem[]=sampleAssets.map(asset=>({id:asset.id,assetId:asset.id,title:asset.title,summary:asset.summary,category:'proof',sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:'2026-10-20T12:00:00Z',ownerUsername:'example',ownerDisplayName:'Example owner',ownerProfileUrl:null,priceUsd:asset.value,changePct:null,chart:[],artworkUrl:asset.image,authority:'projection-only',canTrade:false}));
const portfolio:MarketPortfolio={schema:'bankeiz.market-portfolio.v1',authority:'market-observation',accountUid:'example',observedAt:'2026-10-28T12:00:00Z',source:'connected',trades:[],positions:items.map((item,i)=>({id:'illustrative-position-'+i,marketItemId:item.id,assetId:item.assetId,title:item.title,summary:item.summary,shareQuantityMicro:['1000000','4000000','2000000'][i],costBasisUsdCents:['30000','16000','45000'][i],lastPriceUsdCents:String(item.priceUsd!*100),openedAt:'2026-10-20T12:00:00Z',lastTradeAt:null}))};
const event={id:'55555555-5555-4555-8555-555555555555',ownerUserId:'example',title:'Live meeting',kind:'appointment',source:'manual',startAt:'2026-10-28T14:00:00Z',endAt:'2026-10-28T15:00:00Z',location:'https://bankeiz.com/meet/55555555-5555-4555-8555-555555555555/77777777-7777-4777-8777-777777777777/',note:'',attendees:[],metadata:{example:true},createdAt:'2026-10-28T14:00:00Z',updatedAt:'2026-10-28T14:00:00Z'} as OrganizerEvent;
export function MeetingStartPreview({screen}:{screen:string}){
 const calendar=screen==='start-calendar',appointment=screen==='start-event',account=screen==='start-account'||screen==='start-holdings';
 return <div className="meeting-bank-source" data-meeting-create={screen}><ConsoleShell active={false} panel="account" identityLabel="EX" onNavigate={noop} onDeposit={noop} onProfile={noop} onMessages={noop}><LiveAccount wallet={wallet} walletHistory={history} portfolio={portfolio} marketItems={items} showcase={items.slice(0,2)} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>{!account&&<Sheet active={false} title={calendar||appointment?'Calendar':'Messages'} onClose={noop}><section className="bank-messaging"><MessageNavigation twinFirst={false} mode="inbox" organizing={calendar||appointment} organizerView={calendar||appointment?'calendar':undefined} hasOrganizer onWarmOrganizer={noop} onOrganizer={noop} onView={noop} onNew={noop}/>{calendar?<div className="bank-organizer"><div className="organizer-scroll"><div className="organizer-topline"><button type="button" className="organizer-return">Return to conversation</button><OrganizerShortcuts ready busy={false} onMeet={noop} onBooking={noop}/></div><CalendarView layout="agenda" onLayout={noop} events={[]} day="2026-10-28" onDay={noop} onOpen={noop} onAdd={noop} onLinks={noop}/></div></div>:appointment?<div className="bank-organizer"><div className="organizer-scroll"><EventView event={event} onBack={noop} onEdit={noop} onCancel={noop} busy={false}/></div></div>:<div className="bank-inbox"><div className="bank-conversation-empty"><p>Your conversations, together.</p></div></div>}</section></Sheet>}</ConsoleShell></div>;
}
