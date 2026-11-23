import type {ReceizAdmissionStore,ReceizIdentityLoginProof} from '@receiz/sdk';
/** Transport types for the separately built, matching SDK module. These are
 * inspection data; only that module's actual private custody grants authority. */
export type FinancialSource=Readonly<{artifactSha256:string;allocationId:string;accountUserId:string;ownerReceizId:string;sourceFamily:string}>;
export type FinancialAction=Readonly<{kind:'send';recipientUserId:string;conversationId:string;amountUsdCents:string;note?:string;nearby?:true}>|Readonly<{kind:'buy'|'sell';marketItemId:string;amountUsdCents?:string;shareQuantityMicro?:string}>;
export type FinancialState=Readonly<{sequence:string;lastKaiUPulse:string;walletLedger:Readonly<Record<string,string>>;wallet:Readonly<{balancePhiMicro:string;availableUsdCents:string;settledUsdCents:string}>;positions:readonly Readonly<{marketItemId:string;shareQuantityMicro:string;costBasisUsdCents:string;costBasisPhiMicro:string}>[]}>;
export type FinancialOperation=Readonly<{artifactSha256:string;allocationId:string;operationId:string;sequence:string;atKaiUPulse:string;action:FinancialAction;effect:Readonly<Record<string,unknown>>;nextState:FinancialState}>;
export type FinancialCommit=Readonly<{status:'committed';publication:'pending';operation:FinancialOperation}>;
export type FinancialPublication=Readonly<{schema:'receiz.account-financial-publication.v1';allocationId:string;sourceArtifactSha256:string;expectedPredecessorArtifactSha256:string;originals:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string;artifactBytesB64u:string}>[]}>;
export type FinancialReceivedReceipt=Readonly<{schema:'receiz.account-financial-receipt.v2';rights:'read-only';operationId:string;financialOriginalSha256:string;fundingSourceSha256:string;atKaiUPulse:string;receivedAt:string;receivedAtKaiUPulse:string;ownerReceizId:string;effect:Readonly<Record<string,string>>}>;
export type FinancialOriginalStore=Readonly<{retain(sha256:string,bytes:Uint8Array):Promise<void>;read(sha256:string):Promise<Uint8Array|null>}>;
export type FinancialWalletProof=Readonly<{sourceOriginal:Uint8Array;paymentOriginals:readonly Uint8Array[]}>;
export type FinancialWalletCustodyChallenge=Readonly<{credentialIdB64u:string;challengeB64u:string;expectedSignCount:string}>;
export type FinancialWalletCustodyAssertion=Readonly<{
 credentialIdB64u:string;authenticatorDataB64u:string;clientDataJSONB64u:string;signatureB64u:string;
}>;
export type FinancialRelease=Readonly<{artifactSha256:string}>;
export type FinancialExecutor=Readonly<{
 execute(input:{operationId:string;action:FinancialAction}):Promise<FinancialCommit|Readonly<{status:'not-committed';operationId:string}>>;
 current():Promise<{sourceArtifactSha256:string;headArtifactSha256:string|null;state:FinancialState;release?:FinancialRelease}>;
 resolve(operationId:string):Promise<FinancialCommit|null>;
 pending(afterSequence?:string,limit?:number):Promise<FinancialCommit[]>;
 release():Promise<FinancialRelease>;
}>;
export type FinancialExecutorOptions=Readonly<{source:FinancialSource;originals:FinancialOriginalStore;store:ReceizAdmissionStore;signOwner(challengeText:string):Promise<ReceizIdentityLoginProof>;signRecord(bytes:Uint8Array):Promise<Uint8Array>;
 assertWalletCustody?(request:FinancialWalletCustodyChallenge):Promise<FinancialWalletCustodyAssertion>;kai?:()=>string}>;
export type LocalFinancialRuntime=Readonly<{
 admitReceizAccountFinancialSource(bytes:Uint8Array):Promise<FinancialSource>;
 readReceizAccountFinancialWalletProof(bytes:Uint8Array):FinancialWalletProof;
 receiveReceizAccountFinancialWalletProof(input:FinancialWalletProof&{accountUserId:string;ownerKeyId:string},options:{originals:FinancialOriginalStore}):Promise<FinancialSource>;
 exportReceizAccountFinancialWalletProof(source:FinancialSource,commit:FinancialCommit):Uint8Array;
 exportReceizAccountFinancialRelease(release:FinancialRelease):Uint8Array;
 createReceizAccountFinancialExecutor(input:FinancialExecutorOptions):Promise<FinancialExecutor>;
 createReceizAccountFinancialPublisher(input:{source:FinancialSource;executor:FinancialExecutor;store:ReceizAdmissionStore;originals:FinancialOriginalStore;publish(batch:FinancialPublication):Promise<unknown>;batchSize?:number}):Promise<{flush():Promise<Readonly<{status:'published'|'pending'}>>;received(operationId:string):Promise<FinancialReceivedReceipt|null>;dispose():void}>;
 projectReceizAccountFinancialAction(source:FinancialSource,state:FinancialState,action:FinancialAction,atKaiUPulse:string):{effect:Readonly<Record<string,unknown>>;next:FinancialState};
 financialSourceApplicationId(source:FinancialSource):string;
 financialSourceWalletAt(source:FinancialSource,state:FinancialState,atKaiUPulse:string):FinancialState['wallet'];
 financialKaiNow():string;
}>;
