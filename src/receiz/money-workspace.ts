import {moneyActionFingerprint} from './money-tools';
import {buildFixedSaleUrl} from './fixed-checkout';
import {formatMoney} from '../core/money';
import type {MerchantCounterController} from './merchant-counter';
import type {NativeMessages} from './native-messaging';

export type MoneyAction={tool:string;args:Record<string,unknown>};
export type MoneyTurn={requestId:string;humanText:string;humanTurnId?:string};
export type MoneyReceipt={id:string;tool:string;status:'accepted'|'refused'|'unknown'|'needs-confirmation';summary:string;data?:Record<string,unknown>};
export type MoneyCommitment={id:string;title:string;direction:'receivable'|'payable';counterparty:string;amountUsdCents:string;dueAt:string;note:string;status:'open'|'cancelled'|'reported-completed';source:MoneyTurn;requests:string[]};
type Review={id:string;commitmentId:string;saleId:string;amountUsdCents:string;username:string;recipientUserId:string;body:string;source:MoneyTurn;status:'reviewed'|'sending'|'sent'|'unknown';messageId?:string};
export type MoneyState={schema:'bank.money-workspace.v1';identityDigest:string;accountUid:string;revision:number;activeReviewId?:string|null;activeReviewHumanTurnId?:string|null;commitments:MoneyCommitment[];reviews:Review[];operations:Record<string,{fingerprint:string;receipt:MoneyReceipt}>;journal?:{cursor:string|null;pending:import('./money-continuity').MoneyJournalEvent[]}};
export const moneyToolNames=['money_find_person','money_search_history','money_list_commitments','money_record_commitment','money_cancel_commitment','money_report_completed','money_prepare_request','money_check_payments','money_review_message','money_send_reviewed'] as const;
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const amount=(v:unknown):v is string=>typeof v==='string'&&/^[1-9]\d{0,24}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
function exact(v:Record<string,unknown>,keys:string[]){if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('MONEY_INPUT_INVALID');}
export function readMoneyState(raw:unknown,identityDigest:string,accountUid:string):MoneyState{
 if(raw==null)return{schema:'bank.money-workspace.v1',identityDigest,accountUid,revision:0,commitments:[],reviews:[],operations:{}};
 if(!object(raw)||raw.identityDigest!==identityDigest||raw.accountUid!==accountUid)throw Error('MONEY_OWNER_MISMATCH');
 if(raw.journal!==undefined&&(!object(raw.journal)||raw.journal.cursor!==null&&typeof raw.journal.cursor!=='string'||!Array.isArray(raw.journal.pending)))throw Error('MONEY_JOURNAL_INVALID');
 if(raw.schema!=='bank.money-workspace.v1'||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0||!Array.isArray(raw.commitments)||!Array.isArray(raw.reviews)||!object(raw.operations))throw Error('MONEY_STATE_INVALID');
 const ids=new Set<string>();for(const c of raw.commitments as MoneyCommitment[]){if(!c||!text(c.id,160)||ids.has(c.id)||!text(c.title,160)||!['receivable','payable'].includes(c.direction)||!text(c.counterparty,160)||!amount(c.amountUsdCents)||!date(c.dueAt)||typeof c.note!=='string'||c.note.length>1000||!['open','cancelled','reported-completed'].includes(c.status)||!c.source||!text(c.source.requestId,160)||!text(c.source.humanText,1200)||!Array.isArray(c.requests)||c.requests.some(id=>!text(id,160)))throw Error('MONEY_STATE_INVALID');ids.add(c.id);}
 for(const r of raw.reviews as Review[]){if(!r||!text(r.id,160)||!ids.has(r.commitmentId)||!text(r.saleId,160)||!amount(r.amountUsdCents)||!text(r.username,24)||!text(r.recipientUserId,160)||!text(r.body,4000)||!r.source||!text(r.source.requestId,160)||!['reviewed','sending','sent','unknown'].includes(r.status))throw Error('MONEY_STATE_INVALID');}
 for(const [id,op]of Object.entries(raw.operations)){if(!text(id,160)||!object(op)||!text(op.fingerprint,24000)||!object(op.receipt)||op.receipt.id!==id||!['accepted','refused','unknown','needs-confirmation'].includes(String(op.receipt.status)))throw Error('MONEY_STATE_INVALID');}
 return structuredClone(raw) as MoneyState;
}
/** Owner planning data stays beneath actual settlement. Only merchant's existing
 * exact transfer-original verifier supplies paid amounts. Never writes money. */
export function createMoneyWorkspace(input:{accountUid:string;identityDigest:string;assertOpen():void;store:{read():Promise<unknown>;write(next:MoneyState,expected:unknown):Promise<void>};lock<T>(work:()=>Promise<T>):Promise<T>;counter():Promise<MerchantCounterController>;messages():Promise<Pick<NativeMessages,'search'|'createConversation'|'send'>>;history(query:Record<string,unknown>):Promise<unknown>;journal?:import('./money-continuity').MoneyJournal}){
 const make=(id:string,tool:string,status:MoneyReceipt['status'],summary:string,data?:Record<string,unknown>):MoneyReceipt=>({id,tool,status,summary,...(data?{data}:{})});
 const displayedReviews=new Map<string,string>();
 let syncFlight:Promise<void>|null=null,initialized=false;
 async function synchronize():Promise<void>{
  if(!input.journal)return;if(syncFlight)return syncFlight;
  const work=async()=>{
   const {readMoneyJournalEvent,moneyJournalPayload,mergeMoneyJournalEvent}=await import('./money-continuity');
   for(let drain=0;drain<16;drain++){
    input.assertOpen();let snapshot=await input.store.read();input.assertOpen();let current=readMoneyState(snapshot,input.identityDigest,input.accountUid);
    for(const raw of current.journal?.pending??[]){
     const event=readMoneyJournalEvent(raw,input.accountUid);await input.journal!.append(event);input.assertOpen();
     await input.lock(async()=>{const held=await input.store.read();input.assertOpen();const fresh=readMoneyState(held,input.identityDigest,input.accountUid);fresh.journal??={cursor:null,pending:[]};fresh.journal.pending=fresh.journal.pending.filter(e=>e.operationId!==event.operationId);fresh.revision++;await input.store.write(fresh,held);});
    }
    snapshot=await input.store.read();input.assertOpen();current=readMoneyState(snapshot,input.identityDigest,input.accountUid);let cursor=current.journal?.cursor??undefined;
    for(let pageNumber=0;pageNumber<1000;pageNumber++){
     const page=await input.journal!.read(cursor);input.assertOpen();
     for(const raw of page.events){const event=readMoneyJournalEvent(raw,input.accountUid),data=moneyJournalPayload(event);for(const request of data.requests){const counter=await input.counter();await counter.adoptRequest(request);input.assertOpen();}}
     if(page.events.length||page.resumeCursor!==null&&page.resumeCursor!==cursor)await input.lock(async()=>{const held=await input.store.read();input.assertOpen();let fresh=readMoneyState(held,input.identityDigest,input.accountUid);for(const event of page.events)fresh=mergeMoneyJournalEvent(fresh,event);fresh.journal??={cursor:null,pending:[]};fresh.journal.cursor=page.resumeCursor??fresh.journal.cursor;fresh.revision++;await input.store.write(fresh,held);});
     if(!page.hasMore)break;if(!page.nextCursor||page.nextCursor===cursor)throw Error('MONEY_JOURNAL_CURSOR_INVALID');cursor=page.nextCursor;if(pageNumber===999)throw Error('MONEY_JOURNAL_ADMISSION_CONTINUES');
    }
    const latest=readMoneyState(await input.store.read(),input.identityDigest,input.accountUid);if(!latest.journal?.pending.length)return;
   }
  };
  const pending=work();syncFlight=pending;try{await pending;}finally{if(syncFlight===pending)syncFlight=null;}
 }

 async function view(c:MoneyCommitment){let paid=0n;const receipts:string[]=[],requests:{saleId:string;amountUsdCents:string;url:string}[]=[];if(c.requests.length){const counter=await input.counter();for(const id of c.requests){const sale=await counter.sale(id);input.assertOpen();for(const receipt of sale.receipts){if(receipts.includes(receipt.transferId))continue;receipts.push(receipt.transferId);paid+=BigInt(receipt.amountUsdCents);}requests.push({saleId:id,amountUsdCents:sale.request.amountUsdCents,url:buildFixedSaleUrl(sale.request)});}}
  const remaining=BigInt(c.amountUsdCents)>paid?BigInt(c.amountUsdCents)-paid:0n;return{...c,authority:'owner-reported-commitment' as const,verifiedPaidUsdCents:String(paid),outstandingUsdCents:String(remaining),paymentState:remaining===0n?'verified-paid':paid>0n?'partially-paid':'unpaid',verifiedTransferIds:receipts,requests};}
 function projected(row:Awaited<ReturnType<typeof view>>){const{source,note,requests,...data}=row;return{...data,note:note.slice(0,300),sourceRequestId:source.requestId,requests:requests.slice(-5).map(({saleId,amountUsdCents})=>({saleId,amountUsdCents})),requestCount:requests.length,paymentAuthority:'authenticated-native-transfer-original'};}
 async function checkPayments(saleIds?:readonly string[]){const counter=await input.counter();if(saleIds){for(const id of saleIds){await counter.check(new AbortController().signal,[id]);input.assertOpen();if(counter.snapshot().error)return counter.snapshot().error;}return null;}await counter.check(new AbortController().signal);input.assertOpen();return counter.snapshot().error;}
 return Object.freeze({synchronize,clearReviewDisplay(){displayedReviews.clear();},markReviewDisplayed(reviewId:string,humanTurnId:string){displayedReviews.set(reviewId,humanTurnId);},async execute(turn:MoneyTurn,action:MoneyAction):Promise<MoneyReceipt>{
  input.assertOpen();if(!text(turn.requestId,160)||!text(turn.humanText,1200)||!object(action)||!moneyToolNames.includes(action.tool as typeof moneyToolNames[number])||!object(action.args))throw Error('MONEY_INPUT_INVALID');
  if(!/^[A-Za-z0-9][A-Za-z0-9:_-]{7,159}$/.test(turn.requestId)||['constructor','prototype','__proto__'].includes(turn.requestId))throw Error('MONEY_INPUT_INVALID');
  const id=turn.requestId,tool=action.tool,args=action.args;
  if(tool==='money_find_person'){exact(args,['query']);if(!text(args.query,100))throw Error('MONEY_INPUT_INVALID');const api=await input.messages(),people=await api.search(args.query);input.assertOpen();return make(id,tool,'accepted','People matching your existing account directory.',{people:people.map(({userId,username,displayName})=>({userId,username,displayName})),authority:'native-account-directory'});}
  if(tool==='money_search_history')return make(id,tool,'accepted','Financial history from your retained account source.',await input.history(args) as Record<string,unknown>);
  if(input.journal&&tool==='money_send_reviewed'){if(syncFlight)await syncFlight;await synchronize();}
  if(input.journal&&!initialized){initialized=true;const held=await input.store.read();input.assertOpen();if(held===null&&tool!=='money_record_commitment')await synchronize();else void synchronize().catch(()=>{});}
  return input.lock(async()=>{
   input.assertOpen();const previous=await input.store.read();input.assertOpen();const state=readMoneyState(previous,input.identityDigest,input.accountUid),before=structuredClone(state),fingerprint=moneyActionFingerprint(action),known=state.operations[id];
   if(known){if(known.fingerprint!==fingerprint)throw Error('MONEY_ACTION_CHANGED');return known.receipt;}
   const save=async()=>{input.assertOpen();state.revision++;await input.store.write(state,held);held=structuredClone(state);input.assertOpen();};let held:unknown=previous;
   const get=()=>{if(!text(args.id,160))throw Error('MONEY_COMMITMENT_REQUIRED');const c=state.commitments.find(c=>c.id===args.id);if(!c)throw Error('MONEY_COMMITMENT_NOT_FOUND');return c;};
   if(tool==='money_check_payments'){exact(args,[]);const attention=await checkPayments(),data=await Promise.all(state.commitments.slice(0,20).map(view));return make(id,tool,'accepted','Checked native payment originals. Unconfirmed observations have not marked anything paid.',{commitments:data.map(projected),count:state.commitments.length,nextOffset:state.commitments.length>20?20:null,verificationAttention:attention,coverage:'First 20 tracked commitments. Use money_list_commitments to read more. An incomplete payment check does not establish unpaid status.'});}
   if(tool==='money_list_commitments'){
    exact(args,['direction','dueBefore','query','includeClosed','offset','limit']);if(args.direction!==undefined&&!['receivable','payable'].includes(String(args.direction))||args.dueBefore!==undefined&&!date(args.dueBefore)||args.query!==undefined&&typeof args.query!=='string'||args.includeClosed!==undefined&&typeof args.includeClosed!=='boolean')throw Error('MONEY_INPUT_INVALID');
    const offset=args.offset??0,limit=args.limit??10;if(!Number.isSafeInteger(offset)||Number(offset)<0||!Number.isSafeInteger(limit)||Number(limit)<1||Number(limit)>20)throw Error('MONEY_INPUT_INVALID');
    const attention=state.commitments.some(c=>c.requests.length)?await checkPayments():null;
    const rows=await Promise.all(state.commitments.filter(c=>(args.includeClosed||c.status==='open')&&(!args.direction||args.direction===c.direction)&&(!args.dueBefore||c.dueAt<=String(args.dueBefore))&&(!args.query||`${c.title} ${c.counterparty} ${c.note}`.toLowerCase().includes(String(args.query).toLowerCase()))).map(view));input.assertOpen();const open=rows.filter(c=>args.includeClosed||c.paymentState!=='verified-paid').sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.id.localeCompare(b.id));
    return make(id,tool,'accepted','Your tracked commitments. These are reported amounts; verified receipts are shown separately.',{authority:'owner-reported-commitments',count:open.length,totalOutstandingUsdCents:String(open.reduce((sum,c)=>sum+BigInt(c.outstandingUsdCents),0n)),verificationAttention:attention,commitments:open.slice(Number(offset),Number(offset)+Number(limit)).map(projected),nextOffset:Number(offset)+Number(limit)<open.length?Number(offset)+Number(limit):null,coverage:'Tracked commitments only; outside accounts and undeclared bills are not included.'});
   }
   // Retain exact operation before any effect. An interrupted write is unknown,
   // never automatically repeated after reload or a new generated tool call.
   state.operations[id]={fingerprint,receipt:make(id,tool,'unknown','This operation needs checking before it can be repeated.')};await save();
   let result:MoneyReceipt;
   try{
    if(tool==='money_record_commitment'){
     exact(args,['title','direction','counterparty','amountUsdCents','dueAt','note']);if(!text(args.title,160)||!['receivable','payable'].includes(String(args.direction))||!text(args.counterparty,160)||!amount(args.amountUsdCents)||!date(args.dueAt)||args.note!==undefined&&(typeof args.note!=='string'||args.note.length>1000))throw Error('MONEY_INPUT_INVALID');
     const c:MoneyCommitment={id:crypto.randomUUID(),title:args.title,direction:args.direction as MoneyCommitment['direction'],counterparty:args.counterparty,amountUsdCents:args.amountUsdCents,dueAt:args.dueAt,note:String(args.note??''),status:'open',source:{...turn},requests:[]};state.commitments.push(c);result=make(id,tool,'accepted','Commitment saved privately. This records what you told me; it does not move or create money.',{...c,authority:'owner-reported-commitment'});
    }else if(tool==='money_cancel_commitment'||tool==='money_report_completed'){
     exact(args,['id']);const c=get();c.status=tool==='money_cancel_commitment'?'cancelled':'reported-completed';result=make(id,tool,'accepted',c.status==='cancelled'?'Commitment cancelled; its history is preserved.':'Recorded as completed by you. This is not independent payment verification.',{id:c.id,status:c.status});
    }else if(tool==='money_prepare_request'){
     exact(args,['id','amountUsdCents']);const c=get();if(c.status!=='open'||c.direction!=='receivable')throw Error('MONEY_RECEIVABLE_REQUIRED');if(await checkPayments(c.requests))throw Error('MONEY_PAYMENT_CHECK_INCOMPLETE');const current=await view(c),remaining=BigInt(current.outstandingUsdCents),wanted=args.amountUsdCents??current.outstandingUsdCents;if(!amount(wanted)||BigInt(wanted)>remaining)throw Error('MONEY_REQUEST_AMOUNT_INVALID');
     // Reuse an existing unpaid checkout for this exact installment.
     const counter=await input.counter();let sale;for(const request of current.requests){const candidate=await counter.sale(request.saleId);if(!candidate.receipts.length){if(candidate.request.amountUsdCents!==wanted)throw Error('MONEY_OPEN_REQUEST_EXISTS');sale=candidate;break;}}
     if(!sale){const saleId=crypto.randomUUID();sale=await counter.request(saleId,wanted);input.assertOpen();c.requests.push(saleId);}
     result=make(id,tool,'accepted','Payment request ready. It has not been sent.',{id:c.id,saleId:sale.request.saleId,amountUsdCents:sale.request.amountUsdCents,url:buildFixedSaleUrl(sale.request)});
    }else if(tool==='money_review_message'){
     exact(args,['id','username','message']);const c=get();if(c.status!=='open'||c.direction!=='receivable'||!c.requests.length)throw Error('MONEY_REQUEST_REQUIRED');if(!text(args.username,24)||!/^@?[a-z0-9_]{3,24}$/.test(args.username)||args.message!==undefined&&!text(args.message,1500))throw Error('MONEY_INPUT_INVALID');
     if(await checkPayments([c.requests.at(-1)!]))throw Error('MONEY_PAYMENT_CHECK_INCOMPLETE');const counter=await input.counter(),sale=await counter.sale(c.requests.at(-1)!);if(sale.receipts.length)throw Error('MONEY_REQUEST_ALREADY_PAID');const api=await input.messages(),username=args.username.replace(/^@/,''),matches=(await api.search(username)).filter(p=>p.username===username&&p.userId!==input.accountUid);input.assertOpen();if(matches.length!==1)throw Error('MONEY_RECIPIENT_UNRESOLVED');
     const body=`${args.message??`Payment request for ${c.title}: ${formatMoney(sale.request.amountUsdCents)}.`}\n${buildFixedSaleUrl(sale.request)}`;
     const review:Review={id:crypto.randomUUID(),commitmentId:c.id,saleId:sale.request.saleId,amountUsdCents:sale.request.amountUsdCents,username,recipientUserId:matches[0].userId,body,source:{...turn},status:'reviewed'};state.reviews.push(review);state.activeReviewId=review.id;state.activeReviewHumanTurnId=turn.humanTurnId??turn.requestId;result=make(id,tool,'needs-confirmation','Ready to send. Reply “send it” to send this exact message.',{reviewId:review.id,username,body,amountUsdCents:review.amountUsdCents});
    }else if(tool==='money_send_reviewed'){
     exact(args,['reviewId']);const review=state.reviews.find(r=>r.id===args.reviewId);if(!review)throw Error('MONEY_REVIEW_REQUIRED');
     if(review.status!=='reviewed')result=make(id,tool,review.status==='sent'?'accepted':'unknown',review.status==='sent'?'This exact message was already sent.':'Delivery is not confirmed. I have not sent it again.',{reviewId:review.id,messageId:review.messageId??null});
     else if(!displayedReviews.has(review.id)||state.activeReviewId!==review.id){state.activeReviewId=review.id;state.activeReviewHumanTurnId=turn.humanTurnId??turn.requestId;result=make(id,tool,'needs-confirmation','Review the exact recipient and message here, then reply “send it”.',{reviewId:review.id,username:review.username,body:review.body,amountUsdCents:review.amountUsdCents});}
     else if(displayedReviews.get(review.id)===(turn.humanTurnId??turn.requestId)||state.activeReviewHumanTurnId===(turn.humanTurnId??turn.requestId)||!/^\s*(?:yes[,!. ]*)?(?:send(?:\s+(?:it|that|this|the message|the request))?|go ahead|confirm)(?:\s+please)?[.! ]*\s*$/i.test(turn.humanText))result=make(id,tool,'needs-confirmation','Reply “send it” to confirm the exact recipient and message shown above.',{reviewId:review.id,username:review.username,body:review.body,amountUsdCents:review.amountUsdCents});
     else{
      const c=state.commitments.find(c=>c.id===review.commitmentId);if(!c||c.status!=='open')throw Error('MONEY_COMMITMENT_CLOSED');const counter=await input.counter();await counter.check(new AbortController().signal,[review.saleId]);input.assertOpen();if(counter.snapshot().error)throw Error('MONEY_PAYMENT_CHECK_INCOMPLETE');const sale=await counter.sale(review.saleId);if(sale.receipts.length)throw Error('MONEY_REQUEST_ALREADY_PAID');
      review.status='sending';await save();if(input.journal&&!await input.journal.claim(review))throw Error('MONEY_DELIVERY_ALREADY_CLAIMED');input.assertOpen();const api=await input.messages();const conversationId=await api.createConversation({participantUserIds:[review.recipientUserId]});input.assertOpen();const message=await api.send(conversationId,review.body);input.assertOpen();if(!message?.id)throw Error('MONEY_SEND_UNCONFIRMED');review.status='sent';review.messageId=message.id;result=make(id,tool,'accepted','Payment request sent in your existing messages.',{reviewId:review.id,messageId:message.id,username:review.username});
     }
    }else throw Error('MONEY_TOOL_UNAVAILABLE');
   }catch(cause){input.assertOpen();const review=state.reviews.find(r=>r.status==='sending');if(review)review.status='unknown';const unknown=!!review;result=make(id,tool,unknown?'unknown':'refused',unknown?'Delivery is not confirmed. Check the existing conversation; I have not sent it again.':cause instanceof Error?cause.message:'Money task needs checking.');}
   state.operations[id]={fingerprint,receipt:result};
   if(input.journal){
    const commitments=state.commitments.filter(c=>JSON.stringify(c)!==JSON.stringify(before.commitments.find(prior=>prior.id===c.id))),reviews=state.reviews.filter(r=>JSON.stringify(r)!==JSON.stringify(before.reviews.find(prior=>prior.id===r.id))),requests:import('./fixed-checkout').FixedSale[]=[];
    for(const c of commitments)for(const saleId of c.requests)if(!before.commitments.find(prior=>prior.id===c.id)?.requests.includes(saleId))requests.push((await(await input.counter()).sale(saleId)).request);
    const event={schema:'bank.money-planning-event.v1' as const,ownerUid:input.accountUid,operationId:id,data:JSON.stringify({source:{...turn},fingerprint,receipt:result,commitments,reviews,requests})};if(event.data.length>24000)throw Error('MONEY_JOURNAL_CAPACITY');state.journal??={cursor:null,pending:[]};state.journal.pending.push(event);
   }
   await save();if(input.journal)void synchronize().catch(()=>{});return result;
  });
 }});
}
export type MoneyWorkspace=ReturnType<typeof createMoneyWorkspace>;
