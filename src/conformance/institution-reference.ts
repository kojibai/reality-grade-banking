/** Console-only audit enrichment. Keep this outside the Bank's idle runner
 * graph: the full source corpus belongs to the independently opened console. */
import {institutionChecks,runReferenceCases,type InstitutionCheckId,type InstitutionCheckResult} from './reference';
import {browserSourceIdentity} from './provenance';
import {coverage} from './coverage';
export async function runInstitutionBrowserChecks(onStart:(id:InstitutionCheckId)=>void,onResult:(result:InstitutionCheckResult)=>void){
 const report=await runReferenceCases(institutionChecks,onStart,onResult);
 return {...report,sourceIdentity:await browserSourceIdentity(),coverage};
}
