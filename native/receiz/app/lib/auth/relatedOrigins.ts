/** Related origins share the canonical Receiz RP through WebAuthn ROR. */
export const RECEIZ_RELATED_ORIGINS=Object.freeze(['https://bankeiz.com','https://www.bankeiz.com']);
export const isReceizRelatedOrigin=(origin:string|null)=>origin!==null&&RECEIZ_RELATED_ORIGINS.includes(origin);
export function relatedPasskeyOrigin(req:Request):string|null{
 const url=new URL(req.url),origin=req.headers.get('origin');
 return ['receiz.com','www.receiz.com'].includes(url.hostname)&&isReceizRelatedOrigin(origin)?origin:null;
}
