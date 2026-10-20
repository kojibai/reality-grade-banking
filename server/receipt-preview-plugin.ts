import type {Plugin,Connect} from 'vite';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {handleReceiptPreview} from './receipt-preview';

export function receiptPreviewPlugin():Plugin{
 function middleware(page:()=>Promise<string>):Connect.NextHandleFunction{return async(req,res,next)=>{
  const url=new URL(req.url??'/','http://localhost');
  if(!(url.pathname==='/api/receipt'||url.pathname==='/receipt/'&&url.searchParams.has('r')))return next();
  try{
   const response=await handleReceiptPreview(new Request(url,{method:req.method}),{page,image:async receipt=>(await import('./receipt-preview-render')).renderReceiptImage(receipt)});
   res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=503;res.end('Receipt preview is temporarily unavailable.');}
 };}
 return {name:'bankeiz-receipt-preview',configureServer(server){server.middlewares.use(middleware(async()=>server.transformIndexHtml('/receipt/',await readFile(resolve('receipt/index.html'),'utf8'))));},configurePreviewServer(server){server.middlewares.use(middleware(()=>readFile(resolve('dist/receipt/index.html'),'utf8')));}};
}
