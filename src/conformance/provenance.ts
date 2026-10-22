import {sha256} from './assessment.ts';
export interface HarnessIdentity {scope:'conformance-harness-and-published-contracts';method:'sha256-path-content-v1';sourceTreeSha256:string;inputs:Array<{path:string;sha256:string}>;}
export async function hashSourceInputs(sources:Record<string,string>):Promise<HarnessIdentity> {
 const inputs=await Promise.all(Object.entries(sources).sort(([a],[b])=>a<b?-1:a>b?1:0).map(async([path,source])=>({path:path.replace(/^\//,''),sha256:await sha256(new TextEncoder().encode(source))})));
 return {scope:'conformance-harness-and-published-contracts',method:'sha256-path-content-v1',sourceTreeSha256:await sha256(new TextEncoder().encode(JSON.stringify(inputs))),inputs};
}
export function browserSourceIdentity(){return hashSourceInputs(import.meta.glob<string>(['/src/conformance/*.{ts,tsx,css,json}','/src/receiz/note-funding.ts','/src/receiz/native-asset-backing.ts','/institution/receiver-profile.json','/institution/conformance-protocol.json','/institution/receiving-standard.md','/docs/note-continuity-standard.md','/docs/connected-notes-v129.md','/docs/conformance/*.md'],{query:'?raw',import:'default',eager:true}));}
