import type {Plugin,Connect} from 'vite';
import {readFile} from 'node:fs/promises';
import {handleInvitationPreview} from './invitation-preview';
// @ts-expect-error The shared static public template is plain ESM.
import {invitationContent} from '../scripts/receiving-page.mjs';

export function invitationPreviewPlugin():Plugin{
 const middleware=(page:()=>Promise<string>):Connect.NextHandleFunction=>async(req,res,next)=>{
  const url=new URL(req.url??'/','http://localhost');
  if(url.pathname!=='/api/invitation'&&!/^\/invitation\/[a-f0-9]{64}(?:\/og\.png|\/?)$/.test(url.pathname))return next();
  try{
   const response=await handleInvitationPreview(new Request(url,{method:req.method}),{page,image:async invitation=>(await import('./invitation-share-art')).renderInvitationImage(invitation)});
   res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=503;res.setHeader('cache-control','no-store');res.end('This receiving invitation is temporarily unavailable.');}
 };
 return{name:'bankeiz-invitation-preview',configureServer(server){server.middlewares.use(middleware(async()=>server.transformIndexHtml('/invitation/',`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/styles/site-footer.css"><link rel="stylesheet" href="/learn/receiving.css"><script src="/learn/learn.js" defer></script></head><body data-bank-surface="learn"><div id="public-learn-root">${invitationContent()}</div></body></html>`)));},configurePreviewServer(server){server.middlewares.use(middleware(()=>readFile('dist/invitation/index.html','utf8')));}};
}
