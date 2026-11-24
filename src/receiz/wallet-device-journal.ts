import type { FinancialWalletCounterEvent, FinancialWalletCounterHeader, FinancialWalletCustodyAssertion, FinancialWalletCustodyChallenge } from './local-financial-runtime';

type Attempt=Readonly<{request:FinancialWalletCustodyChallenge;header:FinancialWalletCounterHeader}>;
type Recorded=Attempt&Readonly<{assertion:FinancialWalletCustodyAssertion}>;
export type WalletDeviceJournalState=Readonly<{records:readonly Recorded[];pending:Attempt|null}>;

/** Retain the exact provider reply before handing it back to the SDK. The
 * SDK still verifies each event against the admitted credential and head. */
export function createWalletDeviceJournal(storage:Readonly<{
  read():Promise<WalletDeviceJournalState|null>;
  save(next:WalletDeviceJournalState,previous:WalletDeviceJournalState|null):Promise<void>;
}>) {
  return {
    async nextSignCount(initialSignCount:string):Promise<string> {
      const state=await storage.read();
      return String(BigInt(state?.records.at(-1)?.request.expectedSignCount??initialSignCount)+1n);
    },
    async eventsAfter(lastSignCount:string):Promise<FinancialWalletCounterEvent[]> {
      const state=await storage.read();
      return (state?.records??[]).filter(({request})=>BigInt(request.expectedSignCount)>BigInt(lastSignCount))
        .map(({header,assertion:{credentialIdB64u:_credential,...assertion}})=>({header,assertion}));
    },
    async assert(request:FinancialWalletCustodyChallenge,header:FinancialWalletCounterHeader,sign:()=>Promise<FinancialWalletCustodyAssertion>) {
      const prior=await storage.read(),records=prior?.records??[];
      const same=(attempt:Attempt)=>JSON.stringify(attempt)===JSON.stringify({request,header});
      const recorded=records.find(item=>item.request.challengeB64u===request.challengeB64u);
      if(recorded){
        if(!same({request:recorded.request,header:recorded.header}))throw Error('BANK_WALLET_COUNTER_INTENT_PENDING');
        return recorded.assertion;
      }
      const pending={request,header};
      if(prior?.pending&&!same(prior.pending))throw Error('BANK_WALLET_COUNTER_INTENT_PENDING');
      const last=records.at(-1)?.request;
      if(last&&(last.credentialIdB64u!==request.credentialIdB64u||BigInt(last.expectedSignCount)+1n!==BigInt(request.expectedSignCount)))
        throw Error('BANK_WALLET_COUNTER_INTENT_PENDING');
      const attempted:WalletDeviceJournalState={records,pending};
      if(!prior?.pending)await storage.save(attempted,prior);
      let assertion:FinancialWalletCustodyAssertion;
      try{assertion=await sign();}
      catch(error){
        if(!prior?.pending&&error instanceof Error&&error.message==='ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION')
          await storage.save({records,pending:null},attempted);
        throw error;
      }
      if(assertion.credentialIdB64u!==request.credentialIdB64u)throw Error('BANK_WALLET_DEVICE_MISMATCH');
      await storage.save({records:[...records,{...pending,assertion}],pending:null},attempted);
      return assertion;
    },
  };
}
