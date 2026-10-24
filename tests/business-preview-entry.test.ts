import {expect,it} from 'vitest';
import {publicMetadataPlugin} from '../scripts/public-metadata-plugin.mjs';
import type {PreviewServer} from 'vite';
it('serves every known Business alias as its static public document before the account fallback',()=>{
 let middleware!:(req:{url:string},res:unknown,next:()=>void)=>void;
 const plugin=publicMetadataPlugin();
 const configure=plugin.configurePreviewServer;expect(typeof configure).toBe('function');
 if(typeof configure!=='function')throw Error('STATIC_BUSINESS_PREVIEW_REQUIRED');
 configure.call(undefined as never,{middlewares:{use:(fn:typeof middleware)=>{middleware=fn;}}} as unknown as PreviewServer);
 for(const [url,expected] of [['/business','/business/index.html'],['/business/','/business/index.html'],['/business/for?from=share','/business/for/index.html?from=share'],['/business/for/agencies','/business/for/agencies/index.html'],['/business/for/agencies/','/business/for/agencies/index.html'],['/learn/','/learn/'],['/business/for/unknown','/business/for/unknown']]){
  const req={url};let next=false;middleware(req,null,()=>{next=true;});expect(next).toBe(true);expect(req.url).toBe(expected);
 }
});
