// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import {NoteContinuityDetails} from '../src/features/notes/NoteContinuityDetails';
import {NoteContinuityStandard} from '../src/conformance/NoteContinuityStandard';
import {noteContinuity} from '../src/content/note-continuity.mjs';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());

it('keeps optional guidance closed and starts no network request or device ceremony',async()=>{
 const request=vi.fn(),credential=vi.fn();
 vi.stubGlobal('fetch',request);
 vi.stubGlobal('PublicKeyCredential',{isUserVerifyingPlatformAuthenticatorAvailable:credential});
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<NoteContinuityDetails/>));
  const details=host.querySelector('details')!;
  expect(details.open).toBe(false);
  expect(host.querySelectorAll('button,input,select')).toHaveLength(0);
  act(()=>host.querySelector('summary')!.click());
  expect(details.open).toBe(true);
  expect(request).not.toHaveBeenCalled();expect(credential).not.toHaveBeenCalled();
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/conformance/#note-continuity');
 }finally{act(()=>root.unmount());}
});

it('does not advertise the missing connected adapter or a future accessory as available',()=>{
 const host=document.createElement('div');
 host.innerHTML=renderToStaticMarkup(<NoteContinuityStandard/>);
 expect(host.querySelector('[data-note-execution-status]')?.getAttribute('data-note-execution-status')).toBe('integration-required');
 expect(host.querySelector('[data-note-execution-status]')?.textContent).toContain('not enabled');
 expect(host.querySelector('[data-note-accessory-status]')?.getAttribute('data-note-accessory-status')).toBe('coming-soon');
 expect(host.querySelectorAll('button,input')).toHaveLength(0);
 expect(host.querySelector('a[href="#device-evidence"]')).not.toBeNull();
 expect(host.querySelector('a[href*="note-continuity-standard.md"]')).not.toBeNull();
 expect(host.querySelectorAll('.note-standard-law')).toHaveLength(14);
 expect(noteContinuity.requirements.map(item=>item.id)).toEqual(Array.from({length:14},(_,i)=>`NOTE-${String(i+1).padStart(2,'0')}`));
 expect(host.querySelectorAll('a[href*="checkout"],a[href*="buy"],a[href*="order"]')).toHaveLength(0);
});
