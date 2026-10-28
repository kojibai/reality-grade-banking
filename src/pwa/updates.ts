type WorkerContainer={readonly controller?:unknown;register(path:string,options:{updateViaCache:'none'}):Promise<{update():Promise<unknown>}>};
type UpdateEnvironment={page:EventTarget;document:EventTarget&{readonly visibilityState:string};online():boolean;now():number;warn(message:string,cause:unknown):void};

/** Public build discovery only. Activation keeps the browser's normal waiting
 * lifecycle; an open account, call or transaction is never reloaded here. */
export function registerBankWorker(container:WorkerContainer,environment:UpdateEnvironment={page:window,document,online:()=>navigator.onLine,now:Date.now,warn:console.warn}){
 let closed=false,registering=false,registration:Awaited<ReturnType<WorkerContainer['register']>>|undefined,pending:Promise<unknown>|undefined,lastCheck=environment.now();
 const register=async()=>{registering=true;try{const value=await container.register('/sw.js',{updateViaCache:'none'});if(!closed)registration=value;}catch(cause){if(!closed&&!container.controller)environment.warn('Offline shell registration unavailable:',cause);}finally{registering=false;}};
 const check=()=>{
  if(closed||registering||pending||environment.document.visibilityState!=='visible'||!environment.online()||environment.now()-lastCheck<60_000)return;
  lastCheck=environment.now();
  if(!registration){void register();return;}
  try{const attempt=registration.update();pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=undefined;}).catch(()=>{/* An unavailable update never interrupts the held app. */});}catch{/* A detached registration remains optional. */}
 };
 void register();
 environment.page.addEventListener('pageshow',check);environment.page.addEventListener('online',check);environment.document.addEventListener('visibilitychange',check);
 return()=>{closed=true;environment.page.removeEventListener('pageshow',check);environment.page.removeEventListener('online',check);environment.document.removeEventListener('visibilitychange',check);};
}
