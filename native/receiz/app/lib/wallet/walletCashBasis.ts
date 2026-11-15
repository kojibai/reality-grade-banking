import {usdCentsFromPhiMicro} from './amounts';
import type {WalletAccountRow,WalletRollupRow} from './walletReadTypes';
/** Mechanical operands beneath the existing accepted wallet Source. This
 * does not grant funding, establish history completeness or issue money. */
export type WalletCashBasis=Readonly<{
 schema:'receiz.wallet.cash-plus-originals.v1';
 phiOffsetMicro:string;usdOffsetCents:string;fromKaiUPulse:string;
 /** Only an opening with no ledger rollup uses the existing account quote. */
 accountOnlyUsdRateMicrocents?:string;
}>;
const signed=/^(0|-?[1-9][0-9]{0,38})$/u,unsigned=/^(0|[1-9][0-9]{0,38})$/u,MAX=(1n<<63n)-1n;
export function readWalletCashBasis(value:unknown):WalletCashBasis|undefined{
 if(value===undefined||value===null)return;
 if(typeof value!=='object'||Array.isArray(value))throw Error('wallet_cash_basis_invalid');
 const v=value as Record<string,unknown>,quoted=Object.hasOwn(v,'accountOnlyUsdRateMicrocents');
 const keys=['fromKaiUPulse','phiOffsetMicro','schema','usdOffsetCents',...(quoted?['accountOnlyUsdRateMicrocents']:[])].sort().join(',');
 if(Object.keys(v).sort().join(',')!==keys
  ||v.schema!=='receiz.wallet.cash-plus-originals.v1'||typeof v.phiOffsetMicro!=='string'||!signed.test(v.phiOffsetMicro)
  ||typeof v.usdOffsetCents!=='string'||!unsigned.test(v.usdOffsetCents)||typeof v.fromKaiUPulse!=='string'||!unsigned.test(v.fromKaiUPulse)
  ||quoted&&(typeof v.accountOnlyUsdRateMicrocents!=='string'||!unsigned.test(v.accountOnlyUsdRateMicrocents)||BigInt(v.accountOnlyUsdRateMicrocents)<=0n||BigInt(v.accountOnlyUsdRateMicrocents)>MAX))throw Error('wallet_cash_basis_invalid');
 return Object.freeze({schema:v.schema,phiOffsetMicro:v.phiOffsetMicro,usdOffsetCents:v.usdOffsetCents,fromKaiUPulse:v.fromKaiUPulse,
  ...(quoted?{accountOnlyUsdRateMicrocents:v.accountOnlyUsdRateMicrocents as string}:{})});
}
/** Only the existing writer may accept/retain this candidate beneath its
 * locked financial prefix. Later reads reuse the identical retained basis. */
export function walletCashBasisAtOpening(input:{accountPhiMicro:bigint;creditPhiMicro:bigint;debitPhiMicro:bigint;creditUsdCents:bigint;debitUsdCents:bigint;kaiUPulse:string;accountOnlyUsdRateMicrocents?:bigint}):WalletCashBasis{
 const netUsd=input.creditUsdCents-input.debitUsdCents,priorUsd=input.accountOnlyUsdRateMicrocents===undefined?(netUsd>0n?netUsd:0n):usdCentsFromPhiMicro(input.accountPhiMicro,input.accountOnlyUsdRateMicrocents);
 return readWalletCashBasis({schema:'receiz.wallet.cash-plus-originals.v1',phiOffsetMicro:String(input.accountPhiMicro-input.creditPhiMicro+input.debitPhiMicro),
  usdOffsetCents:String(priorUsd-netUsd),fromKaiUPulse:input.kaiUPulse,
  ...(input.accountOnlyUsdRateMicrocents===undefined?{}:{accountOnlyUsdRateMicrocents:String(input.accountOnlyUsdRateMicrocents)})})!;
}
function amount(value:unknown):bigint{
 const text=typeof value==='number'&&Number.isSafeInteger(value)?String(value):value;
 if(typeof text!=='string'||!unsigned.test(text)||BigInt(text)>MAX)throw Error('wallet_cash_basis_invalid');return BigInt(text);
}
/** Select only from one captured read. Unknown native read scopes do not
 * acquire a funding right or initialize an earning epoch through this helper. */
export function selectWalletCashBasis(input:{account:WalletAccountRow|null;rollup:Pick<WalletRollupRow,'total_credit_phi_micro'|'total_debit_phi_micro'|'total_credit_usd_cents'|'total_debit_usd_cents'>|null;
 hasSettlementHead?:boolean;cashBasis?:unknown;creationSigilBenefitsEnabled:boolean;legacySigilClaimEnabled:boolean|undefined;kaiUPulse:string;usdRateMicrocents:bigint}):WalletCashBasis|undefined{
 const held=readWalletCashBasis(input.cashBasis);
 if(held){if(input.hasSettlementHead!==true)throw Error('wallet_cash_basis_invalid');return held;}
 if(input.hasSettlementHead!==false||!input.creationSigilBenefitsEnabled||!input.account)return;
 if(input.legacySigilClaimEnabled===undefined)throw Error('wallet_cash_basis_scope_unavailable');
 if(input.legacySigilClaimEnabled)return;
 return walletCashBasisAtOpening({accountPhiMicro:amount(input.account.balance_phi_micro),creditPhiMicro:amount(input.rollup?.total_credit_phi_micro??'0'),debitPhiMicro:amount(input.rollup?.total_debit_phi_micro??'0'),
  creditUsdCents:amount(input.rollup?.total_credit_usd_cents??'0'),debitUsdCents:amount(input.rollup?.total_debit_usd_cents??'0'),kaiUPulse:input.kaiUPulse,
  ...(input.rollup?{}:{accountOnlyUsdRateMicrocents:input.usdRateMicrocents})});
}
