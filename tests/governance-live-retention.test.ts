// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {followGovernanceAdditions} from '../src/receiz/governance-live';

it('resumes a retained Vote view on its existing directory cadence',async()=>{
 vi.useFakeTimers();
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 const refresh=vi.fn(async()=>{}),poll={nextReadAt:0};
 const follow=()=>followGovernanceAdditions(refresh,document,window,poll);
 let stop=follow();
 try{
  await vi.advanceTimersByTimeAsync(0);
  expect(refresh).toHaveBeenCalledTimes(1);
  stop();
  window.dispatchEvent(new Event('online'));
  await vi.advanceTimersByTimeAsync(2_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  stop=follow();
  expect(refresh).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(4_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(50);
  window.dispatchEvent(new Event('online'));
  expect(refresh).toHaveBeenCalledTimes(3);
 }finally{stop();vi.useRealTimers();vi.restoreAllMocks();}
});
