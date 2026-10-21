import {it,expect} from 'vitest';
import {permittedNativePath} from '../src/receiz/native-transport';
it('permits only the existing same-account profile update and a bounded username availability read',()=>{
 expect(permittedNativePath('/api/receiz/identity/profile','PATCH')).toBe(true);expect(permittedNativePath('/api/profile/username/availability?username=alexmorgan','GET')).toBe(true);
 for(const [url,method]of [['/api/receiz/identity/profile?userId=another','PATCH'],['/api/receiz/identity/profile','POST'],['https://foreign.example/api/receiz/identity/profile','PATCH'],['/api/profile/username/availability?username=alex&username=other','GET'],['/api/profile/username/availability?username=alex&extra=1','GET'],['/api/profile/username/availability?username=../other','GET']])expect(permittedNativePath(url,method)).toBe(false);
});
it('allows the existing profile photo route only as an exact POST',()=>{
 expect(permittedNativePath('/api/profile/me/media','POST')).toBe(true);for(const [url,method]of [['/api/profile/me/media?userId=foreign','POST'],['/api/profile/me/media','GET'],['/api/profile/foreign/media','POST']])expect(permittedNativePath(url,method)).toBe(false);
});
