import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const task=process.argv[2],args=task==='install'?['install']:task==='build'?['run','build']:null;
if(!args||process.argv.length!==3){console.error('Unsupported Vercel npm task');process.exitCode=1;}
else{
 const env={...process.env};
 // Some builders expose another package manager's cache-dir as npm config.
 // npm does not support that option. Keep its real cache and all other config;
 // never reinterpret a pnpm cache directory as an npm cache.
 for(const key of Object.keys(env))if(key.toLowerCase().replaceAll('-','_')==='npm_config_cache_dir')delete env[key];
 let directory,refresh;
 // Daily snapshot commits already carry the exact candidate. Ordinary
 // production builds can reuse a prepared projection while other checks run.
 if(task==='build'&&env.VERCEL_ENV==='production'&&!env.VERCEL_GIT_COMMIT_MESSAGE?.startsWith('Refresh the public Ledger snapshot')){
  try{
   directory=mkdtempSync(join(tmpdir(),'bankeiz-ledger-seed-'));
   env.BANKEIZ_LEDGER_SEED_CANDIDATE=join(directory,'seed.gz');
   refresh=spawn(process.execPath,['scripts/refresh-public-ledger-seed.mjs'],{env,stdio:'inherit'});
   refresh.once('error',()=>{});
   refresh.unref();
  }catch{/* The held snapshot supports the complete ordinary build. */}
 }
 const result=spawnSync('npm',args,{env,stdio:'inherit'});
 refresh?.kill();
 if(directory)rmSync(directory,{recursive:true,force:true});
 if(result.error){console.error(result.error.message);process.exitCode=1;}
 else if(result.signal)process.kill(process.pid,result.signal);
 else process.exitCode=result.status??1;
}
