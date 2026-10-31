import type {Plugin,ViteDevServer} from 'vite';
import {handlePublicReading} from './public-reading';
export function publicReadingPlugin():Plugin{
 const install=(server:{middlewares:ViteDevServer['middlewares']})=>{server.middlewares.use((req,res,next)=>{
  if(!/^\/read\/(?:assets|profiles)\//.test(req.url??''))return next();
  const request=new Request(new URL(req.url!,'http://localhost'),{method:req.method,headers:{accept:String(req.headers.accept??'text/html')}});
  void handlePublicReading(request).then(async response=>{res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(await response.text());}).catch(next);
 });};
 return{name:'bankeiz-public-reading',configureServer:install,configurePreviewServer:install};
}
