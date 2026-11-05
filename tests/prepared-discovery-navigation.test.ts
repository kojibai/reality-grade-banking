// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
const script=readFileSync('public/learn/discover.js','utf8').replace('export function init','function init');
const html=(path:string,generation:string)=>`<!doctype html><html><head><title>Current ${path}</title><script type="module" src="/assets/${path}-example.js"></script></head><body><div data-public-runtime="${path}"><main>Current ${path}</main><script id="public-market-seed" type="application/json">{"schema":"bank.public-market.document.v1","generation":"${generation}","path":"${path}","catalog":{"items":[]}}</script></div></body></html>`;
const headers=(revision:string)=>({'content-type':'text/html','x-receiz-public-html-state':'current','x-receiz-public-material-revision':revision,'x-receiz-public-render-build':'c'.repeat(64),'x-receiz-public-html-sha256':revision});
it('reuses a saved generation after a current HEAD, refreshes changed material once, and refuses withdrawn state',async()=>{
 const pages:Record<string,any>={},navigate=vi.fn(),assign=vi.fn(),location={href:'https://bankeiz.com/#account',assign},calls:Array<{path:string;method:string}>=[];let revision='a'.repeat(64),available=true;
 const fetcher=vi.fn(async(path:string,init?:RequestInit)=>{calls.push({path,method:init?.method??'GET'});return available?new Response(init?.method==='HEAD'?null:html('discover',revision),{headers:headers(revision)}):new Response(null,{status:503});});
 const install=new Function('document','location','fetch','URL','DOMParser','dispatchEvent','CustomEvent',script+';return init;')(document,location,fetcher,URL,DOMParser,dispatchEvent,CustomEvent),open=install(pages,navigate),target=new URL('https://bankeiz.com/discover/');
 pages['/discover/']={runtime:'discover',preparedRevision:revision,preparedBuild:'c'.repeat(64),content:'The initial current document'};
 await open(target);expect(calls).toEqual([{path:'/discover/',method:'HEAD'}]);delete pages['/discover/'];calls.length=0;navigate.mockClear();
 await open(target);const held=pages['/discover/'];expect(calls).toEqual([{path:'/discover/',method:'GET'}]);expect(navigate).toHaveBeenCalledWith('/discover/');
 await open(target);expect(pages['/discover/']).toBe(held);expect(calls.at(-1)).toEqual({path:'/discover/',method:'HEAD'});expect(calls.filter(call=>call.method==='GET')).toHaveLength(1);
 revision='b'.repeat(64);await open(target);expect(pages['/discover/']).not.toBe(held);expect(pages['/discover/'].preparedRevision).toBe(revision);expect(calls.slice(-2)).toEqual([{path:'/discover/',method:'HEAD'},{path:'/discover/',method:'GET'}]);
 available=false;await open(target);expect(navigate).toHaveBeenCalledTimes(3);expect(assign).toHaveBeenCalledWith(target.href);expect(calls.filter(call=>call.method==='GET')).toHaveLength(2);
});
