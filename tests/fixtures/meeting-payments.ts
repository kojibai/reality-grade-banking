import {vi} from 'vitest';
import {createWalletSend,type WalletSendState} from '../../src/receiz/wallet-send';
import {syntheticWalletRecord} from './wallet-send';
export const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003',other='10000000-0000-4000-8000-000000000004';
export function meetingWallet(balance='1000'){
 let state:WalletSendState|null=null,record:any=null,paid=false,refuse=false,uid=sender,unknown=false;let tail=Promise.resolve();
 const request=vi.fn(async(path:string)=>{
  if(path.includes('amountUsd=')){const amount=new URL(path,'https://example.invalid').searchParams.get('amountUsd')!,[whole,fraction]=amount.split('.'),cents=String(BigInt(whole)*100n+BigInt(fraction));return{ok:true,senderUserId:uid,quote:{amountUsdCents:cents,amountPhiMicro:String(BigInt(cents)*10000n),usdPerPhiMicrocents:'100000000',settledUsdCents:'0',ecosystemUsdCents:cents,fundingRule:'settled_first_then_phi'}};}
  if(path==='/api/chat/conversations')return{ok:true,conversation:{id:other}};
  if(path==='/api/connect/wallet/me')return{ok:true,wallet:{userId:uid,balanceUsd:`${BigInt(balance)/100n}.${String(BigInt(balance)%100n).padStart(2,'0')}`,balancePhiMicro:'0',valueStates:{settledBalanceUsdCents:balance,ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{}}};
  return record??{ok:true,found:false};
 });
 const transfer=vi.fn(async(body:any)=>{if(unknown)throw Error('response lost');if(refuse&&!paid)throw Object.assign(Error('insufficient'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});record=syntheticWalletRecord(body,sender);return record;});
 const begin=vi.fn(async(amount:string)=>({sessionId:'cs_test_meeting_payment',clientSecret:'synthetic-not-live',amountUsdCents:String(BigInt(amount.split('.')[0])*100n+BigInt(amount.split('.')[1]))}));
 const check=vi.fn(async(_checkout:any,before:()=>Promise<void>)=>{if(paid)await before();return{status:paid?'credited' as const:'open' as const};});
 const options={ownerReceizId:'sender.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:<T,>(work:()=>Promise<T>):Promise<T>=>{const next=tail.then(work);tail=next.then(()=>{},()=>{});return next;},store:{read:async()=>state,write:async(next:WalletSendState)=>{state=structuredClone(next);}},connect:async()=>({accountUid:uid,client:{request,connect:{transfer}}}),funding:{begin,check}};
 return{api:createWalletSend(options),options,request,transfer,begin,check,get state(){return state!;},set balance(value:string){balance=value;},set paid(value:boolean){paid=value;},set refuse(value:boolean){refuse=value;},set uid(value:string){uid=value;},set unknown(value:boolean){unknown=value;}};
}
