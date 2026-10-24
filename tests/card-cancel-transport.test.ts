import {expect,it} from 'vitest';
import {permittedNativePath} from '../src/receiz/native-transport';
it('allows cancellation only for one original opaque card-session reference',()=>{
 expect(permittedNativePath('/api/connect/payments/session?sessionId=cs_test_original123','DELETE')).toBe(true);
 for(const path of ['/api/connect/payments/session','/api/connect/payments/session?sessionId=invalid','/api/connect/payments/session?sessionId=cs_test_original123&sessionId=cs_test_other123','/api/connect/payments/session?sessionId=cs_test_original123&userId=someone','https://foreign.example/api/connect/payments/session?sessionId=cs_test_original123'])expect(permittedNativePath(path,'DELETE')).toBe(false);
 expect(permittedNativePath('/api/connect/payments/session?sessionId=cs_test_original123','POST')).toBe(false);
});
