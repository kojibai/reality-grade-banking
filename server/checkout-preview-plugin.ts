import type {Plugin} from 'vite';
export function checkoutEntryPath(url:string){return /^\/pay\/[a-z0-9_]{3,24}\/?(?:\?|$)/.test(url)?'/pay/index.html':null;}
export function checkoutPreviewPlugin():Plugin{
 const middleware=(req:{url?:string},_res:unknown,next:()=>void)=>{const entry=checkoutEntryPath(req.url??'');if(entry)req.url=entry;next();};
 return{name:'bankeiz-hosted-checkout',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
