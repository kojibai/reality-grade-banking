// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CreatedAssetResult,type CreatedAssetResultValue} from '../src/features/assets/CreatedAssetResult';
import type {AssetDeliveryTiming} from '../src/features/assets/asset-progress-estimate';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const original:CreatedAssetResultValue={title:'A saved Original',digest:'a'.repeat(64),publication:{status:'pending'}};
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());vi.useRealTimers();});
function fixture(){
 const host=document.createElement('div'),root=createRoot(host);roots.push(root);
 const show=(result=original,deliveryActive=true,deliveryTiming?:AssetDeliveryTiming)=>act(()=>root.render(<CreatedAssetResult result={result} settings={{symbol:'ORG',units:'1'}} busy={false} deliveryActive={deliveryActive} deliveryTiming={deliveryTiming} allowLocalSigning error="" username="artist" publicItem={null} onRetryDelivery={()=>{}} onPublishMarket={()=>{}} onOpenAsset={()=>{}} onSave={()=>{}} onClose={()=>{}}/>));
 return {host,show};
}

it('shows an indeterminate delivery bar and elapsed waiting time without inventing a completion percentage or deadline',()=>{
 vi.useFakeTimers();const view=fixture();view.show();
 const bar=view.host.querySelector('[role="progressbar"]');
 expect(bar).not.toBeNull();expect(bar?.hasAttribute('aria-valuenow')).toBe(false);
 expect(bar?.getAttribute('aria-valuetext')).toMatch(/measuring delivery time/i);
 expect(view.host.textContent).toContain('Measuring delivery time…');
 expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 0:00');
 act(()=>vi.advanceTimersByTime(65_000));
 expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 1:05');
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is sealed.');
 expect(view.host.querySelector('[role="progressbar"]')).toBe(bar);
 expect([...view.host.querySelectorAll('button')].find(button=>button.textContent==='Sign')?.disabled).toBe(false);
});

it('preserves the wait through rerenders and saved signing, then removes it only on actual public confirmation',()=>{
 vi.useFakeTimers();const view=fixture();view.show();act(()=>vi.advanceTimersByTime(12_000));
 view.show({...original,pbiSigned:true,marketPublication:{status:'pending'}});
 expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 0:12');
 expect(view.host.querySelector('.asset-delivery-progress')?.textContent).toContain('Original and signature saved');
 act(()=>vi.advanceTimersByTime(3_600_000));
 expect(view.host.querySelector('[role="progressbar"]')).not.toBeNull();
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is signed.');
 view.show({...original,pbiSigned:true,marketPublication:{status:'published'}});
 expect(view.host.querySelector('[role="progressbar"]')).toBeNull();
 expect(view.host.querySelector('[role="timer"]')).toBeNull();
 expect(vi.getTimerCount()).toBe(0);
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is signed and public.');
});

it('stops the clock after an unconfirmed attempt and starts a fresh wait only when delivery resumes',()=>{
 vi.useFakeTimers();const view=fixture();view.show();act(()=>vi.advanceTimersByTime(8_000));
 view.show({...original,publication:{status:'rejected',code:'PROFILE_SHOWCASE_PUBLICATION_HTTP_503'}},false);
 expect(view.host.querySelector('[role="progressbar"]')).toBeNull();expect(vi.getTimerCount()).toBe(0);
 expect([...view.host.querySelectorAll('button')].some(button=>button.textContent==='Retry public delivery')).toBe(true);
 view.show();expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 0:00');
});

it('uses confirmed similar-size attempts for a range, and keeps waiting honestly when that range is exceeded',()=>{
 vi.useFakeTimers();const view=fixture();
 for(const [index,duration] of [10_000,20_000,30_000].entries()){
  const timing:AssetDeliveryTiming={attemptId:`measured-${index}`,sourceDigest:original.digest,phase:'source',sizeBytes:512,startedAtMs:performance.now()};
  view.show(original,true,timing);act(()=>vi.advanceTimersByTime(duration));
  view.show({...original,publication:{status:'published'}},false,timing);
 }
 const timing:AssetDeliveryTiming={attemptId:'measured-current',sourceDigest:original.digest,phase:'source',sizeBytes:512,startedAtMs:performance.now()};
 view.show(original,true,timing);
 expect(view.host.textContent).toContain('About 10–30s remaining');
 expect(view.host.textContent).toContain('3 confirmed deliveries on this device');
 expect(view.host.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false);
 act(()=>vi.advanceTimersByTime(35_000));
 expect(view.host.textContent).toContain('Taking longer than recent deliveries…');
 expect(view.host.querySelector('[role="progressbar"]')).not.toBeNull();
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is sealed.');
 // The source timing does not estimate the saved signature's separate delivery.
 view.show({...original,pbiSigned:true,marketPublication:{status:'pending'}},true,timing);
 expect(view.host.textContent).toContain('Measuring delivery time…');
});

it('uses an owner-supplied real start time without treating panel opening as a delivery start',()=>{
 vi.useFakeTimers();const view=fixture();
 const timing:AssetDeliveryTiming={attemptId:'earlier-real-start',sourceDigest:original.digest,phase:'source',sizeBytes:2048,startedAtMs:performance.now()};
 act(()=>vi.advanceTimersByTime(5000));view.show(original,true,timing);
 expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 0:05');
 expect(view.host.querySelector('[role="timer"]')?.getAttribute('aria-label')).toBe('Elapsed delivery time');
 view.show({...original,publication:{status:'pending'}},false);
 act(()=>vi.advanceTimersByTime(5000));view.show();
 expect(view.host.querySelector('[role="timer"]')?.textContent).toBe('Waiting 0:00');
 expect(view.host.querySelector('[role="timer"]')?.getAttribute('aria-label')).toBe('Elapsed wait on this screen');
 expect(view.host.textContent).toContain('Measuring delivery time…');
});
