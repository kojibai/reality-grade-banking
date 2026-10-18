import { afterEach, expect, it, vi } from 'vitest';
import { loadWalletObservation, saveWalletObservation } from '../src/receiz/identity-vault';
import type { SharedWallet } from '../src/receiz/shared-wallet';

// Isolate only the IDB boundary. The real vault computes source binding and
// encrypts/decrypts the observation with the actual non-exportable AES key.
async function vault() {
  const bytes=new TextEncoder().encode('isolated-wallet-scope-fixture'),wrappingKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  let row:Record<string,unknown>={bytes:bytes.buffer,wrappingKey};
  const db={close(){},transaction(_store:string,mode?:string){
    const tx:{oncomplete?:()=>void;objectStore:()=>unknown}={objectStore:()=>({
      get(){const request:{result:unknown;onsuccess?:()=>void}={result:row};queueMicrotask(()=>{request.onsuccess?.();if(mode==='readwrite')queueMicrotask(()=>tx.oncomplete?.());});return request;},
      put(value:Record<string,unknown>){row=value;},
    })};return tx;
  }};
  vi.stubGlobal('indexedDB',{open(){const request:{result:unknown;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
  return{binding:{keyId:'fixture-key',artifactSha256:digest}};
}
afterEach(()=>vi.unstubAllGlobals());
const wallet:SharedWallet={userId:'fixture-owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
it.each(['native-full','native-cash-only'] as const)('retains %s through actual wallet encryption and restoration',async walletScope=>{
 const {binding}=await vault();
 await saveWalletObservation(binding,wallet,'2026-10-18T12:00:00Z',undefined,undefined,undefined,undefined,walletScope);
 const restored=await loadWalletObservation(binding);expect(restored?.wallet).toEqual(wallet);expect(restored?.walletScope).toBe(walletScope);
});
it('keeps a pre-marker cache displayable without upgrading it',async()=>{
 const {binding}=await vault();await saveWalletObservation(binding,wallet,'2026-10-18T12:00:00Z');
 const restored=await loadWalletObservation(binding);expect(restored?.wallet.totalUsdCents).toBe('300');expect(restored?.walletScope).toBeUndefined();
});

it('retains the exact display quote hold through actual wallet encryption and restoration',async()=>{
 const {binding}=await vault(),quoteHold={schema:'bank.wallet-quote-hold.v1' as const,userId:wallet.userId,balancePhiMicro:wallet.balancePhiMicro,reserveUsdCents:wallet.reserveUsdCents,kaiUpulse:wallet.kaiUpulse,pulse:wallet.pulse};
 await saveWalletObservation(binding,wallet,'2026-10-18T12:00:00Z',undefined,undefined,undefined,undefined,undefined,quoteHold);
 expect((await loadWalletObservation(binding))?.quoteHold).toEqual(quoteHold);
});
