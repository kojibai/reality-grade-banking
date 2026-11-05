let pending=null,sequence=0;
/** Importing this module does no verification, worker, fetch or account work.
 * Only an explicit Verify intent starts the fixed synthetic inspection. */
export function runIndependentVerification(){
 if(pending)return pending;
 const work=new Promise((resolve,reject)=>{
  const id=String(++sequence),worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module',credentials:'omit'});
  const finish=(error,result)=>{clearTimeout(timer);worker.terminate();if(error)reject(error);else resolve(result);};
  const timer=setTimeout(()=>finish(Error('SYNTHETIC_DEMO_TIMEOUT')),45000);
  worker.addEventListener('error',()=>finish(Error('SYNTHETIC_DEMO_UNAVAILABLE')),{once:true});
  worker.addEventListener('message',event=>{
   const result=event.data;if(result?.id!==id)return;
   if(result.schema==='bankeiz.synthetic-note-demo.result.v1'&&result.scope==='synthetic-source-and-delivery-authority'&&Array.isArray(result.results))finish(null,result);
   else if(result.schema==='bankeiz.synthetic-note-demo.error.v1')finish(Error(result.error||'SYNTHETIC_DEMO_UNAVAILABLE'));
  });
  worker.postMessage({schema:'bankeiz.synthetic-note-demo.request.v1',id});
 });
 pending=work;void work.finally(()=>{if(pending===work)pending=null;}).catch(()=>{});return work;
}
