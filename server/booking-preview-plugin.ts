import type {Plugin,Connect} from 'vite';
import {readFile} from 'node:fs/promises';
import {handleBookingPreview,isBookingShareCrawler,readBookingOwner} from './booking-preview';
export function bookingPreviewPlugin():Plugin{
 const middleware=(page:()=>Promise<string>):Connect.NextHandleFunction=>async(req,res,next)=>{
  const url=new URL(req.url??'/','http://localhost'),image=/^\/book\/[a-z0-9_]{3,24}\/og\.png$/.test(url.pathname),api=/^\/api\/book\/?$/.test(url.pathname),booking=/^\/book\/[a-z0-9_]{3,24}\/?$/.test(url.pathname);
  if(!api&&!image&&(!booking||!isBookingShareCrawler(req.headers['user-agent']??'')))return next();
  try{const response=await handleBookingPreview(new Request(url,{method:req.method}),{page,owner:readBookingOwner,image:async owner=>(await import('./booking-share-art')).renderBookingImage(owner)});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503,{'cache-control':'no-store'});res.end('Booking invitation unavailable.');}
 };
 return{name:'bankeiz-booking-share',configureServer(server){server.middlewares.use(middleware(async()=>server.transformIndexHtml('/book/index.html',await readFile('book/index.html','utf8'))));},configurePreviewServer(server){server.middlewares.use(middleware(()=>readFile('dist/book/index.html','utf8')));}};
}
