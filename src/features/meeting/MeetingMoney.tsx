import{useEffect,useMemo,useRef,useState,useSyncExternalStore}from'react';
import type{SharedWallet}from'../../receiz/shared-wallet';
import type{OpenIdentity}from'../../receiz/native-identity';
import type{ChatPerson}from'../../receiz/native-messaging';
import{createMeetingPayments}from'../../receiz/meeting-payments';
import{MeetingMoneyView}from'./MeetingMoneyView';
import{InlineOpening}from'../../components/InlineOpening';
import{ReceizCardCheckout}from'../deposit/ReceizCardCheckout';
const balanceOf=(wallet:SharedWallet|undefined)=>wallet&&(wallet.projectionComplete||wallet.accountOnlyComplete)?wallet.totalUsdCents:null;
export function MeetingMoney({identity,conversationId,viewerId,members,active,onBack,onRecorded}:{identity:OpenIdentity;conversationId:string;viewerId:string;members:readonly ChatPerson[];active:boolean;onBack():void;onRecorded():void}){
 const current=useRef({members,onRecorded});current.current={members,onRecorded};
 const controller=useMemo(()=>createMeetingPayments({conversationId,viewerId,members:()=>current.current.members,wallet:async()=>{if(!identity.walletSend)throw Error('Open your account to send money.');return identity.walletSend();},onRecorded:()=>current.current.onRecorded()}),[identity,conversationId,viewerId]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),peers=members.filter(p=>p.kind==='user'&&p.userId!==viewerId),[selected,setSelected]=useState(''),[amount,setAmount]=useState(''),[editing,setEditing]=useState(false),[balance,setBalance]=useState<string|null>(()=>balanceOf(identity.knownWallet()?.wallet));
 const recipient=peers.length===1?peers[0].userId:peers.some(p=>p.userId===selected)?selected:'';
 useEffect(()=>{void controller.open();return()=>controller.close();},[controller]);
 useEffect(()=>{let live=true;const sync=()=>{const known=balanceOf(identity.knownWallet()?.wallet);if(live&&known!==null)setBalance(known);};sync();if(balanceOf(identity.knownWallet()?.wallet)===null)void identity.readWallet().then(value=>{if(live)setBalance(balanceOf(value));}).catch(()=>{});addEventListener('bankeiz:wallet-send-recorded',sync);return()=>{live=false;removeEventListener('bankeiz:wallet-send-recorded',sync);};},[identity]);
 const funding=state.outcome?.status==='funding'?state.outcome:null,viewState=editing&&state.outcome?.status==='recorded'?{...state,outcome:null,receipt:null}:state;
 return <div className="meeting-money-holder" hidden={!active}><MeetingMoneyView state={viewState} members={peers} recipient={recipient} amount={amount} balance={balance} onRecipient={setSelected} onAmount={setAmount} onSend={()=>{setEditing(false);void controller.send(recipient,amount);}} onBack={onBack} onCheck={()=>void controller.check()} onCancel={()=>void controller.cancel()} onRetry={()=>void controller.open()} onAnother={()=>{setAmount('');setEditing(true);}} checkout={funding?.checkout?<ReceizCardCheckout loading={<InlineOpening compact label="Preparing secure payment"/>} purpose="payment" checkout={funding.checkout} onCheck={()=>controller.check()}/>:funding?<button className="meeting-money-text" disabled={state.busy} onClick={()=>void controller.check()}>Check secure checkout</button>:undefined}/></div>;
}
