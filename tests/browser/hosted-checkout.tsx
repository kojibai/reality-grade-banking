import {createRoot} from 'react-dom/client';
import {HostedCheckout} from '../../src/checkout/HostedCheckout';
import {createHostedCheckout} from '../../src/receiz/hosted-checkout';
import {createWalletSend} from '../../src/receiz/wallet-send';
import {syntheticWalletRecord} from '../fixtures/wallet-send';
import type {HostedCheckoutState,CheckoutNoteEntry} from '../../src/receiz/checkout-state';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {SharedWallet} from '../../src/receiz/shared-wallet';
import '../../src/styles/tokens.css';
import '../../src/checkout/checkout.css';
// All data below is synthetic. No live SDK financial operation or enrollment.
const sender='10000000-0000-4000-8000-000000000001',receiver='10000000-0000-4000-8000-000000000002',owner='a'.repeat(64),key='bank-checkout-synthetic-browser';
const query=new URLSearchParams(location.search),mode=query.get('mode')??'balance';
let saved=JSON.parse(sessionStorage.getItem(key)??'null')as {state:HostedCheckoutState|null;wallet:any;balance:number;record:any;cardPaid:boolean;noteConfirmed:boolean;transfers:number;cards:number;deposits:number}|null;
if(!saved)saved={state:null,wallet:null,balance:mode==='balance'?1000:0,record:null,cardPaid:false,noteConfirmed:false,transfers:0,cards:0,deposits:0};
const data=saved,persist=()=>sessionStorage.setItem(key,JSON.stringify(data));let lost=false;
const lock=async<T,>(work:()=>Promise<T>)=>work();
const wallet=createWalletSend({ownerReceizId:'fixture.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock,store:{read:async()=>structuredClone(data.wallet),write:async next=>{data.wallet=next;persist();}},connect:async()=>({accountUid:sender,client:{request:async path=>{
 if(path.startsWith('/api/chat/users/search'))return{ok:true,users:[{kind:'user',username:'merchant',userId:receiver}]};
 if(path.includes('amountUsd='))return{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:data.balance>=1000?'1000':'0',ecosystemUsdCents:data.balance>=1000?'0':'1000',fundingRule:'settled_first_then_phi'}};
 if(path==='/api/chat/conversations')return{ok:true,conversation:{id:'10000000-0000-4000-8000-000000000003'}};
 if(path==='/api/connect/wallet/me')return{ok:true,wallet:{userId:sender,balanceUsd:(data.balance/100).toFixed(2),balancePhiMicro:'10000000',valueStates:{settledBalanceUsdCents:String(data.balance),ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{}}};
 return lost?{ok:true,found:false}:data.record??{ok:true,found:false};
 },connect:{transfer:async body=>{if(data.balance<1000)throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});data.balance-=1000;data.transfers++;data.record=syntheticWalletRecord(body,sender);persist();return data.record;}}}}),funding:{begin:async()=>{data.cards++;persist();return{sessionId:'cs_test_browseroriginal',clientSecret:'synthetic-never-a-live-secret',amountUsdCents:'1000'};},check:async(_checkout,beforeCredit)=>{if(data.cardPaid)await beforeCredit();return{status:data.cardPaid?'credited':'open'};}}});
function note(rail:'reserve'|'settlement'|'composite'):CheckoutNoteEntry{return{sourceDigest:'b'.repeat(64),sourceRef:'b'.repeat(64),noteId:'10000000-0000-4000-8000-000000000008',rail,status:'inspected',inspection:{noteId:'10000000-0000-4000-8000-000000000008',rail,amountUsdCents:'1000',amountPhiMicro:'10000000'}};}
const controller=createHostedCheckout({identityDigest:owner,assertCurrent(){},walletSend:async()=>wallet,lock,store:{read:async()=>structuredClone(data.state),write:async next=>{data.state=next;persist();}},readWallet:async()=>({userId:sender,totalUsdCents:String(data.balance),reserveUsdCents:String(data.balance),settlementUsdCents:'0',projectionComplete:true})as SharedWallet,notes:{inspect:async file=>note(file.name.includes('composite')?'composite':file.name.includes('settlement')?'settlement':'reserve'),deposit:async entry=>{data.deposits++;persist();return{...entry,status:'received'};},check:async entry=>data.noteConfirmed?{...entry,status:'confirmed',creditSourceDigest:'c'.repeat(64)}:entry}});
const identity={hostedCheckout:async()=>controller,knownWallet:()=>({wallet:{totalUsdCents:String(data.balance)}}),backup:()=>({bytes:new TextEncoder().encode('synthetic identity record; not a real identity'),filename:'synthetic-identity.txt',phrase:''})}as unknown as OpenIdentity;
const session={open:async()=>identity,import:async()=>identity,close(){controller.dispose();}};
const last=data.state?.current.approval??data.state?.history.at(-1)?.approval;
const returnContext=query.has('return')&&last?{username:'merchant',checkoutId:last.checkoutId,sessionId:query.get('return')==='wrong'?'cs_test_unrelatedsession':'cs_test_browseroriginal'}:undefined;
createRoot(document.getElementById('root')!).render(<HostedCheckout request={{username:'merchant',amount:'10.00'}} identitySession={session} returnContext={returnContext}/>);
Object.assign(window,{checkoutFixture:{controller,data,async creditCard(){if(!data.cardPaid){data.balance+=1000;data.cardPaid=true;persist();}await controller.check();},async confirmNote(){if(!data.noteConfirmed){data.balance+=1000;data.noteConfirmed=true;persist();}dispatchEvent(new Event('bankeiz:note-history-recorded'));},loseOutcome(value:boolean){lost=value;},async check(){await controller.check();},async custody(){const vault=await import('../../src/receiz/identity-vault');await vault.saveDeviceIdentity(new Uint8Array([1,2,3]),'synthetic.png','',true);await vault.saveDeviceIdentity(new Uint8Array([4,5,6]),'replacement.png','',true);const result=await vault.loadDeviceIdentity();await vault.forgetDeviceIdentity();return{bytes:[...result!.bytes],cleared:await vault.loadDeviceIdentity()===null};}}});
