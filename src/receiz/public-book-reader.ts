import type {MediaFile} from './proof-media';
import {safePublicBookUrl,type PublicBookSource} from './public-book';
import {readPublicLedgerBytes} from './public-ledger-transfer';
const key=(source:PublicBookSource)=>source.payloadDigest+':'+source.url;
const books=new Map<string,MediaFile>(),pending=new Map<string,Promise<MediaFile>>();
const capacity=16*1024*1024;
const size=(file:MediaFile)=>file.bytes.length+(file.chapters?.reduce((sum,chapter)=>sum+chapter.text.length*2+(chapter.blocks?.reduce((n,block)=>n+block.text.length*2,0)??0),0)??0)+(file.book?.images.reduce((sum,image)=>sum+image.bytes.length,0)??0);
export function retainedPublicBook(source:PublicBookSource){return books.get(key(source))??null;}
/** Public reading checks the carried payload hash; it grants no Original,
 * ownership or verification claim. Closing a view does not discard its read. */
export function readPublicBook(source:PublicBookSource):Promise<MediaFile>{
 const url=safePublicBookUrl(source.url,source.assetId);if(!url||!/^[a-f0-9]{64}$/.test(source.payloadDigest))return Promise.reject(Error('This book reading source is not supported.'));
 const id=key(source),held=books.get(id);if(held)return Promise.resolve(held);const existing=pending.get(id);if(existing)return existing;
 const work=(async()=>{
  const response=await fetch('/api/bank/public-book?'+new URLSearchParams({source:url,asset:source.assetId}),{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(response.status===403||response.status===404?'This book is not publicly available.':'The book could not be opened. Try again.');
  const bytes=await readPublicLedgerBytes(response,capacity),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==source.payloadDigest)throw Error('This book does not match its published reading source.');
  const {readBook}=await import('./proof-book'),[file]=await readBook({bytes,filename:'Book.epub',mimeType:'application/epub+zip',sha256:hash});
  if(!file||file.kind!=='book')throw Error('This source is not a readable EPUB.');
  const bytesHeld=size(file);if(bytesHeld<=capacity){while(books.size&&(books.size>=4||[...books.values()].reduce((sum,book)=>sum+size(book),0)+bytesHeld>capacity))books.delete(books.keys().next().value!);books.set(id,file);}return file;
 })();pending.set(id,work);void work.finally(()=>{if(pending.get(id)===work)pending.delete(id);}).catch(()=>{});return work;
}
