/** Browser composition of the existing financial Source, local executor and
 * exact-original publisher. No provider, enrollment or signing keys are made. */
export {admitReceizAccountFinancialSource, exportReceizAccountFinancialWalletProof, readReceizAccountFinancialWalletProof, receiveReceizAccountFinancialWalletProof, receizAccountFinancialWalletReceiverChallenge} from './accountFinancialSource.js';
export {createReceizAccountFinancialExecutor,commitReceizAccountFinancialWalletPaymentBatch} from './accountFinancialCommit.js';
export {ReceizFinancialWalletCustodyCancelledBeforeAssertion, type ReceizFinancialWalletCustodyChallenge} from './accountFinancialWalletCustody.js';
export {createReceizAccountFinancialPublisher} from './accountFinancialPublication.js';
export {projectReceizAccountFinancialAction} from './accountFinancialExecution.js';
import {createReceizBrowserAdmissionStoreInternal,type ReceizBrowserAdmissionStoreOptions} from './browserAdmissionStore.js';
import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource} from './accountFinancialSource.js';
import {receizKaiNow} from './v124Kai.js';
const walletAdmissionStores=new Map<string,ReturnType<typeof createReceizBrowserAdmissionStoreInternal>>();
export function createWalletAdmissionStore(options:Pick<ReceizBrowserAdmissionStoreOptions,'databaseName'|'namespace'>){
 const key=JSON.stringify([options.databaseName,options.namespace]),existing=walletAdmissionStores.get(key);
 if(existing)return existing;
 const store=createReceizBrowserAdmissionStoreInternal({...options,writeDurability:'strict',maxRecordsPerTransaction:8192});
 walletAdmissionStores.set(key,store);
 return store;
}
/** Read-only scope inspection after genuine enclosing Source admission. */
export function financialSourceApplicationId(source:ReceizAccountFinancialSource):string{
 return (readReceizAccountFinancialSourceCustody(source).body.funding as {applicationId:string}).applicationId;
}
export function financialKaiNow():string{return String(receizKaiNow().uPulse);}

import type {ReceizAccountFinancialState} from './accountFinancialExecution.js';
/** Read-only projection from the admitted operands at the current local pulse.
 * Callers must use the executor's accepted state; this creates no spend rights. */
export function financialSourceWalletAt(source:ReceizAccountFinancialSource,state:ReceizAccountFinancialState,atKaiUPulse:string){
 const {valuation}=readReceizAccountFinancialSourceCustody(source);
 return {...(source.sourceFamily==='native-wallet-reserve'?state.wallet:valuation.at(state.walletLedger,source.accountUserId,atKaiUPulse).wallet)};
}
