import {InlineOpening} from '../../components/InlineOpening';
import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState,type Ref,type Dispatch,type SetStateAction} from 'react';
import {ArrowUpRight,ChevronRight,ShieldCheck} from 'lucide-react';
import {formatMoney,formatUnits} from '../../core/money';
import {currentAvailabilityDifference} from '../../receiz/wallet-availability';
import {AvailabilityCalculation} from './AccountAvailability';
import type {SharedWallet} from '../../receiz/shared-wallet';
import type {WalletObservation} from '../../receiz/wallet-observation';

const CalculationDetails=lazy(()=>import('./BalanceCalculationDetails').then(module=>({default:module.BalanceCalculationDetails})));
type Rail='settlement'|'reserve';
const unit=(value:unknown):string|null=>typeof value==='string'&&/^(0|[1-9]\d{0,39})$/.test(value)?value:null;
/** Display-only composition from the same held units. The optional attribution
 * was already qualified on wallet ingress; reuse its account/funding head,
 * without replaying funding lots or assigning native backing/spending units. */
function displayedRailPhi(wallet:SharedWallet|null):Record<Rail,string|null>{
 const unknown={settlement:null,reserve:null};if(!wallet)return unknown;
 const total=unit(wallet.balancePhiMicro),source=wallet.currentBalanceSource;
 if(total===null||source&&source.userId!==wallet.userId)return unknown;
 let reserve=unit(wallet.reservePhiMicro),settlement=unit(wallet.settlementPhiMicro);
 if([wallet.reservePhiMicro,wallet.settlementPhiMicro].some(value=>value!=null&&unit(value)===null)
  ||reserve!==null&&BigInt(reserve)>BigInt(total)||settlement!==null&&BigInt(settlement)>BigInt(total)
  ||reserve!==null&&settlement!==null&&BigInt(reserve)+BigInt(settlement)!==BigInt(total))return unknown;
 if(reserve===null){
  const attribution=wallet.reserveUnitAttribution;
  if(attribution?.accountId===wallet.userId&&attribution.lastEntryAt===wallet.lastEntryAt
   &&attribution.lastEntryKaiUpulse===wallet.kaiUpulse
   &&attribution.recordedReserveUsdCents===(source?.ledgerSettledUsdCents??wallet.reserveUsdCents))reserve=unit(attribution.reservePhiMicro);
 }
 if(reserve!==null&&BigInt(reserve)<=BigInt(total)){
  const remaining=(BigInt(total)-BigInt(reserve)).toString();
  if(settlement===null)settlement=remaining;else if(settlement!==remaining)reserve=null;
 }
 if(total==='0'&&reserve===null&&settlement===null&&wallet.reserveUsdCents==='0'&&wallet.settlementUsdCents==='0')return{settlement:'0',reserve:'0'};
 return{settlement,reserve};
}
function RailDetails({rail,phi,accountTotal=false,usd,wallet,observation,difference,controlledOpen,onOpenChange,elementRef}:{rail:Rail;phi:string|null;accountTotal?:boolean;usd:string|null;wallet:SharedWallet|null;observation:WalletObservation|null;difference?:string|null;controlledOpen?:boolean;onOpenChange?:Dispatch<SetStateAction<boolean>>;elementRef?:Ref<HTMLDetailsElement>}){
 const [localOpen,setLocalOpen]=useState(false),open=controlledOpen??localOpen,setOpen=onOpenChange??setLocalOpen;
 return <details ref={elementRef} className="balance-rail-details" data-balance-rail={rail} open={open}><summary onClick={event=>{event.preventDefault();setOpen(value=>!value);}}><span>{rail==='settlement'?'Settlement':'Reserve'}<small>{rail==='settlement'?'Proof-native value':'Proof-backed funds'}</small></span><strong>{usd===null?'Unavailable':formatMoney(usd)}</strong><ChevronRight size={16} strokeWidth={1.6} aria-hidden="true"/></summary>{open&&<div className="balance-rail-body">{rail==='settlement'&&difference&&<AvailabilityCalculation difference={difference}/>}<p className="balance-rail-phi" data-rail-phi>{phi===null?'Exact Φ unavailable':<><small>{accountTotal?'Account total':rail==='settlement'?'Settlement total':'Reserve total'} · </small>{formatUnits(phi)} Φ</>}</p><Suspense fallback={<p className="balance-calculation"><InlineOpening label="Preparing calculation details"/></p>}><CalculationDetails rail={rail} wallet={wallet} observation={observation}/></Suspense></div>}</details>;
}
/** Presentation beneath the existing wallet frame. No reads, pricing or clocks. */
export function BalanceDetails({wallet,observation=null,focusSettlement=false}:{wallet:SharedWallet|null;observation?:WalletObservation|null;focusSettlement?:boolean}){
 const zero=wallet?.totalUsdCents==='0',difference=currentAvailabilityDifference(wallet,observation?.history??[],observation?.observedAt??null),fundedDifference=!!wallet&&BigInt(wallet.reserveUsdCents)>BigInt(wallet.totalUsdCents),phiByRail=displayedRailPhi(wallet);
 const [sourceOpen,setSourceOpen]=useState(focusSettlement),[settlementOpen,setSettlementOpen]=useState(focusSettlement),[pendingFocus,setPendingFocus]=useState(focusSettlement),settlementElement=useRef<HTMLDetailsElement>(null);
 const fundedInspection=useRef<string|null>(null);if(fundedDifference)fundedInspection.current=wallet!.userId;
 const keepFundedInspection=settlementOpen&&fundedInspection.current===wallet?.userId;
 const rails:Rail[]=(zero&&difference===null&&!fundedDifference&&!keepFundedInspection?['reserve'] as Rail[]:['settlement','reserve'] as Rail[]).filter(rail=>zero||wallet?.[rail==='settlement'?'settlementUsdCents':'reserveUsdCents']!=='0'||fundedDifference||rail==='settlement'&&keepFundedInspection);
 const accountPhi=wallet&&(!wallet.currentBalanceSource||wallet.currentBalanceSource.userId===wallet.userId)?unit(wallet.balancePhiMicro):null;
 // Focus is explicit navigation intent. Later valuation changes may remove the
 // explanation, but must never close an inspection or reopen a user's choice.
 useLayoutEffect(()=>{if(focusSettlement){setSourceOpen(true);setSettlementOpen(true);setPendingFocus(true);}},[focusSettlement]);
 useEffect(()=>{if(pendingFocus&&sourceOpen&&settlementOpen){settlementElement.current?.scrollIntoView?.({block:'start'});setPendingFocus(false);}},[pendingFocus,sourceOpen,settlementOpen]);
 return <div className="balance-technical-details"><details className="balance-source-details" open={sourceOpen}><summary onClick={event=>{event.preventDefault();setSourceOpen(value=>!value);}}>Source &amp; proof details<ChevronRight size={16} aria-hidden="true"/></summary><div className="balance-technical-content"><div className="balance-rail-list" aria-label="Balance value states">{rails.map(rail=>{
  const accountTotal=rails.length===1&&phiByRail[rail]===null&&accountPhi!==null,phi=accountTotal?accountPhi:phiByRail[rail],usd=wallet?.[rail==='settlement'?'settlementUsdCents':'reserveUsdCents']??null;
  return <RailDetails key={rail} rail={rail} phi={phi} accountTotal={accountTotal} usd={usd} wallet={wallet} observation={observation} difference={difference} controlledOpen={rail==='settlement'?settlementOpen:undefined} onOpenChange={rail==='settlement'?setSettlementOpen:undefined} elementRef={rail==='settlement'?settlementElement:undefined}/>;
 })}</div><div className="detail-list">{wallet?.pulse&&<div><span>☤KAI</span><strong>{Number(wallet.pulse).toLocaleString('en-US')}</strong></div>}{wallet?.kaiUpulse&&<div><span>Micro-pulse</span><strong>{wallet.kaiUpulse}</strong></div>}</div><aside className="balance-proof-notice" aria-label="Proof continuity"><span className="balance-proof-mark" aria-hidden="true"><ShieldCheck size={18} strokeWidth={1.7}/></span><div><h2>Proof continuity</h2><p>The Original carries your money and its proof. Completed Notes can travel directly between people, including offline. Banking implementations preserve the exact value, ownership and history as they handle it. Explore the open standard below.</p><a href="/learn/how-value-works/">How value is calculated</a><a href="/learn/reserve-and-settlement/#the-receiving-standard">Receiving conformance laws<ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true"/></a></div></aside></div></details></div>;
}
