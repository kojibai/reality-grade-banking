import {expect,it,vi} from 'vitest';
import type {ReceizOpenedArtifact,ReceizSealedArtifact} from '@receiz/sdk';
import {createReceivedProof} from '../src/receiz/received-proof';
const owner='buyer.receiz.id',originalOwner='seller.receiz.id',id='a'.repeat(64);
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function fixture(){
 let state:unknown=null,closed=false;const claims=vi.fn(),retained=vi.fn(),opened:ReceizOpenedArtifact[]=[];
 const open=vi.fn(async(file:File)=>{const bytes=new Uint8Array(await file.arrayBuffer()),claimed=bytes[0]===2,from=claimed?owner:originalOwner;
  const document={schema:'receiz.portable_asset.v1',assetType:bytes[0]===3?'wallet_note':'proof_object',payload:{mimeType:'text/plain',bytesBase64Url:'YQ',sha256:await digest(new Uint8Array([97]))},ownership:{ownerReceizId:from,custody:'bearer',proofRef:claimed?'claim-new':'claim-old'},provenance:{root:id,appends:claimed?[{type:'receiz.ownership.bearer-claim.v108',sourceArtifactSha256:await digest(new Uint8Array([1])),fromOwnerReceizId:originalOwner,toOwnerReceizId:owner,priorHeadReference:'claim-old'}]:[]},settlement:{state:'not-required'}};
  const result={sealedArtifact:{kind:'receiz.native-record-seal',artifact:file,artifactSha256:await digest(bytes),filename:file.name,mimeType:file.type||'application/octet-stream',continuity:{ownerReceizId:from,claimId:document.ownership.proofRef}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(document)),filename:'original.txt'},verification:{ok:true,integrity:{ok:true},assetContinuity:{state:'verified',carrier:'portable_asset',artifactId:id,ownerReceizId:from,headReference:document.ownership.proofRef}}}as unknown as ReceizOpenedArtifact;opened.push(result);return result;
 });
 claims.mockImplementation(async({artifact}:{artifact:ReceizSealedArtifact})=>{expect(opened.some(value=>value.sealedArtifact===artifact)).toBe(true);return(await open(new File([new Uint8Array([2])],'claimed.receizbundle'))).sealedArtifact;});
 const api=createReceivedProof({owner,assertOpen(){if(closed)throw Error('CLOSED');},open,claim:claims,retain:retained,store:{read:async()=>state,write:async(next,expected)=>{expect(state).toEqual(expected);state=structuredClone(next);}},lock:async run=>run()});
 return{api,claims,retained,open,get state(){return state;},close(){closed=true;}};
}
it('requires the exact locally verified review before the existing native claim and retains both original and successor',async()=>{
 const f=fixture(),review=await f.api.inspect(new File([new Uint8Array([1])],'delivered.receizbundle'));
 expect(review.kind).toBe('claim');expect(f.claims).not.toHaveBeenCalled();await expect(f.api.receive({...review},review.digest)).rejects.toThrow('REVIEW_REQUIRED');
 const result=await f.api.receive(review,review.digest);expect(result.status).toBe('held');expect(f.claims).toHaveBeenCalledOnce();expect(f.retained.mock.calls[0][0].map((s:{kind:string})=>s.kind)).toEqual(['received-original','owned-source']);expect((await f.api.status())?.status).toBe('held');
});
it('preserves the same original after a lost response and requires explicit approval to resume it',async()=>{
 const f=fixture(),review=await f.api.inspect(new File([new Uint8Array([1])],'delivered.receizbundle'));f.claims.mockRejectedValueOnce(Error('lost response'));
 expect((await f.api.receive(review,review.digest))?.status).toBe('unknown');expect(f.state).toMatchObject({current:{status:'unknown',source:{digest:review.digest}}});
 await expect(f.api.resume('wrong')).rejects.toThrow('EXACT_CONFIRMATION_REQUIRED');expect(f.claims).toHaveBeenCalledOnce();expect((await f.api.resume(review.digest))?.status).toBe('held');
 expect(f.claims.mock.calls.map(([call])=>call.artifact.artifactSha256)).toEqual([review.digest,review.digest]);
});
it('a local retention failure reuses the saved successor without another ownership request',async()=>{
 const f=fixture(),review=await f.api.inspect(new File([new Uint8Array([1])],'delivered.receizbundle'));f.retained.mockRejectedValueOnce(Error('disk unavailable'));
 await expect(f.api.receive(review,review.digest)).rejects.toThrow('disk unavailable');expect(f.state).toMatchObject({current:{status:'claimed'}});
 expect((await f.api.resume(review.digest))?.status).toBe('held');expect(f.claims).toHaveBeenCalledOnce();
});
it('keeps Notes on their dedicated path, refuses stale reviews and performs no claim on ordinary import',async()=>{
 const f=fixture();await expect(f.api.inspect(new File([new Uint8Array([3])],'note.receizbundle'))).rejects.toThrow('DEDICATED_NOTE_PATH_REQUIRED');
 const review=await f.api.inspect(new File([new Uint8Array([2])],'already-owned.receizbundle'));expect(review.kind).toBe('hold');expect((await f.api.receive(review,review.digest))?.status).toBe('held');expect(f.claims).not.toHaveBeenCalled();
 const closed=fixture(),pending=await closed.api.inspect(new File([new Uint8Array([1])],'source.receiz'));closed.close();await expect(closed.api.receive(pending,pending.digest)).rejects.toThrow('CLOSED');
});
it('exports the exact verified successor and keeps an owned import off the claim/checkpoint path',async()=>{
 const f=fixture(),review=await f.api.inspect(new File([new Uint8Array([2])],'own.receiz'));
 await f.api.receive(review,review.digest);expect(f.state).toBeNull();expect(new Uint8Array(await(await f.api.exportHeld()).arrayBuffer())).toEqual(new Uint8Array([2]));expect(f.claims).not.toHaveBeenCalled();
});
it('does not accept a detached successor or a changed asset as the result of the same claim',async()=>{
 const f=fixture(),review=await f.api.inspect(new File([new Uint8Array([1])],'original.receiz')),open=f.open.getMockImplementation()!;
 f.open.mockImplementation(async file=>{const value=await open(file);if((new Uint8Array(await file.arrayBuffer()))[0]===2)value.verification.assetContinuity!.artifactId='b'.repeat(64);return value;});
 await expect(f.api.receive(review,review.digest)).rejects.toThrow('SUCCESSOR_MISMATCH');expect(f.retained).not.toHaveBeenCalled();expect(f.state).toMatchObject({current:{status:'unknown'}});
});
it('the real v129 canonical reader rejects an unsealed file before any ownership effect',async()=>{
 const sdk=await import('@receiz/sdk'),claim=vi.fn();
 const api=createReceivedProof({owner,assertOpen(){},open:file=>sdk.createReceizClient().artifacts.verifyAndOpen(file),claim,retain:vi.fn(),store:{read:async()=>null,write:vi.fn()},lock:async run=>run()});
 await expect(api.inspect(new File(['{"owner":"buyer.receiz.id","verified":true}'],'forged.json'))).rejects.toThrow();expect(claim).not.toHaveBeenCalled();
});
