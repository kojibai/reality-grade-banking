import {inspectHeldProof} from '../value-explainer/proof';
/** Exact public source, not a synthetic issuance or a PBI qualification fixture. */
export const ORIGINAL_EXAMPLE=Object.freeze({url:'/proofs/sealed-essay.png',sha256:'7dea328ef9accb1322853b868ec0fbd9a46f644cffbd377763eb08af7fe6784e',title:'THEY HAVE NO MACHINE. THEY HAVE NO ANSWER.'});
export async function inspectOriginalExample(file:File,evaluationKaiUPulse:string){
 const result=await inspectHeldProof({file,evaluationKaiUPulse,additionalCoordinates:'',portableHistory:false,deterministicUsd:true});
 if(result.projection.status==='available'&&result.projection.proofDigest!==ORIGINAL_EXAMPLE.sha256)throw Error('The sample is not the exact published source.');
 return result;
}
/** Mutate carried essay text and repair its PNG CRC. Rejection must come from
 * the enclosing Receiz proof binding, not from a deliberately broken PNG. */
export async function challengeOriginalExample(file:File,evaluationKaiUPulse:string){
 const changed=new Uint8Array(await file.arrayBuffer()),view=new DataView(changed.buffer);let at=8,mutated=false;
 while(at+12<=changed.length){
  const length=view.getUint32(at);if(at+length+12>changed.length)throw Error('Sample PNG is incomplete.');
  const type=new TextDecoder().decode(changed.subarray(at+4,at+8)),text=new TextDecoder().decode(changed.subarray(at+8,at+8+length));
  if(type==='iTXt'&&text.startsWith('receiz_anchor_bundle\0')){
   const where=text.indexOf(ORIGINAL_EXAMPLE.title);if(where<0)throw Error('Sample essay is unavailable.');
   changed[at+8+where]=88;let crc=0xffffffff;
   for(const byte of changed.subarray(at+4,at+8+length)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
   view.setUint32(at+8+length,(crc^0xffffffff)>>>0);mutated=true;break;
  }
  at+=length+12;
 }
 if(!mutated)throw Error('Sample essay is unavailable.');
 try{await inspectHeldProof({file:new File([changed],'changed-essay.png',{type:'image/png'}),evaluationKaiUPulse,additionalCoordinates:'',portableHistory:false,deterministicUsd:true});}
 catch(cause){if(cause instanceof Error&&cause.message.startsWith('Proof rejected:'))return cause.message;throw cause;}
 throw Error('The altered source was accepted. This demonstration failed.');
}
