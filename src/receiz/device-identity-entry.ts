/** Shared across all account entry points and tabs. No nested account locks. */
export async function withDeviceIdentityEntry<T>(work:()=>Promise<T>):Promise<T>{
 if(typeof navigator==='undefined'||!navigator.locks)throw Error('This browser cannot safely retain a device identity. Use a current browser and retry.');
 return navigator.locks.request('receiz-bank-device-identity-entry',work);
}
