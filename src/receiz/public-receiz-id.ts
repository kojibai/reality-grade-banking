export function publicReceizId(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const alias=value.trim().replace(/\.receiz\.id$/i,'').replace(/^@/,'').toLowerCase();
 return /^[a-z0-9_]{3,24}$/.test(alias)?`${alias}.receiz.id`:null;
}
