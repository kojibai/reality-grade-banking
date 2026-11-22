// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
const inspect=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/ledger-offline-proof',()=>({inspectLedgerOriginal:inspect,downloadLedgerEvidence:vi.fn(),downloadLedgerOriginal:vi.fn(),loadOfflineProofVerifier:vi.fn(),ledgerNativeInspectionMatches:vi.fn()}));
import {PublicOriginalPurchaseRequired} from '../src/receiz/public-original';
import {LedgerProofDetails} from '../src/features/ledger/LedgerProofDetails';
import type {PublicRecord} from '../src/receiz/public-network';
import {publicMarketRecord} from '../src/receiz/public-network';
import {parsePublicMarket} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.restoreAllMocks());
it.each(['Inspect full original','Download original proof','Download verification kit'])('explains a creator-sold Original during %s without calling it failed verification',async action=>{
 inspect.mockReset().mockRejectedValue(new PublicOriginalPurchaseRequired());
 const record:PublicRecord={id:'proofs:creator-download',sourceId:'creator-download',source:'proofs',kind:'proof recorded',title:'Public image',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{artifactDigest:'c'.repeat(64)},details:{originalUrl:'https://receiz.com/api/profile/originals/download?receizId=creator-download&kind=original'},authority:'public-source-projection'};
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<LedgerProofDetails record={record}/>));await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.includes(action))!.click());
  expect(host.querySelector('[role="status"]')?.textContent).toContain('separate download');expect(host.querySelector('[role="status"]')?.textContent).not.toContain('could not be verified');expect(host.querySelector('.ledger-proof-scope')).toBeNull();expect(inspect).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it.each(['artist','writer'])('inspects the public Moment for %s through its own coordinate before requesting any Original',async owner=>{
 const originalUrl='/api/profile/originals/download?receizId=work&kind=original';
 const verifyHref='/v/20260721_1324/03ACA7E2/13241063?a=4f485b42&ms=1784654648298';
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{
  id:`profile:${owner}:work`,receizId:'work',title:'Public image',ownerUsername:owner,pulse:'13241063',verifyHref,
  profileOriginal:{media:{originalDownloadSrc:originalUrl,originalDownloadSha256Hex:'a'.repeat(64)}},
 }]}}).items[0];
 const record=publicMarketRecord(item),host=document.createElement('div'),root=createRoot(host);
 try{
  inspect.mockReset().mockResolvedValue({report:{artifactSha256:'b'.repeat(64),verification:{}},retained:true});
  act(()=>root.render(<LedgerProofDetails record={record}/>));
  const button=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Verify public Moment'));
  expect(button).toBeDefined();
  await act(async()=>button!.click());
  expect(inspect).toHaveBeenCalledOnce();
  expect(inspect.mock.calls[0][0]).toMatchObject({id:record.id+':public-moment',sourceUrl:'https://receiz.com'+verifyHref,evidence:{},details:{}});
  expect(inspect.mock.calls[0][0].evidence).not.toHaveProperty('artifactDigest');
  expect(host.querySelector('[role="status"]')?.textContent).toMatch(/^Public Moment verified/);
 }finally{act(()=>root.unmount());}
});
