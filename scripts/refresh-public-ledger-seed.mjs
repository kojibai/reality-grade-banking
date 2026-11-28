import {readFile,rename,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const held=fileURLToPath(new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url));
const candidate=process.env.BANKEIZ_LEDGER_SEED_CANDIDATE;
const mode=process.argv[2];

if(mode==='--adopt'){
  if(candidate){
    // The background reader writes its checked candidate atomically. A slow
    // capture is skipped for this deployment.
    try{
      const bytes=await readFile(candidate);
      await writeFile(held+'.new',bytes);
      await rename(held+'.new',held);
      console.log('Bundled the ready public Ledger snapshot.');
    }catch(error){
      if(error.code!=='ENOENT')console.warn('Kept the held public Ledger snapshot.',error.code??error.message);
    }
  }
}else{
  if(mode!==undefined)throw Error('Unknown public Ledger refresh option.');
  let server;
  try{
    const [previous,{createServer}]=await Promise.all([readFile(held),import('vite')]);
    server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,include:[]},
      server:{middlewareMode:true,watch:null,ws:false},appType:'custom'});
    const {refreshPublicLedgerSeed}=await server.ssrLoadModule('/scripts/public-ledger-seed-refresh.ts');
    const response=await fetch('https://bankeiz.com/api/explore?path=observatory',{
      headers:{accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(25_000),
    });
    const next=await refreshPublicLedgerSeed(response,previous);
    if(next){
      const output=candidate??held;
      await writeFile(output+'.new',next.bytes);
      await rename(output+'.new',output);
      console.log(JSON.stringify({capturedAt:next.capturedAt,added:next.added,withdrawnGraphRows:next.withdrawnGraphRows,bytes:next.bytes.length}));
    }else console.log('The held public Ledger snapshot has no newer records to include.');
  }catch(error){
    console.warn('Kept the held public Ledger snapshot.',error instanceof Error?error.message:String(error));
  }finally{await server?.close();}
}
