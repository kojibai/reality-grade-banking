import {publicPages} from './public-page-metadata.mjs';
import {auditPublicPage} from './public-seo-audit.mjs';

const args=process.argv.slice(2),extra=[];let origin='https://bankeiz.com',all=false;
for(let i=0;i<args.length;i++){
 if(args[i]==='--origin')origin=args[++i];
 else if(args[i]==='--path')extra.push(args[++i]);
 else if(args[i]==='--all')all=true;
 else throw Error('Usage: node scripts/check-public-seo-live.mjs [--origin https://bankeiz.com] [--all] [--path /public-path/]');
}
const target=new URL(origin);
if(!['https:','http:'].includes(target.protocol)||target.username||target.password||target.href!==target.origin+'/')throw Error('Use a public HTTP origin without credentials, path or query.');
if(extra.some(path=>typeof path!=='string'||!/^\/(?!\/)[^?#\s]*$/.test(path)))throw Error('Supply public absolute paths without queries or fragments.');
const paths=[...new Set([...(all||!extra.length?publicPages.filter(page=>!page.noindex).map(page=>page.path):[]),...extra])],results=new Array(paths.length);let next=0;
await Promise.all(Array.from({length:Math.min(3,paths.length)},async()=>{while(next<paths.length){const index=next++;results[index]=await auditPublicPage(origin,paths[index]);}}));
const failed=results.filter(result=>!result.ok);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin:target.origin,scope:'Registered intended-indexable public pages and explicitly supplied public paths; response heads only. Not a search indexing or performance audit.',summary:{checked:results.length,passed:results.length-failed.length,failed:failed.length},intentionalExclusions:publicPages.filter(page=>page.noindex).map(page=>page.path),results},null,2));
process.exitCode=failed.length?1:0;
