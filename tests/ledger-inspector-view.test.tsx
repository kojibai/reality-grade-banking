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
it('offers the same lazy media and long-form reader and caption link pills in public ledger details',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'essay',receizId:'essay',title:'Sealed essay',summary:'Read the report https://example.com/report',verifyHref:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',profileOriginal:{hasLongForm:true,media:{originalDownloadSrc:'/api/profile/originals/download?receizId=essay&kind=original',originalDownloadSha256Hex:'c'.repeat(64)}}}]}}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
 expect(host.querySelector('button[aria-label="Read full text"]')).not.toBeNull();
 expect(host.querySelector('.proof-object-cover')?.textContent).toContain('Experience the original');
 expect(host.querySelector('.proof-caption-links a')?.getAttribute('href')).toBe('https://example.com/report');
 expect(host.querySelector('.asset-caption p')?.textContent).not.toContain('https://');expect(fetch).not.toHaveBeenCalled();
});
it('distinguishes calculated event value from the locally evaluated current value',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'card-transfer',actionKind:'receiz.sports_arena.card_transfer',pulse:120}]}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root!.render(<LedgerInspector record={record} value={{basis:'card-model',amountUsdCents:'1200',pulse:'120',considerationUsdCents:null}} currentValue={{basis:'live-model',amountUsdCents:'3400',pulse:'300',considerationUsdCents:null}}/>));
 expect(host.textContent).toContain('Calculated transfer value');expect(host.textContent).toContain('$12.00');expect(host.textContent).toContain('Current live value');expect(host.textContent).toContain('$34.00');expect(host.textContent).toContain('Separate from the value at this event.');expect(fetch).not.toHaveBeenCalled();
});
it('shows a restrained directional return beside card event and live values without IO',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'card-return',actionKind:'receiz.sports_arena.card_transfer',pulse:120}]}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LedgerInspector record={record} value={{basis:'card-model',amountUsdCents:'1200',pulse:'120',considerationUsdCents:null}} currentValue={{basis:'live-model',amountUsdCents:'900',pulse:'300',considerationUsdCents:null}}/>));
 expect(host.querySelector('.ledger-transfer-return.is-down')?.textContent).toContain('−25.00%');expect(host.textContent).toContain('−$3.00');expect(fetch).not.toHaveBeenCalled();
});
