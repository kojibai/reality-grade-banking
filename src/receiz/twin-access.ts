import {canUseProductionApi,effectivePlanFromSession} from '../../native/receiz/app/lib/premium/plan.js';

/** Presentation only. Receiz's owner Twin API still enforces the current
 * account entitlement, execution grant and usage credits on each request. */
export function ownerTwinAccountAccess(value:unknown):boolean|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const session=value as {plan?:unknown;entitlementPlan?:unknown};
 if(![session.plan,session.entitlementPlan].some(plan=>['free','premium','business','pro','enterprise'].includes(String(plan))))return null;
 return canUseProductionApi(effectivePlanFromSession(session));
}
