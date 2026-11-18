import type {Plugin,Connect} from 'vite';
import {readFile} from 'node:fs/promises';
import {governancePreviewTarget,handleGovernancePreview} from './governance-preview';

export function governancePreviewPlugin():Plugin{
  function middleware(page:(sample:boolean)=>Promise<string>):Connect.NextHandleFunction{
    return async(req,res,next)=>{
      if(!req.url?.startsWith('/vote/')&&!req.url?.startsWith('/api/governance'))return next();
      const url=new URL(req.url,'http://localhost');
      if(!governancePreviewTarget(url))return next();
      try{
        const host=req.headers.host??'localhost';
        const origin=/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)?'http://'+host:undefined;
        const result=await handleGovernancePreview(new Request(url,{method:req.method,headers:{'user-agent':req.headers['user-agent']??''}}),{page,origin});
        res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await result.arrayBuffer()));
      }catch(err){next(err);}
    };
  }
  const file=(sample:boolean)=>'/vote/'+(sample?'index.html':'record.html');
  return {name:'bankeiz-governance-preview',configureServer(server){server.middlewares.use(middleware(async sample=>server.transformIndexHtml(file(sample),await readFile('.'+file(sample),'utf8'))));},
    configurePreviewServer(server){server.middlewares.use(middleware(sample=>readFile('dist'+file(sample),'utf8')));}};
}
