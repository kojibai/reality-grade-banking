import { Archive, Gem, Coins, FileCheck2, Building2, ChartNoAxesCombined, ArrowUpRight, ArrowDownToLine, SlidersHorizontal } from 'lucide-react';
export type MarkKind = 'proof' | 'physical' | 'currency' | 'property' | 'stock' | 'send' | 'deposit' | 'rule';
export function AssetMark({ kind, small = false }: { kind: MarkKind; small?: boolean }) {
  const Icon = { proof: Archive, physical: Gem, currency: Coins, property: Building2, stock: ChartNoAxesCombined, send: ArrowUpRight, deposit: ArrowDownToLine, rule: SlidersHorizontal }[kind] || FileCheck2;
  return <span className={`asset-mark ${kind} ${small ? 'small' : ''}`}><Icon size={small ? 19 : 23} strokeWidth={1.7} /></span>;
}
