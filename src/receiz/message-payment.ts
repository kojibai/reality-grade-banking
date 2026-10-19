import type {ChatMessage} from './native-messaging';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,24})$/.test(v);
function receiptHref(raw:unknown){
 if(typeof raw!=='string'||raw.length>4096)return null;
 try{const url=new URL(raw,'https://receiz.com');return url.origin==='https://receiz.com'&&!url.username&&!url.password&&/^\/(transactions|t)\/.+/.test(url.pathname)?url.href:null;}catch{return null;}
}
/** Presentation of the native message's payment payload. This does not turn
 * a server observation or ordinary prose into independently verified proof. */
export function readMessagePayment(message:ChatMessage,accountUid:string){
 const value=message.walletTransfer;
 if(!value||value.kind!=='chat_transfer'||value.senderUserId!==message.senderUserId||!uuid.test(String(value.senderUserId))||!uuid.test(String(value.recipientUserId))||!uint(value.amountUsdCents)||!uint(value.amountPhiMicro))return null;
 return {direction:value.senderUserId===accountUid?'sent' as const:value.recipientUserId===accountUid?'received' as const:'recorded' as const,amountUsdCents:value.amountUsdCents,amountPhiMicro:value.amountPhiMicro,senderUserId:String(value.senderUserId),recipientUserId:String(value.recipientUserId),transferId:typeof value.transferId==='string'?value.transferId:null,note:typeof value.note==='string'?value.note.trim().slice(0,280):'',href:receiptHref(value.transactionHref)??receiptHref(value.receiptHref)};
}
