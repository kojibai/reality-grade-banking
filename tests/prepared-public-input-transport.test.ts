import {createHash} from 'node:crypto';
import {expect,it,vi} from 'vitest';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';

const MAX=32*1024*1024,build='b'.repeat(64),selectionKey='c'.repeat(64);
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
function request(accept?:string){return new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json',...(accept?{accept}:{})},body:JSON.stringify({selectionKey})});}
function dependencies(material:string){return {build,prepareInput:vi.fn(async()=>({material,generation:sha(material)})),prepared:vi.fn(async()=>{throw Error('No saved page should be read.');}),render:vi.fn(async()=>{throw Error('No page should be rendered.');}),readMaterial:vi.fn(async()=>{throw Error('No material should be reopened.');})};}

it('streams the exact existing material once when its escaped envelope exceeds the unchanged bound',async()=>{
 const material=JSON.stringify({text:'\n'.repeat(12*1024*1024)}),generation=sha(material);
 expect(Buffer.byteLength(material)).toBeLessThan(MAX);
 expect(Buffer.byteLength(JSON.stringify({schema:'bank.public-market.render-material.v1',material,generation,build}))).toBeGreaterThan(MAX);
 const deps=dependencies(material),response=await handlePreparedPublicMarket(request('application/octet-stream'),deps);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('application/octet-stream');
 expect(response.headers.get('x-receiz-public-material-revision')).toBe(generation);expect(response.headers.get('x-receiz-public-render-build')).toBe(build);
 const body=await response.text();expect(body).toBe(material);expect(sha(body)).toBe(generation);
 expect(deps.prepareInput).toHaveBeenCalledOnce();expect(deps.prepared).not.toHaveBeenCalled();expect(deps.render).not.toHaveBeenCalled();expect(deps.readMaterial).not.toHaveBeenCalled();
});

it.each([undefined,'application/json','application/octet-stream, application/json','application/octet-stream;q=1'])('keeps the existing JSON envelope for unnegotiated Accept %s',async accept=>{
 const material=JSON.stringify({publicDisplayPolicy:'bank.public-market.curated-display.v3',text:'carried public text'}),deps=dependencies(material),response=await handlePreparedPublicMarket(request(accept),deps);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toMatch(/^application\/json/);
 expect(await response.json()).toEqual({schema:'bank.public-market.render-material.v1',material,generation:sha(material),build});expect(deps.prepareInput).toHaveBeenCalledOnce();
});

it.each([undefined,'application/octet-stream'])('refuses material above the same raw bound for Accept %s',async accept=>{
 const deps=dependencies('x'.repeat(MAX+1)),response=await handlePreparedPublicMarket(request(accept),deps);
 expect(response.status).toBe(413);expect(await response.text()).toBe('');expect(deps.prepareInput).toHaveBeenCalledOnce();
});

it('retains the existing capacity refusal for an oversized legacy JSON envelope',async()=>{
 const material=JSON.stringify({text:'\n'.repeat(12*1024*1024)}),deps=dependencies(material),response=await handlePreparedPublicMarket(request(),deps);
 expect(response.status).toBe(413);expect(await response.text()).toBe('');expect(deps.prepareInput).toHaveBeenCalledOnce();
});
