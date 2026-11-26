import {spawnSync} from 'node:child_process';

const task=process.argv[2],args=task==='install'?['install']:task==='build'?['run','build']:null;
if(!args||process.argv.length!==3){console.error('Unsupported Vercel npm task');process.exitCode=1;}
else{
 const env={...process.env};
 // Some builders expose another package manager's cache-dir as npm config.
 // npm does not support that option. Keep its real cache and all other config;
 // never reinterpret a pnpm cache directory as an npm cache.
 for(const key of Object.keys(env))if(key.toLowerCase().replaceAll('-','_')==='npm_config_cache_dir')delete env[key];
 const result=spawnSync('npm',args,{env,stdio:'inherit'});
 if(result.error){console.error(result.error.message);process.exitCode=1;}
 else if(result.signal)process.kill(process.pid,result.signal);
 else process.exitCode=result.status??1;
}
