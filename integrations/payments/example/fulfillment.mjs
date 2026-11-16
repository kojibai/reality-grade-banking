/** Synthetic entitlement sink. Every provider shares the merchant's order key;
 * provider attempt keys are retained separately and cannot grant it twice. */
export async function deliverExampleOrder(store,job,provider='bankeiz'){
 return store.transaction(tx=>{
  const orderKey='demo-effect:'+encodeURIComponent(job.orderId),paymentKey=provider+':'+job.payment.transferId,existing=tx.get(orderKey);
  if(existing){const review=existing.paymentKey!==paymentKey;if(review)tx.insert('demo-review:'+encodeURIComponent(paymentKey),{orderId:job.orderId,provider,paymentReference:job.payment.transferId});return{delivered:false,review};}
  tx.insert(orderKey,{orderId:job.orderId,paymentKey});return{delivered:true,review:false};
 });
}
