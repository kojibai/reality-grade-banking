import type {Plugin,Connect} from 'vite';
import {readFile} from 'node:fs/promises';
import {handleAssetPreview} from './asset-preview';
export function assetPreviewPlugin():Plugin{
 const middleware=(page:()=>Promise<string>):Connect.NextHandleFunction=>async(req,res,next)=>{const url=new URL(req.url??'/','http://localhost');if(!/^\/asset\/[^/]+(?:\/og\.png|\/player\/?|\/)?$/.test(url.pathname)&&!['/api/asset','/oembed'].includes(url.pathname.replace(/\/$/,'')))return next();try{const response=await handleAssetPreview(new Request(url,{method:req.method}),{page,item:async id=>(await import('./asset-preview')).assetPreviewItem(id),image:async item=>(await import('./asset-preview-render')).renderAssetImage(item)});res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.statusCode=503;res.end('Asset preview unavailable.');}};
 return{name:'bankeiz-asset-preview',configureServer(server){server.middlewares.use(middleware(async()=>server.transformIndexHtml('/explore/',await readFile('explore/index.html','utf8'))));},configurePreviewServer(server){server.middlewares.use(middleware(()=>readFile('dist/explore/index.html','utf8')));}};
}
