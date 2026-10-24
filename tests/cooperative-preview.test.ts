import {IncomingMessage, type ServerResponse} from 'node:http';
import {Socket} from 'node:net';
import {expect,it,vi} from 'vitest';
import {cooperativeConversationPlugin} from '../server/cooperative-conversation-plugin';
it('preserves the actual preview availability query through the native calendar bridge',async()=>{
 let middleware!:(req:IncomingMessage,res:ServerResponse,next:()=>void)=>Promise<void>;const urls:string[]=[];
 (cooperativeConversationPlugin().configurePreviewServer as (server:unknown)=>void)({middlewares:{use(fn:typeof middleware){middleware=fn;}}});
 const req=new IncomingMessage(new Socket());req.method='GET';req.url='/api/cooperatives?availability=1';req.headers={host:'127.0.0.1:4175',cookie:'receiz_world_visitor=guest_preview_123'};
 const slot={startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};
 vi.stubGlobal('fetch',async(url:string)=>{urls.push(String(url));return Response.json(String(url).includes('/calendar/')?{ok:true,slots:[slot],customQuestions:[]}:{ok:true,world:{username:'bjklock'}});});
 let output='';const res={statusCode:0,setHeader(){},end(value:Buffer){output=value.toString();}} as unknown as ServerResponse;
 try{await middleware(req,res,()=>{throw Error('Expected preview bridge');});expect(res.statusCode).toBe(200);expect(JSON.parse(output).availability.slots).toEqual([slot]);expect(urls.some(url=>url.endsWith('/api/calendar/embed/bjklock'))).toBe(true);}finally{vi.unstubAllGlobals();}
});
