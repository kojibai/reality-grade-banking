import {expect,it} from 'vitest';
// @ts-expect-error Release tooling is plain ESM.
import {readReceizRelease,validateReceizRelease} from '../scripts/receiz-release.mjs';
function candidate(version='130.0.0'){
 const names=['@receiz/sdk','@receiz/mcp-server','@receiz/ai-skills'],dependencies=Object.fromEntries(names.map(name=>[name,version]));
 return {application:{dependencies},lock:{packages:{'':{dependencies:{...dependencies}},...Object.fromEntries(names.map(name=>[`node_modules/${name}`,{version}]))}},installed:Object.fromEntries(names.map(name=>[name,{name,version}])),native:{receizVersion:version},nativeSdk:{name:'@receiz/sdk',version}};
}
it('keeps current installed packages, lockfile and retained native source in one release',async()=>{
 expect(await readReceizRelease()).toEqual({version:'129.0.0',generation:'v129',basePath:'/schemas/sdk/v129'});
});
it('derives v130 paths only from a fully coordinated v130 candidate',()=>{
 expect(validateReceizRelease(candidate())).toEqual({version:'130.0.0',generation:'v130',basePath:'/schemas/sdk/v130'});
});
it('rejects a mixed MCP, Skills, install, lockfile or native source before distribution',()=>{
 for(const change of [
  (c:ReturnType<typeof candidate>)=>{c.application.dependencies['@receiz/mcp-server']='129.0.0';},
  (c:ReturnType<typeof candidate>)=>{c.installed['@receiz/ai-skills'].version='129.0.0';},
  (c:ReturnType<typeof candidate>)=>{(c.lock.packages as unknown as Record<string,{version:string}>)['node_modules/@receiz/sdk'].version='129.0.0';},
  (c:ReturnType<typeof candidate>)=>{c.lock.packages[''].dependencies['@receiz/sdk']='129.0.0';},
  (c:ReturnType<typeof candidate>)=>{c.native.receizVersion='129.0.0';},
  (c:ReturnType<typeof candidate>)=>{c.nativeSdk.version='129.0.0';},
 ]){const input=candidate();change(input);expect(()=>validateReceizRelease(input)).toThrow(/RECEIZ_RELEASE_/);}
 const ranged=candidate('^130.0.0');expect(()=>validateReceizRelease(ranged)).toThrow('EXACT_VERSION_REQUIRED');
});
