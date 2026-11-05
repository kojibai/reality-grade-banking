import {openVerifiedEmailAccount} from './pbi-account';
export type EmailPaymentObservation={ok:true;authority:'wallet-observation';recipient:{userId:string;email:string};payment:{id:string;clientNonce:string;amountUsdCents:string;senderUserId?:string}};
export type EmailPaymentEntryState=EmailPaymentObservation|{ok:true;pending:true;autoContinue:boolean}|{ok:true;invitation:false};
const base='/api/bank/native/email-payment/';
async function request(operation:'state'|'open'){
 const response=await fetch(base+operation,{method:operation==='open'?'POST':'GET',credentials:'same-origin',redirect:'error',cache:'no-store',headers:operation==='open'?{'Content-Type':'application/json',Accept:'application/json'}:{Accept:'application/json'},...(operation==='open'?{body:'{}'}:{}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok||result?.ok!==true)throw Error('This payment invitation could not be verified. Use the original payment email and try again.');return result;
}
function observation(value:EmailPaymentObservation):EmailPaymentObservation{
 if(value.authority!=='wallet-observation'||typeof value.recipient?.userId!=='string'||!value.recipient.email||typeof value.payment?.id!=='string'||typeof value.payment.amountUsdCents!=='string'||!/^[1-9]\d*$/.test(value.payment.amountUsdCents))throw Error('This payment could not be verified.');return value;
}
export async function readEmailPaymentEntry():Promise<EmailPaymentEntryState>{
 const value=await request('state');if(value.invitation===false){if(Object.keys(value).sort().join('|')!=='invitation|ok')throw Error('This payment could not be verified.');return{ok:true,invitation:false};}if(value.pending===true)return{ok:true,pending:true,autoContinue:value.autoContinue===true};const verified=observation(value);return{ok:true,authority:verified.authority,recipient:verified.recipient,payment:verified.payment};
}
let opening:Promise<EmailPaymentObservation>|null=null;
/** One physical entry across React's replay. The Source session and payment
 * are checked before any local identity is read, bound or retained. */
export function openEmailPayment():Promise<EmailPaymentObservation>{
 if(opening)return opening;
 const work=(async()=>{const value=observation(await request('open')),identity=await openVerifiedEmailAccount(value.recipient.userId);identity.dispose();return value;})();
 opening=work;void work.finally(()=>{if(opening===work)opening=null;}).catch(()=>{});return work;
}
