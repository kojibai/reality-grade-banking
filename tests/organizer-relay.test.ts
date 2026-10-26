import {it,expect,vi,afterEach} from 'vitest';
import {relayNativeAccount} from '../server/native-account';
afterEach(()=>vi.unstubAllGlobals());
it('forwards the existing availability PUT JSON intact through the same cookie-free transport',async()=>{
 const body=JSON.stringify({scheduleConfig:{slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14},customQuestions:[]});
 const held=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{expect(init?.method).toBe('PUT');expect(init?.body).toBe(body);expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test');expect(init?.credentials).toBe('omit');return Response.json({ok:true});});vi.stubGlobal('fetch',held);
 const response=await relayNativeAccount(new Request('https://bankeiz.test/api/bank/native/api/calendar/embed/bjklock',{method:'PUT',headers:{authorization:'Bearer test','content-type':'application/json'},body}));expect(response.status).toBe(200);expect(held).toHaveBeenCalledTimes(1);
});
