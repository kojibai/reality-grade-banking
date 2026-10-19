import {paymentQr,paymentQrPath} from './payment-qr';
import {heldPublicLedgerFile,inspectPublicLedgerFile,type PublicLedgerFileReview} from './public-ledger-proof';
import {embedPublicLedgerPng,isPublicLedgerPng,PUBLIC_LEDGER_PNG_MAX_BYTES,PUBLIC_LEDGER_PNG_SOURCE_MAX_BYTES} from './public-ledger-png';
import {readPublicLedgerBytes} from './public-ledger-transfer';
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export const publicLedgerProofUrl=(digest:string)=>{if(!/^[a-f0-9]{64}$/.test(digest))throw Error('PUBLIC_LEDGER_SOURCE_INVALID');return `https://bankeiz.com/ledger/?source=${digest}`;};
/** Artwork is presentation only. The complete original source, not the visible
 * list window or text on this image, supplies every verification claim. */
export function publicLedgerCrystalArtwork(review:PublicLedgerFileReview):string{
 const original=heldPublicLedgerFile(review),snapshot=review.snapshot;if(!snapshot||!original.source)throw Error('PUBLIC_LEDGER_SOURCE_REQUIRED');
 const url=publicLedgerProofUrl(review.artifactSha256),qr=paymentQrPath(paymentQr(url)),count=snapshot.records.length.toLocaleString('en-US');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000" viewBox="0 0 2400 3000"><g font-family="Arial,Helvetica,sans-serif" fill="#17334c">
 <text x="160" y="185" font-size="72" font-weight="700" letter-spacing="-3">Bankeiz</text><text x="2240" y="172" text-anchor="end" font-size="24" letter-spacing="4">PUBLIC LEDGER</text>
 <rect x="120" y="2050" width="2160" height="795" rx="28" fill="#fffaf0" fill-opacity=".86" stroke="#b6a68a" stroke-opacity=".45"/>
 <text x="180" y="2165" font-size="88" letter-spacing="-3">Memory Crystal</text><text x="182" y="2230" font-size="31">${count} ${snapshot.records.length===1?'record':'records'} · complete public action history</text>
 <text x="182" y="2320" font-size="25" letter-spacing="3">SOURCE COORDINATE</text><text x="182" y="2370" font-size="30">☤µKAI ${escape(snapshot.kaiUpulse)}</text><text x="182" y="2420" font-size="26">${snapshot.baseline==='native'?'Native source continuity':'Observed baseline · continuity preserved'}</text>
 <text x="182" y="2500" font-size="24" letter-spacing="2">SOURCE HEAD</text><text x="182" y="2545" font-size="22" font-family="monospace">${escape(snapshot.sourceHead.slice(0,32))}</text><text x="182" y="2580" font-size="22" font-family="monospace">${escape(snapshot.sourceHead.slice(32))}</text>
 <text x="182" y="2660" font-size="24" letter-spacing="2">LEDGER ORIGINAL SHA-256</text><text x="182" y="2705" font-size="22" font-family="monospace">${escape(review.artifactSha256.slice(0,32))}</text><text x="182" y="2740" font-size="22" font-family="monospace">${escape(review.artifactSha256.slice(32))}</text>
 <rect x="1690" y="2270" width="500" height="500" rx="16" fill="#fff"/><svg x="1720" y="2300" width="440" height="440" viewBox="0 0 61 61" shape-rendering="crispEdges"><path d="${qr}" fill="#17334c"/></svg>
 <text x="1940" y="2805" text-anchor="middle" font-size="22">bankeiz.com/ledger/</text><text x="180" y="2895" font-size="23">Sealed image · complete signed Ledger original embedded · reopen to verify both</text><text x="180" y="2935" font-size="20">Public history disclosure. No spending authority or account balance claim.</text></g></svg>`;
}
async function renderPublicLedgerCrystal(review:PublicLedgerFileReview){
 const response=await fetch('/art/ledger-memory-crystal-v3.png',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30_000)});
 if(!response.ok)throw Error('PUBLIC_LEDGER_IMAGE_UNAVAILABLE');
 const artwork=await readPublicLedgerBytes(response,4*1024*1024);
 const artUrl=URL.createObjectURL(new Blob([new Uint8Array(artwork)],{type:'image/png'})),url=URL.createObjectURL(new Blob([publicLedgerCrystalArtwork(review)],{type:'image/svg+xml'}));
 try{
  const background=new Image(),image=new Image();background.src=artUrl;image.src=url;await Promise.all([background.decode(),image.decode()]);
  const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=3000;
  const context=canvas.getContext('2d');if(!context)throw Error('PUBLIC_LEDGER_IMAGE_UNAVAILABLE');context.drawImage(background,0,0,2400,3000);context.drawImage(image,0,0);
  const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('PUBLIC_LEDGER_IMAGE_UNAVAILABLE')),'image/png'));
  if(png.size>PUBLIC_LEDGER_PNG_MAX_BYTES)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');return new Uint8Array(await png.arrayBuffer());
 }finally{URL.revokeObjectURL(url);URL.revokeObjectURL(artUrl);}
}
type SealInput=Readonly<{bytes:Uint8Array;filename:string;mimeType:string}>;
type SealOutput=Readonly<{artifactBytes:Uint8Array;filename:string;mimeType?:string}>;
type CrystalRuntime=Readonly<{render?:(review:PublicLedgerFileReview)=>Promise<Uint8Array>;seal?:(input:SealInput)=>Promise<SealOutput>}>;
let publicSealer:Promise<ReturnType<typeof import('@receiz/sdk/offline').createReceizOfflineSealer>>|undefined;
async function sealPublicImage(input:SealInput):Promise<SealOutput>{
 // Public document custody is independent of every account and Identity Seal.
 // Only public proving resources and the canonical device enrollment are used.
 publicSealer??=(async()=>{
  const [{createReceizOfflineSealer,createReceizIndexedDbSealStore},{loadBankProofResources},{nativeFetch}]=await Promise.all([import('@receiz/sdk/offline'),import('./proof-resource-continuity'),import('./native-transport')]);
  const resources=await loadBankProofResources(fetch),sealer=createReceizOfflineSealer({store:createReceizIndexedDbSealStore('bankeiz-public-ledger-device-signer'),resources,fetch:nativeFetch});
  if(!await sealer.ready())await sealer.enroll();return sealer;
 })().catch(error=>{publicSealer=undefined;throw error;});
 return(await publicSealer).seal(input);
}
export async function createPublicLedgerCrystal(review:PublicLedgerFileReview,runtime:CrystalRuntime={}){
 const source=heldPublicLedgerFile(review).source,snapshot=review.snapshot;if(!source||!snapshot)throw Error('PUBLIC_LEDGER_SOURCE_REQUIRED');
 const carrier=new TextEncoder().encode(JSON.stringify({kind:'receiz.ledger_proof_bundle',version:'v3',source}));
 if(carrier.length>PUBLIC_LEDGER_PNG_SOURCE_MAX_BYTES)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');
 const png=await(runtime.render??renderPublicLedgerCrystal)(review),carried=embedPublicLedgerPng(png,carrier);
 const filename=`bankeiz-ledger-${review.artifactSha256.slice(0,16)}.png`,sealed=await(runtime.seal??sealPublicImage)({bytes:carried,filename,mimeType:'image/png'});
 if(!sealed.artifactBytes.length||sealed.artifactBytes.length>PUBLIC_LEDGER_PNG_MAX_BYTES)throw Error('PUBLIC_LEDGER_IMAGE_CAPACITY');
 const bytes=sealed.artifactBytes.slice();
 if(!isPublicLedgerPng(bytes)||sealed.mimeType&&sealed.mimeType!=='image/png')throw Error('PUBLIC_LEDGER_IMAGE_UNVERIFIED');
 // Reopen final proof bytes, not the unsigned render or a transported verdict.
 const reopened=await inspectPublicLedgerFile({bytes,filename}),reopenedSource=heldPublicLedgerFile(reopened).source;
 if(reopened.imageSeal?.status!=='verified'||reopened.artifactSha256!==review.artifactSha256||reopened.snapshot?.sourceHead!==snapshot.sourceHead||reopened.snapshot.records.length!==snapshot.records.length
  ||!reopenedSource||Object.entries(source).some(([key,value])=>reopenedSource[key as keyof typeof source]!==value))throw Error('PUBLIC_LEDGER_IMAGE_SOURCE_CHANGED');
 return {bytes:bytes.slice(),filename};
}
