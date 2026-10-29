import {appendFileSync} from 'node:fs';
import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {beforeAll,expect,it,vi} from 'vitest';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
const gates=vi.hoisted(()=>{const gate=()=>{let open!:()=>void;const value={released:false,promise:new Promise<void>(resolve=>{open=resolve;}),release:()=>{value.released=true;open();}};return value;};return{proof:gate(),availability:gate()};});
vi.mock('../src/receiz/calendar-proof',async()=>{await gates.proof.promise;return vi.importActual('../src/receiz/calendar-proof');});
vi.mock('../src/receiz/public-booking',async()=>{await gates.availability.promise;return vi.importActual('../src/receiz/public-booking');});
beforeAll(async()=>{await vi.importActual('../src/receiz/calendar-proof');await vi.importActual('../src/receiz/public-booking');});
const owner='00000000-0000-4000-8000-000000000001';
const event={id:'00000000-0000-4000-8000-000000000002',ownerUserId:owner,title:'Meet Maya',kind:'appointment',source:'manual',startAt:'2026-11-02T14:00:00Z',endAt:'2026-11-02T14:30:00Z',location:'',note:'',attendees:[],metadata:{},createdAt:'2026-10-29T12:00:00Z',updatedAt:'2026-10-29T12:00:00Z'};
const evidence=process.env.BANKEIZ_OPENING_EVIDENCE;
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function record(path:string,start:number,requestAt:number,end:number){if(evidence)appendFileSync(evidence,JSON.stringify({path,requestStartMs:Math.round(requestAt-start),completeMs:Math.round(end-start),codeDelayMs:300,responseDelayMs:200})+'\n');}
it('requests the selected Calendar proof while verifier code loads, then verifies the same bytes and reuses the result',async()=>{
 const core={kind:'receiz.calendar.event.bundle.v1',version:1,hashAlgorithm:'sha256-jcs',event:{...event,createdByUserId:null}},bundleHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalizeReceizConstitution(core))))].map(v=>v.toString(16).padStart(2,'0')).join('');
 let requestAt=0,beforeCode=false;const request=vi.fn(async()=>{requestAt=performance.now();beforeCode=!gates.proof.released;if(evidence)await wait(200);return Response.json({ok:true,bundleHash,bundle:{...core,bundleHash}});}),api=createNativeOrganizer({accountUid:owner,request});
 const start=performance.now(),pending=api.eventProof(event);let timer:ReturnType<typeof setTimeout>|undefined;
 try{if(evidence)timer=setTimeout(gates.proof.release,300);else{expect(request).toHaveBeenCalledOnce();gates.proof.release();}const proof=await pending;record('Calendar proof',start,requestAt,performance.now());expect(proof.event.title).toBe(event.title);expect(await api.eventProof(event)).toBe(proof);expect(request).toHaveBeenCalledOnce();expect(beforeCode).toBe(true);await expect(api.eventProof({...event,ownerUserId:'other'})).rejects.toThrow();expect(request).toHaveBeenCalledOnce();}
 finally{clearTimeout(timer);gates.proof.release();await pending.catch(()=>{});}
});
it('requests availability while its parser loads and retains the exact accepted response without another read',async()=>{
 const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};let requestAt=0,beforeCode=false;
 const request=vi.fn(async()=>{requestAt=performance.now();beforeCode=!gates.availability.released;if(evidence)await wait(200);return Response.json({ok:true,owner:{userId:owner,username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[]});}),api=createNativeOrganizer({accountUid:owner,request});
 const start=performance.now(),pending=api.availability('bjklock');let timer:ReturnType<typeof setTimeout>|undefined;
 try{if(evidence)timer=setTimeout(gates.availability.release,300);else{expect(request).toHaveBeenCalledOnce();gates.availability.release();}const value=await pending;record('Availability',start,requestAt,performance.now());expect(await api.availability('bjklock')).toBe(value);expect(api.knownAvailability('bjklock')).toBe(value);expect(request).toHaveBeenCalledOnce();expect(beforeCode).toBe(true);expect(request).toHaveBeenCalledWith('/api/calendar/embed/bjklock',expect.objectContaining({method:'PUT',body:JSON.stringify({action:'availability',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})}));}
 finally{clearTimeout(timer);gates.availability.release();await pending.catch(()=>{});}
});
