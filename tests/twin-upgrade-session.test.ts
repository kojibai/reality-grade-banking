import {expect,it,vi} from 'vitest';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {TwinUpgradeError,type TwinUpgradeResult} from '../src/receiz/twin-upgrade';
import {twinUpgradeSession} from '../src/receiz/twin-upgrade-session';
const checkout={accountUid:'owner',twinAccess:false,checkout:{sessionId:'cs_test_upgrade123',clientSecret:'cs_test_upgrade123_secret_fixture',interval:'month' as const}};
it('shares an in-flight checkout and resumes its original result after view changes without another request',async()=>{
 let resolve!:(value:TwinUpgradeResult)=>void;
 const upgrade=vi.fn(()=>new Promise<TwinUpgradeResult>(done=>{resolve=done;})),identity={upgradeTwin:upgrade} as unknown as OpenIdentity;
 const first=twinUpgradeSession(identity),pending=first.run({action:'checkout',interval:'month'});
 await Promise.resolve();
 const returned=twinUpgradeSession(identity);
 expect(returned).toBe(first);expect(returned.known().pending).toBe(true);
 expect(returned.run({action:'checkout',interval:'year'})).toBe(pending);expect(upgrade).toHaveBeenCalledOnce();
 resolve(checkout);await pending;expect(returned.known().result).toBe(checkout);
 await returned.run({action:'checkout',interval:'year'});expect(upgrade).toHaveBeenCalledOnce();
 expect(twinUpgradeSession({upgradeTwin:upgrade} as unknown as OpenIdentity).known().result).toBeNull();
});
it('allows retry only after a proven pre-checkout failure; an unknown outcome stays check-only even when access is not yet active',async()=>{
 const upgrade=vi.fn().mockRejectedValueOnce(new TwinUpgradeError(true)).mockRejectedValueOnce(Error('network response lost')).mockResolvedValue({accountUid:'owner',twinAccess:false});
 const session=twinUpgradeSession({upgradeTwin:upgrade} as unknown as OpenIdentity);
 await session.run({action:'checkout',interval:'month'});expect(session.known().uncertain).toBe(false);
 await session.run({action:'checkout',interval:'month'});expect(session.known().uncertain).toBe(true);
 await session.run({action:'status'});expect(session.known().uncertain).toBe(true);
 await session.run({action:'checkout',interval:'month'});expect(upgrade).toHaveBeenCalledTimes(3);
});
