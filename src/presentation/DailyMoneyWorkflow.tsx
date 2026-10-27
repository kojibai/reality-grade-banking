/** Source-rendered financial illustrations. No runtime account or payment writes. */
import {ArrowDownLeft,ArrowUpRight,Check,FileText,Search,Send,ShieldCheck,Wallet} from 'lucide-react';
import {Sheet} from '../components/Sheet';
import {MessageComposer,TypingBubble} from '../features/messages/MessagesPanel';
import {PaymentMessage} from '../features/messages/PaymentMessage';
import {LedgerInspector} from '../features/ledger/LedgerInspector';
import {WalletPaymentReview} from '../features/account/WalletSendOperation';
import {formatMoney} from '../core/money';
import {dailyMoneyStories} from '../content/daily-money-stories.mjs';
import type {ChatMessage,ChatPerson} from '../receiz/native-messaging';
import type {WalletSendReview} from '../receiz/wallet-send';
import type {PublicRecord} from '../receiz/public-network';
import './daily-money-workflow.css';
const noop=()=>{},owner='00000000-0000-4000-8000-000000000001',at='2026-10-20T12:00:00Z';
const icons=[Send,Search,FileText,ShieldCheck,Wallet];
export function dailyMoneyProjection(key:string){
 const story=dailyMoneyStories[key];if(!story)throw Error('DAILY_MONEY_STORY_REQUIRED');
 const names=[...new Set(story.movements.map(m=>m.person))];
 const members:ChatPerson[]=names.map((displayName,index)=>({kind:'user',userId:'00000000-0000-4000-8000-'+String(index+2).padStart(12,'0'),username:null,displayName,avatarUrl:null}));
 const payments=story.movements.map((movement,index)=>{
  const peer=members.find(person=>person.displayName===movement.person)!;if(!peer.userId)throw Error('DAILY_MONEY_PARTICIPANT_REQUIRED');const sent=movement.direction==='sent',sender=sent?owner:peer.userId,recipient=sent?peer.userId:owner;
  const id=`example-daily-${key}-${index}`,amountPhiMicro=(BigInt(movement.amountUsdCents)*500n).toString();
  const message:ChatMessage={id,conversationId:'example-daily-'+key,senderUserId:sender,senderKind:'user',senderAiId:null,senderDisplay:sent?'You':movement.person,body:movement.memo,createdAt:at,receizedAt:at,receipt:null,sealedOriginalAvailable:false,walletTransfer:{kind:'chat_transfer',senderUserId:sender,recipientUserId:recipient,amountUsdCents:movement.amountUsdCents,amountPhiMicro,transferId:id,note:movement.memo}};
  const record:PublicRecord={id,sourceId:id,source:'wallet',kind:'payment',title:(sent?'Payment to ':'Payment from ')+movement.person,detail:movement.memo+' · Example payment',time:at,actor:'Example account',amountUsdCents:movement.amountUsdCents,kaiUpulse:null,pulse:null,sourceUrl:null,sender:sent?'Example account':movement.person+' · Example',recipient:sent?movement.person+' · Example':'Example account',evidence:{},authority:'account-source-projection',details:{publicNote:movement.memo,sender:sent?'Example account':movement.person,recipient:sent?movement.person:'Example account',context:story.outcomeLabel}};
  const review:WalletSendReview={schema:'bank.wallet-send-review.v1',ownerReceizId:'example.receiz.id',accountUid:owner,recipientUserId:recipient,recipientLabel:movement.person+' · Example',amountUsdCents:movement.amountUsdCents,clientNonce:id,digest:'example-not-an-approval',note:movement.memo,quote:{amountUsdCents:movement.amountUsdCents,amountPhiMicro,usdPerPhiMicrocents:'2000000000',settledUsdCents:movement.amountUsdCents,ecosystemUsdCents:'0',fundingRule:'settled_first_then_phi'}};
  return {movement,peer,message,record,review,pane:'record-'+index};
 });return{story,members,payments};
}
function userMessage(body:string){return <div className="bank-message-own"><p>{body}</p></div>;}
function Reply({text,original=false}:{text:string;original?:boolean}){return <div className="agent-workflow-reply" data-workflow-answer={text} {...(original?{'data-example-response':'','data-example-answer':text}:{})}><TypingBubble name="Your agent" text={text}/></div>;}
export function DailyMoneyWorkflow({example}:{example:string}){
 const {story,members,payments}=dailyMoneyProjection(example);
 const responses=[
  'I’m checking the payments, the agreed work and the commitments you already told me about.',story.analysis,story.prepared,
  story.kind==='collect'?'Your approved follow-up is sent with the agreed work and credited payments. The reply stays with that same relationship.':story.kind==='insight'?'The comparison and supporting records are together. Your decision keeps its assumptions and the reason behind it.':'The exact recipients, amounts and purpose are approved in your instruction. Each supported payment keeps its own review and record.',story.finalReply
 ];
 const back=<button type="button" className="organizer-return" data-workflow-open="chat">Return to conversation</button>;
 return <Sheet title="Your agent" active={false} onClose={noop}><section className="bank-messaging agent-workflow daily-money-workflow" data-agent-workflow data-daily-money={example} data-example-scenario={example} data-workflow-phase="4">
  <nav className="bank-messaging-nav" aria-label="Conversation views"><button className="active" data-workflow-open="chat">Your agent</button><button>Messages</button></nav>
  <div className="agent-workflow-steps" aria-label="Follow the money workflow">{story.steps.map((label,index)=>{const Icon=icons[index];return <button key={label} type="button" data-workflow-step={index} data-workflow-pane-target="chat" data-workflow-status-text={story.statuses[index]} aria-pressed={index===4}><Icon size={14}/><span>{label}</span><i><Check size={9}/></i></button>;})}</div>
  <div className="agent-workflow-status"><span aria-hidden="true"/><p data-workflow-status>{story.outcomeLabel}</p></div>
  <div className="agent-workflow-chat" data-workflow-pane="chat"><div className="bank-conversation-scroll" data-agent-workflow-scroll tabIndex={0} aria-label="Example daily money conversation"><div className="bank-thread-messages">
   <div data-workflow-turn="0">{userMessage(story.question)}<Reply text={responses[0]}/></div>
   <div data-workflow-turn="1"><Reply text={responses[1]} original/><div className="daily-money-facts"><small>The context behind the answer</small><dl>{story.facts.map(({label,value})=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></div>
   <div data-workflow-turn="2">{userMessage(story.followup)}<Reply text={responses[2]} original/><button type="button" className="agent-workflow-done" data-workflow-open="source"><FileText size={18}/><span><strong>{story.kind==='insight'?'Open the comparison':'Review the plan'}</strong><small>The amounts and original context, together.</small></span><Check size={15}/></button></div>
   <div data-workflow-turn="3">{userMessage(story.authorization)}<Reply text={responses[3]}/>{story.movements.some(m=>m.direction==='received')&&<div className="daily-money-peer"><small>{story.movements.find(m=>m.direction==='received')!.person}</small><p>{example==='coaches'?'Yes, I’d like the extension. I’ve paid the $300.':'Paid. Thank you for keeping the details together.'}</p></div>}</div>
   <div data-workflow-turn="4"><Reply text={responses[4]}/><section className="daily-money-outcome" data-money-outcome aria-label={story.outcomeLabel}>
    {payments.map(({movement,message,pane})=><details key={pane} className="daily-money-receipt"><summary><span>{movement.direction==='received'?<ArrowDownLeft size={12}/>:<ArrowUpRight size={12}/>}<span>{movement.person}</span><small>{movement.direction==='sent'?'Paid':'Received'}</small></span><strong>{formatMoney(movement.amountUsdCents)}</strong></summary><PaymentMessage message={message} accountUid={owner} members={members}/><button type="button" data-workflow-open={pane} className="agent-workflow-record">Open this payment record</button></details>)}
    <small>{story.outcomeCaption}</small><strong>{story.outcomeValue}</strong>{payments.length>0&&<p>Account after <b>{formatMoney(story.remainingBalanceCents)}</b></p>}
    {payments.length===0&&<button type="button" className="agent-workflow-record" data-workflow-open="source">Open the connected comparison <FileText size={12}/></button>}
   </section></div>
  </div></div><MessageComposer draft="" setDraft={noop} submit={event=>event.preventDefault()} placeholder="Ask about your money…" busy={false} maxLength={16000}/></div>
  <div className="bank-organizer" data-workflow-pane="source" hidden><div className="organizer-scroll">{back}<h3 className="organizer-lead">{story.kind==='insight'?'Your comparison':'The payment plan'}</h3><p className="organizer-sub">{story.analysis}</p><div className="detail-list">{story.facts.map(({label,value})=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="organizer-sub">{story.authorization}</p>{payments.filter(p=>p.movement.direction==='sent').map(({review},index)=><div className="daily-money-native-review" key={index}><WalletPaymentReview review={review} approved={false} busy={false} onApprove={noop} onSend={noop} onEdit={noop}/></div>)}</div></div>
  {payments.map(({record,pane,movement})=><div className="bank-organizer" key={pane} data-workflow-pane={pane} hidden><div className="organizer-scroll">{back}<LedgerInspector record={record} value={{amountUsdCents:movement.amountUsdCents,basis:'payment',pulse:null,considerationUsdCents:null}} inApp/></div></div>)}
 </section></Sheet>;
}
