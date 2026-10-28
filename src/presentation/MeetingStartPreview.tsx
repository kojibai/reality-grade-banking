/** Build-only walkthrough of actual controls. Fictional held records; no transport. */
import {ConsoleShell} from '../components/ConsoleShell';
import {Sheet} from '../components/Sheet';
import {LiveAccount} from '../features/account/LiveAccount';
import {MessageNavigation} from '../features/messages/MessageNavigation';
import {OrganizerShortcuts} from '../features/messages/organizer/OrganizerShortcuts';
import {CalendarView,EventView} from '../features/messages/organizer/CalendarViews';
import type {OrganizerEvent} from '../receiz/organizer-types';
import type {SharedWallet} from '../receiz/shared-wallet';
const noop=()=>{};
const wallet={userId:'example',totalUsdCents:'112500',reserveUsdCents:'112500',settlementUsdCents:'0',balancePhiMicro:'0',projectionComplete:true} as SharedWallet;
const event={id:'55555555-5555-4555-8555-555555555555',ownerUserId:'example',title:'Live meeting',kind:'appointment',source:'manual',startAt:'2026-10-28T14:00:00Z',endAt:'2026-10-28T15:00:00Z',location:'https://bankeiz.com/meet/55555555-5555-4555-8555-555555555555/77777777-7777-4777-8777-777777777777/',note:'',attendees:[],metadata:{example:true},createdAt:'2026-10-28T14:00:00Z',updatedAt:'2026-10-28T14:00:00Z'} as OrganizerEvent;
export function MeetingStartPreview({screen}:{screen:string}){
 const calendar=screen==='start-calendar',appointment=screen==='start-event';
 return <div className="meeting-bank-source" data-meeting-create={screen}><ConsoleShell active={false} panel="account" identityLabel="EX" onNavigate={noop} onDeposit={noop} onProfile={noop} onMessages={noop}><LiveAccount wallet={wallet} walletHistory={[]} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>{screen!=='start-account'&&<Sheet active={false} title={calendar||appointment?'Calendar':'Messages'} onClose={noop}><section className="bank-messaging"><MessageNavigation twinFirst={false} mode="inbox" organizing={calendar||appointment} organizerView={calendar||appointment?'calendar':undefined} hasOrganizer onWarmOrganizer={noop} onOrganizer={noop} onView={noop} onNew={noop}/>{calendar?<div className="bank-organizer"><div className="organizer-scroll"><div className="organizer-topline"><button type="button" className="organizer-return">Return to conversation</button><OrganizerShortcuts ready busy={false} onMeet={noop} onBooking={noop}/></div><CalendarView layout="agenda" onLayout={noop} events={[]} day="2026-10-28" onDay={noop} onOpen={noop} onAdd={noop} onLinks={noop}/></div></div>:appointment?<div className="bank-organizer"><div className="organizer-scroll"><EventView event={event} onBack={noop} onEdit={noop} onCancel={noop} busy={false}/></div></div>:<div className="bank-inbox"><div className="bank-conversation-empty"><p>Your conversations, together.</p></div></div>}</section></Sheet>}</ConsoleShell></div>;
}
