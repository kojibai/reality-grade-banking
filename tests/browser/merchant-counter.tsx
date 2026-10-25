import {createRoot} from 'react-dom/client';
import {MerchantCounter} from '../../src/features/account/MerchantCounter';
import {HostedCheckout} from '../../src/checkout/HostedCheckout';
import {createMerchantCounter} from '../../src/receiz/merchant-counter';
import {createMerchantReceive} from '../../src/receiz/merchant-receive';
import {createHostedCheckout} from '../../src/receiz/hosted-checkout';
import {createWalletSend} from '../../src/receiz/wallet-send';
import {buildFixedSaleUrl,type FixedSale} from '../../src/receiz/fixed-checkout';
import {parseCheckoutRequest} from '../../src/receiz/checkout-request';
import {syntheticWalletRecord} from '../fixtures/wallet-send';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {MerchantCounterState} from '../../src/receiz/merchant-counter-state';
import type {CheckoutNoteEntry,HostedCheckoutState} from '../../src/receiz/checkout-state';
import type {SharedWallet} from '../../src/receiz/shared-wallet';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
// Two synthetic roles, separate retained stores. No account enrollment,
// production publication, real original, live card charge or payment operation.
const query=new URLSearchParams(location.search),role=query.get('role')??'merchant',method=query.get('method')??'balance',prefix='bank-counter-synthetic:'+query.get('run'),merchant='10000000-0000-4000-8000-000000000002',sender='10000000-0000-4000-8000-000000000001',owner='a'.repeat(64),paymentKey=prefix+':payments',saleKey=prefix+':sale';
const read=<T,>(key:string,fallback:T):T=>JSON.parse(sessionStorage.getItem(prefix+':'+key)??JSON.stringify(fallback)),write=(key:string,value:unknown)=>sessionStorage.setItem(prefix+':'+key,JSON.stringify(value)),payments=()=>JSON.parse(localStorage.getItem(paymentKey)??'[]')as ReturnType<typeof syntheticWalletRecord>[];
const lock=async<T,>(work:()=>Promise<T>):Promise<T>=>await navigator.locks.request(prefix+':'+role,work);
if(role==='merchant'){
 const receive=createMerchantReceive({accountUid:merchant,request:async(path,signal)=>{signal.throwIfAborted();const records=payments();if(path.startsWith('/api/wallet/ledger'))return{ok:true,accountUserId:merchant,events:[...records].reverse().map(raw=>({id:raw.transfer.id,kind:'chat_transfer',transferId:raw.transfer.id,recipient:{userId:merchant},publicNote:raw.source.message.wallet_transfer.note})),nextCursor:null};const q=new URL(path,'https://fixture.test').searchParams;return records.find(raw=>raw.transfer.id===q.get('transferId')&&raw.transfer.clientNonce===q.get('clientNonce'))??{ok:true,found:false};}});
 const counter=createMerchantCounter({identityDigest:owner,accountUid:merchant,username:'merchant',assertCurrent(){},receive,lock,store:{read:async()=>read<MerchantCounterState|null>('counter',null),write:async(next,expected)=>{if(JSON.stringify(read('counter',null))!==JSON.stringify(expected))throw Error('revision conflict');write('counter',next);}}});
 counter.subscribe(()=>{const active=counter.snapshot().active;if(active)localStorage.setItem(saleKey,JSON.stringify(active.request));});
 const identity={username:'merchant',merchantCounter:async()=>counter}as unknown as OpenIdentity;
 createRoot(document.getElementById('root')!).render(<main style={{maxWidth:540,margin:'24px auto',padding:22}}><MerchantCounter identity={identity} onBack={()=>{}}/></main>);
 Object.assign(window,{counterFixture:{counter,payments,async custody(){const vault=await import('../../src/receiz/identity-vault'),bytes=new Uint8Array([87,23,4]),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),binding={artifactSha256:digest};await vault.saveDeviceIdentity(bytes,'synthetic.png','',true);const state=read<MerchantCounterState>('counter',null!);state.identityDigest=digest;for(const sale of state.sales)sale.identityDigest=digest;await vault.saveMerchantCounterState(binding,state,null);const reopened=await vault.loadMerchantCounterState(binding);let conflict=false;try{await vault.saveMerchantCounterState(binding,state,null);}catch{conflict=true;}await vault.forgetDeviceIdentity();return{equal:JSON.stringify(reopened)===JSON.stringify(state),conflict};}}});
}else{
 const fixed=JSON.parse(localStorage.getItem(saleKey)??'null')as FixedSale;if(!fixed)throw Error('Create a synthetic merchant sale first.');
 const data=read('payer',{state:null as HostedCheckoutState|null,wallet:null as unknown,balance:method==='balance'?1000:0,record:null as ReturnType<typeof syntheticWalletRecord>|null,cardPaid:false,notePaid:false,transfers:0,cards:0,deposits:0,funded:1000}),persist=()=>write('payer',data);let lost=false;
 const transfer=async(body:Parameters<typeof syntheticWalletRecord>[0])=>{if(data.balance<1000)throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});data.balance-=1000;data.transfers++;data.record=syntheticWalletRecord(body,sender);const n=data.transfers.toString(16).padStart(12,'0'),id='30000000-0000-4000-8000-'+n;data.record.transfer.id=id;data.record.source.transfer.id=id;localStorage.setItem(paymentKey,JSON.stringify([...payments(),data.record]));persist();if(query.has('lost')){lost=true;throw Error('synthetic response loss');}return data.record;};
 const wallet=createWalletSend({ownerReceizId:'fixture.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async work=>work(),store:{read:async()=>structuredClone(data.wallet),write:async next=>{data.wallet=next;persist();}},connect:async()=>({accountUid:sender,client:{connect:{transfer},request:async(path,options)=>{
  if(path==='/api/connect/transfers/public-note')return transfer(options.body as Parameters<typeof transfer>[0]);
  if(path.startsWith('/api/chat/users/search'))return{ok:true,users:[{kind:'user',username:'merchant',userId:merchant}]};
  if(path.includes('amountUsd='))return{ok:true,senderUserId:sender,capabilities:{publicTransferNotes:true},quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:data.balance>=1000?'1000':'0',ecosystemUsdCents:data.balance>=1000?'0':'1000',fundingRule:'settled_first_then_phi'}};
  if(path==='/api/chat/conversations')return{ok:true,conversation:{id:'10000000-0000-4000-8000-000000000003'}};
  if(path==='/api/connect/wallet/me')return{ok:true,wallet:{userId:sender,balanceUsd:(data.balance/100).toFixed(2),balancePhiMicro:'10000000',valueStates:{settledBalanceUsdCents:String(data.balance),ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{}}};
  return lost?{ok:true,found:false}:data.record??{ok:true,found:false};
 }}}),funding:{begin:async amount=>{data.cards++;data.funded=Math.round(Number(amount)*100);persist();return{sessionId:'cs_test_counteroriginal',clientSecret:'synthetic-only',amountUsdCents:String(data.funded)};},check:async(_checkout,beforeCredit)=>{if(data.cardPaid)await beforeCredit();return{status:data.cardPaid?'credited':'open'};}}});
 const rail=method==='settlement'?'settlement':method==='composite'?'composite':'reserve',note:CheckoutNoteEntry={sourceDigest:'b'.repeat(64),sourceRef:'b'.repeat(64),noteId:'10000000-0000-4000-8000-000000000008',rail,inspection:{noteId:'10000000-0000-4000-8000-000000000008',rail,amountUsdCents:'1000',amountPhiMicro:'10000000'},status:'inspected'};
 const controller=createHostedCheckout({identityDigest:'b'.repeat(64),assertCurrent(){},walletSend:async()=>wallet,lock,store:{read:async()=>structuredClone(data.state),write:async next=>{data.state=next;persist();}},readWallet:async()=>({userId:sender,totalUsdCents:String(data.balance),reserveUsdCents:String(data.balance),settlementUsdCents:'0',projectionComplete:true})as SharedWallet,notes:{validate:async()=>{},inspect:async()=>note,deposit:async entry=>{data.deposits++;persist();return{...entry,status:'received'};},check:async entry=>data.notePaid?{...entry,status:'confirmed',creditSourceDigest:'c'.repeat(64)}:entry}});
 const identity={hostedCheckout:async()=>controller}as unknown as OpenIdentity,last=data.state?.current.approval,returnContext=query.has('return')&&last?{username:'merchant',checkoutId:last.checkoutId,sessionId:query.get('return')==='wrong'?'cs_test_unrelatedoriginal':'cs_test_counteroriginal'}:undefined;
 createRoot(document.getElementById('root')!).render(<HostedCheckout request={returnContext?{username:'merchant'}:parseCheckoutRequest(buildFixedSaleUrl(fixed))!} returnContext={returnContext} identitySession={{open:async()=>identity,import:async()=>identity,close(){controller.dispose();}}}/>);
 Object.assign(window,{counterFixture:{controller,data,async creditCard(){if(!data.cardPaid){data.balance+=data.funded;data.cardPaid=true;persist();}await controller.check();},async confirmNote(){if(!data.notePaid){data.balance+=1000;data.notePaid=true;persist();}dispatchEvent(new Event('bankeiz:note-history-recorded'));},restoreOutcome(){lost=false;},async check(){await controller.check();}}});
}
