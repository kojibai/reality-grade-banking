export type VaultLocation={vaultId:string;proof:string|null};
/** Routing only; an address never grants custody or establishes holdings. */
export function vaultLocation(input:string):VaultLocation|null{
 let url:URL;try{url=new URL(input,'https://bankeiz.com');}catch{return null;}
 const match=/^\/vault\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/?$/i.exec(url.pathname);
 if(!match||url.searchParams.getAll('proof').length>1)return null;
 const proof=url.searchParams.get('proof');if(proof!==null&&!/^[a-f0-9]{64}$/.test(proof))return null;
 return{vaultId:match[1].toLowerCase(),proof};
}
