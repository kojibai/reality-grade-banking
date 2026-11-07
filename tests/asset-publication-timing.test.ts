import {afterEach,expect,it,vi} from 'vitest';
import {assetPublicationDeliveryTiming,createAssetPublication,subscribeAssetPublicationDeliveries,waitForAssetPublicationDelivery,type AssetPublicationAttempt,type AssetPublicationReceipt,type AssetPublicationState} from '../src/receiz/asset-publication';

afterEach(()=>vi.restoreAllMocks());

it('times the real source attempt once, preserves coalescing, and gives an actual retry a new start',async()=>{
 let now=100,state:AssetPublicationState|null=null,seals=0;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 const owner='measured-owner.receiz.id',digest='f'.repeat(64),intent={title:'Held exact Original'},file=new File(['exact sealed Original'],'original.receizbundle');
 const events:AssetPublicationAttempt[]=[],replies:((receipt:AssetPublicationReceipt)=>void)[]=[];
 const stop=subscribeAssetPublicationDeliveries(attempt=>{if(attempt.ownerReceizId===owner)events.push(attempt);});
 const api=createAssetPublication({ownerReceizId:owner,assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=next;},seal:async()=>{seals++;return file;},retain:async()=>digest,restore:async()=>file,readIntent:async()=>intent,publish:async()=>new Promise(resolve=>replies.push(resolve))});
 try{
  expect(assetPublicationDeliveryTiming(owner,digest)).toBeUndefined();
  await api.createLocal(intent);
  const initial=assetPublicationDeliveryTiming(owner,digest);
  expect(initial).toMatchObject({sourceDigest:digest,phase:'source',sizeBytes:21,startedAtMs:100});
  expect(initial?.attemptId).toBeTruthy();
  expect(events[0]).toMatchObject({active:true,timing:initial});
  expect(assetPublicationDeliveryTiming('another-owner.receiz.id',digest)).toBeUndefined();
  now=500;await api.resumeLocal();
  expect(assetPublicationDeliveryTiming(owner,digest)).toBe(initial);
  expect(replies).toHaveLength(1);expect(seals).toBe(1);
  let settled=waitForAssetPublicationDelivery(owner,digest)!;
  replies[0]({status:'pending',code:'PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING'});await settled;
  expect(assetPublicationDeliveryTiming(owner,digest)).toBeUndefined();
  expect(events.at(-1)).toMatchObject({active:false,timing:initial,publication:{status:'pending'}});
  // Reopening held state has no new start coordinate or publication side effect.
  now=1000;expect((await api.pending())?.digest).toBe(digest);
  expect(assetPublicationDeliveryTiming(owner,digest)).toBeUndefined();expect(replies).toHaveLength(1);
  await api.resumeLocal();
  const retried=assetPublicationDeliveryTiming(owner,digest);
  expect(retried).toMatchObject({sourceDigest:digest,phase:'source',sizeBytes:21,startedAtMs:1000});
  expect(retried?.attemptId).not.toBe(initial?.attemptId);expect(replies).toHaveLength(2);expect(seals).toBe(1);
  settled=waitForAssetPublicationDelivery(owner,digest)!;
  now=1500;replies[1]({status:'published',artifactDigest:'e'.repeat(64),operationCount:1,visibleChildCount:1});await settled;
  expect(events.at(-1)).toMatchObject({active:false,timing:retried,publication:{status:'published'}});
  expect(assetPublicationDeliveryTiming(owner,digest)).toBeUndefined();
  await api.resumeLocal();expect(replies).toHaveLength(2);expect(events).toHaveLength(4);
 }finally{stop();}
});
