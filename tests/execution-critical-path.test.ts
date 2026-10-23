import {writeFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {measureExecution} from './fixtures/execution-timing';

it('complete Send POST needs no outcome GET',async()=>{
 const r=await measureExecution('send');expect(r.outcomeGets).toBe(0);expect(r.financialDispatches).toBe(1);expect(r.retained).toEqual(r.original);
});
it.each(['buy','sell']as const)('complete Market POST needs no outcome GET (%s)',async kind=>{
 const r=await measureExecution(kind);expect(r.outcomeGets).toBe(0);expect(r.financialDispatches).toBe(1);expect(r.retained).toEqual(r.original);
});
it.each(['send','buy','sell']as const)('terminal retention precedes display adoption (%s)',async kind=>{
 const r=await measureExecution(kind);expect(r.retainedBeforeSuccess).toBe(true);expect(r.publishedBeforeSuccess).toBe(true);
});
it.each(['incomplete','lost']as const)('recovers %s responses once without dispatching again',async response=>{
 for(const kind of ['send','buy','sell']as const){const r=await measureExecution(kind,{response});expect(r.outcomeGets).toBe(1);expect(r.financialDispatches).toBe(1);}
});
it.runIf(!!process.env.EXECUTION_TIMING_OUTPUT)('records isolated cold/warm adapter measurements',async()=>{
 const cold=await measureExecution('send',{requestDelayMs:15,displayDelayMs:30});
 const samples=[];for(let i=0;i<12;i++)for(const kind of ['send','buy','sell']as const)samples.push(await measureExecution(kind,{requestDelayMs:15,displayDelayMs:30}));
 const clean=({retained,original,...value}:Awaited<ReturnType<typeof measureExecution>>)=>value;
 writeFileSync(process.env.EXECUTION_TIMING_OUTPUT!,JSON.stringify({syntheticTransport:true,cold:clean(cold),samples:samples.map(clean)},null,2)+'\n');
},30_000);
