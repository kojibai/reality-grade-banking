export type Rail = 'reserve' | 'settlement';
export type AssetCategory = 'proof' | 'physical' | 'currency' | 'stock' | 'property';
export interface BankAsset { id: string; title: string; category: AssetCategory; symbol?: string; unit: string; pricePhiMicro: string; change: number; totalUnitsMicro: string; availableMicro: string; custody: string; description: string; history: number[]; source: 'demo'; }
export interface Holding { assetId: string; quantityMicro: string; }
export interface Deposit { id: string; title: string; category: AssetCategory; quantityMicro: string; estimatePhiMicro: string; status: 'awaiting' | 'custodied'; handoff: 'delivery' | 'transfer' | 'title'; }
export interface BankEvent { id: string; title: string; kind: string; amountPhiMicro: string; rail?: Rail; assetId?: string; quantityMicro?: string; recipient?: string; custody?: string; time: string; actor: string; proofRef: string; source: 'demo'; }
export interface BankCurrency { id: string; name: string; symbol: string; supplyMicro: string; backingPhiMicro: string; rail: Rail; }
export interface MoneyRule { id: string; title: string; percentage: number; destination: string; status: 'draft'; }
export interface BankState { schema: 'receiz.bank.demo.v1'; mode: 'demo'; reservePhiMicro: string; settlementPhiMicro: string; growthPhiMicro: string; usdPerPhiMicrocents: string; assets: BankAsset[]; holdings: Holding[]; deposits: Deposit[]; currencies: BankCurrency[]; rules: MoneyRule[]; events: BankEvent[]; appliedOperations: Record<string, string>; identity: { publicName: boolean; username: string; actor: string }; }
export type BankOperation =
  | { id: string; kind: 'intake'; title: string; category: AssetCategory; quantityMicro: string; estimatePhiMicro: string }
  | { id: string; kind: 'accept-custody'; depositId: string }
  | { id: string; kind: 'fund'; amountPhiMicro: string }
  | { id: string; kind: 'send'; amountPhiMicro: string; rail: Rail; recipient: string }
  | { id: string; kind: 'send-asset'; assetId: string; quantityMicro: string; recipient: string }
  | { id: string; kind: 'buy' | 'sell'; assetId: string; quantityMicro: string; rail: Rail; counterparty?: 'bank' | 'market' }
  | { id: string; kind: 'redeem'; assetId: string; quantityMicro: string }
  | { id: string; kind: 'create-currency'; name: string; symbol: string; supplyMicro: string; backingPhiMicro: string; rail: Rail }
  | { id: string; kind: 'exchange'; assetId: string; amountPhiMicro: string; rail: Rail };
export interface BalanceView { totalUsdCents: string; reserveUsdCents: string; settlementUsdCents: string; assetsUsdCents: string; backingUsdCents: string; growthUsdCents: string; }
