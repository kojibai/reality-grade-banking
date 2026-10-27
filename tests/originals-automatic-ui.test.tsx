// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {it,expect} from 'vitest';
import {EarnFromOriginals} from '../src/features/qualification/EarnFromOriginals';
import {createQualificationProgressReader} from '../src/qualification/source';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {qualificationFixture,unsignedQualificationFixture} from './fixtures/originals-qualification';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('counts automatically on open and enables account earning after accepted completion',async()=>{
 const fixture=qualificationFixture();let wire:unknown=unsignedQualificationFixture();
 let reads=0;const reader=createQualificationProgressReader('owner',async()=>{reads++;return wire;});
 const identity={originalsQualification:()=>reader.read(),knownOriginalsQualification:reader.known} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<EarnFromOriginals identity={identity} accountUid="owner"/>));
  expect(reads).toBe(1);expect(host.textContent).toContain('Seal, sign and publish');expect(host.textContent).toContain('One public, PBI-signed Original');expect(host.textContent).not.toContain('Qualified for Earn from Originals');
  wire=fixture;await act(async()=>window.dispatchEvent(new Event('bankeiz:profile-updated')));
  expect(host.textContent).not.toContain('$250,000');expect(host.textContent).toContain('Earn from Originals is on');expect(host.textContent).toContain('Your signed Original is verified');
 }finally{act(()=>root.unmount());}
});
it('opens the existing account proof inspection surface from accepted qualification',async()=>{
 const {OriginalsQualificationView}=await import('../src/features/qualification/EarnFromOriginals');
 const {parseQualificationProgress}=await import('../src/qualification/source');
 const {LiveActions}=await import('../src/features/account/LiveActions');
 const host=document.createElement('div'),root=createRoot(host),identity={} as OpenIdentity;
 try{
  await act(async()=>root.render(<LiveActions action={{kind:'account-proof'}} identity={identity} wallet={null} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
  expect(host.querySelector('[aria-label="Shareable account proof"]')).not.toBeNull();expect(host.textContent).toContain('Review account proof');
  await act(async()=>root.render(<OriginalsQualificationView observation={parseQualificationProgress(qualificationFixture(),'owner')} onProfile={()=>{}} onCreate={()=>{}}/>));
  expect(host.textContent).toContain('Inspect your account proof');
 }finally{act(()=>root.unmount());}
});
