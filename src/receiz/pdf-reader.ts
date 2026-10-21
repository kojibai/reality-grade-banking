import {getDocument,GlobalWorkerOptions,PDFWorker,type PDFDocumentProxy} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
let worker:PDFWorker|undefined;
type Entry={refs:number;promise:Promise<PDFDocumentProxy>;destroy:()=>Promise<void>};
const documents=new Map<string,Entry>();
/** Shared only while viewed or among four recently viewed public PDFs. */
export function acquirePdf(url:string){
 let entry=documents.get(url);if(entry){documents.delete(url);documents.set(url,entry);}else{
  if(!worker||worker.destroyed)worker=new PDFWorker();const task=getDocument({url,worker,withCredentials:false,enableXfa:false,useSystemFonts:true,cMapUrl:'/pdf-runtime/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdf-runtime/standard_fonts/',wasmUrl:'/pdf-runtime/wasm/',rangeChunkSize:64*1024,disableAutoFetch:true,disableStream:true});
  entry={refs:0,promise:task.promise,destroy:()=>task.destroy()};documents.set(url,entry);void task.promise.catch(()=>{if(documents.get(url)===entry)documents.delete(url);});
 }
 entry.refs++;let released=false;
 return {promise:entry.promise,release:()=>{if(released)return;released=true;entry!.refs--;for(const [key,value]of documents){if(value.refs||!key.startsWith('blob:')&&documents.size<=4)continue;documents.delete(key);void value.destroy().catch(()=>{});}}};
}
