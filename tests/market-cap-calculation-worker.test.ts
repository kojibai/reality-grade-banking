import {afterEach,expect,it,vi} from 'vitest';
import source from '../public/receiz-public-capitalization.json';
import history from '../public/receiz-public-share-chart-history.json';
const stub=vi.hoisted(()=>({build:vi.fn()}));
vi.mock('../src/receiz/market-projection/build-history',()=>({buildMarketHistory:stub.build}));
afterEach(()=>vi.unstubAllGlobals());
it('reads an already-completed calculation without a new valuation or resending it while closed',async()=>{
 const calculation={pulse:history.summary.serverPulse,usdCents:history.summary.shareCapitalization.usdCents,assets:[]},postMessage=vi.fn(),worker={postMessage,onmessage:null as null|((event:unknown)=>Promise<void>)};
 stub.build.mockImplementation(async(_source,_history,_continuing,_yield,current)=>{current.onCalculation(calculation);return history;});
 vi.stubGlobal('self',worker);await import('../src/receiz/market-projection/worker');
 await worker.onmessage!({data:{id:1,source,history,catalog:{items:[]},pulse:history.summary.serverPulse,shareCapitalization:true}});
 expect(stub.build).toHaveBeenCalledOnce();expect(postMessage.mock.calls.at(-1)![0]).not.toHaveProperty('marketCalculation');
 await worker.onmessage!({data:{marketInspect:true}});expect(stub.build).toHaveBeenCalledOnce();expect(postMessage.mock.calls.at(-1)![0]).toEqual({inspectionOnly:true,marketCalculation:calculation});
 const sent=postMessage.mock.calls.length;await worker.onmessage!({data:{marketInspect:false}});await worker.onmessage!({data:{marketInspect:true,readCalculation:false}});expect(postMessage).toHaveBeenCalledTimes(sent);
 await worker.onmessage!({data:{id:2,marketTick:true,pulse:history.summary.serverPulse+1}});expect(stub.build).toHaveBeenCalledTimes(2);expect(postMessage.mock.calls.at(-1)![0]).toMatchObject({id:2,marketCalculation:calculation});
 let finish!:(value:unknown)=>void;stub.build.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const job=worker.onmessage!({data:{id:3,marketTick:true,pulse:history.summary.serverPulse+2}});
 const continuing=stub.build.mock.calls.at(-1)![2];await worker.onmessage!({data:{marketInspect:false}});expect(continuing()).toBe(true);finish(history);await job;expect(postMessage.mock.calls.at(-1)![0]).toMatchObject({id:3,history});
});
