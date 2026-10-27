import {clearNotificationUrl,notificationFromUrl,notificationTarget,type NotificationTarget} from './pwa/notification-target';
import {publishAccountAppearance} from './receiz/account-appearance';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import {bankTwinContextRecords} from './receiz/twin-bank-context';
import {mergePublicRecords} from './receiz/public-network';
import {useAssetEntry} from './features/assets/useAssetEntry';
import {useBusinessEntry} from './features/messages/useBusinessEntry';
import {MessagesPanel} from './features/messages/MessagesPanel';
import {identityProfileAvatar} from './receiz/profile-avatar';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Market } from './features/market/Market';
import {ReceiptView} from './features/receipts/ReceiptView';
import { Ledger } from './features/ledger/Ledger';
import { Entrance } from './features/identity/Entrance';
import { LiveAccount } from './features/account/LiveAccount';
import { LiveActions } from './features/account/LiveActions';
import { parseRoute, routeHash, sheetCloseBehavior } from './core/routes';
import {requestBankNavigation} from './core/bank-navigation';
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
const VaultPage=lazy(()=>import('./features/vault/VaultPage').then(module=>({default:module.VaultPage})));
export default function App() {
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 const [vault,setVault]=useState(()=>vaultLocation(location.href));
 const bankMounted=useRef(!receipt&&!vault);
 useEffect(()=>{const changed=()=>{setReceipt(location.pathname==='/receipt/'&&!document.getElementById('root')?.hidden?location.href:null);setVault(vaultLocation(location.href));if(location.pathname==='/')bankMounted.current=true;};addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
 const session=readCardReturn(location.search);
 return <>{(bankMounted.current||!receipt&&!vault)&&<div hidden={!!receipt||!!vault} inert={!!receipt||!!vault}>{session?<CardDepositReturn sessionId={session}/>:<BankApp/>}</div>}{vault&&<Suspense fallback={<main className="vault-loading" role="status">Opening the record…</main>}><VaultPage route={vault}/></Suspense>}{receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>{if(history.state?.bankReceipt)history.back();else{history.replaceState(null,'','/#ledger');dispatchEvent(new Event('bankeiz:receipt'));dispatchEvent(new Event('receiz-bank:surface'));}}}/>}</>;
}
const EMPTY_MARKET_ITEMS:import('./receiz/public-market').PublicMarketItem[]=[];
function BankApp() {
  const [onBank, setOnBank] = useState(location.pathname === '/');
  useEffect(() => { const change = () => flushSync(() => setOnBank(location.pathname === '/')); addEventListener('receiz-bank:surface', change); addEventListener('popstate',change); return () => { removeEventListener('receiz-bank:surface', change);removeEventListener('popstate',change); }; }, []);
  const account = useNativeAccount();
  const businessEntry=useBusinessEntry(account,onBank);
  useAssetEntry(account,onBank);
  const [profileRevision,setProfileRevision]=useState(0);
  useEffect(()=>{const updated=()=>setProfileRevision(value=>value+1);addEventListener('bankeiz:profile-updated',updated);return()=>removeEventListener('bankeiz:profile-updated',updated);},[]);
  const identityImage=useMemo(()=>account.identity?identityProfileAvatar(account.identity):null,[account.identity,profileRevision]);
  useEffect(()=>{if(account.identity)publishAccountAppearance({avatarUrl:identityImage,name:account.identity.accountUsername?.()??account.identity.username??'ID'});else if(!account.opening&&!account.busy)publishAccountAppearance(null);},[account.identity,identityImage,account.opening,account.busy,profileRevision]);
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
  const showcase = useMemo(() => projectAccountShowcase(publicMarket.catalog, account.identity?.accountUsername?.() ?? account.identity?.username ?? null), [publicMarket.catalog, account.identity, account.wallet]);
  const [paymentRequest] = useState(() => { try { return location.search ? parsePaymentRequest(`${BANK_PUBLIC_ORIGIN}/${location.search}`) : null; } catch { return null; } });
  const [cardResumeSessionId,setCardResumeSessionId]=useState(()=>readCardResume(location.search));
  const consumeCardResume=()=>{setCardResumeSessionId(null);const url=new URL(location.href);url.searchParams.delete('resumeCardSession');history.replaceState(history.state,'',url.pathname+url.search+url.hash);};
  const [sourceRevision, setSourceRevision] = useState(0);
  const [panel, setPanel] = useState<Panel>('account'), [sheet, setSheet] = useState<UIAction | null>(null);
  const privateHistory = usePrivateHistory(account.identity, account.wallet?.userId, onBank && Boolean(account.identity));
  const investmentPricing=useMarketDisplaySource();
  const investments=useMarketPortfolio(account.identity,onBank);
  const investmentHistory=useInvestmentHistory(investments.data,publicMarket.historyCatalog?.items??EMPTY_MARKET_ITEMS,investmentPricing,publicMarket.pulse,onBank&&!!account.identity,panel==='assets');
  const messagesMounted=useRef(false);if(sheet?.kind==='messages')messagesMounted.current=true;
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const personalHistory = useMemo(() => { if (!account.identity) return null; try { return projectPersonalHistory(account.identity.localHistory, account.wallet?.userId); } catch { return { records: [], available: false, completeAtSealedHead: false }; } }, [account.identity, account.wallet?.userId]);
  const twinLedger=useMemo(()=>{try{const records=mergePublicRecords(personalHistory?.records??[],privateHistory.cache?.records??[]);return{records,context:bankTwinContextRecords(records),accountUid:account.wallet?.userId??privateHistory.cache?.accountUid??''};}catch{return{records:[],context:[],accountUid:''};}},[personalHistory,privateHistory.cache,account.wallet?.userId]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action); };
  const consumeVaultsEntry=useCallback(()=>{const route=parseRoute(location.hash);if(location.pathname!=='/'||route.sheet?.kind!=='profile'||route.sheet.vaults!=='create')return;const action:UIAction={kind:'profile'};history.replaceState({...history.state,panel:route.panel,sheet:action},'',location.search+routeHash(route.panel,action));setSheet(action);},[]);
  const restoreMessages=()=>{if(location.pathname==='/')open({kind:'messages'});else requestBankNavigation(routeHash(panel,{kind:'messages'}));};
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { const back = () => { if (location.pathname !== '/') return; const route = parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); }; addEventListener('popstate', back); addEventListener('receiz-bank:surface', back); return () => { removeEventListener('popstate', back); removeEventListener('receiz-bank:surface', back); }; }, []);
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
  return <><PublicProfilePortal identity={account.identity} userId={account.wallet?.userId??account.identity.walletReceivingAddress?.()??null}/><PublicAssetTradePortal account={account}/><ConsoleShell identityImage={identityImage} active={onBank} panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })} onMessages={()=>open({kind:'messages'})}>
    <div hidden={panel !== 'account'}><LiveAccount originalsQualified={account.identity.knownOriginalsQualification?.()?.acceptance.status==='qualified'} onQualification={()=>open({kind:'earn-originals'})} portfolio={investments.data} marketItems={publicMarket.catalog?.items??EMPTY_MARKET_ITEMS} receivedNotes={account.receivedNotes} walletHistory={account.walletHistory} historyComplete={account.historyComplete} showcase={showcase} wallet={account.wallet} busy={account.busy} error={account.error} observedAt={account.observedAt} onRefresh={() => void account.refresh()} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onInvestments={() => { positions.current.assets=0; navigate('assets'); }} onLedger={() => navigate('ledger')} /></div>
    <div hidden={panel !== 'market'}><Market source={publicMarket} active={onBank && panel === 'market'} onAction={open} /></div>
    <div hidden={panel !== 'assets'}><LiveAssets identity={account.identity} active={onBank && panel === 'assets'} revision={sourceRevision} investments={investments} investmentHistory={investmentHistory} marketItems={publicMarket.catalog?.items??EMPTY_MARKET_ITEMS} historyItems={publicMarket.historyCatalog?.items??EMPTY_MARKET_ITEMS} pulse={publicMarket.pulse} showcase={showcase} showcaseBusy={publicMarket.status === 'loading'} onOpen={open} /></div>
    <div hidden={panel !== 'ledger'}><Ledger active={onBank && panel === 'ledger'} personalHistory={personalHistory} privateHistory={privateHistory} /></div>
    {messagesMounted.current&&<MessagesPanel initialBusinessRequest={businessEntry.request?.owner===account.identity?businessEntry.request:null} onBusinessConsumed={businessEntry.consume} identity={account.identity} initialNotification={notification} initialRecipient={messageRecipient?.owner===account.identity?messageRecipient:null} active={onBank&&sheet?.kind==='messages'} twinContextRecords={twinLedger.context} heldLedger={twinLedger} onOpen={restoreMessages} onClose={close} onPreparePayment={recipient=>open({kind:'send',...(recipient?{recipient}:{})})}/>}
    {sheet && sheet.kind!=='messages' && <LiveActions onOpen={open} onVaultsEntryConsumed={consumeVaultsEntry} onOpenAssistant={()=>{if(location.pathname==='/'&&parseRoute(location.hash).sheet?.kind==='business')open({kind:'messages'});}} marketItems={publicMarket.catalog?.items} key={sheet.kind==='send'?'send:'+(sheet.recipient?.userId??'')+':'+(sheet.recipient?.username??''):sheet.kind} active={onBank} action={sheet} identity={account.identity} wallet={account.wallet} paymentRequest={paymentRequest} cardResumeSessionId={cardResumeSessionId} onCardResumeConsumed={consumeCardResume} onClose={close} onRefresh={() => { setSourceRevision(value => value + 1); void account.refresh(); void privateHistory.refresh(); }} onForget={async () => { await account.forget(); setSheet(null); }} />}
  </ConsoleShell></>;
}
