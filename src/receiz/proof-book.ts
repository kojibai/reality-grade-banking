import type {ReceizVerifiedPayload} from '@receiz/sdk';
import {openBookArchive} from './proof-media-archive';
import {readDocumentText,type BookBlock,type BookChapter,type MediaFile} from './proof-media';

const imageTypes=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif','image/bmp']);
const decode=(bytes:Uint8Array)=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
function archivePath(base:string,href:string){
 if(!href||/[\\\x00-\x1f]|^[a-z][a-z0-9+.-]*:|^\//i.test(href))throw Error('The book references media outside its original.');
 const parts=base.split('/').slice(0,-1);for(const part of decodeURIComponent(href.split('#')[0]).split('/')){if(part==='..'){if(!parts.length)throw Error('The book path is invalid.');parts.pop();}else if(part&&part!=='.')parts.push(part);}return parts.join('/');
}
const cleanName=(value:string)=>value.replace(/[\x00-\x1f\x7f/\\]/g,'-').slice(0,220)||'Book';
/** XML stays detached. Only text and carried raster-image references become
 * React blocks; book markup, styles, scripts and external URLs never mount. */
function chapterBlocks(raw:string,path:string,images:Set<string>):BookBlock[]|undefined{
 if(/<!ENTITY/i.test(raw)||(raw.match(/</g)?.length??0)>20_000)return;
 const inert=raw.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<(script|style|iframe|object|embed)\b[^>]*\/\s*>/gi,'');
 const doc=new DOMParser().parseFromString(inert,'application/xml');if(doc.getElementsByTagName('parsererror').length)return;
 const body=[...doc.getElementsByTagName('*')].find(node=>node.localName==='body')??doc.documentElement,blocks:BookBlock[]=[];
 const blocked=new Set(['head','script','style','iframe','object','embed','form','input','button','textarea','select','link','base','meta']);
 const text=(node:Node):string=>node.nodeType===3?node.textContent??'':node.nodeType===1&&blocked.has((node as Element).localName)?'':node.nodeType===1&&(node as Element).localName==='br'?'\n':[...node.childNodes].map(text).join('');
 const walk=(node:Node)=>{
  if(node.nodeType===3){if(node.textContent?.trim())blocks.push({kind:'paragraph',text:node.textContent.trim()});return;}if(node.nodeType!==1)return;
  const element=node as Element,tag=element.localName;if(blocked.has(tag))return;
  if(tag==='img'||tag==='image'){const href=element.getAttribute('src')??element.getAttribute('href')??element.getAttribute('xlink:href');try{const target=archivePath(path,href??'');if(images.has(target))blocks.push({kind:'image',path:target,text:element.getAttribute('alt')??''});}catch{/* A book image never initiates a remote read. */}return;}
  if(/^(h[1-6]|p|blockquote|li|pre)$/.test(tag)&&!element.getElementsByTagName('img').length&&!element.getElementsByTagName('image').length){const value=text(element).trim();if(value)blocks.push({kind:/^h[1-6]$/.test(tag)?'heading':tag==='blockquote'?'quote':'paragraph',text:value});return;}
  for(const child of element.childNodes)walk(child);
 };
 walk(body);return blocks.length?blocks:undefined;
}
export async function readBook(payload:ReceizVerifiedPayload):Promise<MediaFile[]>{
 const files=await openBookArchive(payload.bytes);
 const xml=(path:string)=>{if(!files[path])throw Error('The book is missing part of its original.');const value=decode(files[path]);if(/<!DOCTYPE|<!ENTITY/i.test(value))throw Error('This book requires an external document reader.');const doc=new DOMParser().parseFromString(value,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('The book index could not be opened.');return doc;};
 const elements=(doc:Document,name:string)=>[...doc.getElementsByTagName('*')].filter(element=>element.localName===name);
 const container=xml('META-INF/container.xml'),path=elements(container,'rootfile')[0]?.getAttribute('full-path');if(!path)throw Error('The book index is missing.');
 const opfPath=archivePath('root',path),opf=xml(opfPath),items=elements(opf,'item');if(items.length>2000)throw Error('The book has too many media references for this reader.');
 const manifest=new Map(items.map(item=>[item.getAttribute('id'),item])),title=elements(opf,'title')[0]?.textContent?.trim().slice(0,500)||payload.filename.replace(/\.(?:epub|receiz)$/i,'')||'Book',author=elements(opf,'creator')[0]?.textContent?.trim().slice(0,280)||null;
 const illustrations:MediaFile[]=[],imagePaths=new Set<string>();
 for(const item of manifest.values()){const mime=item.getAttribute('media-type')??'';if(!imageTypes.has(mime))continue;const path=archivePath(opfPath,item.getAttribute('href')??'');if(files[path]&&!imagePaths.has(path)){if(illustrations.length>=128)throw Error('The book has too many illustrations for this reader.');imagePaths.add(path);illustrations.push({kind:'image',filename:cleanName(path.split('/').at(-1)!),mimeType:mime,bytes:files[path],payloadDigest:payload.sha256,memberPath:path});}}
 const chapters:BookChapter[]=[],spine=elements(opf,'itemref');if(spine.length>512)throw Error('The book has too many chapter references for this reader.');let materialized=0;const cache=new Map<string,BookChapter>();
 for(const ref of spine){const item=manifest.get(ref.getAttribute('idref'));if(!item)throw Error('The book is missing a chapter.');const chapterPath=archivePath(opfPath,item.getAttribute('href')??'');if(!files[chapterPath])throw Error('The book is missing a chapter.');materialized+=files[chapterPath].length;if(materialized>16*1024*1024)throw Error('The book exceeds the supported text capacity.');const previous=cache.get(chapterPath);if(previous){chapters.push(previous);continue;}
  const raw=decode(files[chapterPath]),body=raw.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]??raw,blocks=chapterBlocks(raw,chapterPath,imagePaths),heading=blocks?.find(block=>block.kind==='heading')?.text??raw.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1],text=readDocumentText(body),chapter={title:heading?readDocumentText(heading):!text&&blocks?.some(block=>block.kind==='image')?'Cover':`Section ${chapters.length+1}`,text,...(blocks?{blocks}:{})};cache.set(chapterPath,chapter);chapters.push(chapter);
 }
 if(!chapters.length)throw Error('The book has no readable chapters.');
 const filename=/\.epub$/i.test(payload.filename)?cleanName(payload.filename):cleanName(title)+'.epub';
 return [{kind:'book',filename,mimeType:'application/epub+zip',bytes:payload.bytes,payloadDigest:payload.sha256,chapters,book:{title,author,images:illustrations.map(file=>({path:file.memberPath!,mimeType:file.mimeType,bytes:file.bytes}))}},...illustrations];
}
