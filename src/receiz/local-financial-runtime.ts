import type {ReceizAdmissionStore,ReceizIdentityLoginProof} from '@receiz/sdk';
import type {WalletPaymentOpening} from './wallet-payment-bundle';
/** Transport types for the separately built, matching SDK module. These are
 * inspection data; only that module's actual private custody grants authority. */
export type FinancialSource=Readonly<{artifactSha256:string;allocationId:string;accountUserId:string;ownerReceizId:string;sourceFamily:string}>;
export type FinancialAction=Readonly<{kind:'send';recipientUserId:string;conversationId:string;amountUsdCents:string;note?:string;nearby?:true;scannedRecipient?:unknown;moveBack?:true}>|Readonly<{kind:'buy'|'sell';marketItemId:string;amountUsdCents?:string;shareQuantityMicro?:string}>;
export type FinancialState=Readonly<{sequence:string;lastKaiUPulse:string;walletLedger:Readonly<Record<string,string>>;wallet:Readonly<{balancePhiMicro:string;availableUsdCents:string;settledUsdCents:string}>;positions:readonly Readonly<{marketItemId:string;shareQuantityMicro:string;costBasisUsdCents:string;costBasisPhiMicro:string}>[]}>;
export type FinancialOperation=Readonly<{artifactSha256:string;allocationId:string;operationId:string;sequence:string;atKaiUPulse:string;action:FinancialAction;effect:Readonly<Record<string,unknown>>;nextState:FinancialState}>;
export type FinancialCommit=Readonly<{status:'committed';publication:'pending';operation:FinancialOperation}>;
export type FinancialPublication=Readonly<{schema:'receiz.account-financial-publication.v1';allocationId:string;sourceArtifactSha256:string;expectedPredecessorArtifactSha256:string;originals:readonly Readonly<{operationId:string;artifactSha256:string;sequence:string;artifactBytesB64u:string}>[]}>;
export type FinancialReceivedReceipt=Readonly<{schema:'receiz.account-financial-receipt.v2';rights:'read-only';operationId:string;financialOriginalSha256:string;fundingSourceSha256:string;atKaiUPulse:string;receivedAt:string;receivedAtKaiUPulse:string;ownerReceizId:string;effect:Readonly<Record<string,string>>}>;
export type FinancialOriginalStore=Readonly<{retain(sha256:string,bytes:Uint8Array):Promise<void>;read(sha256:string):Promise<Uint8Array|null>}>;
export type FinancialWalletProof=Readonly<{sourceOriginal:Uint8Array;paymentOriginals:readonly Uint8Array[]}>;
export type FinancialWalletCustodyChallenge=Readonly<{credentialIdB64u:string;challengeB64u:string;expectedSignCount:string}>;
export type FinancialWalletCustodyAssertion=Readonly<{
 credentialIdB64u?:string;authenticatorDataB64u:string;clientDataJSONB64u:string;signatureB64u:string;
}>;
export type FinancialWalletCounterHeader=Readonly<{kind:'receive'|'spend'|'release';allocationId:string;commandSha256:string;ownerConsentSha256:string}>;
export type FinancialWalletCounterEvent=Readonly<{
 header:FinancialWalletCounterHeader;assertion:Omit<FinancialWalletCustodyAssertion,'credentialIdB64u'>;
}>;
type WalletCounterCursor=Readonly<{credentialIdB64u:string;lastSignCount:string}>;
type WalletEnrollment=Readonly<{platformAttestationCertificate:Readonly<{origin:string;rpId:string}>;rollbackConformanceEvidence:unknown}>;
export type WalletPairingRuntime=Readonly<{
 enrollBankFinancialWalletDevice(input:{origin:string;rpId:string;fetchImpl:typeof fetch}):Promise<WalletEnrollment>;
 assertBankFinancialWalletDevice(input:FinancialWalletCustodyChallenge&{origin:string;rpId:string}):Promise<Omit<FinancialWalletCustodyAssertion,'credentialIdB64u'>>;
 approveBankFinancialWalletOffer(input:{walletWebAuthn:WalletEnrollment;fundedAtKaiUPulse:string;
  offer:{applicationId:string;sourceArtifactSha256:string;allocationId:string;conversationId:string;recipientUserId:string;
    recipientKeyId:string;recipientRecordSignerPublicKey:string;amountUsdCents:string};
  signOwner(challenge:string,signCount?:string):Promise<ReceizIdentityLoginProof>;
  assert(request:FinancialWalletCustodyChallenge,header?:FinancialWalletCounterHeader,verify?:(assertion:unknown)=>Promise<FinancialWalletCustodyAssertion>):Promise<unknown>;
  readNextSignCount?(cursor:WalletCounterCursor):Promise<string>;
 }):Promise<Readonly<{ownerConsent:ReceizIdentityLoginProof;assertion:Omit<FinancialWalletCustodyAssertion,'credentialIdB64u'>;signCount?:string}>>;
}>;
export type WalletRecipient = Readonly<{accountUid:string;ownerReceizId:string;conversationId:string;nearby:boolean}>;
export type WalletDevice = Readonly<{
 keyId:string;signerPublicKey:string;origin:string;rpId:string;credentialIdB64u:string;received:boolean;scanTime?:boolean;partialPayments?:boolean;sharedWalletCounter?:boolean;connectedPayments?:boolean;setAside?:boolean;
 paymentOpening?:WalletPaymentOpening;
 verifyAssertion?(request:FinancialWalletCustodyChallenge,assertion:unknown):Promise<FinancialWalletCustodyAssertion>;
 recipients:readonly WalletRecipient[];
}>;
export type FinancialRelease=Readonly<{artifactSha256:string}>;
export type WalletPaymentStage=Readonly<{proofBytes:number}>;
export type FinancialExecutor=Readonly<{
 stageWalletPayment?(input:{operationId:string;action:FinancialAction}):Promise<WalletPaymentStage>;
 execute(input:{operationId:string;action:FinancialAction}):Promise<FinancialCommit|Readonly<{status:'not-committed';operationId:string}>>;
 recoverWalletProof?(proof:Uint8Array):Promise<number|null>;
 current():Promise<{sourceArtifactSha256:string;headArtifactSha256:string|null;state:FinancialState;release?:FinancialRelease}>;
 resolve(operationId:string):Promise<FinancialCommit|null>;
 pending(afterSequence?:string,limit?:number):Promise<FinancialCommit[]>;
 release():Promise<FinancialRelease>;
}>;
export type FinancialExecutorOptions=Readonly<{source:FinancialSource;originals:FinancialOriginalStore;store:ReceizAdmissionStore;signOwner(challengeText:string):Promise<ReceizIdentityLoginProof>;signRecord(bytes:Uint8Array):Promise<Uint8Array>;
 assertWalletCustody?(request:FinancialWalletCustodyChallenge,header?:FinancialWalletCounterHeader):Promise<FinancialWalletCustodyAssertion>;
 readWalletCounterEvents?(cursor:WalletCounterCursor):Promise<readonly FinancialWalletCounterEvent[]>;kai?:()=>string}>;
export type LocalFinancialRuntime=Readonly<{
 createWalletAdmissionStore?(input:{databaseName:string;namespace:string}):ReceizAdmissionStore;
 admitReceizAccountFinancialSource(bytes:Uint8Array):Promise<FinancialSource>;
 readReceizAccountFinancialWalletProof(bytes:Uint8Array):FinancialWalletProof;
 receiveReceizAccountFinancialWalletProof(input:FinancialWalletProof&{accountUserId:string;ownerKeyId:string},options:{originals:FinancialOriginalStore}):Promise<FinancialSource>;
 exportReceizAccountFinancialWalletProof(source:FinancialSource,commit:FinancialCommit):Uint8Array;
 exportReceizAccountFinancialRelease(release:FinancialRelease):Uint8Array;
 createReceizAccountFinancialExecutor(input:FinancialExecutorOptions):Promise<FinancialExecutor>;
 commitReceizAccountFinancialWalletPaymentBatch?(stages:readonly WalletPaymentStage[]):Promise<readonly FinancialCommit[]>;
 createReceizAccountFinancialPublisher(input:{source:FinancialSource;executor:FinancialExecutor;store:ReceizAdmissionStore;originals:FinancialOriginalStore;publish(batch:FinancialPublication):Promise<unknown>;batchSize?:number}):Promise<{flush():Promise<Readonly<{status:'published'|'pending'}>>;received(operationId:string):Promise<FinancialReceivedReceipt|null>;dispose():void}>;
 projectReceizAccountFinancialAction(source:FinancialSource,state:FinancialState,action:FinancialAction,atKaiUPulse:string):{effect:Readonly<Record<string,unknown>>;next:FinancialState};
 prepareReceizScannedWalletRecipient?(source:FinancialSource,action:Extract<FinancialAction,{kind:'send'}>,atKaiUPulse:string):Promise<void>;
 financialSourceApplicationId(source:FinancialSource):string;
 bankFinancialWalletDevice?(source:FinancialSource):WalletDevice;
 assertBankFinancialWalletDevice?(input:FinancialWalletCustodyChallenge&{origin:string;rpId:string}):Promise<FinancialWalletCustodyAssertion>;
 financialSourceWalletAt(source:FinancialSource,state:FinancialState,atKaiUPulse:string):FinancialState['wallet'];
 financialKaiNow():string;
}>;
