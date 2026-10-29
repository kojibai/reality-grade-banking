// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {startProfileDocumentRuntime} from '../src/public-explorer/profile-document-entry';
const stops:Array<()=>void>=[];
afterEach(()=>{for(const stop of stops.splice(0))stop();document.body.replaceChildren();vi.restoreAllMocks();});
function loading(){vi.spyOn(document,'readyState','get').mockReturnValue('loading');const root=document.createElement('div');root.id='public-explore-root';document.body.append(root);return root;}
const settle=()=>new Promise<void>(done=>queueMicrotask(done));
it('starts once as soon as the complete carried profile is followed by the navigation element, before navigation content or DOMContentLoaded',async()=>{
 loading();const start=vi.fn(),stop=startProfileDocumentRuntime(start);stops.push(stop);
 const seed=document.createElement('script');seed.id='public-profile-seed';seed.type='application/json';document.body.append(seed);seed.textContent='{"schema":';await settle();expect(start).not.toHaveBeenCalled();
 seed.textContent='{"schema":"bankeiz.public-profile.v1"}';await settle();expect(start).not.toHaveBeenCalled();
 const nav=document.createElement('script');nav.id='receiz-navigation';nav.type='application/json';document.body.append(nav);await settle();expect(start).toHaveBeenCalledOnce();expect(nav.textContent).toBe('');
 nav.textContent='{"pages":{}}';document.dispatchEvent(new Event('DOMContentLoaded'));await settle();expect(start).toHaveBeenCalledOnce();
});
it('preserves the existing source refusal entry and loaded-document paths',async()=>{
 loading();const start=vi.fn();stops.push(startProfileDocumentRuntime(start));const seed=document.createElement('script');seed.id='public-profile-error';document.body.append(seed);const nav=document.createElement('script');nav.id='receiz-navigation';document.body.append(nav);await settle();expect(start).toHaveBeenCalledOnce();
 vi.spyOn(document,'readyState','get').mockReturnValue('complete');const loaded=vi.fn();stops.push(startProfileDocumentRuntime(loaded));expect(loaded).toHaveBeenCalledOnce();
});
it('retains ordinary DOM readiness when no carried source is present and cancels unused work',async()=>{
 loading();const start=vi.fn(),stop=startProfileDocumentRuntime(start);stop();document.dispatchEvent(new Event('DOMContentLoaded'));await settle();expect(start).not.toHaveBeenCalled();
 const fallback=vi.fn();stops.push(startProfileDocumentRuntime(fallback));document.dispatchEvent(new Event('DOMContentLoaded'));expect(fallback).toHaveBeenCalledOnce();
});
