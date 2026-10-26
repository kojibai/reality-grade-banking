import {expect,it,vi} from 'vitest';
import {createNativeTwin} from '../src/receiz/native-twin';
const question={message:'Who owes me?',requestId:'operation-0001',quoteExpiresAt:new Date().toISOString(),moneyTools:true};
const response=()=>({ok:true,requestId:question.requestId,world:{username:'owner'},moneyToolsSupported:true,moneyActions:[{tool:'money_list_commitments',args:{direction:'receivable'}}],reply:{message:'I will check what is outstanding.',source:'upstream',actions:[],memory:[]}});
it('requests real same-owner money tools and returns proposals without execution',async()=>{
 const request=vi.fn(async(_path:string,_init?:RequestInit)=>Response.json(response())),api=createNativeTwin({accountUid:'owner-uid',username:'owner',assertOpen(){},request});const reply=await api.ask(question);
 expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({moneyTools:true});expect(reply.moneyActions).toEqual(response().moneyActions);
});
it('refuses unconfigured money counterparts and unknown/malformed tool actions',async()=>{
 for(const value of [{...response(),moneyToolsSupported:false},{...response(),moneyActions:[{tool:'transfer_funds',args:{}}]},{...response(),moneyActions:[{tool:'money_send_reviewed',args:{confirmed:true}}]}]){
  const api=createNativeTwin({accountUid:'owner-uid',username:'owner',assertOpen(){},request:async()=>Response.json(value)});await expect(api.ask(question)).rejects.toThrow('MONEY_');
 }
});
