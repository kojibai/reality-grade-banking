export {formatMoney} from './accept-money-model.js';
export type IndependentOwner='bankeiz'|'independent'|'merchant';
export type IndependentOwnerDescription=Readonly<{id:IndependentOwner;ownerId:string;name:string;app:string}>;
export const independentOwners:readonly IndependentOwnerDescription[];
export type IndependentPosition={ownerId:string;phiMicro:string;usdCents:number;head:string;lineage:string};
export type IndependentTransition={id:string;rail:'SETTLEMENT';lineage:string;sender:IndependentOwner;recipient:IndependentOwner;senderOwnerId:string;recipientOwnerId:string;amountPhiMicro:string;amountCents:number;senderPredecessor:string;senderSuccessor:string;recipientPredecessor:string;recipientSuccessor:string};
export type IndependentState={step:number;rail:'SETTLEMENT';demonstration:true;lineage:string;initialPhiMicro:string;totalPhiMicro:string;initialCents:number;totalCents:number;displayQuote:{fictional:true;usdCentsPerPhi:string;purpose:'display-only';live:false;funding:false;redemption:false};balances:Record<IndependentOwner,number>;positions:Record<IndependentOwner,IndependentPosition>;transitions:IndependentTransition[]};
export function independentState(step:number):IndependentState;
