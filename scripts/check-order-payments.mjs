import assert from 'node:assert/strict';
import {mkdtemp,mkdir,symlink,writeFile,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {buildPayments} from '../integrations/payments/build.mjs';

const artifact=await buildPayments(),directory=await mkdtemp(resolve(tmpdir(),'bankeiz-packed-orders-'));
try{
 await writeFile(resolve(directory,'package.json'),JSON.stringify({type:'module',private:true}));
 execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund','--legacy-peer-deps','--package-lock=false','--cache',resolve(directory,'npm-cache'),artifact.path],{cwd:directory,stdio:'pipe'});
 // Reuse the public locked SDK, as the clean-source build qualification does.
 // Bankeiz implementation imports must resolve entirely from the packed tarball.
 await mkdir(resolve(directory,'node_modules/@receiz'),{recursive:true});await symlink(resolve('node_modules/@receiz/sdk'),resolve(directory,'node_modules/@receiz/sdk'),'dir');
 await writeFile(resolve(directory,'check.mjs'),`import assert from 'node:assert/strict';
import {createBankeizPayments} from '@bankeiz/payments';
import {createSqliteOrderStore} from '@bankeiz/payments/sqlite';
const merchant={username:'merchant',userId:'10000000-0000-4000-8000-000000000002'};
const store=createSqliteOrderStore('./orders.sqlite');
const api=createBankeizPayments({merchant,store,receiz:{request:async()=>{throw Error('network unavailable');}}});
const request=await api.checkout({orderId:'packed-order',amountUsdCents:'1230'});
assert.equal(new URL(request.checkoutUrl).searchParams.get('amount'),'12.30');
assert.equal((await api.check('packed-order')).status,'pending');
assert.equal((await api.fulfill(async()=>{throw Error('unpaid order delivered');})).examined,0);
store.close();
const reopened=createSqliteOrderStore('./orders.sqlite');
const again=createBankeizPayments({merchant,store:reopened,receiz:{request:async()=>{throw Error('network unavailable');}}});
assert.equal((await again.checkout({orderId:'packed-order',amountUsdCents:'1230'})).checkoutUrl,request.checkoutUrl);
reopened.close();console.log('Independent packed install, saved checkout, unpaid refusal and cold reopen passed.');
`);
 execFileSync(process.execPath,['check.mjs'],{cwd:directory,stdio:'inherit'});
 await writeFile(resolve(directory,'types.ts'),`import {createBankeizPayments,type OrderStore} from '@bankeiz/payments';\nimport {createSqliteOrderStore} from '@bankeiz/payments/sqlite';\nconst store:OrderStore=createSqliteOrderStore(':memory:');\nconst payments=createBankeizPayments({merchant:{username:'merchant',userId:'10000000-0000-4000-8000-000000000002'},store,receiz:{request:async<T>()=>({}) as T}});\nawait payments.checkout({orderId:'typed',amountUsdCents:'1230'});\n`);
 execFileSync(process.execPath,[resolve('node_modules/typescript/bin/tsc'),'--noEmit','--strict','--skipLibCheck','--target','es2022','--module','nodenext','types.ts'],{cwd:directory,stdio:'inherit'});
 const manifest=JSON.parse(await readFile('public/integrations/index.json','utf8'));assert.equal(manifest.sha256,artifact.sha256);
 console.log('Packed public TypeScript API passed independently.');
}finally{await rm(directory,{recursive:true,force:true});}
