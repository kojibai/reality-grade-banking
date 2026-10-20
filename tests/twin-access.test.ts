import {expect,it} from 'vitest';
import {ownerTwinAccountAccess} from '../src/receiz/twin-access';

it.each([
 [{plan:'free'},false],
 [{plan:'premium'},false],
 [{plan:'business'},true],
 [{plan:'pro'},true],
 [{plan:'enterprise'},true],
 [{plan:'premium',entitlementPlan:'business'},true],
 [{plan:'business',entitlementPlan:'free'},true],
 [{},null],
 [{plan:'not-a-plan'},null],
 [null,null],
] as const)('uses the Receiz owner Twin API access policy for %j',(session,want)=>{expect(ownerTwinAccountAccess(session)).toBe(want);});
