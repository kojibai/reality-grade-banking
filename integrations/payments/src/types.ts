import type {ReceizClient,ReceizWebhookEvent} from '@receiz/sdk';

/** Synchronous operations inside one durable, serializable merchant transaction. */
export interface OrderTransaction {
 get<T>(key:string):T|null;
 put(key:string,value:unknown):void;
 insert(key:string,value:unknown):boolean;
 /** Last matching key, used to fence a bounded traversal under new insertions. */
 lastKey(prefix:string):string|null;
 scan<T>(prefix:string,options:{after?:string;limit:number}):{key:string;value:T}[];
}
export interface OrderStore {
 /** Commit every write together, or roll back all of them. Never await inside work. */
 transaction<T>(work:(tx:OrderTransaction)=>T):Promise<T>;
}
export interface Merchant {username:string;userId:string;}
export interface CheckoutInput {orderId:string;amountUsdCents:string;}
export interface OrderStatus extends CheckoutInput {
 currency:'usd';status:'pending'|'paid';checkoutUrl:string;buttonHtml:string;
 paymentCount:number;additionalPayments:number;fulfillment:'pending'|'processing'|'complete';
 receiving:'unchecked'|'complete'|'incomplete'|'unavailable';error?:string;
}
export interface FulfillmentJob extends CheckoutInput {
 merchantUserId:string;idempotencyKey:string;
 /** Correlation only. Request complete originals privately through your own store. */
 payment:{transferId:string;clientNonce:string};
}
export interface BatchOptions {limit?:number;signal?:AbortSignal;}
export interface WebhookOptions {
 secret:string;
 /** Trusted host mapping. Notifications and their property bags are not payment evidence. */
 resolveOrders(event:ReceizWebhookEvent):Promise<readonly string[]>|readonly string[];
 signal?:AbortSignal;
}
export interface BankeizPaymentsOptions {merchant:Merchant;receiz:Pick<ReceizClient,'request'>;store:OrderStore;}
export interface BankeizPayments {
 checkout(input:CheckoutInput):Promise<OrderStatus>;
 get(orderId:string):Promise<OrderStatus>;
 check(orderId:string,options?:{signal?:AbortSignal}):Promise<OrderStatus>;
 reconcile(options?:BatchOptions):Promise<{orders:OrderStatus[];errors:{orderId:string;error:string}[]}>;
 fulfill(deliver:(job:FulfillmentJob)=>Promise<void>,options?:BatchOptions&{leaseMs?:number}):Promise<{completed:number;failed:number;examined:number}>;
 handleWebhook(request:Request,options:WebhookOptions):Promise<{eventId:string;complete:boolean;orders:OrderStatus[]}>;
}
