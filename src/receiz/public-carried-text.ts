/** Bounded public text presentation from the existing Original projection.
 * This grants no verification, download rights, ownership or spendability. */
export type PublicCarriedText={title:string|null;text:string;sha256Hex:string};
export function publicCarriedText(input:unknown):PublicCarriedText|null{
 if(!input||typeof input!=='object')return null;const row=input as Record<string,unknown>;
 if(typeof row.text!=='string'||!row.text.length||row.text.length>100_000||typeof row.sha256Hex!=='string'||! /^[a-f0-9]{64}$/i.test(row.sha256Hex)||row.title!=null&&(typeof row.title!=='string'||row.title.length>160))return null;
 return {title:typeof row.title==='string'?row.title:null,text:row.text,sha256Hex:row.sha256Hex.toLowerCase()};
}
