// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {assetReturnDestination} from '../src/core/asset-return';
it('uses the actual Market entry and restores its scroll after an asset return without a document request',async()=>{
 history.replaceState({},'','/#market/public/profile%3Aartist%3Asong');let position=1780;
 vi.spyOn(window,'scrollY','get').mockImplementation(()=>position);
 vi.spyOn(window,'scrollTo').mockImplementation(((arg:number|ScrollToOptions,y?:number)=>{position=typeof arg==='number'?y??0:arg.top??0;}) as typeof scrollTo);
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));const request=vi.fn();vi.stubGlobal('fetch',request);
 document.head.innerHTML='<title>Market</title>';document.body.innerHTML='<div id="root"><main>Market<a href="/asset/profile%3Aartist%3Asong/">Asset page</a></main></div><div data-public-runtime="explore" hidden><main>Asset</main></div>';
 const page={runtime:'explore',entry:'/already-loaded.js',content:'',head:'<title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/">'};const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/explore/':page},bank:{entry:'/unused.js',head:'<title>Market</title>',styles:[]}});document.body.append(data);
 try{new Function('// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1])();document.querySelector<HTMLAnchorElement>('#root a')!.click();
  expect(position).toBe(0);expect(assetReturnDestination(history.state,'/explore/')).toEqual({path:'/#market',label:'Market'});
  const link=document.createElement('a');link.href='/#market';document.querySelector('[data-public-runtime] main')!.append(link);position=450;link.click();await Promise.resolve();await Promise.resolve();
  expect(location.pathname+location.hash).toBe('/#market');expect(position).toBe(1780);expect(document.getElementById('root')!.hidden).toBe(false);expect(request).not.toHaveBeenCalled();
 }finally{vi.restoreAllMocks();vi.unstubAllGlobals();}
});
it('keeps Explore and profile return labels and refuses external or malformed return state',()=>{
 expect(assetReturnDestination({assetReturnPath:'/explore/music/'},'/explore/')).toEqual({path:'/explore/music/',label:'Explore'});
 expect(assetReturnDestination({assetReturnPath:'/artist/'},'/explore/')).toEqual({path:'/artist/',label:'@artist'});
 expect(assetReturnDestination({assetReturnPath:'https://evil.test/'},'/explore/')).toEqual({path:'/explore/',label:'Explore'});
});
