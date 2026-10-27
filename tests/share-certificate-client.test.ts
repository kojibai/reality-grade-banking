import {expect,it} from 'vitest';
import {createShareCertificates,readCertificateState,shareCertificatePath} from '../src/receiz/share-certificates';
const uid='00000000-0000-4000-8000-000000000001',token='certificate-test-token-one';
const state=()=>({note:{noteToken:token,title:'Wheat',status:'minted',mintedAt:'2026-10-26T12:00:00Z',originalShareQuantityMicro:'10000000',remainingShareQuantityMicro:'10000000',remainingCostBasisUsdCents:'10000',lastPriceUsdCents:'100',historyEvents:[]},item:{id:'asset:wheat',title:'Wheat',priceUsd:1},viewer:{signedIn:true,isOwner:true,canTrade:true,wallet:null,livePosition:null}});
it('rejects a foreign certificate state and keeps quantities as exact strings',()=>{expect(readCertificateState({ok:true,state:state()},token).note.remainingShareQuantityMicro).toBe('10000000');expect(()=>readCertificateState({ok:true,state:state()},'another-certificate-token')).toThrow();expect(shareCertificatePath(token)).toBe('/shares/'+token+'/');});
it('retains the exact purchase before sending and recovers the same nonce after a lost response',async()=>{
 let saved:any=null,requests:any[]=[],lose=true;const api=createShareCertificates({identityDigest:'a'.repeat(64),assertOpen(){},guard:async()=>{},lock:async work=>work(),store:{read:async()=>saved,write:async(next,previous)=>{expect(saved).toEqual(previous);saved=structuredClone(next);}},archive:{retain:async()=> 'b'.repeat(64),restore:async()=>new Uint8Array([1])},connect:async()=>({accountUid:uid,fetch:async(_path,init)=>{expect(saved.current.status).toBe('pending');requests.push(JSON.parse(String(init?.body)));if(lose){lose=false;throw Error('lost response');}return Response.json({ok:true,state:state()},{headers:{'x-receiz-actor-user':uid}});}})});
 const first=await api.trade(token,'buy','2500');expect(first.status).toBe('pending');expect((await api.resume()).status).toBe('complete');expect(requests).toHaveLength(2);expect(requests[0]).toEqual(requests[1]);expect(saved.current.body.amountUsd).toBe('25.00');
});
it('does not accept a success response bound to another account',async()=>{
 let saved:any=null;const api=createShareCertificates({identityDigest:'a'.repeat(64),assertOpen(){},guard:async()=>{},lock:async work=>work(),store:{read:async()=>saved,write:async next=>{saved=structuredClone(next);}},archive:{retain:async()=> 'b'.repeat(64),restore:async()=>new Uint8Array([1])},connect:async()=>({accountUid:uid,fetch:async()=>Response.json({ok:true,state:state()},{headers:{'x-receiz-actor-user':'different-owner'}})})});
 expect((await api.trade(token,'buy','2500')).status).toBe('pending');expect(saved.current.status).toBe('pending');
});
it('retains a certificate purchase target across funding return instead of buying the underlying asset by mistake',async()=>{
 const {retainPublicPurchase,publicPurchaseReturnLink,publicPurchaseAtLocation}=await import('../src/receiz/public-purchase-checkpoint');
 const memory=new Map<string,string>();Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)}});Object.defineProperty(globalThis,'location',{configurable:true,value:{pathname:'/shares/'+token+'/',hash:''}});Object.defineProperty(globalThis,'dispatchEvent',{configurable:true,value:()=>true});Object.defineProperty(globalThis,'CustomEvent',{configurable:true,value:Event});
 retainPublicPurchase({itemId:'asset:wheat',title:'Wheat',side:'buy',certificateToken:token,initialBudget:'25.00'},{sessionId:'cs_certificate_funding_one',amountUsdCents:'2000'},'deposit');
 expect(publicPurchaseReturnLink('cs_certificate_funding_one')).toBe('/shares/'+token+'/#resumeCardSession=cs_certificate_funding_one');expect(publicPurchaseAtLocation()?.certificateToken).toBe(token);expect(publicPurchaseAtLocation()?.purchaseBudgetUsdCents).toBe('2500');
});
it('a durable closure frees a rejected attempt, while a raced committed original wins cancellation',async()=>{
 for(const closed of [true,false]){
 let saved:any=null,first=true,executedNonce='';
 const api=createShareCertificates({identityDigest:'a'.repeat(64),assertOpen(){},guard:async()=>{},lock:async work=>work(),store:{read:async()=>saved,write:async next=>{saved=structuredClone(next);}},archive:{retain:async()=> 'b'.repeat(64),restore:async()=>new Uint8Array([1])},connect:async()=>({accountUid:uid,fetch:async(path,init)=>{const body=JSON.parse(String(init?.body));if(path.endsWith('/operations/close'))return Response.json({ok:true,outcome:{closed,clientNonce:saved.current.body.clientNonce,kind:'trade'}},{headers:{'x-receiz-actor-user':uid}});executedNonce=body.clientNonce;if(first){first=false;throw Error('lost response');}return Response.json({ok:true,state:state()},{headers:{'x-receiz-actor-user':uid}});}})});
 expect((await api.trade(token,'buy','2500')).status).toBe('pending');const original=executedNonce;expect((await api.cancel()).status).toBe(closed?'rejected':'complete');expect(executedNonce).toBe(original);expect(saved.current.body.clientNonce).toBe(original);
 }
});
