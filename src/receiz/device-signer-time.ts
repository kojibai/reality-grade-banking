import type {ReceizOfflineSealStore} from '@receiz/sdk/offline';
export const SIGNER_CERTIFICATE_MAX_WAIT_MS=2000;
/** A freshly issued server certificate can be a few milliseconds ahead of a
 * device clock. Wait for actual local time; never backdate, edit the certificate,
 * replace a key, or skip the SDK's subsequent pinned-root/signature checks. */
async function awaitCertificateTime(input:unknown):Promise<void>{
 const cert=input as {version?:unknown;certType?:unknown;alg?:unknown;issuedAtMs?:unknown;expiresAtMs?:unknown}|null;
 if(!cert||cert.version!==1||cert.certType!=='receiz.device.v1'||cert.alg!=='Ed25519'||typeof cert.issuedAtMs!=='number'||!Number.isSafeInteger(cert.issuedAtMs)||typeof cert.expiresAtMs!=='number'||!Number.isSafeInteger(cert.expiresAtMs)||cert.expiresAtMs<=cert.issuedAtMs)return;
 const issuedAt=cert.issuedAtMs,ahead=issuedAt-Date.now();if(ahead<=0||ahead>SIGNER_CERTIFICATE_MAX_WAIT_MS)return;
 const started=performance.now();
 while(Date.now()<issuedAt){
  const budget=SIGNER_CERTIFICATE_MAX_WAIT_MS-(performance.now()-started);if(budget<=0)return;
  await new Promise<void>(resolve=>setTimeout(resolve,Math.min(budget,Math.max(1,issuedAt-Date.now()))));
 }
}
export function certificateTimeSafeStore(store:ReceizOfflineSealStore):ReceizOfflineSealStore{
 return {async load(){const state=await store.load();if(state)await awaitCertificateTime(state.cert);return state;},save:value=>store.save(value)};
}
export function certificateTimeSafeFetch(network:typeof fetch):typeof fetch{
 return async(input,init)=>{
  const response=await network(input,init);
  const method=init?.method??(input instanceof Request?input.method:'GET');
  const url=new URL(input instanceof Request?input.url:String(input),'https://receiz.com');
  if(response.ok&&method.toUpperCase()==='POST'&&url.origin==='https://receiz.com'&&url.pathname==='/api/signer/v4/receiz/enroll'){
   try{const value=await response.clone().json() as {cert?:unknown};await awaitCertificateTime(value?.cert);}catch{/* The SDK still validates the original response and rejects malformed data. */}
  }
  return response;
 };
}
