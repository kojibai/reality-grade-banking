// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {startPublicDocumentRuntime,afterPublicNavigationReady} from '../src/core/public-document-entry';
const stops:Array<()=>void>=[];
afterEach(()=>{for(const stop of stops.splice(0))stop();document.body.replaceChildren();vi.restoreAllMocks();});
const settle=()=>new Promise<void>(done=>queueMicrotask(done));
it.each(['explore','ledger','verify','conformance','receipt'] as const)('starts %s once after its complete root, before trailing navigation data or DOM readiness',async name=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');const start=vi.fn();stops.push(startPublicDocumentRuntime(name,start));
 const root=document.createElement('div');root.id=`public-${name}-root`;document.body.append(root);const child=document.createElement('script');child.id='receiz-navigation';root.append(child);await settle();expect(start).not.toHaveBeenCalled();child.remove();root.append(document.createElement('input'));await settle();expect(start).not.toHaveBeenCalled();
 const nav=document.createElement('script');nav.id='receiz-navigation';document.body.append(nav);await settle();expect(start).toHaveBeenCalledOnce();expect(nav.textContent).toBe('');
 nav.textContent='{"pages":{}}';document.dispatchEvent(new Event('DOMContentLoaded'));await settle();expect(start).toHaveBeenCalledOnce();
});
it('keeps ordinary readiness and explicit cleanup when no navigation payload exists',async()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');const start=vi.fn(),stop=startPublicDocumentRuntime('ledger',start);stop();document.dispatchEvent(new Event('DOMContentLoaded'));await settle();expect(start).not.toHaveBeenCalled();
 const fallback=vi.fn();stops.push(startPublicDocumentRuntime('ledger',fallback));document.dispatchEvent(new Event('DOMContentLoaded'));expect(fallback).toHaveBeenCalledOnce();
 vi.spyOn(document,'readyState','get').mockReturnValue('complete');const loaded=vi.fn();stops.push(startPublicDocumentRuntime('ledger',loaded));expect(loaded).toHaveBeenCalledOnce();
});
it('publishes after the existing navigation listener in loading and interactive stages, immediately once initialized',()=>{
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('loading'),publish=vi.fn();afterPublicNavigationReady(publish);expect(publish).not.toHaveBeenCalled();document.dispatchEvent(new Event('DOMContentLoaded'));expect(publish).toHaveBeenCalledOnce();
 ready.mockReturnValue('interactive');const nav=document.createElement('script');nav.id='receiz-navigation';nav.textContent='{"pages":{}}';document.body.append(nav);afterPublicNavigationReady(publish);expect(publish).toHaveBeenCalledOnce();nav.textContent='';document.dispatchEvent(new Event('DOMContentLoaded'));expect(publish).toHaveBeenCalledTimes(2);afterPublicNavigationReady(publish);expect(publish).toHaveBeenCalledTimes(3);
});
