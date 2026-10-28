import type {ProfileInsightsSource} from './profile-insights';
let current:{uid:string;open:()=>Promise<ProfileInsightsSource>}|null=null;
export function registerProfileInsightsSource(uid:string,open:()=>Promise<ProfileInsightsSource>){const entry={uid,open};current=entry;return()=>{if(current===entry)current=null;};}
export async function profileInsightsSource(uid:string){const entry=current;if(!entry||entry.uid!==uid)throw Error('PROFILE_INSIGHTS_ACCOUNT_REQUIRED');const source=await entry.open();if(current!==entry||source.accountUid!==uid)throw Error('PROFILE_INSIGHTS_IDENTITY_CHANGED');return source;}
