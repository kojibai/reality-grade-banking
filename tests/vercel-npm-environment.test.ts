import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {expect,it} from 'vitest';

const runner=resolve('scripts/vercel-npm.mjs');
function fixture(build="node -e 'console.log(JSON.stringify({cache:process.env.npm_config_cache,pnpm:process.env.pnpm_config_cache_dir,kept:process.env.BANK_TEST_KEPT,invalid:Object.keys(process.env).filter(k=>k.toLowerCase().replaceAll(\"-\",\"_\")===\"npm_config_cache_dir\")}))'"){
 const directory=mkdtempSync(join(tmpdir(),'bank-build-env-'));
 writeFileSync(join(directory,'package.json'),JSON.stringify({private:true,scripts:{build}}));
 const env:NodeJS.ProcessEnv={...process.env,npm_config_cache_dir:'/unused/pnpm-cache',NPM_CONFIG_CACHE_DIR:'/unused/duplicate','npm_config_cache-dir':'/unused/hyphen','NPM_CONFIG_CACHE-DIR':'/unused/hyphen-uppercase',npm_config_cache:join(directory,'npm-cache'),pnpm_config_cache_dir:'/keep/pnpm-cache',BANK_TEST_KEPT:'kept',npm_config_offline:'true',npm_config_audit:'false',npm_config_update_notifier:'false'};
 return{directory,env,run:(task:string)=>spawnSync(process.execPath,[runner,task],{cwd:directory,env,encoding:'utf8',timeout:20_000}),close:()=>rmSync(directory,{recursive:true,force:true})};
}
it('starts both Vercel npm commands without obsolete npm cache config, preserving valid configuration',()=>{
 const f=fixture();try{
  const installed=f.run('install');expect(installed.status,installed.stderr).toBe(0);expect(installed.stderr).not.toContain('Unknown env config "cache-dir"');
  const built=f.run('build');expect(built.status,built.stderr).toBe(0);expect(built.stderr).not.toContain('Unknown env config "cache-dir"');
  const line=built.stdout.split('\n').find(row=>row.startsWith('{'))!;
  expect(JSON.parse(line)).toEqual({cache:f.env.npm_config_cache,pnpm:f.env.pnpm_config_cache_dir,kept:'kept',invalid:[]});
 }finally{f.close();}
});
it('preserves a failing build exit status instead of hiding failures',()=>{
 const f=fixture("node -e 'process.exit(17)'");try{expect(f.run('build').status).toBe(17);}finally{f.close();}
});
it('rejects unsupported runner tasks',()=>{
 const f=fixture();try{const r=f.run('publish');expect(r.status).toBe(1);expect(r.stderr).toContain('Unsupported Vercel npm task');}finally{f.close();}
});
it('uses the same npm boundary for dependency installation and production builds',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 expect(config.installCommand).toBe('node scripts/vercel-npm.mjs install');expect(config.buildCommand).toBe('node scripts/vercel-npm.mjs build');
});
it('approves only the reviewed locked esbuild lifecycle version',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8')),lock=JSON.parse(readFileSync('package-lock.json','utf8'));
 expect(pkg.allowScripts).toEqual({'esbuild@0.28.2':true});expect(lock.packages['node_modules/esbuild'].version).toBe('0.28.2');
});
it('retries a transient production capture failure without changing held files before running the real build',()=>{
 const f=fixture();try{
  mkdirSync(join(f.directory,'scripts'));mkdirSync(join(f.directory,'public'));
  writeFileSync(join(f.directory,'scripts/seed-public-market.mjs'),"import {existsSync,writeFileSync} from 'node:fs';const done=existsSync('attempt');writeFileSync('attempt','once');process.exit(done?0:75)");
  const seed='exact held public bytes';writeFileSync(join(f.directory,'public/receiz-public-market.json'),seed);f.env.VERCEL_ENV='production';
  const result=f.run('build');expect(result.status,result.stderr).toBe(0);expect(result.stderr).toContain('retrying the same public selection');expect(readFileSync(join(f.directory,'public/receiz-public-market.json'),'utf8')).toBe(seed);
 }finally{f.close();}
});
it('keeps persistent Source unavailability and non-transient capture failures visible',()=>{
 const f=fixture();try{
  mkdirSync(join(f.directory,'scripts'));f.env.VERCEL_ENV='production';const script=join(f.directory,'scripts/seed-public-market.mjs');
  writeFileSync(script,'process.exit(75)');expect(f.run('build').status).toBe(75);
  writeFileSync(script,'process.exit(17)');expect(f.run('build').status).toBe(17);
 }finally{f.close();}
});
