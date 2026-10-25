// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import inspection from './fixtures/public-original-inspection.json';
import {LedgerProofDetails} from '../src/features/ledger/LedgerProofDetails';
import {retainProofInspection} from '../src/receiz/proof-inspection';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|undefined;
afterEach(()=>{if(root)act(()=>root!.unmount());root=undefined;document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('keeps the complete retained proof out of the DOM and JSON formatting until its disclosure opens',()=>{
 const report={...inspection,verification:{...inspection.verification,carriedHistory:'retained-proof-'.repeat(150000)}};
 retainProofInspection(report,new Uint8Array([1,2,3]),'original.png',true);
 const record={...parsePublicNetworkPage('actions',{ok:true,actions:[{id:'closed-proof',actionKind:'record',summary:'Retained original'}]}).records[0],evidence:{artifactDigest:report.artifactSha256}};
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const serialize=vi.spyOn(JSON,'stringify'),host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root!.render(<LedgerProofDetails record={record}/>));
 expect(host.textContent).toContain('Canonical original verified');
 expect(serialize.mock.calls.filter(([value])=>value===report)).toHaveLength(0);
 expect(host.querySelector('.ledger-exact-json pre')).toBeNull();
 const disclosure=host.querySelector<HTMLDetailsElement>('.ledger-exact-json')!;
 act(()=>{disclosure.open=true;disclosure.dispatchEvent(new Event('toggle'));});
 expect(serialize.mock.calls.filter(([value])=>value===report)).toHaveLength(1);
 expect(JSON.parse(host.querySelector('pre')!.textContent!)).toEqual(report);
 act(()=>{disclosure.open=false;disclosure.dispatchEvent(new Event('toggle'));});
 expect(host.querySelector('pre')).toBeNull();expect(fetch).not.toHaveBeenCalled();
});
