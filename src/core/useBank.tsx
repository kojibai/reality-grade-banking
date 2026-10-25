import { createContext, useContext } from 'react';
import type { BankOperation, BankState } from './types';
import type { Panel } from '../components/BottomNav';
export type UIAction = {kind:'market-trade';marketItemId:string;side:'buy'|'sell'} | {kind:'messages';business?:true} | {kind:'profile';vaults?:'create'} | { kind: 'deposit' | 'receive' | 'balance' | 'growth' | 'currency' | 'exchange' | 'rules' | 'business' } | { kind: 'send'; assetId?: string; recipient?: {userId:string;username:string} } | { kind: 'asset' | 'proof' | 'bridge'; assetId: string } | { kind: 'trade'; assetId: string; mode: 'buy' | 'sell' } | { kind: 'pending'; depositId: string };
export interface BankContextValue { state: BankState; commit: (operation: BankOperation) => void; open: (action: UIAction) => void; close: () => void; navigate: (panel: Panel) => void; updateIdentity: (publicName: boolean, username: string) => void; saveRule: (title: string, percentage: number, destination: string) => void; resetDemo: () => void; }
export const BankContext = createContext<BankContextValue | null>(null);
export function useBank(): BankContextValue { const context = useContext(BankContext); if (!context) throw new Error('Bank context is required.'); return context; }
