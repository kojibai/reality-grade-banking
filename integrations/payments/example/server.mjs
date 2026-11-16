import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReceizClient} from '@receiz/sdk';
import {createBankeizPayments} from '@bankeiz/payments';
import {createSqliteOrderStore} from '@bankeiz/payments/sqlite';
import {syntheticPayment} from './synthetic.mjs';
import {deliverExampleOrder} from './fulfillment.mjs';

export async function startExample({databasePath,port=0}={}){
 const store=createSqliteOrderStore(databasePath??resolve('bankeiz-example.sqlite')),merchant={username:'merchant',userId:'10000000-0000-4000-8000-000000000002'};
 const receiz=createReceizClient({baseUrl:'https://synthetic.invalid',fetchImpl:async input=>{
  const url=new URL(String(input)),digest=url.searchParams.get('saleDigest');
  if(digest){const records=await store.transaction(tx=>tx.scan('demo-original:',{limit:100}));return Response.json({ok:true,accountUserId:merchant.userId,saleDigest:digest,candidates:records.filter(r=>r.value.source.transfer.metadata.note.startsWith(`bank.sale.v1:${digest}:`)).map(r=>({transferId:r.value.transfer.id,clientNonce:r.value.transfer.clientNonce})),nextCursor:null});}
  const original=await store.transaction(tx=>tx.get('demo-original:'+url.searchParams.get('transferId')));return Response.json(original??{ok:true,found:false});
 }});
 const payments=createBankeizPayments({merchant,receiz,store});
 const server=createServer(async(req,res)=>{const json=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
  try{
   // Demo mutation is loopback-only and same-origin. There are no production
   // credentials, proxy routes, financial writers or live-network calls here.
   if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json({error:'Example origin mismatch'},403);
   if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(await readFile(new URL('./store.html',import.meta.url)));return;}
   if(req.method==='POST'&&req.url==='/checkout')return json(await payments.checkout({orderId:'example-order',amountUsdCents:'1000'}));
   if(req.method==='GET'&&req.url==='/status')return json(await payments.get('example-order'));
   if(req.method==='POST'&&req.url==='/check')return json(await payments.check('example-order'));
   if(req.method==='POST'&&req.url==='/simulate-payment'){const order=await payments.get('example-order'),original=await syntheticPayment(order.checkoutUrl);await store.transaction(tx=>tx.put('demo-original:'+original.transfer.id,original));return json({synthetic:true});}
   if(req.method==='POST'&&req.url==='/fulfill')return json(await payments.fulfill(async job=>{await deliverExampleOrder(store,job);}));
   if(req.method==='GET'&&req.url==='/effects')return json({count:await store.transaction(tx=>tx.scan('demo-effect:',{limit:100}).length)});
   return json({error:'Example route not found'},404);
  }catch(error){json({error:error instanceof Error?error.message:'Example error'},409);}
 });
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.off('error',reject);done();});});
 return{server,origin:`http://127.0.0.1:${server.address().port}`,payments,store,async close(){await new Promise((done,reject)=>server.close(error=>error?reject(error):done()));store.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await startExample({databasePath:process.env.BANKEIZ_EXAMPLE_DATABASE,port:Number(process.env.PORT??4319)});console.log(`Synthetic Bankeiz store: ${app.origin} (no real money)`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().then(()=>process.exit(0));});
}
