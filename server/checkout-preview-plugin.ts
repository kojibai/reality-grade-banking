import type {Plugin} from 'vite';
export function checkoutEntryPath(url:string){const path=url.split('?')[0];return path!=='/pay/index.html'&&(path==='/pay'||path.startsWith('/pay/'))?'/pay/index.html':null;}
export function checkoutPreviewPlugin():Plugin{
 const middleware=(req:{url?:string},_res:unknown,next:()=>void)=>{const entry=checkoutEntryPath(req.url??'');if(entry)req.url=entry;next();};
 return{name:'bankeiz-hosted-checkout',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
