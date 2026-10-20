import {afterEach,expect,it,vi} from 'vitest';
import {readNoteRegistrationEvidence} from '../src/receiz/note-registration-evidence';
import {unattestedResponse} from './fixtures/note-registration';

// Real v129 rollback verification and WebCrypto signatures. Only the physical
// WebAuthn API is replaced; these fixtures do not qualify actual hardware.
async function runProbe(){
 const module=await import('../src/conformance/device-evidence').catch(error=>{if(/Failed to load|Cannot find|failed to import/.test(String(error)))return null;throw error;});
 expect(typeof module?.inspectDeviceCustodyEvidence).toBe('function');
 return module!.inspectDeviceCustodyEvidence;
}
const b64=(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url');
async function device({flags=0x1d,counterStep=0,alterSignature=false,replyId='fresh-probe-only'}={}){
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const spki=await crypto.subtle.exportKey('spki',keys.publicKey);
 let count=0;const creates:CredentialCreationOptions[]=[],gets:CredentialRequestOptions[]=[];
 const create=vi.fn(async(options:CredentialCreationOptions)=>{
  creates.push(options);const source=Buffer.from(unattestedResponse(flags,0).response.attestationObject,'base64url');
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.create',challenge:b64(new Uint8Array(options.publicKey!.challenge as ArrayBuffer)),origin:'https://bankeiz.com',crossOrigin:false}));
  return{type:'public-key',id:'fresh-probe-only',rawId:new TextEncoder().encode('fresh-probe-only').buffer,authenticatorAttachment:'platform',response:{attestationObject:new Uint8Array(source).buffer,getPublicKey:()=>spki,getPublicKeyAlgorithm:()=>-7,getTransports:()=>['internal'],clientDataJSON:client.buffer},getClientExtensionResults:()=>({prf:{enabled:true,results:{first:new Uint8Array(32).fill(89).buffer}},largeBlob:{supported:true},privateFixture:'never-export'})};
 });
 const get=vi.fn(async(options:CredentialRequestOptions)=>{gets.push(options);count+=counterStep;
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bankeiz.com'))));auth[32]=flags;new DataView(auth.buffer).setUint32(33,count);
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:b64(new Uint8Array(options.publicKey!.challenge as ArrayBuffer)),origin:'https://bankeiz.com',crossOrigin:false}));
  const signed=new Uint8Array(69);signed.set(auth);signed.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,signed));if(alterSignature)signature[0]^=1;
  return{type:'public-key',id:replyId,rawId:new TextEncoder().encode(replyId).buffer,authenticatorAttachment:'platform',response:{authenticatorData:auth.buffer,clientDataJSON:client.buffer,signature:signature.buffer},getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(89).buffer}},largeBlob:{blob:null},privateFixture:'never-export'})};
 });
 vi.stubGlobal('location',{origin:'https://bankeiz.com',hostname:'bankeiz.com',hash:''});vi.stubGlobal('isSecureContext',true);
 vi.stubGlobal('navigator',{credentials:{create,get}});
 vi.stubGlobal('PublicKeyCredential',{isUserVerifyingPlatformAuthenticatorAvailable:async()=>true,getClientCapabilities:async()=>({'extension:prf':true,'extension:largeBlob':true,userVerifyingPlatformAuthenticator:true,privateFixture:'never-export'})});
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No host request permitted');}));
 return{create,get,creates,gets};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('records the actual zero assertion counter through the strict v129 refusal without touching held Note credentials',async()=>{
 const d=await device(),inspect=await runProbe(),report=await inspect({signal:new AbortController().signal});
 expect(report.registration).toMatchObject(readNoteRegistrationEvidence(unattestedResponse())!);
 expect(report.assertions).toMatchObject([{counter:'0',userVerified:true,backupEligible:true,backedUp:true}]);
 expect(report.rollbackConformance).toMatchObject({status:'refused',code:'OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED'});
 expect(report.custodyQualified).toBe(false);expect(report.financialActionsPerformed).toBe(0);
 expect(d.gets).toHaveLength(1);expect(d.gets[0].publicKey!.allowCredentials).toHaveLength(1);expect(new Uint8Array(d.gets[0].publicKey!.allowCredentials![0].id as ArrayBuffer)).toEqual(new TextEncoder().encode('fresh-probe-only'));
 expect(JSON.stringify(report)).not.toMatch(/fresh-probe-only|never-export|WVlZWV|signatureB64u|clientDataJSON|custodyPublicKey/);
 expect(fetch).not.toHaveBeenCalled();
});
it('reports real strict-counter verification separately from unassessed attestation and never labels diagnostics as qualified custody',async()=>{
 const d=await device({flags:5,counterStep:1}),inspect=await runProbe(),report=await inspect({signal:new AbortController().signal});
 expect(report.assertions.map(value=>value.counter)).toEqual(['1','2']);expect(report.rollbackConformance.status).toBe('passed');expect(d.gets).toHaveLength(2);
 expect(report.registration?.format).toBe('none');expect(report.attestationVerification).toBe('not-assessed');expect(report.custodyQualified).toBe(false);
});
it.each([{flags:5,counterStep:1,alterSignature:true},{flags:5,counterStep:2},{flags:0x1d,counterStep:1},{flags:5,counterStep:1,replyId:'another-credential'}])('cannot pass the unchanged SDK rollback check with altered signature, sequence, backup flags or credential: %j',async options=>{
 await device(options);const report=await(await runProbe())({signal:new AbortController().signal});expect(report.rollbackConformance.status).toBe('refused');expect(report.custodyQualified).toBe(false);
});
it('a cancelled probe never falls back to another credential or exposes a raw platform error',async()=>{
 const d=await device();d.create.mockRejectedValue(new DOMException('never-export','NotAllowedError'));
 const report=await(await runProbe())({signal:new AbortController().signal});expect(report.failure).toMatchObject({stage:'registration',name:'NotAllowedError'});expect(report.rollbackConformance.status).toBe('not-run');expect(d.get).not.toHaveBeenCalled();expect(JSON.stringify(report)).not.toContain('never-export');
});
it('an already aborted check creates no credential',async()=>{
 const d=await device(),controller=new AbortController();controller.abort();const report=await(await runProbe())({signal:controller.signal});expect(d.create).not.toHaveBeenCalled();expect(report.failure?.name).toBe('AbortError');
});
it('reads only local custody metadata and refuses a probe when any qualified slot is retained',async()=>{
 await device();const mod=await import('../src/conformance/device-evidence');
 expect(typeof mod.deviceCustodyProbeReadiness).toBe('function');
 const count=vi.fn(()=>{const request:{result:number;onsuccess?:()=>void}={result:1};queueMicrotask(()=>request.onsuccess?.());return request;}),write=vi.fn();
 vi.stubGlobal('indexedDB',{databases:async()=>[{name:'receiz-offline-note-qualified-custody-v1'}],open(){const db={objectStoreNames:{contains:()=>true},close:vi.fn(),transaction:vi.fn((_store:string,mode:string)=>{expect(mode).toBe('readonly');return{objectStore:()=>({count,put:write,delete:write})};})};const request:{result:typeof db;onsuccess?:()=>void}={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}});
 expect(await mod.deviceCustodyProbeReadiness(new AbortController().signal)).toBe('existing-custody');expect(write).not.toHaveBeenCalled();
});
it('does not create a custody database for an unused browser origin',async()=>{
 await device();const mod=await import('../src/conformance/device-evidence');expect(typeof mod.deviceCustodyProbeReadiness).toBe('function');
 const open=vi.fn();vi.stubGlobal('indexedDB',{databases:async()=>[],open});expect(await mod.deviceCustodyProbeReadiness(new AbortController().signal)).toBe('ready');expect(open).not.toHaveBeenCalled();
});
