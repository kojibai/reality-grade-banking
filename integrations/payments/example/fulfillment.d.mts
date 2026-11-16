import type {OrderStore,FulfillmentJob} from '@bankeiz/payments';
export function deliverExampleOrder(store:OrderStore,job:FulfillmentJob,provider?:string):Promise<{delivered:boolean;review:boolean}>;
