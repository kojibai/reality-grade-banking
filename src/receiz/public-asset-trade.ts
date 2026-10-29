import {afterPublicNavigationReady} from '../core/public-document-entry.js';
export interface PublicAssetTradeIntent {certificateToken?:string;certificateAction?:'manage';itemId: string; side: 'buy' | 'sell'; title: string; initialBudget?: string; resumeSessionId?: string; resumeTradeReview?: boolean;}
export interface PublicAssetTradeRequest extends PublicAssetTradeIntent {id: number; pathname: string; slot: HTMLElement | null; connected: boolean;}
let current: PublicAssetTradeRequest | null = null, sequence = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export const readPublicAssetTrade = () => current;
export const subscribePublicAssetTrade = (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};

/** An intent opens UI only. The existing native Market still owns all authority. */
export function beginPublicAssetTrade(intent: PublicAssetTradeIntent): boolean {
  if(intent.certificateToken!==undefined&&!/^[A-Za-z0-9._:-]{16,200}$/.test(intent.certificateToken)||intent.certificateAction!==undefined&&(!intent.certificateToken||intent.certificateAction!=='manage'))return false;
  if (!intent.itemId || intent.itemId.length > 256 || /[\x00-\x1f\x7f]/.test(intent.itemId) || intent.itemId.startsWith('sports:') || !['buy', 'sell'].includes(intent.side) || intent.resumeSessionId !== undefined && !/^cs_[a-zA-Z0-9_]{8,200}$/.test(intent.resumeSessionId)) return false;
  current = {...intent, title: intent.title.slice(0, 4096), id: ++sequence, pathname: location.pathname, slot: null, connected: false};
  notify(); return true;
}
export function closePublicAssetTrade(id = current?.id): void {if (current?.id === id) {current = null; notify();}}
export function attachPublicAssetTrade(id: number, slot: HTMLElement | null): void {
  if (current?.id !== id || current.slot === slot) return;
  current = {...current, slot}; notify();
}
export function connectPublicAssetTrade(id: number): void {
  if (current?.id !== id || current.connected) return;
  current = {...current, connected: true}; notify();
}
export function requestPublicAssetBankRuntime(): Promise<void> {
  return new Promise((resolve, reject) => {
    const detail = {handled: false, resolve, reject};
    afterPublicNavigationReady(()=>{
      dispatchEvent(new CustomEvent('bankeiz:request-bank-runtime', {detail}));
      if (!detail.handled) reject(new Error('Your account could not open here. Please try again.'));
    });
  });
}
