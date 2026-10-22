import {expect,it,vi} from 'vitest';
import {withDeviceIdentityEntry} from '../src/receiz/device-identity-entry';
it('uses the common exclusive identity lock and refuses unsupported browsers',async()=>{
 const previous=globalThis.navigator;const request=vi.fn(async(_name:string,work:()=>Promise<unknown>)=>work());
 Object.defineProperty(globalThis,'navigator',{value:{locks:{request}},configurable:true});
 try{expect(await withDeviceIdentityEntry(async()=>42)).toBe(42);expect(request.mock.calls[0][0]).toBe('receiz-bank-device-identity-entry');
 Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});await expect(withDeviceIdentityEntry(async()=>1)).rejects.toThrow('device');}
 finally{Object.defineProperty(globalThis,'navigator',{value:previous,configurable:true});}
});
