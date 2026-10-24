const alphabet=/^[A-Za-z0-9_-]+$/;
export function vaultBase64(bytes:Uint8Array):string{
 let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function vaultBytes(value:unknown,max:number):Uint8Array<ArrayBuffer>{
 if(typeof value!=='string'||!alphabet.test(value)||value.length>Math.ceil(max*4/3)||value.length%4===1)throw Error('VAULT_ENCODING_INVALID');
 const result=Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 if(!result.length||result.length>max||vaultBase64(result)!==value)throw Error('VAULT_ENCODING_INVALID');return result;
}
export function vaultObject(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))throw Error('VAULT_FORMAT_INVALID');
 return value as Record<string,unknown>;
}
export function vaultCanonical(value:unknown):string{
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(vaultCanonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+vaultCanonical((value as Record<string,unknown>)[key])).join(',')+'}';
 throw Error('VAULT_FORMAT_INVALID');
}
export async function vaultDigest(bytes:Uint8Array):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
