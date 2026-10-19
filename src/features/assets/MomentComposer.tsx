import {useEffect,useRef,useState} from 'react';
import {BookOpen,FileText,Image as ImageIcon,Music2,Paperclip,Video,X} from 'lucide-react';
import type {AssetMomentDraft} from '../../receiz/asset-moment';
import './moment-composer.css';
const imageTypes=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif','image/bmp']);
const size=(n:number)=>n<1024*1024?`${Math.max(1,Math.ceil(n/1024))} KB`:`${(n/1024/1024).toFixed(1)} MB`;
type Field=readonly [string,string,string?];
const audioFields:Field[]=[['title','Release title'],['creator','Primary artist'],['releaseType','Release type','Single, EP, album…'],['genre','Genre'],['subgenre','Subgenre'],['isrc','ISRC'],['writers','Writers'],['producer','Producer'],['label','Label']];
const bookFields:Field[]=[['title','Book title'],['subtitle','Subtitle'],['creator','Primary author'],['contributors','Contributors'],['series','Series'],['edition','Edition'],['genre','Genre'],['language','Language'],['isbn','ISBN'],['publisher','Publisher'],['imprint','Imprint']];
export function MomentComposer({value,onChange}:{value:AssetMomentDraft;onChange:(draft:AssetMomentDraft)=>void}){
 const picker=useRef<HTMLInputElement>(null),[error,setError]=useState(''),[preview,setPreview]=useState<{file:File;url:string}|null>(null),first=value.files[0];
 const kind=first?.type.startsWith('audio/')?'audio':first?.type==='application/epub+zip'||first?.name.toLowerCase().endsWith('.epub')?'book':first?.type.startsWith('video/')?'video':first?.type.startsWith('image/')?'image':'file';
 const Icon=kind==='audio'?Music2:kind==='book'?BookOpen:kind==='video'?Video:kind==='image'?ImageIcon:FileText;
 useEffect(()=>{if(!first||!imageTypes.has(first.type)){setPreview(null);return;}const url=URL.createObjectURL(first);setPreview({file:first,url});return()=>URL.revokeObjectURL(url);},[first]);
 const updateDetail=(key:string,text:string|boolean)=>onChange({...value,metadata:{...value.metadata,[key]:text}});
 const add=(incoming:File[])=>{const files=[...value.files,...incoming];if(files.length>8){setError('Choose up to 8 originals for this moment.');return;}if(files.some(file=>file.size===0)||files.reduce((n,file)=>n+file.size,0)>6*1024*1024){setError('Keep the originals within 6 MB combined.');return;}setError('');onChange({...value,files});};
 const fields=kind==='audio'?audioFields:kind==='book'?bookFields:[['creator',kind==='video'?'Creator / director':'Creator']] as Field[];
 return <section className="moment-composer" aria-label="Moment originals and text">
  <div className="moment-section-heading"><span>Originals <small>Optional</small></span><span>{value.files.length}/8</span></div>
  <input ref={picker} type="file" multiple hidden aria-label="Attach moment originals" onChange={event=>{add(Array.from(event.target.files??[]));event.target.value='';}}/>
  {!first?<button type="button" className="moment-attach" onClick={()=>picker.current?.click()}><Paperclip size={19} strokeWidth={1.4}/><span><strong>Add originals</strong><small>Images, video, audio, books or documents</small></span></button>:<>
   <div className="moment-original-preview">{preview?.file===first?<img src={preview.url} alt={first.name}/>:<Icon size={40} strokeWidth={1}/>}<span>{kind==='file'?'Original file':kind==='book'?'Book':kind[0].toUpperCase()+kind.slice(1)}</span></div>
   <ul className="moment-originals">{value.files.map((file,index)=><li key={`${file.name}:${file.lastModified}:${index}`}><span><strong>{file.name}</strong><small>{size(file.size)} · Original</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>{setError('');onChange({...value,files:value.files.filter((_,at)=>at!==index)});}}><X size={16}/></button></li>)}</ul>
   <button type="button" className="moment-add-more" disabled={value.files.length>=8} onClick={()=>picker.current?.click()}><Paperclip size={14}/>Add another original</button>
   <details className="moment-optional"><summary>{kind==='audio'?'Audio details':kind==='book'?'Book details':'Media details'} <span>Optional</span></summary><div className="moment-detail-fields">{fields.map(([key,label,placeholder])=><label className="form-field" key={key}><span>{label}</span><input value={String(value.metadata?.[key]??'')} maxLength={2000} placeholder={placeholder} onChange={event=>updateDetail(key,event.target.value)}/></label>)}</div>{kind==='audio'&&<label className="moment-explicit"><input type="checkbox" checked={value.metadata?.explicit===true} onChange={event=>updateDetail('explicit',event.target.checked)}/>Explicit content</label>}</details>
  </>}
  <p className="moment-capacity">Up to 6 MB combined. The exact originals travel with your proof.</p>
  {error&&<p className="error-message" role="alert">{error}</p>}
  <details className="moment-optional"><summary>Long-form text <span>Optional</span></summary><label className="form-field"><span>Reading title</span><input maxLength={160} value={value.title??''} onChange={event=>onChange({...value,title:event.target.value})} placeholder="An optional title"/></label><label className="form-field"><span>Full text</span><textarea className="moment-long-form" maxLength={100000} value={value.text??''} onChange={event=>onChange({...value,text:event.target.value})} placeholder="Preserve the complete story, essay or account of this moment."/></label><p className="moment-word-count">{(value.text?.length??0).toLocaleString()} / 100,000 characters</p></details>
  <details className="moment-optional"><summary>Reference &amp; tags <span>Optional</span></summary><label className="form-field"><span>Reference link</span><input inputMode="url" maxLength={2000} value={String(value.metadata?.link??'')} onChange={event=>updateDetail('link',event.target.value)} placeholder="https://"/></label><label className="form-field"><span>Tags</span><input maxLength={2000} value={String(value.metadata?.tags??'')} onChange={event=>updateDetail('tags',event.target.value)} placeholder="Separate with commas"/></label></details>
 </section>;
}
