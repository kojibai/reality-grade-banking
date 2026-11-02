import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

it('extends the existing complete transport without opening historical child or media bodies',async()=>{
 const {runtime:r}=await conformanceOfflineFixture({composer:true}),api=r.showcaseTransport;
 const digest=(v:string)=>createHash('sha256').update(v).digest('hex'),hash=(v:string)=>v.repeat(64),child=(n:string)=>({reference:{stableChildArtifactId:n,immutableVersion:'1',childArtifactDigest:hash(n),admissionEvidenceRoot:hash(n),contentDigest:hash(n)},exactSealedArtifactBytes:new TextEncoder().encode('old sealed '+n)});
 const source={artifactDigest:digest('accepted head'),exactSealedArtifactBytes:new TextEncoder().encode('accepted head'),witnessNodes:[],children:[child('b'),child('c')],ancestry:[{artifactDigest:digest('old ancestor'),exactSealedArtifactBytes:new TextEncoder().encode('old ancestor')}]};
 const blocks=new Map<string,Uint8Array>(),write=async(ref:{sha256:string},bytes:Uint8Array)=>{blocks.set(ref.sha256,bytes);};
 const prior=await api.writeProfileShowcaseCompleteSourceTransport(source,write);
 const forbidden=new Set<string>();
 for(const bytes of [...source.children.map(c=>c.exactSealedArtifactBytes),source.ancestry[0].exactSealedArtifactBytes])for(const [digest,value]of blocks)if(Buffer.from(value).equals(Buffer.from(bytes)))forbidden.add(digest);
 const reads:string[]=[];
 expect(api.readProfileShowcaseAppendTransport).toBeTypeOf('function');
 const context=await api.readProfileShowcaseAppendTransport(prior,async(ref:{sha256:string})=>{reads.push(ref.sha256);if(forbidden.has(ref.sha256))throw Error('HISTORICAL_BODY_READ');return blocks.get(ref.sha256)!;});
 expect(context.children).toHaveLength(2);expect(reads.some(d=>forbidden.has(d))).toBe(false);
 const nextChild=child('e'),nextBytes=new TextEncoder().encode('new exact head');
 const written:string[]=[];
 const next=await api.writeProfileShowcaseAppendTransport(context,{artifactDigest:hash('f'),exactSealedArtifactBytes:nextBytes,witnessNodes:[],children:[nextChild]},async(ref:{sha256:string},bytes:Uint8Array)=>{written.push(ref.sha256);await write(ref,bytes);});
 const reconstructed=await api.reconstructProfileShowcaseCompleteSourceTransport(next,async(ref:{sha256:string})=>blocks.get(ref.sha256)!);
 expect(reconstructed.children).toEqual([...source.children,nextChild]);
 expect(reconstructed.ancestry).toEqual(expect.arrayContaining([...source.ancestry,{artifactDigest:source.artifactDigest,exactSealedArtifactBytes:source.exactSealedArtifactBytes}]));
 expect(reconstructed.exactSealedArtifactBytes).toEqual(nextBytes);
 expect(written.some(d=>forbidden.has(d))).toBe(false);
},15000);
