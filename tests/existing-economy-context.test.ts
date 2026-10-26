import {expect,it} from 'vitest';
import {economyPages} from '../src/content/existing-economy.mjs';
import {handleCooperativeConversation} from '../server/cooperative-conversation.mjs';
it.each(['/economy/','/farmers/','/fuel/','/repairs/','/grocers/','/housing/','/workers/'])('sends %s as context through the existing fixed-owner conversation without new authority',async pagePath=>{
 let sent:Record<string,unknown>={};const response=await handleCooperativeConversation(new Request('https://bankeiz.com/api/cooperatives',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://bankeiz.com',Cookie:'receiz_world_visitor=guest_economy_123456'},body:JSON.stringify({action:'message',message:'I have value and need the next exchange.',consent:true,clientOperationId:'economy-context-test',quoteExpiresAt:new Date(Date.now()+600000).toISOString(),pagePath})}),{fetch:async(url,init)=>{expect(String(url)).toBe('https://receiz.com/api/world/profile/bjklock');sent=JSON.parse(String(init?.body));return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Let’s map that exchange.'}});}});
 expect(response.status).toBe(200);expect(sent.clientContext).toMatchObject({applicationName:'Bankeiz',pagePath,pageTitle:economyPages.find(p=>p.path===pagePath)!.title});expect(sent.threadKey).toMatch(/^cooperatives:/);
});
