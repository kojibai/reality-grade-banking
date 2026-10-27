import {lazy,Suspense,useState} from 'react';
import {ArrowUpRight,ChevronRight,ShieldCheck} from 'lucide-react';
import {formatMoney,formatUnits} from '../../core/money';
import type {SharedWallet} from '../../receiz/shared-wallet';
import type {WalletObservation} from '../../receiz/wallet-observation';

const CalculationDetails=lazy(()=>import('./BalanceCalculationDetails').then(module=>({default:module.BalanceCalculationDetails})));
type Rail='settlement'|'reserve';
const unit=(value:unknown):string|null=>typeof value==='string'&&/^(0|[1-9]\d{0,39})$/.test(value)?value:null;
function RailDetails({rail,phi,usd,wallet,observation}:{rail:Rail;phi:string|null;usd:string|null;wallet:SharedWallet|null;observation:WalletObservation|null}){
 const [open,setOpen]=useState(false);
 return <details className="balance-rail-details" data-balance-rail={rail} open={open}><summary onClick={event=>{event.preventDefault();setOpen(value=>!value);}}><span>{rail==='settlement'?'Settlement':'Reserve'}<small>{rail==='settlement'?'Proof-native value':'Proof-backed funds'}</small></span><strong>{usd===null?'Unavailable':formatMoney(usd)}</strong><ChevronRight size={16} strokeWidth={1.6} aria-hidden="true"/></summary>{open&&<div className="balance-rail-body"><p className="balance-rail-phi" data-rail-phi>{phi===null?'Exact Φ unavailable':`${formatUnits(phi)} Φ`}</p><Suspense fallback={<p className="balance-calculation">Opening calculation details…</p>}><CalculationDetails rail={rail} wallet={wallet} observation={observation}/></Suspense></div>}</details>;
}
/** Presentation beneath the existing wallet frame. No reads, pricing or clocks. */
export function BalanceDetails({wallet,observation=null}:{wallet:SharedWallet|null;observation?:WalletObservation|null}){
 const zero=wallet?.totalUsdCents==='0'&&wallet.balancePhiMicro==='0';
 const rails:Rail[]=zero?['reserve']:['settlement','reserve'];
 return <div className="balance-technical-details"><div className="balance-rail-list" aria-label="Balance value states">{rails.map(rail=>{
  const phi=zero?'0':unit(wallet?.[rail==='settlement'?'settlementPhiMicro':'reservePhiMicro']),usd=wallet?.[rail==='settlement'?'settlementUsdCents':'reserveUsdCents']??null;
  if(!zero&&phi!==null&&phi==='0'&&usd==='0')return null;
  return <RailDetails key={rail} rail={rail} phi={phi} usd={usd} wallet={wallet} observation={observation}/>;
 })}</div><details className="balance-source-details"><summary>Source &amp; proof details<ChevronRight size={16} aria-hidden="true"/></summary><div className="balance-technical-content"><div className="detail-list">{wallet?.pulse&&<div><span>☤KAI</span><strong>{Number(wallet.pulse).toLocaleString('en-US')}</strong></div>}{wallet?.kaiUpulse&&<div><span>Micro-pulse</span><strong>{wallet.kaiUpulse}</strong></div>}</div><aside className="balance-proof-notice" aria-label="Proof continuity"><span className="balance-proof-mark" aria-hidden="true"><ShieldCheck size={18} strokeWidth={1.7}/></span><div><h2>Proof continuity</h2><p>The Original carries your money and its proof. Completed Notes can travel directly between people, including offline. Banking implementations preserve the exact value, ownership and history as they handle it. Explore the open standard below.</p><a href="/learn/how-value-works/">How value is calculated</a><a href="/learn/reserve-and-settlement/#the-receiving-standard">Receiving conformance laws<ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true"/></a></div></aside></div></details></div>;
}
