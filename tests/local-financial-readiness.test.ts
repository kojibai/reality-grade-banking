import {expect,it,vi} from 'vitest';
import {createReceizClient} from '@receiz/sdk';
import {createBankOperations,type BankOperationInput} from '../src/receiz/bank-operations';
import {BANK_APPLICATION_ID} from '../src/receiz/config';

// Refusal audit of actual existing boundaries, not a new readiness API or
// positive local execution qualification. No mocked verifier or financial root.
const observations=[
 ['wallet observation',{authority:'wallet-observation',totalUsdCents:'10000000'}],
 ['portfolio observation',{authority:'market-observation',shareQuantityMicro:'1000000'}],
 ['holding certificate',{schema:'receiz.native-asset-holding.v1',holder:{receizId:'synthetic.receiz.id'}}],
 ['user seal',{kind:'receiz.native-record-seal',verified:true}],
 ['public price',{priceUsdCents:'1000'}],
 ['generic verified history',{completeAtSealedHead:true,portableStateVerified:true}],
 ['matching JSON balance',{reserveUsdCents:'1000',settlementUsdCents:'0',totalUsdCents:'1000'}],
 ['truthy verifier callback',()=>true],
]as const;
it.each(observations)('%s cannot authorize a local Send/Buy/Sell through the unqualified financial adapter',async(_label,source)=>{
 const context=vi.fn(async()=>{throw Error('must not execute');}),sources=vi.fn(async()=>[source]as never),saveNew=vi.fn(),replace=vi.fn();
 const api=createBankOperations({ownerReceizId:'synthetic.receiz.id',assertOpen(){},store:{load:async()=>null,saveNew,replace},context,sources,lock:async work=>work()});
 const intents:BankOperationInput[]=[{kind:'send-value',rail:'reserve',amountUsdCents:'1000',recipient:'receiver.receiz.id'},{kind:'buy-shares',rail:'reserve',quantityMicro:'1000000',assetDigest:'a'.repeat(64)},{kind:'sell-share',rail:'reserve',quantityMicro:'1000000',assetDigest:'a'.repeat(64),buyer:'market'}];
 for(const intent of intents)await expect(api.prepare(intent)).rejects.toThrow('BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED');
 expect(context).not.toHaveBeenCalled();expect(sources).not.toHaveBeenCalled();expect(saveNew).not.toHaveBeenCalled();expect(replace).not.toHaveBeenCalled();
});
it.each(['reserve','settlement']as const)('the pinned SDK does not confirm %s from a reported local-success flag',async rail=>{
 const fetcher=vi.fn<typeof fetch>(),edge=createReceizClient({applicationId:BANK_APPLICATION_ID,fetchImpl:fetcher}).value.edge;
 const fake={status:'committed',verified:true,transitionSet:{},committedTransitions:[]},scope={applicationId:BANK_APPLICATION_ID,participantId:'synthetic-receiver'};
 await expect(rail==='reserve'?edge.receiveReserve(fake,scope):edge.receiveSettlement(fake,scope)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
