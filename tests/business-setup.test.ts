import {expect,it,vi} from 'vitest';
import {businessSetupTools,parseBusinessSetupCall,createBusinessSetupTools} from '../src/receiz/business-setup';
const uid='11111111-1111-4111-8111-111111111111';
const operation={id:'business-operation-001',quoteExpiresAt:'2026-10-25T22:00:00.000Z'};
it('exposes seven dormant outcome-specific tools without credentials or transport selectors in model arguments',()=>{
 expect(businessSetupTools).toHaveLength(7);
 for(const tool of businessSetupTools){expect(tool.parameters.additionalProperties).toBe(false);expect(JSON.stringify(tool.parameters)).not.toMatch(/continuation|cookie|authorization|accountUid|ownerUserId|requestId|quoteExpiresAt/);expect(tool.description.length).toBeGreaterThan(35);}
 expect(businessSetupTools.filter(t=>t.effect==='configuration').every(t=>t.requiresOwnerApproval)).toBe(true);expect(businessSetupTools.find(t=>t.name==='business_create_work')?.effect).toBe('metered');
});
it('bounds exact native tool input and requires trusted operation metadata for writes that use it',()=>{
 expect(parseBusinessSetupCall({tool:'business_connect_domain',args:{hostname:'studio.example.com'}})).toEqual({tool:'business_connect_domain',args:{hostname:'studio.example.com'}});
 for(const call of [{tool:'business_inspect_agent',args:{ownerUserId:uid}},{tool:'business_connect_domain',args:{hostname:''}},{tool:'business_connect_domain',args:{hostname:'https://studio.example.com'}},{tool:'business_connect_domain',args:{hostname:'studio.example.com',action:'delete'}},{tool:'business_configure_agent',args:{systemPersona:'x'.repeat(2401)},operation},{tool:'business_configure_agent',args:{policy:{allowAutonomousCommerce:true}},operation},{tool:'business_configure_agent',args:{displayName:'My agent'}},{tool:'business_create_work',args:{mode:'unknown',prompt:'Hello'},operation},{tool:'business_inspect_creation',args:{},extra:true}])expect(()=>parseBusinessSetupCall(call)).toThrow();
});
it('keeps operation IDs separate from model args and accepts only exact bounded partial edits',()=>{
 const call={tool:'business_configure_agent',args:{displayName:'Studio',offer:{offerSummary:'We deliver careful work.'},routing:{allowTeamHandoff:true}},operation};
 expect(parseBusinessSetupCall(call)).toEqual(call);
 expect(()=>parseBusinessSetupCall({...call,args:{...call.args,operation}})).toThrow();
 expect(()=>parseBusinessSetupCall({...call,operation:{...operation,quoteExpiresAt:'invalid'}})).toThrow();
});
it('invokes only after an explicit call, fixes owner from the trusted closure and never retries an unknown result',async()=>{
 const invoke=vi.fn(async()=>({accountUid:uid,tool:'business_connect_domain' as const,outcome:'unknown' as const,error:'Connection interrupted'}));
 const tools=createBusinessSetupTools({accountUid:uid,invoke,assertOpen(){}});expect(invoke).not.toHaveBeenCalled();
 const result=await tools.execute('business_connect_domain',{hostname:'studio.example.com'});
 expect(result.outcome).toBe('unknown');expect(invoke).toHaveBeenCalledExactlyOnceWith({accountUid:uid,tool:'business_connect_domain',args:{hostname:'studio.example.com'}});
});
it('rejects foreign-owner results and ignores completion after the admitted identity is disposed',async()=>{
 const foreign=createBusinessSetupTools({accountUid:uid,invoke:async()=>({accountUid:'other',tool:'business_inspect_agent',outcome:'accepted',data:{}}),assertOpen(){}});
 await expect(foreign.execute('business_inspect_agent',{})).rejects.toThrow('BUSINESS_SETUP_OWNER_MISMATCH');
 let open=true;const assertOpen=()=>{if(!open)throw Error('Identity disposed');};
 const tools=createBusinessSetupTools({accountUid:uid,invoke:async()=>{open=false;return{accountUid:uid,tool:'business_inspect_agent',outcome:'accepted',data:{}};},assertOpen});
 await expect(tools.execute('business_inspect_agent',{})).rejects.toThrow('Identity disposed');
});
it('preserves the native creator operation identifier contract without silently normalizing or replacing it',()=>{
 for(const id of ['x'.repeat(81),'not a native id','!invalid-id'])expect(()=>parseBusinessSetupCall({tool:'business_create_work',args:{mode:'document',prompt:'A proposal'},operation:{...operation,id}})).toThrow();
});

it.each([['none'],{toString:()=> 'none'},7])('rejects a nonstring memory scope rather than letting native normalization choose another scope',memoryScope=>{
 expect(()=>parseBusinessSetupCall({tool:'business_configure_agent',args:{memoryScope},operation})).toThrow();
});
