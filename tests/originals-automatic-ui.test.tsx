// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {it,expect,vi,afterEach} from 'vitest';
import {EarnFromOriginals} from '../src/features/qualification/EarnFromOriginals';
import {createQualificationProgressReader,parseQualificationProgress} from '../src/qualification/source';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {qualificationFixture,unsignedQualificationFixture} from './fixtures/originals-qualification';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('reads only on manual or existing events and retains accepted signature evidence',async()=>{
 const fixture=qualificationFixture();let wire:unknown=unsignedQualificationFixture();
 let reads=0;const reader=createQualificationProgressReader('owner',async()=>{reads++;return wire;});
 const identity={originalsQualification:()=>reader.read(),knownOriginalsQualification:reader.known} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<EarnFromOriginals identity={identity} accountUid="owner"/>));
  expect(reads).toBe(0);expect(host.textContent).toContain('Source not yet read');
  const check=[...host.querySelectorAll('button')].find(button=>button.textContent==='Check Original proof')!;await act(async()=>check.click());
  expect(reads).toBe(1);expect(host.textContent).toContain('Sign your Original to unlock');expect(host.textContent).toContain('already earning');expect(host.textContent).not.toContain('Qualified for Earn from Originals');
  wire=fixture;await act(async()=>window.dispatchEvent(new Event('bankeiz:profile-updated')));
  expect(host.textContent).not.toContain('$250,000');expect(reads).toBe(2);expect(host.textContent).toContain('Accepted signature retained');expect(host.textContent).not.toContain('Value unlocked');
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

it('projects known signature history immediately without mount IO or periodic polling',async()=>{
 vi.useFakeTimers();const known=parseQualificationProgress(qualificationFixture(),'owner');let reads=0;
 const interval=vi.spyOn(window,'setInterval');
 const identity={knownOriginalsQualification:()=>known,originalsQualification:async()=>{reads++;return known;}} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<EarnFromOriginals identity={identity} accountUid="owner"/>));
  expect(host.textContent).toContain('Accepted signature retained');expect(reads).toBe(0);expect(interval).not.toHaveBeenCalled();
  await act(async()=>vi.advanceTimersByTime(180_000));expect(reads).toBe(0);
  await act(async()=>window.dispatchEvent(new Event('bankeiz:profile-updated')));expect(reads).toBe(1);
 }finally{act(()=>root.unmount());}
});
