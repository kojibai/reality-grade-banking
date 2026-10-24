import type {Plugin} from 'vite';
import {Readable} from 'node:stream';
import {handleCooperativeConversation} from './cooperative-conversation.mjs';

// The same native conversation bridge runs in local preview and the deployed server function.
// No owner key, email key or private account credential is needed.
export function cooperativeConversationPlugin():Plugin{
 const middleware=async(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse,next:()=>void)=>{
  if(req.url?.split('?')[0]!=='/api/cooperatives')return next();
  try{
   const origin='http://'+(req.headers.host??'127.0.0.1');
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
   const method=req.method??'GET',body=['GET','HEAD'].includes(method)?undefined:Readable.toWeb(req);
   const request=new Request(new URL(req.url??'/api/cooperatives',origin),{method,headers,...(body?{body:body as ReadableStream<Uint8Array>,duplex:'half'}:{})} as RequestInit);
   const response=await handleCooperativeConversation(request);res.statusCode=response.status;
   response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:false,error:'RECEIZ_RESULT_UNCONFIRMED'}));}
 };
 return {name:'cooperative-native-conversation',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
