/** Editorial product demonstration. No identity, contact, calendar or payment writes. */
import {CalendarDays,Check,ContactRound,Search,Send,Wallet} from 'lucide-react';
import {Sheet} from '../components/Sheet';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {MessageComposer,TypingBubble} from '../features/messages/MessagesPanel';
import {PaymentMessage} from '../features/messages/PaymentMessage';
import {ContactsView,PersonView} from '../features/messages/organizer/ContactViews';
import {CalendarView,EventView} from '../features/messages/organizer/CalendarViews';
import {LedgerInspector} from '../features/ledger/LedgerInspector';
import {moneyExample} from '../content/money-examples.mjs';
import type {ChatMessage} from '../receiz/native-messaging';
import type {OrganizerContact,OrganizerEvent} from '../receiz/organizer-types';
import type {PublicRecord} from '../receiz/public-network';
import '../features/messages/organizer/organizer.css';
import './agent-workflow.css';
const noop=()=>{},owner='00000000-0000-4000-8000-000000000001',at='2026-10-20T12:00:00Z';
export const workflowContacts:OrganizerContact[]=[['Mia Chen','Willow Studio','mia','Online store refresh · asked about checkout and timing.'],['Jordan Brooks','Northline Bikes','jordan','New online catalogue · interested in a first conversation.'],['Sam Rivera','June Home','sam','Booking and online payments · follow up next week.']].map(([fullName,company,handle,notes],index)=>({id:'example-contact-'+handle,linkedUserId:'00000000-0000-4000-8000-00000000000'+(index+2),fullName,company,email:handle+'@example.invalid',phone:'',notes,role:'Owner',tags:['Store project'],createdAt:at,updatedAt:at,interactions:[{id:'example-introduction-'+handle,kind:'conversation',summary:'Your approved introduction',detail:notes,occurredAt:at}]}));
export const workflowEvent:OrganizerEvent={id:'example-mia-meeting',ownerUserId:owner,title:'Mia · Store refresh',kind:'appointment',source:'message',startAt:'2026-10-27T10:00:00Z',endAt:'2026-10-27T10:20:00Z',location:'Project call',note:'Checkout refresh. $300 setup deposit agreed. Bring the store brief from this conversation.',attendees:[workflowContacts[0].email],metadata:{contactId:workflowContacts[0].id,conversationId:'example-workflow',example:true},createdAt:at,updatedAt:at};
const textMessage=(body:string,id:string,sender=owner):ChatMessage=>({id:'example-workflow-'+id,conversationId:'example-workflow',senderUserId:sender,senderKind:'user',senderAiId:null,senderDisplay:sender===owner?'You':'Mia Chen',body,createdAt:at,receizedAt:at,receipt:null,sealedOriginalAvailable:false});
export const workflowPayment:ChatMessage={...textMessage('Store setup deposit','payment',workflowContacts[0].linkedUserId),walletTransfer:{kind:'chat_transfer',senderUserId:workflowContacts[0].linkedUserId,recipientUserId:owner,amountUsdCents:'30000',amountPhiMicro:'15000000',transferId:'example-mia-deposit',note:'Store setup deposit'}};
const paymentRecord:PublicRecord={id:'example-mia-deposit',sourceId:'example-mia-deposit',source:'wallet',kind:'payment',title:'Payment from Mia',detail:'Store setup deposit · Example payment',time:at,actor:'Example account',amountUsdCents:'30000',kaiUpulse:null,pulse:null,sourceUrl:null,sender:'Mia Chen · Example',recipient:'Example account',evidence:{},authority:'account-source-projection',details:{publicNote:'Store setup deposit',sender:'Mia Chen · Example',recipient:'Example account',appointment:workflowEvent.title,contact:workflowContacts[0].fullName}};
export const workflowReplies=[
 'I’m finding a fit for your store-refresh offer, using the clients and project brief we discussed.',
 'Found three owners whose shops fit. Mia needs her checkout refreshed. Jordan is adding a catalogue. Sam wants booking and payments together.',
 'Your approved introduction is sent. All three are in Contacts with their business, what they need and the conversation. Mia wants to move ahead.',
 'Mia agreed to Tuesday’s 20-minute call. It’s in your calendar with her store brief and the $300 deposit terms. The payment request is already with her.',
 'Mia’s $300 is received. Your contact, Tuesday’s call, the agreed work and the payment are together. You can pick up ready.'
];
const steps=[['Ask',Send],['Find',Search],['Contacts',ContactRound],['Calendar',CalendarDays],['Paid',Wallet]] as const;
function Reply({index}:{index:number}){return <div className="agent-workflow-reply" data-workflow-answer={workflowReplies[index]}><TypingBubble name="Your agent" text={workflowReplies[index]}/></div>;}
export function AgentWorkflowExample(){
 const story=moneyExample('agent-workflow'),mia=workflowContacts[0];
 const returnToChat=<button type="button" className="organizer-return" data-workflow-open="chat">Return to conversation</button>;
 return <Sheet title="Your agent" active={false} onClose={noop}><section className="bank-messaging agent-workflow" data-agent-workflow data-example-scenario="agent-workflow" data-workflow-phase="4">
  <nav className="bank-messaging-nav" aria-label="Conversation views"><button className="active" data-workflow-open="chat">Your agent</button><button>Messages</button><span className="bank-organizer-tools"><button type="button" aria-label="Calendar" data-workflow-open="calendar"><CalendarDays size={18}/></button><button type="button" aria-label="Contacts" data-workflow-open="contacts"><ContactRound size={18}/></button></span></nav>
  <div className="agent-workflow-steps" aria-label="Follow the example workflow">{steps.map(([label,Icon],index)=><button key={label} type="button" data-workflow-step={index} aria-pressed={index===4}><Icon size={14}/><span>{label}</span><i><Check size={9}/></i></button>)}</div>
  <div className="agent-workflow-status"><span aria-hidden="true"/><p data-workflow-status>Contact saved. Call booked. Payment received.</p></div>
  <div className="agent-workflow-chat" data-workflow-pane="chat"><div className="bank-conversation-scroll" data-agent-workflow-scroll tabIndex={0} aria-label="Example agent workflow conversation"><div className="bank-thread-messages">
   <div data-workflow-turn="0"><div className="bank-message-own"><PaymentMessage message={textMessage(story.question,'request')} accountUid={owner} members={[]}/></div><Reply index={0}/></div>
   <div data-workflow-turn="1"><Reply index={1}/><div className="agent-workflow-findings"><small>Three people who fit your offer</small>{workflowContacts.map(person=><div key={person.id}><ProfileAvatar name={person.fullName}/><span><strong>{person.fullName}</strong><small>{person.company}</small></span><Check size={13}/></div>)}</div></div>
   <div data-workflow-turn="2"><Reply index={2}/><button type="button" className="agent-workflow-done" data-workflow-open="contacts"><ContactRound size={18}/><span><strong>3 contacts saved</strong><small>The person, their business and your conversation.</small></span><Check size={15}/></button></div>
   <div data-workflow-turn="3"><div className="agent-workflow-client"><ProfileAvatar name={mia.fullName}/><div><small>Mia Chen</small><p>Tuesday works. Let’s go ahead with the store refresh. Send the $300 deposit request.</p></div></div><Reply index={3}/><button type="button" className="agent-workflow-done" data-workflow-open="event"><CalendarDays size={18}/><span><strong>In your calendar</strong><small>Mia · Store refresh · Tuesday · 20 min</small></span><Check size={15}/></button></div>
   <div data-workflow-turn="4"><Reply index={4}/><PaymentMessage message={workflowPayment} accountUid={owner} members={[{kind:'user',userId:mia.linkedUserId,username:null,displayName:mia.fullName,avatarUrl:null}]}/><button type="button" className="agent-workflow-record" data-workflow-open="record">Open the connected payment record <Check size={13}/></button></div>
  </div></div><MessageComposer draft="" setDraft={noop} submit={e=>e.preventDefault()} placeholder="What would you like done?" busy={false} maxLength={16000}/></div>
  <div className="bank-organizer" data-workflow-pane="contacts" hidden><div className="organizer-scroll">{returnToChat}<ContactsView contacts={workflowContacts} search="" onSearch={noop} onOpen={noop} onAdd={noop} onImport={noop}/><p className="agent-workflow-pane-note"><Check size={13}/>Added by your agent, with the context already there.</p></div></div>
  {workflowContacts.map((person,index)=><div key={person.id} className="bank-organizer" data-workflow-pane={index===0?'person':'person-'+index} hidden><div className="organizer-scroll">{returnToChat}<PersonView person={person} events={index===0?[workflowEvent]:[]} onBack={noop} onEdit={noop} onMessage={noop} onSchedule={noop}/></div></div>)}
  <div className="bank-organizer" data-workflow-pane="calendar" hidden><div className="organizer-scroll">{returnToChat}<CalendarView events={[workflowEvent]} day="2026-10-27" layout="agenda" onDay={noop} onLayout={noop} onOpen={noop} onAdd={noop} onLinks={noop}/><p className="agent-workflow-pane-note"><Check size={13}/>The time, the person and the conversation, together.</p></div></div>
  <div className="bank-organizer" data-workflow-pane="event" hidden><div className="organizer-scroll">{returnToChat}<EventView event={workflowEvent} person={mia} onBack={noop} onEdit={noop} onCancel={noop} onMessage={noop} busy={false}/></div></div>
  <div className="bank-organizer" data-workflow-pane="record" hidden><div className="organizer-scroll">{returnToChat}<LedgerInspector record={paymentRecord} value={{amountUsdCents:'30000',basis:'payment',pulse:null,considerationUsdCents:null}} inApp/></div></div>
 </section></Sheet>;
}
