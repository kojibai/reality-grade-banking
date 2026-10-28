import {projectGlyphEconomy,type GlyphEconomyPublicSeed,GLYPH_SETTLEMENT_PROJECTOR_DIGEST} from "../glyphEconomyProjection";
import {projectWalletSummary} from "../walletSummaryProjection";
import {parseUsdToCents,walletQuoteSnapshot,walletUsdPerPhiMicrocentsAtPulse} from "../amounts";
import {marketWalletExecutionUsdPerPhiMicrocents,marketSpendableWalletUsdCents} from "../../market/walletBudget";
import {epochMsFromPulse} from "../../../utils/kai_pulse";
import type {MarketShareAccountingWallet} from "../../market/shareTradeAccounting";

/** Private operands beneath the signed allocation, never a standalone funding
 * source. The issuer must derive them from the complete owned proof inventory
 * and exact financial prefix while it takes exclusive source custody. */
export type BankOfflineWalletValuationBasis=Readonly<{
 schema:"receiz.bank.offline-wallet-valuation.v1";
 creationSigilBenefitsEnabled:boolean; publicGlyphs:readonly GlyphEconomyPublicSeed[];
 lawfulActionPhiMicro:string; profileSeedPhiMicro:string; profileSeedUsdCents:string;
 membershipDigest:string; projectorDigest:string;
}>;
/** Raw cumulative ledger values are retained separately from the displayed
 * cash cap: a pulse valuation must not erase backing or a historical debit. */
export type BankOfflineWalletLedger=Readonly<{
 accountBalancePhiMicro:string; totalCreditPhiMicro:string; totalDebitPhiMicro:string;
 totalCreditUsdCents:string; totalDebitUsdCents:string; settledUsdCents:string;
}>;
const MAX=(1n<<63n)-1n,HEX=/^[a-f0-9]{64}$/u;
function fail():never{throw Error("OFFLINE_FINANCIAL_VALUATION_INVALID");}
function exact(v:unknown,keys:readonly string[]):asserts v is Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail();
}
function uint(v:unknown):bigint{
 if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,18})$/u.test(v)||BigInt(v)>MAX)fail();return BigInt(v);
}
export function inspectBankOfflineWalletLedger(input:unknown):BankOfflineWalletLedger{
 exact(input,["accountBalancePhiMicro","totalCreditPhiMicro","totalDebitPhiMicro","totalCreditUsdCents","totalDebitUsdCents","settledUsdCents"]);
 for(const v of Object.values(input))uint(v);
 return input as BankOfflineWalletLedger;
}
function pulse(upulse:string):number{
 if(!/^[1-9][0-9]{0,39}$/u.test(upulse))fail();
 const n=BigInt(upulse)/1000000n;if(n>BigInt(Number.MAX_SAFE_INTEGER))fail();return Number(n);
}

/** Compile once after enclosing allocation admission. This only projects the
 * existing Wallet math; it does not establish proof ownership or a funding hold.
 * No fetch, wall-clock read or re-verification is part of an action projection. */
export function compileBankOfflineWalletValuation(input:unknown,openingKaiUPulse:string){
 const basis=structuredClone(input);
 exact(basis,["schema","creationSigilBenefitsEnabled","publicGlyphs","lawfulActionPhiMicro","profileSeedPhiMicro","profileSeedUsdCents","membershipDigest","projectorDigest"]);
 if(basis.schema!=="receiz.bank.offline-wallet-valuation.v1"||typeof basis.creationSigilBenefitsEnabled!=="boolean"||!Array.isArray(basis.publicGlyphs)
  ||typeof basis.membershipDigest!=="string"||!HEX.test(basis.membershipDigest)||basis.projectorDigest!==GLYPH_SETTLEMENT_PROJECTOR_DIGEST)fail();
 uint(basis.lawfulActionPhiMicro);uint(basis.profileSeedPhiMicro);uint(basis.profileSeedUsdCents);
 for(const glyph of basis.publicGlyphs){
  exact(glyph,["id","livePulseSeed"]);exact(glyph.livePulseSeed,["kind","claimPulse","beat","stepIndex","chakraDay","creatorVerified","kaiSignature","userPhiKey",...(Object.hasOwn(glyph.livePulseSeed,"frequencyHz")?["frequencyHz"]:[])]);
  if(typeof glyph.id!=="string"||glyph.id!==glyph.id.trim().toLowerCase()||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(glyph.id))fail();
 }
 const held=basis as BankOfflineWalletValuationBasis;
 if(!held.creationSigilBenefitsEnabled&&(held.publicGlyphs.length!==0||held.lawfulActionPhiMicro!=="0"))fail();
 let cached:ReturnType<typeof projectGlyphEconomy>|undefined;
 function glyphs(at:number){
  if(cached?.computedPulse===at)return cached;
  const projected=projectGlyphEconomy({publicGlyphs:held.publicGlyphs,computedPulse:at});
  if(projected.invalidGlyphCount||projected.duplicateGlyphCount||projected.membershipDigest!==held.membershipDigest)fail();
  uint(String(projected.glyphSettlementPhiMicro));uint(String(projected.glyphSettlementUsdCents));
  cached=projected;return projected;
 }
 // Check completeness once even if the first consumer is only opening a source.
 glyphs(pulse(openingKaiUPulse));
 return Object.freeze({
  at(ledgerInput:BankOfflineWalletLedger,accountUserId:string,kaiUPulse:string){
   const ledger=inspectBankOfflineWalletLedger(ledgerInput),at=pulse(kaiUPulse),p=glyphs(at),rate=walletUsdPerPhiMicrocentsAtPulse(String(at));
   // The connected writer reconciles this coordination row from the exact
   // proof base and ledger before execution; repeat the same arithmetic locally.
   const reconciled=BigInt(p.glyphSettlementPhiMicro)+BigInt(held.lawfulActionPhiMicro)+BigInt(ledger.totalCreditPhiMicro)-BigInt(ledger.totalDebitPhiMicro)-BigInt(held.profileSeedPhiMicro);
   const accountPhi=held.creationSigilBenefitsEnabled?reconciled>0n?reconciled:0n:BigInt(ledger.accountBalancePhiMicro);
   const phi=Number(p.glyphSettlementPhiMicro)/1000000,usdPerPhi=phi>0?Number(p.glyphSettlementUsdCents)/100/phi:0;
   const summary=projectWalletSummary(accountUserId,{
    accountRow:{user_id:accountUserId,balance_phi_micro:String(accountPhi)},
    rollupRow:{user_id:accountUserId,balance_phi_micro:String(accountPhi),total_credit_phi_micro:ledger.totalCreditPhiMicro,total_debit_phi_micro:ledger.totalDebitPhiMicro,total_credit_usd_cents:ledger.totalCreditUsdCents,total_debit_usd_cents:ledger.totalDebitUsdCents,transfer_count:0,note_mint_count:0,note_claim_count:0,last_entry_at:null},
    seedRow:{amount_phi_micro:held.profileSeedPhiMicro,amount_usd_cents:held.profileSeedUsdCents},
    creationSigilBenefitsEnabled:held.creationSigilBenefitsEnabled,
    profileSyncSnapshot:held.creationSigilBenefitsEnabled?{
     contextPhi:0,aggregateFeedPhi:phi,totalPhi:phi,glyphSettlementPhiMicro:String(p.glyphSettlementPhiMicro),glyphSettlementUsdCents:String(p.glyphSettlementUsdCents),
     computedAt:new Date(Number(epochMsFromPulse(at))).toISOString(),computedPulse:at,usdPerPhi,phiPerUsd:usdPerPhi>0?1/usdPerPhi:0,
     scannedOriginals:p.sourceGlyphCount,truncated:false,projectionComplete:true,sourceArtifactCount:p.sourceGlyphCount,artifactCount:p.publicGlyphCount,
     invalidArtifactCount:0,duplicateArtifactCount:0,membershipDigest:p.membershipDigest,projectorDigest:p.projectorDigest,projectorVersion:p.projectorVersion,
    }:null,
    loadedLawfulActionPhiMicro:BigInt(held.lawfulActionPhiMicro),ledgerSettledUsdCents:BigInt(ledger.settledUsdCents),acceptedSettlementIds:[],usdRateMicrocents:rate,quote:walletQuoteSnapshot(rate),creationSigil:null,
   });
   const walletView={balanceUsd:summary.balanceUsd,balancePhiLabel:summary.balancePhi,canViewPhi:summary.creationSigilBenefitsEnabled,valueStates:summary.valueStates};
   const executionRate=marketWalletExecutionUsdPerPhiMicrocents(walletView,{usdPerPhiMicrocents:rate});
   const available=parseUsdToCents(summary.balanceUsd)??0n,settled=BigInt(summary.valueStates.settledBalanceUsdCents);
   // The Market budget can floor a cent below the full Wallet value. It is a
   // Buy limit, not a new balance or a restriction on a valid Wallet Send.
   const wallet:MarketShareAccountingWallet={balancePhiMicro:summary.balancePhiMicro,availableUsdCents:String(available),settledUsdCents:String(settled<available?settled:available)};
   uint(wallet.balancePhiMicro);uint(wallet.availableUsdCents);uint(wallet.settledUsdCents);
   return Object.freeze({wallet,usdPerPhiMicrocents:String(executionRate),nativeValueEnabled:summary.creationSigilBenefitsEnabled,
    marketAvailableUsdCents:String(marketSpendableWalletUsdCents(walletView,{usdPerPhiMicrocents:executionRate}))});
  },
 });
}
