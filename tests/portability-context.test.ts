import {expect,it} from 'vitest';
import {portabilityPages} from '../src/content/portability-pages.mjs';
import {handleCooperativeConversation} from '../server/cooperative-conversation.mjs';
it.each(['/crypto/','/nfts/','/nft/'])('carries %s to the real fixed-owner Twin with the canonical audience context',async pagePath=>{
 let sent:Record<string,unknown>={};const response=await handleCooperativeConversation(new Request('https://bankeiz.com/api/cooperatives',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://bankeiz.com',Cookie:'receiz_world_visitor=guest_portability_123456'},body:JSON.stringify({action:'message',message:'What can I do with what I own?',consent:true,clientOperationId:'portability-context-test',quoteExpiresAt:new Date(Date.now()+600000).toISOString(),pagePath})}),{fetch:async(url,init)=>{expect(String(url)).toBe('https://receiz.com/api/world/profile/bjklock');sent=JSON.parse(String(init?.body));return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Let’s inspect the source.'}});}});
 expect(response.status).toBe(200);const path=pagePath==='/crypto/'?pagePath:'/nfts/';expect(sent.clientContext).toMatchObject({applicationName:'Bankeiz',pagePath:path,pageTitle:portabilityPages.find(p=>p.path===path)!.title});expect(sent.threadKey).toMatch(/^cooperatives:/);
});
