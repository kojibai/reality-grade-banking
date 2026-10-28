/** One terminal call observation schedules one record job. Both the host's
 * button and a remote End reach this same actual call state. */
export function createMeetingEndRecord(input:{prepare():Promise<void>;record():Promise<void>;hasFinalRecord():boolean}){const jobs=new Map<string,Promise<void>>();return(call:{id:string;status:string}|null)=>{if(!call||!['ended','archived'].includes(call.status))return null;const held=jobs.get(call.id);if(held)return held;const job=(async()=>{await input.prepare();if(!input.hasFinalRecord())await input.record();})();jobs.set(call.id,job);return job;};}
