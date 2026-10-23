import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'bank-execution-timing-')),output=join(dir,'timing.json');
try{
 execFileSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--maxWorkers=1','tests/execution-critical-path.test.ts','-t','records isolated cold/warm'],{cwd:new URL('../',import.meta.url),env:{...process.env,EXECUTION_TIMING_OUTPUT:output},stdio:['ignore','pipe','pipe']});
 const raw=JSON.parse(readFileSync(output,'utf8')),percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
 console.log(JSON.stringify({syntheticTransport:true,requestDelayMs:15,displayDelayMs:30,cold:raw.cold,warm:['send','buy','sell'].map(kind=>{const rows=raw.samples.filter(r=>r.kind===kind);return{kind,samples:rows.length,p50Ms:percentile(rows.map(r=>r.completionMs),.5),p95Ms:percentile(rows.map(r=>r.completionMs),.95),outcomeGets:rows[0].outcomeGets,financialDispatches:rows[0].financialDispatches,stages:rows[0].stages};})},null,2));
}finally{rmSync(dir,{recursive:true,force:true});}
