import type {OrganizerEvent} from './organizer-types';
/** Naming only: original event coordinates and payload remain unchanged. */
export function calendarEventTitle(event:OrganizerEvent,owner=event.ownerUserId){
 if(event.source!=='system')return event.title;
 const m=event.metadata,kind=m.actionKind;
 if(kind==='market.share.buy'||kind==='market_buy'||kind==='receiz.wallet.market_buy')return 'Asset Purchase';
 if(kind==='market.share.sell'||kind==='market_sell'||kind==='receiz.wallet.market_sell')return 'Asset Sale';
 if(kind==='wallet.transfer.connect'||kind==='receiz.wallet.transfer')return m.senderUserId===owner?'Money Sent':m.recipientUserId===owner?'Money Received':'Money Transfer';
 if(kind==='receiz.wallet.note_mint')return 'Note Created';
 if(kind==='receiz.wallet.note_claim')return 'Note Deposited';
 if(kind==='world.agent.profile.reply')return 'Your agent replied';
 return event.title;
}

/** Keep human notes; generated transport/debug fields remain in the proof. */
export function calendarEventNote(event:OrganizerEvent){return event.source==='system'?event.note.split(/(?:^|\n)(?:Route:|Deterministic key:|Entry hash:|Details:)/,1)[0]!.trim():event.note;}
