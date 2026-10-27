import {InlineOpening} from '../../components/InlineOpening';
import {TwinWorkspaceOpening} from './TwinWorkspaceOpening';
import type {HeldMindConversation,HeldMindLedger} from '../../receiz/twin-mind-display';
import type {MoneyReceipt} from '../../receiz/money-workspace';
import type {MoneyQuestion} from '../../receiz/money-conversation';
import {isOwnerTwinThreadKey,type TwinConversation} from '../../receiz/twin-conversations';
import {TwinConversations} from './TwinConversations';
import {businessActivityLabel} from './business-activity';
import {automaticTwinOwnerContext} from '../../receiz/twin-owner-context';
import {BUSINESS_OPENING_MESSAGE,BUSINESS_FIRST_TASK,type BusinessStart} from './useBusinessEntry';
import {conversationPeople,peopleSearchQuery,peopleSuggestions} from '../../receiz/people-search';
import {AccountProfileLink} from '../../components/AccountProfileLink';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import {identityProfileAvatar} from '../../receiz/profile-avatar';
import {chatReplyPerson,ReplyIdentity} from './ReplyIdentity';
import type {PeerTypingController} from '../../receiz/peer-typing';
import {PaymentMessage} from './PaymentMessage';
import {NotificationsControl} from './NotificationsControl';
import type {NotificationTarget} from '../../pwa/notification-target';
import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {ArrowUp,ArrowUpRight,Brain,CalendarDays,Check,ChevronLeft,ContactRound,DollarSign,Paperclip,Phone,Search,SquarePen,Users,Video} from 'lucide-react';
import {BankMark} from '../../components/BankMark';
import {Sheet} from '../../components/Sheet';
import {CallPortal} from './CallPortal';
import type {OpenIdentity} from '../../receiz/native-identity';
import {MessagingError,type ChatConversation,type ChatMessage,type ChatPage,type ChatPerson,type NativeMessaging} from '../../receiz/native-messaging';
import type {NativeTwinAsk,NativeTwinMemory,NativeTwinReply} from '../../receiz/native-twin';
import type {OrganizerEntry} from './organizer/OrganizerPanel';
let organizerModule:Promise<{default:typeof import('./organizer/OrganizerPanel').OrganizerPanel}>|undefined,organizerCodeReady=false;
let OrganizerPanel:typeof import('./organizer/OrganizerPanel').OrganizerPanel|undefined;
export const preloadMessageOrganizer=()=>organizerModule??=import('./organizer/OrganizerPanel').then(module=>{OrganizerPanel=module.OrganizerPanel;organizerCodeReady=true;return{default:module.OrganizerPanel};}).catch(cause=>{organizerModule=undefined;throw cause;});
const TwinUpgradePanel=lazy(()=>import('./TwinUpgradePanel').then(module=>({default:module.TwinUpgradePanel})));
let twinWorkspaceCode:Promise<{default:typeof import('./TwinWorkspacePanel').TwinWorkspacePanel}>|undefined;
const loadTwinWorkspaceCode=()=>twinWorkspaceCode??=import('./TwinWorkspacePanel').then(module=>({default:module.TwinWorkspacePanel}));
const TwinWorkspacePanel=lazy(loadTwinWorkspaceCode);
const TwinCreditsPanel=lazy(()=>import('./TwinCreditsPanel').then(module=>({default:module.TwinCreditsPanel})));
const MoneyReceipts=lazy(()=>import('./MoneyReceipts').then(module=>({default:module.MoneyReceipts})));
let BusinessReceipts:typeof import('./BusinessReceipts').BusinessReceipts|undefined,receiptCode:Promise<void>|undefined;
const prepareBusinessReceiptCode=()=>receiptCode??=import('./BusinessReceipts').then(module=>{BusinessReceipts=module.BusinessReceipts;}).catch(cause=>{receiptCode=undefined;throw cause;});
import type {BusinessChatReceipt} from '../../receiz/business-chat';
const CallPanel=lazy(()=>import('./CallPanel').then(module=>({default:module.CallPanel})));
import './messages.css';

export interface MessagesPanelProps {
  identity:OpenIdentity;active:boolean;onClose():void;onOpen?():void;onPreparePayment?:(recipient?:{userId:string;username:string})=>void;
  heldLedger?:HeldMindLedger;
  twinContextRecords?:ReadonlyArray<{id:string;title:string;text:string}>;
  initialRecipient?:{id:number;person:{userId:string;username:string;displayName:string;avatarUrl:string|null}}|null;
  initialNotification?:NotificationTarget|null;
  initialBusinessRequest?:{id:string;start?:BusinessStart}|null;
  onBusinessConsumed?:(id:string)=>void;
}
type Mode='twin'|'inbox'|'thread'|'new'|'call';
type TwinExchange={id:string;question:string;reply:NativeTwinReply;memoryIds:string[]};
type TwinHeldThread={title:string;draft:string;exchanges:TwinExchange[];pending:MoneyQuestion|null;moneyReceipts:Record<string,MoneyReceipt[]>;moneyQuestions:Record<string,string>;businessReceipts:Record<string,BusinessChatReceipt[]>;businessContext:BusinessChatReceipt[];history:NativeTwinMemory[];cursor:string|null;hasMore:boolean;accessQuestions:Array<{id:string;question:string}>;files:File[];start:BusinessStart|null;hydrated:boolean};
type PendingChatMessage={id:string;body:string;createdAt:string;status:'sending'|'unknown'|'refused'};
type ActiveCall={id:string;mode:'voice'|'video'};
type HeldCall={conversationId:string;title:string;video:boolean;callId?:string};
function TwinAccessReply({onUpgrade,business=false}:{onUpgrade():void;business?:boolean}){
  return <div className="bank-twin-reply bank-twin-access-reply"><span>{business?'Your agent · Business':'More help with your money'}</span><p>Less time managing money. More time running your business.</p><ul>
    <li><strong>Know where your money stands.</strong> Ask about the payment records, costs and commitments you share. See what came in, what went out and what needs attention.</li>
    <li><strong>Make getting paid less work.</strong> Prepare a clear payment request, client response or follow-up with the work and available payment history in view.</li>
    <li><strong>Get the money admin off your evening.</strong> Turn the records you bring into a useful summary, working document or handover you can review.</li>
    <li><strong>Work through the next money move.</strong> Compare an upcoming cost or prepare a supported payment to people or employees. Review the recipient, amount and action before approving it.</li>
    <li><strong>Keep clients moving while you work.</strong> Set up answers to payment questions, your domain and team routes. Keep the supported context connected across compatible apps.</li>
  </ul><p>Ask here with the background you choose. Set up your agent, client payment answers, domain and team routes in the same account. Keep your ID, messages and history. Core banking remains available; Business is an optional addition for the extra money work.</p><p><strong>Business — $149/month.</strong> Renews monthly until cancelled. Review the plan before paying. Your core proof objects, ownership and supported value stay free.</p><button type="button" onClick={onUpgrade}>{business?'Get Business — $149/month':'Explore Business'}<ArrowUpRight size={16}/></button></div>;
}
function ConversationAvatar({row,owner}:{row:ChatConversation;owner:string}){
 const peers=row.members.filter(person=>person.kind==='user'&&person.userId!==owner).slice(0,2);
 return <span className={'bank-conversation-avatar'+(row.kind==='group'&&peers.length>1?' group':'')} aria-hidden="true">{peers.length?peers.slice(0,row.kind==='group'?2:1).map(person=><ProfileAvatar key={person.userId} src={person.avatarUrl} name={personName(person)}/>):<ProfileAvatar name={row.title}/>}</span>;
}
function ChatProfiles({thread,owner,active,onContact}:{thread:ChatConversation;owner:string;active:boolean;onContact?:(person:ChatPerson)=>void}){
 const [open,setOpen]=useState(false),region=useRef<HTMLDivElement>(null),people=thread.members.filter(person=>person.kind==='user'),peer=thread.kind==='dm'?people.find(person=>person.userId!==owner):null;
 useEffect(()=>{if(!active)setOpen(false);},[active]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!region.current?.contains(event.target as Node))setOpen(false);},key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);};},[open]);
 return peer&&onContact?<button type="button" className="bank-chat-profile" aria-label={'Open '+personName(peer)+' contact'} onClick={()=>onContact(peer)}><ProfileAvatar src={peer.avatarUrl} name={personName(peer)}/><span>{personName(peer)}</span></button>:peer?<AccountProfileLink username={peer.username} className="bank-chat-profile" label={'View '+personName(peer)+' profile'}><ProfileAvatar src={peer.avatarUrl} name={personName(peer)}/><span>{personName(peer)}</span></AccountProfileLink>:<div className="bank-chat-members" ref={region}><button type="button" aria-label="View group members" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Users size={16}/><span>{people.length} people</span></button>{open&&<div className="bank-chat-member-list" role="region" aria-label="Group profiles">{people.map(person=><AccountProfileLink key={person.userId} username={person.username} className="bank-chat-member" label={'View '+personName(person)+' profile'}><ProfileAvatar src={person.avatarUrl} name={personName(person)}/><span><strong>{personName(person)}</strong>{person.username&&<small>@{person.username}</small>}</span><ArrowUpRight size={13}/></AccountProfileLink>)}</div>}</div>;
}
function personName(person:ChatPerson){return person.displayName||person.username||'Receiz account';}
function exhaustedCredits(cause:unknown){return cause instanceof Error&&['usage_insufficient_credits','usage_provider_allowance_exhausted','usage_provider_budget_exhausted'].includes(cause.message);}
function errorText(cause:unknown){const code=cause instanceof Error?cause.message:'Request failed';return code==='insufficient_scope'?'Receiz has not granted this permission. Close and reopen messages to review access.':code;}
function timeLabel(raw:string|null){if(!raw)return '';const date=new Date(raw);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date):'';}
function mergedMessages(previous:ChatMessage[],incoming:ChatMessage[]){const rows=new Map(previous.map(message=>[message.id,message]));for(const message of incoming)rows.set(message.id,message);return [...rows.values()];}
function memoryIdentity(row:NativeTwinMemory){return [row.id,row.persistedId,row.transportId].filter((id):id is string=>!!id);}
function currentTwinMemoryIds(question:string,reply:NativeTwinReply):string[]{
  const user=reply.memory.at(-2),assistant=reply.memory.at(-1);
  // This runtime appends the just-acknowledged pair with fresh message IDs.
  // Match that exact trailing pair once, then use its carried identities on
  // later replies. Equal text elsewhere never establishes message identity.
  return user?.role==='user'&&user.body===question&&assistant?.role==='assistant'&&assistant.body===reply.message
    ?[...memoryIdentity(user),...memoryIdentity(assistant)]:[];
}

/** Replacing an open identity replaces this complete private view before paint. */
export function MessagesPanel(props:MessagesPanelProps){
  const [owner,setOwner]=useState(()=>({identity:props.identity,revision:0}));
  if(owner.identity!==props.identity)setOwner({identity:props.identity,revision:owner.revision+1});
  return <MessagesSession key={owner.revision} {...props}/>;
}
function MessagesSession({identity,active,onClose,onOpen,onPreparePayment,heldLedger,twinContextRecords=[],initialRecipient,initialNotification,initialBusinessRequest,onBusinessConsumed}:MessagesPanelProps){
  const [organizerEntry,setOrganizerEntry]=useState<OrganizerEntry|null>(null),[lastOrganizerEntry,setLastOrganizerEntry]=useState<OrganizerEntry|null>(null);
  const organizerIntent=useRef(0);
  const openOrganizer=(view:OrganizerEntry['view'],person?:ChatPerson)=>{chooseView();const ticket=organizerIntent.current,entry={id:ticket,view,...(person?{person}:{})};const show=()=>{if(!live()||ticket!==organizerIntent.current)return;setOrganizerEntry(entry);setLastOrganizerEntry(entry);};if(organizerCodeReady)show();else void preloadMessageOrganizer().then(show).catch(cause=>{if(live()&&ticket===organizerIntent.current)setNotice(errorText(cause));});};
  const [retained]=useState(()=>identity.knownMessagingDisplay?.()??null);
  const connectedOwner=useRef(retained?.accountUid??null);
  const [api,setApi]=useState<NativeMessaging|null>(null),[consent,setConsent]=useState<'checking'|'needed'|'ready'|'error'>('checking');
  const [twinFirst,setTwinFirst]=useState(()=>identity.knownTwinAccess?.()===true),viewChosen=useRef(!!initialBusinessRequest);
  const businessRequests=useRef(new Set<string>()),businessEntryApproval=useRef(!!initialBusinessRequest);
  if(initialBusinessRequest)businessEntryApproval.current=true;
  const entryApproved=businessEntryApproval.current||!!initialRecipient;
  const [businessReviewLanding,setBusinessReviewLanding]=useState<string|undefined>();
  const [businessStart,setBusinessStart]=useState<BusinessStart|null>(()=>initialBusinessRequest?initialBusinessRequest.start??BUSINESS_FIRST_TASK:null);
  const [upgradeOpen,setUpgradeOpen]=useState(false),[upgradeQuestion,setUpgradeQuestion]=useState<string|null>(null),[twinAccessQuestions,setTwinAccessQuestions]=useState<Array<{id:string;question:string}>>(()=>twinFirst?[]:retained?.twinAccessQuestions??[]);
  const [mode,setMode]=useState<Mode>(()=>initialBusinessRequest||twinFirst?'twin':'inbox'),[inbox,setInbox]=useState<ChatConversation[]>(()=>retained?.inbox??[]),[selected,setSelected]=useState<ChatConversation|null>(null),[page,setPage]=useState<ChatPage|null>(null);
  const [readError,setReadError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[olderBusy,setOlderBusy]=useState(false);
  const [drafts,setDrafts]=useState<Record<string,string>>({}),[twinDraft,setTwinDraft]=useState(''),[exchanges,setExchanges]=useState<TwinExchange[]>([]),[deltas,setDeltas]=useState<Record<string,string>>({});
  const [pendingMessages,setPendingMessages]=useState<Record<string,PendingChatMessage>>({}),[typingNames,setTypingNames]=useState<Record<string,string>>({});
  const [typingPeers,setTypingPeers]=useState<string[]>([]);const peerTyping=useRef<PeerTypingController|null>(null);
  const scrollArea=useRef<HTMLDivElement>(null),followLatest=useRef(true);
  const [inboxQuery,setInboxQuery]=useState(''),[query,setQuery]=useState(''),[people,setPeople]=useState<ChatPerson[]>([]),[picked,setPicked]=useState<ChatPerson[]>([]),[groupName,setGroupName]=useState(''),[searching,setSearching]=useState(false);
  const [activeCall,setActiveCall]=useState<ActiveCall|null>(null),[heldCall,setHeldCall]=useState<HeldCall|null>(null),[callLive,setCallLive]=useState(false),callHost=useRef<HTMLDivElement>(null);
  const notificationAttempt=useRef<NotificationTarget|null>(null),notificationWork=useRef<AbortController|null>(null),notificationEpoch=useRef(0),freshNotificationThread=useRef<string|null>(null);
  const notificationCall=useRef<{target:NotificationTarget;title:string;epoch:number}|null>(null),callLiveRef=useRef(callLive);callLiveRef.current=callLive;
  const onCallLiveChange=useCallback((live:boolean)=>{callLiveRef.current=live;setCallLive(live);},[]);
  const chooseView=()=>{organizerIntent.current++;viewChosen.current=true;notificationEpoch.current++;notificationWork.current?.abort();notificationCall.current=null;freshNotificationThread.current=null;notificationAttempt.current=initialNotification??null;};
  const [twinWorkspaceOpen,setTwinWorkspaceOpen]=useState(false),[twinWorkspaceTab,setTwinWorkspaceTab]=useState<'settings'|'mind'|'work'|'embed'>('settings');
  const [proposal,setProposal]=useState<string|null>(null);
  const [businessReceipts,setBusinessReceipts]=useState<Record<string,BusinessChatReceipt[]>>({}),[businessWorking,setBusinessWorking]=useState(''),[twinStream,setTwinStream]=useState(''),[selectedFileNames,setSelectedFileNames]=useState<string[]>([]);
  const domainMonitors=useRef(new Map<string,AbortController>()),domainMonitorDone=useRef(new Set<string>()),businessThreadOwners=useRef(new Map<string,string>());
  const ownerToolTasks=useRef(new Map<string,import('../../receiz/owner-tool-conversation').OwnerToolConversation>()),ownerToolResolutions=useRef(new Set<string>());
  const businessContext=useRef<BusinessChatReceipt[]>([]),connectionCleanup=useRef<(()=>void)|null>(null),providerCompletion=useRef<(()=>Promise<void>)|null>(null),providerOwner=useRef(identity);providerOwner.current=identity;
  function publishBusinessThreadReceipts(key:string,id:string,next:BusinessChatReceipt[]){
    if(!alive.current)return;businessThreadOwners.current.set(id,key);
    const merged=(held:BusinessChatReceipt[])=>[...held.filter(row=>!next.some(value=>value.id===row.id)),...next].slice(-6);
    if(key===twinThreadRef.current){businessContext.current=merged(businessContext.current);setBusinessReceipts(rows=>({...rows,[id]:next}));}
    else{const held=heldTwinThreads.current.get(key);if(held)heldTwinThreads.current.set(key,{...held,businessContext:merged(held.businessContext),businessReceipts:{...held.businessReceipts,[id]:next}});}
  }
  const creditsFunded=useCallback(()=>setCreditsNeededFor(current=>current===identity?null:current),[identity]);
  const streamTwinDelta=useCallback((text:string)=>{if(alive.current)setTwinStream(current=>current+text);},[]);
  useEffect(()=>()=>{connectionCleanup.current?.();providerCompletion.current=null;for(const monitor of domainMonitors.current.values())monitor.abort();},[identity]);
  const moneyCheckpoint=useRef<MoneyQuestion|null>(null),moneyRestored=useRef<OpenIdentity|null>(null),moneyRestoreSerial=useRef(0),selectedTwinFiles=useRef<File[]>([]);
  const [pendingTwin,setPendingTwin]=useState<MoneyQuestion|null>(null);
  useEffect(()=>{if(pendingTwin?.moneyPaused==='credits')setCreditsNeededFor(identity);},[identity,pendingTwin?.moneyPaused]);
  const [moneyQuestions,setMoneyQuestions]=useState<Record<string,string>>({});
  const [moneyReceipts,setMoneyReceipts]=useState<Record<string,MoneyReceipt[]>>({}),[creditsOpen,setCreditsOpen]=useState<OpenIdentity|null>(null),[creditsNeededFor,setCreditsNeededFor]=useState<OpenIdentity|null>(null);
  const [twinThreadKey,setTwinThreadKey]=useState<string|null>(null),[twinHistory,setTwinHistory]=useState<NativeTwinMemory[]>([]),[twinHistoryCursor,setTwinHistoryCursor]=useState<string|null>(null),[twinHistoryMore,setTwinHistoryMore]=useState(false);
  const [hasRemotePast,setHasRemotePast]=useState(false),pastPrimed=useRef<{identity:OpenIdentity;api:NativeMessaging}|null>(null);
  const [pastOpen,setPastOpen]=useState(false),[pastBusy,setPastBusy]=useState(false),[threadSwitching,setThreadSwitching]=useState(false),[pastThreads,setPastThreads]=useState<TwinConversation[]>([]),[pastCursor,setPastCursor]=useState<string|null>(null),[pastMore,setPastMore]=useState(false);
  const heldTwinThreads=useRef(new Map<string,TwinHeldThread>()),twinThreadEpoch=useRef(0),twinThreadRef=useRef(''),twinSwitching=useRef(false);
  const selectedTwinKey=twinThreadKey??`api:${api?.accountUid??retained?.accountUid??''}`;twinThreadRef.current=selectedTwinKey;
  const agentEntitled=api?.knownTwinAccess?.()??identity.knownTwinAccess?.()??twinFirst;
  const hasPastConversations=agentEntitled&&(hasRemotePast||exchanges.length>0||twinHistory.length>0||[...heldTwinThreads.current.values()].some(row=>row.exchanges.length>0||row.history.length>0||!!row.pending?.moneyTask));
  const [pageVisible,setPageVisible]=useState(()=>document.visibilityState!=='hidden');
  useEffect(()=>{if(!active&&!callLive){setHeldCall(null);setMode(current=>current==='call'?'thread':current);}},[active,callLive]);
  const openCall=(video:boolean)=>{if(!selected)return;chooseView();if(!callLive)setHeldCall({conversationId:selected.id,title:page?.conversation.title||selected.title,video,callId:activeCall?.id});setMode('call');};
  // Warm only the next-view code after the existing Messages surface settles.
  // This mounts no organizer, reads no private records and requests no grant.
  useEffect(()=>{if(!api||!active||!identity.organizer||organizerCodeReady)return;let cancelled=false,frame=0;const warm=()=>{if(!cancelled)void preloadMessageOrganizer().catch(()=>{});};if('requestIdleCallback' in window){const id=window.requestIdleCallback(warm);return()=>{cancelled=true;window.cancelIdleCallback(id);};}frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(warm);});return()=>{cancelled=true;cancelAnimationFrame(frame);};},[api,active,identity]);
  const contacts=useMemo(()=>api?conversationPeople(inbox,api.accountUid):[],[inbox,api]);
  const suggestedPeople=useMemo(()=>api?peopleSuggestions(contacts,people,query,api.accountUid):[],[contacts,people,query,api]);
  const alive=useRef(true),activeRef=useRef(active),selection=useRef<string|null>(null),connection=useRef(0),sending=useRef(false);
  const controllers=useRef(new Set<AbortController>()),reads=useRef(new Map<string,Promise<void>>());
  activeRef.current=active;selection.current=selected?.id??null;
  const live=useCallback(()=>alive.current&&activeRef.current&&document.visibilityState!=='hidden',[]);
  useEffect(()=>{if(active&&pageVisible&&live()&&providerCompletion.current){const resume=providerCompletion.current;providerCompletion.current=null;void resume();}},[active,pageVisible,live]);
  useEffect(()=>{
    if(!pageVisible){for(const monitor of domainMonitors.current.values())monitor.abort();domainMonitors.current.clear();return;}
    if(!identity.businessSetup)return;
    for(const [id,receipts] of Object.entries(businessReceipts)){if(domainMonitors.current.has(id)||domainMonitorDone.current.has(id)||!receipts.some(row=>row.workTaskId&&!row.workTerminal||row.status==='waiting'&&row.domain?.providerResult?.status==='applied'))continue;const abort=new AbortController(),origin=businessThreadOwners.current.get(id)??twinThreadRef.current;businessThreadOwners.current.set(id,origin);domainMonitors.current.set(id,abort);void identity.businessSetup().then(async setup=>{if(abort.signal.aborted)return;const monitor=receipts.some(row=>row.workTaskId&&!row.workTerminal)?setup.monitorWork:setup.monitorDomain;if(typeof monitor!=='function')return;await monitor(id,{signal:abort.signal,onUpdate:next=>{if(!alive.current||abort.signal.aborted)return;publishBusinessThreadReceipts(origin,id,next);}});}).catch(()=>{}).finally(()=>{if(!abort.signal.aborted)domainMonitorDone.current.add(id);if(domainMonitors.current.get(id)===abort)domainMonitors.current.delete(id);});}
  },[pageVisible,businessReceipts,identity]);
  const controller=useCallback(()=>{const value=new AbortController();controllers.current.add(value);return value;},[]);
  const stop=useCallback(()=>{for(const value of controllers.current)value.abort();controllers.current.clear();},[]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;connection.current++;stop();};},[stop]);
  useEffect(()=>{
    const visibility=()=>{const visible=document.visibilityState!=='hidden';setPageVisible(visible);if(!visible)stop();};
    document.addEventListener('visibilitychange',visibility);
    const hide=()=>stop();window.addEventListener('pagehide',hide);
    if(!active)stop();
    return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);stop();};
  },[active,stop]);

  useEffect(()=>{followLatest.current=true;},[mode,selected?.id]);
  useEffect(()=>{if(followLatest.current&&scrollArea.current)scrollArea.current.scrollTop=scrollArea.current.scrollHeight;},[mode,selected?.id,page?.messages,deltas,pendingMessages,pendingTwin,exchanges,typingPeers,twinAccessQuestions,twinStream,businessReceipts,businessWorking]);
  const trackScroll=()=>{const area=scrollArea.current;if(area)followLatest.current=area.scrollHeight-area.scrollTop-area.clientHeight<72;};

  const connect=useCallback(async(approve:boolean)=>{
    const attempt=++connection.current;
    setConsent('checking');setReadError('');
    try{
      if(!identity.messaging)throw Error('Messaging is unavailable for this identity.');
      const next=await identity.messaging(approve);
      if(!live()||attempt!==connection.current)return;
      const first=next.knownTwinAccess?.()??identity.knownTwinAccess?.()??false;
      setTwinFirst(first);
      if(first)setTwinAccessQuestions([]);
      if(!viewChosen.current)setMode(first?'twin':'inbox');
      if(connectedOwner.current&&connectedOwner.current!==next.accountUid){
        twinThreadEpoch.current++;moneyRestoreSerial.current++;heldTwinThreads.current.clear();moneyCheckpoint.current=null;moneyRestored.current=null;selectedTwinFiles.current=[];businessContext.current=[];
        setTwinThreadKey(null);setTwinHistory([]);setTwinHistoryCursor(null);setTwinHistoryMore(false);setPastThreads([]);setHasRemotePast(false);pastPrimed.current=null;setPastOpen(false);setPastCursor(null);setPastMore(false);setPastBusy(false);setThreadSwitching(false);twinSwitching.current=false;setPendingTwin(null);setMoneyReceipts({});setMoneyQuestions({});setExchanges([]);setBusinessReceipts({});setBusinessWorking('');setTwinStream('');setSelectedFileNames([]);
        connectionCleanup.current?.();providerCompletion.current=null;for(const monitor of domainMonitors.current.values())monitor.abort();domainMonitors.current.clear();domainMonitorDone.current.clear();businessThreadOwners.current.clear();
        setSelected(null);setPage(null);setUpgradeOpen(false);setTwinAccessQuestions([]);setTwinDraft('');setMode(first?'twin':'inbox');
      }
      connectedOwner.current=next.accountUid;
      setApi(next);setInbox(next.knownConversations());setConsent('ready');
    }catch(cause){
      if(!live()||attempt!==connection.current)return;
      if(cause instanceof Error&&cause.message==='MESSAGING_CONSENT_REQUIRED')setConsent('needed');
      else{setReadError(errorText(cause));setConsent('error');}
    }
  },[identity,live,retained]);
  useEffect(()=>{if(active&&pageVisible&&!api)void connect(entryApproved);return()=>{connection.current++;};},[active,pageVisible,api,connect,entryApproved]);

  // Serialize each read key, including across abort/reopen, without overlapping
  // a slow request. Known rows stay painted while verified additions arrive.
  const read=useCallback(async<T,>(key:string,signal:AbortSignal,work:()=>Promise<T>,accept:(value:T)=>void):Promise<void>=>{
    const prior=reads.current.get(key);if(prior){await prior;if(signal.aborted||!live())return;}
    // Another waiter may have acquired the key while the previous read settled.
    if(reads.current.has(key))return;
    if(signal.aborted||!live())return;
    let attempt!:Promise<void>;
    attempt=(async()=>{try{const value=await work();if(!signal.aborted&&live()){accept(value);setReadError('');}}catch(cause){if(!signal.aborted&&live())setReadError(errorText(cause));}finally{if(reads.current.get(key)===attempt)reads.current.delete(key);}})();
    reads.current.set(key,attempt);await attempt;
  },[live]);
  const refreshInbox=useCallback((signal:AbortSignal)=>api?read('inbox',signal,()=>api.conversations(signal),setInbox):Promise.resolve(),[api,read]);
  const refreshThread=useCallback((id:string,signal:AbortSignal,before?:string)=>api?read('thread:'+id,signal,()=>api.messages(id,before,signal),next=>{if(selection.current===id){setPage(next);setSelected(next.conversation);}}):Promise.resolve(),[api,read]);
  const refreshCalls=useCallback((id:string,signal:AbortSignal)=>api?read('calls:'+id,signal,async()=>{
    const intent=notificationCall.current;
    const response=await api.callTransport.heldFetch('/api/chat/conversations/'+encodeURIComponent(id)+'/calls',{signal,cache:'no-store'});
    const data=await response.json() as {ok?:boolean;error?:string;activeCall?:{id?:string;conversationId?:string;status?:string;mode?:string}|null};
    if(!response.ok||data.ok!==true)throw Error(data.error||'Call status unavailable');
    const call=data.activeCall;
    return {intent,call:call?.status==='active'&&call.conversationId===id&&typeof call.id==='string'&&['voice','video'].includes(String(call.mode))?{id:call.id,mode:call.mode as 'voice'|'video'}:null};
  },({call:next,intent})=>{
    if(selection.current!==id)return;setActiveCall(next);
    if(!intent||intent!==notificationCall.current||intent.epoch!==notificationEpoch.current||intent.target.conversationId!==id)return;
    notificationAttempt.current=intent.target;notificationCall.current=null;
    if(!callLiveRef.current&&next&&next.id===intent.target.callId){setHeldCall({conversationId:id,title:intent.title,video:next.mode==='video',callId:next.id});setMode('call');}
  }):Promise.resolve(),[api,read]);
  useEffect(()=>{
    if(!api||!active||!pageVisible)return;
    const pending=controller();
    const refresh=()=>{void refreshInbox(pending.signal);};
    refresh();const timer=window.setInterval(refresh,12000);
    return()=>{window.clearInterval(timer);pending.abort();controllers.current.delete(pending);};
  },[api,active,pageVisible,controller,refreshInbox]);
  // Navigation must not cancel the inbox already on its way to first paint.
  // Only the selected conversation and its call status follow thread changes.
  useEffect(()=>{
    if(!api||!active||!pageVisible||mode!=='thread'||!selected)return;
    const pending=controller();
    const refresh=()=>{if(freshNotificationThread.current===selected.id)freshNotificationThread.current=null;else void refreshThread(selected.id,pending.signal);void refreshCalls(selected.id,pending.signal);};
    refresh();const timer=window.setInterval(refresh,12000);
    return()=>{window.clearInterval(timer);pending.abort();controllers.current.delete(pending);};
  },[api,active,pageVisible,mode,selected?.id,controller,refreshThread,refreshCalls]);
  useEffect(()=>{
    if(!api||!active||!pageVisible||mode!=='new')return;
    const pending=controller();setPeople([]);
    if(!peopleSearchQuery(query)){setSearching(false);return()=>{pending.abort();controllers.current.delete(pending);};}
    setSearching(true);
    const timer=window.setTimeout(()=>{void api.search(query,pending.signal).then(next=>{if(!pending.signal.aborted&&live())setPeople(next);}).catch(cause=>{if(!pending.signal.aborted&&live())setReadError(errorText(cause));}).finally(()=>{if(!pending.signal.aborted&&live())setSearching(false);});},300);
    return()=>{window.clearTimeout(timer);pending.abort();controllers.current.delete(pending);};
  },[api,active,pageVisible,mode,query,controller,live]);

  useEffect(()=>{
    if(!api?.typing||!active||!pageVisible||mode!=='thread'||!selected)return;
    const open=()=>{if(peerTyping.current||document.visibilityState==='hidden')return;let current:PeerTypingController;current=api.typing(selected.id,ids=>{if(peerTyping.current===current)setTypingPeers(ids);});peerTyping.current=current;};
    const close=()=>{const previous=peerTyping.current;peerTyping.current=null;previous?.close();setTypingPeers([]);};
    const resume=()=>{close();open();};
    open();window.addEventListener('pagehide',close);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);
    return()=>{window.removeEventListener('pagehide',close);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);close();};
  },[api,active,pageVisible,mode,selected?.id]);

  const pick=(conversation:ChatConversation,fromNotification=false)=>{if(!fromNotification)chooseView();viewChosen.current=true;selection.current=conversation.id;setSelected(conversation);setPage(api?.knownMessages(conversation.id)??retained?.pages.find(row=>row.conversation.id===conversation.id)??null);setActiveCall(null);setMode('thread');setNotice('');setDeltas({});setTypingNames({});};
  const refreshNow=()=>{if(!api||!selected)return;const pending=controller();void Promise.all([refreshThread(selected.id,pending.signal),refreshInbox(pending.signal)]).finally(()=>controllers.current.delete(pending));};
  const loadOlder=async()=>{if(!page?.nextCursor||!selected||olderBusy)return;const pending=controller();setOlderBusy(true);await refreshThread(selected.id,pending.signal,page.nextCursor);controllers.current.delete(pending);if(alive.current)setOlderBusy(false);};
  const createConversation=async(participants=picked)=>{
    if(!api||!participants.length||sending.current||!live())return;
    sending.current=true;setBusy(true);setNotice('');
    try{
      const id=await api.createConversation({participantUserIds:participants.map(person=>person.userId),...(participants.length>1&&groupName.trim()?{title:groupName.trim()}: {})});
      if(!live())return;
      // Creation acknowledges only the ID. Do not fabricate a conversation row.
      const pending=controller();await refreshInbox(pending.signal);if(!live())return;
      const held=api.knownConversations().find(row=>row.id===id);
      selection.current=id;setSelected(held??null);setPage(api.knownMessages(id));setPicked([]);setGroupName('');setQuery('');
      // A real thread read resolves title and membership when the inbox has not
      // yet projected the newly acknowledged conversation.
      await read('thread:'+id,pending.signal,()=>api.messages(id,undefined,pending.signal),next=>{setSelected(next.conversation);setPage(next);setMode('thread');});
      if(held)setMode('thread');controllers.current.delete(pending);
    }catch(cause){if(live())setNotice(cause instanceof MessagingError&&cause.ambiguous?'Conversation outcome is unknown. Check Messages before trying again.':errorText(cause));}
    finally{sending.current=false;if(alive.current){setBusy(false);setBusinessWorking('');}}
  };
  const recipientAttempt=useRef<number|null>(null);
  useEffect(()=>{
    if(!initialNotification||!api||!active||!pageVisible||notificationAttempt.current===initialNotification)return;
    viewChosen.current=true;
    if(initialNotification.recipientUserId!==api.accountUid){notificationAttempt.current=initialNotification;setNotice('This notification belongs to another ID. Open that ID to view its conversation.');return;}
    const pending=controller(),target=initialNotification,ticket=++notificationEpoch.current;
    notificationWork.current=pending;
    void (async()=>{
      try{
        const held=api.knownMessages(target.conversationId),next=held??await api.messages(target.conversationId,undefined,pending.signal);
        if(pending.signal.aborted||!live()||notificationEpoch.current!==ticket)return;
        const alreadyThread=selection.current===target.conversationId&&mode==='thread';
        if(!held&&!alreadyThread)freshNotificationThread.current=target.conversationId;
        // Reuse the normal thread call read. An earlier read cannot consume a
        // later invitation, and a live call is never replaced by a push hint.
        if(target.callId&&!callLiveRef.current)notificationCall.current={target,title:next.conversation.title,epoch:ticket};else notificationAttempt.current=target;
        pick(next.conversation,true);setPage(next);
        if(alreadyThread&&notificationCall.current?.target===target)await refreshCalls(target.conversationId,pending.signal);
      }catch(cause){if(!pending.signal.aborted&&live()&&notificationEpoch.current===ticket)setNotice(errorText(cause));}finally{if(notificationWork.current===pending)notificationWork.current=null;controllers.current.delete(pending);}
    })();
    return()=>pending.abort();
  },[initialNotification,api,active,pageVisible,controller,live,refreshCalls]);
  useEffect(()=>{
    if(!initialRecipient||!api||!active||!pageVisible||sending.current||recipientAttempt.current===initialRecipient.id)return;
    recipientAttempt.current=initialRecipient.id;chooseView();
    const person:ChatPerson={kind:'user',...initialRecipient.person};
    if(person.userId===api.accountUid){setMode('inbox');return;}
    const known=api.knownConversations().find(row=>row.kind==='dm'&&row.members.some(member=>member.kind==='user'&&member.userId===person.userId));
    if(known){pick(known);return;}
    setPicked([person]);setMode('new');void createConversation([person]);
    // One explicit profile Message intent uses the existing conversation path.
    // A failed/ambiguous creation is never automatically repeated on reopen.
  },[initialRecipient?.id,api,active,pageVisible,busy]);
  const connectBusinessProvider=(requestId:string,href:string)=>{
    const origin=twinThreadRef.current;
    if(!identity.businessSetup||!live())return;
    const url=new URL(href);if(!['https://vercel.com','https://connect.vercel.com'].includes(url.origin))return;
    connectionCleanup.current?.();providerCompletion.current=null;
    const popup=window.open(url.href,'bankeiz-provider-connect','popup,width=520,height=740');
    if(!popup){setNotice('Allow the provider connection window, then try Connect again.');return;}
    let finished=false;setBusinessWorking('Waiting for your provider approval…');
    const continueSetup=async()=>{if(!alive.current||providerOwner.current!==identity)return;try{if(origin===twinThreadRef.current)setBusinessWorking('Checking your connection and setting up your domain…');const setup=await identity.businessSetup!(),receipts=await setup.resume(requestId,{onProgress:tool=>{if(live()&&origin===twinThreadRef.current)setBusinessWorking(businessActivityLabel(tool));}});if(!alive.current||providerOwner.current!==identity)return;publishBusinessThreadReceipts(origin,requestId,receipts);}catch(cause){if(alive.current&&providerOwner.current===identity&&origin===twinThreadRef.current)setNotice('Provider setup needs checking. '+errorText(cause));}finally{if(alive.current&&providerOwner.current===identity&&origin===twinThreadRef.current)setBusinessWorking('');}};
    const resume=async()=>{if(finished)return;finished=true;cleanup();if(!live()){if(alive.current&&providerOwner.current===identity){providerCompletion.current=continueSetup;setBusinessWorking('');}return;}await continueSetup();};
    const receive=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===popup&&event.data?.type==='bankeiz:dns-connected')void resume();};
    const poll=setInterval(()=>{if(popup.closed)void resume();},500),timeout=setTimeout(()=>{if(!finished){finished=true;cleanup();if(live()){setBusinessWorking('');setNotice('Provider approval is still pending. You can return to Connect when ready.');}}},10*60*1000);
    function cleanup(){clearInterval(poll);clearTimeout(timeout);window.removeEventListener('message',receive);connectionCleanup.current=null;}
    connectionCleanup.current=()=>{finished=true;cleanup();};window.addEventListener('message',receive);
  };
  const applyBusinessActions=async(reply:NativeTwinReply,question:NativeTwinAsk)=>{
    const origin=twinThreadRef.current;businessThreadOwners.current.set(reply.requestId,origin);
    if(!identity.businessSetup||!reply.businessActions?.length)return;
    const readyReceipts=prepareBusinessReceiptCode();void readyReceipts.catch(()=>{});
    if(api&&reply.businessActions.every(action=>/^business_(?:find_contacts|save_contact|read_calendar|create_appointment|update_appointment|cancel_appointment|booking_link|read_availability|update_availability|receiz_call)$/.test(action.tool))){
      const root=question.requestId;businessThreadOwners.current.set(root,origin);setBusinessWorking(businessActivityLabel(reply.businessActions[0].tool));
      try{const [{createOwnerToolConversation},setup]=await Promise.all([import('../../receiz/owner-tool-conversation'),identity.businessSetup(),readyReceipts]);if(!live())return;
       const task=createOwnerToolConversation({accountUid:api.accountUid,question,assertOpen:()=>{if(!live())throw Error('OWNER_TOOL_CONVERSATION_CLOSED');},
        ask:next=>{setBusinessWorking('Putting your records together…');return api.twin.ask(next);},execute:async(id,actions)=>{setBusinessWorking(businessActivityLabel(actions[0].tool));return setup.execute(id,actions);},
        onReceipts:receipts=>publishBusinessThreadReceipts(origin,root,receipts),onReply:next=>{if(!live())return;if(origin===twinThreadRef.current)setExchanges(rows=>rows.map(row=>row.id===root?{...row,reply:next}:row));else{const held=heldTwinThreads.current.get(origin);if(held)heldTwinThreads.current.set(origin,{...held,exchanges:held.exchanges.map(row=>row.id===root?{...row,reply:next}:row)});}}});
       ownerToolTasks.current.set(root,task);await task.start(reply);
      }catch(cause){if(live()&&exhaustedCredits(cause))setCreditsNeededFor(identity);if(live())setNotice(exhaustedCredits(cause)?'Add credits to continue. Your completed work is still here.':'Organizer result needs checking. '+errorText(cause));}finally{if(alive.current)setBusinessWorking('');}return;
    }
    setBusinessWorking(businessActivityLabel(reply.businessActions[0].tool));
    try{const setup=await identity.businessSetup();if(!live())return;const [receipts]=await Promise.all([setup.execute(reply.requestId,reply.businessActions,{onProgress:tool=>{if(live()&&origin===twinThreadRef.current)setBusinessWorking(businessActivityLabel(tool));}}),readyReceipts]);if(!live())return;publishBusinessThreadReceipts(origin,reply.requestId,receipts);}
    catch(cause){if(live())setNotice('Setup result needs checking. '+errorText(cause));}
    finally{if(alive.current)setBusinessWorking('');}
  };
  const resolveReceizAction=async(requestId:string,id:string,action:'approve'|'inspect')=>{
    if(!identity.businessSetup||businessWorking||ownerToolResolutions.current.has(requestId))return;ownerToolResolutions.current.add(requestId);const origin=businessThreadOwners.current.get(requestId)??twinThreadRef.current;setBusinessWorking(action==='approve'?'Running your Receiz action…':'Checking the same Receiz attempt…');
    try{const tools=await identity.businessSetup();if(!live())return;const operationId=id.slice(0,id.lastIndexOf(':')),receipts=await tools.resolveReceizAction(operationId,id,action);if(live()){const task=ownerToolTasks.current.get(requestId);if(task)await task.resume(receipts);else publishBusinessThreadReceipts(origin,requestId,receipts);}}catch(cause){if(live())setNotice('Receiz result needs checking. '+errorText(cause));}finally{ownerToolResolutions.current.delete(requestId);if(alive.current)setBusinessWorking('');}
  };
  const acceptTwin=(question:Omit<NativeTwinAsk,'signal'>,reply:NativeTwinReply)=>{
    if((question.threadKey??`api:${api?.accountUid}`)!==twinThreadRef.current)return false;
    setCreditsNeededFor(null);
    const exchange: TwinExchange={id:question.requestId,question:question.message,reply,memoryIds:currentTwinMemoryIds(question.message,reply)};
    setExchanges(rows=>rows.some(row=>row.id===question.requestId)?rows.map(row=>row.id===question.requestId?exchange:row):[...rows,exchange]);
    setTwinDraft(current=>current.trim()===question.message?'':current);setPendingTwin(null);setTwinStream('');return true;
  };
  const saveMoneyCheckpoint=async(question:MoneyQuestion|null,key=question?.threadKey??twinThreadRef.current)=>{if(key===twinThreadRef.current)moneyCheckpoint.current=question;if(identity.moneyTools){const tools=await identity.moneyTools();await tools.checkpoint?.(question,key);}};
  const pauseMoneyTask=async()=>{const held=moneyCheckpoint.current;if(!held?.moneyTask)return false;const next:MoneyQuestion={...held,requestId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),moneyPaused:'credits'};await saveMoneyCheckpoint(next);setPendingTwin(next);setTwinDraft(current=>current||held.moneyTask!.humanText);return true;};
  useEffect(()=>{if(mode!=='twin'||!active||!api||!identity.moneyTools||moneyRestored.current===identity)return;moneyRestored.current=identity;const epoch=twinThreadEpoch.current,serial=moneyRestoreSerial.current;void identity.moneyTools().then(async tools=>{const question=await tools.recoverQuestion?.();if(!question||!live()||moneyCheckpoint.current||epoch!==twinThreadEpoch.current||serial!==moneyRestoreSerial.current)return;const key=question.threadKey??`api:${api.accountUid}`;if(!isOwnerTwinThreadKey(key,api.accountUid))return;setTwinThreadKey(key);twinThreadRef.current=key;moneyCheckpoint.current=question;setPendingTwin(question);if(question.moneyTask){const root=question.moneyTask.humanRequestId;setMoneyReceipts(rows=>({...rows,[root]:question.moneyTask!.receipts}));setMoneyQuestions(rows=>({...rows,[root]:question.moneyTask!.humanText}));}if(question.moneyPaused)setTwinDraft(current=>current||question.moneyTask?.humanText||question.message);}).catch(()=>{});},[mode,active,api,identity]);
  const askTwin=async(question:MoneyQuestion,signal:AbortSignal)=>{
    if(!api)throw Error('MESSAGING_UNAVAILABLE');
    if(!identity.moneyTools||!question.moneyTools){const reply=await api.twin.ask({...question,signal,onDelta:streamTwinDelta});return{reply,question};}
    const {runMoneyConversation}=await import('../../receiz/money-conversation');
    const rootId=question.moneyTask?.humanRequestId??question.requestId;setMoneyQuestions(rows=>({...rows,[rootId]:question.moneyTask?.humanText??question.message}));
    const result=await runMoneyConversation({accountUid:api.accountUid,question,signal,
      ask:next=>{if(signal.aborted||!live())throw Error('MONEY_CHAT_INACTIVE');setBusinessWorking('');setTwinStream('');return api.twin.ask(next);},
      execute:async(turn,action)=>{if(signal.aborted||!live())throw Error('MONEY_CHAT_INACTIVE');const workspace=await identity.moneyTools!();if(signal.aborted||!live())throw Error('MONEY_CHAT_INACTIVE');return workspace.execute(turn,action);},
      onCheckpoint:async next=>{if(!signal.aborted&&live()){await saveMoneyCheckpoint(next);setPendingTwin(next);}},onDelta:streamTwinDelta,
      onProgress:status=>{if(!signal.aborted&&live()){setTwinStream('');setBusinessWorking(status);}},
      onReceipt:receipt=>{if(!signal.aborted&&live())setMoneyReceipts(rows=>({...rows,[rootId]:[...(rows[rootId]??[]).filter(row=>row.id!==receipt.id),receipt]}));},
    });
    return{reply:result.reply,question:{...question,requestId:result.humanRequestId,message:result.humanText}};
  };
  const downloadMoneySource=async(digest:string)=>{
    if(!identity.moneyTools||!live())return;
    try{const tools=await identity.moneyTools(),file=await tools.downloadSource(digest);if(!live())return;const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(cause){if(live())setNotice('Source download needs attention. '+errorText(cause));}
  };
  const recoverTwin=async()=>{
    if(!api||!pendingTwin||sending.current||twinSwitching.current||!live())return;
    moneyRestoreSerial.current++;sending.current=true;setBusy(true);setNotice('');const pending=controller();
    try{
      setTwinStream('');const result=await askTwin({...pendingTwin,moneyPaused:undefined,quoteExpiresAt:pendingTwin.moneyPaused?new Date(Date.now()+5*60*1000).toISOString():pendingTwin.quoteExpiresAt},pending.signal);
      if(!pending.signal.aborted&&live()){if(acceptTwin(result.question,result.reply)){void saveMoneyCheckpoint(null,result.question.threadKey??`api:${api.accountUid}`).catch(()=>{});await applyBusinessActions(result.reply,result.question);}}
    }catch(cause){if(!pending.signal.aborted&&live()){if(exhaustedCredits(cause)){setCreditsNeededFor(identity);setTwinDraft(current=>current||pendingTwin.moneyTask?.humanText||pendingTwin.message);if(!await pauseMoneyTask())setPendingTwin(null);setNotice('Add credits to keep going. Your conversation and completed work are still here.');}else setNotice('Agent response is not confirmed. '+errorText(cause));}}
    finally{controllers.current.delete(pending);sending.current=false;if(alive.current){setBusy(false);setBusinessWorking('');}}
  };
  const send=async(text:string,isTwin:boolean,id?:string,openingId?:string)=>{
    if((!api&&!openingId)||sending.current||!live())return;
    if(isTwin&&twinSwitching.current)return;
    text=text.trim();if(!text||!isTwin&&!id)return;if(isTwin)moneyRestoreSerial.current++;
    const twinAccess=twinFirst||identity.knownTwinAccess?.()===true;
    if(isTwin&&!twinAccess){followLatest.current=true;const questions=[...twinAccessQuestions,{id:openingId??crypto.randomUUID(),question:text}].slice(-8);setTwinAccessQuestions(questions);identity.retainTwinAccessQuestions?.(questions);if(!openingId)setTwinDraft('');setNotice('');return;}
    if(!api)return;
    if(isTwin&&!twinFirst){setTwinFirst(true);setTwinAccessQuestions([]);identity.retainTwinAccessQuestions?.([]);}
    if(isTwin&&readiness?.status==='profile-required')return;
    if(isTwin&&pendingTwin?.moneyPaused&&text===(pendingTwin.moneyTask?.humanText??pendingTwin.message)){void recoverTwin();return;}
    if(isTwin&&pendingTwin&&!pendingTwin.moneyPaused){setNotice('Agent response is not confirmed. Check the previous request before asking again.');return;}
    if(!isTwin)peerTyping.current?.update(false);
    sending.current=true;followLatest.current=true;setBusy(true);setNotice('');setDeltas({});setTypingNames({});const pending=controller();
    let acknowledged=false;
    const outgoing=!isTwin&&id?{id:crypto.randomUUID(),body:text,createdAt:new Date().toISOString(),status:'sending' as const}:null;
    if(outgoing&&id){setPendingMessages(rows=>({...rows,[id]:outgoing}));setDrafts(rows=>({...rows,[id]:''}));}
    const clearOutgoing=()=>{if(!id||!outgoing)return;setPendingMessages(rows=>{if(rows[id]?.id!==outgoing.id)return rows;const next={...rows};delete next[id];return next;});};
    try{
      if(isTwin){
        const requestId=crypto.randomUUID(),receipts=businessContext.current.map(receipt=>({id:'setup:'+receipt.id,title:receipt.title,text:JSON.stringify({status:receipt.status,summary:receipt.summary,...(receipt.domain?{hostname:receipt.domain.hostname,warning:receipt.domain.warning}:{}),...(receipt.details?{nativeResultExcerpt:receipt.details.slice(0,1200)}:{})})})),records=openingId?[]:automaticTwinOwnerContext(text,twinContextRecords,receipts);
        const question:Omit<NativeTwinAsk,'signal'>={message:text,requestId,threadKey:selectedTwinKey,quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),...(identity.businessSetup?{businessSetup:true}:{}),...(identity.organizer?{organizerTools:true}:{}),...(identity.twinWorkspace?{worldTools:true}:{}),...(identity.receizTools?{receizTools:true}:{}),...(identity.moneyTools?{moneyTools:true}:{}),...(records.length?{context:{schema:'receiz.owner-twin.context.v1' as const,ownerUid:api.accountUid,disclosure:'owner-approved-for-this-request' as const,records:records.map(({id,title,text})=>({id,title,text}))}}:{})};
        setTwinStream('');setPendingTwin(question);if(!openingId)setTwinDraft('');
        const result=await askTwin(question,pending.signal);
        if(pending.signal.aborted||!live())return;
        if(acceptTwin(result.question,result.reply)){void saveMoneyCheckpoint(null,result.question.threadKey??`api:${api.accountUid}`).catch(()=>{});await applyBusinessActions(result.reply,result.question);}
      }else if(id){
        const accept=(message:ChatMessage)=>{
          if(message.senderKind==='user'&&message.senderUserId===api.accountUid)acknowledged=true;
          if(pending.signal.aborted||!live())return;
          if(acknowledged)clearOutgoing();
          if(selection.current===id)setPage(current=>{const held=api.knownMessages(id)??current;return held?{...held,messages:mergedMessages(held.messages,[message])}:held;});
          setInbox(api.knownConversations());
        };
        const sent=await api.send(id,text,{stream:true,signal:pending.signal,onMessage:accept,
          onAiStart:agent=>{if(!pending.signal.aborted&&live()&&selection.current===id){setTypingNames(rows=>({...rows,[agent.id]:agent.name}));setDeltas(rows=>({...rows,[agent.id]:''}));}},
          onDelta:(agentId,delta)=>{if(!pending.signal.aborted&&live()&&selection.current===id)setDeltas(rows=>({...rows,[agentId]:(rows[agentId]??'')+delta}));},
          onAiDone:agentId=>{if(!pending.signal.aborted&&live()&&selection.current===id)setDeltas(rows=>{const next={...rows};delete next[agentId];return next;});},
        });
        if(pending.signal.aborted||!live())return;
        if(!sent)throw new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN',true);
        acknowledged=true;clearOutgoing();
        if(selection.current===id)setPage(current=>{const held=api.knownMessages(id)??current;return held?{...held,messages:mergedMessages(held.messages,[sent])}:held;});
        setInbox(api.knownConversations());setDeltas({});
      }
    }catch(cause){
      if(outgoing&&id&&!acknowledged&&alive.current)setPendingMessages(rows=>rows[id]?.id===outgoing.id?{...rows,[id]:{...rows[id],status:cause instanceof MessagingError&&!cause.ambiguous?'refused':'unknown'}}:rows);
      if(!pending.signal.aborted&&live()){
        if(!isTwin&&id&&cause instanceof MessagingError&&cause.ambiguous){
          if(cause.acknowledgedMessageId){acknowledged=true;clearOutgoing();}
          setNotice(cause.acknowledgedMessageId?'Your message was received. The AI reply is incomplete; refresh to inspect it.':'Delivery is not confirmed. Check the conversation before sending again.');
          await Promise.all([refreshThread(id,pending.signal),refreshInbox(pending.signal)]);
        }else if(isTwin&&exhaustedCredits(cause)){setCreditsNeededFor(identity);if(!await pauseMoneyTask())setPendingTwin(null);setTwinDraft(current=>current||text);setNotice('Add credits to keep going. Your conversation and completed work are still here.');}else setNotice(isTwin?'Agent response is not confirmed. Check the previous request before asking again. '+errorText(cause):errorText(cause));
      }
    }finally{controllers.current.delete(pending);sending.current=false;if(alive.current){if(outgoing&&id&&!acknowledged){setDrafts(rows=>rows[id]?rows:{...rows,[id]:text});setPendingMessages(rows=>rows[id]?.id===outgoing.id&&rows[id].status==='sending'?{...rows,[id]:{...rows[id],status:'unknown'}}:rows);}setBusy(false);setBusinessWorking('');setDeltas({});setTypingNames({});}}
  };


  const submit=(event:FormEvent)=>{event.preventDefault();const isTwin=mode==='twin',id=selected?.id;void send(isTwin?twinDraft:id?drafts[id]??'':'',isTwin,id);};
  useEffect(()=>{
    if(!initialBusinessRequest||!active||!pageVisible||businessRequests.current.has(initialBusinessRequest.id))return;
    viewChosen.current=true;setMode('twin');
    if(sending.current||pendingTwin)return;
    if(!api&&(twinFirst||identity.knownTwinAccess?.()===true))return;
    businessRequests.current.add(initialBusinessRequest.id);
    const start=initialBusinessRequest.start??BUSINESS_FIRST_TASK;setBusinessStart(start);
    if((twinFirst||identity.knownTwinAccess?.()===true)&&api?.twin.readiness().status==='profile-required'){
      setTwinDraft(current=>current||start.question);
    }else{
      // This explicit click submits only the opening question, never account records.
      // Unpaid accounts reuse the local offer response without a metered AI request.
      void send(twinFirst||identity.knownTwinAccess?.()===true?start.question:BUSINESS_OPENING_MESSAGE,true,undefined,initialBusinessRequest.id);
      if(!twinFirst&&identity.knownTwinAccess?.()!==true){setUpgradeQuestion(BUSINESS_OPENING_MESSAGE);setBusinessReviewLanding(initialBusinessRequest.id);setUpgradeOpen(true);}
    }
    onBusinessConsumed?.(initialBusinessRequest.id);
  },[initialBusinessRequest,active,pageVisible,api,pendingTwin,twinFirst,busy,onBusinessConsumed]);

  const twinTitle=exchanges[0]?.question??pendingTwin?.moneyTask?.humanText??pendingTwin?.message??heldTwinThreads.current.get(selectedTwinKey)?.title??(selectedTwinKey===`api:${api?.accountUid}`?'Current conversation':'New conversation');
  const captureTwin=():TwinHeldThread=>({title:twinTitle.slice(0,100),draft:twinDraft,exchanges,pending:pendingTwin,moneyReceipts,moneyQuestions,businessReceipts,businessContext:businessContext.current,history:twinHistory,cursor:twinHistoryCursor,hasMore:twinHistoryMore,accessQuestions:twinAccessQuestions,files:selectedTwinFiles.current,start:businessStart,hydrated:!!(exchanges.length||pendingTwin||twinHistory.length||heldTwinThreads.current.get(selectedTwinKey)?.hydrated)});
  const localTwinThreads=()=>{
    heldTwinThreads.current.set(selectedTwinKey,captureTwin());
    return [...heldTwinThreads.current].filter(([key,value])=>api&&isOwnerTwinThreadKey(key,api.accountUid)&&(value.hydrated||!!value.draft.trim()||key!==`api:${api.accountUid}`)).map(([threadKey,value])=>({threadKey,title:value.title,preview:value.exchanges.at(-1)?.reply.message.slice(0,180)??value.pending?.message.slice(0,180)??'',updatedAt:value.exchanges.at(-1)?.reply.memory.at(-1)?.createdAt??new Date().toISOString()}));
  };
  const listTwinThreads=async(cursor?:string)=>{
    if(!api||!live())return;const epoch=twinThreadEpoch.current,local=localTwinThreads();setPastThreads(rows=>[...new Map([...rows,...local].map(row=>[row.threadKey,row])).values()]);
    let held:TwinConversation[]=[];const serial=moneyRestoreSerial.current;
    void (async()=>{const tools=await identity.moneyTools?.(),retained=await tools?.retainedThreads?.()??[];if(!live()||epoch!==twinThreadEpoch.current||serial!==moneyRestoreSerial.current)return;held=retained.map(row=>({...row,updatedAt:new Date().toISOString()}));if(held.length)setHasRemotePast(true);setPastThreads(rows=>[...new Map([...rows,...held,...local].map(row=>[row.threadKey,row])).values()]);})().catch(cause=>{if(live()&&epoch===twinThreadEpoch.current)setNotice('Some saved money tasks could not be read. Your held chat is preserved. '+errorText(cause));});
    if(!api.twin.conversations?.list)return;setPastBusy(true);
    try{const page=await api.twin.conversations.list(cursor);if(!live()||epoch!==twinThreadEpoch.current)return;if(page.threads.length)setHasRemotePast(true);setPastThreads(rows=>[...new Map([...rows,...page.threads,...held,...local].map(row=>[row.threadKey,row])).values()]);setPastCursor(page.nextCursor);setPastMore(page.hasMore);}
    catch(cause){if(live()&&epoch===twinThreadEpoch.current)setNotice('Past conversations are unavailable. Your current chat is preserved. '+errorText(cause));}
    finally{if(alive.current&&epoch===twinThreadEpoch.current)setPastBusy(false);}
  };
  useEffect(()=>{if(!active||!pageVisible||mode!=='twin'||!api||!agentEntitled||pastPrimed.current?.identity===identity&&pastPrimed.current.api===api)return;pastPrimed.current={identity,api};void listTwinThreads();},[active,pageVisible,mode,api,agentEntitled,identity]);
  const switchTwinThread=async(key:string)=>{
    if(!api||busy||sending.current||businessWorking||!isOwnerTwinThreadKey(key,api.accountUid))return;
    if(key===selectedTwinKey&&captureTwin().hydrated){setPastOpen(false);return;}
    const epoch=++twinThreadEpoch.current;heldTwinThreads.current.set(selectedTwinKey,captureTwin());twinSwitching.current=true;setThreadSwitching(true);setPastBusy(true);
    try{
      const tools=await identity.moneyTools?.();tools?.clearReviewDisplay?.();
      let held=heldTwinThreads.current.get(key);
      if(!held?.hydrated){
        const pending=held?.pending??await tools?.recoverQuestion?.(key)??null;
        const page=pending?{entries:[],nextCursor:null,hasMore:false}:await api.twin.conversations?.read(key);if(!page)throw Error('TWIN_CONVERSATION_UNAVAILABLE');
        held={title:pastThreads.find(row=>row.threadKey===key)?.title??held?.title??'Conversation',draft:held?.draft??'',exchanges:held?.exchanges??[],pending,moneyReceipts:{},moneyQuestions:{},businessReceipts:{},businessContext:[],history:page.entries,cursor:page.nextCursor,hasMore:page.hasMore,accessQuestions:held?.accessQuestions??[],files:held?.files??[],start:held?.start??null,hydrated:true};
      }
      if((selectedTwinFiles.current.length||held.files.length)&&identity.businessSetup){const setup=await identity.businessSetup();if(!live()||epoch!==twinThreadEpoch.current)return;setup.selectFiles(held.files);}
      if(!live()||epoch!==twinThreadEpoch.current)return;
      if(held.pending?.moneyTask){const task=held.pending.moneyTask;held={...held,moneyReceipts:{...held.moneyReceipts,[task.humanRequestId]:task.receipts},moneyQuestions:{...held.moneyQuestions,[task.humanRequestId]:task.humanText}};}
      heldTwinThreads.current.set(key,held);setTwinThreadKey(key);twinThreadRef.current=key;setTwinDraft(held.draft);setExchanges(held.exchanges);setPendingTwin(held.pending);moneyCheckpoint.current=held.pending;setMoneyReceipts(held.moneyReceipts);setMoneyQuestions(held.moneyQuestions);setBusinessReceipts(held.businessReceipts);businessContext.current=held.businessContext;setTwinHistory(held.history);setTwinHistoryCursor(held.cursor);setTwinHistoryMore(held.hasMore);setTwinStream('');selectedTwinFiles.current=held.files;setSelectedFileNames(held.files.map(file=>file.name));setTwinAccessQuestions(held.accessQuestions);setBusinessStart(held.start);setPastOpen(false);setNotice('');setBusinessWorking('');followLatest.current=true;
    }catch(cause){if(live()&&epoch===twinThreadEpoch.current)setNotice('This conversation could not be opened. Your current chat is preserved. '+errorText(cause));}
    finally{if(alive.current&&epoch===twinThreadEpoch.current){twinSwitching.current=false;setThreadSwitching(false);setPastBusy(false);}}
  };
  const newTwinThread=()=>{
    if(!api||busy||sending.current||businessWorking)return;
    const key=`api:${api.accountUid}:${crypto.randomUUID()}`;
    heldTwinThreads.current.set(key,{title:'New conversation',draft:'',exchanges:[],pending:null,moneyReceipts:{},moneyQuestions:{},businessReceipts:{},businessContext:[],history:[],cursor:null,hasMore:false,accessQuestions:[],files:[],start:null,hydrated:true});
    void switchTwinThread(key);
  };
  const earlierTwinMessages=async()=>{
    if(!api?.twin.conversations||pastBusy||!live())return;const key=selectedTwinKey,epoch=twinThreadEpoch.current;setPastBusy(true);
    try{const page=await api.twin.conversations.read(key,twinHistoryCursor??undefined);if(!live()||key!==twinThreadRef.current||epoch!==twinThreadEpoch.current)return;setTwinHistory(rows=>[...new Map([...page.entries,...rows].map(row=>[row.id,row])).values()]);setTwinHistoryCursor(page.nextCursor);setTwinHistoryMore(page.hasMore);}
    catch(cause){if(live()&&key===twinThreadRef.current)setNotice('Earlier messages are unavailable. Your held conversation is preserved. '+errorText(cause));}
    finally{if(alive.current&&key===twinThreadRef.current)setPastBusy(false);}
  };
  const accountUid=api?.accountUid??retained?.accountUid??'';
  const thread=page?.conversation??selected,title=mode==='twin'?'Your agent':mode==='new'?'New conversation':mode==='inbox'?'Messages':thread?.title||'Conversation';
  const memberById=useMemo(()=>new Map(thread?.members.map(person=>[person.userId,person])),[thread?.members]);
  const ownAvatar=memberById.get(accountUid)?.avatarUrl??identityProfileAvatar(identity);
  const draft=mode==='twin'?twinDraft:selected?drafts[selected.id]??'':'',readiness=api?.twin.readiness();
  const heldMindConversations=useMemo<readonly HeldMindConversation[]>(()=>!twinWorkspaceOpen?[]:[...Array.from(heldTwinThreads.current,([threadKey,row])=>({threadKey,entries:[...row.history,...row.exchanges.flatMap(exchange=>exchange.reply.memory)]})).filter(row=>row.threadKey!==selectedTwinKey),{threadKey:selectedTwinKey,entries:[...twinHistory,...exchanges.flatMap(row=>row.reply.memory)]}],[twinWorkspaceOpen,twinHistory,exchanges,selectedTwinKey]);
  const representedMemoryIds=new Set(exchanges.flatMap(exchange=>exchange.memoryIds));
  const twinMemory=[...new Map([...twinHistory,...(exchanges.at(-1)?.reply.memory??[])].map(row=>[row.persistedId??row.id,row])).values()].filter(row=>!memoryIdentity(row).some(id=>representedMemoryIds.has(id)));
  const setDraft=(value:string)=>{if(mode==='twin')setTwinDraft(value);else if(selected){setDrafts(rows=>({...rows,[selected.id]:value}));peerTyping.current?.update(!!value.trim());}};
  const peerNames=thread?.members.filter(person=>person.kind==='user'&&typingPeers.includes(person.userId)).map(personName)??[];
  const peerLabel=peerNames.slice(0,2).join(', ')+(peerNames.length>2?' and '+(peerNames.length-2)+' others':'');
  const preparePayment=()=>{if(!onPreparePayment)return;const peers=mode==='thread'&&thread?.kind==='dm'?thread.members.filter(person=>person.kind==='user'&&person.userId!==accountUid):[];const peer=peers.length===1?peers[0]:null;onPreparePayment(peer?.username&&/^[a-z0-9_]{3,24}$/.test(peer.username)?{userId:peer.userId,username:peer.username}:undefined);};
  const messageContact=(person:ChatPerson)=>{setOrganizerEntry(null);if(!api)return;const known=api.knownConversations().find(row=>row.kind==='dm'&&row.members.some(member=>member.kind==='user'&&member.userId===person.userId));if(known)pick(known);else{chooseView();setPicked([person]);setMode('new');void createConversation([person]);}};
  return <div className="bank-messages-host"><Sheet title={twinWorkspaceOpen&&mode==='twin'&&!organizerEntry?'Your Twin':organizerEntry?organizerEntry.view==='calendar'||organizerEntry.view==='appointment'?'Calendar':'Contacts':title} active={active} onClose={onClose}><section className="bank-messaging" aria-label="Your agent and messages">
    {consent==='needed'?<div className="bank-messaging-consent"><BankMark/><h3>Your conversations,<br/>through your ID.</h3><p>Use your existing Receiz messages, groups, calls and agent through this ID. Nothing sent until you send.</p><button className="primary-button" type="button" onClick={()=>void connect(true)}>Enable messages<ArrowUpRight size={17}/></button></div>:<>
      {(mode!=='call'&&mode!=='new'||organizerEntry)&&<nav className="bank-messaging-nav" aria-label="Conversation views">{(twinFirst?['twin','inbox'] as const:['inbox','twin'] as const).map(view=><button key={view} className={mode===view&&!organizerEntry?'active':''} type="button" onClick={()=>{setOrganizerEntry(null);chooseView();setUpgradeOpen(false);setMode(view);setNotice('');}}>{view==='twin'?'Your agent':'Messages'}</button>)}{identity.organizer&&<span className="bank-organizer-tools"><button type="button" aria-label="Calendar" onPointerDown={()=>{void preloadMessageOrganizer();}} aria-current={organizerEntry?.view==='calendar'} onClick={()=>openOrganizer('calendar')}><CalendarDays size={18}/></button><button type="button" aria-label="Contacts" onPointerDown={()=>{void preloadMessageOrganizer();}} aria-current={organizerEntry?.view==='contacts'} onClick={()=>openOrganizer('contacts')}><ContactRound size={18}/></button></span>}<NotificationsControl api={api}/>{mode==='inbox'&&<button className="bank-compose-new" aria-label="New conversation" type="button" onClick={()=>{setOrganizerEntry(null);chooseView();setMode('new');setNotice('');}}><SquarePen size={19}/></button>}</nav>}
      {lastOrganizerEntry&&OrganizerPanel&&<OrganizerPanel identity={identity} entry={lastOrganizerEntry} active={active&&!!organizerEntry} onBack={()=>setOrganizerEntry(null)} onMessage={messageContact}/> }
      <div className="bank-message-views" hidden={!!organizerEntry}>
      {mode==='twin'&&twinWorkspaceOpen&&<Suspense fallback={<div className="bank-twin-opening"><button type="button" onClick={()=>setTwinWorkspaceOpen(false)}><ChevronLeft size={15}/>Conversation</button><nav aria-label="Twin controls">{(['settings','mind','work','embed'] as const).map(tab=><button type="button" key={tab} aria-current={twinWorkspaceTab===tab?'page':undefined} onClick={()=>setTwinWorkspaceTab(tab)}>{tab==='embed'?'Add to website':tab[0].toUpperCase()+tab.slice(1)}</button>)}</nav><TwinWorkspaceOpening view={twinWorkspaceTab} active={active&&!organizerEntry}/></div>}><TwinWorkspacePanel key={identity.binding.artifactSha256} identity={identity} accountUid={api?.accountUid??accountUid??''} heldConversations={heldMindConversations} heldLedger={heldLedger} initialTab={twinWorkspaceTab} active={active&&!organizerEntry} onBack={()=>setTwinWorkspaceOpen(false)}/></Suspense>}
      {mode==='twin'&&<div className="bank-twin-content" hidden={twinWorkspaceOpen}>{(creditsOpen===identity?<Suspense fallback={null}><TwinCreditsPanel identity={identity} onBack={()=>setCreditsOpen(null)} onFunded={creditsFunded}/></Suspense>:!upgradeOpen||twinFirst?<><TwinConversations hasPast={hasPastConversations} title={twinTitle} open={pastOpen} busy={pastBusy} disabled={busy||!!businessWorking||!api} threads={pastThreads} selected={selectedTwinKey} hasMore={pastMore} onNew={newTwinThread} onToggle={()=>{if(!hasPastConversations)return;const local=localTwinThreads();setPastThreads(rows=>[...new Map([...rows,...local].map(row=>[row.threadKey,row])).values()]);setPastOpen(value=>!value);}} onSelect={key=>void switchTwinThread(key)} onMore={()=>void listTwinThreads(pastCursor??undefined)}/><div className="bank-conversation-scroll" ref={scrollArea} onScroll={trackScroll}>{!exchanges.length&&!pendingTwin&&!twinAccessQuestions.length&&!twinHistory.length?<div className="bank-twin-welcome"><div className="bank-twin-mark"><BankMark/></div>{businessStart?<><h3>{businessStart.title}</h3><p>{businessStart.hint} Keep the background together and work toward a result you can review and use.</p></>:<><h3>Your money.<br/>Your history.<br/>Help with what’s next.</h3><p>Understand a payment, bring a memory into context, or prepare your next move. Continue the conversation with the history you choose to share.</p></>}<div className="bank-twin-suggestions">{['Explain my last payment','What’s owed and due?','Prepare a payment'].map(text=><button key={text} type="button" onClick={()=>setTwinDraft(text)}>{text}<ArrowUpRight size={16}/></button>)}</div></div>:<div className="bank-thread-messages">{(!!twinMemory.length||twinHistoryMore||!!pendingTwin&&!!api?.twin.conversations)&&<section className="bank-twin-memory" aria-label="Earlier conversation"><p className="bank-message-date">Earlier conversation</p>{(twinHistoryMore||!twinHistory.length)&&api?.twin.conversations&&<button type="button" className="bank-twin-history-more" disabled={pastBusy} onClick={()=>void earlierTwinMessages()}>Earlier messages</button>}{twinMemory.map(row=><div key={row.persistedId||row.transportId||row.id} className={row.role==='user'?'bank-message-own':'bank-message-other'}><span className="bank-message-sender">{row.role==='user'?'You':'Your agent'} · {row.scope} memory</span><p>{row.body}</p></div>)}</section>}{twinAccessQuestions.map(row=><div className="bank-twin-exchange" key={row.id}><div className="bank-message-own">{row.question}</div><TwinAccessReply business={row.question===BUSINESS_OPENING_MESSAGE} onUpgrade={()=>{setUpgradeQuestion(row.question);setUpgradeOpen(true);}}/></div>)}{exchanges.map(exchange=><div className="bank-twin-exchange" key={exchange.id}><div className="bank-message-own">{exchange.question}</div><div className="bank-twin-reply"><span className="bank-twin-reply-identity">{ownAvatar&&<ProfileAvatar src={ownAvatar} name="Your agent" eager/>}Your agent · Generated interpretation{exchange.reply.source!=='upstream'?' · '+exchange.reply.source:''}</span><p>{exchange.reply.message}</p>{moneyReceipts[exchange.id]?.length?<Suspense fallback={null}><MoneyReceipts receipts={moneyReceipts[exchange.id]} onDownload={digest=>void downloadMoneySource(digest)} onReviewShown={reviewId=>{if(live())void identity.moneyTools?.().then(tools=>tools.markReviewDisplayed(reviewId,exchange.id));}}/></Suspense>:null}{businessReceipts[exchange.id]?.length&&BusinessReceipts?<BusinessReceipts receipts={businessReceipts[exchange.id]} onConnect={href=>connectBusinessProvider(exchange.id,href)} onReceizAction={(id,action)=>void resolveReceizAction(exchange.id,id,action)}/>:null}{!!exchange.reply.sharedContext.length&&<p className="bank-twin-context-used">Shared for this request: {exchange.reply.sharedContext.map(record=>record.title).join(', ')}</p>}{exchange.reply.actionHandoffs.map((action,index)=><div className="bank-twin-proposal" key={index}><small>Proposal · review before acting</small><button type="button" onClick={()=>setProposal(proposal===action.href?null:action.href)}>{action.label}<ArrowUpRight size={15}/></button>{proposal===action.href&&<div><p>This suggestion has not been executed.</p><a href={action.href} target="_blank" rel="noopener noreferrer">Review in Receiz</a>{onPreparePayment&&['pay','deposit'].includes(action.kind)&&<button type="button" onClick={()=>onPreparePayment?.()}>Prepare a payment in Bank</button>}</div>}</div>)}</div></div>)}</div>}{Object.entries(moneyReceipts).filter(([rootId])=>!exchanges.some(row=>row.id===rootId)).map(([rootId,receipts])=><div className="bank-twin-exchange" key={rootId}><div className="bank-message-own">{moneyQuestions[rootId]}</div><Suspense fallback={null}><MoneyReceipts receipts={receipts} onDownload={digest=>void downloadMoneySource(digest)} onReviewShown={reviewId=>{if(live())void identity.moneyTools?.().then(tools=>tools.markReviewDisplayed(reviewId,rootId));}}/></Suspense></div>)}{pendingTwin&&!moneyReceipts[pendingTwin.moneyTask?.humanRequestId??pendingTwin.requestId]?.length&&!exchanges.some(row=>row.id===pendingTwin.requestId)&&<div className="bank-thread-messages bank-twin-pending"><div className="bank-message-own"><p>{pendingTwin.message}</p><small className="bank-delivery-status">{busy?'Sending':'Awaiting confirmation'}</small></div>{busy&&!businessWorking&&<TypingBubble name="Your agent" text={twinStream} avatarUrl={ownAvatar}/>}</div>}{businessWorking&&<div className="bank-agent-working"><TypingBubble name="Your agent" text="" activity="working" status={businessWorking} avatarUrl={ownAvatar}/></div>}</div>
        {twinFirst&&readiness?.status==='profile-required'&&<p className="bank-messaging-notice" role="status">Your agent needs a public username before you can ask it.</p>}
        {twinFirst&&<div className="bank-business-attachment-row">{identity.businessSetup&&<label className="bank-business-attach"><Paperclip size={14}/><span>{selectedFileNames.length?selectedFileNames.join(', '):'Attach work or an image'}</span><input type="file" multiple disabled={busy} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);selectedTwinFiles.current=files;void identity.businessSetup!().then(setup=>{if(live()){setup.selectFiles(files);setSelectedFileNames(files.map(file=>file.name));}}).catch(cause=>{if(live())setNotice(errorText(cause));});}}/></label>}{identity.twinWorkspace&&<button type="button" className="bank-twin-settings-button" aria-label="Your Twin settings and mind" onPointerDown={()=>void loadTwinWorkspaceCode()} onFocus={()=>void loadTwinWorkspaceCode()} onClick={()=>{setTwinWorkspaceTab('settings');setTwinWorkspaceOpen(true);}}><Brain size={18}/></button>}</div>}
        <MessageComposer draft={draft} setDraft={setDraft} submit={submit} placeholder="Ask your agent…" onSendMoney={onPreparePayment?preparePayment:undefined} busy={busy} connected={!!api} disabled={threadSwitching||twinFirst&&readiness?.status==='profile-required'||!!pendingTwin&&!pendingTwin.moneyPaused} maxLength={1200}/>
        {identity.upgradeTwin&&creditsNeededFor===identity&&<div className="bank-chat-credits"><button type="button" onClick={()=>setCreditsOpen(identity)}>Add credits<ArrowUpRight size={12}/></button></div>}
        {pendingTwin&&!busy&&<div className="bank-twin-recovery"><p role="status">{pendingTwin.moneyPaused?'Your money task is saved. Add credits, then continue.':'The previous agent response is not confirmed.'}</p><button type="button" disabled={threadSwitching} onClick={()=>void recoverTwin()}>{pendingTwin.moneyPaused?'Resume money task':'Check previous agent request'}</button><button type="button" disabled={threadSwitching} onClick={()=>{setPendingTwin(null);void saveMoneyCheckpoint(null).catch(()=>{});setNotice('The previous question may have been received. A new question is a separate request.');}}>Write a new question</button></div>}<p className="bank-messaging-caption">Business plan and usage credits required. Questions and replies may remain in your existing conversation memory.</p>
      </>:<Suspense fallback={null}><TwinUpgradePanel identity={identity} initialReview firstTask={upgradeQuestion===BUSINESS_OPENING_MESSAGE?businessStart??undefined:undefined} paymentLandingId={businessReviewLanding} onBack={()=>{setBusinessReviewLanding(undefined);setUpgradeOpen(false);setTwinDraft(current=>current||(upgradeQuestion===BUSINESS_OPENING_MESSAGE?businessStart?.question??BUSINESS_FIRST_TASK.question:upgradeQuestion)||twinAccessQuestions.at(-1)?.question||'');}} onUpgraded={()=>{setTwinFirst(true);setUpgradeOpen(false);setTwinDraft(current=>current||(upgradeQuestion===BUSINESS_OPENING_MESSAGE?businessStart?.question??BUSINESS_FIRST_TASK.question:upgradeQuestion)||twinAccessQuestions.at(-1)?.question||'');setTwinAccessQuestions([]);identity.retainTwinAccessQuestions?.([]);setNotice('Business is active. Ask your agent when you are ready.');}}/></Suspense>)}</div>}
      {mode==='inbox'&&<div className="bank-inbox"><label className="bank-message-search"><Search size={17}/><input aria-label="Search messages" placeholder="Search messages" value={inboxQuery} onChange={event=>setInboxQuery(event.target.value)}/></label>{inbox.filter(row=>(row.title+' '+row.members.map(personName).join(' ')).toLowerCase().includes(inboxQuery.toLowerCase())).map(row=><button type="button" key={row.id} className="bank-thread-row" aria-label={'Open conversation '+row.title} onClick={()=>pick(row)}><ConversationAvatar row={row} owner={accountUid}/><span className="bank-thread-summary"><strong>{row.title}</strong><span>{row.previewMessage?.body||'No messages yet'}</span></span><span className="bank-thread-time">{timeLabel(row.lastMessageAt)}{row.unreadCount>0&&<i aria-label={row.unreadCount+' unread messages'}/>}</span></button>)}{!inbox.length&&<p className="bank-empty-message">Your existing conversations appear here. Start one with a Receiz username.</p>}</div>}
      {mode==='new'&&<div className="bank-new-thread"><button type="button" className="bank-messaging-back" onClick={()=>{chooseView();setMode('inbox');}}><ChevronLeft size={17}/>Messages</button><p>Who would you like to talk to?</p><label className="bank-message-search"><Search size={17}/><input aria-label="Find a person by name or username" placeholder="Name or username" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" maxLength={40}/></label>{!!picked.length&&<div className="bank-picked-people">{picked.map(person=><button key={person.userId} type="button" onClick={()=>setPicked(rows=>rows.filter(row=>row.userId!==person.userId))}>Remove {personName(person)} ×</button>)}</div>}{picked.length>1&&<input className="bank-group-name" aria-label="Group name" placeholder="Group name (optional)" value={groupName} maxLength={120} onChange={event=>setGroupName(event.target.value)}/>}
        {!peopleSearchQuery(query)&&suggestedPeople.length>0&&<span className="bank-recent-caption">Recent contacts</span>}{suggestedPeople.map(person=><button className="bank-pick-person" type="button" aria-label={'Select '+personName(person)} key={person.userId} onClick={()=>setPicked(rows=>rows.some(row=>row.userId===person.userId)?rows.filter(row=>row.userId!==person.userId):[...rows,person])}><ProfileAvatar src={person.avatarUrl} name={personName(person)}/><span><strong>{personName(person)}</strong><small>@{person.username}</small></span><span className={'bank-person-check'+(picked.some(row=>row.userId===person.userId)?' selected':'')}>{picked.some(row=>row.userId===person.userId)&&<Check size={15}/>}</span></button>)}
        <p className="bank-new-hint" role="status">{searching?'Finding matching profiles…':!peopleSearchQuery(query)?'Search a name or username. Choose one person, or add more for a group.':!suggestedPeople.length?'No matching profiles found.':'Choose one person, or add more for a group.'}</p><button className="primary-button" type="button" disabled={!api||!picked.length||busy} onClick={()=>void createConversation()}>{<>Start conversation{busy&&<InlineOpening compact label="Preparing conversation"/>}</>}<ArrowUpRight size={17}/></button>
      </div>}
      {mode==='thread'&&selected&&<><div className="bank-thread-toolbar"><button type="button" onClick={()=>{chooseView();setMode('inbox');}} aria-label="Back to messages"><ChevronLeft size={18}/>Messages</button>{thread&&<ChatProfiles key={thread.id} thread={thread} owner={accountUid} active={active} onContact={identity.organizer?person=>openOrganizer('person',person):undefined}/>}{identity.organizer&&thread?.kind==='dm'&&<button type="button" aria-label="Schedule appointment" onClick={()=>{const person=thread.members.find(p=>p.kind==='user'&&p.userId!==accountUid);if(person)openOrganizer('appointment',person);}}><CalendarDays size={17}/></button>}<button type="button" aria-label="Voice call" disabled={!api} onClick={()=>openCall(false)}><Phone size={18}/></button><button type="button" aria-label="Video call" disabled={!api} onClick={()=>openCall(true)}><Video size={19}/></button></div>{activeCall&&<button type="button" className="bank-active-call" onClick={()=>openCall(activeCall.mode==='video')}>Call in progress · Open to join<Phone size={14}/></button>}<div className="bank-conversation-scroll bank-thread-messages" ref={scrollArea} onScroll={trackScroll}>{page?.hasMore&&<button type="button" className="bank-load-earlier" disabled={!api||olderBusy} onClick={()=>void loadOlder()}>{<>Load earlier messages{olderBusy&&<InlineOpening compact label="Preparing earlier messages"/>}</>}</button>}{page?.messages.map(message=><div key={message.id} className={message.senderUserId===accountUid?'bank-message-own':'bank-message-other'}>{message.senderUserId!==accountUid&&<ReplyIdentity name={message.senderDisplay||message.senderAiId||'Participant'} person={chatReplyPerson(message.senderUserId,message.senderAiId,thread?.members??[])}/>}<PaymentMessage message={message} accountUid={accountUid} members={thread?.members??[]}/><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div>)}{selected&&pendingMessages[selected.id]&&<div className="bank-message-own bank-message-pending"><p>{pendingMessages[selected.id].body}</p><small className="bank-delivery-status">{pendingMessages[selected.id].status==='sending'?'Sending':pendingMessages[selected.id].status==='refused'?'Not sent':'Delivery not confirmed'}</small></div>}{!!peerNames.length&&<TypingBubble name={peerLabel} text="" activity="typing" person={typingPeers.length===1?memberById.get(typingPeers[0]):null}/>}{Object.entries(deltas).map(([id,text])=><TypingBubble key={id} name={typingNames[id]||'Agent'} text={text} person={chatReplyPerson('',id,thread?.members??[])}/>)}</div><MessageComposer focusRequest={active?initialRecipient?.id:undefined} draft={draft} setDraft={setDraft} submit={submit} placeholder="Message…" onSendMoney={onPreparePayment?preparePayment:undefined} busy={busy} connected={!!api} onBlur={()=>peerTyping.current?.update(false)} maxLength={16384}/><p className="bank-messaging-caption">Messages stay in your existing Receiz conversation.</p></>}
      <div ref={callHost} className="bank-call-inline-host" hidden={mode!=='call'}/>
      {(readError||notice)&&<div className="bank-messaging-feedback"><p className="bank-messaging-error" role="alert">{notice||readError}</p>{!api?<button type="button" onClick={()=>void connect(false)}>Reconnect</button>:mode==='thread'&&<button type="button" onClick={refreshNow}>Refresh conversation</button>}</div>}
      </div>
    </>}
  </section></Sheet>{heldCall&&api&&<CallPortal inlineHost={callHost} expanded={active&&mode==='call'}><Suspense fallback={null}><CallPanel identity={api.callTransport} conversationId={heldCall.conversationId} conversationTitle={heldCall.title} userId={api.accountUid} initialVideo={heldCall.video} initialCallId={heldCall.callId} minimized={!active||mode!=='call'} onLiveChange={onCallLiveChange} onMinimize={()=>setMode(selected?'thread':'inbox')} onRestore={()=>{chooseView();setMode('call');if(!active)onOpen?.();}} onClose={()=>{setHeldCall(null);setCallLive(false);setMode(selected?'thread':'inbox');}}/></Suspense></CallPortal>}</div>;
}
export function MessageComposer({draft,setDraft,submit,placeholder,busy,disabled,connected=true,maxLength,onSendMoney,onBlur,focusRequest}:{focusRequest?:number;onBlur?:()=>void;connected?:boolean;onSendMoney?:()=>void;draft:string;setDraft(value:string):void;submit(event:FormEvent):void;placeholder:string;busy:boolean;disabled?:boolean;maxLength:number}){
  const field=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(focusRequest!==undefined)field.current?.focus({preventScroll:true});},[focusRequest]);
  return <form className="bank-message-composer" onSubmit={submit}>{onSendMoney&&<button type="button" className="bank-message-payment" aria-label="Send money" title="Send money" disabled={busy} onClick={onSendMoney}><DollarSign size={17} strokeWidth={1.7}/></button>}<input ref={field} aria-label={placeholder} placeholder={placeholder} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={maxLength} disabled={disabled} onBlur={onBlur}/><button type="submit" disabled={!connected||disabled||busy||!draft.trim()} aria-label={placeholder==='Message…'?'Send message':'Ask your agent'}><ArrowUp size={19}/></button></form>;
}

export function TypingBubble({name,text,activity='responding',person,avatarUrl,status}:{name:string;text:string;activity?:'typing'|'responding'|'working';status?:string;person?:ChatPerson|null;avatarUrl?:string|null}){
  return <div className="bank-message-other bank-message-stream" aria-label={name+(activity==='typing'?' is typing':activity==='working'?' is working':' is responding')}><ReplyIdentity name={name} person={person} avatarUrl={avatarUrl}/>{text?<p>{text}<span className="bank-stream-cursor" aria-hidden="true"/></p>:<span className="bank-typing-dots" aria-hidden="true"><i/><i/><i/></span>}{status&&<small className="bank-agent-work-status" role="status">{status}</small>}</div>;
}
