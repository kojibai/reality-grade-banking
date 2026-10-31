/** Discovery metadata only: rel=alternate never fetches or prepares a view. */
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const stripPublicReadingLinks=(html:string)=>html.replace(/<link\b[^>]*\bdata-public-reading="(?:html|text)"[^>]*>/g,'');
export function publicReadingLinks(kind:'page'|'asset'|'profile',coordinate:string){
 const path=kind==='page'?'/read/pages'+coordinate:'/read/'+(kind==='asset'?'assets':'profiles')+'/'+encodeURIComponent(coordinate)+'/',text=kind==='page'?path+'index.txt':path+'?format=text';
 return `<link data-public-reading="html" rel="alternate" type="text/html" title="Public reading view" href="${escape(path)}"><link data-public-reading="text" rel="alternate" type="text/plain" title="Public text" href="${escape(text)}">`;
}
