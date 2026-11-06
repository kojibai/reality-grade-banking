// One pinned renderer/font set makes the certificate's visible pixels as
// independently reproducible as its transcript. Loaded only for PNG issuance
// or verification, outside Bank first paint and ordinary SVG previews.
const resources=[
 ['renderer.wasm','22bf6e9f9a100d972da0411a69c5ba504367fc1fa87b3b64e3f35e53926d2d70'],
 ['fonts/NotoSerif-Regular.ttf','c8f669ceb2c9c60ccf55198b305e08a997ffca79a38cc7eeb551e643cbe66505'],
 ['fonts/Inter-Regular.ttf','40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82'],
] as const;
let prepared:Promise<{engine:typeof import('@resvg/resvg-wasm');fonts:Uint8Array[]}>|undefined;
type RendererEngine=typeof import('@resvg/resvg-wasm');
type EngineInitialization={wasmSha256:string;ready:Promise<void>};
const initializationKey=Symbol.for('bankeiz.conformance.pinned-renderer-initializations.v1');
const rendererGlobals=globalThis as typeof globalThis&{[initializationKey]?:WeakMap<RendererEngine['initWasm'],EngineInitialization>};
function initialize(engine:RendererEngine,bytes:Uint8Array):Promise<void>{
 // Vite may reload this module while its external engine stays initialized.
 // Share only our pinned initialization, keyed by that actual engine function;
 // an unrelated engine or an initialization error is never treated as verified.
 const initializations=rendererGlobals[initializationKey]??=new WeakMap();
 let held=initializations.get(engine.initWasm);
 if(held&&held.wasmSha256!==resources[0][1])throw Error('CONFORMANCE_RENDER_RESOURCE_CHANGED');
 if(!held){
  held={wasmSha256:resources[0][1],ready:engine.initWasm(bytes)};initializations.set(engine.initWasm,held);
  const attempt=held;
  void attempt.ready.catch(()=>{if(initializations.get(engine.initWasm)===attempt)initializations.delete(engine.initWasm);});
 }
 return held.ready;
}
async function load(){
 const values=await Promise.all(resources.map(async([path,expected])=>{
  let bytes:Uint8Array;
  if(typeof window==='undefined'){
   const {readFile}=await import('node:fs/promises'),{resolve}=await import('node:path');
   // Server bundles have a different module directory. The same pinned public
   // renderer/fonts are traced into the function and resolved from its root.
   bytes=new Uint8Array(await readFile(resolve('public/conformance',path)));
  }else{
   const response=await fetch('/conformance/'+path,{credentials:'same-origin',cache:'force-cache',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('CONFORMANCE_RENDER_RESOURCE_UNAVAILABLE');
   bytes=new Uint8Array(await response.arrayBuffer());
  }
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(digest!==expected)throw Error('CONFORMANCE_RENDER_RESOURCE_CHANGED');
  return bytes;
 }));
 const engine=await import('@resvg/resvg-wasm');await initialize(engine,new Uint8Array(values[0]));
 return{engine,fonts:values.slice(1)};
}
export async function renderConformanceEvidencePng(svg:string):Promise<Uint8Array>{
 const {engine,fonts}=await(prepared??=load().catch(error=>{prepared=undefined;throw error;}));
 const renderer=new engine.Resvg(svg,{font:{fontBuffers:fonts,defaultFontFamily:'Inter',serifFamily:'Noto Serif',sansSerifFamily:'Inter',monospaceFamily:'Inter'}});
 try{const image=renderer.render();try{return new Uint8Array(image.asPng());}finally{image.free();}}finally{renderer.free();}
}
export async function verifyConformanceEvidenceArtwork(svg:string,png:Uint8Array):Promise<boolean>{
 const expected=await renderConformanceEvidencePng(svg);
 return expected.length===png.length&&expected.every((value,index)=>value===png[index]);
}
