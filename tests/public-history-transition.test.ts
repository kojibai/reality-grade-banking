import {expect,it,vi} from 'vitest';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
const previousGeneration='a'.repeat(64),currentGeneration='b'.repeat(64),selectionKey='c'.repeat(64);
const request=()=>new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey,historyTransition:{previousGeneration,currentGeneration,changedKeys:[JSON.stringify(['uid','original'])],asOfPulse:12345}})});
it('prepares a history delta only between the exact Source-selected predecessor and candidate roots',async()=>{
 const material=new Map([[previousGeneration,'previous selected root'],[currentGeneration,'candidate selected root']]),readMaterial=vi.fn(async(id:string)=>{const text=material.get(id);if(!text)throw Error('unavailable');return text;}),prepareHistoryTransition=vi.fn(async()=>({schema:'bank.public-market.history-transition.v1' as const,previousGeneration,currentGeneration,patch:null,asOfPulse:12345}));
 const result=await handlePreparedPublicMarket(request(),{build:'fixture',prepared:vi.fn(),render:vi.fn(),readMaterial,prepareHistoryTransition});
 expect(result.status).toBe(200);expect(await result.json()).toMatchObject({schema:'bank.public-market.history-transition.v1',previousGeneration,currentGeneration,patch:null,build:'fixture'});expect(readMaterial.mock.calls).toEqual([[previousGeneration],[currentGeneration],[previousGeneration],[currentGeneration]]);expect(prepareHistoryTransition).toHaveBeenCalledWith({selectionKey,historyTransition:{previousGeneration,currentGeneration,changedKeys:[JSON.stringify(['uid','original'])],asOfPulse:12345},previousMaterial:'previous selected root',currentMaterial:'candidate selected root',readPart:readMaterial,readPreviousPart:readMaterial});
});
it('does not prepare from cached or inline state when Source refuses the current candidate',async()=>{
 const readMaterial=vi.fn(async(id:string)=>{if(id===currentGeneration)throw Error('withdrawn');return 'previous selected root';}),prepareHistoryTransition=vi.fn();
 const result=await handlePreparedPublicMarket(request(),{build:'fixture',prepared:vi.fn(),render:vi.fn(),readMaterial,prepareHistoryTransition});expect(result.status).toBe(503);expect(prepareHistoryTransition).not.toHaveBeenCalled();
});
it('does not emit a delta after either selected root becomes unavailable during preparation',async()=>{
 const readMaterial=vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('next').mockRejectedValueOnce(Error('withdrawn')),prepareHistoryTransition=vi.fn(async()=>({schema:'bank.public-market.history-transition.v1' as const,previousGeneration,currentGeneration,patch:null,asOfPulse:12345}));
 const result=await handlePreparedPublicMarket(request(),{build:'fixture',prepared:vi.fn(),render:vi.fn(),readMaterial,prepareHistoryTransition});expect(result.status).toBe(503);expect(prepareHistoryTransition).toHaveBeenCalledTimes(1);
});
it('allows an exact selected-root transition without enumerating every logical ID of a container visibility change',async()=>{
 const prepareHistoryTransition=vi.fn(async()=>({schema:'bank.public-market.history-transition.v1' as const,previousGeneration,currentGeneration,patch:null,asOfPulse:12345})),readMaterial=vi.fn(async(id:string)=>id===previousGeneration?'prior exact root':'current exact root');
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey,historyTransition:{previousGeneration,currentGeneration,asOfPulse:12345}})}),{build:'fixture',prepared:vi.fn(),render:vi.fn(),readMaterial,prepareHistoryTransition});
 expect(response.status).toBe(200);expect(prepareHistoryTransition).toHaveBeenCalledOnce();expect(readMaterial).toHaveBeenCalledTimes(4);
});
