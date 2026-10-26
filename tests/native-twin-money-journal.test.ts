import {expect,it,vi} from 'vitest';
import {createNativeTwin} from '../src/receiz/native-twin';
const owner='owner-uid',event={schema:'bank.money-planning-event.v1' as const,ownerUid:owner,operationId:'operation-0001',data:'{"commitments":[]}'};
it('uses only authenticated owner routes for exact private planning journal pages and appends',async()=>{
 const request=vi.fn(async(_path:string,init?:RequestInit)=>Response.json(init?.method==='POST'?{ok:true,ownerUid:owner,operationId:event.operationId}:{ok:true,ownerUid:owner,events:[event],hasMore:false,nextCursor:null,resumeCursor:'cursor-one'})),api=createNativeTwin({accountUid:owner,username:'owner',assertOpen(){},request});
 const page=await api.moneyJournal.read();expect(page.events).toEqual([event]);await api.moneyJournal.append(event);expect(request.mock.calls.map(call=>call[0])).toEqual(['/api/developers/twin/owner/money','/api/developers/twin/owner/money']);
 await expect(api.moneyJournal.append({...event,ownerUid:'foreign'})).rejects.toThrow('OWNER_MISMATCH');expect(request).toHaveBeenCalledTimes(2);
});
it('does not admit a foreign journal as owner context',async()=>{
 const api=createNativeTwin({accountUid:owner,username:'owner',assertOpen(){},request:async()=>Response.json({ok:true,ownerUid:'foreign',events:[],hasMore:false,nextCursor:null,resumeCursor:null})});await expect(api.moneyJournal.read()).rejects.toThrow('OWNER_MISMATCH');
});
it('admits the exact journal path through both client and relay transport guards',async()=>{
 const {permittedNativePath}=await import('../src/receiz/native-transport');const root='https://receiz.com/api/developers/twin/owner/money';expect(permittedNativePath(root,'GET')).toBe(true);expect(permittedNativePath(root,'POST')).toBe(true);expect(permittedNativePath(root+'?cursor=abc_123','GET')).toBe(true);for(const bad of ['?ownerUid=foreign','?cursor=abc&cursor=def','?cursor='])expect(permittedNativePath(root+bad,'GET')).toBe(false);expect(permittedNativePath(root+'?cursor=abc','POST')).toBe(false);
});
it('uses a one-time native private delivery claim and treats a repeated claim as unknown delivery',async()=>{
 const review={id:crypto.randomUUID(),recipientUserId:crypto.randomUUID(),body:'Exact reviewed message'},request=vi.fn(async(_path:string,_init?:RequestInit)=>Response.json({ok:true,ownerUid:owner,reviewId:review.id,claimed:true})),api=createNativeTwin({accountUid:owner,username:'owner',assertOpen(){},request});expect(await api.moneyJournal.claim(review)).toBe(true);request.mockResolvedValueOnce(Response.json({ok:false,error:'owned_money_delivery_claimed'},{status:409}));expect(await api.moneyJournal.claim(review)).toBe(false);expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({schema:'bank.money-delivery-claim.v1',ownerUid:owner,reviewId:review.id,body:review.body});
});
