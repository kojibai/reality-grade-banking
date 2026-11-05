/** One current, identity-scoped display snapshot. Invalidation preserves the
 * settled frame until the actual successor is ready. This cache never admits
 * ownership or authorizes execution. */
export function createHeldSourceView<T>(input:{assertOpen():void;read():Promise<readonly T[]>}){
 let current:readonly T[]|null=null,pending:Promise<readonly T[]>|null=null,revision=0,settled=-1;
 function read():Promise<readonly T[]>{
  try{input.assertOpen();}catch(error){return Promise.reject(error);}
  if(pending)return pending;if(current&&settled===revision)return Promise.resolve(current);
  const attempt=(async()=>{for(;;){input.assertOpen();const ticket=revision,next=await input.read();input.assertOpen();if(ticket!==revision)continue;current=next;settled=ticket;return next;}})();
  pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=null;}).catch(()=>{});return attempt;
 }
 return{known:()=>current,invalidate(){revision++;},read};
}
