// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
const inspect=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/ledger-offline-proof',()=>({inspectLedgerOriginal:inspect,downloadLedgerEvidence:vi.fn(),loadOfflineProofVerifier:vi.fn()}));
import {PublicOriginalPurchaseRequired} from '../src/receiz/public-original';
import {LedgerProofDetails} from '../src/features/ledger/LedgerProofDetails';
import type {PublicRecord} from '../src/receiz/public-network';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.restoreAllMocks());
it.each(['Inspect full original','Download full offline proof'])('explains a creator-sold Original during %s without calling it failed verification',async action=>{
 inspect.mockReset().mockRejectedValue(new PublicOriginalPurchaseRequired());
 const record:PublicRecord={id:'proofs:creator-download',sourceId:'creator-download',source:'proofs',kind:'proof recorded',title:'Public image',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{artifactDigest:'c'.repeat(64)},details:{originalUrl:'https://receiz.com/api/profile/originals/download?receizId=creator-download&kind=original'},authority:'public-source-projection'};
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<LedgerProofDetails record={record}/>));await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.includes(action))!.click());
  expect(host.querySelector('[role="status"]')?.textContent).toContain('separate download');expect(host.querySelector('[role="status"]')?.textContent).not.toContain('could not be verified');expect(host.querySelector('.ledger-proof-scope')).toBeNull();expect(inspect).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
