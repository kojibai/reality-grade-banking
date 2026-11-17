import {expect,it} from 'vitest';
import {encodeNavigationEnvelope} from '../scripts/navigation-envelope.mjs';
import {decodeNavigationEnvelope,sharedExampleMarkup} from '../src/presentation/navigation-envelope.mjs';
const literal='Original <source> "terms" & exact Unicode café 🌊; unknown fields stay held.';
function fixture(){return {pages:Object.fromEntries(Array.from({length:60},(_,i)=>['/held-'+i+'/',{title:'Held '+i,head:[0,1,2,3,0,1,2,3,0,1,2,3,'<title>'+i+'</title>'],content:[3,2,1,0,3,2,1,0,3,2,1,0]}])),bank:{head:[0,1],content:[2,3],styles:['/bank.css'],css:{'/bank.css':[0,1,2,3]}},styles:[literal,'<style>.held{color:navy}</style>','<main>Held account</main>','<script type="application/json">{"text":"exact carried source"}</script>'],unknown:{retained:['never replace',literal]}};}
it('roundtrips every exact held field and shared example without mutating its input',()=>{const navigation=fixture(),before=structuredClone(navigation),examples=[{html:[0,1,2,3,0,1,2,3],copy:literal},literal],shared=sharedExampleMarkup(examples),encoded=encodeNavigationEnvelope(navigation,shared),opened=decodeNavigationEnvelope(encoded);expect(opened.navigation).toEqual(before);expect(opened.shared).toBe(shared);expect(navigation).toEqual(before);expect(JSON.stringify(encoded)).not.toContain('<script');});
it('opens legacy raw navigation without fetching or inventing a shared template',()=>{const navigation=fixture();expect(decodeNavigationEnvelope(navigation)).toEqual({navigation,shared:''});});
it('refuses corrupted, truncated and length-substituted compressed input',()=>{const encoded=encodeNavigationEnvelope(fixture(),'');expect(()=>decodeNavigationEnvelope({...encoded,decodedBytes:1})).toThrow();expect(()=>decodeNavigationEnvelope({...encoded,data:encoded.data.slice(0,-10)})).toThrow();expect(()=>decodeNavigationEnvelope({...encoded,data:'!bad'})).toThrow();});

it('rejects forward, cyclic, out-of-range and expanding references within the decode budget',async()=>{
 const {gzipSync,gunzipSync}=await import('node:zlib');const value=fixture();value.bank.head=Array(200).fill('exact repeated presentation <fragment>');const encoded=encodeNavigationEnvelope(value,'');expect(decodeNavigationEnvelope(encoded).navigation).toEqual(value);
 const packet=JSON.parse(gunzipSync(Buffer.from(encoded.data,'base64url')).toString());
 expect(packet.dictionary.length).toBeGreaterThan(0);
 for(const mutate of [(p:any)=>{p.dictionary[0]=[-1,0];},(p:any)=>{p.dictionary[0]=[-99999,0];},(p:any)=>{p.navigation.bank.head=[-99999];},(p:any)=>{p.flatTokens=1;}]){
  const invalid=structuredClone(packet);mutate(invalid);const bytes=Buffer.from(JSON.stringify(invalid));expect(()=>decodeNavigationEnvelope({...encoded,decodedBytes:bytes.length,data:gzipSync(bytes).toString('base64url')})).toThrow();
 }
});
