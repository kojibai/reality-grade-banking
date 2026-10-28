import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {readFileSync} from 'node:fs';
import {sameLedgerValueInputs,indexLedgerValues,ledgerProofValueSeed} from '../src/receiz/ledger-value';
import {readLedgerValuationTrace} from '../src/receiz/ledger-inspection';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {expect,it,vi} from 'vitest';
import {computeIntrinsicUnsigned} from '@receiz/sdk/valuation';
import {publicMarketPulseSeed} from '../src/receiz/market-projection/source';
import {publicSigilValuationMetadata,publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import {inspectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {inspectBalanceOriginal} from '../src/receiz/balance-calculation';
import {quotePhiForUsd,DEFAULT_ISSUANCE_POLICY} from '../src/receiz/canonical-market-issuance';

const seed={kind:'sigil',claimPulse:14447620,beat:18,stepIndex:28,chakraDay:'Heart',creatorVerified:true,kaiSignature:'frequency-parity',userPhiKey:'frequency-parity:original',frequencyHz:843.362};
const pulse=14865000;
it('carries the original frequency through the public seed without making another read',()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('UNEXPECTED_READ');});
 try{expect(publicMarketPulseSeed(seed,String(seed.claimPulse))).toEqual(seed);expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
it.each([0,-1,NaN,Infinity,'843.362',null])('refuses a carried invalid frequency %s instead of silently using the neutral fallback',frequencyHz=>{
 expect(publicMarketPulseSeed({...seed,frequencyHz},String(seed.claimPulse))).toBeUndefined();
});
it('uses the identical frequency for public price, balance Phi, USD quote and detailed inspection',()=>{
 const meta={...publicSigilValuationMetadata(seed),frequencyHz:seed.frequencyHz},computed=computeIntrinsicUnsigned(meta,pulse),quote=quotePhiForUsd({meta,nowPulse:pulse,usd:100,currentStreakDays:0,lifetimeUsdSoFar:0},DEFAULT_ISSUANCE_POLICY);
 const source:CompositeWalletSource={schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',userId:'owner',throughKaiUPulse:String(pulse*1000000),objects:[{id:'original',seed,intervals:[{fromKaiUPulse:String(seed.claimPulse*1000000),toKaiUPulse:null}]}],movements:[],lawfulValues:[]};
 expect(publicSigilValuationMetadata(seed).frequencyHz).toBe(seed.frequencyHz);
 const publicQuote=publicSigilQuoteAtPulse(seed,pulse),roundedPhi=Math.round(computed.unsigned.valuePhi*1e6)/1e6;
 expect(publicQuote.pricePhi).toBe(roundedPhi);expect(publicQuote.quoteUsdPerPhi).toBe(quote.usdPerPhi);
 const frame=inspectCompositeWalletAt(source,source.throughKaiUPulse),original=frame.objects[0];
 expect(frame.point.balancePhiMicro).toBe(String(Math.round(computed.unsigned.valuePhi*1e6)));
 expect(frame.point.totalUsdCents).toBe(String(Math.round(computed.unsigned.valuePhi*quote.usdPerPhi*100)));
 expect(original.metadata.frequencyHz).toBe(seed.frequencyHz);
 const inspection=inspectBalanceOriginal(original);
 expect(inspection.calculation.find(term=>term.id==='resonance.logPhi')?.operands.frequencyHz).toBe(String(seed.frequencyHz));
 expect(inspection.calculation.some(term=>term.id==='resonance.neutral')).toBe(false);
});
it('does not invent a frequency or reprice an older seed that did not carry one',()=>{
 const {frequencyHz:_,...legacy}=seed,meta=publicSigilValuationMetadata(legacy);
 expect(meta.frequencyHz).toBeUndefined();expect(computeIntrinsicUnsigned(meta,pulse).unsigned.inputs.resonancePhi).toBe(.5);
});

it('invalidates cached Ledger calculation inputs when only the carried frequency changes',()=>{
 const before=parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8'))),after=structuredClone(before);
 after.valueRows.find(row=>row.marketItem?.livePulseSeed)!.marketItem!.livePulseSeed!.frequencyHz=843.362;
 expect(sameLedgerValueInputs(before,after)).toBe(false);
});
it('retains frequency as a reproducible receipt calculation operand',()=>{
 expect(readLedgerValuationTrace({sdk:'129.0.0',seed})).toMatchObject({seed:{frequencyHz:seed.frequencyHz}});
});
it('refuses invalid frequency in an aggregate capitalization source too',()=>{
 const source=JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8'));
 source.marketCapProjection.valueRows.find((row:{marketItem?:{livePulseSeed?:unknown}})=>row.marketItem?.livePulseSeed).marketItem.livePulseSeed.frequencyHz=0;
 expect(()=>parseMarketCapSource(source)).toThrow(/metadata/);
});

it('enriches only an omitted public valuation frequency from the same bound Original while retaining explicit conflicts',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8'))),row=source.valueRows.find(row=>row.marketItem?.livePulseSeed)!,legacy={...row.marketItem!.livePulseSeed!};
 row.marketItem!.livePulseSeed={...legacy,frequencyHz:843.362};
 const index=indexLedgerValues(source),record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:row.marketItem!.id,receizId:row.seed,title:'Original',pulse:String(legacy.claimPulse),valueUsd:1}]}}).records[0];
 record.valueOperands={assetId:row.seed,marketItemId:row.marketItem!.id,proofValuation:{assetId:row.seed,marketItemId:row.marketItem!.id,seed:legacy}};
 expect(ledgerProofValueSeed(record,index)?.frequencyHz).toBe(843.362);
 record.valueOperands.proofValuation!.seed={...legacy,frequencyHz:432};
 expect(ledgerProofValueSeed(record,index)).toBeNull();
});
