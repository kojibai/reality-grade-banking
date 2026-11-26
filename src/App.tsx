import type {EmailMessageObservation} from './receiz/email-message-entry';
import {useMeetingEntry} from './features/messages/useMeetingEntry';
import {InlineOpening} from './components/InlineOpening';
import {clearNotificationUrl,notificationFromUrl,notificationTarget,type NotificationTarget} from './pwa/notification-target';
import {publishAccountAppearance} from './receiz/account-appearance';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {bankTwinContextRecords} from './receiz/twin-bank-context';
import {mergePublicRecords} from './receiz/public-network';
import {useAssetEntry} from './features/assets/useAssetEntry';
import {useBusinessEntry} from './features/messages/useBusinessEntry';
import {MessagesPanel} from './features/messages/MessagesPanel';
import {identityProfileAvatar,identityProfileName,identityProfileUsername} from './receiz/profile-avatar';
import { ConsoleShell } from './components/ConsoleShell';
import { BottomNav, type Panel } from './components/BottomNav';
import { Market } from './features/market/Market';
import {ReceiptView} from './features/receipts/ReceiptView';
import { Ledger } from './features/ledger/Ledger';
import { Entrance } from './features/identity/Entrance';
import {AccountOpening} from './features/identity/AccountOpening';
import { LiveAccount } from './features/account/LiveAccount';
import { LiveActions } from './features/account/LiveActions';
import { parseRoute, routeHash, sheetCloseBehavior } from './core/routes';
import {requestBankNavigation} from './core/bank-navigation';
import {useScrollReveal} from './core/useScrollReveal';
import type { UIAction } from './core/useBank';
import { useNativeAccount } from './receiz/useNativeAccount';
import { projectPersonalHistory } from './receiz/personal-history';
import { usePrivateHistory } from './receiz/usePrivateHistory';
import { usePublicMarket } from './receiz/usePublicMarket';
import { projectAccountShowcase } from './receiz/account-showcase';
import {useMarketDisplaySource} from './receiz/market-projection/display-source';
import {useMarketPortfolio} from './receiz/useMarketPortfolio';
import {useInvestmentHistory} from './receiz/market-projection/useInvestmentHistory';
import { LiveAssets } from './features/assets/LiveAssets';
import { BANK_PUBLIC_ORIGIN } from './receiz/config';
import { parsePaymentRequest } from './receiz/payment-request';
import { CardDepositReturn, readCardReturn, readCardResume } from './features/deposit/CardDepositReturn';
import {PublicAssetTradePortal} from './features/market/PublicAssetTradePortal';
import {PublicProfilePortal} from './features/account/PublicProfilePortal';
import {consumeProfileAccountAction,readProfileAccountAction,subscribeProfileActions} from './receiz/profile-actions';
import {vaultLocation} from './receiz/vault/location';
import './styles/bank-dock.css';
const VaultPage=lazy(()=>import('./features/vault/VaultPage').then(module=>({default:module.VaultPage})));
const EmailPaymentEntry=lazy(()=>import('./features/account/EmailPaymentEntry').then(module=>({default:module.EmailPaymentEntry})));
const EmailMeetingEntry=lazy(()=>import('./features/account/EmailMeetingEntry').then(module=>({default:module.EmailMeetingEntry})));
const EmailMessageEntry=lazy(()=>import('./features/account/EmailMessageEntry').then(module=>({default:module.EmailMessageEntry})));
export default function App() {
 const [emailMeetingOpened,setEmailMeetingOpened]=useState(false);
 const [emailMessageOpened,setEmailMessageOpened]=useState<EmailMessageObservation|null>(null);
 if(!emailMeetingOpened&&location.pathname==='/'&&new URLSearchParams(location.search).getAll('emailMeeting').length===1&&new URLSearchParams(location.search).get('emailMeeting')==='1')return <Suspense fallback={<AccountOpening resuming/>}><EmailMeetingEntry onOpened={()=>setEmailMeetingOpened(true)}/></Suspense>;
 if(!emailMessageOpened&&location.pathname==='/'&&new URLSearchParams(location.search).getAll('emailMessage').length===1&&new URLSearchParams(location.search).get('emailMessage')==='1')return <Suspense fallback={<AccountOpening resuming/>}><EmailMessageEntry onOpened={setEmailMessageOpened}/></Suspense>;
 if(['/receive','/receive/'].includes(location.pathname))return <Suspense fallback={<InlineOpening label="Reading your invitation"/>}><EmailPaymentEntry/></Suspense>;
 return <MainApp verifiedEmailMessage={emailMessageOpened}/>;
}
function MainApp({verifiedEmailMessage}:{verifiedEmailMessage?:EmailMessageObservation|null}) {
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 const [vault,setVault]=useState(()=>vaultLocation(location.href));
 const bankMounted=useRef(!receipt&&!vault);
 useEffect(()=>{const changed=()=>{setReceipt(location.pathname==='/receipt/'&&!document.getElementById('root')?.hidden?location.href:null);setVault(vaultLocation(location.href));if(location.pathname==='/')bankMounted.current=true;};addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
 const session=readCardReturn(location.search);
 return <>{(bankMounted.current||!receipt&&!vault)&&<div hidden={!!receipt||!!vault} inert={!!receipt||!!vault}>{session?<CardDepositReturn sessionId={session}/>:<BankApp verifiedEmailMessage={verifiedEmailMessage}/>}</div>}{vault&&<Suspense fallback={<main className="vault-loading" role="status"><InlineOpening label="Preparing the record"/></main>}><VaultPage route={vault}/></Suspense>}{receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>{if(history.state?.bankReceipt)history.back();else{history.replaceState(null,'','/#ledger');dispatchEvent(new Event('bankeiz:receipt'));dispatchEvent(new Event('receiz-bank:surface'));}}}/>}</>;
}
function RetainedBankNavigation({onBank,panel,navigate,deposit}:{onBank:boolean;panel:Panel;navigate:(panel:Panel)=>void;deposit:()=>void}) {
 const {away,reveal}=useScrollReveal(!onBank,'#retained-bank-navigation button:focus-visible',undefined,true);
 return createPortal(<div id="retained-bank-navigation" data-public={!onBank||undefined} data-tucked={!onBank&&away||undefined} onFocus={reveal}>
  <BottomNav panel={onBank?panel:null}
    onNavigate={next=>{if(onBank)navigate(next);else requestBankNavigation(routeHash(next));}}
    onDeposit={()=>{if(onBank)deposit();else requestBankNavigation(routeHash('account',{kind:'deposit'}));}}/>
 </div>,document.body);
}
const EMPTY_MARKET_ITEMS:import('./receiz/public-market').PublicMarketItem[]=[];
function BankApp({verifiedEmailMessage}:{verifiedEmailMessage?:EmailMessageObservation|null}) {
  const [onBank, setOnBank] = useState(location.pathname === '/');
  const account = useNativeAccount();
  const businessEntry=useBusinessEntry(account,onBank);
  const meetingEntry=useMeetingEntry(account,onBank);
  useAssetEntry(account,onBank);
  const [profileRevision,setProfileRevision]=useState(0);
  useEffect(()=>{const updated=()=>setProfileRevision(value=>value+1);addEventListener('bankeiz:profile-updated',updated);return()=>removeEventListener('bankeiz:profile-updated',updated);},[]);
  const identityImage=useMemo(()=>account.identity?identityProfileAvatar(account.identity):null,[account.identity,profileRevision]);
  const identityUsername=account.identity?identityProfileUsername(account.identity):null;
  useEffect(()=>{if(account.identity)publishAccountAppearance({avatarUrl:identityImage,name:identityProfileName(account.identity),username:identityUsername??undefined,accountUid:account.identity.knownProfile?.()?.userId??account.identity.knownWallet?.()?.wallet.userId,identityKeyId:account.identity.binding.keyId});else if(!account.opening&&!account.busy)publishAccountAppearance(null);},[account.identity,identityImage,identityUsername,account.opening,account.busy,profileRevision]);
  const profileAction=useSyncExternalStore(subscribeProfileActions,readProfileAccountAction,()=>null);
  const messageEntryAttempt=useRef<number|null>(null);
  useEffect(()=>{
    // The explicit Message tap continues through the existing account owner.
    // Let saved-account restoration finish first; a failure must never replace it.
    if(!onBank||profileAction?.kind!=='messages'||account.identity||account.opening||account.busy||account.error||messageEntryAttempt.current===profileAction.id)return;
    messageEntryAttempt.current=profileAction.id;void account.create(true);
  },[onBank,profileAction,account.identity,account.opening,account.busy,account.error,account.create]);
  const [notification,setNotification]=useState<NotificationTarget|null>(()=>notificationFromUrl(location.search));
  useEffect(()=>{if(!('serviceWorker'in navigator))return;const receive=(event:MessageEvent)=>{if(event.data?.type!=='BANK_NOTIFICATION_OPEN')return;const target=notificationTarget(event.data.target);setNotification(target);history.replaceState({panel:'account',sheet:{kind:'messages'}},'', '/'+location.search+'#account/messages');dispatchEvent(new PopStateEvent('popstate'));};navigator.serviceWorker.addEventListener('message',receive);return()=>navigator.serviceWorker.removeEventListener('message',receive);},[]);
  const [messageRecipient,setMessageRecipient]=useState<{owner:typeof account.identity;id:number;person:{userId:string;username:string;displayName:string;avatarUrl:string|null}}|null>(null);
  const publicMarket = usePublicMarket(onBank);
  const accountName = account.identity?.accountUsername?.() ?? account.identity?.username ?? null;
  const showcaseUid = account.wallet?.userId ?? account.identity?.walletReceivingAddress?.();
  const showcase = useMemo(() => {
    const name = identityUsername && identityUsername !== accountName && showcaseUid && publicMarket.catalog?.publicProfileHeads?.some(({profile})=>profile.userId===showcaseUid&&profile.username===identityUsername) ? identityUsername : accountName;
    return projectAccountShowcase(publicMarket.catalog, name);
  }, [publicMarket.catalog, identityUsername, accountName, showcaseUid]);
  const [paymentRequest] = useState(() => { try { return location.search ? parsePaymentRequest(`${BANK_PUBLIC_ORIGIN}/${location.search}`) : null; } catch { return null; } });
  const [cardResumeSessionId,setCardResumeSessionId]=useState(()=>readCardResume(location.search));
  const consumeCardResume=()=>{setCardResumeSessionId(null);const url=new URL(location.href);url.searchParams.delete('resumeCardSession');history.replaceState(history.state,'',url.pathname+url.search+url.hash);};
  const [sourceRevision, setSourceRevision] = useState(0);
  const entryRoute=useMemo(()=>parseRoute(location.hash),[]);
  const [panel, setPanel] = useState<Panel>(entryRoute.panel), [sheet, setSheet] = useState<UIAction | null>(entryRoute.sheet);
  const privateHistory = usePrivateHistory(account.identity, account.wallet?.userId, onBank && Boolean(account.identity));
  const investmentPricing=useMarketDisplaySource();
  const investments=useMarketPortfolio(account.identity,onBank);
  const investmentHistory=useInvestmentHistory(investments.data,publicMarket.historyCatalog?.items??EMPTY_MARKET_ITEMS,investmentPricing,publicMarket.pulse,onBank&&!!account.identity,panel==='assets');
  const messagesMounted=useRef(false);if(sheet?.kind==='messages')messagesMounted.current=true;
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const personalHistory = useMemo(() => { if (!account.identity) return null; try { return projectPersonalHistory(account.identity.localHistory, account.wallet?.userId); } catch { return { records: [], available: false, completeAtSealedHead: false }; } }, [account.identity, account.wallet?.userId]);
  const twinLedger=useMemo(()=>{try{const records=mergePublicRecords(personalHistory?.records??[],privateHistory.cache?.records??[]);return{records,context:bankTwinContextRecords(records),accountUid:account.wallet?.userId??privateHistory.cache?.accountUid??''};}catch{return{records:[],context:[],accountUid:''};}},[personalHistory,privateHistory.cache,account.wallet?.userId]);
  const refreshAccountSources=()=>{setSourceRevision(value=>value+1);void account.refresh();void privateHistory.refresh();};
  const open = (action: UIAction) => {
    history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action);
  };
  const consumeVaultsEntry=useCallback(()=>{const route=parseRoute(location.hash);if(location.pathname!=='/'||route.sheet?.kind!=='profile'||route.sheet.vaults!=='create')return;const action:UIAction={kind:'profile'};history.replaceState({...history.state,panel:route.panel,sheet:action},'',location.search+routeHash(route.panel,action));setSheet(action);},[]);
  const consumeLinkedPayment = (token:string) => {
    const route=parseRoute(location.hash);
    if(route.sheet?.kind!=='receive'||route.sheet.nearbyPayment!==token)return;
    const action:UIAction={kind:'receive'};
    history.replaceState({...history.state,sheet:action},'',routeHash(route.panel,action));
  };
  const restoreMessages=()=>{if(location.pathname==='/')open({kind:'messages'});else requestBankNavigation(routeHash(panel,{kind:'messages'}));};
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(()=>{
    const selectRoute=()=>{
      const active=location.pathname==='/';
      flushSync(()=>{
        setOnBank(active);
        if(active){const route=parseRoute(location.hash);setPanel(route.panel);setSheet(route.sheet);}
      });
    };
    const selectPaymentLink=()=>{
      const {sheet:next}=parseRoute(location.hash);
      if(location.pathname==='/'&&next?.kind==='receive'&&next.nearbyPayment)selectRoute();
    };
    addEventListener('popstate',selectRoute);addEventListener('receiz-bank:surface',selectRoute);
    addEventListener('hashchange',selectPaymentLink);
    return ()=>{
      removeEventListener('popstate',selectRoute);removeEventListener('receiz-bank:surface',selectRoute);
      removeEventListener('hashchange',selectPaymentLink);
    };
  },[]);
  useEffect(() => { if (account.identity && onBank) { if(notification)clearNotificationUrl();const route = paymentRequest ? { panel: 'account' as const, sheet: { kind: 'send' as const } } : parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); history.replaceState(route, '', `${location.search}${routeHash(route.panel, route.sheet)}`); } }, [account.identity, paymentRequest, onBank]);
  useEffect(()=>{
    if(!onBank||!account.identity||!profileAction)return;
    const {profile,id,kind}=profileAction;
    const action:UIAction=kind==='send'?{kind:'send',recipient:{userId:profile.userId,username:profile.username}}:{kind:'messages'};
    if(kind==='messages')setMessageRecipient({owner:account.identity,id,person:{userId:profile.userId,username:profile.username,displayName:profile.displayName,avatarUrl:profile.avatarUrl}});
    setPanel('account');setSheet(action);history.replaceState({panel:'account',sheet:action},'',routeHash('account',action));consumeProfileAccountAction(id);
  },[onBank,account.identity,profileAction]);
  if (!account.identity) {
    return <><PublicProfilePortal identity={null} userId={null}/><PublicAssetTradePortal account={account} fallback={<Entrance opening={account.opening} openingStage={account.openingStage} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId} onPbi={account.pbi}/>}/></>;
  }
  const dock=<RetainedBankNavigation onBank={onBank} panel={panel} navigate={navigate} deposit={()=>open({kind:'deposit'})}/>;
  return <><PublicProfilePortal identity={account.identity} userId={account.wallet?.userId??account.identity.walletReceivingAddress?.()??null} marketItems={publicMarket.catalog?.items??EMPTY_MARKET_ITEMS} onRefresh={refreshAccountSources}/><PublicAssetTradePortal account={account}/><ConsoleShell identityImage={identityImage} active={onBank} panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })} onMessages={()=>open({kind:'messages'})} navigation={dock}>
    <div hidden={panel !== 'account'}><LiveAccount portfolio={investments.data} marketItems={publicMarket.catalog?.items??EMPTY_MARKET_ITEMS} receivedNotes={account.receivedNotes} walletHistory={account.walletHistory} historyComplete={account.historyComplete} showcase={showcase} wallet={account.wallet} busy={account.busy} error={account.error} observedAt={account.observedAt} syncPending={account.syncPending} onRefresh={() => void account.refresh()} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAvailability={() => open({kind:'balance',focus:'settlement'})} onAssets={() => navigate('assets')} onInvestments={() => { positions.current.assets=0; navigate('assets'); }} onLedger={() => navigate('ledger')} /></div>
    <div hidden={panel !== 'market'}><Market source={publicMarket} active={onBank && panel === 'market'} onAction={open}
      currencyManagement={{identity:account.identity,accountUid:account.wallet?.userId??account.identity.walletReceivingAddress?.()??null,onRefresh:refreshAccountSources}} /></div>
    <div hidden={panel !== 'assets'}><LiveAssets identity={account.identity} active={onBank && panel === 'assets'} revision={sourceRevision} investments={investments} investmentHistory={investmentHistory} marketItems={publicMarket.catalog?.items??EMPTY_MARKET_ITEMS} historyItems={publicMarket.historyCatalog?.items??EMPTY_MARKET_ITEMS} pulse={publicMarket.pulse} showcase={showcase} showcaseBusy={publicMarket.status === 'loading'} onOpen={open} /></div>
    <div hidden={panel !== 'ledger'}><Ledger sourceReader={account.identity?.readHeldLedgerOriginal} active={onBank && panel === 'ledger'} personalHistory={personalHistory} privateHistory={privateHistory} /></div>
    {messagesMounted.current&&<MessagesPanel initialEmailMessage={verifiedEmailMessage} initialMeeting={meetingEntry} initialBusinessRequest={businessEntry.request?.owner===account.identity?businessEntry.request:null} onBusinessConsumed={businessEntry.consume} identity={account.identity} initialNotification={notification} initialRecipient={messageRecipient?.owner===account.identity?messageRecipient:null} active={onBank&&sheet?.kind==='messages'} twinContextRecords={twinLedger.context} heldLedger={twinLedger} onOpen={restoreMessages} onClose={close} onPreparePayment={recipient=>open({kind:'send',...(recipient?{recipient}:{})})}/>}
    {sheet && sheet.kind!=='messages' && <LiveActions onOpen={open} onVaultsEntryConsumed={consumeVaultsEntry} onLinkedPaymentSaved={consumeLinkedPayment} onOpenAssistant={()=>{if(location.pathname==='/'&&parseRoute(location.hash).sheet?.kind==='business')open({kind:'messages'});}} marketItems={publicMarket.catalog?.items} key={sheet.kind==='send'?'send:'+(sheet.recipient?.userId??'')+':'+(sheet.recipient?.username??''):sheet.kind} active={onBank} action={sheet} identity={account.identity} wallet={account.wallet} paymentRequest={paymentRequest} cardResumeSessionId={cardResumeSessionId} onCardResumeConsumed={consumeCardResume} onClose={close} onRefresh={refreshAccountSources} onForget={async () => { await account.forget(); setSheet(null); }} />}
  </ConsoleShell></>;
}
