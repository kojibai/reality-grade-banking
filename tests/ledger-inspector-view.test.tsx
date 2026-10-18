// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|null=null;
afterEach(()=>{if(root)act(()=>root!.unmount());root=null;document.body.replaceChildren();vi.unstubAllGlobals();});
it('opens complete selected details, value operands and original evidence for any activity without another request',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer-1',kind:'proof_transfer',summary:'Proof transferred',pulse:120,kaiUpulse:'120000001',amountUsdCents:'100',cardValueUsdCents:'9900',amountPhiMicro:'3456789',sender:{displayName:'Alex'},recipient:{displayName:'Sam'},entryHash:'a'.repeat(64),prevHash:'b'.repeat(64),proofBundle:{verificationVersion:'wallet-ledger-v1',capsuleHash:'c'.repeat(64)},transactionHref:'https://receiz.com/t/20261017_1646/92DD0339C992B40E/120?p=c1%3Aabc'}]}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
 expect(host.textContent).toContain('Card value at transfer');expect(host.textContent).toContain('$99.00');expect(host.textContent).toContain('Consideration');expect(host.textContent).toContain('$1.00');
 expect(host.textContent).toContain('Alex');expect(host.textContent).toContain('Sam');expect(host.textContent).toContain('3456789');expect(host.textContent).toContain('wallet-ledger-v1');
 expect(host.querySelector('a[aria-label="Open original source"]')?.getAttribute('href')).toContain('receiz.com/t/');
 expect(host.querySelector('a[aria-label="Open full receipt"]')?.getAttribute('href')).toContain('/receipt/#r=');
 expect(host.querySelector('button[aria-label="Download record details"]')).not.toBeNull();expect(fetch).not.toHaveBeenCalled();
});
it('keeps missing economic data explicit for actions rather than showing zero or a verified badge',()=>{
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',actionKind:'record',summary:'Sealed action'}]}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
 expect(host.textContent).toContain('No amount carried');expect(host.textContent).not.toContain('$0.00');expect(host.textContent).not.toContain('Independently verified');
 expect(host.querySelector('a[aria-label="Open full receipt"]')).not.toBeNull();
});
