import {conversationPeople,peopleSearchQuery,peopleSuggestions} from '../../receiz/people-search';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import type {PeerTypingController} from '../../receiz/peer-typing';
import {PaymentMessage} from './PaymentMessage';
import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {ArrowUp,ArrowUpRight,Check,ChevronLeft,DollarSign,Paperclip,Phone,Search,SquarePen,Video} from 'lucide-react';
import {BankMark} from '../../components/BankMark';
import {Sheet} from '../../components/Sheet';
import {CallPortal} from './CallPortal';
import type {OpenIdentity} from '../../receiz/native-identity';
import {MessagingError,type ChatConversation,type ChatMessage,type ChatPage,type ChatPerson,type NativeMessaging} from '../../receiz/native-messaging';
import type {NativeTwinAsk,NativeTwinMemory,NativeTwinReply} from '../../receiz/native-twin';
const TwinUpgradePanel=lazy(()=>import('./TwinUpgradePanel').then(module=>({default:module.TwinUpgradePanel})));
const CallPanel=lazy(()=>import('./CallPanel').then(module=>({default:module.CallPanel})));
import './messages.css';

export interface MessagesPanelProps {
  identity:OpenIdentity;active:boolean;onClose():void;onOpen?():void;onPreparePayment?:(recipient?:{userId:string;username:string})=>void;
  twinContextRecords?:ReadonlyArray<{id:string;title:string;text:string}>;
}
type Mode='twin'|'inbox'|'thread'|'new'|'call';
type TwinExchange={id:string;question:string;reply:NativeTwinReply;memoryIds:string[]};
type PendingChatMessage={id:string;body:string;createdAt:string;status:'sending'|'unknown'|'refused'};
type ActiveCall={id:string;mode:'voice'|'video'};
type HeldCall={conversationId:string;title:string;video:boolean;callId?:string};
function TwinAccessReply({onUpgrade}:{onUpgrade():void}){
  return <div className="bank-twin-reply bank-twin-access-reply"><span>Assistant access</span><p>Make sense of your money. Make your next move with clarity.</p><ul><li><strong>Understand payments.</strong> Turn chosen transaction records and funding history into clear answers.</li><li><strong>Put memories in context.</strong> Connect chosen memories and records to the question in front of you.</li><li><strong>Prepare what comes next.</strong> Review payment proposals and useful next steps while keeping control.</li></ul><p>Keep your existing ID, messages and conversation history. Your assistant works with the memories and records you choose to bring into the conversation.</p><button type="button" onClick={onUpgrade}>Unlock your assistant<ArrowUpRight size={16}/></button></div>;
}
function ConversationAvatar({row,owner}:{row:ChatConversation;owner:string}){
 const peers=row.members.filter(person=>person.kind==='user'&&person.userId!==owner).slice(0,2);
 return <span className={'bank-conversation-avatar'+(row.kind==='group'&&peers.length>1?' group':'')} aria-hidden="true">{peers.length?peers.slice(0,row.kind==='group'?2:1).map(person=><ProfileAvatar key={person.userId} src={person.avatarUrl} name={personName(person)}/>):<ProfileAvatar name={row.title}/>}</span>;
}
function personName(person:ChatPerson){return person.displayName||person.username||'Receiz account';}
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
function MessagesSession({identity,active,onClose,onOpen,onPreparePayment,twinContextRecords=[]}:MessagesPanelProps){
  const [retained]=useState(()=>identity.knownMessagingDisplay?.()??null);
  const [api,setApi]=useState<NativeMessaging|null>(null),[consent,setConsent]=useState<'checking'|'needed'|'ready'|'error'>('checking');
  const [twinFirst,setTwinFirst]=useState(()=>identity.knownTwinAccess?.()===true),viewChosen=useRef(false);
  const [upgradeOpen,setUpgradeOpen]=useState(false),[upgradeQuestion,setUpgradeQuestion]=useState<string|null>(null),[twinAccessQuestions,setTwinAccessQuestions]=useState<Array<{id:string;question:string}>>(()=>twinFirst?[]:retained?.twinAccessQuestions??[]);
  const [mode,setMode]=useState<Mode>(()=>twinFirst?'twin':'inbox'),[inbox,setInbox]=useState<ChatConversation[]>(()=>retained?.inbox??[]),[selected,setSelected]=useState<ChatConversation|null>(null),[page,setPage]=useState<ChatPage|null>(null);
  const [readError,setReadError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[olderBusy,setOlderBusy]=useState(false);
  const [drafts,setDrafts]=useState<Record<string,string>>({}),[twinDraft,setTwinDraft]=useState(''),[exchanges,setExchanges]=useState<TwinExchange[]>([]),[deltas,setDeltas]=useState<Record<string,string>>({});
  const [pendingMessages,setPendingMessages]=useState<Record<string,PendingChatMessage>>({}),[typingNames,setTypingNames]=useState<Record<string,string>>({});
  const [typingPeers,setTypingPeers]=useState<string[]>([]);const peerTyping=useRef<PeerTypingController|null>(null);
  const scrollArea=useRef<HTMLDivElement>(null),followLatest=useRef(true);
  const [inboxQuery,setInboxQuery]=useState(''),[query,setQuery]=useState(''),[people,setPeople]=useState<ChatPerson[]>([]),[picked,setPicked]=useState<ChatPerson[]>([]),[groupName,setGroupName]=useState(''),[searching,setSearching]=useState(false);
  const [activeCall,setActiveCall]=useState<ActiveCall|null>(null),[heldCall,setHeldCall]=useState<HeldCall|null>(null),[callLive,setCallLive]=useState(false),callHost=useRef<HTMLDivElement>(null);
  const [contextIds,setContextIds]=useState<string[]>([]),[proposal,setProposal]=useState<string|null>(null);
  const [pendingTwin,setPendingTwin]=useState<Omit<NativeTwinAsk,'signal'>|null>(null);
  const [pageVisible,setPageVisible]=useState(()=>document.visibilityState!=='hidden');
  useEffect(()=>{if(!active&&!callLive){setHeldCall(null);setMode(current=>current==='call'?'thread':current);}},[active,callLive]);
  const openCall=(video:boolean)=>{if(!selected)return;if(!callLive)setHeldCall({conversationId:selected.id,title:page?.conversation.title||selected.title,video,callId:activeCall?.id});setMode('call');};
  const contacts=useMemo(()=>api?conversationPeople(inbox,api.accountUid):[],[inbox,api]);
  const suggestedPeople=useMemo(()=>api?peopleSuggestions(contacts,people,query,api.accountUid):[],[contacts,people,query,api]);
  const alive=useRef(true),activeRef=useRef(active),selection=useRef<string|null>(null),connection=useRef(0),sending=useRef(false);
  const controllers=useRef(new Set<AbortController>()),reads=useRef(new Map<string,Promise<void>>());
  activeRef.current=active;selection.current=selected?.id??null;
  const live=useCallback(()=>alive.current&&activeRef.current&&document.visibilityState!=='hidden',[]);
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
  useEffect(()=>{if(followLatest.current&&scrollArea.current)scrollArea.current.scrollTop=scrollArea.current.scrollHeight;},[mode,selected?.id,page?.messages,deltas,pendingMessages,pendingTwin,exchanges,typingPeers,twinAccessQuestions]);
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
      if(retained&&retained.accountUid!==next.accountUid){setSelected(null);setPage(null);setUpgradeOpen(false);setTwinAccessQuestions([]);setTwinDraft('');setMode(first?'twin':'inbox');}
      setApi(next);setInbox(next.knownConversations());setConsent('ready');
    }catch(cause){
      if(!live()||attempt!==connection.current)return;
      if(cause instanceof Error&&cause.message==='MESSAGING_CONSENT_REQUIRED')setConsent('needed');
      else{setReadError(errorText(cause));setConsent('error');}
    }
  },[identity,live,retained]);
  useEffect(()=>{if(active&&pageVisible&&!api)void connect(false);return()=>{connection.current++;};},[active,pageVisible,api,connect]);

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
    const response=await api.callTransport.heldFetch('/api/chat/conversations/'+encodeURIComponent(id)+'/calls',{signal,cache:'no-store'});
    const data=await response.json() as {ok?:boolean;error?:string;activeCall?:{id?:string;conversationId?:string;status?:string;mode?:string}|null};
    if(!response.ok||data.ok!==true)throw Error(data.error||'Call status unavailable');
    const call=data.activeCall;
    return call?.status==='active'&&call.conversationId===id&&typeof call.id==='string'&&['voice','video'].includes(String(call.mode))?{id:call.id,mode:call.mode as 'voice'|'video'}:null;
  },next=>{if(selection.current===id)setActiveCall(next);}):Promise.resolve(),[api,read]);
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
    const refresh=()=>{void refreshThread(selected.id,pending.signal);void refreshCalls(selected.id,pending.signal);};
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

  const pick=(conversation:ChatConversation)=>{viewChosen.current=true;selection.current=conversation.id;setSelected(conversation);setPage(api?.knownMessages(conversation.id)??retained?.pages.find(row=>row.conversation.id===conversation.id)??null);setActiveCall(null);setMode('thread');setNotice('');setDeltas({});setTypingNames({});};
  const refreshNow=()=>{if(!api||!selected)return;const pending=controller();void Promise.all([refreshThread(selected.id,pending.signal),refreshInbox(pending.signal)]).finally(()=>controllers.current.delete(pending));};
  const loadOlder=async()=>{if(!page?.nextCursor||!selected||olderBusy)return;const pending=controller();setOlderBusy(true);await refreshThread(selected.id,pending.signal,page.nextCursor);controllers.current.delete(pending);if(alive.current)setOlderBusy(false);};
  const createConversation=async()=>{
    if(!api||!picked.length||sending.current||!live())return;
    sending.current=true;setBusy(true);setNotice('');
    try{
      const id=await api.createConversation({participantUserIds:picked.map(person=>person.userId),...(picked.length>1&&groupName.trim()?{title:groupName.trim()}: {})});
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
    finally{sending.current=false;if(alive.current)setBusy(false);}
  };
  const acceptTwin=(question:Omit<NativeTwinAsk,'signal'>,reply:NativeTwinReply)=>{
    const exchange: TwinExchange={id:question.requestId,question:question.message,reply,memoryIds:currentTwinMemoryIds(question.message,reply)};
    setExchanges(rows=>rows.some(row=>row.id===question.requestId)?rows.map(row=>row.id===question.requestId?exchange:row):[...rows,exchange]);
    setTwinDraft(current=>current.trim()===question.message?'':current);setContextIds([]);setPendingTwin(null);
  };
  const recoverTwin=async()=>{
    if(!api||!pendingTwin||sending.current||!live())return;
    sending.current=true;setBusy(true);setNotice('');const pending=controller();
    try{
      const reply=await api.twin.ask({...pendingTwin,signal:pending.signal});
      if(!pending.signal.aborted&&live())acceptTwin(pendingTwin,reply);
    }catch(cause){if(!pending.signal.aborted&&live())setNotice('Assistant response is not confirmed. '+errorText(cause));}
    finally{controllers.current.delete(pending);sending.current=false;if(alive.current)setBusy(false);}
  };
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(!api||sending.current||!live())return;
    const isTwin=mode==='twin',id=selected?.id,text=(isTwin?twinDraft:id?drafts[id]??'':'').trim();if(!text||!isTwin&&!id)return;
    const twinAccess=twinFirst||identity.knownTwinAccess?.()===true;
    if(isTwin&&!twinAccess){followLatest.current=true;const questions=[...twinAccessQuestions,{id:crypto.randomUUID(),question:text}].slice(-8);setTwinAccessQuestions(questions);identity.retainTwinAccessQuestions?.(questions);setTwinDraft('');setNotice('');return;}
    if(isTwin&&!twinFirst){setTwinFirst(true);setTwinAccessQuestions([]);identity.retainTwinAccessQuestions?.([]);}
    if(isTwin&&readiness?.status==='profile-required')return;
    if(isTwin&&pendingTwin){setNotice('Assistant response is not confirmed. Check the previous request before asking again.');return;}
    if(!isTwin)peerTyping.current?.update(false);
    sending.current=true;followLatest.current=true;setBusy(true);setNotice('');setDeltas({});setTypingNames({});const pending=controller();
    let acknowledged=false;
    const outgoing=!isTwin&&id?{id:crypto.randomUUID(),body:text,createdAt:new Date().toISOString(),status:'sending' as const}:null;
    if(outgoing&&id){setPendingMessages(rows=>({...rows,[id]:outgoing}));setDrafts(rows=>({...rows,[id]:''}));}
    const clearOutgoing=()=>{if(!id||!outgoing)return;setPendingMessages(rows=>{if(rows[id]?.id!==outgoing.id)return rows;const next={...rows};delete next[id];return next;});};
    try{
      if(isTwin){
        const requestId=crypto.randomUUID(),records=twinContextRecords.slice(0,12).filter(record=>contextIds.includes(record.id));
        const question:Omit<NativeTwinAsk,'signal'>={message:text,requestId,quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),...(records.length?{context:{schema:'receiz.owner-twin.context.v1' as const,ownerUid:api.accountUid,disclosure:'owner-approved-for-this-request' as const,records:records.map(({id,title,text})=>({id,title,text}))}}:{})};
        setPendingTwin(question);setTwinDraft('');
        const reply=await api.twin.ask({...question,signal:pending.signal});
        if(pending.signal.aborted||!live())return;
        acceptTwin(question,reply);
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
        }else setNotice(isTwin?'Assistant response is not confirmed. Check the previous request before asking again. '+errorText(cause):errorText(cause));
      }
    }finally{controllers.current.delete(pending);sending.current=false;if(alive.current){if(outgoing&&id&&!acknowledged){setDrafts(rows=>rows[id]?rows:{...rows,[id]:text});setPendingMessages(rows=>rows[id]?.id===outgoing.id&&rows[id].status==='sending'?{...rows,[id]:{...rows[id],status:'unknown'}}:rows);}setBusy(false);setDeltas({});setTypingNames({});}}
  };

  const availableContext=twinContextRecords.slice(0,12),contextSize=availableContext.filter(record=>contextIds.includes(record.id)).reduce((size,record)=>size+record.id.length+record.title.length+record.text.length,0);
  const accountUid=api?.accountUid??retained?.accountUid??'';
  const thread=page?.conversation??selected,title=mode==='twin'?'Your assistant':mode==='new'?'New conversation':mode==='inbox'?'Messages':thread?.title||'Conversation';
  const memberById=useMemo(()=>new Map(thread?.members.map(person=>[person.userId,person])),[thread?.members]);
  const draft=mode==='twin'?twinDraft:selected?drafts[selected.id]??'':'',readiness=api?.twin.readiness();
  const representedMemoryIds=new Set(exchanges.flatMap(exchange=>exchange.memoryIds));
  const twinMemory=(exchanges.at(-1)?.reply.memory??[]).filter(row=>!memoryIdentity(row).some(id=>representedMemoryIds.has(id)));
  const setDraft=(value:string)=>{if(mode==='twin')setTwinDraft(value);else if(selected){setDrafts(rows=>({...rows,[selected.id]:value}));peerTyping.current?.update(!!value.trim());}};
  const peerNames=thread?.members.filter(person=>person.kind==='user'&&typingPeers.includes(person.userId)).map(personName)??[];
  const peerLabel=peerNames.slice(0,2).join(', ')+(peerNames.length>2?' and '+(peerNames.length-2)+' others':'');
  const preparePayment=()=>{if(!onPreparePayment)return;const peers=mode==='thread'&&thread?.kind==='dm'?thread.members.filter(person=>person.kind==='user'&&person.userId!==accountUid):[];const peer=peers.length===1?peers[0]:null;onPreparePayment(peer?.username&&/^[a-z0-9_]{3,24}$/.test(peer.username)?{userId:peer.userId,username:peer.username}:undefined);};
  return <div className="bank-messages-host"><Sheet title={title} active={active} onClose={onClose}><section className="bank-messaging" aria-label="Your assistant and messages">
    {consent==='needed'?<div className="bank-messaging-consent"><BankMark/><h3>Your conversations,<br/>through your ID.</h3><p>Use your existing Receiz messages, groups, calls and assistant through this ID. Nothing sent until you send.</p><button className="primary-button" type="button" onClick={()=>void connect(true)}>Enable messages<ArrowUpRight size={17}/></button></div>:<>
      {(mode==='twin'||mode==='inbox')&&<nav className="bank-messaging-nav" aria-label="Conversation views">{(twinFirst?['twin','inbox'] as const:['inbox','twin'] as const).map(view=><button key={view} className={mode===view?'active':''} type="button" onClick={()=>{viewChosen.current=true;setUpgradeOpen(false);setMode(view);setNotice('');}}>{view==='twin'?'Your assistant':'Messages'}</button>)}{mode==='inbox'&&<button className="bank-compose-new" aria-label="New conversation" type="button" onClick={()=>{viewChosen.current=true;setMode('new');setNotice('');}}><SquarePen size={19}/></button>}</nav>}
      {mode==='twin'&&(!upgradeOpen||twinFirst?<><div className="bank-conversation-scroll" ref={scrollArea} onScroll={trackScroll}>{!exchanges.length&&!pendingTwin&&!twinAccessQuestions.length?<div className="bank-twin-welcome"><div className="bank-twin-mark"><BankMark/></div><h3>Your money.<br/>Your history.<br/>Help with what’s next.</h3><p>Understand a payment, bring a memory into context, or prepare your next move. Continue the conversation with the history you choose to share.</p><div className="bank-twin-suggestions">{['Explain my last payment','Find a memory','Prepare a payment'].map(text=><button key={text} type="button" onClick={()=>setTwinDraft(text)}>{text}<ArrowUpRight size={16}/></button>)}</div></div>:<div className="bank-thread-messages">{!!twinMemory.length&&<section className="bank-twin-memory" aria-label="Earlier conversation"><p className="bank-message-date">Earlier conversation</p>{twinMemory.map(row=><div key={row.persistedId||row.transportId||row.id} className={row.role==='user'?'bank-message-own':'bank-message-other'}><span className="bank-message-sender">{row.role==='user'?'You':'Your assistant'} · {row.scope} memory</span><p>{row.body}</p></div>)}</section>}{twinAccessQuestions.map(row=><div className="bank-twin-exchange" key={row.id}><div className="bank-message-own">{row.question}</div><TwinAccessReply onUpgrade={()=>{setUpgradeQuestion(row.question);setUpgradeOpen(true);}}/></div>)}{exchanges.map(exchange=><div className="bank-twin-exchange" key={exchange.id}><div className="bank-message-own">{exchange.question}</div><div className="bank-twin-reply"><span>Your assistant · Generated interpretation{exchange.reply.source!=='upstream'?' · '+exchange.reply.source:''}</span><p>{exchange.reply.message}</p>{!!exchange.reply.sharedContext.length&&<p className="bank-twin-context-used">Shared for this request: {exchange.reply.sharedContext.map(record=>record.title).join(', ')}</p>}{exchange.reply.actionHandoffs.map((action,index)=><div className="bank-twin-proposal" key={index}><small>Proposal · review before acting</small><button type="button" onClick={()=>setProposal(proposal===action.href?null:action.href)}>{action.label}<ArrowUpRight size={15}/></button>{proposal===action.href&&<div><p>This suggestion has not been executed.</p><a href={action.href} target="_blank" rel="noopener noreferrer">Review in Receiz</a>{onPreparePayment&&['pay','deposit'].includes(action.kind)&&<button type="button" onClick={()=>onPreparePayment?.()}>Prepare a payment in Bank</button>}</div>}</div>)}</div></div>)}</div>}{pendingTwin&&!exchanges.some(row=>row.id===pendingTwin.requestId)&&<div className="bank-thread-messages bank-twin-pending"><div className="bank-message-own"><p>{pendingTwin.message}</p><small className="bank-delivery-status">{busy?'Sending':'Awaiting confirmation'}</small></div>{busy&&<TypingBubble name="Your assistant" text=""/>}</div>}</div>
        {!!availableContext.length&&<details className="bank-twin-context"><summary><Paperclip size={13} aria-hidden="true"/>Add context{contextIds.length?' · '+contextIds.length+' selected':''}</summary><p>Only chosen excerpts are shared for this request. The generated reply may remain in your existing conversation memory.</p>{availableContext.map(record=><label key={record.id}><input type="checkbox" checked={contextIds.includes(record.id)} disabled={!contextIds.includes(record.id)&&contextSize+record.id.length+record.title.length+record.text.length>16000} onChange={event=>setContextIds(ids=>event.target.checked?[...ids,record.id]:ids.filter(id=>id!==record.id))}/><span>{record.title}</span></label>)}</details>}
        {twinFirst&&readiness?.status==='profile-required'&&<p className="bank-messaging-notice" role="status">Your assistant needs a public username before you can ask it.</p>}
        <MessageComposer draft={draft} setDraft={setDraft} submit={submit} placeholder="Ask your assistant…" onSendMoney={onPreparePayment?preparePayment:undefined} busy={busy} connected={!!api} disabled={twinFirst&&readiness?.status==='profile-required'||!!pendingTwin} maxLength={1200}/>
        {pendingTwin&&!busy&&<div className="bank-twin-recovery"><p role="status">The previous assistant response is not confirmed.</p><button type="button" onClick={()=>void recoverTwin()}>Check previous assistant request</button><button type="button" onClick={()=>{setPendingTwin(null);setNotice('The previous question may have been received. A new question is a separate request.');}}>Write a new question</button></div>}<p className="bank-messaging-caption">Business plan and usage credits required. Questions and replies may remain in your existing conversation memory.</p>
      </>:<Suspense fallback={null}><TwinUpgradePanel identity={identity} initialReview onBack={()=>{setUpgradeOpen(false);setTwinDraft(current=>current||upgradeQuestion||twinAccessQuestions.at(-1)?.question||'');}} onUpgraded={()=>{setTwinFirst(true);setUpgradeOpen(false);setTwinDraft(current=>current||upgradeQuestion||twinAccessQuestions.at(-1)?.question||'');setTwinAccessQuestions([]);identity.retainTwinAccessQuestions?.([]);setNotice('Assistant access is active. Your question is ready to send.');}}/></Suspense>)}
      {mode==='inbox'&&<div className="bank-inbox"><label className="bank-message-search"><Search size={17}/><input aria-label="Search messages" placeholder="Search messages" value={inboxQuery} onChange={event=>setInboxQuery(event.target.value)}/></label>{inbox.filter(row=>(row.title+' '+row.members.map(personName).join(' ')).toLowerCase().includes(inboxQuery.toLowerCase())).map(row=><button type="button" key={row.id} className="bank-thread-row" aria-label={'Open conversation '+row.title} onClick={()=>pick(row)}><ConversationAvatar row={row} owner={accountUid}/><span className="bank-thread-summary"><strong>{row.title}</strong><span>{row.previewMessage?.body||'No messages yet'}</span></span><span className="bank-thread-time">{timeLabel(row.lastMessageAt)}{row.unreadCount>0&&<i aria-label={row.unreadCount+' unread messages'}/>}</span></button>)}{!inbox.length&&<p className="bank-empty-message">Your existing conversations appear here. Start one with a Receiz username.</p>}</div>}
      {mode==='new'&&<div className="bank-new-thread"><button type="button" className="bank-messaging-back" onClick={()=>setMode('inbox')}><ChevronLeft size={17}/>Messages</button><p>Who would you like to talk to?</p><label className="bank-message-search"><Search size={17}/><input aria-label="Find a person by name or username" placeholder="Name or username" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" maxLength={40}/></label>{!!picked.length&&<div className="bank-picked-people">{picked.map(person=><button key={person.userId} type="button" onClick={()=>setPicked(rows=>rows.filter(row=>row.userId!==person.userId))}>Remove {personName(person)} ×</button>)}</div>}{picked.length>1&&<input className="bank-group-name" aria-label="Group name" placeholder="Group name (optional)" value={groupName} maxLength={120} onChange={event=>setGroupName(event.target.value)}/>}
        {!peopleSearchQuery(query)&&suggestedPeople.length>0&&<span className="bank-recent-caption">Recent contacts</span>}{suggestedPeople.map(person=><button className="bank-pick-person" type="button" aria-label={'Select '+personName(person)} key={person.userId} onClick={()=>setPicked(rows=>rows.some(row=>row.userId===person.userId)?rows.filter(row=>row.userId!==person.userId):[...rows,person])}><ProfileAvatar src={person.avatarUrl} name={personName(person)}/><span><strong>{personName(person)}</strong><small>@{person.username}</small></span><span className={'bank-person-check'+(picked.some(row=>row.userId===person.userId)?' selected':'')}>{picked.some(row=>row.userId===person.userId)&&<Check size={15}/>}</span></button>)}
        <p className="bank-new-hint" role="status">{searching?'Finding matching profiles…':!peopleSearchQuery(query)?'Search a name or username. Choose one person, or add more for a group.':!suggestedPeople.length?'No matching profiles found.':'Choose one person, or add more for a group.'}</p><button className="primary-button" type="button" disabled={!api||!picked.length||busy} onClick={()=>void createConversation()}>{busy?'Opening conversation…':'Start conversation'}<ArrowUpRight size={17}/></button>
      </div>}
      {mode==='thread'&&selected&&<><div className="bank-thread-toolbar"><button type="button" onClick={()=>setMode('inbox')} aria-label="Back to messages"><ChevronLeft size={18}/>Messages</button><span>{thread?.members.map(personName).join(', ')}</span><button type="button" aria-label="Voice call" disabled={!api} onClick={()=>openCall(false)}><Phone size={18}/></button><button type="button" aria-label="Video call" disabled={!api} onClick={()=>openCall(true)}><Video size={19}/></button></div>{activeCall&&<button type="button" className="bank-active-call" onClick={()=>openCall(activeCall.mode==='video')}>Call in progress · Open to join<Phone size={14}/></button>}<div className="bank-conversation-scroll bank-thread-messages" ref={scrollArea} onScroll={trackScroll}>{page?.hasMore&&<button type="button" className="bank-load-earlier" disabled={!api||olderBusy} onClick={()=>void loadOlder()}>{olderBusy?'Opening earlier messages…':'Load earlier messages'}</button>}{page?.messages.map(message=><div key={message.id} className={message.senderUserId===accountUid?'bank-message-own':'bank-message-other'}>{message.senderUserId!==accountUid&&<span className="bank-message-sender"><ProfileAvatar src={memberById.get(message.senderUserId)?.avatarUrl} name={message.senderDisplay||'Participant'}/>{message.senderDisplay||message.senderAiId||'Participant'}</span>}<PaymentMessage message={message} accountUid={accountUid} members={thread?.members??[]}/><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div>)}{selected&&pendingMessages[selected.id]&&<div className="bank-message-own bank-message-pending"><p>{pendingMessages[selected.id].body}</p><small className="bank-delivery-status">{pendingMessages[selected.id].status==='sending'?'Sending':pendingMessages[selected.id].status==='refused'?'Not sent':'Delivery not confirmed'}</small></div>}{!!peerNames.length&&<TypingBubble name={peerLabel} text="" activity="typing"/>}{Object.entries(deltas).map(([id,text])=><TypingBubble key={id} name={typingNames[id]||'Assistant'} text={text}/>)}</div><MessageComposer draft={draft} setDraft={setDraft} submit={submit} placeholder="Message…" onSendMoney={onPreparePayment?preparePayment:undefined} busy={busy} connected={!!api} onBlur={()=>peerTyping.current?.update(false)} maxLength={16384}/><p className="bank-messaging-caption">Messages stay in your existing Receiz conversation.</p></>}
      <div ref={callHost} className="bank-call-inline-host" hidden={mode!=='call'}/>
      {(readError||notice)&&<div className="bank-messaging-feedback"><p className="bank-messaging-error" role="alert">{notice||readError}</p>{!api?<button type="button" onClick={()=>void connect(false)}>Reconnect</button>:mode==='thread'&&<button type="button" onClick={refreshNow}>Refresh conversation</button>}</div>}
    </>}
  </section></Sheet>{heldCall&&api&&<CallPortal inlineHost={callHost} expanded={active&&mode==='call'}><Suspense fallback={null}><CallPanel identity={api.callTransport} conversationId={heldCall.conversationId} conversationTitle={heldCall.title} userId={api.accountUid} initialVideo={heldCall.video} initialCallId={heldCall.callId} minimized={!active||mode!=='call'} onLiveChange={setCallLive} onMinimize={()=>setMode(selected?'thread':'inbox')} onRestore={()=>{setMode('call');if(!active)onOpen?.();}} onClose={()=>{setHeldCall(null);setCallLive(false);setMode(selected?'thread':'inbox');}}/></Suspense></CallPortal>}</div>;
}
function MessageComposer({draft,setDraft,submit,placeholder,busy,disabled,connected=true,maxLength,onSendMoney,onBlur}:{onBlur?:()=>void;connected?:boolean;onSendMoney?:()=>void;draft:string;setDraft(value:string):void;submit(event:FormEvent):void;placeholder:string;busy:boolean;disabled?:boolean;maxLength:number}){
  return <form className="bank-message-composer" onSubmit={submit}>{onSendMoney&&<button type="button" className="bank-message-payment" aria-label="Send money" title="Send money" disabled={busy} onClick={onSendMoney}><DollarSign size={17} strokeWidth={1.7}/></button>}<input aria-label={placeholder} placeholder={placeholder} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={maxLength} disabled={disabled} onBlur={onBlur}/><button type="submit" disabled={!connected||disabled||busy||!draft.trim()} aria-label={placeholder==='Message…'?'Send message':'Ask your assistant'}><ArrowUp size={19}/></button></form>;
}

function TypingBubble({name,text,activity='responding'}:{name:string;text:string;activity?:'typing'|'responding'}){
  return <div className="bank-message-other bank-message-stream" aria-label={name+(activity==='typing'?' is typing':' is responding')}><span className="bank-message-sender">{name}</span>{text?<p>{text}<span className="bank-stream-cursor" aria-hidden="true"/></p>:<span className="bank-typing-dots" aria-hidden="true"><i/><i/><i/></span>}</div>;
}
